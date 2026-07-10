/**
 * Theme constants and pure helpers (ESM entry for the renderer).
 * Keep in sync with the CJS mirror themeOptions.cjs (main process / tests).
 */

export const THEME_STORAGE_KEY = "notegen.theme";

export const DEFAULT_THEME = "cloud";

export const THEMES = [
  { id: "cloud", name: "云端", desc: "悬浮面板 · 清爽冷调" },
  { id: "blush", name: "胭脂纸", desc: "暖粉纸感 · 小红书气质" },
  { id: "ink", name: "墨夜", desc: "深色护眼 · 夜间创作" },
  { id: "matcha", name: "抹茶", desc: "清新自然 · 治愈纸感" },
  { id: "cream", name: "奶油杏", desc: "暖米白 · 奶油极简" },
];

/**
 * Coerce any value to a known theme id.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeTheme(value) {
  return THEMES.some((theme) => theme.id === value) ? value : DEFAULT_THEME;
}

/**
 * Read the persisted theme id.
 * @param {Pick<Storage, "getItem"> | null} storage
 * @returns {string}
 */
export function readStoredTheme(storage) {
  if (!storage) {
    return DEFAULT_THEME;
  }
  try {
    return normalizeTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Persist a theme choice (best-effort).
 * @param {string} themeId
 * @param {Pick<Storage, "setItem"> | null} storage
 * @returns {string} the normalized theme id
 */
export function persistTheme(themeId, storage) {
  const theme = normalizeTheme(themeId);
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistence is best-effort; the theme still applies for this session.
  }
  return theme;
}
