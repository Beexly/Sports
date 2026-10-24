# G7 — The Spec's Circuit Breaker Halts 98.5% of Healthy Families

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Module:** `packages/prediction-engine/src/learning/g7-circuit-breaker.ts`
**Gate:** `packages/prediction-engine/test/g7-circuit-breaker.spec.ts` — 15 tests
**Sweep:** `packages/prediction-engine/reconciliation/_mutation_sweep_g7_circuit_breaker.mjs` — 10/10

---

## 1. The spec's rule

§5.3: *"Murphy (1973) Brier Decomposition: Updates BS=REL-RES+UNC=… If ECE30-ECE250>0.02,
Gate G7 halts firing on that market family."*

`settlement-loop.ts` implements that rule correctly, and its own gate pins the boundary. But
two things were missing.

## 2. Two gaps, not one

**(a) THE RULE WAS NEVER PER-FAMILY.** `gateG7HaltsOnMarketFamily` takes a bag of
probabilities and outcomes and answers "is this sample drifting?". The spec's rule is about a
FAMILY — "halts firing on that market family" — so something must group the samples by
family and decide per family. Nothing did, and the module had **zero live importers**.

**(b) THE THRESHOLD IS BELOW THE NOISE FLOOR.** This is the finding.

## 3. The measurement, and why it matters

A binned ECE is an **absolute** value. For a bin with true rate `p` and `N` observations, the
observed frequency fluctuates around `p` with standard error `sigma = sqrt(p(1-p)/N)`, and
the bin's ECE term is `|observed − forecast|` — whose expectation is **`sqrt(2/pi) * sigma`,
not zero**. So a perfectly calibrated family has a *positive* expected ECE, and the smaller
(30-sample) window has the larger fluctuation. The expected `ECE_30 − ECE_250` under the
null is therefore positive and large.

**Measured over 400 perfectly calibrated families** — `p` spread across the probability
range, outcomes drawn *from* `p`, so no drift at all:

| statistic | value |
|---|---|
| min | −0.0042 |
| p05 | 0.0430 |
| **median** | **0.1210** |
| p95 | 0.1954 |
| max | 0.2857 |
| **the spec's threshold** | **0.02** |
| **families halted with NO drift** | **393 of 400 (98.3%)** |

The threshold is **0.219 of ONE standard error** (a 30-sample bin's standard error is about
`0.5/sqrt(30) = 0.091`).

**What would have happened.** A circuit breaker that halts 98.3% of healthy families is
worse than no circuit breaker: it takes the platform's publishing offline for every market
family, permanently — and it *looks like the gate is working* because it fires. A gate that
reports success by refusing everything.

## 4. The fix, and its measurement

A family halts when the difference clears **both** the spec's threshold **and** the noise
floor:

```
difference > (bias_fast - bias_slow) + 0.02 + 2 * se(difference)
```

where `bias` is the expected `|deviation|` of each window under perfect calibration and
`se` its standard error, both computed from the sample's own bin structure.

**Measured over 400 calibrated and 400 drifting families:**

| rule | false halts (calibrated) | true halts (drifting) |
|---|---|---|
| spec only (`diff > 0.02`) | **397** | 400 |
| bias-corrected (`diff > bias + 0.02`) | 137 | 400 |
| **bias-corrected + 2 se** | **0** | **400** |
| bias-corrected + 3 se | 0 | 395 |

Two standard errors is the choice: it keeps every true drift caught and produces no false
halts. Three loses five true catches for no gain.

**Confirmed at scale through the module itself** (200 calibrated, 200 drifting):

```
200 CALIBRATED families: spec-rule would halt 197  |  the gate halts 0
200 DRIFTING families:    the gate halts 200
```

**THE SPEC'S NUMBER IS STILL THERE.** `G7_ECE_HALT_THRESHOLD` remains 0.02 and remains a
*component* of the floor. The noise floor is added on top, not substituted for it: a family
whose real drift is small is still not halted by a difference below 0.02.

**BOTH VERDICTS ARE REPORTED.** The verdict carries `specHalt` (the spec's rule alone) and
`halt` (the rule as it must be applied to be usable), plus the bias excess, both standard
errors, and the floor. A reader can see which one the gate used and why they differ.

## 5. The rest of the module, and why it is shaped this way

**The group key is the repo's own `sport|market` shape.** `selective-publish-runtime.ts`
builds `${pick.sportKey}|${pick.pickType}` and checks `pausedGroups.includes(groupKey)`;
`proven-path-engine.ts` splits `groupKey` on `"|"` the same way. A key of any other shape
would produce a halt list that never matches, and the "gate" would silently never fire. The
key is built in ONE exported function so a caller cannot get it subtly wrong.

**The pause mechanism it feeds already exists and is live.** `apps/web/lib/ops/
ranking-pause-durable.ts` persists a durable per-group pause list; `/api/picks` reads it
through `passesPublicSelectiveFilterAsync`, which returns false for a paused group and drops
the pick from the response. So this module supplies the missing *producer* for a gate that
was already built and already live — it does not invent a second one.

**The fast window is the most RECENT, by settlement time.** A drift rule whose window depends
on iteration order is not a drift rule, so the observations are sorted by `settledAt` and the
test reverses the array to prove the verdict does not move.

**A family with too few observations is not judged.** Fewer than 30 settled bets cannot
establish drift, and a family with no evidence is not a family *proven* to have drifted.

**Invalid observations are rejected and reported**, not silently dropped.

## 6. The sweep, and what it caught in my own test

Ten mutations, each required to make a named test stop passing. Two of them matter most:

- **"the noise floor is removed"** — the module becomes the spec's halt-everything switch.
  The test that catches it asserts a *calibrated* family keeps emitting **even when its raw
  difference exceeds 0.02**. Without that test, a module that fires on everything would pass
  every other test in the file.
- **"the family grouping is removed"** — every family judged on every other family's data.

**The sweep caught a real weakness in my own test.** The test that checked the noise floor
recomputed the expected value with `eceNoise` — **the same function the module uses** — so
changing `eceNoise` moved both sides together and the test still passed. The mutation
"the standard error is computed with the wrong rate" survived. The fix: a new test recomputes
the bias and the standard error **independently, from the bin structure, with no reference to
the module's helper**, and the mutation was repointed at it. It is now detected.

That is the third time in this audit that a test which shared its implementation with the
code passed while the code was wrong. The first two were the canonical AST (private to a
script) and the 7.099 bar (in three documents, enforced nowhere).

## 7. What is NOT done

**The module is not yet wired to a live emission path.** It computes the halt list; the
durable-pause producer that would persist it, and the caller that would consult it per
family, are the next piece. The `sport|market` key and the pause mechanism are both in
place, so the wiring is mechanical — but it is not done, and this record does not claim it
is.

**The G7 rule's own threshold may be a spec error rather than a spec threshold.** The
finding is that `ECE30 - ECE250 > 0.02` cannot be the operative condition, because the
difference it compares is dominated by the estimator's own noise at `n=30`. Two standard
errors above the bias is one defensible repair; **the threshold itself is a policy decision
and belongs to the owner.** The module reports both verdicts so that decision can be made
against the evidence rather than inferred from it.

**`G7_MIN_FAMILY_SAMPLES` (30) is the module's floor, not the spec's.** The spec names the
30-game *fast window*; the floor is the same number, used as a sample floor, and it is
exported so it is visible rather than buried.

## 8. Files

| file | status |
|---|---|
| `packages/prediction-engine/src/learning/g7-circuit-breaker.ts` | new — the per-family rule, the noise floor, the group key |
| `packages/prediction-engine/test/g7-circuit-breaker.spec.ts` | new — 15 tests |
| `packages/prediction-engine/reconciliation/_mutation_sweep_g7_circuit_breaker.mjs` | new — 10 mutations, exit 0 |
| `packages/prediction-engine/src/learning/settlement-loop.ts` | unchanged — its rule was already correct |
