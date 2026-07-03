const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { TopicService } = require("../src/services/topicService");
const { PromptCatalog } = require("../src/services/promptCatalog");

/** @type {import("../src/services/aiService").AiService} */
const mockAi = {
  completeJson: async () => ({
    domain_summary: "咖啡店探店内容机会大",
    target_reader: "年轻上班族",
    topics: [
      {
        rank: 1,
        title: "周末探店｜3家隐藏咖啡店",
        angle: "按区域整理三家风格不同的店",
        target_reader: "喜欢咖啡的上班族",
        strategy: "checklist",
        recommendation_reason: "收藏型内容，搜索潜力好",
      },
      {
        rank: 2,
        title: "第一次探店怎么拍",
        angle: "从点单到拍照的完整流程",
        target_reader: "探店新手",
        strategy: "pain_point",
      },
    ],
  }),
};

describe("TopicService", () => {
  it("buildMessages rejects empty keywords", () => {
    const service = new TopicService(mockAi, {
      promptCatalog: new PromptCatalog(require("node:path").join(__dirname, "../prompts")),
    });

    assert.throws(() => service.buildMessages({ keywords: "  " }), /不能为空/);
  });

  it("buildMessages renders domain keywords into the prompt", () => {
    const service = new TopicService(mockAi, {
      promptCatalog: new PromptCatalog(require("node:path").join(__dirname, "../prompts")),
    });

    const messages = service.buildMessages({
      keywords: "咖啡店探店",
      hookLevel: 2,
      count: 5,
    });

    assert.equal(messages.length, 2);
    assert.match(messages[1].content, /咖啡店探店/);
    assert.match(messages[1].content, /punchy/);
  });

  it("suggest returns normalized topic list from mock LLM", async () => {
    const service = new TopicService(mockAi, {
      promptCatalog: new PromptCatalog(require("node:path").join(__dirname, "../prompts")),
    });

    const result = await service.suggest({ keywords: "咖啡店探店", hookLevel: 2 });

    assert.equal(result.keywords, "咖啡店探店");
    assert.equal(result.hookLevel, 2);
    assert.equal(result.hookLevelLabel, "punchy");
    assert.equal(result.topics.length, 2);
    assert.equal(result.topics[0].title, "周末探店｜3家隐藏咖啡店");
    assert.ok(result.topics[0].id);
    assert.match(result.topics[0].angle, /区域/);
  });

  it("normalizeTopics throws when topics array is empty", () => {
    const service = new TopicService(mockAi, {
      promptCatalog: new PromptCatalog(require("node:path").join(__dirname, "../prompts")),
    });

    assert.throws(
      () => service.normalizeTopics({ topics: [] }, { keywords: "x", hookLevel: 1, hookLevelLabel: "restrained" }),
      /未返回任何选题/
    );
  });
});
