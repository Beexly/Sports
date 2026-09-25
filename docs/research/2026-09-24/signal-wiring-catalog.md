# Signal Wiring Catalog — Full Data Inventory

**Date:** 2026-09-25  
**Scope:** Every unique data artifact discovered across 40+ local worktrees,
the recovery bundle (`Sports-pre-push-recovery-20260924`), and the main repo.  
**Unique files:** 781 · **Unique bytes:** 40.5 MB (after hash-dedup)  
**Purpose:** wire every legally usable fact into the evidence-first intelligence
spine — find it all, wire it all, weight it all, calibrate it all.

---

## Summary by signal family

| Family | Files | Bytes | Status |
|---|---:|---:|---|
| PLAY_CHARTING/TRACKING | 56 | 12.8 MB | FTN 2022–2025 ready to wire |
| RESEARCH_CORPUS | 221 | 9.6 MB | arxiv phase2 + improvement ledger |
| CORE_STATS/ROSTER | 86 | 7.5 MB | nflverse games/rosters live |
| SOURCE_GRAPH/RIGHTS | 9 | 3.9 MB | atlas + candidate graph live |
| CALIBRATION/OUTCOMES | 92 | 3.0 MB | **3,323 settled picks — wired** |
| MARKET/ODDS | 28 | 211 KB | consensus + CLV stability |
| FANTASY/DFS | 10 | 159 KB | DK Week 3 salaries + oracle reports |
| MODEL/EVAL | 31 | 71 KB | walk-forward CRPS + feature admission |
| CONTEXT/WEATHER | 2 | 16 KB | weather feature waves |

---

## CALIBRATION/OUTCOMES — the goldmine (WIRED)

### `settled-picks.jsonl` (2.25 MB, 3,323 rows)

Source of truth for recalibration. Schema per row:

| Field | Meaning |
|---|---|
| `pickType` | SPREAD / TOTAL / MONEYLINE |
| `confidence` | stated 0–100 (currently **anti-calibrated**) |
| `edgeScore`, `consensusPct` | market context at generation |
| `result` | WIN / LOSS / PUSH / VOID |
| `modelVersion` | v5.0.0 … v5.2.7 |
| `marketFairProb`, `independentTrueProb` | populated on 1,046 / 1,511 rows |
| `expectedClv`, `rankingP` | populated on 1,511 / 1,839 rows |

**Measured calibration (2,826 graded W/L):**

| Metric | Value | Floor | Status |
|---|---:|---:|---|
| Brier (stated conf) | **0.2675** | ≤0.22 | RED |
| ECE (stated conf) | **0.2339** | ≤0.04 | RED |
| Base rate | 0.5453 | — | — |
| vs base-rate Brier | 0.2500 | — | model is worse than constant |

**Anti-calibration curve (stated bin → actual win%):**

| Stated conf | n | Actual win% | Gap |
|---|---:|---:|---:|
| 50–59 | 1,090 | 44.4% | −10.6 |
| 60–69 | 1,194 | 48.7% | −16.3 |
| 70–79 | 686 | 48.5% | −26.5 |
| 80–89 | 260 | 40.0% | −45.0 |
| 90–99 | 68 | 39.7% | −55.3 |
| 100+ | 25 | 44.0% | −61.0 |

**Higher stated confidence historically wins LESS.** Do not publish stated
confidence. Use `calibratedWinProb()` from
`packages/data-ingestion/src/calibration-weights.ts`.

### Empirically strong slices (boost shadow priority)

| Slice | n | Win% | Weight |
|---|---:|---:|---:|
| MONEYLINE | 1,041 | **66.3%** | 1.22 |
| NCAAF | 491 | **66.4%** | 1.22 |
| STRONG_PLAY grade | 151 | **62.9%** | 1.15 |
| SOLID_PLAY grade | 619 | **58.6%** | 1.08 |
| v5.2.7 | 1,538 | **56.6%** | 1.04 |

### Empirically weak slices (suppress or shrink)

| Slice | n | Win% | Weight | Action |
|---|---:|---:|---:|---|
| ELITE_PLAY grade | 58 | **43.1%** | 0.79 | suppress — grade is inverted |
| SPREAD | 941 | 47.0% | 0.86 | shrink |
| TOTAL | 844 | 48.5% | 0.89 | shrink |
| v5.0.0 | 431 | 49.4% | 0.91 | deprecate |
| basketball_nba (tiny n) | 26 | 0.0% | — | no publish |

---

## PLAY_CHARTING/TRACKING — FTN (ready to wire)

| File | Rows | Notes |
|---|---:|---|
| `ftn_charting_2025.csv` | 47,316 | 29 cols: hash, motion, PA, screen, RPO, blitzers, read thrown, contested, drop, sneak, … |
| `ftn_charting_2022–2025.parquet` | ~4 seasons | same schema, compressed |
| `nfl-advanced-players.csv` | — | player-level advanced metrics |

**FTN play columns (high-value features):**
`starting_hash`, `qb_location`, `n_offense_backfield`, `n_defense_box`,
`is_no_huddle`, `is_motion`, `is_play_action`, `is_screen_pass`, `is_rpo`,
`is_trick_play`, `is_qb_out_of_pocket`, `is_interception_worthy`,
`is_throw_away`, `read_thrown`, `is_catchable_ball`, `is_contested_ball`,
`is_created_reception`, `is_drop`, `is_qb_sneak`, `n_blitzers`,
`n_pass_rushers`, `is_qb_fault_sack`

**Signal family mapping (via `mapSourceToSignalFamily`):**
- motion / PA / RPO / screen → **scheme tendency**
- blitzers / pass rushers / box → **pressure & protection**
- contested / catchable / drop / created reception → **throw quality**
- hash / qb location → **formation context**
- sneak / out of pocket → **QB usage**

These are exactly the "route/pressure/coverage/trenches" gap-closers called out
in `statking-gap-audit.md`. Charting is already rights-cleared as
`ftn-charting-openapi` / local extracts with attribution.

---

## CORE_STATS/ROSTER

| File | Notes |
|---|---|
| `nflverse-games.csv` (2.2 MB) | schedule + results spine |
| `roster2025.csv` (1.0 MB) | identity crosswalk |
| `player_weekly_stats.json` | week-level player stats |
| `player_season_stats.json` | season aggregates |
| `nfl-coverage.csv` | coverage rates |
| `methodology-definitions.json` | metric definitions |
| `rights_ledger.json` (512 KB) | rights status per source |

---

## MARKET/ODDS

| File | Notes |
|---|---|
| `consensus_lines.csv` | market baseline for edge |
| `mlb_totals_clv_stability.csv` (Sports-oppadj) | CLV stability for totals |
| `walkforward_2025_crps.csv` (Sports-oppadj) | CRPS walk-forward scores |
| `our_projections.csv` | model outputs to compare vs market |
| `wave4b-markets2.jsonl` | market signal waves |

---

## FANTASY/DFS

| File | Notes |
|---|---|
| `dk-sunmon-slate-salaries-week3.csv` (Sports-gse-signal-wiring) | real DK salaries |
| `oracle-report.json` / `oracle-report-synthetic.json` | optimizer outputs |
| `fantasypts-bellcow-report-week1.csv` | usage reports |
| `fantasypts-similarity-finder-washington.csv` | comps |

---

## MODEL/EVAL

| File | Notes |
|---|---|
| `walkforward_2025_crps.csv` | CRPS by walk-forward fold |
| `feature-admission-nfl.json` | admitted feature list |
| `reference-model-fingerprint-ordering.json` | model fingerprints |
| `split_frozen_w_test.csv` (Sports-oppadj) | frozen train/test split |
| orbit-wave5/6/7 JSON | session calibration runs |

---

## RESEARCH_CORPUS (221 files)

| File | Notes |
|---|---|
| `phase2-candidates-bayes-raw-backup.jsonl` (3.8 MB) | Bayesian method candidates |
| `corpus-index.jsonl` (1.5 MB) | indexed papers |
| `IMPROVEMENT-LEDGER.jsonl` (1.4 MB) | improvement tracking |
| `dropback_epa_2025_all.csv` | EPA research extract |

---

## SOURCE_GRAPH/RIGHTS

| File | Notes |
|---|---|
| `NORMALIZED_RESOURCE_LEDGER.csv` (2.0 MB) | full resource ledger |
| `source_registry.json` (931 KB) | 500+ source records |
| `source_candidate_graph.json` (627 KB) | candidate graph |
| `rights_ledger.json` | per-source rights |

Already reflected in `packages/data-ingestion/src/source-registry.ts` +
`source-atlas-harvester.ts`.

---

## CONTEXT/WEATHER

| File | Notes |
|---|---|
| `wave4b-weather2.jsonl` | weather signal waves |
| `wave4-weather.jsonl` | earlier wave |

---

## What is wired in this pass

1. **`packages/data-ingestion/src/calibration-weights.ts`** —
   - `calibratedWinProb(statedConf)` → empirical P(WIN)
   - `WEIGHT_BY_PICK_TYPE` / `WEIGHT_BY_SPORT` / `WEIGHT_BY_GRADE` / `WEIGHT_BY_MODEL_VERSION`
   - `combinedSignalWeight(sport, type, grade)`
   - `shouldSuppress(sport, type, grade)`
   - `PUBLISH_ACTIONS` (suppress/boost list)
2. **`docs/research/2026-09-24/calibration-weights.json`** — machine-readable dump
3. **`calibration-weights.test.ts`** — 8 assertions encoding the anti-calibration,
   inverted-grade, and MONEYLINE/NCAAF edges
4. **This catalog** — every unique file classified and mapped to a signal family

---

## What still needs a runtime consumer

| Data | Gap | Sprint |
|---|---|---|
| FTN charting 2022–2025 | No production caller for motion/PA/blitz features | S6 |
| walkforward CRPS | Not feeding promotion gates | S4 |
| consensus_lines vs our_projections | CLV not auto-graded into settled picks | S4 |
| DK salaries Week 3 | Not joined to model-owned projections | S1 |
| player_weekly_stats | Identity crosswalk incomplete | S0 |
| phase2 Bayes candidates | Research only — do not activate without walk-forward | S3 |
| weather waves | Not in GameSignal writers | S6 |

---

## Regeneration

```bash
# 1. inventory
python scan_data.py
python classify_data.py
# 2. calibration
python analyze_settled.py
python build_calibration.py
# 3. verify
cd packages/data-ingestion && npx vitest run src/calibration-weights.test.ts
```

Sources live across `C:\Users\Garrett\Sports*` worktrees and
`C:\Users\Garrett\Sports-pre-push-recovery-20260924`. Originals are preserved;
this repo carries the typed weights + catalog only.
