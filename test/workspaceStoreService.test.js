const { describe, it, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  WorkspaceStoreService,
  createBlankWorkspaceState,
} = require("../src/services/workspaceStoreService");

const tmpDirs = [];

function makeTmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-workspaces-"));
  tmpDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("WorkspaceStoreService", () => {
  it("returns empty list when no workspaces exist", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    const result = service.list();
    assert.equal(result.activeWorkspaceId, null);
    assert.deepEqual(result.workspaces, []);
  });

  it("creates and retrieves a workspace", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    const created = service.create({ title: "AI办公神器" });

    assert.equal(created.title, "AI办公神器");
    assert.equal(created.activeSection, "idea");

    const loaded = service.get(created.id);
    assert.equal(loaded.title, "AI办公神器");

    const list = service.list();
    assert.equal(list.workspaces.length, 1);
    assert.equal(list.activeWorkspaceId, created.id);
  });

  it("saves partial updates and bumps updatedAt", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    const created = service.create();
    const saved = service.save({
      id: created.id,
      title: "学霸笔记技巧",
      copyDraft: { title: "学霸笔记", body: "正文", hashtags: ["#学习"] },
      completedSections: ["idea", "writing"],
      activeSection: "images",
    });

    assert.equal(saved.title, "学霸笔记技巧");
    assert.deepEqual(saved.completedSections, ["idea", "writing"]);
    assert.equal(saved.activeSection, "images");
    assert.ok(saved.keywords.includes("学霸笔记"));
  });

  it("searches workspaces by title and keywords", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    service.create({ title: "日本旅行攻略" });
    service.create({ title: "夏季穿搭" });
    service.create({
      title: "办公效率",
      ideaInput: { keywords: "AI办公神器", targetReader: "", hookLevel: 2 },
    });

    const results = service.list({ query: "办公" });
    assert.equal(results.workspaces.length, 1);
    assert.equal(results.workspaces[0].title, "办公效率");
  });

  it("limits recent list to 20 by default", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    for (let i = 0; i < 25; i += 1) {
      service.create({ title: `Workspace ${i}` });
    }
    const recent = service.list();
    assert.equal(recent.workspaces.length, 20);
    const all = service.list({ query: "Workspace", limit: 100 });
    assert.equal(all.workspaces.length, 25);
  });

  it("deletes a workspace and updates active id", () => {
    const service = new WorkspaceStoreService(makeTmpDir());
    const first = service.create({ title: "First" });
    const second = service.create({ title: "Second" });

    service.setActive(first.id);
    const result = service.delete(first.id);

    assert.equal(result.activeWorkspaceId, second.id);
    assert.equal(service.get(first.id), null);
    assert.equal(service.list().workspaces.length, 1);
  });

  it("falls back when workspace file is corrupt", () => {
    const dir = makeTmpDir();
    const service = new WorkspaceStoreService(dir);
    const created = service.create();
    fs.writeFileSync(service.workspacePath(created.id), "{bad json", "utf8");
    assert.equal(service.get(created.id), null);
  });

  it("createBlankWorkspaceState has expected defaults", () => {
    const state = createBlankWorkspaceState("test-id");
    assert.equal(state.id, "test-id");
    assert.equal(state.workflowType, "xiaohongshu-note");
    assert.deepEqual(state.scroll, { center: 0, preview: 0, sidebar: 0 });
  });
});
