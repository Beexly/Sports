# Platt MAP IRLS + hierarchical Bayesian extensions (GSE posture)

## One line
**Platt MAP IRLS** is a two-parameter logistic recalibration on logit-scores with a Gaussian prior, fit by Newton on Node offline — its job is **REL**, not **RES**, and it stays off the public path until ranking exists.

## Base model
\[
p_{\mathrm{cal}}=\sigma(As+B),\quad s=\mathrm{logit}(\mathrm{clip}(p_{\mathrm{raw}},\varepsilon,1-\varepsilon))
\]

| Param | Role |
|-------|------|
| \(A\) | Slope on logit. \(A<1\) compresses overconfidence; \(A>1\) sharpens |
| \(B\) | Bias/shift |

Logit-space keeps \(A\approx 1\) meaningful when already roughly calibrated.

## MAP objective
NLL + Gaussian prior. Defaults: \(\mu_A=1,\sigma_A^2=1,\mu_B=0,\sigma_B^2=1\).  
MLE = same without prior (overfits small holdouts).

## IRLS / Newton
\[
\mathbf{g}=X^\top(p-y)+\Sigma_0^{-1}(\theta-\theta_0),\quad
H=X^\top WX+\Sigma_0^{-1},\quad
\theta\leftarrow\theta-H^{-1}\mathbf{g}
\]
\(\theta=(B,A)^\top\), rows of \(X=(1,s_i)\). 2×2 inverse only. Stop \(\Delta A^2+\Delta B^2<10^{-12}\) or maxIter≈25.

### Numerics
- Stable sigmoid (± large \(z\))
- \(w_i\ge 10^{-12}\)
- Clip preds to \([\varepsilon,1-\varepsilon]\)
- Binary only (exclude PUSH)

### Data protocol
1. Canonical settled only (!bootstrap, not seed)
2. Time-ordered train/holdout
3. Fit train → score holdout Brier, ECE, Murphy REL/RES/UNC, log loss
4. Never train ECE as publish proof
5. Version artifact: `{ method, A, B, prior, nTrain, dateRange, modelVersion, scoreSpace: "logit" }`

### Runtime placement
| Do | Don’t |
|----|--------|
| Fit on Node cron / offline | Fit on Edge middleware |
| Predict = cheap \(\sigma(As+B)\) | IRLS per request |
| Gate with applyAllowed / adjustments flag | Auto-apply while Res≈0 |

## Bake-off order
Raw → Temperature → Platt → Isotonic PAVA/CIR → hierarchical EB-τ

| Method | Freedom | Risk |
|--------|---------|------|
| Temperature | \(T\) only | Can’t fix shift |
| Platt | \(A,B\) | Mild overfit if tiny \(N\) — prior helps |
| Isotonic | Monotone nonparametric | Plateaus; needs more data |
| Hierarchical + EB τ | Per-market \(u_g\) | Extra variance if groups thin |

## Hierarchical extensions

### 1. Group intercepts (standard GSE)
\[
\mathrm{logit}\,p_i = B + A s_i + u_{g(i)},\quad u_g\sim\mathcal N(0,\tau^2)
\]
- \(g\) = sport|market  
- \(\tau\) EB moment or Laplace marginal, clamp \([0.05,2]\)  
- Unseen \(g\) → \(u=0\)  
- Fit: global MAP → \(\hat\tau\) → joint MAP/ridge on \((B,A,\{u_g\})\)

### 2. Partial pooling on slope
\(A_g=A+a_g\), \(B_g=B+b_g\) — prefer intercept-only unless holdout proves slope hierarchy.

### 3. Nested sport + market
\(u_g=v_{\mathrm{sport}}+w_{\mathrm{sport,market}}\) — heavier; offline research.

### 4. Full Bayes on τ
\(\tau\sim\mathrm{HalfNormal}\) / LogNormal; NUTS; **non-centered** \(u_g=\tau z_g\). Offline only.

### 5. Hierarchical Beta–Binomial bins
Shrinks bin rates; companion to Platt, not a score-map replacement.

## Hierarchical fit recipe (MAP + EB τ)
1. \(s=\mathrm{logit}(\mathrm{clip}(p_{\mathrm{raw}}))\)  
2. Fit global \((A,B)\) MAP IRLS  
3. \(\hat u_g\) from group residuals / intercept with \(A,B\) fixed  
4. \(\tau^2=\mathrm{clip}(\mathrm{mean}(\hat u^2)-\mathrm{mean}(\mathrm{noise}),\tau_{\min}^2,\tau_{\max}^2)\)  
5. Joint MAP: design \([1,s,1_g\ldots]\) ridge \(1/\tau^2\) on \(u\)  
6. Freeze \(\{A,B,\hat u_g,\tau,\mathrm{group keys},version\}\)  
7. Predict: \(A,B,+\hat u_g\) if known else 0  
8. Holdout Brier/ECE/Murphy vs global Platt  

## Non-centered parameterization
For **full-Bayes NUTS** when \(\tau\) small: sample \(z_g\sim N(0,1)\), \(u_g=\tau z_g\) (funnel geometry).  
For **MAP + EB τ** (production candidate): non-centered is **irrelevant** (no sampling).

## Dirichlet process clustering
Optional offline EDA for “unknown regimes.” **Not** production maps: label switching, hard to version, heavy MCMC, poor PROVEN audit. Prefer fixed sport|market + EB τ.

## What is NOT a PROVEN unlock
| Idea | Why wait |
|------|----------|
| Horseshoe on many \(u_g\) | Overkill; EB τ enough |
| DP / HDP regime clusters | Unstable labels |
| Hierarchical Platt on Edge | CPU + bundle |
| Hierarchy as PROVEN unlock | Hierarchy ≠ resolution; Res≈0.002 is ranking |

## Product honesty
Platt improves **REL**. Live Murphy **RES≈0.002** → better-calibrated weak ranker, not PROVEN. Enable apply only after selective publish / sport models move RES and holdout clears floors.

## Code map
| Piece | Path |
|-------|------|
| Platt MAP IRLS | `apps/web/lib/calibration/platt-scaling.ts` |
| Versioned artifact | `platt-map-artifact.ts` / `platt-map.ts` |
| EB τ | `hierarchical-eb-tau.ts` |
| Bake-off | `calibration-map-bakeoff.ts` |
| Apply | `CALIBRATION_ADJUSTMENTS` default **false** |

## Production vs offline
| Production maps | Offline only |
|-----------------|--------------|
| Global Platt / Temp / isotonic / hierarchical EB-τ intercepts (when flagged) | Full Bayes NUTS non-centered; DP clustering; nested full Bayes |
