/**
 * UI theme management (DOM glue).
 *
 * Themes are pure CSS token sets (see public/css/tokens.css):
 * "cloud" is the :root default; other themes are applied by stamping
 * data-theme on <html>. Choice persists in localStorage.
 *
 * Pure logic lives in src/constants/themeOptions.js; this module only
 * adds document/localStorage side effects.
 */

import {
  DEFAULT_THEME,
  THEMES,
  normalizeTheme,
  persistTheme,
  readStoredTheme,
} from "../constants/themeOptions.js";

export { THEMES, DEFAULT_THEME, normalizeTheme };

/** Read the persisted theme id from localStorage. */
export function getStoredTheme() {
  return readStoredTheme(defaultStorage());
}

/**
 * Apply a theme to the document without persisting it.
 * @param {string} themeId
 */
export function applyTheme(themeId) {
  const theme = normalizeTheme(themeId);
  const rootEl = document.documentElement;
  if (theme === DEFAULT_THEME) {
    delete rootEl.dataset.theme;
  } else {
    rootEl.dataset.theme = theme;
  }
}

/**
 * Apply and persist a theme choice.
 * @param {string} themeId
 * @returns {string} the normalized theme id actually applied
 */
export function setTheme(themeId) {
  const theme = persistTheme(themeId, defaultStorage());
  applyTheme(theme);
  return theme;
}

/** Apply the persisted theme. Call before mounting UI to avoid a flash. */
export function initTheme() {
  applyTheme(getStoredTheme());
}

function defaultStorage() {
  return typeof localStorage === "undefined" ? null : localStorage;
}
