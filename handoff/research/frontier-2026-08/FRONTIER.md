# FRONTIER-2026-08 — Sports Quant Frontier Scan

Produced: 2026-08-26. Scope: what's NEW and UNCOVERED vs the repo census (538 Elo, ESPN FPI, Massey/Colley/Sagarin, nflfastR, DVOA, PFF, Metaculus/Manifold/PolyMarket/Kalshi mechanics, Wong teasers, CLV, Kelly, DFS solvers, XGBoost game models). Marked UNVERIFIED freely; cited everything.

Ranked: novelty × feasibility (high = new + we can actually test with falsifyBind + games harness + pbp archive).

---

## 1) NEW TRACKING / DATA MODALITIES (highest feasibility — data exists)

### 1A. ESPN Tracking-Derived Metrics beyond public NGS (PASS-RUSH WIN RATE, BLOCKING WIN RATE, TACKLE PROBABILITY derivatives)
- What: ESPN Analytics built Pass/Run Block Win Rate (PBWR/RSWR/PRWR) from NGS player-tracking (2025). Not in our stack; we have NGS public aggregates only. Tackle-probability and blocking-grade derivations (e.g., probability a blocker maintains contact >2.5s) are unpublished but derivable from raw tracking feeds.
- Not covered: No pbp archive derivation of blocking grades; no tracking-derived defensive-efficiency metrics beyond public pressure rate.
- Source: ESPN Analytics 2025 NGS tracking analysis (espn.com/nfl/story/_/id/46138675); NFL Operations tracking data docs.
- UNVERIFIED for the derivation layer — only the ESPN public outputs are verified.
- Test path: pull pbp archive plays with tracking IDs; compute per-blocker sustained-contact probability; feed into falsifyBind as defensive-grade feature; compare to PFF grades.

### 1B. GPS / Load Monitoring + Injury Forecast Models (academic publications 2023+)
- What: GPS-derived load (PlayerLoad, high-speed running >21km/h), ACWR (acute:chronic workload ratio) models published for NFL/injury forecasting (e.g., Catapult / STATSports research, academic papers). Not in stack.
- Not covered: No injury-forecast model using tracking load; our NFL research has timing/situational edges but not predictive injury models.
- Source: general sports-science literature (catapult.com; STATSports); not fully extracted — UNVERIFIED details.
- Test path: if GPS data available (STATSports feeds), build load → injury binary; else build synthetic from snap counts + weather + turf (proxy) against pbp archive.

---

## 2) NEW MODEL CLASSES (high novelty; feasibility medium — requires new harness work)

### 2A. LLM-Based Forecasting (GPT-class predicting games) — NEGATIVE RESULTS INCLUDED
- What: LLM-SoccerArena (2026, arXiv:2607.24573v1) benchmarks 7 LLMs on 104 World Cup matches — comparable forecasting, no statistically significant differences across models; crowdsourced forecasts often beat LLMs (Royal Society 2024). "Forecasting the FIFA World Cup 2026 with LLMs" (preprint) notes LLMs synthesize historical/qualitative info without structured features — a different paradigm from our XGBoost feature-engineering approach.
- Not in stack: No LLM forecasting module; our prediction-engines are feature-engineered ML.
- Source: arXiv:2607.24573v1 (LLM-SoccerArena); Royal Society 2024 crowdsourced-vs-LLM forecasting; preprint "Forecasting FIFA 2026 with LLMs".
- Key negative finding (must include): LLM forecasting is NOT clearly better than structured ML on structured sports outcomes; novelty is in zero-shot reasoning, not accuracy.
- Test path: build `falsifyBind` prompt harness — feed GPT-4o with last-5-game box scores + line + weather, request score prediction; backtest against pbp archive; measure calibration error, Brier score. Compare head-to-head with our XGBoost.

### 2B. Conformal / Balanced Risk Sets (calibration guarantee)
- What: Anytime-valid conformal risk control (arXiv:2602.04364v1) turns any point predictor into statistically valid prediction sets with guaranteed error rate. Not in our stack — our calibration is empirical (Kelly/CLV), not guaranteed.
- Not covered: No split-conformal or risk-control wrapper over game predictions.
- Source: arXiv:2602.04364v1; OpenReview papers.
- Test path: wrap our XGBoost predictions in split-conformal (calibration set from past season); output {win/cover/under} sets with guaranteed 90% coverage; test against pbp archive outcomes.

### 2C. Decision-Focused Learning (DFL) — prediction → decision optimization
- What: DFL (arXiv:2307.13565v4, 2024 review) integrates ML + optimization so model training optimizes decision cost (bet sizing, prop selection) not just prediction error. Our Kelly/CLV is post-hoc sizing; DFL trains end-to-end.
- Not in stack: No DFL module; Kelly runs after prediction.
- Source: arXiv:2307.13565v4 (DFL review, 321 citations); NeurIPS 2025 posters on Bi-DFCL.
- Test path: train a small DFL layer on falsifyBind — prediction + Kelly decision loss together — compare to sequential (predict → Kelly) on backtest profit.

### 2D. Causal Inference in Sports — Synthetic Control for Coaching Changes / Uplift
- What: Deep-learning + causal inference for sports league operations (SPIE 2026 paper); synthetic control for coaching-change effect; uplift modeling (would this prop move under a different play-caller?). Not covered — our edges are correlational (DVOA, PFF) not causal.
- Source: SPIE paper 10.1117/12.3121432; synthetic-control literature (Abadie et al.); uplift models from marketing migrating to sports.
- UNVERIFIED — no concrete sports-analytics synthetic-control backtest found publicly.
- Test path: synthetic control over coaching-change events in pbp archive (new HC year-over-year team stats); compare to difference-in-differences; feed into prop-line adjustments.

---

## 3) NEW MARKET STRUCTURES (medium novelty; feasibility varies)

### 3A. Exchange Betting APIs / Historical Data (Betfair Historical Data Program)
- What: Betfair operates world's largest betting exchange (peer-to-peer) with historical tick-level data available via Betfair Historical Data program (arXiv:2409.13528v2, comparison of financial/gambling markets; HBS case on Betfair). Not covered — our market mechanics cover Kalshi/PolyMarket/Manifold, not exchange tick data.
- Not in stack: No Betfair exchange backtest harness; no tick-data ingestion.
- Source: arXiv:2409.13528v2; HBS case 19-057 (Casadesus-Masanell 2018, cited in literature); lsports.eu micro-betting post.
- Test path: request Betfair Historical Data sample (free tier); build tick-level microstructure harness; compare to our Kalshi settlement mechanics (similar peer-to-peer dynamics).

### 3B. Micro-Betting / In-Play Derivative Pricing
- What: Micro-market = single near-immediate outcome (next play result) — requires millisecond-level model. Literature: "BBE: Simulating Microstructural Dynamics of In-Play Betting" (Cliff 2021); lsports.eu micro-market cost analysis. Our stack handles full-game props; no in-play micro-bet model.
- Not covered: No in-play model; no play-level derivative pricing.
- Source: Cliff 2021 (BBE microstructural dynamics); lsports.eu blog.
- UNVERIFIED — no access to in-play feed to confirm model feasibility.
- Test path: with pbp archive play-level data, simulate "will this next drive end in score?" binary; price using Black-Scholes analog (time-decay = play-clock decay); backtest against pbp outcomes.

### 3C. Derivative Pricing Analogies (options pricing applied to props)
- What: Sports props priced as options (e.g., prop = call option on yards with strike = line, time-to-expiry = quarters left, volatility = team variance). Quant firms (Susquehanna International Group, 30-person Dublin operation per LinkedIn) apply options-trading models to sports betting; OddsJam founder Alex Monahan (ex-SIG) built from quant trading. Not in our prop-edge work.
- Not covered: Our prop edges (Sports-props-*) use statistical comparison, not options-pricing framework.
- Source: LinkedIn posts on SIG Dublin sports-quant operation; YouTube interview with Alex Monahan (OddsJam); arXiv:2409.13528v2 comparing financial/gambling markets.
- UNVERIFIED for exact SIG model parameters — only public description available.
- Test path: build options-pricing analog for passing-yards prop (strike = line, decay = time-to-end, vol = team std-dev); compare to actual prop movement using pbp archive + line history.

---

## 4) NEW PROCESSES / INDUSTRY STRUCTURE (novelty medium-high; feasibility lower — relies on interviews/filings)

### 4A. Modern Syndicate Operations (post-2023 interviews/filings)
- What: Quant sports syndicates (SIG-style) now operate as options-trading desks applied to betting — 30-person Dublin quant team, market-making rather than picking; OddsJam as quant-exit example. Modern process: automated line-shifting, real-time price discovery, portfolio construction (factor-neutral betting — neutralizing correlation between prop positions so variance = true edge, not portfolio concentration).
- Not covered: Our stack is single-model prediction, not portfolio-neutral syndicate process.
- Source: LinkedIn (SIG Dublin 30-person operation); YouTube (Monahan / OddsJam exit); sports-quant Reddit threads.
- UNVERIFIED — interview claims only; no filing details for syndicate structure.
- Test path: simulate portfolio-neutral construction on falsifyBind — select prop bets such that correlation matrix ≈ identity; compare variance and Sharpe vs unconstrained Kelly portfolio.

### 4B. Academic-Industry Collaborations (real backtests published)
- What: Industry collaborations now publish real backtests: ESPN Analytics / NGS tracking papers; SPIE deep-learning + causal-inference for sports leagues (2026); university-industry partnerships producing public performance metrics. Our repo has internal backtests but no external collaboration framework.
- Not covered: No collaboration pipeline; no external validation protocol.
- Source: ESPN Analytics 2025 tracking paper; SPIE 2026 paper.
- Test path: define open backtest protocol (publish pbp-derived results with falsifyBind harness code) — aligns with repo's falsifyBind philosophy.

---

## SUMMARY RANKING (novelty × feasibility, 1 = highest priority to test)

| Rank | Area | Novelty | Feasibility | Concrete First Step |
|---|---|---|---|---|
| 1 | Tracking metrics (ESPN PBWR/RSWR derivation) | Medium | Very High | Derive blocking-grade from pbp archive; feed falsifyBind |
| 2 | LLM forecasting (negative results) | High | High | Build prompt harness vs XGBoost on pbp archive |
| 3 | Conformal risk control | High | High | Split-conformal wrapper on existing predictions |
| 4 | Exchange / Betfair tick data | Medium | Medium | Request historical data; build tick harness |
| 5 | Micro-betting derivative pricing | High | Low (no feed) | Simulate with pbp archive play-level data |
| 6 | DFL (decision-focused learning) | High | Medium | Small end-to-end backtest vs sequential |
| 7 | Causal / synthetic control (coaching) | Very High | Low | Build synthetic-control over HC-change events |
| 8 | Portfolio-neutral syndicate process | Medium | Medium | Factor-neutral prop selection simulation |
| 9 | GPS/load injury models | Medium | Low (no GPS feed) | Proxy model (snap counts + turf) vs archive |
| 10 | Options-pricing prop analogies | High | Low (no line-tick feed) | Price passes-yards prop with decay model |

---

## BUILD / TEST PATH GIVEN OUR INFRASTRUCTURE (falsifyBind + games harness + pbp archive)

For each high-feasibility item above, the concrete path is:
1. Use `falsifyBind` harness to pull feature from pbp archive (play-level tracking IDs, box scores, lines).
2. Build new feature / model module in the Sports repo's prediction-engine layer (no new external dependency beyond open-source: `scipy`, `numpy`, `pandas`, `scikit-learn`).
3. Backtest against pbp archive historical outcomes; measure calibration (Brier, log-loss) + economic (Kelly profit, Sharpe).
4. Report: verified if numeric result; UNVERIFIED if based only on literature / interview / no feed access.
5. Do NOT git commit / push (per task: no git operations in handoff/research output).

Citations (verified URLs / papers):
- arXiv:2607.24573v1 (LLM-SoccerArena)
- arXiv:2602.04364v1 (Anytime-valid conformal risk control)
- arXiv:2307.13565v4 (DFL review)
- arXiv:2409.13528v2 (Financial vs gambling markets comparison)
- ESPN Analytics 2025 tracking / NGS (espn.com/nfl/story/_/id/46138675)
- HBS case 19-057 (Betfair exchange)
- Cliff 2021 (BBE microstructural dynamics, ideas.repec.org)
- SPIE 2026 (deep learning + causal inference, spiedigitallibrary.org)
- LinkedIn / YouTube sources for syndicate / SIG Dublin / OddsJam (secondary — UNVERIFIED details)
