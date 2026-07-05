const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolvePlatformPack, workflowTypeForPersona } = require("../src/services/platformPacks");
const wechat = require("../src/services/platformPacks/wechat");
const xiaohongshu = require("../src/services/platformPacks/xiaohongshu");

describe("platformPacks", () => {
  it("resolves xiaohongshu by default", () => {
    assert.equal(resolvePlatformPack({}).id, "xiaohongshu");
  });

  it("resolves wechat from persona platform", () => {
    assert.equal(resolvePlatformPack({ persona: { platform: "wechat" } }).id, "wechat");
  });

  it("resolves wechat from workflowType", () => {
    assert.equal(resolvePlatformPack({ workflowType: "wechat-article" }).id, "wechat");
  });

  it("workflowTypeForPersona maps platform", () => {
    assert.equal(workflowTypeForPersona({ platform: "wechat" }), "wechat-article");
    assert.equal(workflowTypeForPersona(null), "xiaohongshu-note");
  });

  it("wechat normalizeCopy requires sections or body", () => {
    assert.throws(
      () => wechat.normalizeCopy({ title: "标题", summary: "摘要" }),
      /缺少正文或小节/
    );
  });

  it("wechat normalizeCopy parses sections", () => {
    const copy = wechat.normalizeCopy({
      title: "长文标题不超过二十五个汉字",
      summary: "这是一段摘要",
      body: "引言段落",
      sections: [
        { heading: "第一节", content: "内容一" },
        { heading: "第二节", content: "内容二" },
      ],
    });
    assert.ok(copy.title.length <= 25);
    assert.equal(copy.sections.length, 2);
    assert.equal(copy.sections[0].heading, "第一节");
  });

  it("xiaohongshu normalizeCopy keeps hashtags", () => {
    const copy = xiaohongshu.normalizeCopy({
      title: "短标题",
      body: "正文",
      hashtags: ["#标签"],
    });
    assert.deepEqual(copy.hashtags, ["#标签"]);
    assert.deepEqual(copy.sections, []);
  });
});
