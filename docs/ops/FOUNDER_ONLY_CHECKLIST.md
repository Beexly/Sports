# FOUNDER_ONLY_CHECKLIST

No soft language. Check only when done in **Production**.
Updated: 2026-07-30.

## P0 — Runtime honesty (done 2026-07-30)

- [x] `DATABASE_URL` = gse-postgres **pooled**
- [x] `DIRECT_URL` = gse-postgres **unpooled**
- [x] No `storage_*` / sports-db aliases mixed into those two vars
- [x] `CRON_SECRET` on Vercel Production — **rotated** 2026-07-30
- [x] Production **redeployed** after env change (2x, green on `1dbcca9`)
- [x] Gamma smoke: **401** bad Bearer, **200** good Bearer; `/api/health` db ok
- [ ] Formal `npm run prove:neon` local run (runtime already proves db; run the script anyway to close it)

## P0 — Push decision

- [x] Free-spine build-fix on main (`a3d015b` → HEAD `3dfbc726`). Stale "HEAD does not build" note retired 2026-07-30 APEX boot.

## P0 — Free AI keys

- [x] `GEMINI_API_KEY` (set in Production 2026-07-30)
- [ ] `GROQ_API_KEY` — rotate if ever leaked in git history (repo is PUBLIC)
- [ ] `XAI_API_KEY`
- [ ] `ANTHROPIC_API_KEY` (when available)
- [ ] Optional internal: `INTERNAL_LLM_BASE_URL` / `INTERNAL_LLM_MODEL` / `INTERNAL_LLM_API_KEY`

## Known state (context, not tasks)

- Ingestion stale since ~Jul 25: paid Odds API key deactivated. Health "degraded" for this reason only. Fix is the free-spine patch, not a new paid key.
- 2026-07-30 law enforcement: `PERFORMANCE_STATS_ENABLED` and `PUBLIC_PICKS_ENABLED` were live true; flipped false. Do not re-enable without explicit YES.

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
- [ ] Explicit YES: public picks (`PUBLIC_PICKS_ENABLED`) / performance stats (`PERFORMANCE_STATS_ENABLED`) back on
- [ ] Explicit YES: merge / land **#226 HEOS**
- [ ] **Phase C (5b)** remeasure after real path (not silent flip)

## Forbidden until YES + measurement

- Public ROI / guaranteed edge claims
- Sportsbook CPA
- Odds API required on free Gamma/own-feed path
- Flipping gates without explicit YES

## Related

- Walk-through: `CLAUDE_COWORK_PROMPT_P0.md`
- Full plan: `MASTER_PLAN.md`
- Smoke: `SMOKE.md`
