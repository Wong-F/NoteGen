/**
 * WeChat official account platform pack — long-form article workflow.
 */

const TOPIC = { kind: "topic", name: "wechat-topic-expert" };
const COPY = { kind: "copy", name: "wechat-article-writer" };
const CONTINUE_SECTION = { kind: "copy", name: "wechat-section-continue" };
const HUMANIZER = { kind: "humanizer", name: "wechat-authentic" };
const CARD = { kind: "card", name: "wechat-article-plan" };

const TITLE_MAX = 25;
const SUMMARY_MAX = 80;
const SECTION_HEADING_MAX = 18;

/**
 * @param {unknown} entry
 * @returns {{ heading: string; content: string } | null}
 */
function normalizeSection(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const data = /** @type {Record<string, unknown>} */ (entry);
  const heading = String(data.heading || data.title || "").trim();
  const content = String(data.content || data.body || "").trim();
  if (!heading || !content) {
    return null;
  }
  return {
    heading: heading.slice(0, SECTION_HEADING_MAX),
    content,
  };
}

/**
 * @param {unknown} raw
 * @returns {{ title: string; summary: string; body: string; sections: Array<{ heading: string; content: string }>; hashtags: string[] }}
 */
function normalizeCopy(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("模型返回的文案格式无效");
  }
  const data = /** @type {Record<string, unknown>} */ (raw);
  const title = String(data.title || "").trim();
  const summary = String(data.summary || "").trim();
  const body = String(data.body || "").trim();
  const sectionsRaw = Array.isArray(data.sections) ? data.sections : [];
  const sections = sectionsRaw.map(normalizeSection).filter(Boolean);

  if (!title) {
    throw new Error("模型返回的文案缺少标题");
  }
  if (!body && !sections.length) {
    throw new Error("模型返回的文案缺少正文或小节");
  }

  return {
    title: title.slice(0, TITLE_MAX),
    summary: summary.slice(0, SUMMARY_MAX),
    body,
    sections,
    hashtags: [],
  };
}

/**
 * @param {{ title?: string; body?: string; summary?: string; sections?: Array<{ heading: string; content: string }> }} copy
 */
function formatCopyForCardPlan(copy) {
  const outlineParts = [];
  if (copy.summary?.trim()) {
    outlineParts.push(`摘要：${copy.summary.trim()}`);
  }
  if (copy.body?.trim()) {
    outlineParts.push(`引言：\n${copy.body.trim()}`);
  }
  for (const section of copy.sections || []) {
    outlineParts.push(`## ${section.heading}\n${section.content}`);
  }

  return {
    NOTE_TITLE: copy.title?.trim() || "",
    NOTE_BODY: copy.body?.trim() || "",
    HASHTAGS: "",
    ARTICLE_SUMMARY: copy.summary?.trim() || "",
    ARTICLE_OUTLINE: outlineParts.join("\n\n"),
  };
}

/**
 * @param {{ title?: string; summary?: string; body?: string; sections?: Array<{ heading: string; content: string }> }} copy
 * @param {import("../exportService").ExportService} exportService
 */
function formatClipboardText(copy, exportService) {
  return exportService.formatWechatMarkdown(copy);
}

/**
 * @param {unknown} raw
 */
function normalizeHumanize(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("模型返回的去 AI 味结果格式无效");
  }
  const data = /** @type {Record<string, unknown>} */ (raw);
  const body = String(data.body || "").trim();
  const sectionsRaw = Array.isArray(data.sections) ? data.sections : [];
  const sections = sectionsRaw.map(normalizeSection).filter(Boolean);

  if (!body && !sections.length) {
    throw new Error("模型未返回重写后的正文");
  }

  return { body, sections };
}

/**
 * @param {unknown} raw
 * @returns {{ heading: string; content: string }}
 */
function normalizeContinueSection(raw) {
  const section = normalizeSection(raw);
  if (!section) {
    throw new Error("模型未返回有效的小节");
  }
  return section;
}

module.exports = {
  id: "wechat",
  workflowType: "wechat-article",
  label: "微信公众号",
  prompts: { topic: TOPIC, copy: COPY, continueSection: CONTINUE_SECTION, humanizer: HUMANIZER, card: CARD },
  defaultTargetReader: "公众号读者",
  titleMaxChars: TITLE_MAX,
  summaryMaxChars: SUMMARY_MAX,
  deckShell: "wechat-deck-shell.html",
  defaultPosterClass: "wide",
  normalizeCopy,
  normalizeHumanize,
  formatCopyForCardPlan,
  formatClipboardText,
  hasSections: true,
  normalizeContinueSection,
};
