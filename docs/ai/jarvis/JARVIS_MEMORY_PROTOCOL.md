# Jarvis Memory Protocol

This document defines how Jarvis remembers — and, more importantly, the honest truth that today it does not. No persistent memory store exists. Jarvis context is rebuilt fresh from the OwnerSummary on every cockpit load, and these version-controlled markdown files are the only durable memory the system has. The protocol below is the design that the `memory-knowledge-base` capability will be built against.

Last updated: 2026-06-11
Status: DESIGNED — protocol is documented; episodic store is NOT_WIRED.

## Current Truth

From `capability-registry.ts` (`memory-knowledge-base`, status `NOT_WIRED`) and `intelligence-state.ts` (`buildMemoryStatus()`):

- **No persistent memory system exists.** No vector store. No conversation history. No cross-session recall.
- `memory.wired` is hard-typed `false` in `MemoryStatus` and stays false until a real store exists.
- Operational truth is rebuilt from the database on every load; architectural truth lives in version-controlled markdown. **Nothing is recalled across sessions.**
- The REMEMBER phase of the operating loop is `NOT_WIRED`.
- Any claim of remembered context before the store is wired would be fabrication, and fabricated recall is a forbidden action of both the capability and the ARCHIVE council seat (Memory Librarian, status `NOT_WIRED`).

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
| (c) Episodic memory | Owner decisions + outcomes over time ("we opened the picks gate on X because Y; result Z") | Postgres table (`JarvisMemoryEvent`) | **BUILT, GATED OFF** — schema, state machine, guards, manual actions, and an env-gated autonomous write path (`recordMemoryEvent()`) all exist in code; `JARVIS_MEMORY_WRITE_ENABLED` defaults `"false"` and no production caller invokes the autonomous path yet, so the claim below still holds |

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

- **NOT_WIRED → DESIGNED**: schema for the episodic store exists in the repo (Prisma model or mem0 integration scaffolding) plus typed write/read interfaces — even if nothing persists yet. These protocol docs alone do not qualify; the registry requires partial infrastructure in code.
- **DESIGNED → MANUAL**: a human can write and read an episodic record end-to-end via a manual process (script or admin form), with the consent and no-PII rules enforced.
- **MANUAL → DRAFT_ONLY**: Jarvis automatically proposes memory writes (e.g., when a gate flips or a decision is resolved) into a review queue; the owner approves each write.
- **DRAFT_ONLY → ACTIVE**: writes happen autonomously within the defined record schema, with audit logging and owner-accepted boundaries. Not on the current roadmap until the tool router and audit log exist.

Registry `nextAction` (authoritative): *"Wire mem0 or Postgres-based episodic memory to capture owner decisions."* When any promotion happens, update `capability-registry.ts`, the ARCHIVE seat's `currentTruth` in `agent-council.ts`, the REMEMBER phase in `intelligence-state.ts`, and this document — in the same change.

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
| Live status builder | `apps/web/lib/jarvis/intelligence-state.ts` — `buildLiveMemoryStatus()` | Async: runs cheap COUNT queries; returns `WiredMemoryStatus` with real counts + health score on success, falls back to not-wired posture on any DB error **or when `@sports/db` is running its stub client** (see below) |
| Gated write path | `apps/web/lib/jarvis/memory/write-gate.ts` — `recordMemoryEvent()` | The autonomous entry point. Hard-gated on `JARVIS_MEMORY_WRITE_ENABLED` (default `"false"`), mirrors `packages/ingestion-pipeline/src/line-archive.ts`'s `captureLineSnapshotsIfEnabled` pattern exactly: zero DB interaction when off, failure-isolated (never throws) when on. Writes always land as `memory_state="candidate"` through the same state-machine contract as `actions.ts#createMemoryCandidate`. **As of 2026-07-17, nothing in production calls this function yet** — it exists so a founder can wire a real trigger (a gate flip, a settlement, an owner decision) later and flip the flag independently. |
| Write-path status reporting | `apps/web/lib/jarvis/intelligence-state.ts` — `writePath` / `writePathTruth` fields on `MemoryStatus` | Both `buildMemoryStatus()` and `buildLiveMemoryStatus()` report `"WIRED_GATED_OFF"` by default (`"WIRED_ACTIVE"` once the flag is `"true"`) — a signal independent of read-connectivity `wired`, so the panel can never conflate "the DB is reachable" with "autonomous writes are happening" |
| Cockpit panel | `apps/web/app/cockpit/page.tsx` — `MemoryProtocolZone` | Calls `await buildLiveMemoryStatus()`; renders wired/not-wired and the write-path badge honestly from the returned posture |
| Tests | `apps/web/__tests__/jarvis-memory.test.ts`, `apps/web/__tests__/jarvis-memory-write-gate.test.ts` | Pure-logic tests (no live DB): 8 states, transition law, terminal state enforcement, sensitive-category guard, supersession trail, conservative conflict detection, health formula, `buildLiveMemoryStatus` surface, and the write-gate's default-off/enabled/failure-isolation contract |

### Stub-mode honesty guard (2026-07-17)

`buildLiveMemoryStatus()` originally reported `wired: true` / "store healthy" whenever its COUNT queries resolved without throwing — but `@sports/db`'s stub client (active whenever `DATABASE_URL` is unset/sentinel, which includes local dev, CI, and most test runs; see `packages/db/src/index.ts`) resolves every `count()` to `0` without touching a real database. That meant the default/no-DB environment silently claimed a wired, healthy memory store. `buildLiveMemoryStatus()` now checks `isStubMode()` first and short-circuits to the not-wired posture, matching the same idiom used across the cockpit (`isStubMode()` gating in `apps/web/lib/board/state.ts`, `apps/web/lib/cockpit/jarvis-data.ts`, etc.).

### Pending (requires owner action)

| Item | Blocker |
|---|---|
| Production migration | `DATABASE_URL` must point to a real Postgres and `npm run db:migrate` must be run by the owner |
| `wired: true` in live cockpit | Depends on production migration above (and a non-stub `DATABASE_URL`) |
| `lastWritten` / `lastRecalled` timestamps | Timestamp telemetry not yet instrumented; both fields return `null` in `WiredMemoryStatus` |
| Capability registry promotion to `DESIGNED` | Update `capability-registry.ts` once the owner confirms the production migration is live |
| `REMEMBER` phase → `PARTIAL` | Update `intelligence-state.ts` operating loop after first confirmed memory is written in production |
| `writePath: "WIRED_ACTIVE"` | Owner sets `JARVIS_MEMORY_WRITE_ENABLED="true"` — only once a real production caller invokes `recordMemoryEvent()` for a real event, per the promotion criteria above |
