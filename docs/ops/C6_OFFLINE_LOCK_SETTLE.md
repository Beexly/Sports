# C6 — Offline lock≠settle lifecycle timestamps

**Status:** harness scaffold (measurement only)  
**Code:** `apps/web/lib/lifecycle/offline-lock-settle-timestamps.ts`  
**Tests:** `apps/web/lib/lifecycle/offline-lock-settle-timestamps.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/lifecycle/offline-lock-settle-timestamps.test.ts
```

## Done when

- Distinguishes lock vs settle timestamps
- Flags invalid order / missing settle
- No ledger writes, no gate flips

## Next

Join to line-archive open/close for C4 CLV once archive exists.
