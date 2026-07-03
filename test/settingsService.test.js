const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { SettingsService, DEFAULT_SETTINGS } = require("../src/services/settingsService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-settings-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("SettingsService", () => {
  it("returns defaults when no file exists", () => {
    const service = new SettingsService(makeTmpDir());

    assert.deepEqual(service.get(), {
      ai: { ...DEFAULT_SETTINGS.ai },
      image: { ...DEFAULT_SETTINGS.image },
      stock: { ...DEFAULT_SETTINGS.stock },
    });
  });

  it("persists a partial save and merges with defaults", () => {
    const dir = makeTmpDir();
    const service = new SettingsService(dir);

    const saved = service.save({ ai: { model: "qwen3:8b" } });

    assert.equal(saved.ai.model, "qwen3:8b");
    assert.equal(saved.ai.baseUrl, DEFAULT_SETTINGS.ai.baseUrl);

    const reloaded = new SettingsService(dir).get();
    assert.equal(reloaded.ai.model, "qwen3:8b");
  });

  it("falls back to defaults when the file is corrupt", () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, "settings.json"), "{not json", "utf8");
    const service = new SettingsService(dir);

    assert.deepEqual(service.get(), {
      ai: { ...DEFAULT_SETTINGS.ai },
      image: { ...DEFAULT_SETTINGS.image },
      stock: { ...DEFAULT_SETTINGS.stock },
    });
  });

  it("persists image settings on save", () => {
    const dir = makeTmpDir();
    const service = new SettingsService(dir);

    const saved = service.save({
      image: { baseUrl: "https://api.openai.com/v1", model: "dall-e-3" },
    });

    assert.equal(saved.image.baseUrl, "https://api.openai.com/v1");
    assert.equal(saved.image.model, "dall-e-3");
  });

  it("persists stock settings on save", () => {
    const dir = makeTmpDir();
    const service = new SettingsService(dir);

    const saved = service.save({
      stock: { pexelsApiKey: "pexels-test", unsplashAccessKey: "unsplash-test" },
    });

    assert.equal(saved.stock.pexelsApiKey, "pexels-test");
    assert.equal(saved.stock.unsplashAccessKey, "unsplash-test");
  });
});
