# Hermes build queue, 2026-09-18: the ranking shadow

Issued by the architect session. Fourth queue. Small, four tasks, and the highest-value
work in any of them.

`AGENTS.md` and `CLAUDE.md` bind you in full. Where this file and a law disagree, the law
wins and you mark the task BLOCKED.

---

## 0. The defect, measured

The board is ordered, in part and sometimes entirely, on a number that is
**anti-predictive at the top**.

`confidence` at 80 and above, n 235, claims 0.8663 and realizes **0.5191**, z of -10.7,
with a Brier of 0.3617 against 0.25 for a constant 0.5 forecast. Realized win rate PEAKS at
confidence 75 to 79 (0.6146) and FALLS to 0.4643 by 90 to 94, which is below the 0.5280 of
the lowest band.

It reaches the ordering by three routes, all verified in code:

1. **Always, at 30 percent weight.** `packages/prediction-engine/src/ranking-prob.ts` blends
   `0.7 * trueProb + 0.3 * (confidence / 100)` by default, `independentWeight` 0.7, and
   `apps/web/lib/ranking/sort-key.ts` returns `rankingP` as its PRIMARY key.
2. **Entirely, when `trueProb` is missing.** `ranking-prob.ts:40` states it: missing or
   non-finite `trueProb` goes to confidence only.
3. **Twice more as a terminal fallback** in `sort-key.ts`, once when a row carries no factor
   breakdown and once when neither `rankingP` nor `rankingScore` is finite.

The consequence, measured on a real slate: confidence 91 carried `expectedClv` +0.0217, the
SMALLEST positive edge on the board, while confidence 85 carried +0.2257, the largest. The
top-ranked pick had the worst edge that clears zero.

## 1. Why this queue exists instead of a decision

Changing the ordering changes what a paying customer sees, so it is founder-gated and no
agent flips it. But asking the founder to choose between two orderings with no evidence is
the wrong ask. **This queue builds the measurement that tells him what the change would do,
and leaves the change itself switched off.**

When it lands he gets a report reading: on the last N settled slates, ordering A put these
rows on top and they graded X, ordering B put those rows on top and they graded Y. Then the
decision is evidence-led and takes a minute.

**The property that makes this safe, and your acceptance test for the whole run:** merged
and deployed tonight with no founder action, the board orders exactly as it does today, byte
for byte. If you cannot say that of your own work, say so in your ledger evidence.

---

## 2. Hard boundaries

- **Do not change `sort-key.ts` or `ranking-prob.ts` behaviour.** Not the default weight,
  not the fallback chain, not the key order. You may ADD an exported pure function beside
  them; you may not alter what the existing ones return.
- **Do not touch a database.** Law 7. The report runs from a loader that is INJECTED, and
  your tests supply a fake. The founder runs it against real data, not you.
- **No env flag, no gate, no schema, no published number, no `MODEL_VERSION`.** The switch
  this queue introduces defaults to the current behaviour and only the founder moves it.
- **`@sports/types` is the boundary.** Anything `apps/web` and `packages/*` both need goes
  there. A new import from `@sports/prediction-engine` into `apps/web/lib/board/state.ts`
  or the picks route resolves to `undefined` under the 22 partial mocks and collapses the
  board.
- Two attempts per task, then revert and mark BLOCKED with the exact error.

---

## 3. The tasks

### Task 1. Pin every path confidence takes into the ordering

Before changing anything, make the current behaviour a test that fails loudly if it moves.

`apps/web/lib/ranking/__tests__/sort-key-confidence-paths.test.ts`, one case per route from
section 0: the 30 percent blend, the trueProb-missing fallback to confidence only, the
no-factor-breakdown fallback, and the neither-rankingP-nor-rankingScore fallback. Each
asserts the CURRENT value and carries a comment naming it current-not-desired with a
pointer to architecture section 7.

This task is duplicated as task 3 of the mainline queue. If you have already done it there,
mark this row DONE citing that SHA and move on. Do not do it twice.

**Definition of done.** Four cases, all green against today's code.

### Task 2. The candidate orderings, as pure functions

Build `packages/types/src/ranking-candidates.ts`. Pure, no I/O, no database.

Three orderings, each a comparator over a minimal row shape carrying `expectedClv`,
`trueProb`, `marketFairProb`, `rankingP`, `confidence` and a recency stamp:

- `orderingCurrent`: reproduces today's behaviour exactly, including every fallback. It
  exists so the comparison has an honest baseline computed the same way as the others.
- `orderingEdgeFirst`: descending `expectedClv` among rows with a finite positive value;
  ties broken by `trueProb` minus `marketFairProb`, then recency. **Rows without a finite
  positive `expectedClv` trail as a block, in their current relative order.**
- `orderingModelMinusMarket`: descending `trueProb` minus `marketFairProb`; same trailing
  rule.

Every one is total and stable: equal rows keep their input order, so a comparison never
reports a difference that is really just sort instability.

**Definition of done.** `packages/types/src/__tests__/ranking-candidates.test.ts` proving
each comparator is total, stable and antisymmetric; that `orderingCurrent` reproduces
`sort-key.ts` on a fixture set including every fallback case; and that a row with a null
`expectedClv` trails rather than sorting as zero.

### Task 3. The shadow comparison report

Build a report that takes settled rows through an INJECTED loader and, per slate, computes
each ordering, then reports:

- Rank correlation between each candidate and the current ordering.
- For the top K rows under each ordering, with K at 3, 5 and 10: realized win rate, count,
  and mean `expectedClv`.
- The rows where the orderings disagree most, named, so the founder can eyeball them.
- Counts of rows excluded for a missing edge estimate, by reason, never silently dropped.

**Honesty requirements, non-negotiable.** Report a count alongside every rate. Do not
report a win rate on fewer than the stated floor; return null and say why. Exclude pushes
from win rates and report them separately, because averaging a push as half a win is a
known defect this repo already fixed once. Cluster nothing by row where a fixture
contributes several markets, and if you cannot cluster, say the figure is row-level and
overstates confidence.

**Definition of done.** Unit tests with a fake loader covering: orderings identical gives
perfect correlation and zero disagreements; a constructed inversion is detected and named;
a below-floor sample returns null rather than a number; pushes are excluded from the rate
and counted separately.

### Task 4. The switch, defaulting to today

Add a single named constant selecting the active ordering, defaulting to `current`. Wire it
so `sort-key.ts` CONSULTS it, in a way that is a provable no-op while it reads `current`.

Do NOT introduce an environment variable. The founder's selection mechanism is his own
decision and adding a flag pre-empts it; a named constant in source is honest, greppable
and requires a real commit to change.

**Definition of done.** A test proving that with the constant at `current`, the sort key
returns byte-identical results to task 1's pinned fixtures, and that switching it in the
test to each candidate changes the order in the expected direction. The committed value is
`current`.

---

## 4. Escalate, do not decide

- Any finding that the current ordering is not reproducible as a pure function, which would
  mean `sort-key.ts` depends on state the report cannot see.
- Any temptation to change the committed default, add an env flag, or "improve" the current
  ordering while pinning it.
- A report result so lopsided it seems obviously decisive. Say so in the ledger row and let
  the founder read it; a comparison run by the agent that built it is not a promotion.

---

## 5. What done looks like

Four ledger rows. Typecheck, lint and 26/26 guardrails green, only the pre-existing M-1
violation. A committed default of `current`. And a report the founder can run that answers,
with counts beside every rate, what the board would have looked like had it been ordered on
the engine's own edge instead of on a score measured anti-predictive at the top.
