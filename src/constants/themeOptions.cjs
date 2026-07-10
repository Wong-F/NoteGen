/**
 * CJS entry for main process / tests (renderer uses themeOptions.js ESM).
 * Keep exports identical to themeOptions.js.
 */

const THEME_STORAGE_KEY = "notegen.theme";

const DEFAULT_THEME = "cloud";

const THEMES = [
  { id: "cloud", name: "云端", desc: "悬浮面板 · 清爽冷调" },
  { id: "blush", name: "胭脂纸", desc: "暖粉纸感 · 小红书气质" },
  { id: "ink", name: "墨夜", desc: "深色护眼 · 夜间创作" },
  { id: "matcha", name: "抹茶", desc: "清新自然 · 治愈纸感" },
  { id: "cream", name: "奶油杏", desc: "暖米白 · 奶油极简" },
];

function normalizeTheme(value) {
  return THEMES.some((theme) => theme.id === value) ? value : DEFAULT_THEME;
}

function readStoredTheme(storage) {
  if (!storage) {
    return DEFAULT_THEME;
  }
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function persistTheme(themeId, storage) {
  const theme = normalizeTheme(themeId);
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistence is best-effort.
  }
  return theme;
}

module.exports = {
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
  THEMES,
  normalizeTheme,
  readStoredTheme,
  persistTheme,
};
