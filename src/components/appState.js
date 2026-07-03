/** Shared workspace state (draftStore persistence is a separate future task). */
export const appState = {
  /** @type {string | null} */
  sessionId: null,
  /** @type {{ id?: string; title: string; angle: string; targetReader?: string; strategy?: string } | null} */
  selectedTopic: null,
  /** @type {{ title: string; body: string; hashtags: string[] } | null} */
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
