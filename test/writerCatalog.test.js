const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { WriterCatalog, parseBlockYaml } = require("../src/services/writerCatalog");

const SAMPLE_WRITER = `
name: 测试风格
english_name: test-style
description: 用于单测
writing_prompt: |
  第一行风格指引
  第二行风格指引
`;

describe("parseBlockYaml", () => {
  it("parses english_name and writing_prompt block", () => {
    const parsed = parseBlockYaml(SAMPLE_WRITER, "writing_prompt");

    assert.equal(parsed.englishName, "test-style");
    assert.equal(parsed.name, "测试风格");
    assert.match(parsed.writingPrompt, /第一行风格指引/);
  });
});

describe("WriterCatalog", () => {
  it("lists bundled writer styles", () => {
    const catalog = new WriterCatalog(path.join(__dirname, "../writers"));
    const styles = catalog.list();

    assert.ok(styles.length >= 6);
    for (const id of [
      "default",
      "casual-friend",
      "dan-koe",
      "tutorial-handhold",
      "story-emotional",
      "dry-goods",
    ]) {
      assert.ok(styles.some((item) => item.id === id), `missing writer ${id}`);
    }
  });

  it("falls back to default when style id is unknown", () => {
    const catalog = new WriterCatalog(path.join(__dirname, "../writers"));
    const prompt = catalog.getWritingPrompt("missing-style");

    assert.match(prompt, /小红书博主|真实/);
  });
});
