# [1707] Mixed-Effects Modeling of NYC Subway Ridership Using MTA and Weather Data (arXiv:2505.02990)

**Citation:** Curtis, Z. & Haines, J. (2025). *Mixed-Effects Modeling of NYC Subway Ridership Using MTA and Weather Data*. arXiv:2505.02990. URL: https://arxiv.org/abs/2505.02990
**Ledger completed:** 2026-09-22. **Read:** full text (PDF via arXiv, Sections 1–5 + appendix with full R code, ~60k chars).
**Verdict**: REJECT
REJECT — one sentence: an undergraduate course project modeling monthly subway ridership with weather covariates — the mixed-effects + PCA methodology duplicates ledger 1703's sports-native treatment with weaker data (one year, monthly aggregation, n=50 sampled OD pairs) and the transit-demand subject matter has no path to GSE's prediction engine.

## 1. Research question
Do weather variables (gust speed, precipitation, temperature, dew point) explain monthly variation in NYC subway ridership across origin-destination pairs in 2023, and does origin borough moderate the effect?

## 2. Dataset / schema
MTA 2023 origin-destination ridership (115M+ rows via API, aggregated to monthly averages) joined to Weather Underground monthly weather (max/avg/min temp, dew points, total precip, max/avg wind, max/avg gust). Analysis sample: **50 OD pairs** with complete 12-month records. Single year, monthly granularity.

## 3. Method / model
Linear mixed-effects models (nlme/lme4): random intercepts (and slopes) for OD pair, borough indicators as fixed effects, compound-symmetry temporal correlation; PCA on 11 weather covariates (PC1 ~65%, PC2 ~19%, PC3 ~6%); borough-stratified models; Manhattan×gust interaction; December-confounding check.

## 4. Equations & assumptions
Y_ij = fixed borough intercepts/slopes + b_0i + b_1i·month + β·weather + ε_ij; corCompSymm within-pair correlation; REML estimation. Assumes linearity, monthly aggregation preserves the weather signal, 50 sampled pairs representative.

## 5. Features / target
Features: month, borough indicators, total_precip, max_wind, max_gust (+ PCs). Target: average monthly ridership per OD pair.

## 6. Validation design
AIC comparisons across nested models; t-tests on fixed effects; residual inspection. No holdout validation, no out-of-sample prediction, no cross-validation.

## 7. Numerical results / baselines
- **Max gust speed significant negative effect** on ridership (t ≈ −2.7 to −3.1); total precipitation and max wind insignificant.
- Effect concentrated in **Manhattan-originated trips** (max_gust t = −2.52, n.s. in other boroughs); Manhattan×gust interaction t = −3.07.
- December's significance **disappears** once max_gust is added — gust speed confounds the December effect (AIC 995.87 → 971.78).
- PC3 (steady-vs-gusty wind behavior) × month interaction significant (p = 0.03).
- Authors' own conclusion: weather has *minimal* influence on ridership since NYC depends on transit regardless.

## 8. Code / data availability
Full R code in appendix; dataset on GitHub (hainesdata/subway-ridership-longitudinal-analysis); Airflow ETL DAG linked.

## 9. Leakage & limitations
Course-project grade: n=50 OD pairs sampled from 111k possible; one year of monthly data cannot separate weather from seasonality (authors admit); no predictive validation; several models failed to converge; residual variance very high (σ² up to 25); causal claims about gust-avoidance behavior unsupported.

## 10. GSE overlap
Direct methodological duplicate of ledger **1703** (cross-country weather × performance mixed-effects), which does the same job — longitudinal mixed models with weather covariates and lagged effects — on actual sports data (24,582 finish times) with finer granularity and a real performance outcome. 1703 dominates on every dimension (sample size, outcome relevance, temporal resolution).

## 11. GSE implementation spec
None proposed — rejected. The one candidate transfer (weather-demand modeling for stadium attendance/ticket demand) is speculative: the paper's own finding is that weather barely moves transit demand, and GSE has no attendance-prediction lane.

## 12. Reproducible test
Not applicable — rejected.

## 13. Acceptance / rejection gate
REJECTED because: (a) transit ridership is not a sports quantity and has no credible path to GSE's fantasy/prediction products; (b) the methodology is strictly dominated by ledger 1703's sports-native equivalent; (c) data and validation are course-project grade (n=50, one year, no holdout). Replaced by ledger 1712 (2202.03034).

## 14. Improvement experiment
None — rejected. (The December-confounding diagnostic — a calendar effect dissolving under a weather covariate — is a nice pattern, but 1702/1703 already give GSE sharper versions of confounder analysis.)

**Verdict:** REJECT — transit-demand course project with no sports-prediction path, methodologically dominated by ledger 1703; replaced by 1712.
