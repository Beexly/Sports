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

### The mechanism, and what each lever actually costs

The founder named the two obvious levers on 2026-09-18. Both were traced to their call
sites before this queue was updated. Neither one is the cheap fix, and one of them is not a
fix at all.

**Lever 1, "`sort-key.ts` stops reading `rankingP`", is a no-op that trends worse.** The
next link in the chain is `rankingScore` (`sort-key.ts:24-27`), and `rankingScore` is
`Math.round(rankingP * 100)` (`ranking-prob.ts:104`): the same number, coarsened to two
decimal places. The link after THAT is raw `confidence`, the anti-predictive one. Removing
the `rankingP` branch changes nothing on any row carrying `rankingScore`, and degrades the
rest.

**Lever 2, `independentWeight` to 1.0, is the right arithmetic, is the expensive lever, and
does not finish the job.** The weight is passed at exactly two places, both in the mint
path: `packages/prediction-engine/src/scoring.ts:607` and `:1211`. That makes it a
generation change rather than a display change. `constants.ts:18` names `independentWeight
0.7` as part of the deployed version's contract, so it sits behind a `MODEL_VERSION` bump
and law 3, and it is forward-only: every row already minted keeps its 0.7 blend in
`factorBreakdown.rankingP` forever. Then, after all of that, confidence still orders the
board, because when `trueProb` is absent or non-finite `deriveRankingProbability` returns
`confP` and stamps `source: "confidence"` (`ranking-prob.ts:76-83`), on the same 0 to 1
scale as every priced row.

**That last sentence is the actual mechanism.** The defect is not only that confidence sits
inside the blend at 30 percent. It is that a PRICED row and an UNPRICED row are compared on
one scalar, so a confidence 91 row no independent model ever looked at outranks a `trueProb`
0.62 row that one did. The measured inversion above is that collision, stated structurally.

**The discriminator is already persisted, at zero cost.** `scoring.ts:706` and `:1300` write
`rankingSource` into the factor breakdown beside `rankingP`, one of `confidence`,
`independent_trueProb` or `blend_indep_conf`, and `:611` and `:1215` write
`independentEdge.priced`. A comparator reading `rankingSource` separates the two populations
with no engine edit, no `MODEL_VERSION` bump, no new capture and no backfill. `sort-key.ts`
is display only: eight read call sites (`api/picks`, `lib/board/state.ts`,
`api/v1/probabilities`, `api/admin/dashboard`, `cockpit`, `cockpit/brief`, `dashboard`,
`preview`), zero mint sites. Task 2 carries it as a fourth candidate ordering.

Two unpriced populations this catches that no weight change can reach: the TOTAL path never
calls `deriveRankingProbability` and hardcodes `rankingP` to `confidence / 100`
(`scoring.ts:950`, `:966`), and any row minted before v5.2.1 carries no `rankingSource` at
all. Both interleave with priced rows today.

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

- **Do not change `sort-key.ts` or `ranking-prob.ts` BEHAVIOUR.** Not the default weight,
  not the fallback chain, not the key order.
- **Task 4 is the sole exception to editing those files at all**, and it exists so the
  switch has somewhere to live. It may edit `sort-key.ts` source to consult the switch,
  provided every existing call site's return value is byte-identical while the switch reads
  `current`. An earlier draft of this section forbade touching the file outright, which
  contradicted task 4 and would have sent a literal-minded runner to BLOCKED on its own
  queue. Behaviour is frozen; the file is not.
- **Do not touch a database.** Law 7. The report runs from a loader that is INJECTED, and
  your tests supply a fake. The founder runs it against real data, not you.
- **No env flag, no gate, no schema, no published number, no `MODEL_VERSION`.** The switch
  this queue introduces defaults to the current behaviour and only the founder moves it.
- **`@sports/types` is the boundary.** Anything `apps/web` and `packages/*` both need goes
  there. A new import from `@sports/prediction-engine` into `apps/web/lib/board/state.ts`
  or the picks route resolves to `undefined` under the 22 partial mocks and collapses the
  board.
- **Caveat, measured, because this document has repeated the claim too confidently:**
  `@sports/types` is crossed intact almost everywhere, but TWO test files partially mock it
  with a bespoke factory and no `importActual`, `apps/web/__tests__/api-p9-05-rate-limit.test.ts`
  and `apps/web/lib/gse-stats/__tests__/session-tier.test.ts`. After task 4 lands, run those
  two specifically as well as the engine-mock list.
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
mark this row DONE citing that SHA and move on. Do not do it twice. The reciprocal note
belongs on mainline task 3 as well: if the ranking queue got there first, cite its SHA.

**Definition of done.** Four cases, all green against today's code.

### Task 2. The candidate orderings, as pure functions

Build `packages/types/src/ranking-candidates.ts`. Pure, no I/O, no database.

Three orderings, each a comparator over a minimal row shape carrying `expectedClv`,
`trueProb`, `marketFairProb`, `rankingP`, `confidence` and a recency stamp:

- `orderingCurrent`: reproduces today's fallback chain exactly. **Include `isFeatured` in
  the row shape and apply the pin-first rule**, because the live comparator sorts featured
  rows ahead of everything else (`sort-key.ts:36,42,46`) and a baseline missing that is not
  the current ordering. If you deliberately scope it to the fallback chain only, say so in
  the function's doc comment rather than claiming exact reproduction.
- `orderingEdgeFirst`: descending `expectedClv` among rows with a finite positive value;
  ties broken by `trueProb` minus `marketFairProb`, then recency. **Rows without a finite
  positive `expectedClv` trail as a block, in their current relative order.**
- `orderingModelMinusMarket`: descending `trueProb` minus `marketFairProb`; same trailing
  rule.
- `orderingPricedTierFirst`: a two-tier sort that never compares a priced row against an
  unpriced one. Tier 1 is every row whose `rankingSource` is `independent_trueProb` or
  `blend_indep_conf`, ordered among themselves by `rankingP` descending. Tier 2 is every
  other row, meaning `rankingSource` of `confidence`, absent, or unparseable, held in their
  current relative order. Tier 1 always precedes tier 2. Add `rankingSource` to the row
  shape for it. **Report this one first in task 3**, because it is the only candidate that
  needs no engine edit and no `MODEL_VERSION` bump, so it is the only one the founder can
  act on the same day.

Every one is total and stable: equal rows keep their input order, so a comparison never
reports a difference that is really just sort instability.

**Also export it from the barrel, in this same commit.** `packages/types`'s `main` is
`./src/index.ts` and everything crossing the boundary goes through it. A module that is not
re-exported there is unreachable from `apps/web`, and this task's own test would still pass
because it imports the file directly. Add `export * from "./ranking-candidates.js";` to
`packages/types/src/index.ts`.

**Definition of done.** `packages/types/src/__tests__/ranking-candidates.test.ts` proving
each comparator is total, stable and antisymmetric; a test that the symbols are reachable
through the package barrel, not only by direct path; that `orderingCurrent` reproduces
`sort-key.ts` on a fixture set including every fallback case; that a row with a null
`expectedClv` trails rather than sorting as zero; and that `orderingPricedTierFirst` never
places an unpriced row above a priced one on a fixture where the unpriced row carries the
highest `confidence` on the board, which is the live inversion in section 0.

### Task 3. The shadow comparison report

Build `scripts/ops/ranking-shadow-report.ts`, with its test beside it and an
`ops:ranking-shadow` entry in the root `package.json` scripts, matching the convention of
the existing tools in `scripts/ops/`. It takes settled rows through an INJECTED loader and,
per slate, computes each ordering, then reports:

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
