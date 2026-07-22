# Compositional inductive strengthening log

**Module:** `LiveModelDispatchUnderAmbiguityInductive.tla`  
**Parent:** `LiveModelDispatchUnderAmbiguity.tla`  
**Doctrine:** `formal/INDUCTION_DOCTRINE.md` §7 (compositional lift)  
**Status:** Attempt 1 artifact landed; TLC not yet run in the authoring environment.

## Goal

Prove a compositional `IndInv` such that:

1. `Init => IndInv` (base case via `*.base.cfg` on original `Spec`)
2. `IndInv /\ [Next]_vars => IndInv'` (step via `*.attemptN.cfg`, INIT = candidate)
3. `IndInv =>` all composed safeties (safeties are conjuncts)

for fixed constants — TLC-only MEDIUM regime. Not parameterized (Apalache/TLAPS = DEEP, later).

## Lifted base envelopes

| Instance | Source | Closed conjuncts |
|----------|--------|------------------|
| `ICInd` | `formal/ai-invocation/InvocationClaimInductive.tla` | TypeOK, 5 safeties, AtMostOnePendingPerInvocation, RejectedImpliesBound |
| `CRInd` | `formal/credit-budget/CreditReservationInductive.tla` | TypeOKFinite, LedgerNeverExceedsBalance, NeverOverAdmit, AdmittedCountBoundedByStarted, CommittedCoveredByReserved |

## Attempt 1 — candidate

**Constants:** `|Invocations|=2`, `|Attempts|=2`, `|Fingerprints|=2`, `|Actors|=2`, `|TrustedActors|=1`, `VerifiedBalance=1`, `RequestCost=1`

**Conjuncts:** composed `TypeOK` + full ICInd lift + full CRInd lift + four composed safeties.  
**No extra cross-module glue** (weakest start).

**Command:**

```bash
JAR=/path/to/tla2tools.jar
cd formal/live-sports
java -cp "$JAR" tlc2.TLC -workers auto -deadlock \
  -I ../ai-invocation -I ../credit-budget \
  -config LiveModelDispatchUnderAmbiguityInductive.attempt1.cfg \
  LiveModelDispatchUnderAmbiguityInductive.tla
```

### Result (fill after run)

- [ ] No error / depth 1 → Attempt1 inductive; proceed to base.cfg and scale constants
- [ ] CTI found → paste verbatim below, diagnose core vs debris, strengthen

### CTI #1 (if any)

```
(paste TLC counterexample states here)
```

**Core of the CTI:** (what actually breaks the step)

**Debris:** (unreachable weirdness the candidate tolerates harmlessly)

**Strengthening decision:** (weakest general predicate; ladder considered)

**Predicate promoted into Attempt2:**

- [ ] `DispatchedImpliesEverHeld`
- [ ] `AmbiguousHoldDiscipline`
- [ ] `CleanFailureImpliesFailed`
- [ ] `TrustedReleaseImpliesAmbiguous`
- [ ] `NotReleasedConsistent`
- [ ] other: ___

## Attempt 2 — after CTI #1

**Config:** copy `attempt1.cfg` → `attempt2.cfg`, set `INIT InitIndInvAttempt2`, add new INVARIANT lines for promoted glue.

### Result

- [ ] inductive
- [ ] further CTI → continue log

## Base case

```bash
java -cp "$JAR" tlc2.TLC -workers auto -deadlock \
  -I ../ai-invocation -I ../credit-budget \
  -config LiveModelDispatchUnderAmbiguityInductive.base.cfg \
  LiveModelDispatchUnderAmbiguityInductive.tla
```

- [ ] green on same constants as final IndInv

## Scale-up

After final IndInv closes at 2 attempts:

- Re-run inductive step + base at reachability constants (`Attempts={a1,a2,a3}`, `VerifiedBalance=2`) mirroring `LiveModelDispatchUnderAmbiguity.cfg`
- Capture receipts as `LiveModelDispatchUnderAmbiguityInductive.tlc-receipt.txt`

## Notes

- Parent composed module and base inductive modules are not edited by this work.
- Heartbeat / Formal Foundry closed loop consumes this envelope once closed; it does not replace it.
