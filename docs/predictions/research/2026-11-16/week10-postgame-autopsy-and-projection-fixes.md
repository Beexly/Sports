# NFL 2026 Week 10 Post-Game Forensic Autopsy & Wave 8 Projection Engine Remediation

**Date:** `2026-11-16` (`UTC`)
**Scope:** Live ESPN Week 10 Settlement (`13` completed `STATUS_FINAL` games + `LAC @ BAL` MNF `PENDING`), Boxscore Player vs Projection MAE Autopsy (`12` connected dossiers), DFS Variance Fix, and `THE STACK` Layer-1 Market Re-Calibration.
**Ledger Updates:** `data/engine/lessons_learned_permanent_ledger.jsonl` (`LL-2026-11-16-013`..`LL-2026-11-16-020`), `data/corpus/grading_feedback_records.jsonl` (`28` deduplicated rows, `13` Week 10 games).

---

## 1. Executive Summary: Pre-Fix vs Wave 8A vs Wave 8B vs Wave 9 Accuracy Scorecard (Week 10)

Running `scripts/ops/run_post_window_settlement_and_autopsy.py --season 2026 --week 10 --window all` against live ESPN Week 10 finals and individual player boxscores (`/summary?event=<id>`) across the 12 completed Sunday dossiers established exact empirical errors across Pre-Fix, Wave 8A (team normalization + non-QB rushing + backup QB tier), Wave 8B (`THE STACK` Layer-1 prop weighting + cross-team PBP fallback + suffix dedup + `max_wr_share=0.46` + non-starter QB zeroing), and **Wave 9 (`100%` 5-Pillar Books/PDFs/IG/X/Situational + Hybrid RRF ArXiv/Book Retrieval + Snap-by-Snap PBP Simulator LUT Physics + VMLS KKT Simplex Share Reconciler + Healthy `QB1_STARTER` Fix)**:

| Metric | Pre-Fix Baseline | Wave 8A | Wave 8B | Wave 9 Final | Total Delta (vs Pre-Fix) |
|---|---:|---:|---:|---:|---:|
| **Team Passing Yards MAE (yds/team)** | `79.5` | `70.3` | `67.0` | **`65.0`** | **`-14.5` (`-18.2%`)** |
| **Team Rushing Yards MAE (yds/team)** | `31.4` | `30.4` | `31.1` | **`29.9`** | **`-1.5` (`-4.8%`)** |
| **Player Yards MAE (yds/player, n=187)** | `32.1` | `29.6` | `27.5` | **`27.27`** | **`-4.83` (`-15.0%`)** |
| **Game Total Points MAE (pts)** | `9.10` | `8.84` | `8.84` | **`8.89`** *(vs DK Close `9.00`)* | **`-0.21`** |
| **Team Points MAE (pts/team)** | `7.58` | `7.53` | `7.53` | `7.61` | `+0.03` |

Largest Wave 8B per-matchup improvements (Pre-Fix -> Wave 8A -> Wave 8B):
- `MIN @ GB`: Pass Yds MAE **`51.6` -> `31.3` -> `21.2`** (`-30.4` yds), Player MAE **`20.3` -> `19.1` -> `16.9`**
- `NE @ DET`: Pass Yds MAE **`85.6` -> `40.2` -> `37.9`** (`-47.7` yds), Player MAE **`31.5` -> `28.0` -> `23.0`**
- `SEA @ LV`: Pass Yds MAE **`89.0` -> `56.9` -> `50.3`** (`-38.7` yds), Player MAE **`39.7` -> `31.1` -> `25.6`**
- `LAR @ ARI`: Pass Yds MAE **`84.0` -> `20.7` -> `32.9`** (`-51.1` yds), Player MAE **`32.9` -> `24.8` -> `21.9`**
- `KC @ ATL`: Player MAE **`41.8` -> `37.6` -> `32.4`** (`-9.4` yds)
- `CAR @ NO`: Pass Yds MAE **`68.1` -> `42.4` -> `42.6`** (`-25.5` yds), Player MAE **`27.8` -> `23.9` -> `23.4`**

---

## 2. Game-by-Game Week 10 Live Results & Before/After MAE (Pre-Fix -> Wave 8A -> Wave 8B)

| Matchup | Final Score | Spread Result | Total Result | Pass MAE Pre -> 8A -> 8B | Player MAE Pre -> 8A -> 8B | Key Autopsy Finding |
|---|---|---|---|---:|---:|---|
| `NE @ DET` | `DET 35, NE 10` | `HOME_COVER` (`DET -2.5`) | `UNDER 50.5` | `85.6 -> 40.2 -> 37.9` | `31.5 -> 28.0 -> 23.0` | `Tommy DeVito` (`81` pass yds) replaced `Maye`; zeroed unused backup QB vector; `Goff` (`303`) broke `285.0` cap. |
| `KC @ ATL` | `KC 35, ATL 13` | `AWAY_COVER` (`KC -3`) | `OVER 47.5` | `108.0 -> 100.7 -> 97.1` | `41.8 -> 37.6 -> 32.4` | Cross-team PBP hydrated `Josh Downs`; market-anchored `Drake London`. |
| `HOU @ CLE` | `CLE 27, HOU 24` | `HOME_COVER` (`CLE +4.5`) | `OVER 40.5` | `81.1 -> 76.5 -> 76.5` | `32.8 -> 31.2 -> 31.4` | Rush MAE **`7.6`**; `Watson` (`312` pass, `49`+TD rush) dominated pre-fix unanchored `HOU -4.5` (`+13.04%`). |
| `MIN @ GB` | `MIN 30, GB 10` | `AWAY_COVER` (`MIN +2.5`) | `UNDER 42.5` | `51.6 -> 31.3 -> 21.2` | `20.3 -> 19.1 -> 16.9` | `Kirk Cousins` (`LV -> MIN`) cross-team PBP + suffix dedup (`Aaron Jones` / `Aaron Jones Sr.`); `GB` 8 sacks. |
| `JAX @ TEN` | `JAX 40, TEN 23` | `AWAY_COVER` (`JAX -10.5`) | `OVER 46.5` | `81.9 -> 84.8 -> 80.0` | `29.6 -> 30.1 -> 30.1` | `JAX` rushing `119.01` vs `123` actual; `Parker Washington` `152` yds surged Over. |
| `MIA @ IND` | `IND 24, MIA 22` | `AWAY_COVER` (`MIA +4.5`) | `OVER 37.5` | `64.8 -> 97.9 -> 90.8` | `26.1 -> 29.8 -> 27.7` | `Kyle McCord` (`209` yds) outperformed `QB2_BACKUP` shrinkage vs soft pass defense. |
| `CAR @ NO` | `CAR 20, NO 17` | `AWAY_COVER` (`CAR +1.5`) | `UNDER 48.5` | `68.1 -> 42.4 -> 42.6` | `27.8 -> 23.9 -> 23.4` | Prop-line anchoring lifted `Jordyn Tyson` (`80` actual) from `1.77` yds; unpinned `Bryce Young` from `285.0`. |
| `BUF @ NYJ` | `BUF 31, NYJ 12` | `AWAY_COVER` (`BUF -8.5`) | `UNDER 50.5` | `30.0 -> 68.8 -> 67.1` | `32.9 -> 28.8 -> 29.6` | Eliminated `NYJ` `285.0` clamp while cutting NYJ player error `32.9 -> 29.6`. |
| `SEA @ LV` | `SEA 21, LV 13` | `AWAY_COVER` (`SEA -6.5`) | `UNDER 40.5` | `89.0 -> 56.9 -> 50.3` | `39.7 -> 31.1 -> 25.6` | Market prop lines (`65.5`/`91.5`) lifted `Zach Charbonnet` & `Jaxon Smith-Njigba`; `Mendoza` dropped `285 -> 171.8`. |
| `LAR @ ARI` | `LAR 34, ARI 6` | `AWAY_COVER` (`LAR -9.5`) | `OVER 38.5` | `84.0 -> 20.7 -> 32.9` | `32.9 -> 24.8 -> 21.9` | Fixed inverted QB volume (`LAR 161->228.2` vs `249` actual; `ARI 188->153.0` vs `108` actual). |
| `SF @ DAL` | `SF 46, DAL 40` | `AWAY_COVER` (`SF -4.5`) | `OVER 55.5` | `119.5 -> 114.2 -> 104.8` | `36.0 -> 34.2 -> 30.8` | Cross-team PBP restored `Keenan Allen`; historic `86`-point shootout (`389` & `343` pass yds). |
| `PIT @ CIN` | `CIN 38, PIT 18` | `HOME_COVER` (`CIN -3.5`) | `OVER 49.5` | `90.5 -> 109.5 -> 102.5` | `34.2 -> 36.4 -> 36.7` | `CIN` Rush MAE **`7.2`**; `Burrow` (`280.83` vs `409` ceiling) & `Chase` (`231`) tail breakout. |
| `WSH @ NYG` | `WSH 24, NYG 21` | `AWAY_COVER` (`WSH +2.5`) | `OVER 41.5` | `N/A` (no dossier) | `N/A` | Live ESPN graded cleanly in `all` window; added missing dossier tracking note. |
| `LAC @ BAL` | Tonight MNF (`0-0`) | `PENDING` | `PENDING` | Tonight (`171.7` / `211.1`) | Tonight MNF | `BAL` `283.58 -> 211.13` pass yds (`Jacoby Brissett`); zeroed phantom WR rushes. |

---

## 3. Tonight's Corrected MNF Dossier (`LAC @ BAL`, `data/engine/connected_workflow_dossier_lac_bal_week10.json`)

- **Market Lines:** `BAL -4.5` (`-108`) / `LAC +4.5` (`-112`), `Total 38.5` (`-110/-110`), `BAL ML -225` / `LAC +185`.
- **Corrected Post-Sim Team Projections:**
  - `LAC` (`Justin Herbert`): `17.25` pts, **`171.73`** pass yds, `85.97` rush yds (all 0-carry WRs `Ladd McConkey`, `Tre Harris`, `KeAndre Lambert-Smith` cleanly at **`0.0` rush yds / `0.0` carries**).
  - `BAL` (`Jacoby Brissett`): `23.75` pts, **`211.13`** pass yds (down from `283.58` inflated pre-fix artifact), `116.43` rush yds (`Derrick Henry` RB1 lead carry conservation).
- **Stage-5 Governance Decision:** Strict **`PASS` (`0.00u` / `$0` real-money stake freeze active)** until out-of-sample Walk-Forward calibration (`ECE <= 0.035`) clears `CALIBRATION_ADJUSTMENTS_ENABLED`.

---

## 4. Permanent Code & Data Fixes Applied (`Wave 8A + Wave 8B`)

1. **`scripts/ops/enforce_stage0_roster_and_board_allowlist.py` (Wave 8B):** Deduplicated generational suffix splits (`Aaron Jones` / `Aaron Jones Sr.`) via `_strip_name_suffix` and added full league-wide 2026 PBP fallback whenever a traded/acquired athlete has zero prior snaps on his current team (`Zach Charbonnet`, `Keenan Allen`, `Josh Downs`, `Jordyn Tyson`, `Kirk Cousins`, `Jacoby Brissett`).
2. **`scripts/ops/gse_connected_game_workflow.py` (Wave 8A + 8B):** Added `_infer_week_qb_tier`, PBP team gross pass/rush rates, removed `sum(rec_yds_per_pg)` + `285.0` clamp, implemented affine Layer-1 market + live starter QB/RB prop line anchoring (`core_lines`), switched `rec_weights` to yardage expectations with alpha WR1 cap raised (`0.34 -> 0.46`) and unboarded depth shrinkage, excluded QB from non-QB rush pools (`team_rush - qb_rush`), pruned `< 0.35` car/pg WRs/TEs, zeroed out non-starter backup QBs (`is_non_starter_qb`), and scaled Jensen Gamma noise.
3. **`scripts/ops/week8_forensic_kernels.py` & `src/gse_engine/compute/volume_conservation.py`:** Recognized `OTHER_TEAM_REC`/`OTHER_TEAM_RUSH` absorbers, scaled low-share `req_std`, prevented tiny residual sinks from distorting RB1 means, enforced world conservation `>= 0`, and added typed `volume_conservation.py` helpers.
4. **`scripts/ops/gse_coach_mind_simulator.py`:** Tightened Layer-1 James-Stein market shrinkage (`lambda_margin=0.88`, `margin_bound=2.00`, `total_bound=2.40`) outside `EMERGENCY_QB3_UDFA`.
5. **`scripts/ops/run_post_window_settlement_and_autopsy.py`:** Live ESPN `/scoreboard` + `/summary` boxscore fetch preserving closing DK odds, strict `PENDING` status for incomplete games, skip zero-projected unplayed backup QBs, and `grading_feedback_records.jsonl` deduplication (`128 -> 28` clean rows).
6. **`scripts/dfs/build_weekly_dfs_packets.py` & `scripts/dfs/build_week10_all_slates_dfs_packets.py`:** Sub-Gaussian RSS tail aggregation for DFS `P25`/`P90`, removed duplicate `opp_f7_outs` rush inflation, and synced `_player_kickoff_rank` to Week 10 windows.
7. **`src/gse_engine/compute/corpus_situational_integrator.py` (Wave 9):** Unified all 5 Books/PDFs/IG/X/Situational pillars (`manifest_877_pdfs.json`, `live_books_and_pdfs_executable_engine`, `wave8_hidden_game_eager_and_sports_quant_engine`, `openai_math_721_manuscript_and_lean_engine`, `hybrid_rrf_corpus_and_arxiv_retriever`, `x_sweep_production_signals` 5 PBP mechanisms, `STATRANKINGS_FUNNEL_REPORT`, `PATTON_STATRANKINGS_DEF_STUFF_RATE_TOP10`, `full_repo_279_family_situational_reasoning_matrix`, `coach_speak_emotional_deflection_probe`, `drive_dire_situations`, `script_elasticity`) behind fail-closed gate `assert_all_books_pdfs_ig_x_situational_wired` plus `apply_vmls_kkt_and_corpus_shares` simplex projection.
8. **`scripts/ops/gse_coach_mind_simulator.py` & `scripts/ops/gse_connected_game_workflow.py` (Wave 9):** Fixed healthy starter `QB1_STARTER` vs injured `QB1` tier collision, normalized ISO-8601 UTC timestamps on replay kickoff bounds, wired Stage-2 LUTs (`ypa_adj_lut`, `rush_ypc_adj_lut`, `rz_td_delta_lut`, `q4_fat_lut`, `off_epa_adj`/`def_epa_adj`, `sack_prob_adj`, `pace_sec_adj`) into the 175-snap simulator, and reconciled Stage 3/4 boxscore shares via VMLS KKT (`Pass MAE 67.0 -> 65.0`, `Rush MAE 31.1 -> 29.9`, `Player MAE 27.5 -> 27.27`).
