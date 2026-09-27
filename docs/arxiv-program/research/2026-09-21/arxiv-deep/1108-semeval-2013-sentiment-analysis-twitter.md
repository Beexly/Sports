# [1108] SemEval-2013 Task 2: Sentiment Analysis in Twitter (arXiv:1912.06806v1)

**Citation:** Preslav Nakov, Zornitsa Kozareva, Alan Ritter, and Sara Rosenthal (2019). *SemEval-2013 Task 2: Sentiment Analysis in Twitter*. arXiv:1912.06806v1. URL: https://arxiv.org/abs/1912.06806v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the canonical tweet-sentiment benchmark design (5-annotator MTurk labeling, (F_pos+F_neg)/2 metric, phrase vs message subtasks) is the labeling-and-evaluation template GSE should copy for its own sports-text classifiers.

## 1. Research question
Task description paper for SemEval-2013 Task 2: how well can systems detect sentiment of Twitter phrases and whole messages (including SMS as a second domain)?

## 2. Dataset / schema
Twitter messages labeled by 5 Mechanical Turk annotators each; annotators required >95% approval rating and ≥50 approved HITs; $0.03 per HIT. Two subtasks: (A) phrase-level polarity in context, (B) message-level polarity; two domains: Twitter and SMS. 149 submissions from 44 teams. Full class counts were recorded during this read (see paper Tables) — pull exact per-class counts from the PDF before quoting. Dataset released under CC BY 3.0, though tweet recovery from IDs may now be constrained by X API policy.

## 3. Method / model
Not a single model — a shared-task design paper. Systems compared used n-gram/SVM/lexicon/ensemble approaches circa 2013. The transferable content is the *evaluation methodology*: annotation protocol, the (F_pos + F_neg)/2 metric, and the phrase-vs-message subtask split.

## 4. Equations & assumptions
Metric: F = (F_positive + F_negative)/2, i.e., macro-average of F1 over the two polar classes (neutral excluded). Assumptions: 5 annotators with majority/agreement filtering produce gold labels; sentiment is annotator-invariant; the metric choice (ignoring neutral) reflects task priorities.

## 5. Features / target
Systems used token n-grams, POS, lexicons, emoticons. Targets: phrase polarity (positive/negative/neutral) in message context; message polarity (positive/negative/neutral/objective).

## 6. Validation design
Shared-task train/test with a hidden test set; cross-domain generalization tested (train on Twitter, test on SMS and vice versa). Time-ordered: not applicable (no temporal component).

## 7. Numerical results / baselines
Best reported scores: phrase-level Twitter 88.93, phrase-level SMS 88.37; message-level Twitter 69.02, message-level SMS 68.46 (F metric as defined above). 149 submissions from 44 teams.

## 8. Code / data availability
Dataset released under CC BY 3.0 (tweet IDs/text via the SemEval release); "Not stated in paper" for a single reference implementation.

## 9. Leakage & limitations
2013-era methods and Twitter; the SMS domain results show cross-domain drop is real. Tweet text recovery is now constrained (X API paywall, deletions) — the released dataset may be partially irrecoverable. Annotation quality bar (5 annotators, 95% approval) is expensive to replicate at scale today. Message-level scores (69) are far below phrase-level (89) — whole-message sports sentiment will be hard.

## 10. GSE overlap
Extension: GSE's X-ops/NLP lanes exist but no documented annotation protocol or benchmark for sports-text sentiment. Cite `~/workspace/arxiv-sweep/existing-research-map.md` (NLP / text-as-features gaps). Not duplicative.

## 11. GSE implementation spec
(a) Copy the annotation protocol for a GSE sports-text benchmark: 5 annotators per item, >95% approval, 3¢-equivalent per HIT (adjusted), majority-label adjudication; (b) adopt the (F_pos+F_neg)/2 metric for bullish/bearish/neutral player-news classification; (c) split phrase (sentence) vs message (full post) subtasks; (d) evaluate zero-shot LLMs and the 1106 lexicon-CNN against this benchmark. Effort: ~1 engineer-week plus annotation budget.

## 12. Reproducible test
Dataset: 2,000 NFL tweets labeled under this protocol (5 annotators). Metric: (F_bullish + F_bearish)/2 on a hidden test split. Baseline to beat: majority-class and the lexicon-CNN from 1106. Success: any model clears 60 on message-level before GSE deploys it in the signal desk.

## 13. Acceptance / rejection gate
ADOPT the protocol as GSE's standard sports-text benchmark if inter-annotator agreement (Fleiss κ) reaches ≥0.6 on a 200-item pilot; REJECT the protocol if κ < 0.4 (task too subjective for sports text).

## 14. Improvement experiment
Add a fourth annotator class — *stance toward the GSE engine's position* (agree/disagree) — turning the sentiment benchmark into a disagreement-prediction task: predict which news the engine's numbers will disagree with the crowd on, which is the directly monetizable version of sentiment analysis.
