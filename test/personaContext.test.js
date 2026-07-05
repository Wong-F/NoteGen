const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const {
  buildPersonaPromptBlock,
  appendPersonaBlock,
  resolvePersona,
} = require("../src/services/personaContext");
const { PersonaStoreService } = require("../src/services/personaStoreService");

describe("personaContext", () => {
  it("returns empty block when persona is missing", () => {
    assert.equal(buildPersonaPromptBlock(null), "");
    assert.equal(appendPersonaBlock("base", null), "base");
  });

  it("builds prompt block with persona fields", () => {
    const block = buildPersonaPromptBlock({
      name: "职场干货姐",
      platform: "xiaohongshu",
      primaryDomain: "职场效率",
      secondaryDomains: ["AI工具"],
      targetReader: "25-35 岁白领",
      voiceSummary: "干脆有方法论",
      taboos: ["震惊体"],
      defaultHookLevel: 2,
      visualAccent: "forest",
    });

    assert.match(block, /运营人设约束/);
    assert.match(block, /职场干货姐/);
    assert.match(block, /小红书/);
    assert.match(block, /职场效率/);
    assert.match(block, /AI工具/);
    assert.match(block, /震惊体/);
    assert.match(block, /forest/);
  });

  it("resolvePersona loads persona from store", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-ctx-"));
    const store = new PersonaStoreService(dir);
    const created = store.create({ name: "测试号" });
    const resolved = resolvePersona(store, created.id);
    assert.equal(resolved.name, "测试号");
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
