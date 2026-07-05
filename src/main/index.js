const { app, BrowserWindow } = require("electron");
const os = require("node:os");
const path = require("node:path");
const { registerRoutes } = require("../routes");
const { createServices } = require("../services");
const { renderDeckToPng } = require("./renderWorker");

// Keep workspaces/personas in the default userData dir; isolate Chromium cache in dev only.
if (!app.isPackaged) {
  const cacheRoot = path.join(os.tmpdir(), "notegen-chromium-cache");
  app.commandLine.appendSwitch("disk-cache-dir", path.join(cacheRoot, "disk"));
  app.commandLine.appendSwitch("gpu-shader-disk-cache-dir", path.join(cacheRoot, "gpu"));
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    title: "noteGen",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../../public/index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    const userDataDir = app.getPath("userData");
    const services = createServices({
      userDataDir,
      renderDeckFn: renderDeckToPng,
      isDev: !app.isPackaged,
    });
    registerRoutes(services);

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
