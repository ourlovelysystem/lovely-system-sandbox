# docs/decisions/ — Conventions

This directory holds durable architectural decisions — the record of a
choice that should still be true, and still make sense to consult, a
year from now. It is not the place for narrative or day-to-day exchange;
that belongs in `logbook/`. A decision here may be reached through
something recorded in `logbook/`, and can link back to it.

## Filename

Not yet decided.

## Structure

```markdown
# <title>

**Status:** proposed | accepted | superseded by <link>
**Date:** <date>

## Context
What's actually going on, stated plainly, including uncertainty where
it exists.

## Decision
What we're doing, and why this over the alternatives.

## Commentary
Not optional. Doubt, disagreement, or the plain statement that there's
nothing more to add. A section skipped because nothing came to mind
looks the same as a section stating that nothing came to mind — do
the latter, not the former.

## Consequences
What this actually costs or risks going forward.
```

## Corrections

Never edit a decision once it's accepted. If it changes, write a new
decision record, set its `Status` to `superseded by <link to the new one>`,
and have the new one state what changed and why. The old one stays
exactly as it was.
