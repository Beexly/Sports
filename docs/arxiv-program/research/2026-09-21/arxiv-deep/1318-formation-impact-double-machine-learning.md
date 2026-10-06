# [1318] The Impact of Formations on Football Matches Using Double Machine Learning (arXiv:2602.16830) — REPLACES 1130

**Citation:** Ruiz-Menárguez, G., & Badiella, L. (2026). *The Impact of Formations on Football Matches Using Double Machine Learning. Is it worth parking the bus?* arXiv:2602.16830v1. URL: https://arxiv.org/abs/2602.16830
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all 8 sections).
**Replaces:** ledger 1130 (ATSCM, REJECT — no empirical content). Found via arXiv API search (causal + sport + effect), dedup-checked against the corpus, /tmp/w3-dedup list, and all 12 assigned IDs.
**Verdict:** ADAPT — the paper's real contribution is methodological: Double Machine Learning extended to categorical treatments via matrix-based residualization (effect-coded formation-combination dummies). That machinery ports directly to GSE's causal questions about personnel groupings, defensive fronts, and 4th-down decisions, where team strength confounds every naive comparison.

## 1. Research question
Does "parking the bus" (defensive formations) causally improve match outcomes, or do offensive formations? The authors estimate causal effects of formation *combinations* (own × opponent) on goal difference, possession, corners, and cards, using Double Machine Learning on 22,000+ European league matches.

## 2. Dataset / schema
- Sportmonks API (commercial): 22,000+ professional league fixtures, seasons 2018–19 through 2024–25.
- Leagues: first divisions of England, Italy, Spain, Germany, France, Netherlands, Portugal + Turkey, Belgium, Poland first divisions + Spain/Italy/England second divisions (32+ regular-season matches and API availability criteria).
- Cleaning: dropped playoffs/play-outs; dropped first 2 and final 4 rounds per season (early instability, late-season motivation effects); dropped incomplete Belgian/Turkish seasons.
- 28 distinct formations grouped by expert consultation + tactical similarity into 6 categories (defensive→offensive): 5-4-1, 4-4-2, 3-5-2, 4-2-3-1, 4-3-3, 3-4-3 (Table 1 gives per-league shares, e.g., 4-2-3-1 and 4-3-3 most common overall).
- Confounders: season, league, day of week, home/away, accumulated points ratio (home/away separately), UCL-participation flag, league ranking at fixture time, winning streak, weather. Betting odds deliberately excluded (endogeneity: odds may price formation info). Mediators (in-game goals, possession, fouls, substitutions) deliberately excluded from confounders.
- Outcomes: goal difference, red-card difference, yellow-card difference, possession difference, corner difference.

## 3. Method / model
- Double Machine Learning (Chernozhukov et al. 2018): Y = Dβ + Xγ + ε. Stage 1: XGBoost regressor (max_depth capped at 5, tuned on −MSE) predicts Y from X → residual rY. Stage 2: separate XGBoost per treatment dummy predicts Di,j from X → residual rDi,j. Stage 3: OLS of rY on all rDi,j → β̂i,j.
- Categorical-treatment innovation: k=6 formations → k²−1 dummies with effect coding: Di,j = 1 for formation-combo (i,j) rows, −1 for the omitted Dk,k rows, 0 otherwise. Omitted combo's effect recovered as β̂k,k = −Σ β̂ (others); diagonal βk,k = 0 by construction; matrix theoretically symmetric β̂i,j = −β̂j,i (deviations attributed to ML approximation).
- Cross-fitting/sample splitting per DML; orthogonality condition holds per dummy after residualization.
- Side adjustment: β̂_side(i,j) = β̂i,j + E(Ŷhome) to combine pure formation effect with home advantage.

## 4. Equations & assumptions
- Y = Dβ + Xγ + ε; rY = Y − f̂(X); rDi,j = Di,j − D̂i,j; final: rY = Σ βi,j·rDi,j + ϵ.
- Effect coding: Di,j ∈ {1 (combo), −1 (omitted Dk,k), 0}; β̂k,k = −(β̂1,1 + … + β̂k,k−1).
- Assumptions: unconfoundedness given X (the listed confounders suffice); no interference between fixtures; formation grouping preserves the causal contrast of interest; nominal starting formation is the treatment (in-game formation changes acknowledged as a limitation); XGBoost max_depth 5 suffices for nuisance functions.

## 5. Features / target
Inputs: confounder set above; treatment = effect-coded formation-combination dummies (35 dummies for 6×6−1). Targets: goal difference, red/yellow card differences, possession difference, corner difference (main vs rival team).

## 6. Validation design
- First-stage XGBoost models evaluated on held-out test set (MSE, R²) — reported as diagnostics, not the objective.
- Final β̂i,j judged by p-values (∗∗∗ p<0.001, ∗∗ p<0.01, ∗ p<0.05, ns ≥0.05); symmetry of the β̂ matrix used as a sanity check on the ML approximation.
- No separate causal validation (no RCT/placebo); identification rests on the confounder design.

## 7. Numerical results / baselines
- First-stage XGBoost (test): goals MSE 2.70 / R² 0.118; red cards 0.19 / 0.003; yellow cards 3.18 / 0.030; possession 343.35 / 0.298; corners 7.98 / 0.781. (Corners highly predictable from confounders; cards essentially unpredictable — honestly reported.)
- Goal difference — 3 significant combos: 4-2-3-1 vs 3-5-2: +0.16 goals (p<0.001); 4-3-3 vs 5-4-1: +0.17 (p<0.05); 4-3-3 vs 4-4-2: +0.11 (p<0.05). All else ns. Home effect E(Ŷhome) = 0.285 goals (e.g., 4-2-3-1 home vs 3-5-2 ≈ +0.445 total).
- Red cards: zero significant combos — formation does not causally move red cards.
- Yellow cards: 3 significant: 5-4-1 vs 4-2-3-1 +0.16 (p<0.01); 3-5-2 vs 4-2-3-1 +0.17 (p<0.001); 3-5-2 vs 4-3-3 +0.16 (p<0.01) — defensive formations draw slightly more yellows (≈1 extra per 6 matches).
- Possession: 13 of 18 unique combos significant (mostly p<0.001); offensive-vs-defensive matchups systematically favor the offensive side; 4-3-3 strongest within offensive group.
- Corners: offensive vs defensive significant but small — e.g., 4-2-3-1 vs 5-4-1 +0.19, vs 4-4-2 +0.18, vs 3-5-2 +0.23, against a ~5/match average.
- Headline: no evidence parking the bus increases winning potential; formation effects on goals are small and sparse.

## 8. Code / data availability
None stated (Sportmonks data is commercial; no code link in paper).

## 9. Leakage & limitations
- Unconfoundedness is asserted via the confounder list, not tested — no placebo/refutation checks reported. Team-strength proxies (points ratio, ranking) are coarse; within-matchup quality gaps may remain.
- Nominal starting formation ≠ in-game formation (subs, tactical shifts) — treatment is mismeasured toward the null, so significant effects are likely conservative but nulls may be false negatives.
- 28→6 formation grouping is expert-judgment-driven; different groupings could change results (researcher degrees of freedom, though disclosed).
- First 2 / last 4 rounds dropped — selection choice that could interact with formation usage patterns.
- XGBoost max_depth 5 is a strong regularizer; nuisance underfit would bias β̂ — the symmetry check is reassuring but not a proof.
- Soccer-specific; formations are discrete and observable pre-match, which is what makes the design work.

## 10. GSE overlap
New method for the causal lane. The existing-research map lists causal inference as an ML-brief topic with no DML work in-repo; the Drive dossiers cover FineCausal (2503.23911) but not debiased ML for categorical treatments. GSE's 4th-down work (2026-09-20 ngreenberg estimates) and scheme/personnel analyses are associational — this paper supplies the exact template to make them causal: residualize the outcome and the decision on team-strength confounders, then read the effect off the residuals.

## 11. GSE implementation spec
- Port the three-stage DML to NFL: treatment = categorical game-plan choices (personnel grouping 11/12/21 on offense; defensive front/coverage shell; go-for-it vs punt/FG on 4th). Confounders X: ELO/ratings, rest, weather, home/away, injuries, week — explicitly excluding mediators (EPA, success rate). Outcome Y: EPA/play or win probability added.
- Use XGBoost (max_depth 5, per the paper) or the repo's existing GBM for nuisance models; effect-code the treatment dummies exactly as the paper does; cross-fit by season.
- First application: causal effect of 4th-down go decisions (go vs kick) on WPA, residualized on team strength — a direct upgrade of the associational 4th-down literature in-repo.
- Effort: 1 week for the DML harness + one treatment application; each new treatment is a config change.

## 12. Reproducible test
Dataset: nflverse 2019–2025 play-by-play. Treatment: 4th-down go vs punt/FG (binary first, then categorical by distance bucket). Metric: DML estimate β̂ of go-decisions on drive WPA with 95% CI from the final-stage OLS. Baselines: naive (no-confounders) comparison and a propensity-matched estimate. Gate: DML estimate must (a) have the same sign as the naive estimate but smaller magnitude (confounding removed, not invented), and (b) pass a placebo test — randomly permuted treatments must yield β̂ ≈ 0 (the refutation check the paper omitted).

## 13. Acceptance / rejection gate
ADAPT the DML harness if: the placebo test passes (|β̂_placebo| < 0.2·|β̂_real|) AND the β̂ matrix/estimates are stable across two nuisance learners (XGBoost vs random forest, sign agreement on all significant effects). REJECT any single treatment finding that fails the placebo test — the method only earns trust with refutation checks the original paper skipped.

## 14. Improvement experiment
Heterogeneous DML: interact the residualized treatment with game state (score differential, quarter, field position) via a causal forest on the DML residuals, estimating CATEs of go-decisions by situation. Hypothesis: the average effect masks strong heterogeneity (go-decisions help more when trailing late) — the CATE surface is what a coach actually needs, and it's the natural extension the paper's average-effect framework doesn't attempt.
