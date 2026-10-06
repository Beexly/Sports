# 1725 Evaluation of the phi-3-mini SLM for identification of texts related to medicine, health, and sports injuries (arXiv:2504.08764v1)

**Citation:** Chris Brogly, Saif Rjaibi, Charlotte Liang, Erica Lam, Edward Wang, Sarah Paleczny, Adam Levitan, Michael D. Cusimano (2025). *Evaluation of the phi-3-mini SLM for identification of texts related to medicine, health, and sports injuries*. Lakehead University / St. Michael's Hospital, Toronto. arXiv:2504.08764v1. URL: https://arxiv.org/abs/2504.08764v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 5 pages, all sections, tables 1–7, references).
**Verdict:** ADAPT — the edge-deployable SLM triage pattern (phi-3-mini scoring 9.35M headlines 1–10 on topic relatedness at ~475K–950K texts/week/GPU, with Boolean multi-score filtering) is a cost-effective first-pass injury-news classifier for GSE's ingestion pipeline, but human agreement is weak (Spearman ρ ≤ 0.39, binary agreement as low as 6.7% on sports injury), so adapt it strictly as a recall-oriented triage filter with human/LLM review downstream, never as a labeler.

## 1. Research question

Can a small language model (phi-3-mini) running on consumer GPUs triage millions of web texts for medicine/health and sports-injury relatedness well enough to replace manual labeling? The paper processes 9.35M Canadian news headlines, scores each 1–10 on 7 health topics, and asks how well SLM scores agree with 7 human evaluators (health-science graduates) — and whether Boolean filtering on multiple topic scores (e.g., sports-injury > 7 AND cannabis = 1 AND opioids = 1) improves agreement.

## 2. Dataset / schema

- 9,353,430 Canadian news headlines/links from Common Crawl (Jan 3, 2017 – Jun 27, 2023, every Tuesday and Friday), 236 domains, HTML tags a/span/h1–h4.
- Each text scored 1–10 by phi-3-mini on 7 topics: medicine/health, cannabis, sports injuries, opioids, firearm injury, traffic accidents, hospitalization (+ sentiment). Prompt: "You are helping to determine if text is related to (T). On a scale of 1-10, is the following about (T)? Report only the number:"
- Human eval: 7 raters; inter-rater calibration on 40+40 texts; final eval on 1,144 medicine/health + 1,117 sports-injury texts, split into low-filter (topic score > 7) and high-filter (topic > 7 plus cross-topic Boolean conditions) samples, ≥50 texts per rater per cell.
- Throughput: ~475K texts/week per GTX 1080Ti instance, ~950K/week per RTX 4090 instance; full 9.35M took ~4 weeks on 2×1080Ti + 1×4090.

## 3. Method / model

- Zero-shot numeric scoring with phi-3-mini (no fine-tuning); texts occasionally returned explanations instead of numbers (discarded).
- Filtering design: low-filter = single condition (topic score > 7); high-filter = topic > 7 AND related-topic scores = 1 (e.g., sports-injury high-filter requires medicine/health > 7, cannabis = 1, opioids = 1) — the Boolean conjunction is meant to suppress the SLM's false-positive tendency.
- Agreement metrics: binary % agreement, Spearman correlation on 1–10 ratings, Fleiss's κ and ICC for inter-rater reliability.

## 4. Equations & assumptions

- Spearman ρ between SLM and mean human ratings per filter cell; Fleiss's κ on binary relatedness; ICC (two-way random effects) on numeric ratings.
- Assumption: a 1–10 "relatedness" scale is interval-meaningful for both SLM and humans; the >7 threshold selects genuinely related texts; cross-topic =1 conditions are independent false-positive suppressors rather than correlated with the target topic.

## 5. Features / target

- Input: headline/link text.
- SLM output: 1–10 relatedness score per topic.
- Human output: binary yes/no + 1–10 rating per text.
- Target of the study: SLM–human agreement (not a deployed classifier's precision/recall).

## 6. Validation design

- Inter-rater reliability established first: ICC 0.758 (med/health) / 0.640 (sports injury); Fleiss's κ 0.789 / 0.648 — humans agree with each other substantially, so disagreement with the SLM is the SLM's problem.
- SLM–human agreement computed per filter cell (low/high × med-health/sports-injury).
- Notable: the SLM rated *every* text given to evaluators > 7 (they were pre-filtered), so binary agreement measures whether humans concurred with the SLM's positive call.

## 7. Numerical results / baselines

- Binary agreement (human concurs the text is related): medicine/health low-filter 54.68%, high-filter 74.58%; sports-injury low-filter 6.69%, high-filter 24.01% — the SLM's sports-injury positives are wrong ~93% of the time unfiltered, ~76% even filtered.
- Spearman ρ (SLM vs human numeric): med/health low 0.2255, high 0.3854; sports-injury low 0.3413, high 0.0318 (negligible — the high-filter conjunction destroyed the ranking signal for sports injury).
- Human means vs SLM means tell the story: sports-injury low-filter humans 1.87 vs SLM 9.87 — the SLM is wildly overconfident on sports injury.
- Serendipitous finding: the SLM rated some "junk" texts (e.g., "Reporter_Name, The Associated Press") highly, and investigation showed they were sports/health reporters' bylines — the model picked up a real latent signal (reporter identity) the task design did not intend.

## 8. Code / data availability

- No code or dataset link found in the paper. phi-3-mini is public (Microsoft); the 9.35M headline corpus is described but not released. The scoring procedure is trivially reproducible.

## 9. Leakage & limitations

- Agreement, not accuracy: the study measures SLM–human correlation, not precision/recall against ground truth — a high-agreement SLM could still be systematically wrong in ways humans share.
- The high-filter for sports injury (requiring medicine/health > 7) is conceptually muddled — it conflates the two topics and collapses the Spearman signal to 0.03.
- Only headlines/links, not article bodies — relatedness judgments on 10-word texts are inherently noisy.
- Throughput reality check: 4 weeks on 3 consumer GPUs for 9.35M texts — "edge deployable" does not mean fast; scaling to GSE's ingestion volume needs the math done honestly.
- 5-page paper; no fine-tuning baseline (a fine-tuned BERT-class classifier is the obvious comparator and is absent).

## 10. GSE overlap

- GSE ingests large volumes of news/social text for injury monitoring — a cheap SLM triage layer that flags candidate injury texts for the expensive extraction pipeline (ledgers 1717/1722) is exactly the cost-architecture this paper informs: SLM as recall filter, LLM as precision extractor.
- The reporter-bylines finding is actionable: author identity is a predictive feature for sports-injury news — GSE's ingestion should weight byline/source, which the paper discovered by accident.
- The Boolean-filtering idea maps to GSE's evidence tiers: multi-condition filters as cheap precision boosters.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/ingest/slm_triage.py`: (1) run a modern SLM (phi-3-mini class or successor) over ingested headlines/social posts scoring injury-relatedness 1–10; (2) route score ≥ 7 to the LLM extraction pipeline (ledgers 1717/1722), score 4–6 to a low-priority queue, score < 4 discarded — a recall-oriented cascade where the SLM's job is to not miss, not to be right; (3) add byline/source features to the triage score (the paper's accidental discovery, made deliberate); (4) log SLM scores alongside downstream extraction outcomes so the threshold can be tuned on GSE data.
- Cost model: replicate the paper's throughput math on GSE's hardware before committing — at ~950K/week/GPU, size the GPU fleet to ingestion volume with headroom.

## 12. Reproducible test

- On 5,000 GSE-ingested NFL news/social texts with human injury-relatedness labels: run the SLM triage; success criteria as a *filter* (not labeler): recall ≥ 0.95 at the chosen threshold (miss almost nothing), with downstream precision handled by the LLM stage; measure end-to-end cost per 1M texts. Also test the byline-feature hypothesis: does adding source/byline features improve triage AUC by ≥ 0.03?

## 13. Acceptance / rejection gate

ADAPT strictly as a recall-oriented triage filter in a cascade — never as a standalone labeler. The paper's numbers forbid any stronger use: 6.69% binary agreement on sports-injury low-filter means the SLM's positive calls are wrong ~14 times out of 15. ADAPT proceeds if the reproducible test shows recall ≥ 0.95 at an affordable operating point; REJECT the Boolean high-filter design for sports injury (the paper shows it collapses the ranking signal to ρ = 0.03 — it is a worse filter, not a better one); REJECT any proposal to use SLM scores as features in GSE's predictive models directly — uncalibrated 1–10 scores with 1.87-vs-9.87 human/SLM mean gaps are not model inputs.

## 14. Improvement experiment

Fix what the paper leaves open. (1) The missing baseline: fine-tune a BERT-class classifier on GSE's 5,000 labeled texts and compare against zero-shot SLM scoring on the triage task — if a 110M-parameter fine-tuned model beats the 3.8B SLM at 1/10th the inference cost, the paper's "SLM for triage" framing is upside down and GSE should use the smaller model. (2) Calibrate the scores: fit a Platt/isotonic map from SLM 1–10 scores to empirical relatedness probabilities on the labeled set, then re-tune the cascade thresholds on calibrated probabilities — the paper never calibrates, which is why its thresholds are arbitrary. (3) Exploit the byline discovery properly: build a reporter-specialty prior (which reporters cover injuries for which teams, from historical data) and test whether prior × SLM score beats SLM score alone — turning the paper's accident into a feature.
