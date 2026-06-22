# GSE 2026 — Analytics & Projection Methods Catalog

A practitioner catalog of statistical / projection / forecasting **methods** Galaxy
Sports Edge (GSE) can use — both **in-sport** and **transferred from outside sports**
— with enough detail to implement, plus a clear map of what GSE already has versus
gaps.

**Scope & integrity.** This is a methods catalog, not a performance claim. No accuracy
figures are asserted for GSE here; any numbers below are quoted from cited external
sources and are about *those* studies, not GSE. Where a method's value is uncertain or
contested (e.g. extremizing), it is flagged. Methods are mapped to GSE surfaces and to
the engine files where an implementation would live (`packages/prediction-engine/src/*`,
`apps/web/lib/gse/*`).

**Confirmed GSE baseline** (read from code, June 2026): GSE already has Elo win-prob
(`elo-estimator.ts`), opponent-adjusted efficiency (`opponent-adjusted.ts`), Poisson
score grid (`poisson.ts`, built but *not wired*), Shin de-vig (`shin-devig.ts`),
fractional Kelly (`kelly.ts`), CLV (`clv.ts`), isotonic calibration + Brier
decomposition + ECE (`probability-calibration.ts`, R&D / not live), weighted composite
scoring (`composite-score.ts`), player season projection with regression-to-mean
(`player-projection.ts`), edge engine + significance, consensus/consensus-view,
conviction tiering, settlement, and calibration-drift tracking. Several modules are
deliberately "built but founder-gated, not wired into live scoring" — that nuance is
preserved below (marked **HAVE\***).

---

## How to read each entry

For each method: **what it does · inputs → outputs · where it shines · failure modes ·
GSE translation (which surface/score it improves) · difficulty · HAVE/GAP**.

- **HAVE** — implemented and wired (or essentially so).
- **HAVE\*** — implemented in-engine but founder-gated / not in the live scoring path.
- **GAP** — not present; candidate to build.
- Difficulty: easy / med / hard (relative engineering + validation cost).

---

# PART A — IN-SPORT METHODS

### A1. Elo power ratings
- **What**: Logistic skill rating; expected score `E = 1/(1+10^(-Δ/400))`, update
  `R' = R + K·(S−E)`. 538 popularized margin-of-victory and travel/rest tweaks.
- **In→out**: game results (± MOV, home flag) → rating per team → win prob.
- **Shines**: cheap, online, interpretable; strong baseline; needs no box score.
- **Failure modes**: single scalar ignores matchup/style; K-tuning sensitive; cold-start;
  no native uncertainty.
- **GSE translation**: already an independent "referee" in `independentFairValues`
  feeding the edge engine. ([538 methodology](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/))
- **Difficulty**: easy. **HAVE** (`elo-estimator.ts`, `elo-backtest.ts`).

### A2. Glicko-2 (rating deviation + volatility)
- **What**: Elo + per-team uncertainty (RD) + a volatility (σ) that widens after surprises
  and during layoffs; mean-reverts uncertainty over idle time.
- **In→out**: results + time gaps → (rating, RD, σ) → win prob *with* a confidence band.
- **Shines**: data-efficient early estimates; principled handling of streaks/layoffs;
  one empirical CS study put Glicko-2 at 63.1% vs Elo 62.8% / TrueSkill 62.9% (their
  data, not ours). ([Glicko-2 overview](https://www.emergentmind.com/topics/glicko2-rating-system))
- **Failure modes**: more params to tune; still scalar skill; draws need care.
- **GSE translation**: gives every Elo-style estimate an *uncertainty*, which can gate
  conviction tiers and widen/narrow intervals — directly serves the "calibrated, not
  confident" thesis.
- **Difficulty**: med. **GAP**.

### A3. Massey ratings (least-squares)
- **What**: Solve `M·r = p` where margins are regressed onto team indicators; ridge for
  stability. Yields offense/defense splits.
- **In→out**: game margins → linear-system rating vector → predicted margin/spread.
- **Shines**: uses scores not just W/L; full-schedule simultaneous solve.
- **Failure modes**: blowout-sensitive (cap margins); assumes additivity; needs schedule
  connectivity.
- **GSE translation**: alternative independent spread estimator; cross-checks
  `opponent-adjusted.ts`. ([Massey/Colley primer](https://towardsdatascience.com/rating-sports-teams-maximizing-a-generic-system-772144574a07/))
- **Difficulty**: med. **GAP** (partly subsumed by opponent-adjusted iterative solve).

### A4. Colley ratings (W/L, no margin)
- **What**: Laplace-smoothed linear system using only wins/losses + schedule; margin-free
  by design.
- **In→out**: W/L + opponents → rating → win prob.
- **Shines**: immune to blowout/score-running; transparent, defensible.
- **Failure modes**: discards margin info (weaker signal); slow to move.
- **GSE translation**: a "score-neutral" sanity rating to flag when margin-based ratings
  over-credit blowouts.
- **Difficulty**: med. **GAP**.

### A5. TrueSkill / TrueSkill 2 (Bayesian, multiplayer)
- **What**: Each player skill ~ Gaussian(μ,σ); factor-graph message passing updates both
  after each result; supports teams and multiway outcomes.
- **In→out**: match outcomes (teams/free-for-all) → per-player (μ,σ) → matchup prob.
- **Shines**: individual ratings inside teams; multiway formats; native uncertainty.
- **Failure modes**: heavier math; partition/assignment assumptions; overkill for 1v1.
- **GSE translation**: player-level skill for prop/DFS contexts and esports; feeds
  similarity and projection priors.
- **Difficulty**: hard. **GAP**.

### A6. Poisson goals model (Maher 1982)
- **What**: Each side's goals ~ Poisson(λ); λ from attack×defense×home; build the full
  score grid → 1X2, totals, exact-score.
- **In→out**: team attack/defense rates + home edge → score matrix → market probs.
- **Shines**: closed-form full distribution; natural for soccer/hockey/low-scoring.
- **Failure modes**: independence assumption understates draws; needs scoring-rate inputs.
- **GSE translation**: totals/exact-score pricing. **Built and tested but NOT wired** —
  blocked on a team-rate ingestion adapter (wiring it now would fabricate λ, violating
  "no fabricated stats"). ([Dixon-Coles primer](https://dashee87.github.io/football/python/predicting-football-results-with-statistical-modelling-dixon-coles-and-time-weighting/))
- **Difficulty**: easy (math) / med (rate ingestion). **HAVE\*** (`poisson.ts`).

### A7. Dixon-Coles correction + time decay (1997)
- **What**: Poisson + a low-score dependence parameter ρ that re-weights {0-0,1-0,0-1,1-1},
  + exponential time-decay weighting `exp(−ξ·Δt)` in the likelihood.
- **In→out**: historical scores (time-stamped) → 2N+2 params (attack/defense per team, γ
  home, ρ) → corrected score grid.
- **Shines**: fixes Poisson's draw under-count; recency-aware; small parameter set.
- **Failure modes**: still bivariate-low-order only; ξ and ρ need tuning/backtest.
- **GSE translation**: drop-in upgrade to A6 for soccer scoreline + draw pricing; the
  time-decay weighting generalizes to *every* rate estimate in GSE.
- **Difficulty**: med. **GAP** (Poisson base exists; ρ + decay are the missing layer).
  ([Dixon & Coles 1997, JRSS-C](https://dashee87.github.io/football/python/predicting-football-results-with-statistical-modelling-dixon-coles-and-time-weighting/))

### A8. Expected Points / EPA & Win Probability / WPA
- **What**: EP(state)=expected next-score value; EPA=EP_after−EP_before. WP(state)=win
  prob; WPA=ΔWP. Modern builds (nflfastR) use tree-based models for calibration on
  end-of-half nonlinearities.
- **In→out**: play-by-play states (down, distance, yardline, clock, score) → EP/WP per
  state → per-play value, drive value, leverage.
- **Shines**: situational value; the backbone of opponent-adjusted efficiency and live
  win prob.
- **Failure modes**: model drift across eras (needs era adjustment); garbage-time bias;
  PBP data dependency.
- **GSE translation**: feeds `opponent-adjusted.ts` (EPA/play is the raw input) and a
  live-WP surface. ([nflfastR EP/WP models](https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/))
- **Difficulty**: hard (own model) / med (consume nflverse). **GAP** (consumes EPA;
  no first-party EP/WP model).

### A9. xG / xGoals (shot-quality logistic)
- **What**: Logistic regression mapping shot features (distance, angle, defender
  proximity, cross/assist, body part) → P(goal)∈[0,1]; sum per team for xG.
- **In→out**: shot events → per-shot prob → team xG / xG difference.
- **Shines**: de-noises finishing variance; better forward signal than goals; pairs with
  Poisson (use xG-derived λ).
- **Failure modes**: feature/data quality; no game-state context in vanilla form;
  finishing-skill confound.
- **GSE translation**: supplies stable λ inputs for A6/A7 and a quality-of-chances
  narrative signal. ([xG logistic model](https://medium.com/@alex.gascon1999/building-an-expected-goals-xg-model-with-logistic-regression-11691accdc1e))
- **Difficulty**: med. **GAP**.

### A10. Player projection — Marcel / ZiPS / Steamer family
- **What**: Marcel (Tango): weight last 3 seasons (5/4/3), regress to league mean by
  sample size, apply an aging factor, attach a reliability weight. ZiPS/Steamer add
  minor-league translations, pitch data, ML — historically only marginal gains over
  Marcel.
- **In→out**: recent per-unit production + age → projected rate + reliability.
- **Shines**: robust, hard-to-beat baseline; honest about small samples.
- **Failure modes**: aging curves vary by role; regression target choice matters;
  survivorship bias in curves.
- **GSE translation**: `player-projection.ts` already does recency-weighted,
  sample-size-regressed projection with a backtest. The **aging-curve adjustment** and a
  Marcel-style explicit reliability output are the missing pieces.
  ([Marcel / projection rundown](https://library.fangraphs.com/the-projection-rundown-the-basics-on-marcels-zips-cairo-oliver-and-the-rest/))
- **Difficulty**: easy (aging layer). **HAVE** base / **GAP** aging curves.

### A11. Usage / opportunity models
- **What**: Project *opportunity* (snap share, target share, route rate, touches, red-zone
  looks) first, then efficiency; volume is stickier than efficiency.
- **In→out**: depth-chart + recent role → projected opportunity → projected production.
- **Shines**: stabilizes props/DFS projections; survives efficiency variance.
- **Failure modes**: depends on role/injury news; scheme changes; cold-start for rookies.
- **GSE translation**: upstream of `player-projection.ts`; `player-rush-scheme.ts` and
  `player-archetype.ts` are adjacent. Opportunity-first decomposition is the gap.
- **Difficulty**: med. **GAP** (partial via archetype/scheme modules).

### A12. Market de-vig — multiplicative / additive / power / Shin / logit
- **What**: Strip bookmaker margin to fair probs. Multiplicative scales each prob by
  1/booksum; additive subtracts equal mass; **power** solves `p_i^k` so Σ=1 (favorite
  absorbs less vig); **Shin** models insider share z and corrects favorite-longshot bias;
  **logit/log-odds** shifts on the logit scale.
- **In→out**: raw implied probs (1/odds) per market → fair probs (Σ=1) [+ z for Shin].
- **Shines**: Shin/power best for longshots & 3-way; multiplicative fine for tight 2-way.
- **Failure modes**: wrong method skews favorite-longshot; Shin needs iteration; thin
  markets noisy.
- **GSE translation**: `shin-devig.ts` is live and is the benchmark for edge =
  independent − market-fair. Adding **power** and **multiplicative** as selectable
  methods lets GSE pick per market type and *compare* fair-value estimates.
  ([devig methods](https://betherosports.com/blog/devigging-methods-explained))
- **Difficulty**: easy. **HAVE** Shin / **GAP** power+multiplicative selector.

### A13. Closing-Line Value (CLV)
- **What**: Did your locked price beat the close? Strongest *leading* indicator of edge.
- **In→out**: locked line/price + closing line → CLV (prob or cents), sign +=beat close.
- **Shines**: credibility proof before games settle; low-variance skill signal.
- **Failure modes**: needs a trustworthy closing snapshot; not a profit guarantee.
- **GSE translation**: `clv.ts` + `clv-capture.ts` already implement it; surfacing in the
  public track record is a separate deliberate step.
- **Difficulty**: easy. **HAVE**.

### A14. Kelly / fractional Kelly bankroll
- **What**: `f* = (b·p − q)/b`; use a fraction (¼) to cut variance at small growth cost.
- **In→out**: fair win prob + odds → stake fraction (units).
- **Shines**: growth-optimal sizing; fractional tames drawdowns.
- **Failure modes**: hypersensitive to p mis-estimate; full Kelly over-bets; correlated
  bets break independence.
- **GSE translation**: `kelly.ts` live with ¼ default + confidence gate. The **correlated
  / simultaneous-Kelly** extension (for parlays/same-game) is the gap. ([Kelly + CLV
  context](https://www.datawisebets.com/blog/devigging-sportsbook-odds))
- **Difficulty**: easy (single) / hard (correlated). **HAVE** single / **GAP** correlated.

### A15. Correlation & stacking for DFS
- **What**: Roster correlated players (QB+WR, batting-order stacks) to raise lineup
  *ceiling*; model the covariance, not just means.
- **In→out**: player projections + correlation matrix → lineup ceiling/variance.
- **Shines**: GPP tournaments reward correlated ceilings.
- **Failure modes**: over-stacking concentrates risk; correlations regime-dependent.
- **GSE translation**: `apps/web/lib/dfs/*` and `apps/web/lib/correlation/*` exist;
  formal correlation-aware lineup construction is the gap. ([DFS stacking/sims](https://www.stokastic.com/articles/mlb-dfs/mlb-dfs-strategy-guide))
- **Difficulty**: med. **GAP**.

### A16. Ownership projection
- **What**: Predict field roster % per player to find *leverage* (low-owned, high-upside).
- **In→out**: salary, projection, narrative, slate context → projected ownership.
- **Shines**: GPP edge is relative to the field, not absolute points.
- **Failure modes**: reflexive (your tool moves ownership); news shocks.
- **GSE translation**: required input for leverage scoring in DFS sims.
- **Difficulty**: med. **GAP**.

### A17. Monte Carlo slate simulation
- **What**: Simulate thousands of correlated player/game outcomes → distribution of lineup
  finishes → rank builds by win prob (GPP) or floor (cash).
- **In→out**: projections + covariance + ownership → simulated finish distribution.
- **Shines**: captures ceiling/variance interaction; ranks builds, not players.
- **Failure modes**: garbage-in (bad covariance); compute cost; needs calibrated inputs.
- **GSE translation**: `apps/web/lib/sim/*` and `slate-twin/*` are the home; ties A15-A17
  together. ([Stokastic sims](https://www.stokastic.com/mlb))
- **Difficulty**: hard. **GAP**.

---

# PART B — OUTSIDE-SPORT TRANSFER METHODS (the differentiator)

### B1. Factor models (quant finance → "what drives the edge")
- **Analogy**: Asset returns = Σ factor exposures × factor returns + idiosyncratic. For
  GSE, a pick's signal = Σ exposures to *named factors* (rest, travel, pace, injuries,
  weather, line-move) + residual.
- **In→out**: signals → factor loadings → decomposed expected value + attribution.
- **Shines**: explains *why*, not just *what*; lets you neutralize crowded factors.
- **Failure modes**: factor instability; multicollinearity; data-mined factors.
- **GSE translation**: turns `composite-score.ts` into an attributable factor model so the
  factor trail says "edge is 60% line-move, 25% rest, 15% pace."
- **Difficulty**: med. **GAP** (composite blend exists; factor decomposition does not).

### B2. Shrinkage covariance — Ledoit-Wolf
- **Analogy**: Sample covariance is noisy/ill-conditioned; shrink toward a structured
  target (constant-correlation) with an analytically optimal weight δ:
  `Σ̂ = δ·F + (1−δ)·S`.
- **In→out**: noisy historical covariance (players/teams/legs) → stable, invertible Σ.
- **Shines**: any place a covariance feeds an optimizer/sim — DFS correlation, parlay
  correlation, risk sizing.
- **Failure modes**: target misspecification; still backward-looking.
- **GSE translation**: the **correct covariance estimator** under A15/A17 — without it,
  DFS sims and correlated Kelly use unstable matrices. ([Ledoit-Wolf](https://alcapitaladvisory.com/research/frameworks/ledoit-wolf.html))
- **Difficulty**: med. **GAP**.

### B3. Black-Litterman as prior-blending (model + market)
- **Analogy**: BL blends a market-implied equilibrium prior with the analyst's *views*,
  weighted by confidence, to get a posterior. For GSE: blend the **de-vigged market prob
  (prior)** with GSE's **independent model estimate (view)**, weighted by each side's
  uncertainty.
- **In→out**: market-fair prob + model prob + confidences → blended posterior prob.
- **Shines**: principled "don't fully trust either" — exactly GSE's edge philosophy; avoids
  over-betting noisy model disagreements.
- **Failure modes**: confidence inputs are themselves estimates; can wash out real edges if
  market weight too high.
- **GSE translation**: a formal blend at the heart of the edge engine — currently the edge
  is a *difference*; BL makes it a *confidence-weighted posterior*. ([BL/shrinkage prior](https://bookdown.org/palomar/portfoliooptimizationbook/3.6-prior-information-shrinkage-factor-models-and-blacklitterman.html))
- **Difficulty**: med. **GAP** (high leverage).

### B4. Risk parity (DFS / portfolio exposure)
- **Analogy**: Allocate so each position contributes *equal risk*, not equal capital. For a
  slate/portfolio of picks, equalize each pick's contribution to total variance.
- **In→out**: pick covariance + edges → risk-balanced exposure weights.
- **Shines**: diversifies the bankroll across uncorrelated edges; resists concentration
  blowups.
- **Failure modes**: ignores expected return if applied naively; leverage assumptions.
- **GSE translation**: portfolio-level staking across simultaneous picks, complementing
  per-pick Kelly. ([Risk parity](https://en.wikipedia.org/wiki/Risk_parity))
- **Difficulty**: med. **GAP**.

### B5. State-space / Kalman filter for in-season form
- **Analogy**: Epidemiology/finance nowcasting — a hidden state (team true strength)
  drifts via a random walk and is observed noisily each game; the filter contracts
  uncertainty on new results and expands it between games.
- **In→out**: game outcomes over time → filtered latent strength (μ,σ) per team.
- **Shines**: smooth, recency-aware form with honest uncertainty; mean-reverting form;
  cold-start handled via wide initial σ. Cited approaches hit 65-70% match accuracy
  (their data). ([Kalman team strength](https://seanelvidge.com/articles/2025/Football_team_rankings/))
- **Failure modes**: Gaussian/linear assumptions; process-noise tuning; structural breaks
  (trades) need shocks.
- **GSE translation**: a *time-aware* upgrade to Elo/opponent-adjusted that emits an
  uncertainty band — feeds conviction tiers and interval width.
- **Difficulty**: hard. **GAP** (high leverage — unifies A1/A2/B12).

### B6. Ensemble calibration & CRPS (weather post-processing)
- **Analogy**: Numerical weather ensembles are recalibrated against observations; quality
  is scored with **CRPS** (a proper score over the whole predictive CDF), maximizing
  *sharpness subject to calibration* (Gneiting).
- **In→out**: ensemble of model forecasts → calibrated predictive distribution; CRPS score.
- **Shines**: evaluates *distributions*, not point picks; the right objective for totals
  and margins.
- **Failure modes**: needs enough settled samples; CRPS less intuitive than Brier to
  stakeholders.
- **GSE translation**: add **CRPS** alongside Brier in `performance-analytics.ts` to grade
  distributional outputs (Poisson grid, margin sims). ([Gneiting proper scores; CRPS](https://ascmo.copernicus.org/articles/11/23/2025/ascmo-11-23-2025.pdf))
- **Difficulty**: easy. **GAP** (Brier exists; CRPS does not).

### B7. Population Stability Index (credit-scoring drift)
- **Analogy**: Credit models monitor input/score drift via
  `PSI = Σ (p_i − q_i)·ln(p_i/q_i)` across bins; >0.1 watch, >0.25 alert.
- **In→out**: baseline vs current feature/score distributions → PSI per feature.
- **Shines**: cheap early-warning that a feature distribution (odds source, market, sport
  mix) has shifted before calibration silently degrades.
- **Failure modes**: bin-count sensitivity; flags shift, not causation.
- **GSE translation**: a data-drift guard in `data-reliability/*` and `calibration-drift`
  — detect when the live odds feed or sport mix has drifted from the calibration sample.
  ([PSI formula/thresholds](https://www.fiddler.ai/blog/measuring-data-drift-population-stability-index))
- **Difficulty**: easy. **GAP**.

### B8. Reject inference (credit scoring)
- **Analogy**: Credit models correct for only observing repaid loans; analogously, GSE's
  graded sample is selected (only *published* picks settle), biasing calibration.
- **In→out**: settled (accepted) sample + unpublished candidates → bias-corrected
  calibration.
- **Shines**: de-biases calibration when publishing thresholds filter the sample.
- **Failure modes**: strong modeling assumptions; can introduce its own bias.
- **GSE translation**: makes `accuracy`/calibration honest about selection — important
  given GSE only settles published picks.
- **Difficulty**: hard. **GAP** (subtle but integrity-relevant).

### B9. Hierarchical / Prophet demand forecasting & intermittent demand
- **Analogy**: Retail forecasts pool across product hierarchies (Prophet for
  trend+seasonality); **intermittent-demand** methods (Croston) handle rare, spiky events.
- **In→out**: time series with seasonality / sparse events → calibrated forecasts.
- **Shines**: Prophet-style seasonality for content/traffic and B2B ops; Croston for
  *rare* outcomes (upsets, specific props) where most periods are zero.
- **Failure modes**: Prophet over-smooths regime changes; Croston biased for very sparse.
- **GSE translation**: ops/traffic forecasting + a principled treatment of rare-event
  props instead of naive frequencies.
- **Difficulty**: med. **GAP**.

### B10. Matrix factorization for player similarity / comps (recommenders)
- **Analogy**: Netflix-style latent factors: factor a player×stat matrix into low-rank
  embeddings; nearest neighbors in latent space = statistical comps.
- **In→out**: sparse player×metric matrix → dense embeddings → similarity / comps / missing
  -value fill.
- **Shines**: "this rookie's nearest comps aged like X"; imputes missing stats; powers
  archetype priors.
- **Failure modes**: cold-start for new players; latent dims need interpretation; popularity
  bias.
- **GSE translation**: strengthens `player-archetype.ts` comps and supplies projection
  priors for low-sample players. ([Matrix factorization](https://medium.com/data-science/recommendation-system-matrix-factorization-d61978660b4b))
- **Difficulty**: med. **GAP**.

### B11. Superforecasting aggregation — log-odds averaging & extremizing
- **Analogy**: Good Judgment Project: aggregate forecasters via **geometric mean of
  log-odds** (weights confident, decisive forecasts), then optionally **extremize** toward
  0/1. *Caveat: later analysis suggests extremizing's tournament edge may have been partly
  a fluke — apply cautiously and only with calibration evidence.*
- **In→out**: multiple independent estimates → log-odds mean → (optional) extremized
  consensus.
- **Shines**: better than naive averaging when estimators are independent and decent;
  natural fit for GSE's "multiple referees agree" design.
- **Failure modes**: extremizing can lose big occasionally; correlated estimators
  double-count.
- **GSE translation**: upgrade `consensus.ts` from linear averaging to **log-odds pooling**;
  treat extremizing as an *opt-in, validated* knob, not a default. ([GJP aggregation](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/))
- **Difficulty**: easy. **GAP** (consensus exists; pooling method is the upgrade).

### B12. Conformal prediction (distribution-free intervals)
- **Analogy**: Wrap any model with a calibration set to emit intervals/sets with provable
  marginal coverage (no distributional assumption). Time-series needs adaptive variants
  (exchangeability is violated).
- **In→out**: any point model + held-out residuals → prediction interval at target coverage.
- **Shines**: honest, model-agnostic uncertainty for margins/totals/props; pairs with
  gradient boosting.
- **Failure modes**: marginal (not conditional) coverage; needs adaptive method for drift;
  interval width can be wide.
- **GSE translation**: turns any GSE point projection (margin, player line) into a
  *defensible interval* — the visible face of "calibrated, not confident."
  ([Conformal intro](https://arxiv.org/abs/2511.13608),
  [conformal win prob, NCAA](https://arxiv.org/pdf/2208.08598))
- **Difficulty**: med. **GAP** (high leverage).

### B13. Bayesian hierarchical / partial pooling
- **Analogy**: Multilevel models pool across groups (teams/players/seasons); estimates
  shrink toward group means by sample size — small samples borrow strength, large ones
  stay free.
- **In→out**: grouped observations → partially-pooled estimates + full posteriors.
- **Shines**: principled regression-to-mean, native uncertainty, robust on thin data;
  "Bayesian Marcel" formalizes A10.
- **Failure modes**: compute (MCMC) cost; prior sensitivity; needs careful group structure.
- **GSE translation**: the rigorous engine behind player projection and team ratings;
  replaces ad-hoc shrinkage in `player-projection.ts` with posterior shrinkage.
  ([partial pooling](https://cran.r-project.org/web/packages/rstanarm/vignettes/pooling.html),
  [Bayesian Marcel](https://www.pymc-labs.com/blog-posts/bayesian-marcel))
- **Difficulty**: hard. **GAP** (heuristic shrinkage present; full Bayes is the upgrade).

### B14. Ensembling — stacking & opinion pools (linear vs log)
- **Analogy**: Combine models. **Linear pool** = weighted average of distributions
  (optimizes calibration/sharpness). **Log pool** = weighted geometric mean (weights
  confident forecasts more, sharper). **Stacking** learns the weights via cross-validation
  against a proper score.
- **In→out**: several model distributions → learned combination → ensemble forecast.
- **Shines**: ensembles usually beat any single model; stacking auto-tunes weights.
- **Failure modes**: log pool over-sharpens on disagreement; needs enough CV data; weight
  overfit.
- **GSE translation**: principled combination of Elo + Poisson + market + ML estimators in
  the edge engine, replacing fixed weights. ([opinion pools / stacking](https://onlinelibrary.wiley.com/doi/10.1002/for.3030))
- **Difficulty**: med. **GAP**.

### B15. Probability calibration — Platt / isotonic / beta / temperature
- **Analogy**: Post-hoc map raw scores → true probabilities. **Platt** (sigmoid, small
  data), **isotonic** (non-parametric, monotone, needs data), **beta** (smooth, 3-param,
  contains identity — often beats Platt & isotonic), **temperature** (single scalar, NN
  logits).
- **In→out**: (raw score, outcome) pairs → calibration map → calibrated prob.
- **Shines**: directly serves "calibrated, not confident"; turns the 0-100 confidence into
  a real win prob.
- **Failure modes**: isotonic overfits small samples; needs settled, learning-eligible
  data; recalibrate on drift (see B7).
- **GSE translation**: `probability-calibration.ts` already has **isotonic + Brier
  decomposition + ECE** (R&D, founder-gated). Adding **Platt** and **beta** gives
  small-sample-robust options to actually wire confidence→probability.
  ([calibration comparison](https://metricgate.com/blogs/beta-calibration-vs-platt-vs-isotonic/))
- **Difficulty**: easy. **HAVE\*** isotonic / **GAP** Platt + beta.

### B16. Brier decomposition & proper scoring (Murphy/Gneiting)
- **Analogy**: Decompose Brier into Reliability − Resolution + Uncertainty to see *why* a
  score is what it is; use only *proper* scores (Brier, log, CRPS) so honest forecasting is
  rewarded.
- **In→out**: (prob, outcome) → reliability/resolution/uncertainty components.
- **Shines**: diagnoses calibration vs discrimination separately; audit-grade.
- **Failure modes**: bin sensitivity; sample size for stable components.
- **GSE translation**: already in `probability-calibration.ts`; pair with CRPS (B6) for the
  full proper-scoring suite. ([Gneiting 2007](https://ascmo.copernicus.org/articles/11/23/2025/ascmo-11-23-2025.pdf))
- **Difficulty**: easy. **HAVE\*** (Brier) / **GAP** (CRPS companion).

---

## 1) Master table — Method | Domain | Improves in GSE | HAVE/GAP | Difficulty | Priority

| # | Method | Domain | What it improves in GSE | HAVE/GAP | Difficulty | Priority |
|---|--------|--------|--------------------------|----------|-----------|----------|
| A1 | Elo ratings | In-sport | Independent win-prob referee | HAVE | easy | — |
| A2 | Glicko-2 | In-sport | Uncertainty band on ratings → tiers | GAP | med | High |
| A3 | Massey LS ratings | In-sport | Independent spread estimate | GAP | med | Low |
| A4 | Colley ratings | In-sport | Margin-neutral sanity rating | GAP | med | Low |
| A5 | TrueSkill 2 | In-sport | Player skill for props/esports | GAP | hard | Low |
| A6 | Poisson grid | In-sport | Totals/exact-score pricing | HAVE\* | easy/med | Med |
| A7 | Dixon-Coles + decay | In-sport | Draw pricing + recency weighting | GAP | med | High |
| A8 | EPA / WPA | In-sport | Efficiency inputs, live WP | GAP | hard | Med |
| A9 | xG model | In-sport | Stable λ + chance-quality signal | GAP | med | Med |
| A10 | Marcel aging curves | In-sport | Player projection accuracy | GAP | easy | Med |
| A11 | Usage/opportunity | In-sport | Stabler prop/DFS projections | GAP | med | Med |
| A12 | Shin de-vig | In-sport | Market-fair benchmark | HAVE | easy | — |
| A12b | Power/mult de-vig | In-sport | Per-market fair-value compare | GAP | easy | Med |
| A13 | CLV | In-sport | Leading edge / proof metric | HAVE | easy | — |
| A14 | Fractional Kelly | In-sport | Stake sizing | HAVE | easy | — |
| A14b | Correlated Kelly | In-sport | Parlay / SGP sizing | GAP | hard | Med |
| A15 | DFS correlation/stack | In-sport | Lineup ceiling construction | GAP | med | Med |
| A16 | Ownership projection | In-sport | DFS leverage scoring | GAP | med | Low |
| A17 | Monte Carlo slate sim | In-sport | Rank builds by win prob | GAP | hard | Med |
| B1 | Factor models | Quant finance | Edge attribution / factor trail | GAP | med | High |
| B2 | Ledoit-Wolf shrinkage | Quant finance | Stable covariance for sims | GAP | med | High |
| B3 | Black-Litterman blend | Quant finance | Model+market posterior | GAP | med | High |
| B4 | Risk parity | Quant finance | Portfolio exposure balance | GAP | med | Med |
| B5 | Kalman / state-space | Epi/finance nowcast | Time-aware form + uncertainty | GAP | hard | High |
| B6 | CRPS / ensemble cal. | Weather | Score distributional outputs | GAP | easy | High |
| B7 | PSI drift | Credit scoring | Data/feed drift early-warning | GAP | easy | High |
| B8 | Reject inference | Credit scoring | De-bias selected calibration | GAP | hard | Med |
| B9 | Prophet / Croston | Demand forecast | Ops traffic + rare-event props | GAP | med | Low |
| B10 | Matrix factorization | Recommenders | Player comps + imputation | GAP | med | Med |
| B11 | Log-odds pooling | Superforecasting | Better consensus aggregation | GAP | easy | High |
| B11b | Extremizing | Superforecasting | Sharpen consensus (cautious) | GAP | easy | Low |
| B12 | Conformal prediction | ML / stats | Distribution-free intervals | GAP | med | High |
| B13 | Hierarchical Bayes | Bayesian stats | Principled shrinkage + posteriors | GAP | hard | Med |
| B14 | Stacking / opinion pools | Forecasting | Tune model-combination weights | GAP | med | Med |
| B15a | Isotonic calibration | ML | Confidence → win prob | HAVE\* | easy | — |
| B15b | Platt / beta calib. | ML | Small-sample-robust calibration | GAP | easy | High |
| B16 | Brier decomposition | Proper scoring | Diagnose calibration vs resolution | HAVE\* | easy | — |

(36 method rows; Priority is relative leverage, not a schedule.)

---

## 2) Top 12 highest-leverage GAP methods to implement

Each with a sketch and the GSE file it would live near. (Formulas restate cited public
methods; no GSE performance is claimed.)

**1. Black-Litterman-style model⊕market blend** — `packages/prediction-engine/src/edge-engine.ts`
```
# Blend independent model prob with de-vigged market prob by confidence (precision-weighted)
logit(p) = log(p/(1-p))
w_model  = 1/var_model ;  w_mkt = 1/var_mkt
post_logit = (w_model*logit(p_model) + w_mkt*logit(p_mkt)) / (w_model + w_mkt)
p_post = sigmoid(post_logit)        # edge then = p_post - p_mkt, with honest uncertainty
```

**2. Kalman / state-space team form** — `packages/prediction-engine/src/kalman-rating.ts` (new)
```
predict:  μ_t|t-1 = μ_t-1 ;  P_t|t-1 = P_t-1 + Q          # Q = process noise (drift)
update:   K = P_t|t-1 / (P_t|t-1 + R)                      # R = obs noise
          μ_t = μ_t|t-1 + K*(obs_margin - μ_t|t-1)
          P_t = (1-K)*P_t|t-1                              # σ widens between games, shrinks on results
```

**3. Conformal prediction intervals** — `packages/prediction-engine/src/conformal.ts` (new)
```
resid_i = |y_i - ŷ_i| on calibration set
q = ceil((n+1)*(1-α))/n quantile of resid    # split conformal
interval(x) = [ŷ(x) - q, ŷ(x) + q]            # ~ (1-α) marginal coverage; use adaptive variant for drift
```

**4. Dixon-Coles ρ + time decay** — `packages/prediction-engine/src/poisson.ts` (extend)
```
τ(x,y) = 1-λμρ (0,0); 1+λρ (0,1); 1+μρ (1,0); 1-ρ (1,1); else 1
weight_match = exp(-ξ * days_since)           # down-weight old games in the MLE
P(x,y) = τ(x,y) * Pois(x;λ) * Pois(y;μ)
```

**5. CRPS distributional scoring** — `packages/prediction-engine/src/performance-analytics.ts` (extend)
```
CRPS(F,y) = ∫ (F(z) - 1{y<=z})^2 dz           # closed form for Normal; empirical for sim ensembles
# report alongside Brier; lower = better calibrated+sharper
```

**6. Population Stability Index drift monitor** — `apps/web/lib/data-reliability/psi.ts` (new)
```
PSI = Σ_bins (p_i - q_i) * ln(p_i / q_i)       # p=baseline share, q=current share
# <0.1 stable | 0.1–0.25 watch | >0.25 alert  → gate auto-calibration / flag feed shift
```

**7. Log-odds opinion pooling for consensus** — `packages/prediction-engine/src/consensus.ts` (extend)
```
pooled_logit = Σ w_k * logit(p_k) / Σ w_k      # geometric mean of odds (decisive-weighted)
p = sigmoid(a * pooled_logit)                  # a>1 = extremize, OPT-IN + validated only
```

**8. Ledoit-Wolf shrinkage covariance** — `apps/web/lib/correlation/shrinkage.ts` (new)
```
S = sample_cov ; F = constant-correlation target
δ* = clamp( (Σ asy.var of entries) / ||S-F||_F^2 , 0, 1 )   # analytic optimal weight
Σ̂ = δ*·F + (1-δ*)·S                            # well-conditioned input for sims/correlated Kelly
```

**9. Beta + Platt calibration** — `packages/prediction-engine/src/probability-calibration.ts` (extend)
```
Platt:  p = sigmoid(A*s + B)                                  # fit A,B by MLE
Beta:   p = sigmoid(a*ln(s) - b*ln(1-s) + c)                  # 3-param, contains identity
# choose by held-out log loss / ECE; prefer over isotonic on small samples
```

**10. Factor-model edge attribution** — `packages/prediction-engine/src/composite-score.ts` (extend)
```
edge = Σ_f loading_f * factor_value_f + resid
attribution_f = loading_f * factor_value_f / edge            # % of edge per named factor → factor trail UI
```

**11. Matrix-factorization player comps** — `apps/web/lib/players/embeddings.ts` (new)
```
minimize Σ (M_ui - p_u·q_i)^2 + λ(||p_u||^2+||q_i||^2)        # latent factors via ALS/SGD
comps(u) = argmax_v cos(p_u, p_v)                            # nearest neighbors = statistical comps; also imputes missing M
```

**12. Glicko-2 ratings with RD + volatility** — `packages/prediction-engine/src/glicko.ts` (new)
```
# per team carry (rating μ, deviation φ, volatility σ); on idle: φ ← sqrt(φ^2 + σ^2)
# on results: update via g(φ)=1/sqrt(1+3φ^2/π^2), expected E=1/(1+exp(-g·(μ-μ_j)))
# emit win prob AND a confidence band → drives conviction tiers + interval width
```

---

## 3) Off-the-shelf models we can use (and when)

- **Gradient boosting (XGBoost / LightGBM / CatBoost)** — tabular EPA/xG/prop models and
  win-prob; strong on nonlinear interactions (nflfastR moved to tree-based WP for exactly
  this). *Use when* you have rich tabular features and enough labeled history. *Always*
  wrap with calibration (B15) + conformal intervals (B12) since raw GBM scores are not
  calibrated probabilities.
- **Hierarchical Bayes (Stan / PyMC / brms; "Bayesian Marcel")** — player/team estimates
  with native shrinkage + uncertainty. *Use when* groups are small/uneven and honest
  posteriors matter more than raw speed; offline batch, not request-time.
- **Conformal wrappers (MAPIE-style, or ~30 lines of split conformal)** — model-agnostic
  intervals on top of *any* point model. *Use when* you need defensible uncertainty without
  re-architecting; pick adaptive/online variants under drift.
- **State-space / Kalman (statsmodels, simdkalman)** — online team-form tracking. *Use when*
  you want recency + uncertainty in one recursive pass.
- **Prophet / Croston** — ops/traffic seasonality and rare-event props respectively. *Use
  when* the target is a time series with seasonality or sparse spikes.
- **scikit-learn calibration (`CalibratedClassifierCV`: Platt/isotonic)** — fast path to
  calibrated probabilities; beta-calibration via a small dependency. *Use when* you have a
  settled, learning-eligible holdout.

Guardrail: any off-the-shelf model enters the **live** path only through GSE's existing
founder-gated `MODEL_VERSION` process (cf. `readiness.ts`), with a backtest attached —
consistent with how Poisson/calibration already ship "built, not auto-wired."

---

## 4) Research to learn from (reading list)

- **Dixon & Coles (1997), "Modelling Association Football Scores…", JRSS-C** — the
  low-score correction + time-decay weighting; the template for A6/A7 and the decay idea
  that generalizes to every rate estimate. ([walkthrough](https://dashee87.github.io/football/python/predicting-football-results-with-statistical-modelling-dixon-coles-and-time-weighting/))
- **Maher (1982)** — original independent-Poisson attack/defense formulation underlying the
  whole soccer-scoreline family.
- **Glickman, "The Glicko-2 system"** — RD + volatility math for A2/B-uncertainty.
  ([overview](https://www.emergentmind.com/topics/glicko2-rating-system))
- **Shin (1992/1993)** — insider-trading de-vig that corrects favorite-longshot bias; basis
  of `shin-devig.ts`. ([devig methods](https://betherosports.com/blog/devigging-methods-explained))
- **Gneiting & Raftery (2007), "Strictly Proper Scoring Rules…" + Gneiting et al. (2007),
  "sharpness subject to calibration"** — why we score with Brier/log/CRPS and the
  calibration-vs-sharpness paradigm (B6/B16). ([CRPS / proper scores](https://ascmo.copernicus.org/articles/11/23/2025/ascmo-11-23-2025.pdf))
- **Tetlock & Gardner, *Superforecasting* + Satopää et al. (2014)** — log-odds aggregation
  and extremizing, *with* the caveat that extremizing's edge may be fragile; informs B11.
  ([GJP evidence](https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/))
- **Angelopoulos & Bates, "A Gentle Introduction to Conformal Prediction"** — practical
  distribution-free intervals (B12). ([conformal intro](https://arxiv.org/abs/2511.13608))
- **Ledoit & Wolf (2004), "Honey, I Shrunk the Sample Covariance Matrix"** — the shrinkage
  estimator for B2/B8 sims. ([explainer](https://alcapitaladvisory.com/research/frameworks/ledoit-wolf.html))
- **Black & Litterman (1992)** — prior-blending for B3 model⊕market posterior.
  ([prior blending](https://bookdown.org/palomar/portfoliooptimizationbook/3.6-prior-information-shrinkage-factor-models-and-blacklitterman.html))
- **Tango, "Marcel the Monkey"** — minimum-competence projection baseline for A10/B13.
  ([projection rundown](https://library.fangraphs.com/the-projection-rundown-the-basics-on-marcels-zips-cairo-oliver-and-the-rest/))
- **nflfastR EP/WP/CP model notes (Open Source Football)** — reference build for A8 and why
  tree-based + calibration matters. ([nflfastR models](https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/))
- **FiveThirtyEight model methodology** — pragmatic Elo + MOV adjustments and public-facing
  calibration discipline (A1). ([538 methodology](https://fivethirtyeight.com/methodology/how-our-nfl-predictions-work/))
- **MIT Sloan Sports Analytics Conference / Wharton sports analytics** — venues to track for
  EPA/xG, DFS sims, and calibration practice as fields evolve.

---

## Sources

- Dixon-Coles / time decay — http://tamnguyen.io/dixon-coles/ ; https://dashee87.github.io/football/python/predicting-football-results-with-statistical-modelling-dixon-coles-and-time-weighting/
- Glicko-2 vs Elo/TrueSkill — https://www.emergentmind.com/topics/glicko2-rating-system
- Massey/Colley — https://towardsdatascience.com/rating-sports-teams-maximizing-a-generic-system-772144574a07/
- De-vig methods — https://betherosports.com/blog/devigging-methods-explained ; https://www.datawisebets.com/blog/devigging-sportsbook-odds
- Conformal prediction — https://arxiv.org/abs/2511.13608 ; https://arxiv.org/pdf/2208.08598
- Ledoit-Wolf / Black-Litterman — https://alcapitaladvisory.com/research/frameworks/ledoit-wolf.html ; https://bookdown.org/palomar/portfoliooptimizationbook/3.6-prior-information-shrinkage-factor-models-and-blacklitterman.html
- Superforecasting / aggregation — https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/
- Gneiting proper scores / CRPS — https://ascmo.copernicus.org/articles/11/23/2025/ascmo-11-23-2025.pdf ; https://arxiv.org/pdf/1805.09091
- PSI / drift — https://www.fiddler.ai/blog/measuring-data-drift-population-stability-index ; https://machinelearningplus.com/deployment/population-stability-index-psi/
- Marcel / projections — https://library.fangraphs.com/the-projection-rundown-the-basics-on-marcels-zips-cairo-oliver-and-the-rest/ ; https://www.pymc-labs.com/blog-posts/bayesian-marcel
- Kalman / state-space team strength — https://seanelvidge.com/articles/2025/Football_team_rankings/ ; https://vonarchimboldi.github.io/state-space-model/
- DFS sims / stacking — https://www.stokastic.com/articles/mlb-dfs/mlb-dfs-strategy-guide ; https://www.stokastic.com/mlb
- EPA/WP / xG — https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/ ; https://medium.com/@alex.gascon1999/building-an-expected-goals-xg-model-with-logistic-regression-11691accdc1e
- Calibration (Platt/isotonic/beta/temperature) — https://metricgate.com/blogs/beta-calibration-vs-platt-vs-isotonic/ ; https://www.blog.trainindata.com/complete-guide-to-platt-scaling/
- Hierarchical Bayes / partial pooling — https://cran.r-project.org/web/packages/rstanarm/vignettes/pooling.html
- Matrix factorization — https://medium.com/data-science/recommendation-system-matrix-factorization-d61978660b4b
- Opinion pools / stacking — https://onlinelibrary.wiley.com/doi/10.1002/for.3030
- Risk parity — https://en.wikipedia.org/wiki/Risk_parity

*Integrity note: this catalog asserts no GSE accuracy figures; quoted percentages belong
to the cited external studies. Methods marked HAVE\* are built but founder-gated and not in
the live scoring path. Uncertainty is flagged inline (e.g. extremizing, conformal under
time-series drift, reject-inference assumptions).*
