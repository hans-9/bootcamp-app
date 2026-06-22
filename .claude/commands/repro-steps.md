---
description: Turn a rough bug description into clean, numbered reproduction steps.
---

Rewrite the bug described below into a report that follows this repo's conventions (see CLAUDE.md → Bug Report Fields and Test Case Rules).

Rules:
- One observable action per step — never "do X, then Y" crammed into one step.
- Use the standard test data so it's reproducible: valid account `test@example.com` / `Password123`; wrong password `wrong123`; non-existent user `ghost@example.com`.
- Output the Bug Report fields: **title** · **steps to reproduce** (numbered) · **expected** · **actual** · **severity** (Critical / Major / Minor / Trivial).
- Clear, direct, active voice. State what happens, not what "should" happen.

Bug description:
$ARGUMENTS
