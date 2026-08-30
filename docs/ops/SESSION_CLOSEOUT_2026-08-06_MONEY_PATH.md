# Session closeout — money path + integrity (2026-08-06)

## Live probe (pre-merge)

- `/api/health` ok; ingestion healthy; nflverse healthy
- `/api/picks` 503 (gates closed — correct)
- `/waitlist` 401 when Basic Auth gate on (expected)
- `POST /api/waitlist` validates (public API open)
- `/signup` `/register` `/login` 404 until this PR deploys
- `/contests` → `/fantasy/contests`; `/tools` 200

## Shipped in PR #353 (+ follow-up commits on same branch)

| Loop | Status |
|------|--------|
| Public leads on home/pricing | Closed in code |
| Checkout lookup_key | Closed in code |
| Webhook + reconcile recognize lookup_key | Closed (critical — prevents charged-but-FREE) |
| Auth aliases | Closed in code |
| Honest free-tier copy (no fake free picks) | Closed in code |
| Free source usage schedule | `docs/ops/FREE_SOURCE_USAGE_SCHEDULE.md` |
| Payment Link script | `scripts/ops/create-founding-payment-link.mjs` |
| Temperature scaling R&D | Closed |
| Calibration metrics cron (DB when present) | Closed internal |
| Publish checklist | Closed |
| LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS | **Unchanged OFF** |

## Still founder-only

1. Merge + deploy #353
2. Confirm Stripe prices have `gse-*` lookup_keys set
3. Sticky paid seat: run payment-link script → open URL once
4. Optional: Sentry DSN, VERCEL_TOKEN, CLAUDE_PROVIDER free-lane
5. Sign calibration checklist before any Proven talk
6. Rights fork / #258 brand / Odds spend — still reserved

## Do not redo

- nflverse adapters, Clip Lane in monorepo, CrewAI/Ollama/OpenClaw
- Gate flips without YES
