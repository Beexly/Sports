# [0306] Predicting the NFL using Twitter (arXiv:1310.6998)

**Citation:** Shiladitya Sinha, Chris Dyer, Kevin Gimpel, Noah A. Smith (2013). *Predicting the NFL using Twitter*. arXiv:1310.6998v1. URL: https://arxiv.org/abs/1310.6998
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 492 lines).
**Verdict:** ADAPT — the tweet-volume-rate feature (public attention momentum) is a cheap portable signal worth re-testing on modern social/X data; the 2010–2012 Twitter pipeline itself is obsolete and the WTS accuracies sit at the edge of noise.

## 1. Research question
Can Twitter output (tweets about specific NFL teams/games) predict future game outcomes (winner) and betting outcomes (winner with the point spread; over/under the total line) as well as or better than traditional game-statistics features — and is any of it profitable? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Tweets:** Twitter "garden hose" (10%) stream, 2010–2012 NFL seasons (2012: ~42M messages/day). Tweets assigned to teams by manually-built hashtag lists (Table 1; e.g., #giants, #nyg, #nyjets); tweets with hashtags of >1 team discarded; Japanese-baseball #giants contamination removed via Unicode script filters.
- **Tweet windows:** weekly tweets (≥12h after previous game start, ≤1h before upcoming game start); pregame (24h→1h before); postgame (4h→28h after previous start). Counts (Table 2): 2010 — 40,385 pregame / 53,294 postgame / 185,709 weekly; 2011 — 130,977 / 147,834 / 524,453; 2012 — 266,382 / 290,879 / 1,014,473.
- **Game stats:** NFLdata.com, 2010–2012 regular seasons (weeks 1–16), with bookmaker point spreads and totals.
- **Access:** released for academic research at www.ark.cs.cmu.edu/football (game data + tweet IDs per team/game).

## 3. Method / model
- **Model:** logistic regression for three tasks (winner / winner-with-spread / over-under). Online forecasting: for test week k ∈ [4,16] of 2012, train on 2010–2011 all weeks + 2012 weeks [1,k−3]; tune L1/L2 coefficient from {0,1,5,10,25,50,100,250,500,1000} on dev weeks [k−2,k−1]; test on week k. Weeks 1–3 and 17 excluded (latter: atypical playoff-clinching games).
- **Statistical feature sets F1–F10 (Table 4):** point spread line; O/U line; avg points beaten/missed spread; avg points beaten/missed O/U; avg points scored; avg points given up; avg total points; avg(spread+scored); home/away WTS %; avg INTs/fumbles/sacks. Baselines = 10 sets + all 55 pairwise unions.
- **Twitter unigram features:** (home/away, unigram) with value log(1+frequency) over weekly tweets, threshold 0.1% occurrence; dimensionality reduced via **canonical correlation analysis (CCA)** jointly with stat features (1/2/4/8 components tested).
- **Twitter rate features:** signed volume momentum — rateS(v_old, v_curr, Δ) = sign(v_curr−v_old)·⌊|v_curr−v_old|/Δ⌋ (v_old=v_prev, Δ=500 tuned on 2010–11); rateP(v_old, v_curr, θ) = sign(v_curr−v_old)·⌊|v_curr−v_old|/(θ·v_old)⌋ (θ ∈ {0.1..0.5}, v_old ∈ {v_prev, v_prev_avg}). Output in {−2,−1,0,1,2}.
- **Domain analysis (Sec. 4):** postgame-tweet classifier (logistic regression, bag-of-words) for win/loss labeling → domain sentiment lexicon (67% avg accuracy; Table 3 features: "win/victory/WIN" vs "refs/lost/bad").

## 4. Equations & assumptions
- rateS: `(v_old, v_curr, Δ) ↦ sign(v_curr − v_old)·⌊|v_curr − v_old|/Δ⌋` ∈ {−2,−1,0,1,2}
- rateP: `(v_old, v_curr, θ) ↦ sign(v_curr − v_old)·⌊|v_curr − v_old|/(θ·v_old)⌋`
- CCA: find paired linear projections of the two views (unigrams ℝ^m1, stats ℝ^m2) onto ℝ^k maximizing projected-component correlation with diagonal cross-correlation — used here for supervised dimensionality reduction.
- Assumptions: hashtag assignment captures team-relevant tweets (high-precision, low-recall); 53%+ WTS accuracy = profitable after vig; tweet timestamps/window cutoffs are correct (no game-end-time data; thresholds are heuristic); online feature selection on trailing 2 weeks' accuracy transfers forward.

## 5. Features / target
- **Inputs:** team-assigned weekly tweet unigrams / tweet-volume rate features + 10 statistical feature sets.
- **Target:** per-game winner (binary), winner-with-spread (binary), over/under (binary) — predictions for 2012 weeks 4–16.

## 6. Validation design
- Strictly online (no future information): train ≤ week k−3, tune on weeks k−2/k−1, test on week k; regularization + feature-set selection both tuned per week per feature set.
- Metrics: accuracy per task; oracle conjunction rows (best feature-set combinations per task) reported separately (starred).

## 7. Numerical results / baselines
Quoted exactly from Table 7 (2012 weeks 4–16; single-feature-set rows):
- **Winner:** F1 (spread line) 60.6; F5 (avg points scored) 65.9; ∪F_i (all 10 sets) 63.0; Twitter unigrams 52.3; rateS 51.0.
- **Winner WTS:** F1 47.6; F4 54.8; ∪F_i 47.6; Twitter unigrams 47.6; CCA(4 comp) 51.9; **rateS 55.3** (above the 53% profit threshold); rateP θ=0.1 (v_prev) 52.4 WTS per Table 6.
- **Over/under:** F1/F2 48.6; Twitter unigrams **54.3** (best single-set number on O/U); rateS 52.4.
- **Oracle conjunctions (starred):** F5∪F9∪rateP(θ=.2) winner 65.9*; F3∪F10∪rateP(θ=.1) WTS **57.2***; F3∪F4∪rateS(Δ=200) O/U **58.2***.
- **Adaptive weekly feature selection** (trailing-2-week best set, 12 weeks / 177 games): winner 63.8%, WTS 52.0%, O/U 44.1% — the O/U failure shows trailing-2-week selection is unstable (best set changed in 8 of 13 weeks, Fig. 1).
- **Paper's claims:** simple tweet features "can match or exceed" statistical features; rateS hyperparams tuned on 2011 transferred to 2012.

## 8. Code / data availability
Data released for academic research (www.ark.cs.cmu.edu/football: game data + tweet IDs); no model code stated.

## 9. Leakage & limitations
- **Hyperparameter peeking:** rateS's Δ=500 and v_prev were "found best in preliminary testing on the 2010 and 2011 seasons" — then reported on 2012; but Table 7 also reports rateP over a θ grid on the test data (selected θ values are chosen post hoc per task).
- **Multiple-comparison garden:** 55 stat-set unions + CCA components + rate variants + oracle conjunctions — the starred numbers (57.2 WTS, 58.2 O/U) are the max over a large search with no significance testing; the online-selection experiment (which is the honest test) got WTS 52.0% — below profitability.
- **Twitter ecosystem is unrecognizable in 2026:** 140-char era, different user base, bots/influence ops, team-fan hashtag behavior changed; the 0.1%-occurrence unigram pipeline and rateS momentum are behavior-dependent.
- Hashtag precision approach drops huge tweet volume (no hashtags = unassigned); sentiment-free; no account-limit/vig modeling beyond the 53% rule.

## 10. GSE overlap
Existing-research map: the 15-area ML brief commissioned "text/news as features beyond the price" (area 13) but **no papers read** — the gap list (#12) explicitly calls for "beat-writer text embeddings for injury news". The 2026-09-18 props reverse-engineering sweep covers X accounts' tables, not text models. **This is the first text-as-feature paper in the corpus** — fills a named gap (new capability), not a duplicate. Related only by domain (NFL), not by method.

## 11. GSE implementation spec
1. **Modern port of the rate feature:** collect per-team weekly X-post volume + engagement for the 2026 season (GSE's X tooling / reply-opportunity monitor infrastructure); compute rateP-style momentum features (v_prev, v_prev_avg baselines; θ grid); test as additive features to the totals model (the O/U results are the paper's strongest claim) and the spread model.
2. **Sentiment upgrade:** replace bag-of-words with a finetuned sentiment/injury-news classifier on beat-writer text (per gap #12) — injury-news embedding as a separate feature family; the paper's rate feature only measures volume, not content.
3. **Discipline the paper skips:** fix hyperparameters on 2023–2024, evaluate locked on 2025; no oracle conjunctions; report WTS accuracy against the 53% bar with CIs; cost-limit realism (best available line per book panel, not one book's line).
4. Data: X API (Garrett's @GalaxySportsHQ infra), nflverse, The Odds API lines. Effort: ~1–2 weeks for the volume-rate prototype; the sentiment/injury-news embedding is a separate 2–4 week lane.

## 12. Reproducible test
Dataset: NFL 2023–2025 (nflverse game stats + bookmaker lines + X per-team weekly post volumes, collected via GSE's X tooling). Build rateP momentum features per team per week (locked θ=0.2, v_old=v_prev_avg — paper's chosen values); add to a logistic baseline of (spread line + team WTS% + scored/given-up averages). Online evaluation: train ≤week k−3, test week k, 2025 season only. Success = +tweet features beats baseline on O/U accuracy by ≥3pp with 95% CI, OR on WTS by ≥2pp (given the 53% bar, smaller WTS moves matter).

## 13. Acceptance / rejection gate
**Adopt** tweet-volume momentum as a totals-model feature if the locked 2025 online test shows ≥3pp O/U accuracy gain over the stats baseline with CI excluding zero; **adopt the injury-news sentiment lane** only if a beat-writer sentiment feature adds ≥2pp WTS accuracy over volume alone; **reject** the unigram/CCA pipeline entirely (obsolete, overfit, and the paper's own online-selection experiment failed to monetize it).

## 14. Improvement experiment
The paper's adaptive selection failed because trailing-2-week accuracy is noise. Replace it with **online learning with expert weighting (Hedge/exp-weights) over feature-set experts**, updated weekly with proper scoring (log-loss, not accuracy) — a bandit that learns which feature family (volume, sentiment, stats) is currently informative. This converts the paper's unstable "best recent set" heuristic into a principled ensemble that can actually be deployed for weekly totals picks.
