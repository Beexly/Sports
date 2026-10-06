# Signal registry for `buildIndependentFairValues`, design

Status: DESIGN, not implemented. Founder decision required before any code moves.
Subject: `packages/ingestion-pipeline/src/build-independent-fair-values.ts` (668 lines).
Constraint accepted up front: **byte-identical output, no MODEL_VERSION bump.**

## Why this is not a mechanical refactor

The obvious reading is "nine independent models in one long function, lift each
into a registry row." Read that way the refactor is a weekend of work and it
would be wrong. Four properties of the current code are load bearing, and three
of them are invisible unless you read the control flow rather than the branch
list.

### 1. One branch is NOT independent, it is downstream of another

`matchupLambdas` is declared before branch 5 and written ONLY inside it, by the
Dixon-Coles arm or the Poisson arm. Branch 5b (`skellam_cover`) is gated on
`matchupLambdas &&` and consumes both lambdas.

So `skellam_cover` is not a tenth independent opinion. It is a second question
(does this side cover) asked of the SAME fitted rates. A flat registry of
independent producers cannot express that, and a registry that ran 5b without 5
would either crash or silently emit nothing. Any registry needs an explicit
DEPENDS-ON edge, and the runner must be a small DAG, not a list.

This also matters for the blend: a naive registry that treats `skellam_cover` as
independent of `dixon_coles` counts one rate model twice.

### 2. The mutual exclusion inside branch 5 is an anti-phantom-consensus rule

Soccer emits Dixon-Coles ONLY. The comment says why: Dixon-Coles is the same
lambda as Poisson plus a low-score correction, so emitting both "would
double-count one rate model in the independent blend and fake consensus."
Hockey and baseball keep independent Poisson.

That is exactly the multicollinearity defect AGENTS.md records from the registry
blueprint critique: agreement must be computed across distinct signal FAMILIES
clustered by shared data dependencies, never across a raw count of signals. The
current code already enforces it, by hand, in one branch. **A registry must
encode this as a first-class family constraint, or the refactor will quietly
delete a correctness property that exists today.** This is the single biggest
risk in the whole change.

### 3. Three different gate KINDS are collapsed into one `if`

They are not interchangeable and a registry row needs all three as separate
fields:

| kind | example | semantics |
|---|---|---|
| network | `skipNetworkIndependents` on 2,3,4,6,8,9 | offline/test suppression. NOT on 5 or 7, which read the database |
| rights | `isEspnPowerIndexCleared(env)` on 3 | fail-closed licence gate. Founder-only, never flipped by an agent |
| already-supplied | `!input.prefetched?.some(f => f.source === "kalshi")` on 2,4,8 | dedup by source against caller-supplied values |

Flattening these into one boolean would let an offline test accidentally satisfy
a rights gate. Keep them distinct.

### 4. Soft-fail is doctrine, not sloppiness

Branches 5 and 7 wrap in `try {} catch {}` and emit nothing. The comment reads
"Soft-fail: null opinion is honest." This matches the conviction gate's rule: a
signal that throws is silent, never evidence, and absence is never read as
agreement, disagreement or zero. A registry runner must preserve per-row
isolation so one throwing producer cannot take down the slate, and must never
substitute a default.

## What the registry row therefore has to carry

    { source, family, dependsOn?, requires: { network?, rights?, sports? },
      excludedBy?, produce(ctx) }

- `family` drives the agreement/consensus computation and is what prevents
  phantom consensus. `dixon_coles`, `poisson` and `skellam_cover` are ONE family.
- `dependsOn` lets `skellam_cover` read the lambdas without being re-fitted.
- `excludedBy` expresses "soccer takes Dixon-Coles instead of Poisson".
- `produce` returns a value or null. Throwing is caught by the runner and
  recorded as absence.

## How byte-identical output is proved, not asserted

Output order is positional and callers may depend on it, so the runner emits in
declared order and the declared order is the current branch order: prefetched,
kalshi, fpi, clubelo, dixon_coles/poisson, skellam_cover, mlb_standings, elo,
polymarket, nfl_epa.

Proof obligation before this lands, and it is not optional:

1. A differential harness that runs the OLD function and the NEW runner over the
   same recorded inputs and asserts deep equality of the full array, including
   order and `capturedAt`. `now` is already injectable, so the timestamp is
   controllable rather than a source of spurious diff.
2. The corpus must include, at minimum: a soccer fixture (proves Dixon-Coles
   fires and Poisson does NOT), a hockey or baseball fixture (proves Poisson
   fires), a fixture with `spreadHome` present and absent (proves 5b gates), a
   fixture with prefetched kalshi (proves dedup), a fixture with the rights gate
   unset (proves fail-closed), and a fixture where one producer throws (proves
   isolation).
3. Any diff is a STOP, not a reconciliation. The point of the exercise is that
   the numbers do not move.

## What this design does NOT do

It does not add a signal, change a weight, alter a probability, or touch
MODEL_VERSION. It does not make the blend read more sources. Adding conviction is
a scoring change that needs its own bump and calibration pass. This is a
restructure whose success condition is that nothing observable changes.

## Open question for the founder

AGENTS.md records a tension: a blueprint capped ACTIVE signals at 17 across six
families while the ask was for hundreds. The honest shape is many DECLARED rows,
most blocked behind a named acquisition task and owner, with a small orthogonal
set carrying weight. This registry makes that shape expressible, because a
blocked row is just a row whose `requires` is unmet and whose blocker is named.
It does not settle what the right ceiling is. That is empirical and the
historical backtest corpus is what answers it. 17 is a number from a design
document, not a measurement.
