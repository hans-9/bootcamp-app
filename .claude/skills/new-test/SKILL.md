Walk the user through writing a manual test case step by step, then save the result as a markdown file in `tests/manual/`.

## Steps

1. **Ask for the feature or scenario to test.** If the user didn't provide it in their message, ask: "What feature or scenario would you like to write a test for?"

2. **Ask for the test title.** A short, descriptive name (e.g. "User can submit the contact form").

3. **Gather preconditions.** Ask: "What needs to be true before this test starts? (e.g. app is running, user is logged in, a record exists)"

4. **Define test steps.** Ask the user to describe what actions the tester performs, one step at a time. Number each step. Keep prompting "Any more steps?" until they say no.

5. **Define expected results.** For each step (or for the overall outcome), ask: "What should happen?" Capture these as the expected results.

6. **Confirm the test case.** Show a formatted summary and ask: "Does this look right?"

7. **Save the file.** Once confirmed, create the file at `tests/manual/<kebab-case-title>.md` using the format below. Tell the user the file path when done.

## Output file format

```markdown
# <Test Title>

**Date:** <today's date>
**Status:** Not Run

## Preconditions
<bullet list of preconditions>

## Steps

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | <action> | <expected result> |
| 2 | <action> | <expected result> |

## Notes
<any additional context, left blank if none>
```
