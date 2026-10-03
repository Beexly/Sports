# Cron auth hardening

## Modes

| Mode | Who | Use |
|---|---|---|
| `dual` (default) | Bearer **or** `x-vercel-cron:1` on `VERCEL=1` | board-fill, refresh-odds, free-spine, signal, calib |
| `bearer_only` | Bearer only | autonomy-cycle when execute enabled |

Env `CRON_REQUIRE_BEARER=true` forces bearer globally (founder opt-in).

## Why dual still exists

Vercel schedules inject `x-vercel-cron`. When `CRON_SECRET` is set, Vercel **should** also send `Authorization: Bearer $CRON_SECRET`. Dual keeps board fill unblocked if Bearer is misconfigured.

## Spoof risk

`x-vercel-cron` is not cryptographic. Anyone can send the header against Production.

Mitigations:

1. Autonomy execute path is **Bearer-only** when `AUTONOMY_EXECUTE=true` or `?execute=1`
2. Autonomy never flips PERFORMANCE_STATS / LIVE_BOARD / PUBLIC_PICKS / PUBLISH_LEDGER
3. Optional `CRON_REQUIRE_BEARER=true` after verifying Vercel Bearer injection

## GH Actions External Cron

Currently failing (no runners). Accept **Vercel-only** until Actions minutes restored. Do not invent a second scheduler.
