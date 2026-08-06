# Founder multi-domain queue (v2)

**Not a single-silo checklist.** Work top → bottom. Re-probe ops after each step.

Live truth endpoint: `GET /api/ops/public-surface-truth` → `founderNextSteps[]`

## Always-on law
LIVE_BOARD off · STATS_PUBLIC off · no ROI theater · free settle · serverless honesty

## Ordered domains

| Order | Domain | Done when |
|-------|--------|-----------|
| 1 | **Deploy** | Prod `deployment.sha` = main HEAD |
| 2 | **Settlement** | `overduePending: 0` HEALTHY (live now) |
| 3 | **Free-lane** | `creditStack.freeLaneConfigured: true` |
| 4 | **Jynx credits** | `claudeProvider` auto/cloud + maps; ledger not cash |
| 5 | **Contests/waitlist** | postgres storage (live now) |
| 6 | **Content** | podcast + newsletter archives growing |
| 7 | **Public gates** | picks/stats stay dark until proof + rights |
| 8 | **StatKing** | remains dark (research note) |

## One-session founder block (~20 min)
1. Vercel → Redeploy Production (main)  
2. Env: free-lane + `CLAUDE_PROVIDER=auto` + cloud maps you own  
3. Re-hit ops truth → confirm `founderNextSteps` shrinks  
4. Do **not** flip LIVE_BOARD / PUBLIC_PICKS / STATS  

## Code owners
- `founder-next-steps.ts` — pure queue  
- `public-surface-truth` — exposes queue  
- `FRONTIER_SURFACE_SCORECARD.md` — probe table  
- Jynx docs — free + open-weight + clouds  
