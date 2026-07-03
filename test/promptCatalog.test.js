const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { PromptCatalog, parsePromptYaml } = require("../src/services/promptCatalog");

const SAMPLE_YAML = `
name: demo-prompt
kind: topic
description: demo
variables:
  - KEYWORD
template: |
  Hello {{KEYWORD}}
  Line two
`;

describe("parsePromptYaml", () => {
  it("parses name, kind, variables, and multiline template", () => {
    const parsed = parsePromptYaml(SAMPLE_YAML);

    assert.equal(parsed.name, "demo-prompt");
    assert.equal(parsed.kind, "topic");
    assert.deepEqual(parsed.variables, ["KEYWORD"]);
    assert.match(parsed.template, /Hello \{\{KEYWORD\}\}/);
    assert.match(parsed.template, /Line two/);
  });
});

describe("PromptCatalog", () => {
  it("loads and renders the xiaohongshu topic prompt", () => {
    const promptsDir = path.join(__dirname, "../prompts");
    const catalog = new PromptCatalog(promptsDir);
    const prompt = catalog.load("topic", "xiaohongshu-topic-expert");

    assert.equal(prompt.name, "xiaohongshu-topic-expert");
    assert.equal(prompt.kind, "topic");
    assert.ok(prompt.template.includes("小红书"));

    const rendered = catalog.render(prompt.template, {
      DOMAIN_KEYWORDS: "探店",
      TARGET_READER: "上班族",
      TOPIC_COUNT: 5,
      HOOK_LEVEL: 2,
      HOOK_LEVEL_LABEL: "punchy",
    });

    assert.match(rendered, /探店/);
    assert.match(rendered, /上班族/);
    assert.doesNotMatch(rendered, /\{\{DOMAIN_KEYWORDS\}\}/);
  });
});
