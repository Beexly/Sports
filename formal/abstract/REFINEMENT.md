# Abstract Claim/Exposure — Refinement (standalone formal follow-on)

This is standalone TLA+ formal-methods work, not part of PR #181 itself
(which this worktree happens to contain, unmodified — see `git status`/the
commit this branch is added on top of). It follows this repo's own
`formal/README.md` / `formal/INDUCTION_DOCTRINE.md` house style throughout.

## What this is

Two new modules under `formal/abstract/`, plus their `.cfg` files and real
TLC receipts:

1. **`AbstractClaimExposure.tla`** — a pure, standalone abstract spec of ONE
   invocation's control state, at exactly the abstraction level the REAL
   (already implemented, this same worktree) TypeScript projection
   `apps/web/lib/ai-control-plane/srqc-projection.ts` uses: the
   `AbstractControlState` interface quoted in that file's own source (and in
   this module's header). No CONSTANTS — 5 variables over small enumerated
   string domains, 72 total typed states.
2. **`LiveModelRefinesAbstract.tla`** — the refinement mapping: an explicit
   abstraction function `alpha`, as five named TLA+ state functions (one per
   abstract variable), from the EXISTING composed concrete spec
   `formal/live-sports/LiveModelDispatchUnderAmbiguity.tla` (itself
   `INSTANCE`-composing the existing, independently-verified
   `InvocationClaim.tla` and `CreditReservation.tla`) down to
   `AbstractClaimExposure`'s domain, for one fixed invocation id
   (`TargetInv`). Checked via TLC step-simulation, not TLAPS.

**No file outside `formal/abstract/` was modified.** `InvocationClaim.tla`,
`CreditReservation.tla`, `LiveModelDispatchUnderAmbiguity.tla`, their
`.cfg`s, and every file under `apps/web/`/`packages/` (including PR #181's
own Track A files) are read-only references here.

## Reconciling the domain shape

The handoff instruction that started this work described
`pendingCountClass` informally as "∈ {0,1,2}". The REAL implemented runtime
type in `srqc-projection.ts` is the 3-way STRING enum
`"ZERO" | "ONE" | "GE2"`, not a numeric domain, and `GE2` is a first-class
forbidden VALUE (the exact shape of inductive CTI #1 for `InvocationClaim`,
`AtMostOnePendingPerInvocation`) — not a saturating count. This module uses
the string enum, matching the TypeScript source exactly, and `GE2` is never
collapsed/normalized away in `Next` or `IndInv_alpha`; `Next`'s guards make
it structurally unreachable (the same "unreachable by construction, invariant
confirms it" pattern `InvocationClaim.tla`'s own
`AtMostOneExternalDispatchPerAttempt` already uses), which is the honest
reason `NeverGE2` closed inductively with no strengthening needed (§1 of
`ABSTRACT_STRENGTHENING_LOG.md`).

## Refinement level: PURE STATE FUNCTION (no history/stuttering/prophecy needed)

Per `INDUCTION_DOCTRINE.md`'s stated preference ("prefer a pure state
function first, escalate only if a pure function cannot express it"), the
escalation ladder was walked in order:

1. **Pure state function — used, and sufficient.** All five `Alpha*`
   formulas in `LiveModelRefinesAbstract.tla` (`AlphaClaimPhase`,
   `AlphaExposurePhase`, `AlphaPendingCountClass`, `AlphaFingerprintBound`,
   `AlphaHasRejectedFp`) are pure functions of the CURRENT concrete state
   only — no auxiliary variable, no memory of the past. In particular
   `AlphaExposurePhase` does not need a "was this ever ambiguous" flag: it
   re-derives `AMBIGUOUS_HELD` fresh from the pair
   `(attemptOutcome[att], state[att])` for whichever attempt(s) are
   currently attached to the target invocation, every state.
2. **History variable — not needed.** A first TLC run of the refinement
   property DID fail (real counterexample, quoted verbatim in
   `ABSTRACT_STRENGTHENING_LOG.md` §2), but the fix was NOT "alpha needs to
   remember something" — `AlphaExposurePhase` was already exactly right.
   The bug was that `AbstractClaimExposure!Next`'s `ClearHeldExposure` and
   `TrustedReleaseAmbiguous` actions asserted too STRONG a deterministic
   effect (`exposurePhase' = "NONE"`) when the concrete spec can leave a
   second, unrelated attempt's stale unreleased hold in place (clearing one
   attempt's hold on an invocation does not always clear the invocation's
   only hold). Fixed by weakening those two actions' effect to
   `exposurePhase' \in {"NONE", "HELD"}` — a nondeterministic ABSTRACT
   action, still driven by a purely-current-state `alpha`. No state was
   added anywhere.
3. **Stuttering variable — not needed.** Every concrete action either
   changes none of the five `Alpha*` formulas (an ordinary `[Next]_vars`
   stutter, which `Abstract!Spec`'s own `[][Next]_vars` already permits with
   no extra machinery) or matches exactly one `AbstractClaimExposure`
   action in one step — no concrete action was found to span more than one
   abstract transition's worth of alpha-change.
4. **Prophecy variable — not needed.** Nothing in `alpha` depends on a
   future, not-yet-determined choice.

`LiveModelRefinesAbstract.tla`'s header carries the full per-action
correspondence table (which concrete action maps to which abstract action,
and which are pure stutters) and is the authoritative reference for this
mapping; this document summarizes it.

## The exact commands run and their real results

The environment's cached `tla2tools.jar` at `/tmp/tla2tools.jar` (referenced
by the handoff as already fetched and verified) turned out, on inspection,
to actually be a 404 HTML error page (554 bytes, `<html><head><title>404
Not Found</title>...`), not a working jar — apparently from an earlier,
failed fetch attempt in this environment's history. It was re-fetched for
real before any TLC command below was run:

```
curl -sS -o /tmp/tla2tools.jar https://nightly.tlapl.us/dist/tla2tools.jar
# HTTP 200, 4,485,995 bytes, confirmed `java -cp ... tlc2.TLC -help` prints
# "TLC2 Version 2026.07.18.145032" — the same version formal/README.md
# documents for the earlier InvocationClaim/CreditReservation work.
```

All four commands below were then run for real, from
`formal/abstract/`, `java -version` confirmed OpenJDK 21.0.10:

**1. `AbstractClaimExposure.tla` bounded reachability** (SHALLOW regime):
```
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposure.cfg AbstractClaimExposure.tla
```
Result — `AbstractClaimExposure.tlc-receipt.txt`:
```
Model checking completed. No error has been found.
40 states generated, 15 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 6.
```

**2. `IndInv_alpha` inductive closure** (MEDIUM regime):
```
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposureInductive.cfg AbstractClaimExposure.tla
```
Result — `AbstractClaimExposureInductive.tlc-receipt.txt`:
```
Finished computing initial states: 30 distinct states generated
Model checking completed. No error has been found.
97 states generated, 30 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 1.
```

**3. `IndInv_alpha` base case:**
```
java -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config AbstractClaimExposureInductive.base.cfg AbstractClaimExposure.tla
```
Result — `AbstractClaimExposureInductive.base.tlc-receipt.txt`:
```
Model checking completed. No error has been found.
40 states generated, 15 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 6.
```
Runs 2-3 together prove `Init => IndInv_alpha`,
`IndInv_alpha /\ [Next]_vars => IndInv_alpha'`, and (since `NeverGE2`,
`RejectedImpliesBoundAlpha`, and `AmbiguousHeldImpliesTerminal` are all
conjuncts of `IndInv_alpha`) that all three hold in EVERY reachable state of
`AbstractClaimExposure.tla` at ANY depth — the module's entire, exact state
space (no constants to bound).

**4. Refinement-mapping step-simulation** (the FIRST run of this command
FAILED with a real 9-step counterexample; §2 of
`ABSTRACT_STRENGTHENING_LOG.md` has it verbatim and the fix applied. The
command and result below are the run AFTER the fix):
```
java -DTLA-Library=/path/to/formal/live-sports:/path/to/formal/ai-invocation:/path/to/formal/credit-budget \
  -cp /tmp/tla2tools.jar tlc2.TLC -workers auto -deadlock \
  -config LiveModelRefinesAbstract.cfg LiveModelRefinesAbstract.tla
```
(`-DTLA-Library=...` is required because `LiveModelRefinesAbstract.tla`
`EXTENDS LiveModelDispatchUnderAmbiguity`, which lives in a sibling
directory — TLC has no `-library`/`-I` flag in this version; the standard
`TLA-Library` Java system property is what SANY's module search path reads.)

Result — `LiveModelRefinesAbstract.tlc-receipt.txt`:
```
Model checking completed. No error has been found.
1306029 states generated, 323194 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 21.
```

Constants used (identical to `live-sports/LiveModelDispatchUnderAmbiguity.cfg`,
plus the new `TargetInv`): `Invocations = {i1,i2}`, `Attempts = {a1,a2,a3}`,
`Fingerprints = {fp1,fp2}`, `Actors = {act1,act2}`, `TrustedActors = {act1}`,
`VerifiedBalance = 2`, `RequestCost = 1`, `TargetInv = i1`.

## What "no error has been found" on the refinement property means here — and does NOT mean

`PROPERTY AbstractRefinement` (= `Abstract!Spec`, i.e.
`Abstract!Init /\ [][Abstract!Next]_Abstract!vars` evaluated through the
`alpha` substitution) checked against `SPECIFICATION Spec` (the concrete
`LiveModelDispatchUnderAmbiguity.Spec`) means: TLC generated every behavior
reachable from `Init` up to the point its breadth-first search terminated
(1,306,029 states generated, 323,194 distinct, search depth 21, for the
`TargetInv = i1` / `Attempts = {a1,a2,a3}` bound above) and confirmed that,
for EVERY step of EVERY such behavior, either `alpha` was unchanged (a legal
`[Next]_vars` stutter) or the step matched one enabled
`AbstractClaimExposure` action. This is bounded-model-checked STEP-SIMULATION
of the refinement mapping — exactly the technique
`INDUCTION_DOCTRINE.md`'s / this task's own phrasing calls for ("TLC
step-simulation primary; TLAPS equivalence skeleton secondary") — for the
FIXED constants above. It is NOT a parameterized proof that the refinement
holds for arbitrary `Invocations`/`Attempts`/`Fingerprints`/`Actors` sets, and
it is NOT a proof that `AbstractClaimExposure`'s `Next` is the TIGHTEST
possible abstraction of the concrete dynamics (§2 of the strengthening log
notes explicitly that the nondeterministic fix is a deliberate
over-approximation, matching the same "weakest workable envelope" spirit
`IndInv_alpha` itself follows). Both of those stronger results would need
Apalache or TLAPS, and per this session's explicit scope (confirmed
consistent with `formal/README.md`'s own statement that neither tool is
available in this environment), neither was attempted — no TLAPS proof
skeleton exists in this delivery; step-simulation via TLC is the entire
verification story here, stated as exactly that and no more.

## Files in this delivery

```
formal/abstract/
  AbstractClaimExposure.tla                          the abstract spec + IndInv_alpha
  AbstractClaimExposure.cfg                            bounded-reachability config
  AbstractClaimExposure.tlc-receipt.txt                 real TLC PASS output (run 1)
  AbstractClaimExposureInductive.cfg                    inductive-closure config
  AbstractClaimExposureInductive.tlc-receipt.txt         real TLC PASS output (run 2)
  AbstractClaimExposureInductive.base.cfg               base-case config
  AbstractClaimExposureInductive.base.tlc-receipt.txt    real TLC PASS output (run 3)
  LiveModelRefinesAbstract.tla                          the refinement mapping (alpha)
  LiveModelRefinesAbstract.cfg                           refinement-check config
  LiveModelRefinesAbstract.tlc-receipt.txt               real TLC PASS output (run 4, post-fix)
  ABSTRACT_STRENGTHENING_LOG.md                          both real loops, verbatim
  REFINEMENT.md                                          this file
```
