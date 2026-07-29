# GROK_BUILD_MASTER_PROMPT — autonomous coding agent

**Repo:** Beexly/Sports · **Law:** LIVE_BOARD off · refuse-default · no fake ROI · oddsApiRequired=false · measurement > narrative · Pedersen ≠ ZK/PQ

## Verify-first (every session)

```bash
npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build \
  && node scripts/guardrails/em-dash-scan.mjs && node scripts/guardrails/trust-gate.mjs
```

Anti-dupe before inventing:

```bash
rg -n "cronAuthError|authorizeCronSecret|GammaCronRunner|runGammaCron" apps packages --glob '*.ts'
rg -n "canPublishPicks|PUBLISH_LEDGER|LIVE_BOARD|CODE_READY" apps packages --glob '*.ts' | head
```

## P0 ship (this prompt)

| # | Task | Done when |
|---|------|-----------|
| 1 | `@sports/util` — `safeEqualSecret` / `authorizeCronSecret` | tests green |
| 2 | `@sports/quote-plane` — Gamma provider + cron runner + archive | tests green |
| 3 | `GET/POST /api/cron/gamma` — **must** use `cronAuthError` from `apps/web/lib/cron/authorize.ts` | 401/500/200 |
| 4 | `vercel.json` **ADD** `{ "path": "/api/cron/gamma", "schedule": "*/30 * * * *" }` | existing 11 crons **kept** |
| 5 | Response always `oddsApiRequired: false` | no Odds API on critical path |

## Identity law

| Surface | Mechanism |
|---------|-----------|
| Vercel cron | `CRON_SECRET` + `cronAuthError` (timingSafeEqual) — **SoT** |
| Packet twin | `@sports/util` `authorizeCronSecret` |
| SPIFFE / NKeys / mTLS inbound | **NOT** on Vercel serverless — mesh/k8s only later |
| Kafka / Redpanda / Streams / JetStream | **NOT** P0 — Redis/Upstash strings for cache |

## Do not

- Flip LIVE_BOARD / PUBLISH_LEDGER / SLATE_OPENING_REVEAL / #226 without founder YES
- Remove or replace existing vercel crons (especially refresh-odds)
- Sportsbook affiliate paths
- PQ-wash Pedersen as ZK
- Superiority claims without competitive study
- Duplicate cron auth with `===` string compare

## Founder residuals (IDLE — not agent soft-launch)

Phase C (5b) remeasure · LIVE_BOARD · #226 HEOS · paid Odds key · public claim surfaces

## Messaging research (closed — do not PR textbooks)

Streams/Kafka/Redpanda/NATS/SPIRE researched; default remains string cache + optional NX lock. Gamma v1: no distributed lock.

## Next after this PR green

Port remaining packet packages per `gse-claude-packet/03_NEXT_CODING_AGENT.md` · board honest-empty · BH-FDR before Phase-3 feature expansion · credentials Track A (Neon/Upstash/Stripe/Vercel) is founder/ops
