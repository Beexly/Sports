# 1084 — Isotonic Distributional Regression

## Citation / full-text source

- arXiv:1909.03725v3 — full text: https://arxiv.org/pdf/1909.03725
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1909.03725v3
- **Full-text URL**: https://arxiv.org/pdf/1909.03725v3 (read in full; cached text 143,127 bytes / 1,211 wrapped lines: Theorems 2.1–2.3 with proofs, partial-order constructions §§3.1–3.3, simulation study §4, ECMWF precipitation case study §5, discussion §6, appendices A–E, references)
- **Authors**: Alexander Henzi, Johanna F. Ziegel, Tilmann Gneiting (published JRSS-B 2021)
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: GSE's engine outputs point forecasts (spreads, totals, win probabilities) whose probabilistic outputs still need calibration into full conditional distributions of outcomes — e.g., the distribution of the realized margin given engine spread, or of total points given engine total. IDR is a generic, fully automatic, tuning-free benchmark for exactly this: it learns conditional distributions that are *guaranteed threshold-calibrated* in-sample and simultaneously optimal under essentially all relevant proper scoring rules (Theorem 2.2 universality), needs no parametric family choice (unlike GSE's existing GP-PIT/temperature-scaling lanes), handles mixed discrete-continuous responses (covers/points exactly at the spread, push/over-under ties), nests isotonic quantile regression and binary-event classifiers as special cases, and its subagging variant (idrbag) is both faster and more accurate. The empirical story is honest: competitive with hand-built parametric SOTA (BMA/EMOS/HCLR) in a real ECMWF case study and best-in-class under discontinuities — exactly the regime of NFL line movements.
- **Read depth**: FULL READ: CRPS mixture representations (2)–(4), elementary scoring functions (6)–(7), calibration notions (8)–(9), Thm 2.1 existence/uniqueness, Thm 2.2 universality (i)–(iii), QP implementation (15), subagging timings, Thm 2.3 uniform consistency, prediction interpolation (20)–(21), partial orders §§3.1–3.3 (Prop 3.1–3.3, Fig 3), simulation design (23)–(26) + Table 1, case study §§5.1–5.5 (BMA/EMOS/HCLR review, IDR variants, training periods, CRPS/Brier/PIT results, Figs 4–8), discussion §6, appendices A–E proofs.
- **Wave**: wave2-reader-20
- **GSE overlap**: The corpus has GP-PIT recalibration (1082), ENIR (1074), scoring-rule selection (1083) — but no tuning-free *nonparametric distributional regression* for converting engine point/ensemble outputs into calibrated conditional outcome distributions. **New capability**: a universal benchmark postprocessor with a calibration guarantee.

## Research question

What is the tuning-free benchmark for conditional distribution estimation — the estimator that minimizes mean CRPS over all CDFs monotone in a covariate partial order?

## Summary

IDR is the unique minimizer of mean CRPS over conditional CDFs monotone (stochastic order) in a covariate partial order (Theorem 2.1, min-max formula (10)). Universality (Theorem 2.2): it is simultaneously optimal for a broad class of proper scoring rules (quantile/threshold-weighted CRPS, essentially all quantile- or threshold-probability-based scores), threshold-calibrated in-sample (the strongest calibration notion), and nests isotonic quantile regression (part ii) and binary classifiers (part iii) — no quantile crossing ever. Implementation: one QP per threshold via OSQP, warm-started; subagging (idrbag, 100 subsamples of size n/2) smooths and speeds (n=10,000: 11.7s naive → 1.1s sequential; subagging 2.5s, 0.5s on 8 cores). Consistency uniform under mild conditions (Thm 2.3). Prediction at new x via predecessor/successor bounds (20)–(21). Simulations: 4 scenarios × 4 sample sizes, m=5,000 test; IDR competitive everywhere, best under discontinuity (24), robust under isotonicity violation (25); subagging always slightly better (Table 1). Case study: ECMWF 52-member ensemble, 24h precipitation, 4 airports (London/Brussels/Zurich/Frankfurt), ~9 years data, ~700-instance 2015–2016 test; IDR competitive with purpose-built BMA/EMOS/HCLR on CRPS, beats BMA widely, uniform PITs, better than EMOS/HCLR on precipitation-probability Brier score; weaker on accumulation magnitudes (cannot extrapolate past training max; ignores ensemble spread). R package isodistrreg (CRAN); Python isodisreg on GitHub.

## Method, math, and equations

- CRPS(F,y)=∫(F(z)−1{y≤z})²dz; mixture representations in terms of quantile loss (2)–(3), elementary scoring functions (6)–(7); divergence form S̄^F_m−S̄^G_m → E_X[L₂²(F(·|X),G(·|X))] (App. D).
- Definition 2.1 S-based isotonic regression; Theorem 2.1 min-max formula (10); Theorem 2.2 (i) universality for scoring rules (11)–(12), (ii) all-α quantile optimality (13), (iii) all-threshold binary optimality (14); threshold calibration (9), marginal calibration.
- Computation: at fixed z, solve argmin Σ(η_i−1{y_i≤z})² over antitonic η (15); total-order recursion (Henzi et al. 2020).
- Prediction: F(z)=½(max_{s(x)}F_i(z)+min_{p(x)}F_i(z)) (21); bounds (20).
- Partial orders: componentwise (Prop 3.1 — adding covariates can only improve in-sample fit); empirical stochastic order ⪯_st (Def 3.1, Prop 3.2 — equivalent to sorted-componentwise); empirical increasing convex order ⪯_icx (Def 3.2, Prop 3.3 — sums of top order statistics, Gini link (22)).

## Datasets

- Simulations: X~Unif(0,10), four scenarios (smooth Gamma (23), discontinuous +10·1{X≥5} (24), non-isotonic −2·1{X≥7} (25), Poisson (26)); 500 training replicates per n∈{500,1000,2000,4000}, test m=5,000. Code on GitHub.
- Case study: ECMWF 52-member ensemble + airport observations (LHR/BRU/ZRH/FRA), 2007-01-06 to 2017-01-01; TIGGE public data. Competitors' code in ensembleBMA/ensembleMOS/crch R packages.

## GSE application and implementation spec

1. **Primary adaptation**: use IDR as GSE's benchmark engine-output postprocessor — covariate = engine's implied quantity (spread forecast, total forecast, or sorted ensemble of sub-model signals; empirical stochastic order ⪯_st handles the exchangeable-sub-model case exactly like ECMWF's perturbed members), response = realized outcome. Produces calibrated conditional outcome distributions with a theorem-backed calibration guarantee, ready for Kelly/prop pricing.
2. Replace ad-hoc binning recalibration for total-points and margin distributions; IDR's no-crossing quantiles give coherent full predictive CDFs.
3. Use idrbag (subagging) on the full game history for daily refresh — parallelizable.
4. Effort: ~1 week (R package isodistrreg exists; port the partial-order choices to NFL: componentwise on [engine total, engine spread], ⪯_st on sub-model ensembles).

## Leakage

- Theorem 2.2's calibration guarantee is *in-sample*; out-of-sample calibration rests on the ECMWF study and Thm 2.3 asymptotics, not a finite-sample guarantee.
- Adding covariates can only improve *in-sample* fit (Prop 3.1) — overfitting on game-history data with many engine features needs held-out validation (the paper's simulations do this; the temptation is real).
- Prediction formula (21) at incomparable x falls back to the empirical marginal — GSE must log when this happens rather than silently issuing marginal forecasts.

## Limitations

- IDR cannot extrapolate beyond the training response range (explicitly cost it precipitation-accumulation CRPS vs EMOS/HCLR) — NFL blowouts/tail events beyond historical maxima are truncated; pair with a parametric tail model for extremes.
- Only the stochastic order on distributions — cannot distinguish distributions that agree in location but differ in spread/shape (paper §6); engine forecast errors with pure dispersion components need other machinery.
- Needs larger training sets than parametric competitors (~2,500–3,000 days in the case study) — NFL game history is thin per season; pool across seasons with regime checks.
- Cannot use spread/dispersion information of the covariate ensemble directly (⪯_icx partially addresses this; performance gain was modest).
- Boundary spiking of isotonic estimators (Wu et al. 2015) not addressed empirically beyond their settings.

## GSE overlap

Existing corpus covers parametric/point recalibration (ENIR 1074, GP-PIT 1082) and model-selection scoring (1083) but nothing on nonparametric, tuning-free distributional regression with a calibration guarantee. The weather postprocessing task (ensemble output → calibrated conditional distribution) is structurally identical to engine output → calibrated outcome distribution. **New capability**: universal benchmark distributional postprocessor; also the ⪯_st construction is a ready answer for combining exchangeable sub-model signals.

## Implementation difficulty

Medium. R reference implementation exists (isodistrreg); the NFL adaptation is mostly choosing the partial order and wiring daily refits. Python port needed for GSE stack.

## Reproducible test

Replicate the case-study protocol on GSE data: covariate = engine total forecast, response = realized total points, 2020–2024 NFL games, train on expanding window, test on 2025 season; partial order = total order on engine total (then componentwise on [total, spread]); competitors = current GSE recalibration (GP-PIT 1082), quantile regression forests, raw engine; metric = mean CRPS on held-out games + PIT uniformity. Baseline: raw engine conditional distribution (empirical residual model). Sanity replication first: reproduce Table 1 discontinuous-scenario result (IDR sbg best) with the authors' code.

## Numeric gate

**5%** — adopt IDR (idrbag) as GSE's benchmark engine-output postprocessor if it achieves ≥ **5%** relative mean-CRPS improvement over the raw engine on held-out 2025 games *and* beats the incumbent GSE recalibration method on the same split. The 5% anchors to the paper's demonstration that a generic, tuning-free method can match purpose-built SOTA; anything less than 5% does not justify replacing a tuned parametric pipeline.

## Improvement experiment

Address the two stated weaknesses head-on: (a) extrapolation — graft a parametric tail (e.g., GPD on residuals above the training max) onto IDR's CDF and measure CRPS on tail games (margins ≥ 20); (b) spread information — add an ⪯_icx variant on the sub-model ensemble's Gini mean difference as a dispersion covariate and test whether it closes the accumulation-CRPS gap vs the parametric SOTA on high-variance games. If (a)+(b) succeed, IDR stops being "benchmark only" and becomes the primary postprocessor.

## Verdict

**ADAPT** — Unique CRPS-optimal, threshold-calibrated, tuning-free distributional regression; best under discontinuities, competitive with hand-built SOTA in a real ensemble postprocessing study, with a subagging variant that is faster and better. Make it GSE's benchmark engine-output postprocessor; gate adoption on ≥5% held-out CRPS improvement over raw engine, and fix extrapolation/dispersion in follow-ups.
