# 30 — Integrations / Plugins / Tools Stack + the AI-Run Product Company

> **Vision-2026 / forward-looking.** This is not a re-audit. It builds on the audit
> (`docs/command-center/audit-2026-06-09/`) and the data-mesh R&D
> (`docs/command-center/data-mesh/`). It answers two questions:
> **(1)** which concretely-available integrations to wire, in what order, with setup + gating notes;
> **(2)** what departments + department-head AGENTS a fully-realized autonomous product org needs —
> each with a mandate, the agent's scope, and the cockpit metrics it owns — grounded in GSE's
> existing department-heads cockpit (canonical).
>
> **Author lane:** RESEARCH + DOC only. No source/test/config touched in either clone. No keys, no
> live switches, no deploy. Every "we have X today" claim is anchored to a file:line or an
> audit/doc citation. Every "best-in-class 2026" benchmark is web-cited. Each proposal is tagged
> **safe-now | founder-gated | legal-gated | aspirational**.
>
> **Clones:** DEPLOY = `C:/Users/Garrett/Sports` (launch target, narrower picks/board).
> CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform — Player Lab,
> intelligence engines, Airwave, department-heads cockpit, fantasy, matured design system).

---

## 0. The one-paragraph thesis

GSE already has the two hardest pieces of an AI-run company: a **wired operator PROCESS** with every
regulated step human-gated (audit lens 05, Grade B), and a **deterministic, fabrication-resistant
department-heads + agent model** — but both are **CANONICAL-only and read-time-only** (no persisted
ledger, no live telemetry behind the metrics). Separately, a best-in-class **OSS integration stack**
(PostHog, Langfuse, Trigger.dev, Unkey, Novu, Formbricks, Dub) is **scaffolded inert in CANONICAL and
absent from DEPLOY** (audit lens 11, P1). The 2026 move is not to invent new structure — it is to
**(a)** wire the integrations that turn the heads' honest `UNINSTRUMENTED`/`FORECAST_ONLY` statuses
into measured metrics, in a safe, key-gated order; and **(b)** mature the six heads + six role-agents
into a true agentic operating model with tiered autonomy (auto / notify / approve), an audit ledger,
and OpenTelemetry-standard agent traces — keeping the founder gate on everything that touches money,
publishing, licensing, or age/geo.

---

# PART 1 — The Integration Stack: what to wire, in what order

## 1.1 Current state (grounded)

| Layer | Tool scaffolded | Where | State | Citation |
|---|---|---|---|---|
| Product analytics | `posthog-js` / `posthog-node` | CANONICAL `apps/web/package.json:41-42` | inert (no-op w/o key) | audit `11-...observability.md:17,21` |
| LLM/agent tracing | `langfuse` | CANONICAL `package.json:37` | inert | `11:17` |
| Background jobs | `@trigger.dev/sdk` | CANONICAL `package.json:32` | inert | `11:17` |
| API keys / rate-limit | `@unkey/api` | CANONICAL `package.json:33` | inert | `11:17` |
| Notifications | `@novu/node` | CANONICAL `package.json:19` | inert | `11:17` |
| In-product surveys | `@formbricks/js` | CANONICAL `package.json:18` | inert | `11:17` |
| Short links / attribution | `dub` | CANONICAL `package.json:36` | inert | `11:17` |
| Traces backend | `@opentelemetry/*` → SigNoz | CANONICAL `instrumentation.ts` + `lib/observability/otel.ts:22` | inert (`if(!ENDPOINT) return`) | `11:18,21` |
| Payments | Stripe webhook + entitlements | BOTH (DEPLOY ships it) | live-path code, keys founder-gated | `11:45` (`webhooks/stripe/route.ts`) |
| **DEPLOY** | **none of the OSS stack** | DEPLOY `apps/web/package.json:16-35` | **absent** | `11:17` |

**The single most important fact:** the launch target (DEPLOY) has **no analytics, no error sink, no
traces** — "a prod incident on the launch site is near-blind" (audit `11:23`). Everything below is
keyed to fixing that first, because instrumentation is also what makes the department heads stop
saying `UNINSTRUMENTED`.

## 1.2 Concretely-available integrations in THIS session (MCP)

The session exposes MCP servers that map directly to GSE's needs. These are real, callable tools —
but most require an OAuth `authenticate` step, and several are **founder/legal/$$-gated** before any
live use. Mapping:

| Need | MCP available this session | Auth/setup | Gating |
|---|---|---|---|
| Product analytics | **Amplitude** (`plugin_marketing_amplitude` / `-eu`) | `authenticate` OAuth | safe-now (read); founder for org |
| Payments | **Stripe** (`mcp__stripe__*` — already loaded, no auth prompt seen) | API key in session | **founder-gated** for any create/charge |
| Email / lifecycle | **Klaviyo** (`plugin_marketing_klaviyo`) | `authenticate` | founder-gated (sending) |
| Design system | **Figma** (`mcp__6b4f85f4...` Code Connect, variables, screenshots) | connected | safe-now |
| Ops / PM | **Linear** (`plugin_design_linear`), **Asana** (`plugin_design_asana`), **Slack** (`slack-by-salesforce`) | `authenticate` | safe-now |
| Marketing intel | **Ahrefs** (`plugin_marketing_ahrefs`), **SimilarWeb** (`plugin_marketing_similarweb`), **Supermetrics** (`plugin_marketing_supermetrics`) | `authenticate` | safe-now (read) |
| Monitoring / deploy | **Vercel** (`mcp__vercel__*` — loaded) | connected | safe-now (read); founder for deploy |
| Notion docs | `notion-*` | connected | safe-now |

> **Note on the split:** the *code* scaffold is OSS (PostHog/Langfuse/Trigger/Unkey/Novu/Formbricks/Dub);
> the *MCP* tools are a partly-overlapping commercial set (Amplitude not PostHog; Klaviyo not Customer.io).
> Recommendation: keep the **OSS stack as the wired-in runtime** (already in the tree, no-op without keys,
> zero vendor lock-in) and use the **MCP tools as the operator's read/drive surface** (pull Ahrefs/SimilarWeb
> competitive data into the cockpit; drive Linear/Slack from agents; read Vercel deploy state). They are
> complementary, not a choice.

## 1.3 Recommended wiring ORDER (with the 2026 rationale)

Sequenced by leverage: observability first (makes everything else measurable), then the heads'
missing instruments, then growth/marketing, then the agent-drive surfaces.

### Wave A — Observability & truth (safe-now; unblocks the launch-blind gap)
1. **SigNoz / OpenTelemetry traces** — port `instrumentation.ts` + `lib/observability/otel.ts` into
   DEPLOY (inert until `SIGNOZ_OTLP_ENDPOINT` set). 2026 consensus: OTel is "the portable
   instrumentation layer" and SigNoz is "OpenTelemetry-native … correlates errors with traces, logs,
   metrics in one view without vendor SDK lock-in," generally cheaper than Sentry at volume — and
   notably **Vercel's own observability "lacks end-to-end traces"** (SigNoz comparison). *Setup:* one
   env var; the code already guards `if(!ENDPOINT) return`. *Tag:* **safe-now**. Citation: audit `11:18,23`.
2. **Error sink on the client boundary** — both clones' `error.tsx` only `console.error` and there is
   **no `global-error.tsx`** (audit `11:29-33`). Wire `posthog.capture("$exception", …)` (canonical)
   or a `/api/client-error` route (deploy). *Tag:* **safe-now**.
3. **PostHog product analytics** — wire `PostHogProvider` in DEPLOY (canonical already has it,
   `layout.tsx:221-226`). 2026 verdict for a startup: "PostHog is the better choice for most product
   teams … analytics + replay + flags + experiments, transparent pricing"; free tier = **1M events,
   5k session replays, 100k flag requests, no MTU cap**. This single tool also gives **feature flags**
   (replace ad-hoc env gating for non-regulated UI) and **session replay** (debug the cold-open / funnel).
   *Setup:* `NEXT_PUBLIC_POSTHOG_KEY`; no-op without it (`posthog-provider.tsx:45`). *Tag:* **safe-now**
   (anonymous/opt-in; add to privacy policy before identified tracking — **legal-gated** for PII join).

### Wave B — Instrument the department heads (turns FORECAST_ONLY → measured)
4. **Stripe → Growth/Monetization head.** The head is hardcoded `FORECAST_ONLY` because "revenue
   metrics … are not instrumented yet — modeled, not measured" (`departments.ts:250,285`). Stripe is
   already in the money-path (`webhooks/stripe/route.ts`). Feed MRR / active subs / churn / failed
   payments into `DepartmentSignals` so the head reports a real status. 2026 best practice if usage
   pricing is ever added: the **Meters API** (record events pre-subscription, attach later) + spend
   caps + in-product usage visibility to avoid bill-shock. *Tag:* **founder-gated** (live keys, pricing
   is explicitly a founder decision per `monetization-levers.ts` + `departments.ts:278-282`).
5. **Source-freshness telemetry → Data & Accuracy head.** The head says "Source-freshness
   instrumentation is not wired here yet; treat freshness as unknown" (`departments.ts:198-200`). The
   data-mesh job-truth-contract work (W2, audit task #29) already produces honest per-source health;
   pipe `sourceFreshnessHours` + `testsPassing` into the snapshot. *Tag:* **safe-now**.
6. **Formbricks → Support head + Content head.** Support is `FORECAST_ONLY`/`UNINSTRUMENTED`
   (`departments.ts:391-398`). A single in-product micro-survey (NPS, "was this helpful?") gives the
   first real Support/Content signal. *Setup:* `@formbricks/js` already present (canonical). *Tag:* **safe-now**.
7. **Novu → operator notifications.** Wire the approval-queue + ON_WATCH transitions to Novu so the
   founder is pinged when a head flips to BLOCKED or a regulated trigger is eligible. *Tag:* **safe-now**
   (internal/operator only; **legal-gated** before any customer SMS — TCPA, per `departments.ts:406`).

### Wave C — Marketing & growth intelligence (mostly read; safe-now)
8. **Ahrefs + SimilarWeb (MCP) → Competitor war-room.** CANONICAL already has a curated competitor
   registry (`competitor-watchlist.ts`) built from R&D packets, but it is **static**. Wire the
   Ahrefs (backlinks/keywords, "strongest for competitive intelligence for backlinks") + SimilarWeb
   (traffic intelligence, "strongest for competitive traffic") MCP reads into the `/cockpit/competitors`
   surface so the war-room is **live**, not a snapshot. *Note:* SimilarWeb traffic estimates are
   directional (it "missed by 40-70% for smaller stores") — treat as trend, not truth. *Tag:* **safe-now**.
9. **Dub → attribution.** Short-link + click attribution for any launch/affiliate channel — but note
   every affiliate path is **legal-gated** until licensing/geo clears (`departments.ts:173`,
   `compliance-program.ts`). Wire Dub for *owned* channel attribution now; affiliate later. *Tag:* **safe-now**
   (owned links) / **legal-gated** (affiliate).
10. **Klaviyo (MCP) → lifecycle.** *Caveat from research:* Klaviyo is **D2C/ecommerce-shaped** ("thinks
    in products, orders, purchases … doesn't understand MRR, churn, subscription lifecycle"); a
    **product-led SaaS** lifecycle (activation → retention → feature-adoption) is better served by a
    SaaS-shaped tool (Customer.io class). Since the **Klaviyo MCP is what's available**, use it for
    broadcast/newsletter + win-back, but model the *behavioral* SaaS journey on PostHog events + Novu,
    not on Klaviyo's order schema. *Tag:* **founder-gated** (sending requires CAN-SPAM/opt-in posture).

### Wave D — Agent observability & drive surfaces (the AI-company backbone — see Part 2)
11. **Langfuse → every Claude/agent call.** Already scaffolded (`langfuse.ts:20` guards on keys). 2026
    standard: hierarchical traces of every LLM call + tool invocation, **cost tracking** per call,
    **LLM-as-judge evals** on production samples. This is the metric backbone for the agent fleet
    (Part 2). The deploy clone already routes Anthropic calls through a budget-aware path enforced by
    `claude-api-usage.mjs` guardrail (audit `05:233`) — Langfuse makes that budget *observable*.
    *Tag:* **safe-now** (internal).
12. **Trigger.dev → durable agent jobs.** Replace/augment the GitHub-Actions cron (`external-cron.yml`,
    audit `05:178`) for anything needing retries/observability. *Tag:* **safe-now** (jobs stay
    draft-only; no auto-publish — `draft-only.mjs` guardrail still applies).
13. **Linear/Asana + Slack (MCP) → the agent work surface.** Agents draft → file as Linear issues →
    notify Slack; humans approve. This is the concrete "agents route work, humans execute" loop
    (matches `agents.ts` `externalActions:"NONE"`). *Tag:* **safe-now**.
14. **Unkey → public API metering** when/if GSE exposes a developer API. *Tag:* **aspirational**
    (no public API today).

### Wave E — Design ops (continuous; safe-now)
15. **Figma (MCP) → design-system parity.** Code Connect + variable extraction keep the matured
    canonical design tokens (the `--data-*` / `text-ion-*` system the audit praises, `05:155`) in sync
    between Figma and code. *Tag:* **safe-now**.

> **Cross-cutting gate.** None of Wave A-E flips a regulated switch. Live Stripe charges, affiliate
> go-live, customer SMS/email sends, and any identified-PII analytics join stay **founder/legal-gated**.
> The wiring is additive and **no-op without keys** by construction (the audit verified each guard),
> so merging the scaffold into DEPLOY is **safe-now**; *enabling* each is a separate, named decision.

---

# PART 2 — The AI-Run Product Company: departments, head-agents, metrics

## 2.1 What GSE has today (grounded — the foundation to build on)

CANONICAL already implements a real org abstraction (audit lens 05, Grade B; all citations from the
canonical clone):

- **Six department heads** — compliance, data-accuracy, growth-monetization, product-eng,
  content-brand, support — each with a `mandate`, a `status` derived only from real signals (never
  guessed), `forecast`, `outstanding`, `watchOut`, and honest `UNKNOWN`/`FORECAST_ONLY` when
  un-instrumented (`apps/web/lib/cockpit/departments.ts:26-425`).
- **Six role-agents** — Jarvis (orchestration), Sarah (support/review), Tal (engineering), Scout
  (research), Ava (content), Bobby (funnel/analytics) — every one `externalActions: "NONE"`,
  type-locked to the Prisma `OperatorAgent` enum (`apps/web/lib/cockpit/agents.ts:27-101`).
- **A compliance program** — 10 framework-mapped requirements + a named, never-auto-pulled approval
  queue (`compliance-program.ts`); **monetization levers** built inert (`monetization-levers.ts`); a
  **competitor war-room** (`competitor-watchlist.ts`); an **intelligence control-plane**
  (`intelligence-control-plane.ts`); and **Jarvis**, a deterministic launch-readiness synthesizer that
  refuses to claim `LAUNCH_READY` when performance is unsafe (`jarvis.ts`, audit `05:186-196`).

**The two structural gaps the audit names** (this is what 2026 should close):
1. The whole layer is **CANONICAL-only** — DEPLOY has none of it (audit `05:41-75`).
2. The model is **read-time-only**: no persisted approval-queue/decision ledger, metrics are
   modeled not measured (audit `05:118-137`).

## 2.2 The 2026 operating model (web-grounded)

The research converges on a clear pattern GSE is already 80% aligned with:

- **Agentic teams, not silos.** "A human team of 2-5 people can supervise an agent factory of 50-100
  specialized agents" running an end-to-end process; rigid departmental silos give way to a
  task/work-based model (McKinsey, CIO). GSE's solo-founder + 6 head-agents + role-agents is exactly
  this shape, scaled down.
- **Tiered autonomy.** The dominant guardrail pattern: "low-risk actions run automatically, medium-risk
  generate notifications, high-risk wait for explicit approval, with autonomy expanded only when safety
  metrics prove consistent low-risk behavior" (AgentOps / governance sources). **GSE's gate doctrine is
  already a strict subset of this** — but currently *everything* regulated is "approve." 2026 lets some
  *non-regulated* head actions move to auto/notify, governed by Langfuse-measured safety.
- **An Agentic Operating Model with four layers** — cognitive specialization, coordination
  architecture, real-time control, organizational governance (Berkeley CMR). GSE maps: heads =
  specialization; Jarvis = coordination; readiness-gates + guardrail scripts = real-time control;
  compliance-program + founder gate = governance.
- **Agents treated like employees** for access (zero-trust); **OpenTelemetry GenAI semantic
  conventions** as the instrumentation standard so every agent emits: task start/end, reasoning steps,
  tools invoked, data sources queried, **and which guardrails were triggered** (n-ix, AgentOps). This
  is precisely what Langfuse (Wave D) provides.

## 2.3 The department + head-agent map (mandate · scope · metrics it owns)

For each: the existing GSE head it extends, the agent's **autonomy tier** (auto / notify / approve —
regulated actions are always *approve*), and the **cockpit metrics** it should own once Part-1 wiring
lands. Metrics tagged *(today: UNINSTRUMENTED)* are the ones the integrations turn real.

### 1. Compliance & Trust — *head exists* (`departments.ts:112-179`)
- **Mandate:** keep every public claim honest, every disclosure present, every regulated action behind
  a human. The "crown jewel" posture (audit `05:67`).
- **Agent scope:** scans copy against the banned-phrase registry; maintains the 10-requirement program;
  *names* every regulated trigger in the approval queue. **Autonomy: APPROVE** for every regulated
  trigger (never relaxed); **notify** for a new banned-phrase hit.
- **Metrics it owns:** requirements met/blocked, approval-queue depth, banned-phrase hits, # guardrail
  trips (from Langfuse), days-since-counsel-review. *Today: partly live (gates), partly UNINSTRUMENTED
  (counsel cadence).*
- **2026 add:** persist each approval-queue clearance as an audit row (who/when/which trigger) — the
  ledger the audit asks for (`05:134-137`).

### 2. Data & Accuracy — *head exists* (`departments.ts:181-242`)
- **Mandate:** guard input integrity + model calibration; surface staleness/drift before a customer
  sees it. Never self-adjust weights (`MODEL_VERSION` bump is human, `05:237`).
- **Agent scope:** Scout-class — watches source freshness, fallback-chain health, calibration evidence.
  **Autonomy: AUTO** for ingest/snapshot/settle (already cron-driven, `05:178`); **approve** for any
  `MODEL_VERSION` bump (guardrailed by `model-freeze.mjs`).
- **Metrics it owns:** source freshness (hrs), fallback-chain status, Brier/reliability buckets, CLV
  (the data-mesh "true scoreboard," doc `10:52`), test health. *Today: freshness UNINSTRUMENTED →
  Wave B #5 makes it real.*

### 3. Growth & Monetization — *head exists* (`departments.ts:244-293`)
- **Mandate:** model the value ladder + revenue levers, each gated behind compliance reqs + flags.
  Never pull a live payment/affiliate path.
- **Agent scope:** Bobby-class — funnel/subscription/churn observations as review items.
  **Autonomy: NOTIFY** (surfaces anomalies); **APPROVE** for pricing, any live affiliate/payment.
- **Metrics it owns:** MRR, active subs, trial→paid, churn, failed payments (Stripe), funnel
  conversion + session replay (PostHog), attribution (Dub). *Today: FORECAST_ONLY → Wave B #4 makes it
  real (founder-gated keys).*

### 4. Product & Engineering — *head exists* (`departments.ts:295-338`)
- **Mandate:** keep surfaces shippable and the build green; queue deploys for a human — never auto-push.
- **Agent scope:** Tal-class — repo audits, bug triage, test-failure comments, minor drafts.
  **Autonomy: AUTO** for draft PRs/issues; **APPROVE** for production deploy + migrations (regulated,
  `05:328`).
- **Metrics it owns:** test pass rate, build status, deploy queue, error rate + traces (SigNoz),
  p95 latency, Core Web Vitals (PostHog/Vercel). *Today: tests partly observed; error/trace
  UNINSTRUMENTED on DEPLOY → Wave A #1-2 makes it real.*

### 5. Content & Brand — *head exists* (`departments.ts:340-382`)
- **Mandate:** keep the voice consistent, every published word inside the trust-claim registry.
  Draft-only; publishing gated.
- **Agent scope:** Ava-class — drafts blog/newsletter/short-form strictly from approved data; never
  publishes (`draft-only.mjs` enforces). **Autonomy: AUTO** for drafts; **APPROVE** for publish + any
  send.
- **Metrics it owns:** banned-phrase hits, draft→publish ratio, content coverage, SEO position
  (Ahrefs), email engagement (Klaviyo). *Today: banned-phrase live; engagement UNINSTRUMENTED.*

### 6. Support & Success — *head exists* (`departments.ts:384-409`)
- **Mandate:** answer customers; route compliance-sensitive questions (data-deletion, responsible-play)
  to the right place.
- **Agent scope:** Sarah-class — drafts replies, triages to review queue; never sends.
  **Autonomy: AUTO** for draft + triage; **APPROVE** for any customer-facing send; **legal-gated** for
  SMS (TCPA, `05:406`).
- **Metrics it owns:** ticket volume, first-response time, resolution rate, NPS/CSAT (Formbricks),
  deletion-request SLA. *Today: fully UNINSTRUMENTED → Wave B #6 gives the first real signal.*

### 7. Orchestration — Jarvis (*exists*, `jarvis.ts`) — the "agent orchestrator" 2026 names as the
   senior role managing the fleet. **Mandate:** route work to the right head, synthesize launch
   readiness from live evidence, refuse to over-claim. **Metrics it owns:** system readiness, per-agent
   queue depth, # of human approvals pending, **agent cost/latency from Langfuse**, guardrail-trip rate.
   *2026 add:* a fleet-level "autonomy budget" dashboard — how much ran auto vs notify vs approve, and
   the safety record that would (or would not) justify widening a tier.

### Proposed NEW heads for a fully-realized 2026 org (aspirational, additive)
- **8. Security & Governance** — the "AI ethics/governance specialist" role the research flags as
  critical: owns the zero-trust agent-access model, audits agent decisions, owns the guardrail-trip
  ledger. *Today:* guardrail scripts exist (`05:225`) but no single head owns them. **Tag: aspirational.**
- **9. Finance/Ops** — owns the Langfuse **cost** view (Claude spend), infra spend (Vercel), and the
  budget that caps agent autonomy. **Tag: aspirational** (folds into Growth until volume justifies).

## 2.4 The autonomy ladder (how a head's action earns more autonomy)

Encodes the 2026 "expand autonomy only when safety metrics prove it" pattern onto GSE's existing gate
doctrine. **Regulated triggers never leave APPROVE** — this ladder only governs *non-regulated* head
actions:

| Tier | What runs here | Gate to qualify | GSE example |
|---|---|---|---|
| **AUTO** | low-risk, reversible, internal | Langfuse eval pass-rate over N runs + zero guardrail trips | ingest/snapshot/settle; draft PRs; draft replies |
| **NOTIFY** | medium-risk, internal-visible | clean AUTO record + founder opt-in | flag line-movement; surface churn anomaly; ON_WATCH→Novu |
| **APPROVE** | anything regulated OR new | **always**, by construction | deploy, publish, charge, affiliate go-live, `MODEL_VERSION` bump, SMS |

The ladder is itself **founder-gated**: a head moves an action up a tier only when the founder signs
off, backed by the Langfuse safety record. This is "compliance-as-code" extended to autonomy-as-code.

## 2.5 Closing the two structural gaps (the high-leverage 2026 moves)

1. **Port the department-heads layer into DEPLOY** (or explicitly declare it Launch-2) — audit
   `05:253`. Additive, internal, ADMIN-gated, low-risk; carry the test so the clones can't re-diverge.
   **Tag: founder-gated** (founder decides port vs defer).
2. **Persist the approval-queue + head decisions as an audit ledger** — audit `05:134-137`,
   mirrors the `GateDecision` ask in lens 06. Keep the model *pure* (hand persisted decisions in as
   signals); record who cleared which named trigger and when. **Tag: safe-now** (additive table,
   internal). This is what turns "human-gated" into "auditable" — the thing a regulator asks for.

---

## 3. Priority summary (do-this-first)

| # | Action | Wave | Tag |
|---|---|---|---|
| 1 | Port OTel/SigNoz + error sink + `global-error.tsx` into DEPLOY | A | safe-now |
| 2 | Wire PostHog (analytics + flags + replay) into DEPLOY | A | safe-now |
| 3 | Persist approval-queue/head decisions as an audit ledger | — | safe-now |
| 4 | Wire source-freshness + test health into Data-Accuracy head | B | safe-now |
| 5 | Formbricks survey → first Support/Content signal | B | safe-now |
| 6 | Langfuse on every Claude/agent call (cost + evals) | D | safe-now |
| 7 | Ahrefs + SimilarWeb (MCP) → live competitor war-room | C | safe-now |
| 8 | Port department-heads layer into DEPLOY | — | founder-gated |
| 9 | Stripe metrics → Growth head (live keys) | B | founder-gated |
| 10 | Klaviyo/Novu customer sends; Dub affiliate; customer SMS | C | founder/legal-gated |

> **Posture check (unchanged):** trust-first, reveal-less on the proprietary recipe (the GSE Rating
> doctrine in `data-mesh/10`), no real-money/chance gambling, responsible-gaming surfaces stay,
> compliance-as-code. Every money/publish/license/age-geo switch remains founder/legal-gated. This doc
> recommends **wiring instruments and maturing structure**, never loosening a gate.

---

## Sources (web-verified 2026 benchmarks)

- McKinsey — *The agentic organization: a new operating model for the AI era* (2-5 humans / 50-100 agents).
- California Management Review (Berkeley), Mar 2026 — *Governing the Agentic Enterprise* (AOM four layers).
- CIO — *The new org chart: AI-native roles in the agentic era* (agent orchestrator, governance specialist).
- ZBrain / n-ix / Arthur.ai / Frontegg / WitnessAI — *AgentOps & AI agent governance 2026* (tiered autonomy; OTel GenAI conventions).
- PostHog vs Amplitude (PostHog blog; userpilot; cotera) 2026 — free tier 1M events / 5k replays / 100k flags; analytics+replay+flags+experiments.
- Langfuse docs + Confident-AI "Top 7 LLM Observability 2026" — tracing, evals (LLM-as-judge), cost tracking, OTel.
- SigNoz comparisons 2026 — OTel-native, error↔trace↔log correlation; Vercel "lacks end-to-end traces."
- Stripe Billing / buildmvpfast 2026 — Meters API, spend caps, in-product usage visibility (bill-shock).
- Customer.io vs Klaviyo 2026 (sequenzy; praxxii) — Klaviyo D2C-shaped; SaaS lifecycle better served by behavioral tool.
- Ahrefs vs Semrush vs SimilarWeb 2026 (stylefactory; ampifire) — Ahrefs=backlinks/competitive, SimilarWeb=traffic intel (directional).

## Internal citations (grounded current state)

- `Sports-canonical-2026-06-03/apps/web/lib/cockpit/departments.ts:26-425` — six heads, statuses.
- `.../lib/cockpit/agents.ts:27-101` — six role-agents, `externalActions:"NONE"`.
- `.../lib/cockpit/compliance-program.ts` · `monetization-levers.ts` · `competitor-watchlist.ts` · `intelligence-control-plane.ts` · `jarvis.ts`.
- `docs/command-center/audit-2026-06-09/05-departments-heads-process.md` (Grade B; canonical-only; read-time-only).
- `docs/command-center/audit-2026-06-09/11-performance-reliability-observability.md:17-23,29-33,45` (OSS stack inert/canonical-only; DEPLOY launch-blind).
- `docs/command-center/data-mesh/10-gse-rating-proprietary-architecture.md:52` (CLV scoreboard; reveal-less doctrine).
- `Sports-canonical-2026-06-03/apps/web/package.json:18-42` — OSS stack deps present (inert).
- `Sports/apps/web/package.json:16-35` — DEPLOY has none of the OSS stack.

*Doc-only. No source, test, config, schema, env, or package file in either clone was modified.*
