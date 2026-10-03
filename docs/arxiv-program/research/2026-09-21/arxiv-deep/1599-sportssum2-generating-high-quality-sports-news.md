# [1599] SportsSum2.0: Generating High-Quality Sports News from Live Text Commentary (arXiv:2110.05750)

**Citation:** Wang, J., Li, Z., Yang, Q., Qu, J., Chen, Z., Liu, Q., & Hu, G. (2021). *SportsSum2.0: Generating High-Quality Sports News from Live Text Commentary*. Proc. CIKM '21. arXiv:2110.05750. URL: https://arxiv.org/abs/2110.05750
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — three-step (select → rewrite → rerank) commentary-to-news summarizer with a lexical+semantic pseudo-labeler; GSE-adaptable to compress NFL text streams into daily recap briefs.

## 1. Research question
Can sports game summarization be improved by (a) manually cleaning >15% noisy articles from the large SportsSum dataset, (b) adding lexical overlap (ROUGE) to the semantic-only (BERTScore) pseudo-labeling algorithm, and (c) replacing direct sentence stitching with a reranker that jointly optimises informativeness, fluency, and redundancy?

## 2. Dataset / schema
SportsSum2.0: 5,402 human-cleaned Chinese sports-game samples (from SportsSum's 5,428; 26 "bad cases" dropped after 7 annotators + 2 experts, ~200 human hours). Noise taxonomy: 2.2% descriptions of other games, 4.6% misplaced history preamble, 9.8% ads/hyperlinks. Schema: live commentary document C = {(t_j, s_j, c_j)} (avg 194 sentences, 1,828 words) → news article R = {r_i} (avg 22 sentences, 407 words). Split: 4,803 train / 300 val / 299 test (original split minus 26 drops). Dataset released: github.com/krystalan/SportsSum2.0.

## 3. Method / model
Reranker-enhanced summarizer: (1) context-aware selector — RoBERTa-large binary classifier over target sentence + sliding context window ([CLS] c1 [SEP] ... [SEP] cN [SEP], 512 tokens, target centered; avg token embeddings → sigmoid; cross-entropy); (2) rewriter — commentary+timeline → news sentence via PGNet / Bert2bert / mBART; (3) reranker — fluency-aware MMR variant: MMR(D,R) = argmax_{d_i ∈ D−R}[λ1·info(d_i) + λ2·flu(d_i) − λ3·max_{d_j ∈ R} sim(d_i,d_j)], λ = (0.6,0.2,0.2), info = selector's commentary importance, flu = 1 − perplexity(d_i)/η with GPT-2 perplexity, sim = BERTScore; greedy selection to average-article length budget. Pseudo-labeler: candidate commentaries in timeline window [h_i, h_i+3]; similarity S(r_i,c_j) = λ·BERTScore(r_i,c_j) + (1−λ)·ROUGE(r_i,c_j), λ = 0.7.

## 4. Equations & assumptions
S(r_i,c_j) = λB(r_i,c_j) + (1−λ)R(r_i,c_j) (λ=0.7); flu(d_i) = 1 − perplexity(d_i)/η; λ1+λ2+λ3=1. Assumptions: news sentences carry "in the n-th minute" time markers; timeline window [h_i, h_i+3] contains the source commentary; GPT-2 perplexity proxies fluency; importance transfers from commentary selector to rewritten sentence.

## 5. Features / target
Features: commentary sentence + sliding window context; timeline + score metadata; rewritten news sentences. Targets: binary importance labels (pseudo-labeled), news sentences, final ranked set.

## 6. Validation design
ROUGE-1/2/L on SportsSum2.0 and original SportsSum; baselines: TextRank, PacSum (extractive), Abs-LSTM, Abs-PGNet (abstractive), SportsSUM two-step + enhanced two-step variants (PGNet/mBART/Bert2bert rewriters, old vs new pseudo-labeler). Ablation of pseudo-labeler via ∗ vs † rows. Human evaluation: 5 postgrads × 100 samples each scoring SUM-Clean vs SUM-Noisy on informativeness/redundancy/fluency/overall (3-point scale).

## 7. Numerical results / baselines
Best reranker model (Bert2bert∗) on SportsSum2.0: ROUGE-1 48.13, ROUGE-2 20.09, ROUGE-L 47.78 — vs SportsSUM baseline 44.73/18.90/44.03 (+2.8 avg points); on SportsSum: 47.61/19.65/47.49 vs 43.17/18.66/42.27 (+3.5 avg). Advanced pseudo-labeler beats original consistently (rows 8→9, 12→13). Human eval: SUM-Clean outperforms SUM-Noisy on all four aspects, largest gap on fluency — confirming dataset noise degrades generation quality.

## 8. Code / data availability
Dataset at github.com/krystalan/SportsSum2.0; models built on HuggingFace Transformers (RoBERTa-large, mBART, GPT-2). Repo/paper states release.

## 9. Leakage & limitations
Chinese-only corpus; pseudo-labels still heuristic (BERTScore+ROUGE argmax within a ±3-min window — mismatch risk); selector's info score reused as the rewritten sentence's info (style shift unaccounted); reranker λ's set by hand, not learned; GPT-2 perplexity as fluency is crude; no human evaluation of the final three-step outputs beyond the Clean-vs-Noisy ablation.

## 10. GSE overlap
No GSE commentary-summarization pipeline exists; complements the text-signal lanes (1594–1598): those detect events, this compresses the surrounding commentary into readable news briefs. The pseudo-labeling + rerank design is novel to the corpus.

## 11. GSE implementation spec
Adapt the three-step pipeline to NFL English text streams: (a) pseudo-label beat-writer articles to play-by-play/injury-report sentences using the S = λ·BERTScore + (1−λ)·ROUGE recipe inside timestamp windows; (b) train a context-aware selector (RoBERTa/DeBERTa) over rolling windows of X posts/articles to extract signal sentences; (c) rewrite with a modern seq2seq LLM and rerank with the fluency-aware MMR (perplexity from the LLM itself) to assemble daily NFL recap briefs, injury digest posts, or @GalaxySportsHQ content drafts; budget = target post length.

## 12. Reproducible test
Replicate Table 2's key cells on the released SportsSum2.0 split (Bert2bert∗ reranker: R-1 ≥ 47.5, R-2 ≥ 19.8, R-L ≥ 47.0). For GSE: on a hand-labeled week of NFL news, selector precision@k on pseudo-labeled targets ≥ 0.5 and reranked briefs rated ≥ "SUM-Clean" fluency by an LLM judge vs a naive stitch baseline.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): clean public dataset + reproduced SOTA + ablations isolating all three contributions. Chinese-only and heuristic pseudo-labels bound direct reuse; the select→rewrite→fluency-MMR-rerank architecture transfers to English NFL streams cleanly.

## 14. Improvement experiment
Learn the MMR λ's end-to-end (differentiable ranking); replace GPT-2 perplexity with an LLM-as-judge fluency score; test the pseudo-labeler recipe on English NFL commentary with the timeline-window mechanism; add a faithfulness constraint (entailment vs source commentary) to the reranker to suppress hallucinated news sentences.
