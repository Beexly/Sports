# 0003 Luck is Hard to Beat: The Difficulty of Sports Prediction (arXiv:1706.02447v1)

**Citation:** Raquel Y. S. Aoki, Renato Assunção, Pedro O. S. Vaz de Melo (2017). *Luck is Hard to Beat: The Difficulty of Sports Prediction*. arXiv:1706.02447v1. URL: https://arxiv.org/abs/1706.02447v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the schedule-preserving random null (skill coefficient φ) is a genuinely useful diagnostic for how much of standings variance is irreducible noise, but the paper's NBA roster/salary model is dated, in-sample, and not a production predictor; take the null, leave the model.

## 1. Research question

How much of sports outcomes is skill vs luck, and does that ratio bound predictability? The paper asks: (1) can a "skill coefficient" — the excess variance of final standings relative to a schedule-preserving random null — classify leagues/seasons as skill-dominated vs luck-compatible; (2) how many teams must be removed (iteratively dropping the team farthest from average) before a league's standings look random; and (3) in the NBA specifically, can roster features (salaries, PER, volatility, coherence) predict game outcomes via a Bayesian Bradley-Terry model with Poisson score likelihood, and what underdog win probabilities does it imply?

## 2. Dataset / schema

- **Cross-sport standings data:** 270,713 matches, 1,503 seasons, 198 leagues, 84 countries, January 2007–July 2016, sourced from BetExplorer. Breakdown: basketball 42 leagues / 310 seasons; volleyball 51 / 328; handball 25 / 234; soccer 80 / 631.
- **NBA feature data:** from Basketball Reference — players, teams, salaries, and PER (Player Efficiency Rating) since 2004.
- **Schema (standings):** per season: league, season, team list, per-team wins/losses (or points), schedule structure. Per match: date, home/away teams, score.
- **Schema (NBA features):** per team-season: conference, top-five salary average, salaries 6–10, salary SD, average PER, team volatility, roster aggregate volatility, inexperience, roster coherence, roster size.
- **Access:** BetExplorer (public website, scraped — no longer straightforwardly scrapable under current ToS; treat as reconstructable but not downloadable) and Basketball Reference (public). No dataset file published with the paper.

## 3. Method / model

(1) **Skill coefficient:** φ = (s² − σ²_{2k}) / s², where s² is the observed variance of season-end standings scores and σ²_{2k} is the expected standings variance under a Monte Carlo null that replays the *actual* schedule with outcomes drawn from the *observed* home/tie/away frequencies. φ ranges over (−∞, 1]; φ ≈ 0 means standings variance is fully explained by chance given the schedule; the 95% null interval comes from the 2.5th/97.5th percentiles of the Monte Carlo replicates. (2) **Team-removal process:** iteratively remove the team farthest from the season's average score, recompute φ, and stop when φ falls inside the random-model interval — the fraction removed measures how much of the league is "signal" vs "noise." (3) **NBA Bayesian skill model:** adapts Bradley-Terry with a Poisson score likelihood and per-game random effects: Y_k ~ Poisson(N_k · α_{h(k)} / (α_{h(k)} + α_{a(k)}) + ε_k), with log α_i = wᵀx_i (team skill as a linear function of roster features), Gaussian priors on w and ε, Gamma hyperpriors on precisions, Metropolis-Hastings inference (10,000 iterations, 2,000 burn-in, mean acceptance rate 0.395, SD 0.02). Model selection by DIC. Underdog win probabilities are then computed from the fitted model for 2012–2016.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- φ = (s² − σ²_{2k}) / s²
- Y_k ~ Poisson(N_k · α_{h(k)} / (α_{h(k)} + α_{a(k)}) + ε_k)
- log α_i = wᵀx_i

Assumptions stated in the paper: matches are independent conditional on team strengths (schedule dependence beyond the preserved schedule structure is ignored); home/tie/away probabilities are pooled across teams and across the season when generating the null; the skill coefficient measures *excess standings variance*, which the paper interprets as skill but which also absorbs any schedule imbalance the null does not preserve (e.g., unbalanced schedules beyond home/away counts); the Poisson score model approximates a conditional binomial scoring process; priors are Gaussian on weights and random effects, Gamma on precisions (hyperparameter values as in the paper's specification); the iterative team-removal is descriptive, not a causal decomposition.

## 5. Features / target

NBA model features (exact list as in the paper): conference, top-five salary average, salaries 6–10, salary SD, average PER, team volatility, roster aggregate volatility, inexperience, roster coherence, roster size. Target: per-game score Y_k (Poisson likelihood), from which win probabilities and underdog win probabilities are derived. The cross-sport analysis has no features — its "target" is the season standings vector, summarized by φ. Prediction horizon: single games (NBA model); full seasons (skill coefficient).

## 6. Validation design

Weak by modern standards. The skill-coefficient analysis is descriptive: φ is computed per season and compared against its own Monte Carlo null interval — there is no held-out prediction. The team-removal process is likewise in-sample and selection-biased (removing extreme teams until the remainder looks random mechanically shrinks variance). The NBA Bayesian model is evaluated largely in-sample: the reported average correlation of 0.7399 between estimated skill and regular-season wins is circular (wins are the data the model was fit on). MCMC diagnostics are reported (10,000 iterations, 2,000 burn-in, acceptance 0.395 ± 0.02) but there is no time-ordered predictive test, no proper scoring rule (log-loss/Brier) on held-out games, and no baseline comparison (e.g., vs Elo or betting odds) for the NBA model. DIC is used for feature selection, which is in-sample model selection.

## 7. Numerical results / baselines

All numbers below are the paper's, quoted exactly:

- Basketball: all seasons classified as skill-dominated; 99.39% of volleyball seasons classified as skill-dominated.
- Pure-luck-compatible seasons: handball 17.95%, soccer 7.13%.
- Average team removal to reach the random interval: basketball 50%, volleyball 40%, handball 14%, soccer 19%/20% (both values appear in different passages — preserved as stated).
- NBA: requires 17–25 of 30 teams removed before standings look random.
- Skill coefficients: NBA φ > 0.95; English Premier League ≈ 0.77; Primera División 0.80; Série A 0.63; Algerian Division 1 2014–15: φ = −1.93 (negative — standings *less* dispersed than the random null).
- Average correlation between estimated NBA skill and regular-season wins: 0.7399.
- MCMC: 10,000 iterations, burn-in 2,000, mean acceptance rate 0.395, SD 0.02.
- Underdog win probabilities, 2012–2016 mean: P(U) = 0.36; away underdog 0.27; home underdog 0.45; away underdog vs removed elite team 0.19; home underdog vs removed elite team 0.17.

## 8. Code / data availability

None stated. No code repository, no dataset download. Data sources named (BetExplorer, Basketball Reference) but no replication files.

## 9. Leakage & limitations

- **φ is excess standings variance, not causal "skill."** Anything the schedule-preserving null fails to capture — unbalanced schedules, mid-season roster changes, tanking — inflates φ and gets labeled "skill." The null preserves the schedule fixture list and pooled home/tie/away rates but pools those rates across teams and the season, so team-specific home advantage becomes "skill."
- **The team-removal procedure is circular.** Iteratively deleting the most extreme teams until the remainder passes a randomness test is selection bias as a method: it will *always* terminate, and the "50% of basketball teams must be removed" headline is a property of the procedure as much as of the sport. It cannot distinguish "half the league is signal" from "the test has no power after selection."
- **NBA model validation is in-sample.** The 0.7399 correlation between estimated skill and wins is not validation — wins are the fitting target. No held-out log-loss, Brier score, or comparison against Elo/market odds is reported. A model that cannot beat a 2017 Elo on held-out games is not a predictor, whatever its DIC.
- **Poisson approximation is questionable.** Modeling scores as Poisson conditional on a Bradley-Terry win probability is an awkward hybrid; for soccer (low scores) the approximation is poor, and the paper applies the same machinery across sports with very different scoring scales.
- **Dated and non-transferable features.** NBA salary/PER structure from 2004–2016 predates the supermax era and modern cap dynamics; "roster coherence" and "inexperience" are hand-built features with no definitions precise enough to reimplement. Nothing here ports to the NFL without a full rebuild.
- **Negative φ is unexplained.** Algerian Division 1 2014–15 has φ = −1.93 — standings *less* variable than chance. The paper reports it but offers no mechanism (possible: collusion-avoidance, drawishness, or schedule artifacts). A metric that can go deeply negative without explanation is hard to trust at face value.
- **Independence assumption.** Games are treated as conditionally independent; rest days, back-to-backs, travel, and within-season momentum are all in the error term.
- **External validity to NFL:** the NFL has a 17-game season (vs 82-game NBA), so standings variance is noisier and φ will mechanically look more luck-like; the paper's cross-sport ranking (basketball most skill-dominated) partly reflects season length, a confound the paper does not adjust for.

## 10. GSE overlap

Partial overlap with GSE's inventoried rating-system work (Bradley-Terry, Elo, Glicko in the existing-research map) and with the "chance vs skill" theme, but the *schedule-preserving random null* as a diagnostic is new to GSE's corpus. GSE's calibration lane (CQR, ECE-by-slice, etc.) measures probability quality; this paper's φ measures outcome *irreducibility* — a different, complementary quantity: the floor below which no predictor can go given the schedule. The NBA roster model itself duplicates nothing in GSE (GSE has no salary/PER-based NBA model inventoried) but is too dated and weakly validated to port. The fairness-adjacent finding (EPL φ ≈ 0.77) connects to paper 0004's EPL unpredictability discussion, not to existing GSE work.

## 11. GSE implementation spec

1. **Port the φ null to the NFL, not the NBA model.** For each NFL season 2002–2025 (nflverse schedules + scores): compute s² (variance of win totals / point differentials), then Monte Carlo the season 10,000× using the actual schedule with outcomes drawn from observed home/away/tie rates (and, as an improvement, team-specific home rates). Report φ per season with the 95% null interval.
2. **Use φ as an engine diagnostic, not a feature.** Track GSE's season-ahead win-total residuals against φ: in low-φ seasons the engine's error floor is higher and Kelly stakes should shrink; in high-φ seasons the signal-to-noise justifies more aggression. This is a *regime indicator* for bankroll management.
3. **Do not rebuild the NBA roster model.** Its features are NBA-specific, dated, and in-sample. If roster-quality modeling is ever wanted for NFL, build from nflverse + cap data with proper held-out validation instead.
4. **Effort:** 1–2 days for the NFL φ pipeline (nflverse has everything); the Monte Carlo is trivially parallelizable.

## 12. Reproducible test

nflverse play-by-play/schedules, NFL regular seasons 2010–2025. Compute φ per season with the schedule-preserving null (10,000 replicates, 95% interval from 2.5th/97.5th percentiles). Then test the paper's core descriptive claim in the NFL: is φ systematically lower in the 17-game era than in the 16-game era (2010–2020 vs 2021–2025), consistent with the season-length confound hypothesis? Metric: mean φ per era with bootstrap CIs. Baseline: the paper's cross-sport ordering (basketball > soccer in skill-dominance) — the NFL test succeeds descriptively if the pipeline reproduces sensible φ values (0 < φ < 1 for typical seasons) and the era contrast goes in the predicted direction. This is a diagnostic calibration test, not a prediction contest; it is runnable entirely from nflverse with no new data.

## 13. Acceptance / rejection gate

ADAPT the φ null as a GSE regime diagnostic if: (a) the nflverse pipeline reproduces the paper's qualitative behavior — median NFL φ in (0.3, 0.95) with < 10% of seasons falling outside (−0.5, 1.0) — and (b) season-ahead engine log-loss correlates positively with (1 − φ) across 2010–2025 seasons (Spearman ρ > 0.3, p < 0.10), confirming φ actually measures the engine's irreducible error floor. REJECT the NBA roster/salary model outright — no GSE build; it is in-sample, dated, and beaten in principle by any held-out-validated Elo. REJECT any use of the team-removal procedure: it is circular and adds nothing over φ itself.

## 14. Improvement experiment

Fix the paper's two confounds in one experiment: (1) replace the pooled home/tie/away null with a **team-specific** null (each team's own historical home/away rates) and a **rest-adjusted** null (back-to-back/travel penalties) — the gap between pooled-null φ and team-specific-null φ quantifies how much of "skill" was really schedule/home-advantage heterogeneity, directly addressing the paper's weakest assumption; (2) run the φ analysis on **point-differential variance** rather than win-total variance for the NFL, and compare against the engine's actual prediction errors: the ratio of engine MSE to null-expected MSE is a cleaner "skill vs luck" number than φ itself, because it benchmarks GSE against chance rather than benchmarking standings against chance. If that ratio is near 1, the engine is not beating the schedule-aware null and the modeling effort belongs elsewhere (e.g., in-game markets).
