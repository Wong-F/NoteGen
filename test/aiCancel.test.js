const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { AiService } = require("../src/services/aiService.js");

function hangingFetch() {
  return (url, opts) =>
    new Promise((_resolve, reject) => {
      opts.signal.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    });
}

describe("AiService cancellation", () => {
  it("cancelInflight aborts pending requests with a CANCELLED error", async () => {
    const service = new AiService(() => ({ baseUrl: "http://localhost:1", model: "m" }), {
      fetchImpl: hangingFetch(),
    });

    const pending = service.complete([{ role: "user", content: "hi" }]);
    pending.catch(() => {}); // assertion happens below; avoid unhandled rejection
    await new Promise((resolve) => setImmediate(resolve));

    const result = service.cancelInflight();
    assert.equal(result.cancelled, 1);

    await assert.rejects(pending, (error) => {
      assert.equal(error.code, "CANCELLED");
      assert.match(error.message, /已取消/);
      return true;
    });
    assert.equal(service.inflight.size, 0);
  });

  it("cancelInflight is a no-op with nothing in flight", () => {
    const service = new AiService(() => ({ baseUrl: "http://localhost:1", model: "m" }), {
      fetchImpl: hangingFetch(),
    });
    assert.deepEqual(service.cancelInflight(), { cancelled: 0 });
  });

  it("timeout aborts still map to TIMEOUT, not CANCELLED", async () => {
    const service = new AiService(() => ({ baseUrl: "http://localhost:1", model: "m" }), {
      fetchImpl: hangingFetch(),
    });
    await assert.rejects(
      service.complete([{ role: "user", content: "hi" }], { timeoutMs: 10 }),
      (error) => {
        assert.equal(error.code, "TIMEOUT");
        return true;
      }
    );
  });
});
