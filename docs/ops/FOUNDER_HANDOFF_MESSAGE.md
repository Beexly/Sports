# Founder handoff (3 minutes)

**Product:** Galaxy Sports Edge · **MAIN:** `1e007c3` · **Agent status:** IDLE · **class_A:** 0

## What works now (no flag flips)

- Free **Gamma** quote cron path (`oddsApiRequired=false`) and dual-secret cron auth on every `/api/cron/*` route
- **Board** and **picks** empty states that do **not** pretend LIVE_BOARD is on
- **Prefire → selective FIRE** path; public fire cannot soft-pass
- **Own-feed** point-in-time refuse (no future leak)
- **CLV honesty:** method tags + refuse when methods diverge; archive continuous CLV
- **CI guards:** trust-gate, AI Council DESTROY, brand safety, secret scan
- Cron matrix + smoke scripts ready for Production HOST

You do **not** need code from the agent to use the above in a correctly configured deploy.

## Credentials in one sitting (batch order)

1. Neon: create DB → set `DATABASE_URL` + `DIRECT_URL` on Vercel Production  
2. Vercel: set `CRON_SECRET` (and optional `CRON_SECRET_PREVIOUS` only if rotating)  
3. Run `scripts/ops/gamma-cron-smoke.sh` against Production HOST → **401 then 200**  
4. Stripe live keys + webhook (billing)  
5. Upstash Redis **only if** you need multi-instance online store  
6. Optional: `THE_ODDS_API_KEY` for enrichment cron — never mark free path as requiring it  

Checklist: `docs/ops/FOUNDER_ONLY_CHECKLIST.md` · smoke: `docs/ops/SMOKE.md`

## Explicit YES required (defaults stay OFF)

- LIVE_BOARD on  
- PUBLISH_LEDGER / slate reveal on  
- Merge/land **#226 HEOS**  
- Treat **Phase C (5b)** as measured (only after real Odds/gamma path + remeasure)

## Intentionally NOT built / not claimed

- Overlay **optical CV** — **PARKED**  
- Poly1305 / CF Access / SPIFFE digression — closed  
- Public ROI / “guaranteed edge” — blocked  
- Sportsbook CPA — permanently blocked  
- Free path that depends on paid Odds API — forbidden by law  

## Exact next human action #1 (most leverage)

**Set Production `CRON_SECRET` + Neon `DATABASE_URL`/`DIRECT_URL` on Vercel, deploy, then run `./scripts/ops/gamma-cron-smoke.sh` against the Production HOST until you see 401 (bad token) and 200 (good token).**

That single loop turns “code ready” into “ops alive” without flipping LIVE_BOARD or inventing performance claims.

---

Canonical state: `docs/ops/CURRENT_STATE.md` · ledger: `docs/ops/OPEN_LEDGER.md`
