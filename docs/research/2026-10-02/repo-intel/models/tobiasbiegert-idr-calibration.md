# tobiasbiegert/idr-calibration

- Stars: 0 (MIT) — code for Biegert, Resin, Jordan & Lerch, "On the Calibration of Isotonic Distributional Regression" (AISTATS 2026 workshop "Towards Trustworthy Predictions")
- Repo: https://github.com/tobiasbiegert/idr-calibration — pushed 2026-05-12, i.e. current research

## 1. Vision

Documents an **out-of-sample artifact of isotonic distributional regression (IDR)**: PIT values concentrate on simple rational fractions with frequencies resembling **Thomae's function** — i.e., the "calibrated" distributions look calibrated in-sample but produce a pathological, spiky PIT histogram out-of-sample. Explores mitigation via smoothing and interpolation.

## 2. The Ask

Nothing to adopt — it's a cautionary artifact study with reproduction code.

## 3. Constraints

- License: MIT. Zero stars, workshop paper, 2026 — treat as a warning flag, not settled science. But the mechanism (isotonic step functions + small samples → discrete PIT artifacts) is mathematically plausible.

## 4. GSE lens

This is the **safety rail on the whole isotonic-recalibration plan**. GSE's calibration-on-wire rows will be tempted by isotonic methods (uncertainty-toolbox's recalibration, IDR-style distributional fits) because they're flexible. This paper says: flexibility + small held-out samples = artifacts that *look* calibrated and aren't — exactly the contaminated-fit failure mode Garrett already discards. Concrete policy:

- Every isotonic-based calibration row must pass a **PIT-uniformity check on the 2026 W1-4 live-check** (not just the 2025 fit slice). Spiky/non-uniform PIT → the map is discarded, never averaged — same as the 13.5pp rule.
- Default stays Platt/temperature for small-n signals; isotonic only for large-n signals AND with smoothing/interpolation mitigations from this paper.
- This is also why conformal intervals (MAPIE/crepes) are safer than isotonic CDF remapping for published outputs: finite-sample guarantees beat flexible fits at small n.

## 5. Verdict

**REBUILD** — not as code, as a mandatory QC gate: PIT-uniformity on the live-check slice for every isotonic map, discard on failure. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/tobiasbiegert/idr-calibration
- Diagram: https://gitdiagram.com/tobiasbiegert/idr-calibration
- Star history: https://star-history.com/#tobiasbiegert/idr-calibration (0 stars — new research)
- Open in browser IDE: https://github.dev/tobiasbiegert/idr-calibration
