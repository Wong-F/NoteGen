/**
 * Note generation service (Phase 1: local LLM integration placeholder).
 */
class NoteService {
  /**
   * Generate note content from user input.
   * @param {{ topic?: string; platform?: string }} [payload]
   * @returns {Promise<{ title: string; body: string; platform: string }>}
   */
  async generate(payload = {}) {
    const topic = payload.topic?.trim() || "示例主题";
    const platform = payload.platform || "xiaohongshu";

    // Phase 1 TODO: integrate local LLM API
    return {
      title: `${topic} — 草稿标题`,
      body: `这是关于「${topic}」的笔记草稿。\n\n（Phase 1 占位：后续接入本地大模型生成真实内容。）`,
      platform,
    };
  }
}

module.exports = { NoteService };
