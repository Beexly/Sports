# LineStar DK Daily Format & Impeccable DFS Operations Spec (Week 10 Benchmark)

- **Date:** 2026-11-15
- **Bucket:** `docs/dfs/research/2026-11-15/`
- **Benchmark Target:** `https://www.linestarapp.com/` (LineStar App) + DraftKings NFL Daily Fantasy (Classic & Showdown)
- **Status:** WIRE-FIRST MIND INGESTION -- PUBLIC & REAL-MONEY SUBMISSION GATED UNTIL STAGE 0-5 + DFS PACKETS CALIBRATED AND VERIFIED (`HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER`)

---

## 1. Benchmark Summary: What LineStar Gets Right for DraftKings DFS

LineStar (`linestarapp.com`) is structured around rapid, contest-aware DraftKings and FanDuel DFS decision workflows built on 100+ per-athlete inputs (market odds, injuries, weather alerts, starting lineups, matchup analytics) with four core operational pillars:

1. **Contest-Mode Specialization (`Optimizer` & 150-Max Portfolio Construction):**
   - Separate handling for Cash (floor / median consistency, single-entry 1-up) vs. Tournament / GPP (ceiling, leverage, stacked game correlations, multi-entry portfolio).
   - Fast batch generation (up to 150+ unique DraftKings lineups with configurable exposure caps and diversity rules).
2. **`pOwn%` (Projected Ownership %) Differentiation:**
   - First-class `pOwn%` column per athlete to spot chalk vs. low-owned high-ceiling pivots.
   - Prevents accidentally building duplicated GPP rosters filled with 35%+ chalk without correlated leverage.
3. **Live News & Late-Swap Readiness:**
   - Continuous pre-lock injury, starting-lineup, and weather invalidation so late afternoon/primetime slots can swap before each kickoff rather than locking stale Thursday/Saturday projections.
4. **Post-Slate "Perfect Lineup" Retrospective Grading:**
   - Dedicated post-slate audit comparing generated lineups against the hindsight DraftKings optimal ("Perfect Lineup") across salary utilization, position spend, and stack structure.

---

## 2. Direct Mapping to GSE / DraftKings DFS Architecture

GSE's DraftKings NFL DFS pipeline (`scripts/dfs/build_week10_all_slates_dfs_packets.py` and `scripts/ops/dfs_stochastic_milp_optimizer.py`) maps LineStar's operational ergonomics onto our Stage 0-5 conserved simulation engine without compromising fail-closed guardrails:

| LineStar Capability | GSE Operational Requirement | Target Module / Artifact |
|---|---|---|
| 1-Up Cash vs. Multi-Entry GPP | Emit separate Cash 1-up and 20-Max MME GPP portfolios with distinct objective weights (median/floor vs. correlated p90 ceiling + leverage) | `scripts/dfs/build_week10_all_slates_dfs_packets.py`, `dfs_stochastic_milp_optimizer.py` |
| Direct DraftKings CSV Upload | Keep internal audit CSV (`week10_<slate>_dk_upload.csv`) AND emit pure DraftKings upload CSVs (`week10_<slate>_dk_cash_1up.csv` with 1 lineup, `week10_<slate>_dk_20max_gpp.csv` with 20 lineups) using exact DraftKings cell strings (`Name (ID)`) and pure 6-slot (`CPT,FLEX,FLEX,FLEX,FLEX,FLEX`) or 9-slot (`QB,RB,RB,WR,WR,WR,TE,FLEX,DST`) headers with ZERO extra metadata columns | `scripts/dfs/build_week10_all_slates_dfs_packets.py` |
| `pOwn%` & Portfolio Leverage | Penalize excessive cumulative ownership in GPP mode while respecting max single-player exposure caps (`<= 55%` GPP flex exposure, zero duplicated lineups) | `scripts/ops/dfs_stochastic_milp_optimizer.py`, `week10_*_dfs_packet.json` |
| Stack & Bring-Back Construction | Enforce Classic QB + >=1 same-team WR/TE (+ optional opponent bring-back in high-total domes/shootouts) and ban QB vs. opposing DST anti-correlation; enforce Showdown CPT-to-correlated-pass-catcher / DST game-script pairs | `scripts/ops/dfs_stochastic_milp_optimizer.py` |
| Lock / Exclude / Exposure Controls | Stage 0 allowlist acts as fail-closed Exclude (`Out`, `Doubtful`, `IR`, `Injured Reserve`, traded/retired, decoy risk); confirmed live `qb1_starter` acts as verified QB pool anchor; per-player exposure bounds prevent all-in single points of failure | `scripts/ops/enforce_stage0_roster_and_board_allowlist.py` |
| Late Swap Pre-Inactives Protocol | Every packet carries `release_status` (`HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER`) and `publish_allowed: false` before official NFL 90-minute inactives; pre-Munich (`06:15 AM CST`), early window (`10:30 AM CST`), and late/SNF/MNF swap windows re-run Stage 0 before any entry unlocks | Scheduled pre-kickoff gate + Stage 0 refresh |
| Mathematical Conservation & Bonus Accuracy | Eliminate discontinuous step-function `+3.0` bonuses on point means (use smooth tail probability for 300-yd passing / 100-yd rushing / 100-yd receiving DK bonuses); consume direct conserved `rush_tds` rather than double-counting QB passing TDs as rushing TDs; conserve team target/carry shares with `OTHER_TEAM_REC` / `OTHER_TEAM_RUSH` sinks | `scripts/ops/gse_connected_game_workflow.py`, `scripts/dfs/build_week10_all_slates_dfs_packets.py` |
| Post-Slate Perfect Lineup Loop | After Sunday/Monday games settle (`week10`), ingest actual DK points and compare Cash + 20-Max GPP portfolios vs. slate Perfect Lineup into `brain/feeds/<date>/` Learning Loop | `brain/feeds/`, post-slate grading cron |

---

## 3. UI/UX & Copy Discipline for Storefront DFS Surfaces

1. **Zero Internal Engine Jargon:** Public or subscriber DFS cards describe matchup drivers in natural football prose (clean pocket rate, slot target concentration, red-zone carry share, indoor pace, defensive front pressure) -- never simulation counts, solver internals, or unverified win-rate banners.
2. **Paywall Isolation:** Public marketing surfaces may preview slate pace/total environment and high-level team usage context; full optimal lineups, CSV downloads, CPT exposure tables, and core pools belong strictly behind subscriber authentication.
3. **Fail-Closed Provenance:** Every DFS packet records source dossier SHAs, `stage3_4_receipt_sha256` (64 hex chars), and the DraftKings draftables CSV SHA-256 hash + mtime so stale salary pools cannot silently leak into optimization runs.
