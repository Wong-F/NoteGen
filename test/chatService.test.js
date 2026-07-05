const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ChatService } = require("../src/services/chatService");

describe("ChatService", () => {
  it("buildSystemPrompt includes workspace and persona context", () => {
    const service = new ChatService({ complete: async () => "" });
    const prompt = service.buildSystemPrompt({
      workspaceTitle: "周末探店",
      workflowType: "xiaohongshu-note",
      ideaInput: { keywords: "咖啡店", targetReader: "上班族" },
      selectedTopic: { title: "三家宝藏咖啡店", angle: "按路线打卡" },
      copyDraft: { title: "标题", body: "正文内容" },
      persona: {
        name: "生活号",
        platform: "xiaohongshu",
        primaryDomain: "生活方式",
        targetReader: "20-30 岁用户",
      },
    });

    assert.match(prompt, /周末探店/);
    assert.match(prompt, /咖啡店/);
    assert.match(prompt, /三家宝藏咖啡店/);
    assert.match(prompt, /生活号/);
  });

  it("send prepends system prompt and returns assistant reply", async () => {
    const calls = [];
    const aiService = {
      complete: async (messages) => {
        calls.push(messages);
        return "  好的，我来帮你  ";
      },
    };
    const service = new ChatService(aiService);
    const result = await service.send({
      messages: [{ role: "user", content: "帮我改标题" }],
      context: { workspaceTitle: "测试" },
    });

    assert.equal(result.reply, "好的，我来帮你");
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0].role, "system");
    assert.equal(calls[0][1].content, "帮我改标题");
  });
});
