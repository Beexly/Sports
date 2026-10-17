# GSE Research Deep-Dive — 58 High-Relevance Papers
Handoff for implementation (Hermes / Fable). Prepared 2026-09-15.
Source: full-text reads of arXiv PDFs + code/data hunt. FightTracker (2312.11067) is withdrawn (no PDF).

How to read this: each dossier is written so you can implement without reopening the paper. Blocker IDs: **[C1]** calibration gate, **[C2]** MAE vs naive baseline, **[C3]** CEPT ensemble, **[C4]** Brier+CLV standard, **[C5]** bootstrap-mode replacement, **[C6]** pick lifecycle, **[C7]** data pipeline, **[C8]** stretch (Intelligence Graph / content / agents / widgets).

---

# Cluster A — Win probability & calibration

### 1704.00197 — iWinRNFL: A Simple, Interpretable & Well-Calibrated In-Game Win Probability Model for NFL
**Core method:** Logistic regression for home-win probability
\[
\Pr(H=1\mid x)=\frac{\exp(w^\top x)}{1+\exp(w^\top x)}
\]
on play-by-play states. Ten covariates: time remaining, score differential, time×score interaction, down, yards-to-go, field position, timeouts remaining (home/away), possession, and a pre-game team-strength differential (from a separate pre-game model / ratings). Trained by MLE on 295,844 plays from NFL regular-season games 2009–2015 via the (now-dead) `nflgame` API. Compared against a naive Bayes classifier and a small feed-forward net on the *same* features. Reliability evaluated by binning predicted \(p\) and plotting empirical win rate (fitted line \(R^2=0.998\) vs \(y=x\)). Accuracy uses the 0.5 threshold.

**Reported results:** Binary accuracy 76.5% (paper abstract says ~75%) vs 63% for a pre-game-only baseline. Nonlinear models gave no meaningful lift on the same feature set. Reliability curve sits on \(y=x\) across the full [0,1] range. No Brier/ECE number published (only the reliability plot). Sample: 7 NFL seasons, ~296k in-game states.

**Code/data available:** Paper says “source code and data will be made publicly available.” No repo found in 2026. `nflgame` is abandoned; equivalent data is `nflfastR` / `nfl_data_py` play-by-play (public).

**Direct application to GSE:** **[C1][C6][C2]**. This is the cleanest “math you can read” in-game WP template for NFL. Do *not* use it as the pre-game published-pick model — it is an in-play state model. Use it for: (a) live confidence updates after lock, (b) a transparent baseline that the current MAE-losing model must beat *in-play*, (c) a published reliability-curve method GSE should copy for the calibration gate (bin + \(y=x\) plot + Brier, not accuracy). The finding that RF/NN did not beat logistic on these features is a direct warning against swapping the global calibrator for a fancier head.

**Implementation cost/risk:** Low. 1–2 days to refit on `nflfastR` 2009–2025. Risk: pre-game rating feature leaks market information; if GSE’s published pick is pre-kickoff, this model is the wrong object. Also: logistic WP is not a score model, so it cannot fix spread MAE (C2) by itself.

**Supersedes/conflicts with:** Subsumed for soccer by 1906.05029 (which shows American-football-style classifiers *fail* late in soccer). Complements 2208.08598 (conformal WP is a better uncertainty layer on top of this logistic). Does not conflict with 1701.05976 (pre-game talent model vs in-game state model).

---

### 2207.13770 — Calibrate: Interactive Analysis of Probabilistic Model Output
**Core method:** Not a forecasting model. A Jupyter visual-analytics tool for *diagnosing* calibration. Contributions: (1) **Learned Reliability Diagram (LRD)** — fit a univariate regressor \(\hat{r}(p)=\mathbb{E}[Y\mid \hat{p}=p]\) (they use a smooth 1-D learner) instead of fixed-width bins, which removes the bin-count artifact that can make the same model look calibrated or not; (2) linked views: brush a probability band → instance table + feature-range filters + confusion matrix for that slice. Motivated by interviews with practitioners who use Brier/log-loss but cannot see *where* miscalibration lives (subgroup, score region, feature).

**Reported results:** No sports Brier/ECE. Case studies on Census income, recidivism, CIFAR-100 (accuracy 57% vs 59% with worse ECE on the more accurate net), plus a think-aloud with data scientists. Sports betting is named as a motivating domain only.

**Code/data available:** Promised as one-line Jupyter widget. No durable public repo located under Xenopoulos/Calibrate in this pass. Closest reusable stack: `netcal`, `uncertainty-calibration`, or `CalibrationAnalysis.jl` (multi-language ECE/reliability). Rebuild LRD in ~50 lines of sklearn (`IsotonicRegression` or GAMs of \(Y\) on \(\hat{p}\)).

**Direct application to GSE:** **[C1][C8]**. This is the calibration-*dashboard* for the launch gate, not a model. Replace static 10-bin ECE plots with: LRD + sport/league/week subgroup brush + instance-level miss list. That is how you find whether the 0.0699 ECE is global overconfidence or a specific sport/week/odds-band failure — which is exactly the “independent per-sport models” hypothesis test.

**Implementation cost/risk:** Low for LRD (hours). Medium for a full interactive app. Risk: treating visualization as a fix. LRD diagnoses; it does not lower Brier.

**Supersedes/conflicts with:** Complements every calibration paper in A. Does not compete with 2208.08598 (method vs tooling).

---

### 2208.08598 — Using Conformal Win Probability to Predict the Winners of the Cancelled 2020 NCAA Tournament
**Core method:** Conformal predictive distributions (CPDs, Vovk et al. 2019) on a linear score-margin model. Conformity score = residual. For a candidate margin \(y_c\) after seeing \(n\) games,
\[
\pi(y_c,\tau)=\frac{1}{n+1}\Big(\sum_{i=1}^n \mathbf{1}\{R_i < R_{n+1}(y_c)\}+\tau\cdot\mathbf{1}\{R_i=R_{n+1}(y_c)\}\Big)
\]
with mid-p \(\tau=1/2\). Win probability for team \(u\) vs \(v\) is \(1-\pi(0,1/2)\) (or the CPD mass on positive margin). Also: closed-form NCAA-bid probabilities via Poisson-binomial over conference-tournament win indicators; tournament-championship probability via the classic recursive single-elim formula of David (not Monte Carlo). Compared to OLS+normal predictive t and logistic classification on the same features, seasons 2014–15 through 2020–21 (journal version extends 2011–12 to 2022–23).

**Reported results:** Conformal WP better calibrated than linear-normal and logistic on men’s and women’s NCAA postseason games. No single headline Brier in the preprint abstract; the paper’s claim is reliability / fewer distributional assumptions, not raw accuracy dominance. 2020 counterfactual: championship probabilities delivered for the cancelled bracket.

**Code/data available:** **Yes.** https://github.com/chancejohnstone/marchmadnessconformal (R: scrape, CPD WP, calibration, conference-tournament recursion).

**Direct application to GSE:** **[C1][C5][C4]**. Strongest off-the-shelf replacement for ad-hoc bootstrap caps: wrap *whatever* margin model GSE uses in a CPD and publish \(\pi\), not a point probability. Conformal WP is evaluable with Brier/ECE and can be compared to closing-line implied probabilities (C4). Maps to pick lifecycle (C6): proposed = point model; locked = freeze the CPD evaluated at lock time (do not update conformity scores with post-lock info).

**Implementation cost/risk:** Medium. R reference exists; porting to Python (`mapie`, `crepes`, or a 40-line residual-CPD) is a week. Needs a numeric margin/score target per sport (NFL spread, MLB run diff, MLS goal diff). Failure mode: exchangeability. Sports are non-stationary (injuries, mid-season regime shifts). CPD coverage is guaranteed only under exchangeable residuals — GSE must split calibration windows by season *and* sport, not pool 1,164 picks.

**Supersedes/conflicts with:** Better uncertainty layer than iWinRNFL’s raw logistic \(p\). Complements 2501.02505 (partial ranks for *who is distinguishable*; conformal for *P(win)*). Does not replace a per-sport generative model (Cluster B).

---

### 1707.01855 — LinNet: Probabilistic Lineup Evaluation Through Network Embedding
**Core method:** Build a directed weighted matchup graph: nodes = lineups, edge \(j\to i\) if lineup \(i\) outperformed \(j\), weight = point margin per minute. Embed nodes with **node2vec** (biased random walks → skip-gram) into \(x_\lambda\in\mathbb{R}^d\). Predict
\[
\Pr(\lambda_A \succ \lambda_B)=\mathrm{logit}^{-1}(\beta_0+\beta^\top[x_A;x_B;\mathrm{dist}(x_A,x_B)])
\]
— a Bradley-Terry-style GLM on latent features, not raw plus-minus. Train/test by holding out later matchups, including unseen lineups (cold-start via embedding of similar walk neighborhoods).

**Reported results:** NBA 2007–08 to 2011–12. Out-of-sample matchup accuracy **67%** (ECML version 68%) vs adjusted plus-minus **55%**, PageRank **53%**, lineup-APM **59%**. **Brier score 0.19**. Reliability curve statistically indistinguishable from \(y=x\).

**Code/data available:** None found. NBA lineup stint data is reconstructable from play-by-play (`nba_api`, BigDataBall). node2vec: `stellargraph` / `node2vec` PyPI.

**Direct application to GSE:** **[C1][C2]** only if GSE models *unit vs unit* (NBA/NHL lineups, NFL personnel packages), not team-level moneylines. The transferable idea is: latent matchup embeddings + BT head beat additive player ratings, and they publish Brier 0.19 — under GSE’s 0.22 gate. For NFL/MLB/MLS team picks this is a stretch unless you redefine “lineup” as “recent-form roster embedding.”

**Implementation cost/risk:** High for NFL (lineup definition is messy). Medium for NBA if that market is added. Cold-start early season = exactly bootstrap-mode failure. node2vec hyperparameters matter; no official code.

**Supersedes/conflicts with:** Same author family as iWinRNFL. Overlaps 2501.02505 / 2406.19563 (ranking under sparse comparisons) — those are cleaner for team-level GSE than LinNet. 2207.14124 (GNN on game graphs) is the 2022 update of this idea.

---

### 1906.05029 — A Bayesian Approach to In-Game Win Probability in Soccer
**Core method:** Do *not* classify win/draw/loss. Model remaining goals as time-inhomogeneous Poisson:
\[
y_{>t,\mathrm{home}}\sim\mathrm{Poisson}((T-t)\,\theta_{t,\mathrm{home}}),\quad
\log\theta_{t,\mathrm{home}}=\alpha_t^\top x_t+\beta
\]
(and away analogously). Features \(x_t\): Elo differential, score differential, red-card differential, recent xT / goal-scoring opportunities, recent recoveries, time. Time-varying coefficients \(\alpha_t\) via a Bayesian hierarchical prior so rare states (early red card) shrink toward global. Inference: **PyMC3** variational inference (ADVI), not full NUTS, for speed. Win/draw/loss = posterior predictive \(P(y_h+s_h >,=,< y_a+s_a)\). Compared to LR, multinomial LR, random forest on the same states.

**Reported results:** Event data scraped from WhoScored, top-5 leagues, 8 seasons; last season held out (\(N=1{,}826\) matches). Base rates: 46% home / 25% draw / 29% away. **ECE (multiclass):** proposed **0.011 overall**, 0.012 H1, 0.013 H2, **0.002 final 10%**. LR: 0.023 / 0.031 / 0.069 / **0.174** (collapses late). RF overall ECE 0.024 but 0.101 in final 10%. Only the Bayesian remaining-goals model stays calibrated at the death.

**Code/data available:** No paper-official repo. Stack is public: PyMC v4/v5 (PyMC3 is unmaintained), ClubElo, soccerdata (Robberechts’ own scraper: https://github.com/probberechts/soccerdata). WhoScored scraping is ToS-fragile.

**Direct application to GSE:** **[C1][C2][C5][C7]** for **MLS**. This is the template for “independent per-sport probability model” in soccer: generative remaining-score model, not a global classifier. Also the cleanest published demonstration that **a well-tuned ML classifier can look fine on aggregate ECE and still be unusable in the regime GSE cares about** (late/live). For pre-game GSE picks, drop the in-play features and keep the Poisson + Elo + hierarchical shrinkage — that *is* Dixon-Coles/Baio-Blangiardo territory (see 2105.09881, 1607.00379).

**Implementation cost/risk:** Medium-high. Need event or at least shot/xG feeds for MLS (StatsBomb free seasons + soccerdata). Variational inference understates posterior width — for bootstrap-mode you want NUTS or at least more conservative tails. Draw mass in soccer is a first-class outcome; GSE’s Brier on 2-way moneylines must map 3-way → 2-way carefully.

**Supersedes/conflicts with:** Strictly supersedes “port iWinRNFL to MLS.” Agrees with 2408.08331 (Poisson remains competitive with ML for soccer). Uses the tooling advertised in 1607.00379.

---

### 1701.05976 — How often does the best team win? A unified approach to understanding randomness in North American sport
**Core method:** Bayesian state-space model on **betting-market point spreads / totals-implied margins**, not raw scores, so the observation model is comparable across NFL/NBA/NHL/MLB. Team strength \(\theta_{i,s,w}\) evolves:
- between seasons: AR(1) with variance \(\sigma^2_{\mathrm{between}}\)
- within season (week): AR(1) with \(\sigma^2_{\mathrm{within}}\)
- game noise: \(\sigma^2_{\mathrm{game}}\)
plus team-specific or league-constant home advantage. Observation: market margin ~ normal(\(\theta_i-\theta_j+\mathrm{HA}\), \(\sigma_{\mathrm{game}}\)). Fit in **rjags**, 20k iter / 2k burn / thin 5. Then: given posterior talent, compute \(P(\text{better team wins})\) and league-level luck metrics.

**Reported results:** Decade of Big Four. **NBA** = largest talent dispersion *and* largest HA. **MLB and NHL** = game outcomes closest to coin-flips given talent. Implied-probability reliability of the betting market itself is excellent (their Fig. 1). Code + figures: https://github.com/bigfour/competitiveness.

**Code/data available:** **Yes.** https://github.com/bigfour/competitiveness (JAGS + historical lines).

**Direct application to GSE:** **[C1][C2][C3][C4][C5]**. This is the most important paper in the set for GSE’s *architecture*.
1. It justifies **independent per-sport models** with different \(\sigma_{\mathrm{game}}\) — a global calibrator is structurally wrong because NFL and MLB do not share a noise scale.
2. It gives a **floor on MAE**: in high-noise leagues the naive market/mean baseline *should* win if GSE’s model is a worse talent estimator than the line.
3. Market-implied probabilities are the CLV benchmark (C4) and are already well-calibrated — GSE must beat the line, not just be internally consistent.
4. Posterior \(\sigma\) by sport is a principled bootstrap cap: early-season strength variance is \(\sigma^2_{\mathrm{between}}+\sigma^2_{\mathrm{within}}\), not an ad-hoc number.

**Implementation cost/risk:** Medium. JAGS model is public; rewrite in PyMC/Stan. Needs historical closes + results for NFL/MLB/MLS (MLS not in paper — you must estimate MLS \(\sigma\) yourself). Risk: using the market as both feature *and* label leaks CLV. Separate a “pure prediction” \(\theta\) trained on scores from a “market residual” model.

**Supersedes/conflicts with:** Sets the noise-floor that 2408.08331’s “ML ≈ Poisson” result lives inside. The uncomfortable implication for C2: if GSE’s MAE 5.31 vs naive 4.91 is on a spread-like scale, Lopez says you may be trying to beat a near-efficient market with a weaker talent model. That is not a tuning bug.

---

# Cluster B — Bayesian per-sport statistical models

### 1911.01815 — A Bayesian Quest for Finding a Unified Model for Predicting Volleyball Games
**Core method:** Two-level hierarchical Bayesian model tailored to volleyball scoring rules. Level 1: logistic for set winner (team abilities + HA). Level 2, conditional on set winner: truncated negative binomial for *loser’s* points; plus a Poisson inflation for extra points when the set goes beyond the 25/15 win-by-2 boundary. Winner’s points are then deterministic (25 or 15 + inflation). Team abilities shared across layers. MCMC. Posterior predictive match winner = simulate sets until 3.

**Reported results:** Professional volleyball leagues (Italian / Greek data in the Egidi–Ntzoufras volleyball trilogy). Predictive log-score / set-total calibration reported in the paper; not a Brier-on-NFL number. Model beats naive set-ignore Poisson and independent-set logits.

**Code/data available:** No official repo located. Reconstructible in Stan/PyMC from the likelihood in §2.

**Direct application to GSE:** **[C1]** only if volleyball is added. **Method pattern** is the point: **encode the sport’s scoring rule in the likelihood**, don’t force a generic binary head. That is the “independent per-sport model” doctrine applied correctly.

**Implementation cost/risk:** High relative to GSE’s current sports. Do not port the truncated-NB piece to NFL.

**Supersedes/conflicts with:** Same group as 1911.08791 and 1911.04541 — this is the *unified match* model; 08791 is hierarchical outcomes; 04541 is set-difference. If you ever model volleyball, start here (01815), not the other two.

---

### 1911.08791 — Bayesian Hierarchical Models for the Prediction of Volleyball Results
**Core method:** Hierarchical Bayesian models for match/set outcomes with team-specific attack/defense, HA, and partial pooling across teams/seasons. Standard sport-stat hierarchical GLM; volleyball application.

**Reported results:** Same domain as 01815; predictive checks vs independent models. Weaker as a standalone implementation spec than 01815.

**Code/data available:** None found.

**Direct application to GSE:** **[C1]** pattern only — hierarchical partial pooling is how bootstrap-mode should borrow strength across teams in a thin league.

**Implementation cost/risk:** Low conceptually, unused unless volleyball.

**Supersedes/conflicts with:** Superseded by 1911.01815 for volleyball. The pooling idea is better implemented for GSE via 1701.05976 / 2105.09881.

---

### 1911.04541 — Bayesian models for prediction of the set-difference in volleyball
**Core method:** Direct model of set-difference (not full point-by-point). Bayesian regression on set margin with team abilities.

**Reported results:** Volleyball set margins; useful for totals-like markets, not moneylines.

**Code/data available:** None found.

**Direct application to GSE:** Weak. Set-difference ≈ a sport-specific spread model. Only a template if GSE adds set-sport totals.

**Implementation cost/risk:** Skip for current NFL/MLB/MLS.

**Supersedes/conflicts with:** Least important of the volleyball trilogy. 01815 wins.

---

### 2411.02000 — Predicting and understanding shooting performance in professional biathlon (Bayesian)
**Core method:** Bayesian model of shot-level hit/miss in biathlon as a function of athlete, stage (prone/standing), fatigue/order, weather. Hierarchical athlete effects; interpretability-focused.

**Reported results:** Professional biathlon shooting data; athlete-level posterior hit probabilities and covariate effects. Not a match-outcome Brier.

**Code/data available:** Check paper supplement; no widely used public repo found in this pass.

**Direct application to GSE:** **[C5]** analog — hierarchical athlete/team effects with explicit uncertainty. Not a product sport.

**Implementation cost/risk:** Skip for core engine. Keep as a citation that hierarchical Bayesian “skill + condition” models are the right language for sparse individual-event data.

**Supersedes/conflicts with:** None in-set.

---

### 2409.17129 — Bayesian Bivariate Conway-Maxwell-Poisson Regression for Correlated Count Data
**Core method:** Bivariate COM-Poisson regression: each margin is COM-Poisson (handles both under- and over-dispersion relative to Poisson via a dispersion parameter \(\nu\)); correlation via a copula or shared latent. Fully Bayesian. Sports-relevant because football/hockey scores are counts that are *not* exactly Poisson (underdispersed in some leagues, over in others).

**Reported results:** Method paper; correlated-count applications including sports-like bivariate scores. COM-Poisson \(\nu \neq 1\) measurably improves likelihood vs Poisson when dispersion is wrong.

**Code/data available:** Typically authors ship R/Stan; confirm on arXiv page. No canonical GSE-ready repo verified here.

**Direct application to GSE:** **[C1][C2]** for **MLS and MLB run/goal models**. If GSE’s score head is Poisson and MAE loses, first test *dispersion*, not an NN. Bivariate COM-Poisson is the upgrade path from Dixon-Coles: keep generative scores, relax the variance=mean straitjacket, keep correlation.

**Implementation cost/risk:** Medium. COM-Poisson PMF is expensive (Bessel/Z functions). For production, estimate \(\nu\) per league per season, not per game.

**Supersedes/conflicts with:** Generalizes 2105.09881’s Poisson. Use Poisson first; COM-Poisson only if residual diagnostics say \(\nu\neq 1\).

---

### 2105.09881 — Poisson Modeling and Predicting English Premier League Goal Scoring
**Core method:** Classical / empirical Poisson (and Dixon-Coles-style) goal models for EPL: attack/defense ratings, HA, time-decay optional. Predict scorelines then map to 1X2.

**Reported results:** EPL seasons; Poisson remains a strong baseline for scorelines. Paper is pedagogical-applied more than SOTA.

**Code/data available:** EPL results are public (`football-data.co.uk`). Many reproductions.

**Direct application to GSE:** **[C1][C2][C4]**. The “start here” MLS/soccer model. Beats a generic ML regressor on sparse count outcomes more often than people expect (see 2408.08331).

**Implementation cost/risk:** Low. 2–3 days.

**Supersedes/conflicts with:** 2408.08331 is the bake-off that tells you *not* to replace this with XGBoost without a calibration reason. 1906.05029 is the in-play extension.

---

### 1704.00823 — A Hierarchical Bayesian Model of Pitch Framing
**Core method:** Hierarchical Bayes for catcher pitch-framing: P(called strike | location, count, catcher, umpire). Partial pooling over catchers/umpires; spatial pitch location.

**Reported results:** PITCHf/x era MLB; framing runs estimates with uncertainty. Not a game-winner model.

**Code/data available:** No canonical repo required; Statcast/PITCHf/x public.

**Direct application to GSE:** **[C7]** micro-event model, not C1. Only if GSE builds umpire/catcher features for MLB totals/run lines. Otherwise skip.

**Implementation cost/risk:** High data-eng, low product impact on current pick set.

**Supersedes/conflicts with:** None.

---

### 2503.21713 — Investigating Experiential Effects in Online Chess using a Hierarchical Bayesian model
**Core method:** Hierarchical Bayes on chess game outcomes: player Elo-like strength + “experience / tilt / streak” latent. Tests whether recent results shift strength beyond rating.

**Reported results:** Online chess; experiential effects small once strength is hierarchical. Sample is huge relative to GSE.

**Code/data available:** Lichess public dumps exist independently.

**Direct application to GSE:** **[C3][C5]**. Direct test of “momentum” as a latent. GSE should *not* add a momentum feature without this style of hierarchical control — 2404.13300-style HMMs overfit narratives. Result leans: experiential effects shrink under partial pooling.

**Implementation cost/risk:** Low as a diagnostic on GSE residuals (does last-week surprise predict this week after strength is in the model?).

**Supersedes/conflicts with:** Conflicts with naive momentum features in Cluster G. Hierarchical null wins until GSE proves otherwise.

---

### 1605.08753 — Fairly Random: The Impact of Winning the Toss on the Probability of Winning
**Core method:** Causal / design-based analysis of coin-toss advantage in cricket (and related). Because toss is randomized, ATE of toss-win on match-win is identified. Quantifies a small but real effect that varies by format (Test vs ODI vs T20) and conditions.

**Reported results:** Winning the toss changes P(win) by a few percentage points in some formats, near-zero in others. Code note in paper: https://github.com/dwillis/toss-up

**Code/data available:** https://github.com/dwillis/toss-up

**Direct application to GSE:** **[C3][C4]** as a *covariate hygiene* paper. Any sport with a randomized pre-game event (toss, opening draw) should enter the probability model as a known offset, not be absorbed into “team strength.” For NFL/MLB/MLS: analog is weather/park/rest, not toss.

**Implementation cost/risk:** Low. Don’t overfit a toss term into non-cricket sports.

**Supersedes/conflicts with:** Cluster D causal papers are the general toolkit; this is the cleanest sports ATE.

---

### 2206.13246 — Prediction of Football Player Value using Bayesian Ensemble Approach
**Core method:** Bayesian ensemble (stack/average of regressors with posterior weights) to predict transfer-market player value from performance stats.

**Reported results:** Player-valuation error metrics (MAE/RMSE on fees), not match Brier.

**Code/data available:** None required for GSE.

**Direct application to GSE:** **[C8]** B2B valuation widget only. Not C1/C2.

**Implementation cost/risk:** Skip for launch gate.

**Supersedes/conflicts with:** None.

---

### 2012.04378 — Forecasting the Olympic medal distribution during a pandemic
**Core method:** Socio-economic ML (GDP, population, host, past medals) to forecast national medal counts, including a COVID shock.

**Reported results:** Improved medal-count MAE vs previous socio-economic regressions. Not athlete-level.

**Code/data available:** National socio-economic + historical medal tables.

**Direct application to GSE:** Weak. Medal counts ≠ game WP. Only relevant if GSE ever prices Olympic markets.

**Implementation cost/risk:** Skip.

**Supersedes/conflicts with:** 2501.17711 is the stronger Olympic-count model (STGCN-LSTM + causal).

---

### 2011.11178 — Bayesian Nonparametric Estimation for Point Processes with Spatial Homogeneity (NBA shot locations)
**Core method:** Bayesian nonparametric spatial point process with piecewise-homogeneous intensity (shot charts). Clusters court regions with similar intensity; player-specific intensities.

**Reported results:** NBA shot-location maps; better spatial structure than a global intensity.

**Code/data available:** NBA shot logs public.

**Direct application to GSE:** **[C7]** feature engineering for NBA if added (shot-profile embeddings). Not launch.

**Implementation cost/risk:** High, off-roadmap.

**Supersedes/conflicts with:** None.

---

### 1801.02954 — A method for Bayesian regression modelling of composition data
**Core method:** Bayesian regression for compositional responses (Dirichlet / log-ratio). When outcomes are shares that sum to 1 (possession shares, shot-type mix, 1X2 probabilities as compositions).

**Reported results:** Methodological; composition-data examples.

**Code/data available:** Standard Dirichlet regression implementations (R `DirichletReg`, PyMC Dirichlet).

**Direct application to GSE:** Niche. Could model a 3-way soccer outcome as a Dirichlet response instead of two independent binaries. Usually a multinomial logit / independent Poissons is enough.

**Implementation cost/risk:** Skip unless 1X2 calibration is the MLS failure mode.

**Supersedes/conflicts with:** 1906.05029 already handles 3-way via score latents — prefer that.

---

### 1607.00379 — Probabilistic Programming and PyMC3
**Core method:** Tutorial: hierarchical Poisson rugby model in **PyMC3** (Baio-Blangiardo style). Home/away scores ~ Poisson with log-linear attack/defense + HA; partial pooling of team strengths. Posterior predictive scorelines.

**Reported results:** 2014 Six Nations illustration, not a benchmark.

**Code/data available:** https://github.com/springcoil/TutorialPyMCRugby ; PyMC3 itself is frozen — use **PyMC v5**.

**Direct application to GSE:** **[C1][C8] tooling**. This is the onboarding document for GSE’s per-sport generative models. If the stack is currently a point-estimate sklearn pipeline, adopting PyMC/Stan is the enabling move for C1+C5 (real posterior widths instead of bootstrap-mode fudge factors).

**Implementation cost/risk:** Medium politically (new dependency), low technically. Do not stay on PyMC3.

**Supersedes/conflicts with:** Tooling foundation for 1906.05029, 1911.01815, 1701.05976 (those used JAGS/PyMC3).

---

# Cluster C — Ensembles, ranking & rank-clustering

### 2406.19563 — Bayesian Rank-Clustering
**Core method:** Bayesian model that simultaneously ranks *and* clusters items: items in the same cluster are treated as statistically tied. Posterior over partitions + orders, rather than a forced total ranking. Built for comparison data where many pairs are noisy/sparse.

**Reported results:** Simulations + ranking datasets; recovers clusters when signal cannot separate items. Avoids overconfident total orders.

**Code/data available:** Author site / supplement (Pearce & Erosheva). Confirm before implementing; method is specify-able from the paper.

**Direct application to GSE:** **[C5][C1]**. Publish “these three teams are in the same tier” instead of fake 51/49 precision. That is a brand-honest move (“math you can read”) and a calibration move (don’t emit 0.53 when the posterior is a blob).

**Implementation cost/risk:** Medium statistics, low data. Needs pairwise or rating-scale inputs GSE already has.

**Supersedes/conflicts with:** Same job as 2501.02505. 2501.02505 is simpler (partial ranks from any BT-style model + agglomerative merge). Start with 2501.02505; graduate to rank-clustering if you need posterior partitions.

---

### 2501.02505 — Estimation of partial rankings from sparse, noisy comparisons
**Core method:** Nonparametric Bayesian / MAP procedure on top of *any* pairwise model (Bradley-Terry, etc.): only declare \(i \succ j\) when the data support it; otherwise leave a tie. Agglomerative algorithm. Designed for sparse, noisy comparison graphs.

**Reported results:** Simulations + comparison datasets; reduces false-precision rankings under sparsity. Repo: https://github.com/seb310/partial-rankings

**Code/data available:** **Yes.** https://github.com/seb310/partial-rankings

**Direct application to GSE:** **[C5]** primary replacement for bootstrap mode, plus **[C1]**. Early-season / thin-league: output a partial order and cap published confidence at the posterior separation. If two MLS teams are statistically tied, GSE should not lock a 58% pick.

**Implementation cost/risk:** Low-medium. Code exists. Map “comparison” = game result (or market-implied comparison). Failure: treating market odds as independent comparisons when they share a bookmaker residual.

**Supersedes/conflicts with:** Preferred over 2406.19563 for v1. Complements conformal WP (2208.08598): partial rank = who is distinguishable; CPD = P(win) if you still must publish a number.

---

### 2405.10247 — Alternative ranking measures to predict international football results
**Core method:** Bake-off of ranking inputs (FIFA points, Elo variants, pi-ratings, etc.) + statistical vs ML models to predict WC 2022 and AFCON 2023.

**Reported results:** Ranking-measure choice often moves predictions as much as model class. No single winner across both tournaments. Bayesian statistical models remain competitive with ML.

**Code/data available:** International results public.

**Direct application to GSE:** **[C2][C1]**. Before replacing the model class, replace the *strength feature*. GSE’s MAE loss may be a bad rating input, not a bad learner.

**Implementation cost/risk:** Low. Week of feature bake-off.

**Supersedes/conflicts with:** Agrees with 2408.08331 (architecture < features/ratings). Agrees with 1701.05976 (sport-specific rating dynamics).

---

### 2207.14124 — Graph Neural Networks to Predict Sports Outcomes
**Core method:** Represent a game as a graph (players/teams as nodes, interactions as edges — passes, matchups, lineup co-occurrence). GNN encodes the graph; head predicts outcome. Xenopoulos & Silva. Evaluated on sports outcome tasks where the graph is the natural state (they have esports/sports graph backgrounds).

**Reported results:** GNN beats flat tabular baselines when interaction structure is the signal. Gains shrink when you only have box scores (no interaction graph).

**Code/data available:** No simple official “drop-in GSE” repo verified. Needs sport-specific graph construction.

**Direct application to GSE:** **[C2][C7]** only after graph data exists (passing networks, lineup matchups). For current scraped box-score + odds, a GNN is premature and will lose to Lopez/Poisson.

**Implementation cost/risk:** High. Data is the blocker, not the GNN.

**Supersedes/conflicts with:** Modern version of LinNet (1707.01855). 2409.13098-style passing-network features are a cheaper halfway house (not in this 58, but in the original triage).

---

### 2206.09083 — Universal Behavior of Opponent Statistics and Applications to the MLB
**Core method:** Empirical regularity: opponent-level stat distributions show “universal” structure; used to stabilize strength estimates and projections in MLB.

**Reported results:** MLB; opponent-adjusted stats behave more stably than raw. Useful for projection systems.

**Code/data available:** MLB stat sources public (Retrosheet, FanGraphs).

**Direct application to GSE:** **[C2][C7]** for MLB feature construction — always opponent-adjust. Cheap, should already be in the pipeline.

**Implementation cost/risk:** Low.

**Supersedes/conflicts with:** Consistent with any hierarchical team model.

---

# Cluster D — Causal inference (CEPT operationalization)

### 2503.23911 — FineCausal: A Causal-Based Framework for Interpretable Fine-Grained Action Quality Assessment
**Core method:** Causal intervention on a graph-attention + temporal-attention scorer for action-quality (diving). Explicitly blocks spurious context (background, camera) via intervention, so the score depends on performance causes.

**Reported results:** SOTA-ish on FineDiving-HM with better interpretability. Not a betting Brier.

**Code/data available:** https://github.com/Harrison21/FineCausal

**Direct application to GSE:** **[C3][C8]**. Pattern, not model: **insert an intervention layer** that asks “would this pick flip if we shut off feature family F (odds / injuries / rest)?” That is a practical CEPT primitive — e-variables can be defined on residuals *after* intervention, not on raw likelihood. Do not implement the video architecture.

**Implementation cost/risk:** Low for the *idea* (ablation/intervention table per pick). High if you try to run their video code.

**Supersedes/conflicts with:** Conceptual cousin of CEPT, not a substitute for e-process math.

---

### 2202.08500 — Causal inference with recurrent and competing events
**Core method:** Identification and estimation for treatments with recurrent events and competing risks (time-to-event). Survival / counting-process toolkit (intensity models, IPCW, etc.).

**Reported results:** Biostat methods paper; sports is not the application.

**Code/data available:** Related author tooling: https://github.com/palryalen (check packages around the paper).

**Direct application to GSE:** **[C3]** only for injury / availability as recurrent events competing with “plays the game.” If GSE ever treats player injury as a treatment/confounder for team WP, this is the correct likelihood. Not launch-critical.

**Implementation cost/risk:** High expertise, deferred.

**Supersedes/conflicts with:** None directly.

---

### 2402.12400 — Estimating the age-conditioned average treatment effects curves
**Core method:** ATE as a function of age (continuous modifier). Curves with uncertainty; sports aging-curve adjacent.

**Reported results:** Method + applications where treatment effect varies with age.

**Code/data available:** Supplement; not a GSE product repo.

**Direct application to GSE:** **[C3][C7]** player-aging features with causal, not spline-overfit, age effects. Useful for MLB/NFL player-level props, not team moneylines at launch.

**Implementation cost/risk:** Medium, not launch.

**Supersedes/conflicts with:** Pair with 2110.14017 (aging curves using unobserved comparisons).

---

### 2110.14017 — What does not get observed can be used to make age curves stronger
**Core method:** Aging-curve estimation that uses *missing / selected-out* observations (players who retire, get benched) as information, not just survivors. Addresses the classic survivor-bias age curve.

**Reported results:** Stronger, less-biased age curves in sports player data.

**Code/data available:** https://github.com/schuckers/playeraging

**Direct application to GSE:** **[C7][C5]** if player-level projections enter the team model. Survivor-biased age curves will mis-calibrate end-of-career and rookie minutes.

**Implementation cost/risk:** Medium. Code exists.

**Supersedes/conflicts with:** Prefer this over naive age polynomials. Complements 2402.12400.

---

### 2501.17711 — STGCN-LSTM for Olympic Medal Prediction: Dynamic Power Modeling and Causal Policy
**Core method:** Spatial-temporal GCN + LSTM on country-sport graph; output is **zero-inflated compound Poisson** medal counts; causal checks + policy-shock simulation.

**Reported results:** Olympic medal forecasts; zero-inflation handles the many true zeros. Causal backtests of policy shocks.

**Code/data available:** Not a must-use official product repo.

**Direct application to GSE:** **[C1][C3]** the **zero-inflated count head** is the piece to steal for rare events (shutouts, longshot props). CEPT-adjacent because they actually run policy interventions on the fitted system.

**Implementation cost/risk:** Medium for the ZI-Poisson piece; skip the Olympic GCN.

**Supersedes/conflicts with:** Better Olympic model than 2012.04378. ZI-Poisson is complementary to 2409.17129 COM-Poisson.

---

# Cluster E — Uncertainty, diffusion, multi-agent trajectories

### 2503.18589 — Unified Uncertainty-Aware Diffusion for Multi-Agent Trajectory Modeling
**Core method:** Diffusion model over multi-agent future trajectories with explicit uncertainty; sports tracking context (NFL BDB / SoccerKit citations appear in the ecosystem).

**Reported results:** Trajectory NLL / ADE / FDE + calibration of uncertainty, not game Brier.

**Code/data available:** Relies on public tracking (NFL Big Data Bowl https://github.com/nfl-football-ops/Big-Data-Bowl, SportsLabKit).

**Direct application to GSE:** **[C8]** only if GSE ingests tracking. Not a calibration-gate fix.

**Implementation cost/risk:** High, off-roadmap.

**Supersedes/conflicts with:** Same family as 2604.02447 and 2005.12853.

---

### 2604.02447 — PlayGen-MoG: Diverse Multi-Agent Play Generation via Mixture-of-Gaussians
**Core method:** MoG generative model for diverse plausible multi-agent plays (set pieces / play sketches).

**Reported results:** Diversity/coverage of generated plays vs unimodal generators.

**Code/data available:** Check arXiv later versions; not needed for GSE launch.

**Direct application to GSE:** **[C8]** Galaxy Dynasty content / sim, not C1.

**Implementation cost/risk:** Skip for launch.

**Supersedes/conflicts with:** E-cluster internal.

---

### 2005.12853 — Space-Time VON CRAMM: Evaluating Decision-Making in Tennis with Variational Generative Models
**Core method:** Variational generative model of tennis shot/space-time; counterfactual “what a player could have done.” Decision quality = outcome vs model-generated alternatives.

**Reported results:** Tennis tracking; decision-evaluation case studies, not match Brier.

**Code/data available:** Limited; Hawk-Eye-like data is the blocker.

**Direct application to GSE:** **[C3]** conceptual — counterfactual generators are how you turn CEPT from a monograph into a test: define interventions on the generative play process. Not implementable on GSE’s current tabular feeds.

**Implementation cost/risk:** High data barrier.

**Supersedes/conflicts with:** FineCausal is the cheaper “intervention for interpretability” paper.

---

# Cluster F — Markets, betting efficiency, crowds

### 1710.02824 — Beating the bookies with their own numbers — and how the online sports betting market is rigged
**Core method:** Uses bookmaker *odds themselves* as features; finds apparent edges; then argues the market is structurally hostile (limits, juice, delayed steam, account restrictions). Empirical betting simulation.

**Reported results:** Headline “beats the bookie” results on historical odds; the second half is the warning: realized ROI after limits ≠ paper ROI. Repo: https://github.com/Lisandro79/BeatTheBookie

**Code/data available:** https://github.com/Lisandro79/BeatTheBookie

**Direct application to GSE:** **[C4][C6]**. CLV protocol paper. GSE’s public standard is *closing-line value*, not “we found +EV at open.” Also: pick lifecycle should timestamp the line at **lock** and compare to **close**, never to open. The “rigged” section is the compliance-toolkit rationale for not promising betting ROI in public copy.

**Implementation cost/risk:** Low to adopt the evaluation. High to treat their strategy as a product.

**Supersedes/conflicts with:** Tension with 2008.01485 (crowds/markets already efficient). Both can be true: paper edges exist, harvestable edges after juice+limits don’t.

---

### 2008.01485 — Wisdom of crowds: much ado about nothing
**Core method:** Empirical demolition of naive “average the crowd and beat the experts” claims. Conditions under which aggregation helps are narrow; often the crowd is just a worse bookmaker.

**Reported results:** Aggregation gains disappear under realistic dependence and selection. Repo note: https://github.com/JoseFontanari/Wisdom

**Code/data available:** https://github.com/JoseFontanari/Wisdom

**Direct application to GSE:** **[C2][C4]**. Do **not** ensemble GSE with scraped public-consensus picks and expect MAE to fall. The market close is the crowd that matters. Adding Twitter/Reddit consensus as a feature is more likely to inject correlated noise.

**Implementation cost/risk:** Low (it’s a don’t-do).

**Supersedes/conflicts with:** Conflicts with any “fan sentiment burstiness will fix calibration” idea from the original triage. Sentiment can be a weak auxiliary; it is not wisdom-of-crowds.

---

### 2412.19363 — Large Language Models for Market Research: A Data-augmentation Approach
**Core method:** Statistically principled blend of LLM-synthetic survey/preference data with real data. Estimator with finite-sample error bound; not “dump GPT rows into training.”

**Reported results:** Lower bias than naive substitution of synthetic for real. Consistency/asymptotic normality under their conditions.

**Code/data available:** Method paper; implement the estimator, don’t scrape a magic repo.

**Direct application to GSE:** **[C5]**. The *only* honest way to use LLMs on sparse early-season data: augment with a **bounded** synthetic weight, never let synthetic dominate the likelihood. Brand-safe because the published object is still a statistical estimator, not “AI picks.”

**Implementation cost/risk:** Medium. Easy to implement wrong (naive concat). Cap synthetic mass with their bound.

**Supersedes/conflicts with:** Does not conflict with the “no AI-powered copy” rule if synthetic data stays off the public narrative.

---

# Cluster G — Domain models & patterns

### 2312.11067 — FightTracker: Real-time predictive analytics for Mixed Martial Arts bouts
**Core method:** (Withdrawn by author, April 2026. No PDF.) From the surviving abstract: two regressions on UFC + MMA Decisions data — (1) judges’ majority score by round, (2) P(red wins | fight goes beyond R2) using in-round stats. Claimed ~80% accuracy. R Shiny on ESPN live. Abstract also claimed 90% ROI over 8 weeks at Unibet — **treat as unverified; paper withdrawn.**

**Reported results:** Unreliable post-withdrawal.

**Code/data available:** None official. Do not implement from the abstract.

**Direct application to GSE:** **[C6]** pattern only if MMA is added: live in-round features, lock ≠ settle. **Do not use the ROI claim.**

**Implementation cost/risk:** Dead end until a replacement paper.

**Supersedes/conflicts with:** Withdrawn — exclude from build list.

---

### 2001.00878 — Predicting competitions by combining conditional logistic regression and subjective ratings
**Core method:** Conditional logit on matchups + a term for expert/subjective ratings. Hybrid “data + judge.”

**Reported results:** Competition outcomes; hybrid beats either source alone in their setting.

**Code/data available:** None critical.

**Direct application to GSE:** **[C3]**. A documented way to put an expert-rating model *in the ensemble* without letting it dominate: conditional logit likelihood is already a multiplicative contribution — CEPT-compatible.

**Implementation cost/risk:** Low if GSE has any human/prior rating stream; else skip.

**Supersedes/conflicts with:** 2008.01485 warns the “subjective” stream may be worthless. Test, don’t assume.

---

### 2408.08331 — Match predictions in soccer: Machine learning vs. Poisson approaches
**Core method:** Head-to-head: neural nets and random forests vs classical Poisson score models, five soccer leagues, season-long features.

**Reported results:** **Model class has only minor impact on predictive quality.** Feature set / league matter more. Poisson is not obsolete.

**Code/data available:** Standard football-data.co.uk + sklearn; paper is the result, not a library.

**Direct application to GSE:** **[C2][C1] — structurally important.** This is the paper that says “stop swapping learners; the MAE gap is not because you didn’t use XGBoost.” Combined with 1701.05976: fix sport-specific generative structure + ratings + calibration, not the estimator family.

**Implementation cost/risk:** Zero to “implement”; high to *accept organizationally*.

**Supersedes/conflicts with:** Conflicts with any “we need a transformer on tabular stats” plan (2508.02725, 2502.07491) as *first* move. Those can be ensemble members, not replacements.

---

### 2606.09327 — A Universal Dense Football Event Representation Based on TabTransformer
**Core method:** TabTransformer embeddings of football events → dense universal event vectors for downstream prediction.

**Reported results:** Event-representation quality on football event streams.

**Code/data available:** Needs event-level data (StatsBomb/Wyscout).

**Direct application to GSE:** **[C7]** MLS event embedding if/when event feeds exist. Not launch.

**Implementation cost/risk:** High data.

**Supersedes/conflicts with:** Representation layer under 1906.05029, not a rival WP model.

---

### 2508.02725 — Forecasting NCAA Basketball Outcomes with Deep Learning: A Comparative Study
**Core method:** Comparative DL (MLP/LSTM/etc.) on NCAA basketball.

**Reported results:** Deep models can match/beat simple ratings *on NCAA* with enough history; gains are modest and calibration is usually an afterthought in this genre.

**Code/data available:** NCAA results widely mirrored.

**Direct application to GSE:** Weak for NFL/MLB/MLS. If GSE adds NCAA, start with 2208.08598 (conformal) not this.

**Implementation cost/risk:** Skip for launch.

**Supersedes/conflicts with:** 2208.08598 is the NCAA paper to implement.

---

### 2608.21530 — Multimodal Injury Risk and Performance Prediction in Tennis Using Weighted Ensembles
**Core method:** Weighted ensemble across modalities (load, ranking, text/news, etc.) for injury risk + performance.

**Reported results:** Ensemble beats single-modality. Weights are the product.

**Code/data available:** Tennis/injury data is messy and often proprietary.

**Direct application to GSE:** **[C3][C5]**. Pattern: **learned ensemble weights by modality**, with injury as a *confidence downgrade* not a point-estimate hack. Maps to bootstrap-mode when a starter is questionable.

**Implementation cost/risk:** Medium as a weighting pattern; high as a tennis product.

**Supersedes/conflicts with:** CEPT wants *multiplicative* weights with worst-case guarantees; this paper’s weights are likely performance-tuned, not e-process. Use the modality split, replace the weight rule with CEPT.

---

### 2505.21543 — Boltzmann-Informed Probabilities
**Core method:** Map model scores through a Boltzmann (softmax-with-temperature) distribution to get probabilities, with temperature set from a physics-inspired / energy view rather than naive softmax.

**Reported results:** Improved probability quality vs raw softmax in their tasks.

**Code/data available:** Tiny method; implement in 10 lines.

**Direct application to GSE:** **[C1]**. If the engine emits a score/margin, the map-to-probability *is* a temperature/calibration problem. Boltzmann temperature ≈ Platt/temperature scaling, which GSE may already need. Not sufficient alone (they already have a calibrator that’s failing).

**Implementation cost/risk:** Hours. Won’t fix a structurally wrong score.

**Supersedes/conflicts with:** Inferior to a proper generative probability (Poisson/BT) or conformal CPD. Use only as the last-mile map.

---

### 2404.12499 — A Multivariate Copula-based Bayesian Framework for Doping Detection
**Core method:** Bayesian copulas on biological-passport-like multivariate markers; joint tail anomalies.

**Reported results:** Doping-detection operating points; not sports WP.

**Code/data available:** Unlikely to be usefully public (sensitive data).

**Direct application to GSE:** **[C7]** anomaly detection pattern for *data integrity* (impossible stat lines, scraped-row corruption), not athlete doping product.

**Implementation cost/risk:** Skip as a model; steal “joint tail via copula” for QA.

**Supersedes/conflicts with:** None.

---

### 2303.01318 — A Continuous-Time Stochastic Process for High-Resolution Network Data in Sports
**Core method:** Continuous-time process on a sports interaction network (passes, ball movement) — point-process / intensity on edges.

**Reported results:** High-res network sports data; likelihood fit vs discrete snapshots.

**Code/data available:** Needs tracking/event timestamps.

**Direct application to GSE:** **[C7]** MLS event intensity features if event times exist. Not launch.

**Implementation cost/risk:** High.

**Supersedes/conflicts with:** E-cluster / GNN papers — same data hunger.

---

### 1910.07410 — Rugby-Bot: Multi-Task Learning & Fine-Grained Features for Rugby League
**Core method:** Multi-task net: shared backbone, heads for several rugby prediction tasks (outcome, margin, events).

**Reported results:** Multi-task beats single-task on their rugby data.

**Code/data available:** Limited public rugby fine-grained data.

**Direct application to GSE:** **[C2]** architecture pattern — **one backbone, multiple heads** (moneyline / spread / total) instead of three models. That can reduce MAE on spread if the shared representation is real.

**Implementation cost/risk:** Medium. Only after a decent feature set.

**Supersedes/conflicts with:** Compatible with 2408.08331 if the backbone is statistical (shared attack/defense latents), not necessarily DL.

---

### 1902.08081 — DeepHoops: Evaluating Micro-Actions in Basketball Using Deep Feature Representations
**Core method:** Deep embeddings of micro-actions; value actions beyond box score. Realtime demo repo referenced: https://github.com/anthonysicilia/DeepHoopsRealtimeApplication

**Reported results:** Action-value estimates; not team WP Brier.

**Code/data available:** Partial (application repo). Needs SportVU-style frames.

**Direct application to GSE:** NBA-only, tracking-hungry. Skip for launch.

**Implementation cost/risk:** High.

**Supersedes/conflicts with:** LinNet / GNN family.

---

### 2608.09824 — Longitudinal Bayesian Networks for Assessing Team Performance in the NBA
**Core method:** Bayesian networks over team-performance variables that evolve over a season (longitudinal BN). Interpretable dependencies (pace, shooting, defense) with time.

**Reported results:** NBA team-performance explanation / prediction components.

**Code/data available:** https://github.com/gcalvobayarri/Longitudinal_BNs

**Direct application to GSE:** **[C1][C8]** “math you can read” team-state model for NBA. A BN is brand-aligned (you can print the DAG). Not NFL-ready without a new DAG.

**Implementation cost/risk:** Medium given the repo.

**Supersedes/conflicts with:** More interpretable than a GNN; weaker if the DAG is wrong.

---

### 1607.01756 — Protocol for an Observational Study on the Effects of Playing High School Football
**Core method:** Pre-registered observational causal protocol (not a result paper) on long-term effects of HS football.

**Reported results:** Protocol only.

**Code/data available:** Protocol.

**Direct application to GSE:** None for the engine. **[C3]** only as a reminder to pre-register calibration windows so you cannot p-hack the three green gates.

**Implementation cost/risk:** n/a.

**Supersedes/conflicts with:** Process, not model.

---

### physics/0512143 — What is the most competitive sport?
**Core method:** Early econophysics / information-theoretic comparison of unpredictability across sports (upset rates, entropy of outcomes).

**Reported results:** Sports differ sharply in outcome entropy — same qualitative ranking Lopez later sharpened (NBA more predictable than MLB).

**Code/data available:** Ancient; numbers superseded.

**Direct application to GSE:** **[C2][C5]** historical backup for sport-specific noise floors. Cite Lopez 1701.05976 instead.

**Implementation cost/risk:** None.

**Supersedes/conflicts with:** **Superseded by 1701.05976.**

---

### 2502.07491 — Exploring Patterns Behind Sports
**Core method:** Hybrid ARIMA+LSTM on sports time series, PCA embeddings, SHAP, KNN-derived prediction intervals.

**Reported results:** Time-series forecast errors on their sports series; intervals from KNN residuals.

**Code/data available:** Typical workshop-style; don’t depend on a repo.

**Direct application to GSE:** **[C5]** the KNN-interval idea is a cheap conformal cousin for bootstrap-mode. The ARIMA+LSTM hybrid is a candidate *member*, not the core, given 2408.08331.

**Implementation cost/risk:** Medium. Overfit risk is the story of C2.

**Supersedes/conflicts with:** Conflicts with “hybrid DL will beat naive” as a strategy. Use intervals, not the headline architecture.

---

### 2311.03490 — Analytics, have some humility: a statistical view of fourth-down decision making
**Core method:** Re-analysis of NFL 4th-down “go-for-it” recommendations. Shows that decision surfaces from WP models are more uncertain than Twitter-analytics implies; estimation error + model uncertainty flip many “obvious” calls. Repo: https://github.com/snoopryan123/fourth_down

**Reported results:** A large slice of “analytics says go” decisions have CIs that include “punt.” Humility is the result.

**Code/data available:** https://github.com/snoopryan123/fourth_down

**Direct application to GSE:** **[C1][C5][C8]** brand paper. If GSE publishes 57% as if it were 70%, this is why ECE fails. Operational rule: **do not lock a pick whose 95% interval crosses 0.5** (or crosses the market implied p). That *is* principled bootstrap mode.

**Implementation cost/risk:** Low to adopt the decision rule. The 4th-down model itself is not GSE’s product.

**Supersedes/conflicts with:** Aligns with 2208.08598, 2501.02505, 1701.05976. The cultural antidote to overconfident ML papers in G.

---

### 2602.08083 — A Unified Server Quality Metric for Tennis
**Core method:** Single quality metric for tennis servers combining serve outcomes with context (not raw ace rate).

**Reported results:** Tennis; ranking/prediction lift for serve-driven matches.

**Code/data available:** Tennis point data (Sackmann / Tennis Abstract) public.

**Direct application to GSE:** Only if tennis markets added. Skip launch.

**Implementation cost/risk:** Skip.

**Supersedes/conflicts with:** None.

---

### 2310.03417 — Selecting the best compositions of a wheelchair basketball team
**Core method:** Data-driven lineup optimization under roster constraints. Repo: https://github.com/gcalvobayarri/Wheelchair_basketball_lineups.git

**Reported results:** Better lineups vs naive selection on their dataset.

**Code/data available:** Yes (above).

**Direct application to GSE:** **[C8]** Galaxy Dynasty roster construction, not C1.

**Implementation cost/risk:** Skip launch.

**Supersedes/conflicts with:** LinNet is the probabilistic matchup cousin.

---

### 2307.06754 — Ranking Handball Teams from Statistical Strength Estimation
**Core method:** Strength estimation → ranking for handball (goals for/against, HA, etc.).

**Reported results:** Handball ranking/prediction quality vs naive.

**Code/data available:** Small.

**Direct application to GSE:** Pattern only (per-sport strength). Skip unless handball added.

**Implementation cost/risk:** Skip.

**Supersedes/conflicts with:** Cluster B volleyball/soccer models are the better templates.

---

### 2301.13052 — A Machine Learning Approach for Player and Position Adjusted Expected Goals in Football
**Core method:** xG model that adjusts for shooter identity and position (not only shot geometry).

**Reported results:** Improved xG likelihood / calibration vs geometry-only xG.

**Code/data available:** Needs shot-level data (StatsBomb public).

**Direct application to GSE:** **[C7][C1]** MLS feature. Player-adjusted xG differentials are a better pre-game input than raw goals.

**Implementation cost/risk:** Medium given shot data.

**Supersedes/conflicts with:** Feeds 1906.05029 / 2105.09881, does not replace them.

---

### 2301.04001 — Big Ideas in Sports Analytics and Statistical Tools for their Investigation
**Core method:** Survey: the actual statistical ideas that matter (rating, WP, causality, tracking, decision evaluation) + pointers to tools (including EPV demo https://github.com/dcervone/EPVDemo).

**Reported results:** None original. Coverage map.

**Code/data available:** Survey + Cervone EPV demo.

**Direct application to GSE:** **[C8]** sanity-check that this 58-set didn’t miss a *class* of method. After this pass: GSE is covered on ratings, WP, calibration, markets, hierarchical Bayes; still thin on official EPV/possession-value unless tracking is added.

**Implementation cost/risk:** Read-only.

**Supersedes/conflicts with:** Use as index, not as a build.

---

### 1909.08034 — Optimizing Through Learned Errors for Accurate Sports Field Registration
**Core method:** CV: register broadcast frames to a field template by learning the geometric error.

**Reported results:** Field-registration accuracy on sports video benchmarks.

**Code/data available:** CV repos exist in this literature; not needed for GSE stats stack.

**Direct application to GSE:** **[C7]** only for future video ingestion. Name-collision: this is *geometric* calibration, not Brier calibration.

**Implementation cost/risk:** Skip launch.

**Supersedes/conflicts with:** None. Do not confuse with C1.

---

# Final synthesis

## Top 5 “build this first”
Ranked by (impact on C1 or C2) / implementation cost.

**1. 1701.05976 (Lopez–Matthews–Baumer state-space) — week 1–2.**
Public JAGS code, uses lines GSE already ingests, and *forces* per-sport noise parameters. This is the missing generative backbone: team strength AR(1) + sport-specific \(\sigma_{\mathrm{game}}\). It simultaneously attacks C1 (probabilities from a proper hierarchical posterior), C2 (you will finally know the MAE floor per sport), C4 (market is the observation model), and C5 (posterior width *is* bootstrap mode). If after fitting this, GSE still loses MAE to the naive line, the problem is not the calibrator — it is that the line *is* the better talent model, and public accuracy claims should be framed as “we match the market and add interpretability,” not “we beat the baseline.”

**2. 2208.08598 (conformal win probability) — week 2.**
Repo exists. Wrap the Lopez (or Poisson) margin in a CPD. Publish the conformal \(p\) and freeze it at lock (C6). This is the fastest path to honest ECE: conformal \(p\) is typically less over-sharp than a logistic MLE. Split CPD calibration by sport-season or you void the exchangeability assumption.

**3. 2408.08331 + 2105.09881 (Poisson vs ML, then actually fit Poisson) — week 2–3.**
Organizational first, then a 2-day EPL-style Poisson for MLS and a run-diff model for MLB. The bake-off paper is the permission structure to stop chasing architectures. The Poisson paper is the artifact Hermes implements.

**4. 2501.02505 (partial rankings) — week 3.**
Repo exists. Replace the ad-hoc confidence cap: if the MAP partial order leaves two teams tied, the pick either does not lock or locks at a published cap (e.g. 55%) regardless of point-estimate 64%. This is the bootstrap-mode replacement that can ship without a full Bayesian stack.

**5. 1906.05029 (Bayesian in-game soccer WP) + Calibrate LRD (2207.13770) — week 3–5.**
Soccer/MLS generative remaining-goals model (even pre-game-only subset) plus an internal LRD dashboard that slices ECE by sport, week, and odds band. The dashboard is how you get three consecutive green windows instead of staring at a single 0.0699.

Honorable immediate eval work (not “models”): implement CLV logging from 1710.02824’s mindset (lock line vs close) and adopt 2311.03490’s rule that intervals crossing 0.5 do not publish.

## CEPT ensemble — concrete proposal
CEPT as stated: worst-case-over-interventions likelihood-ratio **e-process** + **multiplicative-weight** ensemble.

Do **not** put 12 DL papers in the product. Put **four e-variables** whose product is the ensemble wealth process.

Let \(E_t^{(k)}\) be the e-value for expert \(k\) after settled pick \(t\), and
\[
W_t=\prod_{s\le t}\sum_k w_{s-1}^{(k)} e_s^{(k)},\qquad
w_t^{(k)}\propto w_{t-1}^{(k)}\,e_t^{(k)}
\]
(classical Hedge / multiplicative weights; CEPT adds that each \(e^{(k)}\) must remain an e-value under a declared intervention class \(\mathcal{A}\)).

**Expert 1 — Sport-specific generative score (Cluster B).**
MLS: Poisson / Dixon-Coles / 1906.05029 pre-game slice. NFL: Gaussian margin or Lopez state-space. MLB: run model (Poisson/COM-Poisson 2409.17129 if overdispersed). e-value = likelihood ratio of predicted outcome density vs a **control measure** (the closing-line implied density, C4). This ties CEPT to the public standard.

**Expert 2 — Market / CLV expert (Cluster F, 1710.02824 + 1701.05976).**
The close itself. Its e-value is usually ~1 (efficient). It exists so the ensemble cannot wander far from a calibrated market without paying wealth. This is the “humility prior.”

**Expert 3 — Conformal / partial-rank uncertainty expert (2208.08598 + 2501.02505).**
Emits a *conservative* \(p\) (partial-rank ties mapped to \(p=0.5+\varepsilon\)). Its e-value shines when Expert 1 is over-sharp and loses Brier. This is the calibration specialist.

**Expert 4 — Intervention residual expert (Cluster D pattern).**
Before lock, compute pick under two interventions: (a) drop market features, (b) drop injury/news features (FineCausal-style ablation; 1605.08753-style randomized covariates when available). If the sign flips, Expert 4 outputs \(e=1\) (abstain) or a downweighted \(p\). This is the “worst-case over interventions” clause of CEPT in one afternoon of engineering.

Optional fifth, later: a graph/lineup expert (LinNet / 2207.14124) only when interaction data exists.

**Lock rule (C6):** lock when (i) \(W_t\) growth on the last calibration window is ≥ 1 (e-process hasn’t gone broke), (ii) Expert 3’s interval excludes 0.5 *or* CLV edge ≥ threshold, (iii) Expert 4 does not abstain. That replaces both “T-minus-X lock” and bootstrap fudge.

## Replace “Bootstrap mode”
Current: cap confidence when sample is small. Replacement, stacked:

1. **Primary:** posterior SD from Lopez-style hierarchical model (C5 = \(\sqrt{\sigma^2_{\mathrm{between}}+\sigma^2_{\mathrm{within}}/n_{\mathrm{games}}}\)).
2. **Publish layer:** 2501.02505 partial rank — if tied, cap at a fixed advertised number (e.g. 0.55) or don’t publish.
3. **Probability layer:** 2208.08598 CPD using only *pre-lock* residuals from the same sport-season.
4. **Hard gate:** 2311.03490 humility — no lock if 90% interval crosses 0.5.
5. **Synthetic data:** 2412.19363 bound if you augment thin sports; never more synthetic mass than the theorem allows.

Delete the ad-hoc cap function once (1)+(3)+(4) are live.

## What argues GSE’s current approach is structurally wrong
These are not soften-able.

1. **1701.05976:** NFL/MLB/NBA/NHL do not share a noise scale or HA. One global calibrator on 1,164 mixed-sport picks is a misspecified model. ECE 0.0699 can be an aggregation artifact (Calibrate / LRD will show this). MLS will look like soccer in 1906.05029 (late-game and draw mass), not like NFL.

2. **2408.08331:** If the core model loses MAE 5.31 vs 4.91, swapping to a deeper learner is the wrong first experiment. Their five-league bake-off found model class ≈ wash. You are probably losing on **features/ratings/leakage**, or trying to beat an efficient line (Lopez + 1710.02824).

3. **The market is already calibrated.** Lopez Fig. 1 and the entire CLV literature: closing lines *are* a well-calibrated probability. A model that loses MAE to “naive” is often losing to **the line or the mean**. Public copy that implies GSE will beat this without a new information source is the brand risk, not just a stats risk.

4. **2008.01485:** Do not fix C2 by averaging more human/crowd/social signals.

5. **iWinRNFL (1704.00197):** On a strong NFL feature set, NN/Bayes did not beat logistic. Complexity is not the missing piece for C1.

6. **1906.05029:** Aggregate ECE can look acceptable while the slice you ship (late, live, or a specific league) is ECE 0.17. GSE’s single-number gate is necessary but not sufficient — require per-sport windows.

7. **2311.03490:** Publishing sharp probabilities from a weak model is how “analytics” loses trust. The launch bar (Brier ≤ 0.22, ECE ≤ 0.05, three windows) is closer to this paper’s worldview than to a Kaggle accuracy race.

8. **2312.11067 withdrawn + 1710.02824 “rigged”:** Ignore ROI screenshots. GSE’s contract with users is Brier + CLV, not bankroll curves.

## Suggested 30-day build order for Hermes/Fable
Days 1–3: Per-sport dataset splits; lock-time line vs close vs result table (C4/C6).  
Days 3–8: Lopez-style hierarchical strength per NFL/MLB/MLS in PyMC v5 (1607.00379 tooling).  
Days 8–12: Poisson/Dixon-Coles MLS + NFL Gaussian margin; Brier/ECE/LRD by sport (2207.13770).  
Days 12–16: CPD wrapper + partial-rank cap; kill ad-hoc bootstrap (2208.08598, 2501.02505).  
Days 16–22: Four-expert multiplicative weights with market e-variable; intervention ablation (CEPT).  
Days 22–30: Three frozen calibration windows, per sport, no peeking (1607.01756 as process discipline).

If window 1 is still red after this, the honest inference is not “need more papers.” It is “GSE does not have an information edge over the close, and the product should sell interpretability, lifecycle tooling, and calibrated *reporting* of the market — not a claim that the engine beats a naive baseline.”
