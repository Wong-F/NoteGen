/**
 * Persist and restore the main window's bounds and maximized state.
 *
 * State lives in <userData>/window-state.json. Restored bounds are validated
 * against the current displays so a monitor that was unplugged never leaves
 * the window stranded off-screen. Pure helpers (sanitizeWindowState) carry
 * the logic; createWindowStateKeeper adds fs/event glue.
 */

const fs = require("node:fs");
const path = require("node:path");

const STATE_FILE = "window-state.json";
const SAVE_DEBOUNCE_MS = 500;

// Keep in sync with the BrowserWindow minWidth/minHeight in main/index.js.
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;

// A restored window must show at least this much of its title bar area
// on some display to count as reachable.
const MIN_VISIBLE_WIDTH = 100;
const MIN_VISIBLE_HEIGHT = 40;

const DEFAULT_STATE = Object.freeze({
  x: undefined,
  y: undefined,
  width: 1100,
  height: 720,
  isMaximized: true,
});

/**
 * Coerce a persisted (possibly corrupt) state object into safe window bounds.
 * @param {unknown} raw
 * @param {Array<{ x: number, y: number, width: number, height: number }>} displayAreas
 *   Work areas of the currently attached displays.
 * @returns {{ x?: number, y?: number, width: number, height: number, isMaximized: boolean }}
 */
function sanitizeWindowState(raw, displayAreas) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_STATE };
  }

  const width = Number.isFinite(raw.width)
    ? Math.max(MIN_WIDTH, Math.round(raw.width))
    : DEFAULT_STATE.width;
  const height = Number.isFinite(raw.height)
    ? Math.max(MIN_HEIGHT, Math.round(raw.height))
    : DEFAULT_STATE.height;
  const isMaximized = Boolean(raw.isMaximized);

  let x;
  let y;
  if (Number.isFinite(raw.x) && Number.isFinite(raw.y)) {
    const candidate = { x: Math.round(raw.x), y: Math.round(raw.y), width, height };
    if (isVisibleOnSomeDisplay(candidate, displayAreas)) {
      x = candidate.x;
      y = candidate.y;
    }
  }

  return { x, y, width, height, isMaximized };
}

/**
 * @param {{ x: number, y: number, width: number, height: number }} bounds
 * @param {Array<{ x: number, y: number, width: number, height: number }>} displayAreas
 * @returns {boolean}
 */
function isVisibleOnSomeDisplay(bounds, displayAreas) {
  if (!Array.isArray(displayAreas)) {
    return false;
  }
  return displayAreas.some((area) => {
    const overlapWidth =
      Math.min(bounds.x + bounds.width, area.x + area.width) - Math.max(bounds.x, area.x);
    const overlapHeight =
      Math.min(bounds.y + bounds.height, area.y + area.height) - Math.max(bounds.y, area.y);
    return overlapWidth >= MIN_VISIBLE_WIDTH && overlapHeight >= MIN_VISIBLE_HEIGHT;
  });
}

/**
 * Load, track, and persist window state for one BrowserWindow.
 * @param {{ userDataDir: string, screen: Pick<import("electron").Screen, "getAllDisplays"> }} deps
 */
function createWindowStateKeeper({ userDataDir, screen }) {
  const file = path.join(userDataDir, STATE_FILE);
  const displayAreas = screen.getAllDisplays().map((display) => display.workArea);

  let raw = null;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    // Missing or corrupt file — fall back to defaults.
  }
  const state = sanitizeWindowState(raw, displayAreas);

  /** @type {ReturnType<typeof setTimeout> | null} */
  let saveTimer = null;

  /** @param {import("electron").BrowserWindow} win */
  const capture = (win) => {
    if (win.isDestroyed()) {
      return;
    }
    state.isMaximized = win.isMaximized();
    if (!state.isMaximized && !win.isMinimized() && !win.isFullScreen()) {
      const bounds = win.getNormalBounds();
      state.x = bounds.x;
      state.y = bounds.y;
      state.width = bounds.width;
      state.height = bounds.height;
    }
  };

  const write = () => {
    try {
      fs.mkdirSync(userDataDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
    } catch (error) {
      console.warn("[noteGen] failed to persist window state:", error.message);
    }
  };

  return {
    state,

    /**
     * Follow a window's bounds and persist them (debounced while moving,
     * synchronously on close).
     * @param {import("electron").BrowserWindow} win
     */
    track(win) {
      const scheduleSave = () => {
        capture(win);
        if (saveTimer) {
          clearTimeout(saveTimer);
        }
        saveTimer = setTimeout(write, SAVE_DEBOUNCE_MS);
      };

      win.on("resize", scheduleSave);
      win.on("move", scheduleSave);
      win.on("maximize", scheduleSave);
      win.on("unmaximize", scheduleSave);
      // Do NOT re-capture on close: Windows already reports the window as
      // un-maximized while it is closing, which would corrupt the state.
      // Every tracked event captured immediately, so state is current here.
      win.on("close", () => {
        if (saveTimer) {
          clearTimeout(saveTimer);
          saveTimer = null;
        }
        write();
      });
    },
  };
}

module.exports = {
  DEFAULT_STATE,
  sanitizeWindowState,
  createWindowStateKeeper,
};
