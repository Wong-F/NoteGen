/**
 * Stock photo search via Pexels and Unsplash official APIs.
 */

const fs = require("node:fs");
const path = require("node:path");
const { getAssetsDir, resolveSessionId, ensureDir } = require("./draftPaths");

class StockImageError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {object} [details]
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = "StockImageError";
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {string} keyword
 */
function sanitizeKeyword(keyword) {
  return keyword?.trim() || "";
}

/**
 * @param {string} label
 */
function sanitizeLabel(label) {
  return (label || `stock-${Date.now()}`).replace(/[^\w\u4e00-\u9fa5-]+/g, "-");
}

class StockImageService {
  /**
   * @param {() => { stock?: { pexelsApiKey?: string; unsplashAccessKey?: string } }} getSettings
   * @param {string} userDataDir
   * @param {{ fetchImpl?: typeof fetch }} [deps]
   */
  constructor(getSettings, userDataDir, deps = {}) {
    this.getSettings = getSettings;
    this.userDataDir = userDataDir;
    this.fetchImpl = deps.fetchImpl || fetch;
  }

  /** @returns {{ pexelsApiKey: string; unsplashAccessKey: string }} */
  resolveStockConfig() {
    const stock = this.getSettings().stock || {};
    return {
      pexelsApiKey: (stock.pexelsApiKey || "").trim(),
      unsplashAccessKey: (stock.unsplashAccessKey || "").trim(),
    };
  }

  /**
   * @param {string} keyword
   * @returns {Promise<{ provider: string; downloadUrl: string; pageUrl: string; author: string; license: string } | null>}
   */
  async searchPexels(keyword) {
    const { pexelsApiKey } = this.resolveStockConfig();
    if (!pexelsApiKey) {
      return null;
    }

    const url = `https://api.pexels.com/v1/search?${new URLSearchParams({
      query: keyword,
      per_page: "5",
      locale: "zh-CN",
    })}`;

    const response = await this.fetchImpl(url, {
      headers: { Authorization: pexelsApiKey },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new StockImageError(
        `Pexels API 返回 HTTP ${response.status}: ${text.slice(0, 200)}`,
        "HTTP",
        { provider: "pexels", status: response.status }
      );
    }

    const data = await response.json();
    const photo = data?.photos?.[0];
    if (!photo) {
      return null;
    }

    const downloadUrl = photo.src?.large2x || photo.src?.large || photo.src?.original;
    if (!downloadUrl) {
      return null;
    }

    return {
      provider: "pexels",
      downloadUrl,
      pageUrl: photo.url || `https://www.pexels.com/photo/${photo.id}/`,
      author: photo.photographer || "Unknown",
      license: "Pexels License",
    };
  }

  /**
   * @param {string} keyword
   * @returns {Promise<{ provider: string; downloadUrl: string; pageUrl: string; author: string; license: string } | null>}
   */
  async searchUnsplash(keyword) {
    const { unsplashAccessKey } = this.resolveStockConfig();
    if (!unsplashAccessKey) {
      return null;
    }

    const url = `https://api.unsplash.com/search/photos?${new URLSearchParams({
      query: keyword,
      per_page: "5",
    })}`;

    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Client-ID ${unsplashAccessKey}` },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new StockImageError(
        `Unsplash API 返回 HTTP ${response.status}: ${text.slice(0, 200)}`,
        "HTTP",
        { provider: "unsplash", status: response.status }
      );
    }

    const data = await response.json();
    const photo = data?.results?.[0];
    if (!photo) {
      return null;
    }

    const downloadUrl = photo.urls?.regular || photo.urls?.full;
    if (!downloadUrl) {
      return null;
    }

    return {
      provider: "unsplash",
      downloadUrl,
      pageUrl: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
      author: photo.user?.name || "Unknown",
      license: "Unsplash License",
    };
  }

  /**
   * Pexels first, then Unsplash.
   * @param {string} keyword
   */
  async searchCandidate(keyword) {
    const query = sanitizeKeyword(keyword);
    if (!query) {
      throw new StockImageError("搜索关键词不能为空", "CONFIG");
    }

    const config = this.resolveStockConfig();
    if (!config.pexelsApiKey && !config.unsplashAccessKey) {
      throw new StockImageError(
        "请先在设置中配置 Pexels 或 Unsplash API Key",
        "CONFIG"
      );
    }

    if (config.pexelsApiKey) {
      const pexelsHit = await this.searchPexels(query);
      if (pexelsHit) {
        return { ...pexelsHit, keyword: query };
      }
    }

    if (config.unsplashAccessKey) {
      const unsplashHit = await this.searchUnsplash(query);
      if (unsplashHit) {
        return { ...unsplashHit, keyword: query };
      }
    }

    throw new StockImageError(`未找到与「${query}」匹配的图片`, "NOT_FOUND", {
      keyword: query,
    });
  }

  /**
   * Lightweight Pexels probe for settings connectivity test.
   * @returns {Promise<{ id: string; configured: boolean; ok: boolean; code?: string; message: string }>}
   */
  async probePexels() {
    const { pexelsApiKey } = this.resolveStockConfig();
    if (!pexelsApiKey) {
      return { id: "pexels", configured: false, ok: false, message: "未配置 API Key" };
    }

    const url = "https://api.pexels.com/v1/search?query=nature&per_page=1";
    try {
      const response = await this.fetchImpl(url, {
        headers: { Authorization: pexelsApiKey },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const code = response.status === 401 || response.status === 403 ? "AUTH" : "HTTP";
        return {
          id: "pexels",
          configured: true,
          ok: false,
          code,
          message: `HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ""}`,
        };
      }
      await response.json();
      return { id: "pexels", configured: true, ok: true, message: "连接成功，搜索接口可用" };
    } catch (error) {
      return {
        id: "pexels",
        configured: true,
        ok: false,
        code: "CONNECTION",
        message: error.message,
      };
    }
  }

  /**
   * Lightweight Unsplash probe for settings connectivity test.
   * @returns {Promise<{ id: string; configured: boolean; ok: boolean; code?: string; message: string }>}
   */
  async probeUnsplash() {
    const { unsplashAccessKey } = this.resolveStockConfig();
    if (!unsplashAccessKey) {
      return { id: "unsplash", configured: false, ok: false, message: "未配置 Access Key" };
    }

    const url = "https://api.unsplash.com/search/photos?query=nature&per_page=1";
    try {
      const response = await this.fetchImpl(url, {
        headers: { Authorization: `Client-ID ${unsplashAccessKey}` },
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const code = response.status === 401 || response.status === 403 ? "AUTH" : "HTTP";
        return {
          id: "unsplash",
          configured: true,
          ok: false,
          code,
          message: `HTTP ${response.status}${text ? `: ${text.slice(0, 120)}` : ""}`,
        };
      }
      await response.json();
      return { id: "unsplash", configured: true, ok: true, message: "连接成功，搜索接口可用" };
    } catch (error) {
      return {
        id: "unsplash",
        configured: true,
        ok: false,
        code: "CONNECTION",
        message: error.message,
      };
    }
  }

  /**
   * Test configured stock image providers. Never throws.
   * @returns {Promise<{ ok: boolean; code?: string; message?: string; providers: Array<{ id: string; configured: boolean; ok: boolean; code?: string; message: string }> }>}
   */
  async testConnection() {
    const config = this.resolveStockConfig();
    if (!config.pexelsApiKey && !config.unsplashAccessKey) {
      return {
        ok: false,
        code: "CONFIG",
        message: "请至少配置 Pexels 或 Unsplash 的 API Key",
        providers: [],
      };
    }

    const providers = await Promise.all([this.probePexels(), this.probeUnsplash()]);
    const configured = providers.filter((item) => item.configured);
    const ok = configured.length > 0 && configured.every((item) => item.ok);

    return { ok, providers };
  }

  /**
   * @param {string} assetsDir
   * @param {{ label: string; provider: string; author: string; pageUrl: string; license: string; filename: string; keyword: string }} meta
   */
  appendSourceRecord(assetsDir, meta) {
    const sourcesPath = path.join(assetsDir, "SOURCES.md");
    const block = [
      "",
      `## ${meta.label}`,
      `- Keyword: ${meta.keyword}`,
      `- Provider: ${meta.provider}`,
      `- Author: ${meta.author}`,
      `- Source URL: ${meta.pageUrl}`,
      `- License: ${meta.license}`,
      `- File: assets/${meta.filename}`,
      "",
    ].join("\n");

    if (!fs.existsSync(sourcesPath)) {
      fs.writeFileSync(sourcesPath, `# Image Sources\n${block}`, "utf8");
    } else {
      fs.appendFileSync(sourcesPath, block, "utf8");
    }
  }

  /**
   * @param {string} downloadUrl
   */
  async downloadImage(downloadUrl) {
    const response = await this.fetchImpl(downloadUrl);
    if (!response.ok) {
      throw new StockImageError("下载图片失败", "HTTP", { status: response.status });
    }
    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());
    let ext = ".jpg";
    if (contentType.includes("png")) {
      ext = ".png";
    } else if (contentType.includes("webp")) {
      ext = ".webp";
    }
    return { buffer, ext };
  }

  /**
   * @param {{ keyword: string; sessionId?: string; label?: string }} payload
   */
  async searchAndDownload(payload) {
    const candidate = await this.searchCandidate(payload.keyword);
    const sessionId = resolveSessionId(payload.sessionId);
    const assetsDir = getAssetsDir(this.userDataDir, sessionId);
    ensureDir(assetsDir);

    const label = sanitizeLabel(payload.label);
    const { buffer, ext } = await this.downloadImage(candidate.downloadUrl);
    const filename = `${label}-${candidate.provider}${ext}`;
    const destPath = path.join(assetsDir, filename);
    fs.writeFileSync(destPath, buffer);

    this.appendSourceRecord(assetsDir, {
      label,
      provider: candidate.provider,
      author: candidate.author,
      pageUrl: candidate.pageUrl,
      license: candidate.license,
      filename,
      keyword: candidate.keyword,
    });

    return {
      sessionId,
      filename,
      absolutePath: destPath,
      relativePath: `assets/${filename}`,
      provider: candidate.provider,
      author: candidate.author,
      sourceUrl: candidate.pageUrl,
      keyword: candidate.keyword,
    };
  }
}

module.exports = { StockImageService, StockImageError };
