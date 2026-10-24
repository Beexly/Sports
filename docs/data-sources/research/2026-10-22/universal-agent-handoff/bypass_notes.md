# bypass_notes.md — what is derivable, and what the paywall was actually worth

Consolidated position after the NGS/coverage push. The headline: **NGS's expected-value family is not paywalled
at all** — a free self-minted JWT plus mutable object references returns it.

## Recovered outright (was assumed proprietary)
| metric | endpoint | proof |
|---|---|---|
| completionProbability (xComp) | `/api/leaders/expectation/completion/{week,season}` | 140 rows; depth-flat (rho −.086) |
| expectedYardsAfterCatch + YACoE | `.../yac/...` | identity exact, 5/5 rows diff 0.0 |
| expectedRushYards + RYOE | `.../ery/...` | identity exact, 160/160 rows diff 0.0 |
| avgSeparation, avgCushion, avgAirYards | `/api/gamecenter/overview?gameId=` | 236 rows / 24 games |
| leagueAverageReceiverSeparation = 2.9866993023508566 | same | identical 16 digits across 2024 & 2025 |

All three expectation products decompose as `metric = actual − expected`, verified to zero. So the published
number is a residual and the only secret was the expectation term, which is served alongside it.

## Derivable from public data with the reconstructed engines
| metric | join required | status |
|---|---|---|
| separation over league average | gamecenter `receptionInfo.avgSeparation` − frozen 2.9867 | works; r=.51 with catch, .42 partial on depth |
| TE/WR separation differential | `players.nfl_position` | replicates across 2024/2025 (+0.98/+1.00) |
| coverage-type EPA table | BDB `team_coverage_type` + `expected_points_added` | 64k plays, man −.049 vs zone −.030, p=1.6e-20 |
| route YOE by coverage cell | BDB route × coverage | 82–100% of route YOE is the matchup |
| scalar separation-over-expected | BDB separation × coverage × route | zone vacates, Cover 1 suppresses (−1.59 slant) |

## NOT derivable — do not retry these
- **Full-22 geometry from BDB 2027.** Tracking is subject-only (median 1–3 players/play). Nearest-tracked-defender
  separation runs 12.8–15.5 yd against a true ~3.0 and even inverts sign. Confirmed three ways.
- **Context-adjusted EPA as a reordering metric.** r=1.000 with raw EPA on four successive bases; 0.998 even with
  leave-one-out defensive quality. Only unbalanced windows move it (weeks 1–2: 1.21 ranks).
- **Motion as a coverage predictor.** Coverage null (p=.091 binary, .128 8-class, .687 on 3rd/4th). Motion is a
  pass indicator at 99.9% (p=2.8e-205) — use it as a filter.
- **Cushion as a covariate.** Incremental R² 0.001, corr with separation 0.113, with depth −0.031.

## Ceilings measured, so they are not re-litigated
- pre-snap categorical coverage: ~0.70–0.72 AUC, alignment signature worth +0.0106
- separation→catch: 0.283 R² with separation + depth + position (the data's limit)
- NGS `completionProbability` is depth-flat and play-class-conditional, not an unconditional xComp

## Division of labour
NGS gamecenter = geometry (separation, cushion, depth). BDB subject tracking produced no usable defence but
**kinematics do work** — receiver speed at the pass: 5.17 yd/s on completions, 6.31 on incompletions, 7.03 on
interceptions. NGS `ery` decodes the RYOE surface; bare `ryoe` 403s.

## Honest summary of the paywall
NGS gives its expectations away and gives the *residual* semantics for free, but the served expectations are
tracking-conditioned to the point of being context-flat, so they are not substitutes for context baselines. The
real remaining scarcity is **full-22 frames**, not authentication.
