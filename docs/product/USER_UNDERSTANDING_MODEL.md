# User Understanding Model — Galaxy Sports Edge

## Purpose

Track what users understand, misunderstand, and need to learn next — so
the product can default to clarity, not noise. This is a **defaults
engine**, never a gate.

## Architecture

```
apps/web/lib/understanding/
├── user-understanding.ts   # concept taxonomy + estimated bands
├── confusion-signals.ts    # observable confusion patterns + remediations
└── learning-state.ts       # next-module recommendation engine
```

## Concept taxonomy

15 concepts the product tracks (`UNDERSTANDING_CONCEPTS`). Each has four
estimated bands: `unknown → introduced → familiar → fluent`. Bands are
**monotonically non-decreasing** — `promoteBand` never demotes silently.

## Evidence-driven promotion

`EVIDENCE_FOR_CONCEPT` maps observable behavior (surface-viewed with
minimum dwell, explainer-opened with a known key, methodology-followed,
academy-completed) to a band promotion. The product never uses
self-declared mastery; only behavior promotes the band.

## Confusion signals

Six patterns the product treats as confusion (`ConfusionSignal`):
short-dwell, repeated-back, explainer-bounce, search-fallback,
tier-mismatch, evidence-card-unread.

Six legal remediations (`ConfusionRemediation`):
- show methodology
- open academy module
- elevate the pass list
- explain evidence chain
- lower density / move to guided mode
- none

Forbidden remediations include `place-bet`, `raise-stake`, `upsell`, and
`show-scarcity-timer`. The boundary asserts the prohibition.

## Learning state

`recommendNextModule()` walks the FLUENCY_PATH and returns the highest
priority module whose backing concept is below `fluent`. The
recommendation is a **suggestion**, not an enrollment. The user is always
free to ignore it.

Priority order intentionally promotes restraint modules first:
`no-bet → process-grading → tilt-and-bankroll → evidence-chain → ...`

## What this is not

- Not a competency claim against the user.
- Not a gate on content the user explicitly asks for.
- Not used for ad targeting, conversion optimization, or volume nudges.
- Not stored against a raw user id — only against `subjectBucket`.

## Authority

- Constitution #6 (process over outcome)
- Constitution #11 (clarity is the default)
- Decision Quality Maturity Model (C22)
- Experience Orchestrator (C26) consumes this snapshot as one input

## Review

Quarterly: re-evaluate which evidence triggers are still well-calibrated.
Annual: review concept taxonomy for gaps. Owner-only amendments.
