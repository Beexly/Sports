# 0837 Kelly Betting as Bayesian Model Evaluation: A Framework for Time-Updating Probabilistic Forecasts (arXiv:2602.09982v1)

**Citation:** Michael Beuoy (2026). *Kelly Betting as Bayesian Model Evaluation: A Framework for Time-Updating Probabilistic Forecasts*. arXiv:2602.09982v1. URL: https://arxiv.org/abs/2602.09982v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — treat competing forecast models as Kelly bettors against a market; bankroll trajectories separate good from bad probability models far faster than log loss or Brier (96.0% vs 73.1% correct-model identification on a faulty-recency model); directly applicable to GSE live win-probability model comparison, pending real-NFL replay validation.

## 1. Research question

Can the Kelly criterion serve as a model-evaluation metric for time-updating probabilistic forecasts? The paper treats each candidate model as a bettor wagering its bankroll on its own probabilities against market-implied probabilities, asking whether bankroll growth discriminates correct from misspecified models better than log loss and Brier score — especially early, when few outcomes have resolved.

## 2. Dataset / schema

Simulated only: a volleyball-like first-to-100, win-by-two contest with time-updating win probabilities. Candidate models: correct model (true p=0.50 or 0.53), incorrect model (p=0.53 or 0.50), a faulty recency model, and a noise-variable model. 110 probability-pair scenarios; evaluated after 5 games and after 50 games. No real-world data.

## 3. Method / model

- Each model posts time-updating probabilities; at each update it places a Kelly bet of its bankroll against the market probability m_i.
- Bankroll update (quoted): w_i' = (p_i / m_i) · ∑_i m_i w_i — wealth compounds by the likelihood ratio of model vs market.
- The market probability is the eigenvector of the outer product p·wᵀ; model credibility is the eigenvector of wᵀ·p — a mutual-consistency fixed point between market prices and model wealths.
- Compare models by terminal bankroll share; benchmark metrics: log loss, Brier score.

## 4. Equations & assumptions

- w_i' = (p_i / m_i) ∑_i m_i w_i (quoted exactly).
- Market probability = eigenvector of p·wᵀ; credibility = eigenvector of wᵀ·p.
- Assumptions: models can bet fractionally at market prices with no limits or costs; market probability exists as a coherent reference; Kelly-optimal growth equals Bayesian evidence accumulation (log bankroll = cumulative log-likelihood ratio).

## 5. Features / target

- **Inputs:** each model's time-updating probability path p_i(t); market probability path m_i(t).
- **Target:** which model is correct — decided by terminal bankroll dominance rather than by a scoring rule.

## 6. Validation design

- Simulation study only; 110 probability-pair scenarios; discrimination measured after 5 games (early) and 50 games (late).
- Baselines: log loss and Brier score on the same probability paths.
- Metric: fraction of scenarios where the metric identifies the correct model.

## 7. Numerical results / baselines

Correct-model identification rates, quoted exactly:

| Scenario | Kelly | Log loss | Brier |
|---|---|---|---|
| Correct 0.50 vs incorrect 0.53 | 55.1% | 49.9% | 49.9% |
| Correct 0.53 vs incorrect 0.50 | 76.3% | 80.5% | 80.5% |
| Faulty recency model | 96.0% | 73.1% | 80.2% |
| Noise-variable model | 74.4% | 57.6% | 58.3% |
| 110 scenarios, after 5 games | wins 98 (89%), ties 1, loses 11 | — | — |
| 110 scenarios, after 50 games | wins 61, ties 47, loses 2 | — | — |

Kelly dominates early (5 games: 89% win rate vs scoring rules) and remains competitive late; its edge is largest against structurally misspecified models (recency, noise).

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- Pure simulation; the "market" is a construct, not real betting prices with vig, limits, and stale lines.
- No transaction costs; Kelly bettors can compound frictionlessly.
- The 0.50-vs-0.53 near-indistinguishable case shows Kelly barely beats chance (55.1%) when models are close — the method separates the structurally wrong, not the slightly-worse-calibrated.
- Assumes the market probability is observable and bettable at every update — false in thin live markets.

## 10. GSE overlap

Per the existing-research map: calibration/uncertainty is well covered (CQR, grouping loss 2210.16315, temperature/Platt/isotonic scaling, Venn-Abers, LRD 2207.13770) but model *comparison* for live win-probability models is not — the repo has in-game soccer WP (1906.05029) and conformal WP (2208.08598) as read papers, no Kelly-as-evaluator. New capability: a live model-selection layer for GSE's in-game probabilities.

## 11. GSE implementation spec

- Implement the Kelly-tournament evaluator: maintain notional bankrolls for each candidate live-WP model (current engine, challenger variants); at each play update, each model "bets" its Kelly fraction against the de-vigged market live line.
- Rank models by log-bankroll growth over rolling 4-week windows; auto-promote challengers that dominate.
- Effort: 2 days (needs a live-odds feed or nflverse + historical odds for replay).

## 12. Reproducible test

Dataset: 2024 NFL season, candidate WP models = current GSE in-game model vs a logistic baseline vs market-implied WP; replay each game play-by-play with historical live odds (or closing-line-derived WP as the market proxy). Metric: after N games, does the Kelly tournament rank the true-best-calibrated model first more often than Brier/log-loss ranking? Gate below.

## 13. Acceptance / rejection gate

ADOPT if, on the 2024 replay, the Kelly tournament identifies the best-calibrated model (by end-of-season log loss) within the first 6 weeks in ≥70% of bootstrap replications, beating Brier-based selection; REJECT if it needs the full season to separate models (then it adds nothing over scoring rules).

## 14. Improvement experiment

Weight each model's bet by its own estimated calibration (reliability-curve slope) so overconfident models are automatically throttled — a "calibrated Kelly tournament." Hypothesis: this fixes the near-indistinguishable case (55.1%) by penalizing miscalibrated probability paths even when their direction is right.
