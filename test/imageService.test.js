const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ImageService } = require("../src/services/imageService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-image-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("ImageService", () => {
  it("importUserImage copies a valid file into assets", () => {
    const userData = makeTmpDir();
    const source = path.join(userData, "source.png");
    fs.writeFileSync(source, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const service = new ImageService(() => ({ ai: {}, image: {} }), userData);
    const result = service.importUserImage({
      sourcePath: source,
      sessionId: "sess-1",
      label: "cover",
    });

    assert.equal(result.sessionId, "sess-1");
    assert.ok(fs.existsSync(result.absolutePath));
    assert.match(result.relativePath, /^assets\/cover\.png$/);
  });

  it("importUserImage rejects missing files", () => {
    const service = new ImageService(() => ({ ai: {}, image: {} }), makeTmpDir());
    assert.throws(
      () => service.importUserImage({ sourcePath: "/no/such/file.png" }),
      /不存在/
    );
  });

  it("resolveImageConfig falls back to ai settings", () => {
    const service = new ImageService(
      () => ({
        ai: { baseUrl: "http://localhost:11434/v1", apiKey: "ai-key" },
        image: { baseUrl: "", apiKey: "", model: "" },
      }),
      makeTmpDir()
    );
    const config = service.resolveImageConfig();
    assert.equal(config.baseUrl, "http://localhost:11434/v1");
    assert.equal(config.apiKey, "ai-key");
    assert.equal(config.model, "dall-e-3");
  });

  it("generateImages rejects when image API is not configured", async () => {
    const service = new ImageService(() => ({ ai: {}, image: {} }), makeTmpDir(), {
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
    });

    await assert.rejects(
      () => service.generateImages({ prompt: "a cat" }),
      /Image API endpoint is not configured/
    );
  });

  it("generateImages rejects when image API key is missing", async () => {
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "", model: "dall-e-3" },
      }),
      makeTmpDir(),
      {
        fetchImpl: async () => {
          throw new Error("fetch should not be called");
        },
      }
    );

    await assert.rejects(
      () => service.generateImages({ prompt: "a cat" }),
      /Image API key is not configured/
    );
  });

  it("generateImage saves b64 response to assets", async () => {
    const userData = makeTmpDir();
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const b64 = pngBytes.toString("base64");

    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "dall-e-3" },
      }),
      userData,
      {
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ data: [{ b64_json: b64 }] }),
        }),
      }
    );

    const result = await service.generateImage({
      prompt: "a cozy coffee shop",
      sessionId: "sess-ai",
      label: "page-1",
    });

    assert.equal(result.sessionId, "sess-ai");
    assert.ok(fs.existsSync(result.absolutePath));
    assert.equal(fs.readFileSync(result.absolutePath).subarray(0, 4).toString("hex"), "89504e47");
  });

  it("generateImages saves multiple b64 responses when count > 1", async () => {
    const userData = makeTmpDir();
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const b64 = pngBytes.toString("base64");

    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "dall-e-3" },
      }),
      userData,
      {
        fetchImpl: async (_url, options) => {
          const body = JSON.parse(options.body);
          assert.equal(body.n, 3);
          assert.equal(body.response_format, undefined);
          return {
            ok: true,
            json: async () => ({
              data: [{ b64_json: b64 }, { b64_json: b64 }, { b64_json: b64 }],
            }),
          };
        },
      }
    );

    const result = await service.generateImages({
      prompt: "food collage",
      sessionId: "sess-batch",
      label: "page-cover",
      count: 3,
    });

    assert.equal(result.sessionId, "sess-batch");
    assert.equal(result.images.length, 3);
    for (const image of result.images) {
      assert.ok(fs.existsSync(image.absolutePath));
    }
  });
});

describe("ImageService.testConnection", () => {
  it("returns CONFIG when endpoint is missing", async () => {
    const service = new ImageService(() => ({ ai: {}, image: {} }), makeTmpDir(), {
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
    });

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "CONFIG");
  });

  it("returns CONFIG when api key is missing", async () => {
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "", model: "dall-e-3" },
      }),
      makeTmpDir(),
      {
        fetchImpl: async () => {
          throw new Error("fetch should not be called");
        },
      }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "CONFIG");
    assert.match(result.message, /API Key/);
  });

  it("returns CONNECTION on network failure", async () => {
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "dall-e-3" },
      }),
      makeTmpDir(),
      {
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
      }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "CONNECTION");
  });

  it("returns AUTH on HTTP 401", async () => {
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "bad", model: "dall-e-3" },
      }),
      makeTmpDir(),
      {
        fetchImpl: async () => ({
          ok: false,
          status: 401,
          text: async () => "unauthorized",
        }),
      }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "AUTH");
  });

  it("returns ok for b64_json without writing assets", async () => {
    const userData = makeTmpDir();
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "agnes-image-2.0-flash" },
      }),
      userData,
      {
        fetchImpl: async (url, options) => {
          assert.match(url, /\/images\/generations$/);
          const body = JSON.parse(options.body);
          assert.equal(body.n, 1);
          assert.equal(body.response_format, undefined);
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: [{ b64_json: "AAAA" }] }),
          };
        },
      }
    );

    const result = await service.testConnection();
    assert.deepEqual(result, { ok: true, model: "agnes-image-2.0-flash" });
    assert.equal(fs.existsSync(path.join(userData, "drafts")), false);
  });

  it("returns ok for url response without writing assets", async () => {
    const userData = makeTmpDir();
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "dall-e-3" },
      }),
      userData,
      {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ url: "https://cdn.example.com/x.png" }] }),
        }),
      }
    );

    const result = await service.testConnection();
    assert.deepEqual(result, { ok: true, model: "dall-e-3" });
    assert.equal(fs.readdirSync(userData).length, 0);
  });

  it("returns BAD_RESPONSE when payload has no image data", async () => {
    const service = new ImageService(
      () => ({
        ai: {},
        image: { baseUrl: "https://api.example.com/v1", apiKey: "sk-test", model: "dall-e-3" },
      }),
      makeTmpDir(),
      {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ data: [{}] }),
        }),
      }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "BAD_RESPONSE");
  });
});
