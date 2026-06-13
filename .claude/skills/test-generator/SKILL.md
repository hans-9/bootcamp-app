---
name: test-generator
description: Turn a feature description into a complete set of manual test cases using ISTQB boundary-value analysis and equivalence partitioning. Use whenever the user asks to generate, write, or design test cases for a feature, field, form, or endpoint — including requests phrased as "test cases", "test this", "ISTQB tests", "edge cases", or "what should I test".
---

Generate a thorough set of manual test cases from a feature description, covering the happy path plus the edges and invalid inputs that real testing has to exercise.

## When the request is vague

If the user gives only a feature name with no rules (e.g. "test the login form"), make reasonable assumptions about the inputs and their constraints, then state those assumptions at the top of your output so they can be corrected. Don't block on a clarifying question unless the feature is genuinely ambiguous.

## Technique

Apply **ISTQB boundary-value analysis** and **equivalence partitioning**:

- **Equivalence partitioning** — group inputs that the system treats the same way (e.g. all passwords 8–64 chars are "valid length"; all under 8 are "too short"). Write one case per partition rather than many redundant cases inside the same partition.
- **ISTQB boundary-value analysis** — for every input with a range or length limit, test the values at the edges, because that's where defects cluster.

## Coverage checklist

For each input or field in the feature, produce cases covering:

- **Happy path** — a valid input from the normal "in range" partition.
- **Boundary values** — `min`, `max`, `min - 1`, `max + 1`, plus `empty`, `whitespace only`, and `very long` (well past `max`).
- **Equivalence partitions** — one representative case for each distinct valid and invalid partition.
- **Negative cases** — wrong data type, missing required field, and duplicate value (where uniqueness applies).

Skip a row only when it genuinely can't apply to that input (e.g. no `max` defined) and note why.

## Test case shape

Follow the project's test case rules: **one scenario per test case**, every step a **single observable action**, and use the standard test data where it fits (valid `test@example.com` / `Password123`, invalid password `wrong123`, non-existent user `ghost@example.com`).

Output each case in this format:

```markdown
### <title — describes the single scenario>

- **Preconditions:** <what must be true before this test starts>
- **Steps:**
  1. <single observable action>
  2. <single observable action>
- **Expected result:** <the one outcome to verify>
- **Severity:** <Critical | Major | Minor | Trivial>
- **Status:** draft
```

Pick **severity** by impact: Critical = crash or data loss, Major = core feature broken with no workaround, Minor = partial/with workaround, Trivial = cosmetic. New cases start at **draft**.

## After generating

Show the full set of cases. Then offer to save them to `tests/manual/<kebab-case-feature>.md` — only write the file if the user confirms.
