# Content Ideas & Football Signals Consolidation (Nov 7–9, 2026)

**Filing Path:** `docs/predictions/research/2026-11-09/CONTENT-IDEAS-AND-SIGNALS-2026-11-07-to-09.md`  
**Sources:** `INTEL-LOOP-Q52-Q54-CONSOLIDATED-2026-11-09.md` (`IDEAS-20261107.md` [19 briefs] + `IDEAS-20261108.md` [14 briefs]) & `RESEARCH-CONSOLIDATION-2026-11-07-to-09.md` (Lanes 1–5)  
**Engine Wiring:** `intelligence/metrics/intel_loop_q52_q54_and_research_consolidation_2026_11_09.py` & `packages/prediction-engine/src/expected-metrics/` (`Q52`, `Q53`, `Q54`)

---

## 1. Executive Synthesis — MNF `BUF @ MIN` & Engine Signal Spine (Nov 7–9)

Across the Nov 7–9 X/IG/GitHub/Books sweeps and Intel Build Loop runs 66–69, six high-leverage football signals directly condition tonight's Monday Night Football matchup (`Buffalo Bills @ Minnesota Vikings`, U.S. Bank Stadium, `Josh Allen` vs `Carson Wentz`):

| Signal ID | Matchup / Unit | Measured Metric & Value | Source / Sweep Lane | Engine Integration & MNF Impact |
|---|---|---|---|---|
| **SIG-MNF-01** | `BUF` Offense (`Joe Brady`) vs `MIN` Defense (`Brian Flores`) | **Playcaller EPA/Play Above WAR-Expected:** `Joe Brady +0.07` (#1 NFL OC) vs `Brian Flores -0.11` (#1 NFL DC, lowest EPA allowed vs WAR expectation) | `@run_the_sims` / `@SamHoppen` (`all_playcallers.csv`, Nov 7 PM W6 & Nov 8 PM W1) | Best-on-best coaching clash neutralizes main-line side edge (`PASS` at `BUF -4.5`, `58/100`) while compressing play-by-play variance into multi-man skill rotations. |
| **SIG-MNF-02** | `MIN` Defense | **Series Conversion Rate Allowed:** **`62.4%` (#1 in NFL)**, ahead of `TB` (`64.3%`, #2) | `@Timo_NFL` (`nflfastR` reference implementation, Nov 9 AM W3) | Forces `BUF` into longer 3rd-down series and caps individual receiver ceiling (`Dalton Kincaid UNDER 57.5 Rec Yds`, `DJ Moore UNDER 52.5 Rec Yds`, `Khalil Shakir UNDER 49.5 Rec Yds`). |
| **SIG-MNF-03** | `BUF` Offense / Special Teams | **Average Drive Start:** **`34.79`-yard line (#1 in NFL across all 32 teams)** | `@sfdata9ers` (`Fantasy Points Data`, Nov 7 PM `IDEAS-20261107.md` #13) | Shortens the field for `BUF` scoring drives (`23.75` implied pts) while reducing total available offensive yardage per drive (reinforcing `James Cook UNDER 100.5 Rush Yds` & receiver Under portfolio). |
| **SIG-MNF-04** | `BUF` RB `James Cook` | **Rushing Yards Over Expected per Attempt (`RYOE/att`):** **`+0.99` yds/att (#3 in NFL, min. 50 carries)** behind `Jaylen Warren` (`+1.54`) and `Kenneth Walker III` (`+1.41`) | `@FantasyPtsData` (Nov 7 PM `IDEAS-20261107.md` #9) | Confirms `Cook` per-carry efficiency (`4.06` YPC on `15.6` conserved carries = `63.3` rush yds), while Law 1 team rushing conservation (`113.3` total yds split with `Josh Allen 27.2`, `Ray Davis 12.1`, `Ty Johnson 10.7`) makes the inflated `100.5` book line our #1 prop (`78/100`). |
| **SIG-MNF-05** | `BUF` K `Tyler Bass` | **Indoor / Dome Field Goal Conversion Split:** **`95.5%` (`21/22`) in domes** vs `84.6%` (`126/149`) outdoors since 2020 (NFL dome avg `85.4%` vs `84.4%` outdoor across `11,593` kicks) | `@MagicSportsGuy` (`Splits+`, Nov 8 PM `IDEAS-20261108.md` #2) | Playing indoors at U.S. Bank Stadium boosts `BUF` stalled-drive FG conversion expectation when stopped by Minnesota's #1 series-conversion defense (`Q52` red-zone vs open-field split). |
| **SIG-MNF-06** | `BUF @ MIN` External Sim Foil | **External 1,000-Sim Foil (`@the_waldman`):** `BUF 27.2 – MIN 22.0` (`49.2` total, `BUF -5.2`, `64.2%` win prob vs `63.6%` Vegas) | `@the_waldman` (Nov 9 AM F10) | Unconditioned baseline simulation over-projects total points (`49.2`) by ignoring `Carson Wentz` backup-QB efficiency drop vs top-10 defenses (`Q53`) and `MIN` `62.4%` series conversion defense; GSE conserved total is `44.5` (`23.75 - 20.75`). |

---

## 2. Intel Build Loop Expected-Metrics Additions (`Q52`, `Q53`, `Q54`)

1. **`Q52` — Defensive Field-Zone Split (`packages/prediction-engine/src/expected-metrics/defensive-field-zone-split.ts`)**:
   - **Origin:** `@suuma810` / `FourthDown` (Nov 7 AM, ID `2119051742780256477`, `nflfastR + FTN`): Seattle defense ranks 1st DVOA / 2nd success rate / 3rd EPA/play between the 20s (`yardline_100 > 20`) vs 32nd in all three inside the red zone (`yardline_100 <= 20`), allowing TDs on 15 of 17 RZ trips (`88%` vs `60%` NFL avg; historical 2006–present cohort regresses `71% -> 55%` rest-of-season).
   - **Engine Definition:** Per-defense (`defteam`) own EPA/play allowed (`attachOwnEpa`) and `isSuccessfulPlay` success rate allowed split by `yardline_100 <= 20` (red zone) vs `yardline_100 > 20` (open field), plus `redZoneTdRateAllowed` (`touchdown === 1 && turnover === 0` per RZ scrimmage play, excluding pick-sixes), `epaSplit = RZ - openField`, and `successSplit = RZ - openField` across PIT windows (`season-to-date`, `last-4`, `last-8`, `week < targetWeek`) with floors `RZ plays >= 30`, `openField plays >= 100`, `RZ epaPlays >= 30`.
2. **`Q53` — QB Efficiency Split by Point-in-Time Opponent Defensive Tier (`packages/prediction-engine/src/expected-metrics/qb-opponent-tier-efficiency-split.ts`)**:
   - **Origin:** `@ScottBarrettDFB` / `@FantasyPtsData` (Nov 7, ID `2118732388620701738`, `barrett-maye-vs-top10-defenses-2026.csv`): Drake Maye posts `-0.12` EPA/dropback vs top-10 defenses vs `+0.30` against the rest (`-0.42` delta, largest drop of 26 QBs).
   - **Engine Definition:** Point-in-time `defteam` ranking entering play's own week `W` by prior-weeks defensive own EPA/dropback allowed across defenses with `>= 100` prior ratable dropbacks faced; ordinal `TOP-10` (ranks 1–10, tie-break EPA ascending then `defteam` ascending) vs `REST` (ranks 11+ among ranked defenses; Week 1 unclassified); Empirical Bayes shrinkage `shrunk = leagueTierMean + (n / (n + 20)) * (raw - leagueTierMean)`; `sensitivityDelta = shrunk(TOP-10) - shrunk(REST)` with arm floor `>= 30` ratable dropbacks.
3. **`Q54` — QB Post-First-Interception Efficiency Split (`packages/prediction-engine/src/expected-metrics/qb-post-first-int-efficiency-split.ts`)**:
   - **Origin:** `@sfdata9ers` (Nov 7 ID `2119145611366986195` & Nov 8 methodology reply ID `2119370715019284527`, `Fantasy Points Data`): QB EPA/play strictly before vs strictly after his first interception in a game (`>= 25` plays in each arm across games, INT play itself and INT-less games excluded).
   - **Engine Definition:** Per `(game_id, passer_player_id)` ordered by `play_id`, locates the QB's own first interception dropback (`interception === 1`), assigns prior dropbacks to `beforeFirstInt` and subsequent dropbacks (including any 2nd+ INTs) to `afterFirstInt`, excludes the boundary INT play itself and INT-less games, applies `n / (n + 20)` shrinkage toward the window's league arm mean with aggregate floor `>= 25` ratable dropbacks in both arms, and emits `postIntTiltDelta = shrunk(after) - shrunk(before)`.

---

## 3. Complete 33 Content Briefs (`IDEAS-20261107.md` [19] + `IDEAS-20261108.md` [14])

> **Publishing Gate Note:** All 33 content briefs below are reproduced verbatim from the Intel Loop draft queue (`IDEAS-20261107.md` and `IDEAS-20261108.md`). Per standing doctrine, public posts never leak paid picks or internal math jargon.

### 3.1 `IDEAS-20261107.md` — 19 Briefs from the Nov 7 Sweep (PM Run 66)

1. **Help is not production:** the QB Supporting Cast Score separates what surrounds a QB from what he does — San Francisco's cast tops the 32 at 72.9, the Chargers' is last at 20.3, and the weights are printed on the chart (Route Win Rate 0.25, Pressure Over Expected 0.20, Quick Pressure 0.15) (data: Fantasy Points Data) (`@sfdata9ers`).
2. **Pass protection as value, not vibes:** wPP prices an offensive lineman's pass pro in EPA above expectation — Amarius Mims leads tackles at +1.68, Tate Ratledge leads the interior at +0.90, Weeks 1–8, min. 141 snaps (charting: SumerSports) (`@realjoespinosa7`).
3. **The riser is a coordinator, not a player:** Frank Reich's PCVR jumped 39.0 to 58.6, rank 25 to 14, the biggest move on the board — and his own 90% range still spans rank 3 to 23 (PCVR 2.0; data: nflverse + FTN) (`@connor_long15`).
4. **Two defenses wearing one jersey:** Seattle is 1st in DVOA, 2nd in success rate and 3rd in EPA/play between the 20s — and 32nd in all three inside the 20, where 15 of 17 trips (88%) ended in touchdowns (data: nflfastR + FTN) (`@suuma810`).
5. **Regression has a receipt:** defenses with Seattle's exact open-field-elite / red-zone-last profile through Week 8 since 2006 saw their rest-of-season red-zone TD rate allowed fall from 71% to 55%, right at the 56% league average (`@suuma810`).
6. **The funnel is the matchup:** FunnelReport+ ranks pass funnels Bills, Jaguars, Lions, Commanders, Ravens and run funnels Panthers, Chargers, Titans, Saints, Falcons — 46 stats and 16 factors, ranks free, grades paid (PARTIAL: top 5s only) (`@MagicSportsGuy` / `@StatRankings`).
7. **Alone on the edge:** Trent Williams owns the highest pass block win rate "on an island" among active tackles at 96.4%, ahead of Latham 96.1% and Mims 95.9% — the post never defines "on an island" (`@PFF`).
8. **No quarterback falls further against real defenses:** Drake Maye's drop against top-10 EPA/DB defenses (−0.12 vs +0.30 against the rest) ranks 1st of 26 QBs on ANY/A, EPA/DB and sacks per game (source: Fantasy Points Data) (`@ScottBarrettDFB`).
9. **Beating the number, not the box:** Jaylen Warren leads rushing yards over expected per attempt at +1.54 (min. 50 carries), ahead of Walker +1.41, Cook +0.99 and Robinson +0.97 (`@FantasyPtsData`).
10. **One receiver IS the offense:** Jaxon Smith-Njigba's 3.84 yards per team pass attempt is 2nd since 1957, and his 51.5% receiving yardage market share leads the league (Fantasy Points Data for the share) (`@ScottBarrettDFB`).
11. **Accuracy over expectation:** Joe Burrow tops CPOE entering Week 9 at +9.0, with Geno Smith (Jets, per the standing ruling) at +6.0 in the same top 10 (source: PFN NFL Impact, nflimpact.app) (`@PFN365`).
12. **Aggression is a coaching stat:** 4th-and-1-to-5 go rate inside field-goal range — LaFleur goes 80% of the time, Schottenheimer 0%, league average 45%, Weeks 1–8 (data: nflverse; chart via `@DhananiZain`, quoted) (Lane C aggressiveness search).
13. **Field position is a hidden offense:** Buffalo's average drive start (34.79-yard line) leads a full 32-team table — the best starting field position in football, before a snap is taken (data: Fantasy Points Data) (`@sfdata9ers`).
14. **Throw at him at your own risk:** quarterbacks targeting Trent McDuffie post a 30.2 passer rating, the lowest allowed among defenders with 24+ targets (full 94 filed) (data: Fantasy Points Data) (`@sfdata9ers`).
15. **Same route tree, opposite answers:** Matthew Golden posts 3.11 YPRR vs man and 0.65 vs zone; Christian Watson is the mirror — 2.15 vs man, 3.21 vs zone (source: Statyx) (`@statyxio`).
16. **Count the verb before you count the stat:** Jordan Love "threw" 52 passes of 20+ yards per one board and "completed" 33 per another — both filed, different measures, not a conflict (`@PFF` vs `@NFL_Researcher`).
17. **Holding it longest:** Caleb Williams' 3.24-second average time to throw tops the full 32-team table through Week 8 (data: nflverse) (`@GridironInfo_`).
18. **Survivor is a Kansas City week until it isn't:** the Week 9 survivor card tops out at Kansas City 84.4% (`@cmain7`).
19. **The rookie at the top of the efficiency board:** Omar Cooper Jr.'s 1.44 EPA/play leads 113 wide receivers (median 0.25) (`@DynatyzeFF`).

### 3.2 `IDEAS-20261108.md` — 14 Briefs from the Nov 8 Sweep (PM Run 68)

20. **A dual-threat index you can audit on one line:** `(PassEPA/p × 50) + (RushEPA/p × 50) + (CPOE × 2) + ANY/DB + (Rush Success % × 20) + (Broken Tackle % × 20) − (Turnover % × 5)` — formula printed in full, built by the author's own LLM, no player values posted (`@evduzit`).
21. **The dome edge is real and tiny:** Tyler Bass is 21/22 (95.5%) in domes vs 126/149 (84.6%) everywhere else since 2020 — on only 22 dome attempts — and the league-wide split since 2015 is 85.4% dome vs 84.4% outdoor across 11,593 kicks, about one point (`@MagicSportsGuy`, Splits+ tool).
22. **Shadow coverage, defined:** a shadow is man coverage above 65% — Christian Gonzalez is expected (not measured) to shadow Christian Watson on ~73% of routes, and Gonzalez has defended only 12 slot routes all season against Watson's 27% slot rate (`@MagicSportsGuy`, ShadowCoverage+).
23. **Two different pass rushes in one defense:** the Giants grade worst (15) when they don't send pressure and double to 30 when they blitz, with the 4th-best EPA/play allowed (−0.172) in the blitz split — the rating itself is never defined in the post (`@The_Coach_A`).
24. **Required vs observed:** the cleanest prop framing in the feed — Sengun needs a 51.6% conversion of his potential assists to clear 6.5; he is converting at 60.0% (NBA tool at launch; the framing transfers) (`@statyxio`, CounterPlay).
25. **Scripted starts don't predict adjustments:** EPA/play above expectation on a game's first 15 plays correlates only +0.25 with second-half EPA/play above what the first half predicted — single-season samples are noisy by the author's own note (data: nflverse + FTN) (`@connor_long15`).
26. **The first interception is a fork in the game:** QB EPA/play before the first INT plotted against EPA/play after it splits quarterbacks into bounce-back and downward-spiral quadrants — minimum 25 QB plays on each side, INT-less games excluded (PARTIAL scatter, no per-QB numbers printed) (data: Fantasy Points Data) (`@sfdata9ers`).
27. **Coaching as a pass-rate number:** Cincinnati projects at a 63.3% pass rate against a 59.2% expectation (+4.7 pts of coaching effect); Atlanta projects 56.3% against 61.4% (−6.2 pts) (`@statyxio` projections).
28. **Pressure allowed is a team stat with a 13-point spread:** the Rams allow pressure on 15.8% of dropbacks, the Panthers on 28.5% — full 32 filed (data: PFR, via `@GridironInfo_`).
29. **Throwing at the top of the board:** quarterbacks targeting Jaxon Smith-Njigba's coverage post a 141.9 passer rating when targeted, highest of the top-30 table; Mike Evans (49ers, per the standing ruling) is second at 137.5 (data: Fantasy Points Data) (`@sfdata9ers`).
30. **Man coverage is a choice with a range:** team man-coverage rates run from 46.2% down to 7.2% across the full 32 (team labels PARTIAL — logos only) (data: Fantasy Points Data) (`@sfdata9ers`).
31. **The edge board:** Chop Robinson leads a 12-man edge pass-rush-win-rate table at 36% (`@omardouk`).
32. **Age, weighted by snaps:** offenses span 25.14 to 30.12 snap-weighted years (San Francisco oldest), defenses 25.57 to 28.82 (team labels PARTIAL — logos only) (data: Fantasy Points Data) (`@sfdata9ers`).
33. **Aggression, updated (POST-WINDOW capture, 9:30 AM Nov 8 — first item for the next sweep):** Brissett throws into tight coverage 24% of the time, Mahomes 7% — full 32 filed (data: Next Gen Stats, via `@GridironInfo_`).
