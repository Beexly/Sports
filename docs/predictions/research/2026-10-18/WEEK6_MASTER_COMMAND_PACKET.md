# NFL WEEK 6 MASTER COMMAND PACKET & WEEK 7 TRANSITION (2026-10-18)

**Generated UTC**: `2026-10-18T09:43:10.447737+00:00` | **Engine**: GSE Sovereign Reasoning Core (`v5.3.0`) | **Live Roster Gate**: `PASS (Fail-Closed)`

---

## 1. Executive Ingestion & REA Funnel Summary

- **REA 25-Source Funnel**: `24/25` live targets harvested via Playwright + CDP (`1,410` runtime APIs intercepted across FantasyGuru, LineStar, PropFinder, Covers, Action Network, FantasyPros, Footballguys, DraftSharks, RotoWire, SaberSim, FTN Fantasy, RotoBaller, RotoGrinders, Fantasy Football Analytics, CBS, LateRound, FantasyLife, YouTube desks, and SiriusXM Channel 87).
- **SiriusXM Fantasy Sports Radio (Channel 87, `04:00–23:00 CT`)**: Full 19-hour broadcast window (`7` shows, `5` structured Week 6 injury/usage/DFS/sharp-action claims) ingested into `analyst.py`.
- **Live Week 6 Roster Gate**: `799` player statuses enforced fail-closed (`15` OUT/IR/Doubtful players blocked from props, SGPs, and DFS pools).

---

## 2. Week 6 Full 14-Game Sovereign Slate & Matchup Board

| Matchup | Thesis | Chain Conviction | Cited Facts | Analyst Card | Matchup Report (WR vs CB / OL vs Front) |
|---|---|---:|---:|---|---|
| **HOU@JAX** | Attrition Edge | `83/100` | `87` | `docs/predictions/research/2026-10-18/HOU@JAX-card.md` | `docs/predictions/research/2026-10-18/HOU@JAX-matchups.md` (0 chains) |
| **CHI@ATL** | Trench Funnel | `83/100` | `89` | `docs/predictions/research/2026-10-18/CHI@ATL-card.md` | `docs/predictions/research/2026-10-18/CHI@ATL-matchups.md` (2 chains) |
| **BAL@CLE** | Trench Funnel | `83/100` | `72` | `docs/predictions/research/2026-10-18/BAL@CLE-card.md` | `docs/predictions/research/2026-10-18/BAL@CLE-matchups.md` (1 chains) |
| **TEN@IND** | Trench Funnel | `89/100` | `88` | `docs/predictions/research/2026-10-18/TEN@IND-card.md` | `docs/predictions/research/2026-10-18/TEN@IND-matchups.md` (1 chains) |
| **NYJ@NE** | Trench Funnel | `79/100` | `86` | `docs/predictions/research/2026-10-18/NYJ@NE-card.md` | `docs/predictions/research/2026-10-18/NYJ@NE-matchups.md` (2 chains) |
| **NO@NYG** | Trench Funnel | `76/100` | `71` | `docs/predictions/research/2026-10-18/NO@NYG-card.md` | `docs/predictions/research/2026-10-18/NO@NYG-matchups.md` (1 chains) |
| **CAR@PHI** | Trench Funnel | `89/100` | `75` | `docs/predictions/research/2026-10-18/CAR@PHI-card.md` | `docs/predictions/research/2026-10-18/CAR@PHI-matchups.md` (1 chains) |
| **PIT@TB** | Trench Funnel | `82/100` | `92` | `docs/predictions/research/2026-10-18/PIT@TB-card.md` | `docs/predictions/research/2026-10-18/PIT@TB-matchups.md` (0 chains) |
| **ARI@LAR** | Attrition Edge | `84/100` | `64` | `docs/predictions/research/2026-10-18/ARI@LAR-card.md` | `docs/predictions/research/2026-10-18/ARI@LAR-matchups.md` (0 chains) |
| **LAC@KC** | Trench Funnel | `82/100` | `80` | `docs/predictions/research/2026-10-18/LAC@KC-card.md` | `docs/predictions/research/2026-10-18/LAC@KC-matchups.md` (0 chains) |
| **BUF@LV** | Ballistics Window | `76/100` | `76` | `docs/predictions/research/2026-10-18/BUF@LV-card.md` | `docs/predictions/research/2026-10-18/BUF@LV-matchups.md` (0 chains) |
| **DAL@GB** | Trench Funnel | `76/100` | `78` | `docs/predictions/research/2026-10-18/DAL@GB-card.md` | `docs/predictions/research/2026-10-18/DAL@GB-matchups.md` (2 chains) |
| **SEA@DEN** | Trench Funnel | `85/100` | `105` | `docs/predictions/research/2026-10-18/SEA@DEN-card.md` | `docs/predictions/research/2026-10-18/SEA@DEN-matchups.md` (3 chains) |
| **WSH@SF** | Trench Funnel | `83/100` | `65` | `docs/predictions/research/2026-10-18/WSH@SF-card.md` | `docs/predictions/research/2026-10-18/WSH@SF-matchups.md` (0 chains) |

### Key Specific Receiver-vs-Corner & Trench Chains Firing Today

- **CHI@ATL**: AWAY-OFF vs HOME-DEF: Rome Odunze leads CHI pass-catchers (2025-baseline targets 90, separation 3.0 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: C.J. Henderson (LCB, slot-1, OUT), Avieon Terrell (LCB, slot-1, not-on-report), Malcolm DeWalt IV (LCB, slot-1, ACTIVE) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (C.J. Henderson (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **CHI@ATL**: HOME-OL vs AWAY-FRONT: the away front is missing Dayo Odeyingbo (DE, INJURED RESERVE) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick
- **BAL@CLE**: HOME-OL vs AWAY-FRONT: the away front is missing Broderick Washington Jr. (DT, OUT) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick
- **TEN@IND**: HOME-OL vs AWAY-FRONT: the away front is missing Jordan Elliott (DT, OUT) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick
- **NYJ@NE**: AWAY-OFF vs HOME-DEF: Adonai Mitchell leads NYJ pass-catchers (2025-baseline targets 74, separation 2.8 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Carlton Davis III (LCB, slot-1, OUT), Channing Canada (LCB, slot-1, QUESTIONABLE), Elliott Davison (LCB, slot-1, not-on-report) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Carlton Davis III (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **NYJ@NE**: HOME-OL vs AWAY-FRONT: the away front is missing Joseph Ossai (DE, OUT); Braiden McGregor (DE, INJURED RESERVE) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick
- **NO@NYG**: AWAY-OFF vs HOME-DEF: Chris Olave leads NO pass-catchers (2025-baseline targets 156, separation 2.9 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Deonte Banks (LCB, slot-1, not-on-report), Colton Hood (LCB, slot-1, OUT), Paulson Adebo (LCB, slot-1, not-on-report) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Colton Hood (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **CAR@PHI**: HOME-OL vs AWAY-FRONT: the away front is missing Cam Jackson (DT, INJURED RESERVE) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick
- **DAL@GB**: HOME-OFF vs AWAY-DEF: Romeo Doubs leads GB pass-catchers (2025-baseline targets 85, separation 2.3 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Joey Porter Jr. (LCB, slot-1, QUESTIONABLE), Cobie Durant (LCB, slot-1, OUT), Caelen Carson (LCB, slot-1, not-on-report) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Cobie Durant (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **DAL@GB**: AWAY-OFF vs HOME-DEF: George Pickens leads DAL pass-catchers (2025-baseline targets 137, separation 2.3 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Keisean Nixon (LCB, slot-1, ACTIVE), Benjamin St-Juste (LCB, slot-1, OUT) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Benjamin St-Juste (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **SEA@DEN**: HOME-OFF vs AWAY-DEF: Courtland Sutton leads DEN pass-catchers (2025-baseline targets 124, separation 2.3 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Devon Witherspoon (LCB, slot-1, not-on-report), Nehemiah Pritchett (LCB, slot-1, not-on-report), Trevon Diggs (LCB, slot-1, not-on-report) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Avery Smith (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **SEA@DEN**: AWAY-OFF vs HOME-DEF: Jaxon Smith-Njigba leads SEA pass-catchers (2025-baseline targets 163, separation 3.0 yds) [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> draws the opposing slot-1 corner ladder: Pat Surtain II (LCB, slot-1, OUT), Jahdae Barron (LCB, slot-1, not-on-report), Sean Fresch (LCB, slot-1, not-on-report) [espn-depthcharts-2026.json] -> the starter(s) he meets are on the injury report (Pat Surtain II (LCB, slot-1, OUT)) - a specific receiver vs a weakened specific defender, the pairing the market prices as a team tendency -> breaking condition: pre-kick scratch/activation flips this pairing, and depth-chart slot changes void it
- **SEA@DEN**: HOME-OL vs AWAY-FRONT: the away front is missing Brandon Pili (DT, OUT) [espn_nfl_injuries_week6.json] -> rotation depth thins on the interior/edge -> home QB time-to-throw extends and the deep shot window widens; breaking condition: starters announced active pre-kick

---

## 3. Week 6 High-Conviction Player Props Board (4-Wk LineStar Shares + 2026 In-Season NGS)

| Rank | Player | Team | Pos | Recommended Prop Angle | 4-Wk Snap% | 4-Wk Target/Carry% | 2026 In-Season NGS Metric | Roster Gate | Score |
|---:|---|---|---|---|---:|---:|---|---|---:|
| 1 | **Christian Watson** | `GB` | `WR` | Receiving Yards OVER (~90.3 yds line) | `82.0%` | `25.4% tgt` | 2026 NGS: 40 tgt, 474 yds, sep 2.47 yds, YAC/OE +2.00, air-yd share 32.5% | `PASS (ACTIVE)` | `94.0/100` |
| 2 | **CeeDee Lamb** | `DAL` | `WR` | Receiving Yards OVER (~96.9 yds line) | `82.0%` | `29.2% tgt` | 2026 NGS: 51 tgt, 507 yds, sep 3.00 yds, YAC/OE +0.43, air-yd share 37.4% | `PASS (ACTIVE)` | `94.0/100` |
| 3 | **Drake London** | `ATL` | `WR` | Receiving Yards OVER (~93.1 yds line) | `82.0%` | `34.2% tgt` | 2026 NGS: 37 tgt, 488 yds, sep 3.33 yds, YAC/OE +2.12, air-yd share 43.8% | `PASS (ACTIVE)` | `94.0/100` |
| 4 | **Puka Nacua** | `LAR` | `WR` | Receiving Yards OVER (~62.9 yds line) | `46.5%` | `24.0% tgt` | 2026 NGS: 45 tgt, 337 yds, sep 2.33 yds, YAC/OE +1.74, air-yd share 23.7% | `PASS (ACTIVE)` | `94.0/100` |
| 5 | **Matthew Golden** | `GB` | `WR` | Receiving Yards OVER (~74.9 yds line) | `82.0%` | `30.7% tgt` | 2026 NGS: 44 tgt, 397 yds, sep 2.80 yds, YAC/OE +0.45, air-yd share 39.3% | `PASS (ACTIVE)` | `94.0/100` |
| 6 | **Denzel Boston** | `CLE` | `WR` | Receiving Yards OVER (~61.5 yds line) | `82.0%` | `36.2% tgt` | 2026 NGS: 29 tgt, 330 yds, sep 2.20 yds, YAC/OE +3.27, air-yd share 46.4% | `PASS (ACTIVE)` | `94.0/100` |
| 7 | **Davante Adams** | `LAR` | `WR` | Receiving Yards OVER (~83.7 yds line) | `79.9%` | `14.7% tgt` | 2026 NGS: 45 tgt, 441 yds, sep 2.17 yds, YAC/OE +1.41, air-yd share 36.4% | `PASS (ACTIVE)` | `94.0/100` |
| 8 | **Michael Wilson** | `ARI` | `WR` | Receiving Yards OVER (~53.1 yds line) | `82.0%` | `28.7% tgt` | 2026 NGS: 51 tgt, 288 yds, sep 2.72 yds, YAC/OE -0.58, air-yd share 36.8% | `PASS (ACTIVE)` | `94.0/100` |
| 9 | **Chris Olave** | `NO` | `WR` | Receiving Yards OVER (~102.9 yds line) | `82.0%` | `35.2% tgt` | 2026 NGS: 54 tgt, 537 yds, sep 2.94 yds, YAC/OE -0.40, air-yd share 45.1% | `PASS (ACTIVE)` | `94.0/100` |
| 10 | **Jaxon Smith-Njigba** | `SEA` | `WR` | Receiving Yards OVER (~112.1 yds line) | `82.0%` | `41.4% tgt` | 2026 NGS: 50 tgt, 583 yds, sep 2.72 yds, YAC/OE +0.76, air-yd share 53.0% | `PASS (ACTIVE)` | `94.0/100` |
| 11 | **Trey McBride** | `ARI` | `TE` | Receiving Yards OVER (~57.1 yds line) | `82.0%` | `19.0% tgt` | 2026 NGS: 56 tgt, 308 yds, sep 2.49 yds, YAC/OE +0.01, air-yd share 24.4% | `PASS (ACTIVE)` | `94.0/100` |
| 12 | **Garrett Wilson** | `NYJ` | `WR` | Receiving Yards OVER (~70.3 yds line) | `82.0%` | `32.2% tgt` | 2026 NGS: 42 tgt, 374 yds, sep 2.56 yds, YAC/OE +0.26, air-yd share 41.2% | `PASS (ACTIVE)` | `94.0/100` |
| 13 | **Malik Nabers** | `NYG` | `WR` | Receiving Yards OVER (~61.3 yds line) | `82.0%` | `27.9% tgt` | 2026 NGS: 46 tgt, 329 yds, sep 2.98 yds, YAC/OE -0.95, air-yd share 35.8% | `PASS (ACTIVE)` | `93.4/100` |
| 14 | **Kenneth Walker III** | `KC` | `RB` | Rushing Yards OVER (~101.9 yds line) | `75.7%` | `69.6% carry` | 2026 NGS: 87 att, 537 yds, RYOE +211.8 (+2.52/att), 8+ box 26.4% | `PASS (ACTIVE)` | `93.0/100` |
| 15 | **Bijan Robinson** | `ATL` | `RB` | Rushing Yards OVER (~110.5 yds line) | `80.0%` | `78.0% carry` | 2026 NGS: 102 att, 580 yds, RYOE +161.2 (+1.68/att), 8+ box 19.6% | `PASS (ACTIVE)` | `93.0/100` |

---

## 4. Week 6 Empirical Student-t Copula SGP Parlays (`nu=4.0`, 50,000 Draws)

### HOU @ JAX — EverBank Aerial Shootout Stack (C.J. Stroud + Nico Collins + Over 42.5)
- **Roster Gate**: `PASS (C.J. Stroud (HOU): ACTIVE; Nico Collins (HOU): ACTIVE)`
- **Legs**: `C.J. Stroud 250+ Passing Yards` + `Nico Collins 80+ Receiving Yards` + `HOU @ JAX Game Total OVER 42.5`
- **Independent Joint Prob**: `20.53%` | **True Student-t Copula Prob**: `24.48%`
- **Empirical Correlation Lift**: `+19.25%` (`z = +20.55`) | **Fair Price**: `+308` vs **Book Price**: `+475`
- **Causal Rationale**: JAX CB Montaric Brown is OUT [espn_nfl_injuries_week6.json] and JAX RB Travis Etienne carries -15.8 RYOE [raw_statboard_rushing.json], forcing high pass-volume and amplifying the measured r=+0.526 QB-to-WR1 yardage copula tail.

### LAC @ KC — Arrowhead Trench Control & Under Script (Patrick Mahomes + Under 41.5)
- **Roster Gate**: `PASS (Patrick Mahomes (KC): ACTIVE; Ladd McConkey (LAC): ACTIVE)`
- **Legs**: `Patrick Mahomes Under 24.5 Completions` + `KC WR1 Under 68.5 Receiving Yards` + `LAC @ KC Game Total UNDER 41.5`
- **Independent Joint Prob**: `23.69%` | **True Student-t Copula Prob**: `29.04%`
- **Empirical Correlation Lift**: `+22.55%` (`z = +26.32`) | **Fair Price**: `+244` vs **Book Price**: `+420`
- **Causal Rationale**: Kalshi/ESPN consensus anchors LAC@KC at 41.5 with KC on 14 days rest vs LAC 7 days rest; slow-paced Arrowhead clock-bleed script leverages the joint Under tail.

### CAR @ PHI — Lincoln Financial Aerial Funnel (Tanner McKee + A.J. Brown + PHI Team Total)
- **Roster Gate**: `PASS (Tanner McKee (PHI): ACTIVE; A.J. Brown (PHI): ACTIVE; DeVonta Smith (PHI): ACTIVE)`
- **Legs**: `Tanner McKee 215+ Passing Yards` + `A.J. Brown 75+ Receiving Yards` + `PHI Team Total Over 21.5 Points`
- **Independent Joint Prob**: `21.67%` | **True Student-t Copula Prob**: `26.80%`
- **Empirical Correlation Lift**: `+23.69%` (`z = +25.91`) | **Fair Price**: `+273` vs **Book Price**: `+510`
- **Causal Rationale**: With Jalen Hurts (IR) and RB Saquon Barkley (OUT) sidelined on the Week 6 injury report [espn_nfl_injuries_week6.json], PHI offensive volume funnels into dropback pass attempts to A.J. Brown (r=+0.526 QB-WR1 yardage correlation).

### WSH @ SF — Levi's Stadium MNF Efficiency Stack (Brock Purdy + George Kittle + Passing TDs)
- **Roster Gate**: `PASS (Brock Purdy (SF): ACTIVE; George Kittle (SF): ACTIVE; Brandon Aiyuk (SF): ACTIVE)`
- **Legs**: `Brock Purdy 245+ Passing Yards` + `Brock Purdy 2+ Passing TDs` + `SF Team Total Over 26.5 Points`
- **Independent Joint Prob**: `20.40%` | **True Student-t Copula Prob**: `28.07%`
- **Empirical Correlation Lift**: `+37.59%` (`z = +38.17`) | **Fair Price**: `+256` vs **Book Price**: `+390`
- **Causal Rationale**: Brock Purdy carries +10.5 CPOE on 2026 NGS passing surfaces and Deebo Samuel Sr. is OUT [espn_nfl_injuries_week6.json], concentrating red-zone and intermediate volume onto George Kittle and Brandon Aiyuk (QB passing TDs vs team total r=+0.665).

### DAL @ GB — Lambeau Field Aerial Correlated Stack (Jordan Love + Jayden Reed + Over 46.5)
- **Roster Gate**: `PASS (Jordan Love (GB): ACTIVE; Dak Prescott (DAL): ACTIVE)`
- **Legs**: `Jordan Love 250+ Passing Yards` + `GB WR1 70+ Receiving Yards` + `DAL @ GB Game Total OVER 46.5`
- **Independent Joint Prob**: `20.62%` | **True Student-t Copula Prob**: `24.67%`
- **Empirical Correlation Lift**: `+19.65%` (`z = +21.02`) | **Fair Price**: `+305` vs **Book Price**: `+460`
- **Causal Rationale**: Green Bay enters on 10 days rest vs Dallas on 7 days rest with both starting QBs (Jordan Love, Dak Prescott) confirmed ACTIVE; high-tempo neutral pass rates drive strong positive tail dependence in the Student-t copula.

---

## 5. Week 6 DraftKings DFS Optimal Lineups (`dfs_optimizer_suite.py`, Period 412)

- **Active Verified Player Pool**: `368` starters/rotation players | **Blocked OUT/IR/Doubtful Players**: `15`

### A. Cash Mode Optimal Lineup (Variance-Minimized Floor)

| Slot | Player | Pos | Salary | Projected Pts | Est. Ownership |
|---|---|---|---:|---:|---:|
| `QB` | **Josh Allen** | `QB` | `$7,500` | `23.62` | `10.0%` |
| `RB1` | **Jonathan Taylor** | `RB` | `$8,000` | `30.49` | `13.3%` |
| `RB2` | **Kyren Williams** | `RB` | `$6,800` | `25.23` | `13.0%` |
| `WR1` | **Puka Nacua** | `WR` | `$8,100` | `25.44` | `11.0%` |
| `WR2` | **Jaxon Smith-Njigba** | `WR` | `$8,600` | `22.64` | `10.0%` |
| `WR3` | **Deion Burks** | `WR` | `$3,000` | `9.49` | `11.1%` |
| `TE` | **Darnell Washington** | `TE` | `$2,900` | `6.98` | `8.4%` |
| `FLEX` | **Tutu Atwell** | `WR` | `$3,100` | `9.36` | `10.6%` |
| `DST` | **Cardinals** | `DST` | `$2,000` | `4.22` | `7.4%` |

**Total Salary**: `$50,000` / `$50,000` | **Projected Points**: `157.47`

### B. Flagship GPP Leverage Lineup (`Tabu Search #1` + `FieldSim` 99.5th Pctile Tail)
- **Simulated 1,000-Entry Field 99.5th Percentile Target**: `158.64 pts` | **3-Lineup Portfolio Tail Hit Prob**: `90.42%`

| Slot | Player | Pos | Salary | Projected Pts | Est. Ownership |
|---|---|---|---:|---:|---:|
| `QB` | **Josh Allen** | `QB` | `$7,500` | `23.62` | `10.0%` |
| `RB1` | **Jonathan Taylor** | `RB` | `$8,000` | `30.49` | `13.3%` |
| `RB2` | **Kyren Williams** | `RB` | `$6,800` | `25.23` | `13.0%` |
| `WR1` | **Puka Nacua** | `WR` | `$8,100` | `25.44` | `11.0%` |
| `WR2` | **Davante Adams** | `WR` | `$6,600` | `20.05` | `10.6%` |
| `WR3` | **Deion Burks** | `WR` | `$3,000` | `9.49` | `11.1%` |
| `TE` | **Tyler Higbee** | `TE` | `$3,400` | `10.20` | `10.5%` |
| `FLEX` | **Konata Mumpfield** | `WR` | `$3,600` | `10.72` | `10.4%` |
| `DST` | **Eagles** | `DST` | `$3,000` | `6.07` | `7.1%` |

**Total Salary**: `$50,000` / `$50,000` | **Projected Points**: `161.31`

---

## 6. Clean Transition to NFL Week 7 (14/14 Early Look Analyst Cards Emitted)

| Week 7 Matchup | Early Thesis | Conviction | Cited Facts | Card Path |
|---|---|---:|---:|---|
| **NE@CHI** | Trench Funnel | `83/100` | `99` | `docs/predictions/research/2026-10-18/NE@CHI-card.md` |
| **PIT@NO** | Trench Funnel | `81/100` | `76` | `docs/predictions/research/2026-10-18/PIT@NO-card.md` |
| **SF@ATL** | Trench Funnel | `81/100` | `83` | `docs/predictions/research/2026-10-18/SF@ATL-card.md` |
| **CLE@TEN** | Trench Funnel | `88/100` | `81` | `docs/predictions/research/2026-10-18/CLE@TEN-card.md` |
| **IND@MIN** | Trench Funnel | `82/100` | `83` | `docs/predictions/research/2026-10-18/IND@MIN-card.md` |
| **MIA@NYJ** | Trench Funnel | `82/100` | `75` | `docs/predictions/research/2026-10-18/MIA@NYJ-card.md` |
| **TB@CAR** | Trench Funnel | `81/100` | `74` | `docs/predictions/research/2026-10-18/TB@CAR-card.md` |
| **CIN@BAL** | Trench Funnel | `82/100` | `67` | `docs/predictions/research/2026-10-18/CIN@BAL-card.md` |
| **NYG@HOU** | Trench Funnel | `82/100` | `80` | `docs/predictions/research/2026-10-18/NYG@HOU-card.md` |
| **DEN@ARI** | Trench Funnel | `90/100` | `83` | `docs/predictions/research/2026-10-18/DEN@ARI-card.md` |
| **GB@DET** | Trench Funnel | `75/100` | `79` | `docs/predictions/research/2026-10-18/GB@DET-card.md` |
| **LAR@LV** | Ballistics Window | `81/100` | `75` | `docs/predictions/research/2026-10-18/LAR@LV-card.md` |
| **KC@SEA** | Trench Funnel | `84/100` | `85` | `docs/predictions/research/2026-10-18/KC@SEA-card.md` |
| **DAL@PHI** | Trench Funnel | `82/100` | `76` | `docs/predictions/research/2026-10-18/DAL@PHI-card.md` |
