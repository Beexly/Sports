# [1504] SUMMIR: A Hallucination-Aware Framework for Ranking Sports Insights from LLMs (arXiv:2604.04947v1) — REPLACEMENT for [1478]

**Citation:** Nitish Kumar, Sannu Kumar, S Akash, Manish Gupta, Ankith Karat, Sriparna Saha (2026). *SUMMIR: A Hallucination-Aware Framework for Ranking Sports Insights from LLMs*. arXiv:2604.04947v1 [cs.IR], 30 Mar 2026. URL: https://arxiv.org/abs/2604.04947
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf).
**Replaces:** [1478] (REJECT — qualitative LLM sports-medicine perspective, no dataset/method/results).
**Verdict:** ADAPT

## 1. Research question
How can LLMs automatically extract pre-game and post-game insights from sports news at scale, verify them against hallucination, and rank them by user-specific interest?

## 2. Dataset / schema
32,630 articles scraped via Google Search API (3-day window around each match), two-tier LLM validation → **7,900 relevant articles across 800 matches** (200 each: cricket, soccer, basketball, baseball). 996 manually labeled articles used to select the first-tier validator. **281,163 structured insights** generated, categorized: New Records, Key Match Events, Pre-game Insights, Post-match Reflections, Miscellaneous Highlights, Others. 4,750 insight-ranking data points with gold ranks from Llama 3.3 70B.

## 3. Method / model
- **Two-tier article validation:** Qwen 2.5 32B Instruct first pass (precision 88.5%, recall 89.1% on the 996 labeled articles) → second pass with GPT-4o / Qwen2.5-72B / Llama-3.3-70B / Mixtral-8x7B (validated counts: 6,651 / 7,843 / 7,593 / 6,890).
- **Sport-specific prompt templates** (cricket template given verbatim) producing JSON-categorized insights; insight counts: GPT-4o 68,212; Qwen2.5-72B 77,546; Llama-3.3-70B 85,748; Mixtral-7B 49,657.
- **Hallucination detection:** FactScore (GPT-4o verifies each insight against its source article, binary atomic scores aggregated) + SummaC-Conv NLI entailment at sentence level.
- **SUMMIR ranking:** six bounded features per insight — semantic (all-MiniLM-L6-v2 + sports lexicon + FAISS generalization), emotional intensity (roberta-base-go-emotions), sarcasm (T5-base; nullifies emotion when sarcastic), TF-IDF, buzzwords (10k-term sports lexicon scored by VADER/Afinn/SentiWordNet), NER (Pantheon popularity). **ScoreNet:** w = softmax(ℓ), f_ℓ(x) = Σ_{j=1..6} w_j x_j — differentiable relevance prior. Reward R = σ(0.7·N_gold + 0.3·N_SN) over NDCG@k (k = max(1,⌊n/2⌋)); **PPO** fine-tunes Llama 3.2 1B as a permutation policy (lr 2e-5, target_kl 0.2, cliprange 0.1, max_grad_norm 0.5, nucleus p=0.9/T=0.7).

## 4. Equations & assumptions
- DCG_k(p,r) = Σ_{t=1..k} (2^{r_{pt}}−1)/log2(t+1); NDCG_k = DCG/IDCG.
- PPO clipped surrogate L_clip with value loss (cV=1) and entropy bonus (cH=0.01, β>0); gradient clip ‖∇L‖2 ≤ 0.5.
- Assumptions: LLM (Llama 3.3 70B) gold ranks approximate human preference; FactScore-vs-source-article entails factual correctness; six lightweight features suffice (authors note transformer embeddings could replace TF-IDF if compute allows).

## 5. Features / target
Features: the six linguistic/contextual scores. Target: ranked permutation of insights matching user-interest (gold) rankings.

## 6. Validation design
LLM factuality compared on 20 matches/sport via FactScore + SummaC; ranking evaluated with NDCG@{2,5,10}, Recall@{2,5,10} against gold ranks; SUMMIR-vs-human comparison on nDCG@3/Recall@3; feature ablations; error analysis.

## 7. Numerical results / baselines
- Factuality (Table 3): GPT-4o best — FactScore 95–97%, SummaC 60–72% across sports; Llama-3.3-70B 94–95% / 55–69%; Qwen2.5-72B 93% / 56–64%; Mixtral-8x7B worst 88–94% / 50–63% (notably baseball 88%/53%, soccer 92%/52%).
- Ranking (Table 4): SUMMIR reward → **NDCG@10 0.943, Recall@10 0.960**, beating NDCG-only (0.911/0.920) and Recall-only (0.910/0.860) rewards. SUMMIR approaches human performance on nDCG@3 (0.649 vs human 0.724) but lags on Recall@3 (0.556 vs 0.758).
- Ablations: emotional intensity + named-entity popularity drive most ranking gain; documented failure modes — NE oversensitivity, sarcasm misclassification on colloquial text, semantic drift beyond 3–4 sentences, ScoreNet softmax instability on near-uniform inputs, PPO noise from inconsistent LLM gold labels.

## 8. Code / data availability
Code at https://github.com/nitish-iitp/SUMMIR; datasets and prompts public per authors.

## 9. Leakage & limitations
Relevance labels and gold ranks are LLM-generated (not human) — the paper flags PPO destabilization from this; cricket/soccer/basketball/baseball only (no NFL); temporal ambiguity in article validation (88.5% precision ceiling); sarcasm detector culturally brittle; evaluation is engagement-alignment, not downstream task utility.

## 10. GSE overlap
NLP lane (designated thin lane). Existing-research-map check: rejected 1478 was an LLM sports-medicine perspective with no method; no other ledger builds an insight-extraction/ranking pipeline — no duplication. Directly serves Garrett's standing content operation (@GalaxySportsHQ X posts, daily write-ups, Feed units): a pipeline that mines sports news → extracts candidate talking points → fact-checks them → ranks by engagement.

## 11. GSE implementation spec
`gse_insight_ranker.py` — pre-game content pipeline for NFL:
1. Scrape team/beat-writer articles (3-day window around each game); validate relevance with an open model (Qwen-class) then a large model — replicate the two-tier funnel and its 88.5/89.1 calibration point.
2. Extract structured insights with an NFL-specific prompt template (injury news, tactical shifts, weather angles, quotes, records, matchup narratives) as JSON categories.
3. **Hallucination gate:** FactScore-style atomic verification of each insight against its source article before it can enter any draft — this is the programmatic version of Garrett's trust-no-claims rule for public content.
4. Rank with SUMMIR features re-weighted for GSE voice: semantic relevance, emotional intensity, buzzwords, NER (player popularity via a sports-entity prior), down-weighting sarcasm-flagged segments; ScoreNet weights learned from engagement on past @GalaxySportsHQ posts as the gold signal instead of LLM ranks.
5. Output: ranked insight list feeding the daily content calendar and pick write-ups.

## 12. Reproducible test
Run the pipeline over one NFL week: measure (a) FactScore pass rate of extracted insights vs a no-gate baseline's human-spotted error rate; (b) rank correlation between SUMMIR order and realized X engagement on posted insights.

## 13. Acceptance / rejection gate
ADAPT bar: hallucination gate must catch ≥90% of planted false insights (adversarial eval) without dropping >15% of true ones, and SUMMIR-ranked posts must correlate positively with engagement vs chronological posting; otherwise keep the extraction pipeline but fall back to manual ranking.

## 14. Improvement experiment
(a) Replace LLM gold ranks with Garrett's actual engagement data (likes/reposts per post) as the PPO/ScoreNet supervision — fixes the paper's noisiest component; (b) add a GSE-voice feature (dry-humor/human-voice scorer) as a 7th ScoreNet input; (c) extend categories with betting-market angles (line movement narratives, sharp-vs-public splits) that the paper's taxonomy lacks.
