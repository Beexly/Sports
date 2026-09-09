# Finding: the pooled ECE is flattered by cross-version cancellation

**Date:** 2026-09-09 · **Tool:** `python3 -m gsecal cancellation` · **Status:** analysis only, nothing changed

---

## Provenance — read this first

The four per-version figures below are **quoted from `AGENTS.md`**, where they
are recorded as production readings taken 2026-09-06. **I did not measure them.**
This session has no database access and AGENTS.md law 7 forbids acquiring any.

What is new here is not a measurement. It is **arithmetic on figures the repo
already recorded**, performed by an identity that had not been applied to them.
The identity is exact and property-tested; the conclusion is only as good as the
recorded inputs.

## The recorded inputs

| stratum | n | weight | ECE |
|---|---|---|---|
| v5.2.7 (deployed) | 245 | 53.5% | 0.1089 |
| v5.2.6 | 110 | 24.0% | 0.0587 |
| v5.1.0 | 74 | 16.2% | 0.0729 |
| v5.0.0 | 29 | 6.3% | 0.1531 |
| **pooled** | **458** | | **0.0524** |

**Consistency check:** 245 + 110 + 74 + 29 = **458**, exactly the recorded
pooled n. The strata are therefore disjoint and exhaustive over the sample,
which is the precondition the identity requires. This is not a coincidence to
wave at — if the parts had not summed to the whole, the decomposition below
would not have been applicable and this document would say so instead.

## The identity

Production bins are fixed equal-width intervals, so bin *k* is the same
interval for every stratum. With `d_s,k` the **signed** gap of stratum *s* in
bin *k*, and `w_s,k` its share of that bin's mass:

```
  SUM_s w_s * ECE_s  -  ECE_pooled
      = SUM_k (n_k/N) * [ SUM_s w_s,k|d_s,k|  -  |SUM_s w_s,k d_s,k| ]
```

Every bracketed term is non-negative by the triangle inequality. So the gap
between the pooled figure and the weighted stratum mean is **entirely and
provably signed-error cancellation** — not partly, not approximately.

Verified in `tests/test_decomposition.py` across 120 randomized stratifications
(residual < 1e-9 every time), plus the degenerate cases: one stratum cancels
nothing; same-sign strata barely cancel; opposite-sign strata cancel heavily.

## The result

```
pooled ECE (what the gate reads)     0.0524
weighted stratum mean (honest)       0.0938
cancellation                         0.0414   (44.2% of the honest figure)
```

**44.2% of the honest calibration error disappears when the four model versions
are pooled.** The honest figure is **1.88x the 0.05 floor**. The version
actually serving traffic, v5.2.7, carries 53.5% of the sample and measures
**0.1089 on its own rows — 2.18x the floor**.

This confirms, with a number, the mechanism AGENTS.md flagged as plausible but
unobserved. It is no longer a hypothesis.

## What follows from it

1. **The gap to PROVEN is wider than the headline suggests.** Reading 0.0524
   against a 0.05 floor invites "one good week away". The honest weighted figure
   is 0.0938. Nothing in this analysis moves either number — it only says which
   one describes the model.

2. **Pooling across model versions is the wrong denominator for a published
   claim.** A claim published off 0.0524 would rest on four models' errors
   offsetting each other, while the model serving the customer measures 0.1089.
   That is precisely the shape of claim this product's premise forbids, and the
   caution already written into AGENTS.md was correct.

3. **Waiting will not fix it by itself.** As v5.2.7 accumulates rows its weight
   rises toward 1, and the pooled figure converges *up* toward the deployed
   model's own ECE, not down. More data makes the number more honest, not
   smaller. The levers remain the ones AGENTS.md already names: more settled
   rows and a real calibration pass, both founder-gated.

4. **The two small-sample sport strata still cannot be read.** NFL n=28 spread
   over ten bins is ~3 rows per bin. `gsecal.bootstrap.bins_occupancy_warning`
   now flags that automatically rather than leaving it to a reader's judgment —
   the same trap an earlier draft of the AGENTS.md note fell into and corrected.

## What this does NOT claim

- Not a fresh measurement. Re-run against a real export to confirm:
  `python3 -m gsecal stratify rows.csv --by modelVersion`, which additionally
  gives **per-bin** attribution that headline figures cannot.
- Not a reason to change a floor, a threshold, or the engine. Nothing here
  touches MODEL_VERSION or any gate, and the tool refuses floors looser than
  production's.
- Not a claim that any *other* stratification (sport, book, month) cancels.
  Those need their own run. Cancellation is always >= 0, but its size is
  specific to the split.

## Reproduce

```bash
cd gse-calibration-lab
python3 -m gsecal cancellation \
  --stratum v5.2.7:245:0.1089 --stratum v5.2.6:110:0.0587 \
  --stratum v5.1.0:74:0.0729  --stratum v5.0.0:29:0.1531 \
  --pooled-ece 0.0524
```

---

# Finding 2: the gate can go GREEN on a model that is not calibrated

**Status:** latent, not live. Detector shipped; the production fix is NOT made here (ledger C-275).

## The defect

`evaluateCalibrationEligibility` compares a **pooled** ECE against the 0.05 floor.
Finding 1 measures that pooling runs **0.0414 below** the honest weighted mean on
live data. Those two facts together mean a reachable state exists where:

```
pooled ECE  <=  0.05  <  the deployed version's own ECE
```

In that state the gate reads GREEN and the product publishes a calibration claim
about a model whose own rows fail the floor. The mechanism producing it is
measured, not assumed.

## How close it is

```
pooled (what the gate reads)   0.0524
deployed v5.2.7 (own 245 rows) 0.1089
margin before a false GREEN     +0.0024
```

**0.0024.** A shift in the version mix of a couple of hundred rows covers that.

Today the gate is **HONESTLY RED** — pooled and deployed both fail, and they
agree. This finding is about the state one data cycle away, which arrives
without anybody deciding anything.

## Waiting is not the fix — it is the opposite

As v5.2.7's weight rises toward 1, the honest figure converges **up** toward its
own 0.1089:

| additional v5.2.7 rows | honest weighted mean |
|---|---|
| +0 | 0.0938 |
| +250 | 0.0991 |
| +1000 | 0.1042 |
| +3000 | 0.1069 |

And no volume of rows at the current quality reaches the floor at all:

| future rows measure | rows needed to reach 0.05 |
|---|---|
| 0.10 / 0.06 / 0.05 | **never** — more data is not the lever |
| 0.04 | 1,444 |
| 0.02 | 482 |

The lever is a better-calibrated model measured on its own rows — v5.2.8's
market-anchored probability — not patience.

## What shipped, and what deliberately did not

**Shipped:** `gsecal.readiness.false_green_risk` classifies four states —
HONESTLY RED, HONESTLY GREEN, **FALSE GREEN**, and CONSERVATIVE RED (deployed
clears but retired versions hold the pool back; errs safe). `python3 -m gsecal
readiness` **exits 1** on FALSE GREEN, so it can gate a publish script.

**Not shipped:** the production fix. The gate should additionally require the
**deployed** version to clear the floor on its own rows. That direction is
allowed under law 9 — a guard may be given narrower context, never less power —
and can only ever prevent a false GREEN, never cause one. But it is a production
gate change on the honesty boundary, and `compute-live-calibration-metrics.ts`
does not currently emit per-version ECE, so it is real scope rather than a
one-liner. It needs an owner. Measuring the cancellation is not the same as
preventing the publish.

## Reproduce

```bash
python3 -m gsecal readiness \
  --version v5.2.7:245:0.1089 --version v5.2.6:110:0.0587 \
  --version v5.1.0:74:0.0729  --version v5.0.0:29:0.1531 \
  --deployed v5.2.7 --pooled-ece 0.0524
```

---

# Finding 3: the gate certifies calibration, not skill

**Status:** structural. A zero-skill model passes every floor today.

## The demonstration

A forecaster that ignores every input and always predicts the base rate is
**perfectly calibrated by construction**. Measured against the conditions
recorded in AGENTS.md (base rate ~0.694 implied by uncertainty 0.2139, n 458):

```
n            458      floor >= 100    PASS
ECE          0.0003   floor <= 0.05   PASS
Brier        0.2122   floor <= 0.22   PASS
Murphy REL   0.0000   floor <= 0.05   PASS
Murphy RES   0.0000   <-- NO FLOOR EXISTS
GATE VERDICT: GREEN   (reasons: none — every floor met)
```

Run end-to-end through the production gate mirror, not just the floor
comparisons: `tests/test_skill.py::test_the_gate_itself_reads_green_on_zero_skill`.

## Why all four fail together

All four floors measure **calibration or volume**. None measures discrimination.
Murphy's own decomposition, which this repo already uses, says why:

```
Brier = REL - RES + UNC
  REL  reliability   lower better   floored three different ways
  RES  resolution    HIGHER better  NOT FLOORED AT ALL
  UNC  uncertainty   fixed by data  not a lever
```

Calibration is free if you predict the base rate. Skill is not. The gate only
tests the free part.

AGENTS.md already records that the Brier floor alone is clearable by a no-skill
forecast, and that the Murphy reliability floor is ~4.47x looser than the ECE
floor. What had not been stated is the consequence: they do not merely fail
*individually*, they fail *together, to the same forecaster*.

## Correction: RES is computed — it is unfloored, unsliced, and unquoted

An earlier draft of this section said RES "is unmeasured" and "unknown". **That
overstated it, and the correction matters.**
`compute-live-calibration-metrics.ts` *does* compute and emit
`overall.murphy.resolution`.

What is actually true, and is still the point:

1. **Not floored.** The gate applies no RES floor.
2. **Not computed per slice.** `CalibrationSliceMetrics` carries `murphyRel` but
   no `murphyRes`, so there is no per-version ranking power at all.
3. **Not among the readings AGENTS.md quotes**, which record n, Brier, ECE and
   Murphy **reliability** (0.0053) — a different term pulling the opposite way.

The pooled number exists. Nobody floors it, and no per-version figure exists.

*(A caution against a mistake made and caught while writing this: 0.0053 is
RELIABILITY. Reading it as resolution would be a category error, and reading a
low value as bad would invert its meaning.)*

## Related: the gate compares a point estimate to a floor

The gate compares a point estimate to the floor. **Same correction shape as
above:** the artifact *already* computes `eceCi95` and `brierCi95`
(`bootstrap-metric-ci.ts`). The uncertainty **is** measured — the *gate* just
does not read it.

AGENTS.md records that at n=223 the ECE was 0.0553 with a bootstrap CI of
**[0.0365, 0.1142]** — an interval straddling the 0.05 floor by a wide margin in
both directions. A GREEN reading near the floor can therefore be noise.
`gsecal.bootstrap` reports the interval and a verdict of CLEARS / FAILS /
INCONCLUSIVE against the floor for exactly this reason.

## Reproduce

```bash
python3 -m gsecal skill --base-rate 0.694 --n 458    # exits 1: zero skill passes
```

## What is NOT proposed here

No floor is added, changed or weakened. Adding a RES floor would make the guard
strictly stronger (law 9's allowed direction) and is worth doing — but it is a
production gate change on the honesty boundary, it needs a measured RES first,
and it belongs to a human. This measures the gap so the decision is informed.


---

# Correction log

Claims in this document that were wrong when first written, and what replaced
them. Kept visible rather than silently edited, because a findings document that
quietly rewrites itself is not evidence of anything.

| First written | Corrected to |
|---|---|
| "compute-live-calibration-metrics.ts does not currently emit per-version ECE, so it is real scope, not a one-liner" (ledger C-275) | It already emits `byModelVersion` as `CalibrationSliceMetrics` including `ece`, already plumbed into `calibration-eligibility-durable.ts:76`. The fix is small. |
| "RES is unmeasured / unknown" (Finding 3) | `overall.murphy.resolution` is computed and emitted. It is unfloored, not computed per slice, and not among AGENTS.md's quoted readings. |
| "the gate ... has no uncertainty treatment" (Finding 3) | `eceCi95`/`brierCi95` are already computed. The gate does not read them. |
| A test labelled 0.0053 as Murphy *resolution* | 0.0053 is Murphy *reliability*. Caught before commit; the test now states its RES value is illustrative, not measured. |
