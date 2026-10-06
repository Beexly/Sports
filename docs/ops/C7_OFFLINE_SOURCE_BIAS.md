# C7 — Offline source-bias / feature hygiene

**Status:** harness scaffold (measurement only)  
**Code:** `apps/web/lib/features/offline-source-bias-hygiene.ts`  
**Tests:** `apps/web/lib/features/offline-source-bias-hygiene.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/features/offline-source-bias-hygiene.test.ts
```

## Done when

- Flags high missingness, near-constant, market-leakage-suspect columns
- No production feature drops without founder OK

## Next

Run against real feature-store snapshots; park/defense columns after MLB join exists.
