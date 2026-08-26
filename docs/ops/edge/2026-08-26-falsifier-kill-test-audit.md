# Falsifier audit — two of the four kill tests are inert

**Date:** 2026-08-26 · **Status:** §5 fix **APPLIED** (owner-approved 2026-08-26). §5b decision
rule still **HELD** — see the status note below. Findings below are preserved as written, in the
past tense where they have been repaired, because the record of what was wrong is the point.

> **Status note (post-fix).** §1–§4 describe the defect as found. §5 is the fix that was proposed
> and has now been applied. §5b's *reporting* half was applied; its *decision-rule* half
> (terminal `M` → `supM`) is deliberately **not** applied, because unlike everything else here it
> would make a gate **easier** to pass. That direction needs its own explicit call.
>
> Verification that the repair works, run against the same probe as §3, after the fix:
>
> ```
> NOISE     shuffle=KILLED   split=PASS    overall=KILLED
> ORACLE    shuffle=PASS     split=PASS    overall=SURVIVOR
> INVERTED  shuffle=KILLED   split=PASS    overall=KILLED
>
> shuffle details identical across all three? false
> split   details identical across all three? false
> ```
>
> Before the fix both lines printed `true` and all three rows showed `shuffle=PASS split=PASS`.
> (`split` passing on all three is correct: it tests *stability*, not skill — a consistently bad
> model is stable, and shuffle plus multiplicity are what kill it. Its details now differ, which
> is what proves it reads `modelProb` at all.)
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

## 5 · The fix — APPLIED (owner-approved 2026-08-26)

All four steps landed, plus a fifth the work surfaced:

1. ✅ The permutation test now decides on `meanLogLikRatio` — the mean per-row log-likelihood
   ratio of model against market, `(1/n) Σ [y·log(p/q) + (1−y)·log((1−p)/(1−q))]`. It reads
   `modelProb`. `effectSize` survives for **reporting only**, with a docblock saying so.
2. ✅ SHUFFLE permutes the **outcome labels** against fixed `(modelProb, marketProb)` pairs, so
   the null actually under test is "the model's probabilities carry no information about the
   outcomes". It is **one-sided** (`origStat >= permStat`) by design: a two-sided `|statistic|`
   comparison would credit a perfectly *anti*-predictive model, which is the opposite of what an
   edge funnel should accept.
3. ✅ SPLIT scores each chronological half with that same model-aware statistic and compares
   signs, rather than asking whether the outcome base rate sits on the same side of the market.
4. ✅ Regression test added (`"shuffle and split must distinguish a noise model from an oracle on
   identical outcomes"`) holding the outcome column fixed and varying only `modelProb`.
5. ✅ **Degenerate outcome vectors** — not in the original proposal, surfaced while fixing §6c. A
   label-permutation test is vacuous when every outcome is identical: each permutation equals the
   original. Returning `PASS` there would be the same silent rubber-stamp the original bug
   produced, so SHUFFLE now returns `STARVED` with an explicit reason, and `overall` treats an
   uninformative gate as `PARKED` — never `SURVIVOR`. The verdict ordering is now: any `KILLED`
   refutes outright; else any `STARVED` means the funnel never actually tested the bind
   (`PARKED`); else `SURVIVOR`.

## 5b · Third finding: the multiplicity gate reads terminal `M`, not the Ville statistic `supM`

Raised by CodeRabbit on PR #672 and **verified against the code and empirically** — it is correct,
and it is the same family as §2 (the funnel's statistical semantics), so it is recorded here.

`falsify.ts` gates multiplicity on `epRes.M > 1` — the **terminal** wealth of the e-process. But
`bernoulli-eprocess.ts`'s own header (line 11) states the Ville result as
`P(exists t: M_t >= 1/alpha) <= alpha` and says, verbatim:

> `supM` is the statistic, not only terminal M.

The module exports `supM` (the running maximum) alongside `M`; the gate ignored it. A bind whose
wealth crosses the evidence threshold early and decays afterwards is therefore reported KILLED on
its terminal value.

Reproduced: 120 rows where the model is right (`outcome:1, modelProb:0.80, marketProb:0.50`)
followed by 120 where it is wrong (`outcome:0`, same probabilities):

```
supM (Ville statistic) = 3.122e+24     <- crossed 1/alpha = 20 by 23 orders of magnitude
M    (terminal wealth) = 5.516e-24
falsifyBind multiplicity: KILLED
  detail: e-value decayed M=0.000 (not growing/survivor)
```

**Two separable problems, and they were handled differently.**

1. **The decision rule** (terminal `M` vs `supM`). Reading terminal `M` is still a valid level-α
   test by Markov, just not anytime-valid and strictly less powerful. Critically its error
   direction is **conservative** — it can over-kill, never over-pass — so it cannot manufacture a
   false SURVIVOR. It is therefore left in force pending the same owner decision as §5, and a
   test now pins the current behavior so any change to it is deliberate.

2. **The record.** This half was fixed immediately, because it is a pure honesty defect with no
   verdict consequences: the old detail read only `e-value decayed M=0.000`, which is
   *indistinguishable* from a bind that never accumulated any evidence at all. A run that peaked
   at `supM=3e24` and one that never moved produced the same recorded string. `supM` is now
   carried in the detail on both the PASS and KILLED branches, so a crossing can never again be
   silently erased.

**Consequence for verdicts already on record:** any recorded `e=0.000` is ambiguous between
"never had evidence" and "had decisive evidence, then decayed" — the old detail string cannot
distinguish them. This is *not* a claim that any specific recorded verdict (YACoe included) was
wrong; re-running those binds with `supM` reporting is what would settle it, and that needs the
real data this container does not have.

## 6 · The acceptance tests encoded the defect too — all three now repaired

This is why the fix waited for an owner call: applying it required **changing the falsifier's own
acceptance tests**, and rewriting acceptance tests so a self-authored change passes is the pattern
the Honesty Laws exist to prevent. With approval given, all three were repaired — and each one
failed exactly as predicted below when the §5 fix landed, which is itself the confirmation that
the analysis was right. Three of them, in `__tests__/falsify.test.ts`:

**a. `"pure-noise outcomes fail shuffle"` asserts nothing.** Its assertion is

```ts
expect(["PASS", "KILLED"].includes(res.shuffle.verdict)).toBe(true);
```

In the `n >= minN` path, `shuffle` is assigned exactly one of `PASS` or `KILLED`
(`falsify.ts:106–108`) — so this is a tautology. A test named for the kill it verifies, which
cannot fail, is the same class of defect as the inert test it is guarding.

**b. `"sign-flipped second half fails split"` flips the outcome base rate, not the model edge.**
First half is `outcome:1, modelProb:0.7`; second is `outcome:0, modelProb:0.3` — a model that is
*right in both halves*. Under a model-aware split, per-row LLR is `log(0.7/0.5) = +0.336` in
**both** halves — stable and positive, so it would (correctly) PASS, contradicting the test's
stated expectation of `KILLED`. Making split model-aware means rewriting this fixture to flip the
model's edge (e.g. second half `outcome:0, modelProb:0.7`), not the base rate.

**c. `"clean data passes all 4: SURVIVOR"` uses a degenerate outcome vector.** `cleanRows()` sets
`outcome: 1` on every row. A label-permutation test is **vacuous** when the outcome vector is
constant — every permutation is identical to the original — so the repaired shuffle test still
could not discriminate on this fixture. It also asks the funnel to bless a model claiming `0.65`
where the outcome is always `1`, which is badly calibrated.

**How each was repaired:**

- **(a)** now asserts `shuffle.verdict === "KILLED"` on a genuinely independent model, built from
  a seeded LCG rather than an outcome-derived `modelProb`. The old fixture was a perfect oracle
  mislabelled "noise".
- **(b)** the fixture now flips the **model's** edge — first half `outcome:1/modelProb:0.7`
  (LLR `+0.336`), second half `outcome:0/modelProb:0.7` (LLR `−0.511`) — so the signs genuinely
  disagree and split kills it, asserting `signMatch=false`.
- **(c)** split in two: the degenerate `cleanRows()` fixture now has its own test asserting
  `shuffle=STARVED` / `overall=PARKED`, and a new non-degenerate `signalRows()` fixture carries
  the `SURVIVOR` case.

Also fixed while here: `Math.random()` in a falsifier acceptance test made the funnel's own suite
non-deterministic. Replaced with a seeded LCG.

**Still open — the one call not taken.** §5b's decision rule (terminal `M` → `supM`) remains
unapplied. Every change above makes a gate *harder* to pass; that one makes a gate *easier*, and
it is the only remaining gate that was ever doing real work. It needs its own explicit decision,
along with whether recorded verdicts get re-run under the repaired funnel.
