# 01 — Vision 2026: Gaps & Adds (dimension-by-dimension synthesis)

> **What this is.** The consolidated, forward-looking ("what to ADD to be the best sports-intelligence
> website of 2026") gap analysis across eight dimensions. It is **not a re-audit** — current state is
> grounded in the audit (`docs/command-center/audit-2026-06-09/`) and the proprietary-Rating + source-mesh
> R&D (`docs/command-center/data-mesh/`), and it **builds on** the five deep-dive vision docs in this
> folder rather than duplicating them. Each deep-dive is the canonical source for its dimension; this doc
> is the index + the two dimensions the deep-dives only touch (Performance/A11y/SEO, Trust/Differentiation),
> normalized to one tag + effort scheme.
>
> **Author lane:** RESEARCH + DOC only. No source/test/config touched in either clone. No keys, no builds,
> no live switches. Every "we have X today" claim is a `file:line` or audit/data-mesh citation; every
> "2026 bar" benchmark is web-cited (sources live in the companion docs, referenced here).
>
> **Two clones, labeled on every claim:**
> **DEPLOY** = `C:/Users/Garrett/Sports` — the launch target, narrower (lean ~60-route conversion funnel,
> older raw-Tailwind design system, no cinematic layer, none of the named differentiator engines).
> **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` — the full platform (~115 routes, A-grade
> tokenized design system, cinematic cold-open, Player Lab, intelligence engines, Airwave, department-heads
> cockpit, fantasy, the matured kit).
>
> **Tag legend:** `safe-now` (compliant, build today, no live switch) · `founder-gated` (founder flips a
> switch / spends / bumps `MODEL_VERSION`) · `legal-gated` (needs counsel/media sign-off) · `aspirational`
> (real, but needs R&D/data/stage it doesn't have yet). **Effort:** S = <½ day · M = ½–2 days · L = multi-day.

---

## 0. The master fact (read first)

Across **all eight dimensions** the dominant finding is the same one the audit names in 9 of 10 lenses:
**two-clones drift.** The matured implementation — design system, CLV pipeline, observability stack,
failover toolkit, department-heads cockpit, the entire differentiator roster, the pricing-phase ladder —
**lives in CANONICAL, the clone we are NOT shipping.** DEPLOY, the launch target, is the strict subset on
exactly the surfaces that build trust and feel "2026."

So the single highest-leverage forward move is **not** building new experiences (they overwhelmingly already
exist) — it is **(a) reconcile onto one declared deploy tree** so the launch inherits the matured system
(audit P0-1), **(b) activate the inert** (CLV capture, `currentEdgeIndex`/`GateDecision` writers, observability,
failover, the dormant growth loops — most are no-op-without-keys and therefore safe to merge), **(c) connect
the orphans** into hubs, **(d) add the one foundation GSE genuinely lacks: personalization / adaptive layout
+ the presentation layer (clickable citations, inline viz, confidence chips, scroll choreography)**, and
**(e) deepen the accountability-weighted Signal moat** (legal-gated). The product is *substance-ahead,
surface-behind, and clone-stranded* — the vision is mostly wiring, consolidation, and presentation, not greenfield.

**Companion deep-dives (each is the source of record for its dimension):**

| Deep-dive | Covers (this doc's dimensions) |
|---|---|
| `visual-motion-2026.md` | Creative / Visual / Motion |
| `03-ai-native-intelligent-ux.md` | AI-native Intelligence |
| `03-data-and-analytics-stack-2026.md` | Data **and** Analytics |
| `20-growth-engagement-retention-monetization.md` | Growth / Monetization |
| `30-integrations-and-ai-run-company.md` | Plugins / Tools / Integrations (+ the AI-run org) |

This doc adds the two not deeply covered elsewhere — **Performance / A11y / SEO** and **Trust / Differentiation**
— and gives the per-dimension *2026 bar → have-today → GAP → tagged ADDS* table for all eight.

---

## DIMENSION 1 — Creative / Visual / Motion

**The 2026 bar (web-cited, see `visual-motion-2026.md` §0/§2).** The award bar is **NOT "more WebGL"** —
2026 reality-checks show 3D-everywhere brands failed Core Web Vitals and lost mobile users (a single Spline
hero = 800 kB–2 MB JS before first paint; glassmorphism = 15–30% FPS drop on mid Android). What won, with
numbers: **motion-as-language / scroll choreography (scrollytelling)**, **editorial display typography**
(variable fonts, serif accents), **data-driven generative visuals**, **bento grids (+23% scroll depth)**,
**dark-cinematic (+18% session)**, all under a hard reduced-motion + INP discipline.

**What GSE has today (CANONICAL, grounded).** Unusually far along: a disciplined WebGL aurora backdrop
(`components/hero/shader-aurora.tsx` — DPR-clamped ≤1.5, pauses offscreen/tab-hidden, reduced-motion static
fallback, WebGL-fail CSS gradient), a lazy boundary (`shader-aurora-lazy.tsx`), a reduced-motion-safe
scroll-reveal primitive (`components/motion/reveal.tsx`), film-grain/vignette atmosphere
(`components/ui/atmosphere.tsx`), an honest ~22s skippable cinematic cold-open that labels numerals
"illustrative system trace" (`components/landing/cinematic-entrance.tsx`), and an A-grade tokenized
editorial type/dark system (`styles/design-tokens.css`). **DEPLOY has almost none of it** — raw `bg-gray-950`,
1696 raw-neutral occurrences, empty `components/landing/`, no surface tokens (audit `01-aesthetic-design.md` P0).

**The GAP.** (1) DEPLOY ships the un-choreographed clone — no 2026 polish matters if that's what users see.
(2) Motion is fade-on-enter, not *scroll choreography*. (3) No committed editorial display moment. (4) The
proprietary signal is not yet rendered as living generative art. (5) The cold-open hardcodes hex off the tokens.

**ADDS** (full detail in `visual-motion-2026.md`):

| # | Add | Tag | Effort |
|---|---|---|---|
| V1 | Promote/port the cinematic layer (tokens + Tailwind config + 3 motion primitives) into DEPLOY, OR formally keep DEPLOY simpler (the documented scope call, audit P0-6) | founder-gated | L |
| V2 | Scroll **choreography** via Lenis (~3 kB) + native CSS Scroll-Driven Animations — pinned "Rating-assembly" scrollytelling that shows the number *composes* without exposing weights (reveal-less) | safe-now | M |
| V3 | One **editorial display moment** per key page (oversized headline + variable-font entrance, hero-only) | safe-now | M |
| V4 | **Data-driven generative visual** reusing the shader machinery, labeled "illustrative encoding of published outputs" (visual scaffold safe-now; **live-data wiring founder-gated**) | safe-now / founder-gated | M |
| V5 | Tokenize `cinematic-entrance.tsx:73–78` hex → `var(--*)` (off-brand on the most-watched first impression, audit P2-1) | safe-now | S |
| V6 | Micro-interaction vocabulary + **View Transitions API** list→detail morphs (player card → story) | safe-now | M |
| V7 | Formalize **bento-grid choreography** for the data surfaces (staggered reveal, hover-deepen) | safe-now | M |
| V8 | Skip / hard-gate the CWV-killers: full R3F scene, glass heroes; prototype-and-measure any WebGPU moment | aspirational | — |

**Count: 8 adds** (5 safe-now, 1 founder-gated, 1 mixed, 1 aspirational).

---

## DIMENSION 2 — AI-native Intelligence

**The 2026 bar (web-cited, see `03-ai-native-intelligent-ux.md` §2).** Six patterns recur in the best AI
products: task-aware **copilot** workspaces (MS Copilot), conversational **interrogation** with follow-up
context chains (ThoughtSpot/Snowflake), **inspectable answers** (Perplexity: openable citation chips +
suggested follow-ups), **generative UI** that renders charts/tables inline and "shows its work" (Vercel AI
SDK / CopilotKit), **proactive/anticipatory** insight (ambient agents), and **trust/transparency as the
differentiator** (confidence indicators, published fallback/hallucination rate).

**What GSE has today (grounded).** Substance-ahead: a production-grade reveal-less, citation-enforced
conversational engine — the **Model Court**, 3 modes + 4 audience lenses (`lib/intelligence-graph/model-court/answer.ts:98`,
`prompts.ts:13-16,207-224`), a 6-kind **refusal taxonomy** (`answer.ts:195-224`), **citation enforcement**
(`answer.ts:96,226-253`), a per-pick **"Ask the model why"** explainer (CANONICAL, `components/picks/ask-why.tsx:11`),
a **numeric-claims guard** (`lib/claude-api/numeric-guard.ts`), and a **Claude spend governor**. Bias Mirror
+ Loss Autopsy are CANONICAL-only.

**The GAP.** *Surface-behind:* the Model Court is mounted on **one game room** and absent from the launch
funnel's front door/board/pricing (audit `00-EXECUTIVE-SUMMARY.md:115`); citations render as plain inline
text, not clickable chips; no suggested follow-ups; answers are prose with no inline viz; the product is
pull-only (no proactive digest); confidence/honesty are computed but not *displayed*; richer interrogation
surfaces are CANONICAL-only. **GSE has no personalization foundation** (the one 2026 trend with no base).

**ADDS** (full detail in `03-ai-native-intelligent-ux.md`):

| # | Add | Tag | Effort |
|---|---|---|---|
| AI1 | Promote Model Court from room panel to **ambient "Ask the Edge"** copilot on board / pick / rating / front door | safe-now | M |
| AI2 | **Clickable citation chips + 2–3 suggested follow-ups** (Perplexity-grade inspectability; follow-ups from a reveal-safe allow-list) | safe-now | M |
| AI3 | **Generative UI inside answers** — render existing factor bars / line-movement / calibration curve inline; bars stay PRO-gated, curve public; **never the weights** | safe-now / founder-gated | M |
| AI4 | **Confidence + honesty chips** on every answer + a public successful-fallback rate (PostHog/Amplitude) | safe-now | M |
| AI5 | Proactive **"Slate Brief"** (same engine, `ASK_THE_SLATE`): FREE pull read safe-now; ELITE push founder-gated; copy legal-gated (Klaviyo) | mixed | M |
| AI6 | **Personalized lens memory** (persist default FAN/FANTASY/CREATOR/ANALYST lens — FAN lens is an RG asset) | safe-now | S |
| AI7 | Port `pick-explainer` / `bias-mirror` / `loss-autopsy` into DEPLOY | founder-gated | M |
| AI8 | **"Show your work" evidence-walk trace** (inputs + gates the engine already assembles, `answer.ts:271-296`; never the combination logic) | safe-now | M |
| AI9 | Voice / multimodal read-only ask | aspirational | L |

**Count: 9 adds** (5 safe-now, 1 founder-gated, 2 mixed, 1 aspirational).

---

## DIMENSION 3 — Data

**The 2026 bar (web-cited, see `03-data-and-analytics-stack-2026.md` §1 + `30-…` Part 1).** Elite sports
engines run **multi-source ingestion with graceful failover**, **CLV / closing-line value** as the
variance-free edge proof, **NGS player-tracking + nflverse EPA/usage/injuries** feeding the projection,
and a licensed multi-sport feed for breadth. The independent (non-market) estimate is what separates an
engine-with-edge from a consensus tracker.

**What GSE has today (grounded).** A single external source feeds the score — **The Odds API only**
(`packages/data-ingestion/src/odds-api-client.ts`); all 8 richer categories (injuries/weather/officials/
pace/etc.) are honest-absent shadow (`weight:0`, `BLOCKED_MISSING_SOURCE` — `process-sport.ts:70-96`).
The GSE Rating is ~75% market-structure-derived; the two independent-estimate fields are hardcoded `null`
(circular edge, `scoring.ts:393-395`). **CLV capture is REAL but CANONICAL-ONLY** (`clv-capture.ts`,
`settle-sport.ts:148-166`, migration `20260603120000_add_pick_clv`) — DEPLOY has zero CLV. The
failover toolkit (`odds-failover.ts`, `source-health.ts`, `source-registry.ts` with `assertIngestible`),
Kalshi/ESPN clients, and ~20 nflverse/NGS/injury/weather adapters all exist **CANONICAL-only and inert**
(`nflverse-source.ts:16-18` "not yet wired"; `edge-signals.ts:16` "canPublishPicks stays false").

**The GAP.** Single-provider SPOF on the launch spine (audit P0-2/P0-8); CLV — the #1 sharp-accuracy proof —
absent from the clone we ship; the engine is 100% odds-derived with no independent input; the rich data exists
but only as read-time pages, never as scoring estimators.

**ADDS** (full detail in `03-data-and-analytics-stack-2026.md` §2 Tier 1/Tier 3):

| # | Add | Tag | Effort |
|---|---|---|---|
| D1 | **Port the CLV capture pipeline into DEPLOY** (build safe-now; capture vs the **Kalshi** liquid close, `kalshi-client.ts` exists inert); publishing CLV publicly is founder-gated | safe-now / founder-gated | M |
| D2 | Port **failover plumbing** (`resolveOddsWithFailover`) into DEPLOY (safe-now) + wire a **second odds provider** (odds-api.io) behind a flag (paid → founder-gated) — removes the launch SPOF | safe-now / founder-gated | L |
| D3 | Activate **nflverse injuries + EPA/usage** as the first independent, non-market `fairProbability` input — the keystone that de-circularizes the edge (deliberate `MODEL_VERSION` bump, shadow-first) | founder-gated | L |
| D4 | **NGS player-tracking** layer (speed/accel/separation/pressure) — not present in DEPLOY at all; source via licensed provider, respect `source-registry.ts` `assertIngestible` | founder-gated / legal-gated | L |
| D5 | **Multi-sport licensed feed** (SportsDataIO / API-Sports: injuries + depth charts + advanced) as the product expands past NFL | founder-gated | L |
| D6 | Fix `validateFreshness` tautology + validate **upstream** event timestamps so stale-upstream-with-fresh-fetch is caught (audit P1-25) | safe-now | S |

**Count: 6 adds** (1 safe-now, 1 mixed, 3 founder-gated, 1 founder/legal).

---

## DIMENSION 4 — Analytics

**The 2026 bar (web-cited, see `03-data-and-analytics-stack-2026.md` §1 + `30-…`).** Product analytics +
experimentation/feature-flags + session replay under one roof (PostHog) or analyst-depth (Amplitude);
a warehouse + dbt + BI + reverse-ETL for real BI; OTel-native observability + LLM-call tracing (SigNoz);
and the **public accuracy analytics that prove an intelligence product** — Brier + reliability + **resolution
(Murphy decomposition)** + CLV, validated by a walk-forward/holdout harness.

**What GSE has today (grounded).** A **real Brier-score calibration engine in DEPLOY** (`lib/calibration/compute.ts`)
that fails closed and can never auto-apply — but with **~no settled sample yet**, **no resolution decomposition**,
and **no walk-forward harness** (audit `06` P2, `report.ts:36-47`). A real **shadow non-market estimator**
(`independent-estimator.ts`, WIN-03, gated, doesn't feed published confidence). The full OSS observability +
product-analytics stack (PostHog/Langfuse/OTel-SigNoz/Novu/Unkey/Formbricks/Trigger.dev/Dub) is wired
**CANONICAL-only and inert** (`package.json:18-42`, `instrumentation.ts`); **DEPLOY has none of it wired** —
a prod incident is visible only via `console.*` (audit `11` P1). Neither clone's error boundary captures to a
sink; no `global-error.tsx` either clone.

**The GAP.** The launch clone is **blind** — no product funnels, no traces, no error aggregation, no
experiment/flag primitive; calibration proves *honesty* but not *edge* (no resolution, no CLV — see D1);
retention/engagement are currently **unmeasurable**.

**ADDS** (full detail in `03-data-and-analytics-stack-2026.md` Tier 0/1/2):

| # | Add | Tag | Effort |
|---|---|---|---|
| AN1 | **Port the observability + product-analytics stack into DEPLOY** (inert until keyed; the single highest-leverage reliability fix, audit `11` P1) — SigNoz MCP + Amplitude/PostHog | safe-now | M |
| AN2 | Wire the **client error boundary to a sink** + add `global-error.tsx` (both clones; the on-screen copy promises a trace nothing captures — `error.tsx:43`) | safe-now | S |
| AN3 | **Feature-flag / experiment primitive** (PostHog flags free-tier) for safe rollout + kill-switch — NOT for money/legal/`MODEL_VERSION` flips | safe-now | M |
| AN4 | Add **resolution / Murphy decomposition + log-loss** to calibration so "calibrated" can't hide "uninformative" (audit P2-15) | safe-now | M |
| AN5 | **Walk-forward CV + frozen-season holdout harness** + a CI assertion fit-split ≠ report-split ≠ holdout, before any realized-rate publish (audit P1-9) | safe-now | M |
| AN6 | **Event taxonomy + cohort instrumentation** (DAU/MAU, D1/D7/D30, activation time) so retention is measured, not guessed | safe-now | M |
| AN7 | **Read-only warehouse mirror** (BigQuery + dbt + Metabase) of settled picks / snapshots / calibration / CLV so backtests never touch prod | aspirational | L |
| AN8 | Wire **Ahrefs / SimilarWeb / Supermetrics** MCPs (connected this session) for acquisition + competitive-traffic intel — zero build | safe-now | S |
| AN9 | Public **"Checking Our Work" accuracy page** (reliability curve + CLV trend); publishing realized rate gated on ≥25-sample + walk-forward bar | founder-gated | M |

**Count: 9 adds** (7 safe-now, 1 founder-gated, 1 aspirational).

---

## DIMENSION 5 — Plugins / Tools / Integrations

**The 2026 bar (web-cited, see `30-integrations-and-ai-run-company.md`).** A startup runs an OSS observability
+ analytics + flags + jobs + notifications + surveys + attribution stack (no-op without keys), an agent
backbone (Langfuse traces + LLM-as-judge evals, Trigger.dev durable jobs), and a marketing-intel surface
(SEO/traffic/attribution), with **tiered agent autonomy** (auto / notify / approve) and OTel GenAI conventions.

**What GSE has today (grounded).** The OSS stack is **scaffolded inert in CANONICAL and absent from DEPLOY**
(`Sports-canonical-…/apps/web/package.json:18-42` vs `Sports/apps/web/package.json:16-35`; audit `11` P1).
Stripe is in the money-path on **both**. This session exposes complementary commercial **MCPs**: Amplitude,
Stripe, Klaviyo, Figma, Linear/Asana/Slack, Ahrefs/SimilarWeb/Supermetrics, Vercel, Notion — most need an
OAuth `authenticate` step; all live actions stay founder/legal-gated.

**The GAP.** The launch target has no analytics / no error sink / no traces / no flags / no notification or
attribution wiring; the agent fleet has no cost/latency/eval observability; the competitor war-room is static.

**ADDS** (full detail in `30-integrations-and-ai-run-company.md` §1.3, 5-wave order):

| # | Add | Tag | Effort |
|---|---|---|---|
| I1 | **Wave A — Observability/truth:** port OTel/SigNoz + error sink + `global-error.tsx` + PostHog (analytics+flags+replay) into DEPLOY (= AN1/AN2, the unblocker) | safe-now | M |
| I2 | **Wave B — Instrument the heads:** Stripe → Growth (founder-gated keys), source-freshness → Data&Accuracy, Formbricks micro-survey → Support/Content, Novu → operator alerts | mixed | M |
| I3 | **Wave C — Marketing intel:** Ahrefs + SimilarWeb MCP → make the static competitor war-room **live**; Dub owned-channel attribution (affiliate stays legal-gated); Klaviyo broadcast/win-back | mixed | M |
| I4 | **Wave D — Agent backbone:** Langfuse on every Claude call (cost + LLM-as-judge evals), Trigger.dev durable jobs, Linear/Slack as the agent work surface | safe-now | M |
| I5 | **Wave E — Figma** Code Connect + variable extraction → design-system parity between Figma and code | safe-now | M |
| I6 | **Tiered-autonomy ladder** (auto/notify/approve) — regulated triggers never leave APPROVE; non-regulated earn autonomy only via Langfuse-measured safety + founder sign-off | founder-gated | M |
| I7 | Unkey public-API metering (only if/when GSE exposes a developer API) | aspirational | M |

**Count: 7 adds** (3 safe-now, 2 mixed, 1 founder-gated, 1 aspirational).

---

## DIMENSION 6 — Growth / Monetization

**The 2026 bar (web-cited, see `20-growth-engagement-retention-monetization.md` §2).** DAU/MAU stickiness
≥20%; D30 retention 10–18% (utility band); activation <3 min → ~2× retention; ≥1 push in first 90 days →
3× retention; freemium ≥4% sustainable via progressive gates; **3 tiers** convert ~1.4× vs 2 and ~1.8× vs 4+;
double-sided referral works even at K=0.3–0.5; **streaks** (Duolingo) moved next-day retention 12%→55%;
lifecycle email (3-email welcome / engagement-triggered upsell / ~3-email winback). Monetization 2026:
hybrid base-fee + usage (~43%→61% of SaaS), credit-based AI metering (+126% YoY), annual + ~8% escalator.

**What GSE has today (grounded).** ~70% of the engine is pre-built but **inert and clone-stranded**:
**Beat the Model** free pick'em (localStorage-only, no account/streak/leaderboard/share — CANONICAL only,
`components/fantasy/beat-the-model.tsx`); **Novu** (daily-habit workflows `pick-alert-*`/`gse-rating-mover`
**defined but never triggered**, `novu.ts:19-26`); **Dub** (builds share links, no referral attribution/reward,
`dub.ts:68-94`); **Cipher** + **Brief** (built, CANONICAL-only); the **proof-gated pricing ladder**
FOUNDING→PROVEN→ESTABLISHED→AUTHORITY with grandfather guarantee (CANONICAL `pricing-phases.ts`); production
Stripe (both). **Klaviyo / lifecycle email = absent entirely** (grep 0). **Referral ledger / streak layer = absent.**
**Pricing diverges (P0):** DEPLOY $19/$49 monthly-only + 2-var Stripe schema vs CANONICAL Founding
$14.99/$24.99 + monthly/annual + 4-var schema + `PRICING_PHASE` — schemas don't overlap.

**The GAP.** The launch tree has **zero top-of-funnel growth loop**; the daily-habit/streak/referral/lifecycle
loops are unwired; retention is unmeasured; pricing is split across clones; no annual plan in DEPLOY; no
usage/credit-based AI metering anywhere. Leading paid competitors (Outlier $19.99/$29.99/$79.99, no free tier;
Action Network) ship **no** daily-habit game, streak, or free community hook → open white space for a trust-first loop.

**ADDS** (full detail in `20-growth-…md` §3):

| # | Add | Tag | Effort |
|---|---|---|---|
| G1 | **Port Beat the Model to DEPLOY + identity/streak/leaderboard spine** + shareable "X-Y vs the Model" season scorecard (streaks reward *logged reasoning*, never wagering; humane freeze/repair) | safe-now (reward founder-gated) | M |
| G2 | Wire the **daily free reasoned read** on the orphaned `/today` (the activation ritual) | safe-now | M |
| G3 | **Trigger the dormant daily Novu workflows** + a daily-digest (first-90-day push = 3× retention); never push stale "live" data | founder-gated (key) | S |
| G4 | Promote **Cipher + Brief** into the daily cadence to own the dead-air valley | safe-now | S |
| G5 | **Stand up a Klaviyo lifecycle program** (3-email welcome / engagement-triggered upsell / ~3-email winback tied to dunning grace) — the single biggest gap vs the bar; build specs safe-now, connect founder-gated | mixed | M |
| G6 | **Close the Dub referral loop** — attribution + double-sided **non-cash** reward (+PRO days, not money) | safe-now (reward founder-gated) | M |
| G7 | **Reconcile pricing to one source of truth** (CANONICAL `pricing-phases.ts`), keep 3 tiers, ELITE anchors PRO, add annual toggle; do NOT create Stripe price objects until reconciled (audit P0-9) | founder-gated | M |
| G8 | Hold the **proof-gated ladder** (`PRICING_PHASE=FOUNDING` until milestones are real) — the anti-dark-pattern moat | safe-now (no change) | S |
| G9 | Add a **dunning grace window** (Stripe Smart Retries + Klaviyo winback) so one failed invoice doesn't instantly drop to FREE (audit P1-19) | founder-gated | S |
| G10 | **Usage / credit-based AI metering** primitive (e.g. for Studio / AI surfaces) — the 2026 hybrid-pricing headroom | aspirational | L |

**Count: 10 adds** (4 safe-now, 1 mixed, 3 founder-gated, 1 safe-now-no-change, 1 aspirational).

---

## DIMENSION 7 — Performance / A11y / SEO

**The 2026 bar (web-cited).** **INP** is a Core Web Vital since Mar-2024 — animate transform/opacity only,
own-rAF smooth scroll (Lenis) for jank-free INP (`visual-motion-2026.md` §3, web.dev). Accessibility-as-core:
WCAG 2.2 AA contrast, reduced-motion disables (not just reduces) vestibular triggers (2.3.3) + explicit pause
for loops (2.2.2). SEO/AI-readability is a 2026 surprise table-stakes: schema markup / `llms.txt` /
structured data to stay in AI Overviews (studiomeyer tracked 2,300 Copilot citations). Reliability:
distributed tracing + error aggregation + an external uptime probe from day one.

**What GSE has today (grounded).** CANONICAL bundle hygiene is **excellent** — every Three.js scene is
`'use client'` + `dynamic(ssr:false)` with a static fallback, reduced-motion layered three ways
(audit `11` verdict). Health checks fail closed. **But:** DEPLOY ships live **AA contrast regressions**
(`--ion-2 #5E6878` = 3.36:1 FAIL, harsh `#00E5FF`; CANONICAL has the re-valuations — audit P1-3); **no HSTS
header** on DEPLOY (CANONICAL emits it — P1-7); a **latent RSC client-boundary footgun** in CANONICAL
(`nflverse-readiness.ts` co-locates `node:zlib` with a pure helper — P1-23); **no CSP** either clone (P2-12);
SEO gaps — key conversion pages (home/dashboard/promotions) export **no metadata/OG** in DEPLOY (P2-5),
and the **canonical host is inconsistent** (www vs non-www splits SEO signal — P1-15); `/api/health` returns
**200 even when stale** and **nothing internal polls `/api/ready`** so the truth contract "fires into the void"
(P1-24). No traces/error sink on DEPLOY (= AN1/AN2).

**The GAP.** Launch clone has live AA failures, missing security headers, no AI-readability/structured-data
layer, inconsistent canonical host, conversion pages with no OG, and a truth contract nobody polls.

**ADDS:**

| # | Add | Tag | Effort | Grounding |
|---|---|---|---|---|
| P1 | **Sync CANONICAL design-token CSS → DEPLOY** to fix the live AA contrast regressions (`--ion-2/--ion-3` + eyebrow size-floor) | safe-now | M | audit P1-3 |
| P2 | **Add HSTS header** to DEPLOY (`vercel.json` + `next.config.mjs`) + extend `next-config-policy.test.ts` so clones can't diverge | safe-now | S | audit P1-7 |
| P3 | **Lenis + transform/opacity-only motion budget** + per-effect mid-tier Android measurement gate (INP discipline) | safe-now | M | `visual-motion-2026.md` §3 |
| P4 | **AI-readability / structured-data layer** — schema.org JSON-LD on key pages + `llms.txt` / `agents.json` to stay in 2026 AI Overviews | safe-now | M | `visual-motion-2026.md` §3 |
| P5 | **Fix the canonical-host inconsistency** (www vs non-www across `layout.tsx`/`robots.ts`/`sitemap.ts`) + add metadata/OG to home/dashboard/promotions | safe-now | S | audit P1-15, P2-5 |
| P6 | **Wire an external uptime probe to `/api/ready`/`/api/live`** (Vercel MCP) so the fail-closed truth contract actually pages; document in RUNBOOK | safe-now (binding founder) | S | audit P1-24 |
| P7 | **Baseline CSP** (report-only first) once the third-party script surface is enumerated | safe-now | M | audit P2-12 |
| P8 | **Split the `node:`-importing helpers into `*.pure.ts` siblings** + a guardrail test (no `'use client'` module transitively imports a `node:` file) | safe-now | S | audit P1-23 |
| P9 | **Add the read-side freshness complement** (`/api/picks` + board degrade when stale, calm copy) so day-old odds never render as "live" | safe-now | M | audit P1-2 |

**Count: 9 adds** (all safe-now; P6 binding is founder).

---

## DIMENSION 8 — Trust / Differentiation

**The 2026 bar (web-cited, see `03-ai-native-…md` §2.6 + `03-data-…md` Tier 1).** "88% of product leaders say
trust frameworks will be a core differentiator"; the AI-prop category converges on **transparency / education-first**
as the headline differentiator ("transparency is the only feature that pays the bills; tools that hide losing
streaks are scams"), 0–100 multi-model confidence, full per-signal breakdowns, and a public self-auditing
accuracy record (FiveThirtyEight's "Checking Our Work" was the gold standard).

**What GSE has today (grounded — this is GSE's strongest axis).** The reveal-less public contract is
**test-enforced**: consumer sees Edge Index (0–100) + tier + plain-English read + reliability/settled-record
proof; GATED = raw confidence / factor bars / line movement (PRO), CLV / alerts (ELITE); **NEVER public** =
category weights / aggregation / the Signal-layer's existence (`data-mesh/10-…:326-398`,
`__tests__/method-leakage-gate.test.ts`, `lib/trust-claims.ts`). Compliance-as-code: fail-closed promotions
gate with **0 approved partners**, Airwave refusal-by-default, evidence-only calibration that can never
auto-apply (audit `09` B+). The accountability-weighted **Signal layer** (SiriusXM Ch87 + beat + aggregate,
internal/gated) is **genuinely net-new vs every competitor**. The full differentiator roster — Signal Courtroom,
Decision Autopsy, Agent War Room, Parlay Genome, No-Bet Radar, Galaxy Slate Twin, Proof-of-Record, Bias Mirror,
Airwave, Cipher — is **built (mostly illustrative/gated) in CANONICAL; DEPLOY has none of it.**

**The GAP.** (1) Three named metrics that *prove* differentiation are absent/unwritten in production:
**`currentEdgeIndex`** (read in ~8 places, never written — always null/fallback to the circular edge, P1-10),
**`GateDecision`** (derived on the fly, never persisted → "no strong play today" isn't auditable, P1-11),
**CLV** (doesn't exist in DEPLOY — see D1). (2) The Edge is **circular** (de-vigs the book's own consensus, P1-1).
(3) **Tier mislabel** — player Rating is pure within-position percentile with no absolute floor (Tua = "Elite", P1-12).
(4) The differentiator roster + compliance cockpit are CANONICAL-only. (5) Brand promise is **fragmented across
3 headlines**; "Proven, not explained" exists only in CANONICAL (P1-13). (6) The honesty substance isn't
*displayed* (no public fallback/refusal rate, no confidence chips — = AI4).

**ADDS:**

| # | Add | Tag | Effort | Grounding |
|---|---|---|---|---|
| T1 | **Write real `GateDecision` rows** when the slate gates a game → "no strong play today" becomes an **auditable artifact** (the honest empty-state, queryable) | safe-now | M | audit P1-11 |
| T2 | **Resolve `currentEdgeIndex`** — give it a single scale + a real prod writer, or retire the name; don't ship a permanently-null named public metric | founder-gated | M | audit P1-10 |
| T3 | **Land the independent `fairProbability`** from non-market inputs (shadow-first, benchmark vs the close out-of-sample) — de-circularizes the edge; the real-edge chapter (= D3) | founder-gated | L | audit P1-1 |
| T4 | **Add an absolute Elite floor** to the player Rating (validated EPA/CPOE bar) + drop-missing-before-ranking + a "graded vs position, this season" annotation (fixes Tua≠Elite) | founder-gated | M | audit P1-12 |
| T5 | **Pick ONE primary brand promise** (recommend elevating "Proven, not explained" into `brand.ts`, render DEPLOY H1 from it) + a test asserting H1 == a brand export | founder-gated | M | audit P1-13/P1-14 |
| T6 | **Surface the honesty as a visible artifact** — public successful-fallback/refusal rate + per-answer confidence/grounding chip (= AI4); the "Checking Our Work" accuracy page (= AN9) | safe-now / founder-gated | M | `03-ai-native-…md` §4.4 |
| T7 | **Port the differentiator roster + compliance/department cockpit into DEPLOY** (or declare Launch-2) — the launch tree currently shows none of the moat | founder-gated | L | audit P1-8 / lens 05 |
| T8 | **Persist the approval-queue / head decisions as an audit ledger** (who cleared which regulated trigger, when) — turns "human-gated" into "auditable," the thing a regulator asks for | safe-now | M | `30-…md` §2.5 |
| T9 | **Centralize the responsible-gaming helpline** on one constant (after LEGAL confirms the number — 1-800-GAMBLER vs 1-800-522-4700 conflict) + extend the banned-phrase scanner from 8 → all pages | legal-gated (number) / safe-now (mechanics) | S | audit P1-B/P1-16 |
| T10 | **Deepen the accountability-weighted Signal moat** (live SiriusXM Ch87 capture + beat + aggregate feeding the score, internal/gated) — the genuinely net-new differentiator; needs media/legal sign-off | legal-gated | L | RECON / data-mesh 12 |

**Count: 10 adds** (3 safe-now, 4 founder-gated, 1 mixed, 2 legal-gated/mixed).

---

## Summary

**The one-line synthesis.** Galaxy Sports Edge is **substance-ahead, surface-behind, and clone-stranded**:
on every dimension the 2026-grade implementation already exists — but in CANONICAL, the clone that isn't
shipping, and often inert. The forward-looking program is therefore **~70% wiring/consolidation/presentation
and ~30% net-new** (personalization + adaptive layout + the presentation layer + deepening the Signal moat).
The single keystone is the audit's **P0-1: declare one deploy tree and port the matured system onto it** —
do that and roughly half of every dimension's gap closes at once. The trust posture (reveal-less + prove-results +
compliance-as-code + the accountability-weighted Signal layer) is genuinely best-in-class and net-new vs
competitors; the work is to make it **visible, audited, and present on the clone we ship** without ever
loosening a money / legal / recipe gate.

**Per-dimension add counts (61 total adds):**

| Dimension | Adds | safe-now | founder-gated | legal-gated | aspirational | (mixed counted in nearest) |
|---|:--:|:--:|:--:|:--:|:--:|---|
| 1. Creative / Visual / Motion | 8 | 5 | 1 | 0 | 1 | +1 mixed (safe-now/founder) |
| 2. AI-native Intelligence | 9 | 5 | 1 | 0 | 1 | +2 mixed |
| 3. Data | 6 | 1 | 3 | 0 | 0 | +1 mixed, +1 founder/legal |
| 4. Analytics | 9 | 7 | 1 | 0 | 1 | — |
| 5. Plugins / Tools / Integrations | 7 | 3 | 1 | 0 | 1 | +2 mixed |
| 6. Growth / Monetization | 10 | 5 | 3 | 0 | 1 | +1 mixed |
| 7. Performance / A11y / SEO | 9 | 9 | 0 | 0 | 0 | (P6 binding = founder) |
| 8. Trust / Differentiation | 10 | 3 | 4 | 2 | 0 | +1 mixed |
| **TOTAL** | **68** | **38** | **14** | **2** | **5** | ~9 mixed-tag items |

> **Read of the tag distribution:** the majority (**~38 safe-now**) are buildable today — they are wiring inert
> machinery, porting between clones, instrumentation, presentation, and accessibility/SEO hygiene, none of which
> flips a live switch. The **14 founder-gated** items cluster in Data (independent estimator / failover / feeds),
> Trust (the edge + named metrics), and Monetization (pricing + keys) — exactly where a `MODEL_VERSION` bump,
> a paid key, or a public claim is involved. Only **2 are legal-gated** (the helpline number; live Ch87 capture)
> and **5 aspirational** (warehouse, voice, credit metering, public-API metering, full-WebGPU). Nothing in this
> vision requires loosening a reins; it requires porting the matured product onto the clone that ships, activating
> what's already built, and adding the presentation + personalization layer GSE hasn't yet built.

---

*Doc-only output. No source, test, config, schema, env, or package file in either clone was modified. Built on
the audit (`audit-2026-06-09/`), the data-mesh R&D (`data-mesh/`), and the five vision-2026 deep-dives in this
folder — not a re-audit. Every "have today" claim is grounded at file:line or an audit/doc citation; every
"2026 bar" benchmark carries a web source in the companion deep-dive cited per dimension.*
