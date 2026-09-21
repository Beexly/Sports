# [1117] Buzz to Broadcast: Predicting Sports Viewership Using Social Media Engagement (arXiv:2412.10298v1)

**Citation:** Anakin Trotter (2024). *Buzz to Broadcast: Predicting Sports Viewership Using Social Media Engagement*. arXiv:2412.10298v1. URL: https://arxiv.org/abs/2412.10298
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; entire paper including appendix links read).
**Verdict:** ADAPT — the 72-hour pre-event social-buzz feature engineering is reusable for GSE engagement/viewership prediction, but the paper's R²=0.99 is an artifact of a random split plus sport one-hot encoding and must be rebuilt with temporal validation before any use.

## 1. Research question
Can pre-event social-media engagement (Reddit posts, comments, scores, sentiment) predict sports broadcast viewership?

## 2. Dataset / schema
- **Reddit engagement** via the **PullPush API**: queries cover the **72 hours before each event**; API capped at **100 results per query**.
- Events across multiple sports (sport one-hot encoded); viewership numbers per event (source: public ratings reports, per paper).
- Supplementary code and data links are stated in the paper (appendix); exact URLs were not preserved in the extracted text — consult the PDF's link annotations for the verbatim URLs.

## 3. Method / model
- Features: total Reddit posts/comments/scores in the 72h window, **average TextBlob and VADER sentiment**, **one-hot encoded sport**.
- Preprocessing: target transformed with **log_e(1+x)**; **IQR outlier removal**; **min-max scaling**; **random 80/20 split (random_state=42)**; **5-fold GridSearchCV**.
- Model: Gradient Boosting Regressor. Grid: n_estimators {100, 200}, learning_rate 0.05, max_depth {3, 5}, min_samples_split {2, 5}, subsample {0.8, 1.0}.

## 4. Equations & assumptions
- No novel equations stated. log1p target transform: y' = ln(1+y). Assumptions: (a) a random 80/20 split is valid for event data (it is not — see §9); (b) 72h of Reddit activity captures "buzz"; (c) sport one-hot + sentiment averages are sufficient statistics for viewership.

## 5. Features / target
- Features (exact): total posts, total comments, total scores, mean TextBlob sentiment, mean VADER sentiment, one-hot sport. Target: event viewership (log1p-transformed).

## 6. Validation design
- **Random** 80/20 split (random_state=42) — **not time-ordered**. 5-fold GridSearchCV on the training portion. Metrics: MAE, RMSE, R² on the test split. No temporal validation, no held-sport-out validation.

## 7. Numerical results / baselines
- Test: **MAE 1.27 million**, **RMSE 2.33 million**, **R² = 0.99**.
- Paper's claim: social engagement strongly predicts viewership. My interpretation: the R² is driven by experimental design (see §9), not by buzz signal.

## 8. Code / data availability
- Supplementary code and data links are stated in the paper's appendix; exact URLs not preserved in extracted text (see PDF annotations).

## 9. Leakage & limitations
- **Random split on time-ordered event data** is the central flaw: events from the same season/sport appear in both train and test, so the model memorizes sport-level viewership tiers rather than learning buzz→viewership. **Sport one-hot + Super Bowl-scale outliers**: with the Super Bowl (~100M+ viewers) in the data, one-hot sport plus log-target makes R²=0.99 nearly mechanical — the model learns "Super Bowl = big" from the one-hot, not from Reddit. (c) PullPush cap of 100 results/query truncates exactly the highest-buzz events, biasing the key feature downward where it matters most. (d) IQR outlier removal may have deleted the most informative events. (e) Tiny, highly stratified event dataset (counts not prominently reported). This is a "how not to validate" case study as much as a method paper.

## 10. GSE overlap
- Related: `1094-driving-engagement-in-daily-fantasy-sports.md` (engagement, but DFS-contest focused — distinct task). The existing-research map's "text/news as features" gap covers price prediction, not viewership — this paper is an **extension** into a new dependent variable (audience size) with a reusable feature recipe. Not a duplicate.

## 11. GSE implementation spec
- **Use case:** GSE content prioritization — predict per-game audience/engagement 72h out to allocate clip-production and posting effort across the NFL slate (and across sports).
- **Rebuild (fixing the paper):** features = post/comment/score volumes + TextBlob/VADER sentiment over 72h pre-game windows (Reddit + X); **temporal split** (train ≤2023, test 2024); **held-sport-out** validation; replace raw one-hot with a hierarchical model (sport random effects) or drop sport and use team Elo + market size.
- **Model:** GBR with the paper's grid as a starting point; target log1p(viewership).
- **Effort:** ~1–2 engineer-weeks (data collection is the long pole).

## 12. Reproducible test
- Dataset: 2023–2024 NFL regular-season games; 72h pre-game social features; target = TV viewership (public ratings). Baselines: (a) sport/team-mean, (b) the paper's exact pipeline (to reproduce the inflated R²), (c) the fixed pipeline. Metric: MAE on 2024 forward test.

## 13. Acceptance / rejection gate
- **Adopt** the feature recipe only if the *fixed* pipeline beats the team-mean baseline by ≥15% MAE on the 2024 forward test AND held-sport-out R² > 0.5; **reject** if the signal disappears once the sport one-hot and random split are removed (i.e., the paper's result was pure artifact).

## 14. Improvement experiment
- Swap the GBM for a **hierarchical Bayesian model** with sport-level and team-level random effects plus the buzz features as population-level predictors. This directly models what the paper's one-hot was secretly doing (pooling viewership tiers) while letting buzz features explain *within-tier* variation — the actual question. Expect it to outperform both the paper's GBR and a plain baseline on held-sport-out evaluation.
