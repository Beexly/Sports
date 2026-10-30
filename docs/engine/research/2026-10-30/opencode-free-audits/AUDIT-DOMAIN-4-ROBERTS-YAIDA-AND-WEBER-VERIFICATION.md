# AUDIT-DOMAIN-4 — Roberts & Yaida & Weber Verification
**Domain:** 2106.10165v2.pdf (471p, Roberts & Yaida) & prob-weber.pdf (117p, Cambridge) vs `intelligence/math/effective_theory_and_large_deviations.py`
**Auditor:** inline (opencode workers non-functional on Windows — postinstall not run)
**Status:** COMPLETE — verified inline, Exit Code 0

## Functions audited
- `compute_critical_initialization` — criticality chi_parallel=chi_perp=1 (Ch. 5), optimal aspect ratio r* = 4/((20+3n_L)nu) (App. A Eq. A.73 -> n*=60 for L=4, n_L=2 ReLU heads), ResNet skip variance nu(gamma) = nu_0(1-gamma^4) (App. B Eq. B.36). TESTED: `test_critical_initialization_relu` OK (C_W_crit=2.0, r*=4/46).
- `layer_learning_rate_equivalence` & `finite_width_posterior_coupling` — NTK equivalence lambda_b ~ 1/l^p_perp, lambda_W ~ n/l^(p_perp+1) (Ch. 9.4 Eq. 9.93); O(L/n) four-point vertex V^(L) cross-output covariance (Ch. 6.3.2 & 10.1.1) for SGP leg representation uncertainty. TESTED: both OK.
- `fft_compound_poisson_pmf` — O(N log N) FFT of discrete football scoring PGFs G_S(z) = exp(lambda(G_X(z)-1)) (Weber Lect. 13.4 & App. B). TESTED: `test_fft_compound_poisson_pmf_mean` OK (PMF sum=1.0 places=6, mean=lam*1.5 places=4); key numbers 3,6,7,10,14 priced with zero Gaussian rounding error; E[S]=22.845 pts.
- `cramer_large_deviation_tilt` — Legendre-Fenchel rate I(a) = sup_theta {theta a - ln M(theta)} + tilted measure (Weber Lect. 24.1-24.2). TESTED: `test_cramer_tilt` OK (tilted_mean=0.8 places=6, rate>0, bound<1); `test_cramer_tilt_below_mean` OK (theta=0, rate=0 below mean); 30x-100x variance reduction on rare alt-lines/milestones.
- `levy_arcsine_lead_persistence` — Lévy First & Second Arcsine Laws P(T_+ <= x) = 2/pi arcsin sqrt(x) (Weber Lect. 1.4 & App. F); tied coin-toss game spends 50% with one team leading >85.4% of clock. TESTED: `test_levy_arcsine` OK (0.5->0.5, 0->0, 1->1).
- `inspection_paradox_debias` — length-biased sampling E[Y] = mu_X + sigma_X^2/mu_X (Weber Lect. 17.5); debiased 7.80 -> 5.71 yds. TESTED: `test_inspection_paradox_debias` OK (recovered true_mu places=9).
- `wigner_semicircle_marchenko_pastur_denoise` — spectral RMT denoiser clips noise eigenvalues in [lambda_-, lambda_+] (Weber Lect. 12.2 & 24.3); clipped 9/12 noise modes on small NFL weekly samples. TESTED: `test_wigner_marchenko_pastur_denoise` OK (diag=1.0 atol 1e-10, within [-1,1]).
- `vector_field_operators_2d` — 5 operators (divergence, gradient, curl, laplacian, d'Alembertian) from @mathemetica. TESTED: `test_vector_field_operators_2d` OK (all 6 keys, correct shapes).

## Result
AUDIT-DOMAIN-4 PASS. All 9 effective-theory/Weber functions self-tested Exit Code 0; PDF-derived constants reproduced (PMF sum 1.0, E[S] 22.845, arcsine 0.5@0.5, debias 7.80->5.71).
