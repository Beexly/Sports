# Deploy lag (2026-08-06)

## Live evidence (agent probe)

| Source | Value |
|--------|-------|
| Production `/api/health` deployment.sha | `2d0f3a21a38e87d350129eccd2bfb1478b4bda74` |
| Main HEAD (post #306 date-target free settle) | newer than `2d0f3a2…` |
| Settlement overdue | **CRITICAL 139 / 1478** while SHA stuck |

Code on main (hourly settle, free-path CLV + repair, date-targeted free scores,
SNAPSHOT wire, ops deploy markers) **cannot burn overdue until production redeploys**.

## Founder action (highest leverage — do this first)

1. Vercel → Sports web project → **Redeploy** latest production from `main`
2. Confirm:
   ```bash
   curl -sS https://www.galaxysportsedge.com/api/health | python3 -c \
     "import sys,json; d=json.load(sys.stdin); print(d.get('deployment')); print(d.get('status'))"
   ```
   SHA must **not** stay on `2d0f3a2…`
3. Then with CRON_SECRET:
   ```bash
   CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com \
     node scripts/ops/verify-cron-secret.mjs
   curl -sS -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.galaxysportsedge.com/api/cron/settle-picks" | python3 -m json.tool | head -100
   ```
4. Watch `picksSettled`, `clvRepair`, `snapshotRepair`, `scoreDates`, then ops `overduePending` down

## Law
Code on main is not live until Vercel serves that SHA. Always probe `deployment.sha` before concluding settlement code "failed."
