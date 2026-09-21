# [0556] Bayes-ically fair: A Bayesian Ranking of the Olympic Medal Table (arXiv:2510.14723v1)

**Citation:** C. MacDermott, C.J. Scarrott, J. Ferguson (2025). *Bayes-ically fair: A Bayesian Ranking of the Olympic Medal Table*. arXiv:2510.14723v1. URL: https://arxiv.org/abs/2510.14723v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1020 lines).
**Verdict:** ADAPT — the Olympic ranking is irrelevant to GSE, but the hierarchical Beta-Binomial shrinkage discipline for small-sample rates (pull noisy per-unit estimates toward the global mean with uncertainty-aware credible intervals) should be standardized across GSE's small-sample NFL rate features.

## 1. Research question
How to rank National Olympic Committees by long-run medals-per-capita without the naive per-capita table's small-country noise (Grenada, Dominica, Saint Lucia topped Paris 2024 per-capita): a hierarchical Bayesian model estimates each country's long-run per-capita medal probability with shrinkage toward the global mean, then ranks by posterior mean rank of the expected per-capita rate.

## 2. Dataset / schema
Olympic medal counts (IOC) and UN population data for Paris 2024 (1,039 medals, ~8B global population → baseline rate 1.3×10⁻⁷), plus five prior Games back to Athens 2004 for stability comparisons. Unit of observation: NOC; only NOCs with measurable population included; non-medal-winning NOCs unranked. Multi-medal athletes handled by modeling counts of athletes winning exactly i medals. Access: IOC/UN data are public; a Shiny app (MacDermott et al. 2025) exposes the rankings; no raw-data link stated.

## 3. Method / model
For each country c: M_{i,c} ~ Poisson(λ_{i,c}), i = 1,2,3,4+ (athletes winning exactly i medals; M_4 = 4+ medals), with λ_{i,c} = n_c · p_{i,c}. Country effect enters only through p_c = P(X_c ≥ 1) (unique-medal-winner probability); multi-medal conditional probabilities q_2 = P(X≥2|X≥1), q_3, q_4 are global (not country-specific) — justified by rarity and the argument that conditional on world-class talent, country no longer matters. Priors: p_c ~ Beta(α,β); α ~ Uniform(0,1), β ~ Uniform(0,108); q_2,q_3,q_4 ~ Uniform(0,1) independent. Fitted by Gibbs sampling (rJAGS). Ranking: posterior mean rank of E(M_c/n_c) = p_{1,c} + 2p_{2,c} + 3p_{3,c} + 4p_{4,c} across medal-winning countries (equivalently ranking on p_c, since the bracket terms are country-invariant). Posterior median rates + 95% credible intervals reported.

## 4. Equations & assumptions
- M_{i,c} ~ Poisson(λ_{i,c}); λ_{i,c} = n_c p_{i,c}.
- p_{1,c} = p_c(1−q_2); p_{2,c} = p_c q_2(1−q_3); p_{3,c} = p_c q_2 q_3(1−q_4); p_{4,c} = p_c q_2 q_3 q_4.
- p_c ~ Beta(α,β); α ~ U(0,1); β ~ U(0,108); q_i ~ U(0,1).
- E(M_c/n_c) = p_c(1 − q_2 + 2q_2(1−q_3) + 3q_2 q_3(1−q_4) + 4q_2 q_3 q_4).
- Stated assumptions: (i) unique medal winners are rare events → Binomial(n_c,p_c) ≈ Poisson; (ii) multi-medal counts are conditionally independent Poissons given (p_c, q's); (iii) country-specific talent effects act only through p_c; (iv) team-event medals count as one nominal athlete (IOC lexicographic convention); (v) hyperpriors are non-informative (expected rate ≈ 1.3×10⁻⁷ learned from data, not hardcoded). Sensitivity to prior choice tested in the online appendix — "little sensitivity found."

## 5. Features / target
Inputs: country population n_c, counts of athletes winning 1/2/3/4+ medals. Target: posterior distribution of the long-run per-capita medal rate E(M_c/n_c); the reported output is the posterior-mean-rank ordering plus posterior median rates with 95% CIs.

## 6. Validation design
No train/test split — this is an inferential ranking, not a prediction task. Validation is by comparison: Bayesian ranks vs naive per-capita ranks vs Duncan-Parece U-index ranks (Table 1), plus rank stability across six Olympic Games (2004–2024) and prior-sensitivity checks in the appendix. No baselines beyond the existing ranking methods.

## 7. Numerical results / baselines
Paper's stated claims (Table 1, Paris 2024): Bayesian top 3 = New Zealand (20 medals; posterior median 3.31/million, 95% CI 2.05–4.89), Australia (53 medals; 1.80, CI 1.32–2.31), Hungary (19 medals; 1.83, CI 1.06–2.89). Shrinkage examples: Grenada observed 17.09/million (per-capita rank 1) → posterior median 2.42 (Bayesian rank 5), CI 0.34–8.16; Dominica 15.15 (rank 2) → 1.10 (rank 21), CI 0.06–5.64; Saint Lucia 11.11 (rank 3) → 0.96 (rank 24), CI 0.05–4.98. USA: 126 medals but rank 51 (0.34/million, CI 0.29–0.41); China: rank 76 (0.06/million, CI 0.05–0.08). Ireland rank 15 (7 medals, 1.01/million). Claim: Bayesian ranking is more stable across Games than per-capita or U-index orderings (stability comparison stated qualitatively).

## 8. Code / data availability
Shiny app available (MacDermott et al. 2025) for exploring rankings; no code repository or raw-data download stated.

## 9. Leakage & limitations
Be adversarial: (a) The model is purely cross-sectional per Games — no temporal pooling across Olympics in the likelihood (stability is assessed post hoc); a fully longitudinal hierarchical model would shrink more honestly. (b) The "country effect only through p_c" assumption rules out country-specific multi-medal talent pipelines (e.g., US swimming producing multi-medal athletes at higher conditional rates) — untested. (c) Population is a crude exposure: it ignores sports funding, athlete delegation size (the actual at-risk population), and state sports systems — China/US under-ranked partly by construction. (d) Ranking by posterior *mean rank* vs posterior *median rate* give different orders (authors admit); the choice of ranking functional is ad hoc. (e) External validity to GSE: none directly — this is a descriptive ranking with no decision task, no predictive validation, and no betting relevance. The transferable part is only the shrinkage machinery.

## 10. GSE overlap
Extension. The existing-research-map covers calibration and shrinkage-adjacent ideas (CPOE shrinkage mentioned as "Bernoulli residual + shrinkage", temperature scaling, empirical Bayes nowhere explicit), but no repo work standardizes hierarchical shrinkage of small-sample NFL rates — GSE's gse-lab metrics (kicker FG%, red-zone rates, 3rd-down conversion, turnover luck components) are mostly raw empirical rates. Not in the 64-ID dedup list. The Beta-Binomial/hierarchical shrinkage discipline is a new methodological standard to adopt, not a duplicate.

## 11. GSE implementation spec
1. Inventory every small-sample rate in the GSE feature stack (kicker FG% by distance bin, team red-zone TD%, 3rd/4th-down conversion, turnover recovery rates, QB aggressiveness splits) and replace raw empirical rates with hierarchical Beta-Binomial posterior means: rate_i ~ Beta(α,β) with (α,β) learned from the league pool each season (empirical Bayes, exactly the paper's hyperprior logic). 2. Carry the posterior credible-interval width as an explicit uncertainty feature into the matchup model (wide CI = down-weight the feature). 3. Weekly updating: refit (α,β) as the season accumulates; early-season rates shrink hard to league mean, late-season rates go data-driven — this formalizes what GSE currently does ad hoc. 4. Effort: 1–2 days (one shared `shrink.py` module + wiring into feature builders).

## 12. Reproducible test
Dataset: nflverse 2015–2024; take team red-zone TD% through week 8 each season. Metric: log-loss of second-half red-zone TD% predicted by (a) raw first-half rate vs (b) hierarchical posterior mean. Baseline: raw empirical rate. Runnable: Python script, no charting data.

## 13. Acceptance / rejection gate
ADOPT league-wide hierarchical shrinkage for all small-sample rates if the posterior-mean predictor beats the raw rate on second-half log-loss by ≥ 0.01 in ≥ 7 of 10 seasons (2015–2024). REJECT (keep raw rates) otherwise.

## 14. Improvement experiment
Hierarchical shrinkage with *covariate-informed* priors: instead of shrinking every team to the league mean, shrink toward a regression prediction (e.g., red-zone TD% prior = f(offensive EPA, OL rankings)) — a hierarchical regression that pools toward similar teams rather than the global average. Test whether the covariate-informed posterior beats the plain league-mean shrinkage on the §12 gate; this is the natural generalization the Olympic paper didn't need (countries have no covariates) but the NFL has in abundance.
