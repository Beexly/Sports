# 0841 Using Twitter to predict football outcomes (arXiv:1411.1243v1)

**Citation:** Stylianos Kampakis, Andreas Adamides (2014). *Using Twitter to predict football outcomes*. arXiv:1411.1243v1. URL: https://arxiv.org/abs/1411.1243v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org).
**Verdict:** ADAPT — on 1.98M tweets over 3 months of the 2013–14 EPL season, a chi-square-filtered bigram bag-of-words random forest hit 65.6% accuracy (κ=0.25), matching a historical-stats model (58.9%, κ=0.239), and the combined model reached 69.6% (κ=0.28); a dated but clean proof that social-media text carries orthogonal signal — directly portable to NFL X-sentiment features for GSE.

## 1. Research question

Can tweets about English Premier League teams predict match outcomes (home win / away win / draw)? The paper compares a Twitter-only model, a historical-statistics-only model, and a combined model, asking whether Twitter carries information not present in simple historical stats.

## 2. Dataset / schema

- **Tweets:** 1,975,614 tweets, 2014-03-21 to 2014-05-11 (8–10 matches per team), collected via Twitter's Streaming API using team hashtag lists (multi-team tweets discarded; nickname collisions with US sports teams filtered, e.g., Saints/Spurs). Liverpool 426,457 tweets; Fulham 15,530.
- **Historical stats:** per-team averages updated before each game (goals, corners, shots on target, fouls, yellow/red cards) + static features (market value, squad age, internationals, EPL titles, runners-up, doubles).
- **Preprocessing:** CMU ARK TwitterNLP POS tagger (keep adjectives, verbs, nouns, adverbs, interjections, emoticons, possessives); Porter stemming; unigram and bigram versions.
- **Access:** Twitter Streaming API (2014-era open access); not replicable identically today.

## 3. Method / model

- Bag-of-words from tweets: chi-square and mutual-information ranking of unigrams/bigrams, keeping 1–35 terms per side (separate vocabularies for home and away teams); best at ~11–15 bigrams per side.
- Classifiers: Naïve Bayes, random forests (10–1000 trees, 100 seeds, OOB error), logistic regression, SVM (RBF/sigmoid/polynomial).
- Leave-one-out cross-validation; accuracy and Cohen's kappa reported.

## 4. Equations & assumptions

- No equations stated. Chi-square test p-values and mutual information used for feature ranking (standard definitions, not derived in the paper).
- Assumptions: tweets in a fixed pre-match window reflect fan sentiment/information; hashtag assignment correctly attributes tweets to teams; bag-of-words with POS filtering captures the predictive content; matches are i.i.d. for LOOCV.

## 5. Features / target

- **Inputs (Twitter):** presence/counts of top chi-square bigrams per team side. **Inputs (historical):** 12 team stat features × 2 teams. **Inputs (combined):** concatenation.
- **Target:** match outcome — home win / draw / away win.

## 6. Validation design

- Leave-one-out CV over N matches (3-month window); random forests averaged over 100 seeds.
- Baselines: the three dataset variants against each other; implicit chance baseline via Cohen's kappa.
- Metrics: accuracy (mean ± SD, min, max over seeds) and Cohen's kappa.

## 7. Numerical results / baselines

Best classifier per dataset (Table 2, quoted exactly):

| Model | Best classifier | Accuracy | Kappa |
|---|---|---|---|
| Twitter-only | Random forest | 65.6% ± 4.33% (56.3–74.7%) | 0.25 ± 0.093 (0.047–0.389) |
| Historical-only | Naïve Bayes | 58.9% ± 5.97% (50.6–64.4%) | 0.239 ± 0.075 (0.146–0.315) |
| Combined | Random forest | 69.6% ± 2.4% (64.4–74.7%) | 0.28 ± 0.065 (0.144–0.418) |

- Bigrams beat unigrams; performance peaks at ~11–15 features per side, then declines.
- The authors note the Twitter RF may predict the majority class often (high accuracy, modest kappa).

## 8. Code / data availability

None stated.

## 9. Leakage & limitations

- Only ~3 months of one season (8–10 games/team) — tiny sample; LOOCV on ~90 matches with high-variance accuracy (±4.33%).
- No time-ordered split; feature selection (chi-square over the whole corpus) likely done outside the CV loop — optimistic bias.
- Kappa values (0.25–0.28) are modest; accuracy flattered by home-win base rate.
- 2014 Twitter API and hashtag culture don't transfer directly; modern X data access is paid/restricted.
- No sentiment model — pure n-gram presence; the "what information" question is left open by the authors.

## 10. GSE overlap

Per the existing-research map: no existing social-media-text prediction work in the repo (X accounts are inventoried for *analyst* content, not fan sentiment). The ML research brief lists "multimodal fusion" and "market-relative learning" as commissioned topics. This paper is the first fan-sentiment-signal ledger — new capability, and a natural complement to 0845 (news co-occurrence networks).

## 11. GSE implementation spec

- Build an X-sentiment feature pipeline for NFL: collect team-mention tweets (X API) in the 72h pre-game window; replicate the POS-filter + bigram + chi-square selection; add modern embeddings as a second representation.
- Features per game: top-k bigram indicators per team, aggregate sentiment scores; feed as auxiliary features into the GSE game-outcome model.
- Effort: 3–5 days (data collection is the bottleneck).

## 12. Reproducible test

Dataset: 2024 NFL season, X team-mention tweets 72h pre-game, games as instances. Metric: accuracy and kappa on game-winner prediction, time-ordered CV (train weeks 1–12, test 13–18). Baselines: historical-stats-only model (point differential, DVOA-style features). Pass if the sentiment-augmented model beats the stats-only model on kappa.

## 13. Acceptance / rejection gate

ADOPT as an auxiliary feature family if the combined model beats stats-only kappa by ≥0.03 on the time-ordered 2024 test; REJECT if sentiment features add nothing once market lines are included (the real baseline — the paper never tested against odds).

## 14. Improvement experiment

Replace chi-square bigrams with LLM-extracted structured signals (injury mentions, lineup news, weather chatter) from the same tweet window, and test which sub-signal drives the gain. Hypothesis: most of the predictive content is injury/news leakage, not sentiment — isolating it yields a cleaner, more actionable feature.
