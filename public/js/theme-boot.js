/**
 * Stamp the persisted theme on <html> before first paint.
 * Module scripts (src/renderer/index.js) execute after initial layout, which
 * would flash the default "cloud" theme for users who chose another one.
 * Storage key must match src/constants/themeOptions.js; unknown values are
 * harmless (no CSS matches) and are normalized later by initTheme().
 */
(function () {
  try {
    const theme = localStorage.getItem("notegen.theme");
    if (theme && theme !== "cloud") {
      document.documentElement.dataset.theme = theme;
    }
  } catch {
    // localStorage unavailable — fall back to the default theme.
  }
})();
