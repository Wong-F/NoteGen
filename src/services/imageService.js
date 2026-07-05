/**
 * Image assets for social cards: user upload + cloud image generation.
 */

const fs = require("node:fs");
const path = require("node:path");
const { AiServiceError } = require("./aiService");
const { getAssetsDir, ensureDir, resolveSessionId } = require("./draftPaths");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_IMAGE_BATCH = 6;

/**
 * @param {number} count
 * @param {number} [max]
 */
function clampImageCount(count, max = MAX_IMAGE_BATCH) {
  const value = Number(count);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(max, Math.max(1, Math.round(value)));
}

class ImageService {
  /**
   * @param {() => { ai: object; image?: object }} getSettings
   * @param {string} userDataDir
   * @param {{ fetchImpl?: typeof fetch }} [deps]
   */
  constructor(getSettings, userDataDir, deps = {}) {
    this.getSettings = getSettings;
    this.userDataDir = userDataDir;
    this.fetchImpl = deps.fetchImpl || fetch;
  }

  /** @returns {{ baseUrl: string; apiKey: string; model: string }} */
  resolveImageConfig() {
    const settings = this.getSettings();
    const ai = settings.ai || {};
    const image = settings.image || {};
    return {
      baseUrl: (image.baseUrl || ai.baseUrl || "").replace(/\/+$/, ""),
      apiKey: image.apiKey || ai.apiKey || "",
      model: image.model || "dall-e-3",
    };
  }

  /**
   * Copy a user-selected file into the draft assets folder.
   * @param {{ sourcePath: string; sessionId?: string; label?: string }} payload
   */
  importUserImage(payload) {
    const sourcePath = payload.sourcePath?.trim();
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      throw new Error("图片文件不存在");
    }

    const ext = path.extname(sourcePath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      throw new Error("不支持的图片格式，请使用 JPG / PNG / WebP / GIF");
    }

    const sessionId = resolveSessionId(payload.sessionId);
    const assetsDir = getAssetsDir(this.userDataDir, sessionId);
    ensureDir(assetsDir);

    const base = (payload.label || `user-${Date.now()}`).replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
    const filename = `${base}${ext}`;
    const destPath = path.join(assetsDir, filename);
    fs.copyFileSync(sourcePath, destPath);

    return {
      sessionId,
      filename,
      absolutePath: destPath,
      relativePath: `assets/${filename}`,
    };
  }

  /**
   * Generate one or more images via OpenAI-compatible /v1/images/generations.
   * @param {{ prompt: string; sessionId?: string; label?: string; size?: string; count?: number }} payload
   */
  async generateImages(payload) {
    const prompt = payload.prompt?.trim();
    if (!prompt) {
      throw new Error("生图描述不能为空");
    }

    const count = clampImageCount(payload.count);
    const config = this.resolveImageConfig();
    if (!config.baseUrl) {
      throw new AiServiceError("图像 API 地址未配置", "CONFIG");
    }
    if (!config.model) {
      throw new AiServiceError("图像模型未配置", "CONFIG");
    }

    const url = `${config.baseUrl}/images/generations`;
    const headers = { "Content-Type": "application/json" };
    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const body = {
      model: config.model,
      prompt,
      n: count,
      size: payload.size || "1024x1024",
      response_format: "b64_json",
    };

    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AiServiceError(`无法连接图像 API：${url}`, "CONNECTION", { cause: error });
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new AiServiceError(`图像 API 返回 HTTP ${response.status}: ${text.slice(0, 300)}`, "HTTP", {
        status: response.status,
      });
    }

    const data = await response.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    if (!items.length) {
      throw new AiServiceError("图像 API 未返回图片数据", "BAD_RESPONSE");
    }

    const sessionId = resolveSessionId(payload.sessionId);
    const assetsDir = getAssetsDir(this.userDataDir, sessionId);
    ensureDir(assetsDir);

    const baseLabel = (payload.label || `ai-${Date.now()}`).replace(/[^\w-]+/g, "-");
    /** @type {Array<{ filename: string; absolutePath: string; relativePath: string; prompt: string }>} */
    const images = [];

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const b64 = item?.b64_json;
      const imageUrl = item?.url;
      let buffer;
      if (b64) {
        buffer = Buffer.from(b64, "base64");
      } else if (imageUrl) {
        const imgRes = await this.fetchImpl(imageUrl);
        if (!imgRes.ok) {
          throw new AiServiceError("下载生成的图片失败", "HTTP", { status: imgRes.status });
        }
        buffer = Buffer.from(await imgRes.arrayBuffer());
      } else {
        continue;
      }

      const suffix = items.length > 1 ? `-${index + 1}` : "";
      const filename = `${baseLabel}${suffix}.png`;
      const destPath = path.join(assetsDir, filename);
      fs.writeFileSync(destPath, buffer);
      images.push({
        filename,
        absolutePath: destPath,
        relativePath: `assets/${filename}`,
        prompt,
      });
    }

    if (!images.length) {
      throw new AiServiceError("图像 API 未返回可用图片数据", "BAD_RESPONSE");
    }

    return { sessionId, images, prompt };
  }

  /**
   * Generate a single image (compat wrapper).
   * @param {{ prompt: string; sessionId?: string; label?: string; size?: string; count?: number }} payload
   */
  async generateImage(payload) {
    const result = await this.generateImages({ ...payload, count: 1 });
    return {
      sessionId: result.sessionId,
      filename: result.images[0].filename,
      absolutePath: result.images[0].absolutePath,
      relativePath: result.images[0].relativePath,
      prompt: result.prompt,
    };
  }
}

module.exports = { ImageService, IMAGE_EXTENSIONS, clampImageCount, MAX_IMAGE_BATCH };
