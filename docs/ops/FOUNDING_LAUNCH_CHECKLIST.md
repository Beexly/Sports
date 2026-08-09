# FOUNDING full-launch checklist (integrity)

## Money path (already on ops truth `billingMoney`)
- Stripe secret + webhook configured → `moneyPathReady`
- Dashboard webhook host must be galaxysportsedge.com only
- Pricing page + checkout API; no ROI claims on pricing

## Lead capture
- Set **`GSE_WAITLIST_GATE_ENABLED=false`** to open public `/waitlist`
- Leave gate true only while testing Basic Auth

## Picks surface
- `PUBLIC_PICKS_ENABLED=true` is OK
- 503 `stale_data` / quiet board = **honest** when last odds insert > 240m or no games
- Do **not** lower Refresh SLA or `oddsInserted>0` filter
- Empty daily-slate (0 games) is quiet board, not outage

## Performance / PROVEN
- `sample.canonicalSettled` must use non-seed counts (ops truth)
- Eligibility GREEN×K (default 3) on live Brier/ECE/Murphy floors
- One-time **`CALIBRATION_AUTO_PUBLISH=true`** (or sticky `CALIBRATION_PUBLISHED=true`)
- Performance claims only when published ∩ GREEN
- **Never** set `CALIBRATION_ADJUSTMENTS_ENABLED` without bake-off + ceremony
- **Never** claim ROI / verified / PROVEN while RED or unpublished

## ACI
- `CONFORMAL_ABSTAIN_ENABLED` default false (show/abstain only; not publish)
