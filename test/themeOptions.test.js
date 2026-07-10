const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  THEMES,
  normalizeTheme,
  readStoredTheme,
  persistTheme,
} = require("../src/constants/themeOptions.cjs");

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    data,
  };
}

describe("themeOptions", () => {
  it("declares cloud as the default theme and lists it first", () => {
    assert.equal(DEFAULT_THEME, "cloud");
    assert.equal(THEMES[0].id, "cloud");
    for (const id of ["blush", "ink", "matcha", "cream"]) {
      assert.ok(
        THEMES.some((theme) => theme.id === id),
        `missing theme: ${id}`,
      );
    }
  });

  it("normalizes unknown values to the default theme", () => {
    for (const theme of THEMES) {
      assert.equal(normalizeTheme(theme.id), theme.id);
    }
    assert.equal(normalizeTheme("neon"), DEFAULT_THEME);
    assert.equal(normalizeTheme(null), DEFAULT_THEME);
    assert.equal(normalizeTheme(undefined), DEFAULT_THEME);
    assert.equal(normalizeTheme(42), DEFAULT_THEME);
  });

  it("keeps the ESM and CJS theme lists in sync", async () => {
    const esm = await import("../src/constants/themeOptions.js");
    assert.deepEqual(esm.THEMES, THEMES);
    assert.equal(esm.DEFAULT_THEME, DEFAULT_THEME);
    assert.equal(esm.THEME_STORAGE_KEY, THEME_STORAGE_KEY);
  });

  it("reads the persisted theme and falls back on bad values", () => {
    assert.equal(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "blush" })), "blush");
    assert.equal(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "junk" })), DEFAULT_THEME);
    assert.equal(readStoredTheme(fakeStorage()), DEFAULT_THEME);
    assert.equal(readStoredTheme(null), DEFAULT_THEME);
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    assert.equal(readStoredTheme(broken), DEFAULT_THEME);
    assert.equal(persistTheme("blush", broken), "blush");
  });

  it("persists the normalized theme id", () => {
    const storage = fakeStorage();
    assert.equal(persistTheme("blush", storage), "blush");
    assert.equal(storage.data[THEME_STORAGE_KEY], "blush");
    assert.equal(persistTheme("junk", storage), DEFAULT_THEME);
    assert.equal(storage.data[THEME_STORAGE_KEY], DEFAULT_THEME);
  });
});
