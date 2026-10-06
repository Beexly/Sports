# Ledger 1811 — Partial Membership Models for Soft Clustering of Multivariate Football Player Performance Data

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2409.01874
- **Title:** Partial membership models for soft clustering of multivariate football player performance data
- **Authors:** Emiliano Seri, Roberto Rocci, Thomas Brendan Murphy
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, mixture/mixed-membership/partial-membership generative-process comparison, Dirichlet–Poisson–Gamma Bayesian specification, NIMBLE MCMC inference, identifiability via archetypal units and probabilistic relabeling, WAIC model selection with simulation, Serie A 2022/23 application with 4-profile PM results vs. 5-profile MM and 6-component mixture, model comparison including runtimes, Appendix A bike-share application, and references) from the extracted text at `/tmp/wave4b-dfs2/txt/2409.01874.txt` (HTML saved to `/tmp/wave4b-dfs2/papers/2409.01874.html`). Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Football players genuinely split their playing style across multiple roles (e.g., a playmaker is part-midfielder, part-attacker) — which is conceptually different from *uncertainty* about a single role. Can a Bayesian partial-membership model for count data recover interpretable soft role assignments better than mixed-membership or finite-mixture alternatives?

## 3. Method/model

- **Partial membership (PM) model** (Heller et al. 2008, adapted for counts): each player i has a membership vector πᵢ on the K-simplex (πᵢ ~ Dirichlet(δ)); conditional on πᵢ, each count variable j follows Poisson with rate = Πₖ λₖⱼ^{πᵢₖ} (multiplicative compounding of cluster profiles by membership weights); λₖⱼ ~ Gamma priors.
- Inference via **MCMC in NIMBLE**; label switching handled post hoc by probabilistic relabeling (`label.switching`); identifiability anchored by **archetypal units** (players with max membership ≈ 1).
- Model selection by **marginalized WAIC (WAICm)** — shown in simulation to pick the true K in 99/100 runs vs. 79/100 for conditional WAIC.

## 4. Mathematics, equations, assumptions

- Likelihood: p(xᵢ|πᵢ, Λ) = Πⱼ Poisson(xᵢⱼ; Πₖ λₖⱼ^{πᵢₖ}); πᵢ ~ Dirichlet(δ), δ = 1 (uniform) selected to promote archetypal units while keeping K manageable.
- **Assumptions:** (a) independent Poisson likelihoods within a cluster (no covariance structure); (b) no overdispersion/zero-inflation handling; (c) membership is static over the season (no temporal dimension); (d) WAICm is valid for singular-model selection here.

## 5. Dataset/schema

- **200 Serie A players, > 1,720 minutes, 2022/23 season** (fbref data); **22 count variables** (goals, assists, progressive carries, shots, key passes, crosses into penalty area, SCA/GCA variants, tackles, blocks, interceptions, clearances, take-ons).
- Appendix A: Washington DC bike-share station counts (660 stations, June 15–July 15 2022).

## 6. Features and target

- **Features:** the 22 per-player count variables.
- **Target:** soft role structure — K profiles (Poisson rate vectors) + per-player membership vectors; evaluated by interpretability, archetype recovery, and WAIC.

## 7. Validation design

- **Simulation:** 100 runs, true K = 4, n = 100; compare WAICc vs. WAICm on correct-K selection.
- **Real data:** fit PM (K = 2..8), MM (K = 2..8), and finite mixture (K = 2..8) under the same Bayesian/MCMC protocol; select K by WAICm per model class; compare interpretability and archetype identification.
- Runtime comparison on a MacBook Air (M3, 16GB).

## 8. Exact results and baselines with numbers

- Simulation: WAICm picks true K = 4 in **99/100** runs; WAICc in 79/100.
- Selected K: **PM = 4 profiles**, MM = 5, mixture = 6.
- PM profiles (Poisson means): Profile 1 = strikers (Gls 20.91, Sh 111.62, SCA 99.73); Profile 2 = full-backs/dynamic midfielders (PrgC 103.65, Tkl 89.44); Profile 3 = center-backs (Clr 133.32); Profile 4 = goalkeepers.
- Archetypes: Osimhen (Profile 1, ≈1.0), Rogério (Profile 2), Luperto (Profile 3), Meret (Profile 4); hybrids: Dybala, Mkhitaryan, Barella (1+2), Brozović (2+1+3).
- MM's highest memberships only reached 0.565–0.686 (no true archetypes); the mixture blended roles within components.
- Runtimes (K = 2..8): PM **10.6 h**, MM **14.7 h**, mixture **7.3 h**.

## 9. Code/data availability

- No public code URL was given in the extracted text (implemented in NIMBLE/R).
- Data: fbref Serie A 2022/23 (public); Capital Bikeshare system data (public).

## 10. Leakage and limitations

- Independent-Poisson assumption ignores within-cluster covariance; overdispersion acknowledged but not modeled (negative-binomial/zero-inflated left to future work).
- 10.6-hour runtime for one dataset — expensive for production refresh cycles.
- Membership is season-static; no temporal dynamics (multi-season extension is future work).
- Poisson-mixture WAIC values are on different scales across model classes, so cross-class WAIC comparison is informal.

## 11. GSE overlap

- This is GSE's **soft role-membership** mechanism: NFL players with hybrid roles (e.g., a "big slot" WR who is part-WR/part-TE, a pass-catching RB, a two-way soccer-style midfielder analog) should carry *fractional* role memberships rather than a single position label — directly feeding DFS salary-agnostic projection features and matchup adjustments.
- Complements ledger 1808 (hard role clusters) and 1807 (continuous embeddings): PM gives interpretable fractional roles with archetype anchors.

## 12. Implementation specification

1. **Inputs:** GSE's per-player season count stats (NFL: targets, carries, routes, snaps by alignment, tackles, etc.; NBA/soccer analogs).
2. **Model:** Dirichlet(1) memberships × independent Poisson–Gamma profiles in NIMBLE (or a faster variational reimplementation); K selected by marginalized WAIC.
3. **Anchoring:** identify archetypal units post hoc (max membership > 0.9) per profile for interpretability and label stability.
4. **Outputs:** per-player membership vector πᵢ (features for projection models) + profile rate vectors (role priors for low-sample players).
5. **Refresh:** fit once per season; update πᵢ intra-season with a lightweight online step (not full MCMC) to control the 10-hour cost.

## 13. Reproducible test

- Replicate the paper's simulation: 100 runs, true K = 4; require WAICm correct-K rate ≥ 95%.
- On GSE NFL data: require ≥ 1 archetypal player (max membership > 0.9) per profile and higher interpretability ratings (role-label agreement) than a K-matched finite mixture.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** WAICm 99/100 correct-K recovery; PM yields true archetypes where MM maxes at 0.686 membership; 4 interpretable profiles vs. 6 blended mixture components. Accept as ADAPT (not ADOPT: 10.6 h runtime, no overdispersion modeling).
- **Improvement experiment:** replace independent Poissons with a negative-binomial (overdispersion) layer and add a random-walk temporal prior on πᵢ across season windows. Success = WAICm improvement ≥ 2% on the same Serie A data and archetype stability (same 4 archetypes) with runtime ≤ 12 h.

**Verdict:** ADAPT — Bayesian partial-membership soft clustering for count data with archetype anchoring; adopt fractional role memberships as GSE's hybrid-role representation for NFL/NBA/soccer projections, with overdispersion and temporal membership dynamics as the improvement path.
