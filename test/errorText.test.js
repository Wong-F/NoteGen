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

  it("maps image API config errors to a dedicated settings hint", () => {
    const endpoint = mod.describeAiError(new Error("Image API endpoint is not configured"));
    assert.match(endpoint.text, /图像 API/);
    assert.equal(endpoint.action, "settings");

    const key = mod.describeAiError(new Error("Image API key is not configured"));
    assert.equal(key.action, "settings");
    assert.match(key.text, /API Key/);

    const legacy = mod.describeAiError(new Error("图像 API 地址未配置"));
    assert.equal(legacy.action, "settings");
    assert.match(legacy.text, /图像 API/);
  });

  it("maps auth and connection errors to settings hints", () => {
    assert.equal(mod.describeAiError(new Error("AI endpoint rejected the API key")).action, "settings");
    assert.equal(
      mod.describeAiError(new Error("Cannot reach AI endpoint at http://x/chat")).action,
      "settings"
    );
    assert.equal(
      mod.describeAiError(new Error("无法连接图像 API：https://api.example.com/v1/images/generations"))
        .action,
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
