# [1601] GOAL: Towards Benchmarking Few-Shot Sports Game Summarization (arXiv:2207.08635)

**Citation:** Wang, J., Zhang, T., & Shi, H. (2022). *GOAL: Towards Benchmarking Few-Shot Sports Game Summarization*. Soochow University. arXiv:2207.08635. URL: https://arxiv.org/abs/2207.08635
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the only English sports-game summarization dataset (few-shot benchmark); GSE-adaptable as the English-language testbed for the summarization pipelines from ledgers 1599/1600.

## 1. Research question
Can sports game summarization move beyond Chinese-only corpora — i.e., does a small English dataset (goal.com football commentary→news) with few-shot, semi-supervised, multilingual, and cross-lingual benchmark settings still pose the same challenges, and which end-to-end baselines cope best with the limited labeled data?

## 2. Dataset / schema
GOAL: 103 labeled English commentary–news pairs (goal.com, UCL/Europa/Premier/Serie A 2016–2020 — the same 2,263-match collection as the SOCCER dataset in ledger 1597; only <10% of games have news), avg commentary 2,724.9 words / news 476.3 words (longer inputs than Chinese corpora). Split 63/20/20 train/val/test. Plus 2,160 unlabeled commentary documents for semi-supervised (self-training) research. English news machine-translated to Chinese by 4 volunteers + expert check for a cross-lingual setting (63 cross-lingual training samples). Released: github.com/krystalan/goal. Key structural difference: English commentaries carry no per-timestamp score field (Chinese corpora use (t, c, s)); models must infer game state implicitly.

## 3. Method / model
No new model — benchmark paper. Evaluated end-to-end baselines: Longest-k, TextRank, PacSum (extractive); PGN (LSTM abstractive); LED-base-16384 (long-document transformer, 4,096-token input truncation, 1,024 output, beam 4). Pipeline select→rewrite methods from prior work deliberately not used (63 labeled samples insufficient to train a selector).

## 4. Equations & assumptions
ROUGE-1/2/L (py-rouge). Assumptions: 63 training samples make this a true few-shot setting; Chinese corpora transferable in multi-lingual settings (untested — reserved for future work); translation quality adequate for cross-lingual benchmark.

## 5. Features / target
Features: full commentary document C = {(t_i, c_i)}. Target: sports news R = {r_1..r_m}.

## 6. Validation design
20-sample validation, 20-sample test; ROUGE-1/2/L on test. Implementation: LED lr 3e-5, batch 4, 10 epochs, 20 warmup; PacSum β=0.1, λ1=0.9, λ2=0.1, TF-IDF sentence reps.

## 7. Numerical results / baselines
Test ROUGE-1/2/L: Longest 30.3/4.2/19.5; TextRank 27.6/2.9/18.8; PacSum 31.0/5.3/19.6; PGN 32.8/5.7/21.4; LED 34.7/7.8/24.3 (best). All absolute scores far below Chinese-dataset numbers (e.g., ROUGE-L ~47 in ledgers 1599/1600) — the few-shot setting plus longer inputs plus missing score field makes this genuinely hard. Qualitative: LED output has repeated phrases, misses important events; key-verb probing shows it handles common events ("beat") but fails on rarer ones ("blocking").

## 8. Code / data availability
Dataset at github.com/krystalan/goal; baselines via public implementations (summanlp/textrank, mswellhao/PacSum, allenai/led-base-16384 on HuggingFace).

## 9. Leakage & limitations
Only 20 test samples — wide confidence intervals, noisy ROUGE comparisons; semi-supervised, multi-lingual, and cross-lingual settings proposed but not actually benchmarked (all reserved as "future work"); no human evaluation; LED repetition problem unaddressed; scores inferred implicitly without evaluation of state-tracking accuracy.

## 10. GSE overlap
Distinct from ledgers 1599/1600 (Chinese, large-scale, new methods); this one is English + few-shot + benchmark-only. No prior English NFL summarization dataset in the corpus; this is the closest English-language transfer point for the select→rewrite→rerank and knowledge-fusion pipelines.

## 11. GSE implementation spec
Use GOAL as the English validation bed before spending annotation budget on NFL: (a) port the SportsSum2.0 select→rewrite→fluency-MMR-rerank pipeline (1599) and the KES knowledge-fusion recipe (1600) to GOAL's English soccer data — if they beat LED's R-L 24.3, the architectures transfer to English; (b) replicate the semi-supervised self-training setup on the 2,160 unlabeled docs (the direct analog of training on unlabeled NFL text streams with a small hand-labeled set); (c) use the key-verb probing idea (Figure 2) as a diagnostic for sports-domain familiarity in any GSE content model.

## 12. Reproducible test
Replicate Table 2 on the released GOAL split (LED test R-1 ≥ 33, R-2 ≥ 7, R-L ≥ 23; extractive baselines ≤ LED). For GSE: any adapted pipeline must beat LED's 24.3 ROUGE-L on the GOAL test set before being applied to NFL data.

## 13. Acceptance / rejection gate
ACCEPTED (ADAPT): first and only English sports-summarization dataset + four benchmark settings defined + public release. Small scale and unevaluated settings bound it; as a benchmark and transfer testbed it is solid ADAPT material, not a new method to adopt.

## 14. Improvement experiment
Actually run the semi-supervised (self-training on 2,160 unlabeled) and multi-lingual (Chinese-pretrained) settings the paper proposes; test select→rewrite with few-shot selector warm-starting from SportsSum2.0 pseudo-labels; fix LED's repetition with the 1599 fluency-MMR reranker; evaluate state-inference accuracy (score tracking) separately since the missing score field is GOAL's distinctive difficulty.
