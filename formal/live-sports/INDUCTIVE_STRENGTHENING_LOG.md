# Inductive Strengthening Log — LiveModelDispatchUnderAmbiguity (composed)

This log records the REAL counterexample-to-induction (CTI) loop that produced
`IndInv` in `LiveModelDispatchUnderAmbiguityInductive.tla`, the COMPOSED module
that instantiates both base specs (`IC == INSTANCE InvocationClaim`,
`CR == INSTANCE CreditReservation`). Every TLC run below was actually executed;
every CTI state is quoted verbatim from TLC's output. The failed candidate is
kept in the module (as `IndInvAttempt1`) with its `.cfg` file and its own
receipt (`*.attempt1.tlc-receipt.txt`), so each logged run can be reproduced
exactly. Method and discipline are identical to the two prior single-module
logs (`../ai-invocation/INDUCTIVE_STRENGTHENING_LOG.md`,
`../credit-budget/INDUCTIVE_STRENGTHENING_LOG.md`) and the doctrine in
`../INDUCTION_DOCTRINE.md`: candidate as INIT predicate, TLC enumerates the full
candidate state set, one-step-closure check; weakest general blocking predicate
per CTI.

**Compositional, not flattened (doctrine §7).** The candidate is NOT a fresh
flat invariant re-derived over the 12-variable product state space. It is the
LIFTED conjuncts of each base module's already-proven `IndInv` — the
invocation-plane `IndInv`
(`TypeOK` + 5 safety properties + `AtMostOnePendingPerInvocation` +
`RejectedImpliesBound`) and the credit-plane `IndInv`
(`TypeOKFinite` + 2 safety properties + `AdmittedCountBoundedByStarted` +
`CommittedCoveredByReserved`) — conjoined with the four cross-module GLUE
invariants the composed spec already states, and strengthened only where the
composition itself opens a new induction gap. Exactly one such gap was found and
closed (`InflightImpliesHeld`): the wire between the credit hold and the
provider dispatch that neither base module alone contains.

**TLC-only, honest scope.** As in the two base modules and per doctrine §8:
neither Apalache nor TLAPS is available in this environment, so this is
finite-constants TLC induction, NOT a parameterized proof over all constants.
The claim is bounded to the constants below.

## Constants: a documented shrink

The CTI loop and both closure/base receipts run at

```
Invocations = {i1}, Attempts = {a1,a2}, Fingerprints = {fp1},
Actors = {act1,act2}, TrustedActors = {act1}, VerifiedBalance = 1, RequestCost = 1
```

— a shrink of the reachability model `LiveModelDispatchUnderAmbiguity.cfg`
(`Invocations = {i1,i2}`, `Attempts = {a1,a2,a3}`, `Fingerprints = {fp1,fp2}`,
`VerifiedBalance = 2`). Reason, same shape as the invocation-plane log's
2-attempt shrink but more acute here: the composed state has **12 variables**
(the invocation plane's 7 + the credit plane's `reserved,state,admittedCount`
+ this module's new `releaseReason,releaseBy`), and TLC computes INIT-predicate
enumerations single-threaded. The five extra variables multiply the raw
`TypeOKFinite` product by ~10^4 over the invocation plane's, putting the full
reachability bound at ~10^11 raw candidate states — not enumerable here. At the
shrunk bound the candidate's distinct-initial-state set is ~5.8M (attempt 1),
enumerated in ~30 min single-threaded; that is already at the edge of a workable
iteration and is why the loop did not run at a larger bound.

What the shrink KEEPS — every interference class the COMPOSITION adds:

- **credit contention**: `VerifiedBalance = 1 < 2` attempts forces a REFUSED
  authorization on every maximal run (same contention shape the base
  `CreditReservation.cfg` uses), exercising `NeverOverAdmit` /
  `CommittedCoveredByReserved` under the composed `Next`;
- **invocation sequential-walk**: 2 attempts on 1 invocation exercise the
  two-in-flight class that `AtMostOnePendingPerInvocation` guards;
- **exposure-hold wiring**: the `DispatchUnderExposureHold` → resolve →
  settle/clean-release/trusted-release lifecycle and the ambiguous-hold glue,
  which is the whole point of the composed module.

What it does NOT re-exercise: the **fingerprint-conflict** class (1 fingerprint
makes `SameIdDifferentFingerprintNeverExecutes` / `RejectedImpliesBound`
vacuous). That class is fully proved inductive already in
`../ai-invocation/InvocationClaimInductive.tla` at 2 fingerprints, and the
composition adds no fingerprint interaction — the lifted conjuncts are carried
and checked here, just trivially. This is the honest boundary of the composed
receipt, stated rather than papered over.

---

## Attempt 1 — lifted base IndInvs + the composed spec's stated glue: NOT inductive (CTI #1)

**Candidate** (`IndInvAttempt1`): `TypeOKFinite` + the 7 lifted invocation-plane
conjuncts + the 4 lifted credit-plane conjuncts + the four cross-module glue
invariants the composed spec already states
(`AmbiguousExposureHeldUntilTrustedResolution`,
`ReservedNeverExceedsBudgetWindowCap`, `AvailableBudgetNeverNegative`,
`NoDispatchWithoutExposureHold`). No composition-specific glue added yet.

**Run**
```
java -cp "tla2tools.jar:../ai-invocation:../credit-budget" tlc2.TLC \
  -workers auto -deadlock \
  -config LiveModelDispatchUnderAmbiguityInductive.attempt1.cfg \
  LiveModelDispatchUnderAmbiguityInductive.tla
```

**Result** — 5,845,284 distinct candidate states enumerated, then (verbatim,
full output in `LiveModelDispatchUnderAmbiguityInductive.attempt1.tlc-receipt.txt`):

```
Error: Invariant AmbiguousExposureHeldUntilTrustedResolution is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\ invocationFp = (i1 :> fp1)
/\ claimOwner = (i1 :> act1)
/\ releaseReason = (a1 :> "NotReleased" @@ a2 :> "NotReleased")
/\ invocationStatus = (i1 :> "Open")
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)
/\ state = (a1 :> "Unstarted" @@ a2 :> "Unstarted")
/\ admittedCount = 0
/\ attemptOutcome = (a1 :> "Pending" @@ a2 :> "Succeeded")
/\ releaseBy = (a1 :> act1 @@ a2 :> act1)
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ reserved = 0
/\ rejectedRequests = {}

State 2: <ResolveDispatchOutcome(a1,"Ambiguous") line 126, col 5 to line 127, col 77 of module LiveModelDispatchUnderAmbiguity>
/\ invocationFp = (i1 :> fp1)
/\ claimOwner = (i1 :> act1)
/\ releaseReason = (a1 :> "NotReleased" @@ a2 :> "NotReleased")
/\ invocationStatus = (i1 :> "Ambiguous")
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)
/\ state = (a1 :> "Unstarted" @@ a2 :> "Unstarted")
/\ admittedCount = 0
/\ attemptOutcome = (a1 :> "Ambiguous" @@ a2 :> "Succeeded")
/\ releaseBy = (a1 :> act1 @@ a2 :> act1)
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ reserved = 0
/\ rejectedRequests = {}
```

**Diagnosis.** State 1 has attempt `a1` IN FLIGHT on invocation `i1`
(`attemptOf[a1] = i1`, `attemptOutcome[a1] = "Pending"`) while its credit
`state[a1] = "Unstarted"` — it never took a HELD reservation. Unreachable in the
composed system: `DispatchUnderExposureHold`'s `state[att] = "HELD"` guard makes
an in-flight attempt with `state = "Unstarted"` impossible to create. But no
conjunct of the lifted candidate says so — the invocation plane's lifted
conjuncts constrain `attemptOf`/`attemptOutcome` but know nothing about the
credit `state` variable (it does not exist in `InvocationClaim`), and the credit
plane's lifted conjuncts constrain `state`/`reserved` but know nothing about
`attemptOf`. The gap is exactly at the composition seam. `ResolveDispatchOutcome(a1,
"Ambiguous")` (whose only guards are `attemptOf[a1] # NoInv` and
`attemptOutcome[a1] = "Pending"`, both satisfied) then freezes `a1` Ambiguous
with `state[a1] = "Unstarted"` — an Ambiguous exposure that is neither HELD nor
trusted-released, violating `AmbiguousExposureHeldUntilTrustedResolution`.

(The CTI also carries unreachable debris the candidate harmlessly tolerates —
e.g. `attemptOutcome[a2] = "Succeeded"` while `state[a2] = "Unstarted"`,
`dispatched[a1] = FALSE` for an attempt that is Pending-on-`i1`. None of that is
what breaks the step; only the in-flight-but-not-HELD core matters, and the
strengthening targets exactly it.)

**Strengthening decision.** Predicates that block the class, strongest first:

1. `attemptOf[att] # NoInv => state[att] \in {"HELD","SETTLED","RELEASED"}`
   — the full reachable truth (any dispatched attempt was authorized and is in
   some post-Authorize credit state). STRONGER than needed: it also constrains
   attempts whose outcome has already resolved (Succeeded/Failed/Ambiguous),
   which the violated property does not need — once an outcome is non-Pending,
   `ResolveDispatchOutcome` can no longer fire on it, so its credit state is
   irrelevant to this CTI class.
2. `(attemptOf[att] # NoInv /\ attemptOutcome[att] = "Pending") => state[att] = "HELD"`
   — constrains ONLY in-flight-AND-still-Pending attempts (the exact
   precondition of a `ResolveDispatchOutcome` step), and only to `"HELD"` (the
   exact credit state `AmbiguousExposureHeldUntilTrustedResolution` needs at the
   instant an outcome becomes Ambiguous).

Chosen: **(2) `InflightImpliesHeld`**, the weaker. It is the invariant form of
`DispatchUnderExposureHold`'s `state[att] = "HELD"` guard — the composition's
one new wire between the credit ledger and the dispatch plane — and it is
preserved on its own:

- `DispatchUnderExposureHold(_, _, att)` is the only action that makes an
  attempt in-flight-and-Pending, and it fires only from `state[att] = "HELD"`;
- `ResolveDispatchOutcome(att, _)` moves `attemptOutcome[att]` off `"Pending"`,
  so the antecedent falls away for `att`;
- `AuthorizeExposure(t)` fires only on `state[t] = "Unstarted"`, which
  `InflightImpliesHeld` already forces to be not-in-flight-or-not-Pending, so it
  cannot manufacture a violation;
- `SettleOnConfirmedCharge` / `ReleaseOnCleanFailure` /
  `TrustedReleaseAmbiguousHold` all fire only on a non-Pending outcome
  (Succeeded / Failed / Ambiguous respectively), leaving the antecedent false
  for the attempt they touch.

Option (1) would also close the induction but pins credit state for
already-resolved attempts that the target properties never depend on — rejected
per the weakest-predicate preference (doctrine §4).

---

## Attempt 2 — + InflightImpliesHeld: INDUCTIVE

**Candidate (final)**
```tla
IndInv ==
    /\ IndInvAttempt1          \* TypeOKFinite + 11 lifted base conjuncts
                               \*   + 4 composed-spec glue invariants
    /\ InflightImpliesHeld     \* the one composition-seam glue conjunct
```

**Run**
```
java -cp "tla2tools.jar:../ai-invocation:../credit-budget" tlc2.TLC \
  -workers auto -deadlock \
  -config LiveModelDispatchUnderAmbiguityInductive.cfg \
  LiveModelDispatchUnderAmbiguityInductive.tla
```

**Result** — verbatim, full output in
`LiveModelDispatchUnderAmbiguityInductive.tlc-receipt.txt`:

```
Finished computing initial states: 4635468 distinct states generated at 2026-07-23 01:14:18.
Model checking completed. No error has been found.
10039464 states generated, 4635468 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
Finished in 08min 31s at (2026-07-23 01:14:39)
```

All 4,635,468 states satisfying `IndInv` were enumerated; every successor
satisfies every conjunct. Search depth 1 = one-step closure (every successor was
already in the initial, i.e. `IndInv`, state set). `InflightImpliesHeld` pruned
~1.2M of attempt 1's candidate states (5,845,284 → 4,635,468), exactly the
in-flight-but-not-HELD class CTI #1 exploited.

**Base case.** `LiveModelDispatchUnderAmbiguityInductive.base.tlc-receipt.txt`:
the ORIGINAL composed `Spec` (inherited via `EXTENDS`) with all 17 conjuncts of
`IndInv` as invariants — `No error has been found` over all 155 reachable states
at these constants. Initial states are reachable, so this subsumes the induction
base case `Init => IndInv` and confirms the lifted auxiliaries and the new
`InflightImpliesHeld` glue are reachable truths, not vacuous strengthening.

**What is now proved** (for the constants above): `Init => IndInv`,
`IndInv /\ [Next]_vars => IndInv'`, and `IndInv =>` each composed safety
property (all conjuncts) — `AmbiguousExposureHeldUntilTrustedResolution`,
`ReservedNeverExceedsBudgetWindowCap`, `AvailableBudgetNeverNegative`,
`NoDispatchWithoutExposureHold`, and the re-exported base invariants
`BaseLedgerNeverExceedsBalance` / `BaseNeverOverAdmit` /
`BaseAmbiguousAttemptStopsFallback`. By induction all hold in ALL reachable
states of the COMPOSED system at ANY depth — strictly stronger than a bounded
reachability check. NOT a parameterized proof over all constants (needs Apalache
or TLAPS, neither available here).

---

## Iteration summary

| Attempt | Candidate | Distinct init states | Outcome |
|---|---|---|---|
| 1 | TypeOKFinite + 11 lifted base conjuncts + 4 composed-spec glue invariants | 5,845,284 | CTI #1: in-flight-but-not-HELD attempt; resolving it Ambiguous makes a non-HELD, non-trusted-released Ambiguous exposure |
| 2 | + InflightImpliesHeld | 4,635,468 | **Inductive** — no error found, depth 1 |

One CTI, one weakest-blocking-predicate (`InflightImpliesHeld`) — the single
composition-seam glue conjunct that neither base module's `IndInv` could contain
(each base module lacks the other's variables). The lifted base conjuncts
transferred through the instantiation substitution unchanged and generated no
CTI of their own, which is the compositional-induction result the doctrine's §7
anticipated: prove the pieces, lift them, and strengthen only the glue.
