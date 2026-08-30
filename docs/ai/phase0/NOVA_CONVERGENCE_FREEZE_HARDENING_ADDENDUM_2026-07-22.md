# NOVA Convergence Freeze — Hardening Addendum — 2026-07-22

Status: **APPENDED, BINDING**. This addendum corrects the truth-state language
of `NOVA_CONVERGENCE_FREEZE_2026-07-22.md` without deleting or rewriting it.
The freeze document itself remains frozen and append-only; where this addendum
and the freeze conflict on **draft state** (not on ownership), this addendum
wins. Canonical ownership (freeze §2), consumption contracts (freeze §3), the
split sequence (freeze §4), and the collision policy (freeze §6) are unchanged
and remain binding.

Authority: hardening directive 2026-07-22 §2 ("Truth corrections to append to
the freeze"). No merge, deploy, or production mutation is performed or
authorized by this document.

---

## A1. Corrected draft-state language (directive §2.1)

The freeze's opening paragraph describes shared infrastructure as "landed by
the Phase 1 remediation PRs (#159 actor, #161 outbox)". That word is
operationally wrong and is hereby retired. **Nothing in this stack is landed.**
`main` remains at `c19a00d`; every referenced PR is an open, unmerged draft.

The operational meaning of "landed" is replaced, everywhere in the Phase 0/1/2
truth documents, by the following five draft-state labels:

- `IMPLEMENTED_ON_DRAFT_BRANCH` — the code exists on an open draft branch.
- `CI_GREEN_IN_ISOLATION` — that branch's own CI passed on its own head.
- `NOT_MERGED` — nothing has reached `main`.
- `NOT_CUMULATIVELY_VALIDATED` — the branches have never been rebased and
  proven sequentially against each other on a cumulative integration branch.
- `NOT_PRODUCTION_ACTIVE` — no behavior, migration, schedule, or flag from
  these branches runs in production.

All Phase 1 remediation PRs (#159, #160, #161) and the Phase 2 control-plane
stack (#162, #163, #164) currently carry **all five labels simultaneously**.

Two consequences, stated exactly:

1. **The ownership freeze remains binding.** Domain ownership (freeze §2) was
   frozen on concepts, and concepts do not need a merge to be canonical.
2. **The exact draft implementations remain provisional** until their
   per-PR hardening gates (directive §4–§10) pass. Being the canonical owner
   of a domain does not certify the current bytes on the owning branch.

## A2. Explicit PR-D sequencing (directive §2.2)

The freeze (§8) says PR-D is "UNBLOCKED". That is true only as a
*build-in-draft* statement, and the freeze's four-line summary (NOVA names the
credit state; S1 adds `CreditGrantState`; PR-D consumes it) left the ordering
implicit. The sequencing is now explicit and mandatory:

```text
S1 canonical credit contracts
    ↓
PR-D admission/reservation port compiles against S1
    ↓
S5 materializes NOVA-owned credit persistence
    ↓
PR-D activation tests against the real S5 adapter
    ↓
only then may CONFIRMED_CREDITS_ONLY become reachable
```

Binding rules:

- Each arrow is a hard precondition; no stage may be skipped or reordered.
- **PR-D may not mint a temporary competing credit vocabulary** — not even as
  a stopgap while waiting for S1 or S5. The NOVA-name-wins rule (freeze §6)
  applies at every stage.
- Until the real S5 adapter exists and PR-D's activation tests pass against
  it, `CONFIRMED_CREDITS_ONLY` remains unreachable in production.
- Registry note: S1 exists as draft PR **#165** and PR-D as draft PR **#166**;
  both carry the five A1 labels, and #166's fake-adapter tests do not satisfy
  the "activation tests against the real S5 adapter" stage.

## A3. Freeze concepts, not defects (directive §2.3)

The freeze's shared-infrastructure language (§2, §3.3) reads as if the current
implementations were certified. It is amended: **ownership and principles are
frozen; the present implementations are pending hardening.** Specifically:

- **`TrustedActor` (#159):** ownership as the singular actor/identity contract
  is frozen. The #159 implementation is **pending hardening** — the anonymous
  reporting limiter (caller-supplied fingerprint, per-instance memory) and the
  ungoverned SERVICE/SYSTEM constructors (directive §4) must be corrected
  before it certifies anything.
- **Transactional outbox (#161):** ownership of outbox semantics and the
  append-only-evidence principles are frozen. The #161 **delivery semantics
  are pending hardening** — per-run identity from `randomUUID()`, cascade FKs
  on evidence, all-channels-marked-DELIVERED on failure, and stale-claim
  attempt overrun (directive §6) must be corrected first.
- **`AiInvocation` / `AiAttempt` / `AiFinancialAttribution` (#163):**
  ownership of the invocation/attempt/attribution ledger is frozen. #163's
  **current execution/idempotency mechanics are pending hardening** — the
  concurrent-claim race, the RUNNING-replay double dispatch, the
  provider-ignoring default dispatcher, and the swallowed authoritative-state
  failures (directive §9) must be corrected first.
- **`AiBudgetWindow` / `AiBudgetReservation` (#164):** ownership of atomic
  budget reservation is frozen. #164's **ambiguous-charge and settlement
  invariants are pending hardening** — AMBIGUOUS results releasing cash holds,
  settlement exceeding the held amount with no database cap invariant, and
  zero-dollar cash authorization (directive §10) must be corrected first.

No consumer may cite this freeze as evidence that any of these four
implementations, as currently written, are safe to merge or activate.

## A4. Inventory-agent failure receipt (directive §2.4) — IMMUTABLE

The #146 exact-identifier inventory in freeze §5 was ultimately produced by
deterministic repository reads after the inventory subagent died. The manual
recovery is valid, but it must not erase the failed subagent outcome. The
following agent-run receipt is recorded verbatim and is **immutable** — it may
be referenced but never edited, softened, or deleted:

```text
agent: #146 exact-identifier inventory
result: FAILED_CLOSED
reason: model switch / run died after 53 transcript lines
usable output: partial transcript only
fallback: founder/coding-agent surgical read
final inventory source: deterministic repository reads
```

Consequences:

- Freeze §5's inventory remains trustworthy **because** its final source is
  deterministic repository reads (`git diff`, `git grep` against `fbc3cfe`),
  not because the agent run succeeded. It did not succeed.
- This receipt joins the historical NOVA source-validation receipts in the
  `FAILED_CLOSED` ledger; none of them may be re-described as passing.
- Per directive §3, branch inventory and collision detection move to
  deterministic tooling (`scripts/nova/build-convergence-inventory.mjs` and
  its verifier); a model may interpret a future receipt, never manufacture it.
