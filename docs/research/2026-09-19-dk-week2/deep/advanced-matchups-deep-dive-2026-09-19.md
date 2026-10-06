# Advanced Matchups Deep Dive — DK Week 2 (2026-09-19)

**Slate:** "Week 2 2026 Ray's in Aruba" — 15 games, Sun 2026-09-20 + Mon 2026-09-21. Single-entry, 75 players, winner-take-all (free contest). Research only — no lineups, nothing posted.
**Task from Garrett:** go deeper, be creative/innovative, mine every advanced metric in the repo (esp. this week's sweeps). Verdicts on all his liked plays. Coverage/route-level detail for WR/QB/RB/TE/DST.
**Method:** in-repo mining (StatRankings CSV dump 2026-09-18, magicsportsguy/StatRankings tables, FantasyPoints bellcow, MediJo20 rushing scatter, sfdata9ers) + three parallel web-research lanes (injury verification, coverage matchups, advanced player metrics). Sections marked [WEB] are filled from those lanes on delivery.
**Data vintage:** all StatRankings rows are 2026 Week 1 only (n=1 — treat as role/efficiency signal, not truth). 2025 splits labeled as such. DK salaries: DK Network/Huddle second-party only (DK API Akamai-blocked) — labeled [2P].

---

## 0. CORRECTIONS TO PRIOR RESEARCH (adversarial recheck)

1. **Nabers does NOT face Trent McDuffie.** The SNF/MNF addendum (2026-09-19) listed "Nabers ($6,500, tough McDuffie matchup)" under NYG@LAR bring-backs — wrong. McDuffie plays for Kansas City (IND@KC is the SNF game). Nabers (NYG) faces the **Rams** secondary on MNF: zone-heavy (85.3% zone, StatRankings teams file, 2026-09-18), with an elite slot defender in Quentin Lake (0.17 FP/route allowed, 8th; 18.9% target rate allowed, 3rd — magicsportsguy-nyg-lar-cb-2025-context, 2026-09-18). Nabers is 79.2% perimeter / 50% left-aligned (magicsportsguy-nyg-receiver-alignment-week1, 2026-09-18), so he primarily sees LAR's outside corners, not Lake. Verdict impact: Nabers' matchup is NEUTRAL (zone-heavy outside corners), not the "tough McDuffie" fade the addendum implied.
2. **Isaiah Likely is on Baltimore, not a NYG@LAR bring-back.** ~~The addendum listed Likely among NYG@LAR pieces — wrong team. Likely (BAL) plays NO@BAL Sunday 12:00 CT. He stays relevant as the Mark Andrews hedge (see §3).~~ **[SUPERSEDED by correction #16: Likely is a Giant. This correction was wrong.]**
3. **"Jayden Noel" → Jaylin Noel.** Garrett's "Noel" is Texans rookie WR **Jaylin Noel** (name as listed in the StatRankings players file, 2026-09-18).
4. **magicsportsguy file labels are unreliable; player-level rows are fine.** `magicsportsguy-nyg-lar-cb-assignments-week1.csv` contains **Chiefs** corners (Jaylen Watson, Trent McDuffie — 85.3% zone, McDuffie 80.8% RCB), and `magicsportsguy-nyg-lar-cb-2025-context.csv` mixes KC (Watson, McDuffie) with LAR (Quentin Lake). Use the player facts, ignore the filenames. (All 2026-09-18.)
5. **Kenneth Walker III is on Kansas City in this dataset** (StatRankings lists "Kenneth Walker III, Kansas City Chiefs"; bellcow report: "Kenneth Walker, KC, 73% XFP"). The SNF addendum's "Chiefs offense runs through Walker (23/173/1)" is consistent — treat as KC's RB1. (Team-affiliation staleness was flagged in the sweep for other players; Walker-to-KC is corroborated twice independently here.)
6. **Sam Darnold is the SEAHAWKS QB, not the Vikings'.** Darnold is OUT (glute); **Drew Lock starts for SEA @ ARI** (injury-verification lane, 2026-09-19). The Vikings' out QB is **Kyler Murray** (concussion) — Wentz starting for MIN is still correct. Impact: SEA@ARI passing (JSN's 45.8% target share now comes with Drew Lock) is downgraded; nothing about MIN@CHI changes except the name on the injury report.
7. **Myles Garrett is a RAM (traded from Cleveland June 1), on IR Sept 17** (arthroscopic knee surgery, out min 4 weeks — injury-verification lane, 2026-09-19). He was never relevant to CLE@TB. For NYG@LAR: LAR's front is Garrett-less with Aaron Donald returning on a **reduced, pass-rush-situational snap count** — the "30–40 snaps" figure in the SNF/MNF addendum is **unsourced** (Donald himself says he doesn't know). Skattebo's "Garrett-less front" edge (174 rushing yards allowed) refers to LAR's front, not Cleveland's — the substance holds, the attribution is now clean.
8. **Brock Purdy is OUT; Mac Jones starts vs MIA** (injury-verification lane, 2026-09-19). Downgrades SF passing (Kittle/Jennings) and the MIA@SF total; SF DST thesis (vs Willis) is unaffected.
9. **Michael Pittman is a STEELER now** (Q, foot, DNP Thu/Fri, trending wrong — injury-verification lane, 2026-09-19). The "Pittman bleak → Metcalf absorbs" read (main research) needs re-checking against PIT's actual WR room.
10. **Ladd McConkey is Q (rib, limited Friday)** — 44% model projection (injury-verification lane, 2026-09-19). His slot role vs LV is conditional on active status.
11. **Christian Kirk is on the 49ERS, not the Texans** (signed 1 yr/$6M on 3/16/2026 — coverage-matchups lane, 2026-09-19). He is NOT a Nico Collins fill-in. HOU's slot competition is Hutchinson vs Jaylin Noel. Kirk is an SF WR vs MIA (neutral, new team).
12. **Kirk Cousins is the RAIDERS' QB** (coverage-matchups lane, 2026-09-19) — not ATL's. LV@LAC is Cousins + Jeanty + Mayer (+Bowers doubtful). His red-zone line (8 att/6 comp/3 TD) in the StatRankings dump belongs to LV.
13. **Jacoby Brissett is Arizona's QB; Cooper Rush starts for Atlanta** (Penix inactive; coverage-matchups lane, 2026-09-19). SEA@LAR... SEA@ARI is Lock vs Brissett; CAR@ATL is Young vs Rush — both games' passing expectations drop a tier.
14. **Deebo Samuel is NOT on Washington in 2026** (listed departure; coverage-matchups lane, 2026-09-19). WAS@DAL's Commanders side is McLaurin-led; do not project Deebo targets there.
15. **"Barham" resolved: Jaishawn Barham**, Cowboys rookie ILB (2026 3rd-rounder), behind Dee Winters, next man up with Overshown (hamstring) ruled out (coverage-matchups lane, 2026-09-19). Not a fantasy asset; minor DAL defensive-depth note.
16. **Isaiah Likely is a NEW YORK GIANT, not a Raven** (signed 3yr/$40M in March 2026, reuniting with John Harbaugh — now the Giants' HC; Farrell/Andrews participation lane, 2026-09-19, citing Giants Wire 2026-09-17 and DK Network 2026-09-15). His 8/8/78/2TD Week 1 was **NYG vs DAL**. Andrews re-signed with Baltimore (3yr/$39.3M, Dec 2025). **This voids the entire "Likely is the leverage pivot to Andrews" thesis** — and supersedes correction #2 above (which wrongly re-asserted Likely-as-Raven). The SNF/MNF addendum's Likely-as-Raven references are therefore wrong and need a correction note; Likely is a **NYG@LAR (MNF) TE asset** instead.
17. **Luke Farrell is a blocking TE, not a receiving breakout** (Farrell/Andrews lane, 2026-09-19): 45–46 snaps produced only 16–19 routes (44% route rate), 2 targets, 5.9% share, 12.5% TPRR, 0.9 aDOT — vs Kittle's 38.5% TPRR and 5 targets on 16 fewer snaps. Career "pseudo-sixth offensive lineman" (3yr/$20.25M). FADE as a pass-catcher.
18. Sourcing honesty (Farrell/Andrews lane, 2026-09-19): the in-repo StatRankings rows cited in §2j (Andrews 24.0% share / 20.0% drop) and the Likely 57.1% RZ share were **not relocatable** in the repo's CSV/JS on a 9/19 check — treat as brief-provided, corroborated by RotoWire's independent 25.0% share and the documented 2nd-and-goal drop. The Farrell 58.3% Cover-3 row *was* located (`2026-09-17/statrankings/nfl-coverage.csv`; one-day date discrepancy vs the 2026-09-18 citation).

---

## 1. INJURY / STATUS RESOLUTIONS (injury-verification lane, 2026-09-19 — all sources dated 9/18–9/19)

**Confirmed:**
- **Jordan Mason — IR** (Sept 16, fractured thumb surgery, out min 4 games, earliest Week 7). Aaron Jones thesis structurally intact.
- **Carson Wentz starting** MIN@CHI (Murray concussion — see correction 6 above).
- **Brock Bowers — Doubtful** vs LAC (knee); **Michael Mayer confirmed as the TE pivot — 6 rec on 7 targets in Week 1.** A backup TE with a real 7-target Week 1 is not the usual trap; upgrades §2h to conditional ✅.
- **Zay Flowers — Doubtful** vs NO.
- **Nico Collins — OUT** vs CIN (Grade 1 hamstring, Aaron Wilson/KPRC 9/18).
- **Paulson Adebo — IR** (Giants, Sept 18, knee, designation to return).
- **Brock Purdy — OUT**; Mac Jones starts vs MIA (see correction 8).
- **Aaron Donald — plans to play MNF** ("That's the plan," 9/18), reduced situational snaps (see correction 7).

**Weather (all confirmed):**
- **MIN@CHI — the real weather game.** Sharp (updated 9/19): 13 mph winds, gusts to 23, rain, 3/5 impact. NWS Chicago: gusts to 30 mph, ~1 inch of rain, heaviest possibly pre-kickoff. Deep-ball discount for Caleb AND Jefferson; checkdown/rushing-floor premium (Jones, Swift); CHI DST leverage sharpens.
- **PIT@NE — 2nd-half rain** (StormTeam 5 via Patriots Wire, 9/18).
- **CLE@TB — 40% PM thunderstorm risk** (weather.com 9/19); highest impact rating on SBR but kickoff conditions likely fine — delay watch, not a fade.
- **IND@KC (SNF) — mild:** 75°F, 25% rain. No impact.

**Questionable watch (final designations + Sunday inactives 90 min before kickoffs still pending):**
McConkey (rib, LP Fri) · Pittman (foot, DNP Thu/Fri, trending wrong — now PIT) · Olave (hammy, limited) · RJ Harvey (hammy) · Jalen McMillan (knee, full practice, game-time decision) · Van Ness (concussion protocol) · O'Neill (knee, returned Fri) · Anthony Bradford (SEA RG, knee/hip, DNP Fri) · Cedric Gray (concussion, full practice, expected to play).

**Unresolved before lock:** Nacua's hip (Saturday practice + McVay media), Banks's calf (Giants' final MNF report Saturday), Bowers's pregame knee test, all Q tags.

---

## 2. GARRETT'S LIKED PLAYS — ANALYTICAL VERDICTS

Legend: ✅ data SUPPORTS · ⚠️ MIXED/CONDITIONAL · ❌ data UNDERMINES · 🔍 thin in-repo data, verdict from [WEB] lane.

### 2a. Justin Jefferson (vs CHI) — ✅ STRONG SUPPORT
- **Role is maximal:** 37.5% target share, **52.9% first-read share**, 100% route participation, 46.5% air-yard share, 9 catchable targets, Weighted Opportunity Rating 88.11 (StatRankings players, 2026-09-18; target share/first-read from the free full leaderboards — slate-top-3 in both).
- **The matchup mechanics favor him, not just the "bad secondary" narrative:** Chicago plays **60.0% man coverage** (StatRankings teams, 2026-09-18) — the highest man rate on the Sunday slate. Elite separators feast on man-heavy defenses because there is no zone shell to hide weak corners. CHI allowed 2.07 YPRR, 0.54 perimeter FP/route, and 5 explosive receptions in Week 1 — a genuinely soft man-coverage unit — and the coverage lane names the bodies: **Jaylon Johnson allowed a 113.7 passer rating (PFF 44.8)** and **Tyrique Stevenson allowed 158.3** in Week 1, with Chicago at **65.2% man (2nd-highest in the NFL)** (coverage-matchups lane, 2026-09-19). Bryce Young threw for 361/3 on this unit (Bears Wire, 2026-09-18).
- **Weather note:** MIN@CHI rain/wind ([WEB] lane) discounts deep-ball volume; Jefferson's value here is target-concentration (first-read 52.9%), not aDOT. The floor is the play, not the ceiling.
- **Verdict: PLAY.** Best-constructed WR argument on the slate by role data. The Bears' man-heaviness is the mechanism, not just "dog shit secondary." **UPGRADED by lanes: 22.1 xFP (#5 of all players, Sharp), 39.1% target share on 97% routes** (advanced-metrics lane, 2026-09-19).

### 2b. Jordan Addison (vs CHI) — ⚠️ CONDITIONAL (buy-low, but target-earning flag)
- **87% route share with 0 catches in Week 1** (coverage-matchups lane, 2026-09-19) — the role is intact, the box score is empty. Classic buy-low setup.
- **THE FLAG: 8% TPRR on that 87% route share, 0-for-2** (advanced-metrics lane, 2026-09-19 — [WEAK]). He wasn't earning targets when on the field. Small-sample caveat: Wentz attempted only 19 passes in relief, and the documented Wentz→Jefferson chemistry (34/477 in 2025) suggests targets concentrate to JJ first.
- Coverage mechanics: CHI slot FP/route allowed 0.60 (StatRankings teams, 2026-09-18); PFF projects his heaviest coverage splits vs Johnson and Stevenson — the same burnable corners as Jefferson's side (coverage-matchups lane). Jauan Jennings OUT condenses the tree.
- **Verdict: CONDITIONAL — downgraded from GOOD.** The buy-low case needs Wentz to spread it beyond Jefferson. GPP correlation with Jefferson/Wentz, not a cash standalone.

### 2c. Aaron Jones (Mason IR — CONFIRMED) — 🔍 leaning ✅
- **Mason to IR is confirmed** (Sept 16, fractured thumb surgery, out min 4 games — injury-verification lane, 2026-09-19). The backfield thesis is structurally intact.
- In-repo: **no rows** (didn't crack any top-5 paywalled leaderboard). Bellcow report top-30 has no Jones row.
- Still needs [WEB]: Jones's Week 1 snap/route/target share (was he already the pass-game back?), and Wentz's checkdown tendency. Supporting: CHI allowed 0.380 EPA/play rushing in Wk1 (soft — StatRankings teams, 2026-09-18), and the rain game elevates checkdown/rushing floors.
- **Verdict: lean PLAY pending [WEB] route data.** If his Wk1 route share was real, he's the rain-game RB with the clearest path to 15+ touches.

### 2d. Carson Wentz (starting for MURRAY, concussion — OUT confirmed) — 🔍 leaning ✅
- **Status triple-confirmed** (Vikings Wire, Fox Sports, Reuters, Heavy, ClutchPoints, 2026-09-18/19): Murray suffered the concussion 11 plays into Wk1 vs GB; O'Connell expects him back Week 3. Wentz starts, J.J. McCarthy backs up.
- **Wentz's actual Wk1 line in relief: 12/19, 133 yds, 3 TD, 0 INT, 123.5 rating** — and he "built an immediate connection with Justin Jefferson" (particle.news, 2026-09-18). 2025 with MIN: 5 starts, 85.8 rating, 65.1%, 1,216 yds, 6/5 TD/INT.
- **The Jefferson-Wentz chemistry is documented: in 2025, Jefferson caught 34 passes for 477 yards with Wentz — over 45% of his total season yardage** (Vikings Wire, 2026-09-18). This is not a cold backup situation; it's his most productive QB pairing on record.
- **Jauan Jennings (MIN WR) is OUT** (personal matter — Vikings Wire, 2026-09-18). One fewer mouth: the target tree condenses further toward Jefferson/Addison.
- Still needs [WEB]: career EPA vs blitz, pressure-to-sack, deep-ball willingness in wind (gusts to 30 mph).
- **Verdict: lean PLAY as salary relief.** The chemistry data + condensed tree + 3-TD relief appearance move him from "name on a depth chart" to a live GPP QB. Weather caps the ceiling — play him for the Jefferson stack, not standalone.

### 2e. Bijan Robinson — ✅ SUPPORT (chalk, justified)
- **Role is elite:** 95% XFP... no — 84% backfield XFP share (FantasyPoints bellcow, 2026-09-18), 67.7% rush share, 62.0% touch share, 81.5% dominator rating, 110 YAC, **45.5% target share + 50.0% first-read share** (StatRankings free leaderboards, 2026-09-18 — #2 target share on the slate behind JSN).
- MediJo20 rushing scatter (2026-09-19): Bijan's career rushing profile is efficient (not TD-or-bust like Jacobs at -1.6 EPA/gm).
- **Verdict: PLAY, with eyes open.** You're paying for the most complete role on the slate. In a 75-man winner-take-all, the leverage question is ownership, not talent — the fade case must be built on game script (CAR@ATL: if ATL trails, the 45.5% target share actually *helps*). **Scheme kicker: CAR allowed 124.9 zone yards in Wk1 (2.6x NFL average); Bijan runs 57% zone (RB scheme lane, 2026-09-19) — highest-upside star spot on the slate.**

### 2f. Kyle Pitts — ❌ FADE (data undermines)
- **5% TPRR on 81% route share, one target, zero catches in Week 1** (advanced-metrics lane, 2026-09-19 — [WEAK]). He ran routes all game and saw one ball. That is not a role; it's cardio.
- In-repo: nearly nothing (only "71.4% two-high rate faced," StatRankings players, 2026-09-18).
- Garrett likes him, but the numbers say the ATL pass game doesn't. The QB situation (Rush starting, Penix inactive — §0.13) doesn't obviously fix a target-earning problem.
- **Verdict: FADE.** Revisit only if Saturday/Sunday reports show a schematic role change. The Farrell lane (§6d) may add TE context.

### 2g. Javonte Williams (DAL, vs WAS) — ✅ STRONG SUPPORT
- **Elite bellcow:** **95% backfield XFP share** (FantasyPoints bellcow, 2026-09-18) — tied with Achane for #1 on the slate. 85.0% RB utilization, 85.0% opportunity share, 66.7% rush share, 58.3% rushing success rate (StatRankings players, 2026-09-18).
- **Goal-line + receiving:** inside-10: 3 att / 2 yds / **1 TD on 100% rush share**; red-zone receiving: 2 tgt / 2 rec / 12 yds / **1 TD** (StatRankings red-zone family, 2026-09-18). Three-down AND goal-line — the full package.
- **Matchup:** WAS@DAL is the week's top total (~51.5); WAS allowed 0.178 KR EPA/return and 0.413 PR EPA/return (2025 special teams, gse-lab) — minor field-position help; WAS blitzes 44.1% but Javonte's receiving role is blitz-proof. WAS was the worst defense vs RBs in 2025 (advanced-metrics lane, 2026-09-19).
- **Salary: $6,400 [2P] (DK Network RB8)** — 85% of DAL RB opportunities and 55.6% of RZ touches at RB8 pricing (advanced-metrics lane, 2026-09-19). Mispriced.
- **Verdict: PLAY.** The 95% XFP share at RB8 salary is the slate's best RB role-per-dollar signal.

### 2h. Michael Mayer (LV @ LAC, Bowers doubtful) — ✅ ELITE matchup
- **Bowers is Doubtful (knee); Mayer is the confirmed pivot — and he has a real role: 6 receptions on 7 targets in Week 1** (injury-verification lane, 2026-09-19). A backup TE with a 7-target Week 1 is not the usual low-route trap.
- **The matchup is the slate's best TE spot: LAC ranks 27th in DVOA vs TEs, allows a 77% TE catch rate, and starts two LBs with ~42–43 PFF coverage grades** (coverage-matchups lane, 2026-09-19). Derwin James is the only real coverage threat.
- LV QB note: Kirk Cousins is the Raiders' QB (correction §0.12) — a veteran TE-friendly distributor.
- **Salary: $3,600 [2P] (Huddle)** — 24.1% target share / 30% TPRR at punt pricing; "mispriced by a full tier" (advanced-metrics lane, 2026-09-19).
- Still useful [WEB]: Week 1 route participation/slot rate to size the role. **Verdict: PLAY.** Best TE matchup on the slate attached to a real 7-target role.

### 2i. Rashod Bateman (NO@BAL, Flowers doubtful) — ⚠️ CONDITIONAL (downgraded on target-earning)
- **Flowers is doubtful/not expected to play → Bateman is the WR1 by default** (coverage-matchups lane, 2026-09-19). Caveat: the Saints were a top-4 pass defense last year with a 72.8 team coverage grade in Week 1 — role upgrade, not matchup upgrade.
- **THE RED FLAG: 4% TPRR on 84% route share, zero catches in Week 1** (advanced-metrics lane, 2026-09-19 — [WEAK]). He was on the field (84% routes) and earned nothing. The "WR1 by default" narrative assumes targets follow routes; Bateman's Wk1 says they didn't.
- Counter: Flowers's absence vacates a 15.0-YPRR/2.87-Barrett-YPRR target tree — someone must absorb it, and 84% route share is the right seat. But Henry and Andrews are the more proven absorbers (the "Likely" thesis is void — §0.16).
- **Verdict: CONDITIONAL — downgraded.** The role is real; the target-earning is not. GPP-only until he shows a pulse. Prefer Henry/Andrews for the condensed-pie thesis.

### 2j. Mark Andrews (NO@BAL, Flowers out) — ✅ PLAY (uncontested TE1 — no Likely pivot exists)
- **Elite-for-position Week 1 usage (Farrell/Andrews lane, 2026-09-19):** tied team lead in targets (6), 25% share (RotoWire independent; brief-provided StatRankings rows were not relocatable — §0.18), ~29% TPRR, 68% route share, 70–72% snaps, +1.7 receiving EPA — the receiving TE in every personnel grouping (79%/64%/75%). Durham Smythe is a pure blocker (10 routes): Andrews has no in-room competition.
- **The Likely "problem" is void:** Likely is a Giant (§0.16). There is no second BAL TE to hedge.
- **The pie condenses in his favor:** Flowers DOUBTFUL (hamstring, not expected to play — ESPN 2026-09-19); Hensley's number — over the last 18 games Flowers has 91/1361 while all other Ravens WRs combined have 55/814 — targets funnel to Bateman + Andrews + Henry. RotoBaller explicitly built a "Flowers injury-contingency" Lamar/Andrews stack.
- **Matchup nuance (coverage-matchups lane, 2026-09-19):** Saints LBs are credible in coverage (Elliss 66th percentile) but their run defense is the true weakness (50.6 grade) — play-action off Henry is Andrews's path.
- **Salary: $4,400 [2P]** (DK Network 2026-09-17; The Huddle 2026-09-19), ranked TE22 with 7.8 projected PPR — the discount prices real risks: 20% drop rate (2nd-and-goal drop), and a -8.5 home-favorite run-heavy script with Henry.
- **Verdict: PLAY.** The risks are real but priced; the role is uncontested and the pie is condensing. No hedge needed — the hedge doesn't exist.

### 2k. Derrick Henry (NO@BAL, Flowers out) — ✅ STRONG SUPPORT
- **Slate-best RB scoring:** 38.3 DK FPPG (StatRankings, 2026-09-18), 1.35 FP/rush attempt, 6 forced missed tackles, 101 YAC (4.2/carry), 8 first downs.
- **Goal-line monopoly:** inside-10: 5 att / 15 yds / **2 TDs on 83.3% rush share**; inside-5: 6 att / 27 yds / **2 TDs on 85.7%** (StatRankings red-zone, 2026-09-18). Career 0.82 rushing TDs/gm — elite TD band (MediJo20, 2026-09-19).
- Flowers out condenses BAL TDs toward Henry + the TEs — the leverage case hardens.
- **Salary: $7,200 [2P] (RB5)** — $1,000+ below Bijan/Taylor/CMC despite tied-1st rushing TDs, 104 YAC, 82.0 PFF rush grade (advanced-metrics lane, 2026-09-19). The pricing hasn't caught the role.
- **Verdict: PLAY.** The only knock is ownership; the role is unimpeachable.

### 2l. Nico Collins OUT — fallout (CIN@HOU) — Schultz ✅ ELITE; WRs 🔍
- **Dalton Schultz ($3.2K [2P], ~5.5% pOWN): ELITE matchup.** Nico Collins is OUT (Grade 1 hamstring — injury-verification lane, 2026-09-19) → target consolidation. And the coverage lane found the mechanism: **Bengals LBs were PFF's worst coverage unit in football (34.4 team grade; both starters sub-41, 115.3+ passer ratings allowed)** (coverage-matchups lane, 2026-09-19). Schultz already drew **8 Week 1 targets**. Worst LB coverage unit + condensed targets + $3.2K = the slate's best salary-to-matchup TE.
- **Christian Kirk is NOT a Texan** (he's on SF — correction §0.11). Remove him from the HOU tree entirely.
- **Xavier Hutchinson / Jaylin Noel:** in-repo: no metric rows. Both [WEB]-dependent (advanced-metrics + WR/TE-pool lanes): slot rates, Wk1 targets, who runs Collins's routes. **Tentative: GPP darts only until route data lands.**
- **Verdict: Schultz is the structural play (salary + role + worst-in-league LB coverage). The WR fill-ins need route data.**

---

## 3. COVERAGE MATCHUP TABLE (in-repo, StatRankings teams file, 2026-09-18)

| Defense | Man% | Zone% | Blitz% | Notable allowed (Wk1) | Fantasy implication |
|---|---|---|---|---|---|
| CHI | **60.0** | — | — | 2.07 YPRR, 0.54 perim FP/rr, 5 explosives | ✅ Jefferson/Addison: man-heavy + soft |
| MIN | — | — | **80.4** | 33.3% explosive rate allowed (!), 2.33 YPRR, +18.3 PROE | ✅ Caleb deep shots; ✅ CHI DST pressure angle |
| NYG | 52.9 | — | — | **0.683 pass EPA/play**, 71.0% pass success allowed | ✅✅ Rams pass game (Donald-less? no — Donald PLAYS) |
| DEN | 58.6 | — | 45.5 (+20.4 PROE) | — | ⚠️ JAX pass game: man-heavy + elite rush = the stack-breaker |
| IND | **66.7** | — | — | 2.75 YPRR, 0.74 slot FP/rr | ✅ KC man-beaters (Worthy speed?); ⚠️ Pierce vs man |
| KC | — | — | 54.3% press | 0.16 FP/dropback allowed, 12.1% sack% | ❌ IND pieces; ✅ KC DST |
| LAR | — | **85.3** | — | 0.94 slot FP/rr, 41.2% slot target rate | ⚠️ NYG slot (Lake elite); ✅ Nabers outside neutral |
| JAX | — | — | 53.1% press / 16.7% sack% | **1.48 slot FP/rr allowed** | ✅ JAX DST; ✅ DEN slot WR [WEB: who?] |
| CLE | — | — | — | **1.48 slot FP/rr**, 1.26 right-aligned FP/rr, 2.50 YPRR | ✅ TB slot/perimeter (McMillan? [WEB]) |
| SF | — | — | — | 0.94 slot FP/rr, 41.2% slot target rate | ✅ MIA slot (M. Washington 135 air yds) |
| WAS | — | 82.1 | 44.1% press | 35.1% slot target rate | ✅ Lamb (big slot) |
| PIT | — | **96.2** | — | 15.4% sack%, 5.5 cushion | ⚠️ NE pass game must beat zone |
| HOU | — | — | — | 0.69 perim FP/rr, 2.44 YPRR | ✅ CIN perimeter (Chase/Higgins) |
| LV | — | 84.4 | 13.5% sack% | — | 🔍 Mayer test: zone-heavy LAC? no — LV is the RAIDERS D (vs LAC offense) |
| LAC | — | — | — | — | 🔍 [WEB]: TE funnel data needed for Mayer |
| NE | — | — | 48.1 | — | — |
| GB | — | — | 48.4 | 0.51 perim FP/rr | — |
| BAL | — | — | — | 0.74 slot FP/rr, 0.27 FP/db | — |
| NO | — | — | — | 15 perim targets allowed | ✅ Bateman perimeter? [WEB] |
| DAL | 45.2 | — | — | 23.3% slot target rate | — |
| CIN | — | — | — | 11.1% sack%, 0.0% coverage TDs | ⚠️ HOU fill-in WRs |

---

## 4. NEW CREATIVE ANGLES (in-repo data, not on Garrett's list)

### A. Isaiah Likely as the MNF TE (NYG@LAR) ✅ [ELITE flag — new team context]
8/8/78/2TDs in Week 1 **for the Giants vs DAL** (Farrell/Andrews lane, 2026-09-19); 57.1% RZ target share (4/4/35/2 TDs in the RZ split — brief-provided, §0.18). He is NYG's receiving TE in the week's best primetime environment (LAR allowed 0.683 pass EPA/play in Wk1) — and the field will still be pricing him as "BAL's second TE" if at all. The innovative angle survives the team correction: it's just Monday night, not Sunday.

### B. Jaxson Dart's rushing floor in a dome ✅
0.86 FP/dropback, **8.0 rush att/gm, 59.0 rush yds/gm at 7.4 yds/att**, 79.3% accuracy, 132.7 rating vs man / 127.3 vs zone, 2.21s time to throw (StatRankings, 2026-09-19... 2026-09-18). MNF is in SoFi (dome). LAR is 85.3% zone — Dart's 81.3% comp vs zone applies. 33.3% pressure-to-sack is the wart. In a 75-man winner-take-all, a $5.8K [2P] QB with a 59-yard rushing floor and a gutted Giants... no — Dart faces LAR's defense. The rushing floor is matchup-proof.

### C. CeeDee Lamb's slot funnel vs WAS ✅
WAS allows a **35.1% slot target rate** (StatRankings teams, 2026-09-18) with 8 slot receptions on 13 targets in Wk1. Lamb: 47 snaps, 8 tgts, 62% success rate (gridironinfo-dal-wr-usage, 2026-09-18) and a RZ TD (StatRankings). In the week's top-total game, Lamb's big-slot role meets the slate's leakiest slot funnel.

### D. Kenneth Walker III is KC's bellcow, not a committee back ✅
73% backfield XFP (FantasyPoints bellcow, 2026-09-18), 34.1 DK points in Wk1, plus a red-zone *receiving* TD (StatRankings RZ, 2026-09-18). **14 missed tackles forced / +101 rushing yards over expected** (NBC, 2026-09-16 — RB scheme lane). The field will play Mahomes/Kelce/Worthy; Walker is the actual engine at (likely) lower ownership. Note the tension: IND plays 66.7% man — Walker's receiving work is the man-beater hedge.

### E. Jonathan Taylor's goal-line monopoly ✅
100% rush share inside-10 AND inside-5, 4 TDs across the RZ splits (StatRankings, 2026-09-18); 95.8% utilization, 95% rush share (players file). KC allows... KC's D is elite (0.16 FP/db) but Taylor's TD equity is role-locked. **Scheme temper: Taylor runs 68% zone into KC's 23.2 zone yards allowed (RB scheme lane, 2026-09-19) — the run-game matchup is bad even if the TD role is perfect.** The SNF game is the slate's best TD-equity RB vs the slate's best defense — pure GPP game theory.

### F. Parker Washington vs man-heavy DEN — conditional ⚠️
5.5 YPRR, **7.2 YPRR vs man**, 5.8 FP/target vs man, 1.58 slot FP/route (StatRankings, 2026-09-18) — elite man-beating. But DEN plays 58.6% man with a +20.4 PROE pass rush: the thesis ("he beats man") meets its toughest test. This is the stack's fulcrum — if you play JAX@DEN, Washington is the bring-back mechanism; if you fade it, DEN's man/rush is why.

### G. Alec Pierce's air-yard monopoly as the SNF dart ✅
54.5% air-yard share (CoverageIQ, 2026-09-18), 22 routes. One-card-drawing MNF... SNF dart: if IND trails KC (spread -6.5), Pierce's deep routes are the catch-up mechanism. Boom/bust personified.

### H. Juwan Johnson as the sub-$4K TE ✅
50 routes, 45 move-TE snaps, 32 slot snaps, RZ TD, 4.8 FP/touch (StatRankings, 2026-09-18); tied atop TE inside-10 targets (2). NO@BAL has sneaky shootout equity (BAL 65.2 vs NO 41.0 tier gap cuts both ways — NO throws when trailing).

### I. Puka Nacua / Davante Adams vs the depleted Giants secondary ✅ (coverage-matchups lane, 2026-09-19)
- **The Giants' cornerback room is in triage:** Adebo on IR (9/18), and both Week 1 starting outside CBs are hurt — Banks DNP Friday (calf), Newsome limited (rib) (coverage-matchups lane, 2026-09-19). NYG allowed **0.683 pass EPA/play** with a 71.0% pass success rate in Wk1 (StatRankings teams, 2026-09-18) — before losing the corners.
- **Puka: ELITE *if active*** — 32.1% target share, 50% first-read, 0.47 TPRR (StatRankings, 2026-09-18); **PFF's #1 WR of Week 1 (3.74 YPRR)**; 19.3 xFP (Sharp #9) vs 12.4 actual — a **+6.9 positive TD-regression candidate, not a fade** (advanced-metrics lane, 2026-09-19). DNP Friday (hip) — **confirm Saturday.**
- **Adams: ELITE, no qualifier** — full participant, no injury tag, vs the same depleted secondary. The leverage pivot if Puka sits or is limited: Adams's full-time role in the week's best primetime environment.
- Temper: Stafford's success rate was 5th-lowest of 30 qualifiers (advanced-metrics lane) — the WRs are elite, the distributor is shaky. In a dome... no — SoFi is a dome. Fine.

### J. Christian Kirk — ❌ OUT (SF IR)
- Not a Texan (correction §0.11) — and now confirmed **on 49ers IR (calf, designated to return, out ≥4 games)** (advanced-metrics lane, 2026-09-19). No Week 2 profile. Remove from all consideration.

### K. Jonathan Taylor's snap monopoly + Walker's yardage crown ✅
- **Taylor: 89% snap share, #1 among all RBs; 23 of 24 RB opportunities** (advanced-metrics lane, 2026-09-19) — on top of the 100% goal-line rush shares (§4.E). The SNF workhorse is role-locked.
- **Walker: 173 rushing yards, #1 among RBs; 23-to-8 carry edge over Emmett Johnson** in his Chiefs debut (advanced-metrics lane, 2026-09-19). KC's backfield is not a committee — it's Walker's, with Johnson as the breather.
- Salary note: the lane's salaries for Taylor/Walker/Skattebo/Kyren/Corum came from TNF/SNF-slate-only pools — treat as approximate [2P]; verify all primetime salaries in the lobby.

### L. Trevor Lawrence's efficiency crown vs the DEN tension ✅/⚠️
- **Lawrence: 1st of 32 QBs in passing success rate (FantasyPros); 3rd YPA, 4th catchable rate, +1.35 EPA/play without play action (SumerSports)** (advanced-metrics lane, 2026-09-19). The JAX@DEN stack's efficiency case is now best-in-class, not just good.
- The tension stands: DEN 58.6% man, +20.4 pressure-over-expected. Elite efficiency vs the unit built to break it — this is the slate's defining game-theory fork.

### M. CIN DST is misranked; LAR DST is a fade ✅/❌
- **CIN: #27 preseason rank is stale — 4 sacks + 3 forced fumbles on a 12.5% blitz rate** (advanced-metrics lane, 2026-09-19). Add the in-repo 11.1% sack% and CIN's -1.49 EPA/play allowed blitzing: the process case is three cuts deep.
- **LAR DST: #1 preseason rank vs 9th-lowest pressure rate — and Myles Garrett is on IR** (advanced-metrics lane; §0.7). Fade the consensus.

### N. The QB value tier the field isn't pricing ✅ (QB full-pool lane, 2026-09-19)
- **Geno Smith ($4,800 [2P]) — ELITE process.** 0.00% negatively graded dropbacks (1st of 30 QBs), 104.0 rating, 0 sacks — and only 9.3 DK points because the TDs didn't come. 4-0 career vs Gannon's scheme. The box score lied; the process is elite at near-minimum salary.
- **Jacoby Brissett ($5,000 [2P]) — ELITE accuracy.** Top-8 in every Week 1 accuracy metric (6th highly accurate throw rate, 8th success rate), 2.56s TTT (3rd-fastest) — and he just beat LAC as 9.5-point dogs. Now faces SEA's zone-heavy defense, the same profile he dismantled last week.
- **Baker Mayfield ($5,600 [2P]) — ELITE efficiency.** CPOE +15.4 (2nd of 30), 82.1% comp (led NFL), vs a CLE defense that allowed the HIGHEST passer rating + success rate in Week 1. Revenge game, rushing-TD floor. The TB@... TB hosts CLE — Mayfield is the bring-back-proof side of the TB DST angle (§4.D).
- All three are cheaper than the chalk QBs with top-decile Week 1 process metrics. In a 75-entry winner-take-all, one of these is the salary-relief engine.

### O. The QB traps that kill stacks ❌ (QB full-pool lane, 2026-09-19)
- **Cooper Rush ($4,200 [2P]) — unplayable.** Worst QBR (2.6), worst CPOE (-21.3), worst pressure-to-sack (80%), 3.5 air yards/attempt — and CAR has the 3rd-highest pressure rate. Salary can't fix this. **This buries the ATL passing game: London downgraded (already flagged), Pitts faded (§2f).** ATL is a run-script team with Rush.
- **Bo Nix ($5,700 [2P]) — fade.** Bottom-3 in EPA/db, YPA, and aDOT simultaneously (QB31) vs JAX's #1 pressure/sack/pass-EPA defense. The DEN side of JAX@DEN is dead money — which **strengthens the JAX DST case (§4.G)** further.
- **Deshaun Watson ($4,500 [2P]) — fade.** PFF passing grade 40.1 (lowest of 30), 3 turnover-worthy plays vs 1 big-time throw, 16.7% sack rate — vs TB's 4th-ranked blitz rate in thunderstorm weather, with Shedeur's "expiration date" hanging over him (Monken 9/14). A mid-slate benching zeroes him. **Strengthens TB DST (§4.D).**
- **Burrow (Q, back) is playing** — full Friday practice, Taylor "good to go," but reported not 100% in walkthrough. CIN@HOU stacks stay live; discount the ceiling a notch.

### P. Five best schematic matchups — offensive boosts (defense-scheme lane, 2026-09-19)
Ranked by Wk1 EPA/play allowed + success + explosive rates, all one-game samples:
1. **TB offense vs CLE** — CLE allowed +0.400 EPA/play, 61.2% success, 22.4% explosive; league-worst slot coverage (1.48 FP/route); first-time DC Rutenberg (continuity of Schwartz's structure, but new play-caller). **Mayfield's ELITE case (§4.N) hardens further.**
2. **WAS offense vs DAL** — DAL allowed +0.397 EPA/play, 62.1% success; Week-2 Fangio-system install under first-time DC Parker on the 2025 league-worst scoring defense. **Daniels + WAS pass-catchers get a structural boost** (note: WAS's D is now Daronte Jones's Flores-derived disguise system, not Quinn's — that affects Dak, not Daniels).
3. **NYG offense vs LAR** — LAR allowed +0.262 EPA/play, 61.8% success, 0.94 slot FP/route; NYG's offense posted +0.397 EPA/play and +0.677/dropback in Wk1. **Dart + Likely + Nabers all get MNF boosts** — the coverage lane's "depleted Giants secondary" angle (§4.I) now has a two-sided counterpart: LAR's defense is the softer unit in this game.
4. **CHI offense vs MIN** — CHI posted +0.360 EPA/play, +0.483/dropback vs GB; MIN's 80.4% blitz was solved in-game by GB (83% 1H → 63% 2H), and MIN allows explosives at the league-worst rate (33.3%) when the blitz misses. **Caleb Williams's ceiling case improves** — though MIN@CHI weather (§1) still caps deep shots.
5. **ATL offense vs CAR** — CAR allowed +0.360 EPA/play (2025 baseline: 32nd). **Moot for the pass game: Cooper Rush is unplayable (§4.O).** Only the ATL run script (Allgeier?) could access this.

### Q. Five worst schematic matchups — DST boosts (defense-scheme lane, 2026-09-19)
1. **DEN offense vs JAX** — JAX allowed -0.493 EPA/play with 53.1% pressure and 16.7% sack rate; DEN offense at -0.261. **JAX DST case (§4.G) is now four cuts deep** (pressure, sacks, Nix's QB31 metrics, scheme). Takeaway-regression caveat stands (JAX +5.04 INTs over expected in 2025).
2. **IND offense vs KC** — KC 54.3% pressure (1st), 2.2% opponent explosive rate; IND offense at -0.291. **KC DST (§4, SNF) hardens.**
3. **CLE offense vs TB** — slate's coldest offense (-0.493) vs Bowles's 45.9% blitz (4th), in thunderstorm weather, with Watson's benching risk. **TB DST (§4.D) hardens.**
4. **TEN offense vs PHI** — TEN at -0.264 vs PHI's +19.0 pressure-over-expected (2nd) with 4.2 YPA vs zone behind it. **PHI DST enters the conversation** (Ward is a fade).
5. **PIT offense vs NE** — PIT at -0.311 vs a unit one season removed from 4th in points allowed and a Super Bowl berth, now blitzing 48.1% under Kuhr. **NE DST enters as a GPP dart** (Rodgers is a fade).

### R. DC/play-caller corrections that change reads (defense-scheme lane, 2026-09-19)
- **PIT (Graham):** reputation says aggressive man-blitzer; Wk1 was league-low 10.5% blitz, 96.2% zone. Maye faces disguise-zone, not blitz-zero — **less scary for NE's pass game than the brand suggests.**
- **GB (Gannon):** career low-blitz split-safety identity; Wk1 blitzed 48.4% (2nd in NFL) vs 26.3% in 2025. **Tempers Brissett (§4.N) a notch** — though his 2.56s TTT is the right antidote.
- **LAC (O'Leary):** 2025 results inflated by +7.11 INT luck (2nd-most in league); regression already showing in Wk1. **Boosts the LV side (Cousins/Mayer/Jeanty)** — LAC's defense is worse than its reputation.
- **NYJ/BAL/MIA/TEN:** the named DC is not the play-caller — Glenn, Minter, Hafley, and Saleh call plays respectively. File under matchup-table hygiene.
- **SF (Morris):** "four-down quarters low-blitz" is stale — 2026 uses five-man fronts with changing shells. Affects the MIA@SF read (Willis).
- INT-luck ledger: negative regression risk CHI +7.22, LAC +7.11, JAX +5.04; positive candidates NYJ -10.08 (extreme), GB -5.00, SF -5.28, TEN -4.99, DAL -4.62.

### S. The five biggest zone/gap mismatches ✅ (RB scheme lane, 2026-09-19)
Scheme data is Week 1 2026 (one-game samples, flagged); opponent yards-allowed splits from Razzball tools (updated 9/18):
1. **CMC vs MIA — ELITE.** 90% zone rushing vs MIA's 65.2 zone yards allowed. Strongest scheme edge among lead backs on the slate.
2. **Bijan vs CAR — ELITE.** 57% zone vs CAR's **124.9 zone yards allowed (2.6x the NFL average)**, on 77% snaps + 52.6% target share. Highest-upside star spot on the slate — hardens the §2e PLAY.
3. **Achane vs SF — ELITE gap edge.** 55% gap lean vs SF's **league-worst 77.9 gap yards allowed** (SF bottles up zone instead — the exact wrong defense for Achane's profile, in the right way), on 88% snaps.
4. **Bhayshul Tuten vs DEN — ELITE on paper.** 47/53 zone/gap balanced vs DEN's 71.1/86.3 (worst combined on slate). **Role is the only dampener** — verify his backfield share before sizing.
5. **Justice Hill vs NO — ELITE on paper, unplayable in practice.** 83% zone vs league-worst 79.0 zone allowed — but 6 carries / 45% snaps behind Henry. A tell, not a play: **it confirms NO can't defend zone runs, which is Henry's and the BAL run game's tell too.**
- **Scheme-driven DOWNGRADES:** Taylor (68% zone into KC's 23.2 zone D — tempers §4.E's SNF case); Hampton (75% zone into LV's 11.7); Love (73% zone into SEA's 16.8); Chase Brown (69% gap into HOU's 24.8); Chuba (80% zone into ATL's 33.1); Pollard (86% gap into PHI's 25.8 while PHI's zone vulnerability goes unused); Kyren/Skattebo (gap leans into top gap defenses — hardens the committee fades); Harvey (3-carry 100% zone into JAX's 23.7/18.5 + Q tag); Lloyd/Brooks (GB backs vs NYJ's D, elite at both).
- **Scheme-driven UPGRADES:** Warren/Dowdle (vs NE's 60.4 zone D); Gainwell (vs CLE's gap soft spot).
- **Backfield news:** Kamara practiced fully all week, expected to debut Week 2 **behind Etienne** (Saints reports 9/18–9/19) — caps Etienne's ceiling in NO@BAL. Josh Jacobs is on the **Commissioner's Exempt List** (no timetable, 9/19) — GB's backfield is Lloyd/Brooks vs NYJ's elite run D. TreVeyon Henderson returned to practice 9/14, threatening Rhamondre's 85% share (PIT@NE).


### T. WR/TE full-pool rankings — 101 players, mechanical value/traps (WR/TE pool lane, 2026-09-19)
Rebuilt from a direct RotoWire audit; score = mean pool percentile − salary percentile (OUT/Doubtful excluded). Full file: `deep/wr-te-full-pool-2026-09-19.md` (+ `wrte-rotowire-extract.csv`, `wrte-computed.json`; build script `~/workspace/build_wrte.py`).
- **Two qualifiers the first pass missed:** **Jaxon Smith-Njigba (SEA) — 96% routes, 45.8% target share, 42.3% TPRR, 4.69 YPRR** — the slate's most concentrated WR role, but the QB is now Drew Lock (Darnold out). Elite share, backup-QB efficiency caveat. **Deebo Samuel (SF) — 50% routes but 20.6% share, 38.9% TPRR, 2.67 YPRR** — he's a 49er in 2026 (not WAS), a real piece of the SF offense vs MIA with Mac Jones.
- **Top 5 mechanical values:** Caleb Douglas ($3,700), Mike Gesicki ($3,600), Roman Wilson ($3,200), Malik Washington ($4,000), Kalif Raymond ($3,600) — all [2P]. Cheap with real qualifying roles; GPP salary-savers, not core plays — check teams/game scripts before sizing.
- **Top 5 mechanical traps:** Rashee Rice ($6,400), Jaylen Waddle ($6,500), Ja'Marr Chase ($7,600), Chris Godwin ($5,600), Terry McLaurin ($5,200) — all [2P]. Godwin confirms §5. Waddle/McLaurin: name salary, thin Week 1 role signal. **Chase is flagged mechanical, not fundamental — his RotoWire line is genuinely 2-12-0 on 4 targets, but verify it's signal rather than table noise before fading a slate-breaker; Burrow is Q-but-playing.**
- **Andrews confirmed as the injury-beneficiary value:** $4,400 [2P] prices TE22/7.8 proj PPR from DK Network's 9/17 ranks — **published before Flowers's doubtful designation.** The salary hasn't caught the condensation (§2j).

---

## 5. WHAT THE DATA SAYS TO DROP (from Garrett's list)

1. **Kyle Pitts — FADE.** 5% TPRR on 81% routes, one target, zero catches (§2f). The role is a mirage.
2. **Nabers as a "tough matchup" fade is wrong-framed** — he doesn't face McDuffie; he faces LAR's zone-heavy outside corners (neutral). Don't fade on false premises; the real questions are target competition (Mooney 58.3% slot, Fields) and Dart's first-read tendencies [WR/TE-pool lane].
3. **Andrews — PLAY, but respect the script.** The role is uncontested (no Likely pivot exists — §0.16) and the pie condenses with Flowers out, but $4,400 [2P] at TE22 pricing reflects real risks: 20% drop rate and a -8.5 home-favorite Henry script. He's a value TE1, not a ceiling smash.
4. **Kyren Williams (if he was on the list)** — 61% XFP, genuine 11-10 Corum split (addendum). Not a bellcow; price must reflect committee.
5. **Skattebo at $5.9K [2P] without a discount** — 55% XFP, committee back; the "best matchup edge" narrative is real (LAR's front is Garrett-less with Donald on a reduced situational count — §0.7/§1) but the role is 55%, not 85%.
6. **Chris Godwin — TRAP.** Separation 69th of 72 WRs, 1.33 YPRR, zero RZ/deep targets (advanced-metrics lane, 2026-09-19). Name-brand $5,600 [2P] salary on a declining player — even CLE's 1.48 slot FP/route bleed can't fix 69th/72 separation.
7. **Christian Kirk — OUT** (SF IR, calf, designated to return). Remove from all consideration.
8. **LAR DST at consensus** — #1 preseason rank vs 9th-lowest pressure rate, and Myles Garrett is on IR. Play CIN/JAX instead.

---

## 6. [WEB] LANE FINDINGS

- 6a. Injury verification lane → §1, §0.6–0.10 — INTEGRATED 2026-09-19 ~11:05 CDT.
- 6b. Coverage matchups lane → §0.11–0.15, §2a/§2b/§2h/§2i/§2j/§2l, §4.I–J — INTEGRATED 2026-09-19 ~11:15 CDT. Full file: `deep/coverage-matchups-2026-09-19.md`.
- 6c. Advanced player metrics lane — INTEGRATED 2026-09-19 ~11:20 CDT (§2a/§2b/§2f/§2g/§2h/§2i/§2k/§2l, §4.K–M, §5). Full file: `deep/player-advanced-metrics-2026-09-19.md`. Verdict flips: Pitts → FADE, Bateman → conditional, Addison → conditional.
- 6d. Farrell + Andrews participation lane — INTEGRATED 2026-09-19 ~11:25 CDT (§0.16–0.18, §2i/§2j/§4.A/§5). Full file: `deep/farrell-andrews-participation-2026-09-19.md`. Thesis voided: Likely is a Giant; Andrews is uncontested; Farrell is a blocking-TE fade.
- 6e. QB full-pool lane — INTEGRATED 2026-09-19 ~11:30 CDT (§4.N–O). Full file: `deep/qb-full-pool-2026-09-19.md`. New: Geno/Brissett/Mayfield value tier; Rush/Nix/Watson fades (strengthen TB + JAX DST cases); Burrow Q-but-playing; final 30-starter list confirmed.
- 6f. WR/TE full-pool lane — INTEGRATED 2026-09-19 ~11:45 CDT (§4.T). Full file: `deep/wr-te-full-pool-2026-09-19.md` (+ `wrte-rotowire-extract.csv`, `wrte-computed.json`). New: JSN's 45.8% share (Lock caveat), Deebo on SF (20.6% share), top-5 mechanical values/traps, Andrews salary-unadjusted confirmation.
- 6g. RB full-pool + zone/gap scheme lane — INTEGRATED 2026-09-19 ~11:40 CDT (§2e/§4.D/§4.E, §4.S). Full file: `deep/rb-full-pool-scheme-2026-09-19.md`. New: 5 ELITE zone/gap mismatches (CMC, Bijan, Achane, Tuten, Hill-tell); scheme upgrades (Warren/Dowdle, Gainwell) and downgrades (Taylor, Hampton, Love, Chuba, Pollard, Kyren/Skattebo); backfield news (Kamara debut behind Etienne, Jacobs exempt list, Henderson threatening Rhamondre).
- 6h. Defensive scheme layer lane (DC tendencies) — INTEGRATED 2026-09-19 ~11:35 CDT (§4.P–R). Full file: `deep/defense-scheme-layer-2026-09-19.md`. New: 5 best/worst schematic matchups; DC corrections (PIT zone-heavy, GB blitzing, MIN blitz solved, LAC INT-luck, SF fronts); PHI/NE DST enter; JAX/TB/KC DST harden.

---

*File: `~/workspace/vendor/Sports/docs/research/2026-09-19-dk-week2/deep/advanced-matchups-deep-dive-2026-09-19.md`*
*In-repo sections complete 2026-09-19 ~11:00 CDT. §1 + §0.6–0.10 + §2c/§2d/§2h updates from injury-verification lane ~11:05 CDT. [WEB] coverage (§6b) and advanced-metrics (§6c) lanes still pending.*
