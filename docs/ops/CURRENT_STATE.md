# CURRENT_STATE — Galaxy Sports Edge

**As of:** 2026-07-29 (auto-run wire pass)  
**SoT UI:** Production `/cockpit` + JARVIS (not external decks)  
**class_A agent residuals:** 0 for prior kill waves · **this branch:** free settle + jarvis snapshot wire  

## Law

LIVE_BOARD=off · oddsApiRequired=false · refuse-default · CPA blocked · Phase C UNVERIFIED

## Shipped / wired this pass (code)

| Item | Path |
|------|------|
| Free settle when no Odds key | `lib/data-sources/free-settlement-runner.ts` + `api/cron/settle-picks` |
| Jarvis snapshot cron (real) | `api/cron/jarvis-snapshot` loads assessment → ring buffer |
| jarvis-snapshot scheduled | `vercel.json` `15 * * * *` |
| Odds key not required in Jarvis config missing | `lib/cockpit/jarvis-data.ts` |
| Capability registry honesty | picks / market CLV / data-reliability / settlement truths |
| Cron matrix + FREE_FIRST docs | updated |

## Still founder-only (minimal)

1. Neon `DATABASE_URL` + `DIRECT_URL` (gse-postgres)  
2. `CRON_SECRET` re-verify + Production redeploy  
3. Optional free AI keys (not required for free path)  
4. Explicit YES later for LIVE_BOARD / publish / #226 / Phase C  

## Do not rebuild

`/cockpit`, `lib/jarvis`, `lib/cockpit`, free-first adapters, integrity ledger, AI control plane.

## Human watch surface

Production **`/cockpit`** after env green. Approve only external drafts.

See: `JARVIS_COCKPIT_AUTO_RUN.md` · `CLAUDE_COWORK_PROMPT_P0.md` · `BRUTAL_AUDIT_2026-07-29.md`
