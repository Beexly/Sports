# Inductive Strengthening Log — CreditReservation

This log records the REAL counterexample-to-induction (CTI) loop that produced
`IndInv` in `CreditReservationInductive.tla`. Every TLC run below was actually
executed; every CTI state is quoted verbatim from TLC's output. Failed
candidates are kept in the module (as `IndInvAttempt1`, `IndInvAttempt2`) with
their `.cfg` files, so each logged run can be reproduced exactly.

**Method (TLC as induction checker).** A candidate `C` is inductive iff
`C /\ [Next]_vars => C'`. TLC checks this exhaustively when `C` is used as the
INIT predicate: TLC enumerates every state satisfying `C` (finite, because the
leading `TypeOKFinite` conjunct bounds every variable to a finite set — the
requirement for TLC to enumerate an arbitrary state predicate) and verifies
each conjunct of `C` as an INVARIANT on all successors. A reported violation is
a CTI: a `C`-state (reachable or not) with a one-step successor outside `C`.
`No error has been found` means `C` is inductive for these constants.

**Strengthening discipline.** For each CTI: diagnose the missing glue between
variables, then add the WEAKEST general predicate that blocks the CTI's whole
class (generalization in the MIC/IC3 spirit) — never a narrow patch mentioning
the CTI's specific values, and never a stronger predicate than the induction
needs.

Constants for every run: `Attempts = {t1,t2,t3,t4}`, `VerifiedBalance = 3`,
`RequestCost = 1` — identical to the reachability model `CreditReservation.cfg`.

---

## Attempt 1 — safety properties alone: NOT inductive (CTI #1)

**Candidate**
```tla
IndInvAttempt1 ==
    /\ TypeOKFinite               \* reserved \in 0..VerifiedBalance,
                                  \* state \in [Attempts -> 5 phases],
                                  \* admittedCount \in 0..Cardinality(Attempts)
    /\ LedgerNeverExceedsBalance  \* reserved <= VerifiedBalance
    /\ NeverOverAdmit             \* |HELD ∪ SETTLED| * RequestCost <= VerifiedBalance
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config CreditReservationInductive.attempt1.cfg CreditReservationInductive.tla
```

**Result** — 12,180 distinct candidate states enumerated, then:

```
Error: Invariant TypeOKFinite is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\ state = ( t1 :> "Unstarted" @@
  t2 :> "Unstarted" @@
  t3 :> "Unstarted" @@
  t4 :> "Unstarted" )
/\ admittedCount = 4
/\ reserved = 0

State 2: <Authorize(t1) line 84, col 5 to line 91, col 45 of module CreditReservation>
/\ state = (t1 :> "HELD" @@ t2 :> "Unstarted" @@ t3 :> "Unstarted" @@ t4 :> "Unstarted")
/\ admittedCount = 5
/\ reserved = 1
```

**Diagnosis.** The CTI state is unreachable but satisfies the candidate:
`admittedCount = 4` (already at `Cardinality(Attempts)`) while every attempt is
still `Unstarted`. Nothing in the candidate ties `admittedCount` to the `state`
function, so one more successful `Authorize` pushes `admittedCount` to 5 —
outside its finite type bound `0..4`. This is the textbook failure mode the
task anticipated: a counter variable with no gluing predicate to the per-item
states it is supposed to summarize.

**Strengthening decision.** Predicates that block the class, strongest first:

1. `admittedCount = Cardinality({t : state[t] \in {"HELD","SETTLED","RELEASED"}})`
   — the exact reachable truth (admittedCount counts ever-admitted attempts);
2. `admittedCount <= Cardinality({t : state[t] \in {"HELD","SETTLED","RELEASED"}})`;
3. `admittedCount <= Cardinality(StartedAttempts)` where
   `StartedAttempts == {t : state[t] # "Unstarted"}` — the weakest of the three.

Chosen: **(3) `AdmittedCountBoundedByStarted`**. It is inductive on its own
(`Authorize` is the only action incrementing `admittedCount`, and both of its
branches move the chosen attempt out of `Unstarted`, so the right-hand side
rises at least as fast; no other action touches either side) and it blocks the
class (an increment from a state satisfying it lands at
`admittedCount' <= |StartedAttempts'| <= Cardinality(Attempts)`). The stronger
forms pin behavior the target safety properties never depend on —
`admittedCount` appears in neither — so per the weakest-predicate preference
they were rejected.

---

## Attempt 2 — + AdmittedCountBoundedByStarted: NOT inductive (CTI #2)

**Candidate**
```tla
IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ AdmittedCountBoundedByStarted   \* admittedCount <= Cardinality(StartedAttempts)
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config CreditReservationInductive.attempt2.cfg CreditReservationInductive.tla
```

**Result** — 10,180 distinct candidate states enumerated (the new conjunct
excluded 2,000 of attempt 1's states), then:

```
Error: Invariant TypeOKFinite is violated.
Error: The behavior up to this point is:
State 1: <Initial predicate>
/\ state = (t1 :> "Unstarted" @@ t2 :> "Unstarted" @@ t3 :> "Unstarted" @@ t4 :> "HELD")
/\ admittedCount = 1
/\ reserved = 0

State 2: <Release(t4) line 107, col 5 to line 110, col 30 of module CreditReservation>
/\ state = ( t1 :> "Unstarted" @@
  t2 :> "Unstarted" @@
  t3 :> "Unstarted" @@
  t4 :> "RELEASED" )
/\ admittedCount = 1
/\ reserved = -1
```

**Diagnosis.** A phantom hold: `t4` is `HELD` while `reserved = 0` — the ledger
carries no reservation for a committed attempt. Unreachable (in the real
system a `HELD` attempt's cost is always inside `reserved`), but the candidate
has no predicate relating `reserved` to the committed set, so the state is
admitted, and `Release(t4)` subtracts `RequestCost` from an empty ledger:
`reserved' = -1`, outside `Nat`. The same missing glue also leaves an
over-admission class open (e.g. three attempts `HELD` with `reserved = 0`:
`Authorize` sees headroom it should not have and admits a fourth, violating
`NeverOverAdmit`) — TLC happened to surface the underflow face of the hole
first.

**Strengthening decision.** Candidate glue, strongest first:

1. `reserved = RequestCost * Cardinality(CommittedAttempts)` — the exact
   reachable truth (the ledger equals the committed cost);
2. `RequestCost * Cardinality(CommittedAttempts) <= reserved` — every
   committed attempt's cost is covered by the ledger (over-counting allowed).

Chosen: **(2) `CommittedCoveredByReserved`**, the weaker. It blocks both faces
of the class in one predicate:

- *Release underflow*: `t \in CommittedAttempts` gives
  `reserved >= RequestCost`, so the subtraction stays in `Nat`, and the
  predicate itself is preserved (both sides drop by exactly `RequestCost`).
- *Over-admission*: for an admitting `Authorize` step,
  `RequestCost * |CommittedAttempts'| = RequestCost * |CommittedAttempts| + RequestCost
  <= reserved + RequestCost = reserved' <= VerifiedBalance` — the last
  inequality is precisely the atomic conditional-UPDATE guard. So
  `NeverOverAdmit` is re-established in the successor from the glue plus the
  guard, which is the formal shape of the argument that the single atomic
  guarded UPDATE (never read-then-write) is what makes over-admission
  impossible.

The equality form (1) would also close the induction but forbids harmless
IndInv states where `reserved` over-counts, buying nothing for the target
properties — rejected per the weakest-predicate preference.

---

## Attempt 3 — + CommittedCoveredByReserved: INDUCTIVE

**Candidate (final)**
```tla
IndInv ==
    /\ TypeOKFinite
    /\ LedgerNeverExceedsBalance
    /\ NeverOverAdmit
    /\ AdmittedCountBoundedByStarted
    /\ CommittedCoveredByReserved
```

**Run**
```
java -cp tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config CreditReservationInductive.cfg CreditReservationInductive.tla
```

**Result** — verbatim, full output in `CreditReservationInductive.tlc-receipt.txt`:

```
Finished computing initial states: 6100 distinct states generated
Model checking completed. No error has been found.
18420 states generated, 6100 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
```

All 6,100 states satisfying `IndInv` were enumerated; every one of their
successors satisfies every conjunct of `IndInv`. Search depth 1 is the
induction made visible: every successor was already in the initial (= IndInv)
state set, i.e. one-step closure.

**Base case.** Run 2 in the receipt: the ORIGINAL `Spec` with all five
conjuncts as invariants — `No error has been found` over all 348 reachable
states (same 348 as the original bounded receipt). Initial states are
reachable, so this subsumes `Init => IndInv`, and it additionally confirms the
auxiliary predicates are true of the modeled system rather than vacuous
strengthening.

**What is now proved** (for `|Attempts| = 4`, `VerifiedBalance = 3`,
`RequestCost = 1`): `Init => IndInv`, `IndInv /\ [Next]_vars => IndInv'`, and
`IndInv => LedgerNeverExceedsBalance /\ NeverOverAdmit` (conjuncts). By
induction, both safety properties hold in ALL reachable states at ANY depth —
strictly stronger than the prior bounded reachability receipt. NOT a
parameterized proof over all constants; that needs Apalache or TLAPS, neither
available in this environment. See the module header for the precise claim.

---

## Iteration summary

| Attempt | Candidate | IndInv states | Outcome |
|---|---|---|---|
| 1 | TypeOKFinite + 2 safety properties | 12,180 | CTI #1: `admittedCount` unglued from `state`; `Authorize` exits the type bound |
| 2 | + AdmittedCountBoundedByStarted | 10,180 | CTI #2: phantom hold (`HELD` with `reserved = 0`); `Release` drives `reserved` to -1 |
| 3 | + CommittedCoveredByReserved | 6,100 | **Inductive** — no error found, depth 1 |

Each strengthening SHRANK the candidate state set (12,180 → 10,180 → 6,100)
while the reachable set (348) stayed fixed: the auxiliary predicates carve the
candidate down toward an inductive envelope of the reachable states, which is
exactly what a strengthening loop is supposed to do. The final envelope still
over-approximates reachability by ~17x (6,100 vs 348) — IndInv is far from the
strongest invariant, deliberately: weakest workable glue, nothing more.

## Next step (explicitly out of scope this session)

`live-sports/LiveModelDispatchUnderAmbiguity.tla` instantiates BOTH base specs;
its induction should be built compositionally on the base modules' IndInvs
(this one and `ai-invocation`'s), not re-derived flat — deferred to a later
session.
