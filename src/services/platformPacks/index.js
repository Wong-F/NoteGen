/**
 * Platform packs — shared workflow, platform-specific prompts and normalization.
 */

const xiaohongshu = require("./xiaohongshu");
const wechat = require("./wechat");

/** @type {Record<string, typeof xiaohongshu>} */
const PACKS = {
  xiaohongshu,
  wechat,
};

const DEFAULT_PACK = xiaohongshu;

/**
 * @param {{ persona?: { platform?: string } | null; workflowType?: string; platform?: string }} [options]
 */
function resolvePlatformPack(options = {}) {
  const { persona, workflowType, platform } = options;

  if (platform && PACKS[platform]) {
    return PACKS[platform];
  }

  if (persona?.platform && PACKS[persona.platform]) {
    return PACKS[persona.platform];
  }

  if (workflowType === wechat.workflowType) {
    return wechat;
  }

  if (workflowType === xiaohongshu.workflowType) {
    return xiaohongshu;
  }

  return DEFAULT_PACK;
}

/**
 * @param {{ platform?: string } | null | undefined} persona
 * @returns {string}
 */
function workflowTypeForPersona(persona) {
  if (!persona?.platform) {
    return DEFAULT_PACK.workflowType;
  }
  return resolvePlatformPack({ persona }).workflowType;
}

module.exports = {
  PACKS,
  DEFAULT_PACK,
  resolvePlatformPack,
  workflowTypeForPersona,
};
