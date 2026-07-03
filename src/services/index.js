const { HealthService } = require("./healthService");
const { NoteService } = require("./noteService");
const { SettingsService } = require("./settingsService");
const { AiService } = require("./aiService");
const { TopicService } = require("./topicService");
const { CopyService } = require("./copyService");
const { ImageService } = require("./imageService");
const { StockImageService } = require("./stockImageService");
const { CardService } = require("./cardService");
const { ExportService } = require("./exportService");
const path = require("node:path");

/**
 * @typedef {Object} Services
 * @property {HealthService} healthService
 * @property {NoteService} noteService
 * @property {SettingsService} settingsService
 * @property {AiService} aiService
 * @property {TopicService} topicService
 * @property {CopyService} copyService
 * @property {ImageService} imageService
 * @property {StockImageService} stockImageService
 * @property {CardService} cardService
 * @property {ExportService} exportService
 */

/**
 * Create and wire application services.
 * @param {{ userDataDir: string; promptsDir?: string; writersDir?: string; templatesDir?: string; renderDeckFn?: Function }} options
 * @returns {Services}
 */
function createServices({ userDataDir, promptsDir, writersDir, templatesDir, renderDeckFn }) {
  const settingsService = new SettingsService(userDataDir);
  const getSettings = () => settingsService.get();
  const aiService = new AiService(() => getSettings().ai);
  const resolvedPromptsDir = promptsDir || path.join(__dirname, "../../prompts");
  const resolvedWritersDir = writersDir || path.join(__dirname, "../../writers");
  const resolvedTemplatesDir = templatesDir || path.join(__dirname, "../../templates");

  const topicService = new TopicService(aiService, { promptsDir: resolvedPromptsDir });
  const copyService = new CopyService(aiService, {
    promptsDir: resolvedPromptsDir,
    writersDir: resolvedWritersDir,
  });
  const imageService = new ImageService(getSettings, userDataDir);
  const stockImageService = new StockImageService(getSettings, userDataDir);
  const cardService = new CardService(aiService, imageService, {
    userDataDir,
    promptsDir: resolvedPromptsDir,
    templatesDir: resolvedTemplatesDir,
    renderDeckFn,
  });

  return {
    healthService: new HealthService(),
    noteService: new NoteService(),
    settingsService,
    aiService,
    topicService,
    copyService,
    imageService,
    stockImageService,
    cardService,
    exportService: new ExportService(),
  };
}

module.exports = { createServices };
