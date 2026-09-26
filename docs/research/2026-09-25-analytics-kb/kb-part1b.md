### September 19

**Team Tiers v3** — @benbbaldwin, Sept 19 (see Sept 18 entry for definition; v3 footer: "Blends near-term game lines with division/conference/Super Bowl/playoff/#1 seed futures (Kalshi)" / "Date: 2026-09-19").
- Representative values: The Favorites — Rams 72.6 (1), Bills 67.7 (2); True Contenders — Seahawks 65.6 (3), Chiefs 65.5 (4), Ravens 65.2 (5), 49ers 64.2 (6), Eagles 62.2 (7); Very Bad — Titans 26.0 (30), Dolphins 25.6 (31), Browns 20.1 (32).
- Data-source change (attributed): v2 named DraftKings lines/futures; v3 names Kalshi futures + near-term game lines.

**Rookie-debut comparison table** — @DevyEusuf, Sept 19 (Makai Lemon vs JSN vs Justin Jefferson, first career NFL game).
- Columns (verbatim): Rec Grade | YPRR | REC YD | TGT | ROUTE | ADOT | YAC/REC.
- Representative values: Lemon 52.9/−0.17/−5/4/29/−0.30/1.0; JSN 54.1/0.68/13/4/19/0.68/4.3; Jefferson 51.5/1.00/26/3/26/3.00/11.0.
- Stated data source (footer verbatim): "Data: PFF."
- Caveats: no definitions given; cross-era rookie-debut format noted as the innovation.

**Rushing EPA/game vs rushing TDs/game, 1999–2026** — @MediJo20 (quoting @WillBrinson's chart), Sept 19.
- Definition (as given): career rushing EPA per game vs rushing TDs per game, regular season, all available 1999–2026.
- Representative values (approximate chart reads): Josh Allen ≈ 2.5/0.65; Jalen Hurts ≈ 2.0/0.685; Priest Holmes ≈ 1.5/0.90; Adrian Peterson ≈ −0.75/0.67.
- Author's headline (verbatim): "Since '99, Josh has generated roughly +2.4 rushing EPA/gm while scoring about 0.65 rushing TDs/gm. Only Hurts is close to that combination of rushing value + scoring frequency as a QB."
- Stated data source: "Created On gridironviz.co."
- Caveats (attributed, author methodology note verbatim): "VERY important context: QB rushing and traditional RB rushing are NOT directly comparable. Scrambles and situational QB runs are generally much more favorable from an EPA perspective compared to run of the mill run plays."

**EPA + CPOE with volume scaling** — @CharlesChillFFB, Sept 19 (text-only methodological claim).
- Claim (verbatim): "EPA+CPOE a much better indicator [than YPA]. And still should be scaled with volume." No chart, no source attribution.

**ARBY RB Matchup Rating** — @MagicSportsGuy (StatRankings), Sept 19 (Week 2; TNF grades Sept 23).
- ARBY definition (author's launch thread, verbatim): "ARBY aims to isolate how much of a team's rushing success comes from the offensive line, separating line-created yardage from what the RB generates on his own." (Adjusted Run Blocking Yards.)
- Matchup Rating formula (author's post, verbatim): "combines ARBY & RB Yards per carry (no QB/WR/TE runs) with a blend of 2025 and Week 1 for the Week 2 matchup score." Chart footer formula: "Score: 65% 2025 / 35% 2026 · 65% ARBY / 35% RB yards per carry · 50/50 offense-defense · statrankings.com."
- Representative values: #1 LAR OFF vs NYG DEF 79.1; #5 MIN @ CHI 68.7; #14 CHI vs MIN 55.6; #32 ARI OFF vs SEA DEF 14.0.
- Sept 23 TNF methodology disclosure: 65% ARBY / 35% RB YPC, offense/defense 50/50, game-weighted 5/2 across 2025 Wk 13–17 + 2026 Wk 1–2 (a 7-game window; a "last 5 games" prompt-bubble discrepancy was noted).
- Stated data source (verbatim): "Shout out to @ffTalas and the entire charting team at FTN Data for providing the data that powers this metric & all our advanced metrics."
- Public endpoint: statrankings.com/nfl/advanced/teams/trench-play/offensive-arby and …/defensive-arby (public pages; "Last updated 09/19/26"; columns Team | ARBY Rk | ARBY/Car | RB Yds Rk | RB Yds/Car — 2026 top 5: SF 1/4.05/3/5.54; CAR 2/3.91/10/4.79; CHI 3/3.79/1/8.00; BUF 4/3.52/4/5.50; CLE 5/3.45/31/2.62; full table gated behind StatRankings+).
- Validation (attributed): "ARBY has 'diminishing returns built into' it"; "The distribution isn't 'perfect', & that's the point"; validation tests by @PattonAnalytics (2023–24, RBs ≥ 15 carries): "ARBY ↔ YBC r = 0.70 · YBC ↔ YPC r = 0.77. Team level: ARBY ↔ ALY r = 0.47 · ARBY ↔ YBC r = 0.66 · ALY ↔ YBC ≈ 0.00."

**Run Type Matchup** — @statyxio, Sept 19 (update to the Rush IQ package).
- Definition (as given): the runner's concept split (Inside Zone / Outside Zone / Gap %) crossed with the opponent's per-concept YPC-allowed rank and a Softer/Tougher tag.
- Representative values (vs WAS): Zone 66.7% — 24/26 Softer; Inside Zone 58.4% — 24/24 Softer; Outside Zone 8.3% — 6/26 Tougher; Gap 33.3% — T-6/26 Tougher.
- Caveats (attributed): card footer shows SOFT/TOUGH legend with an "early sample" caveat.

**Coverage-shell receiver splits (DS2 Data Dump)** — @DBro_FFB, Sept 19; @FantasyFFData Sept 20 ("NFL Week 2 'Data Dump'").
- Definition (as given): receiver TPRR/YPRR/first-read % splits by opponent coverage shell (single-high, 2-high) and vs blitz, paired with this week's opponent shell/blitz tendency rate.
- Representative values: Jalen Coker — Week 1 ATL 4th-highest single-high rate (67.4%); vs single-high last yr Wks 13–19: 21% TPRR / 2.81 YPRR; Week 1 vs single-high: 30% TPRR / 5.10 YPRR. Rome Odunze — Wk 1 Brian Flores 73.9% blitz rate; last year vs blitz: 30% TPRR / 32.1% first-read %. Parker Washington 0.25 TPRR / 2.93 YPRR vs Man; Denver 5th-highest Man rate 32.4% over last nine games. Drake London 0.33 TPRR (3rd-highest of any WR) vs Cover 3. Derrick Henry 5.73 YPC on outside-zone rushes vs Saints allowing 4.78.
- Stated data source (verbatim): "powered by @FantasyPtsData."

**Double team rate** — @PFF, Sept 19 (defensive interior, min 20 pass-rush snaps, Week 1).
- Representative values: Dexter Lawrence 80.0%, Calais Campbell 73.9%, Vita Vea 73.1%, Zach Sieler 72.7%.
- Stated data source (verbatim): "POWERED BY PFF."
- Caveats: no definition beyond the metric name and qualifier. Reply pairing (attributed, @EricB0709): "Dex 80% double team rate and still had the highest pass rush win rate among all DTs" — attention-draw × efficiency contextualization.

**Receiving matchup package (coverage matchup + target area matchup)** — @statyxio, Sept 19 (Isaiah Likely vs LA).
- Card 1 "COVERAGE MATCHUP": LA coverage tendency 18% man / 82% zone; Likely performance by coverage (TYPE | ROUTES | TGT | REC | REC YD | Y/T | TGT % | TD): MAN 7/3/3/36/12/43%/0; ZONE 13/4/4/40/10/57%/1.
- Card 2 "TARGET AREA MATCHUP": 12-cell grid (DEEP / INTERMEDIATE / SHORT / BEHIND LOS × LEFT / MIDDLE / RIGHT); each cell = target share % + REC/G + defensive rank ("Rank 1 is the strongest defense"; Tough/Average/Soft/Nq). E.g., INTERMEDIATE LEFT 25% / 2 rec/g / Tough·9th; SHORT RIGHT 13% / 1 rec/g / Soft·25th.
- Named metric "explosive access" (Likely 0%) — definition NOT given anywhere observed (attributed fact; term flagged to watch).
- Caveats (verbatim): "(2026 REG. receiving board. 20 routes on coverage card. Early sample on safety looks. Small sample on target area map.)" Data source: not stated.

**Sunday special 4-player board** — @statyxio, Sept 19.
- Cuts (verbatim): Jalen Coker vs ATL — ATL "leans zone 61 percent"; "5 catches for 103 yards and a score on 18 zone routes." Mike Gesicki vs HOU — "76% slot. 41% target share"; HOU "plays zone 70 percent." Ashton Jeanty vs LAC — "23 mapped carries. 48% through the middle"; "3.43 YAC/Att against 3.36 allowed" (YAC/Att = author's label, not explicitly defined). Baker Mayfield vs CLE — "+14.0 CPOE, 3rd of 32, but −0.223 EPA/dropback, 28th"; CLE "allowed +0.793 EPA/dropback, 32nd"; Mayfield "deep throw on just 3.7% of dropbacks."
- Framing (verbatim): "Accuracy and efficiency are telling two different stories."
- Caveats (verbatim): "(2026 REG. Coker receiving board, 36 routes. Gesicki receiving board, 17 routes. Jeanty rush board, 23 mapped carries. Mayfield QB hub, 36 dropbacks.)"

### September 20

**"Nota del 1 al 10" team composite** — @RaritosFootball, Sept 20 (site launch thread).
- Definition (as given): "EPA, success rate, presión… todo resumido en una cifra. Sin opiniones: solo lo que pasó en el campo." Site's "Cómo leer los datos" (verbatim): "Resume en una cifra lo eficaz que fue un equipo en ataque y en defensa frente al resto de la liga." EPA defined on site (verbatim): "Puntos esperados añadidos. Cuánto vale cada jugada según el down, la distancia y la posición en el campo. Por encima de 0, suma."
- Representative values: JAX 8.6 (9.1 atk / 8.0 def), BAL 8.5, SF 8.3, KC 8.1 (6.7 atk / 9.5 def), CHI 6.5 (9.5 atk / 3.4 def); bottom: DEN 2.9, LAR 2.7, CLE 2.5, IND 2.5.
- Formula: NO weighting formula given anywhere observed — how EPA/success rate/pressure combine into the 1–10 number is unstated (attributed fact).
- Player rating definition, site (verbatim): "Cada jugador se valora con las stats que importan en su posición. Su nota es la media de sus percentiles frente a los de su posición." (1,396 players rated by position.)
- League map: EPA/play offense (x-axis) vs defense (y-axis); quadrants DOMINANTES / DEFENSA SIN ATAQUE / ATAQUE SIN DEFENSA / EN APUROS.
- QB tab columns: NOTA | DROPBACKS | EPA/DROPBACK | ÉXITO EN DROPBACK % | PASES AL OBJETIVO % | PRESIONES → SACK %. Top: Geno Smith (NYJ) 9.3, Brock Purdy 8.7, Jacoby Brissett 8.1.
- Stated data source (verbatim): "DATOS DE SŪMERLIVE · TEMPORADA 2026"; footer: "Fuente: SūmerLive (SumerSports) vía Cuaderno de Temporada NFL."
- Public endpoint: https://raritosdelfootball.com/nfl/estadisticas/ — public, ungated: 32-team table, league map, position-by-position player rankings, week tabs ("Temporada 2026 / Jornada 2 / Jornada 1"); "2 jornadas · 1396 jugadores · actualizado el 18 de septiembre." (The post-linked /nfl/estadistic 404s; correct path /nfl/estadisticas/.)
- Caveats (attributed): underlying sample is 1–2 games; no explicit early-sample disclaimer.

**WR Coverage Upgrades (projected YPRR)** — @ThunderDanDFS, Sept 20.
- Definition (as given, verbatim): "These 50 WRs + TEs should see upgrades vs. their opponent today/tomorrow based on... 1 - 2025 baseline YPPR (yards per route run) 2 - Projected coverages of opponent - I used 80% 2025 data + 20% Week 1. Excluded injured players + TNF players." Difference = PROJ YPPR − 2025 YPPR (implied by columns).
- Columns: Player | OPP | 2025 YPPR | OPP MAN% | OPP ZONE% | OPP 1-High | OPP 2-High | PROJ YPPR | Difference.
- Representative values: Terry McLaurin vs DAL 1.69 → 2.25 (+0.56); DK Metcalf vs NE 1.55 → 1.92 (+0.37); Puka Nacua vs NYG 3.57 → 3.62 (+0.05).
- Stated data source: author's own model (none stated).

**Personnel usage by new offensive coordinators** — @MagicSportsGuy (StatRankings), Sept 20 (Sept 19 post; 2026 season-to-date vs 2025; 11/12/21 personnel).
- Columns: TEAM · OC | '25 % | '26 % | +/− (percentage points).
- Representative values — 11 personnel: Dolphins/Slowik 45.9→70.9 (+25.0); Giants/Nagy 61.6→33.3 (−28.3). 12 personnel: Browns/Switzer 44.8→17.6 (−27.2); Bills/Carmichael 11.9→26.8 (+14.9). 21 personnel: Raiders/Janocko 0.3→38.1 (+37.8); Ravens/Doyle 18.8→0.0 (−18.8). League averages: 11p 57.7%, 12p 21.9%, 21p 7.8%.
- Stated data source: statrankings.com; report generated via the "statrankings.com connector (@claudeai)."

**GoForIt% (fourth-down aggressiveness)** — @ngreenberg, Sept 20.
- Definition (as given): "% of fourth downs that featured a pass or rush play." Measured over Weeks 1–2 of each season, 2002–2026.
- Representative values (visual estimates; author published no table): 2026 ≈ 16% (down from ≈ 21% 2025); 2025 ≈ 20.5%; 2021 ≈ 20.5; 2019 ≈ 14; 2013 ≈ 9 (series low); 2002–2008 range ≈ 9–11.
- Stated data source (verbatim): "Source: TruMedia · Created with Datawrapper."
- Caveats (attributed): author's own framing — "Small-sample blip or new normal?"; Weeks 1–2 early-season window across 25 seasons.

**Game Recap card (15 metrics + historical percentiles)** — @sfdata9ers, Sept 20 (BAL vs NO Week 2; "Early Window" 8-game table same day).
- Inline definitions as given: "Success Rate = % of plays with EPA > 0"; "Explosive Play Rate = rush 10+ yds, pass 20+ yds"; "% Game Time Favored = Vegas win probability" (BAL favored 89.4% of game time vs NO 10.6%).
- Full card (BAL 17 vs NO 24): EPA/Play 0.10 (69.2%) vs 0.14 (75.2%); Success Rate 61% (99.4%) vs 45% (58.0%); EPA/Dropback 0.08 (50.7%) vs 0.23 (71.5%); EPA/Rush 0.15 (89.7%) vs −0.02 (64.0%); ST EPA/Play −0.33 (4.4%) vs 0.33 (95.6%); Yards/Play 5.9 (60.3%) vs 4.9 (27.1%); Explosive Play Rate 9.4% (46.9%) vs 9.8% (51.2%); 3rd Down Efficiency 44% (66.1%) vs 53% (85.4%); Points/Redzone Trip 4.5 (44.6%) both; Turnover Rate 1.6% (46.9%) vs 0.0% (100.0%); Penalties 7/34 (76.0%) vs 5/35 (75.0%); YAC % 36% (21.1%) vs 46% (51.2%); Avg Starting Position Own 27 (29.1%) vs Own 31 (59.8%); Time of Possession 27:15 (27.3%) vs 32:45 (72.7%); % Game Time Favored 89.4% (71.7%) vs 10.6% (28.3%). Percentiles are historical percentiles per cell (attributed footer).
- Post text (verbatim): "#BALvsNO BAL posted a 16.6% higher success rate than NO and still lost - marking the second-largest net success-rate upset since 2022. BAL lost 8 expected points on special teams."
- Early-window table columns: Team (score) | EPA/Play | Success Rate | Special Teams EPA | Explosive Play Rate | Turnover Rate | Penalties (n/yds). E.g., Bills (41) 0.44/59.2%/−0.6/17.9%/0.0%/5-46; Texans (6) −0.24/34.2%/−9.9/10.8%/0.0%/9-83.
- Stated data source: none stated (footer: "Cell colors according to historical percentiles"; @sfdata9ers watermark).

**Waterfall game recap (10 facets)** — @SamHoppen, Sept 20.
- Facets (as given): Pass Off, Run Off, Pass Def, Run Def, Takeaways, Giveaways, Off Pen, Def Pen, Special Teams, Other — each attributed in both win probability added and total EPA.
- Representative values (MIN 9 @ CHI 3, Week 2 — Vikings win-prob added): Pass Off −2.7% / Run Off +14.9% / Pass Def +7.1% / Run Def −1.3% / Takeaways +26.3% / Off Pen −3.9% / Def Pen −1.4% / Special Teams +10% / Other +19%. Vikings total EPA: +0.51 / −4.49 / +1.66 / −0.55 / +7.54 / −0.87 / −0.74 / +2.01 / +4.07.
- Stated data source (verbatim): "Figure: @SamHoppen | Data: nflfastR."
- Caveats: full chart set for all Week 2 games at samhoppen.substack.com (paywall status not verified).

**49ers yards-per-dropback histogram** — @SumerSports, Sept 20.
- Definition (as given, verbatim): "Dropbacks include sacks and scrambles."
- Representative values: 49ers 12.68 yards/dropback (317 yards on 25 dropbacks) vs MIA; 99.7th percentile; 17th of 5,296 team-games; sample "Every team-game since 2016 with 20+ dropbacks" (regular season 2016–2026); distribution markers median 6.23, 90th 8.69, 99th 11.32.
- Stated data source: "Data & Figure @SumerSports."

**QB EPA/play leaderboard** — @hawkblogger, Sept 20 (min 50 dropbacks).
- Representative values: Brock Purdy 2/106/32.93/0.51; Drew Lock 2/110/22.79/0.44; Josh Allen 2/121/32.58/0.39; Dak Prescott 0.34; Bryce Young 0.27.
- Stated data source: none stated (no footer visible in screenshot).

**QB efficiency by half** — @SamHoppen, Sept 20 (Tyler Shough).
- Representative values: 1st half −0.23 EPA/dropback; 2nd half (and OT) +0.32 EPA/dropback. Standard metric; the half-by-half split is the new cut.
- Stated data source: none stated.

**Matchup Grades methodology** — @ThunderDanDFS, Sept 20 (per his public RotoBaller article).
- Definition (as given, verbatim): the grades "incorporate data from both Pro Football Focus and the DVOA ratings found at FTN"; "we are not evaluating the backs' elusiveness, explosiveness, or ability to break tackles. We are looking at the quality of their blockers, their offensive schemes, projected role and usage, and then finally taking an educated guess on the projected game script."
- Caveats (attributed): "This data is fresh from Week 1 of this season only, so we have to also take it with a grain of salt... we should look at both last year's data and this season's small sample size to see who pops when we blend the two."

**Time-windowed carry share** — @RyanJ_Heath, Sept 20 (Week 2 recap thread; stats "via @FantasyPtsData").
- Cuts (as given): Henderson 76% carry share restricted to the window between the first drive and the two-minute warning (39 of his 76 yards on his Q1 TD); Chuba Hubbard 71% "pre-garbage time" carry share.
- Stated data source: @FantasyPtsData.

**Opponent-coach splits** — @FantasyPtsData, Sept 20 (Data Suite 2.0 Splits view).
- Cut (as given): Trey McBride "double-digit targets in 5 of 5 career games against Mike MacDonald, averaging 12.6 targets per game and 20.9 FPG" — Splits view filtered by "Opp HC Mike Macdonald" / "Opp DC Mike Macdonald" (columns: RTE %, TGT %, YPRR, FP, XFP, DIFF, FP/RR per game).
- Caveats (attributed, @EdgeAI_App reply): "12.6 targets a game with Brissett in only one. That's role, not matchup."

**"Relevant play" (methodological definition)** — @sfdata9ers, Sept 19–20.
- Definition (as given, verbatim): "Relevant play = a QB dropback or QB run."

### September 21

**QB read distribution** — @sfdata9ers, Sept 21 (Sept 21 post; Week 2 cut: 34 QBs).
- Columns (as given): Avg. Time to Throw + first-read / second-read / designated-receiver / checkdown / scramble shares.
- Stated data source: "Data: FTN." ("J.Strand" read likely Jaxson Dart — unconfirmed, attributed.)
- Appearing Sept 21 and Sept 23 (Week 2 cut).

**Allen composite QB ranking** — @sfdata9ers, Sept 21.
- Components (as given): five metrics — EPA/play, success rate, CPOE, PFF grade, passer rating — across 2024 / 2025 / 2026 Weeks 1–2.

**Allen heatmap (EPA/att × CPOE by air-yard × field-third cells)** — @sfdata9ers, Sept 21.
- Structure (as given): passing-efficiency grid by air yards × left/middle/right; comp/att, yards, EPA/att per cell. CPOE used because raw completion percentage is not comparable across depths (author's framing).

**NGS CPOE leaderboard** — @sfdata9ers via @NextGenStats, Sept 21.
- Representative values: Jaxson Dart +14.6% (leader).
- Stated data source: @NextGenStats.

**Under-center efficiency** — @tejfbanalytics (Tej Seth), Sept 21.
- Definition (as given): EPA/play under center vs shotgun.
- Representative values: Coen's Jaguars 0.42 EPA/play under center (2nd) vs −0.06 shotgun (25th); league average +0.16 under center vs +0.05 shotgun.
- Stated data source: SumerSports charting.

**Under-center rate (team)** — @tejfbanalytics, Sept 21.
- Representative values: JAX 71.3% under center — most since the 2022 Rams (72.8%).
- Stated data source: SumerSports charting.

**QB total EPA leaderboard (entering Week 2)** — @tejfbanalytics, Sept 21.
- Representative values: Lawrence +31.1, Dart +27.8, Allen +26.1.
- Stated data source: SumerSports charting.

**Separation Market Share** — @MagicSportsGuy (StatRankings), Sept 21.
- Representative values (2025): JSN 21.4%, J. Reed 19.3%.
- Stated data source: statrankings.com/ai.

**Average Separation Score × TPRR** — @MagicSportsGuy (StatRankings), Sept 21.
- Representative values: Ayomanor 0.0296, K. Mitchell 0.0264, C. Watson 0.0232.
- Stated data source: StatRankings.

**AVG SEPARATION SCORE vs TPRR** — @FantasyPtsData, Sept 23 (10:28 AM; listed here as the Fantasy Points proprietary variant; first observed in this family Sept 21 via @MagicSportsGuy's StatRankings cut).
- Representative values: JSN / P. Washington / D. Adams "aliens"; MHJ flagged.
- Stated data source: @FantasyPtsData (ASS proprietary).
- Caveats (attributed): validity-criticism reply in thread.

**1D/RR (first downs per route run)** — @jmthrivept, Sept 21.
- Definition (as given): first downs ÷ routes run.
- Stated data source: Fantasy Points Data.

**First-read target share × 1D/RR** — @jmthrivept, Sept 21.
- Stated data source: Fantasy Points Data.

**Catchable target rate** — @RyanPaganetti, Sept 21.
- Formula (as given): `catchable targets ÷ total targets`.
- Representative values: CeeDee Lamb 100%.
- Stated data source: Fantasy Points.

**Catchable air-yardage rate** — @RyanPaganetti, Sept 21.
- Formula (as given): `catchable air yards ÷ total air yards`.
- Representative values: Lamb 100%.
- Stated data source: Fantasy Points.

**Catchable / uncatchable air yards** — @RyanPaganetti, Sept 21.
- Stated data source: Fantasy Points.

**Average cushion × separation at catch** — @RyanPaganetti, Sept 21.
- Stated data source: Fantasy Points.

**Average separation created** — @RyanPaganetti, Sept 21.
- Representative values: Hunter 4.5 yards (leader).
- Stated data source: Fantasy Points.

**Average Separation Created × TPRR** — @jmthrivept, Sept 21.
- Stated data source: Fantasy Points Data (implied by account pairing).

**Average separation leaderboard** — @NextGenStats, Sept 21.
- Representative values: Mitchell 4.4 yards (cushion 7.2); only 3 WRs ≥ 3.5 yards in 2026 vs 15 in 2024 Weeks 1–2 and 21 in 2023.
- Stated data source: @NextGenStats.

**TPRR × YPRR scatter** — @ScottBarrettDFB, Sept 21 (2026; min 25 routes).
- Representative values: top-right — J. Smith-Njigba, P. Washington.
- Stated data source (verbatim): "Data: @FantasyPtsData | min 25 routes."
- Caveats (attributed, author reply verbatim): "No. It's Week 2" (small-sample flag).

**Intended air-yard share** — @GridironInfo_, Sept 21.
- Representative values: Olave 44.4%.
- Stated data source: nflverse. (Week-over-week intended-air-yard-share shifts revisited by @statyxio Sept 23: Lamb 35.9%→57.4% / 44→153 yds; Adams 27.2%→57.4% / 26→195 yds.)

**Average intended air yards** — @GridironInfo_, Sept 21.
- Representative values: Metcalf 17.5.
- Stated data source: nflverse.

**Expected-pass-situation QB EPA** — @GridironInfo_, Sept 21; @SamHoppen, Sept 23 (revisit, approximate).
- Definition (as given): expected passing situation = expected pass probability > 70%.
- Representative values: Goff 0.69 (@GridironInfo_); Sept 23 revisit: J. Dart ~+1.2, C. Rush ~−0.63 (approximate).
- Stated data source: nflverse (Sept 21).

**Deep-pass rate + deep-pass EPA** — @GridironInfo_, Sept 21.
- Stated data source: nflverse.

**Pass Performance by Zone** — @GridironInfo_, Sept 21.
- Stated data source: nflverse.

**QB explosive-play rate × negative-play rate** — @GridironInfo_, Sept 21 (Dart); @PattonAnalytics, Sept 23 (9:10 AM; "Explosive and Negative Play Rates for Quarterbacks" — explosive = catchable passes + scrambles 20+ yds; unlabeled axes — approximate).

**QB EPA gained on defensive penalties** — @GridironInfo_, Sept 21; @sfdata9ers, Sept 23 (2:57 PM; 28 QBs).
- Definition (as given): accepted penalties and plays with no yards gained only.
- Representative values: Lawrence +4.5 (@GridironInfo_); @sfdata9ers chart names no data source; author: unlisted players = 0 EPA.
- Stated data source: nflfastR (@GridironInfo_).

**Pressure-to-sack rate** — @GridironInfo_, Sept 21; @PFF, Sept 24 AM.
- Definition (as given): share of pressured dropbacks ending in sacks (sacks ÷ pressures).
- Representative values: Maye 23.1% (2nd) (@GridironInfo_, nflverse); Sept 24 @PFF (min 10 pressures): Purdy 0.0% (0 sacks/15 pressures), Daniels 4.2% (1/24).

**QB hit percentage** — @GridironInfo_, Sept 21; @statyxio, Sept 23 ("QB-Hit % leaders" — ranks only, no values; MIN #1; ranks 3/6-7/10-11/13/16-17/20/29-32 unreadable).
- Representative values: Burrow 27.8% (30th).
- Stated data source: nflverse.

**Blitz rate × under-pressure rate** — @GridironInfo_, Sept 21.
- Stated data source: nflverse.

**Double-team rate × pass-rush win rate** — @GridironInfo_, Sept 21.
- Stated data source: nflverse.

**Pressure rate generated × allowed** — @GridironInfo_, Sept 21.
- Representative values: KC 53.8% generated.
- Stated data source: nflverse.

**Quick pressure** — @NextGenStats, Sept 21.
- Definition (as given): pressure under 2.5 seconds.
- Representative values: Lawrence 18 (2nd); Nix 19.

**Get-off / time to pressure** — @NextGenStats, Sept 21.
- Representative values: Tuipulotu 0.77s get-off; Verse 2.53s time to pressure.

**EPA per attempt on throws with 10+ air yards** — @GridironInfo_, Sept 21; @GridironInfo_, Sept 24 AM (min 8 throws).
- Representative values: Purdy +1.10/att (Sept 21); Sept 24: Cooper Rush −1.46 on 9 attempts; Jameis Winston −0.49 on 12.

**Separation × TPRR** — @GridironInfo_, Sept 21.
- Representative values: Downs 0.68.
- Stated data source: nflverse.

**Yards per route vs man / vs zone** — @GridironInfo_, Sept 21; @statyxio, Sept 23 ("Man vs zone: Yards / route" — 12 WRs, Route IQ, min 4 targets, thin-sample flags).
- Representative values: J. Reed 4.98 vs man (@GridironInfo_, nflverse).

**Coverage rates faced × TPRR** — @GridironInfo_, Sept 21.
- Representative values: L. McConkey 67.9% zone faced / 2.55 YPRR.
- Stated data source: nflverse.

**YBC × YAC per attempt** — @SumerSports, Sept 21 ("WHERE RUNNING BACKS GET THEIR YARDS"; pre-MNF; every RB with 15+ carries).
- Representative values: dashed averages 1.17 (YBC), 3.06 (YAC); James Cook ~3.7 YBC/att (~2.25 YAC); Saquon Barkley ~0.1 YBC, ~5.1 YAC; Kyle Monangai ~5.7 YAC; Kenneth Walker ~4.6 YAC.
- Stated data source: "Data & Figure @SūmerSports."

**YACO/att × missed tackles forced per attempt** — @FantasyPtsData, Sept 21 (min 22 carries).
- Representative values: Kenneth Walker isolated top-right on both axes; rookie Jadarian Price also high.
- Post text (verbatim): "Kenneth Walker is on a different planet… Terrific buy-low opportunity."

**YAC/rush × avoided tackles per rush** — @AcccountStat, Sept 21 (2026 Weeks 1–2, excl. MNF, min 15 attempts).
- Representative values: Kenneth Walker III highest avoided tackles/rush (top of Y axis); Kyle Monangai highest YAC/rush (far right).
- Stated data source (verbatim): "Data: NFL Pro, PFF, and SumerSports"; values averaged across the 3 sources. Point size scaled by attempts.
- Caveats: weeks 1–2 only, excludes MNF, min 15 attempts.

**Dynasty Usage Lab panels** — @DynatyzeFF, Sept 21–24 (Sept 24 AM panel set).
- Panels (as given): carry share, snap rate, carries, backfield snap/carry distribution, top-three concentration, team PROE, red-zone alpha.
- Representative values (Sept 24 AM): Gibbs 84.9% carry share / 78.2% snaps / 45 carries; Taylor 82.7% / 91.6% / 43.
- Public endpoint: dynatyze.com/football/usage-lab (public usage surfaces; league sync and premium tools gated).

**Fantasy Points Data Suite 2.0 tool types** — @FantasyPtsData, Sept 21 (public-facing chart tool types documented).
- Note: "FREE Premium Stats & Tools" language documented; no exact raw-data API identified in the sweeps.

**NGS glossary and methodology material** — @NextGenStats profile deep-dive, Sept 21 (Garrett-directed).
- Metrics named (definitions as printed — legends define visual encodings only; only "quick pressure" defined in text as under 2.5 seconds): MTF, RYOE, CPOE, EPA/dropback, pressures/pressure rate %, get-off (sec), blitz rate, quick pressures, time to pressure, top speed (mph), YAC / YAC over expected, air yards/air distance, target separation, completion probability, WP added, success rate, RECYOE, NGS overall draft score (0–100; axis labels < AVG/AVERAGE/GOOD/ELITE), NGS athleticism score, route classification (go/fade), motion-at-snap %, under-center splits, on/off-field splits, per-defender coverage matchup tables, team yards-after-missed-tackles, chip blocks faced.
- Recurring graphic formats: Pass Chart (pass-location map + COMP/ATT/YARDS/TD-INT + CPOE or EPA/DB); Carry Chart (carry-path map + CARRIES/YARDS/TD + MTF/RYOE/success rate); Route Chart (route map + TARGETS-REC/YARDS/TD + RECYOE); Pass Rush Chart (rush paths + PASS RUSHES/PRESSURES (%)/SACKS + GET OFF or BLITZ RATE).

**statyx Route IQ / matchup boards** — @statyxio, Sept 21–23.
- Sept 23: "NFL Week 3 2026 WR Matchups: Man vs Zone" page — full board + injury checks; opponent coverage frequency × player TPRR (author caveats listed).
- Public endpoint: statyx.io (statyx.io/app returned a DNS error from the sweep VM — not a paywall, domain did not resolve).

**statrankings.com/ai** — Sept 21 (MagicSportsGuy; subscribers generate matchup-report PDFs via prompt; AI-agent access via Claude/ChatGPT/Grok advertised on the StatRankings+ page).

### September 22

**9YOE** — @GridironInfo_, Sept 22 (NYG @ LAR Week 2 recap footer).
- Definition: NOT given by the author (attributed fact only). Footer (verbatim): "Data: nflverse (nflready) ptp + FTN charting + Next Gen Stats | aDOT excludes throwaways | 9YOE shown only where NGS charted the back | 2026-09-22."
- Representative values: Stafford 9.6 9YOE; Dart −8.1 9YOE (passing table columns: 22/28, 289 yds, 2 TD, 6.2 air yds/att, 7.8 aDOT, 12.6 aY/att, 9.6 9YOE, 9.2% off-tgt, 8.8% pressured, +0.66 EPA/att).

**Playoff probabilities** — @GridironInfo_, Sept 22 (after Week 2; AFC chart + NFC pinned).
- Splits (as given): 1 SEED/DIVISION / DIVISION / WILD CARD.
- Stated data source (footer verbatim): "Data: Kalshi."

**Average drive start (offense)** — @GridironInfo_, Sept 22.
- Representative values: CAR 42.7, LV 40.8, DAL 40.1 (top); LAC 20.5, MIN 19.6 (bottom).

**Series results** — @GridironInfo_, Sept 22 (stacked bars: how each team's offensive series ended).

**Move-the-chains by down** — @GridironInfo_, Sept 22 ("When did they move the chains" — first-down-by-down stacked outcome chart).

**First Down per Route Rate** — @DevyEusuf, Sept 22 (Brian Thomas > Parker Washington; "actually 5th among…" truncated; no definition given).

**XFP teammate cut** — @DevyEusuf, Sept 22.
- Cut (as given): Jalen Coker + Tetairoa McMillan "only teammates averaging 16.0+ XFP/game."

**Fantasy Points Over Expectation** — @DevyEusuf, Sept 22.
- Representative values: Denzel Boston 8.57 FPOE/game ("going to regress hard").
- Stated data source (cited): "(Fantasy Points Data)."

**First-read target share / YPRR callouts** — @FantasyPtsData, Sept 22 (Metcalf contract, Burden first-read share, Wicks WR12 in YPRR).

**Most 20+ yard passes without a completion** — @PFF, Sept 22.
- Representative values: Rodgers 0-9, Winston 0-4, Rush 0-2, Ward 0-1, Murray 0-1.
- Stated data source: PFF.

**PROE leaders and weekly trends** — @SamHoppen, Sept 22.
- Definition (as given): actual vs expected pass rate; expected based on nflfastR's model; PROE of 0% = black line.
- Representative values: above expected — DAL, PIT, CAR, NO, TB; below — SF, LV, MIN, SEA.

**EPA per drive team tiers** — @SamHoppen, Sept 22 (Off EPA/Drive vs Def EPA/Drive; diagonals = net tiers; kneeldown drives excluded).
- Representative values: SF top net tier; DAL strong off (~+1.75) / very weak def (~+1.85).

**Offensive and defensive explosive play rates** — @SamHoppen, Sept 22 (Run = 10+ yds, Pass = 20+ yds).
- Representative values: BUF 15.4% (1), CAR 10.7% (2), LAR 10.7% (3), SF 10.0% (4), PIT 9.1% (5). Bottom rows ambiguous in the pass report (offense vs defense table unclear) — recorded verbatim with that note.

**Week 2 success rates** — @SamHoppen, Sept 22 (updated to include MNF).
- Representative values: NYG 6 @ LAR 28 = largest net success-rate margin (~+24% LAR).

**Week 2 Objective Power Ratings** — @benbbaldwin, Sept 22 (full 32).
- Definition (as given): "Market-implied win% vs. a league-average team on a neutral field."
- Stated data source (footer verbatim): "Blends near-term game lines with division/conference/Super Bowl/playoff/#1 seed futures (Kalshi). Date: 2026-09-22."

**Plays run while trailing %** — @RyanJ_Heath, Sept 22 (2026).
- Representative values: ATL 95%, WAS 90%, MIA 85%, CLE 80%, NO 78% (highest); LV 8%, BAL 7%, NYJ 5%, JAX 5% (lowest).

**Cardio Index** — @MagicSportsGuy (StatRankings), Sept 22 PM (debut post).
- Definition (as given): ranks pass catchers by Route Participation % against TPRR; flags high-route-share / low-target-rate players.
- Representative values ("Cardio Kings" chart, 10 rows): Marvin Harrison Jr. 87.1% route participation / 0.07 TPRR tops the list.
- Author framing (attributed): leans positive regression for high-route-% players, with a "sacrificial role" caveat (thread reply, partially truncated in UI). No scalar formula was published.
- Public endpoint: full stat page "coming soon" at statrankings.com (page not yet live at sweep time).

**Week 3 Composite Power Ratings** — @SamHoppen, Sept 22 PM.
- Definition (as given): mean of 6 sources (ESPN FPI, @greerreNFL nfelo, @inpredict Inpredictable, @KevinCole___ Unexpected Points, FTN DVOA, PFF), expressed as expected spread vs an average team, with per-team standard deviation across sources as a disagreement gauge.
- Representative values: disagreement high — CHI 2.3, NYG 2.4; low — BAL 0.4, LV 0.5.
- FTN DVOA construction (attributed): preseason priors + in-season DVOA weighted to last few games, /3.6%.
- Companion: Substack + paid Google Sheets (not accessed).

**Box count × rushing success** — @SumerSports, Sept 22 PM ("Stacking the box doesn't stop the run" thread).
- Structure (as given): box-count-vs-rush-success scatterplot with inverted success axis (up-and-right = better) and league-average reference lines; thread layers per-team run-concept mix and "yards before contact per designed carry, top 5 / bottom 5."
- Representative values: Bills, Rams, Broncos ("all man/gap-heavy teams") the only teams over 2.0 YBC per designed carry.
- Caveats (attributed, PressX_Global reply): selection bias — defenses stack against teams they expect to run.

**Donald return tracking cut** — @SumerSports, Sept 22 (Aaron Donald).
- Representative values: 32 defensive snaps, 27.8% PRWR, 2 run stops, 1 pressure, 1 TFL.

