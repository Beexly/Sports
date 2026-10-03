# 1719 TwitterPaul: extracting and aggregating Twitter predictions (arXiv:1211.6496v1)

**Citation:** Naushad UzZaman, Hector Llorens, Leon Derczynski, James Allen (2012). *TwitterPaul: Extracting and Aggregating Twitter Predictions about Sporting Events*. arXiv:1211.6496v1. URL: https://arxiv.org/abs/1211.6496v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, all sections, tables, and references).
**Verdict:** ADAPT — the high-precision prediction-extraction grammar (CFG with strong/weak/support/retweet/question categories) and the trust-weighted aggregation that beat the betting line on RMSE are a genuine find for GSE's social-signal lane, but the CFG is English-only, negation-blind, and built for 2010 World Cup tweets; adapt the extraction taxonomy and confidence-weighted aggregation to modern NFL social data with a learned extractor.

## 1. Research question

Can the "wisdom of crowds" on Twitter predict sporting-event outcomes better than betting markets? The paper asks two questions: (a) can explicit predictions be extracted from noisy tweets with high precision using a context-free grammar over prediction patterns, and (b) does aggregating those extracted predictions — weighted by extractor confidence and user trust — beat the betting line and existing ranking-based predictors on the 2010 FIFA World Cup?

## 2. Dataset / schema

- 2010 FIFA World Cup, 37-day window: 16,157,749 tweets collected; 538,000 extracted predictions; ~150,000 classified as "strong" predictions.
- CFG prediction categories: strong prediction ("Brazil will win"), weak prediction ("Brazil might win"), support ("Go Brazil!"), third-person report, retweet of a prediction, question/condition ("will Brazil win?").
- Evaluation: 8,776 random tweets sampled; 300 manually labeled for extraction precision/recall.
- Ground truth: actual match outcomes (64 matches) and pre-match betting lines.

## 3. Method / model

- Extraction: hand-built context-free grammar over tweet text matching prediction patterns (team mention + prediction verb + outcome), classifying each match into the six categories above. English only.
- Aggregation: per-match predicted outcome = weighted vote over extracted predictions; weighting schemes compared: unweighted, trust-weighted (user history reliability), logistic-regression-weighted (learned weights on prediction-strength and user features).
- Baselines: betting line, probability-from-team-rank, and the raw aggregations (all predictions, strong only, support only).

## 4. Equations & assumptions

- RMSE computed on predicted vs actual outcome probabilities across the 64 matches; a second RMSE reported against the betting market's implied probabilities (market RMSE 0.3959 / 0.0000 by construction on its own line).
- Trust weighting: users with historically accurate predictions get higher weight; logistic weighting learns per-feature weights on (prediction strength, user trust, recency).
- Assumptions: tweet predictions are sincere (no sarcasm modeling — negation explicitly ignored); the 37-day window captures the relevant predictive chatter; English tweets represent the crowd; team-name matching is exact.

## 5. Features / target

- Input features per tweet: matched CFG pattern, prediction category (strong/weak/support/...), mentioned teams, user trust score (historical accuracy), retweet/favorite counts.
- Target: match outcome (win/draw/loss) and the aggregated predicted probability.
- Aggregation features: prediction-strength class, user trust, logistic-learned weights.

## 6. Validation design

- Extraction evaluated on 300 hand-labeled tweets (precision/recall/F1 per category).
- Prediction evaluated on all 64 World Cup matches: RMSE vs actual outcomes and vs the betting line; compared across weighting schemes and prediction subsets.
- No temporal split issues (single tournament); but only 64 matches — small sample for the headline "beats the market" claim.

## 7. Numerical results / baselines

- Extraction: strong predictions — precision 0.886, recall 0.786, F1 0.833. All predictions — precision 0.693, recall 0.931, F1 0.794.
- RMSE (vs actual / vs market): betting line 0.3959/0.0000; team-rank probability 0.4215/0.1614; strong predictions 0.4197/0.1159; all predictions 0.4245/0.1409; all extractions 0.4260/0.1553; support-only 0.4416/0.2217.
- Weighted: trust-weighted 0.4147/0.1131; logistic-weighted 0.4183/0.1117 — both beat the unweighted aggregations and come close to the betting line's 0.3959, but neither beats the market outright on outcome RMSE.
- Historical user weighting added little beyond the trust/logistic schemes.

## 8. Code / data availability

- No public code or tweet dataset link found in the paper (2012-era Twitter data; the API and data-retention landscape has changed completely). The CFG patterns are described but not released as code.

## 9. Leakage & limitations

- Only 64 matches: the RMSE differences between weighting schemes (0.4147 vs 0.4197) are within noise; "near-market" performance is suggestive, not demonstrated.
- CFG is English-only and ignores negation ("Brazil won't win" misclassified) — systematic extraction bias.
- Sincerity assumption: no sarcasm/irony handling; sports Twitter is heavily ironic.
- 2010 Twitter demographics skew young/male/English-speaking — the "crowd" is not representative; the paper acknowledges this.
- No calibration analysis of the aggregated probabilities; RMSE alone does not show the crowd adds value beyond the line (and on outcome RMSE it does not beat the line).

## 10. GSE overlap

- GSE's social-signal lane is untested per the existing research map; this paper is the cleanest prior art for "extract predictions from social text and aggregate with trust weighting" — directly applicable to NFL betting Twitter/X, beat-writer prediction tallies, and crowd-consensus features for GSE's market-microstructure work.
- The strong/weak/support taxonomy maps onto GSE's source-tiering (ledger 1717): strong predictions from trusted accounts ≈ high-tier evidence.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/signals/social_predictions.py`: (1) replace the CFG with a fine-tuned classifier (XLM-R or similar) trained on labeled NFL X posts to extract (game, predicted side, strength: strong/weak/support, negation-aware) — fixing the paper's two biggest extraction flaws; (2) maintain per-account trust scores from historical prediction accuracy on resolved games; (3) aggregate per game with trust × strength weighting into a crowd-consensus probability; (4) feed the consensus as a feature into GSE's market-microstructure model (public-lean proxy) and as a contrarian indicator when it diverges from the line.
- Negation and sarcasm handling are mandatory acceptance criteria for the extractor (the paper's known blind spots).

## 12. Reproducible test

- Backtest on 2024 NFL season: extract predictions from X posts about each game (or a sampled subset), aggregate with trust weighting, and evaluate: (a) extraction F1 ≥ 0.80 on a 500-post human-labeled set (negation subset F1 ≥ 0.75); (b) crowd-consensus Brier score vs the closing line's Brier — success if the consensus adds information (combined model beats line-only by ≥ 0.005 Brier) rather than beating the line outright, since the paper itself only approaches the market.

## 13. Acceptance / rejection gate

ADAPT the taxonomy (strong/weak/support/question) and the trust-weighted aggregation recipe; do not adopt the CFG or the "beats the market" framing — on outcome RMSE the paper's best aggregation (0.4147) does not beat the betting line (0.3959), and n=64 cannot support the claim anyway. ADAPT proceeds if the reproducible test shows extraction F1 ≥ 0.80 with negation handling and the consensus feature improves a line-plus-consensus model; REJECT the social-consensus signal for any game/week where extraction volume falls below a coverage threshold (the paper's 538K predictions over 64 matches ≈ 8.4K/match is the density that made aggregation work — thin chatter is noise).

## 14. Improvement experiment

Go beyond the paper on its three acknowledged weaknesses. (1) Negation/sarcasm: train the extractor with explicit negation and irony labels and ablate — quantify how much of the paper's error was negation-blindness by re-scoring their taxonomy on a modern labeled set; this is the experiment the 2012 CFG could not run. (2) Calibration: the paper reports only RMSE — calibrate the trust-weighted consensus with isotonic regression and test whether the calibrated crowd probability has positive economic value as a *divergence* signal (bet against the crowd when |crowd − line| is large and the crowd is historically overconfident), which reframes "wisdom of crowds" as "measure of public bias" — directly GSE-relevant. (3) Cross-tournament generalization: the paper is one World Cup; test the same pipeline on an NFL season and a second sport to see whether trust-weighting transfers or is tournament-specific.
