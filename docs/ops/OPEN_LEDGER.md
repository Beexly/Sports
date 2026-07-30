# OPEN_LEDGER — GSE drain status

**Updated:** 2026-07-29 · master-plan consolidation  
**Law:** oddsApiRequired=false · LIVE_BOARD off · refuse-default · measurement > narrative  
**class_A_remaining = 0**

## Classification key

| Class | Meaning |
|-------|---------|
| A | Agent can finish now |
| B | Founder env/secret only |
| C | Correctly gated / parked |

## Class A

**Empty.** Residual kill + Pass 4 handoff complete. Master plan docs consolidated.

## Class B — founder env/secrets

| Env / action | Where |
|--------------|-------|
| `DATABASE_URL` | Vercel Production ← gse-postgres pooled |
| `DIRECT_URL` | Vercel Production ← gse-postgres unpooled |
| `CRON_SECRET` | Vercel Production |
| Redeploy + gamma smoke | 401 then 200 |
| `GEMINI_API_KEY` / `GROQ_API_KEY` / `XAI_API_KEY` | Vercel |
| `ANTHROPIC_API_KEY` | Vercel (quality path) |
| Stripe live + webhook | When billing live |
| Upstash | Multi-instance only |
| `THE_ODDS_API_KEY` | Optional enrichment only |
| Credit applications | Microsoft / Neon / CF / AWS / Anthropic / Sentry |

See: `CREDENTIALS_CHECKLIST.md` · `CLAUDE_COWORK_PROMPT_P0.md`

## Class C — founder YES only

| Item | Status |
|------|--------|
| LIVE_BOARD | **off** |
| PUBLISH_LEDGER | **off** |
| SLATE_OPENING_REVEAL | **off** |
| #226 HEOS | needs YES |
| Phase C (5b) | **UNVERIFIED** |
| Overlay optical CV | **PARKED** |
| GitHub for Startups full offer | needs funding + partner |

## Forbidden

Fake ROI · sportsbook CPA · Odds API on free critical path · flip gates without YES

## Canonical docs

| File | Role |
|------|------|
| `MASTER_PLAN.md` | Full plan |
| `MASTER_PLAN_LEVERAGE.md` | Leverage atlas |
| `CURRENT_STATE.md` | Runtime truth |
| `OPEN_LEDGER.md` | This ledger |
| `FOUNDER_HANDOFF_MESSAGE.md` | 3-minute handoff |
| `CLAUDE_COWORK_PROMPT_P0.md` | Human co-work prompt |
