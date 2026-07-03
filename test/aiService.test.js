const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { AiService, AiServiceError, extractJson } = require("../src/services/aiService");

const CONFIG = {
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
  model: "test-model",
};

/**
 * Build a fetch stub returning the given response and recording calls.
 * @param {{ status?: number; body?: unknown; reject?: Error }} spec
 */
function fetchStub(spec) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (spec.reject) {
      throw spec.reject;
    }
    const status = spec.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => spec.body,
      text: async () => JSON.stringify(spec.body ?? ""),
    };
  };
  return { impl, calls };
}

function chatResponse(content) {
  return { choices: [{ message: { role: "assistant", content } }] };
}

describe("AiService.complete", () => {
  it("returns assistant content and sends model + messages", async () => {
    const { impl, calls } = fetchStub({ body: chatResponse("你好") });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    const result = await service.complete([{ role: "user", content: "hi" }]);

    assert.equal(result, "你好");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://localhost:11434/v1/chat/completions");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.model, "test-model");
    assert.deepEqual(body.messages, [{ role: "user", content: "hi" }]);
  });

  it("sends Authorization header only when apiKey is set", async () => {
    const { impl, calls } = fetchStub({ body: chatResponse("ok") });
    const withKey = { ...CONFIG, apiKey: "sk-123" };
    const service = new AiService(() => withKey, { fetchImpl: impl });

    await service.complete([{ role: "user", content: "hi" }]);

    assert.equal(calls[0].init.headers.Authorization, "Bearer sk-123");
  });

  it("maps network failure to CONNECTION error", async () => {
    const { impl } = fetchStub({ reject: new TypeError("fetch failed") });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    await assert.rejects(
      service.complete([{ role: "user", content: "hi" }]),
      (error) => error instanceof AiServiceError && error.code === "CONNECTION"
    );
  });

  it("maps HTTP 401 to AUTH error", async () => {
    const { impl } = fetchStub({ status: 401, body: {} });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    await assert.rejects(
      service.complete([{ role: "user", content: "hi" }]),
      (error) => error instanceof AiServiceError && error.code === "AUTH"
    );
  });

  it("rejects with CONFIG error when model is missing", async () => {
    const { impl } = fetchStub({ body: chatResponse("ok") });
    const noModel = { ...CONFIG, model: "" };
    const service = new AiService(() => noModel, { fetchImpl: impl });

    await assert.rejects(
      service.complete([{ role: "user", content: "hi" }]),
      (error) => error instanceof AiServiceError && error.code === "CONFIG"
    );
  });
});

describe("AiService.completeJson", () => {
  it("parses fenced JSON from model output", async () => {
    const content = '这是结果：\n```json\n{"topics": ["a", "b"]}\n```';
    const { impl, calls } = fetchStub({ body: chatResponse(content) });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    const result = await service.completeJson([{ role: "user", content: "hi" }]);

    assert.deepEqual(result, { topics: ["a", "b"] });
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.response_format, { type: "json_object" });
  });

  it("throws BAD_RESPONSE when output has no JSON", async () => {
    const { impl } = fetchStub({ body: chatResponse("抱歉，我不知道。") });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    await assert.rejects(
      service.completeJson([{ role: "user", content: "hi" }]),
      (error) => error instanceof AiServiceError && error.code === "BAD_RESPONSE"
    );
  });
});

describe("AiService.testConnection", () => {
  it("returns model ids on success", async () => {
    const body = { data: [{ id: "qwen3:8b" }, { id: "llama3.1:8b" }] };
    const { impl, calls } = fetchStub({ body });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    const result = await service.testConnection();

    assert.deepEqual(result, { ok: true, models: ["qwen3:8b", "llama3.1:8b"] });
    assert.equal(calls[0].url, "http://localhost:11434/v1/models");
    assert.equal(calls[0].init.method, "GET");
  });

  it("returns structured failure instead of throwing", async () => {
    const { impl } = fetchStub({ reject: new TypeError("fetch failed") });
    const service = new AiService(() => CONFIG, { fetchImpl: impl });

    const result = await service.testConnection();

    assert.equal(result.ok, false);
    assert.equal(result.code, "CONNECTION");
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => {
    assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  });

  it("parses JSON arrays surrounded by prose", () => {
    assert.deepEqual(extractJson("结果如下 [1,2,3] 完毕"), [1, 2, 3]);
  });
});
