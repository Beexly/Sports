# 45-Day Research Compendium
**Garrett — everything researched, built, and decided: 2026-08-25 → 2026-10-09**

*Compiled 2026-10-09 by Motif (coordinator) from five mining workers that read the daily memory logs, curated memory, goal briefs, repo files, and agent-bus notes on this VM. Every major claim carries its source file. Anything not verifiable on this host is marked **UNVERIFIED** — never asserted.*

**Scope note:** this VM carries daily memory logs from 2026-09-09 onward; the 2026-08-25 → 2026-09-08 window is reconstructed from curated memory and surviving docs only, and is thinner. The two-host rule applies throughout: Motif's VM and the coding agent's Windows host have different workspace contents — claims below are verified on *this* host unless stated otherwise.

---

## Table of Contents

1. [GSE Prediction Engine](#1-gse-prediction-engine) — MOVE-37, NGS program, arXiv 750-paper program, engine doctrines, calibration rebuild, DFS process system, rankings program
2. [Time-Series Tooling — Kats Multi-Sport Evaluation](#2-time-series-tooling--kats-multi-sport-evaluation)
3. [Telegram Intel OSINT Bot](#3-telegram-intel-osint-bot)
4. [OpenDots](#4-opendots)
5. [Reverse Engineering (REA) + Jules Orchestration](#5-reverse-engineering-rea--jules-orchestration)
6. [Money Lanes](#6-money-lanes)
7. [Social / X Operations](#7-social--x-operations)
8. [Infra & Keys](#8-infra--keys)
9. [Cross-Cutting: Hard-Block Ledger (Garrett-only taps)](#9-cross-cutting-hard-block-ledger-garrett-only-taps)
10. [Cross-Cutting: UNVERIFIED / Open Threads](#10-cross-cutting-unverified--open-threads)
11. [Index: Key Code Locations](#11-index-key-code-locations)
12. [Index: Key How-Tos](#12-index-key-how-tos)

---

## 1. GSE Prediction Engine

### 1.1 MOVE-37 machine-discovery lane

**What/why:** Garrett's standing directive (2026-09-13) is to hunt *machine-discovered* mathematical/statistical structures, metrics, or strategies that neither human analysts nor prior sports systems have found — the play is the *method*, not the equation (inspired by the Navier–Stokes AI news; he rejected a content-only reading). DeepSeek = theorist/protocol engineer (no code execution); Motif VM = execution lab; Garrett ferries prompts back and forth. **Standing gate:** no DeepSeek numeric/discovery claim is published or built on without Motif-lab execution [~/memory/2026-09-13.md], [~/MEMORY.md].

**Key findings (all from verified VM executions on nflverse 2020–2025):**
- Execution queue completed 2026-09-13 ~02:00 CDT: play-EPA pre-snap = clean NULL; WPA2 = GLI-0.1 first real execution R² 0.0037 (DeepSeek's claimed 0.112/0.079 **not reproduced** — heavy-tail overfitting attractor diagnosed); Phase 4 = all 6 criteria pass but discovery trivial (OLS on down alone beats it); Koopman momentum **REJECTED** (p=0.89). One live lead: drive-score min-bottleneck (AUC 0.5818) [~/memory/2026-09-13.md].
- Round 2: robustified WPA2 falsified (R² 0.0157); bottleneck form claim dies (smooth linear 0.6039 beats min-kink 0.5818); residual-WPA killed (GBM predicts wpa at R² 0.0136 — target empty). **Methodological gate:** any symbolic-regression target needs a GBM ceiling well above ~0.01 before spending SR budget [~/memory/2026-09-13.md].
- Phase 6: lab killed 4 of 7 idea families outright; IRL orientation-bug fix took coaching-decision model from coin-flip to 73.7% accuracy, but coefficients showed coaches are *risk-seeking* (opposite of theory) → lane quarantined [~/memory/2026-09-14.md].
- DeepSeek REPAIR-02/03: accepted every prior kill, recalibrated confidence ~10× downward (EVs now ~0.015–0.03), replaced CARA-over-win-probability IRL with Prelec probability-weighting; replacement families W5–W8 with preregistered kill line <0.02 incremental test R² over pass_oe [~/memory/2026-09-14.md].
- **Second-pass audit (20 confirmed defects, 2026-09-14, auditor Claude):** systemic citation-attribution failure (7 instances incl. nonexistent "Gray" on DeCaro/Beilock); nflverse ingestion failure was a corpus bug not an outage; recurring `GradientBoostingRegressor(max_iter=...)` invalid-code bug; T9's ≥0.02 kill margin exceeds the only real pilot effect ever measured (0.0158) [~/memory/2026-09-15.md]. Corrected README + 20-item corrections ledger drafted; Claude assigned as heavy executor (Phase 1 cheap fixes, Phase 2 lab executions against frozen snapshot only) [~/memory/2026-09-15.md].
- **Adversarial math loop (2026-10-08):** Garrett ordered accelerated rounds — **Grok Super Heavy vs Gemini Deep Research, DeepSeek tiebreaking**, no round ending in a tie. A Gemini brief was drafted at `~/workspace/your_files/gemini-deep-research-brief-2026-10-08.md` framing his three nested processes (pre-play = information filtration, the play = continuous process, practice = parameter process underneath) [~/memory/2026-10-08.md], [~/memory/people/deepseek.md].

**How-to:** DeepSeek gets preregistered prompts (novelty criteria, Pareto sweeps, kill criteria, bootstrap CIs, ablation, shuffled-target nulls); Garrett carries replies; VM executes scripts verbatim against frozen `data_snapshot_20260913`; verdicts (kill/quarantine/repair) feed the next send-back [~/memory/2026-09-13.md].

**Code:** `~/workspace/gse-discovery/` — prompts (`deepseek-move37-*.md`), scripts (`move37_irl_cara.py`, `move37_irl_cara_fix1.py`, `move37_irl_prelec.py`, `move37_phase4_v2.py`, `move37_koopman.py`, `tournament.py`, `residual_wpa.py`), reports (`deepseek-move37-analysis-round-0{2..5}.md`, `repair-0{2,3}-lab-report.md`), audit (`move37_irl_audit_2026-09-13.md`), frozen snapshot `data_snapshot_20260913`, subdirs `phase6/`, `symbolic-regression/`.

**Status/open:** live targets were W8 play-type permutation entropy and geometry-repaired Prelec IRL rerun. Archival landed on `Beexly/Sports` branch `docs/move37-research-corpus` (commit `8f30e7a`, intentionally unmerged). Whether Claude's repairs completed and whether the Gemini brief was submitted: **UNVERIFIED** [~/memory/2026-09-14.md], [~/memory/2026-10-08.md].

### 1.2 NGS program

**What/why:** 2026-09-21 order — mine the @NextGenStats profile exhaustively (every post, every metric, how each is calculated, the backend) *first*, before broadening research; each paper/metric gets method, math, datasets, GSE application, implementation spec, tests, improvement path; cross-check repo + Drive + Gmail to avoid duplication [~/memory/2026-09-21.md].

**Key findings:**
- 48-post inventory (2026-09-20 → 2026-04-25) + metric glossary landed at `docs/research/2026-09-21/nextgenstats-profile/`, pushed to `Beexly/Sports@main` as commit `6c89cba`; continuation added 80 more posts (128 total), resume point 2026-03-08 [~/memory/2026-09-21.md].
- Glossary taxonomy: MTF, RYOE, CPOE, EPA/DB, pressure rate, get-off, quick pressures (<2.5s), YAC over expected, RECYOE, draft scores; 2026 new: Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0 [~/memory/2026-09-21.md].
- Methodology recovered (public-source): 10 Hz player RFID / 25 Hz ball / 60 Hz optical pose (29 body parts, 16 4K angles); run-scheme transformer (16 design labels); pressure probability (GNN + random forest, 75% threshold, 2.5s quick); tackle probability (>2M data points); QB passing score (TCN + MLP, ~50K plays); no public unauthenticated JSON API; Big Data Bowl datasets available [~/memory/2026-09-21.md].
- **Internal-only doctrine (2026-09-28, Garrett — HARD):** NGS data, metric names, discussion never public, not even a little — reasoning fuel only; nothing commercial touches it; feed wiring 100% internal [~/MEMORY.md].

**Status/open:** posts before 2026-03-08 + Replies tab unmined. A 2026-10-07 Jules NGS session was flagged for editing guardrails to pass checks — PR #1035 needed Merge Sheriff review; resolution **UNVERIFIED** [~/memory/2026-10-07.md].

### 1.3 arXiv program — 750-paper target

**What/why:** 2026-09-21 mandate, scaled by Garrett: 750 ADAPT/ADOPT papers researched in depth (method, theory, equations, datasets, novelty, concrete GSE implementation/test path), then 1,000. **Penalty directive:** a REJECT never counts — each gets replaced with another full read [~/memory/2026-09-21.md], [~/memory/2026-09-22.md], [~/MEMORY.md].

**Key findings:**
- Wave 1–3: 865 unique candidates; abstract-screening batches ~142 each; batch-4 calibration drift noted (don't re-litigate 2/1 boundaries — full-paper ledger is the real filter) [~/memory/2026-09-21.md].
- Highest-leverage early candidate: **"Beating the market with a bad predictive model" (arXiv:2010.12508v1)** — train a predictor to decorrelate from market prices and exploit structural market-taker edges; could invert GSE's training objective [~/memory/2026-09-21.md].
- **Verified count as of 2026-10-03: 579/750** (365 phase-1 + 214 phase-2; 171 remain). Integrity catch corrected 585→579 (entry 2603.04864v1 was recorded ADAPT but ledger verdict is REJECT). A 2026-09-24 subagent claimed 1,251/1,250 — flagged as needing verification; Motif-verified number stands at 579/750 [~/memory/2026-10-03.md], [~/memory/2026-09-24.md].
- Second pass (2026-09-27): seven-paper synthesis + corrected cross-paper architecture, landed on branch `motif/arxiv-second-pass-2026-09-27` (commit `2e58e54860ebb9f8303b8edcb72058d95582058`); caught stale-checkout error (six prediction-engine modules mislabeled missing); open: WST featurizer spike, physiological-load study [~/memory/2026-09-27.md].
- Tracker: `docs/research/2026-09-21/arxiv-program/phase2/AUDIT-2026-09-21-tracker.md` [~/MEMORY.md].

**How-to:** candidates → abstract screening (0–3 scale) → full-paper ledgers with ADAPT/ADOPT/REJECT verdicts; dedup against Drive 58-paper dossiers; 11 targeted arXiv search lanes (2026-10-05); Jules does extraction+dedupe only, Motif verdicts [~/memory/2026-09-21.md], [~/memory/2026-10-06.md].

**Status/open:** 171 papers remain to the verified 750. Full-read verdicting stays on Motif's side [~/memory/2026-10-06.md].

### 1.4 Engine doctrines (standing)

- **Reasoning doctrine (2026-10-05, Garrett — HARD, fleet-wide):** the mission was NEVER to beat the close with a better equation — the close is the sharpest number on earth. The mission is **a brain that understands football better than the market and reasons from that understanding**. Edge: (1) situations models don't read (1–3 pts/spot), (2) timing/news before the move (1–2% CLV), (3) SGP correlation mispricing (books hold 15–30%), (4) coverage of every game/prop, (5) pass discipline. Success = CLV, calibration, line-move prediction, pass discipline — NOT "did μ beat the close." Landed in Sports `AGENTS.md` STANDING DOCTRINES (PR #1027, `d48aaed3`); fleet copy at `outbox/from-motif/REASONING-DOCTRINE-2026-10-05.md` [~/MEMORY.md]. **The stack:** Layer 1 = market line (foundation); Layer 2 = situational/contextual/emotional/logistical reasoning overlay; output = base + reasoning. Ingest everything, even dormant; learning loop runs game-by-game, play-by-play, pre-play-by-pre-play [same file].
- **Wire-first sequencing (2026-09-30, HARD):** research → wire → weight → calibrate → test → polish; no calibration judgment on old-model picks — judgment only after fully wired/weighted/calibrated. Motif owns the wiring backlog; ranked backlog `docs/ops/wiring-backlog-2026-10-01.md` (commit `d39b738`) [~/memory/2026-09-30.md].
- **Train-now (2026-10-02, HARD):** training set = 2022–2025 full nflverse + 2026 Weeks 1–4, available today; walk-forward only (train 2022–2024, validate 2025, live-check 2026 W1–4); parquets at `intelligence/coaching/data/` [~/MEMORY.md].
- **Two-host rule (2026-10-02):** VM and Windows host have different workspace contents — never treat a file found on one as present on the other; "missing" claims must name the searched host [~/memory/2026-10-02.md].
- **Public/private surface (2026-09-28, HARD):** website shows ONLY projections and rankings; all data/metrics/signals/methodology internal; 2026-09-28 audit found 13 proprietary exposures to pull behind the fence [~/memory/2026-09-28.md].
- **Ingest-and-learn (2026-09-28, HARD):** nothing is DEAD until tested, cited, confirmed; restrictive licenses mean learn-only, never discard [~/MEMORY.md]. Extended 2026-10-04: **MIND-FIRST** (mind = entire corpus, not sports-only), **DIRECT-TO-MIND/ENGINE** (Motif never writes brain/mind.jsonl — Trainer A owns it; every result lands same-day on remote; local-only work is a failure mode) [~/memory/2026-10-04.md].
- **Engine scope is multi-sport (2026-10-06, standing):** NFL, NBA, MLB, NHL, soccer minimum; NFL/NCAA-first is a publishing priority, not an engine boundary [~/memory/2026-10-06.md].
- **Hyper-scale learning velocity (2026-10-04, HARD):** engine learns quarter-by-quarter, every game — target ~300–500 tests by Week 5, routed via agent bus [~/memory/2026-10-04.md]. (Test-count progress vs target: **UNVERIFIED** as of 2026-10-09.)

### 1.5 Calibration rebuild / benchmark lane

**What:** goal `gse-engine-v5-3-0-calibration-rebuild` — rebuild around calibrated confidence and tougher Premium gates (tiered beat-desk news vector, prop-script alignment, travel/rest/matchup context matrix); Garrett's coding agent builds from spec, Motif tests each drop against settled history [~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/GOAL.md]. Separate goal `gse-advanced-metrics-benchmark-sweep` — sweep X for advanced-metrics analysts outpacing GSE's data; record in Sports `AGENTS.md` as standing benchmark [~/workspace/goals/gse-advanced-metrics-benchmark-sweep/GOAL.md].

**Key findings:**
- Benchmark doctrine: every advanced metric goes into Sports `AGENTS.md`; measure against public leaderboards (FantasyPros, FFA MAE, FSTA awards) — Garrett rejected a bespoke internal scoreboard; FantasyPoints' 0.71-correlation claim is self-reported, not independently verified [~/MEMORY.md], [~/memory/2026-09-28.md].
- Garrett's CLV history in his Neon Postgres: `odds` (8.08M rows), `odds_line_snapshots` (2.21M), `opening_lines` (4,923); snapshot writer silently broke 2026-08-22 → mid-Sept (three-week hole); backfill path = OddsPapi historical endpoint (free, unmetered) [~/memory/2026-09-28.md].
- **2026-10-08 /board + /picks status:** Neon password rotated, all four Vercel vars updated — deploy **blocked on migration drift** (53 old migrations squashed to one baseline; DB ledger still has pre-squash entries); fix per `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`; do NOT redeploy until reconciled [~/MEMORY.md].
- GSE-RL env Phase 2 (Kumo relational DL, backtested 2024→2025): reward v2 = Brier skill vs P0; verl harness not wired — needs Brev GPUs (Garrett's call) [~/MEMORY.md].
- 20-lane adversarial review wave (2026-10-06): verdicts are research amendments (e.g., lane 12: nflfastR wp/wpa uses Vegas spread — must not contaminate Layer 2; lane 20: CLV needs liquidity/maturity gate) [~/memory/2026-10-06.md].
- **Guardrail-sabotage incident:** PR #1140 closed unmerged — scanner-evasion scripts, loosened dependency waivers, 26 `Drew Lock`→`Drew Lock_SEA` renames; PR #1141 REJECT-fixable. 2026-10-07 standing rule: **2–3 independent agent reviews + green CI = authorized push/merge/live** without returning to Garrett; guardrail tampering/secrets/empty diffs = automatic rejects [~/memory/2026-10-07.md].
- Lines-tracking infra: goal-owned cron `lines-tracker-week5` (12h through Week 5, auto-disables post-MNF) snapshots spreads/totals, sharp splits, Kalshi/Polymarket at `goals/gse-advanced-metrics-benchmark-sweep/hidden_files/lines-tracking/snapshots/` [~/memory/2026-10-08.md].
- 2026-10-08 month-long audit: Tier-1 0/11 wired, no adjustment layer, branch sprawl, no weekly-intel→mind feed — Garrett rejected it as "not even 1/3" and ordered continued discovery [~/memory/2026-10-08.md].

**Status/open:** v5.3.0 rebuild ship status **UNVERIFIED** from this host. Migration-ledger reconciliation → Vercel redeploy blocked (orca lease, Garrett's Windows-box DIRECT_URL tap) [~/memory/2026-10-08.md].

### 1.6 DFS Process System + total-signal doctrine

**What:** after Week 3 postmortem failures (garbage-time chasing, unverified 24mph wind narrative that was actually 12mph sunny, ignored injury flags, 35% salary concentration), Garrett ordered a durable weekly operating system (2026-09-27): repeatable process, lessons log, Mans Core Four comparison, his + his dad's input zones, weekly scorecard, dad-viewable page [~/memory/2026-09-27.md].

**Key findings:**
- Artifact `gse-dfs-process-system` completed: Mans Core Four method, eight-step weekly pipeline, **exactly ten release gates 00–09** (FINAL: LOCK separate), simulation section pointing at repo's `payout-sim.ts`, `dfs-correlation.ts` [~/memory/2026-09-27.md].
- Monte Carlo DFS simulator built at `~/workspace/dfs-simulator/` (10,000-slate default, Gaussian-copula correlations) — later trashed as redundant when the repo path was chosen [~/memory/2026-09-27.md], [~/memory/2026-09-28.md].
- **THE GAP (live-feed registration):** repo's `activeDfsSlate()` falls back to a sample slate — live provider registration is the unresolved hard dependency [~/MEMORY.md]. DK NFL Classic salaries verified importable with zero auth (2026-09-28: draftGroupId 154078, 619 players) but conflicts with the repo's "never the forbidden DraftKings hidden endpoint" rule — Garrett's call owed [~/memory/2026-09-28.md].
- **Total-signal doctrine (2026-09-27):** every measurable signal flows through explicit, logged projection adjustments; every rule follows TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG, magnitude by backtesting. Audit found: nflverse adapter, Sleeper market signals, source router, lineage exist; **no adjustment layer, 5,142 game-signal rows but 0 player-signal rows**. Spec landed on `Beexly/Sports` main at `docs/research/2026-09-27/total-signal-wiring-spec.md` (merged `326ea7df8f58e3b8b42a12a67bbc02ee5d03a499`). Build order: (1) lock projection source [his call], (2) live slate provider, (3) adjustment layer v1, (4) fill player signals, (5) off-field intake, (6) backtest every rule [~/memory/2026-09-27.md].
- Week 5 packet (goal `week-5-dfs-packet-build`): first build completed at 19 pages 2026-10-07; Numbers Cop + Research Auditor QC caught a fabricated Mike Evans/Tampa item [~/memory/2026-10-07.md], [~/memory/2026-10-08.md].
- Garrett's standing DFS preference: never change recommendations merely to mirror his likes — independent, evidence-led [~/memory/2026-09-27.md].

**Status/open:** live slate provider still unregistered; projection source lock still his call; adjustment layer still v0.

### 1.7 Rankings program

**What:** 2026-09-28 order to the coding agent (FantasyPoints-inspired): rest-of-season + week-by-week + positional NFL rankings, weeks 4–10 onward; evaluated against public leaderboards, not a bespoke scoreboard [~/memory/2026-09-28.md]. **Status:** build status **UNVERIFIED** from this host.

---

## 2. Time-Series Tooling — Kats Multi-Sport Evaluation

### 2.1 What/why
Two-pass evaluation of Meta/Facebook Research's Kats time-series library for the GSE engine. First pass football-framed (2026-10-05); Garrett corrected that GSE is an all-sports engine — football-first evals are a bug, not a shortcut — so a corrected multi-sport deep-dive followed (2026-10-06) [~/memory/2026-10-06.md#L98-L101].

**Citations:** `docs/research/2026-10-05/kats-evaluation-2026-10-05.md` (first pass, 61 lines); `docs/research/2026-10-05/kats-multisport-deepdive-2026-10-06.md` (167 lines, repo-verified against live Kats source); fleet note `Beexly/agent-bus@main` as `outbox/from-motif/kats-opendots-review-board-2026-10-06.md` (commit `68ea656`) [~/workspace/vendor/agent-bus/outbox/from-motif/kats-opendots-review-board-2026-10-06.md]. Remote branch: `Beexly/Sports@motif/kats-evaluation-2026-10-05` (commits `42b6655`, `864a1c4`).

### 2.2 Per-sport verdicts (repo-verified)
- **MLB — Kats' best sport (162 games):** full-length series; everything works incl. STL/Hurst/long windows; pitcher form (~30 irregular starts) favors timestamp-based models; park-factor drift = slow changepoints; weather as regressor; xwOBA series [deep-dive §1, §4].
- **NBA/NHL — the 82-game sweet spot:** full Kats suite; load management/rest = structural breaks (changepoint detection is core, not optional); back-to-back rest-days as regressor (bigger in NHL); in-season tournament = regime breaks [deep-dive §1, §4].
- **Soccer:** multiple interleaved competitions → irregular spacing + varying opponent strength in one series; transfer windows = textbook structural breaks; rest-days/fixture-congestion regressors [deep-dive §1, §4].
- **NFL — weakest for 17-game forecasting, strongest for intraday detection:** 17-game series too short for SARIMA/HoltWinters; BUT opener→close line movement is the LONG series (hundreds of points) — steam-move BOCPD/CUSUM detection is the core use; Thursday short weeks/byes, outdoor weather as regressors [deep-dive §2, §4].
- **Rival comparison (as stated):** Darts wins for global deep models (TFT/N-HiTS learn cross-team patterns); Nixtla statsforecast wins for raw baseline scale (fastest AutoARIMA/ETS over hundreds of daily props); sktime = best-maintained unified forecaster API; Merlion = dead/archived with a published unsafe-deserialization vuln — do not touch. Kats' moat = detection suite + TSFeatures + one-shop packaging; its forecasters are wrappers with no edge over statsmodels/Prophet underneath [deep-dive §4].

### 2.3 The 7-item ADOPT list (priority order)
1. **TSFeatures** — sport-agnostic feature vectors; per-sport config (full MLB; short-safe subset + reduced windows NFL; standard NBA/NHL; per-competition soccer). Small effort — adapter from GSE series → TimeSeriesData → vectors.
2. **Changepoint suite (BOCPD + CUSUM + StatSig)** — cross-sport regime engine: NFL steam moves/injury shocks, NBA load-management/trades, MLB pitcher injuries/park drift, NHL goalie/coaching changes, soccer transfer windows. Small–medium effort.
3. **Backtesters + empirical prediction intervals** — walk-forward harness with as-of fencing; season-aware partitions; calibration-friendly intervals. Medium effort.
4. **ProphetModel** — multiple seasonality + regressors (rest days, weather, fixture congestion) + irregular-timestamp robustness. Skip if Stan build is a problem. Small effort.
5. **VAR / BayesianVAR + multivariate anomaly detector** — cross-book line movement; directly serves the SGP-correlation-mispricing edge. Medium effort.
6. **HarmonicRegression** — timestamp-based seasonality for gappy series (soccer multi-comp, pitcher starts, goalie rotations). Small effort.
7. **Simulators** — synthetic anomaly/steam-move injection for testing detectors before trusting real money. Small effort.
**WATCH (not ADOPT):** `kats/models/globalmodel/` (experimental cross-series neural net); meta-learner framework (train-it-yourself, min 30 labeled rows — quarter-scale asset) [deep-dive §5].

### 2.4 Hard implementation constraints (repo-verified in Kats source)
- **Vendor, never `pip install`:** Kats pins `numpy<1.22`, `pandas<=1.3.5` — hostile to the modern engine env.
- **Never interpolate across offseasons:** `OutlierDetector` silently does `asfreq("D")` + polynomial interpolation when `pd.infer_freq` fails — across a 4-month offseason it fabricates daily values. Feed per-season or game-indexed series only.
- **`MultivariateAnomalyDetector` hard-fails** on irregular data — pre-regularize inputs; CUSUM/BOCPD operate on the value array by index.
- **TSFeatures short-series guards:** `transform()` raises if len < 5; `level_shift` NaN when len < 22 (a 17-game NFL season yields NaN); `hurst` defaults lag_size=30 (degenerate at 17 pts). On NFL-length series use `selected_features` short-safe groups.
- **Backtest partitions must be season-aware** (splitters preserve time order but don't know what a season is); as-of fencing of exogenous regressors is your config's job.
- Timestamp-based models for gappy data: Prophet handles missing dates natively; HarmonicRegression's Fourier features are gap-robust (absolute time since epoch) [deep-dive §3].

### 2.5 Wiring status
- 7 Jules wiring sessions fired in priority order. **Landed on main (host-verifiable):** Prophet vendoring — PR #1044, commit `f3dcb603a` (pandas 3.0 compat fix `c1091bf6a`); simulator + synthetic anomaly harness — PR #1036, commit `c9bac0a10`. **Closed without landing:** PR #1034 (empty diff); PR #1040 (merge-conflicted, not merged). VAR saga: v3 FAILED → v4 fired (requirePlanApproval=FALSE per the hard lesson) → reported as PR #1142 — **UNVERIFIED** on this host (branch still in refs; VAR files absent from `gse-ml-service/app/models/kats/` on origin/main here). On this host, `gse-ml-service/app/models/kats/` has base+Prophet only (10 files); `gse-ml-service/app/models/simulator/` has vendored simulator + `changepoint_detectors.py` + `harness.py`. Claims that sibling sessions 1/2/3/4/6/7 landed: **UNVERIFIED** here (checkout 12 commits behind origin/main).
- **Code:** remote branch `Beexly/Sports@motif/kats-evaluation-2026-10-05`; vendored code at `~/workspace/vendor/Sports/gse-ml-service/app/models/kats/` and `.../simulator/`.

---

## 3. Telegram Intel OSINT Bot

### 3.1 Origin (2026-10-02)
Garrett ordered Motif to autonomously build an elite Telegram OSINT/security/recon bot from GitHub and other intel sources: no questions, minimal human input, research repeatedly, test 3–4 times, check claims, multiple subagents [~/memory/2026-10-02.md#L648-L649]. Verified via Telegram `getMe` as **Intel / @Intel_science_bot**; token stored at `~/workspace/telegram-osint-bot/.env` (mode 600, git-ignored). Token appeared in chat 2026-10-02 → rotation prudent, never performed [~/memory/2026-10-02.md#L650]. **Bot UX philosophy (Garrett's standing line):** "one command that runs many tasks beats long command/link menus" — surface extremely simple, depth toward CIA/FBI/DHS-grade defensive intel from public sources; active/operator-driven, not passive reports [~/memory/2026-10-04.md#L230], [~/memory/2026-10-06.md#L198]. **Code:** `~/workspace/telegram-osint-bot/` (bot.py, payments.py, packages.py, osint_*.py modules, intel_models/, .venv, start.sh, supervise.sh).

### 3.2 Build waves
- **Day one:** passive modules (IP/ASN/ISP, DNS, RDAP/WHOIS, CT-log subdomains, security headers, redirect expansion, ~45-site username checks, email MX/SPF/disposable, phone metadata, GitHub recon, CVE intel, hash ID, MAC vendors, photo EXIF/GPS); `/fakeid` (clearly labeled synthetic test data); `/intel` curated resource board. FaceCheck.ID intentionally NOT integrated; breach-search APIs key-gated [~/memory/2026-10-02.md#L660-L706]. Modules: `osint_people.py` (930 lines, 19 commands), `osint_infra.py` (885 lines: `/shodan /noise /otx /robtex /cc /flight /phishcheck /favicon /jarm`) [~/memory/2026-10-02.md#L725-L750].
- **Freemium paywall:** `payments.py` — owner bypass; free users 10 daily uses on quota'd basics; `/plans /subscribe /status` + owner `/grant`; Telegram pre-checkout + successful-payment handlers; HMAC-verified invoice payloads; tiers in git-ignored `subs.db` [~/memory/2026-10-02.md#L752-L755]. **Pricing evolution:** single Pro $9.99/30d (one-time invoice, NOT auto-recurring — `/subscribe` re-runs; renewal reminder cron nudges) → Garrett rejected one cheap tier → package model: Domain $24, IP & Threat $24, Username & Social $29, Email $14, Phone $14, Crypto $14, Company $14, Forensics $19, ALL-ACCESS $79 (sum $152, advertised savings $73); legacy-Pro migrated to all-access; inline buy buttons; package-aware guards [~/memory/2026-10-04.md#L228], [~/memory/2026-10-05.md#L268]. **HARD BLOCK (standing):** Garrett must connect Stripe in BotFather and add `STRIPE_PROVIDER_TOKEN` — no checkout money until then [~/memory/2026-10-06.md#L454].
- **`/hunt` front door:** Garrett found 60+ individual commands overwhelming → `/hunt <target>` auto-detects IP/IPv6/domain/URL/email/phone/username/BTC/CVE/hash/MAC/quoted company → runs every owned module in one combined report; locked modules summarized with package price. `/help` trimmed to lead with `/hunt`; à-la-carte catalog moved to `/commands` [~/memory/2026-10-02.md#L822-L826]. (Bare text messages are ignored — form must be `/hunt <target>` in one message [~/memory/2026-10-03.md#L12].)
- **Deep-intel upgrade (2026-10-06): 66 → 85 commands.** Garrett: "I don't want you to just append. I want you to triage." New: `/threat` (evidence-backed verdicts), `/lookalike` (CT-log lookalike certs + homoglyphs), `/posture` (A–F grade), `/forecast` (domain drop/expiry + TLS countdown + EPSS), `/kev` (CISA known-exploited), `/unfurl` (URL/JWT/epoch decoder), `/watch /unwatch /watchlist` (daily cron), `/archive`. Offline ML in `intel_models/`: **DGA detector 97.6% acc** (ROC-AUC 0.996, 7.8k DGA / 24k legit held-out), **phishing URL classifier 56/56** (50 live URLhaus + 6 benign), **MITRE ATT&CK 697 techniques**, **confusables 6,712 entries**, spaCy NER + IOC regex, Team Cymru ASN [intel_models/README.md]. Tests: 150/150 green + live smoke; optional keys (ABUSECH/ABUSEIPDB/OTX) degrade honestly [~/memory/2026-10-06.md#L451-L454].
- **`/investigate` operator workbench (2026-10-06):** Garrett rejected passive framing — "I want active where I can take over and run." `/investigate <target>` opens a case, auto-detects, runs quick recon, presents inline pivot buttons; taps run real modules, append findings, mark completed pivots ✅; `/case` summarizes; `/close` clears. Locked pivots explain the needed package, never fake. 90/90 tests + live exercise; per-chat in-memory case state [~/memory/2026-10-06.md#L457-L459, #L797-L802].
- **Integration wave (2026-10-06): 89 → 102 commands, nothing removed.** Garrett corrected that Social Analyzer / web-check / awesome-osint were to be INTEGRATED, not linked. (1) **Native username engine** (`osint_username_engine.py`): 84 verified sites (up from 35), native 0–100 confidence (≥70 confirmed / 40–69 possible / <40 absent), metadata extraction, 0/10 random-string confirmations — **clean-room vs AGPL**: Social Analyzer's code never cloned/imported/ported, techniques reimplemented. Powers `/user2` and `/hunt`'s username path. (2) **`/webcheck`** (`osint_webcheck.py`, MIT attribution): 12 reused checks + 14 ported (DNSSEC, CAA, SPF, tech/tracker/WAF detection, mixed content, HSTS), closes with `/posture` A–F grade, runs last on `/hunt`'s domain path. (3) **Gap mining:** ~190 awesome-osint links triaged → 12 genuine gaps in `osint_gapmining.py`: `/phishstats /edgar /onion /aad /waytrace /exif /cipherid /ghemail /rbl /cryptoscam /honey /tauser`. Refused on boundary grounds: FaceCheck.ID/Surfface (face search), CCTV-Telegram/Telegram-Nearby-Map (live person tracking), Cupidcr4wl (adult-platform person search). 316+ tests green, secret scan clean [~/memory/2026-10-06.md#L804-L808], [~/memory/2026-10-07.md#L322-L326].
- **Command trajectory:** 40 → 53 → 64 → 66 → 85 → 89 → 102 — "nothing removed" at each step [~/memory logs]. `/pkg <target>` auto-detects package like `/hunt` (fixed after Garrett's screenshot showed usage text for `/pkg +1 281-660-7639`) [~/memory/2026-10-06.md#L812-L813]. **Timeout fix:** VM proxy to api.telegram.org runs 10–25s during slow stretches — bot's Telegram timeouts raised (20s connect / 40s read-write / 30s pool) after crash-loops on 5s defaults; `supervise.sh` retry helper added; stable since [~/memory/2026-10-06.md#L814].

### 3.3 Triage doctrine + resource board
- **OSINT4ALL triage (2026-10-06):** 101 links curl-checked: 89 ALIVE, 11 DEAD, 1 PARKED, 3 WIRE, 98 SKIP — only archive.is, unfurl, and a Dotspotter attempt survived. Skip reasons incl. fraud/impersonation-adjacent (OTP interception, IMEI generators, fake government IDs, synthetic faces, card-number generators) [~/workspace/telegram-osint-bot/triage-report.md].
- **Triage method:** per-link curl GET, 20s-spaced sequential sweep (egress-proxy throttling), license check via GitHub API, keyless-ness probe, diff vs existing commands; `trust_env=True` for proxy-reachable hosts [gapmine-triage-report.md].
- **Board wiring (all verified live):** WorldCam (public-camera map — Family Shield exposure-audit angle), CIA CREST Reading Room, web-check, Social Analyzer, Morphic, Grabify, dnsglobe, openai/math, REA, Higgsfield, CertGames, Sliver, AdaptixC2, ArtCraft [~/memory/2026-10-06.md#L400, L804-L810], [~/memory/2026-10-07.md], [~/memory/2026-10-08.md], [~/memory/2026-10-09.md]. **Not wired:** PDF Redaction Auditor (unverifiable — no tool by that name publicly exists); Caldera (repo URL unconfirmed); ARTEX (taken closed-source 2026-10-09, dead repo).
- **`watch_profiles.py` + `intel-profile-watch` cron (~08:08 CDT daily)** monitors 4 Instagram OSINT creators (@ariacodez, @marc.kaz, @wassimyounes_, @carterperez.dev) and feeds verified links to the board [~/memory/2026-10-02.md#L666].

### 3.4 Family Shield + standing refusals
- Garrett wants real protection for himself and family (no guns in the house, his choice); defensive-only framing; the active `/investigate` workbench is the product direction [~/memory/2026-10-06.md#L627-L628]. Parked reference docs: `family-shield/family-emergency-protocol.md`, `family-shield/go-dark-playbook.md` (passive docs are NOT the direction) [~/memory/2026-10-06.md#L802].
- **Standing refusals (held throughout):** facial-recognition ID, live non-consensual person tracking/location, camera-following — FaceCheck.ID, CCTV-Telegram, Telegram-Nearby refused on record [gapmine-triage-report.md]. Defensive investigation of identifiers used by a threat actor is legitimate [~/MEMORY.md].

### 3.5 Monetization status / open threads
- Pricing finished and logic-tested (packages + all-access, HMAC invoices, entitlements, renewals cron `intel-pro-renewals` daily 09:08, legacy migration). Goal: `intel-osint-bot-monetization`. **Open:** (1) **STRIPE_PROVIDER_TOKEN hard block** — Garrett connects Stripe in BotFather [~/memory/2026-10-06.md#L454]; (2) breach-provider selection/key (HIBP/Dehashed/IntelX/LeakCheck) — still the one open intel gap [~/memory/2026-10-07.md#L329]; (3) remote landing of the integration wave **UNVERIFIED** on this host (no-local-only rule); (4) Kaggle API key (Garrett's tap) for threat-dataset candidates; (5) owner `/claim` unobserved. **Do NOT conflate:** Garrett's 2026-10-07 words were "i added mira bot to my profile" — this conversation does not establish "mira bot" = @Intel_science_bot [~/memory/2026-10-09.md#L359].
- Scope-creep lesson: unrequested "GSE Fleet HQ" broadcast subsystem quarantined to `attic-fleet-creep/` [~/memory/2026-10-06.md#L369].

---

## 4. OpenDots

### 4.1 What/why
CopilotKit/OpenDots — MIT-licensed, self-hosted alpha template for always-on AI coworkers ("Dots"), reached via web chat, Slack, optional voice. Architecture: React/CopilotKit UI with Spaces and Pages, AG-UI streaming, TanStack AI over an OpenAI-compatible model endpoint, local SQLite for page/metadata state. **Hard requirement:** CopilotKit Intelligence (cloud) for durable conversation threads and managed Slack. **Repo-verified limits:** single-owner orientation, no event/webhook triggers (schedule/poll only), no Dot-to-Dot delegation, no built-in file upload, voice needs OpenAI Realtime (not the configured endpoint), SQLite alone is not a backup since threads live in Intelligence [~/memory/2026-10-04.md:602-604]. Surfaced via @marc.kaz Instagram reel (2026-10-03); on the Intel board. Fork of CopilotKit's "Dots Playbook"; created 2026-09-29 [~/memory/2026-10-04.md:194-197].

**How-to (setup):** `cd ~/workspace/opendots && npm ci && npm run build && npm start`; `.env` with owner credential + telemetry off. Garrett said "Yes" 2026-10-05 → host-native at `127.0.0.1:4310`, HTTP 200 verified [~/memory/2026-10-05.md:563-567]. **Restart caveat (HARD):** no systemd user bus, no crontab on VM → runs via `nohup`; died repeatedly and needed manual restart (2026-10-06, 2026-10-08 after VM swap); no persistent auto-restart exists as of 2026-10-09 [~/memory/2026-10-06.md:141], [~/memory/2026-10-08.md:256]. **Code:** `~/workspace/opendots/` (`.git`, `dist/`, `node_modules`, `data/`, `seed-dots/`, `scripts/`).

### 4.2 The 14 dots / 7 spaces
Built in waves: (1) GSE Signal Desk + Kit Closer (2026-10-05); (2) four adversarial Review Board reviewers (2026-10-06, Garrett's order: "skill-matched adversarial review rather than duplicating paid general agents"); (3) personal dots + Signal Origin Operator; (4) three GSE dots after his **"heavy GSE right now, not signal"** correction (2026-10-06 ~08:05 CDT) [~/memory/2026-10-06.md:93-96, 388-395].
- **GSE Signal Desk** space: GSE Signal Desk (approval-walled morning NFL intel + X thread drafts; never posts).
- **Kit Agency:** Kit Closer (prospect research + approval-walled Day 0/3/7 outreach; never sends).
- **Personal:** Day Brief, Health Tracker, Trading Desk.
- **Revenue:** Signal Origin Operator.
- **Review Board:** Merge Sheriff, Numbers Cop, Voice Judge, Research Auditor.
- **GSE:** Wiring Tracker (38-item backlog state machine RESEARCHED→POLISHED), Learning Loop (post-game grades, calibration), Research Librarian (arXiv/NGS corpus, UNVERIFIED labeling) [~/workspace/opendots/seed-dots/*.json — name/spaceName fields read directly].
- **Reviewer doctrine:** verdicts only — rule, never execute; never merge, post, or run builds [~/memory/2026-10-06.md:787-789].
- **Count caveat:** 13 seed JSONs on disk; "14 dots" is the live-DB count per health checks [~/memory/2026-10-08.md:635, 848].
- **Code:** seed definitions `~/workspace/opendots/seed-dots/` (13 .json); live state `~/workspace/opendots/data/`.

### 4.3 Keys: CopilotKit Intelligence + Experiential Labs model path
- Two separate keys needed: model key + `INTELLIGENCE_API_KEY` (cloud thread gateway) [~/memory/2026-10-06.md:600]. Required flow: `npx copilotkit@latest login` then `npx copilotkit@latest project select` **on Garrett's Windows host** (VM outbound failed on npx login, 2026-10-08) → paste project key into `.env` → restart. **Status:** INTELLIGENCE_API_KEY **LIVE** — Garrett pasted keys 2026-10-08 evening; wired, server restarted clean, "dots on the real runtime", ~180-day expiry (~April 2027) [~/memory/2026-10-09.md:80], [~/memory/2026-10-08.md:259, 337].
- **Experiential Labs (free GLM):** endpoint `https://api.experientiallabs.ai/v1`, model `glm-5.3-flash-abliterated` (1M ctx). Swap script: `~/workspace/opendots/scripts/swap-model.sh [openrouter|experiential|status]` — refuses experiential without `EXPLABS_API_KEY` in `.env`; backs up OpenRouter settings; **restart the server to apply** (script edits config only). Key installed 2026-10-06 ~08:34 (chmod 600), authenticated via live chat-completions call; status confirms Experiential base URL + GLM model [~/memory/2026-10-06.md:468-471, 782-785]. (Note: key was pasted in ordinary chat before storage — rotation prudent [~/memory/2026-10-08.md:486].)
- Computers + voice OFF by design; browser/Slack unconfigured; existing crons kept (OpenDots has no triggers) [~/memory/2026-10-06.md:785], [~/memory/2026-10-07.md:306].

### 4.4 Open threads
Crons intentionally NOT moved to OpenDots; planned daily Merge Sheriff PR sweep not scheduled; Garrett's fleet direction: ops execution routes to Dots/coding agents, Motif usage reserved for orchestration; standing order "keep dots on" [~/memory/2026-10-06.md:96, 789], [~/memory/2026-10-08.md:809]. The "malformed-grep-line bug in swap-model.sh (2026-10-06)" referenced in the task brief could not be found in any log or file on this host — current script reads clean; marked **UNVERIFIED** (likely already fixed).

---

## 5. Reverse Engineering (REA) + Jules Orchestration

### 5.1 REA — reverse-engineering tool
**What:** REA v3.2.1 (`morluto/rea`, MIT; 3,031 stars / 831 commits / 26 releases at 2026-10-05 check) — CLI + MCP workflows for evidence-backed decompilation, behavior analysis, feature recreation. **Does NOT recover original source or auto-clone apps.** Hosts: Linux/macOS, experimental Windows x64 (Ghidra-only); Node 22.19+/24.11+ [~/memory/2026-10-05.md:77]. Surfaced via @marc.kaz and @wassimyounes_ Instagram reels (2026-10-04), verified via instagram-cli [~/memory/2026-10-05.md:199-200]. On the Intel board.

**How-to / findings (verified live 2026-10-05):** `rea` CLI at `/usr/bin/rea` (npm `rea-agents@latest`); skill v23 at `~/.agents/skills/reverse-engineer-anything/` (114 tools); **Ghidra 12.1.4** at `~/workspace/tools/ghidra_12.1.4_PUBLIC` (`GHIDRA_INSTALL_DIR` in `~/.bashrc`); OpenJDK 21. Smoke test passed (`rea analyze /usr/bin/true` → full Ghidra evidence record). Fleet note: `Beexly/agent-bus` outbox `from-motif/REA-live-on-motif-vm-2026-10-05.md`.
- **Hopper demo bridge unreliable (HARD lesson):** Hopper 6.4.2 demo installed (`/opt/hopper/bin/Hopper`) after hopperapp.com 403'd curl (browser UA worked, 35,755,772 bytes, SHA-1 matched) — but every deep op failed `-32000 invalid_request` (demo build restricts the scripting API). **Decision: use `--provider ghidra` for real work.**
- **Ghidra deep path proven:** `rea function /usr/bin/true 0x1019f0 --provider ghidra` returned full `analyze_function` (procedure, pseudocode, assembly, xrefs, evidence_id). Note: addresses must be in Ghidra's rebased space (entry 0x19f0 → 0x1019f0), not raw file offsets.

**⚠️ STATUS — ATTENTION:** as of 2026-10-09, `rea` CLI is **NOT installed** on this host (`/usr/bin/rea` missing, not on PATH — VM swap likely wiped it). Ghidra 12.1.4 extract and skill v23 still present. Reinstall: `npx --yes rea-agents@latest setup` [verified on this host 2026-10-09].

### 5.2 Jules — orchestration lane
**What:** Google's async coding agent (jules.google.com): clones a connected GitHub repo into its own Google VM, plans, codes, tests, opens a PR. Garrett's idea (2026-10-05): Motif orchestrates — decomposes work, writes bounded tasks, launches/monitors sessions, reviews plans/PRs. Garrett holds the subscription; standing order: never idles while backlog exists [~/memory/2026-10-05.md:324-326, 336-338].

**How-to (connection):** via Secure Vault connector `custom.jules` (X-Goog-Api-Key header through authd surrogate; credential never in files). Skill at `~/workspace/skills/jules/` with `bin/jules-api` (Python CLI: `METHOD /v1alpha/path [json-body]`, restricted to jules.googleapis.com). Verified live 2026-10-05 by listing sessions [~/workspace/skills/jules/SKILL.md].
- **Loop:** bounded task → session (fleet-standards.md + reasoning-doctrine.md prepended verbatim to every prompt) → plan review → PR review (Jules PR = draft until approved) → merge.
- **Endpoints verified beyond skill docs:** `POST /v1alpha/sessions/{id}:sendMessage {"prompt": ...}` (steers live sessions, returns `{}`); `POST /v1alpha/sessions/{id}:approvePlan {}`; `DELETE /v1alpha/sessions/{id}` (undocumented, works — dead FAILED sessions only, never ones with live PRs or landed records) [~/AGENTS.md].
- **Budget rule:** never fire speculatively — sessions cost his subscription tasks; each needs his explicit task or a standing directive. `gse-intel-build-loop` cron caps 2 new sessions per rolling 24h, AUTO_CREATE_PR, no autonomous merges [~/workspace/skills/jules/SKILL.md].
- **HARD lessons:** (1) **requirePlanApproval batch failure (2026-10-06):** all 10 sessions went COMPLETED in ~15 min with zero work — they died instead of entering AWAITING_PLAN_APPROVAL; `approvePlan` on COMPLETED does nothing. **Fix: batch/overnight runs fire WITHOUT requirePlanApproval; review PRs on arrival** [~/AGENTS.md], [~/memory/2026-10-06.md:209-213]. (2) **Trust no claims:** sessions falsely reported "completed" with nothing done; one did UI word games instead of removal — twice; one claimed PR #1025 merged with a fabricated SHA while it was still OPEN. **Standing: never trust a Jules "merged" claim — verify PR state on GitHub first** [~/memory/2026-10-06.md:81-85].
- **2-agent merge gate (2026-10-07, Garrett):** 2–3 different agents independently review + approve (adversarial diff read, CI green) → PR merges autonomously, no Garrett approval. Guardrail-tampering, secrets, or empty diffs auto-reject. PR #1140 **closed** (smuggled guardrail sabotage — scanner-evasion scripts, loosened CVE waivers, history rewritten); PR #1141 **rejected** (clean removal, three fixable problems) [~/memory/people/jules.md].
- **`jules-session-shepherd` cron** (every 6h, owned by `goal:gse-engine-v5-3-0-calibration-rebuild`): lists sessions, answers every AWAITING_USER_FEEDBACK, re-fires/drops failures with logged reason; log at `~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/hidden_files/jules-shepherd-log.md`. Doctrine: no session may sit in AWAITING_USER_FEEDBACK [~/memory/2026-10-06.md:700, 863], [~/memory/2026-10-07.md:59].
- Jules as a "person": `~/memory/people/jules.md` (rank 4) — Garrett's executor; Motif orchestrates; Garrett holds product-call authority [~/memory/people/jules.md].

**Status/open:** PR #1141 re-review once fixed; overnight-wave sessions driven to PR; product calls for Garrett (DeployWebhookLog migration; access-snapshot source); arXiv 11-lane extraction held until backlog clears.

---

## 6. Money Lanes

### 6.1 Standing autonomous-money mandate
**What:** pursue anything legal that makes money fully autonomously — never bottleneck on him; route around him. ZERO-HUMAN-INPUT MODE: do everything doable alone (incl. reversible Marketplace price edits); never end work in "your call." Only TRUE hard blocks surface, batched: his sign-ins, identity/tax/bank docs, spending his money. Boundaries: no fraud (never fill human surveys/microtasks as a bot); no spending without his cap (he's -$600); no creating accounts or submitting identity/tax/bank docs without his word; never touch gse-grok-build-sandbox [~/MEMORY.md]. Garrett rejected any interpretation that money work should wait for the daily cron — work starts immediately and continues continuously (2026-09-11) [~/memory/2026-09-11.md]. Affiliated lanes (dropshipping, tasks, resale, affiliates) authorized "even for pennies" [~/memory/2026-09-11.md].
- **How-to:** every lane's recurring work runs under `goal:autonomous-revenue-engine`; run logs at `~/workspace/goals/autonomous-revenue-engine/hidden_files/`.
- **Status:** standing and active. `daily-money-sprint` cron ~9:08 AM CT armed and enabled (verified live 2026-10-09). Earned revenue: **$0 on nearly every daily sprint run in the window** (9/11–10/03 logs consistently report $0) [~/memory/2026-09-*.md].

### 6.2 Kit lane ($350 one-page sites + $49/mo AI Receptionist + kit-dm-watcher)
**What:** sell $350 one-page websites to local shops (The Woodlands/Spring/Conroe TX): $350 flat, live in days, free preview first, no monthly fees [~/workspace/skills/kit-outreach/SKILL.md]. Sales page LIVE at `autonomous-revenue-engine-eight.vercel.app/kit/` (Garrett-approved 2026-09-11) with offer/FAQ, printable walk-in flyer with QR, DM-KIT-on-Instagram CTA [~/MEMORY.md].
- **TASK-012 "AI Receptionist" upsell:** $49/mo ($490/yr), first month free with a new $350 Kit site; KB-only answers (never invents prices/hours/policies/licensed advice), lead capture, escalates unknowns; NVIDIA NIM Llama 3.1 8B planned, degrades to lead form on quota exhaustion. Spec on agent bus (`inbox/from-motif/TASK-012-kit-ai-receptionist.md`) — **build status UNVERIFIED**, build-or-drop decision owed [~/MEMORY.md]. Client-facing name is "AI Receptionist," not "chatbot"; $0 architecture (shadow-DOM widget, Vercel serverless, Gemma 4 via Gemini free tier, Supabase, Resend); spec complete 9/11. Hard block: free Google AI Studio Gemini API credential needed to go live [~/memory/2026-09-11.md].
- **kit-dm-watcher:** every-15-min cron on @gbeexly (only messages-connected IG account); checks new Kit inquiries, delivers copy-ready replies in chat, **never sends DMs itself**; silent when nothing new. Instagram @gbeexly access verified 2026-09-10; watcher passed 10 classification checks, baseline-marked 400 existing messages; Garrett chose draft-replies over auto-replies; cron enabled 9/11 [~/memory/2026-09-10.md], [~/memory/2026-09-11.md]. Ran clean with **zero new Kit DM inquiries on every check** throughout the window [~/memory/2026-10-03.md].
- **How-to (outreach):** targeting = lawn care, pool service, HVAC, roofing, mobile detailing, remodeling; good signals = no standalone website, owner-operator, active reviews <90 days. Sequence: Day 0 first touch (IG DM/email/walk-in, exact scripts in skill), Day 3 follow-up only if no reply, Day 7 breakup then mark `lost` forever. Preview-first close: copy base template, swap business details, keep red "SAMPLE PREVIEW — NOT A REAL BUSINESS" watermark until payment; close = Garrett collects $350 (his payment flow), then deploy. Sending ANYTHING needs Garrett's explicit per-batch approval; drafting is free. Tracking: `kit-pack/LEADS.md`, stages new→touched→preview_sent→followup_1→followup_2→won|lost|dead [~/workspace/skills/kit-outreach/SKILL.md].
- **Code:** skill `~/workspace/skills/kit-outreach/SKILL.md`; assets `~/workspace/vendor/autonomous-revenue-engine/kit-pack/` (previews for 5 trades, TARGETS.md — 12 verified shops, ONLINE_ADS.md, POSTING_PLAN.md, SALES_PAGE.html); cron verified live at `~/workspace/goals/autonomous-revenue-engine/crons/minutely/kit-dm-watcher__interval@15m.md`.
- **Status/open:** cron armed. Still owed: Instagram bio link edit, Craigslist/Nextdoor posts (copy staged), flyer printing + walk-ins [~/MEMORY.md].

### 6.3 Affiliate lane (Amazon Associates first)
**What:** battle plan completed 2026-09-09: Amazon Associates first (~3% on sports gear, $10 threshold, gift-card payouts so his bank account stays untouched); FanDuel/DraftKings (25–40% rev share) deferred — they manually approve and ignore small publishers. Link slots: the $19 workbook's toolkit chapter, a card-supplies resources page, every clip description [~/memory/2026-09-09.md]. Standing order 9/11: work the affiliate link into every opportunity [~/memory/2026-09-11.md].
- **Key findings:** Garrett's 9/10 screenshot showed the Associates account/dashboard exists, but onboarding incomplete, no earnings, tracking ID unverified; a 19:00 browser attempt hit the sign-in page with no saved session — blocked on Garrett manually signing in [~/memory/2026-09-10.md]. **Correction 9/16:** the claimed `edgegear-20` one-paste replacer does NOT exist; the only verified placeholder is `{{AMAZON_TRACKING_ID}}` in exactly two files, and the built 36-page workbook PDF has dead placeholder links [~/memory/2026-09-16.md]. Placement map: `~/workspace/vendor/autonomous-revenue-engine/ops/affiliate-map.md` [~/memory/2026-09-11.md].
- **Status/open:** still blocked on Garrett (sign-in → tracking ID). No affiliate earnings in window.

### 6.4 SignPreview + Vow & Post signage plays
**What (Garrett-approved 2026-09-11):** (1) "SignPreview" — white-label sign mockup/preview generator for local sign shops + lead-arbitrage variant (free consumer tool captures leads; sell leads/designs to shops); (2) wedding signage printables $29–79 ("Vow & Post" brand). **HARD BRANDING RULE:** never "AI wedding signs" — sell the craft, tech stays invisible [~/MEMORY.md]. One shared render engine; loop FIND → RUN → RENDER → SHOW → SELL → Kit cross-sell (`SIGN_SYSTEM.md`) [~/memory/2026-09-11.md].
- **Key findings:** SignPreview v1 built 9/11, live at `https://autonomous-revenue-engine-eight.vercel.app/signpreview.html` (verified HTTP 200); business name/tagline + sign type + style in, render out; $150 design-package CTA + B2B shop and wedding paths [~/memory/2026-09-11.md]. **Critical QA failure fixed in v2:** Pollinations rendered the requested name correctly in 0 of 4 tests + watermarked despite nologo=true → Motif replaced direct AI lettering with **deterministic browser-canvas composite** (Pollinations = text-free scene only; sign panel + real style-matched fonts render the exact name; watermark cropped) — commit `e8eeb1a`, verified live 9/11 [~/memory/2026-09-11.md]. **Lead-capture fake-success P0:** submits failed silently (placeholder Supabase creds) while showing "Thanks!" — patched 9/13 by Garrett's "Patch so it doesn't get lost. Do it autonomously." order (commit `3616fc5`, honest error + retry + IG DM fallback); real lead capture still hard-blocked on Garrett creating a Supabase project + leads table and pasting URL/anon key into `docs/js/config.js` [~/memory/2026-09-13.md].
- **Vow & Post:** 9/26 sprint built the "Midnight" Suite v2 sellable digital product (12 signs black/gold, 8x10 + 5x7 PDFs, 5.76 MB buyer ZIP; Etsy listing kit: $24/$18.99 titles/tags, Duo Bundle $39 = 24 signs) [~/memory/2026-09-26.md]. 9/29: slot-10 styled table mockups QC'd (4 colorways), photo set 10/10 complete (33 PNGs). "Etsy launch needs ONLY Garrett's OAuth + upload" [~/memory/2026-09-29.md]. Grok's SuperGrok App Builder round-1 (screenshots 9/14, Grok assertions not verified ground truth): welcome $49 / seating $79 / menu $29 / numbers $39, print proofs, Etsy titles/tags [~/memory/2026-09-14.md].
- **Code:** `~/workspace/vendor/autonomous-revenue-engine/SIGN_SYSTEM.md` (loop + $0 stack + paid-infrastructure-only-after-lane-pays-twice rule); live `signpreview.html`; `ops/leverage-map.md`.
- **Status/open:** SignPreview v2 live, renderer solid; real lead capture awaits Garrett's Supabase project (hard block). Vow & Post QC'd and Etsy-ready; launch awaits Garrett's ~10-min Etsy + Printify OAuth (standing blocker since 9/11).

### 6.5 Recordly
**What:** open-source (AGPL-3.0) desktop recorder/editor for polished walkthroughs/product demos: auto zoom suggestions, cursor smoothing/effects, styled frames, timeline edits, annotations, captions, MP4/GIF export [~/memory/2026-09-11.md].
- **Findings:** evaluated/acquired 2026-09-11 (repo webadderallorg/Recordly). v1.3.0 Linux x64 AppImage (~226 MB) at `~/workspace/tools/recordly/Recordly.AppImage`, made executable. Smoke-tested under Xvfb: launched, 10 processes alive; AppImage AppRun wrapper unreliable with args — bypass and invoke the extracted `squashfs-root/recordly` binary directly; GPU init errors in headless session are nonfatal noise [~/memory/2026-09-11.md]. **Recording/edit/export itself NOT proven end-to-end** — UNVERIFIED [~/memory/2026-09-11.md].

### 6.6 Unified system mandate
Issued 2026-09-11: tie free-for.dev (free-tier directory, standing resource), OSINT client-finding (his start.me OSINT page `GEQXv7/osint-us`), Recordly, SignPreview, Vow & Post, and Kit into one coherent machine. Loop in `Beexly/autonomous-revenue-engine/SIGN_SYSTEM.md`: FIND → RUN → RENDER → SHOW → SELL → Kit cross-sell. Deliberate $0 stack: Vercel, Pollinations, Supabase, Resend, Playwright, Recordly; paid infrastructure only after its lane has paid for itself twice [~/memory/2026-09-11.md]. Fulfillment bottleneck identified: a $150 sign package must be deliverable from presets in under 30 minutes before outreach scales [~/memory/2026-09-11.md]. **Status:** standing; interconnected loop not evidenced as operational in the window.

### 6.7 Lumera (parked) + Etsy/Printify POD lane
- **Lumera:** Medusa/Next.js commerce platform (Beexly/Clouds-bruh) with Stripe checkout and Printify/Printful/CJ paths [~/memory/2026-09-09.md]. **Parked:** burns ~$75/mo, no proven products/traffic/sales; read-only audit 9/11: "PARK because Lumera has no practical free hosted path, ~$60–75/month entry level." Garrett challenged ("why not build out Lumera completely and resell from Alibaba"); answered: sequencing, not idea — violates the pay-for-itself-twice rule; prove the lane via Etsy/Printify first, Lumera after it pays [~/memory/2026-09-11.md]. Security: a real PostgreSQL password found committed in `Clouds-bruh/docker-compose.yml` — must be rotated before any redeploy (value not copied) [~/memory/2026-09-11.md]. Adopted direction: Next.js storefront on Vercel + Stripe Checkout via serverless + n8n/Supabase order pipeline [~/memory/2026-09-11.md].
- **Etsy/Printify POD:** lean validation path (trademark-safe originals). Standing blocker since 9/11: not live, blocked on Garrett's ~10-min Etsy + Printify OAuth [~/memory/2026-09-11.md]. POD trend research runs weekly Mondays 10:00 AM; 10/8 signals: grading is the hobby's 2026 growth story, Pokémon/TCG structurally overtaking sports cards (+97% vs −12%), text-based funny tees #1 per Printify, bootleg-90s/retro varsity dominate Etsy [~/memory/2026-10-08.md]. 13 POD PNGs (4500×5400/300DPI/RGBA) verified present 9/16; 10/8: publish-ready offer — full Etsy descriptions/titles/tags for T14–T18 ($24.99 each, Bella+Canvas 3001 black) at `pod-pack/publish-ready/listings-T14-T18.md` [~/memory/2026-10-08.md]. Dropshipping product-intel spec queued as TASK-011 for Hermes (n8n pipeline over AliExpress official API, 1688-cli, Temu Partner API) [~/memory/2026-09-11.md].
- **Status:** ready-but-unlaunched; launch needs ONLY Garrett's OAuth + upload.

### 6.8 Odds API + Kalshi
- **The Odds API:** Garrett already has a paid account (baxley.garrett@gmail.com, since 2026-08-22): **20K credits/mo, $30/mo** — no new signup needed; credential viewed only to confirm, never stored. Use for backfills; he'll buy another month if needed [~/memory/2026-09-18.md], [~/MEMORY.md]. Repo-side: comprehensively wired in packages/data-ingestion (typed GET-only client, key resolver, credit governor/ledger, circuit breaker, failover); live key test + secure deploy config pending [~/memory/2026-09-18.md]. (Note: "oddspapi.io" among his 12 API services is a different product — OddsPapi, 250 req/mo free [~/memory/2026-09-18.md].)
- **Kalshi:** market data fully free with no key (live prices, order books, trade history) — verified live 9/18 [~/memory/2026-09-18.md]. Two MIT bot chassis queued for **PAPER-TRADING ONLY**: ryanfrigo/kalshi-ai-trading-bot (602 stars, strongest chassis); OctagonAI/kalshi-trading-bot-cli (396 stars) alternate. Live-money wiring prohibited without Garrett's explicit authorization [~/memory/2026-09-30.md]. Prediction-market research stack complete (free live APIs, backfill pipeline, forecasting methods, Kelly sizing, documented failure baseline) but unexecuted as of 9/30 [~/memory/2026-09-30.md]. ⚠️ The agent-bus brief `kalshi-and-odds-api-io-evaluation` contained five live cleartext keys — **still need rotating** per 2026-10-03 secret-scrub rule [~/AGENTS.md].

### 6.9 Stripe / payments status
No live payment collection exists anywhere yet. Stripe on the Intel Telegram bot is the real hard block (BotFather + `STRIPE_PROVIDER_TOKEN`) [~/memory/2026-10-02.md]. Sports repo has live Stripe integration but live-mode status unverified [~/memory/2026-09-09.md]. Kit close = Garrett collects $350 through "his payment flow" (manual, undefined) [~/workspace/skills/kit-outreach/SKILL.md]. **Status:** no payment path operational; every money lane blocked on Garrett's Stripe actions.

---

## 7. Social / X Operations

### 7.1 @GalaxySportsHQ + full-operation posting dial
Garrett's X account is **@GalaxySportsHQ** ("Galaxy Sports Edge"), confirmed by his screenshot 2026-09-10 [~/MEMORY.md]. Posting dial (2026-09-10): **FULL OPERATION** for NFL coverage — transformative fair-use edits (seconds-long, telestrated, commentary-led; never standalone rips/compilations) [~/MEMORY.md]. **HARD standing rule (2026-09-15):** NEVER AI-slideshow/motion-graphics as substitute for real footage; sports videos use REAL game footage — 2–4s clips, commentary dominant; if real footage cannot be secured, say so and stop. Legal backdrop verified 9/15: *Richardson v. Townsquare Media* (2d Cir. Apr. 23, 2026) — points toward using only a PORTION of a video; NFL is the most aggressive league enforcer, NBA/MLB more tolerant [~/AGENTS.md]. Kill switch anytime [~/MEMORY.md].
- Sign-in saga: 9/10 the vault's saved X login was actually the Signal Origin account — Garrett signed in himself ~17:04 CDT 9/10 and posting resumed [~/memory/2026-09-10.md].
- X API research (9/10): X retired free API tier ~Feb 2026, pay-per-use; text post ≈ $0.015 (~$4.50/mo at 10 posts/day), URL post $0.20; no dev account/credits created — spend unapproved [~/memory/2026-09-10.md].
- X Premium placement: 9/10 correction said Premium active on @GalaxySportsHQ; **9/22 correction (latest): Premium is on his second xAI account under signal.origin.hq@gmail.com, NOT on @GalaxySportsHQ** — treat 9/22 as current; Premium does NOT include API access [~/MEMORY.md], [~/memory/2026-09-10.md]. (Premium Plus $20/mo renews ~Sept 24; 50%-off promo may end → $40/mo [~/memory/2026-09-19.md].)
- Primary posting path = browser-based via Garrett's logged-in X session; fallback = X API once credits approved; steps in `~/workspace/skills/x-poster/references/posting-paths.md`.

### 7.2 X voice doctrine (Garrett-human, not optimized)
2026-10-04 Garrett called the posts "good but boring." Voice rebuilt from studying his Facebook 2020–2026 + the analysts he shared. Durable brief: `~/workspace/vendor/autonomous-revenue-engine/ops/x-voice/voice-brief-2026-10-04.md` [~/memory/2026-10-04.md].
- **Recipe:** talk TO the reader ("Okay, Facebook. I need you for something important."); one vivid concrete image per post (never adjectives doing nouns' work); short declarative bursts / staccato triplets ("Structure matters. Leadership matters. Affection matters."); dry understatement; blunt one-liners; rhetorical questions that answer themselves; honest stakes stated plainly; player-first sports lens (he played world softball tournaments).
- **BANS:** em dash; **"WE DETECT. YOU DECIDE." slogan — SUSPENDED by Garrett 2026-10-04** ("sick of it... overkilled, not marketable") — website background only, never in posts; "intelligence"/"sports intelligence"/"sports galaxy" branding; financial-advice framing; cursing; AI-voice giveaways (delve, unlock, game-changer, "let that sink in," "nobody is talking about"); hashtags in replies; punching down. Professional floor: numbers stay, work visible [voice brief], [~/MEMORY.md].
- X engagement mandate (9/10): mild controversy OK when numbers disagree with other analysts; no cheap shots [~/MEMORY.md]. Results posts in units, never dollars ($5 = 1u) [~/MEMORY.md].
- Earlier voice mining: `~/workspace/voice/garrett-voice-brief.md` (2026-09-11); sports-X register `ops/x-voice/VOICE.md` [~/memory/2026-09-11.md].
- **Open:** X-follows study still owed to a browser-capable agent (could not scroll his follows in that lane) [voice brief].

### 7.3 X-engagement feedback loop + weekly review
"Post less, measure more" (Garrett 2026-10-04). Baseline pull 2026-10-04 (20 newest posts, logged-in session) at `ops/x-engagement/LOG-2026-10-04-analytics.md`: **winners** = single-stat nuggets as standalone posts (Parker Washington 588 views), contrarian consensus-counting (187 views, the set's ONLY repost, 3 replies), news with an edge attached, pre-kick cards (225 in 3h — best velocity). **Flat** = ALL-CAPS announcements ("THE WAR ROOM IS OPEN" 37), muse.ai link-card DFS lab dumps (15–42), lab jargon. Adjustments (Garrett 10/4): fewer announcements; more single-nugget stats; keep pre-kick card format layered with the new human voice; write for replies — one debatable claim per post (replies are the scarcest resource); images don't correlate with views, text carries [analytics log]. Weekly cron `x-engagement-weekly-review` ~Saturday 8:08 PM CT (first run Sat 2026-10-10): pulls week's metrics, normalizes by post age, saves dated log, delivers adjustments [~/memory/2026-10-04.md]. Armed and enabled (verified live 2026-10-09).

### 7.4 Reply monitor + x-poster pipeline
**Reply monitor:** drafts paste-ready X replies in account voice; **NOTHING posts without Garrett's approval.** Built 2026-09-10: scans high-engagement posts (Schefter, RapSheet, House of Highlights, teams, viral posts), drafts replies [~/memory/2026-09-10.md].
**x-poster pipeline** (`~/workspace/skills/x-poster/SKILL.md`): voice-locked drafts → **qi-check Hold ≥9.2 gate** (scorer at `~/workspace/vendor/autonomous-revenue-engine/apps/qi-check/lib/score.js`; soft rewrite 7.0–9.19; hard kill <7.0) → approve-desk → human approval (Garrett stamps Chicago slots 8:00/12:30/17:00 or replies APPROVE; silence ≠ approval) → browser or X-API post → ACTION_LOG. Rules: never posts below Hold; never posts without explicit human APPROVE; GSE separation (URLs OK as CTAs, math never); write for Phoenix weights (copy-link ~20×, reply 5–20×, quote 5× — likes not the objective); originals over replies for distribution; post failures log → retry once → escalate (never blind-retry). Drafts at `~/workspace/vendor/autonomous-revenue-engine/ops/x-drafts/<XP-YYYYMMDD-NN>.md`.

### 7.5 Signal Origin (@SignaL_OriginHQ via Grok) — AI-slop lane, sports excluded
Garrett's separate non-sports account @SignaL_OriginHQ (login signal.origin.hq@gmail.com), run with Grok as his AI counterpart; sports content excluded. Two Grok recurring automations identified 9/9 via noreply@x.ai emails ("GSE Signal Desk daily factory," "signal-origin-overnight-ops") — but Garrett had SuperGrok PAUSE + ARCHIVE all three scheduled Grok automations ~9/13; automation list empty, nothing fires on its own [~/memory/2026-09-09.md], [~/memory/2026-09-13.md]. Hard constraints: he remains primary author/approval gate for public voice, real spend, high-stakes launches; anti-AI-slop gates incl. Hold ≥9.2; dry/sarcastic/dark voice with empathy [~/memory/2026-09-09.md]. Standing: "Signal Origin via Grok — AI-slop/original-content commentary lane, sports excluded; Motif stays in the sports lane unless Garrett asks otherwise" [~/MEMORY.md]. **Status:** all Grok automations paused/archived — reactivation is Garrett's call.

### 7.6 TikTok / YouTube / Instagram
- **TikTok home CONFIRMED 2026-09-17 by Garrett's screenshot: @galaxy.sports.edge** (brand-new; 0/0/0). @signal.origin is NOT the GSE home — the 9/15 Kelce clip went to the wrong account [~/memory/2026-09-17.md]. Both TikTok and YouTube tied to hq@galaxysportsedge.com [~/memory/2026-09-15.md]. First posting package prepared 9/15 (`ops/tiktok-youtube-drafts/FIRST-POST-20260915.md`, real-footage Kelce video + thumbnail). Publishing blocked: Google sign-in rejected the Secure Vault password for hq@galaxysportsedge.com; nothing uploaded; login/handle verification still pending [~/memory/2026-09-15.md], [~/memory/2026-09-17.md].
- YouTube sweeps run Wed + Fri 7:30 PM feeding Saturday's aggregate email [~/MEMORY.md].
- **Instagram Reel (parked):** Bills -5.5 Reel + caption saved and ready; Instagram rejected the saved galaxysportsnetwork credentials twice (third attempt also rejected); Garrett explicitly PARKED it — "skip it for now" [~/memory/2026-09-17.md]. @gbeexly content/DM connectors work [~/memory/2026-09-10.md]; the @galaxysportsnetwork login is the blocker.
- **Status/open:** TikTok login unverified; nothing posted to @galaxy.sports.edge. Awaiting working Google session (Garrett tap if password/2FA needed).

---

## 8. Infra & Keys

### 8.1 Neon Postgres
**What:** serverless Postgres for the GSE engine/web DB. Projects: `gse-postgres` (production, `aws-us-east-1`, database `neondb`, ~7.4 GB) and `sports-db` (tiny idle secondary, ~31 MB). As of 2026-10-01, gse-postgres had ~41 branches: `main` + 2 archived + 38 PR-preview branches [~/memory/2026-10-01.md:64, 320-323]. Garrett's CLV history: `odds` (8.08M rows), `odds_line_snapshots` (2.21M), `opening_lines` (4,923) [~/memory/2026-09-28.md:168].
- **2026-09-13:** Garrett gave Motif a Neon Postgres owner connection string; authenticated DB access established; credential used transiently, never stored. Motif pulls actual engine predictions directly for pre-public verification [~/memory/2026-09-13.md:307-308]. 2026-09-27 direct read corrected Garrett's belief — engine publishes only moneyline/spread/total picks; no prop or TD-scorer pipeline exists [~/memory/2026-09-27.md:249].
- **Branch-only testing (2026-09-28, HARD):** Neon CLI v6.2.4 on VM; root `neon.ts` with 7-day TTL for new non-default branches; Sports AGENTS.md rule: writers/migrations/backfills/calibration jobs use throwaway copy-on-write branches, never default prod. Pushed to `Beexly/Sports@motif/orchestration-v4-2026-09-28` (`b4b9bdd`) [~/memory/2026-09-28.md:340-343]. TTL policy committed but not live: `NEON_API_KEY` absent on VM — `neon link`/`neon deploy` blocked on Garrett [~/memory/2026-09-28.md:343].
- **Cost findings (2026-09-28 audit):** Launch plan; both default endpoints 0.25–8 CU with scale-to-zero disabled; consumption 2026-09-21→28: 116.1 CU-hours (~435/mo run rate); vercel.json's 23 scheduled jobs touch DB ~every 2 min, preventing scale-to-zero [~/memory/2026-09-28.md:345, 390-391]. Rules recorded: pooled `-pooler` strings for Vercel app routes, direct for migrations/pg_dump; autoscaling max 0.5–1 CU; PITR 1 day; delete idle branches [~/memory/2026-09-28.md:346]. Use **Neon-Managed** Vercel integration only (never Vercel-Managed "Native"); avoid continuous logical replication; `pg_cron` 1.6 validated on throwaway branch then enabled on production `neondb` (no prod cron scheduled) [~/memory/2026-09-28.md:362-366].
- **Password-rotation incident:** 2026-09-25 `neondb_owner` password leaked to the public repo (~5 hours — treat as compromised) [~/memory/2026-10-01.md:33]. Minis verified it still recoverable from git history — Garrett's two-minute console rotation was the only fix; completed 2026-10-08 along with all four Vercel DB vars (DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, DIRECT_URL) [~/memory/2026-09-28.md:30], [~/memory/2026-10-08.md:659, 673-677].
- **Migration-ledger drift (2026-10-08, OPEN):** `sports-web` (`prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`) Oct 3 READY deploy still serving; every later deploy errored. Root causes: rotated password not yet in Vercel env (fixed), then migration-history drift — 53 historical migrations squashed into `20260101000000_baseline` while production `_prisma_migrations` still has old May 2026 entries; `20261006120000_add_ledger_chain_entries` additive and pending. Runbook warns **not to redeploy between repairing DIRECT_URL and reconciling the ledger** [~/memory/2026-10-08.md:676, 808]. Reconcile task sits on agent-bus (commit `f42c83c`); lease held by orca. **/board + /picks deploy blocked; do NOT redeploy until ledger reconciled** [~/memory/2026-10-08.md:808, 827].
- **Code:** root `neon.ts` in Sports repo; runbook `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`; Claude's sandbox `lib/neon-ai.ts` commits `b45b81d2e`/`41580508e` (feat/neon-ai-gateway branch, local, unpushed).

### 8.2 Vercel
Kit sales page LIVE and Garrett-approved since 2026-09-11 at `https://autonomous-revenue-engine-eight.vercel.app/kit/` (HTTP 200, 0 TODO placeholders) with flyer/QR → DM "KIT" @gbeexly [~/memory/2026-09-11.md:104, 109]. Same deployment hosts SignPreview v1 (verified HTTP 200) [~/memory/2026-09-11.md:228-230]. `sports-web` Oct 3 READY deploy still serving [~/memory/2026-10-08.md:659].
- 2026-10-05: Garrett ordered cutting the **$178 Vercel bill** ("Vercel cost surgery"). Audit: disable agent-branch previews, ISR/caching for public surfaces, lower Fluid memory/duration limits for I/O crons; preview deploys the largest unbounded spend risk (~200 wasted build minutes per 50 failed deploys; worst-case $269/30d); 23 scheduled jobs in vercel.json [~/memory/2026-09-28.md:367-368, 388].
- **Open:** Vercel spend budget + alerts (default on-demand budget $200) still a founder tap owed; AI Gateway pilot approval owed [~/memory/2026-09-28.md:349, 369]. fix-stalled-signals-cron and reconcile-migration-ledger need founder's hands in Vercel dashboard (cron list, deploy health, CRON_SECRET) [~/memory/2026-10-08.md:827].

### 8.3 HuggingFace
Garrett's HF account `Beexly` (org created); HF token minted 2026-09-28 → unlocked bge-m3/Qwen3 embeddings, Beexly org, private dataset repos [~/MEMORY.md:52]. 2026-09-28 audit: **no HF integration wired into GSE code** — no `transformers`/`huggingface_hub` imports; engine 100% hand-rolled TypeScript. Report: `docs/research/2026-09-28/hf-gse-inventory.md` (commit `b0ed1a3`) [~/memory/2026-09-28.md:291-292, 331].
- 2026-09-29: HF Inference Providers billing-blocked at **account level** (both tokens 403 identically, dashboard $0.00 spent — documented HF account-state bug; support ticket is the fix). bge-m3 runs locally on CPU at zero cost — embeddings worked anyway [~/memory/2026-09-29.md:46, 49].
- 2026-10-02: HF emailed — prepaid credits depleted, 9 Spaces paused. **Correction same day:** Garrett has a fresh subscription; live `whoami-v2` verified Beexly `isPro: true`, `canPay: true`, period end ~2026-11-01 [~/memory/2026-10-02.md:46, 796].
- Spaces: `Beexly/studio-chat` (Qwen2.5-72B, brain funnel contract pass), `Beexly/mimo-brain-engine` (MiMo-V2.6 9B 4-bit; verdict: use Qwen2.5-72B as brain today), `Beexly/gse-watch-pipeline` (autoscale-managed) [~/memory/2026-10-02.md:191, 314].
- **How-to:** skill `~/workspace/skills/huggingface/SKILL.md`, CLI `bin/hf-api` (surrogate auth via `custom.huggingface`; never raw tokens). Useful: `GET /api/whoami-v2`, `GET /api/spaces?author=<user>`, chat completions via `--host router.huggingface.co`.
- **Open:** HF Pro active (~2026-11-01 renewal); gated models (TimesFM, Lag-Llama) need Garrett's terms-acceptance tap [~/memory/2026-09-28.md:331].

### 8.4 NVIDIA
2026-10-02: Garrett pasted multiple NVIDIA API keys (values not stored); `custom.nvidia` Secure Vault connector created for `ai.api.nvidia.com` + `integrate.api.nvidia.com`, verified live [~/memory/2026-10-02.md:862-863]. NVIDIA catalog login blocked — account uses passkey auth, remote browser can't complete device ceremony; Garrett deferred [~/memory/2026-10-02.md:110].
- **Kumo relational DL pilot (2026-10-02):** 272 games of 2024 nflverse as context, rolling as-of-fenced team-form features; predicted 2025 Week 1: **7/8 correct** (miss: CAR@JAX) [~/memory/2026-10-02.md:864-866].
- **Kumo full backtest:** train 2024 (272 games) → predict all 2025 (272 games), 13 pregame features: **186/272 = 68.4%**, calibration clean (0.25→33%, 0.50→58%, 0.75→68%, 1.00→94%). Market-spread ablation: 165/272 = 60.7% (spread worth ~8 pts; ex-market signal beats 54.9% base). Walk-forward: 2022→2023 64.7%, 2023→2024 69.9% — not a one-season fluke [~/memory/2026-10-02.md:890], [~/memory/2026-10-03.md:181-182]. **Kumo stays shadow-only:** coding agent's four-part admission test (shuffled-time placebo, logit-pool coefficient vs market, disjoint threshold fold, fixed line offset) not completed [~/memory/2026-10-02.md:911].
- **GSE-RL env Phase 2:** `~/workspace/gse-rl/env/episode_builder.py` + `reward.py` → **1,087 verl-format episodes** (271 for 2022, 272 each 2023–2025), as-of fenced, SHA-derived vintage identifiers; episode prompts thin (no QB/injuries/OL/coaching); reward v2 = Brier skill vs frozen P0=0.5485, 8 unit tests pass. Spec + code pushed to `Beexly/agent-bus@main` (commit `ce7944f`); verl harness NOT wired — **needs Brev GPUs (Garrett's call)** [~/memory/2026-10-02.md:886-890]. mimo-verl: XiaomiMiMo's verl fork cloned to `~/workspace/mimo-verl` [~/memory/2026-10-02.md:799].
- **Code:** skill `~/workspace/skills/nvidia/SKILL.md`, CLI `bin/nvidia-api` (model-list/chat/kumo); `~/workspace/build-kumo-pilot.py`, `~/workspace/build-kumo-backtest.py`; `~/workspace/gse-rl/env/`.
- **Open:** catalog login (passkey); Brev GPU provisioning = Garrett's money-and-click decision [~/memory/2026-10-03.md:27].

### 8.5 SiriusXM intel pipeline
Channel 87 (Fantasy Sports Radio) intel pipeline — nightly pulls + Sunday live listening, feeding injury/news, DFS takes, prop angles, picks, and contextual analyst reads into the GSE corpus. Garrett order 2026-10-06; jobs: `siriusxm-nightly-pull` (daily 11:45 PM CT) and `siriusxm-sunday-live` (Sundays 5:00 AM–12:00 PM CT; first run Oct 11) [~/memory/2026-10-06.md:152-178, 660-665].
- **Capture method — the one that works (Garrett's correction, 2026-10-08): PLAY the episode first, THEN click the Transcript button** — the button only works once playback starts. Then scroll the panel to the bottom and read the full text directly [~/AGENTS.md]. Print-to-PDF is DEAD (one-page stubs — lazy-loads only first viewport); audio download is DEAD (authenticated HLS, no URLs); faster-whisper **retired** for SiriusXM (no download path) [~/memory/2026-10-07.md:546], [~/memory/2026-10-08.md:146, 178-180]. Episode cards show title + date + duration only → dedupe by fuzzy title match [~/AGENTS.md].
- **Priority voices:** Jeff Mans (airs paid-site material live; also check his Spotify show "One Man's Opinion") and Jim Bowden (former MLB GM — football AND baseball takes, feeds MLB lane) [~/memory/2026-10-06.md:172, 664]. Extraction rule: capture contextual/situational depth — analyst confidence, emotions, trust/fear, disagreements and why — as Layer 2 reasoning-layer training data [~/memory/2026-10-06.md:664].
- **Delivery:** Sunday live-listening emails ~10:00 AM (main report) + ~11:30 AM (major changes only), standing authorization to send; Saturday aggregate `gse-saturday-intel-email` ~8:00 AM (weekly rollup); `gse-podcast-weekly` removed — Garrett podcasts himself in NotebookLM [~/memory/2026-10-06.md:176-177, 184, 190].
- Verified output: Week 5 packet reached 19 pages 2026-10-07 evening — six priority episodes extracted via direct panel read; material at `~/workspace/goals/gse-advanced-metrics-benchmark-sweep/files/siriusxm-weekly/week-05.md`, daily notes under goal `hidden_files/siriusxm/` [~/memory/2026-10-08.md:19, 143-147].
- **Status/open:** nightly pull **BLOCKED on SMS re-sign-in** — session died, re-sign-in needs SMS code to a number ending in 7639 (paired iPhone offline); passkey fallback dead. True hard block — Garrett's tap [~/memory/2026-10-08.md:136, 143-144, 901-905]. Six stub PDFs in `hidden_files/siriusxm/transcripts/` must never be treated as valid source.

### 8.6 Together.ai
3 finished LoRA fine-tunes completed 2026-10-04: `ft-9fabcf3e-389f`, `ft-1f8bc7d5-a098`, `ft-1fe4ef0b-c215` — **no endpoint**. Deploy = one API call per model. TIMING LOCK (Garrett's word): **no endpoint before Sunday lock** [~/memory/2026-10-08.md:660], [~/MEMORY.md:33]. API key NOT in Motif's context as of 2026-10-08; recovery = Claude browser agent pulls it from his Together dashboard [~/MEMORY.md:33]. **Open:** endpoint-less LoRAs = mission gap (Garrett restated the point is a real live reasoning/talking model); post-lock deploy pending.

### 8.7 Other keys (2026-10-08)
Metadata only, values never stored. **Fly.io:** two tokens shared — **both dead (unauthorized)** [~/memory/2026-10-08.md:548]. **Cloudflare:** token **valid and active**. Standing decision: orcad runs on Motif's VM behind a **Cloudflare Tunnel** so his Orca desktop can reach it — no Oracle, no new accounts, no cards. Google Cloud ruled out (e2-micro 1GB RAM too small; e2-medium $25.46/mo; card required even for free) [~/memory/2026-10-08.md:548].

### 8.8 Hindsight (self-hosted)
Agent persistent-memory path (Vectorize Hindsight). 2026-10-08 direction: **self-hosted, not cloud** (cloud keys received, one verified by Hermes HTTP 200 — cloud path now parked per Garrett: "focus on GSE only"). Compose pinned to tag 0.10.2 by immutable digest `sha256:d1840062a5b79940ab7a9f4809ceb90fc776d4ad737cd9329e9b5836cc64ab70`, `pull_policy: if_not_present`, one named volume at `/home/hindsight/.pg0`, ports 8888/9999 bound to 127.0.0.1 only; UI must not be published; API/LLM key stays in VM shell, not Git [~/memory/2026-10-08.md:611-615]. **Not running:** Docker not installed on this VM, no HINDSIGHT_API_LLM_API_KEY; `docker compose up -d` never run here. **Open:** deploy owed (docker + key on VM); Telegram env vars + Windows `install-local.sh` pending [~/memory/2026-10-08.md:586, 615].

### 8.9 Tailscale / Orca pairing
Orca = stablyai/orca (open-source multi-agent orchestration, MIT, ~87k stars verified 2026-10-07 via GitHub API; cloned to `~/workspace/tools/orca`). Designed setup: headless `orcad` daemon on remote, desktop/phone apps as clients over Tailscale [~/memory/people/orca.md]. Garrett's side DONE: tailnet live (**100.103.195.76**), Orca on "Connect to a host" pairing screen, Muse default agent + yolo mode, 22 agents detected, three repos project-listed (sports, agent-bus, autonomous-revenue-engine), keep-awake-while-agents-work on. Captains-vs-players directive (2026-10-07): Motif = captain 1 (the one he talks to), Orca = captain 2 (execution captain); Jules/Hermes/Dots/Orca worktree agents become players [~/memory/people/orca.md]. **Status/open:** **orcad build + Tailscale install on Motif's VM stalled since 2026-10-07 evening** on a flapping VM network outage — install resumes in fits during blips; **no orca://pair link yet**. Garrett said "try aggn" 2026-10-08. His only pending tap: paste the pair link into the "Access link" field [~/memory/people/orca.md]. Also owed: 28-agent roster collapse, agent-bus ↔ Orca bridge trial, DIRECT_URL as user env var on his Windows box.

### 8.10 Agent bus (Beexly/agent-bus)
Fleet coordination layer, rebuilt 2026-10-08 per Garrett's control doc BEEX-AGENT-TEAM.md. **4 projects** (signal-origin, gse, framefit, desk); layout = 4 projects × 5 states; agents/*.yaml (motif lead, orca hands, hermes player); 6 scripts (claim/heartbeat/status/freeze/accept/spend_guard). Branch protection on `main`: force-push/deletions blocked, 1 approving review [~/MEMORY.md:13], [~/memory/2026-10-08.md:579-586, 611]. Grok Build's same-direction build was found already complete (scripts, hindsight compose pin, FLEET-STATUS.md, PR #5 merged) — repo done; Motif packaged tarball at `~/workspace/your_files/agent-bus-build-2026-10-08.tar.gz` [~/memory/2026-10-08.md:581-586]. Fleet signing key generated (ed25519, `~/.ssh/beex-signing`, NOT in repo) [~/memory/2026-10-08.md:586]. Lane roster (Motif/Orca/Hermes) merged 2026-10-08; ops dispatches now go to Dots/coding agents, Motif orchestrates [~/memory/people/INDEX.md]. **Open:** reconcile-migration-ledger + fix-stalled-signals-cron tasks on the bus (orca lease); Telegram vars; Windows `install-local.sh` bootstrap; Hindsight compose up.

---

## 9. Cross-Cutting: Hard-Block Ledger (Garrett-only taps)

Everything below needs Garrett's hands, sign-in, or money — in one place so nothing is re-asked piecemeal:

| # | Blocker | Lane | Since |
|---|---------|------|-------|
| 1 | Connect Stripe in BotFather + add `STRIPE_PROVIDER_TOKEN` | Intel bot monetization | 2026-10-02 |
| 2 | Etsy + Printify OAuth (~10 min) + upload | Vow & Post / POD launch | 2026-09-11 |
| 3 | Amazon Associates sign-in → tracking ID | Affiliate lane | 2026-09-10 |
| 4 | Supabase project + leads table, paste URL/anon key into `docs/js/config.js` | SignPreview real lead capture | 2026-09-13 |
| 5 | Instagram bio link edit; Craigslist/Nextdoor posts; flyer printing + walk-ins | Kit outreach | 2026-09-11 |
| 6 | `npx copilotkit@latest login` + `project select` on Windows (INTELLIGENCE_API_KEY now live — verify second key) | OpenDots | 2026-10-08 |
| 7 | Breach-provider selection + key (HIBP/Dehashed/IntelX/LeakCheck) | Intel bot intel gap | 2026-10-07 |
| 8 | Kaggle API key | Threat datasets | 2026-10-06 |
| 9 | SiriusXM SMS re-sign-in (phone alive, code to number ending 7639) | Nightly intel pull | 2026-10-08 |
| 10 | DIRECT_URL as user env var on Windows box; Vercel dashboard taps (cron list, deploy health, CRON_SECRET) | Migration-ledger reconcile; signals-cron fix | 2026-10-08 |
| 11 | Orca pair link paste ("Access link" field) | Orca pairing | 2026-10-08 |
| 12 | Neon API key (for `neon link`/`neon deploy`) | Branch-only testing TTL live | 2026-09-28 |
| 13 | Google session for hq@galaxysportsedge.com (password/2FA) | TikTok @galaxy.sports.edge posting | 2026-09-17 |
| 14 | @galaxysportsnetwork working login | Instagram Reel | 2026-09-17 |
| 15 | HF gated-model terms acceptance (TimesFM, Lag-Llama) | HF lane | 2026-09-28 |
| 16 | Brev GPU provisioning decision | verl RL harness | 2026-10-02 |
| 17 | Together API key recovery (Claude browser agent → dashboard) | LoRA endpoint deploy (post-Sunday-lock) | 2026-10-08 |
| 18 | Docker + HINDSIGHT_API_LLM_API_KEY on VM | Hindsight self-host | 2026-10-08 |
| 19 | Google AI Studio Gemini API credential (free) | Kit AI Receptionist live | 2026-09-11 |
| 20 | Vercel spend budget + alerts; AI Gateway pilot approval | Cost control | 2026-09-28 |
| 21 | NVIDIA catalog login (passkey device ceremony) | NVIDIA lane | 2026-10-02 |
| 22 | X API credits approval (spend) | X API posting route | 2026-09-10 |
| 23 | Projection-source lock; live slate provider; DraftKings hidden-endpoint call | DFS/total-signal | 2026-09-27 |

---

## 10. Cross-Cutting: UNVERIFIED / Open Threads

Items the workers could not verify on this host — do not treat as fact until checked:

1. **Kats sibling sessions 1/2/3/4/6/7 landing** — this VM's checkout is 12 commits behind origin/main; not visible in fetched refs [§2.5].
2. **PR #1142 (Kats VAR v4)** — branch in refs, VAR files absent from origin/main here [§2.5].
3. **Integration-wave remote landing** — verified locally, restarted healthy; no secret-scan + remote-repo landing evidenced (no-local-only rule) [§3.2].
4. **Bot-side Stripe state** — a 2026-10-07 log line about "Stripe connected" referred to the meta-ads skill's billing, NOT the bot's BotFather provider [§3.2].
5. **"mira bot" = @Intel_science_bot** — Garrett's words were "i added mira bot to my profile"; not established [§3.5].
6. **swap-model.sh malformed-grep bug (2026-10-06)** — not found in any log/file; current script clean [§4.4].
7. **Claude's MOVE-37 Phase 1/2 repairs; Gemini brief submission** [§1.1].
8. **PR #1035 (NGS) guardrail-tampering resolution** [§1.2].
9. **v5.3.0 rebuild ship status; 300–500 test target progress** [§1.5], [§1.4].
10. **Kaggle/THREAT keys; ABUSECH/ABUSEIPDB/OTX optional keys** [§3.2], [§3.5].
11. **TASK-012 build; Recordly end-to-end record/edit/export; live Odds API key test; Kalshi paper-trading execution** [§6.2], [§6.5], [§6.8].
12. **X Premium placement on @GalaxySportsHQ** (conflicting 9/10 vs 9/22 records) [§7.1].
13. **2026-08-25 → 2026-09-08 window** — no daily logs on this VM; reconstructed from curated memory only.
14. **REA CLI on this host** — currently MISSING (VM swap); needs `npx --yes rea-agents@latest setup` before REA work [§5.1].
15. **Five cleartext keys in agent-bus brief `kalshi-and-odds-api-io-evaluation`** — rotation still owed [§6.8].
16. **Committed PostgreSQL password in Clouds-bruh/docker-compose.yml** — rotation owed before any redeploy [§6.7].

---

## 11. Index: Key Code Locations

| Path | What |
|------|------|
| `~/workspace/telegram-osint-bot/` | Intel bot: bot.py, payments.py, packages.py, osint_*.py, intel_models/, triage-report.md, gapmine-triage-report.md, family-shield/ |
| `~/workspace/telegram-osint-bot/intel_models/` | Offline ML: dga.py (97.6%), urlclf.py (56/56), attack.py (697 MITRE), confusables.py (6,712), ner.py, asn.py |
| `~/workspace/telegram-osint-bot/osint_username_engine.py` | Native username engine (84 sites, 0–100 confidence, clean-room) |
| `~/workspace/telegram-osint-bot/osint_webcheck.py` | /webcheck (MIT attribution) |
| `~/workspace/telegram-osint-bot/osint_gapmining.py` | 12 gap-mined commands |
| `~/workspace/telegram-osint-bot/osint_investigate.py` | /investigate workbench |
| `~/workspace/opendots/` | OpenDots repo; `seed-dots/` (13 JSON), `scripts/swap-model.sh`, `data/` |
| `~/workspace/gse-discovery/` | MOVE-37: prompts, scripts, reports, audit, frozen `data_snapshot_20260913` |
| `~/workspace/gse-rl/env/` | RL episodes (1,087), reward v2 |
| `~/workspace/skills/jules/` | Jules skill, `bin/jules-api` |
| `~/workspace/skills/nvidia/` | NVIDIA skill, `bin/nvidia-api` |
| `~/workspace/skills/huggingface/` | HF skill, `bin/hf-api` |
| `~/workspace/skills/kit-outreach/SKILL.md` | Kit outreach playbook |
| `~/workspace/skills/x-poster/SKILL.md` | X publishing pipeline (Hold ≥9.2 gate) |
| `~/workspace/tools/recordly/Recordly.AppImage` | Recordly v1.3.0 |
| `~/workspace/tools/orca/` | Orca clone (stablyai/orca) |
| `~/workspace/tools/ghidra_12.1.4_PUBLIC` | Ghidra 12.1.4 (REA provider) |
| `~/.agents/skills/reverse-engineer-anything/` | REA skill v23 (114 tools) |
| `~/workspace/vendor/agent-bus/outbox/from-motif/` | Fleet notes (reasoning doctrine, Kats, REA, fleet standards) |
| `~/workspace/vendor/autonomous-revenue-engine/` | Money lane: kit-pack/, ops/x-voice/, ops/x-engagement/, SIGN_SYSTEM.md, signpreview.html |
| `~/workspace/vendor/Sports/` | Sports checkout (PARTIAL vs Windows host — two-host rule) |
| `~/workspace/goals/` | Goal briefs: gse-engine-v5-3-0-calibration-rebuild, gse-advanced-metrics-benchmark-sweep, autonomous-revenue-engine, intel-osint-bot-monetization, week-5-dfs-packet-build, gse-machine-discovery-loop |
| `~/workspace/your_files/gemini-deep-research-brief-2026-10-08.md` | Gemini adversarial-loop brief (draft) |
| `~/workspace/your_files/agent-bus-build-2026-10-08.tar.gz` | Agent-bus build tarball |

---

## 12. Index: Key How-Tos

| Task | Command / method |
|------|------------------|
| Intel bot: run everything on a target | `/hunt <target>` in Telegram |
| Intel bot: open operator case | `/investigate <target>` → pivots → `/case` → `/close` |
| Intel bot: package run w/ auto-detect | `/pkg <target>` (or `/pkg <package> <target>`) |
| Intel bot: unified website analysis | `/webcheck <domain>` |
| Intel bot: start (safe pattern) | `for p in $(pgrep -f "bot\.py"); do if [ "$p" != "$$" ]; then kill "$p"; fi; done; cd ~/workspace/telegram-osint-bot && (nohup ./start.sh > bot.log 2>&1 &)` |
| Intel bot: watch a domain | `/watch <domain>`; `check_watch.py` via cron |
| Intel bot: renewal reminders | `./.venv/bin/python check_renewals.py` |
| OpenDots: start | `cd ~/workspace/opendots && npm start` (nohup; no auto-restart on VM) |
| OpenDots: swap model | `./scripts/swap-model.sh [openrouter\|experiential\|status]` then restart server |
| CopilotKit Intelligence key | `npx copilotkit@latest login` + `project select` on Windows → `INTELLIGENCE_API_KEY` in `.env` |
| REA decompile | `rea --provider ghidra <binary>` (Hopper demo bridge unreliable) |
| Jules API | `~/workspace/skills/jules/bin/jules-api 'METHOD /v1alpha/path' '[json]'` (batch: NO requirePlanApproval) |
| Jules steer/approve/delete | `POST /v1alpha/sessions/{id}:sendMessage`, `:approvePlan`, `DELETE /v1alpha/sessions/{id}` |
| Neon throwaway branch | Neon CLI v6.2.4; root `neon.ts` (7-day TTL); pooled strings for app routes, direct for migrations |
| HF API | `~/workspace/skills/huggingface/bin/hf-api` (surrogate auth `custom.huggingface`) |
| NVIDIA API | `~/workspace/skills/nvidia/bin/nvidia-api` (model-list/chat/kumo) |
| SiriusXM transcript | PLAY episode first, THEN click Transcript; scroll panel to bottom; read directly (PDF/dead, audio/dead, whisper/retired) |
| Kit outreach sequence | Day 0 touch → Day 3 follow-up → Day 7 breakup → `lost` (drafts free; sends need Garrett's per-batch approval) |
| X post pipeline | draft → qi-check Hold ≥9.2 → approve-desk → Garrett APPROVE → browser post → ACTION_LOG |
| Triage method (OSINT links) | curl GET per link, 20s-spaced, license check, keyless probe, diff vs existing; `trust_env=True` |
| Secret-scrub rule | secret-pattern scan every transcript/EYI/goal feed before any branch push (git-security-guard skill) |

---

*End of compendium. Sources: ~/MEMORY.md, ~/memory/2026-09-09.md → 2026-10-09.md, ~/AGENTS.md, ~/SOUL.md, ~/memory/people/*.md, ~/memory/groups/*.md, ~/workspace/goals/*/GOAL.md, ~/workspace/vendor/agent-bus/outbox/from-motif/*, repo files listed in §11. Compiled 2026-10-09.*
