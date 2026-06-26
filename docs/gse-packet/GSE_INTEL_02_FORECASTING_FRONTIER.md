> Companion deep-dive to **GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md** · Galaxy Sports Edge · 2026-06-23

# Galaxy Sports Edge — The Forecasting Frontier

**Five modules that forecast what moves the points — opportunity, role, injury/return, game script, and regression — not the points themselves.**
Branch `claude/sweet-fermi-sk9gws` · NFL-live · ~80 days to Sept 9 2026 kickoff · peak draft season now.
Companion to the Intelligence Core design and the Forecasting & Prediction Methodology Atlas.

---

## Thesis

Fantasy points are a noisy *output*; opportunity is a stable, predictable *input* — and that asymmetry is the whole edge. Week-to-week fantasy scoring is dominated by touchdown variance, catch luck, and game flow, none of which a player controls; the year-one correlation of a receiver's fantasy points to next week's fantasy points is weak, while his target share, route participation, and snap rate are among the stickiest signals in football (a receiver who ran 92% of routes last week runs ~90% this week far more reliably than he scores 18 points again). Every consumer fantasy tool forecasts the noisy thing — points — because points are what the leaderboard scores, so the entire industry crowds into the hardest-to-predict, least-defensible quantity. GSE's durable position is to forecast the *causes*: the target/snap/route/carry/red-zone distribution (opportunity), how that distribution migrates when a depth chart changes (role), whether a player is even on the field and for how many snaps (availability), the volume environment the offense will operate in (game script), and which current rates are unsustainable mirages about to revert (regression). These are forecastable, they are the dynamic inputs the Intelligence Core needs to make its market-anchored projections *move correctly* week to week, and — because each is a legible "the market says X, our usage model says Y" story — they double as standalone products and the best content engine GSE will ever have. Points are where everyone competes and no one wins; usage is where almost no one competes and the math actually holds.

---

## How these five fit together (and feed both products)

```
  Vegas spread/total/win-prob ──► (3) GAME-SCRIPT ──► team pass/run/pace/plays env
                                          │
  depth chart + injuries ──► (2) INJURY/RETURN ──► P(active), E[snap%], role-tenure
                                          │                   │
  nflverse PBP/targets/air-yards ─► (1) OPPORTUNITY/ROLE ◄────┘
        │  Markov role states + vacated-touch redistribution
        ▼
   forecast next-week target%/snap%/route%/carries/RZ touches  (the dynamic inputs)
        │                                          │
        ├──────────────► INTELLIGENCE CORE ◄───────┘   (Core allocates Vegas team total
        │                 (usage × efficiency posteriors)   across roster using THESE)
        ▼
  (4) BREAKOUT/REGRESSION ── expected-vs-actual (xTD, xCatch, xYPRR) ──► sustainability flags
        │
        ▼
  (5) DIVERGENCE LAYER = MARKET-MINUS-MODEL  (unifies 1–4 against prop lines / ADP / ECR)
        ├──► betting edge candidate  (shadow → Model Court → priced)
        ├──► fantasy buy-low / sell-high
        └──► content ("the market says X; our usage model says Y; here's the receipt")
```

The one-sentence version: **Game-script sets the team volume pie, Opportunity+Injury forecast each player's slice of that pie, Regression tells you which slices are about to shrink, and Divergence is where our slice math disagrees with the market — which is simultaneously a bet, a roster move, and a tweet.**

### Proof-ladder placement at a glance

GSE's law: usage/opportunity *reads* (what happened, and the mechanical redistribution of it) are **process-grade** and ship now under `canPublishProjections=false`; any **forward forecast that earns a price or a published number** is gated — shadow (`priced=false`) → calibrate → Model Court → priced, on the standing milestones (PROVEN n≥100 settled + non-worsening ECE; ESTABLISHED n≥500 + CLV≥52.4%; AUTHORITY n≥2000 + CLV≥55%). Each module below states exactly which half it lives in.

| # | Module | File | Method (Atlas verdict) | Process-grade now | Gated forecast |
|---|---|---|---|---|---|
| 1 | Opportunity / Role-Migration | `lib/projections/opportunity-forecast.ts` | Markov/HMM role-state + EB-shrunk transitions + vacated-share redistribution | Vacated-touch redistribution, current role state | Next-week target%/snap%/route%/carry/RZ point forecasts |
| 2 | Injury / Return + Role-Tenure | `lib/projections/availability-forecast.ts` | Discrete-time hazard / Kaplan–Meier / Cox PH (deliberate reuse) | KM curves, designation base rates | P(active), E[snap%\|active], role half-life forecasts |
| 3 | Game-Script | `lib/projections/game-script.ts` | Win-prob-path integral → pass-rate/pace/plays regression + Monte Carlo | Historical script-vs-spread tables | Per-game pass%/plays/pace forecast |
| 4 | Breakout / Regression | `lib/metrics/regression-engine.ts` | Regression-to-mean + EB shrinkage; expected-vs-actual (xTD/xCatch/xYPRR); change-point | Expected-vs-actual gaps (descriptive) | Forecast reverted rate + buy-low/sell-high |
| 5 | Divergence Layer | `lib/projections/divergence.ts` | Market-minus-model standardized z; conformal interval overlap | The divergence *number* + receipt | The *ranked edge claim* / priced signal |

---

# Module 1 — Opportunity / Role-Migration Forecasting

### Forecasting question
For each skill player next week: what will his **target share, snap share, route participation, carry share, and red-zone (inside-10) touch share** be — and how do those shift the moment a teammate's status or the depth chart changes? Opportunity is the leading indicator of fantasy value and the single most important dynamic input the Core needs; we forecast the *touches*, not the points.

### Method + real math
Three composable pieces.

**(a) Role as a Markov / Hidden-Markov state process.** Discretize each player-week into an archetype state from the existing `player-archetype` taxonomy: `BELL_COW`, `LEAD`, `COMMITTEE`, `ROTATIONAL`, `DEPTH`, `OUT` (for RB; the parallel WR ladder is `ALPHA`, `WR2`, `SLOT`, `ROTATIONAL`, `DEPTH`, `OUT`). The observed usage vector (snap%, route%, target%, carry%) is the *emission*; the latent role is the *state*. Estimate a transition matrix **P** where `P[i][j] = Pr(state_{t+1}=j | state_t=i)`, fit from nflverse historical player-weeks. Next-week role distribution is `π_{t+1} = π_t · P`, with **HMM (Viterbi/forward)** smoothing when a single week's snaps are noisy (a bell-cow who got vultured at the goal line for one week shouldn't be misclassified as COMMITTEE). Because NFL samples are thin, every transition row is **empirical-Bayes shrunk** toward the league-average transition for that archetype:
`P̂[i][·] = (n_i · P_obs[i][·] + κ · P_prior[i][·]) / (n_i + κ)` with κ tuned by cross-validated log-loss (Atlas §20 Beta-Binomial/Dirichlet conjugate is the exact tool — the transition row is a Dirichlet-multinomial).

**(b) Opportunity emission per state.** Given the forecast role distribution, the expected usage is the state-conditional mean usage, itself EB-shrunk per player toward his archetype mean:
`E[target%_{t+1}] = Σ_j π_{t+1}[j] · μ_targetShare(j, player)` where `μ_targetShare(j, player)` is the player's shrunk mean target share *while in state j*. This is where the existing building blocks plug in directly — `receiving-opportunity.ts` (WOPR = 1.5·targetShare + 0.7·airYardsShare) and `route-rate` supply the receiving emissions; `rushing-efficiency` and depth-chart data supply the rushing/RZ emissions.

**(c) Vacated-opportunity redistribution (the injury/depth-chart shock).** When module 2 flags a player as `OUT` or downgraded, his vacated touches don't evaporate — they flow to teammates by **historical conditional share**. For each remaining player p, the redistributed gain is:
`Δtarget%_p = vacatedTarget% · w_p` where weights `w_p` come from the *games the injured player already missed this season/career* (true conditional), falling back to a **Dirichlet prior over position-room redistribution** (e.g., when the WR1 sits, slot+WR2 historically absorb ~62%/historical split) when no same-roster sample exists. Red-zone vacancy redistributes on its own (separate, fatter-tailed) matrix because goal-line work concentrates differently than perimeter targets. Output deltas carry **bootstrap intervals** (Atlas ADOPT-NOW) so "WR2 gains +6.1pp target share [95% CI +2.3, +9.8]" is honest about uncertainty.

### GSE file + typed contract
`lib/projections/opportunity-forecast.ts` (new, in the projections lane). Consumes the metrics-factory outputs; emits a forecast object the Core ingests.

```ts
// lib/projections/opportunity-forecast.ts
export type RoleState =
  | 'BELL_COW' | 'LEAD' | 'COMMITTEE' | 'ROTATIONAL' | 'DEPTH'   // RB ladder
  | 'ALPHA' | 'WR2' | 'SLOT'                                      // WR ladder
  | 'OUT';

export interface OpportunityForecastInput {
  playerId: string;
  team: string;
  position: 'RB' | 'WR' | 'TE';
  week: number;
  roleHistory: { week: number; state: RoleState; usage: UsageVector }[]; // nflverse-derived
  archetype: ReturnType<typeof import('../metrics/player-archetype')>;
  depthChart: DepthChartSnapshot;
  vacancies: VacatedOpportunity[]; // injected by availability-forecast (Module 2)
}
export interface UsageVector {
  snapPct: number; routePct: number; targetShare: number;
  carryShare: number; rzTouchShare: number; airYardsShare: number;
}
export interface OpportunityForecast {
  playerId: string; week: number;
  roleDistribution: Record<RoleState, number>;   // π_{t+1}, sums to 1
  expected: UsageVector;                          // EB-shrunk emission means
  deltaFromBaseline: UsageVector;                 // redistribution shock
  interval: Record<keyof UsageVector, [number, number]>; // bootstrap 95% CI
  envelope: StatCommandment;                      // source/timestamp/definition/weakness
  grade: 'process';                               // reads are process-grade
}
```

### Feeds BOTH products
- **Fantasy:** `expected` IS the start/sit and waiver leading indicator — "buy this player, his role just expanded" lands a week before the box score does. The `deltaFromBaseline` after an injury is the highest-value waiver alert in fantasy.
- **Betting:** `expected` target/carry forecasts are the volume input for player **prop** reads (receptions, rush attempts, rush+rec yards O/U) inside `edge-engine.ts`; the redistribution model is how GSE prices the backup RB's rush-attempts prop the instant the starter is ruled out — usually before the book fully adjusts.
- **The Core:** this is the dynamic usage posterior the Core multiplies against efficiency to allocate the Vegas team total. Without it the Core's allocation is static; with it the projection moves correctly on news.

### Test + clearance envelope
- **Smallest test that proves it works:** a **backtest** asserting that, on a held-out season, last-week role-state + transition matrix predicts next-week snap% with **lower MAE than the naive "same as last week" carry-forward** baseline (the honest null). For redistribution: replay 20 historical mid-season injuries and assert the forecast vacated-target redistribution beats an equal-split null on realized next-week target share (MAE). Transition matrix rows must each sum to 1 (golden unit test); EB shrinkage must reduce out-of-sample log-loss vs unshrunk (regression guard).
- **Clearance:** every output carries a `stat-commandment` envelope (source = nflverse PBP/snap-counts + timestamp; definition = the Markov emission formula; weakness = "thin same-roster injury samples fall back to a position-room Dirichlet prior; week-1 has no current-season transitions and leans on prior-season + ADP"). Passes `checkClearance()`. **Reads/redistribution are process-grade (`grade:'process'`, ships now).** The *forecast usage numbers as a published projection* are gated — they surface inside the Core's gated projection, not as a standalone published point claim, until backtested.
- **Proof-ladder placement:** redistribution + current role = **process-grade now**; forward usage forecast = **gated** (shadow until the MAE-beats-naive backtest clears, then it can carry weight in the Core).

### Content hook
**"Vacated Touches."** The instant a starter is ruled out, auto-generate: *"[Starter] is out. Last two times he missed, [Backup] saw 71% of the vacated carries and 4 of 5 red-zone rushes. Our model moves [Backup] from a COMMITTEE role to a LEAD role: projected 17 carries [CI 13–21], up from 6."* This is the most screenshot-able fantasy content that exists, it posts itself off an injury feed, and it is pure usage math — no projection-publishing risk.

---

# Module 2 — Injury / Return + Role-Tenure Forecasting

### Forecasting question
Two linked questions. **(a) Availability:** given an injury designation (Q/D/O), an injury type, and a player's history, what is the probability he is active this week, and *conditional on active*, what is his expected snap%? **(b) Role-tenure:** how long does a hot role last before it regresses to a committee — i.e., the player who just had two bell-cow weeks, what's the probability he's still a bell-cow in week +1, +2, +3?

### Method + real math — the deliberate, correct Cox reuse
**The Atlas marked Cox/survival SKIP for the win/loss PICK surface — and that verdict is correct there, because a game outcome has no duration or censoring.** But that is *exactly* why it belongs here: this module's targets ARE durations with censoring. "How many weeks until this player returns" and "how many weeks until this hot role ends" are textbook time-to-event problems, and a player who hasn't returned yet (or whose role hasn't ended yet) is a *right-censored* observation — the precise structure Kaplan–Meier and Cox proportional hazards were built for. This is a deliberate, surgical reuse of a tool the Atlas shelved for one surface because it is ideal for a different one. (Atlas §31 itself notes survival is "genuinely useful" off the pick surface.)

**(a) Availability — discrete-time hazard.** Model `Pr(return in week k | not yet returned, injury type, history)` as a discrete-time hazard (a logistic regression with week-since-injury as the time index): `logit h_k = α_k + β·x` where `x` = injury type (hamstring/ankle/concussion/knee…), age, position, practice-participation that week (DNP/LP/FP — a clean nflverse-adjacent signal), and prior games-missed for that injury class. **Kaplan–Meier** gives the non-parametric return curve per injury type as the honest base rate; **Cox PH** lets covariates (practice status, age) shift the hazard via `h(t|x) = h_0(t)·exp(β·x)` without assuming the baseline curve's shape. Output: `P(active)` this week. Then a *second* stage — **quantile regression** (Atlas PILOT) of snap% on weeks-since-return — produces `E[snap%|active]` with a band, because returning players are often snap-capped ("pitch count") for 1–3 weeks. The existing `human-performance/availability` building block (injuries/snaps) is the feature source.

**(b) Role-tenure — survival on role duration.** Treat a role spell (consecutive weeks in `BELL_COW`/`ALPHA`) as a lifetime; fit a **Kaplan–Meier survival curve** `S(k) = Pr(role persists ≥ k weeks)` and a **Cox model** with covariates (efficiency during the spell, draft capital, coach tendency, whether the spell was injury-induced vs earned). This forecasts role half-life: "this bell-cow spell has a median survival of 4 weeks; he's in week 3; P(still bell-cow next week)=0.78." That hazard feeds Module 1's Markov transition matrix as a *time-varying* prior (a spell that's lasted 6 weeks is stickier than one that's lasted 1 — pure Markov is memoryless, the hazard restores duration-dependence).

### GSE file + typed contract
`lib/projections/availability-forecast.ts` (new).

```ts
// lib/projections/availability-forecast.ts
export type Designation = 'NONE' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'IR' | 'PUP';
export type PracticeStatus = 'DNP' | 'LP' | 'FP';

export interface AvailabilityInput {
  playerId: string; week: number;
  designation: Designation;
  injuryType: string;                 // 'hamstring' | 'ankle' | 'concussion' | ...
  weeksSinceInjury: number | null;
  practiceWeek: PracticeStatus[];      // [Wed, Thu, Fri]
  history: InjurySpell[];              // from human-performance/availability
  currentRoleSpellWeeks: number;       // for tenure model
  roleSpellContext: { efficiencyZ: number; draftCapital: number; injuryInduced: boolean };
}
export interface AvailabilityForecast {
  playerId: string; week: number;
  pActive: number;                                 // discrete-time hazard
  expectedSnapPctIfActive: { p50: number; p10: number; p90: number }; // quantile reg
  kmReturnCurve?: { week: number; pReturned: number }[]; // KM, for "expected return" content
  roleHalfLifeWeeks: number;                       // KM median residual life
  pRolePersistsNextWeek: number;                   // hazard → feeds Module 1 transitions
  envelope: StatCommandment;
  grade: 'process';
}
```

### Feeds BOTH products
- **Fantasy:** `pActive` × `expectedSnapPctIfActive` is the start/sit confidence number for every questionable player — the difference between "he'll play" and "he'll play but he's snap-capped at 55%" is the whole start/sit decision. Role half-life tells you whether to *trade* a hot player now (sell-high before the committee returns).
- **Betting:** availability widens or kills prop and team-total reads; a 0.45 P(active) on a WR1 is a fade on his receiving props and a nudge on the opponent's pass-defense-friendly unders. Returning-from-injury snap caps are a systematically mispriced prop edge (the book often prices the player at full volume in week 1 back).
- **The Core:** `pActive` and the snap-cap band are the Core's **band-widening** input — an uncertain availability should *fatten the projection interval*, not just shift the mean. This is how the Core stays honest about a questionable player instead of pretending to know.

### Test + clearance envelope
- **Smallest test that proves it works:** a **calibration backtest** — bucket historical `pActive` forecasts into deciles and assert realized active-rate is monotone-increasing across deciles with Wilson-interval-overlapping reliability (the same Confidence Decile Reliability gate the engine uses), and Brier ≤ the naive "designation base rate" baseline. For role-tenure: assert KM-predicted median spell length is within tolerance of realized spell lengths on a held-out season.
- **Clearance:** envelope source = nflverse injury reports + practice participation + snap counts; weakness = "practice-status reporting is gamed by some teams; concussion protocol timing is exogenous and partly unpredictable; small per-injury-type samples are KM-smoothed." Passes `checkClearance()`. Base rates and KM curves are **process-grade now**; the calibrated `pActive` as a published number is **gated** until the decile-reliability backtest clears.
- **Proof-ladder placement:** **process-grade now** for designation base rates + KM curves; the **gated** forecast is the calibrated `pActive` / snap-cap band that feeds priced prop reads and the Core's published intervals.

### Content hook
**"The Return Curve" + "Snap-Cap Watch."** *"Players with this hamstring grade and a Friday LP have historically returned at a 38% rate that week — and when they return, they average 61% of snaps for two weeks before normal. [Player] is the textbook case."* And the role-tenure version: *"Hot-hand alert: [RB]'s bell-cow run has a median life of 4 weeks. He's in week 4. Sell-high window is now."* Both are pure timing/availability math — no point projection.

---

# Module 3 — Game-Script Forecasting

### Forecasting question
From the Vegas spread, total, and the implied win-probability *path*, what is each team's forecast **pass rate, run rate, total plays, and pace (seconds/play)** — i.e., the volume environment the offense will operate in? Trailing teams pass more and play faster; leading teams run and bleed clock. Game-script is the bridge that makes the fantasy projection and the betting total/prop reads *consistent* — they're conditioned on the same forecast environment.

### Method + real math
**(a) Win-probability path → expected pass rate.** The licensed Odds API gives spread + total → an implied final margin distribution. Convert to an *in-game* win-probability trajectory: simulate the game's scoring as a **Monte Carlo** (Atlas PILOT) over drive outcomes seeded by the total (expected points) and spread (expected margin), or, cheaper for v1, use a closed-form approximation where pre-snap WP at each game-state is a logistic function of (current margin, time remaining, expected margin). For each simulated game-second, neutral-vs-trailing pass-rate is read from a fitted **pass-rate-over-expected curve** `passRate(scoreDiff, timeRemaining)` estimated from nflverse PBP (the well-established "teams down 10+ in the 2nd half pass ~62%" surface). Integrate over the WP path:
`E[passRate_team] = ∫ passRate(margin(t), t) · density(t) dt` ≈ average over Monte Carlo sims.

**(b) Plays and pace.** Total plays per team is a regression on (total, spread magnitude, both teams' historical pace, expected number of possessions). Pace (sec/play) shifts with script — trailing teams hurry. Output a team **volume environment**: `{passPlays, runPlays, totalPlays, secPerPlay, neutralPassRate, scriptLeverage}` where `scriptLeverage` is how *sensitive* this game's volume is to the script (a pick'em total-50 shootout has high pass-volume variance; a 3-point total-38 grind is stable). **Quantile regression** gives the play-count band.

This conditions Module 1's emissions: a WR's `targetShare` is roughly stable, but `targets = targetShare × passPlays`, so the same role in a 42-pass-attempt script is worth far more than in a 28-attempt script. Game-script is the multiplier that turns *shares* into *counts*.

### GSE file + typed contract
`lib/projections/game-script.ts` (new). Reads odds inputs (same source as `edge-engine.ts`) + nflverse PBP rate curves.

```ts
// lib/projections/game-script.ts
export interface GameScriptInput {
  gameId: string;
  homeTeam: string; awayTeam: string;
  spread: number;            // home line, from Odds API
  total: number;
  homePacePrior: number; awayPacePrior: number;      // sec/play, nflverse
  homeNeutralPassRate: number; awayNeutralPassRate: number;
}
export interface TeamVolumeEnvironment {
  team: string;
  expectedPassPlays: { p50: number; p10: number; p90: number };
  expectedRunPlays: { p50: number; p10: number; p90: number };
  expectedTotalPlays: number;
  expectedSecPerPlay: number;
  scriptAdjustedPassRate: number;   // integrated over WP path
  scriptLeverage: number;           // volume sensitivity to game flow, 0–1
}
export interface GameScriptForecast {
  gameId: string;
  home: TeamVolumeEnvironment; away: TeamVolumeEnvironment;
  envelope: StatCommandment;
  grade: 'process';                 // derived from market + public PBP; no projection published
}
```

### Feeds BOTH products
- **Fantasy:** the pass/run split is the start/sit tiebreaker — start the RB in a positive script (lead → run), start the pass-catcher in a negative script (chase → pass). The Core multiplies every player's usage share by this team's forecast play counts.
- **Betting:** this is the **bridge that makes the total/prop reads consistent with the fantasy projection** — the same forecast pass volume that lifts a WR's projection should agree with the team passing-yards total and the game total. If GSE's player props sum to more passing than its own game-script forecast supports, that's an internal-consistency QA flag (and sometimes a real market inefficiency to bet). Pace/plays feed totals (more plays → higher total) and pace-sensitive props.
- **The Core:** converts the Core's per-player *shares* into *counts*. It's the team-level volume layer the Core allocates within.

### Test + clearance envelope
- **Smallest test that proves it works:** backtest asserting forecast team pass% (from pre-game spread/total only) has **lower MAE than the league-average pass rate baseline** on a held-out season, and that the play-count p10–p90 band achieves ~80% empirical coverage (interval honesty). Monte Carlo determinism: same seed → same forecast (golden test).
- **Clearance:** envelope source = Odds API (spread/total, timestamped) + nflverse PBP rate curves; weakness = "garbage-time and weather are partial; the WP→pass-rate curve assumes league-average coaching tendency and is adjusted only coarsely per team; overtime is truncated." Passes `checkClearance()`. **Process-grade now** — it's a deterministic transform of market data + public PBP, publishing no player projection (same posture that lets `market-power-ratings.ts` ship fast).
- **Proof-ladder placement:** **process-grade now** (a market+PBP transform, like the market read). It can inform priced totals/props only after its pass% and play-count forecasts clear a Model Court non-worsening check against the current naive volume assumption.

### Content hook
**"Script Report."** Per game: *"Vegas implies [Away] trails most of the day. Our model forecasts them to a 64% pass rate and 41 attempts — top-5 pass volume this week. That's a tailwind for [WR] and a headwind for [RB]'s rushing prop."* It ties the betting line and the fantasy call into one legible story, which is the whole GSE position.

---

# Module 4 — Breakout / Regression Engine

### Forecasting question
Which players' current production rests on **unsustainable rates** — touchdown rate over expected, catch rate, yards-per-route-run untethered from opportunity — and will therefore regress? Produce **buy-low / sell-high** signals and "the market hasn't caught up" flags. This directly extends `receiving-opportunity.ts`'s buy-low/sell-high divergence logic.

### Method + real math
**(a) Regression-to-the-mean with shrinkage.** For any rate stat r (TD rate, catch rate, YPRR), the forecast next-period rate is not the observed rate — it's the observed rate **shrunk toward the player's opportunity-implied expectation** by reliability:
`r̂_next = w · r_observed + (1 − w) · r_expected`, `w = n / (n + κ)` where n is the sample (targets, routes, carries) and κ is the stat's stabilization constant (catch rate stabilizes fast; TD rate stabilizes *very* slowly, so its w stays low and its forecast is dominated by expectation). This is empirical-Bayes / James–Stein (Atlas ADOPT-NOW) applied to player rates. The *gap* `r_observed − r̂_next` is the regression signal: large positive gap on a slow-stabilizing stat = sell-high; large negative gap = buy-low.

**(b) Expected-vs-actual via xTD / xCatch / xYPRR.** Build expected baselines from opportunity: **xTD** from red-zone touches, yard-line, and target depth (a player "should" score on ~X% of inside-5 touches); **xCatch** from target depth and separation proxies (air yards); **xYPRR** anchored to WOPR and air-yards share. The headline regression signal is `actualTD − xTD` (a receiver with 7 TDs on 2.8 xTD is the canonical sell-high; the Core should project his rest-of-season scoring near xTD, not 7-TD pace). This *is* the generalization of `receiving-opportunity.ts`'s WOPR-vs-production divergence — that file already encodes the idea that opportunity (WOPR) should predict production, and a gap between them is a signal; Module 4 extends it to TDs, catch rate, and YPRR with explicit expected models and shrinkage.

**(c) Change-point detection** (Atlas PILOT, CUSUM/MAD) distinguishes a *real* role change (sustained shift — keep it) from a *variance blip* (revert it). A receiver whose target share jumped *and held for 3 weeks* with a detected change-point is a genuine breakout (don't regress him); one whose points jumped on a fluky 2-TD week with no usage change is pure variance (fade). This is the crucial guardrail that prevents the engine from fading real breakouts — it asks "did the *opportunity* change, or just the *output*?"

### GSE file + typed contract
`lib/metrics/regression-engine.ts` (new metrics-factory module — it produces derived metrics with envelopes).

```ts
// lib/metrics/regression-engine.ts
export type RateStat = 'tdRate' | 'catchRate' | 'yprr' | 'yardsPerCarry' | 'aDOT';
export interface RegressionInput {
  playerId: string; position: string;
  observed: Record<RateStat, { value: number; sampleSize: number }>;
  opportunity: {                 // from receiving-opportunity.ts + rushing-efficiency
    wopr: number; airYardsShare: number; rzTouches: number;
    inside5Touches: number; routes: number; targets: number;
  };
  recentRoleSeries: { week: number; targetShare: number }[]; // for change-point
}
export interface RegressionSignal {
  playerId: string;
  perStat: Record<RateStat, {
    observed: number; expected: number;     // xTD/xCatch/xYPRR
    forecastNext: number;                   // shrunk r̂_next
    gap: number;                            // observed − forecastNext
    stabilization: number;                  // w = n/(n+κ)
  }>;
  signal: 'BUY_LOW' | 'SELL_HIGH' | 'SUSTAINABLE' | 'NEUTRAL';
  changePointDetected: boolean;             // real role shift vs variance blip
  marketLagFlag: boolean;                   // ADP/ECR hasn't moved but usage/expectation has
  confidence: number;
  envelope: StatCommandment;
  grade: 'process';
}
```

### Feeds BOTH products
- **Fantasy:** the canonical buy-low/sell-high engine — "sell [WR], his 7 TDs are built on 2.8 xTD; the market values him as a WR1, our model has him as a WR2 going forward." `marketLagFlag` is the actionable trade/waiver edge.
- **Betting:** `actual − expected` on TD rate is a direct **anytime-TD prop** fade/back signal; a player priced on hot-streak TD odds with low xTD is a profitable under. Regression on team-level rates (e.g., a defense forcing turnovers over expected) feeds totals.
- **The Core:** supplies the *rest-of-season* mean the Core regresses each player's efficiency posterior toward — without it the Core would extrapolate hot streaks. This is the Core's mean-reversion prior on the efficiency side, exactly as game-script is its volume prior.

### Test + clearance envelope
- **Smallest test that proves it works:** backtest asserting the **shrunk forecast `r̂_next` has lower out-of-sample MAE on next-period rate than the raw observed rate** (proves shrinkage adds value — the core claim of the whole module) on held-out player-seasons, per stat. xTD must be calibrated (players binned by xTD score at the predicted rate, reliability check). Change-point precision/recall measured against hand-labeled real role changes on a sample.
- **Clearance:** envelope source = nflverse PBP/targets/air-yards/red-zone; weakness = "xTD red-zone samples are small for low-volume players; TD rate stabilizes so slowly that single-season forecasts are dominated by the prior; YPRR expectation depends on the air-yards proxy for separation." Passes `checkClearance()`. **Expected-vs-actual gaps are descriptive → process-grade now.** The *forward reverted-rate forecast* that feeds priced prop reads is **gated**.
- **Proof-ladder placement:** **process-grade now** for the descriptive expected-vs-actual gap (and the buy-low/sell-high *flag*, which is opportunity-grounded); **gated** for the forward `r̂_next` forecast wherever it earns a price.

### Content hook
**"Mirage & Buried" (a weekly two-sided list).** *Mirage:* "[WR] — 7 TDs, 2.8 expected. The touchdowns aren't coming back. Our model projects WR2 production rest-of-season while ADP still prices a WR1." *Buried:* "[RB] — top-8 in carries and inside-5 touches, RB24 in points. The opportunity says the points are coming." This is the single most viral fantasy/betting content format that exists, it's a direct expansion of the divergence idea already in `receiving-opportunity.ts`, and "here's the expected-vs-actual receipt" is the GSE brand in one image.

---

# Module 5 — The Divergence Layer

### Forecasting question
**Where does GSE's bottom-up usage/efficiency model most disagree with the market?** Define a single unifying signal — **MARKET-MINUS-MODEL divergence** — that is, in one number, (a) a betting edge candidate, (b) a fantasy buy-low/sell-high, and (c) the best content engine GSE has ("the market says X; our usage model says Y; here's the receipt"). This is the capstone: Modules 1–4 produce a model view; the market produces prop lines, ADP, and ECR; Divergence is the standardized gap between them.

### Method + real math
**(a) Put model and market on the same axis.** For every player and every comparable market quantity, compute a model estimate and the market estimate of the *same thing*:

| Market quantity | Market source | Model estimate (from Modules 1–4 + Core) |
|---|---|---|
| Receptions / rush-att / yards prop line | Odds API props | Module 1 usage × Module 3 plays × efficiency |
| Anytime-TD odds → implied TD prob | Odds API | Module 4 xTD-based forecast |
| ADP / ECR (fantasy "price") | ingested ranking feeds | Core rest-of-season projection rank |

**(b) Standardize the gap.** Divergence is a **z-score** of (model − market) scaled by the *forecast's own uncertainty* (the conformal/bootstrap interval from the source module), not a raw difference — a 0.5-reception gap on a tight interval is a bigger signal than a 2-reception gap on a wide one:
`divergence_z = (model_p50 − market_implied) / σ_model` where σ_model is the half-width of the module's prediction interval. The magnitude *and the agreement across modules* matter: a prop where Module 1 (more targets), Module 3 (pass-heavy script), and Module 4 (positive regression) all point the same way is a **stacked divergence** — the strongest class of signal. Cross-check coverage with **conformal intervals** (Atlas ADOPT-NOW): only surface a divergence as an *edge candidate* when the market value sits **outside** the model's conformal interval, so the claim has a coverage guarantee behind it.

**(c) Route by surface.**
- **Betting:** a divergence on a prop line enters the existing shadow → Model Court → priced pipeline as an Edge-Engine candidate. It is *never* auto-published as a bet (`draft-only.mjs` law); it's a ranked candidate with a receipt, priced only after the source forecasts have cleared their own gates (n≥100, non-worsening ECE).
- **Fantasy:** a divergence vs ADP/ECR is a buy-low (model > market) or sell-high (model < market) — surfaced as a ranked board, process-grade because it's a comparison of public usage facts against a public ranking.
- **Content:** every divergence renders the receipt — the market number, the model number, and the *three-module why* — which is the GSE voice exactly.

### GSE file + typed contract
`lib/projections/divergence.ts` (new). It's an *aggregator* — it imports the four modules + Core and the market feeds and emits one ranked, receipted signal set.

```ts
// lib/projections/divergence.ts
export type DivergenceSurface = 'PROP' | 'FANTASY_ADP' | 'FANTASY_ECR' | 'ANYTIME_TD';
export interface DivergenceInput {
  playerId: string; week: number;
  marketValue: number;              // prop line / implied prob / ADP / ECR
  surface: DivergenceSurface;
  modelEstimate: { p50: number; conformalLow: number; conformalHigh: number; sigma: number };
  contributing: {                   // which modules drive it (for "stacked" detection + receipt)
    opportunity?: number; gameScript?: number; regression?: number; availability?: number;
  };
}
export interface DivergenceSignal {
  playerId: string; week: number; surface: DivergenceSurface;
  marketValue: number; modelValue: number;
  divergenceZ: number;                  // standardized (model − market)/σ
  outsideConformalInterval: boolean;    // coverage-backed edge gate
  stacked: boolean;                     // ≥2 modules agree in direction
  direction: 'MODEL_HIGHER' | 'MODEL_LOWER';
  receipt: string;                      // the "market says X, usage model says Y because…" line
  routing: { bettingCandidate: boolean; fantasySignal: 'BUY_LOW' | 'SELL_HIGH' | 'NONE' };
  grade: 'process' | 'gated';           // the comparison is process-grade; the priced edge is gated
}
```

### Feeds BOTH products
This module IS the convergence point — it's how Modules 1–4 and the Core *become* both a betting product and a fantasy product through one computation. Betting takes `routing.bettingCandidate` into the shadow pipeline; fantasy takes `routing.fantasySignal` onto the buy-low/sell-high board; content takes `receipt`. One signal, three surfaces.

### Test + clearance envelope
- **Smallest test that proves it works:** a **closing-line-value backtest** — assert that prop divergences flagged `outsideConformalInterval` move toward the model on average (positive CLV) on held-out historical prop lines; conformal coverage holds at the stated α (the interval contains the realized value ~(1−α) of the time). Unit: a synthetic case where model and market agree yields `divergenceZ≈0` and no candidate (no false edges). The `stacked` flag must fire only when ≥2 `contributing` modules share sign (golden test).
- **Clearance:** envelope source = each contributing module's envelope (chained) + the market feed timestamp; weakness = "divergence is only as honest as the weakest source module's calibration; an unproven module's divergence is a hypothesis, not an edge — which is why the priced route is gated behind every source's own ladder." Passes `checkClearance()`. The **divergence number and the fantasy/content surfacing are process-grade** (a transparent comparison of public facts); the **priced betting edge is gated** through Model Court.
- **Proof-ladder placement:** the **comparison + receipt + fantasy board = process-grade now**; the **priced betting edge = gated** (shadow → Model Court → priced, and it cannot price faster than its slowest contributing forecast).

### Content hook
**"The Receipt" — the flagship recurring format.** Each post: a single player, the market number on the left, the GSE model number on the right, and the three-module reason in between — *"Market: 4.5 receptions. GSE: 6.8 [6.1–7.5]. Why: route share up to 88% (role expanded), script forecasts 41 pass attempts (negative game flow), and his catch rate is below expected (positive regression). The line hasn't caught up."* It is the same artifact whether the reader is a bettor or a fantasy manager, it carries its own evidence, and it is the purest possible expression of "math you can read." Divergence isn't just a module — it's the content factory the other four feed.

---

# Ranked build order

Ordered by **leverage × cost-fit-to-launch**, respecting that process-grade reads ship now and forecasts gate.

1. **Module 1 — Opportunity / Role-Migration (`opportunity-forecast.ts`).** *The keystone.* It's the Core's most important dynamic input, the leading indicator for fantasy, the volume input for props, and the redistribution engine that powers the highest-value injury content. Most of it (current role + vacated-touch redistribution) is **process-grade and ships immediately** on cleared nflverse data. Build first.
2. **Module 4 — Breakout / Regression (`regression-engine.ts`).** *Cheapest high-signal win.* It's a direct extension of the `receiving-opportunity.ts` divergence logic already in the repo, the math is shrinkage + expected-vs-actual (both ADOPT-NOW, both pure functions of cleared data), the expected-vs-actual gap is process-grade now, and "Mirage & Buried" is launch-day viral content. Almost no new data dependency.
3. **Module 3 — Game-Script (`game-script.ts`).** Unlocks the *counts* (shares × plays) that make Modules 1 and 4 worth real fantasy/betting numbers and ties the betting line to the fantasy call. Process-grade as a market+PBP transform (ships without a calibration wait, like the market read). Build third because 1 and 4 are higher-signal standalone, but it's the multiplier that makes them quantitatively precise.
4. **Module 5 — Divergence Layer (`divergence.ts`).** The capstone and the content factory — but it *depends on* 1, 3, 4 (and the Core) existing, and its priced edge can't move faster than its slowest input's ladder. The comparison + content surface ships as soon as 1 and 4 do; the priced betting route follows their gates.
5. **Module 2 — Injury / Return + Role-Tenure (`availability-forecast.ts`).** Highest-craft module (the deliberate Cox reuse), and genuinely differentiating — but it's the heaviest to calibrate (per-injury-type hazards need samples) and the most exposed to noisy practice-report data. Base rates + KM curves ship process-grade early; the calibrated `pActive` gates last. Build the base-rate version alongside 1 (it feeds 1's vacancies), graduate the calibrated forecast last.

## Ship FIRST for the soft-launch: **Module 1 + Module 4**

Ship **Opportunity/Role-Migration (1)** and **Breakout/Regression (4)** as the soft-launch pair — and if forced to pick *one cheapest high-signal* starter, it is **Module 4 (Regression Engine)**: it reuses the divergence logic already living in `receiving-opportunity.ts`, needs essentially no new data class, its core math (EB shrinkage + expected-vs-actual) is ADOPT-NOW and ships process-grade *today*, and it produces "Mirage & Buried" / "The Receipt"-grade content from day one — the cheapest path to a shareable, defensible, on-brand signal. Module 1 is the higher ceiling (it's the Core's keystone input and the injury-content engine), so the recommended soft-launch is **4 first for immediate cheap signal, 1 immediately after for the durable moat** — together they stand up the Divergence content factory (5) before a single forecast needs to clear a gate.
