# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

React + Vite (client, port 3000) — Express (server, port 3001) — npm workspaces monorepo — ES modules throughout.

## Commands

```bash
npm run dev          # start both server and client
npm run dev -w server
npm run dev -w client
npm install          # after adding packages
```

## Architecture

- **`server/`** — Express API, entry at `server/index.js`. Add routes as `app.get/post('/api/...')`.
- **`client/`** — React + Vite SPA, entry at `client/src/main.jsx`, root component at `client/src/App.jsx`.

API calls from the client use relative paths (`/api/...`). Vite proxies them to the server — no CORS handling or hardcoded URLs needed.

## API Response Shape

Every endpoint returns:

```json
{ "success": boolean, "data": any, "error": string | null }
```

## Severity Levels

- **Critical** — app crashes or data is lost.
- **Major** — core feature is broken with no workaround.
- **Minor** — feature partially works or has a workaround.
- **Trivial** — cosmetic or low-impact issue.

## Test Case Fields

`title` · `preconditions` · `steps` (numbered) · `expected result` · `severity` · `status` (draft / ready / passed / failed / skipped)

## Test Case Rules

- **One scenario per test case.** Each test covers a single path (e.g. "valid login" and "wrong password" are two separate cases, never one).
- **Use standard test data** so cases are reproducible: valid account `test@example.com` / `Password123`; invalid password `wrong123`; non-existent user `ghost@example.com`.
- **Every step is a single observable action** with one expected result — no "do X, then Y, then Z" crammed into one step.

## Bug Report Fields

`title` · `steps to reproduce` · `expected` · `actual` · `severity` · `status` (open / in-progress / resolved / closed / reopened)

## File Naming

- Files: `kebab-case.js`
- React components: `PascalCase.jsx`
- API handlers: `handleVerbNoun` (e.g. `handleCreateUser`)

## Commit Messages

Use the format `type: short description` (all lowercase, no period). Keep the subject under 72 characters. Types:

- `feat` — a new feature or capability
- `fix` — a bug fix
- `perf` — a performance improvement
- `refactor` — code change that neither fixes a bug nor adds a feature
- `docs` — documentation only
- `test` — adding or updating tests
- `build` — build system or dependency changes (e.g. `package.json`, lockfiles)
- `ci` — CI / pipeline configuration
- `chore` — maintenance that doesn't fit the above
- `revert` — revert a previous commit

Examples:

```
feat: add login endpoint
fix: return 401 when token is missing
chore: install express-validator
```

Before committing, offer three commit message suggestions and let the user choose.

Do not add a `Co-Authored-By` trailer (or any AI-attribution line) to commit messages.

## Voice

Write test cases and bug reports in clear, direct English. State what happens, not what "should ideally occur." No buzzwords, no filler, no passive voice where active works.

## Custom Skills

Skills (slash commands) live at `.claude/skills/<command-name>/SKILL.md`.

- `/new-test` — write a manual test case, saved to `tests/manual/`
- `/bug-report` — file a bug report, saved to `tests/bugs/`
- `/feature-spec` — define a feature spec, saved to `docs/specs/`
