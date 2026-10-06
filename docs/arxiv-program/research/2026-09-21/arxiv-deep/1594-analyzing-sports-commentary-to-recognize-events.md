# [1594] Analyzing Sports Commentary in Order to Automatically Recognize Events and Extract Insights (arXiv:2307.10303)

**Citation:** Miraoui, Y. (2023). *Analyzing sports commentary in order to automatically recognize events and extract insights*. arXiv:2307.10303. URL: https://arxiv.org/abs/2307.10303
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML). Note: author affiliation is ETH Zürich (student report, January 2022; data provided by Egoli Media).
**Verdict:** ADAPT — the BERT event-classification pipeline on live text commentary ports directly to NFL beat-reporter / injury-report sentence classification; the sentiment-detection experiment is weak by the author's own admission.

## 1. Research question
Which NLP techniques best detect and classify the main actions ("events") in sports games from live text commentaries, and can sentiment analysis of those commentaries help detect important actions? The work is motivated by improving the Egoli Media video event-recognition AI using the abundant text commentary channel.

## 2. Dataset / schema
Two datasets. (a) Audio dataset (proprietary, from Egoli Media): 2021 Paralympic games + a few English Premier League games, transcribed with Google Speech-to-Text; the author shows examples demonstrating the transcription is "very inaccurate and unreliable" and abandons it for training. (b) Textual dataset (scraped by the author): live commentaries from bbc.com, espn.com, onefootball.com, covering 9,074 football games since 2011 — Serie A 2,152; Ligue 1 2,076; La Liga 1,939; Bundesliga 1,608; Premier League 1,299. ~941,000 sentences, each labeled with one of 12 event categories via the sites' event timelines (labels: 0 No event, 1 Attempt, 2 Corner, 3 Foul, 4 Yellow card, 5 Second yellow card, 6 Red card, 7 Substitution, 8 Free kick won, 9 Offside, 10 Handball, 11 Penalty conceded). Average sentence: 12.05 words, 73.46 characters. Class distribution: no category exceeds 50% but Offside/Handball/Penalty-conceded are rare (Appendix A). Additional small test sets scraped from livescore.com and YouTube auto-subtitles with different sentence structures. Scraped data is not redistributed (no download link stated); timeline labels come from the live-score sites.

## 3. Method / model
Preprocessing: punctuation/special-char/whitespace removal, stop-word removal, stemming + lemmatization. Two embedding routes: (i) tf-idf vectors → SVM, XGBoost, and other classical classifiers; (ii) fine-tuned `bert-base-uncased` classification on raw text. Sentiment route: pretrained `cardiffnlp/twitter-roberta-base-sentiment` (RoBERTa-base trained on ~58M tweets, finetuned for sentiment) applied to ~10,000 sentences; Neutral labels discarded, only predominant Positive/Negative reported per event type. Train/test: random shuffled 80/20 split on the tf-idf vectors; the shuffle was deliberate so the model works "on every type of game and for every commentary made at anytime during the game."

## 4. Equations & assumptions
One equation stated: `accuracy = Number of correct predictions / Total number of predictions`. Assumptions stated: (a) shuffled splitting is appropriate (no temporal structure to preserve); (b) event-timeline labels from live-score sites are reliable ground truth; (c) sentiment conveyed by a commentary sentence correlates with event importance. No other equations stated.

## 5. Features / target
Features: tf-idf vectors of cleaned commentary sentences, or raw sentence text for BERT. Target: one of the 12 event categories (Appendix A). Secondary exploratory target: sentence sentiment polarity (Positive/Negative) as a proxy for event importance.

## 6. Validation design
80/20 shuffled random split on ~941k sentences; metric = accuracy/precision/recall/F1 on held-out test. Baseline: Minard et al. (2016) SVM approach on newspaper commentaries, reproduced on the new dataset. Generalization test on structurally different commentaries (livescore.com, YouTube auto-subtitles). No time-ordered split — shuffled, so in-game temporal leakage (neighboring sentences from the same game in train and test) is possible and unaddressed.

## 7. Numerical results / baselines
SVM (tf-idf): Accuracy 97.30%, Precision 88.64%, Recall 83.60%, F1 0.85 (Table 3). Prior baseline (Minard et al. 2016): F1 0.71 — author attributes the gain to the much larger dataset. XGBoost: described as "the best performing model" among classical classifiers on both same-source and new-source commentaries (values given only in histogram figures, not tabulated — not exact-quoted here). Fine-tuned BERT: 99.8% accuracy on held-out live commentaries; 92% average accuracy on the new sentence-structure sets. Confusion analysis: 26% of true "Handball" labels mislabeled as "Foul" (SVM) — noted as genuinely ambiguous since most handballs are fouls. Sentiment results (Table 4, % non-neutral predominant label): Attempt Negative 6.04%; Corner Positive 2.59%; Foul Negative 18.77%; Yellow card Negative 74.01%; Second yellow card Negative 38.32%; Red card Negative 70%; Substitution Positive 1.37%; Free kick won Positive 0.49%; Offside Positive 2.97%; Handball: None; Penalty conceded Negative 100%. Author concludes most sentences are Neutral, so "the information gained by this sentiment analysis becomes very limited." (All numbers are the paper's claims.)

## 8. Code / data availability
Appendix B states code was "cleaned and annotated" with a README, and Appendix C a deployed web demo — but the ar5iv HTML renders both link targets as bare text ("here"), so no usable URL is stated. Scraped dataset: no link stated (proprietary scraping, Egoli Media audio proprietary). Effectively: not reproducible from the paper alone.

## 9. Leakage & limitations
- Shuffled 80/20 split on sentences from the same games: neighboring commentary sentences from the same match almost certainly appear in both train and test. The 97.3%/99.8% accuracies are inflated by this within-game leakage; true generalization is the 92% number on new sources, and even that comes from the same leagues.
- 97%+ accuracy on a 12-class task with short formulaic sentences mostly reflects template regularity ("Yellow card for X") rather than semantic understanding; a keyword matcher would likely do nearly as well.
- Sentiment experiment is negative-result territory: an off-the-shelf Twitter sentiment model on soccer sentences yields mostly Neutral; no sport-specific sentiment model was trained. The task's priority lane (injury news → availability) needs exactly such a domain-tuned classifier, which this paper does not build.
- Student report (single author, 2022); audio dataset abandoned as unusable, so the multimodal promise is untested.
- Labels come from live-score-site timelines scraped without documented alignment to sentence boundaries — label noise unquantified.

## 10. GSE overlap
New capability direction, adjacent to existing map area 13 ("Text/news as features beyond the price … beat-writer text embeddings for injury news is untested"). Nothing in the corpus classifies sports text into event/availability categories with a fine-tuned transformer; ledger 0009 covers event models on structured data, not text. Not a duplicate.

## 11. GSE implementation spec
- Data: scrape beat-reporter tweets/articles (Schefter, Rapoport, team beat writers via X) + NFL official injury-report text; label sentences with availability outcomes from subsequent injury reports (Out / Doubtful / Questionable / Active) — the GSE analog of the paper's 12 event categories, with timeline labels as ground truth.
- Model: fine-tune a modern encoder (DeBERTa-v3-base) on the sentence-classification task, 80/10/10 split by SEASON (not shuffled — the paper's leakage lesson). Target: P(player misses next game | news sentence).
- Serving: hourly cron over the beat-writer firehose; when P(miss) crosses 0.6 for a starter, emit an availability signal into the pick engine 15–60 min before books move — the injury-news → availability → line-value chain.
- Effort: ~2 weeks (one engineer): scraper exists conceptually via X tooling; labeling is the bottleneck (~5k hand-labeled sentences to bootstrap).

## 12. Reproducible test
Dataset: beat-writer sentences from 2022–2023 NFL seasons labeled by following-week injury-report status; test on 2024 season sentences (time-ordered). Baseline: (a) keyword rules ("out", "doubtful", "DNP"), (b) off-the-shelf twitter-roberta sentiment as in the paper. Metric: F1 on the "player misses game" class. The fine-tuned classifier must beat the keyword baseline F1 by ≥ 0.15.

## 13. Acceptance / rejection gate
ADOPT the availability classifier if: F1 ≥ 0.80 on 2024-season beat-writer sentences AND the classifier's P(miss) signal, backtested as a line-move predictor, anticipates official injury-report designation changes ≥ 30 minutes ahead of the market move in ≥ 55% of cases (n ≥ 50 cases). REJECT if F1 < 0.70 or the lead-time test fails.

## 14. Improvement experiment
Fix the paper's negative sentiment result properly: train a domain-specific "injury-language" encoder with contrastive pretraining on paired sentences (same player, e.g., "limited in practice" vs "full participant"), then distill the classifier into a 30M-param model for sub-second inference on the live firehose. Test whether adding this embedding as a feature to GSE's existing spread model moves out-of-sample log-loss on games with late injury news — the paper never connects its classifier to a downstream prediction task, and that connection is the whole GSE value proposition.
