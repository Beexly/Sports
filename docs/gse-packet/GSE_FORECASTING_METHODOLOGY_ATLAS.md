# Galaxy Sports Edge — Forecasting & Prediction Methodology Atlas
**Every major prediction/forecasting methodology, named and rated for GSE relevance.**

> ✓ **Completeness update — see `GSE_INTEL_00_RIGOR_PASS.md`.** The **fantasy-native distributional & allocation family** the betting-first catalogue originally lacked is now integrated as **Part 5** below: **Tweedie / gradient-boosted Tweedie** (the native fantasy-points distribution: a mass at zero + a skewed tail), **zero-inflated/hurdle**, **Dirichlet-multinomial** (target-share allocation), **GAMLSS**, **Plackett–Luce**, **Skellam** (margins/puck lines), **Gaussian copulas** (player correlation for stacks/parlays), and **Mixture Density Networks**. (Provenance: this family was flagged missing by the rigor pass; it is no longer a gap.)
Produced 2026-06-23 · Companion to the Executive Advisory Pass.
177 methodologies across five families — 30 sports-rating/team-strength systems, 37 statistical & time-series methods, 48 machine-learning / AI methods, 54 market-based, judgmental, simulation, ensemble & calibration methods, and 8 fantasy-native distributional & allocation methods. Each entry carries: name + aliases, one-line definition, how it works, where it's proven, a GSE relevance verdict, and a concrete integration path into GSE's priced/gated ladder.

## The relevance rubric

Every method is tagged with one of five verdicts:

- **ADOPT-NOW** — high value / low risk, fits the current gates; pilot immediately on the shadow→priced path.
- **PILOT** — promising, but needs a scoped backtest before it can be priced.
- **SHADOW** — run unweighted at `priced=false` to gather calibration evidence before any decision.
- **REFERENCE** — a useful concept or benchmark, not a direct feature to ship.
- **SKIP** — not a fit, disqualified by rights, data, sample-size, or overfitting risk.

## Master GSE relevance matrix

### ADOPT-NOW
- **Rating systems —** Market-implied power ratings; Margin-of-victory-adjusted Elo; Simple Rating System (SRS) + a shared iterative strength-of-schedule solver; Net-rating / opponent-adjusted margin.
- **Statistical —** Wilson score intervals; Beta-Binomial / Dirichlet conjugate shrinkage; Platt / beta calibration (the small-sample bridge to isotonic); Empirical-Bayes / James-Stein shrinkage.
- **ML / AI —** Conformal prediction (split / Mondrian) for distribution-free intervals; the calibration suite (Platt / beta / temperature scaling); Elastic-Net / regularized logistic regression (the honest benchmark every fancier model must beat); SHAP / TreeSHAP for `/explain` + Model Court.
- **Market / meta —** Bootstrap confidence intervals on every published stat; Log loss reported beside Brier; De-vig cross-checks (multiplicative / additive / power) emitted alongside Shin; Sharp-book-anchored CLV + sharpness-weighted consensus; Walk-forward + purged/embargoed cross-validation + Deflated Sharpe as the Model Court gate; Brier/CLV-earned ensemble weights vs an equal-weight benchmark. *(Already in production and correctly so: Shin de-vig, median consensus, Market Gravity Index, Edge Index, quarter-Kelly, isotonic/PAVA + ECE + Murphy decomposition.)*
- **Fantasy-native (Part 5) —** Tweedie / gradient-boosted Tweedie as the base fantasy-points estimator (mass-at-zero + skewed tail); Dirichlet-multinomial as the target-share / touch-share allocation layer feeding the market-anchored conservation step; Gaussian copula as the cross-player correlation layer for stacks / best-ball / parlays. *(Real-repo note: `tweedie-baseline.ts` is currently a Tweedie-flavored boosted-stump scaffold, not yet a fitted Tweedie GLM — wiring the deviance gradient is the `[DATA]` follow-up.)*

### PILOT
Glicko-2; opponent-adjusted EPA/play (in-house DVOA analog); Bradley-Terry / BTL; Massey least-squares (with ridge); 538-style QB-adjusted NFL Elo; Pythagorean expectation (mean-reversion prior); Dixon-Coles (NHL/MLB roadmap); state-space / Kalman filter (best fit for modeling line movement); GARCH family (volatility → dynamic uncertainty penalty); quantile regression; LOESS / spline smoothing (cheap warm-up on the line-movement path); probabilistic GBM (NGBoost or quantile-LightGBM, wrapped in SHAP + honesty gate); anomaly detection (Isolation Forest / MAD / change-point for steam + data-QA); Kalshi/exchange second market read; logarithmic/geometric opinion pool; Monte-Carlo / play-by-play simulation (props + content); causal difference-in-differences / synthetic control ("did our pick move the line"). **Fantasy-native (Part 5):** zero-inflated / hurdle models (low-usage + anytime-TD); GAMLSS / distributional regression (model variance and skew, not just the mean); Plackett-Luce (REFERENCE→PILOT — ADP / ownership / finish-order ranking); Skellam distribution (multi-sport: margins, NHL puck lines, MLB run lines).

### Do-not-chase-yet / SKIP (with reason)
Deep sequence & time-series foundation models — LSTM/GRU, Temporal Fusion Transformer, N-BEATS/N-HiTS, DeepAR, PatchTST, TimeGPT/Chronos (NFL's ~272 games/season is fatally too small and they are unexplainable on an audit-first surface; revisit TFT only post-scale); CNNs on player-tracking data (no rights to the tracking data they require); graph neural nets / learned embeddings, unconstrained AutoML, live online learning (data-hungry / overfitting / unexplainable for now); Mixture Density Networks (the neural distributional output of Part 5 — same sample-hungry / unexplainable disqualifier; Tweedie + the copula layer deliver the distribution and correlation it promises, explainably); RPI (margin-blind, dominated by SRS); Survival/Cox on the pick surface (no native duration target). Most classical long-series time-series (ARIMA, ETS, TBATS, Prophet, Theta) is REFERENCE-only for picks because NFL's short season mismatches their long-dense-series regime — though several are useful for GSE's internal operational telemetry.

### The cheapest highest-leverage wins (do these first)
- Bootstrap CIs on every published number.
- Log loss beside Brier.
- Emit alternative de-vig alongside Shin in the receipt.
- Purged/embargoed walk-forward CV as the standing Model Court gate.

These are days of work, mostly reporting and transparency, and they compound the brand's proof-first position directly.

### Recommended adoption sequence (tied to the proof ladder)

**Now (FOUNDING, pre-PROVEN)** — proof/calibration transparency: bootstrap CIs, log loss + CRPS, reliability diagrams, ECE; alternative de-vig cross-checks; market-implied power ratings as the benchmark; the replay harness; conformal intervals on any published range; shrinkage (Beta-Binomial / James-Stein) so early hit/CLV rates don't lie.

**Approaching PROVEN (≥100 settled)** — shadow estimators (Elo/Glicko-2, opponent-adjusted EPA) under walk-forward + purged CV; turn on calibration-apply (isotonic, non-worsening ECE); Platt/beta for small samples.

**PROVEN → ESTABLISHED** — first independent estimator priced after Model Court beats the additive sum OOS; ensemble combination (Brier/CLV-earned weights) vs equal-weight benchmark; probabilistic GBM pilot with SHAP; state-space line-movement model; GARCH-driven uncertainty penalty.

**ESTABLISHED → AUTHORITY + multi-sport** — Dixon-Coles / bivariate Poisson per sport (MLB, NHL); causal DiD "we move the line"; broader ensemble/stacking; revisit Temporal Fusion Transformer only post-scale.

---

## Part 1 — Sports rating & team-strength systems (30)

*Prepared for: Galaxy Sports Edge (GSE) — Research wing, executive advisory panel. Scope: Every major team-strength / score-prediction / paired-comparison rating methodology, named precisely, with mechanism, proof domain, and a GSE relevance verdict + concrete integration path. Date: 2026-06-23.*

### Orientation

GSE's flagship surface is a **market-anchored, additive 13-component confidence score** wrapped in a **proof-weighted ranking index** (GSE Score), explicitly *not* a win probability. The market read (Shin de-vig, median consensus, Edge Index) is already best-in-class for a one-game published pick. What the rating-systems family below offers GSE is a **second, independent estimate of team strength** that can be run as a `priced=false` shadow estimator, backtested against settled results, and — only after clearing the proof ladder and Model Court — folded in as a weighted signal or a divergence flag against the market line.

The strategic filter throughout: GSE is **NFL-live (small sample: ~16-17 games/team/season, ~270 games/season), MLB/NHL on roadmap**. Methods built for thousands of chess games or 350 college-basketball teams per season behave very differently in a 270-game NFL pond. Low-data sports reward *priors, opponent adjustment, and shrinkage*; they punish *overfit per-team parameters*. Every verdict below is tied to that reality and to GSE's gates (`priced=false`→`priced` ladder, Model Court, no calibration regression, no fabricated data).

A repeating theme: most of these are **power-rating engines** that output an expected margin. To enter GSE they must convert margin → a probability or an edge-vs-market quantity, then prove out at ≥100 settled with non-worsening ECE before they can carry weight. Many are best used as **REFERENCE benchmarks** (does our number agree with KenPom/Sagarin/FPI?) rather than as wired features.

### Quick comparison table

| Method | Core idea | Data needed | GSE tier |
|---|---|---|---|
| **Elo (+ MOV-adjusted)** | Iterative win-prob update from rating gap; margin multiplier | Game results + scores | **ADOPT-NOW** (already scaffolded) |
| **FiveThirtyEight/Silver NFL Elo + QB adj** | Elo + QB rolling value, bye/playoff tweaks | Results, scores, QB starts | **PILOT** |
| **Glicko / Glicko-2** | Elo + rating-deviation + volatility (uncertainty-aware) | Results + timestamps | **PILOT** (great for NFL small-sample) |
| **TrueSkill / TrueSkill2** | Bayesian Gaussian skill via factor graph | Results (+ box-score for TS2) | **REFERENCE** (overkill for 2-team) |
| **Bradley–Terry / BTL** | Logistic latent-strength from all pairwise results | Win/loss matrix | **PILOT** (principled SOS engine) |
| **Thurstone–Mosteller** | Same as BT but Gaussian (probit) link | Win/loss matrix | **REFERENCE** |
| **Massey ratings** | Least-squares on score differentials | Scores | **PILOT** (clean margin engine) |
| **Colley matrix** | Bias-free linear system, wins/losses only | Win/loss + schedule | **SHADOW / REFERENCE** |
| **Sagarin ratings** | Proprietary Elo+regression composite (publishes margin) | Scores | **REFERENCE** (benchmark) |
| **Simple Rating System (SRS)** | Avg margin + iterative SOS adjustment | Scores | **ADOPT-NOW** (cheap, transparent) |
| **RPI** | Weighted W% + opp W% + opp-opp W% | Win/loss + schedule | **SKIP** (no margin; obsolete) |
| **Pythagorean expectation** | Win% from points-for/against ratio + exponent | Points for/against | **PILOT** (regression-to-mean prior) |
| **Pythagenpat / Pythagenport** | Run-environment-adaptive Pythagorean exponent | Points + games | **REFERENCE** (exponent recipe) |
| **Log5** | H2H win-prob from two teams' win rates | Win rates | **REFERENCE / SHADOW** |
| **KenPom-style adj efficiency** | Off/def points per possession, opponent-adjusted, tempo | Play/possession data | **REFERENCE** (NBA/CBB; NFL analog = EPA) |
| **DVOA / DYAR** | Play-by-play success vs situational baseline, opp-adjusted | PBP + situational data | **SHADOW** (the priced ladder's opp-adjusted slot) |
| **EPA / EPA/play, success rate, CPOE** | Value of each play vs expected-points model | NFL PBP | **PILOT** (best NFL team-strength signal) |
| **ESPN FPI** | Predictive efficiency power index → projected margin | Proprietary efficiency | **REFERENCE** (benchmark) |
| **Poisson goals model** | Independent Poisson scoring rates per team | Team scoring/conceding rates | **SHADOW** (already scaffolded; MLB/NHL) |
| **Bivariate Poisson** | Two correlated Poisson goal counts | Scoring rates + covariance | **REFERENCE** (NHL/MLB upgrade) |
| **Dixon–Coles** | Poisson + low-score correction + time decay | Scores + timestamps | **PILOT** (NHL/MLB roadmap) |
| **Maher (1982)** | Foundational independent-Poisson attack/defense | Scores | **REFERENCE** (ancestor) |
| **Karlis–Ntzoufras** | Bivariate Poisson w/ diagonal inflation for draws | Scores | **REFERENCE** |
| **Market-implied power ratings** | Invert closing spreads → team ratings | Spreads + HFA constant | **ADOPT-NOW** (extends current market read) |
| **WAR / points-above-replacement** | Player value vs replacement baseline → team sum | Player PBP/box | **REFERENCE** (player layer, not pick) |
| **Net rating / margin models** | Point differential per game/possession | Scores | **ADOPT-NOW** (SRS family) |
| **Iterative SOS methods** | Fixed-point opponent-strength correction | Schedule + results | **ADOPT-NOW** (embedded in SRS/Massey/Colley) |

### Elo family

#### Elo rating system
- **Name (aliases):** Elo; Arpad Elo's system; classical Elo.
- **One-line definition:** An iterative rating where each team's number rises or falls after every game by an amount proportional to how surprising the result was.
- **How it works:** Expected win probability is a logistic function of the rating gap, `E = 1 / (1 + 10^(-ΔR/400))`. After the game, `R_new = R_old + K·(actual − expected)`, where K controls update speed. It is self-correcting and needs only results; no box score required.
- **Where it's proven:** Chess (origin, FIDE/USCF), and adapted broadly to NFL/NBA/soccer/esports. The de-facto baseline power-rating engine.
- **GSE relevance: ADOPT-NOW.** Already scaffolded as `elo-estimator.ts` with a backtest; it is the lowest-risk, most-transparent independent strength signal and converts cleanly to a probability for calibration. Fits the gates perfectly: run priced=false, backtest, advance on ≥100 settled.
- **Integration path:** `elo-estimator.ts` (exists). Keep priced=false; feed its win-prob into the calibration harness (isotonic/PAVA, Brier, ECE). On ≥100 settled + non-worsening ECE, route through Model Court to either (a) become a priced confidence component or (b) power a "model-vs-market divergence" flag in `edge-engine.ts`.

#### Margin-of-victory-adjusted Elo (MOV Elo)
- **Name (aliases):** MOV Elo; margin-multiplier Elo; autocorrelation-adjusted Elo.
- **One-line definition:** Elo that scales each update by the game's margin so blowouts move ratings more than one-score wins — but with diminishing returns.
- **How it works:** The K-update is multiplied by a margin term, e.g. `mult = ln(|margin|+1) · (2.2 / (0.001·ΔR_winner + 2.2))`. The second factor is an **autocorrelation correction**: it shrinks the multiplier when a strong favorite wins big (preventing rating runaway), addressing the fact that good teams *should* win big.
- **Where it's proven:** FiveThirtyEight NFL/NBA, nfelo, most modern Elo implementations. Standard upgrade over vanilla Elo for score sports.
- **GSE relevance: ADOPT-NOW.** This is the *correct* form of the Elo GSE already has scaffolded — vanilla Elo throws away margin information that NFL provides. Low risk, strictly more informative, same gate path.
- **Integration path:** Implement as a config flag inside `elo-estimator.ts` (`useMarginMultiplier`, `marginCap`). Backtest both vanilla and MOV variants side-by-side; let the calibration harness pick the better-calibrated one. Still priced=false until ≥100 settled.

#### FiveThirtyEight / Nate Silver NFL Elo (incl. QB-adjusted Elo)
- **Name (aliases):** 538 NFL Elo; Silver Elo; "ELWAY" (Silver's successor forecast); QB-adjusted Elo.
- **One-line definition:** A production NFL Elo with K≈20, a margin multiplier, home-field bump, a **playoff multiplier (×1.2 on the rating gap)**, and a rolling **QB value adjustment** that shifts a team's effective Elo for injuries/starter changes.
- **How it works:** Base MOV Elo, plus each starting QB carries a rolling performance rating adjusted game-by-game for opponent defense quality; a team's "effective Elo" is bumped up/down when the starting QB differs from the established baseline. Bye-week and playoff adjustments handle known structural effects.
- **Where it's proven:** The reference public NFL rating for a decade; widely replicated (nfelo, Model 284).
- **GSE relevance: PILOT.** The QB adjustment is the single highest-value NFL-specific upgrade, but it depends on a QB-value data feed and risks fabrication if sourced loosely — and GSE's brand rule is `canPublishProjections=false` for player intelligence. Pilot it as an *internal* effective-Elo adjustment that never surfaces a player point projection.
- **Integration path:** Extend `elo-estimator.ts` with an optional QB-delta input sourced from a real, cited feed; gate behind the same honesty rule as the GBM estimator. The playoff ×1.2 and HFA terms can land immediately in `game-context.ts`. QB layer stays priced=false and never renders as a wired player projection.

### Paired-comparison / probabilistic family

#### Glicko and Glicko-2
- **Name (aliases):** Glicko (Mark Glickman); Glicko-2 (adds volatility).
- **One-line definition:** Elo's smarter cousin that tracks not just a rating but the *uncertainty* in that rating (rating deviation) and, in Glicko-2, how erratic the team has been (volatility).
- **How it works:** Each team has rating `r`, rating deviation `RD` (confidence), and (Glicko-2) volatility `σ`. Updates scale by RD — uncertain teams move more; RD shrinks with play and *grows during idle periods* (off-seasons, byes). Glicko-2's volatility lets a fast-improving team climb faster than classic Elo would allow.
- **Where it's proven:** Chess servers, many online games, increasingly in low-sample sports analytics.
- **GSE relevance: PILOT.** The uncertainty-awareness is *especially* valuable for NFL's tiny sample and long off-seasons — RD naturally inflates uncertainty early-season and after byes, which maps directly onto GSE's existing **uncertainty penalty** component. Needs a scoped backtest vs Elo before pricing.
- **Integration path:** New `glicko-estimator.ts` alongside `elo-estimator.ts`, priced=false. Its RD can also inform the additive **uncertainty penalty** in the 13-component score independent of whether the rating itself is priced. Advance on ≥100 settled + ECE non-worsening; Model Court compares Glicko vs Elo out-of-sample.

#### TrueSkill / TrueSkill2
- **Name (aliases):** TrueSkill (Microsoft Research, Herbrich/Minka/Graepel); TrueSkill2.
- **One-line definition:** A Bayesian skill-rating system that models each competitor's skill as a Gaussian (mean μ, uncertainty σ) and updates it by message-passing on a factor graph.
- **How it works:** Skills are Gaussians; observed performance = skill + noise; match outcome constrains the ordering of performances. Expectation-propagation passes moment-matched Gaussian messages to update the posterior. TrueSkill2 ingests box-score signals (kills, squad membership, experience, quit tendency) and reached 68% historical-match accuracy vs 52% for TrueSkill in shooters.
- **Where it's proven:** Xbox Live matchmaking, free-for-all and team games (its raison d'être is *many-player, team-from-individuals* inference).
- **GSE relevance: REFERENCE.** TrueSkill's edge is decomposing **team results into individual skills and handling N>2 competitors** — neither is GSE's problem (2-team, team-level, outcome already public). For head-to-head team rating, Glicko-2 delivers ~the same uncertainty benefit far more simply. Keep as a conceptual benchmark.
- **Integration path:** None wired. If GSE ever builds a *player*-level strength layer (still `canPublishProjections=false`), TrueSkill2's structure is the reference design. Not a near-term file.

#### Bradley–Terry / Bradley–Terry–Luce (BTL)
- **Name (aliases):** Bradley–Terry (1952); Bradley–Terry–Luce; Zermelo's model (1929 origin).
- **One-line definition:** A logistic latent-strength model where `P(i beats j) = π_i / (π_i + π_j)` and all teams' strengths are fit jointly from the full win/loss matrix.
- **How it works:** Assign each team a positive strength parameter π (or β = log π). Fit by maximum likelihood over every observed pairwise result simultaneously — so a win counts more against a strong opponent. This is a *principled, global* strength-of-schedule engine (vs Elo's sequential approximation).
- **Where it's proven:** Chess, football, basketball, auto racing, baseball, and now LLM/recommender ranking. The canonical statistical ranking model.
- **GSE relevance: PILOT.** BTL is the cleanest way to get **opponent-adjusted strength from results alone** with proper uncertainty, and it can be extended with a home-field term and margin (ordinal BT). For NFL's sparse graph it shrinks better than ad-hoc methods. Needs backtest + a tie/HFA extension before pricing.
- **Integration path:** New `bradley-terry-estimator.ts`, priced=false; output converts to win-prob directly for the calibration harness. Most naturally lives next to `opponent-adjusted.ts` as the results-based SOS counterpart to the efficiency-based DVOA slot. Gate identically.

#### Thurstone–Mosteller model
- **Name (aliases):** Thurstone–Mosteller (Thurstone 1927; Mosteller 1951); probit paired-comparison.
- **One-line definition:** Bradley–Terry's twin that uses a **Gaussian (probit)** link instead of logistic — strength differences map to win-prob via the normal CDF.
- **How it works:** Identical setup to BT, but assumes the latent performance difference is normally distributed: `P(i beats j) = Φ((s_i − s_j)/√2)`. In practice it produces nearly identical rankings and probabilities to Bradley–Terry; the choice is a modeling-taste / tail-behavior detail.
- **Where it's proven:** Psychometrics and paired-comparison literature; underlies the Gaussian-link branch (TrueSkill is essentially online Thurstone with factor graphs).
- **GSE relevance: REFERENCE.** Functionally redundant with Bradley–Terry for GSE; pick one link. Worth knowing as the Gaussian alternative if logistic tails misbehave in backtest, but not a separate feature.
- **Integration path:** None as a standalone. At most a `link: 'logit' | 'probit'` option inside `bradley-terry-estimator.ts` to test during the BTL pilot.

### Least-squares / linear family

#### Massey ratings (least-squares method)
- **Name (aliases):** Massey method; Massey least-squares ratings (Kenneth Massey, 1997); a former BCS computer ranking.
- **One-line definition:** Solve a least-squares system so that each pair's rating difference best predicts the observed score differential across the whole season.
- **How it works:** Set up `M·r = p` where each game says `r_winner − r_loser ≈ margin`; least-squares (with a normalization row) yields ratings whose differences are the model-predicted point spreads. Bayesian/home-field tweaks are standard. Directly outputs an expected margin for any matchup.
- **Where it's proven:** College football/basketball ratings, BCS era, Massey Composite.
- **GSE relevance: PILOT.** Massey gives a **margin prediction in the same units as the betting line**, so divergence vs the spread is immediately interpretable as an edge — a natural complement to the Edge Index. Risk: least-squares on ~270 NFL games is noisy and needs ridge/shrinkage. Backtest before pricing.
- **Integration path:** New `massey-estimator.ts`, priced=false, outputting an expected margin; compare its margin to the market line inside `edge-engine.ts` as a shadow divergence signal. Add ridge regularization for NFL sample size. Advance on the standard ladder.

#### Colley matrix method
- **Name (aliases):** Colley method; Colley matrix (Wesley Colley); a former BCS computer ranking.
- **One-line definition:** A bias-free linear system that rates teams from **wins and losses only**, with opponent strength baked in, anchored so the average rating is 0.5.
- **How it works:** Replaces raw win% with a Laplace-smoothed `(1 + wins) / (2 + games)` and solves `C·r = b`, where C encodes the schedule (Colley matrix) and b the smoothed records. Self-referential: your rating depends on opponents' ratings, solved simultaneously. No scores used — deliberately margin-blind.
- **Where it's proven:** BCS, college football/basketball; valued precisely because it ignores margin (no run-up-the-score incentive).
- **GSE relevance: SHADOW / REFERENCE.** Ignoring margin is a liability for a betting product (margin is signal in NFL), so Colley is weaker than Massey/SRS for edge-finding. Useful as a *margin-independent* cross-check and an SOS engine. Run unweighted at most.
- **Integration path:** Optional `colley.ts` shadow only, or — more usefully — borrow its **iterative SOS smoothing** for the schedule-adjustment logic inside `opponent-adjusted.ts`/`game-context.ts`. Not a pricing candidate on its own.

#### Sagarin ratings
- **Name (aliases):** Sagarin (Jeff Sagarin, USA Today); "Predictor" / "Golden Mean" variants.
- **One-line definition:** A long-running proprietary composite (Elo + regression/least-squares blend) that publishes a single power number and an implied point spread per team.
- **How it works:** Sagarin blends an Elo-style chess component with a points-based regression ("Predictor"), reconciled into a "Golden Mean." Exact weights are proprietary; the public output is a rating whose differences (plus HFA) give a predicted spread.
- **Where it's proven:** Decades of published NFL/NCAA ratings; was a BCS component.
- **GSE relevance: REFERENCE.** Closed methodology can't be reproduced or audited, so it can't pass Model Court or the no-fabrication bar as a *feature*. But it's an excellent **external benchmark**: if GSE's Elo/Massey numbers diverge wildly from Sagarin, that's a QA flag.
- **Integration path:** None internal. Use as an optional comparison column in the R&D backtest dashboard (does our power rating track a known-good public one?). Never a wired signal.

#### Simple Rating System (SRS)
- **Name (aliases):** SRS (Doug Drinen / Pro-Football-Reference, 2006); margin + SOS rating.
- **One-line definition:** Each team's rating is its **average point margin adjusted for strength of schedule**, found by iterating until ratings are self-consistent.
- **How it works:** `Rating = avg_point_margin + avg_opponent_rating`; solved iteratively (or as a linear system) until convergence. The output is in points — a +6.0 SRS team is ~6 points better than average on a neutral field. Maximally transparent.
- **Where it's proven:** Pro-Football-Reference, Basketball-Reference, College Football Data; the default "quick power rating" everyone can reproduce.
- **GSE relevance: ADOPT-NOW.** Trivial to compute from data GSE already has, fully transparent (fits the "math you can read" brand), outputs a market-comparable margin, and the iterative SOS is exactly the opponent-adjustment GSE wants. Lowest-risk new estimator after Elo.
- **Integration path:** New `srs.ts` (or fold into `opponent-adjusted.ts`), priced=false; expose its margin both as a shadow estimator and as the **strength-of-schedule input** to existing components. Compare SRS margin vs market in `edge-engine.ts`. Standard ladder to priced.

#### RPI (Rating Percentage Index)
- **Name (aliases):** RPI; Ratings Percentage Index (NCAA).
- **One-line definition:** A weighted average of a team's win%, its opponents' win%, and its opponents' opponents' win% — `0.25·WP + 0.50·OWP + 0.25·OOWP`.
- **How it works:** Pure win/loss bookkeeping at three schedule depths. No margin, no proper opponent-adjusted solve — just a fixed weighted blend. Widely criticized for ignoring margin and over-rewarding merely *facing* strong teams.
- **Where it's proven:** Historically NCAA selection (basketball/baseball); now largely superseded by NET, KenPom, etc.
- **GSE relevance: SKIP.** Disqualifiers: no margin (throws away NFL's key signal), known to be statistically inferior to SRS/Massey/Elo, and built for large-field college selection, not 2-team pro betting edges. Adds nothing GSE doesn't get better elsewhere.
- **Integration path:** None. Documented here only so the catalog is exhaustive and to justify *not* building it.

### Pythagorean / Log5 family

#### Pythagorean expectation
- **Name (aliases):** Pythagorean expectation/win%; Pythagorean theorem of baseball (Bill James).
- **One-line definition:** Estimates the win% a team *should* have from the ratio of points scored to points allowed, raised to an exponent.
- **How it works:** `WinExp = PF^x / (PF^x + PA^x)`. James used x=2 for MLB (~1.83 fits better); Daryl Morey adapted it to the NBA (x≈13.91), and sport-specific exponents exist for the NFL (~2.37) and NHL (~2.15). The gap between actual and Pythagorean win% is a **regression-to-the-mean / "luck"** signal.
- **Where it's proven:** Baseball (origin), basketball (Morey), generalized across major sports.
- **GSE relevance: PILOT.** Not a per-game predictor, but a strong **season-level prior and mean-reversion flag**: a team over-performing its Pythagorean record is a fade candidate; under-performing is a buy. Complements the market read with a fundamentals anchor. Needs backtest to set the NFL exponent and confirm it adds calibrated value.
- **Integration path:** Add a `pythagorean.ts` helper feeding a **regression-to-mean prior** into `game-context.ts` (or as a small additive term once proven). Priced=false until the over/under-performance signal beats a no-op out-of-sample. NHL/MLB versions slot in on the roadmap with their exponents.

#### Pythagenpat and Pythagenport
- **Name (aliases):** Pythagenpat (David Smyth); Pythagenport (Clay Davenport, Baseball Prospectus).
- **One-line definition:** Refinements that make the Pythagorean **exponent itself depend on the team's run/scoring environment** instead of using a fixed number.
- **How it works:** Pythagenport: `x = 1.5·log10((PF+PA)/G) + 0.45`. Pythagenpat: `x = ((PF+PA)/G)^0.287`. Both raise the exponent in high-scoring environments and lower it in low-scoring ones, which fits the data better than a constant — Pythagenpat is the analyst-preferred form.
- **Where it's proven:** Sabermetrics (MLB); the standard "correct" way to set the exponent.
- **GSE relevance: REFERENCE.** These are the **recipe for choosing the exponent** inside any Pythagorean pilot, not separate features. Most relevant for MLB/NHL (variable run/goal environments) on the roadmap; NFL scoring is stable enough that a fitted constant is usually fine.
- **Integration path:** If the Pythagorean pilot graduates, implement Pythagenpat as the exponent function inside `pythagorean.ts` for the MLB/NHL extension. No standalone surface.

#### Log5
- **Name (aliases):** Log5 (Bill James, 1981).
- **One-line definition:** Given two teams' overall win rates, estimates the probability one beats the other head-to-head.
- **How it works:** `P(A beats B) = (pA − pA·pB) / (pA + pB − 2·pA·pB)`, where pA, pB are the teams' win probabilities vs an average opponent. It's the standard way to turn two *independent* strength estimates into a matchup probability; extendable with HFA and used in bracket/tournament simulators.
- **Where it's proven:** Baseball, March Madness bracket modeling, any "combine two ratings into a matchup" step.
- **GSE relevance: REFERENCE / SHADOW.** Log5 is the **conversion layer**, not a strength model — useful as the formula that turns any GSE power rating (Elo win-prob, SRS, Pythagorean) into a head-to-head probability for comparison against the market. Run in shadow as the bridge during estimator pilots.
- **Integration path:** A small utility in `prediction-engine` used by Elo/SRS/Pythagorean shadows to emit a matchup win-prob the calibration harness can score. Not priced itself; it's plumbing for the priced ladder.

### Efficiency / EPA family

#### KenPom-style adjusted efficiency (offensive/defensive rating + tempo)
- **Name (aliases):** KenPom; Pomeroy ratings; adjusted offensive/defensive efficiency (AdjO/AdjD), AdjEM, AdjTempo.
- **One-line definition:** Rates teams by **points scored and allowed per 100 possessions, adjusted for opponent, venue, and recency**, plus a tempo estimate — pace-independent strength.
- **How it works:** Compute raw efficiency per 100 possessions, then iteratively adjust each game for opponent quality, home/away, and date; net efficiency margin (AdjEM) is the power rating. Tempo (possessions/40 min) is modeled separately so fast and slow teams are compared fairly.
- **Where it's proven:** College basketball (the gold standard); NBA analogs exist.
- **GSE relevance: REFERENCE** (for the NFL product). The *possession-efficiency* paradigm is exactly right, but its native sport is basketball; **for NFL the direct analog is EPA/play (below), and for MLB/NHL it's rate stats.** Keep KenPom itself as the reference template for "opponent-adjusted, pace-neutral efficiency," and as a literal benchmark if GSE ever adds CBB/NBA.
- **Integration path:** No NFL file. The *design pattern* (opponent-adjusted, venue-adjusted, recency-weighted efficiency) is the spec for the EPA-based `opponent-adjusted.ts` / DVOA-family slot. Direct adoption only if a basketball product launches.

#### DVOA / DYAR
- **Name (aliases):** DVOA = Defense-adjusted Value Over Average; DYAR = Defense-adjusted Yards Above Replacement (Football Outsiders, now FTN). The brief's "opponent-adjusted (DVOA-family)" slot.
- **One-line definition:** DVOA grades **every play against the league-average outcome for that exact situation** (down, distance, field position, score, quarter), opponent-adjusted; DYAR is the cumulative-value (volume) version vs a replacement baseline.
- **How it works:** Each play's success is measured relative to a situational baseline, normalized to a percentage above/below average, then adjusted for opponent strength. DVOA is a rate (per-play efficiency); DYAR totals value over replacement. Strong opponent-adjusted team-strength signal.
- **Where it's proven:** NFL analytics (the original advanced team metric); team and unit (off/def/ST) ratings.
- **GSE relevance: SHADOW.** This is the explicit DVOA-family slot GSE already names. The methodology is ideal for NFL team strength, but the *official* DVOA numbers are licensed/proprietary (FTN) — so GSE should build an **EPA/success-rate opponent-adjusted analog in-house** (no rights issue, no fabrication) and run it priced=false. Treat published DVOA as a benchmark only.
- **Integration path:** Build the in-house version in `opponent-adjusted.ts` from EPA/success-rate (see next entry), priced=false. Do **not** ingest licensed DVOA values as data. Advance the in-house opponent-adjusted estimator on the standard ladder; Model Court reviews before any weight.

#### EPA, EPA/play, success rate, CPOE
- **Name (aliases):** EPA = Expected Points Added; EPA/play; Success Rate; CPOE = Completion Percentage Over Expected.
- **One-line definition:** A family of play-by-play metrics that value each play by how much it changed the offense's expected points (EPA), how often plays "succeed" by down-and-distance (success rate), and how much better a QB completes than expected (CPOE).
- **How it works:** An expected-points model assigns each game state a point value; a play's EPA is the change in that value. Aggregated EPA/play (offense and defense) is a leading team-strength indicator; success rate captures consistency; CPOE isolates passing accuracy vs difficulty. These are buildable from public NFL play-by-play (e.g., nflfastR-style data).
- **Where it's proven:** Modern NFL analytics — EPA/play is widely regarded as the best single public team-quality signal and predicts forward results well.
- **GSE relevance: PILOT.** The strongest *fundamentals* counterweight to the market for NFL specifically, and fully buildable from public PBP without fabrication or licensing. Player-level outputs (CPOE) must stay process/fact-grade (no wired point projection) per GSE's brand rule; team-level EPA aggregates are fair game. Needs a scoped backtest to confirm it adds calibrated edge over the market read before pricing.
- **Integration path:** Feeds the in-house `opponent-adjusted.ts` (opponent-adjusted EPA/play as the DVOA analog) and can stand up its own `epa-estimator.ts`, priced=false. Requires a real NFL PBP source (the same class of dependency as the blocked team-rates feed for Poisson). Advance on ≥100 settled + ECE check; CPOE surfaced only as fact/process, never as a projection.

#### ESPN FPI (Football Power Index)
- **Name (aliases):** FPI; ESPN Football Power Index.
- **One-line definition:** ESPN's predictive efficiency-based power rating that outputs a single team strength and projected point margins / win probabilities.
- **How it works:** A proprietary blend of efficiency and other inputs, tuned to be **predictive** (forward-looking) rather than descriptive; differences in FPI plus situational factors yield projected spreads and game/season win probabilities.
- **Where it's proven:** ESPN's public NFL/CFB projections.
- **GSE relevance: REFERENCE.** Proprietary and unreproducible → can't pass Model Court or the no-fabrication bar as a feature. Excellent **third external benchmark** (alongside Sagarin and 538/ELWAY) for sanity-checking GSE's own power numbers and projected margins.
- **Integration path:** None internal. Optional benchmark column in the R&D dashboard. Never wired.

### Poisson / goal-scoring family

> This family targets GSE's **MLB/NHL roadmap** (and the already-scaffolded, source-blocked Poisson). Low-scoring goal sports are where Poisson methods shine; NFL is poorly served by them.

#### Poisson goals model (independent Poisson)
- **Name (aliases):** Independent Poisson model; "the Poisson model."
- **One-line definition:** Models each team's goals/runs as an independent Poisson random variable whose rate reflects that team's attack vs the opponent's defense.
- **How it works:** Estimate `λ_home`, `λ_away` from team attack/defense strengths (and HFA); the score line distribution is the product of two Poissons, from which win/draw/loss and totals probabilities follow. Requires a **team scoring-rate source** — the exact dependency currently blocking GSE's Poisson scaffold.
- **Where it's proven:** Soccer (foundational), hockey, and low-event sports; the baseline goal model.
- **GSE relevance: SHADOW.** Already scaffolded (`poisson.ts`, blocked on a team-rates source). Correct tool for NHL/MLB totals and moneylines, weak for NFL. Run priced=false the moment a real `team-rates.ts` feed exists.
- **Integration path:** Unblock `team-rates.ts` (real, cited scoring/conceding rates), then `poisson.ts` emits score-line, totals, and win probabilities priced=false for NHL/MLB. Calibrate; advance on the standard ladder. **No fabricated rates** — stays blocked until a legitimate source lands.

#### Bivariate Poisson
- **Name (aliases):** Bivariate Poisson model (Karlis & Ntzoufras lineage).
- **One-line definition:** Two correlated Poisson goal counts that share a covariance term, fixing the independent model's failure to capture the link between the two teams' scores.
- **How it works:** Adds a third Poisson component shared by both teams, inducing positive correlation between home and away goals; better fits real score distributions than independent Poisson, especially correlation structure. Reduces to independent Poisson when the shared term is zero.
- **Where it's proven:** Soccer/hockey scorelines; the standard "one notch up" from independent Poisson.
- **GSE relevance: REFERENCE** (now) → **SHADOW** (when Poisson graduates). Worth knowing as the principled upgrade once the basic Poisson is live for NHL/MLB; premature before the team-rates source even exists.
- **Integration path:** A `bivariatePoisson` mode inside `poisson.ts` for the NHL/MLB phase, evaluated against the independent baseline. Not a near-term build.

#### Dixon–Coles model
- **Name (aliases):** Dixon–Coles (Dixon & Coles, 1997); DC model; time-weighted Poisson.
- **One-line definition:** The most-used practical goal model — independent Poisson plus a **low-score correlation correction** and a **time-decay weighting** so recent games matter more.
- **How it works:** Starts from Maher's attack/defense Poisson, then (1) multiplies the joint probabilities of low scores (0-0, 1-0, 0-1, 1-1) by a correction factor ρ to fix the under-prediction of draws/low scores, and (2) down-weights older matches via an exponential time-decay in the likelihood so strength estimates track current form.
- **Where it's proven:** Soccer betting models (the canonical reference); adaptable to hockey.
- **GSE relevance: PILOT** (roadmap). For NHL/MLB this is the target-state goal model — its low-score correction and time decay directly address GSE's own anti-staleness doctrine (recency-weighting) and calibration needs. Pilot it once a goals feed exists; backtest vs plain Poisson.
- **Integration path:** Implement as the upgrade path of `poisson.ts` (`dixonColes: true` with ρ and a decay half-life) for the NHL/MLB phase. The time-decay parameter pairs naturally with GSE's freshness/recency logic. Priced=false → calibrate → ladder → Model Court.

#### Maher (1982)
- **Name (aliases):** Maher model (1982).
- **One-line definition:** The **foundational** independent-Poisson attack/defense model that every later goal model extends.
- **How it works:** Each team has attack and defense parameters; goals are independent Poisson with rates set by attacker's attack × defender's defense × HFA. No correlation, no time decay — the clean starting point Dixon–Coles improved.
- **Where it's proven:** Soccer modeling literature (historical anchor).
- **GSE relevance: REFERENCE.** The ancestor — implement its descendants (Dixon–Coles), not Maher itself. Useful for documentation and as the null model in a backtest.
- **Integration path:** None standalone; conceptually it *is* the base case of `poisson.ts`. Cite as the baseline in the goal-model evaluation.

#### Karlis–Ntzoufras (diagonal-inflated bivariate Poisson)
- **Name (aliases):** Karlis–Ntzoufras model; diagonal-inflated bivariate Poisson.
- **One-line definition:** A bivariate Poisson with extra probability mass added on the diagonal (equal scores) to better capture **draws**.
- **How it works:** Takes the bivariate Poisson and "inflates" the probabilities of tie scores (1-1, 2-2, …) via a mixture, correcting the residual draw under-prediction that even bivariate Poisson leaves. A refined draw-handling alternative to Dixon–Coles's low-score correction.
- **Where it's proven:** Soccer scoreline modeling (academic standard for draw-aware models).
- **GSE relevance: REFERENCE.** Same niche as Dixon–Coles (draw/low-score handling); GSE should pick one approach in the NHL/MLB phase rather than build both. Note: ties matter for NHL regulation/3-way markets, less for MLB.
- **Integration path:** An alternative mode to evaluate against Dixon–Coles inside `poisson.ts` during the goal-model pilot. Not a separate surface.

### Market-implied family

#### Market-implied power ratings
- **Name (aliases):** Market-derived power ratings; line-implied ratings; spread-inversion ratings; "betting market power rankings."
- **One-line definition:** Reverse-engineer team power ratings from the **closing point spreads**, so the ratings encode exactly what the most efficient market believes.
- **How it works:** Solve the inverse problem — given many games' spreads and a home-field constant, find the set of team ratings whose pairwise differences (± HFA) best reproduce the observed spreads (least-squares over spreads instead of scores). The result is a power rating in points, anchored to market consensus, updated each week as lines move.
- **Where it's proven:** Professional sports-betting handicapping; CBS/Advanced NFL Stats publish versions. The NFL closing line is accurate to ~2.5 pts of actual margin — a brutal benchmark.
- **GSE relevance: ADOPT-NOW.** This is the most *on-brand* rating system in the catalog: it's a natural extension of GSE's existing market read (Shin de-vig, median consensus, Edge Index) from a single game to a **coherent leaguewide power surface**, and it needs no new data class — just the spreads GSE already consumes. Low risk, high explanatory value, and it makes "model vs market" trivially interpretable because the model *is* the market, distilled.
- **Integration path:** New `market-power-ratings.ts` feeding off the same odds inputs as `edge-engine.ts`; output a leaguewide point rating and a per-game implied spread. Use it (a) as a consistency/QA layer on the published pick, (b) as the benchmark every *fundamental* estimator (Elo, SRS, EPA) must beat out-of-sample to earn weight, and (c) as the natural home for the **Market Gravity / Edge Index** at league scale. Can go priced quickly since it's a transform of already-trusted market data, pending Model Court sign-off.

### Player-value / replacement-level family

#### WAR / Wins Above Replacement (and points-above-replacement)
- **Name (aliases):** WAR (Wins Above Replacement); WAR variants (bWAR/fWAR in MLB); points/value above replacement; VORP lineage.
- **One-line definition:** A single number for a **player's** total value, expressed as wins added over a freely-available "replacement-level" player; team strength can be summed from player WAR.
- **How it works:** Combine a player's offensive and defensive value relative to a replacement baseline, park/SOS-adjusted, scaled to wins: schematically `WAR = (off + def − replacement) × playing-time share`. Summing a roster's WAR gives a bottom-up team-strength estimate; it's the canonical *player-attribution* framework.
- **Where it's proven:** Baseball (origin), basketball/football analogs (e.g., college-basketball WAR, approximate-value lineages).
- **GSE relevance: REFERENCE.** WAR is a *player-attribution* tool, and GSE's brand rule is explicit: NFL player intelligence is served fact/process-grade with `canPublishProjections=false`. A roster-sum team rating from WAR is also data-hungry and noisy in the NFL. Keep WAR as the reference frame for any future internal player layer, not as a wired pick input.
- **Integration path:** No near-term file. If/when GSE builds an internal player-strength layer feeding team ratings, WAR/points-above-replacement is the design reference — but outputs stay process/fact-grade and never surface as a published projection.

### Margin / net-rating & strength-of-schedule family

#### Net rating / point-differential margin models
- **Name (aliases):** Net rating; point differential; scoring margin; net efficiency margin (per-game or per-100-possessions).
- **One-line definition:** Rate teams by their average scoring margin (optionally per possession), the single most predictive *raw* team-quality stat in most sports.
- **How it works:** `Net = points for − points against`, averaged per game (or per 100 possessions for pace-neutrality). Unadjusted it ignores schedule; adjusting it for opponent strength yields SRS (above) or KenPom's AdjEM. Point differential consistently out-predicts win-loss record.
- **Where it's proven:** Universal — NFL, NBA, MLB run differential, NHL goal differential; the workhorse predictor.
- **GSE relevance: ADOPT-NOW** (as the SRS family). Raw and opponent-adjusted margin are cheap, transparent, and predictive — and opponent-adjusted margin *is* SRS, already recommended ADOPT-NOW. Don't ship *unadjusted* margin as a pick driver (it ignores schedule), but it's a fine component input and QA stat.
- **Integration path:** Compute alongside `srs.ts`; expose adjusted margin as the priced-ladder estimator and raw margin as an input/diagnostic to `game-context.ts`. Same ladder as SRS.

#### Iterative strength-of-schedule (SOS) adjustment methods
- **Name (aliases):** Iterative SOS; fixed-point opponent adjustment; the solve underlying SRS/Massey/Colley/KenPom.
- **One-line definition:** A general technique — not one system — where each team's rating is repeatedly corrected by its opponents' ratings until the whole set stops changing (converges to a fixed point).
- **How it works:** Initialize ratings, then update each team using opponents' current ratings (via win%, margin, or efficiency), and repeat to convergence. RPI is the crude 3-deep weighted version; Colley/Massey/SRS/KenPom are the principled fixed-point versions. This is *the* mechanism that turns raw stats into schedule-fair strength.
- **Where it's proven:** Every serious rating system uses some form of it; standard across all sports.
- **GSE relevance: ADOPT-NOW** (as infrastructure). GSE needs exactly one good iterative SOS solver to power SRS, opponent-adjusted EPA/DVOA, and Massey — building it once is high-leverage and underpins multiple estimators on the ladder. The "head-to-head" and schedule components in the 13-part score also benefit.
- **Integration path:** A shared `strength-of-schedule.ts` / iterative-solver utility consumed by `srs.ts`, `opponent-adjusted.ts`, and `massey-estimator.ts`. It's plumbing (not a priced signal itself) but it gates the quality of several priced candidates. Build early.

### Recommended adoption sequence for GSE (rating systems)

Ordered by leverage × fit-to-gates, mapped to the `priced=false`→`priced` proof ladder (FOUNDING → PROVEN ≥100 settled → ESTABLISHED ≥500 + CLV ≥52.4% → AUTHORITY ≥2000 + CLV ≥55%) and the Model Court requirement before any weight goes live.

1. **Market-implied power ratings** (`market-power-ratings.ts`) — *ship first.* Pure transform of data GSE already trusts; extends the market read to a leaguewide surface and becomes the benchmark every other estimator must beat. Fastest path to priced (Model Court only), and it makes "model vs market" interpretable.
2. **MOV-adjusted Elo** (upgrade `elo-estimator.ts`) — already scaffolded; switch on the margin multiplier + autocorrelation correction. Backtest vs vanilla, calibrate, advance to PROVEN at ≥100 settled.
3. **Simple Rating System + the shared iterative-SOS solver** (`srs.ts` + `strength-of-schedule.ts`) — cheap, transparent ("math you can read"), market-comparable margin, and the SOS solver is reusable infrastructure for everything below. Run priced=false, ladder up.
4. **Glicko-2** (`glicko-estimator.ts`) — uncertainty-aware, ideal for NFL small-sample and byes; also feeds the existing uncertainty-penalty component. Pilot/backtest against Elo; Model Court compares them.
5. **EPA/play opponent-adjusted (the in-house DVOA analog)** (`opponent-adjusted.ts` + `epa-estimator.ts`) — strongest NFL *fundamentals* counterweight, fully buildable from public PBP (no licensing, no fabrication). Requires standing up a real PBP feed; player outputs stay process-grade. Ladder to priced only after it beats the market benchmark out-of-sample.
6. **Bradley–Terry / BTL** (`bradley-terry-estimator.ts`) — principled results-based SOS with proper uncertainty; pilot as the paired-comparison counterpart to the efficiency slot. Backtest, then Model Court.
7. **Massey least-squares** (`massey-estimator.ts`) — margin engine in market units; useful divergence signal, but add ridge for NFL sample size. Pilot after SRS (overlapping value; lower marginal priority).
8. **Pythagorean (+ Pythagenpat for MLB/NHL)** (`pythagorean.ts`) — season-level mean-reversion prior / fade signal; backtest the NFL exponent. Modest standalone weight; strong as a prior.
9. **Poisson → Dixon–Coles** (`poisson.ts`, unblock `team-rates.ts`) — *NHL/MLB roadmap only.* Stays blocked until a legitimate scoring-rate source exists; then independent Poisson priced=false, upgrade to Dixon–Coles (low-score correction + time decay) which aligns with GSE's anti-staleness doctrine.

**Run-as-shadow-or-benchmark, never as standalone priced features:** Colley (margin-blind cross-check / SOS donor), Log5 (the win-prob conversion plumbing for all shadows), Sagarin / ESPN FPI / 538-ELWAY (external QA benchmarks for power numbers), bivariate Poisson & Karlis–Ntzoufras (queued upgrades behind Dixon–Coles), TrueSkill2 & WAR (reference designs only if a player-strength or non-2-team layer is ever built).

**Explicitly SKIP:** RPI — no margin, statistically dominated by SRS/Elo/Massey, built for large-field college selection rather than 2-team pro betting edges. Disqualified on fit, not just priority.

---

## Part 2 — Statistical, econometric & time-series methods (37)

*Research wing — Galaxy Sports Edge executive advisory panel. Cataloged for relevance to the GSE engine: 13-component additive confidence, Shin/median market read, GSE Score (confidence × proof multiplier), isotonic calibration, and the one-ladder proof gates (FOUNDING → PROVEN → ESTABLISHED → AUTHORITY) that govern pricing AND the priced=false → priced flip via Model Court.*

### Orientation

This is the family GSE is closest to *philosophically*: it is "math you can read." Every method here is auditable, interpretable, and has a literature with calibration norms — exactly what the proof ladder and Model Court demand. The strategic read is that GSE does **not** need this family to produce a competing win-probability number (the published pick is an additive *ranking* index, deliberately not a probability). GSE needs this family for three narrower, nearer-term jobs, and the catalog is organized to surface them:

1. **Calibration** — turning settled outcomes into trustworthy probabilities and keeping ECE non-worsening. GSE already uses isotonic/PAVA; the question is what *complements* it (Platt/beta calibration, Dirichlet/Beta-Binomial conjugate updating, empirical-Bayes shrinkage on thin samples).
2. **Line-movement modeling** — treating the odds path from open to close as a time series, so "line movement" becomes a measured signal with a model behind it rather than a hand-weighted delta. State-space / Kalman, local regression (LOESS), and structural time series are the cleanest fits.
3. **Uncertainty / volatility penalties** — sizing the existing uncertainty penalty from the *observed dispersion* of the market and the model, rather than a fixed constant. GARCH-family, Gaussian processes, and Wilson/empirical-Bayes intervals are the tools.

Everything else (ARIMA, GLMs, survival, VAR, regime-switching, copulas, EVT) is cataloged honestly: some are genuinely useful shadow estimators, several are REFERENCE benchmarks that sharpen thinking, and a few are SKIP for a single-season NFL ranking product. The discriminating cut is: **NFL gives you ~272 regular-season games a year and ~17 games per team — that is small-n, high-noise, structural-break-prone data.** Methods that shine on long, dense, low-noise series (classic Box-Jenkins ARIMA, TBATS, multi-seasonal decomposition) are mostly mismatched to the per-game prediction surface, though several earn a role on the *operational* series GSE generates internally (line paths, daily slate volume, calibration drift, API/data-quality telemetry).

#### Quick comparison table

| Method (family) | Primary GSE job | Verdict | Nearest GSE surface |
|---|---|---|---|
| Isotonic / PAVA | Calibration | **ADOPT-NOW** (in use) | `probability-calibration.ts`, `calibration-apply.ts` |
| Platt / beta / logistic calibration | Calibration (small-n) | **ADOPT-NOW** | `probability-calibration.ts` (alt calibrator) |
| Beta-Binomial / Dirichlet conjugate | Calibration + thin-sample rates | **ADOPT-NOW** | `probability-calibration.ts`, hit-rate priors |
| Empirical Bayes / James–Stein shrinkage | Team/market rate shrinkage | **ADOPT-NOW** | feeds DVOA-family + Poisson rates |
| Wilson interval (binomial) | Proof intervals | **ADOPT-NOW** (in use) | `model-limitations.ts/wilsonInterval` |
| LOESS / LOWESS / local regression | Line-movement smoothing | **PILOT** | `game-context.ts` line-movement |
| State-space / Kalman / DLM | Line-movement filtering | **PILOT** | `game-context.ts`, signal snapshots |
| GARCH / EGARCH family | Uncertainty/volatility penalty | **PILOT** | uncertainty penalty term |
| Quantile regression | Uncertainty bands | **PILOT** | uncertainty penalty, intervals |
| Logistic / ordered logit GLM | Shadow win-prob benchmark | **SHADOW** | new gated estimator |
| GAM (generalized additive) | Shadow non-linear benchmark | **SHADOW** | new gated estimator |
| Elastic-net / ridge / lasso | Weight regularization | **SHADOW** | engine weight discipline |
| Gaussian process regression | Line path + uncertainty | **SHADOW** | line-movement, uncertainty |
| Bayesian structural TS (CausalImpact) | Line-move event impact | **SHADOW** | line-movement attribution |
| Hierarchical / multilevel Bayes | Partial pooling across teams | **SHADOW** | rate estimation, calibration |
| Markov / regime-switching, HMM | Market regime flag | **SHADOW** | schedule-stress / regime context |
| ARIMA / SARIMA / SARIMAX | Operational series only | **REFERENCE** | internal telemetry, not picks |
| ETS / Holt–Winters | Operational series only | **REFERENCE** | slate-volume ops forecasts |
| Theta method | Forecast benchmark | **REFERENCE** | benchmark only |
| STL decomposition | Seasonality diagnostics | **REFERENCE** | ops telemetry diagnostics |
| Prophet | Ops/business forecasting | **REFERENCE** | business KPIs, not picks |
| TBATS | Multi-seasonal ops series | **REFERENCE** | high-frequency ops only |
| VAR / VECM / BVAR | Multi-market co-movement | **REFERENCE** | cross-market research |
| Poisson / NegBin GLM | Team-scoring estimator | **SHADOW** (blocked on rates) | Poisson estimator scaffold |
| Cox / survival / hazard | Duration/timing | **SKIP** (no native duration target) | n/a |
| Copula models | Parlay/correlation pricing | **REFERENCE** (future) | cross-market, parlay R&D |
| Extreme value theory (EVT) | Tail-risk / bankroll | **REFERENCE** | risk framing, not picks |
| Stochastic volatility | Volatility (heavier GARCH) | **REFERENCE** | benchmark vs GARCH |
| MIDAS / mixed-frequency | Intraday → game nowcast | **REFERENCE** (future) | line nowcasting R&D |
| Mixed-effects models | Repeated-measures pooling | **SHADOW** | same lane as hierarchical |
| Negative-binomial GLM | Overdispersed counts | **SHADOW** | with Poisson estimator |
| Spline / smoothing-spline regression | Non-linear shaping | **PILOT** | line-movement, calibration shape |

### A. Time-Series / Forecasting

#### 1. ARIMA / SARIMA / SARIMAX / ARIMAX

- **Name (aliases):** AutoRegressive Integrated Moving Average; Box–Jenkins models. SARIMA = Seasonal ARIMA; SARIMAX / ARIMAX = (Seasonal) ARIMA with eXogenous regressors.
- **One-line definition:** A linear model of a (differenced-to-stationarity) series as a function of its own past values and past forecast errors, optionally with seasonal terms and external regressors.
- **How it works:** AR(p) regresses the series on its own lags; MA(q) regresses on past error terms; I(d) differences the series d times to remove trends and achieve stationarity. SARIMA adds a parallel seasonal (P,D,Q)ₘ block; the X variants append exogenous predictors. Orders are chosen by ACF/PACF inspection and AIC/BIC.
- **Where it's proven:** The canonical workhorse of macro/financial/demand forecasting on long, regularly-sampled univariate series.
- **GSE relevance:** **REFERENCE** for the pick surface — NFL per-team series are ~17 points/season with structural breaks (injuries, trades), violating the long-stationary regime ARIMA needs. It *is* useful on GSE's **operational** series (daily slate volume, API latency, data-quality scores, calibration-error drift) where you have dense regular sampling.
- **Integration path:** Not a pick estimator. If adopted, lives in an ops-monitoring module forecasting internal telemetry; never enters the additive confidence or the priced ladder. Use SARIMAX only to model line *paths* if a richer state-space approach (see §13) proves too heavy.

#### 2. Exponential Smoothing & ETS

- **Name (aliases):** Simple/Single Exponential Smoothing (SES), Double (Holt's linear), ETS = Error-Trend-Seasonal state-space framework (Hyndman et al.). "Exponentially Weighted Moving Average" (EWMA) is the SES special case.
- **One-line definition:** Forecasts as exponentially-weighted averages of past observations, with recent points weighted more heavily; ETS formalizes this as a taxonomy of additive/multiplicative error, trend, and seasonal components.
- **How it works:** A smoothing parameter α∈(0,1) sets the decay; the forecast is a recursively updated level (plus trend/seasonal states in Holt/Holt–Winters). ETS auto-selects among ~30 model forms by AICc and provides principled prediction intervals via its state-space form.
- **Where it's proven:** Retail demand, inventory, and any high-volume operational forecasting; a perennial M-competition top performer.
- **GSE relevance:** **REFERENCE** for picks (same small-n mismatch). The **EWMA idea is quietly ADOPT-grade** as a primitive, though: exponentially weighting recent ATS form / recent line moves is a defensible, interpretable upgrade to flat-window averages already implied in the engine.
- **Integration path:** Use EWMA decay inside the ATS-form and line-movement components (`game-context.ts`) as a parameter, not a new estimator — it changes how an existing term is computed, so it passes through Model Court as a weight-computation change with out-of-sample check, not a new priced signal.

#### 3. Holt–Winters

- **Name (aliases):** Triple Exponential Smoothing; Holt–Winters Seasonal Method (additive and multiplicative variants).
- **One-line definition:** Exponential smoothing extended with explicit level, trend, and seasonal recursions for series with a fixed seasonal period.
- **How it works:** Three smoothing equations (level α, trend β, seasonal γ) are updated each step; the seasonal index repeats every m periods. Additive for constant seasonal amplitude, multiplicative for amplitude that scales with level.
- **Where it's proven:** Weekly/monthly seasonal demand, energy load, web traffic.
- **GSE relevance:** **REFERENCE.** NFL "seasonality" (week-of-season effects) is weak and confounded; not worth a dedicated seasonal estimator on the pick surface. Useful only for ops series with genuine weekly seasonality (e.g., slate volume by day-of-week).
- **Integration path:** Ops dashboard only; never touches confidence or the ladder.

#### 4. Theta Method

- **Name (aliases):** Theta model (Assimakopoulos & Nikolopoulos, 2000); Optimised Theta.
- **One-line definition:** Decomposes a deseasonalized series into "theta-lines" that rescale local curvature, extrapolates each, then averages them.
- **How it works:** The θ=0 line strips curvature to a linear long-term trend (fit by OLS); the θ=2 line doubles curvature to capture short-term behavior (extrapolated by SES); the two are averaged. Simple, fast, and shockingly accurate — it won the M3 competition over 3,003 series.
- **Where it's proven:** General-purpose univariate forecasting; the standard *benchmark* every new forecaster must beat.
- **GSE relevance:** **REFERENCE** — keep it as the yardstick any GSE shadow forecaster of an internal series must outperform before it earns attention. Not a pick estimator.
- **Integration path:** Benchmark harness in the model-evaluation tooling (the out-of-sample stage of Model Court can cite "beats Theta" as evidence); no production surface.

#### 5. STL Decomposition (Classical Decomposition)

- **Name (aliases):** Seasonal-Trend decomposition using Loess (STL, Cleveland et al.); classical additive/multiplicative decomposition.
- **One-line definition:** Splits a series into trend, seasonal, and remainder components using iterated LOESS smoothing.
- **How it works:** Alternates between smoothing the seasonal sub-series and the deseasonalized trend, robustly down-weighting outliers; the remainder is what's left. It's a *diagnostic/decomposition* tool more than a forecaster (you forecast the components separately).
- **Where it's proven:** Exploratory analysis of seasonal data, anomaly detection, preprocessing.
- **GSE relevance:** **REFERENCE** — valuable for *diagnosing* whether GSE's calibration-error or line-movement series have hidden seasonal/cyclical structure before modeling them. Not a pick method.
- **Integration path:** Internal analytics on ops/telemetry series; informs which estimator to use downstream, never published.

#### 6. Facebook Prophet

- **Name (aliases):** Prophet (Meta/Facebook); a decomposable additive regression model (trend + seasonality + holidays).
- **One-line definition:** An automated, analyst-friendly forecaster that fits piecewise-linear/logistic trend plus Fourier-series seasonality plus holiday effects.
- **How it works:** Treats forecasting as curve-fitting with a Bayesian-style additive structure; auto-detects changepoints in the trend and models multiple seasonalities via Fourier terms. Robust to missing data and outliers, tuned for "good-enough fast."
- **Where it's proven:** Business KPI forecasting at scale (traffic, signups, revenue) by non-specialists.
- **GSE relevance:** **REFERENCE** for picks; **PILOT-grade for the *business* side of GSE** (subscriber growth, churn, slate-volume capacity planning). It is explicitly not a per-game predictor and shouldn't masquerade as one inside the engine.
- **Integration path:** Business analytics, not `prediction-engine`. Stays entirely outside the proof ladder.

#### 7. TBATS

- **Name (aliases):** TBATS = Trigonometric seasonality, Box-Cox transform, ARMA errors, Trend, Seasonal components (De Livera, Hyndman & Snyder). Parent family BATS (no trig seasonality).
- **One-line definition:** An exponential-smoothing state-space model for series with *multiple/complex* seasonal periods, using Fourier terms for seasonality and ARMA-modeled residuals.
- **How it works:** Applies a Box-Cox transform, then models the series as trend + trigonometric (Fourier) seasonal terms + ARMA error process, auto-selecting components by AIC. Built for high-frequency data with several overlapping seasonalities (e.g., daily + weekly + annual).
- **Where it's proven:** Hourly/daily energy, call-center, and web series with multiple seasonal cycles.
- **GSE relevance:** **REFERENCE.** Overkill for NFL picks (no multi-seasonal structure). Only conceivable use is a *high-frequency ops* series with daily+weekly cycles; even then ETS or a simple state-space model is usually enough.
- **Integration path:** None on the pick surface; ops-only if ever.

### B. Regression / GLM Family

#### 8. Generalized Linear Models — Logistic Regression

- **Name (aliases):** Logistic regression; binomial GLM with logit link; "logit model."
- **One-line definition:** Models the log-odds of a binary outcome as a linear function of predictors.
- **How it works:** logit(p) = β₀ + Σβᵢxᵢ; coefficients are fit by maximum likelihood; the inverse-logit maps the linear predictor back to a calibrated-by-construction probability. Interpretable coefficients (odds ratios) and well-understood inference.
- **Where it's proven:** The default for binary classification across medicine, credit, sports win-probability models (it underlies most public NFL win-prob models).
- **GSE relevance:** **SHADOW** — the cleanest candidate for a *shadow win-probability* estimator to sit alongside the additive confidence and feed calibration evidence. It produces an honest probability (something the additive index deliberately is not), making it the natural "second opinion" the ladder can score for CLV and Brier.
- **Integration path:** New estimator in `prediction-engine`, registered priced=false. Its probabilities flow into `probability-calibration.ts` and the Brier/Murphy/ECE machinery; it flips priced only after ≥100 settled + non-worsening ECE and a Model Court pass (prosecution/defense/falsifier/out-of-sample).

#### 9. Poisson Regression GLM

- **Name (aliases):** Poisson GLM (log link); count regression.
- **One-line definition:** Models a non-negative count (e.g., points/goals scored) as Poisson with a log-linear mean.
- **How it works:** log(λ) = β₀ + Σβᵢxᵢ; the mean equals the variance under the Poisson assumption. For sports, team-level scoring rates feed a bivariate-Poisson or independent-Poisson scoreline model from which spread/total/win probabilities are derived.
- **Where it's proven:** Soccer/hockey scoreline modeling (Dixon–Coles), insurance claim counts, epidemiology.
- **GSE relevance:** **SHADOW**, and already scaffolded in GSE — *but blocked on a team-scoring-rate source.* Once a clean rates feed exists, this is a strong second estimator, especially for MLB/NHL on the roadmap (low-scoring count sports are where Poisson earns its keep).
- **Integration path:** The existing Poisson scaffold; unblock the team-rates source, run priced=false, and let it generate win/total probabilities that the calibration layer scores. Enters the ladder identically to the logistic estimator.

#### 10. Negative-Binomial Regression GLM

- **Name (aliases):** NegBin GLM; overdispersed Poisson; NB2.
- **One-line definition:** A count regression that relaxes Poisson's mean=variance assumption by adding a dispersion parameter.
- **How it works:** Introduces a gamma-distributed rate heterogeneity, yielding variance = μ + αμ²; handles "more spread than Poisson allows," common in real scoring data.
- **Where it's proven:** Any overdispersed count setting where Poisson under-predicts variance.
- **GSE relevance:** **SHADOW** — the natural robustness upgrade to the Poisson estimator. NFL scoring is overdispersed (blowouts, garbage-time), so if the Poisson shadow shows variance misfit, NegBin is the disciplined fix.
- **Integration path:** Same pipeline as the Poisson estimator; chosen by likelihood/AIC comparison during the shadow phase, then promoted (or not) via Model Court.

#### 11. Ordered / Ordinal Logit & Multinomial Logit

- **Name (aliases):** Proportional-odds model (ordered logit), ordered probit; multinomial logistic regression (MNL, softmax regression).
- **One-line definition:** Ordered logit models an ordinal outcome (e.g., margin buckets) via cumulative log-odds; multinomial logit models an unordered categorical outcome.
- **How it works:** Ordered logit fits one slope vector with multiple cutpoints separating ordered categories; multinomial logit fits separate coefficient vectors per category against a baseline. Both are MLE-fit GLM extensions.
- **Where it's proven:** Survey/rating data, discrete-choice modeling, market-share.
- **GSE relevance:** **SHADOW** (niche) — ordered logit could model **margin-of-victory buckets** to support alternate-spread and teaser context, a richer output than a single win-prob. Lower priority than binary logistic but a clean extension once the logistic shadow is live.
- **Integration path:** Optional secondary estimator producing bucketed margin probabilities; feeds cross-market context, not the headline pick. Gated like any estimator.

#### 12. Generalized Additive Models (GAM)

- **Name (aliases):** GAM (Hastie & Tibshirani); additive logistic/Poisson when paired with a link.
- **One-line definition:** A GLM where the linear predictor is replaced by a sum of smooth, non-parametric functions of each predictor.
- **How it works:** g(E[y]) = β₀ + Σ fⱼ(xⱼ), where each fⱼ is a penalized spline (or LOESS) fit by backfitting/penalized likelihood; smoothness is chosen to balance fit vs. wiggliness. Keeps GLM interpretability while capturing non-linear effects (e.g., a non-linear rest-days or line-movement effect).
- **Where it's proven:** Ecology, epidemiology, and any setting needing interpretable non-linearity; increasingly common in sports analytics for non-linear covariate effects.
- **GSE relevance:** **SHADOW** — the strongest *interpretable* non-linear benchmark. If the additive confidence assumes linear contributions where reality curves (rest, schedule stress, line-move magnitude), a GAM shadow reveals the true shape without going full black-box. Fits GSE's "math you can read" ethos better than GBM ML.
- **Integration path:** Shadow estimator and a *diagnostic* on existing components — fit a GAM on a contested term to learn its true response curve, then encode that shape back into the additive component (a weight-computation change through Model Court). As a full estimator it enters the ladder like logistic/Poisson.

#### 13. Elastic-Net / Ridge / Lasso (Penalized Regression)

- **Name (aliases):** Ridge = L2 / Tikhonov regularization; Lasso = L1; Elastic-Net = L1+L2 blend.
- **One-line definition:** Linear/logistic regression with a penalty on coefficient size to control variance and (for L1) perform variable selection.
- **How it works:** Minimizes loss + λ·(penalty); ridge shrinks coefficients smoothly, lasso zeros out weak predictors, elastic-net does both and handles correlated features gracefully. λ is tuned by cross-validation.
- **Where it's proven:** High-dimensional prediction (genomics, text, finance) and any regression with multicollinearity.
- **GSE relevance:** **SHADOW**, with a specific GSE angle: the 13 additive components are correlated (market consensus, book edge, cross-market all read the same market). A penalized regression on settled outcomes is the disciplined way to *learn defensible relative weights* and detect redundant components — directly relevant to weight hygiene and Model Court's "does this weight earn its place" question.
- **Integration path:** Offline weight-discipline analysis feeding the additive weights; results are proposed weight changes that must survive out-of-sample + no-calibration-regression before adoption. Not a runtime estimator.

#### 14. Quantile Regression

- **Name (aliases):** Quantile regression (Koenker & Bassett); pinball-loss regression.
- **One-line definition:** Models a chosen conditional quantile (e.g., 5th/50th/95th percentile) of the outcome rather than its mean.
- **How it works:** Minimizes the asymmetric "pinball" loss for each target quantile; fitting several quantiles traces a conditional distribution and yields prediction *intervals* directly, with no Gaussian assumption.
- **Where it's proven:** Risk (VaR), demand bounds, weather, any "model the spread not the average" problem.
- **GSE relevance:** **PILOT** for the **uncertainty penalty** — quantile regression on margin/total gives an empirical, distribution-free width that can *size* the uncertainty term instead of a fixed constant. Honest, interpretable, and gate-friendly because it produces measurable interval coverage.
- **Integration path:** Feeds the uncertainty-penalty computation in the confidence model and the interval reporting alongside Wilson intervals; a scoped backtest (coverage calibration on settled games) is the pilot gate before it influences the priced number.

### C. Volatility / Uncertainty

#### 15. GARCH / EGARCH / GJR-GARCH Family

- **Name (aliases):** (Generalized) AutoRegressive Conditional Heteroskedasticity — ARCH (Engle), GARCH (Bollerslev), EGARCH (Nelson, asymmetric/log-variance), GJR-GARCH / TGARCH (leverage effects), IGARCH.
- **One-line definition:** Models time-varying variance (volatility) as a function of past squared shocks and past variances, capturing volatility clustering.
- **How it works:** σ²ₜ = ω + α·ε²ₜ₋₁ + β·σ²ₜ₋₁ (GARCH(1,1)); calm periods persist, shocks raise volatility that decays. EGARCH/GJR add asymmetry so that "bad news" moves volatility more than "good news."
- **Where it's proven:** The gold standard for financial-returns volatility and risk modeling.
- **GSE relevance:** **PILOT** for the **uncertainty/volatility penalty and line-movement** — the open→close odds path is a financial-style series, and GARCH on *line-movement increments* would quantify when a game's market is unusually turbulent, directly informing a *dynamic* uncertainty penalty (turbulent market → larger penalty → lower confidence). This is one of the two best fits in the whole catalog to a named GSE need.
- **Integration path:** Fit on per-game line-movement series; the conditional volatility estimate scales the uncertainty-penalty term in the confidence model and can surface in `game-context.ts` and signal snapshots. Enters as priced=false shadow first (does volatility predict realized CLV variance?), promoted via Model Court on out-of-sample evidence.

#### 16. Stochastic Volatility (SV) Models

- **Name (aliases):** SV models; latent-volatility models (Taylor); often estimated by MCMC/particle filters.
- **One-line definition:** Like GARCH but volatility is its own *latent stochastic process* with its own innovation term, rather than a deterministic function of past shocks.
- **How it works:** log-variance follows an AR(1) latent process driven by a separate noise term; requires Bayesian/particle-filter estimation since the volatility is unobserved.
- **Where it's proven:** Option pricing, high-end financial econometrics where GARCH's determinism is too rigid.
- **GSE relevance:** **REFERENCE** — strictly heavier than GARCH for the same line-movement-volatility job, with worse interpretability and a harder estimation story that complicates Model Court auditing. Keep as the benchmark GARCH is checked against, not a build target.
- **Integration path:** None initially; if the GARCH pilot succeeds and shows systematic misfit, SV is the documented next experiment.

#### 17. Wilson Score Interval (and binomial proportion intervals)

- **Name (aliases):** Wilson score interval; (vs. Wald, Agresti–Coull, Clopper–Pearson exact, Jeffreys).
- **One-line definition:** A small-sample-robust confidence interval for a binomial proportion (e.g., hit rate, CLV-beat rate).
- **How it works:** Inverts the score test rather than the Wald test, so it stays inside [0,1] and behaves well at extreme proportions and small n — exactly the regime of early-ladder GSE samples.
- **Where it's proven:** Polling, A/B testing, any "estimate a rate honestly with limited data" task.
- **GSE relevance:** **ADOPT-NOW** — *already in use* in `model-limitations.ts/wilsonInterval`. It is the correct, defensible choice for the proof-ladder rate claims (settled hit rate, CLV ≥52.4% / ≥55% thresholds) and should remain the canonical interval. Reaffirm; don't replace with Wald.
- **Integration path:** Already wired to the proof milestones; ensure every published rate (FOUNDING/PROVEN/ESTABLISHED/AUTHORITY gate checks) reports the Wilson interval so the ladder's thresholds are evaluated against interval bounds, not point estimates.

### D. Bayesian / Hierarchical / Shrinkage / Calibration

#### 18. Isotonic Regression / PAVA

- **Name (aliases):** Isotonic regression; Pool-Adjacent-Violators Algorithm (PAVA / PAV); non-parametric monotone calibration.
- **One-line definition:** Fits a monotone (non-decreasing) step function mapping raw scores to calibrated probabilities, with no functional-form assumption.
- **How it works:** PAVA merges adjacent score-bins that violate monotonicity into pooled weighted averages in O(n), yielding the best-fitting monotone map. Flexible but can overfit on small samples (hence GSE's ≥100-settled gate).
- **Where it's proven:** The standard non-parametric calibrator for ML classifier outputs.
- **GSE relevance:** **ADOPT-NOW** — *already the GSE calibrator,* applied only at settled n≥100 with non-worsening ECE. This is exactly right; the discipline (sample floor + ECE guard) is the textbook safeguard against isotonic's overfitting weakness.
- **Integration path:** Already in `calibration-apply.ts` / `probability-calibration.ts`. The only refinement worth piloting is a *fallback* to a smoother calibrator (Platt/beta, §19) when n is between, say, 30 and 100 — isotonic is too jumpy there, and a parametric calibrator bridges the gap before isotonic earns enough data.

#### 19. Platt Scaling / Beta Calibration / Logistic Calibration

- **Name (aliases):** Platt scaling (sigmoid calibration); beta calibration (Kull et al.); temperature scaling (its 1-parameter cousin).
- **One-line definition:** Parametric probability calibration that fits a sigmoid (Platt) or a beta-distribution-based map (beta) from raw scores to calibrated probabilities.
- **How it works:** Platt fits a 1-D logistic regression (two parameters) on raw scores vs. outcomes; beta calibration uses a more flexible two-parameter family that can correct a wider range of miscalibration shapes while staying smooth and low-variance — ideal when data is scarce.
- **Where it's proven:** SVM/boosting/neural-net output calibration, especially small-sample settings where isotonic overfits.
- **GSE relevance:** **ADOPT-NOW** as the *small-n complement to isotonic.* It directly closes GSE's pre-100-settled calibration gap: a smooth parametric calibrator gives trustworthy probabilities at n=30–100, then hands off to isotonic once the ≥100 gate opens. Beta calibration is preferred over plain Platt for its richer shape control.
- **Integration path:** Add as a selectable calibrator in `probability-calibration.ts` with a sample-size-driven switch (parametric below the isotonic floor, isotonic above). Same ECE non-worsening guard; promotion of the *switch policy* runs through Model Court once.

#### 20. Beta-Binomial & Dirichlet Conjugate Updating

- **Name (aliases):** Beta-Binomial conjugacy (Beta prior on a binomial rate); Dirichlet-Multinomial (its multi-category generalization); conjugate Bayesian updating.
- **One-line definition:** Updates a probability/rate estimate by combining a Beta(α,β) prior with observed successes/failures in closed form.
- **How it works:** Posterior = Beta(α+successes, β+failures); the prior acts as "pseudo-counts" that regularize thin samples toward a sensible baseline, with the data taking over as it accumulates. No MCMC needed — pure arithmetic, fully auditable.
- **Where it's proven:** Click-through rates, conversion rates, any "estimate a proportion with a prior" task; the engine behind Bayesian A/B testing.
- **GSE relevance:** **ADOPT-NOW** — the most GSE-native Bayesian tool. It makes early hit-rate and CLV-beat estimates *honest under small n* (a 3-for-5 start isn't 60% — the Beta posterior says so), and it dovetails with the proof ladder by giving credible intervals that the FOUNDING→PROVEN transition can cite. Closed-form math is trivially Model-Court-auditable.
- **Integration path:** Use as the prior/shrinkage layer on any rate the ladder reports (hit rates, segment CLV) and as a pre-calibration smoother feeding `probability-calibration.ts`. Because it's closed-form and conservative, it can enter as a reporting refinement with a single Model Court sign-off rather than a long shadow.

#### 21. Empirical Bayes / Shrinkage / James–Stein / Stein Estimation

- **Name (aliases):** Empirical Bayes; Stein's estimator; James–Stein estimator; shrinkage estimation; (Efron–Morris).
- **One-line definition:** Shrinks individual noisy estimates toward a common (grand-mean or model-based) value, with shrinkage strength learned from the data, provably reducing total error.
- **How it works:** Each unit's estimate is pulled toward the pooled mean in proportion to its noise; James–Stein proved this *dominates* the naive per-unit average in ≥3 dimensions (Stein's paradox). The famous demo: shrinking early-season batting averages predicts rest-of-season far better than raw averages.
- **Where it's proven:** Baseball rate estimation, small-area estimation, genomics, anywhere you estimate *many* related quantities each with little data.
- **GSE relevance:** **ADOPT-NOW** — this is *the* tool for NFL's many-teams-few-games problem. Team-level rates (ATS form, scoring rate, venue form) are exactly the "many noisy estimates" James–Stein was built for; shrinking each toward the league mean is the disciplined way to stop overreacting to a 3-game sample. Feeds both the DVOA-family estimator and the Poisson rates.
- **Integration path:** A shrinkage layer applied to any per-team rate before it enters a component or estimator — improves the *inputs* to the additive confidence and the Poisson/DVOA scaffolds. Enters as an input-quality change validated by out-of-sample rate-prediction error; low-risk, high-leverage.

#### 22. Hierarchical / Multilevel Bayesian Models (Partial Pooling)

- **Name (aliases):** Multilevel models, mixed-effects models (Bayesian framing), random-effects models, partial pooling.
- **One-line definition:** Models data grouped by unit (team, venue, season) with group-level parameters drawn from a shared higher-level distribution, so groups borrow strength from each other.
- **How it works:** Estimates per-group effects *and* a population distribution simultaneously; groups with little data are pulled toward the population mean (partial pooling — the principled middle between "one model for all" and "separate model per team"). Usually fit by MCMC (Stan/PyMC) or INLA.
- **Where it's proven:** Education, epidemiology, sports (team/player effects), political polling (Mr. P).
- **GSE relevance:** **SHADOW** — the "grown-up" version of the James–Stein shrinkage idea, and the right long-term home for team/venue/season effects with full uncertainty propagation. Heavier to fit and audit than conjugate/EB methods, so it's a *shadow research* track rather than a first move — but it is where a serious GSE rates model eventually lives.
- **Integration path:** Offline hierarchical model producing shrunk team/venue effects + posterior uncertainty that feed estimators and the uncertainty penalty. Promotion gated normally; its added value over cheap EB shrinkage (§21) must be demonstrated out-of-sample to justify the auditing cost.

#### 23. Mixed-Effects Models (Frequentist)

- **Name (aliases):** Linear/generalized linear mixed models (LMM/GLMM); random- and fixed-effects models; hierarchical linear models.
- **One-line definition:** Regression with both fixed effects (population-level) and random effects (group-level deviations), the frequentist twin of multilevel Bayes.
- **How it works:** Random effects are modeled as draws from a normal distribution with estimated variance; fit by (restricted) maximum likelihood. Handles repeated measures and grouped/clustered data (multiple games per team) without violating independence.
- **Where it's proven:** Longitudinal clinical trials, panel data, repeated-measures sports data.
- **GSE relevance:** **SHADOW** — same lane and same job as §22, lighter to fit (lme4-style) but with less natural uncertainty propagation. Reasonable interim step toward hierarchical modeling of team effects across the season.
- **Integration path:** Same as §22; choose between mixed-effects (faster) and full Bayesian (richer uncertainty) during the shadow phase based on whether the uncertainty propagation is actually needed downstream.

#### 24. Gaussian Processes / GP Regression

- **Name (aliases):** Gaussian process regression; kriging (geostatistics); GP.
- **One-line definition:** A non-parametric Bayesian model over functions: any finite set of points is jointly Gaussian, with a kernel encoding smoothness, giving predictions *with* principled uncertainty everywhere.
- **How it works:** A covariance kernel (e.g., RBF/Matérn) defines how points co-vary by distance; conditioning on observed data yields a posterior mean (the fit) and posterior variance (the uncertainty, which widens away from data). Excellent for smooth, low-data functions.
- **Where it's proven:** Bayesian optimization, spatial statistics, robotics, small-data regression with calibrated uncertainty.
- **GSE relevance:** **SHADOW**, with two GSE hooks: (1) modeling the **line-movement path** as a smooth function of time-to-kickoff with built-in uncertainty bands, and (2) producing the *uncertainty estimate* itself for the penalty term. Its honest, data-distance-aware error bars fit GSE's culture, but cost/complexity make it a research track behind GARCH and Kalman.
- **Integration path:** Shadow modeling of line paths in `game-context.ts`; the GP posterior variance is a candidate driver of the uncertainty penalty. Promoted only if it beats simpler smoothers (LOESS/Kalman) out-of-sample.

#### 25. Bayesian Structural Time Series (CausalImpact)

- **Name (aliases):** BSTS (Scott & Varian); CausalImpact (Google/Brodersen); structural time series with spike-and-slab regression.
- **One-line definition:** A state-space time-series model with a Bayesian regression component (spike-and-slab variable selection) used for forecasting, nowcasting, and *counterfactual causal-impact* estimation.
- **How it works:** Decomposes a series into trend + seasonal + a regression on contemporaneous predictors, with spike-and-slab priors auto-selecting relevant predictors and shrinking the rest to zero; CausalImpact then asks "what would the series have done *without* the intervention?" by forecasting the counterfactual.
- **Where it's proven:** Marketing-lift measurement, ad-campaign causal impact, nowcasting with many candidate predictors.
- **GSE relevance:** **SHADOW** (specialized) — the natural tool to answer *"did this news/injury/steam move actually shift the line beyond normal drift?"* by treating the event as an intervention on the line-movement series. That's a genuinely differentiated, explainable signal ("the market moved 1.5 pts more than the counterfactual after the QB news"). Niche but on-brand.
- **Integration path:** Event-study module over line-movement series feeding a line-movement *attribution* signal and `game-context.ts`. Runs priced=false to gather evidence that event-attributed moves predict CLV before any weighting.

### E. Regime / State / Filtering

#### 26. State-Space Models / Structural Time Series / Unobserved Components

- **Name (aliases):** State-space models; structural time series (STS); Unobserved Components Models (UCM); Dynamic Linear Models (DLM).
- **One-line definition:** Represents a series via latent (unobserved) state variables — level, trend, seasonal — that evolve over time and generate noisy observations.
- **How it works:** A *state equation* describes how hidden states evolve; an *observation equation* links states to data. The Kalman filter estimates the states recursively. Components are interpretable (you can read off the trend and its uncertainty), unlike a black box.
- **Where it's proven:** Econometric trend/seasonal extraction, engineering tracking, finance.
- **GSE relevance:** **PILOT** for **line movement** — modeling the true "fair line" as a latent state that the observed market noisily reveals over time is the most principled, interpretable framing of line movement available, and it yields a real-time uncertainty on the state. This and GARCH are the two top-fit methods to GSE's named near-term needs.
- **Integration path:** Latent-fair-line model feeding `game-context.ts` line-movement and signal snapshots; the state estimate sharpens the line-movement component and the state variance feeds the uncertainty penalty. Shadow → priced via the standard gates.

#### 27. Kalman Filter & Dynamic Linear Models (DLM)

- **Name (aliases):** Kalman filter; linear-Gaussian state-space filter; DLM; (extended/unscented Kalman for non-linear variants).
- **One-line definition:** A recursive algorithm that optimally updates an estimate of a latent state as each new observation arrives, balancing model prediction against measurement.
- **How it works:** Two steps per observation — *predict* (project the state forward) and *update* (correct using the new measurement, weighted by the Kalman gain = relative trust in model vs. data). Produces filtered states and their variances online; the engine inside §26.
- **Where it's proven:** Navigation/tracking, signal processing, real-time finance (dynamic betas, pairs trading).
- **GSE relevance:** **PILOT** — the concrete *mechanism* for the §26 line-movement pilot. As each new odds quote arrives, the Kalman update gives a fresh fair-line estimate and uncertainty in real time — ideal for a live, streaming line-movement signal that updates as the market moves toward kickoff.
- **Integration path:** Implementation layer of the state-space line-movement pilot in `game-context.ts`; the filtered estimate and gain feed the line-movement term and the streaming signal snapshots. Same ladder path as §26 (they ship together).

#### 28. Markov-Switching / Regime-Switching Models

- **Name (aliases):** Markov regime-switching (Hamilton, 1989); Markov-switching AR; MS-GARCH (regime-switching volatility).
- **One-line definition:** A time-series model whose parameters switch between a small set of hidden "regimes" governed by a Markov chain.
- **How it works:** An unobserved state follows a Markov chain with estimated transition probabilities; each regime has its own dynamics (mean/variance). The filter infers the *probability* the system is in each regime at each time — e.g., "expansion vs. recession," or "calm vs. volatile market."
- **Where it's proven:** Business-cycle dating, volatility-regime detection, FX/equity regime models.
- **GSE relevance:** **SHADOW** — could flag *market regimes* on the line-movement/volatility series (a "sharp, fast-moving market" regime vs. a "quiet" one), which is a clean modifier for the uncertainty penalty and a plausible schedule-stress/context input. Evidence-gathering territory: does regime probability predict CLV variance? Run unweighted first.
- **Integration path:** Regime-probability signal layered onto the volatility/line-movement model; feeds context and uncertainty penalty as a priced=false signal until it demonstrates predictive value via Model Court.

#### 29. Hidden Markov Models (HMM)

- **Name (aliases):** HMM; the discrete-observation/latent-state cousin of regime-switching; (Baum–Welch / Viterbi algorithms).
- **One-line definition:** Models observed data as emissions from an unobserved discrete state sequence that follows a Markov chain.
- **How it works:** Defined by transition probabilities (state→state) and emission probabilities (state→observation); Baum–Welch (EM) learns parameters, Viterbi decodes the most likely hidden-state path. Regime-switching is essentially an HMM with continuous emissions.
- **Where it's proven:** Speech recognition, bioinformatics, financial regime/latent-state modeling.
- **GSE relevance:** **SHADOW** — same job and same caveats as §28 for GSE; the choice between HMM and Markov-switching is mostly framing. Treat as one shadow "market-regime" experiment, not two separate builds.
- **Integration path:** Folded into the §28 regime experiment; whichever formulation scores better on out-of-sample regime usefulness is the one that could enter the ladder.

#### 30. VAR / VECM / Bayesian VAR

- **Name (aliases):** Vector AutoRegression (VAR, Sims); Vector Error-Correction Model (VECM, Engle–Granger / Johansen cointegration); Bayesian VAR (Minnesota prior).
- **One-line definition:** Multivariate time-series models where several series are predicted jointly from their collective lags (VAR), optionally with a long-run cointegrating equilibrium (VECM).
- **How it works:** VAR regresses each variable on lags of *all* variables, capturing co-movement and enabling impulse-response/Granger-causality analysis. VECM adds an error-correction term pulling cointegrated series back toward a shared long-run relationship; BVAR adds shrinkage priors to tame the parameter explosion.
- **Where it's proven:** Macroeconomic forecasting and policy analysis, multi-asset finance.
- **GSE relevance:** **REFERENCE** — conceptually interesting for *cross-market co-movement* (spread, total, and moneyline markets move together; books move together), but full VAR/VECM is heavy, parameter-hungry, and hard to audit for a per-game product. The *idea* (markets share a cointegrated fair-value relationship) is worth carrying into the cross-market component design without building the full apparatus.
- **Integration path:** Research-only; informs how the cross-market component reasons about consistency between related markets. No production VAR in the engine near-term.

### F. Survival / Duration, Dependence, Tails, Mixed-Frequency

#### 31. Survival Analysis / Cox Proportional Hazards / Hazard Models

- **Name (aliases):** Survival analysis; Cox PH model; proportional-hazards regression; Kaplan–Meier (non-parametric); accelerated failure time (AFT); discrete-time hazard.
- **One-line definition:** Models the time until an event, handling censored observations (the event hasn't happened yet) via the hazard rate.
- **How it works:** Cox PH models the hazard as a baseline hazard × exp(βx) without specifying the baseline shape (semi-parametric); coefficients give hazard ratios. Built for "time-to-event with incomplete follow-up."
- **Where it's proven:** Medical survival, churn/retention timing, reliability/failure analysis, customer lifetime.
- **GSE relevance:** **SKIP** for the pick surface — GSE's prediction target is a discrete game outcome, not a duration with censoring; there's no native time-to-event variable in the picks. (It is genuinely useful for the *business* side — subscriber churn/retention timing — but that's outside the engine and the proof ladder.) Disqualifier: no duration/censored target in the prediction problem.
- **Integration path:** None in `prediction-engine`. Optional subscriber-churn analytics, entirely separate from picks and the ladder.

#### 32. Copula Models

- **Name (aliases):** Copulas — Gaussian copula, t-copula, Archimedean (Clayton/Gumbel/Frank), vine copulas.
- **One-line definition:** Models the *dependence structure* between variables separately from their individual (marginal) distributions.
- **How it works:** Sklar's theorem lets you couple any marginals via a copula function capturing their joint dependence — including tail dependence (joint extremes) that linear correlation misses. You model each margin, then the copula glues them.
- **Where it's proven:** Multi-asset risk, portfolio/credit dependence, insurance; infamous for both enabling and (mis)pricing correlated risk.
- **GSE relevance:** **REFERENCE** (future) — the *correct* tool for **parlay/same-game-correlation pricing**: legs in a parlay are dependent (a team covering and going over are correlated), and copulas price that dependence honestly. Not a near-term need (GSE ranks single picks today), but the right answer when GSE builds correlated-bet or parlay products.
- **Integration path:** Reserved for a future cross-market/parlay R&D surface; would model dependence among related markets/legs. Flagged now so it's on the roadmap, not built yet.

#### 33. Extreme Value Theory (EVT)

- **Name (aliases):** EVT; Generalized Extreme Value (GEV, block maxima); Generalized Pareto Distribution (GPD, peaks-over-threshold/POT); Pickands–Balkema–de Haan.
- **One-line definition:** A statistical framework for the *tails* — modeling rare, extreme events rather than the average.
- **How it works:** Block-maxima fits a GEV to periodic maxima; peaks-over-threshold fits a GPD to all exceedances above a high threshold (more data-efficient). Used to estimate VaR/expected-shortfall-style tail risk.
- **Where it's proven:** Finance/insurance tail risk, hydrology (floods), reliability.
- **GSE relevance:** **REFERENCE** — relevant to GSE's *risk framing* and bankroll/Kelly discussions (how bad can a drawdown get?), not to predicting a given game. It informs honest tail-risk messaging and any future bankroll-guidance feature, but produces no pick signal.
- **Integration path:** Risk/communication framing and optional future bankroll-risk tooling; never a confidence component or priced signal.

#### 34. Stochastic Volatility — *(see §16)*

Cross-listed under Volatility/Uncertainty. Verdict **REFERENCE** as the heavier benchmark to the GARCH line-movement-volatility pilot.

#### 35. Nowcasting / Mixed-Frequency / MIDAS

- **Name (aliases):** MIxed-DAta Sampling (MIDAS, Ghysels); nowcasting; mixed-frequency regression; (U-MIDAS, MF-VAR as relatives).
- **One-line definition:** Regression that predicts a low-frequency target from higher-frequency predictors *without* aggregating them away.
- **How it works:** Uses a parsimonious distributed-lag weighting (e.g., exponential Almon) to map many high-frequency observations onto the low-frequency target, avoiding parameter proliferation; yields a fresh "nowcast" as new high-frequency data lands.
- **Where it's proven:** GDP nowcasting from monthly/daily indicators, real-time macro.
- **GSE relevance:** **REFERENCE** (future) — the conceptual fit is *nowcasting a game's closing line/outcome from intraday high-frequency signals* (tick-level odds, in-play data). Genuinely interesting once GSE has high-frequency intraday feeds, but premature today; the Kalman/state-space line-movement pilot covers the near-term version of this need more simply.
- **Integration path:** Future intraday line-nowcasting R&D; flagged as the principled approach when sub-daily feeds exist. Not a current build.

### G. Smoothing / Local Regression (cross-cuts A & B)

#### 36. LOESS / LOWESS / Local Regression

- **Name (aliases):** LOESS / LOWESS (Cleveland); locally-weighted scatterplot smoothing; local polynomial regression.
- **One-line definition:** Fits many local low-degree polynomials in moving, distance-weighted windows to trace a smooth non-parametric curve.
- **How it works:** For each point, fit a weighted polynomial to nearby points (weights decay with distance, span controls smoothness); stitch the local fits into a smooth curve. No global functional form assumed; robust variants down-weight outliers.
- **Where it's proven:** Exploratory smoothing, trend extraction (it's the "L" inside STL), dose-response.
- **GSE relevance:** **PILOT** — the simplest defensible way to **smooth the line-movement path** (open→close) into a clean trend and detect inflection ("steam") without committing to a parametric model. Low-risk, highly interpretable, and a fast first step *before* the heavier Kalman/state-space pilot.
- **Integration path:** Smoothing layer on the line-movement series in `game-context.ts`; the smoothed slope/curvature feeds the line-movement component. Cheap enough to pilot immediately as a feature-engineering step (validated on whether smoothed-move features improve CLV) ahead of the state-space build.

#### 37. Spline / Smoothing-Spline Regression

- **Name (aliases):** Regression splines, B-splines, natural cubic splines, penalized/smoothing splines, P-splines; basis-function regression.
- **One-line definition:** Models a non-linear relationship as a piecewise-polynomial joined smoothly at knots, optionally penalized for smoothness.
- **One-line how-it-works:** Expand a predictor into spline basis functions and fit by (penalized) least squares/likelihood; the penalty trades fit against wiggliness. Splines are the smooth building blocks inside GAMs (§12).
- **Where it's proven:** Non-linear regression across statistics; the standard flexible-but-controllable curve tool.
- **GSE relevance:** **PILOT** — directly useful for two GSE shapes: (1) smoothing the **line-movement** curve (alternative/complement to LOESS), and (2) giving the **isotonic calibration** a smoother sibling for the small-n regime (a monotone penalized spline is smoother than isotonic's steps). Interpretable and gate-friendly.
- **Integration path:** As a calibration alternative it sits beside §18–§19 in `probability-calibration.ts`; as a line-movement shaper it sits beside §36 in `game-context.ts`. Either entry is a scoped pilot validated on ECE (calibration) or CLV (line movement) before influencing priced output.

### Recommended Adoption Sequence for GSE (statistical / time-series)

Tied to the one-ladder gates and Model Court. The throughline: **fix calibration and rate-estimation honesty first (cheap, closed-form, immediately defensible), then build the line-movement and uncertainty estimators (the two named near-term needs), then run the heavier shadow estimators that need a backtest.**

**Now — calibration & honest rates (closed-form, single Model Court sign-off each; no long shadow needed):**
1. **Reaffirm Wilson intervals (§17)** on every ladder rate — already in `model-limitations.ts`; make sure FOUNDING/PROVEN/ESTABLISHED/AUTHORITY thresholds read interval bounds, not point estimates.
2. **Add Beta-Binomial / Dirichlet conjugate updating (§20)** as the small-n shrinkage layer on hit rates and CLV-beat rates — stops early samples from lying.
3. **Add Platt/beta calibration (§19)** as the n=30–100 bridge calibrator in `probability-calibration.ts`, handing off to the existing isotonic (§18) above n≥100; keep the ECE non-worsening guard.
4. **Add empirical-Bayes / James–Stein shrinkage (§21)** to per-team rates feeding the DVOA-family and Poisson scaffolds — the highest-leverage fix for NFL's small-n team rates.

**Next — line movement & uncertainty (the two named near-term needs; pilot with scoped backtests):**
5. **LOESS / spline smoothing (§36/§37)** of the line-movement path as the cheap first feature; validate smoothed-move features on CLV.
6. **State-space / Kalman line-movement model (§26/§27)** — latent "fair line" with streaming uncertainty; ship as priced=false, promote on CLV evidence via Model Court. *Best fit for modeling LINE MOVEMENT.*
7. **GARCH-family on line-movement increments (§15)** to drive a *dynamic* uncertainty penalty, plus **quantile regression (§14)** for distribution-free interval widths. *Best fit for the UNCERTAINTY/VOLATILITY penalty.* (For CALIBRATION specifically, the near-term winners are §18 isotonic + §19 Platt/beta + §20 Beta-Binomial.)

**Then — shadow estimators (run unweighted, gather evidence, gate hard):**
8. **Logistic-regression win-probability shadow (§8)** — the honest probability second-opinion the additive index lacks; feed it straight into Brier/Murphy/ECE.
9. **GAM (§12)** and **penalized regression (§13)** as interpretable non-linear / weight-discipline benchmarks; use GAM partial-dependence to re-shape contested additive components.
10. **Unblock the Poisson/NegBin estimator (§9/§10)** once a team-scoring-rate source lands — especially valuable for the MLB/NHL roadmap.
11. **Market-regime experiment (§28/§29)** and **CausalImpact line-move attribution (§25)** as differentiated, on-brand context signals; **hierarchical/mixed-effects (§22/§23)** and **Gaussian processes (§24)** as the longer-horizon "serious rates model" research track.

**Reference shelf (benchmarks / future, not builds):** ARIMA/SARIMA (§1), ETS/Holt–Winters (§2/§3), Theta (§4), STL (§5), Prophet (§6), TBATS (§7), VAR/VECM/BVAR (§30), stochastic volatility (§16), copulas (§32, future parlay pricing), EVT (§33, risk framing), MIDAS (§35, future intraday nowcasting). **Skip:** Cox/survival on the pick surface (§31) — no native duration/censored target.

*Methods cataloged: 37 (35 numbered entries plus SARIMAX/ARIMAX and BATS variants treated within §1 and §7; stochastic volatility cross-listed §16/§34). Naming and mechanism details verified against current sources (Hyndman/forecast, M-competition literature, Ghysels MIDAS, Brodersen CausalImpact, Efron–Morris Stein, Engle–Granger/Johansen, Cleveland LOESS/STL).*

---

## Part 3 — Machine-learning & AI methods (48)

*Research wing, Galaxy Sports Edge executive advisory panel. Cataloged against the live GSE engine: 13-component additive confidence (0–100), Shin de-vig + median-consensus market read, Edge Index, GSE Score = confidence × proof multiplier (a ranking index, not a win probability); R&D estimators scaffolded but `priced=false` (Kalshi, Elo, Poisson, GBM ML estimator + honesty gate, opponent-adjusted DVOA); calibration via isotonic/PAVA + Brier/Murphy + ECE + reliability curves at settled n≥100; proof via CLV, Wilson intervals, Merkle commitments; player intelligence served fact/process-grade with `canPublishProjections=false`; "one ladder" proof milestones (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY) gating both pricing and the `priced=false→priced` flip; every new weight must pass Model Court — prosecution + defense + falsifier + out-of-sample + no calibration regression + owner sign-off.*

### Orientation

The ML/AI family is where the most predictive horsepower lives — and where the most ways to quietly destroy a proof-first brand live too. For GSE the governing tension is not "which model is most accurate on a backtest" but "which model can clear the falsifier, hold out-of-sample, calibrate at small n, and still be explained on an `/explain` surface." That filter is brutal and it should be. A model that wins by 0.6% Brier but cannot be defended in Model Court, or that needs player-tracking data GSE has no rights to, is a liability, not an asset. The honest reading of this family for a small audit-first team: **the boosted-tree ensemble (specifically a probabilistic GBM like NGBoost or quantile-LightGBM) plus conformal prediction plus SHAP is the entire near-term play.** Almost everything in deep learning — transformers, RNNs, GNNs, foundation TS models — is REFERENCE or PILOT-much-later for GSE, not because it's bad but because game-level NFL sample sizes (≈272 regular-season games/year) are catastrophically too small to train them without overfitting, and because they're opaque on an explainability-first surface. Calibration post-processing and conformal prediction are the highest-leverage, lowest-risk imports because they bolt onto what GSE already has (isotonic/PAVA, the gated ladder) and *increase* trust rather than risk it. The table below sorts the whole family by GSE fit; sections follow.

#### Comparison table (sorted by GSE fit)

| Method | Family | Probabilistic? | Explainable? | Data-hungry? | GSE verdict |
|---|---|---|---|---|---|
| Isotonic / PAVA calibration | Calibration | yes (post-hoc) | high | low | ADOPT-NOW (in prod) |
| Platt / beta / temperature scaling | Calibration | yes (post-hoc) | high | low | ADOPT-NOW |
| Split / Mondrian conformal prediction | Uncertainty | yes (intervals) | high | low-med | ADOPT-NOW |
| SHAP / TreeSHAP | Explainability | n/a | high | low | ADOPT-NOW |
| Ridge / Lasso / Elastic-Net logistic | Linear | yes (logit) | high | low | ADOPT-NOW |
| NGBoost (probabilistic GBM) | Tree ensemble | yes (full dist) | med (via SHAP) | med | PILOT |
| Quantile / explicit-quantile GBM | Tree ensemble | yes (quantiles) | med (via SHAP) | med | PILOT |
| LightGBM / XGBoost / CatBoost (point) | Tree ensemble | no (point) | med (via SHAP) | med | PILOT |
| Random forest / Extra-Trees | Tree ensemble | partial | med | med | PILOT |
| Stacking / blending / super learner | Ensembling | inherits | med | med | PILOT |
| Anomaly detection (steam/data-QA) | Anomaly | n/a | med | low-med | PILOT |
| CART decision tree | Tree | no | high | low | SHADOW/REF |
| Contextual bandits / RL (staking) | RL | n/a | low-med | high | SHADOW (sim only) |
| AutoML / HPO (Optuna) | Meta | n/a | n/a | n/a | REFERENCE (tooling) |
| Naive Bayes | Probabilistic | yes | high | low | REFERENCE |
| k-NN / SVM-SVR | Kernel/instance | no | low-med | med | REFERENCE |
| MLP / feedforward net | Neural | optional | low | high | REFERENCE |
| Representation learning / embeddings | Neural | n/a | low | high | REFERENCE |
| Online / incremental learning | Paradigm | inherits | med | med | REFERENCE |
| Transfer learning across sports | Paradigm | inherits | low | high | REFERENCE |
| AdaBoost | Tree ensemble | no | med | med | REFERENCE |
| LLM feature extraction (Claude) | LLM | n/a | med | n/a | REFERENCE (narrative only) |
| RNN / LSTM / GRU | Neural seq | optional | very low | very high | SKIP-for-now |
| TCN | Neural seq | optional | very low | very high | SKIP-for-now |
| TFT / N-BEATS / N-HiTS / DeepAR / PatchTST / TimesNet / Informer | Neural TS | varies | very low | extreme | SKIP-for-now |
| Foundation TS (TimeGPT / Chronos / Moirai / TimesFM) | Neural TS | varies | very low | n/a (zero-shot) | SKIP-for-now |
| CNN on tracking data | Spatial | no | very low | extreme + rights | SKIP |
| Graph neural networks | Graph | no | very low | extreme | SKIP |

### Linear / regularized

#### Ridge regression (L2-regularized least squares; Tikhonov regularization)
- **One-line:** Linear regression with an L2 penalty on coefficient magnitudes to shrink them toward zero and tame variance.
- **How it works:** Minimizes squared error plus λ·Σβ², which biases coefficients downward and stabilizes them under multicollinearity; the penalty has a closed-form solution and never zeros a coefficient (it shrinks all of them). λ is tuned by cross-validation.
- **Where it's proven:** The default workhorse for tabular regression with correlated features across finance, actuarial, and sports rating models.
- **GSE relevance: ADOPT-NOW.** Cheapest possible honest estimator for a continuous target (e.g., projected margin or total), fully explainable as signed coefficients on named features — exactly what `/explain` wants, and overfitting is structurally bounded by λ.
- **Integration path:** A `ml-estimator.ts` regression head feeding the Edge Index as a fair-line candidate; enters the ladder as `priced=false` shadow, Model Court reviews coefficient signs as the falsifier (do they match football logic?), flips to priced only after n≥100 + non-worsening ECE.

#### Lasso regression (L1-regularized; least absolute shrinkage and selection operator)
- **One-line:** Linear regression with an L1 penalty that drives weak coefficients exactly to zero, performing automatic feature selection.
- **How it works:** Minimizes squared error plus λ·Σ|β|; the absolute-value penalty has corners that produce sparse solutions, so it both shrinks and selects. Solved via coordinate descent / LARS.
- **Where it's proven:** High-dimensional settings where you want a small interpretable subset of features — genomics, econometrics, signal selection.
- **GSE relevance: ADOPT-NOW** as a *feature-selection* tool feeding the additive confidence design. Its sparsity is a gift to an audit-first brand: it tells you which of many candidate signals actually carry weight, killing data-snooping by construction.
- **Integration path:** Offline analysis step in the model-development pipeline that proposes which features survive into the 13-component additive score; the selection itself becomes a Model Court exhibit ("here is why these features, not those").

#### Elastic-Net (L1 + L2 combined)
- **One-line:** Linear model blending ridge and lasso penalties to get sparsity *and* stability with correlated predictors.
- **How it works:** Penalty is α·λ·Σ|β| + (1−α)·λ·Σβ²; the L1 part selects, the L2 part keeps groups of correlated features together instead of arbitrarily picking one. Two hyperparameters (λ, α) cross-validated.
- **Where it's proven:** The pragmatic default when features are both numerous and correlated — credit risk, marketing response, most modern tabular linear pipelines.
- **GSE relevance: ADOPT-NOW.** The single best linear baseline for GSE: handles correlated football features (e.g., DVOA components that move together) without the lasso's instability, stays fully explainable, and is impossible to overfit catastrophically.
- **Integration path:** The default linear estimator in `ml-estimator.ts`; serves as the *benchmark every fancier model must beat in Model Court* — if a GBM can't out-of-sample-beat elastic-net, it doesn't ship.

#### Regularized logistic regression (penalized logistic; ridge/lasso/elastic-net logit)
- **One-line:** Logistic regression with the same L1/L2 penalties, producing a calibrated-ish probability for a binary outcome (cover / no-cover, over / under).
- **How it works:** Models log-odds as a linear function of features, fit by penalized maximum likelihood; the sigmoid maps to [0,1]. Penalties control variance exactly as in the regression cases.
- **Where it's proven:** The canonical baseline for binary sports outcomes and the reference model in every betting-model paper.
- **GSE relevance: ADOPT-NOW.** This is the most defensible *probability* model GSE can run: it natively outputs a win/cover probability, is trivially calibrated by the existing isotonic stage, and every coefficient is an `/explain` line. It is the honest floor under any ML ambition here.
- **Integration path:** A binary head in `ml-estimator.ts` → output piped through `probability-calibration.ts` (isotonic/PAVA already there) → shadow on the ladder; the first realistic candidate to convert a *ranking* signal into a *calibrated probability* component once it clears n≥100 + Brier/ECE gates.

### Tree ensembles

#### CART (Classification and Regression Trees; decision tree)
- **One-line:** A single recursive binary tree that splits the feature space to minimize impurity (Gini/entropy) or variance.
- **How it works:** Greedily picks the feature+threshold that best separates outcomes at each node, recursing until a stopping rule; prediction is the leaf's majority class or mean. Prunes to control depth.
- **Where it's proven:** Interpretable baselines and as the base learner inside every forest and boosting machine.
- **GSE relevance: SHADOW / REFERENCE.** A lone tree is too high-variance to ship and too crude to beat elastic-net, but it's a useful *explainability prop*: a shallow tree can visualize the dominant decision logic for a public methodology page.
- **Integration path:** Not a production estimator; at most a depth-2/3 illustrative tree rendered on a `/methodology` or `/explain` surface to show "how the engine thinks" without exposing the real model.

#### Random forest (bagged decision trees; Breiman forests)
- **One-line:** An ensemble of de-correlated deep trees grown on bootstrap samples with random feature subsets, averaged for a low-variance prediction.
- **How it works:** Each tree sees a bootstrap resample and a random subset of features at each split; averaging many high-variance, low-bias trees cancels variance. Out-of-bag samples give a free validation estimate.
- **Where it's proven:** A rock-solid tabular default everywhere; strong, low-tuning baseline in sports and finance modeling.
- **GSE relevance: PILOT.** Robust and hard to overfit relative to its power, but typically edged out by boosting on tabular targets and only partially probabilistic. Worth a scoped backtest as a *benchmark* and as a variance-reduction anchor in a stack.
- **Integration path:** A candidate estimator in `ml-estimator.ts` run in shadow; its out-of-bag error is a cheap honesty check, and TreeSHAP gives the `/explain` story. Enters the ladder behind the GBM, mostly as a Model Court sparring partner.

#### Extremely randomized trees (Extra-Trees; ExtraTreesRegressor/Classifier)
- **One-line:** A forest variant that randomizes split thresholds (not just features), trading a little bias for even lower variance and faster training.
- **How it works:** Like a random forest but splits are chosen from random thresholds rather than optimized ones, and trees use the full sample (no bootstrap by default). Extra randomness further de-correlates trees.
- **Where it's proven:** Tabular benchmarks where random forest is strong and you want speed/variance gains.
- **GSE relevance: PILOT (low priority).** Marginal upgrade over random forest; same verdict and same explainability profile. Useful only if a forest baseline is already in the pipeline.
- **Integration path:** Drop-in alternative to the random-forest benchmark in `ml-estimator.ts`; no separate ladder treatment.

#### Gradient Boosting Machine — XGBoost (Extreme Gradient Boosting)
- **One-line:** Sequential boosting of shallow trees with second-order gradient optimization and strong regularization; the dominant tabular ML method.
- **How it works:** Fits each new tree to the gradient (and Hessian) of the loss w.r.t. current predictions, adding trees that correct residual errors; L1/L2 leaf penalties, shrinkage (learning rate), column/row subsampling, and early stopping control overfitting.
- **Where it's proven:** The winningest algorithm on tabular Kaggle competitions and the de facto standard for structured sports/betting models.
- **GSE relevance: PILOT.** The most credible path to beating elastic-net on margin/total/cover — but it is a black box that *must* be wrapped in SHAP + the honesty gate, and it overfits small NFL samples eagerly without aggressive regularization and out-of-sample discipline. The brief already names a GBM scaffold; this is its concrete realization.
- **Integration path:** The estimator behind `ml-estimator.ts`'s gradient-boosting scaffold; the "honesty gate" enforces that predictions can't exceed evidence; TreeSHAP feeds `/explain` + `/audit`; ladder entry is shadow → Model Court (prosecution stresses overfit, falsifier checks SHAP signs vs football reality, out-of-sample on a held-out season) → priced only on n≥100 + non-worsening ECE.

#### LightGBM (Light Gradient Boosting Machine; histogram/leaf-wise GBDT)
- **One-line:** A fast, memory-light gradient-boosting implementation using histogram binning and leaf-wise tree growth.
- **How it works:** Buckets continuous features into histograms to speed split-finding, grows trees leaf-wise (best-gain leaf first) for higher accuracy per tree, and uses gradient-based one-side sampling. Same boosting math as XGBoost, engineered for speed.
- **Where it's proven:** Production tabular ML at scale; frequently the speed/accuracy leader on structured data.
- **GSE relevance: PILOT (preferred GBM implementation).** Same modeling verdict as XGBoost but faster to iterate, and — crucially — supports native **quantile** and custom objectives, which is the cleanest route to probabilistic output without a separate library. Leaf-wise growth overfits small data faster, so depth/leaf caps are mandatory.
- **Integration path:** The concrete engine inside `ml-estimator.ts`; run a `quantile` objective at multiple α to emit a predictive *interval* rather than a point, which slots directly into GSE's interval-and-proof aesthetic. Ladder treatment identical to XGBoost above.

#### CatBoost (Categorical Boosting)
- **One-line:** A gradient-boosting library with built-in ordered target encoding for categorical features and symmetric (oblivious) trees.
- **How it works:** Uses "ordered boosting" and ordered target statistics to encode categoricals without target leakage, and grows balanced oblivious trees that act as fast, regularized base learners. Strong out-of-the-box with minimal tuning.
- **Where it's proven:** Tabular problems heavy in categorical features (teams, venues, weather buckets, personnel groupings).
- **GSE relevance: PILOT.** Genuinely attractive for football because so many GSE features are categorical (team, opponent, surface, dome/outdoor, division-game). Its leakage-safe encoding is a data-snooping safeguard that aligns with the brand's discipline.
- **Integration path:** Alternative `ml-estimator.ts` backend evaluated head-to-head with LightGBM in the same Model Court bracket; whichever out-of-samples better on a held-out season advances.

#### NGBoost (Natural Gradient Boosting for Probabilistic Prediction)
- **One-line:** Gradient boosting that predicts the *parameters of a full probability distribution* (not a point), trained with the natural gradient of a proper scoring rule.
- **How it works:** Treats the conditional distribution's parameters (e.g., μ and σ of a Gaussian) as boosting targets, updating base learners along the natural gradient of a proper score (NLL or CRPS) so the whole predictive distribution is fit at once. Benchmarks slightly beat LightGBM and it is noted as particularly strong on *small* datasets.
- **Where it's proven:** Probabilistic regression in insurance, finance, and healthcare where calibrated uncertainty matters more than a point estimate; specifically validated as strong on smaller samples.
- **GSE relevance: PILOT (top probabilistic candidate).** This is arguably the single best-fit "advanced" estimator for GSE: it outputs a *distribution* (so you get a fair line *and* an honest interval), it's competitive on the small samples GSE is stuck with, and a proper scoring rule (CRPS) is exactly the kind of falsifiable, calibration-native objective Model Court respects. Still a tree black box, so SHAP wrap remains mandatory.
- **Integration path:** A probabilistic head in `ml-estimator.ts` emitting (μ, σ) → fair line + interval into `edge-engine.ts`; CRPS/NLL on settled samples is a built-in honesty metric; the predictive interval becomes public proof on `/audit`. Ladder: shadow → Model Court (CRPS out-of-sample, no ECE regression) → priced.

#### Explicit-quantile GBM (quantile-regression gradient boosting; pinball-loss boosting)
- **One-line:** Gradient boosting trained on the pinball (quantile) loss at several quantile levels to produce a prediction interval directly.
- **How it works:** Fits separate (or multi-output) boosters minimizing the asymmetric pinball loss at e.g. the 10th/50th/90th percentiles; stacking the quantile predictions yields an empirical predictive interval without distributional assumptions.
- **Where it's proven:** Energy/demand forecasting and any setting needing distribution-free intervals from trees (a staple of forecasting competitions).
- **GSE relevance: PILOT.** A lighter-weight alternative to NGBoost that reaches the same goal — intervals, not points — using only LightGBM/XGBoost you already chose. Distribution-free is a plus for an audit-first brand that dislikes unjustified Gaussian assumptions.
- **Integration path:** Multi-α quantile objective inside the same `ml-estimator.ts` GBM; pair with conformal calibration (below) so the published interval has a *coverage guarantee*. Ladder treatment as for the GBM.

#### AdaBoost (Adaptive Boosting)
- **One-line:** The original boosting algorithm: reweight misclassified examples each round and combine weak learners by weighted vote.
- **How it works:** After each weak learner, increases weights on misclassified points so the next learner focuses on them; final prediction is a weighted sum where better learners get more say. Exponential-loss boosting.
- **Where it's proven:** Historically important; largely superseded by gradient boosting on tabular data, still seen in simple pipelines.
- **GSE relevance: REFERENCE.** No reason to choose AdaBoost over modern GBMs for GSE — it's more sensitive to noisy/outlier games (heavy weighting on hard examples is dangerous in a high-variance sport). Catalog it for completeness, don't ship it.
- **Integration path:** None planned; conceptual ancestor only.

### Kernel & instance methods

#### Support Vector Machine / Support Vector Regression (SVM / SVR; max-margin / kernel machines)
- **One-line:** Finds the maximum-margin separating boundary (or ε-tube for regression), optionally lifted into high-dimensional kernel space.
- **How it works:** Maximizes the margin between classes subject to slack for errors; the kernel trick (RBF, polynomial) lets it fit nonlinear boundaries without explicit feature expansion. SVR fits a function within an ε-insensitive tube.
- **Where it's proven:** Strong on medium-sized, high-dimensional problems (text, bioinformatics); a classic ML baseline.
- **GSE relevance: REFERENCE.** Poor fit for GSE: it doesn't natively output calibrated probabilities (needs Platt scaling bolted on), kernel SVMs are opaque for `/explain`, and trees beat it on tabular sports data. The disqualifier is explainability + no native probability.
- **Integration path:** None; mentioned only as a baseline some betting papers cite.

#### k-Nearest Neighbors (k-NN; instance-based / lazy learning)
- **One-line:** Predicts from the labels of the k closest training examples in feature space.
- **How it works:** Stores all training data; at prediction time finds the k nearest points by a distance metric and averages/votes their outcomes. No training phase; the model *is* the data.
- **Where it's proven:** Simple baselines, recommendation, and "comparable-situations" style reasoning.
- **GSE relevance: REFERENCE (one narrow exception).** As a predictor it's weak, curse-of-dimensionality-prone, and slow. But the *concept* — "show me the most similar historical games" — is a compelling **explainability/UX** device for `/explain` ("this matchup most resembles these 5 prior games").
- **Integration path:** Not an estimator; a possible "comparable games" widget on `/explain` that retrieves nearest historical matchups for narrative context, never wired to a price.

#### Naive Bayes (Gaussian/Bernoulli/Multinomial NB)
- **One-line:** A probabilistic classifier applying Bayes' rule under the (naive) assumption that features are conditionally independent given the class.
- **How it works:** Estimates each feature's class-conditional likelihood independently and multiplies them with the class prior; despite the unrealistic independence assumption it often classifies well and is extremely fast/cheap.
- **Where it's proven:** Text classification, spam, and as a fast probabilistic baseline.
- **GSE relevance: REFERENCE.** The independence assumption is badly violated by correlated football features, so probabilities are poorly calibrated — and calibration is GSE's whole religion. Regularized logistic regression dominates it for the same cost.
- **Integration path:** None; baseline mention only.

### Neural sequence / time-series

> **Blanket caveat for this whole section:** these methods are built for long, dense time series (thousands of regularly sampled steps). NFL game-level data is the opposite — ~272 games/season, irregular, regime-shifting (rule changes, roster churn). On an audit-first surface they are also near-impossible to `/explain`. For GSE the entire deep-sequence family is **SKIP-for-now / REFERENCE**, not because the architectures are weak but because the data shape and explainability bar disqualify them. They become relevant only if/when GSE has play-by-play tracking at scale *and* a separate research budget. Listed individually for completeness and correct naming.

#### Multilayer Perceptron (MLP; feedforward neural network; fully-connected net)
- **One-line:** Stacked layers of weighted sums + nonlinear activations trained by backpropagation; the basic neural network.
- **How it works:** Each layer applies W·x+b then a nonlinearity (ReLU); gradients of the loss flow backward to update weights via SGD/Adam. Universal function approximator given enough width/depth and data.
- **Where it's proven:** Tabular deep learning (often *loses* to GBMs there), and as components of larger nets.
- **GSE relevance: REFERENCE.** On GSE's sample size an MLP overfits and underperforms elastic-net/GBM while being far less explainable. No production case until data volume changes.
- **Integration path:** None near-term; conceptual baseline.

#### Recurrent Neural Network / LSTM / GRU (RNN; Long Short-Term Memory; Gated Recurrent Unit)
- **One-line:** Neural nets with hidden state that carry information across sequence steps; LSTM/GRU add gates to learn long-range dependencies.
- **How it works:** Process a sequence step by step, updating a hidden state; LSTM/GRU gates control what to remember/forget, mitigating vanishing gradients so longer histories matter. Trained by backprop-through-time.
- **Where it's proven:** Speech, language (pre-transformer), and dense sensor/financial time series.
- **GSE relevance: SKIP-for-now.** Extremely data-hungry, opaque, and pointless on ~272-game seasons. Disqualifier: sample size + explainability.
- **Integration path:** None.

#### Temporal Convolutional Network (TCN; dilated causal CNN for sequences)
- **One-line:** A 1-D convolutional net with dilations and causal padding that models sequences with a wide receptive field and no recurrence.
- **How it works:** Stacked dilated causal convolutions expand the receptive field exponentially with depth, capturing long-range patterns while training in parallel (unlike RNNs). Residual connections stabilize depth.
- **Where it's proven:** Dense time-series forecasting where it often matches/beats LSTMs.
- **GSE relevance: SKIP-for-now.** Same disqualifier as RNNs — needs long dense series GSE doesn't have.
- **Integration path:** None.

#### Temporal Fusion Transformer (TFT)
- **One-line:** An attention-based multi-horizon forecaster combining an LSTM encoder, multi-head attention, and variable-selection networks — with built-in interpretability.
- **How it works:** Uses an LSTM encoder + interpretable multi-head attention decoder, gating, and per-feature variable-selection weights to forecast multiple horizons while exposing which inputs and time steps mattered. Handles static + known-future + observed covariates.
- **Where it's proven:** Multi-horizon demand/energy/retail forecasting with many covariates and panels of related series.
- **GSE relevance: SKIP-for-now (most-interesting-of-the-family).** TFT's variable-selection/attention *is* more interpretable than peers and its covariate handling fits sports features — but it still needs panel-scale data and is heavy to defend in Model Court. Flag as the *first* deep model to revisit if GSE ever reaches multi-season, multi-market panel scale.
- **Integration path:** None near-term; earmarked as the deep-learning re-evaluation candidate post-scale.

#### N-BEATS (Neural Basis Expansion Analysis for Time Series)
- **One-line:** A pure deep-MLP forecaster using doubly-residual stacks of fully-connected blocks with backcast/forecast basis expansion.
- **How it works:** Stacks of FC blocks each output a backcast (to subtract from input) and a forecast (to accumulate), via doubly-residual links; optional trend/seasonality basis functions add interpretability. No recurrence or attention.
- **Where it's proven:** Won/topped M-competition-style univariate benchmarks; strong general univariate forecaster.
- **GSE relevance: SKIP-for-now.** Univariate and data-hungry; ignores GSE's rich cross-sectional features. Disqualifier: wrong data shape + sample size.
- **Integration path:** None.

#### N-HiTS (Neural Hierarchical Interpolation for Time Series)
- **One-line:** An N-BEATS successor adding multi-rate sampling and hierarchical interpolation for efficient long-horizon forecasts.
- **How it works:** Builds on N-BEATS with multi-rate signal sampling and hierarchical interpolation so different stacks specialize in different frequencies, cutting parameters and improving long horizons.
- **Where it's proven:** Long-horizon univariate/low-covariate forecasting benchmarks.
- **GSE relevance: SKIP-for-now.** Same as N-BEATS.
- **Integration path:** None.

#### DeepAR (Autoregressive RNN, probabilistic)
- **One-line:** An autoregressive LSTM that outputs the parameters of a probability distribution per step, trained across many related series.
- **How it works:** An RNN emits, at each step, the parameters of a chosen likelihood (e.g., negative-binomial); sampling forward yields probabilistic forecasts. Learns a global model across many related time series.
- **Where it's proven:** Retail/demand probabilistic forecasting at scale (Amazon); popularized scalable probabilistic forecasting.
- **GSE relevance: SKIP-for-now.** Probabilistic (a plus) but needs *many related series* and long histories — wrong regime for game-level NFL.
- **Integration path:** None.

#### Informer / Autoformer (efficient long-sequence transformers)
- **One-line:** Transformer variants engineered for long-sequence forecasting via sparse attention (Informer) or auto-correlation/decomposition (Autoformer).
- **How it works:** Informer uses ProbSparse attention to cut quadratic cost; Autoformer replaces dot-product attention with an auto-correlation mechanism and series decomposition for trend/seasonality. Both target very long input/output horizons.
- **Where it's proven:** Long-horizon energy/weather/traffic forecasting benchmarks.
- **GSE relevance: SKIP-for-now.** Built for long horizons GSE doesn't forecast and data scale GSE doesn't have.
- **Integration path:** None.

#### PatchTST (Patch Time Series Transformer)
- **One-line:** A transformer that segments each univariate series into patches used as tokens, with channel-independence.
- **How it works:** Splits each series into (overlapping) patches that become tokens, slashing attention cost and improving long-range modeling; treats channels independently. Notably, *fine-tuned* PatchTST still beats zero-shot foundation models on some benchmarks.
- **Where it's proven:** Long-horizon multivariate forecasting benchmarks (current strong transformer baseline).
- **GSE relevance: SKIP-for-now.** Strong where data is abundant and long; not GSE's regime.
- **Integration path:** None.

#### TimesNet (2-D-variation modeling for time series)
- **One-line:** Reshapes 1-D series into 2-D tensors by period to capture intra- and inter-period variation with vision-style backbones.
- **How it works:** Detects dominant periods via FFT, folds the series into 2-D maps per period, and applies inception-style 2-D convolutions to model both within-period and across-period structure.
- **Where it's proven:** General time-series benchmarks (forecasting, imputation, classification).
- **GSE relevance: SKIP.** Period-folding assumes strong periodicity GSE's irregular game schedule lacks.
- **Integration path:** None.

#### Foundation time-series models — TimeGPT / Chronos / Moirai / TimesFM (pretrained / zero-shot forecasters)
- **One-line:** Large pretrained transformer models that forecast new series zero-shot, treating time series like a language to be continued.
- **How it works:** Chronos quantizes values into tokens and trains a T5-style LM on time-series "text"; TimesFM is a decoder-only transformer on continuous inputs; Moirai is a masked-encoder transformer trained on a large multi-domain corpus with any-variate attention; TimeGPT is a hosted pretrained forecaster. They forecast unseen series without task-specific training — though evidence shows zero-shot does *not* universally beat fine-tuned specialists.
- **Where it's proven:** General-purpose forecasting as a strong zero-shot baseline across many domains; rapidly maturing.
- **GSE relevance: SKIP-for-now (watch).** Tempting because "zero-shot, no training data needed" seems to dodge the sample-size problem — but they're built for continuation of dense series, output is opaque (fatal on `/explain`), and they have no notion of GSE's structured market/edge features. Disqualifier: explainability + wrong task framing. Worth a *watching brief* as a sanity-check oracle, never a published estimator.
- **Integration path:** None in the gated ladder; at most an offline curiosity benchmark to see whether a generic continuation of a team's scoring series disagrees wildly with the engine (a soft data-QA signal), strictly internal.

### Spatial / graph

#### Convolutional Neural Network on tracking data (CNN; spatial conv nets)
- **One-line:** Vision-style convolutional nets applied to spatial field representations (player positions, coverage heatmaps).
- **How it works:** Learnable convolution filters detect local spatial patterns across an image-like grid (e.g., a rasterized field state), pooled and stacked into higher-level spatial features for a downstream prediction.
- **Where it's proven:** Player-tracking analytics (NFL Next Gen Stats, soccer event models) where high-frequency positional data exists.
- **GSE relevance: SKIP (hard disqualifier).** Requires player-tracking data GSE has **no rights to** and cannot legally/contractually source at this stage; also extreme data needs and opacity. This is the cleanest "do not chase" in the catalog.
- **Integration path:** None unless a licensed tracking-data deal materializes — explicitly out of scope.

#### Graph Neural Networks (GNN; GCN / GraphSAGE / GAT)
- **One-line:** Neural nets that operate on graph-structured data by passing/aggregating messages between connected nodes.
- **How it works:** Each node updates its embedding by aggregating neighbors' features (mean/attention/sampling), stacked over layers so information propagates across the graph; used to model entities-and-relations (players, teams, matchups as a network).
- **Where it's proven:** Recommendation, molecular property prediction, fraud rings, social/interaction networks; emerging in spatio-temporal sports models.
- **GSE relevance: SKIP-for-now.** Conceptually elegant for team/player interaction graphs, but extremely data-hungry, opaque, and unjustifiable in Model Court at GSE's scale. The *idea* of matchup-as-graph can inform feature engineering without the neural machinery.
- **Integration path:** None as a model; graph *thinking* may inform hand-built interaction features for the additive score.

### Representation learning

#### Player / team / matchup embeddings (representation learning; learned latent vectors)
- **One-line:** Dense learned vector representations of entities (players, teams, matchups) that place similar entities near each other in latent space.
- **How it works:** Train a network (or factorization) so that an entity's vector predicts outcomes or context; the resulting embeddings encode latent style/strength and can feed downstream models or similarity search. Analogous to word embeddings for sports entities.
- **Where it's proven:** Recommendation systems, NLP, and large-scale sports models with abundant event data.
- **GSE relevance: REFERENCE.** Powerful but data-hungry and opaque (an embedding dimension has no `/explain` meaning), and it invites overfitting at GSE's scale. Hand-engineered, named features (DVOA-style) are both more explainable and more defensible.
- **Integration path:** None near-term; the explainability cost is disqualifying for an audit-first brand until data scale and a separate research track exist.

### Reinforcement learning & bandits

#### Contextual bandits / Reinforcement Learning (multi-armed/contextual bandits; RL for staking & exploration)
- **One-line:** Online decision algorithms that learn which *action* (which bet to surface, how much to stake) maximizes long-run reward while balancing exploration and exploitation.
- **How it works:** A bandit picks actions given context, observes reward, and updates a policy (Thompson sampling / UCB / policy gradients) to favor high-reward actions while still exploring uncertain ones; full RL adds sequential state/credit assignment.
- **Where it's proven:** Ad selection, recommendation, dynamic pricing, and bankroll/staking research in quantitative betting.
- **GSE relevance: SHADOW (simulation only) / PILOT-later.** This is a *staking/exploration* tool, not a prediction model — it could optimize which priced picks to feature or how to size, but it is data-hungry, can drift into reward-hacking, and is hard to explain. It must never touch the prediction estimate; keep it in simulation against settled history until a clear, auditable win emerges. Brand-safety note: anything that looks like automated stake-sizing advice is sensitive and must respect the same linters as the rest of the platform.
- **Integration path:** A separate, *offline* policy-simulation module evaluated on the settled-bet ledger — never wired to `ml-estimator.ts` or pricing; if it ever surfaces, it's a curation/ordering layer that itself must pass a falsifier (does it beat naive "show highest GSE Score"?).

### AutoML & hyperparameter optimization

#### AutoML / Hyperparameter Optimization (HPO; Optuna / Bayesian optimization / random & grid search)
- **One-line:** Automated search over models and/or hyperparameters to find good configurations without manual tuning.
- **How it works:** Defines a search space and an objective (CV score); strategies range from grid/random search to Bayesian optimization (model the objective, sample promising configs) and Hyperband (early-stop bad trials). AutoML extends this to pipeline/model selection.
- **Where it's proven:** Standard tooling across all applied ML.
- **GSE relevance: REFERENCE (tooling, with a warning).** Use HPO *narrowly* to tune the chosen GBM/elastic-net — but unconstrained AutoML is a **data-snooping hazard** for a small team: searching thousands of configs against the same backtest manufactures overfit. Cap trials, use nested CV, and treat the search itself as a Model Court exhibit.
- **Integration path:** A disciplined Optuna sweep in the model-dev pipeline for `ml-estimator.ts` candidates, with the search budget and validation protocol logged for audit; never an "AutoML picks the model for us" black box.

### Ensembling & meta-learning

#### Bagging (Bootstrap Aggregating)
- **One-line:** Train many models on bootstrap resamples and average them to reduce variance.
- **How it works:** Resample the training set with replacement, fit a model on each, and average/vote; works best with high-variance, low-bias learners (deep trees → random forest).
- **Where it's proven:** The mechanism behind random forests; universal variance-reduction technique.
- **GSE relevance: PILOT (as part of forests).** Sound and safe; relevant chiefly through the random-forest benchmark rather than as a standalone choice.
- **Integration path:** Implicit in the forest baseline in `ml-estimator.ts`.

#### Boosting (sequential ensembling)
- **One-line:** Sequentially add weak learners that each correct the current ensemble's errors.
- **How it works:** Covered above (AdaBoost, GBM family); reduces bias by focusing successive learners on residuals.
- **Where it's proven:** Dominant tabular approach.
- **GSE relevance: PILOT.** The GSE ML play *is* a boosting play — see the GBM entries.
- **Integration path:** `ml-estimator.ts` GBM core.

#### Stacking / blending / Super Learner (stacked generalization)
- **One-line:** Combine multiple diverse base models via a meta-model trained on their out-of-fold predictions.
- **How it works:** Generate cross-validated (out-of-fold) predictions from each base learner, then train a meta-learner (often regularized linear) to weight them; the Super Learner is the theoretically-grounded version that's asymptotically as good as the best combination. Blending uses a holdout instead of full CV.
- **Where it's proven:** Kaggle-winning ensembles and clinical/biostatistics prediction (Super Learner).
- **GSE relevance: PILOT (with restraint).** Stacking elastic-net + a GBM + maybe a forest, with a *regularized linear meta-model*, is a defensible way to get robustness — and a regularized meta-learner keeps it explainable-ish (you can show the base-model weights). But every added base model multiplies overfitting and audit surface; keep the stack small and the meta-model interpretable.
- **Integration path:** A `super-learner` orchestration over `ml-estimator.ts` base heads with a regularized-logistic meta-model; the meta-weights themselves become an `/explain`/`/audit` artifact; ladder entry only after the *stack* (not just a base learner) beats elastic-net out-of-sample in Model Court.

### Calibration & uncertainty (the highest-leverage imports)

#### Platt scaling (sigmoid calibration; logistic calibration)
- **One-line:** Post-hoc calibration that fits a logistic curve mapping a model's raw scores to calibrated probabilities.
- **How it works:** Fit a 1-parameter (slope/intercept) logistic regression on a held-out calibration set from scores→outcomes; best when miscalibration is sigmoid-shaped, and low-overfit-risk so it suits *small* datasets.
- **Where it's proven:** Standard for calibrating SVMs, boosted trees, and neural nets on modest data.
- **GSE relevance: ADOPT-NOW.** A small-sample-safe complement to the isotonic stage GSE already runs — useful precisely where n is too small for isotonic to behave. Pure post-processing, fully auditable, increases trust.
- **Integration path:** A selectable calibrator in `probability-calibration.ts` (alongside isotonic/PAVA), auto-chosen by sample size; reliability curve + Brier reported on `/audit`. Gated by the same n≥100 / non-worsening-ECE rule.

#### Isotonic regression / PAVA (Pool-Adjacent-Violators; nonparametric calibration)
- **One-line:** Non-parametric calibration fitting a monotone step function from raw scores to calibrated probabilities.
- **How it works:** The Pool-Adjacent-Violators Algorithm finds the best non-decreasing piecewise-constant map; flexible but prone to overfit at small n (hence GSE's n≥100 gate).
- **Where it's proven:** The standard "lots of data" calibrator; *already in GSE production*.
- **GSE relevance: ADOPT-NOW (already shipped).** This is GSE's incumbent; the catalog confirms it's the right primary calibrator above n≈100 and that Platt/beta should backstop it below that.
- **Integration path:** `probability-calibration.ts` (live). Keep; add small-n fallbacks.

#### Beta calibration
- **One-line:** A parametric calibrator generalizing Platt scaling to allow asymmetric stretching of the sigmoid.
- **How it works:** Fits a beta-distribution-based link (more parameters than Platt, fewer-overfit-risk than isotonic) so different probability regions can be corrected asymmetrically; parametric, so small-data-friendlier than isotonic.
- **Where it's proven:** A robust middle ground between Platt and isotonic in the calibration literature.
- **GSE relevance: ADOPT-NOW.** Fills the exact gap between Platt (too rigid) and isotonic (overfits small n) — valuable for GSE's chronic small-sample regime while staying parametric and auditable.
- **Integration path:** Third option in `probability-calibration.ts`; choose by validation NLL/ECE on the calibration split.

#### Temperature scaling
- **One-line:** A single-parameter calibrator that divides logits by a learned temperature T before softmax/sigmoid.
- **How it works:** Optimizes one scalar T on a validation set to soften/sharpen probabilities without changing the argmax; the most parsimonious calibrator, tailored to neural nets.
- **Where it's proven:** The default modern-neural-net calibrator.
- **GSE relevance: ADOPT-NOW (only if a neural/logit model ever ships).** Trivial, single-parameter, fully auditable. Low priority because GSE has no neural model now, but it's the right tool the moment any logit-producing model appears.
- **Integration path:** A calibrator option in `probability-calibration.ts` reserved for any future logit-output estimator.

#### Split / Mondrian conformal prediction (inductive conformal; class/group-conditional conformal)
- **One-line:** A distribution-free wrapper that turns any model into one producing prediction sets/intervals with a guaranteed coverage rate under only the exchangeability assumption.
- **How it works:** Train on a proper-training split, compute non-conformity scores on a separate calibration split, and set interval width to the (1−α)-quantile of those scores — guaranteeing ~(1−α) coverage in finite samples, model-agnostic and assumption-light. **Mondrian** conformal conditions the calibration by group (e.g., per sport, per market, per favorite/dog) so each group gets its own valid coverage.
- **Where it's proven:** Distribution-free uncertainty across regression/classification; increasingly the standard way to attach *honest* intervals to ML predictions.
- **GSE relevance: ADOPT-NOW (the standout import of this whole catalog).** This is tailor-made for a proof-first brand: it gives *guaranteed-coverage* intervals on top of whatever estimator GSE ships, with no distributional assumptions, validated in finite samples — exactly the kind of provable claim that belongs on `/audit` next to Wilson intervals and CLV. Mondrian's per-group validity lets GSE honestly say "our 80% intervals cover 80% of the time *within each market type*." Low data needs, high explainability, *increases* trust.
- **Integration path:** A `conformal.ts` post-layer wrapping any `ml-estimator.ts` output (point or quantile) → publishes coverage-guaranteed intervals to `/audit`; Mondrian binning by sport/market reported as a coverage table. Because it's a *guarantee*, not a new signal, it can ship as proof immediately and strengthens the case for flipping the underlying estimator `priced=false→priced`.

### Explainability

#### SHAP / TreeSHAP (SHapley Additive exPlanations)
- **One-line:** A game-theoretic method that attributes each prediction to its features via Shapley values, with an exact fast algorithm for trees.
- **How it works:** Computes each feature's average marginal contribution to a prediction across all feature orderings (Shapley value); TreeSHAP computes this exactly and efficiently for tree ensembles. Yields per-prediction, additive, signed feature attributions that sum to the output.
- **Where it's proven:** The de facto standard for explaining tree/GBM models across finance, healthcare, and ML generally.
- **GSE relevance: ADOPT-NOW (mandatory companion to any GBM).** SHAP is the *price of admission* for shipping any tree model on an explainability-first platform: it turns a black-box GBM into per-pick, signed, additive reasons that map naturally onto GSE's additive-confidence framing and the `/explain` surface. No GBM should pass Model Court without its SHAP story.
- **Integration path:** A required output of `ml-estimator.ts` whenever a tree model runs → per-pick SHAP attributions rendered on `/explain`; global SHAP summaries become the Model Court "falsifier" exhibit (do top features make football sense?); SHAP is what makes flipping a GBM to `priced` defensible.

#### Permutation importance / LIME / partial dependence (complementary explainers)
- **One-line:** Model-agnostic explainers: permutation importance ranks features by accuracy drop when shuffled; LIME fits a local surrogate; PDP/ICE plot marginal effects.
- **How it works:** Permutation importance measures performance loss when a feature is randomized; LIME perturbs an input and fits a simple local model; partial-dependence/ICE average or trace the model's output as one feature varies.
- **Where it's proven:** Standard model-agnostic explainability toolkit.
- **GSE relevance: REFERENCE (use SHAP as primary).** Useful cross-checks, but SHAP subsumes most of their value with stronger theory; PDP/ICE can help a public methodology page show "how confidence responds to the line."
- **Integration path:** Optional secondary explainers in the model-dev pipeline and `/methodology` visuals; SHAP remains the canonical `/explain` source.

### Learning paradigms (cross-cutting)

#### Online / incremental learning (streaming / out-of-core learning)
- **One-line:** Models updated continuously as new data arrives, one example or mini-batch at a time, rather than retrained from scratch.
- **How it works:** Parameters are nudged by each new observation (SGD-style) so the model tracks a changing world; includes warm-start retraining and true streaming learners.
- **Where it's proven:** High-velocity domains (ads, fraud, markets) and any nonstationary setting.
- **GSE relevance: REFERENCE / PILOT-later.** Conceptually right for a sport that drifts week to week — but live online updates are *dangerous* for an auditable brand because the model that made a published pick changes underneath it. GSE's discipline (versioned, gated weights via Model Court) is the deliberate *opposite* of silent online updates. Prefer scheduled, versioned retrains.
- **Integration path:** Not live online learning; instead a cadenced retrain of `ml-estimator.ts` with an explicit `model_version` bump per the engine-versioning policy — preserving the auditability the brand requires.

#### Transfer learning across sports (cross-domain / multi-task learning)
- **One-line:** Reuse a model or representation trained on one sport/market to bootstrap another with less data.
- **How it works:** Pretrain on a data-rich source (e.g., NFL) and fine-tune on a data-poor target (e.g., a niche market), or share parameters across tasks so they regularize each other.
- **Where it's proven:** NLP/vision; emerging in multi-sport modeling.
- **GSE relevance: REFERENCE.** Tempting for the MLB/NHL roadmap, but sports differ enough that naive transfer risks importing wrong structure, and it's hard to explain *why* an NHL pick leans on NFL-learned weights. Safer to build each sport's gated ladder independently and share only *methodology*, not learned parameters.
- **Integration path:** None as learned-weight transfer; the *process* (ladder, calibration, Model Court) transfers across sports, the parameters do not.

#### Anomaly detection (outlier detection; Isolation Forest / robust z-score / change-point detection)
- **One-line:** Unsupervised methods that flag data points or moments that deviate sharply from normal patterns.
- **How it works:** Isolation Forest randomly partitions data and flags points that isolate quickly; robust statistics (median/MAD z-scores) flag outliers; change-point/CUSUM methods detect regime shifts in a stream (e.g., a sudden line move = "steam").
- **Where it's proven:** Fraud, monitoring, and market-microstructure "unusual activity" detection.
- **GSE relevance: PILOT (two concrete, safe uses).** Not a prediction model but a **data-quality and steam-detection** workhorse: (1) flag bad/stale feed values before they poison the engine (directly serves the "no stale data" rule), and (2) detect sharp line moves / steam in the market read. Both are explainable ("this value is k MADs from normal") and low-risk.
- **Integration path:** An `anomaly.ts` guard in the data-ingestion path (rejects/flags outlier feed values, feeding the freshness/validation layer) and a steam detector inside the market-read pipeline alongside Shin de-vig/consensus; flagged anomalies surface on `/audit` as data-integrity notes, never as picks.

### LLM-assisted

#### Large Language Models for narrative & feature extraction (LLMs; Claude — already in use, narrative only)
- **One-line:** Transformer language models used to generate written analysis or to extract structured features from unstructured text (injury reports, news, weather notes).
- **How it works:** Pretrained on vast text, an LLM generates fluent prose or, prompted/structured-output, parses unstructured inputs into structured signals (e.g., "questionable RB" → an availability feature). GSE already uses Claude strictly for narrative, never for picks.
- **Where it's proven:** Content generation universally; information extraction increasingly reliable with structured prompting and validation.
- **GSE relevance: REFERENCE (extraction) / current (narrative).** Keep the hard line: LLMs **never** produce a pick or probability (the brand's integrity depends on it). The one *new* defensible role is **feature extraction** — turning injury/news text into structured, *verifiable* features that then feed the deterministic engine — but only with human/rule validation, because an LLM hallucinating an injury status would be a data-integrity breach. Treat any extracted feature as untrusted until validated.
- **Integration path:** Narrative stays where it is. For extraction: an LLM step that proposes structured features into the ingestion layer, *each gated by validation/anomaly checks* before reaching `ml-estimator.ts`; provenance logged so `/audit` can show a feature was LLM-extracted-then-verified. The LLM never touches confidence, edge, or pricing.

### Recommended adoption sequence for GSE (ML/AI, tied to the proof ladder)

1. **Now, as proof (no ladder gate needed) — Calibration suite + Conformal prediction.** Extend `probability-calibration.ts` with Platt/beta/temperature as small-n backstops to the live isotonic stage, and add **split/Mondrian conformal** intervals as guaranteed-coverage proof on `/audit`. These *raise* trust and ship immediately because they're post-processing/guarantees, not new signals.
2. **Now, as benchmark — Elastic-Net logistic + Lasso feature selection.** Stand up the honest linear floor in `ml-estimator.ts` as the benchmark every later model must beat, and use lasso to justify the feature set in Model Court. Run in shadow → flip its calibrated probability to `priced` only after n≥100 + non-worsening ECE.
3. **Pilot — Probabilistic GBM (NGBoost or quantile-LightGBM) + mandatory SHAP.** The one real "advanced" play: distribution/interval output, competitive at small n, wrapped in SHAP for `/explain` and the honesty gate for evidence-bounding. Path: shadow → Model Court (CRPS/Brier out-of-sample on a held-out season, SHAP-as-falsifier, no ECE regression, owner sign-off) → flip `priced=false→priced`. Must beat elastic-net out-of-sample or it doesn't ship.
4. **Pilot, in the data layer — Anomaly detection.** `anomaly.ts` for feed data-QA + steam detection; low-risk, explainable, directly serves "no stale data."
5. **Pilot, with restraint — small Super-Learner stack** (elastic-net + GBM, regularized-linear meta) only after both base models are proven, to buy robustness without exploding the audit surface.
6. **Shadow / simulation only — contextual bandits** for staking/curation, evaluated offline on the settled ledger, never wired to the estimate or to pricing.

This sequence respects the "one ladder": every *signal* that affects a price (linear logit, GBM) goes shadow → Model Court → priced on the same milestones (PROVEN at n≥100 + calibration; ESTABLISHED at n≥500 + CLV≥52.4%; AUTHORITY at n≥2000 + CLV≥55%), while *proof and data-QA* layers (calibration, conformal, anomaly, SHAP) ship alongside as trust infrastructure.

### What a proof-first small team should NOT chase yet (and why)

- **Deep sequence/TS models — RNN/LSTM/GRU, TCN, TFT, N-BEATS/N-HiTS, DeepAR, Informer/Autoformer, PatchTST, TimesNet, and foundation models (TimeGPT/Chronos/Moirai/TimesFM).** Built for long, dense, regularly-sampled series; NFL game-level data is ~272 games/season, irregular, and regime-shifting. They overfit catastrophically at this scale and are effectively unexplainable on an `/explain`/`/audit` surface — the brand's core promise. *(TFT is the one to revisit first if GSE ever reaches multi-season, multi-market panel scale.)*
- **CNNs on player-tracking data.** Hard disqualifier: GSE has no rights to the tracking data these require. Out of scope until a licensed data deal exists.
- **Graph neural networks & learned embeddings.** Elegant for matchup-as-network and latent player strength, but extreme data needs and zero `/explain` meaning (an embedding dimension can't be defended in Model Court). Let graph/embedding *thinking* inform hand-built, named features instead.
- **Unconstrained AutoML.** A data-snooping trap for a small team — searching thousands of configs against one backtest manufactures overfit. Use *narrow, budgeted, nested-CV* HPO on the chosen model and log the search as an audit exhibit; never let AutoML pick the model.
- **Live online learning.** Silent parameter drift under already-published picks breaks auditability. GSE's versioned, gated, Model-Court-reviewed retrains are the deliberate opposite — keep them.
- **LLMs anywhere near picks.** Narrative only, forever. Even feature *extraction* must be treated as untrusted-until-validated, because a hallucinated injury status is a data-integrity breach for a brand whose entire value is "no fabricated data."

The throughline: for GSE, the constraint is never raw predictive power — it's *defensibility at small sample size on an audit-first surface.* The boosted-tree-plus-conformal-plus-SHAP stack maximizes power *inside* that constraint; nearly everything in deep learning maximizes power by violating it.

---

## Part 4 — Market-based, judgmental, simulation, ensemble & calibration methods (54)

*Prepared for: Galaxy Sports Edge (GSE) — Research wing, executive advisory panel. Scope: Every major forecasting methodology in the market/crowd/ensemble/simulation/calibration families, named precisely, mechanism described, and rated against GSE's gated proof ladder. Date: 2026-06-23.*

### 0. Orientation

This is GSE's **home turf**. GSE is not a "build-a-model-and-hope" shop — its core edge is already market-based: it reads the betting market (Shin de-vig, median consensus across ~7 books, a Market Gravity Index, an Edge Index of fair-vs-offered), and it grades itself on **closing line value (CLV)** — the single most defensible forecasting benchmark that exists in sports betting. The published pick is a 13-component additive confidence (0–100); the flagship **GSE Score** multiplies that confidence by a *proof* multiplier (SHA-256 receipt + Merkle slate commitment + canonical/fresh data). That makes GSE a **market-first, proof-first** operation, and it changes the relevance math: methods that *cross-check the market read*, *combine multiple market signals*, *score probability quality*, or *enforce honest backtests* are not exotic add-ons here — several are genuine **ADOPT-NOW**.

The catalog is organized into six sections: **Market read & de-vig**, **Crowd & judgmental**, **Ensemble / combination**, **Simulation**, **Bankroll bridge**, and **Calibration & backtest discipline**. Each method gets Name (+aliases), one-line definition, how it works, where it's proven, a GSE relevance rating (ADOPT-NOW / PILOT / SHADOW / REFERENCE / SKIP) tied to GSE's gates, and a concrete integration path naming the GSE surface it touches. The document closes with a recommended adoption sequence wired to the FOUNDING→PROVEN→ESTABLISHED→AUTHORITY ladder, and a "cheapest highest-leverage wins" shortlist for a market-first shop.

**Total methods cataloged: 54.**

#### Comparison table (one row per method)

| # | Method | Family | GSE rating | Touches |
|---|--------|--------|-----------|---------|
| 1 | Prediction markets (price = probability) | Market | REFERENCE | market-read.ts |
| 2 | Betting exchanges as forecasts (Betfair/Kalshi/PredictIt) | Market | PILOT | kalshi fair-value, market-read.ts |
| 3 | Pinnacle-as-truth / sharp-book anchor | Market | ADOPT-NOW | consensus.ts |
| 4 | Multiplicative (proportional) de-vig | Market | ADOPT-NOW | shin-devig.ts (cross-check) |
| 5 | Additive (equal-margin) de-vig | Market | ADOPT-NOW | shin-devig.ts (cross-check) |
| 6 | Shin de-vig (1992/93) | Market | ADOPT-NOW (in prod) | shin-devig.ts |
| 7 | Power-method de-vig | Market | PILOT | shin-devig.ts (cross-check) |
| 8 | Logit / WOC-FLB de-vig | Market | SHADOW | shin-devig.ts |
| 9 | Median / trimmed consensus across books | Market | ADOPT-NOW (in prod) | consensus.ts |
| 10 | Market Gravity Index (steam / line velocity) | Market | ADOPT-NOW (in prod) | market-read.ts |
| 11 | Reverse line movement (RLM) signal | Market | PILOT | market-read.ts |
| 12 | Sharp-vs-square / money-vs-ticket divergence | Market | SHADOW | market-read.ts |
| 13 | Steam-move detection | Market | PILOT | market-read.ts |
| 14 | Closing line value (CLV) as benchmark | Market | ADOPT-NOW (in prod) | clv.ts |
| 15 | Market efficiency / no-arbitrage | Market | REFERENCE | edge-engine.ts |
| 16 | Favourite–longshot bias modeling | Market | PILOT | shin-devig.ts, calibration |
| 17 | Edge Index (fair vs offered) | Market | ADOPT-NOW (in prod) | edge-engine.ts |
| 18 | Wisdom of crowds | Crowd | REFERENCE | consensus.ts |
| 19 | Delphi method | Crowd | SKIP | — |
| 20 | Prediction polls | Crowd | SKIP | — |
| 21 | Superforecasting / GJP | Crowd | REFERENCE | model-court |
| 22 | Brier-weighted aggregation | Crowd | PILOT | consensus.ts weighting |
| 23 | Extremizing | Crowd | SHADOW | calibration-apply.ts |
| 24 | Analyst-consensus aggregation | Crowd | SHADOW | new feature input |
| 25 | Expert elicitation | Crowd | REFERENCE | model-court |
| 26 | Structured analytic techniques (ACH etc.) | Crowd | REFERENCE | model-court |
| 27 | Simple / trimmed mean combination | Ensemble | ADOPT-NOW | consensus.ts, engine blend |
| 28 | Weighted linear pool | Ensemble | PILOT | engine blend |
| 29 | Bates–Granger combination | Ensemble | PILOT | engine blend |
| 30 | Bayesian Model Averaging (BMA) | Ensemble | SHADOW | engine blend |
| 31 | Stacking / super learner | Ensemble | PILOT | engine blend |
| 32 | Mixture of experts | Ensemble | SHADOW | engine blend |
| 33 | Logarithmic opinion pool | Ensemble | PILOT | consensus.ts (prob space) |
| 34 | Model Confidence Set (MCS) | Ensemble | REFERENCE | model-court |
| 35 | Monte Carlo simulation | Simulation | PILOT | new sim module |
| 36 | Bootstrap / block bootstrap | Simulation | ADOPT-NOW | calibration CIs, clv.ts |
| 37 | Agent-based modeling | Simulation | SKIP | — |
| 38 | Discrete-event simulation | Simulation | REFERENCE | sim module |
| 39 | Play-by-play / Markov game simulators | Simulation | PILOT | new sim module |
| 40 | Scenario / what-if analysis | Simulation | REFERENCE | cockpit |
| 41 | Kelly criterion | Bankroll | REFERENCE (in prod via ¼) | kelly.ts |
| 42 | Fractional Kelly | Bankroll | ADOPT-NOW (in prod) | kelly.ts |
| 43 | EV / edge thresholds | Bankroll | ADOPT-NOW (in prod) | edge-engine.ts |
| 44 | Risk of ruin | Bankroll | PILOT | kelly.ts, staking governor |
| 45 | Brier score | Calibration | ADOPT-NOW (in prod) | probability-calibration.ts |
| 46 | Logarithmic loss (log score) | Calibration | ADOPT-NOW | probability-calibration.ts |
| 47 | CRPS | Calibration | PILOT | probability-calibration.ts |
| 48 | Spherical score | Calibration | REFERENCE | — |
| 49 | Reliability diagram / ECE / MCE | Calibration | ADOPT-NOW (in prod) | probability-calibration.ts |
| 50 | Isotonic (PAVA) / Platt / beta / temperature | Calibration | ADOPT-NOW (PAVA in prod) | calibration-apply.ts |
| 51 | Sharpness vs calibration | Calibration | ADOPT-NOW | probability-calibration.ts |
| 52 | Murphy decomposition | Calibration | ADOPT-NOW (in prod) | probability-calibration.ts |
| 53 | Walk-forward / purged & embargoed CV / DSR | Calibration | ADOPT-NOW | model-court, backtest harness |
| 54 | Causal inference (DiD / synthetic control / uplift) | Calibration | PILOT | "did our pick move the line" |

### 1. Market read & de-vig

> GSE's strongest family. The principle: a liquid betting market is itself a forecast — the consensus price, stripped of the bookmaker's margin, is a calibrated probability that beats most stand-alone models. GSE already de-vigs with Shin, takes a multi-book median, and grades on CLV. Everything below either hardens that read or cross-checks it.

#### 1. Prediction markets (price = probability)
- **Name:** Prediction markets / information markets / event markets.
- **Definition:** Markets where a contract pays $1 if an event occurs, so the trading price is read directly as the crowd's probability of that event.
- **How it works:** Traders buy/sell binary (or scalar) contracts; market-clearing price aggregates dispersed private information into a single continuously-updated probability. Theory (Hayek price-as-information; Wolfers–Zitzewitz) says the price is an efficient aggregator; in practice a small number of skilled traders do most of the price-setting work.
- **Where it's proven:** Election forecasting, economic indicators, Oscars, corporate internal markets (HP, Google). Calibration is *domain-dependent* — strong on high-liquidity, well-defined questions; weaker on thin or manipulated markets.
- **GSE relevance:** **REFERENCE.** Conceptual foundation for why GSE trusts the market read at all; the betting market *is* a prediction market on game outcomes. Not a separate adopt because GSE already consumes a richer, sport-specific version (sportsbook lines).
- **Integration path:** Conceptual anchor for `market-read.ts`; cite in methodology page as the theoretical basis for "the market is the model."

#### 2. Betting exchanges as forecasts (Betfair / Kalshi / PredictIt)
- **Name:** Exchange-derived implied probabilities; peer-to-peer betting markets.
- **Definition:** Use the lay/back midpoint on a betting *exchange* (no bookmaker margin, just commission) as a near-vig-free probability estimate.
- **How it works:** On an exchange, users bet against each other; the matched-bet midpoint is already close to a fair probability (only commission, not a two-sided overround, sits on top). Betfair Exchange closing prices are among the sharpest public signals in soccer/racing; Kalshi (CFTC-regulated event contracts) and PredictIt provide regulated US event probabilities. Recent research (Kalshi 78% / PredictIt 93% / Polymarket 67% on resolved markets) shows accuracy varies by venue and trader mix.
- **Where it's proven:** Horse racing, soccer, tennis (Betfair); US politics/macro/novelty (Kalshi, PredictIt). GSE already lists **Kalshi exchange fair value** in R&D (`priced=false`).
- **GSE relevance:** **PILOT.** A second independent market read to triangulate against the sportsbook consensus — exactly the kind of orthogonal signal that earns its way onto the ladder via backtest. Strongest where a Kalshi/Betfair line exists for the same event.
- **Integration path:** Kalshi fair-value module already scaffolded as `priced=false`; run it **SHADOW→PILOT**, scoring its standalone CLV/Brier against the book consensus. If it adds incremental CLV out-of-sample without ECE regression, it passes **Model Court** and flips `priced=false→priced` as a consensus input in `consensus.ts`.

#### 3. Pinnacle-as-truth / sharp-book anchor
- **Name:** Pinnacle-as-truth; sharp-book reference price; "the sharpest line wins."
- **Definition:** Treat a low-margin, high-limit, sharp-friendly book's (Pinnacle, Circa) no-vig price as the best available estimate of true probability.
- **How it works:** Pinnacle runs a "winner's welcome" model — it accepts sharp action and uses it to price, so its closing line incorporates the most information at the lowest margin. De-vig that single book and you get a benchmark probability; the broader market typically converges to it by close.
- **Where it's proven:** The de-facto industry standard for "fair odds" and for CLV measurement. Buchdahl and most quant bettors anchor to Pinnacle close.
- **GSE relevance:** **ADOPT-NOW.** A sharp-book anchor inside the consensus is the cheapest accuracy upgrade in this whole document and aligns perfectly with GSE's CLV grading. Weight the sharpest available book more heavily than soft books in the consensus.
- **Integration path:** In `consensus.ts`, add a **sharpness-weighted** consensus variant (sharp books up-weighted) alongside the existing median; in `clv.ts`, ensure the CLV benchmark is the sharpest-book closing no-vig price, not a naive average. Ship the sharpness-weighted consensus **SHADOW** first, compare its CLV to the plain median on ≥100 settled, promote on non-worsening ECE.

#### 4. Multiplicative (proportional) de-vig
- **Name:** Multiplicative / proportional / "normalize the implied probabilities" method.
- **Definition:** Strip vig by dividing each outcome's raw implied probability by the total overround so they sum to 1.
- **How it works:** Compute raw implied prob = 1/decimal_odds for each side; the booksum (overround) > 1; divide each by the booksum. Distributes the margin *proportionally* — favorites absorb more of the margin in absolute terms. Simple, closed-form, but ignores favourite-longshot bias.
- **Where it's proven:** The default everywhere; on tight two-way lines (-110/-110) it is within rounding of every other method.
- **GSE relevance:** **ADOPT-NOW** (as a cross-check, not the primary). Keeping a multiplicative number next to Shin is free and lets GSE *quantify* how much the de-vig choice is moving the fair price — a transparency/audit win that fits the proof-first brand.
- **Integration path:** Add `multiplicative()` alongside `shin()` in `shin-devig.ts`; expose the delta (Shin vs multiplicative) as an internal diagnostic and an auditable field in the receipt. No ladder change — it's a reference computation, not a new weighted signal.

#### 5. Additive (equal-margin) de-vig
- **Name:** Additive / equal-margin / "subtract equal share" method.
- **Definition:** Remove vig by subtracting an equal amount of probability from each outcome.
- **How it works:** Spread the overround equally across N outcomes (subtract (booksum−1)/N from each raw implied prob). This shifts probability toward longshots relative to multiplicative, partially correcting favourite-longshot bias. Can produce negative probabilities on extreme longshots if applied naively. **For two-outcome markets, additive ≈ Shin.**
- **Where it's proven:** Common alternative in devig tooling; the natural "middle" between multiplicative and Shin.
- **GSE relevance:** **ADOPT-NOW** (cross-check). Because additive coincides with Shin on two-way markets, carrying it makes Shin's behavior auditable and gives a clean fallback on totals/spreads (mostly two-way) where the methods agree.
- **Integration path:** Add `additive()` to `shin-devig.ts`; use as a sanity bound on Shin output (flag if Shin and additive diverge on a two-way market — that signals a numerical issue). Reference computation, no new ladder weight.

#### 6. Shin de-vig (1992/1993) — **GSE's production primary**
- **Name:** Shin method; Shin's z; insider-trading de-vig.
- **Definition:** A de-vig that models the overround as arising from informed ("insider") traders and solves for the proportion z of informed money, yielding bias-corrected fair probabilities.
- **How it works:** Shin (1992, "Prices of State Contingent Claims with Insider Traders, and the Favourite–Longshot Bias"; 1993, "Measuring the Incidence of Insider Trading…") assumes the bookmaker sets prices defensively against insiders, inflating margin most on longshots. An iterative solve for z (incidence of informed trading) recovers fair probabilities that correct favourite-longshot bias. On two-way markets it reduces to additive; on multi-way it differs and generally predicts best.
- **Where it's proven:** The most theoretically grounded de-vig in the literature; standard in quant betting and the `implied` R package. Empirically competitive-to-best for predictive accuracy.
- **GSE relevance:** **ADOPT-NOW — already in production** (`shin-devig.ts`). This is correctly GSE's primary. The recommendation is to keep it primary *and* surround it with the cross-checks above so the choice is defensible and auditable.
- **Integration path:** Already the core of `shin-devig.ts` feeding `consensus.ts`/`edge-engine.ts`. Action: lock its z-solver with regression tests, emit z and the per-method deltas into the SHA-256 receipt so the de-vig is provable, and document it on the public methodology page as the named primary.

#### 7. Power-method de-vig
- **Name:** Power method; "odds-to-the-power-k" / Joe Buchdahl's power devig.
- **Definition:** Raise each raw implied probability to a power k (solve for k so they sum to 1), producing a favourite-longshot-aware fair price.
- **How it works:** Find exponent k such that Σ pᵢ^k = 1. Because exponentiation compresses/stretches asymmetrically, it down-weights favorites and up-weights longshots in a smooth, always-feasible way (stays in [0,1], unlike additive). Results typically sit **between multiplicative and Shin**.
- **Where it's proven:** Popular among sharp bettors and devig calculators as a robust, no-negative-probability alternative to additive; often the best on heavy-favorite and player-prop markets.
- **GSE relevance:** **PILOT.** A legitimately different fair price on lopsided lines (heavy favorites, props) where Shin and multiplicative diverge most — worth a scoped backtest to see if a power or Shin/power *blend* improves CLV on those markets specifically.
- **Integration path:** Add `power()` to `shin-devig.ts`; **PILOT** on a props/heavy-favorite slice — backtest power vs Shin CLV on ≥100 settled in that slice. If power (or a Shin+power average) wins out-of-sample with non-worsening ECE, route it through **Model Court** as the de-vig for that market class only.

#### 8. Logit / Wisdom-of-the-Crowd-with-favourite-longshot (WOC-FLB) de-vig
- **Name:** Logit method; WOC-FLB; log-odds bias-correction.
- **Definition:** Map odds to log-odds, apply a linear bias correction calibrated to historical favourite-longshot patterns, then map back.
- **How it works:** Work in logit space (log(p/(1−p))); fit/apply an offset-and-slope that corrects the systematic FLB observed historically, then transform back to probabilities. It is essentially an *empirically calibrated* de-vig rather than a theory-driven one — it learns the bias from settled results rather than assuming Shin's insider model.
- **Where it's proven:** Academic favourite-longshot literature; useful when you have a large settled sample to fit the correction.
- **GSE relevance:** **SHADOW.** It needs GSE's own settled history to calibrate, so it can't lead until the sample is large; but run unweighted it generates exactly the evidence (does FLB persist in GSE's markets, and by how much?) that justifies any FLB correction at all.
- **Integration path:** Implement as a calibrated layer adjacent to `shin-devig.ts`, fit on settled data via `probability-calibration.ts` infrastructure. **SHADOW** until ≥100–500 settled; if it beats Shin on CLV+Brier without ECE regression, it becomes a candidate FLB correction through **Model Court**.

#### 9. Median / trimmed consensus across books — **in production**
- **Name:** Multi-book consensus; median line; trimmed-mean consensus.
- **Definition:** Aggregate the de-vigged prices from many books into one robust consensus probability via median or trimmed mean.
- **How it works:** Pull the same market from ~7 books, de-vig each, then take the median (or drop the high/low and average) so a single mispriced or stale book can't distort the read. Robust statistics (median/trim) beat the naive mean because book errors are heavy-tailed.
- **Where it's proven:** Standard "fair value from many books" practice; the backbone of every odds-screen / value-finder product.
- **GSE relevance:** **ADOPT-NOW — already in production** (`consensus.ts`, ~7 books). Correct and central. Enhancement: add the **sharpness-weighted** variant from method #3 and report median-vs-sharp-weighted divergence as a market-disagreement signal.
- **Integration path:** Already `consensus.ts`. Add trimmed-mean and sharpness-weighted variants as selectable consensus estimators; expose the inter-book dispersion as an Edge-Index confidence modifier (wide dispersion = less certain fair price).

#### 10. Market Gravity Index (steam / line-velocity read) — **in production**
- **Name:** Market Gravity Index (GSE term); line-velocity / momentum read.
- **Definition:** GSE's proprietary measure of how strongly and quickly the market is converging on a price (where the line is "being pulled").
- **How it works:** Quantifies magnitude + speed + cross-book uniformity of line movement toward an outcome — high gravity = many sharp books moving the same way fast (a steam-like signal); low/uneven gravity = noise or square money. Functions as a momentum/where-is-truth-heading indicator layered on the static consensus.
- **Where it's proven:** Conceptually validated by the steam-move / line-movement literature (uniform, fast, multi-book moves carry information); GSE's specific index is its own construct.
- **GSE relevance:** **ADOPT-NOW — already in production** (`market-read.ts`). A genuine differentiator. Action: formalize its components (see methods #11–#13) and *grade the index itself on CLV* so its weight in the 13-component confidence is earned, not assumed.
- **Integration path:** `market-read.ts`. Backtest the index's marginal CLV contribution; if a component (RLM, steam) adds independent signal, fold it in via **Model Court**. Emit the gravity snapshot into the receipt for auditability.

#### 11. Reverse line movement (RLM) signal
- **Name:** Reverse line movement; line/ticket divergence; "money moving against the public."
- **Definition:** The line moves *toward* the side getting the *minority* of public tickets — a classic sharp-money fingerprint.
- **How it works:** Compare ticket% (where the public is) to line direction. If 75% of tickets are on Team A but the line moves toward Team B, sharp money on B is overpowering public volume on A. Strongest single public-data sharp signal; requires a ticket/handle feed to compute cleanly.
- **Where it's proven:** Widely documented sharp-action indicator (Sports Insights / Action Network style data). Predictive but noisy and data-dependent.
- **GSE relevance:** **PILOT.** A potential explicit component of the Market Gravity Index, but it needs a reliable ticket%/handle% source and a scoped backtest before it earns weight — and GSE's no-fabricated-data rule means it only ships if the data source is canonical.
- **Integration path:** Add an RLM detector to `market-read.ts` *if* a licensed ticket/handle feed is in the source registry. **PILOT**: backtest RLM-flagged picks' CLV vs unflagged. Passes **Model Court** → becomes a Market Gravity sub-signal flipping `priced=false→priced`.

#### 12. Sharp-vs-square / money-vs-ticket divergence
- **Name:** Sharp money vs square money; handle-vs-ticket split; "bet% vs money%."
- **Definition:** When the share of *money* on a side exceeds its share of *tickets*, larger (often sharper) bettors are on that side.
- **How it works:** Ticket% counts bets; money% (handle%) counts dollars. A side with 40% of tickets but 65% of money is getting big bets per ticket — a sharp tell. Divergence magnitude is the signal.
- **Where it's proven:** Standard sharp-detection metric in betting-data products. Informative but easily distorted by a few whales and dependent on data quality.
- **GSE relevance:** **SHADOW.** Same data dependency as RLM and more prone to single-account distortion, so gather evidence unweighted before trusting it. Disqualifier for higher rating: without a clean, canonical handle feed it violates the no-fabricated-data rule.
- **Integration path:** Compute in `market-read.ts` when a handle feed exists; **SHADOW** only, logged for correlation with CLV. Promote only if it survives the same Model-Court bar as RLM.

#### 13. Steam-move detection
- **Name:** Steam move; steam chasing; synchronized cross-book move.
- **Definition:** A sudden, uniform, multi-book line move in minutes — the market reacting to a wave of sharp action or new information.
- **How it works:** Detect when N books move the same direction by ≥X within a short window. The move itself is the signal (information has hit); "chasing steam" means betting before the soft books catch up. Tightly related to the Market Gravity Index — gravity is essentially a continuous steam meter.
- **Where it's proven:** Core professional concept; the basis of steam-chasing services.
- **GSE relevance:** **PILOT.** Largely already implicit in the Market Gravity Index; formalizing an explicit steam detector and *timestamping* it gives GSE a provable "we flagged this before close" artifact that pairs beautifully with CLV grading and the receipt system.
- **Integration path:** Formal steam detector in `market-read.ts` feeding the Gravity Index; record detection timestamp in the receipt (proof of pre-close signal). **PILOT** backtest of steam-flagged CLV; promote via Model Court.

#### 14. Closing line value (CLV) as a forecast benchmark — **in production**
- **Name:** Closing line value; CLV; beat-the-close.
- **Definition:** The gap between the price you got and the (no-vig) closing price — the gold-standard proxy for whether a forecast has genuine edge.
- **How it works:** If you consistently get prices better than the sharp closing line, you are, by definition, beating the most efficient available estimate — and that predicts long-run profit faster than win/loss (significance in as few as ~50–100 bets vs thousands for ROI). GSE grades itself on CLV and bakes thresholds into the ladder (ESTABLISHED CLV≥52.4%, AUTHORITY CLV≥55%).
- **Where it's proven:** The consensus single best predictor of bettor skill (Buchdahl, Pinnacle research). The most respected benchmark in the field.
- **GSE relevance:** **ADOPT-NOW — already in production and load-bearing** (`clv.ts`, ladder gates). This is the keystone of GSE's entire proof story. Action: make sure CLV is computed against the *sharpest* no-vig close (method #3) and is reported with bootstrap confidence intervals (method #36).
- **Integration path:** `clv.ts` + ladder. Harden: sharpest-book benchmark, bootstrap CIs on CLV%, per-sport/per-market CLV breakdowns surfaced in the cockpit and (tier-gated) publicly as proof.

#### 15. Market efficiency hypothesis / no-arbitrage
- **Name:** Market efficiency (semi-strong); no-arbitrage / no-sure-profit condition.
- **Definition:** In an efficient betting market, prices already reflect available information, so persistent edge requires either superior information or exploiting a residual inefficiency.
- **How it works:** Semi-strong efficiency says public info is priced in; no-arbitrage says you can't lock a riskless profit from internally consistent prices. The practical corollary for GSE: the closing line is *near*-efficient, so the honest claim is "we find pockets of inefficiency before close," provable only by CLV.
- **Where it's proven:** Financial economics; sports-market efficiency studies (closing lines are hard to beat, which is exactly why beating them matters).
- **GSE relevance:** **REFERENCE.** The intellectual guardrail that keeps GSE honest — it justifies *why* CLV (not raw win rate) is the benchmark and why the brand avoids "guaranteed/lock" language. Frames the whole product.
- **Integration path:** Conceptual; cite in methodology/positioning copy and in `edge-engine.ts` design notes (edge = measured departure from an efficient close, not a promise).

#### 16. Favourite–longshot bias (FLB) modeling
- **Name:** Favourite–longshot bias; FLB; longshot overbetting.
- **Definition:** The empirical regularity that longshots are systematically overbet (returns worse than implied) and favorites underbet.
- **How it works:** Bettors overpay for longshots, so raw implied probabilities overstate longshot chances; modeling FLB applies a correction (Shin, power, logit) so fair probabilities and any *post-de-vig* calibration account for it. It's both a de-vig consideration and a calibration consideration.
- **Where it's proven:** One of the most replicated anomalies in racing/sports markets.
- **GSE relevance:** **PILOT.** GSE already addresses FLB implicitly via Shin; an explicit, *measured* FLB curve (from settled data) would let calibration correct any residual bias by odds-band — a clean, defensible refinement.
- **Integration path:** Measure residual FLB in `probability-calibration.ts` (calibration error vs odds band); if material, correct via `calibration-apply.ts` or a power/logit de-vig (#7/#8). **PILOT** with the standard ≥100-settled, non-worsening-ECE gate.

#### 17. Edge Index (fair vs offered) — **in production**
- **Name:** Edge Index (GSE term); value gap; expected-value spread.
- **Definition:** GSE's measure of the distance between its fair probability (de-vigged consensus) and the price actually offered — i.e., where the value is.
- **How it works:** Edge = fair_prob − implied_prob_offered (or the EV equivalent). Positive Edge Index = the offered price underprices GSE's fair estimate. This is the direct bridge from "market read" to "actionable pick" and a major input to the 13-component confidence.
- **Where it's proven:** The universal value-betting principle (bet when your fair prob > the book's implied prob). GSE's index is its branded implementation.
- **GSE relevance:** **ADOPT-NOW — already in production** (`edge-engine.ts`). Core. Action: grade the Edge Index's realized CLV by bucket (does a bigger Edge Index actually yield bigger CLV?) to confirm the signal is monotonic and well-calibrated.
- **Integration path:** `edge-engine.ts`. Add Edge-bucket → realized-CLV calibration in `probability-calibration.ts`; surface as proof. Tie Edge magnitude to fractional-Kelly stake (method #42).

### 2. Crowd & judgmental

> Human-aggregation methods. For an automated, market-first engine most of these are **REFERENCE/SKIP** as forecasters — but two ideas (Brier-weighting and the superforecasting discipline of "score-then-reweight") map directly onto how GSE should weight *its own* signals and run **Model Court**.

#### 18. Wisdom of crowds
- **Name:** Wisdom of crowds; collective intelligence.
- **Definition:** Aggregating many independent estimates yields an estimate better than most individuals.
- **How it works:** Independent, diverse, decentralized estimates have uncorrelated errors that cancel on aggregation (Galton's ox). Requires independence — correlated errors break it.
- **Where it's proven:** Estimation tasks, markets, ensembles broadly.
- **GSE relevance:** **REFERENCE.** The multi-book consensus *is* a wisdom-of-crowds estimator over bookmakers; no separate adoption needed.
- **Integration path:** Conceptual basis for `consensus.ts`; cite in methodology.

#### 19. Delphi method
- **Name:** Delphi; iterative expert panel.
- **Definition:** Structured rounds of anonymous expert estimates with feedback until convergence.
- **How it works:** Experts answer, see anonymized aggregate + rationales, revise over rounds. Reduces dominance/anchoring; converges judgmental forecasts.
- **Where it's proven:** Technology forecasting, policy, long-horizon questions with no data.
- **GSE relevance:** **SKIP.** GSE forecasts high-frequency games from abundant market data; a slow human-panel loop has no fit and would inject unprovable judgment against the no-fabricated-data ethos.
- **Integration path:** None.

#### 20. Prediction polls
- **Name:** Prediction polls; survey-based probability elicitation.
- **Definition:** Ask a population for probability estimates and aggregate.
- **How it works:** Collect individual probabilities, aggregate (mean/median/weighted). The GJP's non-market arm; works without market infrastructure.
- **Where it's proven:** Geopolitical forecasting tournaments (IARPA/GJP).
- **GSE relevance:** **SKIP.** Same disqualifier as Delphi — no canonical data, slow, and off-mission for an automated engine.
- **Integration path:** None.

#### 21. Superforecasting / Good Judgment Project (GJP)
- **Name:** Superforecasting; GJP; Tetlock–Mellers program.
- **Definition:** A research program (and method set) showing trained individuals using disciplined updating beat experts and markets on geopolitical questions.
- **How it works:** Break questions down, take outside view first, update incrementally on news, track Brier scores, and aggregate with recency-weighting + performance-weighting + extremizing. The *process discipline* — score everything, reweight by track record, update relentlessly — is the transferable asset.
- **Where it's proven:** IARPA forecasting tournament (GJP won decisively).
- **GSE relevance:** **REFERENCE** (process, not picks). GSE shouldn't crowd-source game picks, but the superforecasting *ethos* — every signal carries a track record, weights move with measured accuracy, claims update on evidence — is essentially what GSE's ladder + Model Court already encode. Validate the design against it.
- **Integration path:** Conceptual model for `model-court` and the proof ladder; the "score, then reweight" loop is the engine's governance philosophy.

#### 22. Brier-weighted aggregation
- **Name:** Brier-weighted aggregation; performance-weighted pooling.
- **Definition:** Weight each forecaster/signal in the aggregate by its historical Brier accuracy.
- **How it works:** Better-calibrated, sharper sources (lower Brier) get more weight; the aggregate tilts toward proven performers. The GJP found this beat equal-weighting.
- **Where it's proven:** GJP, ensemble forecasting.
- **GSE relevance:** **PILOT.** This is the principled way to set the weights of GSE's 13 confidence components *and* to weight books in the consensus — replace any hand-set weights with Brier/CLV-earned weights, exactly matching the "weights must pass Model Court" rule.
- **Integration path:** In `consensus.ts` and the confidence assembler, compute per-source Brier/CLV on settled data and set weights ∝ accuracy. **PILOT** with walk-forward validation (#53); any new weight set goes through **Model Court** (prosecution/defense/falsifier/out-of-sample/no-ECE-regression/owner-approval).

#### 23. Extremizing
- **Name:** Extremizing; log-odds extremizing; confidence-sharpening transform.
- **Definition:** Push an aggregated probability away from 0.5 toward 0/1 to counter the under-confidence of averaging correlated forecasts.
- **How it works:** Averaging shrinks toward 0.5; if underlying forecasters share information, the average is under-confident, so multiply the aggregate log-odds by a factor >1. **Caveat:** more recent evidence suggests tournament-era extremizing gains were partly luck — small average gains but occasional large losses, so it's risky on already-efficient inputs.
- **Where it's proven:** GJP (contested); ensemble post-processing.
- **GSE relevance:** **SHADOW** — with prejudice. The betting consensus is *already* near-efficient and not under-confident, so extremizing risks manufacturing overconfidence and tripping calibration gates. Only ever apply if reliability curves *prove* systematic under-confidence in GSE's settled data.
- **Integration path:** Only as a candidate transform in `calibration-apply.ts`, justified solely by a measured under-confident reliability curve; must improve Brier *and* not worsen ECE in Model Court, else rejected. Default: do not use.

#### 24. Analyst-consensus aggregation
- **Name:** Analyst/model consensus; expert-pick aggregation.
- **Definition:** Aggregate published expert or model picks into a consensus signal.
- **How it works:** Collect third-party projections (e.g., public model power ratings, analyst sides), normalize, aggregate. Can be a feature, not a source of truth.
- **Where it's proven:** Fantasy/projection aggregators; finance analyst consensus.
- **GSE relevance:** **SHADOW.** Could be a *feature* feeding confidence (does external-consensus agreement add CLV?), but only from licensed, canonical sources and only after proving incremental value. Never a headline driver — the market is the truth.
- **Integration path:** Optional feature input scored in `probability-calibration.ts`; **SHADOW** for incremental-CLV evidence before any weight.

#### 25. Expert elicitation
- **Name:** Expert elicitation; structured judgment encoding (e.g., Cooke's classical method).
- **Definition:** Formal protocols to extract calibrated probabilities/distributions from domain experts, weighting experts by calibration on seed questions.
- **How it works:** Experts answer calibration "seed" questions with known answers; their performance sets weights for the real questions (Cooke's method). Encodes judgment with accountability.
- **Where it's proven:** Risk analysis, nuclear/environmental modeling, insurance.
- **GSE relevance:** **REFERENCE.** The seed-question/weight-by-calibration idea mirrors GSE's "earn weight by measured accuracy" ladder; otherwise human elicitation is off-mission.
- **Integration path:** Conceptual; reinforces the Model-Court/ladder design.

#### 26. Structured analytic techniques (SATs)
- **Name:** SATs; Analysis of Competing Hypotheses (ACH); pre-mortem; red-teaming.
- **Definition:** Disciplined reasoning frameworks (ACH, key-assumptions check, pre-mortem, devil's advocacy) to reduce cognitive bias in judgmental analysis.
- **How it works:** ACH lists hypotheses and scores evidence *against* each to find the least-disconfirmed; pre-mortem imagines failure to surface risks; red teams attack the thesis. Structured skepticism, not numeric forecasting.
- **Where it's proven:** Intelligence analysis, security, decision review.
- **GSE relevance:** **REFERENCE.** GSE's **Model Court** (prosecution + defense + falsifier) is literally a structured-analytic technique applied to weight changes — ACH/red-teaming validate that design.
- **Integration path:** Conceptual underpinning of `model-court`; the falsifier role = built-in red team.

### 3. Ensemble / combination

> The mathematics of combining forecasts. GSE already *combines* book prices (consensus) and *adds* 13 components into confidence — so this family directly governs how those combinations should be weighted and (eventually) how multiple GSE models blend. Combination almost always beats any single model, which is why several entries here are ADOPT-NOW/PILOT.

#### 27. Simple / trimmed mean combination
- **Name:** Equal-weight combination; simple average; trimmed mean.
- **Definition:** Combine forecasts by (robust) averaging, with no estimated weights.
- **How it works:** Average the component forecasts; trim extremes for robustness. The famous "forecast combination puzzle": the dumb equal-weight average is shockingly hard to beat because estimated weights overfit.
- **Where it's proven:** Decades of forecasting competitions (M-competitions); the default benchmark combiner.
- **GSE relevance:** **ADOPT-NOW.** The honest baseline for both the book consensus and any future multi-model blend; any fancier weighting (Bates–Granger, stacking) must *beat the equal-weight average out-of-sample* to earn its place — a clean Model-Court criterion.
- **Integration path:** It's effectively the current `consensus.ts` median/mean. Formalize equal-weight as the **benchmark combiner** that all weighted schemes must beat in walk-forward before promotion.

#### 28. Weighted linear pool
- **Name:** Linear opinion pool; weighted average of probabilities.
- **Definition:** Combine probability forecasts as a weighted arithmetic mean.
- **How it works:** Combined p = Σ wᵢ pᵢ, weights sum to 1. Weights can be equal, performance-based (#22), or optimized (#29). Operates in probability space (vs log space, #33).
- **Where it's proven:** Ubiquitous in ensemble forecasting and meteorology.
- **GSE relevance:** **PILOT.** The natural structure for a performance-weighted book consensus and for blending GSE's market read with R&D models (Elo/Poisson/GBM) once those earn `priced` status.
- **Integration path:** Generalize `consensus.ts` to a weighted linear pool with Brier/CLV weights (#22); **PILOT** vs equal-weight; promote via Model Court.

#### 29. Bates–Granger combination
- **Name:** Bates–Granger (1969); variance-minimizing forecast combination.
- **Definition:** Combine forecasts with weights that minimize the combined error variance, using the forecasts' error variances and correlation.
- **How it works:** For two forecasts, the optimal weight is a function of their error variances and covariance — put more weight on the lower-variance, and exploit negative correlation. The founding result of the combination literature.
- **Where it's proven:** Econometric forecasting; the seminal combination method.
- **GSE relevance:** **PILOT.** Once GSE has ≥2 *independent* forecasts of the same outcome (e.g., market read vs a `priced` GBM model), Bates–Granger is the textbook way to combine them — but it needs a stable settled sample to estimate the error covariance.
- **Integration path:** Apply in the engine blend layer when a second model reaches `priced`; estimate error-variance/covariance on settled data via walk-forward (#53). **PILOT**, then Model Court.

#### 30. Bayesian Model Averaging (BMA)
- **Name:** BMA.
- **Definition:** Average models weighted by their posterior probabilities given the data, integrating over model uncertainty.
- **How it works:** Weight ∝ posterior model probability (∝ marginal likelihood × prior). Accounts for *which model is right* being uncertain; yields well-calibrated predictive distributions but is computationally heavier and prior-sensitive.
- **Where it's proven:** Climate/weather ensembles, econometrics, epidemiology.
- **GSE relevance:** **SHADOW.** Theoretically attractive for blending several `priced` models with principled uncertainty, but overkill until GSE actually has a stable of competing models; gather the pieces first.
- **Integration path:** Future engine-blend option once ≥3 models exist; prototype offline, **SHADOW**, and only promote if it beats simpler pools out-of-sample.

#### 31. Stacking / super learner
- **Name:** Stacked generalization; stacking; super learner (van der Laan).
- **Definition:** Train a meta-model on base models' out-of-fold predictions to learn the best combination.
- **How it works:** Generate cross-validated (out-of-fold) predictions from each base learner, then fit a meta-learner (often a constrained/convex combiner — the super learner restricts to a convex, loss-minimizing combination) on those. Provably asymptotically as good as the best base learner.
- **Where it's proven:** Kaggle-winning pipelines, biostatistics (super learner), applied ML broadly.
- **GSE relevance:** **PILOT.** The most powerful combiner here for blending market read + Elo + Poisson + GBM — but it can overfit and is the least transparent, so it must clear purged/embargoed CV (#53) and Model Court before any `priced` weight. Transparency caveat matters for GSE's explainability brand.
- **Integration path:** Engine-blend meta-learner trained on out-of-fold settled predictions; **mandatory** purged-embargoed CV + Deflated Sharpe (#53). **PILOT** only; promote a constrained (convex, monotone) super learner for interpretability if it beats the equal-weight and linear pools.

#### 32. Mixture of experts
- **Name:** Mixture of experts (MoE); gated ensemble.
- **Definition:** A gating network routes each input to the expert model best suited to it, blending experts conditionally.
- **How it works:** A learned gate assigns input-dependent weights to specialized experts (e.g., a "heavy-favorite" expert vs a "pick'em" expert), so different regimes use different models. More flexible than fixed weights; more data-hungry.
- **Where it's proven:** Deep learning, regime-switching forecasting.
- **GSE relevance:** **SHADOW.** Appealing for sport/market-type specialization (NFL spreads vs MLB totals vs props), but needs lots of per-regime settled data; collect evidence that regime-specific weighting helps before building a gate.
- **Integration path:** Future engine-blend option; first test simple *manual* regime splits (per-sport/per-market weights) and only graduate to a learned gate if those splits show gains. **SHADOW**.

#### 33. Logarithmic opinion pool
- **Name:** Log opinion pool; geometric-mean pooling.
- **Definition:** Combine probabilities by a weighted geometric mean (average in log space), then renormalize.
- **How it works:** log p_combined ∝ Σ wᵢ log pᵢ. Unlike the linear pool, it's "externally Bayesian" and tends to be *sharper* (more confident) when forecasters agree — multiplying probabilities concentrates mass. Equivalent to averaging log-odds for binary events.
- **Where it's proven:** Bayesian forecast aggregation; expert combination.
- **GSE relevance:** **PILOT.** For combining de-vigged book probabilities, the log/geometric pool is arguably *more correct* than the arithmetic median (probabilities live naturally in log-odds), and it interacts cleanly with calibration. Worth a head-to-head vs the current median.
- **Integration path:** Add a log-pool consensus option to `consensus.ts`; **PILOT** geometric vs median consensus on CLV+Brier; promote via Model Court if it wins without ECE regression. Note: log-pooling can over-sharpen, so pair with calibration (#50).

#### 34. Model Confidence Set (MCS)
- **Name:** Model Confidence Set (Hansen–Lunde–Nason).
- **Definition:** A statistical procedure that returns the *set* of models indistinguishable from the best at a confidence level.
- **How it works:** Iteratively eliminate models significantly worse than the best by a loss criterion until only statistically-tied models remain. Tells you *which models you can't rule out* rather than naming one winner.
- **Where it's proven:** Volatility/econometric model selection.
- **GSE relevance:** **REFERENCE.** Exactly the right tool for **Model Court's** "is the new weight actually better, or just noise?" question — adopt the *idea* (don't promote a model unless it's statistically separable from the incumbent) even if not the full procedure.
- **Integration path:** Conceptual criterion inside `model-court`: require statistical separation (MCS-style or Diebold–Mariano test) before a new model/weight displaces the incumbent.

### 4. Simulation

> Generative methods that play out games/seasons to produce outcome distributions. GSE is market-first, so simulators are **not** the source of truth — but bootstrap resampling is an ADOPT-NOW *evaluation* tool, and a play-by-play simulator is a credible PILOT *content/secondary-signal* engine that could earn `priced` status if it produces CLV.

#### 35. Monte Carlo simulation
- **Name:** Monte Carlo simulation; MC.
- **Definition:** Estimate an outcome distribution by running a stochastic model of the process many thousands of times.
- **How it works:** Specify input distributions (team strength, pace, variance), draw randomly, simulate the game/season repeatedly, and read off probabilities + the full distribution (incl. correlations and tail/playoff scenarios). Quality is entirely a function of the input model.
- **Where it's proven:** Season/playoff odds (FiveThirtyEight-style), risk, derivatives, derived/correlated betting markets (Genius Sports uses MC for in-play pricing).
- **GSE relevance:** **PILOT.** A legitimate *secondary* engine — especially for derived markets (player props, alt-lines, parlcorrelations) the book may price less efficiently. But it must be graded on CLV like any model and cannot override the market read until it earns `priced`.
- **Integration path:** New `simulation/` module producing distributions for derived markets; output scored in `probability-calibration.ts` and `clv.ts`. **SHADOW→PILOT**; flips `priced=false→priced` only via Model Court with CLV evidence.

#### 36. Bootstrap / block bootstrap / resampling
- **Name:** Bootstrap; block bootstrap (for time series); resampling.
- **Definition:** Quantify uncertainty by resampling the observed data (with replacement) and recomputing the statistic many times.
- **How it works:** Draw resamples from settled results (block bootstrap to preserve temporal dependence), recompute CLV%, win rate, Brier, etc., and read off confidence intervals and p-values without distributional assumptions.
- **Where it's proven:** Universal in statistics; the standard way to get CIs on betting metrics.
- **GSE relevance:** **ADOPT-NOW.** This is the cheapest, highest-integrity upgrade to GSE's *proof* layer: report every headline number (CLV, win rate, ROI, calibration) with bootstrap confidence intervals so the ladder thresholds (CLV≥52.4%/55%) are claims *with error bars*, not point estimates. Pure brand/credibility win.
- **Integration path:** Add a `bootstrap()` utility used by `clv.ts` and `probability-calibration.ts`; show CIs on all proof surfaces and in Model Court (a weight only "passes" if its CLV CI clears the threshold). Block bootstrap for any time-dependent metric.

#### 37. Agent-based modeling (ABM)
- **Name:** Agent-based model; ABM; multi-agent simulation.
- **Definition:** Simulate many interacting autonomous agents and observe emergent aggregate behavior.
- **How it works:** Define agent rules (players, bettors, market makers) and let interactions generate macro outcomes. Powerful for emergent/strategic dynamics; very hard to calibrate to data.
- **Where it's proven:** Epidemiology, traffic, market-microstructure research, some game-strategy studies.
- **GSE relevance:** **SKIP** (as a forecaster). Calibration burden is enormous and it can't be tied to canonical data cleanly; no path to `priced` within GSE's evidentiary standard. (Marginal research interest for modeling *market manipulation*, but not a product engine.)
- **Integration path:** None for production. Optional research note only.

#### 38. Discrete-event simulation (DES)
- **Name:** Discrete-event simulation; DES.
- **Definition:** Model a system as an ordered sequence of timestamped events that change state.
- **How it works:** Advance simulation clock event-to-event (snap → play result → clock → next), updating state. The engineering substrate underneath play-by-play game simulators.
- **Where it's proven:** Operations research, queuing, logistics; the mechanism inside play-by-play sports sims.
- **GSE relevance:** **REFERENCE.** Relevant only as the *implementation pattern* for a play-by-play simulator (#39), not as a standalone method.
- **Integration path:** Architectural pattern for the `simulation/` module if GSE builds play-by-play (#39).

#### 39. Play-by-play / Markov-chain game simulators
- **Name:** Play-by-play simulator; Markov game model; possession/state-transition simulator.
- **Definition:** Simulate a game as a sequence of states (down/distance, possession, score) with empirical transition probabilities until it ends.
- **How it works:** Build a Markov chain (or richer hybrid with agent logic) over game states using historical play data; run it many times (Monte Carlo over the chain) to get win/score/prop distributions, including correlated outcomes the book may misprice.
- **Where it's proven:** NBA/NFL analytics (EPA/win-probability models), academic hybrid simulators, in-play pricing.
- **GSE relevance:** **PILOT.** The most credible *generative secondary engine* for GSE — strong for player props, live/derived markets, and rich content ("we simulated this game 50,000 times"). Must earn `priced` via CLV; excellent for tier-gated content even before that.
- **Integration path:** Core of the `simulation/` module (DES substrate, #38; MC over the chain, #35); outputs scored via `clv.ts`/`probability-calibration.ts`. **SHADOW→PILOT**; Model Court gates any `priced` use. Doubles as Studio content fuel immediately.

#### 40. Scenario / what-if analysis
- **Name:** Scenario analysis; what-if; sensitivity analysis.
- **Definition:** Explore how outcomes change under deliberately chosen alternative assumptions (injury, weather, pace).
- **How it works:** Re-run the fair-value/sim under "what if star is out / wind 20mph / pace +5" to bound the answer and stress-test a pick. Not probabilistic per se — a structured exploration.
- **Where it's proven:** Risk management, strategy, planning.
- **GSE relevance:** **REFERENCE.** Useful as a *cockpit/content* feature ("here's how the line should move if X is ruled out") and for internal robustness checks, not a forecasting method that enters the ladder.
- **Integration path:** Cockpit tooling + Studio content over `edge-engine.ts`/sim outputs; no ladder weight.

### 5. Bankroll bridge (forecast → bet)

> Converts a probability/edge into a stake. GSE already uses quarter-Kelly capped at 3 units — the textbook-correct, conservative choice. The job here is mostly to confirm and harden, with risk-of-ruin as the one real addition.

#### 41. Kelly criterion
- **Name:** Kelly criterion; Kelly bet; optimal growth fraction.
- **Definition:** The bankroll fraction that maximizes long-run log-growth given your edge and odds.
- **How it works:** f* = edge/odds (for even-money, f* = 2p−1). Maximizes geometric growth; betting *more* than Kelly raises risk of ruin, and Kelly is brutally sensitive to probability-estimate error (overestimate p → overbet).
- **Where it's proven:** Gambling, quantitative investing (Thorp), information theory (Kelly 1956).
- **GSE relevance:** **REFERENCE** (full Kelly) — full Kelly is too aggressive and estimate-sensitive for a published product; GSE correctly uses a *fraction* (#42). Document full Kelly as the theoretical anchor.
- **Integration path:** `kelly.ts` already implements the fractional version; full Kelly is the formula it scales down from.

#### 42. Fractional Kelly — **in production (quarter-Kelly, 3-unit cap)**
- **Name:** Fractional Kelly; ¼-Kelly / ½-Kelly.
- **Definition:** Stake a fixed fraction of the full-Kelly amount to cut variance and protect against estimation error.
- **How it works:** Bet (fraction)×f*. Half-Kelly keeps ~75% of full-Kelly growth at roughly half the drawdown; quarter-Kelly is more conservative still — the right call when probabilities are estimated (which they always are). GSE's quarter-Kelly + 3-unit cap is a defensible, brand-safe staking policy.
- **Where it's proven:** Near-universal among professional bettors/investors; the practical standard.
- **GSE relevance:** **ADOPT-NOW — already in production** (`kelly.ts`). Correct as-is. Enhancement: scale the Kelly fraction by *calibration quality* — bet a smaller fraction while the model is young/uncalibrated, larger (still ≤ quarter) once PROVEN — making staking itself ladder-aware.
- **Integration path:** `kelly.ts`. Tie the fraction to the proof tier (FOUNDING → most conservative; AUTHORITY → up to the capped quarter-Kelly) and to the Edge-bucket calibration (#17). Keep the 3-unit cap and banned-language guards.

#### 43. Expected-value / edge thresholds
- **Name:** EV threshold; minimum-edge filter; +EV betting.
- **Definition:** Only publish/stake when expected value (fair prob × payout − stake) clears a minimum edge.
- **How it works:** EV = p·b − (1−p), in odds terms; require EV ≥ threshold (a few %) so noise and de-vig error don't generate spurious picks. The gate between "model says lean" and "publishable pick."
- **Where it's proven:** Every disciplined betting operation.
- **GSE relevance:** **ADOPT-NOW — effectively in production** via the Edge Index (#17). Action: set the threshold *empirically* from the Edge-bucket→CLV calibration so it's the level where realized CLV actually turns positive, not a guess.
- **Integration path:** `edge-engine.ts` publish gate; calibrate the threshold from settled Edge→CLV data; document it.

#### 44. Risk of ruin
- **Name:** Risk of ruin; drawdown/ruin probability.
- **Definition:** The probability the bankroll hits zero (or a drawdown floor) given edge, variance, and bet sizing.
- **How it works:** Closed-form/simulated from win prob, payout, and stake fraction; rises sharply with bet size and falls with edge. Complements Kelly by bounding *catastrophe*, not just optimizing growth.
- **Where it's proven:** Gambling math, trading risk management.
- **GSE relevance:** **PILOT.** A risk-of-ruin / max-drawdown readout makes the staking story *complete and trustworthy* (and is great tier-gated content: "at quarter-Kelly your modeled drawdown is X"). Computable now via the same bootstrap (#36).
- **Integration path:** Add a risk-of-ruin/drawdown estimate to `kelly.ts` (or a staking governor) using bootstrap/MC over settled results; surface in cockpit and as proof. **PILOT** → standard reporting.

### 6. Calibration & backtest discipline (META)

> How GSE *proves* its forecasts are good and *keeps itself honest*. This is the second pillar of the brand (proof-first), and it is dense with ADOPT-NOW because GSE already runs isotonic/Murphy/ECE and gates the ladder on calibration. The additions (log loss, CRPS, sharpness, walk-forward/purged CV, bootstrap CIs) are cheap, high-leverage credibility upgrades.

#### 45. Brier score — **in production**
- **Name:** Brier score; quadratic score; mean squared probability error.
- **Definition:** Mean squared error between predicted probabilities and outcomes (0=perfect, lower=better); a strictly proper scoring rule.
- **How it works:** BS = mean((p − y)²). Strictly proper (minimized only by honest probabilities), so it can't be gamed by shading. Decomposes (Murphy, #52) into reliability + resolution + uncertainty.
- **Where it's proven:** Weather (its origin, Brier 1950), GJP, ML classification.
- **GSE relevance:** **ADOPT-NOW — already in production**. Correct core metric. Pair with log loss (#46) and always report with bootstrap CIs (#36).
- **Integration path:** `probability-calibration.ts`; add CIs and per-segment (sport/market/Edge-bucket) Brier.

#### 46. Logarithmic loss (log score)
- **Name:** Log loss; log score; negative log-likelihood.
- **Definition:** Negative log of the probability assigned to the actual outcome; strictly proper, heavily penalizes confident misses.
- **How it works:** LL = −mean(y·log p + (1−y)·log(1−p)). Punishes overconfidence far more than Brier (a confident wrong pick → huge penalty), which is exactly the failure mode a "guaranteed/lock"-banning brand wants to police.
- **Where it's proven:** ML, info theory, probabilistic forecasting; the other standard proper score alongside Brier.
- **GSE relevance:** **ADOPT-NOW.** Cheap to add next to Brier and *more aligned with GSE's brand-safety stance* — it directly numerically penalizes the overconfidence GSE forbids in language. Use it in Model Court so new weights can't sneak in overconfidence.
- **Integration path:** Add to `probability-calibration.ts`; include log loss (with CIs) as a Model-Court acceptance metric and a calibration-monitoring metric.

#### 47. Continuous Ranked Probability Score (CRPS)
- **Name:** CRPS.
- **Definition:** A strictly proper score for *full distributional* forecasts — generalizes absolute error to predictive distributions.
- **How it works:** CRPS = ∫ (F(x) − 1{x≥y})² dx — the integral of the Brier score over all thresholds of the predictive CDF. Rewards both calibration and sharpness of a *distribution* (not just a single probability).
- **Where it's proven:** Weather/ensemble forecasting (the standard there), probabilistic energy forecasting.
- **GSE relevance:** **PILOT.** Becomes valuable exactly when GSE outputs *distributions* — i.e., for the Monte Carlo / play-by-play simulator (#35/#39) and for totals/spreads where the full score distribution matters. Not needed for single-probability moneyline picks.
- **Integration path:** Add CRPS to `probability-calibration.ts` once the `simulation/` module produces distributions; use it to grade the simulator's `priced` candidacy in Model Court.

#### 48. Spherical score
- **Name:** Spherical scoring rule.
- **Definition:** A strictly proper scoring rule based on the normalized probability vector.
- **How it works:** Score = p_y / ||p||₂ (the assigned probability normalized by the vector's Euclidean norm). Strictly proper; a less common alternative to Brier/log.
- **Where it's proven:** Forecasting theory; niche in practice.
- **GSE relevance:** **REFERENCE.** Brier + log loss already cover GSE's needs; spherical adds completeness, not decision value. Catalog for rigor.
- **Integration path:** None required; optional diagnostic only.

#### 49. Reliability diagram / ECE / MCE — **in production**
- **Name:** Reliability diagram (calibration curve); Expected Calibration Error (ECE); Maximum Calibration Error (MCE).
- **Definition:** Visual + scalar measures of whether predicted probabilities match observed frequencies.
- **How it works:** Bin predictions by confidence; plot predicted vs observed frequency (diagonal = perfect). ECE = size-weighted mean |confidence − accuracy| across bins; MCE = worst bin. Points below the diagonal = overconfident.
- **Where it's proven:** ML calibration, meteorology, GJP.
- **GSE relevance:** **ADOPT-NOW — already in production** and wired into the ladder (calibration applied at ≥100 settled, non-worsening ECE). Exactly right. Enhancement: publish the reliability curve (tier-gated) as visual proof, and add MCE so single bad bins are visible.
- **Integration path:** `probability-calibration.ts`; surface the curve publicly as proof; add MCE alongside ECE; keep the non-worsening-ECE gate on every weight change.

#### 50. Isotonic (PAVA) / Platt / beta / temperature scaling — **PAVA in production**
- **Name:** Isotonic regression (via Pool-Adjacent-Violators, PAVA); Platt scaling; beta calibration; temperature scaling.
- **Definition:** Post-hoc transforms that remap raw scores to calibrated probabilities.
- **How it works:** **Isotonic/PAVA** fits a monotone step function (flexible, non-parametric — GSE's choice, and empirically often best on ECE/Brier but needs enough data). **Platt** fits a logistic (2 params, good for small samples/systematic bias). **Beta** is a 3-param logistic on log(s)/log(1−s) (smooth, contains identity). **Temperature** scales logits by one parameter (preserves ranking, low overfitting risk).
- **Where it's proven:** ML calibration across domains; isotonic and Platt are the canonical pair.
- **GSE relevance:** **ADOPT-NOW — isotonic/PAVA already in production** and correctly gated (apply at ≥100 settled, non-worsening ECE). Enhancement: keep Platt/beta/temperature as *small-sample fallbacks* — when a new segment has <~100 settled, a 1–3 param method calibrates safely where isotonic would overfit.
- **Integration path:** `calibration-apply.ts`. Add Platt/beta/temperature as sample-size-aware fallbacks (isotonic once data is sufficient); choose the method by validation ECE; every fit passes the non-worsening-ECE gate.

#### 51. Sharpness vs calibration
- **Name:** Sharpness–calibration principle ("maximize sharpness subject to calibration," Gneiting et al.).
- **Definition:** Among *calibrated* forecasts, prefer the *sharpest* (most concentrated/decisive) ones.
- **How it works:** Calibration = probabilities are truthful; sharpness = they're far from the base rate (decisive). The goal is sharp *and* calibrated — a flat "everything's 52%" forecast can be calibrated but useless. Proper scores (Brier/log/CRPS) reward both jointly.
- **Where it's proven:** Modern probabilistic forecasting theory (Gneiting–Balabdaoui–Raftery).
- **GSE relevance:** **ADOPT-NOW** (as a *governing principle*, not code). This is the precise frame for GSE's tension between confident picks and brand-safe honesty: be as sharp as the data supports, never sharper. It tells Model Court to reward resolution *only when calibration holds* — and explicitly warns against extremizing (#23).
- **Integration path:** Encode as a Model-Court rule: a new weight may increase sharpness/resolution *only if* ECE does not worsen. Report sharpness (resolution term of the Murphy decomposition) next to calibration.

#### 52. Murphy decomposition — **in production**
- **Name:** Murphy decomposition; reliability–resolution–uncertainty (calibration–refinement) decomposition of the Brier score.
- **Definition:** Splits the Brier score into reliability (calibration error), resolution (ability to separate outcomes), and uncertainty (base-rate difficulty).
- **How it works:** BS = Reliability − Resolution + Uncertainty. Reliability↓ is good (well-calibrated), Resolution↑ is good (discriminating), Uncertainty is fixed by the problem. Lets you see *why* a score is what it is — bad calibration vs weak discrimination.
- **Where it's proven:** Meteorology, forecast verification, GJP analysis.
- **GSE relevance:** **ADOPT-NOW — already in production**. Exactly the right diagnostic; it operationalizes sharpness-vs-calibration (#51). Use both terms explicitly in Model Court (reject weights that buy resolution by sacrificing reliability).
- **Integration path:** `probability-calibration.ts`; report reliability and resolution as named Model-Court metrics; show resolution as the "sharpness" number.

#### 53. Walk-forward / purged & embargoed cross-validation / Deflated Sharpe
- **Name:** Walk-forward analysis; purged & embargoed cross-validation (López de Prado); Combinatorial Purged CV (CPCV); Deflated Sharpe Ratio (DSR); Probability of Backtest Overfitting (PBO).
- **Definition:** Time-series-safe backtesting that prevents look-ahead leakage and corrects performance for the number of strategies tried.
- **How it works:** **Walk-forward** trains on the past, tests on the next window, rolls forward. **Purging** removes training samples whose labels overlap the test period; **embargoing** drops samples right after the test set to kill serial-correlation leakage (López de Prado, 2017). **CPCV** generalizes this across many train/test combinations to reconstruct backtest *paths*. **DSR/PBO** deflate the Sharpe (or success metric) for multiple-testing/selection bias so a strategy that "won" only because you tried 500 variants is exposed.
- **Where it's proven:** Quantitative finance (the standard for credible ML backtests); directly applicable to any model selected on time-ordered settled bets.
- **GSE relevance:** **ADOPT-NOW.** This is the discipline that makes GSE's whole ladder *trustworthy*: every weight/model promotion is a strategy selected from many candidates on time-ordered data, so without purging/embargoing and deflation, "out-of-sample" is an illusion and CLV thresholds can be overfit. It's the rigorous spine **Model Court** needs.
- **Integration path:** Build a backtest harness enforcing walk-forward + purge + embargo for *every* candidate weight/model; make **passing purged-embargoed out-of-sample with a deflated metric a hard Model-Court requirement**, alongside non-worsening ECE. Report PBO for any selected weight. This upgrades the existing "out-of-sample" gate from nominal to bulletproof.

#### 54. Causal inference — DiD / synthetic control / uplift modeling
- **Name:** Difference-in-differences (DiD); synthetic control; uplift/treatment-effect modeling; (event-study).
- **Definition:** Methods to estimate the *causal* effect of an intervention — here, "did GSE's published pick actually move the line?"
- **How it works:** **DiD** compares the before/after change in the treated market (GSE published) to a control market (similar games GSE didn't publish), differencing out common trends. **Synthetic control** builds a weighted combination of control markets that mimics the treated market pre-publication, then attributes the post gap to the pick. **Uplift** models the incremental effect of treatment at the unit level. Isolates GSE's footprint/influence from normal market drift.
- **Where it's proven:** Econometrics, epidemiology, marketing-lift measurement, policy evaluation.
- **GSE relevance:** **PILOT.** Not a game forecaster — a *meta* tool to prove a striking, marketable claim: "GSE's picks move markets." Also a guardrail: if GSE's own publishing *causes* line movement, that contaminates naive CLV, and these methods quantify/correct it. High narrative value, scoped scope.
- **Integration path:** Offline analysis joining publish timestamps to line histories; DiD/synthetic-control vs unpublished comparable games. **PILOT** as a periodic study feeding cockpit + tier-gated proof content; if publishing materially moves lines, feed the correction back into `clv.ts` so CLV credits genuine pre-market edge, not self-inflicted movement.

### 7. Recommended adoption sequence for GSE (market/judgmental/simulation/calibration, wired to the proof ladder)

**FOUNDING (now → first 100 settled): harden the proof layer (cheap, high-trust).**
1. **Bootstrap confidence intervals (#36)** on CLV / win rate / Brier — every headline number gets error bars. *(Highest credibility-per-hour.)*
2. **Log loss (#46)** beside Brier in `probability-calibration.ts` and as a Model-Court metric — numerically polices the overconfidence the brand bans.
3. **De-vig cross-checks (#4, #5)** — emit multiplicative + additive alongside Shin into the receipt; makes the de-vig auditable for free.
4. **Sharpness/resolution reporting (#51, #52)** — already have Murphy; expose resolution explicitly and adopt "sharp only if calibrated" as a written Model-Court rule.
5. **Sharp-book-anchored consensus + CLV (#3, #14)** — make the CLV benchmark the *sharpest* no-vig close; add a sharpness-weighted consensus in SHADOW.

**PROVEN (≥100 settled + calibration): make the engine's weights *earned*.**
6. **Walk-forward + purged/embargoed CV + Deflated Sharpe (#53)** — stand up the backtest harness; make purged out-of-sample + deflation a *hard* gate for every weight. This is the spine the ladder claims to have.
7. **Brier/CLV-weighted consensus & component weights (#22, #28)** — replace any hand-set weights with accuracy-earned weights via Model Court; benchmark against the equal-weight average (#27).
8. **Calibration fallbacks (#50)** — add Platt/beta/temperature for thin segments so new sports/markets calibrate safely before isotonic has data.
9. **Edge-bucket → realized-CLV calibration (#17, #43)** — set the publish threshold empirically; tie stake fraction to it.

**ESTABLISHED (≥500 + CLV≥52.4%): add orthogonal signals & a secondary engine.**
10. **Kalshi/exchange second market read (#2)** — SHADOW→PILOT, promote on incremental CLV.
11. **Steam / RLM formalized in Market Gravity (#11, #13)** — *only* with a canonical ticket/handle feed; timestamped into the receipt as pre-close proof.
12. **Play-by-play / Monte Carlo simulator (#35, #39)** — SHADOW→PILOT for derived/prop markets and Studio content; CRPS (#47) to grade its distributions; risk-of-ruin (#44) into staking.
13. **Log/geometric consensus pool (#33)** and **power de-vig on props (#7)** — head-to-head PILOTs vs current median/Shin.

**AUTHORITY (≥2000 + CLV≥55%): blend models & prove influence.**
14. **Forecast combination of `priced` models (#29 Bates–Granger, #31 stacking/super learner)** — combine market read + Elo/Poisson/GBM under full purged-CV + DSR; constrained/interpretable combiners preferred.
15. **Causal "we move the line" study (#54)** — DiD/synthetic control as marquee proof content *and* a CLV-contamination guard.
16. **(Optional) BMA / mixture-of-experts (#30, #32)** once ≥3 models justify principled or regime-specific blending.

### 8. Cheapest highest-leverage wins for a market-first shop

These are the moves with the **best credibility-and-edge per engineering hour** — most are days, not weeks, and several are pure reporting/transparency upgrades that compound GSE's proof-first brand:

1. **Bootstrap CIs on every metric (#36)** — turns point-estimate claims into defensible, error-barred proof. ~1 utility, used everywhere. *Do this first.*
2. **Log loss next to Brier (#46)** — a few lines; directly enforces the no-overconfidence brand in numbers, not just words.
3. **De-vig cross-check fields (multiplicative/additive/power) in the receipt (#4/#5/#7)** — near-free; makes the Shin choice auditable and on-brand (proof of method).
4. **Sharp-book-anchored CLV + sharpness-weighted consensus (#3/#14)** — small change to which line is the benchmark/weight; likely a real accuracy and CLV-integrity gain.
5. **Walk-forward + purge/embargo + Deflated Sharpe as a hard Model-Court gate (#53)** — the single biggest *integrity* upgrade; converts "out-of-sample" from nominal to bulletproof and protects the CLV thresholds from overfitting.
6. **Brier/CLV-earned weights vs the equal-weight benchmark (#22/#27)** — principled, ladder-aligned way to set the 13-component and book weights; nothing ships unless it beats the dumb average out-of-sample.
7. **Publish the reliability curve + Murphy resolution (tier-gated) (#49/#52)** — you already compute these; surfacing them visually is marketing-grade proof at near-zero cost.
8. **Risk-of-ruin / drawdown readout on staking (#44)** — one computation off the bootstrap; completes the trust story and is excellent tier-gated content ("at quarter-Kelly your modeled max drawdown is X").

*Prepared by the GSE Research wing. No fabricated data; the brand bans certainty language (the literal banned-term list: guaranteed / lock / sure-thing / risk-free, and their kin). All ratings tie to the FOUNDING→PROVEN→ESTABLISHED→AUTHORITY proof ladder and the Model-Court acceptance criteria (prosecution + defense + falsifier + purged out-of-sample + no calibration regression + owner approval).*

---

## Part 5 — Fantasy-native distributional & allocation methods (8)

*Research wing, Galaxy Sports Edge executive advisory panel. Scope: the distributional and allocation methods the **fantasy product** needs — the family the betting-first catalogue (Parts 1–4) was missing, surfaced by `GSE_INTEL_00_RIGOR_PASS.md`. Cataloged against the live GSE fantasy stack: the market-anchored allocation Core (`lib/projections/market-anchored.ts`) that conserves **physical units** (yards, TDs) and derives fantasy points as an output; per-player rate posteriors (`lib/rates/player-rate-posterior.ts`: Beta-Binomial + Normal-Normal + Dirichlet); the `tweedie-baseline.ts` scaffold; the gated weekly model (`weekly-model.ts`, `canPublishProjections=false`) and best-ball surface (`bestball.ts`); and the same two-track proof ladder (fantasy track graded on per-position MAE + interval coverage + rank-correlation; betting track on CLV + Brier). Date: 2026-06-23.*

### Orientation

Parts 1–4 catalogued the *betting* engine — strength ratings, market de-vig, calibration, simulation — and rated them well. They were thin on one thing: the **shape of a fantasy outcome**. A fantasy-points score is not a win/loss bit and not a margin; it is a **non-negative, zero-inflated, right-skewed** quantity (a player can post 0.0 by not playing or not producing, then a long tail of ceiling games), and the products built on it — best-ball, DFS stacks, parlays — are *all about the joint distribution across correlated players*, not point estimates. Modeling that with the betting family's tools (a logistic win-prob, a Gaussian interval, independent projections) is a category error: it is the same dimensional mistake the rigor pass caught in the market-anchor keystone (C1), one level down.

This part adds the methods that model the fantasy outcome **in its own units**. The strategic read mirrors the rest of the Atlas — most value, least risk, fits the gates:

1. **The distribution itself** — a Tweedie (compound Poisson–Gamma) is the *native* law for fantasy points (point mass at zero + continuous skewed tail), directly available as `objective="tweedie"` in the GBMs Part 3 already chose. This is the base estimator; zero-inflated/hurdle and GAMLSS are its refinements.
2. **The allocation layer** — fantasy projection is fundamentally *dividing a team's expected production across a roster*. The Dirichlet-multinomial is the correct tool for a share vector that must sum to one *with* uncertainty, and it feeds the Core's conservation step honestly (it is exactly the simplex the market-anchored allocator needs).
3. **The correlation layer** — a Gaussian copula glues the per-player marginal posteriors into a *joint* distribution, which is what best-ball spike-weeks, DFS stacking, and parlay pricing all actually require. One covariance model powers all three (the one-engine-many-products thesis, extended to risk).
4. **Ranking and multi-sport** — Plackett-Luce for finish-order/ADP/ownership, and the Skellam (difference of two Poissons) for margins / puck lines / run lines, which the advisory's multi-sport Top-Moves wanted and Parts 1–2 omitted.

The discriminating cut is the same as everywhere in this Atlas: **NFL is small-sample and the surface is audit-first.** The historical nflverse harness (regular-season PBP back to 1999) supplies *thousands* of player-weeks per position immediately — so unlike the betting track's game-level n, the fantasy track is not sample-starved, which is precisely why a distributional model is feasible here. The one method that still fails the bar is the neural one (Mixture Density Networks): it needs more data than even the player-week harness gives and cannot be explained on `/explain`. Every verdict below ties to the two-track ladder, the `canPublishProjections=false` wall, and Model Court.

### Quick comparison table

| Method | Core idea | Fantasy job | GSE verdict | Nearest GSE surface |
|---|---|---|---|---|
| **Tweedie GLM / GB-Tweedie** | Compound Poisson–Gamma: mass at 0 + skewed tail | Base fantasy-points law | **ADOPT-NOW** (scaffold honest, GLM is `[DATA]`) | `tweedie-baseline.ts` |
| **Zero-inflated / hurdle** | Separate *plays-at-all* from *how much* | Low-usage + anytime-TD | **PILOT** | `tweedie-baseline.ts` companion |
| **Dirichlet-multinomial** | Uncertain share vector summing to 1 | Target/touch-share allocation | **ADOPT-NOW** | `lib/rates/player-rate-posterior.ts` → `market-anchored.ts` |
| **GAMLSS / distributional regression** | Model mean, variance, skew vs covariates | Honest non-constant spread | **PILOT** | `lib/projections/distribution.ts` |
| **Plackett-Luce** | Probabilistic finish-order / ranking | ADP, ownership, weekly finish | **REFERENCE→PILOT** | new `lib/projections/rank-model.ts` |
| **Skellam** | Difference of two Poissons | Margins, puck lines, run lines | **PILOT** (multi-sport) | `poisson.ts` (+ `team-rates.ts`) |
| **Gaussian copula** | Dependence structure over marginals | Stacks / best-ball / parlay correlation | **ADOPT-NOW** (fantasy) | `lib/projections/correlation.ts` |
| **Mixture Density Networks** | Neural mixture-of-Gaussians output | Flexible conditional density | **REFERENCE** | none (sample-hungry / opaque) |

### Distributional core

#### Tweedie GLM and gradient-boosted Tweedie
- **Name (aliases):** Tweedie distribution / Tweedie GLM (the compound Poisson–Gamma case, power parameter `1 < p < 2`); gradient-boosted Tweedie (`objective="tweedie"` in XGBoost/LightGBM); Tweedie deviance regression.
- **One-line definition:** The native probability law for fantasy points — a single distribution that places a **point mass at exactly zero** (didn't play / didn't produce) and a **continuous, right-skewed positive tail** above it.
- **How it works:** Tweedie is an exponential-dispersion family whose variance follows `Var(Y) = φ · μ^p`. For `1 < p < 2` it equals a **compound Poisson–Gamma process**: a Poisson number of "events" (catches, carries, scores) each contributing a Gamma-distributed magnitude, so the realized sum is zero whenever the event count is zero and a skewed positive number otherwise — exactly the empirical shape of a player's weekly fantasy total. Fitting maximizes the Tweedie log-likelihood (equivalently minimizes Tweedie deviance); a GBM plugs the Tweedie deviance in as its training objective and boosts trees along its gradient, giving a flexible conditional mean with the correct error law baked in. The power `p` is itself tunable (often fit by profile likelihood).
- **Where it's proven:** Insurance actuarial pricing is its home turf — aggregate claim cost is the textbook compound Poisson–Gamma (many zero-claim policies + a skewed cost tail), and Tweedie GLMs/GBMs are the industry standard there. Increasingly used wherever a non-negative semicontinuous target with a zero spike appears (rainfall, ecology, healthcare spend) — and fantasy points are the same shape.
- **GSE relevance: ADOPT-NOW** as the base fantasy estimator. It is the single most-correct modeling choice in this part: it matches the data-generating shape instead of bolting an interval onto a mis-specified Gaussian, it is directly available in the GBMs Part 3 already selected (no new dependency), and the fantasy track's evaluation (per-position MAE + interval coverage) rewards exactly the calibrated uncertainty Tweedie gives *by construction*. The historical player-week harness supplies enough data to fit it honestly, so it clears the small-sample worry the betting track lives with.
- **Real-repo nuance (truth-in-labeling):** the current `tweedie-baseline.ts` is a **Tweedie-flavored boosted-stump scaffold, not a fitted Tweedie GLM**: `fitTweedieBaseline` trains stumps on **L2 loss of `log1p(actual)`** and never uses `tweediePower` in the loss, so it is the right *frame* with the wrong *objective*. The honesty note already in the file forbids any public surface from calling it a fitted Tweedie model. Wiring the **actual Tweedie deviance gradient** into the boosting loss (or fitting a true Tweedie GLM) is the open `[DATA]` follow-up; until it lands, the export should read as `boostedLog1pBaseline`-grade, not "Tweedie."
- **Integration path:** `tweedie-baseline.ts` (exists, scaffold). Step 1 — implement the Tweedie deviance gradient/Hessian as the boosting objective (or fit a Tweedie GLM head), tune `p` by profile likelihood, and drop the truth-in-labeling caveat once the loss is genuinely Tweedie. Step 2 — make it the base estimator feeding `lib/projections/distribution.ts` (its predicted mean + dispersion give the ceiling/floor/spike-prob/bust-risk the frontier addendum wants). It rides the **fantasy track** (MAE + coverage + rank-corr), never the CLV track; stays behind `canPublishProjections=false` and the projection-leakage test until cleared, then graduates on the historical-harness backtest via Model Court.

#### Zero-inflated / hurdle models
- **Name (aliases):** Zero-inflated Poisson / Negative-Binomial (ZIP / ZINB); hurdle models (two-part / "play-or-not then how-much"); compound binomial-continuous models.
- **One-line definition:** A two-component model that separates the probability a player **produces at all** from the magnitude **given** that they produce, instead of forcing one distribution to explain both.
- **How it works:** A **hurdle** model fits a binary "clears zero?" stage (logistic on availability/usage features) and a strictly-positive magnitude stage (truncated count or Gamma) for those that clear; the two multiply. A **zero-inflated** model mixes a point mass at zero with a full count distribution, so zeros arise *either* from the inflation component *or* as ordinary draws from the count. Both explicitly parameterize the excess zeros that a plain Poisson/Gaussian under-predicts.
- **Where it's proven:** Ecology (species counts with many absences), healthcare utilization (many zero-visit patients), insurance claim frequency — any count with more zeros than a single law allows.
- **GSE relevance: PILOT.** A principled refinement of the Tweedie base for the cases where the zero is *structurally distinct*: a deep-bench player whose fantasy zero is mostly an **availability/usage** question (did he get on the field) rather than an efficiency one, and **anytime-TD** props where "scores at all" is the entire question. Splitting those two stages can calibrate the low-usage tail better than Tweedie's single mechanism. It is a PILOT not an ADOPT because Tweedie already handles the zero spike adequately for most rostered players, so this must *prove* incremental coverage/MAE on the historical harness before it earns a slot.
- **Integration path:** A companion mode beside `tweedie-baseline.ts` (a `hurdle` option that reuses the existing availability signal from `lib/projections/availability-forecast.ts` as the stage-one feature) feeding `distribution.ts`. Evaluate head-to-head against the Tweedie base on per-position coverage for low-usage/TD buckets specifically; promote only where it wins. Same fantasy-track ladder, same `canPublishProjections` wall.

### Allocation layer

#### Dirichlet-multinomial
- **Name (aliases):** Dirichlet-multinomial (DM); compound multinomial; Dirichlet-multinomial conjugacy (the multi-category generalization of Beta-Binomial, §20).
- **One-line definition:** The correct distribution for an **uncertain share vector that must sum to one** — here, the split of a team's targets / carries / red-zone touches across its roster — carrying calibrated uncertainty on every share.
- **How it works:** Put a `Dirichlet(α₁,…,α_K)` prior over the `K` roster-slot shares; observe touch counts `c_k`; the posterior is `Dirichlet(α₁+c₁,…,α_K+c_K)`, with posterior-mean share `(α_k+c_k)/Σ(α_j+c_j)`. The α's act as pseudo-counts (a prior usage profile by archetype), so a thin sample shrinks toward the prior and a full sample takes over — closed-form, no MCMC, fully auditable. Crucially the draws are a *coherent simplex*: the shares are jointly constrained to sum to 1, unlike independently-estimated per-player rates.
- **Where it's proven:** Text/topic modeling (word-share over a vocabulary), microbiome composition, market-share estimation — anywhere a categorical *composition* is estimated from counts with uncertainty. It is the exact conjugate machinery GSE already uses for the player usage simplex.
- **GSE relevance: ADOPT-NOW** for the target-share / touch-share allocation layer. This is the honest engine for the Core's keystone: the market-anchored allocator divides expected team **yards and TDs** across players by usage posteriors, and those usage posteriors *must be a coherent share vector summing to one* or the conservation invariant (`Σ recYds = passYds_team`, `Σ TD = teamTD`) is violated. Dirichlet-multinomial provides exactly that simplex **with** uncertainty, so the allocation propagates honest error bars instead of pretending the shares are known. It dovetails with the already-ADOPT Beta-Binomial/Dirichlet conjugate entry (§20) — this is its allocation-layer application.
- **Integration path:** Lives in `lib/rates/player-rate-posterior.ts` (the `family: "dirichlet"` posterior already specified there) and is consumed by `lib/projections/market-anchored.ts`'s `allocate(teamTotal, posteriors[], context)` step. The DM posterior mean gives the share, its concentration gives the uncertainty that feeds the projection interval; the conservation tests (sum-to-team-total on *physical units*, monotone allocation, projection-leakage) are the acceptance gates. Closed-form and conservative, so it can enter the fantasy track as a single Model-Court sign-off on the allocation invariant rather than a long shadow.

### Distributional regression & ranking

#### GAMLSS / distributional regression
- **Name (aliases):** GAMLSS (Generalized Additive Models for Location, Scale and Shape, Rigby & Stasinopoulos); distributional regression; "regression for the whole distribution" (incl. the Bayesian framing, e.g. `brms` distributional models).
- **One-line definition:** A regression framework that lets **every parameter of the response distribution — mean (location), variance (scale), and skew/kurtosis (shape) — be its own function of covariates**, instead of modeling only the mean and assuming constant spread.
- **How it works:** Pick a (possibly skewed, possibly zero-adjusted) response family, then fit separate additive predictors `g₁(μ)=…`, `g₂(σ)=…`, `g₃(ν)=…` for each parameter, each a sum of smooth spline terms (the GAM machinery of Part 2 §12, applied per-parameter). The result is a *covariate-dependent full predictive distribution*: variance can grow with projected volume, skew can change by position, all fit by penalized likelihood.
- **Where it's proven:** Childhood growth-reference charts (the WHO/UK centile curves are GAMLSS), insurance, environmental extremes — settings where "the spread itself changes with the predictors" is the whole point.
- **GSE relevance: PILOT.** The disciplined upgrade once Tweedie is live: a Tweedie GBM gives a flexible *mean* with a fixed dispersion law, but fantasy spread genuinely is **heteroscedastic** — a workhorse RB's floor/ceiling band is much tighter than a boom-bust deep threat's at the same projected mean. GAMLSS models that scale-and-shape variation explicitly, which directly sharpens the floor/ceiling/spike numbers `distribution.ts` publishes. It is a PILOT because it is heavier to fit and audit than a single Tweedie objective, so it must demonstrate better *interval coverage by archetype* on the harness before it displaces the simpler model. Fits the "math you can read" ethos (it is still additive splines, fully inspectable).
- **Integration path:** A distributional-regression option inside `lib/projections/distribution.ts` that takes the Tweedie/usage features and emits position-and-volume-dependent scale/shape, replacing any constant-dispersion assumption in the ceiling/floor band. Pilot-gated on per-position coverage (does the modeled 80% interval cover 80% *within each archetype*), validated against the Tweedie base; rides the fantasy track behind the projection wall.

#### Plackett-Luce
- **Name (aliases):** Plackett-Luce model (Plackett 1975 / Luce 1959); the ranking generalization of Bradley-Terry (§ Part 1); exploded-logit / rank-ordered logit.
- **One-line definition:** A probabilistic model of a **full finishing order** built from per-item strength parameters — the probability of a ranking is the product of "this item wins among those still unranked" choices down the order.
- **How it works:** Give each item (player) a positive worth `w_j`; the probability of a particular full ordering is `∏_positions w_(chosen) / Σ(w over remaining)` — i.e. repeated softmax selections without replacement (a "Luce choice" applied sequentially, hence exploded logit). Fit the worths by maximum likelihood over observed orderings; it reduces to Bradley-Terry for pairwise data and extends cleanly to partial rankings and top-k.
- **Where it's proven:** Horse-racing finish-order modeling (its original use), recommender/learning-to-rank systems, election and preference data, ML-leaderboard aggregation — anywhere outcomes are *orderings* rather than independent magnitudes.
- **GSE relevance: REFERENCE→PILOT.** REFERENCE today (GSE ships per-player magnitude projections, not finish-order claims), but it graduates to PILOT precisely for the **ranking-shaped** fantasy questions the magnitude models handle awkwardly: weekly **position finish order** (who is the RB1 this week, not just each RB's points), **ADP** and **ownership** modeling (both are aggregate orderings), and best-ball "spike-week" framing where *relative* finish within a stack matters. It is the principled counterpart to the Tweedie *level* model — level for "how many points," Plackett-Luce for "in what order."
- **Integration path:** A new `lib/projections/rank-model.ts` deriving Plackett-Luce worths from the same player posteriors (a monotone transform of projected mean is the natural starting worth) to emit finish-order probabilities and ADP/ownership-style rankings; consumed by `bestball.ts` for relative-finish/stack context. Pilot-gated on **rank-correlation** (the fantasy ladder's native rank metric — Spearman/Kendall of predicted vs realized weekly order), which is exactly what a ranking model should be scored on. Stays gated and on the fantasy track.

### Multi-sport margin

#### Skellam distribution
- **Name (aliases):** Skellam distribution (J.G. Skellam, 1946); difference-of-two-Poissons distribution; Poisson-difference distribution.
- **One-line definition:** The exact distribution of the **difference between two independent Poisson counts** — i.e. the margin when each team's score is Poisson — giving closed-form probabilities for every integer margin (including ties).
- **How it works:** If home goals `~ Poisson(λ_H)` and away goals `~ Poisson(λ_A)` independently, the margin `D = goals_H − goals_A` follows a Skellam with a closed-form PMF in terms of `λ_H`, `λ_A` and a modified Bessel function of the first kind. From that PMF you read off `P(margin = k)` for any `k`, hence `P(home win)`, `P(tie)`, and — by summing the tail past a line — `P(cover)` for a **puck line / run line / margin spread** directly, without simulation.
- **Where it's proven:** Soccer/hockey goal-margin and "winning margin" markets (the natural companion to the Poisson/Dixon-Coles scoreline models of Part 1), and any setting modeling the difference of two count processes (e.g. sports point-differentials, A/B count deltas).
- **GSE relevance: PILOT (multi-sport).** This is the margin tool Parts 1–2 omitted: GSE's Poisson family (Part 1) gives each team's scoring rate, and Skellam turns those two rates into a **closed-form margin distribution** — the cleanest route to NHL **puck-line** and MLB **run-line** cover probabilities and to a margin-of-victory read generally, all without a Monte-Carlo step. It rides the **betting track** (CLV + Brier), and like the rest of the Poisson family it is gated behind a legitimate `team-rates.ts` scoring-rate source (the same dependency currently blocking the Poisson scaffold) — no fabricated rates. PILOT pending that source and a backtest against the simulated-margin baseline.
- **Integration path:** A `skellam()` reader layered on `poisson.ts`: once `team-rates.ts` supplies `λ_H`, `λ_A`, emit the Skellam margin PMF and derive puck-line/run-line/spread cover probabilities priced=false for NHL/MLB. Calibrate the implied margin probabilities against settled results; advance on the standard betting ladder via Model Court. Stays blocked until the rates source lands.

### Correlation layer

#### Gaussian copula
- **Name (aliases):** Gaussian copula (the C6 correlation layer of `GSE_INTEL_00_RIGOR_PASS.md`); normal copula; correlation-aware joint sampler. (See also the general copula entry in Part 2 §32 — Gaussian / t / Archimedean / vine.)
- **One-line definition:** A method that couples the **per-player marginal posteriors** into a **joint** distribution via a single correlation matrix — modeling *how players' outcomes move together* (QB↔WR up, RB↔team-pass down) separately from each player's own distribution.
- **How it works:** By Sklar's theorem, map each player's marginal (the Tweedie/usage posterior) to a uniform via its CDF, then to a standard normal via the inverse normal CDF; impose a correlation matrix `Σ` on those normals and sample jointly; finally invert back through each marginal to get correlated draws *in fantasy-point units*. `Σ` is estimated empirically from historical co-movement — QB and his pass-catchers positively correlated (~0.5; the rigor pass cites QB–WR1 ≈ 0.47–0.56), a back negatively correlated with his own team's pass volume, two players in the same game tied through the game total. The Gaussian copula captures the *linear* dependence cleanly and cheaply; a t-copula (Part 2 §32) is the upgrade if joint *tail* dependence proves material.
- **Where it's proven:** Multi-asset portfolio and credit risk (famously both enabling and, when misused, mispricing correlated risk), insurance aggregation — any place the dependence between margins matters as much as the margins themselves. The same machinery applies directly to correlated player outcomes.
- **GSE relevance: ADOPT-NOW** for fantasy. Independent per-player projections **silently break the exact products the fantasy frontier sells** — best-ball spike-weeks, DFS stacks, and parlays are *defined by* correlation, and pricing them off independent marginals understates stack ceilings and misprices parlay legs. A Gaussian copula over the marginal posteriors fixes this with one auditable covariance model, and it embodies the one-engine-many-products thesis: the *same* `Σ` powers best-ball correlation, DFS stacking, and parlay correlation. It is the C6 fix the rigor pass added, promoted here from "missing" to a first-class ADOPT-NOW entry.
- **Integration path:** The new `lib/projections/correlation.ts` (specified in the rigor pass): estimate `Σ` empirically (QB↔pass-catchers, RB↔team-pass, game-stack via total), expose a `sampleJoint(posteriors[], Σ)` that returns correlated fantasy-point draws, and consume it from `bestball.ts` (spike-week correlation), `lib/projections/distribution.ts` (joint ceiling/floor for lineups), and any future parlay surface. Rides the fantasy track (and, for parlay correlation, the betting track's pricing); the correlation matrix itself becomes an `/explain`/`/audit` artifact ("here is the QB-WR correlation we priced"). Gated behind `canPublishProjections=false` for published lineups until the joint model clears its coverage backtest.

### Neural distributional (reference only)

#### Mixture Density Networks
- **Name (aliases):** Mixture Density Network (MDN, Bishop 1994); neural mixture-of-Gaussians / mixture-of-experts density output; conditional density estimation network.
- **One-line definition:** A neural network whose outputs are the **parameters of a mixture distribution** (the weights, means, and variances of several Gaussians), so it can represent a flexible, multi-modal conditional density rather than a single point or single Gaussian.
- **How it works:** The final layer emits, per input, a set of mixture weights `π_k` (softmax), component means `μ_k`, and variances `σ_k`; the predicted density is `Σ_k π_k · N(μ_k, σ_k)`, trained by maximizing the mixture log-likelihood. This lets one model output skewed, fat-tailed, or bimodal predictive distributions that depend on the covariates.
- **Where it's proven:** Inverse problems and multi-modal regression (robotics control, speech/handwriting synthesis, some financial density forecasting) — settings with abundant data where the conditional distribution is genuinely multi-modal.
- **GSE relevance: REFERENCE.** It targets the right object (a full, flexible predictive density) but fails GSE's two binding constraints: it is **sample-hungry** (a neural density estimator needs far more than even the player-week harness gives before it stops overfitting) and **unexplainable** on an audit-first surface (a mixture component has no `/explain` meaning, and it cannot be defended in Model Court). Everything an MDN would buy GSE is already delivered, *explainably*, by the Tweedie base (correct skewed law), GAMLSS (covariate-dependent scale/shape), and the Gaussian copula (joint structure). Catalog it for completeness and as the post-scale revisit candidate, not a build.
- **Integration path:** None. If GSE ever reaches a data scale and a separate research budget where a neural density model is defensible, the MDN is the reference design — but until then the Tweedie + GAMLSS + copula stack covers the same ground inside the explainability and sample constraints, and the MDN stays on the reference shelf.

### Recommended adoption sequence for GSE (fantasy-native)

Tied to the **fantasy track** of the two-track ladder (per-position MAE + interval coverage + rank-correlation; the historical nflverse harness supplies the samples immediately) and the `canPublishProjections=false` wall + Model Court. The throughline: **get the distribution and the allocation right first (they are the honest base and the keystone), add correlation so the multi-product surfaces are not silently broken, then refine spread and ranking, and carry Skellam onto the betting track for multi-sport margins.**

1. **Tweedie base — finish the objective (`tweedie-baseline.ts`).** Wire the real Tweedie deviance gradient (or a Tweedie GLM head) so the model *is* Tweedie, drop the truth-in-labeling caveat, and make it the base estimator feeding `distribution.ts`. Highest-leverage: it makes the uncertainty bands honest by construction. Fantasy track, harness backtest, Model Court.
2. **Dirichlet-multinomial allocation (`player-rate-posterior.ts` → `market-anchored.ts`).** Closed-form share-simplex with uncertainty that satisfies the Core's conservation invariant; single Model-Court sign-off on the allocation tests. Ship alongside the Tweedie base — they are the two halves of one honest projection.
3. **Gaussian copula correlation (`lib/projections/correlation.ts`).** The C6 fix: one empirical `Σ` powering best-ball, DFS stacking, and parlay correlation. Add as soon as the marginals are trustworthy, because independent projections mis-serve every multi-player product. Coverage backtest on joint draws.
4. **GAMLSS distributional regression (`distribution.ts`).** Replace any constant-dispersion assumption with covariate-dependent scale/shape so floor/ceiling/spike numbers are archetype-honest. PILOT, validated on per-archetype interval coverage against the Tweedie base.
5. **Zero-inflated / hurdle companion (`tweedie-baseline.ts` mode).** Reuse the availability signal to sharpen the low-usage + anytime-TD tail where the structural zero is distinct. PILOT, promote only where it beats Tweedie on those buckets.
6. **Plackett-Luce ranking (`lib/projections/rank-model.ts`).** REFERENCE→PILOT for weekly finish order, ADP, and ownership; scored on rank-correlation, the fantasy ladder's native metric.
7. **Skellam margins (`poisson.ts`, blocked on `team-rates.ts`).** *Betting track, multi-sport.* Closed-form NHL puck-line / MLB run-line cover probabilities off the Poisson rates; stays blocked until a legitimate scoring-rate source lands, then priced=false → calibrate → ladder.

**Reference shelf (not a build):** Mixture Density Networks — sample-hungry and unexplainable; the Tweedie + GAMLSS + copula stack delivers the same flexible, correlated, calibrated distribution inside GSE's data and audit constraints. Revisit only post-scale with a dedicated research budget.

*Methods cataloged: 8 (Tweedie/GB-Tweedie, zero-inflated/hurdle, Dirichlet-multinomial, GAMLSS, Plackett-Luce, Skellam, Gaussian copula, Mixture Density Networks). Naming and mechanism details verified against the source families (Tweedie exponential-dispersion / compound Poisson–Gamma; Rigby–Stasinopoulos GAMLSS; Plackett 1975 / Luce 1959; Skellam 1946; Sklar's-theorem copulas; Bishop 1994 MDN) and reconciled against `GSE_INTEL_00_RIGOR_PASS.md` C1/C6 and the live GSE projection surfaces. Verdicts tie to the two-track proof ladder (fantasy: MAE + coverage + rank-correlation; betting: CLV + Brier), the `canPublishProjections=false` wall, and Model-Court acceptance.*

---

*Companion document: `GSE_EXECUTIVE_ADVISORY_PASS.md`.*
