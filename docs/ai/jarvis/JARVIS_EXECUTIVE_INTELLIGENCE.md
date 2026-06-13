# Jarvis Executive Intelligence v2

Last updated: 2026-06-13
Status: WIRED — Layers A–H shipped on branch `jarvis/os-foundation-fable5-v1`.

Jarvis Executive Intelligence v2 is the full-stack operating intelligence layer for Galaxy Sports Edge. It is not a chatbot, dashboard theme, or AI wrapper. It is a **20-year-executive-in-code** — a deterministic, honest, approval-gated intelligence that senses platform state, interprets it without model calls at runtime, surfaces patterns, knows what it doesn't know, and proposes actions the owner decides.

## Design Standards

- **Nothing invented.** Every number cites its source in `OwnerSummary`. `cannotDoList` items are explicit, not papered over.
- **Approval-gated.** `DispatchPlan.requiresApproval` is always `true`. There is no autonomous execution path.
- **Honest absence.** `isKnown: false` domains are declared openly: `MEMORY_STORE`, `VOICE_INTERFACE`, `EXTERNAL_TOOLS`.
- **No model calls at runtime.** All responses are deterministic pattern matches against live OwnerSummary state.
- **Immutable audit trail.** Session facts use supersession (not deletion). `selfCorrectionLog` is append-only.

## The Eight Layers

### Layer A — Conversation Engine
`apps/web/lib/jarvis/conversation-engine.ts`

Handles intent detection (pure regex pattern matching), response building, dispatch plan construction, and session lifecycle. All responses derived from `OwnerSummary` via `askJarvis()`. No model calls.

Key exports: `detectIntent`, `buildJarvisResponse`, `buildExecutiveBriefing`, `shouldScribeMessage`, `createSession`, `appendMessage`.

### Layer B — Session Memory
`apps/web/lib/jarvis/session-memory.ts`

Fact accumulation with deduplication and immutable supersession audit trail. Tracks decisions, dispatched tasks, and surfaced risks within a session. Produces `ScribeEntry` handoff records.

Key exports: `createSessionContext`, `addFact`, `lookupFact`, `supersedeFact`, `buildSessionHandoff`, `extractOwnerPreferences`.

### Layer C — Department Reports
`apps/web/lib/jarvis/department-reports.ts`

8-department intelligence grid derived from `OwnerSummary`. Each report has health level, oneLiner, topRisk, and recommendations. Health claims always require OwnerSummary evidence. OneLiners cite their source fields.

Departments: PICKS_DESK (Scout), DATA_PIPELINE (Tal), CUSTOMER_SURFACE (Sarah), CONTENT (Ava), REVENUE (Bobby), SETTLEMENT (Settlement Officer), PERFORMANCE (Performance Auditor), AI_OPS (AI Ops Officer).

Key exports: `buildDepartmentReport`, `buildAllDepartmentReports`, `buildIntelligenceBriefing`, `generateMorningBriefing`.

### Layer D — Pattern Recognition
`apps/web/lib/jarvis/pattern-recognition.ts`

Detects recurring patterns across historical OwnerSummary snapshots. Requires ≥2 snapshots. Prevents duplicate surfacing within a session. Produces compact `ScribeEntry` records for institutional memory.

Pattern types: `RECURRING_BLOCKER`, `DATA_DRIFT`, `DECISION_BACKLOG`, `CALIBRATION_TREND`, `CONTENT_VELOCITY`, `REVENUE_SIGNAL`.

Key exports: `detectPatterns`, `rankPatternsByUrgency`, `shouldSurfacePattern`, `buildPatternMemory`, `summarizePatternsForOwner`.

### Layer E — Self-Knowledge
`apps/web/lib/jarvis/self-knowledge.ts`

Jarvis's honest model of what he knows, what he doesn't, and what he's watching for. 10 knowledge domains with explicit NOT_WIRED declarations for memory, voice, and external tools. Immutable self-correction log.

Key exports: `buildSelfModel`, `getKnowledgeForDomain`, `isKnowledgeStale`, `recordSelfCorrection`, `summarizeSelfModelForOwner`.

### Layer F — Conversation UI
`apps/web/components/jarvis/jarvis-conversation.tsx`

Client component rendering the executive Q&A interface. Message thread with priority-coded borders, dispatch plan approval UI, quick-action chips, session context panel, and scribe export modal. Zero model API calls.

### Layer G — Morning Briefing Page
`apps/web/app/cockpit/jarvis/briefing/page.tsx`

Server component rendering the daily intelligence briefing. Sections: executive summary, NEEDS YOUR DECISION, RUNNING FINE, DEGRADED/ATTENTION departments, NEXT BUILD, self-knowledge summary, raw morning text.

### Layer H — Conversation Page
`apps/web/app/cockpit/jarvis/conversation/page.tsx`

Server component loading `OwnerSummary` and `JarvisIntelligenceState` and passing them as props to the `<JarvisConversation>` client component.

## Knowledge Domains

| Domain | isKnown | Source |
|---|---|---|
| `PLATFORM_STATE` | true | OwnerSummary.overallColor |
| `PICKS_DATA` | true | OwnerSummary.picks |
| `SETTLEMENT_DATA` | true | OwnerSummary.picks.canonicalSettled |
| `PERFORMANCE_STATS` | depends | OwnerSummary.performance |
| `SUBSCRIPTION_DATA` | false | Not surfaced in OwnerSummary |
| `AGENT_STATUSES` | true | OwnerSummary.departments |
| `TOOL_STATUSES` | true | JarvisIntelligenceState.capabilities |
| `MEMORY_STORE` | **false** | NOT_WIRED — no DB/vector store wired |
| `VOICE_INTERFACE` | **false** | NOT_WIRED — ECHO seat designed only |
| `EXTERNAL_TOOLS` | **false** | NOT_WIRED — MCP not wired |

## Freshness Rules

| Status | Age |
|---|---|
| `FRESH` | < 1 hour |
| `ACCEPTABLE` | 1–6 hours |
| `STALE` | > 6 hours or null lastUpdated |

`isKnowledgeStale()` returns `true` for STALE entries and for entries with no `lastUpdated` timestamp.

## Scribe Entry Types

| Type | When |
|---|---|
| `DECISION` | Owner approves or rejects a proposal |
| `DISPATCH` | Task dispatched for execution |
| `BRIEFING` | Morning briefing generated |
| `RISK` | Critical risk surfaced requiring owner awareness |
| `PATTERN` | Recurring pattern detected across history |
| `HANDOFF` | Session ends — context handed to next session |
| `SELF_CORRECTION` | Jarvis corrects a prior statement |
| `SESSION_SUMMARY` | End-of-session summary for the vault |

## Commit History

This feature was built in 5 commits on branch `jarvis/os-foundation-fable5-v1`:

1. **Layers A+B** — conversation-engine, session-memory, scribe-types foundation
2. **Layers C+D** — department-reports, pattern-recognition
3. **Layer E** — self-knowledge with honest NOT_WIRED declarations
4. **Layers F+G+H** — conversation UI, morning briefing page, conversation page
5. **Tests + Docs** — all 5 test suites + this documentation

## Related Files

| File | Role |
|---|---|
| `docs/ai/jarvis/JARVIS_ARCHITECTURE.md` | Base architecture (updated with Layers A–H) |
| `docs/ai/jarvis/JARVIS_CONVERSATION_PROTOCOL.md` | Conversation rules and invariants |
| `docs/ai/jarvis/JARVIS_AGENT_COUNCIL.md` | 15 governed agent seats |
| `docs/ai/jarvis/JARVIS_CAPABILITY_REGISTRY.md` | 16 capabilities and wiring score |
| `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md` | Memory tiers (designed, not wired) |
| `docs/ai/jarvis/vault/01-daily/` | Daily session handoff notes |
