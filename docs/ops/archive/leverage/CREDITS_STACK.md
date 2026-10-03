# CREDITS_STACK — max free/paid program leverage (ops)

Not fake green. Founder/ops activates credentials; agent keeps code path-ready.

| Provider | Program | GSE use | Status |
|----------|---------|---------|--------|
| Neon | Free/scale Postgres | SoR Prisma | env `DATABASE_URL` |
| Upstash Redis | Free tier | multi-instance online store (later) | optional |
| Vercel | Pro / Hobby crons | `/api/cron/*` + CRON_SECRET | gamma + 11 crons |
| Stripe | Live keys | FREE/PRO/ELITE entitlements | session tier on `/values` |
| Anthropic / Claude | API + credits programs | internal tools only; never customer pick generator | gated |
| Google Cloud | Free trial / credits | batch OCR eval DARK only | optional |
| AWS / Azure | startup credits | future workers — not required for honesty OS | optional |
| Cloudflare | free DNS/CDN | galaxysportsedge.com edge | ops |
| The Odds API | paid | enrichment only — **not spine** | founder residual Phase C |

## Activation order (one sitting)

1. Neon → DATABASE_URL + DIRECT_URL  
2. Vercel env: CRON_SECRET, NEXTAUTH_*, Stripe, Neon  
3. Stripe live prices → reconcile-entitlements  
4. CLOSING_ARCHIVE_PATH (writable) for gamma durability  
5. Upstash only when multi-instance memory proven insufficient  

## Refuse

- Claiming “credits activated” without env proof  
- Putting Odds API on critical path after gamma free path  
