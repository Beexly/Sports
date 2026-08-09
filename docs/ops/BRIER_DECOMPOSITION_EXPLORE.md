# Brier score decomposition techniques (explore)

## Murphy decomposition
\[
\mathrm{Brier} = \underbrace{\mathrm{REL}}_{\text{calibration}} - \underbrace{\mathrm{RES}}_{\text{resolution}} + \underbrace{\mathrm{UNC}}_{\text{uncertainty}}
\]

| Term | Meaning | GSE use |
|------|---------|---------|
| Reliability (REL) | Forecasts ≠ observed rates | Platt/Temp/PAVA target |
| **Resolution (RES)** | Forecasts separate outcomes | **PROVEN bottleneck** (~0.002 live) |
| Uncertainty (UNC) | Base-rate variance | Context only |

## Techniques
1. **Binned Murphy** (equal-width / equal-mass) — production eligibility
2. **Yates / Sanders** variants — research comparison
3. **Two-group separation** mean(p\|win) − mean(p\|loss) — quick ranking proxy
4. **AUC / log-loss** alongside Brier on selective tails
5. **Group-wise Murphy** sport\|market — pause Res≈0 groups
6. **Selective-publish conditional Brier** — Res on filtered subset

## Law
Maps reduce REL; they **cannot invent RES**. Raise ranking first, then calibrate, then GREEN×K + AUTO_PUBLISH.
