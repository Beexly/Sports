# Deploy lag (2026-08-06)

## Finding
Live `/api/health` reported deployment SHA `2d0f3a2…` while main already contained:
- hourly settle-picks + overdue-first STP (#300)
- free-path CLV grade + repair (#302)
- durable public form rate limits (#301/#302)
- ops truth detail auth

Settlement stayed **CRITICAL 139/1478** because **production had not redeployed** the drain code.

## Founder action (highest leverage)
1. Vercel → Sports web project → **Redeploy** latest production from `main`
2. Confirm `deployment.sha` on `/api/ops/public-surface-truth` advances past `2d0f3a2`
3. After redeploy, with CRON_SECRET:
   ```bash
   curl -sS -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.galaxysportsedge.com/api/cron/settle-picks" | python3 -m json.tool | head -80
   ```
4. Watch overduePending trend on ops truth

## Law
Code on main is not live until Vercel serves that SHA. Always probe `deployment.sha` before concluding settlement code "failed."
