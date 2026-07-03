const { ipcMain, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Register IPC routes. Each route maps a channel to a service method.
 * @param {import("../services").Services} services
 */
function registerRoutes(services) {
  ipcMain.handle("health:ping", async () => {
    return services.healthService.ping();
  });

  ipcMain.handle("notes:generate", async (_event, payload) => {
    return services.noteService.generate(payload);
  });

  ipcMain.handle("settings:get", async () => {
    return services.settingsService.get();
  });

  ipcMain.handle("settings:save", async (_event, payload) => {
    return services.settingsService.save(payload);
  });

  ipcMain.handle("ai:testConnection", async () => {
    return services.aiService.testConnection();
  });

  ipcMain.handle("topics:suggest", async (_event, payload) => {
    return services.topicService.suggest(payload);
  });

  ipcMain.handle("copy:listStyles", async () => {
    return services.copyService.listStyles();
  });

  ipcMain.handle("copy:generate", async (_event, payload) => {
    return services.copyService.generate(payload);
  });

  ipcMain.handle("copy:humanize", async (_event, payload) => {
    return services.copyService.humanize(payload);
  });

  ipcMain.handle("images:pick", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif"] }],
    });
    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle("images:import", async (_event, payload) => {
    return services.imageService.importUserImage(payload);
  });

  ipcMain.handle("images:generate", async (_event, payload) => {
    return services.imageService.generateImage(payload);
  });

  ipcMain.handle("images:searchStock", async (_event, payload) => {
    return services.stockImageService.searchAndDownload(payload);
  });

  ipcMain.handle("images:previewDataUrl", async (_event, payload) => {
    const absolutePath = payload?.absolutePath;
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      throw new Error("预览图片不存在");
    }
    const buffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  });

  ipcMain.handle("stock:testConnection", async () => {
    return services.stockImageService.testConnection();
  });

  ipcMain.handle("cards:plan", async (_event, payload) => {
    return services.cardService.planPages(payload);
  });

  ipcMain.handle("cards:render", async (_event, payload) => {
    return services.cardService.renderDeckPng(payload);
  });
}

module.exports = { registerRoutes };
