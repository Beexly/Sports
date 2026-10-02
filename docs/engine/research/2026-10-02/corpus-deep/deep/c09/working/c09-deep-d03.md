# Deep analysis d03 — c09-d12..d17

**Scope:** 21 arXiv deep-read ledgers (0866–1836), the pure-methods undercarriage of the c09 slice. Notable: this chunk contains almost NO direct QB-behavioral, coaching-tendency, or OL-substance research — it is calibration, sizing, market microstructure, NLP intake, weather, DFS construction, score-distribution, and discovery-methodology. That is itself a finding: the intelligence program's stated core (QB behavior, coaching) gets its methods scaffolding here, not its data.
**Date:** 2026-10-02 | **Analyst:** c09 deep coordinator | **Read-only on vendor repo:** yes.

---

## Verified claims

Format: claim — `source:line` — VERDICT.

### Market microstructure (0866, 1359, 1735)
- E[growth] staking formula: E[growth rate] = 2(δ²−σ²)Φ(δ/σ) + 2σδφ(δ/σ) — `arxiv-deep/1748-gambling-under-unknown-probabilities-estimation-error.md:17` — VERIFIED (verbatim in source; ledger adds the δ/σ gate design: stake only if δ_perc > 1.5σ, scale Kelly by Φ(δ_perc/σ), lines 43/49).
- Steady-state whale distortion δ_S = ρΔ_S — `arxiv-deep/1359-manipulation-in-prediction-markets-an-agent.md:20` — VERIFIED.
- Whales need ≈40% of total market capital (ρ_w ≈ 0.4) for meaningful distortion — `1359-manipulation-in-prediction-markets-an-agent.md:32` — VERIFIED, with explicit conditionality: source line 35 ("not a universal 40% — conditional on expertise/herding configuration") and line 41 ("no calibration to real markets") — the threshold is a simulation result, not a market fact.
- Informed-weight identifiability threshold ω₁ ≈ 0.15 — `1735-prediction-markets-bayesian-inverse-problems.md:38` — VERIFIED. Also: δ̂_T ≈ 1.5×10⁻² nats/period (line 37); IG(H_t) saturates at log 2 ≈ 0.693 nats ceiling (line 40); acceptance gate ≥2% log-loss improvement vs unweighted CLV, flag firing 5–30% of games (line 66).
- PredictIt consensus rejected on all four tests; day-trader mean trading profit −$214.71; <1% of 4,452 traders profit >$400 — `0866-informational-content-limit-order-book.md:33` and `:65` — VERIFIED.
- Belief-bound intervals straddle 0.5 for Cruz/Trump; avg transaction prices Cruz 0.52 / Trump 0.39 / Rubio 0.12 — `0866-informational-content-limit-order-book.md:34` and `:37` — VERIFIED. (Note: line 17's different numbers (Cruz 0.45, Rubio 0.07, Trump 0.62) are daily avg prices vs polls; the 0.52/0.39/0.12 are transaction prices — brief's numbers match the transaction-price lines.)

### Score distribution & EP (1801, 1791)
- 491,993 plays / 73,514 drives / 39,083 epochs, nflFastR 2010–2022 — `1801-expected-points-machine-learning-to-statistics.md:12` — VERIFIED.
- Team-quality selection bias: good teams run 32% of plays vs 26% for bad teams; +0.7 pts/drive — `1801-expected-points-machine-learning-to-statistics.md:44` — VERIFIED.
- Weighted XGBoost log-loss 0.7506 vs unweighted 0.7670; coverage ~83–86% point-estimate, cluster bootstrap restores 95.6% — `1801-expected-points-machine-learning-to-statistics.md:45` (table) — VERIFIED. Map's #11 numbers confirmed.
- ZI Skellam AIC 1850.77 beats plain Skellam 1854.39, discrete normal 1855.83, discrete Laplace 1854.42 (2021-22) — `1791-modelling-handball-outcomes-using-univariate-and.md:52` — VERIFIED.
- ZI Skellam outcome calibration 152.02/30.39/123.59 vs observed 153/29/124 and bookmaker 160.63/28.22/117.14 — `1791-modelling-handball-outcomes-using-univariate-and.md:53` — VERIFIED. Plain Skellam 10 draws short (20.66).
- Frank-copula half model (38 params) AIC 3279.47 beats independence 3324.09; half-difference correlation 0.13 — `1791-modelling-handball-outcomes-using-univariate-and.md:54` — VERIFIED.

### Tournament/DFS construction (1761, 1349, 1473)
- SCO earns +$214.33/hand over ICM; favored in 2,433 of 2,838 decision units (85.7%); jam-frequency shift 14.08% avg, 32.42% at button — `1761-icm-out-better-tournament-strategy-continuations.md:40-42` — VERIFIED.
- Dominance pruning: ~10^23 → ~7×10^7 combinations; optimal-team points logarithmic in budget (budget 500 → 1,182 pts; 1000 → 2,178 pts); 72% of 385 optimal teams diverse; 11 of 12 other variables diverse — `1349-diversity-is-key-fantasy-football-dream.md:34,35,37` — VERIFIED.
- FPL time-series paper: claimed 3,718-point dream team; overforecast by 87 points; per-player best RMSEs at 60/40 (Vardy 2.539) and 30/70 (Sagna 2.013), contradicting the chosen common 40/60 blend — `1473-time-series-modeling-for-dream-team.md:28-30` and `:16,25` — VERIFIED (the brief's flag of this internal contradiction is itself verified in source lines 16 and 25).

### Ratings (1447)
- Least squares strictly better MSE/MAD than USAU every season/division 2014–2019; ~0.25 points closer per game — `1447-soccer-match-prediction-deep-learning-feature-optimization.md:29,30` — VERIFIED.
- 2014 Men's: USAU wrong on "nearly a quarter of all games" — `1447-soccer-match-prediction-deep-learning-feature-optimization.md:31` — VERIFIED.
- Evaluation is retrodictive (fit on full season, "predict" same games) — `1447-soccer-match-prediction-deep-learning-feature-optimization.md:37` — VERIFIED (ledger itself flags this; honest test = walk-forward).
- Slug/content mismatch confirmed in source — filename says "soccer-match-prediction-deep-learning-feature-optimization," content is Sietsema (2022) USA Ultimate frisbee least-squares study. Already flagged in map §5.

### NLP intake trio (1594, 1722, 1308)
- Fine-tuned BERT 99.8% accuracy held-out, 92% on new-source commentaries; SVM tf-idf F1 0.85 (97.30% acc) vs Minard baseline 0.71 — `1594-analyzing-sports-commentary-to-recognize-events.md:26` — VERIFIED, with the leakage caveat in source line 23/32: shuffled 80/20 split means same-game sentences in train and test; 92% is the honest generalization number.
- T3 (Text–Tuple–Table) +20.6 pp accuracy / −62.8% RMSE over ZS-CoT — `1722-moneyball-llms-tabular-summarization-sports-narratives.md:44` — VERIFIED. Masking dismissal summaries collapses Gemini 86% → 49% (line 46) — VERIFIED; "reasoning" was partly extractive cue-matching.
- Mistral-7B full stack 76.1/64.2 vs GPT-4 full stack 80.2/70.3; 132,150 German tweets; κ=0.68; against-class n=15 — `1308-onelove-few-shot-topic-sentiment-pipeline.md:11,26` — VERIFIED.

### Weather pair (1493, 1581)
- Pangu Z500 5-day RMSE 296.7 vs IFS 333.7 vs FourCastNet 462.5; inference 1,400ms, >10,000× faster than IFS; cyclone 3-day position error 120.29 vs 162.28 km — `1493-pangu-weather.md:28` — VERIFIED.
- LightGBM surrounding-grid: precip RMSE 2.344 (MSM 2.759), temp 1.335 (MSM 1.811), wind 1.052 (MSM 1.999); FS1–FS3 added nothing over FS0 τ=0.9 — `1581-postprocessing-weather-forecasts-ml-feature-selection.md:38,40` and `:19` — VERIFIED.

### Selection/gating & combination (1777, 1463, 0888)
- SCoRE: n=1000 calibration / m=100 test / 100 runs; nominal risk 0.05–0.5; e-value condition E[L·E] ≤ 1; weighted covariate-shift extension — `1777-conformal-selective-prediction-general-risk-control.md:11,16,19,22` — VERIFIED.
- NSGA-III knee dominates single-objective weights on opposing objective; M5 28,903 series used, 60.1% zeros — `1463-multi-objective-probabilistic-forecast-combination.md:11,32` — VERIFIED. Note: exact cost tables NOT transcribed in the ledger (source line 32 says directional result only) — treat cost magnitudes as UNVERIFIED, the dominance direction as verified.
- PLRank Yahoo NDCG@10 0.7902–0.7903 vs LambdaMART 0.7809; industry-tuned 0.802 vs 0.796; McRank 250+h vs PLRank 126h — `0888-plackett-luce-learning-to-rank.md:36-44` — VERIFIED.

### Threat/injury (1813, 1483)
- Chelsea GoT₉₀: Hazard 14.2 (2.02), Kanté 6.2 indirect 4th, Moses 5.7, Pedro 5.5; simulation: 600 min → 0.4% FP rate, 18.6% rel. Γ error — `1813-generation-of-threat-hawkes.md:49,55` — VERIFIED. Ligue 1 surprises Berthomier 9.34 / Moses Simon 8.79 / Guilbert 8.42 — VERIFIED (line 57).
- Projective-geometry injury case study: n=2 bowlers, 120 Hz; Bowler B S3 cosine → 0 ~15 ms before release — `1483-projective-geometry-for-human-motion-with.md:11,34` — VERIFIED, with the workload confound acknowledged in source (line 35).

### Discovery methodology (1826, 1836)
- Likelihood-only selection NEVER puts truth in top two; LM prior wins on Korns-7 with fewer points; plain MDL top functions include unphysical x^x forms, eliminated by LM prior — `1826-priors-for-symbolic-regression.md:36,39,40` — VERIFIED.
- RSRM 100% Nguyen-1..10 recovery over 100 runs (sin(x1²)cos(x1)−1: DSR 72%, GP 12%) — `1836-rsrm-reinforcement-symbolic-regression-machine.md:31` — VERIFIED. Benchmark saturation caveat in source line 40 — VERIFIED.

---

## Cross-file connections

### A. The market-skepticism triplet (0866 ↔ 1359 ↔ 1735) — strongest internal cluster
Three independent arrivals at "the line is not the truth," each a different diagnostic layer:
- **0866** (PredictIt, empirical): consensus diagnostics reject information aggregation — volume spikes at end, no one-sided accumulation, trivial algo beats day traders (−$214.71 mean). Cautionary: *prices ≠ consensus beliefs*.
- **1359** (ABM, synthetic): the mechanism — whale capital share ρ times bias Δ_S = steady-state distortion, ~40% threshold (parameter-conditional). Actionable: *who moved the line and how much capital did it take*.
- **1735** (Bayesian inverse, synthetic): the informativeness score — IG(H_t) = KL(posterior||prior) weights each move's CLV; ω₁ < 0.15 flags non-identifiable (noise/manipulation-driven) moves. Actionable: *how much weight this move's CLV deserves*.
These compose into one **Market Informativeness Gate**: 0866's diagnostics decide whether a market is a belief aggregator at all; 1359's ABM re-parameterized on Pinnacle line-move history flags whale-driven steam; 1735's IG weights CLV per game. Reinforcement with the map: extends CL1–CL9's CLV referee (c09-d22) and complements 1731's structural volatility model (1731 forecasts move *scale*; 1735 scores move *information content* — explicitly cross-referenced in both ledgers). INFERENCE: this triplet is the quantitative answer to the map's §4 gap 1 — Garrett's Oct 1 Rodgers-video lesson was about news-driven trust signals; the market gate is the other half (market-driven signals), and the two compose: news-stance (1308/1722/1594 below) × market-informativeness (0866/1359/1735).

### B. The sizing/selection stack (1748 → 1463 → 1777) — build-order chain
- **1748** names σ = the engine's probability-estimation RMSE as the missing link between calibration and staking: positive expected growth requires δ ≳ σ; the δ/σ gate + Φ(δ/σ) Kelly scaling.
- **1463** moves the money objective *into* the ensemble combination itself: linear CDF pool weights optimized jointly on DRPS and simulated Kelly bankroll growth via NSGA-III, Pareto knee. This is a strict extension of 0791 (decision-objective weighting) — the map's sizing chain 0791→0813→0834→1748→1463 now reads: weights (0791) → multi-pick Kelly (0813) → drawdown (0834) → error gate (1748) → joint calibration+bankroll combination (1463).
- **1777** (SCoRE) gates the *posted card*: finite-sample guarantee on average realized unit loss of selected picks, with covariate-shift weighting for early/late-season drift.
Connection: σ in 1748 comes from the same calibration history that 1463's DRPS objective uses; 1777's e-value screen consumes the gate scores from 1748/1463 as the selection statistic. These three are one subsystem with a shared calibration data structure (rolling graded picks with realized loss).

### C. The NLP trust-signal intake trio (1594 ↔ 1722 ↔ 1308) — the QB-availability lane
- **1594** gives the sentence-classification recipe (DeBERTa on beat-writer sentences → P(player misses next game | sentence)), with the honest F1/accuracy numbers after correcting for its own temporal leakage (use 92%, not 99.8%).
- **1722** gives the structuring recipe: T3 Text→Tuple→Table with evidence spans and conflict flagging — the extraction of (player, body part, mechanism, status, timeline) tuples into the injury table, with anonymization-perturbation as the anti-hallucination check.
- **1308** gives the monitoring recipe: BERTopic topic discovery + few-shot stance classifier with a ~150-tweet gold set, 76.1/64.2 as the adopt bar, minority-class F1 ≥ 0.55.
Reinforcement: the brief for 1722 explicitly names 1594's ledger (1715 KEE segmentation, outside this chunk) as its composition partner — the intake pipeline is classification (1594) → extraction (1722) → monitoring (1308), all feeding the event bus. This is the most QB-adjacent content in the chunk (QB availability) and the natural home for the map's §4 gap 1 (trust-signal intake) once extended to social/video quote mining.

### D. Weather lane pair (1493 ↔ 1581)
- **1581** is the near-term build: LightGBM surrounding-grid postprocess on HRRR for 30 stadiums, FS0 τ=0.9, ≥10% wind / ≥5% temp RMSE beats. Deterministic, ~1 week.
- **1493** contributes two ideas the ledger explicitly says transfer: (1) hierarchical temporal aggregation — direct 1/2/4/8-week projection heads greedily composed, vs iterating a 1-week model; (2) RQE tail metric to audit wind-underestimation and tail-weight the totals weather loss. The RQE audit is the bridge between them: run 1493's RQE on 1581's HRRR postprocess output to check whether the deterministic recipe systematically underpredicts extreme wind.
Connection to map #10 (kneel/garbage-time model): weather + end-state are the two totals adjustments with known systematic bias direction.

### E. Score-distribution pair (1801 ↔ 1791)
- **1801** fixes the *input* (EPA/EP pipeline: team-quality tilt, drive dependence, overfitting, uncertainty) that feeds margin/spread models.
- **1791** provides the *output distribution*: ZI-Skellam2 for margins with push mass at Z == spread, plus the Frank-copula half model for halftime-conditional P(win)/P(cover)/P(over) — the live-betting surface.
Composition: 1801's cluster-bootstrapped EPA CIs become the uncertainty input to 1791's margin-parameter estimation. The map's uncertainty chain (0503 → 0473 → 2142 → 1777) gains a companion: 1801 (drive-clustered) and 1791 (margin-distribution) are the football-specific instances of the generic resampling (0503) and selective (1777) machinery.

### F. DFS construction trio (1349 ↔ 1761 ↔ 1473) — tension identified
- **1761** (SCO continuation pricing: expected prize, not expected score) and **1349** (dominance pruning + diversity heuristic) are complementary optimizer upgrades.
- **1473** is the weak member: its internal contradiction (selected 40/60 blend vs per-player-optimal 60/40 and 30/70) and uncredible 3,718-point claim make it the cautionary example, not the template — its forecast→ILP architecture is the only portable part, and ledgers 1090/1091/1092 already cover optimizer construction.
Tension: 1349's diversity heuristic (72% of ex-post optimal teams diverse) and 1761's continuation pricing both push lineups away from pure max-projection, but from different directions (spread exposure vs payout-ladder expectation) — they should be tested as competing constraints, not stacked blindly.

### G. Discovery pair (1826 ↔ 1836)
- **1836** (RSRM): search-side — reward-distribution pruning of the island model (kill hopeless islands, save LLM calls) + sub-tree motif mining → operator vocabulary growth.
- **1826** (LM prior): selection-side — rank discovered formulas by −log P(f) − log Z with a sports-equation n-gram prior replacing the physics corpus, demolishing likelihood-only selection.
Composition: 1836 proposes candidates, 1826 selects among them. The 1826 ledger's own warning (Korns-7 win was luck — physics prior on sports data is domain mismatch) means the sports corpus (passer rating, QBR, EPA, DVOA, Elo, Pythagorean) must be built BEFORE any GSE-SR ranking uses it.

### H. Ratings lane (1447 → map's rating upgrades)
1447's LS rating (`r̂ = (AᵀA)⁻¹Aᵀb`) slots into the map's rating-layer build order (LS/Elo/KRC/phantom-player → HFA → GLMM) as the interpretable spread-head baseline. Its design rule — every constant data-estimated, never hand-picked (the sine-formula teardown) — should be written into the ratings module's acceptance criteria. Cross-ref: 1447's ledger pairs it with 1449 (theory) and 1446 (ordinal/win-prob heads), contrasts 1448 (G-Elo, online probabilistic).

### I. Contradiction with slice / reinforcement with map
- **1748's gate philosophy vs map #13 (confidence resolution ≈ 0):** consistent, not contradictory. Map #13 says self-reported confidence has ~zero resolution (AUC 0.4965) — 1748 says stake on δ/σ where σ is measured calibration RMSE, not on self-reported confidence. The δ/σ gate is the constructive replacement for the dead confidence input.
- **1735's flag regime vs 0866:** 0866's "market provides no more info than public" is the empirical warning; 1735's ω₁ < 0.15 flag operationalizes when to act on it per game. 0866 is the doctrine, 1735 is the dial.
- **1308's stance framing vs 1594's sentiment negative result:** 1594 found generic sentiment adds "very limited information" (author's conclusion, source line 26); 1308's stance-detection framing (κ=0.68) is the answer — the chunk contains its own correction, no contradiction.

---

## Challenges

### Method problems (ledger-attested)
- **1473:** internal contradiction verified in source (lines 16, 25, 28-30): the selected "common" 40/60 ARIMA/LSTM blend is suboptimal for the paper's own two worked examples (60/40 and 30/70 better). The 3,718-point dream team is not credible vs real FPL winning scores; ledger flags likely target leakage. No rolling-origin backtest, no naive baselines, missing appearances zero-filled. Verdict: ADAPT the forecast→ILP architecture only, nothing else. **Would not bet on the paper's numbers.**
- **1594:** temporal leakage verified in source (line 23, 32): shuffled 80/20 split puts neighboring same-game sentences in train and test; 97.3%/99.8% accuracies are inflated; the honest generalization figure is 92% on new sources. The GSE spec in the ledger correctly mandates season-ordered splits. Formulaic templates ("Yellow card for X") further inflate. **Use 92%, never 99.8%.**
- **1447:** retrodictive evaluation verified (line 37) — ratings fit on the full season then scored on the same games measures fit quality, not forecasting skill. The ledger's acceptance gate correctly demands walk-forward. Slug/content mismatch (soccer slug, USAU frisbee content) is a cataloging hazard for future readers.
- **1483:** n=2 case study (line 11, 35), workload confound explicitly acknowledged (B bowled since childhood, A a recent recruit), axis-choice dependence, redundancy→injury link is "a hypothesis, not an established causal effect" (line 41). The NGS participation-ratio analog is an INFERENCE — a long leap from cricket-bowling Plücker coordinates to football tracking. High variance of opinion on whether this is worth the NGS effort; the holdout OR>1 gate is the right skepticism instrument.
- **0866:** two markets only (Iowa caucus, SCOTUS decision), 4,452 traders, private data — the "markets don't aggregate" conclusion is domain-limited (political binary markets with known outcomes vs sports lines with limits and arbs). Directional caution is justified; the specific diagnostics port, the specific statistics don't.

### Second-hand / synthetic-claim provenance
- **1359:** the ~40% threshold is explicitly conditional on an arbitrary parameter set (100 homogeneous high-expertise agents); source lines 35 and 41 state no real-market calibration. Betting into or fading lines on a 0.4 rule would be superstition until re-calibrated on Pinnacle steam data. The δ_S = ρΔ_S relation is the portable part, the number is not.
- **1735:** synthetic-only; ledger notes §5 claims "synthetic and real" but all extracted experiments are synthetic (line 34). Assumption 3.1 rules out volatility clustering / order-flow persistence (authors' own admission) — precisely the phenomena that dominate sports line moves. The ω₁ ≈ 0.15 threshold must be re-estimated on real odds data before any flag fires; the ledger's acceptance gate (5–30% firing rate) correctly encodes this as a transfer test, not a fact.
- **1761:** poker domain (3-player jam/fold, $1M pool); the $214.33/hand gap is measured against an ICM-priced control in a fully enumerated 946-state game — a clean isolation, but DFS payout ladders have 100k+ entrants, duplicate lineups, and top-heavy payouts the poker model doesn't have. The continuation-pricing *principle* ports; the 14.08%/85.7% numbers do not transfer to DFS.
- **1826:** the Korns-7 LM-prior win is, per the ledger itself (line 46), arguably luck — the truth "happened to look scientific." A physics-trained prior applied to sports equations is exactly the domain mismatch the authors warn about. The sports corpus must be built first; until then, the method is a design sketch, not a validated tool.
- **1836:** Nguyen/Livermore are "saturated, low-dimensional benchmarks; 100% recovery is less impressive than it looks" (source line 40). RL/MCTS machinery vs GSE's LLM+evolution stack — only the two portable ideas (reward-distribution pruning, operator invention) survive the transfer.
- **0888:** web-search domain only, no sports validation; the "200 features for NDCG@1" instability rule is Yahoo-2010-specific. The loss-function idea ports; the numbers are baselines for the GSE backtest, not guarantees.

### Overfit / transfer risks
- **1349:** oracle by construction (end-of-season point totals = hindsight). The 72% diversity regularity is an ex-post property of optimal teams, not a property of prospectively-built lineups. Testing a diversity constraint prospectively (the ledger's spec) is the right experiment, but the 72% number itself is not evidence it will work — it is evidence it *could* have worked with a crystal ball. **INFERENCE:** the parallel drawn to DK GPP ownership-diversification dynamics is suggestive but unproven; soccer FPL ≠ NFL DK (different salary structure, different variance sources).
- **1463:** exact cost tables not transcribed in the ledger — the NSGA-III advantage is directional, not quantified here. NSGA-III is heavy machinery for a low-dimensional weight vector (source line 39: "simpler scalarization may reach the same knee cheaper — not ablated"). Fixed single validation window with no refit-cadence study (source line 58 proposes the fix). Nonstationarity is the main risk: a Pareto knee fit on one season's (DRPS, cost) landscape may not hold next season.
- **1493:** NWP does not transfer to sports prediction directly — the ledger is explicit (verdict: adapt only the chaining pattern and RQE). The "greedy multi-week composition" idea is untested on nflverse; the acceptance gate (horizon-8 cumulative RMSE) is the honest transfer test.
- **1581:** fitted models are JMA-MSM/Japan-specific; recipe transfers, models don't. Deterministic only (no uncertainty — pairs with ledger 1580's ANET2 probabilistic model, outside this chunk). Hyperparameters tuned on one site then applied everywhere; site-dependent Tweedie performance.
- **1813:** proprietary StatsPerform data (no public code); set-piece crosses excluded; team-strength confounding (Hazard's GoT partly reflects Chelsea's system); "threat" defined on a 50%-width × 25%-length danger area — NFL analog (red-zone entry / explosive play) needs its own definition and the 600-min stability threshold must be re-estimated for NFL event density.
- **1722:** T3 has "best average accuracy, worst tail behavior" without safeguards (degenerate repetition, cumulative hallucination on GPT-4.1/Llama-3.3); basketball anonymization collapse (Gemini 62% → 35%) shows entity-name dependence — for NFL injury extraction this means the pipeline may lean on player-name priors rather than the text, exactly backwards for breaking news. The ledger's safeguards (evidence spans, conflict flagging, anonymization-perturbation check) are load-bearing, not optional.
- **1308:** German-only; against-class n=15 (too small to trust the 0.697 AUC); X demographics unrepresentative; dehydrated dataset needs paid API; replies/quotes excluded (which is where stance actually lives in rumor threads — INFERENCE: excluding quotes may systematically miss the signal).
- **1748:** even-odds + small-δ approximations; Kelly a=2δ specific to even odds; normal ξ assumed not estimated; p_true bounded away from 0/1 excludes longshot props; no correlation across simultaneous bets. The ledger mandates re-derivation for general decimal odds before deployment — that is the first build step, not a footnote.
- **1777:** exchangeability of calibration/test points is fragile in sports (early-season vs late-season regime drift); the weighted extension needs a density-ratio estimate that is itself a modeling problem; "bounded loss" fits singles (bounded by stake) but parlays/combos need re-bounding. SCoRE on a 1,663-pick calibration set (map #13) is the natural pilot.

### INFERENCE-marked speculation in this report
- **INFERENCE:** 0866 + 1359 + 1735 compose into one Market Informativeness Gate — the composition is my design, not stated in any single ledger.
- **INFERENCE:** the RQE audit (1493) on 1581's HRRR postprocess output — a proposed cross-application, not in either ledger.
- **INFERENCE:** 1483's participation-ratio NGS analog is a long leap from cricket bowling kinematics; treat as hypothesis with the OR>1 holdout gate.
- **INFERENCE:** 1349's diversity regularity parallels DK GPP ownership-diversification dynamics — unproven across domains.
- **INFERENCE:** the NLP trio (1594→1722→1308) is the natural home for the map's trust-signal gap 1 (social/video quote mining) — the ledgers cover text intake; video/audio quote mining is an extension.
- **INFERENCE:** the δ/σ gate (1748) is the constructive replacement for the dead self-reported-confidence input (map #13) — both measure "how much to trust an edge," but σ is measured, confidence is not.

---

## Buildable systems

Ordered by intelligence-program priority (trust signals, calibration, uncertainty, sizing, then supporting machinery). Each: component, inputs → method → output, acceptance gate.

### 1. Market Informativeness Gate (0866 + 1359 + 1735 → CLV firewall)
- **Inputs:** intraday price/volume paths per game (The Odds API), Pinnacle steam-move history, game-level CLV signals.
- **Method:** (a) 0866 consensus diagnostics — line-move vs ticket divergence, late-vs-early move predictive power via KS test; (b) re-parameterized 1359 ABM (agents = sharps/recreational/steam-chasers; whale = syndicate/steam group), herding/learning calibrated from Pinnacle history, flag moves with implied distortion δ_S = ρΔ_S over threshold; (c) 1735 IG-weighting — IG(H_t) = KL(posterior||prior) per game, ω̂₁ < 0.15 flags non-identifiable line histories (do not update fair price).
- **Output:** per-game informativeness score + flag set {consensus-fail, whale-distorted, non-identifiable}; IG-weighted CLV stream.
- **Acceptance gate:** IG-weighted CLV beats unweighted CLV by ≥2% log-loss on 2025 holdout with the ω̂₁ flag firing on 5–30% of games; whale-flagged moves reverse ≥10 pts more often than size-matched unflagged moves over a full NFL season AND the fade portfolio is profitable after vig. (Gates from ledgers 1735:66 and 1359.)

### 2. δ/σ Staking Gate (1748)
- **Inputs:** engine win probability p_engine, market-implied p_market, rolling calibration history per market type.
- **Method:** σ = RMSE of engine win-prob vs realized outcomes on rolling window (per market type / edge bucket); δ_perc = p_engine − p_market; stake only if δ_perc > 1.5σ; scale Kelly fraction by Φ(δ_perc/σ); re-derive (16)–(17) for general decimal odds numerically first; improvement experiment: replace normal ξ with empirical error distribution (bootstrap calibration residuals) — heavy-tailed longshot errors may push the gate stricter.
- **Output:** per-pick {stake_flag, kelly_fraction_scaled}.
- **Acceptance gate:** gated Kelly beats ungated on 2023–2025 terminal log growth with max drawdown no worse; improvement concentrated in picks with δ_perc/σ < 1.5. REJECT if it just discards good bets (growth drops).

### 3. Dual-Objective Ensemble Combiner (1463)
- **Inputs:** per-model predictive distributions over NFL outcomes (spread/ML/total), rolling validation season.
- **Method:** linear CDF pool F(x) = Σᵢ wᵢ Fᵢ(x); NSGA-II/III (pymoo) jointly optimizes (DRPS/log-loss, Kelly-simulated bankroll growth with 0.25-fraction cap); deploy Pareto knee; rolling-origin refit every 4 weeks on trailing 12 weeks (ledger line 58's fix for the fixed-window limitation); if knee unstable, Dirichlet-prior regularization centered on previous knee.
- **Output:** per-period ensemble weight vector + knee diagnostics.
- **Acceptance gate:** on 2024 test season, knee-weight ROI ≥ log-loss-optimal weights' ROI while log-loss stays within 2% of log-loss-optimal.

### 4. SCoRE Posted-Card Gate (1777)
- **Inputs:** trailing graded picks with realized unit loss; existing gate scores as selection statistic.
- **Method:** risk-adjusted e-values (E[L·E] ≤ 1 condition); threshold at target nominal average-loss level; weighted extension (density-ratio reweighting) for early/late-season covariate shift; reference code github.com/Tian-Bai/SCoRE.
- **Output:** post/abstain decision per candidate pick with a finite-sample guarantee on the posted card's average betting loss.
- **Acceptance gate:** on the 1,663-pick graded set (map #13), selective risk controls at nominal level across 0.05–0.5 in walk-forward; more picks selected than Hoeffding/Rademacher baselines at strict levels (power check).

### 5. EP Pipeline Repair Kit (1801)
- **Inputs:** nflFastR play-by-play; pre-game point spreads; drive identifiers.
- **Method:** four drop-in fixes — (1) team-quality covariate evaluated at spread 0 (neutral EP); (2) 1/N_i row reweighting for within-drive dependence; (3) cluster bootstrap (by drive, B=100) for all EPA CIs; (4) catalytic prior (M=500k synthetic states, tune φ) smoothing the EPA GBM toward a penalized multinomial logistic.
- **Output:** bias-corrected EP/EPA with honest cluster-bootstrapped intervals.
- **Acceptance gate:** weighted log-loss 0.7506-beating baseline on M=100 one-play-per-drive subsample tests; cluster bootstrap coverage 95.6% ± band; no EP-vs-spread monotonicity artifacts at φ=1.

### 6. ZI-Skellam2 Margin + Halftime Live Model (1791)
- **Inputs:** NFL margins, team home/away abilities, halftime differentials.
- **Method:** Skellam2(μ, σ²) regression on margin with μ linear in home/away team abilities; zero-inflation parameter p repurposed as push mass at Z == spread; discrete-distribution AIC bake-off (Skellam / ZI-Skellam / discrete normal / discrete Laplace) on NFL margins; Frank-copula bivariate half model for halftime-conditional P(win)/P(cover)/P(over).
- **Output:** full margin distribution per game; live halftime-conditional probability surface.
- **Acceptance gate:** AIC ≥ 10 over nearest competitor on NFL margins; push-rate calibration within 0.5pp; copula model preferred by AIC over independence.

### 7. Injury-Trust NLP Intake Pipeline (1594 → 1722 → 1308)
- **Inputs:** beat-writer sentences, game-day X windows, injury-report labels (season-ordered).
- **Method:** (a) 1594: fine-tune DeBERTa-v3-base on P(player misses next game | news sentence), season-ordered splits (never shuffled); (b) 1722: T3 Text→Tuple→Table with evidence-span tuples + rule-based compiler + conflict flagging for human review, injury-tuple schema first (player, body part, mechanism, status, timeline), HOI within ±5pp, anonymization-perturbation check mandatory; (c) 1308: BERTopic + few-shot stance classifier on game-day X windows, ~150-tweet gold set per event type.
- **Output:** injury/availability table rows with evidence spans + stance time-series feeding the event bus 15–60 min ahead of market moves.
- **Acceptance gate:** stance accuracy ≥ 70% with minority-class F1 ≥ 0.55; T3 cell accuracy ≥ 0.85 on injury-tuple schema; ≥55% of designation changes anticipated ≥30 min ahead of the market (n ≥ 50). Honest accuracy numbers only — 92% class, never the leaked 99.8%.

### 8. Weather Postprocess + Tail Audit (1581 + 1493)
- **Inputs:** HRRR (3 km, US) forecasts for 30 NFL stadiums; NOAA station observations; game-time realized conditions.
- **Method:** (a) 1581: LightGBM per variable on 11×11 surface + 7×7 pressure windows, FS0 τ=0.9, Optuna on one representative stadium, weighted-Tweedie precipitation head; (b) 1493: RQE audit (Σ_d (Q̂_d − Q_d)/Q_d over D=50 log-spaced percentiles 90%→99.99%) of wind forecasts vs realized, tail-weighted loss re-fit of the totals weather adjustment; (c) test direct multi-week projection-head chaining vs iterated 1-week chaining on nflverse backtests (the hierarchical-temporal-aggregation transfer).
- **Output:** calibrated kickoff weather per stadium; tail-aware totals adjustment.
- **Acceptance gate:** LightGBM beats raw HRRR by ≥10% RMSE on wind AND ≥5% on temperature on 2023 holdout; RQE audit documents wind underestimation, then tail-weighted re-fit improves extreme-wind-game totals log-loss.

### 9. DFS Optimizer Upgrades (1349 + 1761)
- **Inputs:** weekly projections, salaries, ownership estimates, payout ladders.
- **Method:** (a) 1349: three-step dominance pruning on (projection, salary, ownership) triples as MILP preprocessor; (b) 1761: SCO-style continuation-value pricer — expected prize = Σ_s P(lineup scores s)·payout(rank(s vs field)), replace "max expected score" with "max expected prize" via local search; (c) 1349: bin-diversity constraint as competing (not stacked) heuristic vs continuation pricing.
- **Output:** GPP lineup sets maximizing expected prize with diversity exposure.
- **Acceptance gate:** pruning yields exact optima on all test slates with ≥10× solver speedup; continuation-priced lineups beat max-score lineups on realized GPP ROI over a season; diversity constraint tested prospectively (not on the ex-post 72%).

### 10. LS Rating Module (1447)
- **Inputs:** game score differentials, schedule matrix.
- **Method:** sparse `r̂ = (AᵀA)⁻¹Aᵀb` (scipy.sparse.linalg.lsqr), mean rating anchored at 0 weekly; feed LS rating differentials into the spread head alongside Elo; ranking-violation rate as standing diagnostic; cap-normalization trick for capped formats; design rule: every constant data-estimated, never hand-picked.
- **Output:** weekly LS ratings + diagnostics.
- **Acceptance gate:** NFL 2019–2023 walk-forward LS spread-MAE ≤ GSE Elo spread-MAE + 0.1 AND LS ranking-violation rate ≤ Elo's.

### 11. Listwise Pick Ranker (0888)
- **Inputs:** slate candidate bets with features; graded relevance = realized CLV/profit bucket.
- **Method:** PL/ListMLE listwise loss inside gradient-boosted trees (slate = query, candidate bet = document); boosted trees preferred over linear ListMLE when feature count is small relative to slate size (instability rule).
- **Output:** per-slate ranked pick list.
- **Acceptance gate:** backtest NDCG@10 + top-decile realized ROI vs pairwise ranker; accept on ≥0.005 NDCG@10 gain or higher top-decile CLV, p < 0.1.

### 12. Hawkes Sequence-Credit Engine (1813)
- **Inputs:** NFL event streams (ball touches by player/position dimension + threat dimension = red-zone entry / explosive play).
- **Method:** 12-dimension Hawkes with exponential kernels, common decay β, per-dimension-separable MLE; four GoT indices (direct, indirect via (I−Γ)⁻¹, per-90, ablation counterfactual); ~600 min of stable-personnel data as the estimation floor (re-estimate for NFL event density).
- **Output:** per-player GoT₉₀ rankings surfacing hidden threat generators (TEs/FBs/decoys) for projection models and weekly DFS packet content.
- **Acceptance gate:** simulation-validated link FP rate < 1% at the chosen window; GoT rankings stable across halves of season and predictive of red-zone target share YoY.

### 13. Symbolic-Regression Governance (1826 + 1836) — builder tooling, not engine
- **Inputs:** GSE-SR discovered programs.
- **Method:** (a) 1836: reward-distribution-guided island pruning (kill hopeless islands, save LLM calls) + sub-tree motif mining (min support 10%, top-3 → named operators); (b) 1826: build the ~100–200-formula sports corpus (passer rating, QBR, EPA, DVOA, Elo, Pythagorean) → train n-gram LM prior → rank PySR candidates by −log P(f) − log Z.
- **Output:** shorter, more physical discovered formulas; operator vocabulary growth.
- **Acceptance gate:** equal-or-better OOD NMSE with ≥20% shorter median expressions; top-3 LM-prior picks beat best-fit selection by ≥10% held-out RMSE.

### 14. Movement-Redundancy Injury Flag (1483) — speculative, gated hard
- **Inputs:** NGS tracking per player-game (displacement vectors binned by direction/speed/change-of-direction → movement-repertoire matrix).
- **Method:** effective rank / participation ratio of repertoire covariance as the redundancy analog; flag rolling 4-week redundancy drops concurrent with maintained snap share/workload.
- **Output:** elevated soft-tissue injury risk flags (hamstring/groin/calf).
- **Acceptance gate:** bottom-decile redundancy drops associate with elevated subsequent injury incidence (OR > 1, 95% CI excluding 1, workload-adjusted) on a hold-out season. **This is the lowest-confidence build in the chunk — n=2 origin, workload confound, long inference chain. Do not build without the holdout test designed first.**

---

## Integration notes

### Unified intelligence API: cross-module contracts
The chunk implies (does not state) an integration surface. INFERENCE: the following contracts would let these modules compose as one callable intelligence API:

1. **Fair-price update protocol (market gate → engine core).** Modules 1–3 and the CL1–CL9 cards (c09-d22) need a shared contract: every external signal (line move, news item, model update) arrives as `{signal, source, as_of, informativeness_weight}`. The 0866/1359/1735 gate owns `informativeness_weight`; 1735's ω̂₁ < 0.15 flag is a hard "do not update" veto. The as-of quarantine ruler (c09-d32, map #19) applies: `assertObservedAtOrBefore` on every input. Ordering: market-informativeness check runs BEFORE any fair-price update, never after.

2. **σ as a first-class engine output.** 1748's σ (probability-estimation RMSE by market type / edge bucket) is consumed by the δ/σ gate (2), the NSGA-III DRPS objective (3), and SCoRE's loss history (4). One rolling calibration store feeds all three — the calibration-over-accuracy doctrine (map §3) is the shared invariant. Implication: the engine's probability stack must emit calibrated distributions with provenance (which calibration map, which window), not point probabilities.

3. **Selection as a separate layer from ranking.** 0888 (rank the slate) and 1777 (gate the posted card) are distinct operations with distinct guarantees: ranking optimizes NDCG/top-decile CLV; selection controls average realized loss with a finite-sample guarantee. The qi-check Hold ≥9.2 gate (x-poster skill) is the human analog — SCoRE is its statistical counterpart. Do not collapse ranking into selection.

4. **Trust-signal → availability → adjustment ordering.** Pipeline 7 (NLP intake) produces injury/availability tuples with evidence spans and as-of timestamps; these feed the adjustment layer (map build-order suggestion #6: rule-shape contract d25 + scalarizer d34) as `availability_delta` inputs. The 1594→1722→1308 chain's output schema must match the adjustment layer's intake schema — contract to define: `{player_id, status, probability, as_of, evidence_spans[], conflict_flags[]}`. QB availability is the highest-leverage row in this table (QB-BEHAVIOR relevance: a QB's status dominates all other availability signals).

5. **Weather and end-state are the two systematic totals adjustments.** Pipeline 8 (weather postprocess + RQE tail audit) and the kneel/garbage-time model (map #10, c09-d22) both correct known directional biases in totals. They compose additively and must be estimated jointly (weather and garbage time interact: bad weather suppresses scoring AND changes kneel probabilities — INFERENCE, test don't assume).

6. **DFS pipeline data flow.** Projections → 1349 dominance pruning → MILP → 1761 continuation pricing (expected prize, not expected score) → 1349 diversity constraint (competing, not stacked) → SCoRE-style selection (1777 analog: control the posted lineup set's average realized loss — INFERENCE, the ledger doesn't state this but the method ports). The 1473 TS-forecast→ILP architecture is superseded by the existing optimizer (1090/1091/1092) plus these upgrades.

7. **Discovery governance as the anti-overfit layer.** Pipelines 13 (1826 + 1836) sit ABOVE the engine's discovery loop: every discovered formula passes through LM-prior ranking before promotion, and the island model self-prunes via reward-distribution screening. This is the institutional answer to the map's §4 gap 7 (contradiction debt / second-hand claims): discovered claims get a selection procedure, not just a ledger verdict.

8. **Uncertainty chain composition.** The map's chain (0503 game-clustered bootstrap → 0473 MIS/quantile → 2142 AC-RAC → 1777 SCoRE) plus this chunk's 1801 (drive-clustered EP) and 1791 (ZI-Skellam margins) form the football-specific uncertainty stack: resampling standard = cluster by game/drive (never i.i.d. play-level); output distributions = Skellam-family margins; decisions = SCoRE-gated. One resampling standard across modules (map §3's flagged inconsistency) is the integration requirement: pick game-clustered as the default, document deviations.

### What this chunk does NOT give the intelligence program (gaps to carry forward)
- **QB behavior:** nothing direct. The closest is pipeline 7's QB-availability rows and 1813's sequence-credit (which could credit QBs for threat generation through chains — INFERENCE, untested). The map's #1 data gap (clean-vs-pressured splits, c09-d37) remains unfilled by anything here.
- **Coaching/scheme:** nothing direct. No tendency profiles, no playcalling fingerprints.
- **OL:** nothing direct beyond 1447's team-strength ratings (which absorb OL quality without attributing it).
- **Trust signals:** pipeline 7 is text-only. The map's §4 gap 1 (social/video quote mining, press-conference signal extraction) has no in-chunk counterpart — 1308's X stance pipeline is the nearest on-ramp.
- This chunk is the **methods undercarriage** (calibration, sizing, gating, intake, weather, discovery governance) for the intelligence program, not its substance. Its highest-value integrations are the Market Informativeness Gate (1), the δ/σ gate (2), and the NLP intake pipeline (7) — in that order.
