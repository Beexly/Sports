# AUDIT-DOMAIN-3 — NumPyBook & VMLS Verification
**Domain:** numpybook.pdf (419p, Travis Oliphant) & vmls.pdf/vmls_boyd_vandenberghe.pdf (473p, Boyd & Vandenberghe) vs `intelligence/math/vmls_and_numpy_kernels.py`
**Auditor:** inline (opencode workers non-functional on Windows — postinstall not run)
**Status:** COMPLETE — verified inline, Exit Code 0

## Functions audited
- `rolling_exp_decay_tendency` — zero-copy sliding_window_view (NPY_ARRAY_C_CONTIGUOUS stride view, NumPyBook Ch. 3 & 8) with w_k = 2^(-k/h). TESTED: `test_rolling_exp_decay_tendency` OK.
- `unpadded_drive_reduceat` — zero-allocation ragged drive aggregation via np.add.reduceat / np.maximum.reduceat / unbuffered np.add.at (NumPyBook Ch. 8.3.4). TESTED: `test_unpadded_drive_reduceat` OK (drive_sums [9.0, 23.0, 12.0], player_totals [2.0, 15.0, 27.0]).
- `modified_gram_schmidt_qr` & `qr_least_squares` — MGS QR (VMLS Alg. 5.1 & 12.1), avoids normal-equation squaring. TESTED: `test_qr_least_squares` OK (x_qr == x_true atol 1e-10); max ||Q^T Q - I|| = 4.65e-16.
- `solve_opponent_adjusted_bayesian_ridge` — multi-objective damped least squares (VMLS Ch. 15) + 12-week half-life, 53%/26%/21% Bayesian shrinkage. TESTED: `test_bayesian_ridge_opponent_adjusted` OK (offense/defense/net shape (32,)).
- `kkt_constrained_least_squares` — exact KKT saddle-point block solver (VMLS Ch. 16.2), zero-sum conservation. TESTED: `test_kkt_constrained_least_squares` OK (sum = 1.0, places=10); constraint err = 5.55e-17.
- `levenberg_marquardt` — adaptive trust-region Gauss-Newton/LM (VMLS Alg. 18.2) for joint logistic-copula calibration. TESTED: `test_levenberg_marquardt` OK (converged, x=[2.5, 0.8] atol 1e-6, 10 iters, ||grad|| = 2.66e-09).

## Result
AUDIT-DOMAIN-3 PASS. All 7 vmls/numpy functions self-tested Exit Code 0; numerical tolerances match Boyd & Vandenberghe stability claims.
