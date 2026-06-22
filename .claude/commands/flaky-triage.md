---
description: Triage the flaky-test leaderboard — rank which flakes to fix first and why.
---

Produce a prioritized fix plan for the current flaky tests.

1. Load the data: run `node server/scripts/flaky-history.js` from the repo root (or `GET /api/flaky-tests` if the server is up).
2. For each flaky test, read its fail ratio, flip count, `recent_results`, and failure notes.
3. Group the flakes by likely root cause: race / shared-state, environment / CI timeout, a real regression, or UI timing.
4. Rank the fix order by fail ratio first, but flag any high-flip "oscillating" test as urgent even at a lower ratio — that pattern points at a race, not a clean failure.
5. Output a short triage table: rank · test · likely cause · recommended first action.

Focus area (optional): $ARGUMENTS
