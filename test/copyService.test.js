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

  it("buildGenerateMessages uses persona voice and default style", () => {
    const messages = service.buildGenerateMessages({
      title: "效率工具",
      angle: "3 个方法",
      persona: {
        name: "干货姐",
        platform: "xiaohongshu",
        targetReader: "上班族",
        voiceSummary: "干脆清单体",
        taboos: ["震惊体"],
        defaultStyleId: "dry-goods",
      },
    });

    assert.match(messages[1].content, /运营人设约束/);
    assert.match(messages[1].content, /干货博主/);
    assert.match(messages[1].content, /震惊体/);
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

  it("normalizeCopy uses wechat pack when persona is wechat", () => {
    const copy = service.normalizeCopy(
      {
        title: "公众号长文标题",
        summary: "摘要",
        body: "引言",
        sections: [{ heading: "小节", content: "内容" }],
      },
      { persona: { platform: "wechat" } }
    );
    assert.equal(copy.sections.length, 1);
    assert.equal(copy.summary, "摘要");
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

  it("buildContinueSectionMessages requires article context", () => {
    assert.throws(
      () =>
        service.buildContinueSectionMessages({
          workflowType: "wechat-article",
          draft: { heading: "", content: "" },
        }),
      /请先生成或填写/
    );
  });

  it("buildContinueSectionMessages allows empty draft with article context", () => {
    const messages = service.buildContinueSectionMessages({
      workflowType: "wechat-article",
      title: "长文标题",
      body: "引言段落",
      sections: [{ heading: "第一节", content: "已有内容" }],
      draft: { heading: "", content: "" },
    });

    assert.match(messages[1].content, /长文标题/);
    assert.match(messages[1].content, /空，请续写下一小节/);
    assert.match(messages[1].content, /第一节/);
  });

  it("buildContinueSectionMessages embeds user draft heading", () => {
    const messages = service.buildContinueSectionMessages({
      workflowType: "wechat-article",
      title: "长文标题",
      body: "引言",
      sections: [],
      draft: { heading: "用户自拟标题", content: "" },
    });

    assert.match(messages[1].content, /用户自拟标题/);
  });

  it("continueSection returns normalized section from mock LLM", async () => {
    const wechatAi = {
      completeJson: async () => ({
        heading: "新小节标题",
        content: "这是续写的小节正文，适合手机阅读。",
      }),
    };
    const wechatService = new CopyService(wechatAi, {
      promptCatalog: new PromptCatalog(promptsDir),
      writerCatalog: new WriterCatalog(writersDir),
    });

    const result = await wechatService.continueSection({
      workflowType: "wechat-article",
      title: "文章标题",
      body: "引言",
      sections: [{ heading: "上一节", content: "上一节内容" }],
      draft: { heading: "", content: "" },
    });

    assert.equal(result.heading, "新小节标题");
    assert.match(result.content, /续写的小节正文/);
  });
});

describe("CopyService.rewriteSelection", () => {
  const rewriteAi = {
    completeJson: async () => ({ replacement: "改写后的片段，衔接自然。" }),
  };
  const service = new CopyService(rewriteAi, {
    promptCatalog: new PromptCatalog(promptsDir),
    writerCatalog: new WriterCatalog(writersDir),
  });

  it("rejects empty selection", () => {
    assert.throws(
      () => service.buildRewriteSelectionMessages({ selection: "  ", instruction: "更口语" }),
      /选中/
    );
  });

  it("rejects empty instruction", () => {
    assert.throws(
      () => service.buildRewriteSelectionMessages({ selection: "一段文字", instruction: " " }),
      /指令不能为空/
    );
  });

  it("embeds field label, context, selection, instruction, and persona", () => {
    const messages = service.buildRewriteSelectionMessages({
      selection: "第一家在胡同里",
      instruction: "换成更具体的地点描述",
      fullText: "开头。<<<第一家在胡同里>>>结尾。",
      fieldLabel: "笔记正文",
      persona: {
        name: "探店小分队",
        platform: "xiaohongshu",
        voiceSummary: "轻松真实",
      },
    });

    assert.equal(messages[0].role, "system");
    assert.match(messages[1].content, /笔记正文/);
    assert.match(messages[1].content, /<<<第一家在胡同里>>>/);
    assert.match(messages[1].content, /换成更具体的地点描述/);
    assert.match(messages[1].content, /探店小分队/);
  });

  it("defaults field label and context placeholders", () => {
    const messages = service.buildRewriteSelectionMessages({
      selection: "片段",
      instruction: "缩短",
    });
    assert.match(messages[1].content, /「正文」/);
    assert.match(messages[1].content, /（无更多上下文）/);
  });

  it("returns trimmed replacement from mock LLM", async () => {
    const result = await service.rewriteSelection({
      selection: "第一家在胡同里",
      instruction: "更口语",
    });
    assert.equal(result.replacement, "改写后的片段，衔接自然。");
  });

  it("throws when model returns no replacement", async () => {
    const emptyAi = { completeJson: async () => ({ replacement: "  " }) };
    const emptyService = new CopyService(emptyAi, {
      promptCatalog: new PromptCatalog(promptsDir),
      writerCatalog: new WriterCatalog(writersDir),
    });
    await assert.rejects(
      emptyService.rewriteSelection({ selection: "片段", instruction: "改写" }),
      /未返回改写结果/
    );
  });
});

describe("CopyService.insertAtCursor", () => {
  const insertAi = {
    completeJson: async () => ({ replacement: "生成的插入内容，衔接自然。" }),
  };
  const service = new CopyService(insertAi, {
    promptCatalog: new PromptCatalog(promptsDir),
    writerCatalog: new WriterCatalog(writersDir),
  });

  it("rejects empty instruction", () => {
    assert.throws(
      () => service.buildInsertAtCursorMessages({ instruction: "  " }),
      /指令不能为空/
    );
  });

  it("embeds field label, caret-marked context, instruction, and persona", () => {
    const messages = service.buildInsertAtCursorMessages({
      instruction: "补一句开头",
      fullText: "<<<>>>正文从这里开始。",
      fieldLabel: "笔记正文",
      persona: { name: "探店小分队", platform: "xiaohongshu", voiceSummary: "轻松真实" },
    });

    assert.equal(messages[0].role, "system");
    assert.match(messages[1].content, /笔记正文/);
    assert.match(messages[1].content, /<<<>>>正文从这里开始。/);
    assert.match(messages[1].content, /补一句开头/);
    assert.match(messages[1].content, /探店小分队/);
  });

  it("defaults field label and empty-content placeholder", () => {
    const messages = service.buildInsertAtCursorMessages({ instruction: "写个开头" });
    assert.match(messages[1].content, /「正文」/);
    assert.match(messages[1].content, /空白内容/);
  });

  it("returns trimmed replacement from mock LLM", async () => {
    const result = await service.insertAtCursor({
      instruction: "补一句总结",
      fullText: "前文。<<<>>>",
    });
    assert.equal(result.replacement, "生成的插入内容，衔接自然。");
  });

  it("throws when model returns no content", async () => {
    const emptyAi = { completeJson: async () => ({ replacement: " " }) };
    const emptyService = new CopyService(emptyAi, {
      promptCatalog: new PromptCatalog(promptsDir),
      writerCatalog: new WriterCatalog(writersDir),
    });
    await assert.rejects(
      emptyService.insertAtCursor({ instruction: "写点什么" }),
      /未返回生成内容/
    );
  });
});
