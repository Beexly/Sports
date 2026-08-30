# Jarvis Agent Council

The agent council (`apps/web/lib/jarvis/agent-council.ts`) is the governed roster of intelligence roles that operate Galaxy Sports Edge. A council seat is a **role with a charter, not a running process**. Six seats correspond to registered cockpit agents in the cockpit agent registry and the Prisma `OperatorAgent` enum; the remaining 17 seats are designed roles for capabilities that are human-run or not yet wired. No seat is autonomous, and no seat ever takes external actions on its own.

Last updated: 2026-06-12
Status: LIVE IN CODE — 23 seats, 6 departments, upgraded with governance fields per build spec.

## Council Concept

- A seat = an id, a codename, a role, a charter, a `currentTruth`, owned capabilities, safe actions, forbidden actions, department, authority tier, escalation targets, and handoff routing.
- Seat statuses are `DRAFT_ONLY` (registered cockpit role producing drafts for approval), `MANUAL` (work happens but a human runs it; no agent role wired), or `NOT_WIRED` (designed seat for a capability not yet built). There is **no AUTONOMOUS status**.
- `externalActions: "NONE"` and `externalActionsAllowed: false` are hard invariants on every seat. No seat performs external actions without human approval.
- Every `ownsCapabilities` entry must be a real capability-registry id (validated by tests). Every capability has exactly one owning seat.

## The 23 Seats in Departments

### Dept 1 — Command & Governance

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `jarvis` | JARVIS | Chief Intelligence Officer | DRAFT_ONLY | 1 | Owner | Owner |
| `ai-ops-officer` | METER | AI Ops & Token Discipline Officer | MANUAL | 2 | Owner, JARVIS | Owner |
| `memory-librarian` | ARCHIVE | Memory & Knowledge Base Librarian | NOT_WIRED | 0 | JARVIS | JARVIS |

### Dept 2 — Sports Intelligence

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `scout` | SCOUT | Picks Desk Analyst | DRAFT_ONLY | 1 | JARVIS | JARVIS |
| `market-analyst` | DELTA | Market / Line Intelligence Analyst | NOT_WIRED | 0 | SCOUT | SCOUT, JARVIS |
| `stat-rd-lead` | PRISM | Advanced Player-Stat R&D Head | NOT_WIRED | 0 | JARVIS | JARVIS |
| `gse-score-optimizer` | ASCEND | GSE Rating Improvement (standing subagent) | NOT_WIRED | 0 | PRISM | PRISM, AUDIT, JARVIS |

### Dept 3 — Results & Calibration

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `settlement-officer` | LEDGER | Settlement & Results Officer | MANUAL | 2 | JARVIS | JARVIS |
| `performance-auditor` | AUDIT | Performance & Calibration Auditor | MANUAL | 2 | Owner, JARVIS | Owner |

**AUDIT independence:** AUDIT does not report to or receive review from SCOUT, DELTA, PRISM, or ASCEND — pick and metric builders are never the final judge of display safety.

### Dept 4 — Data & Automation Platform

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `tal` | TAL | Data Reliability Engineer | DRAFT_ONLY | 1 | JARVIS | JARVIS |
| `tool-router` | RELAY | Tool Router / MCP Gateway | NOT_WIRED | 0 | JARVIS, METER | Owner |
| `browser-operator` | PILOT | Browser / Computer Control Operator | NOT_WIRED | 0 | RELAY | Owner |
| `voice-operator` | ECHO | Voice Interface Operator | NOT_WIRED | 0 | RELAY, JARVIS | JARVIS |
| `workflow-coordinator` | CHAIN | Workflow Automation Coordinator | NOT_WIRED | 0 | JARVIS, METER | Owner |

### Dept 5 — Customer Surface & Quality

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `sarah` | SARAH | Customer Surface Officer | DRAFT_ONLY | 1 | JARVIS | JARVIS |
| `ava` | AVA | Content Officer | DRAFT_ONLY | 1 | JARVIS | JARVIS |
| `quality-officer` | GAUGE | Quality Assurance Department Head | NOT_WIRED | 0 | JARVIS | JARVIS |
| `voice-humanizer` | QUILL | Brand Voice & Humanizer Department Head | NOT_WIRED | 0 | JARVIS, Owner | Owner |

### Dept 6 — Growth, Community & Finance

| ID | Codename | Role | Status | Tier | Reports to | Escalates to |
|---|---|---|---|---|---|---|
| `bobby` | BOBBY | Revenue Analyst | DRAFT_ONLY | 1 | JARVIS | JARVIS |
| `growth-marketer` | FLARE | Marketing & Customer Sourcing Head | NOT_WIRED | 0 | JARVIS | Owner |
| `engagement-officer` | PULSE | Community & Engagement Head | NOT_WIRED | 0 | JARVIS | Owner |
| `forecast-planner` | VECTOR | Analytics, Forecasting & Planning Head | NOT_WIRED | 0 | JARVIS | JARVIS |
| `financial-controller` | MINT | Financials Head | NOT_WIRED | 0 | Owner, JARVIS | Owner |

### Seat counts (from `getCouncilSeatCounts()`)

- Total: **23** · DRAFT_ONLY: **6** · MANUAL: **3** · NOT_WIRED: **14** · Registered cockpit agents: **6**

## Authority Tiers

| Tier | Meaning | Seats |
|---|---|---|
| 0 | Read Only — no output until wired | All 14 NOT_WIRED seats |
| 1 | Draft Only — outputs require human approval | JARVIS, SCOUT, TAL, SARAH, AVA, BOBBY |
| 2 | Safe Internal Action (manual, human-run) | LEDGER, AUDIT, METER |
| 3 | Approval Required — after explicit owner approval | (reserved for future wiring) |
| 4 | Human Only — legal, public claims, spending | Owner only |

Default: all seats are Tier 0/1 unless explicitly wired and owner-approved.

## Subagents

Subagents are temporary narrow workers spawned by a seat for one task. They never: take external action, publish, confirm memory, approve claims, override parents, or write canonical data without review. All output is a draft until parent review.

| Seat | Subagent templates |
|---|---|
| SCOUT | injury-context, schedule-spot, odds-movement annotator, weather/context, team-news |
| TAL | schema-drift, ingestion-freshness, failed-test summarizer, adapter-health |
| AVA | newsletter-draft, blog-outline, short-form copy |
| GAUGE | claims-QA, layout-QA, number-consistency, broken-link |
| PRISM | metric-prototype, validation-check, feature-gap hunter, ASCEND template, stat-modeling |

**ASCEND** is a standing subagent under PRISM: proposes GSE improvement experiments continuously. AUDIT reviews calibration impact. JARVIS escalates meaningful scoring changes to Owner.

## Routing Rules (spec §6)

All 13 routes are testable via `ROUTING_RULES` in `apps/web/lib/jarvis/routing-rules.ts`.

| Task Type | Route | Ends at |
|---|---|---|
| `pick-research` | SCOUT → DELTA → TAL → JARVIS → Owner | Owner |
| `settlement` | LEDGER → AUDIT → JARVIS | JARVIS |
| `public-content` | AVA → QUILL → GAUGE → JARVIS → Owner | Owner |
| `customer-dashboard` | SARAH → GAUGE → TAL → JARVIS | JARVIS |
| `data-incident` | TAL → METER → JARVIS → Owner | Owner |
| `memory-decision` | ARCHIVE → JARVIS → Owner | Owner |
| `tool-browser` | RELAY → PILOT → Owner | Owner |
| `workflow-automation` | CHAIN → METER → JARVIS → Owner | Owner |
| `marketing` | FLARE → BOBBY → QUILL → GAUGE → JARVIS → Owner | Owner |
| `community-launch` | PULSE → SARAH → GAUGE → JARVIS → Owner | Owner |
| `revenue-pricing` | BOBBY → MINT → VECTOR → JARVIS → Owner | Owner |
| `forecasting` | VECTOR → BOBBY/MINT/TAL → JARVIS | JARVIS |
| `stat-rd` | PRISM → ASCEND → AUDIT → JARVIS → Owner | Owner |

Routes with optional steps use `gateCondition` to describe when a step activates.

## Handoff Protocol Overview

Handoffs are tracked in `AgentHandoffEntry` (see `apps/web/lib/jarvis/ledger-types.ts`). Each entry captures: source agent, target agent, reason, task type, evidence, risk level, authority tier, status, owner approval required, timestamp, and outcome. The handoff ledger is **not_connected** until a database migration is run — no entries are simulated.

Subagent runs are tracked in `SubagentRunEntry`: subagent id, parent seat, task, input context, output artifact, confidence, uncertainty, evidence, prohibited-actions check, parent review status, and acceptance state. Also **not_connected** until wired.

## Guardrails (non-negotiable, spec §10)

1. No agent may publish, place bets, send emails, or post to social media without owner approval.
2. No agent may scrape or browse externally without owner approval and an approved domain.
3. No agent may claim real telemetry unless the instrumentation is wired and verified.
4. No agent may treat simulated data as real operational data.
5. No agent may confirm memory outside the memory protocol.
6. No agent may override AUDIT on calibration or display-safety decisions.
7. No agent may override METER on model selection or cost-discipline decisions.
8. No agent may override JARVIS on routing decisions.
9. No agent may override the Owner on final approval for any externally visible action.
10. No agent may take any external action — `externalActionsAllowed` is always `false`.

## Implementation Status (as of 2026-06-12)

| Component | Status |
|---|---|
| 23 seats registered with full governance fields | DONE |
| 6 departments with lead seats | DONE |
| Authority tiers on all seats | DONE |
| `externalActionsAllowed: false` on all seats | DONE |
| `reportsTo[]`, `escalatesTo[]` arrays on all seats | DONE |
| ASCEND as standing subagent under PRISM, reviewed by AUDIT | DONE |
| Subagent templates on SCOUT, TAL, AVA, GAUGE, PRISM | DONE |
| Routing rules module (`routing-rules.ts`) | DONE |
| Ledger types module (`ledger-types.ts`) | DONE |
| `GUARDRAILS` export (10 rules) | DONE |
| `getCouncilByDepartment()` helper | DONE |
| Department-oriented cockpit UI | DONE |
| Handoff ledger database store | NOT_WIRED |
| Subagent run ledger database store | NOT_WIRED |
| Live agent handoff execution | NOT_WIRED |

## Escalation Model

```
seat ──► JARVIS (Chief Intelligence Officer) ──► OWNER (human)
```

- Most seats escalate to **JARVIS**, which assesses platform state, raises safety warnings to the decision queue, and recommends — never decides.
- JARVIS itself escalates to the **OWNER**. Seats with direct owner-level consequence also escalate directly: AUDIT (performance display), METER (AI spend), RELAY (tool connections), PILOT (browser actions), CHAIN (workflow gates), FLARE (external channels), PULSE (community launch), MINT (financials), QUILL (brand voice on public surfaces).
- The owner is the only actor who clears safety warnings, opens gates, approves drafts, or authorizes any external action.

## Related Files

- `apps/web/lib/jarvis/agent-council.ts` — the roster (authoritative).
- `apps/web/lib/jarvis/routing-rules.ts` — the 13 routing rule definitions.
- `apps/web/lib/jarvis/ledger-types.ts` — handoff and subagent run ledger types.
- `apps/web/lib/jarvis/capability-registry.ts` — capabilities the seats own.
- `apps/web/lib/cockpit/agents.ts` — cockpit agent registry for the six registered agents.
- `apps/web/__tests__/jarvis-agent-council.test.ts` — acceptance criteria tests.
- `/cockpit/agents` — cockpit UI where the council and agent charters surface.
