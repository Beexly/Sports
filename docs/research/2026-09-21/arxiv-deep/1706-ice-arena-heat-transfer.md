# [1706] Energy analysis in ice hockey arenas and analytical formula for the temperature profile in the ice pad with transient boundary conditions (arXiv:1507.02896)

**Citation:** Ferrantelli, A., Viljanen, K. & Kurnitski, J. (2015). *Energy analysis in ice hockey arenas and analytical formula for the temperature profile in the ice pad with transient boundary conditions*. arXiv:1507.02896. URL: https://arxiv.org/abs/1507.02896
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv source, Sections 1–5 + Appendix A, ~100k chars).
**Verdict**: REJECT
REJECT — one sentence: a building-physics study of ice-rink refrigeration energy efficiency with no sports-outcome data, no weather observations used for prediction, and no transferable mechanism for GSE's prediction engine; the only portable piece (a textbook eigenfunction solution of the heat equation) is general PDE math, not weather/sports knowledge.

## 1. Research question
How is heat distributed across an ice hockey arena's ice pad during operation and resurfacing, and can an analytical (non-numerical) formula describe the transient temperature profile through the ice slab? Motivated by arena energy efficiency (refrigeration ≈ 43% of hall energy use, ~1800 MWh/yr), not by sports performance.

## 2. Dataset / schema
On-site measurements at Reebok Arena, Leppävaara, Finland (two 1624 m² rinks): heat-flux plate + Pt-100 at ice/concrete interface, thermal camera surface temps (10 s cadence), air temperature/RH stratification at 0.005–8.3 m heights. One resurfacing event: 450 kg water at 40°C spread on ice at −4.5°C surface.

## 3. Method / model
Steady-state heat-balance decomposition (radiation + convection + condensation + lighting) before resurfacing; transient heat-conduction PDE solved by eigenfunction expansion with time-dependent Dirichlet boundary conditions fitted from measurements; validated against FEM.

## 4. Equations & assumptions
- Heat equation ∂u/∂t = α_I ∂²u/∂x² on 0<x<30 mm with u(0,t)=T_S(t), u(L,t)=T_I(t).
- Solution: linear quasi-steady profile + eigenfunction series Σ{∫₀ᵗ e^(−αλₙ²(t−τ))Ŝₙ(τ)dτ + e^(−αλₙ²t)cₙ}sin(λₙx), λₙ=nπ/L.
- Assumes 1-D conduction, Dirichlet BCs known from data, constant thermal diffusivity.

## 5. Features / target
Inputs: measured surface/interface temperature time series. Target: internal ice temperature profile. No predictive modeling of any sports quantity.

## 6. Validation design
Energy-balance closure: theoretical resurfacing heat load 142.37 kJ/m² vs measured 140.49 kJ/m² (1.32% error); steady-state flux 42.87 vs 41.85 W/m²; analytical profile vs FEM at t=30 s — good agreement.

## 7. Numerical results / baselines
- Heat-load split: ceiling thermal radiation **74%**, lighting **14%**, convection ~10%, condensation ~2%.
- Resurfacing heat load: Q_w = 231.21 MJ total (Q1 water cooling 75.28, Q2 freezing 152.1, Q3 ice cooling 3.69 MJ).
- Only first ~6–7 eigenfunction terms matter; correction maximal at t=0, minimal ~50 s.
- Air strongly stratified: −3.5°C at 5 mm, +4.2°C at 5 m (ventilation supplies 25°C air at 5 m).

## 8. Code / data availability
No code or dataset shared; formulas fully specified in text.

## 9. Leakage & limitations
Single arena, single resurfacing event; boundary-condition polynomials fitted to the same event used for validation (circular); no uncertainty quantification; the "general" formula still requires measured BCs, so it predicts nothing from weather alone.

## 10. GSE overlap
None in the corpus: no other ledger covers arena refrigeration or ice thermodynamics. But no overlap is not value — there is no GSE surface that needs this. NHL ice-quality effects on totals would be the imagined application, but the paper contains no game data, no outcome linkage, and GSE's lanes are NFL/NCAA-first.

## 11. GSE implementation spec
None proposed — rejected. The conceivable adaptation (transient conduction solver for outdoor turf temperature from air-temp BCs) would require inventing the sports application, the data pipeline, and the outcome linkage from scratch; the eigenfunction method itself is textbook heat-transfer, citable from any PDE reference without this paper.

## 12. Reproducible test
Not applicable — rejected.

## 13. Acceptance / rejection gate
REJECTED because: (a) zero sports-outcome or weather-prediction content — the research question is building energy efficiency; (b) the transferable artifact is generic mathematics, not domain knowledge GSE lacks; (c) the "valuable" bar requires worth-adapting content, and adapting this would mean writing a new paper, not adapting one. Replaced by ledger 1711 (physics/0505118).

## 14. Improvement experiment
None — rejected. (If GSE ever models outdoor field-surface temperature, the correct starting point is a sports-turf agronomy paper with outcome data, not this arena-refrigeration study.)

**Verdict:** REJECT — building-physics energy study with no sports-prediction content and no portable weather/sports mechanism; replaced by 1711.
