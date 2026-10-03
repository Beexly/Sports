# [0070] Rating of players by Laplace approximation and dynamic modeling (arXiv:2310.10386v1)

**Citation:** Hsuan-Fu Hua, Ching-Ju Chang, Tse-Ching Lin, Ruby Chiu-Hsing Weng (2023). *Rating of players by Laplace approximation and dynamic modeling*. Dept. of Statistics, National Chengchi University, Taiwan. arXiv:2310.10386v1. URL: https://arxiv.org/abs/2310.10386v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 2,927 lines, incl. appendices).
**Verdict:** ADAPT — not a new capability (dynamic Elo is already in GSE's stack), but a concrete, implementable refinement: the per-match Laplace variance update with reduction factor A and lower bound B, validated by McNemar-significant gains on 5,100 test matches; pair it with the surface-transfer formula as the template for NFL context-split ratings.

## 1. Research question
Elo-family systems lack a principled *per-match* variance update: Glicko updates uncertainty only per rating period (5–10 games), Ingram (2021) assumed equal variances, and TrueSkill targets Thurstone-Mosteller rather than Bradley-Terry. This paper contributes: (a) a Laplace-approximation variance update applied **after every match**; (b) a closed-form matrix-inverse solution for Ingram's GenElo Surface Hessian (8×8 was unsolved analytically) yielding an interpretable cross-surface update; (c) a **heterogeneous random-walk** strength-evolution term (per-player, time-varying increment variance η_i²) plus a **lower bound B** on standard deviation to prevent variance collapse; (d) experiments on men's pro tennis showing the bounded dynamic variance update significantly improves match prediction accuracy and better captures new (young) players.

## 2. Dataset / schema
- **Source:** Jeff Sackmann ATP matches 2010–2019 (public, tennis_atp GitHub); retirements/defaults/walkovers and carpet matches removed.
- **Schema:** match-level: winner/loser, surface (hard/clay/grass), date; **25,537 matches total** (Table 2): train 2010–2017 = 20,437 (Hard 11,613 / Clay 6,399 / Grass 2,425); test 2018–2019 = 5,100 (Hard 2,907 / Clay 1,559 / Grass 634). **771 players**; 135 with >250 appearances (Djokovic 685, Nadal 650, Federer 640 — motivating the variance-collapse concern).
- **Settings:** initial rating 1500; initial σ grid 50–200; (A,B) grids A ∈ {1,1/2,1/3,1/4,1/5}, B ∈ {0,50,60,75,80,100}.
- **New-player study:** players not in first N=5,000 matches = 670 new players; first n ∈ {20,30,40} matches each.

## 3. Method / model
- **Model:** Bradley-Terry (reparametrized Elo win probability p_ij = e^{bθ_i}/(e^{bθ_i}+e^{bθ_j}), b = log(10)/400). Priors θ_i ∼ N(μ_i, σ_i²). Post-match: Laplace approximation N(θ*, −H⁻¹(θ*)) with a **single Newton-Raphson step** (Eq. 8): μ′ = μ − H⁻¹(μ)J(μ); Σ′ = −H⁻¹(μ′). Appendix B validates single-step vs. numerical integration: relative errors 1e-6–1e-2 (Table 10).
- **Variance recipe (three steps, §3.2):**
  1. Basic: (σ_i²)′ = σ_i²(1 − L_i), with L_i = b²p̂′_ijp̂′_jiσ_i²C′ ∈ (0,1), C = (1 + b²p̂_ijp̂_ji(σ_i²+σ_j²))⁻¹ (Eqs. 20b–c, 21b).
  2. Dynamic evolution: add η_i², with η_i² = ασ_i²L_i (or ασ_i², or constant η) — heterogeneous random walk θ_it = θ_i,t−1 + e_it, e_it ∼ N(0, η_i²) (Eqs. 4, 23).
  3. Lower bound: (σ_i²)′ = max(B², σ_i²(1 − AL_i)) (Eq. 25), A = 1−α ∈ [0,1]. (A,B)=(0,0) = constant-variance Elo; (1,0) = naive variance update.
- **Surface extension:** Proposition 1 gives −H⁻¹ = Σ + W explicitly; Proposition 2/Theorem 1 re-express Ingram's update as Elo-like per-surface rule μ′_il = μ_il + k_il(s_ij − p̂_ij) with k_il = bCσ_mσ_lρ_ml, and the interpretable transfer δ_il = ρ_ml(σ_l/σ_m)δ_im (Eq. 18): unplayed-surface adjustment ∝ surface correlation × SD ratio. Algorithm 3 (vGenElo Surface) adds the (A,B) variance update per surface.
- **Estimation:** all parameters (initial σ's, surface σ's, correlations ρ, A, B) fit by minimizing train negative log-likelihood; (A,B) over a grid.
- **Evaluation:** McNemar test for dependent proportions (same test data), H₀: π₁ ≥ π₂ vs. H₁: π₁ < π₂, Z = (n₂₁−n₁₂)/√(n₁₂+n₂₁) (Table 6). Bootstrap rejected as inappropriate (ordering matters).

## 4. Equations & assumptions
- **Eq. 1 (Elo):** θ̂′ = θ̂ + K(S − E). Clean.
- **Eq. 8 (Laplace step):** μ′ = μ − H⁻¹(μ)J(μ); Σ′ = −H⁻¹(μ′). Clean.
- **Eqs. 21a–b:** μ_i′ = μ_i + k_i(s_ij − p̂_ij); (σ_i²)′ = σ_i²(1 − L_i). Clean.
- **Eqs. 23–25:** (σ_i²)′ = σ_i²(1−L_i) + η_i²; → σ_i²(1 − AL_i); → max(B², σ_i²(1 − AL_i)). Clean.
- **Eq. 18 (surface transfer):** δ_il = ρ_ml(σ_l/σ_m)δ_im. Clean.
- **Eqs. 10–14, 19, 20a–c, Algorithm 1–3 steps:** readable but heavily interleaved in extraction (fractions, matrix entries, table rows). **Flagged:** I reconstruct the intended formulas from the prose descriptions; element-level matrix verification against the PDF source is recommended before implementing Proposition 1 verbatim.
- **Assumptions:** Bradley-Terry win model; Gaussian priors on strengths; Laplace single-step approximation adequate (validated 1e-6–1e-2 relative error); strength evolves as a heterogeneous random walk; variance bounded below by B².

## 5. Features / target
- **Input features:** pre-match strengths (μ_i, σ_i) for both players, surface indicator (hard/clay/grass), match outcome s_ij ∈ {0,1}.
- **Target:** match winner (binary); model outputs win probability p_ij = e^{bθ_i}/(e^{bθ_i}+e^{bθ_j}).
- **Estimation target:** (A,B) reduction factor and variance bound, surface σ's and correlations ρ, chosen by minimizing train negative log-likelihood on a grid.

## 6. Validation design
- **Splits:** train 2010–2017 (20,437 matches), test 2018–2019 (5,100 matches); time-ordered. New-player study: 670 players absent from the first 5,000 matches, first n ∈ {20,30,40} matches each.
- **Baselines:** constant-variance Elo (A,B)=(0,0); naive variance update (1,0); GenElo Surface without variance dynamics (Algorithm 2); surface model variants.
- **Metrics:** test accuracy; McNemar test for dependent proportions on the same test data (Z = (n₂₁−n₁₂)/√(n₁₂+n₂₁), one-sided); train negative log-likelihood for (A,B) selection.
- **Surface sub-experiments:** all-surfaces, surface model, hard-only.

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper; all are the paper's claims, not this ledger's.
- **Table 3 (Algorithm 1, all surfaces):** constant variance (0,0), σ=80 → accuracy **0.6338** (≈ K=33.3 at 0.5 win prob); naive variance update (1,0), σ=200 → **0.6199** (worse). With bound B=80, A=1/3 → **0.6381**, A=1/5 → **0.6387** (best; +21.9 to +25.0 of 5,100 matches). McNemar (Table 6): Z=2.668, **p=0.0038** and Z=2.887, **p=0.0019** — significant.
- **Table 4 (surface model):** Algorithm 2 (GenElo) → **0.6452** with σ_clay=91.62, σ_grass=98.71, σ_hard=80.37, ρ_cg=0.47, ρ_ch=0.72, ρ_gh=0.84 (grass most variable; grass–hard most correlated). Algorithm 3 (vGenElo, A=1/4, B=0) → **0.6487** (+17.9 matches) but McNemar **p=0.1772 — not significant** (the text notes surface explains much uncertainty).
- **Table 5 (hard-only, 2,907 test matches):** μ-only σ=85 → 0.6462; with (A,B)=(1/4,50) → **0.6535**; McNemar **p=0.0510** (borderline; (1/5,50) gives p=0.0478).
- **Table 7 (new players, (A,B)=(1/5,80)):** n=20: m₀₁=15, m₁₀=23, m₀₀=55 of 93; n=40: 13/28/23 of 64 — **m₁₀ > m₀₁ consistently**: variance update wins for a majority of new players. Medvedev case study (Fig. 1): variance update captures early-career strength faster; naive update deteriorates later (over-reduction) — the bound + dynamics fix this.
- **§4.3.3 (η_i² choices):** α⁽²⁾ ∈ {0.01,…,0.08} comparable to Table 3(c); best accuracy **0.6391** at α⁽²⁾=0.05, B=80, σ=105/120. Constant η: best 0.6369 at (η,σ)=(12,130), B=75. Interpretation: variance addition scales with matchup closeness (L_i peaks at p̂=0.5) — wider strength gaps get smaller variance additions.

## 8. Code / data availability
- **Code:** not stated. **Data:** Sackmann tennis_atp GitHub (public). Algorithms 1–3 fully specified; parameters tabulated. Reproducible by reimplementation.

## 9. Leakage & limitations
- **Stated:** with surface modeled, variance-update gains become insignificant — surface explains the uncertainty; future work: margins of victory.
- **Reviewer view (adversarial):**
  - **Gains are small** (~0.5pp, ~22–25 matches / 5,100) and surface-conditional; do not present as a breakthrough.
  - **Tennis-only, no NFL validation.** The transferable assets are the per-match variance formula and the surface-transfer formula.
  - **(A,B) chosen on train NLL but multiple grid points reported** — mild selection risk; the McNemar tests use the NLL-best (A,B), which is the honest choice but still post-hoc per comparison.
  - Proposition 1's matrix entries need source-level verification before implementation (extraction interleave).
  - Overlaps GSE's existing dynamic-Elo coverage (iWinRNFL, Lopez/Baumer per the map) — this is a *refinement* of that lane, not a new lane.

## 10. GSE overlap
- **Existing GSE corpus:** dynamic Elo lane (iWinRNFL 1704.00197, Lopez/Baumer state-space) — this paper refines it; Ingram (2021) GenElo is the direct predecessor being extended and fixed. Glicko/Glicko-2/TrueSkill are the comparison systems.
- **This batch:** 0069 (Bayes-xG hierarchical) is the complementary Bayesian technique — partial pooling for group effects; 0070 is per-entity variance dynamics. Both feed the same "uncertainty-aware player/team rating" goal; no duplication.
- Assessment: refinement of an existing lane (per-match Elo variance update + context-split transfer), not a new capability.

## 11. GSE implementation spec
- **Direct ADAPT — per-match Elo variance update (Eq. 25) for GSE's NFL team/QB ratings:** GSE's map shows dynamic Elo already in the stack; this paper supplies the missing piece those implementations likely lack — a **closed-form per-game variance update** with a reduction factor A and lower bound B. Insert (σ²)′ = max(B², σ²(1−AL)) into GSE's Elo updater; tune (A,B) on train NLL exactly as the paper does. Expected effect: faster adaptation to new QBs/rookie breakouts (the paper's new-player result) without the variance-collapse pathology (Table 1: σ→16–20 after 500 games, k→1.4 vs. typical K=32).
- **Surface-transfer formula → NFL context splits:** δ_il = ρ_ml(σ_l/σ_m)δ_im maps to split-specific ratings — e.g., a team's rating on grass vs. turf, dome vs. outdoor, or home vs. away as "surfaces." The paper's empirical pattern (positive correlations 0.47–0.84; one surface most variable) is a prior template: estimate cross-split σ's and ρ's from NFL data, then propagate a Sunday result on one split to the others proportionally to correlation × SD ratio.
- **Caution from the paper:** if the context split is already in the model, the variance update's value shrinks (p=0.1772) — model the split first, variance second.
- **Build plan:**
  1. Implement Algorithm 1 (vElo) as a drop-in replacement for the mean-only Elo step: μ_i′ = μ_i + k_i(s_ij − p̂_ij), (σ_i²)′ = max(B², σ_i²(1 − AL_i)), with L_i, C, k_i per Eqs. 20a–c.
  2. Grid-search (A,B) on pre-2024 NFL train by NLL; compare test log-loss/accuracy vs. constant-variance Elo with McNemar on the same test games.
  3. Prototype the surface-transfer form (Algorithm 2/3, Theorem 1) with splits = {grass, turf} or {dome, outdoor}: estimate (σ_grass, σ_turf, ρ) by train NLL; update off-split ratings via δ_il = ρ_ml(σ_l/σ_m)δ_im.
  4. Verify Proposition 1's matrix entries against the PDF before coding the general-n surface case.

## 12. Reproducible test
- **Reproduction gate:** reimplement on Sackmann ATP 2010–2019; recover Table 3(c) accuracy ≈ 0.6387 at (A,B)=(1/5,80) within ±0.003.
- **GSE gate:** vElo vs. constant-variance Elo on 2018–2023 NFL games, time-ordered; metric = test accuracy + McNemar. **Adopt if p < 0.05 with ≥ +0.3pp;** adapt (rookie/QB-change-only usage) if gains concentrate on new players; reject if null.
- **Split gate:** cross-split correlation estimates must be positive and stable across seasons before the transfer formula is trusted.

## 13. Acceptance / rejection gate
Verdict rationale: a concrete, implementable refinement — the per-match Laplace variance update with reduction factor A and lower bound B, McNemar-significant on 5,100 test matches with better early-career tracking of new players — but gains are small (~0.5pp) and surface-conditional, so it refines rather than replaces GSE's dynamic-Elo lane.
1. **Reproduction criterion:** reimplement Algorithm 1 (vElo) on Sackmann ATP 2010–2019 and recover Table 3(c): accuracy ≈ 0.6387 at (A,B)=(1/5,80), within ±0.003 (paper: +21.9 to +25.0 of 5,100 matches over constant variance).
2. **Comparison to run:** head-to-head on 2018–2023 NFL games, time-ordered: vElo vs. constant-variance Elo on identical train/test splits — metric = test accuracy, significance via McNemar on the same test games (the paper's tool: McNemar p=0.0038/0.0019 on the winning (A,B) rows).
3. **Decision rule:** ADOPT only if vElo wins with McNemar p < 0.05 at ≥ +0.3pp accuracy; ADAPT (rookie/QB-change-only usage) if gains concentrate on new players (paper's Table 7: m₁₀ > m₀₁ consistently); otherwise REJECT. Do not adopt the tennis (A,B) parameterization — re-tune (A,B) on NFL data.

## 14. Improvement experiment
- Add margin-of-victory (the authors' own stated future work; Hvattum-Arntzen / Kovalchik extensions) — directly relevant to NFL point-differential Elo.
- Crossed team+QB random effects instead of single strength (NFL's Vardy/Leicester confound, same as 0069's).
- Replace grid search on (A,B) with empirical-Bayes estimation.
- Variational/online approximation if per-play (not per-game) updates are needed at NFL scale.
