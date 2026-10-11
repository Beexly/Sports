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
| B7 QB form/pressure/familiarity/trust | NOT-RUN as equations; CPOE-proxy r=0.9659 vs native (DIAGNOSTIC contract met) | cpoe_proxy_vs_native_r=0.9659 (n=16,609) | pbp parquets | CPOE-persistence → next-week completion% residual vs close |
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
