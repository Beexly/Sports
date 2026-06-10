# 02 — Departments & Agents: the AI-Run Product Company

> **Vision-2026 / forward-looking.** This is the authoritative org-design doc for GSE as an
> AI-operated product company: the department roster, the head-AGENT that runs each one, the
> cockpit METRICS each owns, and the founder/legal gates that keep agents proposing while humans
> decide. It is grounded in the **existing canonical department-heads cockpit** — most of this org
> already exists in code — and extends it, rather than re-auditing it.
>
> **Companion docs (read together, do not duplicate):**
> `30-integrations-and-ai-run-company.md` — the integration WIRING ORDER that turns each head's
> `UNINSTRUMENTED`/`FORECAST_ONLY` metric into a measured one (Waves A–E). This doc owns the *org
> structure*; doc 30 owns the *plumbing*. Where a metric here is tagged *(today: UNINSTRUMENTED →
> doc 30 Wave X)*, the wiring lives there.
> Also: `03-data-and-analytics-stack-2026.md` (Data head's accuracy instruments),
> `20-growth-engagement-retention-monetization.md` (Growth head's loop levers),
> `03-ai-native-intelligent-ux.md` (the customer-facing intelligence the heads govern).
>
> **Author lane:** RESEARCH + DOC only. No source/test/config touched in either clone. No keys, no
> live switches, no deploy. Every "we have X today" claim is anchored to file:line or an
> audit/data-mesh citation. Every "best-in-class 2026" claim is web-cited (see doc 30 §Sources for
> the shared benchmark set). Each proposal is tagged **safe-now · founder-gated · legal-gated ·
> aspirational**.
>
> **Clones:** DEPLOY = `C:/Users/Garrett/Sports` (launch target, narrower picks/board).
> CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform — the
> department-heads cockpit, Player Lab, intelligence engines, Airwave, fantasy, matured design
> system). **Every org artifact below lives ONLY in CANONICAL today.**

---

## 0. Thesis

GSE has already built the rarest part of an AI-run company: a **deterministic, fabrication-resistant
org model** in code. Six department heads each derive their status only from real signals and say
`UNKNOWN`/`FORECAST_ONLY` rather than invent a number
(`apps/web/lib/cockpit/departments.ts:34-43,112-124`); six role-agents are explicitly *roles, not
automations*, every one `externalActions: "NONE"`, type-locked to the Prisma `OperatorAgent` enum
(`agents.ts:1-13,27-101`); a 10-requirement compliance program names every regulated trigger and
parks it in an approval queue that waits for a founder (`compliance-program.ts:8-17,213-247`); and a
monetization-lever registry is built INERT with a test-guard that fails on any live URL
(`monetization-levers.ts:1-17,296-304`).

The 2026 work is **not** to design new structure — it is three moves on the structure that exists:
1. **Consolidate it onto the clone that ships.** The entire layer is CANONICAL-only; DEPLOY's cockpit
   has 19 surfaces with **no Department Heads, no Compliance** (`Sports/apps/web/app/cockpit/layout.tsx:20-40`
   vs `Sports-canonical-2026-06-03/apps/web/app/cockpit/layout.tsx:20-44`, 23 surfaces). *(founder-gated)*
2. **Make the heads measured, not modeled.** Many metrics are honestly `UNINSTRUMENTED`; doc 30's
   integration waves turn them real. *(mostly safe-now)*
3. **Make the gate auditable, not just present.** The approval queue is render-time-only — no persisted
   ledger of who cleared which named trigger. Add the ledger. *(safe-now)*

None of this loosens a gate. It turns "human-gated" into "human-gated **and auditable and measured.**"

---

## 1. The operating model (how the company is shaped)

GSE's shape matches the 2026 agentic-org consensus almost exactly, scaled to a solo founder:
**2–5 humans supervise a fleet of specialized agents through an end-to-end process, with tiered
autonomy and a hard human gate on anything regulated** (McKinsey *The Agentic Organization*; Berkeley
CMR *Governing the Agentic Enterprise*; AgentOps governance sources — full cites in doc 30 §Sources).

The model has four layers, and GSE already has all four in code:

| Layer (2026 framework) | What it is | GSE's existing implementation |
|---|---|---|
| **Cognitive specialization** | each agent owns a narrow domain | 6 department heads + 6 role-agents (`departments.ts`, `agents.ts`) |
| **Coordination** | an orchestrator routes work between specialists | **Jarvis** — deterministic readiness synthesizer (`jarvis.ts`, audit `05:186-196`) |
| **Real-time control** | guardrails that stop bad actions as they happen | readiness gates + CI guardrail scripts (`trust-gate`, `model-freeze`, `draft-only`, `claude-api-usage`, `brand-lint`; audit `05:225`) |
| **Governance** | the policy + audit layer over the fleet | compliance program + founder approval queue (`compliance-program.ts`) |

**The doctrine that makes it trustworthy** (verbatim from the code, not aspirational): heads
*ADVISE, FORECAST, GATE, QUEUE* and **"never auto-execute a regulated trigger (production deploy,
moving money, real-money gambling, scraping a TOS-protected or paid feed, displaying a real person's
private data, or flipping LIVE public picks/projections)"** (`departments.ts:6-12`). Agents
**"route work… none of them perform external actions on their own; every output is a draft that must
be approved by a human reviewer"** (`agents.ts:4-8`). This is the founder-autonomy posture in code:
**agents propose; humans gate live actions.**

---

## 2. The department roster

Eight departments. **Six exist today** as typed heads in the cockpit; **two are proposed** for a
fully-realized fleet. The summary table, then a full per-department treatment.

| # | Department | Head agent | Status today | Posture today (`departments.ts`) |
|---|---|---|---|---|
| 1 | **Compliance & Trust** | Compliance head + **Sarah**-class scan | **EXISTS** (`:112-179`) | derives from gates/queue; deep-dive page wired (`/cockpit/compliance`) |
| 2 | **Data & Accuracy** | Data head + **Scout** | **EXISTS** (`:181-242`) | freshness `UNINSTRUMENTED`; no deep-dive |
| 3 | **Growth & Monetization** | Growth head + **Bobby** | **EXISTS** (`:244-293`) | hardcoded `FORECAST_ONLY` (revenue not measured) |
| 4 | **Product & Engineering** | Product head + **Tal** | **EXISTS** (`:295-338`) | tests partly observed; error/trace `UNINSTRUMENTED` on DEPLOY |
| 5 | **Content & Brand** | Content head + **Ava** | **EXISTS** (`:340-382`) | banned-phrase live; engagement `UNINSTRUMENTED` |
| 6 | **Support & Success** | Support head + **Sarah** | **EXISTS** (`:384-409`) | fully `UNINSTRUMENTED` |
| 7 | **Orchestration** | **Jarvis** | **EXISTS** (`jarvis.ts`) | live readiness synthesis; refuses to over-claim |
| 8 | **Security & Governance** | *proposed* | **PROPOSED** | guardrail scripts exist but no head owns them |
| 9 | **Finance & Ops** | *proposed* | **PROPOSED** | Claude cost-monitor exists; no head owns spend |

> **Agent ↔ head note.** The six role-agents (`agents.ts`) are the *hands*; the six heads
> (`departments.ts`) are the *desks*. They are deliberately not 1:1 — Jarvis orchestrates across all
> desks; Sarah serves both Support and Compliance (drafting + triage). The mapping below names which
> agent staffs each desk and what it is allowed to do unsupervised.

---

## 3. Per-department design

For each department: **mandate · the head-agent's scope + guardrails · the cockpit metrics it owns
(today-state grounded) · how it stays inside the gate.** Metrics tagged *(UNINSTRUMENTED)* are
honest gaps today; the parenthetical names the doc-30 wave that makes them real.

### 1. Compliance & Trust — *EXISTS* (`departments.ts:112-179`, `compliance-program.ts`)

- **Mandate (verbatim):** *"Keep every public claim honest, every disclosure present, and every
  regulated action behind a human decision. Advise on what must be true before a revenue lever can
  flip."* (`:146-147`) — the audit's "crown jewel" posture (audit `05:67`).
- **Head-agent scope:** maintains the 10 framework-mapped requirements (FTC / AGA-RG / NCPG /
  state-geo / age / licensing / data-TOS, `compliance-program.ts:25-32`); runs the banned-phrase
  scanner over customer copy (build fails on a hit, `:117-126`); and — critically — **names** every
  regulated trigger in the approval queue and parks it `awaiting-founder` / `eligible-when-green`
  (`:213-247`). Staffed by a **Sarah**-class scan for triage.
- **Guardrails:** two hard rules in code — *"Never fabricate a legal claim… Never auto-execute a
  regulated trigger"* (`:8-17`). **Autonomy: APPROVE** for every regulated trigger, never relaxed;
  **NOTIFY** for a new banned-phrase hit.
- **Cockpit metrics it owns:** requirements met / in-progress / blocked / forecast + queue depth
  (live today via `buildComplianceProgram`, `:256-270`); banned-phrase hit count
  (`departments.ts:342`); guardrail-trip count *(UNINSTRUMENTED → doc 30 Wave D, Langfuse)*;
  days-since-counsel-review *(UNINSTRUMENTED)*.
- **2026 add (safe-now):** persist each approval-queue clearance as an audit row — who / when / which
  named trigger. The queue is render-time-only today; this is the ledger a regulator asks for
  (audit `05:134-137`). See §5.
- **Stays in the gate:** by construction — it is the gate. The only change is making the gate's
  decisions *auditable*.

### 2. Data & Accuracy — *EXISTS* (`departments.ts:181-242`)

- **Mandate (verbatim):** *"Guard the integrity of the inputs and the calibration of the model.
  Surface staleness and accuracy drift before they reach a customer."* (`:205-206`)
- **Head-agent scope:** **Scout**-class — watches source freshness, fallback-chain health, and
  calibration evidence; drafts research notes and flags line-movement into the review queue
  (`agents.ts:65-76`). **Never self-adjusts weights:** *"Calibration adjustments require a deliberate
  model-version bump — the engine never self-adjusts weights"* (`departments.ts:237`).
- **Guardrails:** **Autonomy: AUTO** for ingest / snapshot / settle (already cron-driven, audit
  `05:178`); **APPROVE** for any `MODEL_VERSION` bump, enforced by the `model-freeze` guardrail.
- **Cockpit metrics it owns:** source freshness in hours *(UNINSTRUMENTED today — the head literally
  says "treat freshness as unknown", `:198-200` → doc 30 Wave B #5)*; test health
  (`testsPassing`, partly observed, `:104-105`); fallback-chain status; Brier score + reliability
  buckets (the calibration engine is real in DEPLOY, `lib/calibration/compute.ts`, but
  *"remains collecting"* — no settled sample yet); **CLV** — the data-mesh "true scoreboard"
  (`data-mesh/10:52`), which exists in CANONICAL (`clv-capture.ts`) but is **absent from DEPLOY**
  (see `03-data-and-analytics-stack-2026.md`). *(CLV port: founder-gated MODEL_VERSION-adjacent work.)*
- **Stays in the gate:** the keystone rule — no context source becomes a *scoring* input without a
  founder-gated `MODEL_VERSION` bump; everything new lands shadow-first.

### 3. Growth & Monetization — *EXISTS* (`departments.ts:244-293`, `monetization-levers.ts`)

- **Mandate (verbatim):** *"Model the value ladder and the revenue levers, each gated behind the
  compliance requirements and flags that must be green first. Never pull a live payment or affiliate
  path."* (`:255-256`)
- **Head-agent scope:** **Bobby**-class — reads funnel / subscription / churn telemetry and surfaces
  conversion + churn observations as review-queue items (`agents.ts:89-99`). Owns the 8-lever
  registry (FREE live; PRO, ELITE, annual/team, sportsbook affiliate, sponsorship, enterprise
  reports, forward-projections — all `founderTriggerRequired: true`, `monetization-levers.ts:84-273`).
- **Guardrails:** **Autonomy: NOTIFY** (surfaces anomalies only); **APPROVE** for pricing and any
  live affiliate / payment. *"Exact tier pricing is a founder decision, not modeled here"*
  (`departments.ts:278-282`). The `findNonInertLevers` test-guard fails the build if any lever ever
  carries a live `https?://` URL (`monetization-levers.ts:296-304`).
- **Cockpit metrics it owns:** MRR, active subs, trial→paid, churn, failed payments
  *(all FORECAST_ONLY today — "revenue metrics… are not instrumented yet — modeled, not measured",
  `:250,285` → doc 30 Wave B #4, Stripe, **founder-gated keys**)*; funnel conversion + session
  replay *(UNINSTRUMENTED → PostHog, doc 30 Wave A)*; referral / share attribution
  *(UNINSTRUMENTED → Dub, owned channels safe-now)*; the proof-gated pricing-phase ladder
  (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY, CANONICAL `pricing-phases.ts`).
- **Stays in the gate:** every lever is built inert — no live affiliate URLs, no payment calls, no
  scraping (`monetization-levers.ts:7-12`); affiliate is additionally **legal-gated** (licensing,
  geo, age must clear first).

### 4. Product & Engineering — *EXISTS* (`departments.ts:295-338`)

- **Mandate (verbatim):** *"Keep the surfaces shippable and the build green. Queue deploys for a
  human — never push to production automatically."* (`:305-306`)
- **Head-agent scope:** **Tal**-class — repo audits, bug triage, test-failure comments, minor
  implementation drafts (`agents.ts:53-63`). Opens drafts; never merges or deploys.
- **Guardrails:** **Autonomy: AUTO** for draft PRs / bug investigations; **APPROVE** for production
  deploy + migrations — *"Deploys, migrations, and env changes are queued for a human, never
  executed by a head… Migrations must lead code in production; queue, don't auto-run"* (`:332,335`).
- **Cockpit metrics it owns:** test pass rate + build status (`testsPassing`, partly live, `:296`);
  deploy queue depth; **error rate + distributed traces** *(UNINSTRUMENTED on DEPLOY — the launch
  clone is "near-blind" to incidents, audit `11:23` → doc 30 Wave A #1-2, SigNoz/OTel)*; p95 latency
  + Core Web Vitals *(UNINSTRUMENTED → PostHog/Vercel)*.
- **Stays in the gate:** deploy is a regulated trigger; the head can declare the build green and
  *queue* a deploy, but the founder pulls it (`:323-330`).

### 5. Content & Brand — *EXISTS* (`departments.ts:340-382`)

- **Mandate (verbatim):** *"Keep the voice consistent and every published word inside the
  trust-claim registry. Draft only — publishing stays gated."* (`:351-352`)
- **Head-agent scope:** **Ava**-class — drafts blog / newsletter / short-form copy **strictly from
  approved platform data**, never publishes; every draft waits in the media queue
  (`agents.ts:77-87`). Enforced by the `draft-only` guardrail.
- **Guardrails:** **Autonomy: AUTO** for drafting; **APPROVE** for publish and any send. Generated
  content passes the banned-phrase scan before it can be queued (`:355-373`).
- **Cockpit metrics it owns:** banned-phrase hit count (live, `:342`); draft→publish ratio; content
  coverage; SEO position *(UNINSTRUMENTED → Ahrefs MCP, doc 30 Wave C)*; email engagement
  *(UNINSTRUMENTED → Klaviyo, doc 30 Wave C, founder-gated send)*.
- **Stays in the gate:** publishing is gated by `canPublishContent`; influencer / affiliate content
  needs an approval workflow before it ships (`:379`).

### 6. Support & Success — *EXISTS* (`departments.ts:384-409`)

- **Mandate (verbatim):** *"Be ready to answer customers and route compliance-sensitive questions
  (data deletion, responsible play) to the right place."* (`:389-390`)
- **Head-agent scope:** **Sarah**-class — drafts support replies and triages tickets into the review
  queue; **never sends** (`agents.ts:41-51`).
- **Guardrails:** **Autonomy: AUTO** for drafting + triage; **APPROVE** for any customer-facing send;
  **LEGAL-GATED** for SMS — *"No SMS path is live; TCPA review is required before any SMS alerts"*
  (`:406`).
- **Cockpit metrics it owns:** ticket volume, first-response time, resolution rate, NPS/CSAT,
  data-deletion-request SLA — **all UNINSTRUMENTED today** (*"Support metrics are not instrumented
  yet — modeled, not measured"*, `:403`) *→ doc 30 Wave B #6 (Formbricks) gives the first real signal.*
- **Stays in the gate:** responsible-play and data-deletion requests route through the published
  legal inbox (`:402-405`); nothing auto-replies to a customer.

### 7. Orchestration — Jarvis — *EXISTS* (`jarvis.ts`)

- **Mandate:** route incoming work to the right head, synthesize **launch readiness** from live
  evidence, report the next recommended actions, and **refuse to over-claim** — Jarvis demotes
  `LAUNCH_READY` to `NOT_READY_SAFETY` when public picks are live but performance is gated
  (`agents.ts:28-39`; audit `05:186-196`). Version-stamped `JARVIS_VERSION` for auditability.
- **Head-agent scope:** reads all task + decision data, proposes routing for NEW tasks, surfaces
  readiness-gate status, suggests next actions (`agents.ts:33-38`). The senior "agent orchestrator"
  role 2026 research names as managing the fleet (CIO *AI-native roles*).
- **Guardrails:** pure + I/O-free classifier; every input `.catch()`-wrapped so the cockpit always
  renders (recon note); proposes only, never executes.
- **Cockpit metrics it owns:** system readiness state; per-head status + workload; per-agent
  review-queue depth; human-approvals-pending count; **agent cost + latency** *(UNINSTRUMENTED →
  Langfuse, doc 30 Wave D)*; guardrail-trip rate.
- **2026 add (founder-gated):** a fleet-level **autonomy-budget dashboard** — how much work ran AUTO
  vs NOTIFY vs APPROVE, and the Langfuse-measured safety record that would (or would not) justify
  widening a tier. This is the instrument the autonomy ladder (§4) reads from.

### 8. Security & Governance — *PROPOSED (aspirational)*

- **Why it's needed:** 2026 research flags the *AI-governance / agent-security specialist* as a
  critical net-new role. GSE has the guardrail scripts (`trust-gate`, `model-freeze`, `draft-only`,
  `claude-api-usage`, `brand-lint`, audit `05:225`) but **no single head owns them** — they are
  enforced in CI, not surfaced as a department.
- **Mandate (proposed):** own the zero-trust agent-access model (agents treated like employees for
  scoped credentials), audit agent decisions, and own the guardrail-trip ledger and the leaked-key
  rotation runbook (2 GSE keys already leaked + rotated 2026-06-03, per data-mesh).
- **Metrics it would own:** guardrail-trip rate by script, secrets-rotation cadence, agent-access
  scope drift, dependency/SCA findings (maps to Vanta-class MCP if adopted).
- **Tag:** **aspirational.** Until volume justifies a standalone head, these duties sit with
  Compliance (policy) + Product-Eng (enforcement).

### 9. Finance & Ops — *PROPOSED (aspirational)*

- **Why it's needed:** GSE has a real Claude spend governor (`lib/claude-api/cost-monitor.ts`:
  per-surface monthly budgets, 4-tier thresholds, hard request-block at red) **but no head owns the
  P&L view of agent + infra spend.** Note the latent trap: the cost-monitor hard-codes the Sonnet
  $3/$15 rate and will **silently undercount ~40–67% if a surface routes to Opus 4.8** ($5/$25)
  (audit lens 04 F2) — exactly the kind of drift a Finance head would catch.
- **Mandate (proposed):** own Claude spend (Langfuse cost view), infra spend (Vercel), data-feed
  COGS (The Odds API), and the **budget that caps agent autonomy** — the autonomy ladder's AUTO tier
  is only as safe as the spend ceiling behind it.
- **Metrics it would own:** AI cost per surface vs budget, model-mix drift (Sonnet vs Opus), infra
  spend, COGS per pick, gross-margin-by-lever.
- **Tag:** **aspirational** — folds into Growth & Monetization until revenue volume justifies a
  separate desk.

---

## 4. The autonomy ladder (how a head earns more autonomy)

This encodes the 2026 *"expand autonomy only when safety metrics prove consistent low-risk behavior"*
pattern (AgentOps governance) onto GSE's existing gate doctrine. **Regulated triggers never leave
APPROVE** — the ladder governs only *non-regulated* head actions.

| Tier | What runs here | Gate to qualify | GSE example today |
|---|---|---|---|
| **AUTO** | low-risk, reversible, internal | clean Langfuse eval pass-rate over N runs + zero guardrail trips | ingest / snapshot / settle (cron); draft PRs (Tal); draft replies (Sarah) |
| **NOTIFY** | medium-risk, internal-visible | clean AUTO record + founder opt-in | flag line-movement (Scout); surface churn anomaly (Bobby); `ON_WATCH`→Novu |
| **APPROVE** | anything regulated OR new | **always, by construction** | deploy, publish, charge, affiliate go-live, `MODEL_VERSION` bump, customer SMS/email |

The ladder is itself **founder-gated**: a head moves an action up a tier only when the founder signs
off, backed by the Langfuse safety record. This is "compliance-as-code" extended to
**autonomy-as-code** — the founder can *see* the safety record before widening a tier, and can never
accidentally auto-enable a regulated action because those are pinned to APPROVE in the type system.

**Concretely-available tools that drive this ladder** (all founder/legal-gated to *enable*; the
wiring is safe-now per doc 30): **Langfuse** = the safety record (eval pass-rate, guardrail trips);
**Linear/Asana + Slack MCP** = the work surface where a NOTIFY-tier draft lands as an issue for human
approval; **Novu** = the internal alert when a head flips `BLOCKED` or a trigger becomes
`eligible-when-green`; **PostHog** feature flags = the safe on/off for any non-regulated UI a head
proposes.

---

## 5. The two high-leverage moves (closing the structural gaps)

The audit names exactly two gaps in the org layer. Both are addressable now.

**Move 1 — Port the department-heads layer into DEPLOY.** *(founder-gated)*
The whole org model is CANONICAL-only; the launch clone's cockpit has no Department Heads and no
Compliance surface — *the most differentiated, compliance-forward governance is invisible on the
clone that actually ships* (audit `05` P1; `Sports/apps/web/app/cockpit/layout.tsx:20-40`). The port
is additive, internal, ADMIN-gated, and low-risk; carry the existing purity test so the clones can't
re-diverge. The founder decides *port now* vs *explicitly declare it Launch-2.*

**Move 2 — Persist the approval queue + head decisions as an audit ledger.** *(safe-now)*
Today the approval queue and every head decision are **render-time-only** — there is no persisted row
of *who cleared which named trigger, when* (audit `05:134-137`; mirrors the `GateDecision` gap in
lens 06, where `GateDecision` is *read but never written*). Keep the heads model **pure** (the audit's
key property — fabrication-impossible because the head only reports what it was handed,
`departments.ts:14-17`): persist decisions in a separate table and hand them back in as signals.
This is the single change that turns "human-gated" into "**auditable** and human-gated" — the
artifact a regulator, a partner, or a future hire actually asks to see.

---

## 6. How this honors the reins

| Rein | How the org design holds it |
|---|---|
| **Agents propose; humans gate live actions** | every agent `externalActions:"NONE"` (`agents.ts:24`); every head ADVISE/FORECAST/GATE/QUEUE only (`departments.ts:6-12`); regulated triggers pinned to APPROVE in the type system (§4) |
| **No autonomous money / publish / destruction** | pricing, payments, affiliate go-live, publish, deploy, `MODEL_VERSION` bump all `founderTriggerRequired` / APPROVE-tier; monetization registry built INERT with a live-URL test-guard (`monetization-levers.ts:296-304`) |
| **Reveal-less recipe** | the heads expose *status and outcomes*, never weights/aggregation/Signal-layer existence; Data head's metrics are calibration + CLV (results), not the recipe |
| **No real-money / chance gambling; responsible-gaming** | Compliance head's program encodes NCPG/AGA-RG; helpline + no-guarantee disclosure are `met` requirements; affiliate is legal-gated behind licensing/geo/age (`compliance-program.ts`) |
| **Verified-not-assumed** | heads report `UNKNOWN`/`FORECAST_ONLY` rather than guess (`departments.ts:34-43`); the proposed audit ledger makes every cleared gate provable, not assumed |
| **Intelligent advisor, not rubber-stamp** | the autonomy ladder *reasons* about earned autonomy from a measured safety record rather than blanket-approving or blanket-blocking |

---

## 7. Priority summary (org-layer specific)

| # | Action | Owner head | Tag |
|---|---|---|---|
| 1 | Persist approval-queue + head decisions as an audit ledger (keep heads pure) | Compliance + Jarvis | **safe-now** |
| 2 | Wire source-freshness + test health into Data & Accuracy head | Data & Accuracy | **safe-now** (doc 30 Wave B) |
| 3 | Formbricks micro-survey → first Support/Content signal | Support, Content | **safe-now** (doc 30 Wave B) |
| 4 | Langfuse on every agent call → fleet cost/latency + guardrail-trip metrics for Jarvis | Jarvis | **safe-now** (doc 30 Wave D) |
| 5 | Build Jarvis fleet autonomy-budget dashboard (reads Langfuse) | Jarvis | **safe-now** scaffold / founder-gated to widen a tier |
| 6 | Port the department-heads layer into DEPLOY (carry the purity test) | all | **founder-gated** |
| 7 | Stripe metrics → Growth head (live keys) | Growth & Monetization | **founder-gated** |
| 8 | Stand up Security & Governance head (own the guardrail-trip ledger) | *new* | **aspirational** |
| 9 | Stand up Finance & Ops head (own AI/infra spend, fix Opus cost undercount) | *new* | **aspirational** |

> Every item is *wire an instrument* or *mature the structure*, never *loosen a gate*. The launch
> blockers the audit names (DB/ingestion, cron-vs-freshness, migrate-in-build, pricing reconcile)
> sit upstream of all of this and are tracked in the audit, not here.

---

## Internal citations (grounded current state — CANONICAL unless noted)

- `apps/web/lib/cockpit/departments.ts:6-17,26-43,112-425` — six heads, doctrine, statuses, purity.
- `apps/web/lib/cockpit/agents.ts:1-13,27-101` — six role-agents, `externalActions:"NONE"`, enum lock.
- `apps/web/lib/cockpit/compliance-program.ts:8-17,25-32,92-207,213-247,256-270` — 10 requirements, named-trigger approval queue.
- `apps/web/lib/cockpit/monetization-levers.ts:1-17,84-273,296-304` — 8 inert levers + live-URL test-guard.
- `apps/web/lib/cockpit/jarvis.ts` — deterministic readiness synthesizer (refuses to over-claim).
- `Sports-canonical-2026-06-03/apps/web/app/cockpit/layout.tsx:20-44` — 23 cockpit surfaces (incl. Departments, Compliance).
- `Sports/apps/web/app/cockpit/layout.tsx:20-40` — DEPLOY: 19 surfaces, **no Departments, no Compliance**.
- `Sports/apps/web/lib/calibration/compute.ts` — Brier/reliability (DEPLOY), "remains collecting."
- `Sports/apps/web/lib/claude-api/cost-monitor.ts` — spend governor (Sonnet rate hard-coded; Opus undercount risk).
- `docs/command-center/audit-2026-06-09/05-departments-heads-process.md` (Grade B; canonical-only; read-time-only; `:67,134-137,178,186-196,225`).
- `docs/command-center/audit-2026-06-09/11-...observability.md:23` — DEPLOY launch-blind to incidents.
- `docs/command-center/audit-2026-06-09/04-financials-monetization.md` (F2 — Opus cost undercount).
- `docs/command-center/data-mesh/10-gse-rating-proprietary-architecture.md:52` — CLV "true scoreboard"; reveal-less doctrine.

## Companion docs (the wiring + adjacent surfaces — not duplicated here)

- `vision-2026/30-integrations-and-ai-run-company.md` — integration WIRING ORDER (Waves A–E) that turns each head's UNINSTRUMENTED metric real.
- `vision-2026/03-data-and-analytics-stack-2026.md` — Data & Accuracy head's accuracy instruments (CLV, calibration, warehouse).
- `vision-2026/20-growth-engagement-retention-monetization.md` — Growth head's loop levers + lifecycle program.

*Doc-only. No source, test, config, schema, env, or package file in either clone was modified.*
