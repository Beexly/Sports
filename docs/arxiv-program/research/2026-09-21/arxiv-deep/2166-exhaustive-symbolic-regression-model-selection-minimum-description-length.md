# [2166] (Exhaustive) Symbolic Regression and model selection by minimum description length (arXiv:2507.13033v1)

**Citation:** Harry Desmond (2025). *(Exhaustive) Symbolic Regression and model selection by minimum description length*. arXiv:2507.13033v1 (review article). URL: https://arxiv.org/abs/2507.13033
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — replaces the arbitrary Pareto-front + heuristic score model selection in symbolic regression with a principled information-theoretic metric (description length in nats), directly usable to rank GSE's discovered sports equations.

## 1. Research question
Traditional symbolic regression faces two unsolved problems: (1) stochastic genetic algorithms have an unknown, likely significant probability of missing the best functions entirely; (2) model selection is done via an arbitrary Pareto front (accuracy vs a heuristic "complexity") plus an unjustified rule for picking one point on it. Can exhaustive search plus the minimum description length (MDL) principle solve both — guaranteeing no good function is missed and putting accuracy and complexity on commensurable information-theoretic footing?

## 2. Dataset / schema
- **SRBench benchmark** (Penn ML Benchmarks): `feynman_I_6_2a`, 10⁵ datapoints from an unknown univariate function without scatter; five stochastic SR algorithms (PySR, DataModeler, FFX, QLattice, Operon) compared under exam conditions.
- **Astrophysics case studies:** (a) cosmic expansion H(z): 32 cosmic-chronometer points + 1590 Pantheon+ Type Ia supernovae with covariance; (b) galaxy radial acceleration relation (RAR): g_bar/g_obs from HI + optical + rotation-curve data (Lelli et al. 2017); (c) inflaton potential V(φ): 3 CMB numbers from Planck (A_s=(0.027±0.0027)M_pl, n_s=0.9649±0.0042, r<0.028 95% CL).
- Code: https://github.com/DeaglanBartlett/esr; precomputed function sets (Zenodo 7339113); Katz prior https://github.com/DeaglanBartlett/katz.

## 3. Method / model
**Exhaustive Symbolic Regression (ESR, Bartlett et al. 2024):** generates *every* function from an operator basis up to max complexity (tree nodes): all tree templates by arity → decorate with all operator permutations → dedupe via simplification rules (tree reordering, parameter permutation, reparametrization invariance, parameter combination) → max-likelihood parameter fit per unique function (nonlinear optimization) → broadcast to equivalent variants via transformation Jacobians. Cost: ~200 CPU-hours at complexity 10 (exponential scaling; typical cap ≈ 10, ESR 2.0 targeting ~13 in Julia). **MDL scoring:** L(D) = L(H) + L(D|H); residual term = −log ℒ̂ (Shannon–Fano); structure term = k log(n) nats for k nodes from n operators + Σ log(c_j) for integer constants + parameter-precision terms with optimal Δ_i = (12/I_ii)^{1/2} (I = observed Fisher information). **Katz back-off prior:** alternative function prior learned from a training set of domain equations (operator-combination probabilities, language-model style) — drop-in replacement for k log(n).

## 4. Equations & assumptions
- MDL formula (Eq. 1): L(D) = −log(ℒ(θ̂)) + k log(n) − (p/2) log(3) + Σ_j log(c_j) + Σ_i^p (½ log(I_ii) + log(|θ̂_i|)); lower is better; model probability ∝ exp(−L(D)).
- Bayesian connection (Eqs. 2–4): MDL ≡ −log posterior under Laplace approximation given function prior −log P(f_i) = k log(n) + Σ log(c_α) — i.e., MDL is Bayesian evidence + structural-complexity prior.
- Precision choice Δ_i = (12/I_ii)^{1/2} from the likelihood-vs-precision tradeoff.
- Friedmann H²(z) = H₀²(Ω_Λ + Ω_m(1+z)³) (Eq. 5); MOND g_obs = ν(g_bar/a₀)g_bar (Eq. 7); inflaton φ̈ + 3Hφ̇ + V′(φ) = 0 (Eq. 8).
- Assumptions: log base e throughout; MSE-as-likelihood only valid for Gaussian constant errors (a stated criticism of traditional SR); exhaustive generation requires the operator set and complexity cap chosen by the user.

## 5. Features / target
Task-dependent; features = problem variables (redshift z / (1+z), g_bar, inflaton φ, Feynman benchmark x); target = measured relation (H²(z), g_obs, power-spectrum observables). In ESR, "features" are the operator basis sets (e.g. {x≡1+z, θ, inv, +, −, ×, ÷, pow}).

## 6. Validation design
Benchmark: head-to-head on feynman_I_6_2a with equal opportunity ("exam conditions"). Astrophysics: rank literature standards (Friedmann, MOND IFs, Starobinsky/quadratic/quartic inflation) within the exhaustive function list by description length; report probability ratios and ranks; mock-data control for the RAR limit-behavior claim.

## 7. Numerical results / baselines
- **Benchmark:** ESR alone found the true generator y = θ₁θ₀^{x²} (θ₀=0.6065, θ₁=0.3989 ≈ 1/√e, 1/√(2π) — a standard normal; exact params give MSE = 3×10⁻³³) at complexity 7 via a sharp MSE cliff; all five stochastic algorithms missed it (Operon found an overparametrised complexity-11 version).
- **Cosmology:** MDL winners H²(z)=θ₀(1+z)² (CCs) and H²(z)=θ₀(1+z)^{1+z} (SNe), both complexity 5 < Friedmann's 7; preferred over Friedmann by 7.12 nats (probability ratio 1240) and 4.91 nats (ratio 136); 38 (CCs) / 36 (SNe) functions beat the literature standard. Both share the Friedmann Taylor expansion to O(z²).
- **RAR:** many ESR functions beat MOND's "Simple"/"RAR" interpolating functions; P(g_obs→const as g_bar→0) ~ 1 over all functions — but mocks show the data cannot discriminate even if MOND were true.
- **Inflation:** MDL winner exp(−exp(exp(exp(φ)))) (complexity 6, byzantine but well-behaved slow-roll); with Katz prior trained on Encyclopaedia Inflationaris: θ₀(θ₁+log(φ)²) (set A), θ₀φ^{θ₁/φ} (set B); literature models rank 1272 (Starobinsky), 8697 (quadratic), 10839 (quartic) out of the exhaustive list.

## 8. Code / data availability
ESR: https://github.com/DeaglanBartlett/esr (public). Precomputed function sets: Zenodo 7339113 (cuts runtime >2×). Katz prior: https://github.com/DeaglanBartlett/katz. All astrophysics datasets public as cited.

## 9. Leakage & limitations
Adversarial notes: (a) This is a review/synthesis article — the ESR algorithm and MDL formula are from Bartlett/Desmond/Ferreira 2024, re-presented; still counts as a full read of a substantive methods paper. (b) Exhaustive search caps at complexity ~10 (200 CPU-hours) — sports equations with 10–15 terms/operators may exceed the exhaustive regime; the paper's own fix is ESR→GA hybrid (ESR seeds low-complexity, GA explores high). (c) The k log(n) prior is basis-set-dependent (tan(x) cheaper than sin/cos composition) — a different kind of arbitrariness the Katz prior only partially fixes (needs a training corpus of "good" sports equations). (d) MDL prefers simpler functions when data are weak — with limited NFL seasons it will underfit exactly where GSE most wants discovery; the paper admits more data is the only fix. (e) Fisher-information term needs a likelihood, not MSE — fine for GSE's probabilistic models, but inapplicable to deterministic score fits.

## 10. GSE overlap
GSE's equation-discovery lanes (2162 SymTorch/PySR, 2163–2165 SINDy) all end at the same unsolved step: *which equation do we publish?* PySR's heuristic score (−Δlog-loss/Δcomplexity, SymTorch Eq. 2) is exactly the "unmotivated heuristic" this paper demolishes. No GSE process currently gives a principled one-dimensional ranking of candidate sports equations. MDL is that ranking — and it's already Bayesian evidence under a stated prior, so it plugs into GSE's calibration program. New capability: absolute goodness-of-fit testing (a discovered equation's probability ratio vs the engine's current formula).

## 11. GSE implementation spec
1. Adopt the MDL formula (Eq. 1) as GSE's standard equation-selection metric, replacing PySR's heuristic score in the 2162 SymTorch pipeline: for each Pareto-front equation compute L(D) with a proper likelihood (Bernoulli log-likelihood for win-prob equations, Gaussian for margin equations), k log(n) over the operator set, and Fisher-information parameter terms via autodiff of the fitted likelihood.
2. Exhaustive pre-screen: use the precomputed ESR function sets (Zenodo 7339113) restricted to sports-plausible operators to enumerate all ≤complexity-8 candidate rating/margin laws; score by MDL on 2015–2024 nflverse; seed PySR's GA with the top-100 as the paper's ESR→GA hybrid prescribes.
3. Build GSE's Katz training corpus: collect every published sports-analytics equation (Elo update, Pythagorean expectation variants, Massey, etc.) into a corpus; train the Katz back-off prior so the function prior favors operator combinations that look like real sports mathematics (e.g. logistic/exponential forms) over byzantine nestings.
4. Publish the description-length leaderboard: every candidate law ranked by nats, with probability ratios vs the incumbent engine formula — GSE's public "why we believe this equation" page.
Effort: ~1 week (MDL scorer + corpus + leaderboard). Compute: ESR enumeration at complexity ≤8 is feasible on the Motif VM (< 200 CPU-hours amortized via precomputed sets).

## 12. Reproducible test
Dataset: 2015–2024 nflverse (margin-of-victory and win/loss). Procedure: run MDL ranking over exhaustive ≤8-complexity laws for (a) margin prediction, (b) win probability; compare the MDL winner vs the incumbent baseline (point spread alone / logistic on spread) by held-out 2025 log-likelihood AND by the MDL probability ratio. The test is whether MDL ranking selects equations that generalize.

## 13. Acceptance / rejection gate
**ADOPT if:** the MDL top-ranked equation beats the incumbent baseline on 2025 held-out log-likelihood by ≥ 0.005 nats/game AND the MDL ranking is stable (top-3 unchanged under 5-fold season-block CV) AND the winner has ≤ 10 terms. **REJECT if:** MDL winner loses to the baseline out-of-sample (overfitting via weak-data simplicity bias), or ranking is unstable across folds (top-3 Jaccard < 0.5), or exhaustive enumeration at complexity 8 exceeds 72 wall-hours on the VM. Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **two-part MDL with side-information prior** — fuse ledgers 2164 and 2166: replace the k log(n) structural prior with a composite prior = Katz(sports-equation corpus) × SOS-feasibility indicator (infinite description length for equations violating the 2164 side-information constraints, e.g. win prob ∉ [0,1]). This gives a single nats-based ranking where physically impossible equations are not just penalized but *excluded*, and among feasible ones the most sports-plausible structure wins. Test on the 2015–2024 margin data whether the composite prior's MDL winner beats the plain-MDL winner on 2025 log-likelihood — if yes, GSE's equation selection is simultaneously principled (information theory), domain-informed (Katz), and law-abiding (SOS).
