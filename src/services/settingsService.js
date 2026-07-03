/**
 * Persist user settings as JSON in the app's userData directory.
 * Kept synchronous: the file is tiny and reads happen per AI request.
 */

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_SETTINGS = Object.freeze({
  ai: Object.freeze({
    baseUrl: "http://localhost:11434/v1",
    apiKey: "",
    model: "",
  }),
  image: Object.freeze({
    baseUrl: "",
    apiKey: "",
    model: "dall-e-3",
  }),
  stock: Object.freeze({
    pexelsApiKey: "",
    unsplashAccessKey: "",
  }),
});

class SettingsService {
  /** @param {string} dir Directory to store settings.json in (must exist or be creatable). */
  constructor(dir) {
    this.filePath = path.join(dir, "settings.json");
  }

  /** @returns {{ ai: { baseUrl: string; apiKey: string; model: string } }} */
  get() {
    let stored = {};
    try {
      stored = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") {
        // Corrupt settings should not brick the app; fall back to defaults.
        console.warn(`[noteGen] failed to read settings, using defaults: ${error.message}`);
      }
    }
    return {
      ai: { ...DEFAULT_SETTINGS.ai, ...(stored.ai || {}) },
      image: { ...DEFAULT_SETTINGS.image, ...(stored.image || {}) },
      stock: { ...DEFAULT_SETTINGS.stock, ...(stored.stock || {}) },
    };
  }

  /**
   * Merge and persist a partial settings object.
   * @param {{ ai?: Partial<{ baseUrl: string; apiKey: string; model: string }> }} partial
   * @returns {{ ai: { baseUrl: string; apiKey: string; model: string } }} merged settings
   */
  save(partial) {
    const merged = this.get();
    if (partial && typeof partial.ai === "object" && partial.ai !== null) {
      merged.ai = { ...merged.ai, ...partial.ai };
    }
    if (partial && typeof partial.image === "object" && partial.image !== null) {
      merged.image = { ...merged.image, ...partial.image };
    }
    if (partial && typeof partial.stock === "object" && partial.stock !== null) {
      merged.stock = { ...merged.stock, ...partial.stock };
    }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(merged, null, 2), "utf8");
    return merged;
  }
}

module.exports = { SettingsService, DEFAULT_SETTINGS };
