# [0648] Frame by Frame Completion Probability of an NFL Pass (arXiv:2109.08051)

**Citation:** Gustavo Pompeu da Silva, Rafael de Andrade Moral (2021). *Frame by Frame Completion Probability of an NFL Pass*. arXiv:2109.08051v1. URL: https://arxiv.org/abs/2109.08051
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2109.08051.txt`).
**Verdict:** ADAPT — two-stage NFL pass-completion framework (empirical target identification → random-forest conditional completion) built on Next Gen Stats tracking data, directly in Garrett's NGS-first priority lane. Provides a tested baseline architecture and 32-feature list for GSE's own in-play completion model.

## 1. Research question
How likely is an NFL pass to be completed while the ball is in the air? Two sub-problems: (1) who is the pass target, frame by frame, using only player/ball distances; (2) conditional on the target, what is the completion probability, evolving frame by frame — computable in real time since only current and past frames are used.

## 2. Dataset / schema
- NFL Big Data Bowl 2021 (Kaggle): Next Gen Stats tracking for all passing plays, 2018 regular season, 253 games (three week-1 games missing). Per frame: x/y coordinates (field 120×53.3 yards), speed, event tags (41: snap, pass_forward, pass_arrived, etc.), player position groups, play metadata (quarter, down, distance, formation, pass rushers, dropback type, scores, clock).
- Passing plays = pass thrown, sack, or 5 penalty types; sacks, penalty plays, spikes, throwaways, fake punts/FGs removed. Frames filtered to between pass-release and outcome events; 203,148 total frames; 1–46 frames/play, 75% ≤16 frames, 95% ≤25 frames.

## 3. Method / model
- Stage 1 (target prediction): distance measures — d^(1) = point-to-line distance of player to ball trajectory (Eq. 3, projection formula); d^(3) = b = h_t − h_{t−1}, frame-to-frame change in player–ball Euclidean distance (Eq. 5); d^(2) = standardized non-negative version of d^(3) (Eq. 6); d^(4) = Euclidean player–ball distance. Empirical target probability P_k(T=i|j) = 1/[d^(k)_ij · Σ_i (d^(k)_ij)^{−1}] (Eq. 7) — inverse-distance weighting. Combined via frame weight W: f(W) = W·P_1 + (1−W)·P_2 (Eq. 8); four adaptive weights W^(1..4) from order statistics of distance metrics of the closest player (Eqs. 9–12); final weight W^(2,3)_t = 1/(1+e^{(13.34183−t)/2.57}) (logistic in frame number, inflection at mean 13.34 frames, scale 2.57 via grid search) blends W^(2) early → W^(3) late (Eqs. 13–14). Probability "transfer" fix: players within 2 yards (d^(1) and d^(4)) of ball absorb all others' probability. Final target accuracy 86.92%.
- Stage 2 (completion | target): random forest (mtry=15) on 32 features — 13 play data (quarter, down, distance, formation, defenders near LOS, pass rushers, dropback, clock, yard line, scores, home, passer–target distance at release), 3 player data (target position, closest/second-closest defender positions), 16 frame data (target/defender distances to ball-trajectory line, to ball, frame differences, target–defender distances, target–sideline distance). Compared vs binomial regression (logit/probit/cloglog), LDA, QDA via leave-group-out CV (plays as groups), 5 and 10 folds, AUC metric.
- Marginal: P(C) = Σ_i P(C|T=i)·P(T=i) (Eq. 15).

## 4. Equations & assumptions
- v = [y2−y1, −(x2−x1)]^T. (Eq. 1)
- r = [x1−x0, y1−y0]^T. (Eq. 2)
- d = |(x2−x1)(y1−y0) − (x1−x0)(y2−y1)| / √((x2−x1)² + (y2−y1)²). (Eq. 3)
- h = √((x1−x0)² + (y1−y0)²). (Eq. 4)
- b = h_t − h_{t−1}. (Eq. 5)
- d^(2)_ij standardization. (Eq. 6)
- P_k(T=i|j) = 1/[d^(k)_ij · Σ_i (d^(k)_ij)^{−1}]. (Eq. 7)
- f(W) = W·P_1(T=i|j) + (1−W)·P_2(T=i|j). (Eq. 8)
- W^(2,3)_t = 1/(1 + e^{(13.34183−t)/2.57}). (Eq. 13)
- P(T=i|j,t,D^(1),D^(2),D^(4)) = W^(2,3)_t·f(W^(3)_j) + (1−W^(2,3)_t)·f(W^(2)_j). (Eq. 14)
- P(C) = Σ_i P(C|T=i)·P(T=i). (Eq. 15)
- Assumptions: frames treated independent for target ID (dependence "natural" via smooth distances); only x/y coordinates (no ball height); interceptions = incompletions; player-history features excluded (only in-play geometry).

## 5. Features / target
- Target: binary complete/incomplete per frame (one observation per frame using the real target); target-ID is an auxiliary classification.
- Inputs: 32 play/player/frame features (geometry-heavy); no player-skill priors.

## 6. Validation design
Leave-group-out CV (play = group, 5 and 10 folds) on 2018 data, AUC; training-set threshold accuracy at 0.5; calibration plots (predicted probability vs empirical completion %); Pearson and Lin's concordance correlations; qualitative comparison vs NFL NGS published probabilities on 2 of 3 "most improbable catches" from week 1, 2018 (third play in missing game).

## 7. Numerical results / baselines
- Model AUC (10-fold LGOCV): random forest 0.8829; binomial logit 0.7874; probit 0.7861; LDA 0.7840; cloglog 0.7814; QDA 0.7487. RF vastly superior (but 3.88h vs 2 min for logit).
- Target prediction accuracy: final 86.92% (vs EW 82.67%, W^(2) 86.68%, W^(3) 85.23%).
- Calibration: P(C|T=i) per frame vs completion %: Pearson 0.998, Lin's concordance 0.998; P(C) per frame: 0.978/0.958; per-play averages worse — frame-by-frame strictly better.
- Training accuracy at 0.5 threshold: 95.8% on predicted-target frames.
- Case studies: Rodgers→Allison 39-yd TD: model 62.4% at catch frame (NGS "most improbable" — model higher = better on a completed pass); Brady→Gronkowski TD: 28.8% final; frame-75 Allison at 24.8% when ball in range.

## 8. Code / data availability
Code: https://github.com/gustavopompeu/NFLPassCompletion (R: tidyverse, caret, randomForest, gganimate). Data: https://www.kaggle.com/c/nfl-big-data-bowl-2021/data (public).

## 9. Leakage & limitations
- 2018 season only, one CV split family (no true out-of-season test); nflverse/Big Data Bowl data now freely available for multi-season extension.
- No ball z-coordinate — authors flag this as the main missing input (ball "close" in x/y may be high in the air).
- No player-skill features: same geometry for elite and replacement-level receivers — completion probability conflates situation with talent.
- Target-ID errors propagate into P(C); frame-independence assumption in Stage 1 is a hack (works empirically).
- 0.5-threshold "95.8% accuracy" is misleading (base completion rate ~65% inflates it); AUC 0.8829 is the honest metric.
- NGS comparison is anecdotal (2 plays, publication-timing ambiguity).
- Sacks/penalties excluded → not a full dropback model.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has NGS metric inventories and general tracking-data coverage, but no frame-by-frame completion-probability model with an explicit two-stage target→completion architecture on Big Data Bowl tracking data. The 48-post NGS inventory (2026-09-20) covers NGS's own published metrics; this paper is an independent reconstruction with public code — complementary, and it gives GSE a ready-made baseline to beat. Extension, not duplicate.

## 11. GSE implementation spec
- Data: Big Data Bowl tracking sets (public via Kaggle/nflverse-adjacent; 2018–2024 now available — paper used 2018 only).
- Reproduce the two-stage pipeline in Python (replace R randomForest with gradient boosting or a calibrated classifier): Stage 1 target-ID via the paper's inverse-distance weighting (cheap, 86.9% accurate); Stage 2 completion|target with the 32-feature set PLUS the missing pieces the authors flagged: receiver/CB talent priors (GSE's own receiver ratings, CB coverage grades), ball-height proxy if available, weather/wind.
- Use cases: (a) live in-play completion probability for GSE's in-game product/content; (b) feature for GSE's play-level EPA/win-probability models; (c) QB decision-making evaluation (expected completion vs actual — "completion % over expected" à la NGS CPOE, independently computed); (d) prop edges: reception-probability per route for anytime-TD/reception props.
- Effort: low-medium — public code + data; main work is the Python port and adding talent priors.

## 12. Reproducible test
Dataset: Big Data Bowl 2024 tracking (or most recent available), train on 2022–2023, test on 2024. Test 1 (reproduction): implement Stage 1+2 per paper; gate = target-ID accuracy ≥85% and Stage-2 AUC ≥0.85 on 2024 holdout (paper: 86.92%, 0.8829). Test 2 (improvement): add receiver-talent + CB-coverage priors; gate = AUC gain ≥+0.01 with calibration slope in [0.9, 1.1], and CPOE-style metric (actual minus predicted) correlates ≥0.3 with next-season QB EPA/play (predictive validity of the talent residual).

## 13. Acceptance / rejection gate
ADAPT if reproduction hits the Test 1 gates AND the talent-augmented model passes Test 2 — then GSE owns an in-house completion-probability model for in-play and props. REJECT if reproduction fails to reach AUC 0.85 on modern tracking data (suggesting the 2018 result doesn't generalize) or if talent priors add nothing (geometry saturates the signal).

## 14. Improvement experiment
Add the missing z-dimension: estimate ball height from broadcast tracking or from the pass's hang-time physics (projectile model fit to x/y + event tags: release point, catch point, airtime → solve for launch angle/height profile). Test whether height-aware features (ball height at closest approach vs receiver catch radius) improve AUC on contested catches specifically — the subset where the 2D model is weakest (subset AUC on passes with defender within 1 yard of receiver at arrival).
