# [1106] Lexicon Integrated CNN Models with Attention for Sentiment Analysis (arXiv:1610.06272v2)

**Citation:** Bonggun Shin, Timothy Lee, and Jinho D. Choi (2016). *Lexicon Integrated CNN Models with Attention for Sentiment Analysis*. arXiv:1610.06272v2. URL: https://arxiv.org/abs/1610.06272v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a lightweight, interpretable lexicon-augmented baseline recipe (sentiment + emotion lexicon embeddings with attention) worth building as GSE's cheap, explainable sports-text sentiment baseline before reaching for LLM APIs.

## 1. Research question
Does integrating sentiment/emotion lexicon embeddings into a CNN sentiment classifier (with attention) improve accuracy and training stability over a plain word-embedding CNN?

## 2. Dataset / schema
SemEval-2016: train/dev/test 15,385 / 1,588 / 20,632. Stanford Sentiment Treebank (SST): train/dev/test 8,544 / 1,101 / 2,210. Six sentiment/emotion lexicons integrated as additional embedding channels; training-vocabulary lexicon coverage only 11.53% (SemEval) and 9.20% (SST).

## 3. Method / model
CNN over word embeddings plus a parallel lexicon-embedding channel: each word gets a vector from each of six lexicons (sentiment scores), concatenated/combined with attention over the lexicon channels (SC-EAV and NC-EAV variants — with/without attention). Trained end-to-end for sentence-level sentiment classification.

## 4. Equations & assumptions
Convolution + attention pooling over word and lexicon channels; "Not stated in paper" for exact architectural equations at the fidelity needed for reimplementation in this read. Assumption: lexicon scores carry signal complementary to distributional embeddings; coverage gaps (words missing from lexicons) can be handled with zero/default vectors.

## 5. Features / target
Inputs: tokenized text, pre-trained word embeddings, six lexicon score vectors per token. Target: sentence sentiment label (SemEval: positive/negative/neutral; SST: fine-grained classes as labeled).

## 6. Validation design
Standard SemEval and SST train/dev/test splits; multiple runs per embedding size to report stability (standard deviations). Comparison against a baseline CNN without lexicon channels and against cited published systems.

## 7. Numerical results / baselines
SemEval SC-EAV: 63.8 vs baseline 61.6 (cited systems 63.3, 63.0). SST SC-EAV/NC-EAV: 48.8% vs baseline 47.5%; strongest cited model 49.6%. Stability across embedding sizes: baseline SDs 0.8491, 1.1909 vs lexicon-model SDs 0.4208, 0.5764 (lexicon models substantially more stable). Lexicon coverage: 11.53% SemEval, 9.20% SST vocabulary.

## 8. Code / data availability
None stated in paper (no code link recorded in this read).

## 9. Leakage & limitations
Dated architecture (2016 CNN era — transformers/LLMs dominate now). Absolute gains are small (~2 points) and the strongest cited SST model (49.6%) still beats it. Lexicon coverage is low (~10%), so most signal comes from a minority of tokens. External validity to sports-domain text untested in the paper. Stability numbers (SDs) are useful but reported without significance tests in this read.

## 10. GSE overlap
Extension: GSE's NLP work is LLM-era (per existing-research map NLP lanes) with no lightweight lexicon baseline recorded. Cite `~/workspace/arxiv-sweep/existing-research-map.md`. Not duplicative — it fills the "cheap interpretable baseline" slot.

## 11. GSE implementation spec
(a) Build a sports-domain sentiment lexicon: seed from the paper's six-lexicon approach, add NFL terms (injury, questionable, doubtful, breakout, bust, limited, DNP); (b) train the SC-EAV/NC-EAV CNN on labeled sports tweets (label set: bullish/bearish/neutral on a player/team); (c) compare against zero-shot LLM labeling on cost × accuracy; (d) deploy the CNN as the always-on cheap classifier with the LLM as escalation. Effort: ~3-5 engineer-days.

## 12. Reproducible test
Dataset: 5,000 hand-labeled NFL tweets (bullish/bearish/neutral), 2025 season, time-ordered 70/15/15 split. Metric: macro-F1. Baseline to beat: plain word-embedding CNN (paper's baseline) and zero-shot Mistral-7B. Success: lexicon-CNN beats plain CNN by ≥2 F1 points and is within 5 F1 of the LLM at <1% of the inference cost.

## 13. Acceptance / rejection gate
ADAPT if the sports-lexicon CNN matches the paper's stability pattern (run-to-run SD under 0.6) and beats the plain CNN on sports text; REJECT if gains don't replicate on sports-domain text (lexicon coverage problem dominates).

## 14. Improvement experiment
Replace the six general lexicons with a *learned* sports lexicon: distill per-token sentiment weights from the LLM's explanations on the labeled set, then retrain the CNN with the distilled lexicon — keeps inference cheap while injecting domain knowledge the paper's fixed lexicons can't provide.
