const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ExportService, sanitizeFolderSegment } = require("../src/services/exportService");

describe("ExportService", () => {
  const service = new ExportService();

  it("formatNoteText combines title, body, and hashtags", () => {
    const text = service.formatNoteText({
      title: "周末探店",
      body: "第一家咖啡很好喝。",
      hashtags: ["#探店", "#咖啡"],
    });
    assert.match(text, /周末探店/);
    assert.match(text, /第一家咖啡很好喝/);
    assert.match(text, /#探店 #咖啡/);
  });

  it("buildFolderName includes persona name and date", () => {
    const name = service.buildFolderName({
      persona: { name: "职场干货姐" },
      copy: { title: "AI办公神器" },
      date: new Date("2026-07-05T10:00:00.000Z"),
    });
    assert.match(name, /^职场干货姐_20260705_AI办公神器$/);
  });

  it("buildFolderName works without persona", () => {
    const name = service.buildFolderName({
      copy: { title: "自由创作" },
      date: new Date("2026-07-05T10:00:00.000Z"),
    });
    assert.match(name, /^noteGen_20260705_自由创作$/);
  });

  it("sanitizeFolderSegment removes invalid path characters", () => {
    assert.equal(sanitizeFolderSegment('bad<>name'), "badname");
  });

  it("exportPackage writes xiaohongshu bundle with manifest", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-"));
    const srcImage = path.join(tmp, "src.png");
    fs.writeFileSync(srcImage, "png-bytes");

    const result = service.exportPackage(
      tmp,
      { title: "标题", body: "正文", hashtags: ["#标签"] },
      [{ id: "cover", absolutePath: srcImage, filename: "cover.png" }],
      {
        persona: { id: "p1", name: "测试号", platform: "xiaohongshu", primaryDomain: "职场" },
        workspaceTitle: "测试创作",
      }
    );

    assert.equal(fs.existsSync(result.notePath), true);
    assert.equal(path.basename(result.notePath), "note.txt");
    assert.equal(result.imagePaths.length, 1);
    assert.equal(fs.existsSync(result.manifestPath), true);

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, "utf8"));
    assert.equal(manifest.platform, "xiaohongshu");
    assert.equal(manifest.persona.name, "测试号");
    assert.deepEqual(manifest.files.sort(), ["export.json", "images/", "note.txt"].sort());
  });

  it("exportPackage writes wechat markdown and html skeleton", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-"));
    const result = service.exportPackage(
      tmp,
      {
        title: "长文标题",
        summary: "读者能获得的收益",
        body: "第一段引言。",
        sections: [
          { heading: "核心观点", content: "第一节正文。" },
          { heading: "行动建议", content: "第二节正文。" },
        ],
      },
      [],
      {
        persona: { id: "p2", name: "公众号号", platform: "wechat" },
        platform: "wechat",
      }
    );

    const mdPath = path.join(result.folderPath, "note.md");
    const htmlPath = path.join(result.folderPath, "note.html");
    assert.equal(fs.existsSync(mdPath), true);
    assert.equal(fs.existsSync(htmlPath), true);
    const md = fs.readFileSync(mdPath, "utf8");
    assert.match(md, /# 长文标题/);
    assert.match(md, /> 读者能获得的收益/);
    assert.match(md, /## 核心观点/);
    assert.match(fs.readFileSync(htmlPath, "utf8"), /<h2>核心观点<\/h2>/);

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, "utf8"));
    assert.equal(manifest.platform, "wechat");
    assert.equal(manifest.copy.sectionCount, 2);
  });

  it("resolveTargetDir avoids overwriting existing folder", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-dup-"));
    const first = path.join(tmp, "demo_folder");
    fs.mkdirSync(first);

    const second = service.resolveTargetDir(tmp, "demo_folder");
    assert.equal(second, path.join(tmp, "demo_folder-2"));
  });

  it("exportToDirectory rejects empty copy", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-"));
    assert.throws(() => service.exportToDirectory(tmp, { title: "", body: "" }), /没有可导出的文案/);
  });
});
