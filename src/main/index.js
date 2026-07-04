const { app, BrowserWindow } = require("electron");
const path = require("path");
const { registerRoutes } = require("../routes");
const { createServices } = require("../services");
const { renderDeckToPng } = require("./renderWorker");

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

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
