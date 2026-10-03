# Sliding-window Online Beta OGD — analysis

Updated: **2026-08-10** · **Shadow only** · apply OFF

## What it is

Online Gradient Descent on Beta map \(g=\sigma(a\cdot\mathrm{logit}\,p+b)\) under **log-loss**, re-fit on the trailing chronological window (default **120** samples).

| Signal | Meaning |
|--------|---------|
| `full.a` | OGD \(a\) on entire chrono series |
| `window.a` | OGD \(a\) on last `window` samples |
| `deltaA` | `window.a − full.a` — recent regime wants more/less expansion |
| `deltaVarCal` | Var[P_cal] window − full |
| `expansionPreferred` | `full` \| `window` \| `neither` |

## How to read live fields (after next calib cron)

| Pattern | Ops read |
|---------|----------|
| `window.a > 1` and `beatsRawBrier` and `deltaVarCal > 0` | Recent sample underconfident — RES-cal candidate offline |
| `window.a ≈ 1` | Identity is fine; maps won't invent RES |
| `window.a` unstable / flips vs full | Non-stationary — prefer window for shadow diagnostics only |
| Neither beats raw Brier | **Raise independent ranking first** |

## Law

- Live eligibility stays **map-free**
- Never free-stretch \(p'=0.5+k(p-0.5)\) without outcomes
- `CALIBRATION_ADJUSTMENTS_ENABLED` stays OFF until live RES floors clear
- Sliding window is **tracking**, not a publish policy

## Modules

- `packages/prediction-engine/src/online-beta-sliding-window.ts` — `runOnlineBetaSlidingWindow`, `analyzeSlidingWindowOgd`
- Wired into map bake-off → durable `slidingWindowA` / `slidingDeltaA` / `slidingExpansionPreferred`

See [RES_CALIBRATION_AND_OCO.md](./RES_CALIBRATION_AND_OCO.md).
