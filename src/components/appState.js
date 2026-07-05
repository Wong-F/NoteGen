/** Shared workspace state with persistence hooks. */

import {
  getPersonaTemplate,
  getDefaultIdeaInput,
  fillIdeaInputDefaults,
  mergePersonaSeed,
} from "../constants/formDefaults.js";

export const appState = {

  /** @type {string | null} */

  activeWorkspaceId: null,

  /** @type {string | null} */

  sessionId: null,

  /** @type {{ id?: string; title: string; angle: string; targetReader?: string; strategy?: string } | null} */

  selectedTopic: null,

  /** @type {{ keywords: string; targetReader: string; hookLevel: number }} */

  ideaInput: getDefaultIdeaInput("xiaohongshu-note"),

  /** @type {Array<object>} */

  generatedTopics: [],

  /** @type {string} */

  styleId: "",

  /** @type {{ title: string; body: string; summary?: string; sections?: Array<{ heading: string; content: string }>; hashtags?: string[] } | null} */

  copyDraft: null,

  /** @type {{ accent: string; pages: Array<object> } | null} */

  pagePlan: null,

  /** @type {Record<string, { absolutePath: string; relativePath: string; source: string }>} */

  pageAssets: {},

  /** @type {Array<{ id: string; absolutePath: string }>} */

  renderedImages: [],

  /** @type {"idea" | "writing" | "images"} */

  activeSection: "idea",

  /** @type {Set<"idea" | "writing" | "images">} */

  completedSections: new Set(),

  /** @type {{ center: number; preview: number; sidebar: number }} */

  scroll: { center: 0, preview: 0, sidebar: 0 },

  /** @type {string} */

  workspaceTitle: "未命名创作",

  /** @type {string} */

  workflowType: "xiaohongshu-note",

  /** @type {string | null} */

  activePersonaId: null,

  /** @type {string | null} */

  personaId: null,

  /** @type {boolean} */

  personaReady: false,

  /** @type {boolean} */

  workspaceReady: false,

  /** @type {Array<() => void>} */

  _listeners: [],

};



/**

 * @returns {string}

 */

export function ensureSessionId() {

  if (!appState.sessionId) {

    appState.sessionId = crypto.randomUUID();

  }

  return appState.sessionId;

}



/** @param {() => void} fn */

export function subscribe(fn) {

  appState._listeners.push(fn);

  return () => {

    const idx = appState._listeners.indexOf(fn);

    if (idx >= 0) {

      appState._listeners.splice(idx, 1);

    }

  };

}



export function notify() {

  for (const fn of appState._listeners) {

    fn();

  }

}



/** @param {"idea" | "writing" | "images"} section */

export function setActiveSection(section) {

  appState.activeSection = section;

  notify();

}



/** @param {"idea" | "writing" | "images"} section */

export function markSectionDone(section) {

  appState.completedSections.add(section);

  notify();

}



/** @param {"idea" | "writing" | "images"} section */

export function isSectionDone(section) {

  return appState.completedSections.has(section);

}



/**

 * @param {"idea" | "writing" | "images"} section

 * @returns {string}

 */

export function getSectionSummary(section) {

  if (section === "idea" && appState.selectedTopic) {

    return appState.selectedTopic.title;

  }

  if (section === "writing" && appState.copyDraft) {

    return appState.copyDraft.title;

  }

  if (section === "images" && appState.renderedImages.length > 0) {

    return `${appState.renderedImages.length} 张图片`;

  }

  return "";

}



/**

 * @returns {string}

 */

export function deriveWorkspaceTitle() {

  if (appState.copyDraft?.title?.trim()) {

    return appState.copyDraft.title.trim();

  }

  if (appState.selectedTopic?.title?.trim()) {

    return appState.selectedTopic.title.trim();

  }

  if (appState.ideaInput.keywords?.trim()) {

    return appState.ideaInput.keywords.trim();

  }

  return appState.workspaceTitle || "未命名创作";

}



/** Reset in-memory state to a blank creative session. */

export function resetAppState() {

  appState.activeWorkspaceId = null;

  appState.personaId = null;

  appState.sessionId = null;

  appState.selectedTopic = null;

  appState.ideaInput = getDefaultIdeaInput("xiaohongshu-note");

  appState.generatedTopics = [];

  appState.styleId = "";

  appState.copyDraft = null;

  appState.pagePlan = null;

  appState.pageAssets = {};

  appState.renderedImages = [];

  appState.activeSection = "idea";

  appState.completedSections = new Set();

  appState.scroll = { center: 0, preview: 0, sidebar: 0 };

  appState.workspaceTitle = "未命名创作";

  appState.workflowType = "xiaohongshu-note";

  appState.personaReady = false;

  appState.workspaceReady = false;

}



/**

 * Hydrate appState from a persisted workspace record.

 * @param {object} workspace

 */

export function hydrateFromWorkspace(workspace) {

  appState.activeWorkspaceId = workspace.id;

  appState.personaId = workspace.personaId || null;

  appState.sessionId = workspace.sessionId || null;

  appState.selectedTopic = workspace.selectedTopic || null;

  appState.ideaInput = fillIdeaInputDefaults(
    workspace.ideaInput,
    workspace.workflowType || "xiaohongshu-note"
  );

  appState.generatedTopics = workspace.generatedTopics || [];

  appState.styleId = workspace.styleId || "";

  appState.copyDraft = workspace.copyDraft || null;

  appState.pagePlan = workspace.pagePlan || null;

  appState.pageAssets = workspace.pageAssets || {};

  appState.renderedImages = workspace.renderedImages || [];

  appState.activeSection = workspace.activeSection || "idea";

  appState.completedSections = new Set(workspace.completedSections || []);

  appState.scroll = workspace.scroll || { center: 0, preview: 0, sidebar: 0 };

  appState.workspaceTitle = workspace.title || "未命名创作";

  appState.workflowType = workspace.workflowType || "xiaohongshu-note";

  appState.workspaceReady = true;

}



/**

 * Snapshot current appState for persistence.

 * @returns {object}

 */

export function snapshotWorkspace() {

  if (!appState.activeWorkspaceId) {

    return null;

  }

  return {

    id: appState.activeWorkspaceId,

    title: deriveWorkspaceTitle(),

    workflowType: appState.workflowType || "xiaohongshu-note",

    personaId: appState.personaId ?? null,

    sessionId: appState.sessionId,

    activeSection: appState.activeSection,

    completedSections: [...appState.completedSections],

    ideaInput: { ...appState.ideaInput },

    generatedTopics: appState.generatedTopics,

    selectedTopic: appState.selectedTopic,

    styleId: appState.styleId,

    copyDraft: appState.copyDraft
      ? {
          ...appState.copyDraft,
          hashtags: [...(appState.copyDraft.hashtags || [])],
          sections: (appState.copyDraft.sections || []).map((section) => ({ ...section })),
        }
      : null,

    pagePlan: appState.pagePlan,

    pageAssets: { ...appState.pageAssets },

    renderedImages: appState.renderedImages.map((img) => ({ ...img })),

    scroll: { ...appState.scroll },

  };

}

