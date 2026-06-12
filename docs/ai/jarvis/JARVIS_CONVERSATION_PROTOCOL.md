# Jarvis Conversation Protocol

How the owner talks to Jarvis, and the rules every reply obeys.

## Surfaces

- `/cockpit/jarvis/briefing` — morning briefing (server-rendered, one page)
- `/cockpit/jarvis/conversation` — the executive line (client session, deterministic replies)

## How a message is handled

1. `detectIntent()` pattern-matches the owner's words.
   - Task phrasings ("run today", "fix X", "investigate Y") → a `TaskCategory`.
   - Question phrasings ("what needs me", "status", "are we launch ready") → a `JarvisIntent`.
   - Anything else → `general-inquiry` at LOW confidence.
2. Tasks become a `DispatchPlan` (task-dispatch.ts): owner's words verbatim, the
   department head who owns it, the steps, the risk, and the approval gate.
   **Plans are PROPOSED. Nothing executes.**
3. Questions answer deterministically via `askJarvis()` over the live OwnerSummary.
4. Unknowns get the honest fallback — Jarvis names his sources and what he can answer.

## Executive standards (enforced in code + tests)

| Standard | Enforcement |
|---|---|
| Concise | executiveSummary < 300 chars (tested); briefing sections capped |
| Sourced | answers come only from OwnerSummary / registries; fallback admits ignorance |
| Honest | self-knowledge model marks MEMORY_STORE/VOICE/EXTERNAL_TOOLS as not wired (tested) |
| Prioritized | CRITICAL → URGENT → ATTENTION → ROUTINE drives border + ordering |
| Actionable | every JarvisAnswer carries `nextAction`; briefing ends with NEXT BUILD |
| Approval-gated | every state-changing category `requiresApproval: true` (tested) |
| Self-correcting | `recordSelfCorrection()` appends to the model's log (tested) |
| No fake autonomy | DispatchPlan.status is PROPOSED until a human acts; no execution path exists |

## Session memory

`session-memory.ts`: facts are stored once — a duplicate add bumps `usedCount`
instead of re-deriving (tested). Corrections supersede; nothing is deleted.
`buildSessionHandoff()` exports a HANDOFF ScribeEntry for the vault, because
cross-session memory is **not** wired and we don't pretend it is.
