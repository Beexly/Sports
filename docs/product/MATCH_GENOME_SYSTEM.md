# Match Genome System

**Module:** `packages/decision-field-runtime/src/universal-event-genome.ts`,
`event-genome-fixtures.ts`, `match-derived-stats.ts`
**Surface:** `/matches/preview/*` (Next), `docs/gse-packet/observatory/EVENT_GENOME_PAGE.html` (offline)
**Status:** fixture-only. On fixture data the authority meet caps every claim at `INFO_ONLY`.

## What it is

A sport-agnostic structured object for a single event. Scores24 (and every scoreboard)
shows a *result*; the Match Genome shows the *structured truth* underneath it — participants,
period schema, score state, a knowable-in-time timeline, a flat stat bag the adapter understands,
odds examples, and prediction examples — each tagged with provenance and a fixture watermark.

## The genome

`UniversalEventGenome` carries: `eventId`, `sport` (soccer · baseball · football · basketball ·
hockey · tennis · esports · generic), `league`/`tournament`/`region`/`season`/`stage`, a
`[Participant, Participant]` tuple, `venue`/`weather`/`officials`, `startTimeLabel`, `status`
(`UPCOMING | LIVE | ENDED | POSTPONED | CANCELLED`), a `PeriodSchema` (halves/innings/quarters/…),
a `ScoreState` (with per-period scores), a `TimelineEvent[]` where every event records
`knownAtMarker` (light-cone honesty — was this knowable at the marker it claims?), a flat
`stats` bag, `odds`, `predictions`, and the non-negotiable `fixtureWatermarked: true`.

Adapters (`SoccerAdapter`, `BaseballAdapter`, `FootballCflAdapter`, generic) read the sport-specific
stat bag. `adapterFor(sport)` selects one; missing stats degrade gracefully (`statNum` returns 0,
never throws); `isLive()` always returns `false` on fixtures — **no fixture is ever rendered as live.**

## Derived stats

`matchDerivedStats(genome)` returns 20 soccer-specific derived metrics (e.g. Possession Mirage Index,
xG Justice Score, Underdog Deservedness, Stat Meaning Confidence). Each `MatchDerivedStat` carries
`value | null`, `formula`, `explanation`, `inputs`, `weakness`, `decisionUse`, and a `passport`
(`StatGenome`) whose evidence on a fixture is `FIXTURE` → status clamped to `EXPERIMENTAL`. Zero-division
returns `null`, never a fabricated number. Non-soccer events return `[]` (no over-claiming).

## Invariants

- Every genome is fixture-watermarked; nothing computed here exceeds `EXPERIMENTAL`/`INFO_ONLY`.
- A stat with missing inputs is `null` + a stated weakness — never imputed.
- The timeline records knowability, so a "stat" can never silently claim post-hoc information.
- Sport-specific data degrades gracefully; the generic adapter always loads.

## What it does NOT do

No live data, no network, no clock, no betting call. The genome is the substrate the rest of the
institution reasons over — it is not advice and not a performance claim.

## Tests

`packages/decision-field-runtime/src/__tests__/event-genome.test.ts` (adapters load, period schema
present, graceful degrade, no-fixture-as-live, every stat carries passport/weakness/decisionUse,
zero-division safe).
