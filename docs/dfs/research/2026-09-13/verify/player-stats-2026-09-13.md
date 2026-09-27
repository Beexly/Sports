# DFS Player-Stat Verification — Week 1 2026
**Date:** 2026-09-13
**Scope:** 13 player-level claims used in Week 1 2026 NFL DFS analysis.

## Verdict key
- **CONFIRMED** — claim checks out against a permitted source.
- **CORRECTED** — claim is materially wrong; the right number is given.
- **UNVERIFIABLE** — the exact figure cannot be established outside banned sources; the closest verifiable raw alternative is given instead.

## Banned sources (excluded throughout)
PFF, Sharp Football, FTN, FantasyPoints, Next Gen Stats, Warren Sharp content, ESPN (incl. stats pages), NFL.com, CBS, NBC Sports, USA Today and syndicated Wire properties, Sports Illustrated, thehuddle, RotoBaller, RotoWire, FantasyAlarm, FantasyLabs, numberFire, FantasyPros, PlayerProfiler.

**Scoring note:** Fantasy PPG figures below use standard scoring (1 pt / 25 pass yds, 4 pts / pass TD, −2 / INT, 1 pt / 10 rush yds, 0 PPR for QBs). Fumble data was not available in permitted game logs and is excluded; figures are computed transparently from StatMuse game logs so the math can be re-checked.

## Verdict table

| # | Claim | Verdict | Verified / corrected number |
|---|---|---|---|
| 1 | Jared Goff: 110.8 passer rating in dome games (2025) | **CORRECTED** | **107.3** in true dome games (9 gms). The 110.8 is a StatMuse query-labeling artifact (see note). |
| 2 | Goff: 19.6 fantasy PPG indoors vs 13.5 outdoors | **CORRECTED** | **19.9 indoors / 15.7 outdoors** (standard scoring, true venue split). The 19.6 is close; the 13.5 cannot be reproduced. |
| 3 | Sam LaPorta: 2.14 yards per route run | **CORRECTED** | **1.98 YPRR** (489 yds / 247 routes, SumerSports) |
| 4 | LaPorta: only one end-zone target in final nine games | **UNVERIFIABLE** | Closest raw alternative: **49 targets, 489 yds, 3 TD in 9 games** (his full 2025 season) |
| 5 | Saquon Barkley: yards before contact/att fell 3.55 → 2.11 | **CORRECTED** | **2.44 → 1.13** under SumerSports' before-contact definition |
| 6 | T.J. Hockenson: 51 receptions, 438 yds, 3 TD (2025) | **CONFIRMED** | 51 / 438 / 3 in 15 games |
| 7 | Dallas Goedert: 27.1% TPRR without A.J. Brown vs 18.8% with him | **UNVERIFIABLE** | Closest alternative: **19.6% season TPRR** (82 targets / 419 routes). The split traces to a banned USA Today piece. |
| 8 | Goedert: 40.9% of Eagles' inside-the-10 targets | **UNVERIFIABLE** | Closest alternative: **15 red-zone targets, 30.0% red-zone target share**; 11 rec TD (career high) |
| 9 | Michael Mayer: 6.0 targets and 10.9 PPR PPG in fill-in starts | **CONFIRMED** | Four Bowers-absent games: **18 rec / 24 targets / 196 yds / 1 TD → 6.0 trg/g; 10.9 full-PPR PPG** |
| 10 | Kyler Murray: 14.7% career under-center vs 46.9% KOC Vikings 2025 | **UNVERIFIABLE** | Directional only: Murray is historically shotgun-heavy; the exact figures cannot be corroborated outside banned/derivative sources |
| 11 | Chase Brown: 91.3% of team rushing attempts, Week 1 2025 | **CONFIRMED** | **21 of Cincinnati's 23 rushes = 91.3%** |
| 12 | MarShawn Lloyd is the Packers' lead back with Jacobs exempt | **CONFIRMED (qualified)** | De facto RB1, but Green Bay is planning a **committee** (touches "to be determined") |
| 13 | Tyler Allgeier's Falcons depth-chart status | **CORRECTED** | **He is not on the Falcons.** Signed 2-yr/$12.25M with the **Cardinals** (Mar 2026); listed **RB1** on Arizona's published depth chart ahead of rookie Jeremiyah Love |

---

## Claim-by-claim detail

### 1. Goff 110.8 dome passer rating — CORRECTED → 107.3
StatMuse's "Goff in a dome" query returns 216/310, 2,490 yds, 21 TD, 4 INT = **110.8 rating** — but the underlying 10-game set is actually his **first 10 games of the season**, six of which were at outdoor stadiums (@GB, @BAL, @CIN, @KC, @WAS, @PHI). It is a query-labeling artifact, not a venue filter.
True dome games (8 at Ford Field + 12/25 @MIN): 224/333, 2,545 yds, 21 TD, 3 INT = **107.3 passer rating**.
Sources: [StatMuse "Goff in a dome"](https://www.statmuse.com/nfl/ask/goff-in-a-dome), [Goff 2025 game logs](https://www.statmuse.com/nfl/ask/goff-gamelog-runs)

### 2. Goff 19.6 / 13.5 fantasy PPG indoors/outdoors — CORRECTED → 19.9 / 15.7
Computed from StatMuse game logs (passing + rushing, standard scoring, no fumble data):
- **True domes (9 gms):** 175.4 pass FP + 3.6 rush FP = 179.0 → **19.9 PPG**
- **True outdoor (8 gms):** 124.76 pass FP + 0.9 rush FP = 125.66 → **15.7 PPG**
- (Home/road split for reference: 19.3 vs 16.7.)
The claimed 19.6 is within scoring-definition distance of 19.9; the claimed 13.5 cannot be reproduced under any standard split or scoring variant tested (4-pt or 6-pt pass TDs, −1/−2/−4 per INT, home/away vs true-venue splits).
Sources: [Goff rushing game log](https://www.statmuse.com/nfl/ask/goff-gamelog-runs), [Goff 2025 rushing totals](https://www.statmuse.com/nfl/ask/jared-goff-rushing-yards-per-game-this-season)

### 3. LaPorta 2.14 YPRR — CORRECTED → 1.98
SumerSports 2025: **489 receiving yards on 247 routes run = 1.98 YPRR**. (The Fantasy Footballers' free TPRR table credits 246 routes → 1.99; either way, not 2.14.)
Sources: [SumerSports — Sam LaPorta](https://sumersports.com/players/51eefdb/sam-laporta/), [Fantasy Footballers TPRR report](https://www.thefantasyfootballers.com/analysis/targets-per-route-run-report-2026-season-preview-fantasy-football/)

### 4. LaPorta one end-zone target in final nine games — UNVERIFIABLE
No permitted source publishes LaPorta's target-location (end-zone) data for 2025. His final nine games were his entire 2025 season (he played 9 games). Closest verifiable raw line: **40 receptions on 49 targets for 489 yards and 3 TD** (official Lions splits / StatMuse).
Sources: [Lions official splits](https://www.detroitlions.com/team/players-roster/sam-laporta/splits/), [StatMuse](https://www.statmuse.com/nfl/ask/sam-laporta-stats-in-his-last-season)

### 5. Barkley YBC/att 3.55 → 2.11 — CORRECTED → 2.44 → 1.13
Using SumerSports' free before-contact definition, (rush yds − yds after contact) / attempts:
- 2024: (2,005 − 1,164) / 345 = **2.44**
- 2025: (1,140 − 824) / 280 = **1.13**
The direction of the claim (sharp decline) is right; the 3.55 figure appears tied to a banned vendor's different "before contact" definition and cannot be reproduced from permitted sources.
Source: [SumerSports — Saquon Barkley](https://sumersports.com/players/b4577b3/saquon-barkley/)

### 6. Hockenson 51/438/3 — CONFIRMED
Official Vikings page and StatMuse both show **51 receptions, 438 yards, 3 TD in 15 games** in 2025.
Sources: [Vikings.com](https://www.Vikings.com/team/players-roster/t-j-hockenson/situational/), [StatMuse](https://www.statmuse.com/nfl/ask/hockenson-stats-this-year)

### 7. Goedert 27.1% / 18.8% TPRR with/without A.J. Brown — UNVERIFIABLE
The exact with/without-Brown split appears in a **banned USA Today** Week 1 Start/Sit piece and cannot be independently established: it requires per-game route counts and Brown's exact absence games from a permitted source, which don't exist. Closest permitted alternative — full-season TPRR: **82 targets / 419 routes = 19.57%** (Fantasy Footballers); SumerSports credits 434 routes (18.9%). Season line: 60 rec, 591 yds, 11 TD in 15 games (StatMuse).
Sources: [Fantasy Footballers TPRR report](https://www.thefantasyfootballers.com/analysis/targets-per-route-run-report-2026-season-preview-fantasy-football/), [SumerSports — Dallas Goedert](https://sumersports.com/players/8e1ca47/dallas-goedert/), [StatMuse](https://www.statmuse.com/nfl/ask/goedder)

### 8. Goedert 40.9% of inside-the-10 targets — UNVERIFIABLE
The 40.9% figure comes from the same banned USA Today piece; no permitted source publishes inside-the-10 target share. Closest permitted alternatives: **15 red-zone targets, 13 catches, 30.0% red-zone target share** (PrizePicks free fantasy page) and a **career-high 11 receiving TDs** in 2025 (StatMuse). Note: red-zone share ≠ inside-the-10 share.
Sources: [PrizePicks playbook](https://www.prizepicks.com/playbook-article/five-fantasy-football-sleepers-draft-this-weekend-dallas-goedert), [StatMuse](https://www.statmuse.com/nfl/ask/goedder)

### 9. Mayer 6.0 targets / 10.9 PPR PPG in fill-in starts — CONFIRMED
Bowers' absence is independently verifiable from permitted sources: he played Weeks 1–4 through a PCL injury/bone bruise, then **sat out three straight games** (Reuters, Oct 2025), and was **placed on injured reserve for the final two weeks** of the season, finishing with 12 games played (Reuters/Fox Sports/Sporting News, Sept 2026). Mayer missed the first of those five absences (vs IND) while in concussion protocol (Reuters). His four Bowers-absent games, per StatMuse game logs:

| Date | Opp | Rec | Trg | Yds | TD |
|---|---|---|---|---|---|
| 10/12/2025 | vs TEN | 5 | 7 | 50 | 1 |
| 10/19/2025 | @ KC | 1 | 2 | 10 | 0 |
| 12/28/2025 | vs NYG | 9 | 10 | 89 | 0 |
| 1/4/2026 | vs KC | 3 | 5 | 47 | 0 |
| **Total** | | **18** | **24** | **196** | **1** |

24 ÷ 4 = **6.0 targets/game**; full-PPR: (18 + 19.6 + 6) ÷ 4 = **10.9 PPG**. Both numbers check out exactly.
Sources: [StatMuse game log](https://www.statmuse.com/nfl/player/michael-mayer-30288/game-log?seasonYear=2025), [Mayer vs KC 1/4](https://www.statmuse.com/nfl/ask/tight-end-game-logs-vs-chiefs-this-season-with-5-targets), [Mayer 2025 game list](https://www.statmuse.com/nfl/ask/michael-mayer-stats-in-each-game-so-far-this-season), [Reuters — Bowers week-to-week](https://www.reuters.com/sports/raiders-te-brock-bowers-knee-week-to-week--flm-2025-10-06/), [Reuters — Bowers IR](https://www.reuters.com/sports/report-raiders-te-brock-bowers-knee-expected-miss-1-2-games--flm-2026-09-09/), [Fox Sports — Bowers IR](https://foxsports.com/stories/nfl/raiders-te-brock-bowers-undergoes-meniscus-surgery-expected-miss-1-2-games), [Sporting News — Bowers injury history](https://www.sportingnews.com/ca/nfl/las-vegas-raiders/news/meniscus-trim-brock-bowers-recovery-timeline-knee-injury/fe950d4d42899a9156651ad3)

### 10. Murray 14.7% career under-center vs 46.9% KOC Vikings 2025 — UNVERIFIABLE
The specific figures could not be corroborated from any permitted source; versions found in banned or derivative sources conflict (roughly 5% vs 14.7% career; 47% vs 56.4% for KOC's Vikings depending on down/situation definitions). Directional permitted evidence only: Murray is historically shotgun-heavy — in one early Drew Petzing game he lined up in shotgun for all but nine snaps (RaisingZona, via AZCardinals.com), and he threw 121 passes from under center in 2024 (Purple Insider).
Sources: [RaisingZona](https://raisingzona.com/posts/arizona-cardinals-quarterback-line-center-01hf9n5afqpe), [Purple Insider](https://www.purpleinsider.football/p/how-does-kyler-murray-overcome-his)

### 11. Chase Brown 91.3% of team rushes, Week 1 2025 — CONFIRMED
Week 1 2025 box score (CIN vs CLE): Brown had **21 of Cincinnati's 23 rushing attempts** (Joe Burrow had the other two) = **91.3%** exactly.
Source: [FootballDB box score](https://www.footballdb.com/games/boxscore/cincinnati-bengals-vs-cleveland-browns-2025090707)

### 12. MarShawn Lloyd lead back with Jacobs exempt — CONFIRMED (qualified)
Josh Jacobs remained on the Commissioner's Exempt List and unavailable for Week 1 as of 2026-09-13 (Reuters). TSN reports Lloyd "has become the Packers' **de facto RB1**" — but head coach Matt LaFleur says backfield touches are "**to be determined**," with Chris Brooks and rookie Kaleb Johnson also getting work. Verdict: Lloyd is the starter/de facto RB1, **not** an uncontested bellcow; frame as committee lead.
Sources: [TSN](https://www.TSN.ca/nfl/article/expectations-for-packers-lloyd-with-jacobs-out-n1-49869653/), [Reuters — Jacobs exempt](https://www.reuters.com/sports/matt-lafleur-packers-rb-josh-jacobs-out-at-least-this-week--flm-2026-08-11/)

### 13. Tyler Allgeier's Falcons depth-chart status — CORRECTED
The premise is stale: **Allgeier is not on the Falcons.** He left Atlanta in free agency and signed a **two-year, $12.25 million deal with the Arizona Cardinals in March 2026** (Reuters). Arizona's published depth chart listed **Allgeier as RB1 ahead of rookie third-overall pick Jeremiyah Love** (ClutchPoints), though camp reporting framed the backfield as a likely timeshare with Love pushing for the lead role.
Sources: [Reuters — Allgeier to Cardinals](https://www.reuters.com/sports/reports-cardinals-lure-rb-tyler-allgeier-1225m-deal--flm-2026-03-09/), [ClutchPoints — Cardinals depth chart](http://clutchpoints.com/nfl/arizona-cardinals/cardinals-news-jeremiyah-love-backup-behind-tyler-allgeier-first-depth-chart)

---

## Notes for the DFS desk
- Claims 7 and 8 both trace to a single banned USA Today Week 1 Start 'Em/Sit 'Em piece; neither underlying split is reproducible from permitted sources. Do not reuse either number without a permitted citation.
- Claim 1's 110.8 is a StatMuse query-labeling artifact — anyone spot-checking the piece on StatMuse will see 110.8 and think it confirms, but the game set is wrong. Use 107.3 (true domes) or drop the stat.
- Claim 2's outdoor figure (13.5) is the furthest off; the defensible split is 19.9 / 15.7.
- Claim 13 needs a roster-status rewrite, not a tweak: Allgeier is a Cardinal.
