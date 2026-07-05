import {
  appState,
  subscribe,
  snapshotWorkspace,
  hydrateFromWorkspace,
  resetAppState,
  deriveWorkspaceTitle,
  notify,
} from "./appState.js";
import { getActivePersona, applyPersonaDefaultsToWorkspace } from "./personaStore.js";
import { getDefaultIdeaInput } from "../constants/formDefaults.js";
import { maybeStartFirstWorkspaceTour } from "./onboardingTour.js";

/** @type {ReturnType<typeof setTimeout> | null} */
let saveTimer = null;

/** @type {Array<{ id: string; title: string; workflowType: string; createdAt: string; updatedAt: string; keywords: string[]; tags: string[] }>} */
let workspaceIndex = [];

let initialized = false;
let saveSuspended = false;

const SAVE_DEBOUNCE_MS = 400;
const SCROLL_DEBOUNCE_MS = 200;

/** @type {ReturnType<typeof setTimeout> | null} */
let scrollTimer = null;

/**
 * Initialize workspace store: load list, restore active or show empty state.
 * @returns {Promise<{ hasWorkspaces: boolean; activeWorkspaceId: string | null }>}
 */
export async function initWorkspaceStore() {
  if (!window.noteGen?.invoke) {
    return { hasWorkspaces: false, activeWorkspaceId: null };
  }

  const list = await window.noteGen.invoke("workspaces:list", {});
  workspaceIndex = list.workspaces || [];

  if (list.activeWorkspaceId) {
    const workspace = await window.noteGen.invoke("workspaces:get", { id: list.activeWorkspaceId });
    if (workspace) {
      activateWorkspaceState(workspace);
      initialized = true;
      bindAutoSave();
      return { hasWorkspaces: true, activeWorkspaceId: workspace.id };
    }
  }

  if (workspaceIndex.length > 0) {
    return switchWorkspace(workspaceIndex[0].id);
  }

  initialized = true;
  bindAutoSave();
  return { hasWorkspaces: false, activeWorkspaceId: null };
}

/** @param {object} workspace */
function activateWorkspaceState(workspace) {
  saveSuspended = true;
  document.dispatchEvent(new CustomEvent("workspace:hydrating"));
  hydrateFromWorkspace(workspace);
  notify();
  restoreScrollPositions();
  saveSuspended = false;
  document.dispatchEvent(new CustomEvent("workspace:activated"));
}

function bindAutoSave() {
  if (bindAutoSave._bound) {
    return;
  }
  bindAutoSave._bound = true;

  subscribe(() => {
    if (!initialized || !appState.activeWorkspaceId || saveSuspended) {
      return;
    }
    scheduleSave();
  });

  requestAnimationFrame(() => bindScrollCapture());
}

function bindScrollCapture() {
  const center = document.querySelector(".layout-center");
  const preview = document.querySelector(".layout-preview");
  const sidebar = document.querySelector(".layout-sidebar");

  const onScroll = () => {
    if (!appState.activeWorkspaceId) {
      return;
    }
    if (center) {
      appState.scroll.center = center.scrollTop;
    }
    if (preview) {
      appState.scroll.preview = preview.scrollTop;
    }
    if (sidebar) {
      appState.scroll.sidebar = sidebar.scrollTop;
    }
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(() => scheduleSave(true), SCROLL_DEBOUNCE_MS);
  };

  for (const el of [center, preview, sidebar]) {
    if (el) {
      el.addEventListener("scroll", onScroll, { passive: true });
    }
  }
}

/**
 * @param {boolean} [immediate]
 */
function scheduleSave(immediate = false) {
  if (!appState.activeWorkspaceId || !window.noteGen?.invoke) {
    return;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  const run = async () => {
    const payload = snapshotWorkspace();
    if (!payload) {
      return;
    }
    try {
      const saved = await window.noteGen.invoke("workspaces:save", payload);
      appState.workspaceTitle = saved.title;
      await refreshWorkspaceList();
    } catch (error) {
      console.warn("[noteGen] workspace save failed:", error);
    }
  };

  if (immediate) {
    run();
  } else {
    saveTimer = setTimeout(run, SAVE_DEBOUNCE_MS);
  }
}

/** Flush pending save immediately (e.g. before switch). */
export async function flushWorkspaceSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!appState.activeWorkspaceId) {
    return;
  }
  const payload = snapshotWorkspace();
  if (!payload || !window.noteGen?.invoke) {
    return;
  }
  const saved = await window.noteGen.invoke("workspaces:save", payload);
  appState.workspaceTitle = saved.title;
  await refreshWorkspaceList();
}

/**
 * @param {{ usePersona?: boolean }} [options]
 * @returns {Promise<{ id: string }>}
 */
export async function createWorkspace(options = {}) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  const usePersona = Boolean(options.usePersona);
  if (usePersona && !appState.activePersonaId) {
    throw new Error("请先选择运营人设");
  }

  await flushWorkspaceSave();

  const created = await window.noteGen.invoke("workspaces:create", {
    personaId: usePersona ? appState.activePersonaId : null,
  });
  activateWorkspaceState(created);
  if (usePersona) {
    applyPersonaDefaultsToWorkspace();
  } else {
    appState.ideaInput = getDefaultIdeaInput(appState.workflowType);
  }
  notify();
  scheduleSave(true);
  await refreshWorkspaceList();
  maybeStartFirstWorkspaceTour();
  return { id: created.id };
}

/**
 * @param {string} id
 */
export async function switchWorkspace(id) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }
  if (appState.activeWorkspaceId === id) {
    return { hasWorkspaces: true, activeWorkspaceId: id };
  }

  await flushWorkspaceSave();

  const workspace = await window.noteGen.invoke("workspaces:get", { id });
  if (!workspace) {
    throw new Error("workspace not found");
  }

  await window.noteGen.invoke("workspaces:setActive", { id });
  activateWorkspaceState(workspace);
  await refreshWorkspaceList();
  return { hasWorkspaces: true, activeWorkspaceId: id };
}

/**
 * @param {string} id
 */
export async function deleteWorkspace(id) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  const wasActive = appState.activeWorkspaceId === id;
  if (wasActive) {
    saveSuspended = true;
    resetAppState();
    notify();
  }

  const result = await window.noteGen.invoke("workspaces:delete", { id });
  await refreshWorkspaceList();

  if (wasActive && result.activeWorkspaceId) {
    return switchWorkspace(result.activeWorkspaceId);
  }
  if (wasActive) {
    saveSuspended = false;
    resetAppState();
    notify();
    document.dispatchEvent(new CustomEvent("workspace:empty"));
    return { hasWorkspaces: false, activeWorkspaceId: null };
  }
  return { hasWorkspaces: workspaceIndex.length > 0, activeWorkspaceId: appState.activeWorkspaceId };
}

/**
 * @param {string} title
 */
export async function renameWorkspace(title) {
  if (!appState.activeWorkspaceId) {
    return;
  }
  appState.workspaceTitle = title.trim() || "未命名创作";
  notify();
  scheduleSave(true);
}

/**
 * @param {string} query
 * @returns {Promise<typeof workspaceIndex>}
 */
export async function searchWorkspaces(query) {
  if (!window.noteGen?.invoke) {
    return workspaceIndex;
  }
  const result = await window.noteGen.invoke("workspaces:list", { query: query.trim() });
  return result.workspaces || [];
}

/** @returns {typeof workspaceIndex} */
export function getWorkspaceIndex() {
  return workspaceIndex;
}

export async function refreshWorkspaceList() {
  if (!window.noteGen?.invoke) {
    return workspaceIndex;
  }
  const result = await window.noteGen.invoke("workspaces:list", {});
  workspaceIndex = result.workspaces || [];
  document.dispatchEvent(new CustomEvent("workspace:list-updated"));
  return workspaceIndex;
}

/**
 * Rebind active workspace to a persona, or null to unbind.
 * @param {string | null} personaId
 */
export async function rebindActiveWorkspacePersona(personaId) {
  if (!appState.activeWorkspaceId || !window.noteGen?.invoke) {
    return;
  }
  await flushWorkspaceSave();
  const rebound = await window.noteGen.invoke("workspaces:rebindPersona", {
    id: appState.activeWorkspaceId,
    personaId,
  });
  appState.personaId = rebound.personaId;
  if (rebound.workflowType) {
    appState.workflowType = rebound.workflowType;
  }
  await refreshWorkspaceList();
  notify();
}

/** Mark AI generation complete — save immediately. */
export function saveWorkspaceNow() {
  scheduleSave(true);
}

export function restoreScrollPositions() {
  requestAnimationFrame(() => {
    const center = document.querySelector(".layout-center");
    const preview = document.querySelector(".layout-preview");
    const sidebar = document.querySelector(".layout-sidebar");
    if (center) {
      center.scrollTop = appState.scroll.center || 0;
    }
    if (preview) {
      preview.scrollTop = appState.scroll.preview || 0;
    }
    if (sidebar) {
      sidebar.scrollTop = appState.scroll.sidebar || 0;
    }
  });
}

export { deriveWorkspaceTitle };
