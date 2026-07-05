/**
 * Free-form chat with workspace + persona context.
 */

const { buildPersonaPromptBlock, resolvePersona } = require("./personaContext");

class ChatService {
  /**
   * @param {import("./aiService").AiService} aiService
   */
  constructor(aiService) {
    this.aiService = aiService;
  }

  /**
   * @param {object} context
   * @returns {string}
   */
  buildSystemPrompt(context = {}) {
    const lines = [
      "你是 noteGen 笔记坊的创作助手。用户正在使用桌面应用完成选题、文案与配图。",
      "请用简洁、可操作的中文回答；可以讨论创作思路、改标题、扩写要点，也可以回答与当前项目无关的问题。",
      "不要假装已经替用户改动了应用内的数据，需要用户自己在界面中操作。",
    ];

    if (context.workspaceTitle?.trim()) {
      lines.push(`\n## 当前创作\n- 项目标题：${context.workspaceTitle.trim()}`);
    }
    if (context.workflowType) {
      lines.push(`- 创作类型：${context.workflowType}`);
    }
    if (context.ideaInput?.keywords?.trim()) {
      lines.push(`- 领域关键词：${context.ideaInput.keywords.trim()}`);
    }
    if (context.ideaInput?.targetReader?.trim()) {
      lines.push(`- 目标读者：${context.ideaInput.targetReader.trim()}`);
    }
    if (context.selectedTopic?.title) {
      lines.push(`- 已选选题：${context.selectedTopic.title}`);
      if (context.selectedTopic.angle) {
        lines.push(`- 切入角度：${context.selectedTopic.angle}`);
      }
    }
    if (context.copyDraft?.title?.trim()) {
      lines.push(`- 文案标题：${context.copyDraft.title.trim()}`);
    }
    if (context.copyDraft?.summary?.trim()) {
      lines.push(`- 摘要：${context.copyDraft.summary.trim()}`);
    }
    if (context.copyDraft?.body?.trim()) {
      const excerpt =
        context.copyDraft.body.length > 240
          ? `${context.copyDraft.body.slice(0, 240)}…`
          : context.copyDraft.body;
      lines.push(`- 正文摘录：${excerpt}`);
    }

    const personaBlock = buildPersonaPromptBlock(context.persona);
    if (personaBlock) {
      lines.push(`\n${personaBlock}`);
    }

    return lines.join("\n");
  }

  /**
   * @param {{ messages: Array<{ role: string; content: string }>; context?: object }} payload
   * @param {import("./personaStoreService").PersonaStoreService} [personaStore]
   */
  async send(payload, personaStore) {
    const messages = Array.isArray(payload?.messages) ? payload.messages : [];
    if (!messages.length) {
      throw new Error("messages is required");
    }

    const context = { ...(payload.context || {}) };
    if (!context.persona && context.personaId && personaStore) {
      context.persona = resolvePersona(personaStore, context.personaId);
    }

    const systemPrompt = this.buildSystemPrompt(context);
    const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];

    const reply = await this.aiService.complete(fullMessages, { temperature: 0.7 });
    return { reply: reply.trim() };
  }
}

module.exports = { ChatService };
