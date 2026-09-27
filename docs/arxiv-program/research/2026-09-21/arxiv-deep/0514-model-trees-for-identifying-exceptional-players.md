# [0514] Model Trees for Identifying Exceptional Players in the NHL Draft (arXiv:1802.08765v1)

**Citation:** Oliver Schulte, Yejia Liu, Chao Li (2018). *Model Trees for Identifying Exceptional Players in the NHL Draft*. arXiv:1802.08765v1. URL: https://arxiv.org/abs/1802.08765v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 9 pages / 38,677 chars).
**Verdict:** ADAPT — the sport is NHL, but the two methodological contributions transfer directly to NFL draft modeling: (1) the logistic-model-tree solution to the zero-inflation problem (predict P(plays ≥1 game), rank by that probability), and (2) interpretable per-group regression weights for explaining individual prospect rankings.

## 1. Research question
Can model-tree learning — which discovers data-driven groups of comparable players and fits a separate regression model per leaf — predict NHL draft success (games played in first 7 years) more accurately than single global models or hand-defined cohort approaches, while remaining interpretable to scouts?

## 2. Dataset / schema
- NHL Entry Draft prospects, 1998–2008 (excluding goalies), from public sources: nhl.com, eliteprospects.com, draftanalyst.com, plus David Wilson's NHL performance dataset. Full dataset posted at https://github.com/liuyejia/Model_Trees_Full_Dataset (stated, not verified by this worker).
- Features (Table 1): DraftAge, Country (CAN/USA/EURO pooled), Position (L/R/C/D), Overall pick, CSS_rank (NHL Central Scouting rank; unranked → 1 + max rank of draft year), regular-season stats in draft year (GP, G, A, P, PIM, PlusMinus), playoff stats (GP, G, A, P, PIM, PlusMinus); weight/height mentioned as included.
- Target: sum_7yr_GP (total NHL games in first 7 years under contract — teams hold 7-year rights); binary GP_7yr_greater_than_0. Time on ice analyzed too, results "very similar."
- ~50% of draft picks never play an NHL game (zero-inflation, per Tingling et al. 2011).

## 3. Method / model
- Logistic regression model tree (LMT): tree partitions feature space on discrete values or learned continuous thresholds; each leaf fits its own logistic regression predicting p_i = P(g_i > 0) (plays at least one NHL game in 7 years). Players ranked by p_i. Built with the LogitBoost algorithm (Friedman et al. 2000) in Weka's LMT package; final leaf weights refit by maximum likelihood for interpretability (not the LogitBoost shrunken weights).
- Zero-inflation solution: instead of predicting game counts directly (linear regression tree via M5P collapses to a stump on CSS rank, SRC 0.4), predict the balanced binary outcome; the probability doubles as a success ranking.
- Explainability: player i's log-odds difference vs group mean = Σ_j w_j (x_ij − x̄_gj); strongest/weakest features = argmax/argmin of w_j(x_ij − x̄_gj) — features that are both predictive (|w_j| large) and unusual for the group.
- Baselines: draft order ranking; Schuckers' generalized additive model (GAM, Schuckers 2016); M5P linear regression tree.

## 4. Equations & assumptions
Stated equations:
- Leaf model: p_i = P(g_i > 0) (logistic regression per leaf; cell equations not written out).
- Explanation: log-odds difference = Σ_{j=1}^{m} w_j (x_ij − x̄_gj).
- Spearman rank correlation (no ties): ρ = 1 − 6Σd_i² / (n(n²−1)); with ties (zero-game players), Pearson correlation of ranks: ρ = Σ_i(x_i−x̄)(y_i−ȳ) / √(Σ_i(x_i−x̄)² Σ_i(y_i−ȳ²)).
Stated assumptions: (a) P(plays ≥1 game) is a good ranking proxy for eventual games played; (b) 7-year window captures draft value (7-year team rights); (c) unranked CSS players can be imputed as max-rank+1; (d) pooling European countries and summing multi-team stats is valid; (e) tree splits chosen for predictive accuracy produce "predictively relevant" groups; (f) maximum-likelihood leaf weights (vs LogitBoost shrinkage) preserve interpretability without much accuracy loss.

## 5. Features / target
- Inputs: demographics (age, country, position), draft-year regular-season + playoff counting stats (GP/G/A/P/PIM/plus-minus), CSS scouting rank, overall draft pick, height/weight.
- Target: binary — played ≥1 NHL game within 7 years; ranking evaluated against actual 7-year game counts. Training cohorts: {1998,1999,2000} and {2004,2005,2006}; out-of-sample draft years 2001, 2002, 2007, 2008.

## 6. Validation design
- Temporal out-of-sample: train on 3 draft years, test on a later draft year (4 train/test splits). Metric: Spearman rank correlation (SRC) between model ranking and actual-games ranking; also LMT classification accuracy and Pearson-of-ranks (appendix Table 3). Baselines: draft-order SRC, Schuckers GAM SRCs.
- Comparability caveat (paper's own): GAM correlations not directly comparable — GAM applied only to players with ≥1 NHL game and used Cescin CSS conversion factors (×1.35 North America, ×6.27 Europe).

## 7. Numerical results / baselines
- Table 2 (SRC; columns: Draft Order SRC / LMT classification accuracy / LMT SRC): train 1998–2000 → test 2001: 0.43 / 82.27% / 0.83; → 2002: 0.30 / 85.79% / 0.85. Train 2004–2006 → 2007: 0.46 / 81.23% / 0.84; → 2008: 0.51 / 63.56% / 0.71. LMT ranking beats draft order in all four splits.
- GAM (Schuckers, not directly comparable): 2001: 0.53, 2002: 0.54, 2007: 0.69, 2008: 0.71 — competitive with LMT.
- M5P linear regression tree: decision stump on CSS rank only, SRC 0.4 (2004–2006 cohort) — "substantially worse."
- Learned groups (2004–2006 tree): CSS rank <12 → 82% play ≥1 game; CSS ≥12 & rs points <12 → 16%; rs points ≥12 then plus-minus negative → 37%, neutral → 61%, positive → 92% (with >10 playoff assists, n=13). Median games in the positive-plus-minus/high-assist group = 128.
- Group weights: CSS rank −17.9 (Group 1); rs points +14.2 (Group 2); rs plus-minus +13.16 (Group 3); rs goals +3.59 (Group 5, 64.8% forwards) vs −2.17 (Group 2, 61.6% defensemen — tree learns position-appropriate weights via correlated stats, not position directly).
- Case studies: Kyle Cumiskey (unranked by CSS, model's top-ranked in his group, drafted 222nd, 132 NHL games, 2015 Stanley Cup); Brad Marchand (CSS 80, model top of group 6); Milan Lucic (tops Group 5); Sidney Crosby, Patrick Kane top Group 1.

## 8. Code / data availability
Dataset posted at https://github.com/liuyejia/Model_Trees_Full_Dataset (stated, not verified). Methods via Weka LMT package and GUIDE (cited, not linked). No code link stated.

## 9. Leakage & limitations
- Temporal validation is honest (train on earlier drafts, test on later), but the feature set is thin: no junior-league indicator in the tree (explicitly left to future work for interpretability), so league-strength confounding is unmodeled; CSS rank dominates the root split, meaning the model partly re-learns scouting consensus.
- The 2008 test split shows a sharp accuracy drop (63.56% vs 81–86%) — the paper doesn't investigate; suggests regime sensitivity (2008 draft class or 7-year window truncation effects).
- Binary-target trick discards magnitude information: a player with p=0.9 who plays 10 games ranks above one with p=0.8 who plays 500. SRC on games played partially masks this.
- Weights are maximum-likelihood refits on small leaves (n=13 in the strongest group) — high variance, overfitting risk in the explanation layer.
- Not directly comparable to the GAM baseline by the paper's own admission; the "competitive with state-of-the-art" claim rests on non-identical data preparation.
- External validity to NFL: NHL draft (7 rounds, junior leagues, CSS ranks) differs structurally from the NFL draft (7 rounds but college conferences, combine data, RAS); the transfer is methodological, not the tree itself.

## 10. GSE overlap
Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. GSE has no draft-prospect modeling lane (existing map covers pro-level EPA/WP/projection work; the 58-paper dossiers skew to in-game and market models). This paper is therefore a NEW CAPABILITY candidate: data-driven prospect evaluation with zero-inflation handling. Methodological neighbors in the map: interpretable-models area of the 15-area ML brief (commissioned, results pending), Bradley-Terry/Elo rating entries. Not a duplicate of anything in the repo.

## 11. GSE implementation spec
- Data: NFL draft prospects 2000–2025 — college production (sports-reference/cfbfastR), combine measurements + RAS, draft position, team draft slot; target: binary played ≥1 NFL regular-season snap within first 4 years (rookie-contract window analog of the 7-year NHL rights), plus games played for SRC evaluation.
- Model: logistic regression model tree (modern implementation: e.g., `glmertree`/`lmtree` in R or a custom sklearn-compatible MOB tree; Weka LMT as the paper's reference). Root-split candidates: draft position (analog of CSS rank), college dominator metrics, RAS.
- Training protocol: temporal splits — train on drafts ≤2018, validate 2019–2021, test 2022–2024 (4-year outcome window observable).
- Explanation layer: per-prospect Σ_j w_j(x_ij − x̄_gj) strongest/weakest features vs their data-discovered comparable group — directly usable in draft content ("why the model is higher/lower than consensus on prospect X").
- Serving: batch per draft class; outputs feed draft-model content and rookie-projection priors for dynasty/DFS.
- Estimated effort: ~1–2 weeks (data assembly is the bulk; modeling is straightforward).

## 12. Reproducible test
Dataset: NFL draft classes 2000–2024 with college stats + combine + draft slot (exclude kickers/punters or model separately). Metric: Spearman rank correlation between model P(plays≥1 snap in 4 yrs) ranking and actual 4-year games-played ranking, plus classification accuracy on the binary target. Baselines: draft-order SRC (the paper's exact analog) and a single global logistic regression. Time window: train ≤2018 drafts, test 2019–2024 drafts.

## 13. Acceptance / rejection gate
ADOPT the model-tree approach for GSE draft coverage if, on the 2019–2024 test drafts, the logistic model tree's SRC beats draft-order SRC by ≥0.10 AND beats the global logistic regression's SRC by ≥0.05; REJECT otherwise (if draft position alone subsumes the signal, the tree adds nothing over consensus).

## 14. Improvement experiment
Go beyond the paper's binary trick with a hurdle model tree: keep the logistic tree for P(plays ≥1 game), then fit a second per-leaf truncated-count model (zero-truncated negative binomial) for games-played-given-participation, ranking by E[games] = P(play)·E[games|play]. Hypothesis: the hurdle ranking will beat the pure-binary ranking on SRC because it recovers the magnitude information the paper discards — directly testing whether the paper's "probability as ranking" shortcut is lossy, and producing a more useful expected-games output for rookie projections.
