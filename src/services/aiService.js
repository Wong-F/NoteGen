/**
 * OpenAI-compatible chat completion client.
 * Phase 1 targets a local Ollama endpoint (http://localhost:11434/v1);
 * Phase 2 swaps baseUrl/apiKey to a user-provided cloud provider without code changes.
 */

const DEFAULT_TIMEOUT_MS = 120000;

/**
 * Error with a machine-readable code so routes/UI can react per failure class.
 * Codes: CONNECTION | TIMEOUT | AUTH | HTTP | BAD_RESPONSE | CONFIG | CANCELLED
 */
class AiServiceError extends Error {
  /**
   * @param {string} message
   * @param {"CONNECTION"|"TIMEOUT"|"AUTH"|"HTTP"|"BAD_RESPONSE"|"CONFIG"|"CANCELLED"} code
   * @param {{ status?: number; cause?: unknown }} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = "AiServiceError";
    this.code = code;
    if (details.status !== undefined) {
      this.status = details.status;
    }
    if (details.cause !== undefined) {
      this.cause = details.cause;
    }
  }
}

/**
 * Extract a JSON object from LLM output that may be wrapped in markdown fences
 * or surrounded by prose.
 * @param {string} text
 * @returns {unknown}
 */
function extractJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to bracket scanning below.
  }

  const start = trimmed.search(/[[{]/);
  if (start === -1) {
    throw new AiServiceError("Model output contains no JSON", "BAD_RESPONSE");
  }
  const closer = trimmed[start] === "{" ? "}" : "]";
  const end = trimmed.lastIndexOf(closer);
  if (end <= start) {
    throw new AiServiceError("Model output contains unbalanced JSON", "BAD_RESPONSE");
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch (error) {
    throw new AiServiceError("Model output is not valid JSON", "BAD_RESPONSE", { cause: error });
  }
}

class AiService {
  /**
   * @param {() => { baseUrl: string; apiKey?: string; model: string }} getConfig
   *   Reads the current AI settings; called per request so saved settings apply immediately.
   * @param {{ fetchImpl?: typeof fetch }} [deps]
   */
  constructor(getConfig, deps = {}) {
    this.getConfig = getConfig;
    this.fetchImpl = deps.fetchImpl || fetch;
    /** @type {Set<AbortController & { cancelledByUser?: boolean }>} */
    this.inflight = new Set();
  }

  /**
   * Abort every in-flight request (user-initiated cancel).
   * @returns {{ cancelled: number }}
   */
  cancelInflight() {
    let cancelled = 0;
    for (const controller of this.inflight) {
      controller.cancelledByUser = true;
      controller.abort();
      cancelled += 1;
    }
    return { cancelled };
  }

  /** @returns {{ baseUrl: string; apiKey?: string; model: string }} */
  resolveConfig() {
    const config = this.getConfig();
    if (!config || !config.baseUrl) {
      throw new AiServiceError("AI endpoint is not configured", "CONFIG");
    }
    return config;
  }

  /**
   * @param {{ apiKey?: string }} config
   * @returns {Record<string, string>}
   */
  buildHeaders(config) {
    const headers = { "Content-Type": "application/json" };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }
    return headers;
  }

  /**
   * Perform a request against the OpenAI-compatible API with timeout and
   * uniform error mapping.
   * @param {string} path e.g. "/chat/completions"
   * @param {{ method?: string; body?: object; timeoutMs?: number }} [options]
   * @returns {Promise<any>} parsed JSON response body
   */
  async request(path, options = {}) {
    const config = this.resolveConfig();
    const url = config.baseUrl.replace(/\/+$/, "") + path;
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    this.inflight.add(controller);

    let response;
    try {
      response = await this.fetchImpl(url, {
        method: options.method || "POST",
        headers: this.buildHeaders(config),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        if (controller.cancelledByUser) {
          throw new AiServiceError("已取消", "CANCELLED", { cause: error });
        }
        throw new AiServiceError(`Request timed out after ${timeoutMs}ms`, "TIMEOUT", {
          cause: error,
        });
      }
      throw new AiServiceError(`Cannot reach AI endpoint at ${url}`, "CONNECTION", {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      this.inflight.delete(controller);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AiServiceError("AI endpoint rejected the API key", "AUTH", {
        status: response.status,
      });
    }
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new AiServiceError(
        `AI endpoint returned HTTP ${response.status}: ${bodyText.slice(0, 300)}`,
        "HTTP",
        { status: response.status }
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw new AiServiceError("AI endpoint returned non-JSON body", "BAD_RESPONSE", {
        cause: error,
      });
    }
  }

  /**
   * Run a chat completion and return the assistant message content.
   * @param {Array<{ role: string; content: string }>} messages
   * @param {{ temperature?: number; model?: string; timeoutMs?: number; json?: boolean }} [options]
   * @returns {Promise<string>}
   */
  async complete(messages, options = {}) {
    const config = this.resolveConfig();
    const model = options.model || config.model;
    if (!model) {
      throw new AiServiceError("AI model is not configured", "CONFIG");
    }

    const body = { model, messages };
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.json) {
      body.response_format = { type: "json_object" };
    }

    const data = await this.request("/chat/completions", {
      body,
      timeoutMs: options.timeoutMs,
    });
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AiServiceError("AI response is missing message content", "BAD_RESPONSE");
    }
    return content;
  }

  /**
   * Run a chat completion expecting a JSON object/array in the reply.
   * @param {Array<{ role: string; content: string }>} messages
   * @param {{ temperature?: number; model?: string; timeoutMs?: number }} [options]
   * @returns {Promise<unknown>}
   */
  async completeJson(messages, options = {}) {
    const content = await this.complete(messages, { ...options, json: true });
    return extractJson(content);
  }

  /**
   * List model ids available at the endpoint.
   * @returns {Promise<string[]>}
   */
  async listModels() {
    const data = await this.request("/models", { method: "GET" });
    const entries = Array.isArray(data?.data) ? data.data : [];
    return entries.map((entry) => entry.id).filter((id) => typeof id === "string");
  }

  /**
   * Non-throwing connectivity check for the settings UI.
   * @returns {Promise<{ ok: boolean; models?: string[]; code?: string; message?: string }>}
   */
  async testConnection() {
    try {
      const models = await this.listModels();
      return { ok: true, models };
    } catch (error) {
      if (error instanceof AiServiceError) {
        return { ok: false, code: error.code, message: error.message };
      }
      return { ok: false, code: "UNKNOWN", message: error.message };
    }
  }
}

module.exports = { AiService, AiServiceError, extractJson };
