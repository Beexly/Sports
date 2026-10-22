# Matchup refusal contract port

## Files created

- `apps/web/lib/intelligence/matchup-contract.ts`
- `apps/web/lib/intelligence/matchup-contract.test.ts`

## Verification

Ran the requested command from `C:\Users\Garrett\Sports-wt-pick-gate\apps\web`:

```text
node C:/Users/Garrett/Sports/node_modules/vitest/vitest.mjs run lib/intelligence/matchup-contract.test.ts --reporter=dot
```

Result: **1 test file passed; 9 tests passed; 0 failed.**

## Port boundary

Ported the refusal behavior from `claude/edge-map-rebuild-2026-06-04`:

- The empty `source-error` factory shape and explicit withholding note.
- Gating checks for missing, errored, and empty-success player-model or schedule inputs.
- Non-gating treatment of missing or errored environment and pressure-coverage enrichment.
- A leaf result that stays `delta: null` / `grade: "unknown"`, and a `matchupsRead` count based only on non-null deltas.
- `canPublishProjections: false` for both source-error and live results.

The numeric matchup engine was not ported. In particular, `MAX_DELTA`, `W_DEF_EPA`, `POS_SENSITIVITY`, reference bands, and all weighted-delta arithmetic remain excluded because they lack out-of-sample evidence. The module performs no I/O and contains no network, database, or fetch logic.
