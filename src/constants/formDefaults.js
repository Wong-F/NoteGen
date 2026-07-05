/**
 * Shared default values for persona and workspace idea forms.
 * Pre-fill empty fields so users can start from a sensible template.
 */

const PERSONA_TEMPLATES = {
  xiaohongshu: {
    name: "生活分享号",
    platform: "xiaohongshu",
    primaryDomain: "生活方式",
    secondaryDomains: ["好物分享", "日常记录"],
    targetReader: "20-35 岁、喜欢在小红书找灵感的普通用户",
    voiceSummary: "真实好读，像朋友在分享亲身经验，轻松但不空洞",
    taboos: ["震惊体", "虚构数据", "过度 emoji"],
    defaultHookLevel: 2,
  },
  wechat: {
    name: "深度内容号",
    platform: "wechat",
    primaryDomain: "职场成长",
    secondaryDomains: ["效率方法", "认知升级"],
    targetReader: "25-40 岁、希望获得可操作方法的公众号读者",
    voiceSummary: "有结构、有观点，像同龄人在认真分享方法论",
    taboos: ["震惊体", "虚构数据", "标题党"],
    defaultHookLevel: 2,
  },
};

const IDEA_TEMPLATES = {
  "xiaohongshu-note": {
    keywords: "生活方式, 好物分享",
    targetReader: "20-35 岁、喜欢刷小红书找灵感的用户",
    hookLevel: 2,
  },
  "wechat-article": {
    keywords: "职场成长, 效率提升",
    targetReader: "25-40 岁、愿意读长文的公众号读者",
    hookLevel: 2,
  },
};

/** User-facing title style options (internal field remains hookLevel). */
const TITLE_STYLE_OPTIONS = [
  { level: 1, label: "克制可信" },
  { level: 2, label: "抓人有对比" },
  { level: 3, label: "高张力" },
];

/**
 * @param {string} [platform]
 */
function getPersonaTemplate(platform = "xiaohongshu") {
  const key = PERSONA_TEMPLATES[platform] ? platform : "xiaohongshu";
  return {
    ...PERSONA_TEMPLATES[key],
    secondaryDomains: [...PERSONA_TEMPLATES[key].secondaryDomains],
    taboos: [...PERSONA_TEMPLATES[key].taboos],
  };
}

/**
 * @param {string} [workflowType]
 */
function getDefaultIdeaInput(workflowType = "xiaohongshu-note") {
  const key = IDEA_TEMPLATES[workflowType] ? workflowType : "xiaohongshu-note";
  return { ...IDEA_TEMPLATES[key] };
}

/**
 * @param {{ keywords?: string; targetReader?: string; hookLevel?: number } | null | undefined} partial
 * @param {string} [workflowType]
 */
function fillIdeaInputDefaults(partial, workflowType = "xiaohongshu-note") {
  const defaults = getDefaultIdeaInput(workflowType);
  return {
    keywords: partial?.keywords?.trim() || defaults.keywords,
    targetReader: partial?.targetReader?.trim() || defaults.targetReader,
    hookLevel: partial?.hookLevel ?? defaults.hookLevel,
  };
}

/**
 * @param {{ primaryDomain?: string; secondaryDomains?: string[] }} persona
 * @returns {string}
 */
function buildKeywordsFromPersona(persona) {
  if (!persona) {
    return "";
  }
  const parts = [];
  const primary = persona.primaryDomain?.trim();
  if (primary) {
    parts.push(primary);
  }
  if (Array.isArray(persona.secondaryDomains)) {
    for (const domain of persona.secondaryDomains) {
      const trimmed = String(domain).trim();
      if (trimmed && !parts.includes(trimmed)) {
        parts.push(trimmed);
      }
    }
  }
  return parts.join(", ");
}

/**
 * @param {{ keywords?: string; targetReader?: string; hookLevel?: number }} ideaInput
 * @param {string} [workflowType]
 */
function isIdeaInputAtDefaults(ideaInput, workflowType = "xiaohongshu-note") {
  const defaults = getDefaultIdeaInput(workflowType);
  const keywords = ideaInput?.keywords?.trim() || "";
  const targetReader = ideaInput?.targetReader?.trim() || "";
  const hookLevel = ideaInput?.hookLevel ?? defaults.hookLevel;
  return (
    (!keywords || keywords === defaults.keywords) &&
    (!targetReader || targetReader === defaults.targetReader) &&
    hookLevel === defaults.hookLevel
  );
}

/**
 * @param {number} level
 * @returns {string}
 */
function formatTitleStyleLabel(level) {
  const option = TITLE_STYLE_OPTIONS.find((item) => item.level === level);
  return option ? `标题风格 · ${option.label}` : `标题风格 · ${level}`;
}

/**
 * Merge user seed with platform template (arrays fall back to template when empty).
 * @param {Record<string, unknown>} [seed]
 */
function mergePersonaSeed(seed = {}) {
  const platform =
    typeof seed.platform === "string" && PERSONA_TEMPLATES[seed.platform]
      ? seed.platform
      : "xiaohongshu";
  const template = getPersonaTemplate(platform);
  const secondaryDomains = Array.isArray(seed.secondaryDomains)
    ? seed.secondaryDomains.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const taboos = Array.isArray(seed.taboos)
    ? seed.taboos.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    ...template,
    ...seed,
    platform,
    name: String(seed.name || template.name).trim() || template.name,
    primaryDomain: String(seed.primaryDomain || template.primaryDomain).trim() || template.primaryDomain,
    targetReader: String(seed.targetReader || template.targetReader).trim() || template.targetReader,
    voiceSummary: String(seed.voiceSummary || template.voiceSummary).trim() || template.voiceSummary,
    secondaryDomains: secondaryDomains.length ? secondaryDomains : template.secondaryDomains,
    taboos: taboos.length ? taboos : template.taboos,
    defaultHookLevel: [1, 2, 3].includes(Number(seed.defaultHookLevel))
      ? Number(seed.defaultHookLevel)
      : template.defaultHookLevel,
  };
}

export {
  PERSONA_TEMPLATES,
  IDEA_TEMPLATES,
  TITLE_STYLE_OPTIONS,
  getPersonaTemplate,
  getDefaultIdeaInput,
  fillIdeaInputDefaults,
  buildKeywordsFromPersona,
  isIdeaInputAtDefaults,
  formatTitleStyleLabel,
  mergePersonaSeed,
};
