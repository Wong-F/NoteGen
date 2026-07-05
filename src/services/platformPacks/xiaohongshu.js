/**
 * Xiaohongshu platform pack — short note workflow.
 */

const TOPIC = { kind: "topic", name: "xiaohongshu-topic-expert" };
const COPY = { kind: "copy", name: "xiaohongshu-note-writer" };
const HUMANIZER = { kind: "humanizer", name: "xiaohongshu-authentic" };
const CARD = { kind: "card", name: "xiaohongshu-page-plan" };

/**
 * @param {unknown} raw
 * @returns {{ title: string; body: string; hashtags: string[]; summary?: string; sections?: Array<{ heading: string; content: string }> }}
 */
function normalizeCopy(raw) {
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
    summary: "",
    sections: [],
  };
}

/**
 * @param {{ title?: string; body?: string; hashtags?: string[]; summary?: string; sections?: Array<{ heading: string; content: string }> }} copy
 */
function formatCopyForCardPlan(copy) {
  return {
    NOTE_TITLE: copy.title?.trim() || "",
    NOTE_BODY: copy.body?.trim() || "",
    HASHTAGS: (copy.hashtags || []).join(" "),
    ARTICLE_SUMMARY: "",
    ARTICLE_OUTLINE: "",
  };
}

/**
 * @param {{ title?: string; body?: string; hashtags?: string[] }} copy
 * @param {import("../exportService").ExportService} exportService
 */
function formatClipboardText(copy, exportService) {
  return exportService.formatNoteText(copy);
}

module.exports = {
  id: "xiaohongshu",
  workflowType: "xiaohongshu-note",
  label: "小红书",
  prompts: { topic: TOPIC, copy: COPY, humanizer: HUMANIZER, card: CARD },
  defaultTargetReader: "小红书普通用户",
  titleMaxChars: 20,
  deckShell: "xhs-deck-shell.html",
  defaultPosterClass: "xhs",
  normalizeCopy,
  formatCopyForCardPlan,
  formatClipboardText,
  hasSections: false,
};
