# Cross-Domain Transfer Map — GSE Engine

**Date:** 2026-10-06 · **Branch:** motif/cross-domain-transfer-2026-10-06
**Directive:** Garrett, 2026-10-06 — "just because it might be named football doesn't mean it won't fit somewhere else."

## Method

Every technique in the research corpus (X analytics sweeps, arXiv program, Kats deep-dive, brain ingestion) was asked one question: *what is the mechanism, and does the mechanism survive outside its home sport?* A transfer names the specific mechanism that carries over and the specific adjustment required. Transfers that fail scrutiny are marked REJECTED with the reason — a rejected transfer is data, not a failure.

## Status definitions (inherited from the brain's transfer-operator framework)

- **TRANSFER** — the operator maps onto the target domain. Parameters are learned on target-domain data under the harness. No coefficient is ever copied across sports.
- **STRUCTURE-ONLY** — the equation/pattern enters the library. The original unit does not. A new per-sport definition is required before any fit.
- **REJECTED** — the mechanism does not survive the transfer. Reason stated. Stays in the library as a negative label.

Standing invariants (from brain ingestion, not relaxed): μ stays the market close until a candidate beats Gaussian-close CRPS 7.109 by ≥ 0.01, n ≥ 150, walk-forward. No invented coefficients. No close used as a feature before the close. Weights are learned per sport or stay zero.

---

## A. X-analytics metric transfers (football-origin → other sports)

### A1. Robbed Score → cross-sport "deserved minus actual" composites
- **Source:** NFL (@AjayTakes, 2026-09-29). Robbed Score = (Route Win Rate − TPRR) + uncatchable target % + (XFPTS − FPTS). Definition: how unlucky a WR's production has been. Data: @FantasyPtsData.
- **Mechanism that carries:** process-quality minus outcome. Three-part structure: (opportunity-quality − usage) + (noise/luck share) + (expected − actual production).
- **Targets:**
  - **NBA:** (open-shot rate − usage%) + (teammate pass-up rate) + (xPTS − PTS). 82-game cadence gives more stable estimates than NFL's 17.
  - **MLB:** the xwOBA − wOBA gap IS this pattern already established. The novel transfer is the usage-gap term: (barrel/contact-quality rate − opportunity share) added to the luck gap.
  - **NHL:** (high-danger chance rate − ice-time share) + (xG − actual goals).
- **What breaks:** "uncatchable target %" has no clean analog in continuous sports — in NBA a bad pass is a turnover charged to the passer, not a luck term for the shooter. The luck component must be rebuilt per sport, not ported.
- **Status:** TRANSFER (structure). Parameters re-estimated per sport. The composite shape is the asset, not the football terms.

### A2. DAKOTA (EPA + CPOE composite) → forward-looking player composites
- **Source:** NFL QB rating (nflverse-derived, surfaced in sweeps via @PattonAnalytics). Composite of efficiency (EPA) and accuracy (CPOE), tuned to predict next-year efficiency.
- **Mechanism that carries:** combine a volume-efficiency metric with an execution-vs-expected metric into a composite tuned against a *future* efficiency target. The tuning-against-the-future is the mechanism, not the EPA.
- **Targets:**
  - **NBA (guards):** points per possession + shooting accuracy vs expected (eFG% over expected), tuned to next-season efficiency.
  - **NHL (goalies):** goals saved above expected + high-danger save%, tuned to next-season GSAA.
  - **MLB (pitchers):** FIP + command+ (location accuracy), tuned to next-season FIP.
- **What breaks:** CPOE is football-specific. Each sport needs its own "execution vs expected" metric defined before the composite exists. The 17-game NFL tuning window is short; MLB's 162 and NBA's 82 give cleaner tuning targets.
- **Status:** STRUCTURE-ONLY → TRANSFER once the per-sport accuracy metric is defined. The "tune a composite against future efficiency" pattern is the transfer.

### A3. "Passes to or past the sticks" → territorial-achievement metrics
- **Source:** NFL (@GridironInfo_). Share of throws reaching the line to gain. Binary achievement of the territorial subgoal, not raw yardage.
- **Mechanism that carries:** binary "did the play achieve the game's defined territorial objective."
- **Targets:**
  - **NHL:** zone entries with possession (crossing the blue line IS "past the sticks" — the mechanism maps 1:1).
  - **Soccer:** passes into the final third / penalty-box entries (territory gained past a defined line).
- **What breaks:** the marker must exist as a rule-defined line. Football's line-to-gain, hockey's blue line, soccer's final-third line all qualify.
- **REJECTED for NBA and MLB:** no line-to-gain exists. "Past the sticks" is meaningless without a territorial marker. Shot quality (NBA) and base advancement (MLB) are different mechanisms.
- **Status:** TRANSFER to NHL and soccer. REJECTED for NBA/MLB with reason above.

### A4. Separation Score / Route Win Rate → defender-distance-at-decision-point
- **Source:** NFL WR (@ScottBarrettDFB, @FantasyPtsData). Beating man coverage, measured as separation at the break/target point.
- **Mechanism that carries:** defender distance at the moment of the offensive decision. The threshold is sport-specific; the measurement point is the transfer.
- **Targets:**
  - **NBA:** closest-defender distance on jump shots (exists in tracking; the transfer is using it as a *predictive* feature the way football uses separation).
  - **Soccer:** separation from marker on runs into the box.
  - **NHL:** separation from checker at shot release.
- **What breaks:** football routes are scripted against known coverage; basketball/soccer separation is improvisational. The "2.5 yards at the break" threshold does not carry — each sport needs its own separation definition.
- **Status:** TRANSFER (mechanism = proximity at decision point, threshold rebuilt per sport).

### A5. TPRR (targets per route run) → opportunity-normalized usage
- **Source:** NFL WR (@ShaneSaysFF and across sweeps). Usage normalized by routes run, not snaps or games.
- **Mechanism that carries:** normalize usage by *opportunity*, not by time. The denominator choice is the insight.
- **Targets:**
  - **NBA:** touches per possession (not per minute) — opportunity is the possession.
  - **MLB:** swings at pitches in the zone per zone pitch seen — selectivity normalized by opportunity, not by PA.
  - **NHL:** shot attempts per shift.
- **What breaks:** "route run" is a discrete, countable opportunity. In continuous sports the denominator must be possession-, pitch-, or shift-based. Per-game or per-minute normalization reintroduces the noise TPRR was built to remove.
- **Status:** TRANSFER (pattern = opportunity-denominator usage rate).

### A6. Havoc Rate → disruptive-event rate composites
- **Source:** NFL defense (via @MagicSportsGuy: Atlanta 6th in Havoc Rate). TFL + sacks + INT + PBU + forced fumbles per play.
- **Mechanism that carries:** share of plays where the defense creates a disruptive event. The composite-of-disruption pattern, not the play list.
- **Targets:**
  - **NBA:** deflections + steals + blocks per 100 possessions.
  - **NHL:** takeaways + blocked shots per 60.
  - **Soccer:** tackles + interceptions + pressures per 90 (partially exists; the transfer is the *composite rate* treatment).
- **REJECTED for MLB as a composite:** pitching disruption (K rate) and fielding disruption are different units coached by different staffs. Combining them is incoherent. K-BB% already covers the pitching side.
- **Status:** TRANSFER to NBA/NHL/soccer (rebuilt from each sport's disruptive events). REJECTED for MLB.

### A7. First-read target share / condensed offenses → offensive concentration index
- **Source:** NFL (@FantasyPtsData: "Most Condensed Offenses by First-Read Target Share").
- **Mechanism that carries:** share of first options funneled to one player = offensive predictability/concentration.
- **Targets:**
  - **NBA:** share of half-court first actions initiated for one player.
  - **Soccer:** share of progressive passes targeting one player.
- **What breaks:** "first read" is a QB-progression concept requiring film study. Each sport needs its own operational definition of "first option," and the charting cost is high.
- **Status:** STRUCTURE-ONLY. The concentration pattern is sound; the per-sport "first option" definition must be built before any fit.

### A8. CB STEP+%/BLANKETED% → coverage-tightness at the action point
- **Source:** NFL CB (@FantasyPtsData). Tracking-based coverage tightness metrics.
- **Mechanism that carries:** defender proximity at the moment the offense acts. Same mechanism as A4, applied to grading the defender rather than the attacker.
- **Targets:** NBA contest% (exists — the transfer is the *grading* use), NHL gap control at zone entries, soccer pressing proximity at reception.
- **Status:** TRANSFER.

### A9. EPA-per-completion air/YAC split → credit decomposition
- **Source:** NFL (@PattonAnalytics). Splitting QB EPA into the throw (air) vs the receiver's run (YAC).
- **Mechanism that carries:** decompose a composite outcome into the primary actor's direct contribution vs downstream help. The decomposition pattern, not the air/yards split.
- **Targets:**
  - **NBA:** possession value split into shot-maker vs assist-creator contribution.
  - **MLB:** pitcher vs defense (FIP vs ERA — this transfer is *already done*; it validates the pattern).
  - **NHL:** goal value split into shooter vs screener/passer.
- **What breaks:** football's clean split relies on the catch point as a discrete handoff. In basketball the "catch point" is the shot itself, so the decomposition needs a different seam (e.g., shot quality at release vs defensive contest).
- **Status:** TRANSFER (pattern = credit decomposition at the handoff seam).

### A10. Blitz Rate vs Pressure Rate → aggression-vs-effectiveness scatter
- **Source:** NFL (@sfdata9ers, Week 4). Sending extra rushers (cost: coverage sacrificed) vs getting home (benefit).
- **Mechanism that carries:** plot the aggression input against the effectiveness output. The scatter reveals which aggression is *efficient*.
- **Targets:**
  - **NBA:** pick-and-roll blitz rate vs forced-turnover rate.
  - **NHL:** forecheck aggression (forwards deep) vs takeaway rate.
  - **Soccer:** press intensity (PPDA) vs turnovers won in final third.
- **REJECTED for MLB:** no blitz mechanism. Pitching "aggression" (pitch-type selection, zone attack) is a different decision with different costs.
- **Status:** TRANSFER to invasion sports. REJECTED for MLB.

### A11. Fourth-down aggressiveness → actual-vs-optimal aggression index
- **Source:** NFL (@GridironInfo_: "Season Aggressiveness"). Go-rate vs model-optimal go-rate.
- **Mechanism that carries:** compare observed aggression against a decision model. The gap is the coaching edge (or leak).
- **Targets:**
  - **MLB:** steal/bunt attempt rate vs run-expectancy-optimal rate.
  - **NBA:** intentional-foul-when-up-3 rate, 2-for-1 attempt rate vs model.
  - **NHL:** goalie-pull timing vs win-probability-optimal timing.
- **REJECTED for soccer (mostly):** no fourth-down analog. xG-based shot selection is a cousin, not the same decision — the "go/no-go" binary doesn't exist.
- **Status:** TRANSFER (pattern = actual vs optimal aggression). Each sport needs its own decision model first.

### A12. Post-Game Win Expectancy → counterfactual deservedness
- **Source:** NFL (@sfdata9ers, Week 4 pre-MNF). Win probability implied by game stats — how "deserved" was the result.
- **Mechanism that carries:** invert the box score through a win model. Sport-agnostic math, sport-specific inputs.
- **Targets:** all sports. NBA (box-score win expectancy), MLB (BaseRuns-style), NHL (xG-based), soccer (xG-based).
- **Status:** TRANSFER (direct). Same math, different inputs.

### A13. RYOE (rushing yards over expectation) → residual-vs-expectation family
- **Source:** NFL (@sfdata9ers). Actual minus model-expected given box count and situation.
- **Mechanism that carries:** actual − expected | context. The residual is the player signal; the expectation model is the sport-specific part.
- **Targets:** NBA points over expected per shot (already exists in tracking-era stats), NHL goals over expected (xG — already done), MLB wOBA over expected (xwOBA — already done).
- **Note:** several sports already have this. The transfer validates the pattern rather than inventing it. Where it does NOT yet exist in-house, build the expectation model first — the residual is worthless without it.
- **Status:** TRANSFER (pattern = contextual residual). Build expectation model per sport.

### A14. Three-and-Out Rate vs Drive TD Rate → possession-bookend rates
- **Source:** NFL (@sfdata9ers). Failure rate vs success rate on discrete possessions.
- **Mechanism that carries:** bookend the possession outcome distribution (worst vs best case rates).
- **Targets:**
  - **MLB:** 1-2-3 innings vs multi-run innings (clean transfer — innings are discrete possessions).
  - **NBA/NHL/Soccer:** STRUCTURE-ONLY. Scoreless vs 3+ point possessions (NBA) is noisier; the possession definition is less crisp.
- **Status:** TRANSFER to MLB. STRUCTURE-ONLY elsewhere.

### A15. WAR Board → already cross-sport
- **Source:** NFL (@DynatyzeFF). Wins above replacement.
- **Status:** TRANSFER (direct — WAR is already a cross-sport operator). No adjustment needed beyond the sport's replacement-level definition.

### A16. SHADOW INDEX (CB shadow coverage) → assignment tracking
- **Source:** NFL (@FantasyPtsData). Tracking which defender shadows which receiver.
- **Mechanism that carries:** defender-to-attacker assignment from tracking data.
- **Targets:** NBA matchup data (exists — the transfer is using it as a *feature*, not just a broadcast graphic).
- **Status:** TRANSFER (direct where tracking exists).

---

## B. arXiv lane transfers (method families → sports)

Program lanes (from ledger-tracker.jsonl): tracking_ngs (146), experimental (140), team_ratings (129), calibration_uncertainty (49), win_spread_total (35), odds_market (31), data_api_infra (30), props_player (21), causal (11), dfs (5).

### B1. Elo / Glicko / TrueSkill → regime-split ratings everywhere
- **Lane:** team_ratings (129 ledgers). Already carded in brain transfer operators v1.
- **Mechanism that carries:** rating per regime, overall as backoff when n is small. Update R ← R + K(S−E).
- **Established transfers (from the brain):** tennis surface split → NFL dome / outdoor-wind / altitude / turf regimes. Glicko RD inflation → QB-change uncertainty (new starter).
- **New transfers from this audit:**
  - **NBA:** home/road + rest-status regime splits (back-to-back is a regime, not just a covariate).
  - **MLB:** pitcher-specific Elo (the "team" is the pitcher that day).
  - **NHL:** goalie-specific Elo with backup/spot-starter RD inflation.
  - **Soccer:** home/away + competition-tier regimes.
- **What breaks:** K and the 400-scale are hyperparameters, not facts. Rating deviation conventions (1500, 173.7178) are scaling choices. Re-estimate per sport.
- **Status:** TRANSFER (already carded; regime list extended by this audit).

### B2. Conformal / Venn-Abers / Mondrian → sport-specific uncertainty strata
- **Lane:** calibration_uncertainty (49 ledgers). Already carded in brain transfer operators v1.
- **Mechanism that carries:** distribution-free intervals; Mondrian strata = the conditioning set. The operator is the point, not the strata.
- **Established strata (NFL):** week bucket, QB-change, roof/wind, book, rest, coast-mismatch.
- **New strata from this audit:** MLB pitcher-change, NBA back-to-back, NHL goalie-change, soccer transfer-window. Small strata fail closed (from the brain: "Small strata fail closed").
- **Status:** TRANSFER (already carded; strata extended).

### B3. Shin de-vig / favorite-longshot bias → all bookmaker markets
- **Lane:** odds_market (31 ledgers). Already carded as market training.
- **Mechanism that carries:** Shin's method removes vig from any bookmaker odds matrix. Favorite-longshot bias is a market-microstructure fact, not a sport fact.
- **Targets:** all sports, all markets. NFL spread is the test; soccer 1X2, MLB moneyline, NBA spread are the same operator.
- **What breaks:** nothing structural — but CLV stays an evaluation target, never a feature (brain invariant).
- **Status:** TRANSFER (direct).

### B4. Kelly sizing → ops everywhere
- **Lane:** implicit in odds_market. Already carded: "Kelly is ops, not a forecast."
- **Status:** TRANSFER (direct). Size stakes only on edges that cleared the bar, any sport.

### B5. Hawkes excitation → per-sport event clustering (with the soccer warning)
- **Lane:** experimental / tracking. Already STRUCTURE-ONLY at event grain in the brain.
- **Mechanism that carries:** intensity λ(t) = μ + Σ α exp(−β(t−t_i)). The *test for clustering* is the transfer, not the assumption of clustering.
- **Critical negative label (from the brain):** the JRSS C 2023 football-event-sequences paper found association-football arrival times did NOT cluster — the Hawkes fit collapsed toward Poisson. That negative result is a training label, not a ban.
- **New transfers from this audit:** NBA scoring runs (test for excitation — do not assume it), NHL goal bursts, MLB rally sequencing. Each needs its own α/β fit on its own data. "Excitation that dies" (arXiv:2601.07980, corner kicks) is the right inductive bias for a drive, not a season.
- **What breaks:** assuming clustering exists. Fit first, believe second.
- **Status:** STRUCTURE-ONLY. Per-sport fit required. The soccer non-result must be in the prompt of every new fit.

### B6. James-Stein shrinkage → rates everywhere (never the game mean)
- **Lane:** team_ratings / experimental. Already carded: TRANSFER on rates, banned on the game mean.
- **Mechanism that carries:** θ̂_i = ν + (1 − (p−2)σ²/||Y−ν||²)_+ (Y_i−ν). Shrink noisy rates toward the grand mean.
- **Targets:** NFL player EPA / catch rate / success rate, MLB batting stats, NBA RAPM-style partial pooling (teammate context), NHL goalie save%.
- **What breaks (brain invariant):** JS-to-league on the 32 team means stays banned as a close replacement — the close is already the shrinkage, k is small, variances unequal.
- **Status:** TRANSFER on rates (already carded). The ban on the game mean is not relaxed.

### B7. Pythagorean expectation → per-sport exponent, learned
- **Lane:** win_spread_total. Already carded: win% ≈ PF^x / (PF^x + PA^x), x learned, folklore exponents not loaded.
- **Targets:** all sports as a win baseline from points scored/allowed. MLB ~1.83 and NFL ~2.37 are starting points for the optimizer, not constants.
- **Status:** TRANSFER (already carded).

### B8. Causal inference (injuries) → sport-agnostic mechanisms
- **Lane:** causal (11 ledgers).
- **Mechanism that carries:** difference-in-differences, synthetic control, interrupted time series. The identification strategy is the transfer; the injury is the application.
- **Targets:** NFL QB injuries (already the use case), NBA load-management causal effects, MLB pitcher-injury return curves, NHL concussion-protocol effects.
- **Status:** TRANSFER (mechanism = identification strategy).

### B9. Copula dependence → the same-game joint
- **Already carded in the brain:** Gaussian/Frank/Gumbel/Clayton zoo, CONFIRMED-EMPTY on arXiv for "copula football" — empty means no paper, not no fact. Dependence between spread residual and total residual is an NFL fact we can measure. Train on our closes for the same-game joint (the SGP hole).
- **New transfers from this audit:** NBA spread/total joint, soccer 1X2/totals joint. No soccer copula parameter is copied — dependence is measured per market.
- **What breaks:** product-of-legs pricing stays illegal until the joint exists (brain invariant).
- **Status:** STRUCTURE-ONLY → TRANSFER once measured per market. The SGP edge is the reason this matters.

---

## C. Kats component cross-links (time-series operators → sports)

Full per-sport mapping is in the Kats multi-sport deep-dive (docs/research/2026-10-05/kats-multisport-deepdive-2026-10-06.md). This section links the deep-dive's operators to the metric families above.

### C1. BOCPD/CUSUM changepoints → form-break detection everywhere
- **Deep-dive mapping:** NFL steam moves / injury shocks (intraday line series), NBA load-management / trades, MLB pitcher injuries / park drift, NHL goalie / coaching changes, soccer transfer windows / managerial changes.
- **New links from this audit:**
  - **Pitcher-form → QB-form:** BOCPD on rolling QB EPA/play (NFL 17-game series is short, but CUSUM detects level shifts — the mechanism holds at short lengths where TSFeatures fail).
  - **Pitcher-form → goalie-form:** BOCPD on rolling GSAA (NHL goalie sub-series are irregular — use game-index space deliberately, per the deep-dive).
  - **Transfer-window breaks (soccer) → trade-deadline breaks (NBA/NHL/MLB):** same BOCPD mechanism, different calendar. Roster changes overnight in every sport with a deadline.
- **Gotcha (deep-dive):** CUSUM/BOCPD treat observations as equally spaced. An offseason gap becomes "adjacent indices." Model in game-index space per season, deliberately.
- **Status:** TRANSFER (already mapped; QB-form and trade-deadline links added by this audit).

### C2. Load-management detection (NBA) → managed-workload detection
- **Deep-dive mapping:** NBA load-management changepoints are core, not optional (structural breaks in player-prop series).
- **New links:**
  - **MLB pitch-count management:** velocity drop + spin-rate change as the "load" signal (the analog of minutes restrictions).
  - **NHL back-to-backs:** bigger effect than NBA per the deep-dive (travel + physical toll) — rest-days as regressor AND as changepoint trigger.
  - **NFL:** short-week Thursday games as the managed-workload analog (fewer practices, not fewer minutes).
- **Status:** TRANSFER (mechanism = workload signal → structural break; signal rebuilt per sport).

### C3. StatSig line-move significance → all sports
- **Deep-dive mapping:** NFL line moves, NBA prop-line moves, MLB moneyline moves, NHL puck-line moves, soccer 1X2 moves.
- **Link to B3:** StatSig flags the move; Shin de-vig prices it. Detection + pricing as a pipeline.
- **Status:** TRANSFER (already mapped).

### C4. Park-factor drift (MLB) → environment-regime drift
- **Deep-dive mapping:** slow changepoints in park factors over seasons.
- **New links:** NFL dome/wind/altitude/turf regimes (already in the brain as Elo regimes — the transfer is treating them as *drifting* changepoints, not static splits), NBA Denver altitude (static, not drifting — STRUCTURE-ONLY).
- **Status:** TRANSFER for drifting environments (MLB parks). STRUCTURE-ONLY for static ones (altitude doesn't drift).

### C5. Weather-as-regressor → outdoor sports only
- **Deep-dive mapping:** MLB wind/temperature via Prophet extra_regressors; NFL weather on line series.
- **REJECTED for NBA/NHL:** indoor sports. No weather exposure, no regressor. This is an easy one to get wrong by copying a config.
- **Status:** TRANSFER (MLB, NFL outdoor). REJECTED (NBA, NHL).

### C6. Intraday line-movement series (NFL) → the long-series trick
- **Deep-dive finding:** NFL's 17-game series are noise for forecasting, but intraday line movement gives hundreds of points — the LONG series in NFL.
- **Generalized transfer:** whenever a sport's natural series is too short, look for the higher-frequency series. NBA: quarter-by-quarter efficiency (328 points). MLB: inning-by-inning win probability (1,458 points). NHL: period-by-period xG. Soccer: 15-minute xG blocks.
- **What breaks:** the higher-frequency series has different noise properties (market microstructure vs game outcomes). Models must be fit on the frequency they'll predict at.
- **Status:** TRANSFER (pattern = drop to the higher-frequency series when the natural one is short).

### C7. OutlierDetector gap trap → universal ingestion rule
- **Deep-dive gotcha:** OutlierDetector silently does asfreq("D") + polynomial interpolation when frequency can't be inferred — across a 4-month offseason it fabricates daily data.
- **Transfer:** this is not sport-specific. It is an INGESTION RULE for the whole engine: never feed a gap-spanning series to any component that infers frequency. Per-season or game-indexed series only.
- **Status:** TRANSFER as a standing rule, all sports, all components.

### C8. TSFeatures short-safe subset → the 17-point problem generalized
- **Deep-dive finding:** level_shift needs 22+ points, hurst lag_size=30, lumpiness window 20 — all degenerate on 17-game NFL series. Short-safe subset: statistics, time, trend_detector.
- **Generalized transfer:** any series shorter than ~25 points gets the short-safe subset. NHL goalie sub-series (irregular starts), MLB pitcher series (~30 starts — borderline, use reduced windows), soccer per-competition slices.
- **Status:** TRANSFER as a standing rule: check series length against feature windows before running the full suite.

---

## D. Deliberate REJECTs (scrutiny record)

| # | Proposed transfer | Reason rejected |
|---|---|---|
| D1 | "Passes to or past the sticks" → NBA | No line-to-gain. The territorial marker doesn't exist. |
| D2 | Havoc Rate composite → MLB | Pitching and fielding disruption are different units. K-BB% already covers pitching. |
| D3 | Blitz Rate vs Pressure Rate → MLB | No blitz mechanism. Pitch-selection aggression is a different decision. |
| D4 | Checkdown % → MLB/NHL/soccer | QB-progression concept. No analog. |
| D5 | Weather regressor → NBA/NHL | Indoor sports. Copying the config would add noise, not signal. |
| D6 | Dixon-Coles τ → NFL margins | Soccer low-goal cells (0-0, 1-0, 0-1, 1-1). NFL margins are not those cells. (Already STILL-BANNED-ON-μ in the brain.) |
| D7 | Maher independent Poisson → NFL points | NFL points are 2/3/6/7/8 mixtures, not Poisson counts. (Already killed in the brain.) |
| D8 | James-Stein → 32 NFL team means | The close is already the shrinkage. k=32 is small, variances unequal. (Already banned in the brain.) |
| D9 | Hawkes-as-tempo → NFL game mean | Excitation at event grain only. Season-level tempo via Hawkes stays banned. (Already in the brain.) |
| D10 | OutlierDetector → gap-spanning series | Silent interpolation fabricates data. Per-season only. (Deep-dive gotcha, now a standing rule.) |
| D11 | Full TSFeatures → 17-game NFL series | NaN in level_shift/hurst/lumpiness. Short-safe subset only. (Deep-dive finding, now a standing rule.) |
| D12 | 4th-down aggressiveness → soccer | No go/no-go binary. xG shot selection is a cousin, not the same decision. |

---

## E. Transfer principles (what makes a transfer survive)

1. **The mechanism is the transfer, never the coefficient.** Elo's update rule transfers; the 400-scale doesn't. Shrinkage transfers; the grand mean doesn't. Every section above re-estimates on target-domain data.
2. **The unit must exist in the target.** "Past the sticks" needs a line. Weather needs a sky. The denominator (routes, possessions, pitches) must be countable in the target sport.
3. **Cadence changes the statistics.** 17 points (NFL) vs 162 (MLB) vs hundreds (intraday lines) — window sizes, NaN guards, and tuning targets all shift. The deep-dive's per-sport table is the reference.
4. **Negative results are labels.** Soccer Hawkes collapsing to Poisson, the REJECTs in section D — these prevent the next agent from re-trying a dead transfer. A rejected transfer in the library is worth more than an untested one.
5. **Auxiliary tasks train shared representations; they never move the NFL mean.** (Brain invariant.) Hockey Skellam, tennis regime-Elo, MLB RE24 teach the engine without touching μ.
6. **Every transfer gets a kill test.** The transfer enters the library on write. It enters the engine only after beating the bar on target-domain rows, walk-forward, n ≥ 150.

---

## Sources

- X analytics sweeps: Beexly/Sports AGENTS.md, 33 "X ANALYTICS SWEEP" sections, 2026-09-18 → 2026-10-05 (150 metric entries inventoried).
- arXiv program: docs/arxiv-program/research/2026-09-21/arxiv-program/ (750-paper program; lanes: tracking_ngs, team_ratings, calibration_uncertainty, win_spread_total, odds_market, props_player, causal, dfs).
- Kats multi-sport deep-dive: docs/research/2026-10-05/kats-multisport-deepdive-2026-10-06.md (branch motif/kats-evaluation-2026-10-05).
- Brain ingestion: docs/research/2026-10-05/brain-ingestion/ (gse_brain_ingestion_v1.md, gse_transfer_operators_v1.md, gse_brain_ingestion_corrections_2026-10-05.md) — PR #1025, merged 2026-10-06.
- Reasoning doctrine: agent-bus outbox/from-motif/REASONING-DOCTRINE-2026-10-05.md.

## What this document is not

Not a model change. Not a μ change. MODEL_VERSION stays v5.2.7. This is the transfer layer of the knowledge ingest: which operators map where, what breaks in the mapping, and what stays banned. Promotion to the engine follows the standard kill test per transfer.
