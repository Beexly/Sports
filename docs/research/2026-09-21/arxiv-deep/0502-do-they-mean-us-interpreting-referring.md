# [0502] Do They Mean 'Us'? Interpreting Referring Expressions in Intergroup Bias (arXiv:2406.17947v2)

**Citation:** Venkata S. Govindarajan, Matianyu Zang, Kyle Mahowald, David I. Beaver, and Junyi Jessy Li (2024). *Do They Mean 'Us'? Interpreting Referring Expressions in Intergroup Bias*. arXiv:2406.17947v2. URL: https://arxiv.org/abs/2406.17947v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,361 lines).
**Verdict:** REJECT — the demonstrated correlations between intergroup pronoun use and live win probability are descriptive linguistics, not predictive signal: WP is the grounding variable, so there is no evidence of incremental value for GSE's win/spread/total models.

## 1. Research question
How do NFL fans' referring expressions (in-group "we/us" vs out-group "they/them" references to teams) shift as a function of live win probability during games? The paper builds a tagger that resolves ambiguous pronouns to in-group/out-group team references in Reddit game-thread comments, then measures how reference rates co-move with nflFastR live WP.

## 2. Dataset / schema
- Corpus: 6M+ comments from 1,104 game threads across all 32 team subreddits, 569 games, 2021–22 and 2022–23 NFL seasons; aligned to nflFastR live win probability by comment timestamp.
- Expert annotations: 1,499 comments; 26.7% contain no relevant team reference; among referenced comments, 76.3% are in-group and 14.6% out-group. Split: 1,181 train / 318 test.
- Crowd annotations: 3 annotators per comment; Fleiss κ = 0.69; gold-match "accuracy" 0.65 ± 0.005.
- Silver-labeled: 100,000 comments tagged by the best model for the WP-correlation analysis.
- Access: code and data at https://github.com/venkatasg/intergroup-nfl (as stated in paper).

## 3. Method / model
Two taggers map each comment to reference labels (none / in-group / out-group, plus pronoun-form subtypes like we[in], they[out]):
- GPT-4o prompting, with WP supplied either numerically or linguistically ("the home team has a 70% chance of winning"), plus temperature scaling variants.
- Fine-tuned Llama-3-8B: batch size 4, sequence length 2,560, cosine LR schedule at 1e-5, 10 warmup steps, weight decay 0.1, max 2 epochs, early-stopping patience 3; trained on two A40 GPUs, ~1.5 hours per run.
Best tagger applied to 100k comments; per-WP-bin reference rates regressed on WP to get slopes.

## 4. Equations & assumptions
No formal equations stated for the tagger or the WP regression (slopes are OLS on binned rates; exact binning not specified in the extract). Assumptions: (a) expert annotations are gold truth for reference resolution; (b) nflFastR live WP timestamps align with comment timestamps without material lag; (c) team-subreddit membership defines the in-group; (d) the 100k silver-labeled comments are representative of the full 6M corpus.

## 5. Features / target
- Tagger inputs: comment text + game context + WP (numeric or linguistic form).
- Tagger target: reference label per comment (none / in-group / out-group and pronoun subtypes).
- Analysis: WP bins as the independent variable; reference-type rates as the dependent variable. Horizon: within-game, minute-level.

## 6. Validation design
- Tagger: train on 1,181 expert comments, test on 318; metric is accuracy/F1-style (Table I reports values like 69.0/71.0 with parenthesized SEs — exact metric definition ambiguous in the extract; appears to be accuracy or macro-F1 on the test split).
- WP-correlation: OLS slopes of reference rates on WP bins over 100k silver comments; R² reported. No predictive (forecasting) validation — the analysis is contemporaneous correlation, not a backtest.

## 7. Numerical results / baselines
Table I (tagging, best values as printed):
- GPT-4o with linguistic-WP + temperature scaling: 69.0 (1.1).
- Fine-tuned Llama-3-8B with numeric WP: 71.0 (1.0).
- Crowd annotators: Fleiss κ 0.69; gold-match accuracy 0.65 ± 0.005 — i.e., the best model (71.0) modestly exceeds average crowd agreement with gold.

Table II (slopes of reference rate on WP, scaled ×10^-4, with R²):
- any reference: −19.3, R² 0.72
- none: 2.4, R² 0.65
- in-group: −2.8, R² 0.31
- we[in]: −2, R² 0.61
- out-group: 2.5, R² 0.56
- they[in]: −0.3, R² 0.15
- they[out]: 0.4, R² 0.25

Interpretation (paper's): as WP rises, fans make fewer references overall and shift from in-group "we" talk toward out-group references.

## 8. Code / data availability
https://github.com/venkatasg/intergroup-nfl (code and data, as stated).

## 9. Leakage & limitations
- **No predictive claim is tested.** All WP results are contemporaneous correlations; nothing shows fan language *forecasts* WP movements or game outcomes.
- **WP is the grounding variable.** The tagger is *given* WP as input and the analysis regresses language *on* WP — the information flows from the model GSE already uses toward the text, not the reverse. There is no incremental-signal test (e.g., does comment sentiment improve WP estimates?).
- **Silver-label noise.** The 100k-comment analysis rests on a tagger with ~71% agreement; slope estimates inherit that noise, and no error-propagation analysis is done.
- **Selection bias.** Game threads on team subreddits over-represent engaged, partisan fans; 26.7% of expert comments had no reference at all.
- **Timestamp alignment.** Comment-posting lag vs WP timestamps is unaddressed; fast-moving WP swings could misalign bins.
- External validity to NFL modeling: even if robust, the finding is about fan psychology, with no demonstrated path to beating a market line.

## 10. GSE overlap
Per the existing-research map (2026-09-21): the map's gap list item 12 is "Text/news as features beyond the price — ML brief area 13 commissioned, no papers read; beat-writer text embeddings for injury news is untested." This paper is adjacent to that gap but does not fill it: it studies fan *reaction* text grounded on WP, not news text as a predictive feature. GSE's existing WP machinery (nflFastR-based, state-space extensions per 1701.05976) already produces the variable this paper treats as ground truth. Verdict rationale: **duplicate direction, no new capability** — the paper consumes WP; GSE needs features that predict it.

## 11. GSE implementation spec
None — verdict is REJECT for win/spread/total modeling. If the text-signal lane (gap 12) is ever pursued, the correct design is the reverse of this paper: test whether pre-game beat-writer text embeddings add log-loss improvement *on top of* market-implied probabilities, with strict time cutoffs — not fan reaction text regressed on live WP.

## 12. Reproducible test
Not applicable — REJECT. The paper's own design offers no forecasting test to replicate; running one would be a new research project, not a reproduction.

## 13. Acceptance / rejection gate
REJECT. Criteria: (a) no out-of-sample predictive test of any kind; (b) information flow runs from WP to text, so no incremental signal over GSE's existing WP inputs is even hypothesized, let alone measured; (c) tagger accuracy (~71%) is near crowd-agreement levels, leaving the silver-label analysis fragile. A text feature would need to beat market-implied WP out-of-sample to merit attention; this paper does not attempt that bar.

## 14. Improvement experiment
The experiment the paper does not run but should: build the tagger, then test whether *pre-snap* comment features (e.g., injury-discussion spikes, lineup-news mentions in the 60 minutes before kickoff) improve predicted WP calibration or beat the closing line on a held-out season — i.e., flip the causal arrow and measure incremental log-loss vs market. If that fails, the lane is definitively closed for prediction.
