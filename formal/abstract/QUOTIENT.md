# The Quotient — what `AbstractClaimExposure` actually abstracts, and what transfers

Standalone formal-methods writeup (no code, no `.tla`/`.cfg` edits). It reads
the existing M1 abstraction/refinement (`AbstractClaimExposure.tla`,
`REFINEMENT.md`, `ABSTRACT_STRENGTHENING_LOG.md`) and the M2 compositional
induction (`../live-sports/LiveModelDispatchUnderAmbiguityInductive.tla`,
`../live-sports/INDUCTIVE_STRENGTHENING_LOG.md`) and states, in one place and
without overclaim, the *quotient argument* those two artifacts jointly make:
which concrete states collapse into which abstract classes, what safety fact
rides through the `alpha` mapping, and — explicitly — what does not. Every
receipt cited here already exists in-tree and was produced by the M1/M2 runs;
this document adds no new run (see §5). House honesty register per
`../README.md` and `../INDUCTION_DOCTRINE.md` §8.

---

## 1. `pendingCountClass ∈ {ZERO, ONE, GE2}` is a counter abstraction

The concrete quantity is a natural number:

```
concretePending(inv)  ==  Cardinality({ att \in Attempts :
                              attemptOf[att] = inv /\ attemptOutcome[att] = "Pending" })
```

(the exact set `PendingAttemptsOf(inv)` that `InvocationClaim`'s
`AtMostOnePendingPerInvocation` counts; `attemptOutcome` ranges over
`{"Pending","Succeeded","Failed","Ambiguous"}`,
`InvocationClaim.tla:52`). It ranges over `0 .. Cardinality(Attempts)`. The
refinement mapping's `AlphaPendingCountClass`
(`LiveModelRefinesAbstract.tla:145`) buckets that number three ways, for the
one fixed `TargetInv`:

| abstract class | concrete states that collapse into it |
|---|---|
| `ZERO` | `concretePending(TargetInv) = 0` |
| `ONE`  | `concretePending(TargetInv) = 1` |
| `GE2`  | `concretePending(TargetInv) ∈ {2, 3, …, Cardinality(Attempts)}` |

`GE2` is a genuine *many-to-one collapse*: two Pending attempts, three, four,
… up to the whole attempt pool all map to the single class `GE2`. The
abstraction is sound because the only safety-relevant distinction any proof in
this stack draws over that counter is **"≤ 1 vs ≥ 2"** — precisely the base
inductive invariant `AtMostOnePendingPerInvocation`
(`InvocationClaimInductive.tla:101`,
`\A inv : Cardinality(PendingAttemptsOf(inv)) <= 1`). Nothing downstream reads
"exactly 3 Pending" differently from "exactly 4 Pending"; both are the same
forbidden event (a second concurrent in-flight attempt on one invocation, the
sequential-provider-walk violation TLC caught as a real development bug —
`../README.md` Module 1). So collapsing `{2,3,4,…}` into one class loses no
distinction the safety argument uses.

`GE2` is kept as a *first-class abstract value*, never normalized away: it is
a reachable value of the `alpha` formula that simply is never *witnessed* from
`Init` (the content of `AtMostOnePendingPerInvocation`), and in the standalone
abstract spec no disjunct of `AbstractClaimExposure!Next` ever writes the
literal `"GE2"` — `StartAttempt` is guarded on `pendingCountClass = "ZERO"`
(`AbstractClaimExposure.tla:145–151`). That is why `NeverGE2` closed
inductively on the first candidate with no CTI (`ABSTRACT_STRENGTHENING_LOG.md`
§1): the forbidden class is unreachable by construction and the invariant
confirms it — the same "guard makes the bad state structurally unreachable"
pattern `InvocationClaim`'s `AtMostOneExternalDispatchPerAttempt` uses.

## 2. The phase partitions — `claimPhase × exposurePhase` as a finite quotient

The concrete claim/credit lifecycle carries `invocationStatus[inv] ∈
{"Open","Ambiguous","Terminal"}`, per-attempt `attemptOutcome[att]`, per-attempt
credit `state[att] ∈ {"Unstarted","HELD","SETTLED","RELEASED"}`, integer
`reserved`/`admittedCount`, `releaseReason`/`releaseBy`, actor identities, and
fingerprint values. The two phase functions fold that down for one invocation:

**`claimPhase` (2 classes)** — `AlphaClaimPhase`
(`LiveModelRefinesAbstract.tla:117`):

| abstract | concrete `invocationStatus[TargetInv]` |
|---|---|
| `OPEN`     | `"Open"` |
| `TERMINAL` | `"Ambiguous"` **or** `"Terminal"` |

Both non-Open statuses collapse to one `TERMINAL` class — matching
`srqc-projection.ts`'s `TERMINAL_INVOCATION_EVENTS` set (which includes
`FINALIZED_AMBIGUOUS`). The distinction preserved is *frozen vs live*; the
distinction dropped is *why* it froze (clean terminal vs ambiguous freeze) —
that "why" is recovered separately by `exposurePhase`, not by `claimPhase`.

**`exposurePhase` (3 classes)** — `AlphaExposurePhase`
(`LiveModelRefinesAbstract.tla:130`), an existential over `TargetInv`'s
attempts on the *pair* `(attemptOutcome[att], state[att])`:

| abstract | concrete witness among `TargetInv`'s attempts |
|---|---|
| `AMBIGUOUS_HELD` | `∃ att : attemptOutcome[att]="Ambiguous" ∧ state[att]="HELD"` |
| `HELD`           | no ambiguous-held witness, but `∃ att : state[att]="HELD"` |
| `NONE`           | no attempt of `TargetInv` is `HELD` |

The product `claimPhase × exposurePhase` (2 × 3) is the finite quotient of the
lifecycle that the abstract spec's five variables live over (72 typed states
total, `2×3×3×2×2`; `AbstractClaimExposure.tla:43`).

**Abstracted away** (not represented in any abstract variable): specific
invocation / attempt / actor / fingerprint *identities* (the abstract domain
has no `Attempts`, `Actors`, or `Fingerprints` sets — it is a single-invocation
shape with no id at all); credit *balances* and counters (`reserved`,
`admittedCount`, `VerifiedBalance`); `releaseReason`/`releaseBy`; and timers
(none are modeled at either level — lease/TTL machinery is out of scope
per `../README.md`). **Preserved**: the OPEN/TERMINAL frozenness of the claim,
the three-way exposure classification, whether the fingerprint is bound
(`AlphaFingerprintBound`, `:151`), and whether a mismatched-fingerprint claim
was ever rejected (`AlphaHasRejectedFp`, `:153`).

## 3. What safety transfers through `alpha`

The refinement mapping `LiveModelRefinesAbstract.tla` binds each of
`AbstractClaimExposure`'s five variables to its `Alpha*` state function
(`INSTANCE … WITH`, `:160`) and TLC checks `Abstract!Spec` as a property of the
concrete `LiveModelDispatchUnderAmbiguity.Spec` — step-simulation of the
refinement mapping. Result (`LiveModelRefinesAbstract.tlc-receipt.txt`, quoted
in `REFINEMENT.md` §"exact commands"):

```
Model checking completed. No error has been found.
1306029 states generated, 323194 distinct states found, 0 states left on queue.
The depth of the complete state graph search is 21.
```

at constants `Invocations={i1,i2}`, `Attempts={a1,a2,a3}`,
`Fingerprints={fp1,fp2}`, `Actors={act1,act2}`, `TrustedActors={act1}`,
`VerifiedBalance=2`, `RequestCost=1`, `TargetInv=i1`.

Because `alpha` is a refinement mapping, every invariant of the abstract spec
is thereby an invariant of the concrete spec *read through `alpha`*, at that
bound. Concretely, the two load-bearing conjuncts of `IndInv_alpha`
(`AbstractClaimExposure.tla:286`) and their concrete images:

- **`NeverGE2`** (`pendingCountClass ≠ "GE2"`) — concrete image
  `AlphaPendingCountClass ≠ "GE2"`, i.e.
  `concretePending(TargetInv) ≤ 1`: the projection of
  `AtMostOnePendingPerInvocation` onto `TargetInv`.
- **`RejectedImpliesBoundAlpha`** (`hasRejectedFp ⇒ fingerprintBound`) —
  concrete image
  `(∃ fp : ⟨TargetInv,fp⟩ ∈ rejectedRequests) ⇒ invocationFp[TargetInv] ≠ NoFp`:
  the projection of `RejectedImpliesBound`. (`AmbiguousHeldImpliesTerminal`, the
  third conjunct, likewise projects `AmbiguousExposureHeldUntilTrustedResolution`'s
  held half.)

Be precise about the strength of this transfer: it is a **bounded TLC
step-simulation result at the fixed constants above** — TLC generated every
behavior reachable from `Init` to search-depth 21 and confirmed each step was
either an `alpha`-stutter or one `AbstractClaimExposure` action. It is **not** a
proof that the transfer holds for all `N` (arbitrary
`Invocations`/`Attempts`/… cardinalities), and it is not a proof that
`AbstractClaimExposure!Next` is the tightest abstraction — it is deliberately a
weakened over-approximation (`ClearHeldExposure` / `TrustedReleaseAmbiguous`
were relaxed to `exposurePhase' ∈ {"NONE","HELD"}` after a real 9-step
counterexample; `ABSTRACT_STRENGTHENING_LOG.md` §2). The abstract-side
`IndInv_alpha` closure (`AbstractClaimExposureInductive.tlc-receipt.txt`: 30
distinct candidate states, depth-1 closure, no error) is separately exhaustive
over the abstract spec's *entire* 72-state domain — that half carries no
constant bound, because the abstract spec has no constants. The *bound* is
entirely on the concrete-to-abstract simulation, not on the abstract invariant.

## 4. What does NOT transfer / is out of scope

- **The concrete step-simulation bound is fixed.** §3's receipt covers
  `Invocations={i1,i2}`, `Attempts={a1,a2,a3}`, `Fingerprints={fp1,fp2}`,
  `VerifiedBalance=2` and no more. Larger id sets are not covered.

- **The M2 compositional induction closed at a DOCUMENTED SHRUNK bound.** The
  induction that proves the *concrete composed* safety invariants
  (`LiveModelDispatchUnderAmbiguityInductive.tla`) does not run at §3's
  reachability bound. Quoting its header (`:34–36`) and log
  (`INDUCTIVE_STRENGTHENING_LOG.md` §"Constants: a documented shrink") verbatim:

  ```
  Invocations = {i1}, Attempts = {a1,a2}, Fingerprints = {fp1},
  Actors = {act1,act2}, TrustedActors = {act1}, VerifiedBalance = 1, RequestCost = 1
  ```

  — a shrink of `LiveModelDispatchUnderAmbiguity.cfg`'s
  (`{i1,i2}`, `{a1,a2,a3}`, `{fp1,fp2}`, `VerifiedBalance=2`), because the
  composed state has 12 variables and TLC enumerates the INIT-predicate
  candidate set single-threaded — the full reachability bound is ~10^11 raw
  candidate states, not enumerable here; the shrunk bound's candidate set is
  ~4.6M (final closing run: `10039464 states generated, 4635468 distinct …
  depth … 1`, `LiveModelDispatchUnderAmbiguityInductive.tlc-receipt.txt`).

- **The shrunk M2 bound does NOT re-exercise the fingerprint-conflict class.**
  With one fingerprint, `SameIdDifferentFingerprintNeverExecutes` /
  `RejectedImpliesBound` are vacuous; that class is proved inductive
  *separately* in `../ai-invocation/InvocationClaimInductive.tla` at 2
  fingerprints, is lifted through the composition, and is carried/checked in M2
  only trivially (`INDUCTIVE_STRENGTHENING_LOG.md` §"What it does NOT
  re-exercise"). So the abstract `RejectedImpliesBoundAlpha` fact of §3 rests, on
  the concrete side, on the base module's fingerprint induction plus M2's
  lifting — not on M2 re-checking fingerprint conflict at its own bound.

- **Not covered at all** (inherited scope boundary from `../README.md`
  "What this scaffold intentionally does NOT cover"): multi-window fixed-order
  budget composition (daily ∧ monthly ∧ surface caps in one spend); lease-steal
  fencing and lease-expiry/TTL sweep; snapshot admissibility (expiry, staleness,
  scope coverage, reconciliation drift); and liveness. None of these are
  represented in the abstract domain, and none transfer through `alpha`.

## 5. Dual-bound note — single bound only

The optional second-bound cross-check (re-running M2's inductive closure at
`Attempts={a1,a2,a3}` under the same `IndInv`) was **not** run. It is not
tractable here: M2's own header and log document that adding attempts multiplies
the INIT-predicate enumeration into the ~10^11-candidate regime (the five extra
composed variables `reserved,state,admittedCount,releaseReason,releaseBy`
multiply the invocation-plane product by ~10^4), and the 2-attempt closing run
already ran ~8.5 min with a ~5.8M-candidate attempt-1 enumeration at ~30 min
single-threaded. A 3-attempt closure is therefore neither quick nor enumerable
in this environment, so no second receipt was produced — and none is fabricated.
The single documented bound (M2's 2-attempt shrink, §4) is the whole
concrete-induction evidence base. A second bound, or a genuinely
parameterized (all-`N`) result, would need Apalache or TLAPS and is future work
(`../INDUCTION_DOCTRINE.md` §5 DEEP, §8).

## 6. NON-CLAIMS

Matching the repo's honesty norm (`../README.md`, `../INDUCTION_DOCTRINE.md`
§8), this document explicitly does **not** claim:

- **NOT a parameterized ("for all N") theorem.** Everything here is bounded TLC
  at fixed constants: the abstract `IndInv_alpha` closure is exhaustive over the
  abstract spec's finite 72-state domain (no constants), but the
  concrete→abstract *transfer* (§3 step-simulation) and the concrete composed
  *induction* (§4, M2) are both fixed-constants results. No statement holds for
  arbitrary cardinalities of `Invocations`/`Attempts`/`Fingerprints`/`Actors`.

- **NOT a cutoff theorem.** This is a *lifted-quotient* argument — an
  abstraction function checked by step-simulation at fixed bounds — not a proof
  that any finite bound is a sound cutoff for all larger instances. No cutoff is
  proved and none is claimed.

- **NOT tightest-abstraction / bisimulation.** `AbstractClaimExposure!Next` is a
  deliberate over-approximation (nondeterministic `ClearHeldExposure` /
  `TrustedReleaseAmbiguous`); step-simulation shows the concrete spec refines
  it, not that they are equivalent.

- **Apalache / TLAPS unavailable.** No symbolic or deductive proof exists in
  this environment (no Z3/SMT; `tla2tools.jar` itself arrives via the TLA+
  project mirror, `../README.md`). TLC step-simulation and TLC inductive closure
  are the entire verification story.

- **No production behavior is affected by any of this.** `formal/` is pure
  specification and proof artifacts; nothing here touches
  `apps/web`/`packages`, and the mapping to `srqc-projection.ts` /
  `invocation-pipeline.ts` / `credit-admission.ts` is descriptive only.

---

## Machine-checked pending-class quotient (W4)

The prior sections argue the quotient on paper, riding the M1/M2 receipts. This
section adds a **direct, dedicated TLC model-check** of the pending-class
dimension in isolation: `PendingClassQuotient.tla` (+ two `.cfg`s, two receipts).
Every claim below is backed by a receipt file with the actual TLC console output.

### The bijection

The runtime type `AbstractControlState.pendingCountClass ∈ {"ZERO","ONE","GE2"}`
— produced per invocation by `apps/web/lib/ai-control-plane/srqc-projection.ts`'s
`projectWindow` — **is** this TLA+ quotient's `PendingClass == {"ZERO","ONE","GE2"}`.
The abstraction α maps a concrete pending-attempt count `k` (the natural number
`concretePending(inv)` of §1) to a class, three ways:

| concrete `k` | α(k) | TLA+ `pendingClass[i]` |
|---|---|---|
| `0` | `ZERO` | `"ZERO"` |
| `1` | `ONE`  | `"ONE"`  |
| `k ≥ 2` | `GE2` | `"GE2"` |

`GE2` is a single **absorbing** class, deliberately **not** normalized away:
`StartAttempt` walks `ZERO → ONE → GE2` and `GE2` self-loops; `EndAttempt` walks
`GE2 → ONE → ZERO`. The values are identical strings on both sides of the
bijection — the model uses the exact runtime enum, never a numeric domain.

### Result

Two exhaustive finite TLC runs at `CONSTANTS InvIds = {i1, i2, i3}`, over
`pendingClass ∈ [InvIds -> PendingClass]`, `Init = all ZERO`:

| run | NEXT | outcome | states (gen / distinct) | receipt |
|---|---|---|---|---|
| **controlled** | `NextControlled` (start admitted **only** from `ZERO`) | `AtMostOne` **HOLDS** — `No error has been found` | 25 / **8** | `PendingClassQuotient.controlled.tlc-receipt.txt` |
| **uncontrolled** | `Next` (start walks `ZERO→ONE→GE2`) | `AtMostOne` **VIOLATED** — CTI reaches `GE2` | 11 / 11 | `PendingClassQuotient.uncontrolled.tlc-receipt.txt` |

The controlled run's **8** distinct states are exactly `2^|InvIds| = 2^3`: every
invocation is confined to `{ZERO, ONE}`, so `GE2` is never reached — establishing,
by exhaustive finite model-check, the documented claim
`SpecControlled => [](TypeOK /\ AtMostOne)`. The uncontrolled run's
counterexample tail reaches `pendingClass = (i1 :> "GE2" @@ i2 :> "ZERO" @@
i3 :> "ZERO")` via `StartAttempt(i1): ZERO → ONE → GE2`, so the `ZERO`-only
admission guard is **load-bearing** — without it `GE2` is reachable.

### NON-CLAIMS (honesty register)

- **Finite `|InvIds|` only.** Checked at `InvIds = {i1, i2, i3}`. No statement
  holds for arbitrary `|InvIds|`; this is **not** a ∀N parameterized result and
  **not** a cutoff theorem (no finite bound is proved sound for all larger
  instances).
- **Class-quotient SAFETY model-check, not an injectivity proof.** This checks
  that the *class* never reaches `GE2` under control; it does **not** prove
  attempt-id injectivity, nor reconstruct concrete attempt identities — `GE2` is
  a single collapsed class by construction.
- **Finite-constant model-check, not a deductive proof.** The THEOREM comment in
  `PendingClassQuotient.tla` is established by TLC's exhaustive enumeration of the
  reachable state space at the model constants — honestly a finite-constant
  model-check, **not** a TLAPS proof.
- **TLAPS / Apalache unavailable** in this environment (no Z3/SMT). Finite TLC
  receipts are the entire verification story for this section.

---

## Cutoff ladder (W4+)

The W4 section above checks the pending-class quotient at a single fixed
`|InvIds| = 3`. On top of it sits a **finite cutoff ladder**, all real TLC:

- **`CUTOFF_CLAIM.md`** — the load-bearing claim: `AtMostOneFamily.tla`
  (`SpecC ⇒ [](TypeOK /\ AtMostOne)`) model-checked exhaustively for every
  `|InvIds| = 1 .. N*`, with **N\* = 8**. Receipts:
  `../receipts/cutoff-matrix/n1.txt … n8.txt` + `summary.txt`
  (`N_STAR=8`, `CUTOFF_MATRIX_OK`), produced by
  `scripts/formal/run-cutoff-matrix.sh`.
- **`PARAM_STATUS.md`** + **`AtMostOneParam.tla`** — the *deferred* deductive
  target `ASSUME IsFiniteSet(InvIds) ⇒ THEOREM SpecC => []AtMostOne`.
  `AtMostOneParam.tla` is an **UNVERIFIED PROOF TARGET** (loud header): tlapm /
  TLAPS is not available in this environment, so it is not machine-checked. See
  `../TLAPS_DEFERRED.md`.

**Honest boundary.** The TLC finite cutoff (to N\* = 8) is real and exhaustive
per cardinality. The TLAPS result over arbitrary finite `InvIds` is a deferred
target, unavailable here — no `tlapm` log exists and none is fabricated. Absence
of TLAPS does not invalidate the finite TLC cutoff receipts.
