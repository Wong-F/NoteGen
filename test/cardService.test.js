const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CardService } = require("../src/services/cardService");
const { PromptCatalog } = require("../src/services/promptCatalog");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-card-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const mockPlan = {
  accent: "ikb",
  pages: [
    {
      id: "xhs-01",
      role: "cover",
      headline: "封面标题",
      subline: "副标题",
      body: "",
      imageSource: "",
      imagePrompt: "封面氛围",
      searchKeyword: "",
    },
    {
      id: "xhs-02",
      role: "content",
      headline: "要点一",
      subline: "",
      body: "正文内容",
      imageSource: "",
      imagePrompt: "",
      searchKeyword: "咖啡店",
    },
  ],
};

/** @type {import("../src/services/aiService").AiService} */
const mockAi = {
  completeJson: async () => mockPlan,
};

describe("CardService", () => {
  it("buildPlanMessages rejects empty copy", () => {
    const service = new CardService(mockAi, { importUserImage: () => {} }, { userDataDir: makeTmpDir() });
    assert.throws(() => service.buildPlanMessages({ title: "", body: "" }), /文案/);
  });

  it("planPages returns normalized pages from LLM", async () => {
    const promptsDir = path.join(__dirname, "../prompts");
    const templatesDir = path.join(__dirname, "../templates");
    const service = new CardService(
      mockAi,
      { importUserImage: () => {} },
      { userDataDir: makeTmpDir(), promptsDir, templatesDir }
    );

    const plan = await service.planPages({
      title: "周末探店",
      body: "三家咖啡店推荐",
      hashtags: ["#探店"],
    });

    assert.equal(plan.pages.length, 2);
    assert.equal(plan.pages[0].headline, "封面标题");
    assert.equal(plan.pages[1].searchKeyword, "咖啡店");
  });

  it("planPages falls back to persona visual accent", async () => {
    const promptsDir = path.join(__dirname, "../prompts");
    const templatesDir = path.join(__dirname, "../templates");
    const aiNoAccent = {
      completeJson: async () => ({ pages: mockPlan.pages }),
    };
    const service = new CardService(
      aiNoAccent,
      { importUserImage: () => {} },
      { userDataDir: makeTmpDir(), promptsDir, templatesDir }
    );

    const plan = await service.planPages({
      title: "周末探店",
      body: "三家咖啡店推荐",
      hashtags: ["#探店"],
      persona: { name: "测试", platform: "xiaohongshu", visualAccent: "forest" },
    });

    assert.equal(plan.accent, "forest");
  });

  it("buildDeckHtml writes index.html with poster sections", () => {
    const userData = makeTmpDir();
    const promptsDir = path.join(__dirname, "../prompts");
    const templatesDir = path.join(__dirname, "../templates");
    const service = new CardService(
      mockAi,
      { importUserImage: () => {} },
      { userDataDir: userData, promptsDir, templatesDir }
    );

    const built = service.buildDeckHtml({
      sessionId: "deck-1",
      plan: mockPlan,
    });

    assert.ok(fs.existsSync(built.htmlPath));
    const html = fs.readFileSync(built.htmlPath, "utf8");
    assert.match(html, /封面标题/);
    assert.match(html, /要点一/);
    assert.doesNotMatch(html, /POSTERS_HERE/);
  });

  it("renderDeckPng delegates to injected render function", async () => {
    const userData = makeTmpDir();
    const promptsDir = path.join(__dirname, "../prompts");
    const templatesDir = path.join(__dirname, "../templates");
    const service = new CardService(
      mockAi,
      { importUserImage: () => {} },
      {
        userDataDir: userData,
        promptsDir,
        templatesDir,
        renderDeckFn: async ({ outputDir, pageIds }) =>
          pageIds.map((id) => ({
            id,
            absolutePath: path.join(outputDir, `${id}.png`),
          })),
      }
    );

    const result = await service.renderDeckPng({
      sessionId: "deck-2",
      plan: mockPlan,
    });

    assert.equal(result.images.length, 2);
    assert.equal(result.images[0].id, "xhs-01");
  });
});
