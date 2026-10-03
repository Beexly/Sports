# Bayesian nonparametrics — offline research only (GSE)

**Hard line:** DP-GMM · HDP · CRF · PYP · stick-breaking · CRP → **notebooks / offline EDA**.  
**Production maps:** Temp · Platt MAP IRLS · isotonic PAVA/CIR · **EB-τ** group intercepts.  
**PROVEN:** raise Murphy **RES** (selective publish, engine ranking) — not process priors.

---

## DP-GMM (Dirichlet process Gaussian mixture)

Finite GMM: fixed \(K\). DP-GMM: \(K\to\infty\) under DP prior; data choose occupied components.

\[
G\sim\mathrm{DP}(\alpha G_0),\quad
\theta_i=(\mu_i,\Sigma_i)\sim G,\quad
x_i\sim\mathcal N(\mu_i,\Sigma_i)
\]

Stick-breaking mixture equivalent.  

| Use | Limitation |
|-----|------------|
| Density estimation, unsupervised clusters | Label switching |
| Unknown # of Gaussian regimes | MCMC/VI; sensitive to \(\alpha,G_0\) |
| Offline EDA of residuals / features | **Bad as versioned calibration map** |

**GSE:** optional residual/feature EDA. Not production \(p\) (use Platt / isotonic / EB-τ).

---

## HDP (hierarchical Dirichlet process)

\[
G_0\sim\mathrm{DP}(\gamma H),\quad G_j\sim\mathrm{DP}(\alpha G_0)
\]

Shared atoms; group-specific weights. Independent DPs invent different \(\theta\) for the “same” regime; HDP reuses \(\theta_c\) with different frequencies.

| Application | Group \(j\) | Shared atom |
|-------------|-------------|-------------|
| HDP-LDA | Document | Topics |
| Speaker adaptation | Session | Acoustic states |
| Multi-task | Task / site | Latent types |
| Sports research | sport\|market | Calibration regimes |

**GSE:** research on shared miscalibration across leagues. Production prefers **named groups + Gaussian \(u_g\)** for audit + frozen JSON. HDP does **not** fix Res≈0.

---

## Chinese Restaurant Franchise (CRF)

Sequential story for HDP:

| Metaphor | Object |
|----------|--------|
| Franchise menu | Global dishes \(\theta_c\) |
| Restaurant | Group (sport\|market) |
| Table | Local cluster |
| Customer | Settled pick / residual |

New table picks dish ∝ franchise-wide dish use (or new dish ∝ \(\gamma\)).

**Mapping:** restaurant = sport\|market · customer = residual · dish = latent regime params.

---

## Pitman–Yor process (PYP)

DP with discount \(d\in[0,1)\), concentration \(\alpha>-d\):

| | DP | PYP |
|--|----|-----|
| Params | \(\alpha\) | \(\alpha,d\) |
| New table | \(\propto\alpha\) | \(\propto\alpha+d\cdot K_n\) |
| Existing | \(\propto n_k\) | \(\propto n_k-d\) |
| Tail | Exponential-ish | Power-law (more small clusters) |

Stick-breaking: \(v_c\sim\mathrm{Beta}(1-d,\alpha+cd)\); \(d=0\Rightarrow\) DP sticks.

### Discount \(d\) effects

| \(d\) | Effect |
|-------|--------|
| \(=0\) | Standard DP |
| ↑ toward 1 | More tables; heavier tiny-cluster tail |
| High \(d\), low \(\alpha\) | Many rare types, few dominant |

Expected #clusters \(\sim n^d\) for \(d>0\) vs \(\alpha\log n\) for DP.  
Calibration EDA: low \(d\) (0–0.25) preferred offline; high \(d\) → every thin market wants own atom — doesn’t freeze for audit.

### Discounted power-law domains (offline)

Language Zipf · topic tails · network communities · species · **sports residual regimes** (few big + many singleton markets).

---

## CRP seating (DP = PYP with \(d=0\))

- Join table \(k\propto n_k\); new \(\propto\alpha\)  
- PYP: join \(\propto n_k-d\); new \(\propto\alpha+d K_n\)  
- CRF extends across restaurants with shared franchise menu (HDP)

---

## Stan: truncated finite approximation

Stan has no native infinite CRP. Use **truncated stick-breaking** or **symmetric Dirichlet** mixture as practical DP approx (see research notebooks; **not** in `apps/web` apply path).

---

## Offline vs production (non-negotiable)

| | Offline research | Production (GSE) |
|--|------------------|------------------|
| Goal | Discover structure | Stable, auditable, shippable \(p\) |
| OK tools | DP, PYP, HDP/CRF, DP-GMM, NUTS, stick-breaking | Temp, Platt MAP IRLS, isotonic, EB-τ \(u_g\) |
| Group keys | Latent ids (can switch) | Fixed sport\|market |
| Versioning | Notebooks | JSON + modelVersion + dateRange |
| PROVEN | Does **not** unlock | Brier/ECE/Res floors + GREEN×K |
| Runtime | Batch / Stan / Python | Node cron; never edge fit |
| Apply | N/A | adjustments default **OFF** |

```
Need power-law many rare clusters?  → PYP offline (watch d)
Need shared regimes across markets? → HDP/CRF offline
Need shippable calibrated p?        → Platt/Temp/isotonic + EB-τ
Need PROVEN?                        → raise RES (engine + selective publish)
```

## Code enforcement
- No DP/HDP/PYP fitters in production apply path
- `hierarchical-eb-tau.ts` / `platt-map.ts` notes: **No Dirichlet process in prod path**
- Full Bayes non-centered hierarchical Platt: offline NUTS only (`PLATT_HIERARCHICAL_FULL_POSTURE.md`)
