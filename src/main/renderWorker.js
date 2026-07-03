/**
 * Hidden BrowserWindow renderer for social card PNG export.
 */

const fs = require("node:fs");
const path = require("node:path");
const { BrowserWindow } = require("electron");

/**
 * Capture each poster node in an HTML deck as a PNG file.
 * @param {{ htmlPath: string; outputDir: string; pageIds: string[] }} options
 * @returns {Promise<Array<{ id: string; filename: string; absolutePath: string }>>}
 */
async function renderDeckToPng(options) {
  const { htmlPath, outputDir, pageIds } = options;
  if (!pageIds.length) {
    throw new Error("没有可渲染的页面");
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const POSTER_WIDTH = 1080;
  const POSTER_HEIGHT = 1440;
  const SHEET_GAP = 24;
  const SHEET_PADDING = 48;
  const totalContentHeight =
    SHEET_PADDING + pageIds.length * POSTER_HEIGHT + Math.max(0, pageIds.length - 1) * SHEET_GAP;

  const win = new BrowserWindow({
    show: false,
    width: POSTER_WIDTH + 160,
    height: Math.min(totalContentHeight + 120, 32000),
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadFile(htmlPath);
    await win.webContents.executeJavaScript("document.fonts.ready", true);
    await delay(600);

    /** @type {Array<{ id: string; filename: string; absolutePath: string }>} */
    const outputs = [];

    for (const id of pageIds) {
      await win.webContents.executeJavaScript(
        `(function() {
          const el = document.getElementById(${JSON.stringify(id)});
          if (el) el.scrollIntoView({ block: "start", inline: "nearest" });
        })()`
      );
      await delay(120);

      const rect = await win.webContents.executeJavaScript(
        `(function() {
          const el = document.getElementById(${JSON.stringify(id)});
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) };
        })()`
      );

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        throw new Error(`找不到页面节点 #${id}`);
      }

      const image = await win.webContents.capturePage(rect);
      const filename = `${id}.png`;
      const absolutePath = path.join(outputDir, filename);
      fs.writeFileSync(absolutePath, image.toPNG());
      outputs.push({ id, filename, absolutePath });
    }

    return outputs;
  } finally {
    win.close();
  }
}

/** @param {number} ms */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { renderDeckToPng };
