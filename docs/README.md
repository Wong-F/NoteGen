# noteGen — Developer Guide

Windows desktop app for AI-assisted note creation on **Xiaohongshu (小红书)** and **WeChat Official Accounts (微信公众号)**.

## Tech stack

- Electron 34 + Node.js 20 LTS
- Main / preload / renderer separation
- IPC routes → services architecture
- Node built-in test runner (`node --test`)

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Launch Electron (single-instance lock enabled)
npm test       # Run unit tests (155+ cases)
npm run build  # Build renderer + main
npm run dist   # Package Windows installer (NSIS)
```

## Project layout

```
src/
  main/              Electron main process (window, cache, services bootstrap)
  preload/           contextBridge → window.noteGen.invoke
  renderer/          Auth gate + app shell bootstrap
  routes/            IPC handlers
  services/          Business logic (AI, stores, platform packs, export)
  components/        UI (sidebar, workspace, rightPanel, preview, chat, onboarding tour)
  constants/         Shared defaults (formDefaults.js / .cjs)
public/              HTML, CSS, static assets
prompts/             YAML prompt templates (topic / copy / card / humanizer)
writers/             Writer style blocks
templates/           Card/deck HTML shells (xhs-deck-shell, wechat-deck-shell)
test/                Mirrors services/components structure
.planning/           Feature planning archives (Chinese)
docs/                Project documentation
```

## Runtime data (Windows)

User data is stored under:

`%APPDATA%\notegen\`

| Path | Purpose |
|------|---------|
| `workspaces/` | Creative workspace JSON + index |
| `personas/` | Operator persona (运营人设) store |
| `settings.json` | AI / image / stock API settings |
| `auth-session.json` | Login session |
| `device-id.json` | Device identifier sent as API `imei` (see [Authentication](#authentication)) |
| `onboarding.json` | Product tour completion flags |
| `drafts/{sessionId}/` | Card render assets per session |

Dev mode uses the **same** userData directory; Chromium disk cache is redirected to `%TEMP%\notegen-chromium-cache\` to avoid multi-launch lock errors.

## Application flow

```
Login (authService)
  → App shell (sidebar + workspace + right panel)
    → Workspace (optional personaId binding)
      → Idea (topics) → Writing (copy) → Images (cards)
        → Right panel: Preview | Chat → export
```

### Right panel (Preview | Chat)

The preview column hosts a tab switcher (`src/components/rightPanel.js`):

| Tab | Component | Purpose |
|-----|-----------|---------|
| **Preview** | `previewPanel.js` | Live copy summary, page deck with bound `pageAssets` thumbnails, rendered card PNGs |
| **Chat** | `chatPanel.js` | Free-form AI chat with workspace + persona context; persisted in `chatMessages` per workspace |

- Layout: three-column shell (`resizableLayout.js`) with collapsible sidebar/preview; right panel root uses `.layout-panel-slot` for flex height (required for scroll + chat input).
- Menu: **View → 显示预览 / 显示对话** → IPC `app:showPanelTab`.
- Chat IPC: `chat:send` → `ChatService.send()` (system prompt built from workspace state).

### Persona → Idea field sync

When a workspace binds a persona (or user clicks **用人设创建**), topic form fields sync from persona metadata:

- **领域关键词** ← persona `domainKeywords` / niche
- **目标读者** ← persona `targetAudience`

Helpers: `buildKeywordsFromPersona`, `isIdeaInputAtDefaults`, `syncIdeaInputFromPersona` in `formDefaults.js` + `personaStore.js`. UI listens for `persona:idea-synced` to refresh the idea form.

Copy step label **钩子等级** was renamed **标题风格** (`TITLE_STYLE_OPTIONS`).

### Images step — workspace thumbnails & multi-candidate pick

Per page card in the images workspace:

| Control | Behavior |
|---------|----------|
| **返回 N 张** (1–6) | AI generate / stock search return N candidates |
| `count === 1` | Auto-bind first result (legacy behavior) |
| `count > 1` | Show candidate grid; user clicks to bind |
| Bound asset | Thumbnail in workspace via `images:previewDataUrl` |
| Stock candidates | Preview via `images:fetchRemoteDataUrl` (CSP blocks raw HTTPS in renderer) |

Ephemeral UI state: `appState.pageImageCandidates` (not persisted). Bound assets: `appState.pageAssets`.

Stock multi-search: `images:searchStockCandidates` → user picks → `images:downloadStockCandidate`.

AI multi-generate: `images:generate` with `count` → `ImageService.generateImages()`.

### Platform packs

Workflow behavior is selected via `persona.platform` or `workflowType`:

| Pack | `workflowType` | Notes |
|------|----------------|-------|
| `xiaohongshu` | `xiaohongshu-note` | Title ≤20 chars, hashtags, xhs deck |
| `wechat` | `wechat-article` | Title/summary/body + `sections[]`, wechat deck |

Implementation: `src/services/platformPacks/` — prompts, `normalizeCopy`, export formatting.

### WeChat long-form extras

- Full-article generation via `wechat-article-writer` prompt
- **Section continue** (`copy:continueSection`): AI fills or extends a single section from user draft (empty / title-only / partial body)
- Export: `note.md` + `note.html` with section structure

### Operator personas (运营人设)

Optional sidebar context for voice, taboos, default style, and platform. Workspace binds to a persona via `personaId`; AI prompts use the **workspace-bound** persona, not necessarily the sidebar “active” persona chip.

### Onboarding (product tour)

- **Welcome tour** (4 steps): first main-shell entry — New Workspace, persona, Recent, Settings
- **Workflow tour** (4 steps): first workspace creation — Idea → Writing → Images → Preview
- State: `onboarding.json`; replay from **Settings → 重新观看新手教程**
- UI: `src/components/onboardingTour.js`, `public/css/onboarding.css`

### UI themes

Five themes share one token contract in `public/css/tokens.css`; component CSS
never branches on theme.

| Theme id | Name | Look |
|----------|------|------|
| `cloud` (default, `:root`) | 云端 | Frosted floating panels, cool gradient canvas |
| `blush` | 胭脂纸 | Warm paper, pill controls, crimson gradient |
| `ink` | 墨夜 | Dark blue-black, dim frosted panels, bright accent |
| `matcha` | 抹茶 | Creamy paper, matcha-green accent, pill controls |
| `cream` | 奶油杏 | Warm off-white, muted apricot, soft corners |

- Registry: `src/constants/themeOptions.js` (ESM) + `.cjs` mirror; picker in Settings renders from `THEMES`
- Persistence: localStorage `notegen.theme`; `public/js/theme-boot.js` stamps `data-theme` before first paint (CSP forbids inline scripts)
- DOM glue: `src/components/theme.js`

### Inline AI rewrite & insert (Ctrl+K)

`src/components/inlineRewrite.js` attaches to text fields (`attachFieldRewrite`):

- **Selection → rewrite**: select text → floating bubble or Ctrl+K → instruction → old→new preview → apply in place (`copy:rewriteSelection`). `execCommand("insertText")` keeps the native undo stack.
- **No selection → insert at caret**: Ctrl+K anywhere (fields keep caret/selection after blur; target ranked focused → last-focused → last-selection) → instruction → generated text previewed and inserted at the caret (`copy:insertAtCursor`, prompt `prompts/rewrite/inline-insert.yaml`).

### Desktop UX conventions

| Concern | Implementation |
|---------|----------------|
| Single instance | `requestSingleInstanceLock`; second launch restores/focuses and flashes the taskbar icon |
| Window state | `src/main/windowState.js` → `%APPDATA%\notegen\window-state.json`; bounds validated against attached displays; state captured on resize/move events only (Windows reports un-maximized during close) |
| Flush before close | Main intercepts `close` → `app:flushBeforeClose` → renderer `flushWorkspaceSave()` → `app:flushDone`; 2s timeout so a hung renderer never blocks quit (`src/main/appIpc.js`) |
| Menu shortcuts | Ctrl+N new workspace, Ctrl+E export, Ctrl+, settings, Ctrl+F search, F1 manual (`src/main/appMenu.js` → `app:*` channels) |
| Long tasks | `app:taskStarted/Finished` drive taskbar indeterminate progress; completion notifies via system Notification only when the window is unfocused (`src/components/longTask.js`) |
| Undo over confirm | Deletions (workspace / persona / chat clear) act immediately and offer a 5s undo toast (`src/components/toast.js`); workspace restore via `workspaces:save` snapshot, persona via `personas:create` |
| Cancellable AI | `AiService.cancelInflight()` + `ai:cancel` route; busy status lines render a 取消 button; user aborts map to `CANCELLED` (distinct from `TIMEOUT`) |
| Actionable errors | `src/constants/errorText.js` strips IPC prefixes and maps AI errors to Chinese hints; config/auth/connection errors add an 打开设置 button (`src/components/statusLine.js`) |
| Overlay a11y | Settings / persona / manual drawers: focus in on open, Escape closes, focus returns to trigger (`src/components/overlayFocus.js`) |
| Loading | Buttons keep their label with an indeterminate sweep band (tokens `--sweep-on-accent` / `--sweep-on-surface`) |

## Authentication

Production login uses the **AI key distribution platform** (not username/password).

| UI field | API field | Notes |
|----------|-----------|-------|
| Account (phone) | `phone` | Mobile number bound to the key |
| Password (secret) | `secret` | 32-char hex key from backend |
| — | `script` | Fixed `NoteGen` |
| — | `imei` | Device id (see below) |

- **Endpoint (SIT)**: `POST http://sit.xslq.work/sit/interface/api/publickey/normaltoken`
- **Session**: `auth-session.json`; expired sessions auto-retry activation with cached credentials
- **Dev bypass**: phone `13164150732`, no secret, only when `!app.isPackaged` (`npm run dev`)
- **Implementation**: `src/services/authService.js`; IPC `auth:login` / `auth:session` / `auth:logout`

### Device id (`imei`)

Desktop apps have no phone IMEI. The backend accepts a **MAC address** as `imei`.

| Rule | Behavior |
|------|----------|
| Format | `AABBCCDDEEFF` (uppercase, no separators) |
| Detection | Physical NIC only; skip virtual (WSL, Hyper-V, VPN, Docker, …) |
| Priority | Ethernet → Wi-Fi → other physical adapters |
| Persistence | First resolved value written to `device-id.json`; later reads reuse it |
| Fallback | If no usable MAC, generate UUID and persist (logged as warning) |
| Legacy | Existing `device-id.json` with UUID is kept as-is (UUID ∥ MAC coexist during test) |

**Test environment only** — not shipped to end users yet. Parallel UUID/MAC is intentional until production cutover.

## IPC channels (summary)

| Channel | Service |
|---------|---------|
| `auth:*` | Login, session, logout |
| `settings:*` | AI / image / stock settings |
| `workspaces:*` | CRUD, search, persona rebind |
| `personas:*` | Persona CRUD |
| `topics:suggest` | Topic generation |
| `copy:generate` / `copy:humanize` / `copy:continueSection` | Copy pipeline |
| `copy:rewriteSelection` / `copy:insertAtCursor` | Inline rewrite / generate-at-caret (Ctrl+K) |
| `ai:cancel` | Abort in-flight AI requests |
| `chat:send` | Free-form AI chat with workspace context |
| `cards:plan` / `cards:render` | Image deck |
| `images:generate` | AI image(s); `count` 1–6 returns `{ sessionId, images[] }` |
| `images:searchStock` | Single stock download (auto-bind) |
| `images:searchStockCandidates` | Stock preview list for multi-pick |
| `images:downloadStockCandidate` | Download selected stock candidate |
| `images:previewDataUrl` | Local file → data URL (`absolutePath` or `filePath`) |
| `images:fetchRemoteDataUrl` | HTTPS preview → data URL (main process fetch) |
| `export:*` | Folder export + clipboard |
| `onboarding:*` | Tour completion flags |
| `app:*` | Main-window glue: menu actions, close-time flush handshake, long-task progress/notifications |

## Testing

```bash
npm test
```

Key suites: `copyService`, `chatService`, `exportService`, `platformPack`, `personaStoreService`, `workspaceStoreService`, `onboardingService`, `formDefaults`, `imageService`, `stockImageService`, `themeOptions`, `windowState`, `aiCancel`, `errorText`, `services` (registry smoke).

### Agent delivery checklist

After non-trivial UI/feature work, agents should run `npm test` and smoke the affected flow in `npm run dev` before reporting done (see `.agent-rules/style.md` — Verify step).

## Design philosophy

See [design-philosophy.md](./design-philosophy.md). Read before UI/UX changes.

## Development phases

The repo uses two **product phases** (see also `.agent-rules/core.md`). **Current snapshot (2026-07-10):**

| Phase | Intended scope | Status |
|-------|----------------|--------|
| **Phase 1 — Development** | Local/cloud LLM via settings; full creative pipeline (topics → copy → cards → export); workspace + persona; dev auth bypass | **Done** — core MVP shipped in app |
| **Phase 2 — Deployment** | User-platform backend; login / key activation; user-provided API keys for LLM calls; energy points (`aipoint`) | **In progress (test env)** — login + SIT activation implemented; **not yet released to end users**; LLM keys still from local settings; `aipoint` returned but not consumed on AI calls |

### Version roadmap (SemVer)

| Version | Target | Status |
|---------|--------|--------|
| **0.1.0** | Three-step pipeline + Workspace UI | Released in tree |
| **0.1.1** | Workspace persistence, login/auth framework, persona, WeChat pack, onboarding | **Current** (`package.json` still `0.1.0`; bump pending) |
| **0.2.0** | SIT/production backend sign-off, energy points, user API keys, packaging for users | Planned |

### What is done vs pending (0.1.1)

| Area | Done | Pending |
|------|------|---------|
| Auth UI + `authService` | Yes | SIT sign-off with real test keys |
| Device id (MAC + UUID fallback) | Yes | — |
| Workspace / persona / export | Yes | Stage 5 workflow reuse (templates across workspaces) |
| Right panel preview + chat | Yes | — |
| Image workspace thumbnails + multi-candidate | Yes | — |
| Persona → idea field sync | Yes | — |
| UI themes (5) + theme picker | Yes | — |
| Inline AI rewrite / insert (Ctrl+K) | Yes | Migrate off deprecated `execCommand` (see `.cursor/findings.md`) |
| Desktop UX (window state, close flush, shortcuts, notifications, undo, cancel) | Yes | Image generation not yet cancellable (own fetch path) |
| AI calls | Local settings | Wire to user keys + `aipoint` in Phase 2 |

Planning archives: `.planning/{YYYYMMDD}_{task}.md`. Multi-step work requires user approval before implementation.

## Agent rules

Edit `.agent-rules/*.md`, then:

```bash
python .agent-rules/sync_agent_rules.py
```

## License

MIT
