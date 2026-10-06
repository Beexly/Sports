# [0500] What Influences the Field Goal Attempts of Professional Players in Basketball? A Spatially Varying Joint Model (arXiv:2503.02137v1)

**Citation:** Jiahao Cao, Qingpo Cai, Lance A. Waller, DeMarc A. Hickson, Guanyu Hu, and Jian Kang (2025). *What Influences the Field Goal Attempts of Professional Players in Basketball? A Spatially Varying Joint Model*. arXiv:2503.02137v1. URL: https://arxiv.org/abs/2503.02137v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,764 lines).
**Verdict:** ADAPT — the joint made/missed spatially-varying LGCP with a KL-truncated GP prior is a strong template for a 1D NFL field-zone shot/target intensity model using charting data; port requires collapsing 2D courts to 1D field zones and replacing shot coordinates with target/route locations.

## 1. Research question
How do game-context covariates (home vs away; strong vs weak opponent) influence *where* professional basketball players attempt field goals and *whether* they make them? The paper jointly models the spatial intensity of made and missed shots as two correlated point processes with spatially varying covariate effects, producing a spatial relative-risk surface for each player.

## 2. Dataset / schema
After exclusions:
- Stephen Curry: 1,066 shots across 80 games, 2014–2015 season.
- LeBron James: 856 shots across 69 games, 2014–2015 season.
- Michael Jordan: 908 shots across 54 games (after removing 2 shots beyond 28 feet and 285 shots below 1 foot).
- Key columns: shot location (x, y), made/missed indicator, game covariates (home/away, opponent strong/weak where strong = playoff qualifier).
- Access: Curry and LeBron data from stats.nba.com; Jordan data described as available in the paper's online supplement. Code: **not stated in paper**.

## 3. Method / model
Made and missed shot patterns are modeled as separate Poisson processes with shared spatial structure — the Joint Spatially-Varying LGCP (JSVLGCP):
- Intensity: log λ_j(s; z_i) = α_0(s) + z_i^T β_j(s), for j = 1 (made), 2 (missed), at location s, game covariate vector z_i.
- α_0(s) is a shared spatial baseline; β_j(s) are spatially varying coefficient surfaces.
- Gaussian process priors on the spatial fields, Karhunen–Loève (KL) truncation at L = 15 components with retained variance > 0.8.
- Posterior inference via MALA (Metropolis-adjusted Langevin algorithm) combined with Gibbs sampling; inverse-Gamma(5,5) priors on variance parameters.
- The spatial relative risk surface (made vs missed intensity ratio) is the main interpretive output.

Simulation study: m = 200, with 50 games per combination of home/away × strong/weak (4 combos), 20 replicate datasets; JSVLGCP compared against LGCP, IPP (inhomogeneous Poisson process), KDE, and BART.

## 4. Equations & assumptions
Core model equation (faithful to paper):
log λ_j(s; z_i) = α_0(s) + z_i^T β_j(s), j = 1, 2.

GP/KL specification: spatial fields approximated by the first L = 15 KL eigenfunctions; hyperparameters a = 0.25, b = 1.5 (kernel parameters as stated); inverse-Gamma(5,5) priors on process variances; 15,000 MCMC iterations with the first 10,000 discarded as burn-in.

Assumptions: (a) made/missed shot locations are realizations of Poisson processes conditional on the latent fields; (b) GP prior smoothness is appropriate for shot-intensity surfaces; (c) KL truncation at 15 components captures >80% of spatial variance; (d) home/away and strong/weak exhaust the relevant game-level heterogeneity; (e) shots are conditionally independent given intensities (no within-game clustering beyond the latent field).

## 5. Features / target
- Inputs: game-level covariates z_i = (home/away indicator, opponent strong/weak indicator); shot location s.
- Targets: two point patterns per player — locations of made shots and locations of missed shots. No single scalar target; the estimand is the intensity/relative-risk surface.

## 6. Validation design
- Simulation: 20 replicate datasets at known ground truth; competitors LGCP, IPP, KDE, BART; metrics are graphical (estimated surfaces vs truth) plus reported RMSE-type summaries.
- Real data: predictive validation by thinning — each player's shots randomly split into 400 spatial cells, retaining probability p = 0.8, repeated 10 times; negative posterior log-likelihood (NPLL) compared across methods. Exact NPLL/RMSE numbers are not printed in text (graphical only).

## 7. Numerical results / baselines
- Simulation: JSVLGCP recovers the true spatially varying coefficient surfaces more accurately than LGCP/IPP/KDE/BART (reported graphically; exact numeric gaps not printed).
- Real data: JSVLGCP attains the lowest NPLL for LeBron James and Michael Jordan; for Stephen Curry it is comparable to the best competitor (exact values not printed in text).
- Data-scale facts: Curry 1,066/80, LeBron 856/69, Jordan 908/54 (post-exclusion).
- Findings: home/away and opponent strength produce interpretable spatial shifts in attempt intensity (e.g., more perimeter attempts vs weak opponents at home), visible in the relative-risk maps.

## 8. Code / data availability
Code: none stated. Data: stats.nba.com (Curry, LeBron); Jordan data in the online supplement (URL not given in the extract).

## 9. Leakage & limitations
- **No code**, so the MALA/KL implementation cannot be verified or reused directly.
- **Exact NPLL/RMSE values not printed** — the headline validation claim rests on figures.
- Jordan data exclusions (285 sub-1-foot shots, 2 beyond 28 feet) are large relative to the final 908 and could shift the baseline surface; sensitivity not reported.
- Covariate set is minimal (2 binary); player fatigue, score differential, defender identity — all known shot-selection drivers — are omitted.
- Conditional-independence of shots given the field ignores hot-hand/possession-chain structure; the latent field absorbs it but the paper does not test this.
- External validity to NFL: basketball has ~1,000 shots/player/season on a 2D court with public coordinates. The NFL analog (pass targets, ~100–150/player/season) is sparser and public nflverse data lacks full 2D receiver coordinates — the method's data appetite exceeds what is freely available for NFL.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE already covers Gaussian processes and state-space team strength (1701.05976, ML brief topics), plus the NGS spatial-metrics taxonomy and the NGS replacement spec (`docs/research/2026-09-18-ngs-replacement-spec.md`). A *joint spatial point-process model of attempt + success intensity* is not covered — this is an **extension**: the map's spatial work is metric inventory, not generative spatial modeling. The paper's KL-truncation + MALA recipe is directly reusable machinery.

## 11. GSE implementation spec
Port to a 1D NFL analog: model *target/carry location along the field* as a 1D point process.
- Data: nflverse play-by-play 2020–2025; target yardline (line of scrimmage + air yards) for each pass attempt, split completed/incomplete; covariates per play: home/away, opponent defensive strength tier (EPA/play allowed tercile), down, score differential bucket.
- Model: log λ_j(y; z) = α_0(y) + z^T β_j(y) on y ∈ [own 1, opp goal], j ∈ {complete, incomplete}; squared-exponential GP prior, KL truncation L = 12–20 tuned by retained variance > 0.85; NUTS in NumPyro rather than hand-rolled MALA.
- Two use cases: (a) receiver target-depth profiles (1D relative-risk surfaces) for matchup analysis; (b) team-level pass-location tendency surfaces vs opponent tiers.
- Effort: ~2–3 weeks for one engineer (data prep 3 days, model 1 week, validation + writeup 1 week). Serving: precompute surfaces weekly; no real-time inference needed.

## 12. Reproducible test
- Dataset: nflverse 2024 season, all pass attempts with air yards, split by completed/incomplete; covariates home/away + opponent defensive EPA/play tercile.
- Metric: held-out (last 4 weeks of season) negative log-likelihood of the 1D JSVLGCP vs two baselines: (a) homogeneous Poisson (constant rate), (b) KDE with cross-validated bandwidth.
- Baseline to beat: KDE held-out NLL. Runs: 10 random train/holdout seeds; report mean ± SE.

## 13. Acceptance / rejection gate
ADOPT the 1D port if, before running: JSVLGCP held-out NLL beats KDE by ≥ 0.02 nats/attempt with SE excluding zero across the 10 seeds, AND the estimated β surfaces show coherent structure (e.g., deeper targets vs weak opponents). REJECT the port if the NLL gap is < 0.01 nats/attempt or the surfaces are noise — the data are likely too sparse for the GP to earn its keep.

## 14. Improvement experiment
Extend to a *marked* point process: add EPA as the mark, modeling E[target EPA | location, covariates] jointly with attempt intensity — a spatial expected-points surface for route concepts. This goes beyond the paper (which models only attempt/make) and directly feeds GSE's EPA machinery: compare the spatial EPA surface's out-of-sample log-loss against GSE's existing play-level EPA features.
