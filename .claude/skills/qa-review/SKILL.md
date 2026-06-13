---
name: qa-review
description: Review code or a change from a QA tester's perspective — ask "what could go wrong", spot missing validation and error handling, and flag untested scenarios. Use whenever the user asks for a "QA review", to "test my change", "what could break", "review this from a QA angle", "find edge cases I missed", or similar quality/risk-focused review requests.
context: fork
---

Review the given code, diff, or feature from a tester's angle — not "does it compile" but "what happens when a user, the network, or the data misbehaves." Be skeptical: assume inputs are hostile, steps fail halfway, and users click the wrong thing.

## What to inspect

Work through these lenses and note concrete, specific problems (cite the file and line where you can):

- **Missing validation** — inputs accepted without bounds, type, or format checks; empty / whitespace / oversized / wrong-type values; boundaries left unguarded.
- **Missing error handling** — failures that aren't caught (network, DB, parse, timeout); promises without `catch`; errors swallowed silently; a thrown error that returns the wrong status or a misleading message.
- **Unclear user messages** — errors that are vague ("Something went wrong"), leak internals, or don't tell the user how to recover.
- **Missing confirmation for destructive actions** — delete / overwrite / bulk / irreversible operations that fire without a confirm step or an undo path.
- **Accessibility** — missing labels / `alt` text, no keyboard path, focus not managed in modals, poor contrast, controls that only work with a mouse.
- **Untested scenarios** — paths with no apparent test coverage: edge cases, error branches, concurrent actions, and the unhappy path generally.

## Method

1. Identify what changed or what's under review. If it's a change, focus on the diff; if a feature or file, review the whole surface.
2. For each lens above, ask "what could go wrong here?" and record real issues — not hypotheticals you can't tie to the code.
3. Don't report style/formatting nits unless they cause a real defect. Quality of findings over quantity.

## Output

Return a structured list grouped under these four severity headings, in this order. Use the project's definitions:

- **Critical** — app crashes or data is lost.
- **Major** — core feature is broken with no workaround.
- **Minor** — feature partially works or has a workaround.
- **Trivial** — cosmetic or low-impact issue.

Under each heading, list issues as bullets. For every issue give:

- **What** — the problem, with `file:line` when known.
- **Why it matters** — the user-facing or data consequence.
- **Suggested fix** — a concrete next step.

Omit a severity heading only if it has no findings. If the change is clean, say so plainly rather than inventing issues. End with a one-line summary: total issues by severity (e.g. "2 major, 3 minor").
