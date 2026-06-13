# Test Cases — Create Test Case (POST /api/test-cases)

**Date:** 2026-06-13
**Technique:** ISTQB boundary-value analysis + equivalence partitioning
**Under test:** `POST /api/test-cases` and the create form's duplicate-title warning.

## Assumptions

- No maximum length is enforced on `title`, `expected_result`, or `preconditions`, so `max` / `max+1` boundaries don't apply — only `empty` / `whitespace` / `very-long`.
- `steps` has a lower boundary of 1 (after empties are filtered) and no upper bound.
- `severity` and `status` are closed, case-sensitive enumerations.
- No uniqueness constraint exists; duplicate titles are allowed at the API. The create form shows a soft, dismissible warning only.

---

## Happy path

### Create succeeds with a complete valid body

- **Preconditions:** Server running on :3001.
- **Steps:**
  1. Send `POST /api/test-cases` with `{title, preconditions, steps:["step one"], expected_result, severity:"Major", status:"ready"}`.
- **Expected result:** `201` with `success:true` and `data` echoing the saved row including numeric `id`, `created_at`, `updated_at`.
- **Severity:** Critical
- **Status:** draft

### Create succeeds with only required fields (preconditions & status omitted)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `{title, steps:["x"], expected_result, severity:"Minor"}` and no `preconditions` or `status`.
- **Expected result:** `201`; saved row has `preconditions:""` and `status:"draft"`.
- **Severity:** Major
- **Status:** draft

## `title` — boundaries & partitions (required, no max)

### Title at minimum valid length (1 char) is accepted

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `title:"a"` and otherwise valid fields.
- **Expected result:** `201`; row saved with `title:"a"`.
- **Severity:** Minor
- **Status:** draft

### Surrounding whitespace in title is trimmed

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `title:"  Login test  "` and otherwise valid fields.
- **Expected result:** `201`; saved `title` is `"Login test"` with no leading/trailing spaces.
- **Severity:** Minor
- **Status:** draft

### Missing title is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with the `title` key omitted, other fields valid.
- **Expected result:** `400`, `error:"Title is required."`, nothing inserted.
- **Severity:** Major
- **Status:** draft

### Empty-string title is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `title:""`.
- **Expected result:** `400`, `error:"Title is required."`.
- **Severity:** Major
- **Status:** draft

### Whitespace-only title is rejected (treated as empty after trim)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `title:"   "`.
- **Expected result:** `400`, `error:"Title is required."`.
- **Severity:** Major
- **Status:** draft

### Very long title is accepted (no max enforced)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with a 10,000-character `title`, other fields valid.
- **Expected result:** `201`; full title stored. Documents that no upper bound exists.
- **Severity:** Minor
- **Status:** draft

## `expected_result` — required

### Missing expected_result is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `expected_result` omitted, other fields valid.
- **Expected result:** `400`, `error:"Expected result is required."`.
- **Severity:** Major
- **Status:** draft

### Whitespace-only expected_result is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `expected_result:"   "`.
- **Expected result:** `400`, `error:"Expected result is required."`.
- **Severity:** Minor
- **Status:** draft

## `steps` — boundaries & type partitions (min 1, no max)

### One step is accepted (minimum valid)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:["Open /login"]`, other fields valid.
- **Expected result:** `201`; row saved with a one-element steps array.
- **Severity:** Major
- **Status:** draft

### Empty steps array is rejected (min − 1)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:[]`.
- **Expected result:** `400`, `error:"At least one step is required."`.
- **Severity:** Major
- **Status:** draft

### Steps containing only empty/whitespace strings is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:["  ","   "]`.
- **Expected result:** `400`, `error:"At least one step is required."` (all elements filtered out).
- **Severity:** Minor
- **Status:** draft

### Empty step entries are filtered, valid ones kept

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:["  ","real step","   "]`.
- **Expected result:** `201`; saved `steps` is exactly `["real step"]`.
- **Severity:** Minor
- **Status:** draft

### Steps sent as a non-array is rejected (wrong type)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:"oneStep"` (a string, not an array).
- **Expected result:** `400`, `error:"At least one step is required."` (non-array treated as no steps).
- **Severity:** Minor
- **Status:** draft

### Non-string step items are coerced to strings

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps:[1,2,3]`.
- **Expected result:** `201`; saved `steps` is `["1","2","3"]`. Documents lenient coercion.
- **Severity:** Trivial
- **Status:** draft

### Large steps array is accepted (no upper bound)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `steps` containing 500 valid strings.
- **Expected result:** `201`; all 500 stored.
- **Severity:** Trivial
- **Status:** draft

## `severity` — enum partitions

### Valid severity is accepted

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `severity:"Critical"`, other fields valid.
- **Expected result:** `201`; row saved with `severity:"Critical"`. (Repeat for `Major`, `Minor`, `Trivial`.)
- **Severity:** Major
- **Status:** draft

### Wrong-case severity is rejected (case-sensitive)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `severity:"critical"` (lowercase).
- **Expected result:** `400`, `error:"Severity must be one of: Critical, Major, Minor, Trivial."`.
- **Severity:** Major
- **Status:** draft

### Non-member severity is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `severity:"Blocker"`.
- **Expected result:** `400` with the "Severity must be one of…" message.
- **Severity:** Major
- **Status:** draft

### Missing severity is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `severity` omitted.
- **Expected result:** `400` with the "Severity must be one of…" message.
- **Severity:** Major
- **Status:** draft

### Severity with surrounding whitespace is trimmed then accepted

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `severity:" Minor "` (leading/trailing spaces), other fields valid.
- **Expected result:** `201`; saved `severity` is `"Minor"`. Documents that enum values are trimmed before the membership check.
- **Severity:** Trivial
- **Status:** draft

## `status` — enum partitions

### Valid non-default status is accepted

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `status:"passed"`, other fields valid.
- **Expected result:** `201`; row saved with `status:"passed"`.
- **Severity:** Minor
- **Status:** draft

### Non-member status is rejected

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `status:"done"`.
- **Expected result:** `400`, `error:"Status must be one of: draft, ready, passed, failed, skipped."`.
- **Severity:** Major
- **Status:** draft

### Explicit empty-string status is rejected (differs from omitting it)

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `status:""` and otherwise valid fields.
- **Expected result:** `400`, `error:"Status must be one of: …"`. Note the asymmetry: omitting `status` defaults to `draft` and succeeds, but an explicit empty string is rejected (the default only fills `null`/`undefined`).
- **Severity:** Minor
- **Status:** draft

## Body-level negative & duplicate cases

### Malformed JSON body is rejected cleanly

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with body `{"title":"t",}` and `Content-Type: application/json`.
- **Expected result:** `400`, `error:"Invalid request body."`, response keeps the `{success,data,error}` shape.
- **Severity:** Major
- **Status:** draft

### Duplicate title is accepted at the API (no uniqueness constraint)

- **Preconditions:** Server running; a case titled "Login test" already exists.
- **Steps:**
  1. Send `POST` with `title:"Login test"` and otherwise valid fields.
- **Expected result:** `201`; a second row with the same title and a distinct `id` is created.
- **Severity:** Minor
- **Status:** draft

### Oversized request body is rejected as too large

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with a body larger than the 100 KB parser limit (e.g. a 200,000-character `title`).
- **Expected result:** `413`, `error:"Request body is too large."` — not the generic "Internal server error."
- **Severity:** Minor
- **Status:** draft

### Unknown or injected fields in the body are ignored

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with `{id:999, created_at:"hacked", title:"x", steps:["s"], expected_result:"y", severity:"Minor"}`.
- **Expected result:** `201`; the server assigns its own `id` and `created_at` — the supplied `id`/`created_at` are not honored (no mass assignment).
- **Severity:** Major
- **Status:** draft

### Missing or non-JSON body is rejected without crashing

- **Preconditions:** Server running.
- **Steps:**
  1. Send `POST` with no body, or with `Content-Type: text/plain`.
- **Expected result:** `400`, `error:"Title is required."` — a clean validation error, not a `500`.
- **Severity:** Major
- **Status:** draft

## Create form — duplicate-title warning (UI)

### Create form warns before saving a duplicate title and allows proceeding

- **Preconditions:** App running; a case titled "Login test" already exists.
- **Steps:**
  1. Open the New test case form and enter title "login test " (different case, trailing space) with valid steps, expected result, and severity.
  2. Click Create test case.
  3. On the "A test case titled "Login test" already exists…" confirm dialog, click OK.
- **Expected result:** The dialog appears (matching is case-insensitive and trimmed); clicking OK creates the case and the list refreshes with the new row.
- **Severity:** Minor
- **Status:** draft

### Cancelling the duplicate warning keeps the form open without saving

- **Preconditions:** App running; a case titled "Login test" already exists.
- **Steps:**
  1. Open the New test case form and enter title "Login test" with otherwise valid fields.
  2. Click Create test case.
  3. On the duplicate confirm dialog, click Cancel.
- **Expected result:** No request is sent, no row is created, and the form stays open with the entered values intact.
- **Severity:** Minor
- **Status:** draft

### Editing an existing case does not trigger the duplicate warning

- **Preconditions:** App running; at least one case exists.
- **Steps:**
  1. Open an existing case via Edit without changing its title.
  2. Click Save changes.
- **Expected result:** The case saves with no duplicate warning (the check is scoped to create only).
- **Severity:** Minor
- **Status:** draft

### Duplicate warning does not catch internal-whitespace differences (known gap)

- **Preconditions:** App running; a case titled "Login test" (single space) exists.
- **Steps:**
  1. Open the New test case form and enter title "Login  test" (two spaces between words) with otherwise valid fields.
  2. Click Create test case.
- **Expected result:** No warning appears and the case is created — matching is trimmed at the ends and case-insensitive, but does not collapse internal whitespace. Documents a known limitation.
- **Severity:** Trivial
- **Status:** draft

### A failed duplicate lookup does not block creation

- **Preconditions:** App running; the duplicate-check request can be made to fail (e.g. server stopped or network offline while the form is open).
- **Steps:**
  1. Open the New test case form and enter a title that already exists, with otherwise valid fields.
  2. Cause the lookup request to fail, then click Create test case.
- **Expected result:** No warning is shown and the create proceeds normally — a failed lookup never blocks creation.
- **Severity:** Minor
- **Status:** draft
