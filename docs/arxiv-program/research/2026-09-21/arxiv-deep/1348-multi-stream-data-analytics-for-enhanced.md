# [1348] Multi-stream Data Analytics for Enhanced Performance Prediction in Fantasy Football (arXiv:1912.07441v1)

**Citation:** Nicholas Bonello, Joeran Beel, Seamus Lawless, Jeremy Debattista (2019). *Multi-stream Data Analytics for Enhanced Performance Prediction in Fantasy Football*. arXiv:1912.07441v1 (27th AIAI Irish Conference on Artificial Intelligence and Cognitive Science). URL: https://arxiv.org/abs/1912.07441v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 478-line extraction; all sections read). **Replaces:** ledger 1187 (REJECT).
**Verdict:** ADAPT

A Fantasy Premier League recommender that fuses historical stats, betting odds, and blog/news sentiment into per-position gradient-boosting models, lifting a full-season simulation from rank ~800,000 (top 13%) to rank ~30,000 of 6.5M (top 0.5%); the multi-stream player-performance pipeline — and the honest negative result on tweet sentiment — transfers directly to GSE's DFS/props player-projection lane.

## 1. Research question
Do fantasy-football player-performance predictions improve when historical statistics are fused with "human feedback" data streams — betting-market odds, expert/fan blog sentiment, and tweets — and which streams actually add value for Fantasy Premier League (FPL) gameweek lineup recommendation?

## 2. Dataset / schema
- **FPL API** (official game data): player stats per gameweek — minutes, influence, threat, creativity, ICT index, transfers balance, points history, fixture difficulty ratings (FDR), home/away flags, value/price.
- **Betting odds** via football-api (RapidAPI): upcoming-fixture market odds converted to implied probabilities (team-level; player-specific "player to score" markets noted as unavailable).
- **Tweets** via tweepy: FPL-specific hashtags; dropped from the final model.
- **Blog/news sentiment** via Aylien API: entity-based sentiment on top-100 search results per FPL-specific query per player per gameweek; more than 100 results added noise and hurt accuracy.
- Season: English Premier League **2018/19** (38 gameweeks). Dataset stated as publicly available and updated weekly (link anonymized in the paper as "Anonymous"). Aylien API is commercial; FPL API and tweets are free.

## 3. Method / model
- Per-position (goalkeeper/defender/midfielder/forward) **gradient boosting machines** (chosen over SVMs and random forests for robustness on the highly imbalanced points distribution — Figure 2 shows most players score 0–2 points/gameweek).
- Target: binary **"isCaptain"** = 1 if the player scored more than 6 points in the current gameweek, 0 otherwise (a proxy for "player worth picking").
- Hyperparameter selection via **AUC-ROC curves** across parameter values (Figure 3) to avoid overfitting.
- Feature importance inspection per position (Figure 5: for goalkeepers, influence, minutes, and previous-week points dominate; home/away nearly irrelevant).
- Pipeline (Figure 1): FPL API + odds API + article API → statistics predictor + article predictor → GBM → weekly optimal lineup. Injured players and non-appearing players removed each gameweek.
- **Honest negative result**: tweet sentiment *degraded* predictions — standard sentiment libraries fail on football slang, misspellings, emojis (Figure 4); tweets excluded from the final model. Blogs/articles worked because of grammatical text amenable to named-entity extraction + entity sentiment.

## 4. Equations & assumptions
No formal equations stated. Assumptions: binary "captain-worthy" (>6 pts) classification is a good proxy for lineup optimization; blog entity-sentiment scores are comparable across players and weeks; betting odds add information beyond stats (market wisdom); per-position models capture role-specific feature relevance; weekly re-scraping keeps features fresh; the recommender's unconstrained weekly optimal lineup (ignoring FPL's one-free-transfer rule) is still a useful assistant.

## 5. Features / target
Features (per player per gameweek): FPL stats (minutes, influence, threat, creativity, ICT, transfers, value, previous points, FDR, opponent stats, home/away), odds-implied fixture probabilities, blog entity-sentiment scores. Target: isCaptain ∈ {0,1} (>6 points this gameweek). Horizon: one gameweek ahead; models re-run weekly on all prior gameweeks' data.

## 6. Validation design
Full-season simulation on EPL 2018/19: each gameweek instance trained on all previous gameweeks, evaluated on the upcoming gameweek (expanding window, time-ordered). Baseline: purely statistical GBM (no text/odds). Metric: total FPL points accumulated over the season by the recommended XI and the resulting leaderboard rank among 6.5M players; plus per-position precision. No cross-validation folds (single season); no comparison against market odds or other published FPL models beyond the cited Matthews Bayesian Q-learning work.

## 7. Numerical results / baselines
- Multi-stream model: **2,314 points** over the season, **avg ~63–64 pts/gameweek**, rank **~30,000 of 6.5M (top 0.5%)**.
- Statistical baseline: **1,994 points**, avg **~52–54 pts/gameweek**, rank **~800,000 (top 13%)**.
- Improvement: **+320 points** (≈ +11 points/week as stated in the abstract).
- Per-position precision: forwards **92%** (multi-stream) vs **88%** (baseline); goalkeepers **79%** vs **82%** (baseline better — stats dominate for keepers, text adds noise).
- Prediction accuracy overall: **89%** (multi-stream) vs **91%** (baseline) — accuracy slightly *down* while points strongly *up* (accuracy on the binary proxy ≠ points; the model trades precision for upside).
- Blog-sentiment ablation: betting data alone and blogs alone each significantly beat the statistical baseline; combined, "considerably more powerful than their individual counterparts."

## 8. Code / data availability
Dataset link anonymized ("Anonymous") in the extracted text — effectively unavailable as stated. No code link stated. Component APIs named: FPL API (free), football-api via RapidAPI, tweepy, Aylien text API (commercial).

## 9. Leakage & limitations
- **Single season (2018/19), no cross-season validation** — the +320-point edge is one draw; no confidence interval.
- **Recommender, not playable**: ignores FPL transfer constraints (one free transfer/week), so the rank comparison flatters the system vs real managers.
- **Accuracy paradox**: the 89%-vs-91% accuracy dip is reported without reconciling which errors changed — the points gain implies better upside identification, but this is asserted, not decomposed.
- Blog-sentiment pipeline depends on a commercial API (Aylien) and hand-tuned FPL queries; top-100 cutoff tuned on the same season (mild overfitting risk).
- Soccer/FPL-specific scoring; no calibration of predicted probabilities; no betting-market test of the selections.
- Tweet-sentiment failure is honestly reported, which strengthens credibility.

## 10. GSE overlap
Directly on-point for GSE's thin **DFS/props lane** (wave-3 was launched to fill exactly this gap). The map shows no existing ledger fusing betting odds + text sentiment into player-level projections; the closest adjacent work is generic tabular ML. The per-position GBM architecture and the odds-as-feature pattern are new, implementable additions. Not a duplicate of anything in the corpus.

## 11. GSE implementation spec
- **Adapt as a DFS/props "multi-stream" projection layer**: (1) per-position (QB/RB/WR/TE for NFL DFS) gradient-boosting models predicting P(player hits upside threshold) — GSE's analog of isCaptain is P(>2× salary-implied projection) or P(top-5 positional finish; (2) feature streams: nflverse/FTN stats, odds-API implied totals and player-prop lines as features (not just targets), and news-sentiment via entity-level sentiment on beat-writer articles (the paper's blog pipeline maps directly; skip raw tweets per the paper's negative result, or use a football-fine-tuned sentiment model); (3) weekly expanding-window retraining; (4) position-specific feature-importance audits to set stream weights (e.g., down-weight text for low-variance positions, mirroring the goalkeeper finding).
- Data: nflverse (free), Odds API (already in GSE stack), news APIs. Effort: 2–3 weeks for the pipeline + one season of backtest.

## 12. Reproducible test
- Dataset: nflverse 2021–2024 NFL seasons + historical DraftKings salaries.
- Task: weekly P(player exceeds 3× value threshold), per-position GBMs, expanding-window training, evaluated on realized fantasy points of the recommended lineup vs a stats-only baseline.
- Metric: total fantasy points over the season and rank-equivalent percentile vs the field; plus precision@k per position.
- Baseline to beat: stats-only GBM. Success = multi-stream (stats + odds-implied features + news sentiment) beats stats-only by a margin comparable to the paper's ~16% points gain (2,314 vs 1,994), with the sentiment stream ablated separately.

## 13. Acceptance / rejection gate
**Adopt** the multi-stream pattern if, on 2021–2024 backtest, the full-stream model beats the stats-only baseline by ≥10% total points with each added stream (odds, news sentiment) contributing positively in ablation; **reject** the text-sentiment stream (keep odds+stats) if news sentiment fails to add value — mirroring the paper's own tweet-negative-result discipline.

## 14. Improvement experiment
Beyond the paper: (1) replace the binary isCaptain proxy with **direct points regression + quantile heads** (the paper's accuracy/points paradox shows the proxy is lossy — predict the full distribution and optimize the lineup for expected points under salary cap via integer programming); (2) fix the transfer-constraint gap by modeling the *sequence* of weekly lineups as a budgeted bandit rather than independent weekly optima — the paper's recommender framing leaves this open, and it is the difference between a demo and a playable DFS optimizer.

**Verdict:** ADAPT
