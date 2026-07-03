const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { CopyService } = require("../src/services/copyService");
const { PromptCatalog } = require("../src/services/promptCatalog");
const { WriterCatalog } = require("../src/services/writerCatalog");

const promptsDir = path.join(__dirname, "../prompts");
const writersDir = path.join(__dirname, "../writers");

/** @type {import("../src/services/aiService").AiService} */
const mockAi = {
  completeJson: async (messages) => {
    const user = messages.find((m) => m.role === "user")?.content || "";
    if (user.includes("待处理正文")) {
      return { body: "重写后的探店正文，更像真人分享。" };
    }
    return {
      title: "周末探店｜3家宝藏咖啡店",
      body: "第一家在胡同里，拿铁很稳。\n\n第二家适合拍照，窗景绝了。",
      hashtags: ["#探店", "#咖啡", "#周末"],
    };
  },
};

describe("CopyService", () => {
  const service = new CopyService(mockAi, {
    promptCatalog: new PromptCatalog(promptsDir),
    writerCatalog: new WriterCatalog(writersDir),
  });

  it("buildGenerateMessages requires topic title and angle", () => {
    assert.throws(
      () => service.buildGenerateMessages({ title: "  ", angle: "角度" }),
      /不能为空/
    );
  });

  it("buildGenerateMessages embeds topic and style into prompt", () => {
    const messages = service.buildGenerateMessages({
      title: "探店标题",
      angle: "按区域整理三家店",
      targetReader: "咖啡爱好者",
      styleId: "casual-friend",
    });

    assert.match(messages[1].content, /探店标题/);
    assert.match(messages[1].content, /按区域整理三家店/);
    assert.match(messages[1].content, /闺蜜/);
  });

  it("generate returns normalized copy from mock LLM", async () => {
    const result = await service.generate({
      title: "探店标题",
      angle: "三家店合集",
      styleId: "default",
    });

    assert.equal(result.title, "周末探店｜3家宝藏咖啡店");
    assert.match(result.body, /第一家/);
    assert.deepEqual(result.hashtags, ["#探店", "#咖啡", "#周末"]);
    assert.equal(result.styleId, "default");
  });

  it("normalizeCopy truncates title to 20 chars", () => {
    const copy = service.normalizeCopy({
      title: "这是一个超过二十个汉字的非常长的标题应该被截断",
      body: "正文",
      hashtags: [],
    });

    assert.equal(copy.title.length, 20);
  });

  it("humanize returns rewritten body", async () => {
    const result = await service.humanize({
      body: "此外，值得注意的是，这家咖啡店本质上体现了精品咖啡的趋势。",
    });

    assert.match(result.body, /重写后的探店正文/);
  });

  it("humanize rejects empty body", async () => {
    await assert.rejects(service.humanize({ body: "  " }), /不能为空/);
  });
});
