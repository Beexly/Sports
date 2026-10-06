# [1545] Markov Decision Processes with Dynamic Transition Probabilities: An Analysis of Shooting Strategies in Basketball (arXiv:1812.05170)

**Citation:** Nathan Sandholtz, Luke Bornn (2018). *Markov Decision Processes with Dynamic Transition Probabilities: An Analysis of Shooting Strategies in Basketball*. arXiv:1812.05170. URL: https://arxiv.org/abs/1812.05170
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the Bayesian hierarchical machinery (multi-level shrinkage, AR(1) temporal covariance, posterior-draw simulation) ports directly to NFL player/team parameter estimation; replaces REJECTED 2206.13246 (ledger 1534).

## 1. Research question
Can basketball plays be modeled as episodes of team-specific non-stationary Markov decision processes with shot-clock-dependent transition probabilities, estimated via Bayesian hierarchical models, and then used to simulate counterfactual seasons under altered shot/passing policies with full uncertainty propagation — e.g., "what if the Cavaliers took contested mid-range shots less frequently early in the shot clock?"

## 2. Dataset / schema
STATS LLC high-resolution optical tracking data, 2015–16 NBA regular season: x,y coordinates of all 10 players + x,y,z ball coordinates at 25 Hz, annotated with ball events (dribbles, passes, rebounds, turnovers, shots). Subset to tagged ball events. After removing plays ending in fouls/timeouts/jump balls/backcourt: 155,656 plays (~1.93 million observations) for fitting; ~28,000 held-out plays for validation. Companion repo: https://github.com/nsandholtz/nba_replay (one game of STATS data + walkthrough). Tracking data proprietary (STATS LLC).

## 3. Method / model
Plays = episodes of a finite MDP ⟨S, A, P(·), R(·)⟩ with binary actions {Shoot, Not Shoot}. State = ballcarrier × 6 court regions (rim/paint/mid-range/corner-3/arc-3/backcourt) × defensive pressure (open/contested) — ~180 states/team. Non-stationarity handled by transition probability tensors (TPTs): n_TPT = 8 slices, each a transition matrix for a 3-second shot-clock interval (T(c_n) maps clock time to slice 1–8). Novel "average chain" theorem: 500+ lineup-specific chains combined into one team-average chain whose expected transition count per state-pair equals the weighted sum of the chains' expected counts (derivation via canonical Q/U absorbing-chain form). Each MDP component (policy π, transitions P, reward R) estimated with Bayesian hierarchical models in Stan (2 chains, R̂ < 1.05, ESS 48–15,000). Simulator (Algorithm 1): draws posterior samples θ̃, λ̃, μ̃, ξ̃ per simulated season, steps through states with empirical inter-event time-lapse distribution L(t_n); shot-clock expiry → turnover. Policy alterations implemented as perturbations of posterior policy draws (Eq. 5.1), capped at 0.9.

## 4. Equations & assumptions
- MDP: P(s,a,s′) = P[S_{n+1}=s′|S_n=s,A_n=a] (2.1); R(s,a) = E[R_{n+1}|S_n=s,A_n=a] (2.2); π(s,a) = P[A_n=a|S_n=s] (2.3).
- State space: S^team = S^player × S^region × S^defense (2.4).
- TPT slicing: T(c_n) = 1 if c_n ∈ (0,3], …, 8 if c_n ∈ (21,24] (2.10); n_TPT = 8 chosen because each extra slice adds ~1M parameters.
- Shot policy: π(s,a) = P(A_n='Shoot'|s^{(x,y,z)}_n, t_n, θ) = expit(θ^{(x,y,z)}_{t_n}) (3.1); θ is |S^team|×8 (180×8 per team).
- Policy hierarchy (3.2–3.4): θ^{(x,y,z)} ~ N_8(β^{(G(x),y,z)}, Σ_θ); β^{(g,y,z)} ~ N_8(γ^{(y,z)}, Σ_β); γ^{(y,z)} ~ N_8(0, Σ_γ); G(x) = position group. Each Σ is AR(1) with (ρ_θ,ρ_β,ρ_γ; σ²_θ,σ²_β,σ²_γ); σ_θ,σ_β,σ_γ ~ half-Cauchy(0,2.5) (90% mass in (0,15.78)); ρ_θ,ρ_β,ρ_γ ~ Uniform[0,1).
- Transitions: P(s,a,s′) = exp(λ^{((x,y,z),(x′,y′,z′))}_{t_n}) / Σ_{i,j,k} exp(λ^{((x,y,z),(i,j,k))}_{t_n}) (3.5); λ array is |S^team|×(|S^team|+1)×8 = 180×181×8 = ≥260,640 params/team; hierarchy λ ~ N_8(ζ^{(position)}, Σ_λ), ζ ~ N_8(ω^{(region/defense)}, Σ_ζ), ω ~ N_8(0, Σ_ω) (3.6–3.8); two-stage fitting (per-team, borrowing from position/location levels) due to ~10M league-wide parameters.
- Make probability: Make(s) = expit(μ^{(x,y)} + I(z_n='Open')·ξ^{(y)}) (3.9); R(s,a) = 3·Make(s) or 2·Make(s) if shot, else 0 (3.10).
- Reward hierarchy (3.11–3.14): μ^{(x,y)} ~ N(ψ^{(H(x),y)}, σ²_μ); ψ^{(h,y)} ~ N(φ^y, σ²_ψ); φ^y ~ N(0, σ²_φ); ξ^y ~ half-normal(0, σ²_ξ); σ_μ,σ_ψ,σ_φ,σ_ξ ~ half-Cauchy(0,2.5). Player groups h = 18 clusters from k-means on shot volume × shot-region propensity (Ward-linkage init), not naive positions.
- Policy perturbation: θ̃^{(x,y,z)alt}_{t_n} = 1.1·θ̃^{(x,y,z)}_{t_n} (10% increase example), capped at 0.9 (5.1).
Assumptions: P, R, π invariant to lineup (average-chain approximation); plays independent (incl. shot-make independence — flagged as debated); fouls/free throws omitted; defense not an adversarial agent (baked into P); number of plays and starting states fixed (no rebounding modeling); policy changes assumed small enough that usage-curve (Oliver skill-curve) effects don't bias results.

## 5. Features / target
Inputs: ballcarrier identity, court region (6), defensive pressure (open/contested via nearest-defender distance + region rules A.4), shot-clock interval (8 slices). Targets: per-step action (shoot/not: Bernoulli), next state (categorical over ~181 states + turnover), shot make (Bernoulli). Horizon: within-play event sequence; season-level aggregates via simulation (300 simulated seasons per policy).

## 6. Validation design
Out-of-sample log-likelihood on ~28,000 held-out plays for four nested model complexities (A empirical → B +location shrinkage → C +position shrinkage → D +player shrinkage) per MDP component; P(·) evaluated on Cavaliers TPT, π/R league-wide. Calibration: 300 on-policy simulated Cavaliers seasons vs observed transition counts over the shot clock (Figure 6). Counterfactual evaluation: 300 simulated seasons per altered policy, comparing EPPS (expected points per shot) and EPPP (expected points per play) distributions. No betting-market or win-probability baselines.

## 7. Numerical results / baselines
Out-of-sample log-likelihoods (Table 2, higher = better): π(·): A −36808 → B −25187 → C −24467 → D −21553; P(·): A −17299 → B −38702 → C −25099 → D −13478; R(·): A −5956 → B −4571 → C −4561 → D −4540. Player-specific shrinkage (D) best on all three components. Temporal autocorrelation estimate ρ̂_θ = 0.94 (strong smoothing of shot policies). Policy results (300 sims each, Cavaliers): Alteration 1 (cut contested mid-range 20% with >10s on clock) — no practical EPPS/EPPP change (only 7.5% of plays end in mid-range shots with >10s left). Alteration 2 (cut contested mid-range 70%, double 3PA rate): EPPS 1.038 → 1.089, EPPP 0.923 → 0.973. Alteration 3 (Irving→James passes −90%): Irving expected shots +18%, James −13%, negligible team production change. Alteration 4 (veterans→rookies ×3, rookies→veterans −75%): costs 0.02 EPPP. Raptors observational case: 2016-17 → 2017-18 3PAr 30.5% → 39.6% (+30%), 3P EPPS 1.10 → 1.08 (−2%), overall EPPS 1.10 → 1.14.

## 8. Code / data availability
Stan model scripts + walkthrough: https://github.com/nsandholtz/nba_replay. Tracking data: proprietary STATS LLC (one sample game included in repo).

## 9. Leakage & limitations
Adversarial notes: (1) Calibration check is in-sample-ish: the 300-season simulation uses observed starting states and shot-clock times from the same season the model was fit on; shrinkage-induced bias visible (aggregate counts biased low for common pairs, high for low-usage players) — authors argue this is proper regularization, validated by Table 2. (2) Defense non-adversarial: policy gains assume no defensive adaptation (authors' Raptors example suggests adaptation is partial, but it's observational). (3) Skill-curve/usage effects ignored — large policy changes would be biased. (4) Fouls, free throws, rebounding, and lineup effects excluded by construction (average-chain invariance assumption is strong: teammates don't affect a ballcarrier's transitions). (5) ~10M parameters fit via two-stage approximation — not fully Bayesian joint inference. (6) NBA-only, tracking-data-dependent; NFL analogue needs NGS tracking, which the map notes is partially available.

## 10. GSE overlap
Existing map: "Kalman filters, particle filters, dynamic Elo" listed as ML-brief topics (commissioned, results not in repo); 1701.05976 (state-space) absorbed; nothing in the corpus does Bayesian hierarchical MDP/TPT modeling or posterior-draw counterfactual simulation. GSE's engine is a game-outcome forecaster (v5.2.7); no play-simulation or policy-counterfactual capability exists. This is new capability, not duplication — the portable core is the hierarchical Bayesian estimation machinery (multi-level shrinkage, AR(1) temporal covariance, half-Cauchy scales) and the posterior-draw simulation discipline.

## 11. GSE implementation spec
1. Port the hierarchical shrinkage template to NFL player parameters: e.g., QB EPA/play or receiver separation with levels player → position group → global, AR(1) over weeks (mirrors their shot-clock AR(1)), half-Cauchy(0,2.5) scales, Stan or PyMC.
2. Build the NGS-based analogue of the TPT for situational football: state = (down, distance bucket, field zone, score differential bucket); transitions = play outcomes; policy = coach's play-call/go-for-it decision; reward = EPA. NGS tracking gives ballcarrier/defender geometry for the pressure analogue.
3. Counterfactual simulator: posterior draws → simulate seasons under altered 4th-down or pass-rate policies → EPPP-equivalent (expected points per drive) distributions, exactly as their Algorithm 1.
4. Effort: 2–3 weeks for a Stan prototype on one team-season of nflverse + NGS; the full TPT is heavier (their 260k params/team).

## 12. Reproducible test
Dataset: nflverse 2020–2025 + NGS tracking where available. Test A (estimation): hierarchical AR(1) model of QB EPA/play vs GSE's current point estimates — metric: out-of-sample log-likelihood on held-out 2025 games (their Table 2 protocol), requiring the hierarchical model to beat the empirical/no-shrinkage baseline. Test B (simulation): 4th-down go-for-it counterfactual on 2024 season — compare simulated EPD (expected points per drive) distributions under observed vs aggressive policies; sanity-gate against the published ngreenberg 4th-down estimates already in the repo (2026-09-20 full-tables).

## 13. Acceptance / rejection gate
ADOPT the hierarchical Bayesian estimation layer if, on 2025 held-out games, the multi-level AR(1) model improves out-of-sample log-likelihood over the no-shrinkage baseline by ≥2% AND posterior 95% intervals achieve nominal coverage on held-out EPA/play (calibration check); REJECT the full TPT play-simulator build if a one-team prototype exceeds 48 hours compute or fails the Table-2-style shrinkage-wins check. Simulator build proceeds only after the estimation gate passes.

## 14. Improvement experiment
Beyond the paper: replace their fixed 8-slice TPT with a Gaussian-process prior over the continuous temporal covariate (shot clock → game clock / score differential in NFL), letting the data choose the smoothness instead of hard 3-second bins; and make the defense adversarial via a two-player (offense/defense) policy pair, testing whether counterfactual gains survive defensive best-response — the paper's own flagged limitation.
