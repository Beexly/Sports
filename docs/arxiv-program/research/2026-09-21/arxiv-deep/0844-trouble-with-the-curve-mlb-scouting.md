# 0844 Trouble with the Curve: Predicting Future MLB Players Using Scouting Reports (arXiv:1910.12622v1)

**Citation:** Jacob Danovitch (2019). *Trouble with the Curve: Predicting Future MLB Players Using Scouting Reports*. arXiv:1910.12622v1. URL: https://arxiv.org/abs/1910.12622v1
**Ledger completed:** 2026-09-21. **Read:** full text (local cache of arXiv HTML/PDF).
**Verdict:** ADAPT — from ~10,000 MLB.com/FanGraphs scouting reports, a TextCNN reaches 69.02% accuracy / 56.42% F1 predicting whether a prospect debuts by age 24; the paper's leakage study (100% recall achievable from prospect *names* alone; NLTK entity masking required) is mandatory reading for any GSE text model, and the dataset+method ports directly to NFL draft-prospect language.

## 1. Research question

Can the written content of baseball scouting reports — the "eye test" in prose — predict whether a minor-league/international/draft prospect will make the major leagues? The paper releases the TWTC dataset (~10,000 reports with prose + 20–80 scale numeric grades) and benchmarks deep classifiers on the task.

## 2. Dataset / schema

- **TWTC dataset:** ~10,000 scouting reports from MLB.com Prospect Pipeline and FanGraphs; each has paragraph-length prose, numeric grades on the 20–80 scale (50 = average, 10 pts = 1 SD) per skill, and IDs linking to MLB.com/FanGraphs/Baseball-Reference.
- **Labels:** debut by age 24 = success; not debuted by 24 = failure; players under 24 without debuts excluded; ~7,000 usable points, ~80% negative class.
- **Augmentation:** word deletion + synonym substitution (doubles data); positive upsampling; weighted cross-entropy.
- **Access:** open-sourced by the author; code at github.com/jacobdanovitch/jdnlp (AllenNLP).

## 3. Method / model

- Benchmarks: Bag-of-Embeddings, TextCNN, LSTM+Self-Attention, Biattentive Classification Network (BCN), Hierarchical Attention Network (HAN).
- **Leakage control:** NLTK named-entity masking of player names (a classifier reached 100% recall just by learning name→label associations — Table 2's top discriminative terms were all prospect surnames like "alford" 0/47 neg/pos); numeric quantities also masked.
- Weighted cross-entropy for imbalance (except BCN, implementation constraints).

## 4. Equations & assumptions

- No equations stated. 20–80 grading scale described: grade g ≈ 50 + 10·z (z = SDs above average); grades are projections, mapped to expected WAR via Longenhagen & McDaniel 2018 Table 1.
- Assumptions: age-24 debut cutoff is a valid success proxy (author calls it harsh); prose written pre-outcome contains no post-hoc information after masking; report language is comparable across MLB.com and FanGraphs authors.

## 5. Features / target

- **Inputs:** masked scouting-report prose (embeddings); numeric grades available in dataset but the benchmark uses text.
- **Target:** binary — MLB debut by age 24.

## 6. Validation design

- Train/test split on ~7,000 labeled reports (exact split ratio not stated in the excerpt read); augmentation applied.
- Baselines: the five architectures against each other.
- Metrics: accuracy and F1 (appropriate given 80% negative base rate).

## 7. Numerical results / baselines

| Model | Accuracy | F1 |
|---|---|---|
| Bag of Embeddings | 64.65% | 53.78% |
| TextCNN | 69.02% | 56.42% |
| LSTM+Self-Attention | 68.64% | 54.65% |
| BCN | 73.52% | 43.33% |
| HAN | 66.00% | 54.07% |

- TextCNN best on the accuracy/F1 balance; BCN overfit the majority class (high accuracy, collapsed F1).
- Author's hypothesis: CNNs win because reports are hierarchical but unordered — each sentence is a self-contained fact; local n-gram detection + pooling finds discriminative phrases regardless of order.
- Web app demonstrates language variation between successful/unsuccessful prospect reports.

## 8. Code / data availability

Dataset open-sourced; models at github.com/jacobdanovitch/jdnlp (AllenNLP implementations). Interactive web app released.

## 9. Leakage & limitations

- The name-leakage finding is the paper's most important result: without masking, the task is trivially solvable (100% recall from names). Any replication must mask names, teams, and numeric quantities.
- Age-24 cutoff is harsh and arbitrary; late bloomers are mislabeled failures.
- ~80% negative class; F1s in the 50s show the signal is moderate.
- Single sport, two publishers' house styles; scout prose may reflect consensus already priced into grades.
- Numeric grades (arguably the stronger signal per the cited Lindbergh/Arthur work) not used in the text benchmarks.

## 10. GSE overlap

Per the existing-research map: no existing prospect/scouting-text modeling in the repo (draft coverage exists via @MoveTheSticks/@dpbrugler/@Jordan_Reid X accounts, not via text models). The ML brief lists representation learning and interpretable models as topics. This is the first "expert prose → outcome" ledger — new capability for the dynasty/draft lane, and its masking protocol applies to every GSE text model (0841, 0842, 0843).

## 11. GSE implementation spec

- Build the NFL analogue: collect draft-prospect scouting prose (NFL.com, PFF, The Athletic) for 2018–2024 classes; label = starter-or-better by year 3 (AV-based); mask names/teams/numbers; train TextCNN + HAN benchmarks.
- Use the trained model's discriminative phrases as features in GSE's dynasty/rookie model.
- Effort: 1–2 weeks (corpus assembly dominates).

## 12. Reproducible test

Dataset: 2022–2024 NFL draft classes with rookie-contract outcomes (need 3-year outcomes → use 2019–2021 classes for labels, 2022–2024 for a forward test of phrase lists). Metric: AUC on "NFL starter by year 3". Baseline: draft-pick-number-only logistic. Pass if text model beats pick-number AUC by ≥0.03.

## 13. Acceptance / rejection gate

ADOPT if masked-text AUC beats draft-position-only AUC by ≥0.03 on a held-out class; REJECT if the gain disappears after masking (i.e., the model was just re-learning draft slot from context clues like "first-round talent").

## 14. Improvement experiment

Fuse the prose model with the numeric grades (20–80 equivalents: RAS, SPARQ, PFF college grades) in a late-fusion architecture, and test whether prose adds anything *beyond* the numbers — the paper's open question. Hypothesis: prose helps most for positions where athletic testing is uninformative (QB processing, WR route nuance), and the fusion beats either alone there.
