# [0281] Causal Hangover Effects (arXiv:2412.21181v1)

**Citation:** Santucci, A., & Lax, E. (2024). *Causal Hangover Effects*. arXiv:2412.21181v1. URL: https://arxiv.org/abs/2412.21181v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1114 lines).
**Verdict:** ADAPT — the quasi-experimental design (identify a latent behavioral effect via lagged-location instruments, control on market-implied expectations, placebo-test the 24h window) is a portable template for GSE's NFL situational spots; the nightlife finding itself is NBA/MLB-specific entertainment, not directly NFL-actionable.

## 1. Research question
Does playing in a city with active nightlife ("party city") the day before a game causally reduce a team's next-day performance — the "hangover effect" — as measured by the probability of beating bookmakers' expectations, in the NBA and MLB? The mechanism proxy is lagged game location (LA/NYC discrete indicator; BLS musician-establishment continuous index), with identification resting on next-day opponent being uncorrelated with last game location conditional on the spread/moneyline.

## 2. Dataset / schema
- Spreads/moneylines: covers.com scraped; outcomes from basketball-reference.com / baseball-reference.com.
- NBA: 2010-11 through 2016-17 seasons, 7,829 games (some missing: early 2010-11, 229 missing in lockout-shortened 2011-12).
- MLB: 2011–2017, 12,709 games (~2,100/season vs 2,430 possible; missing URLs claimed exogenous).
- Added features: days since last game, lagged game location, travel distance (stadium lat/long), east-west bearing (sin of great-circle bearing) for jetlag, minutes data (ESPN; possession-change fatigue from FGA/3PA/TO/rebounds), time of game.
- BLS Quarterly Census: sound recording studios + musical groups + music publishers per MSA-quarter 2010–2016, lagged one year; Toronto excluded (Canada).
- Party measures: (1) discrete = visited LA or NYC within 24h of game; (2) continuous = log(musician-establishments in last-game MSA), rescaled to [0,1], zero if last game >24h ago; MLB variant interacts with weekend.

## 3. Method / model
- Logistic regression: P(cover spread | party, controls) for NBA; P(win | bookmaker odds, party, controls) for MLB.
- Controls: home indicator, rest time (hours/days), logged travel distance, east-west direction + interaction (jetlag), lagged possession-change count (fatigue), time of day.
- Identification argument: efficient market ⇒ P(beat spread) ⊥ last game location; any residual effect of lagged "party city" is causal hangover. Placebo test: party-city indicator interacted with >24h rest should be null.
- Mechanism drill-down: OLS of team points allowed/scored on party indicators (NBA).
- Betting validation: train on history, predict current year, bet $100 wherever model EV > 0 after vig; track cumulative profit per season (MLB).

## 4. Equations & assumptions
Logistic model (stated in prose, not as a single equation; no closed-form math block): logit P(meet spread) = β_party·Party + controls (rest, jetlag, home, fatigue, time). OLS: PointsAllowed = β·Party + controls.
Stated assumptions: (1) P(beat spread) ⊥ lagged location under market efficiency (identification); (2) spreads already incorporate fatigue/jetlag/rest (explains null controls); (3) unknown NBA travel schedules don't systematically bias the lagged-location proxy; (4) BLS musician count is a valid nightlife proxy; (5) partying is the mechanism (latent, not observed directly).
Discrete indicator: party = 1 if last game in LA or NYC within 24h (from retired-player interviews ranking LA, NYC top). Continuous: rescaled log music-establishments in last-game MSA.

## 5. Features / target
- Features: party discrete indicator, party continuous index (MLB: ×weekend), lagged possession changes, logged travel distance, east-west bearing, interaction, hours/days rest, time of day, home indicator, bookmaker odds (MLB).
- Targets: NBA — binary meet-the-spread; MLB — binary win (conditioned on moneyline-implied probability); mechanism regressions — team points allowed, team points scored.

## 6. Validation design
- Quasi-experimental; no train/test split for inference (all-seasons pooled, 9,517 NBA back-to-back obs; 26,473 MLB obs; 6,234 for points models).
- Placebo: party × (>24h rest) interaction — null expected and observed (coefficient 0.053, SE 0.084).
- Betting backtest: expanding-window train, predict each subsequent season 2011–2017 MLB, $100 flat bets on positive-EV spots. Profitable every season per paper (2016 ended +$11.5k; worst drawdown $89 early 2016; 2015 worst year but still positive). No transaction-cost realism beyond vig; no holdout statistical test of profitability.

## 7. Numerical results / baselines
- NBA meet-the-spread logit (n=9,517): party discrete −0.557*** (SE 0.149); party continuous −0.158* (SE 0.095). All other controls insignificant (jetlag, rest, travel distance, home) — consistent with spreads already pricing them. Log-likelihood −6586.3, AIC 13200.6.
- MLB win logit (n=26,473): continuous nightlife ×weekend −0.120* (SE 0.071); no-weekend interaction 0.137 (SE 0.134, n.s.); bookmaker odds 2.682*** (0.158).
- Points models (n=6,234): party discrete → +2.970*** points allowed (SE 0.835); continuous → +1.661*** allowed (SE 0.644); points scored effect −0.139 (n.s.). Mechanism: defense, not offense. R² ≈ 0.09.
- Placebo (NBA, >24h rest): 0.053 (0.084), null not rejected — effect dissipates with rest.
- Betting: positive in all 7 MLB seasons; no CIs or Sharpe reported.

## 8. Code / data availability
None stated (no repo, no data links; sources named: covers.com, basketball-reference.com, baseball-reference.com, BLS, ESPN minutes).

## 9. Leakage & limitations
- Proxy validity: "party city" is an interview-derived anecdote (LA, NYC); the continuous BLS-musician index is a creative but unvalidated proxy — Memphis bottoms it, San Antonio misranks (appendix admits misrankings). Effect could load on unmeasured confounders correlated with LA/NYC (coastal travel, media distraction).
- NBA travel schedule unobserved: can't know which city the team slept in — the lagged-location proxy is noisy; attenuation would understate, but selective travel patterns could bias.
- Identification assumption (P(beat spread) ⊥ lagged location) is asserted, and the paper's own Figure 1 shows last-game location correlates with next-day opponent (esp. west coast) — spreads may not fully absorb this.
- MLB: series structure means "party city" often = home city for several days; players at home may party differently than on road — confounds the mechanism.
- Betting backtest is thin: no bet counts, no significance, no out-of-sample beyond the same 2011–2017 window used for inference, $100 flat stakes, no limits/juice realism.
- Multiple-comparisons: discrete and continuous measures, weekend interactions, several sports — significance at p<0.1 for the continuous MLB measure is weak.
- External validity to NFL: minimal — NFL has no back-to-backs, weekly cadence, different travel/party structure. The transferable part is the method template, not the finding.

## 10. GSE overlap
Per existing-research-map: GSE's corpus covers rest/bye (edge vanished post-2011 CBA), travel/altitude (no verified coefficient), wind/weather, and market microstructure (CLV, de-vigged consensus, beat-the-close). Nightlife/hangover situational effects are NOT covered — this is a new capability in the sense of a *method pattern* (lagged-location instrument + market-expectation conditioning + placebo time-window), but the specific finding has no NFL analogue in-repo. Relevant: repo has referee-crew totals work (situational spot mining) and the 2026-09-19 x-sweep situational work — this paper's template fits that lane. CEPT/Garrett's causal lanes: the paper is a genuine causal-inference-via-market-design example, adjacent to the ML brief's causal-inference topic (commissioned, results pending).

## 11. GSE implementation spec
- Do not chase nightlife. Port the design: build an NFL "situational spot" screener that (1) constructs lagged-context features (short rest, cross-country travel, Thursday-after-Sunday, altitude back-to-back, dome→cold outdoor), (2) regresses ATS cover / CLV-beat on the feature CONDITIONING on the de-vigged market line (the paper's key move: market absorbs public info, residual = candidate edge), (3) runs the placebo analogue (effect should vanish with ≥10 days rest or at neutral sites).
- Data: nflverse 2006–2025, Odds API / de-vigged consensus lines (repo already has market-capture tooling), stadium coords.
- Model: logistic ATS-cover regression with market-spread-implied probability as offset; FDR control across many candidate spots (the paper's weakness — fix it).
- Effort: 2–3 days for screener + 1 day for placebo harness.

## 12. Reproducible test
- Dataset: nflverse 2015–2024 regular seasons, closing lines (consensus).
- Candidate spots: short-rest road teams (≤6 days rest), cross-3-timezone travel, Thursday games after Sunday road games.
- Metric: ATS cover rate vs 52.38% breakeven, and CLV (beat closing line by ≥0.5 pt) rate; exact binomial tests, Benjamini–Hochberg across spots.
- Baseline: overall ATS cover rate 50% (vig-adjusted breakeven 52.38%).

## 13. Acceptance / rejection gate
Adopt a situational spot into the engine only if: (a) ATS cover rate ≥ 54.5% over ≥200 occurrences with FDR-adjusted p < 0.05, AND (b) the placebo (same spot with ≥10 days rest, or neutral-site analogue) shows |effect| < 1.5pp and is non-significant, AND (c) CLV beat-rate > 50%. Otherwise log as noise and reject. The paper's own MLB continuous measure (p<0.1, n=26k) would NOT clear this gate — which is the point of the gate.

## 14. Improvement experiment
Time-decay kernel instead of 24h cliff: the paper's back-to-back-only window is "motivated by intuition, not data" (their words). Fit the hangover-style effect as a parametric decay over hours-since-exposure (e.g., exponential or spline in rest hours) across all rest intervals — this both tests the mechanism and yields a continuous rest-adjustment feature for the engine. In NFL terms: estimate the rest-differential effect curve from 4 days (Thursday) through 14 days (post-bye) rather than binning "short rest" dummies, and check whether the market already prices each point on the curve.
