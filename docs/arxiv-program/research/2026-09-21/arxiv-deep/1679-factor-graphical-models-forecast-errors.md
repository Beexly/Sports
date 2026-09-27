# Combining Forecasts with Factor Graphical Models (Lee & Seregina, 2020)

## 1. Citation and full-text verification
- **arXiv ID:** 2011.02077 (full text fetched from ar5iv on 2026-09-22 — Tae-Hwy Lee & Ekaterina Seregina, "Combining Forecasts with Factor Graphical Models")
- **Full text read:** complete, 1,407 extracted lines (Abstract → §1 Introduction → §2 Graphical Models for Forecast Errors (GLASSO, nodewise regression) → §3 Approximate Factor Models for Forecast Errors → §4 Factor Graphical Models (Factor GLASSO, Factor MB algorithms, tuning via EBIC/GIC) → §5 Asymptotic Properties (consistency of weights and MSFE) → §6 Monte Carlo → §7 Macroeconomic forecasting application (McCracken–Ng data) → §8 Conclusions → Appendix → References)
- **Cross-reference check:** not in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits). Note: this is the *static* foundational paper by the same authors whose regime-dependent extension (2209.01697) is ledger 1675 — read as the base method, with 1675 as the break-aware upgrade.

## 2. Problem and method
**Problem:** Optimal combination weights w=Θι/(ι′Θι) need the forecast-error precision matrix Θ=Σ⁻¹. Graphical models (GLASSO, nodewise regression) estimate Θ directly under a sparsity assumption — but forecast errors move together through common factors (forecasters using the same public information jointly over/understate), so Θ is NOT sparse: all error pairs are partially correlated through the factors. The paper's diagnostic (Figures 2–3) shows plain GLASSO under factor structure shrinks almost all partial correlations to zero, degenerating the estimate.
**Method — Factor Graphical Model (FGM):** model errors as e_t=Bf_t+ε_t (approximate factor model, q factors), estimate factors/loadings by PCA, apply the graphical model to the *idiosyncratic residuals* ε̂_t (where sparsity is credible), and reconstruct the full precision via Sherman–Morrison–Woodbury. Two variants: Factor GLASSO (Algorithm 3) and Factor nodewise regression / Factor MB (Algorithm 4). Tuning: EBIC (η=1) for the GLASSO λ (computationally efficient, consistent in high dimensions; CV overfits per Liu et al. 2010, STARS overselects per Zhu & Cribben 2018); GIC for nodewise regression λ_j.

## 3. Core equations
- **Factor error model (3.1):** e_t = Bf_t + ε_t; Σ = BΣ_fB′ + Σ_ε.
- **Optimal weights (3.7):** w = Θι_p/(ι_p′Θι_p); MSFE(w,Σ)=w′Σw. Weight-estimation error bound (3.9): ‖ŵ−w‖₁ controlled by ‖(Θ̂−Θ)ι‖₁ — precision-matrix consistency ⟹ weight consistency.
- **SMW reconstruction (4.1/4.3):** Θ = Θ_ε − Θ_εB[Θ_f + B′Θ_εB]⁻¹B′Θ_ε (sample analogue in 4.3).
- **Factor GLASSO (4.2):** Θ̂_{ε,λ} = argmin trace(W_εΘ_ε) − logdet(Θ_ε) + λΣ_{i≠j}d̂_{ε,ii}d̂_{ε,jj}|θ_{ε,ij}|, W_ε=Σ̂_ε+λI.
- **EBIC tuning:** λ_EBIC = argmin_λ {−2l(Θ_{ε,λ}) + log(T)·df(Θ_{ε,λ}) + 4·df(Θ_{ε,λ})·log(p)·η}, η=1.
- **Theorems (§5):** consistency of Θ̂ in operator and ℓ₁/ℓ₁ norms, of ŵ in ℓ₁, and of the estimated MSFE.

## 4. Datasets and empirical results
- **Monte Carlo (100 sims):** Factor GLASSO and Factor MB dominate EW, plain GLASSO, and plain nodewise regression in precision-matrix error and weight error; notably Factor GLASSO's *weights* converge faster even though Factor MB's precision matrix converges faster in matrix norms. EW's weight estimate shows no convergence (Smith & Wallis 2009: EW not theoretically optimal) yet remains decent on MSFE. FGM wins even in a low-dimensional setup deliberately favorable to EW/non-factor methods.
- **Macro application (McCracken–Ng 128 monthly series, 1960:01–2020:07, T=726; rolling 120-obs window; p=120 FAR models; 7 indicators: INDPRO, S&P500, CPI, consumption, M1, UNRATE, FEDFUNDS):** Factor GLASSO and Factor MB beat EW, GLASSO, and nodewise regression across horizons; the factor benefit is *larger at longer horizons* (h≥2); Factor GLASSO > Factor MB for most series. Smoking gun: plain GLASSO is *worse* than EW for FEDFUNDS, while Factor GLASSO beats EW — the gain comes from the factor structure, not from graphical models per se. Number of error factors q chosen by Bai–Ng IC1 (usually q̂=1).

## 5. GSE application
This is the deployable static core of ledger 1675's RD-FGL — and for GSE's short samples (18 games/season, break detection is data-hungry) it is arguably the *first* version to implement: strip common error factors from GSE's component-model error panel (market-wide mispricing weeks, weather slates, injury-wave weeks that make all models err together), estimate the sparse idiosyncratic precision with GLASSO tuned by EBIC, reconstruct full Θ via SMW, and compute Bates–Granger weights w=Θι/(ι′Θι). The paper's diagnostic is a direct warning to GSE: never run vanilla GLASSO on raw model-error precision — it degenerates under the common-factor structure that GSE's shared data inputs (ledger 1677) guarantee. Two GSE-specific predictions to test: (a) factor benefit grows with horizon ⇒ FGL should help GSE's multi-week/futures ensembles more than single-game; (b) q̂ will likely be small (1–2), matching the macro finding. Deploy static FGL now; add 1675's regime-dependent extension once enough post-break data accumulates.

## 6. Implementation notes
- Pipeline: PCA on model-error panel → choose q by Bai–Ng IC1 → residuals ε̂_t → weighted GLASSO (Friedman et al. 2008 block-coordinate descent) with λ by EBIC (η=1) over a grid → SMW reconstruction → weights w=Θ̂ι/(ι′Θ̂ι).
- Use weighted (correlation-scaled) GLASSO as in (2.1)/(4.2), not the unweighted form — the paper's Algorithms 1–3 are explicit.
- The low-dimensional finding (FGM wins even when p small) matters for GSE: works with a handful of component models, not just big panels.
- Watch: PCA factor estimates add noise at small T; the paper's simulations start at modest T and still win, but validate on GSE's actual sample sizes.

## 7. Tests and evaluation
On GSE backtests: (a) replicate the paper's diagnostic — run plain GLASSO on component-model error precision and check whether the estimated partial-correlation histogram degenerates (if yes, factor structure confirmed); (b) compare out-of-sample MSFE/log-score of EW vs Factor GLASSO vs plain GLASSO at 1-game and multi-week horizons, expecting the FGL edge to grow with horizon per the paper; (c) verify the FEDFUNDS-style smoking gun: find a market where plain GLASSO < EW and check that Factor GLASSO > EW there; (d) track q̂ (Bai–Ng IC1) across seasons — stability of q̂≈1–2 supports the static version, drift supports upgrading to 1675's regime-dependent version. Pass criterion: Factor GLASSO beats EW and plain GLASSO out-of-sample, with the edge widening at longer horizons.

## 8. Strengths
- Identifies and *demonstrates* (not just asserts) the failure mode of plain graphical models under factor structure — the diagnostic figure pair is the paper's most transferable insight.
- Complete theoretical package: consistency of precision, weights, and MSFE.
- Honest simulation design: tests FGM in a low-dimensional setup biased *against* it, and still wins.
- Clear tuning guidance (EBIC η=1; GIC for nodewise) grounded in the high-dimensional selection literature.
- The static version is the practical one for short samples — 1675's own results (static FGL better for stable unemployment) reinforce this.

## 9. Limitations and risks
- Static loadings: no break adaptation — superseded by ledger 1675 when breaks are detectable; GSE must decide per-market which version applies.
- Gaussian/linear factor assumptions; approximate factor structure still assumes weak idiosyncratic correlation — may fail if GSE models share idiosyncratic quirks (see ledger 1677's star-topology warning).
- PCA factor estimation at small T adds noise; q̂ selection (Bai–Ng) can be unstable in short panels.
- Weights are unconstrained optimal (Bates–Granger) — can produce extreme/negative weights; consider convex constraints (Conflitti et al. 2015, cf. ledger 1676) in production.
- Macro evidence only; no sports validation.

## 10. Comparison to prior art
vs **plain GLASSO (Friedman et al. 2008) / nodewise regression (Meinshausen–Bühlmann 2006)**: FGM fixes their degeneracy under factor structure — the paper's central contribution.
vs **Diebold–Shin (2019) partially-egalitarian LASSO**: both attack the combination puzzle; FGM models the error dependence explicitly rather than shrinking toward egalitarian weights.
vs **2209.01697 / ledger 1675 (same authors)**: that paper adds regime-dependent loadings and break detection; this is the static base — simpler, less data-hungry, better for stable regimes.
vs **1676 (global combination)**: that paper shares *weights* across related tasks; this paper models *error dependence* within one task. Orthogonal and combinable.
vs **1677 (network pooling)**: that paper's star-topology variance warning is the theoretical reason FGM's factor structure exists in GSE's ensemble.

## 11. Novelty
First precision-matrix estimator for forecast errors that handles the factor structure: factor-model residualization + sparse graphical estimation + SMW reconstruction, with proven consistency of the resulting combination weights and MSFE.

## 12. Reading difficulty
Medium-high: econometric theory with high-dimensional statistics (concentration, EBIC consistency); the algorithms (3–4) are implementable from the text. The diagnostic figures (2–3) convey the core point without the proofs.

## 13. Related papers
- Bates & Granger (1969): optimal weights; Smith & Wallis (2009): estimation uncertainty vs EW.
- Friedman et al. (2008): GLASSO; Meinshausen & Bühlmann (2006, 2010): nodewise regression.
- Bai (2003); Bai & Ng (2002): factor estimation and q selection; Stock & Watson (2002).
- Brownlees et al. (2018); Barigozzi et al. (2018); Koike (2020): factor + graphical models in finance.
- Lee & Seregina (2023, ledger 1675): regime-dependent extension.
- Foygel & Drton (2010): EBIC; Callot et al. (2019): GIC for nodewise.

## 14. GSE value
The directly deployable static version of factor-aware ensemble weighting: strip common error factors from GSE's model panel (which its shared inputs guarantee exist), estimate sparse idiosyncratic precision by EBIC-tuned GLASSO, and form optimal weights — with a built-in diagnostic (plain-GLASSO degeneracy check) to confirm the factor structure is present, and the empirical prediction that the payoff is largest at longer horizons.

**Verdict:** ADAPT
