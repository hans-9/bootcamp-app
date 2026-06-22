# QA Command Center

A QA test-management app **and** the portable Claude Code plugin that grew
alongside it. The app manages test cases, suites, runs, bug reports, dashboards,
reports, and a flaky-test tracker. The plugin packages the QA workflows that
built it — slash commands, skills, subagents, and hooks — so a teammate can drop
them into their own Claude Code and use them the same day.

**Live app:** https://bootcamp-app-wywi.onrender.com

## What this plugin does

QA Command Center turns the repetitive parts of a QA workflow into one-step
Claude Code actions:

- **Write test cases and bug reports** to a consistent house style (ISTQB
  boundary/equivalence cases, standard test data, one-action-per-step).
- **Review a change for risk** before it ships — a read-only subagent returns a
  severity-grouped list of what could break.
- **Track flaky tests** — rank the flakiest tests, explain *why* each is flaky,
  and triage which to fix first.
- **Draft release notes** from commits and resolved bugs.
- **Keep contributions on-convention** — hooks warn when a response bypasses the
  `{ success, data, error }` envelope or uses an off-spec severity word.

It's opinionated on purpose: every piece enforces the same conventions (see
`CLAUDE.md`), so output from a new teammate reads like everyone else's.

## Install

### Into your own Claude Code (use it in any project)

In Claude Code:

```
/plugin marketplace add hans-9/bootcamp-app
/plugin install qa-command-center@qa-command-center
```

The slash commands, skills, subagents, and hooks then work in any project.

### Or just clone and use it here

```bash
git clone https://github.com/hans-9/bootcamp-app
```

Open the folder in Claude Code — everything under `.claude/` is active as
project configuration, no install step needed. To run the app and exercise the
workflows against real data:

```bash
npm install
npm run dev      # client on http://localhost:3000, API on :3001
```

Other commands: `npm run dev -w server` (server only), `npm run dev -w client`
(client only), `npm run build` (build the client), `npm start` (production
server, serves API + built client). The only runtime variable is `PORT`
(defaults to 3001); deploy config lives in [`render.yaml`](./render.yaml).

## Examples

Two worked examples — each is a prompt I actually used, what Claude did, and the
result:

- [**Build the Flaky Test Tracker**](examples/flaky-test-tracker.md) — plan mode →
  the `flake-analyzer` subagent → a PostToolUse hook → a live Discord alert.
- [**QA-review a change before shipping**](examples/qa-review-a-change.md) — the
  `qa-reviewer` subagent returns a severity-grouped risk report; reusable on any diff.

## What's inside

Every item below is referenced by the manifest at
[`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json).

**Slash commands** — [`.claude/commands/`](./.claude/commands/)
- `/flaky-triage` — rank which flaky tests to fix first and why.
- `/repro-steps` — turn a rough bug description into clean numbered repro steps.
- `/api-route` — scaffold an Express route to the repo's conventions.

**Skills** — [`.claude/skills/`](./.claude/skills/)
- `/new-test` — write a single manual test case (saved to `tests/manual/`).
- `/bug-report` — file a bug report through four questions (saved to `tests/bugs/`).
- `/feature-spec` — define a feature spec (saved to `docs/specs/`).
- `/qa-review` — review code from a QA/risk angle.
- `/test-generator` — a full ISTQB test suite from a feature description.
- `commit-this` — split working-tree changes into clean conventional commits.

**Subagents** — [`.claude/agents/`](./.claude/agents/)
- `flake-analyzer` — writes a grounded root-cause hypothesis per flaky test.
- `qa-reviewer` — read-only, severity-grouped risk review of a change.
- `release-notes-writer` — a changelog from commits + resolved bugs.
- `test-writer` — a complete manual test suite from a feature description.

**Hooks** — [`.claude/hooks/`](./.claude/hooks/) (portable fragment: [`hooks.json`](./.claude/hooks/hooks.json))
- `check-response-shape.sh` — warns when a route handler bypasses the
  `{ success, data, error }` envelope.
- `check-severity-enum.sh` — warns on severity words outside
  `Critical | Major | Minor | Trivial`.
- Also bundled: `check-precommit-gate.sh` (audits staged comments) and
  `recompute-flakes.mjs` (recomputes the flake leaderboard and posts a Discord
  alert on a new flake).

**The app** — `client/` (React + Vite SPA) and `server/` (Express +
`better-sqlite3`), an npm-workspaces monorepo. In dev, Vite proxies `/api` to the
server; in production one Express service serves both the API and the built
client. Hosted on [Render](https://render.com)'s free tier (spins down after
15 min idle; SQLite is ephemeral and reseeds on restart).

## License

[MIT](./LICENSE)
