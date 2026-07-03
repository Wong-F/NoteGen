/**
 * Load prompt YAML assets and render {{VAR}} placeholders.
 * Parser covers the flat scalar + multiline `template: |` shape used in prompts/.
 */

const fs = require("node:fs");
const path = require("node:path");

/** @type {Record<number, { level: number; label: string; description: string }>} */
const HOOK_LEVELS = {
  1: { level: 1, label: "restrained", description: "克制、可信" },
  2: { level: 2, label: "punchy", description: "抓人、有对比" },
  3: { level: 3, label: "high_tension", description: "高张力、需证据" },
};

/**
 * Parse a noteGen prompt YAML file (scalar fields + `template: |` block).
 * @param {string} raw
 * @returns {{ name: string; kind: string; description?: string; template: string; variables?: string[] }}
 */
function parsePromptYaml(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  /** @type {Record<string, string>} */
  const scalars = {};
  /** @type {string[]} */
  const variables = [];
  let template = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const varMatch = line.match(/^\s*-\s+(\S+)\s*$/);
    if (varMatch && i > 0 && lines[i - 1].trim() === "variables:") {
      variables.push(varMatch[1]);
      i += 1;
      continue;
    }

    const scalarMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (scalarMatch && scalarMatch[1] !== "template") {
      scalars[scalarMatch[1]] = scalarMatch[2].trim();
      i += 1;
      continue;
    }

    if (line.match(/^template:\s*\|\s*$/)) {
      i += 1;
      const block = [];
      while (i < lines.length) {
        const tplLine = lines[i];
        if (/^\S/.test(tplLine) && !tplLine.startsWith(" ")) {
          break;
        }
        block.push(tplLine.replace(/^  /, ""));
        i += 1;
      }
      template = block.join("\n").replace(/\n$/, "");
      continue;
    }

    i += 1;
  }

  if (!scalars.name || !template) {
    throw new Error("Invalid prompt YAML: missing name or template block");
  }

  return {
    name: scalars.name,
    kind: scalars.kind || "",
    description: scalars.description,
    template,
    variables: variables.length ? variables : undefined,
  };
}

class PromptCatalog {
  /**
   * @param {string} promptsDir Root prompts directory (contains kind subfolders).
   */
  constructor(promptsDir) {
    this.promptsDir = promptsDir;
    /** @type {Map<string, ReturnType<typeof parsePromptYaml>>} */
    this.cache = new Map();
  }

  /**
   * @param {string} kind e.g. "topic"
   * @param {string} name e.g. "xiaohongshu-topic-expert"
   */
  load(kind, name) {
    const key = `${kind}/${name}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const filePath = path.join(this.promptsDir, kind, `${name}.yaml`);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parsePromptYaml(raw);
    this.cache.set(key, parsed);
    return parsed;
  }

  /**
   * Replace {{VAR}} placeholders in a template string.
   * @param {string} template
   * @param {Record<string, string | number>} vars
   */
  render(template, vars) {
    return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key) => {
      if (vars[key] === undefined || vars[key] === null) {
        return "";
      }
      return String(vars[key]);
    });
  }

  /**
   * Load a prompt and render with variables.
   * @param {string} kind
   * @param {string} name
   * @param {Record<string, string | number>} vars
   */
  renderPrompt(kind, name, vars) {
    const prompt = this.load(kind, name);
    return this.render(prompt.template, vars);
  }
}

module.exports = { PromptCatalog, parsePromptYaml, HOOK_LEVELS };
