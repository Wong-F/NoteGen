/**
 * Social card service (Step 3): page planning + HTML deck build + PNG render.
 */

const fs = require("node:fs");
const path = require("node:path");
const { PromptCatalog } = require("./promptCatalog");
const { buildPosterSection, injectPosters } = require("./cardTemplateBuilder");
const {
  resolveSessionId,
  getDraftDir,
  getAssetsDir,
  getOutputDir,
  ensureDir,
} = require("./draftPaths");

const PAGE_PLAN_KIND = "card";
const PAGE_PLAN_NAME = "xiaohongshu-page-plan";

class CardService {
  /**
   * @param {import("./aiService").AiService} aiService
   * @param {import("./imageService").ImageService} imageService
   * @param {{ userDataDir: string; promptsDir?: string; templatesDir?: string; renderDeckFn?: Function }} options
   */
  constructor(aiService, imageService, options) {
    this.aiService = aiService;
    this.imageService = imageService;
    this.userDataDir = options.userDataDir;
    this.promptsDir = options.promptsDir || path.join(__dirname, "../../prompts");
    this.templatesDir = options.templatesDir || path.join(__dirname, "../../templates");
    this.promptCatalog = new PromptCatalog(this.promptsDir);
    this._renderDeckFn = options.renderDeckFn;
  }

  /**
   * @param {{ title: string; body: string; hashtags?: string[] }} copy
   */
  buildPlanMessages(copy) {
    const title = copy.title?.trim();
    const body = copy.body?.trim();
    if (!title || !body) {
      throw new Error("请先在 Step 2 生成笔记文案");
    }

    const hashtags = (copy.hashtags || []).join(" ");
    const userContent = this.promptCatalog.renderPrompt(PAGE_PLAN_KIND, PAGE_PLAN_NAME, {
      NOTE_TITLE: title,
      NOTE_BODY: body,
      HASHTAGS: hashtags,
    });

    return [
      {
        role: "system",
        content:
          "你是 noteGen 的配图策划助手。严格按用户消息中的 JSON 格式输出，只返回 JSON。",
      },
      { role: "user", content: userContent },
    ];
  }

  /**
   * @param {unknown} raw
   */
  normalizePlan(raw) {
    if (!raw || typeof raw !== "object") {
      throw new Error("页面计划格式无效");
    }
    const data = /** @type {Record<string, unknown>} */ (raw);
    const pages = Array.isArray(data.pages) ? data.pages : [];
    if (!pages.length) {
      throw new Error("页面计划为空");
    }

    return {
      accent: String(data.accent || "ikb"),
      pages: pages.map((entry, index) => {
        const page = /** @type {Record<string, unknown>} */ (entry || {});
        return {
          id: String(page.id || `xhs-${String(index + 1).padStart(2, "0")}`),
          role: String(page.role || (index === 0 ? "cover" : "content")),
          headline: String(page.headline || "").trim(),
          subline: String(page.subline || "").trim(),
          body: String(page.body || "").trim(),
          imageSource: String(page.imageSource || ""),
          imagePrompt: String(page.imagePrompt || "").trim(),
          searchKeyword: String(page.searchKeyword || "").trim(),
          imageRelativePath: "",
          imageAbsolutePath: "",
        };
      }),
    };
  }

  /**
   * @param {{ title: string; body: string; hashtags?: string[] }} copy
   */
  async planPages(copy) {
    const messages = this.buildPlanMessages(copy);
    const raw = await this.aiService.completeJson(messages, { temperature: 0.5 });
    return this.normalizePlan(raw);
  }

  /**
   * Write index.html for a deck and return paths.
   * @param {{ sessionId?: string; plan: ReturnType<CardService["normalizePlan"]>; pageAssets?: Record<string, string> }} payload
   *   pageAssets maps page id -> absolute image path
   */
  buildDeckHtml(payload) {
    const sessionId = resolveSessionId(payload.sessionId);
    const draftDir = getDraftDir(this.userDataDir, sessionId);
    const assetsDir = getAssetsDir(this.userDataDir, sessionId);
    ensureDir(draftDir);
    ensureDir(assetsDir);

    const shellPath = path.join(this.templatesDir, "xhs-deck-shell.html");
    let shellHtml = fs.readFileSync(shellPath, "utf8");
    shellHtml = shellHtml.replace(/data-accent="[^"]+"/, `data-accent="${payload.plan.accent}"`);

    const pageAssets = payload.pageAssets || {};
    const postersHtml = payload.plan.pages
      .map((page, index) => {
        const abs = pageAssets[page.id] || page.imageAbsolutePath;
        const rel = abs ? path.relative(draftDir, abs).replace(/\\/g, "/") : "";
        return buildPosterSection(
          {
            ...page,
            imageAbsolutePath: abs || "",
            imageRelativePath: rel,
          },
          index
        );
      })
      .join("\n");

    const html = injectPosters(shellHtml, postersHtml);
    const htmlPath = path.join(draftDir, "index.html");
    fs.writeFileSync(htmlPath, html, "utf8");

    return { sessionId, draftDir, htmlPath, pageIds: payload.plan.pages.map((p) => p.id) };
  }

  /**
   * Full render pipeline: build HTML then capture PNGs.
   * @param {{ sessionId: string; plan: ReturnType<CardService["normalizePlan"]>; pageAssets?: Record<string, string> }} payload
   */
  async renderDeckPng(payload) {
    if (!this._renderDeckFn) {
      throw new Error("渲染器未注入");
    }

    const built = this.buildDeckHtml(payload);
    const outputDir = getOutputDir(this.userDataDir, built.sessionId);
    const images = await this._renderDeckFn({
      htmlPath: built.htmlPath,
      outputDir,
      pageIds: built.pageIds,
    });

    return {
      sessionId: built.sessionId,
      draftDir: built.draftDir,
      htmlPath: built.htmlPath,
      images,
    };
  }
}

module.exports = { CardService, PAGE_PLAN_NAME };
