Guide the user through filing a bug report by asking four questions, then save the result in `tests/bugs/`.

## Steps

1. **What did you do?** Ask the user to describe the actions they took that led to the bug. Capture these as numbered reproduction steps.

2. **What did you expect?** Ask what the correct/expected behavior should have been.

3. **What actually happened?** Ask what the app did instead.

4. **Where did it happen?** Ask which page, screen, or part of the app the bug occurred on.

5. **Severity.** Ask the user to choose one:
   - `Critical` — app crashes or data is lost
   - `Major` — core feature is broken with no workaround
   - `Minor` — feature partially works or has a workaround
   - `Trivial` — cosmetic or low-impact issue

6. **Title.** Derive a short, descriptive title from the answers (e.g. "Login button unresponsive on mobile"). Confirm it with the user before saving.

7. **Confirm and save.** Show the formatted report and ask "Does this look right?" Once confirmed, save to `tests/bugs/YYYY-MM-DD-<kebab-case-title>.md` and tell the user the file path.

## Output file format

```markdown
# <Title>

**Date:** <YYYY-MM-DD HH:MM>
**Severity:** <Critical | Major | Minor | Trivial>
**Location:** <page or screen where the bug occurs>

## Steps to Reproduce

1. <step>
2. <step>

## Expected Behavior
<what should have happened>

## Actual Behavior
<what actually happened>
```
