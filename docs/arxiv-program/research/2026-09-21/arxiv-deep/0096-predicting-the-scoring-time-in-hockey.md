# [0096] Predicting the scoring time in hockey (arXiv:1903.10889)

**Citation:** Abdolnasser Sadeghkhani, Syed Ejaz Ahmed (2019). *Predicting the scoring time in hockey*. arXiv:1903.10889v1. URL: https://arxiv.org/abs/1903.10889
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 538 lines; ar5iv HTML failed to load — some fraction layouts reconstructed from prose, marked uncertain).
**Verdict:** REJECT — Bayesian predictive-density machinery for NHL time-to-rth-goal; no credible path into GSE's NFL game-outcome/prop engine.

## 1. Research question
Can a Bayesian predictive density estimator — using ancillary information (past points, specialist opinion) expressed as a parameter restriction — predict the *time until the r-th goal* in a hockey game more accurately (KL loss / frequentist risk) than the unrestricted estimator? (Abstract; Sec. 1)

## 2. Dataset / schema
- **NHL 2017–2018 season**, Stathletes data (acknowledgement: Meghan Chayka, Jeff Goeree).
- Table 1: time elapsed (minutes) until the 3rd goal in every game, for Toronto Maple Leafs vs opponents and Montreal Canadiens vs opponents (2017–18).
- Covariates: prior-season points — Toronto R₁ = 105, Montreal R₂ = 71 (2017–18; www.nhl.com).
- Training of predictive densities on 2017–18; evaluation of prediction error on the **2016–17 season** under KL loss; frequentist-risk comparison projected to the **2018–19 season** matchup.
- **Access:** not public — proprietary Stathletes data; only the aggregated Table 1 times are printed.

## 3. Method / model
- **Waiting-time model:** time until the r-th goal is Gamma: X|λ ~ Gam(r, λ), pdf `p_λ(x) = x^{r−1} e^{−x/λ} / (Γ(r) λ^r)`, x > 0, r known, λ unknown (Sec. 2).
- **Predictive density estimation under Kullback–Leibler loss:** Bayes predictive density `q̂_π(y; x) = ∫ q_λ(y) π(λ|x) dλ` (2.3).
- **Unrestricted (Lemma 3.1 / Remark 3.2):** with non-informative prior, the predictive density reduces to the **three-parameter beta prime** (Aitchison 1975): `q̂_0(y₁; x₁) = x₁^{r₁} y₁^{r₀−1} / [B(r₁, r₀) (x₁ + y₁)^{r₁+r₀}]`, y₁ > 0 (3.14).
- **Restricted / ancillary information (Theorem 3.1):** from two independent gamma populations (the two teams' historical waiting times), impose the order restriction **λ₁/λ₂ ≥ 1** (team A at least as capable, from past points / specialist opinion). The restricted predictive density is a *weighted* version of q̂_0: `q̂_1(y₁; x₁, x₂) = [C(r₁ + r₀ − 1, x₁ + y₁, r₂ − 1, x₂) / C(r₁ − 1, x₁, r₂ − 1, x₂)] · q̂_0(y₁; x₁)` (3.15) — a **weighted beta prime** distribution; under non-informative prior it takes the explicit hypergeometric form (3.18) with regularized ₂F̃₁.
- **Application mapping (Sec. 4):** team goals N₁, N₂ modeled as independent Poisson (means scaled by prior-season points R₁, R₂ and ability parameters θ₁, θ₂) — **⚠ exact scaling formula uncertain: PDF fraction layout garbled;** equivalently, waiting times X₁, X₂ follow Gammas scaled by the points ratio — **⚠ (4.19)/(4.20) layout likewise uncertain;** the ancillary restriction used is θ₁ ≥ θ₂ (θ₁/θ₂ ≥ 1). Densities truncated to (0, 60) minutes (three 20-minute NHL periods).
- **Comparison metric:** KL prediction error `pe(q̂_i) = E[Y₁ log(q_λ(y₁)/q̂_i(y₁))]` plus frequentist risk R_KL(λ, q̂) curves.

## 4. Equations & assumptions
- Gamma pdf: `p_λ(x) = x^{r−1} e^{−x/λ} / (Γ(r) λ^r)`, x > 0 (Sec. 2; superscripts reconstructed).
- KL loss: `L_KL(q_λ, q̂₁) = ∫ q_λ(y) log(q_λ(y)/q̂₁(y)) dy` (2.1; PDF glyphs garbled, standard form).
- Frequentist risk: `R_KL(λ, q̂₁) = ∫ L_KL(q_λ(y), q̂₁(·)) p_λ(x) dx` (2.2).
- Bayes predictive: `q̂_π(y; x) = ∫ q_λ(y) π(λ|x) dλ` (2.3).
- Unrestricted predictive (3.14): `q̂_0(y₁; x₁) = x₁^{r₁} y₁^{r₀−1} / [B(r₁, r₀) (x₁ + y₁)^{r₁+r₀}]` (three-parameter beta prime).
- Restricted predictive (3.15): `q̂_1(y₁; x₁, x₂) = C(r₁+r₀−1, x₁+y₁, r₂−1, x₂)/C(r₁−1, x₁, r₂−1, x₂) · q̂_0(y₁; x₁)` (weighted beta prime).
- Inverse-gamma pdf: `f_{a,b}(t) = b^a t^{−a−1} e^{−b/t} / Γ(a)` (2.4; superscripts reconstructed); cdf via upper incomplete gamma (2.5).
- Fitted Toronto densities (Table 2, truncated to (0,60)) — **⚠ exact coefficient layouts garbled; reported as extracted:**
  - q̂_0: mode 17.92, mean 28.35, P20 14.38, P50 26.62, P90 50.30 (density shown as 1901470·y₁²/(35.85+y₁)⁶ — coefficient digits may be mis-split).
  - q̂_1: mode 28.13, mean 33.12, P20 19.06, P50 32.82, P90 53.48 (density shown as y₁²(0.055+(0.0004+10⁻⁶y₁)y₁)/(1.92+0.025y₁)⁸ — coefficient digits may be mis-split).
- Assumptions: waiting times are gamma; team goal processes independent Poisson; the order restriction λ₁/λ₂ ≥ 1 correctly encodes "better past performance"; points ratio scaling captures ability differences; r rarely exceeds 6.

## 5. Features / target
- **Inputs:** observed waiting times X₁, X₂ (time to 3rd goal per game, prior season); prior-season points R₁, R₂; specialist opinion as the restriction θ₁/θ₂ ≥ 1.
- **Target:** predictive *density* for Y₁ = time until Toronto scores its 3rd goal in an upcoming game vs Montreal (full density, from which mode/mean/percentiles derive).

## 6. Validation design
- **Within-paper empirical check only:** KL prediction error computed on the 2016–17 season (Y₁ assumed truncated Gam(3, 18.3) on (0,60), E[Y₁] = 35.8): **pe(q̂₁) = 0.04 vs pe(q̂₀) = 0.45** — restricted estimator wins by ~11× under KL.
- **Frequentist risk curves (Fig. 2):** as θ₁/θ₂ rises above 1, R_KL of q̂₁ falls below the constant risk of q̂₀ (q̂₀ is MRE); both converge when information vanishes. r₁ = r₂ = r₀ = 3.
- No holdout of actual 2018–19 game outcomes scored; no betting or decision metric.

## 7. Numerical results / baselines
- pe(q̂₁) = 0.04 vs pe(q̂₀) = 0.45 (KL prediction error, 2016–17 evaluation).
- With ancillary info, predicted 3rd-goal time shifts later: mean 28.35 → 33.12 min; median 26.62 → 32.82; P20 14.38 → 19.06; mode 17.92 → 28.13.
- Interpretation given: without info, "expect the 3rd goal around minute 28 [mean 28.35]"; with info, "around minute 33" — i.e., accounting for Toronto's superiority *delays* the expected time (because the restriction binds against the stronger team's faster scoring — counterintuitive, driven by the weighting).
- Conclusion: restricted estimator dominates the MRE q̂₀ in both KL prediction error and frequentist risk.

## 8. Code / data availability
Not stated (no code; data proprietary Stathletes).

## 9. Leakage & limitations
- Evaluation is in-sample-ish: densities fit on 2017–18, "prediction error" computed on 2016–17 under an assumed truncated-gamma truth — circular in that the truth model is the assumed model family.
- The ancillary restriction θ₁/θ₂ ≥ 1 is only as good as the specialist opinion; the paper shows dominance *given* the restriction is true, with no robustness check for wrong restrictions.
- Single-team-pair illustration (Toronto vs Montreal); no league-wide backtest.
- **For GSE:** gamma waiting-time-to-rth-goal has no NFL analogue in the engine's lanes (no time-to-score markets modeled; Poisson team totals are already inventoried). The statistical machinery is real but the application is hockey scoring times.

## 10. GSE overlap
No overlap — repo inventory contains no gamma/beta-prime predictive-density work and no hockey scoring-time research. Not a duplicate; simply inapplicable. The *generic* technique (Bayesian predictive densities with order restrictions) is a stats textbook tool, not a GSE gap.

## 11. GSE implementation spec
Not applicable — REJECT. For the record, the only conceivable port would be first-score timing markets (e.g., time of first TD), which GSE does not model and which the engine's market list (SPREAD/MONEYLINE/TOTAL only) excludes.

## 12. Reproducible test
Not applicable — REJECT. (A fidelity check of the paper's own claims would re-fit the Table 1 data and recompute pe(q̂₁) vs pe(q̂₀); not a GSE test.)

## 13. Acceptance / rejection gate
**Reject:** the paper's contribution is a hockey scoring-time predictive density with no demonstrated edge on any GSE-relevant target (NFL outcomes, totals, props). No adoption criterion is satisfiable without first inventing a GSE time-to-score lane that does not exist.

## 14. Improvement experiment
If a time-to-first-score lane were ever opened: replace the gamma waiting-time with a *competing-risks* model (both teams' scoring clocks run simultaneously; the observed first score is the minimum), and encode analyst opinion as a *soft* probabilistic restriction rather than the hard θ₁/θ₂ ≥ 1 truncation — testing whether the dominance result survives misspecified restrictions. Purely academic for GSE today.
