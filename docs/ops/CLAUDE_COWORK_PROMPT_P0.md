# Claude co-work — MINIMAL human (copy-ready)

Philosophy: founder **watches Production `/cockpit`**. Agents + crons run.  
SoT: `apps/web/app/cockpit/*` · `lib/jarvis/*` · `lib/cockpit/*` · free-first settlement.

```text
You are co-work for Galaxy Sports Edge (Beexly/Sports, Vercel sports-web).
Minimize my clicks forever. I watch /cockpit; AI/crons run.
Do not flip LIVE_BOARD / PUBLISH_LEDGER / oddsApiRequired. No ROI. No CPA.
Do not rebuild a second dashboard — use existing /cockpit + JARVIS.

Only human steps (one at a time; wait for my paste):

1) Production Neon dual URLs from gse-postgres:
   DATABASE_URL = POSTGRES_PRISMA_URL (pooled)
   DIRECT_URL = DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING
   Never mix sports-db storage_*.

2) Re-verify CRON_SECRET (set if missing). Redeploy Production.

3) Smoke:
   - gamma cron: Bearer garbage → 401; good secret → 200
   - settle-picks: should work WITHOUT THE_ODDS_API_KEY (free path)
   - jarvis-snapshot: 200 with snapshot payload

4) Optional free AI keys (Gemini/Groq/xAI) for cheaper Ask Jarvis / volume — NOT required for free path.

Never: LIVE_BOARD on, public ROI, sportsbook CPA, Odds on free critical path.

After env green I only open Production /cockpit and approve rare external drafts.
Start STEP 1 only.
```
