## 任务：NSIS 安装向导增加路径与桌面快捷方式选项

**背景**：当前 `electron-builder` 使用 NSIS 默认一键安装（`oneClick: true`），用户无法选择安装目录，也无法在安装时决定是否创建桌面快捷方式。面向 Windows 桌面产品交付，安装体验需要提供这两个常见选项。

**影响范围**：
- `package.json`（`build.nsis` 配置）

**前置条件**：
- 已有 `win.target: ["nsis"]` 打包配置，可用 `npm run dist` 产出安装包

### Stage 1: 配置 NSIS 辅助安装向导
- **目标**：关闭一键安装，启用安装目录选择，并提供「创建桌面快捷方式」勾选项
- **成功标准**：
  - `package.json` 中新增 `build.nsis`：
    - `oneClick: false`（显示安装向导）
    - `allowToChangeInstallationDirectory: true`（可选安装路径）
    - `createDesktopShortcut: true`（向导中出现桌面快捷方式勾选，默认勾选）
    - `createStartMenuShortcut: true`（保留开始菜单快捷方式，默认行为）
  - 重新打包后安装器出现：安装路径页 + 桌面快捷方式选项
- **状态**：Complete

### Stage 2: 打包验证
- **目标**：运行 `npm run dist`，用产出的安装包确认两个选项可见且生效
- **成功标准**：
  - 安装向导可修改安装目录
  - 可勾选/取消「创建桌面快捷方式」
  - 勾选时桌面出现快捷方式，取消时不出现
- **状态**：Complete

**拟定配置**：

```json
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "allowElevation": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "AI笔记坊"
}
```

**说明**：
- `createDesktopShortcut: true`（非 `"always"`）才会在辅助安装向导里显示勾选框；`"always"` 会强制创建且无选项。
- 不引入自定义 NSIS 脚本；electron-builder 内置能力即可满足这两项需求。
- 中文界面依赖系统语言 / electron-builder 默认语言包，本次不单独做 installer 本地化定制（除非后续有需求）。

**待确认事项**：
1. 桌面快捷方式是否默认勾选？（建议：是，`createDesktopShortcut: true`）
2. 是否同时保留开始菜单快捷方式？（建议：是）
3. 是否需要「为所有用户安装 / 仅当前用户」选项？（建议：本次不做，保持 electron-builder 默认）

## ��ɼ�¼

- **���ʱ��**��2026-08-03
- **ʵ�ʽ��**��package.json ������ uild.nsis��
pm run dist �ɹ�����־ȷ�� oneClick=false������ elease\AI�ʼǷ� Setup 1.0.1.exe
- **ƫ��˵��**����װ�� UI��·��ҳ�������ݷ�ʽ��ѡ�����û��������а�װ��������Ŀ��ȷ��
