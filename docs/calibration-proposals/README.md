# Calibration proposals

This directory is the **audit trail** for turning the heuristic confidence score
(0–100) into a calibrated win probability. It exists because activating calibration is
a `MODEL_VERSION` bump, and a version bump retroactively re-labels prior picks — so it
requires recorded evidence and an owner decision, never a silent or automatic change.

See `docs/path-to-70.md` §7 ("Activation checklist for Step 1") and `FROZEN.md` (the
model-freeze guardrail's baseline) for the surrounding policy.

## Files here

- `FROZEN.md` — the locked `MODEL_VERSION` baseline read by
  `scripts/guardrails/model-freeze.mjs`.
- `TEMPLATE.md` — the CalibrationProposal template. Copy it to `<slug>.md` and fill in
  REAL harness numbers when proposing an activation.
- `README.md` — this file.

## The harness: `fit-and-validate.mjs`

`scripts/calibration/fit-and-validate.mjs` is the **offline fit + held-out validation**
step (path-to-70.md §7 step 2). It is the source of the numbers a proposal must carry.

### Run it

```bash
DATABASE_URL=postgres://user:pass@host:5432/db npx tsx scripts/calibration/fit-and-validate.mjs
```

It is run with `npx tsx` (not bare `node`) because it imports the prediction-engine
TypeScript source directly, so the ECE / Brier / isotonic math it reports is the exact
same code activation would use. (Same pattern as `scripts/free-ingest-smoke.mjs`.)

Optional flags:

| Flag | Default | Meaning |
|---|---|---|
| `--min=<n>` | engine `DEFAULT_MIN_CALIBRATION_SAMPLE` | Override the min-sample floor. Lower it ONLY for local dry-runs; the real activation gate is the engine constant. |
| `--folds=<k>` | (off) | Use k-fold cross-validation instead of the default single chronological 70/30 holdout. |
| `--bins=<n>` | `10` | ECE / reliability bin count (matches the engine default). |

If `DATABASE_URL` is unset or the database is unreachable, it prints a clear message and
**exits 0** — there is simply no settled sample to read in that environment, which is
expected and not an error.

### What it reads

A single read-only `SELECT` over `pick_signal_snapshots`, pulling the picks that are
**settled + canonical + learning-eligible + decisive**, using the SAME predicate
settlement stamps (`packages/ingestion-pipeline/src/settle-sport.ts`):

- `eligibleForLearning = true` (settlement only sets this when learning is enabled,
  the pick is canonical, and the result is decisive),
- `isBootstrap = false` (canonical — re-asserted defensively),
- `settlementResult IN ('WIN','LOSS')` (decisive **and** binary; `PUSH` is decisive for
  settlement but has no binary win/loss outcome, so it is excluded from the calibration
  sample — `CalibrationSample.y` is strictly `0|1`).

Each row becomes a `(p = confidenceAtPrediction/100, y = win?1:0)` sample.

### What the numbers mean

| Output | Meaning |
|---|---|
| **N** | Count of eligible samples. If `N < min-sample floor`, the calibrator self-suppresses and the harness stops with an honest "accumulation required" message — no fit. |
| **rawEce** | Expected Calibration Error of the raw confidence-as-probability. 0 = perfectly calibrated; lower is better. |
| **calibratedEce** | ECE after applying the fitted isotonic (PAVA) map. |
| **Brier (raw / calibrated)** | Mean squared error of the forecasts; lower is better. |
| **Reliability curve** | Per-bucket predicted-vs-observed win rate (from `calibrationCurve()`). On the diagonal = calibrated. |
| **In-sample** block | Fit and scored on the same data — optimistic, **reference only**, never the gate. |
| **HELD-OUT** block | Fit on train, scored on data it never saw — the number that actually matters. |
| **VERDICT** | `HELD-OUT: calibratedEce <= rawEce ? PASS / FAIL`. PASS = the map does not worsen calibration out-of-sample. |

### What the harness does NOT do

- It does **not** write to the database — one `SELECT`, zero writes, ever.
- It does **not** set `eligibleForLearning` or relabel any pick.
- It does **not** bump `MODEL_VERSION`.
- It does **not** flip `CALIBRATION_ADJUSTMENTS_ENABLED` or any other gate.
- It does **not** touch the live scoring or display path.

A `PASS` is **evidence for**, not authorization of, activation.

## Activation is a separate, OWNER-GATED step

Even a clean `PASS` does not turn calibration on. Activation is the founder's audited
decision (path-to-70.md §7 steps 3–5), in this order:

1. **Have the sample** — `N ≥ DEFAULT_MIN_CALIBRATION_SAMPLE`, confirmed by the harness.
2. **Fit & validate offline** — this harness, with HELD-OUT `calibratedEce <= rawEce`.
3. **Record a CalibrationProposal** — copy `TEMPLATE.md` → `<slug>.md`, fill in the real
   numbers, get owner sign-off; bump `MODEL_VERSION` in
   `packages/prediction-engine/src/constants.ts` and update `FROZEN.md`.
4. **Unpin the gate** — change `canApplyCalibrationAdjustments` to read
   `CALIBRATION_ADJUSTMENTS_ENABLED` (default false) and update the pinning tests.
5. **Wire & display** — feed the calibrated probability into the conviction tier and the
   public reliability diagram. New picks carry the new `MODEL_VERSION`; prior picks keep
   theirs (no retroactive relabeling).

This never happens automatically. The harness produces the evidence; a human takes the
step.
