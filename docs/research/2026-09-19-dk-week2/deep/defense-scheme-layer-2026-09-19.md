# Defense Scheme Layer — DraftKings NFL Week 2, 2026

**Scope:** 15 Sunday/Monday games (2026-09-20, 2026-09-21); 30 defenses. Unit/scheme layer only — no player-level CB grades (sibling lane), no lineups.
**Research date:** 2026-09-19. **Wk1 data:** recorded 2026-09-18. All Wk1 figures are one-game samples.

## Sources and conventions

- **StatRankings advanced teams file** (`nfl-advanced-teams.csv`, recorded/source date 2026-09-18): Wk1 2026 + 2025 man/zone/blitz/pressure/sack/FP splits. Exposes only top-5 teams per metric — anything outside the top five is reported as "outside top five (not publicly verified)" rather than zero.
- **GSE lab** `team_metrics_2025.csv` / `team_metrics_2026.csv` (dated 2026-09-17): defensive EPA, success allowed, explosive allowed, takeaways vs expected. The files store **defensive EPA** (positive = good defense); this report inverts it and presents **offense EPA/play allowed** (negative = good defense). Success/explosive rates are already "allowed" rates.
- **DC / play-caller identity:** verified via team sites, ESPN, Reuters, and beat reporting with dates inline. Where 2026 play-caller differs from the named DC, it is flagged.
- **INT-luck regression:** 2025 `takeaways_int_diff` (actual minus expected forced INTs). Positive = forced more than expected → negative regression risk; negative = fewer than expected → positive regression candidate.
- **Not publicly verified in sources inspected:** man/zone EPA/play, success and explosive splits; early-down, third-down and red-zone blitz rates for 2025 and Wk1. Marked as gaps where relevant, never fabricated.
- LAR appears as "LA" in GSE-lab files.

## Opponent map (Week 2)

ARI–SEA · ATL–CAR · BAL–NO · CAR–ATL · CHI–MIN · CIN–HOU · CLE–TB · DAL–WAS · DEN–JAX · GB–NYJ · HOU–CIN · IND–KC · JAX–DEN · KC–IND · LAC–LV · LAR–NYG · LV–LAC · MIA–SF · MIN–CHI · NE–PIT · NO–BAL · NYG–LAR · NYJ–GB · PHI–TEN · PIT–NE · SEA–ARI · SF–MIA · TB–CLE · TEN–PHI · WAS–DAL
(Schedule confirmed 2026-09-19 via fantasypros.com/nfl/schedule.php?week=2.)

---

### 1. ARI — Arizona Cardinals (vs SEA offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.153 | +0.078 |
| Success allowed | 42.2% | 48.0% |
| Explosive allowed | 11.1% | 14.6% |
| 2025 INT diff (takeaways vs exp.) | — | -1.43 (mild positive regression) |

**DC/play-caller:** Nick Rallis retained as DC under new HC Mike LaFleur, Feb 13, 2026 (NBC Sports PFT / NFL Network; arizonasports.com). Rallis was the defensive play-caller 2023-25 "despite Jonathan Gannon's presence" and keeps full control of the defense under LaFleur (Yardbarker/SI, Feb 2026). Tendency: Gannon/Rallis multiple-front, split-safety, simulated-pressure system. The 2025 unit collapsed: 6th-most yards (357.7/gm) and 4th-most points (28.7/gm) allowed (arizonasports.com, Feb 2026), with the NFL's worst defense from Week 10 onward after the Mack Wilson Sr. injury (Fanrecap, 2026).
**Blitz/pressure/sack conversion:** Outside StatRankings Wk1 top-fives — not publicly verified.
**Verdict: LEAN-GOOD for SEA offense.** One good Wk1 does not erase a 2025 bottom-tier baseline under the same play-caller; the Super Bowl champion offense faces continuity of a scheme that already collapsed once.

### 2. ATL — Atlanta Falcons (vs CAR offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.311 | -0.026 |
| Success allowed | 32.2% | 43.8% |
| Explosive allowed | 11.9% | 12.4% |
| Passer rating vs zone (Wk1) | 85.6 (5th) | — |
| 2025 INT diff | — | +3.27 (negative regression risk) |

**DC/play-caller:** Jeff Ulbrich, DC under new HC Kevin Stefanski (2026; Ulbrich stayed while Rutenberg left for CLE — ESPN, Feb 17, 2026). Tendency: Saleh-tree single-high/match with an aggressive front — 2025 Falcons set a **franchise record 57 sacks** (Yardbarker, Feb 2026).
**Blitz/pressure/sack conversion:** Wk1 sack rate outside top five; the 2025 pass rush was elite by production.
**Verdict: BAD for CAR offense.** Ulbrich's front produced a franchise-record 57 sacks in 2025 and opened 2026 allowing -0.311 EPA/play. Slight discount on takeaways only: +3.27 INT luck suggests the turnover well runs drier.

### 3. BAL — Baltimore Ravens (vs NO offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.291 | +0.053 |
| Success allowed | 37.2% | 44.7% |
| Explosive allowed | 14.0% | 13.2% |
| Passer rating vs zone (Wk1) | 79.5 (3rd) | — |
| YPA vs zone (Wk1) | 4.3 (3rd) | — |
| 2025 INT diff | — | -2.98 (positive regression) |

**DC/play-caller:** DC Anthony Weaver hired Feb 3, 2026, but **HC Jesse Minter calls the plays** (BaltimoreRavens.com, 2026-02-03). Tendency: Minter's disguise-heavy, simulated-pressure, two-high-shell system (7th in 2025 defensive EPA/play at LAC per TruMedia, via Reuters Jan 2026).
**Verdict: BAD for NO offense.** The league's premier disguise play-caller now runs Baltimore directly; Wk1 zone coverage was elite (79.5 rating, 4.3 YPA allowed) and takeaway luck is due to improve.

### 4. CAR — Carolina Panthers (vs ATL offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.360 | +0.076 |
| Success allowed | 55.6% | 44.7% |
| Explosive allowed | 16.7% | 12.3% |
| Pressure rate (Wk1) | 45.0% (tied 3rd) | — |
| 2025 INT diff | — | +4.05 (negative regression risk) |

**DC/play-caller:** Ejiro Evero retained as 2026 DC and keeps the call sheet on Sundays (2026 league-meetings reporting). Tendency: Fangio-tree quarters/match, low-blitz — though Wk1 produced 45.0% pressure (tied 3rd), the back end still gave up +0.360 EPA/play. 2025 baseline was poor (27th points, 32nd yards, 32nd EPA per 2026 research).
**Verdict: GOOD for ATL offense.** The softest defensive profile in the slate on efficiency (55.6% success allowed Wk1) despite the pressure rate; a get-right spot even for a cold ATL offense. Expect fewer gifted takeaways than 2025.

### 5. CHI — Chicago Bears (vs MIN offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.088 | +0.015 |
| Success allowed | 46.7% | 46.1% |
| Explosive allowed | 15.6% | 13.8% |
| Man rate (Wk1) | 60.0% (2nd) | 41.4% |
| Perimeter FP/route allowed (Wk1) | 0.54 (4th) | — |
| YPRR allowed (Wk1) | 2.07 (5th) | — |
| 2025 INT diff | — | +7.22 (highest negative regression risk) |

**DC/play-caller:** Dennis Allen, 2026 under HC Ben Johnson (2026 research; 2025 unit was 10th in defensive EPA/play per TruMedia). Tendency: multiple-front, man-heavy — man rate jumped from 41.4% (2025) to 60.0% (Wk1 2026).
**Verdict: NEUTRAL for MIN offense.** The man-heavy jump is real, but the league's most extreme INT luck (+7.22) says the 2025 takeaway production was a mirage; no MIN offensive unit data available to resolve the man-vs-play-action clash.

### 6. CIN — Cincinnati Bengals (vs HOU offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.213 | +0.140 |
| Success allowed | 46.0% | 48.7% |
| Explosive allowed | 8.0% | 15.4% |
| Sack % (Wk1) | 11.1% (5th) | 5.7% |
| 2025 INT diff | — | +2.83 (negative regression risk) |

**DC/play-caller:** Al Golden, 2026 (first year; ex-Notre Dame DC). Tendency: pressure/match packages from the college game; Wk1 showed sack production (11.1%, 5th) but a leaky 46.0% success rate allowed.
**Verdict: LEAN-GOOD for HOU offense.** Cincinnati allows successful plays at a near-bottom rate even while producing sacks; a first-year install with a soft underbelly on early downs.

### 7. CLE — Cleveland Browns (vs TB offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.400 | -0.075 |
| Success allowed | 61.2% | 41.2% |
| Explosive allowed | 22.4% | 12.3% |
| Explosive reception rate allowed (Wk1) | 22.2% (5th) | 14.0% |
| Slot FP/route allowed (Wk1) | 1.48 (1st — worst) | — |
| YPRR allowed (Wk1) | 2.50 (2nd) | — |
| 2025 INT diff | — | -0.58 (neutral) |

**DC/play-caller:** Mike Rutenberg, hired Feb 17-20, 2026 under new HC Todd Monken, replacing Jim Schwartz (ESPN, 2026-02-17; Pro Football Rumors). First-time DC; Saleh-tree background (SF pass-game specialist 2020, NYJ LBs 2021-24, ATL pass-game coordinator 2025). Monken publicly promised no scheme change — "attacking style" retained (Sporting News, Feb 2026). 2025 baseline was elite (4th total defense, 283.6 yds/gm; fewest yards allowed over three seasons).
**Verdict: GOOD for TB offense — strongest in slate.** Wk1 was a full structural collapse (61.2% success, 22.4% explosive, worst slot coverage in the league) under a first-time play-caller in Week 2. The 2025 elite baseline is the only reason this isn't an auto-play; talent (Garrett, Ward, Schwesinger) can snap back, but nothing in Wk1 suggests it has yet.

### 8. DAL — Dallas Cowboys (vs WAS offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.397 | +0.179 |
| Success allowed | 62.1% | 49.2% |
| Explosive allowed | 15.5% | 16.2% |
| Man rate (Wk1) | 45.2% (5th) | 24.0% |
| 2025 INT diff | — | -4.62 (positive regression) |

**DC/play-caller:** Christian Parker, hired Jan 22-23, 2026 from Philadelphia (secondary coach + passing-game coordinator 2024-25 under Vic Fangio), replacing fired Matt Eberflus under HC Brian Schottenheimer (Pro Football Rumors / ESPN, Jan 2026). First-time DC, age 34; Fangio-tree coverage structure. Inherits the 2025 league-worst scoring defense (30.1 pts/gm, 32nd; 7-9-1 record).
**Verdict: GOOD for WAS offense.** A Week-2 install of a new system on a roster that was dead last in points allowed; Wk1 (62.1% success allowed) shows the scheme hasn't taken yet.

### 9. DEN — Denver Broncos (vs JAX offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.118 | -0.080 |
| Success allowed | 38.0% | 37.2% |
| Explosive allowed | 10.0% | 8.6% |
| Man rate (Wk1) | 58.6% (3rd) | 44.3% |
| Blitz rate (Wk1) | 45.5% (5th) | 32.5% |
| Pressure over expected (Wk1) | +20.4 (1st) | +3.8 |
| Passer rating vs zone (Wk1) | 78.1 (2nd) | 81.2 |
| YPA vs zone (Wk1) | 3.3 (1st) | 5.5 |
| 2025 INT diff | — | -3.85 (positive regression) |

**DC/play-caller:** Vance Joseph, retained 2026 (2026 research; 2025 unit was 3rd in EPA/play per 2026 reporting, 8.6% explosive allowed — elite). Tendency: man/pressure, simulated looks; Wk1 doubled down (blitz 45.5%, pressure OE +20.4, best in league).
**Verdict: NEUTRAL for JAX offense — genuine strength-on-strength.** Denver's simulated pressure is purpose-built to break dropback efficiency, and the Wk1 zone numbers (3.3 YPA, 78.1 rating) are elite. But JAX's offense just posted +0.400 EPA/play and +0.793/dropback. This is the week's best scheme-vs-form test; neither side has an edge on paper.

### 10. GB — Green Bay Packers (vs NYJ offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.047 | +0.050 |
| Success allowed | 36.4% | 45.0% |
| Explosive allowed | 7.3% | 10.8% |
| Blitz rate (Wk1) | 48.4% (2nd) | 26.3% |
| Opponent explosive-play rate (Wk1) | 3.4% (3rd) | — |
| Passer rating vs zone (Wk1) | 80.2 (4th) | 92.3 |
| YPA vs zone (Wk1) | 4.8 (5th) | 6.0 |
| 2025 INT diff | — | -5.00 (positive regression) |

**DC/play-caller:** Jonathan Gannon, hired 2026 (ex-ARI HC). **Consensus contradiction:** Gannon's career identity is split-safety/match-zone, quarters, four-man rush with minimal blitzing (Last Word on Sports / CheeseheadTV, Feb 2026) — but Wk1 Green Bay blitzed **48.4%, second-highest in the league** (StatRankings, recorded 2026-09-18), nearly double his 2025 rate of 26.3%. Either a new aggressive identity or a one-game game plan; treat as unresolved.
**Verdict: LEAN-GOOD for NYJ offense.** If the 48% blitz is real, it's exploitable by hot reads and screens against a Jets offense that was efficient in Wk1 (+0.271 EPA/play, 56% success); if it reverts to Gannon's sound quarters shell, this flips to neutral. GB's takeaway luck (-5.00) is also due to improve, which caps the upside.

### 11. HOU — Houston Texans (vs CIN offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.229 | -0.110 |
| Success allowed | 40.4% | 38.6% |
| Explosive allowed | 25.0% | 11.7% |
| Explosive reception rate allowed (Wk1) | 25.0% (tied 3rd) | 14.7% |
| Perimeter FP/route allowed (Wk1) | 0.69 (1st — worst) | — |
| YPRR allowed (Wk1) | 2.44 (3rd) | — |
| 2025 INT diff | — | +4.27 (negative regression risk) |

**DC/play-caller:** Matt Burke, promoted 2026 (continuity after DeMeco Ryans's departure). Tendency: man-heavy (2nd in man rate 2025 per 2026 research), attacking fronts.
**Verdict: LEAN-BAD for CIN offense.** Wk1 (+0.229 EPA/play allowed, 25% explosive) looks like noise against a 2025 top-tier baseline (-0.110) with scheme continuity; the man-heavy structure is the slate's most proven coverage identity. Discount takeaway expectations (+4.27 INT luck).

### 12. IND — Indianapolis Colts (vs KC offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.234 | +0.019 |
| Success allowed | 42.2% | 46.4% |
| Explosive allowed | 24.4% | 14.4% |
| Man rate (Wk1) | 66.7% (1st) | 36.0% |
| Slot FP/route allowed (Wk1) | 0.74 (3rd) | — |
| YPRR allowed (Wk1) | 2.75 (1st — worst) | — |
| 2025 INT diff | — | +0.91 (neutral) |

**DC/play-caller:** Lou Anarumo, 2026 (ex-CIN DC). Tendency: heavy man/match — man rate nearly doubled from 36.0% (2025) to a league-high 66.7% (Wk1 2026).
**Verdict: GOOD for KC offense.** The league's most man-heavy defense is also its most torched: worst YPRR allowed (2.75), 3rd-worst slot coverage, 24.4% explosive rate. Reid/Mahomes against a man scheme that can't hold up is a structural mismatch.

### 13. JAX — Jacksonville Jaguars (vs DEN offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.493 | -0.091 |
| Success allowed | 37.5% | 41.8% |
| Explosive allowed | 3.1% | 10.4% |
| Pressure rate (Wk1) | 53.1% (2nd) | 27.9% |
| Sack % (Wk1) | 16.7% (1st) | 4.5% |
| 2025 INT diff | — | +5.04 (negative regression risk) |

**DC/play-caller:** Anthony Campanile, 2026. Tendency: aggressive pressure fronts — Wk1 was the slate's most disruptive defense (53.1% pressure, 16.7% sacks, 3.1% explosive allowed).
**Verdict: BAD for DEN offense — among the slate's worst.** The coldest offense in the slate (-0.261 EPA/play Wk1) meets the hottest defensive front. Only caveat: JAX's 2025 takeaway luck (+5.04) was the league's third-most inflated, so don't bank on interceptions repeating — the pressure itself is the thesis.

### 14. KC — Kansas City Chiefs (vs IND offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.261 | -0.005 |
| Success allowed | 37.8% | 44.1% |
| Explosive allowed | 5.4% | 11.1% |
| Pressure rate (Wk1) | 54.3% (1st) | 33.6% |
| Pressure over expected (Wk1) | +18.2 (4th) | +4.8 |
| Sack % (Wk1) | 12.1% (4th) | 6.0% |
| Opponent explosive-play rate (Wk1) | 2.2% (2nd) | — |
| 2025 INT diff | — | -1.10 (mild positive regression) |

**DC/play-caller:** Steve Spagnuolo, retained 2026 under HC Andy Reid. Tendency: the league's premier blitz-game designer; Wk1 was peak Spagnuolo (54.3% pressure, 1st).
**Verdict: BAD for IND offense — among the slate's worst.** A -0.291 EPA/play offense against the week's best pressure unit (54.3%) with elite explosive suppression (2.2%). Spagnuolo feasts on offenses that can't threaten downfield.

### 15. LAC — Los Angeles Chargers (vs LV offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.203 | -0.072 |
| Success allowed | 51.6% | 41.0% |
| Explosive allowed | 9.4% | 12.1% |
| 2025 INT diff | — | +7.11 (2nd-highest negative regression risk) |

**DC/play-caller:** Chris O'Leary, hired Jan 29, 2026 (Reuters; NBC Sports PFT), age 34, promoted from Western Michigan DC; was LAC safeties coach under Jesse Minter in 2024. Mandate is continuity with Minter's disguise-heavy, safety-driven structure under HC Jim Harbaugh.
**Verdict: LEAN-GOOD for LV offense.** The 2025 defensive standing was propped up by the league's second-most inflated takeaway luck (+7.11); Wk1 (+0.203 EPA/play, 51.6% success allowed) already shows the regression. A first-time NFL play-caller running a complex disguise system is a Week-2 fade.

### 16. LAR — Los Angeles Rams (vs NYG offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.262 | -0.061 |
| Success allowed | 61.8% | 41.9% |
| Explosive allowed | 12.7% | 10.7% |
| Zone rate (Wk1) | 85.3% (3rd) | 74.5% |
| Slot FP/route allowed (Wk1) | 0.94 (2nd — worst) | — |
| 2025 INT diff | — | +2.66 (negative regression risk) |

**DC/play-caller:** Chris Shula, retained 2026 under HC Sean McVay. Tendency: zone-heavy (85.3% Wk1, up from 74.5%), Fangio-influenced match quarters.
**Verdict: GOOD for NYG offense.** A zone shell allowing 61.8% success and the league's second-worst slot coverage meets the slate's hottest passing offense (+0.397 EPA/play, +0.677/dropback). The slot is the attack point.

### 17. LV — Las Vegas Raiders (vs LAC offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.085 | +0.040 |
| Success allowed | 39.5% | 45.1% |
| Explosive allowed | 10.5% | 12.4% |
| Zone rate (Wk1) | 84.4% (4th) | 79.5% |
| Sack % (Wk1) | 13.5% (3rd) | 6.2% |
| Explosive reception rate allowed (Wk1) | 33.3% (tied 1st) | 10.3% |
| 2025 INT diff | — | -1.61 (mild positive regression) |

**DC/play-caller:** Rob Leonard, promoted Feb 14-16, 2026 under new HC Klint Kubiak (Reuters; Raiders official announcement). First-time DC, ex-DL/run-game coordinator, close with Maxx Crosby (Field Level Media, Feb 2026). Publicly preaches multiplicity and matchup-based calls (Yardbarker, Jun 2026).
**Verdict: NEUTRAL for LAC offense.** Solid efficiency (39.5% success allowed) and real sack production (13.5%) conflict with a small-sample 33.3% explosive-reception rate — one of those is lying, and one game can't say which. First-time play-caller adds variance both ways.

### 18. MIA — Miami Dolphins (vs SF offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.198 | +0.087 |
| Success allowed | 51.0% | 49.4% |
| Explosive allowed | 11.8% | 14.0% |
| 2025 INT diff | — | -1.46 (mild positive regression) |

**DC/play-caller:** DC Sean Duggan hired Feb 2, 2026 (ex-GB LBs), but **HC Jeff Hafley calls the plays** (ESPN, 2026-02-02; Hafley hired Jan 31, 2026). Tendency: Hafley's Saleh-tree single-high system (GB 2024-25). 2025 MIA baseline was poor (22nd yards, 25th defensive EPA per ESPN, Feb 2026).
**Verdict: LEAN-GOOD for SF offense.** A new play-caller installing his system in Week 2 on a roster that was bottom-third defensively in 2025; SF's offense was efficient in Wk1 (+0.262 EPA/play, 61.8% success). Hafley's experience tempers this from a full GOOD.

### 19. MIN — Minnesota Vikings (vs CHI offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.162 | -0.095 |
| Success allowed | 37.5% | 41.5% |
| Explosive allowed | 14.3% | 11.8% |
| Blitz rate (Wk1) | 80.4% (1st) | 54.0% |
| Pressure over expected (Wk1) | +18.3 (3rd) | +5.6 |
| Passer rating vs man (Wk1) | 88.7 (5th) | 96.6 |
| YPA vs man (Wk1) | 2.6 (5th) | 5.8 |
| Explosive reception rate allowed (Wk1) | 33.3% (tied 1st) | 11.5% |
| 2025 INT diff | — | -0.92 (neutral) |

**DC/play-caller:** Brian Flores, retained 2026 under HC Kevin O'Connell. **In-game adjustment note (Vikings Wire, 2026-09-16):** Flores blitzed 15 of 18 first-half snaps (83%), but Green Bay repeatedly beat the pressure, so he cut the blitz to 63% after halftime. The headline 80.4% (StatRankings, recorded 2026-09-18) obscures a defense that got solved mid-game. (A second public source cited 71.7/82.1% — definitions vary; the adjustment direction is consistent.)
**Verdict: GOOD for CHI offense.** The week's hottest offense (+0.360 EPA/play, +0.483/dropback, 55.6% success) faces a blitz that the last opponent demonstrably solved in-game — and when the blitz doesn't land, MIN gives up explosives at the league's worst rate (33.3%). If Flores stays aggressive, Chicago's offense gets one-on-ones; if he backs off, the pressure identity that makes this defense special is gone.

### 20. NE — New England Patriots (vs PIT offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.066 | -0.047 |
| Success allowed | 40.4% | 45.2% |
| Explosive allowed | 10.6% | 12.7% |
| Blitz rate (Wk1) | 48.1% (3rd) | 29.8% |
| Perimeter FP/route allowed (Wk1) | 0.58 (3rd) | — |
| 2025 INT diff | — | -0.26 (neutral) |

**DC/play-caller:** Zak Kuhr, promoted to full-time DC Feb 2026 after serving as interim play-caller in 2025 (PatriotsWire/USA Today, 2026-02-26). Vrabel/Williams lineage: run discipline first, then pass-rush freedom. 2025 baseline was championship-caliber: 4th in points allowed (320), 8th in yards, Super Bowl LX berth (lost to SEA 29-13).
**Verdict: BAD for PIT offense.** The slate's coldest offense (-0.311 EPA/play) against a unit one season removed from a Super Bowl run. Wk1 blitz rate (48.1%) is high for this lineage — if it's a real schematic shift under Kuhr, it's bad news for a struggling offense, not good.

### 21. NO — New Orleans Saints (vs BAL offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | ~0.000 | -0.026 |
| Success allowed | 45.2% | 43.3% |
| Explosive allowed | 13.7% | 11.5% |
| Passer rating vs man (Wk1) | 85.4 (3rd) | 96.4 |
| YPA vs man (Wk1) | 1.5 (3rd) | 5.4 |
| 2025 INT diff | — | -1.67 (positive regression) |

**DC/play-caller:** Brandon Staley, 2026. Tendency: two-high, match-quarters, historically low blitz. Wk1 man coverage was elite (1.5 YPA, 3rd).
**Verdict: NEUTRAL for BAL offense.** Staley's man coverage was genuinely suffocating in Wk1, but the overall profile is perfectly average and no BAL offensive unit data is available to test the matchup. No edge either way on scheme.

### 22. NYG — New York Giants (vs LAR offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.177 | +0.089 |
| Success allowed | 47.7% | 46.8% |
| Explosive allowed | 4.5% | 15.4% |
| Man rate (Wk1) | 52.9% (4th) | 39.9% |
| Opponent explosive-play rate (Wk1) | 1.9% (1st) | — |
| 2025 INT diff | — | -2.64 (positive regression) |

**DC/play-caller:** Dennard Wilson, DC under new HC John Harbaugh (Giants.com staff announcement, 2026). Wilson was TEN DC 2024-25; the 2024 Titans were 2nd in yards allowed. Tendency: press-man/quarters from a DB-coach background; man rate up to 52.9% (4th) in Wk1.
**Verdict: LEAN-BAD for LAR offense.** The league's best explosive-play suppression (1.9%) with a press-man identity and takeaway luck due to improve (-2.64). Efficiency allowed (+0.177 EPA/play) is the crack, but this defense is built to take away exactly what fuels fantasy production — explosives.

### 23. NYJ — New York Jets (vs GB offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.264 | +0.166 |
| Success allowed | 40.6% | 46.6% |
| Explosive allowed | 3.1% | 14.8% |
| Passer rating vs man (Wk1) | 79.2 (tied 1st) | 111.5 |
| YPA vs man (Wk1) | 2.3 (4th) | 7.2 |
| YPA vs zone (Wk1) | 4.4 (4th) | 7.0 |
| Opponent explosive-play rate (Wk1) | 4.1% (4th) | — |
| 2025 INT diff | — | -10.08 (highest positive regression in data) |

**DC/play-caller:** DC Brian Duker hired Jan 29, 2026, but **HC Aaron Glenn is expected to call the plays** (ESPN, 2026-01-29; Duker coached under Glenn in Detroit). Tendency: Glenn's man/pressure system. The Wk1 turnaround from 2025's disaster (+0.166 EPA/play allowed) to -0.264 is the slate's biggest defensive swing.
**Verdict: BAD for GB offense.** Lockdown man coverage (79.2 rating, 2.3 YPA) with the most extreme positive takeaway regression in the dataset (-10.08) — this defense is due to start catching interceptions. Glenn calling plays directly raises the floor.

### 24. PHI — Philadelphia Eagles (vs TEN offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.060 | -0.096 |
| Success allowed | 42.6% | 41.4% |
| Explosive allowed | 10.3% | 11.0% |
| Pressure rate (Wk1) | 45.0% (tied 3rd) | 33.1% |
| Pressure over expected (Wk1) | +19.0 (2nd) | +2.5 |
| YPA vs zone (Wk1) | 4.2 (2nd) | 6.5 |
| Passer rating vs man (Wk1) | 86.1 (4th) | 74.6 |
| 2025 INT diff | — | +0.71 (neutral) |

**DC/play-caller:** Vic Fangio, retained 2026 under HC Nick Sirianni. Tendency: the Fangio two-high/match-quarters system; Wk1 pressure production (+19.0 OE, 2nd) came without blitz volume — the classic Fangio four-man win.
**Verdict: BAD for TEN offense.** A -0.264 EPA/play offense against a front generating top-3 pressure over expected with elite zone coverage behind it (4.2 YPA vs zone). Fangio's structure is specifically designed to strangle limited passing games.

### 25. PIT — Pittsburgh Steelers (vs NE offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.321 | +0.008 |
| Success allowed | 38.6% | 42.6% |
| Explosive allowed | 12.3% | 13.6% |
| Zone rate (Wk1) | 96.2% (1st) | 64.0% |
| Blitz rate (Wk1) | 10.5% (league low) | — |
| Sack % (Wk1) | 15.4% (2nd) | 7.0% |
| Passer rating vs zone (Wk1) | 75.3 (1st) | 95.6 |
| YPA vs man (Wk1) | 0.0 (1st — tiny sample) | 6.3 |
| Explosive reception rate allowed (Wk1) | 25.0% (tied 3rd) | 13.4% |
| 2025 INT diff | — | +3.23 (negative regression risk) |

**DC/play-caller:** Patrick Graham, 2026. **Consensus contradiction:** Graham's reputation is aggression and man coverage, but Wk1 was the league's lowest blitz rate (10.5%) and 96.2% zone (Steel Curtain Network / Steelers Depot, 2026-09-14). The mechanism: four-man pressure plus disguise generated four sacks and two INTs without blitz volume — a philosophical inversion, not a softening.
**Verdict: LEAN-BAD for NE offense.** Elite efficiency (-0.321 EPA/play allowed) and the league's best zone pass defense (75.3 rating) with real four-man pressure. The 25.0% explosive-reception rate is the crack — if NE can protect long enough to test deep zones, there's a path. Takeaway luck (+3.23) says don't count on picks repeating.

### 26. SEA — Seattle Seahawks (vs ARI offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.110 | -0.112 |
| Success allowed | 41.8% | 40.3% |
| Explosive allowed | 6.0% | 8.9% |
| Zone rate (Wk1) | 86.1% (2nd) | 71.4% |
| Passer rating vs man (Wk1) | 79.2 (tied 1st) | 87.0 |
| YPA vs man (Wk1) | 0.4 (2nd) | 4.0 |
| Opponent explosive-play rate (Wk1) | 4.5% (5th) | — |
| 2025 INT diff | — | +1.86 (mild negative regression) |

**DC/play-caller:** Aden Durde (3rd year), HC Mike Macdonald. Defending Super Bowl LX champions (29-13 over NE); 2025 allowed a league-best 17.2 pts/gm (ESPN, 2026-02-09). Tendency: Macdonald's simulated-pressure, matchup-zone system with man answers (0.4 YPA vs man Wk1).
**Verdict: BAD for ARI offense.** The championship defense with top-5 explosive suppression and elite man coverage. No schematic path is visible for an average offense.

### 27. SF — San Francisco 49ers (vs MIA offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | -0.079 | +0.082 |
| Success allowed | 47.2% | 48.8% |
| Explosive allowed | 13.9% | 12.3% |
| 2025 INT diff | — | -5.28 (positive regression) |

**DC/play-caller:** Raheem Morris, hired Feb 1, 2026 (USA Today, 2026-02-01). **Stale-assumption flag:** the traditional "49ers four-down, quarters, low-blitz" identity is outdated — summer reporting describes five-man fronts, changing shells and real multiplicity (NY Post, 2026-07-28). Note Gus Bradley was the 2025 SF assistant HC of defense under Saleh; Bradley was considered for this job before Morris got it (SI, Feb 2026).
**Verdict: NEUTRAL for MIA offense.** A new multiple scheme with a leaky Wk1 success rate (47.2%) but genuine takeaway upside (-5.28 INT luck). One game into a new system, the signals point both ways — no schematic edge to claim.

### 28. TB — Tampa Bay Buccaneers (vs CLE offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.005 | +0.031 |
| Success allowed | 47.1% | 45.7% |
| Explosive allowed | 17.6% | 13.7% |
| Blitz rate (Wk1) | 45.9% (4th) | 39.3% |
| 2025 INT diff | — | +2.04 (negative regression risk) |

**DC/play-caller:** Todd Bowles, retained 2026. Tendency: the league's most consistent blitz architect — 45.9% Wk1 (4th), up from an already-high 39.3% in 2025.
**Verdict: BAD for CLE offense — among the slate's worst.** The slate's coldest offense (-0.493 EPA/play) against a top-5 blitz unit. Bowles's pressure packages are specifically designed to break offenses that can't protect or adjust; nothing in Cleveland's Wk1 suggests it can do either.

### 29. TEN — Tennessee Titans (vs PHI offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.271 | +0.141 |
| Success allowed | 56.0% | 47.1% |
| Explosive allowed | 14.0% | 14.4% |
| 2025 INT diff | — | -4.99 (positive regression) |

**DC/play-caller:** DC Gus Bradley hired Feb 2-4, 2026 (TennesseeTitans.com official), reuniting with **HC Robert Saleh — who calls the defensive plays** (Jordan Schultz via Yardbarker/ClutchPoints, Feb 2026). Scheme is Saleh's wide-9, single-high, attacking-front system with Bradley as senior implementer. Wk1 was poor (+0.271 EPA/play, 56.0% success allowed) — execution lagging scheme in Week 1 of a new regime.
**Verdict: LEAN-GOOD for PHI offense.** A new play-caller's unit that was bad in every efficiency measure in Wk1. The -4.99 INT luck is the one thing working in TEN's favor — takeaways are due — which keeps this from a full GOOD.

### 30. WAS — Washington Commanders (vs DAL offense)

| Metric | Wk1 2026 | 2025 |
|---|---|---|
| Off. EPA/play allowed | +0.071 | +0.149 |
| Success allowed | 35.3% | 48.8% |
| Explosive allowed | 11.8% | 14.7% |
| Zone rate (Wk1) | 82.1% (5th) | 69.2% |
| Pressure rate (Wk1) | 44.1% (5th) | 31.3% |
| Pressure over expected (Wk1) | +14.0 (5th) | -2.5 |
| 2025 INT diff | — | -2.32 (positive regression) |

**DC/play-caller:** Daronte Jones, 2026, under HC Dan Quinn. **Do not label this "Dan Quinn's scheme":** Quinn publicly gave Jones full scheme control, and Jones installed a Flores-derived disguise/exotic-pressure system (Commanders Wire, 2026-09-12 and 2026-09-13). Wk1 validated the concept: 35.3% success allowed with top-5 pressure.
**Verdict: NEUTRAL for DAL offense.** The new disguise system worked in Wk1 (35.3% success allowed is genuinely good), but it's one game of a first-time play-caller's scheme and the EPA profile (+0.071) is only average. No DAL offensive unit data to test the other side. Revisit after Week 2.

---

## Five best schematic matchups (for the opposing offense)

1. **TB offense vs CLE** — CLE allowed +0.400 EPA/play, 61.2% success, 22.4% explosive in Wk1 with the league's worst slot coverage (1.48 FP/route) under a first-time DC in Week 2.
2. **ATL offense vs CAR** — CAR allowed +0.360 EPA/play and 55.6% success in Wk1; the 2025 baseline was 32nd in EPA. A get-right spot regardless of ATL's cold Wk1.
3. **WAS offense vs DAL** — DAL allowed +0.397 EPA/play and 62.1% success in Wk1; a Week-2 Fangio-system install on the 2025 league-worst scoring defense.
4. **NYG offense vs LAR** — LAR allowed +0.262 EPA/play and 61.8% success with 0.94 slot FP/route allowed; NYG's offense posted +0.397 EPA/play and +0.677/dropback in Wk1.
5. **CHI offense vs MIN** — CHI's offense (+0.360 EPA/play, +0.483/dropback) faces an 80.4% blitz that Green Bay demonstrably solved in-game (cut to 63% after halftime); when the blitz misses, MIN allows explosives at the league's worst rate (33.3%).

## Five worst schematic matchups (for the opposing offense)

1. **DEN offense vs JAX** — JAX allowed -0.493 EPA/play with 53.1% pressure and a 16.7% sack rate in Wk1; DEN's offense posted -0.261 EPA/play.
2. **IND offense vs KC** — KC generated 54.3% pressure (1st) with a 2.2% opponent explosive rate; IND's offense posted -0.291 EPA/play.
3. **CLE offense vs TB** — The slate's coldest offense (-0.493 EPA/play) against Bowles's 45.9% blitz (4th).
4. **TEN offense vs PHI** — A -0.264 EPA/play offense against +19.0 pressure-over-expected (2nd) with elite zone coverage (4.2 YPA) behind it.
5. **PIT offense vs NE** — A -0.311 EPA/play offense against a unit one season removed from 4th in points allowed and a Super Bowl berth, now blitzing at 48.1% under Kuhr.

## DC tendencies that contradict consensus

- **PIT (Patrick Graham):** reputation says aggressive man-blitzer; Wk1 was the league's lowest blitz rate (10.5%) and 96.2% zone. The pressure came from four-man rush plus disguise (Steel Curtain Network / Steelers Depot, 2026-09-14).
- **GB (Jonathan Gannon):** career split-safety/quarters/low-blitz identity; Wk1 blitzed 48.4% (2nd in NFL) vs 26.3% in 2025 (StatRankings, recorded 2026-09-18).
- **MIN (Brian Flores):** the 80%+ blitz headline hides the in-game adjustment — GB beat the 83% first-half blitz and Flores cut it to 63% after halftime (Vikings Wire, 2026-09-16).
- **WAS (Daronte Jones):** not "Dan Quinn's defense" — Quinn ceded full scheme control; Jones runs a Flores-derived disguise/exotic-pressure system (Commanders Wire, 2026-09-12/13).
- **NYJ / BAL / MIA / TEN:** the named DC is not the play-caller — Aaron Glenn (NYJ), Jesse Minter (BAL), Jeff Hafley (MIA), and Robert Saleh (TEN) call the plays (ESPN 2026-01-29; BaltimoreRavens.com 2026-02-03; ESPN 2026-02-02; Yardbarker/ClutchPoints Feb 2026).
- **SF (Raheem Morris):** the "four-down quarters low-blitz 49ers" assumption is stale — 2026 uses five-man fronts and changing shells (NY Post, 2026-07-28).
- **CLE (Mike Rutenberg):** first-time DC, but Monken promised no scheme change from Schwartz's attacking system (Sporting News, Feb 2026) — treat as continuity of structure with a new play-caller, not a new scheme.
- **LAC (Chris O'Leary):** first-time NFL play-caller explicitly charged with continuing Minter's disguise-heavy structure (Reuters, 2026-01-29) — but the 2025 results were inflated by +7.11 INT luck, the league's second-most.
