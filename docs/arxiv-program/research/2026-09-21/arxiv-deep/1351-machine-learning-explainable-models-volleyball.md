# [1351] Machine Learning in Sports: A Case Study on Using Explainable Models for Predicting Outcomes of Volleyball Matches (arXiv:2206.09258v1)

**Citation:** Abhinav Lalwani, Aman Saraiya, Apoorv Singh, Aditya Jain, Tirtharaj Dash (BITS Pilani, 2022). *Machine Learning in Sports: A Case Study on Using Explainable Models for Predicting Outcomes of Volleyball Matches*. arXiv:2206.09258v1. URL: https://arxiv.org/abs/2206.09258v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 427-line extraction; all sections read). **Replaces:** ledger 1192 (REJECT).
**Verdict:** REJECT

An undergraduate-level XAI case study applying off-the-shelf AIX360 library calls (BRCG, SHAP, ProtoDash) to Brazilian volleyball match prediction with no temporal validation, no code or data release, and no novel method or transferable sports insight — it contributes nothing GSE cannot already do with the same libraries.

## 1. Research question
Can directly interpretable models (BRCG Boolean rules, logistic regression) and post-hoc explanations (SHAP, ProtoDash) give sensible, faithful explanations for black-box predictions of Brazilian SuperLiga volleyball match outcomes?

## 2. Dataset / schema
- **1,289 matches**, Brazilian Volleyball SuperLiga, seasons 2010/11–2018/19, scraped from FlashScore.in (not shared).
- Features (per team): matches won (win %), exponential moving averages of points scored/conceded, head-to-head set difference, form over last 5 (exponentially averaged), separate home/away form, match importance (0 league / 1 QF / 2 SF / 3 final), rest days (capped at 7), current league position, previous year's position, previous-game performance. Target: home team win (1/0).

## 3. Method / model
- White-box: **BRCG-light** (Boolean rules via column generation with beam search; learns OR-of-ANDs classifiers) and **logistic regression** (weight magnitudes as feature importance) — both via IBM's **AIX360** library.
- Black-box: SVM, feed-forward neural network, linear discriminant analysis.
- Post-hoc: **Kernel SHAP** (Shapley values per feature, summed from a base value) evaluated with the **faithfulness** metric (correlation between SHAP importance and the attribute's effect on model performance); **ProtoDash** (5 training-set prototypes with importance weights nearest to each test instance).

## 4. Equations & assumptions
- No new equations; methods are library instantiations. BRCG rule learned: predict Y=1 iff [away last-year position > 3.00 AND head-to-head form > −1.02 AND home last-year position ≤ 10.00 AND home win% > 10.53], else 0.
- Assumptions: features are human-interpretable; a single train/test split is representative; faithfulness (a correlation heuristic) validates explanations. No temporal structure in the split is described.

## 5. Features / target
Hand-built exponentially averaged form/ranking features per team; binary home-win target. Generic feature set drawn from soccer-prediction literature (Tax et al., Goddard) applied to volleyball.

## 6. Validation design
- A single unspecified train/test split (no dates, no temporal ordering, no cross-validation) on 1,289 matches. No walk-forward, no calibration analysis, no baseline comparison (home-win base rate unreported).

## 7. Numerical results / baselines
- Test accuracy: **SVM 0.7790** (F1 0.7971, AUC 0.7771); ANN 0.7713; LDA 0.7519; LogReg 0.7403; BRCG 0.7218.
- LogReg top features: away current position, home average points, away previous-year position.
- SHAP example: home win predicted at probability 0.84 from base 0.45, driven by previous-season positions and average points. Average SHAP **faithfulness 0.60** (scale −1 to +1).
- ProtoDash: nearest prototype weight 0.6946 vs 0.16/0.09/0.05 for the rest; 17/19 features >50% similar.

## 8. Code / data availability
None. Experiments ran in Google Colaboratory with AIX360; no repository, no dataset release, no random seeds or split definition.

## 9. Leakage & limitations
- **No temporal validation**: the split is undescribed, and with exponentially averaged season features a random split almost certainly leaks future games into training — accuracy numbers are uninterpretable for a forecasting claim.
- **No baselines**: home-win base rate, Elo, or market odds unreported, so 0.779 accuracy cannot be judged against anything.
- Wrong-sport, weak-signal rules: the BRCG rule is a four-literal conjunction an analyst would never trust; the feature list mixes basketball/volleyball citations carelessly ("win ratios of basketball teams").
- This is a course project (BITS F464 Machine Learning, acknowledgements name the TAs): it demonstrates library usage, not research.

## 10. GSE overlap
The XAI-for-trust idea is real but **generic and non-novel**: SHAP, ProtoDash, and BRCG are pre-existing AIX360 methods, and the corpus already covers model interpretability more rigorously. Nothing in the paper — no feature, metric, or validation trick — is absent from GSE's existing toolkit. Volleyball adds no transferable insight for NFL/CFB. The feature engineering (exponential form averages, rest, home/away splits) is standard practice GSE already uses.

## 11. GSE implementation spec
None warranted — the paper's entire method is "call AIX360's BRCG/SHAP/ProtoDash," which requires no paper to implement. If GSE wants pick explanations, the route is the AIX360/shap documentation, not this study.

## 12. Reproducible test
Not applicable — no code, no data, no split definition; the one reported accuracy (0.779, SVM) cannot be reproduced or benchmarked.

## 13. Acceptance / rejection gate
**Rejected outright**: zero novel methods, zero transferable sports insights, no temporal validation, no released artifacts, and a wrong-sport demonstration. Adopting anything from it would mean adopting a library tutorial.

## 14. Improvement experiment
The only salvageable thread is a real one: GSE could run its own **explanation-faithfulness study** — compute SHAP values for engine picks and measure faithfulness (per Alvarez Melis & Jaakkola, the metric this paper borrows) plus a human-judgment study of whether explanations increase user trust — but that experiment belongs to the cited XAI literature, not to this paper.

**Note:** This REJECT requires a further full-paper replacement read per Garrett's standing rule, but the assignment allocates no replacement ledger numbers beyond 1348–1353; this conflict is flagged in the reader report rather than resolved by inventing IDs.

**Verdict:** REJECT
