# C1 — Offline per-sport generative bake-off

**Status:** harness landed (measurement only)  
**Code:** `apps/web/lib/calibration/offline-generative-bakeoff.ts`  
**Tests:** `apps/web/lib/calibration/offline-generative-bakeoff.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/calibration/offline-generative-bakeoff.test.ts
```

Or call `runOfflineGenerativeBakeoff(OFFLINE_BAKEOFF_FIXTURE)` / your settled rows.

## Done when

- Vitest green on fixture
- Optional: feed identical-row settled picks mapped to `OfflineBakeoffRow`
- No publish wiring, no gate flips

## Next (not this unit)

Wire a `scripts/ops` CLI that loads settled book-priced rows from DB when available.
