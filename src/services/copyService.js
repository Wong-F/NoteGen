/**
 * Copywriting service (Step 2).
 * Generates platform-specific copy from a selected topic and optional writer style.
 */

const path = require("node:path");
const { PromptCatalog } = require("./promptCatalog");
const { WriterCatalog } = require("./writerCatalog");
const { appendPersonaBlock } = require("./personaContext");
const { resolvePlatformPack } = require("./platformPacks");

class CopyService {
  /**
   * @param {import("./aiService").AiService} aiService
   * @param {{ promptsDir?: string; writersDir?: string; promptCatalog?: PromptCatalog; writerCatalog?: WriterCatalog }} [options]
   */
  constructor(aiService, options = {}) {
    this.aiService = aiService;
    const promptsDir = options.promptsDir || path.join(__dirname, "../../prompts");
    const writersDir = options.writersDir || path.join(__dirname, "../../writers");
    this.promptCatalog = options.promptCatalog || new PromptCatalog(promptsDir);
    this.writerCatalog = options.writerCatalog || new WriterCatalog(writersDir);
  }

  listStyles() {
    return this.writerCatalog.list();
  }

  /**
   * @param {{ title: string; angle: string; targetReader?: string; styleId?: string; persona?: object | null; workflowType?: string }} payload
   */
  buildGenerateMessages(payload) {
    const title = payload.title?.trim();
    const angle = payload.angle?.trim();
    if (!title || !angle) {
      throw new Error("选题标题和切入角度不能为空");
    }

    const pack = resolvePlatformPack(payload);
    const styleId = payload.styleId?.trim() || payload.persona?.defaultStyleId?.trim() || "";
    const targetReader =
      payload.targetReader?.trim() ||
      payload.persona?.targetReader?.trim() ||
      pack.defaultTargetReader;

    let userContent = this.promptCatalog.renderPrompt(
      pack.prompts.copy.kind,
      pack.prompts.copy.name,
      {
        TOPIC_TITLE: title,
        TOPIC_ANGLE: angle,
        TARGET_READER: targetReader,
        STYLE_INSTRUCTION: this.writerCatalog.getWritingPrompt(styleId),
      }
    );
    userContent = appendPersonaBlock(userContent, payload.persona);

    return [
      {
        role: "system",
        content:
          "你是 noteGen 的文案助手。严格按用户消息中的 JSON 格式要求输出，只返回 JSON，不要其他文字。",
      },
      { role: "user", content: userContent },
    ];
  }

  /**
   * @param {unknown} raw
   * @param {{ persona?: object | null; workflowType?: string }} [context]
   */
  normalizeCopy(raw, context = {}) {
    const pack = resolvePlatformPack(context);
    return pack.normalizeCopy(raw);
  }

  /**
   * Generate note copy from a selected topic.
   * @param {{ title: string; angle: string; targetReader?: string; styleId?: string; persona?: object | null; workflowType?: string }} payload
   */
  async generate(payload) {
    const styleId = payload.styleId?.trim() || payload.persona?.defaultStyleId?.trim() || "";
    const messages = this.buildGenerateMessages({ ...payload, styleId: styleId || undefined });
    const raw = await this.aiService.completeJson(messages, { temperature: 0.8 });
    const copy = this.normalizeCopy(raw, payload);
    return {
      ...copy,
      styleId: styleId || "default",
      topicTitle: payload.title.trim(),
      topicAngle: payload.angle.trim(),
    };
  }

  /**
   * @param {string} body
   * @param {object | null | undefined} [persona]
   * @param {Array<{ heading: string; content: string }>} [sections]
   * @param {{ workflowType?: string }} [context]
   */
  buildHumanizeMessages(body, persona, sections = [], context = {}) {
    const content = body?.trim();
    const pack = resolvePlatformPack({ ...context, persona });

    if (pack.hasSections) {
      if (!content && !sections.length) {
        throw new Error("正文不能为空");
      }
      let userContent = this.promptCatalog.renderPrompt(
        pack.prompts.humanizer.kind,
        pack.prompts.humanizer.name,
        {
          CONTENT: content || "（无单独引言，请主要重写 sections）",
          SECTIONS_JSON: JSON.stringify(sections, null, 2),
        }
      );
      userContent = appendPersonaBlock(userContent, persona);
      return [
        {
          role: "system",
          content:
            "你是 noteGen 的去 AI 味助手。严格按用户消息中的 JSON 格式要求输出，只返回 JSON，不要其他文字。",
        },
        { role: "user", content: userContent },
      ];
    }

    if (!content) {
      throw new Error("正文不能为空");
    }

    let userContent = this.promptCatalog.renderPrompt(
      pack.prompts.humanizer.kind,
      pack.prompts.humanizer.name,
      { CONTENT: content }
    );
    userContent = appendPersonaBlock(userContent, persona);

    return [
      {
        role: "system",
        content:
          "你是 noteGen 的去 AI 味助手。严格按用户消息中的 JSON 格式要求输出，只返回 JSON，不要其他文字。",
      },
      { role: "user", content: userContent },
    ];
  }

  /**
   * Rewrite note body to sound more natural.
   * @param {{ body: string; sections?: Array<{ heading: string; content: string }>; persona?: object | null; workflowType?: string }} payload
   */
  async humanize(payload) {
    const pack = resolvePlatformPack(payload);
    const messages = this.buildHumanizeMessages(
      payload.body,
      payload.persona,
      payload.sections || [],
      payload
    );
    const raw = await this.aiService.completeJson(messages, { temperature: 0.6 });

    if (pack.normalizeHumanize) {
      return pack.normalizeHumanize(raw);
    }

    if (!raw || typeof raw !== "object") {
      throw new Error("模型返回的去 AI 味结果格式无效");
    }
    const data = /** @type {Record<string, unknown>} */ (raw);
    const body = String(data.body || "").trim();
    if (!body) {
      throw new Error("模型未返回重写后的正文");
    }
    return { body, sections: [] };
  }

  /**
   * @param {{
   *   title?: string;
   *   summary?: string;
   *   body?: string;
   *   sections?: Array<{ heading: string; content: string }>;
   *   draft?: { heading?: string; content?: string };
   *   styleId?: string;
   *   persona?: object | null;
   *   workflowType?: string;
   * }} payload
   */
  buildContinueSectionMessages(payload) {
    const pack = resolvePlatformPack(payload);
    const promptRef = pack.prompts?.continueSection;
    if (!promptRef || !pack.normalizeContinueSection) {
      throw new Error("当前平台不支持小节续写");
    }

    const title = payload.title?.trim() || "";
    const summary = payload.summary?.trim() || "";
    const body = payload.body?.trim() || "";
    const sections = Array.isArray(payload.sections) ? payload.sections : [];
    const draftHeading = payload.draft?.heading?.trim() || "";
    const draftContent = payload.draft?.content?.trim() || "";

    if (!title && !summary && !body && !sections.length) {
      throw new Error("请先生成或填写文章标题、引言或至少一个小节");
    }

    const styleId = payload.styleId?.trim() || payload.persona?.defaultStyleId?.trim() || "";
    let userContent = this.promptCatalog.renderPrompt(promptRef.kind, promptRef.name, {
      ARTICLE_TITLE: title || "（未填写）",
      ARTICLE_SUMMARY: summary || "（未填写）",
      ARTICLE_BODY: body || "（未填写）",
      EXISTING_SECTIONS_JSON: JSON.stringify(sections, null, 2),
      DRAFT_HEADING: draftHeading || "（空，请续写下一小节）",
      DRAFT_CONTENT: draftContent || "（空）",
      STYLE_INSTRUCTION: this.writerCatalog.getWritingPrompt(styleId),
    });
    userContent = appendPersonaBlock(userContent, payload.persona);

    return [
      {
        role: "system",
        content:
          "你是 noteGen 的公众号小节续写助手。严格按用户消息中的 JSON 格式要求输出，只返回 JSON，不要其他文字。",
      },
      { role: "user", content: userContent },
    ];
  }

  /**
   * Continue or complete a single wechat section with optional user draft.
   * @param {{
   *   title?: string;
   *   summary?: string;
   *   body?: string;
   *   sections?: Array<{ heading: string; content: string }>;
   *   draft?: { heading?: string; content?: string };
   *   styleId?: string;
   *   persona?: object | null;
   *   workflowType?: string;
   * }} payload
   */
  async continueSection(payload) {
    const pack = resolvePlatformPack(payload);
    if (!pack.normalizeContinueSection) {
      throw new Error("当前平台不支持小节续写");
    }
    const messages = this.buildContinueSectionMessages(payload);
    const raw = await this.aiService.completeJson(messages, { temperature: 0.75 });
    return pack.normalizeContinueSection(raw);
  }
}

module.exports = { CopyService };
