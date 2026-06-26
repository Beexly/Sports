# Stat Passports

**Module:** `packages/decision-field-runtime/src/stat-foundry.ts` (`StatGenome`, `clampStatus`),
consumed by `match-derived-stats.ts`
**Surface:** Passports tab of `/matches/preview/*` and the offline Event Genome page
**Status:** fixture-only; no stat reaches `VALIDATED` on fixture data.

## What it is

Every number GSE shows carries a passport: where it came from, what question it answers, the exact
formula, the data it needs, how it fails, what decision it changes, and a status that can never
outrun its evidence. A stat is a *living hypothesis*, not a fact — the passport is its genealogy.

## The genome of a stat

`StatGenome` fields: `key`, `name`, `version`, `questionAnswered`, `formula`, `unit`,
`decisionStatesSupported` (which `DecisionState`s it can inform), `falsifier` (what would prove it
wrong), `expectedFailureModes`, `knownAtRequirement` (point-in-time honesty), `uncertaintyMethod`,
`evidence` (`FIXTURE | BACKTEST | SHADOW | LIVE`), `status` (`EXPERIMENTAL | CANDIDATE | VALIDATED`),
`implemented`.

`clampStatus(evidence, requested)` is the gate: with `FIXTURE` evidence the status is clamped to
`EXPERIMENTAL` no matter what is requested. A stat earns `CANDIDATE`/`VALIDATED` only with backtest /
shadow / live evidence and a passed falsifier — never by assertion.

## Why a falsifier is mandatory

A metric with no falsifier is not science, it is decoration. Each passport names the observation that
would invalidate it, and the failure modes that make it fragile (small sample, provider variance,
style dependence, model-on-model). The UI surfaces "fails when…" next to every value.

## Invariants

- On fixtures, every badge is `EXPERIMENTAL` or `CANDIDATE` — never `VALIDATED`/`OFFICIAL`.
- A stat with a needed input missing renders `null` + its weakness, never a fabricated value.
- Status is a function of evidence, not of confidence or marketing.
- `Stat Meaning Confidence` caps how much any single-match stat may drive a call (low by design at n=1).

## What it does NOT do

It does not assert truth, rank "best" metrics, or let a fixture-computed number influence a live gate.

## Tests

Stat Foundry tests assert: no stat claims `VALIDATED` on fixtures, every passport has a falsifier,
clamp behavior holds, and the derived-stats passports each carry weakness + decision-use.
