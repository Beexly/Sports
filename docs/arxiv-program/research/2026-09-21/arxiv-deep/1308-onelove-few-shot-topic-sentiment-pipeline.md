# [1308] OneLove beyond the field: A few-shot pipeline for topic and sentiment analysis during the FIFA World Cup in Qatar (arXiv:2408.02520v1)

**Citation:** Christoph Rauchegger, Sonja Mei Wang, and Pieter Delobelle (2024). *OneLove beyond the field - A few-shot pipeline for topic and sentiment analysis during the FIFA World Cup in Qatar*. arXiv:2408.02520v1. URL: https://arxiv.org/abs/2408.02520v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a validated few-shot LLM pipeline (BERTopic for topic discovery + Mistral-7B with 3-shot/translation/CoT for stance labeling, no training data needed) directly usable for GSE's real-time event/narrative monitoring on X. (Replacement for REJECT 1107.)

## 1. Research question
Can topic modeling plus few-shot LLM in-context learning measure public topics and stance toward a fast-moving sports controversy *while the event unfolds*, without labeled training data?

## 2. Dataset / schema
132,150 German tweets, Nov 20 – Dec 18 2022, collected via the (then-free) official Twitter API with 30-day lookback; filter excluded retweets/replies/quotes and liveticker/newsticker accounts. Labels: 148 tweets annotated by two native German speakers for stance toward wearing the OneLove armband (63 in favor, 15 against, 70 neutral); IAA κ=0.68. Topic validation: 600 manually labeled tweets over 7 topics. Dataset released "dehydrated" (IDs only; needs API access to rehydrate).

## 3. Method / model
Pipeline: BERTopic (multilingual embeddings, UMAP, HDBSCAN, CountTokenizer with 1–3 grams) for topic discovery → few-shot LLM stance classification. Mistral-7B-Instruct-v0.2 evaluated with: base prompt, +3-shot examples, +English translation, +Chain-of-Thought (Kojima et al. 2022), +all combined. Compared against two fine-tuned BERT sentiment models and GPT-3.5/GPT-4 with the full prompt stack.

## 4. Equations & assumptions
No equations stated — a methods-evaluation paper. Assumptions: tweet stance is annotatable (κ=0.68 supports this); excluding replies/quotes doesn't distort the picture; stance toward the armband is the right construct (distinct from generic sentiment — a stance-detection framing).

## 5. Features / target
Inputs: raw tweet text. Targets: topic cluster assignment; stance label (in favor / against / neutral toward wearing the armband).

## 6. Validation design
Model comparison on the 148-tweet gold set (accuracy, macro-F1); topic validation against 600-tweet manual labels across 7 topics. No temporal holdout — the analysis itself is the demonstration.

## 7. Numerical results / baselines
Sentiment-model accuracy/F1: nlptown BERT-multilingual 46.4/19.6; oliverguhr german-sentiment-bert 62.6/43.9; Mistral-7B zero-shot 64.9/47.3; +3-shot 67.1/50.7; +translation 69.8/54.7; +CoT 74.3/61.5; +all three 76.1/64.2; GPT-3.5 (full stack) 59.9/39.9; GPT-4 (full stack) 80.2/70.3. Per-class AUC (GPT-4): 0.697 against, 0.769 in favor, 0.747 neutral. Substantive: discussion shifted from armband/LGBT topics to "politics in sports" after the Nov 21 2022 ban; sentiment drifted subtly toward neutral; more support than opposition, but support faded over time.

## 8. Code / data availability
No code link stated in paper. Data: dehydrated tweet IDs (requires X API to rehydrate).

## 9. Leakage & limitations
German tweets only; X demographics are not representative. Replies/quotes excluded — thread context lost. Dehydrated dataset means exact replication needs paid X API access. The "against" class is tiny (15 tweets) and the hardest (AUC 0.697). No code released. Prompt details in Appendix B are reusable, but model behavior has drifted since 2024 (Mistral/GPT versions).

## 10. GSE overlap
Extension: GSE's X-ops/signal-desk work monitors narratives but has no documented few-shot stance pipeline validated against human labels. Cite `~/workspace/arxiv-sweep/existing-research-map.md` (text-as-features GAP 12). Not duplicative.

## 11. GSE implementation spec
(a) Stand up the pipeline on GSE's X firehose: BERTopic (multilingual) over game-day tweet windows for topic discovery; (b) few-shot stance classifier (modern instruction LLM, 3-shot + CoT prompt adapted from the paper's Appendix B) for target stances (e.g., "is this player actually injured?" / "will this trade happen?"); (c) human-label a 150-tweet gold set per event type and track accuracy/F1 vs the paper's 76.1/64.2 bar; (d) feed topic+stance streams into the event bus from 1105. Effort: ~1 engineer-week.

## 12. Reproducible test
Dataset: one 2025 NFL Sunday, ~10k tweets around 2–3 injury storylines, 150 human-labeled (κ reported). Metric: stance accuracy/F1. Baseline to beat: zero-shot classifier and the 1106 lexicon-CNN. Success: few-shot stack ≥70% accuracy with κ ≥ 0.6.

## 13. Acceptance / rejection gate
ADAPT into the signal desk if the pilot clears 70% stance accuracy on NFL injury/trade storylines with per-class F1 ≥ 0.55 on the minority class (the paper's weak spot); REJECT if the "against/denial" class can't be labeled reliably (κ < 0.5).

## 14. Improvement experiment
Add retrieval-augmented few-shot: retrieve the 3 most similar *labeled* tweets from a growing GSE gold bank as the in-context examples (instead of fixed examples), turning the static pipeline into a self-improving one — and test whether stance accuracy climbs week over week, which the paper's fixed-prompt design cannot do.
