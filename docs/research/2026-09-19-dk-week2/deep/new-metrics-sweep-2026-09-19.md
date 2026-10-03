# New-Metrics Sweep — Sports Repo Past 7 Days (2026-09-19)

**Task:** Garrett said he added "a shit ton of new metrics" over the past week (esp. last 2 days). Inventory every new metric/table added to Beexly/Sports in the last 7 days, cross-reference against `dk-week2-2026-main-research.md`, and record what the unused ones change for the Week 2 DraftKings main slate.
**Method:** `git pull` (already up to date), `git log --since="7 days ago"`, file-level diff review, 3 parallel inventory lanes. Research only — no lineups, nothing posted.
**Slate:** DK Classic main, Sun 2026-09-20, 13 games. OUT: DET@BUF (Thu), IND@KC (SNF), NYG@LAR (Mon).

---

## PART A — INVENTORY OF NEW METRICS

### A1. X Analytics Sweep 2026-09-19 AM (commit d91c378fb; 4 tables)

**1. benbbaldwin-objective-ratings-v3-2026-09-19.csv** (`docs/research/2026-09-19/full-tables/`)
- Measures: "Market-implied win% vs. a league-average team on a neutral field" — one team-strength number, 32 teams in 6 tiers.
- Source: @benbbaldwin (Computer Cowboy, nflfastR creator), 2026-09-19 7:51 AM CDT, "Team Tiers" v3 ("final" answer; author: "I am a little skeptical about the Broncos being this good tho").
- Method: footer — "Blends near-term game lines with division/conference/Super Bowl/playoff/#1 seed futures (Kalshi)", dated 2026-09-19. (v2 used DraftKings lines/futures; v3 switched to Kalshi.)
- Slate teams (26 of 32): True Contenders — SEA 65.6 (3), BAL 65.2 (5), SF 64.2 (6), PHI 62.2 (7). Above Avg — DEN 60.5 (8), CHI 60.0 (9), NE 59.3 (10), HOU 59.2 (11), LAC 59.1 (12), GB 56.8 (14), JAX 56.7 (15), DAL 56.5 (16), CIN 55.7 (17). Below Avg — MIN 49.0 (18), TB 48.3 (19), PIT 45.2 (21), WAS 42.9 (23), NO 41.0 (24). Bad — CAR 38.4 (25), LV 35.9 (26), ATL 33.4 (27), NYJ 33.0 (28), ARI 32.6 (29). Very Bad — TEN 26.0 (30), MIA 25.6 (31), CLE 20.1 (32). Off-slate: LAR 72.6 (1), BUF 67.7 (2), KC 65.5 (4), DET 58.3 (13), NYG 46.9 (20), IND 43.1 (22).
- DFS use: market-strength baseline for stacking — biggest tier gaps (TB 48.3 vs CLE 20.1; BAL 65.2 vs NO 41.0; SF 64.2 vs MIA 25.6; PHI 62.2 vs TEN 26.0) flag blowout risk and underdog pass-volume fades.

**2. devyeusuf-rookie-debut-wr-game1.csv** (`docs/research/2026-09-19/full-tables/`)
- Measures: first-career-NFL-game stat lines, cross-era: 2026 rookie Makai Lemon vs JSN (2023 debut) vs Justin Jefferson (2020 debut). Columns: Rec Grade | YPRR | REC YD | TGT | ROUTE | ADOT | YAC/REC.
- Source: @DevyEusuf, 2026-09-19 1:44 AM CDT. Footer: "Data: PFF". No definitions, no author method replies.
- Values: Lemon 52.9 / -0.17 / -5 / 4 / 29 / -0.30 / 1.0; JSN 54.1 / 0.68 / 13 / 4 / 19 / 0.68 / 4.3; Jefferson 51.5 / 1.00 / 26 / 3 / 26 / 3.00 / 11.0.
- Slate: Makai Lemon is on PHI (PHI@TEN, main slate). JSN (SEA@ARI) and Jefferson (MIN@CHI) rows are their debuts, not current form.
- DFS use: Lemon was on the field (29 routes) but unproductive (-5 yards, -0.17 YPRR, negative aDOT) in game 1 — context on whether a cheap main-slate salary is trap vs opportunity if routes persist. Single-game sample; not predictive.

**3. bucsjuice-sumersports-prwr-edge-week2.csv** (`docs/research/2026-09-19/chart-reads/`, APPROXIMATE chart reads)
- Measures: edge-rusher production ranked by Pass Rush Win %, with pressure/run-defense lines.
- Source: @BucsJuice screenshot of SumerSports.com public edge-rusher table, 2026-09-19 6:52 AM CDT (min 25 snaps, sorted by PR Win % desc, "Last Updated 09-18-2026 01:32 PM EST"). Context: @Shauncore 9/18 — SumerSports added PRWR, so three public PRWR metrics now exist (Sumer, PFF, ESPN).
- Slate players (approx): Jalyx Hunt (PHI, vs TEN) 29.6% PR win; Al-Quadin Muhammad (TB, vs CLE) 27.3%; Brenton Cox (GB, vs NYJ) 27.3%; Maxx Crosby (LV, vs LAC) 26.7% (1.5 sacks); Will Anderson (HOU, vs CIN) 24.1%; Will McDonald (NYJ, vs GB) 22.2% (1.0 sack); Chase Young (NO, vs BAL) 22.2%.
- DFS use: QB-fade/DST pressure angles — Hunt vs the slate's weakest-rated line (TEN 26.0), Muhammad vs CLE (20.1). Counter-read: avoid pocket passers facing top PR-win edges. Tiny post-Wk1 samples; snaps column is the shakiest read.

**4. mediJo20-rushing-epa-vs-rushing-tds-1999-2026.csv** (`docs/research/2026-09-19/chart-reads/`, APPROXIMATE reads)
- Measures: career rushing EPA/game vs rushing TDs/game, 30 labeled rushers, 1999-2026 regular season (gridironviz.co chart via @WillBrinson, quoted by @MediJo20 9/19 9:15 AM CDT). Avg lines: -0.4 EPA/gm, 0.60 TDs/gm.
- Author note (verbatim): "QB rushing and traditional RB rushing are NOT directly comparable. Scrambles and situational QB runs are generally much more favorable from an EPA perspective."
- Slate players: Jalen Hurts (PHI QB) ~2.0 EPA/gm / ~0.685 TDs/gm — slate's only QB in the elite rushing-value+scoring quadrant ("Only Hurts is close to [Allen's] combination"); Derrick Henry ~0.1 / 0.82 (elite TD band, near-zero efficiency = goal-line hammer); Josh Jacobs ~-1.6 / 0.70 (TD-dependent, deeply negative efficiency); James Conner ~-0.5 / 0.56; Alvin Kamara ~-0.75 / 0.51 (below TD avg — receiving-dependent).
- DFS use: rushing-score equity profiles — Henry/Hurts get rushing-TD equity support; Jacobs is TD-or-bust at salary; Kamara needs receiving work to pay off.

**Text-only (no table):** @CharlesChillFFB 9/19 4:41 AM CDT — "EPA+CPOE a much better indicator [than YPA]. And still should be scaled with volume." Methodological claim supporting the EPA/CPOE composite reads already in the research.

### A2. StatRankings CSV Dump (commit 4a50a0469, 2026-09-18; `docs/research/2026-09-17/statrankings/`)

Three files, no README in-dir (now inventoried in AGENTS.md by this sweep). Identical schema on all three:
`category,metric_path,metric_title,free_full,rank,name,name_href,team,position,season_label,season_value,last_1,last_3,last_5,last_10,home,away,extra_json`
- `free_full`: yes = free full leaderboard (only 5 metrics x 25 rows in players file: usage/target-share, receiving/air-yards, air-yards %, drops, drop %); everything else is `no` = paywalled top-5 preview.
- All rows are **2026 Week 1 only** (season_label='2026'); no standalone 2025 rows — 2025 appears only as baseline inside `extra_json` on team rows. Red-zone family rows have blank season_label but 2026 detail in extra_json. Dump pulled after TNF, so DET/BUF rows may carry 2 games.
- Source/method: StatRankings LLC (Kevin Adams / @MagicSportsGuy; nflfastR + FTN Data per their July 2026 OWS preview). Proprietary: PROE+ (Pass Rate Over Expectation x Pace), ARBY (Adjusted Run Blocking Yards/Carry), xFP, CoverageIQ (man/zone + 8 shells). Note: `last_1/3/5/10/home/away` columns just repeat the 2026 value here — not real splits.
- Families: **players** (1525 rows, 290 metrics): alignment, cb (per-CB allowed by shell/man-zone), efficiency (DK/FD/FFPC/NFFC/Underdog FPPG, FP per route/touch/target/dropback/opportunity), qb-rushing, qb (CPOE, pressure, ANY/A, clean/under-pressure rating, man/zone), rb (utilization, touch share, FMT, YAC, stacked box), receiving (aDOT, YPRR, target quality/separation/win rate man-vs-zone, alignment), red-zone (inside-20/10/5/2), usage (target share, TPRR, route %, snap rate, motion, first-read %). **teams** (607 rows, 122 metrics): coverage, defense, epa, fantasy-points-allowed, pace-playcalling (PROE+, neutral pace, game-script pass/rush rates, motion, no-huddle, play-action), passing, rushing, trench-play (ARBY, expected pressures, pressure rate over expected). **coverage** (100 rows, 20 metrics): CoverageIQ+ top-5 leaderboards with TPRR/YPRR/FP-per-route/First-Read % + "Next Opp" in extra_json (confirms 6 Week 2 pairings: NO-BAL, GB-NYJ, CAR-ATL, CIN-HOU, PIT-NE, DAL-WAS).
- **Data-quality flag:** some team affiliations look stale vs real rosters (Kenneth Walker III on KC, A.J. Brown on NE, Mike Evans on SF, Jaylen Waddle on DEN; coverage.csv "Next Opp" DET vs NYJ is stale post-TNF). Use the numbers; verify team context.
- PROE+ `season_value` is `-` in the CSV (recoverable from the @MagicSportsGuy X image already transcribed: TEN +1.42, CAR +1.36, GB +1.32, PIT +1.15, NO +1.15, CIN +1.13, CHI +1.04, TB +0.76, PHI +0.75, SF +0.72, WAS +0.71, MIN +0.08, NYJ -0.04, ...).

Slate highlights (2026 Wk1 values, verbatim):
- DK FPPG: Caleb Williams (CHI) 37.3; Derrick Henry (BAL) 38.3 — top-2 slate scorers in the dump's top 5.
- Target share (free full table): JSN (SEA) 45.8%; Bijan Robinson (ATL) 45.5%; Justin Jefferson (MIN) 37.5%; Trey McBride (ARI) 35.1%; Garrett Wilson (NYJ) 29.2%.
- First-read target share: JSN 57.9%; Jefferson 52.9%; Bijan 50.0%.
- Air yards (free): Chris Olave (NO) 234; DK Metcalf (PIT) 204; Matthew Golden (GB) 137; Malik Washington (MIA) 135; Jalen Coker (CAR) 124.
- YPRR: Zay Flowers (BAL) 15.0 (doubtful); Antonio Williams (WAS) 6.4; Ladd McConkey (LAC) 6.3 (50/50); Parker Washington (JAX) 5.5.
- Red zone: Henry inside-10 rushing 5 att / 15 yds / 2 TD (83.3% rush share); TE inside-10 targets tied: McBride / Juwan Johnson (NO) / Mike Gesicki (CIN) 2 each (100%); Swift 2nd in inside-5 rush (with Javonte Williams DAL, David Montgomery HOU).
- QB under pressure: Caleb 120.6 passer rating (1st); Bryce Young (CAR) 111.9 (2nd); Love 71.3; Hurts 69.9. Pressure faced: Nix 54.5, Daniels 41.0, Love 39.1, Hurts 36.4, Burrow 35.1.
- QB rushing: scrambles/gm — Caleb 7.0, Maye 6.0, Herbert 5.0, Willis 5.0, Baker 4.0. FP/dropback: Caleb 1.20, Young 0.81, Purdy 0.62.
- Team EPA/play (offense): CHI 0.419 (1st, total 29.4); BAL 0.377; JAX 0.354 (pass EPA/play 0.773, 1st). Success rate: JAX 60.4%, SF 56.3%, CHI 54.3%, BAL 50.0%.
- Defense: pressure rate — JAX 53.1%, PHI 45.0%, CAR 45.0%, WAS 44.1%; sack% — JAX 16.7%, PIT 15.4%, LV 13.5%, CIN 11.1%; blitz — MIN 80.4%, GB 48.4%, NE 48.1%; slot FP/route allowed — CLE 1.48, PHI 0.70, CAR 0.60; perimeter FP/route allowed — HOU 0.69, CLE 0.64, NE 0.58, CHI 0.54, GB 0.51; FPA (DK FPTS/gm, position unlabeled, likely QB) — SF 6.5, PIT 7.7, TEN 9.3, BAL 10.0; neutral pace (sec/play) — GB 21.8, TEN 22.0, CAR 22.3, WAS 22.7, NO 23.6; defensive ARBY — ARI 1.67, WAS 1.78, SEA 1.81, GB 1.90, MIN 1.98.
- Coverage-intelligence extra_json: Olave 28.95% TPRR / 3.45 YPRR / 35.0% first-read.

### A3. Props-Consensus Lane + GSE-Lab Tables (commit ac299ab07, 2026-09-17)

**Corpus note:** the entire props-consensus lane was built for TNF DET@BUF (off the main slate). Value = methods + metric definitions + transferable 2025 team tables, not slate player values. Repo copies now canonical: `docs/research/2026-09-17/props-consensus/` and `docs/research/2026-09-17/gse-lab/` (AGENTS.md previously pointed at old `~/workspace/gse-research/` paths — path map added by this sweep).

**Method (transferable, from our-metric-stack.md / projection_methods.md):**
- Base = 2025 full-season per-game means; 2026 Week 1 = role-check only, efficiency never blended (100% 2025 / 0% Wk1 for rates).
- Script-adjusted volume: measured 2025 dropback rates by win-probability bucket (e.g., neutral ~0.57, trailing ~0.62-0.68).
- Garbage-time correction: filters remove ~11% of plays; volume scaled by measured unfiltered/filtered ratios (moved St. Brown receptions 6.5 to 8.0 in the TNF lane).
- Sack props deliberately NULL — pressure-to-sack conversion near-pure luck (R^2 < 0.005); literature applied as veto.
- `consensus_lines.csv`: 52 rows, all TNF (total 54.5, BUF -4.5 to -5; player lines book-identified). No Week 2 game lines — the agreement/disagreement method is reusable, the lines are not. Gaps documented: no Pinnacle/Circa, no defensive props, no individual kicker props, no first-TD board.
- `kicker-defense-props.md`: TNF-only projections; structure reusable. Lane's one lean-against: "Both teams 2+ FGs" +275 vs ~11% fair.

**Transferable 2025 team tables (gse-lab; EPA/play | EPA/db | EPA/rush | def EPA/play | pts/drive):**
CHI 0.0953|0.1234|0.0545|-0.014|2.672; DAL 0.1353|0.2090|0.0183|-0.179|3.078; JAX 0.0492|0.0785|0.0011|0.0913|2.890; SF 0.1077|0.1943|-0.018|-0.081|2.972; NE 0.1856|0.3328|-0.049|0.0470|3.245; GB 0.1395|0.2880|-0.055|-0.050|2.715; HOU -0.021|0.0474|-0.126|0.1104|2.308; TB 0.0056|0.0527|-0.064|-0.031|2.289; CLE -0.173|-0.224|-0.096|0.0753|1.641; BAL 0.0569|0.0582|0.0554|-0.053|2.807; PHI 0.0160|0.0358|-0.013|0.0955|2.339; SEA 0.0613|0.1323|-0.026|0.1117|3.037; LV -0.228|-0.220|-0.242|-0.039|1.575; TEN -0.181|-0.194|-0.160|-0.140|1.808; NO -0.079|-0.039|-0.142|0.0255|1.974; CAR -0.071|-0.086|-0.051|-0.076|2.101; NYJ -0.171|-0.205|-0.129|-0.166|1.935; PIT 0.0422|0.0373|0.0496|-0.007|2.611; MIN -0.109|-0.147|-0.052|0.0949|2.205; WAS -0.002|0.0270|-0.044|-0.148|2.561; MIA -0.020|-0.018|-0.023|-0.087|2.409; ARI -0.027|0.0190|-0.129|-0.078|2.290; CIN -0.001|-0.039|0.0714|-0.139|2.653; DEN 0.0468|0.1046|-0.052|0.0798|2.401.
2026 Wk1 single-game standouts (role-check only): JAX 0.3998 EPA/play (0.7925/db), CHI 0.3598 (0.4827/db), NYJ 0.2713, SF 0.2624, BAL 0.2341; bottom: CLE -0.492 (-0.643/db), PIT -0.311, TEN -0.264, DEN -0.260.
- **Turnover luck 2025** (actual minus expected INTs): CLE +7.11, LV +7.74, MIA +6.82, MIN +5.74 thrown over expected (unlucky, positive regression); DAL -5.24, CHI -4.33 (lucky, negative regression). Takeaway side: CHI +7.22, LAC +7.11, JAX +5.04 over expected (negative regression); NYJ -10.07 (positive). Fumble forced: TB +6.58, DET +6.52, MIA +4.97, MIN +4.66 (pullback expected); DEN -4.50, GB -6.17.
- **Pressure proxies 2025** (forced | allowed): DEN 21.5%|10.2% (elite differential); PHI 16.3%|11.3%; CLE 17.7%|21.5%; MIN 18.8%|21.5%; SF 8.1%|13.2% (rush-4 at 75.3%, generating little). 2026 Wk1 (n=1): SF 37.5%|5.8%, MIN 34.2%|16.6%, BAL 33.3%|11.5%, JAX 31.8%|12.5%.
- **Special teams 2025** (KR EPA/return | PR EPA/return): DAL 0.201|0.493, HOU 0.122|0.437, TEN 0.126|0.761, MIA 0.290|0.470, WAS 0.178|0.413, SEA 0.429|0.684, SF 0.504|0.366, NYJ 0.429|0.268, JAX 0.339|0.325.

### A4. 2026-09-18 Evening Sweep — 8 New Metrics (commit fe4a4a152; `docs/research/2026-09-18/full-tables/`)

1. **ScottBarrettDFB YPRR elite** (Fantasy Points Data Suite 2.0, 2026-09-18 6:22 PM CDT; 2025+2026, league avg YPRR 1.64 / TPRR 0.20): JSN 3.79/0.33; Zay Flowers 2.87/0.26; Christian Watson 2.85/0.24; Luther Burden 2.79/0.25; Drake London 2.52/0.30; Stefon Diggs 2.51/0.26; CeeDee Lamb 2.40/0.26; George Pickens 2.38/0.22; Parker Washington 2.35/0.24; A.J. Brown 2.22/0.27. Note: only 3 receivers >2.90 YPRR since start of last season.
2. **statyxio Bucky Irving vs CLE rush-path package** (statyx.io, 3rd tool instance): lane usage LG 37% (9th) / RG 25% (28th) / LE 13% / LT 13% / RT 12% (3rd); run-path Interior 62.5% vs CLE 31/32 "Softer"; runner evidence 3.88 YAC/att (76th), 0.63 evaded/att (99th), 62.5% success (99th), 12.5% 10+ rate (63rd), 0.0% breakaway (31st), 87.5% stuff avoidance (63rd). Footer: "Available after 3 games." Context: CLE allowed 10+ yds on 16.7% of rushes (would-be 2nd-worst 2025).
3. **cmain7 schedule-adjusted survivor EV by Week 1 team used** (6:07 PM CDT; not a full-season sim): LV/ARI/NYJ $1,559; PIT $1,514; NYG $1,493; CIN $1,330; MIN $1,311; CHI $1,283; JAX $1,247; PHI $1,238; BAL $1,181 (flat-equity baseline $1,341). Survivor-context only.
4. **sfdata9ers five posts** (9/18): TNF recap/previews (off-slate); **Week 1 playcalling tendencies, all 32 teams (Data: FTN)** — motion/screen/PA/no-huddle/RPO %: LAC 84.3% motion (corrected leader); ARI 65.2/2.9/7.2/5.8/2.9; ATL 75.4/8.8/5.3/3.5/1.8; BAL 73.3/1.7/16.7/1.7/8.3; CAR 59.7/1.6/14.5/8.1/6.5; CHI 55.7/4.3/18.6/5.7/2.9; CIN 48.4/4.8/6.5/4.8/9.7; CLE 32.7/4.1/16.3/4.1/4.1; DAL 65.4/5.8/9.6/9.6/5.8; DEN 39.1/8.7/13.0/6.5/4.3; DET 58.9/2.7/19.2/1.4/0.0 (197 Wk1 plays carried 2+ tags; columns don't sum to 100).
5. **hawkblogger pressure generated x allowed, 32 teams, 2026** (FTN charting, one-game sample): JAX 50.0%|25.0%; CAR 44.7%|27.9%; CIN 44.4%|32.4%; WAS 42.4%|41.0%; PHI 41.0%|42.4%; LV 40.5%|6.5%; DEN 39.4%|56.3%; MIN 39.1%|29.0%; NE 33.3%|26.2%; TB 32.4%|44.4%; BAL 32.4%|33.3%; SF 31.0%|22.2%; GB 29.0%|39.1%; ARI 28.6%|25.6%; CHI 27.9%|44.7%; SEA 26.2%|33.3%; LAC 25.6%|28.6%; NYJ 25.6%|11.5%; CLE 25.0%|50.0%; NO 22.0%|31.3%; DAL 21.2%|22.8%; ATL 20.9%|19.2%; PIT 19.2%|20.9%; HOU 18.2%|28.6%; TEN 11.5%|25.6%; MIA 6.5%|40.5%.
6. **rjanalytics7002 Trevor Lawrence depth buckets** (Wk1, NGS): Behind LOS 4 att/100%/5.18 sep/1.74 TTT; Short 7/57.1%/2.60/2.86; Intermediate 9/88.9%/2.94/3.16; Deep 3/66.7%/2.13/4.43.
7. **JMac_FF target distribution + TPRR** (TNF-adjacent): Kincaid 8 tgts (28.5% share, 30.7% TPRR) — the elite-TE-efficiency benchmark number; format template for slate leaders.
8. **PFF single-game defensive grades** (min 20 snaps): Deone Walker 93.0 (Wk2), Ventrell Miller 92.4, T.J. Watt 92.3, Dante Trader Jr 91.8, Vernon Broughton 91.8.
Plus standouts: **benbbaldwin v2 + remaining SOS** (v2 superseded by v3; SOS: ARI 55.6 hardest ... NO 43.4 easiest — minimal Wk2 value); **DevyEusuf 2nd-year WR separation** (min 10 routes, FP Data Suite 2.0): Ayomanor (TEN) 0.111; Burden (CHI) 0.083 (2.63 YPRR); Egbuka (TB) 0.069; Golden (GB) 0.025; Harris (LAC) -0.038; Bryant (DEN) -0.053; McMillan (CAR) -0.108; **@EaglesXsandOs "NFL SNAP" 7-number composite** (AGENTS.md only, no CSV); **magicsportsguy NYG@LAR CB matchup report** (StatRankings AI; Monday game, off-slate — reference only).

### A5. Morning-Sweep / Miscellaneous New Tables (commits 3d5d13eee, fe4a4a152)

- **Paganetti series** (his play-by-play data): two-back formations vs middle-open (+0.10 EPA/play run, +0.26 pass); six-up pre-snap rate (NYJ 3.5%); middle-third target rates; play-clock drain; **expected rushing YPA regression by team (NGS)**; personnel/coverage combos.
- **sfdata9ers:** negative-run % by team (FTN); **cost of drops** (Air EPA + expected YAC EPA - actual EPA; FTN charting); **composite QB rankings** (PFR: QBR 0.35, EPA/play 0.25, CPOE 0.15, Bad Throw% 0.10, Pressure-to-Sack% 0.10, Air Yds/Rec 0.05); box-defender distributions (FTN); **blitz tendencies** (no/one/two-plus); missed-tackle rates by team; air-yards buckets by QB (nflverse); dropback outcomes (nflverse).
- **tejfbanalytics QB total EPA** (Sumer Sports): EPA/DB, comp%, aDOT, success%, pressure EPA/DB, total EPA.
- **PattonAnalytics:** ANY/A leaders (StatRankings; "Drew Lock" duplicate preserved as displayed); **playcaller "Tendency Rating" composite** (Y-Aware PCA on personnel diversification / play sequencing / tendencies; author: correlates with EPA; approx bar reads).
- **fantasypts-def-targets-by-position-week1.csv**: defensive targets by position (WR/TE/RB shares).
- **Marcas Mosher big plays by EPA** (nflverse); **statyx TE targets w/ EPA/target** (McBride 13 tgts/35% share/+0.289); **statyx QB volume vs efficiency** (TNF-adjacent).

---

## PART B — CROSS-REFERENCE vs dk-week2-2026-main-research.md

### B1. ALREADY USED in the DK research (do not re-litigate)

benbbaldwin v3 tiers (PHI@TEN tier/line disconnect); SumerSports PRWR (Shauncore 3-metric context); DevyEusuf separation (Ayomanor 0.111, Burden/Egbuka/Golden); playcalling tendencies (motion/PA/no-huddle/RPO); hawkblogger pressure rates (CIN 44.4% #4, JAX 50%, DEN 56.3% allowed, CAR 44.7%); statyx Irving package (99th-%ile evasion, CLE 31/32 run D); jmthrivept recovery chart (Bowers 68% model pre-downgrade); cmain7 survivor (inventory); GridironInfo_ EPA/aggressiveness (Lawrence +0.79, CPOE +16.2, Stroud 21% aggressiveness, CIN -1.49 blitz EPA); FantasyPtsData BELLCOW/SIM/TE-targets (Javonte 95% XFP, P. Washington comps); Barrett YPRR elite (JSN 3.79, Watson 2.85, Burden 2.79, London 2.52, Diggs 2.51, Lamb 2.40); rjanalytics Lawrence buckets (via +0.81 EPA/db vs pressure read); JMac_FF (inventory); CharlesChillFFB EPA+CPOE (via Lawrence read); Paganetti YPA-regression (Swift +2.0 over expected flag); MediJo20-adjacent rushing profiles (via Irving/Henry reads).

### B2. NOT YET USED — the gaps this sweep closes

| # | Metric | Why it matters for the slate |
|---|---|---|
| 1 | StatRankings free leaderboards (target share, first-read %, air yards, YPRR, DK FPPG, FP/dropback, QB-under-pressure, red-zone, team EPA/pace/pressure/blitz/FPA/ARBY) | Biggest unused asset; slate-specific values below |
| 2 | Makai Lemon debut table | PHI@TEN cheap-WR trap-vs-opportunity context |
| 3 | MediJo20 rushing EPA/TD scatter (Hurts/Henry/Jacobs/Kamara/Conner profiles) | Rushing-TD equity nuance for RB/QB reads |
| 4 | 2025 gse-lab team_metrics / turnover-luck / pressure-proxy tables | Stable priors: regression screens for DST and offense |
| 5 | sfdata9ers composite QB ranking (QBR .35/EPA .25/CPOE .15/...) | Ready-made slate QB board, unused |
| 6 | Patton playcaller Tendency Rating (Y-Aware PCA) | Game-script efficiency read, unused |
| 7 | Missed-tackle rates / negative-run % (team) | RB tackle-breaking/floor angles, unused |
| 8 | fantasypts defensive targets by position | TE-funnel context (Schultz!), unused |
| 9 | Bryce Young under-pressure numbers (111.9, 2nd; 0.81 FP/db) | Deep-GPP QB angle, unused |
| 10 | JAX 53.1% pressure / 16.7% sack% (StatRankings team file) | Sharpens the JAX $2.4k DST case materially |
| 11 | MIN 80.4% blitz (StatRankings) | Sharpens CHI-DST weather leverage |
| 12 | SF 8.1% pressure forced 2025 (rush-4 75.3%) | Tempers SF DST $3.8k consensus-#1 case |
| 13 | Neutral pace: GB 21.8, TEN 22.0, CAR 22.3, WAS 22.7, NO 23.6 sec/play | Pace context for totals in 4 slate games |

---

## PART C — WHAT THE UNUSED METRICS CHANGE

### C1. SHARPEN / CONFIRM existing reads

- **Caleb Williams:** StatRankings has him at 37.3 DK FPPG (slate #1), 1.20 FP/dropback, 120.6 passer rating under pressure (1st), 7.0 scrambles/game. The form is elite; the MIN@CHI weather (80% rain, 30-mph gusts) is now the ONLY discount on him, and MIN blitzes 80.4% — the CHI-DST weather-leverage read gets sharper (pressure + weather on a blitz-heavy defense), while Caleb-the-play gets more weather-sensitive, not less.
- **JAX $2.4k DST:** StatRankings team file has JAX at 53.1% pressure rate and 16.7% sack% (both slate-best) vs DEN's league-worst 56.3% pressure allowed (hawkblogger). This is the single best pressure mismatch on the slate — the hidden-DST case upgrades from "good process" to "best process."
- **CIN DST:** 11.1% sack% (4th) + 44.4% pressure generated (#4, hawkblogger) + NFL-best -1.49 EPA/play allowed blitzing vs Stroud's 21% aggressiveness, dome. Confirmed on three independent cuts.
- **LV DST:** 13.5% sack% (3rd) + 40.5% pressure vs LAC's broken interior. Confirmed.
- **Derrick Henry:** 38.3 DK FPPG (top RB in dump), 5 att / 2 TD inside-10 (83.3% rush share), career 0.82 rushing TDs/gm (MediJo20, elite band). With Flowers doubtful condensing BAL TDs to Henry/Bateman, the leverage case hardens.
- **Bijan mega-chalk:** 45.5% target share + 50.0% first-read share (StatRankings free tables) — the underlying role fully justifies the most-rostered projection. The fade decision is now better informed, not changed: you're fading the role, not a mirage.
- **Lawrence stack:** JAX 0.354 EPA/play (3rd), 0.773 pass EPA/play (1st), 60.4% success rate (1st) + Lawrence 88.9% intermediate comp (rjanalytics) + composite QB rank inputs. JAX@DEN's T1 promotion is confirmed on efficiency, not just the steamed total.
- **Metcalf absorb:** 204 air yards (2nd in free table) with Pittman "bleak" — the $5.2k target-funnel read is confirmed.
- **Coker pivot:** 124 air yards (5th) + no designation + ATL slot CB Bowman out — confirmed on two cuts.
- **Golden:** 137 air yards (3rd) + 0.025 separation (poor) — the "projection lags role" read holds; separation is the bear case to note.
- **Olave:** 234 air yards (1st) + 28.95% TPRR / 3.45 YPRR / 35.0% first-read (CoverageIQ+) + expected full-go — the $7.2k Q-tag discount has a strong role underneath.
- **Juwan Johnson:** tied atop TE inside-10 targets (2, 100%) — FP's "favorite TE" read gets red-zone support at $3.9k.
- **Hurts rushing floor:** ~2.0 EPA/gm + ~0.685 TDs/gm (MediJo20) — slate's only QB in the elite rushing-value+scoring quadrant; relevant with PHI@TEN in 94-99F heat (rushing QBs are less heat-sensitive than timing passing games — mild support for the heat-contrarian OVER angle).
- **Neutral pace:** GB 21.8 / TEN 22.0 / CAR 22.3 / WAS 22.7 / NO 23.6 sec/play — WAS@DAL (51.5 total) and GB@NYJ get mild pace support; PHI@TEN's 39.5 total has a slow-pace headwind beyond the heat.

### C2. CONTRADICT / TEMPER existing reads

- **SF DST $3.8k (consensus #1):** 2025 pressure proxies have SF forcing pressure at **8.1% (2nd-worst)** while rushing 4 at 75.3% — they generate almost nothing themselves. The DST case is ENTIRELY "MIA allows 40.5% pressure + Willis starts," not SF's own rush. At the slate's priciest DST salary, that is a tempering flag vs RotoWire/BR #1 ranks. (2026 Wk1 small-sample: 37.5% forced — directionally better, n=1.)
- **JAX DST temper:** JAX was +5.04 INTs over expected in 2025 (takeaway regression risk). Still the best process play, but the takeaway luck component should be noted, not assumed to repeat.
- **CHI DST weather-leverage temper:** CHI was +7.22 INTs over expected in 2025 (largest positive takeaway luck on the slate). Weather + MIN's 80.4% blitz is real process; the INT luck is not repeatable. Size accordingly.
- **DEN defense vs the JAX stack:** 2025 DEN had an elite pressure differential (21.5% forced / 10.2% allowed). The JAX@DEN T1 stack leans on 2026 role change (new scheme/QB); note the tension — DEN's pass rush is the unit that can break the stack.
- **LAC DST temper:** LAC was +7.11 INTs over expected in 2025 — mild takeaway-regression flag on a consensus top-6 DST.
- **MIN offense positive regression:** MIN threw +5.74 INTs over expected in 2025 (unlucky) — mild support for the Jefferson side of the weather game; the weather discount may be over-applied to MIN pass-catchers specifically.
- **DAL defense negative regression:** DAL was -5.24 INTs over expected (lucky) — supports the WAS side of the 51.5-total game beyond the dome/total logic.
- **Jacobs TD-dependence caution:** -1.6 EPA/gm with 0.70 TDs/gm (MediJo20) — deeply negative efficiency carried by TDs. At salary, he's TD-or-bust; the GB@NYJ stack piece is the passing game (Love/Golden), not Jacobs.

### C3. NEW ANGLES not in the research

- **Bryce Young deep GPP:** 111.9 passer rating under pressure (2nd), 0.81 FP/dropback, dome (CAR@ATL), CAR DST correlation ($2.7k). One-game sample — GPP-only, but the efficiency signal is real.
- **sfdata9ers composite QB ranking** (QBR 0.35, EPA/play 0.25, CPOE 0.15, Bad Throw% 0.10, P2S% 0.10, Air Yds/Rec 0.05, PFR) — a ready-made, pre-weighted slate QB board the research never consulted. Pull it before finalizing QB ranks.
- **Patton playcaller Tendency Rating** (Y-Aware PCA, correlates with EPA) — 32 play-callers ranked; unused game-script efficiency input for stack tiers.
- **Missed-tackle rates / negative-run % by team** — RB tackle-breaking and floor angles (e.g., backs facing high-missed-tackle defenses get YAC equity) — never consulted.
- **Defensive targets by position** — which defenses funnel targets to TEs/WRs/RBs; directly relevant to the Schultz ($3.2k, 5.5% pOWN) leverage case and the CIN-TE-funnel note.
- **Kamara receiving-dependence nuance:** 0.51 rushing TDs/gm (below the 0.60 avg line, MediJo20) — the $4.6k tournament pivot needs receiving work (NO backfield is Etienne/Kamara/Miller); don't project him as a goal-line back.
- **Makai Lemon:** 29 routes but -5 yards / -0.17 YPRR in debut — if his main-slate salary is cheap, it's a routes-bet, not a form-bet. Trap-aware.
- **statyx tool availability:** the Irving/Gibbs/Cook rush-path packages carry a "Available after 3 games" footer — Week 4+ the tool covers every back; calendar note for future slates.

---

## PART D — AGENTS.md ADDITIONS (benchmark-lane rule)

Added by this sweep (appended, neutral-inventory standard):
1. **STATRANKINGS CSV DUMP (2026-09-18)** — file-level inventory: schema, the 3 files, 9+8 metric families, free-vs-paywalled split, 2026-Wk1-only vintage, source/method (nflfastR + FTN; PROE+/ARBY/xFP/CoverageIQ), slate highlights, and the team-affiliation data-quality flag.
2. **PROPS-CONSENSUS / GSE-LAB REPO PATH MAP (2026-09-19)** — maps the old `~/workspace/gse-research/` paths AGENTS.md pointed at to the canonical repo copies (`docs/research/2026-09-17/props-consensus/`, `docs/research/2026-09-17/gse-lab/`), with the transferable 2025 tables and their DFS uses.
3. The 9/19 AM sweep, 9/18 PM sweep (8 metrics), and benbbaldwin v2/v3 were already inventoried — no duplication.
