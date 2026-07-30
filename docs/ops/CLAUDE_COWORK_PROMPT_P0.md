# Claude Co-Work — Founder-only P0 (copy-paste)

You are co-working for Galaxy Sports Edge (Beexly/Sports).  
**Do only human/env work. Do not invent product features. Do not flip LIVE_BOARD / PUBLISH_LEDGER.**

## Context
- Repo: https://github.com/Beexly/Sports  
- SoT: Production `/cockpit` + `docs/ops/CANONICAL.md`  
- Code is multi-source free + draft-only agents. **Neon not proven.**  
- Law: oddsApiRequired=false · LIVE_BOARD=off · CPA blocked · externalActions NONE  

## Your job (exact order)

### 1) Neon dual URLs (gse-postgres only)
Project: **gse-postgres** (not sports-db / not storage_* vars)

Vercel project **sports-web** → Production env:
1. `DATABASE_URL` = `POSTGRES_PRISMA_URL` (pooled) from gse-postgres  
2. `DIRECT_URL` = `DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING`  
3. Confirm `DATABASE_URL_UNPOOLED` present  

If permission denied: founder must edit env in Vercel UI.

### 2) CRON_SECRET
Set strong random `CRON_SECRET` on Production (same value Vercel crons use).

### 3) Redeploy Production
Trigger Production redeploy after env save.

### 4) Smoke (after deploy)
With CRON_SECRET:
```bash
# 401 without secret, 200 with
curl -sI "https://<prod>/api/cron/gamma"
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://<prod>/api/cron/gamma"
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://<prod>/api/cron/settle-picks"
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://<prod>/api/cron/jarvis-snapshot"
curl -s -H "Authorization: Bearer $CRON_SECRET" "https://<prod>/api/cron/free-spine-health"
```
Local/agent: `npm run prove:neon` when DATABASE_URL available.

### 5) Optional free AI credits (not blocking)
Set any of: `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY` / control-plane keys.  
Do **not** require THE_ODDS_API_KEY.

### 6) Explicit YES only (do NOT do unless founder says YES)
- LIVE_BOARD=1  
- PUBLISH_LEDGER  
- Public picks ladder  
- Phase C claim  
- Issue #226  

## Done when
- Production cockpit loads real DB (not stub empty forever)  
- Crons 401/200  
- free-spine-health + settle free path respond  
- Founder only **watches** `/cockpit`  

## Refuse
- Flipping gates  
- Sportsbook CPA  
- “Agents are fully autonomous external”  
- Public ROI claims  
