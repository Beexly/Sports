# ORBIT UNLOCK — founder click checklist (2026-07-31)

Code is ready. These steps require human portals / secrets. Agents do not invent values.

## 1. Free settlement path (money recovery)

1. Vercel → Project → Settings → Environment Variables → **Production**
2. **Delete** `THE_ODDS_API_KEY` (blank/absent). Present + deactivated does **not** free-path.
3. Redeploy Production (or wait for env-only sync + next cron).
4. Smoke:
   ```bash
   curl -sS -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.galaxysportsedge.com/api/cron/settle-picks" | jq '{ok,path,picksSettled,picksHeld}'
   ```
   Expect `"path":"free"`. Cadence: every 3h (`vercel.json` → `0 */3 * * *`, #278).

## 2. Stripe Dashboard

- Endpoint URL: `https://www.galaxysportsedge.com/api/webhooks/stripe` (**www**, not apex)
- Events must include: `checkout.session.completed`, **`checkout.session.expired`**, subscription + invoice events (see `STRIPE_GO_LIVE_CHECKLIST.md`)
- `STRIPE_WEBHOOK_SECRET` must match **this** endpoint signing secret (`whsec_…` / endpoint id `we_…`)
- Sustained **400** = wrong secret. Sustained **503** = DB down (retries are intentional)

## 3. Paid entitlement path smoke

1. Browser network tab → Subscribe to Pro (test or live carefully)
2. If checkout returns **409**, run:
   ```bash
   curl -sS -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.galaxysportsedge.com/api/cron/reconcile-entitlements"
   ```
3. Confirm webhook Recent Deliveries = 2xx after secret match

## 4. Credits claim (founder portals)

See [`CREDITS.md`](./CREDITS.md) — Neon, Vercel, Anthropic, OpenAI, AWS. Status column is for you to fill.

## 5. Explicit non-actions (law)

- Do not re-enable `/api/cron/gamma` without counsel registry grant
- Do not flip LIVE_BOARD / PUBLISH_LEDGER without founder YES
- Do not rewrite webhook/outbox/CheckoutAttempt

## Code already shipped

| Surface | Path |
|---------|------|
| Free settle | `apps/web/app/api/cron/settle-picks/route.ts` |
| Expired session | `apps/web/app/api/webhooks/stripe/route.ts` |
| CheckoutAttempt stamp | `apps/web/lib/stripe.ts` |
| Clearance honesty | `apps/web/lib/data-sources/source-router.ts` |
| Skills | `docs/agent-skills/` |
| Agent eval | `npm run agent:eval` |
| Pricing smoke | `npm run e2e:pricing-smoke` |

## 6. Calibration R&D (after export has volume)

1. `npm run export:settled-picks` (needs real DATABASE_URL)
2. Fit `centeredIsotonicCalibration` via `timeHoldoutSplit` (train only)
3. Report `selectedSliceEce` on the +EV slice (calibration paradox)
4. Gate any stake display on CLV sample floor (edge-lab CLV deflator)
5. Offline dry-run: `npm run calibration:offline`
6. See [`CALIBRATION_PIPELINE.md`](./CALIBRATION_PIPELINE.md)

## Code index (wave 3)

| Surface | Path |
|---------|------|
| Orbit map | `docs/ops/ORBIT_MAP.md` |
| Next 50 repos | `docs/ops/ORBIT_NEXT_50.md` |
| CIR calibrator | `centeredIsotonicCalibration` in prediction-engine |
| Time hold-out / paradox | `timeHoldoutSplit`, `selectedSliceEce` |
| Offline calibration | `scripts/calibration-offline/` · `npm run calibration:offline` |
| Calibration skill | `docs/agent-skills/calibration-pipeline/SKILL.md` |
| DSPy skill offline | `scripts/dspy-gse/` |
| Coding skill | `docs/agent-skills/coding-agent/SKILL.md` |
| Polymarket hold skill | `docs/agent-skills/polymarket-hold/SKILL.md` |

| Session 2 extract | `docs/ops/SESSION_2_EXTRACT.md` |
| gse_metric / GEPA config | `scripts/dspy-gse/` |
| CIR→Kelly bridge | `sizeAfterCalibration` |
| Portfolio Kelly barrel | `portfolioKellyStakes` export |

| Free Edge Index embed | `/embed/edge-index/[gameId]` · `/edge-index` |
| Full session extract | `docs/ops/FULL_SESSION_EXTRACT.md` |
| Integrity harness | `npm run orbit:integrity` |

## 7. Max leverage smoke (no invented secrets)

```bash
npm run orbit:unlock-smoke
# With production secret you hold:
# CRON_SECRET=… npm run orbit:unlock-smoke -- --prod
```

See [`MAX_LEVERAGE.md`](./MAX_LEVERAGE.md).

