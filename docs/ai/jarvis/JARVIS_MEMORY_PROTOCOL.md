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
| (c) Episodic memory | Owner decisions + outcomes over time ("we opened the picks gate on X because Y; result Z") | Future Postgres table or mem0 | **NOT_WIRED** — zero code |

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
