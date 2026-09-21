# Deep Research Ledger — 0068

- **file_index:** 0068
- **arxiv_id:** 2402.01914v1
- **title:** Predicting Batting Averages in Specific Matchups Using Generalized Linked Matrix Factorization
- **authors:** Michael J. O'Connell (corresponding author)
- **venue:** arXiv preprint; formatted as a journal research article (template DOI placeholder 10.1515/sample-YYYY-XXXX — appears to be a journal-submission draft)
- **date read:** 2026-09-21
- **reading path:** Full text read via arXiv PDF (842 extracted lines, all read). ar5iv not attempted (PDF rendered cleanly).
- **verdict:** ADAPT

---

## 1. Problem statement and claimed contribution

Predicting batting averages for specific batter-vs-pitcher matchups is hard because most matchups never occur: in the 2017 MLB data used, **76% of possible matchups never happened**. Prior approaches (log5, Bayesian log5 extensions) can't easily absorb many covariates. The paper introduces **Generalized Linked Matrix Factorization (GLMF)**: a multisource dimension-reduction method that jointly factorizes three bidimensionally linked matrices — the matchup matrix X (binomial: hits/at-bats), aggregate pitching stats Y (normal), aggregate batting stats Z (normal) — in the **natural-parameter space** using alternating IRLS (iteratively reweighted least squares) instead of alternating least squares, so each source can follow a different exponential-family distribution. Claimed advantage: GLMF "slightly outperforms existing methods" on simulations and cross-validation, and its real value is flexibility to absorb richer future data (e.g., Statcast).

## 2. Method details (architecture, features, training)

- **Data structure (§1, Fig. 1):** bidimensional integration. X = batter (rows) × pitcher (columns) matchup matrix with H (hits) and N (at-bats) count matrices; Y = pitching aggregates shares the column (pitcher) space; Z = batting aggregates shares the row (batter) space.
- **Distributional assumptions:** X ~ Binomial(N, p) with logit link on the natural parameter Θ; Y ~ Normal(Θ_Y, σ²), Z ~ Normal(Θ_Z, σ²) (aggregate rates over many trials, CLT invoked).
- **GLMF algorithm (§2.2):** rank-r joint approximation Θ_X, Θ_Y, Θ_Z sharing row/column factors (shared row structure U, shared column structure V, weightings W, C). Alternating IRLS: initialize Ṽ from the first r right singular vectors of the SVD of the stacked matrix; then iterate: update U via IRLS given V and scores; update V via IRLS; update stacked [U|W]-type blocks; update scores/loadings alternately until convergence. Variance σ² re-estimated each stage. (Factor symbols are garbled in extraction — see §3.)
- **IRLS step (§2.1):** standard Green (1984) IRLS per row: weights initialized to 1; starting values μ̂ = y with small correction for binomial zeros; Θ = g(μ) via link; induced response z = Θ + (y−μ)·g′(μ) (extraction garbled); weights w̃ from the variance function; weighted least squares per row; update Θ; repeat. Heterogeneous partitions handled by distribution.
- **Imputation (§3.1):** initialize missing X probabilities by row/column mean averaging (p̂_ij = mean of row mean and column mean), N=1 for missing; fit GLMF; replace missing with fitted values; iterate to convergence. Bounds [0.001, 0.999] imposed for log-likelihood evaluation.
- **Compared methods:** naive mean, log5 (James 1983: p̂ = (p_batter × p_pitcher / p_league) / (p_batter × p_pitcher / p_league + (1−p_batter)(1−p_pitcher)/(1−p_league)) — printed form garbled, standard formula), LMF (O'Connell & Lock 2019), PCA on centered/scaled X, logistic PCA (exponential PCA for binomial, Landgraf & Lee 2015 via logisticPCA package).

## 3. Math / equations (quote exactly; flag reconstructions)

- **Exponential-family parameterization (§1):** PRINTED FORM GARBLED — extraction shows "f(y|θ) = h(y) exp{η(θ)·T(y) − A(θ)}"-style content collapsed to "(|) = ℎ() exp { − ()}". **UNCERTAIN — do not quote; the intended content is the standard exponential-family form.**
- **Canonical links (Table 1):** Normal → identity; Binomial → logit g(μ) = log(μ/(1−μ)); Poisson → log. (Legible; standard.)
- **Eq. 1 (joint likelihood):** L(Θ_X,Θ_Y,Θ_Z | U,V,W,C) = ∏∏∏ f_X(x|·) f_Y(y|·) f_Z(z|·) — product over entries of the three exponential-family densities. **Partially garbled but structurally clear.**
- **Eq. 2 (rank-r joint approximation):** Θ_X = UWVᵀ-style shared decomposition — **GARBLED; factor symbols and shapes not recoverable from extraction. UNCERTAIN.**
- **IRLS steps 4–6:** induced response and weight formulas **GARBLED (UNCERTAIN)**; the procedure is the standard heterogeneous IRLS from Li & Gaynanova (2018), which is the citable reference.
- **log5 formula (§3.1):** garbled in extraction; the standard James (1983) formula is intended.

## 4. Data and experimental setup

- **Simulation (§2.3, §3.2):** 144 datasets (48 parameter combos × 3 replicates): σ (component SD) ∈ {0.1, 0.3, 0.5, 0.7}; max at-bats nmax ∈ {1, 2, 8, 16}; rank ∈ {1, 2, 3}; X is 200×200, Y 50×200, Z 200×50; 20% of X masked. Metrics: RMSE and binomial log-likelihood of predicted p given observed data. Illustrative single simulation: Pearson(true, estimated) = 0.979 (X), 0.993 (Y), 0.992 (Z).
- **Real data (§4):** 2017 MLB from MLB.com; pitchers with >20 IP (516), batters with ≥50 AB (508); 262,128 possible matchups, **62,528 observed (~24%)**; fivefold CV on observed matchups (~12,506 per test fold); ranks 1–3; metrics RMSE and binomial log-likelihood with [0.001, 0.999] clipping.
- **Aggregate features:** pitching: W, L, G, GS, GF, CG, SHO, SV, IP, H, R, ER, HR, BB, IBB, K, HBP, BK, WP (scaled per batter faced); batting: G, AB, R, H, 2B, 3B, HR, RBI, SB, CS, BB, K, TB, GIDP, HBP, SH, SF, IBB (scaled per PA).

## 5. Results (exact numbers, with table/section cites)

- **Table 4 (5-fold CV, real MLB data):** Rank 3 — RMSE: GLMF **0.342**, LMF 0.351, LPCA 0.344, PCA 0.358, Log5 0.345 (rank 1 only), Mean 0.344. Log-likelihood: GLMF **−0.854**, LMF −0.899, LPCA −0.864, PCA −0.952, Log5 −0.870, Mean −0.864. GLMF is best on both metrics at every rank; rank-3 GLMF is the overall winner, and GLMF is the only method whose performance *improves* with rank (others overfit — higher rank worsens them).
- **Honest caveat (§4):** "the naive mean imputation approach was the next best method" — mean 0.250 is a strong prior since true batting averages live in [0.200, 0.300]; the author notes competitors' losses to the mean indicate overfitting/high bias.
- **Simulation (Tables 2–3):** at high systematic variability (σ=0.5, 0.7) GLMF wins on log-likelihood and even on RMSE at σ=0.7 (a metric favoring Gaussian methods); LMF best at σ=0.3; mean imputation wins at σ=0.1 (low signal). GLMF failed to converge on 2 of 144 simulations (rank 3, low σ — singular matrices in IRLS).
- **Qualitative (§4):** most favorable 2017 matchup by rank-3 GLMF: **Jose Altuve vs. Bartolo Colon, predicted 0.463** (observed 0.333 in 3 ABs); LOESS curves show all methods negatively associated with observed averages above ~0.667 (single-AB 1.000s) — the models' shrinkage is argued to be more reasonable than the empirical 0/1.

## 6. Limitations and risks (as stated + reviewer view)

- **Stated (§5):** gains over LPCA are "small"; the Y/Z aggregate stats used are "relatively uninformative"; method should improve with Statcast-level data; GLMF generalizes to any exponential-family combination.
- **Reviewer view:**
  - **Margins are thin:** on real data GLMF (0.342/−0.854) barely beats the naive mean (0.344/−0.864) — the practical edge over "just use 0.250" is small with aggregate stats.
  - **Convergence failures** in IRLS (2/144 simulations) — needs regularization/SVD fallback for production use.
  - **Baseball-only application;** the transferable asset is the *method*, not the batting model.
  - **Equations unrecoverable from the PDF** — implementation must go through Li & Gaynanova (2018) and the LMF paper (O'Connell & Lock 2019, Biometrics), not the printed formulas.

## 7. Reproducibility and artifacts

- **Code:** Not stated in paper — no GitHub link. (logisticPCA R package is referenced for the LPCA baseline.)
- **Data:** 2017 MLB.com aggregates; described fully enough to rebuild (filters: >20 IP, ≥50 AB).
- **Algorithms specified verbally** (IRLS steps, imputation loop, simulation design) — reproducible in principle from the cited references.

## 8. GSE application

- **The method, not the baseball:** GLMF is a general tool for **sparse matchup matrices with heterogeneous side data** — exactly GSE's problem in several places:
  1. **Receiver-vs-coverage / QB-vs-defense matchup matrices:** completions/targets (binomial) with aggregate offense/defense stats (normal) as the Y/Z side matrices — the direct NFL analog of this paper (76% of NFL player-vs-unit matchups are likewise unobserved).
  2. **Prop-market analog:** batter/pitcher → player/defense success-rate imputation for markets with thin head-to-head history.
  3. Any GSE problem shaped as "sparse pairwise outcomes + rich marginal stats" (e.g., OL-vs-DL pressure rates).
- **Why it fits:** GSE already computes unit matchup features; GLMF gives a principled low-rank imputation with proper binomial handling instead of ad-hoc shrinkage — and it *improves* with rank where Gaussian LMF/PCA overfit (Table 4), which matters for high-dimensional NFL stat side data.

## 9. Implementation spec for GSE

1. Reimplement GLMF from Li & Gaynanova (2018) heterogeneous IRLS + O'Connell & Lock (2019) LMF alternating scheme (do not trust the paper's printed equations).
2. Build the NFL analog: X = receiver×defense (or QB×defense) binomial matrix (successes/opportunities, e.g., completions/targets or EPA>0 plays/snaps), Y = defensive aggregate stats (normal), Z = offensive aggregate stats (normal), 2022–2025 seasons.
3. Reproduce the paper's validation: 5-fold CV masking observed matchups; compare GLMF vs. mean/shrinkage/log5-analog on RMSE + binomial log-likelihood.
4. Add ridge regularization to the IRLS M-steps to prevent the singular-matrix convergence failures.

## 10. Test protocol

- **Reproduction gate:** on the paper's simulation design (or the 2017 MLB rebuild), rank-3 GLMF must beat mean imputation on binomial log-likelihood.
- **GSE gate:** 5-fold CV on the NFL matchup matrix, time-ordered (train ≤2024, test 2025); metric = binomial log-likelihood of held-out matchup outcomes. **Adopt if GLMF beats the current GSE shrinkage/matchup prior by a statistically significant margin;** adapt (keep as an offline research prior) if it only matches.
- **Stability check:** zero convergence failures across CV folds after regularization.

## 11. Improvement paths

- Swap the paper's weak aggregate Y/Z for NGS/Statcast-grade side data (separation, pressure rates, coverage shells) — the paper itself predicts this is where the gains come from.
- Extend to more than three matrices (the framework allows it): add weather, venue, referee-crew matrices as additional linked sources.
- Within-matrix heterogeneous distributions (the framework allows per-entry distributions) — e.g., mixing binomial success rates with Poisson sack counts.
- Bias-correction for the systematic over/under-estimation patterns the LOESS analysis revealed.

## 12b. Acceptance gate

1. **Reproduction criterion:** rebuild the paper's 2017 MLB setup (rank 3, 5-fold CV masking observed matchups) and confirm rank-3 GLMF beats mean imputation on binomial log-likelihood, as in Table 4 (paper: GLMF −0.854 vs. mean −0.864, a +0.010 nats-per-matchup gap), per §10.
2. **Comparison to run:** on the NFL matchup analog (receiver×defense or QB×defense binomial matrix + normal aggregate side matrices), 5-fold CV time-ordered (train ≤2024, test 2025): GLMF vs. mean/shrinkage/log5-analog — metric = binomial log-likelihood of held-out matchup outcomes; record convergence failures per fold (paper's simulation had 2/144 IRLS failures — require zero after ridge regularization, per §10).
3. **Decision rule:** ADOPT only if GLMF beats the current GSE shrinkage/matchup prior by a statistically significant log-likelihood margin with zero convergence failures across folds; ADAPT (offline research prior) if it only matches; otherwise REJECT.

## 12. Verdict

**ADAPT** — The baseball application is irrelevant to GSE, but GLMF itself is a legitimate, properly-validated statistical method for the exact structural problem GSE faces repeatedly: sparse pairwise matchup outcomes enriched with marginal stats. It beat five baselines on real data and is the only method that improves with rank. Port the method to NFL matchup matrices; do not port the batting model.

## 13. Related work / overlap

- **Cited lineage:** O'Connell & Lock (2019) LMF, Park & Lock (2020), Yuan & Gaynanova (2021), Li & Gaynanova (2018) GAS, Collins et al. (2002) exponential PCA — none in GSE's corpus per the existing-research map; no duplication.
- **GSE stack fit:** complements existing matchup/unit features and the Elo/AR(1) modeling; no overlap with the trajectory (0063/0065/0066), momentum (0062/0067), or xG lanes.
- **This batch:** the only methods/stats paper among applied sports papers; pairs naturally with 0069 (Bayes-xG) as the "hierarchical modeling" sub-lane.

## 14. Extraction notes

- PDF extraction garbles the exponential-family parameterization, Eq. 2's factor symbols, IRLS steps 4–6, and the log5 formula — all flagged UNCERTAIN in §3; the citable references are Li & Gaynanova (2018) and O'Connell & Lock (2019). Tables 2–4 and all quoted numbers are clean and verified. The paper is a journal-submission draft (template DOI placeholder); treat venue as provisional.
