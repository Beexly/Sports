# PROVEN path — complete resolution plan (no corner cuts)

## Why RED is correct
Live class: Brier≈0.275 · ECE≈0.11 · **Murphy Res≈0.002**.  
Maps fix **REL**. **RES** requires ranking. Floors unchanged.

## Automatic engine (shipped)
Every `calibration-metrics` run:
1. Load canonical WIN/LOSS + confidence + edgeScore + sport|market  
2. **Score bake-off**: confidence vs edgeScore vs blend → pick highest Res  
3. **Group ranking** → pause Res≈0 groups  
4. **Selective sweep** δ / edge / minGroupRes → max Res with n≥100  
5. Persist plan → ops truth `provenPath` + runtime pause/δ  
6. Public picks **selective default ON** (opt-out `SELECTIVE_PUBLISH_ENABLED=false`)

## Path steps (product)
1. Publish fewer, better-separated signals (δ, pause dead groups)  
2. Prefer best ranking score for future modelProb work  
3. When odds warm: market-relative edge filter  
4. Re-settle + metrics → hope Res/Brier/ECE move  
5. GREEN×K → one-time AUTO_PUBLISH  
6. Maps only after Res moves  

## If selectiveGainRes≈0
Engine needs **new independent features** (edge engine estimators, sport models) — not more Platt/DP.

## Forbidden
Lower floors · fake PROVEN · apply maps to greenwash · invent book lines
