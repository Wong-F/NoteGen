/**
 * Topic suggestion service (Step 1).
 * Uses prompt assets inspired by md2wechat title-suggest handoff pattern.
 */

const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { PromptCatalog, HOOK_LEVELS } = require("./promptCatalog");

const DEFAULT_TOPIC_COUNT = 5;
const TOPIC_PROMPT_KIND = "topic";
const TOPIC_PROMPT_NAME = "xiaohongshu-topic-expert";

class TopicService {
  /**
   * @param {import("./aiService").AiService} aiService
   * @param {{ promptsDir?: string; promptCatalog?: PromptCatalog }} [options]
   */
  constructor(aiService, options = {}) {
    this.aiService = aiService;
    this.promptCatalog =
      options.promptCatalog ||
      new PromptCatalog(options.promptsDir || path.join(__dirname, "../../prompts"));
  }

  /**
   * @param {number} hookLevel
   * @returns {{ level: number; label: string; description: string }}
   */
  resolveHookLevel(hookLevel) {
    const level = HOOK_LEVELS[hookLevel] ? hookLevel : 1;
    return HOOK_LEVELS[level];
  }

  /**
   * Build the system/user messages for topic suggestion.
   * @param {{ keywords: string; targetReader?: string; count?: number; hookLevel?: number }} payload
   */
  buildMessages(payload) {
    const keywords = payload.keywords?.trim();
    if (!keywords) {
      throw new Error("领域或关键词不能为空");
    }

    const hook = this.resolveHookLevel(payload.hookLevel ?? 1);
    const count = payload.count ?? DEFAULT_TOPIC_COUNT;
    const targetReader = payload.targetReader?.trim() || "（请根据关键词推断）";

    const userContent = this.promptCatalog.renderPrompt(TOPIC_PROMPT_KIND, TOPIC_PROMPT_NAME, {
      DOMAIN_KEYWORDS: keywords,
      TARGET_READER: targetReader,
      TOPIC_COUNT: count,
      HOOK_LEVEL: hook.level,
      HOOK_LEVEL_LABEL: hook.label,
    });

    return [
      {
        role: "system",
        content:
          "你是 noteGen 的选题助手。严格按用户消息中的 JSON 格式要求输出，只返回 JSON，不要其他文字。",
      },
      { role: "user", content: userContent },
    ];
  }

  /**
   * Normalize raw LLM JSON into a stable response shape.
   * @param {unknown} raw
   * @param {{ keywords: string; hookLevel: number; hookLevelLabel: string }} context
   */
  normalizeTopics(raw, context) {
    if (!raw || typeof raw !== "object") {
      throw new Error("模型返回的选题格式无效");
    }

    const data = /** @type {Record<string, unknown>} */ (raw);
    const entries = Array.isArray(data.topics) ? data.topics : [];

    if (!entries.length) {
      throw new Error("模型未返回任何选题候选");
    }

    const topics = entries.map((entry, index) => {
      const item = /** @type {Record<string, unknown>} */ (entry || {});
      const title = String(item.title || "").trim();
      const angle = String(item.angle || "").trim();
      if (!title) {
        throw new Error(`第 ${index + 1} 个选题缺少标题`);
      }

      return {
        id: randomUUID(),
        rank: typeof item.rank === "number" ? item.rank : index + 1,
        title,
        angle: angle || "待补充切入角度",
        targetReader: String(item.target_reader || item.targetReader || context.keywords).trim(),
        strategy: String(item.strategy || "experience").trim(),
        recommendationReason: String(
          item.recommendation_reason || item.recommendationReason || ""
        ).trim(),
      };
    });

    topics.sort((a, b) => a.rank - b.rank);

    return {
      keywords: context.keywords,
      domainSummary: String(data.domain_summary || data.domainSummary || "").trim(),
      targetReader: String(data.target_reader || data.targetReader || "").trim(),
      hookLevel: context.hookLevel,
      hookLevelLabel: context.hookLevelLabel,
      topics,
    };
  }

  /**
   * Suggest topic candidates from domain keywords.
   * @param {{ keywords: string; targetReader?: string; count?: number; hookLevel?: number }} payload
   */
  async suggest(payload) {
    const keywords = payload.keywords?.trim();
    if (!keywords) {
      throw new Error("领域或关键词不能为空");
    }

    const hook = this.resolveHookLevel(payload.hookLevel ?? 1);
    const messages = this.buildMessages({ ...payload, keywords });

    const raw = await this.aiService.completeJson(messages, { temperature: 0.7 });
    return this.normalizeTopics(raw, {
      keywords,
      hookLevel: hook.level,
      hookLevelLabel: hook.label,
    });
  }
}

module.exports = { TopicService, DEFAULT_TOPIC_COUNT, TOPIC_PROMPT_NAME };
