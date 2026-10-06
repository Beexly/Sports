# Tournament Harness Changelog — MOVE-37-ANALYSIS-04 §7 (2026-09-13)

All seven mandatory fixes implemented in `~/workspace/gse-discovery/tournament.py`.
Existing functions (`robust_symbolic_fit`, `bootstrap_r2`, `shuffled_null`,
`cross_era_test`, `verdict`, `DISCOVERY_CARD_SCHEMA`) are unchanged and
backward-compatible, except `robust_symbolic_fit` gained an optional
`soft_target_beta` parameter (default `None` = off).

## Fix 1 — Affine-calibrate ALL baselines before R² comparison
- New: `affine_calibrate(y_train, pred_train, pred_test)` → `(calibrated_test_pred, intercept, slope)`.
- Fits `pred_cal = slope * pred + intercept` on train via least squares.
- Motivating bug: raw B2 R² = −0.2755 vs calibrated 0.0531 (a 0.33 R² gap) —
  raw scale-mismatched baselines are meaningless.

## Fix 2 — GBM ceiling probe + multi-tier gate before every SR run
- New: `gbm_ceiling_probe(X_train, y_train, X_test, y_test, seed=42, max_iter=200)`.
- Tiers: `< 0.03` → skip SR; `[0.03, 0.05)` → low-signal flag;
  `[0.05, 0.15]` → standard; `> 0.15` → SR + structure diagnostic.
- Structure diagnostic (high tier only): OLS linear R² on the same features;
  if within 0.02 of the GBM ceiling → "signal is primarily linear — SR's
  nonlinear discovery space offers no advantage" (reported, not blocking).

## Fix 3 — Gen-0 diagnostic in every SR run
- New: `gen0_diagnostic(X_train, y_train, X_test, y_test, function_set, seed, loss, soft_target_beta)`.
- 1-generation probe (pop 2000, parsimony 0.001); records gen-0 best train/test R².
- `gap = train − test > 0.15` → `attractor_suspect=True`, and automatically
  retries with soft target regularization (beta=0.9) for comparison.

## Fix 4 — Log-cosh + soft target regularization as default for heavy-tailed targets
- New: `soft_target_transform(y, beta=0.9)` = `median + beta * (y − median)`,
  applied BEFORE SR fitting on heavy-tailed targets (Vanneschi & Castelli 2021).
- `robust_symbolic_fit(..., soft_target_beta=None)`: opt-in soft targeting.
- New: `tail_report(y, name)` — skew/excess-kurtosis transparency helper; the
  caller declares heavy vs light tail explicitly (no invented auto-threshold).
- Rule: heavy-tailed → log-cosh + soft target; bounded light-tail → MSE only.

## Fix 5 — Row-alignment guard
- New: `row_alignment_guard(n_expected, *arrays, index_pairs=None, name="")`.
- Raises `AssertionError` on any row-count or index mismatch instead of silently
  comparing misaligned frames. Used in `prep_split` for train and test frames.

## Fix 6 — Smooth-linear simplification test
- New: `smooth_linear_test(predict_fn, X_test, y_test)`.
- Fits OLS on the same features; if the smooth linear form wins or ties the
  discovered nonlinear formula (`kink_is_decoration=True`), the kink is
  decoration, not discovery.

## Fix 7 — Baseline existence check
- New: `BASELINE_REGISTRY` + `baseline_existence_check(target_name)`.
- Registered: `play_type` → nflfastR xPass (SR on raw play-type would be
  circular; residual-only); `wpa2` → B2 human heuristic + B3 GLI-0.1
  (must be beaten affine-calibrated).
- Returns `blocked_or_residual_only=True` when a substantive baseline exists.

## Validation
Smoke-tested 2026-09-13: affine calibration, gate tiers (high tier +
primarily-linear structure flag), row guard, baseline registry
(`play_type` → residual-only), smooth-linear test (correctly flags a linear
formula's kink as decoration), and a live 1-generation gen-0 probe
(no attractor: gap 0.0039). All pass.
