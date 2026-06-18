# Manual Test Cases — Test Runs Feature

Covers the `/test-runs` list page (`client/src/pages/TestRunsPage.jsx`), the per-run detail page (`client/src/pages/TestRunDetailPage.jsx`), and the backend rules in `server/routes/test-runs.js`.

## Assumptions

- The app is running on the standard ports (client 3000, server 3001) with the seeded data: at least the suite "Login flow" (3 cases) and "Session & validation" (3 cases), plus the five seeded test cases.
- A "1-case suite" used in boundary tests is created on demand by making a new suite and adding exactly one test case to it.
- A non-existent run ID is `999999`; a non-existent result ID is `999999`. A non-existent suite ID is `999999`.
- `RESULT_STATUSES` is exactly `passed`, `failed`, `skipped`. Run statuses are exactly `running`, `passed`, `failed`.
- `GITHUB_MCP_TOKEN` is not set in the local environment, so GitHub issue creation is skipped and `issue_url` stays `null`. Scenarios that require the token are marked as integration scenarios and may be unverifiable locally; they read against repo `hans-9/bootcamp-app`.
- `created_by` is optional; when omitted it is stored as an empty string after trim.
- `notes` is optional; it is trimmed before storage.
- All API responses use the shape `{ success, data, error }`.

---

## List page (`/test-runs`)

### List page renders all runs with their summary fields

- **Preconditions:** App is running with at least one completed and one running test run.
- **Steps:**
  1. Open `/test-runs`.
- **Expected result:** Each run row shows suite name, status, pass_count, fail_count, skip_count, start_time, and end_time.
- **Severity:** Major
- **Status:** draft

### Runs are ordered newest-started first

- **Preconditions:** App is running with at least two runs created at different times.
- **Steps:**
  1. Open `/test-runs`.
- **Expected result:** Runs appear in descending `start_time` order (most recently started run is at the top).
- **Severity:** Minor
- **Status:** draft

### Each run row shows its joined suite name

- **Preconditions:** App is running. A run exists for the "Login flow" suite.
- **Steps:**
  1. Open `/test-runs`.
- **Expected result:** The run for "Login flow" displays the suite name "Login flow", not just the suite ID.
- **Severity:** Major
- **Status:** draft

### Pass/fail/skip counts are color-coded

- **Preconditions:** App is running. A completed run has at least one pass, one fail, and one skip.
- **Steps:**
  1. Open `/test-runs`.
- **Expected result:** The pass count, fail count, and skip count are shown with distinct colors (e.g. green pass, red fail, neutral skip).
- **Severity:** Trivial
- **Status:** draft

### Empty state when no runs exist

- **Preconditions:** App is running with zero test runs in the database.
- **Steps:**
  1. Open `/test-runs`.
- **Expected result:** An empty-state message indicates there are no runs yet; the page does not crash and no error is shown.
- **Severity:** Minor
- **Status:** draft

### Clicking a run row navigates to its detail page

- **Preconditions:** App is running. At least one run is visible in the list.
- **Steps:**
  1. Click a run row.
- **Expected result:** The browser navigates to `/test-runs/:id` for that run and the detail page loads.
- **Severity:** Major
- **Status:** draft

---

## Create run (`POST /api/test-runs`)

### Create a run from a suite with cases (happy path)

- **Preconditions:** App is running. The "Login flow" suite has 3 cases at sort_order 0, 1, 2.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: <Login flow id> }`.
- **Expected result:** HTTP 201; the run is created with status `running`, pass_count/fail_count/skip_count all 0, a `start_time`, no `end_time`, and one pending `test_run_results` row per case (3 rows) returned in suite sort order.
- **Severity:** Major
- **Status:** draft

### Created run includes results in suite sort order

- **Preconditions:** App is running. The "Login flow" suite cases are ordered A, B, C by sort_order.
- **Steps:**
  1. Send `POST /api/test-runs` with the "Login flow" suite ID.
- **Expected result:** The returned `results` array lists the cases in order A, B, C (ascending `sort_order`), each with `result` null and `case_title` set.
- **Severity:** Major
- **Status:** draft

### Create a run with optional created_by set

- **Preconditions:** App is running. A suite with cases exists.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: <id>, created_by: "qa" }`.
- **Expected result:** HTTP 201; the run is created and `created_by` is stored as `qa`.
- **Severity:** Minor
- **Status:** draft

### Create a run with created_by omitted stores empty string

- **Preconditions:** App is running. A suite with cases exists.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: <id> }` and no `created_by`.
- **Expected result:** HTTP 201; the run is created with `created_by` stored as an empty string.
- **Severity:** Trivial
- **Status:** draft

### Create a run from a one-case suite (boundary: single case)

- **Preconditions:** App is running. A suite contains exactly one test case.
- **Steps:**
  1. Send `POST /api/test-runs` with the one-case suite ID.
- **Expected result:** HTTP 201; the run is `running` with exactly one pending result row.
- **Severity:** Minor
- **Status:** draft

### Create a run with a numeric-string suite_id is accepted

- **Preconditions:** App is running. A suite with cases exists at ID `1`.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: "1" }`.
- **Expected result:** HTTP 201; `Number("1")` is a positive integer, so the run is created.
- **Severity:** Minor
- **Status:** draft

### Create a run with a missing suite_id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `POST /api/test-runs` with an empty body `{}`.
- **Expected result:** HTTP 400 with "A numeric suite_id is required." (`Number(undefined)` is NaN).
- **Severity:** Major
- **Status:** draft

### Create a run with a non-numeric suite_id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: "abc" }`.
- **Expected result:** HTTP 400 with "A numeric suite_id is required."
- **Severity:** Major
- **Status:** draft

### Create a run with suite_id = 0 returns 400 (boundary: min - 1)

- **Preconditions:** App is running.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: 0 }`.
- **Expected result:** HTTP 400 with "A numeric suite_id is required." (must be > 0).
- **Severity:** Major
- **Status:** draft

### Create a run with a negative suite_id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: -5 }`.
- **Expected result:** HTTP 400 with "A numeric suite_id is required."
- **Severity:** Minor
- **Status:** draft

### Create a run with a fractional suite_id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: 1.5 }`.
- **Expected result:** HTTP 400 with "A numeric suite_id is required." (`Number.isInteger(1.5)` is false).
- **Severity:** Minor
- **Status:** draft

### Create a run for a non-existent suite returns 404

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Send `POST /api/test-runs` with `{ suite_id: 999999 }`.
- **Expected result:** HTTP 404 with "Suite not found."
- **Severity:** Major
- **Status:** draft

### Create a run for a suite with no cases returns 400

- **Preconditions:** App is running. A suite exists with zero cases attached.
- **Steps:**
  1. Send `POST /api/test-runs` with the empty suite's ID.
- **Expected result:** HTTP 400 with "Suite has no test cases."; no run is created.
- **Severity:** Major
- **Status:** draft

---

## Get run (`GET /api/test-runs/:id`)

### Get an existing run returns it with ordered results

- **Preconditions:** App is running. A run exists with several result rows.
- **Steps:**
  1. Send `GET /api/test-runs/<existing run id>`.
- **Expected result:** HTTP 200; the run is returned with `suite_name` joined and a `results` array ordered by `sort_order` then `id`.
- **Severity:** Major
- **Status:** draft

### Get a non-existent run returns 404

- **Preconditions:** App is running. No run with ID `999999` exists.
- **Steps:**
  1. Send `GET /api/test-runs/999999`.
- **Expected result:** HTTP 404 with "Run not found."
- **Severity:** Major
- **Status:** draft

### Get a run with a non-numeric id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-runs/abc`.
- **Expected result:** HTTP 400 with "Invalid run id."
- **Severity:** Major
- **Status:** draft

### Get a run with id = 0 returns 400 (boundary: min - 1)

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-runs/0`.
- **Expected result:** HTTP 400 with "Invalid run id." (must be > 0).
- **Severity:** Minor
- **Status:** draft

### Get a run with a negative id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-runs/-1`.
- **Expected result:** HTTP 400 with "Invalid run id."
- **Severity:** Minor
- **Status:** draft

### Detail page renders results and lifecycle status

- **Preconditions:** App is running. A run exists with mixed recorded and pending results.
- **Steps:**
  1. Open `/test-runs/<run id>`.
- **Expected result:** The detail page shows the run status, each result row with its current outcome, notes, and any issue link; pending rows are clearly marked.
- **Severity:** Major
- **Status:** draft

---

## Record a result (`PATCH /api/test-runs/:id/results/:resultId`)

### Record a result as passed (happy path)

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send `PATCH /api/test-runs/<id>/results/<resultId>` with `{ result: "passed" }`.
- **Expected result:** HTTP 200; the result is set to `passed`, `failed_at` stays null, and the run's pass_count increments.
- **Severity:** Major
- **Status:** draft

### Record a result as skipped

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send `PATCH /api/test-runs/<id>/results/<resultId>` with `{ result: "skipped" }`.
- **Expected result:** HTTP 200; the result is set to `skipped`, `failed_at` stays null, and the run's skip_count increments.
- **Severity:** Major
- **Status:** draft

### Record a result as failed sets failed_at

- **Preconditions:** App is running. A running run has a pending result row. `GITHUB_MCP_TOKEN` is not set.
- **Steps:**
  1. Send `PATCH /api/test-runs/<id>/results/<resultId>` with `{ result: "failed", notes: "assertion failed" }`.
- **Expected result:** HTTP 200; the result is `failed`, `failed_at` is set to a timestamp, fail_count increments, and `issue_url` stays null (no token).
- **Severity:** Major
- **Status:** draft

### Record a result with notes stores trimmed notes

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "  flaky selector  " }`.
- **Expected result:** HTTP 200; `notes` is stored as `flaky selector` (leading/trailing whitespace trimmed).
- **Severity:** Minor
- **Status:** draft

### Record a result with duration_ms = 0 is accepted (boundary: min)

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed", duration_ms: 0 }`.
- **Expected result:** HTTP 200; `duration_ms` is stored as 0 (0 is a valid non-negative integer).
- **Severity:** Minor
- **Status:** draft

### Record a result with a positive duration_ms is accepted

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed", duration_ms: 1500 }`.
- **Expected result:** HTTP 200; `duration_ms` is stored as 1500.
- **Severity:** Trivial
- **Status:** draft

### Record a result with a negative duration_ms returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed", duration_ms: -1 }`.
- **Expected result:** HTTP 400 with "duration_ms must be a non-negative integer."; the result is unchanged.
- **Severity:** Major
- **Status:** draft

### Record a result with a fractional duration_ms returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed", duration_ms: 12.5 }`.
- **Expected result:** HTTP 400 with "duration_ms must be a non-negative integer." (`Number.isInteger(12.5)` is false).
- **Severity:** Minor
- **Status:** draft

### Record a result with a non-numeric duration_ms returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed", duration_ms: "fast" }`.
- **Expected result:** HTTP 400 with "duration_ms must be a non-negative integer." (`Number("fast")` is NaN).
- **Severity:** Minor
- **Status:** draft

### Record a result with duration_ms omitted stores null

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "passed" }` and no `duration_ms`.
- **Expected result:** HTTP 200; `duration_ms` is stored as null (the field is optional).
- **Severity:** Trivial
- **Status:** draft

### Record with an invalid result value returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "blocked" }`.
- **Expected result:** HTTP 400 with "result must be one of: passed, failed, skipped."
- **Severity:** Major
- **Status:** draft

### Record with a missing result value returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with an empty body `{}`.
- **Expected result:** HTTP 400 with "result must be one of: passed, failed, skipped." (empty string after fallback/trim).
- **Severity:** Major
- **Status:** draft

### Record with a result value differing only by case returns 400

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "Passed" }`.
- **Expected result:** HTTP 400 with "result must be one of: passed, failed, skipped." (comparison is case-sensitive).
- **Severity:** Minor
- **Status:** draft

### Record with a result value padded with whitespace is trimmed then accepted

- **Preconditions:** App is running. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "  passed  " }`.
- **Expected result:** HTTP 200; the value is trimmed to `passed` and accepted.
- **Severity:** Minor
- **Status:** draft

### Record with an invalid run id returns 400

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PATCH /api/test-runs/abc/results/1` with `{ result: "passed" }`.
- **Expected result:** HTTP 400 with "Invalid run id."
- **Severity:** Major
- **Status:** draft

### Record with run id = 0 returns 400 (boundary: min - 1)

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PATCH /api/test-runs/0/results/1` with `{ result: "passed" }`.
- **Expected result:** HTTP 400 with "Invalid run id."
- **Severity:** Minor
- **Status:** draft

### Record with an invalid result id returns 400

- **Preconditions:** App is running. A valid run exists.
- **Steps:**
  1. Send `PATCH /api/test-runs/<run id>/results/abc` with `{ result: "passed" }`.
- **Expected result:** HTTP 400 with "Invalid result id."
- **Severity:** Major
- **Status:** draft

### Record with result id = 0 returns 400 (boundary: min - 1)

- **Preconditions:** App is running. A valid run exists.
- **Steps:**
  1. Send `PATCH /api/test-runs/<run id>/results/0` with `{ result: "passed" }`.
- **Expected result:** HTTP 400 with "Invalid result id."
- **Severity:** Minor
- **Status:** draft

### Record against a non-existent run returns 404

- **Preconditions:** App is running. No run with ID `999999` exists.
- **Steps:**
  1. Send `PATCH /api/test-runs/999999/results/1` with `{ result: "passed" }`.
- **Expected result:** HTTP 404 with "Run not found."
- **Severity:** Major
- **Status:** draft

### Record a result that belongs to a different run returns 404

- **Preconditions:** App is running. Run A exists and result ID `R` belongs to run B (a different run).
- **Steps:**
  1. Send `PATCH /api/test-runs/<run A id>/results/<R>` with `{ result: "passed" }`.
- **Expected result:** HTTP 404 with "Result not found." (the result does not belong to run A).
- **Severity:** Major
- **Status:** draft

### Record against a non-existent result id returns 404

- **Preconditions:** App is running. A running run exists with no result `999999`.
- **Steps:**
  1. Send `PATCH /api/test-runs/<run id>/results/999999` with `{ result: "passed" }`.
- **Expected result:** HTTP 404 with "Result not found."
- **Severity:** Minor
- **Status:** draft

### Validation order: invalid result value is rejected before the run lookup

- **Preconditions:** App is running. No run with ID `999999` exists.
- **Steps:**
  1. Send `PATCH /api/test-runs/999999/results/1` with `{ result: "blocked" }`.
- **Expected result:** HTTP 400 with "result must be one of: passed, failed, skipped." (result validation runs before the run existence check).
- **Severity:** Minor
- **Status:** draft

---

## Run lifecycle and recompute

### Run stays running while any result is still pending

- **Preconditions:** App is running. A 3-case running run has all results pending.
- **Steps:**
  1. Record one result as `passed`.
- **Expected result:** HTTP 200; the run status stays `running`, `end_time` stays null, and pass_count is 1 (two results still pending).
- **Severity:** Major
- **Status:** draft

### Recording the last pending result flips the run to passed

- **Preconditions:** App is running. A run has every result recorded as `passed` except one final pending row.
- **Steps:**
  1. Record the final pending result as `passed`.
- **Expected result:** HTTP 200; the run status becomes `passed`, `end_time` is set, and pending count is 0.
- **Severity:** Major
- **Status:** draft

### Recording the last pending result flips the run to failed when any failed

- **Preconditions:** App is running. A run has one result already `failed` and one final pending row.
- **Steps:**
  1. Record the final pending result as `passed`.
- **Expected result:** HTTP 200; the run status becomes `failed` (any failure makes the run fail), and `end_time` is set.
- **Severity:** Major
- **Status:** draft

### A one-case run closes to passed after the only result is recorded (boundary)

- **Preconditions:** App is running. A one-case run is `running` with its single result pending.
- **Steps:**
  1. Record the single result as `passed`.
- **Expected result:** HTTP 200; the run immediately becomes `passed` with `end_time` set, since no results remain pending.
- **Severity:** Minor
- **Status:** draft

### A run with only skips and passes closes to passed

- **Preconditions:** App is running. A 2-case run has one result pending; the other is `skipped`.
- **Steps:**
  1. Record the remaining result as `passed`.
- **Expected result:** HTTP 200; the run becomes `passed` (skips do not cause failure) with `end_time` set.
- **Severity:** Minor
- **Status:** draft

### Updating a result on a closed run returns 409

- **Preconditions:** App is running. A run is closed with status `passed` (all results recorded).
- **Steps:**
  1. Send a PATCH to change one of its results to `failed`.
- **Expected result:** HTTP 409 with "Run is already closed."; no result or count changes.
- **Severity:** Major
- **Status:** draft

### Closed-check runs before the result-belongs-to-run check

- **Preconditions:** App is running. A closed run exists; result ID `999999` does not belong to it.
- **Steps:**
  1. Send `PATCH /api/test-runs/<closed run id>/results/999999` with `{ result: "passed" }`.
- **Expected result:** HTTP 409 with "Run is already closed." (the closed check fires before the result lookup).
- **Severity:** Minor
- **Status:** draft

---

## GitHub integration (may be unverifiable locally)

### First failure on a result creates a GitHub issue and stores its URL

- **Preconditions:** App is running with a valid `GITHUB_MCP_TOKEN` set and access to repo `hans-9/bootcamp-app`. A running run has a pending result whose `issue_url` is null.
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "login button missing" }`.
- **Expected result:** HTTP 200; a GitHub issue titled `Test failed: <case title>` is created with the notes as the body, and the result's `issue_url` is stored.
- **Severity:** Major
- **Status:** draft

### Re-failing the same result adds a comment instead of a new issue

- **Preconditions:** App is running with a valid `GITHUB_MCP_TOKEN`. A result already has an `issue_url` from a prior failure, and its run is still `running`.
- **Steps:**
  1. Send another PATCH with `{ result: "failed", notes: "still broken" }` for that same result.
- **Expected result:** HTTP 200; no new issue is created; a comment beginning `**Re-failed:**` is added to the existing issue and `issue_url` is unchanged.
- **Severity:** Major
- **Status:** draft

### Failure with no token still records the result and leaves issue_url null

- **Preconditions:** App is running with `GITHUB_MCP_TOKEN` unset. A running run has a pending result row.
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "no token here" }`.
- **Expected result:** HTTP 200; the result is `failed` with `failed_at` set and fail_count incremented; `issue_url` stays null and no error surfaces.
- **Severity:** Major
- **Status:** draft

### Failure with empty notes uses the default issue body

- **Preconditions:** App is running with a valid `GITHUB_MCP_TOKEN`. A running run has a pending result whose `issue_url` is null.
- **Steps:**
  1. Send a PATCH with `{ result: "failed" }` and no notes.
- **Expected result:** HTTP 200; the created issue body reads "No failure notes provided."
- **Severity:** Minor
- **Status:** draft

### GitHub API error during issue creation does not fail the request

- **Preconditions:** App is running with a `GITHUB_MCP_TOKEN` that the GitHub API rejects (non-OK response).
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "x" }` on a pending result.
- **Expected result:** HTTP 200; the result is still recorded as `failed`, `issue_url` stays null (githubFetch returns null on non-OK), and the run recompute still runs.
- **Severity:** Major
- **Status:** draft

---

## Edge cases — concurrency, stale state, repeated actions

### Recording the same result twice as passed is idempotent for counts

- **Preconditions:** App is running. A running run has a pending result.
- **Steps:**
  1. Record the result as `passed`.
  2. Record the same result as `passed` again (run still has other pending rows).
- **Expected result:** Both PATCHes return 200; the result stays `passed` and pass_count reflects the result counted once (recompute is a full re-tally, not an increment).
- **Severity:** Minor
- **Status:** draft

### Changing a result from passed to failed updates counts and sets failed_at

- **Preconditions:** App is running. A running run has a result recorded `passed` and at least one other row still pending.
- **Steps:**
  1. Send a PATCH changing that result to `failed`.
- **Expected result:** HTTP 200; pass_count drops, fail_count rises, and `failed_at` is now set for that result.
- **Severity:** Major
- **Status:** draft

### Changing a result from failed back to passed clears failed_at

- **Preconditions:** App is running. A running run has a result recorded `failed` (with `failed_at` set) and another row still pending.
- **Steps:**
  1. Send a PATCH changing that result to `passed`.
- **Expected result:** HTTP 200; `failed_at` is reset to null (set only when result is `failed`) and fail_count drops.
- **Severity:** Major
- **Status:** draft

### Double-submitting the last result does not reopen a closed run

- **Preconditions:** App is running. A run has one final pending result.
- **Steps:**
  1. Record the final result as `passed`, closing the run.
  2. Immediately send the same PATCH again.
- **Expected result:** The first PATCH returns 200 and closes the run; the second returns 409 "Run is already closed."
- **Severity:** Major
- **Status:** draft

### Stale detail tab attempts to record after the run already closed elsewhere

- **Preconditions:** App is running. A run is open in two tabs with one pending result; another tab records that result and closes the run.
- **Steps:**
  1. In the stale tab, submit a result for the now-recorded row.
- **Expected result:** HTTP 409 "Run is already closed."; the stale change is not applied and the UI surfaces the closed state.
- **Severity:** Major
- **Status:** draft

### Notes with special characters and emoji are stored without corruption

- **Preconditions:** App is running. A running run has a pending result.
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "Crash on <save> — café 🚀 日本語" }`.
- **Expected result:** HTTP 200; the notes are stored and rendered on the detail page exactly as entered.
- **Severity:** Minor
- **Status:** draft

### Very long notes are accepted and rendered without breaking layout

- **Preconditions:** App is running. A running run has a pending result.
- **Steps:**
  1. Send a PATCH with `{ result: "failed", notes: "<5,000-character string>" }`.
- **Expected result:** HTTP 200; the notes are stored in full and the detail page renders them without crashing or breaking layout.
- **Severity:** Minor
- **Status:** draft

### Deleting the underlying suite does not break an existing run's detail page

- **Preconditions:** App is running. A run exists for a suite that is then deleted through the suites feature.
- **Steps:**
  1. Delete the suite the run belongs to.
  2. Open the run's detail page.
- **Expected result:** Document the observed behavior: either the run still loads with its stored results, or the suite JOIN drops it. Note that `getRunWithResults` inner-joins `test_suites`, so a deleted suite makes the run unfetchable (404). Verify and record which occurs.
- **Severity:** Major
- **Status:** draft
