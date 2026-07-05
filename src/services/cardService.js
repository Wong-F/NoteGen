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
const { appendPersonaBlock } = require("./personaContext");
const { resolvePlatformPack } = require("./platformPacks");

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
   * @param {{ title: string; body: string; summary?: string; sections?: Array<{ heading: string; content: string }>; hashtags?: string[]; persona?: object | null; workflowType?: string }} copy
   */
  buildPlanMessages(copy) {
    const title = copy.title?.trim();
    const body = copy.body?.trim();
    const sections = copy.sections || [];
    if (!title || (!body && !sections.length)) {
      throw new Error("请先在 Step 2 生成文案");
    }

    const pack = resolvePlatformPack(copy);
    const vars = pack.formatCopyForCardPlan(copy);

    let userContent = this.promptCatalog.renderPrompt(
      pack.prompts.card.kind,
      pack.prompts.card.name,
      vars
    );
    userContent = appendPersonaBlock(userContent, copy.persona);

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
   * @param {object | null | undefined} [persona]
   * @param {{ workflowType?: string; persona?: object | null }} [context]
   */
  normalizePlan(raw, persona, context = {}) {
    if (!raw || typeof raw !== "object") {
      throw new Error("页面计划格式无效");
    }
    const pack = resolvePlatformPack({ ...context, persona });
    const data = /** @type {Record<string, unknown>} */ (raw);
    const pages = Array.isArray(data.pages) ? data.pages : [];
    if (!pages.length) {
      throw new Error("页面计划为空");
    }

    const idPrefix = pack.id === "wechat" ? "wx" : "xhs";

    return {
      accent: String(data.accent || persona?.visualAccent || "ikb"),
      platform: pack.id,
      deckShell: pack.deckShell,
      defaultPosterClass: pack.defaultPosterClass,
      pages: pages.map((entry, index) => {
        const page = /** @type {Record<string, unknown>} */ (entry || {});
        const role = String(page.role || (index === 0 ? "cover" : "content"));
        return {
          id: String(page.id || `${idPrefix}-${String(index + 1).padStart(2, "0")}`),
          role,
          posterClass: String(
            page.posterClass || page.poster_class || pack.defaultPosterClass
          ).trim(),
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
   * @param {{ title: string; body: string; summary?: string; sections?: Array<{ heading: string; content: string }>; hashtags?: string[]; persona?: object | null; workflowType?: string }} copy
   */
  async planPages(copy) {
    const messages = this.buildPlanMessages(copy);
    const raw = await this.aiService.completeJson(messages, { temperature: 0.5 });
    return this.normalizePlan(raw, copy.persona, copy);
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

    const shellName = payload.plan.deckShell || "xhs-deck-shell.html";
    const shellPath = path.join(this.templatesDir, shellName);
    let shellHtml = fs.readFileSync(shellPath, "utf8");
    shellHtml = shellHtml.replace(/data-accent="[^"]+"/, `data-accent="${payload.plan.accent}"`);

    const pageAssets = payload.pageAssets || {};
    const defaultPosterClass = payload.plan.defaultPosterClass || "xhs";
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
          index,
          { defaultPosterClass: page.posterClass || defaultPosterClass }
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

module.exports = { CardService };
