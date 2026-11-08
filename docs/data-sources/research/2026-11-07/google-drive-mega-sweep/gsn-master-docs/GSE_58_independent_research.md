# GSE — Independent research pass on 58 arXiv papers
Date: 2026-09-15. Full-text basis: arXiv PDFs (57 retrieved). **2312.11067 has no PDF** (withdrawn). This pass does not use the earlier triage clusters as a framework. Papers are ordered by *my* relevance judgment after reading, then the rest alphabetically-by-id within bands.

Relevance bands I ended up with (formed after reading, not inherited):
- **Band 1 — actually load-bearing for GSE’s launch problems**
- **Band 2 — usable method or diagnostic, secondary**
- **Band 3 — real paper, wrong problem or wrong sport for launch**
- **Band 4 — weak transfer, tutorial, withdrawn, or first-pass false positive**

---

# Band 1

### 1701.05976 — How often does the best team win? A unified approach to understanding randomness in North American sport
**What it actually is:** Lopez, Matthews, Baumer. A Bayesian state-space paired-comparison model whose *observations are betting-market margins*, not raw scores, so the same specification can be run on NFL, NBA, NHL, and MLB. Team strength \(\theta_{i,s,w}\) (franchise \(i\), season \(s\), week \(w\)) follows nested AR(1) evolution: between-season shock \(\sigma^2_B\), within-season week shock \(\sigma^2_W\), and game-level observation noise \(\sigma^2_G\), plus home advantage (they compare a constant-HA model vs team-specific HA). Observation: market point spread / implied margin \(\sim \mathcal{N}(\theta_i-\theta_j+\mathrm{HA},\,\sigma_G^2)\). Fitted in JAGS (20k iterations, 2k burn-in, thin 5). After fitting they ask a well-posed question: given posterior talent, how often would the better team win, and how much of standing variation is luck. They also validate that market-implied win probabilities are already well calibrated (reliability scatter on historical lines).

**Reported results:** One decade per Big Four league. NBA: largest talent dispersion and largest HA. MLB and NHL: game outcomes closest to even given talent. NFL in between. Market-implied probabilities track empirical win rates closely. No Brier on a *predictive model they ship as a product* — the result is the variance decomposition and the market-calibration plot.

**Code/data available:** https://github.com/bigfour/competitiveness

**Your independent relevance call:** Strongest paper in the set for GSE. It is not a “win probability model to copy for picks.” It is a measurement of the environment GSE is scoring into. Addresses problems 1, 2, 4, 5 directly, and challenges the Section 1 hypothesis: independent per-sport models are necessary *because the noise scales differ*, but they are not sufficient — the market already prices talent well.

**Direct application to GSE:** Fit this (or a PyMC v5 rewrite) separately on NFL, MLB, MLS using GSE’s own historical closes + results. Use \(\sigma_G\) as the league-specific irreducible error. Use posterior \(\mathrm{sd}(\theta)\) early in the season as the confidence width. Use their market reliability plot as the CLV / calibration reference GSE must beat or match. Do **not** train a “pure prediction” model on the same closes you then claim CLV against — split the observation: scores for talent, closes only for evaluation.

**Implementation cost/risk:** Medium. Public JAGS; MLS is not in their data, so you estimate MLS \(\sigma\) yourself (soccer-like, high draw mass — see 1906.05029). Failure mode: treating the line as both feature and label.

---

### 2408.08331 — Match predictions in soccer: Machine learning vs. Poisson approaches
**What it actually is:** Fischer & Heuer. Same-season, leave-one-match-out style comparison of (i) a Poisson score model, (ii) a tiny neural net (1 hidden layer, 8 units, logistic activation, Adam), (iii) random forest (100 trees, depth 4, min 32 to split), on five European top leagues. Features are essentially the season’s other results; they argue team performance does not drift systematically inside a season, so equal weight on all other matches is justified. Metric: rank probability score (RPS) and 1X2 accuracy.

**Reported results:** RPS **0.2054–0.2087** and accuracy **≈51.5%** across model classes — a gap so small it is the finding. Model family is not the lever.

**Code/data available:** none found (standard football-data.co.uk would reproduce it).

**Your independent relevance call:** High for problem 2, and it is a challenge to GSE’s “needs a structurally different approach” if “structural” is being read as “deeper learner.” The structure that matters in their experiment is the *generative assumption about goals*, and even that does not beat RF/NN by much. Strong paper, narrow scope (soccer, one season of results as features, no betting line, no calibration metrics beyond RPS).

**Direct application to GSE:** Stop the architecture bake-off as the first C2 experiment. Run *their* comparison on GSE’s MLS (and an analog on NFL/MLB) with GSE’s current feature set vs a Poisson/Skellam head, report Brier and MAE against the naive baseline. If the three heads agree within 0.01 Brier, the MAE hole is features, leakage, or an unbeatable line — not the estimator.

**Implementation cost/risk:** Low. Risk: over-generalizing five soccer leagues to NFL spreads. The paper does not study MAE on a continuous margin.

---

### 1906.05029 — A Bayesian Approach to In-Game Win Probability in Soccer
**What it actually is:** Robberechts, Van Haaren, Davis (KDD 2021 version). They refuse to treat soccer WP as binary classification. Remaining goals for each side are Poisson with rate that depends on time left and a contextual state:
\[
y_{>t,h}\sim\mathrm{Poisson}((T-t)\theta_{t,h}),\quad \log\theta_{t,h}=\alpha_t^\top x_t+\beta
\]
\(x_t\) includes Elo difference, score difference, red-card difference, recent threat (xT / chances), recent recoveries. \(\alpha_t\) is time-varying with a hierarchical prior so rare states shrink. Inference: PyMC3 ADVI (variational), because NUTS is too slow for their use case. Win/draw/loss from the posterior predictive comparison of remaining goals plus current score. Baselines: logistic, multinomial logistic, random forest on the same state.

**Reported results:** WhoScored events, top-5 leagues, 8 seasons; hold-out last season \(N=1{,}826\) matches (46/25/29 home/draw/away). Multiclass ECE: proposed **0.011 overall, 0.002 in the final 10%**. Logistic: 0.023 overall, **0.174 in the final 10%**. RF: 0.024 overall, 0.101 final 10%. Aggregate ECE hides a late-game collapse in the classifiers.

**Code/data available:** no official paper repo. Tooling: PyMC v5 (not PyMC3), ClubElo, https://github.com/probberechts/soccerdata. WhoScored scraping is fragile.

**Your independent relevance call:** High for problems 1 and 5 in **MLS**, and as a warning about GSE’s single-number calibration gate. Medium for NFL/MLB (the remaining-score idea transfers; the features and draw mass do not). This paper is why a global calibrator on mixed sports is a bad instrument: the failure lives in a slice.

**Direct application to GSE:** For MLS pre-game, drop in-play threat features and keep Elo + hierarchical Poisson scores (Dixon–Coles / Baio–Blangiardo territory). For live updates after lock, this *is* the model. For the gate: compute ECE **by sport and by time-to-event**, not one number on 1,164 picks.

**Implementation cost/risk:** Medium–high if you want in-play MLS (event data). Medium if pre-game only. Variational posteriors are too tight — bad for bootstrap-mode if you treat ADVI sd as truth. Use NUTS or inflate.

---

### 2208.08598 — Using Conformal Win Probability to Predict the Winners of the Cancelled 2020 NCAA Basketball Tournaments
**What it actually is:** Johnstone & Nettleton. Two pieces. (1) Closed-form NCAA bid / championship probabilities via Poisson-binomial conference outcomes and the classic recursive single-elim formula. (2) The piece GSE cares about: **conformal predictive distributions** on a linear margin model. Conformity score = residual. CPD
\[
\pi(y_c,\tau)=\frac{\#\{i:R_i<R_{n+1}(y_c)\}+\tau\cdot\#\{i:R_i=R_{n+1}(y_c)\}}{n+1}
\]
with mid-p \(\tau=1/2\). \(P(\text{win})=\pi\) mass on positive margin. Compared to normal-theory linear predictive distributions and logistic classification, NCAA men’s and women’s, seasons 2014–15 through 2020–21 in the preprint (journal version widens the window).

**Reported results:** Conformal WP better calibrated than linear-normal and logistic under fewer distributional assumptions. The cancelled-2020 championship probabilities are a case study, not the transferable result. They do not publish a single Brier that you can drop next to GSE’s 0.2563.

**Code/data available:** https://github.com/chancejohnstone/marchmadnessconformal (R).

**Your independent relevance call:** High for problems 1 and 5. This is one of the few papers in the set that produces a probability with a finite-sample calibration rationale that does not require “we assumed Gaussian errors.” It does not fix a bad mean model — a CPD around a biased margin is a calibrated bad forecast.

**Direct application to GSE:** Wrap whatever numeric margin GSE already predicts (spread, run diff, goal diff) in a residual CPD. Evaluate \(\pi\) at lock using only pre-lock, same-sport, same-season residuals. That mapping onto the lifecycle is clean: modeled = point forecast; locked = CPD frozen.

**Implementation cost/risk:** Medium (R → Python). **Exchangeability is the assumption GSE will violate** if it pools NFL+MLB+MLS residuals or pools across weeks with injuries. Must block by sport-season.

---

### 1704.00197 — iWinRNFL: A Simple, Interpretable & Well-Calibrated In-Game Win Probability Model for NFL
**What it actually is:** Pelechrinis. Logistic home-win model on 10 play-state features (time, score diff, time×score, down, distance, field position, timeouts, possession, pre-game rating gap) trained on 295,844 plays, NFL 2009–2015, `nflgame` API. Also tried naive Bayes and a small feed-forward net on the *same* features. Reliability: bin predicted \(p\), plot empirical win rate (\(R^2=0.998\) vs \(y=x\)).

**Reported results:** Threshold accuracy 76.5% vs 63% pre-game-only. Nonlinear models: no material lift. Well-calibrated on the reliability plot. No Brier/ECE number in the paper.

**Code/data available:** Promised; **none found**. Data equivalent: `nflfastR` / `nfl_data_py`.

**Your independent relevance call:** High as an *NFL in-play* reference and as evidence that complexity is not automatically the C2 fix. Low as a replacement for GSE’s pre-kickoff published pick model — this is a different object. Medium for problem 1 because they actually do reliability the way GSE’s gate needs, but on in-game states, not pre-game picks.

**Direct application to GSE:** Refit on modern PBP as a live WP layer and as a published “here is the math” baseline. Copy their reliability-curve discipline for the 1,164 settled *pre-game* picks. Do not expect it to move pre-game MAE.

**Implementation cost/risk:** Low to refit. Risk: confusing in-play accuracy (76%) with pre-game skill.

---

### 2311.03490 — Analytics, have some humility: a statistical view of fourth-down decision making
**What it actually is:** A re-analysis of NFL 4th-down “go” recommendations that puts estimation uncertainty back into the decision surface. Many win-probability-driven “always go” calls have intervals that include “punt.” The paper is about decision theory under uncertain WP, not about beating a spread.

**Reported results:** A large fraction of celebrated analytics recommendations are not robust to WP uncertainty. Repo ships the analysis.

**Code/data available:** https://github.com/snoopryan123/fourth_down

**Your independent relevance call:** High for problems 1, 5, 6 — as a *decision rule*, not as a predictor. This is the paper that says publishing a sharp 0.57 from a noisy model is how you fail ECE and how you fail the brand.

**Direct application to GSE:** Lock rule: if the 90% interval on \(p\) includes 0.5 (or includes the market \(p\)), do not publish, or publish with an explicit cap. That is a grounded replacement for part of bootstrap mode and a lifecycle rule at the modeled→locked transition.

**Implementation cost/risk:** Low. Do not build their 4th-down engine unless you want a content feature.

---

### 1710.02824 — Beating the bookies with their own numbers — and how the online sports betting market is rigged
**What it actually is:** Uses bookmakers’ published odds as the forecasting signal (aggregate bookie wisdom), bets when a derived “fair” value is exceeded, reports paper profits, then documents why those profits do not survive contact with limits, juice, and account management. Odds-implied probability from decimal/American lines, overround removal.

**Reported results:** Historical simulated profit and a shorter live-money period. The second claim — structural hostility of the market — is the one that survives skepticism. Treat the ROI headline as non-portable.

**Code/data available:** https://github.com/Lisandro79/BeatTheBookie

**Your independent relevance call:** High for problem 4 and the lifecycle. Medium for problem 2: if a naive function of the books already prices games well, GSE’s MAE gap vs “naive” needs to specify whether naive *is* the line.

**Direct application to GSE:** Instrument the pipeline: store line at proposed, at lock, at close, at settle. CLV = lock vs close. Never evaluate against open. Do not ship their betting strategy. The “rigged” half belongs in the trust/compliance writeup so public copy never implies harvestable ROI.

**Implementation cost/risk:** Low for logging. High if someone reads the title and wants to productize the strategy.

---

### 2501.02505 — Estimation of partial rankings from sparse, noisy comparisons
**What it actually is:** Morel-Balbi & Kirkley. Ranking from pairwise comparisons when the comparison graph is sparse and noisy. Instead of forcing a total order from a Bradley–Terry-type model, they only declare \(i\succ j\) when the data support a difference; otherwise the output is a *partial* ranking (ties as first-class). MAP / agglomerative procedure that can sit on top of any pairwise likelihood.

**Reported results:** Simulations and comparison datasets; fewer false-precise rankings under sparsity. Not a sports Brier study.

**Code/data available:** https://github.com/seb310/partial-rankings

**Your independent relevance call:** High for problem 5. Medium for problem 1 (less overconfident \(p\) if you refuse to separate tied teams). This is one of the few papers that is *about* the exact failure mode of bootstrap mode: pretending sparse data produced a sharp rank.

**Direct application to GSE:** After fitting any team-strength model, run their partial-rank step. If home and away are in the same rank class, either do not lock or lock at a publicly documented cap (e.g. 0.55) regardless of the point \(p=0.64\).

**Implementation cost/risk:** Low–medium. Failure: treating correlated market-implied “comparisons” as independent games.

---

# Band 2

### 2207.13770 — Calibrate: Interactive Analysis of Probabilistic Model Output
**What it actually is:** Xenopoulos et al., IEEE VIS 2022. A Jupyter visual tool. Contribution that is not just UI: **learned reliability diagrams** — regress \(Y\) on \(\hat p\) with a smooth univariate function rather than fixed bins, so the reliability curve is not an artifact of bin count. Linked brushing for subgroups and instances. Motivating domains include sports betting; experiments are census, recidivism, CIFAR-100, plus practitioner think-alouds.

**Reported results:** No sports metrics. CIFAR example: higher accuracy can coincide with worse calibration.

**Code/data available:** Promised as a one-liner widget; no durable official repo confirmed in this pass. LRD is an isotonic or GAM fit you can write in an hour.

**Your independent relevance call:** Medium–high for problem 1 as *instrumentation*, zero as a model. GSE’s ECE 0.0699 is one scalar; this paper exists because that scalar is a bad summary.

**Direct application to GSE:** Build LRD + sport/week/odds-band slices on the 1,164 picks. Use it to test the per-sport hypothesis empirically before rewriting the engine.

**Implementation cost/risk:** Low. Risk: confusing a dashboard with a fix.

---

### 1707.01855 — LinNet: Probabilistic Lineup Evaluation Through Network Embedding
**What it actually is:** Directed weighted lineup-matchup graph → node2vec embeddings \(x_\lambda\) → Bradley–Terry-style logistic
\[
\Pr(\lambda_A\succ\lambda_B)=\mathrm{logit}^{-1}(\beta^\top[x_A;x_B;d(x_A,x_B)])
\]
NBA lineups, 2007–08 to 2011–12.

**Reported results:** Out-of-sample matchup accuracy **67%** vs APM **55%**, PageRank **53%**, lineup APM **59%**. **Brier 0.19**. Reliability near \(y=x\).

**Code/data available:** none found.

**Your independent relevance call:** Medium. Brier 0.19 is under GSE’s 0.22 bar, but the prediction target is lineup-vs-lineup in the NBA, not GSE’s current pick unit. The generalizable idea (latent matchup features beat additive ratings) needs interaction data GSE may not have.

**Direct application to GSE:** Only if GSE models units (NBA lineups, NFL packages). Otherwise skip for launch.

**Implementation cost/risk:** High data definition. Cold-start lineups = bootstrap-mode problem restated.

---

### 2105.09881 — Poisson Modeling and Predicting English Premier League Goal Scoring
**What it actually is:** Nguyen. Two jobs. First, goodness-of-fit: EPL goals vs Poisson counts, inter-goal times vs exponential, minute-of-goal vs uniform — i.e., is a Poisson *process* a fair description. Second, Poisson *regression* to simulate the 2018–19 EPL season from historical attack/defense-style predictors, with season-decay weights.

**Reported results:** Poisson-process diagnostics are “good enough” at league level (the usual caveat: not every team-season is textbook Poisson). Season simulation is illustrative, not a published Brier vs the market.

**Code/data available:** none found; football-data.co.uk is enough to rebuild.

**Your independent relevance call:** Medium. It is a justification for a Poisson MLS/soccer head, not a SOTA predictor and not an NFL paper. Weaker than 2408.08331 as a decision paper, weaker than 1906.05029 as a model paper.

**Direct application to GSE:** Use as the 2-day MLS baseline implementation and as a diagnostic (if MLS goals fail Poisson GOF, go to COM-Poisson 2409.17129 or Dixon–Coles inflation).

**Implementation cost/risk:** Low.

---

### 2405.10247 — Alternative ranking measures to predict international football results
**What it actually is:** Macri Demartino, Egidi, Torelli. Bake-off of *ranking inputs* (FIFA points, Elo variants, etc.) plus statistical vs ML models on WC 2022 and AFCON 2023.

**Reported results:** Choice of ranking measure moves predictions as much as choice of learner. No champion across both tournaments. Bayesian statistical models remain competitive.

**Code/data available:** none required; international results are public.

**Your independent relevance call:** Medium for problems 1–2. Supports “fix the strength feature before the learner,” which is consistent with 2408.08331.

**Direct application to GSE:** Replace whatever single rating currently feeds the global model with a per-sport Elo/pi-rating bake-off. Measure Brier, not just MAE.

**Implementation cost/risk:** Low.

---

### 1607.00379 — Probabilistic Programming and PyMC3
**What it actually is:** Coyle, EuroSciPy 2015 tutorial. Hierarchical Poisson rugby model (Six Nations 2014) in PyMC3: home/away scores ~ Poisson, log-linear attack/defense + HA, partial pooling. Posterior predictive scorelines. Pedagogical, not a research result.

**Reported results:** None that GSE can cite as performance.

**Code/data available:** https://github.com/springcoil/TutorialPyMCRugby. **PyMC3 is unmaintained — use PyMC v5.**

**Your independent relevance call:** Medium as *tooling* for problems 1 and 5. Zero as a forecasting paper. The first-pass “high” label overweights a tutorial.

**Direct application to GSE:** This is the onboarding pattern for a per-sport generative model in the stack GSE should be on. Not a method to cite in public accuracy claims.

**Implementation cost/risk:** Low technically; the real cost is adopting Bayesian computation in production.

---

### 2406.19563 — Bayesian Rank-Clustering
**What it actually is:** Pearce & Erosheva. Joint posterior over a ranking *and* a clustering: items in one cluster are treated as statistically tied. Built for comparison data that cannot support a total order.

**Reported results:** Simulations and ranking examples; recovers ties when signal is weak.

**Code/data available:** author supplement; no must-use product repo verified here.

**Your independent relevance call:** Medium for problem 5. Same job as 2501.02505 with a heavier Bayesian apparatus. I would implement 2501.02505 first.

**Direct application to GSE:** v2 of the partial-rank layer if you want posterior cluster membership rather than a MAP partial order.

**Implementation cost/risk:** Medium statistics.

---

### 2409.17129 — Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data
**What it actually is:** Bivariate COM-Poisson: each margin has its own mean and a dispersion \(\nu\) (\(\nu=1\) recovers Poisson; \(\nu>1\) underdispersion; \(\nu<1\) overdispersion), dependence via a copula or shared latent. Fully Bayesian. This is a methods paper that happens to be the right likelihood family for paired scores.

**Reported results:** Better likelihood than Poisson when \(\nu\neq 1\). Not an EPL betting study.

**Code/data available:** expect Stan/R from authors; no GSE-ready repo verified.

**Your independent relevance call:** Medium for MLS/MLB score heads if Poisson GOF fails. Not a first build.

**Direct application to GSE:** After 2105.09881 diagnostics. Do not start here.

**Implementation cost/risk:** Medium (COM-Poisson normalizing constant is annoying). Estimate \(\nu\) per league-season.

---

### 2412.19363 — Large Language Models for Market Research: A Data-augmentation Approach
**What it actually is:** Statistical estimator for blending LLM-generated *survey/preference* data with real conjoint-style observations, with a finite-sample error bound. It is market-research methodology. It is not a sports model and not “use GPT to invent games.”

**Reported results:** Lower bias than naive replacement of real rows by synthetic rows, under their assumptions.

**Code/data available:** method paper; implement the estimator.

**Your independent relevance call:** Medium for problem 5 *only if* GSE insists on synthetic augmentation. Otherwise a false-ish high from the word “market.” Does not address CLV.

**Direct application to GSE:** If early-season data are padded with simulated matchups, cap the synthetic weight using their bound. Do not mention LLMs in public copy.

**Implementation cost/risk:** Easy to implement wrong (concat).

---

### 2008.01485 — Wisdom of crowds: much ado about nothing
**What it actually is:** Fontanari. Tests “wisdom of crowds” on **Philadelphia Fed Survey of Professional Forecasters** (economic indicators), not on betting markets. Findings: diversity of estimates *positively* correlates with crowd error (against a popular story); the crowd beats *every* individual in **<2%** of cases; a random individual often beats the crowd. Artificial unbiased crowds behave better than this real crowd.

**Reported results:** As above, on SPF data. Repo: https://github.com/JoseFontanari/Wisdom

**Your independent relevance call:** Medium as a caution, weaker than the first-pass sports reading. It does **not** empirically study sports bettors. The transferable claim is narrower: do not assume that averaging more noisy opinions helps.

**Direct application to GSE:** Do not ensemble scraped public-consensus / social sentiment in hopes of fixing MAE. The crowd that matters for GSE is the closing line (1701.05976, 1710.02824), which is a different object.

**Implementation cost/risk:** Zero (a don’t-do).

---

### 2207.14124 — Graph Neural Networks to Predict Sports Outcomes
**What it actually is:** Xenopoulos & Silva. Game as a graph (players/teams, interactions), GNN encoder, outcome head. Gains appear when the interaction graph is the state. Flattened box scores do not give the same lift.

**Reported results:** Beats tabular baselines in graph-rich settings. No GSE-comparable Brier on NFL moneylines.

**Code/data available:** none that is a drop-in for GSE.

**Your independent relevance call:** Medium-low for launch. Real method, wrong current data diet. First-pass “high” assumed graph data GSE does not scrape today.

**Direct application to GSE:** Revisit when passing networks or lineup stints exist. Not a C2 patch on Pro-Football-Reference tables.

**Implementation cost/risk:** High (data), not model.

---

### 2505.21543 — Boltzmann-Informed Probabilities
**What it actually is:** A map from raw scores/energies to probabilities via a Boltzmann / softmax-with-temperature distribution, with temperature motivated by an energy view rather than an arbitrary softmax. This is last-mile calibration arithmetic, close in spirit to temperature scaling.

**Reported results:** Better probability quality than naive softmax in their tasks. Not a sports backtest against a book.

**Code/data available:** none needed; ten lines.

**Your independent relevance call:** Low–medium for problem 1. GSE already has a calibrator that is failing. Changing the link function without changing the score will not close a 0.036 Brier gap by itself.

**Direct application to GSE:** Keep in the drawer as an alternative to Platt on whatever margin the engine emits. Not the build.

**Implementation cost/risk:** Hours.

---

### 2110.14017 — What does not get observed can be used to make age curves stronger
**What it actually is:** Aging-curve estimation that treats retirement/benching as informative missingness rather than ignorable. Survivor-biased curves flatten or distort the true age effect.

**Reported results:** Less-biased sports age curves than complete-case fits.

**Code/data available:** https://github.com/schuckers/playeraging

**Your independent relevance call:** Medium for problem 7 if player projections feed team WP (MLB especially). Low for the current calibration gate.

**Direct application to GSE:** Use if a player-level module exists. Do not build an aging module to rescue Brier this quarter.

**Implementation cost/risk:** Medium.

---

### 2301.13052 — A Machine Learning Approach for Player and Position Adjusted Expected Goals in Football
**What it actually is:** xG that conditions on shooter identity and position, not only shot geometry.

**Reported results:** Better xG likelihood/calibration than geometry-only models, on shot-level football data.

**Code/data available:** needs StatsBomb-style shot data (public seasons exist).

**Your independent relevance call:** Medium for MLS feature quality (problem 7 → 1). Not a pick model.

**Direct application to GSE:** If MLS shot data is ingested, replace raw goal differentials with player-adjusted xG differentials as the pre-game input to the Poisson head.

**Implementation cost/risk:** Medium, data-gated.

---

### 2501.17711 — STGCN-LSTM for Olympic Medal Prediction: Dynamic Power Modeling and Causal Policy
**What it actually is:** Spatial-temporal GCN + LSTM on a country–sport graph; output is zero-inflated compound Poisson medal counts; they add causal/policy-shock checks.

**Reported results:** Olympic medal-count forecasts; zero-inflation handles structural zeros.

**Code/data available:** none that GSE should depend on.

**Your independent relevance call:** Low for launch products. Medium as a *likelihood trick* (zero-inflated counts) for rare-event props. The “causal policy” language is closer to CEPT in vocabulary than in math — it is not an e-process.

**Direct application to GSE:** Steal ZI-Poisson for near-zero base-rate props. Do not build an Olympic GCN.

**Implementation cost/risk:** Low for ZI-Poisson; high for the rest.

---

### 2503.23911 — FineCausal: A Causal-Based Framework for Interpretable Fine-Grained Action Quality Assessment
**What it actually is:** Video action-quality (diving) scorer with causal intervention + graph/temporal attention so background confounders do not drive the score.

**Reported results:** FineDiving-HM; interpretability + performance vs prior AQA models.

**Code/data available:** https://github.com/Harrison21/FineCausal

**Your independent relevance call:** Low as a model. Medium as a *pattern* for problem 3: ablate a feature family and see whether the pick flips. That is a poor man’s intervention class for CEPT, not CEPT.

**Direct application to GSE:** At lock, compute \(p\) with market features on and off, injury/news on and off. If the sign flips, abstain. Do not run their video code.

**Implementation cost/risk:** Low for the ablation; high if someone implements the paper literally.

---

### 1605.08753 — Fairly Random: The Impact of Winning the Toss on the Probability of Winning
**What it actually is:** Design-based ATE of winning the cricket toss (randomized) on match win, by format.

**Reported results:** Small, format-dependent toss effect. https://github.com/dwillis/toss-up

**Your independent relevance call:** Low for NFL/MLB/MLS launch. Clean causal example. Only directly on-point if GSE covers cricket.

**Direct application to GSE:** Hygiene: known randomized or quasi-randomized pre-game states (rest, park, weather) should be covariates, not absorbed into “team quality.”

**Implementation cost/risk:** Low.

---

# Band 3 — real papers, not launch

### 1911.01815 — A Bayesian Quest for Finding a Unified Model for Predicting Volleyball Games
**What it actually is:** Egidi & Ntzoufras. Two-level hierarchical Bayes tailored to volleyball rules: logistic set winner; truncated NB for loser’s points; Poisson inflation for extra points past the win-by-2 boundary; winner points deterministic given those. Shared team abilities across layers. MCMC. Predict matches by simulating sets to 3.

**Reported results:** Professional volleyball leagues; beats models that ignore the scoring rule.

**Code/data available:** none found.

**Your independent relevance call:** Low for current sports. High as an *existence proof* that “per-sport model” means “encode the rules in the likelihood,” not “fit XGBoost separately on each league.”

**Direct application to GSE:** Do not port volleyball. Apply the doctrine: NFL margin ≠ MLS 1X2 ≠ MLB runs.

**Implementation cost/risk:** High if someone ports it anyway.

---

### 1911.08791 — Bayesian Hierarchical Models for the Prediction of Volleyball Results
**What it actually is:** Hierarchical Bayes for volleyball match/set outcomes with partial pooling of team effects. Less rule-faithful than 1911.01815.

**Reported results:** Volleyball predictive checks vs independent models.

**Code/data available:** none found.

**Your independent relevance call:** Low. Same group, weaker implementation spec than 1911.01815.

**Direct application to GSE:** Not applicable at launch. The pooling idea is already in 1701.05976 / 1607.00379.

**Implementation cost/risk:** Skip.

---

### 1911.04541 — Bayesian models for prediction of the set-difference in volleyball
**What it actually is:** Set-difference takes values in \(\{-3,\ldots,3\}\). They use (a) ordered multinomial logit and (b) truncated Skellam. Standard count models are the wrong support.

**Reported results:** Volleyball set-margin prediction.

**Code/data available:** none found.

**Your independent relevance call:** Low for GSE sports. The meta-lesson is “respect the support of the outcome.” NFL spreads are closer to continuous; MLS 1X2 is ternary; do not jam both through one binary head.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2411.02000 — Predicting and understanding shooting performance in professional biathlon
**What it actually is:** Hierarchical Bayes on biathlon shot hit/miss: athlete, prone/standing, order/fatigue, weather.

**Reported results:** Athlete-level posterior hit probabilities. Not match WP.

**Code/data available:** none verified as product-ready.

**Your independent relevance call:** Low. Nice hierarchical-uncertainty example; wrong sport.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2503.21713 — Investigating Experiential Effects in Online Chess using a Hierarchical Bayesian model
**What it actually is:** Hierarchical player-strength model plus latents for streaks / recent experience on online chess.

**Reported results:** Once strength is hierarchical, experiential (“momentum”) effects shrink.

**Code/data available:** Lichess dumps exist independently.

**Your independent relevance call:** Low–medium as a *warning* against momentum features. Not a GSE sport.

**Direct application to GSE:** Before adding “hot team” features, run this style of test on GSE residuals.

**Implementation cost/risk:** Low as a diagnostic.

---

### 1704.00823 — A Hierarchical Bayesian Model of Pitch Framing
**What it actually is:** P(called strike | location, count, catcher, umpire) with hierarchical catcher/umpire effects. PITCHf/x era.

**Reported results:** Framing-run estimates with uncertainty.

**Code/data available:** Statcast public; no required repo.

**Your independent relevance call:** Low for the pick engine. MLB micro-event module only.

**Direct application to GSE:** Not applicable unless umpire/catcher features enter MLB totals.

**Implementation cost/risk:** High data-eng / low launch impact.

---

### 2206.09083 — Universal Behavior of Opponent Statistics and Applications to the MLB
**What it actually is:** Empirical regularity in opponent-adjusted MLB stats; using that structure to stabilize projections.

**Reported results:** Opponent-adjusted metrics behave more stably than raw.

**Code/data available:** Retrosheet / FanGraphs.

**Your independent relevance call:** Low–medium for problem 7 (MLB feature hygiene). Not a model.

**Direct application to GSE:** Opponent-adjust MLB inputs. Should already be true.

**Implementation cost/risk:** Low.

---

### 2206.13246 — Prediction of Football Player Value using Bayesian Ensemble Approach
**What it actually is:** Bayesian ensemble for transfer fees / player market values.

**Reported results:** Valuation MAE/RMSE, not match Brier.

**Code/data available:** none needed.

**Your independent relevance call:** Low. First-pass sports-keyword hit. Problem 8 at most.

**Direct application to GSE:** Not applicable to the engine.

**Implementation cost/risk:** Skip.

---

### 2012.04378 — Forecasting the Olympic medal distribution during a pandemic
**What it actually is:** Socio-economic ML (GDP, population, host, history) for national medal counts, COVID shock.

**Reported results:** Better medal-count error than older socio-economic regressions.

**Code/data available:** public socio-economic + medal tables.

**Your independent relevance call:** Low. Wrong target. 2501.17711 is the more interesting Olympic-count paper and still not GSE.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2011.11178 — Bayesian Nonparametric Estimation for Point Processes with Spatial Homogeneity
**What it actually is:** BNP spatial point process for NBA shot locations with piecewise-homogeneous intensity.

**Reported results:** Shot-chart structure vs a global intensity.

**Code/data available:** NBA shot logs public.

**Your independent relevance call:** Low for launch.

**Direct application to GSE:** Not applicable without an NBA tracking/shot product.

**Implementation cost/risk:** Skip.

---

### 1801.02954 — A method for Bayesian regression modelling of composition data
**What it actually is:** Bayesian regression for compositional responses (Dirichlet / log-ratio). Methods paper.

**Reported results:** Compositional-data examples, not sports WP.

**Code/data available:** standard Dirichlet tools.

**Your independent relevance call:** Low. Could model 1X2 as a composition; multinomial or independent Poissons is simpler and already standard.

**Direct application to GSE:** Not applicable unless someone insists on Dirichlet 1X2.

**Implementation cost/risk:** Skip.

---

### 2202.08500 — Causal inference with recurrent and competing events
**What it actually is:** Biostat identification/estimation for recurrent events with competing risks. Not a sports paper.

**Reported results:** Methods; no sports metrics.

**Code/data available:** related author GitHub https://github.com/palryalen

**Your independent relevance call:** Low. Only if injury is modeled as a recurrent process competing with “plays.” That is not the launch model.

**Direct application to GSE:** Not applicable now.

**Implementation cost/risk:** High expertise, deferred.

---

### 2402.12400 — Estimating the age-conditioned average treatment effects curves
**What it actually is:** ATE as a function of age (continuous modifier), with uncertainty.

**Reported results:** Methodological / applied curves, not team WP.

**Code/data available:** supplement.

**Your independent relevance call:** Low for launch. Pair with 2110.14017 if player-level causal age effects become real.

**Direct application to GSE:** Not applicable now.

**Implementation cost/risk:** Skip.

---

### 2303.01318 — A Continuous-Time Stochastic Process for High-Resolution Network Data in Sports
**What it actually is:** Continuous-time process on an interaction network (passes, ball events) — intensity on edges, not a box-score GLM.

**Reported results:** Fits vs discrete snapshots on high-res sports network data.

**Code/data available:** needs event timestamps / tracking.

**Your independent relevance call:** Low for current GSE feeds.

**Direct application to GSE:** Not applicable until event-level MLS/NFL PBP timestamps are first-class.

**Implementation cost/risk:** High data.

---

### 1910.07410 — Rugby-Bot: Utilizing Multi-Task Learning & Fine-Grained Features for Rugby League
**What it actually is:** Shared backbone, multiple heads (outcome, margin, events) for rugby league.

**Reported results:** Multi-task beats single-task on their rugby data.

**Code/data available:** limited public fine-grained rugby data.

**Your independent relevance call:** Low–medium as an *architecture pattern* (shared latent, moneyline + spread + total heads). Wrong sport, needs fine-grained features.

**Direct application to GSE:** Consider multi-task heads after the generative backbone exists. Not a first patch.

**Implementation cost/risk:** Medium, later.

---

### 1902.08081 — DeepHoops: Evaluating Micro-Actions in Basketball Using Deep Feature Representations
**What it actually is:** Deep embeddings of basketball micro-actions for action value. Tracking/video-ish.

**Reported results:** Action-value estimates, not team Brier.

**Code/data available:** https://github.com/anthonysicilia/DeepHoopsRealtimeApplication (demo; data is the wall)

**Your independent relevance call:** Low.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2608.09824 — Longitudinal Bayesian Networks for Assessing Team Performance in the NBA
**What it actually is:** Longitudinal BN over team-performance variables across an NBA season (pace, shooting, defense, etc.), interpretable DAG plus time.

**Reported results:** NBA team-performance structure / component prediction.

**Code/data available:** https://github.com/gcalvobayarri/Longitudinal_BNs

**Your independent relevance call:** Low–medium. Brand-aligned interpretability if NBA is added. Not NFL/MLB/MLS launch.

**Direct application to GSE:** Optional NBA module. Do not force a BN onto NFL box scores without a defended DAG.

**Implementation cost/risk:** Medium given the repo.

---

### 2503.18589 — Unified Uncertainty-Aware Diffusion for Multi-Agent Trajectory Modeling
**What it actually is:** Diffusion over multi-agent future trajectories with uncertainty estimates. Tracking domain.

**Reported results:** ADE/FDE/NLL and uncertainty calibration of *trajectories*, not game outcomes.

**Code/data available:** ecosystem data (Big Data Bowl, SportsLabKit), not a GSE pipeline.

**Your independent relevance call:** Low. Uncertainty-aware is in the title; the object is player paths.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2604.02447 — PlayGen-MoG: Framework for Diverse Multi-Agent Play Generation via Mixture-of-Gaussians
**What it actually is:** Mixture-of-Gaussians generator for diverse plausible multi-agent plays.

**Reported results:** Diversity/coverage of generated plays.

**Code/data available:** not needed.

**Your independent relevance call:** Low. Content/sim, not scoring.

**Direct application to GSE:** Not applicable to problems 1–5.

**Implementation cost/risk:** Skip.

---

### 2005.12853 — Space-Time VON CRAMM: Evaluating Decision-Making in Tennis with Variational Generative Models
**What it actually is:** Variational generative model of tennis space-time; decision quality vs counterfactual alternatives.

**Reported results:** Tennis tracking case studies.

**Code/data available:** Hawk-Eye-class data is the blocker.

**Your independent relevance call:** Low for GSE data. Conceptually the closest “generative counterfactual” paper to CEPT’s intervention language, and still not an e-process.

**Direct application to GSE:** Not applicable without tracking.

**Implementation cost/risk:** Skip.

---

### 2001.00878 — Predicting competitions by combining conditional logistic regression and subjective ratings
**What it actually is:** Conditional logit on matchups plus an expert-rating term.

**Reported results:** Hybrid beats either source alone in their competitions.

**Code/data available:** none critical.

**Your independent relevance call:** Low–medium. A clean way to put a human prior in an ensemble. 2008.01485 / market papers say that prior may be redundant with the line.

**Direct application to GSE:** Only if GSE has an independent expert stream that is *not* the market. Test CLV contribution before shipping.

**Implementation cost/risk:** Low if the stream exists.

---

### 2508.02725 — Forecasting NCAA Basketball Outcomes with Deep Learning: A Comparative Study
**What it actually is:** Comparative DL on NCAA basketball outcomes.

**Reported results:** Deep models competitive with ratings given enough history; calibration usually secondary in this genre.

**Code/data available:** NCAA results widely available.

**Your independent relevance call:** Low. NCAA is not the launch sport. 2208.08598 is the NCAA paper worth implementing if that market is added.

**Direct application to GSE:** Not applicable now.

**Implementation cost/risk:** Skip.

---

### 2606.09327 — A Universal Dense Football Event Representation Based on TabTransformer
**What it actually is:** TabTransformer embeddings of football events into a dense vector for downstream tasks.

**Reported results:** Representation quality on event streams.

**Code/data available:** needs event-level football data.

**Your independent relevance call:** Low for launch (no event feed). Representation paper, not a probability model.

**Direct application to GSE:** Revisit with StatsBomb-like MLS events.

**Implementation cost/risk:** High data.

---

### 2608.21530 — Multimodal Injury Risk and Performance Prediction in Tennis Using Weighted Ensembles
**What it actually is:** Weighted ensemble across load / ranking / text modalities for tennis injury and performance.

**Reported results:** Ensemble beats single modality.

**Code/data available:** tennis/injury data mostly proprietary.

**Your independent relevance call:** Low as a tennis product. Medium as “split experts by modality, then weight.” CEPT wants those weights to be e-process weights, not MSE-tuned.

**Direct application to GSE:** Use injury/news as a *separate expert* that can only downweight confidence, not as another leaked feature in the global model.

**Implementation cost/risk:** Pattern cheap; tennis product expensive.

---

### 2404.12499 — A Multivariate Copula-based Bayesian Framework for Doping Detection
**What it actually is:** Bayesian copulas on multivariate biological markers; joint-tail anomalies for doping passports.

**Reported results:** Detection operating points. Not WP.

**Code/data available:** sensitive; none useful.

**Your independent relevance call:** Low. Possible stretch: copula tails for scraped-stat QA (problem 7).

**Direct application to GSE:** Optional anomaly layer on ingested rows. Not the engine.

**Implementation cost/risk:** Skip for launch.

---

### 2502.07491 — Exploring Patterns Behind Sports
**What it actually is:** Hybrid ARIMA+LSTM on sports series, PCA, SHAP, KNN residual intervals.

**Reported results:** Series-forecast errors on their examples. Not a CLV study.

**Code/data available:** none to depend on.

**Your independent relevance call:** Low. This is the class of paper 2408.08331 argues you should not lead with. KNN intervals are a poor man’s conformal.

**Direct application to GSE:** If you want intervals tomorrow without CPDs, KNN residuals work; prefer 2208.08598.

**Implementation cost/risk:** Overfit risk is exactly problem 2.

---

### 2301.04001 — Big Ideas in Sports Analytics and Statistical Tools for their Investigation
**What it actually is:** Survey of live ideas (ratings, WP, tracking value, causality, decisions) and pointers (including Cervone EPV demo https://github.com/dcervone/EPVDemo).

**Reported results:** None original.

**Code/data available:** survey + EPV demo.

**Your independent relevance call:** Medium as a map, zero as an implementation spec. Useful to confirm this 58-set is thin on possession value / EPV because GSE has no tracking.

**Direct application to GSE:** Read-only checklist. Do not treat it as coverage of problems 1–2.

**Implementation cost/risk:** n/a.

---

### 2602.08083 — A Unified Server Quality Metric for Tennis
**What it actually is:** Context-aware tennis serve quality metric.

**Reported results:** Tennis serve-driven prediction/ranking lift.

**Code/data available:** Tennis Abstract / Sackmann public.

**Your independent relevance call:** Low.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 2310.03417 — Selecting the best compositions of a wheelchair basketball team
**What it actually is:** Constrained lineup optimization for wheelchair basketball.

**Reported results:** Better lineups vs naive on their data.

**Code/data available:** https://github.com/gcalvobayarri/Wheelchair_basketball_lineups.git

**Your independent relevance call:** Low. Dynasty/roster stretch only.

**Direct application to GSE:** Not applicable to problems 1–5.

**Implementation cost/risk:** Skip.

---

### 2307.06754 — Ranking Handball Teams from Statistical Strength Estimation
**What it actually is:** Attack/defense/HA strength → handball ranking.

**Reported results:** Ranking/prediction vs naive handball baselines.

**Code/data available:** small.

**Your independent relevance call:** Low. Another per-sport strength model in a sport GSE does not price.

**Direct application to GSE:** Not applicable.

**Implementation cost/risk:** Skip.

---

### 1909.08034 — Optimizing Through Learned Errors for Accurate Sports Field Registration
**What it actually is:** Computer vision: register broadcast frames to a field template by learning geometric error. “Calibration” here means camera geometry.

**Reported results:** Registration accuracy on sports video benchmarks.

**Code/data available:** CV literature repos; irrelevant to Brier.

**Your independent relevance call:** Low. First-pass false friend on the word calibration.

**Direct application to GSE:** Not applicable to problem 1. Only if GSE starts ingesting broadcast video.

**Implementation cost/risk:** Skip.

---

### 1607.01756 — Protocol for an Observational Study on the Effects of Playing High School Football
**What it actually is:** Pre-registered causal *protocol* on long-term effects of HS football. No estimates.

**Reported results:** None.

**Code/data available:** protocol.

**Your independent relevance call:** Low. Process lesson only: freeze the three calibration windows before looking.

**Direct application to GSE:** Pre-register window dates. Not a model.

**Implementation cost/risk:** n/a.

---

### physics/0512143 — What is the most competitive sport?
**What it actually is:** 2005-era comparison of outcome unpredictability / entropy across sports.

**Reported results:** Sports differ in upset rates; qualitative ranking later measured better by 1701.05976.

**Code/data available:** obsolete.

**Your independent relevance call:** Low. Superseded.

**Direct application to GSE:** Cite Lopez instead.

**Implementation cost/risk:** Skip.

---

# Band 4 — dead end or should not have been “high”

### 2312.11067 — FightTracker: Real-time predictive analytics for Mixed Martial Arts bouts
**What it actually is:** Withdrawn by Vincent Berthet (v2, April 2026). **No PDF.** Abstract claimed two regressions on UFC + MMA Decisions (judge majority score by round; P(red wins | lasts past R2)), ~80% accuracy, R Shiny on ESPN live, and 90.17% ROI over 8 weeks at Unibet.

**Reported results:** Unverifiable. Treat as null.

**Code/data available:** none official.

**Your independent relevance call:** None until a replacement paper exists. First-pass “high” cannot survive a withdrawal.

**Direct application to GSE:** Do not implement. Do not cite the ROI.

**Implementation cost/risk:** Dead end.

---

# Closing synthesis

## Top 5 to build first
Ranked by (effect on Brier/ECE or on the MAE hole) / cost, after this read — not after the triage labels.

**1. 1701.05976 — fit the Lopez state-space per NFL / MLB / MLS.**  
It is the only paper that simultaneously (a) justifies splitting sports, (b) measures the error floor GSE is fighting, (c) shows the close is already a calibrated probability, and (d) gives a posterior width that can replace bootstrap caps. Code exists. If after this fit GSE still loses MAE to the naive baseline, the honest reading is that the baseline *is* the market or the mean, and the engine does not have an information edge.

**2. 2408.08331 — run their bake-off on GSE data before writing another model class.**  
RPS 0.2054–0.2087 across Poisson, RF, and a tiny net is the number that should kill an architecture-first plan. Cost is a week of evaluation, not a rewrite.

**3. 2208.08598 — conformal WP wrapper on the existing margin.**  
Repo exists. This is the cheapest change that can move ECE without pretending the mean model is better. It will not move MAE. Block residuals by sport-season.

**4. 2311.03490 + 2501.02505 — lock rule and partial ranks.**  
Together they replace most of bootstrap mode: do not publish a sharp number the data cannot support, and do not lock when the interval includes a coin flip. Code for both exists.

**5. 1906.05029 — MLS generative remaining-score (pre-game slice first) plus sliced ECE.**  
This is the per-sport model that is actually specified, with an ECE table that shows why GSE’s single 0.0699 is an inadequate gate. NFL should stay closer to iWinRNFL / Lopez, not to this soccer likelihood.

I am *not* putting 1710.02824 in the top 5 as a model. I am putting its instrumentation (lock vs close) in week 1 regardless, because otherwise problem 4 is undefined.

## CEPT ensemble — what in this set actually helps
Almost nothing here *is* an e-process. CEPT’s two moving parts are (i) a likelihood-ratio that remains valid under a declared intervention class, and (ii) multiplicative weights over experts. The set gives you experts and an intervention *pattern*. It does not give you the e-process theorem.

A workable four-expert product using only papers that survived this read:

1. **Sport generative expert** — Poisson/Skellam or Lopez margin, specified per league (1906.05029 / 2105.09881 / 1701.05976). e-value = density ratio of the settled outcome under this expert vs under the **closing-line implied density**. That single choice makes problem 3 and problem 4 the same calculation.
2. **Market expert** — the close itself (1701.05976 reliability + 1710.02824 odds plumbing). Its e-value hovers near 1. It exists so the ensemble cannot drift away from a calibrated price without paying wealth.
3. **Conservative expert** — conformal \(p\) and/or partial-rank cap (2208.08598, 2501.02505). Gains wealth when expert 1 is over-sharp.
4. **Intervention expert** — not FineCausal’s video model; the ablation pattern (2503.23911) plus any actually randomized covariate (1605.08753 as a template). If dropping market features or dropping injury/news flips the pick, emit \(e=1\) (abstain). That is the “worst-case over interventions” clause you can ship without a new monograph.

Weights: \(w_t^{(k)} \propto w_{t-1}^{(k)} e_t^{(k)}\). Lock when wealth on the frozen window is ≥ 1, expert 3 does not call a tie-across-0.5, and expert 4 does not abstain.

Papers I would **not** put in the CEPT product: 2207.14124, 2502.07491, 2508.02725, 2606.09327, 2503.18589, 1910.07410. They are extra function classes without an e-value story.

## Bootstrap mode
Something in this set *is* a good fit — not one paper, a stack:

- Width from Lopez’s \(\sigma_B,\sigma_W,n\) (1701.05976)
- Partial order instead of fake ranks (2501.02505; 2406.19563 if you want a fuller posterior)
- CPD evaluated at lock (2208.08598)
- Humility gate (2311.03490)
- If synthetic rows are unavoidable, 2412.19363’s bound — nothing else in the set licenses “just add GPT games”

There is no paper here that says “cap confidence at 0.60 when \(n<20\)” and then proves it. The ad-hoc cap should die.

## Where GSE’s current approach is structurally wrong
These contradict parts of Section 1 if Section 1 is read as “split by sport, retune, declare victory.”

1. **A global calibrator is the wrong instrument, but “independent per-sport models” is an incomplete diagnosis.** Lopez: the leagues do not share \(\sigma_G\). Robberechts: even *inside* soccer, aggregate ECE hides a late-game classifier collapse. Splitting sports is necessary. It does not create an edge over the close.

2. **Problem 2 may not be a model-class problem.** 2408.08331: Poisson vs RF vs NN, RPS within 0.003. iWinRNFL: net ≠ better than logistic on the same NFL state. If MAE 5.31 vs 4.91 is a spread-like loss against a mean or a line, a “structurally different approach” that is just a deeper net is the wrong structure.

3. **The public standard (Brier + CLV) is in tension with beating a naive baseline if the naive baseline is the market.** Markets in 1701.05976 are already calibrated. CLV-positive systems can look mediocre on MAE; MAE-winning systems can be CLV-negative if they overfit results and ignore the close. GSE has to pick which loss is the boss. The brand (“math you can read”) and the stated public standard both point to Brier+CLV, not to MAE vs an unspecified naive.

4. **One calibration number on 1,164 mixed-sport picks will pass or fail for the wrong reason.** 2207.13770 exists because binning and pooling lie. Require per-sport windows. The “3 consecutive green windows” rule is good only if a window is not a mash of NFL and MLS.

5. **Crowd/social/LLM extras will not rescue this.** 2008.01485 (even though it is Fed forecasts, not bets): real crowds are not magic. 2412.19363: synthetic data without a bound is bias. 2502.07491-style hybrids are how you overfit your way into a worse MAE.

6. **2312.11067 is withdrawn.** Any roadmap that still contains FightTracker ROI should delete it.

If the Band-1 stack is implemented and the first frozen window is still red, the next step is not another paper from this list. It is to change the product claim: GSE reports a readable, uncertainty-honest probability that tracks the close, rather than a model that beats a naive baseline.
