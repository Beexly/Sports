> **Non-primary.** Operator SoT is `CANONICAL.md` + Production `/cockpit`. This file is narrative only.

# GSE MASTER PLAN — CANONICAL (WORLD-CLASS)

**Product:** Galaxy Sports Edge (Beexly/Sports)  
**Updated:** 2026-07-29 (polish pass)  
**Repo:** https://github.com/Beexly/Sports  
**MAIN tip:** re-verify with `git log -1 --oneline` (Pass 4 docs include `b21582f`)  
**Standard:** A++ production-ready under refuse-default  
**Agent mode:** IDLE on code · founder owns secrets · **class_A=0**

This is the **single source of truth** for product law, runtime state, ops unlocks, AI control plane, and every ranked leverage source. Contradictory older handoffs yield to this file + `CURRENT_STATE.md`.

---

## 0. FOUNDER LOCK (NEVER FLIP WITHOUT EXPLICIT YES)

| Lock | Value |
|------|-------|
| LIVE_BOARD | **off** |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL | **off** |
| oddsApiRequired (free path) | **false** |
| Phase C (5b) | **UNVERIFIED** |
| Public ROI / guaranteed edge | **blocked** |
| Sportsbook CPA / affiliate | **permanently blocked** |
| Unauthorized sportsbook scrape / WS intercept | **blocked** |
| refuse-default | **on** |

**SoT stack (do not replace):**

| Layer | Choice |
|-------|--------|
| App | Vercel `sports-web` (Next.js) |
| DB | Neon **gse-postgres** + Prisma dual URL |
| AI | **ai-control-plane** (sealed) + optional INTERNAL_LLM / free Gemini·Groq·xAI keys |
| Billing | Stripe entitlements (missing tier → free/refuse) |
| Cron | Vercel crons + `CRON_SECRET` · Node runtime · force-dynamic |
| Optional workers | Oracle Always-Free VPS (BullMQ, Redis, Ollama, henrygd) |

---

## 1. REALITY SNAPSHOT

| Field | Value |
|-------|-------|
| Pass | 4 complete → master-plan world-class polish |
| class_A | **0** (re-run `gse-verify` after new code) |
| SHIPPED | Dual CRON_SECRET auth · cron nodejs + force-dynamic · free Gamma path · honest board · prefire gate · own-feed PIT refuse · methodTag CLV · trust-gate / AI Council CI · CRON_MATRIX + smokes |
| CODE_READY | Hydration stubs · Phase C harness (unverified) · multi-provider keys via control-plane (no LiteLLM required) · durable receipts (needs Neon) |
| PARKED | Overlay optical CV · Poly1305/CF Access/SPIFFE digression |

**Verify alias:**
```bash
alias gse-verify='npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && node scripts/guardrails/trust-gate.mjs && node scripts/guardrails/em-dash-scan.mjs'
```

**Cron matrix:** 18 routes · 12 scheduled · 0 edge · auth via `cronAuthError` — see `CRON_MATRIX.md`.

---

## 2. P0 — OPS UNLOCK (BLOCKING)

Do before credit theater. Production `sports-web`:

| # | Action | Source of truth |
|---|--------|-----------------|
| 1 | **DATABASE_URL** = pooled Prisma URL | gse-postgres `POSTGRES_PRISMA_URL` |
| 2 | **DIRECT_URL** = unpooled | gse-postgres `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` |
| 3 | **CRON_SECRET** re-verify / set if missing | `openssl rand -hex 32` |
| 4 | Redeploy Production | Env changes require new deploy |
| 5 | Smoke | `scripts/ops/gamma-cron-smoke.sh` → **401** then **200** |
| 6 | Prisma migrate deploy if needed | Use `DIRECT_URL` |

**Do not mix** sports-db `storage_*` vars into Production Neon aliases.

**Same session — free AI keys (need free usage badly):**

| Key | Source | ai-control-plane role |
|-----|--------|--------------|
| `GEMINI_API_KEY` | Google AI Studio | gse-volume |
| `GROQ_API_KEY` | console.groq.com | gse-volume fallback |
| `XAI_API_KEY` | console.x.ai | gse-reason |
| `ANTHROPIC_API_KEY` | console.anthropic.com | gse-reason quality |
| Optional rotate | Groq if ever leaked in git history | `INTERNAL_LLM_API_KEY` |

**Internal LLM (code path may already exist):**  
`INTERNAL_LLM_BASE_URL` + `INTERNAL_LLM_MODEL` + `INTERNAL_LLM_API_KEY` (Groq OpenAI-compatible) for non-user-facing work.

---

## 3. ARCHITECTURE (LEVERAGE ATTACHMENT)

```text
[Founder / users / agents]
            │
            ▼
   Vercel sports-web  ←── Vercel AI Gateway (~$5/mo free) · startup credits
            │
            ├── Prisma ──► Neon gse-postgres  ←── Neon credits · pgvector RAG
            │                 ├── receipts / ledger / keyring
            │                 └── optional branch: litellm-spend
            │
            ├── /api/cron/*  (CRON_SECRET · force-dynamic · Node)
            │
            └── optional LiteLLM later (not deployed)
                  ├── gse-volume: Gemini Flash-Lite → Groq → OpenRouter
                  ├── gse-reason: xAI Grok → Anthropic → fallback
                  ├── virtual keys + max_budget → control-plane ledger
                  ├── Admin UI = spend SoT
                  ├── Langfuse Hobby (optional agent traces)
                  └── Cloudflare: WAF · R2 · Zero Trust /admin

Optional side plane:
   Oracle Always-Free ── workers · Redis · Ollama · henrygd NCAA
```

---

## 4. COMPLETE LEVERAGE STACK

### 4.1 P0 — Claim / set in hours

| Item | Leverage | GSE use |
|------|----------|---------|
| Vercel Production env | Runtime truth | DB + cron alive |
| Neon gse-postgres | Durable SoT | Prisma + receipts |
| Google AI Studio | Free Gemini | Volume inference |
| Groq free | High free TPM | Volume fallback |
| xAI console | Grok API (+ optional ~$150/mo data-share US; **OFF** for private) | Reason path |
| Vercel AI Gateway | ~$5/mo free team credits | Light calls without full proxy |
| Neon pgvector | Vectors on existing DB | Context packs / ops RAG |
| Free CI scanners | Gitleaks · Trivy · Semgrep · GitGuardian | Trust-gate alignment |

### 4.2 P1 — Apply (bootstrapped-friendly)

| Program | Offering (verify live) | Notes |
|---------|------------------------|-------|
| Microsoft Founders Hub | ~$1k Azure **without investor code** → entity verify → higher path (~$150k) | Optional Foundry via ai-control-plane; not SoT |
| Neon for Startups | Self-funded credits | Cut DB bill |
| Cloudflare for Startups | Bootstrapped ~$5–10k; partner much higher | R2 zero-egress · Workers · Zero Trust |
| AWS Activate Founders | ~$1k–$5k self-funded | Secondary / Bedrock via ai-control-plane |
| Anthropic for Startups | Claude credits + rate limits | gse-reason |
| Sentry for Startups | ~$5k/12mo if eligible | Error/perf |
| PostHog free | Product + AI events | Funnel + agent telemetry |
| CF Web Analytics + Clarity | Free / free | Snippets often code-ready — need tokens |
| OpenRouter | Multi-model key | Failover mesh |
| Resend free | ~3k emails/mo | Transactional |
| Langfuse Hobby | Free LLM traces | SHADOW/council |
| Google Cloud trial | ~$300 | Optional Vertex |

### 4.3 P2 — When topology needs it

Clerk · Auth0 free · Doppler · Inngest (~50k events) · Upstash free · Helicone (secondary) · CF Zero Trust · Vercel startups (partner) · Algolia · Prisma Accelerate (prefer Neon pool first) · Braintrust · Storj/R2 cold archives · Stripe live go-live

### 4.4 P3 — Partner / research / optional infra

| Item | Notes |
|------|-------|
| GitHub for Startups | **$10k credits** · Enterprise/Copilot/GHAS — **outside funding + partner required** |
| Sportradar official trial | Legal league sandbox · never free-path dep |
| Oracle Always-Free VPS | Workers · Redis · Ollama · henrygd (code in `docker/oracle-vps`) |
| DigitalOcean Hatch / Vultr / Oracle startups | Secondary; Hatch often partner-gated |
| CoreWeave / Modal / NVIDIA Inception | GPU only with real need |
| Houston FI / Ion / Station Houston | Partner letters unlock CF/GitHub/DO higher tiers |
| Stripe Atlas | Entity + Stripe perks if incorporation needed |
| Paddle MoR | Global tax later |
| Content-for-cash | DO Write for DOnations / LogRocket guest |
| Programmatic SEO `/preview` | Code may be ready — ship when env live |
| FPL/EPL free data | **Gated** until written PL commercial permission |

### 4.5 Application paths (exact)

**Microsoft Founders Hub (no investor code):**
1. [microsoft.com/startups](https://www.microsoft.com/startups) → Continue **without a code**
2. Create/link Azure account → unlock ~$1,000
3. Business verification (legal entity) → path toward ~$5,000
4. Higher milestones = sustained multi-workload usage

**AWS Activate Founders:** [startups.aws.com](https://startups.aws.com) → Founders package (no Org ID)

**GitHub for Startups:** [github.com/enterprise/startups](https://github.com/enterprise/startups) — funding ≤ Series B + partner + new to Enterprise → $10k credits. Bootstrapped = trial only.

**Cloudflare / Neon / Sentry / Anthropic:** official startup portals; bootstrapped tiers where published.

---

## 5. AI CONTROL PLANE

| Concern | Decision |
|---------|----------|
| Proxy | ai-control-plane; Admin UI = spend SoT |
| Volume | Gemini Flash-Lite, Groq |
| Reason | xAI Grok, Anthropic Claude |
| Failover | OpenRouter / Together |
| Budgets | Virtual keys max_budget + duration → ledger |
| Privacy | `store_prompts_in_spend_logs=false`; xAI data-share **OFF** for governed |
| Caching | Prompt cache keys on SHADOW/tool loops |
| Effort | Low reasoning on SHADOW/tool loops |
| RAG | Neon pgvector first; xAI Collections prototype optional |
| Cloud AI | Azure Foundry / Vertex / Bedrock **only via ai-control-plane** |
| Free-tier risk | Google free may train on data — paid for secrets |
| Cost routing | User-facing quality on Claude/Grok; internal classify/normalize on Groq/Haiku |

---

## 6. PRODUCTION HARDEN (PASS 3 — STILL LAW)

| ID | Rule |
|----|------|
| H1 | Node runtime on cron (not edge) when secrets/timingSafeEqual |
| H2 | No secrets in logs; generic auth failures |
| H3 | force-dynamic on cron/truth |
| H4 | API errors `{ ok:false, error }` |
| H5 | Missing Stripe tier → free/refuse |
| H6 | Missing DATABASE_URL → clean refuse |

---

## 7. LEGAL SPORTS DATA

| Allowed | Forbidden |
|---------|-----------|
| Sportradar official trial | Sportsbook CPA |
| League APIs under ToS | Oddsjam-as-+EV product |
| NOAA / public weather / census | Pinwheel book-history scrape |
| nflverse / openfootball / MoneyPuck (cleared licenses) | Unauthorized book feeds / WS intercept |
| ESPN public / balldontlie / henrygd (ToS-cleared) | Free path requiring paid Odds |
| FPL/PL only with written commercial permission | Ungated commercial FPL scrape |

Registry: `packages/stats-api/src/sources/external-registry.ts` · `EXTERNAL_LEVERAGE_MAP.md`

---

## 8. EXPLICIT NON-GOALS

- LIVE_BOARD without founder YES  
- oddsApiRequired=true on free path  
- Public ROI / “best stats” marketing  
- Second primary DB replacing Neon  
- DePIN as receipt SoT  
- Direct Azure/Bedrock SDKs (ai-control-plane only)  
- Academic supercomputer as product dependency  
- Parallel production on Hetzner while Vercel+Neon works  
- GitHub Startups full claim without funding+partner  
- Sportsbook CPA / unauthorized scrape  

---

## 9. HUMAN ACTION LIST (ORDERED)

### Must do first (P0)
1. Fix/confirm Production **DATABASE_URL** + **DIRECT_URL** from gse-postgres (pooled + unpooled)  
2. Re-verify **CRON_SECRET** on Production (rotate if ever exposed)  
3. Redeploy Production  
4. Gamma smoke: **401** then **200**  
5. Create **Gemini + Groq + xAI** keys (Anthropic when available)  

### Same week (P1)
6. Microsoft Founders Hub **without code**  
7. Neon startups · Cloudflare bootstrapped  
8. AWS Activate Founders · Anthropic Startups · Sentry Startups  
9. PostHog + Langfuse Hobby + OpenRouter + Resend  
10. CF Web Analytics + Microsoft Clarity tokens (if snippets already in layout)  

### When ready (P2–P3)
11. Stripe live go-live checklist (billing)  
12. Upstash only if multi-instance  
13. Oracle Always-Free VPS (workers)  
14. Houston ecosystem for partner letters  
15. GitHub for Startups **only if** funded + partner  
16. Explicit YES only: LIVE_BOARD / PUBLISH_LEDGER / #226 / Phase C measure  

---

## 10. WEEK CALENDAR (TIME-POOR FOUNDER)

| Window | Focus | Success metric |
|--------|-------|----------------|
| Sitting 1 (45–90 min) | Neon URLs + CRON_SECRET + redeploy + smoke | 401/200 green |
| Sitting 2 (30–60 min) | Gemini + Groq + xAI keys into Vercel | Keys present; one ai-control-plane or internal call works |
| Sitting 3 (60 min) | Microsoft + Neon + CF + AWS applications | Apps submitted |
| Sitting 4 (30 min) | PostHog + Langfuse + Sentry + Resend + Clarity/CF | Free telemetry live |
| Later | Oracle VPS · Stripe · partner GitHub | Workers cheap · billing live |

---

## 11. DOC OWNERSHIP

| File | Role |
|------|------|
| `docs/ops/MASTER_PLAN.md` | **This file** — full plan |
| `docs/ops/MASTER_PLAN_LEVERAGE.md` | Leverage deep dive + credit tables |
| `docs/ops/MASTER_PLAN_INDEX.md` | Navigation index |
| `docs/ops/CURRENT_STATE.md` | Runtime truth snapshot |
| `docs/ops/OPEN_LEDGER.md` | Class A empty · B founder · C gates |
| `docs/ops/FOUNDER_HANDOFF_MESSAGE.md` | 3-minute founder read |
| `docs/ops/FOUNDER_ONLY_CHECKLIST.md` | Checkboxes only |
| `docs/ops/CREDENTIALS_CHECKLIST.md` | Env ownership |
| `docs/ops/CRON_MATRIX.md` | Cron × auth × vercel.json |
| `docs/ops/SMOKE.md` | Post-deploy commands |
| `docs/ops/CLAUDE_COWORK_PROMPT_P0.md` | Walk-through for human steps |
| `handoff/OWNER_ACTION_ITEMS.md` | Longer owner residual (Oracle, analytics, merges) |

---

## 12. EXIT LINE

```
pass=master-plan-world-class
class_A=0
LIVE_BOARD=off
oddsApiRequired=false
leverage=docs/ops/MASTER_PLAN.md
handoff=docs/ops/FOUNDER_HANDOFF_MESSAGE.md
next=P0_ENV_THEN_KEYS_THEN_CREDITS
blockers=founder-only Production Neon URLs + smoke + free AI keys + credit apps
```

*Credits amplify runway. They do not change product law or SoT.*
