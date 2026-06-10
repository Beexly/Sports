# Prod Probe Repair

Date: 2026-06-09

## Result

Probe script repaired, but deploy verification still fails correctly.

Command:

`$env:APP_URL='http://localhost:3211'; node scripts/prod-probe.mjs`

## Post-Fix Probe Summary

| Probe | Result |
|---|---|
| `/api/live` | OK 200 |
| `/api/health` | OK 200 with sanitized degraded dependency summary |
| `/api/ready` | FAIL 503 |
| `/` | OK 200 |
| `/board` | OK 200 |
| `/ledger` | OK 200 |
| `/methodology` | OK 200 |
| `/pricing` | OK 200 |
| `/api/ready?check=ingestion-freshness` | FAIL 503 |
| `/api/board/state` | OK 200 |
| `/api/board/state?check=book-depth` | OK 200 |
| `/api/board/state?check=edge-index` | OK 200 |
| `/api/calibration` | OK 200 |
| `/journal/rss.xml` | OK 200 |
| `/api/picks?check=public-picks-gate` | OK expected 503 gate |
| `/api/performance?check=performance-gate` | OK expected 503 gate |

## Interpretation

The public 500s are fixed. The probe still fails because `/api/ready` is doing its job: DB and ingestion dependencies are unavailable in this local runtime.

## Required Next Step

Verify a real production-like DB and ingestion environment, then rerun:

`$env:APP_URL='<production-or-staging-url>'; node scripts/prod-probe.mjs`

Launch remains NO-GO until `/api/ready` and ingestion freshness are 200.
