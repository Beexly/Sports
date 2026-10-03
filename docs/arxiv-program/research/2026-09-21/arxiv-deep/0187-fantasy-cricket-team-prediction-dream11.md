# [0187] Data Science Approach to Predict the Winning Fantasy Cricket Team — Dream 11 Fantasy Sports (arXiv:2209.06999v1)

**Citation:** Sachin Kumar S, Prithvi H V, C. Nandini (2022). *Data Science Approach to Predict the Winning Fantasy Cricket Team — Dream 11 Fantasy Sports*. arXiv:2209.06999v1. URL: https://arxiv.org/abs/2209.06999v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 665 lines).
**Verdict:** REJECT — read in full; the headline R² of 0.99/0.97 is target leakage (the Dream-11 score target is a deterministic function of the same-match input stats), the domain is cricket-only, there is no prospective validation, and the salary-cap team-selection idea is a weaker duplicate of GSE's existing MILP DFS optimizer (ledger 0010).

## 1. Research question
Can data science predict the winning fantasy cricket team on Dream11? The authors decompose this into: (a) predict each player's Dream-11 score for a prospective match using regression (arguing regressors beat the base paper's classifiers), and (b) select the 11-player team maximizing expected Dream-11 score under Dream11's constraints (≤100 credits, ≤7 players from one team, exactly 11 players) via a greedy + knapsack combination.

## 2. Dataset / schema
**3100 cricket matches** from cricsheet.org (https://cricsheet.org/): **1529 ODI, 756 IPL, 815 T20**, ball-by-ball YAML files converted to CSV via the yorkpy package. Engineered into per-player-per-match aggregates. Batsman schema: runs, balls, 4s, 6s, 50s, 100s, duck outs, strike rate, rival, venue (+ engineered: cumulative strike rate, moving average, Dream-11 scores). Bowler schema: overs, runs conceded, maidens, wickets, economy rate, 4-wicket, 5-wicket hauls (+ cumulative economy, Dream-11 scores). Public source (cricsheet.org), so the raw data is replicable; the authors' engineered tables are not released.

## 3. Method / model
Pipeline (§III): (1) scrape/convert YAML→CSV; (2) EDA + transformation to player-match rows; (3) feature engineering (50s/100s/duck-outs, cumulative rates, moving averages, Dream-11 scores); (4) Plotly visualization module (22 batsman + 20 bowler + 10 team interactive plots); (5) ML module: fit the base paper's classifiers (dismissed — "even a difference of 4 points will put us 1000s of rank away"), then use **PyCaret to compare 22 scikit-learn regressors on a 10% sample**, selecting **Extra Trees Regressor**; retrain ETR on a fresh 50% sample and test on the other 50%; (6) inference pipeline: user supplies (player, match format, team1, team2, venue); fetch all historical rows matching those inputs with recursive input-dropping fallback; reshape to n×13 (batsman) / n×12 (bowler) matrix; predict per row and **average the n predictions**; all-rounders get summed batting+bowling predictions; (7) team recommendation: custom knapsack — `customknapSack(W, wt, val, n, L)` DP over credits W=100 maximizing predicted Dream-11 score, with a greedy pre-sort of values descending. Deployment via Flask + Airflow on a GCP VM.

## 4. Equations & assumptions
No formal equations are stated in the paper — the selection logic is given only as a Python code listing (`customknapSack`, a DP table K[i][w] storing {"weight","items"} with the standard knapsack recurrence plus a max-items constraint L, preceded by sorting values descending). I do not invent the recurrence in math notation beyond what the code shows. Stated assumptions (verbal): regressors are "the best-fit" for performance prediction; averaging predictions over all historical rows matching (player, format, teams, venue) approximates the prospective-match expectation; predicted Dream-11 scores are additive across players for team optimization; user knows only (player, format, team1, team2, venue), so same-match stats must be imputed from history at inference.

## 5. Features / target
Batsman training features: ['batsman','MF','team1','team2','venue','runs','balls','4s','6s','50s','100s','ducks','SR']. Bowler training features: ['bowler','MF','team1','team2','venue','overs','runs','maidens','wicket','econrate','4 wicket','5 wicket']. Target: the player's **Dream-11 score** (fantasy points) for the match. Prediction horizon: one prospective match. **Critical fact for §9: `runs`, `balls`, `4s`, `6s`, `wickets`, `econrate` are same-match statistics from which the Dream-11 score is deterministically computed.**

## 6. Validation design
Model selection on a **10% sample** of the data via PyCaret's compare (the paper says "Built the Model on 0.07% of Dataset and tested it on 0.93% of Dataset" — incoherent as written; I quote it exactly and note it likely means 7%/93% or is a typo, but it is not a usable spec). Final evaluation: ETR trained on a fresh 50% sample, tested on the unseen 50%, and separately "with the 100% of dataset with a Train-Test Split of 7:3." Splits are **random, not time-ordered**; there is no prospective (future-match) validation and no walk-forward test. Baselines: the base paper's classifiers on score buckets of width 10 (reported as "quite acceptable" accuracy, figures shown but not numerically quoted in text).

## 7. Numerical results / baselines
Quoted exactly from the conclusions (§IV):
- "When ETR ML Model was used with the 100% of dataset with a Train-Test Split of 7:3, we got an **R2 score of 0.99 for batsman dream-11 scores predictions, and an R2 score of 0.97 for bowler dream-11 scores predictions**."
- PyCaret's initial recommendation also showed R² ≈ 0.99, which the authors themselves call "quite alarming" but then accept after inspecting learning curves and feature importance.
- The authors' defense against overfitting (my distinction: their claim): "Learning Rate is higher than Testing rate" and "the correlation between the features chosen and label to be predicted is very high."
- Classifier baseline: bucketed score prediction accuracy "quite acceptable" (figures only, no numbers in text).
My interpretation (distinguished from their claims): the "very high correlation between features and label" is exactly the leakage mechanism — see §9.

## 8. Code / data availability
Data sources stated: cricsheet.org [37], ESPN Cricinfo [38], yorkpy PyPI package [27], PyCaret [39]. **No repository link for the authors' own code is stated** — "None stated" for code. The knapsack function is printed in the paper; nothing else is released.

## 9. Leakage & limitations
Adversarial view: (1) **Fatal target leakage.** The training features include `runs`, `balls`, `4s`, `6s`, `50s`, `100s` (batsman) and `wickets`, `runs conceded`, `maidens`, `econrate` (bowler) — the very same-match statistics from which a Dream-11 fantasy score is deterministically computed. Predicting a deterministic function of the inputs yields R² ≈ 0.99 trivially; this is not prediction, it is arithmetic. The authors' "not overfit" defense (high feature-label correlation) describes the leakage rather than refuting it. (2) At inference the same-match stats are unavailable, so the deployed pipeline substitutes historical averages — meaning the validated model (trained with leaked features) is not the model that is deployed (which sees imputed historical rows); the reported R² does not apply to the real inference path. (3) No time-ordered or prospective validation anywhere. (4) The "0.07%/0.93%" split statement is incoherent. (5) No uncertainty quantification, no calibration, no comparison against a naive historical-average baseline — which is likely all the deployed system amounts to. (6) Cricket-only; the Dream11 scoring system, credit prices, and constraints do not transfer to NFL DFS. (7) Undergraduate project with no peer review (arXiv only).

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` and the arxiv-deep directory. **Duplicate of an existing, stronger capability:** ledger **0010** (`0010-nfl-dfs-neural-projections-milp.md`) already covers NFL DFS lineup optimization with neural projections + MILP — a strictly more rigorous treatment of the same salary-cap team-selection problem. The repo also has extensive Week 1/Week 2 DFS work (optimizer pool JSONs, 2026-09-13-dfs, 2026-09-19-dk-week2). The paper's greedy+knapsack selection adds nothing over the existing MILP optimizer, and its player-prediction component is invalidated by the leakage in §9. Overlap verdict: duplicate (weaker) — do not build.

## 11. GSE implementation spec
No build recommended. The only generic idea — constrained team selection under a salary cap — is already implemented in GSE's MILP DFS optimizer (ledger 0010), which handles the actual NFL DFS problem with proper projections. Porting this paper's ETR-with-leaked-features predictor would inject a known-invalid component. Estimated effort: zero — do not build.

## 12. Reproducible test
Not applicable as an adoption test: any "reproduction" would reproduce the leakage, not a genuine edge. The honest diagnostic test — retrain ETR on **pre-match features only** (opponent, venue, trailing form, no same-match stats) with time-ordered splits — is the experiment the authors should have run; if GSE ever wanted the cricket-DFS analog it would start there, but GSE does not operate in cricket DFS.

## 13. Acceptance / rejection gate
**REJECT.** Gate (stated before any test, and already failed on inspection): adopt only if the R² ≥ 0.9 claim survives retraining on strictly pre-match features with time-ordered splits. It cannot — the 0.99/0.97 figures are produced by same-match stat inputs that are unavailable before the match. Combined with the cricket-only domain and the existing stronger MILP optimizer (0010), there is no path to adoption. Reject permanently.

## 14. Improvement experiment
The single experiment that would salvage the idea: rebuild the predictor with **strictly pre-match features** (trailing-N-match averages, venue, opponent strength, home/away, format) and **walk-forward validation** (train on seasons < t, predict season t), then compare the knapsack-selected teams against a historical-average baseline on realized Dream-11 scores. If the pre-match model cannot beat the historical average, the selection layer is optimizing noise. This is beyond the paper — it is the paper done correctly — and even then it would serve cricket DFS, not GSE's NFL mission, so it is not recommended as GSE work.
