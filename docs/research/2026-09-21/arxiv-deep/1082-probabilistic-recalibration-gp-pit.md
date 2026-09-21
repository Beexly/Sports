# 1082 — Probabilistic Recalibration of Forecasts

## Citation / full-text source

- arXiv:1904.02855v1 — full text: https://arxiv.org/pdf/1904.02855
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1904.02855v1
- **Full-text URL**: https://arxiv.org/pdf/1904.02855v1 (read in full; cached text 161,026 bytes, read cover to cover: theory §2–3, both case studies, discussion, full GPME appendix A, references)
- **Authors**: Carlo Graziani, Robert Rosner, Jennifer M. Adams, Reason L. Machete
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: The paper generalizes PIT recalibration beyond the i.i.d. restriction (Diebold–Hahn–Tay; Kuleshov–Fenner–Ermon) and, crucially, gives a *predictable-in-advance* expected improvement with uncertainty: the Forecast Advantage Measure (FAM). GSE's forecasts arrive as correlated time series (weekly games), where classical PIT recalibration's i.i.d. assumption fails exactly as the paper documents. The GP-based PIT-density fit (GPME) yields closed-form entropy quantities — ΔS̄ (expected entropy-game winnings in bits) and Var(ΔS) — so GSE can decide *before deployment* whether recalibrating the engine's predictive distributions (spreads, totals, moneyline-derived densities) is worth it, and can frame the gain as expected Kelly-wealth growth per bet. This is the most operationally complete recalibration paper in the lane: method + theory + two empirical wins + a decision statistic.
- **Read depth**: FULL READ: introduction (NWP/MOS motivation, DHT/KFE prior work), probabilistic-forecast/PIT/FOA formalism, Bayesian PIT-fit with GPME, recalibration equation p₁(x)=π(F=F̃(x)|ℱ,C)·p(x) with Theorem 1 (relative-entropy improvement + expected PIT uniformity), ignorance-score/betting/Kelly connection, entropy game, a-priori performance prediction (ΔS̄, Var(ΔS), FAM, EI fit-quality), thinning for autocorrelated PIT, both case studies (nonlinear circuit: 2,048 forecasts, entropy-game winnings ~0.6 bits → wealth multiplier 1.5/turn; ENSO NINO 3.4: NMME 5 models, 430 hindcasts, thinning ×5, winnings 0.2–0.6 bits), discussion (stationary miscalibration vs drifting climatology), full Appendix A GPME theory (LGCP, Laplace approximation, normalization, closed-form entropies), references.
- **Wave**: wave2-reader-20
- **GSE overlap**: Calibration ledgers in corpus: ENIR (1074, binary recalibration via near-isotonic ensembles), temperature scaling, Venn-Abers, conformal. All are binary/classifier recalibration or interval methods. **None is a continuous-distribution PIT recalibration for non-i.i.d. time series, and none provides an a-priori improvement-prediction statistic.** Extension into distributional recalibration of engine output densities — new capability.

## Research question

Can a miscalibrated probabilistic forecast be recalibrated by fitting a density to its historical PIT values and multiplying the current forecast by that PIT density?

## Summary

A probabilistic forecasting system with poor calibration can be recalibrated by fitting a density to its historical PIT (probability integral transform) values and multiplying the current forecast by that PIT density: p₁(x;J,C) = π(F=F̃(x;J,C)|ℱ,C)·p(x;J,C) (eq. 6). Theorem 1 proves the recalibrated forecast is (i) closer in expected relative entropy to the ideal forecast and (ii) on average probabilistically calibrated — *without* requiring i.i.d. PIT values, unlike prior work. The fit uses Gaussian Process Measure Estimation (GPME, a log-Gaussian Cox process on PIT space with squared-exponential kernel, Laplace-approximated Poisson likelihood), which yields closed-form information measures: predicted entropy-game winnings ΔS̄ = KL[π(F|ℱ,C)‖U] ≥ 0, its variance Var(ΔS), the Forecast Advantage Measure FAM = ΔS̄/√Var(ΔS) ~ O(N^{1/2}), and a fit-quality diagnostic EI ~ B/2N. The ignorance-score difference equals the negative entropy-game winnings, which equals log₂ of the Kelly bettor's expected wealth growth — recalibration gain is literally expected profit per bet. Case studies: (1) nonlinear circuit forecasts (overdispersed; PIT histogram hump) — recalibrated PIT uniform, ~0.6 bits/turn winnings (wealth ×1.5/turn); (2) NMME ENSO NINO 3.4 seasonal forecasts (biased high; PIT autocorrelated to 15-month lags, thinned ×5, 64-train/74-test) — recalibrated wins 0.2–0.6 bits/turn, predictions matched actuals.

## Method, math, and equations

- PIT: F_n = F̃(x_n;J_n,C) = ∫_{−∞}^{x_n} p(x′;J_n,C)dx′ (eq. 1); calibrated ⟺ F_n ~ Uniform[0,1].
- Ideal/π vs published/p notation; key identity (eq. 2): π(X_n=x_n|𝒥_n,C) = π(F_n=F̃(x_n)|𝒥_n,C)·p(x_n;J_n,C).
- Recalibration (eq. 6): p₁(x;J,C) = π(F=F̃(x;J,C)|ℱ,C)·p(x;J,C), with π(F|ℱ,C) = E_{Π(F|C)|ℱ}[Π(F|C)] (eq. 4–5).
- Theorem 1: (i) E[KL[Π‖p] − KL[Π‖p₁]] = ∫ π(F|ℱ,C) log₂ π(F|ℱ,C) ≥ 0 (eq. 9); (ii) E[Π(G|C)] = 1 via G̃(F;C)=∫₀^F π(f′|ℱ,C)df′ (eqs. 10–13) — recalibrated PIT uniform in expectation.
- Ignorance score (eq. 15–16): Ign[p] = −E[log₂(p/π(X|C))]; ΔIgn[p₁,p] ≈ −ΔS̄ ≤ 0 (eq. 17).
- Entropy game: w = log₂[p₁(x_n)/p(x_n)] per turn; expected winnings ΔS_True (eq. 19–20); Kelly link (eq. 18): expected wealth growth 2^{ΔI}, ΔI = KL[p‖g]−KL[p‖f] = −ΔIgn.
- A-priori prediction: ΔS̄ = ∫ π(F|ℱ,C) log₂ π(F|ℱ,C) = KL[π(F|ℱ,C)‖U] (eq. 24); Var(ΔS) via 2-D quadrature with GP posterior covariance (eq. 25); Var ~ N^{−1}, FAM = ΔS̄/√Var(ΔS) ~ N^{1/2} (eq. 26).
- Fit quality: EI[π(F|ℱ,C)] = (1/2ln2)∫ π(F|ℱ,C)·C(f,f) df → B/2N (eq. 28); thinning by PIT autocorrelation lag to restore GPME's i.i.d. training assumption (like MCMC thinning).
- GPME (App. A): log-Gaussian Cox process, GP prior on log Π(F|C) with squared-exponential kernel, Laplace-approximated Poisson likelihood, approximate normalization; closed-form λ(f), C(f₁,f₂) (eqs. 56–57), predictive density (eq. 65).

## Datasets

- Nonlinear circuit (Moore–Spiegel analogue, chaotic R=10, Γ=3.6): 2,048 initial states × 127-member ensembles, 0.8 ms lead, kernel-dressed + climatology-blended; climatology from 2,000 z-probe points; train sizes 200–1600, remainder test.
- ENSO: NMME 5 consistent models (CCSM3/CCSM4/GFDL variants, ensembles 6–12), monthly NINO 3.4 hindcasts Jan 1982–Oct 2017 (430), leads 1–11 mo; BMA with EM; 36-train BMA, 394 forecasts, recalibration on 64 thinned (×5), 74 test.
- Access: NMME public (IRI/LDEO), NOAA OISST v2 public; circuit data lab-internal (not public). No code stated.

## GSE application and implementation spec

1. Build GSE's Forecast-Observation Archive: engine predictive densities (per-game spread/total densities from the engine's posterior, or model-based densities on margin/total) + realized outcomes, 2020–2025.
2. Fit GPME (squared-exponential, Laplace) to the FOA PIT values with thinning at the PIT autocorrelation lag (weekly games → expect lag ~2–4 weeks of correlation).
3. Deploy recalibration p₁ as a post-processing layer on engine densities before pricing/odds comparison; monitor ΔS̄, FAM weekly.
4. Kelly translation: ΔS̄ in bits = expected log₂ wealth growth per bet when wagering against the unrecalibrated engine (or market) — feed directly into the bet-sizing/edge-verification lane.
5. Effort: ~2 weeks (GPME is implementable from App. A; the FOA plumbing is the real work).

## Leakage

- GPME's training assumes i.i.d. PIT values; autocorrelated PITs require thinning that discards most data (ENSO: ×5 thinning left 64 training points) — the advertised "non-i.i.d." generality applies to *deployment*, not to the fit.
- EI fit-quality is self-reported (model judges itself); kernel misspecification is invisible to it — Fig. 2 top-right shows EI deviating from B/2N scaling at large N, i.e., model defect the paper only partially acknowledges.
- Theorem 1's guarantee is *in expectation over the GP posterior* — if the GPME fit is wrong, the true ΔS_True can be negative; the paper is honest about this but the headline claim can be misread as unconditional.
- ENSO test spans a climatology drift (carbon forcing) — success attributed to stable miscalibration, but drift is a confound for the "stable miscalibration" interpretation.
- Assumes p(x)>0 everywhere (footnote: zero-density intervals need Dirac-δ extensions the paper declines to build).

## Limitations

- No code released; GPME must be reimplemented from Appendix A (doable but nontrivial).
- Squared-exponential kernel only; acknowledged inadequacy at large N (Fig. 2).
- Only two case studies, neither sports: circuit (lab) and ENSO (geophysics) — external validity to NFL score distributions is untested.
- Thinning × autocorrelation: NFL weekly data with 16–17 games/season gives thin training sets; the ENSO case shows the method survives this but with FAM only 1–2.
- Recalibrated forecast is "on-average calibrated," not ideal — with enough data it remains distinguishable from the true conditional density; it only improves on the base.
- Assumes stationarity of the miscalibration itself ("miscalibration more stable than climatology") — a bet that may fail if the engine's bias regime changes (model updates).

## GSE overlap

ENIR (1074) recalibrates binary classifiers; temperature scaling/Platt recalibrate binary probabilities; Venn-Abers gives intervals. None handles continuous predictive densities over margins/totals, none addresses non-i.i.d. PIT series, and none predicts its own improvement in advance. **New capability**: distributional PIT recalibration with an a-priori decision statistic (FAM) and a direct Kelly-profit interpretation — bridges the calibration lane and the Kelly/market lanes.

## Implementation difficulty

Medium. GPME from Appendix A is a serious but tractable implementation (log-Gaussian Cox process, Laplace approximation, 2-D quadrature for Var(ΔS)); the thinning diagnostics and weekly refit pipeline are the operational load. No exotic dependencies beyond a GP library.

## Reproducible test

Build GSE's FOA from 2020–2024 engine spread-density forecasts vs realized margins; fit GPME on thinned PITs; run the entropy game on held-out 2025 weeks (recalibrated vs raw engine densities). Baselines: (a) raw engine densities, (b) isotonic-regression PIT recalibration (KFE-style), (c) temperature-scaled densities. Metrics: mean entropy-game winnings per turn with the predicted ΔS̄ ± √Var(ΔS) band, and PIT-histogram uniformity (χ² vs uniform).

## Numeric gate

**2.0** — the Forecast Advantage Measure: deploy GP-PIT recalibration on GSE engine densities only if the a-priori FAM = ΔS̄/√Var(ΔS) ≥ **2.0** on the FOA fit (2σ confidence the out-of-sample entropy-game winnings are positive). The paper's ENSO case ran at FAM 1–2 ("moderate confidence") and still won 0.2–0.6 bits/turn; GSE's bar is higher because deployment costs a pipeline. If FAM < 2.0, collect more FOA data (FAM ~ N^{1/2}) and re-evaluate — do not recalibrate on a low-confidence fit.

## Improvement experiment

Attack the paper's own flagged weakness: thinning discards correlated data. Implement the two-dimensional GP the authors propose (PIT value × time) to model the autocorrelation explicitly instead of thinning, and test whether the 2-D GPME raises FAM on the same FOA without discarding data — if it does, GSE's thin weekly data becomes an asset rather than a constraint. Second, replace the squared-exponential kernel with a Matérn mixture and test whether the EI-vs-B/2N diagnostic at large N recovers the expected scaling.

## Verdict

**ADAPT** — GP-PIT recalibration with closed-form a-priori performance prediction (FAM) and an entropy-game/Kelly-profit interpretation is the most deployment-ready distributional calibration method in the lane: it works on non-i.i.d. forecast series (GSE's weekly reality), predicts its own expected winnings in bits before you deploy, and won 0.2–0.6 bits/turn on both case studies. Build the FOA, fit GPME, and gate deployment on FAM ≥ 2.0.
