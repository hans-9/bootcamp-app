Walk the user through defining a new feature with 4 questions, then save a spec file to `docs/specs/`.

## Steps

1. **Feature name.** If the user didn't provide it in their message, ask: "What feature are you planning to build? Give it a short name (e.g. 'User Login', 'Comment Feed')."

2. **User story.** Ask: "Who needs this and what do they want to do? (e.g. 'As a visitor, I want to log in so I can access my dashboard')"

3. **Acceptance criteria.** Ask: "How will you know this feature is done? List the conditions that must be true (e.g. 'User sees an error on wrong password', 'Session persists on refresh'). List as many as apply."

4. **Out of scope.** Ask: "What are you explicitly NOT building as part of this feature? (e.g. 'No OAuth, no password reset'). Say 'none' if nothing needs to be excluded."

5. **Confirm and save.** Show the formatted spec and ask "Does this look right?" Once confirmed, save to `docs/specs/<kebab-case-feature-name>.md` and tell the user the file path.

## Output file format

```markdown
# Feature Spec: <Feature Name>

**Date:** <YYYY-MM-DD>
**Status:** Draft

## User Story

<As a [role], I want to [action] so that [outcome].>

## Acceptance Criteria

- [ ] <criterion>
- [ ] <criterion>

## Out of Scope

- <item>
```
