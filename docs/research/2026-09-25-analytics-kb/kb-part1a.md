## PART 1: METRIC CATALOG

### September 17 — foundation dossiers (definitions and data-source inventory)

The September 17 dossiers (`advanced-metrics-data-source-catalog.md`, `dossier-v2-methods.md`, supporting notes) document the baseline metric universe the sweeps draw on. Entries below are definitions as recorded in the dossiers, not new X posts.

**EPA (Expected Points Added)** — Sept 17 foundation dossier.
- Definition (as given): the change in expected points from pre-play to post-play.
- Formula: `EPA = EP(post-play) − EP(pre-play)`. No proprietary variant disclosed for any vendor.
- Stated data source: nflverse/nflfastR play-by-play (public), with the caveat that StatRankings discloses no proprietary EPA formula; given nflfastR is a stated StatRankings source, the dossier infers (flagged as inference) their EPA is computed from nflfastR EP values.
- Public endpoint: `nflverse.com`; `rbsdm.com` leaderboards (public reads; no bulk redistribution right documented).

**EPA per play / EPA per dropback / EPA per attempt / EPA per target / EPA per rush / EPA per drive** — Sept 17 foundation dossier; also appearing in sweeps Sept 18–24.
- Definition (as given): total EPA divided by the relevant play denominator.
- Stated data source: nflverse (public); FTN charting; SumerSports charting; PFR; NGS.
- Caveats: denominators and filters (e.g., kneels/spikes excluded, "relevant play" definitions) vary by author; each sweep entry records the author's stated qualifiers.

**Success rate** — Sept 17 foundation dossier; inline definition also published by @sfdata9ers on Sept 20.
- Definition (as given): percentage of plays with EPA > 0. The @sfdata9ers Sept 20 game-recap card prints it verbatim: "Success Rate = % of plays with EPA > 0".
- A related down-and-distance success rule was printed in the @sfdata9ers Sept 18 BUF rushing summary footer: 1st down ≥ 40% of yards to go, 2nd ≥ 60%, 3rd/4th ≥ 100% (100% = convert). See the Sept 24 "WR success rate" entry for the receiver-specific application.

**CPOE (Completion Percentage Over Expected)** — Sept 17 foundation dossier; also sweeps Sept 18–24.
- Definition (as given): play-level `complete_pass − completion probability`, averaged over attempts. The dossier notes it isolates accuracy from throw difficulty.
- The Sept 22 @GridironInfo_ recap notes CPOE is used on the Allen passing-efficiency grid because raw completion percentage "is not comparable across depths."
- Stated data source: NGS (Next Gen Stats) completion probability via nflverse; PFF's QB Accuracy Index also publishes a CPOE column (Sept 23).

**WPA (Win Probability Added)** — Sept 17 foundation dossier; Sept 20 (@SamHoppen waterfall).
- Definition (as given): change in win probability attributable to a play, attributed to game facets (Sept 20: Pass Off, Run Off, Pass Def, Run Def, Takeaways, Giveaways, Off Pen, Def Pen, Special Teams, Other).

**ANY/A (Adjusted Net Yards per Attempt)** — Sept 17 foundation dossier; Sept 18 (@PattonAnalytics scatter), Sept 23 (@RyanJ_Heath vs accurate throw rate).
- Definition (as given): `(pass yards + 20 × pass TD − 45 × INT − sack yards) ÷ (attempts + sacks)`. Dossier records the standard formula.

**aDOT (average depth of target)** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): mean charted target depth on targeted pass attempts. @SumerSports (Sept 18) excludes throwaways; @GridironInfo_ footers repeat "aDOT excludes throwaways."

**Explosive play (rate)** — Sept 17 foundation dossier; inline definition published by @sfdata9ers on Sept 20.
- Definition (as given): "Explosive Play Rate = rush 10+ yds, pass 20+ yds." The same 10+/20+ cut is used by @SamHoppen (Sept 22) and @SumerSports-adjacent posts throughout the sweeps.

**TPRR (targets per route run)** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): targets ÷ routes run. Used as the primary target-earning efficiency metric across Fantasy Points, StatRankings, and statyx cuts.

**YPRR (yards per route run)** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): receiving yards ÷ routes run.

**Route participation** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): share of team dropbacks on which the player ran a route.

**Target share** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): player targets ÷ team pass attempts (targets).

**Air yards** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): yards the ball traveled in the air on targets, split into catchable and uncatchable air yards in the Sept 21 @RyanPaganetti cuts.

**YAC / YBC (yards after catch / yards before contact)** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definitions (as given): YAC = yards gained after the catch; YBC = yards gained before first contact on rushes. NGS glossary (Sept 21 deep-dive) adds YAC-over-expected and RECYOE (receiving yards over expected).

**Missed tackles forced (MTF)** — Sept 17 foundation dossier; Sept 18 (StatRankings dump family), Sept 21 (@FantasyPtsData YACO/att × MTF/att; @AcccountStat YAC/rush × avoided tackles/rush), Sept 23 (@RyanJ_Heath MTF/touch × YACO/touch).
- Definition (as given): charted missed tackles forced, expressed per attempt or per touch depending on the cut.

**RYOE (rushing yards over expected)** — Sept 17 foundation dossier; Sept 18 (@GridironInfo_ footer "RYOE shown only where NGS charted the back"), Sept 23 (@RyanJ_Heath RB success rate × RYOE/att).
- Definition (as given): rushing yards over expected, NGS model. No model formula published in the sweeps.

**Separation metrics** — Sept 17 foundation dossier; Sept 21 (NGS average separation leaderboard; @RyanPaganetti average separation created; @FantasyPtsData AVG SEPARATION SCORE × TPRR Sept 23).
- Definitions (as given): average separation created (yards, NGS tracking); "Separation Score," "Separation Market Share," and "ADOR" are proprietary @DevyEusuf (Fantasy Points Data Suite 2.0 export) metrics — no definitions given in the Sept 18 post.

**Pressure rate** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): pressures ÷ dropbacks (or ÷ pass rushes for defenders, depending on the cut).

**DVOA** — Sept 17 foundation dossier; Sept 18 (FTN DVOA via @ThunderDanDFS matchup grades; Sept 22 @SamHoppen composite uses FTN DVOA).
- Definition (as given): defense-adjusted value over average. FTN is the exclusive home of DVOA (Aaron Schatz, FTN Chief Analytics Officer). Free DVOA is view-only; 1977+ historical archive subscriber-only; older seasons recoverable via Wayback.

**Passer rating / Total QBR** — Sept 17 foundation dossier; sweeps Sept 18–24 (box-score panels).
- Definitions (as given): standard NFL passer rating formula; ESPN Total QBR (0–100). No new formulas published in the sweeps.

**PFF grades** — Sept 17 foundation dossier; sweeps Sept 18–24.
- Definition (as given): PFF's proprietary per-play grades (−2 to +2 scale per play, aggregated 0–100). Sept 23 launches the PFF QB Accuracy Index (ACC%, PLUS%, CAT INAC%, UNC INAC%, OTHER, CPOE, ACCOE, AJ%).

**FP per route / FP per target / FP per touch** — Sept 17 foundation dossier; Sept 18 (StatRankings dump: DK/FD/FFPC/NFFC/Underdog FPPG; FP per route/touch/target/dropback/opportunity).
- Definitions (as given): fantasy points divided by the opportunity denominator, by platform scoring.

**xFP (expected fantasy points)** — Sept 17 foundation dossier; Sept 18 (@MagicSportsGuy xFP tool; proprietary StatRankings), Sept 22 (@DevyEusuf XFP teammate cut; @RyanJ_Heath backfield XFP).
- Definition (as given): proprietary expected fantasy points. StatRankings: "models were built by our NFL Data Scientist" (Patton). Fantasy Points Data Suite 2.0 publishes its own xFP. The Sept 17 dossier flags a sign-convention warning: one tracked chart used `FPOE = XFP − FPG`, the opposite of the common `FPG − xFP` naming — verify sign before use.

**FPOE (fantasy points over expectation)** — Sept 17 foundation dossier (sign warning above); Sept 22 (@DevyEusuf: Denzel Boston 8.57 FPOE/game, "(Fantasy Points Data)" cited).

**PROE (pass rate over expected)** — Sept 17 foundation dossier (StatRankings source page cataloged); Sept 18 (@PattonAnalytics), Sept 22 (@SamHoppen PROE leaders, "expected based on nflfastR's model; PROE of 0% = black line").
- Definition (as given): actual pass rate minus expected pass rate.

**Neutral pace** — Sept 17 foundation dossier; Sept 18 (StatRankings dump: neutral pace sec/play — GB 21.8, TEN 22.0, CAR 22.3).
- Definition (as given): seconds per play in neutral game script. Combined with PROE as PROE+ (see Sept 18).

**Personnel usage (11/12/21)** — Sept 17 foundation dossier; Sept 20 (@MagicSportsGuy new-OC personnel deltas; league averages stated: 11 personnel 57.7%, 12 personnel 21.9%, 21 personnel 7.8%).
- Definition (as given): share of offensive plays from the personnel grouping.

**Motion / play action / screen / no-huddle / RPO rates** — Sept 17 foundation dossier; Sept 18 (@sfdata9ers 32-team playcalling tendencies: LAC 84.3% motion leader; TB 25.5% play action; TEN/NO 22.1%/22.4% no-huddle; WAS 14.7% RPO; FTN charting; author correction: 197 plays carried both tags so columns do not sum to 100), Sept 23 (@SumerSports motion at snap: LAC 72.6%, up from 28.1% in 2025, with with/without EPA-play splits).
- Definitions (as given): share of rush+pass plays with the tag. Under-center rate defined Sept 18 (@SumerSports): % of offensive snaps under center; kneels and spikes excluded; pistol not included.

**Coverage shell / man-zone rates** — Sept 17 foundation dossier; sweeps Sept 18–24 (StatRankings CoverageIQ+ shells: Man = 0, 1, 2M; Zone = 2, 3, 4, 6, 9).
- Definitions (as given): share of coverage snaps in the shell/look.

**Box counts** — Sept 17 foundation dossier; Sept 18 (StatRankings dump: stacked box), Sept 21 (@ffdataroma: light-box rates), Sept 22 (@SumerSports box-count × rush-success), Sept 23 (@sfdata9ers box defenders faced; @Shauncore light-box trilogy).
- Definitions (as given): average or categorical count of defenders in the box (5-or-fewer / 6 / 7 / 8+).

**Drive metrics (yards/drive, points/drive, EPA/drive, series conversion, average drive start, 3rd/4th-down conversion)** — Sept 17 foundation dossier; sweeps Sept 18–24 (@GridironInfo_ recap panels; @SamHoppen EPA/drive tiers Sept 22).
- Definitions (as given): per-drive means; kneeldown drives excluded in the Sept 22 @SamHoppen EPA/drive tiers.

**Turnover luck** — Sept 17 foundation dossier (INTs over expected; takeaways over expected; 2025 team tables in the GSE-lab repo path map).
- Definitions (as given): actual minus expected interceptions/takeaways.

**Special-teams EPA** — Sept 17 foundation dossier (return EPA splits KR|PR); Sept 20 (@sfdata9ers game recaps: ST EPA/Play column; BAL lost 8 expected points on special teams vs NO).

**Fourth-down decision model** — Sept 17 foundation dossier (nfl4th.com documented); Sept 20 (@ngreenberg GoForIt% — see Sept 20 entry).

**Market data (spreads, totals, futures, prediction markets)** — Sept 17 foundation dossier; sweeps Sept 18–24 (@benbbaldwin ratings; @GridironInfo_ Kalshi dashboards; Kalshi/Polymarket public APIs documented Sept 18).

### September 18

**Under-center rate** — @SumerSports, Sept 18 (appearing Sept 16 post, swept Sept 18).
- Definition (as given): % of offensive snaps under center.
- Representative values: 2022 32.1%, 2023 27.7%, 2024 29.3%, 2025 33.8%, 2026 Week 1 41.3%.
- Stated data source: SumerSports own charting.
- Caveats (attributed): offensive snaps only; kneels and spikes excluded; pistol not included in under-center numbers.

**Interior DL pressure rate** — @SumerSports, Sept 18 (Sept 17 post).
- Definition (as given): pressure rate per pass rush, DT and NT snaps only.
- Representative values: Deone Walker 17.4% 2026 (8 pressures on 46 rushes) vs 6.5% 2025; league average 8.4%; best 2025 qualifier 16.4% (51 interior linemen with 200+ pass rushes).
- Stated data source: SumerSports own charting. Public endpoint: sumersports.com (SumerPass surfaces; some gated).

**Pass rush win rate (PRWR)** — @SumerSports, Sept 18–19 (@BucsJuice screenshot Sept 19; @JacobBarzilla Texans DL Sept 19); also ESPN "pass rush wins" and PFF variants noted.
- Definition (as given): SumerSports' win-rate column on its public edge-rusher table; min-snaps filters (1/10/25/50/100/250).
- Representative values: Walker 21.7% vs 9.2% league avg; Jalyx Hunt 29.6%; Gregory Rousseau 28.6%; Will Anderson Jr. 24.1%.
- Stated data source: SumerSports. Public endpoint: sumersports.com advanced stat tables (SumerPass $10/wk, $20/mo, $100/yr, 7-day trial; table surface publicly visible).
- Caveats (attributed): three public PRWR sources now exist (Sumer, PFF, ESPN limited to top 20) — @Shauncore, Sept 18; ESPN uses distinct "pass rush wins" naming.

**Run stops** — @SumerSports, Sept 18 (Sept 17 post).
- Representative values (Week 1): Zack Baun (PHI) 5 on 29 run-defense snaps; five players tied at 4.
- Stated data source: SumerSports own charting.
- Caveats (attributed): reply from @EdgeAI_App — "Run stops are a rate stat wearing a counting stat's clothes. Per snap, is Baun still first?"

**Gap outcomes** — @SumerSports, Sept 18 (James Cook vs DET).
- Columns (as given): gap (A/B/C/D), value, YACo (yards after contact), attempts, yards.
- Representative values: D gap +0.66, 20 YACo, 8 att, 92 yds; A gap −0.09, 4 YACo, 3 att, 6 yds. Post text: 92 of Cook's 106 rushing yards came on runs hitting outside the TE.
- Stated data source: SumerSports own charting.

**Average depth of target, single-game** — @SumerSports, Sept 18 (Josh Allen Week 1: 12.8 yards).
- Definition (as given): mean charted target depth on targeted attempts; throwaways excluded.
- Representative values: Allen 12.82 on 28 targets (highest in 33 starts; 2024–25 norm 7.87); Lions defense allowed the highest aDOT in the NFL last season (10.0).
- Stated data source: SumerSports own charting.

**Vertical route share** — @SumerSports, Sept 18 (Romeo Doubs Week 1).
- Definition (as given): share of routes that were go, post, or corner.
- Representative values: Doubs 60.0% (30 routes; Go 36.7%, Post 20.0%, Corner 3.3%); WR average 32.5% (58 qualifiers, 25+ routes).
- Stated data source: SumerSports own charting.
- Caveats (attributed): shares exclude the 5% of routes with no charted type; one game, 30 routes.

**PROE+** — @MagicSportsGuy (StatRankings), Sept 18 (Sept 15 post; reposted by @PattonAnalytics Sept 18); also Sept 24 AM (StatRankings; CAR +0.69 with +0.89 vs 2025; SEA −0.59 with −0.44).
- Definition (as given): "Pass Rate Over Expectation + Neutral Pace." The Sept 18 StatRankings company notes also render it as "PASS RATE OVER EXP x PACE."
- Representative values (2026 Week 1): Titans +1.42, Panthers +1.36, Packers +1.32, Steelers +1.15, Saints +1.15, Jets −0.04 (league avg +0.67).
- Stated data source: StatRankings (nflfastR + FTN Data per their July 2026 preview PDF).
- Public endpoint: statrankings.com (400+ free stat pages; PROE+ full board in the post image; advanced tools StatRankings+).
- Caveats: no weighting formula between the pass-rate and pace components was published in the sweeps.

**xFP (expected fantasy points)** — @MagicSportsGuy (StatRankings), Sept 18 (Sept 15 post).
- Definition (as given): proprietary expected fantasy points; "models were built by our NFL Data Scientist" (Patton).
- Representative values (2026 Week 1 WR): Amon-Ra St. Brown 24.9, M. Golden 23.4, C. Olave 23.0, JSN 21.4, DK Metcalf 18.2.
- **Fantasy points over/under xFP**: C. Watson +17.7, J. Coker +16.8, Z. Flowers +14.6 over; Metcalf −10.2, Jameson Williams −8.4 under.
- Stated data source: StatRankings.
- Caveats (attributed): author reply — "pulling in catchable target rate/target quality to xFP. Stay tuned!" (new metric in development at the time).

**Offensive breakdown 18-metric panel** — @GridironInfo_, Sept 18 (DET–BUF Week 2 carousel).
- Columns (as given): Total EPA, EPA/Play, Success Rate, Yds/Play, aDOT, CPOE, Pass SR%, EPA/DB, Rush SR%, EPA/ATT, Avg Drive Start, Series Conv Rate, 3rd/4th Down, Yds/Drive, Explosive Play%, Red Zone EPA/Play, Turnovers; EPA split dropback vs designed run; move-the-chains by down; series results; top-3 positive/negative plays by EPA.
- Representative values: BUF dropback EPA +20.8 / designed-run +7.9; DET +18.2 / −3.8; Allen→Palmer 43-yd TD +5.46 (top play). Passing box: CPOE, IWP (Int-Worthy Passes), PRESS% (pressures/dropback).
- Stated data source: "nflverse (nflreadr) pbp + FTN charting + Next Gen Stats."
- Caveats (attributed): flagged inconsistencies in the post — Bills passing slide showed Allen CPOE −5.7/EPA-DB −0.46 in green cells contradicting slides 1–2 (CPOE +5.7, EPA/DB +0.55); Lawrence "without taking a single sack" text vs 4.2% sack in chart.

**Pass-attempt distribution by air yards** — @GridironInfo_, Sept 18 (Week 1, 32 QBs × 4 buckets: 0–5 / 6–10 / 11–20 / 21+).
- Representative values: Allen 27.6% deep (21+); Nix 71.4% under 5.
- Stated data source: nflverse.

**INT/bad-throw ratio vs aDOT** — @GridironInfo_, Sept 18 (Week 1 scatter).
- Definition (as given, verbatim): "This ratio shows what share of a QB's bad throws actually turned into a pick. Low = getting away with mistakes. High = paying for them."
- Stated data source: PFR Advanced Passing + NGS / nflverse.

**4-man rush rate vs pressure rate** — @GridironInfo_, Sept 18 (Week 1 quadrant).
- Representative values: SF ~28% pressure on 86% 4-man (leader); PIT ~21% on 92% (heaviest 4-man); MIN ~12% on 15%.
- Stated data source: FTN Charting + nflverse PBP.

**Offensive vs defensive EPA/play on blitzes** — @GridironInfo_, Sept 18 (Week 1 quadrant).
- Representative values: CIN defense −1.49 EPA/play allowed when blitzing (best); NYJ offense +0.99 vs the blitz (best).
- Stated data source: nflverse.

**Kalshi odds dashboards** — @GridironInfo_, Sept 18.
- Definition (as given): prediction-market implied probabilities as weekly dashboards — last-undefeated team, conference champions, MVP/OPOY/DPOY/OROY/DROY/COTY/CPOTY, Protector of the Year; 5%+ cutoff format.
- Representative values: BAL/BUF 16% each last-undefeated; LAR 16% NFC champ; BUF 23% AFC champ; Allen 17% MVP; Mahomes 50% CPOTY.
- Stated data source: Kalshi.

**YPRR elite table** — @ScottBarrettDFB, Sept 18 (Fantasy Points Data Suite 2.0; 2025+2026, WR/TE, PPR, Model XFP).
- Columns (as given): SNAP%, RTE, YPRR, TPRR.
- Representative values: Nacua 3.84/0.37, JSN 3.79/0.33, Kincaid 3.54/0.28, Flowers 2.87/0.26; league avg SNAP% 66.1, RTE 382, YPRR 1.64, TPRR 0.20.
- Stated data source: Fantasy Points Data Suite 2.0.

**Play Caller Tendency Rating (Y-Aware PCA)** — @PattonAnalytics, Sept 18 (Sept 17 post); revisited Sept 23.
- Definition (as given): "Tendency Rating" via Y-Aware PCA on personnel diversification / play sequencing / tendencies; author says it correlates well with EPA.
- Representative values: Coen +0.27, Shanahan +0.18, Reich +0.14, Kubiak +0.13, Reid +0.12; Monken −0.30 (lowest). Sept 23 update: Shanahan top → Bobby Slowik bottom; defensive version "still has kinks" per author.
- Stated data source: StatRankings.
- Caveats: exact full methodology not published in the sweeps.

**Similarity Finder (SIM score)** — @FantasyPtsData, Sept 18 (Sept 16 post).
- Definition (as given): Parker Washington (Week 1 2026) vs 50 historical WR season comps; SIM score with FP/G, XFP/G, RTE%, TGT%, TPRR, YPRR, ADOT, 1st-read%, 1st-downs/route.
- Representative values: Hill 2023 42.4, Nacua 2025 40.4, JSN 2025 37.2 (top SIM).
- Stated data source: Fantasy Points Data Suite 2.0.
- Caveats (attributed): same-position-only comps; 9 of 144 usage stats weighted.

**Bellcow Report (backfield XFP share)** — @FantasyPtsData, Sept 18 (Sept 16 post); echoed Sept 22 (@RyanJ_Heath "Most backfield XFP": W1 DET 34.7; W2 SEA 37.6).
- Definition (as given): each RB's share of his team's backfield XFP.
- Representative values: Achane 95%, Javonte Williams 95%, Gibbs/Cook/Taylor 93%.
- Stated data source: Fantasy Points Data Suite 2.0.

**Defensive targets by position** — @FantasyPtsData, Sept 18 (Sept 16 post).
- Representative values (Week 1): Buccaneers 26% RB target share (among highest); Packers 36% TE share (highest — Hockenson/Oliver 4 each).
- Stated data source: Fantasy Points Data Suite 2.0.

**TE targets EPA/target** — @statyxio, Sept 18 (Sept 16–17 posts; Week 1, min 3 targets).
- Representative values: McBride 13 tgts/35% share/+0.289; Likely 8 tgts/8 rec/78 yds/+1.379 (cleanest); Fant 8 tgts/−1.066.
- Stated data source: statyx.io own platform.

**Rush Path / Rush IQ package** — @statyxio, Sept 18 (Gibbs package Sept 16–17; Cook vs DET; Irving vs CLE Sept 18 PM).
- Components (as given): lane shares (LG/RG/LE-LT etc.); run-path interaction (Interior/Left/Right % vs opponent rank, e.g., Interior 76.92% vs DET ranked 23/32); runner evidence (evaded tackles/att with percentile, stuff avoidance %, YAC/att, 10+ run rate, breakaway 15+ rate, rush success %).
- Representative values (Irving vs CLE, 8 mapped carries): LG 37% (9th), RG 25% (28th); 3.88 YAC/att (76th), 0.63 evaded tackles/att (99th), 62.5% rush success (99th), 87.5% stuff avoidance (63rd).
- Stated data source: statyx.io own platform. Card footer: "Available after 3 games."

**Defensive explosive pass % allowed** — @statyxio, Sept 18 (Week 1).
- Columns (as given): EPA/play allowed, EPA/DB allowed, pass success% allowed, aDOT allowed.
- Representative values: only ranks 19–32 capturable; CLE 17% worst (#32).
- Stated data source: statyx.io own platform.

**Safety ball-production scatter** — @StickToTheModel, Sept 18 (Sept 17 post; every safety with 30+ games 2023–2025).
- Axes (as given): X passes defended (0–40), Y interceptions (0–16); quadrants: top-left "Takes it away," top-right "Hands on everything," bottom-left "Quiet back there," bottom-right "Breaks up, rarely catches."
- Representative values: Kerby Joseph ~15.5 INT/~25 PD; Brian Branch ~6 INT/~38 PD.
- Stated data source: none stated beyond sticktothemodel.com.

**Sack rate vs pressure rate (Parsons split)** — @StickToTheModel, Sept 18 (Sept 17 post; 2025 regular season).
- Representative values: with Parsons (Wks 1–14) ~30.5% pressure / ~7% sack; without (Wks 15–18) ~31.5% pressure / ~2.8% sack; team record 9-3-1 / 19.0 PPA with vs 0-6 / 30.5 PPA without.
- Stated data source (on chart): "FTN Data via nflverse."

**Objective ratings v2 / Team Tiers** — @benbbaldwin, Sept 18 (12:18 PM); v3 Sept 19; Week 2 power ratings Sept 22.
- Definition (as given, verbatim): "Market-implied win% vs. a league-average team on a neutral field." v2: "took point spreads from the next 2 weeks → estimate how good a team is right now." v3/new: "uses lines as a starting point but solves for rating that best arrives at chances of winning division, conference, etc."; "how good each team would have to be to be consistent with published [futures]."
- Representative values (v2): LAR 72.8 (The Favorite); BAL 68.4, KC 65.5, BUF 65.4, SEA 64.9, SF 64.5 (True Contenders); MIA 24.2 (Very Bad). v3: Rams 72.6, Bills 67.7; Browns 20.1 last.
- Stated data source: v2 footer DraftKings lines/futures; v3 footer Kalshi futures + near-term game lines; Sept 22 footer Kalshi. Home-field value "~2" per author.
- Caveats (attributed): author — "This is not Super Bowl odds"; self-caveat on v3: "I am a little skeptical about the Broncos being this good tho."

**Remaining strength of schedule** — @benbbaldwin, Sept 18.
- Definition (as given): site-adjusted average remaining-opponent win% vs a league-average team, 15–16 games.
- Representative values: ARI 55.6 (hardest) … NO 43.4 (easiest).
- Stated data source: same market blend as the objective ratings.

**NFL SNAP ("Seven Numbers Assessing Performance")** — @EaglesXsandOs, Sept 18.
- Definition (as given): composite introduced Sept 15; Sept 18 post is a 10-season backtest of which SNAP categories tie to winning.
- Author's reply (verbatim): "NFL ANY/A vs. EPA/dropback margin, 2010–2024: Higher same-game efficiency won: ANY/A: 80.9%, EPA: 83.5%. Predicting future winners: ANY/A: 62.1%, EPA: 62.6%. EPA/db explains results better."
- Stated data source: author's Syndicate 32 platform.

**Separation Score / Separation Market Share / ADOR** — @DevyEusuf, Sept 18 (Sept 17 post; 2nd-year WRs, min 10 routes).
- Columns (as given): Season, Rank, Name, Team, POS, G, RTE, SEP SCORE, YPRR, TPRR, WIN RATE, SEP MS, ADOR, TGT%.
- Representative values: Ayomanor 0.111/60.0/8.8; Burden 0.083/36.4/6.1; McMillan −0.108/16.7/7.3.
- Stated data source: Fantasy Points Data Suite 2.0 export ("Exported from Data Suite 2.0 by Fusue Vue (user 209)").
- Caveats: no definitions given in the post or replies.

**CB/Receiver Matchup Report** — @MagicSportsGuy (StatRankings), Sept 18 (NYG @ LAR Week 2 PDF).
- Components (as given): (a) alignment-overlap matchup mapping (offense alignment % × CB side/coverage %); (b) man/zone splits (CoverageIQ+, 2025); (c) coverage shell splits (CoverageIQ+, 2025); (d) team target share by position (2025 beside Week 1 2026, never blended).
- Representative values: Watson defended 80.8% of routes to offense's left (14.7% man / 85.3% zone); Nacua vs C3: 41.96% TPRR (12th), 4.63 YPRR (7th) on 112 routes.
- Stated data source: StatRankings; generatable via statrankings.com/ai prompt PDF (subscribers).
- Caveats (attributed): "All 2026 figures are Week 1, a one-game sample. 2025 figures are as such and are never blended with 2026. Every row shown meets the StatRankings minimum-volume qualifier. … Percentile ranks are only comparable within a single board and qualifier."

**CoverageIQ+** — @MagicSportsGuy (StatRankings), Sept 18–20.
- Definition (as given): man/zone + 8-shell charting; 132 WR coverage stats; TPRR/YPRR/FP-per-route/First-Read % leaderboards; air-yard share and air yards vs man/zone/all coverages and shells (Cover 0/1/2/2-Man/3/4/6/9).
- Sept 20: coverageIQ+ Defense Card — per-team pass-defense dossier (BAL example, 2025, 655 coverage snaps): header rates (Man 31.5% #14, Zone 68.1% #19, Single High 61.9% #3, Two High 38.1% #30, Blitz 30.3% #18); coverage splits (FP/Route, Y/Route, TGT/G, REC/G, catch %, target rate, passer rating, Y/Att, TDs allowed by shell); alignment allowed; fantasy allowed (FP/Route ALW 0.36 #11, DK FP/G ALW 37.1 #3, avg cushion 4.8 yd #11, ADOT allowed 8.3 #6, explosive rec rate 16.0% #6, YAC/rec allowed 3.7 #24); target share allowed by position.
- Public endpoint: statrankings.com/nfl/coverage/team/bal — header rates publicly visible; detail sections gated behind StatRankings+ (not bypassed).

**StatRankings CSV dump families** — Sept 18 (dump added ~23:28 CDT; filed at `docs/research/2026-09-17/statrankings/`).
- Schema (verbatim header): `category,metric_path,metric_title,free_full,rank,name,name_href,team,position,season_label,season_value,last_1,last_3,last_5,last_10,home,away,extra_json`. 2026 Week 1 only; `free_full=yes` = full leaderboard free (5 metrics × 25 rows); `no` = paywalled top-5 preview.
- Families: `nfl-advanced-players.csv` (1,525 rows, 290 metrics, 9 families: alignment, cb, efficiency, qb-rushing, qb, rb, receiving, red-zone, usage); `nfl-advanced-teams.csv` (607 rows, 122 metrics, 8 families: coverage, defense, epa, fantasy-points-allowed, pace-playcalling, passing, rushing, trench-play); `nfl-coverage.csv` (100 rows, 20 paths).
- Notable metric paths: PROE+, neutral pace, ARBY (offensive/defensive), expected pressures, defensive pressure rate over expected (POE), red-zone splits at inside-20/10/5/2, QB passer rating clean/under pressure, stacked-box RB metrics, FP/route allowed by alignment.
- Representative slate values (Week 1): target share — JSN 45.8%, Bijan 45.5%, Jefferson 37.5%, McBride 35.1%; first-read share — JSN 57.9%; YPRR — Z. Flowers 15.0; team EPA/play — CHI 0.419 (1st); success rate — JAX 60.4%; defensive ARBY — ARI 1.67; neutral pace — GB 21.8 sec/play.
- Stated data source: StatRankings (nflfastR + FTN Data).
- Caveats (attributed): rolling/split columns repeat the 2026 value in this dump (not real splits); some team affiliations look stale vs real rosters (use numbers; verify team context); all paywalled metrics are top-5 previews.

**Playcalling tendency rates (32-team)** — @sfdata9ers, Sept 18 (Week 1; data charted by FTN).
- Columns (as given): Motion / Screen / Play Action / No Huddle / RPO % of all rush+pass plays.
- Representative values: LAC 84.3% motion (leader — author corrected post text that had claimed SF 78.1%); TB 25.5% play action; TEN 22.1%/NO 22.4% no-huddle; WAS 14.7% RPO.
- Caveats (attributed): 197 plays carried both tags in Week 1, so columns do not sum to 100.

**Pressure rate generated × allowed** — @hawkblogger, Sept 18 (2026; source: FTN charting).
- Representative values: KC 56.3%|39.4%, JAX 50.0%|25.0%, LV 40.5%|6.5%, MIA 6.5%|40.5% (full 32-team table in CSV).

**QB depth-bucket table** — @rjanalytics7002, Sept 18 (Lawrence Week 1).
- Columns (as given): Depth Bucket | Attempts | Comp % | Avg. Sep (yds) | Avg. TTT (s).
- Representative values: Behind LOS 4/100.0%/5.18/1.74; Deep 3/66.7%/2.13/4.43.
- Post context: "Lawrence led the NFL in CPOE in week 1 according to @NextGenStats."

**Target distribution (TPRR)** — @JMac_FF, Sept 18 (Bills/Lions Week 2).
- Representative values: Kincaid 8 tgts (28.5% share, 30.7% TPRR); St. Brown 12 tgts (34% share, 27.9% TPRR).
- Stated data source: none stated.

**PFF single-game defensive grade** — @PFF, Sept 18 (min 20 snaps).
- Representative values: Deone Walker 93.0 (Week 2), Ventrell Miller 92.4, T.J. Watt 92.3.
- Stated data source: PFF's own grades (implied).

**First-down-to-play ratio** — @RyanPaganetti, Sept 18.
- Definition (as given): first downs ÷ offensive plays (kneels excluded).
- Representative values: Bills 34 first downs on 66 plays = 51.5% — "only one other time in 3,424 regular season games since the start of 2013."
- Stated data source: none stated.

**Survivor entry EV** — @cmain7, Sept 18.
- Definition (as given): "Current Entry EV by Week 1 Team Used" — schedule-adjusted EV per surviving entry ($1,341 flat-equity baseline).
- Representative values: Raiders $1,559, Cardinals $1,559, Jets $1,559, Steelers $1,514, Lions $1,114.
- Caveats (attributed): "these are NOT from a full-season contest sim. They do account for remaining schedule/win probability and current field composition." No data source stated.

