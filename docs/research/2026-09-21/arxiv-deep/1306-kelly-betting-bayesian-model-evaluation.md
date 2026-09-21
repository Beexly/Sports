# [1306] Kelly Betting as Bayesian Model Evaluation (arXiv:2602.09982v1)

**Citation:** Michael Beuoy (2026). *Kelly Betting as Bayesian Model Evaluation: A Framework for Time-Updating Probabilistic Forecasts*. arXiv:2602.09982v1. URL: https://arxiv.org/abs/2602.09982v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 31 pages).
**Verdict:** ADAPT — a sequential, real-time model-evaluation framework that pits competing forecast models against each other as Kelly bettors; directly fills GSE's documented Kelly/sizing gap and gives a live model-selection/ensemble-weighting mechanism. (Replacement for REJECT 1103.)

## 1. Research question
How should time-updating probabilistic forecasts (in-game win probabilities, election forecasts) be evaluated against each other, when traditional averaged log-loss/Brier ignore the *order* and *timing* of predictions and can't update before the outcome is known?

## 2. Dataset / schema
Simulated volleyball-like contests: constant per-point win probability, first to 100 points (win by 2); 10,000 simulated games per scenario; iterated contest over 11×11 grid of point probabilities {0.45..0.55}, 50 games per sequence, 1,000 simulations per combination. Real examples: 4 NFL games with ESPN vs Open Source Football (nflfastR) in-game win probabilities; 2022 MLB division races (FiveThirtyEight vs FanGraphs, weekly, six divisions); 2023 NBA playoffs (FiveThirtyEight vs inpredictable.com, 84 games, 31,000+ plays).

## 3. Method / model
Each model is a Kelly bettor with bankroll + win shares. Steps: (1) compute market-clearing probability from bankrolls, win shares, and latest probability estimates; (2) convert to odds, compute each bettor's Kelly wager fraction; (3) mark portfolios to market for real-time credibility; (4) update bankrolls/win shares; (5) repeat as new information arrives; (6) settle at the outcome. Bankroll is interpreted as Bayesian credibility (posterior probability the model is correct).

## 4. Equations & assumptions
Kelly with existing bets: f = p − ((1−p)/o)(1 + w/b), where w = win shares, b = bankroll. Market-clearing probability (binary): m = Σ pᵢbᵢ / (1 − Σ pᵢwᵢ). Multinomial update: wᵢ′ = (pᵢ/mᵢ) Σₖ mₖwₖ. Market-clearing multinomial odds: m is the eigenvector of pwᵀ with eigenvalue 1 (PageRank analogy; credibility vector c = wᵀm is eigenvector of the self-evaluating matrix S = wᵀp). Shown identical to Bayes' theorem under the bankroll-as-credibility interpretation. Assumptions: fair market odds (no vig); Kelly bettors maximize expected log wealth; bankrolls sum to 1; win shares sum to 0 (zero-sum).

## 5. Features / target
Inputs: each model's per-event probability estimates over time. Target: model credibility (bankroll share) — a real-time, order-sensitive evaluation metric.

## 6. Validation design
Simulation: correct vs incorrect models (wrong point probability, recency-bias, random-walk/no-predictive-value variants); metric = fraction of 10,000 games where the correct model scores higher ("accuracy"). Iterated: 50-game sequences, bankrolls carry over (Bayesian updating); log-loss/Brier averaged over all points to date. Real-data illustrations (not formal tests): NFL/MLB/NBA model pairs.

## 7. Numerical results / baselines
Single-game scenarios: wrong-point-prob (0.50 vs 0.53): Kelly 55.1% vs log-loss/Brier 49.9%; recency-bias incorrect model: Kelly 96.0% vs log-loss 73.1% / Brier 80.2%; non-predictive random-walk model: Kelly 74.4% vs log-loss 57.6% / Brier 58.3%. Iterated 110 scenarios: after 1 game Kelly wins 50 (45%); after 5 games 98 (89%) + 1 tie; after 25 games 76 + 31 ties; after 50 games 61 + 47 ties (only 2 scenarios not at least tied). NFL example: PHI@SEA 12/18/23 — ESPN credibility dropped from ~50% to 37% on the game-winning TD. NBA 2023 playoffs: FiveThirtyEight ended +13.8% credibility vs inpredictable over 84 games / 31,000+ plays.

## 8. Code / data availability
None stated in paper (author's site inpredictable.com; no code/data links given).

## 9. Leakage & limitations
Simulations are stylized (constant point probability, no real game dynamics); the "incorrect" models are author-crafted. Real-data sections are illustrations, not controlled comparisons. Market-clearing math assumes fair odds; real books have vig. Credibility can swing hard on single improbable plays (the Derrick White tip-in shifted 47%→69% in one play) — desirable Bayesian behavior, but high variance for short contests. Single author, independent (inp predictable.com), not peer-reviewed.

## 10. GSE overlap
Directly fills a documented gap: `~/workspace/arxiv-sweep/existing-research-map.md` GAP 1 — "Kelly criterion / optimal bet sizing under uncertainty — mentioned 12× in repo, zero papers read." Also complements GSE's calibration and ensemble lanes. Not duplicative — first Kelly paper in the corpus.

## 11. GSE implementation spec
(a) Implement the binary + multinomial Kelly-contest evaluator in Python (numpy eigenvector solve for m); (b) run GSE's live model variants (e.g., different feature sets / recalibration heads) as competing bettors over 2024 games using historical odds as the market; (c) mark credibility to market weekly; carry bankrolls across the season (sequential Bayesian selection); (d) use terminal credibility as ensemble weights for 2025. Effort: ~1 engineer-week.

## 12. Reproducible test
Dataset: 2024 NFL season, GSE's own weekly win-probability outputs for 2–3 model variants vs closing lines. Metric: terminal bankroll shares after the season; compare against average log-loss ranking. Success: the Kelly ranking agrees with log-loss on ≥80% of variant pairs and identifies the variant with the best 2025 forward RMSE.

## 13. Acceptance / rejection gate
ADOPT as GSE's live model-selection metric if the Kelly contest's 2024 ranking predicts the 2025 forward-RMSE ranking (Spearman ≥ 0.7 across ≥5 variants); REJECT if the ranking is unstable (flips with small probability perturbations) or disagrees with log-loss without forward justification.

## 14. Improvement experiment
Add fractional-Kelly (half-Kelly) bettors and a vig-aware market-clearing equation (mᵢ summing to >1), then test whether the evaluation ranking is robust to bettor risk-aversion and real book margins — the paper assumes full Kelly and fair odds, and GSE's actual deployment faces both constraints.
