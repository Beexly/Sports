# Jarvis Agent Council — owner build spec (2026-06-12, verbatim)

> QUEUED build (second Jarvis block, behind the Memory Protocol build).
> Preserves the full owner dump; the tracker points here. Companion:
> `JARVIS_MEMORY_BUILD_SPEC_2026-06-12.md`, existing protocol docs in
> this directory.

**Current state:** 23 Agent Council seats. 6 registered cockpit agents,
draft-only (JARVIS, SCOUT, TAL, SARAH, AVA, BOBBY). 3 manual (LEDGER,
AUDIT, METER). 14 designed but not wired (DELTA, ARCHIVE, RELAY, PILOT,
ECHO, CHAIN, GAUGE, QUILL, FLARE, PULSE, VECTOR, MINT, PRISM, ASCEND).

**Core principle:** Do NOT turn all 23 seats into autonomous processes.
Seats are persistent roles with charters, routing rules, permission
limits, escalation paths, and review responsibilities. Subagents are
temporary task-workers spawned under a seat for a narrow job — they do
not own strategy, publish, take external action, or write confirmed
memory without approval. No external actions without explicit human
approval.

**Mission:** Assign the council into departments, define seat vs
subagent, register all 23 seats in the capability registry, preserve
current wiring truth, and build routing/governance so Jarvis can assign
work safely. Do not pretend not-wired agents are running. Do not
fabricate capability. Seat states: Draft Only / Manual / Not Wired.
Capability connection states: Wired / Manual / Simulated / Not Connected.

## 1. Hierarchy

**Owner — Garrett / Beex.** Final authority: all public claims,
spending, legal-sensitive language, external actions, publishing,
betting/gambling-sensitive claims, production-impacting decisions.

**Council Chair — JARVIS (Chief Intelligence Officer).** Owns platform
state interpretation, owner brief, routing, escalation, public claims
guardrail, agent handoff discipline, final recommendation to owner.
Takes no external action.

## 2. Departments & seats

### Dept 1 — Command & Governance
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| JARVIS | Draft Only | Chief Intelligence Officer — sense, interpret, prioritize, route, guard public claims, recommend | Owner | Owner |
| METER | Manual | AI Ops & Token Discipline Officer — model usage, token spend, lane policy, observability, cost | Owner + JARVIS | Owner |
| ARCHIVE | Not Wired | Memory & Knowledge Base Librarian — persist decisions, memory candidates, confirmed memories, recall | JARVIS | JARVIS |

### Dept 2 — Sports Intelligence
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| SCOUT | Draft Only | Picks Desk Analyst — odds movement, injury news, schedule signals, grounded pick context | JARVIS | JARVIS |
| DELTA | Not Wired | Market/Line Intelligence — line movement, CLV, consensus, public-vs-sharp, volatility | SCOUT | SCOUT → JARVIS |
| PRISM | Not Wired | Advanced Player-Stat R&D Head — metric design, statistical validation, out-of-sample testing, proprietary-data roadmap | JARVIS | JARVIS |
| ASCEND | Not Wired | GSE Rating Improvement — **standing subagent under PRISM**, reviewed by AUDIT; proposes experiments, never approves scoring changes | PRISM | PRISM, AUDIT, JARVIS |

### Dept 3 — Results & Calibration
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| LEDGER | Manual | Settlement & Results Officer — canonical win/loss ledger from verified outcomes | JARVIS | JARVIS |
| AUDIT | Manual | Performance & Calibration Auditor — accuracy vs canonical results, sample-size rules, calibration gates, display safety | Owner + JARVIS | Owner |

**AUDIT independence:** AUDIT stays independent from SCOUT, DELTA,
PRISM, ASCEND — pick/metric builders are never the final judge of
display safety.

### Dept 4 — Data & Automation Platform
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| TAL | Draft Only | Data Reliability Engineer — ingestion freshness, adapter health, schema drift, test failures, repo hygiene | JARVIS | JARVIS |
| RELAY | Not Wired | Tool Router / MCP Gateway — tool access, approved services, rate limits, logging, permission checks | JARVIS + METER | Owner |
| PILOT | Not Wired | Browser/Computer Control — sandboxed, pre-approved domains only, screenshots + logs + human checkpoints | RELAY | Owner |
| ECHO | Not Wired | Voice Interface — transcription, deterministic routing, auditable spoken responses | RELAY + JARVIS | JARVIS |
| CHAIN | Not Wired | Workflow Automation Coordinator — chain internal workflows, pause at every human gate | JARVIS + METER | Owner |

### Dept 5 — Customer Surface & Quality
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| SARAH | Draft Only | Customer Surface Officer — dashboard health, support drafts, review queue, gated visibility | JARVIS | JARVIS |
| AVA | Draft Only | Content Officer — drafts from approved platform data only | JARVIS | JARVIS |
| GAUGE | Not Wired | QA Department Head — copy, numbers, layout, claims, regressions, defect grading | JARVIS | JARVIS |
| QUILL | Not Wired | Brand Voice & Humanizer Head — GSN voice, no tool language, no public "AI" language | JARVIS + Owner | Owner |

**Pipeline law:** AVA drafts → QUILL rewrites voice → GAUGE audits
quality/claims → SARAH owns surface → JARVIS decides owner-readiness →
**humans publish**.

### Dept 6 — Growth, Community & Finance
| Seat | Status | Role | Reports to | Escalates to |
|---|---|---|---|---|
| BOBBY | Draft Only | Revenue Analyst — funnel, subscription, churn, conversion signals → review queue | JARVIS | JARVIS |
| FLARE | Not Wired | Marketing & Customer Sourcing Head — acquisition, launch sequencing, social strategy, campaign structure | JARVIS | Owner |
| PULSE | Not Wired | Community & Engagement Head — engagement, community structure, Discord-first design, retention | JARVIS | Owner |
| VECTOR | Not Wired | Analytics, Forecasting & Planning Head — traffic/members/revenue/capacity forecasts, intake-lane priorities | JARVIS | JARVIS |
| MINT | Not Wired | Financials Head — MRR, founding-tier mix, data spend, token/API cost rollups, pricing milestones, financial risk | Owner + JARVIS | Owner |

## 3. Seat vs subagent

Seat: persistent role with charter, department, authority tier,
escalation path, memory access rules, quality obligations. Subagent:
temporary narrow worker spawned by a seat for one task. Subagents never:
take external action, publish, confirm memory, approve claims, override
parents, write canonical data without review. Draft artifacts only, with
evidence + uncertainty + recommended next step.

Subagent templates: SCOUT (injury-context, schedule-spot, odds-movement
annotator, weather/context, team-news). TAL (schema-drift,
ingestion-freshness, failed-test summarizer, adapter-health). AVA
(newsletter-draft, blog-outline, short-form copy). GAUGE (claims-QA,
layout-QA, number-consistency, broken-link). PRISM (metric-prototype,
validation-check, feature-gap hunter). ASCEND = standing subagent under
PRISM: proposes GSE improvements; AUDIT reviews calibration impact;
JARVIS escalates meaningful changes to owner.

## 4. Authority tiers

Tier 0 Read Only · Tier 1 Draft Only · Tier 2 Safe Internal Action
(only if wired+approved) · Tier 3 Approval Required (PRs, strategy
docs, review-queue publishing, workflows — after owner approval) ·
Tier 4 Human Only (legal claims, public betting claims, privacy,
spending, customer promises, publishing, social, scraping/external
browsing, production-impacting, major tradeoffs). Default: everyone
Tier 0/1 unless explicitly wired and approved.

## 5. Registry fields (per seat)

id, name, status ('draft_only'|'manual'|'not_wired'), department, role,
charter, reportsTo[], reviewedBy?[], escalatesTo[], authorityTier
(0–4), externalActionsAllowed: false, allowedInputs[], allowedOutputs[],
prohibitedActions[], memoryAccess
('none'|'read_confirmed'|'write_candidate'|'manual_only'),
canSpawnSubagents, subagentTemplates?[] (id, parentSeatId, name,
purpose, authorityTier 0|1, allowedInputs, allowedOutputs,
prohibitedActions, requiresParentReview: true), handoffsIn[],
handoffsOut[], reviewGates[], successMetrics[], failureModes[],
wiringState ('wired'|'manual'|'simulated'|'not_connected'), lastRun?,
ownerApprovalRequired.

## 6. Routing rules (defaults)

- Pick research: SCOUT → DELTA (market context) → TAL (freshness issue) → JARVIS → Owner if public-facing
- Settlement: LEDGER → AUDIT → JARVIS (LEDGER owns canonical results; AUDIT owns calibration/sample gates)
- Public content: AVA → QUILL → GAUGE → JARVIS → Owner (owner publishes)
- Customer dashboard: SARAH → GAUGE → TAL if data issue → JARVIS
- Data incident: TAL → METER if model/cost involved → JARVIS → Owner if production-risk
- Memory decision: ARCHIVE → JARVIS → Owner confirmation if sensitive/durable (ARCHIVE creates candidates only)
- Tool/browser: RELAY → PILOT only with pre-approved domain + owner approval; every action logged
- Workflow automation: CHAIN proposes → METER cost/risk → JARVIS review → Owner approves external/production
- Marketing: FLARE → BOBBY (funnel) → QUILL (voice) → GAUGE (claims) → JARVIS → Owner
- Community launch: PULSE → SARAH → GAUGE → JARVIS → Owner
- Revenue/pricing: BOBBY → MINT → VECTOR → JARVIS → Owner
- Forecasting: VECTOR → BOBBY/MINT/TAL as needed → JARVIS
- Stat R&D: PRISM → ASCEND (ideas) → AUDIT (validation) → JARVIS → Owner if scoring change

## 7. Council cockpit UI

Show: 23 seats (6 draft-only / 3 manual / 14 not wired), departments,
reporting lines, escalation lines, authority tiers, wiring status,
external-action status, review gates, subagent capability, next action
per not-wired seat. Cards state plainly: registered seat / manual / not
wired / draft-only / can spawn subagents / cannot take external action /
requires owner approval. Six department cards each show: lead seat,
active seats, manual gates, not-wired seats, current blockers, next
action, owner-approval flag.

## 8. Agent Handoff Ledger

Track: source agent, target agent, reason, task type, evidence, risk
level, authority tier, status, owner approval required, timestamp,
outcome. Jarvis must answer: who owns / reviewed / blocked / escalated
this, what evidence, what next.

## 9. Subagent Run Ledger

Track: subagent id, parent seat, task, input context, output artifact,
confidence, uncertainty, evidence, prohibited-actions check, parent
review status, accepted/rejected/edited, timestamp. Subagent output is a
draft until parent review.

## 10. Guardrails (non-negotiable)

No agent may: publish, place bets, send emails, post to social,
scrape/browse externally without owner approval + approved domain, claim
real telemetry unless wired, treat simulated data as real, confirm
memory outside the memory protocol, override AUDIT on
calibration/display safety, override METER on model/cost, override
JARVIS on routing, override Owner on final approval.

## 11. Docs to update on build

JARVIS_AGENT_COUNCIL.md, JARVIS_CAPABILITY_REGISTRY.md,
JARVIS_ARCHITECTURE.md, JARVIS_OPERATOR_BRIEF.md,
JARVIS_MEMORY_PROTOCOL.md — covering seats, subagents, departments,
tiers, routing, handoff protocol, review gates, escalation, external
action prohibition, memory relationship, owner approval doctrine.

## 12. Acceptance criteria

1. All 23 seats registered. 2. The 6 cockpit agents stay Draft Only.
3. LEDGER/AUDIT/METER stay Manual. 4. The 14 designed seats stay Not
Wired unless explicitly implemented. 5–9. Every seat has department,
reportsTo, escalation path, authority tier, externalActionsAllowed:
false. 10. ASCEND is a standing subagent under PRISM. 11. AUDIT
independent of pick/metric producers. 12. METER owns AI cost/model
discipline. 13. JARVIS owns routing + owner brief. 14. Owner approval
for public claims, publishing, external actions, spending, production
changes, sensitive decisions. 15–16. UI distinguishes seats vs
subagents and Draft Only / Manual / Not Wired. 17. Routing rules
visible and testable. 18. Handoffs logged. 19. Subagent runs logged.
20. No simulated/not-wired capability presented as real.

**Final goal:** turn the council from a list of cool names into a
governed operating structure — departments, ownership, routing,
subagents, handoffs, review gates, authority tiers, owner approval.
Jarvis knows who owns what, who reviews what, who can draft, who is
manual, who is not wired, and what cannot happen without Garrett.
