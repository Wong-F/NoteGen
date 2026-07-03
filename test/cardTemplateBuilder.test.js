const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPosterSection,
  injectPosters,
  toFileUrl,
} = require("../src/services/cardTemplateBuilder");

describe("cardTemplateBuilder", () => {
  it("buildPosterSection escapes HTML in headline", () => {
    const html = buildPosterSection(
      { id: "xhs-01", role: "cover", headline: "<script>alert(1)</script>" },
      0
    );
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
  });

  it("buildPosterSection includes hero when image path is set", () => {
    const html = buildPosterSection(
      {
        id: "xhs-02",
        role: "content",
        headline: "标题",
        imageAbsolutePath: "C:/tmp/photo.png",
      },
      1
    );
    assert.match(html, /class="hero"/);
    assert.match(html, /file:\/\/\/C:\/tmp\/photo\.png/);
  });

  it("injectPosters replaces placeholder", () => {
    const shell = '<div id="deck"><!-- POSTERS_HERE --></div>';
    const result = injectPosters(shell, "<section>poster</section>");
    assert.match(result, /<section>poster<\/section>/);
    assert.doesNotMatch(result, /POSTERS_HERE/);
  });

  it("toFileUrl normalizes Windows paths", () => {
    assert.equal(toFileUrl("D:\\drafts\\a.png"), "file:///D:/drafts/a.png");
  });
});
