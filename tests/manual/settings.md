# Manual Test Cases — Settings Feature (preferences page, GET/PUT, theme & defaults wiring)

Covers the `/settings` page (`client/src/pages/SettingsPage.jsx`), the preferences provider (`client/src/SettingsContext.jsx`), the `GET /api/settings` / `PUT /api/settings` endpoints (`server/routes/settings.js`), and the two places preferences are consumed: default severity in the new-bug form (`client/src/components/BugForm.jsx`) and the Test Cases page size (`client/src/pages/TestCasesPage.jsx`, `server/routes/test-cases.js`). The pre-paint theme script lives in `client/index.html`.

## Assumptions

- The app runs on the standard ports (client 3000, server 3001). The `user_preferences` table holds exactly one row (`id = 1`), seeded on first start with defaults: `theme = system`, `default_severity_for_new_bugs = Minor`, `default_page_size = 20`, `timezone = ''`, `auto_generate_report_after_run = true`.
- Allowed themes are exactly `light`, `dark`, `system`. Allowed page sizes are exactly `10`, `20`, `50`, `100`. Allowed severities are exactly `Critical`, `Major`, `Minor`, `Trivial`.
- `timezone = ''` means "follow the browser"; any other stored value must be a valid IANA zone name.
- Every endpoint returns the standard `{ success, data, error }` envelope. `GET`/`PUT` return the row serialized with `auto_generate_report_after_run` as a JSON boolean and a string `updated_at`.
- `PUT /api/settings` merges the incoming body over the stored row (a missing field keeps its stored value) and enforces optimistic locking when the body includes `updated_at`, matching the bug routes.

---

## Settings page — load & render

### Settings page renders the stored preferences

- **Preconditions:** App is running with the seeded default preferences.
- **Steps:**
  1. Open `/settings`.
- **Expected result:** Four grouped sections render (Appearance, Defaults, Localization, Test runs). Theme shows "System", default severity "Minor", default page size "20 per page", timezone "Browser default (…)", and the auto-generate checkbox is checked.
- **Severity:** Major
- **Status:** draft

### Settings link is reachable from the header nav

- **Preconditions:** App is running.
- **Steps:**
  1. Click "Settings" in the header navigation.
- **Expected result:** The browser navigates to `/settings` and the nav link shows the active state.
- **Severity:** Minor
- **Status:** draft

### Edits in progress survive a slow settings fetch

- **Preconditions:** App is running with the network throttled so `GET /api/settings` resolves slowly.
- **Steps:**
  1. Open `/settings` and wait for the form to appear.
  2. Immediately change the theme to "Dark" before any later refresh.
- **Expected result:** The chosen theme stays "Dark"; a late-resolving settings load does not overwrite the in-progress edit (the form seeds only once).
- **Severity:** Minor
- **Status:** draft

---

## Settings page — saving

### Saving shows the "Saved" confirmation

- **Preconditions:** App is running and `/settings` is open.
- **Steps:**
  1. Change default page size to "50 per page".
  2. Click "Save".
- **Expected result:** The request succeeds and a "Saved" note appears next to the button; the values persist across a page reload.
- **Severity:** Major
- **Status:** draft

### Changing a field clears a previous "Saved" note

- **Preconditions:** App is running, `/settings` is open, and a save has just shown "Saved".
- **Steps:**
  1. Change any field (e.g. theme).
- **Expected result:** The "Saved" note disappears, signalling unsaved changes.
- **Severity:** Trivial
- **Status:** draft

### Two saves in the same session both succeed

- **Preconditions:** App is running and `/settings` is open.
- **Steps:**
  1. Change the theme and click "Save"; wait for "Saved".
  2. Change the default severity and click "Save" again without reloading.
- **Expected result:** Both saves succeed; the second is not rejected as stale (the form adopts the fresh `updated_at` returned by the first save).
- **Severity:** Major
- **Status:** draft

---

## Theme wiring

### Selecting Dark applies the dark theme app-wide

- **Preconditions:** App is running and `/settings` is open.
- **Steps:**
  1. Set Theme to "Dark" and click "Save".
- **Expected result:** `document.documentElement` gets `data-theme="dark"`, the page colors switch to the dark palette, and the change is visible on other pages (e.g. Test Cases) without reload.
- **Severity:** Major
- **Status:** draft

### Selecting Light applies the light theme app-wide

- **Preconditions:** App is running with the theme currently dark.
- **Steps:**
  1. Set Theme to "Light" and click "Save".
- **Expected result:** `data-theme` becomes `light` and the light palette is restored everywhere.
- **Severity:** Major
- **Status:** draft

### System theme follows the OS setting

- **Preconditions:** App is running with Theme set to "System" and the OS in light mode.
- **Steps:**
  1. While the app is open, switch the OS to dark mode.
- **Expected result:** The app switches to the dark palette live, without a save or reload (the `prefers-color-scheme` listener re-resolves `system`).
- **Severity:** Minor
- **Status:** draft

### No light flash on reload with a dark preference

- **Preconditions:** App is running with Theme saved as "Dark".
- **Steps:**
  1. Do a full page reload of any route.
- **Expected result:** The page paints dark immediately, with no brief light flash before React mounts (the inline script in `index.html` applies `data-theme` from the cached preference before first paint).
- **Severity:** Minor
- **Status:** draft

---

## Default severity wiring

### New-bug form defaults to the configured severity

- **Preconditions:** App is running with `default_severity_for_new_bugs` saved as "Critical".
- **Steps:**
  1. Open `/bugs` and click "+ New bug".
- **Expected result:** The Severity field in the new-bug form is preselected to "Critical".
- **Severity:** Major
- **Status:** draft

### Editing an existing bug keeps its own severity

- **Preconditions:** App is running with the default severity set to "Critical"; a bug exists whose severity is "Minor".
- **Steps:**
  1. Open that bug and open its edit form.
- **Expected result:** The Severity field shows "Minor" (the bug's stored value), not the default — the default applies only to new bugs.
- **Severity:** Major
- **Status:** draft

### Changing the default later does not alter existing bugs

- **Preconditions:** App is running with several bugs already created.
- **Steps:**
  1. Change the default severity on `/settings` and save.
  2. Open an existing bug.
- **Expected result:** The existing bug's severity is unchanged; only future new-bug forms use the new default.
- **Severity:** Minor
- **Status:** draft

---

## Default page size wiring

### New page size re-paginates the Test Cases list

- **Preconditions:** App is running with more than 10 test cases; default page size is 20.
- **Steps:**
  1. On `/settings`, set default page size to "10 per page" and save.
  2. Open `/test-cases`.
- **Expected result:** The list shows at most 10 rows per page and `totalPages` reflects the smaller page size.
- **Severity:** Major
- **Status:** draft

### Endpoint honors a valid perPage value

- **Preconditions:** App is running with at least 51 test cases.
- **Steps:**
  1. Send `GET /api/test-cases?perPage=50`.
- **Expected result:** `perPage` is 50 and `items` length is 50 on page 1.
- **Severity:** Major
- **Status:** draft

### Endpoint rejects an unsupported perPage and falls back to 20

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-cases?perPage=25`.
- **Expected result:** The unsupported size is ignored and `perPage` is 20 (only 10/20/50/100 are accepted).
- **Severity:** Minor
- **Status:** draft

### Non-numeric perPage falls back to 20

- **Preconditions:** App is running.
- **Steps:**
  1. Send `GET /api/test-cases?perPage=abc`.
- **Expected result:** `parseInt` yields NaN, so `perPage` defaults to 20.
- **Severity:** Minor
- **Status:** draft

### Prev/Next stay correct after the page size grows

- **Preconditions:** App is running on `/test-cases` viewing a high page number under a small page size.
- **Steps:**
  1. From a high page, change the default page size to a larger value so fewer pages exist.
  2. Return to `/test-cases`.
- **Expected result:** The list lands on a valid page (clamped by the server, with local state synced to the returned `page`); Prev/Next enable/disable correctly with no empty page shown.
- **Severity:** Minor
- **Status:** draft

---

## GET /api/settings

### Get returns the serialized preferences

- **Preconditions:** App is running with the seeded row.
- **Steps:**
  1. Send `GET /api/settings`.
- **Expected result:** HTTP 200 with `success: true` and `data` holding `theme`, `default_severity_for_new_bugs`, `default_page_size` (number), `timezone`, `auto_generate_report_after_run` (boolean), and `updated_at` (string).
- **Severity:** Major
- **Status:** draft

---

## PUT /api/settings — validation

### Full valid body updates every field

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `{ theme: "dark", default_severity_for_new_bugs: "Critical", default_page_size: 50, timezone: "America/New_York", auto_generate_report_after_run: false }`.
- **Expected result:** HTTP 200; the returned row reflects all five values and a fresh `updated_at`.
- **Severity:** Major
- **Status:** draft

### Invalid theme is rejected

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `theme: "neon"` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` listing the allowed themes; the stored row is unchanged.
- **Severity:** Major
- **Status:** draft

### Invalid page size is rejected

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `default_page_size: 25` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` listing the allowed page sizes; the row is unchanged.
- **Severity:** Major
- **Status:** draft

### Invalid severity is rejected

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `default_severity_for_new_bugs: "Blocker"` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` listing the allowed severities; the row is unchanged.
- **Severity:** Major
- **Status:** draft

### Invalid timezone is rejected

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `timezone: "Mars/Phobos"` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` stating a valid IANA name is required; the row is unchanged.
- **Severity:** Major
- **Status:** draft

### Empty timezone is accepted as "follow the browser"

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `timezone: ""` and otherwise valid fields.
- **Expected result:** HTTP 200; `timezone` is stored as `""`.
- **Severity:** Minor
- **Status:** draft

### Non-boolean auto-generate flag is rejected

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with `auto_generate_report_after_run: "yes"` and otherwise valid fields.
- **Expected result:** HTTP 400 with `error` stating the value must be true or false; the row is unchanged.
- **Severity:** Minor
- **Status:** draft

---

## PUT /api/settings — partial body & concurrency

### Partial body updates only the supplied field

- **Preconditions:** App is running with `theme = light` and `default_page_size = 20`.
- **Steps:**
  1. Send `PUT /api/settings` with body `{ "theme": "dark" }` only.
- **Expected result:** HTTP 200; `theme` becomes `dark` while `default_page_size` and the other fields keep their previous values (the body is merged over the stored row).
- **Severity:** Major
- **Status:** draft

### Stale update is rejected with 409

- **Preconditions:** App is running. The stored row has `updated_at` `T2`; the client holds an older `updated_at` `T1`.
- **Steps:**
  1. Send `PUT /api/settings` with a valid body that includes `updated_at: "T1"`.
- **Expected result:** HTTP 409 with an error telling the user to reload; the stored row is unchanged.
- **Severity:** Major
- **Status:** draft

### Update with the current updated_at succeeds

- **Preconditions:** App is running. The stored row has `updated_at` `T2`.
- **Steps:**
  1. Send `PUT /api/settings` with a valid body that includes `updated_at: "T2"`.
- **Expected result:** HTTP 200; the update applies and `updated_at` advances.
- **Severity:** Major
- **Status:** draft

### Update without updated_at skips the concurrency check

- **Preconditions:** App is running.
- **Steps:**
  1. Send `PUT /api/settings` with a valid body that omits `updated_at`.
- **Expected result:** HTTP 200; the guard is skipped (it only triggers when `updated_at` is present) and the update succeeds.
- **Severity:** Minor
- **Status:** draft
