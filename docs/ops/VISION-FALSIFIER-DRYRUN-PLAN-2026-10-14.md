# Falsifier dry-run plan — how the vision gate gets its first real evidence

The shadow gate (`VALIDATION_SPEC_MET`) is doing its job: 0 of 10 ledger rows
have crossed, and nothing film-derived touches a published number. The
founder's audit asks the right question — *how does anything ever cross?* —
and the answer is that the falsifier's two halves can be **partially run
today**, without footage, and the plan for the rest is concrete.

## What the falsifier requires (VISION-CONTRACT.md)

1. **Calibration half**: on held-out plays with known outcomes, 90% credible
   intervals from short-horizon rollouts contain the realized outcome at
   85–95%.
2. **Market half**: per-play uncertainty strictly smaller than the market's
   implied pre-snap distribution on at least one margin.

## What exists TODAY that the two halves can consume

| asset | state | feeds which half |
|---|---|---|
| `cv-pipeline.ts` runMovementPipeline | runs on synthetic fixture frames (by design — "everything runs on fixture frames today") | both, with synthetic geometry |
| `cv-movement-primitive.ts` deriveMovementMetrics | wired, tested | both |
| `intent_beliefs.py` (landed this cycle) | 13 context cells from 45k real 2025 plays: P(route\|down,dist), P(coverage\|down,dist), P(pressure\|rushers) | the "known outcomes" side — real play labels |
| 2,622-game corpus with closing lines | on disk, used by analyst Precedent | market half |
| `film_shadow_ledger.jsonl` | 10 rows, all weight 0 | provenance trail |

## The dry-run protocol (no footage required)

1. Generate N synthetic plays through `runMovementPipeline` (the existing
   fixture generator), yielding per-play separation/break-angle distributions.
2. Split 2025 participation plays (45k, real labels: route, coverage,
   pressure) into train/held-out by WEEK (never random — leakage).
3. Score: does the pipeline's separation distribution, conditioned on the
   intent_beliefs prior for that (down, dist, coverage) cell, produce
   intervals that contain the realized route class at 85–95%?
4. Market half: compare interval width vs the Kalshi full-slate bid/ask
   spread for the corresponding game margin (implied pre-snap distribution).
5. Record BOTH halves' results in the ledger with `validation_spec_met`
   still False until BOTH pass on real footage-derived tracklets — the
   dry-run produces the **scoring-function calibration**, not the final
   verdict. That is exactly what "the sensors are not yet allowed to change
   a published number" needs to stop being true: the calibration machinery
   exists and has been exercised, so real tracklets only need to be dropped
   in.

## What remains genuinely blocked on footage

- Re-ID across pile gaps (`cv-jersey-ocr.ts` has real gating logic —
  Laplacian-variance crop ranking, exact-match stitching — but zero
  consumers and no injectable engine instantiated).
- The geometric half's *final* verdict.

## Identity status after this cycle (assumption 1, corrected)

The audit found the identity chain was missing its middle. It is now
**closed for 2025**: `pbp_participation_2025.parquet` (45,184 plays, 4.7 MB,
downloaded this cycle) carries per-play `play_id` + `nflverse_game_id` +
`players_on_play` (gsis_id list) + `offense_numbers`/`offense_names`
(jersey ↔ name ↔ gsis_id per play). Jersey OCR therefore joins against
participation directly — no roster guesswork. 2026 participation is not yet
released upstream (404 verified); 2025 is the calibration season.

## Assumption 3 status (intent), corrected

The audit was right that the intent layer was frequencies. It now carries
per-context **belief priors** — P(route | down,dist), P(coverage |
down,dist), P(pressure | rushers), P(route | coverage) — from 45k real
plays. What it is still NOT: the called play (unpublished keylessly), or a
belief state over the QB's check tree. `intent_beliefs.py` states this in
its own output; the architecture audit's language ("the closest thing
keyless data allows to a belief state") is the design ceiling, documented
rather than hidden.
