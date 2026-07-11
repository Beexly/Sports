# Jarvis Capability Registry

The capability registry (`apps/web/lib/jarvis/capability-registry.ts`) is the single source of truth for every intelligence capability in Galaxy Sports Edge. Each capability declares its honest status, governance rules, risk level, and next action. This document mirrors the registry as of the date below; the TypeScript file is authoritative if the two ever diverge.

Last updated: 2026-06-11
Status: LIVE IN CODE — the registry is real and consumed by the cockpit; the capabilities it describes are at the statuses listed (zero ACTIVE).

## The Status Ladder

Ordered by wiring depth. A capability holds exactly one status:

| Status | Definition |
|---|---|
| `NOT_WIRED` | Concept exists, zero code. |
| `DESIGNED` | Architecture defined, partial infrastructure, not functional. |
| `MANUAL` | Works, but only via a human-operated process. |
| `DRAFT_ONLY` | Automated outputs exist, all require human approval. |
| `ACTIVE` | Fully autonomous within its defined boundaries. |

**Trust rule:** never mark ACTIVE unless the capability truly executes autonomously without human intervention in the repo's current state. Today, **zero capabilities are ACTIVE** — by design.

## The 16 Capabilities

| ID | Name | Category | Status | Risk | Owner mode | Next action |
|---|---|---|---|---|---|---|
| `picks-intelligence` | Picks Intelligence | INTELLIGENCE_CORE | DRAFT_ONLY | MEDIUM | OWNER_DECISION_REQUIRED | Open PUBLIC_PICKS_ENABLED gate when data quality and trust gates are satisfied. |
| `market-line-intelligence` | Market / Line Intelligence | INTELLIGENCE_CORE | DESIGNED | MEDIUM | NOT_WIRED | Decompose CLV (capture book disagreement at lock), add line-movement alerts, and verify production CLV rows before promoting beyond DESIGNED. |
| `data-reliability` | Data Reliability | INTELLIGENCE_CORE | DRAFT_ONLY | HIGH | DRAFT_AWAITS_APPROVAL | Wire auto-alerting on stale ingestion (>4h) to cockpit decision queue. |
| `settlement-results` | Settlement & Results | PLATFORM_OPERATIONS | MANUAL | HIGH | MANUAL_OPERATOR | Wire external score data source (ESPN/The Odds API results) for auto-settlement. |
| `performance-calibration` | Performance Calibration | PLATFORM_OPERATIONS | MANUAL | HIGH | MANUAL_OPERATOR | Accumulate 25 canonical settled picks. Then review win rate. Open gate if accurate. |
| `risk-public-claims` | Risk & Public Claims | PLATFORM_OPERATIONS | DRAFT_ONLY | CRITICAL | OWNER_DECISION_REQUIRED | Resolve any active safety warnings before expanding public reach. |
| `customer-surface` | Customer Surface | GROWTH_REVENUE | DRAFT_ONLY | HIGH | DRAFT_AWAITS_APPROVAL | Open PUBLIC_PICKS_ENABLED gate to serve public picks to all tiers. |
| `content-media` | Content & Media | GROWTH_REVENUE | DRAFT_ONLY | HIGH | DRAFT_AWAITS_APPROVAL | Review draft content queue at /cockpit/content before expanding to newsletter. |
| `revenue-subscriptions` | Revenue & Subscriptions | GROWTH_REVENUE | DESIGNED | HIGH | OWNER_DECISION_REQUIRED | Build BOBBY subscription intelligence layer: churn signals, tier migration triggers. |
| `ai-ops-token-discipline` | AI Ops / Token Discipline | AI_INFRASTRUCTURE | MANUAL | MEDIUM | MANUAL_OPERATOR | Wire ccusage daily totals to /cockpit/api-costs. Then add Langfuse. |
| `memory-knowledge-base` | Memory / Knowledge Base | AI_INFRASTRUCTURE | DESIGNED | LOW | OWNER_DECISION_REQUIRED | Owner activation: confirm the production migration, record the first governed memory write, then promote per JARVIS_MEMORY_PROTOCOL.md. |
| `tool-router-mcp-layer` | Tool Router / MCP Layer | AI_INFRASTRUCTURE | NOT_WIRED | MEDIUM | NOT_WIRED | Wire Claude MCP SDK. Register The Odds API as first approved tool. |
| `agent-orchestration` | Agent Orchestration | AI_INFRASTRUCTURE | DESIGNED | MEDIUM | NOT_WIRED | Implement BullMQ-based orchestration layer: task routing from Jarvis to agent queues. |
| `browser-computer-control` | Browser / Computer Control | AI_INFRASTRUCTURE | NOT_WIRED | HIGH | NOT_WIRED | NOT YET — wire MCP tool bus first. Browser control comes after tool routing. |
| `voice-interface` | Voice Interface | AI_INFRASTRUCTURE | NOT_WIRED | MEDIUM | NOT_WIRED | NOT YET — wire Ask Jarvis console fully first. Voice layer is Phase 4+. |
| `workflow-automation` | Workflow Automation | AI_INFRASTRUCTURE | NOT_WIRED | MEDIUM | NOT_WIRED | Wire BullMQ workflow coordinator: ingestion → scoring → quality check → picks routing. |

### Counts by status

| Status | Count | Capabilities |
|---|---|---|
| ACTIVE | 0 | — |
| DRAFT_ONLY | 5 | picks-intelligence, data-reliability, risk-public-claims, customer-surface, content-media |
| MANUAL | 3 | settlement-results, performance-calibration, ai-ops-token-discipline |
| DESIGNED | 4 | market-line-intelligence, revenue-subscriptions, agent-orchestration, memory-knowledge-base |
| NOT_WIRED | 4 | tool-router-mcp-layer, browser-computer-control, voice-interface, workflow-automation |

### Counts by category

- INTELLIGENCE_CORE: 3 · PLATFORM_OPERATIONS: 3 · GROWTH_REVENUE: 3 · AI_INFRASTRUCTURE: 7

Other registry-wide facts: `canExecute` is `false` for all 16 capabilities. 8 capabilities `canAnswer` from live data — memory stays `canAnswer: false` until recall is live-backed by a confirmed production write, so live-answer coverage is never overstated. 15 of 16 require human approval (`requiresHumanApproval`); only `ai-ops-token-discipline` does not, because it has no externally visible output to approve. Memory requires approval: every memory promotion passes the owner review queue at `/cockpit/memory`.

## Wiring Score

Computed by `computeWiringScore()`:

1. Each capability's status maps to a weight: **ACTIVE = 4, DRAFT_ONLY = 3, MANUAL = 2, DESIGNED = 1, NOT_WIRED = 0**.
2. Sum the weights across all 16 capabilities; divide by the maximum possible (16 × 4 = 64); multiply by 100 and round.

Current score: (5×3 + 3×2 + 4×1 + 4×0) = 25 / 64 → **39 / 100**.

Label bands from `getWiringLabel()`:

| Score | Label |
|---|---|
| ≥ 80 | Operational |
| ≥ 55 | Building |
| ≥ 30 | Early Stage |
| < 30 | Foundation |

Current label: **Early Stage (39/100)**. The score moves only when a capability's status changes in the registry — it cannot be adjusted for optics.

## Governance: How a Capability Earns a Promotion

A status change is a **code change to `capability-registry.ts`**, reviewed like any other change. Promotions must be demonstrated in the repo, never aspirational:

- **NOT_WIRED → DESIGNED**: architecture is defined and partial infrastructure exists in the repo (types, schema, adapters) — but the capability is not functional.
- **DESIGNED → MANUAL**: a human can actually run the process end-to-end with what is in the repo today (e.g., manually triggering the settlement worker).
- **MANUAL → DRAFT_ONLY**: automated outputs exist in code, and every output lands in a review queue requiring human approval. No auto-publish path may exist.
- **DRAFT_ONLY → ACTIVE**: the capability truly executes autonomously within defined boundaries, with audit logging, and the owner has explicitly accepted the autonomy. No capability has met this bar.

Demotions are applied immediately when reality regresses (e.g., a worker is removed, a gate breaks). The `currentTruth` field must always describe what is real right now, and `nextAction` must name the concrete next step. Forbidden actions are part of the capability definition and travel with it through every promotion.
