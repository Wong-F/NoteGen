/**
 * Resolve workspace-bound persona and build prompt blocks for AI pipeline steps.
 */

const { PLATFORMS } = require("./personaStoreService");

/**
 * @param {import("./personaStoreService").PersonaStoreService | null | undefined} personaStore
 * @param {string | null | undefined} personaId
 * @returns {import("./personaStoreService").PersonaState | null}
 */
function resolvePersona(personaStore, personaId) {
  const id = personaId?.trim();
  if (!id || !personaStore) {
    return null;
  }
  return personaStore.get(id);
}

/**
 * @param {import("./personaStoreService").PersonaState | null | undefined} persona
 * @returns {string}
 */
function buildPersonaPromptBlock(persona) {
  if (!persona) {
    return "";
  }

  const lines = ["## 运营人设约束（本篇创作必须遵守）"];
  lines.push(`- 人设名称：${persona.name || "未命名"}`);

  const platformLabel = PLATFORMS[persona.platform]?.label;
  if (platformLabel) {
    lines.push(`- 发布平台：${platformLabel}`);
  }
  if (persona.primaryDomain?.trim()) {
    lines.push(`- 主领域：${persona.primaryDomain.trim()}`);
  }
  if (Array.isArray(persona.secondaryDomains) && persona.secondaryDomains.length) {
    lines.push(`- 副领域：${persona.secondaryDomains.join("、")}`);
  }
  if (persona.targetReader?.trim()) {
    lines.push(`- 目标读者：${persona.targetReader.trim()}`);
  }
  if (persona.voiceSummary?.trim()) {
    lines.push(`- 口吻：${persona.voiceSummary.trim()}`);
  }
  if (Array.isArray(persona.taboos) && persona.taboos.length) {
    lines.push(`- 禁忌（不要出现）：${persona.taboos.join("、")}`);
  }
  if (persona.defaultHookLevel) {
    lines.push(`- 标题钩子偏好：Level ${persona.defaultHookLevel}`);
  }
  if (persona.visualAccent?.trim()) {
    lines.push(`- 卡片配色偏好：${persona.visualAccent.trim()}（页面计划 accent 字段优先使用此值）`);
  }

  return lines.join("\n");
}

/**
 * @param {string} content
 * @param {import("./personaStoreService").PersonaState | null | undefined} persona
 * @returns {string}
 */
function appendPersonaBlock(content, persona) {
  const block = buildPersonaPromptBlock(persona);
  if (!block) {
    return content;
  }
  return `${content}\n\n${block}`;
}

module.exports = {
  resolvePersona,
  buildPersonaPromptBlock,
  appendPersonaBlock,
};
