const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noteGen", {
  version: "1.0.1",
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  onMenuAction: (channel, callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
