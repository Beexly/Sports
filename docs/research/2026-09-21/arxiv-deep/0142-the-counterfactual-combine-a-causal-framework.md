# [0142] The Counterfactual Combine: A Causal Framework for Player Evaluation (arXiv:2602.23233)

**Citation:** Susmann, H. P. & D'Alessandro, A. (2026). *The Counterfactual Combine: A Causal Framework for Player Evaluation*. arXiv:2602.23233v1. URL: https://arxiv.org/abs/2602.23233
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML + PDF, arXiv). ar5iv conversion truncated at the metrics section; remainder read from PDF.
**Verdict:** ADOPT — rigorous doubly-robust causal player-evaluation framework demonstrated directly on NFL place kickers with nflreadr data, portable to GSE with valid uncertainty quantification that current point-estimate metrics lack.

## 1. Research question
How should players be evaluated from repeated binary attempts (field-goal kicks, plate appearances) when players face systematically different attempt difficulty? The paper recasts player evaluation as a causal inference problem borrowed from healthcare provider profiling: define a family of counterfactual estimands (direct standardization, indirect standardization, and a new "performance above random replacement" metric) via stochastic interventions that reassign attempts to players, derive their identification conditions, and construct doubly-robust, asymptotically efficient estimators (TMLE) that allow flexible machine-learning nuisance models while retaining valid confidence intervals. (Sections 1–2, 5)

## 2. Dataset / schema
- **NFL kickers case study:** all NFL games 2013–2023 via the `nflreadr` package (Ho and Carl 2025). Raw: **11,523 field-goal attempts by 110 kickers** (extra points excluded). Analysis set: **46 kickers with ≥100 attempts → 9,786 attempts**. Empirical FG success rate **85.3%**. (Section 5.1)
- Covariates X: kick distance (yards), outdoor (non-enclosed) stadium indicator, grass vs artificial turf, temperature (°F), wind speed (mph; set to 0 for enclosed stadiums), indicator for attempts in the final 30 seconds of the game.
- **MLB batters case study:** all 2025 regular-season games via `baseballr` (Petti and Gilani 2024). Raw: **163,664 at-bats by 673 players**. Analysis set: everyday players (>150 games or >600 PA) → **84 players, 40,107 at-bats**, overall batting average **.260**. (Section 5.2)
- Covariates: pitcher wOBAA, K rate, BB rate, hard-hit rate, barrel rate, swing rate, pitcher handedness, outs before the at-bat. Park factors (dimensions, weather) notably NOT included — the authors flag this as unmeasured confounding.

## 3. Method / model
- **Structural causal model:** Z = (X, A, Y); X attempt covariates, A ∈ {1..m} player index, Y ∈ {0,1} success. Structural equations X = f_X(U_X), A = f_A(X, U_A), Y = f_Y(X, A, U_Y). (Section 2)
- **Stochastic intervention:** A* drawn from prespecified P_{A*|X} (may depend on X); counterfactual outcome Y(A*) = f_Y(X, A*, U_Y). Target estimand ψ = E[Y(A*) | X ∈ X′, A ∈ A′].
- **Three estimands:**
  - Direct standardization: A* = a w.p. 1 (deterministic); A′ = A. ψ_a^direct = E[Y(a) | X ∈ X′] — same reference distribution for all players → league-table rankable.
  - Indirect standardization: P_{A*|X} = P_{A|X} (reassign to players likely to take such attempts); A′ = {a}. ψ_a^indirect = E[Y(A*) | A = a]; metric Δ̂^b_indirect_a = E[Y|A=a] − ψ_a^indirect — player-specific reference, NOT rankable (citing Shahian et al. 2020 on this misuse in provider profiling).
  - Performance above random replacement: P(A* = a) = 1/m uniform; A′ = {a}. ψ_a^rand = E[Y(A*) | A = a]; metric Δ̂^b_rand_a = E[Y|A=a] − ψ_a^rand — ATT-like extension to categorical treatments; interpretable as "pausing the game and substituting a random kicker."
- **Estimation (Section 4):** substitution estimators are consistent only if μ̂ consistently estimates μ_P; to allow flexible ML nuisance models with valid inference, use **Targeted Minimum Loss-based Estimation (TMLE)**: fluctuate the initial estimate P̂ along a low-dimensional parametric submodel so the updated estimate P̂* (approximately) solves the empirical EIF equation (1/n)Σ D_P̂*(Z_i) ≈ 0, then plug in: ψ̂^rand_a ≡ ψ^rand_a(P̂*). Guaranteed to lie in the parameter space ([0,1]), unlike one-step estimators. **Crossfitting** (10-fold NFL, 5-fold MLB) required to avoid Donsker-class restrictions on nuisance estimators.
- Nuisance models: **Super Learner ensemble (mean, glm, lightgbm)** via the `mlr3superlearner` R package for both μ_P(a,X) = E[Y|A=a,X] and π_P(a|X) = P(A=a|X).
- Propensity-score clustering (Euclidean distance between normalized propensity vectors, R `hclust`) to visualize which players are compared with weight under indirect standardization.

## 4. Equations & assumptions
- Estimand (Eq. 1): ψ = E[Y(A*) | X ∈ X′, A ∈ A′], with X′ ⊆ X, A′ ∈ A, P(X ∈ X′, A ∈ A′) > 0. (Section 2)
- Identification (Section 2): under A1–A3, ψ(P) = E_{X∈X′}[ Σ_{a′∈A} P(A* = a′ | X) · E_P[Y | A = a′, X, A ∈ A′] ]. (PDF display partly garbled; stated identification forms per estimand:)
  - Direct: ψ_a^direct = E[μ_P(a, X) | X ∈ X′]; positivity needs π_P(a|X) > 0 a.s. (strong — every attempt type must be possible for player a).
  - Indirect: ψ_a^indirect = E[m_P(X) | A = a, X ∈ X′] where m_P(X) = E[Y|X] (inner expectation does NOT condition on A = a); positivity collapses to P(A = a | X ∈ X′) > 0 — much weaker.
  - Random replacement: ψ_a^rand = (1/m) Σ_{a′=1}^{m} E[μ_P(a′, X) | A = a, X ∈ X′]; positivity: for any attempt type by player a, every other player must have had positive probability of making it.
- Assumptions: **A1 No unmeasured confounders** — U_A ⊥⊥ U_Y and either U_X ⊥⊥ U_A or U_X ⊥⊥ U_Y (implies conditional exchangeability Y(a) ⊥⊥ A | X). **A2 Positivity** — for all x ∈ X′ and all a with P(A* = a | X = x) > 0, π_P(a|x) > 0. **A3 Intervention independence** — A* ⊥⊥ U_Y | X (satisfied by construction).
- **Theorem 1 (Section 4.2):** TMLE estimate ψ̂^rand_a satisfies ψ̂^rand_a − ψ^rand_a = o_P(1) if either ‖π̂ − π‖ = o_P(1) or ‖μ̂ − μ‖ = o_P(1) (double robustness). If both ‖π̂ − π‖ = o_P(n^{−1/4}) and ‖μ̂ − μ‖ = o_P(n^{−1/4}), then √n(ψ̂^rand_a − ψ^rand_a) ⇝ N(0, E_P[D^rand_{P,a}(Z)²]) — asymptotically normal and efficient. Wald CIs use the empirical SD of the estimated EIF. (PDF display of norms partially garbled; content as stated.)
- EIF structure (Section 3): each EIF = weighted residual + centered conditional-mean term. Direct: residual weighted by **inverse** propensity (small π inflates variance → larger efficiency bound). Indirect: residual weighted by the propensity itself (small π downweights rare player-attempt combos → smaller bound; positivity violations don't affect the bound). Random replacement: weights are ratios of focal vs other players' propensity scores (bound driven by overlap).
- Δ metrics: Δ̂^b_indirect_a = Ê[Y|A=a] − ψ̂^indirect_a; Δ̂^b_rand_a = Ê[Y|A=a] − ψ̂^rand_a (Eq. 2).

## 5. Features / target
- Inputs: per-attempt covariates (kicker study: distance, outdoor, grass, temp, wind, final-30s; batter study: pitcher wOBAA/K/BB/hard-hit/barrel/swing rates, handedness, outs).
- **Target:** binary — Y = 1 if field goal made / legal hit (any kind) obtained; 0 otherwise. Per-attempt unit of analysis. Prediction horizon: the single attempt.
- Contrast targets: standardized success rates and above-replacement contrasts per player.

## 6. Validation design
- No train/test prediction split — this is an estimation/inference paper; uncertainty comes from asymptotic theory (Wald CIs from EIF variance) with crossfitting.
- Identification checked via: propensity-score diagnostics (NFL: no pronounced positivity violations; MLB: 3,368,988 estimated propensity scores — mean 0.0119, 75% between 0.0110 and 0.0127 — "some evidence for practical positivity violations," widening CIs via inverse weights).
- Results interpreted with 95% CIs (direct) and funnel plots with control limits at 97.5%/99%/99.9% (Spiegelhalter 2005; Griffen et al. 2012) for indirect/random replacement.
- No comparison against existing adjusted metrics (e.g., ESPN's FG models) as baselines — relative ranking plausibility is the only external check.

## 7. Numerical results / baselines
- **NFL kickers (9,786 attempts, 46 kickers):** direct-standardization top 3: **Evan McPherson, Tyler Bass, Justin Tucker**; lowest point estimate: **Phil Dawson** (paper notes analysis period covers only the latter part of his career, excluding 1999–2012 Browns tenure, and his performance is statistically indistinguishable from many others once uncertainty is accounted for). Several kickers' 95% CIs do not overlap their empirical success rates: e.g., **Tyler Bass's standardized rate exceeds his observed rate**, consistent with him facing a harder-than-league-average attempt mix; others standardized lower, suggesting easier mixes or good situation-matching. **Justin Tucker has statistically significant positive values for both the indirect and random replacement metrics.** No kicker significantly below zero on either contrast — consistent with selection (poor kickers don't stay in the league).
- **MLB batters (40,107 ABs, 84 players):** top 5 standardized batting averages: **Aaron Judge, Freddie Freeman, Bo Bichette, Vladimir Guerrero Jr., Xavier Edwards**. All 84 players' 95% CIs contain their observed 2025 batting averages. Shohei Ohtani, Juan Soto, Kyle Schwarber rank outside top 20 — outcome collapses all hits equally; Schwarber hit 56 HR but struck out 197 times for a .240 observed BA. Several MLB batters (e.g., Willy Adames, Taylor Ward, Anthony Volpe, Lars Nootbaar, Ryan McMahon) have significantly negative indirect/replacement contrasts, attributed to defensive roles or injury-hampered seasons. Bryce Harper's propensity distribution is distinctly skewed (lowest proportion of right-handed opponents) — interpreted as strategic deployment of left-handed pitchers against him.
- Propensity-score distance metric: d(a,a′)² = Σ_i [π̄(a|X_i) − π̄(a′|X_i)]² with normalized π̄(a|X_i) = π̂(a|X_i)/Σ_j π̂(a|X_j); hierarchical clustering shows Bass near Gostkowski and Carpenter (shared turf/situation profiles).

## 8. Code / data availability
**Code:** stated as available at "[anonymized]" (double-blind review; reproduction code and estimation package names anonymized) — effectively **none retrievable as stated**. Data: `nflreadr` (public), `baseballr` (public); methodology reconstructable from the paper plus the `tmle`/`mlr3superlearner` R ecosystem.

## 9. Leakage & limitations
- **A1 (no unmeasured confounders) is unverifiable**; MLB study omits park factors and weather — both plausibly confound hit probability and who faces whom. Authors flag this honestly.
- Practical positivity violations in the MLB study (propensities ≈ 0.012, uniform-ish 1/84) inflate direct-standardization variance — the efficiency-bound warning in Section 3 applies.
- Indirect/random-replacement contrasts cannot rank players (different reference distributions) — misuse risk for league tables, explicitly warned against via Shahian et al. 2020.
- Only binary outcomes demonstrated; extension to non-binary is claimed but not shown.
- No ground-truth validation of counterfactual claims (inherent to causal work); no forward-prediction check that standardized metrics predict next-season performance better than empirical rates — the test GSE should run (Section 13).
- External validity to NFL: demonstrated on NFL kickers with 2013–2023 data; the binary-attempt structure maps directly to FG/XP modeling but not to continuous player-evaluation problems (EPA, WAR-style) without adaptation.

## 10. GSE overlap
- Checked against `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. **Direct NFL fit with no duplication:** GSE has kicker/special-teams metrics computed in the 2026-09-17 gse-lab and calibration work (CQR, temperature scaling), but nothing in causal player evaluation or TMLE standardization. Garrett's own CEPT lane ("Baxley Causal E-Process Theory", WIP) is his theory project — this paper is adjacent prior art (stochastic interventions, positivity diagnostics) and should be cited if CEPT touches player evaluation, not merged with it.
- The 2026-09-18 ML research brief lists **causal inference as a commissioned area with results not yet in repo** — this paper is the first full read filling that lane. FineCausal (2503.23911, already read) is soccer-focused; this is the NFL-native counterpart.
- NFL case-study data source (`nflreadr`) matches GSE's existing data stack.

## 11. GSE implementation spec
Build a causal kicker-evaluation module for GSE:
1. **Data:** nflverse/nflreadr FG + XP attempts 2020–2025; covariates: distance, weather (existing barometric/wind benchmark data), stadium, turf, altitude, game situation.
2. **Estimands:** direct standardization per kicker (league-table rankable) + Δ^rand above-random-replacement contrast; funnel plots for the GSE content feed.
3. **Estimation:** Super Learner (mean, glm, lightgbm) for μ and π, 10-fold crossfitting, TMLE targeting; R stack (`tmle`, `SuperLearner`) or Python port (`zEpid`/`dowhy` for DR, custom TMLE).
4. **Serving:** season-weekly refresh; kicker rankings published with 95% CIs; above-replacement contrasts as situational talking points (e.g., "kicker X faces the 3rd-hardest attempt mix").
5. **Effort:** ~1–2 weeks (estimation pipeline + diagnostics), no new data procurement. Extend later to punters/QB binary outcomes.

## 12. Reproducible test
- Dataset: nflverse FG attempts 2020–2025.
- Baseline: raw kicker FG% and a parametric logistic adjustment.
- Metric: does the TMLE direct-standardized rate predict **next-season** FG% (2025, held out) with lower RMSE than the raw rate and the logistic-adjusted rate? Gate: TMLE beats raw by ≥ 15% RMSE reduction on kickers with ≥ 30 attempts.
- Diagnostics gate: report propensity-score overlap; reject the run if > 10% of propensity estimates fall below 0.001 (practical positivity failure per the paper's own MLB warning).

## 13. Acceptance / rejection gate
ADOPT into the GSE player-evaluation stack if the TMLE standardized kicker rate predicts held-out next-season FG% with RMSE ≥ 10% lower than the raw empirical rate on the 2020–2024 → 2025 window, AND ≥ 80% of kickers' 95% CIs are well-behaved (no degenerate width from positivity failures). Reject if TMLE fails to beat a plain logistic substitution estimator on the same window — the complexity cost is unjustified.

## 14. Improvement experiment
The paper only demonstrates binary success outcomes. Run the framework on **expected points per attempt** (continuous outcome extension the paper claims but doesn't show): estimate a TMLE direct-standardized "points above average per kickoff/punt attempt" for special-teams units, combining FG/XP/punt/kickoff outcomes into one causal special-teams rating. This tests the paper's claimed non-binary extensibility and yields a unit-level metric GSE can publish — a dimension the paper's case studies never reach.
