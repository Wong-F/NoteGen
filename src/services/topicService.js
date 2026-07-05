/**
 * Topic suggestion service (Step 1).
 * Uses prompt assets inspired by md2wechat title-suggest handoff pattern.
 */

const { randomUUID } = require("node:crypto");
const path = require("node:path");
const { PromptCatalog, HOOK_LEVELS } = require("./promptCatalog");
const { appendPersonaBlock } = require("./personaContext");
const { resolvePlatformPack } = require("./platformPacks");

const DEFAULT_TOPIC_COUNT = 5;

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
   * @param {{ keywords: string; targetReader?: string; count?: number; hookLevel?: number; persona?: object | null; workflowType?: string }} payload
   */
  buildMessages(payload) {
    const keywords = payload.keywords?.trim();
    if (!keywords) {
      throw new Error("领域或关键词不能为空");
    }

    const pack = resolvePlatformPack(payload);
    const hook = this.resolveHookLevel(
      payload.hookLevel ?? payload.persona?.defaultHookLevel ?? 1
    );
    const count = payload.count ?? DEFAULT_TOPIC_COUNT;
    const targetReader =
      payload.targetReader?.trim() ||
      payload.persona?.targetReader?.trim() ||
      pack.defaultTargetReader;

    let userContent = this.promptCatalog.renderPrompt(
      pack.prompts.topic.kind,
      pack.prompts.topic.name,
      {
        DOMAIN_KEYWORDS: keywords,
        TARGET_READER: targetReader,
        TOPIC_COUNT: count,
        HOOK_LEVEL: hook.level,
        HOOK_LEVEL_LABEL: hook.label,
      }
    );
    userContent = appendPersonaBlock(userContent, payload.persona);

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
        articleStructure: String(
          item.article_structure || item.articleStructure || ""
        ).trim(),
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
   * @param {{ keywords: string; targetReader?: string; count?: number; hookLevel?: number; persona?: object | null; workflowType?: string }} payload
   */
  async suggest(payload) {
    const keywords = payload.keywords?.trim();
    if (!keywords) {
      throw new Error("领域或关键词不能为空");
    }

    const hook = this.resolveHookLevel(
      payload.hookLevel ?? payload.persona?.defaultHookLevel ?? 1
    );
    const messages = this.buildMessages({ ...payload, keywords });

    const raw = await this.aiService.completeJson(messages, { temperature: 0.7 });
    return this.normalizeTopics(raw, {
      keywords,
      hookLevel: hook.level,
      hookLevelLabel: hook.label,
    });
  }
}

module.exports = { TopicService, DEFAULT_TOPIC_COUNT };
