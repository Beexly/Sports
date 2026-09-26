# Funnel answers — the weekly record

The output of [Prompt #1](./BUSINESS-PROMPTS.md#1--the-weekly-funnel-question) lands
here, one row per week, forever. Nothing else goes in this file.

Prompt #1's own closing note asks that the stop-loss live *in the same file as the
answers, so it fires on its own rather than needing someone to notice.* That is the
whole reason this file exists rather than the answers living in a chat log: a counter
nobody maintains is a counter that never reaches eight.

**Status: no weeks on record.** This file has never been run. That is a true statement
about the business, not a placeholder — the funnel has never been measured, which is
the blind spot the library was written to close. NORTHSTAR says the same thing in its
own closing line: *"except the funnel question, which is the one measurement this repo
has never taken. That is the point."*

---

## The stop-loss, pre-committed

> **Eight consecutive no-signal weeks trigger a 20,000-foot session on
> product-market fit — the honest one, not a feature discussion.**

That is not this file's invention. It is NORTHSTAR §7, *Stop-losses (pre-committed)*,
verbatim: *"If the funnel question returns 'no signal' for 8 consecutive weeks,
Track R's roadmap gets its own 20k-ft session — the honest one about product-market
fit, not features."* (`docs/ops/PLAN-2026-08-26-NORTHSTAR.md`, arriving on
[#672](https://github.com/Beexly/Sports/pull/672).) What this file adds is the
counter, and the rules below that make the counter unambiguous — a stop-loss with
nowhere to accumulate is a stop-loss that never fires.

Pre-committed means those rules were fixed before any data existed, so they cannot be
renegotiated by the person reading a run of bad weeks. Written on 2026-08-26.

**What counts as a no-signal week.** Exactly one thing: the **Signal or noise** section
of that week's answer did not conclude *signal*. Two cases both count —

1. The answer ran and concluded the movement is not distinguishable from noise.
2. **The answer did not run, or ran with the core figures `MISSING:`.** A week that
   was not measured is a no-signal week. It counts toward the eight and it does not
   reset the counter. This clause is deliberate: without it the stop-loss is evaded
   by not looking, which is the exact failure it exists to prevent.

**What resets the counter to zero.** One thing: a week whose Signal-or-noise section
concludes the movement *is* distinguishable from noise. A good feeling about a week
does not reset it. A single large number inside an otherwise-noise week does not reset
it. Only the verdict resets it.

**What happens at eight.** The session is held before any further product work. Its
subject is fixed in advance so it cannot become a feature meeting:

- Does the door exist — is anyone paying for this, at this price, without persuasion?
- If not, is the honest reading *wrong product*, *wrong price*, *wrong audience*, or
  *no market*? Name one.
- What would have to be true in the next eight weeks to change that reading, and is
  there any evidence it could become true?

The session's output is a written answer to those three questions appended to this
file. Not a roadmap. Not a list of things to try.

**The counter is updated in the same edit as the row.** A row added without touching
the counter is an incomplete entry.

### Counter

    Consecutive no-signal weeks: 0 of 8
    Last reset: never (no weeks on record)

---

## The record

Append-only. Never edit a landed row — if a figure was wrong, add a correction row
and say what was wrong. A rewritten history cannot be trusted at fifteen minutes a day.

Use `MISSING:` in any cell whose figure was not present in that week's source data.
Never estimate, never interpolate, never carry last week's number forward. An empty
table is a finding; a full table built partly from guesses is a lie that is invisible
at exactly the moment it matters most.

| Week ending | Signups | Paying conv. | Churn | Net MRR Δ | Signal or noise | No-signal streak after this week | Answer |
|---|---|---|---|---|---|---|---|
| _(none yet)_ | | | | | | | |

**Answer** links to the full prompt-#1 output for that week — the five sections, not
just the numbers. The table is an index, not the record. The read, the delta, and the
"what I'd need to answer better" are the parts that compound, and they do not fit in
a cell.

---

## Weekly answers

Newest first. Each entry is the verbatim output of Prompt #1, unedited. If an answer
was produced with data you already know to be incomplete, say so above the answer
rather than trimming the answer.

_(No answers on record.)_
