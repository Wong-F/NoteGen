const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { NoteService } = require("../src/services/noteService");

describe("NoteService", () => {
  it("returns placeholder draft for a given topic", async () => {
    const service = new NoteService();
    const result = await service.generate({ topic: "探店" });

    assert.equal(result.platform, "xiaohongshu");
    assert.match(result.title, /探店/);
    assert.match(result.body, /探店/);
  });

  it("uses default topic when input is empty", async () => {
    const service = new NoteService();
    const result = await service.generate({});

    assert.match(result.title, /示例主题/);
  });
});
