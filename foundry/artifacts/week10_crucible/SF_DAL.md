# SF @ DAL — Pre-Kickoff Retrocausal & Veto Dossier (INTERNAL — Foundry Crucible)

> **STATUS: INTERNAL ANALYSIS ARTIFACT. NOT FOR PUBLICATION. NO PICKS. NO ODDS/LINES USED AS MODEL INPUT.**
> Doctrine: 00-TRUTH-FILE rules applied (no win-rate headlines, no fabricated claims, honest gaps labeled, held-out discipline — every source below is pre-kickoff as of 2026-11-13 ~18:00 UTC; no post-cutoff information enters this artifact).
> Author: auditor-1 (GSE/GSI Foundry 45h swarm, Wave 1, deleg_71e3bafc). Generated: 2026-11-13.

---

## 0. VERIFIED GAME FACTS & ENGINE-STATE ANCHOR

| Field | Value | Source |
|---|---|---|
| Matchup | San Francisco 49ers @ Dallas Cowboys, NFL Week 10 | ESPN scoreboard (live + worktree snapshot) |
| Kickoff | **Sun 2026-11-15, 21:25 UTC = 4:25 PM EST = 3:25 PM CST = 1:25 PM PT** | ESPN scoreboard `espn_2026_week10_scoreboard.json` + live `site.api.espn.com` (both agree); Fox broadcast page confirms 4:25 ET / 1:25 PT |
| Venue | **AT&T Stadium, Arlington, TX — INDOOR-CAPABLE** (ESPN `indoor: true`, retractable roof) | ESPN scoreboard venue block |
| Roof status | **Expected CLOSED** (DK Network, Nov 13); official team confirmation not yet found — GAP | dknetwork.draftkings.com Week 10 weather; AS.com Week 10 weather |
| Broadcast | Fox (national) | ESPN scoreboard |
| SF record | 7-1 (PF 235 / PA 156, 8 games, bye W8), streak W1, NFC seed 1, road 2-1 | ESPN standings + verified game log |
| DAL record | 4-5 (PF 246 / PA 236, 9 games, bye W14), streak W1, NFC seed 10, GB 3.5; **home 1-2, road 3-2** | ESPN standings + verified game log |
| Engine artifacts | WP-8 connected workflow, branch `hermes/week10-master-launch-2026-11-13`, worktree `C:/Users/Garrett/Sports-main-merge` | repo |
| Engine dossier | `data/engine/connected_workflow_dossier_sf_dal_week10.json` (generated 2026-11-13T13:38:26Z) | worktree |
| Engine spine | `data/engine/jev_full_game_spine_sf_dal_week10.json` (updated 2026-11-13T13:34:52Z, 29 drives) | worktree |
| Coverage | `week10_coverage_audit_2026.json`: **13/13, all_green=true, 0 failures** (2026-11-13T13:41:33Z) | worktree |
| Stage-5 gate | `publishAllowed: true`, circuit breaker `STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING`, 3 approved plays / 0 approved prop bets, 47 passes | worktree call sheet |
| Foundry state | **Warming up.** Gatekeeper: 1225 books queued; 1 COMPLETE + 1 committing at check; 3 CLAIMED. `primitives/` has 2 files; `rlvr_vetoes/` empty. | `foundry/gatekeeper.py status`, `foundry/logs/swarm_status.md` |

**Foundry primitives available (drawn on below):**
- `8a1ae44d89418bd2.json` — *A Course in Machine Learning*: Bayes Optimal Classifier (Thm 8), Curse of Dimensionality / distance concentration (Eq 2.2), AdaBoost reweighting (Alg 31).
- `a84d79326cdf925d.json` — EPL match-outcome ML paper audit: **temporal train/validation/test split as anti-leakage invariant**; rolling-form + days-since-last-match fatigue proxy; **leakage red-flag primitive** (printed RF 87.14% / AUC 99.00% claims flagged as internally contradictory — standing warning against overclaiming).

Market metadata (spread/total/juice) exists inside the engine's `matchup_environment` and Stage-5 blocks. **Quarantined: none of it is used as an input to any reasoning here.** All outcome reasoning is line-free.

---

## 1. COACHING TREE & HISTORICAL SCAR AUDIT

### 1.1 Lineage (verified)

**San Francisco — HC/OC Kyle Shanahan (playcaller, year 10), DC Raheem Morris, Assistant HC Defense Matt Eberflus, LB K.J. Wright.**
- Shanahan: SF HC since 2017; engine `years_with_team=5` reflects the 2022-2026 charting window (repo `coach_tenures.py`, web-verified 2026-10-01). Wide-zone + play-action + condensed-formation institution; the league's most stable offensive identity.
- **DC Raheem Morris:** hired 2026 after **Robert Saleh left to become Tennessee Titans HC** (Yahoo "49ers Finalize 2026 Coaching Staff"; YouTube/49ers.com announcement; Schefter post). Morris is the former **ATL HC (2021-2024)** — his most recent head-coaching stop. **SF's only 2026 loss was @ATL 20-29 (W7)** — Morris's former team. This is a live emotional/proof state for the new DC (retrocausal, Section 1.3).
- **Assistant HC Defense Matt Eberflus:** former **DAL DC (2025)**, CHI HC (2022-2024), IND DC (2018-2021). **He left Dallas for San Francisco in 2026** (ESPN "49ers adding Matt Eberflus to defensive staff"; dallascowboys.com "Past/Present" note). Eberflus carries **intimate knowledge of DAL's protections, audibles, and personnel** — and DAL carries the institutional memory of his departure. This is a two-way theory-of-mind channel (Section 2.5).
- Engine attribution: SF playcaller = Kyle Shanahan (HC, offense, years=5, confidence=1) — matches repo CSV.

**Dallas — HC Brian Schottenheimer (year 2 as HC), DC Christian Parker (year 1, youngest DC in franchise history).**
- Schottenheimer: DAL OC 2023-2024 under Mike McCarthy → HC 2025 (repo `coach_tenures.py` shows McCarthy DAL 2023-24 → PIT 2026; Schottenheimer confirmed as current HC by ESPN injury-feed comments, Nov 12-13). Pass-game background (QB coach lineage); the offense is Dak-centric, vertical-shot heavy (DAL deep rate 7.1%, avg air 7.62).
- **DC Christian Parker: hired Jan 22, 2026, age 34 — youngest DC in Cowboys history** (dallascowboys.com official bio). Lineage: **PHI defensive pass-game coordinator/DBs (2024-25)** — PHI led the NFL in pass defense (182.0 ypg) and won Super Bowl LIX; developed Quinyon Mitchell and Cooper DeJean. **DEN DB coach (2021-23)** under Vic Fangio, Nathaniel Hackett, Sean Payton — developed Pat Surtain II. **GB defensive QC (2019-20)**. **Fangio-tree DB specialist** installing a split-safety/match system.
- **Institutional pressure:** Schottenheimer **publicly reaffirmed Parker's role** amid "evaluating coaching adjustments" (Yahoo Sports). A first-year DC whose scheme is being publicly backed mid-season is a **high-leverage panic/comfort risk**: when the system is questioned, the tendency is to over-blitz or over-simplify. DAL allows **26.2 pts/g (236/9)** despite a star front (Section 2.3) — the scheme/personnel fit is the suspect.
- **Engine gap:** DAL `playcaller` profile = `{}` — `coach_offense.csv` has **no 2026 DAL row**. DAL tendencies below are team-level, not coach-attributed. Labeled gap.

### 1.2 Situational priors (engine 2026 PBP; ACTUAL sample sizes)

Source: `stage1a_coaching_mind_and_schemes.team_coaching_mind_profiles` + `coaching_tendencies_resolved` (from `coach_offense.csv`/`coach_defense.csv` 2026 rows). **Small samples** (SF n=160 charted plays, DAL n=161; situational n much smaller). James-Stein shrinkage 0.62 applied. Shrunk priors, not laws.

| Situation | SF (Shanahan) | DAL (team-level, Schottenheimer) |
|---|---|---|
| 3rd-down pass rate | **85.2%** | 63.9% |
| 3rd-and-short pass rate | 40.0% (run-leaning) | 42.9% |
| **4th-down go rate** | **0.0% (n=10)** | 20.0% (n=25) |
| **2-pt attempt rate** | **0.0% (n=13 TDs)** | 16.7% (n=6 TDs) |
| Red-zone pass rate | 56.7% | 57.1% |
| Pass rate when trailing | 62.5% | 61.5% |
| Pass rate when leading | 49.6% | 51.0% |
| Median pace (sec) | 38.0 | 36.0 |
| No-huddle rate | 0.6% | 3.1% |
| Quick-game rate | 49.4% | 52.4% |
| Play-action rate | 18.8% | 14.6% |
| Deep rate / avg air yds | 6.0% / 7.51 | 7.1% / 7.62 |
| DC blitz rate / man rate | SF: **32.4%** / 36.2% | DAL: 24.6% / 33.9% |

**High-leverage read:** Shanahan is **extreme on 3rd down (85% pass) and extreme-conservative on 4th/2pt (0/10, 0/13)**. The 0% rates are small-n (10 fourth downs, 13 TDs) — flag, don't over-extrapolate — but the *direction* is unambiguous: SF will punt/FG on 4th and kick PATs. DAL is more willing to gamble (20% 4th, 16.7% 2pt). **The clash:** SF's 85% 3rd-down pass rate forces DAL's nickel/dime packages to stay on the field — and DAL's secondary is depleted (Section 2.3). Parker's first-year instinct under pressure will be to blitz (DAL 24.6%) or simplify coverage; both are exploitable by Shanahan's quick-game + PA answer. Conversely, Shanahan's 4th-down conservatism means **SF will hand DAL extra possessions** in a close game — a structural lever DAL's more aggressive 4th-down posture can exploit.

### 1.3 Institutional scars & retrocausal state (verified game log, ESPN scoreboards W1-W9)

**SF 2026 path:** W @LAR 27-7 → W MIA 35-13 → W ARI 36-30 → W DEN 24-14 → W @SEA 32-29 → W WSH 23-17 → **L @ATL 20-29 (W7)** → bye W8 → **W LV 38-17 (W9)** = 7-1, W1, NFC seed 1.
- **The only loss is @ATL — Raheem Morris's former team.** The new DC's proof/revenge emotional state is a live hidden variable. SF's defense allowed 29 in that game (season high); PA otherwise 156/8 = 19.5/g. The ATL loss is the scar the Morris unit is answerable for.
- SF is the league's most efficient offense in the engine: **off EPA +0.1774, pass EPA +0.2473, completion 69.5%, sack rate allowed 3.23%** (elite protection). PF 29.4/g.
- **W9 vs LV:** Kaelon Black 11 car/70 yds, Jordan Watkins 4/4/86 yds/TD, Jaden Dugger pick-six (ESPN feed). CMC not on injury report → presumed active (GAP: snap-count workload management unverified).
- **Roster churn scars:** **Brandon Aiyuk reinstated from reserve/left-squad list Monday Nov 9** (personal reasons), granted a **two-week roster exemption** — engine excludes him as "OUT - knee" + owner ban; **feed says personal/left-squad**. Reason conflict flagged; either way he is unavailable. **Mike Evans (Achilles tendinitis) Q** — Shanahan: *"very close… would probably play if it were a playoff game"* (ESPN Nov 13) → **likely OUT for a regular-season Week 10 game**. **Deebo Samuel (hamstring) Q**, limited Thu. **Keenan Allen acquired from IND at Tuesday's trade deadline** (2027 6th-round pick) — **mid-week integration**, new terminology, limited reps. **Mac Jones trade rumors** — expected to stay (ESPN). The receiving room is in flux.

**DAL 2026 path:** L @NYG 20-28 → W WSH 37-20 → L BAL 31-34 → **W @HOU 34-30 (W4)** → **L TB 16-24 (W5, home)** → L @GB 13-23 → W @PHI 38-21 → **L ARI 30-33 (W8, home)** → **W @IND 27-23 (W9)** = 4-5, W1.
- **Home 1-2 (L TB, L ARI), road 3-2.** DAL is *better away from AT&T Stadium* this season. The W8 home loss to ARI 30-33 (shootout, defense allowed 33 to Arizona) is the freshest home scar.
- **W9 @IND:** Dak 21/34, 335 yds, 2 TD, 0 INT (lost a fumble); Lamb 10/16, 195 yds, TD (lost a fumble); Javonte Williams 20 car, 101 yds, TD; Caleb Downs INT; Jake Ferguson OUT (knee, multi-week). **Two lost fumbles in a 4-point win** — ball security is a live tail risk.
- **Eberflus departure → SF:** DAL's 2025 DC now coaches SF's defense. Institutional betrayal narrative + knowledge transfer (Section 2.5).
- **Parker hot seat:** public backing amid "coaching adjustments" (Yahoo). First-year DC, youngest in franchise history, scheme questioned, 26.2 PA/g. High-leverage panic risk.
- **Shared-opponent link:** DAL beat HOU 34-30 in Houston (W4) — the same HOU offense that just scored 44 at LAC. DAL's defense has seen this slate's texture.

**Prior meetings (verified):**
- **Last meeting: Oct 27, 2024 (Week 8, SNF) — SF 30, DAL 24 in San Francisco** (ESPN 2024 schedule; Wikipedia 49ers–Cowboys rivalry; statmuse; 49ers.com "Five Takeaways").
- **No 2025 regular-season meeting** (ESPN 2025 team schedules, both checked). Wikipedia lists "Next meeting: November 15, 2026."
- **SF has won FOUR straight (2022-present):** 2021 Wild Card @DAL 23-17; 2022 Divisional @SF 19-12; 2023 Week 5 @SF **42-10**; 2024 Week 8 @SF 30-24 (Wikipedia rivalry page: "Current win streak: 49ers 4 (2022-present)").
- **All-time series: SF 21-19-1; playoffs DAL 5-4** (Wikipedia). The two DAL home playoff losses (2021, 2022) are the deep institutional scar — **DAL cannot beat SF at home in January, and now must do it in November with a first-year DC.**
- Largest SF victory: 42-10 (2023). The psychological weight is asymmetric: SF expects to win this matchup; DAL carries four consecutive failures.

**Retrocausal summary:** Saleh → TEN → Morris hired (ATL revenge state) + Eberflus → SF (DAL knowledge/betrayal channel). Parker hired young from PHI (Fangio tree) → scheme/personnel mismatch → 26.2 PA/g → public backing → panic risk. SF 7-1 with one ATL scar + receiving-room churn (Aiyuk personal, Evans Achilles, Deebo hamstring, Keenan Allen new). DAL 4-5, home-weak, four straight losses to SF, two W9 fumbles. **The current state is a collision of SF's institutional confidence against DAL's institutional dread, mediated by a first-year DC and a depleted DAL secondary.**

---

## 2. QB & TRENCHES COGNITIVE-BIOMECHANICAL VETO CHECK

### 2.1 QB cognitive-biomechanical profiles (engine; ASSUMED-status, relative ranking only)

`qb1_visual_cognitive_load` (engine label: *"not a probability and not an interception forecast; a relative difficulty score for ranking reps"*; assumptions *"ASSUMED - validated against nothing yet"*):

| Metric | SF (Purdy) | DAL (Dak) |
|---|---|---|
| Visual cognitive load index | **0.1461** | **0.2427** (highest of the four teams in this slate pair) |
| MOT overload penalty | 0.0 | 0.18 |
| Targets over capacity | 0.0 | 1.0 |
| Saccadic read latency (ms) | 208.4 | 218.9 |
| Quiet-eye retention ratio | 0.9437 | 0.9213 |
| Pocket compression | 0.125 | 0.175 |

**Caveat:** components are template-derived (near-identical across games); treat as coarse ranking. **Dak's modeled processing environment is the most loaded of the four QBs** — consistent with DAL's depleted receiving corps (Ferguson OUT, Pickens Q) forcing more progression reads, and with the engine's `home_comp_rate_adj 0.5016` (down from 0.6449 team base). Purdy's environment is modeled clean — but that predates the WR-room churn (Section 2.3) and is optimistic if Evans/Deebo sit.

**Internal-clock / pressure reasoning (line-free, qualitative):**
- **Both OLs are elite in the engine PBP:** SF sack rate allowed **3.23%**, DAL **2.47%**; pressure-allowed SF 38.0%, DAL 33.6%. This is a **clean-pocket game by default** — the opposite of HOU@CLE. The veto is not chronic pressure; it is **acute, health-conditional pressure**.
- **SF protection singularity: LT Trent Williams Q (shoulder, limited Thu; backup Vederian Lowe).** Williams is the keystone of the league's best pass-protection unit. **If he sits, Lowe vs DAL's healthy star front (Quinnen Williams, Kenny Clark, Rashan Gary, Von Miller — all no designation) is a singular mismatch.** Purdy's clean-pocket prior (0.1461 load) collapses on the left edge. This is the game's most important health-conditional veto.
- **DAL protection:** OL fully healthy (Guyton/Smith/Beebe/Booker/Steele, no designations). Dak's pocket is structurally sound; his elevated load index is a *receiving-corps* problem, not a protection problem. SF blitzes **32.4%** (engine) — the highest of the four DCs — into DAL's quick game (52.4%). Dak's hot-read accuracy vs Morris/Eberflus blitz timing is the cognitive duel.
- **Dak ball security:** two lost fumbles in W9 (Dak + Lamb). Under SF's blitz pressure (32.4%) with a depleted secondary behind it, the fumble/strip tail is live. **Not modeled as a probability here; labeled behavioral risk.**

### 2.2 Trenches & personnel singularity (verified depth charts + injuries)

Depth source: nflverse `depth_charts_2026.csv` (worktree), latest dt **2026-11-13T07:02Z**. Injury source: ESPN league injuries feed, timestamp **2026-11-13T17:47Z** (per-team endpoints returned `{}` — league feed + nflverse used; flagged).

**SF receiving room — degraded (the offensive veto):**
- **WR1 Mike Evans Q (Achilles tendinitis)** — Shanahan "would probably play if it were a playoff game" → **likely OUT** (ESPN Nov 13).
- **WR2 Deebo Samuel Q (hamstring, limited Thu)** (ESPN Nov 13).
- **Brandon Aiyuk OUT** — reinstated from reserve/left-squad Nov 9 (personal), two-week roster exemption. **Engine says "OUT - knee" + owner ban; feed says personal/left-squad — reason conflict flagged.** Unavailable either way.
- **Keenan Allen** — acquired from IND Tuesday (2027 6th-round pick); **mid-week integration**, limited reps (ESPN Nov 13).
- **Both starting WRs (Evans, Deebo) are Q on the depth chart.** If both sit, SF fields Keenan Allen (new) + Brandin Cooks + Demarcus Robinson + Jordan Watkins + Ricky Pearsall (no designation). **The engine's SF pass-yards projection (356.6) and 69.5% completion prior assume a healthier room than the announced injury state.** This is a downward-risk veto on the sealed offensive output.
- **TE George Kittle** (rank 1, no designation → active), **RB Christian McCaffrey** (rank 1, no designation → active; 234 carries/8 games in engine; workload management unverified — GAP). The run game + Kittle are the stability anchors if WRs sit.

**SF defense — secondary depleted (the counter-veto):**
- CB **Deommodore Lenoir Q (foot, limited Thu)**, CB **Renardo Green Q (back, limited Thu)**, NB **Upton Stout Q**, CB **Siran Neal Q** (ESPN Nov 13). **Four DBs Q.**
- Front healthy: RDE **Nick Bosa**, LDE **Keion White**, RDT **DeForest Buckner**, LDT **Osa Odighizuwa** (no designations). LB **Fred Warner** (no designation), **Dre Greenlaw Q (knee, limited Thu)**, Jaden Dugger (W9 pick-six).
- FS Ji'Ayir Brown, SS Malik Mustapha (no designations).
- **The veto:** SF's blitz-heavy scheme (32.4%) with **four Q defensive backs** behind it is a big-play risk if DAL's Lamb/Pickens win ISO. Morris must choose between blitz pressure (his comfort) and coverage integrity (his depleted personnel). **This is the OC-comfort vs DC-trap clash in reverse: SF's DC comfort is the trap DAL's OC can exploit.**

**DAL receiving/secondary — depleted (the offensive + defensive veto):**
- **TE Jake Ferguson OUT (knee, multi-week)** (ESPN Nov 13; engine excludes ✓). **TE Luke Schoonmaker — STATUS CONFLICT:** engine excludes "OUT - knee"; ESPN feed (Nov 11) says **full participant Wednesday (groin)**, status "Active"; depth chart TE2 = **Brevyn Spann-Ford**. **Either way DAL's TE room is thin** (Ferguson out, Schoonmaker uncertain/groin, Spann-Ford the depth). Flagged conflict; do not silently resolve.
- **WR George Pickens Q (hamstring)** — "moved well Thursday," Schottenheimer positive (ESPN Nov 12) → **likely plays, limited**. WR1 CeeDee Lamb (no designation; 195 yds W9).
- **RB Tyler Goodson OUT (ACL/MCL sprain)** (engine + feed). RB1 Javonte Williams (no designation; 101 yds W9).
- **Secondary: SS P.J. Locke OUT (concussion)** (engine + feed ✓; backup Markquese Bell). **CB Joey Porter Jr. Q (ankle, DNP Wed)** (backup Cobie Durant). **FS Alijah Clark Q** (backup). **S Juanyeh Thomas Q**. **CB Devin Moore — designated to return from IR (hip) Wed**; **engine says IR ankle — detail conflict flagged**.
- **DAL front fully healthy:** LDE Quinnen Williams, RDE Kenny Clark, NT Otito Ogbonnia, LB Rashan Gary, Von Miller, Donovan Ezeiruaku (no designations). **The front is the strength; the secondary is the wound.** SF's depleted WRs meet DAL's depleted secondary — **the two wounds partially cancel**, which is why the sealed SF win probability (0.607) is not obviously wrong despite the receiving-room churn.

### 2.3 Venue weather / roof boundary (ACTUAL forecast, cited; engine environment is WRONG)

**Outdoor forecast (Arlington, TX — relevant ONLY if roof opens):**
- **DK Network (Nov 13):** Arlington **62% chance of rain showers pregame through 6 PM ET**, steady E wind; AT&T Stadium **"Retractable roof, expected closed."**
- **WeatherBug 10-day / Weather Underground (KGKY Mansfield):** Sunday **high ~53°F, E wind 10-15 mph, rain chance 90-100%, ~0.5 in rainfall**, "showers, cooler."
- **AS.com Week 10 weather:** Cowboys the biggest weather watch; *"AT&T Stadium has a retractable roof, so the weather should not affect the game if it is closed."*

**Roof status: expected CLOSED (DK Network). Official team announcement not found — GAP.** ESPN venue `indoor: true`. If closed: climate-controlled (~70°F), no wind, no rain → **weather is a non-factor**.

**ENGINE VETO (environment block is wrong for this game):** the sealed `matchup_environment` carries **`is_indoor: false`**, venue "DAL Home Venue", and the **generic outdoor placeholder (58°F, 7.5 mph, precip 0.1)**. AT&T Stadium is indoor-capable and the roof is expected closed. **The engine applied an outdoor weather model to an indoor game.** Consequences:
- `fg_make_prob_delta −0.0406` (weather-driven kicking downgrade) is **suspect for DAL home kicks** — indoor conditions should not carry an outdoor wind/cold penalty. (Brandon Aubrey kicks indoors.)
- The outdoor placeholder is *also* wrong in magnitude vs the actual outdoor forecast (53°F, E 10-15, 62-90% rain) — so even the "if roof opens" contingency is mis-parameterized.
- **If the roof OPENS:** rain + 53°F + E wind 10-15 degrades the passing game. **SF is more pass-dependent** (69.5% completion, pass EPA +0.2473, 85% 3rd-down pass) than DAL (run-heavy W9, Javonte 101 yds). **A roof-open game is a DAL-upset tail** — it vetoes SF's primary offensive domain. This is the single largest weather-conditional swing in the slate pair.

### 2.4 Travel / circadian & theory-of-mind clash

- **SF → DAL: +2 hours eastward (PT→CT).** Kickoff 4:25 PM ET = 3:25 PM CT = **1:25 PM PT body clock** — an early-afternoon start for a West Coast team, mild phase-advance drag. Both teams played Sunday W9 (standard rest). Week 9 packet L08 (LV@SF context) showed circadian delta +0.0041 for a same-timezone home game; the +2h eastward shift here is larger but still within normal NFL travel tolerance. **Minor circadian drag, not a primary veto.** SF road record 2-1 (only loss @ATL).
- **DAL: no travel**, but **home 1-2** — the home environment is not a comfort this season; it is a scar venue (L TB, L ARI).

**Theory-of-mind (OC comfort vs DC trap):**
- **Shanahan's comfort:** wide zone + PA (18.8%) + 85% 3rd-down pass + condensed formations. He believes he can stress a young DC's nickel/dime rules until they break. **DAL's depleted secondary (Locke OUT, Porter Q, Clark Q, Thomas Q) is exactly the personnel that breaks under 85% 3rd-down pass volume.**
- **Parker's trap (and panic risk):** PHI-style split-safety match, Fangio-tree DB technique. His comfort is coverage integrity; his panic instinct (first-year DC, publicly backed, 26.2 PA/g) is to **over-blitz or over-simplify**. DAL blitz 24.6% into SF quick game (49.4%) + PA → Shanahan's answers are built for this. **The trap is aimed at Shanahan's comfort, but the trapper is inexperienced and under pressure.**
- **Eberflus knowledge channel (two-way):** Eberflus was DAL DC 2025 → now SF assistant HC defense. **SF knows DAL's protections, audibles, and tendencies from the inside.** DAL knows Eberflus's blitz patterns and coverage rules from the inside. **This is a mutual theory-of-mind duel:** SF can script against DAL's known habits; DAL can anticipate SF's Eberflus-influenced pressures. The net is *not* obviously one-sided — it raises the variance of the opening script (both sides have inside information).
- **Morris ATL revenge state:** SF's only loss was @ATL (Morris's former team). The new DC is coaching for proof. **Emotional arousal can sharpen focus or induce over-aggression** (blitz 32.4% is already the highest of the four DCs). With four Q DBs behind it, over-aggression is the dangerous direction.
- **DAL institutional dread:** four straight losses to SF, two home playoff scars, first-year DC, Eberflus "betrayal." **The hidden state is fear of the familiar opponent.** Fear produces either tight, conservative play-calling (Schottenheimer's pass-game background may default to quick game + run) or desperate aggression (4th-down gambles, 20% go rate). Both are exploitable.

---

## 3. GRAY-ZONE CONTEXTUAL TRIANGULATION + LINE-FREE OUTCOME DISTRIBUTION

### 3.1 Where one domain vetoes another

| # | High-EV domain | Vetoing domain | Net effect |
|---|---|---|---|
| V1 | SF passing offense (356.6 yds, 69.5% comp prior) | **Evans Q (likely out) + Deebo Q + Aiyuk out + Keenan Allen new** | Downward risk on sealed SF pass output; run game + Kittle are the anchors. |
| V2 | SF clean-pocket prior (3.23% sack allowed) | **Trent Williams Q (shoulder); Lowe vs healthy DAL star front** | **Protection singularity.** If Williams sits, Purdy's left edge is a singular mismatch. |
| V3 | SF blitz comfort (32.4%, Morris) | **Four SF DBs Q (Lenoir/Green/Stout/Neal)** | Blitz pressure with depleted coverage behind = DAL big-play tail (Lamb/Pickens). |
| V4 | DAL offensive efficiency | **Ferguson OUT multi-week + Schoonmaker status conflict + Goodson OUT** | TE room thin; DAL quick-game + run leans on Lamb/Pickens/Javonte. |
| V5 | DAL coverage integrity (Parker PHI-style) | **Locke OUT + Porter Q + Clark Q + Thomas Q + first-year DC panic risk** | SF 85% 3rd-down pass volume stresses the weakest DAL domain. |
| V6 | Weather-normalized kicking / passing | **Engine `is_indoor: false` + outdoor placeholder; roof expected CLOSED** | **Environment block wrong.** Indoor → weather non-factor; fg delta −0.0406 suspect. Roof-open → DAL-upset tail. |
| V7 | DAL home-field comfort | **Home 1-2 (L TB, L ARI) + four straight SF losses + playoff scars** | Home venue is a scar, not a comfort. Institutional dread is hidden state. |

### 3.2 Sealed engine state (reported as-is — not a headline)

From `connected_workflow_dossier_sf_dal_week10.json` Stage-2/3 and the verified call sheet:
- **away_win_prob (SF) = 0.607**; score means **SF 25.85 / DAL 22.35**; total mean **48.2**; margin std **13.70**; total std **14.31**.
- Team projections: SF pass yds 356.6 / rush 128.0 / TO 1.28; DAL pass 312.0 / rush 124.0 / TO 1.40.
- Load-bearing deltas: `away_off_epa_adj +0.0505`, `home_off_epa_adj +0.0213`, `away_comp_rate_adj 0.6941`, `home_comp_rate_adj 0.5016`, situational away −0.0189 / home +0.0173, `fg_make_prob_delta −0.0406`, `mega_sweep_5track_7step_epa_delta +0.04409`, CQR ×1.08, Student-t df 4.5, James-Stein 0.62.
- **Caveats:** the `injury_impact_overlay` is labeled **"Full Starter Strength"** for both teams despite DAL's TE depletion and SF's WR Qs — the overlay label is generic and does not reflect the announced injury state. The environment block is outdoor (wrong). The sealed numbers are a *starting anchor*, not a calibrated forecast for the actual personnel/roof state.

### 3.3 Line-free outcome distribution sketch (scenario-conditional, honest)

**Method note (foundry-grounded):** Bayes-optimal classifier (8a1ae44d) frames the posterior over game states; curse-of-dimensionality / distance concentration (Eq 2.2) justifies shrinkage on ~160-play samples; temporal-split anti-leakage invariant (a84d79326) forbids post-kickoff information; leakage red-flag primitive warns against headlining accuracy. **Ranges below are conditional model outputs with explicit uncertainty, not predictions.**

**Central case (roof closed, Williams plays, Evans out / Deebo limited, DAL secondary depleted):**
- SF win probability **~0.55-0.65** (engine point 0.607; widened for small-n priors, CQR ×1.08, df-4.5 tails, and the offsetting injury vetoes). Mean total ~48, margin std ~13.7.
- **The two wounds partially cancel:** SF's degraded WRs meet DAL's degraded secondary. SF's run game (CMC + Kittle) and elite OL are intact; DAL's front is intact but its secondary and TE room are not. The net favors SF modestly, consistent with the sealed anchor — **but the anchor's "Full Starter Strength" label overstates health on both sides.**

**Key tail scenarios:**
1. **Trent Williams OUT + Evans/Deebo OUT:** SF offense becomes one-dimensional (CMC + Kittle + new Keenan Allen) behind a backup LT vs Quinnen/Kenny Clark/Gary/Miller. Purdy's clean-pocket prior collapses. **DAL upset path** via front-four pressure + ball-control (Javonte) + Lamb/Pickens ISO vs SF's Q DBs. This is the highest-impact health tail.
2. **Roof OPENS (rain, 53°F, E wind 10-15):** SF's pass-dependent offense (85% 3rd-down pass, 69.5% comp) degrades more than DAL's run-heavy approach. **Low-scoring DAL upset tail.** Weather vetoes SF's primary domain. (Roof expected closed; this is the contingency, not the base case.)
3. **DAL secondary collapse (Locke OUT + Porter OUT + Clark limited):** SF's 85% 3rd-down pass volume + PA finds open windows even with backup WRs. **SF blowout / over-48 tail** (the 42-10 / 30-24 historical template; engine SF pass yds 356.6 already elevated).
4. **Parker first-year DC high-leverage panic:** over-blitz into Shanahan quick game/PA, or over-simplify coverage; DAL's 20% 4th-down go rate vs SF's 0% → **DAL steals extra possessions in a close game**; Shanahan's conservatism hands DAL the ball. **Close-game / DAL-cover tail** driven by coaching leverage, not talent.
5. **Morris over-aggression (ATL revenge arousal) + four Q DBs:** SF blitzes 32.4% with depleted coverage behind → **DAL big-play shootout tail** (Lamb 195-yd W9 template, Pickens vertical). DAL's offense is top-half scoring (27.3/g); this is a live over-48 path even with roof closed.
6. **Dak ball security:** two W9 lost fumbles + SF blitz 32.4% → **strip/fumble tail** in DAL's own territory. Behavioral risk, labeled, not quantified.
7. **Eberflus knowledge duel:** mutual inside information raises opening-script variance. **Scripted-explosion tail for either side** in the first quarter; net direction indeterminate (GAP).

### 3.4 Deltas mapped onto the Week 10 engine state

| Engine lever | Sealed value | What changes it | Direction if triggered |
|---|---|---|---|
| `away_comp_rate_adj` | 0.6941 | Evans/Deebo out, Keenan Allen new | Downward (receiving room degraded) |
| SF pass yds proj | 356.6 | Same | Downward risk; run/Kittle anchor |
| `away_off_epa_adj` | +0.0505 | Trent Williams out | Downward (LT singularity) |
| `fg_make_prob_delta` | −0.0406 | Roof closed (indoor) | **Suspect / should be ~0 for DAL home kicks** |
| `matchup_environment.is_indoor` | false | Actual roof expected closed | **Wrong; rebuild to indoor** |
| DAL `home_comp_rate_adj` | 0.5016 | Ferguson out + Pickens limited | Already downgraded; TE depletion reinforces |
| SF blitz prior | 32.4% | Four DBs Q | Blitz efficacy risk; coverage integrity drops |
| `injury_impact_overlay` | "Full Starter Strength" | Actual injury state | **Generic label; does not reflect DAL TE / SF WR depletion** |
| `situational_multipliers_unfitted` | true | — | Engine flags unfitted; not calibrated |

### 3.5 Engine hygiene flags (for WP-8 follow-up, not corrected here)

1. **`matchup_environment.is_indoor: false`** for an indoor-capable stadium with roof expected closed — **environment block wrong**; outdoor placeholder (58°F/7.5 mph) mis-parameterized even for the roof-open contingency (actual 53°F/E 10-15/62-90% rain).
2. **`fg_make_prob_delta −0.0406`** applied to an indoor game — weather-driven kicking penalty suspect for DAL home kicks.
3. **`injury_impact_overlay` "Full Starter Strength"** for both teams despite DAL TE depletion (Ferguson OUT, Schoonmaker conflict) and SF WR Qs (Evans/Deebo) — generic label, not injury-reflective.
4. `trench_and_pocket_physics` carries **JAX/BAL/Fagnano key names** — template residue; values mapped to away/home but keys wrong.
5. `branch_a_tuten_out_primary` / `branch_b_tuten_active_limited_contingency` — **"Tuten" template residue**; both "Full Starter Strength", differ <0.5 pt. Injury-contingency machinery produced **no meaningful differentiation**; the WR/TE/secondary depletion and roof contingency are **not represented** in the branch structure.
6. `matchup_environment` carries **market metadata** (spread/total/juice) — quarantined from this dossier; environment should be rebuilt from actual roof/forecast.
7. **Schoonmaker status conflict** (engine OUT-knee vs ESPN full-participant-Wed-groin/Active) and **Aiyuk reason conflict** (engine knee vs feed personal/left-squad) and **Devin Moore detail conflict** (engine IR-ankle vs feed hip/designated-to-return) — flagged, not silently resolved.
8. DAL `playcaller` profile `{}` — no 2026 DAL row in `coach_offense.csv`.

### 3.6 Data gaps (labeled, not filled)

- **Official roof announcement:** expected closed per DK Network; team confirmation not found. GAP.
- **Trent Williams final status:** Q (shoulder), limited Thu; game-time decision. GAP.
- **Mike Evans / Deebo Samuel final status:** Q; Shanahan comment suggests Evans likely out. GAP.
- **Schoonmaker status:** engine vs feed conflict. GAP.
- **Christian McCaffrey workload management:** no injury designation; 234 carries/8 games; snap-count plan unverified. GAP.
- **DAL playcaller coach-attribution:** engine profile empty. GAP.
- **Eberflus knowledge-duel net direction:** mutual inside information; indeterminate. GAP.
- **ESPN per-team `/injuries` and `/depthchart` endpoints returned `{}`** — league feed + nflverse used. Method note.
- **Foundry primitives:** only 2 books complete at check; corpus warming. Conclusions draw on 2 primitives + engine state, not a mature corpus.

---

## 4. DOCTRINE COMPLIANCE CHECKLIST

- [x] No win-rate headlines — probabilities presented as conditional model outputs with explicit uncertainty and scenario branches.
- [x] No fabricated claims — every factual claim sourced (ESPN, DK Network, WeatherBug/WU, AS.com, Yahoo, ESPN Oyefusi/Eberflus, NFL.com, team sites/bios, Wikipedia rivalry, repo engine artifacts, foundry primitives).
- [x] No odds/lines used as model input — market metadata quarantined; all reasoning line-free.
- [x] Held-out discipline — all sources pre-kickoff as of 2026-11-13 ~18:00 UTC; temporal-split anti-leakage invariant honored; no post-cutoff information.
- [x] Honest gaps labeled (Section 3.6), not filled with guesses.
- [x] Internal artifact — not published, no picks posted.
- [x] Engine state referenced explicitly (WP-8 worktree, branch, artifact paths, timestamps, coverage 13/13).
- [x] Foundry state reported (warming; 2 primitives drawn on).

**END OF DOSSIER — SF @ DAL**
