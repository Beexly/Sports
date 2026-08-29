# Empirical-rate teacher convergence test — 2026-08-26

**What ran:** the ORBIT corpus port from `docs/ops/edge/2026-08-26-paper-spec-rlvr-empirical-rate.md`
§3a, executed against the live `gse-postgres` settled sample (read-only
`hermes_ro`, SQL-over-HTTP). Offline only — nothing applied to live scoring.
New reusable module: `packages/prediction-engine/src/empirical-rate-teacher.ts`
(22 unit tests, hand-verified shrinkage math). New script:
`scripts/calibration-offline/teacher-eval.ts`.

**Question:** the calibration-eligibility Brier floor is RED (0.2466 > 0.22,
per `2026-08-26-CALIBRATION-FIT-REPORT.md`). Is that a genuine information
ceiling, or could a different look — more math, a finer state definition —
find resolution the 10-bin ECE/Brier diagnosis missed? This is the direct
port of the corpus's own convergence-test idea: if independent forecasters
(raw confidence, PAVA, CIR, market q) all land on the same held-out Brier as
a state-conditioned empirical rate, that agreement IS the ceiling; a
forecaster sitting meaningfully below it would be the opposite finding.

**Sample:** 1,470 settled non-bootstrap WIN/LOSS picks with confidence
(same export as the calibration fit report; 2026-05-31 → 2026-08-25).
Market q (de-vigged fair probability, from `pick_proof_receipts.marketFairProb`)
covers **706/1,470 rows (48.0%)** — consistent with the earlier L-12 finding
of ~48.3% coverage on a smaller pull; not every pick carries a receipt.
`timeHoldoutSplit(0.7)` → train 1,029 / test 441, same split discipline as
the calibration fit.

**Consistency check:** PAVA/CIR held-out Brier here (0.2491 / 0.2516) match
the calibration fit report's numbers (0.2490 / 0.2521) almost to the digit —
confirms this export and pipeline reproduce the known result before drawing
any new conclusion from it.

## Two runs — v1 caught its own confound, v2 is the fair test

**v1 teacher** conditions only on `{pickType, market-q band}` — it does not
see confidence at all. Result: PAVA/CIR beat this teacher's Brier (0.2491,
0.2516 vs 0.2672). That is **not** evidence of hidden resolution — it only
shows PAVA/CIR resolve finer than a state space that excludes their own
input, which is close to true by construction (PAVA has up to ~50-80 distinct
output steps; v1's teacher has 13 populated buckets). Caught in-session and
corrected before writing this up, not after.

**v2 teacher** adds a third dimension, a confidence band, so the teacher's
state is at least as rich as what raw/PAVA/CIR themselves see — the actual
apples-to-apples test:

| Forecaster | n | forecasterBrier | teacherBrier (v2, same rows) | gap |
|---|---|---|---|---|
| raw confidence | 441 | 0.2666 | 0.2558 | **+0.0108 worse** |
| PAVA(confidence) | 441 | 0.2491 | 0.2558 | −0.0067 better |
| CIR(confidence) | 441 | 0.2516 | 0.2558 | −0.0042 better |
| market q | 145 | 0.2497 | 0.2378 | +0.0119 worse |

## Honest reading

1. **Raw confidence is worse than its own conditional rate** (+0.0108) — this
   is consistent with, not new relative to, the known SPREAD/TOTAL
   overconfidence: bucket-averaging raw confidence is itself a crude
   calibration step, so of course it beats the uncalibrated value.
2. **PAVA/CIR beat the v2 teacher by a few hundredths of a Brier point.**
   The most parsimonious explanation is a **binning-resolution artifact, not
   discovered information**: PAVA's isotonic step function carries far more
   distinct values than 7 confidence bands, so it can differentiate within a
   band the teacher averages over. This gap would need to survive a teacher
   fit with much finer confidence bins before it says anything about hidden
   predictive signal.
3. **Market q trails its own (richer) teacher by 0.0119 at n=145** — the
   teacher here also knows our model's confidence band, so this could mean
   confidence adds information beyond q, but n=145 is too small to say so.
   A back-of-envelope Brier-difference standard error at this n is on the
   order of 0.02–0.03 — **every gap in this table sits within roughly one
   standard error of zero.** None of these numbers clear a significance bar.
4. **This test is itself underpowered at the current sample size** — the
   same honest category as the MVE audit's "instrument failure" finding, on
   a much smaller scale. The disciplined conclusion is not "confidence has
   hidden resolution" and not "the Brier floor is confirmed dead" — it is
   **inconclusive at n=441/145, with a specific, named next step.**

## What would resolve this

- **A proper paired bootstrap significance test** over the Brier differences
  (the RLVR paper's own method, §1.5, 10⁴ resamples) before any gap in the
  table above is treated as a finding either direction.
- **Finer confidence bins** in the v2 teacher (or, better, drop the
  hand-picked-edges approach and let the teacher's hierarchy do the binning
  at multiple granularities) so PAVA/CIR are compared against a teacher that
  cannot win on resolution alone.
- **Re-run at the next ~250-settled cadence** — q coverage and n both grow,
  narrowing the standard errors that make every gap here inconclusive today.

**This does not change the calibration-eligibility verdict.** Brier stays
RED; E2 (the covariate ladder) remains the path to resolution. What this
session adds: a reusable, tested convergence-test harness for the re-fit
cadence, and one clean example — caught and corrected within the same
run — of exactly the "re-look before calling something dead" discipline the
corpus ledger's second-look register exists to enforce.

**Reproduce:** export via the SQL in `teacher-eval.ts`'s header comment (adds
a `pick_proof_receipts` join for `q` to the calibration-fit-report export),
then `npx tsx scripts/calibration-offline/teacher-eval.ts --in <file.json>`.
