# INDIE NFL MODEL BUILDERS — ranked dossier for GSE

Date: 2026-09-25. From: Motif (subagent sweep coordinator). For: Garrett + coding agents.
Mission: find independent builders like @ethandojo — real models, plug-and-play methodology, NOT big commercial companies.

Method: four parallel sweeps (Instagram via instagram-cli, X via web search, GitHub via REST API, web writeups via search). All read-only. 24 candidates surfaced; ranked below by plug-and-play value to GSE. Evidence quality marked DIRECT (observed/quoted) vs INFERENCE per claim.

**License posture key:** MIT = code can be adapted with attribution. No license = all rights reserved; methodology is public and fair to learn from, code cannot be copied without permission. DM-gated = methodology visible, code behind comment/DM funnel. Verify any license before ingesting code.

---

## TIER 1 — highest plug-and-play value

### 1. TreMatt03 — nfl-game-predictor (GitHub, MIT)
- Where: https://github.com/TreMatt03/nfl-game-predictor (personal account, DIRECT via API). Live weekly page, auto-refreshes Tuesdays.
- What built (DIRECT, README quotes): Gradient-boosting NFL game model, win probabilities + per-pick explanations. Walk-forward, 3,816 games 2012–2025: accuracy 65.2%, log loss 0.622, Brier 0.216, AUC 0.706 vs Elo-only 0.634 / closing Vegas moneyline 0.609. Calibration curve tracks the diagonal.
- Two findings that matter (DIRECT): (a) "Team efficiency stats add almost nothing on top of Elo. EPA per play, success rate, explosive-play rate — I built all of them, and every combination landed within noise of Elo alone (0.632 vs 0.632)" — saves GSE wasted feature work. (b) "Rating passers individually — EPA per dropback, tracked per player so it follows a trade or a midseason takeover — moved log loss from 0.633 to 0.625 and AUC from 0.690 to 0.700. It is the single largest improvement in the project." Injury absence weighting uses prior-games snap share with an anti-leakage test (`test_snap_share_excludes_the_current_week`). "It does not beat the market, and I would be suspicious of a hobby project that claimed to."
- Fit: Only MIT-licensed full game model in the sweep. Per-player QB tracking + snap-share injury weighting + calibration discipline are directly liftable. The Week-18-rest edge case in their starter-identification fix mirrors a real GSE edge case.
- License: MIT — code liftable with attribution. Active (last commit 2026-09-22). Stars 0 (brand new, undiscovered).

### 2. Dave (howlscastle97) — nfl-model-hq (GitHub, open repo)
- Where: https://github.com/howlscastle97/nfl-model-hq · live site https://howlscastle97.github.io/nfl-gambling-hq/ (personal project, originally alongside a university Bayesian-methods course — INFERENCE from CLAUDE.md)
- What built (DIRECT, repo docs): Bayesian NFL margin prediction system. (1) Leakage-safe chronological feature engineering on nflverse games.csv: EWMA point differential, EPA aggregates, QB familiarity = share of last 16 starts by today's listed starter, rest, division, indoor. (2) Joint Kalman filter over 32 team ratings + home-field, hyperparameters tuned by one-step predictive log-likelihood on seasons ≤2023. (3) Deep ensemble of 5 heteroscedastic MLPs (mu + sigma heads) on beta-NLL (beta=0.5), variance recalibration RECAL_SCALE=1.039. (4) Weekly-refit walk-forward harness; TRACK_FIRST_SEASON=2021. (5) Kalshi API price logger with fee-adjusted edges (fee=0.07·p·(1−p)). Honest discipline: "Big model-market disagreements are treated as the model missing news, not free money ('square-3 rule')." Published a null result: per-QB empirical-Bayes rating improved the linear model on selection but −0.0002 [−0.0131, +0.0123] held-out on the ensemble — NOT shipped, reasoning written up ("ensemble already extracts QB quality from team EPA, CPOE and qb_fam_diff").
- Fit: Exactly the calibration-first architecture GSE needs — Kalman ratings + heteroscedastic ensemble + variance recalibration + fee-adjusted market edges + null-result publication culture.
- License: Open repo, no OSI license found — learn from methodology, do not copy code without asking. Active through Sept 2026.

### 3. seidcubro — PriorLine player-prop platform (GitHub, license unclear)
- Where: https://github.com/seidcubro/player-prop-machine-learning-analysis-platform · site priorline.io (single independent builder, INFERENCE)
- What built (DIRECT, docs/MODEL.md): Full-stack NFL player-prop platform (FastAPI, PostgreSQL). nflverse → rolling/situational per-player-per-market features → one model per market (bakeoff: ridge wins rush_att R² 0.747; elastic net wins rush_yds/recs; HGB passing; Poisson pass TD; RF TD classifiers) → quantile models q10–q90 → edge = projection vs Odds API lines. simulate.py "runs 20,000 games per matchup and reads every market off the same simulated outcomes" with Dirichlet touch-shares. Brutally honest backtest: trained 2022–24, ran 2025 blind, 6,736 graded picks = 51.5% vs 53.9% breakeven, −4.3% ROI — then found the structural fix: books shade lines toward overs, quantile medians beat means, top tier +4.1% over 3,952 graded picks. "Every bucket was 14 to 29 points overconfident" before quantile recalibration.
- Fit: Per-market bakeoff discipline, quantile→P(over) pipeline, and the over-shade asymmetry directly map to GSE's anytime-TD and HR-prompt lanes. The published negative-result→fix arc is the quality signal Garrett asked for.
- License: Repo lists "License: Other (NOASSERTION)" — treat as NOT cleared for code reuse; learn-only until checked. 191 commits, active, CI.

### 4. Sujar Henry (@sujar.tech, Instagram) — strongest Ethan-Do analog
- Where: https://www.instagram.com/sujar.tech — 73.7K followers, "Tech & AI," DC/NYC, site axonlearn.app
- What built (DIRECT, reel captions): Ensemble ML model predicting weekly NFL winners. 20+ features: ELO ratings, recent win %, rest days, offensive/defensive EPA, market data; added injury data after viewer feedback. nflverse Python package back to 2003, 6,234 games trained, holdout seasons 2021–2025. Ensemble: LogReg + decision trees + XGBoost + random forests voting. Posts full weekly prediction tables with confidence %. Self-reported: 88% one week, 68% the next ("55–65% is typical for pro NFL models" — his words). Methodology posts include hyperparameter changes (trees 50–200 → 200–500, max depth 12 vs overfitting).
- Fit: Ensemble voter design + published train/holdout split + weekly confidence-graded records = ready-made recipe to cross-check GSE's game-pick path.
- License: Code DM-gated ("comment 'NFL' for the code") funneled through his commercial Axon Learn app — flag as mixed/open-but-commercial-gated. Self-reported records not independently verified.

### 5. Damepivot — nfl-game-model (GitHub, no license)
- Where: https://github.com/Damepivot/nfl-game-model (personal account, DIRECT via API). One-shot build 2026-08-27, currently idle.
- What built (DIRECT, README): Ridge regression predicting home win prob, margin, total from 870,000 plays / 6,719 games 2000–2025. Team ratings = EPA/play split passing/rushing × offense/defense + success rate + explosive-play rate, schedule-adjusted by attributing each play to both teams via "ridge regression over one-hot team indicators" (penalty shrinks thinly-sampled teams toward league average). Prior-season blending w(week) = n/(n+6). QB inputs: rolling EPA/dropback + CPOE over 16-game window crossing seasons. Situation: rest differential, division, indoor/outdoor, surface, timezone delta, kickoff hour, week. Held-out 2023–2025 (816 games, "touched exactly once"): margin MAE 10.077 vs Elo 10.253; win-prob accuracy 65.3%, Brier 0.2182, calibration slope 0.998 (at 86.5% stated, home won 86.4% over 462 games). "A ~10-point MAE is close to the practical floor for this sport."
- Fit: Opponent-adjusted EPA via ridge-on-one-hots + calibration-slope reporting are directly comparable against GSE's calibration. Reinforces the "QB is what Elo misses" finding (per-player rolling QB EPA).
- License: None — learn-only, do not copy code.

### 6. bweezy615 — @Soothbet (X + GitHub, open source)
- Where: X @Soothbet · repo https://github.com/bweezy615/sooth · site sooth.bet
- What built (DIRECT, methodology.md): NFL pick engine on Elo with damped margin-of-victory update + opponent-aware EPA form + rest, converted to probabilities via isotonic regression refit each season on prior seasons only. 11-book price shopping, de-vigged fair line. Weekly slate sealed before kickoff and graded in public; publishes Brier vs de-vigged closing market. 2,608-game walk-forward: 49.5% ATS vs 52.4% breakeven — published the LOSING record on their own landing page: "We built a prediction model… It lost to the market… So we published the losing record."
- Fit: Sealed-ledger discipline (timestamped pre-kickoff commits) + isotonic calibration pipeline directly lift GSE's prereg-eval lane. The 4-point absolute-edge selection rule is a useful published negative result.
- License: Open source repo, free tool, no commercial product. Caveat: negative edge — value is discipline, not the model.

---

## TIER 2 — strong feature/engineering ideas

### 7. SamuelLachance — Sharp Odds (GitHub, open source)
- Where: https://github.com/SamuelLachance/Sports-Odds-Algorithms (personal). Multi-league; NFL slice relevant.
- What built (DIRECT, README): 14-feature NFL stack: 11v11 per-play TrueSkill ratings, weekly QB Kalman fusion, opponent quality, salary cohort priors. TEST log-loss 0.61919 vs plain Elo 0.63984 vs closing line ~0.609. Author measured the closing line statistically *encompassing* the model (adding model to market forecast makes it worse) — and published that.
- Fit: Per-play TrueSkill player ratings beat team Elo alone (0.62973) — transferable feature idea. "Devigged close as theoretical floor" evaluation framework is benchmark-grade. Unusually honest evaluation.

### 8. Daniele Comitogianni (@dandoesdata.ai, Instagram)
- Where: https://www.instagram.com/dandoesdata.ai — 6.7K followers, AI Engineer & Researcher (bio: "Building reliable AI for cancer care")
- What built (DIRECT, reel + captions): Super Bowl LX forecast: decade of NFL play-by-play via NFL FastR, dynamic Elo ratings, efficiency metrics adjusted for strength of schedule (his SoS adjustment dropped the Patriots' defense from 5th raw to 11th), three models (XGBoost, Random Forest, Ridge) + 100,000 Monte Carlo iterations → 62% Seahawks win prob, −3 spread, projected 23-20. On-screen code snippets. (Also an F1 safety-car model; repo offered via "comment 'F1'".)
- Fit: Most professional-grade feature engineering in the IG sweep. Dynamic Elo + SoS-adjusted efficiency is directly portable to GSE's power-rating pipeline.
- License: Repos shared on request; nothing commercial observed. No permanent public repo URL seen — DM-gated.

### 9. Athena Huo (@athena_huo, Instagram)
- Where: https://www.instagram.com/athena_huo — 14K followers, UC Berkeley → Cornell
- What built (DIRECT, reels + comments): ML NFL game-prediction series. 4,045 games back to 2010; refreshes with injury reports and Seattle weather data; predicts full scores via simulation (most-likely 27-24 outputs); flags model-vs-market discrepancies as "value" (Kalshi had Seattle 61% vs her sims). Later version added player props (Gibbs 19 carries/86 yds) and a DOCUMENTED overfitting fix: V1 trained on 2025 data = leakage → retrained V2 (Rams 63.4%, 27-24). Commenters publicly scrutinize the record (some report losses on V1 picks).
- Fit: Simulation-based score outputs + explicit model-vs-market "value" framing = GSE's public-pick mechanics. Her documented leakage correction is honest methodology GSE's own docs can cite.
- License: Unknown; code on request per comments.

### 10. jackc625 — nfl-predict (GitHub, no license)
- Where: https://github.com/jackc625/nfl-predict (personal account, DIRECT). Created 2026-03-28, last commit 2026-08-27.
- What built (DIRECT, 39K README): Full-stack Friday-snapshot engine: calibrated Win Probability, ATS, Over/Under per matchup. Bronze/Silver/Gold Parquet + DuckDB lakehouse, Pydantic v2 quality gates, three-level temporal safety (as_of_datetime time-fence, LeakageGate keyword scan, walk-forward splitter hard-failing on season overlap). Model outputs blended with market "in the mathematically appropriate space (log-odds for probabilities, point space for spreads and totals)." Blend weights tuned strictly on pre-2018 seasons so the 2021–2024 backtest is never seen during weight selection. Weekly Friday 18:00 ET orchestrator; FastAPI + HTMX + Tailwind dashboard. Milestones shipped: v1.0, v2.0, v2.1 "Trust & Reproducibility — NO new product features: honestly diagnose real model accuracy."
- Fit: The LeakageGate + as-of time-fence pattern is the most rigorous leakage discipline in the sweep and mirrors GSE's sealed-vault discipline. Market-blend-space discipline + pre-2018 weight-tuning constraint are directly relevant to GSE's pick-vs-market calibration.
- License: None — learn-only.

### 11. Robby Greer — nfelo (web + GitHub, open source)
- Where: https://nfeloapp.com (free site, one maintainer); model code open source; pip package `nfelodcm`; per-game CSVs on GitHub with auto-updates; picks tracked on PredictionTracker.com
- What built (DIRECT, from GSE's own June projection-source landscape doc): Independent one-man Elo-family model: separate team Elo and QB Elo (replicates/improves FiveThirtyEight's QB model), regresses to market spreads for margin prediction, HFA, rest, weather.
- Fit: QB Elo layer with market regression is the closest public analog to GSE's QB handling; the public `nfelo_games` win-probability table is an independent second-source benchmark. Caveat (DIRECT from source): market regression means outputs aren't methodologically independent of market.
- License: Open source, free site, no commercial surface. X handle not confirmed (needs direct lookup).

### 12. R2 (@r2codes, Instagram)
- Where: https://www.instagram.com/r2codes — 8.5K followers, software engineer
- What built (DIRECT, reel series "PREDICTING EVERY NFL GAME"): Ridge regression on 3,028 NFL games since 2015 (recency-weighted) for team power rankings; rebuilt after preseason 13-16 on 10 years of data; original "Coach Intent Index" for preseason (models which coaches actually try to win); runs every game 1,000 times in simulation. Week 1: 11-5, with 60%+ confidence picks 9-1 vs sub-60% 2-4 — explicitly analyzes the confidence split. (Also claimed 19-3 World Cup knockout run with a prior model — self-reported, unverified.)
- Fit: The confidence-calibration framing (high- vs low-confidence pick splits) maps directly to GSE's calibration lane; the Coach Intent Index is an original preseason idea worth adapting for low-information games.
- License: Unknown; architecture guide DM-gated ("comment 'BLUEPRINT'"). No public repo seen.

---

## TIER 3 — watch list / situational value

### 13. The Barking Crow — Movelor CFB system (independent blog)
- Where: https://thebarkingcrow.com/how-our-2024-college-football-model-works/ (small independent outfit)
- What built (DIRECT): Movelor = Margin-of-victory-based Elo + recruiting. Inputs: log-scaled margin of victory, 247Sports Composite recruiting (5-year weighted talent, 3-years-ago class double-weighted), preseason AP blend. HFA ≈ 3 pts. Output = points/game vs average D-I team. Honest benchmarking: "Movelor had an average error last year of 12.9 points per game. The closing spread… 12.1… ESPN's FPI 12.5… ESPN's SP+ 12.3." CFB playoff sims since 2019 ("never missed a playoff team" pre-2023; admitted the 2023 FSU/Georgia miss: "That's on us").
- Fit: Only CFB entry in the sweep. A masterclass in transparent error-benchmarking against market and SP+/FPI; log-MOV scaling + FCS-inclusion handling are relevant to GSE's CFB and regime-detection thinking. No code link seen.
- License: Unknown; self-described "admittedly amateur-ish… for our business" — no license asserted, open writeup.

### 14. maximusdesir — engage8 (GitHub, MIT)
- Where: https://github.com/maximusdesir/engage8 (personal, MIT)
- What built (DIRECT): Pre-snap run/pass prediction + defensive-tendency engine: LightGBM on 173,881 nflverse plays; time-split train 2019–21 / calibrate 2022 / test 2023: 69.7% accuracy vs 59.0% naive, ROC-AUC 0.766, Brier 0.192.
- Fit: Coaching/scouting lane, not game prediction — but MIT-licensed with calibration-reporting discipline (Brier over accuracy, explicit time-split anti-leakage) exactly at Garrett's quality bar. Brier 0.192 at play level is strong.
- License: MIT — code liftable with attribution.

### 15. cdinh92 — nfl-predictive-engine (GitHub, no license)
- Where: https://github.com/cdinh92/nfl-predictive-engine (personal, DIRECT). Created 2026-09-09, active weekly (last commit 2026-09-24).
- What built (DIRECT): Weekly live-run ML pipeline: nflreadpy → EMA (span 4) feature engineering → XGBoost → 80/20 ensemble with odds-vig-strip. Features condensed to 9 EMA differentials (off_epa, def_epa, off_cpoe, net_yds_per_play); shift(1) leakage prevention. README is a weekly ops log: Week 2 went 9-7 SU (56.3%) with per-game confidence tiers, model blend %, Vegas-implied %, edge per matchup; diagnostic notes on road-underdog failures. High-confidence tier 2-0.
- Fit: The weekly public ledger format (pick + model prob + Vegas implied + edge + outcome, tiered by confidence) is a ready-made template for GSE's own posted record. EMA-differentials as feature compression is a compact idea worth testing.
- License: None — learn-only. Only 2 weeks of history — promising, not proven.

---

## ALSO SURFACED (brief — below the cut)

- **SuchSports (@suchsports, IG)** — 4-model ensemble (LGBM+LR+XGB+RF), NFLverse 1999+, rest/weather/travel features, weekly tables. 145 followers; no validation shown. Clean reference implementation if validated later.
- **Dhruv Goswami (@wizard.py, IG)** — five XGBoost variants with stacking/ablation experiments (turnovers, QB metrics); watch-list builder more than source.
- **Declan Gentile (Medium + GitHub)** — EPA-differential matchup features, positionally-weighted injury scores, leakage-safe splits; thin validation. https://medium.com/@dgentile_10367/predicting-nfl-game-outcomes-with-machine-learning-c3889d305f5c
- **Lakshay Naresh (GitHub)** — XGBoost, matchup differentials, rolling windows; no accuracy/record claimed. https://github.com/lakshaynaresh/nfl-game-prediction-probability-xgboost
- **BlairCurrey/nfl-analytics (GitHub)** — weekly GitHub-Action releases, self-contained run artifacts; headline numbers in docs/model.md (not read).
- **INSUL4RITY/nfl-forecast (GitHub)** — immutable-release + prospective-scoring design; created 2026-09-25, no results yet. Watch in a month.
- **Veedubin/quantitative-sports (GitHub)** — XGBoost ensemble toolkit + 10 Jupyter labs; dormant ~94 days.
- **Algosports23 (Substack)** — weekly sheets, weak methodology transparency; forward-published benchmark only.
- **Excel LADZ (YouTube)** — Excel-based NFL model, video metadata only; needs a live-browser watch to assess. **Flag for parent: browser delegation needed.**

## Deliberately excluded

Big commercial (PFF, ESPN/SP+/FPI, SumerSports, Action Network, The Athletic, Minitab, AWS/NFL+, Carnegie Mellon, gamescript.ai, @DanGambleAI), thin repos (TyWalters/NFL-Prediction-Model — 79-char README; morelandjs/melo-legacy — Python 2.7 dead tech; akhimass/SuperBowlEngine — mislabeled draft tool), entry-level educators (@askdatadawn), gambling funnels (@quant_kavin — "baby retail model" per commenters), and the 22 accounts already in GSE's benchmark sweep (not re-reported).

---

## Cross-cutting takeaways for Garrett

1. **Only 2 of 24 are code-liftable today:** TreMatt03 (MIT) and engage8 (MIT). Everything else is learn-from-methodology, not copy-code — most personal repos have no LICENSE (all rights reserved by default). Garrett should see this before any ingestion decision.
2. **Independent convergence on QB-individual tracking:** TreMatt03, Damepivot, cdinh92, and nfelo all landed on per-player QB features independently — the strongest cross-builder signal in the sweep.
3. **The honest-negative-result builders are the quality filter:** Sooth (published losing ATS record), SamuelLachance (closing line encompasses his model), howlscastle97 (shipped null result with reasoning), seidcubro (published −4.3% ROI then found the fix), TreMatt03 ("suspicious of a hobby project that claimed to beat the market"). These are the ones worth engaging first.
4. **Calibration is the differentiator:** The best builders report Brier/log-loss/calibration slopes, not just win %. GSE already speaks this language — these are peers, not teachers, on calibration.
5. **DM-gating is the norm on Instagram:** sujar.tech, r2codes, dandoesdata.ai, athena_huo all gate code behind comment/DM funnels. No public GitHub URLs confirmed for any IG game model.
6. **CFB gap:** Only one CFB builder surfaced (Barking Crow). A CFB-specific sweep is open work.
7. **Fresh crop:** The best GitHub candidates were created weeks ago (Sept 2026) — the weekly-prediction trend is producing new builders constantly. Re-sweep monthly.
