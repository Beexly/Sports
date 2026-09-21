# [0526] How Exceptional Was the Big Three Era? Extremes and Persistence in Men's Professional Tennis (arXiv:2608.27362v1)

**Citation:** Leonelli, M. (2026). *How Exceptional Was the Big Three Era? Extremes and Persistence in Men's Professional Tennis*. European Journal of Operational Research. arXiv:2608.27362v1. URL: https://arxiv.org/abs/2608.27362v1
**Ledger completed:** 2026-09-21. **Read:** full text (4,700 lines; all sections including model specification, estimation, experiments, discussion, and references read in full).
**Verdict:** ADAPT — a Bayesian dynamic Bradley-Terry state-space rating model (with Glicko-style Gaussian filtering and Platt recalibration) is directly portable to NFL dynamic team-strength ratings, plus methodological lessons (fixed-window vs. run-based summaries, rate-calibrated cross-era thresholds) that apply to GSE team-rating comparisons.

## 1. Research question
Was the Federer–Nadal–Djokovic era (66 of 81 majors, 2003–2023) the most dominant in tennis history? Since players never meet across eras, dominance is measured by how far a player stands above his contemporaneous field, how many stand there at once, and how long — using exceedances of a rate-calibrated threshold on latent strengths from a Bayesian dynamic Bradley-Terry model.

## 2. Dataset / schema
- 197,926 men's professional singles matches (ATP tour, 1968–2025) from the TML-Database (results, player IDs, tournament from official ATP records). 188,771 involve two players with prior history and contribute to estimation. Aggregated into weekly rating periods; analysis window 1978–2025 (1,924 periods; median 558 active players/period, active = played within preceding 52 weeks). Surface analysis: 143,383 matches on hard/clay/grass (excl. carpet), 4,970 players, 1,818 periods. Reproducibility: code + data at https://github.com/manueleleonelli/Tennis_Extremes.

## 3. Method / model
- Bayesian dynamic Bradley-Terry state-space model: vector latent strengths per player (one component per surface), Gaussian random-walk dynamics, logistic win-probability link with match-format discrimination parameter. Posterior via mean-field across players + Laplace Gaussian approximations per player (Glickman 1999), reproducing Glicko-style updates iterated to convergence (the single Fisher-scoring step fails when a player contests many matches per period), then Gaussian pseudo-observations putting the model in linear-Gaussian state-space form; trajectory sampling via Carter–Kohn; 300 posterior samples for all functionals. Dominance: peaks-over-threshold exceedance counts N_t(u) at rate-calibrated thresholds (mean N̄=1 and N̄=2 players/period); persistence via lag profiles {π_k} and block profiles {β_w} (fixed-window averages, not run lengths); cross-surface upper-tail dependence via Ledford–Tawn coefficients. Four 12-year blocks (1978–1989, 1990–2001, 2002–2013, 2014–2025) plus a strongest-decade-vs-strongest-disjoint-decade comparison requiring no division.

## 4. Equations & assumptions
- Relative strength: r_{i,t} referenced to contemporaneous field (mean strength of 10th–100th ranked players); reported on conventional rating scale where ~400 points ≈ 10:1 odds.
- Dynamics: θ_{i,t} = θ_{i,t−1} + w_{i,t}, w_{i,t} ∼ N_S(0, τ² R(ρ)) independently across players; initial θ_{i,t_{0i}} ∼ N_S(0, σ_0² R(ρ)); R(ρ) exchangeable correlation with off-diagonal ρ (ρ=1: common strength; ρ=0: separate per-surface problems) — Eq. (4).
- Match probability: P(i defeats j | θ_{i,t}, θ_{j,t}) = [1 + exp{−a_f (θ^{(s)}_{i,t} − θ^{(s)}_{j,t})}]^{−1} — Eq. (5); a_3 = 1 (scale normalization), a_5 estimated from relative upset frequency across the two formats.
- Posterior: p(Θ | y, ψ) ∝ ∏_i [p(θ_{i,t_{0i}}) ∏_{t>t_{0i}} p(θ_{i,t}|θ_{i,t−1})] ∏_m p(y_m | θ_{i_m,t_m}, θ_{j_m,t_m}) — Eq. (6); hyperparameters ψ = (τ, σ_0, ρ, a_5) fixed at marginal-likelihood maximizers (grid search, one forward pass each); τ's posterior SD < 2% of value; refits ±2σ leave comparisons unchanged to 2 d.p.
- Platt recalibration on logit scale: intercept 0, slope 0.851 (est. on odd years, evaluated on even years) — global monotone rescaling, rankings/exceedances unchanged.
- Stated assumptions: strengths evolve slowly (random walk); match outcomes conditionally independent given strengths; field reference (10th–100th ranks) stabilizes after 1978 (reference level flat at 1900–1935 rating points); threshold calibrated to common marginal exceedance rate within each posterior draw.

## 5. Features / target
- No features in the ML sense: the targets are model estimands — latent strengths θ_{i,t}, and their functionals: exceedance counts N_t(u), lag/block persistence profiles, peak relative strength, sojourn above threshold (total periods exceeding threshold), cross-surface upper-tail dependence (χ, η) and P(extreme on all three surfaces).

## 6. Validation design
- Model checking (§5.2): predictive accuracy 0.675, Brier score 0.207 on 188,771 matches with prior history (in line with tennis benchmarks); prequential likelihood sharply peaked in τ; Platt recalibration (odd years) removes overconfidence (predicted 0.934 → observed 0.910 in highest band; flat to 0.006 post-calibration).
- Summary-function validation (§3.4): 25 simulated records (250 players, 400 periods, known truth) comparing run-based vs. fixed-window summaries under true strengths, recursive Elo-as-observed, and posterior medians (Table 1): longest-run estimate/true ratio mean 1.75 (Elo) / 1.32 (posterior median) with s.d. 0.87/0.60 — non-robust; fixed-window lag persistence π_1 ratio mean 1.12/1.08, s.d. 0.07/0.06 — robust.
- Cross-surface model: ρ = 0.90 (interior maximum; τ = 0.05), accuracy 0.667; +1,365 prequential log-likelihood units over independent (ρ=0).

## 7. Numerical results / baselines
- Peak strength: only Djokovic separates from the field; Federer and Nadal are indistinguishable from Borg, McEnroe, Lendl on peak (Table 3/4). Era-averages of order statistics (Table 2): 1978–1989 block above every later block at every rank (rank-1: 397 [376,424] vs. 364 [347,387] (2002–2013), 377 [350,400] (2014–2025); 1990–2001 anomalously low: 264 [246,284]).
- Concurrent dominance (Table 5): at strict threshold (N̄=1), only 2002–2013 has periods where three-way dominance is more probable than not — 57 such periods vs. none in any other block; at permissive threshold (N̄=2), 1980s lead (315), then 2014–2025 (217), then 2002–2013 (194); 1990–2001 has E[N_t]=0.42/0.02 — upper tail unoccupied for 12 years.
- Persistence (Table 6): 2002–2013 stands alone on sustained three-way dominance; 2014–2025 below even the 1980s. Strongest decade vs. strongest disjoint decade (Table 8): 2010–2019 (strict: mean P(N_t≥3)=0.246, 57 periods ≥0.5, π_52=0.29) vs. 1978–1987 (0.125, 0 periods, 0.12); permissive 0.911 vs. 0.708. In 2010–2019, three players held top-three positions in 99/92/80% of weeks (Djokovic/Federer/Nadal); in 1978–1987 four players shared (McEnroe 84%, Connors 67%, Lendl 65%, Borg 43%).
- Sojourn above threshold (N̄=2, Table 7, weekly periods): Federer 612 (526,714), Djokovic 578 (457,657), Nadal 510 (396,598), Lendl 408 (358,448), McEnroe 365 (298,439), Connors 305 (215,369), Murray 215 (118,302), Borg 205 (148,295), Becker 116 (25,206), Sampras 113 (14,209).
- Cross-surface (Table 9/10): upper-tail dependence χ = 0.60 (hard–clay), 0.65 (hard–grass), 0.50→0.40 (clay–grass, most demanding); 8 players extreme on all three surfaces at q=0.90 (vs. 0.20 under independence), 4 at q=0.95 (vs. 0.02); P(extreme on all three) > 0.5 only for Djokovic (1.00), Federer (1.00), Nadal (0.97), Murray (0.91) — no predecessor above 0.12.

## 8. Code / data availability
Full replication code + data at https://github.com/manueleleonelli/Tennis_Extremes (public GitHub).

## 9. Leakage & limitations
- Absolute strength is not comparable across periods (reference-level assumption); the paper compares gaps, not levels — "whether Borg at his peak would have beaten Djokovic at his is not a question the match record settles."
- All exceedance functionals depend on estimated latent strengths; fixed-window summaries chosen precisely because run-based ones are non-robust under estimation error (Table 1).
- Overconfidence required Platt correction (slope 0.851); ranking-invariant but units change.
- 1990–2001 upper-tail compression is identified descriptively; its cause (ATP Tour restructure, depth increase) is not modeled.
- Surface analysis drops carpet; pre-1978 window excluded due to unstable reference level.
- Supplementary sections (S1–S4) not in the main extract; appendices B/C reference supplementary update equations.

## 10. GSE overlap
- Complementary, not duplicate. BT rating models are inventoried in GSE's research corpus, but the existing-research map shows GSE's team ratings are static/eval-style (Elo benchmarks, rolling EPA); no Bayesian dynamic BT state-space model with weekly random-walk innovations, multi-component strength vectors (cf. surface vector → offense/defense/pass/run splits), cross-component correlation ρ, and Platt-calibrated recalibration is in the corpus. The paper also anticipates the GSE-era-comparison problem (cross-season team-strength normalization) with the rate-calibrated-threshold device and the fixed-window-vs-run-length robustness result — directly usable in any GSE "best team of the decade" or dynasty analysis. Rated ADAPT.

## 11. GSE implementation spec
- Build a dynamic NFL team-strength module: (a) weekly BT state-space model on game outcomes (point-differential or win/loss) with random-walk dynamics θ_{i,t} = θ_{i,t−1} + w, w ∼ N(0, τ²Σ); multi-component strength vectors (offense/defense, or pass/run) with estimated exchangeable correlation ρ analogous to the surface vector; home-field and format/discrimination parameters analogous to a_f (e.g., playoff vs. regular-season discrimination). (b) Filtering via the paper's Glickman-style mean-field + iterated Laplace updates (iterate Fisher scoring to convergence within a week, since teams play once/week — the single-step Glicko approximation is adequate per-week but the iterated version guards against multi-game windows); trajectory sampling via Carter–Kohn for functionals. (c) Platt logit-scale recalibration of derived win probabilities on odd/even seasons (paper's exact protocol: fit on odd-numbered years, evaluate on even). (d) For dynasty/era summaries: report rate-calibrated exceedance counts and lag/block persistence profiles over fixed windows — never longest-run statistics — per §3.4.

## 12. Reproducible test
- Implement the dynamic BT on nflverse 2000–2025 (weekly aggregation, ~17 periods/season): fit ψ by marginal-likelihood grid search; check predictive accuracy ≥ published BT/Elo baselines and Brier improvement after Platt recalibration (paper's tennis values: accuracy 0.675, Brier 0.207 pre-calibration, reliability flat to 0.006 post); verify the iterated-update filter recovers known simulated strengths with lag-persistence ratios within 5% of unity (§3.4 protocol: 25 simulated records, report mean ± s.d. of estimate/true); verify ρ (component correlation) is identified by prequential log-likelihood vs. ρ=0 (paper: +1,365 units on 143k matches). Pass/fail against these numeric checks.

## 13. Acceptance / rejection gate
- Accept the module if on 2000–2025 NFL: (i) out-of-sample (even seasons) Brier ≤ static BT/Elo baseline after Platt calibration; (ii) calibration slope within [0.9, 1.1] post-fit (no systematic overconfidence); (iii) component correlation ρ̂ significantly > 0 by prequential likelihood; (iv) dynasty summaries use fixed-window functionals only. Reject the dynamical component if τ̂ is unidentified (flat prequential likelihood) or if the iterated filter underperforms single-step on simulated recovery.

## 14. Improvement experiment
- Replace the exchangeable R(ρ) with a structured correlation (e.g., offense–defense correlation free, special-teams separate); add rest/prep-time and travel covariates in the link a_f-style discrimination (rested teams' strength translates more into win probability); test whether rate-calibrated exceedance counts on NFL (N̄=1,2) identify a "compressed upper tail" era analogous to 1990–2001 tennis (candidate: the 2017–2020 parity window), and whether cross-component upper-tail dependence (Ledford–Tawn χ, η) flags rare teams simultaneously elite on offense and defense — a directly actionable "complete-team" prior for futures pricing.
