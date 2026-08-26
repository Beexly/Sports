# CPOE Falsifier — 2016→2024 PBP Seasons
> Branch: `hermes/w2-audit-settlement`. Source: `data/nflverse/pbp/play_by_play_2016..2024.csv` + `games_harness_rows.jsonl` (spread/result, odds 2006+ so 2016-2024 covered). DISCLAIMER: descriptive/not-investment-advice. -110 ROI shown for naive backtest context only.

## Lead / Verdict (honest)
**VERDICT: KILLED.** Team cpoe persistence (completion % over expected, season-mean) does **NOT** survive the 4-gate falsifier across 8 season pairs (2016→2017 through 2023→2024). **SURVIVOR requires ALL FOUR PASS — failed shuffle + multiplicity.** The signal does not beat the devigged close.

- Leakage: PASS (no lookahead — `knownAtWeek` scaled season-t week < `outcomeWeek` season-t+1).
- Shuffle: KILLED — original effect −0.013 fails shuffle (87/200 permutations survived > p95).
- Split: PASS — firstHalf = −0.010, secondHalf = −0.015, same sign.
- Multiplicity: KILLED — e-process decayed logM = −280.842 (M ≈ 0.000), not growing; no survivor evidence.
- **OVERALL: KILLED** (not STARVED — n = 4172 > minN=100).

## Harness / Rows
- Script: `scripts/ops/build-cpoe-falsify-harness.py`
- Backtest: `handoff/research/overnight-2026-08-26/cpoe-backtest-rows.jsonl` (4174 rows; 4172 with `marketProb != 0.5`)
- Falsifier import pattern mirrors `packages/prediction-engine/src/edge-lab/__tests__/falsifier-sweep.run.ts` (`falsifyBind` from `./falsify`).
- ModelProb: logistic/tanh squash of z-scored prior-season team cpoe mean vs season-t mean/std.
- MarketProb: devigged home-cover ~0.52/0.48 derived from spread-line sign when odds available; 0.5 otherwise (2016-2024 odds era has full coverage).
- Outcome: 1 if team covered closing spread (`homeTeam` covers when `result > spreadLineHome`; `awayTeam` when `result < spreadLineHome`).

## Per-Season-Pair Summary (8 pairs, 2016→2024)
| Pair | n | Hits | Cover rate | Avg modelProb | Avg marketProb |
|---|---|---|---|---|---|
| 2016→2017 | 496 | 243 | 0.490 | 0.519 | 0.500 |
| 2017→2018 | 496 | 241 | 0.486 | 0.492 | 0.500 |
| 2018→2019 | 496 | 238 | 0.480 | 0.504 | 0.500 |
| 2019→2020 | 512 | 256 | 0.500 | 0.481 | 0.500 |
| 2020→2021 | 544 | 268 | 0.493 | 0.488 | 0.500 |
| 2021→2022 | 542 | 261 | 0.482 | 0.523 | 0.500 |
| 2022→2023 | 544 | 258 | 0.474 | 0.493 | 0.500 |
| 2023→2024 | 544 | 268 | 0.493 | 0.515 | 0.500 |

Cover rates cluster at ~0.48–0.50 (near fair close), consistent with devigged market fairness already shown in settlement audit (`devigged close IS fair`). No consistent positive residual.

## Falsifier Gates (exact numbers)
- `n = 4172` (odds-era)
- `leakage`: PASS — no `knownAtWeek >= outcomeWeek`
- `shuffle`: KILLED — effect = −0.013, 87/200 permutations > |orig| (< 0.95 threshold)
- `split`: PASS — sign consistent (−0.010 / −0.015)
- `multiplicity`: KILLED — `e-process logM = -280.842`, M = 0.000, `simpleE ≈ 0`, not growing
- **Overall verdict: KILLED** (reason: shuffle failure + multiplicity decay)

## Naive Backtest / ROI (high-cpoe half)
- Median split of `modelProb` at 0.5104.
- High-cpoe half: n = 2079, hits = 999, cover rate = 0.480, **ROI @ -110 = −8.26%** (loses).
- Low-cpoe half: n = 2093, hits = 1033, cover rate = 0.494, ROI @ -110 = −5.78%.
- No positive ROI either way; no exploitable spread residual from season-level cpoe mean.

## Honest Verdict Language
- **Not SURVIVOR.** Not promoted to edge registry. Not shipped.
- **Not STARVED** (n >> 100) — the kill is substantive, not a sample-size artifact.
- Recommendation: **PARKED / KILLED** — team-level season-mean cpoe does not persist strongly enough (2023→2024 Spearman 0.42 on n=32) to produce falsifiable predictive residuals vs closing spread across a decade. The persistence is descriptive; the predictive link (r ≈ +0.35 in 2024) does not replicate at scale through the 4-gate kill funnel.
- Next: consider per-game/play-level cpoe (not season-mean aggregation) or combine with lineup-change covariates before any re-queue.
