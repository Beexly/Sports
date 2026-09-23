# C2 — Offline strength-feature bake-off

**Status:** harness landed (measurement only)  
**Code:** `apps/web/lib/ratings/offline-strength-feature-bakeoff.ts`  
**Tests:** `apps/web/lib/ratings/offline-strength-feature-bakeoff.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/ratings/offline-strength-feature-bakeoff.test.ts
```

Or call `runOfflineStrengthFeatureBakeoff(OFFLINE_STRENGTH_BAKEOFF_FIXTURE)` / your settled rows mapped to `OfflineStrengthRow`.

## Done when

- Vitest green on fixture
- Table compares `current` / `elo` / `btl` / `pi` / `market` on Brier, logLoss, MAE (+ MAE deltas)
- No production rating swap, no `MODEL_VERSION` change, no gate flips

## Do not

- Swap live learner or rating system without founder OK
- Re-search arXiv for this category (anchors: 2405.10247, 2408.08331)

## Next (not this unit)

Feed identical-row settled picks with real Elo/BTL/pi differentials from the feature store when available.
