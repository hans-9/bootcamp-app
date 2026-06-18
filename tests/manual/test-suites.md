# Manual Test Cases — Test Suites Feature

Covers the `/test-suites` list and `/test-suites/:id` detail pages, the create/edit form, and the backend rules in `server/routes/suites.js` and `server/db.js`.

## Assumptions

- The app is running on the standard ports (client 3000, server 3001) with the seeded data: two suites — "Login flow" (feature `login`, status `in-progress`, 3 cases) and "Session & validation" (feature `session`, status `draft`, 3 cases) — and five seeded test cases.
- Allowed suite statuses are exactly: `draft`, `ready`, `in-progress`, `passed`, `failed`. Test-case statuses (`draft`, `ready`, `passed`, `failed`, `skipped`) are separate and not interchangeable with suite statuses.
- The `name` and `feature` fields have no enforced maximum length in the backend; "very long" cases probe undefined behavior (treated as still valid by the server) and verify the UI does not break.
- Trimming applies to `name`, `feature`, and `status` before validation, so leading/trailing whitespace is stripped, not preserved.
- "+ New suite" opens the create form; saving an empty required field surfaces the backend error message ("Name is required." / "Feature is required.").
- Standard test data: valid case IDs come from the seeded set; a non-existent suite ID is `999999`; a non-existent case ID is `999999`.

---

## List page (`/test-suites`)

### List page renders all suites with their summary fields

- **Preconditions:** App is running with the two seeded suites and no status filter applied.
- **Steps:**
  1. Open `/test-suites`.
- **Expected result:** Both seeded suites appear, each showing name, feature, status, case count (3 each), and updated date.
- **Severity:** Major
- **Status:** draft

### Suites are ordered newest-updated first

- **Preconditions:** App is running. Suite "Session & validation" was edited more recently than "Login flow".
- **Steps:**
  1. Open `/test-suites`.
- **Expected result:** "Session & validation" appears above "Login flow" (descending `updated_at`).
- **Severity:** Minor
- **Status:** draft

### Filter by a status that has matching suites

- **Preconditions:** App is running. At least one suite has status `in-progress`.
- **Steps:**
  1. Open `/test-suites`.
  2. Set the status filter to `in-progress`.
- **Expected result:** Only suites with status `in-progress` are listed (e.g. "Login flow"); others are hidden.
- **Severity:** Major
- **Status:** draft

### Filter by a valid status with no matching suites

- **Preconditions:** App is running. No suite has status `passed`.
- **Steps:**
  1. Open `/test-suites`.
  2. Set the status filter to `passed`.
- **Expected result:** The list is empty and an empty-state message is shown; no error appears.
- **Severity:** Minor
- **Status:** draft

### Filter cleared returns to the full list

- **Preconditions:** App is running with the status filter currently set to `in-progress`.
- **Steps:**
  1. Clear the status filter (set it back to "All").
- **Expected result:** All suites are listed again in newest-updated-first order.
- **Severity:** Minor
- **Status:** draft

### Invalid/unknown status filter is ignored (returns all)

- **Preconditions:** App is running. Direct the request to `GET /api/test-suites?status=bogus`.
- **Steps:**
  1. Request `/api/test-suites?status=bogus`.
- **Expected result:** The unknown status is ignored and all suites are returned (server treats it as no filter).
- **Severity:** Minor
- **Status:** draft

### Row links to the suite detail page

- **Preconditions:** App is running. The "Login flow" suite is visible in the list.
- **Steps:**
  1. Click the "Login flow" row.
- **Expected result:** The browser navigates to `/test-suites/:id` for that suite and the detail page loads.
- **Severity:** Major
- **Status:** draft

### Row menu "Open" navigates to detail

- **Preconditions:** App is running. The "Login flow" row menu is reachable.
- **Steps:**
  1. Open the row menu for "Login flow".
  2. Click "Open".
- **Expected result:** The detail page for "Login flow" loads.
- **Severity:** Minor
- **Status:** draft

### Row menu "Delete" removes the suite from the list

- **Preconditions:** App is running. A disposable suite "Temp suite" exists.
- **Steps:**
  1. Open the row menu for "Temp suite".
  2. Click "Delete".
- **Expected result:** "Temp suite" disappears from the list and the response confirms `{ id }` of the deleted suite.
- **Severity:** Major
- **Status:** draft

### Deleting a suite cascades and removes its case links

- **Preconditions:** App is running. Suite "Temp suite" has two cases attached via `suite_cases`.
- **Steps:**
  1. Delete "Temp suite".
- **Expected result:** The suite is removed and its `suite_cases` rows are deleted (ON DELETE CASCADE); the underlying test cases still exist.
- **Severity:** Major
- **Status:** draft

### "+ New suite" opens the create form

- **Preconditions:** App is running and the list page is open.
- **Steps:**
  1. Click "+ New suite".
- **Expected result:** The create form opens with empty `name` and `feature` fields and `status` defaulted to `draft`.
- **Severity:** Minor
- **Status:** draft

---

## Create form — happy path & equivalence partitions

### Create a suite with valid name, feature, and explicit status (happy path)

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `Checkout flow` in the name field.
  2. Enter `checkout` in the feature field.
  3. Select `ready` as the status.
  4. Click Save.
- **Expected result:** The suite is created (HTTP 201), appears in the list with status `ready` and case count 0, and the detail page or list reflects it.
- **Severity:** Major
- **Status:** draft

### Create a suite without choosing a status defaults to draft

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `Defaults suite` in the name field.
  2. Enter `defaults` in the feature field.
  3. Leave status unset and click Save.
- **Expected result:** The suite is created with status `draft`.
- **Severity:** Minor
- **Status:** draft

### Create a suite with each valid status partition

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Create a suite with status `draft`.
  2. Create a suite with status `ready`.
  3. Create a suite with status `in-progress`.
  4. Create a suite with status `passed`.
  5. Create a suite with status `failed`.
- **Expected result:** All five suites are created successfully, each retaining the chosen status.
- **Severity:** Minor
- **Status:** draft

---

## Create form — boundary values

### Name with a single character is accepted (min valid length)

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `A` in the name field.
  2. Enter `misc` in the feature field.
  3. Click Save.
- **Expected result:** The suite is created with name `A`.
- **Severity:** Minor
- **Status:** draft

### Empty name is rejected

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Leave the name field blank.
  2. Enter `login` in the feature field.
  3. Click Save.
- **Expected result:** Save fails with "Name is required." (HTTP 400) and no suite is created.
- **Severity:** Major
- **Status:** draft

### Whitespace-only name is rejected

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter three spaces in the name field.
  2. Enter `login` in the feature field.
  3. Click Save.
- **Expected result:** Save fails with "Name is required." (the value is empty after trim).
- **Severity:** Major
- **Status:** draft

### Empty feature is rejected

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `No feature` in the name field.
  2. Leave the feature field blank.
  3. Click Save.
- **Expected result:** Save fails with "Feature is required." and no suite is created.
- **Severity:** Major
- **Status:** draft

### Whitespace-only feature is rejected

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `Blank feature` in the name field.
  2. Enter two spaces in the feature field.
  3. Click Save.
- **Expected result:** Save fails with "Feature is required." (empty after trim).
- **Severity:** Major
- **Status:** draft

### Both required fields empty reports the name error first

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Leave both name and feature blank.
  2. Click Save.
- **Expected result:** Save fails with "Name is required." (name is validated before feature).
- **Severity:** Minor
- **Status:** draft

### Very long name is accepted and stored

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter a 5,000-character string in the name field.
  2. Enter `stress` in the feature field.
  3. Click Save.
- **Expected result:** The suite is created (no enforced max); the list and detail render the long name without crashing or breaking layout.
- **Severity:** Minor
- **Status:** draft

---

## Create form — negative cases & status validation

### Status outside the allowed set is rejected

- **Preconditions:** App is running. Send `POST /api/test-suites` with `{ name: "X", feature: "y", status: "archived" }`.
- **Steps:**
  1. Submit the create request with status `archived`.
- **Expected result:** Request fails with "Status must be one of: draft, ready, in-progress, passed, failed." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### A test-case status is rejected as a suite status

- **Preconditions:** App is running. Send `POST /api/test-suites` with status `skipped`.
- **Steps:**
  1. Submit the create request with status `skipped`.
- **Expected result:** Request fails with the "Status must be one of..." error (`skipped` is a test-case status, not a suite status).
- **Severity:** Minor
- **Status:** draft

### Status with surrounding whitespace is trimmed then validated

- **Preconditions:** App is running. Send `POST /api/test-suites` with status `"  ready  "`.
- **Steps:**
  1. Submit the create request with status `"  ready  "`.
- **Expected result:** The status is trimmed to `ready` and the suite is created successfully.
- **Severity:** Minor
- **Status:** draft

### Name with surrounding whitespace is stored trimmed

- **Preconditions:** App is running. Send a create request with name `"  Padded  "`.
- **Steps:**
  1. Submit the create request with name `"  Padded  "` and feature `misc`.
- **Expected result:** The suite is created with name `Padded` (leading/trailing whitespace removed).
- **Severity:** Trivial
- **Status:** draft

### Non-string name (number) is coerced to a string

- **Preconditions:** App is running. Send a create request with `name: 12345` and feature `misc`.
- **Steps:**
  1. Submit the create request with a numeric name.
- **Expected result:** The server coerces it via `String(...)` and creates the suite with name `12345`.
- **Severity:** Minor
- **Status:** draft

### Missing name field entirely is rejected

- **Preconditions:** App is running. Send a create request body `{ feature: "misc" }` with no `name` key.
- **Steps:**
  1. Submit the create request omitting the name key.
- **Expected result:** Request fails with "Name is required." (the `?? ''` fallback yields an empty string).
- **Severity:** Major
- **Status:** draft

### Name with special characters and emoji is accepted

- **Preconditions:** App is running. The create form is open.
- **Steps:**
  1. Enter `Login <flow> "v2" — café 🚀 日本語` in the name field.
  2. Enter `login` in the feature field.
  3. Click Save.
- **Expected result:** The suite is created and the name renders exactly as entered (no encoding corruption or layout break).
- **Severity:** Minor
- **Status:** draft

---

## Edit & delete suite

### Edit a suite's name, feature, and status (happy path)

- **Preconditions:** App is running. The "Login flow" detail page is open.
- **Steps:**
  1. Open the edit form for "Login flow".
  2. Change the name to `Login flow v2`.
  3. Change the feature to `auth`.
  4. Change the status to `ready`.
  5. Click Save.
- **Expected result:** The suite is updated, its `updated_at` advances, and the detail page shows the new values.
- **Severity:** Major
- **Status:** draft

### Edit fails when name is cleared

- **Preconditions:** App is running. The edit form for an existing suite is open.
- **Steps:**
  1. Clear the name field.
  2. Click Save.
- **Expected result:** Save fails with "Name is required." and the suite keeps its previous values.
- **Severity:** Major
- **Status:** draft

### Edit a non-existent suite returns 404

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Send `PUT /api/test-suites/999999` with valid name/feature/status.
- **Expected result:** Request fails with "Suite not found." (HTTP 404).
- **Severity:** Major
- **Status:** draft

### Delete a suite from the detail page

- **Preconditions:** App is running. A disposable suite is open on its detail page.
- **Steps:**
  1. Click Delete on the detail page.
- **Expected result:** The suite is deleted and the app navigates back to the list, where the suite no longer appears.
- **Severity:** Major
- **Status:** draft

### Delete a non-existent suite returns 404

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Send `DELETE /api/test-suites/999999`.
- **Expected result:** Request fails with "Suite not found." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

### Open the detail page for a non-existent suite

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Open `/test-suites/999999`.
- **Expected result:** A "Suite not found." message is shown (HTTP 404 from `GET`); the app does not crash.
- **Severity:** Major
- **Status:** draft

---

## Detail page — cases list & ordering

### Detail page lists cases in sort order

- **Preconditions:** App is running. The "Login flow" suite has three cases at sort_order 0, 1, 2.
- **Steps:**
  1. Open the "Login flow" detail page.
- **Expected result:** The three cases display top-to-bottom in ascending sort_order, each showing title, severity, and status.
- **Severity:** Major
- **Status:** draft

### Detail page for a suite with no cases shows empty state

- **Preconditions:** App is running. A freshly created suite has zero cases.
- **Steps:**
  1. Open the new suite's detail page.
- **Expected result:** An empty-state message indicates there are no cases yet; the add-case picker is available.
- **Severity:** Minor
- **Status:** draft

### Reorder cases via up/down buttons

- **Preconditions:** App is running. A suite has three cases in order A, B, C.
- **Steps:**
  1. Click the "up" button on case B.
- **Expected result:** The order becomes B, A, C and persists after reload (sort_order updated).
- **Severity:** Major
- **Status:** draft

### Reorder the first case "up" is a no-op

- **Preconditions:** App is running. A suite has cases in order A, B, C.
- **Steps:**
  1. Click the "up" button on case A.
- **Expected result:** The order stays A, B, C; the up control is disabled or has no effect at the top.
- **Severity:** Minor
- **Status:** draft

### Reorder the last case "down" is a no-op

- **Preconditions:** App is running. A suite has cases in order A, B, C.
- **Steps:**
  1. Click the "down" button on case C.
- **Expected result:** The order stays A, B, C; the down control is disabled or has no effect at the bottom.
- **Severity:** Minor
- **Status:** draft

### Reorder cases via drag-and-drop

- **Preconditions:** App is running. A suite has cases in order A, B, C.
- **Steps:**
  1. Drag case C above case A.
- **Expected result:** The order becomes C, A, B and persists after reload.
- **Severity:** Major
- **Status:** draft

### Reorder with the exact current case set succeeds

- **Preconditions:** App is running. A suite contains cases with IDs [10, 11, 12].
- **Steps:**
  1. Send `PUT /api/test-suites/:id/cases/order` with `{ case_ids: [12, 10, 11] }`.
- **Expected result:** The reorder succeeds and the returned cases reflect the new order.
- **Severity:** Major
- **Status:** draft

### Reorder rejected when a case is missing from the list

- **Preconditions:** App is running. A suite contains cases [10, 11, 12].
- **Steps:**
  1. Send a reorder request with `{ case_ids: [10, 11] }` (one case omitted).
- **Expected result:** Request fails with "case_ids must list exactly the cases currently in the suite." (HTTP 400); order unchanged.
- **Severity:** Major
- **Status:** draft

### Reorder rejected when an extra case is included

- **Preconditions:** App is running. A suite contains cases [10, 11, 12].
- **Steps:**
  1. Send a reorder request with `{ case_ids: [10, 11, 12, 13] }` (13 not in suite).
- **Expected result:** Request fails with the "must list exactly the cases" error (length mismatch); order unchanged.
- **Severity:** Major
- **Status:** draft

### Reorder rejected when case_ids is not an array

- **Preconditions:** App is running. A suite contains cases [10, 11, 12].
- **Steps:**
  1. Send a reorder request with `{ case_ids: "10,11,12" }` (a string, not an array).
- **Expected result:** Request fails with "case_ids must be an array of test case ids." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Reorder rejected when case_ids is missing

- **Preconditions:** App is running. A suite contains cases.
- **Steps:**
  1. Send a reorder request with an empty body `{}`.
- **Expected result:** Request fails with "case_ids must be an array of test case ids." (HTTP 400).
- **Severity:** Minor
- **Status:** draft

### Reorder of an empty suite with an empty array succeeds

- **Preconditions:** App is running. A suite has zero cases.
- **Steps:**
  1. Send a reorder request with `{ case_ids: [] }`.
- **Expected result:** Request succeeds (empty set matches empty current set) and returns an empty cases list.
- **Severity:** Trivial
- **Status:** draft

### Reorder a non-existent suite returns 404

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Send `PUT /api/test-suites/999999/cases/order` with `{ case_ids: [] }`.
- **Expected result:** Request fails with "Suite not found." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

### Reorder with duplicate IDs in the array is rejected

- **Preconditions:** App is running. A suite contains cases [10, 11, 12].
- **Steps:**
  1. Send a reorder request with `{ case_ids: [10, 10, 11] }`.
- **Expected result:** Request fails with the "must list exactly the cases" error (the duplicate does not satisfy the exact-set rule). Note: confirm the server's set comparison rejects this, since `includes` plus equal length may need both directions checked.
- **Severity:** Major
- **Status:** draft

---

## Detail page — add cases

### Add a case to a suite via the picker (happy path)

- **Preconditions:** App is running. A suite exists; a test case not yet in it is available in the picker.
- **Steps:**
  1. Open the add-case picker on the suite's detail page.
  2. Select an available test case.
  3. Confirm adding it.
- **Expected result:** The case is appended to the bottom of the list (next sort_order), the case count increments, and `updated_at` advances.
- **Severity:** Major
- **Status:** draft

### Search the picker narrows results

- **Preconditions:** App is running. The add-case picker is open with several available cases.
- **Steps:**
  1. Type part of a case title into the picker's search field.
- **Expected result:** Only cases whose titles match the search term are shown.
- **Severity:** Minor
- **Status:** draft

### Adding a case already in the suite returns 409

- **Preconditions:** App is running. A suite already contains case ID `10`.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with `{ case_id: 10 }`.
- **Expected result:** Request fails with "That test case is already in this suite." (HTTP 409); the list is unchanged.
- **Severity:** Major
- **Status:** draft

### Adding a non-existent case returns 404

- **Preconditions:** App is running. No test case with ID `999999` exists.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with `{ case_id: 999999 }`.
- **Expected result:** Request fails with "Test case not found." (HTTP 404).
- **Severity:** Major
- **Status:** draft

### Adding a case to a non-existent suite returns 404

- **Preconditions:** App is running. No suite with ID `999999` exists.
- **Steps:**
  1. Send `POST /api/test-suites/999999/cases` with a valid `case_id`.
- **Expected result:** Request fails with "Suite not found." (HTTP 404), checked before the case lookup.
- **Severity:** Minor
- **Status:** draft

### Adding a case with a non-numeric case_id returns 400

- **Preconditions:** App is running. A suite exists.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with `{ case_id: "abc" }`.
- **Expected result:** Request fails with "A numeric case_id is required." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Adding a case with a missing case_id returns 400

- **Preconditions:** App is running. A suite exists.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with an empty body `{}`.
- **Expected result:** Request fails with "A numeric case_id is required." (`Number(undefined)` is NaN).
- **Severity:** Minor
- **Status:** draft

### Adding a case with a fractional case_id is rejected

- **Preconditions:** App is running. A suite exists.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with `{ case_id: 10.5 }`.
- **Expected result:** Request fails with "A numeric case_id is required." (`Number.isInteger(10.5)` is false).
- **Severity:** Minor
- **Status:** draft

### Adding a numeric-string case_id is accepted

- **Preconditions:** App is running. A suite exists and test case `10` is not yet in it.
- **Steps:**
  1. Send `POST /api/test-suites/:id/cases` with `{ case_id: "10" }`.
- **Expected result:** The case is added (`Number("10")` is an integer).
- **Severity:** Minor
- **Status:** draft

### First case added to an empty suite gets sort_order 0

- **Preconditions:** App is running. A suite has zero cases.
- **Steps:**
  1. Add one test case to the suite.
- **Expected result:** The case is stored with sort_order 0 (`COALESCE(MAX+1, 0)`).
- **Severity:** Minor
- **Status:** draft

---

## Detail page — remove cases

### Remove a case from a suite (happy path)

- **Preconditions:** App is running. A suite contains case ID `10`.
- **Steps:**
  1. Click remove on case `10` in the detail list.
- **Expected result:** The case disappears from the list, the case count decrements, and `updated_at` advances; the underlying test case still exists.
- **Severity:** Major
- **Status:** draft

### Removing a case not in the suite returns 404

- **Preconditions:** App is running. A suite does not contain case ID `12`.
- **Steps:**
  1. Send `DELETE /api/test-suites/:id/cases/12`.
- **Expected result:** Request fails with "That test case is not in this suite." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

### Removing a case leaves a gap in sort_order (regression check)

- **Preconditions:** App is running. A suite has cases at sort_order 0, 1, 2.
- **Steps:**
  1. Remove the middle case (sort_order 1).
- **Expected result:** The remaining cases still display in correct relative order; the next added case still appends after the current max sort_order without collision.
- **Severity:** Minor
- **Status:** draft

---

## Edge cases — concurrency, stale state, repeated actions

### Double-submit the create form does not create duplicates beyond intent

- **Preconditions:** App is running. The create form is filled with valid data.
- **Steps:**
  1. Click Save twice rapidly.
- **Expected result:** Only one suite is created (the form disables on submit), or two distinct suites if no uniqueness exists — verify which the UI guarantees; no error or partial record.
- **Severity:** Minor
- **Status:** draft

### Adding the same case twice in quick succession is blocked by the uniqueness rule

- **Preconditions:** App is running. A suite does not yet contain case `10`.
- **Steps:**
  1. Send two add-case requests for `case_id: 10` in quick succession.
- **Expected result:** The first succeeds; the second returns 409 "already in this suite." (UNIQUE(suite_id, case_id) holds).
- **Severity:** Major
- **Status:** draft

### Removing the underlying test case removes it from suites (cascade)

- **Preconditions:** App is running. Test case `10` belongs to one or more suites.
- **Steps:**
  1. Delete test case `10` through the test-cases feature.
- **Expected result:** Case `10` is removed from every suite's list and their case counts drop (ON DELETE CASCADE on `suite_cases`).
- **Severity:** Major
- **Status:** draft

### Reorder with stale case set after another user removed a case

- **Preconditions:** App is running. A suite shows cases [10, 11, 12] in one open tab; another tab removes case `12`.
- **Steps:**
  1. In the first tab, submit a reorder with `{ case_ids: [12, 10, 11] }` (still includes the removed case).
- **Expected result:** Request fails with "case_ids must list exactly the cases currently in the suite." (HTTP 400); the stale order is not applied.
- **Severity:** Major
- **Status:** draft

### Open a suite whose status filter no longer matches after an edit

- **Preconditions:** App is running. The list is filtered to `draft`; a visible draft suite is open in another tab.
- **Steps:**
  1. In the other tab, change that suite's status to `passed` and save.
  2. Refresh the filtered list.
- **Expected result:** The suite no longer appears under the `draft` filter; it appears under `passed`.
- **Severity:** Minor
- **Status:** draft

### Editing a suite advances its position to the top of the newest-updated list

- **Preconditions:** App is running. "Login flow" is currently below "Session & validation".
- **Steps:**
  1. Edit "Login flow" (any field) and save.
  2. Return to the list.
- **Expected result:** "Login flow" now appears at the top (its `updated_at` is the most recent).
- **Severity:** Trivial
- **Status:** draft
