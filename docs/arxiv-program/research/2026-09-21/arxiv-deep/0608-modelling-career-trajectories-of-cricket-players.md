# [0608] Modelling Career Trajectories of Cricket Players Using Gaussian Processes (arXiv:1903.07218v1)

**Citation:** Stevenson, O.G., Brewer, B.J. (2019). *Modelling Career Trajectories of Cricket Players Using Gaussian Processes*. arXiv:1903.07218v1. URL: https://arxiv.org/abs/1903.07218v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1135 lines — complete: model, priors, nested sampling, player analyses, references).
**Verdict:** REJECT (superseded) — this is the earlier conference version of the same authors' journal paper [0604] (1908.11490v2, "Finding your feet"). The transferable core (GP career trajectories, form-as-continuous) is already captured and better validated in 0604. Unique nuggets worth retaining are noted in §7/§10.

## 1. Research question
Same as 0604's: can a Bayesian GP model quantify how a batsman's ability varies *between* innings over a career (as opposed to *within* an innings, the 'eye in' effect of Stevenson & Brewer 2017), producing better current/future ability estimates than the batting average, with practical uses in player comparison, talent ID, and selection? This is the first, smaller-scale version of that program.

## 2. Dataset / schema
Test career scores of individual batsmen from Statsguru (ESPNcricinfo). Illustrative analyses: Kane Williamson's full Test career (career average 50.36 at time of writing) and the 'big four' (Smith, Kohli, Root, Williamson; ICC ratings as of 1 Aug 2018). No aggregate dataset statistics — fitted player-by-player, unlike 0604's 1,018-player / 40,273-innings corpus.

## 3. Method / model
- **Likelihood:** same hazard-based survival model as Stevenson & Brewer (2017): P(X=x) = H(x)∏_{a<x}[1−H(a)] (eq. 1–3); not-out scores treated as right-censored, P(X≥x).
- **Within-innings:** effective average μ(x) = μ₂ + (μ₁−μ₂)exp(−x/L) (eq. 5); hazard H(x) = 1/(μ(x)+1) (eq. 4); μ₁ = Cμ₂ initial ability, L = Dμ₂ e-folding ('half-life'-like) transition timescale; C~Beta(1,2), D~Beta(1,5).
- **Between-innings (the extension):** effective average μ(x,t) with per-innings 'eye in' ability μ_{2t}; log(μ_{2t}) ~ GP(m, K) with **squared-exponential** kernel (scale σ, length ℓ); m~Lognormal(log 25, 0.75²), σ~Exp(10), ℓ~Uniform(0,100); ν(t) = between-innings effective average obtained by marginalizing over scores x (eq. 7).
- **Inference:** nested sampling (Skilling 2006), C++ implementation, 1000 particles × 1000 MCMC steps per iteration — chosen for high dimensionality (one μ_{2t} per innings) and free marginal likelihoods for model comparison.

## 4. Equations & assumptions
Eqs. 1–7 as in §3; priors above. Assumes: ability not influenced by match scenario (Test cricket only); all runs treated equally (no opposition-strength adjustment — acknowledged limitation); squared-exponential (smooth, stationary) career dynamics.

## 5. Features / target
Inputs: sequence of career innings scores {x_i} (out) and {y_i} (not out). Target: posterior predictive ν(t) — expected batting average in career innings t — plus probabilistic player comparisons (e.g., P(Smith outscores Kohli next innings)).

## 6. Validation design
No formal predictive benchmark in this version (no LOOCV vs. SMA like 0604). Validation is illustrative: Williamson trajectory, big-four comparison vs. ICC ratings (rank order preserved), posterior predictive checks.

## 7. Numerical results / baselines
- **Williamson:** did not consistently bat at his career average (50.36) until ~50 innings — supports 'finding your feet'.
- **Big four next-innings predicted ν:** Smith 62.5 (career avg 61.4, ICC 929), Kohli 57.4 (53.4, 903), Root 52.6 (52.6, 855), Williamson 51.2 (50.4, 847) — rank order matches ICC, but the model adds quantified comparisons: Smith expected to outscore Kohli by 5.1 runs next innings, with 68.8% probability.
- **Form finding (unique to this version):** the model 'appears to reject the idea of recent performances as having a significant impact on innings in the near future'; the effect of recent form varies greatly from player to player (cites Durbach & Thiart 2007's randomness result).
- **Career shape:** supports anecdotal arc — raw ability → improvement with experience → peak → decline; players take different lengths of time to adjust.

## 8. Code / data availability
No code stated (C++ nested sampler, not released). Data: Statsguru/Cricinfo (public scraping).

## 9. Leakage & limitations
- **Superseded by 0604:** journal version has 1,018 players, powered-exponential kernel, LOOCV beating all SMA baselines, opponent adjustment — strictly more validated.
- **No formal predictive evaluation** here — illustrative only; cannot carry weight on its own.
- **Squared-exponential kernel** assumes smooth stationary career dynamics; 0604's powered-exponential is more flexible.
- **No opposition strength, no balls-faced data** — acknowledged; all runs equal.
- **Nested sampling at 1000×1000** per player is expensive and unnecessary today (HMC/variational would do).

## 10. GSE overlap
**Redundant with 0604.** Everything portable (GP career/form trajectories, powered-exponential > squared-exponential, form-as-continuous) is captured in ledger 0604's implementation spec and improvement experiment. Two findings worth carrying forward that 0604 under-emphasizes: (a) the **probabilistic player-comparison framing** ('68.8% chance to outscore') — directly usable in GSE content/player-prop framing; (b) the **form skepticism** — recent-form effects vary greatly by player and may be overestimated (Durbach & Thiart 2007), which tempers how much weight GSE should put on last-3-games features (consistent with 0604's SMA(10%) finding).

## 11. GSE implementation spec
None beyond 0604. If 0604's GP aging/form module is built, incorporate the two §10 nuggets: probabilistic head-to-head player comparisons for content, and per-player (not global) form-timescale estimation.

## 12. Reproducible test
Covered by 0604's test (§12 of ledger 0604). No separate test warranted.

## 13. Acceptance / rejection gate
REJECT as a standalone adaptation — superseded by 0604 in data scale, kernel flexibility, and validation rigor. Retain only the two §10 nuggets as amendments to 0604's spec. If 0604's module is ever deprioritized, this paper offers no independent argument for revival.

## 14. Improvement experiment
None independent — folded into 0604's §14 (opponent-adjusted GP aging curves). One note for that experiment's design: estimate form-timescale ℓ per player hierarchically rather than globally, per this paper's finding that form effects vary greatly across players.
