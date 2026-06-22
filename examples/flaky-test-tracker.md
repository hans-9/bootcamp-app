# Build the Flaky Test Tracker (plan → subagent → hook → Discord)

This is the flagship workflow the kit was built around: it uses **plan mode**, the
**flake-analyzer subagent**, the **PostToolUse hook**, and the **Discord MCP**
together.

## Prompt I typed

> Draft a build plan in plan mode for a Flaky Test Tracker: a `/flaky-tests` page
> that ranks the top-10 flakiest tests with an AI-written root-cause hypothesis,
> backed by the pass/fail history already in the app. Wire a flake-analyzer
> subagent at `.claude/agents/flake-analyzer.md` for the hypotheses, and a
> PostToolUse hook that recomputes the leaderboard after each recorded result and
> posts a Discord alert when a new flake appears. If there aren't enough seed runs
> to make flakiness obvious, add some first.

## What Claude did

1. Drafted the architecture in **plan mode** and asked me to choose the flakiness
   metric, seed strategy, and page scope before writing any code.
2. Added an idempotent `seedFlakyRuns()` to `server/db.js` so several tests pass on
   some runs and fail on others.
3. Built `GET /api/flaky-tests` (`server/routes/flaky-tests.js`) and the
   `/flaky-tests` page (`client/src/pages/FlakyTestsPage.jsx`) — leaderboard with
   a fail-rate bar, volatility badge, pass/fail sparkline, and a hypothesis column.
4. Created the **flake-analyzer subagent** (`.claude/agents/flake-analyzer.md`),
   which reads each test's history + failure notes and writes one grounded
   hypothesis per test.
5. Wired the **PostToolUse hook** (`.claude/hooks/recompute-flakes.mjs` +
   `.claude/settings.json`): after `record-result.js` writes a result, it
   recomputes the board, detects a *new* flake, and an agent stage posts to Discord.

## Result

- Page live at `/flaky-tests` — top tests ranked by fail rate (57% → 45% → 33%),
  each with a specific hypothesis (e.g. *"Log In button needs two clicks before the
  form submits — a UI timing bug"*).
- A real alert posted to Discord `#general`:

  > 🚨 New flaky test detected
  > **Empty login form shows validation errors** — 33% fail ratio, 1 flip
  > The two recent failures are both CI timeouts waiting for the dashboard…

- Shipped in commit `05fd270` (`feat: add flaky test tracker with discord alerts`).
