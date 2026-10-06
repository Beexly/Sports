# [0577] On classical and Bayesian inference for bivariate Poisson conditionals distributions: Theory, methods and applications (arXiv:2301.04251v1)

**Citation:** Barry C. Arnold, Indranil Ghosh (2023). *On classical and Bayesian inference for bivariate Poisson conditionals distributions: Theory, methods and applications*. arXiv:2301.04251v1. URL: https://arxiv.org/abs/2301.04251v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4956 lines).
**Verdict:** REJECT — the BPC model class admits only negative correlation (λ3≤1; independence at λ3=1), which is the wrong dependence sign for every paired-count quantity in NFL data (home/away points are near-independent to weakly positively correlated; the classic bivariate Poisson covers the positive case). No predictive experiment, tiny simulations, and the one real dataset is ophthalmological. No GSE adaptation survives the sign mismatch.

## 1. Research question
How to estimate the parameters of the bivariate Poisson conditionals (BPC) distribution of Arnold et al. (1999) / Obrechkoff (1963) — a bivariate count model where both conditionals are Poisson but marginals are not — under both frequentist (iterative MLE without optimizer subroutines) and Bayesian (conjugate and locally-uniform priors, posterior mean and posterior mode) paradigms?

## 2. Dataset / schema
- Simulation: n = 50, 75, 100 draws from the BPC pmf via Shin & Pasupathy (2010), four parameter choices: (λ1,λ2,λ3) = (2,2.5,0.35), (1.75,3.25,0.45), (2.5,1.5,0.55), (3.5,4,0.75).
- Bayesian simulation: n = 100, four δ-parameterized choices, expert elicitation with confidence index n*=12 and typical values v1=5, v2=4, v3=6.
- Real data: Aitchison & Ho (1989) "lens data" (ophthalmology counts), previously analyzed by Lee et al. (2017) and Ghosh et al. (2021).

## 3. Method / model
- BPC model: X|Y=y ~ Poisson(λ1 λ3^y), Y|X=x ~ Poisson(λ2 λ3^x), with (λ1,λ2)>0, 0<λ3≤1 (λ3=1 = independence).
- Frequentist: likelihood equations rewritten as fixed-point updates (A) λ1 = t1·J(λ)/[n·J(λ1,λ2λ3,λ3)], (B), (C) — iterated cyclically from initial values until |λi^m − λi^{m+1}| < ε < 0.005. No optimizer needed.
- Bayesian conjugate: reparameterize δi=log λi (exponential family), prior ∝ K̃(δ)^{η0} exp(η1δ1+η2δ2+η3δ3); hyperparameters elicited as an "imaginary sample" (η0=n*, ηi=n*vi). Posterior means via numerical integration; posterior modes via the same iterative scheme/Newton-Raphson.
- Bayesian non-conjugate: locally uniform priors Π(δ1)∝1, Π(δ2)∝1, Π(δ3)∝1 on (−∞,0).

## 4. Equations & assumptions
- Joint pmf (2.1): P(X=x,Y=y) = K(λ1,λ2,λ3) · λ1^x λ2^y λ3^{xy} / (x! y!).
- Normalizing constant: K^{-1} = Σ_{y≥0} λ2^y/y! · exp(λ1 λ3^y) = Σ_{x≥0} λ1^x/x! · exp(λ2 λ3^x).
- Correlation structure: always negatively correlated except independence at λ3=1 (conclusion: "will always have negative correlation, except in the independent case").
- Fixed-point updates (A)(B)(C) as in §3; asymptotic normality (λ̂1,λ̂2,λ̂3) ~ N3((λ1,λ2,λ3), V) with V = inverse observed FIM (Eq. 3.5).

## 5. Features / target
- Features: paired counts (xi, yi); sufficient statistics t1=Σxi, t2=Σyi, t3=Σxiyi.
- Target: (λ1, λ2, λ3) point estimates, confidence/credible intervals.

## 6. Validation design
- Simulation coverage probabilities and average widths of asymptotic CIs (observed FIM) and bootstrap CIs, at n=50/75/100 across four parameter choices (Table 4.1).
- Bayesian: posterior means with 95% HPD under conjugate (Table 6.1) and locally-uniform (Table 6.2) priors; posterior modes under conjugate prior at n=100 (Table 7.1).

## 7. Numerical results / baselines
- MSE of all three parameters decreases with n; bias does not decrease monotonically (increases by 0.01–0.05 in some cases). MSE(λ3) > MSE(λ1), MSE(λ2).
- Bootstrap CIs perform satisfactorily and serve as the fallback when observed-FIM variance estimates go negative (4.75%–17% of runs produce negative variance estimates — Table 4.1 "% of negative variances" column).
- Lens data (Table 8.1): conjugate-prior posterior means (λ̂1,λ̂2,λ̂3) = (1.8500, 2.1699, 0.9600), 95% HPD (1.3832,3.6052), (1.7633,6.400), (0.5574,0.9832) — closely matching the copula-based MLEs of Ghosh et al. (2021); locally-uniform gives slightly wider HPDs.

## 8. Code / data availability
No code or data links provided. References Shin & Pasupathy (2010) for BPC random-vector generation. Lens data from Aitchison & Ho (1989).

## 9. Leakage & limitations
- No out-of-sample predictive evaluation anywhere: simulations report only coverage/MSE of in-sample estimates; the real-data section reports point estimates, no goodness-of-fit statistic or held-out likelihood.
- The observed Fisher information matrix yields negative variance estimates in up to 17% of simulation runs — the asymptotic theory is fragile for this parameterization.
- The imaginary-sample prior elicitation is subjective and the paper uses two inconsistent hyperparameter sets (η0=5/η1=60/η2=48/η3=72 in §6 vs η0=1.23, η1=2.325, η2=3.25, η3=2.528 in §7) without explanation.
- The model only captures negative dependence; the positively-correlated case (the standard bivariate Poisson, e.g., Maher/Dixon-Coles score models) is excluded by construction.
- One small real dataset; n=50–100 simulations are too small to stress the normalizing-constant series computation.

## 10. GSE overlap
Per existing-research-map.md, GSE has no paired-count score model at all — but that is because NFL score modeling doesn't need one: home and away points are near-independent, and where dependence is modeled (e.g., total vs margin), Gaussian/Poisson-log-normal structures dominate. The BPC's defining feature (negative-only correlation) matches no NFL quantity: points scored by the two teams are not negatively correlated; nor are first downs, turnovers, or red-zone trips. The standard positively-correlated bivariate Poisson (Maher 1982; Dixon & Coles 1997) is the sports-relevant member of this family, and this paper explicitly does not cover it. The imaginary-sample conjugate-prior elicitation (§5–6) is a portable Bayesian technique, but GSE has no BPC likelihood to attach it to — a technique without a model is not an adaptation.

## 11. GSE implementation spec
None warranted. If GSE ever needs a joint count model for negatively associated paired counts (no current use case), the fixed-point MLE (A)(B)(C) is a two-hour implementation.

## 12. Reproducible test
- Dataset: nflverse 2015–2025 game scores (home_points, away_points).
- Test: estimate the empirical correlation of home vs away points; if it is not negative, the BPC model is misspecified by construction — no further test needed.
- (Expected outcome: correlation ≈ 0 to slightly positive, confirming rejection.)

## 13. Acceptance / rejection gate
- REJECT confirmed if home/away point correlation ≥ 0 on 2015–2025 nflverse (expected). ADAPT only if a genuinely negatively-correlated paired-count quantity is identified in the GSE feature store AND the BPC beats independent Poissons on held-out log-likelihood — neither condition currently holds.

## 14. Improvement experiment
- The one idea worth salvaging for the broader program: the imaginary-sample prior elicitation (ask a domain expert for typical values v1,v2,v3 plus a confidence index n*, set η0=n*, ηi=n*vi) as a general recipe for conjugate-prior hyperparameters in any exponential-family sports model (e.g., a Poisson TD-prop model). Experiment: elicit typical values from the engine's historical priors, compare posterior calibration against the current hyperparameter choices on 2023–2025 TD props. This is a methods borrowing, not a BPC adoption — and it belongs to a future Bayesian-modeling lane, not this paper's verdict.
