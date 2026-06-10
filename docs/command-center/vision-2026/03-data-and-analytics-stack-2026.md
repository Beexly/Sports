# Vision 2026 — Data & Analytics Stack: What to ADD to be the best sports-intelligence website of 2026

> **Lens:** the modern data/analytics stack a top *intelligence* product needs — product
> analytics, experimentation + feature flags, session replay + heatmaps, attribution, a
> warehouse + reverse-ETL for real BI, observability (SigNoz/OTel + LLM tracing), and the
> public **accuracy/calibration analytics** that *prove* an intelligence product — PLUS the
> **sports-data depth** (CLV/closing line, Next Gen Stats, injuries/usage, multi-sport) that
> separates an elite sports engine from a consensus tracker.
>
> **Posture:** forward-looking ("what to ADD"), not a re-audit. Grounds every "we have X today"
> in a real file:line or an existing audit/data-mesh doc; web-verifies every "2026 bar"
> benchmark with a source. Trust-first, reveal-less on the recipe, no real-money/chance
> gambling, responsible-gaming, compliance-as-code. Every item tagged
> **safe-now | founder-gated | legal-gated | aspirational**.
>
> **Clones:** **DEPLOY** = `C:/Users/Garrett/Sports` (launch target, narrower). **CANONICAL** =
> `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform). Doc-only; no source touched.

---

## 0. The one-paragraph thesis

GSE already has the **hardest, rarest** half of a 2026 intelligence stack: trust-as-code —
evidence-only calibration that can never auto-apply (`apps/web/lib/calibration/compute.ts:61,146`),
a fail-closed performance gate (`apps/web/lib/performance/public-performance-policy.ts:47,61-71`),
a forensic per-pick audit endpoint, and immutable signal/source provenance
(`packages/ingestion-pipeline/src/source-snapshot.ts`). What it is **missing** is the *operational*
half that every elite data product runs on: (1) **product analytics + experimentation + session
replay** wired on the launch clone (today the OSS stack — PostHog, Langfuse, OTel/SigNoz — exists
**only in CANONICAL and is inert**, per `audit-2026-06-09/11-performance-reliability-observability.md`
P1; DEPLOY has *none of it*, so a prod incident is visible only through `console.*`); (2) a
**warehouse + reverse-ETL** so the product's own picks/calibration/CLV become queryable BI instead
of living only in the operational Postgres; (3) the **public accuracy/calibration analytics that
prove the engine** — calibration is computed but resolution/CLV are not (`06-engine-accuracy-trust.md`
P1, P2); and (4) **sports-data depth** — DEPLOY ingests exactly one external source (The Odds API)
with no failover (`07-data-sources-resilience.md` P0-2), and the edge is circular because the two
independent-estimate fields are hardcoded `null` (`packages/prediction-engine/src/scoring.ts:393-395`).
The sequence below wires the cheap, safe, high-leverage operational layer **first** (analytics →
observability → CLV capture), because you cannot improve accuracy you cannot measure, then adds
data depth behind the founder-gated `MODEL_VERSION` ladder the codebase already enforces.

---

## 1. The 2026 bar (web-verified) vs where GSE stands today

| Stack layer | 2026 best-in-class bar (sourced) | GSE today (grounded) | Gap |
|---|---|---|---|
| **Product analytics** | All-in-one: analytics + flags + replay + experiments under one roof is the "pragmatic default for startups" (PostHog); Amplitude wins on analyst depth [1] | PostHog provider wired **CANONICAL only** (`app/layout.tsx:221-226`), **inert without keys**; DEPLOY has **no** posthog dep (`11-…observability.md` P1) | Not wired on launch clone; no funnels/retention live |
| **Experimentation + feature flags** | First-class, in every plan for PostHog; Amplitude Experiment is a separate paid add-on [1] | No flag system in DEPLOY; gating is hardcoded env/`MODEL_VERSION` constants | No safe rollout/holdout/kill-switch primitive |
| **Session replay + heatmaps** | Included free tier in PostHog; privacy-masking expected [1] | PostHog replay masks all inputs **CANONICAL only** (`posthog-provider.tsx:24-27`) | Absent on launch clone |
| **Warehouse + reverse-ETL (real BI)** | 5-layer modern stack: ingest → warehouse → transform → BI → orchestrate; BigQuery through Series A, dbt + Metabase default; Hightouch/Census for reverse-ETL [2] | Operational Postgres only (`packages/db`); no warehouse, no dbt, no BI tool | No analytical store; picks/CLV not queryable as BI |
| **Observability + OTel + LLM tracing** | OTel-native (SigNoz) avoids Datadog custom-metric tax + lock-in; SigNoz now ships LLM observability for OpenAI/Anthropic [3] | OTel `initOtel()` + Langfuse wired **CANONICAL only**, inert (`lib/observability/otel.ts:22`); DEPLOY blind to `console.*` (`11-…observability.md` P1) | No traces/error sink on launch clone; error boundary captures nothing (`app/error.tsx:20-23`) |
| **Public accuracy / calibration** | Brier + reliability + **CLV** is the variance-free, fast-converging edge proof; isotonic calibration validated by rolling Brier; resolution ≠ calibration [4][7] | Real Brier + reliability + 30-sample gate (`compute.ts:61`), fails closed; but **no resolution/Murphy decomposition**, **no CLV anywhere** (`06-…trust.md` P2; `10-…architecture.md` §1) | Honest but incomplete proof; can't prove *edge*, only honesty |
| **Sports-data depth** | NGS player-tracking (speed/accel/separation/pressure), nflverse EPA/PBP/usage are the public unlock; SportsDataIO/API-Sports give injuries + depth charts; Kalshi sports = liquid prediction-market close [5][6][8] | Single source = The Odds API (`odds-api-client.ts`); nflverse/Kalshi adapters exist **CANONICAL, inert** (`nflverse-source.ts:16-18` "not yet wired"); Next Gen/Trenches **not present in deploy clone** (`10-…architecture.md` §3.1) | 100% odds-derived; no injuries/usage/NGS feeding the score |

---

## 2. What to ADD — sequenced (wire-first → depth-later)

The ordering principle is **measure before you improve, and make failures observable before you
chase accuracy**. Each tier is cheap relative to the one after it and unblocks it.

### TIER 0 — Make the launch product measurable & observable (safe-now, days)

These are *reconciliation* moves: the machinery already exists in CANONICAL and is **no-op without
keys** by construction, so porting it to DEPLOY is zero-risk and the single highest-leverage step.

**0.1 Port the observability stack to the DEPLOY clone — `safe-now`.**
Port `instrumentation.ts` + `lib/observability/otel.ts` + the PostHog/Langfuse providers into
DEPLOY; they stay inert until keys are set (`otel.ts:23` `if(!ENDPOINT) return;`,
`posthog-provider.tsx:45`). This is the explicit P1 recommendation in
`audit-2026-06-09/11-performance-reliability-observability.md` ("single highest-leverage reliability
fix … right now a prod incident on the launch site is near-blind").
- **Concrete tools available this session:** **SigNoz MCP** (set `SIGNOZ_OTLP_ENDPOINT` — OTel-native,
  no Datadog custom-metric tax, ships LLM tracing for Anthropic calls [3]); **Amplitude MCP**
  (`mcp__plugin_marketing_amplitude` is connected) as the product-analytics destination if you
  prefer analyst-depth over PostHog's all-in-one [1].
- **Note on PostHog:** the codebase is wired for **PostHog** (the OSS-stack choice in memory), but
  **no PostHog MCP is connected** this session — only **Amplitude** is. Decision for the founder:
  keep PostHog (self-hostable, replay+flags+experiments in one, the wired choice) and add its key,
  **or** standardize on Amplitude (MCP present, analyst-grade funnels/retention). PostHog remains the
  better *all-in-one* fit for a solo builder [1]; Amplitude is the one you can drive from chat today.

**0.2 Wire the client error boundary to a sink + add `global-error.tsx` — `safe-now`.**
`app/error.tsx:20-23` only `console.error`s; the on-screen copy even *promises* a trace
(`error.tsx:43`) that nothing captures. Capture `$exception` to PostHog/Amplitude (or POST to a
thin `/api/client-error` route that server-logs so it lands in Vercel) and add the missing
`app/global-error.tsx` (`11-…observability.md` P1).

**0.3 Adopt a feature-flag / experiment primitive — `safe-now` (plumbing) / `founder-gated` (flips).**
2026 best-in-class ships flags + experiments as first-class [1]. Add the flag SDK (PostHog flags are
free-tier; Unkey is already in the OSS stack for keys, not flags). Use flags for **safe rollout +
instant kill-switch** of new surfaces — *not* to auto-flip money/legal/`MODEL_VERSION` switches,
which stay founder-gated by policy (`readiness.ts:100` `canApplyCalibrationAdjustments:false`).

> **Why Tier 0 first:** you cannot run an honest experiment, prove a funnel, or even *see* a launch-
> night incident on the clone you actually ship until this is wired. It is days of porting, all inert
> until keyed, and it unblocks every later tier's measurement.

### TIER 1 — Prove the engine in public: the accuracy/calibration analytics (mixed)

This is the layer that *is* the product's pitch ("Proven, not explained"). The trust scaffolding is
already A-grade; what's missing is **resolution** and **CLV** — the parts that prove *edge*, not just
honesty.

**1.1 Capture CLV / closing-line value — `safe-now` to build, `founder-gated` to publish.**
CLV is variance-free, converges far faster than win-rate/ROI, and consistent positive CLV is
mathematically +EV [4][7]. It **does not exist anywhere today** (only `OpeningLine`;
`10-…architecture.md` §1, `06-…trust.md` "What would move this to A" #2). Add a `ClosingLine` capture
per pick against a **pre-specified** sharp reference (Pinnacle-class, or the **Kalshi** liquid
sports close [8]) with a stale-quote/limit exclusion rule, and a rolling CLV-positive %. **Building
the capture is safe-now**; whether CLV is shown publicly vs internally is a founder positioning call.
- **Concrete source for the close:** **Kalshi** sports contracts are liquid (sports = >90% of Kalshi
  volume in 2025 [8]) and read-only — the canonical `kalshi-client.ts` already exists (inert). This
  is the cited, legal CLV reference the data-mesh stack already chose (per memory: Kalshi for CLV,
  read-only).

**1.2 Add resolution to the calibration surface — `safe-now` (evidence-only).**
Today calibration tracks reliability (honesty) but **not resolution/discrimination** — a model can
be well-calibrated yet barely separate winners from losers (`06-…trust.md` P2). Add the **Brier /
Murphy decomposition** (reliability − resolution + uncertainty) + log-loss so "calibrated" can never
hide "uninformative" [4]. Pure evidence math; moves no published number; no `MODEL_VERSION` change.

**1.3 Land the walk-forward / out-of-sample validation harness — `safe-now`.**
Zero walk-forward/holdout machinery exists; calibration reads the last 500 settled picks with no
train/test split (`06-…trust.md` P2, `report.ts:36-47`). Sports data leaks the future trivially;
the *first* realized win-rate published without this is optimistic. Build walk-forward CV +
frozen-season holdout + a CI assertion that fit-split ≠ report-split ≠ holdout **before** any rate
publish. It's an *evaluation* harness — safe/additive, moves no number.

**1.4 Public "checking our work" accuracy page — `founder-gated`.**
The most credible prediction shops publish a permanent, self-auditing accuracy record (FiveThirtyEight's
"Checking Our Work" was the gold standard before its 2025 shutdown [7]). The performance surface
already fails closed (`public-performance-policy.ts:61-71`) — the *additive* move is a calm public
reliability-curve + CLV-trend page that turns honesty into a marketing asset. Publishing the realized
rate is founder-gated (must clear the ≥25-sample + walk-forward bar first).

> **Compliance note:** none of 1.1–1.4 is an autonomous flip. CLV publication, realized-rate
> publication, and any calibration-map fit remain founder-gated exactly as the code already enforces.

### TIER 2 — Real BI: warehouse + reverse-ETL (mixed)

Today the only store is the operational Postgres (`packages/db`). An intelligence product that wants
to *learn from itself* needs an analytical store separate from the request path.

**2.1 Stand up a warehouse + dbt + a BI tool — `safe-now` (read-only mirror), `aspirational` (full stack).**
The 2026 default for a company your stage: **BigQuery** (simplest/cheapest through Series A) + **dbt**
+ **Metabase**, lightweight orchestrator [2]. Start with a **read-only nightly mirror** of settled
picks, signal snapshots, calibration buckets, and (once 1.1 lands) CLV — so backtests and cohort
analysis never touch the prod request path. This is the substrate doc 11's "learn from outcomes"
ambition needs.

**2.2 Reverse-ETL for activation — `aspirational` / `founder-gated`.**
Hightouch/Census push warehouse-modeled audiences back into operational tools [2]. Useful later for
lifecycle (e.g., "users who watched 3 Elite picks resolve correctly" → Klaviyo). **Klaviyo MCP is
connected** this session, so the destination side is ready; the warehouse + sync is the missing
middle. Defer until Tier 0–1 prove there's enough event volume to model. Any money-adjacent audience
stays founder/legal-gated.

**2.3 Marketing attribution + competitive intel — `safe-now` (the MCPs are connected).**
**Ahrefs, SimilarWeb, and Supermetrics MCPs are all connected** this session. These cover
acquisition/SEO/competitive-traffic analytics with zero build — wire them into the launch-readiness
and growth loop now (where vs. competitors, which content ranks). Supermetrics can also pull paid/
organic into the warehouse once 2.1 exists.

### TIER 3 — Sports-data depth: the part that makes it *elite* (founder-gated)

This is where "calibrated consensus tracker" becomes "engine with its own edge." Every wire-in here
is a deliberate `MODEL_VERSION` bump — **shadow-first, gate-second, weight-third**
(`process-sport.ts:70-96`, `10-…architecture.md` §2). The categories are already plumbed as inert
shadow evidence; the work is *activating* them with cited sources.

**3.1 Second odds provider + failover on the live spine — `founder-gated` (paid secondary), plumbing `safe-now`.**
DEPLOY ingests **one** source with **no failover**; a single Odds-API outage/quota/key-revocation
blacks out the board (`07-…resilience.md` P0-2; two keys already leaked/rotated 2026-06-03 per memory).
CANONICAL's `resolveOddsWithFailover` (`odds-failover.ts`) is built and tested but has **zero live
callers**. Port the plumbing into DEPLOY (safe-now) and wire a second independent aggregator
(odds-api.io per the stack decision) behind a flag (paid → founder-gated).

**3.2 Activate injuries + usage from nflverse — `founder-gated`.**
nflverse (nflfastR/nflreadr/nflreadpy) is the **free, legal** public unlock: EPA, success rate, win
probability, usage/snap-share, target share — all from public PBP [5]. The adapters exist in
CANONICAL but `nflverse-source.ts:16-18` states outright it "is not yet wired into the live pipeline,"
and it feeds **read-time feature pages, not the score** (`07-…resilience.md` P2-1). Promote
`PLAYER_AVAILABILITY` (injuries) + `Production`/`Efficiency` (EPA/usage) from shadow (`weight:0`) into
the GSE Rating as gated estimators — the first **independent, non-market** `fairProbability` input
that breaks the circular-edge problem (`scoring.ts:393-395`; `06-…trust.md` P1). This is *the*
keystone accuracy move.

**3.3 Next Gen Stats / tracking layer — `founder-gated` / partly `legal-gated`.**
NGS captures speed/accel/separation/pressure-to-sack/time-to-throw [5][6] — orthogonal signal the
line often hasn't fully priced (`10-…architecture.md` §3.1 category 4, "where genuine edge lives").
**Not present in the deploy clone at all.** Source carefully: NGS public site is display-only;
`source-registry.ts` already encodes per-source license verdicts and an `assertIngestible` guard that
*physically blocks* forbidden/paid sources — respect it. A licensed provider (SportsDataIO/API-Sports
carry injuries + depth charts + some advanced feeds [6]) is the clean path; verify ToS before any
wire-in (legal-gated where licensing is unclear).

**3.4 Multi-sport depth via a licensed provider — `founder-gated`.**
SportsDataIO covers 13 sports in-depth (+ a 2026 Global API across 100+ sports, breadth-over-depth);
API-Sports is the cost-effective multi-sport alternative with injuries/stats/transfers [6]. As the
product expands past NFL, a single licensed multi-sport feed (injuries + depth charts + advanced
stats) is the consolidation play vs. stitching free sources per league.

---

## 3. The "wire-first" sequence (the answer to *what first*)

1. **Tier 0.1–0.2 (days, safe-now):** Port observability + analytics + error sink to DEPLOY, keyed to
   **SigNoz** (traces/LLM) + **Amplitude or PostHog** (product). *Nothing else can be measured until
   this exists on the clone you ship.*
2. **Tier 0.3 (safe-now plumbing):** Add flags/experiments for safe rollout + kill-switch.
3. **Tier 1.1–1.3 (safe-now build):** **Capture CLV** (vs Kalshi close) + **add resolution** to
   calibration + **build the walk-forward harness**. This is the accuracy proof; CLV is the single
   biggest honesty *and* edge unlock and converges fastest [4][7].
4. **Tier 2.3 (safe-now, MCPs ready):** Wire **Ahrefs/SimilarWeb/Supermetrics** for acquisition +
   competitive intel — zero build, immediate growth signal.
5. **Tier 2.1 (safe-now mirror):** Stand up the **read-only warehouse mirror** so backtests/BI never
   touch prod.
6. **Tier 3.1 (plumbing safe-now / paid founder-gated):** Port **failover** + wire the second odds
   provider — removes the single-point-of-failure launch risk.
7. **Tier 3.2 (founder-gated `MODEL_VERSION`):** Activate **nflverse injuries + EPA/usage** as the
   first independent `fairProbability` input — the keystone that de-circularizes the edge.
8. **Tier 1.4 / 3.3 / 3.4 / 2.2 (founder/legal-gated, later):** Public accuracy page; NGS/tracking;
   multi-sport licensed feed; reverse-ETL activation.

---

## 4. Concretely-available integrations (this session) — mapped, with gates

| Need | Concrete tool (MCP this session) | Status / gate | Notes |
|---|---|---|---|
| Product analytics | **Amplitude** (`mcp__plugin_marketing_amplitude`) — connected | safe-now (needs key/auth) | Analyst-depth funnels/retention [1]. PostHog is the *wired* choice but has **no MCP this session** — founder picks. |
| Observability + LLM tracing | **SigNoz MCP** — connected | safe-now (set `SIGNOZ_OTLP_ENDPOINT`) | OTel-native, no Datadog custom-metric tax, LLM tracing for Anthropic calls [3]. |
| Error/exception sink | PostHog `$exception` **or** SigNoz error tracking | safe-now | Wire `error.tsx` (`11-…observability.md` P1). |
| Deploy/runtime telemetry | **Vercel MCP** — connected | safe-now | Runtime logs / deployment health already available. |
| Acquisition / SEO / competitive | **Ahrefs**, **SimilarWeb**, **Supermetrics** MCPs — connected | safe-now (needs auth) | Zero-build growth + competitive-traffic intel; Supermetrics also feeds the warehouse later. |
| Lifecycle / email activation | **Klaviyo MCP** — connected | safe-now (plumbing) / founder-gated (sends) | Reverse-ETL destination once warehouse exists (Tier 2.2). |
| Payments analytics | **Stripe MCP** — connected | founder-gated (live keys) | Revenue/retention cohorts; keep live keys founder-gated. |
| Ops / experiment tracking | **Linear / Asana / Slack** MCPs — connected | safe-now | Track the experiment backlog + flag rollouts. |
| Design instrumentation | **Figma MCP** — connected | safe-now | Not a data tool, but supports the accuracy-page build (Tier 1.4). |
| Warehouse + dbt + BI | BigQuery + dbt + Metabase [2] | aspirational (no MCP) | No warehouse MCP this session; this is a build, not a wire. |
| Reverse-ETL | Hightouch / Census [2] | aspirational / founder-gated | Defer to Tier 2.2. |
| CLV close reference | **Kalshi** (`kalshi-client.ts` exists, inert) | safe-now (read-only) | Liquid sports close, the cited CLV reference [8]. |
| Injuries/usage/EPA | **nflverse** (adapters exist, inert) [5] | founder-gated (`MODEL_VERSION`) | Free/legal; the keystone independent input (Tier 3.2). |
| Multi-sport / NGS / depth charts | SportsDataIO / API-Sports [6] | founder/legal-gated | Verify ToS via `source-registry.ts` `assertIngestible` before any wire. |

---

## 5. Honest "aspirational vs safe-now" ledger

- **Safe-now, days, zero new risk (port inert machinery + connect MCPs):** observability stack to
  DEPLOY (0.1), error sink + `global-error.tsx` (0.2), flag *plumbing* (0.3), CLV *capture* build
  (1.1), calibration resolution (1.2), walk-forward harness (1.3), Ahrefs/SimilarWeb/Supermetrics
  intel (2.3), read-only warehouse mirror (2.1), failover *plumbing* (3.1).
- **Founder-gated (touches the recipe, a paid key, or a public claim):** publishing CLV / realized
  win-rate / accuracy page (1.1, 1.4), second *paid* odds provider (3.1), **activating nflverse
  injuries+EPA into the Rating** (3.2 — a deliberate `MODEL_VERSION` bump), multi-sport licensed feed
  (3.4), reverse-ETL money-adjacent audiences (2.2), live Stripe keys.
- **Legal-gated:** any NGS/tracking or feed whose ToS forbids ingestion/commercial use — gate behind
  `source-registry.ts` `assertIngestible`; never wire a forbidden/paid source (the registry already
  blocks ESPN hidden API, PFR scraping, DK unofficial — keep that posture).
- **Aspirational (real build, no MCP shortcut, later stage):** full warehouse + dbt + Metabase stack
  (2.1 beyond the mirror), reverse-ETL platform (2.2), NGS tracking layer (3.3).

---

## 6. Sources (web-verified 2026 benchmarks)

1. PostHog vs Amplitude (2026) — all-in-one analytics+flags+replay+experiments vs analyst-depth:
   https://posthog.com/blog/posthog-vs-amplitude • https://www.crazyegg.com/blog/amplitude-vs-posthog/ •
   https://amplitude.com/compare/best-feature-flag-tools-for-startups
2. Modern data stack 2026 (5 layers; BigQuery/dbt/Metabase default; Hightouch/Census reverse-ETL):
   https://valiotti.com/modern-data-stack-2026/ • https://valiotti.com/data-stack-for-startups-complete-guide/ •
   https://improvado.io/blog/best-reverse-etl-tools
3. SigNoz vs Datadog 2026 (OTel-native, no custom-metric tax, LLM observability for Anthropic):
   https://signoz.io/blog/datadog-alternatives/ • https://signoz.io/blog/opentelemetry-vs-datadog/ •
   https://github.com/SigNoz/signoz
4. CLV + Brier/calibration for betting-model evaluation (CLV variance-free, converges fast; resolution≠calibration):
   https://www.sports-ai.dev/blog/closing-line-value-and-ai-model-performance •
   https://www.sports-ai.dev/blog/ai-model-calibration-brier-score
5. nflverse / NGS public sports data (EPA/PBP/usage; nflfastR/nflreadr/nflreadpy):
   https://github.com/nflverse • https://nflfastr.com/articles/nflfastR.html • https://nextgenstats.nfl.com/
6. Sports-data providers (SportsDataIO 13 sports + 2026 Global API; API-Sports cost-effective multi-sport; injuries/depth charts):
   https://sportsdata.io/developers/coverage-guide/player-feeds/depth-charts-lineups-injuries •
   https://www.lsports.eu/blog/sportradar-vs-sportsdataio/ • https://datarade.ai/top-lists/best-sports-apis
7. Public accuracy transparency (FiveThirtyEight "Checking Our Work" gold standard; shut down 2025):
   https://projects.fivethirtyeight.com/checking-our-work/ • https://en.wikipedia.org/wiki/FiveThirtyEight
8. Kalshi sports prediction markets (liquid sports close; >90% of 2025 volume; read-only API):
   https://en.wikipedia.org/wiki/Kalshi • https://www.si.com/prediction-markets/reviews/kalshi

> Internal grounding (file:line + audit/data-mesh docs) is cited inline throughout. Doc-only output;
> no source, test, config, schema, env, or package file in either clone was modified.
</content>
</invoke>
