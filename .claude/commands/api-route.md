---
description: Scaffold a new Express API route following this repo's conventions.
---

Add a new Express API route for: $ARGUMENTS

Follow the repo conventions (CLAUDE.md → Architecture, API Response Shape, File Naming):
- Name the handler `handleVerbNoun` (e.g. `handleCreateUser`) in `server/routes/<kebab-case>.js`.
- Every response uses the `{ success, data, error }` envelope via the `ok(res, data)` / `fail(res, status, msg)` helpers — mirror `server/routes/test-runs.js`.
- Register the route in `server/index.js` beside the related routes.
- Validate inputs: return 400 with a clear message on bad input, 404 when the resource is missing.
- kebab-case filenames; add a comment only for a non-obvious *why*.

Show the new handler, the registration line, and any `client/src/api.js` helper the client needs.
