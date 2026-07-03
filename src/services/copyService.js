/**
 * Copywriting service (Step 2).
 * Generates Xiaohongshu note copy from a selected topic and optional writer style.
 */

const path = require("node:path");
const { PromptCatalog } = require("./promptCatalog");
const { WriterCatalog } = require("./writerCatalog");

const COPY_PROMPT_KIND = "copy";
const COPY_PROMPT_NAME = "xiaohongshu-note-writer";
const HUMANIZER_PROMPT_KIND = "humanizer";
const HUMANIZER_PROMPT_NAME = "xiaohongshu-authentic";

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
   * @param {{ title: string; angle: string; targetReader?: string; styleId?: string }} payload
   */
  buildGenerateMessages(payload) {
    const title = payload.title?.trim();
    const angle = payload.angle?.trim();
    if (!title || !angle) {
      throw new Error("选题标题和切入角度不能为空");
    }

    const userContent = this.promptCatalog.renderPrompt(COPY_PROMPT_KIND, COPY_PROMPT_NAME, {
      TOPIC_TITLE: title,
      TOPIC_ANGLE: angle,
      TARGET_READER: payload.targetReader?.trim() || "小红书普通用户",
      STYLE_INSTRUCTION: this.writerCatalog.getWritingPrompt(payload.styleId),
    });

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
   */
  normalizeCopy(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("模型返回的文案格式无效");
    }
    const data = /** @type {Record<string, unknown>} */ (raw);
    const title = String(data.title || "").trim();
    const body = String(data.body || "").trim();
    if (!title || !body) {
      throw new Error("模型返回的文案缺少标题或正文");
    }

    const hashtags = Array.isArray(data.hashtags)
      ? data.hashtags.map((tag) => String(tag).trim()).filter(Boolean)
      : [];

    return {
      title: title.slice(0, 20),
      body,
      hashtags,
    };
  }

  /**
   * Generate note copy from a selected topic.
   * @param {{ title: string; angle: string; targetReader?: string; styleId?: string }} payload
   */
  async generate(payload) {
    const messages = this.buildGenerateMessages(payload);
    const raw = await this.aiService.completeJson(messages, { temperature: 0.8 });
    const copy = this.normalizeCopy(raw);
    return {
      ...copy,
      styleId: payload.styleId?.trim() || "default",
      topicTitle: payload.title.trim(),
      topicAngle: payload.angle.trim(),
    };
  }

  /**
   * @param {string} body
   */
  buildHumanizeMessages(body) {
    const content = body?.trim();
    if (!content) {
      throw new Error("正文不能为空");
    }

    const userContent = this.promptCatalog.renderPrompt(
      HUMANIZER_PROMPT_KIND,
      HUMANIZER_PROMPT_NAME,
      { CONTENT: content }
    );

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
   * @param {{ body: string }} payload
   */
  async humanize(payload) {
    const messages = this.buildHumanizeMessages(payload.body);
    const raw = await this.aiService.completeJson(messages, { temperature: 0.6 });
    if (!raw || typeof raw !== "object") {
      throw new Error("模型返回的去 AI 味结果格式无效");
    }
    const data = /** @type {Record<string, unknown>} */ (raw);
    const body = String(data.body || "").trim();
    if (!body) {
      throw new Error("模型未返回重写后的正文");
    }
    return { body };
  }
}

module.exports = { CopyService, COPY_PROMPT_NAME, HUMANIZER_PROMPT_NAME };
