# Vercel Maximum-Leverage Findings (2026-09-28)

Research date: 2026-09-28. Sources: official Vercel docs (vercel.com/docs, vercel.com/pricing — page `last_updated` dates noted) plus third-party where flagged. All prices USD, excl. tax. Nothing below is marked dead/useless without evidence — untested items are **queued for evaluation**.

Context: Garrett runs the GSE Next.js app on Vercel **Pro** ("a fat penny" between Neon + Vercel). Production went dark after 50+ failed deploys. LLM spend currently routes through OpenRouter + NVIDIA NIM. Site must show only projections/rankings publicly.

---

## Ranked top 10 (impact × ease)

| # | Finding | Est. value | Difficulty | Reversible |
|---|---------|-----------|------------|------------|
| 1 | Set Spend Management budget + alerts (default $200 on-demand is too high) | Prevents surprise bills | Config (dashboard) | Yes |
| 2 | ISR/static-ify public projections & rankings pages | Cuts function invocations + compute — the biggest runtime lever | Code change | Yes |
| 3 | AI Gateway for the agent fleet's LLM spend (0% markup, per-key budgets, fallbacks) | Consolidates OpenRouter+NIM routing; kills OpenRouter's 5.5% deposit fee | Config + code | Yes |
| 4 | Audit function memory + duration (Fluid bills memory for instance lifetime, even during I/O) | Direct compute savings | Code/config | Yes |
| 5 | Check function region — iad1/cle1/pdx1 are ~38% cheaper than sfo1 | Up to ~38% off compute | Config | Yes |
| 6 | Stop the build-minute bleed: ignoreCommand for docs-only, limit preview builds | 50+ failed deploys burned real money | Config | Yes |
| 7 | Cron endpoints: add CRON_SECRET auth (public cron = anyone can burn your compute) | Security + cost | Code change | Yes |
| 8 | Instant rollback runbook for the next bad deploy (`vercel promote`) | Recovery in seconds, no rebuild | Founder tap (none — already included) | N/A |
| 9 | Enable Standard Protection + firewall AI-bot ruleset (scraper protection for a picks site) | Protects content + cuts bot-driven usage | Config | Yes |
| 10 | Evaluate Flat Rate CDN if traffic spikes | Predictable bill, no overages | Founder tap (pricing) | Yes |

---

## 1. PRO PLAN BILLING MODEL

Official: https://vercel.com/docs/pricing (`last_updated` 2026-09-14), https://vercel.com/docs/plans/pro-plan (`last_updated` 2026-09-15), https://vercel.com/pricing.

**Base:** $20/mo platform fee = 1 deploying team seat + **$20 usage credit** (expires monthly, no rollover). Additional Owner/Member seats $20/mo each; Viewer seats free unlimited. Pro is required for commercial use (Hobby is non-commercial only).

**What bills on Pro (on-demand after the $20 credit):**

| Resource | On-demand price | Notes |
|---|---|---|
| Fast Data Transfer (bandwidth) | Regional (~$0.15/GB US per third-party check of vercel.com/pricing 2026-07-04) | Pro covered by Flat Rate CDN tier: 1M CDN requests + 1 TB transfer/mo included |
| Edge Requests | Regional | Same Flat Rate CDN coverage |
| Function Invocations | $0.60 / 1M | Counts every request incl. failures |
| Active CPU (Fluid) | Regional per CPU-hr — **iad1/cle1/pdx1: $0.128**; sfo1: $0.177; gru1: $0.221 | Billed per ms of *actual code execution*; pauses during I/O (DB queries, AI calls) |
| Provisioned Memory (Fluid) | Regional per GB-hr — **iad1/cle1/pdx1: $0.0106**; sfo1: $0.0147 | Billed for *entire instance lifetime*, **including I/O waits** |
| Edge Middleware invocations | 1M included/mo, then $0.65/1M (third-party) | Runs on every request |
| Image transformations | $0.05–$0.0812 / 1K | 5,000/mo included (Hobby-tier figure shown on pricing page) |
| Image cache reads / writes | $0.40–$0.64 / 1M reads; **$4.00–$6.40 / 1M writes** | Cache writes are the expensive one |
| Builds | $0.0035 / CPU-min; Basic machines $0.007/build-min; rounded up per minute × CPUs | Enhanced 8-CPU machine: ~$0.084 for a 2m34s build |
| Web Analytics events | **Pro: no included events; $0.03 / 1K events** | Official docs/pricing table — potential surprise line item |
| Speed Insights events | 10K free, then $0.65 / 10K | |
| Log Drains volume | $0.50 / GB | Runtime logs: 1 hr retention included |
| Observability Plus | $1.20 / 1M events | Replaces old $10/mo Monitoring |
| Global Config | Reads $3.00 / 1M (?), writes $5.00 | Per official table |
| ISR reads / writes | 1M reads, 200K writes / mo included (pricing-page figure) | |

Source: https://vercel.com/docs/pricing, https://vercel.com/docs/functions/usage-and-pricing (`last_updated` 2026-06-16).

**Spend Management (official):** new teams default to a **$200/billing-cycle on-demand budget** with email/web/SMS notifications; 75%-of-credit auto-alerts; daily/weekly summary emails once past credit. You can set custom thresholds with alerts **and an optional automatic pause of all projects at 100%** (hard limit). Also: recursion protection, hard spend limits, Attack Challenge Mode. Source: https://vercel.com/pricing (FAQ), https://vercel.com/docs/plans/pro-plan.

**Flat Rate CDN:** fixed monthly price alternative to usage-based CDN billing — covers traffic spikes, **no overages**. Worth pricing if the X audience ever spikes traffic. Source: https://vercel.com/pricing, https://vercel.com/docs/pricing/flat-rate-cdn.

---

## 2. AI GATEWAY — THE BIG ONE

Official docs: https://vercel.com/docs/ai-gateway (`last_updated` 2026-09-14), pricing https://vercel.com/docs/ai-gateway/pricing (`last_updated` 2026-09-08), discounts https://vercel.com/docs/ai-gateway/pricing/discounts, budgets https://vercel.com/docs/ai-gateway/observability-and-spend/budgets.

### What it is
One OpenAI-compatible endpoint (`https://ai-gateway.vercel.sh/v1/...`) for **360+ models** across Anthropic, OpenAI, Google, xAI, Meta, Mistral, DeepSeek, Cohere and others — callable from *any* infrastructure, not just Vercel. Modalities: text, image, video, speech, transcription, realtime, embeddings, reranking. Works via AI SDK, OpenAI Chat Completions, Anthropic Messages, cURL, and "supported coding agents" routable via Vercel CLI.

### Pricing model
- **Zero markup, no platform fee on tokens — pay provider list price**, pay-as-you-go from prefunded AI Gateway Credits. (https://vercel.com/docs/ai-gateway/pricing)
- **Some models priced BELOW provider list automatically** — browse https://vercel.com/ai-gateway/models?discount=true. Volume commitments get custom discounts + invoice billing (no processing fees). (https://vercel.com/docs/ai-gateway/pricing/discounts)
- Free tier: monthly credit (third-party verified $5/mo with payment method on file, 2026-09-24) + 3 zero-priced models; **buying credits permanently ends the free monthly credit**.
- **BYOK: no markup or fee**, paid tier only; failed BYOK requests fall back to Vercel system credentials (charged to your credits — so keep a credit balance even with BYOK).
- Add-on surcharges (all deducted from credits): Custom Reporting ($0.075/1K writes, $5/1K queries), team-wide provider allowlist ($0.10/1K reqs; per-request `only` filter is free), team-wide ZDR ($0.10/1K reqs; per-request ZDR free), Trace Drains ($0.05/1K traces + $0.50/GB egress — billed as Drains usage, not credits).
- **You pay payment processing fees** (non-invoice). Enterprise invoice has none.

### Budgets / fallbacks / monitoring (the operational edge)
- **Budgets at 4 scopes: team, project, API key, user** — they stack (a request must pass *every* budget in scope). Soft caps: the request that crosses the limit still completes, then 402s (`quota_for_entity_exceeded`). Default budgets per scope (each key/user gets its own allowance). Spend alerts at 50/75/100%. Manageable via dashboard or `vercel ai-gateway budgets` CLI. (https://vercel.com/docs/ai-gateway/observability-and-spend/budgets)
- **Provider failover**: ordered provider + model fallbacks per request; per-request cost/latency/routing-attempt logging in the dashboard; quotas endpoint for live spend per key.
- **Auth**: on Vercel deployments, `VERCEL_OIDC_TOKEN` — no secret to rotate or leak. Off-Vercel, API keys with per-key budgets.

### vs OpenRouter vs NVIDIA NIM for the agent fleet

| | Vercel AI Gateway | OpenRouter | NVIDIA NIM |
|---|---|---|---|
| Inference markup | **0%** (provider list) | 0% on inference | Free tier / paid per-token |
| Funding friction | Prefunded credits; processing fees | **5.5% Stripe deposit fee** ($0.80 min), 5% crypto (third-party research) | Free tier flaky (retries needed) |
| BYOK fee | **$0** | 5% after first 1M reqs/mo (third-party) | N/A |
| Per-key/env budgets | Yes (4 scopes, CLI-managed) | No native equivalent | No |
| Fallbacks | Built-in ordered provider+model | Provider routing, less control | No |
| Usage monitoring | Per-request dashboard, no instrumentation | Basic | Minimal |
| Below-list deals | Some models discounted automatically | No | Free tier = the deal |
| Data training | **Off by default? No — assume training unless you set disallow-prompt-training / ZDR** | Varies by provider | Varies |

Sources: official docs above; OpenRouter fee figures from third-party research (https://github.com/kamil1721/coding-agent/blob/HEAD/docs/research/01-model-billing-and-architecture.md); NIM flakiness from Garrett's own TASK-012 experience.

**Could it consolidate his routing?** Yes, technically — one endpoint, zero markup, per-environment budgets, OIDC on Vercel, coding-agent support. The fleet's OpenRouter+NIM spend could move behind per-key budgets with automatic fallbacks, and the 5.5% OpenRouter deposit fee disappears.

**Catches (evidence-backed):**
1. **Training-data default**: "By default, AI Gateway does not route based on the training data policy of providers. If we do not know a provider's training data stance... we assume that they train on your data." Must set disallow-prompt-training or ZDR (per-request ZDR is free). Source: https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training (via third-party citation).
2. **Free credit forfeited permanently on first top-up** — test on free tier first, top up once committed.
3. **Credits must be prefunded** — a 402 (`insufficient_funds`) kills requests; enable auto top-up.
4. **Vendor lock-in to Vercel billing** — spend now lives on the Vercel invoice next to the hosting bill he's already watching.
5. **Provider list price, not negotiated** — unless volume justifies a custom discount. His fleet spend may qualify eventually; not day one.
6. **Soft-cap budgets can overshoot slightly** — the crossing request completes.

**Verdict:** queued for evaluation as the fleet's primary router, with OpenRouter/NIM kept as fallback. Difficulty: config + small code change (swap base URLs / add AI SDK). Reversible: yes. Recommended first step: route one low-risk agent lane (not prod picks) through a budget-capped key and compare a month of spend vs OpenRouter.

---

## 3. COST LEVERS

### Fluid compute vs classic (official: https://vercel.com/docs/functions/usage-and-pricing)
The old GB-hour model is gone; Fluid splits billing into **Active CPU** (only while code runs — pauses during I/O) + **Provisioned Memory** (entire instance lifetime, *including* I/O waits) + invocations. Consequences for GSE:
- The signals-writer cron and pick pipelines are **I/O-heavy** (Neon queries, API calls) → CPU billing pauses, but **memory keeps billing the whole time**. Long-running functions with default/high memory are the #1 compute waste shape.
- Levers: lower function memory, shorten execution (the 504/deadline fixes already help), raise concurrency so one instance serves more requests.
- **Region pricing varies ~73%**: iad1/cle1/pdx1 ($0.128 CPU-hr / $0.0106 GB-hr) vs sfo1 ($0.177/$0.0147) vs gru1 ($0.221/$0.0183). **Check which region the functions run in** — moving US workloads to iad1 (also closest to Neon if the DB is US-East) cuts compute ~28-38%. Difficulty: config. Reversible: yes.

### Cron frequency costs (official: https://vercel.com/docs/cron-jobs/usage-and-pricing)
- Pro: **100 cron jobs per project** (up from 40 — changelog 2026), **minimum interval 1 minute**, per-minute precision. Cron itself is free; **each execution bills as a function invocation + compute**.
- A every-5-minutes signals writer = ~8,640 invocations/mo — negligible against 1M. The cost is compute per run, not the schedule. Don't slow the cron to save money; shorten the function instead.
- **Security/cost hole: cron endpoints are publicly invokable** — without a `CRON_SECRET` check anyone can trigger the function and burn compute. Add the check (code change, reversible). Source: third-party audit pattern; Vercel documents CRON_SECRET.

### ISR to cut function invocations (official: https://vercel.com/pricing FAQ)
"If the function response is cached, it will not run and incur a Function invocation or any GB/hrs of duration." The public site shows **only projections and rankings** — near-ideal ISR content: mostly static between slates, revalidate on a schedule or on data refresh. Every cached page view = zero function cost (only an edge request). ISR: 1M reads / 200K writes per mo included per pricing page. Difficulty: code change. Reversible: yes. **This is the single biggest runtime-cost lever for a content site.**

### Image optimization
5,000 transformations/mo included; overage $0.05–$0.0812/1K transforms, cache writes $4.00–$6.40/1M (the expensive meter). Use `next/image` with long cache TTLs; avoid per-request unique transforms. Source: https://vercel.com/docs/pricing.

### Caching / CDN config
Vercel auto-adds ETags and compresses responses (cuts Fast Data Transfer). `stale-while-revalidate` and background revalidation keep pages fast without function runs. Review `Cache-Control` headers on API routes — anything cacheable that isn't cached is pure waste. Difficulty: config. Reversible: yes.

### Build minutes
$0.0035/CPU-min; a 2m34s build on an 8-CPU Enhanced machine ≈ $0.084. **50+ failed deploys = real money burned.** Levers: `ignoreCommand` in vercel.json to skip docs-only commits; disable preview deployments for agent branches that don't need them; fix the red build (biggest lever of all). Difficulty: config. Reversible: yes.

---

## 4. UNDERUSED PRO FEATURES

- **Instant Rollback** (included on all plans): "Promote to Production" on any past deployment — instant alias swap, **no rebuild**. After 50+ failed deploys this is the recovery runbook: dashboard → Deployments → ⋯ → Promote, or `vercel promote <url>` / `vercel rollback`. Caveat: rollback uses *current* env vars, not the deploy-time ones; does not reverse DB migrations. Sources: https://vercel.com/pricing, third-party runbooks.
- **Rolling Releases** (Pro + Enterprise): send a new deployment to a percentage of traffic first, then promote or roll back. Directly addresses the "50 failed deploys → production dark" pattern. Queued for evaluation — needs a traffic-splitting strategy for a picks site.
- **Deployment Protection**: Vercel Authentication included on all plans; **Standard Protection** (everything except production domains) is the Pro default. Protection Bypass for Automation supports **multiple secrets per project** (`x-vercel-protection-bypass`, `VERCEL_AUTOMATION_BYPASS_SECRET`) — useful for the agent fleet's preview testing. Password Protection: official Pro add-on price **$20/mo per project** (https://vercel.com/docs/plans/pro-plan) — note: a third-party post claims $150/mo "Advanced Deployment Protection" bundle with 30-day minimum; verify in dashboard before buying.
- **WAF / Bot Management / BotID**: DDoS mitigation always-on; custom firewall rules (ordered, log/deny/challenge/bypass/redirect/rate-limit; publish instantly, no deploy); managed rulesets **including AI-bot blocking**; Attack Challenge Mode via `vercel firewall attack-mode enable`; **BotID basic checks included**. For a public picks site getting scraped, the AI-bot ruleset + rate limits cut both content theft and bot-driven function/bandwidth usage. Sources: https://vercel.com/pricing, third-party skill docs.
- **Observability**: usage dashboard included; runtime logs 1hr; tracing spans 1M/mo (beta). Observability Plus $1.20/1M events (usage-based, no base fee) — cheap enough to keep for a money-critical pipeline. Web Analytics Plus $10/mo, Speed Insights Plus $10/mo/project.
- **Cron Jobs**: 100/project, per-minute — already used for the signals writer; headroom for odds refresh, injury-news intake, calibration jobs.
- **Vercel Sandbox**: isolated ephemeral microVMs for untrusted/agent-generated code — 5 CPU-hrs, 420 GB-hrs, 5K creations, 20GB transfer, 10 concurrent included (pricing-page figures). Direct fit for executing agent-generated backtest code safely. Queued for evaluation. Source: https://vercel.com/pricing.
- **Vercel Workflows**: durable, observable workflows — 50K events/mo included; Queues 1M API ops/mo (beta). Candidate replacement for fragile cron chains (signals pipeline with retries). Queued for evaluation. Source: https://vercel.com/pricing.
- **MCP Servers**: deploy MCP servers so agents can call GSE APIs/systems as tools — the HF round-2 "Spaces as MCP tools" idea has a Vercel-native equivalent. Queued for evaluation.
- **eve**: open-source, filesystem-first agent framework; deploys with Workflow + Sandbox + Cron + project credentials. Potential long-term home for the agent fleet's scheduled work. Queued for evaluation (not a migration recommendation today).
- **Free first-year domain** (.app/.dev/.online/.site/.space/.store/.tech/.website) per Pro team — claim if galaxysportsedge needs a clean domain. Source: https://vercel.com/docs/plans/pro-plan.

---

## 5. WASTE PATTERNS TO AUDIT

1. **API routes serving cacheable content** — projections/rankings/data endpoints without ISR or Cache-Control. Every uncached hit = invocation + compute. (Fix: ISR; biggest lever.)
2. **Crons running hot or long** — check actual per-run duration × memory in the usage dashboard; memory bills through I/O waits. The signals writer's deadline fixes were reliability work; now size its memory down.
3. **Preview deployments piling up** — every agent branch push = full build + preview function usage. Use `ignoreCommand` for docs-only commits; consider disabling auto-preview for selected branches.
4. **The 50+ failed deploys** — each burned build minutes. Fix forward once, then protect with Rolling Releases or at least the instant-rollback runbook.
5. **Middleware on every request** — audit `middleware.ts` matchers; narrow to needed paths (edge middleware invocations meter separately).
6. **Unoptimized images** — raw `<img>` or unique per-request transforms burn the transformation + cache-write meters.
7. **Web Analytics events on Pro** — official docs show **no included events** on Pro ($0.03/1K). If analytics is on, check the invoice line; the $10/mo Plus may or may not beat usage pricing.
8. **Deploying seats** — each Owner/Member seat is $20/mo. Audit who has a paid seat vs who could be a free Viewer.
9. **Public cron endpoints** — no CRON_SECRET = anyone can invoke = unbounded compute. Fix in code.
10. **Wrong region** — functions in sfo1 vs iad1 = ~38% compute premium for no reason. Check project region settings.

---

## Suggested action order (founder taps marked)

1. **Dashboard, 10 min (founder or whoever holds Owner):** set Spend Management on-demand budget to a sane number (e.g. $40–$60) with 50/75/100% alerts; do NOT enable auto-pause-production until billing is understood. Verify Password Protection pricing ($20/project vs $150 bundle claim) only if needed.
2. **Code:** add CRON_SECRET checks to all cron routes.
3. **Code:** ISR/cache the public projections + rankings pages and data API routes.
4. **Config:** check function region → move to iad1 if elsewhere; set function memory to the lowest that passes.
5. **Config:** vercel.json `ignoreCommand` for docs-only commits; review preview-deploy settings per branch.
6. **Write the rollback runbook** (one page: `vercel rollback`, promote-to-production, env-var caveat) and pin it for the fleet.
7. **Config:** enable Standard Protection (default — verify), add firewall AI-bot ruleset in log mode → enforce after 10 min observation.
8. **Evaluate:** AI Gateway pilot — one budget-capped key, one agent lane, one month, compare vs OpenRouter.
9. **Evaluate:** Flat Rate CDN pricing if traffic grows; Sandbox for agent code execution; Workflows for the signals pipeline.
