# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start both server and client (run from repo root)
npm run dev

# Run server only
npm run dev -w server

# Run client only
npm run dev -w client

# Install all dependencies (run from repo root after adding packages)
npm install
```

There are no tests configured yet. Manual test cases live in `tests/manual/` and are created with the `/new-test` skill.

## Architecture

This is an npm workspaces monorepo with two packages:

- **`server/`** — Express API, ES modules, entry at `server/index.js`. Runs on port 3001. Add new routes here as `app.get/post('/api/...')`.
- **`client/`** — React + Vite SPA, entry at `client/src/main.jsx`, root component at `client/src/App.jsx`. Runs on port 3000.

**API calls from the client use relative paths** (`/api/...`). Vite proxies them to the server at `http://localhost:3001` during development, so no CORS handling or hardcoded URLs are needed.

Both packages use `"type": "module"` — ES module syntax (`import`/`export`) throughout. The server uses `node --watch` for auto-restart on file changes.

## Custom Skills

Skills (slash commands) live at `.claude/skills/<command-name>/SKILL.md`. Example:

```
.claude/skills/new-test/SKILL.md
```

The `SKILL.md` file contains plain markdown instructions that Claude follows when the skill is invoked with `/<command-name>`.
