---
modelVersion: v5.1.0
status: IMPLEMENTED
date: 2026-06-22
author: calibration activation (founder-approved)
supersedes: v5.0.0 (FROZEN.md)
---

# CalibrationProposal — activate isotonic calibration (v5.0.0 → v5.1.0)

## Decision

Activate the isotonic/PAVA calibrator (`packages/prediction-engine/src/calibration-apply.ts`)
by bumping `MODEL_VERSION` to **v5.1.0** and enabling the `CALIBRATION_ADJUSTMENTS_ENABLED`
runtime gate. This satisfies Step 1 of `docs/path-to-70.md §4` / the §7 activation sequence.

The raw heuristic **scoring weights are unchanged** from the v5.0.0 baseline. The only change
is that the raw confidence score is mapped through a validated isotonic calibration map into a
calibrated `P(win)` at the display / conviction-tier / public-reliability-diagram boundary.

## What this is — and is NOT

This activation makes the published confidence numbers **honest** (calibrated), it does **not**
improve the model's edge. Over the settled sample the raw hit rate is **50.9%** (200W/193L/1P
overall), which is **below the ~52.4% breakeven** for -110 pricing. That is expected and
acceptable for a silent/collecting posture: calibration aligns the *displayed* probability with
the *observed* frequency so "62%" means 62%, but it does not manufacture an edge. Edge is a
separate, later lever (independent estimator agreement + CLV — path-to-70 §4 Step 2), gated
separately and not part of this proposal.

## Evidence — held-out validation (read-only, production sample)

Validator: `scripts/calibration-validate.ts` (committed alongside this proposal). It reuses the
engine's own `isotonicCalibration` + `expectedCalibrationError` and computes a 5-fold
**out-of-fold** ECE (fit on train folds, score the held-out fold) — never in-sample.

- **Sample:** 393 learning-eligible settled picks (published, non-bootstrap, non-seed, WIN/LOSS) — **200W / 193L**.
- **Raw ECE:** 0.1980 (raw confidence is ~20 points miscalibrated).
- **Held-out (5-fold out-of-fold) calibrated ECE:** 0.0445.
- **Per-fold held-out ECE:** [0.0538, 0.0712, 0.0079, 0.0321, 0.0576] — every fold improves.
- **Verdict:** calibrated 0.0445 ≤ raw 0.1980 out-of-sample → **PASS**. (In-sample calibratedEce is
  0.0000, an isotonic overfit artifact; the out-of-fold number above is the honest one.)

Exact validator output (audit evidence):

```
learning-eligible settled (WIN/LOSS) picks: 393  (W 200 / L 193)

--- in-sample (buildCalibrator) ---
isActive=true  rawEce=0.1980  calibratedEce(in-sample)=0.0000

--- held-out (5-fold out-of-fold) ---
rawEce (all):            0.1980
calibratedEce (held-out): 0.0445
per-fold held-out ECE:   [0.0538, 0.0712, 0.0079, 0.0321, 0.0576]

VERDICT: calibrated 0.0445 <= raw 0.1980 out-of-sample → PASS (calibration helps)
```

## Activation checklist (path-to-70 §7)

- [x] ≥100 learning-eligible settled picks (393).
- [x] Held-out validation: calibratedEce ≤ rawEce out-of-sample (0.0445 ≤ 0.1980).
- [x] `MODEL_VERSION` bump v5.0.0 → v5.1.0 (`constants.ts`) + `FROZEN.md` re-pin + this audit entry.
- [x] Full verification gate green.
- [ ] `CALIBRATION_ADJUSTMENTS_ENABLED=true` set on Vercel Production (founder-gated; see note below).

> **Surface note (founder adjustment B):** calibrated output is only "latent" while the public
> picks / performance / reliability surfaces are gated. As of activation, production has
> `PUBLIC_PICKS_ENABLED=true` and `PERFORMANCE_STATS_ENABLED=true`, so calibrated numbers become
> user-visible immediately once the flag is flipped. The env flip is recorded here when executed.
