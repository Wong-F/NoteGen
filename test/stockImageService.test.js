const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { StockImageService, StockImageError } = require("../src/services/stockImageService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-stock-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const pexelsPhoto = {
  photos: [
    {
      id: 42,
      photographer: "Alice",
      url: "https://www.pexels.com/photo/42/",
      src: { large2x: "https://images.pexels.com/photos/42/large2x.jpg" },
    },
  ],
};

const unsplashPhoto = {
  results: [
    {
      id: "abc",
      user: { name: "Bob" },
      links: { html: "https://unsplash.com/photos/abc" },
      urls: { regular: "https://images.unsplash.com/photo-abc" },
    },
  ],
};

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

describe("StockImageService", () => {
  it("searchAndDownload uses Pexels when available", async () => {
    const userData = makeTmpDir();
    const fetchImpl = async (url) => {
      if (String(url).includes("api.pexels.com")) {
        return { ok: true, json: async () => pexelsPhoto };
      }
      return {
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
      };
    };

    const service = new StockImageService(
      () => ({ stock: { pexelsApiKey: "pexels-key", unsplashAccessKey: "" } }),
      userData,
      { fetchImpl }
    );

    const result = await service.searchAndDownload({
      keyword: "咖啡店",
      sessionId: "sess-stock",
      label: "xhs-01",
    });

    assert.equal(result.provider, "pexels");
    assert.equal(result.author, "Alice");
    assert.ok(fs.existsSync(result.absolutePath));
    const sources = fs.readFileSync(
      path.join(userData, "drafts", "sess-stock", "assets", "SOURCES.md"),
      "utf8"
    );
    assert.match(sources, /Pexels/);
    assert.match(sources, /Alice/);
  });

  it("falls back to Unsplash when Pexels returns no results", async () => {
    const userData = makeTmpDir();
    const fetchImpl = async (url) => {
      if (String(url).includes("api.pexels.com")) {
        return { ok: true, json: async () => ({ photos: [] }) };
      }
      if (String(url).includes("api.unsplash.com")) {
        return { ok: true, json: async () => unsplashPhoto };
      }
      return {
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
      };
    };

    const service = new StockImageService(
      () => ({ stock: { pexelsApiKey: "pexels-key", unsplashAccessKey: "unsplash-key" } }),
      userData,
      { fetchImpl }
    );

    const result = await service.searchAndDownload({
      keyword: "cafe",
      sessionId: "sess-fallback",
      label: "xhs-02",
    });

    assert.equal(result.provider, "unsplash");
    assert.equal(result.author, "Bob");
  });

  it("throws CONFIG when no API keys are set", async () => {
    const service = new StockImageService(() => ({ stock: {} }), makeTmpDir());
    await assert.rejects(
      () => service.searchAndDownload({ keyword: "咖啡" }),
      (error) => error instanceof StockImageError && error.code === "CONFIG"
    );
  });

  it("throws NOT_FOUND when both providers return empty", async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes("api.pexels.com") || String(url).includes("api.unsplash.com")) {
        return {
          ok: true,
          json: async () => (String(url).includes("pexels") ? { photos: [] } : { results: [] }),
        };
      }
      throw new Error("unexpected fetch");
    };

    const service = new StockImageService(
      () => ({ stock: { pexelsApiKey: "p", unsplashAccessKey: "u" } }),
      makeTmpDir(),
      { fetchImpl }
    );

    await assert.rejects(
      () => service.searchAndDownload({ keyword: "不存在的关键词xyz" }),
      (error) => error instanceof StockImageError && error.code === "NOT_FOUND"
    );
  });

  it("testConnection returns CONFIG when no keys are set", async () => {
    const service = new StockImageService(() => ({ stock: {} }), makeTmpDir());
    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.code, "CONFIG");
  });

  it("testConnection reports per-provider status", async () => {
    const fetchImpl = async (url) => {
      if (String(url).includes("api.pexels.com")) {
        return { ok: true, json: async () => ({ photos: [{ id: 1 }] }) };
      }
      if (String(url).includes("api.unsplash.com")) {
        return { ok: false, status: 401, text: async () => "Unauthorized" };
      }
      throw new Error("unexpected fetch");
    };

    const service = new StockImageService(
      () => ({ stock: { pexelsApiKey: "p", unsplashAccessKey: "u" } }),
      makeTmpDir(),
      { fetchImpl }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, false);
    assert.equal(result.providers.length, 2);
    assert.equal(result.providers.find((p) => p.id === "pexels").ok, true);
    assert.equal(result.providers.find((p) => p.id === "unsplash").ok, false);
    assert.equal(result.providers.find((p) => p.id === "unsplash").code, "AUTH");
  });

  it("testConnection ok when all configured providers pass", async () => {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ photos: [], results: [] }) });

    const service = new StockImageService(
      () => ({ stock: { pexelsApiKey: "p", unsplashAccessKey: "" } }),
      makeTmpDir(),
      { fetchImpl }
    );

    const result = await service.testConnection();
    assert.equal(result.ok, true);
    assert.equal(result.providers.find((p) => p.id === "pexels").ok, true);
    assert.equal(result.providers.find((p) => p.id === "unsplash").configured, false);
  });
});
