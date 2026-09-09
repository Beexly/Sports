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
