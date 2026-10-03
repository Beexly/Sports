# 1662 Models for Paired Comparison Data: A Review with Emphasis on Dependent Data (arXiv:1210.1016)

**Citation:** Cristiano Varin, Manuela Cattelan, David Firth. *Models for Paired Comparison Data: A Review with Emphasis on Dependent Data*. arXiv:1210.1016 (2012). URL: https://arxiv.org/abs/1210.1016
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text, ~1,800 lines; Sections 1–4 including the Thurstone/Bradley–Terry review, ordinal extensions, covariate models, the dependent-data pairwise-likelihood proposal, both simulation studies, Tables 1–6, and the universities data example read in full). Not an abstract-only read.
**Verdict:** ADAPT — the pairwise-likelihood estimator for dependent paired comparisons with near-nominal coverage is directly useful for GSE's correlated matchup judgments (repeated analyst ratings, correlated player comparisons), but as a review the novel contribution is narrow and must be re-validated on sports data.

## 1. Research question

How should paired-comparison models (Thurstone, Bradley–Terry, ordinal extensions, covariate models) handle *dependent* comparisons — repeated judgments by the same subject inducing correlation — and does the proposed pairwise (composite) likelihood estimator match full maximum likelihood on accuracy while staying computationally feasible?

## 2. Method/model

Review of: Thurstone–Mosteller (normal CDF), Bradley–Terry (logistic), ordinal paired comparisons (cumulative link with thresholds; "no preference" option), object/subject/comparison-specific covariates, recursive-partitioning for covariate-driven subgroups (Strobl et al. 2011). Novel contribution: for the dependent-data Thurstone model Z_s = A T + e_s with T ~ N(μ, Σ_T) inducing correlation across a subject's comparisons, estimation by pairwise likelihood (product of bivariate marginal likelihoods over comparison pairs) instead of the full 6-dimensional (for n=4 objects) likelihood. Compared against full ML (Miwa–Hayter–Kuriki algorithm) and Maydeu-Olivares limited-information estimation in two simulation studies, with empirical coverage of Wald CIs at 95/97.5/99%.

## 3. Mathematics/equations/assumptions

- Thurstone: P(i beats j) = Φ(μ_i − μ_j); Bradley–Terry: P(i beats j) = exp(λ_i)/(exp(λ_i)+exp(λ_j)); identification μ_4 = 0.
- Ordinal: cumulative link with ordered thresholds for {prefer i, no preference, prefer j}.
- Dependent model: Z_s = A T + e_s; T ~ N(μ, Σ_T) (latent traits with correlation), e_s ~ N(0, ω²I_6); diagonal of Σ_T fixed to 1 (correlation matrix), μ_4 = 0, ω² = 1 for identification.
- Pairwise log-likelihood: Σ_s Σ_{pairs} log f_2(z_{s,pair}; θ) — bivariate normals only; sandwich (Godambe) standard errors.
- Assumptions: bivariate marginals correctly specified; subjects independent; comparison graph connected.

## 4. Dataset/schema

- Simulation study 1 (Maydeu-Olivares 2001 setting): n=4 objects, μ=(0.5, 0, −0.5, 0), Σ_T = [[1,.,.,.],[0.8,1,.,.],[0.7,0.6,1,.],[0.8,0.7,0.6,1]], ω²=1; full likelihood needs a 6-dimensional integral (Miwa/Hayter/Kuriki). Number of replications not stated in text near the tables (Table 5 coverage suggests a large simulation).
- Simulation study 2: μ̃ = (−0.2, 1, −1.5) with corresponding Σ_T; ML/LI/PL compared on bias and SE accuracy.
- Real illustration: students' paired comparisons of 6 European universities (London, Paris, Milan, St. Gallen, Barcelona + 1) with counts of prefer-first / no-preference / prefer-second per pair (e.g., London vs Paris: 186/26/91), plus subject covariates (language knowledge, discipline) and object covariates (economics/management/finance specialization, Latin country).

## 5. Features and target

- Simulations: target = recovery of μ and Σ_T parameters.
- Universities: features = object covariates (specialization, Latin country), subject covariates (language knowledge, discipline), subject×object interactions; target = ordinal paired preference (prefer A / no preference / prefer B).

## 6. Validation design

- Simulation: empirical coverage of nominal 95/97.5/99% Wald CIs for LI vs PL; bias/SE comparison of ML vs LI vs PL (Table 6: mean, median, model SE, simulation SD).
- Real data: illustrative fit; e.g., a student knowing English+French studying management: P(prefers London to Paris)=0.46, P(no preference)=0.13, P(prefers Paris)=0.41; without management: 0.55/0.12/0.33.

## 7. Exact results and baselines with numbers

- Table 5 empirical coverage, LI vs PL at nominal 95% / 97.5% / 99%: μ_1: 0.947/0.958, 0.982/0.978, 0.992/0.992; μ_2: 0.960/0.964, 0.978/0.976, 0.988/0.988; μ_3: 0.941/0.930, 0.969/0.972, 0.995/0.991; σ_12: 0.959/0.985, 0.975/0.997, 0.989/1.000; σ_13: 0.934/0.939, 0.961/0.967, 0.968/0.985; σ_14: 0.941/0.968, 0.967/0.996, 0.988/1.000; σ_23: 0.965/0.970, 0.973/0.980, 0.987/0.995; σ_24: 0.943/0.933, 0.951/0.959, 0.967/0.973; σ_34: 0.953/0.946, 0.969/0.966, 0.977/0.989. PL coverage is near-nominal throughout, matching or beating LI on several correlation parameters.
- Table 6 (study 2): ML means ≈ truth (−0.21/1.00/−1.51 vs −0.2/1/−1.5); PL means (−0.22/1.03/−1.54) close to ML with model SEs (0.19/0.33/0.36) close to simulation SDs (0.19/0.33/0.36) — SEs honest; LI SEs inflated (0.21/0.42/0.49 vs SDs 0.22/0.47/0.51).
- Verdict in paper: pairwise likelihood is a "valid alternative" to full ML for dependent paired comparisons, far cheaper than 6-D integration.

## 8. Code/data availability

No code published. Universities data printed in Tables 1–3 (reconstructable). Simulation settings fully specified (replicable).

## 9. Leakage and limitations

- Review paper: the novel contribution is one estimator in one section; most content is summary.
- Simulation replication count not stated near tables; only n=4 objects tested — scalability of PL to many objects (e.g., 32 NFL teams) not demonstrated.
- Real-data example is illustrative, not predictive; no holdout.
- Assumes the dependence structure is fully captured by correlated latent traits; misspecified correlation → biased sandwich SEs.
- No sports application in the paper.

## 10. GSE overlap

GSE's paired-comparison work (Bradley–Terry/Elo unification, ledger 0004; team ratings) assumes independent comparisons. This paper's dependent-data estimator covers GSE's actual use cases: repeated analyst matchup ratings, correlated player-vs-player comparisons from the same scout, fan polls with repeated voters. New territory: dependence-robust inference for comparison data.

## 11. Implementation specification

- Build `gse.comparisons.DependentBT`: Bradley–Terry/Thurstone with subject-level random effects inducing comparison dependence; estimate by pairwise likelihood with Godambe sandwich SEs.
- Use case: aggregate correlated matchup judgments (e.g., multiple GSE analysts rating the same QB matchups; weekly power-rank ballots) into team/player worth parameters with honest uncertainty.
- Prototype in Python (scipy for bivariate normal CDFs); validate coverage by simulation before use.

## 12. Reproducible test

- Simulate NFL-like paired comparisons: 32 teams, 50 raters × 20 correlated comparisons each, true Σ_T with AR(1)-style correlation 0.6.
- Fit PL vs naive independent-BT: check PL empirical coverage of 95% CIs ≈ 0.93–0.97 and SEs within 10% of simulation SDs; naive BT should under-cover.
- Real pilot: GSE analyst weekly matchup polls (if available) — compare PL worth estimates and CI widths vs independent BT.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** in the 32-team simulation, PL 95%-CI empirical coverage ∈ [0.93, 0.97] for worth parameters AND model SEs within 10% of simulation SDs, while naive independent BT covers < 0.90 (proving dependence matters). Fail → REJECT (dependence negligible; keep independent BT).
- **Improvement experiment:** (i) add comparison-specific covariates (home field, rest) into the dependent model — expect coverage maintained; (ii) scale to ordinal outcomes (win/close/loss tiers) — expect same PL machinery to apply; (iii) benchmark runtime vs full ML on n=8 objects — expect ≥10× speedup.

**Verdict:** ADAPT — pairwise likelihood for dependent paired comparisons is the right inference tool for GSE's correlated matchup judgments, but it must be re-validated at NFL scale (32 teams, not 4) with a coverage simulation before production use.
