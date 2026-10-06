# [1705] Duckworth-Lewis-Stern Method Comparison with Machine Learning Approach (arXiv:2106.00175)

**Citation:** Abbas, K. & Haider, S. (2021). *Duckworth-Lewis-Stern Method Comparison with Machine Learning Approach*. arXiv:2106.00175. URL: https://arxiv.org/abs/2106.00175
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, Sections I–IV + references, ~30k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the head-to-head evidence that ML classifiers beat the classical DLS rain-rule formula at every match stage, the trick of feeding the classical model's prediction in as an ML feature, and the per-team "unpredictability index" are all directly adaptable to GSE's live win-probability engine and model-error profiling, but the cricket par-score mechanics don't transfer.

## 1. Research question
How accurate is the Duckworth-Lewis-Stern (DLS) rain-rule formula at predicting ODI match winners mid-game, and can supervised ML do better? The authors compare the D/L par-score prediction against Naive Bayes, neural networks, bagging+NB, and random forests trained on 63,000 second-innings over-records; optimize the DLS resource table with particle swarm optimization (PSO); and build a per-nation "Unpredictability Index" from D/L failure rates.

## 2. Dataset / schema
- 3,470 ODIs since 1971 (CricInfo); 1,751 with over-by-over second-innings data (post-2001-06-07); tied and rain-interrupted matches excluded → 63,000 over-level records.
- Per-record attributes: Team 1 runs/wickets, Team 2 runs/wickets, overs bowled, actual result, computed D/L Par Score, and "D/L Winning Prediction" (binary: Team 2 runs vs par score).
- Par score formula: Par = Team1Runs − Team1Runs × ResourceValue(X,Y), e.g., 250 − 250×59.5% = 101 with 40 overs left, 4 wickets lost.

## 3. Method / model
- Experiment 1: D/L accuracy = agreement of "D/L Winning Prediction" with actual result; ML classifiers (NB, NN w/ backprop, Bagging+NB, RF) trained per-over (10th/20th/30th/40th) and per-over-range (0–10, …, 40–50, 0–50, 20–50), 70/30 train/test in KNIME, using all attributes *including* the D/L prediction as a feature.
- Experiment 2: PSO (μ=10, c1=2, c2=2.5, 50 generations, custom .NET app) optimizing DLS resource-table values for wickets 0–3 across all 50 overs; fitness = classification accuracy; monotonic-decrease constraint imposed (authors note unconstrained optimization scored even higher).
- Experiment 3: Unpredictability Index = D/L formula failure percentage at the 40th over per team, split by chase/defend × win/loss.

## 4. Equations & assumptions
- Par Score = Team1Runs × (1 − ResourceValue(X,Y)).
- PSO fitness = # correctly classified instances; velocity update standard (c1=2, c2=2.5).
- Assumptions: DLS applicable only after 20 overs (first-20-overs records excluded from the fair comparison); over-level (not ball-level) granularity; tied/interrupted matches excluded — so the "rain rule" is evaluated on *uninterrupted* games as a pure win-predictor.

## 5. Features / target
Features: Team 1 runs, Team 1 wickets, Team 2 runs, Team 2 wickets, overs played, D/L Winning Prediction. Target: binary match winner.

## 6. Validation design
70/30 train/test splits per over and per over-range; accuracy as metric. D/L evaluated on the same test records. No cross-validation, no confidence intervals, no calibration analysis.

## 7. Numerical results / baselines
- D/L accuracy: **78.12%** on all 63,000 overs; **83.74%** excluding first 20 overs (DLS not applicable there).
- ML vs D/L by over: 10th — 72.23% vs **80.97%** (Bagging+NB); 20th — 79.20% vs **82.80%** (NN); 30th — 85.90% vs **87.45%** (NB); 40th — 88.42% vs **88.98%** (NN).
- By range: 0–10: 67.10% vs 75.22%; 10–20: 76.04% vs 79.29%; 20–30: 80.99% vs 82.91%; 30–40: 84.74% vs 85.77%; 40–50: 88.75% vs 89.06%. Overall 0–50: 78.12% vs **80.62%**; 20–50: 83.74% vs **84.68%** (NN).
- PSO-optimized table (wickets 0–3): 0–50 overs 79.25% → **80.25%**; 20–50: 85.12% → **85.39%**; per-over gains +0.3 to +2.8 pp.
- Key tension: dropping the monotonic-decrease constraint gave *even higher* PSO accuracy — accuracy vs monotonicity tradeoff (direct contrast with ledger 1704's monotonicity priors).
- Unpredictability Index (D/L failure at 40th over): chasing wins — Sri Lanka 18.18% (rank 1); chasing losses — India 20.37% (rank 1, "collapses"); defending wins — England 21.95% (rank 1); defending losses — Australia 20.41% (rank 1).
- Prior art cited: Bailey & Clarke regression predicted winners 71% on 100-match 2005 holdout vs this paper's 80.62% NN.

## 8. Code / data availability
KNIME workflows (not shared); custom .NET PSO app (not shared). Data: CricInfo (public scrape).

## 9. Leakage & limitations
- No cross-validation or significance testing; single 70/30 splits — the 0.5–2 pp ML edges could be split noise.
- Accuracy-only evaluation: no calibration, no log-loss/Brier — a model can be more accurate and worse-calibrated, which matters for staking.
- The D/L prediction is both the baseline *and* an input feature — stacking helps the ML but muddies the "ML vs formula" framing.
- Excluding rain-interrupted matches means the rain rule is tested where it isn't used; selection bias toward completed games.
- PSO on 4 wicket-columns × 50 overs with no regularization risks overfitting the table; no held-out validation of the optimized table reported.
- Unpredictability Index has no sample-size weighting beyond a 40-ODI minimum.

## 10. GSE overlap
Complements ledgers 1704 (Bayesian monotone DLS table) and the live-WP work: 1704 says constrain for monotonicity, this paper says ML beats the classical formula everywhere and constraints cost accuracy — GSE needs both sides of that tradeoff recorded. The "classical prediction as ML feature" pattern is new to the corpus (stack a simple physics/heuristics WP as a feature in the live model). The Unpredictability Index is a new diagnostic concept: per-team model-failure profiling. No overlap with existing GSE WP implementations.

## 11. GSE implementation spec
- Live engine experiment `live/classical_vs_ml.py`: (a) build a simple closed-form football WP baseline (e.g., logistic on time×score-diff, or the ledger-1704 monotone table); (b) train gradient boosting / NN on nflverse play-by-play state features *including the baseline WP as a feature* (the paper's stacking trick); (c) compare accuracy AND log-loss vs the baseline alone at game-progression deciles (the paper's per-over table → per-10%-of-game table).
- Add per-team residual profiling: compute GSE engine's Brier score by team (the Unpredictability Index analogue) to flag teams the engine systematically misprices (e.g., high-variance or comeback-prone teams) for manual review or team-specific calibration.
- Effort: ~2–3 days.

## 12. Reproducible test
Dataset: nflverse 2016–2025 play-by-play, sampled at 10 game-progression deciles. Baseline: classical logistic WP (time + score diff + timeouts). Test: ML model with baseline WP as a feature. Metrics: accuracy and log-loss per decile on 2024–2025 holdout. Expectation per the paper: ML wins on accuracy at every decile, with the biggest edge early (cf. 10th-over: 72.23% → 80.97%).

## 13. Acceptance / rejection gate
ADOPT the stacked ML live model if it beats the classical baseline by ≥ 1 pp accuracy AND ≥ 0.005 log-loss at every game decile on the holdout (the paper's "better at every stage" bar, upgraded with a calibration metric the paper lacked). REJECT if the ML wins accuracy but loses log-loss — that reproduces the paper's limitation and is unusable for staking. Also record the monotonicity-vs-accuracy tradeoff explicitly: test a monotone-constrained variant (1704-style) and report both.

## 14. Improvement experiment
Resolve the 1704-vs-1705 tension directly: train three live-WP variants — (a) unconstrained ML, (b) monotone-constrained Bayesian (1704 recipe), (c) unconstrained ML with the monotone table's output as a feature (stacking both papers). Hypothesis: (c) dominates — it keeps the accuracy edge of unconstrained ML while inheriting the constraint's regularization in sparse extreme states (where 1704's table differed most from D/L). Test: accuracy/log-loss overall plus calibration (ECE) specifically in extreme states (win prob < 0.1 or > 0.9, last 5 minutes); success = (c) matches (a) on accuracy and beats (b) on calibration in extremes. Winner becomes GSE's live WP architecture, with the experiment itself publishable as the resolution of the two papers' disagreement.

**Verdict:** ADAPT — the ML-beats-classical-at-every-stage evidence, the classical-prediction-as-feature stacking trick, and the per-team unpredictability diagnostic all port to GSE's live engine, but accuracy-only evaluation must be upgraded with calibration metrics.
