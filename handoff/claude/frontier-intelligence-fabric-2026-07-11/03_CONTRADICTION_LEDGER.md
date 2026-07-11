# 03 — Contradiction Ledger

Workstream A output. Every entry follows the required schema: claim → source →
contradicting evidence → correct current truth → risk → change made → smallest
runtime validation → owner action.

Statuses were corrected **only** where repository evidence is unambiguous.
Nothing was promoted to ACTIVE. Nothing was promoted on code existence alone.

---

## C1 — Memory capability claimed "zero code"

- **Claim:** "No persistent memory system exists. No vector store. No
  conversation history." Status `NOT_WIRED` (defined as "concept exists, zero code").
- **Source:** `apps/web/lib/jarvis/capability-registry.ts` (`memory-knowledge-base`)
- **Contradicting evidence:** `packages/db/prisma/schema.prisma` models
  `JarvisMemoryEvent` + `JarvisDecision`; migration
  `packages/db/prisma/migrations/20260612120000_jarvis_memory_protocol/`;
  full module `apps/web/lib/jarvis/memory/` (states, guards, conflict,
  actions, errors); review queue `apps/web/app/cockpit/memory/page.tsx`;
  live counts via `buildLiveMemoryStatus()`; tests
  `__tests__/jarvis-memory.test.ts`, `jarvis-memory-stages.test.ts`.
- **Correct current truth:** store implemented in code; runtime recall NOT
  wired; no confirmed production write; activation owner-gated.
- **Risk:** MEDIUM — an assurance/report layer consuming the registry would
  under-report real capability; future work could rebuild what exists.
- **Change made:** status → `DESIGNED` (the protocol doc's own
  NOT_WIRED→DESIGNED criterion — schema + typed interfaces in repo — is met);
  `currentTruth`, `nextAction`, `proofSource` (/cockpit/memory), `ownerMode`
  (OWNER_DECISION_REQUIRED), `requiresHumanApproval` (true), `canAnswer` (true)
  updated to match code.
- **Smallest runtime validation:** `npx vitest run __tests__/jarvis-capability-registry.test.ts`
  (includes new anti-drift pins).
- **Owner action:** record the first governed production memory write, then
  promote per `JARVIS_MEMORY_PROTOCOL.md`. (Queued as task "Activate Jarvis
  memory write path".)

## C2 — `buildMemoryStatus()` fallback said "Jarvis has no persistent memory"

- **Source:** `apps/web/lib/jarvis/intelligence-state.ts`
- **Contradicting evidence:** same file's `buildLiveMemoryStatus()` queries
  `jarvis_memory_events` for real counts — the sync text denied a store the
  async sibling reads.
- **Change made:** fallback truth now says "built, not activated; no confirmed
  production write; nothing is recalled across sessions". `store` label:
  "Not Connected" → "Built, not activated". `wired` stays hard `false`.
- **Validation:** `__tests__/jarvis-memory.test.ts` (evolved pins preserve the
  promise: fallback never claims recall).
- **Owner action:** none.

## C3 — REMEMBER operating-loop phase claimed "No persistent memory exists"

- **Source:** `intelligence-state.ts` OPERATING_LOOP.
- **Correct truth:** store built in code; phase correctly stays `NOT_WIRED`
  because its documented promotion criterion is a confirmed production record,
  not code existence. Prose fixed; status deliberately NOT changed.
- **Validation:** `__tests__/jarvis-intelligence-state.test.ts`.
- **Owner action:** first confirmed production write promotes REMEMBER → PARTIAL.

## C4 — ARCHIVE council seat claimed "No memory store … exists"

- **Source:** `apps/web/lib/jarvis/agent-council.ts` (Memory Librarian).
- **Change made:** `currentTruth` reworded (store built, not activated). Seat
  status stays `NOT_WIRED` — the seat still cannot execute anything.
- **Validation:** `__tests__/jarvis-agent-council.test.ts`.
- **Owner action:** none.

## C5 — Ask Jarvis hardcoded "no store is wired"

- **Source:** `apps/web/lib/cockpit/ask-jarvis.ts` (`answerMemoryStatus`).
- **Change made:** answer now states: no recall, store built in code, no
  confirmed production write, activation owner-gated.
- **Validation:** `__tests__/jarvis-intelligence-state.test.ts`
  ("what-is-memory-status" pin, evolved).
- **Owner action:** none.

## C6 — Memory protocol doc contradicted itself

- **Claim:** header/Current Truth said "No persistent memory store exists…
  zero code" while the same document's "Implementation status (2026-06-12)"
  section listed the store's schema, migration, state machine, actions,
  cockpit panel, and tests as "wired in code now".
- **Source:** `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md`
- **Change made:** header + Current Truth + tier table rewritten to the
  implemented-but-not-activated truth; NOT_WIRED→DESIGNED promotion criterion
  marked SATISFIED 2026-07-11; pending table updated (production migration
  row resolved by ledger evidence — see C7; registry promotion row done).
- **Owner action:** first governed write (unchanged).

## C7 — "Production migration pending" was already resolved by ledger evidence

- **Claim:** protocol doc pending table: "Production migration — DATABASE_URL
  must point to a real Postgres and db:migrate must be run by the owner."
- **Contradicting evidence:** `docs/ops/MIGRATION_LEDGER_RECONCILIATION_RUNBOOK.md`
  records production's migration ledger diverging only AFTER
  `20260615152000_add_signal_ledger`; the memory migration (`20260612120000`)
  predates that point, so it is part of the common (applied) history.
- **Correct truth:** memory tables exist in production; what is missing is the
  first confirmed governed write, not the migration.
- **Owner action:** none for the migration; first write remains owner-gated.

## C8 — Market/Line intelligence claimed "No CLV tracking"

- **Claim:** "No CLV tracking, no line movement alerts, no market intelligence
  layer beyond ingestion."
- **Source:** `capability-registry.ts` (`market-line-intelligence`)
- **Contradicting evidence:** settlement-time CLV grading in
  `packages/ingestion-pipeline/src/settle-sport.ts` (with tests); public /clv
  report under a coverage policy (`apps/web/lib/performance/public-clv-policy.ts`,
  `clv-coverage.ts`); CLV columns on the /proof ledger; line-move surface
  (observatory).
- **Change made:** `currentTruth` rewritten to name exactly what exists and
  what does not (no sharp-money layer, no automated alerts); `proofSource`
  → `/clv`; `nextAction` → CLV decomposition + production verification.
  Status stays `DESIGNED` — production CLV rows are not verifiable from this
  environment.
- **Validation:** new anti-drift pin in `jarvis-capability-registry.test.ts`.
- **Owner action:** none.

## C9 — Registry doc counts/score stale + memory approval mischaracterized

- **Source:** `docs/ai/jarvis/JARVIS_CAPABILITY_REGISTRY.md`
- **Change made:** memory row → DESIGNED with new next action; counts
  (DESIGNED 3→4, NOT_WIRED 5→4); wiring score 38→39 (formula shown);
  `canAnswer` 8→9; `requiresHumanApproval` 14→15 — memory approvals flow
  through the /cockpit/memory review queue, so "no externally visible output
  to approve" was wrong.
- **Validation:** score test recomputes from the registry
  (`computeWiringScore`), so doc and code agree by construction.
- **Owner action:** none.

## C10 — Cockpit operating map listed Memory surface as NOT_WIRED / "future"

- **Source:** `apps/web/lib/cockpit/cockpit-operating-map.ts`
- **Contradicting evidence:** `/cockpit/memory` page exists (review queue).
- **Change made:** surface status → `DESIGNED`, audience → `internal`.
- **Owner action:** none.

---

## Verified-unchanged (audited, no defect)

- **Agent Council seat count:** code exports 23 seats; RESEARCH_MAP and council
  docs agree. No drift.
- **Tool Router / MCP:** registry says no agent tool bus exists — still true.
  (The scraping Tool Registry at `lib/scraping/tool-registry.ts` is a
  rights-clearance construct, not an agent tool bus.)
- **Browser/computer control, voice interface, workflow automation:** still
  NOT_WIRED in code — registry accurate.
- **No capability is ACTIVE; `canExecute` false everywhere** — pinned by tests,
  still true.
