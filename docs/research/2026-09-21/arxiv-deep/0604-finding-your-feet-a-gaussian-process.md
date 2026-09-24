# [0604] Finding your feet: A Gaussian process model for estimating the abilities of batsmen in Test cricket (arXiv:1908.11490v2)

**Citation:** Stevenson, O.G., Brewer, B.J. (2020). *Finding your feet: A Gaussian process model for estimating the abilities of batsmen in Test cricket*. arXiv:1908.11490v2. URL: https://arxiv.org/abs/1908.11490v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3336 lines).
**Verdict:** ADAPT — port the powered-exponential Gaussian-process career-trajectory framework to NFL player aging/form curves for season-long props (with opposition adjustment added); the cricket specifics (hazard/eye-in, not-out censoring) do not transfer.

## 1. Research question
Can a Bayesian model quantify how a cricketer's batting ability varies both within an innings ("getting your eye in") and between innings over an entire career (form, age, experience), in intuitive batting-average units — beating both the career batting average and the opaque ICC ratings? The paper fits a Gaussian process over career-innings time to a hazard-based scoring model, yielding per-innings ability estimates ν(t) with credible intervals, career-low/high quantification, next-innings predictions, and principled player comparisons (e.g., P(Smith outscores Williamson) = 56.5%).

## 2. Dataset / schema
- Test-match career scores of all 1,018 players from 12 countries who batted in a Test innings in the 21st century: 40,273 innings total, from Statsguru (ESPNcricinfo). Each innings: runs scored, out/not-out flag, venue (home/neutral/away), team innings number (1st/2nd).
- Empirical regularities: batting averages ~17% higher at home than away; ~20% higher in team's first innings than second.
- No train/test split; predictive assessment via leave-one-out CV on each player's most recent *out* innings (913 players computable); model comparison via nested-sampling marginal likelihoods.
- Interactive career trajectories for all 1,018 players: http://oliverstevenson.co.nz/cricket-visualisation/.

## 3. Method / model
- **Likelihood:** hazard H(x) = P(X=x|X≥x) (eq. 1); not-out scores treated as right-censored, likelihood P(X≥x) (eqs. 2–3).
- **Effective average:** H(x) = 1/(μ(x)+1) (eq. 4); μ(x) = μ₂ + (μ₁−μ₂)exp(−x/L) (eq. 5): μ₁ = initial ability, μ₂ = "eye-in" equilibrium ability, L = e-folding transition time.
- **Between-innings:** μ(x,t) = μ_{2t} + (μ₁−μ_{2t})exp(−x/L) (eq. 6), with per-innings skill-ceiling μ_{2t}; μ₁, L held constant across career (computational parsimony; getting-eye-in is style-driven).
- **GP prior:** log{μ_{2t}} ~ GP(λ, K), K(tⱼ,t_k) = σ²exp(−|j−k|^α/ℓ^α), α ∈ [1,2] (eq. 7) — powered exponential: α→2 = squared-exponential (too smooth, rejected), α→1 = Ornstein–Uhlenbeck/AR(1) (Matérn). ν(t) = E[score] in innings t, computed analytically.
- **Context effects:** μ(x,t) = [·] × ψ^{v_t} × φ^{i_t} (eq. 10); v_t ∈ {1,0,−1} home/neutral/away, i_t ∈ {1,−1} first/second innings; ψ>1 = home advantage, φ>1 = first-innings advantage.
- **Priors (Table 2):** C~Beta(1,2), μ₁←C·μ₂; D~Beta(1,5), L←D·μ₂ (forces {μ₁,L}<μ₂ — no getting worse as eye comes in); log λ~N(log 25, 0.75²); log σ~N(log 0.2, 1²) (median player varies ~20% around λ over career — the restrictive anti-overfit prior); log ℓ~N(log 20, 1²); α~U(1,2); log ψ, log φ ~ N(0, 0.25²).
- **Fitting:** C++ nested sampling (Skilling 2006), 1000 particles × 1000 MCMC steps per iteration; marginal likelihood Z free for Bayes-factor model comparison (eq. 12).
- **Hierarchical extension:** post-hoc hierarchical model on ψ, φ across players (μ_ψ, σ_ψ, μ_φ, σ_φ with Uniform(0.9,1.1)/Uniform(0.1,0.3) hyperpriors) confirming typical player is better at home and in first innings.

## 4. Equations & assumptions
Eqs. 1–12 as in §3. Assumes innings conditionally independent given the GP trajectory; not-out flags uninformative given scores; getting-eye-in rate constant across career; venue/innings effects multiplicative and player-constant; all runs equal (opposition strength NOT modeled — acknowledged); heavy-tailed score noise handled by the hazard likelihood.

## 5. Features / target
Inputs: per-innings (runs, out/not-out, venue, team-innings-number). Features: career-innings index t (GP time), score-within-innings x, venue/innings indicators. Target: ν(t) = expected runs in career innings t (ability in batting-average units), plus posterior distributions of career low/high points and their timing, and next-innings predictive distribution.

## 6. Validation design
- **LOOCV prediction:** leave out each player's most recent out innings; predict vs. observed; mean squared prediction error (Table 6) vs. SMA models of orders 10/25/50/100% (SMA(100%) = career average = constant-ability baseline).
- **Model comparison:** log Bayes factors GP vs. constant-ability model from nested-sampling evidence (Table 7), per-player and pooled.

## 7. Numerical results / baselines
- **GP wins LOOCV everywhere** (Table 6, MSE; no-minimum column): GP 544.0 vs. SMA(10%) 633.1, SMA(25%) 588.4, SMA(50%) 608.2, SMA(100%) 589.1 — and GP stays best at 10/20/50-inning minimums (649.6/616.8/785.8). Notably SMA(10%) is worst of all: "predicting a player's ability purely on recent scores is unwise."
- **Evidence:** average log Bayes factor 1.4 across all players (−152,071.8 vs −153,473.4); more innings → stronger GP preference. Top-10 individuals: Kohli 6.9, Williamson 6.3, Warner 6.0, Sharma 5.8, Azam 4.4, Smith 3.0, Agarwal 0.9, Root 0.4, Labuschagne 0.2, Mathews −3.1 (constant model wins for Mathews).
- **Williamson deep-dive (Table 3):** career avg 50.99; C=0.30, D=0.12, λ=56.6, σ=0.27, ℓ=36.7, α=1.50; ψ=1.11 (95% CI 0.93–1.32) → ψ²=1.25 (0.87–1.75) home-vs-away; φ=1.03 → φ²=1.07 (0.74–1.48) first-vs-second innings. Career low ν=34.2, high 73.6, next-innings prediction 47.1 (95% CI 25.3–72.0) (Table 4).
- **Form finding:** σ posterior shifted away from zero → long-term ability variation real; but ℓ and α posteriors barely move from priors — data cannot distinguish smooth vs. ragged short-term trajectories; recent-form effects weak, slow-moving, individual-specific. "Finding your feet" supported: most players' ability lowest early, peak after many innings (Fig. 9; Williamson's peak estimated after his 60th innings).
- **Rankings (Table 5, 1 Dec 2020):** GP top-20 broadly agrees with ICC (Smith 57.9 (47.9,68.8) #1 vs ICC 911 #1) but differs instructively: Rohit Sharma GP #8 vs ICC #16 (not-out-heavy career mishandled by ICC's flat bonus); Stokes GP #17 vs ICC #8 (ICC overweighting recent 10 innings at 58.0 avg vs career 37.8); Mathews/Chandimal victims of ICC inactivity decay.

## 8. Code / data availability
Data: Statsguru/ESPNcricinfo (public). Fitting code: C++ nested sampling, not released; trajectories app at oliverstevenson.co.nz. Model is fully specified — reimplementable (e.g., in Stan/PyMC with GP).

## 9. Leakage & limitations
- **Cricket-specific likelihood doesn't transfer:** hazard/eye-in, not-out right-censoring, geometric-ish score distributions have no NFL analog; only the GP-over-career-time skeleton ports.
- **Opposition strength ignored** (acknowledged as next step) — in NFL, opponent quality dominates per-game variance; a port without opponent adjustment would misattribute defensive matchups to player form.
- **NFL careers are shorter and noisier:** ~100–200 games vs. hundreds of innings; per-game EPA/targets far noisier than runs; the informative σ-prior trick (20% career variation) needs NFL re-derivation, and ℓ/α may be unidentifiable with NFL sample sizes (they already were barely identified in cricket).
- **No within-game structure:** NFL's analog of "eye-in" would be within-game warm-up — no evidence exists; don't force it.
- **Computational cost:** nested sampling over hundreds of per-career points per player × hundreds of players is heavy; a port needs sparse/approximate GP or amortized inference.

## 10. GSE overlap
**Extension.** The existing-research map shows GSE has aging curves and form-related content but (from the map) no Bayesian career-trajectory model with quantified uncertainty in natural performance units. The transferable core: **powered-exponential GP over career-game index to estimate a player's current underlying ability with credible intervals, separating slow career drift (age/experience) from game noise** — directly applicable to QB EPA/play, WR YPRR, RB success rate trajectories for season-long props and "is he washed or just unlucky?" content. This complements 0602's allocation framework (which is cross-sectional within a team) with a longitudinal within-player model. Lane: season-long props + player-ratings content.

## 11. GSE implementation spec
- **NFL player career GP:** for each skill player (min ~30 career games), model per-game performance (EPA/play for QBs; EPA/target or YPRR for receivers; success rate for RBs) as y_t = ν(t)·(opponent adjustment)·(home/away, dome/outdoor multipliers) + noise, with log ν(t) ~ GP(λ, σ²exp(−|j−k|^α/ℓ^α)) — porting eqs. 7 & 10 with ψ/φ-style multiplicative context effects and adding the paper's missing piece: opponent defensive strength per game.
- **Use:** (1) current-ability estimate ν(now) with credible intervals as the baseline for season-long player props (replacing raw trailing averages — the paper's SMA(10%)-is-worst finding directly indicts "last-5-games" props handicapping); (2) "finding your feet" analysis for rookies/second-year players — expected breakout timing; (3) decline detection: P(ν(t) < replacement) as a "washed" probability for content.
- **Pragmatics:** start with an empirical-Bayes/approximate GP (e.g., Hilbert-space approximate GP in Stan, or per-player Laplace approximation) rather than nested sampling; share ℓ/α hierarchically across players by position to fix the identifiability problem the paper hit. Effort: ~1 week prototype on QB EPA/play.

## 12. Reproducible test
Dataset: nflverse 2015–2025. Fit career GPs (position-pooled ℓ/α, opponent-adjusted) on games through week k each season; predict per-game EPA/play (or EPA/target) for weeks k+1..end; metric: out-of-sample MSE vs. (a) trailing-5-game average (the SMA analog), (b) career average, (c) a simple exponential moving average. Success: GP beats all three on pooled MSE across QBs/WRs with ≥30 games, mirroring Table 6. Secondary: calibration of 68%/95% credible intervals for ν(t).

## 13. Acceptance / rejection gate
ADAPT into the season-long props pipeline if the GP beats the best SMA baseline by ≥5% pooled out-of-sample MSE on 2023–2025 holdout AND 68% intervals achieve 60–76% empirical coverage (honest uncertainty — the paper's headline advantage over ICC). If MSE gains are <5% or intervals miscalibrate badly, REJECT as engine input; the rookie "finding your feet" analysis may survive as a one-off content piece regardless.

## 14. Improvement experiment
Add the paper's acknowledged missing variable as the differentiator: joint player–opponent GP — model game outcome as ν_player(t)·δ_opponent(g) with a second GP (or Elo-style rater, cf. 0603) over each defense's ability trajectory, fit jointly. Test whether joint fitting beats the paper's player-only GP on the LOOCV-MSE protocol. Hypothesis: in NFL (unlike cricket) opponent adjustment is first-order — the joint model should beat player-only GP by a larger margin than GP beat SMA(100%) — and it yields a defensive-trajectory product ("which defenses are improving?") as a free second output for matchup content.
