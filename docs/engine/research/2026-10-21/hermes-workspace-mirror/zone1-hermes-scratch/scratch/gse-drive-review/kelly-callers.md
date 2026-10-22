# Kelly Fraction Callers Report

**Target module**: `intelligence/staking/kelly.py` (and `intelligence/staking/dgp.py` which defines `kelly_fraction`)

**Prompt requirement**: Find every caller of `kelly_fraction` or the staking module under `C:\Users\Garrett\Sports-wt-pick-gate`. Say whether any caller is on the published pick path (`process-sport.ts`, `scoring.ts`, workers). If none, say **shadow**. Quote the import lines.

---

## Summary

**Result: SHADOW** — No caller of the Python `intelligence.staking` module or its `kelly_fraction` function exists on the published pick path.

---

## Python-side callers (internal to `intelligence/staking`)

| File | Import line | Role |
|------|-------------|------|
| `intelligence/staking/kelly.py:29` | `from .dgp import (..., kelly_fraction, ...)` | Uses `kelly_fraction` inside `kelly_stop_loss_backtest()` (synthetic backtest only) |
| `intelligence/staking/cvar.py:41` | `from .dgp import kelly_fraction, KELLY_FRACTION` | Uses `kelly_fraction` inside `cvar_two_layer_sizer()` (research backtest only) |
| `intelligence/staking/__init__.py:31` | `from .dgp import kelly_fraction, simulate_picks, KELLY_FRACTION` | Re-exports for the staking package API |

No other Python files in the repo import from `intelligence.staking`.

---

## Published pick path inspection

### `packages/ingestion-pipeline/src/process-sport.ts`
- **Imports**: `scoreGames`, `buildPickSignalSnapshot`, `buildPickProofReceipt`, etc. from `@sports/prediction-engine`
- **No import** of `intelligence.staking` or any Python module
- Calls `scoreGames()` (TypeScript) for pick generation

### `packages/prediction-engine/src/scoring.ts`
- **Imports**: Only TypeScript modules (`@sports/types`, `./edge-engine`, `./constants`, `./game-context`, etc.)
- **No import** of `intelligence.staking`
- Implements scoring/confidence logic; uses its own Kelly-adjacent math in `./sizing/` and `./kelly.ts`

### Workers
| Worker | Entry point | Calls |
|--------|-------------|-------|
| `workers/data-refresh/src/index.ts` | `runRefreshCycle()` → `processSport()` | Delegates to `processSport()` (same as admin trigger) |
| `workers/data-refresh/src/refresh-cycle.ts` | `runRefreshCycle()` | Calls `processSport()` from `@sports/ingestion-pipeline` |
| `workers/pick-generation/src/index.ts` | **Exits immediately** — pick generation is integrated into data-refresh | No pick generation here |

None of the workers import or call the Python staking module.

---

## TypeScript Kelly implementations (separate from Python staking)

The TypeScript codebase has its own sizing/kelly modules under `packages/prediction-engine/src/`:
- `kelly.ts` — exports `fullKellyFraction`, `americanToDecimalOdds`
- `robust-kelly.ts` — exports `robustKellyFraction` (used by `live-orchestrator.ts`)
- `sizing/` — multiple variants (`slate-mpc-staker`, `shrinkage-kelly`, `risk-constrained-kelly`, `multivariate-kelly`, `kelly-tournament`, `emc-kelly`, `drawdown-kelly`, `decoupled-kelly`, `constrained-kelly`, `conformal-kelly`, `0803-1364v2-generalized-kelly-solver`)

**None of these import from `intelligence.staking`.** They are independent implementations.

---

## Conclusion

The Python `intelligence.staking.kelly_fraction` is **shadow** — it is used only in internal research backtests (`kelly_stop_loss_backtest`, `cvar_two_layer_sizer`) and is not wired into the published pick path (ingestion → scoring → workers). The production pick path uses TypeScript sizing modules exclusively.