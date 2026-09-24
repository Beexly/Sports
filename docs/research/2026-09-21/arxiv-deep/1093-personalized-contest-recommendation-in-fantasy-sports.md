# [1093] Personalized Contest Recommendation in Fantasy Sports (arXiv:2508.14065v1)

**Citation:** Srilakshmi, M., Kothari, K., Marathe, K., Chigurupati, V., & Kapoor, H. (2025). *Personalized Contest Recommendation in Fantasy Sports*. arXiv:2508.14065v1. URL: https://arxiv.org/abs/2508.14065
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — WiDIR's wide+deep multi-branch architecture with pairwise hinge loss is a production-proven blueprint for GSE contest/content personalization; the paper's scale (1B joins) validates the design.

## 1. Research question
On a large fantasy platform (Dream11), each player-match has a long list of available contests; how do you rank the right contests for each user to maximize joins? The paper frames it as a personalized ranking problem over (user, match, contest) triples and proposes WiDIR (Wide and Deep Interaction Ranker): a wide linear branch plus separate deep branches for player features, contest features, and player–contest interaction features, trained with a pairwise ranking loss.

## 2. Dataset / schema
Dream11 production data. Train: ~1 billion joins, 100,000 players, 1.5 million total contests. Test: ~0.5 billion joins, 100,000 players, 0.9 million total contests. Split: ~12 months train, 2 months validation, 6 months test (time-ordered). Raw dimensions: 107 player features, 11 contest features, 9 player–contest interaction features. Each player–match list is fixed to 100 contests (alternatives 50/100/200 evaluated). Proprietary; not public.

## 3. Method / model
WiDIR: a wide component (linear, memorizes feature interactions) plus three deep branches — (a) player tower, (b) contest tower, (c) interaction tower — whose embeddings are concatenated and scored. Training uses a pairwise hinge loss: `max(0, 1 − s_i(c) + s_i(c′))` where s_i(c) is the score of contest c for user i and c′ is a lower-ranked contest. Offline evaluation: precision/recall at 1, 3, 5, 10. Online: a 4-arm A/B test (control, Popular baseline, LightGBM ranker, WiDIR), 1 million players per cohort, 6 weeks. Serving: rankings returned within 10 ms; inference restricted to users active in the previous month.

## 4. Equations & assumptions
- Pairwise hinge loss: `max(0, 1 − s_i(c) + s_i(c′))`.
- Architecture: wide linear branch + deep player/contest/interaction branches, embedding concatenation, final scoring layer. (Exact layer widths/hyperparameters are in the paper's implementation section.)
- Assumptions: join behavior is a revealed-preference ranking signal; pairwise preferences are transitive enough for hinge loss; the 100-contest candidate list covers the relevant choice set; user tastes are stable enough that a 12-month training window generalizes to the 6-month test window.

## 5. Features / target
Inputs: 107 player features (history, activity, preferences), 11 contest features (entry fee, prize pool, size, type), 9 interaction features (affinity between player habits and contest attributes). Target: ranking of contests by join likelihood for a (user, match) pair — a learning-to-rank target, not a pointwise label.

## 6. Validation design
Time-ordered split (12 mo train / 2 mo validation / 6 mo test). Offline: P/R@1,3,5,10 vs Popular and LightGBM baselines. Online: 4-arm A/B, 1M users per arm, 6 weeks — the gold standard for recommender validation. Note: the paper's figures show the lifts but the extracted text gives no exact numeric lift values — the plots carry the magnitudes.

## 7. Numerical results / baselines
- WiDIR beat Popular and LightGBM offline (P/R@k) and won the online A/B (paper reports the win via plots; exact numeric lifts not stated in text — chart-read only).
- Scale: ~1B training joins; 100k users; 1.5M contests.
- Serving latency: rankings within 10 ms.
- Inference cohort: users active in the previous month.

## 8. Code / data availability
None stated. Proprietary Dream11 data; no public code.

## 9. Leakage & limitations
Time-ordered splits and a 6-week online A/B mitigate leakage well. Limitations: no exact online lift numbers in the text (plots only); the 100-contest candidate list construction isn't fully detailed (candidate generation bias); interaction features (9) are hand-engineered and platform-specific; results are from one platform's user base (generalization to GSE's audience unproven); the paper doesn't ablate the wide vs deep branches individually in the extracted text.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No existing GSE work on contest/content recommendation — the map's personalization-adjacent items are about calibration and metrics, not recommenders. The repo has no ranking/recommender-system lane. This is a new capability: personalized ranking of contests, articles, picks, or notifications per user. Adjacent to the product surface, not the prediction engine — but directly relevant to GSE's content operation (weekly DFS packets, pick cards).

## 11. GSE implementation spec
Adapt the architecture, not the weights: (1) define GSE's ranking surfaces — e.g., which picks/articles/contests to show each subscriber, notification prioritization. (2) Build the three-tower feature set: user tower (subscription tier, sport preferences, past click/join behavior), item tower (pick confidence, sport, slate, content type), interaction tower (user's historical ROI on similar picks). (3) Train with pairwise hinge loss on implicit feedback (clicks, joins, follows). (4) Serve with a candidate-generation → ranking two-stage pipeline; distill or cache for <100 ms latency. Data: GSE's own engagement logs (no external data). Effort: 2–3 weeks for the first ranking surface (e.g., personalized pick feed).

## 12. Reproducible test
Offline: time-ordered split of GSE engagement logs (6 months train, 1 month validation, 2 months test); metric P/R@5 on held-out joins/clicks; baseline = popularity ranker + LightGBM ranker (mirroring the paper). Pass = WiDIR-style model beats both baselines on P/R@5. Online (later): A/B with join/click-through as the success metric.

## 13. Acceptance / rejection gate
ADAPT if the offline test beats the LightGBM baseline by ≥5% relative on P/R@5 on the time-ordered test window. REJECT the adaptation if the deep model can't beat gradient boosting — at GSE's data scale, a well-tuned GBM may dominate, and the paper's advantage was demonstrated at 1B-join scale.

## 14. Improvement experiment
Add a calibration head: the paper ranks but doesn't calibrate join probabilities. Train a secondary isotonic/Platt calibration on the ranking scores so GSE can threshold ("only notify if P(join) > x") and do expected-value computations on notifications. Also test a two-tower (user/item) retrieval model for the candidate-generation stage, which the paper leaves fixed at 100.
