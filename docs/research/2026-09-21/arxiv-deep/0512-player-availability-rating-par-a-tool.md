# [0512] Player Availability Rating (PAR) - A Tool for Quantifying Skater Performance for NHL General Managers (arXiv:1811.02885v1)

**Citation:** Shuja Khalid (2018). *Player Availability Rating (PAR) - A Tool for Quantifying Skater Performance for NHL General Managers*. arXiv:1811.02885v1. URL: https://arxiv.org/abs/1811.02885v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4 pages / 17,856 chars).
**Verdict:** REJECT — NHL-only trade-target heuristic built on an ad-hoc non-probabilistic formula; its own results show the ML models losing to existing public baselines (TSN.ca, NHL.com), and nothing in the method transfers to NFL betting/DFS modeling.

## 1. Research question
Can regression models trained on player physical characteristics, shooting percentage, and usage predict NHL skaters' offensive production (points per game), and can a novel "Player Availability Rating" (PAR) combining predicted vs actual PPG with team performance identify players likely to be available via trade?

## 2. Dataset / schema
- NHL player data 2006–2017 scraped from NHL.com via custom scripts; features: physical characteristics (height, weight), shooting percentage, expected time on ice / usage during games. Exact row counts not stated.
- Baseline projections: TSN.ca "Projected top 300 scorers, 2017" and NHL.com "Fantasy: Top 250 rankings for 2017-18" (preseason projections, used as competing baselines).
- Evaluation set: top 100 NHL players by PPG in the 2017–18 season (season ~30% complete at evaluation time).
- Access: NHL.com (public scraping); the author launched gmaiplaybook.com implementing the algorithm (stated, not verified by this worker).

## 3. Method / model
- Five regression methods implemented in scikit-learn with grid-search hyperparameter tuning: linear regression, k-NN regression, decision trees, random forests, neural networks (architectures/hyperparameters not stated). Features z-score normalized.
- Algorithm 1 (PAR): for each player, recompute PPG_predicted with the lowest-error model; pull PPG_actual, team points-percentage season (PPCG_season) and last-10-games (PPCG_recent) from NHL.com; PAR = (PPG_predicted − PPG_actual)/(PPCG_season) + w_o × (PPG_predicted − PPG_actual)/(PPCG_recent), with w_o = 2.
- Interpretation: negative (PPG_pred − PPG_actual) = outperforming expectations; positive = underperforming; team winning percentages proxy GM pressure to make trades. Higher PAR = more likely trade-available underperformer.

## 4. Equations & assumptions
- PAR = (PPG_predicted − PPG_actual)/(PPCG_season) + w_o·(PPG_predicted − PPG_actual)/(PPCG_recent), w_o = 2 (stated exactly; the paper explicitly notes "The PAR estimate captures the essence of existing ratings that are dependent on probabilistic considerations. However, the formulation presented above is not derived from any of these sources. It also does not use a probabilistic method to make predictions.")
- Stated assumptions: PPG (goals + assists per game) is a sufficient measure of offensive value; physical traits + shooting % + expected TOI suffice to project production; the residual (predicted − actual) measures under/over-performance; team points percentage (season and last-10) proxies trade pressure on GMs; w_o = 2 weighting of recent form is asserted without justification; projections are comparable across the 2006–2017 training window and the 2017–18 test season.

## 5. Features / target
- Inputs: height, weight (physical characteristics), shooting percentage, expected time on ice / usage per game. (No advanced stats by design — the paper explicitly avoids them.)
- Target: points per game (PPG = goals + assists per game), a continuous regression target. Prediction horizon: full-season PPG projection for 2017–18; PAR is recomputed in-season against partial-season actuals.

## 6. Validation design
- 80-10-10 train/validation/test split of the 2006–2017 NHL.com data (split method — random vs temporal — not stated; dates of the splits not stated).
- Test: mean and median error (predicted PPG − actual PPG, presumably absolute — reported as "Mean"/"Median" error values) on the top 100 PPG players of 2017–18, compared against the five models and the two public baselines (TSN.ca, NHL.com). No cross-validation, no confidence intervals, no significance testing.

## 7. Numerical results / baselines
- Table 1 (mean / median error on top-100 PPG players): Neural Nets 0.211 / 0.188; Decision Tree 0.222 / 0.21; Random Forest 0.215 / 0.193; k-NN 0.234 / 0.21; Linear Regression 0.245 / 0.22; TSN.ca 0.202 / 0.173; NHL.com 0.197 / 0.167. Paper's claim: neural nets best among the five ML methods, "comparable to" TSN.ca/NHL.com — but numerically both public baselines beat every ML method on both mean and median.
- Table 2 (actual vs predicted PPG, top-10 predicted): e.g., Nikita Kucherov actual 1.48 / predicted 1.18; Brad Marchand 1.17 / 1.02; Connor McDavid 1.17 / 0.99; Johnny Gaudreau 1.28 / 0.98 — systematic under-prediction of elite scorers.
- Table 3 (top-10 PAR): Ryan Dzingel 2.29; Mark Stone 2.07; Cam Fowler 2.03; Brandon Montour 1.66; Tyler Myers 1.64; Brendan Perlini 1.21; Nick Foligno 1.14; Tomas Tatar 1.12; Dion Phaneuf 1.02; Gabriel Landeskog 0.98.
- Stated limitation: size bias — players >6'3"/220 lbs assigned low PPG (Patrik Laine predicted 0.63 vs actual ~1.5× higher in his rookie year); players <5'9"/170 lbs assigned inflated PPG.

## 8. Code / data availability
No code link stated. Data scraped from NHL.com (scripts not shared). Website gmaiplaybook.com stated as implementing the algorithm (not verified by this worker).

## 9. Leakage & limitations
- Split methodology unstated: if the 80-10-10 split is random over 2006–2017 player-seasons, the same players appear in train and test across seasons — direct identity leakage. Season ~30% complete at test time means "actual PPG" is a noisy partial-season quantity compared against full-season projections.
- The ML models all lose to the free public baselines — the paper's core claim (neural nets "adequate") is really "adequate but strictly worse than what's already published."
- PAR formula is asserted, not derived or validated: no evidence that high-PAR players were actually traded or that acquiring them was profitable; w_o=2 is arbitrary; dividing by team points percentage has no probabilistic or economic justification (paper admits this).
- Physical-trait → scoring models encode era/cohort stereotypes (the enforcer bias the author documents) — no causal or era adjustment.
- External validity to NFL: none meaningful. NHL points-per-game from height/weight/shooting% has no analog in NFL betting markets; GSE does not operate an NHL lane. The residual-vs-expectation framing is generic and already standard in every sports model.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. GSE has no NHL research lane and no player-trade-availability tooling. The only conceptual neighbor is GSE's props-consensus work (projected vs actual player production residuals), which is strictly more sophisticated. This paper is neither duplicate nor extension — it is a different sport, a different decision problem (GM trades, not betting), with weaker methods than GSE already uses. New capability in name only; no transfer path.

## 11. GSE implementation spec
Not applicable — REJECT verdict. The one salvageable concept (flagging players whose actual production trails model-projected production, scaled by team situation, as mispriced/trade targets) is already subsumed by GSE's projection-vs-market residuals in the props lane. No build recommended.

## 12. Reproducible test
Not applicable — REJECT verdict. Were it to be tested: replicate the 5-model bake-off on NHL 2006–2017 → 2017–18 PPG with a stated temporal split, metric = mean absolute error on top-100 PPG players, baseline = NHL.com preseason projections; the paper's own numbers already show the ML methods lose, so the test would be expected to reject.

## 13. Acceptance / rejection gate
REJECTED at the paper level: the acceptance gate (any ML method beating the NHL.com/TSN.ca baselines on the stated test) is already failed by the paper's own Table 1. No GSE implementation proceeds.

## 14. Improvement experiment
If the residual-based trade-availability idea were ever worth revisiting: replace the ad-hoc PAR with a calibrated probabilistic model — P(player is traded | projected−actual residual, team points %, contract status, age curve) trained on actual historical NHL trade transactions, evaluated on out-of-sample trade prediction (log loss / AUC), with the residual model itself benchmarked against public projections first. That would convert an asserted formula into a testable claim; the current paper provides no such evidence.
