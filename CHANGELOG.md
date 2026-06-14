# Changelog

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
