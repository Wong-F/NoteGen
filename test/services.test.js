const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const { createServices } = require("../src/services");

describe("createServices", () => {
  it("wires all services including onboarding and chat", () => {
    const services = createServices({
      userDataDir: path.join(os.tmpdir(), "notegen-services-test"),
      isDev: true,
    });

    assert.ok(services.onboardingService);
    assert.ok(services.chatService);
    assert.ok(services.authService);
    assert.equal(typeof services.chatService.send, "function");
  });
});
