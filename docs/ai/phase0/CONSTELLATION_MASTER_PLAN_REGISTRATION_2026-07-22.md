# CONSTELLATION Master Plan — Registration Record — 2026-07-22

Status: **REGISTRATION RECORD, APPEND-ONLY.** This document registers the
CONSTELLATION master directive into the Phase 0 truth chain. It is a
**registration record, not a copy**: it records that the directive exists, what
it governs, and how its components bind to live repository state. Where the
directive's full text was transmitted only through the orchestrator (unit
tasking, CONSTELLATION §15-C0), the component is registered **by reference**
and this record must not be read as a canonical restatement of it.

Authority: CONSTELLATION master directive §15-C0 ("C0 truth registration"),
received 2026-07-22 by the C0 unit on the truth branch
(`docs/phase0-truth-convergence-2026-07-21`, PR #152).

Supersession note: this registration **extends — and does not delete,
rewrite, or supersede — the 2026-07-22 hardening directive registration**
(`NOVA_CONVERGENCE_FREEZE_HARDENING_ADDENDUM_2026-07-22.md` and the hardening
directive's per-PR gates recorded in `LIVE_PR_REGISTRY_2026-07-22.md`). All
prior freeze/hardening bindings remain in force; CONSTELLATION layers on top
of them.

No merge, deploy, production migration, billable activation, or external
action is performed or authorized by this document.

---

## 1. Governing command

The CONSTELLATION directive's governing command, as registered:

> Converge all live draft-branch work onto one truth model — one cockpit, one
> owner queue, one economic truth — through governed, append-only correction
> waves. Nothing is described as merged, landed, or shipped unless it is on
> `main`; every claim carries the draft-state vocabulary; every correction is
> a registered, verifiable unit with an honest receipt.

Draft-state vocabulary (unchanged from hardening addendum §A1, restated here
because this record depends on it): `IMPLEMENTED_ON_DRAFT_BRANCH`,
`CI_GREEN_IN_ISOLATION`, `NOT_MERGED`, `NOT_CUMULATIVELY_VALIDATED`,
`NOT_PRODUCTION_ACTIVE`.

As of this registration, remote `main` remains **`c19a00d`** (verified via
`git ls-remote origin refs/heads/main`, 2026-07-22). Every branch and PR named
below is therefore `IMPLEMENTED_ON_DRAFT_BRANCH` / `NOT_MERGED` at best;
planned items are marked `PLANNED`.

## 2. Seven-layer architecture — summary (registered by reference)

The directive defines a **seven-layer architecture** for the converged system.
The authoritative layer enumeration lives in the master directive itself
(orchestrator transmission, 2026-07-22); this record registers the
architecture's existence and its repo-side anchor points without restating
text the C0 unit did not receive verbatim:

- **Truth / control-document layer** — this branch (PR #152): Phase 0 truth
  docs, freeze, hardening addendum, live PR registry, this registration.
- **Shared infrastructure layer** — trusted actor identity (#159), the
  transactional outbox / idempotent delivery pattern (#161). Ownership per
  freeze §2, unchanged.
- **AI control plane layer** — contracts → ledger → budgets stack
  (#162 → #163 → #164), import-boundary guard (#158), dormant credit
  admission PR-D (#166).
- **NOVA opportunity/economics layer** — the #146 split units S1–S6
  (S1 #165, S2 #168, S3 #169; S4–S6 `PLANNED` per freeze §4 preconditions),
  plus convergence inventory tooling (#167).
- **Settlement / domain-evidence layer** — settlement evidence + outbox
  (#161), settlement decisions feeding the owner queue.
- **Kernel / orchestration layer** — genesis kernel recovery
  (`jarvis/genesis-kernel-recovery`, PR #170) and related Jarvis-lane work.
- **Owner surface layer** — one cockpit, one owner queue, one Founder OS
  (NOVA-owned per freeze §2); read-model consumers only.

Fidelity note: the mapping above is the C0 unit's honest binding of the
directive's layers to live repository artifacts. If the master directive's own
layer names differ, the master directive wins; this record then requires a
dated correction section, not a rewrite.

## 3. Canonical ownership table

Canonical ownership is **unchanged** from the NOVA convergence freeze §2
(`NOVA_CONVERGENCE_FREEZE_2026-07-22.md`), which remains the binding source.
Registered summary (one owner per domain, no exceptions):

| Domain | Canonical owner |
|---|---|
| Credit-program lifecycle (programs, applications, grants, balances, allocations) | NOVA |
| AI invocation policy, routing, attempts, budgets, financial attribution | AI control plane (#162–#164) |
| Sports settlement observations, anomalies, grading, decisions | Settlement domain (#161) |
| Actor identity & audit receipt | Shared infrastructure (#159 `TrustedActor`) |
| Transactional outbox & idempotent delivery | Shared infrastructure (#161 pattern, generalized once) |
| Source monitoring, opportunity lifecycle, Founder OS, owner decision queue, revenue prioritization | NOVA |

CONSTELLATION does not move any ownership boundary. Any unit whose work would
cross a boundary above is architecturally rejected regardless of CI status
(freeze §2/§6, hardening addendum §A3).

## 4. The 14.x live-branch correction list — PR mapping and status

The directive's section 14 enumerates live-branch corrections (14.1–14.10).
Statuses below are as of 2026-07-22 (C0 registration time); PR mappings are
registered where transmitted or independently verifiable, and marked
`MAPPING_NOT_TRANSMITTED_TO_C0` where the C0 tasking did not carry the
binding.

| Item | Binding | PR / branch | Status at registration |
|---|---|---|---|
| 14.1 | S1 — NOVA domain contracts incl. `CreditGrantState` | #165 (`nova/s1-domain-contracts` @ `d52e3c9`) | **IN_PROGRESS** — `IMPLEMENTED_ON_DRAFT_BRANCH`, head moved this wave, `NOT_MERGED` |
| 14.2 | PR-D — credit admission correction | #166 (`feat/ai-control-plane-credit-admission` @ `785886a`) | correction **already specified in the running recovery unit**; branch itself dormant per addendum §A2; `NOT_MERGED` |
| 14.3 | live-branch correction (mapping held by orchestrator) | `MAPPING_NOT_TRANSMITTED_TO_C0` | **IN_RECOVERY** — recovery unit running this wave |
| 14.4 | live-branch correction (mapping held by orchestrator) | `MAPPING_NOT_TRANSMITTED_TO_C0` | **IN_RECOVERY** — recovery unit running this wave |
| 14.5 | live-branch correction (mapping held by orchestrator) | `MAPPING_NOT_TRANSMITTED_TO_C0` | **IN_RECOVERY** — recovery unit running this wave |
| 14.6 | launched this wave | this wave's launches are #167, #168, #169, #170 (exact 14.6 binding held by orchestrator) | **LAUNCHED** — `IMPLEMENTED_ON_DRAFT_BRANCH`, `NOT_MERGED` |
| 14.7 | not transmitted to C0 | `MAPPING_NOT_TRANSMITTED_TO_C0` | not registered this cycle |
| 14.8 | not transmitted to C0 | `MAPPING_NOT_TRANSMITTED_TO_C0` | not registered this cycle |
| 14.9 | launched this wave | this wave's launches are #167, #168, #169, #170 (exact 14.9 binding held by orchestrator) | **LAUNCHED** — `IMPLEMENTED_ON_DRAFT_BRANCH`, `NOT_MERGED` |
| 14.10 | #124 recovery (`claude/frontier-superset-rebased`) | #124 @ `a7b3804` | **DEFERRED** — recovery deferred until the control plane (#162→#163→#164 corrections) completes |

Honesty rule for this table: no row above may be upgraded in place. When a
recovery unit reports, a dated section is appended to this document (or to the
live PR registry) with the new state and its receipt.

## 5. Lane sequence — C / J / N / P

The directive organizes correction units into four lanes, executed as ordered
waves. Registered sequence:

1. **C lane (Control/Truth)** — truth registration and control documents on
   PR #152 (this unit, C0, is the lane's registration step).
2. **J lane (Jarvis/Kernel)** — kernel and orchestration recovery
   (`jarvis/genesis-kernel-recovery`, PR #170).
3. **N lane (NOVA)** — the #146 split units and tooling
   (#165 S1, #168 S2, #169 S3, #167 inventory tooling; S4–S6 `PLANNED`).
4. **P lane (Platform/control Plane)** — control-plane correction stack
   (#158–#164 hardening gates; PR-D #166 dormant until S5 per addendum §A2).

Cross-lane rule registered: lanes may run in parallel as draft work, but the
freeze §4 preconditions and the addendum §A2 PR-D sequencing are hard
ordering constraints that no lane may skip.

## 6. Acceptance-matrix categories

The directive's acceptance matrix evaluates every unit against these
categories (registered summary):

- **Truth fidelity** — draft-state vocabulary used exactly; no
  "shipped/landed" for unmerged work; heads verified against the remote.
- **Ownership compliance** — no boundary of the freeze §2 table crossed.
- **Sequencing compliance** — freeze §4 unit preconditions and addendum §A2
  PR-D staging honored.
- **Evidence/receipts** — failed-closed receipts; no receipt, no claim
  (evidence-honesty rule of the live PR registry stands: NOVA live-source
  validation remains `FAILED_CLOSED`).
- **CI/proof ladder** — isolation-green recorded as such; cumulative
  validation only on the pre-merge integration branch (directive §15 ladder).
- **Safety/scope** — no merge, deploy, production migration, billable
  activation, or external action; tests and guards never weakened.

## 7. Registration state summary

Everything registered above is either `IMPLEMENTED_ON_DRAFT_BRANCH` +
`NOT_MERGED` (all numbered PRs) or `PLANNED` (S4–S6, deferred #124 recovery,
untransmitted 14.x rows). Nothing in this record is merged, cumulatively
validated, or production-active.

*— C0 truth registration unit, 2026-07-22.*
