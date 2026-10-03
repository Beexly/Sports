# Jarvis Operator Brief

One page for the human owner of Galaxy Sports Edge: what Jarvis can answer today, what is wired versus not, what structurally requires your approval, what to build next, and where to look. Everything here derives from the capability registry, agent council, intelligence state, and Ask Jarvis source files — nothing is aspirational.

Last updated: 2026-06-11
Status: CURRENT — reflects the registries as committed; zero capabilities are autonomous.

## What Jarvis Can Answer Today — 18 Deterministic Intents

Ask Jarvis (`apps/web/lib/cockpit/ask-jarvis.ts`) is a pure function over live state. No model calls, no fabrication; every answer carries supporting facts, a confidence level, caveats, and a next action.

**Operations** (answered from the live OwnerSummary):

| Intent | Question |
|---|---|
| `picks` | Where are our picks? |
| `launch-ready` | Are we launch-ready? |
| `performance` | Can we show performance? |
| `blocked` | What is blocked? |
| `decisions` | What needs my decision? |
| `today` | What changed today? |
| `workers` | What are workers doing? |
| `meeting` | What should I know before a meeting? |
| `ai-ops` | What is our AI Ops / Claude / Codex status? |

**Architecture & System** (answered from the capability registry, agent council, and memory protocol):

| Intent | Question |
|---|---|
| `what-is-jarvis` | What is Jarvis? |
| `what-is-wired` | What is actually wired? |
| `what-is-not-wired` | What is not wired yet? |
| `what-can-run` | What can run today? |
| `which-agent-owns-this` | Which agent owns what? |
| `what-needs-approval` | What needs my approval? |
| `what-should-we-build-next` | What should we build next? |
| `what-is-ai-ops-status` | What is the AI Ops posture? |
| `what-is-memory-status` | What is Jarvis memory status? |

## Wired vs Not

- **Wiring score: 38/100 — "Early Stage"** (status-weighted across 16 capabilities; ACTIVE=4 … NOT_WIRED=0).
- **8 of 16 capabilities exist in working form** — 5 DRAFT_ONLY (outputs await your approval) + 3 MANUAL (you or another human runs them). **0 are ACTIVE/autonomous — intentionally.**
- **8 of 16 are not functional** — 3 DESIGNED, 5 NOT_WIRED (including memory, MCP tool routing, browser control, voice, workflow automation).
- Operating loop: SENSE / INTERPRET / DECIDE / EXPLAIN are WIRED; ACT_SAFELY and AUDIT are PARTIAL; REMEMBER and IMPROVE are NOT_WIRED.
- Agent council: 15 seats — 6 registered cockpit agents (all DRAFT_ONLY), 3 human-run MANUAL roles, 6 designed-but-unwired seats. No seat takes external actions.
- Memory: **none.** Context rebuilds from the database every load; these docs are the only durable memory.

## What Needs Your Approval (structural, not optional)

14 of 16 capabilities require human approval before anything externally visible happens. The owner-decision gates:

- **PUBLIC_PICKS_ENABLED** — picks stay internal until you open it (picks-intelligence, customer-surface).
- **PERFORMANCE_STATS_ENABLED + sample threshold** — win rate displays only when the gate is open AND the canonical settled sample meets the minimum (default 25). Until then `actualWinRate` is null everywhere.
- **Safety warnings** — only you clear them; Jarvis cannot (risk-public-claims, risk CRITICAL).
- **All content publishing** — AVA drafts; you publish. No auto-publish path exists.
- **Settlement verification, pricing/subscription changes, and any new tool connection** — owner decisions.

## Recommended Build Order

The `what-should-we-build-next` intent ranks gaps deterministically: **MANUAL first** (the process already works — automate it), **then DESIGNED, then NOT_WIRED**; higher operational risk first within each band. Current top of the ranking:

1. **Settlement & Results** (MANUAL, HIGH) — wire an external score source for auto-settlement.
2. **Performance Calibration** (MANUAL, HIGH) — accumulate 25 canonical settled picks, then review.
3. **AI Ops / Token Discipline** (MANUAL, MEDIUM) — wire ccusage totals to /cockpit/api-costs, then Langfuse.
4. **Revenue & Subscriptions** (DESIGNED, HIGH) — build BOBBY's churn/upgrade intelligence.
5. **Market / Line Intelligence** (DESIGNED, MEDIUM) — build CLV tracking (open line, close line, result).
6. **Agent Orchestration** (DESIGNED, MEDIUM) — BullMQ task routing from Jarvis to agent queues.

Caveat (stated by the intent itself): this is a deterministic heuristic over status depth and risk — not a market analysis. You set the real roadmap.

## Where to Look

| Surface | What it shows |
|---|---|
| `/cockpit` | Command bridge: posture color, decision queue, safety warnings, Ask Jarvis. |
| `/cockpit/agents` | Agent council and charters. |
| `/cockpit/calibration` | Performance calibration and display-gate state. |
| `/cockpit/history` | Pick ledger and settlement history (proof source for picks and settlement). |
| `/admin/dashboard` | Ingestion and worker run timestamps; data reliability. |

## Red Lines the System Enforces

- **Drafts only.** Every agent output requires your approval; `externalActions: "NONE"` on all 15 seats; `canExecute: false` on all 16 capabilities.
- **Performance display gates.** The 70% figure is a target, never a claim. Win rate is shown only when the gate is open and the canonical sample suffices; pending and bootstrap picks never count.
- **No fake telemetry.** AI Ops reports "not instrumented" until it is. No token counts, recalled memories, CLV figures, or autonomy claims without real instrumentation behind them. Absence of data is reported as absence.
