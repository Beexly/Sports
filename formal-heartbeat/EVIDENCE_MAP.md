# Formal Heartbeat — Evidence Map

Status of each formal property this package touches, mapped to the **actual**
evidence that backs it. This is an honest engineering ledger, not a safety
certificate: every property is listed with its true tier, and nothing here is
described as stronger than the receipts in-tree support.

> **DISCLAIMER — read first.** This is an **internal engineering evidence
> map**. It is **NOT** a certification, accreditation, audit, or compliance
> attestation, and it **must not be presented to any external party as one**.
> "Bounded-model-checked" means checked exhaustively at small, explicitly
> stated constants — it is **not** an unbounded or inductive proof.
> "Shadow" / "inert" means detection-only with **no enforcement wired**. Where
> a property is shadow-only or bounded-only, this document says so in those
> words.

This package is dormant / lab-only: no writes, no alerts, no enforcement, no
I/O, no scheduler, no production wiring. See `README.md`.

---

## Evidence tiers (precise definitions)

| Tier | Meaning |
| --- | --- |
| **TLC-BOUNDED (committed receipt)** | Exhaustively model-checked by the real TLA+ model checker (TLC) over the **full reachable state space at small, fixed constants**, with the run log committed in-tree. NOT an unbounded proof. |
| **TLC-BOUNDED (config only)** | A committed bounded TLC model config exists and invariants were exercised on projected states, but **no exhaustive full-state-space run log for that exact module is committed in-tree**. Weaker than the row above. |
| **RUNTIME-SHADOW** | Re-checked at runtime by the Formal Heartbeat as **detection only**. Inert: it computes a verdict and a witness; it enforces nothing, alerts nothing, writes nothing. |
| **EMPIRICAL (Monte-Carlo)** | A statistical property confirmed by a seeded simulation, reported with its measured value. Not a closed-form proof of the software; the underlying theorem is cited to the literature. |
| **NOT RUN** | Tooling that was **not** executed here (e.g. no binary in this environment). Explicitly listed so its absence is not mistaken for a pass. |

The Formal Heartbeat itself is **RUNTIME-SHADOW for every invariant it checks**,
independent of what static tier that invariant also carries. A property can be
both TLC-bounded (statically, at small constants) *and* runtime-shadow (the
heartbeat re-checks projected observed states and burns an SLO error budget) —
neither of those is enforcement.

---

## A. Base-module invariants — TLC-BOUNDED (committed receipts)

These are the three base properties the heartbeat re-exports
(`BaseLedgerNeverExceedsBalance`, `BaseNeverOverAdmit`,
`BaseAmbiguousAttemptStopsFallback`). Each is backed by a committed TLC run log
over the **base** module that defines it.

| Heartbeat invariant | Backing spec / invariant | TLC result (committed) |
| --- | --- | --- |
| `BaseAmbiguousAttemptStopsFallback` | `formal/ai-invocation/InvocationClaim.tla` — `AmbiguousAttemptStopsFallback` | PASS — 200,649 states generated, **51,601 distinct**, search depth 15. Bound: 2 invocations, 3 attempts, 2 fingerprints, 2 actors. Log: `InvocationClaim.tlc-receipt.txt`. |
| `BaseNeverOverAdmit` | `formal/credit-budget/CreditReservation.tla` — `NeverOverAdmit` | PASS — 921 states generated, **348 distinct**, search depth 9. Bound: 4 attempts vs. verified balance 3, cost 1. Log: `CreditReservation.tlc-receipt.txt`. |
| `BaseLedgerNeverExceedsBalance` | `formal/credit-budget/CreditReservation.tla` — `LedgerNeverExceedsBalance` | PASS — same run as above (`CreditReservation.tlc-receipt.txt`). |

True statement: *"bounded-model-checked via TLC over the full reachable state
space at the stated small constants — NOT an unbounded proof."* During
development TLC also caught a real 6-step counterexample in an earlier
`InvocationClaim` draft (preserved in
`InvocationClaim.counterexample-found-during-development.txt`); the corrected
spec is the one whose PASS receipt is cited above.

---

## B. Composed-spec invariants — TLC-BOUNDED (config only)

The four composed invariants
(`AmbiguousExposureHeldUntilTrustedResolution`,
`ReservedNeverExceedsBudgetWindowCap`, `AvailableBudgetNeverNegative`,
`NoDispatchWithoutExposureHold`) are declared in
`formal/live-sports/LiveModelDispatchUnderAmbiguity.tla`, which composes the two
base modules above.

- A bounded TLC model config is committed:
  `LiveModelDispatchUnderAmbiguity.cfg` (Invocations `{i1,i2}`, Attempts
  `{a1,a2,a3}`, Fingerprints `{fp1,fp2}`, Actors `{act1,act2}`, TrustedActors
  `{act1}`, VerifiedBalance `2`, RequestCost `1`), declaring `SPECIFICATION
  Spec` and all four composed invariants plus the three base ones and `TypeOK`.
- Per this package's `README.md`, TLC was used to evaluate these invariants on
  **projected `ConstInit` states**: a conformant projected state passes every
  invariant ("No error has been found"), and a seeded state with an ambiguous
  exposure hold released without a trusted actor is correctly caught
  ("Invariant AmbiguousExposureHeldUntilTrustedResolution is violated").
- **What is NOT in-tree:** an exhaustive full-reachable-state TLC run log for
  the **composed** module (the kind committed for the two base modules in
  section A). The composed module's own header additionally marks its
  implementation mapping as *"informational — not machine-checked."*

True statement: *"the composed spec ships a committed bounded TLC config and its
invariants were exercised on projected states; a committed exhaustive
reachable-state receipt for the composed module is not present in-tree, and this
is not an unbounded proof."* Do not describe these four as "machine-checked over
the full state space" — that receipt is committed for the base modules, not for
the composed module.

---

## C. Extension invariants — RUNTIME-SHADOW only (no TLA+ backing)

Added in this extension. **These two are NOT in any TLA+ spec, were NOT run
through TLC, and were NOT run through Apalache.** They are runtime-detection
predicates grounded in real repository code, exercised by unit tests only.

| Invariant | Grounded in (real code) | Evidence |
| --- | --- | --- |
| `NoSelfApproval` | `apps/web/lib/opportunity-engine/founder-command.ts` (`FounderQueueDecision` OWNER-vs-agent actor split) + PR #175 `apps/web/lib/constellation/autonomy-ladder.ts` (owner-only boundary: an owner-only grant can never be auto-approved by the acting agent) | RUNTIME-SHADOW. Unit tests: a window whose grants all have a distinct approver and grantee passes; a synthetic self-approval (approver identity == grantee identity on an authority-conferring decision) is detected RED with a witness and drives the e-process toward reject. Detection only — enforces nothing. |
| `OutboxDeliveryFailureCannotBecomeDelivered` | `apps/web/lib/settlement-outbox/worker.ts` + `packages/ingestion-pipeline/src/settlement-evidence.ts` (PR #161 delivery state machine; `PERMANENT_FAILED` / `DEAD_LETTER` are terminal, `DELIVERED` rows are never re-claimable) | RUNTIME-SHADOW. Unit tests: a window where failed deliveries stay failed passes; a synthetic per-recipient `terminal-failure → DELIVERED` transition is detected RED with a witness and drives the e-process toward reject. Detection only — enforces nothing. |

True statement: *"grounded in real code and covered by tests, but shadow-only —
not spec'd in TLA+, not TLC- or Apalache-checked, and not enforced anywhere."*

---

## D. Sequential-confidence budget — EMPIRICAL (Monte-Carlo)

The e-process kernel (`src/e-process.ts`) that burns the "cognitive SLO error
budget" is a genuine e-process (test supermartingale); its anytime-valid
false-positive guarantee is Ville's inequality, cited to the game-theoretic
statistics literature in the source header.

- **Measured false-positive rate:** empirically **0.0766 ≤ α = 0.10**, over
  **5,000 seeded streams** at the null boundary (`p = p0 = 0.1`), horizon 500,
  peeking after every observation (`src/tests/e-process.test.ts`).
- **Measured power:** rejects **1.0000** of streams under H1 (`pAlt = 0.25`) in
  the same test.

True statement: *"empirically 0.0766 ≤ 0.10 over 5,000 seeded streams; the
anytime-valid bound is Ville's inequality (cited), and this row is a
simulation result, not a machine-checked proof of the implementation."*

---

## E. Explicitly NOT claimed

- **Apalache (unbounded / inductive model checking): NOT RUN.** No Apalache
  binary is available in this environment; the only TLA+ toolchain used here is
  TLC via `tla2tools.jar` (see `formal/README.md`). No inductive-invariant
  proof exists for any property above.
- **No enforcement anywhere.** The Formal Heartbeat is inert: it produces a
  pass/fail result, per-violation witnesses, and an updated e-process state. It
  does not alert, gate, block, roll back, or write. It is monitoring/detection
  only, by design (Decisions B–F).
- **No unbounded / closed-form safety proof** of the running software for any
  property. The strongest static evidence in-tree is TLC over small bounded
  constant sets (section A).
- **Not a customer-facing or external claim.** Nothing here is copy for a
  product surface, a partner, or a filing.

---

## F. Owner's stated strategic targeting context (attributed — not a technical claim)

The package owner has stated that these formal-methods properties are intended
to help support future **NSF / AFWERX / DIU / DARPA / OT** conversations. That
is recorded here as the owner's **strategic intent**, and is deliberately
**not** a technical claim in this document. Nothing in that intent upgrades any
tier above: a shadow-only invariant is still shadow-only, a bounded check is
still bounded, and Apalache is still not run. Any external-facing material would
need its own separate, accurate substantiation — this internal map is not it.

---

## G. Reproduce / receipts

- TLC receipts (base modules): `formal/ai-invocation/InvocationClaim.tlc-receipt.txt`,
  `formal/credit-budget/CreditReservation.tlc-receipt.txt`. Reproduce steps:
  `formal/README.md`.
- e-process Monte-Carlo: `cd formal-heartbeat && npm test` (the FPR line prints
  `empirical anytime-valid FPR = 0.0766`).
- Extension-invariant tests: `formal-heartbeat/src/tests/heartbeat.test.ts`
  (NoSelfApproval, OutboxDeliveryFailureCannotBecomeDelivered) and
  `receipt-export.test.ts` (the read seam).
