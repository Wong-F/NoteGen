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
npm test       # Run unit tests (117+ cases)
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
  components/        UI (sidebar, workspace, preview, onboarding tour)
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
| `onboarding.json` | Product tour completion flags |
| `drafts/{sessionId}/` | Card render assets per session |

Dev mode uses the **same** userData directory; Chromium disk cache is redirected to `%TEMP%\notegen-chromium-cache\` to avoid multi-launch lock errors.

## Application flow

```
Login (authService)
  → App shell (sidebar + workspace + preview)
    → Workspace (optional personaId binding)
      → Idea (topics) → Writing (copy) → Images (cards)
        → Preview + export
```

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

## IPC channels (summary)

| Channel | Service |
|---------|---------|
| `auth:*` | Login, session, logout |
| `settings:*` | AI / image / stock settings |
| `workspaces:*` | CRUD, search, persona rebind |
| `personas:*` | Persona CRUD |
| `topics:suggest` | Topic generation |
| `copy:generate` / `copy:humanize` / `copy:continueSection` | Copy pipeline |
| `cards:plan` / `cards:render` | Image deck |
| `export:*` | Folder export + clipboard |
| `onboarding:*` | Tour completion flags |

## Testing

```bash
npm test
```

Key suites: `copyService`, `exportService`, `platformPack`, `personaStoreService`, `workspaceStoreService`, `onboardingService`, `formDefaults`.

## Design philosophy

See [design-philosophy.md](./design-philosophy.md). Read before UI/UX changes.

## Development phases

| Phase | Scope |
|-------|--------|
| **Phase 1** | Local LLM, full creative pipeline, optional dev auth bypass |
| **Phase 2** | Production user-platform backend, user API keys |

Current version: **0.1.0** (SemVer).

## Agent rules

Edit `.agent-rules/*.md`, then:

```bash
python .agent-rules/sync_agent_rules.py
```

Planning files for multi-step work: `.planning/{YYYYMMDD}_{task}.md` — require user approval before implementation.

## License

MIT
