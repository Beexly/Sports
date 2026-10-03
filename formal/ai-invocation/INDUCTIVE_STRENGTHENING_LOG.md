# Inductive Strengthening Log — InvocationClaim

This log records the REAL counterexample-to-induction (CTI) loop that produced
`IndInv` in `InvocationClaimInductive.tla`. Every TLC run below was actually
executed; every CTI state is quoted verbatim from TLC's output. Failed
candidates are kept in the module (as `IndInvAttempt1`, `IndInvAttempt2`) with
their `.cfg` files, so each logged run can be reproduced exactly. Method and
strengthening discipline are the same as in
`../credit-budget/INDUCTIVE_STRENGTHENING_LOG.md` (candidate as INIT predicate,
TLC enumerates the full candidate state set, one-step closure check; weakest
general blocking predicate per CTI).

## Constants: a documented shrink

The CTI loop and the closure receipts run at
`Invocations = {i1,i2}`, `Attempts = {a1,a2}`, `Fingerprints = {fp1,fp2}`,
`Actors = {act1,act2}` — 2 attempt ids instead of the reachability model's 3
(`InvocationClaim.cfg`). Reason, with measured numbers: TLC computes
INIT-predicate enumerations single-threaded. This spec has 7 variables; the raw
TypeOK product is

- 2 attempts: `9 * 9 * 4 * 9 * 16 * 9 * 16 = ~6.7M` candidate states —
  enumerated in ~50s per attempt (observed across the three runs below);
- 3 attempts: `9 * 9 * 8 * 27 * 64 * 9 * 16 = ~161M` candidate states — ~24x,
  i.e. ~20 minutes of single-threaded enumeration per CTI iteration before
  the (parallel) closure check even starts.

Fast iterations are what make a strengthening loop workable, so the loop ran
at 2 attempts. Two attempts still exercise both interference classes that
matter for these properties: a second in-flight attempt on the same
invocation (CTI #1) and per-id fingerprint conflict (CTI #2). A separate
3-attempt closure run of the final candidate was executed afterwards — see
"Original-constants run" at the end of this log and the receipt file.

---

## Attempt 1 — safety properties alone: NOT inductive (CTI #1)

**Candidate**
```tla
IndInvAttempt1 ==
    /\ TypeOK
    /\ AtMostOneClaimOwner
    /\ AtMostOneExternalDispatchPerAttempt
    /\ DispatchAssignmentStable
    /\ SameIdDifferentFingerprintNeverExecutes
    /\ AmbiguousAttemptStopsFallback
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config InvocationClaimInductive.attempt1.cfg InvocationClaimInductive.tla
```

**Result** — 1,815,552 distinct candidate states enumerated, then:

```
Error: Invariant AmbiguousAttemptStopsFallback is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\ attemptOutcome = (a1 :> "Pending" @@ a2 :> "Pending")
/\ invocationStatus = (i1 :> "Open" @@ i2 :> "Ambiguous")
/\ rejectedRequests = {<<i1, fp2>>}
/\ invocationFp = (i1 :> fp1 @@ i2 :> fp1)
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ claimOwner = (i1 :> act1 @@ i2 :> act1)
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)

State 2: <Resolve(a1,"Ambiguous") line 162, col 5 to line 172, col 86 of module InvocationClaim>
/\ attemptOutcome = (a1 :> "Ambiguous" @@ a2 :> "Pending")
/\ invocationStatus = (i1 :> "Ambiguous" @@ i2 :> "Ambiguous")
/\ rejectedRequests = {<<i1, fp2>>}
/\ invocationFp = (i1 :> fp1 @@ i2 :> fp1)
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ claimOwner = (i1 :> act1 @@ i2 :> act1)
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)
```

**Diagnosis.** State 1 carries BOTH attempts `Pending` on invocation `i1`.
Unreachable — `Dispatch`'s "no other attempt outstanding for this invocation"
guard (the sequential provider-route walk) forbids ever creating it — but no
conjunct of the candidate says so, so the state is admitted as a starting
point. `Resolve(a1, "Ambiguous")` then freezes `i1` while `a2` is still in
flight: exactly a violation of `AmbiguousAttemptStopsFallback`. This is the
unreachable-side mirror of the genuine bug found during the spec's original
development (preserved verbatim in
`InvocationClaim.counterexample-found-during-development.txt`): there, a
missing guard made the two-in-flight state actually reachable; here, the
guard exists but the induction candidate lacks the matching invariant. (The
CTI also contains unreachable debris that is NOT what breaks the step —
e.g. `dispatched = FALSE` for an attempt that is `Pending` on `i1`, and `i2`
`Ambiguous` with an active claim owner. Only the two-in-flight core matters;
the strengthening targets it and leaves the harmless debris inside the
candidate.)

**Strengthening decision.** Blocking predicates considered, strongest first:

1. `Cardinality(PendingAttemptsOf(inv)) <= 1` restricted to `Open`
   invocations only — TOO WEAK, and rejected for a precise reason: a
   `Terminal` invocation carrying two phantom `Pending` attempts would still
   satisfy it, and `Resolve(att, "Ambiguous")` on one of them produces the
   same violation. The cap must range over invocations of every status.
2. `AtMostOnePendingPerInvocation == \A inv : Cardinality(PendingAttemptsOf(inv)) <= 1`
   — the invariant form of `Dispatch`'s sequential-walk guard, over all
   invocations.

Chosen: **(2) `AtMostOnePendingPerInvocation`**. It is the weakest form that
blocks the whole class (option 1 demonstrates why weakening further reopens
it), and it is preserved on its own: `Dispatch` admits a new `Pending` attempt
only when the invocation has none, `Resolve` only shrinks the in-flight set,
and no other action touches `attemptOf`/`attemptOutcome`.

---

## Attempt 2 — + AtMostOnePendingPerInvocation: NOT inductive (CTI #2)

**Candidate**
```tla
IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ AtMostOnePendingPerInvocation
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config InvocationClaimInductive.attempt2.cfg InvocationClaimInductive.tla
```

**Result** — 1,787,904 distinct candidate states enumerated (the new conjunct
excluded 27,648 of attempt 1's states), then:

```
Error: Invariant SameIdDifferentFingerprintNeverExecutes is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\ attemptOutcome = (a1 :> "Pending" @@ a2 :> "Succeeded")
/\ invocationStatus = (i1 :> "Open" @@ i2 :> "Open")
/\ rejectedRequests = {<<i1, fp2>>, <<i2, fp2>>}
/\ invocationFp = (i1 :> fp1 @@ i2 :> "NoFp")
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ claimOwner = (i1 :> act1 @@ i2 :> "NoOwner")
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)

State 2: <ClaimOwner(act1,i2,fp2) line 98, col 5 to line 111, col 76 of module InvocationClaim>
/\ attemptOutcome = (a1 :> "Pending" @@ a2 :> "Succeeded")
/\ invocationStatus = (i1 :> "Open" @@ i2 :> "Open")
/\ rejectedRequests = {<<i1, fp2>>, <<i2, fp2>>}
/\ invocationFp = (i1 :> fp1 @@ i2 :> fp2)
/\ dispatched = (a1 :> FALSE @@ a2 :> FALSE)
/\ claimOwner = (i1 :> act1 @@ i2 :> act1)
/\ attemptOf = (a1 :> i1 @@ a2 :> i1)
```

**Diagnosis.** State 1 has `<<i2, fp2>>` recorded in `rejectedRequests` while
`i2` is still UNBOUND (`invocationFp[i2] = "NoFp"`). Unreachable — `ClaimOwner`
only records a rejection in its already-bound-to-a-different-fingerprint
branch, and no action ever unbinds an id — but the candidate admits it. A
first claim `ClaimOwner(act1, i2, fp2)` then takes the unbound branch and
binds exactly the fingerprint that sits in the rejected set:
`SameIdDifferentFingerprintNeverExecutes` (rejected pair => bound fingerprint
differs) is violated in the successor.

**Strengthening decision.** The full reachable truth is
`<<inv,fp>> \in rejectedRequests => invocationFp[inv] \notin {NoFp, fp}`. Its
`# fp` half is already the safety conjunct itself; only the `# NoFp` half is
missing from the candidate. So the weakest missing piece is exactly:

```tla
RejectedImpliesBound ==
    \A inv \in Invocations, fp \in Fingerprints :
        <<inv, fp>> \in rejectedRequests => invocationFp[inv] # NoFp
```

Preserved on its own: rejected pairs are only added when the id is bound, and
`invocationFp` transitions are `NoFp -> fp` only, never back.

---

## Attempt 3 — + RejectedImpliesBound: INDUCTIVE

**Candidate (final)**
```tla
IndInv ==
    /\ TypeOK
    /\ AtMostOneClaimOwner
    /\ AtMostOneExternalDispatchPerAttempt
    /\ DispatchAssignmentStable
    /\ SameIdDifferentFingerprintNeverExecutes
    /\ AmbiguousAttemptStopsFallback
    /\ AtMostOnePendingPerInvocation
    /\ RejectedImpliesBound
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config InvocationClaimInductive.cfg InvocationClaimInductive.tla
```

**Result** — verbatim, full output in `InvocationClaimInductive.tlc-receipt.txt`:

```
Finished computing initial states: 698400 distinct states generated
Model checking completed. No error has been found.
2378400 states generated, 698400 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
```

All 698,400 states satisfying `IndInv` were enumerated; every successor
satisfies every conjunct. Search depth 1 = one-step closure (every successor
was already in the initial, i.e. IndInv, state set).

**Base case.** Receipt run 2: the ORIGINAL `Spec` with all eight conjuncts as
invariants — `No error has been found` over all 9,457 reachable states at the
induction constants. Initial states are reachable, so this subsumes
`Init => IndInv` and confirms the auxiliary predicates are reachable truths,
not vacuous strengthening.

**What is now proved** (for `|Invocations| = 2, |Attempts| = 2,
|Fingerprints| = 2, |Actors| = 2`): `Init => IndInv`,
`IndInv /\ [Next]_vars => IndInv'`, and `IndInv =>` each of the five checked
safety properties (conjuncts). By induction, all five hold in ALL reachable
states at ANY depth — strictly stronger than the prior bounded reachability
receipt. NOT a parameterized proof over all constants (needs Apalache or
TLAPS; unavailable here).

## Original-constants run (3 attempt ids): also inductive

After the loop closed at the 2-attempt bound, the final candidate was checked
once at the ORIGINAL reachability-model constants
(`Attempts = {a1,a2,a3}`, everything else unchanged —
`InvocationClaimInductive.orig3.cfg`), accepting the single slow enumeration
for the final candidate only. Verbatim (receipt RUN 3):

```
Finished computing initial states: 12787200 distinct states generated
Model checking completed. No error has been found.
49190400 states generated, 12787200 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
Finished in 08min 01s
```

The measured shape matches the shrink rationale: ~8 minutes of
single-threaded enumeration for 12,787,200 IndInv states at 3 attempts vs
~50 seconds per iteration at 2 attempts — fine once, hostile to a
strengthening loop. The companion base-case run at 3 attempts
(`InvocationClaimInductive.orig3.base.cfg`, receipt RUN 4) passes over all
51,601 reachable states — the same 51,601 as the original bounded receipt.
So `IndInv` is inductive, with base case, at BOTH the 2-attempt loop bound
and the original 3-attempt bound, and no CTI loop iteration was needed at
the larger bound: the glue discovered at 2 attempts transferred unchanged.

---

## Iteration summary

| Attempt | Candidate | IndInv states (2-attempt bound) | Outcome |
|---|---|---|---|
| 1 | TypeOK + 5 safety properties | 1,815,552 | CTI #1: two attempts in flight on one invocation; Ambiguous resolve freezes it with one still Pending |
| 2 | + AtMostOnePendingPerInvocation | 1,787,904 | CTI #2: rejected fingerprint pair on an unbound id; first claim binds the rejected fingerprint |
| 3 | + RejectedImpliesBound | 698,400 | **Inductive** — no error found, depth 1 |

The candidate set shrank 1,815,552 → 1,787,904 → 698,400 against a fixed
reachable set of 9,457: the glue predicates carve the candidate toward an
inductive envelope of the reachable states. The final envelope still
over-approximates reachability by ~74x — IndInv is deliberately far from the
strongest invariant: weakest workable glue, nothing more.

## Next step (explicitly out of scope this session)

`live-sports/LiveModelDispatchUnderAmbiguity.tla` INSTANTIATES both
`InvocationClaim` and `CreditReservation`. Its induction should be built
compositionally — lift each base module's IndInv through the instantiation
substitution and strengthen only the composition glue — rather than
re-derived flat over the product state space. Deferred to a later session.
