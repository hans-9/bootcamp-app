# Changelog

## [v1.7.0] — 2026-06-22

### Added
- A flaky test tracker that ranks your ten flakiest tests by fail rate, each with a plain-language explanation of the likely root cause. New flaky tests are flagged automatically and announced over Discord.
- The QA toolkit is now packaged as an installable plugin, bundling its commands, skills, and helpers so you can drop the whole kit into another project.
- The app is now a deployed, hosted site, so you can reach it from a live URL instead of running it yourself.

### Fixed
- Charts now follow your theme: their colors are read from the active palette, so axes and series stay visible in dark mode.
- Long tables now scroll sideways on phones instead of squishing or spilling off the page, while staying full-width on larger screens.
- The bug activity view now offers a clear next step when there's nothing to show yet.
- Row action menus on the last row of a table no longer get clipped on mobile.
- Discord alerts are more reliable: a recurring flake alerts again once the test settles, a failed alert retries instead of being silently lost, and a Discord outage no longer blocks the run that triggered it.

### Changed
- A refreshed look throughout: more breathing room, lighter borders, rounder cards, and consistent spacing across pages.

## [v1.6.0] — 2026-06-21

### Changed
- The top navigation now adapts to small screens: section links tuck behind a menu button you can open and close, and it stays fully keyboard-accessible. On larger screens the navigation looks and works just as before.

## [v1.5.0] — 2026-06-21

### Added
- Quick search you can open from anywhere to jump straight to a test case, bug, or suite, plus keyboard shortcuts for moving between sections and a built-in cheat sheet of every shortcut.

## [v1.4.0] — 2026-06-21

### Added
- Trend charts on the dashboard: pass rate over your recent runs, bugs opened versus closed each week, and test-case coverage by status.
- A reports page you can print or save as a standalone HTML file.
- Import test cases from a CSV file, with a per-row preview that flags invalid or duplicate rows before you commit the valid ones.
- Export your test cases to CSV, covering every case that matches your current filters rather than just the page you're viewing.
- A preferences and settings page.

### Changed
- Test-case titles must now be unique, and saving a duplicate title is rejected. Titles, steps, expected results, and preconditions also have length limits.


## [v1.3.0] — 2026-06-18

### Added
- A dashboard that opens to an at-a-glance overview: total test cases, pass rate, open bugs, and average run duration, alongside your most recent test runs and a feed of recent activity. The numbers stay current on their own, and you can jump straight to any run or bug from the list.

## [v1.2.0] — 2026-06-15

### Added
- Run a test suite end to end: start a run, step through each case, mark it passed, failed, or skipped with notes as you go, and see a summary once the run is done.
- A link to the related GitHub issue on each bug.

### Fixed
- Finished runs are locked so their results can't be changed after the fact, and you're warned before leaving with unsaved notes.
- The results list no longer shows an empty frame while loading or when there's nothing to show.
- Leaving a run in progress no longer carries its state over into your next run.
- Resolved the critical and major issues found in QA review.

## [v1.1.0] — 2026-06-14

### Added
- Bug tracker: file bugs with a description, severity, priority, steps, expected and actual results, and environment, and follow each one through its activity history.
- A bug status workflow that only allows valid transitions and blocks invalid ones.
- Filter bugs by status, severity, and priority, search by title and description, and sort by any column.

### Fixed
- When two people change a bug's status at once, the stale change is rejected and the page refreshes, so one update no longer quietly overwrites another.
- Bug search now treats % and _ as ordinary characters instead of wildcards.
- Added the missing priority filter to the bug list.
- Creating a bug no longer lands you on a broken page.

## [v1.0.0] — 2026-06-14

### Added
- First release of the test management app.
- Create, view, edit, and delete test cases, browsed through a paginated list.
- A warning when you create a test case whose title matches an existing one, while still letting you save it.
- Group test cases into ordered suites, adding, removing, and reordering them by drag-and-drop or keyboard.

### Fixed
- Reordering a suite now saves reliably and keeps the order the server confirms.
- Adding a case that's already in a suite no longer shows an error.
- A single corrupt test case no longer breaks the whole list, and opening a page past the end now lands on the last page.
- Deleting a case keeps you on the right page afterward.
- Saving an edit over someone else's newer change is rejected instead of silently overwriting it.
- Oversized submissions now show a clearer error.
