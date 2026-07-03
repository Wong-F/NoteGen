/**
 * Smoke test: build a deck HTML and verify preview data URL helper logic.
 * Run: node scripts/smoke-render-preview.js
 * Full Electron capture requires `npm run dev` manually.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { CardService } = require("../src/services/cardService");

function toPreviewDataUrl(absolutePath) {
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw new Error("预览图片不存在");
  }
  const buffer = fs.readFileSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  const mime =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

const mockPlan = {
  accent: "ikb",
  pages: [
    {
      id: "xhs-01",
      role: "cover",
      headline: "测试封面",
      subline: "副标题",
      body: "",
      imageSource: "",
      imagePrompt: "",
      searchKeyword: "",
    },
    {
      id: "xhs-02",
      role: "content",
      headline: "第二页",
      subline: "",
      body: "正文",
      imageSource: "",
      imagePrompt: "",
      searchKeyword: "",
    },
  ],
};

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "notegen-smoke-"));
const promptsDir = path.join(__dirname, "../prompts");
const templatesDir = path.join(__dirname, "../templates");

const service = new CardService(
  { completeJson: async () => mockPlan },
  {},
  { userDataDir: userData, promptsDir, templatesDir }
);

const built = service.buildDeckHtml({ sessionId: "smoke-1", plan: mockPlan });
const outputDir = path.join(userData, "drafts", "smoke-1", "output");
fs.mkdirSync(outputDir, { recursive: true });

// Minimal valid PNG (1x1) stand-in for rendered output
const png1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const p1 = path.join(outputDir, "xhs-01.png");
const p2 = path.join(outputDir, "xhs-02.png");
fs.writeFileSync(p1, png1);
fs.writeFileSync(p2, png1);

for (const file of [p1, p2]) {
  const dataUrl = toPreviewDataUrl(file);
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    console.error("FAIL: invalid data URL for", file);
    process.exit(1);
  }
  if (dataUrl.length < 100) {
    console.error("FAIL: data URL too short for", file);
    process.exit(1);
  }
}

console.log("OK: buildDeckHtml ->", built.htmlPath);
console.log("OK: preview data URLs generated for", p1, p2);
console.log("NOTE: CSP must include img-src data: file: — see public/index.html");
