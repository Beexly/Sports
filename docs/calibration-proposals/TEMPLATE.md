---
modelVersion: <new version, e.g. v5.1.0>   # the version this proposal would bump TO
status: PROPOSED                            # PROPOSED → ACCEPTED → IMPLEMENTED (or REJECTED)
proposedAt: <YYYY-MM-DD>
proposedBy: <name / handle>
---

# CalibrationProposal — `<slug>`

> A `MODEL_VERSION` bump retroactively re-labels prior picks, so it requires an audit
> trail (`docs/calibration-proposals/FROZEN.md`). This template IS that audit trail for
> turning on calibration (docs/path-to-70.md §7 step 3). Fill every section with REAL
> numbers from the harness — no placeholders left in an `IMPLEMENTED` proposal.
>
> **Decision rule (hard gate): proceed to a MODEL_VERSION bump ONLY IF the HELD-OUT
> `calibratedEce <= rawEce`.** In-sample improvement is not sufficient.

## 1. Observation — why now?

What changed that justifies revisiting calibration? (e.g. the eligible settled sample
crossed the floor; drift monitor flagged a segment; a season completed.)

- Trigger:
- Date observed:
- Relevant monitor / signal:

## 2. Evidence — the harness output

Produced by, and copy-pasted from:

```
DATABASE_URL=… npx tsx scripts/calibration/fit-and-validate.mjs
```

(Run date: `<YYYY-MM-DD>`. Paste the full console output into an appendix at the bottom.)

### 2a. Eligible sample

| Field | Value |
|---|---|
| Eligible sample size **N** | |
| Eligibility predicate | settled + canonical (`isBootstrap=false`) + `eligibleForLearning=true` + decisive `WIN`/`LOSS` (PUSH excluded) |
| Calibrator min-sample floor | `DEFAULT_MIN_CALIBRATION_SAMPLE` = (state the value) |
| N ≥ floor? | yes / no — **must be yes** |

### 2b. In-sample (reference, optimistic — NOT the gate)

| Metric | Value |
|---|---|
| `rawEce` | |
| `calibratedEce` | |
| Brier (raw) | |
| Brier reliability / resolution / base rate | |

### 2c. HELD-OUT (the gate) — split: `<chronological 70/30 | k-fold k=…>`

| Metric | Value |
|---|---|
| HELD-OUT `rawEce` | |
| HELD-OUT `calibratedEce` | |
| HELD-OUT Brier (raw) | |
| HELD-OUT Brier (calibrated) | |
| **Verdict line from harness** | `HELD-OUT: calibratedEce (…) <= rawEce (…) ? PASS / FAIL` |

### 2d. Reliability curve (from `calibrationCurve()`)

| Predicted bucket | n | predicted mid | observed win rate |
|---|---|---|---|
| 0–10% | | | |
| … | | | |
| 90–100% | | | |

(Diagonal = perfectly calibrated. Note any sparse / divergent buckets.)

## 3. Change being proposed

- New `MODEL_VERSION`: `<value>` (bumped in `packages/prediction-engine/src/constants.ts`)
- Gate flipped: `canApplyCalibrationAdjustments` via `CALIBRATION_ADJUSTMENTS_ENABLED`
  (`readiness.ts` + `platform-config.ts`) — state default and target value.
- Scope: which sports / pick types / confidence ranges the activated map applies to.
- What is NOT changing: scoring weights (otherwise update `FROZEN.md` accordingly);
  prior picks keep their original `MODEL_VERSION` (no retroactive relabeling).

## 4. Decision

- [ ] HELD-OUT `calibratedEce <= rawEce` (**required** — if unchecked, STOP; do not bump).
- [ ] N ≥ `DEFAULT_MIN_CALIBRATION_SAMPLE`.
- [ ] Reliability curve reviewed; no pathological bucket inversions unaccounted for.
- [ ] Owner sign-off recorded below.

**Decision:** PROCEED / DO NOT PROCEED

**Rationale:**

## 5. Audit trail

| Field | Value |
|---|---|
| Decision date | |
| Decided by (owner) | |
| Harness run commit (git SHA) | |
| Engine version at fit time (`MODEL_VERSION` before bump) | |
| Sample window (earliest → latest `settledAt`) | |
| `FROZEN.md` updated? | yes / no — required on any version bump |
| Tests pinning `v5.0.0` updated? | yes / no (see `readiness-gate-enforcement.test.ts`) |
| Follow-up / drift-watch plan | |

## 6. Appendix — full harness output

```
<paste the complete stdout of fit-and-validate.mjs here>
```
