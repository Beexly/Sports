# HOU @ CLE — Pre-Kickoff Retrocausal & Veto Dossier (INTERNAL — Foundry Crucible)

> **STATUS: INTERNAL ANALYSIS ARTIFACT. NOT FOR PUBLICATION. NO PICKS. NO ODDS/LINES USED AS MODEL INPUT.**
> Doctrine: 00-TRUTH-FILE rules applied (no win-rate headlines, no fabricated claims, honest gaps labeled, held-out discipline — every source below is pre-kickoff as of 2026-11-13 ~18:00 UTC; no post-cutoff information enters this artifact).
> Author: auditor-1 (GSE/GSI Foundry 45h swarm, Wave 1, deleg_71e3bafc). Generated: 2026-11-13.

---

## 0. VERIFIED GAME FACTS & ENGINE-STATE ANCHOR

| Field | Value | Source |
|---|---|---|
| Matchup | Houston Texans @ Cleveland Browns, NFL Week 10 | ESPN scoreboard (live + worktree snapshot) |
| Kickoff | **Sun 2026-11-15, 18:00 UTC = 1:00 PM EST = 12:00 PM CST** | ESPN scoreboard `espn_2026_week10_scoreboard.json` + live `site.api.espn.com` scoreboard (both agree) |
| Venue | **Huntington Bank Field, Cleveland, OH — OUTDOOR** (ESPN `indoor: false`) | ESPN scoreboard venue block |
| Broadcast | Fox (national) | ESPN scoreboard |
| HOU record | 3-5 (PF 209 / PA 192, 8 games, bye W8), streak W1, AFC seed 11, GB 4 | ESPN standings (season 2026, fetched 2026-11-13) |
| CLE record | 5-4 (PF 161 / PA 196, 9 games, bye W11), streak L2, AFC seed 8, GB 2.5 | ESPN standings |
| Engine artifacts | WP-8 connected workflow, branch `hermes/week10-master-launch-2026-11-13`, worktree `C:/Users/Garrett/Sports-main-merge` | repo |
| Engine dossier | `data/engine/connected_workflow_dossier_hou_cle_week10.json` (generated 2026-11-13T13:38:18Z) | worktree |
| Engine spine | `data/engine/jev_full_game_spine_hou_cle_week10.json` (updated 2026-11-13T13:29:43Z, 27 drives) | worktree |
| Coverage | `week10_coverage_audit_2026.json`: **13/13, all_green=true, 0 failures** (2026-11-13T13:41:33Z) | worktree |
| Stage-5 gate | `publishAllowed: true`, circuit breaker `STAGE_5_GAME_LINES_ACTIVE_PROP_PRICES_PENDING`, 2 approved plays / 0 approved prop bets, 43 passes | worktree call sheet |
| Foundry state | **Warming up.** Gatekeeper: 1225 books queued (Tier A 396 / B 820 / C 9); 1 COMPLETE + 1 committing at check time; 3 CLAIMED. `artifacts/primitives/` has 2 files; `rlvr_vetoes/` empty. | `foundry/gatekeeper.py status`, `foundry/logs/swarm_status.md` |

**Foundry primitives available (drawn on below):**
- `8a1ae44d89418bd2.json` — *A Course in Machine Learning*: Bayes Optimal Classifier (Thm 8), Curse of Dimensionality / distance concentration (Eq 2.2), AdaBoost reweighting (Alg 31), expected-loss formalization (Eq 1.1).
- `a84d79326cdf925d.json` — EPL match-outcome ML paper audit: **temporal train/validation/test split as anti-leakage invariant**; rolling-form + days-since-last-match fatigue proxy; **leakage red-flag primitive** (printed RF 87.14% / AUC 99.00% claims flagged as internally contradictory — a standing warning against overclaiming model accuracy).

Market metadata (spread/total/juice) exists inside the engine's `matchup_environment` and Stage-5 blocks. **It is quarantined: none of it is used as an input to any reasoning in this dossier.** All outcome reasoning below is line-free.

---

## 1. COACHING TREE & HISTORICAL SCAR AUDIT

### 1.1 Lineage (verified)

**Houston — HC DeMeco Ryans (defensive playcaller since ~W5), OC Nick Caley, DC Matt Burke (non-calling), ST Frank Ross.**
- Ryans: former SF defensive coordinator → HOU HC (2023). **Took over defensive play-calling from DC Matt Burke amid an 0-4 start** (NFL.com: "DeMeco Ryans taking over defensive play-calling duties from DC Matt Burke amid Texans' 0-4 start"). This is a mid-season power consolidation — the defense now runs through the HC's direct intent, not a delegated coordinator.
- OC Nick Caley: hired Feb 2025, age 42 at hire, Ohio native; previously **New England Pass Game Coordinator** (Belichick/Mayo tree) (houstontexans.com hire announcement; Wikipedia). NFL.com (Jun 26, 2026): Caley saw "a lot of progress" from C.J. Stroud in 2025 "and it's continuing." Belichick-tree scripting + Erhardt-Perkins-adjacent terminology is the institutional comfort zone.
- ST Frank Ross: publicly "pumped" about Cleveland conditions, called them "heavenly" despite wind anxiety in media (Yahoo Sports, Nov 2026). Institutional calm vs. external weather narrative — a small theory-of-mind tell.
- **Engine gap:** HOU `playcaller` profile = `{}` — `intelligence/coaching/data/coach_offense.csv` has **no 2026 HOU row** (only CLE/PIT/SF). HOU tendencies below are team-level, not coach-attributed. Labeled gap, not filled with a guess.

**Cleveland — HC Todd Monken (year 1, presumed offensive playcaller), DC Mike "Rudy" Rutenberg (year 1 as NFL coordinator).**
- Monken: BAL OC 2023-2025 → **CLE HC 2026, first HC job** (repo `intelligence/coaching/coach_tenures.py`, web-verified 2026-10-01; Yahoo/Dawg Pound Daily Nov 11). Kevin Stefanski fired after 2025 (same file).
- **Jim Schwartz resigned as DC in Feb 2026 after being passed over for the HC job** (NFL.com/Rapoport-Pelissero-Garafolo; The Athletic Feb 6; ESPN Oyefusi). Monken got the job; Schwartz left. This is the founding scar of the 2026 CLE defense.
- **Myles Garrett traded to the LA Rams in June 2026**; **Jared Verse** (2024 DROY, 2× Pro Bowl, 12 sacks in first two seasons) acquired in the deal (ESPN Oyefusi, Sep 2, 2026). The franchise's defensive identity person was removed four months after the coordinator who built it left.
- Rutenberg: first-time NFL coordinator; previously **ATL defensive pass-game coordinator (2025, under Jeff Ulbrich)**; career largely alongside Robert Saleh (ESPN Oyefusi, Oct 7, 2026). Monken: "[Rutenberg has] done a great job… We learned our lesson at Jacksonville" (ESPN).
- Engine attribution: CLE playcaller = Todd Monken (HC, offense, years=1, confidence=1) — matches repo CSV.

### 1.2 Situational priors (engine 2026 PBP; ACTUAL sample sizes, not "100 reps")

Source: `stage1a_coaching_mind_and_schemes.team_coaching_mind_profiles` + `coaching_tendencies_resolved`, derived from `coach_offense.csv` / `coach_defense.csv` (2026 rows). **These are small samples** (CLE n=164 charted plays, HOU n=163; situational n much smaller). Engine applies James-Stein shrinkage 0.62. Treat every rate as a shrunk prior, not a law.

| Situation | CLE (Monken) | HOU (team-level, Caley) |
|---|---|---|
| 3rd-down pass rate | 58.3% | 67.2% |
| **3rd-and-short pass rate** | **39.1% (run-leaning)** | 44.4% |
| 4th-down go rate | **25.0% (n=24)** | 15.0% (n=20) |
| 2-pt attempt rate | 20.0% (n=5 TDs) | 12.5% (n=8 TDs) |
| Red-zone pass rate | 54.2% | 53.6% |
| Pass rate when trailing | 58.4% | 64.2% |
| Pass rate when leading | 50.0% | 52.9% |
| Median pace (sec) | 37.0 | 36.0 |
| No-huddle rate | 2.4% | 4.9% |
| Quick-game rate | **63.9%** | 56.7% |
| Play-action rate | 11.3% | **21.2%** |
| RPO rate | 10.2% | 6.1% |
| Deep rate / avg air yds | 6.0% / 6.12 | 6.7% / 6.62 |
| DC blitz rate / man rate | CLE: 23.4% / 34.3% (engine) | HOU: 26.2% / 31.0% |

**High-leverage read:** Monken is a **quick-game + RPO + run-on-3rd-short** caller who will go for it on 4th (25%) and try 2-pt (20%) — aggressive at the margins, conservative in the middle. Caley's HOU is **play-action heavy (21.2%) and pass-first on 3rd (67.2%)** with a faster no-huddle pulse. The clash: HOU's PA game attacks linebackers who must respect the run; CLE's new man-first identity (below) is designed to deny exactly the quick windows Stroud's low cognitive-load profile prefers.

**CLE man-coverage source divergence (flagged, not resolved):** engine `dc_man_rate` = 34.3% (FTN/PBP-derived), but ESPN/NGS reports CLE at an **NFL-high 50% man through Week 5**, peaking at **73.3% man vs PIT (Week 4 TNF)** — highest single-game rate in the league this season (ESPN Oyefusi Oct 7, citing NGS). Different charting sources; both cited. The direction (man-heavy, rising) is consistent; the magnitude is not. Do not average them silently.

### 1.3 Institutional scars & retrocausal state (verified game log, ESPN scoreboards W1-W9)

**CLE 2026 path:** L @JAX 10-34 (W1) → W @TB 23-19 → W CAR 21-18 → **W PIT 27-24 (W4 TNF)** → L @NYJ 12-17 → W BAL 13-10 → W @TEN 27-24 → **L @PIT 6-27 (W8)** → **L @NO 22-23 OT (W9)** = 5-4, L2.
- **W1 JAX 34-10 is the founding trauma of the Rutenberg defense:** ~80% zone, only 6 pressures (fewest in the league that week), Trevor Lawrence 4 TD passes, "zero answers" (ESPN). The man-coverage pivot is a *direct retrocausal product* of that humiliation: man rate now NFL-high, disguise emphasis rising (CLE was 28th in disguise rate in 2025 at 19.8%; ATL under Rutenberg/Ulbrich was 22.9% — he wants more pre/post-snap rotation).
- **W8 @PIT 6-27 blowout** (Watson's last start before concussion) + **W9 @NO 22-23 OT loss** (Sanders' first 2026 start) = two consecutive scars of opposite texture: offensive collapse, then clutch-but-not-enough.
- **Sanders W9:** 197 yds, 2 TD (both in 4Q/OT), season-high 10.0 YPA, two 60+ yd explosives, clutch on the final drive (Yahoo/Dawg Pound Daily Nov 11). Monken called him "starter-caliber." The QB controversy is *simmering, not settled*.
- **CLE owns the NFL's worst first-quarter point differential: −55** (Yahoo/Dawg Pound Daily Nov 11). Slow starts are an institutional habit, not noise.
- **Watson revenge/contract state:** returning from a **twice-torn Achilles**; final year of his 5-year deal; **post-June-1 release planned March 2027** (Yahoo). Faces the franchise that traded him (2022). Fan hostility is explicit in coverage. "Make-or-break" start; a loss could re-open the door for Sanders (Yahoo).
- **Schedule state:** first of **four straight home games**; **bye Week 11** (Yahoo). Lookahead/letdown risk is structurally present (bye immediately after).
- Watson led the team to a 5-3 start before the concussion (Yahoo; consistent with game log: 5-2 through W7, W8 loss → 5-3).

**HOU 2026 path:** L BUF 31-36 → L CIN 6-20 → L @IND 17-19 → **L DAL 30-34 (W4, home)** → W @TEN 26-3 → W @JAX 34-31 → **L NYG 21-27 (W7, home)** → bye W8 → **W @LAC 44-22 (W9)** = 3-5, W1.
- **0-4 start → Ryans takes defensive play-calling** (NFL.com). The defense stabilized (PA 192/8 = 24.0/g) while the offense stayed streaky: 6 pts vs CIN, 17 vs IND, then 44 at LAC. Yahoo: "streaky… on the upswing… won three of their last four."
- **W7 home loss to NYG 21-27** is a bad-loss scar (Giants were weak); **W4 home loss to DAL 30-34** is a shared-opponent link (DAL beat HOU in Houston this season — relevant to the SF@DAL dossier's cross-slate texture).
- HOU is a **front-running, explosive, emotionally volatile** team: when the script works it produces 44; when it doesn't, 6. The 3-5 record hides a top-half scoring offense (26.1/g).

**Prior meetings (verified):**
- **Last meeting: 2023-season AFC Wild Card, Jan 13, 2024 — HOU 45, CLE 14 in Houston** (ESPN 2023 postseason schedule). HOU then lost @BAL 10-34 in the Divisional round.
- **No 2024 or 2025 regular-season meeting** (ESPN team schedules, both seasons checked).
- All-time series: HOU leads 8-7 incl. playoffs (nfldiscover.co.uk — **secondary source, low confidence; flagged**). The 45-14 playoff blowout is the live institutional memory for CLE's older core; Watson was on the other side of that era's HOU teams.

**Retrocausal summary (what created the current state):**
Schwartz passed over → resigns → Monken hired → Rutenberg promoted → Garrett traded → Verse in → JAX humiliation → man-first identity born. Watson concussion → Sanders OT heroics in a loss → controversy → Watson announced back → **engine gate conflict (Section 2, VETO-1)**. HOU 0-4 → Ryans consolidates defense → offense erupts W9 → streaky front-runner arrives in Cleveland as a road favorite *in the engine's line-free sim* while carrying two home-loss scars.

---

## 2. QB & TRENCHES COGNITIVE-BIOMECHANICAL VETO CHECK

### 2.1 VETO-1 (HARD): QB1 IDENTITY CONFLICT — the engine's CLE offense is modeled on the wrong announced starter

Four sources, four timestamps, **two incompatible states inside the same worktree**:

| Source | Timestamp (UTC) | CLE QB1 | Note |
|---|---|---|---|
| `week10_stage0_preflight_config.json` | 2026-11-13 **12:21** | **Deshaun Watson** | Sourced from nflverse depth chart rank-1. Carries explicit `qb1_ban_conflicts` entry: *"Stage 0 ban list annotates IR, but nflverse depth chart (latest dt) ranks this player QB1 and the week-10 injury report has no Out/Doubtful/IR row. Live starter used for simulation; ban retained for DFS rostering."* |
| `jev_full_game_spine_hou_cle_week10.json` | 2026-11-13 **13:29** | **Shedeur Sanders** | Gate-aligned (`confirmed_qb1` CLE=Sanders) |
| `connected_workflow_dossier_hou_cle_week10.json` | 2026-11-13 **13:38** | **Shedeur Sanders** | Watson in `excluded_players`: *"OUT - concussion (Neon injuries wk10 fetched 2026-11-12)"* + owner MASTER-PLAN STAGE 0 BAN 2026-11-04 (not lifted) |
| ESPN injuries feed (live) | 2026-11-13 **17:47** | **Deshaun Watson** | *"The Browns announced Wednesday that Deshaun Watson (concussion) will start Sunday's game against the Texans"* (2026-11-11); *"Sanders will return to the backup role"* |
| nflverse depth chart (worktree CSV) | 2026-11-13 **07:02** | **Deshaun Watson** (rank 1), Sanders rank 2 | Corroborates announcement |
| Web (Browns.com, ESPN/Fowler, Yahoo) | Nov 9-11 | **Deshaun Watson** | Team official + insider + fan-beat all agree |

**Finding:** The stage-0 config was regenerated from the live depth chart (Watson) and *says* "live starter used for simulation" — but the spine and dossier built 1-2 hours later ran **Sanders**, because the spine driver sources `require_week(10)` (the gate), which still held Sanders from the stale Neon injuries fetch (2026-11-12, Watson OUT-concussion). This is exactly WP-8 Pitfall #1 inverted: the gate QB1 is now the *stale* one, and the depth-chart QB1 is the *live* one. The owner ban on Watson (2026-11-04) is a governance/DFS-rostering constraint; the config note explicitly separates it from simulation eligibility — but the simulation did not honor that separation.

**Consequence (doctrine-bound):**
- The sealed HOU@CLE engine output (HOU win 0.6088, 23.38-19.88) is **SANDERS-CONDITIONAL**. It is **not a valid forecast for the announced Watson start**.
- **No silent re-run. No fabricated Watson-branch numbers.** Watson has no charted gate profile; `resolve_qb_profile` would KeyError and fall back to the hardcoded banned CLE→Watson default (WP-8 Pitfall #2) — the workflow pins `qb_name` to the gate starter, so a Watson start is *structurally unrepresentable* in the current sealed artifact.
- This dossier reports the sealed state as-is and provides a **scenario-conditional, line-free distribution** (Section 3) with the Watson branch explicitly **unquantified by the engine**.
- **Action for WP-8:** resolve gate vs. depth-chart vs. announcement before any publication; if Watson starts, the CLE offensive priors (`home_off_epa_adj −0.1914`, `home_comp_rate_adj 0.5026`) must be rebuilt, not reused.

### 2.2 QB cognitive-biomechanical profiles (engine; ASSUMED-status, relative ranking only)

`qb1_visual_cognitive_load` (engine's own label: *"not a probability and not an interception forecast; a relative difficulty score for ranking reps"*; assumptions *"ASSUMED - validated against nothing yet"*):

| Metric | HOU (Stroud) | CLE (Sanders, as sealed) |
|---|---|---|
| Visual cognitive load index | **0.1453** | **0.2272** |
| MOT overload penalty | 0.0 | 0.18 |
| Targets over capacity | 0.0 | 1.0 |
| Saccadic read latency (ms) | 208.0 | 211.5 |
| Quiet-eye retention ratio | 0.9437 | 0.9213 |
| Pocket compression | 0.125 | 0.175 |

**Caveat:** the component values are near-identical across games (template-derived); only the index and latency differentiate. Treat as a coarse ranking: **Stroud's processing environment is modeled as cleaner than Sanders'.** Watson has **no profile** — his internal-clock drift under pressure is an **unquantified gap**, not a zero.

**Internal-clock / pressure reasoning (line-free, qualitative):**
- CLE OL is the league's worst protection environment in the engine PBP: **pressure-allowed rate 77.44%, sack rate allowed 10.55%** (vs HOU 38.86% / 5.77%). Any CLE QB — Sanders or Watson — faces a compressed pocket by default.
- **Watson-specific:** twice-torn Achilles return → lower-body torque and escape-ability degraded; his historical game is rhythm + extension. A leaking OL + reduced extension = internal-clock drift risk is *higher* than the team's 5-3 record with him suggests. The 5-3 stretch came against a schedule that included CAR/TB/TEN; W8 @PIT produced 6 points. **Revenge-game arousal** (former team, hostile crowd, contract year) is a classic cognitive-tunneling amplifier: elevated first-read fixation, reduced checkdown tolerance. CLE's −55 first-quarter differential is the behavioral fingerprint of slow starts; revenge arousal can either fix it (scripted focus) or worsen it (overthrowing early).
- **Sanders-specific:** W9 showed clutch 4Q/OT processing and two 60+ explosives — his ceiling is real, but the engine's 0.5026 adjusted completion prior (down from 0.6462 team base) reflects the situational downgrade. If he starts, the engine state is valid; if Watson starts, it is not.
- **Stroud:** low cognitive load, high PA rate (21.2%), Caley's Belichick-tree scripting. The threat to his clock is **CLE's rising disguise rate** (Rutenberg's stated emphasis; 2025 CLE was 28th at 19.8%, ATL 22.9%) — pre-snap rotation that invalidates the PA read key. This is the OC-comfort vs DC-trap clash (Section 2.5).

### 2.3 Trenches & protection singularity (verified depth charts + injuries)

Depth source: nflverse `depth_charts_2026.csv` (worktree), latest dt **2026-11-13T07:02Z**. Injury source: ESPN league injuries feed, timestamp **2026-11-13T17:47Z** (per-team `/injuries` and `/depthchart` endpoints returned `{}` — league feed + nflverse used instead; flagged).

**CLE OL — three of five starters Questionable:**
- C **Elgton Jenkins Q** (hip, limited Thu; backup Luke Wypler)
- RT **Tytus Howard Q** (ankle, limited Thu; backup Dawand Jones)
- RG **Austin Barber Q** (ankle, limited Thu; backup Teven Jenkins)
- LT Spencer Fano (no designation), LG Zion Johnson (no designation)
→ **Protection singularity is real.** If all three sit, CLE fields Wypler/Jones/T.Jenkins + Fano/Johnson — a patchwork line already allowing 77% pressure. If they play limited, torque and anchor stability degrade late-game.

**HOU edge duo — BOTH Questionable (the counter-veto):**
- LDE **Will Anderson Jr. Q** (ankle, limited Thu; backup Dominique Robinson)
- RDE **Danielle Hunter Q** (hamstring, limited Thu; backup Jadeveon Clowney)
→ If both sit, HOU's pass rush loses its two best players and CLE's patchwork OL gets a reprieve. **The trench veto is bilateral and health-conditional.** This is the single most important gray-zone interaction in the game.
- HOU LG **Keylan Rutledge Q** (illness, DNP Thu; backup Wyatt Teller) — interior depth also touched.
- HOU RB: **Woody Marks Q** (knee, returned to practice Fri) and **David Montgomery Q** (groin, practiced Fri, missed past month) — depth chart RB1 Marks, RB2 Montgomery. **Both ball carriers are Q.** HOU rush EPA is already −0.1025; if both are limited, the run game collapses and HOU becomes one-dimensional into CLE's man coverage.

**CLE front seven:**
- RDE Jared Verse (rank 1, no designation), LDE Isaiah McGuire (no designation)
- LDT **Mason Graham** (rank 1; **Oct 7 ESPN: expected to miss time with MCL + ankle sprain vs PIT; NOT on current injury report → presumed active, but status unverified — GAP**)
- RDT Maliek Collins Q (returning from injury, per feed)
- LB Carson Schwesinger Q (wrist, limited Thu; blitz rate up to 18%, 23% OLB snaps per ESPN Oct 7), Quincy Williams Q (hamstring, full Thu)
- **FS Ronnie Hickman — concussion protocol** (HC Monken confirmed Wednesday, per ESPN feed). Backup Daniel Thomas. **This is a coverage-continuity veto:** CLE's deep-middle eraser is in protocol; HOU's PA game (21.2%) attacks exactly that seam.
- CB Denzel Ward Q (quad, limited Thu), Tyson Campbell (no designation), NB Myles Harden.

**HOU front seven (besides edges):** DT Tommy Togiai / Sheldon Rankins (no designation), MLB Azeez Al-Shaair Q (groin/personal, absent Thu), SS Reed Blankenship Q (concussion/hand, full Thu), FS Calen Bullock, CB Stingley/Lassiter (no designation).

### 2.4 Venue weather / turf boundary (ACTUAL forecast, cited)

**Primary: nflweather.com game page (fetched 2026-11-13), Texans @ Browns, kickoff 1 PM ET:**
- **47°F (feels like 42°F)**, wind **9 mph SE/NW, gusts 15 mph**, **Mostly Cloudy (94% cloud)**, **precip chance 8%**, humidity 71%, dew point 36°F, visibility 10 mi.
- Hourly: Q1 46°F/gusts 14, Q2 49°F/gusts 14, Q3 50°F/gusts 13, **Q4 46°F/gusts 14**, temp falling to 37°F post-game. Possible new rainfall < 0.1 in.
- (Search snippet showed 42°F/light-rain; the fetched page body shows 47°F/8% precip — **page body cited as primary**, snippet noted.)

**Corroborating:** Sharp Football Analysis NFL weather page: **45°F, 10 mph wind, gusts** (Cleveland, Sun Nov 15, 1 PM ET). BetMGM blog: historical Nov 15 averages high 51°F / low 38°F (context only, not a forecast). Yahoo: Texans ST coach Ross calls conditions "heavenly"; media wind anxiety noted.

**Engine delta:** the sealed `matchup_environment` carries a **generic placeholder (58°F, 7.5 mph, precip 0.1, "CLE Home Venue", is_indoor false)**. Actual forecast is **~11°F colder and gustier (14-15 mph)** than the placeholder. The engine already applies `fg_make_prob_delta −0.0406`; the colder, gustier reality **reinforces** that kicking downgrade. **Precip probability is low (8%) — this is a wind/cold game, not a rain game.** Deep-ball efficiency (both teams ~6% deep rate) and long FGs are the weather-vetoed domains. Turf: natural grass, outdoor (ESPN venue); cold + gusts → ball security and footing late-game are marginal concerns, not a primary veto.

### 2.5 Travel / circadian & theory-of-mind clash

- **HOU → CLE: +1 hour eastward (CT→ET).** Kickoff 1:00 PM ET = **12:00 PM CT body clock** — near-noon start, minimal phase-advance drag. Both teams played Sunday W9 (standard rest). Week 9 packet L08 (HOU@LAC context) showed circadian fatigue delta −0.0051 for a same-timezone game; the +1h eastward shift here is slightly larger but still minor. **No material circadian veto.**
- **CLE: no travel**, first of four straight home games, bye next week. Comfort + lookahead risk coexist.

**Theory-of-mind (OC comfort vs DC trap):**
- **Caley's comfort:** scripted opening, PA (21.2%), 3rd-down pass (67.2%), no-huddle pulse (4.9%). He believes he can manipulate CLE's LBs with run-action.
- **Rutenberg's trap:** man-first (NFL-high per NGS), rising disguise, Schwesinger blitz (18%). He believes Stroud's quick reads can be invalidated by pre-snap rotation and post-snap match. **The trap is aimed exactly at Caley's comfort.**
- **Monken's comfort:** quick game (63.9%), RPO (10.2%), run on 3rd-short (60.9% run). He believes he can keep the game low-possession and protect a leaking OL.
- **Ryans' counter:** consolidated defensive play-calling, blitz 26.2%, man 31.0%. He believes he can pressure a compromised CLE OL into QB error. **But his two best edges are Q** — the counter is health-conditional.
- **Hidden state:** CLE's −55 first-quarter differential means Monken's opening script is under institutional pressure to *not* fall behind early; Watson's revenge arousal (if he starts) pushes the opposite direction (aggressive early shots). These two forces conflict inside the same huddle.

---

## 3. GRAY-ZONE CONTEXTUAL TRIANGULATION + LINE-FREE OUTCOME DISTRIBUTION

### 3.1 Where one domain vetoes another

| # | High-EV domain | Vetoing domain | Net effect |
|---|---|---|---|
| V1 | CLE offensive quantification (engine priors) | **QB1 identity conflict** (gate=Sanders, announced=Watson) | **HARD VETO.** All sealed CLE offensive numbers are Sanders-conditional; Watson branch unquantified. |
| V2 | HOU pass-rush prior (blitz 26.2%, elite edges) | **Anderson + Hunter both Q** | If both sit, rush prior invalid; CLE patchwork OL reprieved. |
| V3 | CLE clean-pocket assumption | **3 of 5 OL Q + 77% pressure-allowed** | No CLE QB gets a clean pocket by default; internal-clock drift is the base state. |
| V4 | HOU run-game / PA balance | **Marks + Montgomery both Q; rush EPA −0.1025** | If both limited, HOU one-dimensional → CLE man coverage feasts. |
| V5 | Long FG / deep-ball efficiency | **47°F, gusts 14-15 mph** | Kicking downgrade reinforced (engine −0.0406 already applied); deep shots low-EV. |
| V6 | CLE deep-middle coverage continuity | **FS Hickman concussion protocol** | HOU PA seam (21.2% PA rate) is open if Hickman sits. |
| V7 | Stroud low-cognitive-load processing | **CLE rising disguise rate (Rutenberg)** | The engine's 0.1453 load index predates the disguise emphasis; treat as optimistic. |

### 3.2 Sealed engine state (reported as-is, SANDERS-CONDITIONAL — not a headline)

From `connected_workflow_dossier_hou_cle_week10.json` Stage-2/3 and the verified call sheet:
- **away_win_prob (HOU) = 0.6088**; score means **HOU 23.38 / CLE 19.88**; total mean **43.26**; margin std **13.52**; total std **14.13**.
- Team projections: HOU pass yds 268.0 / rush 108.0 / TO 1.32; CLE pass 248.0 / rush 116.0 / TO 1.48.
- Load-bearing deltas: `away_off_epa_adj −0.0445`, `home_off_epa_adj −0.1914`, `away_comp_rate_adj 0.652`, `home_comp_rate_adj 0.5026`, situational away +0.036 / home −0.0318, `fg_make_prob_delta −0.0406`, CQR width ×1.08, Student-t copula df 4.5, James-Stein 0.62.
- **These numbers are valid ONLY for a Sanders start.** They are the sealed artifact's state, not this dossier's forecast for the announced Watson start.

### 3.3 Line-free outcome distribution sketch (scenario-conditional, honest)

**Method note (foundry-grounded):** The Bayes-optimal classifier primitive (8a1ae44d) frames the outcome as a posterior over game states given priors + evidence; the curse-of-dimensionality primitive (distance concentration, Eq 2.2) justifies the engine's heavy shrinkage on ~160-play samples; the temporal-split anti-leakage invariant (a84d79326) forbids any post-kickoff information from entering this sketch. The leakage red-flag primitive (RF 87.14%/AUC 99% audited as contradictory) is a standing reminder: **do not headline a win rate.** The ranges below are *conditional model outputs with explicit uncertainty*, not predictions.

**Branch S — Sanders starts (engine as sealed):**
- HOU win probability **~0.55-0.66** (engine point 0.6088; widened for small-n priors, CQR ×1.08, df-4.5 tails, and the bilateral edge/OL health veto). Mean total ~43, margin std ~13.5.
- This branch is the only one with a sealed quantitative anchor.

**Branch W — Watson starts (ANNOUNCED; engine-unquantified):**
- **No sealed number exists. Do not fabricate one.** Directional, line-free reasoning:
  - Watson's 2026 team went 5-3 with him, but the season-wide CLE off EPA (−0.0496) and the −0.1914 situational adjustment are *team-level* priors mostly built on his reps — the *QB-specific* overlays (comp 0.5026, cognitive load 0.2272) are Sanders'. The sealed artifact is a **mixed state**: team priors Watson-heavy, QB overlays Sanders-specific. This is internally inconsistent and must be rebuilt for a Watson start.
  - Direction: **wider, lower-scoring CLE output distribution** than Branch S. Watson's ceiling (5-3 stretch, 10+ YPA games) exceeds Sanders' floor, but his Achilles-degraded extension + leaking OL + revenge arousal + −55 first-quarter habit produce **higher early-game variance and a fatter left tail** (6-point W8-style collapse).
  - **HOU win probability in Branch W is indeterminate within a wide band** — plausibly centered slightly below Branch S if Watson's ceiling manifests, slightly above if the revenge/pressure tunneling manifests. **The honest statement is: the engine cannot currently distinguish these, and this dossier will not invent a number.** Label: GAP.
- **Key tail scenarios (both branches):**
  1. **Revenge + first-quarter collapse:** Watson (or a pressed Sanders) starts slow (−55 habit), HOU scripts an early lead (Caley NE-tree opening), Monken shifts to trailing pass (58.4%) → game becomes a shootout *if* HOU edges are healthy; becomes a CLE ball-control grind *if* they sit.
  2. **Bilateral edge/OL health resolves to "both degraded":** Anderson/Hunter limited + CLE patchwork OL → low-pressure, low-scoring, field-position game; gusts (14-15 mph) + cold (47°F) → FG misses (Szmyt vs Fairbairn), **under-43 tail** fattens.
  3. **Hickman out + HOU PA:** CLE deep-middle seam open → Stroud PA deep shots (6.7% deep rate, but high-EV when open) → **over-43 / HOU-blowout tail** (the 44-22 W9 template).
  4. **HOU RB duo limited:** Marks + Montgomery both restricted → HOU one-dimensional, CLE man coverage (NGS 50%) denies quick windows → Stroud cognitive load rises above the modeled 0.1453 → **CLE upset tail** via ball control (Judkins 670 rush yds) and HOU turnovers (1.32 projected).
  5. **QB-controversy fracture:** institutional scar (Monken "starter-caliber" praise for Sanders + Watson make-or-break) → effort/communication collapse tail. **Unquantified; labeled as institutional risk, not a probability.**

### 3.4 Deltas mapped onto the Week 10 engine state

| Engine lever | Sealed value | What changes it | Direction if triggered |
|---|---|---|---|
| `home_off_epa_adj` | −0.1914 | Watson start (rebuild required) | Invalid as-is; team prior is Watson-heavy, overlay is Sanders' |
| `home_comp_rate_adj` | 0.5026 | Watson start | Invalid as-is (Sanders-specific) |
| `away_off_epa_adj` | −0.0445 | HOU RB duo limited | More negative (run game collapses) |
| `fg_make_prob_delta` | −0.0406 | Actual 47°F/gusts 14-15 vs placeholder 58°F/7.5 | Reinforced (colder, gustier) |
| `away_def` blitz prior | 26.2% | Anderson + Hunter both out | Blitz efficacy drops; CLE OL reprieved |
| CLE man/disguise prior | 34.3% (engine) / 50% (NGS) | Rutenberg disguise emphasis | Stroud load index 0.1453 is optimistic |
| `situational_multipliers_unfitted` | true | — | Engine flags these as unfitted; do not treat as calibrated |

### 3.5 Engine hygiene flags (for WP-8 follow-up, not corrected here)

1. **QB1 gate vs config vs announcement conflict** (VETO-1) — the dominant defect.
2. `trench_and_pocket_physics` block carries **JAX/BAL/Fagnano key names** (`jax_pass_rush_win_rate`, `bal_sack_rate_allowed`, `fagnano_time_to_throw_sec`) — template residue from another game; values are mapped to away/home but keys are wrong.
3. `branch_a_tuten_out_primary` / `branch_b_tuten_active_limited_contingency` — **"Tuten" labels are template residue**; both branches are labeled "Full Starter Strength" and differ by <0.5 pt. The injury-contingency machinery produced **no meaningful differentiation** for this game; the CLE QB controversy and bilateral edge/OL health are **not represented** in the branch structure.
4. `matchup_environment` is **generic** ("CLE Home Venue", 58°F/7.5 mph placeholder) and carries **market metadata** (spread/total/juice) — quarantined from this dossier's reasoning; the environment block should be rebuilt from the actual forecast (Section 2.4).
5. CLE `dc_man_rate` 34.3% (engine/FTN) vs NGS 50% — **source divergence flagged**, not silently averaged.
6. HOU `playcaller` profile `{}` — no 2026 HOU row in `coach_offense.csv`.

### 3.6 Data gaps (labeled, not filled)

- **Watson-branch simulation:** does not exist; structurally unrepresentable under current gate + ban. GAP.
- **Mason Graham current status:** Oct 7 MCL/ankle injury; not on Nov 13 report; presumed active but unverified. GAP.
- **HOU playcaller coach-attribution:** engine profile empty. GAP.
- **CLE man-rate magnitude:** FTN 34.3% vs NGS 50% — unresolved source divergence. GAP.
- **All-time series record (8-7 HOU):** secondary source only. LOW CONFIDENCE.
- **ESPN per-team `/injuries` and `/depthchart` endpoints returned `{}`** — league injuries feed + nflverse depth chart used instead. Method note.
- **Watson internal-clock / cognitive profile:** no charted gate profile. GAP.
- **Foundry primitives:** only 2 books complete at check time; the corpus is still warming. Conclusions draw on the 2 available primitives + engine state, not a mature corpus.

---

## 4. DOCTRINE COMPLIANCE CHECKLIST

- [x] No win-rate headlines — probabilities presented as conditional model outputs with explicit uncertainty and scenario branches.
- [x] No fabricated claims — every factual claim sourced (ESPN, nflweather, Sharp Football Analysis, Yahoo, ESPN Oyefusi, NFL.com, team sites, repo engine artifacts, foundry primitives).
- [x] No odds/lines used as model input — market metadata quarantined; all reasoning line-free.
- [x] Held-out discipline — all sources pre-kickoff as of 2026-11-13 ~18:00 UTC; temporal-split anti-leakage invariant (foundry a84d79326) honored; no post-cutoff information.
- [x] Honest gaps labeled (Section 3.6), not filled with guesses.
- [x] Internal artifact — not published, no picks posted.
- [x] Engine state referenced explicitly (WP-8 worktree, branch, artifact paths, timestamps, coverage 13/13).
- [x] Foundry state reported (warming; 2 primitives drawn on).

**END OF DOSSIER — HOU @ CLE**
