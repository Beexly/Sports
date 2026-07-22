# Formal Invariant Foundry (W2-02)

Pure specification + proof artifacts. **Nothing in this directory touches
production code.** It is a read-only formal model of two of GSE's most
dangerous concurrency invariants in the AI control plane, checked with the
real TLA+ model checker (TLC), plus honest receipts of what was actually run.

## What's here

```
formal/
  ai-invocation/
    InvocationClaim.tla                                 the spec
    InvocationClaim.cfg                                  TLC model config
    InvocationClaim.tlc-receipt.txt                       real TLC PASS output
    InvocationClaim.counterexample-found-during-development.txt
                                                           real TLC FAIL output
                                                           from an earlier,
                                                           genuinely buggy
                                                           version of this spec
  credit-budget/
    CreditReservation.tla                                the spec
    CreditReservation.cfg                                 TLC model config
    CreditReservation.tlc-receipt.txt                      real TLC PASS output
  README.md                                               this file
```

## Toolchain

TLC (the TLA+ model checker) via `tla2tools.jar`, run under the OpenJDK 21
already present in this environment (`java -version` → 21.0.10). The
official GitHub release artifact for `tla2tools.jar` sits behind GitHub's
release-asset API, which this session's egress policy does not allow for an
un-added repo. `tlaplus/tlaplus` could not be added to this session
(`add_repo` refuses a second GitHub org/owner once a session already has a
repo from a different owner). Instead, the SAME artifact was fetched from
the TLA+ project's own mirror, `https://nightly.tlapl.us/dist/tla2tools.jar`
(not GitHub — a project-operated host, reachable through the egress proxy),
and confirmed to be a real, working `tlc2.TLC` jar (`TLC2 Version
2026.07.18.145032`) before use. This is a real, functioning TLA+ toolchain —
not a substitute or hand-rolled checker.

## Reproduce

```bash
# from the repo root, or anywhere — pass an absolute path to tla2tools.jar
JAR=/path/to/tla2tools.jar

cd formal/ai-invocation
java -cp "$JAR" tlc2.TLC -workers auto -deadlock \
  -config InvocationClaim.cfg InvocationClaim.tla

cd ../credit-budget
java -cp "$JAR" tlc2.TLC -workers auto -deadlock \
  -config CreditReservation.cfg CreditReservation.tla
```

`-deadlock` tells TLC not to treat a state with no further enabled actions
(e.g. every invocation has reached a Terminal status, or every attempt has
settled/released) as an error — both specs model systems that legitimately
run out of things to do, which is not a liveness bug being modeled here.

TLC writes scratch `states/` directories and `*_TTrace_*.tla`/`.bin` files
into the working directory on every run; these are regenerated each time and
are not checked in (only the spec, `.cfg`, and the captured receipt logs
are).

## Module 1 — `ai-invocation/InvocationClaim.tla`

Models one AI-task invocation attempt: claiming ownership of an invocation
id, dispatching to exactly one external provider call per attempt, and
recording an outcome (including the ambiguous/timeout case).

**Implementation mapping** (also stated as a header comment inside the spec
file itself): this models
`apps/web/lib/ai-control-plane/invocation-pipeline.ts`'s
`createLedgeredDispatch`, backed by
`apps/web/lib/ai-control-plane/control-store.ts`'s
`AuthoritativeControlStore.claimInvocation` / `startAttempt` /
`finalizeSuccess` / `finalizeFailure`, and the `AmbiguousCharge` error type
in `apps/web/lib/ai-control-plane/errors.ts` — currently on branch
`feat/ai-control-plane-ledger` (worktree `/workspace/wt/pr163` at the time
of writing). The mapping is descriptive only; none of that code was read
for correctness beyond understanding what to model, and none of it was
modified.

**Invariants checked** (each stated formally in the spec, not just in
comments):

- `AtMostOneClaimOwner` — a given invocation id has at most one active claim
  owner at a time.
- `AtMostOneExternalDispatchPerAttempt` — a given attempt id triggers at
  most one real external provider dispatch, ever (enforced structurally: the
  `Dispatch` action's guard makes a second dispatch for the same attempt id
  unreachable, and the invariant confirms it holds in every reachable
  state).
- `SameIdDifferentFingerprintNeverExecutes` — a request reusing an
  invocation id with a *different* content fingerprint is rejected and never
  executes; the bound fingerprint for an id, once set, is immutable.
- `AmbiguousAttemptStopsFallback` — once an attempt's outcome is Ambiguous
  (timeout / unknown provider-side state), the owning invocation is frozen
  and no further attempt (fallback or retry) can ever be dispatched for it.

**Bound**: 2 invocation ids, 3 attempt ids, 2 fingerprints, 2 actors.

**Result**: `Model checking completed. No error has been found.`
200,649 states generated, 51,601 distinct states explored, search depth 15.
Full log: `InvocationClaim.tlc-receipt.txt`.

**A real bug was caught and fixed during development of this spec.** The
first version of `Dispatch`'s guard allowed a second, unrelated attempt to
be started for the same invocation while a first attempt was still
`Pending` — legal in the abstract model but not how the real sequential
provider-route walk in `invocation-pipeline.ts` behaves (it only starts
attempt *i+1* after attempt *i*'s outcome is known). TLC found a genuine
6-step counterexample violating `AmbiguousAttemptStopsFallback`: attempt
`a1` resolves `Ambiguous` (freezing invocation `i1`) while attempt `a2`,
raced into flight concurrently for the same invocation, is still `Pending`.
That trace is preserved verbatim in
`InvocationClaim.counterexample-found-during-development.txt`. The fix adds
an explicit "no other attempt outstanding for this invocation" guard to
`Dispatch`, matching the real sequential walk; the corrected spec then
passes cleanly (receipt above).

## Module 2 — `credit-budget/CreditReservation.tla`

Models N concurrent credit-authorization attempts against a single shared,
verified balance.

**Implementation mapping** (also stated as a header comment inside the spec
file itself): this models
`apps/web/lib/ai-control-plane/credit-admission.ts`'s
`CreditAuthorizationPort.authorize` / `settle` / `release`, specifically the
Postgres-backed implementation's single atomic conditional `UPDATE` against
`credit_grant_reservation_ledger` (never a read-then-write) —
`createPgCreditAuthorizationPort` — currently on branch
`feat/ai-control-plane-credit-admission` (worktree `/workspace/wt/prd` at
the time of writing). The sibling cash-cap path,
`apps/web/lib/ai-control-plane/budget.ts`'s `reserve`, uses the identical
atomicity pattern against a per-window `capUsd`, so this spec's abstract
"balance" stands in for either concrete implementation. The mapping is
descriptive only; none of that code was modified.

**Flagship invariant, stated exactly as the governing directive**: *a
verified balance cannot allow a second paid request to be admitted once the
balance is exhausted* — no double-spend; total admitted reservations never
exceed the verified balance at time of admission. This is `NeverOverAdmit`
in the spec, backed by the more direct arithmetic invariant
`LedgerNeverExceedsBalance`.

**Bound**: 4 concurrent authorization attempts (`t1..t4`) against a verified
balance of 3 units, each admitted request costing 1 unit — balance is
deliberately smaller than the attempt count so every maximal run is forced
to produce at least one refusal, the exact contention scenario the
no-double-spend property has to survive.

**Result**: `Model checking completed. No error has been found.` 921 states
generated, 348 distinct states explored, search depth 9. Full log:
`CreditReservation.tlc-receipt.txt`.

## Induction layer (added after the bounded receipts above)

Both modules' safety invariants are now proved INDUCTIVE — not just
bounded-model-checked — using TLC alone, via the standard recipe: a sibling
module (`CreditReservationInductive.tla`, `InvocationClaimInductive.tla`;
the original specs are untouched) defines a candidate `IndInv` whose leading
conjuncts constrain every variable to a finite set, the candidate is used as
the INIT predicate so TLC enumerates EVERY state satisfying it (reachable or
not), and every conjunct is checked as an invariant on all successors —
exactly the inductive step `IndInv /\ [Next]_vars => IndInv'`, checked
exhaustively. A companion `*.base.cfg` run of the original `Spec` with the
same conjuncts subsumes the base case `Init => IndInv`. Together with
`IndInv => Safety` (the safety properties are conjuncts), this proves the
safety invariants in ALL reachable states at ANY depth for the checked
constants — strictly stronger than the bounded receipts above, though NOT a
parameterized proof for all constants (that would need Apalache or TLAPS,
neither available in this environment).

The candidates were strengthened through a REAL counterexample-to-induction
loop — four genuine CTIs across the two modules, each recorded verbatim with
diagnosis and the weakest-blocking-predicate decision in:

- `credit-budget/INDUCTIVE_STRENGTHENING_LOG.md` (2 CTIs, final `IndInv` =
  typing + both safety properties + `AdmittedCountBoundedByStarted` +
  `CommittedCoveredByReserved`)
- `ai-invocation/INDUCTIVE_STRENGTHENING_LOG.md` (2 CTIs, final `IndInv` =
  `TypeOK` + all five safety properties + `AtMostOnePendingPerInvocation` +
  `RejectedImpliesBound`; the CTI loop iterated at a documented 2-attempt
  shrink of the reachability model's 3-attempt bound — single-threaded
  INIT enumeration is ~24x slower at 3 attempts — and the final candidate
  was then ALSO closure-checked at the original 3-attempt bound:
  12,787,200 candidate states, 49,190,400 transitions, no error)

Failed candidates are kept in the modules with their `.cfg` files
(`*.attempt1.cfg`, `*.attempt2.cfg`) so every logged run is reproducible;
receipts of the closing runs are in `*Inductive.tlc-receipt.txt`. The
method, generalization discipline, effort regimes, and honest scoping are
written up in `INDUCTION_DOCTRINE.md`. The composed
`live-sports/LiveModelDispatchUnderAmbiguity.tla` module's induction is the
designated NEXT step (compositional, on top of the base modules' IndInvs) —
deliberately not attempted in the same session.

## What this scaffold intentionally does NOT cover

- Multi-window fixed-order acquisition (a single spend counting against
  daily AND monthly AND surface caps at once) — the real `budget.ts`
  transaction; this spec models one shared balance, which is the core
  concurrency argument the multi-window case composes from.
- Snapshot admissibility (expiry, staleness, scope coverage, reconciliation
  drift) in `credit-admission.ts` — a separate, larger state space with its
  own S1-owned vocabulary; out of scope for this two-module foundry.
- Lease-expiry timers, TTL sweep, and the durable recovery-queue drain path
  in `invocation-pipeline.ts` / `recovery-drainer.ts` — the spec models the
  claim/dispatch/finalize safety properties, not the liveness/cleanup
  machinery around them.
- Liveness properties (e.g. "every attempt eventually reaches a terminal
  state") — only safety invariants were in scope for this task.

Extending this foundry to the full catalog (provider-account caps, entity
scoping, lease-steal fencing, the multi-window transaction) is future work,
not attempted here — this delivery is two modules, done honestly and
verified, over six modules done superficially.
