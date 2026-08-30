# MASTER PLAN INDEX — start here

**Updated:** 2026-07-29  
**Law:** LIVE_BOARD=off · oddsApiRequired=false · class_A=0 · refuse-default

## Read in this order (founder)

1. [`FOUNDER_HANDOFF_MESSAGE.md`](./FOUNDER_HANDOFF_MESSAGE.md) — 3 minutes  
2. [`FOUNDER_ONLY_CHECKLIST.md`](./FOUNDER_ONLY_CHECKLIST.md) — checkboxes  
3. [`CLAUDE_COWORK_PROMPT_P0.md`](./CLAUDE_COWORK_PROMPT_P0.md) — paste to co-work agent  
4. [`MASTER_PLAN.md`](./MASTER_PLAN.md) — full canonical plan  
5. [`MASTER_PLAN_LEVERAGE.md`](./MASTER_PLAN_LEVERAGE.md) — credits atlas  

## Ops reference

| Doc | When |
|-----|------|
| `CURRENT_STATE.md` | What is shipped vs gated |
| `OPEN_LEDGER.md` | Class A/B/C drain |
| `CREDENTIALS_CHECKLIST.md` | Env var ownership |
| `CRON_MATRIX.md` | All 18 crons |
| `SMOKE.md` | Post-deploy commands |
| `STRIPE_GO_LIVE_CHECKLIST.md` | Billing live |
| `EXTERNAL_LEVERAGE_MAP.md` | Legal free sports data |
| `../handoff/OWNER_ACTION_ITEMS.md` | Oracle VPS, analytics tokens, residual |

## Action #1

Production Neon dual URLs (gse-postgres) + CRON_SECRET re-verify + redeploy + gamma smoke **401 → 200**.
