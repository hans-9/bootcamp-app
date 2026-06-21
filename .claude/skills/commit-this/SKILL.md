---
name: commit-this
description: Stage and commit the working-tree changes following this repo's Git conventions — analyze the diff, split it into logical commits, propose messages, and verify each commit. Use whenever the user asks to "commit", "commit this", "commit my changes", "create commits", or "split this into commits".
model: haiku
---

Turn the current working-tree changes into one or more clean, well-scoped commits that follow this repo's conventions. Be deliberate: understand every change before staging it, never bundle unrelated work, and verify the result.

## 1. Survey the changes

Run these together and read the full picture before doing anything:

- `git status` — what's modified, staged, and untracked.
- `git diff` — unstaged changes.
- `git diff --staged` — anything already staged.
- `git log --oneline -5` — recent history, to match the project's commit style.

If there is nothing to commit, say so and stop. If changes are already staged, fold them into the analysis rather than blindly committing them.

## 2. Analyze and group into logical commits

Read each change and decide what concern it belongs to. Group changes so that **each commit is one coherent, self-contained unit of work** — a reviewer should understand it from the message alone.

- Split unrelated work into separate commits (e.g. a feature, a docs tweak, and a new skill are three commits, not one).
- Keep a fix and its tests together; keep a feature and the tests that cover it together.
- Order commits so the history reads sensibly (e.g. a refactor before the feature that builds on it).
- Stage per block with explicit paths: `git add <path> <path>`. Do not use `git add .` when splitting.
- Note: interactive staging (`git add -p`/`-i`) is unavailable in this environment. If a single file mixes concerns that should be split, say so and propose the cleanest path-level grouping instead.

Briefly tell the user the planned commit breakdown before committing.

## 3. Safety checks before committing

- **Secrets / junk:** scan the diff for credentials, API keys, `.env` contents, tokens, or large/binary files that shouldn't be tracked. Flag anything suspicious and confirm before committing it.
- **Branch:** check the current branch. This repo commits directly to `main` (see history) — follow that unless the user says otherwise. If the change is risky or the user wants a PR, offer to branch first.
- **Scope:** confirm you're only committing what the user asked for; don't sweep in unrelated stray edits.

## 4. Compose the message

Per this repo's Commit Messages convention:

- Format: `type: short description` — all lowercase, no trailing period, subject under 72 characters.
- Types: `feat` (feature), `fix` (bug fix), `perf` (performance), `refactor` (restructure, no behavior change), `docs` (docs only), `test` (tests), `build` (build/deps, e.g. `package.json`), `ci` (CI config), `chore` (other maintenance), `revert` (undo a commit). Pick the most specific type that fits.
- Add a body (a second `-m`) when the *why* isn't obvious from the subject — wrap at ~72 cols, explain what changed and why, not how.
- **Never** add a `Co-Authored-By` trailer or any AI-attribution line.

**Determine the commit type yourself** based on the nature of the change — do not offer it as a variable across suggestions. All three suggestions must use the same type. Only the description should vary across the three options. Make the first option your recommendation.

## 5. Commit and verify

For each commit, after running it confirm the result rather than assuming it landed:

- `git log -1 --format='%h %s'` — confirm the subject committed exactly as intended (and capture the hash).
- `git status --short` — confirm the tree is in the expected state and nothing was accidentally left unstaged.

When all planned commits are done, show a short recap: the new commit hashes + subjects, and that the tree is clean.

## 6. Pushing

Do **not** push unless the user explicitly asks. If they do, confirm the branch and remote first, then `git push` and report the result.
