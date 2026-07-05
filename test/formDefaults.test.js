const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  getPersonaTemplate,
  getDefaultIdeaInput,
  fillIdeaInputDefaults,
  mergePersonaSeed,
} = require("../src/constants/formDefaults.cjs");
const { createBlankPersonaState } = require("../src/services/personaStoreService");
const { createBlankWorkspaceState } = require("../src/services/workspaceStoreService");

describe("formDefaults", () => {
  it("provides xiaohongshu persona template", () => {
    const template = getPersonaTemplate("xiaohongshu");
    assert.match(template.name, /分享/);
    assert.equal(template.platform, "xiaohongshu");
    assert.ok(template.primaryDomain.length > 0);
    assert.ok(template.targetReader.length > 0);
  });

  it("provides wechat persona template", () => {
    const template = getPersonaTemplate("wechat");
    assert.equal(template.platform, "wechat");
    assert.match(template.primaryDomain, /职场/);
  });

  it("fills empty idea input fields", () => {
    const filled = fillIdeaInputDefaults(
      { keywords: "", targetReader: "", hookLevel: 2 },
      "wechat-article"
    );
    assert.ok(filled.keywords.length > 0);
    assert.ok(filled.targetReader.length > 0);
    assert.equal(filled.hookLevel, 2);
  });

  it("mergePersonaSeed keeps template arrays when seed omits them", () => {
    const merged = mergePersonaSeed({ name: "我的号" });
    assert.equal(merged.name, "我的号");
    assert.ok(merged.taboos.length > 0);
    assert.ok(merged.secondaryDomains.length > 0);
  });
});

describe("blank states use form defaults", () => {
  it("createBlankPersonaState includes template fields", () => {
    const persona = createBlankPersonaState("p1");
    assert.ok(persona.primaryDomain.length > 0);
    assert.ok(persona.targetReader.length > 0);
    assert.ok(persona.voiceSummary.length > 0);
  });

  it("createBlankWorkspaceState includes idea defaults", () => {
    const workspace = createBlankWorkspaceState("w1");
    assert.ok(workspace.ideaInput.keywords.length > 0);
    assert.ok(workspace.ideaInput.targetReader.length > 0);
  });

  it("createBlankWorkspaceState uses wechat idea defaults", () => {
    const workspace = createBlankWorkspaceState("w2", "wechat-article");
    assert.match(workspace.ideaInput.keywords, /职场/);
  });
});
