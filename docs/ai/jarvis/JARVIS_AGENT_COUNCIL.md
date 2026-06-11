# Jarvis Agent Council

The agent council (`apps/web/lib/jarvis/agent-council.ts`) is the governed roster of intelligence roles that operate Galaxy Sports Edge. A council seat is a **role with a charter, not a running process**. Six seats correspond to registered cockpit agents that exist in the cockpit agent registry and the Prisma `OperatorAgent` enum; the remaining nine are designed roles for capabilities that are human-run or not wired yet. No seat is autonomous, and no seat ever takes external actions on its own.

Last updated: 2026-06-11
Status: LIVE IN CODE — the roster is real and consumed by the cockpit; the seats are charters, not runtimes.

## Council Concept

- A seat = an id, a codename, a role, a charter, a `currentTruth`, owned capabilities, safe actions, forbidden actions, and an escalation target.
- Seat statuses are `DRAFT_ONLY` (registered cockpit role producing drafts for approval), `MANUAL` (the work happens, but a human runs it; no agent role wired), or `NOT_WIRED` (designed seat for a capability that does not exist yet). There is **no AUTONOMOUS status**.
- `externalActions` is always `"NONE"` — a hard invariant on every seat. No seat performs external actions without human approval. This mirrors the cockpit agent registry.
- Every `ownsCapabilities` entry must be a real capability-registry id (validated by tests). Every capability has exactly one owning seat.

## The 15 Seats

| ID | Codename | Role | Status | Registered cockpit agent | Owns capabilities | Escalates to |
|---|---|---|---|---|---|---|
| `jarvis` | JARVIS | Chief Intelligence Officer | DRAFT_ONLY | Y | agent-orchestration, risk-public-claims | OWNER |
| `scout` | SCOUT | Picks Desk Analyst | DRAFT_ONLY | Y | picks-intelligence | JARVIS |
| `tal` | TAL | Data Reliability Engineer | DRAFT_ONLY | Y | data-reliability | JARVIS |
| `sarah` | SARAH | Customer Surface Officer | DRAFT_ONLY | Y | customer-surface | JARVIS |
| `ava` | AVA | Content Officer | DRAFT_ONLY | Y | content-media | JARVIS |
| `bobby` | BOBBY | Revenue Analyst | DRAFT_ONLY | Y | revenue-subscriptions | JARVIS |
| `settlement-officer` | LEDGER | Settlement & Results Officer | MANUAL | N | settlement-results | JARVIS |
| `performance-auditor` | AUDIT | Performance & Calibration Auditor | MANUAL | N | performance-calibration | OWNER |
| `ai-ops-officer` | METER | AI Ops & Token Discipline Officer | MANUAL | N | ai-ops-token-discipline | OWNER |
| `market-analyst` | DELTA | Market / Line Intelligence Analyst | NOT_WIRED | N | market-line-intelligence | JARVIS |
| `memory-librarian` | ARCHIVE | Memory & Knowledge Base Librarian | NOT_WIRED | N | memory-knowledge-base | JARVIS |
| `tool-router` | RELAY | Tool Router / MCP Gateway | NOT_WIRED | N | tool-router-mcp-layer | OWNER |
| `browser-operator` | PILOT | Browser / Computer Control Operator | NOT_WIRED | N | browser-computer-control | OWNER |
| `voice-operator` | ECHO | Voice Interface Operator | NOT_WIRED | N | voice-interface | JARVIS |
| `workflow-coordinator` | CHAIN | Workflow Automation Coordinator | NOT_WIRED | N | workflow-automation | OWNER |

### Seat counts (from `getCouncilSeatCounts()`)

- Total: **15** · DRAFT_ONLY: **6** · MANUAL: **3** · NOT_WIRED: **6** · Registered cockpit agents: **6**

The six registered cockpit agents (JARVIS, SCOUT, TAL, SARAH, AVA, BOBBY) are all DRAFT_ONLY: their outputs are drafts in review queues. The three MANUAL seats (LEDGER, AUDIT, METER) name work that genuinely happens today but is human-run with no agent role wired. The six NOT_WIRED seats (DELTA, ARCHIVE, RELAY, PILOT, ECHO, CHAIN) are designed charters for capabilities that do not exist yet — their primary safe action is documenting the design.

## Escalation Model

```
seat ──► JARVIS (Chief Intelligence Officer) ──► OWNER (human)
```

- Most seats escalate to **JARVIS**, which assesses platform state, raises safety warnings to the decision queue, and recommends — never decides.
- JARVIS itself escalates to the **OWNER**. So do seats whose domain carries direct owner-level consequence: AUDIT (performance display), METER (AI spend), RELAY (new tool connections), PILOT (browser actions), and CHAIN (workflow gates).
- The owner is the only actor who clears safety warnings, opens gates, approves drafts, or authorizes any external action. JARVIS is forbidden from clearing a safety warning without owner review, claiming autonomy or wiring that does not exist, or making public claims of any kind.

## Rules for Adding a Seat

A new seat is a code change to `agent-council.ts`, reviewed like any other change:

1. **It must own at least one capability** that exists in `capability-registry.ts`. No seat without a real registry capability; no orphan capability ids (validated by tests).
2. **Honest status only.** `DRAFT_ONLY` requires the seat to be a registered cockpit agent (registry + Prisma enum). `MANUAL` requires the underlying work to actually run via a human today. Otherwise the seat is `NOT_WIRED`.
3. **Forbidden actions are required.** Every seat must declare what it will not do, and the forbidden list must cover its risk surface (e.g., no auto-publish, no fabricated recall, no unverified claims).
4. **`externalActions: "NONE"` is non-negotiable.** There is no mechanism for a seat to take external actions; adding one would require an owner-approved orchestration runtime with audit logging that does not exist yet (see `agent-orchestration`, status DESIGNED).
5. **`currentTruth` must be accurate** at the time of merge and updated whenever reality changes.

## Related Files

- `apps/web/lib/jarvis/agent-council.ts` — the roster (authoritative).
- `apps/web/lib/jarvis/capability-registry.ts` — capabilities the seats own.
- `apps/web/lib/cockpit/agents.ts` — the cockpit agent registry for the six registered agents.
- `/cockpit/agents` — where the council and agent charters surface in the UI.
