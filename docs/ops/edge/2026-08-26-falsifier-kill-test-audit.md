# Falsifier audit — two of the four kill tests are inert

**Date:** 2026-08-26 · **Status:** FINDING, reproduced live. No code changed in this pass.
**Subject:** `packages/prediction-engine/src/edge-lab/falsify.ts` (arrived on the main lineage
with the `hermes/w2-audit-settlement` integration).

---

## 1 · The claim, stated precisely

The falsifier funnel is described across the operating prompt and `handoff/EDGE_LEDGER.md` as
**four independent kill tests** — leakage / shuffle / split / multiplicity — and Honesty Law #5
makes a `SURVIVOR` verdict the precondition for any SHIP.

Measured behavior: **only `multiplicity` responds to the model's predictions at all.**
`shuffle` and `split` are computed from a statistic that does not read `modelProb`, so they
return the same verdict — byte-identical detail strings — for a pure-noise model, a perfect
oracle, and a perfectly inverted (anti-predictive) model.

A `SURVIVOR` verdict therefore means *"the e-process grew and there was no temporal
lookahead"*, **not** *"survived four independent kill tests."*

## 2 · Root cause (file:line)

`effectSize` (`falsify.ts:36`) is a function of `outcome` and `marketProb` only:

```ts
function effectSize(rows: readonly BacktestRow[]): number {
  const sum = rows.reduce((a, r) => a + (r.outcome - (r.marketProb ?? 0.5)), 0);
  return sum / rows.length;
}
```

`modelProb` never enters. Two consequences:

**a. SHUFFLE (`falsify.ts:90–108`) can never fire.** The permutation loop Fisher-Yates shuffles
*whole row objects* (`falsify.ts:96–100`) and recomputes `effectSize(perm)` (`:101`). A mean over
a row set is **permutation-invariant**, so `permES === origES` exactly, on every one of the 200
iterations. The comparison at `:103` is therefore `Math.abs(x) >= Math.abs(x)` — trivially true —
so `survive` is always `shuffleB` (200/200), always `>= p95` (190), and the verdict is always
`PASS`. A correct permutation test must break the pairing between prediction and outcome and use
a statistic that reads both.

**b. SPLIT (`falsify.ts:110–122`) is a base-rate check, not a stability check.** `esA`/`esB`
(`:115–116`) are the same `effectSize`, so the sign comparison at `:117` asks only whether the
*outcome base rate* sits on the same side of `marketProb` in both halves. Model stability across
the split is never examined.

`leakage` is also `modelProb`-blind, but legitimately so — it is a temporal ordering check
(`knownAtWeek >= outcomeWeek`) and does its job.

## 3 · Reproduction (run it — do not take this on report)

Save as `packages/prediction-engine/src/probe.ts`, run `npx tsx src/probe.ts` from
`packages/prediction-engine`, then delete it.

```ts
import { falsifyBind, type BacktestRow } from "./edge-lab/falsify.js";
let seed = 999;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rows: BacktestRow[] = [];
for (let i = 0; i < 400; i++) rows.push({
  season: 2024, knownAtWeek: 1, outcomeWeek: 5,
  outcome: rnd() > 0.42 ? 1 : 0, modelProb: rnd(), marketProb: 0.5,
});
const noise    = falsifyBind(rows, { minN: 100, seed: 7 });
const oracle   = falsifyBind(rows.map(r => ({ ...r, modelProb: r.outcome === 1 ? 0.99 : 0.01 })), { minN: 100, seed: 7 });
const inverted = falsifyBind(rows.map(r => ({ ...r, modelProb: r.outcome === 1 ? 0.01 : 0.99 })), { minN: 100, seed: 7 });
console.log(noise.shuffle.detail, "\n", oracle.shuffle.detail, "\n", inverted.split.detail);
```

Observed output (2026-08-26, this checkout):

```
split detail  NOISE : firstHalf=0.085 secondHalf=0.060 signMatch=true
split detail ORACLE : firstHalf=0.085 secondHalf=0.060 signMatch=true
split detail INVERT : firstHalf=0.085 secondHalf=0.060 signMatch=true
all three identical? true

multiplicity NOISE : KILLED | e-value decayed M=0.000 (not growing/survivor)
multiplicity ORACLE: PASS   | e-process M=4.635e+118 growing
multiplicity INVERT: KILLED

overall NOISE / ORACLE / INVERT: KILLED / SURVIVOR / KILLED
```

Shuffle, separately, reported `survives 200/200 perm > p95` with an **identical detail string**
for the noise model and the perfect oracle.

## 4 · What this does and does not invalidate

- **Does not** invalidate any recorded `KILLED` verdict. `multiplicity` is sound and did the
  killing (YACoe real-data `e=0.000`, and the noise probe above). Killed stays killed.
- **Does** weaken the evidentiary weight of any `SURVIVOR`/`PASS` on the shuffle and split legs —
  those legs voted PASS unconditionally, so they never contributed information.
- Track E is CLOSED (`AGENT_LEDGER` C-44) and nothing is currently being shipped through the
  funnel, so this is a correctness debt to repay before the next preregistered program, not a
  live incident.

## 5 · Proposed fix (NOT applied here — separate pass, separate review)

Deliberately not bundled with the 138-file integration merge that surfaced it: changing these
semantics changes what every future verdict means, and it deserves its own diff and its own
review.

1. Give the permutation test a statistic that reads `modelProb` — e.g. the log-likelihood ratio
   already computed for `simpleE`, or the rank correlation between `modelProb` and `outcome`.
2. Permute the **outcome labels against the predictions**, not the row array, so the null
   ("predictions carry no information about outcomes") is the one actually being tested.
3. Make SPLIT compare a model-dependent statistic per half, not the outcome base rate.
4. Add a regression test asserting the property this audit used: a pure-noise model and a
   perfect oracle **must not** produce identical shuffle/split verdicts.

Until then, read a `SURVIVOR` as a single-gate (e-process) result and say so wherever it is
cited.
