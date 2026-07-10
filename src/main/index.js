const { app, BrowserWindow, screen } = require("electron");
const os = require("node:os");
const path = require("node:path");
const { registerRoutes } = require("../routes");
const { createServices } = require("../services");
const { renderDeckToPng } = require("./renderWorker");
const { setAppMenu } = require("./appMenu");
const { createWindowStateKeeper } = require("./windowState");
const { registerAppIpc } = require("./appIpc");

// Required for Windows toast notifications to attribute to the app.
app.setAppUserModelId("com.notegen.app");

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
/** @type {ReturnType<typeof registerAppIpc> | null} */
let appIpc = null;

function createWindow() {
  const windowState = createWindowStateKeeper({
    userDataDir: app.getPath("userData"),
    screen,
  });

  mainWindow = new BrowserWindow({
    x: windowState.state.x,
    y: windowState.state.y,
    width: windowState.state.width,
    height: windowState.state.height,
    minWidth: 900,
    minHeight: 600,
    title: "笔记坊",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  windowState.track(mainWindow);

  mainWindow.loadFile(path.join(__dirname, "../../public/index.html"));

  mainWindow.once("ready-to-show", () => {
    if (windowState.state.isMaximized) {
      mainWindow.maximize();
    }
  });

  // Let the renderer flush pending workspace saves before the window closes.
  let rendererFlushed = false;
  mainWindow.on("close", (event) => {
    if (rendererFlushed || !appIpc) {
      return;
    }
    event.preventDefault();
    const win = mainWindow;
    appIpc.waitForRendererFlush(win).then(() => {
      rendererFlushed = true;
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
    setAppMenu(null);
  });

  setAppMenu(mainWindow);
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
    appIpc = registerAppIpc(() => mainWindow);

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    // Draw the eye to the existing window when focus-stealing is blocked.
    if (!mainWindow.isFocused()) {
      mainWindow.flashFrame(true);
      mainWindow.once("focus", () => mainWindow?.flashFrame(false));
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
