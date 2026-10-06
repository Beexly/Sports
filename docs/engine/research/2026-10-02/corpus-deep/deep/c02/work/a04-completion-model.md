# a04 — Verification: 0648 Frame-by-Frame Completion Probability (arXiv:2109.08051)

**Source verified:** `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/0648-frame-by-frame-completion-probability-nfl-pass.md` (75-line research ledger, verdict ADAPT, ledger completed 2026-09-21)
**Primary cross-checked:** the paper itself, arXiv:2109.08051v1 (da Silva & Moral, 2021), full text read via ar5iv HTML (985 lines). The ledger's cited local full-text cache (`/tmp/arxiv750-cache/fulltext/2109.08051.txt`) no longer exists; verification was done against the live primary source instead.
**Brief:** `~/workspace/corpus-intelligence/briefs/c02/c02-r12/...0648....brief.md` — consistent with findings below; no contradictions found.
**Map claim under test:** c02-map.md finding #10.

## VERIFIED CLAIMS

Each claim: exact number with context, ledger line, paper line, confidence.

**VC-1 — Two-stage architecture exists as described.** Stage 1: empirical target-ID via inverse-distance weighting on four distance measures (d^(1) point-to-ball-trajectory-line distance, d^(2) standardized frame-difference, d^(3) frame-to-frame player-ball distance change, d^(4) Euclidean player-ball distance), blended with adaptive weights W^(1..4) and a logistic frame-weight W^(2,3)_t = 1/(1+e^((13.34183−t)/2.57)), inflection at mean 13.34 frames, scale 2.57 via grid search. Stage 2: conditional completion P(C|T=i) via random forest. Marginal P(C) = Σ_i P(C|T=i)·P(T=i). — ledger L24-37; paper L186-357 (Eqs. 1–15). Confidence: **HIGH**.

**VC-2 — Target-ID accuracy 86.92%.** "This new and final way to compute the probabilities achieved an accuracy of 86.92%, which was better than the ones obtained through either W^(2) or W^(3), as expected." Baselines: equal-weight 82.67%, W^(2) 86.68%, W^(3) 85.23% (after the 2-yard "probability transfer" adjustment; before adjustment 81.25/85.66/84.34). — ledger L49-50; paper Table 1 (ar5iv L307-322) and L356-357. Confidence: **HIGH**.

**VC-3 — RF AUC 0.8829, vastly above linear baselines.** 10-fold leave-group-out CV (plays as groups): RF (mtry=15) **0.8829**; 5-fold 0.8825. Binomial logit 0.7874, probit 0.7861, LDA 0.7840, cloglog 0.7814, QDA 0.7487. mtry searched over 5–20, best at 15. Compute: ~3.88h (RF) vs ~2 min (logit). — ledger L46-48; paper Table 2 (ar5iv L542-568) and L570-576. Confidence: **HIGH**.

**VC-4 — Calibration Pearson 0.998 / Lin's concordance 0.998 — but ONLY for the conditional P(C|T=i) per frame vs completion %.** Marginal P(C) per frame: 0.978/0.958. Per-play averages are strictly worse (P(C): 0.958/0.903; P(C|T=i): 0.980/0.942). The map's "calibration Pearson 0.998 frame-by-frame" is accurate only with the conditional qualifier. — ledger L50-51; paper Table 5 (ar5iv L674-686) and L667-672. Confidence: **HIGH**. (Caveat in CHALLENGES: this is a binned-mean correlation over correlated frames.)

**VC-5 — 95.8% accuracy at 0.5 threshold is reported on the TRAINING set and is flagged misleading.** "if we consider a 0.5 threshold for predictions… for the predicted target on every frame, we get a 95.8% accuracy in predicting the result of the plays." The ledger correctly notes the base completion rate (~65%) inflates it and AUC is the honest metric. — ledger L51; paper L688-689. Confidence: **HIGH** (that the number exists and the flag is warranted).

**VC-6 — The authors' flagged skill gap, exact quote:** "Further work would include an improvement on how to determine during plays if a player still has a chance to be the target or not, and **possibly utilize information not available on the data to create variables to differentiate specific players based on their historical performance on the NFL and college football**." — paper Discussion (ar5iv L754-756); ledger §9 (L60-61). The map's paraphrase ("no player-skill priors") is a faithful summary. Confidence: **HIGH**.

**VC-7 — Missing ball z-coordinate is the authors' own #1 flagged input.** "If the vertical coordinates of the ball were also available, this could certainly be used to improve our framework even further. This is because sometimes the ball could be very close to a player when looking at the available x and y coordinates, but in reality the ball is very high up in the air and going in the direction of a player further up in the field." — paper L743-745; ledger L58-59. Confidence: **HIGH**.

**VC-8 — Data scope and exclusions.** Big Data Bowl 2021 = NGS tracking, 2018 regular season, 253 games (3 week-1 games missing), 203,148 frames, 1–46 frames/play (75% ≤ 16, 95% ≤ 25). Sacks, penalty plays, spikes, throwaways, fake punts/FGs excluded. Interceptions = incompletions. Linemen not tracked. Only x/y (no ball height). — ledger L15-22; paper L66-125. Confidence: **HIGH**.

**VC-9 — Public code and data.** R code (tidyverse, caret, randomForest, gganimate) at github.com/gustavopompeu/NFLPassCompletion; data via Kaggle BDB 2021. — ledger L56-57; paper L59-62, L788. Confidence: **HIGH** (URLs verified present in the paper; code not executed).

**VC-10 — No out-of-season validation.** "We could not find the same data for other seasons, which unfortunately made it impossible to expand our work through more games and seasons." — paper L750-752. Confidence: **HIGH**.

## FEATURE INVENTORY (all 32, tracking-vs-pbp for each)

Paper's Stage-2 list (ar5iv L374-514). For each: portable to nflverse pbp or tracking-only.

**Play data (13):**
1. Game quarter (1–5) — PBP: yes (`qtr`). Confidence HIGH.
2. Down (1–4) — PBP: yes (`down`). HIGH.
3. Distance for first down — PBP: yes (`ydstogo`). HIGH.
4. Formation (7 categories) — PBP: partial (`offense_formation`; 7-category BDB encoding needs remapping). MEDIUM. [INFERENCE: mapping exists but is not 1:1]
5. Defenders near LOS — PBP: yes-ish (`defenders_in_box`). MEDIUM (box count ≠ "near LOS" exactly).
6. Pass rushers — PBP: yes (`number_of_pass_rushers`). MEDIUM (column exists in nflverse pbp; verify at build).
7. Dropback type (7 categories) — TRACKING-ONLY. BDB-specific charting; no nflverse pbp equivalent. HIGH. [INFERENCE on absence — no matching pbp column known]
8. Time on clock (seconds) — PBP: yes (`game_seconds_remaining`). HIGH.
9. Yard line at LOS (1–99) — PBP: yes (`yardline_100`). HIGH.
10. Offensive team score — PBP: yes, derivable (`total_home_score`/`total_away_score` + `posteam`). HIGH.
11. Defensive team score — PBP: derivable, same as 10. HIGH.
12. Home indicator — PBP: derivable (`posteam == home_team`). HIGH.
13. Passer-to-target distance at release — TRACKING-ONLY. Requires target x/y at release; pbp has no target location. HIGH.

**Player data (3):**
14. Target position group (5 categories) — PBP: yes via `receiver_player_id` → roster position. HIGH.
15. Closest defender position (5 categories) — TRACKING-ONLY. No per-play defender identity/proximity in pbp. HIGH.
16. 2nd-closest defender position — TRACKING-ONLY, same reason. HIGH.

**Frame data (16) — ALL TRACKING-ONLY** (each needs per-frame x/y of ball + target + two defenders; nflverse pbp has no tracking):
17. Target distance to ball-trajectory line. 18. Target distance to ball. 19. Target-to-ball distance frame difference. 20–22. Same three for closest defender. 23–25. Same three for 2nd-closest defender. 26–28. Closest defender to target-trajectory line / to target / frame difference. 29–31. Same three for 2nd-closest defender. 32. Target distance to nearest sideline.

**Tally: 10 cleanly portable + 2 partial (formation, defenders-in-box) + 1 derivable nuance; 19 of 32 are tracking-only (13 + 3 player + ... precisely: features 7, 13, 15, 16, and 17–32 = 20 tracking-only; features 1–6, 8–12, 14 = 12 pbp-usable).** The 16 frame features are the actual engine of the 0.88 AUC (paper L667-672: frame-by-frame strictly beats play averages) — none of that engine ports.

**Pbp-side substitutes the paper didn't use but nflverse has** (verified via public nflverse data dictionaries, 2026-10-02): `air_yards` (the dominant completion driver), `pass_location`, `qb_hit` (pressure proxy), `shotgun`, `no_huddle`, stadium type (weather proxy). The nflfastR CP model uses exactly 18 such features on label `complete_pass` — it is the incumbent baseline any GSE model must beat.

## PORTABLE KERNEL (what a coder actually implements from nflverse pbp)

Ruthless cut — the tracking-dependent parts do not come along:

1. **Portable:** the probability identity P(C) = Σ_i P(C|T=i)·P(T=i) (paper Eq. 15). Generic math, no tracking needed.
2. **Portable:** the *validation discipline* — grouped CV (group = game, or temporal train≤2022 / validate 2023 / test 2024), AUC as primary metric (never threshold accuracy), binned calibration with debiased ECE ≤ 0.05 and calibration slope in [0.9, 1.1] per c02 doctrine, honest reporting of compute cost.
3. **Portable (rebuilt, not ported):** a **play-level** conditional-completion model on the 12 pbp-usable features + pbp substitutes above. This is a *different, harder task* than the paper's: the paper predicts per-frame with the ball already in flight and geometry known; the pbp model predicts at a play grain. Expect AUC in the ~0.70–0.78 band, NOT 0.88. [INFERENCE — the 0.88 is not achievable without frame geometry; nflfastR's 18-feature CP is the realistic neighborhood.]
4. **NOT portable:** all 16 frame features, Stage-1 target-ID (needs per-frame ball+player x/y — the entire 86.92% apparatus), the 2-yard probability-transfer fix, the logistic frame-weight (Eq. 13), the W^(1..4) order-statistic machinery, dropback type, passer-to-target release distance, defender position groups.
5. **Baseline to beat is nflfastR's `cp`, not the paper's RF.** nflverse pbp ships `cp`/`cpoe` (NGS-model-based). Gate: GSE play-level model beats nflfastR `cp` AUC on a 2024 holdout with ECE ≤ 0.05. Do NOT train on `cp`/`cpoe` as targets (INGEST-AND-LEARN: NGS-derived data is reasoning fuel only, internal, never commercialized or displayed — NGS internal-only doctrine 2026-09-28).
6. **Do not quote:** the 95.8% (training-set, threshold metric), the 86.92% (tracking-only), or the 0.998 (binned-mean correlation over within-play correlated frames) as capabilities of any pbp-built model.

## SKILL-PRIOR DESIGN (concrete recipe for receiver-talent + CB-coverage priors)

The paper's exact gap (VC-6): no per-player skill differentiation. nflverse pbp HAS `cp`/`cpoe` columns, but those are the *NFL's NGS-model* outputs — GSE's differentiator is an **independent, GSE-owned** expected-completion model with skill priors baked in, trained on outcomes, not on NGS outputs. Concrete recipe:

**A. Receiver-talent prior (buildable from pbp alone).**
Hierarchical logistic regression on pass plays (2006+, `air_yards` reliable):
`logit P(complete) = Xβ + u_receiver`, `u ~ N(0, σ²)`,
- X = situation fixed effects: down one-hots, ydstogo, yardline_100, game_seconds_remaining, score differential, home, shotgun, offense_formation, defenders_in_box, number_of_pass_rushers, air_yards, distance_to_sticks (= air_yards − ydstogo), pass_location, qb_hit, dome/outdoors.
- `u_receiver` = empirical-Bayes random intercept per `receiver_player_id`, shrunk toward 0 (population mean) with a min-targets guard (e.g., n ≥ 30 targets or heavy shrinkage). Rookies/unknowns get u = 0 exactly — the prior, not a guess.
- Refresh weekly in-season (rolling posterior); multi-season history as the prior.
- This is the "receiver-talent prior": catch-rate-above-expected attributable to the receiver after controlling for situation — hands + separation + route-running residual.

**B. CB-coverage prior (honest two-tier version).**
- Tier 1 (pbp-only, buildable now): defense-team random effect `v_defense` in the same hierarchical model + man/zone proxy (`defense_man_zone_type` in pbp — verify column at build [INFERENCE]) + pressure proxies (number_of_pass_rushers, defenders_in_box). This is a *team/situation* coverage prior, NOT a player-level CB prior. Label it honestly.
- Tier 2 (the real CB prior, needs non-pbp data): PFR advanced stats via nflverse `load_pfr_advstats(stat_type="def")` — per-defender targets, completions/yards/TDs allowed as nearest defender, passer rating when targeted, 2018+, weekly/season grain (verified available via public nflverse docs, 2026-10-02). Recipe: EB-shrunk per-defender "completion-allowed-above-expected / passer-rating-when-targeted" → map to the play via depth chart + participation data (`offense_players`/`defense_players` per play, 2016–2023; 2024+ adds names/positions). PFR is charted data, not NGS — no NGS-doctrine conflict.
- A true receiver-vs-specific-CB matchup prior (which CB covered which route) requires all-22 charting (FTN/PFF tier) — flag as the standing data gap, consistent with the slice's sourcing decision ("need contracts or first-party charting").

**C. Independent CPOE-style QB grade (the actual deliverable).**
1. Fit the situation + receiver-prior + coverage-prior model **without any QB term** → E[complete | situation, receiver talent, coverage].
2. `QB_CPOE_play = complete_pass − E[complete | …]`.
3. Shrink per QB with empirical Bayes over dropbacks (min-dropbacks guard) → the published-internal QB grade. The QB is graded on the residual AFTER crediting/blaming the receiver and coverage — this is what makes it "independent" and what the paper's geometry-only model cannot do.
4. Prop variant: E[complete | target = receiver i, priors] per receiver-week → reception-probability edges for anytime-TD/reception props (ledger §11 use-case (d)).
5. Calibration: debiased ECE ≤ 0.05 on the expected-completion head; rank-first sequencing per c02 doctrine (finding #2) — never ship the grade until the underlying rank is monotone.

## CHALLENGES

1. **The 0.998 is weaker than it looks.** Pearson 0.998 is computed on *binned means* of per-frame P(C|T=i) vs empirical completion %, and frames within a play share one outcome — massive within-play correlation inflates the effective sample. The honest discrimination number is the play-grouped frame AUC 0.8829, and even that is a per-frame task where late frames are nearly deterministic (ball within 2 yards of a player → probability-transfer fix).
2. **Single-season, single CV family.** 2018 only; LGOCV grouped by play *within* one season; no out-of-season test (authors admit it, VC-10). Era/style overfit risk is unmeasured. [The overfit-risk reading is INFERENCE; the no-other-season fact is verified.]
3. **The 86.92% target-ID is a post-release identification, not a prediction.** It answers "whose trajectory matches the ball's" after the throw — computable only with live tracking. It is useless for pre-throw decision modeling.
4. **Ledger's Test 1 gate (target-ID ≥ 85% on 2024 tracking) is only meaningful if GSE licenses/builds a tracking feed.** On nflverse pbp alone, Stage 1 cannot be reproduced at all — the gate is vacuous without tracking data. The reproduction path needs Big Data Bowl 2024 tracking (public via Kaggle), not pbp.
5. **Ledger §11 effort estimate ("low-medium") understates the skill-prior work.** The Python port of the paper is low-medium; the receiver/CB prior machinery (hierarchical modeling, weekly updating, PFR join, participation mapping) is the real build — medium, ~2–4 engineer-weeks including validation. [INFERENCE]
6. **Map finding #10's "frame-by-frame" qualifier matters.** The map is accurate, but a reader could infer the whole pipeline ports. It doesn't: 20 of 32 features and the entire Stage-1 apparatus are tracking-bound.
7. **Public/private doctrine collision.** The paper's method is NGS-data-native. Any GSE build that ingests NGS tracking stays 100% internal (2026-09-28 NGS internal-only doctrine, public/private surface doctrine): the website shows only projections/rankings, never completion-probability machinery, NGS names, or `cp`/`cpoe`.
8. **The ledger's Test 2 gate (AUC gain ≥ +0.01 from talent priors, calibration slope in [0.9, 1.1]) is sound but must be measured against the nflfastR `cp` baseline on a true future-season holdout**, not against the paper's 0.8829 — different tasks, different grains.

## BUILDABLE SPEC

**Spec B-1: GSE play-level expected-completion model (pbp-only, no tracking).**
- *Input:* nflverse pbp 2006–2024 (train ≤2022, validate 2023, test 2024), `load_rosters` (receiver positions), `load_participation` (defenders_in_box, coverage type).
- *Exclusions (mirror paper §2.1.1):* sacks, spikes, throwaways, penalty plays. *Label:* `complete_pass` (interceptions = 0).
- *Model:* hierarchical logistic regression (or GBM + isotonic calibration) with the fixed effects in SKILL-PRIOR DESIGN §A plus `u_receiver` and `v_defense` random effects.
- *Validation:* temporal holdout + game-grouped K-fold; metrics = AUC (primary), debiased ECE, calibration slope; never threshold accuracy.
- *Gates:* (i) beats nflfastR `cp` AUC on 2024 holdout; (ii) debiased ECE ≤ 0.05; (iii) calibration slope in [0.9, 1.1]; (iv) +receiver/CB priors add ≥ +0.01 AUC with slope staying in band.
- *Outputs (all internal):* per-play expected completion; shrunk QB_CPOE; receiver-prior table; team-coverage-prior table. Never public per NGS/public-private doctrines. Never train on `cp`/`cpoe`.
- *Effort:* medium. [INFERENCE]

**Spec B-2: Tracking reproduction (only if a tracking feed is licensed or BDB-2024 is pulled).**
- Port the paper's two stages to Python on BDB 2024 tracking; gates = target-ID ≥ 85%, Stage-2 AUC ≥ 0.85 (ledger §12 Test 1, endorsed). Then add the Tier-2 CB prior and re-run the gate in §B-1(iv) form. This is the in-play/live-probability product path — it does not run on pbp, full stop.

**Spec B-3: Target-selection model — the actual missing piece for the qb-behavior module (NOT in this paper).**
- The paper models *completion given target* and *geometric target identification*; it contains **zero** modeling of the QB's target *choice*. The qb-behavior module needs P(target = r | presnap state, coverage shell, route concept, pressure) — target concentration, first-read tendency, checkdown rate under pressure, aggressiveness by game state.
- Starting substrate (all pbp-adjacent, verified to exist): participation feed (`route` per play, `offense_players` per play 2016+ → target-share/first-read proxies), FTN charting via nflverse (`load_ftn_charting`: play action, screen, QB pressure, motion, 2022+), receiver `WOPR`/air-yard-share from `load_player_stats`. None of this comes from paper 0648 — flag for the sibling qb-behavior workstream.

**Bottom line:** the map's finding #10 verifies cleanly against the primary source on every number (86.92% / 0.8829 / 0.998-conditional / 32 features / public R code / exact skill-gap quote). The honest engineering read: the *architecture and validation discipline* are ADAPT-worthy; the *feature engine* is tracking-bound and does not port to nflverse pbp; the *skill-prior differentiator* is real, buildable, and concretely specified above — but it is a new hierarchical pbp model, not a port of this paper. Target *selection* (the qb-behavior module's actual need) is entirely absent from the paper and must be built from participation/FTN/PFR substrate.
