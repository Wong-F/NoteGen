/**
 * App-level IPC: renderer flush handshake on close, and long-task feedback
 * (taskbar progress while AI work runs; a system notification when a task
 * finishes and the window is not focused).
 */

const { ipcMain, Notification } = require("electron");

const FLUSH_TIMEOUT_MS = 2000;

/**
 * @param {() => import("electron").BrowserWindow | null} getMainWindow
 */
function registerAppIpc(getMainWindow) {
  let longTaskCount = 0;
  /** @type {(() => void) | null} */
  let flushResolver = null;

  ipcMain.handle("app:flushDone", () => {
    if (flushResolver) {
      const resolve = flushResolver;
      flushResolver = null;
      resolve();
    }
    return true;
  });

  ipcMain.handle("app:taskStarted", () => {
    longTaskCount += 1;
    // 2 = indeterminate progress on the Windows taskbar.
    getMainWindow()?.setProgressBar(2);
    return true;
  });

  ipcMain.handle("app:taskFinished", (_event, payload) => {
    longTaskCount = Math.max(0, longTaskCount - 1);
    const win = getMainWindow();
    if (longTaskCount === 0) {
      win?.setProgressBar(-1);
    }

    const notify = payload?.notify;
    if (notify?.title && win && !win.isFocused() && Notification.isSupported()) {
      const notification = new Notification({
        title: String(notify.title),
        body: notify.body ? String(notify.body) : "",
      });
      notification.on("click", () => {
        const target = getMainWindow();
        if (!target) {
          return;
        }
        if (target.isMinimized()) {
          target.restore();
        }
        target.focus();
      });
      notification.show();
    }
    return true;
  });

  return {
    /**
     * Ask the renderer to flush pending saves; resolves on its reply or
     * after a timeout so a hung renderer can never block quitting.
     * @param {import("electron").BrowserWindow} win
     * @returns {Promise<void>}
     */
    waitForRendererFlush(win) {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          flushResolver = null;
          resolve();
        }, FLUSH_TIMEOUT_MS);
        flushResolver = () => {
          clearTimeout(timer);
          resolve();
        };
        try {
          win.webContents.send("app:flushBeforeClose");
        } catch {
          clearTimeout(timer);
          flushResolver = null;
          resolve();
        }
      });
    },
  };
}

module.exports = { registerAppIpc };
