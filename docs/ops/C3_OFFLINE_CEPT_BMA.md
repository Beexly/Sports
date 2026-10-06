# C3 — Offline CEPT / BMA weight proposal

**Status:** harness scaffold (proposal only)  
**Code:** `apps/web/lib/ensemble/offline-cept-bma-weights.ts`  
**Tests:** `apps/web/lib/ensemble/offline-cept-bma-weights.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/ensemble/offline-cept-bma-weights.test.ts
```

## Done when

- Vitest green on fixture
- Softmax BMA-style weights from per-expert mean loss
- No production ensemble write, no `MODEL_VERSION` change

## Do not

- Auto-apply weights to live scoring without founder OK
- Flip gates

## Next

Feed real per-sport expert losses from C1 bake-off outputs.
