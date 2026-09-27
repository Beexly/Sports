# Ledger 1812 — Regularized Adjusted Plus-Minus Models for Evaluating and Scouting Football (Soccer) Players using Possession Sequences

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2407.17832
- **Title:** Regularized Adjusted Plus-Minus Models for Evaluating and Scouting Football (Soccer) Players using Possession Sequences
- **Authors:** Robert Bajons, Kurt Hornik (Vienna University of Economics and Business)
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, possession-segment data construction, ridge/group-lasso/exclusive-lasso/generalized-lasso specifications with practitioner interpretations, conic-programming implementation for the binomial generalized lasso, rating comparisons, validity analysis with bivariate-Poisson and ordered-logit match-prediction models, Brier/informational-loss results with paired t-tests, discussion, and references) from the extracted text at `/tmp/wave4b-dfs2/txt/2407.17832.txt` (HTML saved to `/tmp/wave4b-dfs2/papers/2407.17832.html`). Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Classical plus-minus segments (same players on the field) are too coarse and cannot separate on-ball from off-ball contributions. If matches are segmented into *possession sequences* (consecutive on-ball actions), can penalized regression with football-specific penalty structures (position-group, exclusive, generalized/ranking lasso) rate players' direct (on-ball) and indirect (on-field) contributions — and do those ratings predict match outcomes better than ELO or xG-based baselines?

## 3. Method/model

- **Data:** each possession (sequence of consecutive on-ball actions ending in the final third, ≥ 3 actions, or set-piece exceptions) is one row; binary columns for **direct involvement** (player touched the ball in the possession) and **on-field** indicators (player on the pitch for attacking/defending team); response = **goal indicator** (1.3% positive rate).
- **Four penalization schemes** on binomial logistic regression:
  1. **Ridge** — shrinks all coefficients; offensive players load on direct, defensive on indirect.
  2. **Group lasso** — 8 groups (4 positions × direct/indirect); group-level selection, ridge-like within group.
  3. **Exclusive lasso** — ridge between groups, lasso within: selects a few standouts per group (scouting use case).
  4. **Generalized (ranking) lasso** — fused/ranking penalty clustering similar-strength players into equivalence classes, separately for direct and indirect coefficients.
- Team strength = average of player ratings; evaluated as the single covariate in match-outcome models.

## 4. Mathematics, equations, assumptions

- Ridge: min_β −ℓ(β) + λ‖β‖²₂; group lasso: −ℓ(β) + λΣ_g w_g‖β_g‖₂; exclusive lasso: λΣ_g‖β_g‖₁²; generalized lasso: λ‖Dβ‖₁ with block-structured D separating direct/indirect ranking penalties.
- Binomial GLM solved by IRLS (glmnet/SGL/ExclusiveLasso); the binomial generalized lasso reformulated as a **conic program** (linear + exponential cones) solved via ROI.
- **Assumptions:** (a) spatial/temporal possession features (length, speed) are *caused by* the players involved, so they're excluded; (b) goal indicator is an adequate possession value proxy despite 1.3% imbalance; (c) position groups are known and static.

## 5. Dataset/schema

- **Spanish La Liga 2017/18**, open event-stream data via Figshare (Pappalardo et al. 2019).
- Design matrix: 2N columns (N players × {involvement, on-field}), rows = valuable possessions (final-third, ≥ 3 actions).
- Match outcomes: first 280 matches train, last 100 test.

## 6. Features and target

- **Features:** player direct-involvement and on-field indicators per possession.
- **Target (rating stage):** possession goal indicator. **Target (validity stage):** match outcome (home/draw/away).

## 7. Validation design

- **Validity framework** (Hvattum & Gelade): train ratings on first 280 matches; team strength = mean player rating (two combination rules: sum of direct+indirect, and standardized average); predict last 100 matches with (a) **bivariate Poisson** (Karlis & Ntzoufras) and (b) **ordered logistic regression**, each with only the team-strength difference as covariate.
- Metrics: **Brier score** and **informational loss**; paired two-sided t-tests vs. references.
- References: intercept-only **Baseline**, **clubelo.com ELO**, and **PCV** (Bajons 2023 debiased ML metric).

## 8. Exact results and baselines with numbers

- **Best model: group lasso** under both prediction frameworks and both loss criteria; ridge close behind; exclusive lasso close; generalized lasso worst of the four (expected — it's built for clustering, not rating).
- All four penalized models **beat all three references** (Baseline, ELO, PCV); ELO and PCV only slightly beat the intercept-only baseline.
- Paired t-tests: under OLR, ridge/group/exclusive lasso significantly outperform Baseline and ELO at the **5% level**; under bivariate Poisson, significant at the **10% level**.
- Ridge vs. group-lasso rating correlations ≥ **0.7** for all position groups; offensive players load on direct involvement, defensive players on indirect.
- (Exact Brier/IL table values were blanked in the HTML extraction; orderings and significance statements are verbatim from text.)

## 9. Code/data availability

- No public code URL was given in the extracted text (R: glmnet, SGL, ExclusiveLasso, ROI).
- Data: La Liga 2017/18 event data via Figshare (open).

## 10. Leakage and limitations

- Single season, single league — no cross-league or cross-season validation.
- Goal indicator at 1.3% is extremely imbalanced; xG-valued targets would discriminate better (authors' own suggestion).
- Excluding possession spatiotemporal features assumes they're fully explained by personnel — strong and untested.
- The 100-match test set is small for paired t-tests; bivariate-Poisson significance only reaches 10%.

## 11. GSE overlap

- This is GSE's **possession-segment RAPM** template with the on-ball/off-ball split: directly portable to NFL *drive* segments (direct involvement = touched the ball on the drive; indirect = on the field) for crediting skill players vs. decoys/blockers, and to NBA stints.
- The position-group penalty structure maps to NFL position groups (WR/RB/TE/OL/QB) — group lasso's win over ridge is evidence GSE should use grouped shrinkage in its own RAPM-style ratings.
- Validity framework (train ratings → predict games with a single-covariate model vs. ELO) is a reusable GSE rating-validation protocol.

## 12. Implementation specification

1. **Inputs:** GSE's play/drive data with on-field personnel and touch attribution (NFL drives; NBA stints).
2. **Design matrix:** per segment, direct-involvement + on-field indicators per player; response = segment scoring indicator (goal/TD/drive points).
3. **Fit** ridge + group lasso (position groups × involvement type) with CV-tuned λ; exclusive lasso for scouting shortlists.
4. **Combine** direct + indirect per player (test sum vs. standardized-average on validation).
5. **Validate** with the paper's protocol: train-segment ratings → single-covariate game-outcome model vs. ELO baseline on a held-out match block.

## 13. Reproducible test

- Rebuild on one NFL season of drive data: require group lasso ≥ ridge on Brier score for held-out games, and both significantly better than an ELO-only baseline at 10% (paired t-test).
- Unit test: offensive skill players must load higher on direct involvement; linemen/defenders higher on indirect.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** group lasso best under 2 frameworks × 2 criteria; all penalized models beat Baseline/ELO/PCV with 5% (OLR) / 10% (BP) significance. Accept as ADAPT (not ADOPT: single-season, imbalanced target, small test set).
- **Improvement experiment:** replace the binary goal target with expected-points (xG/xP) value of the possession/drive, and add home/manpower adjustments (authors' suggested extensions). Success = Brier-score improvement ≥ 5% over the goal-indicator version on the same 100-match protocol.

**Verdict:** ADAPT — Possession-segment RAPM separating on-ball and off-ball contributions with position-group penalties; adopt the group-lasso specification and the train-ratings→predict-games validity protocol for GSE's NFL drive-level and NBA stint-level player ratings, with expected-points targets as the improvement path.
