# NGS Implementation Playbook (2026-09-21 — methodology complete)

Date: 2026-09-21. Purpose: turn every Next Gen Stats metric family into a GSE-replicable build: NGS's public definition, documented inputs/features, public calculation description, equations where published, public data/code/API inventory, GSE implementation spec, backtest/validation design, iteration plan, and clearly-labeled gaps.

This supersedes `ngs-implementation-playbook-DRAFT.md` (deleted). Both full browser reports landed: the NGS methodology/backend report (`ngs-methodology-backend-2026-09-21.md`) and the @NextGenStats profile continuation, pass 2 (`post-inventory-continuation-2026-09-21-source.md`, QC in `post-inventory-continuation-QC-2026-09-21.md`). No formulas invented — published equations appear only where actually published.

## Standing NGS facts (already verified)

- Sampling: player location data captured 10 times/sec (NFL's published figure); ball sampled 25x/second; 20+ ultrawideband receivers per stadium; "accurate to a few inches" (2026).
- Quick pressure = under 2.5 seconds (the only threshold NGS states outright — confirmed again in the pass-2 profile report: Justin Strnad "quick pressure (<2.5 seconds)"; David Edwards "four quick pressures (under 2.5 seconds)").
- Pressure = pressure probability exceeding 75% (nfl.com, Sep 21, 2023).
- Tracking data is proprietary (Zebra RFID). Public proxies: NFL Big Data Bowl Kaggle datasets (annual tracking releases), nflverse (nflreadr) play-level aggregates.
- AWS official technology provider since 2017; ~300M data points/season; 75+ ML models on AWS, results in under a second; 500–1,000 stats produced per play.
- Optical pose tracking (2026 season, first full league-wide installation, data internal while validated): 4K cameras, 16 angles → x,y,z of 29 body parts per player at 60 Hz; capture-to-analysis under 1 second.
- Club-only data until 2018; league-wide access since 2018.

## Per-metric build specs

### 1. Completion Probability / CPOE
- **NGS definition:** probability of a pass being completed under given conditions (nfl.com, Sep 21 2018).
- **Public inputs:** "more than 10 different in-play factors collected by Next Gen Stats player-tracking devices. Those inputs include pass air distance (from quarterback to receiver), air yards, the distance between the receiver and the nearest defender, the distance between the quarterback and the nearest pass rusher, the speed of the quarterback at throw, among several other metrics." ~6 of 10+ factors named publicly: air distance, target separation, sideline separation, pass rush separation, passer speed, time to throw.
- **Public model description:** XGBoost ML model hosted on Amazon SageMaker (amazon.science, Feb 2026 — "blended the factors that shape a throw's outcome, from quarterback pressure to throw depth, receiver separation, and sideline proximity"). Trained on 36,000+ pass attempts back to 2016; validated on a random 10% holdout; actual completion % vs completion probability correlation r-squared = 0.98.
- **Published equations:** none. CPOE = actual completion − completion probability.
- **nflreadr data-dictionary definitions (verbatim):** expected_completion_percentage = "Using a passer's Completion Probability on every play, determine what a passer's completion percentage is expected to be"; completion_percentage_above_expectation = "A passer's actual completion percentage compared to their Expected Completion Percentage".
- **Public data/code/API:** Big Data Bowl tracking sets (2026 prediction competition = pass-throw trajectories); nflverse `load_nextgen_stats()` has expected_completion_percentage weekly/player from 2016; community XGBoost reimplementations on Kaggle. No unauthenticated JSON endpoints (api.nfl.com 401; nextgenstats.nfl.com 401).
- **GSE implementation spec:** train XGBoost on nflverse pass-level data using charting-derived features (air yards, separation estimates from FTN charting, time to throw, pressure flags) to replicate completion probability, then CPOE as residual. Calibration target: match NGS's published r² = 0.98 benchmark where we have ground truth from Big Data Bowl play-by-play.
- **Backtest/validation:** holdout 10% of passes; metrics: log-loss, Brier, calibration curve vs NGS's own expected_completion_percentage where available (nflverse, from 2016). Acceptance gate: Brier skill ≥ 0.9 relative to NGS's published r²=0.98-equivalent calibration on the same sample.
- **Iteration:** add Big Data Bowl tracking frames (10 Hz player positions) to move from charting proxies to true tracking features.
- **Gaps:** full feature list (~4 of 10+ unnamed); XGBoost hyperparameters; label/validation-window definition; calibration method.

### 2. Run Scheme Classification (new 2026)
- **Verbatim (NFL Analytics Team, Sep 7 2026):** "Our new run scheme classification model uses a transformer architecture to interpret the spatial and temporal relationships among players throughout a play. The primary output is a label that represents the intended play design (one of 16 labels), with these concepts also being identified as man, zone and gap schemes. The model also adds secondary tags, such as read option, split zone and pitch, and identifies both the intended run gap and the gap the ball-carrier actually hits."
- **Companion models:** play-action concept classifier; per-defender gap responsibility. Built with AWS ProServe.
- **Public data/code:** github.com/SumerSports/SportsTrackingTransformer (third-party, not NFL): transformer operating end-to-end on raw tracking data predicting tackle location; 24 trained models vs "Zoo" 2D-CNN baseline; ADE 4.61 vs 5.78 yards; paper "Attention is All You Need, for Sports Tracking Data" (Ranasaria & Vabishchevich). Directly relevant — the 2026 NGS run models also use transformer architecture. Repo mirrors the 2024 Big Data Bowl dataset.
- **GSE implementation spec:** implement a transformer on Big Data Bowl tracking sequences (2024 set = handoff-to-end clips) with labels from FTN charting / PFF run-concept fields (the 2026 Big Data Bowl supplementary file includes pff_run_concept_primary/secondary, pff_man_zone — usable as weak labels). 16-class head + gap-regression head.
- **Backtest/validation:** train/test split by season (train 2018–2022 analog, test 2023); acceptance gate: beat a charting-heuristic baseline by ≥5 percentage points accuracy.
- **Gaps:** the 16 labels are not enumerated publicly; no feature list, loss, accuracy, or equations published.

### 3. Run Blocking Matchups & Metrics (new 2026)
- **Verbatim:** model "identifies each offensive player's blocking assignment, the type of block he executes — a pull, down block or crack block, among others — and when the engagement begins and ends." Derived: double-team frequency per defender, time to shed a block, defenders disrupting runs without tackle credit, blocks that spring a runner.
- **Observed new metrics:** time to pressure allowed for OL (Linderbaum 3.64s); quick pressure rate for OL (Edwards 0.7%); pressures when double teamed (Turner 36, Odighizuwa 32, Vea 29, Leonard Williams 28, Simmons 26, 2024–25); pressure rate when double teamed (Odighizuwa 9.1%, 3rd, min. 200 double teams).
- **Public data/code:** Big Data Bowl tracking; no public engagement-detection code.
- **GSE implementation spec:** engagement detection as a frame-pair classification problem (blocker–defender relative position/velocity); derive OL time-to-pressure-allowed from pressure-probability framework (see §6) mirrored on nflverse pressure data.
- **Gaps:** model architecture and engagement start/end detection — not described publicly.

### 4. Route Classification 2.0 (2026)
- **Verbatim:** "We debuted our original Route Recognition model in 2020. This offseason, we retrained it with a more detailed route tree. We can now separate shallow and deep crossing routes, while also distinguishing fade routes that were previously grouped with go routes. We can more accurately detect what constitutes a screen by accounting for blocker movement and the receiver's route path. What's more, we've added inside and outside release classification to shine more light on a receiver's first few steps off the line."
- **Public data/code:** Big Data Bowl receiver trajectories; FTN charting route tags as weak labels.
- **GSE implementation spec:** sequence classifier on receiver trajectory (x, y, s, a, dir) + blocker-movement features for screen detection; taxonomy matching NGS's described distinctions (shallow/deep crosser, fade vs go, inside/outside release).
- **Gaps:** no architecture, features, or route-tree taxonomy published for v1 or v2.

### 5. Rushing efficiency: xRY / RYOE / MTF
- **Verbatim definitions (nfl.com, Jul 20, 2020):** xRY — "How many rushing yards is a ball-carrier expected to gain on a given carry based on the relative location, speed and direction of blockers and defenders?" RYOE — "The difference between actual rushing yards and expected rushing yards on an individual play or series of plays." ROE — "The percentage of runs where a ball-carrier gained more yards than expected." First Down Probability and Touchdown Probability — at the moment of handoff.
- **Public model description:** 2D CNN by Philipp Singer & Dmitry Gordeev ("The Zoo"), winners of the 2020 Big Data Bowl (2,000+ entrants, $75K prizes, scored with CRPS). Inputs: only five vector features for all 22 players evaluated at the moment of handoff — X, Y, S (speed), A (acceleration), Dir (direction). Outputs a probability distribution over rushing outcomes; xRY = sum of (outcome × probability). NGS implemented the architecture in Amazon SageMaker. Example: Nick Chubb 88-yd TD — xRY 7 (7.3), RYOE +81, TD probability <0.1%.
- **Public data/code:** 2020 Big Data Bowl rushing theme dataset; imathur1/nfl-big-data-bowl (expected kickoff return yards, 2D CNN inspired by the 2020 winner); nflverse load_nextgen_stats has expected_rush_yards, rush_yards_over_expected, rush_pct_over_expected weekly/player from 2016.
- **GSE implementation spec:** reimplement the 2D-CNN ("Zoo") on Big Data Bowl handoff frames; compare vs the SumerSports transformer baseline (ADE 4.61 vs 5.78).
- **Backtest/validation:** CRPS on holdout season vs NGS's published RYOE where available (nflverse). Acceptance gate: CRPS ≤ published "Zoo" winning score on the 2020 competition set.
- **Gaps:** exact CNN architecture/hyperparameters beyond the 5-feature description; training distribution details.

### 6. Pass rush: pressure probability, pressure rate, get-off, quick pressures, OL metrics
- **Model (nfl.com, Sep 21 2023):** three ML models — (1) GNN discerning which players are blocking vs running routes and which defenders are rushing vs dropping, in real time; (2) random forest gauging each defender's pressure likelihood in tenths of a second, plus separate per-rusher models and a team composite; (3) blocking-matchup model (who blocked who). Fully automated; history for every pass play since 2018.
- **Verbatim derived definitions:** Pressure — "defined as a pass-rush play where the rusher affects the quarterback before the pass is thrown. A pass rush becomes a pressure when pressure probability exceeds 75 percent." Pressure rate = total pressures / total pass-rush snaps (average rusher 10.3%). Time to pressure = time from snap to first moment of pressure (avg 2.9s). Quick pressures = within first 2.5s. Pressure time = total duration with PP over the 75% threshold. Pressure probability at snap = "estimated probability of generating a pressure... based on the alignment and relative locations of each pass rusher and blocker." Average pressure probability = average over the dropback. Pressure rate over expected = "the difference between average pressure probability and probability at snap." Peak pressure probability = maximum value. Positive/negative rushes; positive rush rate (avg 54%); net positive rushes. OL metrics: matchup frequency, pressures allowed, sacks allowed, pressure rate allowed, double teams.
- **Replaced logic:** "Any pass attempt or sack where a defender was within 2 yards of the QB at pass forward or within 1.5 yards of the QB at any point during the play counted as a pressure."
- **Whitepaper:** "Feeling the Pressure: A Unified Framework for Automating Pass Rushing Statistics in NFL Games" — MIT Sloan Sports Analytics Conference (Hong, Kulowski, Volk, Wang, Abdoo, McQuiston, Jung, Band, Socolinsky), 25-page PDF downloadable from the Sloan page.
- **Observed metrics to mirror:** pressures when double teamed; quick pressure rate (defense and OL-allowed); time to pressure allowed (OL); pressure rate allowed by position (Seumalo 3.7% lowest among guards, 2025); get-off (seconds, time from snap to first rush movement — inferred).
- **GSE implementation spec:** reimplement on Big Data Bowl 2023 (pressure theme) tracking: GNN for role classification, gradient-boosted/RF model for frame-level pressure probability, 75% threshold for pressure events, <2.5s quick-pressure split.
- **Backtest/validation:** replicate the 75% pressure rule on the 2023 Big Data Bowl set; acceptance gate: pressure-rate calibration within 2 pp of NGS's published 10.3% average-rusher baseline on matched plays.
- **Gaps:** GNN/RF hyperparameters and feature lists; exact "pressure at snap" formulation.

### 7. Tackling: tackle probability, missed tackles, MTF
- **Model (AWS blog, Sep 10 2024, Abdoo/Band):** >2M data points; frame-level tackle probability for every defender every 10th of a second (~20 features per frame for all 11 defenders; a 10-second play ≈ 20,000 data points); trained 2018–2022, tested 2023; 15 different ML models tested on >1M data points in 4 months; production in <6 months; real-time inference "going through hundreds of thousands of data points every second, millions per game."
- **Definition (amazon.science, Feb 2026, verbatim):** "Tackle probability estimates the likelihood of a defender completing a tackle at the moment of contact, factoring in speed, angle, distance, leverage, and pursuit. That data allows NGS to identify true tackle opportunities, quantify missed tackles, and calculate the yards a defender saves or concedes."
- **Derived metrics named:** missed tackles by defender; tackle efficiency (% of attempts resulting in successful tackle); missed tackles forced by ball carrier; group tackles; players in group tackle; open-field tackle attempts; tackled out of bounds; primary tackler; downhill/upfield/chase-down tackle attempts; missed-tackle yards lost; tackle yards saved (fusing tackle probability + expected yards models); yards gained in group tackle.
- **Observed metrics to mirror:** missed tackle rate (Chenal 5.2%, lowest LB since 2023; Walker 4.5%, 3rd-lowest); MTF on carries (Walker 15 Week 2); forced missed-tackle rate (Walker 30.2%, 3rd-highest; Allgeier 30.1%, 4th-highest); run stuffs (Crosby 24, most by DL since 2018).
- **Public data/code:** 2024 Big Data Bowl (tackling theme; weeks 1–9 2022 tracking, handoff-to-end or catch-to-end clips; tackles.csv with tackle/assist/forcedFumble/PFF missedTackle).
- **GSE implementation spec:** frame-level tackle-probability model on the 2024 Big Data Bowl set; derive missed-tackle and tackle-yards-saved metrics.
- **Backtest/validation:** classify PFF-labeled missed tackles in tackles.csv; acceptance gate: ≥80% recall on missed tackles at a fixed 20% false-positive rate.
- **Gaps:** 20 features named by count only; winning model type undisclosed; missed-tackle thresholds "fine-tuned" but values undisclosed. RFID tags also on officials, pylons, sticks, chains (useful schema note).

### 8. Expected YAC (XYAC)
- **Debuted 2018; superseded by the same modeling structure as the xRY 2D-CNN (2020).** nflreadr definition: avg_expected_yac = "Average expected yards after catch, based on numerous factors using tracking data such as how open the receiver is, how fast they're traveling, how many defenders/blockers are in space, etc." No equation or full feature list published. The 2018 original model has no published calculation beyond the dictionary definition.

### 9. QB Passing Score
- **Data:** updates every 100 ms from RFID chips in shoulder pads. Features per timestep: x/y position, x/y speed, x/y acceleration, direction, body orientation per player → 176-column matrix (22 players × 8) × variable rows (snap to QB release). Extra engineered features (e.g., defenders within a 2-yard radius of target). Static play attributes: down, score, games remaining in season.
- **Model:** temporal convolutional network (TCN) encodes each player's time series (variable length, long-range temporal relations); concatenated with static features → multilayer perceptron producing a probabilistic prediction of yards gained. Output = spliced binned-Pareto (SBP): discrete binned base distribution with lower tail below the 5th quantile and upper tail above the 95th quantile replaced by weighted generalized Pareto distributions from extreme-value theory. Play-level score = rank (0–1) of actual yards gained in that play's predictive CDF, standardized; aggregated over plays (e.g., Kyler Murray 87 for the 2021 season, 9th of playoff QBs; 99 under pressure on 2.5–4s throws).
- **Training:** ~50,000 passing plays from 2018–2020 (34,000 completions, 15,000 incompletes, 1,200 interceptions); ~8 hours on a 1-GPU p3.8xlarge; preprocessing 2 hours on ml.m5.m24xlarge; inference 0.001 s/play. AWS released PyTorch code for the SBP model + demo notebook (linked from the Aug 2022 Amazon Science article by Aubet & Ehrlich). Score correlates better with win/playoff percentage than prior QB metrics.
- **GSE implementation spec:** replicate with the AWS-released SBP code on Big Data Bowl passing plays; use as a QB-stability input to GSE's own QB priors.
- **Gaps:** exact TCN/MLP architecture hyperparameters beyond the description above.

### 10. NGS Draft Model
- **Scores:** Overall / Production / Athleticism (0–100 scale; legend 50/60/70/80/90/100 = AVG / AVERAGE / GOOD / ELITE) + Raw ATH Score (10.0 scale). "Predictive & raw athleticism models trained against DTs since 2003" (Uar Bernard: Athleticism 96 (1st), Raw ATH 10.0 (1st)). Seventh year in use (2026 = "seventh year we've used the Next Gen Stats Draft Model to identify sleepers using data and machine learning"). Observed: Sonny Styles PRODUCTION 91, ATHLETICISM 94, OVERALL 95 (one of two 2026 prospects at 90+ in all three; the other was RB Jeremiyah Love, 3rd-overall pick); Jeremiyah Love Overall 94 (3rd among RBs in NGS database behind Bijan Robinson 96, Saquon Barkley 96); David Bailey production 98 (3rd among edges over last 10 draft classes behind Chase Young 99, Will Anderson Jr. 99); Colton Hood the only CB in 2026 class top-six in all three categories (84 overall, 2nd among CBs).
- **Graphic format G1:** production + athleticism bars, overall gauge, scale legend, NFL Draft logo, "according to NGS Draft Model".
- **GSE implementation spec:** mirror the three-score taxonomy for GSE prospect scoring using combine data (Athleticism), college production (Production), and a blended Overall; calibrate against the published leaderboard anchors.
- **Gaps:** no equations, features, or training labels published. Note: 2026 Big Data Bowl "Draft IQ" experiences are referenced — watch for a public draft-model dataset.

### 11. Coverage / DB / defensive-back metrics
- **Coverage classification:** NGS "classifies every coverage defender's responsibility and matchups on every dropback" (AWS explainer video 1:57, Mar 31 2026).
- **Defender ghosting (component, not a public stat):** CNN-LSTM (AWS ML Solutions Lab, Lin Lee Cheong); tracking accurate within 6 inches in 99.9% of cases; training-data cleaning rules (trajectories never leave the field; speed never exceeds 12.5 yd/s; measured top speed ~11 yd/s); predicts next 10 positions from 3 input measurements.
- **Observed metrics to mirror:** target EPA for DBs (Byard −18.6, 4th-lowest among safeties; Dean −30.1, lowest among outside CBs; Bush −0.73 EPA per target, fewest of any defender targeted 25+); yards per coverage snap (Woolen 0.5 in man, fewest among outside CBs; Bush 0.49, 2nd-fewest among LBs, min. 250); cumulative win probability added on interceptions (Wright 64.3%, 2nd among outside CBs); EPA per target (Lloyd 3rd-fewest among LBs); completion % allowed by alignment (Flott 42.9% as field-side CB, 4th-lowest, 20+ targets); passer rating allowed (Bryant 51.4, 2nd-lowest among safeties; Dean 41.3, lowest among outside CBs).
- **GSE implementation spec:** coverage responsibility from FTN charting + man/zone splits; target EPA and yards-per-coverage-snap computable from nflverse + charting today.
- **Gaps:** NGS's coverage-classification model architecture/equations not published; ghosting trajectories internal.

### 12. Other observed metric families (definitions from usage)
- **Kicker makes over expected:** FG probability model vs actual (Fairbairn 44/48, 3rd-most +6.1; made FGs totaled league-high 1,743 yards of distance).
- **Scramble EPA:** Kyler Murray 4th-most since 2019 (1,993 scramble rush yards, 4th).
- **Average speed:** Keaton Mitchell 14.49 mph on carries (1+ mph faster than any other RB, min. 50 carries); 12.14 mph at LOS.
- **Motion at snap rate:** Ingold 36.9% (led NFL, min. 250 snaps); motion rate overall 53.1%.
- **Run rate of player's snaps:** Ricard 76.4% (2nd-highest); Gilliam 78.1% (highest, 200+ snaps).
- **On/off-field EPA splits:** Ravens +0.13 EPA/play with Ricard on field vs −0.09 without.
- **Air yards per target:** Pierce 16.9 (league-high, last four seasons, min. 150 targets); average air yards on TD receptions (Shaheed 45.8, most in NGS era, min. 10 TD receptions).
- **Run stops / run stuffs:** Onyemata 42 run stops for unsuccessful play (T-7th among DTs); Crosby 24 run stuffs for loss/no gain (most by DL since 2018); Nick Cross 33 run stops resulting in unsuccessful plays (most among safeties).
- **Vertical receptions, split-safety receptions, isolated-alignment TDs, target rate (RB), coverage matchup tables, chip blocks faced, under-center splits** — all documented in the metric glossary.

## Public data/code/API inventory (consolidated)

- **Kaggle Big Data Bowl datasets (CC BY-NC 4.0):** 2026 (predict 22-player positions for 4 frames post-throw; Euclidean-distance eval) at kaggle.com/competitions/nfl-big-data-bowl-2026-analytics and -prediction; 2024 (tackling; weeks 1–9 2022 tracking; games.csv, plays.csv, players.csv, tackles.csv, tracking_week_[1-9].csv schema with gameId/playId/nflId/frameId/x/y/s/a/dis/o/dir/event); 2023 (pressure probability theme); 2022 (kickoff returns); 2020 (rushing theme, won by The Zoo); 2018 inaugural.
- **nflverse:** `load_nextgen_stats()` — player-level weekly NGS stats from 2016 (passing/receiving/rushing), current season updated nightly; full data dictionary at https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html. Data sourced from nextgenstats.nfl.com/stats/{passing,receiving,rushing}, hosted at github.com/nflverse/nflverse-data.
- **GitHub:** SumerSports/SportsTrackingTransformer (transformer on raw tracking, tackle-location prediction, ADE 4.61 vs 5.78 Zoo baseline; mirrors 2024 Big Data Bowl dataset); imathur1/nfl-big-data-bowl (expected kickoff return yards, 2D CNN); AWS-released PyTorch SBP code + demo notebook (via Aug 2022 Amazon Science article).
- **Articles (priority order):** nfl.com intro articles — completion probability (2018), expected rushing yards (2020), pressure probability (2023), new 2026 metrics (Sep 7, 2026); nflreadr NGS data dictionary; amazon.science "A decade of NFL Next Gen Stats innovation" (Feb 2026), "How AWS scientists help create the NFL's Next Gen Stats" (Feb 2021), "The science behind NFL Next Gen Stats' new passing metric" (Aug 2022); AWS media blog tackle analysis (Sep 10, 2024); Sloan whitepaper "Feeling the Pressure".
- **API dead-ends (not retried):** api.nfl.com → 401; nextgenstats.nfl.com → 401. pro.nfl.com is a Nuxt app requiring NFL Pro auth (not pursued). nfl.com/next-gen-stats has no data API in page source.

## Discrepancies — OPEN only

1. **Lukas Van Ness** (pass 1, Sep 20 post): five-of-nine under 2.5s vs five pressures in the second half — STILL OPEN. Do not use either number until directly verified.
2. **Josh Allen** (pass 1): graphic transcription `CPOE 55.3%` vs post text "Detroit blitzed Allen on 55.3% of dropbacks" — STILL OPEN (likely transcription error).
3. **Apr 27 projected big board** (~100 names): not fully transcribed — do not use until a dedicated pass.

(Resolved item: profile bio confirmed as "The official account of @NFL" — pass 2. A previously drafted explanation for the pass-1 rendering difference was removed: the cause was inferred, never verified.)

## Resume points for profile inventory

- **Posts:** covered Sep 20, 2026 → Mar 9, 2026 (48 + 80 posts). Resume: **Mar 8, 2026 and earlier** (free agency → Feb combine → Jan playoffs → 2025 season → … → Oct 2018, 11.2K posts total). A follow-up pass was already running at the time of this writing.
- **Replies:** not yet covered systematically — self-replies with methodology are the priority for a dedicated pass.
- Graphic formats G1–G5 documented. Continue with the same verbatim-text + graphic + engagement format.
