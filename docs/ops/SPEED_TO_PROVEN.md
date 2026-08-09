# What speeds PROVEN (and what does not)

## Speeds it (we automate)
1. Selective publish + pause dead groups (default ON)
2. Score bake-off (confidence vs edge vs blend)
3. Historical **projection** of filtered Res (ops `provenPathProjection`)
4. Settlement + metrics crons
5. Independent modelProb / sport models when we ship them

## Does NOT speed it
- Platt / isotonic / DP (REL only; Res≈0 stays)
- Lowering floors (forbidden)
- Founder dashboard clicks (already automated away)
- Waiting without filter — filter is on; still need **better ranking or more filtered settles**

## Step-by-step (machine, not you)
1. Publish only high-conviction + non-paused groups  
2. Games finish → settle-picks  
3. calibration-metrics → Brier/ECE/Res + proven path  
4. If projected Res lifts but live still low → keep filter; more time  
5. If projection shows pathViable=false → ship modelProb features (code, not ceremony)  
6. Floors pass → GREEN×3 → AUTO_PUBLISH once  

## Isotonic / calibration plots
- Isotonic: offline bake-off only (apply OFF)  
- Reliability plot data: `reliability-plot-data.ts` for internal charts  
- Never public as “proven accuracy” while RED  
