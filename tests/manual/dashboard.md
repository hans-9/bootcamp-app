# Manual Test Cases — Dashboard (`/dashboard`, `GET /api/dashboard/metrics`)

## Assumptions

- The backend can be seeded/edited directly (or via the app) to reach specific data states (empty DB, draft-only cases, specific run/bug states). Where a case needs a precise count of rows, the tester arranges that state first.
- Network failures are simulated by stopping the server or blocking `/api/dashboard/metrics` in the browser devtools.
- "Recent" ordering uses `start_time DESC, id DESC` for runs and `created_at DESC, id DESC` for activity; ties break on higher id first.
- A bug whose status is one of `open`, `in-progress`, `reopened` counts as open; `resolved` and `closed` do not.
- The skill defines no `min`/`max` numeric input for this read-only endpoint, so length-limit boundary rows (min−1/max+1) do not apply; the relevant boundaries here are count boundaries (0, 1, 10, 11) and the null/empty conditions. Noted per the skill's "skip a row only when it can't apply" rule.

---

## Happy path

### Dashboard loads and renders all four metric cards with populated data

- **Preconditions:** Database has at least one test case, one completed run, and one bug. Server is running.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Wait for the loading skeleton to disappear.
- **Expected result:** Four metric cards appear — Total test cases, Pass rate, Open bugs, Avg run duration — each showing a value, and the header shows "Updated … ago · refreshes every 30s".
- **Severity:** Major
- **Status:** draft

### Root path redirects to the dashboard

- **Preconditions:** Server is running.
- **Steps:**
  1. Navigate to `/`.
- **Expected result:** The browser lands on `/dashboard` and the Dashboard page renders.
- **Severity:** Minor
- **Status:** draft

### Recent test runs table shows suite, status, pass, fail and relative time

- **Preconditions:** At least one completed run exists with a known suite name, pass_count and fail_count.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the first row of the "Recent test runs" table.
- **Expected result:** The row shows the suite name, a status pill, the pass count, the fail count, and a relative "when" value (e.g. "5m ago").
- **Severity:** Minor
- **Status:** draft

### Recent activity feed renders a status-change sentence

- **Preconditions:** A `bug_activity` row exists with action `status_change`, `new_value = resolved`, `bug_id = 42`.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the matching item in the "Recent activity" feed.
- **Expected result:** The item reads "bug #42 marked resolved".
- **Severity:** Minor
- **Status:** draft

### Endpoint returns the standard success envelope

- **Preconditions:** Server is running with seeded data.
- **Steps:**
  1. Send `GET /api/dashboard/metrics`.
- **Expected result:** Response is `{ success: true, error: null, data: { metrics, recentRuns, recentActivity } }`, where `metrics` has keys `totalCases`, `passRate`, `openBugs`, `avgDurationMs`.
- **Severity:** Major
- **Status:** draft

---

## Boundary values

### Empty database shows the empty state (passRate and avgDurationMs null)

- **Preconditions:** `test_cases`, `test_runs_v2` and `bug_activity` are all empty (0 rows).
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.metrics`.
  2. Navigate to `/dashboard`.
- **Expected result:** `passRate` is `null` and `avgDurationMs` is `null`; the page shows "Nothing to show yet. Add test cases, run a suite, or file a bug to get started." with no metric cards.
- **Severity:** Major
- **Status:** draft

### Draft-only test cases: totalCases > 0 but passRate is null

- **Preconditions:** Test cases exist but every one is status `draft`, `ready` or `skipped` (none `passed` or `failed`).
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Pass rate card.
- **Expected result:** `passRate` is `null`; the Pass rate card shows "—" with subtext "of passed + failed cases", and Total test cases shows the non-zero count.
- **Severity:** Major
- **Status:** draft

### Pass rate is 100% when all decided cases passed

- **Preconditions:** All test cases with a decided status are `passed` (e.g. 3 passed, 0 failed); draft/ready/skipped may also exist.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Pass rate card.
- **Expected result:** Pass rate shows "100%".
- **Severity:** Major
- **Status:** draft

### Pass rate is 0% when all decided cases failed

- **Preconditions:** All test cases with a decided status are `failed` (e.g. 0 passed, 4 failed).
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Pass rate card.
- **Expected result:** Pass rate shows "0%".
- **Severity:** Major
- **Status:** draft

### Pass rate rounds to nearest integer percent

- **Preconditions:** 1 passed and 2 failed cases (33.33%).
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.metrics.passRate`.
- **Expected result:** `passRate` is `33` (integer, rounded).
- **Severity:** Minor
- **Status:** draft

### openBugs is 0 when every bug is resolved or closed

- **Preconditions:** Bugs exist but all have status `resolved` or `closed`.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Open bugs card.
- **Expected result:** Open bugs shows "0".
- **Severity:** Minor
- **Status:** draft

### Recent runs shows exactly 10 when 10 runs exist

- **Preconditions:** Exactly 10 runs exist.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and count `data.recentRuns`.
- **Expected result:** `recentRuns` has exactly 10 items.
- **Severity:** Minor
- **Status:** draft

### Recent runs caps at 10 when 11 runs exist (newest-first)

- **Preconditions:** 11 runs exist with distinct, ordered `start_time` values.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.recentRuns`.
- **Expected result:** `recentRuns` has exactly 10 items, ordered newest `start_time` first, and the oldest run is excluded.
- **Severity:** Major
- **Status:** draft

### Recent activity caps at 10 when 11 activity rows exist (newest-first)

- **Preconditions:** 11 `bug_activity` rows exist with distinct, ordered `created_at` values.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.recentActivity`.
- **Expected result:** `recentActivity` has exactly 10 items, ordered newest `created_at` first, and the oldest row is excluded.
- **Severity:** Major
- **Status:** draft

### Single run formats sub-minute duration as seconds only

- **Preconditions:** Exactly one completed run lasting 8 seconds (end_time − start_time = 8000 ms); no other completed runs.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Avg run duration card.
- **Expected result:** Avg run duration shows "8s".
- **Severity:** Trivial
- **Status:** draft

### Duration over a minute formats as "Xm Ys"

- **Preconditions:** Exactly one completed run lasting 491,000 ms (8m 11s).
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Avg run duration card.
- **Expected result:** Avg run duration shows "8m 11s".
- **Severity:** Trivial
- **Status:** draft

---

## Equivalence partitions

### openBugs counts open, in-progress and reopened bugs but excludes resolved and closed

- **Preconditions:** One bug each in statuses `open`, `in-progress`, `reopened`, `resolved`, `closed`.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.metrics.openBugs`.
- **Expected result:** `openBugs` is `3` (open + in-progress + reopened only).
- **Severity:** Major
- **Status:** draft

### avgDurationMs ignores in-progress runs (only completed runs count)

- **Preconditions:** One completed run of 10,000 ms (end_time set) and one in-progress run with `end_time` null.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read `data.metrics.avgDurationMs`.
- **Expected result:** `avgDurationMs` is `10000`; the in-progress run is excluded from the average.
- **Severity:** Major
- **Status:** draft

### avgDurationMs is null when no run has completed

- **Preconditions:** Runs exist but every run has `end_time` null.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the Avg run duration card.
- **Expected result:** `avgDurationMs` is `null` and the card shows "—".
- **Severity:** Minor
- **Status:** draft

### Activity feed renders a comment action

- **Preconditions:** A `bug_activity` row with action `comment`, `bug_id = 7`.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the matching activity item.
- **Expected result:** The item reads "bug #7 got a new comment".
- **Severity:** Trivial
- **Status:** draft

### Activity feed renders an unrecognized action generically

- **Preconditions:** A `bug_activity` row with action `assigned`, `bug_id = 9`.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the matching activity item.
- **Expected result:** The item reads "bug #9 assigned".
- **Severity:** Trivial
- **Status:** draft

### Run row with failures highlights the fail count

- **Preconditions:** A run with `fail_count` greater than 0.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Inspect the Fail cell for that run row.
- **Expected result:** The fail count renders in the failed color (`--st-failed`).
- **Severity:** Trivial
- **Status:** draft

### Run row with zero failures does not highlight the fail count

- **Preconditions:** A run with `fail_count` equal to 0.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Inspect the Fail cell for that run row.
- **Expected result:** The fail count "0" renders in the default color, not the failed color.
- **Severity:** Trivial
- **Status:** draft

---

## Negative cases

### First-load failure shows the full error screen

- **Preconditions:** Server is stopped or `/api/dashboard/metrics` returns an error before the page makes its first request.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Wait for the skeleton to disappear.
- **Expected result:** The page shows "Couldn’t load the dashboard: …" with the error message; no metric cards or tables render.
- **Severity:** Major
- **Status:** draft

### Refresh failure after a good load keeps stale data and shows the stale badge

- **Preconditions:** The dashboard has loaded successfully once with data visible.
- **Steps:**
  1. Block `/api/dashboard/metrics` (e.g. stop the server) so the next background refresh fails.
  2. Wait through one 30-second refresh interval.
- **Expected result:** The previously loaded metric cards, runs and activity stay visible, and the header shows "Refresh failed — retrying every 30s" instead of "Updated … ago".
- **Severity:** Major
- **Status:** draft

### Recovery after a refresh failure clears the stale badge

- **Preconditions:** The dashboard is showing the stale badge after a failed background refresh.
- **Steps:**
  1. Restore `/api/dashboard/metrics` so it succeeds again.
  2. Wait through one 30-second refresh interval.
- **Expected result:** The stale badge is replaced by "Updated just now · refreshes every 30s" and the displayed data refreshes.
- **Severity:** Minor
- **Status:** draft

### Loading skeleton shows on first load before data arrives

- **Preconditions:** `/api/dashboard/metrics` responds with a deliberate delay.
- **Steps:**
  1. Navigate to `/dashboard`.
- **Expected result:** Four skeleton metric cards and two skeleton panels render until the response arrives, then are replaced by real content.
- **Severity:** Minor
- **Status:** draft

### Empty state does not appear when only runs exist (no test cases, no activity)

- **Preconditions:** `totalCases` is 0 and `recentActivity` is empty, but at least one run exists.
- **Steps:**
  1. Navigate to `/dashboard`.
- **Expected result:** The dashboard renders metric cards and the runs table; the "Nothing to show yet" empty state does NOT appear.
- **Severity:** Major
- **Status:** draft

---

## Edge cases

### Keyboard activation on a run row navigates to the test run

- **Preconditions:** At least one run row is visible with id `5`.
- **Steps:**
  1. Press Tab until the first run row has focus.
  2. Press Enter.
- **Expected result:** The app navigates to `/test-runs/5`.
- **Severity:** Major
- **Status:** draft

### Space key on a run row navigates without scrolling the page

- **Preconditions:** At least one run row is visible.
- **Steps:**
  1. Focus the first run row with Tab.
  2. Press Space.
- **Expected result:** The app navigates to that run's `/test-runs/:id` and the page does not scroll (default Space behavior is prevented).
- **Severity:** Minor
- **Status:** draft

### Keyboard activation on an activity item navigates to the bug

- **Preconditions:** At least one activity item is visible for `bug_id = 42`.
- **Steps:**
  1. Press Tab until the first activity item has focus.
  2. Press Enter.
- **Expected result:** The app navigates to `/bugs/42`.
- **Severity:** Major
- **Status:** draft

### Mouse click on a run row navigates to the test run

- **Preconditions:** At least one run row is visible with id `5`.
- **Steps:**
  1. Click the first run row.
- **Expected result:** The app navigates to `/test-runs/5`.
- **Severity:** Minor
- **Status:** draft

### Run rows and activity items expose link semantics to assistive tech

- **Preconditions:** At least one run row and one activity item are visible.
- **Steps:**
  1. Inspect the run row and activity item elements.
- **Expected result:** Each has `role="link"` and `tabIndex=0`; the run row has aria-label "Open test run for <suite>" and the activity item's aria-label matches its sentence.
- **Severity:** Minor
- **Status:** draft

### Suite name with unicode and emoji renders intact

- **Preconditions:** A run whose suite name is "Café ✅ 测试 suite".
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the suite cell for that run.
- **Expected result:** The suite name renders exactly as "Café ✅ 测试 suite" without corruption or truncation.
- **Severity:** Trivial
- **Status:** draft

### Very long suite name does not break the table layout

- **Preconditions:** A run whose suite name is 300 characters long.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Inspect the runs table.
- **Expected result:** The row renders within the table without overflowing the page or hiding other columns.
- **Severity:** Trivial
- **Status:** draft

### Tied start_times order by higher id first

- **Preconditions:** Two runs share the same `start_time`; their ids are 11 and 12.
- **Steps:**
  1. Send `GET /api/dashboard/metrics` and read the order of those two runs in `data.recentRuns`.
- **Expected result:** Run id 12 appears before run id 11.
- **Severity:** Trivial
- **Status:** draft

### Activity item with null created_at shows an em dash for the time

- **Preconditions:** A `bug_activity` row whose `created_at` is null.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the time of that activity item.
- **Expected result:** The activity time shows "—" and the sentence still renders.
- **Severity:** Trivial
- **Status:** draft

### Run started under one minute ago shows "just now"

- **Preconditions:** A run with `start_time` 20 seconds in the past.
- **Steps:**
  1. Navigate to `/dashboard`.
  2. Read the "When" cell for that run.
- **Expected result:** The cell shows "just now".
- **Severity:** Trivial
- **Status:** draft

### Auto-refresh updates metric values without a manual reload

- **Preconditions:** The dashboard is loaded; a new bug is then created server-side, raising openBugs.
- **Steps:**
  1. With the dashboard open, create a new open bug in the backend.
  2. Wait through one 30-second refresh interval.
- **Expected result:** The Open bugs card increases to the new count without a page reload.
- **Severity:** Minor
- **Status:** draft

### Navigating away clears the refresh interval

- **Preconditions:** The dashboard is loaded and auto-refreshing.
- **Steps:**
  1. Navigate from `/dashboard` to another route.
  2. Monitor network requests for one minute.
- **Expected result:** No further `/api/dashboard/metrics` requests fire after leaving the page (the interval is cleared on unmount).
- **Severity:** Minor
- **Status:** draft
