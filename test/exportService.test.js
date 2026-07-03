const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { ExportService } = require("../src/services/exportService");

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

  it("exportToDirectory rejects empty copy", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-"));
    assert.throws(() => service.exportToDirectory(tmp, { title: "", body: "" }), /没有可导出的文案/);
  });

  it("exportToDirectory writes note.txt and copies images in order", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-export-"));
    const srcImage = path.join(tmp, "src.png");
    fs.writeFileSync(srcImage, "png-bytes");

    const result = service.exportToDirectory(
      path.join(tmp, "out"),
      { title: "标题", body: "正文", hashtags: ["#标签"] },
      [{ id: "cover", absolutePath: srcImage, filename: "cover.png" }]
    );

    assert.equal(fs.existsSync(result.notePath), true);
    assert.match(fs.readFileSync(result.notePath, "utf8"), /标题/);
    assert.equal(result.imagePaths.length, 1);
    assert.match(result.imagePaths[0], /01-cover\.png$/);
  });
});
