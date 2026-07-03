/** Shared wizard state (Stage 5 will persist to draftStore). */
export const appState = {
  /** @type {string | null} */
  sessionId: null,
  /** @type {{ id?: string; title: string; angle: string; targetReader?: string } | null} */
  selectedTopic: null,
  /** @type {{ title: string; body: string; hashtags: string[] } | null} */
  copyDraft: null,
  /** @type {{ accent: string; pages: Array<object> } | null} */
  pagePlan: null,
  /** @type {Record<string, { absolutePath: string; relativePath: string; source: string }>} */
  pageAssets: {},
  /** @type {Array<{ id: string; absolutePath: string }>} */
  renderedImages: [],
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
