# Replacing three rule-based enrichers with data this platform already persists

Written for whoever maintains `agents_website_list/AdvancedDataEnrichment.py`. It closes
the same three gaps that module closes, using measurements instead of constants. It is a
drop-in target, not a critique: every field below is already written to a migrated table
on a daily cron in this repository.

## Why this exists

The module's own next step reads "replace dummy data in `train.py` with real play-by-play
data from NFL Next Gen Stats." That is exactly right, and the data is already here. Nothing
needs to be acquired, licensed on new terms, or scraped.

## The table

`NextGenStat`, defined in `packages/db/prisma/schema.prisma`, written daily by
`apps/web/app/api/cron/refresh-player-stats/route.ts:144-145` through `ingestNextGenStats`
(`apps/web/lib/ingestion/next-gen-stats.ts`) for `statType` in passing, receiving and
rushing. Unique on `(gsisId, season, week, seasonType, statType)`, so the grain is
**player-week**, never per play. Every row carries `rightsSnapshot` and `fetchedAt`.

Column names as they exist in the schema, not as the upstream CSV spells them:

| Prisma field | statType | What it measures |
|---|---|---|
| `avgCushion` | receiving | how far off the defender lines up at the snap |
| `avgSeparation` | receiving | receiver separation at the catch point |
| `avgYac`, `avgExpectedYac`, `avgYacAboveExpectation` | receiving | actual, expected, and the residual |
| `catchPct`, `pctShareIntendedAirYards` | receiving | conversion and target share of air yards |
| `avgTimeToThrow` | passing | snap to release, in seconds |
| `avgIntendedAirYards`, `avgCompletedAirYards`, `avgAirYardsToSticks` | passing | depth |
| `cpoe`, `expectedCompletionPct`, `completionPct` | passing | completion over expected |
| `aggressiveness` | passing | throws into tight windows |
| `avgTimeToLos` | rushing | snap to line of scrimmage, in seconds |
| `pctAttemptsGte8Defenders` | rushing | stacked-box exposure rate |
| `rushYardsOverExpected`, `rushYardsOverExpectedPerAtt`, `expectedRushYards` | rushing | tracking-expected rushing residual |

## Gap 1: per-defender route coverage

**Replace:** a rule-based inference engine emitting defender recommendations with grades of
60 to 95 percent.

**With:** `avgCushion` and `avgSeparation` per receiver-week, joined to the opponent by
schedule. Cushion is a measured defender behaviour; separation is the measured outcome of
the coverage. Build the defensive side as the opponent aggregate: for each defence, the
separation and cushion it allowed across the receivers it faced, per week.

**What you must not claim.** This is exposure, not assignment. It does not say which
defender covered which receiver, and no field in this table does. Name the feature
`coverage_exposure_*`, never `per_defender_*`. The assignment genuinely does not exist in
any source this platform holds, and inventing a priority grade for it is the one move that
makes every downstream number unverifiable.

## Gap 2: time to pressure

**Replace:** heuristic timing profiles of deep 2.5s, short 3.0s, intermediate 4.0s.

**With:** `avgTimeToThrow` for the passer-week, and `avgTimeToLos` for the rusher-week,
both in seconds, both measured. For the defensive side, pair them with the sack-and-hit
rate derived from play-by-play, which this repository already computes as an explicit
FLOOR proxy because hurries are not present in nflverse or the FTN subset
(AGENTS.md:2277-2279).

**Three corrections the constants need regardless of which source is used.**

1. **Scale.** `packages/data-ingestion/src/__tests__/nflverse-ngs.test.ts` pins real values
   whose header records them as verified live against the source to the decimal on
   2026-07-03. Two quarterbacks at 9.1 average intended air yards, which is intermediate
   depth, read 2.799s and 2.970s. The claimed intermediate 4.0s is 35 to 43 percent above
   that band.
2. **Ordering.** The profile places deep at 2.5s BELOW short at 3.0s. Time to throw rises
   with route depth, so the ordering is inverted, and non-monotone besides, with
   intermediate above both.
3. **Definition.** The profile, and the stated learning objective built on it, describe the
   interval as "seconds before snap". Time to throw and time to pressure are both measured
   from the snap FORWARD. A model trained to predict a pre-snap quantity that does not
   exist will fit noise and report it as skill.

**What you must not claim.** Time to THROW is not time to PRESSURE. Name it
`time_to_throw_*` and treat the pressure relationship as a hypothesis with its own test.

## Gap 3: WR versus CB matchup assignment

**Replace:** a rule-based expertise matrix with hand-set priorities such as WR to CB 95
percent and WR to LB 80 percent.

**With:** the receiver's `avgSeparation` and `avgCushion` against the opponent defence's
allowed aggregate for the same week, plus `pctAttemptsGte8Defenders` for the run side. The
matchup feature is a differential between what a receiver normally achieves and what a
defence normally allows.

**What you must not claim.** The named-defender assignment is absent. A differential
between player and opponent aggregates is a matchup feature; it is not an assignment, and
labelling it one imports a certainty the data does not carry.

## The rule that governs all three

A measurement is a number produced by observing the world. A heuristic constant is a number
produced by someone's judgement. Substituting the second for the first while keeping the
first's name is how a track record stops meaning anything, because every figure downstream
inherits the invention and is still reported as measured.

An absent source is closed by acquiring the data, by finding a cleared source that carries
it, or by the row staying absent. Never by a default, a heuristic profile, a rule-based
matrix or a priority weight.

## Two constraints to check before wiring any of this

**Grain.** Player-week. It supports weekly matchup features. It cannot support per-play
kinematics, so any objective needing speed, acceleration or separation per frame is not
reachable from this table; that is the NFL's tracking feed, which is enterprise-only.

**Rights.** `nextgen_stats` via nflverse is flagged in
`reports/rights/pfr-advstats-verdict-2026-07-16.md` as "equally third-party-sourced with no
explicit grant, not a safe substitute". The platform already persists it with a
`rightsSnapshot` on every row, so this is a live founder question rather than a data
question, and it should be answered before anything built on it is served to a customer.

## One module worth keeping as-is

`UncertaintyQuantification.py` (ensemble, Bayesian, conformal) addresses a real need and
overlaps work already correct in this repository: `conformal-calibration.ts:174` returns
positive infinity below `minN` 20 rather than clamping, which is the right pattern, and
`apps/web/lib/calibration/cqr.ts:12-15` does clamp and is a known defect. Whichever
implementation wins, the rule is that a small-sample interval refuses rather than
pretending to a coverage it does not have.
