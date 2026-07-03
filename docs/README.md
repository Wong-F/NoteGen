# noteGen

Windows desktop app for AI-assisted note creation on Xiaohongshu and similar platforms.

## Tech stack

- Electron + Node.js 20
- Main / preload / renderer process separation
- IPC routes → services architecture

## Project layout

```
src/
  main/           Electron main process entry
  preload/        contextBridge API exposed to renderer
  renderer/       Renderer bootstrap
  routes/         IPC route registration
  services/       Business logic (AI, notes, etc.)
  components/     UI components
public/           Static assets (HTML, CSS, images)
test/             Node.js built-in test runner
scripts/          Build utilities
```

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Launch Electron in dev mode
npm test       # Run unit tests
npm run build  # Build placeholder (extend later)
npm run dist   # Package Windows installer
```

## Design philosophy

See [design-philosophy.md](./design-philosophy.md) for UI/UX principles. Agents must read it before any design-related work.

## Development phases

- **Phase 1**: Local LLM integration, no backend / login
- **Phase 2**: User platform backend + user-provided API keys

## License

MIT
