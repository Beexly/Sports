# MASTER_PLAN_LEVERAGE — complete credit & free-tier atlas

**Parent:** `docs/ops/MASTER_PLAN.md`  
**Updated:** 2026-07-29  
**Filter:** bootstrapped-honest · GSE stack fit · no CPA · no scrape · no ROI claims  

---

## Integrity rules

1. Prefer tools that attach to **Vercel + Neon + Prisma + LiteLLM** without replacing SoT.  
2. Bootstrapped path first; partner-gated tiers marked as such.  
3. Free-tier training risk called out (Gemini free).  
4. Drop sportsbook CPA, unauthorized feeds, public ROI.  
5. Credit amounts change — verify on official portals before applying.

---

## Tier 0 — Already chosen SoT

| Asset | Why | Reality |
|-------|-----|---------|
| Neon gse-postgres | Prod DB + branching + pgvector | SoT; set pooled + unpooled URLs |
| Vercel sports-web | Next.js prod | Env + redeploy after changes |
| Prisma dual URL | Migrations vs runtime pool | DATABASE_URL + DIRECT_URL |
| LiteLLM | Multi-provider spend control | Stand up after free keys |

---

## Tier 1 — Free inference (need keys badly)

| Provider | Free shape | Wire |
|----------|------------|------|
| Google AI Studio | Gemini free tier | `GEMINI_API_KEY` → gse-volume |
| Groq | High free RPM/TPM | `GROQ_API_KEY` → gse-volume |
| xAI console | Trial credits; optional ~$150/mo data-share (US; irreversible opt-in) | `XAI_API_KEY` → gse-reason; data-share OFF for private packs |
| Vercel AI Gateway | ~$5/mo free credits / team | Light path before full LiteLLM |
| OpenRouter | Multi-model; free/cheap routes | Failover |
| Anthropic Console | Signup credits + Startups program | gse-reason quality |

---

## Tier 2 — Cloud / platform credits (apply)

| Program | Bootstrapped? | Ceiling (public claims) | GSE use |
|---------|---------------|-------------------------|---------|
| Microsoft Founders Hub | **Yes** starter | $1k → $5k → … → $150k path | Azure optional AI |
| Neon for Startups | Self-funded track | Varies | DB bill |
| Cloudflare for Startups | Bootstrapped tier | $5–10k; partner $100k–$350k class | R2, Workers, WAF, Zero Trust |
| AWS Activate Founders | **Yes** | $1k–$5k | Bedrock secondary |
| AWS Activate Portfolio | Partner Org ID | up to ~$100k | Later |
| Anthropic for Startups | Early founders OK | Varies; larger with partners | Claude credits |
| Sentry for Startups | Often <2y / <$5M | ~$5k/12mo | APM/errors |
| PostHog free | Yes | High free events | Product analytics |
| Datadog for Startups | Often funded | up to $100k claims | Only if needed |
| DigitalOcean Hatch | Often partner | up to $100k | Secondary VPS |
| Oracle for Startups | Apply | Credits + 70% ongoing claims | Optional |
| GitHub for Startups | **No** — funding + partner | $10k platform credits | Enterprise/Copilot/GHAS |
| Vercel startups | Often partner | Credits + AI Accelerator | Hosting bill |
| Stripe Atlas | Pay flat fee | Entity + product credits | If incorporation needed |
| Google Cloud for Startups | Tiers vary | Large AI packages | Optional Vertex |
| Redis for Startups | Apply | up to $25k claims | Hot plane later |
| MongoDB / Supabase / Upstash | Free tiers | Modest | Do not replace Neon SoT |

---

## Tier 3 — Observability, auth, workflows (free first)

| Tool | Free leverage | When |
|------|---------------|------|
| Sentry startups | Error tracking credits | P1 apply |
| PostHog | Product + session + AI obs | P1 signup |
| Langfuse Hobby | Agent/LLM traces | P1 after LiteLLM |
| Helicone | LLM proxy logs (verify free caps) | Optional secondary |
| Clerk free | ~10k MAU class | Auth scale |
| Auth0 free | ~7.5k MAU | Alternative auth |
| Doppler free | Secret sync | Multi-env |
| Inngest free | ~50k events class | Durable jobs beyond cron |
| GitGuardian Community | Secret scan | CI |
| Trivy / Gitleaks / Semgrep / Snyk free | Vuln/secret | CI |
| Resend free | Transactional email | Comms |
| Cloudflare Zero Trust free | Admin gate ~50 users | Cockpit lockdown |
| Microsoft Clarity | Free heatmaps | Funnel (already in OWNER items) |
| CF Web Analytics | Free cookieless | Funnel |

---

## Tier 4 — Legal sports data (no CPA)

| Source | Status |
|--------|--------|
| Sportradar Marketplace trial | Official sandbox only |
| nflverse, openfootball, MoneyPuck, Open-Meteo, NWS | Cleared licenses when ToS allows commercial |
| ESPN public / balldontlie / henrygd NCAA / CFBD | Rights-check in registry |
| The Odds API | Paid enrichment only; not free-path spine |
| Action Network / Oddsjam CPA / Pinwheel books | **DROP permanently** |

---

## Tier 5 — $0 infra / content runway

| Item | Use |
|------|-----|
| Oracle Always-Free Ampere | Workers, Redis, Ollama, henrygd |
| Hetzner auction / BuyVM | Offline batch only — not production board |
| DO Write for DOnations / LogRocket guest | Cash for technical content |
| Houston Founder Institute / Ion | Partner letters for GitHub/CF/DO |

---

## Permanent drops

Sportsbook CPA · unauthorized scrape · public ROI · second primary DB · DePIN as receipt SoT · LIVE_BOARD flip without YES

---

## Priority sequence (time-poor founder)

1. Neon URLs + CRON_SECRET + smoke  
2. Gemini + Groq + xAI keys → LiteLLM  
3. Microsoft without code + Neon startups + CF bootstrapped  
4. Sentry + PostHog + Langfuse  
5. Relationship path for GitHub/partner tiers  
6. Oracle VPS when workers cost matters  

See parent plan §9 for the full human list.
