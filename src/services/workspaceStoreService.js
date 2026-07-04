/**
 * Persist creative workspaces as JSON under userData/workspaces/.
 */

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const DEFAULT_WORKFLOW_TYPE = "xiaohongshu-note";
const RECENT_DISPLAY_LIMIT = 20;

/**
 * @typedef {object} WorkspaceIndexEntry
 * @property {string} id
 * @property {string} title
 * @property {string} workflowType
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string[]} keywords
 * @property {string[]} tags
 */

/**
 * @typedef {object} WorkspaceState
 * @property {string} id
 * @property {string} title
 * @property {string} workflowType
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string | null} sessionId
 * @property {"idea" | "writing" | "images"} activeSection
 * @property {Array<"idea" | "writing" | "images">} completedSections
 * @property {{ keywords: string; targetReader: string; hookLevel: number }} ideaInput
 * @property {Array<object>} generatedTopics
 * @property {object | null} selectedTopic
 * @property {string} styleId
 * @property {{ title: string; body: string; hashtags: string[] } | null} copyDraft
 * @property {object | null} pagePlan
 * @property {Record<string, { absolutePath: string; relativePath: string; source: string }>} pageAssets
 * @property {Array<{ id: string; absolutePath: string }>} renderedImages
 * @property {{ center: number; preview: number; sidebar: number }} scroll
 * @property {string[]} keywords
 * @property {string[]} tags
 */

/**
 * @returns {WorkspaceState}
 */
function createBlankWorkspaceState(id) {
  const now = new Date().toISOString();
  return {
    id,
    title: "未命名创作",
    workflowType: DEFAULT_WORKFLOW_TYPE,
    createdAt: now,
    updatedAt: now,
    sessionId: null,
    activeSection: "idea",
    completedSections: [],
    ideaInput: { keywords: "", targetReader: "", hookLevel: 2 },
    generatedTopics: [],
    selectedTopic: null,
    styleId: "",
    copyDraft: null,
    pagePlan: null,
    pageAssets: {},
    renderedImages: [],
    scroll: { center: 0, preview: 0, sidebar: 0 },
    keywords: [],
    tags: [],
  };
}

/**
 * @param {Partial<WorkspaceState>} partial
 * @returns {string[]}
 */
function extractKeywords(partial) {
  const words = new Set();
  const add = (text) => {
    if (!text || typeof text !== "string") {
      return;
    }
    for (const token of text.split(/[\s,，、#]+/)) {
      const trimmed = token.trim();
      if (trimmed.length >= 2) {
        words.add(trimmed);
      }
    }
  };

  add(partial.title);
  add(partial.ideaInput?.keywords);
  add(partial.selectedTopic?.title);
  add(partial.copyDraft?.title);
  if (Array.isArray(partial.copyDraft?.hashtags)) {
    for (const tag of partial.copyDraft.hashtags) {
      add(tag);
    }
  }
  if (Array.isArray(partial.keywords)) {
    for (const kw of partial.keywords) {
      add(kw);
    }
  }

  return [...words].slice(0, 30);
}

/**
 * @param {WorkspaceState} state
 * @returns {WorkspaceIndexEntry}
 */
function toIndexEntry(state) {
  return {
    id: state.id,
    title: state.title,
    workflowType: state.workflowType,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    keywords: state.keywords || [],
    tags: state.tags || [],
  };
}

class WorkspaceStoreService {
  /** @param {string} userDataDir */
  constructor(userDataDir) {
    this.rootDir = path.join(userDataDir, "workspaces");
    this.indexPath = path.join(this.rootDir, "index.json");
  }

  /** @returns {{ activeWorkspaceId: string | null; workspaces: WorkspaceIndexEntry[] }} */
  readIndex() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.indexPath, "utf8"));
      return {
        activeWorkspaceId: raw.activeWorkspaceId || null,
        workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : [],
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`[noteGen] corrupt workspace index, resetting: ${error.message}`);
      }
      return { activeWorkspaceId: null, workspaces: [] };
    }
  }

  /**
   * @param {{ activeWorkspaceId?: string | null; workspaces: WorkspaceIndexEntry[] }} index
   */
  writeIndex(index) {
    fs.mkdirSync(this.rootDir, { recursive: true });
    const sorted = [...index.workspaces].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    fs.writeFileSync(
      this.indexPath,
      JSON.stringify({ activeWorkspaceId: index.activeWorkspaceId || null, workspaces: sorted }, null, 2),
      "utf8"
    );
  }

  /** @param {string} id */
  workspacePath(id) {
    return path.join(this.rootDir, `${id}.json`);
  }

  /** @param {string} id */
  get(id) {
    try {
      return JSON.parse(fs.readFileSync(this.workspacePath(id), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      console.warn(`[noteGen] corrupt workspace ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * @param {Partial<WorkspaceState>} [seed]
   * @returns {WorkspaceState}
   */
  create(seed) {
    const id = seed?.id || randomUUID();
    const now = new Date().toISOString();
    const state = {
      ...createBlankWorkspaceState(id),
      ...seed,
      id,
      createdAt: seed?.createdAt || now,
      updatedAt: now,
    };
    state.keywords = extractKeywords(state);
    this.save(state);
    return state;
  }

  /**
   * @param {Partial<WorkspaceState> & { id: string }} partial
   * @returns {WorkspaceState}
   */
  save(partial) {
    if (!partial?.id) {
      throw new Error("workspace id is required");
    }

    const existing = this.get(partial.id);
    const now = new Date().toISOString();
    const merged = {
      ...(existing || createBlankWorkspaceState(partial.id)),
      ...partial,
      id: partial.id,
      createdAt: existing?.createdAt || partial.createdAt || now,
      updatedAt: now,
      completedSections: Array.isArray(partial.completedSections)
        ? partial.completedSections
        : existing?.completedSections || [],
      pageAssets: partial.pageAssets ?? existing?.pageAssets ?? {},
      renderedImages: partial.renderedImages ?? existing?.renderedImages ?? [],
      generatedTopics: partial.generatedTopics ?? existing?.generatedTopics ?? [],
      keywords: extractKeywords({ ...existing, ...partial }),
    };

    fs.mkdirSync(this.rootDir, { recursive: true });
    fs.writeFileSync(this.workspacePath(merged.id), JSON.stringify(merged, null, 2), "utf8");

    const index = this.readIndex();
    const entry = toIndexEntry(merged);
    const others = index.workspaces.filter((item) => item.id !== merged.id);
    index.workspaces = [entry, ...others];
    index.activeWorkspaceId = merged.id;
    this.writeIndex(index);

    return merged;
  }

  /**
   * @param {string} id
   * @returns {{ activeWorkspaceId: string | null; deleted: boolean }}
   */
  delete(id) {
    const index = this.readIndex();
    const filePath = this.workspacePath(id);
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    index.workspaces = index.workspaces.filter((item) => item.id !== id);
    if (index.activeWorkspaceId === id) {
      index.activeWorkspaceId = index.workspaces[0]?.id || null;
    }
    this.writeIndex(index);
    return { activeWorkspaceId: index.activeWorkspaceId, deleted: true };
  }

  /**
   * @param {string} id
   * @returns {{ activeWorkspaceId: string }}
   */
  setActive(id) {
    const index = this.readIndex();
    if (!index.workspaces.some((item) => item.id === id)) {
      throw new Error("workspace not found");
    }
    index.activeWorkspaceId = id;
    this.writeIndex(index);
    return { activeWorkspaceId: id };
  }

  /**
   * @param {{ query?: string; limit?: number }} [options]
   * @returns {{ activeWorkspaceId: string | null; workspaces: WorkspaceIndexEntry[] }}
   */
  list(options = {}) {
    const index = this.readIndex();
    const query = options.query?.trim().toLowerCase();
    let workspaces = index.workspaces;

    if (query) {
      workspaces = workspaces.filter((item) => {
        const haystack = [item.title, ...(item.keywords || []), ...(item.tags || [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    const limit = options.limit ?? (query ? undefined : RECENT_DISPLAY_LIMIT);
    if (limit) {
      workspaces = workspaces.slice(0, limit);
    }

    return { activeWorkspaceId: index.activeWorkspaceId, workspaces };
  }
}

module.exports = {
  WorkspaceStoreService,
  createBlankWorkspaceState,
  extractKeywords,
  DEFAULT_WORKFLOW_TYPE,
  RECENT_DISPLAY_LIMIT,
};
