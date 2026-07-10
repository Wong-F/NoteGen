const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeWindowState, DEFAULT_STATE } = require("../src/main/windowState.js");

const PRIMARY = { x: 0, y: 0, width: 1920, height: 1040 };
const SECONDARY = { x: 1920, y: 0, width: 1920, height: 1040 };

describe("sanitizeWindowState", () => {
  it("falls back to defaults for missing or corrupt state", () => {
    assert.deepEqual(sanitizeWindowState(null, [PRIMARY]), { ...DEFAULT_STATE });
    assert.deepEqual(sanitizeWindowState("junk", [PRIMARY]), { ...DEFAULT_STATE });
    assert.deepEqual(sanitizeWindowState(42, [PRIMARY]), { ...DEFAULT_STATE });
  });

  it("keeps bounds that are visible on an attached display", () => {
    const state = sanitizeWindowState(
      { x: 100, y: 50, width: 1200, height: 800, isMaximized: false },
      [PRIMARY]
    );
    assert.deepEqual(state, { x: 100, y: 50, width: 1200, height: 800, isMaximized: false });
  });

  it("keeps bounds on a secondary display", () => {
    const state = sanitizeWindowState(
      { x: 2000, y: 100, width: 1100, height: 720, isMaximized: false },
      [PRIMARY, SECONDARY]
    );
    assert.equal(state.x, 2000);
    assert.equal(state.y, 100);
  });

  it("drops the position when the display it was on is gone", () => {
    const state = sanitizeWindowState(
      { x: 2000, y: 100, width: 1100, height: 720, isMaximized: false },
      [PRIMARY]
    );
    assert.equal(state.x, undefined);
    assert.equal(state.y, undefined);
    assert.equal(state.width, 1100);
    assert.equal(state.height, 720);
  });

  it("drops positions that barely overlap a display", () => {
    // Only a 10px sliver would remain visible — treat as off-screen.
    const state = sanitizeWindowState(
      { x: -1090, y: 0, width: 1100, height: 720, isMaximized: false },
      [PRIMARY]
    );
    assert.equal(state.x, undefined);
    assert.equal(state.y, undefined);
  });

  it("clamps size to the window minimums", () => {
    const state = sanitizeWindowState(
      { x: 0, y: 0, width: 300, height: 200, isMaximized: false },
      [PRIMARY]
    );
    assert.equal(state.width, 900);
    assert.equal(state.height, 600);
  });

  it("defaults size when values are not finite numbers", () => {
    const state = sanitizeWindowState(
      { x: 0, y: 0, width: "wide", height: NaN, isMaximized: true },
      [PRIMARY]
    );
    assert.equal(state.width, DEFAULT_STATE.width);
    assert.equal(state.height, DEFAULT_STATE.height);
    assert.equal(state.isMaximized, true);
  });

  it("coerces isMaximized to a boolean", () => {
    assert.equal(sanitizeWindowState({ isMaximized: 1 }, [PRIMARY]).isMaximized, true);
    assert.equal(sanitizeWindowState({ isMaximized: 0 }, [PRIMARY]).isMaximized, false);
  });
});
