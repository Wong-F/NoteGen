/**
 * Electron smoke: multi-page PNG capture. Run: npx electron scripts/electron-render-smoke.js
 */

const { app } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { renderDeckToPng } = require("../src/main/renderWorker");
const { CardService } = require("../src/services/cardService");

const mockPlan = {
  accent: "ikb",
  pages: [
    { id: "xhs-01", role: "cover", headline: "封面 A", subline: "副标题", body: "", imagePrompt: "", searchKeyword: "" },
    { id: "xhs-02", role: "content", headline: "第二页 B", subline: "", body: "正文内容", imagePrompt: "", searchKeyword: "" },
    { id: "xhs-03", role: "content", headline: "第三页 C", subline: "", body: "更多文字", imagePrompt: "", searchKeyword: "" },
  ],
};

app.whenReady().then(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-electron-smoke-"));
  const promptsDir = path.join(__dirname, "../prompts");
  const templatesDir = path.join(__dirname, "../templates");
  const service = new CardService(
    { completeJson: async () => mockPlan },
    {},
    { userDataDir: userData, promptsDir, templatesDir }
  );

  const built = service.buildDeckHtml({ sessionId: "electron-smoke", plan: mockPlan });
  const outputDir = path.join(userData, "drafts", "electron-smoke", "output");

  try {
    const images = await renderDeckToPng({
      htmlPath: built.htmlPath,
      outputDir,
      pageIds: mockPlan.pages.map((p) => p.id),
    });

    let failed = false;
    for (const img of images) {
      const stat = fs.statSync(img.absolutePath);
      console.log(img.id, "bytes:", stat.size);
      if (stat.size < 5000) {
        console.error("FAIL: PNG too small, likely blank capture:", img.absolutePath);
        failed = true;
      }
    }

    if (failed) {
      app.exitCode = 1;
    } else {
      console.log("OK: all", images.length, "pages captured with valid PNG size");
    }
  } catch (error) {
    console.error("FAIL:", error.message);
    app.exitCode = 1;
  } finally {
    app.quit();
  }
});
