# NFL EQUATION INVENTORY — every spoken item, its status, its data, its reopen condition

_Observed: 2026-10-11. All items DIAGNOSTIC until residual-versus-close clears on a frozen NFL manifest.
Statuses: MEASURED (numbers exist, no RVC stamp) / REFUSED (ran and failed its bar) / NOT-RUN /
BLOCKED (data absent, condition stated). "RVC reopen" = exact condition to run residual-vs-close._

## A. THE_FLOOR slots (dfs/THE_FLOOR.md)

| # | Slot | Status | Data on bus | RVC reopen |
|---|---|---|---|---|
| A1 | Game scores — bivariate CMP | NOT-RUN | pbp margins READY | fit CMP vs Gaussian-close on frozen 2020-25 manifest; CRPS bar 7.109 |
| A2 | Team ratings — GAS score-driven | NOT-RUN (paper confirmed 2604.09143) | margins READY | LOSO-CV calibration + CRPS bar vs Kalman |
| A3 | Prop tails — nsEVDx non-stationary GPD | NOT-RUN (tool exists 2509.07261) | PBP play-lengths + ladders | backtest 23-25 longest-X Brier vs book-implied |
| A4 | Weather — 3-layer (physics/EMOS/conformal) | MEASURED-RAW (wind15+ −5.41 total, 549 games; no close residual) | 549-game sample + free NWP | residual-vs-close on weather-sensitive props w/ closing totals (line history needed) |
| A5 | Live repricing — Hawkes | NOT-RUN | PBP timestamps (re-pull needed) | log-loss vs constant-rate on in-play sequences |
| A6 | Context — DML | NOT-RUN | pbp+schedule+residuals READY | fold stability + placebo treatments |
| A7 | Sizing — posterior-Kelly | NOT-RUN | DK fits uncertainty READY | MC growth curves w/ parameter noise |
| A8 | Book weights — Hedge | NOT-RUN | book snapshots READY | weighted vs equal consensus log-loss walk-forward |
| A9 | Coaches — MaxEnt IRL | NOT-RUN | pbp decisions (re-pull) | beat nfl4th AND market next-season |
| A10 | Abstain — MMD drift gate | NOT-RUN | team-state features READY | net CLV improvement skipping flagged weeks |

## B. Spoken NFL items (RUNNING_LOG lineage)

| Item | Status | Key numbers on record | Data | RVC reopen |
|---|---|---|---|---|
| B1 Situational graph | MEASURED-RAW (no close residual) | graph_vs_close_stamp.py exists; drive-PPD wk-6 7.3852 vs close 7.5057 (single-week PROMOTED, pooled REFUSED 9.28 vs 7.95) | nfl_pbp_baseline + week files | pooled multi-week close-anchored CRPS on frozen folds |
| B2 Multi-season equations EQ-1..3 | MEASURED (2025, stdlib) | EQ-1 pressure gradient real (low +0.19→high −0.06 EPA/dp); EQ-2 drivestart×tempo 1.45→4.35; EQ-3 must-score ≈0 (t=−0.41) but team dispersion BUF+0.28→IND−0.75 | 2025 pbp | per-team stability walk-forward (EQ-3) + residual-vs-close framing |
| B3 EPA re-derivation | MEASURED | independent EPA/WPA r≥0.97 vs nflfastR | local pbp parquets | r≥0.97 already IS the validation stamp; residual-vs-close N/A (derivation, not prediction) |
| B4 Officials crews | BLOCKED (iSH memory) → PC lane | officials.parquet on bus (item 3 ✅) | officials.parquet READY | crew-level penalty-rate residual vs close, 2022-25 frozen |
| B5 FTN team z-scores | MEASURED | 47,316 plays, 9 flags × 32 teams; WAS no-huddle +38.5 | data/ftn_team_z_2025.csv | residual-vs-close framing before any weight (doc says so) |
| B6 FTN fingerprints | MEASURED | league-level fingerprint CSV | ftn_fingerprint_league_2025.csv | same gate |
| B7 QB form/pressure/familiarity/trust | INFRASTRUCTURE PASS / result REFUSED (ATS RVC run 2026-10-11, dfs/b7_cpoe_rvc/) | cpoe_proxy_vs_native_r=0.9659 (n=16,609; minis/RUNNING_LOG.md:129); persistence r=+0.107 (n=1,614); next-week ATS resid on last-wk CPOE diff: in-sample slope +0.084 t=2.21 (n=807), walk-forward 2024-25 CRPS-delta t=+0.71 (<1.96) | nfl_rvc_manifest.json + pbp native cpoe | completion-prop closes on a frozen manifest (CPOE p vs book p), or 2026 frozen folds with pooled CRPS-delta t≥1.96 |
| B8 Distribution truth — Laplace/σ(T)/skew | MEASURED (EDGE#1b) | Laplace CRPS 5.475 vs Normal 8.133 (32.7% better); cells σ 10.0-13.7, P|3| 0.08-0.26 | 855 game cell grid | CRPS on frozen 2026 weeks (close-anchored) — THE strongest candidate |
| B9 OT equation | MEASURED (EDGE#2) | P(OT)=0.054; OT +5.2±2.9; fav OT win 0.711 (z=2.8 provisional) | 855-game OT sample | OT-conditioned margin CRPS on frozen manifest |
| B10 FG curve (EDGE#3) | MEASURED | 4,713 attempts; 99%→62.6% by distance | local pbp | kicker-prop RVC via nash alt subcats |
| B11 Derived-total scanner (EDGE#5) | BUILT v1 → honest-superseded (main/alt artifact) | 26 scans; 0 real divergences confirmed | nash payloads | scanner v2 (main/alt grouping) → divergence residuals |
| B12 Weather ODE/physics | NOT-RUN (design in THE_FLOOR A4) | wind15+ measured raw | pbp + free NWP | kick-distance ODE vs book kicker props |
| B13 Clutch / must-score | MEASURED (EQ-3) | league ≈0; team dispersion large | 2025 pbp | team-level stability + close anchoring |
| B14 Coaching τ̂ | MEASURED w/ fallback flags | tau_hat.csv: fallback_level=league on 2026 in-season cells | intelligence/coaching/data/tau_hat.csv | LOSO season calibration; point-fit warning noted in-file |
| B15 engine_math pieces (Shin/Kalman/teaser-MC/CRPS 45 fns) | MEASURED (import-clean, self-tests) | engine/ stack restored 21:30 | engine/ dir | used by A-slot upgrades; standalone RVC via A1/A2 |
| B16 NFL quarter curve | MEASURED | nfl_quarter_curve_2025/2026.csv | READY | quarter-total props RVC |

## C. Highest-leverage RVC-closeable NOW: B8 (Laplace margin distribution)

Why: data fully on bus (855-game cell grid + frozen 2026 wk-6 lines in earlier artifacts), the
CRPS machinery exists (engine stack + graph_vs_close_stamp.py precedent), and the pre-registered
metric (close-anchored CRPS) is the doctrine bar. All other slots need re-pulls or new fits.

Stale-open item: B1's wk-6 single-week PROMOTED verdict needs its pooled multi-week re-run — same machinery.

## ADDENDUM (2026-10-11 03:41) — structural gap CLOSED + first out-of-sample NFL RVC numbers
- **NFL RVC manifest CLOSED**: dfs/nfl_rvc_manifest.json — 855 games 2023-25, closing lines (pbp spread_line/total_line) + final outcomes, FreshnessGate PASS, sha d4b76378. The "no frozen NFL RVC manifest" structural gap is resolved.
- **B8 out-of-sample**: Laplace +0.41 vs Gaussian-close (MC ground truth, bug-fixed). In-sample 32.7% → ~2.7% vs efficient close. Lesson: distribution-shape edges must be CONDITIONAL (σ(T), skew cells) to survive the close.
- **B8 σ(T) margins**: emp sd 14.28/14.62/15.10/12.90 by total bin — non-constant confirmed.
- **B16 totals σ(T)**: resid sd 11.59-14.08 by closing-total bin (mid-total tightest 11.59); totals skew +0.359; totals CRPS Gaussian 14.27 vs Laplace 13.90.
- **B16 over-rates by total bin**: 52.7/46.2/54.2/46.5 — no monotonic bias (no free over/under lean).
- Remaining blockers: B4 officials crew RVC, B7 CPOE persistence, B1 pooled multi-week, OL/injury source.

## B7 RVC STAMP (2026-10-11) — CPOE persistence → next-week ATS residual vs close

**Stamp: INFRASTRUCTURE PASS. Result: REFUSED. DIAGNOSTIC: not a live edge, nothing promoted.**

- Manifest: dfs/nfl_rvc_manifest.json (855 games 2023-25, sha256_16 bec543fc83a63ed7), read through FreshnessGate v2 `read_fresh` (PASS, age 1.7h). CPOE: native nflfastR `cpoe` from intelligence/coaching/data/play_by_play_2023-2025.parquet (the parquets the manifest was frozen from; the gate can't read .parquet). Proxy-vs-native r=0.9659 (n=16,609) is recorded at docs/research/2026-10-09/rating-atlas/minis/RUNNING_LOG.md:129 and minis/DIAGNOSTIC_compute_missing_metrics_2025.json.
- Residual: home ATS residual = (home_score − away_score) − spread_line (nflverse: spread_line > 0 = home favoured). Features use prior games only: the last game's CPOE diff (home − away) and the attempt-weighted season-to-date CPOE diff.
- Persistence (team, prior game → next game): r=+0.107, slope 0.107, t=4.33, n=1614. Consecutive weeks only: r=+0.111, n=1512. This matches the NGS b2b r=0.106.
- In-sample OLS, all 3 seasons, n=807: last-week diff slope +0.0835 pts per CPOE pt, t=2.207, 95% CI [0.0093, 0.1576]. Season-to-date diff slope +0.1365, t=1.966, CI [0.0004, 0.2726]. The in-sample pooled t is carried by 2024 alone.
- Per season (last / season-to-date t): 2023 0.631 / -0.441; 2024 2.576 / 3.043; 2025 0.643 / 0.935. Each season n=269.
- Walk-forward HonestyGate (minis/doctrine.py; fit on prior seasons, test 2024 and 2025, n=538 folds, close-anchored Gaussian CRPS). Last-week: close 7.077 vs candidate 7.0601 (raw gate output lower CRPS), paired delta t=0.712, won 279/538. Season-to-date: close 7.077 vs 7.0854, t=-0.455. Neither reaches the t≥1.96 bar. **REFUSED.**
- Manifest defect (flagged, not fixed here): the precomputed `margin_residual_vs_home` and `spread_cover_home` fields in nfl_rvc_manifest.json are wrong. `final_diff` is the last-play posteam-relative score_differential (equal to the home margin in only 60% of games), and the formula adds spread_line when it should subtract it. `spread_cover_home` agrees with the true cover only 40% of the time. B7 recomputed the residual from the manifest's own scores and closes. Any slot that consumed those two fields needs a re-check.
- Artifacts: dfs/b7_cpoe_rvc/b7_cpoe_rvc.py, residual_table.csv (807 game rows), per_week.csv, result.json.
- **Reopen condition:** (a) completion-prop closes (DK completion-% / completions ladders) captured on a frozen manifest, then CPOE-based p vs book-implied p residual; or (b) 2026 frozen weekly folds added, with pooled paired CRPS-delta t≥1.96 on locked walk-forward folds.

## DK ENGINE CONFIG VAULT LESSONS — DIAGNOSTIC (none is a live edge)

Source: dfs/dk_engine_config_vault.json and docs/research/2026-10-09/rating-atlas/minis/RUNNING_LOG.md entry "[04:45] DK ENGINE CONFIG VAULT" (commit 8c08ddd8). Nothing found in Beexly/agent-bus (code search: 0 hits).

| # | Lesson | Source | Status |
|---|---|---|---|
| D1 | 49 boolean switches in the client engine config | RUNNING_LOG [04:45] (vault JSON lists only a subset) | DIAGNOSTIC |
| D2 | 500ms SGP recalc rhythm (1000ms pre-live) | vault LESSON_1 / sgp_timeouts | DIAGNOSTIC |
| D3 | Longshot starvation: longshot initial data off | vault LESSON_2 / longshot_initial_data=false | DIAGNOSTIC |
| D4 | Simplebet as a separate (third) pricing engine | vault LESSON_4 / simplebet_enabled | DIAGNOSTIC |
| D5 | MoveTheLine 15s blink | vault LESSON_5 / micro_markets_blink_ms=15000 | DIAGNOSTIC |
| D6 | Two protocols (odds WS vs my-bets WS) | vault LESSON_6 | DIAGNOSTIC |
| D7 | Three third-party vendors behind one brand | RUNNING_LOG [04:45] item 6 (the source says "engines") | DIAGNOSTIC |

## EXPECTED-METRIC CONDITIONAL RVC (2026-10-11): CPOE + nflfastR xYAC, by total tercile × score state

**Stamp: INFRASTRUCTURE PASS. Result: REFUSED: 0/16 cells survive Holm or Bonferroni on the held-out paired CRPS t. DIAGNOSTIC only, nothing promoted.**

- Same pipeline as B7: the manifest passes the FreshnessGate v2 read (sha256_16 bec543fc83a63ed7), and the residual is (home_score − away_score) − spread_line, recomputed from raw scores (the defective manifest columns are not used). The feature is the prior game only (the last-game metric diff, home − away). The HonestyGate is walk-forward: fit on earlier seasons, test on 2024 and 2025.
- Metrics: CPOE (native `cpoe`) and YACOE = yards_after_catch − nflfastR native `xyac_mean_yardage`. **GSE-RYOE and GSE-xYAC do not exist in the repo.** Native NGS RYOE exists only as minis/re/genie-acquisition-2026-10-10/ngs_rushing.csv.gz, which is excluded: the gate can't read .gz, the rows are qualifiers only, and it isn't the manifest's source.
- Axes: close-total tercile (cutpoints [42.5, 46.0]) × score state of the metric's plays (all vs neutral |score_differential| ≤ 8). A pressure proxy (qb_hit/sack) is derivable but wasn't used, to keep the family small.
- **Multiple testing: 16 tests (2 metrics × 2 states × 3 terciles + pooled). Holm and Bonferroni at α=0.05 both applied.** In-sample survivors: none. Held-out survivors in the helpful direction: none. The only held-out survivor (yacoe_all pooled, paired t −3.74) is significantly **worse** than the close.

| metric/state | cell | n | slope | t | 95% CI | held-out CRPS close / cand | paired t | Holm |
|---|---|---|---|---|---|---|---|---|
| cpoe_all | pooled | 807 | +0.0835 | 2.207 | [0.0093, 0.1576] | 7.077 / 7.0601 | 0.712 | no |
| cpoe_all | low | 299 | -0.0084 | -0.132 | [-0.1322, 0.1154] | 7.2288 / 7.2295 | -0.146 | no |
| cpoe_all | mid | 242 | +0.1081 | 1.642 | [-0.0209, 0.2372] | 6.8632 / 6.8151 | 0.731 | no |
| cpoe_all | high | 266 | +0.1383 | 2.021 | [0.0042, 0.2725] | 7.1348 / 7.0974 | 0.511 | no |
| cpoe_neutral | pooled | 806 | +0.0361 | 1.46 | [-0.0124, 0.0846] | 7.0795 / 7.0773 | 0.152 | no |
| cpoe_neutral | low | 298 | +0.0379 | 0.963 | [-0.0393, 0.1151] | 7.2377 / 7.2517 | -0.546 | no |
| cpoe_neutral | mid | 242 | +0.0277 | 0.615 | [-0.0606, 0.1159] | 6.8632 / 6.8746 | -0.456 | no |
| cpoe_neutral | high | 266 | +0.0309 | 0.685 | [-0.0576, 0.1195] | 7.1348 / 7.1778 | -0.88 | no |
| yacoe_all | pooled | 807 | -0.0924 | -0.504 | [-0.4518, 0.2671] | 7.077 / 7.1399 | -3.738 | yes (WORSE than close) |
| yacoe_all | low | 299 | -0.3550 | -1.249 | [-0.9118, 0.2018] | 7.2288 / 7.2827 | -1.072 | no |
| yacoe_all | mid | 242 | +0.2987 | 0.878 | [-0.3684, 0.9657] | 6.8632 / 6.9161 | -1.204 | no |
| yacoe_all | high | 266 | -0.1130 | -0.336 | [-0.7711, 0.5452] | 7.1348 / 7.218 | -2.701 | no |
| yacoe_neutral | pooled | 794 | -0.1594 | -1.358 | [-0.3896, 0.0707] | 7.0163 / 7.0525 | -2.508 | no |
| yacoe_neutral | low | 290 | -0.1460 | -0.93 | [-0.4537, 0.1617] | 7.0869 / 7.1088 | -1.553 | no |
| yacoe_neutral | mid | 241 | +0.1550 | 0.554 | [-0.3935, 0.7035] | 6.8556 / 6.8627 | -0.285 | no |
| yacoe_neutral | high | 263 | -0.3837 | -1.717 | [-0.8215, 0.0542] | 7.1127 / 7.2346 | -1.221 | no |

- Artifacts: dfs/expected_metric_conditional_rvc/em_conditional_rvc.py, residual_table.csv (855 games), cells.csv, result.json.
- **Reopen condition:** 2026 frozen weekly folds appended to the manifest, plus a single pre-registered cell reaching paired CRPS-delta t ≥ 1.96 after Holm over the registered family. Or: prop-level closes (completions / receiving-YAC ladders) captured on a frozen manifest, for a direct metric-vs-prop residual.

## OU LIVE-WP: STRUCTURAL FINDING (verified from e7c110e2) + θ REFINEMENT — DIAGNOSTIC

Verified against dfs/OU_LIVE_WP_STAMP.json, dfs/ou_rvc_rows.csv and dfs/ou_live_wp.py, re-run on the box (exact reproduction):
- Fit on **42,461 play-pairs** (285 games, 2025 pbp incl. playoffs): matches. θ = 5.03e-5/s, σ = 0.2964/√s.
- **Half-life 230 min** (13,773 s = 229.6 min): matches.
- **OU beats the static close from Q3 on, crossover around halftime**: matches the artifact. Brier by state (seconds remaining): 3600 OU 0.3107 vs close 0.2167; 2700 0.2580 vs 0.2167; 1800 0.1939 vs 0.2167; 900 0.1387 vs 0.2167.
- Caveats found: (1) the RVC is in-sample (fit and graded on the same 285 games). (2) At kickoff the shipped expectation formula returns the negative of the close in 100% of games (corr(p_OU, p_close) = −0.999). That's why Q1 Brier 0.3107 is worse than a coin flip, so "θ too slow" isn't the cause. (3) The baseline is the static pre-game close, not a live line, so any state-aware model is expected to beat it late in games.

θ refinement (dfs/ou_theta_refine/): **Stamp INFRASTRUCTURE PASS. Result: REFUSED as an early-game fix: per-half / per-quarter theta moves held-out Q1-start Brier by -0.0018 (half) and -0.0020 (quarter); every OU variant still loses to the close at kickoff (best B 0.2462 vs close 0.2226). The early-game gap comes from the shipped expectation formula (A), not from theta speed.**
Locked split: fit on 2025 weeks 1–9 (135 games), test on weeks ≥ 10 (150 games). A = the formula as shipped; B = the exact conditional mean of the same SDE. Held-out Brier:

| sec remaining | n | close | A single | A half | A quarter | B single | B half | B quarter |
|---|---|---|---|---|---|---|---|---|
| 3600 | 150 | 0.2226 | 0.3163 | 0.3145 | 0.3143 | 0.2472 | 0.2462 | 0.2462 |
| 2700 | 150 | 0.2226 | 0.2616 | 0.2608 | 0.2607 | 0.2158 | 0.2157 | 0.2166 |
| 1800 | 150 | 0.2226 | 0.1989 | 0.1989 | 0.1989 | 0.1773 | 0.1777 | 0.1778 |
| 900 | 150 | 0.2226 | 0.1275 | 0.1282 | 0.131 | 0.1219 | 0.1226 | 0.1255 |

Held-out paired t vs close at 1800 s: A single 1.09, B single 2.59. At 3600 s: B single -2.03. The walk-forward per-quarter θ for Q3 came out negative (-1.62e-05).
- Artifacts: dfs/ou_theta_refine/ou_theta_refine.py, graded_states.csv, result.json.
- **Reopen condition:** REOPEN: re-specify the attractor (mu path ending at the close-implied margin, not 0) and fix the expectation formula, then re-grade on 2023-24 fit / 2025 test; grade vs a LIVE in-game line (not the static pre-game close) before any live-engine claim.
- Cross-check vs f8c9e873 (dfs/ou_theta_per_quarter.json, landed while this ran): its pair counts match this run's elapsed-time segments in reverse order. Its "Q2" (n=9,610, θ≈0) corresponds to elapsed 1800–2700 s, which is the **third** quarter, and its "Q4" (n=9,510) is elapsed 0–900 s, the first quarter. The quarter labels there look inverted (remaining time vs elapsed), so the "2-minute drill in Q2" explanation needs re-checking. Both runs agree that per-quarter θ doesn't fix early-game Brier.
