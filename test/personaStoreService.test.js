const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { PersonaStoreService, PLATFORMS } = require("../src/services/personaStoreService");
const { WorkspaceStoreService } = require("../src/services/workspaceStoreService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-personas-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("PersonaStoreService", () => {
  it("returns empty list when no personas exist", () => {
    const service = new PersonaStoreService(makeTmpDir());
    const result = service.list();
    assert.equal(result.activePersonaId, null);
    assert.deepEqual(result.personas, []);
  });

  it("creates persona and sets it active", () => {
    const service = new PersonaStoreService(makeTmpDir());
    const created = service.create({
      name: "职场干货姐",
      primaryDomain: "职场效率",
      voiceSummary: "干脆有方法论",
      targetReader: "25-35 岁白领",
      defaultHookLevel: 2,
    });

    assert.equal(created.name, "职场干货姐");
    assert.equal(created.platform, "xiaohongshu");

    const list = service.list();
    assert.equal(list.personas.length, 1);
    assert.equal(list.activePersonaId, created.id);
  });

  it("updates persona fields", () => {
    const service = new PersonaStoreService(makeTmpDir());
    const created = service.create({ name: "探店小鹿" });
    const saved = service.save({
      id: created.id,
      name: "探店小鹿 v2",
      secondaryDomains: ["咖啡", "Brunch"],
      taboos: ["震惊体"],
      platform: "wechat",
    });

    assert.equal(saved.name, "探店小鹿 v2");
    assert.deepEqual(saved.secondaryDomains, ["咖啡", "Brunch"]);
    assert.equal(saved.platform, "wechat");
  });

  it("switches active persona", () => {
    const service = new PersonaStoreService(makeTmpDir());
    const first = service.create({ name: "A" });
    const second = service.create({ name: "B" });

    service.setActive(first.id);
    assert.equal(service.list().activePersonaId, first.id);

    service.setActive(second.id);
    assert.equal(service.list().activePersonaId, second.id);
  });

  it("blocks delete when workspaces are linked", () => {
    const dir = makeTmpDir();
    const personaService = new PersonaStoreService(dir);
    const workspaceService = new WorkspaceStoreService(dir);
    const persona = personaService.create({ name: "绑定测试" });
    workspaceService.create({ title: "测试创作", personaId: persona.id });

    assert.throws(
      () => personaService.delete(persona.id, { workspaceStoreService: workspaceService }),
      /仍有创作/
    );
  });

  it("deletes persona when no workspaces are linked", () => {
    const dir = makeTmpDir();
    const personaService = new PersonaStoreService(dir);
    const workspaceService = new WorkspaceStoreService(dir);
    const first = personaService.create({ name: "A" });
    const second = personaService.create({ name: "B" });

    personaService.delete(first.id, { workspaceStoreService: workspaceService });
    const list = personaService.list();
    assert.equal(list.personas.length, 1);
    assert.equal(list.activePersonaId, second.id);
  });

  it("clears active persona without deleting personas", () => {
    const service = new PersonaStoreService(makeTmpDir());
    const first = service.create({ name: "A" });
    service.create({ name: "B" });
    assert.equal(service.list().activePersonaId, first.id);

    const cleared = service.clearActive();
    assert.equal(cleared.activePersonaId, null);
    assert.equal(service.list().personas.length, 2);
    assert.equal(service.list().activePersonaId, null);
  });

  it("exports platform labels", () => {
    assert.equal(PLATFORMS.xiaohongshu.label, "小红书");
    assert.equal(PLATFORMS.wechat.label, "微信公众号");
  });
});

describe("WorkspaceStoreService persona integration", () => {
  it("filters workspaces by personaId", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    service.create({ title: "A", personaId: "persona-a" });
    service.create({ title: "B", personaId: "persona-b" });
    service.create({ title: "C", personaId: "persona-a" });

    const filtered = service.list({ personaId: "persona-a" });
    assert.equal(filtered.workspaces.length, 2);
    assert.ok(filtered.workspaces.every((item) => item.personaId === "persona-a"));
  });

  it("rebinds workspace to another persona", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    const created = service.create({ title: "改绑测试", personaId: "old" });
    const rebound = service.rebindPersona(created.id, "new");

    assert.equal(rebound.personaId, "new");
    assert.equal(service.get(created.id).personaId, "new");
  });
});
