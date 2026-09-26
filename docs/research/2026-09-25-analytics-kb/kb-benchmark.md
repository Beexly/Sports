# 4. Benchmark Extras Digest

# Benchmark Digest — Metrics in Sports Repo AGENTS.md Missing from the Sept 17–24 Sweep Catalog

## Coverage vs report.md — scan summary

**What was scanned.** `~/workspace/vendor/Sports/AGENTS.md` (4,029 lines, repo read-only; no edits made):
- `ADVANCED NFL ANALYTICS LANDSCAPE (2026-09-17)` — full 26-metric table + gap analysis + data-source table (lines 1333–1651)
- `ADVANCED ANALYTICS v2: DEEP PASS (2026-09-17)` — 10 method deep-dives + 7-topic methods-literature traps + lab numbers + Edge Sheet v1 (1652–1800)
- 23 `ENGINE BENCHMARK` blocks (2026-09-17) — SP+, mixed-effects EPA, vig-free consensus, draft-value chart, fantasy methods, barometric pressure, percentile/EPA-distribution conventions, weekly trends, unit matchups, drive-outcome system, down splits, kicker metrics, defensive detail/TFL, special teams, turnover-luck files, player first-downs, QB aggressiveness, rush/pressure proxies, lab script/file inventory, garbage-time correction, script model, props-consensus paths, Edge Sheet v2 (1902–2424)
- X-feed benchmark blocks (2026-09-17) — QB read distribution, composite QB formula, under-center × efficiency, survivor futures, time-to-pressure, EPA/rush by gap, DFS leverage, PFF pos/neg play rates (2424–2601)
- `@GridironInfo_` deep sweep (2026-09-17), round-2/3 full tables (2602–2829)
- `STATRANKINGS.COM DEEP DIVE (2026-09-18)` — proprietary metric names, access tiers (3053–3087)
- X sweeps 2026-09-18 through 2026-09-24 AM — spot-checked only (sections 3087–4029)

**Dedupe result.** ~52 distinct metrics/methods below are NOT in `report.md`'s metric list (Sept 17 foundation dossiers + Sept 18–24 sweeps). Everything already covered in `report.md` (EPA, CPOE, WPA, ANY/A, aDOT, TPRR/YPRR, xFP, FPOE, PROE/PROE+, DVOA, PFF grades, ARBY, Cardio Index, Cost of Drops, Impact Play, Light-Box trilogy, PFF Accuracy Index, Pass Protection Composite, pressure-to-sack rate, quick pressure, Dynasty Usage Lab, NGS glossary, StatRankings CSV dumps, Kalshi/Polymarket APIs, etc.) is **not** repeated here — this file is the delta only.

**Pre-09-17 sections.** The file's earlier sections (calibration, MOVE-37, operations) contain no metric inventory; nothing predating 2026-09-17 was missed.

---

## 1. Ratings and composite metrics

**DAVE** — @ASchatzNFL (FTN), 2026-09-17 landscape.
- Definition (as given): DVOA blended with preseason forecast, decaying weight. Verified FTN Week 1 2026: **83% prior on offense, 98% on defense/ST**. The prior is proprietary; the concept (shrinkage toward a Vegas-anchored prior) is what the section records.
- Note: DVOA's prior-year splits are citable starting points: 50/30/20.

**DYAR** — @ASchatzNFL (FTN), 2026-09-17 landscape.
- Definition (as given): cumulative value above replacement (player DVOA family). Convert to per-play before use in spreads.

**Composite QB ranking formula (@sfdata9ers, Sept 17)** — X post https://x.com/sfdata9ers/status/2100656850999886294. Distinct from the Sept 21 five-metric Allen composite in report.md.
- Formula (as given, explicit): all-32-QB composite = **EPA/Play + Success Rate + CPOE + Air Yards per Reception**.
- Week 1 results: Caleb Williams #1, Trevor Lawrence #2, Jacoby Brissett #3; Bo Nix #31, Cooper Rush #32.
- Author was publicly polling on replacing Air Yds/Rec with Success Rate, Turnover Rate, or ANY/A — formula still being tuned. Same thread carries definitions of CPOE and Pressure-to-Sack Ratio.

**ESPN FPI** — 2026-09-17 landscape (composite-ratings table).
- Definition (as given): predictive margin vs average on a neutral field; EPA/play-based, **Vegas-anchored preseason prior**. v2 detail (@SethWalder): Bayesian and market-aware — "based substantially on win totals from Caesars Sportsbook and strength of schedule." **Only QB moves the rating** (predictive QBR, aging curves, injury probability).
- Caveat: no feed; partially IS the market (limited edge vs close).

**Relative Athletic Score (RAS)** — @MathBomb (Kent Lee Platte), 2026-09-17 landscape.
- Definition (as given): 0–10 historical athletic composite (draft-focused).

**nfelo (composition)** — @greerreNFL, 2026-09-17 v2 deep-dive.
- Definition (as given): FiveThirtyEight Elo for the NFL, explicitly **regressed toward market spreads**: team Elo + QB Elo + SRS from win-total futures + nfelounits. Open source, pip-installable, PredictionTracker-tracked. "The most transparent market+model blend in public."
- Lane-mate: **Weighted EPA** (Greer's own EPA variant).

**SP+** — @ESPN_BillC (Bill Connelly, SP+ creator), 2026-09-17.
- Definition (as given): tempo- and opponent-adjusted, **forward-facing** efficiency; priors phase out weekly; résumé SP+ uses capped margin. (College metric; benchmarked for its forward-facing prior schedule.)

**Mixed-effects EPA attribution** — @statsowar (Parker Fleming, Sumer Sports), 2026-09-17.
- Definition (as given): mixed-effects modeling of EPA separating **QB, coaching, opponent, supporting cast, and weather/venue controls**. Method claims per the dossier; independent verification pending.

**BDUE / GCOE** — @ericeager_ (Sumer), 2026-09-17 v2.
- Definitions (as given): **BDUE = Bite Distance Under Expected**; **GCOE = Ground Covered Over Expected** — linebacker run-flow vs play-action susceptibility.

**GLSP (Game Level Similarity Projections)** — @davecabanff (RotoViz), 2026-09-17.
- Definition (as given): **range-of-outcomes projections from game-level similarity matching**.

**Fitzgerald-Spielberger draft value chart** — @Jason_OTC (Jason Fitzgerald, OverTheCap), 2026-09-17.
- Definition (as given): draft-pick value chart that prices draft slots **by later salary/financial outcomes (second-contract APY)**, not Pro Bowls or games started.

**Improvement Index** — @KevinCole___ (Unexpected Points), 2026-09-17 v2.
- Definition (as given): NBA-style EPA on/off **plus-minus**; +43 index ≈ 1.3 wins. Also: **adjusted scores** (stable metrics weighted, high-variance downweighted); **Bayesian QB rankings**.

**EPA+CPOE composite (canonical weighting)** — 2026-09-17 landscape.
- Definition (as given): QB index. Trap recorded: canonical weighting **UNVERIFIED**; build own weights, don't borrow.

**StatRankings proprietary metric names (2026-09-18 deep dive)** — from statrankings.com/checkout: **Havoc Rate**, **True Target Share**, **1st-Read %** (alongside ARBY, PROE+, xFP). Names only; no formulas published.

---

## 2. Pressure and trench metrics

**ESPN PRWR / PBWR** — @SethWalder, 2026-09-17 landscape.
- Definitions (as given): **pass rush win within 2.5s** / **block sustain 2.5s+**. Proprietary, rankings only. 2026 methodology update supersedes legacy descriptions.
- **RBWR / RSWR** — ESPN run block / run stop win rates. Same sourcing problem; run game matters less than pass game.

**"Pressure rate grade — Blended" (HB Analytics)** — @hawkblogger (Brian Nemhauser, verified), 2026-09-17; "Top 20 Pass Protectors (OT, OG, OC)"; companion Top 20 Pass Rushers (DTs/Edge).
- Definition (as given): grade = pressure-rate movement on a typical rep vs an average blocker facing the same rushers; **wins vs top rushers count more; rusher grades solved simultaneously; double teams handled separately; small samples pulled to average**. Negative = good (presentation quirk). 2026 through Week 1 with 2025 at 83% fading out by Week 6; filters 150+ reps.
- Columns: #, Player, Grade, Trend, Reps, Pressures, Over Exp.
- Representative values: 1) Garrett Bolles −3.1 (777 reps, 37 pressures, −37.5 over exp); 2) Warren McClendon −3.0; 10) Quenton Nelson −2.3; 20) Charles Cross −1.9.
- Stated data source: Sumer Sports play-by-play charting ("charts every dropback player-by-player"). Full method at stats.hawkblogger.com.

**four_man_rush_rate / pressure_proxy_rate (lab)** — Worker, 2026-09-17 (`rush_pressure_2025/2026.csv`).
- Definitions (as given): four_man_rush_rate = share of dropbacks with FTN `n_pass_rushers == 4` (`n_pass_rushers==0` excluded as quirk); **pressure_proxy_rate = (qb_hit OR sack)/dropback — a FLOOR, no hurries in nflverse or FTN**. Sanity-checked vs @GridironInfo_ W1 chart (BUF 64.3%/21.4% vs chart ~65%/~19%; ordinal agreement, proxy runs 2–3 pts high).

**Time-to-pressure leaderboard** — @Doug_Analytics (NOT verified, "NFL Analytics & Graphics"), 2026-09-16; FTN-branded chart.
- Definition (as given): OL/DL/pass-rush timing metric (how fast pressure arrives), weekly leaderboard format. Overlaps report.md's NGS get-off/time-to-pressure values but is a distinct product/source.

---

## 3. Coverage and defense metrics

**"Yards per route grade" (coverage defenders)** — @hawkbledger (Brian Nemhauser, "HB ANALYTICS", verified), 2026-09-17; screenshot `docs/coverage-defenders-week1-2026.png`.
- Definition (as given): yards/route vs average, **opponent-adjusted, blended** — 2026 through Week 1 with 2025 weighted at **83%, fading out by Week 6**. Filters: played in 2026, 150+ reps.
- Columns: GRADE (negative = better), TREND (sign convention UNVERIFIED from screenshot), REPS, RECEIVING YARDS allowed, OVER EXP. (yards saved vs expected; negative = fewer than expected = better).
- Representative values: 1 Woolen −0.64 (DC, PHI); 2 Surtain −0.55; 5 Rock Ya-Sin −0.44 (DET); 9 Benford −0.38 (BUF).
- *(Handle-note: this section prints "@hawkbledger"; the pass-protectors section prints "@hawkblogger" — both attributed to Brian Nemhauser in AGENTS.md; flagged, not resolved.)*

**Passer rating allowed (coverage-liability cut)** — @MagicSportsGuy (StatRankings), 2026-09-17.
- Values (as displayed, "+" prefix as posted; baseline not stated): 1) Tyrique Stevenson +158.3; 2) Kamari Lassiter +153.3; 3) Mike Sainristil +149.3; 4) Denzel Ward +147.9; 5) James Pierre +143.8. Note: values exceed a perfect 158.3 — the "+" prefix is as displayed. Coverage-liability framing.

**Penalty yard leaders (accepted-only)** — @sfdata9ers, 2026-09-17 ("Penalty Yard Leaders — 2026 Week 1, ACCEPTED penalties only").
- Columns: rank, player (count), team, yards. Sample: 1) M. Melton (1) 48; 2) K. Lassiter (1) 46; 3) Aj. Terrell (2) 42.
- Accounting rule (author-confirmed): accepted penalties only — declined/offsetting excluded (Metcalf's second OPI was declined → 10 accepted yards).

**Defensive detail (lab)** — Worker, 2026-09-17 (`defense_detail_2025/2026.csv`).
- Metrics (as given): **INT forced rate per opponent dropback**; **forced fumble rate per play** (opponent fumble==1); **opponent fumble recovery share** (fumble_lost / fumble); **tfl_rate_per_rush is COMPUTED** — no tackle_for_loss column in nflverse pbp, so every opponent designed rush with yards_gained < 0 counts as a TFL (exact by definition; will not match charting vendors' counts); **takeaway rate per drive**; **defensive TD rate per drive** (return_touchdown==1; 2025: 46 — 29 INT-TD + 18 fumble-TD, 1 flagged both); **points allowed per drive** (opponent final scores ÷ defensive drives, unfiltered).

**EPA/rush by run gap + gap-label critique** — @csv_enjoyer (verified), 2026-09-15.
- Metric: Week 1 EPA/rush charted by designated run gap.
- Critique (@StevePalazzolo_, ex-PFF founder, verified): **gap labels do not identify the responsible lineman, and NFL gamebook gap calls mislabel outside-zone runs** ("wide right" called but hitting the A-gap) — a charting-validity warning on the whole genre.

---

## 4. Kicking and special teams

**Kicker metrics (lab)** — Worker, 2026-09-17 (`kicker_metrics_2025/2026.csv`, script `compute_kicker_defense_metrics.py`); FULL-game REG record (garbage-time FGs count).
- Metrics (as given): **FG attempts/make rate by distance bucket (<30, 30-39, 40-49, 50+**; buckets cross-foot to totals); **XP make rate**; **kicking points/game** (3×FG+XP per team game; 2-pt excluded); **FG/XP EPA per attempt** (nflverse epa, 100% non-null); kicker names (raw kicker_player_name; 2026 W1 confirms T.Bass BUF, J.Bates DET).
- League 2025 anchors: FG 85.6%, XP 95.9%, 7.36 kick pts/g.
- Noted paradox: Bates 79.4% FG but 7.94 pts/g — volume (34 att) + nine 50+ attempts at 44.4% → negative FG EPA/att (−0.080); long attempts are negative-EPA on average, not an error.
- (@GridironInfo_ deep sweep adds: punter net average — Stout 44.9, Sanchez 44.7; FG% tables by distance.)

**Special-teams metrics (lab)** — Worker, 2026-09-17 (`special_teams_2025/2026.csv`); FULL-game REG record.
- Metrics (as given): **kickoff touchback rate** (2025 spot = 35-yard line, dynamic kickoff confirmed in drive_start_yard_line); **opponent avg start after kickoffs** (excludes plays where kicking team kept possession — onside kicks unidentifiable, no column); **kickoff/punt EPA**; **kick/punt return EPA and yards per return — bundled caveat: nflverse has no per-return EPA column, so these are return-INCLUSIVE play EPA, not isolated return skill**; **FG/punt/XP blocks forced**.
- League 2025 anchors: 20.5% touchback, opp avg start own 29.8, kickoff EPA −0.257/kick (kicking off is negative-EPA in the dynamic-kickoff era), punt EPA −0.127/punt, 23 FG / 9 punt / 12 XP blocks.
- Bookkeeping verified: posteam = RETURN team on kickoff plays.

---

## 5. Drive, down, and situational systems

**Drive-outcome system (lab)** — Worker, 2026-09-17 (`drive_stats_2025/2026.csv`); **not named anywhere else in AGENTS.md**.
- Definitions (as given): drive = one (game_id, fixed_drive) group, drive != 0; offense = majority posteam; points from score differential (captures PATs, 2-pt, safeties). Rates: **td_rate, fg_rate, punt_rate, three_and_out_rate** (exactly 3 plays AND punt), **turnover_drive_rate** (Turnover + Opp touchdown — pick-sixes count against the offense), **downs_rate, avg_drive_start_own**. Deliberately **UNFILTERED** REG sample (punts/FGs/garbage drives are real drives).
- League 2025 anchors: 2.10 pts/drive, 24.0% TD, 20.4% 3-and-out, 11.1% turnover-drive, avg start own 30.4.

**Down splits (lab)** — Worker, 2026-09-17 (`down_splits_2025/2026.csv`); **not named anywhere else in AGENTS.md**.
- Definitions (as given): team×season×side×down_group (**early_1_2 / late_3_4**): n_plays, epa_per_play (defense sign-flipped), success_rate. The predictive split: early-down success r ~ 0.36 vs 3rd-down "nearly meaningless" (2012 hierarchical-Bayes study cited in landscape).

**extra_metrics (lab)** — Worker, 2026-09-17 (`extra_metrics_2025/2026.csv`); **not named anywhere else in AGENTS.md**.
- Definitions (as given): **stuff_rate** (designed rushes with yards_gained ≤ 0), stuff_rate_allowed, **air_epa / yac_epa / air_yards per dropback and allowed**, **late-and-close EPA** (4Q, possession-team wp ∈ [0.20, 0.80], ~50–80 plays/team/season, n_late_close reported).

**Garbage-time correction (projection method)** — `~/workspace/gse-research/props-consensus/projection_methods.md`, 2026-09-17.
- Method (as given): base prior = 2025 full-season per-game means (filtered sample); 2026 Wk1 = one-game role check only, efficiency never blended (100% 2025 / 0% Wk1 for rates). **Filtered per-game means understate full-game volume (~11% of plays excluded); each volume projection is multiplied by the measured unfiltered/filtered per-game ratio for that exact stat** (Allen att 1.025, yds 1.031; Goff att 1.105, yds 1.094; targets 1.042–1.195). Measured bias correction, not a fudge.

**Script model (dropback rates by possession WP)** — same source, 2026-09-17.
- Rates (as given, 2025 dropback rates by possession-WP bucket): BUF lead 50.0% / neutral 57.2% / trail 61.8%; DET 54.2% / 57.1% / 68.2%. QB shares: Allen 91.0% of team dropbacks, Goff 98.6%.
- Companion: **split-half stability** — receptions projected only where target-share stability was verifiable (St. Brown 29.5/27.0, J. Williams 14.1/17.5, Gibbs 12.3/17.5, Cook 6.4/8.4); Kincaid/LaPorta fail the naive split-half (injury games) → projected on when-active share + Wk1 role confirmation.

**Survivor win-probability futures** — @Clevta (verified), 2026-09-16.
- Definition (as given): **per-week win-probability charts for Circa and Splash survivor contests across the season**. Week 2 note: zero teams project at 65%+ in the Christmas-week Circa window — CHI (vs GB) and Philly (vs HOU) are sub-3-point favorites and the highest win % available.

**DFS ownership leverage model** — @StokasticNFL (brand account), 2026-09-17.
- Definition (as given): **ownership leverage % vs optimal-lineup probability** for a five-game FanDuel slate (Thu–Mon). Build form: leverage = projected optimal-lineup share minus projected ownership. Ladd McConkey flagged at "40% leverage, the widest gap on a five-game slate."

**Red-zone / short-yardage cuts** — @GridironInfo_, 2026-09-17 deep sweep.
- "RED ZONE TOUCHDOWN RATE" (team bars); "3RD/4TH & 1-OR-LESS CONVERSION RATE" (team bars). Basic cuts, distinct from the lab's red-zone suite naming.

**@GridironInfo_ defensive chart cuts (2026-09-17 deep sweep)** — cuts on standard metrics, distinct angles: "2025 PRESSURE RATE vs EPA WHEN PRESSURED" scatter; "2025 BAD THROWS vs INTERCEPTIONS THROWN" scatter; "2025 QB TARGETS vs INTERCEPTION RATE" scatter; QB Throw % vs Interception % scatter; INT% ranking (Maye 10.77%, Purdy 7.4%, Love 5.7%, Darnold 5.0%, Burrow 4.7%).

**nfl4th + coach grading** — @benbbaldwin, 2026-09-17 v2.
- nfl4th (CRAN); **@ben_bot_baldwin grades every coach's fourth-down call vs the model in near real time**. League went **16.8% (2019) to 26.5% (2021) on toss-up go-for-it** — the league moved toward the model.

---

## 6. Turnover-luck decomposition

**Turnover-luck files (lab)** — Worker, 2026-09-17 (`turnover_luck_2025/2026.csv`).
- Definitions (as given): luck-layer decomposition. **Occurrence (partially skill): forced fumbles per play vs league-rate expectation** (same actual-minus-expected construction as the INT luck columns). **Recovery (near-pure noise): recovery share minus league mean (2025: 46.3%)**.
- Textbook 2025 case: DET forced 19 fumbles (+6.5 over expected) but recovered only 26.3% (−20 pts vs league) — process good, results unlucky, positive regression expected.
- Literature (v2, 2026-09-17): fumble-recovery year-to-year correlation **0.00/−0.02 (Stuart)**; pressure-to-sack conversion "luck" R² < 0.005 (PFF). Engine rule recorded: model occurrence; regress recovery to ~50%; count forced fumbles, never recovered fumbles, in team-strength features.

---

## 7. Receiver and air-yard metrics

**Air-yards decomposition table** — Garrett-supplied screenshot, 2026-09-17 (`docs/air-yards-week1-2026.png`); originating account UNVERIFIED (do not attribute until confirmed).
- Decomposition columns (as given): TGT, **AY TOTALS, AY RESULT INCOMPLETE, AY CATCHABLE, AY NOT CATCHABLE, AY RESULT DROPPED**.
- League avg (Week 1): 3 TGT, 31 AY, 15 incomplete-result, 22 catchable, 11 not catchable, 3 dropped.
- Standouts: Olave 237 AY; Jameson Williams 128 AY with **47 dropped air yards**; DJ Moore 149 AY, 0 dropped.
- Build target noted in-file: "wasted air yards" (dropped + uncatchable) vs "bankable air yards" (catchable) — the catchable split is charting data (FTN), not in raw nflverse air_yards.

**Player first-downs (lab)** — Worker, 2026-09-17 (`player_first_downs_2025/2026.csv`, script `compute_player_metrics.py`).
- Definitions (as given): per-player **rushing FD rate** (rusher_player_name, includes QB scrambles on the QB's row) and **receiving FD rate per reception AND per target**. Qualifiers: 50+ rushes or 30+ targets (2025: 225 players; 2026 W1: 8+/8+, 55 players, role-check only).
- 2025 extremes: T. Lawrence 52.1% rush FD (scramble-inflated, documented); T. McLaurin 88.9% rec FD.

**1st-Read %** — StatRankings proprietary (checkout, 2026-09-18). Name only.

---

## 8. QB processing and aggressiveness

**QB aggressiveness (lab)** — Worker, 2026-09-17 (`qb_aggressiveness_2025/2026.csv`).
- Definitions (as given): **aDOT** (Σair_yards ÷ attempts with non-null air_yards; sacks excluded), **comp%, expected comp%** (nflfastR cp), **CPOE in percentage points**. **Throwaway handling: cp = NA on all 2,132 2025 throwaways, so comp/exp/CPOE are computed on the cp-available subset only** (an early version got this wrong; fixed). Qualifiers: 100+ att (45 QBs). 2025: Maye +10.6 CPOE, Mariota 10.18 aDOT.

**NGS aggressiveness definition** — @GridironInfo_, 2026-09-16 (via deep sweep).
- Definition stated in post text: **aggressiveness = % of throws into tight coverage (NGS)**. Quadrant labels: "Throws Deep, Off Clean Separation" (Allen ~13.7 aDOT, low aggressiveness); "Pushes It Downfield, Into Tight Windows" (Malik Willis ~22% aggressiveness); "Safe, Short, Off-Schedule Reads" (Mahomes, Cooper Rush); "Contested Throws, Kept Short" (Stroud/Brissett). Axes: aggressiveness 1%–24%, aDOT 2.0–13.7.

**QB read-distribution vendor caveat** — 2026-09-17.
- Live methodology debate recorded in-thread: **scramble-counting differences between the @sfdata9ers and @FantasyPtsData versions change the numbers** — track the convention before comparing vendors. (@KyleM_FF version: primary vs secondary reads; Caleb Williams "did in fact have secondary read pass attempts in Week 1.")

**PFF positive/negative play rates** — @Shauncore (NOT verified, CFA), 2026-09-17.
- Definition (as given): new PFF QB metric splitting plays into positive vs negative categories. Data behind PFF Pro subscription; methodology not yet disclosed — filed as a watch item only.

---

## 9. Market metrics and model-market framing

**Vig-free consensus + synthetic hold + EV/arb/middle detection** — @UnabatedSports, @RobPizzola (betstamp), @CirclesOffHQ, @beatingthebook, 2026-09-17 v2.
- Definitions (as given): **vig-free (de-juiced) consensus lines, synthetic hold, +EV / arbitrage / middle detection across books**. betstamp = line-shopping and bet-tracking tooling.

**Peabody bias-index framing** — Rufus Peabody, 2026-09-17 v2 deep-dive.
- Framing (as given): treats model AND market as noisy estimates; bias-index framing **(market −7, model −3, true near −5.2)** is "the cleanest public model-vs-market blending articulation." Bets only past the rake; sizes with the edge. Related method notes: opponent adjustment, garbage-time/penalty-noise removal, regression toward market, power ratings.

**Barometric pressure + humidity in totals models** — Rufus Peabody deep dive, 2026-09-17.
- Metric (as given): NFL/MLB totals models incorporating **barometric pressure and humidity as weather variables, alongside wind**. AGENTS.md's weather entry covers wind (nonlinear, stadium-specific) but not pressure/humidity. Experimental only until verified.

---

## 10. Methodological standing notes (from the 2026-09-17 dossiers)

These are attributed literature/method traps recorded in AGENTS.md, not in report.md:

- **EP model is XGBoost now**, not Yurko's logit. Do not describe current nflfastR `ep_model` as Yurko's multinomial logit. Play-level EP inherits drive-level dependence; validate with **drive- or game-grouped splits, never random play splits** (Brill et al. 2024).
- **CPOE feature list is UNVERIFIED.** The methodology article could not be fetched; the commonly quoted "throw depth / receiver separation / pressure" list could not be tied to nflfastR from any source read. **Rolling mean CPOE with shrinkage toward zero at low attempt counts.**
- **Success rate has THREE competing definitions** (nflfastR EPA>0, Football Outsiders **40/60/100**, Connelly **50/70/100**). Never mix. The EPA>0 convention was verified empirically (100% match on 29,239 filtered plays).
- **No peer-reviewed EPA forward-validity study exists** (called the v2 dossier's biggest literature gap). Provider/analyst evidence: passing efficiency vs wins **0.53–0.61 vs rushing 0.13–0.19**; non-scripted EPA far more stable than scripted; EPA variables carried 10×+ model importance over scripted splits. Passing EPA predicts future point differential (r ~ 0.42 at 6 games) better than success rate, though success rate stabilizes faster (~r = 0.60 by game 6).
- **Turnover split = occurrence (partially skill) vs recovery (near-pure noise).** See §6.
- **Proprietary walls:** full DVOA formula and DAVE decay schedule are UNVERIFIED (proprietary). Implement "DVOA-inspired" EPA with iterative opponent adjustment; never label it DVOA.
- **Red-zone EPA:** conversion is near-noise (Schatz's critique); **trip rate** is the sticky part.
- **Special-teams EPA:** small, real, systematically unpriced (Wharton study: **+1.9% RMSE improvement**). Additive adjustment.
- **Bye-week edge largely VANISHED post-2011 CBA** (tiny coefficients only). **Travel/time zones/altitude: no verified NFL coefficient** (FPI's altitude term has weak evidence nonzero — experimental only).
- **Strength of schedule:** forward SOS = market-based (projected win totals); backward = efficiency-based. Never raw prior-season win%.
- **Havoc rate:** NO NFL standard definition; fix one before computing. (StatRankings lists its own Havoc Rate on checkout — proprietary instance.)
- **Percentile convention (lab):** percentile pct = **(rank−1)/(n−1)×100 per season (n=32), 100 = best in league, 0 = worst**; lower-is-better metrics inverted (def success allowed, explosive allowed, INT/fumble rates, sack/hit allowed, stuff rates). Identifier/volume/raw-count columns get no percentile. **EPA distributions:** long format team×season×side×split (all/dropback/rush), columns n, mean, p10/p25/median/p75/p90, **share_neg_epa, share_chunk_epa (EPA > 1.0)**.
- **Weekly trends (lab):** 544 rows (32 teams × 17 weeks, bye weeks absent) — weekly EPA/play, EPA/dropback, EPA/rush, success rate, defensive splits. **Unit matchups (lab):** pass_off/rush_off EPA + success vs pass_def/rush_def EPA (sign-flipped) + success allowed, **stuff_rate and stuff_rate_allowed, int_worthy_throw_rate (2025)**, n_plays, plus _pct ranks.

---

## 11. Standing benchmark-lane conventions a coding agent needs

All recorded in AGENTS.md itself (repo read-only; cited by section):

1. **Neutral-inventory standard** (all sweeps): "metric name, definition as given, columns/sample values, date/account, data source as stated, caveats as attributed facts — no verdicts." Use it for every new metric entry.
2. **HARD RULE** (landscape §4): "we read and learn from public posts; **we never republish anyone's proprietary charts as our own.**" Companion (2026-09-21 NGS deep dive): **no NGS numbers republished as GSE data** — the glossary documents the metric taxonomy and formats only.
3. **Benchmark completeness audit discipline** (2026-09-17): 156 items inventoried — 82 covered, 73 missing — all filed as blocks; the audit log lives at `~/workspace/gse-research/benchmark-audit-2026-09-17.md`.
4. **Dedupe discipline:** sweeps record "DEDUPES vs existing inventory" per pass (e.g., PROE+ repost = same metric, not a new entry; ANY/A scatter = same post already inventoried).
5. **Lab computation conventions (2026-09-17):** base filters = REG only, pass/run, no kneels/spikes, garbage time excluded (4Q, possession WP >0.95 or <0.05), success = EPA > 0 — EXCEPT drive_stats / kicker / defense_detail / special_teams families, which are deliberately UNFILTERED FULL-game record. Lab output: **29 CSVs across 15 families via 4 scripts** (`compute_team_metrics.py`, `compute_advanced_metrics.py`, `compute_kicker_defense_metrics.py`, `compute_player_metrics.py`), documented in `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`. (AGENTS.md's "14 new CSVs / one script" line is wrong per the 2026-09-17 correction block.)
6. **Posting gate (standing):** posted picks carry the engine's confidence or Garrett's called pick, **never an analyst's read**. Predicting team quality is NOT predicting covers.
7. **Scrubbed data note (2026-09-17 sweep):** the 2026-09-24 AM and Sept 18–23 sweep items are already inventoried in `report.md` and were excluded from this digest as duplicates.

---

## 12. Notes on scope

- **Not metrics, deliberately excluded:** props-consensus file paths (`projection_methods.md`, `kicker-defense-props.md`, `consensus_lines.csv`, `our_projections.csv`, `sources_notes.md`), Edge Sheet design docs (`DESIGN_BRIEF.md`, `DESIGN_CRITIQUES_V2.md`), full-table CSV paths, account-handle correction logs, the JEV infra benchmark (2026-09-17), and engine build targets ("Engine gap"/"Build target") — those are engineering plans, not metric inventory. Several AGENTS.md blocks state build targets explicitly; this digest records only the metric definitions, formulas, conventions, and attributed evidence.
- **Attribution rule followed:** where AGENTS.md said "UNVERIFIED" (e.g., @Doug_Analytics account, the air-yards screenshot's originating account, the StatRankings Havoc Rate formula, the CPOE feature list), that status is preserved above.
- **The corpus rule** (all sports material lives in the Sports repo under `docs/research/<date>/`; repo is the record, workspace is scratch) is Garrett's standing directive per his memory record, **not** text found in AGENTS.md — recorded here so the coding agent looks for it in the repo, not in this file.


---

