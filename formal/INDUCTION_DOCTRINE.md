# Induction & Generalization Doctrine

How this repo takes a safety property from "held in every state a bounded
search visited" to "PROVED for all reachable states at any depth, for fixed
constants" — using TLC alone, with receipts. Nothing in this document is
aspirational: every technique below names the artifact in this repo where it
was actually applied, and the two strengthening logs are the primary evidence
that the loop was run for real, not narrated after the fact.

Grounding artifacts, all in-tree:

| Artifact | Role |
|---|---|
| `credit-budget/CreditReservation.tla` + `.cfg` + `.tlc-receipt.txt` | base spec, bounded reachability receipt |
| `credit-budget/CreditReservationInductive.tla` + `.cfg`, `.attempt1.cfg`, `.attempt2.cfg`, `.base.cfg` | induction module, final + every failed candidate |
| `credit-budget/CreditReservationInductive.tlc-receipt.txt` | verbatim closure + base-case receipts |
| `credit-budget/INDUCTIVE_STRENGTHENING_LOG.md` | the real CTI loop, CTIs verbatim |
| `ai-invocation/InvocationClaim.tla` + `.cfg` + `.tlc-receipt.txt` + `.counterexample-found-during-development.txt` | base spec, bounded receipt, a genuine development-time counterexample |
| `ai-invocation/InvocationClaimInductive.tla` + `.cfg`, `.attempt1.cfg`, `.attempt2.cfg`, `.base.cfg`, `.orig3.cfg`, `.orig3.base.cfg` | induction module + candidates, both constant bounds |
| `ai-invocation/InvocationClaimInductive.tlc-receipt.txt` | verbatim closure + base-case receipts |
| `ai-invocation/INDUCTIVE_STRENGTHENING_LOG.md` | the real CTI loop, CTIs verbatim |
| `live-sports/LiveModelDispatchUnderAmbiguity.tla` | composed spec (INSTANCE of both base modules); induction deferred, see §7 |
| `../docs/gse/formal/PR3Waitlist.tla` | earlier pure-TLA+ runbook model precedent |

## 1. Why induction, not just model checking

A bounded reachability run (e.g. `CreditReservation.tlc-receipt.txt`: 348
reachable states, depth 9, no error) certifies exactly the states BFS visited.
That certificate is complete for those constants — TLC's BFS from `Init` is
exhaustive — but it is *extensional*: it says nothing about WHY the property
holds, and it gives no handle for composition, review, or change-impact
reasoning. An inductive invariant is *intensional*: `IndInv` names the precise
per-state facts (the "glue") from which one arbitrary step of the system
cannot escape. Concretely, in `CreditReservationInductive.tla` the glue
`CommittedCoveredByReserved` is the formal statement of the operational
argument that the single atomic conditional UPDATE is what prevents
over-admission — the strengthening log shows the safety property being
re-established in the successor *from the glue plus the guard*, which is the
proof-shaped artifact a code reviewer can hold against
`credit-admission.ts`.

## 2. The TLC-as-induction-checker recipe

To check `IndInv /\ [Next]_vars => IndInv'` with TLC (no symbolic tools):

1. Write a sibling module that `EXTENDS` the spec under test — never edit the
   spec itself (`CreditReservationInductive.tla`, `InvocationClaimInductive.tla`).
2. Define the candidate as a conjunction whose LEADING conjuncts constrain
   every variable to a finite set (`x \in S`, `x = e`, or `x \subseteq S` with
   `S` finite). If the spec's `TypeOK` is already finite, use it directly
   (`InvocationClaim`'s is — including `rejectedRequests \subseteq
   Invocations \X Fingerprints`, which TLC accepts as a subset generator). If
   it is not, write a finite refinement (`TypeOKFinite` in
   `CreditReservationInductive.tla`, replacing `reserved \in Nat` with
   `reserved \in 0..VerifiedBalance`).
3. Config: `INIT <candidate>`, `NEXT Next`, and every conjunct listed as a
   separate `INVARIANT` (separate listing makes TLC name the violated
   conjunct — free CTI diagnosis). See `CreditReservationInductive.cfg`.
4. Run plain TLC (`-workers auto -deadlock`; the `-deadlock` flag because
   candidate states with no enabled action are fine, not failures).
5. Read the result:
   - a violation trace is a length-2 CTI: State 1 satisfies the candidate,
     State 2 is a one-step successor that does not;
   - `No error has been found` means the candidate is inductive for these
     constants. The telltale `The depth of the complete state graph search
     is 1` is one-step closure made visible: every successor of every
     candidate state was already in the initial (= candidate) state set.
6. Base case: run the ORIGINAL `Spec` with the same conjuncts as invariants
   (`*.base.cfg`). Initial states are reachable, so a green run subsumes
   `Init => IndInv` — and simultaneously proves the auxiliary predicates are
   reachable truths, not vacuous strengthening.
7. `IndInv => Safety` should be immediate: keep every target safety property
   a conjunct of `IndInv`.

Both receipts in this repo carry runs 1-6 verbatim, with the exact commands.

## 3. The CTI loop (executed, not described)

Start from the weakest plausible candidate — finite typing plus the safety
properties themselves — and let real counterexamples-to-induction drive every
strengthening. The two logs record four genuine CTIs across the two modules:

- `credit-budget` CTI #1: `admittedCount = 4` with every attempt `Unstarted`
  — a counter with no glue to the per-item states it summarizes; one
  `Authorize` exits the finite type bound.
- `credit-budget` CTI #2: an attempt `HELD` while `reserved = 0` — a phantom
  hold; `Release` drives the ledger to -1. The same missing glue also left an
  over-admission class open; one predicate closed both faces.
- `ai-invocation` CTI #1: both attempts `Pending` on one invocation;
  resolving one `Ambiguous` froze the invocation with the other still in
  flight. This is the unreachable-side mirror of the genuine reachable bug
  TLC found during the spec's development (preserved in
  `InvocationClaim.counterexample-found-during-development.txt`) — the same
  interference class surfacing on both sides of the reachability fence is
  strong evidence the glue predicate (`AtMostOnePendingPerInvocation`)
  captures something essential about the design, namely the sequential
  provider-route walk.
- `ai-invocation` CTI #2: a rejected fingerprint pair recorded against a
  still-unbound invocation id, letting a later first-claim bind exactly the
  rejected fingerprint.

Discipline, visible in every log entry: quote the CTI verbatim; separate the
*core* of the CTI (what actually breaks the step) from unreachable *debris*
(weirdness the candidate tolerates harmlessly — e.g. `ai-invocation` CTI #1's
undispatched-but-Pending attempt); strengthen against the core only.

## 4. Generalization: the weakest-auxiliary preference

For each CTI, add the WEAKEST general predicate that blocks its whole class —
the MIC/generalization spirit of the IC3 family, hand-executed. Never patch
the specific CTI values; never add reachable truth the induction does not
need. Every strengthening decision in the logs shows the considered ladder:

- `credit-budget` CTI #1: three candidate predicates, strongest to weakest —
  exact ever-admitted equality, ever-admitted bound, started-attempts bound.
  Chosen: the weakest (`AdmittedCountBoundedByStarted`); the target
  properties never mention `admittedCount`, so pinning its exact meaning buys
  nothing.
- `credit-budget` CTI #2: inequality over equality
  (`CommittedCoveredByReserved`): ledger over-counting is harmless to both
  target properties, so the exact-equality reachable truth was rejected.
- `ai-invocation` CTI #1: the ladder ran the OTHER direction — the first
  attempt at weakening (cap in-flight attempts only for `Open` invocations)
  REOPENS the class via a `Terminal` invocation with phantom in-flight
  attempts; the log records why the quantifier must range over every status.
  That is a counterexample-to-generalization argument: the boundary of how
  weak the predicate may go was located and documented, not guessed.
- `ai-invocation` CTI #2: only the missing HALF of the reachable truth was
  added (`RejectedImpliesBound`, the `# NoFp` half); the `# fp` half is the
  safety conjunct itself and was already present.

Two quantitative signatures that the loop is doing real work, from the logs:
the candidate state set SHRINKS monotonically as glue lands (12,180 → 10,180 →
6,100; 1,815,552 → 1,787,904 → 698,400) while the reachable set stays fixed
(348; 9,457) — and the final envelope still over-approximates reachability
(~17x / ~74x), which is exactly right: an inductive invariant should be the
weakest workable envelope, not the strongest truth.

## 5. Effort regimes: SHALLOW / MEDIUM / DEEP by severity

Match verification effort to the severity of the invariant's failure, not to
enthusiasm:

- **SHALLOW — bounded reachability.** TLC BFS from `Init`, invariants
  checked on visited states. Cheap, catches real bugs early (the preserved
  `InvocationClaim` development counterexample is a SHALLOW-regime catch).
  Right for: exploratory specs, low-severity properties, fast CI signal.
  Artifacts: the two original `.tlc-receipt.txt` files.
- **MEDIUM — inductive closure for fixed constants.** The §2 recipe plus the
  §3-§4 loop. Right for: invariants whose failure moves money or duplicates
  external side effects. Both control-plane modules sit here as of this
  session: the credit ledger's no-over-admission and the invocation plane's
  exactly-once-dispatch / fingerprint-conflict / ambiguous-freeze properties
  are now proved for all reachable states at any depth, for the checked
  constants. Artifacts: everything under `*Inductive.*` plus the two logs.
- **DEEP — parameterized or deductive proof.** Apalache (symbolic, SMT-backed
  induction for arbitrary constants) or TLAPS (deductive proof). NOT
  available in this environment — see §8 — so DEEP items are queued, not
  faked. Right for: invariants whose constants genuinely vary in production
  beyond what fixed-constant closure covers, or compositional obligations
  (§7) worth a machine-checked proof.

Severity is the dial: the credit ledger and the dispatch plane earned MEDIUM
because their failure modes are monetary (double-admission, double-spend of
an ambiguous charge) or side-effecting (duplicate external provider calls).
A display-layer state machine would not.

## 6. PlusCal vs pure TLA+

Every module in this repo's `formal/` — and the earlier
`docs/gse/formal/PR3Waitlist.tla` runbook model — is pure TLA+, deliberately:

- The claims under test are ATOMICITY claims. `CreditReservation`'s
  `Authorize` is one guarded action precisely because the implementation is
  one conditional `UPDATE ... WHERE` — the action boundary IS the claim.
  PlusCal's label-driven atomicity would interpose translator-chosen
  granularity between the spec and that claim, and the induction recipe
  (INIT over a hand-shaped candidate, per-conjunct invariants) works
  directly on states of hand-named variables, with no generated `pc`
  bookkeeping to strengthen over.
- The induction candidates glue SMALL, purposeful variable sets
  (`reserved` ↔ committed attempts; `rejectedRequests` ↔ `invocationFp`).
  Hand-authored actions keep those variables first-class.

PlusCal earns its place when the object under study is intrinsically a
sequential algorithm with steps and loops — a migration runbook, a drain
procedure — where `pc` is the honest state. The PR3 runbook chose pure TLA+
even there; either would have been defensible. Doctrine: default to pure
TLA+ for concurrency contracts whose atomic boundaries are the theorem;
consider PlusCal only for algorithmic/sequential models, and accept that its
translation output makes inductive strengthening noisier.

## 7. Safety before liveness — and composition next

All eight properties proved inductive this session are SAFETY properties.
Liveness ("every attempt eventually terminal") is explicitly out of scope, as
`formal/README.md` has said since the foundry landed: it needs fairness
assumptions and temporal checking, has a different cost profile, and none of
the monetary risks live there. The `-deadlock` flag in every command is part
of the same stance — states with nothing left to do are legitimate endings.

Next in line, explicitly NOT attempted this session:
`live-sports/LiveModelDispatchUnderAmbiguity.tla` instantiates BOTH base
modules (`IC == INSTANCE InvocationClaim`, `CR == INSTANCE
CreditReservation`). Its induction should be compositional — lift each base
IndInv through the instantiation substitution, conjoin, and strengthen only
the cross-module glue — rather than re-deriving a flat candidate over the
product state space. Both strengthening logs record this as the designated
next step.

## 8. TLC-only, honestly scoped

Neither Apalache nor TLAPS runs in this environment (no Z3/SMT toolchain
provisioned; GitHub release assets are egress-restricted here —
`formal/README.md` documents how even `tla2tools.jar` had to arrive via the
TLA+ project's own mirror). The doctrine does not pretend otherwise, and no
artifact in this repo claims a parameterized result.

What the TLC-only recipe still buys, stated exactly: the closure check
enumerates EVERY state satisfying `IndInv` — reachable or not — so the result
`IndInv /\ [Next]_vars => IndInv'` carries no reachability horizon and no
depth bound. Combined with the base-case run, the safety properties are
proved for ALL reachable states at ANY depth — *for the fixed constants in
the `.cfg`*. The single limitation is the universe of constants, and it is
stated in every module header and both logs ("not a parameterized proof; that
would need Apalache or TLAPS"). When a DEEP-regime need arises (§5), the
candidates and logs produced here are the direct input: Apalache's induction
mode consumes exactly this shape of `IndInv`.

## 9. Owner strategic context (attributed, non-technical)

The owner frames this research arc as deliberately retracing the
assurance-tooling lineage of the ARCOS / PROVERS / PEARLS program families —
certification-oriented formal methods made continuous and evidence-producing
— with an eye toward NDC/OT-style positioning, where privately matured,
receipt-backed verification practice is presented as non-developmental
capability rather than bespoke contract deliverables. That is the owner's
stated strategy and vocabulary, recorded here for orientation only: it is not
a technical claim about this repository, and nothing in `formal/` depends on
it. The technical content of this doctrine stands entirely on the in-tree
artifacts named above.
