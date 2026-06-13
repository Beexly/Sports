# Jarvis Architecture

Jarvis is the governed intelligence layer of Galaxy Sports Edge: a deterministic system that senses platform state, interprets it, prioritizes decisions, explains itself, routes work to governed roles, and recommends the owner's next action — while every externally visible action waits for human approval. This document is the canonical architectural truth for what Jarvis is, what it is not, what runs in code today, and where each piece lives in the repository.

Last updated: 2026-06-13
Status: WIRED — Layers A–H of Executive Intelligence v2 shipped on 2026-06-13.

## What Jarvis Is

- A **governed intelligence system**: sense, interpret, prioritize, explain, route, remember (designed), audit (partial), recommend.
- A **deterministic assessment** that runs on every cockpit load. It produces the OwnerSummary, the decision queue, and safety warnings.
- A **pure function at runtime**: Ask Jarvis answers owner questions from live state with supporting facts, confidence, and caveats. **No model calls happen at cockpit runtime.**
- A **single source of architectural truth**: the capability registry (16 capabilities), the agent council (15 governed seats), and the operating-loop posture, composed into one intelligence state.

## What Jarvis Is NOT

- **Not a chatbot.** Ask Jarvis is a fixed set of 18 deterministic intents, not free-form conversation.
- **Not a dashboard theme.** Every status shown is derived from registries and live database state.
- **Not autonomous agents.** No agent executes anything. All agent outputs are drafts requiring human approval. `canExecute` is `false` across the entire capability registry.
- **Not fake autonomy.** Nothing is ever labeled ACTIVE, autonomous, or live unless it truly executes without human intervention in the repo's current state. Today that count is zero — intentionally.

## The Operating Model Loop

Honest per-phase status from `intelligence-state.ts`. WIRED means the behavior runs in code today. PARTIAL means some of it runs and the rest is manual. NOT_WIRED means the phase does not exist yet. There is no "AUTONOMOUS" status.

| Phase | Status | Truth |
|---|---|---|
| SENSE | WIRED | Jarvis assessment reads ingestion, settlement, picks, and gate state from the database on every cockpit load. |
| INTERPRET | WIRED | OwnerSummary derives posture color, department health, and performance policy deterministically — no model calls. |
| DECIDE | WIRED | The decision queue ranks safety warnings, config gaps, and recommended actions by urgency. The owner decides; Jarvis only recommends. |
| EXPLAIN | WIRED | Ask Jarvis answers owner questions from live state with supporting facts, confidence, and caveats. |
| ACT_SAFELY | PARTIAL | All agent outputs are drafts requiring human approval. There is no autonomous execution path; manual workers are the only act surface. |
| REMEMBER | NOT_WIRED | No persistent memory exists. Context is rebuilt fresh from OwnerSummary every load. The memory protocol is designed in docs/ai/jarvis/. |
| AUDIT | PARTIAL | Picks are versioned and the settlement ledger is canonical. There is no unified audit log for agent actions or tool calls yet. |
| IMPROVE | NOT_WIRED | Calibration review is manual. No automated feedback loop adjusts the prediction engine from settled results. |

4 of 8 phases are WIRED, 2 are PARTIAL, 2 are NOT_WIRED.

## Layer Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  DATABASE + WORKERS (operational ground truth)                   │
│  PostgreSQL / Prisma · BullMQ + Redis · The Odds API ingestion   │
│  picks ledger · settlement records · gate flags                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │ read on every cockpit load
┌───────────────────────────────▼──────────────────────────────────┐
│  JARVIS ASSESSMENT (lib/cockpit/jarvis.ts)                       │
│  deterministic health checks · safety warnings · launch status   │
└───────────────────────────────┬──────────────────────────────────┘
                                │ buildOwnerSummary()
┌───────────────────────────────▼──────────────────────────────────┐
│  OWNER SUMMARY (lib/cockpit/owner-summary.ts)                    │
│  pure, I/O-free synthesis: posture color · picks · performance   │
│  policy · departments · decision queue · honest AI Ops state     │
└───────────────────────────────┬──────────────────────────────────┘
                                │ buildIntelligenceState(summary)
┌───────────────────────────────▼──────────────────────────────────┐
│  INTELLIGENCE STATE (lib/jarvis/intelligence-state.ts)           │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │ Capability Registry (16) │  │ Agent Council (15 seats)     │  │
│  │ capability-registry.ts   │  │ agent-council.ts             │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
│  + operating-loop posture + memory status (wired: false)         │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│  COCKPIT UI + ASK JARVIS (lib/cockpit/ask-jarvis.ts)             │
│  /cockpit command bridge · 18 deterministic intents · no model   │
│  calls · every answer carries confidence + caveat + next action  │
└──────────────────────────────────────────────────────────────────┘
```

## Trust Rules (enforced in code)

1. **No fake ACTIVE.** A capability is never marked ACTIVE unless it truly executes autonomously without human intervention in the repo's current state. Today: zero.
2. **Drafts only.** All agent outputs are drafts. No council seat takes external actions (`externalActions: "NONE"` is a hard invariant on every seat). Departments are labeled DRAFT_ONLY or MANUAL — never AUTONOMOUS.
3. **Performance display gates.** `displaySafe` is only true when the PERFORMANCE_STATS_ENABLED gate is open AND the canonical sample size meets the minimum. `actualWinRate` is `null` whenever `displaySafe` is false. Pending and bootstrap picks are never counted in the win rate. The 70% figure is always the target, never a claimed result.
4. **No model calls at runtime.** OwnerSummary and Ask Jarvis are pure functions: no I/O, no `Date.now()`, no Claude API calls. State is serializable and reproducible for a given summary.
5. **Honest absence.** AI Ops telemetry is reported as unavailable until instrumented. Absence of data is reported as absence — never inferred as health or discipline.
6. **Memory honesty.** `memory.wired` is `false` until a real memory store exists. Any claim of remembered context before then would be fabrication.

## File Map

| Path | Role |
|---|---|
| `apps/web/lib/jarvis/capability-registry.ts` | 16 capabilities, status ladder, wiring score. Single source of capability truth. |
| `apps/web/lib/jarvis/agent-council.ts` | 15 governed council seats with charters, owned capabilities, escalation. |
| `apps/web/lib/jarvis/intelligence-state.ts` | Pure composition: OwnerSummary + registry + council + loop posture + memory status. |
| `apps/web/lib/cockpit/jarvis.ts` | Jarvis assessment (health checks, safety warnings, launch status). |
| `apps/web/lib/cockpit/owner-summary.ts` | `buildOwnerSummary()` — typed operational synthesis with trust rules. |
| `apps/web/lib/cockpit/ask-jarvis.ts` | 18 deterministic Q&A intents (9 OPERATIONS + 9 ARCHITECTURE). |
| `apps/web/app/cockpit/` | Command bridge UI: agents, calibration, history, content, api-costs. |
| `docs/ai/jarvis/` | These five protocol docs — the only durable Jarvis memory today. |

## Executive Intelligence v2 — Layers A–H

Shipped 2026-06-13 on branch `jarvis/os-foundation-fable5-v1`. Full details in `JARVIS_EXECUTIVE_INTELLIGENCE.md`.

| Layer | File | Role |
|---|---|---|
| A | `conversation-engine.ts` | Intent detection, response building, dispatch plans, session lifecycle |
| B | `session-memory.ts` | Fact accumulation, supersession audit trail, handoff export |
| C | `department-reports.ts` | 8-department health grid derived from OwnerSummary |
| D | `pattern-recognition.ts` | Recurring pattern detection across historical snapshots |
| E | `self-knowledge.ts` | Knowledge domains, NOT_WIRED declarations, self-correction log |
| F | `components/jarvis/jarvis-conversation.tsx` | Executive Q&A UI (client component) |
| G | `app/cockpit/jarvis/briefing/page.tsx` | Morning intelligence briefing (server component) |
| H | `app/cockpit/jarvis/conversation/page.tsx` | Conversation page (server component) |

## Related Documents

- `JARVIS_EXECUTIVE_INTELLIGENCE.md` — full v2 spec, layer descriptions, commit history.
- `JARVIS_CONVERSATION_PROTOCOL.md` — conversation invariants, intent patterns, dispatch rules.
- `JARVIS_CAPABILITY_REGISTRY.md` — the 16 capabilities and the wiring score.
- `JARVIS_AGENT_COUNCIL.md` — the 15 governed seats and escalation model.
- `JARVIS_MEMORY_PROTOCOL.md` — memory tiers and the (not wired) episodic store.
- `JARVIS_OPERATOR_BRIEF.md` — one-page owner brief.
- `vault/06-memory/MEMORY_INDEX.md` — session memory protocol and vault structure.
- `vault/04-agents/AGENT_NOTES.md` — department report derivation rules.
