# [0592] The Relative Importance of Ability, Luck and Motivation in Team Sports: a Bayesian Model of Performance in the English Rugby Premiership (arXiv:2110.00001v2)

**Citation:** Fioravanti, F., Delbianco, F. & Tohmé, F. (2021). *The Relative Importance of Ability, Luck and Motivation in Team Sports: a Bayesian Model of Performance in the English Rugby Premiership*. arXiv:2110.00001v2. URL: https://arxiv.org/abs/2110.00001v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,934 lines).
**Verdict:** REJECT for direct predictive use — the paper's headline "effort" result rests on an effort proxy computed from the same game it explains (tries share of that game's scoring attempts, mechanically tied to score difference); ADAPT only the lagged/structural components — Student-t margins with estimated ν, the dynamic-ability random walk, and the luck variance decomposition — with strictly lagged pregame aggressiveness proxies, never same-game ratios.

## 1. Research question
Beyond the usual ability-vs-luck framing of results in contact sports, can a measurable proxy for player motivation — "effort," operationalized in rugby as the tries share of scoring attempts — be shown to explain score differences in the English Rugby Premiership 2020/21, disentangled from team ability, home advantage, and luck, using a Bayesian hierarchical model?

## 2. Dataset / schema
English Premiership Rugby 2020/21: 12 teams, 22 rounds, 122 regular-season games analyzed (playoffs excluded — different incentives; 10 games canceled due to COVID-19). Per-game schema: total score, tries, conversions, penalties, drop kicks (scored and attempted), attendance. Source: the corresponding Wikipedia entry. Priors built from 2019/20 final standings: attack/defense rankings from tries scored and points received, normalized and averaged. The season ran during the COVID-19 pandemic (several games with zero attendance). Season won by Harlequins (4th in league phase).

## 3. Method / model
Bayesian hierarchical model (rstan; 4 chains × 2500 iterations, 1500 warm-up; full Stan code in Appendix) for the home-minus-away score difference y_g ~ t_ν(a_diff(g) + eff_diff(g) + ha(g), σ_y), a Student-t likelihood with ν ~ Gamma(9, 0.5) for heavy tails. Three additive components: (a) ability difference — team abilities follow a random walk over weeks, a_{w,team} = a_{w−1,team} + σ·η, with week 1 anchored to previous-season performance via a_{1} = β_prev·prevperf + η; (b) effort difference — eff_diff(g) = β_effort·(effH(g) − effA(g)), with effH(g) = tries/(tries + attempted scoring kicks); (c) home advantage — ha(g) = β_home + β_atten·atten(g) (+ β_day·day(g) in Model III). Four model variants: I (no attendance), II (+attendance), III (+weekend-day dummy), IV (prevperf from points instead of tries). Posterior predictive checks via 10,000 replicated score-difference histograms; identifiability of the σ·η product checked with trace plots.

## 4. Equations & assumptions
Likelihood: y_g ~ t_ν(a_diff(g) + eff_diff(g) + ha(g), σ_y), ν ~ Gamma(9, 0.5) (shape 9 chosen as less skewed than Kharratzadeh's Gamma(2,0.5) for soccer, matching rugby's larger mean score differences).
Ability: a_diff(g) = a_{hw(g),ht(g)} − a_{aw(g),at(g)}; a_{hw(g),ht(g)} = a_{hw(g)−1,ht(g)} + σ·η_{hw(g),ht(g)} for hw ≥ 2; a_{1,ht(g)} = β_prev·prevperf(ht(g)) + η_{1,ht(g)}.
Effort: eff_diff(g) = β_effort·(effH(g) − effA(g)); effH(g) = (home tries in g)/(home tries in g + attempted home scoring kicks in g), where attempted kicks = conversion opportunities + attempted penalties + attempted drops.
Home advantage: ha(g) = β_home + β_atten·atten(g) (atten = 0/1 for fan attendance); Model III adds β_day·day(g) (1 if Saturday/Sunday).
Priors: β_prev, β_effort, β_home, β_atten, β_day ~ N(0.5, 1); σ ~ N(0, 0.1), η ~ N(0, 0.5).
Luck (Section 6): two definitions — (i) Tango-style variance decomposition Var(Performance) = Var(Luck) + Var(Effort) + Var(Ability) with Var(Luck) = p(1−p)/g, p=0.5, g=22; (ii) luck as large residuals from the regression (unobserved variables with huge impact), classified into four Elias/Gilbert-Wells types (I: physical randomization, II: simultaneous decisions, III: unpredictable human-performance fluctuation, IV: matchmaking).
Assumptions stated: team ability changes slowly (bounded distance from prior season); effort proxy = attacking/risk-seeking mindset (tries over kicks) — the authors acknowledge it is "a strong proxy for attack mindedness" that disregards defensive skill; playoffs excluded because elimination incentives differ; ability random-walk innovations are Gaussian.

## 5. Features / target
Features: per-team per-week ability (latent random walk, anchored on prior-season tries/points rankings), per-game effort ratios effH/effA (tries share of scoring attempts), attendance indicator, weekend-day indicator. Target: score difference y_g (home minus away points). Luck analysis targets: variance components and large residuals.

## 6. Validation design
No train/test split; no out-of-sample prediction. Validation is posterior-predictive: replicated score-difference histograms (10,000 draws) compared against the observed histogram (means and SDs), plus robustness across the four model specifications (coefficients stable) and prior-sensitivity checks on β_home (priors with means 2, 4, 6 all converge to posterior ≈ 0.3). Rhat ≈ 1.00 and large n_eff for all parameters. The "luck" case studies (three blowout games) are qualitative post-hoc narratives, not a predictive test.

## 7. Numerical results / baselines
- Model II posteriors (Table 4): β_prev = 1.758 [0.297, 3.185]; β_effort = 3.114 [1.574, 4.639]; β_home = 0.324 [−0.028, 0.657]; β_atten = 0.376 [−0.588, 1.354]; ν = 13.011 [5.445, 25.335]; σ_y = 1.683 [1.380, 2.012]. (Model I, Table 3: β_home = 0.366 [0.036, 0.704]; β_prev = 1.760; β_effort = 3.147; ν = 12.375; σ_y = 1.664.)
- Model III: β_day = −0.003 [−0.732, 0.715] — no weekend effect. Model IV (points-based prevperf): β_prev drops to 1.1 [−0.3, 2.5]; β_effort stays 3.1 [1.6, 4.6].
- Descriptive: home mean score 26.22 vs. away 22.35; home tries 3.248 vs. 2.796; mean effort home 0.37, away 0.36 (many games at exactly effort = 1/2, the try+conversion structure).
- Luck variance decomposition: Var(Luck) = 0.01136364; Var(Performance) = 0.03798835; Var(Effort) = 0.01563645; Var(Ability) = 0.01098826 — effort, luck, and ability contribute roughly equal thirds to performance variability.
- Bivariate posteriors show no correlation between β_effort and β_prev/β_home — effort captures an effect distinct from ability and home support.
- No predictive-accuracy metrics reported (the authors state their goal is explanation, not prediction).

## 8. Code / data availability
Full Stan model code printed in the Appendix (data block: nteams, ngames, nweeks, home/away week/team indices, score_diff, prev_perf, RatioH/RatioA, Att, Day). No repository link stated. Data from Wikipedia (no static snapshot).

## 9. Leakage & limitations
- Entirely in-sample: the model is fit and interpreted on the same 122 games; no holdout, no forecasting test — the "effort is highly relevant" claim rests on in-sample posterior intervals.
- The effort proxy is target-contaminated by construction, and this is the fatal leakage: effH(g) is computed from game g's own tries and kick attempts — the same game whose score difference y_g is the target. Score difference is mechanically tied to tries, so β_effort is estimated on a regressor that contains the outcome. Any NFL port that uses same-game aggressiveness (that game's 4th-down go-rate, PROE, blitz rate) inherits this leakage verbatim, since in-game aggressiveness is jointly determined with the score. The only valid GSE port uses STRICTLY LAGGED pregame aggressiveness (season-to-date values entering game g, never game-g values).
- Beyond leakage, the rugby ratio is a design choice the authors admit is "not uncontroversial" (a team scoring more tries can get a lower effort index; it ignores defense entirely and rewards risk-seeking over winning).
- Single 22-round season, 12 teams — small sample; the β_effort interval [1.57, 4.64] is wide.
- Ability random-walk innovations assumed Gaussian with fixed σ; no learning from within-season information (transfers, injuries) beyond the walk.
- The luck case studies (Wasps 34–5 Exeter, Worcester 14–62 Northampton, Exeter 74–3 Newcastle) are post-hoc storytelling on the three largest residuals — classic Texas-sharpshooter risk.
- COVID-19 season: canceled games, empty stadiums, disrupted schedules — the 2020/21 Premiership is an unusual season, limiting external validity even within rugby.
- External validity to NFL: the effort index has no direct analog (NFL has no kick-vs-try tradeoff under a bonus-point system); the transferable piece is the decomposition structure, not the variable definitions.

## 10. GSE overlap
Extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1: 2026-09-17 gse-lab), the repo already contains 4th-down aggressiveness, PROE+, and turnover-luck layers, plus Bayesian/state-space team-strength models — but nothing that jointly decomposes margin of victory into ability (random-walk) + effort/aggressiveness + home + heavy-tailed luck in one hierarchical model, and nothing using a Student-t likelihood with estimated ν on NFL margins. The effort concept overlaps GSE's aggressiveness metrics; the hierarchical template and the luck-variance decomposition are new structure in the same lane.

## 11. GSE implementation spec
Port the hierarchical template to NFL on nflverse (2015–2025): y_g = home−away margin ~ t_ν(a_diff + eff_diff + ha, σ_y). Ability: per-team random walk over weeks, week 1 anchored on prior-season EPA/play (instead of tries rankings). Effort/aggressiveness: the paper's same-game ratio is REJECTED as target-contaminated (§9); the only valid port uses STRICTLY LAGGED pregame aggressiveness — season-to-date values entering game g (through week w−1): 4th-down go-rate over expected, PROE, blitz rate — as β_effort·(aggH_lagged − aggA_lagged), testing each proxy separately. Home: β_home + attendance/COVID-era dummies (2020 empty stadiums give a natural experiment the paper lacked). Fit in Stan (adapt the paper's Appendix code directly — swap RatioH/RatioA for lagged aggressiveness series). Luck: residual-based outlier classification à la Section 6, plus the Tango variance decomposition Var(Performance)=Var(Luck)+Var(Effort)+Var(Ability) computed on GSE's own pick record. Negative control: also fit a same-game-aggressiveness variant; it must NOT be used predictively — it exists only to demonstrate the leakage inflation (expect its β_effort to be larger and its holdout performance worse-or-equal). Effort: ~2 engineer-weeks.

## 12. Reproducible test
Dataset: nflverse regular-season games 2018–2025, time-ordered rolling: fit through week w−1, predict week w (2024–2025 scored). Effort features for predicting week w use ONLY data through week w−1 (strictly lagged; a same-game construction is the §9 leakage and is excluded from the scored test). Metric: log-loss on win/loss (from model-implied margin distribution) and MAE on margin. Baselines: (a) ability-only hierarchical model (β_effort = 0), (b) engine v5.2.7 margins, (c) de-vigged market spread. Test the marginal contribution of the lagged effort term.

## 13. Acceptance / rejection gate
Adopt if: the lagged-β_effort posterior 95% interval excludes zero for at least one aggressiveness proxy AND the lagged-effort model beats the ability-only baseline log-loss by ≥0.5% on 2024–2025 rolling AND the same-game negative-control variant does not outperform the lagged variant on the scored window (it must not — if it does, the test window itself is contaminated). Reject if the lagged effort coefficient is not distinguishable from zero for any proxy — then the "motivation" term is noise in the NFL context and the decomposition reduces to ability + home + luck.

## 14. Improvement experiment
Make effort time-varying and incentive-aware: model β_effort as a function of game state (playoff leverage, elimination, rest-vs-seed scenarios) to test the paper's implicit assumption that motivation is constant. If effort effects concentrate in high-leverage games (and reverse for eliminated teams — tanking), the model gains a situational-motivation layer the paper never attempts, directly usable for late-season spread adjustments.
