# [0475] Prediction theory for stationary functional time series (arXiv:2011.09937v2)

**Citation:** N. H. Bingham (2021). *Prediction theory for stationary functional time series*. arXiv:2011.09937v2. URL: https://arxiv.org/abs/2011.09937v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,249 lines, read sequentially in full): intro, §2 Cramér representation + Kolmogorov Isomorphism + Gramian operator + Gaussianity note, §3 Verblunsky coefficients + Szegő theorem + Wold decomposition, §4 Szegő alternative + factorization, §5 Beurling–Lax–Halmos + wandering subspaces, §6 implementation + numerics, §7 complements (deterministic case, model spaces, compressions/dilations, harmonizability, Banach, Nehari), §8 open questions Q1–Q5, references.
**Verdict:** REJECT — pure-mathematics survey of infinite-dimensional prediction theory (spectral/operator-theoretic); no data, no experiments, no code, no numerical results, and the stationarity + function-valued-data assumptions do not fit any GSE forecasting problem.

## 1. Research question
Survey: what does classical (Kolmogorov–Wiener) linear prediction theory look like when the time series takes values in an infinite-dimensional Hilbert space (functional time series)? Organized around the Cramér representation, Kolmogorov Isomorphism Theorem, Verblunsky coefficients, Szegő's theorem and the Szegő alternative, the Wold decomposition, and the Beurling–Lax–Halmos theorem — extending the author's earlier scalar [Bin1] and finite-dimensional [Bin2] surveys.

## 2. Dataset / schema
None — no data, no simulations. References application literature (Ramsay & Silverman FDA; Aue et al. 2015 functional prediction) but presents no dataset.

## 3. Method / model
Mathematical framework: stationary process {x_n : n∈ℤ} with values in Hilbert space ℋ; time shift U unitary with spectral resolution Uⁿ=∫_𝕋 e^{inθ} dE(θ); Cramér representation x_n=∫ e^{inθ} dY(θ); Kolmogorov Isomorphism Theorem identifying the closed linear span of the process with L² of the spectral measure; Wold decomposition into deterministic + purely nondeterministic components; Szegő's theorem giving the one-step prediction error variance from the spectral density; Verblunsky coefficients / OPUC in the scalar case. Implementation recipe (§6): (i) discretize each observed curve to a d-vector (choice of d per Li & Hsing), (ii) predict with finite-dimensional methods (multivariate Levinson–Durbin, split Levinson variant of Delsarte & Genin), (iii) smooth/interpolate back to a curve (splines with roughness penalty); Karhunen–Loève/FPCA route (Aue, Norinho & Hörmann 2015) noted as effectively Gaussian; kernel methods for functional prediction (Hashimoto et al.) cited.

## 4. Equations & assumptions
Uⁿ = ∫_𝕋 e^{inθ} dE(θ) (spectral theorem for the unitary shift); Cramér representation x_n = ∫ e^{inθ} dY(θ), Y orthogonally scattered; KIT: x(n) ↔ e^{in·}I (time↔frequency isometry); Gramian operator [x,y]_X = E[x⊗ȳ] (trace-class operator-valued inner product); operator covariance Γ(m,n)=[x(m),x(n)], stationarity ⇔ Γ̃(m−n); spectral representation Γ̃(n)=∫e^{inθ}dF(θ) (operator Herglotz/Bochner). Szegő's condition (Sz): log f ∈ L₁(𝕋); Kolmogorov–Szegő formula ∏₀^∞det(1−α_k α_k†)=exp∫tr log f dθ/2π; α∈ℓ₂(ℕ) ⟺ Szegő holds (Baxter's theorem = ℓ₁ case). Prediction error variance σ²=exp{∫log f(θ)dθ/2π}=∏₁^∞(1−|α_n|²); Szegő function h(z)=exp(½∫(e^{iθ}+z)/(e^{iθ}−z) log f(θ)dθ/2π), outer in H², |h|²→f a.e. (analytic square root of spectral density). Wold decomposition x=x_d+x_p, Gramian-orthogonal; Wold–Cramér concordance (1-D; matrix full-rank only). Factorization F=ΦΦ*; Power's result f=hh*+g with minimal positive g, prediction-error operator G(f)=(QhQ)(QhQ)*. Beurling–Lax–Halmos: shift-invariant subspaces = uH²(ℋ) for inner u; wandering subspace L=ℋ⊖Vℋ; Wold decomposition ℋ=ℋ₀⊕ℋ₁ (unitary part ∩Vⁿℋ, shift part M₊(L)). Backward shift S*f=(f−f(0))/z; model spaces 𝒦_u=(uH²)⊥. Nehari problem: given γ_n, find φ in unit ball of L∞ with γ_n=∫e^{inθ}φ(θ)dθ/2π (n≥1); solvable iff Hankel matrix (γ_{m+n}) is a contraction on ℓ₂. Assumptions: stationarity (distribution invariant under time shifts) — "a strong condition"; Hilbert-space-valued data; for Szegő's theorem, spectral density conditions (log-integrability); §7.4 notes nonstationary extensions as open.

## 5. Features / target
Features/target: past curves x_1…x_n (function-valued observations) → predicted curve x_{n+1}. No GSE analog: GSE forecasts discrete scalar/vector game outcomes, not curves.

## 6. Validation design
None — survey with no empirical component. Open questions Q1–Q5 (§8) are all pure-math (infinite-dimensional extensions of Verblunsky/Szegő theory, relaxing spectral-density assumptions).

## 7. Numerical results / baselines
None reported. The only quantitative-adjacent content is citations of applied work (e.g., Aue et al. 2015) without reproducing their numbers.

## 8. Code / data availability
None.

## 9. Leakage & limitations
Adversarial notes: (a) survey, not research — contributes no new result applicable anywhere; (b) stationarity is load-bearing and false for NFL data (roster turnover, coaching changes, rule changes, season structure); (c) functional-data framing (curves as observations) has no GSE counterpart — games are events, not curves; (d) the §6 implementation recipe reduces, by the author's own admission, to finite-dimensional methods already standard (Levinson–Durbin), adding nothing operational; (e) any attempt to force-fit (e.g., treating a team's season scoring trajectory as a "curve") would violate the stationarity assumption the entire theory rests on.

## 10. GSE overlap
No overlap and no gap filled. The existing-research-map contains no functional-data-analysis or spectral-prediction entries — correctly, since GSE has no functional-time-series problem. Time-series entries in the map (ARIMA-family, state-space, if any) are finite-dimensional and unaffected. File as background reference only.

## 11. GSE implementation spec
None warranted. The only conceivable (and rejected) application: treat weekly team efficiency trajectories as functional data and apply FPCA + Levinson–Durbin — rejected because (i) 17-game seasons give n=17 curves per team, far too few for functional methods, and (ii) stationarity fails across seasons.

## 12. Reproducible test
Falsification test (runnable; designed to confirm non-applicability). Construct a candidate functional time series from GSE data: each curve X_t(s) is one NFL team's cumulative EPA-per-play after each week s=1..17 of season t, t=2020..2025 (nflverse, 32 teams × 6 seasons = 192 curves, each sampled at 17 points). Metric: the paper's own stationarity precondition — apply the functional KPSS stationarity test of Horváth–Kokoszka–Rice (2014) to the pooled series of curves (teams treated as independent replicates), α=0.05. Baseline/comparator: fit a stationary functional AR via FPCA + Levinson–Durbin and compare 1-step-ahead prediction MSE against a naive per-team seasonal mean curve; expect the stationary model to fail to beat the naive baseline. Time window: train on 2020–2023 curves, test on 2024–2025. If stationarity is not rejected (p>0.05) AND the functional AR beats the naive baseline on test MSE, reopen the adaptation discussion; otherwise REJECT stands.

## 13. Acceptance / rejection gate
Numeric gate: the paper stays REJECT unless BOTH conditions hold on the test above — (i) functional-KPSS p-value > 0.05 on the 2020–2023 training window (stationarity not rejected), and (ii) the FPCA + Levinson–Durbin stationary functional AR reduces 1-step-ahead test MSE by ≥10% vs the per-team seasonal mean on 2024–2025. Either condition failing confirms the REJECT verdict. Revisit only if GSE ever ingests genuinely functional sports data (e.g., full player-tracking trajectories as the forecast target) *and* a stationary regime can be defended. Neither condition holds on current data.

## 14. Improvement experiment
None for GSE. For the record, the paper's own open questions (Q1–Q5) are pure mathematics with no applied pathway; the nearest applied extension — nonstationary functional prediction (§7.4) — is itself flagged as open.
