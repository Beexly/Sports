# [0599] Estimation of Skill Distributions (arXiv:2006.08189v1)

**Citation:** Jadbabaie, A., Makur, A., Shah, D. (2020). *Estimation of Skill Distributions*. arXiv:2006.08189v1. URL: https://arxiv.org/abs/2006.08189v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 22014 lines).
**Verdict:** ADAPT — port the negative-entropy skill score as a league/season "competitiveness" content metric; the density-estimation machinery itself is overkill for GSE's engine.

## 1. Research question
How can we learn the distribution of skill levels across a population of agents (teams, mutual funds) from noisy, quantized win/loss observations, rather than estimating individual skills? The paper answers this with a two-stage estimator (rank centrality → kernel density estimation) that is provably near-minimax-optimal for smooth skill PDFs, then uses the estimated distribution's negative entropy as a data-driven "skill score" that quantifies fan intuitions about league competitiveness (e.g., EPL being the most competitive soccer league; the 2019 Cricket World Cup being the most exciting), and the evolution of mutual-fund quality around the 2008 Great Recession.

## 2. Dataset / schema
- **ICC Cricket World Cups (2003, 2007, 2011, 2015, 2019):** publicly available from Wikipedia. Each World Cup: n = 10 to 16 teams; each pair plays 0, 1, or (rarely) 2 matches. Draws ignored (wins/losses only). Each World Cup treated as a separate tournament.
- **FIFA Soccer World Cups (2002, 2006, 2010, 2014, 2018):** from Wikipedia. n = 32 teams each; each pair plays 0, 1, or (rarely) 2 matches.
- **European soccer leagues (2018–2019 season):** Wikipedia. EPL, La Liga, Bundesliga, Ligue 1, Serie A. n = 18 to 20 teams each; each pair plays 0, 1, or 2 times (draws excluded).
- **US mutual funds:** CRSP US Survivor-Bias-Free Mutual Funds Database (Center for Research in Security Prices, University of Chicago Booth School of Business), accessed through reference [49]. n = 3260 mutual funds with monthly net asset values January 2005 to December 2018. Pre-processed into monthly returns (change in NAV normalized by previous month's value). Each year is a "tournament" where each fund plays k = 12 monthly games against every other fund; fund A beats fund B in a month if it has the larger monthly return.
- All data was win/loss only (draws ignored); regularization via Laplace smoothing (see §6).

## 3. Method / model
Two-stage algorithm:
- **Stage 1 — skill parameter estimation via rank centrality** (Negahban/Oh/Shah [11,12]): build the empirical stochastic matrix S (eq. 4, see §4), compute its leading left eigenvector π̂\* (the invariant distribution, eq. 5), and normalize α̂ᵢ = π̂\*(i)/‖π̂\*‖∞ (eq. 6). Where k varies across pairs (kᵢ,ⱼ = kⱼ,ᵢ games between i and j), Z is redefined as Z(i,j) = (1/kᵢ,ⱼ) Σₘ Zₘ(i,j).
- **Stage 2 — Parzen-Rosenblatt kernel density estimation** (eq. 7): P̂\*(x) = (1/nh) Σᵢ K((α̂ᵢ − x)/h) with a valid (bounded, compactly supported [-1,1], Lipschitz, order-s) kernel and the bandwidth in eq. 8.
- **Algorithmic choices in experiments:** Hölder smoothness η = 1, Epanechnikov kernel K_E(x) = ¾(1−x²)𝟙{|x|≤1}, bandwidth h = 0.3·n^{−1/4} (ad hoc data-driven choice, cf. [5, Section 1.4]).
- **Skill score:** the negative differential entropy −h(P_α) ≜ ∫ P_α(t) log(P_α(t)) dt = D(P_α ‖ unif([0,1])) (eq. 12). A delta-like concentrated distribution means balanced/unpredictable (luck); near-uniform means wide spread of skills (skill dominates). Estimated by the resubstitution estimator from P̂\* and the α̂ᵢ [47,48].

## 4. Equations & assumptions
BTL outcome model (eq. 1): ℙ(Z_m(i,j) = 1 | α₁,…,αₙ) ≜ α_j/(α_i + α_j), independent across games, where Z_m(i,j)=1 means j beats i in game m ∈ [k]. Observation structure: for each i≠j, with probability p ∈ (0,1] we observe k ≥ 1 games (edges of Erdős–Rényi graph 𝒢(n,p)), otherwise nothing.
- Observation matrix (eq. 2): Z(i,j) ≜ 𝟙{{i,j} ∈ 𝒢(n,p)} · (1/k)Σ_{m=1}^{k} Z_m(i,j) for i≠j; 0 on diagonal. Z is a sufficient statistic for estimating the αᵢ.
- Empirical stochastic matrix (eq. 4): S(i,j) ≜ (1/(2np))Z(i,j) for i≠j; S(i,i) ≜ 1 − (1/(2np))Σ_r Z(i,r). Almost surely a valid stochastic matrix (proved in Appendix A.1, Prop. 3).
- Invariant distribution (eq. 5): π̂\* = π̂\*S if S ∈ 𝒮_{n×n}; an arbitrary distribution otherwise.
- Skill estimates (eq. 6): α̂ᵢ ≜ π̂\*(i)/‖π̂\*‖∞.
- KDE (eq. 7): P̂\*(x) ≜ (1/nh) Σᵢ K((α̂ᵢ − x)/h).
- Bandwidth (eq. 8): h = γ·max{1/[δ^{1/(η+1)}(pk)^{1/(2η+2)}], 1}·(log(n)/n)^{1/(2η+2)} for universal γ > 0, η the Hölder exponent, δ the skill support lower bound.
- Skill score (eq. 12): −h(P_α) = ∫_ℝ P_α(t) log(P_α(t)) dt = D(P_α ‖ unif([0,1])).
- **Theorem 1 (ℓ∞ lower bound):** minimax lower bound Ω̃(n^{−1/2}) for relative ℓ∞-loss of BTL skill parameter estimation, matching the rank-centrality upper bound in [10].
- **Theorem 2 (ℓ₁ lower bound):** matching Ω̃(n^{−1/2}) for relative ℓ₁-loss.
- **Theorem 3 (MSE upper bound):** under p ≥ c₂ log(n)/(δ⁵n), b ≥ c₃√(log(n)/n), ε ≥ 5log(n)/(bn), and lim_{n→∞} δ^{−1}(npk)^{−1/2} log(n)^{1/2} = 0, for any L₂-Lipschitz kernel K of order s and any P_α in an η-Hölder class, the estimator achieves minimax MSE scaling Õ(n^{−η/(η+1)}); for smooth (𝒞∞) P_α, Õ(n^{−1+ε}) for any ε > 0 — matching (up to log factors) the Ω(n^{−1}) lower bound even when the αᵢ are directly observed [9,5].
Assumptions: skills αᵢ are i.i.d. samples from unknown P_α; BTL model is the true outcome law; p,k satisfy the connectivity/density conditions above; kernel is Lipschitz and order-s (valid); skill PDF is η-Hölder (η > 0); draws ignored in data processing.
- **Appendices audited:** A (proofs of Theorems 1–3, incl. Lemma 4 bias-variance tradeoff for the PR kernel estimator; A.1 proves S is a valid stochastic matrix, A.2–A.3 auxiliary results); C (minimax lower bounds via generalized Fano's method — prior over finite subset of 𝒫, Bayes-risk reduction, Fano's inequality); D (Hoeffding/Bernstein concentration inequalities used throughout). All proof machinery supports the claims recorded above; no new empirical results in appendices.

## 5. Features / target
Inputs: observed win/loss outcomes Z_m(i,j) on the random graph 𝒢(n,p). Target: the unknown skill PDF P_α over ℝ₊ (non-parametric); intermediate target: the individual skill parameters αᵢ. Derived product: the negative-entropy skill score −h(P_α) per tournament, used to rank tournaments by competitiveness.

## 6. Validation design
- No train/test split — this is a theoretical paper; validation is the information-theoretic upper/lower bounds (Table 1, Theorems 1–3) and four real-data case studies.
- Data processing: draws ignored (wins/losses only). Laplace smoothing for small-data regularization: between any pair of players, each observed game is counted as 20 games, and 1 additional win is added for each player; this effectively means p = 1.
- Lower bounds use a continuum (generalized) Fano's method with covering arguments [17,18], with mutual-information upper bound I(π;Z) ≤ (1/2)n log(·) (Proposition 1, covering-number bound) under P_α = unif([δ,1]).
- Mutual-fund experiment: 3260 funds × 12 monthly "games" per year; each year processed as an independent tournament.

## 7. Numerical results / baselines
No predictive baselines or numeric tables; results are qualitative plots (Figure 1) plus the theory table:
- **Cricket World Cups (Fig. 1a/1d):** negative entropy decreases from 2003 to 2019, reaching close to 0 in 2019 — quantified confirmation that the 2019 World Cup was the most unpredictable/exciting; in 2003 Australia and India dominated while all other teams were roughly equal.
- **Soccer World Cups (Fig. 1b/1e):** negative entropies remain roughly constant and away from 0 across 2002–2018 — outcomes stayed unpredictable over the years, matching fan experience.
- **European soccer leagues 2018–19 (Fig. 1c/1f):** skill PDFs show World Cup teams concentrated in a smaller interval closer to 1; the sorted negative entropies recover an intuitively sound league ranking — EPL has the highest negative entropy (tallest, narrowest skill PDF peak: all-high-quality teams with little variation), "confirming" the fan belief that EPL is the most competitive league.
- **US mutual funds (Fig. 1g/1h/1i):** negative entropy is maximized in 2017 and minimized in 2008 (Great Recession); the 2008 skill PDF is much more spread out, while 2017 has a large peak near 0 — far fewer lowly-skilled funds survived during the recession; flatter (wider spread) skill distributions post-2008, indicating the industry became dominated by more skilled funds after the financial crisis.
- **Theory (Table 1):** BTL skill-parameter estimation — relative ℓ∞ loss: upper Õ(n^{−1/2}) [10], lower Ω̃(n^{−1/2}) (Theorem 1, new); relative ℓ₁ loss: upper O(n^{−1/2}) [10], lower Ω̃(n^{−1/2}) (Theorem 2, new). Skill PDF estimation for 𝒞∞ densities: MSE Õ(n^{−1+ε}) upper (Theorem 3), Ω(n^{−1}) lower [9,5].

## 8. Code / data availability
None stated. Data: Wikipedia (sports tournaments, publicly scrapable); CRSP US Survivor-Bias-Free Mutual Funds Database (University of Chicago Booth — proprietary, access through reference [49]).

## 9. Leakage & limitations
- **NFL transfer:** The interesting NFL analog is league/division-level competitiveness over seasons — but the NFL plays far too few games for per-season KDE (16–17 games/team → effective n=32 agents, p effectively 1 on a sparse schedule). The asymptotic theory needs n large and dense comparison graphs; sports case studies themselves use n as small as 10. The KDE estimates from n=10 are effectively descriptive plots, not trustworthy densities.
- Draws ignored entirely — meaningful loss in soccer (draws are ~25% of matches), which distorts the skill distribution width.
- Laplace smoothing "each observed game counted as 20 games + 1 added win each" is an arbitrary strong prior that shrinks all α̂ toward equality — biases entropy upward (more concentrated = more "competitive"); no sensitivity analysis given.
- BTL model doesn't use margin of victory (noted in Broader Impact), injuries, or home-field — skill here is pure win propensity.
- The mutual-fund experiment equates "higher monthly return" with "won the game," ignoring risk entirely — a high-variance fund and a skilled fund look identical; survivorship in the "survivor-bias-free" database naming is handled by CRSP but the tournament framing of funds is a metaphor, not a causal model.
- The "negative entropy = skill score" has no decision-theoretic justification beyond the KL-to-uniform argument; any distance to uniform would serve, and different divergences could reorder leagues.
- For GSE betting purposes, the skill score is descriptive journalism, not predictive — it tells you which league/season was competitive, not who wins next.
- No numeric tables of entropy values, no CIs, no comparison against alternative skill-distribution estimators — the evidence is visual (Figure 1 plots).

## 10. GSE overlap
**Extension, not duplicate.** The existing-research map shows Garrett's corpus already inventories Bradley-Terry, Plackett-Luce, Elo/Glicko/TrueSkill and team-strength methods, but nothing estimates a *population distribution of team skills* or a league-level "competitiveness/skill" score. GSE computes team-level metrics (EPA/play, DVOA equivalents, ratings) in gse-lab and inventors objective ratings v3 (benbbaldwin), but has no paper read on measuring how spread out league skill is as a function of time, nor on negative-entropy as a cross-league comparison tool. Duplicate risk: zero — none of the 57 already-read IDs cover skill-distribution estimation. The closest methodological cousin in-repo is the rank-centrality/spectral-rating literature, which is standard.

## 11. GSE implementation spec
- **Goal:** a weekly "League Competitiveness Score" content metric: estimate the cross-sectional distribution of NFL team strength each season (and historically) from win/loss data, and report −h(P̂) as a narrative stat ("2026 is the most wide-open NFL season since…"). Also division-level per-season scores.
- **Data:** nflverse game results 1999–2026 (play-by-play → game winners, home team neutralized or modeled). To increase effective n beyond 32, pool multiple seasons in rolling windows (3-season rolling) or estimate at the *team-season* level (32 × 27 seasons ≈ 864 agents) with a time-weighted comparison graph — though cross-season games don't exist, so a cleaner approach is per-season KDE on n=32 plus rolling 3-season windows; alternatively apply at the *unit* level (team-offenses/defenses, n=64) using play-level "games" (drives) for richer p.
- **Build:** (1) Build per-season game-outcome matrix Z with Laplace smoothing (tune the smoothing; paper's 20× multiplier is heavy — grid-search via held-out log-likelihood of late-season games). (2) Rank centrality: row-stochastic S, power iteration for the invariant distribution, α̂ normalization. (3) KDE with Epanechnikov kernel, bandwidth h = 0.3·n^{−1/4} as baseline; cross-validated bandwidth via likelihood of held-out games. (4) Negative-entropy score per season; normalize to a 0–100 "Competitiveness Index" for the front end. (5) Serve as a static seasonal page + weekly X graphic (X poster lane) showing the index trend 1999→2026 with the current season highlighted.
- **Effort:** ~2–3 days (pure Python/numpy; no new infra). The rank-centrality step is ~50 lines; KDE is scipy; entropy via resubstitution.

## 12. Reproducible test
Dataset: nflverse regular-season game results, 2015–2025 seasons. Task: for each season, build the rank-centrality + KDE skill distribution (per §11) and compute the negative-entropy score. Metric: (a) Spearman correlation between per-season score and the *upset rate* that season (fraction of games won by the pre-game underdog per closing spread) — expect negative correlation (higher entropy ↔ more unpredictable ↔ higher upset rate), and (b) rank-correlation of the division-level scores with observed divisional "anyone-can-win" narratives is optional. Baseline: a naive spread-of-Elo metric (stdev of end-of-season Elo ratings). Pass if the negative-entropy score correlates more strongly (|ρ| ≥ 0.5) with next-season-independent upset rate than the naive baseline does, on 2015–2025.

## 13. Acceptance / rejection gate
ADOPT the competitiveness-score pipeline for content production if, on the 2015–2025 nflverse window, |Spearman(negative entropy, same-season upset rate)| ≥ 0.5 AND it exceeds the Elo-stdev baseline correlation by ≥ 0.15. REJECT as a content metric (and mark ADAPT-only in the ledger) otherwise; in either case do not wire it into the prediction engine — it is descriptive, not predictive.

## 14. Improvement experiment
Replace the paper's two-stage estimator with a one-step alternative: directly estimate P_α by deconvolution of the BTL likelihood — fit a flexible parametric mixture (e.g., 3-component Beta mixture on the normalized skill scale) by MLE over the mixture weights using the full BTL game likelihood, avoiding the rank-centrality intermediate entirely. Compare on NFL data: which estimator's skill distribution better predicts held-out late-season game outcomes (log-likelihood) and which yields a more stable season-to-season competitiveness index? Hypothesis: the direct mixture-MLE uses margin information poorly (like BTL it ignores MOV), so add a second improvement arm that replaces BTL win-probability with a Skellam/Dixon-Coles scoreline model and re-derives the skill PDF from score margins — testing whether the competitiveness story changes when margins carry the information.
