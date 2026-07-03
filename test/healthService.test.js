const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { HealthService } = require("../src/services/healthService");

describe("HealthService", () => {
  it("responds with ok status", () => {
    const service = new HealthService();
    const result = service.ping();

    assert.equal(result.ok, true);
    assert.match(result.message, /noteGen/);
  });
});
