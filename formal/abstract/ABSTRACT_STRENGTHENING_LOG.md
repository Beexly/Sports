# Strengthening / Refinement-Fixing Log — AbstractClaimExposure

This log records the REAL TLC runs behind `AbstractClaimExposure.tla` and
`LiveModelRefinesAbstract.tla`, following this repo's own methodology
(`formal/INDUCTION_DOCTRINE.md`, `formal/ai-invocation/
INDUCTIVE_STRENGTHENING_LOG.md`): quote every real result verbatim, separate
what actually broke from harmless debris, strengthen/fix against the real
counterexample only.

Two DIFFERENT loops happened here, and they found DIFFERENT things:

1. **The inductive-invariant loop** (`IndInv_alpha`, §1 below) — closed on
   the FIRST candidate, no CTI. Recorded honestly as such.
2. **The refinement-mapping check** (`LiveModelRefinesAbstract.tla`'s
   `AbstractRefinement` property, §2 below) — found a REAL counterexample on
   the first run, fixed by weakening two abstract actions from a
   deterministic to a nondeterministic effect, then closed clean.

---

## 1. `IndInv_alpha` — inductive closure, first candidate closed

**Candidate** (`AbstractClaimExposure.tla`):
```tla
IndInv_alpha ==
    /\ TypeOK
    /\ NeverGE2
    /\ RejectedImpliesBoundAlpha
    /\ AmbiguousHeldImpliesTerminal
```

Unlike the base modules' loops (`ai-invocation`/`credit-budget`, 2-4 CTIs
each), this candidate — TypeOK plus the two properties the task explicitly
required (`NeverGE2`, the abstract form of `AtMostOnePendingPerInvocation`;
`RejectedImpliesBoundAlpha`, the abstract form of `RejectedImpliesBound`)
plus one glue predicate anticipated up front (`AmbiguousHeldImpliesTerminal`,
the abstract form of `AmbiguousExposureHeldUntilTrustedResolution`'s "held"
half) — closed on the FIRST run, with no CTI. This is plausible, not
suspicious: `Next`'s guards were written to make the unsafe classes
UNREACHABLE BY CONSTRUCTION at this abstraction level (no disjunct of `Next`
ever writes the literal `"GE2"`; `ClaimRejectFp` requires `fingerprintBound`
already TRUE as a precondition, so the implication can never break in a
successor), which is exactly the same "guard makes the bad state
structurally unreachable, invariant confirms it" pattern
`InvocationClaim.tla`'s own `AtMostOneExternalDispatchPerAttempt` uses (see
`formal/README.md`'s Module 1 section). No `.attempt1.cfg` /
`.attempt2.cfg` failed-candidate files exist for this reason — there is
nothing to preserve; the loop terminated in one iteration.

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposureInductive.cfg AbstractClaimExposure.tla
```

**Result** — verbatim, full log in `AbstractClaimExposureInductive.tlc-receipt.txt`:
```
Finished computing initial states: 30 distinct states generated
Model checking completed. No error has been found.
97 states generated, 30 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
```

**Base case** (`AbstractClaimExposureInductive.base.cfg`, running the
ORIGINAL `Spec` from `Init` with the same four conjuncts as invariants) —
verbatim, full log in `AbstractClaimExposureInductive.base.tlc-receipt.txt`:
```
Finished computing initial states: 1 distinct state generated
Model checking completed. No error has been found.
40 states generated, 15 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 6.
```

`IndInv_alpha` is inductive (30 candidate states, one-step closure, no
error) and its base case holds over all 15 reachable states. By induction,
`NeverGE2` and `RejectedImpliesBoundAlpha` (and `AmbiguousHeldImpliesTerminal`)
hold in ALL reachable states of `AbstractClaimExposure.tla` at ANY depth —
for this module there are no CONSTANTS to bound, so this is the module's
full, exact state space (72 typed states total; 15 are reachable, 30 satisfy
the candidate).

---

## 2. Refinement-mapping check — a real CTI, found and fixed

**First run** of `LiveModelRefinesAbstract.tla` against the concrete
`LiveModelDispatchUnderAmbiguity.Spec`:
```
java -DTLA-Library=../live-sports:../ai-invocation:../credit-budget \
  -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelRefinesAbstract.cfg LiveModelRefinesAbstract.tla
```

**Result — FAILED.** `Error: Action property ... of module
AbstractClaimExposure is violated` (the `[Next]_vars` action of `Abstract!Spec`
itself — i.e. the step from State 8 to State 9 below could not be explained
by any `AbstractClaimExposure` action, nor was it a stutter). The real
9-state counterexample (verbatim, `attemptOf`/`state`/`attemptOutcome`
columns are the load-bearing ones — full states with every variable are in
git history / reproducible by rerunning):

```
State 7: <DispatchUnderExposureHold(act2,i1,a1)>
  attemptOf   = a1:>i1 @@ a2:>i1 @@ a3:>NoInv
  state       = a1:>HELD @@ a2:>HELD @@ a3:>Unstarted
  attemptOutcome = a1:>Pending @@ a2:>Failed @@ a3:>Pending
  invocationStatus[i1] = Open
    => alpha(i1) = claimPhase OPEN, pendingCountClass ONE, exposurePhase HELD

State 8: <ResolveDispatchOutcome(a1,"Ambiguous")>
  attemptOutcome = a1:>Ambiguous @@ a2:>Failed @@ a3:>Pending   (state unchanged)
  invocationStatus[i1] = Ambiguous
    => alpha(i1) = claimPhase TERMINAL, pendingCountClass ZERO,
                    exposurePhase AMBIGUOUS_HELD
       (matches AbstractClaimExposure!ResolveAmbiguous exactly — fine)

State 9: <TrustedReleaseAmbiguousHold(act1,a1)>
  state       = a1:>RELEASED @@ a2:>HELD @@ a3:>Unstarted        <- a2 STILL HELD
  releaseReason[a1] = TrustedAmbiguousResolution
    => alpha(i1) = claimPhase TERMINAL (unchanged), pendingCountClass ZERO
       (unchanged), exposurePhase HELD   <- NOT "NONE"
```

**Diagnosis.** Attempt `a2` resolved `Failed` back in state 6 but was NEVER
separately released (`ReleaseOnCleanFailure(a2)` never fired in this
behavior) — its credit hold (`state[a2]`) stayed `"HELD"` the whole time,
concurrently with `a1` going `Pending -> Ambiguous -> RELEASED`. This is
legal in the concrete composed spec: `Settle`/`Release` are actions fully
decoupled from `Resolve`, so a resolved-but-unsettled hold can sit
indefinitely while a LATER, unrelated attempt on the SAME invocation is
dispatched, goes ambiguous, and has ITS hold trusted-released. My original
`TrustedReleaseAmbiguous` action (and `ClearHeldExposure`, the same class of
bug) assumed clearing the hold this action targets always drops
`exposurePhase` all the way to `"NONE"` — true only when it was the LAST
HELD attempt for the invocation. Here `a2`'s stale hold survives `a1`'s
release, so `AlphaExposurePhase` (an existential over ALL of the
invocation's attempts, recomputed fresh every state — see
`LiveModelRefinesAbstract.tla`'s header) correctly re-reads `"HELD"`, not
`"NONE"`, and the deterministic abstract action could not explain it.

**Fix — the doctrine's escalation ladder, applied in order:**
1. **Pure state function, weakened action** (tried first, per doctrine
   §"prefer a pure state function first"): `AlphaExposurePhase` itself
   needed NO change — it was already correct, recomputed fresh from current
   concrete state with no memory of the past. The bug was in
   `AbstractClaimExposure!Next`'s over-strong DETERMINISTIC effect. Fix: both
   `ClearHeldExposure` and `TrustedReleaseAmbiguous` now specify
   `exposurePhase' \in {"NONE", "HELD"}` (nondeterministic — this
   abstraction does not track enough per-attempt detail to know which of
   the two outcomes actually occurs, so both are exposed as legal
   possibilities) instead of forcing `exposurePhase' = "NONE"`. This is
   still a PURE STATE FUNCTION mapping on the `LiveModelRefinesAbstract.tla`
   side — nothing there changed at all; only the ABSTRACT spec's `Next`
   relation (which the refinement mapping must merely be A REFINEMENT OF,
   not equal to) was weakened to admit the outcome the concrete spec can
   actually produce.
2. History variable — NOT NEEDED. `AlphaExposurePhase` never needed to
   remember anything about the past; the fix was entirely in the abstract
   `Next` relation's effect, not in alpha.
3. Stuttering variable — NOT NEEDED. No concrete action spans more than one
   abstract action's worth of alpha-change; `TrustedReleaseAmbiguousHold`
   maps to exactly one `AbstractClaimExposure` action step (now
   nondeterministic in its effect, but still one step).
4. Prophecy variable — NOT NEEDED. Nothing in alpha depends on a future
   choice.

**Re-run after the fix:**
```
java -DTLA-Library=../live-sports:../ai-invocation:../credit-budget \
  -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelRefinesAbstract.cfg LiveModelRefinesAbstract.tla
```

**Result — verbatim, full log in `LiveModelRefinesAbstract.tlc-receipt.txt`:**
```
Model checking completed. No error has been found.
1306029 states generated, 323194 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 21.
```

No error: every step of every behavior TLC generated from the concrete
`LiveModelDispatchUnderAmbiguity.Spec`, at the checked bound, is explained by
the fixed `AbstractClaimExposure.Next` relation (or is a stutter at the
abstract level) through the explicit `alpha` state functions in
`LiveModelRefinesAbstract.tla`.

**Note on what this weakening costs.** `AbstractClaimExposure`'s `Next` is
now intentionally slightly LESS PRECISE than the tightest description of the
5-variable domain's true dynamics would be (a fully precise model would need
to track "is there another stale HELD attempt", which is exactly the
per-attempt detail this abstraction deliberately drops) — an
over-approximation, in the same spirit as `IndInv_alpha` itself being a
deliberate over-approximation of reachability (see
`INDUCTION_DOCTRINE.md` §4's "weakest workable envelope, not the strongest
truth"). `IndInv_alpha`'s conjuncts (`NeverGE2`,
`RejectedImpliesBoundAlpha`, `AmbiguousHeldImpliesTerminal`) all still hold
unchanged after this fix (reverified — see §1's receipts, generated AFTER
this fix was applied) because none of them constrain `exposurePhase`'s HELD
vs NONE distinction on its own.
