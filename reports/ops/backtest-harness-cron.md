# Scheduled backtest harness — activation note

Status as shipped: **built, wired, OFF.** Nothing in this change runs on a
schedule. This note is the founder-facing "how to turn it on" companion to
the fuller header comment in
`apps/web/app/api/cron/backtest-calibration/route.ts`.

## What it does

`GET /api/cron/backtest-calibration` replays SETTLED canonical picks through
the real calibration pipeline (`apps/web/lib/backtest/harness.ts` — reuses
`computeCalibration`, `groupCalibrationByModelVersion`, and
`@sports/prediction-engine`'s `brierDecomposition`; no scoring math is
reimplemented) and writes a provenance-stamped report to
`reports/calibration/` (`latest.json` + one dated file per run), so the
platform can continuously re-prove its own calibration instead of only
proving it when a human opens `/calibration`.

## Why it is off

Per the build instructions for this change, the schedule ships **inert** —
the founder flips it, not the deploy. Two independent gates:

1. **Env flag** — the route no-ops (`{ "status": "disabled" }`) unless
   `BACKTEST_HARNESS_ENABLED === "true"`. It touches neither auth, the DB, nor
   the filesystem while off.
2. **Not in `vercel.json`** — the route exists but is not registered in the
   top-level `crons` array, so Vercel never calls it on its own.

## To activate

1. Set the environment variable in the deploy env:

   ```
   BACKTEST_HARNESS_ENABLED="true"
   ```

2. Add this entry to `vercel.json`'s `crons` array:

   ```json
   {
     "path": "/api/cron/backtest-calibration",
     "schedule": "0 12 * * 0"
   }
   ```

   `"0 12 * * 0"` = weekly, Sunday 12:00 UTC. A calibration backtest is a
   slow-moving proof (settled picks accumulate over days, not minutes), so it
   does not need the daily cadence the odds/settlement crons use. Any
   Hobby-plan-safe cron string works; this is a suggested default.

3. (Optional) Point the artifact writer somewhere durable. The default is
   `reports/calibration/` under the process's working directory, which on a
   serverless deploy may be read-only/ephemeral — the write is best-effort
   and the route reports `artifact.written: false` rather than failing the
   run if it can't persist. Override with:

   ```
   BACKTEST_HARNESS_OUTPUT_DIR="/some/durable/path"
   ```

4. `CRON_SECRET` must already be set (it is — every other `/api/cron/*` route
   depends on it). No new secret is introduced.

## Verifying it worked

- `GET /api/cron/backtest-calibration` with `Authorization: Bearer
  $CRON_SECRET` returns `{ "status": "ok", "report": {...}, "artifact":
  {...} }`.
- `report.status` is `"ok"` once settled canonical picks clear
  `MIN_SETTLED_PICKS_FOR_LEARNING` (same floor `/api/performance` uses);
  otherwise `"insufficient-sample"` or `"empty"` — the harness withholds
  derived scores rather than publish a fabricated read on a thin sample.
- `report.provenance.inputsHash` / `outputHash` let you confirm two runs over
  the same settled history reproduce the identical report.

## Known limitation (by design, not an oversight)

`report.coverage.excludedCurrentSeason` will read `0` today: the harness's
unsettled-season exclusion is implemented and unit-tested
(`apps/web/lib/backtest/harness.test.ts`), but the route does not currently
populate a `season` on any pick, because no cross-sport season model exists
in this repo (only NFL/NHL ingestion code derives a season, and
`Pick`/`Game` carry no season column). Guessing at a season boundary per
sport risked silently corrupting the report, so the wiring was left inert
rather than shipped wrong — the same "never fabricate" posture as the
honest-zero sample gate.
