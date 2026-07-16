# Jarvis Memory Protocol

This document defines how Jarvis remembers — and the honest truth about how much of that exists today. The episodic store is implemented in code (schema, migration, state machine, guards, server actions, review queue) but is **not activated**: no confirmed production write exists, and Jarvis context is still rebuilt fresh from the OwnerSummary on every cockpit load. Runtime recall is not wired. The protocol below is the design the `memory-knowledge-base` capability is built against.

Last updated: 2026-07-11
Status: DESIGNED — protocol documented AND store implemented in code; production activation (first confirmed governed write) is owner-gated.

## Current Truth

From `capability-registry.ts` (`memory-knowledge-base`, status `DESIGNED`) and `intelligence-state.ts` (`buildMemoryStatus()` / `buildLiveMemoryStatus()`):

- **The episodic store exists in code.** `JarvisMemoryEvent` + `JarvisDecision` schema models, migration `20260612120000_jarvis_memory_protocol`, an append-only state machine with guards and conflict detection (`apps/web/lib/jarvis/memory/`), and the `/cockpit/memory` review queue. Per the migration-ledger reconciliation evidence (`docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`), this migration predates the last-common ledger point and is therefore recorded in the production migration ledger.
- **Nothing is recalled across sessions.** Runtime recall is not wired, no confirmed production write exists, and `memory.wired` stays `false` in the sync fallback posture until real DB counts are observed.
- Operational truth is rebuilt from the database on every load; architectural truth lives in version-controlled markdown.
- The REMEMBER phase of the operating loop stays `NOT_WIRED`: its promotion criterion is a confirmed production memory record, not code existence.
- Any claim of remembered context before activation would be fabrication, and fabricated recall is a forbidden action of both the capability and the ARCHIVE council seat (Memory Librarian, seat status `NOT_WIRED` for execution).

The five protocol docs registered in `intelligence-state.ts` (`MEMORY_PROTOCOL_DOCS`):

```
docs/ai/jarvis/JARVIS_ARCHITECTURE.md
docs/ai/jarvis/JARVIS_CAPABILITY_REGISTRY.md
docs/ai/jarvis/JARVIS_AGENT_COUNCIL.md
docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md
docs/ai/jarvis/JARVIS_OPERATOR_BRIEF.md
```

## The Three Memory Tiers

| Tier | What it holds | Medium | Status |
|---|---|---|---|
| (a) Operational truth | Picks, settlements, gates, ingestion timestamps, decision queue | PostgreSQL, read via Jarvis assessment → OwnerSummary on every cockpit load | **LIVE** — already how Jarvis "knows" the platform |
| (b) Architectural truth | What Jarvis is, capability statuses, council charters, this protocol | These markdown docs, version-controlled in git | **LIVE** — durable via git history; updated by reviewed commits |
| (c) Episodic memory | Owner decisions + outcomes over time ("we opened the picks gate on X because Y; result Z") | Postgres (`jarvis_memory_events` / `jarvis_decisions`) | **DESIGNED** — implemented in code; production activation owner-gated |

Tiers (a) and (b) mean Jarvis is never amnesiac about *state* or *architecture* — it is amnesiac only about *episodes*: what the owner decided, why, and how it turned out. That is the gap tier (c) closes.

## Write Protocol (for when episodic memory IS wired)

This section is forward-looking design. None of it executes today.

### What gets recorded

Every episodic record captures, at minimum:

| Field | Meaning |
|---|---|
| `decision` | What was decided (e.g., "opened PUBLIC_PICKS_ENABLED", "approved content draft #N"). |
| `timestamp` | When, in UTC, from a trusted clock — never backfilled or estimated. |
| `actor` | Who decided. The owner for approvals/gates; a council seat id only for draft submission events. |
| `rationale` | Why, in the actor's words or the deterministic recommendation that prompted it. |
| `outcome` | What happened, written only after the result is observable (settled, shipped, reverted) — may be appended later, never invented at write time. |

Writes are append-only. Corrections are new records referencing the old one, preserving the audit trail (consistent with the AUDIT loop phase goal of a unified audit log).

### What never gets recorded

- **PII without consent** — storing PII without an explicit consent layer is a forbidden action of the `memory-knowledge-base` capability.
- **Fabricated recall** — no inferred, reconstructed, or "probably happened" entries. If it was not observed, it is not in memory.
- Secrets or credentials of any kind (per project rule: no secrets in code or data stores).
- Fabricated telemetry or performance numbers (per OwnerSummary trust rules: pending/bootstrap picks never count; absence of data is recorded as absence).

### Read protocol

When wired, recall must cite the stored record (id + timestamp) so every "Jarvis remembers" claim is verifiable. Allowed actions per the registry: write operator decisions to the memory store, surface relevant past context in future sessions, and index docs for semantic search.

## Promotion Criteria for `memory-knowledge-base`

The capability moves beyond `NOT_WIRED` only when demonstrated in the repo (see JARVIS_CAPABILITY_REGISTRY.md governance):

- **NOT_WIRED → DESIGNED**: schema for the episodic store exists in the repo (Prisma model or mem0 integration scaffolding) plus typed write/read interfaces — even if nothing persists yet. These protocol docs alone do not qualify; the registry requires partial infrastructure in code. **SATISFIED 2026-07-11**: schema models, migration, and typed server actions all exist (see Implementation status below); the registry now records `DESIGNED`.
- **DESIGNED → MANUAL**: a human can write and read an episodic record end-to-end via a manual process (script or admin form), with the consent and no-PII rules enforced.
- **MANUAL → DRAFT_ONLY**: Jarvis automatically proposes memory writes (e.g., when a gate flips or a decision is resolved) into a review queue; the owner approves each write.
- **DRAFT_ONLY → ACTIVE**: writes happen autonomously within the defined record schema, with audit logging and owner-accepted boundaries. Not on the current roadmap until the tool router and audit log exist.

Registry `nextAction` (authoritative): *"Owner activation: confirm the jarvis_memory_protocol migration is applied in production, record the first governed memory write, then promote per the JARVIS_MEMORY_PROTOCOL.md promotion criteria. Never promote on code existence alone."* When any promotion happens, update `capability-registry.ts`, the ARCHIVE seat's `currentTruth` in `agent-council.ts`, the REMEMBER phase in `intelligence-state.ts`, and this document — in the same change.

## Implementation status (2026-06-12)

### Wired in code now

| Artifact | Path | What it does |
|---|---|---|
| Prisma schema | `packages/db/prisma/schema.prisma` | `JarvisMemoryEvent` + `JarvisDecision` models, `MemoryType` + `MemoryState` enums |
| Migration SQL | `packages/db/prisma/migrations/20260612120000_jarvis_memory_protocol/migration.sql` | Creates `jarvis_memory_events` + `jarvis_decisions` tables |
| State machine | `apps/web/lib/jarvis/memory/states.ts` | All 8 states, allowed transitions, terminal-state enforcement |
| Conflict detector | `apps/web/lib/jarvis/memory/conflict.ts` | Conservative conflict detection (explicit supersedes/contradicts only) |
| Sensitivity guards | `apps/web/lib/jarvis/memory/guards.ts` | Blocks `public_claim_rule`/high/legal/hr/spend from `confirmed` without owner approval |
| Error types | `apps/web/lib/jarvis/memory/errors.ts` | `MemoryStoreUnavailableError`, `MemoryTransitionError`, `MemoryGuardError` |
| Server actions | `apps/web/lib/jarvis/memory/actions.ts` | `createMemoryCandidate`, `confirmMemory`, `rejectMemory`, `expireMemory`, `supersedeMemory` (single transaction), `recallRelevantMemory`, `listMemoryByState`, `listMemoryConflicts`, `linkMemoryToDecision` |
| Live status builder | `apps/web/lib/jarvis/intelligence-state.ts` — `buildLiveMemoryStatus()` | Async: runs cheap COUNT queries; returns `WiredMemoryStatus` with real counts + health score on success, falls back to not-wired posture on any DB error |
| Cockpit panel | `apps/web/app/cockpit/page.tsx` — `MemoryProtocolZone` | Calls `await buildLiveMemoryStatus()`; renders wired/not-wired honestly from the returned posture |
| Tests | `apps/web/__tests__/jarvis-memory.test.ts` | Pure-logic tests (no live DB): 8 states, transition law, terminal state enforcement, sensitive-category guard, supersession trail, conservative conflict detection, health formula, `buildLiveMemoryStatus` surface |

### Pending (requires owner action)

| Item | Blocker |
|---|---|
| ~~Production migration~~ | Evidence resolved 2026-07-11: migration `20260612120000` predates the last-common production ledger point (`docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`), so the tables exist in production. What remains owner-gated is the first confirmed governed write. |
| `wired: true` in live cockpit | Requires observing real DB counts in production (first confirmed write makes this meaningful) |
| `lastWritten` / `lastRecalled` timestamps | Timestamp telemetry not yet instrumented; both fields return `null` in `WiredMemoryStatus` |
| ~~Capability registry promotion to `DESIGNED`~~ | Done 2026-07-11 — `capability-registry.ts` records `DESIGNED` with proof source `/cockpit/memory` |
| `REMEMBER` phase → `PARTIAL` | Update `intelligence-state.ts` operating loop after first confirmed memory is written in production |
