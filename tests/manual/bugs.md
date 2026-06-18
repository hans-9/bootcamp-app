# Manual Test Cases — Bugs Feature

Covers the `/bugs` list page, the `/bugs/:id` detail page (status changes, comments, activity timeline), the report/edit form, and the backend rules in `server/routes/bugs.js`.

## Assumptions

- The app is running on the standard ports (client 3000, server 3001) with the seeded bug data:
  - **Bug 1** — "Login button unresponsive on first click" — severity `Major`, priority `High`, status `open`, no activity.
  - **Bug 2** — "Dashboard totals double-count archived items" — severity `Critical`, priority `Urgent`, status `in-progress`, one `status_change` activity row.
  - **Bug 3** — "Date picker shows wrong month in Safari" — severity `Minor`, priority `Low`, status `resolved`, three activity rows (two status changes, one comment).
  - All three seeded bugs share `created_at = 2026-06-11T09:00:00.000Z` and an `updated_at` set when the database was first seeded.
- Allowed bug statuses are exactly: `open`, `in-progress`, `resolved`, `closed`, `reopened`. Allowed bug priorities are exactly: `Low`, `Medium`, `High`, `Urgent`. Allowed severities are exactly: `Critical`, `Major`, `Minor`, `Trivial`.
- Allowed status transitions: `open` → [`in-progress`, `closed`]; `in-progress` → [`resolved`, `closed`]; `resolved` → [`closed`, `reopened`]; `closed` → [`reopened`]; `reopened` → [`in-progress`, `closed`].
- `title`, `description`, `severity`, `priority`, `expected`, `actual`, `environment`, and each step are trimmed before validation. The `steps_to_reproduce` array drops empty/whitespace-only entries after trimming.
- No backend maximum length is enforced on text fields; "very long" cases probe undefined behavior (treated as still valid by the server) and verify the UI does not break.
- `status` is always forced to `open` on create and is never changed by `PUT` — only `PATCH /api/bugs/:id/status` changes status.
- Standard test data: a non-existent bug ID is `999999`. The **severity** field of each test case below (Critical/Major/Minor/Trivial) rates the impact of the test, distinct from any bug **priority** value (Low/Medium/High/Urgent) used as data under test.

---

## List page (`/bugs`)

### List page renders all bugs with their summary fields

- **Preconditions:** App is running with the three seeded bugs and no filters applied.
- **Steps:**
  1. Open `/bugs`.
- **Expected result:** All three seeded bugs appear, each showing title, severity badge, priority badge, status pill, and updated date.
- **Severity:** Major
- **Status:** draft

### Default sort is newest-updated first

- **Preconditions:** App is running with the seeded bugs and no sort column toggled.
- **Steps:**
  1. Open `/bugs`.
- **Expected result:** Bugs are ordered by `updated_at` descending (default `sort=updated`, `dir=desc`).
- **Severity:** Minor
- **Status:** draft

### Filter by a status that has matching bugs

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Open `/bugs`.
  2. Set the status filter to `open`.
- **Expected result:** Only bugs with status `open` are listed (Bug 1); others are hidden.
- **Severity:** Major
- **Status:** draft

### Filter by a valid status with no matching bugs

- **Preconditions:** App is running. No seeded bug has status `closed`.
- **Steps:**
  1. Open `/bugs`.
  2. Set the status filter to `closed`.
- **Expected result:** The list is empty and the "No bugs match. Try clearing the filters." empty state appears; no error is shown.
- **Severity:** Minor
- **Status:** draft

### Filter by severity returns only matching bugs

- **Preconditions:** App is running. Bug 2 has severity `Critical`.
- **Steps:**
  1. Open `/bugs`.
  2. Set the severity filter to `Critical`.
- **Expected result:** Only Bug 2 is listed.
- **Severity:** Major
- **Status:** draft

### Filter by priority returns only matching bugs

- **Preconditions:** App is running. Bug 1 has priority `High`.
- **Steps:**
  1. Open `/bugs`.
  2. Set the priority filter to `High`.
- **Expected result:** Only Bug 1 is listed.
- **Severity:** Major
- **Status:** draft

### Filters combine with AND

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Open `/bugs`.
  2. Set the status filter to `in-progress`.
  3. Set the severity filter to `Critical`.
- **Expected result:** Only bugs matching both filters are listed (Bug 2); a bug matching just one is hidden.
- **Severity:** Major
- **Status:** draft

### Clearing all filters returns the full list

- **Preconditions:** App is running with a status filter currently set to `open`.
- **Steps:**
  1. Set the status filter back to "All statuses".
- **Expected result:** All three bugs are listed again in newest-updated-first order.
- **Severity:** Minor
- **Status:** draft

### Invalid status filter is ignored (returns all)

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?status=bogus`.
- **Steps:**
  1. Request `/api/bugs?status=bogus`.
- **Expected result:** The unknown status is ignored and all bugs are returned (it is not in `BUG_STATUSES`).
- **Severity:** Minor
- **Status:** draft

### Invalid severity filter is ignored (returns all)

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?severity=Blocker`.
- **Steps:**
  1. Request `/api/bugs?severity=Blocker`.
- **Expected result:** The unknown severity is ignored and all bugs are returned.
- **Severity:** Minor
- **Status:** draft

### Invalid priority filter is ignored (returns all)

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?priority=Blocker`.
- **Steps:**
  1. Request `/api/bugs?priority=Blocker`.
- **Expected result:** The unknown priority is ignored and all bugs are returned.
- **Severity:** Minor
- **Status:** draft

### Search matches the title

- **Preconditions:** App is running. Bug 1's title contains "Login button".
- **Steps:**
  1. Open `/bugs`.
  2. Type `Login button` into the search field and wait for the debounce.
- **Expected result:** Only Bug 1 is listed (title `LIKE` match).
- **Severity:** Major
- **Status:** draft

### Search matches the description

- **Preconditions:** App is running. Bug 3's description contains "previous month".
- **Steps:**
  1. Open `/bugs`.
  2. Type `previous month` into the search field and wait for the debounce.
- **Expected result:** Only Bug 3 is listed (description `LIKE` match); no bug whose title alone is searched is required.
- **Severity:** Major
- **Status:** draft

### Search with no matches shows the empty state

- **Preconditions:** App is running. No bug contains "zzzznomatch".
- **Steps:**
  1. Open `/bugs`.
  2. Type `zzzznomatch` into the search field and wait for the debounce.
- **Expected result:** The list is empty with the "Try clearing the filters." empty state; no error.
- **Severity:** Minor
- **Status:** draft

### Search escapes a literal percent sign

- **Preconditions:** App is running. A bug titled `Discount 50% off banner` exists; another bug titled `Discount 50 dollars` exists.
- **Steps:**
  1. Request `/api/bugs?search=50%25` (URL-encoded `50%`).
- **Expected result:** Only `Discount 50% off banner` matches; `%` is treated as a literal (escaped via `ESCAPE '\'`), not a wildcard, so `Discount 50 dollars` is excluded.
- **Severity:** Major
- **Status:** draft

### Search escapes a literal underscore

- **Preconditions:** App is running. A bug titled `error_code shown twice` exists; another bug titled `errorXcode shown twice` exists.
- **Steps:**
  1. Request `/api/bugs?search=error_code`.
- **Expected result:** Only `error_code shown twice` matches; `_` is treated as a literal, not a single-char wildcard, so `errorXcode shown twice` is excluded.
- **Severity:** Major
- **Status:** draft

### Search escapes a literal backslash

- **Preconditions:** App is running. A bug titled `path C:\temp fails` exists.
- **Steps:**
  1. Request `/api/bugs?search=C:\temp` (with a literal backslash).
- **Expected result:** The backslash is escaped and the bug `path C:\temp fails` matches without a query error.
- **Severity:** Minor
- **Status:** draft

### Empty search returns all bugs

- **Preconditions:** App is running with a search term currently entered.
- **Steps:**
  1. Clear the search field and wait for the debounce.
- **Expected result:** The search filter is dropped (trimmed to empty) and all bugs are listed again.
- **Severity:** Minor
- **Status:** draft

### Whitespace-only search returns all bugs

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?search=%20%20%20`.
- **Steps:**
  1. Request `/api/bugs?search=%20%20%20` (three spaces).
- **Expected result:** The search is empty after trim and all bugs are returned.
- **Severity:** Trivial
- **Status:** draft

---

## List page — sorting

### Sort by title ascending (case-insensitive)

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=title&dir=asc`.
- **Expected result:** Bugs are ordered alphabetically by title using `COLLATE NOCASE` (case-insensitive) ascending.
- **Severity:** Minor
- **Status:** draft

### Sort by title descending

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=title&dir=desc`.
- **Expected result:** Bugs are ordered by title `COLLATE NOCASE` descending.
- **Severity:** Trivial
- **Status:** draft

### Sort by severity descending puts most severe first

- **Preconditions:** App is running. Bug 2 is `Critical`, Bug 1 is `Major`, Bug 3 is `Minor`.
- **Steps:**
  1. Request `/api/bugs?sort=severity&dir=desc`.
- **Expected result:** Order is Critical, Major, Minor (Bug 2, Bug 1, Bug 3) by severity rank descending, with `updated_at` descending as the tiebreak.
- **Severity:** Minor
- **Status:** draft

### Sort by severity ascending puts least severe first

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=severity&dir=asc`.
- **Expected result:** Order is by severity rank ascending (Minor, Major, Critical), with `updated_at` descending as the tiebreak.
- **Severity:** Minor
- **Status:** draft

### Sort by priority descending puts highest priority first

- **Preconditions:** App is running. Bug 2 is `Urgent`, Bug 1 is `High`, Bug 3 is `Low`.
- **Steps:**
  1. Request `/api/bugs?sort=priority&dir=desc`.
- **Expected result:** Order is Urgent, High, Low (Bug 2, Bug 1, Bug 3) by priority rank descending, with `updated_at` descending as the tiebreak.
- **Severity:** Minor
- **Status:** draft

### Sort by priority ascending puts lowest priority first

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=priority&dir=asc`.
- **Expected result:** Order is by priority rank ascending (Low, High, Urgent), with `updated_at` descending as the tiebreak.
- **Severity:** Minor
- **Status:** draft

### Sort by status descending

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=status&dir=desc`.
- **Expected result:** Bugs are ordered by the `status` text column descending, with `updated_at` descending as the tiebreak.
- **Severity:** Trivial
- **Status:** draft

### Sort by status ascending

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=status&dir=asc`.
- **Expected result:** Bugs are ordered by the `status` text column ascending, with `updated_at` descending as the tiebreak.
- **Severity:** Trivial
- **Status:** draft

### Sort by created date descending

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=created&dir=desc`.
- **Expected result:** Bugs are ordered by `created_at` descending.
- **Severity:** Trivial
- **Status:** draft

### Sort by updated date ascending (oldest first)

- **Preconditions:** App is running with the seeded bugs.
- **Steps:**
  1. Request `/api/bugs?sort=updated&dir=asc`.
- **Expected result:** Bugs are ordered by `updated_at` ascending (oldest updated first).
- **Severity:** Trivial
- **Status:** draft

### Unknown sort key falls back to updated

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?sort=bogus`.
- **Steps:**
  1. Request `/api/bugs?sort=bogus`.
- **Expected result:** The unknown sort is ignored and results default to `updated_at` descending.
- **Severity:** Minor
- **Status:** draft

### Unknown dir falls back to descending

- **Preconditions:** App is running. Direct the request to `GET /api/bugs?sort=title&dir=sideways`.
- **Steps:**
  1. Request `/api/bugs?sort=title&dir=sideways`.
- **Expected result:** Any value other than `asc` is treated as `DESC`; titles are ordered descending.
- **Severity:** Trivial
- **Status:** draft

### Clicking a column header toggles sort direction

- **Preconditions:** App is running. The list is currently sorted by `updated`.
- **Steps:**
  1. Click the "Title" column header.
  2. Click the "Title" column header again.
- **Expected result:** The first click sorts by title descending (with a ▼ arrow); the second click flips to ascending (with a ▲ arrow).
- **Severity:** Minor
- **Status:** draft

---

## List page — navigation and row actions

### Clicking a row opens the bug detail page

- **Preconditions:** App is running. Bug 1 is visible in the list.
- **Steps:**
  1. Click the Bug 1 row.
- **Expected result:** The browser navigates to `/bugs/:id` for Bug 1 and the detail page loads.
- **Severity:** Major
- **Status:** draft

### Row menu "Open" navigates to detail

- **Preconditions:** App is running. The Bug 1 row menu is reachable.
- **Steps:**
  1. Click the "⋯" actions button on the Bug 1 row.
  2. Click "Open".
- **Expected result:** The detail page for Bug 1 loads.
- **Severity:** Minor
- **Status:** draft

### Row menu "Delete" prompts a confirm

- **Preconditions:** App is running. A disposable bug "Temp bug" exists.
- **Steps:**
  1. Click the "⋯" actions button on the "Temp bug" row.
  2. Click "Delete".
- **Expected result:** A confirm dialog reading `Delete "Temp bug"? This cannot be undone.` appears; the bug is not deleted until confirmed.
- **Severity:** Major
- **Status:** draft

### Confirming row delete removes the bug

- **Preconditions:** App is running. A disposable bug "Temp bug" exists.
- **Steps:**
  1. Open the row menu for "Temp bug" and click "Delete".
  2. Accept the confirm dialog.
- **Expected result:** "Temp bug" disappears from the list and the response confirms `{ id }` of the deleted bug.
- **Severity:** Major
- **Status:** draft

### Cancelling row delete keeps the bug

- **Preconditions:** App is running. A disposable bug "Temp bug" exists.
- **Steps:**
  1. Open the row menu for "Temp bug" and click "Delete".
  2. Dismiss the confirm dialog.
- **Expected result:** "Temp bug" remains in the list; no delete request is sent.
- **Severity:** Minor
- **Status:** draft

### "+ New bug" opens the report form

- **Preconditions:** App is running and the list page is open.
- **Steps:**
  1. Click "+ New bug".
- **Expected result:** The report form opens with an empty title, severity defaulted to `Major`, priority defaulted to `Medium`, and a single empty step row.
- **Severity:** Minor
- **Status:** draft

---

## Report form — happy path & equivalence partitions

### Create a bug with all fields filled (happy path)

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter `Logout link does nothing` in the title field.
  2. Enter a description.
  3. Select severity `Major` and priority `High`.
  4. Enter `Open the app` in the first step row.
  5. Click "Create bug".
- **Expected result:** The bug is created (HTTP 201) with status forced to `open`, an empty activity array, and the app navigates to its detail page.
- **Severity:** Major
- **Status:** draft

### Create a bug without choosing a priority defaults to Medium

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title and one step but no `priority` field.
- **Steps:**
  1. Submit the create request omitting `priority`.
- **Expected result:** The bug is created with priority `Medium`.
- **Severity:** Minor
- **Status:** draft

### Status in the create body is ignored and forced to open

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title, one step, and `status: "closed"`.
- **Steps:**
  1. Submit the create request with `status: "closed"`.
- **Expected result:** The created bug has status `open` (the supplied status is ignored).
- **Severity:** Major
- **Status:** draft

### Create a bug with each valid severity partition

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Create a bug with severity `Critical`.
  2. Create a bug with severity `Major`.
  3. Create a bug with severity `Minor`.
  4. Create a bug with severity `Trivial`.
- **Expected result:** All four bugs are created, each retaining the chosen severity.
- **Severity:** Minor
- **Status:** draft

### Create a bug with each valid priority partition

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Create a bug with priority `Low`.
  2. Create a bug with priority `Medium`.
  3. Create a bug with priority `High`.
  4. Create a bug with priority `Urgent`.
- **Expected result:** All four bugs are created, each retaining the chosen priority.
- **Severity:** Minor
- **Status:** draft

### Multiple steps are all stored in order

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter a title.
  2. Add three step rows with distinct text.
  3. Click "Create bug".
- **Expected result:** The bug is created with all three steps stored in the entered order.
- **Severity:** Minor
- **Status:** draft

---

## Report form — boundary values

### Single-character title is accepted (min valid length)

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter `A` in the title field.
  2. Enter `Open the app` in the first step row.
  3. Click "Create bug".
- **Expected result:** The bug is created with title `A`.
- **Severity:** Minor
- **Status:** draft

### Empty title is rejected

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Leave the title field blank.
  2. Enter `Open the app` in the first step row.
  3. Click "Create bug".
- **Expected result:** Creation fails with "Title is required." and no bug is created.
- **Severity:** Major
- **Status:** draft

### Whitespace-only title is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with `title: "   "` and one valid step.
- **Steps:**
  1. Submit the create request with a whitespace-only title.
- **Expected result:** Creation fails with "Title is required." (empty after trim).
- **Severity:** Major
- **Status:** draft

### Missing title field entirely is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with one valid step and no `title` key.
- **Steps:**
  1. Submit the create request omitting the title key.
- **Expected result:** Creation fails with "Title is required." (the `?? ''` fallback yields an empty string).
- **Severity:** Major
- **Status:** draft

### A single valid step is accepted (min steps)

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter a title.
  2. Enter one step row only.
  3. Click "Create bug".
- **Expected result:** The bug is created with exactly one step.
- **Severity:** Minor
- **Status:** draft

### Zero steps is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title and `steps_to_reproduce: []`.
- **Steps:**
  1. Submit the create request with an empty steps array.
- **Expected result:** Creation fails with "At least one step to reproduce is required." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Steps that are all whitespace are rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title and `steps_to_reproduce: ["  ", ""]`.
- **Steps:**
  1. Submit the create request with whitespace-only steps.
- **Expected result:** Creation fails with "At least one step to reproduce is required." (steps are empty after trim and filter).
- **Severity:** Major
- **Status:** draft

### Blank step rows are dropped, non-blank kept

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title and `steps_to_reproduce: ["", "Open the app", "  "]`.
- **Steps:**
  1. Submit the create request with mixed blank and non-blank steps.
- **Expected result:** The bug is created with a single step `Open the app` (blank entries filtered out).
- **Severity:** Minor
- **Status:** draft

### Very long title is accepted and stored

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter a 5,000-character string in the title field.
  2. Enter one valid step.
  3. Click "Create bug".
- **Expected result:** The bug is created (no enforced max); the list and detail render the long title without crashing or breaking layout.
- **Severity:** Minor
- **Status:** draft

### Title with special characters and emoji is accepted

- **Preconditions:** App is running. The report form is open.
- **Steps:**
  1. Enter `Crash on <save> "v2" — café 🚀 日本語` in the title field.
  2. Enter one valid step.
  3. Click "Create bug".
- **Expected result:** The bug is created and the title renders exactly as entered (no encoding corruption or layout break).
- **Severity:** Minor
- **Status:** draft

### Title with surrounding whitespace is stored trimmed

- **Preconditions:** App is running. Send `POST /api/bugs` with `title: "  Padded title  "` and one valid step.
- **Steps:**
  1. Submit the create request with a padded title.
- **Expected result:** The bug is created with title `Padded title` (leading/trailing whitespace removed).
- **Severity:** Trivial
- **Status:** draft

---

## Report form — negative cases & enum validation

### Severity outside the allowed set is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title, one step, and `severity: "Blocker"`.
- **Steps:**
  1. Submit the create request with severity `Blocker`.
- **Expected result:** Creation fails with "Severity must be one of: Critical, Major, Minor, Trivial." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Empty severity is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title, one step, and `severity: ""`.
- **Steps:**
  1. Submit the create request with an empty severity.
- **Expected result:** Creation fails with the "Severity must be one of..." error (empty string is not a valid severity).
- **Severity:** Major
- **Status:** draft

### Priority outside the allowed set is rejected

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title, one step, valid severity, and `priority: "Critical"`.
- **Steps:**
  1. Submit the create request with priority `Critical`.
- **Expected result:** Creation fails with "Priority must be one of: Low, Medium, High, Urgent." (HTTP 400); `Critical` is a severity, not a priority.
- **Severity:** Major
- **Status:** draft

### A bug status value is rejected as a priority

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title, one step, and `priority: "open"`.
- **Steps:**
  1. Submit the create request with priority `open`.
- **Expected result:** Creation fails with the "Priority must be one of..." error.
- **Severity:** Minor
- **Status:** draft

### Non-array steps_to_reproduce is treated as no steps

- **Preconditions:** App is running. Send `POST /api/bugs` with a valid title and `steps_to_reproduce: "Open the app"` (a string, not an array).
- **Steps:**
  1. Submit the create request with a string for steps.
- **Expected result:** Creation fails with "At least one step to reproduce is required." (non-array yields an empty steps list).
- **Severity:** Minor
- **Status:** draft

### Numeric title is coerced to a string

- **Preconditions:** App is running. Send `POST /api/bugs` with `title: 12345`, one valid step, and valid severity.
- **Steps:**
  1. Submit the create request with a numeric title.
- **Expected result:** The server coerces it via `String(...)` and creates the bug with title `12345`.
- **Severity:** Minor
- **Status:** draft

---

## Detail page (`/bugs/:id`)

### Detail page renders the bug fields

- **Preconditions:** App is running. Bug 2 exists.
- **Steps:**
  1. Open the detail page for Bug 2.
- **Expected result:** The page shows the title, status pill, severity badge, priority badge, description, numbered steps, expected, actual, and environment.
- **Severity:** Major
- **Status:** draft

### Empty optional fields show an em dash

- **Preconditions:** App is running. A bug exists with no `expected` and no `actual` text.
- **Steps:**
  1. Open that bug's detail page.
- **Expected result:** The Expected and Actual fields each show a muted "—" placeholder.
- **Severity:** Trivial
- **Status:** draft

### Activity timeline shows newest first

- **Preconditions:** App is running. Bug 3 has three activity rows.
- **Steps:**
  1. Open the detail page for Bug 3.
- **Expected result:** The activity timeline lists the three rows ordered newest first (`ORDER BY created_at DESC, id DESC`).
- **Severity:** Minor
- **Status:** draft

### Activity timeline renders status changes and comments

- **Preconditions:** App is running. Bug 3 has both `status_change` and `comment` activity rows.
- **Steps:**
  1. Open the detail page for Bug 3.
- **Expected result:** Status-change rows show "Status changed <old> → <new>" with status pills; comment rows show the comment message text.
- **Severity:** Minor
- **Status:** draft

### Bug with no activity shows the empty state

- **Preconditions:** App is running. Bug 1 has no activity.
- **Steps:**
  1. Open the detail page for Bug 1.
- **Expected result:** The activity section shows "No activity yet."
- **Severity:** Trivial
- **Status:** draft

### Open the detail page for a non-existent bug

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Open `/bugs/999999`.
- **Expected result:** An "Error: Bug not found." message is shown (HTTP 404 from `GET`); the app does not crash.
- **Severity:** Major
- **Status:** draft

### Get a non-existent bug returns 404

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Send `GET /api/bugs/999999`.
- **Expected result:** Request fails with "Bug not found." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

---

## Edit bug (`PUT /api/bugs/:id`)

### Edit a bug's title, severity, and priority (happy path)

- **Preconditions:** App is running. The Bug 1 detail page is open.
- **Steps:**
  1. Click Edit on Bug 1.
  2. Change the title to `Login button needs two clicks`.
  3. Change severity to `Critical` and priority to `Urgent`.
  4. Click "Save changes".
- **Expected result:** The bug is updated, its `updated_at` advances, and the detail page shows the new values.
- **Severity:** Major
- **Status:** draft

### A status field in the PUT body is ignored

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Send `PUT /api/bugs/{Bug 1 id}` with valid title, one step, valid severity, and `status: "closed"`.
- **Expected result:** The update succeeds but Bug 1's status remains `open` (status only changes via `PATCH /status`).
- **Severity:** Major
- **Status:** draft

### Edit fails when the title is cleared

- **Preconditions:** App is running. The edit form for an existing bug is open.
- **Steps:**
  1. Clear the title field.
  2. Click "Save changes".
- **Expected result:** Save fails with "Title is required." and the bug keeps its previous values.
- **Severity:** Major
- **Status:** draft

### Edit fails when all steps are removed

- **Preconditions:** App is running. Send `PUT /api/bugs/{existing id}` with a valid title and `steps_to_reproduce: []`.
- **Steps:**
  1. Submit the update with an empty steps array.
- **Expected result:** Update fails with "At least one step to reproduce is required." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Edit fails with an invalid severity

- **Preconditions:** App is running. Send `PUT /api/bugs/{existing id}` with a valid title, one step, and `severity: "Blocker"`.
- **Steps:**
  1. Submit the update with severity `Blocker`.
- **Expected result:** Update fails with the "Severity must be one of..." error (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Edit a non-existent bug returns 404

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Send `PUT /api/bugs/999999` with a valid title, one step, and valid severity.
- **Expected result:** Request fails with "Bug not found." (HTTP 404), checked before validation.
- **Severity:** Major
- **Status:** draft

---

## Delete bug

### Delete a bug from the detail page

- **Preconditions:** App is running. A disposable bug is open on its detail page.
- **Steps:**
  1. Click Delete on the detail page.
  2. Accept the confirm dialog.
- **Expected result:** The bug is deleted and the app navigates back to `/bugs`, where the bug no longer appears.
- **Severity:** Major
- **Status:** draft

### Cancelling the detail-page delete keeps the bug

- **Preconditions:** App is running. A bug is open on its detail page.
- **Steps:**
  1. Click Delete on the detail page.
  2. Dismiss the confirm dialog.
- **Expected result:** The bug remains and no delete request is sent.
- **Severity:** Minor
- **Status:** draft

### Deleting a bug removes its activity (cascade)

- **Preconditions:** App is running. A bug with at least one activity row exists.
- **Steps:**
  1. Delete that bug.
- **Expected result:** The bug and its `bug_activity` rows are both removed (ON DELETE CASCADE).
- **Severity:** Major
- **Status:** draft

### Delete a non-existent bug returns 404

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Send `DELETE /api/bugs/999999`.
- **Expected result:** Request fails with "Bug not found." (HTTP 404; `info.changes === 0`).
- **Severity:** Minor
- **Status:** draft

---

## Change status (`PATCH /api/bugs/:id/status`)

### Move open → in-progress (allowed transition)

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. On Bug 1's detail page, select `in-progress` in the change-status dropdown.
  2. Click Apply.
- **Expected result:** The status changes to `in-progress`, a `status_change` activity row is written with old `open` / new `in-progress`, and the timeline shows it.
- **Severity:** Major
- **Status:** draft

### Status change with an optional message records the note

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Select `closed` in the change-status dropdown.
  2. Enter `Not reproducible` in the optional note field.
  3. Click Apply.
- **Expected result:** The status changes to `closed` and the activity row stores the message `Not reproducible`, shown under the timeline entry.
- **Severity:** Minor
- **Status:** draft

### Move open → closed (allowed transition)

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "closed"` and the current `updated_at`.
- **Expected result:** The status changes to `closed`.
- **Severity:** Minor
- **Status:** draft

### Move in-progress → resolved (allowed transition)

- **Preconditions:** App is running. Bug 2 has status `in-progress`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 2 id}/status` with `status: "resolved"` and the current `updated_at`.
- **Expected result:** The status changes to `resolved`.
- **Severity:** Minor
- **Status:** draft

### Move resolved → reopened (allowed transition)

- **Preconditions:** App is running. Bug 3 has status `resolved`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 3 id}/status` with `status: "reopened"` and the current `updated_at`.
- **Expected result:** The status changes to `reopened`.
- **Severity:** Minor
- **Status:** draft

### Move closed → reopened (only allowed transition from closed)

- **Preconditions:** App is running. A bug has status `closed`.
- **Steps:**
  1. Send `PATCH /api/bugs/{closed bug id}/status` with `status: "reopened"` and the current `updated_at`.
- **Expected result:** The status changes to `reopened`.
- **Severity:** Minor
- **Status:** draft

### Move reopened → in-progress (allowed transition)

- **Preconditions:** App is running. A bug has status `reopened`.
- **Steps:**
  1. Send `PATCH /api/bugs/{reopened bug id}/status` with `status: "in-progress"` and the current `updated_at`.
- **Expected result:** The status changes to `in-progress`.
- **Severity:** Minor
- **Status:** draft

### Disallowed transition open → resolved returns 422

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "resolved"` and the current `updated_at`.
- **Expected result:** Request fails with "Cannot move a bug from open to resolved." (HTTP 422); status unchanged.
- **Severity:** Major
- **Status:** draft

### Disallowed transition in-progress → reopened returns 422

- **Preconditions:** App is running. Bug 2 has status `in-progress`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 2 id}/status` with `status: "reopened"` and the current `updated_at`.
- **Expected result:** Request fails with "Cannot move a bug from in-progress to reopened." (HTTP 422); status unchanged.
- **Severity:** Major
- **Status:** draft

### Disallowed transition closed → in-progress returns 422

- **Preconditions:** App is running. A bug has status `closed`.
- **Steps:**
  1. Send `PATCH /api/bugs/{closed bug id}/status` with `status: "in-progress"` and the current `updated_at`.
- **Expected result:** Request fails with "Cannot move a bug from closed to in-progress." (HTTP 422); only `reopened` is allowed from `closed`.
- **Severity:** Major
- **Status:** draft

### Moving to the same status returns 400

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "open"` and the current `updated_at`.
- **Expected result:** Request fails with "Bug is already open." (HTTP 400); no activity row is written.
- **Severity:** Major
- **Status:** draft

### Unknown status value returns 400

- **Preconditions:** App is running. Bug 1 exists.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "archived"`.
- **Expected result:** Request fails with "Unknown status: archived." (HTTP 400).
- **Severity:** Major
- **Status:** draft

### Empty status value returns 400

- **Preconditions:** App is running. Bug 1 exists.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: ""`.
- **Expected result:** Request fails with "Unknown status: (empty)." (HTTP 400).
- **Severity:** Minor
- **Status:** draft

### Stale updated_at returns 409 before any transition check

- **Preconditions:** App is running. Bug 1 has status `open`; you hold an outdated `updated_at` value.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "in-progress"` and a stale `updated_at`.
- **Expected result:** Request fails with "This bug changed since you opened it. Refresh and try again." (HTTP 409); status unchanged.
- **Severity:** Major
- **Status:** draft

### 409 stale check takes precedence over a disallowed transition

- **Preconditions:** App is running. Bug 1 has status `open`; you hold a stale `updated_at`.
- **Steps:**
  1. Send `PATCH /api/bugs/{Bug 1 id}/status` with `status: "resolved"` (disallowed) and a stale `updated_at`.
- **Expected result:** Request fails with the 409 "changed since you opened it" message, not the 422 transition error (the stale check runs first).
- **Severity:** Minor
- **Status:** draft

### Status change on a non-existent bug returns 404

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Send `PATCH /api/bugs/999999/status` with `status: "closed"`.
- **Expected result:** Request fails with "Bug not found." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

### Detail dropdown only offers allowed next transitions

- **Preconditions:** App is running. Bug 2 has status `in-progress`.
- **Steps:**
  1. Open Bug 2's detail page.
  2. Open the change-status dropdown.
- **Expected result:** The dropdown offers only `resolved` and `closed` (the allowed next statuses from `in-progress`); `open`, `in-progress`, and `reopened` are not listed.
- **Severity:** Major
- **Status:** draft

### Detail page shows no-transitions message when none apply

- **Preconditions:** App is running. A bug exists in a hypothetical status with no outgoing transitions.
- **Steps:**
  1. Open that bug's detail page.
- **Expected result:** The side panel shows "No transitions available from "<status>"." and no status dropdown. (Note: every real status has at least one transition, so this exercises the fallback path.)
- **Severity:** Trivial
- **Status:** draft

---

## Add comment (`POST /api/bugs/:id/comments`)

### Add a comment (happy path)

- **Preconditions:** App is running. Bug 1's detail page is open.
- **Steps:**
  1. Type `Reproduced on staging` into the comment box.
  2. Click Comment.
- **Expected result:** A `comment` activity row is appended and appears at the top of the timeline with the message text; the comment box clears.
- **Severity:** Major
- **Status:** draft

### Empty comment is rejected (UI)

- **Preconditions:** App is running. Bug 1's detail page is open with an empty comment box.
- **Steps:**
  1. Observe the Comment button with no text entered.
- **Expected result:** The Comment button is disabled while the box is empty or whitespace-only; no request is sent.
- **Severity:** Minor
- **Status:** draft

### Empty comment is rejected (server)

- **Preconditions:** App is running. Bug 1 exists.
- **Steps:**
  1. Send `POST /api/bugs/{Bug 1 id}/comments` with `message: ""`.
- **Expected result:** Request fails with "A comment message is required." (HTTP 400).
- **Severity:** Minor
- **Status:** draft

### Whitespace-only comment is rejected (server)

- **Preconditions:** App is running. Bug 1 exists.
- **Steps:**
  1. Send `POST /api/bugs/{Bug 1 id}/comments` with `message: "   "`.
- **Expected result:** Request fails with "A comment message is required." (empty after trim).
- **Severity:** Minor
- **Status:** draft

### Comment with surrounding whitespace is stored trimmed

- **Preconditions:** App is running. Bug 1 exists.
- **Steps:**
  1. Send `POST /api/bugs/{Bug 1 id}/comments` with `message: "  Looks fixed  "`.
- **Expected result:** The comment is stored as `Looks fixed` (trimmed).
- **Severity:** Trivial
- **Status:** draft

### Comment with emoji and unicode is stored intact

- **Preconditions:** App is running. Bug 1's detail page is open.
- **Steps:**
  1. Type `Still broken 🐛 — 日本語 test` into the comment box.
  2. Click Comment.
- **Expected result:** The comment is saved and rendered exactly as entered, with no encoding corruption.
- **Severity:** Trivial
- **Status:** draft

### Comment on a non-existent bug returns 404

- **Preconditions:** App is running. No bug with ID `999999` exists.
- **Steps:**
  1. Send `POST /api/bugs/999999/comments` with `message: "hi"`.
- **Expected result:** Request fails with "Bug not found." (HTTP 404).
- **Severity:** Minor
- **Status:** draft

---

## Edge cases — concurrency, stale state, repeated actions

### Double-clicking Apply does not double-apply the status change

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Select `in-progress` in the change-status dropdown.
  2. Click Apply twice rapidly.
- **Expected result:** Only one status change is recorded; the second call is blocked by the busy flag, or returns a 400/409 because the bug already moved — no duplicate `status_change` row for the same move.
- **Severity:** Minor
- **Status:** draft

### Stale status change after another tab moved the bug

- **Preconditions:** App is running. Bug 1 is open in two tabs, both showing status `open`.
- **Steps:**
  1. In tab A, move Bug 1 to `in-progress` and Apply.
  2. In tab B (still holding the old `updated_at`), select `closed` and click Apply.
- **Expected result:** Tab B's request returns 409 "This bug changed since you opened it.", an alert shows the message, and the page reloads to show the current `in-progress` state.
- **Severity:** Major
- **Status:** draft

### Editing a bug advances it to the top of the newest-updated list

- **Preconditions:** App is running. Bug 1 is currently below another bug in the default list order.
- **Steps:**
  1. Edit Bug 1 (any field) and save.
  2. Return to `/bugs`.
- **Expected result:** Bug 1 now appears at the top (its `updated_at` is the most recent).
- **Severity:** Trivial
- **Status:** draft

### A bug filtered out after its status changes in another tab

- **Preconditions:** App is running. The list is filtered to `open`; an `open` bug is open in another tab.
- **Steps:**
  1. In the other tab, move that bug to `in-progress`.
  2. Refresh the filtered list.
- **Expected result:** The bug no longer appears under the `open` filter; it appears under the `in-progress` filter.
- **Severity:** Minor
- **Status:** draft

### Posting a comment does not change the bug's status or updated_at

- **Preconditions:** App is running. Bug 1 has status `open`.
- **Steps:**
  1. Add a comment to Bug 1.
- **Expected result:** Only a `comment` activity row is added; the bug's `status` and `updated_at` are unchanged.
- **Severity:** Minor
- **Status:** draft
