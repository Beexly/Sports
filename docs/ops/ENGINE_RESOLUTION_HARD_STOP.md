# Engine resolution hard stop (self-correction)

**Do not enable maps or claim PROVEN while this note is active.**

## Trigger
After MODEL_VERSION independent ranking (v5.2.0) and selective filters are live, if holdout selective Murphy RES remains **< 0.02** on canonical non-seed WIN/LOSS:

> Engine resolution insufficient — need sport-specific models / new independent features. Maps will not unlock PROVEN.

## What is already done
- Selective + pause default ON
- Score bake-off including independent_trueProb / blend_indep_conf
- Poisson + Elo independents wired from real TeamGameLog
- Ranking priced only on SPEAK|LEAN

## Next code levers (not map theater)
1. Sport-specific models (NFL expected metrics → independent fair value)
2. Stronger market-relative features when odds warm
3. Drop dead groups permanently from public path
4. Only then: holdout map bake-off; then GREEN×K + one-time AUTO_PUBLISH

## Forbidden
- Lowering Brier/ECE/Res floors
- CALIBRATION_PUBLISHED while RED
- Public ROI / verified / PROVEN copy while RED
- Deleting THE_ODDS_API_KEY / inventing dual-path free lines
