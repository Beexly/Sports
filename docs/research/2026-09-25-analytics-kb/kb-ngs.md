# 3. Next Gen Stats Digest

# Next Gen Stats (NGS) — Metrics & Methodology Digest

**Source profile:** @NextGenStats — "The official account of @NFL" | pro.nfl.com | joined Oct 2018 | 292K followers | 11.2K posts
**Compiled:** 2026-09-21 research passes (profile + methodology backend); digest written 2026-09-24
**Repo sources (read-only):** `docs/research/2026-09-21/nextgenstats-profile/` (metric-glossary, post-inventory-2026-09-21, post-inventory-continuation-2026-09-21, post-inventory-continuation-QC-2026-09-21, ngs-methodology-backend-2026-09-21, ngs-implementation-playbook-2026-09-21, notes/nextgenstats.md) and `docs/research/2026-09-18-ngs-replacement-spec.md`
**Standing constraint:** NGS data is proprietary NFL tracking data (Zebra RFID). Do not copy or republish their numbers as first-party data. Replicate via public proxies: nflverse `load_nextgen_stats()`, Kaggle Big Data Bowl tracking sets, FTN charting.

**Attribution convention in this file:** "as published" = NGS-published description (nfl.com intro articles, amazon.science, AWS blogs, nflreadr data dictionary). "Inferred from usage" = derived only from post text/graphics; no graphic in either pass printed an explicit metric definition or methodology footnote (legends define visual encodings only). "No formula" = formula not published publicly.

---

## 1. Coverage summary — post inventories

- **Pass 1 — 48 posts, Sep 20, 2026 → Apr 25, 2026.** Read-only logged-out X view; no likes, reposts, replies, follows, DMs; no CAPTCHA, no login wall. Times exact where the photo-viewer sidebar showed them; engagement recorded as replies/reposts/likes/views. Only the Posts timeline was covered — the Replies tab was not systematically inventoried. Three Apr-25 draft graphics and three Apr-25 draft posts were observed but not fully transcribed.
- **Pass 2 / continuation — 80 posts, Apr 24, 2026 → Mar 9, 2026.** Picks up where pass 1 ended: no gap, no overlap. Method: read-only, no sign-in, no engagement, no CAPTCHA. All 80 were original NGS posts (most quote-tweeting RapSheet/Pelissero/Garafolo/Wolfe/AroundTheNFL/@NFL news with NGS stat commentary); no pure retweets without added NGS content encountered. NGS-authored commentary recorded verbatim; quoted news copy abbreviated in parentheses where X truncated it.
- **Total: 128 posts, Sep 20, 2026 → Mar 9, 2026.** Curated pass-2 file verified faithful to the recovered full browser-source report (dates, NGS-authored text, graphic classifications, engagement match; see §8).
- **Resume point: Mar 8, 2026 and earlier** (free-agency signing-reaction season → Feb combine → Jan playoffs → 2025 season → … → Oct 2018). A follow-up pass was already running at the time of the pass-2 QC.
- **Replies tab: not yet systematically covered.** Self-replies with methodology content are the priority for a dedicated pass. Example noted in pass 1: a self-reply in the JSN thread ("Smith-Njigba reached 19.70 mph, the fastest speed by a ball carrier in the game") appears in conversation/Replies, not the Posts timeline.
- **Graphic formats documented:**
  - Pass 1: Pass Chart, Carry Chart, Route Chart, Pass Rush Chart (all with LOS line of scrimmage and stat boxes); one coverage comparison table; AWS/NFL Draft infographics (NFL IQ, powered by AWS); 32-team "Projected First-Round Big Boards" infographic.
  - Pass 2: G1 draft prospect card (photo + PRODUCTION/ATHLETICISM bars + OVERALL gauge + scale legend 50/60/70/80/90/100 labeled AVG/AVERAGE/GOOD/ELITE); G2 top-5 leaderboard; G3 free-agency signing stat graphic (photo + Top-5 table + footnote); G4 NFL IQ promo cards; G5 AWS explainer videos (Expected Points Models 2:42; coverage classification 1:57). NGS STATS logo + green diagonal accent on all.
- **Narrative patterns (content conventions, not data):** every stat ships with a historical anchor ("most since at least 2018/2016", "first in NFL history", "Nth player since last season"); explicit minimum-qualifier discipline in pass 2 (min. snaps/rushes/targets/attempts); situational splits carry the insight (blitz vs not, under center, on/off field, man vs zone, by coverage defender); video posts pair one tracking number (top speed, YAC over expected) with the clip; quote-tweet commentary on @NFLPlus/@NFL_Researcher/@RapSheet extends reach without new graphics; pro.nfl.com and NFL Pro are the recurring product surfaces; NFL IQ (powered by AWS) is the draft-season surface.

---

## 2. NGS metric catalog

### 2a. Passing

1. **Completion Probability**
   - As published (nfl.com, Sep 21, 2018): "measured using more than 10 different in-play factors collected by Next Gen Stats player-tracking devices." Named inputs: pass air distance (from QB to receiver), air yards, distance between receiver and nearest defender, distance between QB and nearest pass rusher, speed of QB at throw, "among several other metrics."
   - Six publicly named factors with measured relationships: Air Distance; Target Separation (distance to nearest defender); Sideline Separation; Pass Rush Separation (QB-to-nearest-rusher distance); Passer Speed; Time to Throw. Only ~6 of 10+ factors named publicly.
   - Model: XGBoost hosted on Amazon SageMaker (amazon.science, Feb 2026 — "blended the factors that shape a throw's outcome, from quarterback pressure to throw depth, receiver separation, and sideline proximity"). AWS 2021 article: "factors in 10 on-field measurements ... and outputs the (league-average) likelihood of completing a pass under those conditions."
   - Training: 36,000+ pass attempts back to 2016; validated on a random 10% holdout; actual completion % vs completion probability correlation r² = 0.98. Hyperparameters, full feature list, and calibration not published.

2. **CPOE (Completion Percentage Over Expected)**
   - As published (nflreadr data dictionary, verbatim): `expected_completion_percentage` = "Using a passer's Completion Probability on every play, determine what a passer's completion percentage is expected to be"; `completion_percentage_above_expectation` = "A passer's actual completion percentage compared to their Expected Completion Percentage."
   - Post applications: Brock Purdy +16.7% (10/10 downfield attempts for 206 yds, 2 TD; highest by a 49ers QB in a game since at least 2018, min. 20 attempts); Jaxson Dart +10.9% (23/29, 230, 3-0). Josh Allen 55.3% attribution is an open discrepancy — see §8.

3. **EPA per dropback**
   - Inferred from usage. Post values: Patrick Mahomes +0.25 (32/47, 382 yds, 3-0); Malik Willis +0.38 (2024–25, most in NFL, min. 100 dropbacks; 23/31 on attempts over 10 air yards for 655 yds, 2 TD, 0 INT).

4. **QB Passing Score**
   - As published (Amazon Science, Aug 2022, Aubet & Ehrlich). Data: updates every 100 ms from RFID chips in shoulder pads.
   - Features per timestep: x/y position, x/y speed, x/y acceleration, direction, body orientation per player → matrix of 176 columns (22 players × 8 features) × variable rows (snap to QB release; e.g., 40 rows for a 4-second throw). Engineered extras (e.g., number of defenders within a 2-yard radius of target receiver). Static play attributes: down, score, games remaining in season.
   - Model: TCN encodes each player's time series (handles variable length and long-range temporal relations); concatenated with static features → MLP → spliced binned-Pareto distribution (SBP): discrete binned base distribution capturing asymmetry/multimodality, with lower tail below the 5th quantile and upper tail above the 95th quantile replaced by weighted generalized Pareto distributions from extreme-value theory; parameterized by the network.
   - Play score = rank (0–1) of actual yards gained in that play's predictive CDF, standardized; aggregated over plays (e.g., Kyler Murray 87 for the 2021 season, 9th of playoff QBs; 99 under pressure on 2.5–4s throws).
   - Training: ~50,000 passing plays from 2018–2020 (34,000 completions, 15,000 incompletes, 1,200 interceptions); ~8 hours on a 1-GPU p3.8xlarge; preprocessing 2 hours on ml.m5.m24xlarge; inference 0.001 s/play. AWS released PyTorch SBP code + demo notebook. Score correlates better with win/playoff % than prior QB metrics.

5. **Time to throw (average)** — nflreadr verbatim: snap to release, in seconds. nflverse field `avg_time_to_throw`. Verified live values (2026-07-03 test pins): two QBs at 9.1 average intended air yards read 2.799s and 2.970s.

6. **Aggressiveness** — nflreadr verbatim: throws into tight windows.

7. **Air yards family**
   - nflverse fields: `avg_intended_air_yards`, `avg_completed_air_yards`, `avg_air_yards_to_sticks`.
   - Air yards per target: Alec Pierce 16.9 (league-high, last four seasons, min. 150 targets); also 5th-most deep receiving yards since 2022 (1,373).
   - Air distance on TD receptions: Rashid Shaheed 45.8-yard average (most in NGS era, min. 10 TD receptions); Shaheed also scored a league-high 4 special teams TDs since 2022.
   - Career air-distance records: Justin Jefferson 57.2-yard air distance on a 39-yard TD (career-long); Brock Purdy's 39-yard TD to Demarcus Robinson traveled 44 yards vs LOS (Purdy's career-long by air yards).

### 2b. Rushing

8. **Expected Rushing Yards (xRY)**
   - As published (nfl.com, Jul 20, 2020): "How many rushing yards is a ball-carrier expected to gain on a given carry based on the relative location, speed and direction of blockers and defenders?"
   - Model: 2D convolutional neural network by Philipp Singer & Dmitry Gordeev ("The Zoo"), winners of the 2020 Big Data Bowl (2,000+ entrants, $75K prizes), scored with continuous rank probability score (CRPS).
   - Inputs: only five vector features for all 22 players evaluated at the moment of handoff — X, Y, S (speed), A (acceleration), Dir (direction).
   - Outputs a probability distribution over rushing outcomes (not a point estimate); xRY = sum of (outcome × probability). Also yields First Down Probability ("the likelihood a ball-carrier will gain at least enough yards for a first down from the moment of handoff") and Touchdown Probability ("the likelihood a ball-carrier will score a touchdown at the moment of handoff"). NGS implemented the architecture in Amazon SageMaker.
   - Example given: Nick Chubb 88-yd TD — xRY 7 (7.3), RYOE +81, TD probability <0.1%.

9. **RYOE (Rushing Yards Over Expected)**
   - As published: "The difference between actual rushing yards and expected rushing yards on an individual play or series of plays." RYOE/Att = per rush attempt.
   - Post applications: Kenneth Walker +101 vs Broncos (most by a Chiefs RB since at least 2018); Jahmyr Gibbs +21 vs Saints; Rico Dowdle +189 (Week 5 → end of 2025, 6th-most).

10. **ROE (Rush % Over Expected)** — as published: "The percentage of runs where a ball-carrier gained more yards than expected."

11. **Missed tackles forced (MTF)**
    - Inferred from usage (from the tackle-probability pipeline, §2e.42).
    - Post applications: Walker 15 vs Colts (career high; 3rd instance of 14+ since 2024 while the rest of the NFL did it twice total); Walker 14 vs Broncos (most by any Chiefs player in a game since 2020); Gibbs 12 vs Saints (career high); Tyler Allgeier forced missed tackles on 30.1% of carries since 2022 (4th-highest, min. 400 carries; one of 11 players with 200+ forced on rushes); Super Bowl MVP Kenneth Walker forced a missed tackle on 30.2% of touches in 2025 (3rd-highest, min. 150 touches; ranked top 12 every season since 2022).

12. **Success rate**
    - As published: the expected-points model is "the underlying model behind widely used metrics like EPA and success rate" (AWS explainer video 2:42, Apr 2, 2026).
    - Post application: Josh Allen 78.6% success rate (carry chart, 14/69/2 vs Lions).

13. **Average speed on carries / at LOS**
    - Inferred from usage: Keaton Mitchell 14.49 mph average speed on carries (1+ mph faster than any other RB, min. 50 carries); 12.14 mph at LOS.

14. **Scramble EPA**
    - Inferred from usage: Kyler Murray 4th-most scramble EPA since 2019; 1,993 scramble rush yards (4th).

15. **Run rate of player's snaps**
    - Inferred from usage: Patrick Ricard 76.4% (2nd-highest in NFL); Reggie Gilliam 78.1% (highest, 200+ snaps).

### 2c. Receiving

16. **Expected Yards After Catch (XYAC) / YAC over expected**
    - As published (nflreadr, verbatim): `avg_expected_yac` = "Average expected yards after catch, based on numerous factors using tracking data such as how open the receiver is, how fast they're traveling, how many defenders/blockers are in space, etc"; `avg_yac_above_expectation` = "A receiver's YAC compared to their Expected YAC."
    - Original 2018 model superseded by the same modeling structure as the xRY 2D-CNN (per the 2020 xRY article). No equation or full feature list published.
    - Post applications: Travis Kelce +32 (54 YAC on 59-yard reception, his most since Week 16, 2016); Zay Flowers +33 (48 YAC on 54-yard TD; ranks 5th among WRs in YAC since 2025 with 567); Jaxon Smith-Njigba +35 (41 YAC on 45-yard game-tying TD); Kenneth Gainwell 548 YAC (5th among RBs with 150+ routes, 2025).

17. **RECYOE (Receiving Yards Over Expected)** — inferred from usage. Post application: JSN +46 (route chart, 11 targets-8 receptions, 122 yds, TD vs Patriots).

18. **Target separation (yards)** — inferred from usage. Cooper Kupp 1.0 yard on a 24-yard reception (19.8% completion probability, 3rd-most-improbable of his career; air distance 39.0 yards).

19. **Average cushion** — nflreadr: `avg_cushion` — how far off the defender lines up at the snap (receiving).

20. **Average separation** — nflreadr: `avg_separation` — receiver separation at the catch point (receiving).

21. **Catch percentage / intended air-yards share** — nflverse fields `catch_pct` (conversion) and `pct_share_intended_air_yards` (target share of air yards).

22. **Vertical receptions** — inferred from usage. Jaylen Waddle 21 (T-2nd in NFL, 2025; 481 yds, 3 TD); Waddle and Courtland Sutton two of five players with 20+ vertical receptions.

23. **Receptions vs split-safety** — inferred from usage. Michael Pittman Jr. 40 (T-4th among WRs, 2025); Steelers faced split-safety at the 7th-highest rate in the NFL (45.9%).

24. **Isolated alignment TDs** — inferred from usage. Mike Evans 13 since 2023 (tied-most with Ja'Marr Chase despite missing 12 games); 39 since 2016 (15 more than any other player); Romeo Doubs 4 in 2025 (T-2nd among WRs).

25. **Target rate (RB)** — inferred from usage. Kenneth Gainwell 27.2% (highest among RBs with 150+ routes, 2025); also 4th-most catches (73) and 5th-most YAC (548) among that group.

26. **Slot receiving yards** — inferred from usage. Wan'Dale Robinson 622 receiving yards from the slot in 2025 (2nd-most in NFL, most among WRs).

### 2d. Pass rush / blocking

27. **Pressure**
    - As published (nfl.com, Sep 21, 2023): "A pass rush becomes a pressure when pressure probability exceeds 75 percent." ("Defined as a pass-rush play where the rusher affects the quarterback before the pass is thrown.")
    - Three ML models: (1) "graphic neural network model (GNN)" discerning which players are blocking vs running routes and which defenders are rushing vs dropping into coverage, in real time; (2) random forest gauging each defender's pressure likelihood in tenths of a second, plus a team composite and separate per-rusher models; (3) blocking-matchup model identifying "who blocked who." Fully automated in the NGS pipeline; history for every pass play since 2018.
    - Old logic it replaced: "Any pass attempt or sack where a defender was within 2 yards of the QB at pass forward or within 1.5 yards of the QB at any point during the play counted as a pressure."
    - Whitepaper: "Feeling the Pressure: A Unified Framework for Automating Pass Rushing Statistics in NFL Games" (Hong, Kulowski, Volk, Wang, Abdoo, McQuiston, Jung, Band, Socolinsky), MIT Sloan Sports Analytics Conference, 25-page PDF.

28. **Pressure rate**
    - As published: total pressures / total pass-rush snaps; average rusher 10.3%.
    - Post applications: Lukas Van Ness 30.0% (9/30, highest by a Packers defender in a game since Rashan Gary Week 11, 2023, min. 20 rushes); Blake Cashman 44.4% (8/18); Trey Hendrickson 30.8% (8/26); Arnold Ebiketie 18.4% (3rd-highest among edges Week 6 post-bye → end of 2025, min. 125 rushes); Al-Quadin Muhammad 5th-highest in NFL 2025 (min. 250); Boye Mafe 13.2% (higher than any other Bengals roster member with 150+ rushes in 2025, up every season); Odafe Oweh 17.3% after joining Chargers Week 6 2025 (min. 200); John Franklin-Myers 11.8% among DTs 2024–25 (min. 500); Jaelan Phillips 54 pressures Week 5 → end of 2025 (6th in NFL); Cowboys four-man rush 10.0% pressure rate vs Dart (lowest since Week 15, 2021).

29. **Quick pressure**
    - As published: within first 2.5 seconds — the only threshold NGS states outright (confirmed repeatedly in posts: Cashman "seven quick pressures (under 2.5 seconds)"; Strnad "quick pressure (<2.5 seconds)"; Edwards "four quick pressures (under 2.5 seconds)").
    - Post applications: Cashman 7 (most by an off-ball LB in a game since at least 2018); Garrett 218 over last five seasons (most in NFL); Hargrave 2nd-highest quick pressure rate among DTs since 2023 (min. 500 rushes; top 5 in both full seasons 2023 and 2025); Strnad 13.9% in 2025 (4th among LBs, 50+ rushes); Singleton 15.9% (led LBs); Oweh 12 after joining Chargers Week 6 2025.

30. **Time to pressure**
    - As published: time from snap to first moment of pressure; average 2.9s.
    - Post application: Cashman averaged 1.88 seconds to pressure across 8 pressures.

31. **Pressure time** — as published: total duration with pressure probability over the 75% threshold.

32. **Pressure probability at snap / average / peak**
    - As published: PP at snap = "estimated probability of generating a pressure... based on the alignment and relative locations of each pass rusher and blocker"; average PP = average over the dropback; peak PP = maximum value.

33. **Pressure rate over expected** — as published: "the difference between average pressure probability and probability at snap." Positive/negative rushes = avg PP above/below PP at snap; positive rush rate avg 54%; net positive rushes = difference of counts.

34. **Get-off (seconds)** — inferred from usage: time from snap to first pass-rush movement. Post values: Van Ness 0.70s; Hendrickson 0.69s. No formula.

35. **Pressures when double teamed** — inferred from usage. Osa Odighizuwa 32 since start of 2024 (2nd; 9.1% rate when doubled, 3rd, min. 200 double teams); Jonathan Allen 64 since 2021 (5th; 12 when doubled in 2025, T-9th); Kobie Turner 36 (2024–25 G2 leaderboard leader); Vita Vea 29, Leonard Williams 28, Jeffery Simmons 26 (rest of 2024–25 top 5).

36. **Quick pressures (career counts)** — inferred from usage. Myles Garrett 218 over last five seasons (most in NFL); 83 sacks over five seasons; faced a league-high 139 chip blocks in 2025.

37. **Time to pressure allowed (OL)** — inferred from usage. Tyler Linderbaum 3.64s (2nd-longest among centers, min. 250 pass blocks; best of his career); Linderbaum blocked 1-on-1 on 49.7% of pass blocks (highest at position).

38. **Quick pressure rate allowed (OL)** — inferred from usage. David Edwards four quick pressures in 2025 = 0.7% rate (3rd-lowest among LGs, 300+ pass blocks; only Thuney and Nelson lower).

39. **Pressure rate allowed (OL)** — inferred from usage. Isaac Seumalo 3.7% in 2025 (lowest among all guards, min. 250 pass blocks; only three centers lower); Alijah Vera-Tucker 4.3% in 2024 (3rd-lowest among RGs, min. 250 pass blocks).

40. **Sack rate (pass rusher)** — inferred from usage. Nakobe Dean: highest in the NFL since start of 2024 (min. 80 rushes); 14.8% in 2025 (led league, min. 25 rushes); 40.7% QBP rate 2nd-highest. Al-Quadin Muhammad 3.4% in 2025 (7th, min. 250 rushes). Wording on the Dean post is flagged — see §8.

41. **Blitz rate** — inferred from usage: % of dropbacks blitzed. Post applications: Lions 55.3% vs Allen (highest under DC Kelvin Sheppard); Vikings 78.3% vs Love (4th-highest in a game since at least 2018); Cashman 40.9% (pass rush chart). The 55.3% figure is an open discrepancy vs CPOE — see §8.

### 2e. Tackling / run defense

42. **Tackle probability**
    - As published (amazon.science, Feb 2026): "Tackle probability estimates the likelihood of a defender completing a tackle at the moment of contact, factoring in speed, angle, distance, leverage, and pursuit. That data allows NGS to identify true tackle opportunities, quantify missed tackles, and calculate the yards a defender saves or concedes."
    - Pipeline (AWS blog, Sep 10, 2024, quoting Abdoo/Band): >2 million data points; computes tackle probability "for every player, during each play, every 10th of a second"; trained on 2018–2022, tested on 2023; 20 features per frame for all 11 defenders (a 10-second play ≈ 20,000 data points); 15 different ML models tested on >1M data points in 4 months; production in <6 months; real-time inference "going through hundreds of thousands of data points every second, millions per game" — "compute all those metrics, feed them into a model, have the model compute a time series probability, output that, and create derivative metrics from that all in seconds." Play-level (frame-level) labeling. Fusing tackle probability + expected yards models yields "tackle yards saved."
    - Derived metrics named: missed tackles by defender; tackle efficiency (% of attempts resulting in successful tackle); missed tackles forced by ball carrier; group tackles; number of players in group tackle; open-field tackle attempts; tackled out of bounds; primary tackler; downhill/upfield/chase-down tackle attempts; missed-tackle yards lost; tackle yards saved; yards gained in group tackle. Winning model type undisclosed; 20 features named by count only.

43. **Missed tackle rate (LB)** — inferred from usage. Leo Chenal 5.2% (lowest among LBs since 2023, min. 40% snaps at LB, min. 125 attempts; aligned at LB on 45.8% of snaps, on the LOS on 49.1%); Quay Walker 4.5% (3rd-lowest, 100+ attempts); Walker's 28 yards allowed after missed tackles fewest in that group.

44. **Run stops for unsuccessful play / run stuffs** — inferred from usage. David Onyemata 42 (T-7th among DTs, 2025; T-8th in run tackles 53 and run stuffs for loss/no gain 12); Nick Cross 33 (most among safeties; also T-2nd in run stuffs 10 and run tackles 59 at position); Quincy Williams 50 run stuffs for loss/no gain since 2023 (3rd in NFL; top 3 in both 2023 and 2024); Maxx Crosby 24 in 2025 (most by a DL since 2018); Crosby 112 since 2019 (2nd-most, 29 more than any other edge defender).

45. **Yards after missed tackles (team)** — inferred from usage. Broncos missed 28 tackles vs Chiefs, allowing 247 yards after missed tackles (most by any defense in a game since at least 2018; eight defenders missed multiple tackles).

### 2f. Coverage / defensive backs

46. **Coverage classification** — as published (AWS explainer video 1:57, Mar 31, 2026): NGS "classifies every coverage defenders' responsibility and matchups on every dropback." Architecture not published.

47. **Target EPA (DB)** — inferred from usage. Kevin Byard −18.6 (4th-lowest among safeties, 2025; led NFL with 7 INTs, no other player above 5); Jamel Dean −30.1 (lowest among outside CBs); Devin Bush −0.73 EPA per target (fewest of any defender targeted 25+ times); Devin Lloyd 3rd-fewest EPA per target among LBs (min. 40 targets); Lloyd allowed 67.8 passer rating in coverage (3rd-lowest in that group).

48. **Yards per coverage snap** — inferred from usage. Riq Woolen 0.5 in man coverage (fewest among outside CBs); Devin Bush 0.49 (2nd-fewest among LBs, min. 250); Woolen forced a 31.3% completion rate in man (lowest at position).

49. **Cumulative win probability added on interceptions** — inferred from usage. Nahshon Wright 64.3% (2nd among outside CBs, 2025; 5 INTs T-2nd in NFL).

50. **Completion % allowed by alignment / yards per target / passer rating allowed** — inferred from usage. Cordale Flott 42.9% completion as field-side CB (4th-lowest, 20+ targets); Josh Jobe 47.7% (4th-lowest, min. 50 targets) and 4th-fewest yards per target (5.4, among outside CBs, 50+ targets); Jamel Dean 4.7 yards per target (fewest among CBs, min. 50) and 41.3 passer rating allowed (lowest among outside CBs); Coby Bryant 51.4 passer rating allowed (2nd-lowest among safeties, min. 25 targets; 4 INTs T-4th at position).

51. **Coverage matchup tables** — inferred from usage (Gonzalez vs JSN post): per-defender coverage matchups, receptions-targets, yards, TDs, man coverage %. Values: Gonzalez 10 matchups, 0/2, 0 yds, 0 TD, 70% man; all others 18 matchups, 8/9, 122 yds, 1 TD, 11% man; footer "EVERY ONE OF SMITH-NJIGBA'S RECEPTIONS CAME AGAINST ZONE COVERAGE." Note: graphic header printed "2024 SEASON" — appears to be a labeling error given the Sep 2026 game context.

52. **Defender ghosting (trajectory prediction)** — as published (amazon.science, Feb 2021; CNN-LSTM, AWS ML Solutions Lab, lead scientist Lin Lee Cheong): tracking accurate within 6 inches in 99.9% of cases; predicts next 10 positions from 3 input measurements; training-data cleaning rules (trajectories never leave the field; speed never exceeds 12.5 yd/s; measured top speed ~11 yd/s); feature selection via gradient-boosting importance; composite expert-eval metric (distance-diminishment rate to targeted receiver, distance vs max at top NFL speeds, penalty for superhuman speeds; actual avg −0.1036 vs predicted −0.0825). Ghosting is not a public stat — a component of stats under development (e.g., evaluating QB decision-making on hypothetical throws).

53. **Defensive Alerts (broadcast)** — as published (amazon.science, Feb 2026): "Defensive alerts assess defensive alignment and movement before the snap to predict which players are likely to rush. The model uses acceleration patterns and presnap shifts, combines them with situational context such as down, distance, and game state, and then applies generative AI to predict likely rushers, who are highlighted with red circles for viewers." No architecture/equations published.

### 2g. Draft model

54. **NGS Draft Model scores**
    - Inferred from usage: Overall / Production / Athleticism (0–100 scale; legend 50/60/70/80/90/100 = AVG / AVERAGE / GOOD / ELITE) + Raw ATH Score (10.0 scale). "Predictive & raw athleticism models trained against DTs since 2003" (Uar Bernard: Athleticism 96 (1st), Raw ATH 10.0 (1st)).
    - 2026 = "seventh year we've used the Next Gen Stats Draft Model to identify sleepers using data and machine learning."
    - Observed anchors: Sonny Styles PRODUCTION 91 / ATHLETICISM 94 / OVERALL 95 (one of two 2026 prospects at 90+ in all three; other was RB Jeremiyah Love, 3rd-overall pick); Jeremiyah Love Overall 94 (3rd among RBs in NGS database behind Bijan Robinson 96 and Saquon Barkley 96); David Bailey production 98 (3rd among edges over last 10 draft classes behind Chase Young 99, Will Anderson Jr. 99); Colton Hood 84 overall (2nd among CBs; only CB in class top-six in all three categories); Lee Hunter fifth-highest production score among DTs over last five draft classes; Makai Lemon production 91 (3rd-highest among WRs over last five classes); Eagles' five first-rounders since 2023 all made the annual Day 1 value-picks list (Carter 87, Smith 80, Mitchell 90, Campbell 82, Lemon 83); Texans' Day 3 selections averaged 75 overall (highest among teams with 4+ such picks); Bears' class most athletic league-wide at 83 average (76+ for each of first six picks); Jets/Browns/Eagles/Commanders/Cardinals first-seven-pick averages 76+ overall.
    - No formulas published.

### 2h. Special teams

55. **Makes over expected (kicker)** — inferred from usage: FG probability model vs actual. Ka'imi Fairbairn 44/48 in 2025 (3rd-most +6.1); his made FGs totaled a league-high 1,743 yards of distance.

### 2i. Motion / formation / situational

56. **Motion at snap %** — inferred from usage. 49ers 65.6% of plays (highest of Shanahan era); Kyle Juszczyk in motion at snap on 17 of 33 snaps (no other 49er above 5); Alec Ingold 36.9% (led NFL, min. 250 snaps); Ingold's 53.1% overall motion rate (only player over 50%, min. 250); Reggie Gilliam 36.1% (5th, min. 200 snaps).

57. **Under-center splits** — inferred from usage. Walker gained 148 of 173 rushing yards on under-center runs vs Broncos; no other Chiefs RB recorded 120+ such yards in a game since at least 2016.

58. **On/off-field splits** — inferred from usage. Hendrickson on field: Ravens 58.6% pressure rate and 2 sacks; off: 20.0% and 0 sacks. Ravens +0.13 EPA/play with Ricard on field vs −0.09 without.

59. **Route classification** — inferred from usage: Mike Evans' "34 touchdown receptions on go/fade routes since 2018" implies a route taxonomy. Route Classification 2.0 (2026), as published (nfl.com, Sep 7, 2026): "We debuted our original Route Recognition model in 2020. This offseason, we retrained it with a more detailed route tree. We can now separate shallow and deep crossing routes, while also distinguishing fade routes that were previously grouped with go routes. We can more accurately detect what constitutes a screen by accounting for blocker movement and the receiver's route path. What's more, we've added inside and outside release classification to shine more light on a receiver's first few steps off the line." No architecture/features/equations published for v1 or v2.

### 2j. 2026 announced additions (Sep 8 post; Sep 7 nfl.com article)

60. **Run Scheme Classification**
    - As published (verbatim): "Our new run scheme classification model uses a transformer architecture to interpret the spatial and temporal relationships among players throughout a play. The primary output is a label that represents the intended play design (one of 16 labels), with these concepts also being identified as man, zone and gap schemes. The model also adds secondary tags, such as read option, split zone and pitch, and identifies both the intended run gap and the gap the ball-carrier actually hits."
    - Companion models: "Separate companion models identify play-action concepts and each defender's gap responsibility." Built with AWS ProServe. Inputs: player locations captured 10 times/second.
    - No formula, feature list, label enumeration, or accuracy figure published.

61. **Run Blocking Matchups & Metrics**
    - As published (verbatim): "Our new run blocking matchup model identifies each offensive player's blocking assignment, the type of block he executes — a pull, down block or crack block, among others — and when the engagement begins and ends."
    - Derived measurements described: double-team frequency per defender, time to shed a block, defenders disrupting runs without tackle credit, blocks that spring a runner into the open field. No architecture, features, or equations published.

62. **Expected Points Models** — as published (AWS explainer video 2:42, Apr 2, 2026): "move beyond simple yards to evaluate the result of each play based on game situation... the underlying model behind widely used metrics like EPA and success rate."

---

## 3. Notable metric applications per post (condensed: metric + key value)

### 3a. Pass 1 — Sep 20 → Apr 25, 2026 (48 posts)

- Walker forced 15 MTF vs Colts (career high; 3rd 14+ game since 2024; rest of NFL twice total). Carry chart: 24 carries, 117 yds, 0 TD.
- Chiefs are the first team in NFL history with LT+LG+C all earning 90+ PFF pass-blocking grades in the same season.
- Mahomes: 32/47, 382 yds, 3-0; EPA/dropback +0.25; most passing yards since Week 7, 2022. Pass chart.
- Purdy: 10/10 downfield (10+ air yards) for 206 yds, 2 TD; CPOE +16.7% (highest by a 49ers QB in a game since at least 2018, min. 20 attempts). Pass chart: 20/22, 287.
- Lukas Van Ness: career-high 9 pressures, 30.0% pressure rate (highest by a Packers defender since Rashan Gary Week 11, 2023, min. 20 rushes), get-off 0.70s, 1.5 sacks. Pass rush chart: 30 rushes. (Wording on the quick-pressure vs second-half split is unresolved — see §8.)
- Devin Lloyd: 9 tackles, no missed tackles, 1 sack, 2 INTs (incl. pick six); 10th player since last season with 6+ tackles without missing, a sack, and an INT.
- Burrow-to-Chase 32-yard TD: 19th deep TD (20+ air yards) since Chase drafted 2021 — most by any QB-receiver duo.
- Allen vs Lions blitz: 55.3% blitz rate (highest under DC Sheppard); vs blitz 12/17, 137 yds, 2 TD; scrambles 5/49/TD; 4/4 QB sneaks. Pass chart (20/31, 248, 3-0) and carry chart (14/69/2, 78.6% success rate). (55.3% figure is an open discrepancy — see §8.)
- Gibbs: first-half targets all past LOS; accounted for over half of Lions' team air yards (55.3%).
- Walker: +101 RYOE vs Broncos (most by a Chiefs RB since at least 2018); 14 MTF (most by any Chiefs player in a game since 2020). Carry chart: 23/173/TD.
- Walker: 148 of 173 rushing yards on under-center runs; no other Chiefs RB with 120+ such yards in a game since at least 2016.
- Broncos: 28 missed tackles, 247 yards after missed tackles (most allowed by any defense in a game since at least 2018; eight defenders missed multiple).
- Kelce: 54 YAC on 59-yard reception (most since Week 16, 2016); +32 YAC over expected; 16.88 mph top speed.
- Walker: 21.21 mph top speed on 60-yard TD (3rd-fastest of his career; longest Chiefs RB run since Damien Williams Week 17, 2019).
- Walker: 9 first-half MTF (most by a Chiefs RB in any game since 2021).
- Dart: 17/19 for 200 yds, 2 TD vs four or fewer rushers; Cowboys 10.0% pressure rate (lowest since Week 15, 2021). CPOE +10.9%; pass chart final 23/29, 230, 3-0 (post edited after game).
- Cashman: 7 quick pressures (<2.5s, most by an off-ball LB in a game since at least 2018); avg 1.88s to pressure across 8; 44.4% pressure rate; 40.9% blitz rate. Pass rush chart: 18 rushes, 0.5 sacks.
- Vikings blitzed Love on 78.3% of dropbacks (4th-highest in a game since at least 2018); 4 sacks + INT on second-half blitzes.
- Baun: 6 targets → 3 receptions for −2 yards; 1 of 2 defenders since last season with 5+ targets and negative receiving yards allowed (other: Denzel Ward).
- Jefferson: 57.2-yard air distance on 39-yard TD (career-long); first deep TD (20+ air yards) since Week 16, 2024.
- Hendrickson: on field 58.6% pressure rate / 2 sacks; off 20.0% / 0 sacks; 8 pressures across 21 matchups vs Raimann; get-off 0.69s; 30.8% pressure rate. Pass rush chart: 26 rushes.
- Gibbs: 12 MTF (career high); 24 carries on plays with motion (131 yds, 2 TD, six explosives); RYOE +21. Carry chart: 29/156/2.
- Caleb Williams: 20.80 mph top speed on 29-yard TD run (2nd-fastest of his career; longest rushing TD by a Bears QB since at least 2016); 20.35 mph on 9-yard scramble (3rd-fastest by a QB since last season; owns top two; six 20+ mph plays since last season, no other QB above two).
- Flowers: 48 YAC on 54-yard TD; +33 YAC over expected; 567 YAC since 2025 (5th among WRs).
- Sadiq: 20.09 mph on 3-yard TD (fastest play by a Jets TE ball carrier in the NGS era).
- 49ers: 65.6% motion at snap (highest of Shanahan era); Juszczyk in motion at snap 17 of 33 (no other 49er above 5).
- Evans: 34 go/fade TDs since 2018 (7 more than next-closest Davante Adams).
- Purdy to Robinson: 39-yard TD traveled 44 air yards (Purdy's career-long by air yards).
- JSN: all 8 receptions vs zone (122 yds, TD on 8 targets); route chart RECYOE +46 (11-8, 122, TD); 19.70 mph top speed (self-reply; fastest ball carrier in game); +35 YAC over expected and +28.5% WP added on 45-yard TD.
- Gonzalez matchup table: 10 matchups, 0/2, 0 yds, 0 TD, 70% man vs all others 18 matchups, 8/9, 122 yds, 1 TD, 11% man. (Graphic header printed "2024 SEASON" — appears to be a labeling error.)
- Drake Maye: 2 deep-pass INTs in a game (vs 1 all last season); 0-3, 2 INT, 0.0 passer rating on deep passes.
- Kupp: 19.8% completion probability on 24-yard reception (3rd-most-improbable of his career); 39.0-yard air distance; 1.0-yard target separation.
- Sep 8: new 2026 metrics announced (Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0).
- NFL Pro Show launch; Milroe 20.43 mph (would have ranked 3rd among QBs as ball carriers across 2025); job posting; Garrett's 139 chip blocks + 83 sacks / 218 quick pressures over five seasons.
- Draft posts: Eagles' Day-1 value picks (Carter 87, Smith 80, Mitchell 90, Campbell 82, Lemon 83); Texans' Day-3 average 75; 32-team projected first-round big boards (see §8 — not fully transcribed); Bears 83 avg athleticism; Jets/Browns/Eagles/Commanders/Cardinals 76+ avg overall.

### 3b. Pass 2 — Apr 24 → Mar 9, 2026 (80 posts)

- **Draft Model:** Lee Hunter fifth-highest production score among DTs over last five classes; Colton Hood only CB top-six in all three categories (84 overall, 2nd among CBs); Makai Lemon 91 production (3rd among WRs over last five classes); Sonny Styles 91/94/95 (one of two 2026 prospects at 90+ in all three; other: Jeremiyah Love); David Bailey production 98 (3rd among edges over last 10 classes, behind Chase Young 99 and Will Anderson Jr. 99); Uar Bernard Athleticism 96 (1st) / Raw ATH 10.0 (1st) vs DTs since 2003; Jeremiyah Love Overall 94 (3rd among RBs in NGS database, behind Bijan Robinson 96 and Saquon Barkley 96); "seventh year ... to identify sleepers using data and machine learning."
- **Product:** NFL IQ launch features — First-Round Cheat Sheet, 2026 Horizontal Big Board, "Ask NFL IQ" AI assistant (instant data-driven answers on team needs, draft prospects, free agency, NGS Draft Scores); AWS explainer videos on Expected Points Models and coverage classification.
- **Free-agency signing stat nuggets (metric + value):** Ebiketie 18.4% pressure rate (3rd among edges Week 6 post-bye → end of 2025, min. 125); Muhammad 5th-highest pressure rate 2025 (min. 250), 3.4% sack rate (7th); Dean highest sack rate since 2024 (min. 80), 14.8% in 2025, 40.7% QBP rate (see §8 wording flag); Mitchell 14.49 mph avg on carries (min. 50), 12.14 at LOS; Daniel Jones 8.5 YPA vs zone (5th); Odighizuwa 32 double-team pressures since 2024 (2nd), 9.1% rate (3rd, min. 200); Allen 64 double-team pressures since 2021 (5th); Hargrave 2nd-highest quick pressure rate among DTs since 2023 (min. 500); Byard −18.6 target EPA (4th-lowest among safeties); Cross 33 run stops (most among safeties); Chenal 5.2% missed tackle rate (lowest LB since 2023); Elliss 64 pressures since 2024 (15 more than next-closest off-ball LB); Woolen 0.5 yards/coverage snap in man (fewest among outside CBs); Dowdle +189 RYOE (Week 5 → end of 2025, 6th); Wright 64.3% cumulative WPA on INTs (2nd among outside CBs); Doubs +27.6 receiving EPA (19th among WRs); Fairbairn +6.1 makes over expected (44/48); Williams 50 run stuffs since 2023 (3rd); Allgeier 30.1% MTF rate since 2022 (4th, min. 400); Vera-Tucker 4.3% pressure rate allowed (3rd-lowest RG, 2024); Lloyd 3rd-fewest EPA/target among LBs (min. 40 targets); Mafe 13.2% pressure rate; Strnad 13.9% quick pressure rate (4th among LBs, 50+ rushes); Singleton 15.9% (led LBs); Bush 0.49 yards/coverage snap (2nd-fewest among LBs, min. 250), −0.73 EPA/target (fewest of any defender targeted 25+); Seumalo 3.7% pressure rate allowed (lowest among all guards); Shaheed 45.8 avg air yards on TD receptions (most in NGS era, min. 10); Walker 4.5% missed tackle rate (3rd-lowest, 100+ attempts); Flott 42.9% comp as field-side CB (4th-lowest, 20+ targets); Edwards 0.7% quick pressure rate allowed (3rd-lowest among LGs, 300+ blocks); Jobe 47.7% comp allowed (4th-lowest, min. 50), 5.4 yards/target (4th-fewest among outside CBs); Oweh 17.3% pressure rate (Chargers Week 6 → end of 2025, min. 200); Franklin-Myers 11.8% among DTs 2024–25 (min. 500); Evans 13 isolated-alignment TDs since 2023 (tied-most) / 39 since 2016; Gainwell 27.2% target rate (highest among RBs, 150+ routes); Linderbaum 3.64s time to pressure allowed (2nd-longest among centers); Dean 4.7 yards/target (fewest among CBs, min. 50), 41.3 passer rating allowed (lowest among outside CBs), −30.1 target EPA; Onyemata 42 run stops for unsuccessful play (T-7th among DTs); Pittman 40 split-safety receptions (T-4th); Gilliam 78.1% run rate / 36.1% motion rate; Crosby 24 run stuffs (most by DL since 2018), 112 since 2019 (2nd-most); Phillips 54 pressures (Week 5 → end of 2025, 6th in NFL); Bryant 51.4 passer rating allowed (2nd-lowest among safeties, min. 25 targets); Willis +0.38 EPA/dropback 2024–25 (most in NFL, min. 100); Ingold 53.1% motion rate / 36.9% motion at snap (led NFL, min. 250); Walker 30.2% MTF rate 2025 (3rd, min. 150 touches); Pierce 16.9 air yards per target (league-high, last four seasons, min. 150 targets), 1,373 deep receiving yards since 2022 (5th); Waddle 21 vertical receptions (T-2nd, 2025); Ricard 76.4% run rate, Ravens +0.13/−0.09 on/off-field EPA; Murray 4th-most scramble EPA since 2019, 1,993 scramble rush yards (4th); Robinson 622 slot receiving yards (2nd-most in NFL).

---

## 4. How NGS metrics are produced (tracking-data basis)

- **Collection:** RFID chips in every set of shoulder pads + inside the football; 20+ ultrawideband receivers per stadium; launched 2015. Players sampled 10x/second, ball 25x/second; "accurate to a few inches" (2026) / "within six inches in 99.9% of cases" (2021). Club-only data until 2018; league-wide access since 2018. RFID tags also on officials, pylons, sticks, chains.
- **Compute:** AWS official technology provider since 2017; ~300M data points/season (2021 figure); 75+ ML models running on AWS processing data in under a second; results to teams/broadcasters within seconds (2026); 500–1,000 stats produced per play.
- **Named tools:** Amazon SageMaker (build/train/deploy ML models); Amazon QuickSight (real-time interactive visualizations; Combine IQ / Draft IQ experiences); AWS ProServe (2024 tackle model, 2026 run models); Amazon Q Business (internal content ops).
- **Optical pose tracking (2026 season, first full league-wide installation; data internal while validated):** 4K cameras, 16 angles → x,y,z of 29 body parts per player at 60 Hz; on-site AWS servers process within ~700 ms; cloud ML inference <100 ms; capture-to-analysis under 1 second total.

## 5. Public datasets, code, and API inventory (for replication)

- **Kaggle NFL Big Data Bowl (CC BY-NC 4.0):**
  - 2026 (8th annual): predict all 22 players' positions for the first 4 frames after a pass is thrown (200–500 ms ball in air), restricted to passes where the targeted receiver is ≥5 yards from the nearest defender; evaluation = average Euclidean distance. Files include `input_2023_w[01-18].csv` (game_id, play_id, player_to_predict, nfl_id, frame_id, play_direction, absolute_yardline_number, player_height, player_name, player_weight, player_birth_date, player_position, player_side, player_role, x, y, s, a, o, dir, num_frames_output, ball_land_x, ball_land_y), `output_2023_w[01-18].csv` (game_id, play_id, nfl_id, frame_id, x, y), supplementary contextual file (game_id, play_id, expected_points, play_type, yards_to_go, down, yardline_side, yardline_number, quarter, pre-snap scores, week, pass_result, foul fields, off_form, def_form, `pff_play_action`, `pff_run_concept_primary/secondary`, `pff_run_pass_option`, `pff_man_zone`, `pff_motion`), metadata file, and football metadata (frame_id, x, y, z, speed). Analytics competition also requires a write-up (no code needed); prediction competition requires model inference on unseen data.
  - 2024 (tackling theme): weeks 1–9 of the 2022 season; clips from handoff-to-end-of-play or catch-to-end-of-play. `games.csv`, `plays.csv` (ballCarrierId/Name, quarter, down, yardsToGo, yardline fields, passResult, passLength, offenseFormation, defendersInTheBox, passProbability, pre-snap win probabilities, win probability added, expectedPoints/added), `players.csv`, `tackles.csv` (tackle, assist, forcedFumble, pff_missedTackle provided by PFF), `tracking_week_[1-9].csv` per-frame: gameId, playId, nflId (NA = ball), displayName, frameId, time, jerseyNumber, club, playDirection, x (0–120 yd), y (0–53.3 yd), s (speed yd/s), a (accel yd/s²), dis (distance from prior frame), o (orientation deg), dir (motion angle deg), event. Frame windows clipped: designed rushes = 5 frames before snap to 5 after end; scrambles = 5 before crossing LOS; completions = 5 before catch.
  - Earlier themes verified: 2020 = rushing (won by The Zoo → expected rushing yards); 2023 = pressure probability; 2024 = tackling; 2022 = kickoff returns; 2018 inaugural.
- **nflverse aggregates:** nflreadr/nfl_data_py `load_nextgen_stats()` — player-level weekly NGS stats from 2016 (passing/receiving/rushing), current season updated nightly, week 0 = season summary. Full data dictionary at https://nflreadr.nflverse.com/articles/dictionary_nextgen_stats.html (includes avg_time_to_throw, aggressiveness, avg_air_yards_to_sticks, expected_completion_percentage, avg_cushion, avg_separation, avg_expected_yac, avg_yac_above_expectation, efficiency, percent_attempts_gte_eight_defenders, avg_time_to_los, expected_rush_yards, rush_yards_over_expected, rush_yards_over_expected_per_att, rush_pct_over_expected). Data sourced from nextgenstats.nfl.com/stats/{passing,receiving,rushing}, hosted at github.com/nflverse/nflverse-data.
- **Public code:**
  - github.com/SumerSports/SportsTrackingTransformer (third-party, SumerSports — not NFL): transformer operating end-to-end on raw tracking data predicting tackle location; 24 trained models vs "Zoo" 2D-CNN baseline; ADE 4.61 vs 5.78 yards; paper "Attention is All You Need, for Sports Tracking Data" (Ranasaria & Vabishchevich); repo hosts a mirror of the 2024 Big Data Bowl dataset (original removed from Kaggle). 49 stars / 12 forks. Directly relevant because NGS's 2026 run models also use transformer architecture.
  - github.com/imathur1/nfl-big-data-bowl: expected kickoff return yards; 2D CNN on X/Y positions + relative speed/direction features; explicitly inspired by the 2020 1st-place solution (expected rushing yards).
  - Surfaced via search (titles only, not deep-verified): github.com/abhinav314/nflbdb (2019), github.com/Patman17/NFL-Big-Data-Bowl-2020.
  - AWS-released PyTorch code + demo notebook for the spliced binned-Pareto model (NGS passing score), linked from the Aug 2022 Amazon Science article.
- **API endpoint patterns:** pro.nfl.com is a Nuxt.js app; NGS content requires auth (id.nfl.com subscription/paywall — not pursued). nfl.com/next-gen-stats is a server-rendered article hub; no data API in page source. No unauthenticated JSON endpoints found. Known dead ends (per research notes, not retried): api.nfl.com → 401; nextgenstats.nfl.com → 401.
- **Key methodology sources (priority order):** (1) nfl.com intro articles — completion probability (2018), expected rushing yards (2020), pressure probability (2023), new 2026 metrics (Sep 7, 2026); (2) nflreadr NGS data dictionary; (3) amazon.science — "A decade of NFL Next Gen Stats innovation" (Feb 2026), "How AWS scientists help create the NFL's Next Gen Stats" (Feb 2021), "The science behind NFL Next Gen Stats' new passing metric" (Aug 2022, TCN + spliced binned-Pareto for QB passing score); (4) AWS media blog tackle analysis (Sep 10, 2024, Abdoo/Band quotes); (5) Sloan whitepaper "Feeling the Pressure" (Abdoo co-author); (6) Kaggle Big Data Bowl competitions (datasets + schemas); (7) GitHub repos above.
- **Published-calculation gaps (no public description exists):** 16 run-scheme labels not enumerated; run-blocking engagement start/end detection undescribed; Route Classification 2.0/v1 architecture, features, and route-tree taxonomy not published; play-action and defender gap-responsibility companion models only mentioned; CPOE full feature set (~4 of 10+ unnamed), hyperparameters, calibration not published; expected YAC no equation; tackle probability 20 features named by count only, winning model type undisclosed, missed-tackle thresholds "fine-tuned" but undisclosed; Defensive Alerts generative-AI component undescribed; no personal methodology writeups by Keegan Abdoo exist publicly (his content = nfl.com "Introduction to..." articles, AWS blog quotes, Sloan co-authorship); the 2018 original expected-YAC model has no published calculation beyond the dictionary definition.

## 6. NGS replacement-spec plan (2026-09-18 spec; measurements over constants)

The spec targets whoever maintains `agents_website_list/AdvancedDataEnrichment.py`: replace three rule-based enrichers with measured data from the platform's already-persisted `NextGenStat` table (`packages/db/prisma/schema.prisma`, written daily by `apps/web/app/api/cron/refresh-player-stats/route.ts:144-145` through `ingestNextGenStats` for `statType` in passing/receiving/rushing). Grain is **player-week** — unique on `(gsisId, season, week, seasonType, statType)`; every row carries `rightsSnapshot` and `fetchedAt`.

- **Persisted columns (Prisma names):**
  - receiving: `avgCushion` (defender lineup distance at snap), `avgSeparation` (at catch point), `avgYac`, `avgExpectedYac`, `avgYacAboveExpectation`, `catchPct`, `pctShareIntendedAirYards`
  - passing: `avgTimeToThrow` (snap→release, seconds), `avgIntendedAirYards`, `avgCompletedAirYards`, `avgAirYardsToSticks`, `cpoe`, `expectedCompletionPct`, `completionPct`, `aggressiveness` (throws into tight windows)
  - rushing: `avgTimeToLos` (snap→LOS, seconds), `pctAttemptsGte8Defenders` (stacked-box exposure), `rushYardsOverExpected`, `rushYardsOverExpectedPerAtt`, `expectedRushYards`
- **Gap 1 — per-defender route coverage:** replace a 60–95% rule-based recommendation engine with measured `avgCushion` + `avgSeparation` per receiver-week, joined to opponent by schedule; build the defensive side as the opponent aggregate. Must NOT claim assignment: this is exposure, not assignment. Name the feature `coverage_exposure_*`, never `per_defender_*`. The assignment genuinely does not exist in any source the platform holds; inventing a priority grade for it makes every downstream number unverifiable.
- **Gap 2 — time to pressure:** replace heuristic timing profiles (deep 2.5s / short 3.0s / intermediate 4.0s) with measured `avgTimeToThrow` (passer-week) and `avgTimeToLos` (rusher-week), pairing the defensive side with sack-and-hit rate from play-by-play as an explicit FLOOR proxy (hurries absent from nflverse/FTN). Three corrections: (1) scale — verified live values (2026-07-03, two QBs at 9.1 avg intended air yards, intermediate depth) read 2.799s and 2.970s, so 4.0s is 35–43% above the band; (2) ordering — the profile put deep at 2.5s below short at 3.0s, inverted and non-monotone; (3) definition — both are measured from the snap forward, not "seconds before snap". Time to THROW is not time to PRESSURE: name it `time_to_throw_*` and treat the pressure relationship as a hypothesis with its own test.
- **Gap 3 — WR vs CB matchup:** replace a hand-set expertise matrix (e.g., WR-to-CB 95%, WR-to-LB 80%) with the differential between a receiver's `avgSeparation`/`avgCushion` and the opponent defense's allowed aggregate for the same week, plus `pctAttemptsGte8Defenders` for the run side. A differential between player and opponent aggregates is a matchup feature, not an assignment.
- **Governing rule:** a measurement is a number produced by observing the world; a heuristic constant is a number produced by someone's judgement. Substituting the second for the first while keeping the first's name is how a track record stops meaning anything. An absent source is closed by acquiring data, finding a cleared source, or letting the row stay absent — never by a default, heuristic profile, rule-based matrix, or priority weight.
- **Two constraints:** (1) grain is player-week — supports weekly matchup features, not per-play kinematics (frame-level speed/acceleration/separation is the enterprise-only tracking feed); (2) rights — `nextgen_stats` via nflverse is flagged in `reports/rights/pfr-advstats-verdict-2026-07-16.md` as "equally third-party-sourced with no explicit grant, not a safe substitute"; every row carries `rightsSnapshot`, so this is a live founder question, not a data question, and should be answered before anything built on it is served to a customer.
- **Keep as-is:** `UncertaintyQuantification.py` (ensemble, Bayesian, conformal) addresses a real need; note `conformal-calibration.ts:174` correctly returns positive infinity below `minN` 20 rather than clamping, while `apps/web/lib/calibration/cqr.ts:12-15` clamps and is a known defect. A small-sample interval refuses rather than pretending to a coverage it does not have.

## 7. Key implementation details for a coding agent

- **Sampling figures:** player locations captured 10 times/sec (NFL's published figure); Zebra RFID spec — players 10x/sec, ball 25x/sec; ultrawideband triangulation accurate to a few inches (2026) / within 6 inches 99.9% (2021).
- **Published model recipes to mirror:**
  - xRY = 2D CNN ("The Zoo" solution) over five vector features (X, Y, S, A, Dir) for all 22 players at handoff → probability distribution over rushing outcomes, scored with CRPS; xRY = Σ(outcome × probability).
  - Completion probability = XGBoost on 10+ in-play factors (only ~6 named: air distance, target separation, sideline separation, pass rush separation, passer speed, time to throw); 36,000+ attempts back to 2016; r² = 0.98 vs actual completion % on a 10% holdout.
  - Pressure = random-forest per-defender frame-level pressure probability with a 75% threshold; quick pressure = <2.5s; avg rusher pressure rate 10.3%; avg time to pressure 2.9s; pressure rate over expected = avg PP − PP at snap; positive rush rate avg 54%.
  - QB passing score = TCN (176 cols = 22 players × 8 features, variable rows snap→release) + static features → MLP → spliced binned-Pareto output (AWS released PyTorch code + demo notebook).
  - Tackle probability = frame-level every 0.1s for all 11 defenders (~20 features/frame; 20K datapoints per 10-second play); trained 2018–2022, tested 2023; 15 models tested; derivative metrics listed in §2e.42.
  - 2026 run-scheme classification = transformer; 16-label primary output (labels not enumerated) + man/zone/gap grouping + secondary tags (read option, split zone, pitch) + intended vs actual gap. The 2026 Big Data Bowl supplementary file carries `pff_run_concept_primary/secondary`, `pff_man_zone`, `pff_motion` — usable as weak labels.
- **Graphic stat-box conventions to mirror:** header = player / season+opponent / #+position / team; Pass Chart: COMP/ATT, YARDS, TD-INT + CPOE or EPA/dropback; Carry Chart: CARRIES, YARDS, TD + MTF, RYOE, or success rate; Route Chart: TARGETS-REC, YARDS, TD + RECYOE; Pass Rush Chart: PASS RUSHES, PRESSURES (%), SACKS + GET OFF (seconds) or BLITZ RATE.
- **Analytic conventions to mirror:** every metric ships with a minimum qualifier (min. snaps/rushes/targets/attempts) and a historical anchor (since 2018/2021, "in the NGS era (since 2016)", positional peer group); situational splits (blitz vs not, under center, on/off field, man vs zone, per-defender coverage tables); Draft Model taxonomy (Overall/Production/Athleticism 0–100 + Raw ATH 10.0) as the template for prospect scoring.
- **Explicitly do NOT invent:** defender-receiver assignments (label as `coverage_exposure_*`); named-defender priority grades; time-to-pressure from time-to-throw (keep `time_to_throw_*` separate and test the pressure relationship); formulas where NGS published none (see §5 gaps).

## 8. OPEN ITEMS — all UNRESOLVED (do not use or guess)

1. **Lukas Van Ness quick-pressure wording:** the Sep 20 standalone note (`notes/nextgenstats.md`) records five of nine pressures in under 2.5 seconds ("five pressures in under 2.5 seconds, tied for the third-most by a Packers defender since 2020"); the pass-1 inventory recorded five pressures in the second half. Direct post/graphic verification required before use. Do not use either number.
2. **Josh Allen 55.3% conflict:** the pass-1 graphic transcription read `CPOE 55.3%`; post text read "The Lions blitzed Josh Allen on 55.3% of his dropbacks." Likely a transcription error but unverified. Do not use either until directly verified.
3. **Apr 27 projected first-round big board discrepancy:** the Apr 27 2026 post ("2026 NFL IQ Projected First-Round Big Boards" — projecting every team's first-round board based on outcome, player availability, and reliable post-draft reporting) contains ~100+ player names across 32 teams and was not fully transcribed. Do not use until a dedicated pass.
4. **Truncated reports:** (a) Mar 10 Patrick Ricard post truncated behind X's "Show more" expander (tail after "Visit nfl.com/iq for a complete picture of the" not captured in either file); (b) Mar 9 Kenneth Walker III post truncated with stylized-name link and "Show more"; (c) Mar 9 Alec Pierce post truncated ("remainder behind expander," RapSheet quote tail about the contract not captured); (d) three Apr-25 draft graphics and three Apr-25 draft posts observed but not fully transcribed; (e) Apr 15 (no-text link card) and Apr 23 (NFL IQ link) posts with partially displayed engagement (replies/reposts shown as "—"); (f) G3-style graphic stat-box values on most free-agency posts were not individually transcribed (headline stats are in post text; format documented from two screenshots: Daniel Jones card, Osa Odighizuwa card).
5. **Known transcription correction (fix if re-copying):** the continuation file rendered the Mar 9 Mike Evans post as "the **tied** with Ja'Marr Chase" — the source report reads "**tied with**". Name spelling **Uar Bernard** (Apr 3 Nigerian IPP prospect post) is confirmed correct; the playbook draft's "Ugo Bernard" was the error and has been fixed.
6. **Bio rendering (resolved, context recorded):** pass 1 rendered the bio as "The official account of @NFL Next Gen Stats."; pass 2 confirmed the actual bio as "The official account of @NFL". The drafted explanation (logged-in vs logged-out rendering difference) was inferred, never verified, and removed from the finalized playbook.
7. **Nakobe Dean wording:** page text read "the NFL's highest sack since the start of 2024" — almost certainly "highest sack rate" (his 14.8% sack rate in 2025 led the league; 40.7% QBP rate 2nd highest). Transcribed as displayed with "[rate]" flagged in the curated file; treat as unverified wording.

## 9. Continuation notes for future passes

- Resume the @NextGenStats Posts timeline from **Mar 8, 2026 backward** (free-agency signing-reaction season → Feb combine → Jan playoffs → 2025 season → … → Oct 2018; 11.2K posts total).
- The **Replies tab has not been systematically covered** — self-replies with methodology content are the priority for a dedicated pass (example: the JSN-thread self-reply noting 19.70 mph top speed appears in conversation/Replies, not the Posts timeline).
- Keep the format: verbatim NGS-authored text + graphic classification (G1–G5 / chart templates) + engagement counts. Quote-tweeted news copy is summarized, not exhaustively verbatim, where X truncates it — never quote parenthetical summaries as exact post text.
- **Watch list:** the 2026 metric trio (Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0) — announced Sep 8; watch pro.nfl.com and future posts for published outputs to reverse-engineer the taxonomies. Also watch for a public Big Data Bowl draft-model dataset (playbook §10).

## 10. Source attribution map

- §1, §3: `post-inventory-2026-09-21.md`, `post-inventory-continuation-2026-09-21.md`, `post-inventory-continuation-QC-2026-09-21.md`.
- §2 metric definitions: `metric-glossary.md` (usage-inferred definitions) + `ngs-methodology-backend-2026-09-21.md` (published calculation descriptions with source URLs).
- §4, §5, §7: `ngs-methodology-backend-2026-09-21.md` and `ngs-implementation-playbook-2026-09-21.md`.
- §6: `2026-09-18-ngs-replacement-spec.md`.
- §8: `post-inventory-continuation-QC-2026-09-21.md` and `ngs-implementation-playbook-2026-09-21.md` ("Discrepancies — OPEN only"); item 1 additionally from `notes/nextgenstats.md`.


---

