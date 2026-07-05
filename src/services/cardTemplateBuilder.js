/**
 * Build poster HTML sections for the xhs-deck-shell template.
 */

/**
 * @param {{
 *   id: string;
 *   role: string;
 *   headline: string;
 *   subline?: string;
 *   body?: string;
 *   imageRelativePath?: string;
 * }} page
 * @param {number} index
 * @param {{ defaultPosterClass?: string }} [options]
 */
function buildPosterSection(page, index, options = {}) {
  const defaultClass = options.defaultPosterClass || "xhs";
  const posterClass = page.posterClass || defaultClass;
  const isCover = page.role === "cover" || index === 0;
  const classes = ["poster", posterClass, isCover ? "cover" : "content"].join(" ");
  const vol = String(index + 1).padStart(2, "0");
  const hero = page.imageAbsolutePath
    ? `<img class="hero" src="${escapeAttr(toFileUrl(page.imageAbsolutePath))}" alt="" />`
    : "";

  return `
    <section class="${classes}" id="${escapeHtml(page.id)}">
      <div class="cat">${isCover ? "Cover" : `Page ${vol}`}</div>
      ${isCover ? '<div class="accent-bar"></div>' : ""}
      ${hero}
      <h1 class="headline">${escapeHtml(page.headline)}</h1>
      ${page.subline ? `<p class="subline">${escapeHtml(page.subline)}</p>` : ""}
      ${page.body ? `<div class="body">${escapeHtml(page.body)}</div>` : ""}
      <div class="foot">
        <span>noteGen</span>
        <span>${vol}</span>
      </div>
    </section>
  `;
}

/**
 * @param {string} shellHtml
 * @param {string} postersHtml
 */
function injectPosters(shellHtml, postersHtml) {
  return shellHtml.replace("<!-- POSTERS_HERE -->", postersHtml.trim());
}

/** @param {string} text */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string} value */
function escapeAttr(value) {
  return escapeHtml(value);
}

/** @param {string} absolutePath */
function toFileUrl(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, "/");
  return `file:///${normalized.replace(/^\//, "")}`;
}

module.exports = { buildPosterSection, injectPosters, toFileUrl };
