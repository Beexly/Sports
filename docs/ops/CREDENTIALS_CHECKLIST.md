# Credentials checklist — founder/ops

**Law:** agent does not invent secrets · does not flip LIVE_BOARD · does not claim prod green without smoke.

## Required for production honesty path

| Secret / env | Purpose | Who sets | Smoke |
|--------------|---------|----------|-------|
| `DATABASE_URL` | Neon pooled (Prisma) | Founder — gse-postgres `POSTGRES_PRISMA_URL` | health / integration |
| `DIRECT_URL` | Neon unpooled (migrate) | Founder — unpooled URL | migrate-if-configured |
| `CRON_SECRET` | Vercel cron Bearer primary | Founder | gamma-cron-smoke → 401 then 200 |
| `CRON_SECRET_PREVIOUS` | Optional rotation twin | Founder during rotate | dual Bearer 200 |
| Stripe live keys | Billing | Founder | STRIPE_GO_LIVE_CHECKLIST |
| Upstash Redis | Multi-instance hot plane | Founder if needed | path-ready until set |

## Free AI / cost control (set after DB/cron green)

| Secret | Source | Use |
|--------|--------|-----|
| `GEMINI_API_KEY` | Google AI Studio | ai-control-plane volume (optional) |
| `GROQ_API_KEY` / `INTERNAL_LLM_API_KEY` | Groq console | Volume / internal LLM |
| `INTERNAL_LLM_BASE_URL` | e.g. `https://api.groq.com/openai/v1` | Internal tier |
| `INTERNAL_LLM_MODEL` | e.g. `llama-3.3-70b-versatile` | Internal tier |
| `XAI_API_KEY` | console.x.ai | ai-control-plane reason (optional) |
| `ANTHROPIC_API_KEY` | Anthropic Console | Quality reason path |

**xAI data-share credits:** optional ~$150/mo (US); **do not enable** for governed/private prompts unless founder explicitly accepts training risk.

## Analytics (optional free, code often ready)

| Secret | Source |
|--------|--------|
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | Cloudflare Web Analytics |
| `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true` only after tokens set |

## Optional enrichment (not free-path spine)

| Secret | Purpose | Law |
|--------|---------|-----|
| `THE_ODDS_API_KEY` | Paid odds refresh | **enrichment only** · oddsApiRequired=false on Gamma |
| `CLOSING_ARCHIVE_PATH` | Durable archive | optional |
| Polymarket Gamma | Public HTTP | no key for free path |

## Neon dual-URL rules

1. Prefer project **gse-postgres** as SoT.  
2. `DATABASE_URL` = **pooled** Prisma URL.  
3. `DIRECT_URL` = **unpooled** (migrations).  
4. Never map sports-db `storage_*` into these Production aliases.  
5. Redeploy after any Production env change.

## Dual-secret rotate playbook

1. Generate new primary secret.  
2. Set `CRON_SECRET_PREVIOUS` = current `CRON_SECRET`.  
3. Set `CRON_SECRET` = new primary.  
4. Deploy / env sync.  
5. Smoke: new → 200; previous → 200; garbage → 401; no auth → 401.  
6. After all callers use new primary, clear `CRON_SECRET_PREVIOUS`.

## Agent stop conditions (IDLE)

When only the following remain, agent stops and lists founder blockers:

- LIVE_BOARD / PUBLISH_LEDGER / reveal flips  
- Phase C (5b) remeasure with paid Odds  
- #226 HEOS merge YES  
- Neon / Upstash / Stripe live / Production CRON_SECRET values  
- Free AI keys and credit applications  
- Public claim surfaces / legal watermark  

## Related

- `MASTER_PLAN.md` · `FOUNDER_ONLY_CHECKLIST.md` · `SMOKE.md` · `CLAUDE_COWORK_PROMPT_P0.md`
