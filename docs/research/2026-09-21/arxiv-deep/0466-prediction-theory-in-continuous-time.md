# [0466] Prediction Theory in Continuous Time (arXiv:2111.08560v1)

**Citation:** Bingham, N. H. (2021). *Prediction Theory in Continuous Time*. arXiv:2111.08560v1. URL: https://arxiv.org/abs/2111.08560v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2078 lines).
**Verdict:** REJECT — a pure-mathematics exposition (short proofs of Wiener/Krein prediction theorems via Doob's method) with no data, no experiments, and no modeling content; it offers GSE nothing beyond what the existing Kalman/AR(1) state-space tooling already implements.

## 1. Research question
Can the classical Wiener (whole-past) and Krein (finite-section) prediction theorems for stationary continuous-time stochastic processes be given short, probabilistically revealing proofs using Doob's method — organizing the theory around four ingredients: the Cramér representation (CR), the Kolmogorov isomorphism theorem (KIT), the moving-average representation (MA), and the Szegő condition (Sz)?

## 2. Dataset / schema
None. This is a pure theory paper: no empirical dataset, no train/test split, no numerical benchmark of any kind.

## 3. Method / model
Hilbert-space prediction theory: a stationary (second-order) continuous-time process X is represented spectrally (CR), mapped to L² of its spectral measure (KIT), given a moving-average representation driven by orthogonal-increment noise (MA), and prediction reduces to orthogonal projection onto the closed linear span of the observed past. The Szegő condition (Sz) characterizes when prediction is non-trivial (non-deterministic process). The Gaussian case is noted as the setting where the orthogonal-increment process can be read as Brownian motion / white noise. The paper's contribution is expositional: shorter proofs of known theorems, not new models.

## 4. Equations & assumptions
Paper's core formulas: Cramér representation X_t = ∫ e^{2πitμ} dY(μ); Kolmogorov isomorphism between the time-domain Hilbert space and L²(dG); **Szegő condition** ∫ log G′(μ)/(1+μ²) dμ > −∞ (non-determinism); moving-average representation X(t) = ∫_{−∞}^t c*(u−t) dξ(u) with MA kernel c*; whole-past predictor (Pred) Ê[X(t) | {X(u): u ≤ t−τ}] = ∫_{−∞}^{t−τ} c*(u−t) dξ(u); prediction error (Err) σ²(τ) = ∫_{−τ}^0 |c*(s)|² ds; finite-section predictor over [t−τ−2T, t−τ] (Krein's theorem); finite-section error σ²(τ,T) = (∫_{−∞}^{−2T−t} + ∫_{−t}^0) |c*(s)|² ds. Assumptions: second-order stationarity; the Szegő condition holds (process is non-deterministic); for the white-noise reading, Gaussianity. These are the classical Wiener–Kolmogorov–Krein results restated, not new estimators.

## 5. Features / target
- **Input:** the past of the process {X(u): u ≤ t−τ} (whole past) or a finite section [t−τ−2T, t−τ].
- **Target:** X(t) for t > 0, in the L² (mean-square) sense.
- Horizon: continuous lag τ ≥ 0; the error formulas quantify how prediction variance grows with lag.

## 6. Validation design
Proof-based exposition. "Validation" is mathematical correctness of the shortened proofs; there is no empirical validation, no simulation, no comparison of predictors on data.

## 7. Numerical results / baselines
None — the paper contains no numbers, tables, or benchmarks. Its results are theorems (Wiener/Krein) with the paper's streamlined proofs.

## 8. Code / data availability
None (not applicable to a pure-math paper).

## 9. Leakage & limitations
- **No empirical content whatsoever:** no data, no experiments, no guidance on estimation — the MA kernel c* and spectral density G are assumed known, whereas in practice they must be estimated (the hard part).
- **Stationarity assumption:** NFL-relevant signals (team strength, market prices, tracking dynamics) are non-stationary; the theory's stationarity requirement is the binding constraint and the paper offers nothing for the non-stationary case.
- **L² / linear prediction only:** optimal only among linear predictors (and fully optimal only for Gaussian processes); modern sports modeling is nonlinear.
- **Continuous-time formalism:** GSE's data is discrete (plays, games, weeks); the continuous-time machinery adds no capability over discrete-time ARMA/state-space theory already in the toolbox.
- **Expositional, not novel:** the theorems are classical (Wiener 1949, Krein); the contribution is proof brevity.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's state-space/dynamics lane already covers Kalman filters, particle filters, dynamic Elo, nested AR(1) team strength (1701.05976, read in depth), and Gaussian processes — i.e., the *implementable* descendants of exactly this theory. This paper is the mathematical foundations layer beneath tools GSE already uses; reading it adds no new method, feature, or diagnostic. It is closest to a **duplicate** (of the theoretical substrate of covered methods) with zero marginal capability. Verdict rationale: reject — no experiment to run, no code to port, no gap filled.

## 11. GSE implementation spec
No build. The paper's predictors, instantiated with estimated parameters, are precisely the Kalman filter / AR predictors GSE already has. If a continuous-time treatment of irregularly-spaced tracking data were ever needed, the correct vehicle is a continuous-time state-space model (e.g., a latent SDE or continuous-time Kalman–Bucy filter), not this paper's known-kernel projection formulas.

## 12. Reproducible test
Not applicable — there is nothing to reproduce empirically. The nearest checkable claim (the error formula σ²(τ) = ∫_{−τ}^0 |c*(s)|² ds) could be verified by simulation on a known MA process, but this would test classical theory, not the paper's contribution.

## 13. Acceptance / rejection gate
**Adopt** (as background reading for the state-space lane) only if a GSE modeler identifies a concrete continuous-time prediction problem where the Szegő/MA machinery suggests an estimator not already in the Kalman/GP toolbox. **Otherwise reject** — the default, since no such problem is on the roadmap and the paper supplies no estimator.

## 14. Improvement experiment
The paper's framework suggests one testable question GSE could actually use: for short-horizon NFL tracking-signal prediction (e.g., ball-carrier velocity 0.5 s ahead), does a **nonparametric spectral predictor** (estimate G from data, build the MA kernel, project) beat a discrete-time Kalman baseline on held-out tracking plays? This would convert the paper's known-kernel theory into the estimation problem that matters. If the spectral predictor wins on RMSE at fixed compute, the continuous-time machinery earns a place; the prior is that it won't, given non-stationarity.
