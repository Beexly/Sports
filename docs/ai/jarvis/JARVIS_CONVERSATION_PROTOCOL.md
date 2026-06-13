# Jarvis Conversation Protocol

Last updated: 2026-06-13
Status: WIRED — conversation engine ships in Layer A of Jarvis Executive Intelligence v2.

Jarvis is not a chatbot. The conversation surface is a **deterministic executive Q&A interface** where the owner asks and Jarvis answers from live OwnerSummary state. Zero model API calls happen at runtime. All responses are derived from registered intent patterns matched against the owner's input.

## Core Design Invariants

1. **No fabrication.** Every number in a Jarvis response must be sourced from `OwnerSummary` — never invented, interpolated, or assumed.
2. **Approval-gated actions.** Jarvis proposes. Owner decides. Every `DispatchPlan` has `requiresApproval: true` as a literal type — this is not configurable.
3. **No fake autonomy.** Jarvis does not claim to execute tasks he cannot execute. Voice interfaces, external tool calls, and MCP integrations are explicitly declared as `NOT_WIRED` in the self-knowledge model.
4. **Scribe-worthy signals are recorded.** CRITICAL messages, dispatch plans, decisions, and approval requests are candidates for the scribe log and session handoff.

## Intent Detection

Intent detection is pure pattern matching — no model inference. Input is lowercased and matched against an ordered list of `INTENT_PATTERNS`.

| Pattern (approx.) | Intent | Task Category | Confidence |
|---|---|---|---|
| `run today` / `dispatch overnight loop` | — | `OVERNIGHT_LOOP` | HIGH |
| `what needs me` / `needs my` | `decisions` | — | HIGH |
| `what's blocked` / `blocked` | `blocked` | — | HIGH |
| `status` / `how are we doing` / `morning briefing` | `today` | — | HIGH |
| `are we launch-ready` / `launch-ready` | `launch-ready` | — | HIGH |
| `can we show performance` | `performance` | — | MEDIUM |
| `fix ` | — | `FIX` | HIGH |
| `check ` | — | `CHECK` | MEDIUM |
| (unrecognized) | null | `GENERAL_INQUIRY` | LOW |

## Conversation Session

Each session is a `ConversationSession` value object — immutable, append-only.

```ts
interface ConversationSession {
  sessionId: string;
  startedAt: string;
  messages: readonly ConversationMessage[];
  ownerDecisionsPending: number;
  openActionItems: readonly string[];
}
```

Sessions are not persisted automatically. The owner triggers session handoff explicitly via the "Scribe this session" button, which produces a `ScribeEntry` of type `"HANDOFF"` for the vault.

## Message Priority Rules

| Priority | When applied |
|---|---|
| `CRITICAL` | `overallColor === "RED"` or `criticalWarnings.length > 0` |
| `URGENT` | `overallColor === "YELLOW"` or advisory warnings present |
| `ATTENTION_REQUIRED` | Dispatch plan produced, approval required |
| `ROUTINE` | All other responses |

## Dispatch Plans

A `DispatchPlan` describes a task Jarvis proposes — but never executes. Anatomy:

```ts
interface DispatchPlan {
  category: TaskCategory;
  description: string;
  sequence: readonly string[];   // agent keys in order
  requiresApproval: true;        // literal, not configurable
  estimatedImpact: "LOW" | "MEDIUM" | "HIGH";
}
```

The owner approves or rejects. Jarvis records approved dispatches in the session context as `TASK_DISPATCHED` facts.

## Quick Action Chips

The UI surfaces six quick-action chips that bypass free-form typing:

- `Run today` → OVERNIGHT_LOOP dispatch
- `Morning briefing` → today intent with full briefing
- `What needs me?` → decisions intent
- `What's blocked?` → blocked intent
- `Dispatch overnight loop` → explicit OVERNIGHT_LOOP dispatch
- `How are we doing?` → today intent summary

## Session Scribe Export

The "Scribe this session" export produces a vault-formatted `ScribeEntry`:

```
type: HANDOFF
vaultPath: 01-daily/YYYY-MM-DD.md
body: decisions made + tasks dispatched + risks surfaced + open items
```

This is the primary mechanism for persisting institutional memory between sessions until the memory store is wired.

## Related Files

| File | Role |
|---|---|
| `apps/web/lib/jarvis/conversation-engine.ts` | Layer A: intent detection, response building, session management |
| `apps/web/lib/jarvis/session-memory.ts` | Layer B: fact accumulation, supersession, handoff |
| `apps/web/components/jarvis/jarvis-conversation.tsx` | Layer F: conversation UI (client component) |
| `apps/web/app/cockpit/jarvis/conversation/page.tsx` | Layer H: conversation page (server component) |
