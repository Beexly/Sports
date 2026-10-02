# probkit/probmetrics

- Stars: 74 (Apache-2.0, actively maintained — pushed 2026-05-29)
- Repo: https://github.com/probkit/probmetrics (redirects from dholzmueller/probmetrics)
- Note: this is the repo **gpleiss/temperature_scaling** itself points to as the maintained successor ("REPO UNMAINTAINED" banner).

## 1. Vision

A PyTorch-based package of *all* modern post-hoc classification calibration methods in one place — the reference implementation set for the CalArena benchmark. It ships: fast accurate temperature scaling, structured matrix scaling (SMS, a regularized matrix scaling), plus integrations of every CalArena-benchmarked method (beta calibration, spline calibration, scaling-binning, netcal's BBQ/ENIR, etc.), and classifier-based Lp calibration-error estimators (a new way to measure ECE without binning artifacts).

## 2. The Ask

- A trained classifier's logits/probabilities + a **held-out labeled calibration set**.
- PyTorch (plus optional numba, catboost/lightgbm for some estimators).
- Fits in seconds; single-machine.

## 3. Constraints

- License: Apache-2.0 — commercial-safe.
- PyTorch-centric; GSE's heads are sklearn/gradient-boosting (need an adapter, trivial for probability-in/probability-out maps).
- Most methods assume the held-out set is exchangeable with deployment data — i.e., no regime shift between the fit set and the season you're predicting.
- Maintenance: active (companion to 2025-26 arXiv papers, CalArena benchmark live).

## 4. GSE lens

This is the **calibration-methods bench** for calibration-on-wire rows. Opinionated take:

- **Per-signal rows with tiny samples**: default to its temperature scaling (1 parameter, cannot overfit) or scaling-binning / beta calibration — the CalArena results tell you exactly which method wins at which sample size, so GSE stops guessing. Isotonic regression is the method to reach for only when n is large; the benchmark evidence should gate that choice per signal.
- **Walk-forward setup**: recalibrate per season. These fits are cheap (seconds), so the calibration row becomes: fit on 2022-24, measure on 2025, then *re-fit on 2025* for the 2026 deployment, live-checked on W1-4. A one-global-map-across-seasons approach is exactly the contaminated-fit failure mode Garrett already threw out (13.5pp) — regime shifts between NFL seasons are real.
- **Refusal thresholds**: skip this library for refusals — it calibrates probabilities, not abstention policies.
- **Do not hand-roll temperature scaling** from the gpleiss gist; this is the tested version.

## 5. Verdict

**ADOPT** — pip-install it as the standard calibration-methods library for per-signal rows; use its Lp calibration-error estimators as the ECE metric instead of naive binned ECE. Apache-2.0.

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/probkit/probmetrics
- Diagram: https://gitdiagram.com/probkit/probmetrics
- Star history: https://star-history.com/#probkit/probmetrics (74 stars, growing)
- Open in browser IDE: https://github.dev/probkit/probmetrics
