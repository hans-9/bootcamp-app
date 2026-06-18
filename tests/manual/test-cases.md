# Manual Test Cases — Test Cases Feature (list, edit, delete, query endpoints)

Covers the `/test-cases` list page (`client/src/pages/TestCasesPage.jsx`), the edit/delete flows through the row menu and `TestCaseForm` modal (`client/src/components/TestCaseForm.jsx`), and the backend list/get/update/delete rules in `server/routes/test-cases.js`. Creation via `POST /api/test-cases` (body validation, severity/status enums, title/steps boundaries, duplicate-title warning) is covered separately in `tests/manual/post-test-cases-endpoint.md` and is not repeated here.

## Assumptions

- The app runs on the standard ports (client 3000, server 3001) and the database is seeded with enough test cases to span more than one page (at least 21) for pagination cases; where a case needs a specific count it states it in the preconditions.
- There is no separate test-case detail route. The list page is the only screen; editing opens the `TestCaseForm` modal from the row "⋯" menu, and delete is also triggered from that menu (with a `window.confirm` prompt).
- Allowed test-case statuses are exactly `draft`, `ready`, `passed`, `failed`, `skipped`. Allowed severities are exactly `Critical`, `Major`, `Minor`, `Trivial`, ranked Critical (4) > Major (3) > Minor (2) > Trivial (1).
- Pagination is fixed at 20 items per page (`perPage`). The list endpoint returns `{ items, page, perPage, total, totalPages }` wrapped in the standard `{ success, data, error }` envelope.
- `search` matches `title LIKE %search%` (case-insensitive substring per SQLite default). The `title` filter is an exact case-insensitive match (`lower(title) = lower(@title)`) and is used internally by the duplicate-title lookup, not exposed as a UI control.
- The default sort is `updated_at DESC` (newest first). `sort=severity` orders by severity rank with `updated_at DESC` as the tiebreak. `dir` accepts `asc` or `desc`; any other value falls back to `desc`. Any `sort` value other than `severity` falls back to `updated`.
- An out-of-range `page` (too high or `<= 0`) is clamped: too-high returns the last page, and `page=0`/negative is raised to page 1.
- A non-existent test-case ID is `999999`. Standard account data (`test@example.com` / `Password123`) appears only inside test-case content where it naturally fits.

---

## List page — rendering & default order

### List page renders the first page of test cases

- **Preconditions:** App is running with at least one seeded test case and no filters applied.
- **Steps:**
  1. Open `/test-cases`.
- **Expected result:** The table lists test cases, each row showing title, severity badge, status pill, and updated date; the pagination footer shows the total count and "page 1 of N".
- **Severity:** Major
- **Status:** draft

### Test cases default to newest-updated first

- **Preconditions:** App is running with at least two test cases that have different `updated_at` values.
- **Steps:**
  1. Open `/test-cases` without changing the sort.
- **Expected result:** The most recently updated test case appears at the top of the table (default `updated_at DESC`).
- **Severity:** Minor
- **Status:** draft

### Empty database shows the create-first empty state

- **Preconditions:** App is running with zero test cases and no filters applied.
- **Steps:**
  1. Open `/test-cases`.
- **Expected result:** The table body is empty and the message "No test cases match. Create your first one." is shown; no pagination footer appears.
- **Severity:** Minor
- **Status:** draft

---

## List page — search box

### Search returns titles containing the term (substring match)

- **Preconditions:** App is running. A test case titled "User logs in with valid credentials" exists.
- **Steps:**
  1. Type `logs in` into the search box.
- **Expected result:** After the debounce, only test cases whose titles contain `logs in` are listed, including "User logs in with valid credentials".
- **Severity:** Major
- **Status:** draft

### Search is case-insensitive

- **Preconditions:** App is running. A test case titled "User logs in with valid credentials" exists.
- **Steps:**
  1. Type `USER LOGS` into the search box.
- **Expected result:** The "User logs in with valid credentials" case still appears (LIKE match ignores case).
- **Severity:** Minor
- **Status:** draft

### Search with no matching title shows the no-match empty state

- **Preconditions:** App is running. No test case title contains `zzzznomatch`.
- **Steps:**
  1. Type `zzzznomatch` into the search box.
- **Expected result:** The table is empty and the message "No test cases match. Try clearing filters." is shown; no error appears.
- **Severity:** Minor
- **Status:** draft

### Clearing the search box restores the full list

- **Preconditions:** App is running. The search box currently holds `logs in` and the list is filtered.
- **Steps:**
  1. Delete all text from the search box.
- **Expected result:** After the debounce, the full unfiltered list returns in default newest-first order, reset to page 1.
- **Severity:** Minor
- **Status:** draft

### Search resets the view to page 1

- **Preconditions:** App is running with more than 20 test cases; the list is currently on page 2.
- **Steps:**
  1. Type a term that still matches many cases into the search box.
- **Expected result:** The list jumps back to page 1 of the filtered results.
- **Severity:** Minor
- **Status:** draft

### Whitespace-only search is treated as no search

- **Preconditions:** App is running. Send `GET /api/test-cases?search=%20%20%20` (three spaces).
- **Steps:**
  1. Request the list with a whitespace-only `search` value.
- **Expected result:** The search is trimmed to empty and ignored; all test cases are returned unfiltered.
- **Severity:** Minor
- **Status:** draft

### Search term with SQL wildcard characters is treated literally

- **Preconditions:** App is running. No test case title contains a literal `%`.
- **Steps:**
  1. Send `GET /api/test-cases?search=%25` (a single `%`).
- **Expected result:** The query treats `%` as a search character inside the parameter, not as a match-all wildcard; only titles containing a literal `%` match (here, none), so the result is empty rather than the whole table.
- **Severity:** Minor
- **Status:** draft

---

## List endpoint — title filter (exact, case-insensitive)

### Title filter returns only the exact-title match

- **Preconditions:** App is running. A test case titled "Valid login" exists; another titled "Valid login redirect" also exists.
- **Steps:**
  1. Send `GET /api/test-cases?title=Valid%20login`.
- **Expected result:** Only "Valid login" is returned; "Valid login redirect" is excluded (exact match, not substring).
- **Severity:** Major
- **Status:** draft

### Title filter ignores case

- **Preconditions:** App is running. A test case titled "Valid login" exists.
- **Steps:**
  1. Send `GET /api/test-cases?title=VALID%20LOGIN`.
- **Expected result:** "Valid login" is returned (`lower(title) = lower(@title)`).
- **Severity:** Minor
- **Status:** draft

### Title filter with a partial title returns nothing

- **Preconditions:** App is running. A test case titled "Valid login" exists; none is titled exactly "Valid".
- **Steps:**
  1. Send `GET /api/test-cases?title=Valid`.
- **Expected result:** No rows are returned (the filter is exact, not a prefix or substring).
- **Severity:** Minor
- **Status:** draft

### Title filter combines with search using AND

- **Preconditions:** App is running. A test case titled "Valid login" exists.
- **Steps:**
  1. Send `GET /api/test-cases?title=Valid%20login&search=redirect`.
- **Expected result:** No rows are returned, because the row must match the exact title AND contain `redirect` in its title (both clauses are ANDed).
- **Severity:** Minor
- **Status:** draft

---

## List page — status filter

### Filter by a status that has matching cases

- **Preconditions:** App is running. At least one test case has status `passed`.
- **Steps:**
  1. Open `/test-cases`.
  2. Select `Passed` in the status dropdown.
- **Expected result:** Only test cases with status `passed` are listed; the view resets to page 1.
- **Severity:** Major
- **Status:** draft

### Each valid status partition filters correctly

- **Preconditions:** App is running with at least one test case in each status.
- **Steps:**
  1. Select `Draft` in the status dropdown and note the result.
  2. Select `Ready` and note the result.
  3. Select `Passed` and note the result.
  4. Select `Failed` and note the result.
  5. Select `Skipped` and note the result.
- **Expected result:** Each selection lists only the cases whose status matches the chosen value.
- **Severity:** Minor
- **Status:** draft

### Filter by a valid status with no matching cases

- **Preconditions:** App is running. No test case has status `skipped`.
- **Steps:**
  1. Select `Skipped` in the status dropdown.
- **Expected result:** The list is empty and the "No test cases match. Try clearing filters." message is shown; no error.
- **Severity:** Minor
- **Status:** draft

### Clearing the status filter returns the full list

- **Preconditions:** App is running with the status filter set to `passed`.
- **Steps:**
  1. Select "All statuses" in the dropdown.
- **Expected result:** All test cases are listed again, reset to page 1 in default order.
- **Severity:** Minor
- **Status:** draft

### Invalid status value is ignored by the endpoint

- **Preconditions:** App is running. Send `GET /api/test-cases?status=archived`.
- **Steps:**
  1. Request the list with `status=archived`.
- **Expected result:** The unknown status is ignored (not in `STATUSES`) and all test cases are returned, as if no status filter were applied.
- **Severity:** Minor
- **Status:** draft

### A suite-only status is rejected as a filter value

- **Preconditions:** App is running. Send `GET /api/test-cases?status=in-progress`.
- **Steps:**
  1. Request the list with `status=in-progress`.
- **Expected result:** `in-progress` is not a valid test-case status, so it is ignored and all cases are returned.
- **Severity:** Minor
- **Status:** draft

---

## List endpoint — sort and direction

### Sort by severity descending puts Critical first

- **Preconditions:** App is running with test cases spanning all four severities.
- **Steps:**
  1. Send `GET /api/test-cases?sort=severity&dir=desc`.
- **Expected result:** Rows are ordered Critical, Major, Minor, Trivial; within the same severity, the most recently updated appears first.
- **Severity:** Major
- **Status:** draft

### Sort by severity ascending puts Trivial first

- **Preconditions:** App is running with test cases spanning all four severities.
- **Steps:**
  1. Send `GET /api/test-cases?sort=severity&dir=asc`.
- **Expected result:** Rows are ordered Trivial, Minor, Major, Critical; the `updated_at DESC` tiebreak still applies within a severity.
- **Severity:** Minor
- **Status:** draft

### Severity tiebreak falls back to newest-updated

- **Preconditions:** App is running. Two test cases both have severity `Major` but different `updated_at` values.
- **Steps:**
  1. Send `GET /api/test-cases?sort=severity&dir=desc`.
- **Expected result:** Among the two `Major` cases, the more recently updated appears first (`updated_at DESC` tiebreak, regardless of `dir`).
- **Severity:** Minor
- **Status:** draft

### Default sort is updated_at descending

- **Preconditions:** App is running with test cases at differing update times.
- **Steps:**
  1. Send `GET /api/test-cases` with no `sort` parameter.
- **Expected result:** Rows are ordered by `updated_at` descending (newest first).
- **Severity:** Minor
- **Status:** draft

### Sort by updated ascending lists oldest first

- **Preconditions:** App is running with test cases at differing update times.
- **Steps:**
  1. Send `GET /api/test-cases?sort=updated&dir=asc`.
- **Expected result:** Rows are ordered by `updated_at` ascending (oldest first).
- **Severity:** Minor
- **Status:** draft

### Unknown sort value falls back to updated

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-cases?sort=title`.
- **Expected result:** The unsupported `sort=title` is ignored and rows are ordered by `updated_at DESC` (only `severity` is honored; everything else defaults to `updated`).
- **Severity:** Minor
- **Status:** draft

### Unknown dir value falls back to descending

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-cases?sort=severity&dir=sideways`.
- **Expected result:** The invalid `dir` is treated as `desc`; rows order Critical first.
- **Severity:** Minor
- **Status:** draft

### Clicking the Severity header toggles sort and arrow

- **Preconditions:** App is running with several test cases of mixed severity. The list is on the default Updated sort.
- **Steps:**
  1. Click the "Severity" column header.
- **Expected result:** The list re-sorts by severity descending, a ▼ arrow appears next to "Severity", and the view resets to page 1.
- **Severity:** Minor
- **Status:** draft

### Clicking the active sort header toggles direction

- **Preconditions:** App is running with the list already sorted by Severity descending (▼ on Severity).
- **Steps:**
  1. Click the "Severity" column header again.
- **Expected result:** The direction flips to ascending, the arrow changes to ▲, and the list re-sorts Trivial first.
- **Severity:** Minor
- **Status:** draft

### Switching the sort column resets direction to descending

- **Preconditions:** App is running with the list sorted by Updated ascending (▲ on Updated).
- **Steps:**
  1. Click the "Severity" column header.
- **Expected result:** Sort switches to Severity with direction reset to descending (▼ on Severity); the previous ascending direction does not carry over.
- **Severity:** Minor
- **Status:** draft

---

## List endpoint — pagination boundaries

### Page 1 returns the first 20 items

- **Preconditions:** App is running with at least 21 test cases and no filters.
- **Steps:**
  1. Send `GET /api/test-cases?page=1`.
- **Expected result:** `items` has length 20, `page` is 1, `perPage` is 20, and `total`/`totalPages` reflect the full set.
- **Severity:** Major
- **Status:** draft

### The last page returns the remaining items

- **Preconditions:** App is running with exactly 21 test cases (so `totalPages` is 2).
- **Steps:**
  1. Send `GET /api/test-cases?page=2`.
- **Expected result:** `items` has length 1, `page` is 2, and `totalPages` is 2.
- **Severity:** Major
- **Status:** draft

### Page above the last page clamps to the last page

- **Preconditions:** App is running with 21 test cases (`totalPages` is 2).
- **Steps:**
  1. Send `GET /api/test-cases?page=99`.
- **Expected result:** The response returns the last page: `page` is 2 with the final item, not an empty `items` array.
- **Severity:** Major
- **Status:** draft

### Page 0 clamps up to page 1

- **Preconditions:** App is running with at least one test case.
- **Steps:**
  1. Send `GET /api/test-cases?page=0`.
- **Expected result:** `page` is 1 and the first page of items is returned (`Math.max(1, ...)`).
- **Severity:** Minor
- **Status:** draft

### Negative page clamps up to page 1

- **Preconditions:** App is running with at least one test case.
- **Steps:**
  1. Send `GET /api/test-cases?page=-5`.
- **Expected result:** `page` is 1 and the first page is returned.
- **Severity:** Minor
- **Status:** draft

### Non-numeric page falls back to page 1

- **Preconditions:** App is running with at least one test case.
- **Steps:**
  1. Send `GET /api/test-cases?page=abc`.
- **Expected result:** `parseInt` yields NaN, so `page` defaults to 1 and the first page is returned.
- **Severity:** Minor
- **Status:** draft

### totalPages is at least 1 when there are no cases

- **Preconditions:** App is running with zero test cases.
- **Steps:**
  1. Send `GET /api/test-cases`.
- **Expected result:** `total` is 0, `totalPages` is 1 (`Math.max(1, ...)`), `page` is 1, and `items` is empty.
- **Severity:** Minor
- **Status:** draft

### Next/Prev buttons disable at the boundaries

- **Preconditions:** App is running with more than 20 test cases (at least 2 pages); the list is on page 1.
- **Steps:**
  1. Observe the "‹ Prev" button on page 1.
  2. Click "Next ›" until the last page is reached.
- **Expected result:** "‹ Prev" is disabled on page 1; "Next ›" is disabled on the last page; the footer text updates the page number on each navigation.
- **Severity:** Minor
- **Status:** draft

### Total count uses the filtered set, not the whole table

- **Preconditions:** App is running with 30 test cases, of which 5 have status `failed`.
- **Steps:**
  1. Send `GET /api/test-cases?status=failed`.
- **Expected result:** `total` is 5 and `totalPages` is 1; the count reflects the WHERE filter, not the full table.
- **Severity:** Major
- **Status:** draft

---

## Get one — GET /api/test-cases/:id

### Get an existing test case returns it with parsed steps

- **Preconditions:** App is running. A test case with a known ID exists and its `steps` column holds a valid JSON array of strings.
- **Steps:**
  1. Send `GET /api/test-cases/:id` for that case.
- **Expected result:** HTTP 200 with `success: true` and `data.steps` returned as an array of strings (parsed from JSON), plus title, severity, status, and timestamps.
- **Severity:** Major
- **Status:** draft

### Get a non-existent test case returns 404

- **Preconditions:** App is running. No test case with ID `999999` exists.
- **Steps:**
  1. Send `GET /api/test-cases/999999`.
- **Expected result:** HTTP 404 with `error: "Test case not found."` and `data: null`.
- **Severity:** Major
- **Status:** draft

### Corrupt steps value degrades to an empty array

- **Preconditions:** App is running. A test case row exists whose `steps` column holds invalid JSON (e.g. `not-json`).
- **Steps:**
  1. Send `GET /api/test-cases/:id` for that row.
- **Expected result:** HTTP 200; `data.steps` is `[]` (the parse failure is caught) rather than a 500 error.
- **Severity:** Major
- **Status:** draft

### A corrupt-steps row does not break the list

- **Preconditions:** App is running. One row in the table has an invalid `steps` JSON value.
- **Steps:**
  1. Send `GET /api/test-cases`.
- **Expected result:** The list returns 200; the corrupt row appears with `steps: []` and all other rows render normally.
- **Severity:** Major
- **Status:** draft

---

## Edit a test case — PUT /api/test-cases/:id

### Edit a test case through the row menu (happy path)

- **Preconditions:** App is running. A test case "Old title" is visible in the list.
- **Steps:**
  1. Open the "⋯" menu on the "Old title" row.
  2. Click "Edit".
  3. Change the title to "New title".
  4. Click "Save changes".
- **Expected result:** The modal closes, the list reloads, the row shows "New title", and its `updated_at` advances to the current time.
- **Severity:** Major
- **Status:** draft

### Editing re-validates an emptied title

- **Preconditions:** App is running. The edit modal is open for an existing case.
- **Steps:**
  1. Clear the title field.
  2. Click "Save changes".
- **Expected result:** The form shows "Title is required." and the case is not updated (client-side validation blocks the request).
- **Severity:** Major
- **Status:** draft

### Editing re-validates removal of all steps

- **Preconditions:** App is running. The edit modal is open for a case with a single step.
- **Steps:**
  1. Clear the only step's text.
  2. Click "Save changes".
- **Expected result:** The form shows "Add at least one step." and the case is not updated.
- **Severity:** Major
- **Status:** draft

### Edit endpoint rejects an invalid severity

- **Preconditions:** App is running. A test case with a known ID exists.
- **Steps:**
  1. Send `PUT /api/test-cases/:id` with a valid title, steps, and expected result but `severity: "Blocker"`.
- **Expected result:** HTTP 400 with `error` listing the allowed severities; the case is unchanged.
- **Severity:** Major
- **Status:** draft

### Edit endpoint rejects an invalid status

- **Preconditions:** App is running. A test case with a known ID exists.
- **Steps:**
  1. Send `PUT /api/test-cases/:id` with `status: "archived"` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` listing the allowed statuses; the case is unchanged.
- **Severity:** Major
- **Status:** draft

### Edit a non-existent test case returns 404

- **Preconditions:** App is running. No test case with ID `999999` exists.
- **Steps:**
  1. Send `PUT /api/test-cases/999999` with a fully valid body.
- **Expected result:** HTTP 404 with `error: "Test case not found."`; the 404 check happens before validation.
- **Severity:** Major
- **Status:** draft

### Update trims and stores edited steps

- **Preconditions:** App is running. The edit modal is open for an existing case.
- **Steps:**
  1. Add a step with leading and trailing spaces around "  log in  ".
  2. Add a second, blank step.
  3. Click "Save changes".
- **Expected result:** The blank step is dropped and the kept step is stored trimmed as "log in" (server `map(trim).filter(Boolean)`).
- **Severity:** Minor
- **Status:** draft

### Editing without changing fields still advances updated_at

- **Preconditions:** App is running. The edit modal is open for an existing case; note its current `updated_at`.
- **Steps:**
  1. Click "Save changes" without altering any field.
- **Expected result:** The update succeeds and `updated_at` is set to a newer timestamp, moving the row toward the top of the default newest-first list.
- **Severity:** Trivial
- **Status:** draft

---

## Optimistic concurrency — stale update

### Stale edit is rejected with 409

- **Preconditions:** App is running. A test case has stored `updated_at` value `T2`; an older copy with `updated_at` `T1` is held by the client.
- **Steps:**
  1. Send `PUT /api/test-cases/:id` with a valid body that includes `updated_at: "T1"`.
- **Expected result:** HTTP 409 with `error: "This test case changed since you opened it. Reload and try again."`; the stored row is unchanged.
- **Severity:** Major
- **Status:** draft

### Edit with the current updated_at succeeds

- **Preconditions:** App is running. A test case has stored `updated_at` value `T2`.
- **Steps:**
  1. Send `PUT /api/test-cases/:id` with a valid body that includes `updated_at: "T2"`.
- **Expected result:** The update succeeds (the supplied timestamp matches the stored one) and `updated_at` is bumped to a newer value.
- **Severity:** Major
- **Status:** draft

### Edit without an updated_at field skips the concurrency check

- **Preconditions:** App is running. A test case with a known ID exists.
- **Steps:**
  1. Send `PUT /api/test-cases/:id` with a valid body that omits `updated_at`.
- **Expected result:** The concurrency guard is skipped (it only triggers when `updated_at` is present) and the update succeeds.
- **Severity:** Minor
- **Status:** draft

### Two sequential edits from the same opened copy: the second is stale

- **Preconditions:** App is running. Two browser tabs both opened the same test case at `updated_at` `T1`.
- **Steps:**
  1. In tab A, save an edit successfully (stored `updated_at` becomes `T2`).
  2. In tab B, save an edit that still sends `updated_at: "T1"`.
- **Expected result:** Tab A succeeds; tab B receives HTTP 409 and is told to reload; tab B's changes are not applied.
- **Severity:** Major
- **Status:** draft

---

## Delete a test case — DELETE /api/test-cases/:id

### Delete a test case from the row menu (happy path)

- **Preconditions:** App is running. A disposable test case "Temp case" is visible in the list.
- **Steps:**
  1. Open the "⋯" menu on "Temp case".
  2. Click "Delete".
  3. Confirm the "Delete ... This cannot be undone." prompt.
- **Expected result:** The row disappears, the total count decrements, and the server response is `{ id }` of the deleted case.
- **Severity:** Major
- **Status:** draft

### Cancelling the delete confirmation keeps the case

- **Preconditions:** App is running. A test case "Keep me" is visible in the list.
- **Steps:**
  1. Open the "⋯" menu on "Keep me" and click "Delete".
  2. Dismiss the confirmation prompt (click Cancel).
- **Expected result:** No delete request is sent and "Keep me" remains in the list.
- **Severity:** Minor
- **Status:** draft

### Deleting the last item on a page steps back a page

- **Preconditions:** App is running with exactly 21 test cases; the list is on page 2 showing one case.
- **Steps:**
  1. Delete that single case on page 2.
- **Expected result:** The view moves to page 1 (the now-empty page 2 no longer exists) and shows the remaining 20 cases; no empty page is left displayed.
- **Severity:** Minor
- **Status:** draft

### Delete a non-existent test case returns 404

- **Preconditions:** App is running. No test case with ID `999999` exists.
- **Steps:**
  1. Send `DELETE /api/test-cases/999999`.
- **Expected result:** HTTP 404 with `error: "Test case not found."` (`info.changes === 0`).
- **Severity:** Minor
- **Status:** draft

### Deleting a case removes it from any suites it belongs to

- **Preconditions:** App is running. Test case `10` is attached to at least one suite via `suite_cases`.
- **Steps:**
  1. Delete test case `10`.
- **Expected result:** The case is gone from the list and is removed from every suite's case list (ON DELETE CASCADE on `suite_cases`); suite case counts drop.
- **Severity:** Major
- **Status:** draft

---

## Edge cases — special input, whitespace, repeated/stale actions

### Title with unicode and emoji renders intact in the list

- **Preconditions:** App is running. A test case titled `Login café 🚀 日本語 <b>` exists.
- **Steps:**
  1. Open `/test-cases` and locate that case.
- **Expected result:** The title renders exactly as entered, including emoji and angle brackets, with no encoding corruption, HTML injection, or layout break.
- **Severity:** Minor
- **Status:** draft

### Very long title does not break the row layout

- **Preconditions:** App is running. A test case with a 5,000-character title exists.
- **Steps:**
  1. Open `/test-cases` and view that row.
- **Expected result:** The row renders without breaking the table layout or crashing; the long title is truncated or wrapped within the title cell.
- **Severity:** Minor
- **Status:** draft

### Search matches a title containing special characters

- **Preconditions:** App is running. A test case titled `Login café 🚀` exists.
- **Steps:**
  1. Type `café` into the search box.
- **Expected result:** The `Login café 🚀` case appears in the filtered results.
- **Severity:** Minor
- **Status:** draft

### Double-clicking Delete does not error on the second click

- **Preconditions:** App is running. A disposable test case is visible.
- **Steps:**
  1. Delete the case and confirm.
  2. Immediately re-issue `DELETE /api/test-cases/:id` for the same (now gone) ID.
- **Expected result:** The first delete returns `{ id }`; the second returns HTTP 404 "Test case not found." with no crash or duplicate effect.
- **Severity:** Minor
- **Status:** draft

### Editing a case that another tab deleted returns 404

- **Preconditions:** App is running. Two tabs show the same test case; tab B deletes it.
- **Steps:**
  1. In tab A, open the edit modal (loaded before deletion) and click "Save changes".
- **Expected result:** The update request returns HTTP 404 "Test case not found." (the row no longer exists); tab A surfaces the error and does not recreate the case.
- **Severity:** Major
- **Status:** draft

### Filtered status no longer matches after an edit elsewhere

- **Preconditions:** App is running. The list is filtered to `draft`; a visible draft case is open in another tab.
- **Steps:**
  1. In the other tab, change that case's status to `passed` and save.
  2. Refresh the `draft`-filtered list.
- **Expected result:** The case no longer appears under the `draft` filter and appears when the filter is switched to `passed`.
- **Severity:** Minor
- **Status:** draft

### Combined search, status filter, and severity sort apply together

- **Preconditions:** App is running with a mix of titles, statuses, and severities.
- **Steps:**
  1. Send `GET /api/test-cases?search=login&status=failed&sort=severity&dir=desc`.
- **Expected result:** Results include only failed cases whose titles contain `login`, ordered by severity descending with the newest-updated tiebreak; `total`/`totalPages` reflect that filtered set.
- **Severity:** Minor
- **Status:** draft
