# [0253] In-season prediction of batting averages: A field test of empirical Bayes and Bayes methodologies (arXiv:0803.3697v1)

**Citation:** Brown, L. D. (2008). *In-season prediction of batting averages: A field test of empirical Bayes and Bayes methodologies*. The Annals of Applied Statistics, 2(1), 113–152. DOI: 10.1214/07-AOAS138. arXiv:0803.3697v1. URL: https://arxiv.org/abs/0803.3697
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1937 lines).
**Verdict:** REJECT — the canonical empirical-Bayes batting-average study; its lesson (shrinkage estimators, even the grand mean, beat the naive estimator) is foundational statistics already absorbed in GSE's calibration/ML lanes, and the MLB binomial-average setting has no NFL transfer path.

## 1. Research question
Using only first-half (or first-three-months) 2005 MLB batting records, which estimation methodology — naive, grand mean, parametric empirical Bayes (method-of-moments or ML), nonparametric empirical Bayes, harmonic-prior Bayes, or James–Stein — best estimates each batter's latent ability and predicts second-half batting average, validated against the already-concluded season's actual second-half data?

## 2. Dataset / schema
MLB 2005 season, monthly batting records per player: hits H_i, at-bats N_i. Analysis restricted to batters with ≥11 first-half at-bats (P=567 for estimation, 499 also qualifying in the second half for validation; subgroups: 486 nonpitchers / 81 pitchers for estimation). Ground rules stated: only the 2005 season, only at-bats/hits and pitcher/nonpitcher status as predictors; prior seasons deliberately excluded. Public data (baseball records).

## 3. Method / model
- Variance-stabilizing transformation (new form): X_i = arcsin(√((H_i + 1/4)/(N_i + 1/2))), θ_i = arcsin(√p_i), giving X_i ~ N(θ_i, σ_i²) with known heteroscedastic variances σ_i² = 1/(4N_i) (Eqs. 3.1–3.2). The transformation choice (c=1/4) is validated in Section 2 via bias/variance-ratio plots against the nominal normal (works for N=12 and 0.25 ≤ p ≤ 0.75).
- Assumption (3.3): θ_ji = θ_i constant across halves; empirical validity tested in Section 7 (including a new binomial-model validation test and hot-hand/streak analysis).
- Validation metric: SSPE[δ] = Σ_{i∈S1∩S2} (X_2i − δ_i)² (Eq. 3.4); oracle-adjusted TSE[δ] = SSPE[δ] − Σ 1/(4N_2i); normalized TSE*[δ] = TSE[δ]/TSE[δ_0] with the naive estimator δ_0(X_1i) = X_1i as the unit baseline (Eq. 3.5); a parallel criterion TSE*_R on the raw batting-average scale (Eq. 3.6); and weighted TWSE (Eq. 5.1).
- Estimators compared: naive (4.1); overall mean (4.2); parametric EB method-of-moments EB(MM): θ_i ~ N(μ, τ²) with Bayes form θ_i^Bayes = μ + τ²/(τ²+σ_1i²)·(X_1i − μ) (Eqs. 4.3–4.4), μ, τ² estimated by moments; parametric EB maximum-likelihood EB(ML) (E&M-style heteroscedastic generalization); nonparametric EB (NPEB) implementing Robbins' (1951, 1956) original idea via Brown (1971)'s formula; formal harmonic-prior Bayes (HB) with ψ = θ − θ̄_1 under a spherically symmetric harmonic prior; James–Stein (minimaxity verified for the observed {N_1i} arrays).

## 4. Equations & assumptions
- X_i = arcsin(√((H_i+1/4)/(N_i+1/2))), θ_i = arcsin(√p_i) (Eq. 3.1)
- X_i ~ N(θ_i, σ_i²), σ_i² = 1/(4N_i) (Eq. 3.2)
- θ_ji = θ_i (constant latent ability across halves) (Eq. 3.3)
- SSPE[δ] = Σ (X_2i − δ_i)² (Eq. 3.4); TSE*[δ] = TSE[δ]/TSE[δ_0] (Eq. 3.5)
- δ_0(X_1i) = X_1i (Eq. 4.1); δ(X_1i) = X̄_1 (Eq. 4.2)
- θ_i ~ N(μ, τ²); θ_i^Bayes = μ + [τ²/(τ²+σ_1i²)](X_1i − μ) (Eqs. 4.3–4.4)
- Assumptions: binomial sampling of hits within at-bats; independence across players; latent ability constant within the season; heteroscedastic known variances; (violated in practice: {N_1i} and {X_1i} are moderately correlated — R² = 0.25 overall, 0.19 nonpitchers — because pitchers have few ABs and low averages; and {θ_i} is better fit by a two-normal mixture than a single normal).

## 5. Features / target
Inputs: first-half hits and at-bats per player; pitcher/nonpitcher indicator (subgroup analyses). Target: latent batting ability θ_i and second-half batting average (both on the transformed and the raw-average scale). Horizon: within-season, first half → second half.

## 6. Validation design
Genuine holdout-in-time: fit on first-half (or first-3-months) data, validate on second-half data of the same completed season. All estimators are compared on the same validation set via the oracle-adjusted normalized criteria TSE*, TSE*_R, and weighted TWSE. Simulations (Section 5.3) check stability of estimator rankings under the fitted model and under an N–X correlation model. Section 7 separately validates the binomial model assumption and tests for hot-hand effects.

## 7. Numerical results / baselines
All batters, half-season prediction (P=567/499; TSE* values, naive=1): Group's mean 0.852; EB(MM) 0.593; EB(ML) 0.902; NPEB 0.508; Harmonic prior 0.884; James–Stein 0.525 (Table 2). Best order: NPEB, J–S, EB(MM); EB(ML) and HB mediocre — attributed to (a) {θ_i} being a two-component mixture rather than normal, and (b) N–X correlation hurting EB(ML)/HB most. Under weighted TWSE the J–S estimator is best (0.502), consistent with its motivation. Pitchers (X̄_1=0.396, N̄_1=25.1) vs nonpitchers (X̄_1=0.528, N̄_1=157.8).
Subgroup results (Table 3, TSE*): Nonpitchers — naive 1, mean 0.378, EB(MM) 0.387, EB(ML) 0.398, NPEB 0.372, harmonic 0.391, J–S 0.359; Pitchers — naive 1, mean 0.127, EB(MM) 0.129, EB(ML) 0.117, NPEB 0.212, harmonic 0.128, J–S 0.164. Within homogeneous subgroups, the grand mean is nearly unbeatable and parametric EB/HB recover (NPEB suffers at pitcher N=81 with 4× heteroscedasticity). Simulation check: pairwise TSE* differences have SD 0.05–0.20, so fine-grained rankings may not be stable across seasons. Section 7 finds the binomial model assumption empirically adequate and no hot-hand effect. All numbers are the paper's claims on 2005 MLB data.

## 8. Code / data availability
Data referenced as [Brown (2008)] batting records; no code link stated. Public underlying data (MLB 2005 batting).

## 9. Leakage & limitations
- Single season (2005): estimator rankings are shown by the paper's own simulations to be unstable (pairwise SD 0.05–0.20); no multi-season replication in the paper.
- Only one season's early data is used — prior seasons, the obvious strong predictor, are deliberately excluded by the "ground rules," so absolute performance understates what a real system would achieve.
- The constant-ability assumption (3.3) rules out true within-season skill change by fiat; Section 7's no-hot-hand finding is conditional on that framework.
- N–X correlation violates every estimator's motivating assumptions; the paper explains rather than fixes it.
- External validity to NFL: none. The binomial-with-known-trials structure (at-bats as exchangeable trials) has no analogue in football, where plays are non-exchangeable, context-saturated, and non-stationary. GSE's analogous need — shrinking noisy small-sample estimates — is already handled by hierarchical/empirical-Bayes practice in the calibration and ML lanes.

## 10. GSE overlap
Duplicate lesson, no new capability. Empirical-Bayes shrinkage, James–Stein, and variance-stabilization are textbook methods the ML research brief and calibration stack already assume; no repo file needs a batting-average EB study to justify shrinkage. The paper is cited by [0252] (Jensen et al.) as the justification for within-season binomial modeling — a cross-paper dependency within this wave's MLB cluster, not a GSE dependency. Nothing to build on.

## 11. GSE implementation spec
None — REJECT, no build.

## 12. Reproducible test
Not applicable — REJECT. (Reproduction: 2005 Lahman batting data, first-half/second-half split, replicate Table 2 TSE* values; public data, but no GSE lane benefits.)

## 13. Acceptance / rejection gate
REJECT stands. Reconsider only if GSE needs a documented, citable field-test precedent for choosing a shrinkage estimator — in which case this paper is a citation, not an implementation.

## 14. Improvement experiment
Within the paper's own frame: relax the ground rule excluding prior seasons — fit the same estimator battery with an additional prior-season block (2004 second-half averages as a second shrinkage target, i.e., two-level hierarchical EB) and test whether the estimator ranking (NPEB vs J–S vs grand mean) survives; this directly tests the paper's speculation that prior-season data would "usefully improve predictive performance" and whether the naive-beating margins are an artifact of the single-season restriction.
