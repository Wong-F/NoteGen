const { app, Menu, dialog } = require("electron");

/**
 * Build localized application menu (zh-CN).
 * @param {import("electron").BrowserWindow | null} mainWindow
 */
function buildAppMenu(mainWindow) {
  const isDev = process.env.NODE_ENV === "development";

  /** @type {import("electron").MenuItemConstructorOptions[]} */
  const template = [
    {
      label: "文件",
      submenu: [
        {
          label: "新建创作",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("app:newWorkspace");
          },
        },
        {
          label: "导出到文件夹",
          accelerator: "CmdOrCtrl+E",
          click: () => {
            mainWindow?.webContents.send("app:exportPackage");
          },
        },
        { type: "separator" },
        {
          label: "设置",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow?.webContents.send("app:openSettings");
          },
        },
        { type: "separator" },
        { role: "quit", label: "退出" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" },
        { type: "separator" },
        {
          label: "搜索创作",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            mainWindow?.webContents.send("app:focusSearch");
          },
        },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { type: "separator" },
        { role: "resetZoom", label: "重置缩放" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        {
          label: "显示预览",
          click: () => {
            mainWindow?.webContents.send("app:showPanelTab", { tab: "preview" });
          },
        },
        {
          label: "显示对话",
          click: () => {
            mainWindow?.webContents.send("app:showPanelTab", { tab: "chat" });
          },
        },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" },
        ...(isDev
          ? [{ type: "separator" }, { role: "toggleDevTools", label: "开发者工具" }]
          : []),
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "close", label: "关闭窗口" },
      ],
    },
    {
      label: "帮助",
      submenu: [
        {
          label: "使用手册",
          accelerator: "F1",
          click: () => {
            mainWindow?.webContents.send("app:openManual");
          },
        },
        { type: "separator" },
        {
          label: "关于 笔记坊",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "关于 笔记坊",
              message: "笔记坊",
              detail: `版本 ${app.getVersion()}\n\n随时随地，AI 助力\n\n帮助博主完成选题、文案、配图与导出，支持小红书、微信公众号等平台。`,
              buttons: ["确定"],
            });
          },
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

/**
 * Apply menu to the application.
 * @param {import("electron").BrowserWindow | null} mainWindow
 */
function setAppMenu(mainWindow) {
  Menu.setApplicationMenu(buildAppMenu(mainWindow));
}

module.exports = { buildAppMenu, setAppMenu };
