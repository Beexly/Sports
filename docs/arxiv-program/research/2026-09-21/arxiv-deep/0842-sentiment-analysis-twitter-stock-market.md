# 0842 Sentiment Analysis of Twitter Data for Predicting Stock Market Movements (arXiv:1610.09225v1)

**Citation:** Venkata Sasank Pagolu, Kamal Nayan Reddy Challa, Ganapati Panda, Babita Majhi (2016). *Sentiment Analysis of Twitter Data for Predicting Stock Market Movements*. arXiv:1610.09225v1. URL: https://arxiv.org/abs/1610.09225v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — a complete sentiment→direction pipeline (human-annotated 3-class tweet classifier at 70.2% word2vec / 70.5% n-gram accuracy, then 3-day aggregate sentiment → next-day MSFT up/down at 69.01% logistic / 71.82% LibSVM); methodologically modest but the 3-day aggregation window and human-concordance benchmarking are directly reusable for GSE market-movement features.

## 1. Research question

Are day-to-day rises and falls in a company's stock price correlated with public sentiment expressed in tweets about that company? The paper builds a tweet sentiment analyzer for Microsoft and tests whether 3-day aggregate sentiment predicts next-day price direction.

## 2. Dataset / schema

- **Tweets:** 250,000 tweets about Microsoft, 2015-08-31 to 2016-08-25, filtered by keywords ($MSFT, #Microsoft, #Windows, product terms); collected via Twitter API + Twitter4J.
- **Labels:** human-annotated subset with 3 classes (positive=1, neutral=0, negative=2); a trained classifier labels the rest.
- **Prices:** MSFT daily open/close from Yahoo Finance; weekend/holiday gaps filled by (x+y)/2 averaging (Goel's method, per the paper).
- **Schema:** per tweet: cleaned tokens; per day: counts of positive/negative/neutral tweets; per day: price direction label (1 if up vs previous day, else 0).
- **Access:** Twitter API (2015-era), Yahoo Finance (public).

## 3. Method / model

- **Preprocessing:** tokenization, stopword removal, regex cleaning (URLs→"URL", #tag→tag, @user→USER, elongated words collapsed).
- **Representations:** n-gram presence vectors and word2vec (300-dim, summed per tweet).
- **Sentiment classifier:** random forest / logistic regression / SMO trained on human-annotated tweets; word2vec+RF selected (70.18%) over n-gram+RF (70.49%) for semantic sustainability.
- **Direction classifier:** per-day features = total positive/negative/neutral counts over a 3-day window; logistic regression and LibSVM predict next-day up/down; 80/20 and 90/10 splits; 355 instances.

## 4. Equations & assumptions

- No equations stated. Sentiment aggregation = raw counts over 3-day windows; direction label = 1{close_t ≥ close_{t−1}}.
- Assumptions: tweet sentiment about the company proxies investor mood; 3-day window is the right aggregation (chosen by experiment); missing price interpolation is harmless; human annotation is ground truth (concordance 70–79% cited from literature).

## 5. Features / target

- **Sentiment stage inputs:** tweet token vectors (word2vec-sum or n-gram presence). **Target:** positive/neutral/negative.
- **Direction stage inputs:** 3-day counts of positive, negative, neutral tweets. **Target:** next-day price direction (binary).

## 6. Validation design

- Sentiment classifier: 90/10 split on human-annotated tweets; ROC AUCs reported (positive 0.772, neutral 0.778, negative 0.828).
- Direction classifier: 80/20 (logistic) and 90/10 (LibSVM) splits of 355 daily instances; not explicitly time-ordered — random split assumed.
- Baselines: algorithm comparison (RF vs LR vs SMO/LibSVM); no buy-and-hold or naive baseline.

## 7. Numerical results / baselines

- Sentiment classification: word2vec+RF accuracy 70.18% (precision 0.711, recall 0.702, F 0.690); n-gram+RF 70.49% (0.719/0.705/0.694); logistic 62.42%/57.14%; SMO 62.42%/65.84%.
- Direction prediction: logistic regression 69.01% accuracy; LibSVM (90% train) 71.82%.
- Human concordance benchmark cited: 70–79% agreement — the sentiment classifier sits at the human-agreement boundary.

## 8. Code / data availability

None stated (Weka used for modeling; Twitter4J for collection).

## 9. Leakage & limitations

- **Single stock (MSFT), single year** — no cross-sectional or out-of-period validation.
- Direction split not stated as time-ordered; random split on time series → lookahead leakage likely.
- Weekend-gap interpolation ((x+y)/2) fabricates price continuity; sentiment on non-trading days leaks into adjacent labels.
- No transaction costs, no baseline (e.g., always-up); 71.82% on ~36 test points is ±15pp noise.
- Human annotation protocol and inter-annotator agreement for *their* labels not reported.

## 10. GSE overlap

Per the existing-research map: market microstructure is covered (CLV as label, de-vigged consensus, beat-the-close, line movement/steam) but *social-sentiment → market-movement* features are not. Complements 0841 (fan sentiment → game outcomes) and 0845 (news sentiment networks). New feature family for the market-relative learning lane.

## 11. GSE implementation spec

- Adapt the pipeline to betting markets: aggregate X sentiment per team (3-day pre-game window, per this paper's finding) → predict line movement direction (steam) rather than price direction.
- Sentiment classifier: fine-tuned modern embeddings on sports tweets; direction model: logistic regression on sentiment counts + baseline market features.
- Effort: 3–4 days.

## 12. Reproducible test

Dataset: 2024 NFL season, X team sentiment 72h pre-game, opening-to-closing spread movement as target (binary: steamed toward/away). Metric: accuracy and AUC, time-ordered split. Baseline: no-sentiment model (time-to-kickoff + opening line only). Pass if sentiment features add ≥2pp AUC.

## 13. Acceptance / rejection gate

ADOPT if time-ordered AUC gain ≥ 0.02 over the no-sentiment baseline; REJECT if the gain vanishes once injury-report dummies are included (likely confound — sentiment may just proxy news).

## 14. Improvement experiment

Disaggregate the 3-day window into 12-hour buckets with exponential decay weighting, and interact sentiment with account-credibility weights (beat-writers vs fans). Hypothesis: recency-weighted, credibility-weighted sentiment beats raw 3-day counts because actionable information decays fast and fan noise dominates volume.
