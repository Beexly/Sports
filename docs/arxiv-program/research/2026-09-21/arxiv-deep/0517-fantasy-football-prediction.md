# [0517] Fantasy Football Prediction (arXiv:1505.06918v1)

**Citation:** Roman Lutz (Univ. of Massachusetts Amherst). *Fantasy Football Prediction*. arXiv:1505.06918v1. URL: https://arxiv.org/abs/1505.06918v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 6 sections + appendix / ~13,000 chars).
**Verdict:** REJECT — a 2015 undergraduate-scale study whose own conclusion is that the errors are too large to be useful; no baseline comparisons, QB-only, 2009–2014 data; GSE's fantasy/projection infrastructure strictly dominates it. Salvageable only as a feature suggestion (EWMA form features), recorded below.

## 1. Research question
Can support vector regression (SVR) and single-hidden-layer neural networks predict weekly fantasy football scores of NFL quarterbacks (NFL standard scoring) from recent game stats, player age/experience, and opposing-defense stats?

## 2. Dataset / schema
- NFL game data 2009–2014 via the nflgame API (BurntSushi/nflgame, sourced from NFL.com). 2009 dropped (no history); train = 2010–2013 (2,167 QB-game cases), test = 2014 season (553 cases).
- Filter: QBs with ≥5 pass attempts per game. Features per case: QB age, years of pro experience, 12 QB stat categories (passing, rushing, turnovers) for the previous game and averaged over the last 10 games, plus opposing defense's 4 categories (points allowed, passing/rushing yards allowed, turnovers forced) for their last game and last-10 average.
- Rookies: assigned the average over all first-year QBs' per-game stats for game 1, own stats thereafter. Target: actual fantasy points under NFL standard scoring. Evaluation also restricted to the 24 best QBs of 2014 (12-team × 1 starter + 12 bench; listed in the appendix).

## 3. Method / model
- SVR (scikit-learn): features scaled to [0,1]; feature selection ∈ {none, manual (drop 2-pt-conversion stats), RFECV}; hyperparameter grid kernel ∈ {RBF, sigmoid, linear, polynomial}, C ∈ {0.25,0.5,0.75,1.0}, ε ∈ {0.05..0.25}, γ ∈ {0,0.05,0.1,0.15}, degree ∈ {2,3}; best config selected on held-out validation, refit on full train.
- Neural net (PyBrain): one hidden layer, sigmoid or tanh activations, linear output; grid over epochs ∈ {10,50,100,1000} × hidden units ∈ {10,25,50,100} × {sigmoid,tanh} = 32 configs; no feature selection or normalization ("the network can implicitly do this").

## 4. Equations & assumptions
Stated equations (copied faithfully):
- SVR: f_SVR(x) = Σ_d w_d x_d + b; (w*,b*) = argmin_{w,b} (C/N)Σ_i V_ε(y_i − (x_i w + b)) + ||w||²₂, V_ε = ε-insensitive loss; C ∈ (0,1].
- Hidden unit: h_k = 1/(1+exp(−(Σ_d w_{dk}+b_{dk}))); output: ŷ = Σ_k w^o_k h_k + b^o.
- EWMA proposal: S_t = αG_t + (1−α)S_{t−1}.
Stated assumptions: (a) last-game + last-10-game averages capture player form; (b) defense last-game/last-10 stats capture matchup; (c) RFECV features transfer across hyperparameter configs; (d) 2010–2014 data represents the current game despite acknowledged offensive evolution; (e) rookie ≈ average rookie; (f) error metrics RMSE/MAE/MRE with MRE = |y−prediction|/prediction.

## 5. Features / target
- Inputs: age, experience, 12 QB stat categories × (last game, last-10 avg), 4 defense categories × (last game, last-10 avg). Target: weekly fantasy points (NFL standard scoring), QB only.

## 6. Validation design
- Single chronological split: train 2010–2013, test 2014 (553 cases; 24-QB subset evaluated separately). Hyperparameters tuned on a held-out validation subset of training.
- Metrics: RMSE, MAE, MRE on all test cases and on the 24-best-QB subset. No cross-validation over seasons, no comparison to any baseline (not even "repeat last week's score" or "season average"), no statistical tests.

## 7. Numerical results / baselines
- Best SVR (RFECV, C=0.25, ε=0.25, linear kernel): RMSE 7.759 / MAE 6.221 / MRE 0.448 (all); RMSE 7.833 / MAE 6.248 / MRE 0.418 (top-24). Manual selection and no selection within ~0.05 RMSE.
- RFECV kept only 4 features: age, years pro, passing attempts (last 10), successful passing 2-pt conversions (last 10) — touchdowns dropped, which the author flags as suspicious.
- Best neural net (50 epochs, 50 hidden, sigmoid): top-24 RMSE 7.868 / MAE 6.235 / MRE 0.413 — MAE/MRE slightly better than SVR on top-24; all other 31 configs worse.
- Author's own verdict: "the errors were still very high. For example, the MAE of the best prediction was more than 6 points, which can make a difference in most Fantasy Football games."

## 8. Code / data availability
None — no code or data links; libraries named (scikit-learn, PyBrain) but no scripts released. Data source (nflgame API) is defunct for current seasons.

## 9. Leakage & limitations
- No baseline reported: impossible to tell whether either model beats the trivial "last-10 average" predictor; given MAE 6.2 on a ~17-point mean, likely barely.
- Test = one season (2014), QB-only; no other positions despite fantasy lineups needing all of them.
- RFECV feature set is degenerate (keeps 2-pt conversions, drops touchdowns) — symptom of correlated features + small data, not a finding.
- Data is 2009–2014; the author himself notes offensive evolution makes old data unrepresentative — doubly true in 2026.
- Neural net grid is tiny and single-layer; no regularization discussion; MRE defined with prediction (not actual) in the denominator, inflating/deflating errors asymmetrically.
- Evaluation subset (top-24 QBs) selected on 2014 outcomes — mild selection bias in the reported "best" numbers.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The map documents extensive existing fantasy/projection coverage (season-long and DFS projection systems, player-stat forecasting). This paper contributes no method, feature, or evaluation GSE lacks: linear SVR and 1-layer nets on box-score rolling averages are strictly weaker than GSE's current player-projection stack. Not an extension of any covered paper; a from-scratch weaker duplicate of solved problems.

## 11. GSE implementation spec
None — nothing in this paper meets the bar for implementation. The one portable idea (exponentially weighted moving-average form features, S_t = αG_t + (1−α)S_{t−1}, to replace last-game/last-10-average pairs) is a two-line feature-engineering change that GSE can evaluate in an afternoon if not already present; it does not justify a project.

## 12. Reproducible test
N/A — rejected. If the EWMA feature idea were tested: same first-half→second-half QB fantasy-points protocol as ledger 0516's test, comparing last-10-average vs EWMA(α tuned) features inside the existing GSE projection model, metric = MAE on 2016–2024.

## 13. Acceptance / rejection gate
REJECT. Acceptance would have required beating a stated baseline with a useful error margin on modern data; the paper meets none of these. The author's own conclusion ("errors were still very high") is adopted as the rejection rationale.

## 14. Improvement experiment
N/A — rejected. (If revisited: replace the paper's feature set with matchup-adjusted efficiency metrics and opponent strength, add all positions, and benchmark against the "repeat last-3-week average" baseline the paper omitted — the minimum bar for any fantasy projection claim.)
