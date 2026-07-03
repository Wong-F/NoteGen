const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("noteGen", {
  version: "0.1.0",
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
});
