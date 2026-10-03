# Brier score improvement steps (ordered)

Updated: **2026-08-10** · live Brier **~0.2478** · floor **≤0.22**

## Murphy identity (what to optimize)

\[
\mathrm{BS} \approx \mathrm{REL} - \mathrm{RES} + \mathrm{UNC}
\]

Live (eligibility): REL ~0.004, RES ~0.0048, UNC ~0.248 → BS ~0.248.

**To reach BS ≤ 0.22 with residual REL ~0.02:** need **RES ≳ 0.03–0.05**.

Maps cut REL only. **RES is ranking power.**

## Ordered steps (do in this order)

### 1. Independent rankingP (primary RES)

- Prefer `independent_trueProb` over confidence/100 market echo
- Densify priced trueProb on ML/SPREAD (coverage live ~65% of eligible)
- Sources: MLB standings, nflverse EPA, ESPN FPI, Elo, Dixon–Coles, Kalshi when present
- **Never** treat edge as p (polarity law)

### 2. Selective |p−0.5| ≥ δ (live ON, δ=0.08)

- Raises Var[P|published] and conditional RES
- Integrity: BS on sit-out/paused ≈ UNC
- If Hedge warns `sitout_skill`, **lower** ambition on δ

### 3. Pause dead sport|market groups

- Significance-dead + Res≈0 groups dilute RES
- Durable `RANKING_PAUSE_APPLY` (founder YES) — live currently applies MLB ML+SPREAD
- Plan may list more (e.g. MLS); expand only with founder YES

### 4. Accumulate independent-priced settles

- Filtered GREEN path needs sample under selective+pause
- More settles → more stable RES / separation

### 5. Shadow OCO / RES-cal (secondary Var[P])

Only when underconfident (mass near 0.5) **and** holdout REL holds:

| Tool | Role |
|------|------|
| Online Beta OGD | Expand a>1 under log-loss when data support |
| Sliding-window OGD | Track non-stationary regimes |
| RES-aware Beta grid | Max val RES s.t. REL≤0.015 |
| Brier-OGD ensemble | Convex member weights |
| Hedge adaptive-δ | Advisory selective threshold |

**Apply stays OFF** until live RES floors clear.

### 6. REL maps last (Temp / Platt / Beta / isotonic)

- Live bake-off: prefer_parametric, plateau collapse ~98%, T≈1.21
- Do **not** apply PAVA — ranking collapse
- Never free-stretch

### Forbidden

- Invent PROVEN while eligibility RED  
- Lower floors / cherry-pick  
- Free stretch without outcomes  
- Flip PERFORMANCE_STATS / AUTO_PUBLISH while RED  

## Math checklist after each calib tick

1. Eligibility Brier / ECE / Murphy RES  
2. Independent coverage (ML/SPREAD)  
3. rankingPower projected RES + integrityStatus  
4. mapBakeoff: onlineBetaA, ocoPublishedRes, sliding*, hedge*  
5. Confirm publishedVarP lift only with REL guard  

## Founder-only accelerators

1. Checkout smoke (money path ready)  
2. Optional denser books (`THE_ODDS_API_KEY`)  
3. Optional expand durable pause list for remaining dead groups  

See [BRIER_OPTIMIZATION_TECHNIQUES.md](./BRIER_OPTIMIZATION_TECHNIQUES.md) · [RES_CALIBRATION_AND_OCO.md](./RES_CALIBRATION_AND_OCO.md).
