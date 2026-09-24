# 0982 — Assessing competitive balance in the English Premier League for over forty seasons using a stochastic block model (2107.08732v1)
**Ledger:** 0982 | **arXiv:** 2107.08732v1 (2021) | **Lane:** win_spread_total
**Title:** "Assessing competitive balance in the English Premier League for over forty seasons using a stochastic block model" — J. T. Gorgi, S. J. Masefield, A. F. McDaid, N. Friel
**Replacement context:** Fresh-search replacement (query: `abs:"uncertainty of outcome" AND abs:sport`) for an original-assignment duplicate that already existed in the corpus map. The duplicate skips are not REJECTs — see the wave summary for the duplicate chain. This paper is a genuinely new full read.

---

## Citation / full-text source
Full citation: "Assessing competitive balance in the English Premier League for over forty seasons using a stochastic block model" — J. T. Gorgi, S. J. Masefield, A. F. McDaid, N. Friel. Full text: arXiv 2107.08732v1 (2021), https://arxiv.org/abs/2107.08732v1.

## Research question
A fully probabilistic model of competitive balance: instead of univariate balance indices (HHI-style index of competitive balance, relative entropy), the authors build a novel **Bayesian stochastic block model (SBM)** on the season's results matrix and infer (a) the posterior over the number of blocks K (one block ≈ a balanced league; two or more ≈ tiered/imbalanced), and (b) each team's posterior allocation to the strongest block. Applied to every English top-flight season from 1978/79 through 2019/20 (42 seasons, covering the end of the old First Division and the whole Premier League era from 1992/93).

## Dataset / schema
Each season is represented as an N×N results matrix y with entries y_ij ∈ {1,2,3} = {home win, draw, home loss} for team i at home vs team j — a dense directed network adjacency matrix with no self-loops. A league with N teams yields N×(N−1) fixtures (380 per season for N=20; 462 for N=22 in the pre-1995 era). Total: 42 seasons × ~380–462 dyadic observations ≈ 16,400 match outcomes. Outcome is the 3-category categorical (not goals).

## Method
Two layers:

1. Classical univariate balance statistics per season: the Herfindahl–Hirschman index of competitive balance (HHICB) and a relative-entropy statistic (normalized entropy of the points-share vector), both plotted per season over the 42 years.
2. The SBM: partition the N teams into K blocks so that the multinomial (win/draw/loss) pmf for a home fixture depends only on the home team's block k and the away team's block l, i.e. a K×K×3 interaction array p. Infer K and the allocation vector z.

**Priors / hyperparameters.** Dirichlet(1,1,1) uniform on each block-interaction pmf; Dirichlet(1,...,1) symmetric uniform on allocation weights θ; K ~ zero-truncated Poisson(λ=1), π(K)=1/(K!(e−1)), K restricted to 1..K_max — the 1/K! factor deliberately cancels the K! label-switching permutations. Allocation z_i | θ iid Multi(1,θ).

**MCMC.** Collapsed posterior π(z,K|y) after integrating out θ and p (conjugate Dirichlet–multinomial); allocation-sampler scheme with three move types: MK (insert/remove an *empty* cluster, changes K only), M-GS (Gibbs update of all allocations, fixed K), AE (absorb/eject a cluster, changes both). Fixed-dimension z avoids reversible-jump MCMC. Label switching handled post-hoc by ordering block 1 as the strongest.

## Equations / assumptions
- Results matrix: y = N×N with y_ij ∈ {1,2,3}, i≠j; conditional independence of dyads given (z,p,K).
- y_ij | z_i=k, z_j=l ~ Multi(1, p̲^kl), p̲^kl = (p_1^kl,p_2^kl,p_3^kl), Σ_ω p_ω^kl=1.
- Collapsed posterior (eq. 8):
  π(z,K|y) ∝ ∏_{k=1}^{K}∏_{l=1}^{K} [ Γ(3) ∏_ω Γ(N_kl^ω+1) / Γ(Σ_ω(N_kl^ω+1)) ] · ∏_{k=1}^{K} Γ(n_k+1) · Γ(K)/Γ(N+K) · 1/K!,
  where N_kl^ω counts outcome-ω games with home team in block k vs away team in block l, and n_k is block k's team count.
- Marginal top-block membership (eq. 17): π(z_i=1|y) = Σ_k π(z_i=1|y,K=k)π(K=k|y) — integrates over K uncertainty; a team joins the "strongest block" when this exceeds 0.5.
- Relative entropy statistic: Σ_i p_i log(p_i)/log(1/n), p_i = points share; max 1 at perfect balance. HHICB: increasing = more imbalanced.
- Assumptions: categorical outcomes (no goal margins); block-homogeneous multinomials; iid multinomial allocations (no covariate/strength structure on z); dense complete network; K_max user-chosen.

## Features / target
Features: the season's N×N results matrix entries y_ij ∈ {1,2,3} (home win, draw, home loss); no team-level covariates (allocation is pure latent structure). Target (inferred, not observed): the number of blocks K and the per-team block allocation vector z, summarized as the marginal top-block membership probability π(z_i=1|y). Classical univariate balance statistics (HHICB, relative entropy of the points-share vector) are the descriptive comparator features.

## Validation
No predictive baselines; the classical indices (HHICB, relative entropy) serve as the descriptive baseline the SBM is validated against: seasons with lower HHICB / higher relative entropy line up with high posterior P(K=1) — the SBM agrees with classical indices but adds structure. Tables: Table 4 (P(K) per season, 42×4), Table 2 (2018/19 posterior memberships), Table 3 (head-to-heads of Spurs/Arsenal/Man Utd), Table 5 (top-block membership 2000/01–2019/20).

## Exact results / baselines
- **Table 4 (the money table):** posterior probability of K=1..4 for each of 42 seasons. The two-block model dominates the modern era — since 2003/04, the posterior for K=2 exceeds 0.85 in almost every season. In the first half of the study there is often near-equal support for K=1 vs K=2 (e.g. 84/85: 42.34 vs 57.22; 90/91: 49.31 vs 50.07; 95/96: 48.05 vs 51.68). Notable exceptions: 15/16 (Leicester's title — K=1 support 75.37) and 84/85 (the second "block" was a single team, Stoke, with 3 wins in 42 games — a pathological split). Three-block support is negligible except modest bumps post-2003 (e.g. 03/04: 5.12, 07/08: 5.92, 09/10: 4.67).
- **2018/19 worked example (Section 6.2):** K=2 at 97.94%; top block = the "big six" (Man City, Liverpool, Chelsea, Spurs, Arsenal, Man Utd). Posterior memberships reveal over/under-achievement the league table hides: Tottenham (3rd in the table) has *lower* top-block membership (0.80) than Arsenal (0.89) and Man Utd (0.84), consistent with head-to-head records (Arsenal 2W 2D vs both; Spurs 1W 1D 2L vs both). This is the paper's strongest demonstration: allocation probabilities are a purer measure of latent strength than points.
- **Big-six emergence (Section 6.4, Table 5):** from 2009/10 (the Abu Dhabi takeover season) Man City and Spurs are ever-present in the top block; Arsenal/Chelsea/Man Utd ever-present apart from 2019/20; Liverpool absent in 5 of 20 seasons. In 2019/20 the top block collapses to just Liverpool + Man City (Liverpool 99 points; third-placed Man Utd at 66). Earlier interlopers (Everton 07/08–09/10, Aston Villa 08/09–09/10, Newcastle 01/02, 05/06, 11/12) appear for short runs.
- **Strongest-block size as a balance index (Figure 6):** 1978/79–2003/04, top block contained more than half the league (11–22 teams) in 20 of 25 seasons; from 2003/04 on, only 2–7 teams in 15 of 17 seasons — a structural break in competitiveness.
- **Baselines:** No predictive baselines; the classical indices (HHICB, relative entropy) serve as the descriptive baseline the SBM is validated against.

## Code / data
R code + datasets: https://github.com/basins95/Football_SBM. The underlying 42-season English top-flight results data is described but not separately distributed beyond the repo.

## Leakage
No leakage discussion in the paper; the analysis is descriptive rather than predictive — each season is fit independently on that season's complete results matrix, so no temporal train/test leakage structure arises. MCMC details (chain length, burn-in, convergence diagnostics, runtime) are not reported; reproducibility rests on the GitHub R code rather than the text.

## Limitations
- The categorical 1X2 outcome discards goal margins entirely — a 5–0 and a 1–0 are identical observations, throwing away precisely the information (margin of dominance) that would separate blocks most sharply. The authors admit this and propose a bivariate-Poisson extension as future work.
- No dynamics: each season is fit independently; blocks can't drift within a season, so in-season form shifts, managerial changes, and transfer-window regime changes are invisible.
- Team strength has no covariates — allocation is pure latent structure, so the model cannot condition on payroll, injuries, or xG the way a modern forecasting pipeline would; descriptive, not predictive.
- Truncated Poisson(1) prior puts most mass on K=1,2, which structurally favors the "balanced vs big-club split" story; three-block support may be understated.
- The 84/85 Stoke pathology shows K=2 can latch onto a single degenerate outlier team — the "second block" isn't always an economically meaningful tier.
- MCMC details (chain length, burn-in, convergence diagnostics, runtime) are not reported; reproducibility rests on the GitHub R code rather than the text.
- Findings are specific to closed European football leagues; the balance dynamics (big-club financial pull) don't transfer mechanically to draft/parity-engineered US leagues.

## GSE overlap
- Cites 1507.00634 (Manasis/Ntzoufras/Reade — already read, ledger 0980) as the UOH/competitive-balance reference — corroborates that ledger's finding that standard-deviation metrics find limited UOH evidence while special indices do; this paper's structural-break result (~2003) is consistent with their "big clubs pull away" narrative but via a fully Bayesian mechanism.
- 2102.09288 (ledger 0981): goal-based balance index is the natural complement — margins where this paper sees only 1X2.
- The map's betting-market papers (2008.05417/1902.10067, ledgers 0978/0979): none of them use latent-block structure; this paper's top-block posterior is a candidate prior/regularizer for team-strength hierarchies in a prediction engine rather than a pricing model.
- Pairs directly with 1507.00634 (ledger 0980) — that paper is *cited here* ("Manasis, V., I. Ntzoufras, and J. Reade (2021). Competitive balance measures and the uncertainty of outcome hypothesis in european football. arXiv:1507.00634 [stat.AP]"), i.e. the map's UOH paper is a reference of this one. Also related to 2102.09288 (ledger 0981, goal-based balance index) as an alternative balance metric in the map. The bivariate-Poisson goal-model extensions cited (Dixon–Coles 1997, Karlis–Ntzoufras 2003) echo the map's football-forecasting cluster.

## Implementation (GSE adaptation)
- **What to build:** a seasonal "league tier engine" — for each completed season (or rolling window) of any GSE-covered league, fit the collapsed SBM on the 1X2 results matrix and output (1) posterior P(K) per K, (2) per-team top-block membership π(z_i=1|y), (3) estimated top-block size as a season balance index. Use it as a *contextual prior* in the prediction stack: teams' pre-season ratings get shrunk toward their block's interaction pmf; mid-season, block membership probabilities act as a regime label for matchup adjustments (e.g., "top-block home vs non-top-block away" gets its own empirical 1X2 distribution).
- **Concretely:** implement the collapsed posterior (eq. 8) in Python/JAX with the allocation sampler (MK / M-GS / AE moves); or port the authors' R code from github.com/basins95/Football_SBM as a reference implementation and validate outputs match on 2018/19 EPL before re-implementing.
- **Data needs:** full season results matrix (1X2 per fixture) — already available in GSE's match-result feeds; no odds or xG needed for v1.
- **Where it plugs in:** fantasy/pick'em context features (tier tags), season-preview content ("model says the league has exactly two tiers this year"), and as a structural-balance feature in long-horizon simulations.

## Reproducible test
- Reproduce the paper's 2018/19 analysis: build the 20×20 1X2 matrix from results data; run the sampler; confirm P(K=2|y) ≥ 0.90, confirm the top block contains exactly {Man City, Liverpool, Chelsea, Tottenham, Arsenal, Man Utd}, and confirm the membership ordering Arsenal (0.89) > Man Utd (0.84) > Tottenham (0.80) within ±0.10 of the paper's values.
- Reproduce Table 4's structural break on a second league (e.g., La Liga 2000–2020): expect P(K=2) dominant post-2003 analogously, and check the top-block size index contracts over time.

## Numeric gate
- On the 2018/19 EPL reproduction, the sampler's estimated posterior probability of the two-block model must be ≥ 0.90 (paper: 0.9794) AND the recovered top block must match the paper's six teams exactly. If either fails, the implementation is not faithful.

## Improvement experiment
- **Goal-augmented SBM (the authors' own proposed extension):** replace the categorical 1X2 likelihood with a block-structured bivariate Poisson on goals (Dixon–Coles / Karlis–Ntzoufras per block-pair), keeping the collapsed allocation sampler. Test whether goal margins sharpen block separation: measure the posterior entropy of allocations on 2018/19 — success if mean allocation entropy drops ≥ 20% vs the 1X2 version while P(K) conclusions stay consistent. This directly attacks the paper's biggest information loss.
- **Predictive extension:** fit the SBM on first-half fixtures only, then score second-half 1X2 predictions from block interaction pmfs vs a naive home/draw/away base rate — success if log-loss improves ≥ 0.02.

## Verdict
**ADAPT** — The collapsed-SBM tier engine is a genuinely new structural prior for the prediction stack: probabilistic league tiers, team-level membership posteriors that beat raw table position (the Arsenal/Spurs 2018/19 case), and a principled balance index. The missing goal-margin likelihood is the known gap; the improvement experiment is exactly the authors' proposed extension and is squarely in GSE's build lane. Pair with ledgers 0980/0981 as the competitive-balance trilogy input to season-preview and long-horizon simulation features.
