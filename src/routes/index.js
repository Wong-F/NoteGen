const { ipcMain, dialog, clipboard, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { resolvePersona } = require("../services/personaContext");
const { resolvePlatformPack, workflowTypeForPersona } = require("../services/platformPacks");

/**
 * Register IPC routes. Each route maps a channel to a service method.
 * @param {import("../services").Services} services
 */
function registerRoutes(services) {
  ipcMain.handle("health:ping", async () => {
    return services.healthService.ping();
  });

  ipcMain.handle("auth:login", async (_event, payload) => {
    return services.authService.login(payload || {});
  });

  ipcMain.handle("auth:session", async () => {
    const result = await services.authService.getSession();
    return {
      session: result.session,
      profile: services.authService.toUserProfile(result.session),
      renewed: Boolean(result.renewed),
      error: result.error || null,
    };
  });

  ipcMain.handle("auth:logout", async () => {
    return services.authService.logout();
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

  ipcMain.handle("ai:cancel", async () => {
    return services.aiService.cancelInflight();
  });

  ipcMain.handle("chat:send", async (_event, payload) => {
    return services.chatService.send(payload || {}, services.personaStoreService);
  });

  ipcMain.handle("topics:suggest", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.topicService.suggest({ ...payload, persona });
  });

  ipcMain.handle("copy:listStyles", async () => {
    return services.copyService.listStyles();
  });

  ipcMain.handle("copy:generate", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.copyService.generate({ ...payload, persona });
  });

  ipcMain.handle("copy:humanize", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.copyService.humanize({ ...payload, persona });
  });

  ipcMain.handle("copy:rewriteSelection", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.copyService.rewriteSelection({ ...payload, persona });
  });

  ipcMain.handle("copy:insertAtCursor", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.copyService.insertAtCursor({ ...payload, persona });
  });

  ipcMain.handle("copy:continueSection", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.copyService.continueSection({ ...payload, persona });
  });

  ipcMain.handle("onboarding:get", async () => {
    return services.onboardingService.get();
  });

  ipcMain.handle("onboarding:completeWelcome", async (_event, payload) => {
    return services.onboardingService.completeWelcome({
      skipped: Boolean(payload?.skipped),
    });
  });

  ipcMain.handle("onboarding:completeFirstWorkspace", async (_event, payload) => {
    return services.onboardingService.completeFirstWorkspace({
      skipped: Boolean(payload?.skipped),
    });
  });

  ipcMain.handle("onboarding:reset", async () => {
    return services.onboardingService.reset();
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
    const count = Number(payload?.count) || 1;
    if (count > 1) {
      return services.imageService.generateImages(payload);
    }
    const single = await services.imageService.generateImage(payload);
    return {
      sessionId: single.sessionId,
      images: [
        {
          filename: single.filename,
          absolutePath: single.absolutePath,
          relativePath: single.relativePath,
        },
      ],
    };
  });

  ipcMain.handle("images:searchStock", async (_event, payload) => {
    return services.stockImageService.searchAndDownload(payload);
  });

  ipcMain.handle("images:searchStockCandidates", async (_event, payload) => {
    const candidates = await services.stockImageService.searchCandidates(
      payload?.keyword,
      payload?.count
    );
    return { candidates };
  });

  ipcMain.handle("images:downloadStockCandidate", async (_event, payload) => {
    return services.stockImageService.downloadCandidate(payload?.candidate, {
      sessionId: payload?.sessionId,
      label: payload?.label,
    });
  });

  ipcMain.handle("images:previewDataUrl", async (_event, payload) => {
    const absolutePath = payload?.absolutePath || payload?.filePath;
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      throw new Error("预览图片不存在");
    }
    const buffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();
    const mime =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  });

  ipcMain.handle("images:fetchRemoteDataUrl", async (_event, payload) => {
    const url = payload?.url?.trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new Error("无效的远程图片地址");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载预览失败：HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) {
      throw new Error("预览图片过大");
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType.split(";")[0]};base64,${buffer.toString("base64")}`;
  });

  ipcMain.handle("stock:testConnection", async () => {
    return services.stockImageService.testConnection();
  });

  ipcMain.handle("cards:plan", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    return services.cardService.planPages({ ...payload, persona });
  });

  ipcMain.handle("cards:render", async (_event, payload) => {
    return services.cardService.renderDeckPng(payload);
  });

  ipcMain.handle("export:copyText", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    const copy = payload?.copy || {};
    const pack = resolvePlatformPack({
      persona,
      workflowType: payload?.workflowType,
      platform: payload?.platform,
    });
    const text = pack.formatClipboardText(copy, services.exportService);
    if (!text.trim()) {
      throw new Error("????????");
    }
    clipboard.writeText(text);
    return { ok: true, charCount: text.length };
  });

  ipcMain.handle("export:suggestFolderName", async (_event, payload) => {
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    const folderName = services.exportService.buildFolderName({
      persona,
      copy: payload?.copy || {},
      workspaceTitle: payload?.workspaceTitle,
    });
    return { folderName };
  });

  ipcMain.handle("export:pickFolder", async (_event, payload) => {
    const result = await dialog.showOpenDialog({
      title: "???????",
      buttonLabel: "??????",
      defaultPath: payload?.defaultPath || undefined,
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }
    return { canceled: false, folderPath: result.filePaths[0] };
  });

  ipcMain.handle("export:saveToFolder", async (_event, payload) => {
    const parentPath = payload?.parentPath?.trim() || payload?.folderPath?.trim();
    const copy = payload?.copy || {};
    const images = payload?.images || [];
    if (!parentPath) {
      throw new Error("????????");
    }
    const persona = resolvePersona(services.personaStoreService, payload?.personaId);
    const pack = resolvePlatformPack({
      persona,
      workflowType: payload?.workflowType,
      platform: payload?.platform,
    });
    const platform = pack.id;
    const result = services.exportService.exportPackage(parentPath, copy, images, {
      persona,
      platform,
      workspaceTitle: payload?.workspaceTitle,
      folderName: payload?.folderName,
    });
    return {
      ...result,
      imageCount: result.imagePaths.length,
      platform,
    };
  });

  ipcMain.handle("export:revealFolder", async (_event, payload) => {
    const folderPath = payload?.folderPath;
    if (!folderPath) {
      throw new Error("???????");
    }
    await shell.openPath(folderPath);
    return { ok: true };
  });

  ipcMain.handle("workspaces:list", async (_event, payload) => {
    return services.workspaceStoreService.list(payload || {});
  });

  ipcMain.handle("workspaces:get", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("workspace id is required");
    }
    return services.workspaceStoreService.get(id);
  });

  ipcMain.handle("workspaces:create", async (_event, payload) => {
    const seed = { ...(payload || {}) };
    if (seed.personaId) {
      const persona = services.personaStoreService.get(seed.personaId);
      if (persona) {
        seed.workflowType = workflowTypeForPersona(persona);
      }
    }
    return services.workspaceStoreService.create(seed);
  });

  ipcMain.handle("workspaces:save", async (_event, payload) => {
    if (!payload?.id) {
      throw new Error("workspace id is required");
    }
    return services.workspaceStoreService.save(payload);
  });

  ipcMain.handle("workspaces:delete", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("workspace id is required");
    }
    return services.workspaceStoreService.delete(id);
  });

  ipcMain.handle("workspaces:setActive", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("workspace id is required");
    }
    return services.workspaceStoreService.setActive(id);
  });

  ipcMain.handle("workspaces:rebindPersona", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("workspace id is required");
    }
    const personaId = payload?.personaId?.trim() || null;
    let workflowType;
    if (personaId) {
      const persona = services.personaStoreService.get(personaId);
      if (persona) {
        workflowType = workflowTypeForPersona(persona);
      }
    }
    return services.workspaceStoreService.rebindPersona(id, personaId, workflowType);
  });

  ipcMain.handle("personas:list", async () => {
    return services.personaStoreService.list();
  });

  ipcMain.handle("personas:get", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("persona id is required");
    }
    return services.personaStoreService.get(id);
  });

  ipcMain.handle("personas:create", async (_event, payload) => {
    return services.personaStoreService.create(payload || {});
  });

  ipcMain.handle("personas:save", async (_event, payload) => {
    if (!payload?.id) {
      throw new Error("persona id is required");
    }
    return services.personaStoreService.save(payload);
  });

  ipcMain.handle("personas:delete", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("persona id is required");
    }
    return services.personaStoreService.delete(id, {
      workspaceStoreService: services.workspaceStoreService,
    });
  });

  ipcMain.handle("personas:setActive", async (_event, payload) => {
    const id = payload?.id?.trim();
    if (!id) {
      throw new Error("persona id is required");
    }
    return services.personaStoreService.setActive(id);
  });

  ipcMain.handle("personas:clearActive", async () => {
    return services.personaStoreService.clearActive();
  });
}

module.exports = { registerRoutes };
