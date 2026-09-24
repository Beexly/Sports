# [0810] Online and Scalable Model Selection with Multi-Armed Bandits (arXiv:2101.10385)

**Citation:** Jiayi Xie, Michael Tashman, John Hoffman, Lee Winikor, Rouzbeh Gerami (2021). *Online and Scalable Model Selection with Multi-Armed Bandits*. arXiv:2101.10385. URL: https://arxiv.org/abs/2101.10385
**Ledger completed:** 2026-09-21. **Read:** full text (PDF fetched from https://arxiv.org/pdf/2101.10385 — the local cache held only the arXiv abstract page, not the paper body; ar5iv had no HTML rendering).
**Verdict:** ADAPT — the decay ε-greedy Automatic Model Selector (AMS) is a directly transferable protocol for live model-selection among GSE engine versions, with ε-decay schedule and 15-minute rotation cadence adaptable to pick-release cadence; the paper gives no exact numbers (results are figure-only), so GSE must set its own KPI and decision thresholds.

## 1. Research question
How can an operator safely select among multiple candidate ML models on live traffic — where offline metrics (AUC, cross-entropy) routinely fail to predict online business KPIs and environments are non-stationary — without wasting budget on underperforming models the way equal-split A/B tests do? The paper builds the Automatic Model Selector (AMS): arms = candidate models swapped into a live bidding strategy sequentially, rewards = real-world KPI (CTR/CPC/CPA), with traffic gradually concentrated on the best-performing arm.

## 2. Dataset / schema
Two proprietary live-traffic experiments on Xaxis (Copilot AI) RTB ad campaigns; no public dataset, no row counts, no dates stated. Experiment 1: two arms — logistic-regression CTR models trained with 7-day vs 60-day lookback windows (model7, model60), trained daily on all log-level data from a parent campaign containing multiple sub-campaigns. Experiment 2: two arms — logistic regression with ~1000 features (modelControl, trained on parent-campaign data as a whole) vs ~7000 features with sub-campaign-id × feature crossings (modelTest). KPIs logged once per day, per model, using only impressions purchased while that model was active. Schema not stated beyond "impressions, clicks, conversions, CPC/CPA/CTR". Not replicable (proprietary DSP data).

## 3. Method / model
Three components: (1) ML Model Trainer — retrains each candidate (typically logistic regression or factorization machines) daily on log-level campaign data; (2) Performance Monitor — computes per-model KPIs (CPC, CPA, CTR) once per day on traffic each model actually served; (3) MAB Model Selector — runs every 15 minutes, picks which model powers the bidding strategy next. Bandit algorithm: decay ε-greedy (chosen over Thompson sampling and UCB per Mäkinen 2017 for simplicity and empirical performance): at each step, best arm activated with probability 1−ε, and with probability ε an arm is drawn uniformly at random from all M candidates (including the best). Decay schedule: ε(t) = ε₀·max(0, 1 − t/α), t = time, α = scaling parameter controlling decay speed. Per-paper note: at ε=0 the best arm is activated exclusively; ε only decreases, so the selector becomes greedier as empirical estimates stabilize.

## 4. Equations & assumptions
Activation probabilities (for candidate set of size M):
- P(best) = (1 − ε) + ε/M
- P(alt) = ε/M
Decay: ε(t) = ε₀·max(0, 1 − t/α).
Assumptions (stated): (a) multiple models can be activated sequentially on the same live traffic; (b) offline tests are inconclusive about online performance; (c) all models evaluable on the same KPI; (d) short feedback loop with enough volume for statistical significance. No reward-distribution assumptions are stated (no Beta-Bernoulli or sub-Gaussian claims; the method is reward-agnostic, which is why decay ε-greedy was preferred over Thompson sampling's posterior requirement). "No equations stated" beyond the two probability formulas and the decay schedule.

## 5. Features / target
Features: the paper does not enumerate RTB features; model internals are logistic regression / factorization machines on standard impression features. Target (reward): campaign KPI — typically click or conversion model quality measured by CTR, CPC, or CPA computed per-model on live traffic. Prediction horizon: per 15-minute activation block; KPI evaluation windows computed daily with 30-day lookback for cumulative CTR (Experiment 1).

## 6. Validation design
No train/val/test ML split — validation is the live-traffic experiment itself. Two live case studies on real campaigns. Experiment 1 asks: does lookback-window size (7 vs 60 days) matter, and does offline AUC track online CTR? Experiment 2 asks: does offline AUC pick the model that wins on the live KPI? Baselines compared: the arms against each other, plus the implicit A/B-test baseline (equal traffic split) that AMS is claimed to dominate on regret. No statistical-significance test reported; no metric values in text — all results are in Figures 2 and 3 (time series of AUC, cumulative CTR, activation probability, cumulative impressions). Time-ordered by construction (live sequential deployment).

## 7. Numerical results / baselines
Paper reports NO exact numbers in text; results are qualitative figure readings:
- Exp 1: model7 had best offline AUC early; model60 took the AUC lead around day 7 and kept it. Online cumulative CTR followed "a similar, but not identical" trend. Notable exception: at the campaign start, higher offline AUC did NOT translate to higher live CTR. AMS shifted activation probability and impressions toward model60 over time, exploration decreasing.
- Exp 2: modelControl had slightly better test AUC; on live traffic it "significantly outperforms" modelTest — offline metrics did not align with online KPI. AMS gradually assigned higher activation probability and more impressions to modelControl.
- Headline claim: "In live-traffic tests on multiple ad campaigns, the AMS system proved highly effective at improving ad campaign performance" — no KPI delta, no p-value, no N given. These are the paper's claims, not independently verifiable from the text; mark any restated "improvement" as unquantified.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Adversarial: zero exact numbers, no significance tests, no traffic volumes — the effectiveness claim is unquantified and unfalsifiable from the paper alone.
- Selection bias in evidence: only two two-arm case studies from the authors' employer; no failure cases shown.
- The ε-decay is monotone-decreasing with no reset: if the environment is truly non-stationary (which the paper itself argues RTB is), decay-to-greedy locks onto a stale winner and stops detecting regime changes — a real internal tension; Zeng et al. (2016) cited in the paper uses explicitly non-stationary bandits, but AMS does not.
- 15-minute rotation between models injects its own non-stationarity into each model's KPI estimates (traffic composition differs per block); no discussion of interference/carryover.
- External validity to sports: GSE publishes picks on a fixed weekly slate, not continuous traffic — the "short feedback loop with volume" requirement is only weakly satisfied (16-17 games/week, settlement in days). The bandit framing fits model-selection across engine versions better than per-pick selection.

## 10. GSE overlap
Existing-research map (~/workspace/arxiv-sweep/existing-research-map.md, line 144): "RL / bandits for pick selection — ML brief lists contextual bandits, but no papers read. Selection-under-budget, learning-to-abstain with coverage-risk curves." → This is the first bandit paper actually read; no duplication. Complements (not duplicates) the engine's model versioning: v5.2.7 generates daily; AMS-style selection would sit one level above, choosing which model version's picks ship when offline backtests disagree.

## 11. GSE implementation spec
Adaptation: "Engine Model Selector" for GSE. Arms = model versions (e.g., v5.2.7, challenger versions with different feature sets or lookbacks). Reward = realized pick KPIs over a rolling window: ROI on posted picks and calibration (Brier), computed only on picks each version actually shipped. Cadence adapted to sports: rotate challenger versions on low-stakes slates (e.g., Thursday-only or a subset of props) weekly, not 15-minute; decay ε-greedy with weekly steps, ε₀ = 0.3, α ≈ 8 weeks, and — fixing the paper's flaw — add ε-reset triggers on detected regime change (roster/injury shocks, model drift alarms) instead of monotone decay. Safety: never let a challenger take more than ε-share of posted volume until it beats production on two consecutive weekly windows. Effort: small — a scheduling wrapper over existing pick pipelines plus KPI ledger per version (~1-2 days build, 4-8 weeks to first decision).

## 12. Reproducible test
Dataset: GSE posted-pick ledger 2024-2025 seasons (engine predictions DB, picks table) replayed as counterfactual arms: Arm A = production model picks, Arm B = a challenger variant (e.g., alternate feature set or calibration). Metric: cumulative ROI and Brier score on the posted slate, evaluated weekly. Baseline to beat: equal-split A/B (alternate versions week to week) and pure production. Time window: full 2024 season + 2025 through Week 2. Runnable offline as a bandit replay with the paper's ε(t) schedule; success = AMS replay allocates majority traffic to the ex-post best version by mid-season with less cumulative regret (in ROI units) than A/B.

## 13. Acceptance / rejection gate
ADAPT if a replay of decay ε-greedy on 2024 NFL posted picks shows (a) cumulative-regret reduction ≥ 20% vs equal-split A/B in ROI terms by Week 9, AND (b) the selector's traffic share for the ex-post best arm ≥ 70% by Week 12; REJECT otherwise (the mechanism adds complexity without demonstrated traffic-savings). Note: the paper itself clears no numeric gate, so the gate is set by this replay, not by the paper's claims.

## 14. Improvement experiment
Replace monotone decay ε-greedy with a regime-aware variant: run a CUSUM/Bayesian changepoint detector on the reward stream (rolling Brier/ROI per arm) and reset ε to ε₀ on detected changepoints, plus per-arm sliding-window (discounted) reward estimates à la Besbes et al. (2014, cited in the paper). Hypothesis: in NFL, model performance is regime-dependent (injuries, weather, coordinator changes), so a changepoint-resetting bandit should beat monotone decay on the 2024 replay by capturing the post-injury regime switches the paper's version would lock past. Second experiment: contextual bandit (LinUCB) with slate features (spread size, total, rest differential) as context — arms get selected per game-type rather than globally.
