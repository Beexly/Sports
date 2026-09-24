# [0258] Learning GraphQL Query Costs (Extended Version) (arXiv:2108.11139v2)

**Citation:** Mavroudeas, G., Baudart, G., Cha, A., Hirzel, M., Laredo, J. A., Magdon-Ismail, M., Mandel, L. & Wittern, E. (2021). *Learning GraphQL Query Costs (Extended Version)*. arXiv:2108.11139v2. URL: https://arxiv.org/abs/2108.11139
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2949 lines).
**Verdict:** REJECT — sound ML-for-systems paper (GraphQL query-cost estimation), but GSE is an API *consumer*, not a GraphQL API *provider*; there is no query-cost-estimation problem in GSE's stack for this method to solve.

## 1. Research question
Can machine learning estimate the true execution cost (type complexity) of a GraphQL query before running it — accurately enough to replace worst-case static-analysis upper bounds that grossly overestimate cost — so that API providers can do fairer rate limiting and clients can budget their queries?

## 2. Dataset / schema
100,000 query-response pairs from the GitHub GraphQL API and 30,000 from the Yelp GraphQL API (queries synthetically generated with the authors' tooling; responses from the real commercial APIs). Table 2: GitHub query size mean 109 (max 1,425), response cost mean 79 (max 2,548); Yelp query size mean 66 (max 229), response cost mean 1,301 (max 7,363). Artifact: https://github.com/Alan-Cha/graphql-complexity-paper-artifact.

## 3. Method / model
estimate(s,c,q) = m(h(s,c,q)) ≈ tcx(r, Query, c): decompose cost estimation into an embedding h (query → ℝᵏ) and a regressor m.
Three feature extractors:
- h_f — field features: bag-of-words counts of each schema field's occurrences in the query;
- h_g — graph2vec embeddings of the query's abstract syntax tree (unsupervised, doc2vec-style over subgraphs);
- h_s — six summary features via symbolic analysis: (i) Cha et al. static-analysis upper bound, (ii) query size (AST nodes), (iii) width (max children), (iv) nesting (max depth), (v) lists (count of list-requesting fields), (vi) sum of list limits (e.g. `first`). Example vector: [118,17,2,3,3,115].
Learning: three independent Lale AutoML pipelines (StandardScaler → {No-Op, polynomial, Nystroem} → {linear regression, decision tree, Ridge, random forest, kNN k=3, gradient boosting}), 43 free hyperparameters, 5-fold CV with Hyperopt (60 h / 1,500 combinations per dataset), then a stacked ensemble m_final trained on the three models' estimates [ĉ_f, ĉ_g, ĉ_s] (Wolpert 1992 stacking; found better than concatenating raw features).

## 4. Equations & assumptions
estimate: SDL×𝒞×𝒬→ℝ; estimate(s,c,q) ≈ tcx(r,Query,c); estimate(s,c,q) = m(h(s,c,q)). MAE = 1/n Σ|c_i − ĉ_i|. Error% = (ĉ−c)/c. Assumptions: type complexity is the right cost measure; synthetic queries are representative of real traffic; static upper bound is a useful feature (it is — the model leans on it in the malicious regime); training must be refreshed as the data source evolves (external-validity threat).

## 5. Features / target
Input: GraphQL query + schema (AST-derived features above). Target: actual response type complexity (cost) observed from the API.

## 6. Validation design
5-fold cross-validation for pipeline selection per dataset; final MAE vs. static analysis (Cha et al. 2020a, which itself beat three popular GraphQL cost libraries); per-feature-group ablation (Table 5); mutual-information feature ranking (Table 6); rate-limit simulator (1,000 sims × 1,000 queries) measuring acceptance rate, cumulative budget use, and violation rates; adversarial robustness simulation (inflated static-bound feature on normal-looking queries).

## 7. Numerical results / baselines
Table 4 (MAE ± std, estimated vs actual cost): GitHub — static 31.5 ± 263.8 vs ML 8.2 ± 35.5; Yelp — static 14,180.5 ± 30,827.9 vs ML 60.7 ± 180.4. Table 5 ablations: no single feature group matches the stacked ensemble (GitHub MAE: summary 8.7, field 14.9, embedding 31.58, final 8.2; Yelp: 102.4 / 320.8 / 880.9 / 60.7 — embeddings worst on both). Hyperopt's preferred predictor was gradient boosting (GBR) in most pipelines (Table 3). Practicality: the ML-gated simulator accepts a larger share of queries under a fixed budget; cumulative actual cost stays below budget on average; threshold violations ≤6% of accepted queries on GitHub (≤80% over) and ≤15% on Yelp. Robustness: ML estimate rises rapidly as the static-bound feature enters the malicious regime, so disguised expensive queries get rejected; GBR plateaus outside training range (no extrapolation). All numbers are the authors' claims on their GitHub/Yelp samples.

## 8. Code / data availability
Dataset + generation tooling released at https://github.com/Alan-Cha/graphql-complexity-paper-artifact. Code for the Lale pipelines: referenced via the artifact repo; no separate package claimed.

## 9. Leakage & limitations
- The model is trained per-API on synthetic queries; the authors concede random queries may not match real user workloads and predictions decay as the API/data evolves — retraining is required.
- Underestimation is inherent (no upper-bound guarantee); the rate-limit use case tolerates it only statistically — a provider that cannot tolerate any over-budget query must fall back to the static bound, erasing the ML benefit.
- graph2vec embeddings — the most "learned" feature — performed worst alone; the win comes mostly from descriptive summary features + the static bound as a feature. The ML contribution is real but narrower than the framing suggests.
- No comparison to simpler baselines (e.g., linear regression on summary features alone — Table 5 shows summary-only MAE 8.7 vs final 8.2 on GitHub, i.e., the stack adds almost nothing there).
- Zero sports content; the entire problem (GraphQL API rate management) is a provider-side infrastructure concern.

## 10. GSE overlap
None. The existing-research map has no API-infrastructure or query-cost lane, and GSE does not operate a GraphQL API, manage third-party rate limits as a provider, or need pre-execution cost estimation: GSE *consumes* APIs (Odds API, nflverse downloads) where usage is metered by request count, not by query complexity. The paper's method solves a problem GSE does not have; there is no engine, data, or content application.

## 11. GSE implementation spec
None warranted. The only adjacent need — staying within API rate limits as a consumer — is solved by request counting and caching, not by ML cost prediction.

## 12. Reproducible test
Not applicable — no GSE decision depends on this paper's claims. Its internal results (ML beats static analysis on GitHub/Yelp) are self-contained and already released with an artifact for anyone who runs a GraphQL API.

## 13. Acceptance / rejection gate
REJECTED outright. Reconsider only if GSE ever becomes a GraphQL API provider with rate-limit fairness as a product requirement — a scenario with no current basis.

## 14. Improvement experiment
None for GSE. The paper's own open thread (the GitHub summary-features-nearly-suffice result, Table 5) suggests the honest follow-up is a cheaper single-regressor baseline — but that follow-up belongs to API-infrastructure research, not to GSE.
