# C4 — Offline CLV ↔ Brier diagnostic

**Status:** harness scaffold (measurement only; soft-blocked on live line archive)  
**Code:** `apps/web/lib/clv/offline-clv-brier-diagnostic.ts`  
**Tests:** `apps/web/lib/clv/offline-clv-brier-diagnostic.test.ts`

## Run

```bash
cd apps/web && npx vitest run lib/clv/offline-clv-brier-diagnostic.test.ts
```

## Done when

- Vitest green on fixture
- Reports mean CLV, beat-close rate, Brier(model/open/close), Brier delta vs close
- No publish wiring, no gate flips

## Do not

- Claim +EV from positive CLV alone without settled P&L policy
- Flip gates / invent line history

## Next

Wire identical-row open/close from line archive when available (U4 unblock).
