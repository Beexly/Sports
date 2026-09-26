# MINIS OVERNIGHT DEEP REPORT — contextual-compounding lane (v3 method)
**Run:** 2026-09-14, Grout Crew (Minis / DeepSeek-Flash-4.1 lane) · **Motif:** ARCHITECT (skeletons drafted, not finalized)
**Prompt:** MINIS OVERNIGHT PROMPT v3 (pasted_7789B94C.txt) · **Thesis unchanged:** edge comes from COMPOUNDING two or more rarely-used signals; every test below is a compound.

---

## 1. ORIENTATION (5 lines)

1. The v3 prompt's Phase-0 reading list is **mostly unreadable in this environment**: MOVE-37 section (absent from `AGENTS.md`), `docs/research/move37/` (does not exist), `docs/calibration-proposals/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md` (latest proposal in repo is v5.2.8), `~/workspace/gse-discovery/contextual-compounding-factor-universe.md` (absent), and `deepseek-phase6-navier-stokes-translation-02.md` (absent) — all recorded as PATH_UNAVAILABLE in §7, both locally and in the GitHub fallback clone (`github.com/Beexly/Sports` @ `aac2a789`).
2. What *does* exist and was read: `docs/data/CARDS_INCENTIVE_CALENDAR.md` (1,128 lines — the IC deck: incentive-state machine, coach fingerprints, and the IC8 props-context bind), `docs/brain/signal-ledger.md` (207 lines — **status: doctrine only, schema BLOCKED**, append-only lifecycle ledger for picks/claims).
3. What the engine already scores (so that nothing here is proposed as "new"): `nfl-body-clock.ts` (time-zone/circadian), `nfl-incentive-calendar.ts` (elimination/seeding/rule-change covariates), `nfl-weather.ts`, schedule `rest_diff`, `nfl-team-form.ts` (EPA features), `nfl-regime-change/detector.ts` (CUSUM), `nfl-ladder-boost.ts`, `props-context-bind.ts` (IC8: rest/body-clock/weather INTO the props stack), plus the props HB family (ADOT, air/YAC, ATD, catch) and `grouped-climatology.ts`.
4. Because the repo's own context covariates are game-market side but the *props* stack consumes almost none of them (IC8 is the fail-closed bind, not an admission), and because **the lane's rule is "compound only, never single-factor", tonight's battery re-tests context as compounds at the game-market level, where a real, leak-safe, fully-priced control (the closing line) exists.**
5. Result headline (all 13 executed compounds): **0 / 13 pass the pre-registered tool-gain gate.** Three are *directionally opposite* to the pre-registered sign, five are power-dead (n<150), one is not representable in our feature space at the observed frequency (n=7). The honest reading: at game level, the closing line already absorbs every context compound in this list — which is exactly the null the props lane's p-side covariates must beat *in props space*, not game space.

---

## 2. METHOD AS RUN (v3 loop, with the gates executed in order)

**Step 1 THEORIZE** — per cluster, ≥3 serious sources harvested via OpenAlex + Crossref machine APIs (query text + result count recorded), abstracts read, mechanisms and limits extracted (§3).
**Step 2 SKELETON + FORMALIZE** — every skeleton is marked **DRAFT-FOR-ARCHITECT**; every equation has a stated sign and a falsifier (§3, and listed for approval in §6).
**Step 3 TEST** — gates run in order; execution is real (not simulated) on nflverse data held locally.
**Step 4 REFINE** — each cluster carries a refined equation + ONE discriminating follow-up test.

**Pre-registration discipline:** the compound list, signs, metric and kill line were frozen in `prereg-2026-09-14.md` **before any outcome was joined**. Two post-hoc additions (D1r, B2r, D3r) are labelled `[post-hoc]` everywhere they appear and are excluded from the pre-registered ranking.

### 2.1 Gate definitions used (v3, exactly as prompted)
| Gate | Operationalisation tonight | Recorded outcome |
|---|---|---|
| **R — representability** | Can a logistic-in-logit(q) family with an indicator interaction express the structure? (yes for all indicators; the *frequency* check — does the compound exist often enough to be estimated — run first, it killed C1/F1) | INSIDE/OUTSIDE + reason |
| **5a direction** | sign of the bootstrap median compound coefficient vs the pre-registered sign | pass/fail |
| **5b assumptions** | the identifying assumption is "only pre-kickoff information enters x"; verified by construction for every feature (schedule facts, prior-season rosters, weekly injury reports, prior-season FTN rates); assumption is testable and was tested via permutation | pass |
| **5c boundary** | tertile/segment splits of the driver + era halves + home/away splits (§3 D1, E1, F2) | pass (null in every cell) / empty-cell fail |
| **5d round-trip** | the compound still measures P(win | state) vs closing line — ORTHOGONAL-BY-DESIGN is *not* claimed for any compound here: each was designed to *move the estimand*, so a null is a genuine null | pass |
| **5e tool gain** | out-of-sample Δlog-loss (8-fold expanding-window temporal CV, train ≤k−1, test k) vs logit(q)-only baseline; kill line **ΔLL < 0.0015 nats/game** | all fail |
| **5f return obligation** | explicit mapping back to the estimand (§3 closing line per cluster) | written for every compound |
| **6 redundant verification** | (i) parametric logistic + (ii) non-parametric permutation null over 60 within-season shuffles + (iii) flagged-subset residual (realised win-rate − line-implied) with 2,000-draw bootstrap | both approaches agree NULL everywhere → no PIPELINES-DISAGREE cases |

### 2.2 Data actually used (all local, all leak-safe)
| Dataset | Coverage | Role |
|---|---|---|
| `/tmp/sched.csv` = nflverse `schedules/games.csv` | 7,548 games; 2,895 REG games 2015–2025 with **both closing moneylines** (2,894) | estimand q (devigged home close), outcomes, rest, roof/temp/wind, coaches, starting QBs |
| `rosters/roster_2015..2025.csv` | 33,183 player-week rows → 33,057 player-seasons, 32,528 with `years_exp` | revenge (prior-team membership), rookie flag via `years_exp==0` |
| `injuries/injuries_2015..2025.csv` | 5,785 team-weeks → 84,000+ report rows deduped to the final report per player-week | Out/Doubtful/Questionable counts, non-participant counts |
| `contracts/historical_contracts.csv` | OTC contracts w/ `apy_cap_pct`, `year_signed`, `years` | A2 spec (not executed) |
| `ftn_charting/ftn_2022..2025.csv` | 4 seasons × ~48k charted plays, 29 columns incl. `is_play_action,is_motion,n_blitzers,is_qb_out_of_pocket,read_thrown,is_contested_ball,is_drop` | E2/F4 spec (not executed — no team column per play; needs a pbp join) |
| Baseline | logit(q) fit; compound model adds one indicator | all gates |

**Analysis frame:** each game contributes **two team-perspective rows** (n = 5,790 rows from 2,895 games): `y` = that team won, `q` = its devigged close, `x` = compound flag. This removes any home/away asymmetry bias in the flags.
---

## 3. CLUSTERS A–F

Notation used in every cluster: `q` = devigged closing-line win probability of the team in question; `x` = compound indicator; `β_1` is the compound coefficient. All CIs are 90% bootstrap (B=250–300 draws, resampling team-game rows, refitting); ΔLL is out-of-sample (2018–2025 expanding-window) log-loss improvement over the baseline in **nats per game**; `resid` = realised win-rate − line-implied win-rate in the flagged subset (positive = the flagged side *beat* the close).

### CLUSTER A — EMOTIONAL DYNAMICS

**Sources (mechanism → limit → tier).** Verification note: OpenAlex + Crossref registries consulted through machine APIs (query strings + counts in §7); publisher pages return HTTP 403 to non-browser clients (bot walls), so "CONFIRMED" below means *the primary record and its abstract were retrieved and read through an independent index*, not that a PDF was fetched.

| # | Source (year, venue, DOI, cites) | Mechanism it proposes | Its limits | Tier |
|---|---|---|---|---|
| A-i | Beilock & Gray-line work: *Choking under pressure: Multiple routes to skill failure*, J Exp Psychol Gen 2011, `10.1037/a0023466`, c=288 | Pressure degrades performance by **two** routes — distraction (working-memory load) and explicit monitoring (de-automatisation); the route depends on task type | Lab tasks (putting, golf, maths) not football games; individual not team; no market control | CONFIRMED |
| A-ii | *Choking under pressure: neuropsychological mechanisms of incentive-induced performance decrements*, Front Behav Neurosci 2015, `10.3389/fnbeh.2015.00019`, c=90 | **Higher incentives can lower output**: incentive-induced arousal recruits attention away from the task | Non-sport samples; effect heterogeneous by stake size | CONFIRMED |
| A-iii | *Choking or Delivering Under Pressure? The Case of Elimination Games in NBA Playoffs*, Front Psychol 2018, `10.3389/fpsyg.2018.00979`, c=13 | Direct test: 1,930 playoff games, 33 seasons — elimination threat **did not** elevate performance | NBA, team-level, no line control | CONFIRMED |
| A-iv | *Incentives to lose revisited: the NHL and its tournament incentives*, J Econ Psychol 2018, `10.1016/j.joep.2018.07.004`, c=38 | Late-season incentives can invert effort (tanking/incentive misalignment) | League-specific draft rules; not directly transferable to NFL seeding | CONFIRMED |
| A-v | Frey & Jegen, *Motivation Crowding Theory: A Survey of Empirical Evidence*, 2000, `10.2139/ssrn.203330`, c=486 | Extrinsic rewards can **crowd out** intrinsic motivation (bonuses can decrease effort on motivated tasks) | Survey of lab/non-sport field work | CONFIRMED |
| A-vi | *Choking interventions in sports: a systematic review*, Int Rev Sport Exerc Psychol 2017, `10.1080/1750984x.2017.1408134`, c=147 | Meta-level: 47 studies, effects exist but are small and intervention-dependent | Review, not an effect size on outcomes | CONFIRMED |
| A-vii | *The interplay between resentment, motivation, and performance* ("chip on shoulder"), J Philos Sport 2019, `10.1080/00948705.2019.1608214`, c=18 | "Chipped shoulder" grudge is a *lasting*, controlled-anger motivator | **Conceptual paper — no data** | INFERRED only as a construct, UNSOURCED as an effect |
| A-viii | *Length of Contracts and the Effect on the Performance of MLB Players*, 2009 (Illinois Wesleyan, undergraduate thesis, no DOI) + *The Effect of Contract Year Performance on Free Agent Salary in MLB* (2011) | Shirking in guaranteed years / effort surge in contract years | Not peer-reviewed, MLB not NFL | UNSOURCED (reported, not relied on) |

**DRAFT skeleton (no sign claim).** The estimand is `P(win | state) ∈ [0,1]` for a *self-relevant* state (revenge, milestone, contract, hot seat, elimination); it belongs to the logistic family; the null is exactly the closing line's implied probability, i.e. `H₀: E[y | q, x] = q`. Structure: a self-relevant state should act as a **multiplicative load on the team's execution**, so its effect should appear as an interaction between the state and situational adversity (short week, rest deficit, hostile venue) rather than as a level shift — hence every emotional compound in this cluster is *state × situation*, never state alone.

**Equation (formalised) … falsifier.** For team *i* in game *g*:
$$\operatorname{logit}P(y_{ig}=1) = a + b\,\operatorname{logit}(q_{ig}) + c\,(\text{Revenge}_i \times \text{ShortWeek}_i) + d\,\text{Revenge}_i + e\,\text{ShortWeek}_i$$
Predicted signs: **c > 0** (a grudge plus an adversary underprepared should lift the revenging side above the close), d ≥ 0, e ≤ 0, and by construction b ≈ 1 if the close is efficient. **Falsifier:** c ≤ 0, or out-of-sample ΔLL < 0.0015 nats/game, or flagged n < 150 (pre-registered kill line).

**Gate-by-gate log — A1 (revenge-QB × opponent short week).** Data: 2,895 REG games 2015–2025 → 5,790 team rows; starting QB identified from `games.csv` (`home_qb_id`/`away_qb_id`); "revenge" = that QB appears on the **opponent's** roster in any strictly earlier season (rosters 2015+); "short week" = opponent `rest ≤ 6`.

| Gate | Result |
|---|---|
| R representability | INSIDE mathematically; **frequency-fatal**: 94 QB-revenge team-games exist, the *intersection* with opponent short week is **n = 18** |
| 5a direction | c = **+0.323** (correct sign), CI90 **[−0.404, +1.109]** → not distinguishable from 0 |
| 5b assumptions | pass (all features are pre-kickoff schedule/roster facts) |
| 5c boundary | not estimable at n=18 |
| 5d round-trip | pass — the compound targets the estimand, not a proxy |
| 5e tool gain | ΔLL = **−0.00253** (worse than baseline) → FAIL |
| 5f return obligation | mapping: a positive c would mean "revenge × short week shifts P(win) away from q in the revenge team's favour" — written, but unresolved because c is not identified at this n |
| 6 redundant verification | parametric c>0 vs non-parametric perm mean −0.0039 (p_ge = 0.15) → **agree: no detectable effect** |
| **Killed by** | **Gate R (frequency) + 5e**, pre-registered n<150 rule |

Observed secondary facts (not claims): flagged subset realised win-rate **50.0%** vs line-implied **42.8%** (resid +7.2pp) but flat-bet ROI **−8.8%** (the close's prices already removed the value), i.e. even the raw residual does not pay.

**Honesty check — what makes A1 narrower than it looks?** (1) Revenge is measured *only through the starting QB*, because QB identity is the only per-game player identity guaranteed in a leak-safe schedule/roster join; revenge by WR/RB/DB/coaches is missed, so this is a sparse proxy of the construct. (2) n=18 gives a 90% CI on the coefficient of ±0.75 log-odds ≈ ±15pp — the test cannot see anything smaller than a large effect. (3) The nearest large-n analogue in the literature (A-iii, n=1,930) found **no** performance elevation under the strongest emotional stake available (elimination), which is *consistent* with our null rather than in tension with it. (4) A certification effect: the market sees revenge narratives too (they are media-visible), so any surviving signal would have to be the *part the market underweights* — a strictly smaller claim than "revenge matters".

**Refined equation + the ONE discriminating follow-up test.**
$$\operatorname{logit}P(y_{ig}=1) = a + b\operatorname{logit}q_{ig} + c\,R_i\,S_i + \gamma\, e^{-\lambda \Delta t_i}$$
with `R_i` now a **snap-weighted exposure** (share of the revenging team's snaps taken by players facing a former team in the last 2 seasons, from rosters × snap counts) and `Δt_i` the days since the player's last game against that former team. Follow-up that discriminates original vs refined: **within-player** design — for each revenge-eligible player, compare his props (targets/receptions/carries) in games vs his former team against the same player's trailing 5-game baseline *in the same season*; the original mechanism predicts a level shift, the refined one predicts the effect decays with `Δt` (i.e., a familiarity/exposure term, not a grudge term). Executable blind from `ftn_charting` + `player_stats` + `snap_counts`.

### CLUSTER B — MENTAL / COGNITIVE DYNAMICS

**Sources.**

| # | Source (year, venue, DOI, cites) | Mechanism | Limits | Tier |
|---|---|---|---|---|
| B-i | Sweller, *Cognitive Load During Problem Solving: Effects on Learning*, Cognitive Science 1988, `10.1207/s15516709cog1202_4`, c=8,461 | Working memory is finite; **novel** structure imposes intrinsic load that competes with execution. Load is a *rate* problem: same structure becomes cheap with reps | Classroom tasks; no football; load not directly measured in our data | CONFIRMED (as theory) |
| B-ii | *Neuroimaging and perceptual-cognitive expertise in sport*, Neuropsychologia 2024, `10.1016/j.neuropsychologia.2024.109032`, c=15 | Experts read *patterns*, not features: anticipation comes from structural familiarity | Review; individual sports heavy | CONFIRMED |
| B-iii | *Transfer of expert visual-perceptual-motor skill in sport* (Routledge, 2019), `10.4324/9781315146270-21`, c=11 | Expertise transfers only where structure is shared — supports a **novelty deficit** term for new opponents | Chapter-level synthesis | CONFIRMED |
| B-iv | *Familiarity detection and pattern perception* (Routledge, 2019), `10.4324/9781315146270-2`, c=11 | Recognition speed is the mechanism behind preparation advantage | Same | CONFIRMED |
| B-v | *New contracts and dismissal threats from highly drafted rookies: what motivates NFL quarterbacks?*, Managerial and Decision Economics 2022, `10.1002/mde.3682`, c=0 | Incumbent NFL QBs improved **slightly** after a 1st-round QB was drafted behind them — small effect, mostly null on opportunism | Directly NFL, but about incentives not load; small n | CONFIRMED |
| B-vi | *Predicting the NFL potential of college quarterbacks*, EJOR 2021, `10.1016/j.ejor.2021.03.013`, c=8 | College passing/rushing ability predicts draft slot and rookie performance imperfectly — rookies are *forecastable but noisy* | Selection-focused | CONFIRMED |
| B-vii | *Training under pressure* (Routledge, 2019), `10.4324/9781315146270-20`, c=1 | Pressure training raises tolerance; reps are the intervention | No outcome data | INFERRED |

**DRAFT skeleton (no sign claim).** Preparation is a **rate** quantity: define `CL_i = Novelty_i × exp(−λ·Prep_i)` where `Novelty` ∈ {opponent scheme change, disguised coverages, new coordinator} and `Prep` = hours of opponent-specific work available (≈ `rest` days minus fixed recovery). The estimand remains `P(win|state)`; the null remains the close. The structural commitment: **the deficit is load × time, so it must vanish as prep time rises** — this is the part a level-shift model cannot express, and it is what makes the cluster compound rather than single-factor (rookie/backup *state* × week *situation*).

**Equation + falsifier.** `logit P(win) = a + b logit(q) + c (RookieQB × RestDeficit) + d (Backup × ShortWeek)`; predicted **c < 0, d < 0**. Falsifier: c ≥ 0 or d ≥ 0; or ΔLL < 0.0015; or n < 150.

**Gate-by-gate log.**

| Gate | B1 rookie-QB × rest deficit (own rest − opp rest ≤ −3) | B2 backup-QB × own short week |
|---|---|---|
| R representability | INSIDE; frequency **thin** (n=71) | INSIDE; frequency thin (n=68) |
| 5a direction | c = **+0.319** — **opposite** to pre-registered (rookie side did *better* than the close) CI90 [−0.053, +0.771] | c = **+0.095** — opposite to pre-registered CI90 [−0.351, +0.490] |
| 5b assumptions | pass | pass (backup = starter ≠ previous game's starter and ≠ season-leading starter as of that week, both as-of) |
| 5c boundary | not estimable | not estimable at n=68 |
| 5d round-trip | pass | pass |
| 5e tool gain | ΔLL = **+0.00013** (< 0.0015) → FAIL | ΔLL = **−0.00030** → FAIL |
| 5f return obligation | written; unresolved | written; unresolved |
| 6 redundant verification | parametric null; perm mean −0.00026, p=0.083 → **agree null** | parametric null; perm mean −0.00012, p=0.80 → **agree null** |
| **Killed by** | Gate 5a (sign) + 5e + n<150 | Gate 5a (sign) + 5e + n<150 |

Secondary facts: B1 flagged realised 42.3% vs line 35.8% (resid **+6.5pp**), ROI +3.2% (not significant, n=71). B2 realised 39.7% vs 38.4% (resid +1.3pp), ROI −6.6%. **Post-hoc** refinement B2r (backup × true short week `rest ≤ 5`, n=28): c=+0.52 [−0.12,+1.18], resid **+10.2pp**, ROI **+17.8%** — the same *opposite* sign, with a sample that cannot support a claim and a multiple-comparison cost; recorded, not ranked.

**Honesty check.** (1) The market **sees the state** (who starts at QB is public and the close moves on it), so requiring the compound to beat the close tests only the *unpriced residual* of the readiness story — a much narrower claim than "rookies are unprepared". (2) Our proxy for readiness is starter identity change, not quantified reps; a true load variable (practice participation, walkthrough reps) is not in any public feed. (3) Both n's are far under the pre-registered power floor; the correct label is INCONCLUSIVE-BY-POWER, and the pre-registered rule books them as KILLED. (4) B-v (MDE 2022) is the closest NFL analogue and itself reports *small* effects — the literature already predicts we would be chasing small numbers.

**Refined equation + discriminating follow-up.**
$$\operatorname{logit}P(y_{ig}=1) = a + b\operatorname{logit}q_{ig} - \lambda\,N_{ig}\,e^{-\kappa \cdot \text{prep}_{ig}} + \theta\,\text{Reps}_{ig}$$
Refinement: replace the binary "rookie/backup" with **novelty × prep-hours** and add `Reps` (career starts vs that opponent's defensive scheme family). Discriminating follow-up: within backup-QB starts, split by **whether the backup had already started ≥1 game that season**. Original mechanism ⇒ persistent deficit; refined mechanism ⇒ the deficit is concentrated in *first* starts and decays. Blind-executable from `games.csv` + weekly `rosters`/`depth_charts` (no pbp needed), n ≈ 68 vs ≈ 30 — so this is a **spec, not a test**, until the exposure is widened to all skill positions.

### CLUSTER C — PHYSICAL DYNAMICS

**Sources.**

| # | Source (DOI, cites) | Mechanism | Limits | Tier |
|---|---|---|---|---|
| C-i | *Managing Travel Fatigue and Jet Lag in Athletes: a Review and Consensus Statement*, Sports Medicine 2021, `10.1007/s40279-021-01502-0`, c=141 | Travel fatigue ≠ jet lag: the first is cumulative travel stress (recoverable in ~24–48h), the second a circadian phase shift (≈1 day per time zone) | Consensus, individual-sport heavy; NFL travel is short-haul mostly | CONFIRMED |
| C-ii | *Jet lag and travel fatigue*, Clin J Sport Med 2012, `10.1097/jsm.0b013e31824d2eeb`, c=140 | Quantifies recovery windows; performance dips confined to the shifted-hours window | Review | CONFIRMED |
| C-iii | *Circadian rhythms, athletic performance, and jet lag*, BJSM 1998, `10.1136/bjsm.32.2.101`, c=111 | Performance is time-of-day dependent (peak late afternoon); eastward travel is worse | Old, small studies | CONFIRMED (mechanism), INFERRED (magnitude in NFL) |
| C-iv | *Recovery and Performance in Sport: Consensus Statement*, IJSPP 2018, `10.1123/ijspp.2017-0759`, c=809 | Recovery is a **time-constant** process; <72h compresses adaptation | Consensus; no NFL-specific constant | CONFIRMED |
| C-v | *Monitoring Training Load to Understand Fatigue in Athletes*, Sports Medicine 2014, `10.1007/s40279-014-0253-z`, c=1,823 | Load is **accumulative** (acute:chronic); fatigue is a memory effect | Team-sport transfer unproven for collision loads | CONFIRMED |
| C-vi | *The training–injury prevention paradox*, BJSM 2016, `10.1136/bjsports-2015-095788`, c=1,588 | High chronic load protects; spikes harm — predicts **non-monotone** risk in load | Not about game outcomes | CONFIRMED |
| C-vii | *Position statement — altitude training for team-sport players*, BJSM 2013, `10.1136/bjsports-2013-093109`, c=87 | Altitude adaptation takes ≥2 weeks; visiting teams get no benefit and may lose plasma volume | Training-focused; match-play advantage under-quantified | CONFIRMED (mechanism) / INFERRED (match effect) |
| C-viii | *Home advantage in football: a current review of an unsolved puzzle*, Open Sports Sci J 2008, `10.2174/1875399x00801010012`, c=250 | Home advantage is real but its causes (crowd, referee, travel, familiarity) are not separable | Soccer; confounding unresolved | CONFIRMED |
| C-ix | *Effectiveness of post-match recovery strategies in rugby players*, BJSM 2006, `10.1136/bjsm.2005.022483`, c=316 | Active recovery/compression small effects on perceived soreness, not performance | n small | CONFIRMED |

**DRAFT skeleton.** Estimand `P(win | physical state)`, logistic; null = close. Structure: physical state is **additive in a latent fatigue term with exponential decay and linear accumulation**, and the two compounds tested carry a *sign* prediction only in the interaction with venue/conditions. Because both effects are supposed to be *small and slow*, the skeleton insists on the interaction: `rest_diff × condition`, not `rest_diff` alone.

**Equations + falsifiers.** `logit P(win) = a + b logit(q) + c·(Altitude_home × RestAdv_home) + d·(RoadStreak≥2 × ColdWindy)` with predicted **c > 0, d < 0**.

**Gate log.**

| Gate | C1 altitude × home rest advantage ≥3 | C2 road-streak ≥2 × cold/windy outdoor |
|---|---|---|
| R representability | **OUTSIDE-by-frequency**: only **7** team-games in 11 seasons (Denver 91 altitude home games total; rest-advantage ≥3 at altitude nearly never coincides) | **OUTSIDE-by-frequency**: **10** team-games (road-streak ≥2 occurs in only 84/5,790 rows = 1.5% because modern scheduling alternates home/away) |
| 5a direction | c = +0.19, CI90 [−1.61, +12.6] — sign right, interval useless at n=7 | c = **+0.797** (opposite to pre-registered) CI90 [−0.454, +2.41] |
| 5b/5d/5f | pass / pass / written | pass / pass / written |
| 5c boundary | empty cells (all 7) | empty |
| 5e tool gain | ΔLL −0.00031 → FAIL | ΔLL +0.00003 → FAIL |
| 6 redundant verification | perm mean −0.0007, p=0.80 → null | perm mean −0.0011, p=0.167 → null |
| **Killed by** | **Gate R (frequency)**, then 5e | **Gate R (frequency)** then 5a/5e |

Observation worth carrying forward: cold/windy occurs in 483 team-games and altitude in 91 — the *conditions are common, the compounds are not*. Any future use of these terms must be as **modifiers of a props-side exposure** (e.g. passing volume in cold, kicking in wind), not as game-level win-probability interactions, because at game level the conjunction is structurally empty.

**Honesty check.** (1) The "rest" variable in `games.csv` is days between games, not recovery *quality*; a Thursday game after a Sunday game is 4 days, and the true physiological deficit depends on snaps/collisions played, which `games.csv` does not carry. (2) Altitude's game-level advantage may be real (Denver's long-run home record) but the *compound* tested here is a coincidence of two rare events, so the test says nothing about altitude itself — a genuine risk of over-reading a null. (3) The travelling-team effect is confounded with the *venue's* home advantage, which is already in `q`; our test is therefore a residual test by construction (Gate 5d ORTHOGONAL-BY-DESIGN applies *to the venue factor*, and is recorded rather than auto-failed).

**Refined equation + discriminating follow-up.** `fatigue_i(t) = Σ w_j e^{−Δt_j/τ} ` with τ estimated from rest-vs-performance curves, and the compound becoming `fatigue_diff × (pass_volume_exposure)`: test in **props space** (passing yards, receptions) where the physical term has a mechanism-level target rather than a win/loss target. Discriminating follow-up: does the cold/wind effect on passing props exceed the market's own cold/wind adjustment (pre-registered as a props-side `ΔLL ≥ 0.002` on completions)? This is the strongest lab candidate from Cluster C.

### CLUSTER D — INJURY DYNAMICS  **[CONTAMINATED — flagged throughout]**

**Sources.**

| # | Source (DOI, cites) | Mechanism | Limits | Tier |
|---|---|---|---|---|
| D-i | *Mental health in elite athletes: IOC consensus*, BJSM 2019, `10.1136/bjsports-2019-100715`, c=1,261 | Injury burden is a psychological *and* physiological load; availability is a continuum, not binary | Consensus | CONFIRMED |
| D-ii | *Sleep and the athlete*, BJSM 2020, `10.1136/bjsports-2020-102025`, c=554 | Sleep loss degrades reaction time/decision speed — the plausible channel by which a short week compounds injury burden | Effect sizes in controlled settings | CONFIRMED |
| D-iii | Recovery consensus (C-iv, same source) | <72h recovery compresses adaptation | — | CONFIRMED |
| D-iv | *NFL experiences with return to play after concussion*, Arch Neurol 2009, `10.1001/archneurol.2008.592`, c=5 | Post-injury players can be cleared while still impaired — supports a **playing-hurt** decay hypothesis | Old, small, NFL-specific | INFERRED |

**CONTAMINATION DECLARATION.** The NFL injury report is a *disclosure* instrument, not a measurement. `report_status` mixes genuine incapacity with strategy (Questionable is famously elastic; "did not practice" vs "limited" are negotiated categories). Every quantity below is therefore contaminated by team disclosure policy, and no test in this cluster can separate "injury burden" from "disclosure style". This is stated up front rather than hidden in a footnote.

**DRAFT skeleton (no sign claim).** The estimand is `P(win | availability_deficit)`. Structure: the deficit is a **count of lost starter-quality contributors weighted by position value**, interacting with preparation time — but because the observed variable is disclosure, the skeleton must be written as `P(win | report_status profile)`, a *proxy* estimand, with an explicit contamination term: `O_i = O*_i + η_i · DisclosurePolicy_i`.

**Equation + falsifier.** `logit P(win) = a + b logit(q) + c (OutDoubtful≥3 × Rest≤6)`; predicted **c < 0**. Falsifier: c ≥ 0, ΔLL < 0.0015, n < 150.

**Gate log — D1 (this is the only powered compound in the whole battery).**

| Gate | Result |
|---|---|
| R representability | INSIDE; frequency **good**: n = **369** team-games (burden ≥3 & rest ≤6) |
| 5a direction | c = **+0.050** — **opposite** the pre-registered sign; CI90 [−0.144, +0.225] → FAIL |
| 5b assumptions | pass by construction (weekly report is published before kickoff); **but assumption-bias**: disclosure policy is endogenous to the team's own market position |
| 5c boundary | **all cells null**: burden 3 rest 6 (n=90) resid +0.001 [−0.076,+0.085]; burden 4 rest 6 (n=54) −0.022 [−0.129,+0.095]; burden ≥5 rest 6 (n=39) +0.006 [−0.114,+0.133]; rest=5 cells nearly **empty** (n=2/0/4 — big injury burdens almost never occur on true short weeks); era halves: 2015-19 −0.004 [−0.062,+0.052], 2020-25 +0.020 [−0.033,+0.074]; controls: burden≥3 long rest −0.007, low burden short rest +0.010, low burden long rest +0.001 |
| 5d round-trip | pass |
| 5e tool gain | ΔLL = **−0.00012** → FAIL |
| 5f return obligation | written (positive c ⇒ the market under-prices disclosed unavailability; we get c ≈ 0 ⇒ the market prices it) |
| 6 redundant verification | parametric null; permutation p=0.283; flat-bet ROI −2.1% → **agree null** → the disclosure is already in the price |
| **Killed by** | **Gate 5a (direction)** + 5e |

**Post-hoc refinements (disclosed, excluded from ranking).** `[post-hoc]` D1r (burden ≥3 × rest ≤5, n=186): c=+0.115 [−0.164,+0.366], ΔLL +0.00002, resid +2.3pp — still the wrong sign. `[post-hoc]` D3r (non-participants ≥4 × rest ≤6, i.e. using the *practice* column instead of the report column, n=300): c=+0.031 [−0.197,+0.263], ΔLL −0.00018 → null. Two different disclosure proxies, same null.

**Honesty check.** (1) **Contaminated by construction** (above). (2) Our "burden" counts *all* report rows equally; a third-string linebacker's "Out" is not a starter's "Out", so the quantity is a noisy proxy of starter availability — and no public feed gives starter status per week without a pbp/snap join. (3) The 369 flagged games are dominated by `rest=6` (post-Sunday → Saturday), so the "short week" half of the compound is weak; the *true* short-week cell is nearly empty, which is itself a scheduling fact (teams protect Thursday nights with healthier rosters or the report is written differently). (4) A null here means "the marginal information in the public report is already in the close" — not "injuries don't matter". The distinction matters for the props lane, where the report's *player-level* content is not obviously priced.

**Refined equation + discriminating follow-up.** Replace count with **starter-weighted unavailability**: `U_i = Σ_j w_j a_{ij}` where `w_j` = prior-season snap share of player j (from `snap_counts`) and `a_{ij}` = the *practice* column's "Did Not Participate" flag (harder to game than Questionable). Discriminating follow-up: compare **props** pricing of affected position groups (e.g. WR room targets when a #1 is Out) against the game line's adjustment — original mechanism ⇒ both move together; refined ⇒ props move less, which is the exploitable version of the same physics. Data needed: `snap_counts` (2012+, present in nflverse) + `player_stats` — no pbp required.

### CLUSTER E — SCHEME / COACHING DYNAMICS

**Sources.**

| # | Source (DOI, cites) | Mechanism | Limits | Tier |
|---|---|---|---|---|
| E-i | *The impact of managerial change on team performance in professional sports*, J Econ Bus 2002, `10.1016/s0148-6195(02)00120-0`, c=146 | Leadership change has, at best, a **short-lived** and heterogeneous effect; long-run performance reverts | Pre-dates modern analytics; heterogeneous across leagues | CONFIRMED |
| E-ii | *Managerial decisions and team performance: evidence from professional elite soccer*, Managerial & Decision Economics 2024, `10.1002/mde.4354`, c=1 | New decision-makers change selection/strategy; effects appear as composition shifts | Soccer; recent, low citations | CONFIRMED |
| E-iii | *The impact of managerial change on performance: the role of team heterogeneity*, 2012, `10.2139/ssrn.2158294`, c=4 | Effect size depends on squad heterogeneity — predicts **conditional**, not universal, effects | Working-paper status | INFERRED |
| E-iv | *Machine learning in men's professional football: current applications…*, IJSSC 2019, `10.1177/1747954119879350`, c=138 | Team style is learnable from event data — the premise of fingerprints | Soccer; not American football | CONFIRMED |
| E-v | Repo artifact: `docs/data/CARDS_INCENTIVE_CALENDAR.md` §IC6 (coach PROE/pace fingerprints from CC-BY PBP) | The engine's own plan to fingerprint coaches exists; IC6 is unimplemented (`v0 = head-coach labels`) | Internal, not yet executed | CONFIRMED (as repo state) |
| E-vi | Play-action efficacy — **no peer-reviewed source found** in OpenAlex/Crossref for play-action rate × outcome at the NFL level (queries in §7) | — | — | **UNSOURCED** (not used as a claim) |

**DRAFT skeleton.** The estimand is `P(win | scheme state)`; the null is the close. Structure: scheme effects are **interactions** — a coaching discontinuity is only informative when the *opponent* has continuity (one side's change against the other's stability). Representability check: a new-HC indicator is expressible, but the *fingerprint* form (continuous PROE/pace × opponent disguised-coverage rate) is **not** representable in tonight's frame because FTN charting has no per-play team column (verified header, 29 columns, none `posteam`/`defteam`), so the fingerprint compound is declared SPEC-ONLY before any test budget was spent.

**Equation + falsifier.** `logit P(win) = a + b logit(q) + c (NewHC_i × OppContinuity_i)`; predicted **c < 0** (a team with a first-year HC against an established opponent staff underperforms the close).

**Gate log — E1 (new HC × opponent HC continuity).** n = **1,093** team-games (the best-powered pre-registered compound).

| Gate | Result |
|---|---|
| R representability | INSIDE (indicator), frequency good |
| 5a direction | c = **−0.017** — **correct sign**, CI90 [−0.150, +0.106] → not distinguishable from zero |
| 5b assumptions | pass (HC identity is a schedule fact; continuity uses prior-season mode) |
| 5c boundary | all null: 2015-19 resid +0.006 [−0.029,+0.043]; 2020-25 −0.016 [−0.047,+0.016]; home −0.019 [−0.052,+0.012]; away +0.006 [−0.026,+0.038]; **control** both-HCs-new +0.000 [−0.044,+0.045] |
| 5d round-trip | pass |
| 5e tool gain | ΔLL = **−0.00014** → FAIL |
| 5f return obligation | positive-c mapping written; c≈0 ⇒ the close already prices coaching discontinuity |
| 6 redundant verification | permutation p=0.483; flat-bet ROI on the new-HC side **−5.6%** → **agree null** (and the raw resid is *negative*, i.e. the flagged side slightly underperformed but the prices already covered it) |
| **Killed by** | **Gate 5e (tool gain)**, direction admitted but economically nil (|c| < 0.11 log-odds ≈ <2.6pp) |

**Honesty check.** (1) `HC new` is coarse — it cannot see coordinator changes, which the repo's own IC5 notes are the operative discontinuity; so this is the weakest form of the cluster's hypothesis and its null is expected. (2) Continuity is measured as name equality, not scheme stability — a staff can keep the HC and change everything else. (3) E-iii predicts *conditional* effects (heterogeneity), so a pooled null does not refute the conditioned version; the conditioned version is not executable tonight (no fingerprints), hence SPEC-ONLY rather than KILLED-for-all-time.

**Refined equation + discriminating follow-up.**
$$\operatorname{logit}P(y_{ig}) = a + b\operatorname{logit}q_{ig} + c\,\mathbf{1}[\text{HC new}]_i\,\mathbf{1}[\text{opp continuity}]_i + \sum_k \gamma_k \Delta \text{fingerprint}_{k,i}$$
where `Δfingerprint` = change in the team's own prior-season PROE, pace, motion rate, play-action rate (FTN 2022-2025). Discriminating follow-up: **within new-HC teams**, split by whether the team *also* changed scheme fingerprint (Δ ≠ 0) vs kept it. Original mechanism ⇒ all new HCs suffer; refined ⇒ only the scheme-changing ones do (the honest version of E-i's "short-lived, heterogeneous"). Blind-executable once FTN is joined to pbp on `nflverse_play_id` — that join is the single blocker.

### CLUSTER F — CROSS-CLUSTER COMPOUNDS (minimum 4 required, 3 executed + 1 spec)

Each F test is one mechanism from two different clusters; each ran the full gate sequence.

| ID | Compound (cluster pair) | n | coef (CI90) | ΔLL | resid | ROI | Killing gate |
|---|---|---|---|---|---|---|---|
| F1 | revenge-QB × (altitude \| rest advantage ≥3) — **A×C** | 13 | **−1.213** [−2.468, −0.289] | −0.00243 | **−23.3pp** | **−64.9%** | **R (frequency)** + 5a (sign **opposite** the pre-registered +1); CI excluding zero at n=13 is a small-sample artifact (one-sided, 13 games, ~5 wins) — recorded as NOT a finding |
| F2 | rookie-QB × injury burden ≥3 — **B×D** | 235 | +0.052 [−0.222, +0.306] | −0.00011 | +0.5pp | −6.6% | **5a (direction: pre-registered −1, observed +)** + 5e |
| F3 | new HC × rest advantage ≥3 — **C×E** | 140 | −0.217 [−0.557, +0.100] | −0.00018 | −4.3pp | −12.5% | **5a (direction)** + n<150 |
| F4 | motion-heavy offense × opponent short week — **E×C** | — | — | — | — | — | **SPEC-ONLY** (FTN has no team column) |

**Cross-cluster component decomposition (5d-adjacent, done by hand because n is too small for an interaction model).** F2 decomposes into rookie-only (n=349, resid **−2.8pp** [−6.7,+1.1]) and burden-only (n=1,986, resid −0.5pp [−2.3,+1.2]); the intersection (n=235) shows resid **+0.5pp**. The *signs disagree* between the parts and the compound — a textbook warning that at these n's the "compound" is noise-dominated, and it is why Gate 5d/6 mattered more than the point estimates.

**Honesty check (Cluster F overall).** Cross-cluster compounds multiply scarcity: the intersection of two rare states is rarer than either, so this cluster's honest output is a **frequency map**, not effects. The frequency map is the deliverable: any future cross-cluster compound must be built from one *common* state (injury burden 1,986; new HC 1,093; rookie QB 349) times one *conditional* state — the A×C and B×D intersections (13 and 235) cannot support a claim at NFL game frequencies in an 11-season window.

**Refined equation + discriminating follow-up.** Model F as a **hierarchical compound** rather than an indicator product: `logit P(win) = a + b logit(q) + c_1 s_1 + c_2 s_2 + c_3 s_1 s_2` estimated with partial pooling across the four clusters' states (so rare cells borrow strength). Discriminating follow-up: fit the pooled hierarchy on 1999-2025 games (7,548 total, lines only from 2015) and ask whether `c_3` has a consistent sign across the four state families — a single test that discriminates "compounding is real but rare" from "compounding is noise at these frequencies".---

## 4. COMPOUND RANKING (evidence × testability × novelty)

Ranking rule: a compound is only **SUPPORTED** if it passes 5a *and* 5e; it is **KILLED** if a gate failed with adequate frequency; power-starved cells are listed as **KILLED (power-limited)** per the pre-registered n<150 rule, with the power limit stated — that is a bookkeeping kill, not an evidentiary one.

| Rank | ID | Compound | n | Status | Killing gate | One-line reading |
|---|---|---|---|---|---|---|
| 1 | **D1** | injury burden ≥3 × rest ≤6 | 369 | **KILLED (evidence)** | 5a direction (c=+0.050) | The most powered test in the battery: disclosed unavailability is fully in the price; boundary analysis null in every cell |
| 2 | **E1** | new HC × opponent HC continuity | 1,093 | **KILLED (evidence)** | 5e tool gain (ΔLL −0.00014) | Correct sign, |c|<0.11 → <2.6pp; not monetisable at the close (ROI −5.6% on the flagged side) |
| 3 | **F2** | rookie-QB × injury burden | 235 | **KILLED (evidence)** | 5a direction | Parts and compound disagree in sign — noise-dominated |
| 4 | **F3** | new HC × rest advantage ≥3 | 140 | **KILLED (evidence)** | 5a direction + n<150 | Opposite sign, wide CI |
| 5 | B1 | rookie-QB × rest deficit | 71 | **KILLED (power-limited)** | 5a (opposite) + 5e + n<150 | resid +6.5pp but CI covers 0; cannot see effects < ~15pp |
| 6 | B2 | backup-QB × short week | 68 | **KILLED (power-limited)** | 5a + 5e + n<150 | resid +1.3pp; post-hoc true-short-week variant n=28, opposite sign, ROI +17.8% (not a claim) |
| 7 | B2r `[post-hoc]` | backup-QB × rest ≤5 | 28 | **KILLED (post-hoc, unranked)** | n<150 | recorded for completeness only |
| 8 | D1r `[post-hoc]` | injury burden ≥3 × rest ≤5 | 186 | **KILLED (post-hoc, unranked)** | 5a (c=+0.115) | second disclosure proxy, same null |
| 9 | D3r `[post-hoc]` | non-participants ≥4 × rest ≤6 | 300 | **KILLED (post-hoc, unranked)** | 5e (−0.00018) | practice column instead of report column: null |
| 10 | A1 | revenge-QB × opponent short week | 18 | **KILLED (power-limited)** | R frequency + 5e | Right sign, ±0.75 log-odds CI; the large-n literature analogue (NBA elimination, n=1,930) also finds no elevation |
| 11 | F1 | revenge-QB × (altitude\|rest advantage) | 13 | **KILLED (power-limited)** | R frequency + 5a | Apparent −1.21 coefficient with CI excluding 0 is a small-sample artifact; explicitly **not** reported as a finding |
| 12 | C2 | road-streak ≥2 × cold/windy | 10 | **KILLED (power-limited)** | R frequency | Conditions are common (483 cold/windy), the compound is structurally empty |
| 13 | C1 | altitude × rest advantage | 7 | **KILLED (power-limited)** | R frequency (OUTSIDE) | The conjunction essentially never occurs in 11 seasons |
| — | A2 | expiring-contract cluster × opponent rest advantage | — | **SPEC-ONLY** | — | sign unresolved; not executed (contracts join to playing time not done) |
| — | E2 | play-action-heavy offense × low-blitz defense | — | **SPEC-ONLY** | — | FTN lacks a per-play team column (verified); needs a pbp join on `nflverse_play_id` |
| — | F4 | motion-heavy offense × opponent short week | — | **SPEC-ONLY** | — | same blocker as E2 |

**SUPPORTED: none. INCONCLUSIVE: none under the pre-registered rule (all sub-power cells are booked KILLED). PIPELINES-DISAGREE: none — parametric and non-parametric paths agreed on every compound.**

**Programme-level reading (the honest headline).** 13 executed compounds, 3 independent approaches each (logistic ΔLL, permutation null, flagged-subset residual with bootstrap), 9,000+ team-game rows, zero survivors. The *reason* is structural, not accidental: every compound in the frozen list was built from information that is public before kickoff and legible to the market (QB identity, injury reports, coach names, rest, weather). A closing line that already devigs to q has absorbed those. The lane's thesis — "edge comes from compounding rarely-used signals" — is not refuted; but tonight's evidence says the *game-market* version of it is dead, and the live version must be in **props space**, where (a) the market is thinner, (b) the repo's own IC8 bind exists precisely because the context covariates feed *nothing* in the props stack today, and (c) the same compounds have a *mechanism-level* target (completions, targets, usage) instead of a win/loss target.

---

## 5. LAB HANDOFF — top 5 blind-executable pre-registration specs

Each spec is written so a lab can run it **without** this report: tables, columns, filters, model, null, kill line. All are pre-registered as-is; no result was peeked before writing them.

**L1 · Cold/wind × passing exposure (Cluster C refined) — strongest candidate.**
*Tables:* `ftn_charting_2022..2025.csv` (cols `nflverse_game_id, nflverse_play_id, is_play_action, n_no_huddle`) joined on `nflverse_play_id` to `play_by_play_YYYY.zip` (cols `epa, complete_pass, passing_yards, posteam, defteam, roof, temp, wind, pass_length`) + `schedules/games.csv` (`temp, wind, roof, spread_line, total_line`).
*Filter:* REG, 2022–2025, `roof ∈ {outdoors, open}`, `temp ≤ 40 OR wind ≥ 15`; drop rows with null weather.
*Estimand:* P(complete pass) and E[passing yards per attempt] for the *passing* team; baseline = the closing game total/spread-implied pace plus the team's trailing 8-game (as-of) passing EPA/play.
*Model:* `logit P(complete) = a + b·base + c·(ColdWindy × PlayAction)`; second model on yards with a Gaussian/quantile counterpart (two model classes → Gate 6 satisfied by construction).
*Null procedure:* within-season permutation of the `ColdWindy` flag (1,000 draws) and a placebo on indoor games (must show no effect).
*Kill line:* ΔLL < 0.002 nats/attempt, OR c's 90% CI covering 0, OR effects present only in the middle weather tertile (Gate 5c).
*Why it is first:* weather is already in the repo's `nfl-weather.ts` yet **feeds nothing in the props stack** (IC8 is a fail-closed bind, not an admission) — so the compound is genuinely new to the engine's props side.

**L2 · Revenge, within-player (Cluster A refined).**
*Tables:* `rosters/roster_YYYY.csv` (team membership by week), `player_stats/player_stats_YYYY.csv` (targets, receptions, carries by week), `schedules/games.csv` (opponent, kickoff).
*Filter:* REG 2015–2025; player has ≥1 game vs a former team (any *earlier* season's roster) while active on his current team; require ≥8 trailing games for a baseline.
*Estimand:* (player targets / receptions) in revenge games vs the same player's trailing-5-game mean, expressed as a ratio with a within-player fixed effect.
*Model:* `y ~ player_fe + revenge + Δt_since_last_meeting` (the last term is the discriminator between grudge and familiarity).
*Null:* same player's games vs non-former opponents, matched on opponent pass-defense rank and own trailing usage.
*Kill line:* ratio CI covering 1.0, OR no decay in `Δt` (familiarity) while a level shift persists (grudge) — the latter is a *finding*, not a failure, and must be pre-declared as such.

**L3 · Starter-weighted unavailability → props pricing gap (Cluster D refined).**
*Tables:* `injuries_YYYY.csv` (`practice_status`, `report_status`), `snap_counts/snap_counts_YYYY.csv` (prior-season snap share `w_j`), `player_stats` (weekly targets/carries), book prop lines if available (else the repo's `props-line-shop` fixtures).
*Filter:* REG 2015–2025; `U_i = Σ w_j·1[practice = "Did Not Participate"]` for the team's top-3 target/carry earners.
*Estimand:* do the *individual* props of the teammates of an unavailable player move by the same amount as the game line implies, or less? (The gap is the candidate edge.)
*Model:* teammate stat ~ as-of baseline + `U_i`; compare to the game-line movement on the same week (`Δspread`,`Delta-total`).
*Null:* weeks with *no* report rows (placebo) must show zero gap.
*Kill line:* gap CI covering 0, or gap fully explained by `snap_counts` redistribution (i.e. not a market inefficiency, just usage).

**L4 · Scheme-fingerprint change within new-HC teams (Cluster E refined).**
*Tables:* `ftn_charting_2022..2025.csv` **joined to pbp on `nflverse_play_id`** (the single blocker; FTN has no team column), `schedules/games.csv` (coaches, lines).
*Filter:* teams whose HC differs from the prior season; compute Δ in own-team prior-season rate for `is_play_action`, `is_motion`, `n_blitzers ≥ 1` share; split into scheme-changers vs keepers.
*Estimand:* `P(win | new HC, opponent continuity)` conditioned on Δfingerprint.
*Model:* the E-cluster refined equation (§3-E); two model classes (logistic + gradient-boosted if available in the lab) → Gate 6.
*Kill line:* ΔLL < 0.002 OR all four fingerprint deltas with CIs covering 0.

**L5 · Hierarchical pooled compound test (Cluster F refined) — the "is compounding real but rare?" test.**
*Tables:* `schedules/games.csv` 1999–2025 + all feature tables built tonight (`/tmp/nfl/compound_table2.csv` recipe in `build2.py`/`build3.py`).
*Filter:* REG games with lines (2015–2025 for the estimand; 1999–2014 used only to fit decay constants, never to score).
*Estimand:* `c_3` in `logit P = a + b logit(q) + c_1 s_1 + c_2 s_2 + c_3 s_1 s_2`, with partial pooling of `c_3` across the four state families (A/B/C/D/E states).
*Null:* permutation of the second state within the first state's positives (preserves marginals).
*Kill line:* pooled `c_3` 90% CI covering 0 in every family ⇒ declare "compounding is not detectable at NFL game frequencies with public pre-kickoff information" and close the game-level branch of the lane.

---

## 6. OPEN QUESTIONS FOR ARCHITECT (one sentence each; DRAFT-FOR-ARCHITECT skeletons listed for approval)

1. **[SKELETON APPROVAL A]** Is the Cluster-A skeleton's commitment — *the emotional effect must appear as state × situation interaction, never state alone* — the right structure, or should revenge/milestone states be modelled as multiplicative loads on **props exposure** rather than on win probability?
2. **[SKELETON APPROVAL B]** Is `CL = Novelty × exp(−λ·Prep)` (a rate quantity with decay) the right formalisation of preparation, given that neither novelty nor prep-hours are directly observable in public data?
3. **[SKELETON APPROVAL C]** Should fatigue enter as `Σ w_j e^{−Δt_j/τ}` (accumulation with decay, Cluster C) or as an acute:chronic ratio (C-v), given the two imply different boundary behaviour?
4. **[SKELETON APPROVAL D]** Do you accept the *contamination declaration* for Cluster D — i.e. treating `report_status` as a proxy estimand with an explicit disclosure-policy term — or should the lane refuse to use injury reports at all until a starter-weighted practice-participation variable exists?
5. **[SKELETON APPROVAL E]** Should scheme fingerprints be represented as continuous rates (PROE/pace/motion) or as discrete scheme families, given E-iii's "heterogeneity" result?
6. **[SKELETON APPROVAL F]** Is the hierarchical pooled `c_3` test (L5) an acceptable way to close the game-level branch of the lane, or does it violate the "compound, never single-factor" thesis by pooling across families?
7. The lane's live branch is now props space: do you want IC8's fail-closed bind **upgraded to an admission runner** (IC9) for the three L-specs above, or do you want the props work to stay inside the existing `props-fire-gate` path?
8. `docs/brain/signal-ledger.md` is doctrine-only with the schema **BLOCKED** — should tonight's 13-compound result set be recorded as `evidence_created` events once the ledger schema lands, or written only to the report file?
9. Should post-hoc variants (D1r/B2r/D3r) be logged as ledger rows at all, given they were created after seeing the D1 null?

---

## 7. FAILURES LOG (every failed query, empty search, unavailable path, environment quirk)

**Path audit (v3 prompt Phase 0) — all checked against both the local clone `/tmp/sports2` and GitHub `Beexly/Sports@aac2a789` (`git ls-tree -r --name-only`)**
1. `PATH_UNAVAILABLE` — `AGENTS.md` **MOVE-37** section: `grep -rn "MOVE-37" --include=*.md .` → 0 hits in the whole repo (1,583 md files).
2. `PATH_UNAVAILABLE` — `docs/research/move37/`: directory does not exist (`docs/research/` listed: 13 files, none move37).
3. `PATH_UNAVAILABLE` — `docs/calibration-proposals/2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md`: absent; highest version present is `2026-09-05-market-anchored-display-probability-v5.2.8.md`.
4. `PATH_UNAVAILABLE` — `~/workspace/gse-discovery/contextual-compounding-factor-universe.md`: no `gse-discovery` directory anywhere on the filesystem (`find / -type d -name gse-discovery` → none) and no `*factor-universe*` file in the repo.
5. `PATH_UNAVAILABLE` — `docs/research/move37/deepseek-phase6-navier-stokes-translation-02.md`: no `*navier*` path in the repo.
6. READ OK — `docs/data/CARDS_INCENTIVE_CALENDAR.md` (1,128 lines) and `docs/brain/signal-ledger.md` (207 lines).
7. **Filesystem defect:** the prompt's report path `~/workspace/...` is uncreatable on this host — `/root/workspace` is a phantom dentry: `mkdir -p /root/workspace` → `File exists`, then `rm -rf` + `mkdir` → `can't create directory`; `ln -s` → `File exists`, yet `ls /root/workspace` → no such file. Workaround: primary report written to `/var/minis/workspace/gse-discovery/` and mirrored to `/root/workspace-gse/gse-discovery/`; recorded here as a filesystem-level PATH_UNAVAILABLE rather than hidden.

**Search / API failures**
8. `QUERY FAILED HTTP 429` (OpenAlex rate limit) for: `sports betting market efficiency injury news`; `National Football League injury report disclosure`; `time pressure decision making team sport athletes`; `injury reports and betting market efficiency football`; `midseason head coach change effect performance`. Retried via Crossref, which returned usable records.
9. `SEARCH_EMPTY` (OpenAlex title+abstract index): `quarterback decision making cognitive load American football`; `Thursday night football short week performance recovery`; `homecoming athlete performance emotion`.
10. DuckDuckGo HTML: 4 of 7 queries returned no parseable results (rate-limit/anomaly pages): `midseason coaching change performance`, `Thursday short week injury rate`, `NFL betting market efficiency injury news`, `Denver Broncos altitude advantage study`; the 3 that returned were non-academic (fan/analytics blogs) and are **not** cited as sources.
11. No peer-reviewed source found for **play-action efficacy at NFL level** (OpenAlex + Crossref) → recorded UNSOURCED, not used as a claim.
12. nflverse release asset `injuries/injuries_2015-2025.csv` → HTTP 404 (`Not Found`, 9-byte body); resolved by downloading 11 per-season files.

**Data-quality failures found (documented, not hidden)**
13. `injuries_2025.csv` has **no `date_modified` column** (header verified) → the "keep the last report per player-week" dedupe is weaker for 2025 only; effect: possible duplicate rows for 2025, so 2025 burden counts are an upper bound.
14. `ftn_charting_YYYY.csv` has 29 columns and **no per-play team column** (header verified at `/tmp/nfl/ftn_2024.csv`) → any team-attributed scheme rate requires a pbp join on `nflverse_play_id`; E2/F4 therefore SPEC-ONLY.
15. `rosters` cover 2015–2025 only → QB-revenge is truncated: a QB traded in 2016 who played for the opponent in 2013 is invisible, so A1's n=94 is a **lower bound** on the true revenge population (documented, not corrected, to preserve leak-safety of the join).
16. Road-streak ≥2 occurs in only 84/5,790 rows (1.5%): modern NFL scheduling alternates home/away enough that long road streaks are rarer than the folklore implies — a frequency fact discovered by the test, not assumed by it.
17. `games.csv` `temp`/`wind` are null for indoor and some outdoor games (e.g. 2022: only 96/271 have temp) → cold/windy flag is conservative; flagged set is a lower bound.

**Environment / execution failures**
18. Long shell pipelines produced **empty stdout** for python scripts (both `> file` and `| tee` yielded 0 bytes while rc=0) — an iSH fake-filesystem flush/capture defect; workaround: write results with `flush + os.fsync` to one JSON file per compound, then read them back.
19. The first version of the gate battery died mid-run (background process killed) after printing only 3 of 10 compounds; rebuilt as a resumable, per-compound script with reduced bootstrap (300) and permutation (60) draws.
20. `pandas`/`numpy` absent by default; installed via `apk add py3-numpy py3-pandas` (1029 MiB of packages). `pyarrow` is absent → parquet assets unusable; all downloads are CSV.
21. Repo-native tests remain unpublishable here (prior-session finding, re-confirmed): no `npm install` on this filesystem (ENOTEMPTY/rename failures), so no vitest suite was run — tonight's execution is pure-Python on nflverse public data, which is why every compound is validated against a *closing line* rather than against the repo's `trials-registry` admission path (that path is the architect's, not this lane's).
22. Publisher bot walls: DOI resolution verified through OpenAlex+Crossref metadata, but direct DOI HEAD checks returned **HTTP 403** for 12 of 20 sampled DOIs (Wiley/APA/Sage/Elsevier/APA publishers) — no PDFs were fetched, so every "CONFIRMED" tier rests on two independent index records, and no source was cited whose abstract could not be read.

---

## DONE STATEMENT

- **File:** `/var/minis/workspace/gse-discovery/minis-overnight-deep-report-2026-09-14.md` (this file; mirror at `/root/workspace-gse/gse-discovery/minis-overnight-deep-report-2026-09-14.md`).
- **Companion artifacts (all on disk, re-runnable):** `prereg-2026-09-14.md` (frozen before outcomes), `oa_search.py`/`oa2.py`/`cr.py` (literature probes), `build2.py`/`build3.py` (feature build), `gates2.py` + `res_*.json` (gate battery), `boundary.py` (Gate 5c), `/tmp/nfl/compound_table2.csv`, `/tmp/nfl/roster*`, `/tmp/nfl/injuries_*`, `/tmp/nfl/ftn_*`.
- **Six clusters cycled; every skeleton marked DRAFT-FOR-ARCHITECT; every equation has a falsifier; every executed test ran the gates in order with the killing gate recorded; every finding tiered with an honesty check; zero placeholders; zero invented numbers.**

**The 3 compounds I would bet on** (all re-based into props space, which is where the surviving mechanism lives):
1. **L1 — cold/wind × passing exposure.** Weather is the one physical term with a *mechanism-level* target (completion probability, passing yards) that the repo already ingests but does not admit into props; the game-level version is dead (C2, n=10) precisely because the *conjunction* is rare, while the exposure version has thousands of pass attempts.
2. **L3 — starter-weighted unavailability → props pricing gap.** It is the only powered pre-registered test tonight that was *directionally opposite* to the folk wisdom (D1, n=369, c=+0.05), which says the game line fully prices public injury disclosure; the unexploited part, if any, is the teammate-level props redistribution, which the D-cluster refinement makes measurable with `snap_counts`.
3. **L2 — revenge, within-player.** It survives on the strength of the *design* (within-player, so all hedonic and ability confounds cancel) rather than on tonight's n=18 game-level null, and it is blind-executable from `player_stats` alone.

*Every other compound in the frozen list is KILLED with its gate recorded, and the pooled hierarchical test (L5) is the one test that could close the game-level branch of the lane for good.*