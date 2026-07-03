/**
 * Load writer style YAML assets (writers/*.yaml).
 * Each writer defines a multiline `writing_prompt` block.
 */

const fs = require("node:fs");
const path = require("node:path");

/**
 * Extract scalar fields and one multiline block from a YAML-like file.
 * @param {string} raw
 * @param {string} blockKey e.g. "writing_prompt"
 */
function parseBlockYaml(raw, blockKey) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  /** @type {Record<string, string>} */
  const scalars = {};
  let block = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const scalarMatch = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (scalarMatch && scalarMatch[1] !== blockKey) {
      scalars[scalarMatch[1]] = scalarMatch[2].trim().replace(/^"|"$/g, "");
      i += 1;
      continue;
    }

    const blockStart = new RegExp(`^${blockKey}:\\s*\\|\\s*$`);
    if (blockStart.test(line)) {
      i += 1;
      const parts = [];
      while (i < lines.length) {
        const blockLine = lines[i];
        if (/^\S/.test(blockLine) && !blockLine.startsWith(" ")) {
          break;
        }
        parts.push(blockLine.replace(/^  /, ""));
        i += 1;
      }
      block = parts.join("\n").replace(/\n$/, "");
      continue;
    }

    i += 1;
  }

  if (!scalars.english_name || !block) {
    throw new Error(`Invalid writer YAML: missing english_name or ${blockKey} block`);
  }

  return {
    name: scalars.name || scalars.english_name,
    englishName: scalars.english_name,
    category: scalars.category || "",
    description: scalars.description || "",
    writingPrompt: block,
  };
}

class WriterCatalog {
  /**
   * @param {string} writersDir Directory containing *.yaml writer files.
   */
  constructor(writersDir) {
    this.writersDir = writersDir;
    /** @type {Map<string, ReturnType<typeof parseBlockYaml>>} */
    this.cache = new Map();
  }

  /** @returns {string[]} */
  listIds() {
    if (!fs.existsSync(this.writersDir)) {
      return [];
    }
    return fs
      .readdirSync(this.writersDir)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .map((file) => file.replace(/\.ya?ml$/, ""));
  }

  /**
   * @param {string} id english_name or filename without extension
   */
  load(id) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    const filePath = path.join(this.writersDir, `${id}.yaml`);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parseBlockYaml(raw, "writing_prompt");
    this.cache.set(id, parsed);
    this.cache.set(parsed.englishName, parsed);
    return parsed;
  }

  /** @returns {Array<{ id: string; name: string; description: string; category: string }>} */
  list() {
    return this.listIds().map((id) => {
      const writer = this.load(id);
      return {
        id: writer.englishName,
        name: writer.name,
        description: writer.description,
        category: writer.category,
      };
    });
  }

  /**
   * @param {string} [styleId]
   * @returns {string} writing prompt text
   */
  getWritingPrompt(styleId) {
    const id = styleId?.trim() || "default";
    try {
      return this.load(id).writingPrompt;
    } catch {
      return this.load("default").writingPrompt;
    }
  }
}

module.exports = { WriterCatalog, parseBlockYaml };
