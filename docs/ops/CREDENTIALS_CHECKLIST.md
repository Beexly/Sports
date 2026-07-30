# Credentials checklist — founder/ops (agent IDLE after code path ready)

**Law:** agent does not invent secrets · does not flip LIVE_BOARD · does not claim prod green without smoke.

## Required for production honesty path

| Secret / env | Purpose | Who sets | Smoke |
|--------------|---------|----------|-------|
| `CRON_SECRET` | Vercel cron Bearer primary | Founder / Vercel Project Settings | `scripts/ops/gamma-cron-smoke.sh` → 401 then 200 |
| `CRON_SECRET_PREVIOUS` | Optional rotation twin | Founder during rotate | same smoke with previous token |
| `DATABASE_URL` | Neon Postgres | Founder | `npm run test:integration:db` or health |
| `DIRECT_URL` | Neon direct (migrate) | Founder | migrate-if-configured |
| Upstash Redis (if online store) | Optional hot plane | Founder | path-ready until set |
| Stripe live keys | Billing | Founder | STRIPE_GO_LIVE_CHECKLIST |
| Production `CRON_SECRET` in Vercel | Must match smoke | Founder | dual-secret rotate playbook below |

## Optional enrichment (not required for free Gamma path)

| Secret | Purpose | Law |
|--------|---------|-----|
| `THE_ODDS_API_KEY` | Paid odds refresh-odds | **enrichment only** · oddsApiRequired=false on Gamma |
| Polymarket Gamma | Public HTTP | no key for free path |

## Dual-secret rotate playbook

1. Generate new primary secret.
2. Set `CRON_SECRET_PREVIOUS` = current `CRON_SECRET`.
3. Set `CRON_SECRET` = new primary.
4. Deploy / env sync.
5. Smoke: Bearer new → 200; Bearer previous → 200; Bearer garbage → 401; no auth → 401.
6. After all callers use new primary, clear `CRON_SECRET_PREVIOUS`.

## Agent stop conditions (IDLE)

When only the following remain, agent stops and lists founder blockers:

- LIVE_BOARD / PUBLISH_LEDGER / reveal flips
- Phase C (5b) remeasure with paid Odds
- #226 HEOS merge YES
- Neon / Upstash / Stripe live / Production CRON_SECRET values
- Public claim surfaces / legal watermark

## Related

- `docs/ops/CREDITS_STACK.md` (when merged) — Neon/Upstash/Stripe/Vercel/Claude credits
- `docs/ops/GROK_BUILD_MASTER_PROMPT.md` — agent law
- `scripts/ops/gamma-cron-smoke.sh` — 401/200 smoke
- `scripts/ops/credentials-smoke.mjs` — env presence probe (no secret echo)
