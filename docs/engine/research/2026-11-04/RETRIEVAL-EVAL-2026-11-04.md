# Retrieval Quality Evaluation — 2026-11-04

**Corpus:** 6,495 deduped records, 3,046 full text, 284,717 terms
**Harness:** `scripts/research/retrieval_eval_2026_11_04.py`
**Tests:** `tests/test_retrieval_eval.py` (8 tests)

## Why this exists

The corpus had 357 correctness tests — each asserting "query X returns doc Y"
— but no aggregate quality metric. Correctness tests prove individual queries
work; they cannot tell you whether a ranking change improved or regressed the
system overall. This harness answers that.

## Method

20 queries, each with hand-curated ground-truth title substrings. A retrieved
record counts as relevant when its title contains one of the substrings. This
measures whether the retriever surfaces *the specific document a domain expert
would name*, not whether it returns something vaguely on-topic.

Metrics (k=10):
- **MRR** — mean reciprocal rank of the first relevant hit
- **NDCG@10** — normalised discounted cumulative gain
- **R@10** — recall against the *true* number of matching corpus documents
- **P@10** — precision at 10
- **H@1 / H@3** — queries whose first relevant hit is at rank 1 / within 3

## Results

| Ranker | MRR | NDCG@10 | R@10 | P@10 | H@1 | H@3 | Misses |
|---|---|---|---|---|---|---|---|
| bm25 (raw) | 0.7917 | 0.7694 | 0.8162 | 0.1850 | 14/20 | 17/20 | 1 |
| fused (RRF, no prior) | 0.8306 | 0.8259 | 0.8300 | 0.2100 | 15/20 | 18/20 | 1 |
| **prior (production)** | **0.8377** | **0.8440** | **0.8800** | **0.2150** | **15/20** | **18/20** | **0** |

The production default — RRF fusion plus sport-domain prior — wins on every
metric and is the only ranker with zero misses. That is the measured
justification for shipping the prior instead of raw BM25.

Incremental gains:
- RRF fusion over BM25: **+0.039 MRR**, +0.057 NDCG@10
- Domain prior over fusion: **+0.007 MRR**, +0.018 NDCG@10, +0.050 R@10
- Domain prior over BM25: **+0.046 MRR**, +0.075 NDCG@10, +0.064 R@10

## A bug the harness caught in itself

The first version divided recall by the length of the ground-truth list rather
than the true number of matching documents. Because a query like "soccer
expected goals" matches many corpus documents, recall came out at **1.65** and
NDCG at **1.15** — impossible values that no correctness test would have
caught. Fixed by computing per-query totals with a corpus scan. `tests/
test_retrieval_eval.py` now pins NDCG/recall/precision to [0, 1].

This is the argument for aggregate metrics: the harness was silently lying, and
only a bound check revealed it.

## Remaining misses

- bm25 misses "daily fantasy sports lineup optimization" — BM25 alone does not
  connect "lineup optimization" to the DFS paper's vocabulary.
- fused misses "football player tracking broadcast" — cosine and BM25 agree on
  the wrong pool without the domain prior.
- The production ranker misses nothing.

## What this does not measure

- **Semantic recall.** There are no dense embeddings. A query whose words never
  appear in a relevant document will miss, and no amount of BM25 tuning fixes
  that. The next quality step is a small embedding index, not more weighting.
- **Answer quality.** This measures document retrieval, not whether a model
  reading those documents arrives at a correct conclusion.
- **Latency.** Fast enough to be unnoticed (index build ~12s, query <10ms), but
  not formally benchmarked.
