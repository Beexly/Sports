# NFL Analytics Reverse-Engineering — Metric Catalog

## Purpose
The complete, deduplicated source catalog of every metric, definition, formula, theory, innovation kernel, lesson, data-source note, chart template, access fact, blocker, and unresolved item surfaced by the September 17–24, 2026 NFL analytics reverse-engineering sweeps — built for Garrett's coding agent as the single source of record. Another agent is updating the actual page; this document is the complete catalog behind it.

## Coverage window
September 17–24, 2026 (twice-daily X sweeps, deep dives, CSV dumps, and reverse-engineering passes), plus broader sports lessons in Part 7.

## Method
Every sweep item was inventoried from agent extraction files, the 4,525-line sweep-email source, CSV inventories, and the repo's research corpus. Items are marked `NEW — sweep` (first observed in the September 17–24 window) or `ALREADY-COVERED — foundation` (present in the September 17 foundation catalog/dossiers).

## Honesty standard
No formula, value, source, or result was invented. Where an author published no formula, the entry says `not disclosed by author`. Inferred, approximate, partial, proprietary, unknown, unresolved, and contradictory facts are labeled as such. Account, source, date, and post-URL provenance are retained on every entry.


---

## 1. Metric catalog

## Family: QB efficiency

### EPA per dropback (QB)
- **Definition (author wording):** EPA on pass plays (dropbacks), per dropback. nflfastR convention per GridironInfo_.
- **Formula:** not disclosed by author (nflfastR EP model underneath).
- **Columns/sample:** Lawrence +0.79, Dart +0.71, Allen +0.45 (Wk1 leaders, @GridironInfo_, nflreadpy, 2026-09-18).
- **Date/account:** 2026-09-18 / @GridironInfo_. **Source:** nflreadpy. **Caveats:** none stated. **Theory:** none stated. **Kernel:** standard leaderboard.
- **Status:** NEW — sweep (foundation has team EPA/play; QB-level EPA/DB leaderboard family expanded).

### Total QBR
- **Definition:** ESPN Total QBR. **Formula:** not disclosed by author (ESPN proprietary).
- **Columns/sample:** sfdata9ers composite uses QBR 35% weight; Purdy 99.7 Wk2 (@sfdata9ers, 2026-09-21, pre-MNF).
- **Date/account:** 2026-09-18/21 / @sfdata9ers. **Source:** PFR (composite table). **Status:** NEW — sweep (not in foundation).

### ANY/A (Adjusted Net Yards per Attempt)
- **Definition:** author's standard ANY/A. **Formula:** not disclosed by author.
- **Columns/sample:** Wk1 leaders Lawrence 13.1, L. Jackson 12.0 (@PattonAnalytics, StatRankings, 2026-09-18; source's duplicate "Drew Lock" preserved as displayed).
- **Status:** NEW — sweep.

### EPA + CPOE (proposed by @CharlesChillFFB)
- **Definition (author, verbatim):** "You need both. Efficiency alone lies without volume context. Volume alone lies without efficiency context."
- **Formula:** not disclosed by author (NOT YET PUBLISHED — "Coming soon... EPA + CPOE").
- **Date/account:** 2026-09-19 / @CharlesChillFFB. **Source:** nflverse. **Caveats:** not yet published; no values. **Theory:** efficiency×volume two-dimensional QB evaluation.
- **Status:** NEW — sweep (foundation has EPA+CPOE as an established metric; this is a new proposed variant).

### QB EPA gained on defensive penalties
- **Definition:** EPA gained on accepted defensive penalties (no-yards-gained plays only). **Formula:** not disclosed by author.
- **Columns/sample:** J. Allen 7.8, Prescott 7.7 (@sfdata9ers, Wk1-2, 2026-09-23).
- **Status:** NEW — sweep.

### Expected-pass-situation QB EPA
- **Definition:** QB EPA in expected-pass situations (>70% expected pass probability, min 20 dropbacks). **Formula:** not disclosed by author.
- **Columns/sample:** PARTIAL approx from unlabeled bars: Dart ~1.2, Allen ~0.95 (@SamHoppen, nflfastR, 2026-09-23).
- **Status:** NEW — sweep.

### QB total EPA (SumerSports via @tejfbanalytics)
- **Definition:** total EPA with EPA/DB, comp%, aDOT, success%, pressure EPA/DB. **Formula:** not disclosed by author.
- **Columns/sample:** Dart 22.6, C. Williams 18.7 (@tejfbanalytics, Sumer Sports, 2026-09-18).
- **Status:** NEW — sweep.

### Yards per dropback (team)
- **Definition:** "A Niners dropback has averaged 10.7 yards." Histogram with percentile line; dropbacks include sacks and scrambles. **Formula:** not disclosed by author.
- **Columns/sample:** 99.7th percentile (@SumerSports, 2026-09-20).
- **Status:** NEW — sweep.

### EPA per dropback — NGS
- **Definition:** stat box on NGS Pass Charts (Mahomes +0.25). **Formula:** not disclosed by author. **Source:** Next Gen Stats. **Date:** 2026-09-21 (deep-dive).
- **Status:** NEW — sweep.

### Deep Pass % + Deep Pass EPA
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** Mayfield 26.5/−1.8 (Wk2 through SNF, not MNF; "Data via NFL Pro") (@NFL_University, 2026-09-21).
- **Status:** NEW — sweep.

### EPA/attempt on 10+ air-yard throws
- **Definition:** EPA per attempt on throws traveling 10+ air yards. **Formula:** not disclosed by author.
- **Columns/sample:** worst 5, min 8 throws: Cooper Rush −1.46/9; J. Winston −0.49/12 (@GridironInfo_, Wk2, 2026-09-24 AM).
- **Status:** NEW — sweep (Sept 24 AM required item).

### Scramble EPA — NGS
- **Definition:** none beyond metric name. **Formula:** not disclosed by author. **Columns/sample:** Kyler Murray 4th-most scramble EPA since 2019; 1,993 scramble rush yards (4th). **Source:** Next Gen Stats. **Date:** 2026-09-21.
- **Status:** NEW — sweep.

### Weighted EPA (WEPA) team tiers
- **Definition:** none beyond metric name. **Formula:** not disclosed by author (weighting unstated).
- **Date/account:** 2026-09-21 / @TheCurrentTalk. **Status:** NEW — sweep.

## Family: QB accuracy

### CPOE (Completion Percentage Over Expected)
- **Definition:** actual completion outcome minus model-estimated completion probability. **Formula:** not disclosed by author. **Source:** varies (NGS, PFF, nflfastR).
- **Samples:** Daniel Jones +20.2% (30/34, 88.2%, 21.9 EPA, +0.68 EPA/att) Wk3 (@NextGenStats); Purdy +16.7%, Dart +10.9% (NGS pass chart stat boxes); T. Lawrence led NFL in CPOE Wk1 per @NextGenStats (quoted by @rjanalytics7002).
- **Status:** ALREADY-COVERED — foundation. New: NGS-published methodology details (see Part 7B): XGBoost on SageMaker, 36,000+ attempts back to 2016, r²=0.98; ~6 of 10+ factors named (air distance, target separation, sideline separation, pass rush separation, passer speed, time to throw).

### QB Accuracy Index (PFF, new)
- **Definition:** launch leaderboard ranked by CPOE + PFF grade. **Formula:** not disclosed by author.
- **Columns/sample:** interactive table labeled "THROUGH WEEK 1", 33 passers min 21 DB; Dart +10.7 CPOE (@PFF, 2026-09-23). **Caveats:** article titled Week 2 but table says through Week 1; Allen card looks like Wk2 single-game — window unreconciled.
- **Status:** NEW — sweep (Sept 24 window; listed among required).

### Bad Throw % / Int-Worthy Passes
- **Definition:** IWP = Int-Worthy Passes (@GridironInfo_ DET-BUF template). **Formula:** not disclosed by author.
- **Columns/sample:** INT/bad-throw ratio vs aDOT scatter: "This ratio shows what share of a QB's bad throws actually turned into a pick. Low = getting away with mistakes. High = paying for them." Outliers: Maye (~1.5 ratio, ~6.5 aDOT), Allen (~13.0 aDOT, ~0.0) (@GridironInfo_, 2026-09-18). **Source:** PFR Advanced Passing + NGS / nflverse.
- **Status:** NEW — sweep.

### On-target %
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** RaritosFootball QB ratings tab includes "pases al objetivo %" (Geno Smith 9.3 nota). **Status:** NEW — sweep.

### Catchable target rate / catchable air yardage rate
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @ScottBarrettDFB. **Source:** Fantasy Points Data Suite 2.0. **Status:** NEW — sweep.

## Family: Receiver

### YPRR (Yards Per Route Run)
- **Definition:** receiving yards / routes run. **Formula:** not disclosed by author (standard).
- **Columns/sample:** 2025+2026 elite: Nacua 3.84, JSN 3.79, Kincaid 3.54 (@ScottBarrettDFB, FP Data Suite 2.0, 2026-09-18). JSN leads league in YPRR and TPRR through 2 weeks (@DaveKluge, 2026-09-20). Ladd McConkey YPRR rank (@RyanJ_Heath, 2026-09-21).
- **Status:** NEW — sweep (not in foundation metric list).

### TPRR (Targets Per Route Run)
- **Definition:** targets / routes run. **Formula:** not disclosed by author (standard).
- **Samples:** see YPRR; Tyler Warren TPRR 0.23 (@jmthrivept, 2026-09-24); Mark Andrews TPRR 0.22→0.28 (@Glick_FFB, 2026-09-24).
- **Status:** NEW — sweep.

### Target share
- **Definition:** share of team targets. **Formula:** not disclosed by author (standard).
- **Samples:** Kincaid 28.5% share, 30.7% TPRR (@JMac_FF, 2026-09-18); Mark Andrews tgt share 15.9→23.2 (@Glick_FFB, 2026-09-24).
- **Status:** NEW — sweep.

### First-read %
- **Definition:** share of targets as first read. **Formula:** not disclosed by author.
- **Samples:** PattonAnalytics QB first-read efficiency scatter (D. Lock SEA 0.65 EPA/att approx / 80% first-read rate approx; Dart 0.62/73) (@PattonAnalytics, StatRankings, 2026-09-24 AM). DBro_FFB DS2 splits include 1st-read% by shell.
- **Status:** NEW — sweep (Sept 24 AM required item).

### Separation Score / Separation Market Share / ADOR (DevyEusuf, proprietary)
- **Definition:** none given in post or replies. **Formula:** not disclosed by author.
- **Columns/sample:** 2nd-year WRs 2026, min 10 routes: Ayomanor 0.111, Burden 0.083, Egbuka 0.069, Golden 0.025 (@DevyEusuf, FP Data Suite 2.0, 2026-09-18).
- **Status:** NEW — sweep.

### Win Rate (receiver)
- **Definition:** none given. **Formula:** not disclosed by author.
- **Columns/sample:** Ayomanor tied 2nd in Win Rate among 2nd-year WRs (@DevyEusuf); Mark Andrews win rate in 2025 vs 2026 comparison (@Glick_FFB).
- **Status:** NEW — sweep.

### Vertical route share (SumerSports)
- **Definition:** "Romeo Doubs led all WR with 25+ routes with a 60% vertical route share in Week 1 (Go / Post / Corner)."
- **Formula:** not disclosed by author ((Go+Post+Corner)/all routes, inferred by extractor — treat as inferred).
- **Columns/sample:** Doubs 60.0%, Pickens 54.8%, TeSlaa 51.6% (@SumerSports, 2026-09-16). **Caveats:** shares exclude 5% of routes with no charted type; one game, 30 routes.
- **Status:** NEW — sweep.

### Air yards (catchable vs uncatchable)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** Olave 305 catchable (@FantasyPtsData, 2026-09-21; quoted @KyleM_FF). **Status:** NEW — sweep.

### ADOT (average depth of target)
- **Definition:** mean charted target depth. **Formula:** not disclosed by author.
- **Columns/sample:** Allen 12.82 yds avg depth on 28 targeted attempts, highest in 33 starts; 2024-25 avg 7.87 (@SumerSports, 2026-09-17; throwaways excluded). DK Metcalf 20.4 aDOT 1st among WRs with 7+ targets (@MagicSportsGuy). Tyler Warren aDOT 1.42 [author flags "??"] (@jmthrivept).
- **Status:** NEW — sweep (not in foundation).

### Route participation / route %
- **Definition:** share of team dropbacks on which player ran a route. **Formula:** not disclosed by author.
- **Columns/sample:** Kincaid ~66% route participation "is the state change" (@polianlabs, 2026-09-18); Tyler Warren rte% 79.1 (@jmthrivept, 2026-09-24); MagicSportsGuy Cardio Index uses route participation.
- **Status:** NEW — sweep.

### Cardio Index (@MagicSportsGuy)
- **Definition:** route participation × lowest TPRR. **Formula:** not disclosed by author (product described, exact computation not stated).
- **Columns/sample:** M. Harrison Jr. 87.1% route part, 0.07 TPRR (@MagicSportsGuy, statrankings branding, Wk2, 2026-09-22).
- **Status:** NEW — sweep (also Part 4 composite).

### Coverage splits: man/zone/shell TPRR/YPRR/FP-per-route
- **Definition:** receiver efficiency splits by coverage shell. **Formula:** not disclosed by author.
- **Columns/sample:** Mooney 2025: man 17.05% TPRR/0.66 YPRR vs zone 16.07%/1.14 (@MagicSportsGuy, CoverageIQ+, StatRankings, 2026-09-18); Nacua vs C3: 41.96% TPRR (12th), 4.63 YPRR (7th) on 112 rts; DBro_FFB DS2 splits (Coker vs NE: man 36.4% TPRR/3.05 YPRR; zone 27.6%/2.18); statyxio man vs zone YPRR (Evans SF 2.13 man/2.17 zone); @DevyEusuf PFF receiving grade vs man/zone (Parker Washington only 80+ vs both).
- **Status:** NEW — sweep.

### YAC over expected — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Pickens +65, Downs +48, A.J. Brown +42 (Wk3, @NextGenStats, 2026-09-21).
- **Status:** NEW — sweep. NGS methodology note: 2018 model superseded by xRY-style structure.

### Receiving yards over expected (RECYOE) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** +46 JSN (Route Chart stat box, @NextGenStats).
- **Status:** NEW — sweep.

### Target separation — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Week 3 leaders: Godwin 4.3 yds, Wan'Dale Robinson 4.3, M. Wilson 4.1 (@NextGenStats).
- **Status:** NEW — sweep.

### Air yards per target — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Alec Pierce 16.9 (league-high, last four seasons, min 150 targets) (@NextGenStats).
- **Status:** NEW — sweep.

### Vertical receptions — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Jaylen Waddle 21 (T-2nd in NFL, 2025) (@NextGenStats).
- **Status:** NEW — sweep.

### Receptions vs split-safety — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Michael Pittman Jr. 40 (T-4th among WRs) (@NextGenStats).
- **Status:** NEW — sweep.

### Isolated alignment TDs — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Mike Evans 13 since 2023 (T-most), 39 since 2016 (@NextGenStats).
- **Status:** NEW — sweep.

### Tyler Warren route profile
- **Definition:** route profile per FantasyPtsData. **Formula:** not disclosed by author.
- **Columns/sample:** Wk1-2: rte% 79.1, tgt% 19.4, TPRR 0.23, CR% (catchable?), aDOT 1.42 [author flags "??"], AY share 4.8%, YPRR, YAC/rec (@jmthrivept, FantasyPtsData, 2026-09-24 AM).
- **Status:** NEW — sweep (Sept 24 AM required item).

### Mark Andrews 2025 vs 2026 role comparison
- **Definition:** metric comparison per FantasyPtsData. **Formula:** not disclosed by author.
- **Columns/sample:** tgt share 15.9→23.2, TPRR 0.22→0.28, YPRR 1.36→2.13, routes/game, win rate, air yards/target (@Glick_FFB, FantasyPtsData, 2026-09-24 AM, https://x.com/Glick_FFB/status/2103107265192399322).
- **Status:** NEW — sweep (Sept 24 AM required item).

## Family: Rushing/backfield

### RYOE (Rushing Yards Over Expected)
- **Definition:** yards over expected from the tracking model. **Formula:** not disclosed by author. **Source:** NGS.
- **Columns/sample:** Week 3: Jeremiyah Love +38, Gibbs +30, Etienne +25 (@NextGenStats). NGS methodology: 2D CNN by Singer & Gordeev ("The Zoo"), 2020 Big Data Bowl winners; inputs only five vector features (X, Y, S, A, Dir) at handoff; outputs distribution over rushing outcomes; xRY = sum(outcome × probability).
- **Status:** ALREADY-COVERED — foundation. New: NGS-published methodology (see Part 7B).

### Yards before contact (YBC) — SumerSports
- **Definition:** "NEW data on SumerSports: yards before contact (YBC)." **Formula:** not disclosed by author.
- **Columns/sample:** "YaCo + YBC" chart; "Where RBs get their yards" chart (YBC vs YACo split) (@SumerSports, 2026-09-21).
- **Status:** NEW — sweep.

### Missed tackles forced (MTF) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Carry Chart stat boxes (Walker 15, Gibbs 12) (@NextGenStats).
- **Status:** ALREADY-COVERED — foundation (listed in foundation catalog). New: NGS tackle-probability pipeline details (see Part 7B).

### YACo/att & MTF per attempt (Fantasy Points)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @FantasyPtsData. **Source:** FP Data Suite 2.0. **Status:** NEW — sweep.

### "How elusive" — YAC × avoided tackles (AcccountStat)
- **Definition:** "How elusive" — YAC per rush × avoided tackles per rush, averaged across NFL Pro / PFF / SumerSports. **Formula:** not disclosed by author (cross-source average).
- **Date/account:** 2026-09-21 / @AcccountStat. **Status:** NEW — sweep.

### Rush Path package (statyx.io)
- **Definition:** lane shares, run-path interaction, runner evidence. **Formula:** not disclosed by author.
- **Columns/sample:** Cook: lane shares LG 46%; run-path interaction Interior 76.92% vs DET 23/32; runner evidence evaded tkl/att 83rd pct. Irving: Interior 62.5% vs CLE 31/32; 3.88 YAC/att (76th), 0.63 evaded tkl/att (99th), 62.5% rush success (99th). Gibbs: Interior 62.07% vs 22/32.
- **Date/account:** 2026-09-16/18 / @statyxio (+ @32BeatWriters for Gibbs). **Source:** statyx.io own platform. **Caveats:** "Available after 3 games"; "No matched RYOE evidence is available for this runner."
- **Status:** NEW — sweep.

### Run Type Matchup (statyx.io)
- **Definition:** zone vs gap concept run matchups × opponent YPC-allowed rank. **Formula:** not disclosed by author.
- **Columns/sample:** Zone 66.7% — 24/26 softer (@statyxio, 2026-09-19). **Status:** NEW — sweep.

### ARBY (Adjusted Run Blocking Yards) — StatRankings
- **Definition (author):** "isolates how much of a team's rushing success comes from the offensive line, separating line-created yardage from what the running back generates on his own."
- **Formula:** not disclosed by author (ARBY column present in CSV dump; formula undisclosed).
- **Date/account:** 2026-09-18 / @MagicSportsGuy. **Source:** StatRankings. **Status:** NEW — sweep (also Part 4: ARBY matchup rating formula disclosed).

### Gap-by-gap run outcomes (SumerSports)
- **Definition:** "92 of James Cook's 106 rushing yards have come on runs hitting outside of the TE." **Formula:** not disclosed by author.
- **Columns/sample:** Gap | (+/-) | YACo | att | yds: A −0.09/4/3/6; B +0.54/3/1/7; C −0.42/2/1/1; D +0.66/20/8/92 (@SumerSports, 2026-09-17).
- **Status:** NEW — sweep.

### Carry share
- **Definition:** share of team carries. **Formula:** not disclosed by author (standard).
- **Columns/sample:** W1-W2 leaders: Gibbs 84.9%, Taylor 82.7%, C. Brown 72.0 (@DynatyzeFF, 2026-09-24 AM; PARTIAL: chart said 12 players, only top 3 visible).
- **Status:** NEW — sweep (Sept 24 AM required item).

### RB Rush Share (@MagicSportsGuy)
- **Definition:** "RB Rush Share" = share of team RB rush attempts ('25 vs '26). **Formula:** not disclosed by author.
- **Columns/sample:** PARTIAL: top-5 + bottom-2: J. Taylor 95.6, +9.0 (@MagicSportsGuy, StatRankings, 2026-09-21).
- **Status:** NEW — sweep.

### Backfield xFP share / Bellcow report (Fantasy Points)
- **Definition:** "each RB's share of his team's backfield XFP." **Formula:** not disclosed by author.
- **Columns/sample:** Achane 95%, Javonte Williams 95%, Gibbs/Cook/Taylor 93% (@FantasyPtsData, 2026-09-16). Most backfield xFP Wk1: DET 34.7, HOU 29.4 (@RyanJ_Heath, 2026-09-22).
- **Status:** NEW — sweep.

### Backfield snap/carry distributions (Dynatyze)
- **Definition:** backfield snap/carry distributions, 5 backfields. **Formula:** not disclosed by author.
- **Columns/sample:** GB/WAS/DEN/NE/SEA; top-3 concentration vs league avg 54.1%; includes redzone target share, team PROE% (@DynatyzeFF, 2026-09-24 AM).
- **Status:** NEW — sweep (Sept 24 AM required item).

### Time-windowed carry share (@ryanj_heath)
- **Definition:** "Jordan Mason handled just 17.2% of carries between the 1st drive and the 2-min warning" — pre-garbage-time windows. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-20 / @ryanj_heath. **Status:** NEW — sweep.

### RB >16 FPG on <35% routes since 2021 (@RyanJ_Heath)
- **Definition:** RBs averaging >16 FPG while running routes on <35% of team dropbacks, since 2021. **Formula:** not disclosed by author.
- **Columns/sample:** "they're all Derrick Henry or Nick Chubb" (D. Henry 2021 24.2) (@RyanJ_Heath, FantasyPtsData, 2026-09-21).
- **Status:** NEW — sweep.

### Run-scheme tendency (SumerSports)
- **Definition:** man/duo rate. **Formula:** not disclosed by author.
- **Columns/sample:** "JAX also dropped their man/duo rate from 50.9% of rushes in 2025 to 31.3% so far this season" — per sweep text attributed to Houston/Texans context (@SumerSports, 2026-09-20).
- **Status:** NEW — sweep.

### Top speed (mph) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Week 3: Kaleb Johnson 21.47; Trey Benson 21.35; RJ Harvey 21.21 (@NextGenStats). All-time: Trey Benson 23.49 mph.
- **Status:** NEW — sweep.

### Average speed on carries / at LOS — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Keaton Mitchell 14.49 mph on carries (1+ mph faster than any other RB, min. 50 carries); 12.14 mph at LOS (@NextGenStats).
- **Status:** NEW — sweep.

### Run stops / run stuffs — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Zack Baun leads Week 1 run stops (5 on 29 run-defense snaps) (@SumerSports); David Onyemata 42 (T-7th among DTs); Maxx Crosby 24 run stuffs for loss/no gain in 2025 (most by a DL since 2018) (@NextGenStats).
- **Status:** NEW — sweep.

### Missed-tackle rates by team
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** DET 0/0.0% (@sfdata9ers, FTN, 2026-09-18). **Status:** NEW — sweep.

### Missed tackle rate (LB) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Leo Chenal 5.2% (lowest among LBs since 2023, min. 40% snaps at LB, min. 125 tackle attempts) (@NextGenStats).
- **Status:** NEW — sweep.

### Negative-run %
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** TEN/DEN tied 0.00 (@sfdata9ers, FTN, 2026-09-18). **Status:** NEW — sweep.

### Explosive-run / 10+ run rate
- **Definition:** 10+ yard runs. **Formula:** not disclosed by author.
- **Columns/sample:** Irving 12.5% 10+ run rate (63rd) (@statyxio). **Status:** ALREADY-COVERED — foundation (explosive-play rate).

## Family: Team efficiency

### EPA per play (team)
- **Status:** ALREADY-COVERED — foundation. Sweep additions: DET-BUF splits (BUF +20.8 dropback/+7.9 designed run; DET +18.2/−3.8) (@GridironInfo_, 2026-09-18); Week 2 EPA/play (@GridironInfo_, 2026-09-21); EPA/drive tiers (SF top net tier) (@SamHoppen, nflfastR, 2026-09-22).

### Success rate
- **Status:** ALREADY-COVERED — foundation. Sweep additions: author's verbatim definition "Success Rate: % of offensive plays with EPA > 0" (@sfdata9ers game recap, 2026-09-20); Paganetti success-rate scatter (NFL avg 46.3/45.6; JAX 68.5/54.0 approx) (2026-09-18); BUF rushing success (Cook 48%, Allen 100%) (@sfdata9ers).

### 1st-and-10 plays gaining 4+ yards %
- **Definition:** % of 1st-&-10 plays gaining 4+ yards. **Formula:** not disclosed by author.
- **Columns/sample:** FULL 32 teams, Wk1-2: SF 65.3, MIA 33.3 (@RyanPaganetti, 2026-09-24 AM).
- **Status:** NEW — sweep (Sept 24 AM required item; dedup vs sfdata9ers cut below).

### Explosive play rate
- **Status:** ALREADY-COVERED — foundation. Sweep additions: author's verbatim "Explosive Play Rate: % of offensive plays gaining 10+ yards (rush) or 20+ yards (pass)" (@sfdata9ers, 2026-09-20); Marcus_Mosher big-play counts Wk1 (rush 10+/rec 20+; JAX 5/4=9) (@Marcus_Mosher, nflverse, 2026-09-18); SamHoppen explosive play rates Wk2 (BUF 15.4 total #1) (2026-09-22); statyxio defensive explosive pass % allowed (2026-09-18; ranks 19-32 only).

### Turnover margin / turnover luck
- **Status:** ALREADY-COVERED — foundation. Sweep addition: series results include TO% (@GridironInfo_).

### Yards per play / yards per pass attempt
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** BAL-NO recap: YPP 5.7|5.2|6.0; YPA 7.7|6.8|7.4 (@sfdata9ers, 2026-09-20). **Status:** NEW — sweep.

### Post-Game Win Expectancy (PGWE)
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @sfdata9ers. **Status:** NEW — sweep.

### % Game Time Favored
- **Definition (author, verbatim):** "% of game time with positive Vegas win probability." **Formula:** not disclosed by author.
- **Columns/sample:** BAL 99.3% vs NO 0.7% (@sfdata9ers, 2026-09-20). **Status:** NEW — sweep.

### EPA per drive
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** EPA/drive team tiers: SF top net tier; DAL strong off/weak def (@SamHoppen, nflfastR, 2026-09-22; PARTIAL: 4 standouts). **Status:** NEW — sweep.

### First-down-to-play ratio
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** "The Bills had 34 first downs on 66 offensive plays (excluding kneels), a 51.5% first down to play ratio. That has happened only one other time in 3,424 regular season games since the start of 2013." (@RyanPaganetti, 2026-09-18).
- **Status:** NEW — sweep.

### Series conversion / series results
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** DET-BUF: DET 14/69 TD/1st-down%; BUF 17/78 (@GridironInfo_, 2026-09-18); NYG-LAR drives & situations: Series conversion 52%/79%/71% (NYG/LA/NFL avg) (@GridironInfo_, 2026-09-22).
- **Status:** NEW — sweep.

### Red-zone EPA / red-zone conversion
- **Status:** ALREADY-COVERED — foundation (red-zone EPA). Sweep addition: Red Zone Conv 75.0%|55.9%|33.3% (BAL|avg|NO) (@sfdata9ers, 2026-09-20); redzone+/fieldzone+ tool (statrankings: red zone splits at 2/5/10/15/20 yards).

### CORE (CFB_Data — college)
- **Definition (author, verbatim):** "CORE (our 'points above average' metric)". Footer: "Average CFB team = 0. CORE = points above FBS average per 100 plays. Blend: 25% preseason expectation, 75% observed."
- **Formula:** stated as a blend: CORE = 0.75×observed + 0.25×preseason (parent's formula; the 25/75 blend is the author's).
- **Columns/sample:** Week 4 CORE: +20 UGA; +19 IND; −31 Clemson; −30 Florida (@CFB_Data, 2026-09-21). **Caveats:** small sample sizes; blend of preseason expectations and results.
- **Status:** NEW — sweep (college football; AGENTS-only, Garrett-directed one-off).

## Family: Situational / down-distance

### Late-down efficiency (3rd/4th down conversion)
- **Status:** ALREADY-COVERED — foundation. Sweep additions: 3rd Down Conv 30.0%|38.7%|56.3%; 4th Down Conv 50.0%|54.9%|— (BAL|avg|NO) (@sfdata9ers, 2026-09-20); first downs by down % (@GridironInfo_, 2026-09-22).

### Fourth-down aggressiveness (GoForIt%)
- **Definition (chart):** "4th DOWN AGGRESSIVENESS · HOW OFTEN TEAMS GO FOR IT · SHARE OF 4TH DOWNS WHERE TEAMS CALLED A PASS OR RUSH PLAY · WEEKS 1-2, EACH SEASON 2002-2026."
- **Formula:** not disclosed by author (rate = go-for-it 4th downs / all 4th downs, inferred by extractor — treat as inferred).
- **Date/account:** 2026-09-20 / @ngreenberg (ESPN's Neil Greenberg). **Source:** TruMedia (via Datawrapper). **Caveats:** TruMedia dead-end for independent access.
- **Status:** ALREADY-COVERED — foundation. New: 25-season trend line; TruMedia sourcing.

### Situation-neutral pace / neutral pace
- **Status:** ALREADY-COVERED — foundation. Sweep addition: PROE+ = PROE + Neutral Pace (@MagicSportsGuy).

### PROE (Pass Rate Over Expectation)
- **Definition:** pass rate over expectation. **Formula:** not disclosed by author.
- **Columns/sample:** PROE leaders Wk2 PARTIAL: DAL, PIT "above expected" (direction-only) (@SamHoppen, nflfastR, 2026-09-22).
- **Status:** NEW — sweep.

### PROE+ (Pass Rate Over Expectation + Neutral Pace) — @MagicSportsGuy
- **Definition (author):** "ICYMI, we created PROE+ last season, which combines Pass Rate Over Expectation + Neutral Pace." Also: "PROE+ = 'PASS RATE OVER EXP x PACE'" (StatRankings July 2026 OWS preview PDF).
- **Formula:** not disclosed by author.
- **Columns/sample:** Wk1: Titans +1.42 … Jets −0.04 (32 teams) (@MagicSportsGuy, StatRankings, 2026-09-15); Wk2: CAR +0.69 top, SEA −0.59 (32 teams, chg vs 2025) (@MagicSportsGuy, StatRankings, 2026-09-24 AM).
- **Status:** NEW — sweep (Sept 24 AM required item; also Part 4 composite).

### Under-center rate / under-center splits
- **Definition:** % of offensive snaps under center. **Formula:** not disclosed by author.
- **Columns/sample:** NFL: 2022 32.1%; 2023 27.7%; 2024 29.3%; 2025 33.8%; 2026 Wk1 41.3% (@SumerSports, 2026-09-16; kneels/spikes excluded; pistol not included). "Walker gained 148 of his 173 rushing yards on under center runs" (@NextGenStats).
- **Status:** NEW — sweep.

### Play-action rate
- **Definition:** % of plays with play action. **Formula:** not disclosed by author.
- **Columns/sample:** TB 25.5% PA (Wk1 leader) (@sfdata9ers, FTN, 2026-09-18). **Status:** NEW — sweep.

### Motion at snap %
- **Definition:** % of plays with motion at snap. **Formula:** not disclosed by author.
- **Columns/sample:** LAC 84.3% motion (Wk1 leader; author correction from SF 78.1%) (@sfdata9ers, FTN, 2026-09-18); NFL avg 37.9% Wk1-2; LAC 72.6 vs 28.1 in 2025 (@SumerSports, 2026-09-23); Alec Ingold led NFL 36.9% (min. 250 snaps) (@NextGenStats).
- **Status:** NEW — sweep (foundation mentions motion only via playcalling tendencies gap analysis; now a first-class metric).

### No-huddle rate / RPO rate / screen rate
- **Definition:** % of plays. **Formula:** not disclosed by author.
- **Columns/sample:** TEN & NO 22.1%/22.4% no-huddle; WAS 14.7% RPO (@sfdata9ers, FTN, 2026-09-18).
- **Status:** NEW — sweep.

### Personnel usage (11/12/21)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** 21 teams with new OCs, 2026 vs 2025: Dolphins 11 personnel 45.9→70.9 (@MagicSportsGuy, StatRankings, 2026-09-20); JAX 11 personnel 88.4%, up from 76.1% in 2025 (@SumerSports).
- **Status:** NEW — sweep.

### Backfield formation usage
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** RB+FB 110, RB+TE 108 (Wk1) (@RyanPaganetti). **Status:** NEW — sweep.

### Two-back vs middle-open coverages
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** 2026 Wk1 vs 2025 EPA/play rush/pass (@RyanPaganetti). **Status:** NEW — sweep.

### Tendency Rating (Y-Aware PCA) — @PattonAnalytics
- **Definition (author's reply):** "Tendency Rating" via Y-Aware PCA on personnel diversification / play sequencing / tendencies; "says it correlates well with EPA."
- **Formula:** not disclosed by author (Y-Aware PCA; component list partially described).
- **Columns/sample:** Leaders: Coen +0.27, Shanahan +0.18, Reich +0.14; lowest Monken −0.30 (approx bar reads) (@PattonAnalytics, StatRankings, 2026-09-17).
- **Status:** NEW — sweep (also Part 4 composite).

### Blitz rate
- **Definition:** % of dropbacks blitzed. **Formula:** not disclosed by author.
- **Columns/sample:** top-10 single-game blitz rates since 2022: MIN 2023 Wk3 82.0 (@SamHoppen, SumerSports, 2026-09-21); blitz tendency distribution: MIN 19.6/43.5/37.0 no/one/2+ (@sfdata9ers, FTN, 2026-09-18); Cashman 40.9% (@NextGenStats).
- **Status:** ALREADY-COVERED — foundation (pressure family). New: single-game historical leaderboard.

### QB aggressiveness (NGS)
- **Definition:** % of attempts with defender ≤1 yd at catch/incompletion. **Formula:** not disclosed by author.
- **Columns/sample:** Willis MIA 22 (@GridironInfo_, NGS, 2026-09-17). **Status:** ALREADY-COVERED — foundation (pressure/accuracy family). New: team-by-QB table.

### Time to throw
- **Status:** ALREADY-COVERED — foundation. Sweep additions: CPOE vs TTT scatter (Lawrence 2.95s/+17, Mayfield 2.85/+16 approx, NGS) (@sfdata9ers, 2026-09-18); Wk3 fastest: Kyler Murray 2.39s (@NextGenStats); depth-bucket TTT (Lawrence: Behind LOS 1.74s … Deep 4.43s) (@rjanalytics7002).

### Play-clock drain
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** approx read: NYG 3.9s, NYJ 5.2s (@RyanPaganetti, 2026-09-18). **Status:** NEW — sweep.

### Six-up rate
- **Definition:** six-defenders-up pre-snap rate. **Formula:** not disclosed by author.
- **Columns/sample:** MIN 62.7, DEN 25.7 (@RyanPaganetti, 2026-09-18). **Status:** NEW — sweep.

### Middle-third target rate
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** IND 60.0% (15/25) (@RyanPaganetti, 2026-09-18). **Status:** NEW — sweep.

### % of plays run while trailing
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** PARTIAL: ATL 95, WAS 90 (@RyanJ_Heath, 2026-09-22). **Status:** NEW — sweep.

### Opponent-coach splits (Fantasy Points)
- **Definition:** "These are new pages with per-coach splits for every team + player. We did this for 4 coaches in 2025, but expanded to all 32 in 2026. 100% of the data is from our charting team."
- **Formula:** not disclosed by author.
- **Columns/sample:** McBride vs Mike Macdonald (SEA 2025): 19 targets / 25.7% TGT / 34.5% TPRR / 1.95 YPRR / 13.7 FP per game (@FantasyPtsData, 2026-09-20).
- **Status:** NEW — sweep.

### Similarity Finder (Fantasy Points)
- **Definition:** SIM score (historical WR season comps). "Parker Washington (Week 1 2026) vs 50 historical WR season comps, top 10 shown." **Formula:** not disclosed by author ("9 of 144 usage stats weighted").
- **Columns/sample:** SIM score (Hill 2023 42.4, Nacua 2025 40.4, JSN 2025 37.2...), FP/G, XFP/G, RTE%, TGT%, TPRR, YPRR, ADOT, 1st-read%, 1st-downs/route; same-position-only comps (@FantasyPtsData, 2026-09-16). **Caveats:** one-game samples.
- **Status:** NEW — sweep.

### Age derivative / peak ages (Matt_barlowe)
- **Definition:** spline of EPA vs age; "the age derivative chart shows the year-over-year performance delta by age." **Formula:** not disclosed by author (spline; exact form not given).
- **Columns/sample:** peak ages RB 24.53 / WR 25.33 / QB 26.67 (@Matt_barlowe, 2026-09-21; AGENTS-only, Garrett-directed one-off).
- **Status:** NEW — sweep.

### Snap-weighted age
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** offense Wk1: MIA 24.95; defense Wk1: MIA 25.70 (@sfdata9ers, 2026-09-17; KC figure disputed).
- **Status:** NEW — sweep.

### Injury recovery chart (@jmthrivept)
- **Definition:** play-probability Wk2–Wk6 + pre-injury vs post-return PPG. **Formula:** not disclosed by author.
- **Columns/sample:** Ladd McConkey, Day-to-Day rib, Wk2 73%, 17.0→15.6 (@jmthrivept, own historical injury tracking, 2026-09-17).
- **Status:** NEW — sweep.

## Family: Pass protection / pressure

### Pressure rate
- **Status:** ALREADY-COVERED — foundation. Sweep additions: NGS-published 75% threshold — "A pass rush becomes a pressure when pressure probability exceeds 75 percent" (nfl.com, Sep 21, 2023); three ML models (GNN, random forest, blocking-matchup); pressure rate (avg rusher 10.3%); time to pressure = snap to first pressure (avg 2.9s); pressure rate over expected = avg PP − PP at snap. Generated × allowed 32-team table (KC 56.3/39.4 … MIA 6.5/40.5) (@hawkblogger, FTN charting, 2026-09-18).

### Pressure-to-sack rate
- **Definition:** sacks / pressures. **Formula:** not disclosed by author (standard ratio).
- **Columns/sample:** Bryce Young 2nd in NFL 2026: 15.8%; career 21.3% (@benlinsey_, 2026-09-21); lowest Wk2 (min 10 pressures): Purdy 0.0% (0/15), Daniels 4.2% (1/24) (@PFF, 2026-09-24 AM, https://x.com/PFF/status/2103119511427969436).
- **Status:** NEW — sweep (Sept 24 AM required item; foundation has pressure rate but not P2S).

### PRWR / PBWR (ESPN pass rush/block win rates)
- **Status:** ALREADY-COVERED — foundation. Sweep additions: multiple providers — SumerSports PRWR tables (BucsJuice edge table Wk2: Bosa 44.4%, T. Williams 32.4%; JacobBarzilla Texans DL: Hunter 52.4%, Anderson 52.4%); Deone Walker interior pressure 17.4% vs 8.4% league avg (@SumerSports, 2026-09-17); Greg Rousseau 30.6% PRWR through 2 weeks (@AaronQuinn716).

### Double-team rate × win rate
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** Dexter Lawrence 75% double-team rate (1st, min 20 pass rush snaps) (@PFF, 2026-09-19); NGS: Chris Jones 38.5%/30.0%, Byron Young 27.3%/33.3%, Kobie Turner 40.0%/25.0%; Osa Odighizuwa 32 pressures when doubled (2nd since 2024); Dexter Lawrence 66.7% double-team rate × win rate (Wk3).
- **Status:** NEW — sweep.

### Get-off — NGS
- **Definition:** inferred from usage: time from snap to first pass-rush movement. **Formula:** not disclosed by author. **Columns/sample:** 0.70 Van Ness, 0.69 Hendrickson (Pass Rush Chart stat boxes); Trey Hendrickson fastest get-off 0.76s (Wk3) (@NextGenStats).
- **Status:** NEW — sweep.

### Quick pressures — NGS
- **Definition (post text):** "under 2.5 seconds." **Formula:** not disclosed by author. **Columns/sample:** Cashman 7 quick pressures; Van Ness 5 (@NextGenStats).
- **Status:** NEW — sweep.

### Time to pressure — NGS
- **Definition (post text):** "Cashman averaged 1.88 seconds to pressure." **Formula:** not disclosed by author. **Columns/sample:** Linderbaum allowed pressure in avg 3.64 seconds (2nd-longest among centers, min. 250 pass blocks) — time to pressure allowed (OL).
- **Status:** NEW — sweep.

### Fastest sacks (mph) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Week 3: Will Anderson Jr. 18.79; Jaelan Phillips 18.66 (@NextGenStats).
- **Status:** NEW — sweep.

### Pass Protection Ratings Composite — @benbbaldwin
- **Definition:** PFF grade 40% + SIS blown-block% 40% + ESPN PBWR 20%, rescaled 0–100. **Formula:** stated weights: 0.4×PFF + 0.4×SIS + 0.2×ESPN PBWR, rescaled 0–100.
- **Columns/sample:** SF 88, CHI 84 (@benbbaldwin, Wk3, 2026-09-23). **Status:** NEW — sweep (also Part 4).

### SIS blown block
- **Status:** ALREADY-COVERED — foundation. Sweep addition: used at 40% in Baldwin's composite.

### HB pass protectors / pass rushers (@hawkblogger)
- **Definition:** HB pass-protector pressure-rate grades (OT/OG/C, 150+ reps; blended 2026+2025). **Formula:** not disclosed by author.
- **Columns/sample:** "Garett Bolles, OT - DEN", -3.1, 777 reps; Aidan Hutchinson +4.7, 597 (@hawkblogger, HB Analytics, Sumer Sports charting, 2026-09-17).
- **Status:** NEW — sweep.

### Chip blocks faced — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** "Garrett faced a league-high 139 chip blocks" (2025) (@NextGenStats).
- **Status:** NEW — sweep.

### 4-man rush rate vs pressure rate
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** SF ~28% pressure on 86% 4-man (leader), PIT ~21% on 92% (heaviest 4-man) (@GridironInfo_, 2026-09-18; approx chart read; source "FTN Charting + nflverse PBP").
- **Status:** NEW — sweep.

### Blitz EPA (offense vs defense)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** CIN defense −1.49 EPA/play allowed when blitzing (best), NYJ offense +0.99 vs the blitz (best) (@GridironInfo_, 2026-09-18; approx chart read).
- **Status:** NEW — sweep.

### Blitz rate vs under-pressure rate (Shauncore)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @Shauncore. **Status:** NEW — sweep.

### Sack rate vs pressure rate (with/without player)
- **Definition:** "With Parsons: 9-3-1, 19.0 points allowed per game. Without him (Week 15 - Week 1): 0-6, 30.5 points allowed per game." **Formula:** not disclosed by author.
- **Columns/sample:** With Parsons Wks 1–14: ~30.5% pressure / ~7% sack; Without Wks 15–18: ~31.5% pressure / ~2.8% sack (@StickToTheModel, 2026-09-17; source "FTN Data via nflverse").
- **Status:** NEW — sweep.

### EPA per dropback vs under-pressure rate (@ScottBarrettDFB)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @ScottBarrettDFB. **Status:** NEW — sweep.

## Family: Coverage / matchup

### Coverage shell splits (CoverageIQ+, StatRankings)
- **Definition:** man/zone + 8 shells (C0/C1/C2/C3/C4/C6), 132 WR coverage stats. **Formula:** not disclosed by author.
- **Columns/sample:** Nacua vs C1/C3/C4 — C3: 41.96% TPRR (12th), 4.63 YPRR (7th) on 112 rts; Adams vs C1/C3 (@MagicSportsGuy, CoverageIQ+, 2025, 2026-09-18); BAL defense card: Man 33.3% (#9), Zone 66.7% (#24), C1 33.3% (#7), blitz 32.1% (#7) (@MagicSportsGuy, 2026-09-20).
- **Status:** NEW — sweep.

### WR Coverage Upgrades (projected YPPR) — @ThunderDanDFS
- **Definition (author's reply):** "I use the 2025 baseline and then project the YPPR based on their coverage splits vs the projected defensive coverage rates of their opponent." 80/20 blend (2025 baseline 80%, matchup-adjusted 20%).
- **Formula:** not disclosed by author (blend described, component formulas not).
- **Columns/sample:** projected YPPR: J. Watson 2.66; D. Wicks 2.26; E. Egbuka 2.20 (@ThunderDanDFS, 2026-09-20).
- **Status:** NEW — sweep.

### CB/WR alignment matchup mapping (StatRankings)
- **Definition:** "Alignment-based coverage assignments and positional target distribution · Built from Player Alignment+, CB Metrics+, CoverageIQ+ and Team Target Share." **Formula:** not disclosed by author.
- **Columns/sample:** Watson defended 80.8% of routes to offense's left (14.7% man / 85.3% zone); Nabers 79.2% perimeter/50.0% left vs Watson; Mooney 58.3% slot vs Lake (@MagicSportsGuy, NYG@LAR Wk2, 2026-09-18). **Caveats:** "All 2026 figures are Week 1, a one-game sample. 2025 figures are as such and are never blended with 2026."
- **Status:** NEW — sweep.

### Target Area Matchup board (statyx.io)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** 4×3 grid DEEP/INTERMEDIATE/SHORT/BEHIND LOS × L/M/R with target share %, REC/G, defensive rank (Likely vs LA MNF, @statyxio, 2026-09-19).
- **Status:** NEW — sweep.

### Coverage Matchup (statyx.io)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** LA coverage tendency 18% MAN/82% ZONE + Likely's by-coverage splits (MAN 7/3/3/36; ZONE 13/4/4/40) (@statyxio, 2026-09-19).
- **Status:** NEW — sweep.

### Throw distribution by depth and lane (statyx.io)
- **Definition:** none beyond metric names, with CPOE rationale. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @statyxio. **Status:** NEW — sweep.

### WR cushion vs separation (NGS)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** 4-quadrant cut, 75 WRs with NGS data (@GridironInfo_, NGS, 2026-09-21). **Status:** NEW — sweep.

### Passer rating allowed
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** Tyrique Stevenson +158.3 (@MagicSportsGuy, StatRankings, 2026-09-17). **Status:** NEW — sweep.

### Safety PD vs INT scatter (@StickToTheModel)
- **Definition:** "Branch touches more passes than any safety. Joseph steals more." / "Every safety with 30+ games from 2023 to 2025; above the gold line, more of his plays on the ball ended in his hands."
- **Formula:** not disclosed by author.
- **Columns/sample:** Kerby Joseph ~15.5 INT / ~25 PD; Brian Branch ~6 / ~38 (@StickToTheModel, 2026-09-17).
- **Status:** NEW — sweep.

### On/off-field splits — NGS
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** "When Hendrickson was on the field: 58.6% pressure rate... Without him: 20.0%."; Ravens +0.13 EPA/play with Ricard on field vs −0.09 without (@NextGenStats). Haynes vs Stephens on/off (Sumer blocking + nflverse) (@hawkblogger, 2026-09-21).
- **Status:** NEW — sweep.

### Dexter Lawrence effect (run defense with/without)
- **Definition:** yards per designed run allowed (with/without Lawrence effect). **Formula:** not disclosed by author.
- **Date/account:** 2026-09-21 / @RyanPaganetti. **Status:** NEW — sweep.

### Target EPA (DB) — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Kevin Byard −18.6 (4th-lowest among safeties); Jamel Dean −30.1 (lowest among outside CBs); Devin Bush −0.73 EPA per target (fewest of any defender targeted 25+ times) (@NextGenStats).
- **Status:** NEW — sweep.

### Yards per coverage snap — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Riq Woolen 0.5 in man coverage (fewest among outside CBs); Devin Bush 0.49 (2nd-fewest among LBs, min. 250) (@NextGenStats).
- **Status:** NEW — sweep.

### Cumulative WPA on interceptions — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Nahshon Wright added 64.3% (2nd among outside CBs, 2025) (@NextGenStats).
- **Status:** NEW — sweep.

### Completion % as field-side CB — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Cordale Flott 42.9% (4th-lowest, 20+ targets) (@NextGenStats).
- **Status:** NEW — sweep.

### Coverage classification — NGS
- **Definition:** NGS "classifies every coverage defenders' responsibility and matchups on every dropback" (AWS explainer video, Mar 31). **Formula:** not disclosed by author.
- **Status:** NEW — sweep.

### Box defenders faced
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Columns/sample:** BUF faced heaviest boxes Wk2: 6.91 avg, led SR 59.2% (@sfdata9ers, FTN, 2026-09-23); 2025: BAL 6.63 avg; Wk1 2026: LV 7.12 avg.
- **Status:** NEW — sweep.

### Defensive targets by position
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** Buccaneers 26% RB target share; Packers 36% TE share (highest) (@FantasyPtsData, 2026-09-16; sparse table).
- **Status:** NEW — sweep.

### Team target share by position
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** NYG + LAR 2025 vs Wk1 2026, WR/RB/TE (@MagicSportsGuy, StatRankings, 2026-09-18).
- **Status:** NEW — sweep.

## Family: Composite ratings

### Objective ratings (market-implied win%) — @benbbaldwin v2/v3/Week 2
- **Definition (author, verbatim):** "Market-implied win% vs. a league-average team on a neutral field". "The old version took point spreads from the next 2 weeks -> estimate how good a team is right now. New one uses lines as a starting point but solves for rating that best arrives at chances of winning division, conference, etc."
- **Formula:** not disclosed by author. **Computation notes:** Implied-SRS: regress spread on team-incidence matrix (intercept = HFA; 2021 market HFA ≈ 0.62); futures de-vig + blend weights unknown (inferred by extractor — treat as inferred).
- **Columns/sample:** v2 (DraftKings, 2026-09-18): LAR 72.8, MIA 24.2; v3 (Kalshi, 2026-09-19): 6 tiers; Week 2 (Kalshi): LAR 74.2, BUF 70.9.
- **Source:** DraftKings lines/futures (v2); Kalshi (v3/Week 2). **Caveats:** "This is not Super Bowl odds. It's how good each team would have to be to be consistent with published..."; home-field value "~2" per author; exact blend weights undisclosed.
- **Status:** NEW — sweep (also Part 4).

### Composite power ratings — @SamHoppen
- **Definition:** mean of six sources as expected spread vs avg team + std dev. **Formula:** stated: mean of ESPN FPI, nfelo, Inpredictable, Unexpected Points, FTN DVOA, PFF.
- **Columns/sample:** FULL 32 teams: BUF 5.8±0.6 (@SamHoppen, Wk3, 2026-09-22).
- **Status:** NEW — sweep (also Part 4).

### NFL SNAP ("Seven Numbers Assessing Performance") — @EaglesXsandOs
- **Definition:** none beyond name. **Formula:** not disclosed by author.
- **Columns/sample:** backtest ANY/A vs EPA/dropback margin 2010–2024: same-game ANY/A 80.9%, EPA 83.5%; predictive ANY/A 62.1%, EPA 62.6% (@EaglesXsandOs, 2026-09-18).
- **Status:** NEW — sweep (also Part 4).

### Weighted QB composite — @sfdata9ers
- **Definition:** weighted QB composite. **Formula:** stated weights: QBR 35%, EPA/play 25%, CPOE 15%, Bad Throw% 10%, Pressure-to-sack% 10%, Air yards/reception 5%.
- **Date/account:** 2026-09-18 / @sfdata9ers. **Source:** PFR. **Status:** NEW — sweep (also Part 4).

### "Nota del 1 al 10" — @RaritosFootball
- **Definition:** "La nota del equipo no es una opinión: es el resultado de un modelo que convierte métricas objetivas (EPA, success rate, presión…) en una calificación del 1 al 10."
- **Formula:** not disclosed by author (weighting unstated; player-side = mean of position percentiles per 2026-09-20 notes).
- **Columns/sample:** LAR 8.7, DET 8.5, WAS 8.3 … LV 3.8, CLE 3.4 (@RaritosFootball, 2026-09-20; data through 2026-09-15 update).
- **Status:** NEW — sweep (also Part 4).

### QB ratings top 10 — @RaritosFootball
- **Definition:** NOTA, dropbacks, EPA/DB, éxito %, pases al objetivo %, presiones→sack %. **Formula:** not disclosed by author.
- **Columns/sample:** Geno Smith 9.3 (26 DB), C. Williams 7.0 (@RaritosFootball, 2026-09-20).
- **Status:** NEW — sweep.

### xFP (Expected Fantasy Points) — StatRankings
- **Definition:** proprietary expected fantasy points; "models were built by our NFL Data Scientist." **Formula:** not disclosed by author.
- **Columns/sample:** xFP leaders: St. Brown 24.9; M. Golden 23.4; Olave 23.0; FP−xFP: C. Watson +17.7; DK Metcalf −10.2 (@MagicSportsGuy, StatRankings, 2026-09-15).
- **Status:** NEW — sweep.

### DVOA / DAVE / DYAR
- **Status:** ALREADY-COVERED — foundation. Sweep additions: DVOA ownership — "DVOA, originally developed by Aaron Schatz under 'Football Outsiders,' has transitioned to FTN as its exclusive home (August of 2023)"; FTN DVOA is an Enterprise add-on "going back to 1979"; Aaron Schatz = FTN Chief Analytics Officer; FTN Data business intel (see Part 3).

### ESPN FPI
- **Status:** ALREADY-COVERED — foundation. Sweep addition: FPI is one of six inputs to SamHoppen's composite.

### PFF grades
- **Status:** ALREADY-COVERED — foundation. Sweep additions: PFF single-game defensive grade (Deone Walker 93.0 Wk2); PFF receiving grade vs man/zone; PFF as input to composites.

### SIS Total Points
- **Status:** ALREADY-COVERED — foundation. (No new sweep instances inventoried.)

## Family: Betting / survivor

### Survivor future value (@cmain7)
- **Definition:** survivor future value by team (normalized 0–100) + Wk2 win prob. **Formula:** not disclosed by author.
- **Columns/sample:** BUF 100.0, 67.4% (@cmain7, 2026-09-17). **Status:** NEW — sweep.

### Schedule-adjusted survivor entry EV (@cmain7)
- **Definition:** "Current Entry EV by Week 1 Team Used" (schedule-adjusted EV per surviving entry; $1,341 flat-equity baseline). **Formula:** not disclosed by author.
- **Columns/sample:** Raiders $1,559, Cardinals $1,559, Jets $1,559 (@cmain7, 2026-09-18). **Caveats:** "these are NOT from a full-season contest sim. They do account for remaining schedule/win probability and current field composition."
- **Status:** NEW — sweep (also Part 4).

### Kalshi odds dashboards (@GridironInfo_)
- **Definition:** prediction-market implied probabilities (Kalshi) across futures. **Formula:** not disclosed by author.
- **Columns/sample:** last-undefeated team (BAL/BUF 16% each), MVP (Allen 17%, Jackson/Williams 12%), CPOTY (Mahomes 50%) (@GridironInfo_, 2026-09-18).
- **Status:** NEW — sweep.

### Playoff probabilities (Kalshi, @GridironInfo_)
- **Definition:** none beyond metric names. **Formula:** not disclosed by author.
- **Columns/sample:** PARTIAL: SF 76, PHI 73, SEA 73, LAR 72 (@GridironInfo_, Kalshi, 2026-09-22).
- **Status:** NEW — sweep.

### 2nd-half DK scoring splits (@MagicSportsGuy)
- **Definition:** none beyond metric name. **Formula:** not disclosed by author.
- **Date/account:** 2026-09-20 / @MagicSportsGuy. **Source:** StatRankings. **Status:** NEW — sweep.

### Rookie debut WR game-1 comparison (@DevyEusuf)
- **Definition:** "Parker Washington's NFL debut was the best rookie debut for a WR since Jaxon Smith-Njigba in 2023." **Formula:** not disclosed by author.
- **Columns/sample:** Parker Washington 8/6/93/1 TD/20.7 PPR; JSN (2023) 8/5/65/1 TD (@DevyEusuf, PFF, 2026-09-18).
- **Status:** NEW — sweep.

### Rushing EPA/gm vs rushing TDs/gm (@MediJo20)
- **Definition:** gridironviz.co "EPA: Running Backs + Quarterbacks" dashboard; "QB runs are more than just first downs and touchdowns; they're scoring plays and game script breakers."
- **Formula:** not disclosed by author.
- **Date/account:** 2026-09-19 / @MediJo20 (quoting @WillBrinson). **Source:** gridironviz.co.
- **Status:** NEW — sweep.

### Draft prospect tracking (@NextGenStats)
- **Definition:** NGS Draft Model scores — Overall / Production / Athleticism (0–100; 50/60/75/90/100 = <AVG/AVERAGE/GOOD/ELITE) + Raw ATH (10.0 scale). **Formula:** not disclosed by author.
- **Columns/sample:** Harold Perkins 4.49 40; Ugo Bernard Athleticism 96 (1st), Raw ATH 10.0 (1st); Jeremiyah Love Overall 94 (3rd among RBs behind Bijan 96, Saquon 96); David Bailey production 98 (3rd among edges last 10 classes behind Young 99, Will Anderson 99).
- **Status:** NEW — sweep.

### Kicker makes over expected — NGS
- **Definition:** none printed. **Formula:** not disclosed by author. **Columns/sample:** Fairbairn 44/48 FG in 2025, 3rd-most makes over expected (+6.1) (@NextGenStats).
- **Status:** NEW — sweep.

### Special-teams EPA
- **Status:** ALREADY-COVERED — foundation. Sweep additions: kickoff avg drive start (@sfdata9ers); ST EPA in game recaps.

### Strength-of-schedule adjustment
- **Status:** ALREADY-COVERED — foundation. Sweep addition: remaining SOS from market-implied ratings (@benbbaldwin, 2026-09-18): "site-adjusted average remaining-opponent win% vs league-average team, 15–16 games"; ARI 55.6 hardest … NO 43.4 easiest.

### Weather / rest / travel
- **Status:** ALREADY-COVERED — foundation. (No new sweep instances inventoried.)

### Separation / open rate
- **Status:** ALREADY-COVERED — foundation. Sweep additions: NGS target separation; DynatyzeFF separation × TPRR scatter; @DevyEusuf separation composites.

### Havoc rate / stuff rate
- **Status:** ALREADY-COVERED — foundation. (No new sweep instances beyond run stuffs above.)

### RBWR / RSWR (ESPN run block/stop win rates)
- **Status:** ALREADY-COVERED — foundation. (No new sweep instances inventoried.)


## Additions — reconciled from sweep-email Part B + PART C dossiers (2026-09-24)

# NOTE: Baldwin pass-protection composite omitted here — already in part1-draft.md as
# "Pass Protection Ratings Composite — @benbbaldwin" (40/40/20 formula stated).

## Family: Composite / proprietary ratings

### Field Vision Havoc Ratings (defense) — @The_Coach_A
- **Definition (author wording):** individual player impact modeled play-by-play from years of NFL play-by-play data; output as a 0–100 percentile *within each position group, scheme-adjusted* (man vs zone splits for DBs, run-defense vs pass-rush splits).
- **Formula:** not disclosed by author (proprietary Field Vision play-by-play impact model).
- **Columns/sample:** Christian Benford #1 CB 2024 (Havoc 95.0, zone grade 90.2, 18.6 rec yds/gm allowed) — cited example.
- **Date/account:** 2026-09-17 / @The_Coach_A (Cody Alexander, Head of Football Operations, Field Vision Sports).
- **Source:** Field Vision proprietary PBP impact model. **Post content note:** post bodies for the 8-post Sept 17 batch were NOT retrievable (X login wall); characterized from public sources. https://www.fieldvisionsports.com/stories/introducing-field-visions-havoc-rate
- **Status:** NEW — sweep.

### Field Vision Threat Ratings (offense) — @The_Coach_A
- **Definition (author wording):** offensive counterpart to Havoc Ratings; individual player impact modeled play-by-play; 0–100 percentile within each position group.
- **Formula:** not disclosed by author (proprietary Field Vision model).
- **Date/account:** 2026-09-17 / @The_Coach_A (Cody Alexander).
- **Source:** Field Vision proprietary. **Caveats:** post content not retrievable; characterized from public sources only.
- **Status:** NEW — sweep.

### SumerScore — @SumerSports
- **Definition:** SumerSports proprietary composite metric (listed among their brand metrics alongside EPA, personnel tendency tables, frame-level completion/sack probability, coverage metrics, yards created).
- **Formula:** not disclosed by author (proprietary SumerSports).
- **Date/account:** 2026-09-17 / @SumerSports (brand dossier entry).
- **Source:** SumerSports own charting/modeling. **Caveats:** no construction detail published in the covered window.
- **Status:** NEW — sweep (not in foundation metric list).

### Impact Play — @SumerSports
- **Definition (author wording, verbatim):** "When a player meaningfully outperforms expectations for their role, the play is surfaced as an Impact Play."
- **Formula:** not disclosed by author (exact model undisclosed).
- **Date/account:** 2026-09-23 / @SumerSports.
- **Source:** SumerSports own charting/modeling.
- **Status:** NEW — sweep.

### RAS — Relative Athletic Score (Kent Lee Platte)
- **Definition (author wording):** Relative Athletic Scores for draft prospects and historical players — position-adjusted combine/pro-day size, speed, explosion and agility compressed to a 0–10 historical scale.
- **Formula:** stated construction (position-adjusted athletic measurements compressed to 0–10); exact component weights not disclosed by author.
- **Date/account:** 2026-09-17 / @MathBomb (Kent Lee Platte, RAS.football creator).
- **Source:** RAS.football (combine/pro-day data).
- **Status:** NEW — sweep (not in foundation metric list).

### Offseason Improvement Index — Kevin Cole
- **Definition (author wording):** built on projected roster point differential — quantifies how much better or worse teams got on paper each offseason.
- **Formula:** not disclosed by author.
- **Date/account:** 2026-09-17 / @KevinCole___ (Unexpected Points; former PFF data scientist).
- **Source:** author-built roster-change model.
- **Status:** NEW — sweep.

### nfelo — NFL Elo (Robby Greer)
- **Definition (author wording):** open NFL Elo rating system with game predictions, betting-model context and Weighted EPA components.
- **Formula:** stated construction (Elo system, public; exact parameters in project docs).
- **Date/account:** 2026-09-17 / @greerreNFL (Robby Greer, independent; nfelo creator/maintainer).
- **Source:** author's open project; project docs invite DMs with comments and questions.
- **Status:** NEW — sweep.

## Family: Fantasy / trade analytics

### Fantasy Football Trade Chart — @kylem_ff (Fantasy Points)
- **Definition:** weekly Fantasy Football Trade Chart & Rankings with FPOE, FP/S, buy/shop/sell trend coding.
- **Formula:** trade-value scale 0–100 (author's weekly rankings); FPOE/FP/S defined below.
- **Columns/sample:** Jahmyr Gibbs #1 RB trade value 80.0; James Cook 62.5 with −3.1 FPOE (sell-high signal); Amon-Ra St. Brown 70.0; Josh Allen top QB; Jared Goff 16.4 FPG / 0.23 FP/S.
- **Date/account:** 2026-09-17 / @kylem_ff (Kyle Menton, Fantasy Points; weekly trading-guide series covering top-50 rest-of-season players with trade outlooks/packages).
- **Source:** Fantasy Points. **Post content note:** post body not retrievable; values via Garrett's supplied breakdown.
- **Status:** NEW — sweep.

### FPOE (Fantasy Points Over Expectation — Fantasy Points trade-chart variant)
- **Definition (author's chart):** FPOE = XFP − FPG (inverted sign vs the usual naming: negative FPOE = player OUTscoring expectation).
- **Formula:** stated (XFP − FPG) with the inverted-sign convention.
- **Columns/sample:** James Cook −3.1 FPOE (sell-high signal).
- **Date/account:** 2026-09-17 / @kylem_ff (Fantasy Points).
- **Source:** Fantasy Points. **Caveats:** sign convention is inverted relative to the usual "over expectation" naming.
- **Status:** NEW — sweep.

### FP/S (fantasy points per snap)
- **Definition:** fantasy points / snap.
- **Formula:** stated construction (fantasy points divided by snaps).
- **Columns/sample:** Jared Goff 0.23 FP/S.
- **Date/account:** 2026-09-17 / @kylem_ff (Fantasy Points).
- **Source:** Fantasy Points.
- **Status:** NEW — sweep.

### Cost of Drops — @sfdata9ers
- **Formula (author, displayed):** `Air EPA + expected YAC EPA - Actual EPA`.
- **Definition:** charted drops cost a team the air EPA plus expected YAC EPA, minus what the play actually produced.
- **Date/account:** 2026-09-23 / @sfdata9ers.
- **Source:** FTN-charted drops.
- **Caveats:** chart rows 22 and 25 had unreadable orange team logos (partial read).
- **Status:** NEW — sweep.

## Family: QB charting / distribution

### QB EPA inside vs outside the pocket — @Doug_Analytics
- **Definition:** every starting QB's EPA/play split inside vs outside the pocket.
- **Formula:** not disclosed by author (nflverse-style play-by-play EPA).
- **Columns/sample:** Geno Smith slightly above average both (2024); full starting-QB chart.
- **Date/account:** 2026-09-17 / @Doug_Analytics (SI.com-cited chart; via @SettingTheEdge).
- **Source:** nflverse-style play-by-play.
- **Status:** NEW — sweep.

### QB Read Distribution — @sfdata9ers
- **Definition:** first read, second read, designated receiver, checkdown, scramble shares, plus average time to throw.
- **Formula:** not disclosed by author (charting construction).
- **Columns/sample:** full-QB chart (2026-09-23); "J.Strand" in the chart is likely a chart-read error (possibly Jaxson Dart) — unconfirmed.
- **Date/account:** 2026-09-23 / @sfdata9ers.
- **Source:** author charting.
- **Status:** NEW — sweep.

### Pure-dropback pressure rate (SumerSports framing)
- **Definition:** offensive-line pressure allowed framed on pure dropbacks (excludes play-action, screens, rollouts — SumerSports framing).
- **Formula:** not disclosed by author (SumerSports charting).
- **Date/account:** 2026-09-23 / @SumerSports.
- **Source:** SumerSports charting.
- **Status:** NEW — sweep.

## Family: WR rankings

### PFF top-32 NFL wide receiver rankings
- **Definition:** PFF's ranked top-32 wide receivers; ordered by yards per route run.
- **Formula:** not disclosed by author (PFF grades/charting underneath).
- **Columns/sample:** 1. Jaxon Smith-Njigba (5.54 YPRR through first two weeks); 2. Jefferson; 3. Nacua; 4. Chase; 7. Olave; 24. Coker; remaining ranks not transcribed.
- **Date/account:** 2026-09-24, 8:19 AM CDT / @PFF. Post URL: https://x.com/PFF/status/2103112176990822716. Post text (verbatim): "Jaxon Smith-Njigba is No. 1, averaging 5.54 yards per route run through the first two weeks. Jefferson, Nacua, Chase round out the top four; Olave No. 7; Coker No. 24."
- **Source:** PFF (own grades; full list on pff.com, not in the post).
- **Caveats:** only named ranks available; full list behind pff.com link.
- **Status:** NEW — sweep.

## Family: Special teams / hidden yardage

### Special-teams EPA/play (kickoff vs punt coverage) — @sfdata9ers
- **Definition:** EPA/play on kickoff and punt coverage units.
- **Formula:** not disclosed by author (nflverse play-by-play EPA, public method; their own construction).
- **Columns/sample:** SF dead last in both through Week 10 2024: −11 EP on kickoffs, −22 on punts (NBC Sports Bay Area, Nov 2024).
- **Date/account:** 2026-09-17 / @sfdata9ers.
- **Source:** nflverse play-by-play EPA (public method); penalty-EPA construction is their own (exact formula unverified).
- **Status:** NEW — sweep.

### Expected points gained from penalties on no-yardage plays — @sfdata9ers
- **Definition:** expected points gained from penalties on plays that otherwise went for no yardage.
- **Formula:** not disclosed by author (their own construction; exact formula unverified).
- **Columns/sample:** NYG 51.9 … SF 13.9 (32nd) (SI.com, Dec 31, 2025).
- **Date/account:** 2026-09-17 / @sfdata9ers.
- **Source:** author's own construction on nflverse play-by-play.
- **Status:** NEW — sweep.

### Kickoff-coverage opponent starting field position — @sfdata9ers
- **Definition:** opponent average starting field position after kickoff coverage.
- **Formula:** stated construction (average starting yard line on kickoff returns).
- **Columns/sample:** SF worst at the 33.8-yard line (2025) (SI.com, Sept 23, 2025).
- **Date/account:** 2026-09-17 / @sfdata9ers.
- **Source:** play-by-play field-position data.
- **Status:** NEW — sweep.

## Family: Draft

### NFL draft-pick probability models (Monte Carlo) — @Doug_Analytics
- **Definition:** Monte Carlo over remaining schedule producing draft-pick position probabilities.
- **Formula:** not disclosed by author (Monte Carlo; exact sim engine unverified).
- **Columns/sample:** Bengals 59.1% at pick 11, 25.5% at 12, 15% at 8–10 (2026 draft; SI.com, Dec 30, 2025).
- **Date/account:** 2026-09-17 / @Doug_Analytics.
- **Source:** schedule + standings for sims (nflverse-style play-by-play).
- **Status:** NEW — sweep.

## Family: Athletic testing

(See RAS — Relative Athletic Score, above, filed under composite/proprietary ratings.)

## Family: Tracking / receiver analytics

### ESPN Receiver Tracking Metrics — Seth Walder
- **Definition:** ESPN's receiver tracking metrics (Walder's coverage area).
- **Formula:** not disclosed by author (ESPN proprietary).
- **Date/account:** 2026-09-17 / @SethWalder (ESPN analytics writer; pass-rush and pass-block win rates, receiver tracking metrics).
- **Source:** ESPN (NGS tracking data underneath).
- **Status:** NEW — sweep.

## Family: Decision science

### nfl4th fourth-down bot (theScore)
- **Definition:** automated fourth-down recommendation bot; decision rule: "go when the model's win-probability-maximizing recommendation says go."
- **Formula:** stated construction (nflfastR play-by-play; expected-points and win-probability models underneath).
- **Track record (public):** using his code and data, theScore found teams went for it in toss-up situations 16.8% (2019) → 18.1% (2020) → 26.5% (early 2021) — the league moved toward the model.
- **Date/account:** 2026-09-17 / @theScore (jetsxfactor.com, Feb 20, 2023: "No team should ever punt on 4th & 3 in a game they are losing."; CRAN nfl4th docs, published 2023-08-21).
- **Source:** open-source nfl4th package.
- **Status:** NEW — sweep.

## Family: Run-lane charting (statyx.io sub-features)

### Run-lane interaction — statyx.io
- **Definition:** run-lane interaction analysis within the Rush Path package.
- **Formula:** not disclosed by author (statyx.io own platform).
- **Date/account:** 2026-09-18 / @statyxio.
- **Source:** statyx.io own platform.
- **Status:** NEW — sweep.

### Mapped carries — statyx.io
- **Definition:** mapped carries visualization within the Rush Path package.
- **Formula:** not disclosed by author (statyx.io own platform).
- **Date/account:** 2026-09-18 / @statyxio.
- **Source:** statyx.io own platform.
- **Status:** NEW — sweep.


---

## 2. Dedup / overlap map

## 1. 1st-and-10 4+ yard % — Ryan Paganetti full list vs sfdata9ers cut
- **Ryan Paganetti** (2026-09-24 AM): FULL 32-team list, Wk1–2, % of 1st-&-10 plays gaining 4+ yards (SF 65.3, MIA 33.3). CSV: `ryanpaganetti-first-10-gain-4-plus-pct-week2.csv`.
- **sfdata9ers** (earlier cut): partial/earlier version of the same family.
- **Relationship:** same metric family; Paganetti's is the complete 32-team Wk1–2 table. These instances belong to the same metric family and are counted once.

## 2. PROE vs PROE+
- **PROE** (Pass Rate Over Expectation): @SamHoppen Wk2 leaders, direction-only (DAL, PIT above expected), nflfastR, 2026-09-22.
- **PROE+** (PROE + Neutral Pace): @MagicSportsGuy, StatRankings proprietary; Wk1 full 32 (2026-09-15), Wk2 full 32 (2026-09-24 AM).
- **Relationship:** PROE+ is a superset composite built on PROE. PROE alone is the nflfastR-replicable component; PROE+ adds neutral pace with undisclosed formula.

## 3. Success-rate variants
- **(a) EPA > 0:** @sfdata9ers game-recap definition (verbatim): "Success Rate: % of offensive plays with EPA > 0." (2026-09-20)
- **(b) 40/60/100 line-to-gain:** Football Outsiders convention — gain ≥40% of line-to-gain on 1st, ≥60% on 2nd, 100% on 3rd/4th (foundation catalog, 2026-09-17).
- **(c) 50/70/100:** Bill Connelly/college convention (foundation catalog, 2026-09-17).
- **(d) sfdata9ers BUF rushing summary:** "Successful play (down & yds gained vs. yds-to-go): 1st ≥ 40%, 2nd ≥ 60%, 3rd & 4th ≥ 100%." (2026-09-18)
- **Relationship:** three distinct definitional families; (a) and (d) are different authors using different conventions — the definitions differ by author and are recorded separately.

## 4. Rush IQ / Runner Evidence — repeated instances
- **statyx.io Rush Path package** appears THREE times: Jahmyr Gibbs (via @32BeatWriters), James Cook (@statyxio), Bucky Irving (@statyxio) — same tool, three player instances (2026-09-16/18).
- **Relationship:** one metric family, three instantiations. Catalog once; note the three player cuts.

## 5. Coverage split tables vs coverage-weighted matchup projections
- **Coverage split tables** (descriptive): MagicSportsGuy CoverageIQ+ shell splits; DBro_FFB DS2 splits; FantasyFFData data dump; statyxio man vs zone YPRR.
- **Coverage-weighted matchup projections** (predictive): @ThunderDanDFS WR Coverage Upgrades (2025 baseline × projected opp coverage splits, 80/20 blend); MagicSportsGuy CB/WR alignment matchup mapping.
- **Relationship:** descriptive splits are inputs to the predictive projections. These instances belong to the same metric family and are counted once; the projection adds the opponent-coverage-mix layer.

## 6. Multiple PRWR providers
- **ESPN PRWR/PBWR** (foundation; ESPN proprietary).
- **SumerSports PRWR** (@BucsJuice edge table; @JacobBarzilla Texans DL; Deone Walker interior pressure).
- **Relationship:** same metric name, different providers/charting. Provider tag is load-bearing — values derive from different provider models.

## 7. Objective ratings versions
- **v2** (2026-09-18): DraftKings lines+futures; 5 tiers; LAR 72.8.
- **v3** (2026-09-19): Kalshi; 6 tiers.
- **Week 2** (2026-09-22): Kalshi; LAR 74.2, BUF 70.9.
- **Relationship:** same metric, three versioned releases with different market sources. Latest observed version: Week 2 (2026-09-22); versions retained for methodology comparison.

## 8. CPOE providers
- **NGS CPOE** (tracking model; XGBoost, 36k attempts).
- **PFF CPOE** (used in QB Accuracy Index).
- **nflfastR CPOE** (public model).
- **Relationship:** same name, three different expected-completion models. Values derive from different provider models.

## 9. EPA/DB vs EPA/play vs EPA/att
- **EPA per dropback** (@GridironInfo_, @tejfbanalytics, NGS).
- **EPA per play** (team; foundation).
- **EPA per attempt** (passing; @GridironInfo_ deep throws).
- **Relationship:** different denominators (dropbacks include sacks/scrambles; attempts don't). State the denominator.

## 10. xFP variants
- **StatRankings xFP** (@MagicSportsGuy, proprietary).
- **Fantasy Points backfield xFP** (@RyanJ_Heath, @FantasyPtsData).
- **Relationship:** same name, different providers and scopes (player vs backfield). Values derive from different provider models.

## 11. Motion rate providers
- **@sfdata9ers** (FTN charting): LAC 84.3% Wk1.
- **@SumerSports** (own charting): NFL avg 37.9% Wk1–2.
- **@NextGenStats** (tracking): Ingold 36.9%.
- **Relationship:** same metric, three charting sources. Values differ by provider.

## 12. Pressure rate providers
- **@hawkblogger** (FTN charting): generated × allowed 32-team.
- **@NextGenStats** (tracking): 75% pressure-probability threshold.
- **@SumerSports** (own charting): interior pressure.
- **Relationship:** same name, different methodologies. The NGS 75% threshold is the only published definition.

## 13. TPRR/YPRR providers
- **Fantasy Points Data Suite 2.0** (@ScottBarrettDFB, @DevyEusuf).
- **StatRankings** (@MagicSportsGuy).
- **Relationship:** standard formulas; provider differences are in charting/route denominators.

## 14. Game recap templates
- **@sfdata9ers** 15-metric card (BAL-NO, MIA-SF).
- **@GridironInfo_** 18-metric carousel (DET-BUF) + NYG-LAR drives/situations/offense/passing/receiving/rushing.
- **@SamHoppen** waterfall 10-facet recap.
- **Relationship:** three different recap formats; the metric families overlap (EPA, SR, explosive rate) but the templates are distinct.

## 15. Survivor metrics
- **Survivor future value** (@cmain7, normalized 0–100).
- **Schedule-adjusted survivor entry EV** (@cmain7, $ per entry).
- **Relationship:** future value is a team-level input; entry EV is the per-surviving-entry output. Not the same metric.

## 16. Rookie/debut benchmarks
- **@DevyEusuf** rookie debut WR game-1 comparison (Parker Washington vs JSN vs Jefferson).
- **@NextGenStats** draft prospect tracking (Draft Model scores).
- **Relationship:** different scopes (NFL debut game vs pre-draft). Not the same.

## 17. Separation metrics
- **NGS target separation** (tracking).
- **@DevyEusuf Separation Score / Separation Market Share / ADOR** (FP Data Suite 2.0, proprietary).
- **DynatyzeFF separation × TPRR scatter**.
- **Relationship:** "separation" as a word covers three different constructs. The DevyEusuf composites are proprietary; NGS separation is tracking-measured.

## 18. Deep passing metrics
- **Deep Pass % + Deep Pass EPA** (@NFL_University, "Data via NFL Pro").
- **EPA/att on 10+ air-yard throws** (@GridironInfo_).
- **ADOT** (@SumerSports).
- **Air yards buckets** (@GridironInfo_).
- **Relationship:** four cuts of the same downfield-passing family; different denominators and thresholds.


---

## 3. Data-access appendix

Every known public endpoint, access gate and price. No access rights implied beyond what was observed.

## StatRankings (statrankings.com)
- **Scale observed:** 400+ free stat pages (observed by 2026-09-24); 650+ advanced metrics; 675+ advanced NFL stats claimed; tools built on 1,048 stats; base stats back to 2000; advanced metrics since 2020; betting trends ATS/O/U/ML back to 2000.
- **Tools:** coverageIQ+ (man/zone + 8 shells, 132 WR coverage stats); statbuilder+; redzone+/fieldzone+ (red zone splits at 2/5/10/15/20 yards); customsplits+ (week-range splits); predictionmarkets+ (5 markets); oddsboard+ (live lines from 19 books, 2M+ markets, free, auto-refresh 5s, vig removed).
- **Pricing:** statrankings+ $139.99/year or $34.99/month; NFL Stats Archive CSV add-on +$60/yr (standalone $179.99/yr).
- **Gating:** advanced tables generally top-five preview/free, full table gated (statrankings+).
- **Provider:** undisclosed (launch release: 24+ yrs data; the provider remains undisclosed).
- **API:** no public API identified. MCP connectors (Claude/ChatGPT/Grok) require statrankings+ login.
- **NFL data sources (per July 2026 OWS preview PDF, verbatim):** "NFL DATA SOURCES: nflfastR and FTN Data. ADP via Underdog Fantasy and DraftKings."
- **Projection build recipe (verbatim):** "Built from the game down: team volume and efficiency first, then every player's share of it, layered with ARBY, xFP and our coverage data. Engineered by @PattonAnalytics, reviewed and adjusted player by player by Sam & Kevin."
- **CSV dump (2026-09-19 pull):** 1,048 numeric/string columns; 24 column families; season-level `2026_w1.csv` and `2025_season.csv`, 5 positions × 2 = 10 CSVs; no cumulative season-to-date CSV (must merge weeks); row grain "TEAM POS Player" with PLAYER_ID/ESB IDs; no GAME_ID/HOME/AWAY/FINAL SCORE. Slate fields: `dk_dollar_per_pt`, `ud_dollar_per_pt`, `value_rank_*`, `xfp_per_snap`, `fp_over_xfp_w1`.
- **Team:** Kevin Adams (founder; also founded FTN Fantasy/Data); Steven Patton (Head of DFS Strategy); Mark Garcia (Lead NFL Analyst & Director of NBA Projections); Sam Choudhury.

## Dynatyze (dynatyze.com/football/usage-lab)
- **Access:** public boards/usage views; account gates league sync/premium tools.
- **Observed:** QB completion% leaders + FPTS; carry-share leaders; backfield snap/carry distributions; separation × TPRR scatter.

## PFF (pff.com)
- **Access:** paid/proprietary grades (−2 to +2 per play). No exact rebuild without grades.
- **Observed:** QB Accuracy Index (new); lowest pressure-to-sack rate; double-team rate; most 20+ yard passes without completion; highest single-game defensive grade.

## Fantasy Points Data / Data Suite 2.0
- **Access:** paid, no public API. Proprietary charting (coverage/schematic).
- **Observed:** Separation Score/Separation Market Share/ADOR/Win Rate; Similarity Finder; Bellcow report; catchable vs uncatchable air yards; YACO/att & MTF per attempt; opponent-coach splits; Tyler Warren route profile; Mark Andrews comparison; advanced receiving tables.

## FTN / FTN Data
- **Pricing (B2B):** CSV Access $599; mid-tier flexible-priced API (all basic + charting NFL data incl. skill-position participation, charting history since 2019); enterprise white-label/custom feeds. DVOA is an Enterprise add-on "going back to 1979."
- **Marketing claims:** 750+ NFL data points, 20+ years historical, "50% less expensive than competition."
- **DVOA:** "originally developed by Aaron Schatz under 'Football Outsiders,' has transitioned to FTN as its exclusive home (August of 2023)." Aaron Schatz = FTN Chief Analytics Officer. (Timeline caveat: another FTN page says "In 2022, FTN Fantasy added DVOA to the arsenal" — licensing vs exclusivity unclear.)
- **Charting:** human team watches every play of every NFL + NBA game; turnaround ~24h; history back to 2019 (charting), 2021 (expanded participation). Lineage: Armchair Analysis (founded 2001) acquired by FTN Data in 2020.
- **Free subset:** nflverse/nflverse-ftn = FTN's sanctioned free subset — load_ftn_charting(), play-level charting (coverage, routes, motion, pressure) from 2022+, charted within 48h, CC-BY-SA 4.0 (attribute "FTN Data via nflverse").
- **Charting feed:** $5,000/yr commercial, $3,000/yr private; individual $69.99/yr.

## SumerSports / SumerPass
- **Pricing:** $10/week, $20/month, $100/year, seven-day trial.
- **API:** no public API verified 2026-09-18.
- **Observed:** interior pressure rate; gap-by-gap run outcomes; run stops; ADOT; under-center usage; vertical route share; motion at snap; YBC; pass performance by zone; Aaron Donald return tracking; 49ers YPDB histogram.

## TruMedia
- **Dead-end:** from the Greenberg GoForIt chart (TruMedia via Datawrapper). No independent access path identified.

## The Odds API v4
- **Sport key:** `americanfootball_nfl`.
- **Markets:** h2h/spreads/totals.
- **Books:** DraftKings/FanDuel/Pinnacle.
- **Note:** Garrett's account exists (baxley.garrett@gmail.com, 20K credits/month plan, $30/mo, since 2026-08-22). Key value not stored.

## nflverse / nflfastR
- **Role:** the free replicable core. nflfastR cleans PBP and applies EPA/WPA models. `load_nextgen_stats()` (player weekly NGS stats from 2016, full data dictionary at nflreadr.nflverse.com).
- **Free FTN subset:** nflverse-ftn (see FTN above).

## NFL / Next Gen Stats (proprietary)
- **Access:** NGS data is proprietary NFL tracking data. API dead-ends: api.nfl.com → 401; nextgenstats.nfl.com → 401; pro.nfl.com requires NFL Pro auth (not pursued).
- NGS data is proprietary; the record documents taxonomy and presentation patterns.
- **Public data/code:** Kaggle NFL Big Data Bowl datasets (2020 rushing; 2022 kickoff returns; 2023 pressure; 2024 tackling; 2026: predict 22-player positions for 4 frames post-throw); SumerSports SportsTrackingTransformer (GitHub); AWS-released SBP PyTorch code; nflverse `load_nextgen_stats()`.

## Kalshi
- **Access:** prediction-market prices; author (@benbbaldwin) asked a user for a scrapable Kalshi link (confirming no stable scrape path at the time).
- **Observed:** objective ratings v3/Week 2; playoff probabilities; GridironInfo_ odds dashboards.

## Other observed sources
- **ESPN:** FPI, PBWR/RBWR/RSWR, QBR (proprietary).
- **PFR (Pro Football Reference):** advanced passing (bad-throw data); used by @sfdata9ers (composite) and @GridironInfo_ (INT/bad-throw ratio).
- **SIS (Sports Info Solutions):** Total Points, blown blocks (used in Baldwin's pass-protection composite at 40%).
- **gridironviz.co:** EPA dashboards (@MediJo20).
- **NFL Pro / NFL official PBP:** "Data via NFL Pro" (@NFL_University); "Data from official NFL play-by-play description" (@sfdata9ers).
- **RotoBaller:** ThunderDanDFS matchup grades (PFF + FTN DVOA inputs).
- **Underdog Fantasy / DraftKings:** ADP sources (StatRankings); DK salaries (DFS).
- **statyx.io:** own platform (Rush IQ, Route IQ, coverage matchup boards).
- **HawkBlogger / HB Analytics:** Sumer Sports charting + FTN charting.
- **Establish The Run:** @cmain7 survivor metrics.


---

## 4. Composite / rating methodologies

Reverse-engineered as far as authors disclosed. Missing weights are marked "not disclosed by author" — never invented.

## Ben Baldwin objective ratings v2/v3/Week 2
- **What it is:** market-implied neutral-field win probability vs a league-average team.
- **Inputs:** near-term lines + division/conference/Super Bowl/playoff/#1 seed futures.
- **v2** (2026-09-18): footer said DraftKings. **v3** (2026-09-19): confirmed Kalshi blend. **Week 2** (2026-09-22): Kalshi.
- **Blend weights:** not disclosed by author. Computation notes (inferred by extractor — treat as inferred): implied-SRS via regressing spread on team-incidence matrix (intercept = HFA; 2021 market HFA ≈ 0.62); futures de-vig + blend.
- **Remaining SOS:** derived from the same ratings — "site-adjusted average remaining-opponent win% vs league-average team, 15–16 games."
- **Author caveats:** "This is not Super Bowl odds. It's how good each team would have to be to be consistent with published..."; home-field value "~2".

## Sam Hoppen composite power ratings
- **What it is:** mean of six sources as expected spread vs avg team + std dev.
- **Formula (stated):** mean of ESPN FPI, nfelo, Inpredictable, Unexpected Points, FTN DVOA, PFF.
- **Std dev:** captures model disagreement.
- **Sample:** BUF 5.8±0.6 (Wk3, 2026-09-22, FULL 32 teams).

## EaglesXsandOs NFL SNAP ("Seven Numbers Assessing Performance")
- **What it is:** 7-category composite; full seven-number formula not disclosed by author.
- **Backtest (author's reply, verbatim):** "@DisplacedHoosr NFL ANY/A vs. EPA/dropback margin, 2010–2024: Higher same-game efficiency won: • ANY/A: 80.9% • EPA: 83.5% Predicting future winners: • ANY/A: 62.1% • EPA: 62.6% EPA/db explains results better".
- **Other author replies:** "The least impactful of the 7, but still signal there"; "Kneeling out first half (0% win)".
- **Source:** author's own Syndicate 32 platform.

## cmain7 schedule-adjusted survivor EV
- **What it is:** "Current Entry EV by Week 1 Team Used" — schedule-adjusted EV per surviving entry ($1,341 flat-equity baseline).
- **What it is NOT:** "these are NOT from a full-season contest sim."
- **What it accounts for:** remaining schedule/win probability and current field composition.
- **Sample:** Raiders $1,559, Cardinals $1,559, Jets $1,559 (2026-09-18).

## Neil Greenberg GoForIt%
- **What it is:** % of 4th downs featuring a pass or rush play; 25-season trend (2002–2026, Weeks 1–2 each season).
- **Source:** TruMedia via Datawrapper. (TruMedia = dead-end for independent access.)

## Sam Hoppen EPA/WPA 10-facet decomposition
- **What it is:** waterfall game recap attributing total EPA and WPA to 10 facets per team.
- **Facets (per 2026-09-18 props report):** pass_off_epa, run_off_epa, pass_def_epa, run_def_epa, takeaway_epa, giveaway_epa, off_pen_epa, def_pen_epa, st_epa, other_epa (+ WPA analogues).
- **Facet-precedence rule:** inferred by extractor (turnovers > penalties > pass/run off > pass/run def > ST > other) — NOT confirmed by author. Treat as inferred.
- **Source:** nflfastR (confirmed). Fully replicable per the props report.
- **Sample:** MIN 9 @ CHI 3: Vikings Run Off +14.9 WPA, −4.49 EPA (2026-09-20).

## sfdata9ers weighted QB composite
- **Formula (stated weights):** QBR 35%, EPA/play 25%, CPOE 15%, Bad Throw% 10%, Pressure-to-sack% 10%, Air yards/reception 5%.
- **Source:** PFR (2026-09-18).

## Ben Baldwin pass-protection composite
- **Formula (stated weights):** PFF grade 40% + SIS blown-block rate 40% + ESPN PBWR 20%, rescaled 0–100.
- **Sample:** SF 88, CHI 84 (Wk3, 2026-09-23).

## PattonAnalytics Tendency Rating (Y-Aware PCA)
- **What it is:** "Tendency Rating" via Y-Aware PCA on personnel diversification / play sequencing / tendencies; author "says it correlates well with EPA."
- **Formula:** not disclosed by author (Y-Aware PCA; component list partially described).
- **Sample:** Coen +0.27, Shanahan +0.18, Reich +0.14; Monken −0.30 (approx bar reads, 2026-09-17).

## ARBY matchup rating (@MagicSportsGuy)
- **Formula (stated verbatim, full weighting tree):** "The formula weights 65% of the RB's 2025 performance and 35% of 2026 so far. On each side, it's 65% ARBY and 35% the RB's yards per carry. Then, offense and defense are each weighted 50/50."
- **In formula form:** Rating = 0.5 × [0.65×(0.65×ARBY₂₀₂₅ + 0.35×RB_YPC₂₀₂₅) + 0.35×(0.65×ARBY₂₀₂₆ + 0.35×RB_YPC₂₀₂₆)]_offense + 0.5 × [same]_defense (parent's derivation; the weighting words are the author's).
- **Validation (author's):** "our ARBY metric from the prior week (Wk 1) correctly predicted the top 6 RB scores of Week 2 … +2.5 DK points vs. projection correlation."
- **Sample:** Wk2: DET +2.07 … NO −1.18 (2026-09-19).

## RaritosFootball 1–10 composite
- **What it is:** team rating 1–10 built from EPA, success rate, pressure.
- **Definition (author):** "La nota del equipo no es una opinión: es el resultado de un modelo que convierte métricas objetivas (EPA, success rate, presión…) en una calificación del 1 al 10."
- **Formula:** not disclosed by author (weighting unstated; player-side = mean of position percentiles per 2026-09-20 notes).
- **Source:** SūmerLive (SumerSports live data); data through 2026-09-15 update.
- **Sample:** LAR 8.7, DET 8.5, WAS 8.3 … LV 3.8, CLE 3.4 (2026-09-20).

## PROE+
- **What it is:** PROE + Neutral Pace (@MagicSportsGuy, StatRankings).
- **Author definitions:** "ICYMI, we created PROE+ last season, which combines Pass Rate Over Expectation + Neutral Pace." / "PROE+ = 'PASS RATE OVER EXP x PACE'" (StatRankings July 2026 OWS preview PDF).
- **Formula:** not disclosed by author.
- **Samples:** Wk1: Titans +1.42 … Jets −0.04; Wk2: CAR +0.69 … SEA −0.59.

## Cardio Index (@MagicSportsGuy)
- **What it is:** route participation × lowest TPRR.
- **Formula:** not disclosed by author (product described, exact computation not stated).
- **Sample:** M. Harrison Jr. 87.1% route part, 0.07 TPRR (Wk2, 2026-09-22).

## Cost of Drops (@sfdata9ers)
- **What it is:** Air EPA + expected YAC EPA − Actual EPA; drops charted by FTN.
- **Formula:** stated as Air EPA + expected YAC EPA − Actual EPA (2026-09-18).
- **Samples:** Wk1: PIT 11.7, DAL 8.3; Wk1–2: PIT 19.9 on 5 drops (2026-09-23).

## SumerSports Impact Play
- **What it is:** "When a player meaningfully outperforms expectations for their role, the play is surfaced as an Impact Play." (author wording, verbatim; 2026-09-23)
- **Formula:** not disclosed by author (exact model undisclosed; SumerSports own charting/modeling).
- **Source:** @SumerSports.

## ThunderDanDFS matchup grades
- **What it is:** Week 2/3 offensive passing/rushing matchup grades + RB grades incorporating O-line.
- **Definition (author's):** "Grades reflect the overall quality of the opponent — the defensive matchup, how good the blockers are up front, the scheme they run, and how the back is used." "We also factor in game script."
- **Formula:** not disclosed by author. Composite f(DVOA, grades, role, script) 0–100 — black box.
- **Inputs (confirmed):** PFF (grades, O-line data) + FTN DVOA.
- **Caveats (author's):** "Grades intentionally reflect opponent and blocking, not the runner's individual elusiveness."
- **Related:** WR Coverage Upgrades — 2025 baseline 80% / matchup-adjusted 20% blend projecting YPPR from opponent coverage splits.

## "How elusive" (@AcccountStat)
- **What it is:** YAC per rush × avoided tackles per rush, averaged across NFL Pro / PFF / SumerSports.
- **Formula:** not disclosed by author (cross-source average).

## CORE (@CFB_Data — college)
- **Formula (stated as blend):** CORE = 0.75×observed + 0.25×preseason (parent's formula; the 25/75 blend is the author's).
- **Definition:** "points above FBS average per 100 plays"; average CFB team = 0.

## Similarity Finder (Fantasy Points)
- **What it is:** SIM score — historical WR season comps.
- **Formula:** not disclosed by author ("9 of 144 usage stats weighted").

## Separation Score / Separation Market Share / ADOR (@DevyEusuf)
- **What they are:** proprietary receiver composites (Fantasy Points Data Suite 2.0).
- **Formulas:** not disclosed by author.

## xFP (StatRankings)
- **What it is:** proprietary expected fantasy points; "models were built by our NFL Data Scientist."
- **Formula:** not disclosed by author.
- **Development note (author's reply):** "pulling in catchable target rate/target quality to xFP. Stay tuned!" — catchable target rate / target quality being added to xFP.

## EPA+CPOE (@CharlesChillFFB — forthcoming)
- **What it is:** proposed two-dimensional efficiency × volume metric.
- **Definition (author):** "You need both. Efficiency alone lies without volume context. Volume alone lies without efficiency context."
- **Formula:** not disclosed by author (not yet published).

## HB Analytics pass protectors/rushers (@hawkblogger)
- **What it is:** pressure-rate grades by position (OT/OG/C; EDGE/IDL), 150+ reps, blended 2026+2025.
- **Formula:** not disclosed by author. **Source:** Sumer Sports charting.


---

## 5. Blockers and loose ends

## Unrendered timelines
- **@NerdingonNFL timeline:** never rendered (no data captured).
- **@NFLResearcher timeline:** never rendered (no data captured).

## Protected / ungated accounts
- **@FTNData:** protected; no follow/access request made.

## Undescribed screenshot
- **Bryce Young map screenshot** (September 20 PM): remains undescribed/uninventoried. (@benlinsey_ posted Bryce Young pressure-to-sack rate 15.8% on 2026-09-21; the Sept 20 PM map itself was not transcribed.)

## Partial / cropped charts
- 24+ CSVs carry `partial`/`approx` in filename or header (see Part 6 / csv-inventory). Convention: READMEs document which rows were captured.
- Named partials: `hawkblogger-qb-epa-play-leaderboard-week2-partial` (cut off at row 7); `sfdata9ers-epa-target-leaders-week2-partial` (top-5 + 25th); `gridironinfo-avg-drive-start-position-week2-partial` (top 5 + bottom 2); `samhoppen-epa-per-drive-tiers-week2-partial` (4 standouts); `samhoppen-explosive-play-rates-week2-partial` (top 5 + bottom 3); `samhoppen-proe-leaders-week2-partial` (9 teams, direction-only); `samhoppen-expected-pass-situation-qb-epa-partial` (approx from unlabeled bars); `pattonanalytics-qb-explosive-negative-play-rates-partial` (unlabeled axes, all values approx); `pattonanalytics-qb-first-read-efficiency-week2-partial` (unlabeled scatter axes, approx); `dynatyzeff-carry-share-leaders-week2-partial` (chart said 12, only top 3 visible); `magicsportsguy-rb-rush-share-week2-partial` (top-5 + bottom-2); `statyxio-qb-hit-pct-leaders-partial` (ranks only, no values); `ryanj-heath-plays-run-while-trailing-2026-partial` (5 highest + 4 lowest); `gridironinfo-playoff-probabilities-after-week2-partial`; `gridironinfo-first-downs-by-down-week2-partial`; `gridironinfo-series-results-week2-partial`.

## Approximate visual reads
- All chart-reads CSVs are approximate reads, labeled as such: `gridironinfo-4man-rush-week1`, `gridironinfo-blitz-epa-week1`, `gridironinfo-int-badthrow-vs-adot-week1`, `paganetti-run-consistency-week1`, `paganetti-success-rates-week1`, `sfdata9ers-cpoe-vs-ttt-week1`, `bucsjuice-sumersports-prwr-edge-week2`, `magicsportsguy-arby-matchup-rating-week2`, `mediJo20-rushing-epa-vs-rushing-tds-1999-2026`, `pattonanalytics-qb-explosive-negative-play-rates-partial`, `pattonanalytics-qb-first-read-efficiency-week2-partial`, `samhoppen-expected-pass-situation-qb-epa-partial`.

## Undefined terms
- **`explosive access`** (@statyxio, Isaiah Likely post): coined but never defined; flagged for follow-up since 2026-09-19; still undefined as of 2026-09-20.
- **`9YOE` / `yoe9`** (@GridironInfo_ NYG-LAR recap): new undefined metric label; Stafford 9.6, Dart −8.1. Ambiguous until defined.

## Unknown providers / weights
- **StatRankings provider:** unknown; the provider remains undisclosed.
- **Baldwin futures blend weights:** unknown (v2 DraftKings, v3/Week 2 Kalshi confirmed; weights undisclosed).
- **Sam Hoppen facet-precedence rule:** inferred, not confirmed.

## Proprietary formulae
- **Fantasy Points formulae:** proprietary (Separation Score, xFP components, Similarity Finder weights, Data Suite 2.0 internals).

## NGS discrepancies
- **Lukas Van Ness:** quick-pressure vs second-half count unresolved.
- **Josh Allen `55.3%`:** likely blitz rate rather than CPOE (NGS pass-chart stat box); do not use as CPOE without verification.

## Chart / data anomalies
1. `gridironinfo-gamerecap-nyg-lar-week2-receiving.csv` includes Jaxon Smith-Njigba and Ferguson, who do not fit the NYG–LAR game; verify before use.
2. `gridironinfo-gamerecap-nyg-lar-week2-passing.csv` contains undefined `yoe9`/`9YOE`.
3. `gridironinfo-buf-passing-week2.csv` contains displayed negative signs (Allen CPOE −5.7, EPA −15.0) contradicting slides 1–2 of the same post (+5.7/+0.55); apparent chart error, transcribed as displayed.
4. `ryanh-heath-rb-16fpg-under-35pct-routes-since-2021.csv` likely misspells @RyanJ_Heath in the filename.
5. PFF Accuracy Index week label/article framing is inconsistent (table "THROUGH WEEK 1" vs article "Week 2"; Allen card looks like Wk2 single-game).
6. `statyxio-qb-hit-pct-leaders-partial.csv` ranks defenses, despite the QB-facing name.
7. `fantasypts-def-targets-by-position-week1.csv` is sparse, not a full 32-team table.
8. `sfdata9ers-qb-read-distribution-week2.csv` has `J.Strand`, likely a visual misread of Jaxson Dart.
9. `@PattonAnalytics` ANY/A table: source's duplicate "Drew Lock" preserved as displayed.
10. `sfdata9ers-missed-tackle-rates-week1.csv`: one row team logo unidentified, left blank.
11. `sfdata9ers-cost-of-drops-epa-differential-week2.csv`: rows 22/25 team logos unreadable → UNKNOWN_ORANGE_LOGO_A/B.
12. `sfdata9ers-week2-previews.csv`: 4 logos unidentified.
13. `sfdata9ers-tnf-preview-det-buf.csv` / recap: metric × team values + historical percentiles (template noted).
14. Lawrence post text ("without taking a single sack") vs chart (Lawrence 4.2% sack) — apparent inconsistency (@GridironInfo_ dropback outcomes).
15. GridironInfo_ DET-BUF: minor slide-1-vs-3 differences (Goff Pass SR% 55 vs 57; EPA/DB +0.41 vs +0.44).
16. StatRankings CSV dump data-quality flags: (a) no cumulative CSV; (b) no game context columns; (c) week numbering unstable; (d) no 2026 full-season projections; (e) "2026 WEEK 1 PROE+" exists but no Week-2+ rolling PROE+; (f) 24th-25th columns "2025 PROJECTIONS" — projections vs actuals unreconciled; (g) PROE+ formula not disclosed by author in the dump; (h) ARBY column present but formula not disclosed by author.
17. `sfdata9ers-qb-performances-week2.csv`: "Total QBR" definition not confirmed as author's.
18. SumerSports Sep-18 claims (LB/DI/edge tables live, preseason/postseason from 2022, WELCOME15) — from Garrett's lead, NOT independently confirmed.
19. Snap-weighted age: KC figure disputed.
20. @MagicSportsGuy RB route % notes: text only, no table.
21. JMac_FF Bills target distribution: LaPorta row truncated.
22. @SumerSports run-scheme tendency: value pairs transcribed as stated in sweep (HOU/JAX attribution ambiguous in sweep text).


---

## 6. Orphan check

Inventory as of 2026-09-24. 161 full-table CSVs + 9 chart-read CSVs + 3 StatRankings index CSVs.

## True orphans (on disk, absent from README)
1. **`docs/research/2026-09-24/full-tables/dk-sunmon-slate-salaries-week3.csv`** — the only genuine orphan. 767-row DraftKings salary CSV (Week 3 Sun/Mon slate; BOM-prefixed header; e.g. Jahmyr Gibbs RB/FLEX $8800, NYJ@DET 09/27/2026 01:00PM ET, 30.5 avg), written 10:57 AM CDT (75 min after the AM-sweep batch), undocumented in the 09-24 README. Raw DraftKings contest export (DFS workflow — matches Garrett's weekly DFS packet format), NOT an X-sweep metric table.

## Effectively documented (filename omitted from README but content described)
- **`docs/research/2026-09-21/full-tables/sfdata9ers-qb-performances-week2.csv`** — the 09-21 README's AM-sweep header block describes this exact CSV (Total QBR leaderboard, pre-MNF, min 20 rel. plays, @sfdata9ers ~08:50 AM CDT); the literal filename string just never appears in the README text. Effectively documented.

## Coverage verification
- **09-17:** all 13 full-tables + 3 statrankings index CSVs named in README. No chart-reads dir.
- **09-18:** all 76 full-tables named in README. 6 chart-reads indexed in chart-reads README. statrankings/: methodology-definitions.json (673 definitions, noted only) + nfl-urls.txt (1,148 paths); js/ skipped.
- **09-19:** all 9 full-tables named in README. 3 chart-reads indexed in their own README (sibling dir).
- **09-20:** all 12 full-tables named in README.
- **09-21:** all 9 full-tables represented in README (see effectively-documented note above).
- **09-22:** all 19 full-tables named in README.
- **09-23:** all 13 full-tables named in README.
- **09-24:** 9 of 10 AM-sweep files indexed in README (written 09:39–09:41 CDT; post timestamps 7:02 AM → 9:10 AM CDT, all inside the sweep window). The 10th (dk-sunmon-slate-salaries-week3.csv) is the orphan above.
- **Orphan README mentions:** none — no CSV referenced in a README but missing from disk.

## Anomaly register (content vs filename)
See Part 5 items 1–8. Full detail in `~/workspace/sweep-catalog-working/csv-inventory.md` §3.


---

## 7. Lessons learned & sports knowledge base

Scope: beyond the September 17–24 sweep window. Everything sports-related that fits or improves the page.

## A. September 18 props-analytics reverse engineering

**Sources:** `origin/main:AGENTS.md`, section `ENGINE BENCHMARK: PROPS-ANALYTICS REVERSE ENGINEERING (2026-09-18)`; `docs/research/2026-09-18-props-reverse-engineering/report.md`.

**Recorded findings:** the September 18 report classified the free, fully replicable layer as nflverse/nflfastR play-by-play, and classified route-level charting and subjective grades as proprietary. The report classified exact proprietary reconstructions as buy/license-or-approximate items.

**Five builds the report classified as replicable:**
1. Market-implied neutral team strength through The Odds API v4.
2. Coverage/shell-weighted receiver matchups — the report identified this as the best edge per dollar.
3. EPA/WPA 10-facet decomposition after Sam Hoppen.
4. Under-center usage × efficiency.
5. Playcalling tendency rates + OL/run composite.

**Feature candidates listed in the report:**
- `market_neutral_win_prob`, `market_power_points`, `market_hfa_estimate`, `futures_residual`
- `shell_weighted_tprr`, `shell_weighted_yprr`, `coverage_matchup_delta`
- Ten EPA facets and WPA analogues: `pass_off_epa`, `run_off_epa`, `pass_def_epa`, `run_def_epa`, `takeaway_epa`, `giveaway_epa`, `off_pen_epa`, `def_pen_epa`, `st_epa`, `other_epa`
- `under_center_rate`, `under_center_epa_per_play`, `under_center_success_rate`, `shotgun_epa_per_play`, `formation_epa_delta`
- `motion_rate`, `screen_rate`, `play_action_rate`, `no_huddle_rate`, `rpo_rate`
- `passing_matchup_grade`, `rushing_matchup_grade`, `ol_run_block_grade`, `ol_pass_block_grade`
- `def_run_dvoa`, `def_pass_dvoa`
- `team_implied_total` (= total/2 − signed_spread/2), `projected_role_share`, `game_script_adjustment`
- `avg_opponent_drive_start_yardline`, `kickoff_touchback_rate`, `kickoff_return_start_ep`
- `wr_cb_assignment_share`, `alignment_overlap`, `man_tprr`, `zone_tprr`, `man_yprr`, `zone_yprr`, `first_read_share_by_shell`, `cb_shadow_rate`, `projected_shell_rate`
- `pressure_mismatch`, `run_front_mismatch`
- `concept_frequency`, `coverage_rotation_rate`, `concept_vs_shell_epa`, `first_read_concept_share`
- `qb_positive_epa_rate`, `qb_negative_epa_rate`
- `mock_availability_prob`, `reach_factor`
- `qb_epa_cell`

**Provider conclusions recorded in the report (2026-09-18):**
- FTN charting powers sfdata9ers playcalling tags; paid, no public API.
- SumerSports: no public API; SumerPass $10/wk, $20/mo, $100/yr, 7-day trial.
- StatRankings provider undisclosed; no public API.
- Fantasy Points coverage/schematic charting is proprietary.
- PFF graded-play metrics cannot be exactly rebuilt without grades.
- All-22 concept labels require a private coding schema.

**Per-creator reverse-engineering notes recorded in the report:**
- **@sfdata9ers:** playcalling tendency rates (FTN proprietary in-house charting); kickoff avg drive start (nflverse kickoff PBP or FTN ST charting — unknown); Allen career EPA/play heatmap (nflverse PBP, inferred). Rate formulas and denominators inferred; kickoff exclusions unknown.
- **@ThunderDanDFS:** matchup grades = f(DVOA, grades, role, script) 0–100, black box; inputs confirmed (PFF + FTN DVOA); implied totals from spread/total.
- **@SamHoppen:** 10-facet EPA/WPA — orient epa/wpa to team, assign facets with inferred precedence, sum; fully replicable from nflfastR.
- **@benbbaldwin:** implied-SRS via spread regression (intercept = HFA; 2021 market HFA ≈ 0.62); futures de-vig + blend weights unknown.
- **@MagicSportsGuy:** CB/WR assignment maps, alignment, man/zone + shell splits; target share/TPRR/YPRR/FP-per-route + coverage splits; percentiles vs peer group (min-route cutoff unknown); provider undisclosed.
- **@tejfbanalytics / SumerSports:** under-center rate vs under-center EPA/play; rate = UC snaps/snaps; exclusions unpublished; approximable via nflverse formation fields (field names unverified).
- **@RyanJ_Heath / Fantasy Points:** Advanced Matchups — shell-weighted splits + mismatch indices, black box; 2026 edition paywalled.
- **@Shauncore (PFF):** QB positive/negative graded-play rates — pos/neg counts / eligible graded pass plays (eligibility inferred).
- **@b_peters12:** film-charted concepts + coverage reads — licensed All-22 + private charting codebook; replicable as process, not data.

**Open questions the report recorded as not verifiable:** sfdata9ers' exact denominators/kickoff exclusions; Hoppen's facet-precedence rule; Baldwin's futures-blend weights; StatRankings' data provider; SumerSports Sep-18 claims (from Garrett's lead, not independently confirmed); FP Data Suite 2026 formula (paywalled); Shauncore eligibility cutoffs; nflverse field names for kickoff/under-center tags.

## B. Next Gen Stats taxonomy and presentation observations

**Sources:** `docs/research/2026-09-21/nextgenstats-profile/metric-glossary.md`; `post-inventory-continuation-2026-09-21.md`; continuation QC report.

**Provenance note:** NGS data is proprietary NFL tracking data; the inventory documents taxonomy and presentation patterns observed in the posts.

**Coverage:** Pass 1: 48 posts (September 20 → April 25, 2026). Pass 2: 80 posts (April 24 → March 9, 2026). Total: 128 posts. Resume point: March 8, 2026 and earlier. Replies tab not systematically covered.

**Metric families (definitions inferred from usage unless noted as NGS-published):**
- MTF (missed tackles forced)
- RYOE (rushing yards over expected)
- CPOE (completion % over expected)
- EPA/dropback
- Pressure rate; pressure probability; pressure rate over expected
- Get-off (seconds)
- Quick pressures (under 2.5 seconds — NGS-published definition)
- Time to pressure; time to pressure allowed (OL)
- YAC over expected
- RECYOE (receiving yards over expected)
- Draft scores: Overall / Production / Athleticism (0–100) + Raw ATH (10.0)
- Blitz rate
- Top speed (mph); fastest sacks (mph); average speed on carries / at LOS
- Target separation; average separation; open score; cushion
- Completion probability; air yards (intended, to sticks, completed); air YAC; air distance
- WPA added; cumulative WPA on interceptions
- Motion at snap %; motion at snap rate
- Under-center splits; on/off-field splits; run rate of player snaps
- Coverage matchup tables; coverage classification; completion % as field-side CB
- Chip blocks faced; pressures when double teamed; double-team rate × win rate
- Kicker makes over expected
- Target EPA (DB); yards per coverage snap; quick pressure rate (OL allowed)
- Run stops / run stuffs; missed tackle rate (LB); tackle probability; yards after missed tackles (team)
- Scramble EPA; scramble rush yards
- Vertical receptions; receptions vs split-safety; isolated alignment TDs
- EPA per dropback (QB); EPA per play with player on/off field
- Air yards per target
- Expected Points Models ("the underlying model behind widely used metrics like EPA and success rate" — AWS explainer video, Apr 2)
- Route classification; 2026: Route Classification 2.0
- 2026 announced: Run Scheme Classification; Run Blocking Matchups & Metrics

**NGS-published methodology details (2026-09-21 backend report):**
- **Completion Probability:** XGBoost on Amazon SageMaker (amazon.science, Feb 2026). 36,000+ attempts back to 2016; random 10% holdout; r² = 0.98. ~6 of 10+ factors named: air distance, target separation, sideline separation, pass rush separation, passer speed, time to throw. nflreadr: expected_completion_percentage; completion_percentage_above_expectation.
- **RYOE / xRY:** 2D CNN by Philipp Singer & Dmitry Gordeev ("The Zoo"), 2020 Big Data Bowl winners (2,000+ entrants, CRPS). Inputs: five vector features (X, Y, S, A, Dir) at handoff. xRY = Σ(outcome × probability). Also yields First Down Probability and Touchdown Probability at handoff. ROE = % of runs gaining more than expected.
- **YAC over expected:** 2018 model superseded by xRY-style structure. nflreadr: avg_expected_yac.
- **Pressure:** NGS-published 75% threshold — "A pass rush becomes a pressure when pressure probability exceeds 75 percent" (nfl.com, Sep 21, 2023). Three ML models: GNN (blockers vs route-runners), random forest (per-defender pressure likelihood + per-rusher models + team composite), blocking-matchup model. Derived: pressure rate (avg rusher 10.3%), time to pressure (avg 2.9s), quick pressures (<2.5s), pressure time, pressure probability at snap, pressure rate over expected. Whitepaper: "Feeling the Pressure" (MIT Sloan).
- **Tackle probability:** "estimates the likelihood of a defender completing a tackle at the moment of contact, factoring in speed, angle, distance, leverage, and pursuit" (amazon.science, Feb 2026). >2M data points; frame-level probability every 10th of a second (~20 features/frame); trained 2018–2022, tested 2023. Derivatives: missed tackles, tackle efficiency, MTF, group tackles, tackle yards saved.
- **QB Passing Score:** TCN encoding (176 columns = 22 players × 8 features) + MLP → spliced binned-Pareto output. ~50K passing plays 2018–2020. AWS released PyTorch code + demo notebook (Aug 2022).
- **Defensive Alerts:** acceleration patterns + presnap shifts + situational context; generative AI predicting likely rushers. No architecture published.
- **Defender ghosting:** CNN-LSTM; tracking accurate within 6 inches in 99.9%; predicts next 10 positions from 3 measurements.
- **Data pipeline:** RFID chips in shoulder pads + football; 20+ ultrawideband receivers/stadium; players 10×/sec, ball 25×/sec; "accurate to a few inches" (2026). AWS tech provider since 2017. ~300M data points/season (2021). 75+ ML models on AWS; 500–1,000 stats/play. Optical pose tracking: 4K cameras, 16 angles → x,y,z of 29 body parts at 60 Hz; 2026 first full league-wide season (internal while validated).

**Presentation templates observed:**
1. **Pass Chart** — field-view pass-location map; legend COMPLETE/TOUCHDOWN/INCOMPLETE/INTERCEPTION/LOS; stat boxes COMP/ATT, YARDS, TD-INT + CPOE or EPA/dropback.
2. **Carry Chart** — field-view carry-path map; legend TFL/0-5/5+/TOUCHDOWN/FUMBLE LOST; stat boxes CARRIES, YARDS, TD + MTF/RYOE/SUCCESS RATE.
3. **Route Chart** — field-view route map; legend INCOMPLETE/ROUTE/AFTER CATCH/TOUCHDOWN; stat boxes TARGETS-REC, YARDS, TD, RECYOE.
4. **Pass Rush Chart** — pass-rush path map; legend NO PRESSURE/PRESSURE/SACK; stat boxes PASS RUSHES, PRESSURES (%), SACKS + GET OFF or BLITZ RATE.
5. **Coverage comparison table** — "BY COVERAGE DEFENDER" with coverage matchups, rec-targets, yards, TDs, man coverage % + takeaway line.
6. **Draft-score graphics** — bar-chart rankings; axis <AVG/AVERAGE/GOOD/ELITE.

**Presentation patterns observed:**
- Minimum qualifiers on every metric.
- Historical anchors ("most since 2018", "first in NFL history").
- Tracking numbers paired with real game clips.
- Situational splits carrying the insight (blitz vs not, under center, on/off, man vs zone, per-defender).
- Key finding: no graphic in Pass 1 printed an explicit metric definition or methodology footnote — definitions above are inferred from usage.

## C. Case Keenum "safety blanket" study

**Source:** `docs/research/2026-09-24/keenum-target-splits.md`.

**Method:** nflverse play-by-play 2013–2023; 2,270 Keenum targets; 203,055 league targets; roster-position joins; throwaways, spikes, sacks excluded. Long-layoff set: 10 games, 323 targets (≥10 targeted attempts after ≥8-week gap).

**Results — career:**
| Group | Keenum career | League |
|---|---|---|
| WR | 59.6% | 59.3% |
| TE | 20.4% | 20.9% |
| RB/FB | 20.0% | 19.7% |

**Results — layoff return:**
| Group | Return games | Career |
|---|---|---|
| WR | 62.2% | 59.6% |
| TE | 20.1% | 20.4% |
| RB/FB | 17.6% | 20.0% |

**Recorded conclusion:** the data rejects a generic "Keenum targets TEs/RBs after layoffs" narrative. Comfort target is player-specific, not position-specific: Chris Thompson (2019), Jarvis Landry (2021–22), Noah Brown (2023). NFL play-by-play does not prove slot/X/Y alignment.

**Method structure used in the study:**
1. hypothesis
2. denominator/filter
3. league baseline
4. return-game subset
5. player-level exceptions
6. scheme/roster confounds
7. alignment data that remains unavailable

## D. Corpus and record-keeping history

Recorded standing directives from the research program (historical facts about how the corpus was maintained):
- **September 17 rule:** every new metric goes into Sports `AGENTS.md` with source documents/spreadsheets/profiles inventoried.
- **September 18 corpus rule:** all sports work belongs under `docs/research/<date>/`; workspace is scratch.
- **Source priority stated in the record:** raw/direct sources before summaries.
- **No-invention standard used throughout:** never invent formulas, sources, values, projections or results. If the author didn't give a formula, write "not disclosed by author."
- **Approximate values:** chart reads are labeled as approximate.
- **Access note:** the record shows authentication, paywalls and access controls were respected throughout.

## E. Methods literature (2026-09-17 dossier)

**Source:** sweep-email PART C, `dossiers/dossier-v2-methods.md` — statistical methods literature compiled for an Elo-based prediction engine, marked per-item VERIFIED or UNVERIFIED.

**Topics covered with implementation-level detail:**
1. **Expected points (EP):** Yurko, Ventura & Horowitz "nflWAR" (arXiv 1802.00998, 2018) — multinomial logistic regression over seven next-scoring-event categories; six covariates + interactions; observation weighting; LOSO calibration selection (final e ≈ 0.013). Current nflfastR production `ep_model` is XGBoost returning the seven-event probability vector (VERIFIED in fastrmodels CRAN docs). Brill et al. (2024, arXiv 2409.04889) critique drive-level dependence, selection bias, overfitting, missing uncertainty. UNVERIFIED: exact feature set/training window/hyperparameters of the current XGBoost model — the 2020 methodology article could not be fetched.
2. **CPOE:** nflfastR CRAN docs define `cp` (completion probability) and `cpoe`; current `cp_model` in fastrmodels. The original 2020 CP-model methodology article was located but could not be fetched — treated as unavailable.
3. **DVOA / DAVE** (documented in the dossier; see Part 1 foundation entries).
4. **Fourth-down win probability (nfl4th)** — see Part 1 nfl4th entry.
5. **Turnover regression** (documented in the dossier).
6. **Pressure stability** (documented in the dossier).
7. **EPA predictive validity** (documented in the dossier).

**Ranked build targets recorded from the 8-post September 17 sweep (from the 8-post sweep, AGENTS.md):** 1. FPOE/xFP stack; 2. EPA + draft-pick Monte Carlo; 3. Hidden yardage; 4. Transparent Open Havoc; 5. Survivor + best-ball EV.
