# RB Full-Pool Scheme Matrix — DraftKings NFL Week 2 (Sept 20–21, 2026)

Research-only. No lineups. Nothing posted or messaged.
Researched: Saturday, September 19, 2026 (CDT).

**Slate:** 15-game Sunday/Monday slate ("Week 2 2026 Ray's in Aruba," single-entry, 75 players, winner-take-all, free).
Sunday/Monday matchups: CAR–ATL, MIN–CHI, PHI–TEN, PIT–NE, GB–NYJ, CLE–TB, NO–BAL, CIN–HOU, JAX–DEN, LV–LAC, WAS–DAL, SEA–ARI, MIA–SF, IND–KC, NYG–LAR.
(Schedule confirmed via SportsBrackets schedule page and corroborating FantasyPros result, observed 9/19/2026.)

**Relevance rule (Part 1):** Week 1 backfield XFP share > 30% OR snap share > 40%, across the 30 Sunday/Monday teams.
Fixed Part 1 exclusions (covered in Part 2 instead): Aaron Jones, Bijan Robinson, Javonte Williams, Derrick Henry, Cam Skattebo, Kyren Williams, Blake Corum, Kenneth Walker III, Jonathan Taylor, D'Andre Swift, David Montgomery, Josh Jacobs, Alvin Kamara, Travis Etienne, Jahmyr Gibbs, Breece Hall, Ashton Jeanty, Tyrone Tracy.
Jordan Mason (MIN) is on IR and excluded from both parts. RJ Harvey is included as Q (hamstring).

## Methodology & source ledger

| # | Source | Date | What it provided |
|---|--------|------|------------------|
| S1 | FantasyPoints bellcow/XFP report, local file `~/workspace/vendor/Sports/docs/research/2026-09-18/full-tables/fantasypts-bellcow-report-week1.csv` | Dated 9/18/2026 | Week 1 backfield XFP share % for every relevant RB (drives the >30% inclusion rule) |
| S2 | RotoWire, "NFL Box Scores Week 1: Snaps, Routes & Usage Breakdown" (https://www.rotowire.com/football/article/nfl-box-score-breakdown-week-1-recap-usage-stats-134247) | Observed 9/19/2026 | Every RB's Week 1 snaps/share, routes/share, targets, carries, red-zone/goal-line/short-yardage notes, QB/injury context (drives the >40% snap inclusion rule) |
| S3 | Razzball, "RB Zone Vs Gap Rushing" (https://football.razzball.com/zonevsgap/) | Last updated 9/18/2026; data from Week 1 2026 | Designed zone/gap/other rushing attempts and rates per RB |
| S4 | Razzball, "Team Defense Rush Zone/Gap" (https://football.razzball.com/defensezonevsgap/) | Last updated 9/18/2026; each team's last game (Week 1) | Designed rushing yards allowed per game by scheme (zone/gap), plus each defense's Week 2 opponent |
| S5 | Razzball methodology article (https://football.razzball.com/new-zone-vs-gap-rushing-tool/) | Observed 9/19/2026 | Confirms the defensive tool measures yards allowed on designed zone/gap runs (older schedule shown there is not 2026 — methodology use only) |
| S6 | StatRankings, NFL advanced team rushing pages (e.g. https://statrankings.com/nfl/advanced/teams/rushing/inside-zone-rate) | Updated 9/19/2026 | Team inside-zone run rates, Week 1 2026 vs 2025 baseline (only top-5 teams rendered in fetched text) |
| S7 | FantasyAlarm Week 1 RB takeaways article | Observed 9/19/2026 | Chuba Hubbard: 45.5% carry share, 58.1% route participation, all team carries inside the 5, 1.50 YAC/attempt; David Montgomery Week 1 zone YPC 1.64 vs gap YPC 4.67; Woody Marks gap YPC 6.57 |
| S8 | PFF "NFL Week 1: 10 things we learned" (https://www.pff.com/news/nfl-week-1-takeaways-grades) | Observed 9/19/2026 | Derrick Henry: 104 of 144 rush yards after contact, 3 missed tackles forced, 82.0 PFF rushing grade |
| S9 | NBC Sports, "10 Fantasy Football Takeaways from Week 1" (https://www.nbcsports.com/fantasy/football/news/10-fantasy-football-takeaways-from-week-1-josh-allen-and-caleb-williams-go-scorched-earth) | Observed 9/19/2026 | Kenneth Walker: 14 missed tackles forced (Next Gen Stats, most by a Chief in a game since 2018), +101 rushing yards over expected |
| S10 | Touchdown Wire, "For real or forget? Rating breakout Week 1 fantasy RBs" (https://touchdownwire.usatoday.com/story/sports/nfl/touchdown/2026/09/15/for-real-or-forget-rating-breakout-week-1-fantasy-rbs-ahead-of-week-2/91770423007) | Published 9/15/2026 | David Montgomery: 3.0 YPC, zero broken tackles Week 1; Chuba Hubbard framed as sell-high (2 TDs on 13 touches vs weak CHI run D) |
| S11 | Yardbarker/Heavy/SI/SaintsWire/RavensWire Saints–Ravens injury reports | Observed 9/18–9/19/2026 | Alvin Kamara (MCL sprain) practiced fully all week, no game designation, expected to make season debut Week 2 vs BAL; Chris Olave (hamstring) questionable |
| S12 | ClutchPoints/Bolavip/Times Now World/Athlon Packers injury reports | Observed 9/19/2026 | Josh Jacobs on Commissioner's Exempt List (pleaded no contest 9/10/2026 to misdemeanor battery + criminal damage to property); unavailable Week 1, no timetable for return |
| S13 | Brandon Lee Gowton (@BrandonGowton) via RotoWire citation | Posted 9/14/2026 | Saquon Barkley gained 78 of his 83 rushing yards after contact vs WAS |

**Key to tags:** `[ELITE]` = scheme matchup strongly favors the RB's preferred run scheme (opponent well above NFL average yards allowed in that scheme). `[WEAK]` = scheme matchup works against the RB's preferred scheme (opponent well below average). Tags describe the *scheme* fit only, on a one-game sample — not a start/sit call.
**`[2P]` note:** No DraftKings salary data is used anywhere in this file (DK salary API is Akamai-blocked; no DK Network/The Huddle salary pull was made), so no `[2P]` labels appear.
**Sample caveat (applies to every row):** All scheme splits are one game (Week 1). RJ Harvey and Tyjae Spears logged 3 designed carries each; Justice Hill 6; Tony Pollard 7. Treat sub-10-attempt splits as directional only.

**2025 baseline honesty note:** The accessed Razzball tables expose only Week 1 2026 splits — no 2025 player-level zone/gap table was publicly available in the fetched sources, so no 2025 player baselines are listed (marked N/A where a baseline would normally sit). Do not infer them.

---

## PART 1 — Every relevant non-excluded RB (28 players)

Master table (XFP share from S1; snaps/routes/targets from S2; scheme from S3; opp. scheme D from S4):

| RB | Team | Wk2 opp | XFP sh% | Snap% | Route% | Tgts | Scheme Z%/G% (att) | Opp Def Z yd allowed | Opp Def G yd allowed | Tag |
|----|------|---------|---------|-------|--------|------|--------------------|----------------------|----------------------|-----|
| De'Von Achane | MIA | SF | 95 | 88 | 75 | 5 | 46/55 (11) | 23.4 | 77.9 | [ELITE] gap |
| Omarion Hampton | LAC | LV | 81 | 57 | 29 | 0 | 75/25 (12) | 11.7 | 13.6 | [WEAK] |
| Bucky Irving | TB | CLE | 80 | 62 | 58 | 7 | 75/25 (8) | 42.6 | 54.3 | neutral+ |
| Saquon Barkley | PHI | TEN | 75 | 70 | 21 | 2 | 67/27 (15) | 55.8 | 55.8 | [ELITE] |
| Rhamondre Stevenson | NE | PIT | 74 | 85 | 67 | 6 | 22/61 (18) | 69.7 | 42.6 | mixed |
| Chase Brown | CIN | HOU | 73 | 73 | 54 | 6 | 31/69 (16) | 27.9 | 24.8 | [WEAK] gap |
| Chuba Hubbard | CAR | ATL | 71 | 69 | 51 | 3 | 80/20 (10) | 33.1 | 16.6 | [WEAK] zone |
| Christian McCaffrey | SF | MIA | 66 | 55 | 50 | 8 | 90/10 (10) | 65.2 | 37.8 | [ELITE] |
| RJ Harvey | DEN | JAX | 65 | 53 | 42 | 4 | 100/0 (3) | 23.7 | 18.5 | [WEAK]* |
| Bhayshul Tuten | JAX | DEN | 65 | 48 | 36 | 1 | 47/53 (15) | 71.1 | 86.3 | [ELITE] |
| MarShawn Lloyd | GB | NYJ | 63 | 45 | 15 | 1 | 46/54 (13) | 13.4 | 20.1 | [WEAK] |
| Jaylen Warren | PIT | NE | 63 | 37 | 30 | 6 | 60/40 (10) | 60.4 | 11.3 | [ELITE] zone |
| Quinshon Judkins | CLE | TB | 61 | 67 | 41 | 2 | 58/42 (12) | 33.3 | 44.4 | neutral |
| Jadarian Price | SEA | ARI | 56 | 50 | 41 | 2 | 90/10 (10) | 29.7 | 9.9 | [WEAK] zone |
| Tyjae Spears | TEN | PHI | 55 | 51 | 33 | 4 | 100/0 (3) | 67.6 | 25.8 | [ELITE]* zone |
| Jacory Croskey-Merritt | WAS | DAL | 52 | 49 | 37 | 1 | 81/19 (16) | 52.6 | 52.6 | [ELITE] |
| Jeremiyah Love | ARI | SEA | 52 | 44 | 36 | 4 | 73/27 (11) | 16.8 | 27.3 | [WEAK] zone |
| Rico Dowdle | PIT | NE | — | 59 | 47 | 5 | 75/25 (8) | 60.4 | 11.3 | [ELITE] zone |
| Tyler Allgeier | ARI | SEA | — | 57 | 31 | 2 | 65/29 (17) | 16.8 | 27.3 | [WEAK] zone |
| Chris Brooks | GB | NYJ | — | 55 | 20 | 1 | 57/43 (7) | 13.4 | 20.1 | [WEAK] |
| Tony Pollard | TEN | PHI | — | 51 | 18 | 2 | 14/86 (7) | 67.6 | 25.8 | [WEAK] gap |
| Woody Marks | HOU | CIN | — | 49 | 38 | 1 | 22/67 (9) | 23.2 | 14.5 | [WEAK] gap |
| Kenneth Gainwell | TB | CLE | — | 46 | 39 | 1 | 40/60 (5) | 42.6 | 54.3 | [ELITE] gap |
| Justice Hill | BAL | NO | — | 45 | 52 | 1 | 83/17 (6) | 79.0 | 74.1 | [ELITE] |
| George Holani | SEA | ARI | — | 44 | 26 | 1 | 63/25 (8) | 29.7 | 9.9 | [WEAK] zone |
| Kyle Monangai | CHI | MIN | — | 44 | 36 | 2 | 80/20 (10) | 31.4 | 31.4 | neutral+ |
| Kaelon Black | SF | MIA | — | 44 | 28 | 1 | 64/29 (14) | 65.2 | 37.8 | [ELITE] zone |
| Chris Rodriguez | JAX | DEN | — | 41 | 40 | 0 | 33/67 (6) | 71.1 | 86.3 | [ELITE] gap |

*NFL averages for context (S4): 48.3 zone / 33.7 gap yards allowed per game. Asterisk on Harvey/Spears: 3-attempt scheme samples.*
*Near-misses on the strict >40% snap rule (exactly 40.0%, excluded but noted): Braelon Allen (NYJ), Rachaad White (WAS), J.K. Dobbins (DEN) — all S2, observed 9/19/2026.*

### Individual two-line reads

**De'Von Achane (MIA) vs SF — [ELITE] gap.** 88% snaps, 75% route share, 16 of 17 RB opps and 78.6% of designed runs (S2); leans gap 55% vs SF's league-worst 77.9 gap yards allowed (S3/S4). SF sells out to stop zone (23.4 allowed) and gets gashed on gap — Achane's lighter gap profile is the exact attack point.

**Omarion Hampton (LAC) vs LV — [WEAK].** 57% snaps and 12 of 16 carries but 3.6 YPC with a lost fumble and zero targets (S2); 75% zone vs LV's 11.7 zone yards allowed, the stingiest zone D on the slate (S3/S4). Game-script risk too: played only 35% of Q4 snaps once LAC trailed (S2).

**Bucky Irving (TB) vs CLE — neutral+.** 62% snaps, 58% routes, 15 of 21 opps with a 7-48-0 receiving line (S2); 75% zone vs a CLE defense that is merely average vs zone (42.6) but soft vs gap (54.3), which suits Gainwell more than Bucky (S3/S4). Lost a fumble Week 1 but "looked much better than Gainwell" per S2.

**Saquon Barkley (PHI) vs TEN — [ELITE].** 70% snaps, 17 of 22 opps, and 78 of 83 rush yards came after contact behind a poor OL day (S2/S13); 67% zone vs TEN's 55.8/55.8 — soft against everything (S3/S4). TEN allowed the fifth-most designed rush yards (136) in Week 1 (S4).

**Rhamondre Stevenson (NE) vs PIT — mixed (scheme vs role).** True bellcow: 85% snaps, 100% of third downs, 24 of 32 opps, all short-yardage work (S2); but gap-heavy (61%) vs PIT's mediocre 42.6 gap D, while PIT bleeds 69.7 on zone — the opposite of his profile (S3/S4). Watch TreVeyon Henderson: returned to practice Monday 9/14 (S2) and could eat into the role.

**Chase Brown (CIN) vs HOU — [WEAK] gap.** 73% snaps, 22 of 30 opps, team-high-tying 6 targets (S2); 69% gap vs HOU's 24.8 gap yards allowed, top-5 stingiest (S3/S4). The role is elite; the run-scheme fit is not.

**Chuba Hubbard (CAR) vs ATL — [WEAK] zone.** 69% snaps (78% pre-garbage), all team carries inside the 5, 1.50 YAC/attempt (S2/S7); 80% zone vs ATL's solid 33.1 zone D (S3/S4). Touchdown Wire (S10, 9/15) already flags him as a sell-high after 2 TDs on 13 touches vs a weak CHI front.

**Christian McCaffrey (SF) vs MIA — [ELITE].** 55% snaps looks low but came with 8 targets (44.4% TPRR) and the 21-personnel-heavy gameplan (S2); 90% zone vs MIA's 65.2 zone yards allowed (S3/S4). The single most lopsided preferred-scheme edge among high-volume backs.

**RJ Harvey (DEN) vs JAX — [WEAK]* — Q (hamstring).** 53% snaps and a 42% route share with 4 targets show the receiving role is real, but 3 carries total and a 100/0 zone split on that micro-sample vs JAX's 23.7/18.5 — a top-3 scheme defense (S2/S3/S4). The Q tag is the bigger story than the scheme.

**Bhayshul Tuten (JAX) vs DEN — [ELITE].** 48% snaps, 16 of 27 opps as the starter (S2); balanced 47/53 vs DEN's 71.1 zone / 86.3 gap — the worst combined scheme defense on the slate by far (S3/S4). Only knock: six touches before halftime in a blowout (S2).

**MarShawn Lloyd (GB) vs NYJ — [WEAK].** 45% snaps but 14 of 22 opps (64%) — the touch leader over Brooks (S2); balanced 46/54 vs NYJ's 13.4 zone / 20.1 gap, both elite (S3/S4). Note: with Josh Jacobs on the exempt list (S12), Lloyd's role is secure; the matchup is the problem.

**Jaylen Warren (PIT) vs NE — [ELITE] zone.** Only 37% snaps but 16 of 30 opps (more chances than Dowdle on 14 fewer snaps) and 6 targets (S2); 60% zone vs NE's 60.4 zone yards allowed — NE funnels 73% of its allowed rush yards to zone (S3/S4). True 50/50 split with Dowdle keeps volume risk (S2).

**Quinshon Judkins (CLE) vs TB — neutral.** 67% snaps, 14 of 18 opps, but 12-33-0 on the ground and cedes third downs to Raheim Sanders (S2); 58/42 vs TB's 33.3/44.4 — no edge either way (S3/S4). Dylan Sampson's knee injury (S2) thins competition behind him.

**Jadarian Price (SEA) vs ARI — [WEAK] zone.** 50% snaps, 12 of 23 opps as the starter, but zero third-down snaps (Holani took 11 of 12) and Emanuel Wilson lurks as the short-yardage vulture (S2); 90% zone vs ARI's 29.7 zone D (S3/S4). Drew Lock starts for the injured Sam Darnold (S2) — worse game script odds.

**Tyjae Spears (TEN) vs PHI — [ELITE]* zone.** 51% snaps but the role was garbage-time-driven (Pollard had 9 of 12 opps pre-Q4); the 100/0 zone split is 3 carries (S2/S3). Scheme says PHI's 67.6 zone D is gettable — the asterisk says the sample is meaningless.

**Jacory Croskey-Merritt (WAS) vs DAL — [ELITE].** 49% snaps, 17 of 30 opps, 67% of first-down and 59% of second-down snaps, plus a 1-yard TD (S2); 81% zone vs DAL's 52.6/52.6 — soft against both (S3/S4). Zero third-down snaps caps the PPR ceiling (S2).

**Jeremiyah Love (ARI) vs SEA — [WEAK] zone.** Led the backfield pre-4Q (54% snaps, 10:8 carry edge) before Allgeier's garbage-time fourth quarter (S2); 73% zone runs straight into SEA's 16.8 zone yards allowed — the best zone D on the slate (S3/S4). Razzball's "different game script" warning on Allgeier applies double to Love (S2).

**Rico Dowdle (PIT) vs NE — [ELITE] zone.** 59% snaps, 47% routes, 5 targets in a true 50/50 with Warren (S2); 75% zone vs NE's 60.4 zone yards allowed (S3/S4). NE allowed the lowest gap yardage (11.3) on the slate — Dowdle's zone lean is the side to be on.

**Tyler Allgeier (ARI) vs SEA — [WEAK] zone.** 57% snaps but needed the fourth quarter to get there (9 of 10 Q4 carries); 65% zone vs SEA's 16.8 (S2/S3/S4). S2 explicitly warns his role could shrink as Love gets healthier and game script normalizes.

**Chris Brooks (GB) vs NYJ — [WEAK].** Started and played 55% snaps (pass-pro trust: 9 of 10 snaps on 3rd-and-4+) but only 8 of 22 opps (S2); 57/43 vs NYJ's 13.4/20.1 — no scheme soft spot (S3/S4).

**Tony Pollard (TEN) vs PHI — [WEAK] gap.** The early-down lead (64% snaps, 9 of 12 opps pre-Q4) is real, but 86% gap vs PHI's 25.8 gap D — while PHI's 67.6 zone vulnerability goes unused by his profile (S2/S3/S4). Textbook scheme flip against.

**Woody Marks (HOU) vs CIN — [WEAK] gap.** Surprising 49% snap role but only 10 touches to Montgomery's 23, and none of the high-value ones (S2); 67% gap with a flashy 6.57 gap YPC (S7) vs CIN's 14.5 gap yards allowed — second-stingiest (S3/S4).

**Kenneth Gainwell (TB) vs CLE — [ELITE] gap.** Thin role (46% snaps, 6 touches; "looks like a backup" per S2), but 60% gap vs CLE's 54.3 gap yards allowed — CLE's clear soft spot (S3/S4). Scheme says yes; usage says caution.

**Justice Hill (BAL) vs NO — [ELITE].** 45% snaps with a 52% route share as the passing-down back (S2); 83% zone on 6 attempts vs NO's league-worst 79.0 zone yards allowed (S3/S4). The single biggest preferred-scheme yardage number on the board — on the smallest credible sample.

**George Holani (SEA) vs ARI — [WEAK] zone.** 44% snaps as the passing-down hammer (11 of 12 third downs) with 8 carries for 29 yards (S2); 63% zone vs ARI's 29.7 zone D (S3/S4). Role is secure; scheme fit is not.

**Kyle Monangai (CHI) vs MIN — neutral+.** 44% snaps, 10-100-1 with a 61-yard TD, alternating drives with Swift and trusted by Ben Johnson (S2); 80% zone vs MIN's middling 31.4/31.4 (S3/S4). Gets all the goal-line work only if Swift doesn't — Swift took all 3 GL carries Week 1 (S2).

**Kaelon Black (SF) vs MIA — [ELITE] zone.** 44% snaps and a surprising 14 carries for 65 yards as CMC's clear No. 2 (S2); 64% zone vs MIA's 65.2 zone yards allowed (S3/S4). Quietly the best scheme spot among backup-tier backs.

**Chris Rodriguez (JAX) vs DEN — [ELITE] gap.** 41% snaps, 6-23-0 as Tuten's direct backup (S2); 67% gap vs DEN's 86.3 gap yards allowed — the worst single scheme number on the slate (S3/S4). One Tuten injury from a smash spot.

---

## PART 2 — Complete scheme matrix (priority section): all 28 Part 1 RBs + all 18 fixed-exclusion stars

Scheme splits: Razzball RB tool, updated 9/18/2026, Week 1 2026 data (S3). Opponent scheme defense: Razzball defensive tool, updated 9/18/2026 (S4). 2026 season baselines: N/A — not publicly exposed in accessed sources (see honesty note above). Jacobs/Kamara: DNP Week 1, so no 2026 scheme split exists.

| # | RB | Team | Wk2 opp | Zone att | Zone% | Gap att | Gap% | Other% | Tot att | Opp Def Z yd | Opp Def G yd | Notes (S2 unless noted) |
|---|----|------|---------|----------|-------|---------|------|--------|---------|--------------|--------------|------------------------|
| 1 | De'Von Achane | MIA | SF | 5 | 46% | 6 | 55% | 0% | 11 | 23.4 | 77.9 | 88% snaps, 75% routes, 16/17 opps |
| 2 | Aaron Jones | MIN | CHI | 3 | 25% | 8 | 67% | 8% | 12 | 49.6 | 29.0 | 43% snaps, 12-40-1; Mason now on IR |
| 3 | Bijan Robinson | ATL | CAR | 12 | 57% | 8 | 38% | 5% | 21 | 124.9 | 41.6 | 77% snaps, 21-83-0, 8-90-1, 10 tgts (52.6% TSh, highest by RB since 2011) |
| 4 | Javonte Williams | DAL | WAS | 8 | 67% | 4 | 33% | 0% | 12 | 42.2 | 17.6 | 73% snaps, 17/20 opps, 2 TDs |
| 5 | Derrick Henry | BAL | NO | 16 | 67% | 8 | 33% | 0% | 24 | 79.0 | 74.1 | 55% snaps, 24-144-3; 104 YAC, 3 MT forced, 82.0 PFF grade (S8) |
| 6 | Cam Skattebo | NYG | LAR | 7 | 39% | 11 | 61% | 0% | 18 | 93.7 | 24.7 | 60% snaps, 18-81-1; iced out of pass game (25% routes, Singletary took pass downs) |
| 7 | Kyren Williams | LAR | NYG | 3 | 27% | 8 | 73% | 0% | 11 | 30.6 | 15.3 | 63% snaps, 72% routes; all 6 snaps inside the 10 |
| 8 | Blake Corum | LAR | NYG | 3 | 30% | 7 | 70% | 0% | 10 | 30.6 | 15.3 | 23% snaps, 10 carries; pure backup |
| 9 | Kenneth Walker III | KC | IND | 10 | 44% | 13 | 57% | 0% | 23 | 93.1 | 44.3 | 69% snaps, 23-173-1, 6 tgts; 14 MT forced, +101 RYOE (S9) |
| 10 | Jonathan Taylor | IND | KC | 13 | 68% | 6 | 32% | 0% | 19 | 23.2 | 15.5 | 89% snaps, 23/24 opps, 19-98-2 |
| 11 | D'Andre Swift | CHI | MIN | 13 | 72% | 5 | 28% | 0% | 18 | 31.4 | 31.4 | 56% snaps, 18-124-3; all 3 GL carries |
| 12 | David Montgomery | HOU | CIN | 11 | 55% | 9 | 45% | 0% | 20 | 23.2 | 14.5 | 51% snaps, 20-60-2; 3.0 YPC, 0 broken tackles (S10); zone YPC 1.64 / gap 4.67 (S7) |
| 13 | Josh Jacobs | GB | NYJ | — | N/A | — | N/A | — | DNP | 13.4 | 20.1 | DNP Week 1 — Commissioner's Exempt List, no timetable (S12) |
| 14 | Alvin Kamara | NO | BAL | — | N/A | — | N/A | — | DNP | 63.7 | 29.4 | DNP Week 1 (MCL); full practice all week, debut expected Week 2 behind Etienne (S11) |
| 15 | Travis Etienne | NO | BAL | 7 | 70% | 1 | 10% | 20% | 10 | 63.7 | 29.4 | 58% snaps (65% post-halftime), 9-46-0, 7-32-0, 9 tgts |
| 16 | Jahmyr Gibbs | DET | — | 15 | 52% | 14 | 48% | 0% | 29 | — | — | NOT on Sun/Mon slate; 73% snaps, 29-156-2, 34/37 opps Week 1 |
| 17 | Breece Hall | NYJ | GB | 11 | 50% | 11 | 50% | 0% | 22 | 34.2 | 39.9 | 59% snaps, 22-102-1; played all 3 snaps inside the 5 |
| 18 | Ashton Jeanty | LV | LAC | 13 | 57% | 9 | 39% | 4% | 23 | 58.7 | 24.7 | 73% snaps, 29/36 opps, 23-102-0, 6-45-2 |
| 19 | Tyrone Tracy | NYG | LAR | 1 | 50% | 1 | 50% | 0% | 2 | 93.7 | 24.7 | 2 snaps, 2-14-0; non-factor |
| 20 | Omarion Hampton | LAC | LV | 9 | 75% | 3 | 25% | 0% | 12 | 11.7 | 13.6 | 57% snaps, 12-43-1, fum lost, 0 tgts |
| 21 | Bucky Irving | TB | CLE | 6 | 75% | 2 | 25% | 0% | 8 | 42.6 | 54.3 | 62% snaps, 58% routes, 8-45-1, 7-48-0 |
| 22 | Saquon Barkley | PHI | TEN | 10 | 67% | 4 | 27% | 7% | 15 | 55.8 | 55.8 | 70% snaps, 15-83-0; 78/83 yds after contact (S13) |
| 23 | Rhamondre Stevenson | NE | PIT | 4 | 22% | 11 | 61% | 17% | 18 | 69.7 | 42.6 | 85% snaps, 100% of 3rd downs, 18-51-0, 5-44-0 |
| 24 | Chase Brown | CIN | HOU | 5 | 31% | 11 | 69% | 0% | 16 | 27.9 | 24.8 | 73% snaps, 22/30 opps, 16-56-1, 6 tgts |
| 25 | Chuba Hubbard | CAR | ATL | 8 | 80% | 2 | 20% | 0% | 10 | 33.1 | 16.6 | 69% snaps, 10-49-1, 3-38-1; all carries inside the 5 (S7) |
| 26 | Christian McCaffrey | SF | MIA | 9 | 90% | 1 | 10% | 0% | 10 | 65.2 | 37.8 | 55% snaps, 50% routes, 10-68-0, 8 tgts |
| 27 | RJ Harvey | DEN | JAX | 3 | 100% | 0 | 0% | 0% | 3 | 23.7 | 18.5 | Q (hamstring); 53% snaps, 42% routes, 3-18-0, 4-23-0 |
| 28 | Bhayshul Tuten | JAX | DEN | 7 | 47% | 8 | 53% | 0% | 15 | 71.1 | 86.3 | 48% snaps, 16/27 opps, 15-66-0 |
| 29 | MarShawn Lloyd | GB | NYJ | 6 | 46% | 7 | 54% | 0% | 13 | 13.4 | 20.1 | 45% snaps, 14/22 opps, 13-37-0 |
| 30 | Jaylen Warren | PIT | NE | 6 | 60% | 4 | 40% | 0% | 10 | 60.4 | 11.3 | 37% snaps, 16/30 opps, 10-46-0, 5-27-0, 6 tgts |
| 31 | Quinshon Judkins | CLE | TB | 7 | 58% | 5 | 42% | 0% | 12 | 33.3 | 44.4 | 67% snaps, 14/18 opps, 12-33-0 |
| 32 | Jadarian Price | SEA | ARI | 9 | 90% | 1 | 10% | 0% | 10 | 29.7 | 9.9 | 50% snaps, 12/23 opps, 10-52-0; 0% of 3rd downs |
| 33 | Tyjae Spears | TEN | PHI | 3 | 100% | 0 | 0% | 0% | 3 | 67.6 | 25.8 | 51% snaps (garbage-inflated), 3-12-0, 2-12-0, 4 tgts |
| 34 | Jacory Croskey-Merritt | WAS | DAL | 13 | 81% | 3 | 19% | 0% | 16 | 52.6 | 52.6 | 49% snaps, 17/30 opps, 16-63-1; 0% of 3rd downs |
| 35 | Jeremiyah Love | ARI | SEA | 8 | 73% | 3 | 27% | 0% | 11 | 16.8 | 27.3 | 44% snaps, 11-41-1, 4 tgts; led pre-4Q |
| 36 | Rico Dowdle | PIT | NE | 6 | 75% | 2 | 25% | 0% | 8 | 60.4 | 11.3 | 59% snaps, 47% routes, 8-15-0, 5 tgts; 50/50 w/ Warren |
| 37 | Tyler Allgeier | ARI | SEA | 11 | 65% | 5 | 29% | 6% | 17 | 16.8 | 27.3 | 57% snaps (4Q-inflated), 17-61-0 |
| 38 | Chris Brooks | GB | NYJ | 4 | 57% | 3 | 43% | 0% | 7 | 13.4 | 20.1 | 55% snaps, 8/22 opps; 9/10 on 3rd-and-4+ |
| 39 | Tony Pollard | TEN | PHI | 1 | 14% | 6 | 86% | 0% | 7 | 67.6 | 25.8 | 51% snaps, 9/12 opps pre-Q4, 7-35-0 |
| 40 | Woody Marks | HOU | CIN | 2 | 22% | 6 | 67% | 11% | 9 | 23.2 | 14.5 | 49% snaps, 9-42-0; gap YPC 6.57 (S7) |
| 41 | Kenneth Gainwell | TB | CLE | 2 | 40% | 3 | 60% | 0% | 5 | 42.6 | 54.3 | 46% snaps, 6 touches; backup role |
| 42 | Justice Hill | BAL | NO | 5 | 83% | 1 | 17% | 0% | 6 | 79.0 | 74.1 | 45% snaps, 52% routes, 6-18-0 |
| 43 | George Holani | SEA | ARI | 5 | 63% | 2 | 25% | 13% | 8 | 29.7 | 9.9 | 44% snaps, 11/12 3rd downs, 8-29-0 |
| 44 | Kyle Monangai | CHI | MIN | 8 | 80% | 2 | 20% | 0% | 10 | 31.4 | 31.4 | 44% snaps, 10-100-1 (61-yd TD) |
| 45 | Kaelon Black | SF | MIA | 9 | 64% | 4 | 29% | 7% | 14 | 65.2 | 37.8 | 44% snaps, 14-65-0; CMC's clear No. 2 |
| 46 | Chris Rodriguez | JAX | DEN | 2 | 33% | 4 | 67% | 0% | 6 | 71.1 | 86.3 | 41% snaps, 6-23-0; Tuten's direct backup |

Jordan Mason (MIN, 60/40 on 15 att Week 1) is on IR and excluded from the matrix per assignment.

---

## FIVE BIGGEST ZONE/GAP MISMATCHES — with verdicts

Scored on preferred-scheme yards allowed vs the 48.3 zone / 33.7 gap NFL averages (S4), filtered to backs with a real Week 1 role. One-game sample throughout.

### 1. Christian McCaffrey (SF) vs MIA — ELITE (zone)
**The mismatch:** CMC ran zone on 9 of 10 designed attempts (90%) and MIA allowed 65.2 zone yards — 35% above league average, 4th-worst on the slate — while SF funnels its run game through zone (S3/S4). **Verdict:** The strongest preferred-scheme edge among true lead backs. Nothing in the scheme data pushes back.

### 2. Bhayshul Tuten (JAX) vs DEN — ELITE (both schemes)
**The mismatch:** DEN allowed 71.1 zone + 86.3 gap yards (157.4 total, worst combined on the slate by ~60 yards) and Tuten runs a balanced 47/53 — there is no wrong call (S3/S4). **Verdict:** The best raw matchup on the board. Only dampener is role: six touches before halftime in a blowout (S2).

### 3. Justice Hill (BAL) vs NO — ELITE (zone), asterisk
**The mismatch:** Hill is 83% zone and NO allowed a league-worst 79.0 zone yards — the single largest preferred-scheme number in the matrix (S3/S4). **Verdict:** Scheme-wise it's a smash; reality-wise it's 6 carries on 45% snaps behind Henry. The edge is real but the volume ceiling is a receiving-back one.

### 4. Bijan Robinson (ATL) vs CAR — ELITE (zone)
**The mismatch:** Bijan is 57% zone and CAR allowed 124.9 zone yards — the most zone yards allowed by any defense on the slate, 2.6x the NFL average (S3/S4). Pair with the 77% snap share and the 52.6% target share, the highest by a RB since 2011 (S2). **Verdict:** The highest-upside star spot on the slate; the gap between his zone profile and CAR's zone defense is the widest in the data.

### 5. De'Von Achane (MIA) vs SF — ELITE (gap)
**The mismatch:** Achane leans gap (55%) and SF allowed 77.9 gap yards — worst gap D on the slate, 2.3x average — while bottling up zone (23.4, top-5) (S3/S4). **Verdict:** The exact inverse of what SF's defense wants to face, on an 88%-snap back. The strongest gap-scheme edge on the slate.

**Just missed:** Derrick Henry vs NO (67% zone vs 79.0/74.1 — NO is bad at both, Henry needs no scheme help); Rico Dowdle and Jaylen Warren vs NE (75%/60% zone vs NE's 60.4 zone allowed, though the 50/50 split caps both); Kenneth Gainwell vs CLE (60% gap vs 54.3, role too thin); Kaelon Black vs MIA (64% zone vs 65.2, backup role).

---

## SCHEME-DRIVEN READ FLIPS (base read → scheme-adjusted read)

**Upward flips (scheme improves the base read):**
- **Bhayshul Tuten:** base read "solid committee starter" → "best raw matchup on the slate" (DEN is worst at both schemes).
- **De'Von Achane:** base read "already elite volume" → "scheme is the best possible fit for his gap lean."
- **Jaylen Warren / Rico Dowdle:** base read "frustrating 50/50" → "whichever gets the zone carries faces NE's 60.4 zone soft spot; Warren's 60% zone lean fits slightly better."
- **Kenneth Gainwell:** base read "backup, ignore" → "if Bucky stumbles, CLE's 54.3 gap D is the exact soft spot for his 60% gap profile."

**Downward flips (scheme degrades the base read):**
- **Omarion Hampton:** base read "workhorse (81% XFP)" → "75% zone into LV's 11.7 zone yards allowed, the stingiest on the slate."
- **Jeremiyah Love:** base read "backfield leader pre-4Q" → "73% zone straight into SEA's 16.8 zone D, the best on the slate."
- **Chase Brown:** base read "elite role (73% snaps)" → "69% gap into HOU's 24.8 gap D, top-5 stingiest."
- **Tony Pollard:** base read "early-down lead" → "86% gap into PHI's 25.8 gap D while PHI's 67.6 zone vulnerability goes unused."
- **Chuba Hubbard:** base read "goal-line bellcow" → "80% zone into ATL's solid 33.1 zone D; Touchdown Wire already flags sell-high (S10)."
- **Woody Marks:** base read "surprising 49% snap role" → "67% gap into CIN's 14.5 gap D, second-stingiest."
- **MarShawn Lloyd / Chris Brooks:** base read "touch leader / starter in a Jacobs-less backfield" → "NYJ's 13.4 zone / 20.1 gap — no soft spot for either profile."
- **Jadarian Price / George Holani:** base read "starter / passing-down lock" → "90%/63% zone into ARI's 29.7 zone D; SEA's QB downgrade to Drew Lock compounds it (S2)."
- **Jonathan Taylor:** base read "89% snaps, 98 yards, 2 TDs" → "68% zone into KC's 23.2 zone D, the stingiest zone D among star matchups."
- **RJ Harvey:** base read "receiving role is real" → "100% zone on 3 carries into JAX's 23.7/18.5, top-3 scheme D — plus the Q (hamstring) tag."
- **Kyren Williams / Cam Skattebo:** base read "lead backs" → "73%/61% gap into NYG's 15.3 / LAR's 24.7 gap Ds — both among the stingiest."

**Neutral but notable:** Saquon (67% zone vs TEN's 55.8/55.8 — soft everywhere, no flip); Breece Hall (50/50 vs GB's middling 34.2/39.9 — no flip); Kenneth Walker III (57% gap vs IND's 44.3 gap — IND's real weakness is zone at 93.1, a mild negative for his lean); David Montgomery (55/45 vs CIN's 23.2/14.5 — bad at both, with S10's 3.0 YPC / zero broken tackles underneath).

---

## Caveats & limitations

1. **One-game sample.** Every scheme split and every defensive yards-allowed figure is Week 1 only (Razzball updated 9/18/2026). Nothing here is a stable rate.
2. **Tiny-carry samples:** Harvey (3), Spears (3), Hill (6), Pollard (7), Bucky (8), Dowdle (8), Holani (8), Brooks (7), Marks (9) designed attempts — directional only.
3. **Defensive yards allowed ≠ efficiency.** Razzball's defensive tool reports designed rushing yards allowed by scheme — not EPA, success rate, yards before contact, or missed tackles. A defense can allow big yardage on few attempts (DEN: 86.3 gap yards) without being a bad per-carry unit.
4. **No 2025 player baselines.** The accessed Razzball tables expose Week 1 2026 only; no 2025 zone/gap player table was publicly available. Baselines are marked N/A rather than inferred.
5. **No EPA/rush, success rate, YBC, or missed-tackle splits by scheme** were publicly exposed in any accessed source — marked N/A throughout per instruction.
6. **Role notes can move the read more than scheme.** Henderson's return-to-practice threatens Rhamondre's 85% snap share; Kamara's debut threatens Etienne's 65% post-halftime share; Sampson's injury helps Judkins; Lock starting for Darnold hurts all Seahawks backs.
7. **No DraftKings salaries appear in this file** — the DK salary API is Akamai-blocked and no DK Network/The Huddle salary pull was made, so there is nothing to label `[2P]`.
8. **RJ Harvey's Q (hamstring)** is carried from the assignment brief; the injury reports pulled for this file (S11/S12) did not add independent confirmation of his status.

*End of research file. Researched 2026-09-19. Next: salary pull (DK Network/The Huddle only, label `[2P]`) and injury confirmation pass before any contest use.*
