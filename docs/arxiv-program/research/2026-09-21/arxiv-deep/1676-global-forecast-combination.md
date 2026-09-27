# Globally Combining Forecasts (Eckert, Hyndman & Panagiotelis, 2023)

## 1. Citation and full-text verification
- **arXiv ID:** 2207.07318 (full text fetched from ar5iv on 2026-09-22 — Eckert, Hyndman & Panagiotelis, "Globally Combining Forecasts")
- **Full text read:** complete, 2,113 extracted lines (Abstract → §1 Introduction → §2 Global forecast combinations (framework, Propositions 1–2, task grouping, task scaling) → §3 Optimisation → §4 Synthetic experiments → §5 ECB Survey of Professional Forecasters (globalisation path, tuned comparisons, M4 appendix, forecast-combination puzzle) → §6 Conclusions → References → Appendices)
- **Cross-reference check:** not in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits)

## 2. Problem and method
**Problem:** Economic forecast combination has been stubbornly *local*: each task (variable × horizon) gets weights fit on its own data only, ignoring that tasks are related (Okun's law, Phillips curve — a forecaster's competence on growth signals competence on unemployment). Meanwhile ML learned in the 1990s that multi-task/global methods exploit task relatedness (M4 top-3 were global methods).
**Method — global forecast combination:** minimize a global loss over m tasks with a task-coupling penalty γΣₖ‖w̄−w^{(k)}‖_q^q pulling per-task weight vectors toward a shared auxiliary vector w̄ (eq. 4). γ→0 ⟹ local combination; γ→∞ ⟹ *hard* global (one weight vector for all tasks); finite γ ⟹ *soft* global (task-specific weights sharing information). γ is tuned by leave-one-out CV per task. Framework "globalises" existing schemes — Bates–Granger optimal weights (𝓦^opt), Conflitti optimal convex weights (𝓦^optcvx), Matsypura optimal equal-subset weights (𝓦^opteql) — plus extensions: task grouping (penalty per group; m groups ⟹ local), task scaling (normalize losses by per-task difficulty τ_q^{(k)}), and tandem shrinkage λ‖w‖_q^q (ridge ⟹ shrinking Σ toward I; λ→∞ ⟹ equal weights).

## 3. Core equations
- **Soft global objective (eq. 4):** min_{w^{(1)}…w^{(m)}∈𝓦, w̄} Σₖ₌₁ᵐ (w^{(k)⊤}Σ^{(k)}w^{(k)} + λ‖w^{(k)}‖_q^q + γ‖w̄−w^{(k)}‖_q^q), q∈{1,2}. Closed form for q=2: Ω_{γ,2} = (γ/m)Σ_{k,l}‖w^{(l)}−w^{(k)}‖₂² — explicitly penalizes mutual distances between task weight vectors.
- **Proposition 2:** explicit (nonlinear) solution form for optimal weights 𝓦^opt, with A^{(k)}=[Σ^{(k)}+(λ+γ)I]⁻¹; γ helps λ shrink while entering nonlinearly via the B, D correction matrices. γ=0 ⟹ Bates–Granger weights shrunk toward equal by λ.
- **Per-task tuning:** γ tuned over 10 log-spaced values (0.001–1000) per task by LOO-CV (valid when combination errors are uncorrelated, Bergmeir et al. 2018).

## 4. Datasets and empirical results
- **Synthetic (p=T=50 forecasters/samples, ρ=0.75 correlation, relatedness α∈{0,1/3,2/3,1}, m∈{2,5,10}):** hard global improves roughly linearly with relatedness but *hurts* when tasks are unrelated (worse with more tasks); soft global with CV'd γ ameliorates the unrelated case and nearly matches hard global when tasks are identical — "gets the best of both worlds regardless of whether the tasks are related". More tasks ⇒ more upside. Optimal weights benefit most from globalisation (unbounded constraint set ⇒ arbitrarily bad local estimates). Robust for T∈{25,100,150}; q=1 vs q=2 penalty makes no material difference.
- **ECB SPF (m=6 tasks: growth/inflation/unemployment × 1- and 2-year horizons; p=34 forecasters, 1999–2021):** pre-COVID (2017–2019), soft global combination beats local, hard global, AND equal weights (Table 2: cross-validated soft global MSFE/EW ≈ 0.921 average, best row). Optimal weights improve across the board when globalised + shrunk. Grouped globalisation (by variable group) also helps.
- **Forecast-combination puzzle discussion:** post-COVID (2019Q4+), results mixed (~half cases beat EW) — attributed to a structural break (F-tests: forecast-error variance differs post-COVID at 1% level for growth/inflation) with too little post-break data to re-estimate weights; authors recommend EW "until more data is available", and note soft global should catch up. This connects directly to the break-aware lens of ledger 1675 (2209.01697).
- **M4 appendix (up to 70 series, quarterly/monthly/weekly):** benefits extend beyond the SPF setting to larger task pools and higher frequencies.

## 5. GSE application
GSE's forecasting problem is inherently multi-task: spreads, totals, moneylines × teams × weeks — related tasks (a model good at totals may be good at spreads; AFC vs NFC structure). Current practice fits one weight vector per market (local) or equal-weights everything (hard global). Soft global combination is the disciplined middle: per-market-task weights shrunk toward a shared mean vector, with γ CV-tuned per task, letting the data decide how related spread/total/moneyline ensembles really are. The grouped variant maps onto GSE's structure directly: group tasks by market type (spreads / totals / ML) or by division/conference, sharing information within groups. The paper's finding that *optimal weights benefit most* from globalisation is exactly GSE's pain point (precision-matrix-based weights are unstable at 18 weeks/season). Also a candidate *solution to the forecast-combination puzzle* for GSE: soft global + shrinkage is shown to beat EW empirically — the puzzle GSE currently "solves" by defaulting to EW.

## 6. Implementation notes
- Convex QP (q=2) solvable with standard optimizers; authors used Gurobi in R. Pairwise-complete covariance estimates + nearest-PD projection handle missing forecaster data (directly relevant to GSE's unbalanced model panels across seasons).
- Standardize forecast errors by target SD before combining; task scaling τ_q^{(k)} when tasks differ in difficulty (e.g. totals vs spreads scale differently).
- Tune λ (shrinkage) and γ (globalisation) on independent validation / LOO; per-task γ allows different relatedness per task.
- Beware post-break regimes: after structural breaks with little new data, fall back to EW (paper's explicit recommendation; pair with break detection from ledger 1675).

## 7. Tests and evaluation
Replicate the paper's protocol on GSE backtests: define tasks as (market × week-block), fit local vs hard-global vs soft-global optimal/convex weights with CV'd γ, and compare out-of-sample MSFE/log-score relative to EW on held-out weeks. Test grouped variants (group by market type; group by conference). Negative control: run on 2020 (COVID-disrupted season) expecting soft-global to struggle vs EW, and on a stable season (2022) expecting soft-global to win — mirroring the paper's pre/post-COVID finding. Report the "globalisation path" (MSFE vs γ) per task as the paper's Figures 4–6 do.

## 8. Strengths
- Clean, general framework: one penalty interpolates local↔global for *any* weighting scheme; practitioners get a recipe (soft global + CV as default).
- Honest about limits: hard global can hurt; post-break performance degrades; EW recommended when data is scarce post-break.
- Validated on both synthetic (varying relatedness, sample size) and real expert forecasts, plus M4 data.
- Handles missing panel data via pairwise covariance + near-PD — practical for forecaster/model panels.
- Explicit connection to, and proposed resolution of, the forecast-combination puzzle.

## 9. Limitations and risks
- γ tuning by LOO-CV requires combination errors to be uncorrelated (Bergmeir et al. 2018) — violated under the common-error factor structure of ledger 1675; blocked/time-series CV may be needed.
- Post-structural-break weakness: the method cannot conjure weights from scarce post-break data; needs pairing with break detection.
- Optimal weights (𝓦^opt) still allow extreme positions (unbounded); convex/nonnegativity constraints remain advisable.
- Task grouping must be specified ex ante; misspecified groups share information where none exists (though soft γ limits damage).
- No distributional combination — point-forecast weights only; needs layering with probabilistic stacking (ledgers 1672–1674) for full predictive distributions.

## 10. Comparison to prior art
vs **local combination (Bates–Granger 1969; Newbold–Granger 1974; Granger–Ramanathan 1984)**: global framework strictly generalizes; soft global ≥ local in every synthetic regime tested.
vs **equal weights (Stock–Watson 2004 puzzle; Diebold–Shin 2019)**: soft global beats EW pre-break; EW remains the fallback post-break — the paper operationalizes *when* each wins.
vs **shrinkage-only (Roccazzella et al. 2022; Ledoit–Wolf covariance)**: shrinkage and globalisation are complementary; benefits persist when combined (γ acts as additional shrinkage toward the task-mean vector).
vs **M4 Montero-Manso et al. (2020)**: that method learns weights from boosted trees across thousands of series (few models, many tasks); this paper is the dual (many forecasters, few related tasks) — feasible where trees are not.
vs **hierarchical stacking (ledger 1673)**: Bayesian/probabilistic with input-dependent weights; this paper is the frequentist point-forecast multi-task analogue. Complementary, not competing.

## 11. Novelty
First general framework for *global* forecast combination in economics with a data-driven local↔global interpolation (soft global via task-coupling penalty), globalised versions of three classic weighting schemes, and the first documentation that optimal weights benefit from globalisation combined with shrinkage.

## 12. Reading difficulty
Medium: convex optimization + standard forecast-combination background; notation is careful but the core idea (penalize deviation from a shared weight vector) is intuitive. R/Gurobi code patterns make implementation clear.

## 13. Related papers
- Bates & Granger (1969); Newbold & Granger (1974); Granger & Ramanathan (1984): optimal weights.
- Stock & Watson (2004): the combination puzzle; Claeskens et al. (2016): its theory.
- Conflitti et al. (2015): optimal convex; Matsypura et al. (2018): optimal equal-subset.
- Caruana (1997): multi-task learning; Montero-Manso et al. (2020): M4 FFORMA.
- Diebold & Shin (2019): partially-egalitarian LASSO.
- Lee & Seregina (2023, ledger 1675): factor/break-aware combination — pairs with this paper's globalisation axis.

## 14. GSE value
Directly upgrades how GSE combines models across markets and tasks: replace per-market (local) or pooled (hard-global) weights with soft-global shrinkage toward a shared weight vector — CV-tuned per task, groupable by market type — shown to beat both local combination and equal weights on real expert-forecast panels. The most actionable recipe in the wave for multi-market ensemble weighting.

**Verdict:** ADAPT
