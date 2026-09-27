# Deep-Read Ledger 0978 — Bookmakers' Mispricing of the Disappeared Home Advantage (Bundesliga COVID)

## Citation / full-text source

- arXiv:2008.05417 — full text: https://arxiv.org/pdf/2008.05417
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **Citation:** Deutscher, C., & Winkelmann, D. (2020). "Bookmakers' mispricing of the disappeared home advantage in the German Bundesliga after the COVID-19 break." arXiv:2008.05417v1 [econ.GN], 12 Aug 2020.
- **Full-text source:** https://arxiv.org/html/2008.05417v1 (HTML, read in full; ~37k chars)

## Research question
Did bookmakers adjust their odds to the disappearance of the home advantage when the German Bundesliga restarted behind closed doors (May–June 2020), or did mispricing open profitable betting strategies?

## Dataset / schema
- Match results + pre-game betting odds (30–56 bookmakers per match, average odds used) from www.football-data.co.uk.
- Season 2019/20 German Bundesliga split at round 25 (Mar 9, 2020): 223 matches with spectators, **83 matches without spectators** (rounds 26–34 + 2 postponed games).
- Reference: seasons 2014/15–2018/19 — 1,125 matches rounds 1–25, 405 matches rounds 26–34.
- Regression sample: 3,672 observations (each match counted twice: bet-on-home and bet-on-away).

## Method
1. De-margin odds → implied probabilities; compute per-match bookmaker margin.
2. Logistic regression testing whether any covariate beyond the implied probability predicts bet success (efficiency test following Forrest & Simmons 2008; Franck et al. 2011).
3. ROI of naive "always bet home" / "always bet away" strategies by period; granularity analysis by ImpProbDiff bins.

## Equations / math / assumptions
- Implied probability: **π̂_i = (1/O_i) / (1/O_h + 1/O_d + 1/O_a)**, i ∈ {h, d, a}, O_i = average odds.
- Bookmaker margin per match: **margin_m = Σ_i O_{m,i}^{-1} − 1**.
- ImpProbDiff = π̂_h − π̂_a (positive ⇒ home favourite per bookmaker).
- Efficiency logit model: **logit(Pr(Won_i = 1)) = β_0 + β_1·ImpliedProbability_i + β_2·Away_i + β_3·BettingAfterRound25_i + β_4·COVID_i + β_5·(Away_i·COVID_i) + β_6·RoundAfterRound25_i + β_7·(RoundAfterRound25_i·COVID_i)**, fit by MLE via R glm().
- Efficient-market null: no coefficient beyond β_1 differs from zero.

## Features / target
- Features: implied win probability, Away dummy, Betting-after-round-25 dummy, COVID (no-spectator) dummy, Away×COVID interaction, round trend + trend×COVID interaction.
- Target: binary Won_i (did the bet on home/away win).

## Validation
- Table 4: margin regressed on |ImpProbDiff| + season: −0.002*** per unit prob-difference; season −0.001***; R² = 0.468; N = 1,836. Margins ~5.09% (2014/15–2018/19 R1–25) → 4.79% (closed-door 2019/20).
- Table 5 (the key result), N = 3,672, AIC = 4,322.4: ImpliedProbability **4.530*** (0.231)**; Away **−0.162** (0.080)** (pre-COVID home bias); BettingAfterRound25 0.032 (ns); COVID **−0.606** (0.268)**; **Away×COVID +1.136*** (0.358)***; round-trend interactions all insignificant → bookmakers never adjusted during the 9 closed-door rounds.

## Exact results with baselines
- Table 1 — home wins: 49.63% (prev-season R26–34) → **32.53%** (closed-door); away wins: 26.91% → **44.58%** (+65% relative); draws 23.46% → 22.89%.
- Table 2 — away goals exceeded home goals for the first time (1.66 vs 1.43); home goals −20%.
- Table 6 ROIs, level stakes: **away bets closed-door +14.71%** vs **home bets −33.84%**. Baselines: 2014/15–2018/19 R26–34 home +6.24% / away −15.52%; 2019/20 with spectators away +5.53%.
- Table 7 (ImpProbDiff bins): bookmakers favoured home in ~60% of closed-door matches (avg +7.73 pp); in 39 "close" matches (|ImpProbDiff| ≤ 0.3): **19 away wins vs 9 home wins**; heavy home favourites (Δ>45 pp): only 11 of 16 won.
- Margins did NOT rise for closed-door matches (4.79% vs 4.83% with spectators) despite admittedly higher bookmaker uncertainty.

## Code / data availability
- No code repo. Data from football-data.co.uk (public odds/results archive). No data-sharing statement.

## Leakage
- Design is strictly ex-ante: pre-game average odds vs realized outcomes; no future information in features. The inefficiency test (Won beyond implied prob) is the standard anti-leakage formulation.

## Limitations
- German Bundesliga only; 83 closed-door matches is a small sample — +14.71% ROI has wide error bars (not formally tested with a t-stat in the paper).
- Average odds across 30–56 books; best-available-odds strategy would differ. Flat-stake ROIs; no Kelly or variance adjustment.
- Referee-bias / crowd decomposition relies on cited studies, not disentangled here.
- Why home advantage eroded pre-break (2019/20 with-spectators away-win rate already +5.53% ROI) is left unexplained.

## GSE overlap vs existing-research-map
- Map covers: betting-line prediction accuracy (1211.4000), PLOS ONE 2023 optimal-decision theory in sports betting, CLV as training label, de-vigged consensus, beat-the-close. **Gap explicitly listed: "Market microstructure in sports betting — only 1211.4000 + PLOS ONE 2023. Order flow, steam-move predictability... when public models beat liquid closes: thin."**
- Map's home-advantage coverage: Benz/Lopez comprehensive survey (2401.16392) — but that is a *levels* survey; this paper adds the *market-pricing-lag* dimension: bookmakers persistently misprice regime changes (COVID-19 = natural experiment).
- No overlap on the efficiency-test methodology itself (logit of Won on implied prob + regime indicators).

## Implementation spec (GSE adaptation)
- Build a standing "bookmaker-lag monitor": for each league/market (NFL spread, CFB, NBA), nightly logit of `won ~ implied_prob + regime dummies` (rule changes, weather regimes, neutral-site events, COVID-era-style attendance shocks). Flag any regime dummy |z| > 2 as a candidate edge window.
- Operationalize ImpProbDiff-close-match finding: GSE engine should widen its mispricing alerts on "balanced" games (small |ImpProbDiff|) during regime transitions, where this paper shows bookmakers undervalue the shifted side most (19 vs 9 in close Bundesliga matches).
- Reusable de-vig formulas (π̂_i, margin) slot directly into GSE's odds-normalization pipeline.

## Reproducible test
- Pull football-data.co.uk Bundesliga 2019/20 + 2020/21 (fans partially returned) odds; re-run the 7-coefficient logit; check whether Away×COVID coefficient reverses sign when spectators return (predict: positive in 2020 ghost games, fading in 2021 with restricted attendance — the "partial capacity" test the authors proposed).
- NFL analogue: 2020 NFL season (limited/no fans) — run `won ~ spread_implied + away + covid_2020 + away×covid_2020` on moneyline data; expect analogous Away×COVID > 0.

## Numeric gate
- **+1.136 (p<0.01) on Away×COVID, translating to +14.71% ROI on away bets over 83 matches** — the single decisive number: bookmakers did not reprice a regime change for 9 full rounds.

## Improvement experiment
- Replace the dummy-variable regime model with an online learner: Bayesian logistic regression with a changepoint detector on the Away coefficient, updated per round; measure how many rounds it takes to detect the home-advantage disappearance vs the bookmakers' 9-round failure. Secondary: test whether *closing* odds (vs the authors' average opening-ish odds) close the gap — i.e., does the market learn within the week?

## Verdict
**ADAPT** — the mispricing-lag test (logit of Won beyond implied probability with regime indicators) is a directly reusable GSE market-microstructure tool; fills the map's "when public models beat liquid closes" gap with an operational recipe.
