# [0888] PLACKETT-LUCE MODEL FOR LEARNING-TO-RANK TASK (arXiv:1909.06722v1)

**Citation:** Tian Xia, Shaodan Zhai (2019). *PLACKETT-LUCE MODEL FOR LEARNING-TO-RANK TASK*. arXiv:1909.06722v1 [cs.IR]. URL: https://arxiv.org/abs/1909.06722v1 — Wright State University preprint.
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-1909.06722v1.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — PLRank (Plackett–Luce/ListMLE loss inside gradient-boosted trees) beats LambdaMART on Yahoo 2010 NDCG@10 (0.7902–0.7903 vs 0.7809; industry-tuned 0.802 vs 0.796) at similar complexity, and the paper's instability diagnosis (linear ListMLE needs feature richness: ~200 features for NDCG@1, ~100 for NDCG@10) is a concrete design rule for GSE's pick-ranking models. Web-search domain, no sports validation — the adaptation is the loss function, not the trained model.
**Replacement context:** Fresh-search replacement (query: `"pairwise comparison" sports football soccer rating arXiv 2025`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: Tian Xia, Shaodan Zhai (Wright State University). arXiv v1 dated 2019-09-15. Learning-to-rank method paper; experiments on Yahoo 2010 and Microsoft 30K datasets.

## Research question
Can the Plackett–Luce (ListMLE) listwise loss be made practical and stable inside a gradient-boosting framework with regression-tree weak learners — and does it beat the pairwise/listwise incumbents (LambdaMART, McRank)?

## Dataset / schema
- Yahoo 2010 learning-to-rank set: 519 features per query-document pair.
- Microsoft 30K (MSLR-WEB30K-class): large web-search ranking set.
- Schema: query id, document id, feature vector, graded relevance label.
- Access: public LETOR-style datasets.

## Method
- **PLRank**: Plackett–Luce likelihood as the listwise loss inside gradient boosting; exact functional gradient (paper's Eqn 9) and Newton leaf-value step for regression trees.
- Multi-permutation ground truth: handles multiple valid rankings via a compression scheme.
- Compared against LambdaMART (pairwise/listwise GBDT incumbent) and McRank (multi-class classification approach).

## Equations / math / assumptions
- PL log-likelihood over a ranked list: L = Σ_i [s_{π(i)} − log Σ_{j≥i} exp(s_{π(j)})], with document scores s from the boosted ensemble.
- Functional gradient (Eqn 9): exact derivative of the PL loss w.r.t. each document's score — stated exactly in the paper; Newton step for leaf values.
- Assumptions: graded relevance labels induce a (possibly multi-) permutation ground truth; the PL model over permutations is the right listwise model; tree weak learners suffice for the score function.

## Features / target
- Features: 519 (Yahoo) query-document features.
- Target: ranked list maximizing NDCG@K.

## Validation
- Yahoo 2010: PLRank NDCG@10 0.7902–0.7903 vs LambdaMART 0.7809; industry-tuned PLRank(obj=1) 0.802 vs LambdaMART 0.796.
- Microsoft 30K: PLRank matches LambdaMART/McRank across measures.
- Complexity: same order as LambdaMART; much faster than McRank (126h vs 250+h single core).

## Exact results with baselines
- Yahoo 2010 NDCG@10: PLRank 0.7902–0.7903 vs LambdaMART 0.7809 (~1–1.2 pts).
- Industry-tuned: PLRank(obj=1) 0.802 vs LambdaMART 0.796.
- MS30K: parity with LambdaMART/McRank.
- Training time: PLRank ≈ LambdaMART; McRank 250+h vs PLRank 126h single-core.
- Instability rule: linear ListMLE unstable unless #features large vs avg docs/query (~200 features needed for NDCG@1, ~100 for NDCG@10 on Yahoo; MS30K linear ListMLE ~8 pts worse than the classification approach).

## Code / data availability
None stated.

## Leakage
- Standard LETOR splits; no temporal leakage issue for the web domain. Transfer risk: the NDCG gains are on web search; sports pick-ranking has far fewer "documents" per query (games per slate) and noisier labels.

## Limitations
- Web-search domain only; no sports or betting validation.
- The instability diagnosis is empirical (thresholds are dataset-specific, not theorems).
- No calibration of the predicted ranking scores as probabilities.

## GSE overlap vs existing-research-map
Existing-research-map.md has no learning-to-rank paper in the corpus; ranking of betting opportunities is currently done by sorting on model edge, not by a listwise loss. The map notes learning-to-rank as a commissioned ML-brief topic — this paper is the corpus's first concrete listwise-ranking method. Novel, complementary.

## Implementation spec (GSE adaptation)
- **What to build:** a GSE pick-ranker trained with the PL/ListMLE listwise loss: each slate is a "query," each candidate bet a "document," graded relevance = realized CLV bucket (or realized profit bucket). Train gradient-boosted trees on the PL loss; serve the ranked slate.
- **Design rule from the paper:** ensure feature richness per slate (the instability finding) — if the feature count is small relative to slate size, prefer boosted trees over linear ListMLE (exactly the paper's remedy).
- **Effort:** 1–2 weeks to swap the loss function in GSE's existing GBDT pick-ranker and backtest.

## Reproducible test
- On GSE's 2024 pick history: train LambdaMART-style (pairwise) vs PLRank-style (listwise PL loss) rankers on identical features; compare slate NDCG@10 (graded by realized CLV) and top-decile realized ROI.

## Numeric gate
- ADAPT confirmed if the PL-loss ranker beats the pairwise ranker on 2024-slate NDCG@10 by ≥0.005 OR top-decile realized CLV is higher with p<0.1. If parity, the instability design rule still stands as the takeaway.

## Improvement experiment
- **Calibration head:** add a Platt/isotonic calibration layer mapping PL scores to P(positive CLV); test whether calibrated listwise scores improve Kelly stake sizing vs raw scores. Success: Kelly growth rate higher with calibrated scores over a season.

## Verdict
**ADAPT** — The loss function is the asset: listwise PL loss is the theoretically right objective for "rank my betting opportunities," it beats LambdaMART on the standard benchmark, and the feature-richness precondition is a genuine engineering rule. The sports validation is GSE's job, and the reproducible test is designed for exactly that.
