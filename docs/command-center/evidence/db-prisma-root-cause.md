# DB / Prisma Root Cause

Date: 2026-06-09

## Result

Root cause classification: BOTH env and code.

The local environment contains real-looking local Postgres database settings, so the app attempts real Prisma queries. The configured local credentials are not usable in this runtime. Before the P0 patch, several public route paths threw instead of returning controlled degraded responses.

No secret values were printed or copied.

## Evidence Checked

- Env files present: `.env`, `.env.example`, `.env.production.example`, `apps/web/.env`, `apps/web/.env.local`.
- DB client behavior: `@sports/db` uses the stub client only when `DATABASE_URL` is missing or a sentinel value.
- Runtime symptom: Prisma auth/dependency errors against local DB during build/runtime.
- Route impact: `/`, `/board`, `/api/board/state`, `/api/promotions`, and `/api/health` were affected by DB-backed code paths.

## Root Cause

| Layer | Finding |
|---|---|
| Env | A local DB URL is configured, so stub mode does not activate. The DB dependency is unavailable to this runtime. |
| Code | Public route loaders assumed DB availability and threw on dependency failures. |
| Build | Gated public surfaces still made non-critical DB calls during static generation. |
| Health | `/api/health` mixed liveness and readiness semantics. |

## Fix Applied

- Board state and pass-list loaders now return `dataStatus: "degraded"` with empty safe payloads when DB is unavailable.
- Promotions API now returns a structured empty degraded public response with no live offers or links.
- Calibration report now degrades instead of throwing.
- Performance page skips non-critical count work while the public gate is closed.
- Health split added:
  - `/api/live`: process liveness, returns 200 when app responds.
  - `/api/health`: liveness plus sanitized dependency summary, returns 200 even if degraded.
  - `/api/ready`: dependency readiness, returns 503 while DB/ingestion are unavailable.

## Production Risk

Still high until production DB and ingestion credentials are verified through `/api/ready`. The app now fails closed publicly, but deploy readiness remains red when dependencies are down.

## Required Owner Fix

Provide a working production database/ingestion environment and verify `/api/ready` returns 200 before production launch.
