# Ledger 1810 — AFBART: Adaptive Functional Bayesian Additive Regression Trees for Shot Intensity Surfaces

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2503.07789
- **Title:** How do the professional players select their shot locations? An analysis of Field Goal Attempts via Bayesian Additive Regression Trees
- **Authors:** Jiahao Cao, Hou-Cheng Yang, Guanyu Hu
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, AFBART model specification with adaptive basis and tree-ensemble coefficient functions, MCMC Algorithm 1, three-case simulation study with RMSPE/MIS/MCRPS tables, NBA 2017–18 application with intensity-surface fits, synthetic positional players, variable-importance analysis, four-fold cross-validation vs. FBART-TPS/FBART-FPC, discussion, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2503.07789.html` with extracted text at `/tmp/wave4b-dfs2/txt/2503.07789.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Shot intensity surfaces (where players shoot) are 2-D functional data with spatial nonstationarity, and their dependence on player attributes is nonlinear. Can a fully nonparametric Bayesian function-on-scalar regression — with *data-adaptive* basis functions and BART-modeled coefficient functions — estimate these surfaces and quantify uncertainty better than fixed-basis alternatives?

## 3. Method/model

**AFBART** (Adaptive Functional Bayesian Additive Regression Trees):

- Response: player shot-intensity surface λᵢ(s) on the half-court (function-on-scalar regression).
- **Adaptive reduced-rank basis:** basis functions built from low-rank thin-plate splines with a smoothness-encouraging mixture-of-normals prior (Bayesian FPCA spirit), replacing FBART's pre-specified bases.
- **Coefficient functions:** modeled as a sum of multivariate regression trees (BART ensemble, 50 trees) with regularization priors against overfitting.
- Posterior sampling via a Gibbs/Metropolis-Hastings MCMC (Algorithm 1 in the paper).

## 4. Mathematics, equations, assumptions

- Model: yᵢ(s) = Σₖ βₖ(xᵢ)φₖ(s) + εᵢ(s); φₖ adaptive orthonormal basis (matrix orthonormality constraint for identifiability); βₖ(x) = Σₜ g(x; Tₜ, Mₜ) (sum of trees).
- Basis prior: φ coefficients ~ mixture of normals with roughness penalty matrix (thin-plate spline penalty); smoothing parameters ~ vague hyperpriors.
- Tree prior: Chipman–George–McCulloch style with Ročková–Saha tail behavior; node parameters conjugate normal.
- **Assumptions:** Gaussian white-noise process on the discretized surface; smoothness of basis functions; 20 basis functions and 50 trees suffice (defaults).

## 5. Dataset/schema

- **NBA 2017–18 regular season**, 191 players with > 400 FGA (rookies excluded); shot data from nbasavant, summary stats from basketball-reference.
- Per player: intensity surface on a half-court grid (LGCP-estimated) + **24 scalar covariates** (position, age, MP, PER, TS%, 3PAr, WS, etc.).

## 6. Features and target

- **Features:** 24 player summary statistics + contextual info.
- **Target:** the 2-D shot-intensity surface (attempt frequency across court regions).

## 7. Validation design

- **Simulation:** 3 cases (well-specified; misspecified smooth; misspecified realistic shot surfaces) × 2 noise levels; metrics RMSPE, MIS (interval score), MCRPS; competitors FBART, BFOSR (Bayesian FOSR), LLR.
- **Real data:** 4-fold cross-validation vs. FBART-TPS (thin-plate fixed basis) and FBART-FPC (functional-PC fixed basis); metrics average RMSPE and MCRPS.

## 8. Exact results and baselines with numbers

Simulation — AFBART had the **lowest RMSPE, MIS, and MCRPS in all 6 settings** (excerpt, Case 1 low noise: RMSPE 0.07 vs. FBART 0.68 vs. BFOSR 13.38 vs. LLR 20.31; Case 3 realistic surfaces: RMSPE 0.34 vs. 0.69/0.90/3.02).

Real-data 4-fold CV (average RMSPE / MCRPS — exact values were blanked in the HTML extraction, ordering preserved):
- **AFBART lowest** on both RMSPE and MCRPS; FBART-TPS second; FBART-FPC third.

Variable importance (posterior mean splitting proportions), top 5: **position, block %, steal %, games played, 3-point attempt rate**.

Application outputs: posterior-mean intensity surfaces for 10 representative players match observed surfaces; synthetic "average" players per position constructed as benchmarks.

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: nbasavant shot data + basketball-reference (public).

## 10. Leakage and limitations

- The exact CV RMSPE/MCRPS numbers did not survive the HTML extraction (tables rendered blank) — only the ordering (AFBART < FBART-TPS < FBART-FPC) is verifiable from text.
- Intensity surfaces are pre-estimated via LGCP (two-stage; estimation uncertainty not propagated).
- Covariate measurement error (e.g., 3PAr from historical records) not modeled.
- Half-court geometry not built into the basis; temporal dynamics (within-season drift) not modeled.

## 11. GSE overlap

- This is GSE's **nonparametric shot-diet regression engine**: given a player's attributes and context, predict his full spatial shot distribution with calibrated uncertainty — the input to 3P/2P/FG-attempt prop distributions.
- Pairs with ledger 1809 (MFM archetypes as priors) and ledger 1806 (SEAM-style matchup shrinkage on the resulting surfaces).

## 12. Implementation specification

1. **Inputs:** GSE's NBA shot-attempt coordinates + player covariate store (24+ attributes).
2. **Stage 0:** LGCP intensity surfaces per player on a half-court grid.
3. **Model:** AFBART with 20 adaptive bases, 50 trees, MCMC per Algorithm 1 (Gibbs + MH tree updates); or a variational/approximate reimplementation if MCMC is too slow for production.
4. **Outputs:** posterior-mean surface + pointwise credible intervals per player; variable-importance rankings per refresh; synthetic positional-average surfaces as baselines.
5. **Use:** prop models sample shot diets from the posterior; credible-interval width feeds the uncertainty budget for 3-point and FG-attempt props.

## 13. Reproducible test

- Replicate the 3-case simulation: require AFBART RMSPE < FBART RMSPE in all 6 settings.
- On GSE NBA data: 4-fold CV; require AFBART MCRPS < FBART-TPS MCRPS and top-5 variable importance to include position and 3PAr.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** wins all 6 simulation settings on all 3 metrics (often by an order of magnitude, e.g., RMSPE 0.07 vs. 0.68) and wins the real-data 4-fold CV on both RMSPE and MCRPS. Accept as ADAPT (not ADOPT: two-stage LGCP gap, blanked exact CV numbers).
- **Improvement experiment:** single-stage model (joint LGCP + AFBART) and add half-court geometry-aware bases; test on the paper's simulation Case 3. Success = RMSPE ≤ 0.30 on Case 3 (vs. paper's 0.34) with no degradation in MIS/MCRPS.

**Verdict:** ADAPT — Adaptive-basis functional BART for shot-intensity surfaces; adopt as GSE's nonparametric shot-diet regression with calibrated uncertainty for 3P/FG prop distributions, with single-stage inference and geometry-aware bases as the improvement path.
