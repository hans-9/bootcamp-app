# Changelog

## [v1.2.0] — 2026-06-15

### Added
- Test run executor: start a run from any test suite, step through each case, record a result (pass/fail/skip) and notes per step, and view a summary when the run is complete.
- GitHub issue link on the bug detail card.

### Fixed
- Completed run results are locked so they cannot be edited after the run closes; navigating away while notes are unsaved now shows a warning.
- The results table is hidden during loading and when there are no results, instead of rendering an empty shell.
- Navigating away from a run in progress resets the start-run state so it does not carry over to the next run.
- Critical and major server-side issues surfaced in QA review are resolved.

[Internal: 5 tooling and config commits were omitted from these notes.]

## [v1.1.0] — 2026-06-14

### Added
- Bug tracker: file bugs with description, severity, priority, steps, expected/actual results, and environment, and track each one through its activity log.
- Bug status workflow that enforces the allowed transitions and rejects invalid status moves.
- Bug list with status, severity, and priority filters, title and description search, and column sorting.
- Bug pages at /bugs and /bugs/:id with a filter bar, sortable table, status dropdown, activity timeline, and a create/edit form.

### Fixed
- Concurrent bug status changes are rejected when stale (409) and the client refetches to stay in sync, so one update no longer silently overwrites another.
- Bug search now matches % and _ literally instead of treating them as wildcards.
- The bug list now includes the previously missing priority filter.
- Creating a bug no longer navigates to a broken page when the server returns no id.

[Internal: 2 dev-tooling commits (comment-rule pre-commit hook) were omitted from these notes.]

## [v1.0.0] — 2026-06-14

### Added
- Initial application: React + Vite client and Express API in an npm workspaces monorepo.
- Test case management: create, list, view, edit, and delete test cases, with a paginated list page.
- Duplicate-title warning on the create form when a case with the same title already exists (case-insensitive); duplicates are still allowed.
- Test suite management: group test cases into ordered suites, with add, remove, and reorder support via drag-and-drop and keyboard up/down buttons.

### Fixed
- Reordering a suite now persists once and uses the server's returned order as the source of truth, instead of firing twice and discarding the response.
- Adding a case already in a suite is handled as a quiet re-sync rather than an error.
- The test-case list no longer fails entirely when one case has a corrupt steps value, and an out-of-range page now clamps to the last page.
- Deleting a case lands you on the correct page after the count changes.
- Saving a stale edit is rejected so concurrent changes are not silently overwritten.
- Oversized request bodies now return a clearer error message.

[Internal: 16 documentation, dependency, and QA-tooling commits were omitted from these notes.]
