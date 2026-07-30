# FOUNDER_ONLY_CHECKLIST

No soft language. Check only when done in **Production**.

## P0 — Runtime honesty (do first)

- [ ] `DATABASE_URL` = gse-postgres **pooled** (`POSTGRES_PRISMA_URL`)
- [ ] `DIRECT_URL` = gse-postgres **unpooled** (`DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`)
- [ ] No `storage_*` / sports-db aliases mixed into those two vars
- [ ] `CRON_SECRET` present on Vercel Production (re-verify; rotate if ever exposed)
- [ ] Production **redeployed** after env change
- [ ] `gamma-cron-smoke.sh` (or curl): **401** bad Bearer, **200** good Bearer

## P0 — Free AI keys (same week)

- [ ] `GEMINI_API_KEY` (Google AI Studio)
- [ ] `GROQ_API_KEY` (console.groq.com) — rotate if ever leaked in git history
- [ ] `XAI_API_KEY` (console.x.ai)
- [ ] `ANTHROPIC_API_KEY` (when available)
- [ ] Optional internal: `INTERNAL_LLM_BASE_URL` / `INTERNAL_LLM_MODEL` / `INTERNAL_LLM_API_KEY`

## P1 — Credits & free SaaS (applications)

- [ ] Microsoft Founders Hub — **without** investor code
- [ ] Neon for Startups (self-funded)
- [ ] Cloudflare for Startups (bootstrapped)
- [ ] AWS Activate Founders
- [ ] Anthropic for Startups
- [ ] Sentry for Startups (if eligible)
- [ ] PostHog free account
- [ ] Langfuse Hobby
- [ ] OpenRouter key
- [ ] Resend free
- [ ] CF Web Analytics beacon token → `NEXT_PUBLIC_CF_BEACON_TOKEN`
- [ ] Microsoft Clarity project id → `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- [ ] `NEXT_PUBLIC_ANALYTICS_ENABLED=true` after tokens set

## P2 — When topology needs it

- [ ] Upstash Redis env (multi-instance only)
- [ ] Stripe live keys + webhook (`STRIPE_GO_LIVE_CHECKLIST.md`)
- [ ] Oracle Always-Free VPS + DNS (`docker/oracle-vps`)
- [ ] Doppler / Clerk / Inngest if scale requires

## P3 — Relationship / research

- [ ] Houston founder ecosystem / partner letter path
- [ ] GitHub for Startups **only if** outside funding + partner
- [ ] Sportradar official trial (research only)

## Explicit YES only (default remains OFF)

- [ ] Explicit YES: **LIVE_BOARD** on
- [ ] Explicit YES: **PUBLISH_LEDGER** on
- [ ] Explicit YES: **SLATE_OPENING_REVEAL** / reveal on
- [ ] Explicit YES: merge / land **#226 HEOS**
- [ ] **Phase C (5b)** remeasure after real path (not silent flip)

## Optional enrichment (never free-path required)

- [ ] `THE_ODDS_API_KEY` for `/api/cron/refresh-odds` enrichment only
- [ ] `CLOSING_ARCHIVE_PATH` if durable archive path needed

## Forbidden until YES + measurement

- Public ROI / guaranteed edge claims
- Sportsbook CPA
- Odds API required on free Gamma/own-feed path
- Flipping gates without explicit YES

## Related

- Walk-through: `CLAUDE_COWORK_PROMPT_P0.md`
- Full plan: `MASTER_PLAN.md`
- Smoke: `SMOKE.md`
