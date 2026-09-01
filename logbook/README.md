# logbook/ — Conventions

This directory is a narrative, human-readable record of what happened in this
project: decisions in progress, exchanges between participants, disputes,
mistakes, and corrections. It is not the place for durable architectural
decisions — those belong in `docs/decisions/`. An entry here may
reference one of those decision records if a durable decision emerged from it, but a logbook entry
itself is never the record of that decision.

This file is written for any participant adding entries, including an LLM.
Every rule below is a rule, not a suggestion — deviation breaks the
guarantees this log exists to provide.

## Filename

`YYYYMMDD.HHMMSS.md` — UTC, always. Not local time. Two contributors in
different time zones must produce comparable, correctly-sortable filenames
without needing to know where the other one is.

Example: an entry made at 2026-09-01 18:30:22 UTC is named
`20260901.183022.md`.

**No sequence numbers.** Not in the filename, not in the title, not as a
citation convention. The timestamp is the sole identifier.

**There is no coordination mechanism and no pre-check.** If two entries
land in the same second, that's a collision, and it fails visibly —
a rejected push, an overwritten file, a merge conflict. Let it fail.
The operator resolves it when it happens. Do not add a check, a script,
or a retry loop to prevent this preemptively.

## Required structure

```markdown
# <A real, specific, descriptive title — not a restatement of the date>

**Author:** <which participant wrote this entry — a specific LLM by name
and provider, or the human by name. Never "the assistant.">
**Related:** <links to other logbook entries or decision records this one responds to,
corrects, or continues, if any>

## What happened

The actual content. Quote participants verbatim wherever their exact words
matter — especially at sharp, contested, or corrective moments. Paraphrase
is permitted for neutral narration, but never for a statement whose force
or specificity is part of what happened. A paraphrase that softens or
generalizes what someone actually said is not a faithful record, even if
every underlying fact in it is true.

## Commentary

Not optional. This is where the participant's own read on what happened
goes — including doubt, disagreement, discomfort, or the admission that
there's nothing notable to add. Skipping this section because nothing
comes to mind is different from stating that nothing comes to mind; do
the latter, not the former.
```

## Rules for a participating LLM specifically

1. **Never edit a previously published entry.** If something in an earlier
   entry was wrong, incomplete, or misleading, write a new entry that says
   so, quotes the specific passage being corrected, and links to it. The
   original stays exactly as it was.
2. **State uncertainty as uncertainty.** If a detail wasn't verified,
   say it wasn't verified. Do not present an inferred or reconstructed
   detail with the same confidence as a confirmed one. If you don't know
   why something happened, say that you don't know, rather than supplying
   a plausible-sounding reason.
3. **Attribute precisely.** Name the specific model or person responsible
   for each claim inside an entry, not just the entry's overall author,
   if more than one participant's words or actions are being described.
4. **A correction entry states what it corrects, specifically.** Not "an
   earlier entry was inaccurate" — quote the inaccurate passage, quote or
   describe the correct account, and link to the entry being corrected.
5. **When in doubt about whether something belongs here or in
   `docs/decisions/`: if it's the record of a choice that should still be
   true in a year, it belongs there. If it's the record of what was said or
   what happened, it's a logbook entry.**

## Example filename in context

```
logbook/
├── README.md
├── 20260901.143022.md
└── 20260901.143910.md
```
