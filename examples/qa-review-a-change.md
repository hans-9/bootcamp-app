# QA-review a change before shipping

Uses the **qa-reviewer subagent** (and the matching `/qa-review` skill) to get a
prioritized, severity-grouped risk report on a change — without touching the code.

## Prompt I typed

> dispatch qa-reviewer

(After building the Flaky Test Tracker, to find what could go wrong before I shipped it.)

## What Claude did

1. Launched the `qa-reviewer` subagent (read-only — `Read` + `Grep` only).
2. Read the new feature's files and looked for what could break: missing
   validation, error/empty-state handling, and edge cases.
3. Returned findings grouped by severity (Critical / Major / Minor / Trivial),
   each with a repo-relative `path:line` reference and a one-line "why it matters".

## Result

- Reported **0 critical, 3 major, 6 minor, 3 trivial**. The two highest-impact
  findings were both in the alert lifecycle:
  - a one-shot dedupe that never re-alerted a recurring flake (`server/flakes.js`),
  - an alert that could be silently lost if the Discord post failed.
- Both were fixed in commit `d69e1f7` (`fix: address flaky tracker qa review findings`):
  flake alerts now re-arm when a test settles, and recording happens only after a
  confirmed post (at-least-once instead of silently-dropped).

## Try it yourself

After making a change, run `/qa-review` (or ask Claude to "QA review this change").
Point it at a file or a diff and it returns the same severity-grouped report — a
fast gate before you open a PR.
