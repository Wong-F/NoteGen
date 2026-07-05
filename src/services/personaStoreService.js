/**
 * Persist creator personas (运营人设) as JSON under userData/personas/.
 */

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { getPersonaTemplate, mergePersonaSeed } = require("../constants/formDefaults.cjs");

const PLATFORMS = {
  xiaohongshu: { id: "xiaohongshu", label: "小红书" },
  wechat: { id: "wechat", label: "微信公众号" },
};

const DEFAULT_PLATFORM = "xiaohongshu";
const DEFAULT_HOOK_LEVEL = 2;
const DEFAULT_VISUAL_ACCENT = "ikb";

/**
 * @typedef {object} PersonaIndexEntry
 * @property {string} id
 * @property {string} name
 * @property {string} platform
 * @property {string} primaryDomain
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {object} PersonaState
 * @property {string} id
 * @property {string} name
 * @property {string} platform
 * @property {string} primaryDomain
 * @property {string[]} secondaryDomains
 * @property {string} targetReader
 * @property {string} voiceSummary
 * @property {string[]} taboos
 * @property {string} defaultStyleId
 * @property {number} defaultHookLevel
 * @property {string} visualAccent
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {string} id
 * @returns {PersonaState}
 */
function createBlankPersonaState(id) {
  const now = new Date().toISOString();
  const template = getPersonaTemplate(DEFAULT_PLATFORM);
  return {
    id,
    name: template.name,
    platform: template.platform,
    primaryDomain: template.primaryDomain,
    secondaryDomains: [...template.secondaryDomains],
    targetReader: template.targetReader,
    voiceSummary: template.voiceSummary,
    taboos: [...template.taboos],
    defaultStyleId: "",
    defaultHookLevel: template.defaultHookLevel,
    visualAccent: DEFAULT_VISUAL_ACCENT,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * @param {Partial<PersonaState>} partial
 * @returns {PersonaState}
 */
function normalizePersona(partial, existing) {
  const now = new Date().toISOString();
  const base = existing || createBlankPersonaState(partial.id || randomUUID());
  const platform = PLATFORMS[partial.platform] ? partial.platform : base.platform;

  return {
    ...base,
    ...partial,
    id: partial.id || base.id,
    platform,
    secondaryDomains: Array.isArray(partial.secondaryDomains)
      ? partial.secondaryDomains.map((item) => String(item).trim()).filter(Boolean)
      : base.secondaryDomains,
    taboos: Array.isArray(partial.taboos)
      ? partial.taboos.map((item) => String(item).trim()).filter(Boolean)
      : base.taboos,
    defaultHookLevel: [1, 2, 3].includes(Number(partial.defaultHookLevel))
      ? Number(partial.defaultHookLevel)
      : base.defaultHookLevel,
    createdAt: base.createdAt,
    updatedAt: now,
  };
}

/**
 * @param {PersonaState} state
 * @returns {PersonaIndexEntry}
 */
function toIndexEntry(state) {
  return {
    id: state.id,
    name: state.name,
    platform: state.platform,
    primaryDomain: state.primaryDomain || "",
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

class PersonaStoreService {
  /** @param {string} userDataDir */
  constructor(userDataDir) {
    this.rootDir = path.join(userDataDir, "personas");
    this.indexPath = path.join(this.rootDir, "index.json");
  }

  /** @returns {{ activePersonaId: string | null; personas: PersonaIndexEntry[] }} */
  readIndex() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.indexPath, "utf8"));
      return {
        activePersonaId: raw.activePersonaId || null,
        personas: Array.isArray(raw.personas) ? raw.personas : [],
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] corrupt persona index, resetting: ${error.message}`);
      }
      return { activePersonaId: null, personas: [] };
    }
  }

  /**
   * @param {{ activePersonaId?: string | null; personas: PersonaIndexEntry[] }} index
   */
  writeIndex(index) {
    fs.mkdirSync(this.rootDir, { recursive: true });
    const sorted = [...index.personas].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    fs.writeFileSync(
      this.indexPath,
      JSON.stringify({ activePersonaId: index.activePersonaId || null, personas: sorted }, null, 2),
      "utf8"
    );
  }

  /** @param {string} id */
  personaPath(id) {
    return path.join(this.rootDir, `${id}.json`);
  }

  /** @param {string} id */
  get(id) {
    try {
      return JSON.parse(fs.readFileSync(this.personaPath(id), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      console.warn(`[noteGen] corrupt persona ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {Partial<PersonaState>} [seed]
   * @returns {PersonaState}
   */
  create(seed = {}) {
    const id = seed?.id || randomUUID();
    const mergedSeed = mergePersonaSeed({ ...seed, id });
    const state = normalizePersona(mergedSeed, null);
    this.save(state);
    return state;
  }

  /**
   * @param {Partial<PersonaState> & { id: string }} partial
   * @returns {PersonaState}
   */
  save(partial) {
    if (!partial?.id) {
      throw new Error("persona id is required");
    }

    const existing = this.get(partial.id);
    const merged = normalizePersona(partial, existing || createBlankPersonaState(partial.id));

    fs.mkdirSync(this.rootDir, { recursive: true });
    fs.writeFileSync(this.personaPath(merged.id), JSON.stringify(merged, null, 2), "utf8");

    const index = this.readIndex();
    const entry = toIndexEntry(merged);
    const others = index.personas.filter((item) => item.id !== merged.id);
    index.personas = [entry, ...others];
    if (!index.activePersonaId) {
      index.activePersonaId = merged.id;
    }
    this.writeIndex(index);

    return merged;
  }

  /**
   * @param {string} id
   * @param {{ workspaceStoreService?: import("./workspaceStoreService").WorkspaceStoreService }} [options]
   * @returns {{ activePersonaId: string | null; deleted: boolean }}
   */
  delete(id, options = {}) {
    const index = this.readIndex();
    const workspaceStore = options.workspaceStoreService;

    if (workspaceStore) {
      const linked = workspaceStore.list({ personaId: id, limit: 1 }).workspaces.length;
      if (linked > 0) {
        throw new Error("该运营人设下仍有创作，请先删除或改绑后再删除人设");
      }
    }

    try {
      fs.unlinkSync(this.personaPath(id));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    index.personas = index.personas.filter((item) => item.id !== id);
    if (index.activePersonaId === id) {
      index.activePersonaId = index.personas[0]?.id || null;
    }
    this.writeIndex(index);
    return { activePersonaId: index.activePersonaId, deleted: true };
  }

  /**
   * @param {string} id
   * @returns {{ activePersonaId: string }}
   */
  setActive(id) {
    const index = this.readIndex();
    if (!index.personas.some((item) => item.id === id)) {
      throw new Error("persona not found");
    }
    index.activePersonaId = id;
    this.writeIndex(index);
    return { activePersonaId: id };
  }

  /**
   * @returns {{ activePersonaId: string | null }}
   */
  clearActive() {
    const index = this.readIndex();
    index.activePersonaId = null;
    this.writeIndex(index);
    return { activePersonaId: null };
  }

  /**
   * @returns {{ activePersonaId: string | null; personas: PersonaIndexEntry[] }}
   */
  list() {
    return this.readIndex();
  }

  /**
   * Ensure at least one persona exists (not called automatically — UI drives onboarding).
   * @returns {{ created: boolean; persona: PersonaState | null }}
   */
  ensureDefault() {
    const index = this.readIndex();
    if (index.personas.length > 0) {
      return { created: false, persona: this.get(index.activePersonaId || index.personas[0].id) };
    }
    const persona = this.create({
      name: "我的小红书号",
      primaryDomain: "",
      voiceSummary: "",
    });
    return { created: true, persona };
  }
}

module.exports = {
  PersonaStoreService,
  createBlankPersonaState,
  normalizePersona,
  PLATFORMS,
  DEFAULT_PLATFORM,
  DEFAULT_HOOK_LEVEL,
  DEFAULT_VISUAL_ACCENT,
};
