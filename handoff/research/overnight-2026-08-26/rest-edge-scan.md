# Rest / Short-Week / Timezone Edge Scan — SCAN ONLY
> Generated 2026-08-26 · source: `data/nflverse/games_harness_rows.jsonl` (6967 games 1999-2025)
> Preregistered hypotheses declared BEFORE computing. Nothing here promotes to SURVIVOR.
> Cover benchmark: 0.476 (after -110 vig). Positive z = covers MORE than breakeven; negative = covers LESS.
> Multiple-testing caveat: 3 preregistered hypotheses => family-wise Type-I inflation; any single |z|>2 should be read as a FALSIFIER-QUEUE CANDIDATE, not confirmation.

## Hypotheses (preregistered)
- **H1** Short-week (Thu/Sat after Sun) road favorites cover LESS. (SpreadLineHome < 0 = away favored; cover = result < spreadLineHome.)
- **H2** West-coast (Pacific) team playing 10am PT road game covers LESS. (Pacific away + shift >=2 + venue east/central => ~1pm ET kickoff = 10am body-clock.)
- **H3** Teams crossing >2 timezone zones EASTWARD (positive shift >=3) cover LESS. Road-favorite subset only.

## H1 — Short-week road favorites (Thu/Sat)
| Era | n | Hits | Cover rate | z (vs 0.476) | Note |
|---|---|---|---|---|---|
| all | 180 | 96 | 0.533 | +1.54 | No strong signal (|z|<=2) |
| pre2015 | 81 | 47 | 0.580 | +1.88 | No strong signal (|z|<=2) |
| post2015 | 99 | 49 | 0.495 | +0.38 | No strong signal (|z|<=2) |

## H2 — West-coast 10am PT road favorites (Pacific away, shift>=2, venue ET/CT)
| Era | n | Hits | Cover rate | z (vs 0.476) | Note |
|---|---|---|---|---|---|
| all | 51 | 17 | 0.333 | -2.04 | No strong signal (|z|<=2) |
| pre2015 | 15 | 6 | 0.400 | -0.59 | No strong signal (|z|<=2) |
| post2015 | 36 | 11 | 0.306 | -2.05 | FALSIFIER QUEUE CANDIDATE (post-2015 |z|>2) — SCAN ONLY |

## H3 — Eastward cross >2 zones (shift >=3) road favorites
| Era | n | Hits | Cover rate | z (vs 0.476) | Note |
|---|---|---|---|---|---|
| all | 106 | 61 | 0.575 | +2.05 | No strong signal (|z|<=2) |
| pre2015 | 27 | 13 | 0.481 | +0.06 | No strong signal (|z|<=2) |
| post2015 | 79 | 48 | 0.608 | +2.34 | FALSIFIER QUEUE CANDIDATE (post-2015 |z|>2) — SCAN ONLY |

## Reconciliation note (orchestrator, post-worker)

My first-pass recheck of H3 used a hand-typed timezone table that omitted
LAR and miscounted 5 PHI-home games — inflating n to 84 and z to +2.63.
The worker table (matching nfl-body-clock.ts exactly) gives n=79, cover
60.8%, z=+2.34 post-2015 — confirmed correct. H3 stands as a
falsifier-queue candidate at z~+2.3 with the 3-test family-wise caveat.
Lesson: never hand-type reference tables; import the module constants.

## Verdict (honest)
- **FALSIFIER-QUEUE CANDIDATES (post-2015 |z|>2):** H2, H3. These warrant falsifyBind + market-price check — NOT a SURVIVOR claim.
- Family-wise: 3 preregistered tests => unadjusted p-values overstate significance; treat any single |z|>2 as a candidate for a follow-up falsifyBind trial (closed line, not opening).
- Inputs: `NFL_TEAM_UTC_OFFSET` mirror from `nfl-body-clock.ts`; spreadLineHome < 0 => away favored; result vs spreadLineHome defines cover; only games with non-null spreadLineHome and result included.
- Caveat: harness has no kickoff-time field; H2 approximates 10am PT by (Pacific away + venue offset <= -6 + shift>=2). This is a structural proxy, not a clock-time bind.
