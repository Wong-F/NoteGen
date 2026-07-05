import { appState, notify } from "./appState.js";
import {
  getPersonaTemplate,
  getDefaultIdeaInput,
  fillIdeaInputDefaults,
  buildKeywordsFromPersona,
  isIdeaInputAtDefaults,
} from "../constants/formDefaults.js";

/** @type {Array<{ id: string; name: string; platform: string; primaryDomain: string; createdAt: string; updatedAt: string }>} */
let personaIndex = [];

/** @type {object | null} */
let activePersonaDetail = null;

let initialized = false;

/**
 * @typedef {object} PersonaDetail
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
 */

/**
 * Initialize persona store from disk.
 * @returns {Promise<{ hasPersonas: boolean; activePersonaId: string | null }>}
 */
export async function initPersonaStore() {
  if (!window.noteGen?.invoke) {
    return { hasPersonas: false, activePersonaId: null };
  }

  await refreshPersonaList();
  initialized = true;

  if (personaIndex.length === 0) {
    appState.personaReady = false;
    appState.activePersonaId = null;
    activePersonaDetail = null;
    notify();
    return { hasPersonas: false, activePersonaId: null };
  }

  const list = await window.noteGen.invoke("personas:list", {});
  const activeId = list.activePersonaId;
  if (activeId) {
    await setActivePersona(activeId, { skipPersist: true });
  } else {
    appState.activePersonaId = null;
    activePersonaDetail = null;
    appState.personaReady = false;
    notify();
  }

  return { hasPersonas: true, activePersonaId: appState.activePersonaId };
}

/** @returns {typeof personaIndex} */
export function getPersonaIndex() {
  return personaIndex;
}

/** @returns {PersonaDetail | null} */
export function getActivePersona() {
  return activePersonaDetail;
}

export async function refreshPersonaList() {
  if (!window.noteGen?.invoke) {
    return personaIndex;
  }
  const result = await window.noteGen.invoke("personas:list", {});
  personaIndex = result.personas || [];
  document.dispatchEvent(new CustomEvent("persona:list-updated"));
  return personaIndex;
}

/**
 * @param {string} id
 * @param {{ skipPersist?: boolean }} [options]
 */
export async function setActivePersona(id, options = {}) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  if (!options.skipPersist) {
    await window.noteGen.invoke("personas:setActive", { id });
  }

  const detail = await window.noteGen.invoke("personas:get", { id });
  if (!detail) {
    throw new Error("persona not found");
  }

  appState.activePersonaId = id;
  activePersonaDetail = detail;
  appState.personaReady = true;
  notify();
  document.dispatchEvent(new CustomEvent("persona:activated", { detail: { id } }));
  maybeSyncPersonaToWorkspace(detail);
  return detail;
}

/**
 * Clear active persona selection (workspaces stay independent).
 */
export async function clearActivePersona() {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  await window.noteGen.invoke("personas:clearActive", {});
  appState.activePersonaId = null;
  activePersonaDetail = null;
  appState.personaReady = false;
  notify();
  document.dispatchEvent(new CustomEvent("persona:cleared"));
}

/**
 * @param {Partial<PersonaDetail>} seed
 * @returns {Promise<PersonaDetail>}
 */
export async function createPersona(seed = {}) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  const created = await window.noteGen.invoke("personas:create", seed);
  await window.noteGen.invoke("personas:setActive", { id: created.id });
  await refreshPersonaList();
  await setActivePersona(created.id, { skipPersist: true });
  document.dispatchEvent(new CustomEvent("persona:created", { detail: { id: created.id } }));
  return created;
}

/**
 * @param {Partial<PersonaDetail> & { id: string }} payload
 * @returns {Promise<PersonaDetail>}
 */
export async function savePersona(payload) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  const saved = await window.noteGen.invoke("personas:save", payload);
  await refreshPersonaList();
  if (saved.id === appState.activePersonaId) {
    activePersonaDetail = saved;
    notify();
    maybeSyncPersonaToWorkspace(saved);
  }
  return saved;
}

/**
 * @param {string} id
 */
export async function deletePersona(id) {
  if (!window.noteGen?.invoke) {
    throw new Error("Electron IPC unavailable");
  }

  await window.noteGen.invoke("personas:delete", { id });
  await refreshPersonaList();

  if (appState.activePersonaId === id) {
    if (personaIndex.length > 0) {
      await setActivePersona(personaIndex[0].id);
    } else {
      appState.activePersonaId = null;
      activePersonaDetail = null;
      appState.personaReady = false;
      notify();
      document.dispatchEvent(new CustomEvent("persona:empty"));
    }
  }
}

/**
 * Apply persona defaults to idea input and style when starting a new workspace.
 * @param {{ force?: boolean }} [options]
 * @returns {boolean} whether ideaInput changed
 */
export function applyPersonaDefaultsToWorkspace(options = {}) {
  const persona = activePersonaDetail;
  return syncIdeaInputFromPersona(persona, options);
}

/**
 * Sync persona fields into workspace ideaInput when safe (defaults/empty) or forced.
 * @param {PersonaDetail | null | undefined} persona
 * @param {{ force?: boolean }} [options]
 * @returns {boolean}
 */
export function syncIdeaInputFromPersona(persona, options = {}) {
  if (!persona || !appState.workspaceReady) {
    return false;
  }

  const boundPersonaId = appState.personaId;
  if (boundPersonaId && boundPersonaId !== persona.id) {
    return false;
  }

  const workflowType = appState.workflowType || "xiaohongshu-note";
  const defaults = getDefaultIdeaInput(workflowType);
  const force = Boolean(options.force);
  const atDefaults = isIdeaInputAtDefaults(appState.ideaInput, workflowType);
  if (!force && !atDefaults) {
    return false;
  }

  const ideaInput = { ...fillIdeaInputDefaults(appState.ideaInput, workflowType) };
  let changed = false;

  const personaKeywords = buildKeywordsFromPersona(persona);
  if (
    personaKeywords &&
    (force || !ideaInput.keywords?.trim() || ideaInput.keywords === defaults.keywords)
  ) {
    if (ideaInput.keywords !== personaKeywords) {
      ideaInput.keywords = personaKeywords;
      changed = true;
    }
  }

  if (
    persona.targetReader?.trim() &&
    (force || !ideaInput.targetReader?.trim() || ideaInput.targetReader === defaults.targetReader)
  ) {
    const nextReader = persona.targetReader.trim();
    if (ideaInput.targetReader !== nextReader) {
      ideaInput.targetReader = nextReader;
      changed = true;
    }
  }

  if (
    persona.defaultHookLevel &&
    (force || ideaInput.hookLevel === defaults.hookLevel)
  ) {
    if (ideaInput.hookLevel !== persona.defaultHookLevel) {
      ideaInput.hookLevel = persona.defaultHookLevel;
      changed = true;
    }
  }

  if (!changed) {
    return false;
  }

  appState.ideaInput = ideaInput;
  if (!appState.styleId && persona.defaultStyleId) {
    appState.styleId = persona.defaultStyleId;
  }
  notify();
  document.dispatchEvent(new CustomEvent("persona:idea-synced"));
  return true;
}

/**
 * @param {PersonaDetail | null | undefined} persona
 */
function maybeSyncPersonaToWorkspace(persona) {
  if (!persona || !appState.workspaceReady) {
    return;
  }
  const boundPersonaId = appState.personaId;
  if (boundPersonaId && boundPersonaId !== persona.id) {
    return;
  }
  syncIdeaInputFromPersona(persona);
}

export function isPersonaStoreReady() {
  return initialized;
}
