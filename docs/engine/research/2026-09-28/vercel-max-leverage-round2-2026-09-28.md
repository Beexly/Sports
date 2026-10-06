# Vercel Round 2 — price shootouts and non-obvious Pro value (2026-09-28)

Research date 2026-09-28. Three deep-research lanes synthesized:
`r2-gateway-shootout.md` (AI Gateway prices), `r2-caching.md` (Next.js caching),
`r2-platform.md` (Workflows/Sandbox/observability/firewall/previews/Fluid/middleware/allowances).
Every number carries a source. Untested = "queued for evaluation." Research only.

---

## 1. AI GATEWAY PRICE SHOOTOUT — the money question

### Per-model, per-1M input/output tokens

| Model | Vercel AI Gateway | OpenRouter list | OpenRouter effective (+5.5%) | Neon AI Gateway | Direct provider |
|---|---|---|---|---|---|
| DeepSeek V3 `deepseek-chat` (legacy) | Not individually rendered; zero markup → provider rate (unverified) | **$0.2574 / $1.0287** ✓ live API | **$0.2716 / $1.0853** | Not available (not a Databricks FM offering) | **RETIRED 2026-07-24** (historic $0.27/$1.10). Current: `deepseek-flash` $0.30/$1.20 peak ($0.15/$0.60 off-peak); `deepseek-v4-pro` $1.32/$3.96 peak |
| Claude Sonnet 5.5 (released today) | **$2.00 / $10.00** ✓ rendered live | **$2.00 / $10.00** ✓ | **$2.11 / $10.55** | Not confirmed (July probe: `claude-sonnet-5` unavailable; `claude-sonnet-4-6` works) — queued | **$2.00 / $10.00** (cache read $0.20, write $2.50) — Anthropic |
| Grok 4.7 | **$2.00 / $6.00** ✓ rendered live | **$2.00 / $6.00** ✓ (≥200k prompt: $4/$12) | **$2.11 / $6.33** | Docs name Grok 4.6; 4.7 unprobed — queued | **$2.00 / $6.00** (<200k prompt; cached $0.50/$1.00; US regional ×1.1) — xAI |
| Llama 3.1 8B | Not individually rendered; zero markup → inference-provider list (unverified) | **$0.05 / $0.08** ✓ | **$0.0528 / $0.0844** | **$0.15 / $0.45** (Databricks DBU-derived) | No hosted Meta list (open weights); NIM has no published per-token price |
| Qwen3 235B A22B | Not individually rendered (unverified) | **$0.455 / $1.82** ✓ — **SKU expires 2026-10-09** | **$0.4800 / $1.9201** | 80B: $0.15/$1.20; 122B: $0.22/$2.20; 235B unconfirmed — queued | Alibaba list unverified — queued |
| GPT-4o-mini | **$0.15 / $0.60** (zero markup → OpenAI list; not individually rendered) | **$0.15 / $0.60** ✓ | **$0.1583 / $0.633** | Not confirmed — queued | **$0.15 / $0.60** (batch $0.075/$0.30) — OpenAI |
| gpt-oss-120b | Not individually rendered (unverified) | **$0.15 / $0.60** ✓ | **$0.1583 / $0.633** | **$0.15 / $0.60** headline — BUT models.dev flags Neon entries at **$0.072/$0.28**: inconsistency, queued | Open weights; NIM no per-token price — queued |

Blended cost (3:1 input:output), effective dollars: Sonnet 5.5 — Vercel $4.00 vs OpenRouter $4.22 vs direct $4.00. Grok 4.7 — Vercel $3.00 vs OpenRouter $3.17 vs direct $3.00. GPT-4o-mini — Vercel $0.2625 vs OpenRouter $0.2769 vs direct $0.2625. Llama 3.1 8B — OpenRouter $0.0607 vs Neon $0.225 (OpenRouter wins this one).

**Headline:** Vercel AI Gateway wins or ties on every basket model — zero markup everywhere, vs OpenRouter's structural 5.5% deposit fee. OpenRouter's only basket win is Llama 3.1 8B on raw list price, and even there the fee narrows it.

### OpenRouter fee math
5.5% Stripe deposit fee at purchase (5% crypto, $0.80 minimum), no volume discounts → effective multiplier ×1.055 at every spend level: **$50/mo → pay $52.75; $200/mo → pay $211.00.** Credits expire after 1 yr; fee non-refundable. Sources: https://openrouter.ai/api/v1/models (live), OpenRouter docs.

### Vercel mechanics (docs-verified)
- Zero markup, zero platform fee on tokens — provider list price, managed keys or BYOK. https://vercel.com/docs/ai-gateway/pricing (updated 2026-09-08)
- **Below-list discounted models today** (live catalog https://vercel.com/ai-gateway/models, 2026-09-28): gemini-3.x flashes −50%, longcat-2.5 −59%, mercury-2.5 −80%, deepseek-v4-flash-vision-exp −51%, GPT-5.6 Sol −50%, MiniMax H3 −50%, ling-3.0-flash −65%, toast-1 −40%. **None of the basket models carry a discount badge today.** (Changelog titled "Grok 4.7 now available and 40% off" — live catalog shows $2/$6; treat the 40% as expired or route-specific, queued for re-verification.)
- $5/mo free credit, requires payment method; **permanently forfeited on first top-up** — run free tier first, then commit.
- BYOK at $0 fee (paid tier): provider list with $0 gateway fee; requires positive credit balance so fallback providers stay available (fallback usage bills to credits).
- 402 `insufficient_funds` on empty balance — set auto top-up.
- **Per-request ZDR is FREE; `disallowPromptTraining` filter is FREE** (per request). Team-wide ZDR $0.10/1K requests.
- **Training-data defaults per family:** every basket family has a no-prompt-training agreement on the gateway **except DeepSeek** (assumed-trains unless the filter is set — which then blocks DeepSeek routes entirely). Decide DeepSeek's data posture explicitly.

### Neon AI Gateway (dark horse for open weights)
Databricks FM passthrough, no markup, prepaid credits ($5 min, 1 credit = $1, 12-mo validity), paid plans only. Coverage today: Llama 3.1 8B $0.15/$0.45 (OpenRouter cheaper), gpt-oss-120b $0.15/$0.60, Qwen3 80B/122B, some proprietary pass-through — but Sonnet 5.5/Grok 4.7/DeepSeek/GPT-4o-mini unconfirmed. Blocked on Garrett's Neon API key + plan-tier check. https://neon.com/docs/ai-gateway/overview

### NIM note
No published per-token NIM pricing exists — build.nvidia.com is a free rate-limited dev tier; production = NVIDIA AI Enterprise licensing. Not comparable per-token; queued for evaluation.

---

## 2. NEXT.JS CACHING SPECIFICS — exact patterns, not marketing

### Framing decision: which caching model is the app on?
Next.js 16 has two mutually exclusive models; mixing them is a **build error**:
1. **Previous model (default)** — `export const revalidate`, `export const dynamic`, `fetch` with `next: { revalidate, tags }`, `revalidatePath`/`revalidateTag`, ISR.
2. **Cache Components model (Next 16, opt-in via `cacheComponents: true`)** — `'use cache'`, `cacheLife`, `cacheTag`, `revalidateTag(tag, profile)`; PPR becomes default. Enabling it makes leftover `dynamic`/`revalidate`/`fetchCache` exports **error**.

**Recommendation:** implement the previous model now; treat Cache Components as a deliberate later migration. Whether the app has `cacheComponents: true` is queued for evaluation (check `next.config.ts`).

### ISR patterns per page type (previous model)

**(a) Public projections page** — identical for every visitor, refreshes on slate publish:
```tsx
// app/projections/page.tsx
export const revalidate = false // cache indefinitely; only on-demand refreshes
export default async function ProjectionsPage() {
  const slate = await getCurrentSlate() // direct DB read; runs at build + regeneration
  return <ProjectionsView slate={slate} />
}
```

**(b) Public weekly rankings page** — on-demand primary, TTL safety net:
```tsx
export const revalidate = 86400 // 24h safety net if the publish signal misses
```
The publish job calls revalidation on success.

**(c) Invalidation from the publish flow** — CRON_SECRET-protected route:
```ts
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response('Unauthorized', { status: 401 })
  revalidatePath('/projections')
  await fetch(new URL('/projections', request.url).toString()) // warm; revalidation is lazy
  return Response.json({ revalidated: true })
}
```
Route Handlers may call `revalidatePath`; they stay dynamic by design (correct, one invocation per publish).

**(d) Internal read APIs** — cache only public-safe payloads:
```ts
export const dynamic = 'force-static'
export const revalidate = 300
```
If authenticated/per-user (the fence): `export const dynamic = 'force-dynamic'` — Next.js automatically emits `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. No manual header code needed. Per the public/private doctrine, the signals read API defaults to the private variant.

### `'use cache'` / `updateTag` correction (Next 16)
- `updateTag(tag)` is **Server Actions only** — it will not work in a cron `route.ts`.
- From cron/publish routes use `revalidateTag(tag, 'max')` (the profile arg is required in Next 16).
- `'use cache'` runtime output **does not durably persist on Vercel serverless** (in-memory entries typically don't survive across requests) — durable savings come from the prerendered shell + CDN, not the runtime cache.

### PPR status
Stable in Next 16; default once Cache Components is enabled. **But:** on Vercel, a route with PPR holes **still invokes the function on a shell hit** — for uniform pages (projections/rankings), hole-free ISR is cheaper. Reserve PPR for pages with genuine per-request content.

### Cost gotchas
- One uncached fetch (`cache: 'no-store'`, `next: { revalidate: 0 }`) or `cookies()`/`headers()`/awaited `searchParams` anywhere in a route **poisons the whole route dynamic** — symptom: `Cache-Control: private, no-cache, no-store`, no `x-nextjs-cache` header. Diagnose with `next build && next start` + `NEXT_PRIVATE_DEBUG_CACHE=1`.
- **Cache hits never count as function invocations** — every ISR/CDN-served page view is free of invocation cost.
- ISR cache reads/writes bill in 8 KB units; **writes ~10× pricier than reads** — prefer long TTL + on-demand invalidation over short polling windows.
- v15+ default: `fetch()` is **not cached by default** — opt in explicitly.

---

## 3. WORKFLOWS vs CRON CHAINS

His signals pipeline (write → slate → settle → alerts) is a chain of best-effort crons with **zero retries** — a failed tick is silently gone, and cron delivery can miss or duplicate.

- **Pricing (verified, docs updated 2026-09-16):** $0.02/1K events; one step = 3 events. A 4-step chain at 15-min cadence (2,880 runs/mo) ≈ 40,300 events/mo ≈ **$0.81/mo**. Functions invoked by workflows bill at the same Fluid rates as crons. **Cost-neutral vs crons; the win is reliability, not price.**
- **Durability wins:** step auto-retries, no missed/duplicated ticks, uncapped total run duration, uncapped `sleep()` (poll for game finalization inside one run instead of chaining ticks), per-run event log in the dashboard.
- **Migration shape:** keep ONE cron as the trigger; the workflow replaces the other 3–4 chained crons and their timing joins. Each step keeps its current code. Steps must be idempotent (same as cron today).
- **When worse:** trivial fire-and-forget crons stay crons; don't migrate until steps are idempotent.
- Verdict: **queued for evaluation** — migrate one chain first on preview. https://vercel.com/docs/workflows/pricing

---

## 4. SANDBOX for agent-generated code

**Correction to round-1 assumptions:** the "5 CPU-hrs / 420 GB-hrs / 5K creations / 10 concurrent" figures are **Hobby** quotas, not Pro. **Pro has no included allowance** — all Sandbox usage bills on-demand against the $20 credit.

- **Pro rates (iad1, verified https://vercel.com/docs/vercel-sandbox/pricing/):** Active CPU $0.128/hr (excludes I/O waits); memory $0.0212/GB-hr (1-min minimums); creations $0.60/1M; 10,000 concurrent; **24 h max sessions**; 8 vCPU / 16 GB / 64 GB ephemeral NVMe / 15 open ports; Node 22/24, Python 3.13; **outbound network allowed**, downloads free, on Pro transfer rides the flat-rate CDN; available in iad1.
- **Fit:** Firecracker microVMs — the right shape for untrusted agent-generated backtest/calibration code, replacing his VM as the execution layer. Can hit Neon Postgres directly (read-only role + branch connection string).
- **Math:** 100 backtests/mo × $0.11 (30-min, 4 vCPU) ≈ **$11/mo** — inside the $20 credit. 10K concurrency means the whole fleet can run parallel backtests.
- **Catches:** filesystem ephemeral (push outputs to Blob/Neon before stop, or use drives/snapshots); default 5-min session timeout — extend explicitly up to 24 h; memory bills for the whole session even when CPU is idle — `sandbox.stop()` promptly; **no hard included cap on Pro** — a runaway fleet loop bills, so Spend Management alerts are mandatory.
- Verdict: **queued for evaluation** as the fleet's backtest execution layer.

---

## 5. CHEAPEST CREDIBLE OBSERVABILITY POSTURE

| Layer | Decision | Cost |
|---|---|---|
| Free Observability + 1-day runtime logs (Pro) + usage dashboard + `vercel logs` CLI | Keep | $0 |
| Observability Plus on the **production project only**, exclude preview/agent projects | Enable selectively — 30-day retention + anomaly alerts on the money pipeline | ~$0–3/mo ($1.20/1M events, **no base fee**; auto-enabled for teams created/upgraded on/after 2026-04-03 — check Billing) |
| Log drains ($0.50/GB) | Skip — only if >30-day retention or SIEM needed | $0 |
| Spend Management alerts 50/75/100% | Enable — the actual safety net | $0 |

**Total: $0–3/mo.** https://vercel.com/docs/observability/observability-plus

---

## 6. FIREWALL — exact rules for a scraped picks site

- **AI Bots managed ruleset** (Firewall → Bot Management): off by default. Workflow: **Log for 7 days → review the Firewall overview → flip to Deny.** Picks content is exactly what AI scrapers harvest.
- **Bot Protection → Challenge:** JS challenge kills headless scrapers; real browsers pass. Carve out legit API consumers with a bypass rule above it.
- **Rate limit `/api/*`: 100 req / 60 s per IP → 429** (Fixed Window; counters are per-region). Start in Log for 48 h, then enforce.
- **Custom rule: challenge scraper user agents** — UA contains `python-requests`, `Go-http-client`, `Scrapy`, `curl`, `wget` on non-API paths; bypass rule above it for his own tooling's UA.
- (Optional) Geo rule — only if the audience is confirmed US-only.
- Rule execution order: **custom rules first, then managed rulesets.** The rulesets are free on Pro; rate limiting is usage-based. Every blocked scraper request saves bandwidth ($0.15/GB), invocations, Fluid compute, and observability events. https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets (updated 2026-09-10)

---

## 7. PREVIEW DEPLOYMENT COST CONTROLS

- **What a preview costs:** previews bill function usage like production; every push = a full build billed in build minutes **even if it fails**. His 50+ failed deploys ≈ 200 wasted build minutes. A measured build-heavy setup burned **$269/30d** on builds alone — his fleet's push cadence is the unbounded tail risk.
- **Fixes (ranked):**
  1. `ignoreCommand` docs-only pattern (already in vercel.json — re-affirm; extend to other non-app paths).
  2. Disable auto-preview per agent branch in `vercel.json`: `{ "git": { "deploymentEnabled": { "main": true, "motif/*": false, "hermes/*": false } } }` (branch-pattern support queued for verification against current schema), or project-wide `deploymentEnabled: false` + explicit deploys. Dashboard: Project Settings → Git → disable automatic non-production deployments; API field `previewDeploymentsDisabled: true`.
  3. `github.autoJobCancelation: true` so a fast-pushing agent doesn't stack builds per commit.
- Pair with firewall rules — scrapers hitting `*.vercel.app` preview URLs meter function usage.

---

## 8. FLUID CONCURRENCY — target config for I/O-heavy crons

- Multiple invocations share one instance; idle instances are preferred; zero charges between requests. Active CPU bills only while executing; **provisioned memory bills for the entire instance lifetime including I/O waits** — for a 60 s I/O-bound cron, memory is ~70% of the cost.
- **Targets for a 30–60 s I/O-heavy cron:** `memory: 512` (MB, lowest that fits; default 1024), `maxDuration: 120` (2× worst case; bounds hung-run exposure — the default ceiling is 300 s, Pro configurable to 800 s), region iad1 (already set).
- **Math (iad1):** per 60 s run ≈ $0.00016 at 512 MB vs $0.00025 at 1 GB. Hottest cron (every 15 min): **$0.72 → $0.46/mo**. All 23 crons at similar profiles: single-digit $/mo. The real value is the guardrail — an unconstrained hung run is the risk, not the steady state.
- Set `memory` + `maxDuration` in `vercel.json` `functions` config on every cron route. https://vercel.com/docs/functions/usage-and-pricing

---

## 9. EDGE MIDDLEWARE AUDIT PATTERN

- **Pro: 1M middleware invocations/mo included, then $0.65/1M** (Vercel-staff-confirmed). Middleware runs before the cache on every matched request — a site-wide matcher multiplies cost by total traffic.
- **Narrow the matcher** to only the fenced/internal surface:
```ts
export const config = {
  matcher: ['/admin/:path*', '/internal/:path*', '/dfs/process/:path*'],
}
```
- If public pages need middleware too, use a negative matcher that **always excludes** `_next/*`, `/api/*` (crons secure via CRON_SECRET, already enforced), and static extensions (`svg|png|jpg|jpeg|gif|webp|ico`). Keep middleware lightweight (routing/redirects only — CPU capped at ~50 ms avg); push JWT/crypto downstream.

---

## 10. PRO INCLUDED ALLOWANCES — the sweep

| Allowance | Number | Using it? | $ value |
|---|---|---|---|
| Web Analytics events | 100K/mo included | Likely not enabled | $3.00/mo |
| Speed Insights data points | 10K included | Likely not | ~$6.50/mo |
| Edge middleware invocations | 1M/mo | Depends on matcher — audit (§9) | $0.65/mo |
| Image Optimization transforms | 5,000/mo | Maybe (team logos) | $0.25/mo |
| ISR reads / writes | 1M / 200K | If ISR in use — check | ~$1.20/mo |
| Fast Data Transfer | 1 TB/mo | Yes — scraping eats this | $150/mo of included value |
| Cron jobs | 100/project, per-minute | Using 23/100 | Headroom for 77 more |
| Blob storage | 1 GB | Unknown | — |
| Concurrent builds | 12 (Pro) | Fleet pushes may queue | — |
| AI Gateway | Included on Pro | No — the pilot target (§1) | TBD |
| Sandbox | **None on Pro** (Hobby-only quotas) | — | N/A |

---

## RANKED — value × feasibility

| # | Action | Value | Feasibility | Numbers |
|---|---|---|---|---|
| 1 | **Preview deploy controls** — `ignoreCommand` + disable previews on agent branches + auto-cancel redundant builds | HIGH — kills the fleet's unbounded build-minute burn (measured worst case $269/30d) | Trivial — vercel.json commit + 2 dashboard toggles | 50 failed deploys ≈ 200 wasted build-min; Pro includes 6,000 min/mo |
| 2 | **Firewall bot rules** — AI Bots Log→Deny, Bot Protection Challenge, `/api/*` 100/60s/IP rate limit, scraper-UA challenge | HIGH — every blocked scraper request saves bandwidth ($0.15/GB), invocations, compute, observability events | Trivial — dashboard only, zero code | Rulesets free on Pro; rate limiting usage-based |
| 3 | **ISR the public pages** — `revalidate = false` + on-demand revalidation from the publish flow (CRON_SECRET route + warm-up); rankings `revalidate = 86400` safety net | HIGH — cached = zero invocations/compute; the single biggest runtime lever | Code change — previous-model patterns above, no model migration needed | Cache hits never count as invocations |
| 4 | **AI Gateway pilot** — one budget-capped key, one agent lane, one month, compare vs OpenRouter | HIGH — zero markup vs 5.5% deposit fee; per-key budgets; free ZDR; BYOK $0 fee | Config + base-URL swap | $50/mo → saves $2.75; $200/mo → saves $11.00 (fee alone); run free $5 tier first — first top-up forfeits it |
| 5 | **Fluid sizing on all 23 crons** — `memory: 512`, `maxDuration: 120–180` | MEDIUM-HIGH — structural guardrail (memory ~70% of I/O-bound run cost) | Easy — vercel.json functions config | Hottest cron $0.72→$0.46/mo; hung-run exposure capped |
| 6 | **Signals chain → 1 Workflow** (write→slate→settle→alerts) | MEDIUM — retries, no missed/duplicated ticks, uncapped `sleep()` for the money pipeline; cost-neutral | Medium — Workflow SDK refactor; migrate one chain first | ~$0.81/mo events; compute unchanged |
| 7 | **Observability posture** — free tier + Plus on prod only + spend alerts; skip log drains | MEDIUM — 30-day retention + anomaly alerts for $0–3/mo | Easy — Billing toggles | Plus $1.20/1M events, no base fee |
| 8 | **Sandbox as fleet backtest executor** | MEDIUM — isolated Firecracker microVMs, 24 h sessions, iad1, 10K concurrency | Medium — SDK + read-only Neon role; queued for evaluation | ~$11/mo per 100 backtests — inside the $20 credit |
| 9 | **Middleware matcher audit** | LOW-MEDIUM — insurance past 1M invocations | Easy — one `config.matcher` edit | 1M included, $0.65/1M after |
| 10 | **Unused allowances sweep** — enable Web Analytics (100K), Speed Insights (10K) | LOW — free data already paid for | Trivial | ~$10/mo of included value |

### Founder taps (true hard blocks, everything else is agent-doable)
1. AI Gateway pilot decision — run the $5 free tier first (first top-up forfeits it permanently).
2. DeepSeek data posture — only basket family with no no-training agreement; use per-request ZDR/disallowPromptTraining (free) or accept assumed-training.
3. Vercel spend budget in dashboard (default $200 too high).
4. Grok 4.7 "40% off" promo — re-verify in the catalog before budgeting on it.

### Queued for evaluation (not dismissed)
- Vercel catalog per-model prices for deepseek-chat, gpt-4o-mini, llama-3.1-8b, gpt-oss-120b, qwen3-235b (only Sonnet 5.5 + Grok 4.7 rendered live this pass)
- Neon availability of Sonnet 5.5 / Grok 4.7 / GPT-4o-mini / Qwen3 235B (needs his Neon API key)
- NVIDIA NIM per-token economics (no published pricing)
- Alibaba direct Qwen3 pricing
- Whether the app runs `cacheComponents: true` and which Next.js major version (repo check)
- `git.deploymentEnabled` branch-pattern support against current vercel.json schema
- Sandbox cold-start measurement
- Free first-year domain (unverified in reachable docs)
- 1M tracing-spans beta figure (unverified)
- Pro "included" compute figures where official docs say on-demand and third parties claim included hours (re-verify against the live Billing dashboard)
