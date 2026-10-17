# GSE transfer operators v1 — nothing deleted, weights learned

Companion to gse_brain_ingestion_v1.md.
MODEL_VERSION stays v5.2.7.
μ stays the market close until a candidate beats Gaussian-close CRPS 7.109 by ≥ 0.01, n ≥ 150, walk-forward.
A cross-sport paper is training data. It is not a coefficient.

## The cut that was wrong

Round 5 marked soccer, hockey, tennis, and baseball cousins KILL because the unit did not match NFL points. That banned the operator and the dataset in the same stroke. The founder’s correction: the sport label is not a reason to drop a method. The engine trains on this corpus plus our as-of tables. A weight is learned here or it stays zero. It is never copied from the Premier League, the ATP, or the NHL.

Three statuses replace KILL:

- TRANSFER. The operator maps onto an NFL state. Train the parameter on nflverse (or cfbfastR, Savant) under the harness.
- STRUCTURE-ONLY. The equation enters the library. The original unit does not. A new cell definition is required before a fit.
- STILL-BANNED-ON-μ. The idea may sit in the library. It may not be written onto the game mean, used as a feature that leaks the close, or inverted into a fake point probability.

Nothing in the killed list is deleted from the brain.

## Operator cards

### Dixon-Coles τ and ξ — STRUCTURE-ONLY, then TRANSFER on decay

Original, soccer, JRSS C 46(2) 265–280:

P_DC(x,y) = τ(x,y) Pois(x;λ) Pois(y;μ)
τ(0,0)=1−λμρ, τ(1,0)=1+μρ, τ(0,1)=1+λρ, τ(1,1)=1−ρ, else 1.
Time weight φ(t)=exp(−ξ t).

Unit that breaks: NFL scores are not 0 and 1. Pasting ρ onto a point margin is still banned.

What trains:

- ξ, exponential decay of team strength across weeks, chosen by predictive score on our games. This is the piece that transfers cleanly.
- A low-cell dependence term only after we define NFL cells. Candidate cells: margin in {3, 6, 7, 8, other} and the joint (spread residual, total residual). ρ is estimated on NFL rows. If the likelihood does not beat independence on the harness, ρ stays 0 and the operator remains in the library as a failed candidate.

### Skellam — STRUCTURE-ONLY, legal bake-off

P(Z=k)=exp(−(μ1+μ2))(μ1/μ2)^{k/2} I_|k|(2√(μ1 μ2)).
Mean μ1−μ2, variance μ1+μ2.

Trains as itself on hockey goals and soccer goals (auxiliary tasks). Those tasks teach the engine the Bessel margin, empty-net truncation, and the independent-Poisson baseline. Ryder’s hockey toolbox is the auxiliary lecture, not an NFL prior.

NFL head: do not fit Skellam to point margin and call it μ. Legal path: Skellam on scoring events (drives that score), then a learned map from event-difference to points (FG vs TD vs safety mixture). Pre-register against the Gaussian close. If it loses, it stays in the library. It is not deleted. arXiv having no Skellam-vs-Gaussian NFL paper is why we run the bake-off, not why we refuse the family.

### Hawkes — STRUCTURE-ONLY at event grain

Intensity λ(t)=μ+Σ α exp(−β(t−t_i)).
Marked version (JRSS C 2023, football event sequences): mark-dependent excitation. That paper’s own fit found arrival times in association football did not cluster, and the Hawkes fit collapsed toward Poisson. That negative result is a training label. It is not a ban.

NFL map: event time is explosive play, score, or turnover, after EPA is accounted for. Estimate α, β on nflverse. Hawkes-as-tempo on the game mean stays banned. A random-memory Hawkes (arXiv:2601.07980, corner kicks) is a template for “excitation that dies,” which is the right inductive bias for a drive, not for a season.

### James–Stein / Efron–Morris — TRANSFER on rates, banned on the game mean

Positive-part: θ̂_i = ν + (1 − (p−2)σ² / ||Y−ν||²)_+ (Y_i−ν).
Efron–Morris: arcsin transform so variance ≈ 1, then shrink.

Trains on player EPA, catch rate, NFL success rate, MLB batting, NBA RAPM-style partial pooling. The dataset is every player-week we have. JS-to-league on the 32 team means stays banned as a replacement for the close: the close is already the shrinkage, k is small, variances are unequal. The operator is not banned. The target is.

### Venn-Abers — TRANSFER as an interval, banned as a point

Multiprobability (p0, p1) from two isotonic fits. Legal UQ. Inverting the upper end into a point probability and betting it stays banned. The interval trains on our win-prob and on tennis/NBA win-prob as auxiliary calibration tasks.

### Mondrian / equalized coverage — TRANSFER

Mondrian stays. The specific Δ0.009 width change stays a non-result, not a method. Equalized coverage (arXiv:1908.05428) trains inside strata we define: week bucket, QB-change, roof/wind, book, rest, coast-mismatch. Small strata fail closed. The operator is the point.

### DAVE — library only

Not a mean. If a future definition is a feature with an as-of timestamp, it may enter Phase 4 as a candidate covariate. It does not sit on μ.

### W5–W8, OSF-loop — not rescued as means

They stay out of μ. Their residuals can be training labels (weeks where a family failed) so the engine sees the negative. A negative result is data.

## Cross-sport tasks (this is the training set)

Each task has a shared operator and a private head. Gradients on the operator are allowed. Gradients that would write an auxiliary coefficient onto the NFL margin head are not, until that head beats the bar on NFL rows alone.

### MLB

- RE24 → EPA. Value = V(state_after) − V(state_before) + points. Baseball states are the 24 base-out states. NFL states are Yurko’s next-score classes (arXiv:1802.00998). Train V on nflverse. Do not paste a baseball run matrix.
- Park factor → stadium / roof / altitude multiplier. Form rate_park / rate_league. Unit breaks (runs ≠ points). Re-estimate.
- Efron–Morris → player-rate shrinkage, as above.
- Pythagorean expectation → a win baseline from points scored and allowed. Train the exponent. Do not assume 2.37 or 1.83.

### Hockey

- Skellam margin and empty-net truncation. Auxiliary task on goals. NFL analog of the pull: trailing state changes fourth-down aggression and pass rate. Train the state shift. Do not import a hockey odds ratio.
- Manpower × score × time Markov WP. Same shape as the nflWAR GAM. Roster availability is the manpower bit.

### Tennis

- Elo / Glicko with a surface split. Operator: a rating per regime, overall rating as the backoff when n is small. NFL regimes: dome, outdoor-wind, altitude, turf. Update R ← R + K(S−E), E=1/(1+10^((Rb−Ra)/400)). K and 400 are hyperparameters.
- Reliability diagrams and Brier by probability bin. The diagnostic transfers even when the match does not. Tennis Abstract’s tournament diagrams are a lecture in calibration shape, not an NFL accuracy number.
- Inactivity: Glicko rating deviation inflates when a player (or a QB) has not played. That is the uncertainty feature for a new starter. Train RD on our snaps. Do not paste a tennis c constant.

### NBA

- Rest residual after strength and home. Entine and Small, JQAS 2008, is the paper that separated rest from home-court. A published second-night margin is an NBA number. NFL feature is days rest, short week, travel direction. Re-estimate.
- RAPM / EPM-style partial pooling → player EPA with teammate context. Same shrinkage family as James–Stein. Train on participation where we have it. Participation is missing in-season after 2023; the missingness is a feature, not a silent drop.

### Soccer (beyond Dixon-Coles)

- Sarmanov and bivariate Poisson (2307.02139, Karlis–Ntzoufras) teach dependence with Poisson margins. Auxiliary tasks. NFL head uses the dependence idea on the joint (spread, total), which is the same-game-parlay hole. No soccer ρ is copied.
- RPS vs Brier vs ignorance (1908.08980) is the scoring-rule lecture. Use RPS on ordinal margin bins in the harness.

### Market, any sport

- Favorite–longshot bias and Shin de-vig. Training for how vig is removed. Horse, soccer, and tennis are the lectures. NFL spread market is the test. CLV stays an evaluation target, never a feature.
- Pinnacle as a sharpness benchmark where we have it. Not a feature before the close.

## Operators named on the second pass

Bradley-Terry (1952) is the ancestor of Elo: P(i beats j) = π_i / (π_i + π_j). Elo is the logistic approximation with a 400-scale. TrueSkill (Herbrich, Minka, Graepel, NIPS 2006) is the Bayesian team extension: skill s ~ N(μ, σ²), performance p ~ N(s, β²), outcome from the difference of performances, team skill the sum of players on the field. That is the operator for “infer player skill when only the score is observed,” which is exactly the in-season participation gap. Train on seasons where participation exists. Do not impute 2023+ in-season snaps.

Glicko-2, skeleton only. Scale r to μ = (r − 1500) / 173.7178 and RD to φ = RD / 173.7178. g(φ) = 1 / √(1 + 3φ²/π²). Expected score E = 1 / (1 + exp(−g(φ_j)(μ − μ_j))). Volatility σ is fit by a one-dimensional root find. The 1500 and 173.7178 are scaling conventions, not NFL facts. What transfers is RD inflation after a bye, an injury week, or a new starter. That is the QB-change state the empty arXiv search did not contain. The paper was never going to arrive. The schedule gap is already in our tables.

Pythagorean expectation: win% ≈ PF^x / (PF^x + PA^x). The folklore NFL exponent is not loaded. x is learned here. This is a baseline map from points to wins, not μ.

Copula zoo, despite “copula football” being CONFIRMED-EMPTY on arXiv. Gaussian, Frank, Gumbel, Clayton. Empty means no paper. Dependence between spread residual and total residual is an NFL fact we can measure. Train on our closes for the same-game joint. No soccer copula parameter is copied. Product of legs stays an illegal price until this joint exists.

Covariate-shift conformal (Tibshirani, Foygel Barber, Candès, Ramdas): likelihood-ratio weighted scores when P(X) changes and P(Y|X) is treated as stable. This is the operator for QB-change, portal, FCS-vs-FBS, and realignment. The named NFL papers are empty. The operator is not. Weights come from our as-of covariates.

Kelly is ops, not a forecast. Size a stake only on an edge that has already cleared the bar. It does not enter μ.

## What is still not in the corpus

Nutrition, cognitive load, and sleep restriction have no play-level public grain. They are not killed. They are unsourced. A source with coverage, grain, and a pre-kickoff timestamp would enter as a task. Until then the slot exists and the weight is missing, not zero-by-fiat and not invented.

Weather and rest are sourced enough to be tasks: nflverse roof, wind, surface, and schedule dates. Smith, Guilleminault, and Efron, SLEEP 2013, is the coast-mismatch lecture. The evening split in that paper is not hardcoded.

## Training order

1. As-of warehouse. No task trains on a row observed after decision time.
2. Freeze the NFL head at the close. Auxiliary tasks may train shared representations (state-value network, shrinkage, regime rating, calibration diagram code). They may not move the NFL mean.
3. Operator library, each with a mapping note and a unit-break note, loaded from this file.
4. Auxiliary heads: hockey Skellam, tennis regime-Elo, MLB RE24, NBA rest residual. Metrics are Brier or log loss on those sports. They do not count as an NFL win.
5. NFL candidates, one at a time, against CRPS 7.109: decay-ξ team strength, event-level Skellam plus points mixture, CQR+AgACI on the close, rest and coast as covariates, low-cell dependence on NFL-defined cells.
6. A candidate that loses stays in the library with the loss attached. Deleting it was the mistake this file corrects.

## Integrity rules that did not get relaxed

- No invented coefficient.
- No close used as a feature before the close.
- No product-of-legs parlay price.
- No inverted Venn-Abers point probability.
- No averaging of 36.61 and 45.42.
- No MODEL_VERSION bump from an ingest.
- A foreign point estimate (NBA rest points, tennis Brier, hockey empty-net rate, Efron–Morris c) is a citation in the lecture, not a prior mean, unless a pre-registered hierarchical model shrinks it and the NFL head still beats the bar without it.
