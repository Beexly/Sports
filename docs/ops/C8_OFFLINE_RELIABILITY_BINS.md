# C8 — Offline reliability / ECE bins

**Status:** harness scaffold (measurement only)  
**Code:** `apps/web/lib/calibration/offline-reliability-bins.ts`  
**Tests:** `apps/web/lib/calibration/offline-reliability-bins.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/calibration/offline-reliability-bins.test.ts
```

## Done when

- Equal-width bins + ECE on fixture
- No public performance publish / no PERFORMANCE_STATS flip

## Next

Wire LRD-style operator UI after C5 board honesty; feed settled book-priced rows only.
