# NGS Implementation Playbook (DRAFT — filling in)

Date: 2026-09-21. Purpose: turn every Next Gen Stats metric family into a GSE-replicable build: NGS's public definition, documented inputs/features, public calculation description, equations where published, public data/code/API inventory, GSE implementation spec, backtest/validation design, iteration plan, and clearly-labeled gaps.

STATUS: skeleton only. Two full browser reports (NGS methodology/backend; @NextGenStats profile continuation Apr 24 → Mar 9, 2026) were completed but delivered truncated; re-deliveries requested via browser.steer_task on 2026-09-21 ~01:30 CDT and are still in flight. Fill the AWAITING-REPORT sections when they land. Do not invent formulas.

## Standing NGS facts (already verified)

- Sampling: player location data captured 10 times/sec (NFL's published figure).
- Quick pressure = under 2.5 seconds (the only threshold NGS states outright).
- Tracking data is proprietary (Zebra RFID). Public proxies: NFL Big Data Bowl Kaggle datasets (annual tracking releases), nflverse (nflreadr) play-level aggregates.

## Metric families

### 1. Completion Probability / CPOE
- NGS definition: probability of a pass being completed under given conditions.
- Public inputs (nfl.com, Sep 21 2018, verbatim list): "more than 10 different in-play factors... pass air distance (from quarterback to receiver), air yards, the distance between the receiver and the nearest defender, the distance between the quarterback and the nearest pass rusher, the speed of the quarterback at throw, among several other metrics." Named factors also: Target Separation, Sideline Separation, Pass Rush Separation, Passer Speed, Time to Throw.
- Model: XGBoost hosted on Amazon SageMaker (amazon.science, Feb 2026).
- Equation: none published. CPOE = actual completion − completion probability (Brock Purdy Week 2 2026: +16.7%, highest by a 49ers QB in a game since ≥2018, min 20 attempts).
- Public data/code: AWAITING-REPORT (Kaggle Big Data Bowl tracking + community XGBoost reimplementations expected).
- GSE implementation: AWAITING — spec after report.
- Gaps: full feature list (>10, only ~7 named); XGBoost hyperparameters; training window/label definition.

### 2. Run Scheme Classification (new 2026)
- Verbatim (NFL Analytics Team, Sep 7 2026): "Our new run scheme classification model uses a transformer architecture to interpret the spatial and temporal relationships among players throughout a play. The primary output is a label that represents the intended play design (one of 16 labels), with these concepts also being identified as man, zone and gap schemes. The model also adds secondary tags, such as read option, split zone and pitch, and identifies both the intended run gap and the gap the ball-carrier actually hits."
- Companion models: play-action concept classifier; per-defender gap responsibility.
- Built with AWS ProServe. No architecture hyperparams, features, or equations published.
- AWAITING-REPORT: public dataset/code inventory; GSE implementation spec.

### 3. Run Blocking Matchups & Metrics (new 2026)
- Verbatim: model "identifies each offensive player's blocking assignment, the type of block he executes — a pull, down block or crack block, among others — and when the engagement begins and ends."
- Derived: double-team frequency, time to shed a block, disruptions without tackle credit, blocks springing a runner. New observed metrics: time to pressure allowed (Linderbaum 3.64s, 2026); quick pressure rate for OL.
- No architecture/features/equations published.
- AWAITING-REPORT: public dataset/code inventory; GSE implementation spec.

### 4. Route Classification 2.0 (2026)
- Verbatim: "We debuted our original Route Recognition model in 2020. This offseason, we retrained it with a more detailed route tree. We can now separate shallow and deep crossing routes, while also distinguishing fade routes that were previously grouped with go routes. We can more accurately detect what constitutes a screen by accounting for blocker movement and the receiver's route path. What's more, we've added inside and outside release classification."
- No architecture/features/equations published for v1 or v2.
- AWAITING-REPORT: public dataset/code inventory; GSE implementation spec.

### 5. Rushing efficiency: RYOE / MTF
- MTF (missed tackles forced): Kenneth Walker III forced 15 in Week 2 2026 (career high; 14+ three times since 2024, rest of NFL twice).
- RYOE (rush yards over expected): expected-rush-yards model, details not published.
- AWAITING-REPORT: methodology details; GSE implementation spec.

### 6. Pass rush: pressure rate, get-off, quick pressures
- Observed: Lukas Van Ness Week 2 2026 — 30 rushes, 9 pressures, 30.0%, 1.5 sacks, 0.70s get-off. (Unresolved discrepancy: one extraction said five of nine pressures under 2.5s; another said five pressures in second half — flagged, do not use either until resolved.)
- "MOST QBP VS. DOUBLE TEAMS 2024–2025": Kobie Turner 36, Osa Odighizuwa 32, Vita Vea 29, Leonard Williams 28, Jeffery Simmons 26.
- AWAITING-REPORT: methodology; GSE implementation spec.

### 7. NGS Draft Model
- Scores: Overall / Production / Athleticism 0–100; Raw ATH 10.0 scale; "predictive & raw athleticism models trained against DTs since 2003" (Ugo Bernard: Athleticism 96 (1st), Raw ATH 10.0 (1st)).
- Graphic format G1: production + athleticism bars, overall gauge, scale 50/60/70/80/90/100 = AVG/AVERAGE/GOOD/ELITE.
- No equations/features published.
- AWAITING-REPORT: methodology; GSE implementation spec.

### 8. Coverage / DB metrics
- Observed: cumulative win probability added on interceptions (Wright 64.3%); target EPA for DBs (Byard −18.6); yards per coverage snap.
- AWAITING-REPORT: methodology; GSE implementation spec.

### 9. Other new observed metrics (2026 season)
- Kicker makes over expected (Fairbairn +6.1).
- Motion at snap rate (Ingold 36.9%, led NFL).
- Daniel Jones context: 8.5 success rate, +0.19 EPA/dropback vs zone (free-agency card footnote).
- AWAITING-REPORT: definitions; GSE implementation spec.

## Public data/code/API inventory
AWAITING-REPORT. Expected: Kaggle NFL Big Data Bowl tracking datasets, nflverse/nflreadr, GitHub community reimplementations, Amazon Science articles.

## Per-metric GSE implementation template (apply once report lands)
For each metric: (a) exact NGS definition, (b) public inputs, (c) public calc description, (d) published equations or labeled gap, (e) public data/code/API with URLs, (f) GSE implementation spec (data sources, feature engineering, model, training protocol), (g) backtest/validation design with acceptance criteria, (h) iteration/improvement plan, (i) labeled gaps.

### 10. Coverage/DB/special metrics from profile pass 2 (Apr 24 → Mar 9, 2026, 80 posts)
- Target EPA for DBs (Byard −18.6; Dean −30.1); yards per coverage snap (Woolen 0.5 man; Bush 0.49 LB); cumulative WPA on INTs (Wright 64.3%); EPA per target (Bush −0.73, fewest of any defender targeted 25+).
- Quick pressure rate OL (Edwards 0.7%, 3rd-lowest among LGs); time to pressure allowed (Linderbaum 3.64s, 2nd-longest among centers); pressure rate allowed by guards (Seumalo 3.7%, lowest among guards).
- Pressures when double teamed (Turner 36, Odighizuwa 32, Vea 29, Leonard Williams 28, Simmons 26, 2024–25; Allen 64 since 2021); quick pressure rate DTs (Hargrave 2nd-highest since 2023).
- Kicker makes over expected (Fairbairn +6.1); motion at snap rate (Ingold 36.9%, led NFL); run stops for unsuccessful play (Onyemata 42; Crosby 24 run stuffs for loss/no gain, most by DL since 2018); missed tackle rate (Chenal 5.2%, lowest LB since 2023); scramble EPA (Murray 4th since 2019); average speed on carries (Mitchell 14.49 mph); on/off-field EPA splits (Ricard +0.13 vs −0.09).
- No formulas published for any of these. All are derived from the 10x/sec tracking feed + game-context models.
- GSE implementation: mirror G2 leaderboards / G3 free-agency cards from nflverse + FTN charting; adopt minimum-qualifier + historical-anchor framing discipline.

## Discrepancies — RESOLVED/OPEN
1. Lukas Van Ness: five-of-nine under 2.5s vs five pressures second half — STILL OPEN.
2. Profile bio — RESOLVED: pass 2 confirms "The official account of @NFL". The pass-1 rendering ("The official account of @NFL Next Gen Stats.") was a logged-out vs logged-in rendering difference.
3. Josh Allen graphic: CPOE 55.3% vs post text "Detroit blitzed Allen on 55.3% of dropbacks" — STILL OPEN (likely transcription error).
4. April 25–27 2026 draft graphics — partially resolved: Apr 23–24 picks fully transcribed (see post-inventory-continuation-2026-09-21.md). Apr 27 projected big board (~100 names) still not fully transcribed — do not use until a dedicated pass.

## Resume points for profile inventory
- Posts: covered Sep 20 2026 → Mar 9 2026 (80 posts Apr 24 → Mar 9 in continuation pass). Resume: Mar 8, 2026 and earlier (free agency → combine → Jan playoffs → 2025 season → ... → Oct 2018, 11.2K posts total).
- Replies: not yet covered systematically (self-replies with methodology are the priority).
- Graphic formats G1–G5 documented. Continue with same verbatim-text + graphic + engagement format.
