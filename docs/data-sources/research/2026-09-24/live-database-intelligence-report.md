# Live Database Intelligence Report

**Date:** 2026-09-25  
**Source:** Neon Postgres (`ep-summer-moon-apv5ccys`) — read-only pull  
**Doctrine:** We do not beat the close with metrics. We win on all-knowing,
contextually aware reasoning. This report maps the live data → the reasoning spine.

---

## Live data scale

| Table | Exact rows | Size | Role in the engine |
|---|---:|---:|---|
| `odds` | **8,083,183** | 2.0 GB | Market belief, de-vig baseline |
| `odds_line_snapshots` | **2,213,952** | 535 MB | Line movement, CLV timing |
| `player_game_stats` | 35,168 | 32 MB | Player-level production |
| `jarvis_memory_events` | 34,872 | 69 MB | **Intelligence memory** (reasoning history) |
| `source_snapshots` | 32,393 | 38 MB | Immutable as-of observations |
| `snap_counts` | 29,513 | 25 MB | Usage / role |
| `injuries` | 6,501 | 9 MB | Availability |
| `game_signals` | 5,002 | 6.5 MB | Signal events (currently only SCHEDULE) |
| `opening_lines` | 4,923 | 1.4 MB | Opening vs close (CLV spine) |
| `gate_decisions` | 4,647 | 2 MB | Publish/withhold decisions |
| `picks` | 4,030 | 12 MB | Full CLV + grade + tier + reasoning |
| `pick_signal_snapshots` | 3,999 | 1.9 MB | **Which signals were present per pick** |
| `games` | 3,601 | 2 MB | Rest, B2B, schedule density, line movement |
| `next_gen_stats` | 2,718 | 2.9 MB | NGS receiving/rushing/passing |
| `pick_settlement_events` | 2,578 | 2.9 MB | Settlement outcomes |
| `depth_chart_entries` | 2,242 | 3.5 MB | Role / depth |
| `pick_proof_receipts` | 2,148 | 1.9 MB | marketFairProb + modelProb (modelProb currently empty) |
| `team_game_logs` | 1,400 | 824 KB | Team results + ATS |
| `team_game_efficiency` | 634 | 1 MB | EPA / success |

---

## Calibration (live, 3,263 graded W/L)

| Metric | Value |
|---|---:|
| Win rate | **54.61%** (1,782 W / 1,481 L) |
| Avg stated confidence | 64.71 |
| Avg edge score | 35.30 |
| CLV rows | 2,189 |
| Avg CLV | **−0.193** (close beats us on average) |
| Positive CLV | **0** |

### By pick type (the real edge map)

| Type | n | Win% | Weight | Action |
|---|---:|---:|---:|---|
| **MONEYLINE** | 1,162 | **66.6%** | 1.22 | BOOST |
| SPREAD | 1,076 | 47.2% | 0.86 | SHRINK |
| TOTAL | 1,025 | 48.8% | 0.89 | SHRINK |

### By sport

| Sport | n | Win% | Weight | Action |
|---|---:|---:|---:|---|
| **NCAAF** | 663 | **65.0%** | 1.19 | BOOST |
| MLB | 2,124 | 52.5% | 0.96 | — |
| MLS | 306 | 52.0% | 0.95 | — |
| NFL | 155 | 47.7% | 0.87 | SHRINK |

### By model version

| Model | n | Win% |
|---|---:|---:|
| **v5.2.7** | 1,945 | **56.8%** |
| v5.1.0 | 586 | 51.7% |
| v5.2.6 | 297 | 54.2% |
| v5.0.0 | 431 | 49.4% |

### Confidence recalibration (stated bin → actual win%)

| Bin | n | Actual | Stated mid | Gap |
|---|---:|---:|---:|---:|
| 50 | 1,063 | 51.9% | 55 | −3.1 |
| 60 | 1,257 | 56.3% | 65 | −8.7 |
| 70 | 640 | 56.6% | 75 | −18.4 |
| 80 | 238 | 51.3% | 85 | −33.7 |
| 90 | 51 | 52.9% | 95 | −42.1 |
| 100 | 14 | 78.6% | 105 | (tiny n) |

Still overconfident, especially in the 70–90 band. **Never publish stated
confidence** — always run `calibratedWinProb()`.

---

## SIGNAL COVERAGE GAP — the all-knowing hole

From `pick_signal_snapshots` (3,999 rows) — which signals actually attached to picks:

| Signal | Attached picks | Coverage | Live data exists? |
|---|---:|---:|---|
| `hadOddsSignal` | 3,999 | 100% | yes (8M odds) |
| `hadLineMovementSignal` | 3,122 | 78% | yes (2.2M snapshots) |
| `hadScheduleSignal` | 3,122 | 78% | yes (games) |
| `hadRestSignal` | 2,125 | 53% | yes (games) |
| `hadAtsFormSignal` | 1,283 | 32% | yes (team_game_logs) |
| `hadH2HSignal` | 11 | 0.3% | thin |
| **`hadInjurySignal`** | **0** | **0%** | **YES — 6,501 injuries rows** |
| **`hadWeatherSignal`** | **0** | **0%** | weather adapters exist |
| **`hadNgsSignal`** | **0** | **0%** | **YES — 2,718 NGS rows** |
| **`hadRatingsSignal`** | **0** | **0%** | ratings modules exist |
| **`hadPlayerSignal`** | **0** | **0%** | **YES — 35,168 player_game_stats** |
| **`hadPaceSignal`** | **0** | **0%** | pace features exist |
| **`hadOfficialsSignal`** | **0** | **0%** | — |

**This is the wiring gap.** Injuries, NGS, weather, ratings, player stats, pace,
and officials all live in the system — and **zero picks used them**. That is
exactly what "wire it all" means.

### Signal impact (win% when present vs absent)

| Signal | Win% present | n | Win% absent | n | Read |
|---|---:|---:|---:|---:|---|
| line movement | 51.8% | 2,393 | 62.3% | 870 | movement-attached picks do WORSE |
| rest | 51.6% | 1,927 | 58.9% | 1,336 | rest-attached picks do WORSE |
| ATS form | 50.0% | 1,238 | 57.4% | 2,025 | form-attached picks do WORSE |
| injury | — | 0 | 54.6% | 3,263 | never used |
| weather | — | 0 | 54.6% | 3,263 | never used |
| NGS | — | 0 | 54.6% | 3,263 | never used |

**Interpretation:** the few contextual signals we do attach are correlated with
harder games (or older/worse model paths) — they are not yet a positive edge.
The unused signals (injury, NGS, weather) are the opportunity.

---

## Game context (3,601 games)

| Field | Value |
|---|---|
| Avg rest home / away | 19.7d / 19.9d |
| Avg line move (spread) | −0.057 |
| Avg data quality | 63.1 |
| B2B home / away | 360 / 369 |

## Game signals families (current)

Only **SCHEDULE** category is populated (`schedule_density_7d_home/away`,
2,501 rows each). No injury/weather/ratings/pace signal families are writing
into `game_signals`.

## Proof receipts

| Field | Value |
|---|---:|
| Rows | 2,148 |
| `marketFairProb` populated | 2,148 (100%) |
| `modelProb` populated | **0 (0%)** |
| Avg market fair P | 0.5186 |

`modelProb` is the missing piece for true Brier vs market. Wire it.

## Next Gen Stats (available, unwired)

| Stat type | Rows | Players | Seasons |
|---|---:|---:|---|
| receiving | 1,425 | 220 | 2025–2026 |
| rushing | 664 | 87 | 2025–2026 |
| passing | 629 | 68 | 2025–2026 |

---

## What this pass wired

1. **`packages/data-ingestion/src/calibration-weights.ts`** — rebuilt from
   **live** Neon picks (not the JSONL extract). 9 tests pass.
2. **`calibration-weights-live.json`** — machine-readable live weights +
   publish actions + signal-coverage gaps.
3. **`apps/web/lib/intelligence-core/`** — the all-knowing reasoning spine:
   `reason(ctx)` answers the six questions, weights situational context
   (rest/travel/weather/injuries/schedule), computes calibrated P vs market,
   emits why/why-not, and enforces publish/withhold gates. 8 tests pass.
4. **`packages/data-ingestion/src/source-registry.ts`** — 15 new sources from
   the Firecrawl pack (11 tests pass).
5. **Scripts** (read-only, `DATABASE_URL` env — never committed):
   - `scripts/db-inventory.cjs` — table/column inventory
   - `scripts/db-calibration-pull.cjs` — deep calibration + signal coverage
   - `scripts/rebuild-calibration-from-live.cjs` — regenerate weights

---

## Immediate wiring queue (do not defer)

| Priority | Gap | Data exists | Action |
|---|---|---|---|
| P0 | `hadInjurySignal` = 0 | injuries 6,501 | Attach injury/availability to picks before generation |
| P0 | `modelProb` = 0 | model exists | Populate proof receipts `modelProb` for true Brier |
| P0 | `hadNgsSignal` = 0 | NGS 2,718 | Join NGS features into pick generation |
| P1 | `hadWeatherSignal` = 0 | weather adapters | Write weather into `game_signals` |
| P1 | `hadPlayerSignal` = 0 | player_game_stats 35k | Attach player-level features |
| P1 | `hadRatingsSignal` = 0 | ratings modules | Attach team ratings |
| P2 | FTN charting | 47k plays | Motion/PA/blitz features into reasoning |
| P2 | CLV avg −0.19 | 2,189 rows | Timing/beat-the-close is not the goal; use CLV as a *diagnostic* not a target |

---

## Doctrine reminder

> We are not going to beat the close. We are building the all-knowing engine:
> contextual, situational, reasoning. That engine drives the website,
> predictions, plays, bets, props — everything. Wire every single item. Do not
> defer.

The intelligence core (`reason()`) is the spine. Every new signal family
plugs into `SignalObservation` and the six questions. Calibration weights
keep us honest. Publish gates keep us safe.

---

## Regeneration

```bash
DATABASE_URL=... node scripts/db-inventory.cjs
DATABASE_URL=... node scripts/db-calibration-pull.cjs
DATABASE_URL=... node scripts/rebuild-calibration-from-live.cjs
cd packages/data-ingestion && npx vitest run src/calibration-weights.test.ts
cd apps/web && npx vitest run lib/intelligence-core/reasoning.test.ts
```

**Never commit `DATABASE_URL`.** It lives in the environment / Secure Vault only.
