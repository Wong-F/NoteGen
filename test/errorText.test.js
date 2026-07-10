const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

/** @type {typeof import("../src/constants/errorText.js")} */
let mod;

describe("errorText", () => {
  before(async () => {
    mod = await import("../src/constants/errorText.js");
  });

  it("strips the Electron IPC error prefix", () => {
    assert.equal(
      mod.cleanIpcErrorMessage(
        "Error invoking remote method 'topics:suggest': AiServiceError: AI endpoint is not configured"
      ),
      "AI endpoint is not configured"
    );
    assert.equal(mod.cleanIpcErrorMessage("Error: plain"), "plain");
    assert.equal(mod.cleanIpcErrorMessage("no prefix"), "no prefix");
    assert.equal(mod.cleanIpcErrorMessage(undefined), "");
  });

  it("maps config errors to an actionable settings hint", () => {
    const described = mod.describeAiError(new Error("AI endpoint is not configured"));
    assert.match(described.text, /设置/);
    assert.equal(described.action, "settings");

    const model = mod.describeAiError(new Error("AI model is not configured"));
    assert.equal(model.action, "settings");
  });

  it("maps auth and connection errors to settings hints", () => {
    assert.equal(mod.describeAiError(new Error("AI endpoint rejected the API key")).action, "settings");
    assert.equal(
      mod.describeAiError(new Error("Cannot reach AI endpoint at http://x/chat")).action,
      "settings"
    );
  });

  it("maps timeouts and cancellations without an action", () => {
    const timeout = mod.describeAiError(new Error("Request timed out after 120000ms"));
    assert.match(timeout.text, /超时/);
    assert.equal(timeout.action, undefined);

    const cancelled = mod.describeAiError(
      new Error("Error invoking remote method 'copy:generate': AiServiceError: 已取消")
    );
    assert.equal(cancelled.text, "已取消");
  });

  it("falls back to the cleaned message for unknown errors", () => {
    assert.equal(mod.describeAiError(new Error("something odd")).text, "something odd");
    assert.equal(mod.describeAiError(null).text, "null");
  });
});
