# NFL Advanced Analytics Landscape, v2 — Deep Dive

**Date:** 2026-09-17
**Purpose:** The deeper pass Garrett ordered: 50 more verified X accounts,
method deep-dives on the 10 named targets, the methods literature behind the
metrics, real nflverse numbers computed in our own lab, and the prototype
"GSE Edge Sheet" data product.
**Status:** Research and prototype only. Findings feed the GSE engine
benchmark; nothing here is published or posted.

**Companion files** (full detail, working notes):
- `~/workspace/gse-research/dossier-v2-accounts.md` — all 50 accounts with
  evidence URLs, the 10 method deep-dives, handle-correction log, 50-row
  verification log, unverified list.
- `~/workspace/gse-research/dossier-v2-methods.md` — the 7-topic methods
  literature review with primary sources and verification statuses.
- `~/workspace/gse-research/nfl-2026/` — computed team metrics CSVs
  (2025 full season + 2026 Week 1), `COMPUTATION_NOTES.md`, and the
  computation script.
- `~/workspace/gse-research/edge-sheet/` — the Edge Sheet prototype:
  `build_edge_sheet.py`, `README.md`, sample PNG.

v1 (`2026-09-17-advanced-analytics-landscape.md`) covered 36 verified
accounts and 26 metrics. Everything below is new in v2 and deduplicated
against v1: zero handle overlap.

---

## Part I — 50 additional verified accounts, by lane

Verification bar: exact handle confirmed by a public source on 2026-09-17.
Fourteen handles rest on earlier candidate-pool verification and need a
freshness check before outreach (marked * below). One rests on a single
secondary source (marked **).

### Lane 1 — Advanced efficiency modeling, nflverse-adjacent (7)

1. **@throwthedamball** — Judah Fortgang. Ex-PFF data scientist, current PFF
   betting analyst, SportfolioKings cofounder. Betting analytics and
   model-driven angles.
2. **@statsowar** * — Parker Fleming. Sumer Sports. Mixed-effects modeling
   of EPA attribution (QB, coaching, opponent, supporting cast,
   weather/venue controls).
3. **@ESPN_BillC** * — Bill Connelly. ESPN. Creator of SP+ (tempo- and
   opponent-adjusted efficiency; priors phase out weekly).
4. **@mrcaseb** — Sebastian Carl. nflverse core contributor, nflreadr
   co-author. Data infrastructure for the public ecosystem.
5. **@LeeSharpeNFL** — Lee Sharpe. nflverse contributor; expected-points and
   play-by-play modeling.
6. **@Ben_R_Brown_** — Ben Brown. NFL Data Science Manager for ESPN Bet;
   ex-PFF DFS modeler (site-specific blowup-probability models).
7. **@ericeager_** — Eric Eager. Sumer Sports. Co-authored the Sumer
   linebacker paper (BDUE = Bite Distance Under Expected; GCOE = Ground
   Covered Over Expected).

### Lane 2 — Betting markets and odds analysis (13)

8. **@AnthonyDabbundo** — Anthony Dabbundo. The Ringer (Wise Guys, The Philly
   Special); ex-Action Network. NFL betting analysis.
9. **@iamrahstradamus** — Raheem Palmer. The Ringer, Spotify, FanDuel TV;
   ex-Action Network. NBA/NFL/boxing.
10. **@EvanHAbrams** — Evan Abrams. Action Network Director of Research.
    Betting research, historical trends, bankroll.
11. **@TheHammerHQ** — The Hammer Betting Network (official). Sharp-betting
    content network; Circles Off, Forward Progress.
12. **@RobPizzola** — Rob Pizzola. Host of Circles Off; betstamp cofounder.
    Betting-market educator.
13. **@CirclesOffHQ** — Circles Off (official show). Flagship Hammer show.
14. **@ForwardNFL** — Forward Progress (official). The Hammer's NFL betting
    channel.
15. **@PlusEVAnalytics** — Matt Buchalter. Positive-EV betting analytics.
16. **@gfienberg17** — Geoff Fienberg. The Hammer / Forward Progress creator.
17. **@CircaSports** * — Circa Sports (official). Sharp book; lines, limits,
    market color.
18. **@UnabatedSports** — Unabated (official). Vig-free sharp consensus
    line; best-line comparison, Edge Tool, synthetic hold, +EV/arbitrage
    detection.
19. **@VSiNLive** * — VSiN (official). Numbers-driven betting programming.
20. **@beatingthebook** ** — Gill Alexander. Host of VSiN's "A Numbers
    Game." Single secondary source only; flagged.

### Lane 3 — Salary cap and contract analytics (1)

21. **@Jason_OTC** * — Jason Fitzgerald. Founder of OverTheCap.com.
    Co-creator of the Fitzgerald-Spielberger draft value chart (values draft
    outcomes through later salary outcomes, not Pro Bowls).

### Lane 4 — Fantasy projections and quants (14)

22. **@The_Oddsmaker** — Sean Koerner. FantasyLabs/Action Network
    projections lead; multiple FantasyPros Accuracy awards.
23. **@LateRoundQB** * — JJ Zachariason. LateRoundQB / numberFire.
    Data-driven fantasy, value-based drafting.
24. **@FriscoJosh** * — Josh Hermsmeyer. Air-yards and receiver-usage
    analytics pioneer.
25. **@Tucker_TnL** * — Tucker Boynton. Analytics-forward fantasy content.
26. **@DanPizzuta** — Dan Pizzuta. The 33rd Team; Snaps and Stats.
    Numbers/film hybrid.
27. **@HaydenWinks** — Hayden Winks. Underdog Fantasy. Best-ball analytics,
    roster construction, draft grades.
28. **@JoshNorris** — Josh Norris. Underdog Football Show co-host.
    Combine-athleticism research; draft and fantasy.
29. **@UnderdogFantasy** — Underdog Fantasy (official). Best-ball/DFS
    operator; rankings and analytics articles.
30. **@Underdog__NFL** — Underdog NFL (official). NFL-specific content.
31. **@davecabanff** — Dave Caban. RotoViz co-owner. Range-of-outcomes
    projections, GLSP (Game Level Similarity Projections).
32. **@JohnLaghezza** — John Laghezza. Athlon Sports betting writer; creator
    of the MLB Moving Averages algorithm; ex-FantasyLabs/RotoBaller.
33. **@ChrisAllenFFWX** — Chris Allen. Fantasy Life; ex-Footballguys/4for4.
    Weather-games research (wind-speed pivot points for QB decisions).
34. **@FFNateJahnke** — Nathan Jahnke. PFF Lead Fantasy Analyst and Senior
    Software Engineer. (Handle changed; see correction log.)
35. **@arjunmenon100** — Arjun Menon. Football analytics (Jets analytics
    alum; reported move to USC). Role freshness caveat: confirm current
    employer before quoting bio.

### Lane 5 — RotoViz staff (5)

36. **@AmItheRealBlair** — Blair Andrews. RotoViz managing editor; Fantasy
    Football Report co-host.
37. **@hrr5010** — Hasan Rahim. RotoViz lead writer; Fantasy Football
    Report co-host.
38. **@FF_Contrarian** — Shawn Siegele. RotoViz co-owner; RotoViz Overtime
    co-host. Zero-RB / roster-construction theory.
39. **@OvertimeIreland** — Colm Kelly. RotoViz Radio executive producer;
    RotoViz Overtime co-host.
40. **@RotoVizOvertime** * — RotoViz Overtime (official show account).

### Lane 6 — Draft and scouting analytics (3)

41. **@MoveTheSticks** * — Daniel Jeremiah. NFL Media draft analyst.
42. **@dpbrugler** * — Dane Brugler. The Athletic. "The Beast" draft guide.
43. **@Jordan_Reid** — Jordan Reid. ESPN NFL draft analyst.

### Lane 7 — Film and scheme analytics (1)

44. **@NFL_DougFarrar** — Doug Farrar. Film/scheme analyst (Athlon,
    SB Nation, The Guardian).

### Lane 8 — Official tools and data brands (5)

45. **@FantasyLabs** — FantasyLabs (official). DFS and season-long
    projections; now Action Network's fantasy home.
46. **@FTNFantasy** — FTN Fantasy (official). DVOA's home; Almanac publisher.
47. **@ActionNetworkHQ** — Action Network (official). Betting and fantasy
    content network.
48. **@FantasyPros** — FantasyPros (official). Expert consensus rankings;
    accuracy awards.
49. **@numberFire** * — numberFire (official). Projection models; sports
    analytics media.

### Lane 9 — Independent analytics writing (1)

50. **@EstablishTheRun** — Establish The Run (official). Evidence-based
    fantasy takes plus market analysis; price-dependent player value.

---

## Part II — Method deep-dives: the 10 named targets

Condensed. Full evidence URLs are in `dossier-v2-accounts.md`.

**Ray Carpenter (@csv_enjoyer).** Contribution is data-engineering
infrastructure, not a predictive model: reproducible NFL pipelines with
Docker, dbt, Airflow, Kubernetes, DuckDB over raw nflfastR CSVs
(bronze/silver/gold medallion architecture, dbt data-quality tests).
Engagement angle: pipeline reliability, dbt modeling patterns, nflverse
data-quality issues.

**Ben Baldwin (@benbbaldwin).** Co-founder of RBSDM.com and the nflfastR R
package; author of nfl4th (CRAN, optimal fourth-down decisions). The
@ben_bot_baldwin bot grades every coach's fourth-down call against the
model in near real time. Public track record: teams went for it in toss-up
situations 16.8% (2019) to 26.5% (early 2021); the league moved toward
the model.

**Aaron Schatz (@ASchatzNFL).** Creator of DVOA, now at FTN Fantasy. Every
play vs a league-average baseline for that exact situation (down, distance,
field position); opponent adjustments; fourth-quarter blowouts
downweighted; all fumbles count equally. The 2026 projection system:
offense/defense/special-teams DVOA projected separately via regressions
trained on 2012-2024 data (three-year DVOA, separate QB projection,
regression to mean, personnel/coaching/draft/OL/returning-injury inputs),
run through 50,000 season simulations with a dynamic in-sim adjustment
(+1.5% DVOA to winners, -1.5% to losers). DAVE blends preseason forecast
with observed DVOA; after Week 1 2026 it was 83% forecast for offense, 98%
for defense/special teams. Schatz's honest caveat, quoted: "A few of them
will look strange to you. A few of them look strange to *me*."

**Mike Clay (@MikeClayNFL).** Explicitly non-automated: "a mixture of
statistical calculations and subjective inputs." Team-by-team process
analyzing historical league/team/coach/player trends, then player-level
projected dropback, carry, and target shares (opportunity first, efficiency
second). His projections power the ESPN Fantasy game itself, which means
his numbers set millions of players' priors.

**Keegan Abdoo (@KeeganAbdoo).** Senior Manager of Research and Analytics
at Next Gen Stats. Tracking-data metrics (Pressure Probability from player
tracking), NFL IQ + AWS athletic-score pipeline for prospects. Sits at the
source of the tracking data the public community wishes it had, and
publishes open scraping/cleaning tutorials.

**Seth Walder (@SethWalder).** ESPN analytics writer; public explainer of
Football Power Index. FPI is Bayesian and market-aware: Walder's own
framing says rankings are "based substantially on win totals from Caesars
Sportsbook and strength of schedule." EPA foundation, decomposed by unit;
only the QB position moves the rating (predictive QBR, aging curves,
injury probability); 10,000 season simulations.

**Kevin Cole (@KevinCole___).** Unexpected Points (ex-PFF). Three methods:
adjusted scores (stable metrics emphasized, high-variance events
downweighted, published alongside real scores weekly); Bayesian QB
rankings (multi-season adjusted EPA/play priors blended with current
evidence); Improvement Index (NBA-style plus-minus from EPA-based
on/off-field impact, similar-player smoothing, snap weighting,
injury/coordinator/scheme adjustments; +43 index means ~43 points of
point-differential improvement, ~1.3 wins).

**Warren Sharp (@SharpFootball).** Situational efficiency decomposition:
EPA/play, success rate, explosive-play rate (15+ yards) sliced by down,
quarter, score state, personnel, box count, play-action. Signature: early-down
efficiency isolated from garbage time; box-count-specific run-defense
rankings; play-action usage-vs-efficiency gaps; explosive-pass-defense
schedule adjustments; the first-half-leverage thesis. Annual 350-400-page
preview.

**Rufus Peabody (@RufusPeabody).** Professional bettor, Unabated cofounder,
originator whose action moves lines. Core philosophy: "relying on the
process that generates outcomes rather than the outcomes themselves."
Treats both model AND market as noisy estimates: his bias-index framing
(market -7, model -3, true expected near -5.2) is the cleanest public
articulation of model-vs-market blending. Bets only when the disparity
clears the rake; sizes with the edge. Fumble recoveries random; garbage
time discounted; recency downweighted; weather and opponent controlled.

**Robby Greer (@greerreNFL).** Author of nfelo: FiveThirtyEight's Elo
adapted for the NFL, explicitly regressed toward market spreads. Components:
team Elo (HFA, rest, weather), QB Elo, SRS from win-total futures, and
nfelounits (EPA by unit translated to Elo via EWMA with offseason
regression, combined by an EloTranslator trained to minimize log-loss on
win probability). Open-source code, published CSVs, pip-installable,
third-party tracked on PredictionTracker. The most transparent market+model
blend in public.

---

## Part III — Methods literature: what the papers actually say

Seven topics, primary sources read in full. Anything unverifiable is
labeled UNVERIFIED. Full citations and verification statuses are in
`dossier-v2-methods.md`.

**1. Expected points.** Yurko, Ventura and Horowitz (2018, arXiv
1802.00998): EP is the expected value of the next scoring event in the
half, modeled as multinomial logistic regression over seven outcome
categories, with observation weighting (blowouts and distant-future scores
downweighted) and model selection by LOSO calibration error. Critical
update: current nflfastR `ep_model` is XGBoost, not Yurko's logit. Brill et
al. (2024) warn play-level EP inherits drive-level dependence, selection
bias, and overfitting, and lacks uncertainty estimates. Engine rule:
validate with drive- or game-grouped splits, never random play splits.

**2. CPOE.** Play-level residual (complete minus predicted completion
probability), aggregated as the mean over attempts; current nflfastR
`cp_model` is XGBoost. The original methodology article could not be
fetched; the exact feature set is UNVERIFIED, and the commonly quoted
"throw depth / receiver separation / pressure" feature list could not be
tied to nflfastR from any source read. Engine use: rolling mean CPOE as a
QB/team passing feature, with shrinkage toward zero at low attempt counts.

**3. DVOA / DAVE.** Provider-source details verified from Schatz's 2026
FTN writing: situational baselines, first-down-progress weighting,
opponent adjustments, all-fumbles-equal, DAVE blend weights (83% forecast
offense / 98% defense after Week 1 2026), early-season prior-year
opponent-adjustment splits (50% pass offense / 30% run offense / 20%
defense), and the 2026 projection inputs (three prior DVOA seasons, QB
projection, regression to mean, personnel, coaching, draft, OL age/tenure,
injuries). Full formula and DAVE decay schedule are proprietary and
UNVERIFIED. Engine template: DVOA-inspired EPA/play with iterative
opponent adjustment, DAVE-style preseason-prior blend, heavier prior on
defense.

**4. Fourth-down win probability.** nfl4th: three action submodels (go =
yards-gained distribution plus defensive-penalty first downs; punt =
blocks/return TDs/fumbled returns; FG = distance plus roof type) feeding
an expected-WP comparison; recommends the max-WP action. Documented
limitations: go model excludes turnover returns; punt ignores player
identity; FG ignores kicker identity and outdoor weather. Literature
corrections: selection bias (Daly-Grafstein 2023, Heckman-style);
yardline-rounding inflation of aggressiveness (Lopez 2020); WP policies
understate uncertainty (Brill-Yurko-Wyner 2023). Coaches behave as if
optimizing low quantiles (Sandholtz et al. 2024), so a WP-maximizing model
systematically disagrees with observed coaching. That gap is the edge.

**5. Turnover regression.** The split is occurrence (partially skill) vs
recovery (near-pure noise). Bock (2017, peer-reviewed): gradient-boosted
next-play turnover model, but classification-ranked, not calibrated.
Stuart (1990-2012): year-to-year fumble-recovery correlation 0.00 (own) /
-0.02 (opponent); top-20 recovery teams (75.4%) collapsed to 50.4% the
next year. Burke (2007): recovery ratio not significant for points or
wins. Engine rule: model occurrence separately; regress recovery to ~50%;
count forced fumbles, never recovered fumbles, in team-strength features.
The exact luck/talent split number is THIN (directional only).

**6. Pressure stability.** PFF: pressure-to-sack conversion is not a
repeatable rusher skill (Lorenzo Alexander 26% in 2016 regressed to 14.6%
over 2017-2019 as his pressure rate rose); pressure level vs conversion
"luck" R² < 0.005. STRAIN (tracking paper, 2023): first-half/second-half
stability r = 0.8545; early STRAIN predicts future pressure rate
r = 0.3217 vs 0.0965 for prior pressure rate. Engine rule: model pressure
generation separately from QB-conditioned sack conversion; never
extrapolate sack totals. Non-tracking implementations are proxies.

**7. EPA predictive validity.** No peer-reviewed apples-to-apples
forward-validation was located (the dossier's biggest literature gap).
Provider/analyst evidence: passing efficiency correlates with wins at
0.61/0.59/0.53 across eras vs 0.18/0.19/0.13 for rushing (expected-wins
reproduction repo); defensive passing -0.47/-0.45/-0.49 vs defensive
rushing -0.04. PFF hot-start: offensive EPA first-half to second-half
r = 0.57, defensive EPA allowed r = 0.313; non-scripted EPA (0.51/0.29)
far more stable than scripted (0.26/0.16); EPA variables carried 10x+ the
model importance of scripted splits. Zhou (2026, bootstrapped nflfastR):
success rate r ~ 0.60, passing EPA to future point differential r ~ 0.42.
Engine rules: weight passing EPA and success rate heavily, near-zero on
rushing EPA; use non-scripted EPA only; shrink defensive EPA harder early
(this independently corroborates DAVE's 83%/98% asymmetry).

---

## Part IV — Real numbers: our own lab results

On 2026-09-17 we downloaded nflverse play-by-play and computed team
metrics ourselves rather than quoting anyone's dashboard.

**Samples.** 2025: 48,771 raw plays, 285 games; regular-season filtered
sample 29,239 plays. 2026: Week 1 only, 16 games, 2,756 raw plays;
filtered sample 1,673 plays. (Bills-Lions Week 2 had not been played yet.)

**Filters.** Regular season only; pass/run play types; no kneels or spikes;
garbage time excluded (4th quarter, possession-team WP above 0.95 or below
0.05); overtime retained; success = EPA > 0 (nflfastR convention);
dropback = pass attempt or scramble; explosive = pass gain 15+ yards or
designed rush 10+ yards. EPA from nflverse output, not re-estimated.

**Computed.** Offensive/defensive EPA per play, dropback/rush EPA, success
rate, explosive-play rate, actual-vs-expected INTs and fumbles, defensive
takeaway luck, fumble recovery rates, FTN interception-worthy throws
(2025), QB-hit and sack rates, points per game, approximate points per
drive.

**Sanity checks passed.** 2026 Week 1 unadjusted EPA ranked Jacksonville
first at +0.400, matching FTN's own statement that Jacksonville would
rank first without opponent adjustments. 2025 Dallas showed the intended
turnover-regression use case: +0.135 offensive EPA/play against a 7-9-1
record, with 4.6 fewer defensive INTs than expected.

**Bills vs Lions, 2025 (the Week 2 matchup inputs).**
Buffalo: EPA/play +0.132; dropback +0.174; rush +0.078; defensive EPA/play
+0.032; explosive rate 15.9%; 28.3 points/game. Turnover deltas: INTs
thrown -0.06 vs expected; fumbles lost +1.87; defensive INT takeaways
+4.08. Detroit: EPA/play +0.078; dropback +0.168; rush -0.055; defensive
EPA/play +0.008; explosive rate 14.8%; 28.3 points/game. Turnover deltas:
INTs thrown -2.49; fumbles lost +0.96; defensive INT takeaways +1.53.

**2026 Week 1, one game each (check, not a rating).** Buffalo +0.229
EPA/play (dropback +0.513, rush -0.263). Detroit 0.000 (dropback +0.012,
rush -0.015).

**Unavailable.** True pressure rate (FTN charting has no hurry/pressure
columns; QB-hit and sack rates are lower-bound proxies). FTN 2026
interception-worthy data not yet published. No opponent adjustment or
strength-of-schedule model yet.

---

## Part V — The GSE Edge Sheet (prototype)

Built 2026-09-17 in `~/workspace/gse-research/edge-sheet/`. A 1080x1350
portrait data graphic in FIELD colors (ground/panel/bone/fog/mist/signal):
no gradients, no neon, no AI-slop styling.

**Three panels.** (1) TRUE EFFICIENCY: 2025 EPA splits with a two-line
subtitle stating sample, filters, and source. (2) THE LUCK LAYER:
actual-vs-expected turnovers with LUCKY/NEUTRAL/UNLUCKY tags. (3) THE
READ: an explicitly illustrative fair line vs the market line.

**The honest traps, and how the sheet handles them.**

1. *Fabricated precision.* Every number traces to the CSVs; the script
   reads team rows by key, and game metadata is CLI flags, not hardcoded.
2. *Overclaiming the model.* The fair-line formula is printed on the sheet
   (net EPA/play edge x 63 plays + 2.0 home field, 2025 numbers) and
   labeled "Simple illustration, not the GSE engine." Hardcoded
   assumptions are documented in the README: 63 plays/game, 2.0 home
   field, 2025 season.
3. *Small-sample theater.* The Week 1 line is labeled "small sample, not a
   rating."
4. *Licensing.* Footer credits nflverse (CC-BY 4.0) and FTN charting via
   nflverse (CC-BY-SA 4.0). We use their data with attribution; we do not
   republish their proprietary charts as our own.

**QC verdict.** Publication-grade on inspection: no collisions, consistent
type scale, honest labeling, no banned phrasing. Scores above the 9.2
internal floor. The sheet is a data product, not a pick: it never states
an outcome, only efficiency, luck, and an illustrative price.

---

## Part VI — Verification, corrections, and do-not-use list

**Handle corrections applied in v2.**
- @PFF_NateJahnke is now @FFNateJahnke (Sept 11, 2026 embedded post; PFF
  bio confirms).
- @jlarkytweets is now @JohnLaghezza (Athlon author page).
- @JuMosq was a failed identity claim for Judah Fortgang; the current
  handle is @throwthedamball (his Substack, Sept 2026 YouTube).
- @CirclesOff is now @CirclesOffHQ (official iHeart show notes).
- @DaveCabanFF displays canonically as @davecabanff (same account; X
  handles are case-insensitive).

**Freshness caveats.** ~36 of the 50 accounts had first-party or dated
evidence checked on 2026-09-17. Fourteen rest on earlier candidate-pool
verification and need a freshness check before outreach: @FriscoJosh,
@Jason_OTC, @statsowar, @Tucker_TnL, @ESPN_BillC, @MoveTheSticks,
@dpbrugler, @CircaSports, @LateRoundQB, @mrcaseb, @LeeSharpeNFL,
@VSiNLive, @RotoVizOvertime, @numberFire. @beatingthebook rests on one
secondary source. @arjunmenon100 needs role-freshness confirmation before
quoting his bio.

**Unverified, do not use as current.** @JuMosq (failed claim),
@MattFtheOracle (evidence 2016-2018 only), @_TanHo (no exact X handle
located), @capjack2000 (reported deactivated 2023), @PFF_Brad, @PFF_Mike,
@TampaBayTre, @RotoVizRadio, @BetTheProcess, @jeffma (all stale, not
refreshed 2026-09-17), FTN Data official handle (not located),
Ed Miller / Matthew Davidow / Jake Tropea (no exact current handles),
@PinnacleSports (no sufficiently current official confirmation).

**Literature honesty log.** Do not describe current nflfastR `ep_model` as
Yurko's multinomial logit (it is XGBoost). Do not claim nflfastR's CPOE
feature list (methodology article unfetchable). Do not present the full
DVOA formula or DAVE decay schedule (proprietary). Do not quote a precise
luck/talent turnover split (directional only). Do not cite a peer-reviewed
EPA forward-validity study (none located; the evidence is
provider/analyst-grade).

---

## Part VII — Sourcing and licensing rules

1. Read and learn from public analytics; never republish proprietary
   charts (DVOA tables, PFF grades graphics, Next Gen Stats visuals) as
   GSE's own.
2. nflverse data: CC-BY 4.0, attribute. FTN charting via nflverse:
   CC-BY-SA 4.0, attribute and share alike.
3. Any engine implementation of a proprietary method is labeled
   "[method]-inspired," never the method's name.
4. Unverifiable claims stay labeled UNVERIFIED in working files and stay
   out of public copy.
5. Handle identity is verified against a public source before any
   outreach or public mention; freshness caveats above are honored.

---

## What v2 changes for the engine benchmark

1. **Opponent adjustment is the gap.** v1 flagged it; v2 confirms DVOA's
   exact 50/30/20 prior-year splits and DAVE's 83%/98% early blend give us
   citable starting points, but our lab numbers are still raw EPA.
2. **Turnover decomposition is implementable now.** The literature
   (0.00/-0.02 recovery correlations, R² < 0.005 pressure-to-sack luck)
   plus our own actual-vs-expected tables give the engine a concrete
   luck layer: model occurrence, regress recovery to ~50%.
3. **Passing over rushing, quantified.** The 0.53-0.61 vs 0.13-0.19
   correlation gap is the single most actionable number in the dossier
   for feature weighting.
4. **Market-aware modeling is the norm, not a cheat.** FPI leans on market
   win totals; nfelo regresses to market spreads; Peabody blends toward
   the market as a second noisy estimate. The engine should treat the
   market as a feature, not an enemy.
5. **Validation discipline.** Drive- or game-grouped splits for any
   play-level feature work; LOSO calibration for probability models.
