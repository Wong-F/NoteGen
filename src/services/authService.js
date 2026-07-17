/**
 * Key activation auth against the AI key distribution platform.
 * Persists session locally; retries activation when cached credentials expire.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

/** Skip common virtual / tunnel adapters on Windows and elsewhere. */
const VIRTUAL_INTERFACE_RE =
  /virtual|vmware|virtualbox|vethernet|hyper-v|wsl|tap|tun|vpn|loopback|npcap|bluetooth|tailscale|zerotier|wireguard|ppp|docker|bridge/i;
const ETHERNET_INTERFACE_RE = /ethernet|以太网|^eth/i;
const WIFI_INTERFACE_RE = /wi-?fi|wlan|wireless|无线/i;

/**
 * @param {string} mac
 * @returns {string}
 */
function formatMacAddress(mac) {
  return String(mac || "")
    .replace(/[^0-9a-f]/gi, "")
    .toUpperCase();
}

/**
 * @param {string} mac
 * @returns {boolean}
 */
function isUsableMac(mac) {
  const normalized = formatMacAddress(mac);
  if (normalized.length !== 12) {
    return false;
  }
  if (normalized === "000000000000" || normalized === "FFFFFFFFFFFF") {
    return false;
  }
  return true;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isVirtualInterfaceName(name) {
  return VIRTUAL_INTERFACE_RE.test(String(name || ""));
}

/**
 * Lower score = higher priority. Ethernet first, then Wi-Fi, then others.
 * @param {string} name
 * @returns {number}
 */
function interfacePriority(name) {
  if (ETHERNET_INTERFACE_RE.test(name)) {
    return 0;
  }
  if (WIFI_INTERFACE_RE.test(name)) {
    return 1;
  }
  return 2;
}

/**
 * Pick the MAC of the best physical adapter (AABBCCDDEEFF).
 * @param {NodeJS.Dict<import("node:os").NetworkInterfaceInfo[]>} [networkInterfaces]
 * @returns {string | null}
 */
function resolvePhysicalMacAddress(networkInterfaces = os.networkInterfaces()) {
  /** @type {{ name: string; mac: string; priority: number }[]} */
  const candidates = [];

  for (const [name, addrs] of Object.entries(networkInterfaces || {})) {
    if (isVirtualInterfaceName(name)) {
      continue;
    }

    for (const addr of addrs || []) {
      if (addr.internal) {
        continue;
      }

      const mac = formatMacAddress(addr.mac);
      if (!isUsableMac(mac)) {
        continue;
      }

      candidates.push({ name, mac, priority: interfacePriority(name) });
    }
  }

  const bestByMac = new Map();
  for (const candidate of candidates) {
    const existing = bestByMac.get(candidate.mac);
    if (!existing || candidate.priority < existing.priority) {
      bestByMac.set(candidate.mac, candidate);
    }
  }

  const sorted = [...bestByMac.values()].sort((a, b) => a.priority - b.priority);
  return sorted[0]?.mac || null;
}

const API_BASE = "http://sit.xslq.work/sit/interface/api";
const ACTIVATE_PATH = "/publickey/normaltoken";
const SCRIPT_TYPE = "noteGen";
const DEV_BYPASS_PHONE = "13164150732";

/** @type {Record<string, string>} */
const ERROR_MSG_MAP = {
  "未能获取手机、脚本基础信息,请确认": "请填写完整信息",
  密钥非法: "密钥无效",
  "脚本类型错误,请核对": "脚本类型不匹配",
  绑定的手机号不一致: "请使用绑定时的手机号",
  该激活码已在其它设备绑定: "请到原设备使用，或联系客服解绑",
  "已过期,请续期": "密钥已过期，请联系管理员续期",
};

/**
 * @typedef {Object} AuthSession
 * @property {string} phone
 * @property {string} secret
 * @property {string} script
 * @property {string} imei
 * @property {number} aipoint
 * @property {string} activeDate
 * @property {string} expireDate
 * @property {string} loggedInAt
 * @property {boolean} [devBypass]
 */

class AuthService {
  /**
   * @param {string} userDataDir
   * @param {{ isDev?: boolean; fetchFn?: typeof fetch; networkInterfacesFn?: typeof os.networkInterfaces }} [options]
   */
  constructor(userDataDir, options = {}) {
    this.userDataDir = userDataDir;
    this.isDev = Boolean(options.isDev);
    this.fetchFn = options.fetchFn || fetch;
    this.networkInterfacesFn = options.networkInterfacesFn || os.networkInterfaces;
    this.sessionPath = path.join(userDataDir, "auth-session.json");
    this.deviceIdPath = path.join(userDataDir, "device-id.json");
    this.credentialsPath = path.join(userDataDir, "saved-credentials.json");
  }

  /** @returns {string} Device id sent as API `imei` (physical MAC, AABBCCDDEEFF). */
  getDeviceId() {
    try {
      const stored = JSON.parse(fs.readFileSync(this.deviceIdPath, "utf8"));
      if (stored?.id?.trim()) {
        return stored.id.trim();
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] failed to read device id: ${error.message}`);
      }
    }

    const mac = resolvePhysicalMacAddress(this.networkInterfacesFn());
    const id = mac || randomUUID();
    if (!mac) {
      console.warn("[noteGen] no physical MAC found, falling back to UUID device id");
    }

    fs.mkdirSync(this.userDataDir, { recursive: true });
    fs.writeFileSync(this.deviceIdPath, JSON.stringify({ id }, null, 2), "utf8");
    return id;
  }

  /**
   * @param {string} msg
   * @returns {string}
   */
  mapErrorMessage(msg) {
    const trimmed = String(msg || "").trim();
    return ERROR_MSG_MAP[trimmed] || trimmed || "登录失败，请稍后重试";
  }

  /**
   * @param {string} expireDate
   * @returns {boolean}
   */
  isExpired(expireDate) {
    const parsed = Date.parse(String(expireDate || "").replace(" ", "T"));
    if (Number.isNaN(parsed)) {
      return true;
    }
    return parsed <= Date.now();
  }

  /** @returns {AuthSession | null} */
  readStoredSession() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.sessionPath, "utf8"));
      if (!raw?.phone) {
        return null;
      }
      return raw;
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] failed to read auth session: ${error.message}`);
      }
      return null;
    }
  }

  /** @param {AuthSession} session */
  writeSession(session) {
    fs.mkdirSync(this.userDataDir, { recursive: true });
    fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2), "utf8");
  }

  clearSession() {
    try {
      fs.unlinkSync(this.sessionPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] failed to clear auth session: ${error.message}`);
      }
    }
  }

  /**
   * @param {string} phone
   * @param {string} secret
   * @returns {Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }>}
   */
  async activate(phone, secret) {
    const normalizedPhone = String(phone || "").trim();
    const normalizedSecret = String(secret || "").trim();

    if (this.isDev && normalizedPhone === DEV_BYPASS_PHONE) {
      const now = new Date();
      const expire = new Date(now);
      expire.setFullYear(expire.getFullYear() + 1);
      const format = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;

      const session = {
        phone: normalizedPhone,
        secret: normalizedSecret || "dev-bypass",
        script: SCRIPT_TYPE,
        imei: this.getDeviceId(),
        aipoint: 99999,
        activeDate: format(now),
        expireDate: format(expire),
        loggedInAt: now.toISOString(),
        devBypass: true,
      };
      this.writeSession(session);
      return { ok: true, session };
    }

    if (!normalizedPhone || !normalizedSecret) {
      return { ok: false, error: "请填写完整信息" };
    }

    const imei = this.getDeviceId();
    let response;
    try {
      response = await this.fetchFn(`${API_BASE}${ACTIVATE_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          secret: normalizedSecret,
          imei,
          script: SCRIPT_TYPE,
        }),
      });
    } catch (error) {
      return { ok: false, error: `网络连接失败：${error.message}` };
    }

    let body;
    try {
      body = await response.json();
    } catch {
      return { ok: false, error: "服务器响应异常，请稍后重试" };
    }

    if (body?.code !== 200 || !body?.data) {
      return { ok: false, error: this.mapErrorMessage(body?.msg) };
    }

    const session = {
      phone: body.data.phone || normalizedPhone,
      secret: body.data.secret || normalizedSecret,
      script: body.data.script || SCRIPT_TYPE,
      imei: body.data.imei || imei,
      aipoint: Number(body.data.aipoint) || 0,
      activeDate: body.data.activeDate || "",
      expireDate: body.data.expireDate || "",
      loggedInAt: new Date().toISOString(),
      devBypass: false,
    };
    this.writeSession(session);
    return { ok: true, session };
  }

  /** @returns {{ phone: string; secret: string } | null} */
  readSavedCredentials() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.credentialsPath, "utf8"));
      const phone = String(raw?.phone || "").trim();
      const secret = String(raw?.secret || "").trim();
      if (!phone) {
        return null;
      }
      return { phone, secret };
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] failed to read saved credentials: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * @param {string} phone
   * @param {string} secret
   */
  saveCredentials(phone, secret) {
    fs.mkdirSync(this.userDataDir, { recursive: true });
    fs.writeFileSync(
      this.credentialsPath,
      JSON.stringify(
        { phone: String(phone || "").trim(), secret: String(secret || "").trim() },
        null,
        2
      ),
      "utf8"
    );
  }

  clearCredentials() {
    try {
      fs.unlinkSync(this.credentialsPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] failed to clear saved credentials: ${error.message}`);
      }
    }
  }

  /**
   * @param {{ phone: string; secret: string; remember?: boolean }} payload
   * @returns {Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }>}
   */
  async login(payload) {
    const result = await this.activate(payload?.phone, payload?.secret);
    if (result.ok && payload && "remember" in payload) {
      if (payload.remember) {
        this.saveCredentials(payload.phone, payload.secret);
      } else {
        this.clearCredentials();
      }
    }
    return result;
  }

  /**
   * Returns a valid session, re-activating with cached credentials when expired.
   * @returns {Promise<{ session: AuthSession | null; renewed?: boolean; error?: string }>}
   */
  async getSession() {
    const stored = this.readStoredSession();
    if (!stored) {
      return { session: null };
    }

    if (!this.isExpired(stored.expireDate)) {
      return { session: stored };
    }

    if (!stored.phone || !stored.secret) {
      this.clearSession();
      return { session: null, error: "会话已过期，请重新登录" };
    }

    const result = await this.activate(stored.phone, stored.secret);
    if (!result.ok) {
      this.clearSession();
      return { session: null, error: result.error };
    }
    return { session: result.session, renewed: true };
  }

  /** @returns {{ ok: true }} */
  logout() {
    this.clearSession();
    return { ok: true };
  }

  /**
   * Public profile summary for settings UI.
   * @param {AuthSession | null} session
   */
  toUserProfile(session) {
    if (!session) {
      return null;
    }

    const expired = this.isExpired(session.expireDate);
    return {
      phone: session.phone,
      aipoint: session.aipoint,
      script: session.script,
      activeDate: session.activeDate,
      expireDate: session.expireDate,
      subscriptionStatus: expired ? "expired" : "active",
      subscriptionLabel: expired ? "已过期" : "有效",
      devBypass: Boolean(session.devBypass),
    };
  }
}

module.exports = {
  AuthService,
  API_BASE,
  SCRIPT_TYPE,
  DEV_BYPASS_PHONE,
  ERROR_MSG_MAP,
  formatMacAddress,
  resolvePhysicalMacAddress,
};
