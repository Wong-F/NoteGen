/**
 * Export note copy and rendered card images for publishing.
 */

const fs = require("node:fs");
const path = require("node:path");

const PLATFORMS = {
  xiaohongshu: { id: "xiaohongshu", label: "小红书" },
  wechat: { id: "wechat", label: "微信公众号" },
};

/**
 * @param {string} text
 * @param {number} [maxLen]
 */
function sanitizeFolderSegment(text, maxLen = 30) {
  const cleaned = String(text || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+|\.+$/g, "");
  const sliced = cleaned.slice(0, maxLen);
  return sliced || "未命名";
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

class ExportService {
  /**
   * @param {{ persona?: object | null; copy?: object; workspaceTitle?: string; date?: Date }} meta
   * @returns {string}
   */
  buildFolderName(meta = {}) {
    const date = meta.date || new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const titlePart = sanitizeFolderSegment(meta.copy?.title || meta.workspaceTitle || "创作", 24);

    if (meta.persona?.name) {
      return `${sanitizeFolderSegment(meta.persona.name, 24)}_${dateStr}_${titlePart}`;
    }
    return `noteGen_${dateStr}_${titlePart}`;
  }

  /**
   * Resolve a non-existing directory under parentDir.
   * @param {string} parentDir
   * @param {string} folderName
   */
  resolveTargetDir(parentDir, folderName) {
    let targetDir = path.join(parentDir, folderName);
    if (!fs.existsSync(targetDir)) {
      return targetDir;
    }

    let suffix = 2;
    while (fs.existsSync(`${targetDir}-${suffix}`)) {
      suffix += 1;
    }
    return `${targetDir}-${suffix}`;
  }

  /**
   * Format copy for Xiaohongshu publishing (title + body + hashtags).
   * @param {{ title?: string; body?: string; hashtags?: string[] }} copy
   * @returns {string}
   */
  formatNoteText(copy) {
    const title = copy?.title?.trim() || "";
    const body = copy?.body?.trim() || "";
    const hashtags = (copy?.hashtags || []).map((tag) => tag.trim()).filter(Boolean);

    const lines = [];
    if (title) {
      lines.push(title);
    }
    if (body) {
      if (lines.length) {
        lines.push("");
      }
      lines.push(body);
    }
    if (hashtags.length) {
      lines.push("");
      lines.push(hashtags.join(" "));
    }

    const text = lines.join("\n").trim();
    return text ? `${text}\n` : "";
  }

  /**
   * @param {{
   *   title?: string;
   *   summary?: string;
   *   body?: string;
   *   sections?: Array<{ heading: string; content: string }>;
   *   hashtags?: string[];
   * }} copy
   * @returns {string}
   */
  formatWechatMarkdown(copy) {
    const title = copy?.title?.trim() || "未命名文章";
    const summary = copy?.summary?.trim() || "";
    const body = copy?.body?.trim() || "";
    const sections = Array.isArray(copy?.sections) ? copy.sections : [];

    const parts = [`# ${title}`, ""];
    if (summary) {
      parts.push(`> ${summary}`, "");
    }
    if (body) {
      parts.push(body, "");
    }
    for (const section of sections) {
      const heading = section?.heading?.trim();
      const content = section?.content?.trim();
      if (heading) {
        parts.push(`## ${heading}`, "");
      }
      if (content) {
        parts.push(content, "");
      }
    }
    return parts.join("\n").trim() ? `${parts.join("\n").trim()}\n` : "";
  }

  /**
   * @param {{ title?: string; body?: string; hashtags?: string[]; summary?: string; sections?: Array<{ heading: string; content: string }> }} copy
   * @returns {string}
   */
  formatNoteMarkdown(copy) {
    if (copy?.sections?.length || copy?.summary) {
      return this.formatWechatMarkdown(copy);
    }

    const title = copy?.title?.trim() || "未命名笔记";
    const body = copy?.body?.trim() || "";
    const hashtags = (copy?.hashtags || []).map((tag) => tag.trim()).filter(Boolean);

    const parts = [`# ${title}`, ""];
    if (body) {
      parts.push(body, "");
    }
    if (hashtags.length) {
      parts.push(hashtags.join(" "), "");
    }
    return parts.join("\n").trim() ? `${parts.join("\n").trim()}\n` : "";
  }

  /**
   * Simple HTML skeleton for WeChat draft paste (Phase 1).
   * @param {{ title?: string; summary?: string; body?: string; sections?: Array<{ heading: string; content: string }> }} copy
   * @returns {string}
   */
  formatNoteHtml(copy) {
    const title = copy?.title?.trim() || "未命名文章";
    const summary = copy?.summary?.trim() || "";
    const body = copy?.body?.trim() || "";
    const sections = Array.isArray(copy?.sections) ? copy.sections : [];

    const bodyBlocks = body
      ? body
          .split(/\n{2,}/)
          .map((block) => block.trim())
          .filter(Boolean)
          .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
          .join("\n")
      : "";

    const sectionBlocks = sections
      .map((section) => {
        const heading = section?.heading?.trim();
        const content = section?.content?.trim();
        if (!heading && !content) {
          return "";
        }
        const paras = content
          ? content
              .split(/\n{2,}/)
              .map((block) => block.trim())
              .filter(Boolean)
              .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
              .join("\n")
          : "";
        return `${heading ? `<h2>${escapeHtml(heading)}</h2>\n` : ""}${paras}`;
      })
      .filter(Boolean)
      .join("\n");

    const summaryBlock = summary
      ? `<blockquote><p>${escapeHtml(summary)}</p></blockquote>\n`
      : "";

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Noto Sans SC", sans-serif; line-height: 1.75; color: #222; max-width: 680px; margin: 24px auto; padding: 0 16px; }
    h1 { font-size: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 1.15em; margin: 1.5em 0 0.5em; }
    blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 3px solid #ccc; color: #555; }
    p { margin: 0.75em 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${summaryBlock}${bodyBlocks}
  ${sectionBlocks}
</body>
</html>
`;
  }

  /**
   * @param {{ persona?: object | null; platform?: string; workspaceTitle?: string; copy?: object; imageCount?: number }} meta
   */
  buildExportManifest(meta) {
    const platform = meta.platform || meta.persona?.platform || "xiaohongshu";
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      platform,
      platformLabel: PLATFORMS[platform]?.label || platform,
      workspaceTitle: meta.workspaceTitle || meta.copy?.title || "",
      persona: meta.persona
        ? {
            id: meta.persona.id,
            name: meta.persona.name,
            primaryDomain: meta.persona.primaryDomain || "",
          }
        : null,
      copy: {
        title: meta.copy?.title || "",
        summary: meta.copy?.summary || "",
        sectionCount: Array.isArray(meta.copy?.sections) ? meta.copy.sections.length : 0,
        hashtagCount: (meta.copy?.hashtags || []).length,
      },
      imageCount: meta.imageCount || 0,
      files: this.listExpectedFiles(platform),
    };
  }

  /**
   * @param {string} platform
   * @returns {string[]}
   */
  listExpectedFiles(platform) {
    const common = ["export.json", "images/"];
    if (platform === "wechat") {
      return ["note.md", "note.html", ...common];
    }
    return ["note.txt", ...common];
  }

  /**
   * Export note text and images into a target directory.
   * @param {string} targetDir
   * @param {{ title?: string; body?: string; hashtags?: string[] }} copy
   * @param {Array<{ id: string; absolutePath: string; filename?: string }>} [images]
   * @param {{ persona?: object | null; platform?: string; workspaceTitle?: string }} [options]
   * @returns {{ notePath: string; imagePaths: string[]; folderPath: string; folderName: string; manifestPath: string; files: string[] }}
   */
  exportToDirectory(targetDir, copy, images = [], options = {}) {
    if (!targetDir?.trim()) {
      throw new Error("导出目录不能为空");
    }

    const platform = options.platform || options.persona?.platform || "xiaohongshu";
    fs.mkdirSync(targetDir, { recursive: true });

    /** @type {string[]} */
    const writtenFiles = [];
    let notePath = "";

    if (platform === "wechat") {
      const mdText = this.formatWechatMarkdown(copy);
      if (!mdText.trim()) {
        throw new Error("没有可导出的文案");
      }
      notePath = path.join(targetDir, "note.md");
      fs.writeFileSync(notePath, mdText, "utf8");
      writtenFiles.push("note.md");

      const htmlPath = path.join(targetDir, "note.html");
      fs.writeFileSync(htmlPath, this.formatNoteHtml(copy), "utf8");
      writtenFiles.push("note.html");
    } else {
      const text = this.formatNoteText(copy);
      if (!text) {
        throw new Error("没有可导出的文案");
      }
      notePath = path.join(targetDir, "note.txt");
      fs.writeFileSync(notePath, text, "utf8");
      writtenFiles.push("note.txt");
    }

    const imageDir = path.join(targetDir, "images");
    /** @type {string[]} */
    const imagePaths = [];

    if (images.length) {
      fs.mkdirSync(imageDir, { recursive: true });
      images.forEach((image, index) => {
        const sourcePath = image.absolutePath;
        if (!sourcePath || !fs.existsSync(sourcePath)) {
          throw new Error(`图片不存在：${image.id || index + 1}`);
        }
        const order = String(index + 1).padStart(2, "0");
        const safeId = (image.id || `page-${index + 1}`).replace(/[^\w-]+/g, "-");
        const ext = path.extname(image.filename || sourcePath) || ".png";
        const destName = `${order}-${safeId}${ext}`;
        const destPath = path.join(imageDir, destName);
        fs.copyFileSync(sourcePath, destPath);
        imagePaths.push(destPath);
      });
      writtenFiles.push("images/");
    }

    const manifestPath = path.join(targetDir, "export.json");
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        this.buildExportManifest({
          persona: options.persona,
          platform,
          workspaceTitle: options.workspaceTitle,
          copy,
          imageCount: imagePaths.length,
        }),
        null,
        2
      ),
      "utf8"
    );
    writtenFiles.push("export.json");

    return {
      notePath,
      imagePaths,
      folderPath: targetDir,
      folderName: path.basename(targetDir),
      manifestPath,
      files: writtenFiles,
      platform,
    };
  }

  /**
   * Export into a named subfolder under parentDir.
   * @param {string} parentDir
   * @param {{ title?: string; body?: string; hashtags?: string[] }} copy
   * @param {Array<{ id: string; absolutePath: string; filename?: string }>} [images]
   * @param {{ persona?: object | null; platform?: string; workspaceTitle?: string; folderName?: string }} [options]
   */
  exportPackage(parentDir, copy, images = [], options = {}) {
    if (!parentDir?.trim()) {
      throw new Error("导出目录不能为空");
    }

    const folderName = options.folderName || this.buildFolderName({
      persona: options.persona,
      copy,
      workspaceTitle: options.workspaceTitle,
    });
    const targetDir = this.resolveTargetDir(parentDir, folderName);
    return this.exportToDirectory(targetDir, copy, images, options);
  }
}

module.exports = { ExportService, sanitizeFolderSegment, PLATFORMS };
