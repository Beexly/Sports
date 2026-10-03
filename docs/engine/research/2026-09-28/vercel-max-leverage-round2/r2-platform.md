# Vercel Platform Features — Round 2 Deep Research
**Date:** 2026-09-28 | **Context:** Vercel Pro, Next.js App Router, region iad1, 23 cron jobs (hottest every 15 min), agent fleet pushing constantly, 50+ recent failed deploys, site gets scraped.

All claims cite URLs. Where docs were unreachable (fetch service 429'd on some pages), numbers come from recent third-party mirrors/dashboards and are labeled as such. Nothing marked "dead" — unverified items are "queued for evaluation."

---

## 1. WORKFLOWS vs CRON CHAINS

### What it is
Vercel Workflows = durable execution (Workflow SDK / `workflow` npm package) with event-log + deterministic replay. Steps are ordinary functions; the run has **no maximum duration** and `sleep()` has no duration cap. Workflows orchestrate via Vercel Queues under the hood.
Sources: https://vercel.com/docs/workflows/pricing · https://github.com/vercel/vercel-plugin/blob/HEAD/skills/vercel-functions/SKILL.md

### Pricing (verified, docs updated 2026-09-16)
| Resource | Hobby included | On-demand (Pro bills this, offset by $20/mo credit) |
|---|---|---|
| Workflow Events | 50,000 events/mo | **$0.02 per 1K events** ($20/1M) |
| Workflow Data Written | 1 GB | $0.50/GB |
| Workflow Data Retained | — | $0.50/GB-month |
| Retention after run completion | 1 day | **7 days (Pro)** / 30 days (Enterprise) |

Source: https://vercel.com/docs/workflows/pricing

Key mechanics:
- **One normal step = 3 events** (`step_created`, `step_started`, `step_completed`); each retry adds a `step_retrying` event. So a 4-step pipeline ≈ 12–16 events per run. (https://vercel.com/docs/workflows/pricing)
- Functions invoked by workflows bill at existing **Fluid compute rates** — same as crons do. Queues usage billed separately at standard Queues rates (https://vercel.com/docs/queues/pricing).
- Hard limits per run: 25,000 events, **10,000 steps**, 50 MB payload, 2 GB total state, **no run-duration limit, no sleep-duration limit**, 240 s max replay duration. Rate limits: **Pro 500,000 requests/min**. Concurrency up to 100,000. Schedules/crons: no limit. (https://vercel.com/docs/workflows/pricing)

### Cost math for his signals chain (write → slate → settle → alerts)
Assume one chain run per 15-min tick = 96 runs/day = ~2,880 runs/mo:
- 2,880 runs × ~14 events ≈ **40,300 events/mo → ~$0.81/mo** at $0.02/1K.
- Compute cost is identical to today's cron functions (Fluid rates). Data written/retained is negligible for small JSON step state.
- **Verdict: cost-neutral vs crons. The win is reliability, not price.**

### Durability wins over chained crons
1. **Retries**: steps auto-retry transient errors (visible as `step_retrying` events). Cron jobs have **no retries at all** — a failed tick is just gone.
2. **No missed/duplicated ticks**: Vercel cron delivery is *best-effort* — occasional misses and occasional duplicates, no serialization (you need your own distributed lock), UTC-only, and instant rollback does NOT update active crons. Sources: https://github.com/iamtrevormay/baseball-savant-web/blob/HEAD/Jo/data-reliability/11-serverless-cron-reliability.md · https://github.com/lurodrisilva/personal-skills/blob/HEAD/platform-engineering/vercel/SKILL.md
3. **Long pipelines**: total run duration uncapped; individual steps still bound by function limits. A 4-stage signals pipeline can run minutes-to-hours as one run instead of 4 separately-scheduled crons that must time-join correctly.
4. **`sleep()` without cap**: can poll for external data (e.g., wait for game finalization) inside one run instead of chaining cron ticks.
5. **Observability**: per-run event log and step-level visibility in the dashboard's Workflows page.

### "Exactly-once"?
Not claimed. Queues provide at-least-once with idempotency keys (idempotent sends billed 2x units — https://vercel.com/docs/queues/pricing). Design steps idempotent regardless — same as cron today.

### Conceptual migration
```
Today:  cron(write) ──timing-join──▶ cron(slate) ──▶ cron(settle) ──▶ cron(alerts)
Each: best-effort delivery, no retry, must re-check upstream completion.

Target: ONE cron (or scheduled workflow start) every 15 min
        └─▶ workflow "signals-chain"
              step 1: write       (retry 3, idempotent upsert)
              step 2: slate       (reads step-1 output)
              step 3: settle
              step 4: alerts      (only if settle produced new edges)
```
- Keep **one** cron as the trigger (Pro: 100 crons/project allowed — https://github.com/iamtrevormay/baseball-savant-web/blob/HEAD/Jo/data-reliability/11-serverless-cron-reliability.md). Delete the other 3–4 chained crons; the workflow replaces the timing joins.
- Each step keeps its current code (Fluid function, same memory/maxDuration guidance as §6).
- Feasibility: medium. Requires the Workflow SDK in the app and a refactor of 3–4 cron routes into steps. Test on preview, migrate one chain first.

### When cheaper/better vs worse
- **Better**: any multi-stage pipeline where a missed middle step corrupts downstream data (his signals chain exactly); anything needing sleeps/polling; anything where a cron miss currently means silent staleness.
- **Cheaper**: never meaningfully cheaper than crons for the same compute; events add ~$1/mo. Cheaper than *defensive over-engineering* (external orchestrators, Upstash QStash, Inngest bills).
- **Worse**: single trivial fire-and-forget crons (keep those as crons); ultra-high-frequency sub-minute work (workflow runs have more moving parts); if the steps aren't idempotent yet — fix that first either way.

**Round-1 correction opportunity:** if round 1 priced Workflows at anything above ~$1/mo for this workload, it was wrong.

---

## 2. SANDBOX for agent-generated code

### Verified pricing and quotas (official docs, updated 2026-09-10)
https://vercel.com/docs/vercel-sandbox/pricing/

| Dimension | Pro rate (iad1) |
|---|---|
| Active CPU (excludes I/O waits) | **$0.128/hour** |
| Provisioned Memory | **$0.0212/GB-hour** (1-min minimum increments) |
| Sandbox Creations | **$0.60/1M** |
| Concurrent Sandboxes | **10,000** (quota) |
| Max session duration | **24 hours** |
| Max resources | 8 vCPU / 16 GB / 64 GB ephemeral NVMe / 15 open ports |
| Network | **Outbound allowed.** Data *downloaded* (npm packages, repos, datasets) is **free**; uploads/traffic to exposed ports billable — **on Pro, sandbox data transfer is included in the flat-rate CDN** (no per-GB charge) |
| Filesystem persistence | **Ephemeral by default.** Persistence via snapshots ($0.08/GB-mo) or drives ($0.05/GB-mo storage; $0.0015/GB reads, $0.004/GB writes) — drives in public beta |

**⚠️ IMPORTANT CORRECTION to the task's assumptions:** the numbers in the brief — 5 CPU-hrs, 420 GB-hrs, 5,000 creations, 10 concurrent — are the **Hobby** included quotas, NOT Pro. On **Pro there is no included allowance at all**: all usage bills on-demand against the $20/mo credit. (Same source, "Pro plans are charged based on usage. All Sandbox usage on Pro plans is charged against your $20/month credit.")

### Official cost examples (10% CPU utilization assumed)
- 5-min, 2 vCPU / 4 GB "AI code validation": **$0.0092**
- 30-min, 4 vCPU / 8 GB "build and test": **$0.1104**
- 2-hr, 8 vCPU / 16 GB "long-running task": **$0.8832**
(https://vercel.com/docs/vercel-sandbox/pricing/)

### Fit: fleet backtest/calibration code execution
- **Isolation**: Firecracker microVMs — right shape for untrusted agent-generated code (backtest scripts the fleet writes). (https://github.com/data-advantage/vibereference/blob/HEAD/content/ai-development/code-execution-sandbox-providers.md)
- **Runtimes**: Node 22/24, Python 3.13 — covers his backtest/calibration code.
- **Region**: available in 19 regions including **iad1** — same region as the app/DB, minimizing latency to Neon.
- **Math**: 100 backtests/mo × $0.11 (30-min, 4 vCPU) ≈ **$11/mo** — fits inside the $20 Pro credit. 10,000 concurrent sandboxes means the whole fleet can run parallel backtests.
- **Database access**: network egress is allowed, so a sandbox can hit Neon Postgres directly (use a read-only role + branch connection string).

### Catches
1. **Cold starts**: third-party benchmarks report sub-second provisioning (not official docs — queued for evaluation to measure). Not zero, but fine for minutes-long backtests.
2. **Max timeout**: default **5 minutes** per session, extendable via `timeout`/`sandbox.extendTimeout()` up to **24 h on Pro**. Set explicitly — don't rely on defaults.
3. **Filesystem is ephemeral**: 64 GB NVMe per sandbox, wiped on stop unless you snapshot or use drives. Backtest outputs must be pushed to Blob/Neon before the sandbox dies, or use **persistent sandboxes** (named, auto-snapshot on stop, resume by name — beta). (https://github.com/getsentry/junior/blob/HEAD/.agents/skills/vercel-sandbox/SOURCES.md)
4. **Idle memory billing**: provisioned memory bills in 1-minute minimums for the whole session even when the CPU is idle (LLM-call waits don't count as Active CPU but memory keeps ticking). Right-size and `sandbox.stop()` promptly.
5. **Cost control**: enable Spend Management alerts/pauses; there is no hard included cap on Pro — runaway fleet loops would bill. (https://vercel.com/docs/vercel-sandbox/pricing/)

---

## 3. LOG DRAINS + OBSERVABILITY — cheapest credible posture

### Verified: what's free vs what bills

**Free on all plans (Observability):**
- Runtime logs: **Pro = 1-day retention** (Hobby 1 hr, Enterprise 3 days) — https://vercel.com/docs/observability/observability-plus
- Usage dashboard with per-resource meters (Functions, Edge Requests, Fast Data Transfer, Builds, ISR, External APIs, Queues, AI Gateway) — https://vercel.com/docs/observability
- `vercel logs` / `vercel metrics` CLI workflows for 500-error debugging — https://vercel.com/docs/observability
- Web Analytics **basic is included** on all plans — https://github.com/fbmoulin/claude-skills/blob/HEAD/skills/platforms/skills/VercelExpert/References/Pricing.md

**Billed:**
- **Observability Plus**: **$1.20 per 1M events** (https://vercel.com/docs/observability/observability-plus). The old $10/mo base fee was **removed** — now pure usage-based (https://www.techbriefai.com/posts/vercel-removes-base-fee-for-observability-plus-moves-to-usage-only-pricing). Gets: 30-day retention (14-day max selection window), path-level data, full query access, anomaly alerts (GA — https://vercel.com/docs/observability/observability-plus). **Enabled by default** for teams created/upgraded to Paid Pro on/after **April 3, 2026**; older teams must toggle it in Billing settings.
- **Log drains**: **$0.50/GB** (third-party compiled from pricing page, ~71 days old — https://github.com/yuanbop/frugal/blob/HEAD/research/vercel.md). 
- **Monitoring events** (dashboards/alerts): $1.20/1M events; 250,000 included/mo (limits-page mirror, 204 days old — re-verify before budgeting: https://github.com/supersterling/primus/blob/HEAD/docs/references/vercel/limits.md).

**Queued for evaluation (unverified):** "1M tracing spans beta" — Vercel's `@vercel/otel` tracing exists but I could not confirm a 1M included-spans figure in reachable docs. Do not budget on it.

### Recommended posture (money-critical signals pipeline, minimum spend)
| Layer | Decision | Why |
|---|---|---|
| Free Observability + 1-day runtime logs | **Keep** | Covers "why did the 3 AM cron fail" for the last 24 h — $0 |
| `vercel logs --environment production` CLI + dashboard | **Keep** | Structured debugging path, $0 (https://vercel.com/docs/observability) |
| Observability Plus on the **production project only** | **Enable selectively** | At ~$1.20/1M events it's pennies for cron-scale traffic; buys 30-day retention + anomaly alerts (error spikes on the signals chain). Use **Manage projects → exclude** preview/agent projects so fleet noise doesn't meter (https://vercel.com/docs/observability/observability-plus) |
| Log drains ($0.50/GB) | **Skip for now** | Only buy if he needs >30-day retention or SIEM ingestion. 1 GB of logs = $0.50 — cheap per-GB but uncapped; a scrape storm could balloon it |
| Monitoring dashboards/alerts | **Skip initially** | Free usage dashboard + Plus anomaly alerts cover the need; 250K included events is a tripwire, not a plan |
| Spend Management alerts at 50/75/100% | **Enable** | The actual safety net — free (verified pattern in https://github.com/franksunye/visutry/blob/HEAD/docs/ops/vercel-pro-cost-baseline-2026-09-07.md) |

Estimated observability cost: **$0–3/mo** (Plus events for one project's cron traffic).

---

## 4. FIREWALL / BOT specifics

### The AI-bot managed ruleset — what it blocks
- Dashboard: **Firewall → Rules → Bot Management → AI Bots Ruleset**. **Inactive by default** (labeled "Allow") — matching traffic is *not evaluated* until you turn it on.
- Actions: **Log** (record only) or **Deny** (block all traffic identified as coming from AI bots). (https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets, updated 2026-09-10)
- It targets known AI crawler/bot signatures (training-data scrapers) — the exact bot list is managed by Vercel. Related: one-click AI bot ruleset changelog (https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets).

### Companion rulesets
- **Bot Protection Managed Ruleset**: also off by default ("Off"). **Log** or **Challenge** — Challenge serves a **JavaScript challenge** to traffic unlikely to be a real browser. (same source)
- **OWASP Core Ruleset**: standards-based (OWASP Top Ten); per-rule **Log or Deny**. (same source)

### The log-then-enforce workflow (official)
Docs prescribe it explicitly: *"Use **Log** first and monitor the live traffic on the **Firewall** overview page to check that the rule has the desired effect when applied"* — then Review Changes → Publish to production. Rule execution order: **custom rules first, then managed rulesets**. Bypass action in a higher-priority custom rule can carve out legitimate traffic (e.g., his own monitoring user agent). (https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets)

### Rate-limit rule syntax (what the dashboard config maps to)
Created via Firewall → Configure → **+ New Rule** → Then: **Rate Limit**. Parameters (https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting, updated 2026-08-28):
- **Strategy**: Fixed Window (all plans; Token Bucket is Enterprise-only)
- **Time Window**: 10 s – 10 min (default 60 s); **Request Limit**: default 100
- **Counting key**: IP or JA4 Digest (Pro; Enterprise adds UA + arbitrary headers)
- **Action on exceed**: Default 429, or Log / Deny / Challenge
- Limits: **40 rules/project** on Pro; rate limiting billed **usage-based, regional pricing** (Hobby gets 1M included allowed requests)
- Note: counters are **per-region** — multi-region traffic can exceed a single-region limit.

### The 4 firewall rules to add for a scraped picks site
1. **AI Bots Ruleset → Log for 7 days, then Deny.** Picks content is exactly what AI scrapers harvest. Log first per the official workflow; flip to Deny once the overview confirms no legit traffic matches.
2. **Bot Protection → Challenge.** JS challenge kills headless scrapers while real browsers pass. If it interferes with any legit API consumers, carve them out with a bypass rule above it.
3. **Rate limit `/api/*`: 100 req / 60 s per IP → 429.** His cron/API routes are the expensive surface (DB + external API calls per hit). Start at 100/60s, tighten from the Firewall overview. (Action: Log for 48 h first, then 429.)
4. **Custom rule: challenge known scraper user agents** — UA contains `python-requests`, `Go-http-client`, `Scrapy`, `curl`, `wget` on paths outside `/api/*` (his own tooling gets a bypass rule with its UA placed above).
5. *(Optional, geo — only if his audience is US-only)*: custom rule denying or challenging non-US countries. Verify his audience geography first; don't guess. Marked optional because it can nuke legit traffic.

**Why this is high-value:** every blocked scraper request is bandwidth + function invocations + Fluid compute + observability events he *doesn't* pay for. The rulesets themselves have no line-item cost on Pro (rate limiting is usage-based; the AI-bot/bot-protection toggles are included).

---

## 5. PREVIEW DEPLOYMENT cost controls

### What a preview deploy costs
- **Previews bill function usage like production** (invocations, Active CPU, Provisioned Memory at the same Fluid rates). Any traffic a preview URL receives — including bots — meters.
- **Every push = a full build**, billed in build minutes even if the build **fails**. Rates compiled from the pricing page (~71 days ago): Build Standard **$0.014/min** (on-demand concurrency/Elastic), Enhanced $0.028/min, Turbo $0.105/min; Elastic CPU-minute formula $0.0035 × min × vCPUs. Older source (207 days): Standard $0.01/min, Enhanced $0.025/min, Turbo $0.10/min. Pro includes ~**6,000 build minutes/mo** (https://www.vendr.com/marketplace/vercel · https://github.com/yuanbop/frugal/blob/HEAD/research/vercel.md). Standard fixed machine = 2 vCPU / 8 GB (https://github.com/franksunye/visutry/blob/HEAD/docs/ops/vercel-pro-cost-baseline-2026-09-07.md).
- Real-world bleed reference: a measured 3-project setup burned **$269.04 in Build CPU Minutes in 30 days** at ~41 prod deploys/day — builds were *the* bill (https://github.com/ltplus-ag/ifc-lite/blob/HEAD/scripts/README-vercel-cost.md). His 50+ failed deploys are the same shape of waste.

### The fix, ranked
1. **`ignoreCommand` for docs-only changes** (already in round 1 — re-affirm): exit 0 skips the build when only `docs/**` (or other non-app paths) changed. Official docs: https://vercel.com/docs/project-configuration/vercel-json#ignorecommand. Pattern from a measured setup that cancelled **4,747 preview builds in 30 days**: `if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi` — note this variant cancels *all* previews, deployment record still created but marked CANCELED and **not billed for the build** (https://github.com/ltplus-ag/ifc-lite/blob/HEAD/scripts/README-vercel-cost.md).
2. **Disable auto-preview per agent branch** in `vercel.json`:
   ```json
   { "git": { "deploymentEnabled": { "main": true, "motif/*": false, "hermes/*": false } } }
   ```
   or project-wide `"git": { "deploymentEnabled": false }` + explicit `vercel --prod` / `vercel` deploys (https://github.com/dicklesworthstone/agent_flywheel_clawdbot_skills_and_integrations/blob/HEAD/skills/vercel/references/BUILD-CONTROL.md). Branch-pattern support should be verified against current schema — queued for evaluation if patterns don't match.
3. **Dashboard**: Project Settings → Git → disable "Automatic Deployments for non-Production Branches"; disable PR/commit comments. API field: `previewDeploymentsDisabled: true` (https://github.com/deessejs/deessejs/blob/HEAD/documents/internal/product/app/A2-vercel-platforms.md).
4. **Auto-cancel redundant builds**: `github.autoJobCancelation: true` so a fast-pushing agent doesn't stack builds per commit.

### Quantified bleed
- 50 failed deploys × ~4 min avg Next.js build ≈ **200 build minutes** — inside the 6,000/mo included, but pure waste, and the fleet's push cadence is the unbounded risk. At the ltplus measured rate ($269 / ~3,600 prod builds), his fleet could replicate that bill if every agent push builds.
- Preview *traffic* also meters function usage; scrapers hitting `*.vercel.app` preview URLs is a known leak — pair with the firewall rules in §4 and Deployment Protection if previews must exist.

---

## 6. FLUID CONCURRENCY — sizing I/O-heavy crons

### How it works (verified, docs updated 2026-06-16)
- **Multiple invocations share one instance** instead of one microVM per request ("optimized concurrency"; Node.js and Python). Idle existing instances are preferred before new ones are allocated. After all requests complete, the instance pauses — **zero CPU/memory charges between requests**. (https://vercel.com/docs/functions/usage-and-pricing · https://github.com/vercel/vercel-plugin/blob/HEAD/skills/vercel-functions/SKILL.md)
- **Active CPU bills only while code executes**; I/O waits (Neon queries, external API calls) pause CPU billing. **Provisioned Memory bills for the entire instance lifetime — including I/O waits** — until the last in-flight request finishes. (https://vercel.com/docs/functions/usage-and-pricing)
- iad1 rates: **Active CPU $0.128/hr · Provisioned Memory $0.0106/GB-hr · Invocations $0.60/1M**. (same source)
- Default function timeout on Fluid: **300 s**; Pro configurable to **800 s**; extended beta 1800 s (https://github.com/frankxai/claude-skills-library/blob/HEAD/free-skills/partner-vercel/SKILL.md · https://github.com/spearlance/spearlance-os/blob/HEAD/.claude/skills/vercel/SKILL.md). Cron timeout = same as function duration (https://github.com/fbmoulin/claude-skills/blob/HEAD/skills/platforms/skills/VercelExpert/References/Pricing.md).

### Target numbers for a 30–60 s I/O-heavy cron (Neon + external APIs)
| Setting | Target | Why |
|---|---|---|
| **Memory** | **512 MB** (lowest that fits; default is 1024 MB) | Memory bills for full instance lifetime *including I/O waits* — for a 60 s I/O-bound run it's the dominant line. Halving 1 GB → 512 MB halves it |
| **maxDuration** | **120 s** | 2× the expected 60 s worst case. Bounds the bill if an API hangs; cron timeout follows function duration, so a stuck run can't burn 800 s × memory |
| **Region** | iad1 (already set) | Cheapest published region; co-located with Neon |

### The math (iad1, 60 s run, 2 s active CPU — typical for DB/API-bound)
- Memory (1 GB): 1 × 60/3600 × $0.0106 = **$0.000177** → at 512 MB: **$0.000088**
- CPU: 2/3600 × $0.128 = **$0.000071**
- Invocation: **$0.0000006**
- **Per run ≈ $0.00025 (1 GB) / $0.00016 (512 MB)** — memory is ~70% of the cost *because* CPU pauses during I/O.
- Hottest cron (every 15 min = 2,880 runs/mo): **≈ $0.72/mo → $0.46/mo** after the memory cut. All 23 crons at similar profiles: single-digit $/mo. **This is not the bill — it's the guardrail**: the real risk is an unconstrained maxDuration × high memory on a hung run.

### Guidance
- Set `memory: 512` and `maxDuration: 120` (or 180 for the slowest pipeline step) on every cron route in `vercel.json` `functions` config. Lower memory + short duration minimizes the bill *structurally* under Fluid because memory is the only meter that runs during I/O waits.
- Bytecode caching applies to **production only** — don't benchmark cold starts on previews (https://github.com/vercel/vercel-plugin/blob/HEAD/skills/vercel-functions/SKILL.md).

---

## 7. EDGE MIDDLEWARE audit pattern

### Pricing (verified)
- **Pro: 1,000,000 middleware invocations/mo included, then $0.65/1M** — confirmed by Vercel staff ("charged up front for the whole 1M bucket… $0.65 per 1M Edge middleware invocations") and third-party pricing compilations (https://community.vercel.com/t/function-invocations-charged-228x-documented-rate-with-no-response-from-support-for-4-days/29688/5 · https://github.com/fbmoulin/claude-skills/blob/HEAD/skills/platforms/skills/VercelExpert/References/Pricing.md).
- Middleware is billed under the Fluid model; fair-use caps **average CPU at 50 ms per invocation** (https://github.com/rector-labs/core/blob/HEAD/content/journal/understanding-vercel-usage.md).

### Exact matcher-narrowing pattern
Middleware runs **before the cache on every matched request** — a site-wide matcher multiplies cost by total traffic. For an app with `/api/*` routes, public pages, and internal-fence pages:

```ts
// middleware.ts
export const config = {
  matcher: [
    // ONLY the fenced/internal surface — everything else bypasses middleware
    '/admin/:path*',
    '/internal/:path*',
    '/dfs/process/:path*',
  ],
};
```

If auth/redirects are needed on public pages too, use a negative matcher instead — but **always** exclude:
```ts
matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
```
What to exclude and why:
- **`_next/*`** (static, image) — static assets; middleware on these is pure waste.
- **`/api/*`** — cron endpoints and data routes don't need edge auth; secure crons with `CRON_SECRET` (`Authorization: Bearer` check — https://github.com/lurodrisilva/personal-skills/blob/HEAD/platform-engineering/vercel/SKILL.md) and APIs with their own auth.
- **Static files by extension** — scrapers love hammering these.
- Keep middleware **lightweight** (routing/redirects only); push JWT/crypto/cookie parsing downstream — CPU is capped at 50 ms avg.

---

## 8. PRO INCLUDED ALLOWANCES he's likely not using

| Allowance (Pro) | Number | Using it? | $ value of allowance |
|---|---|---|---|
| Function invocations | **$0.60/1M**, bucket-billed from $0 against credit (Vercel staff, 2025 — https://community.vercel.com/t/function-invocations-charged-228x-documented-rate-with-no-response-from-support-for-4-days/29688/5). Older mirrors list "1M included"; official docs (2026-06-16) show Pro = on-demand. **Conflict flagged — economic effect within the $20 credit is similar** | Yes — crons + site traffic; ~100K/mo scale is pennies | ~$0.60/mo |
| Active CPU | Hobby: 4 hrs included. **Pro: on-demand** per official docs (https://vercel.com/docs/functions/usage-and-pricing). One 76-day-old source claims "Pro 16 hrs" — **conflict, treat as unverified** (https://github.com/rector-labs/core/blob/HEAD/content/journal/understanding-vercel-usage.md) | Yes, tiny for I/O-bound crons | — |
| Provisioned Memory | Hobby: 360 GB-hrs. **Pro: on-demand** per official docs; one source claims "Pro 1440 GB-hrs" — **unverified** (same as above) | Yes | — |
| Web Analytics events | **100K/mo included** (Hobby 50K); $0.00003/event after; Plus $10/mo (https://vercel.com/changelog/up-to-80-pricing-reduction-for-web-analytics) | Likely not enabled | **$3.00/mo** |
| Speed Insights | **10K data points included**; $0.65 (per 1K, per limits table — slightly ambiguous) (https://github.com/supersterling/primus/blob/HEAD/docs/references/vercel/limits.md) | Likely not | ~$6.50/mo |
| Edge middleware invocations | **1M/mo** (§7) | Depends on matcher — audit it | $0.65/mo |
| Image Optimization transformations | **5,000/mo**; $0.05/1K at iad1 after (https://github.com/saleor/storefront/blob/HEAD/docs/vercel-cost-optimization.md · https://medium.com/u11d-tech-blog/aws-amplify-vs-vercel-complete-pricing-comparison-for-next-js-applications-bf149f6113d1) | Maybe (team logos?) | **$0.25/mo** |
| ISR reads / writes | **1M / 200K** (same sources) | Yes if ISR in use — check | $0.40 + $0.80/mo |
| Fast Data Transfer | **1 TB/mo**; $0.15/GB after ($40/100GB bucket pricing per some sources) | Yes — scraping eats this | **$150/mo** |
| Fast Origin Transfer | 10 GB (https://medium.com/u11d-tech-blog/aws-amplify-vs-vercel-complete-pricing-comparison-for-next-js-applications-bf149f6113d1) | Incidentally | — |
| Blob storage | 1 GB (same source) | Unknown | — |
| Cron jobs | **100/project**, per-minute scheduling on Pro (https://github.com/iamtrevormay/baseball-savant-web/blob/HEAD/Jo/data-reliability/11-serverless-cron-reliability.md) | Using 23/100 | Headroom for 77 more |
| Concurrent builds | **12** on Pro (https://github.com/deessejs/deessejs/blob/HEAD/documents/internal/product/app/A2-vercel-platforms.md) | Fleet pushes may queue | — |
| Deployments | 6,000/day on Pro (same source) | Nowhere near | — |
| Runtime logs | Pro **1-day** retention free (§3) | Yes, passively | — |
| AI Gateway | Included on Pro (https://github.com/frankxai/claude-skills-library/blob/HEAD/free-skills/partner-vercel/SKILL.md) — queued for evaluation as fleet model router (round-1 note) | No | TBD |
| Observability Plus | **$1.20/1M events**, no base fee; one 204-day-old mirror lists "1M events included" — **conflict, re-verify before budgeting** (https://github.com/supersterling/primus/blob/HEAD/docs/references/vercel/limits.md) | Possibly auto-enabled (post-2026-04-03 teams) — check Billing | — |
| Free first-year domain | **UNVERIFIED** — could not confirm in reachable docs. Queued for evaluation | — | — |
| Sandbox allowances | **None on Pro** — the 5 CPU-hr / 420 GB-hr / 5K creations / 10 concurrent figures are **Hobby** quotas (§2) | — | N/A |
| Tracing spans (1M beta) | **UNVERIFIED** — queued for evaluation | — | — |

---

## RANKING by value × feasibility

| Rank | Action | Value | Feasibility | Numbers |
|---|---|---|---|---|
| **1** | **Preview deploy controls** — `ignoreCommand` docs-only + disable previews on agent branches + auto-cancel redundant builds | HIGH — kills the fleet's unbounded build-minute burn (50+ failed deploys already; measured worst case $269/30d for build-heavy setups) | Trivial — one `vercel.json` commit + 2 dashboard toggles | ~200 build-min wasted on the 50 failures; Pro includes 6,000 min/mo — the fix protects the *tail risk* |
| **2** | **Firewall bot rules** — AI Bots Log→Deny, Bot Protection Challenge, `/api/*` rate limit 100/60s/IP, scraper-UA challenge | HIGH — every blocked scraper request saves bandwidth ($0.15/GB), invocations, Fluid compute, and observability events on the 1 TB transfer allowance | Trivial — dashboard only, zero code; follow the official Log→monitor→Deny workflow | Rulesets free on Pro; rate limiting usage-based |
| **3** | **Fluid sizing on all 23 crons** — `memory: 512`, `maxDuration: 120–180` | MEDIUM-HIGH — not the current bill (single-digit $/mo) but a structural guardrail: memory is ~70% of an I/O-bound run's cost because it bills through I/O waits; maxDuration caps hung-run exposure (800 s default ceiling) | Easy — `vercel.json` functions config | Hottest cron: $0.72→$0.46/mo; a hung 800 s × 4 GB run would cost ~$0.05 *each* — the cap is the point |
| **4** | **Signals chain → 1 workflow** (write→slate→settle→alerts) | MEDIUM — durability (retries, no missed/duplicated ticks, uncapped run duration, `sleep()` polling) for the money-critical pipeline; cost-neutral | Medium — Workflow SDK refactor of 3–4 cron routes; migrate one chain first | ~$0.81/mo in workflow events; compute unchanged |
| **5** | **Observability posture** — free tier + Plus on prod project only (exclude previews) + spend alerts; skip log drains | MEDIUM — 30-day retention + anomaly alerts on the pipeline for ~$0–3/mo; exclusions stop fleet noise from metering | Easy — Billing toggles | Plus: $1.20/1M events, no base fee; drains $0.50/GB skipped |
| **6** | **Sandbox as fleet backtest executor** | MEDIUM — isolated Firecracker microVMs, 24 h sessions, iad1, free downloads, 10K concurrency | Medium — SDK integration + read-only Neon role; queued for evaluation | ~$0.11 per 30-min 4-vCPU backtest; ~$11/mo per 100 runs — inside the $20 credit. **Correction: Pro has no included allowance** (task's 5 CPU-hr/420 GB-hr/5K/10 figures are Hobby) |
| **7** | **Middleware matcher audit** | LOW-MEDIUM — only pays if >1M middleware invocations/mo; cheap insurance against a site-wide matcher | Easy — one `config.matcher` edit | 1M included, $0.65/1M after |
| **8** | **Unused allowances sweep** — enable Web Analytics (100K events), Speed Insights (10K points), confirm AI Gateway | LOW — free data he's already paying for via the $20 seat | Trivial | ~$10/mo of included value; AI Gateway queued for evaluation as fleet router |

### Cross-cutting notes
- **Spend Management** (budget + pause) is the single cheapest insurance across all of the above — enable before the fleet scales further.
- **Conflicts flagged, not resolved**: Pro Active CPU/Memory "included" figures (official docs say on-demand; third parties claim 4/16 hrs and 360/1440 GB-hrs); Observability Plus "1M included" (204-day-old mirror vs current usage-only pricing page); function invocations "1M included" (older) vs bucket-billing from $0 (Vercel staff). Within the $20/mo credit the practical difference is small, but re-verify against the live Billing dashboard before asserting any of them.
- **Queued for evaluation (not dismissed)**: 1M tracing-spans beta figure; free first-year domain; branch-pattern support in `git.deploymentEnabled`; Sandbox cold-start measurement; AI Gateway as fleet router.
