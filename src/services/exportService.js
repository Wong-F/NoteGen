/**
 * Export note copy and rendered card images for publishing.
 */

const fs = require("node:fs");
const path = require("node:path");

class ExportService {
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
   * Export note text and images into a user-selected directory.
   * @param {string} targetDir
   * @param {{ title?: string; body?: string; hashtags?: string[] }} copy
   * @param {Array<{ id: string; absolutePath: string; filename?: string }>} [images]
   * @returns {{ notePath: string; imagePaths: string[]; folderPath: string }}
   */
  exportToDirectory(targetDir, copy, images = []) {
    if (!targetDir?.trim()) {
      throw new Error("导出目录不能为空");
    }

    const text = this.formatNoteText(copy);
    if (!text) {
      throw new Error("没有可导出的文案");
    }

    fs.mkdirSync(targetDir, { recursive: true });

    const notePath = path.join(targetDir, "note.txt");
    fs.writeFileSync(notePath, text, "utf8");

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
    }

    return { notePath, imagePaths, folderPath: targetDir };
  }
}

module.exports = { ExportService };
