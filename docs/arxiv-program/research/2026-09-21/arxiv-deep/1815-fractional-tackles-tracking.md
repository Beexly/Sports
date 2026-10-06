# Ledger 1815 — Fractional Tackles: A New Defensive Statistic Derived from Player Tracking Data

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2403.14769
- **Title:** Fractional Tackles: A New Defensive Statistic Derived from Player Tracking Data
- **Authors:** Quang Nguyen, Ronald Yurko, Ruoqi Yu
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, Big Data Bowl 2024 context, data-processing pipeline, contact-window detection rule, fractional-tackle model with window value and credit attribution, model evaluation via cross-validation against alternative metrics, results including split-half reliability, leaderboards, tackle-attempt and forced-missed-tackle extensions, discussion of limitations, and references) from the extracted text at `/tmp/wave4b-dfs2/txt/2403.14769.txt` (HTML saved to `/tmp/wave4b-dfs2/papers/2403.14769.html`). Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Conventional tackle statistics credit only the final tackler(s) and discard all unsuccessful attempts, producing a noisy, low-reliability defensive metric. Can player-tracking data define contact windows and distribute fractional tackle credit across all defenders who contacted the ball-carrier, yielding a more reliable and informative tackle statistic?

## 3. Method/model

- **Contact-window detection:** on running-back run plays, find intervals where ≥ 1 defender is within **1.5 yards** of the ball-carrier (threshold chosen because ~95% of first-contact/tackle-event distances fall below it). Each play can have multiple windows; 7,453 windows, mean duration 1.28 s.
- **Window value model:** v(w) = E[end-of-play value | window] — how much the window reduced the ball-carrier's expected end-of-play yard line (i.e., yards saved). (Fitted with a model for the ball-carrier's end-of-play value given game state at window end vs. window start.)
- **Credit attribution:** distribute v(w) among contacting defenders by **peak frame velocity toward the ball-carrier** — defenders moving faster toward the carrier at contact get more credit; a "first-contact" indicator adjusts the split.
- **Extensions:** tackle-attempt detection (lunge/angle changes) and forced missed tackles (defender enters the 1.5-yard radius but the carrier escapes).

## 4. Mathematics, equations, assumptions

- Contact window: {t : min_d dist(d, carrier, t) ≤ 1.5 yd}; windows merged/split by continuity rules.
- Window value: v(w) = E[Y_end | state at window end] − E[Y_end | state at window start] (yards prevented, signed so positive = good defense).
- Fractional tackle for defender d: FT_d = Σ_w v(w) · share_d(w), share from peak toward-carrier velocity.
- **Assumptions:** (a) 1.5-yard radius captures all meaningful contact; (b) peak velocity toward the carrier is a fair proxy for contribution share; (c) end-of-play yard-line value is an adequate outcome; (d) pass plays excluded (RB runs only).

## 5. Dataset/schema

- **NFL Big Data Bowl 2024**: 12,486 plays / 136 games, weeks 1–9 of the 2022 season.
- Analysis restricted to **5,539 running-back run plays** (of 6,670 total run plays).
- Schema: 10 Hz player tracking (x, y, speed, acceleration, orientation) + play/event annotations.

## 6. Features and target

- **Features:** defender–carrier distances, defender velocity vectors (toward-carrier component), first-contact flags, game state at window boundaries.
- **Target:** fractional tackle credit per defender per play (and season aggregates).

## 7. Validation design

- **Split-half reliability** (Spearman–Brown style): split each defender's plays randomly, correlate halves — the core validity test for a "statistic."
- **Cross-validation** of the window-value model vs. alternatives.
- Face-validity leaderboards; comparison of fractional vs. conventional tackle counts.

## 8. Exact results and baselines with numbers

- Split-half reliability (correlation): fractional tackles **0.69** vs. combined tackles **0.59** overall; by position group 0.57 / 0.57 / 0.73 vs. 0.46 / 0.51 / 0.64 — fractional wins in every group.
- Leaders: Roquan Smith **19.83 total / 0.102 per-play**; Christian Wilkins **17.53 / 0.125**; Bobby Wagner 17.33.
- Fractional tackles credit **19,691 player-play instances** vs. 7,720 conventional tackle/assist instances — ~2.5× the coverage.
- First-contact share and forced-missed-tackle extensions identify defenders whose box-score tackles understate disruption.

## 9. Code/data availability

- Code: **https://github.com/qntkhvn/tackle** (R package / scripts).
- Data: Big Data Bowl 2024 files on Kaggle (competition data, public).

## 10. Leakage and limitations

- RB run plays only — no pass plays, no QB scrambles, no WR screens; the majority of defensive snaps are excluded.
- 1.5-yard threshold and velocity-share rule are heuristics, not learned; the "fair share" has no ground truth.
- Tracking is 10 Hz; brief contacts can be missed.
- Forced-missed-tackle detection is rule-based and unvalidated against charting.
- One 9-week sample; season-to-season stability not shown.

## 11. GSE overlap

- This is GSE's **reliable defensive-stat** lane: IDP fantasy and defensive player props (tackles+assists lines) need a stable tackle metric — fractional tackles' 0.69 split-half reliability (vs. 0.59) makes it a better projection input and a better "true talent" estimator for tackle props.
- The contact-window + window-value + attribution template generalizes: pass-rush windows (time-to-pressure credit), coverage windows (target-prevention credit).

## 12. Implementation specification

1. **Inputs:** GSE's NFL tracking data (or Big Data Bowl-style 10 Hz feeds) + play annotations.
2. **Detect** contact windows (1.5-yard rule) on run plays; compute window values from a ball-carrier end-of-play model.
3. **Attribute** credit by peak toward-carrier velocity; aggregate per defender per game/season.
4. **Outputs:** per-player fractional-tackle rate (per play, per snap) → features for IDP projections and tackle-prop pricing; first-contact share as a separate "disruption" feature.
5. **Extend** to pass plays: pressure windows (distance-to-QB < threshold) with sack/throwaway value attribution — the paper's template, new domain.

## 13. Reproducible test

- Rebuild on Big Data Bowl 2024 data with the public code: require split-half reliability ≥ 0.65 for fractional tackles and strictly above conventional combined tackles on the same sample.
- Unit test: Roquan Smith's total must rank #1 among LBs (face-validity anchor from the paper).

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** split-half reliability 0.69 > 0.59 overall and better in all three position groups; 2.5× coverage (19,691 vs. 7,720 instances); public code + data. Accept as ADAPT (not ADOPT: run-plays only, heuristic attribution shares, single 9-week sample).
- **Improvement experiment:** learn the attribution shares (gradient-boosted model predicting window value from defender kinematic features) instead of the fixed velocity rule, and extend windows to pass plays. Success = split-half reliability ≥ 0.72 on run plays and ≥ 0.60 on pass-rush windows, with the learned shares outperforming the velocity heuristic in window-value cross-validation.

**Verdict:** ADAPT — Tracking-derived fractional tackle credit with window-value attribution; adopt fractional tackles (and the contact-window template) as GSE's reliable defensive metric for IDP projections and tackle-prop pricing, with learned attribution shares and pass-play extension as the improvement path.
