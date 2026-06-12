# Jarvis Executive Intelligence v2

The operating layers that turn Jarvis from a status panel into an operations director.

## Layers

| Layer | File | What it does |
|---|---|---|
| A | `lib/jarvis/conversation-engine.ts` | Intent detection, deterministic executive replies, dispatch routing |
| B | `lib/jarvis/session-memory.ts` | In-session fact store — nothing re-derived twice |
| C | `lib/jarvis/department-reports.ts` | 8 department heads synthesize up; morning briefing for the owner |
| D | `lib/jarvis/pattern-recognition.ts` | Recurring blockers, decision backlogs, calibration drift across snapshots |
| E | `lib/jarvis/self-knowledge.ts` | What Jarvis knows / doesn't, freshness-scored, gaps named |
| F | `components/jarvis/jarvis-conversation.tsx` | Executive conversation surface (client, zero model calls) |
| G | `app/cockpit/jarvis/briefing/page.tsx` | Morning briefing page |
| H | `app/cockpit/jarvis/conversation/page.tsx` | Conversation page |

Foundations created with v2 (they did not previously exist):
`lib/jarvis/scribe-types.ts`, `lib/jarvis/task-dispatch.ts`, `lib/jarvis/summary-loader.ts`.

## Departments

PICKS_DESK (scout) · DATA_PIPELINE (tal) · CUSTOMER_SURFACE (sarah) · CONTENT (ava)
· REVENUE (bobby) · SETTLEMENT (settlement-officer) · PERFORMANCE (performance-auditor)
· AI_OPS (ai-ops-officer)

A department with no OwnerSummary evidence reports **UNKNOWN** — health is never claimed
without evidence (tested).

## Honesty ledger (what v2 does NOT do)

- No model calls anywhere — every reply is a pure function of OwnerSummary + registries.
- No execution — DispatchPlans are proposals; approval is a human act outside this code.
- No cross-session memory — handoffs export to the vault by hand.
- No voice, no external tools — and the self-model says so out loud.

## Tests

34 assertions in `lib/jarvis/__tests__/` covering intent detection, approval gating,
no-invention fallbacks, fact dedupe, UNKNOWN-without-evidence, briefing caps, and
self-correction. All green at ship time.
