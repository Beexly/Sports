# [2147] Automatic Risk Adaptation in Distributional RL (arXiv:2106.06317)

**Citation:** Frederik Schubert, Theresa Eimer, Bodo Rosenhahn, Marius Lindauer (2021). *Automatic Risk Adaptation in Distributional Reinforcement Learning*. arXiv:2106.06317. URL: https://arxiv.org/abs/2106.06317
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `uncertainty_decision_theory`.
**Verdict:** ADAPT

*GSE relevance:* ARA shows that a *static* CVaR risk level is provably suboptimal under changing conditions, and gives a cheap, uncertainty-driven way to adapt the risk level per state. This maps directly onto GSE's need to dial risk-sensitivity per game context (novel situations → conservative; well-understood situations → full aggression), eliminating the hand-tuned global risk knob.

## 1. Research question
In distributional RL, risk-sensitivity is controlled by distorting the learned return quantile function — but the distortion's risk level α must be chosen by hand, and a single static α is suboptimal when conditions change. Can the risk level be adapted automatically, per state/step, from the agent's own parametric uncertainty — being cautious in unfamiliar states and confident in familiar ones?

## 2. Dataset / schema
- Windy GridWorld LavaGap (tabular, 50-atom categorical value distribution; failure = falling in lava), wind direction/strength varied.
- AntBulletEnv-v0 and HopperBulletEnv-v0 (PyBullet): foot friction and torso mass randomized ±20% per episode ("DynamicAnt", "DynamicHopper"); reward = forward motion − movement cost − collision; falling = failure.
- BipedalWalkerHardcore-v3: variable terrain, reward = distance (≤300), falling = −100 and counts as failure.
- All runs: 5 random seeds, evaluation every 10,000 steps over 50 episodes (mean ± standard error). Hyperparameters in Appendix A.

## 3. Method / model
- **Background:** QR-DQN-style quantile regression learns Z_τ(s,a), the inverse CDF of returns; Q(s,a)=E_{τ∼U(0,1)}[Z_τ(s,a)] (1). Distortion β:[0,1]→[0,1] reweights quantiles: Q_β(s,a)=E_τ[Z_{β(τ)}(s,a)] (2). CVaR distortion: β_CVaR(τ;α)=τ·α (3) — keeps only the worst-α fraction of quantiles.
- **ARA (Automatic Risk Adaptation):** estimate state novelty with Random Network Distillation (Burda et al. 2019): frozen random target f, trained predictor g, uncertainty u(s)=‖f(s)−g(s)‖² (4), normalized by a running average. Map uncertainty to risk level via ψ(u)=e^{−u} ∈ (0,1], then use the ARA distortion β_ARA(τ)=β_CVaR(τ; ψ(u)) (5) in both action selection and policy-gradient updates of DSAC (Ma et al. 2020). High-novelty states → ψ(u)→0 → aggressive CVaR conservatism; familiar states → ψ(u)→1 → risk-neutral.
- **Intuition validated:** failure states are visited rarely (penalized), so RND error is systematically higher near them — uncertainty is a proxy for danger with no domain knowledge.
- **Cost:** no extra episode evaluations (unlike Choi et al. 2021's risk-conditioned policy); only one extra RND network pair; independent of state/action-space size; applicable to any quantile-based DistRL (e.g., IQN).

## 4. Equations & assumptions
- Q(s,a)=E_{τ∼U(0,1)}[Z_τ(s,a)] (1); Q_β(s,a)=E_τ[Z_{β(τ)}(s,a)] (2); β_CVaR(τ;α)=τ·α (3).
- u(s)=‖f(s)−g(s)‖² (4), RND prediction error, running-average normalized.
- β_ARA(τ)=β_CVaR(τ; ψ(u)), ψ(u)=e^{−u} (5).
- Assumptions: distributional (quantile) value representation; failure states carry negative reward so they are under-visited (needed for the uncertainty↔risk link); RND architecture (Burda et al. 2019 default) as a new hyperparameter; discrete action selection via distorted argmax.

## 5. Features / target
State observations (robot sensors/joint states; grid position in toy env). Target: risk-distorted action selection maximizing return while minimizing failures.

## 6. Validation design
- Baselines: neutral DSAC (no distortion), DSAC + static CVaR at α∈{0.25, 0.5, 0.75} (0.25 is the field-standard conservative choice).
- Static-α suboptimality demo: tabular optimal value function under light-south wind, evaluated under 4 wind settings — best α wanders (0.4→0.5→0.1→0.9), no predictable pattern.
- 5 seeds each; figures report mean ± SE; failure-rate metric alongside return.

## 7. Numerical results / baselines
- **DynamicAnt:** ARA final return ≥14% better than neutral DSAC *and* every static-CVaR agent; α=0.75 reaches only ~60% of ARA's performance; ARA also reduces Q-value estimation error fastest after ~600k steps.
- **DynamicHopper:** ARA ≈ neutral/α=0.5/0.75 final return but reaches it as fast as the best static agent and ~3× faster than neutral; average risk parameter ends 10% higher (less risky) than Ant — the agent correctly senses Hopper is the easier task.
- **BipedalWalkerHardcore:** all methods close on return (static α=0.5/0.75 beat ARA slightly), but ARA has the lowest failure rate at *every* point of training — 4× lower than neutral, 7× lower than static risk-aware agents by end of training. Average α dips early (novel states) then rises as competence grows.
- **Windy GridWorld:** best-vs-worst static α gap widens from 0% (train setting) to 10% under unseen wind directions — static choice matters most exactly where you can't tune it.

## 8. Code / data availability
Code "in the supplementary, will be made public upon acceptance" — not verifiable from the paper; environments are standard (Gym/PyBullet).

## 9. Leakage & limitations
- Locomotion domains only; no evidence the uncertainty↔risk mapping transfers to domains where failures are *not* rare (if failures are common, RND error is low near them and the proxy inverts).
- Conservative-by-default can stall exploration: in fixed-dynamics Ant, bad seeds stayed conservative and never learned to walk (Fig. 8) — ARA does not fix the exploration/exploitation tension, it just moves it.
- RND architecture is a new hyperparameter; authors report robustness but only within their domains.
- ψ(u)=e^{−u} mapping explored in Appendix C — the exponential is a choice, not derived; miscalibrated ψ could over/under-conservatize.
- Return and failure rate decoupled in BipedalWalker — ARA wins on safety but concedes a little return; the tradeoff knob is now ψ, not α.
- Code not actually available — reimplementation from the paper's description is required.

## 10. GSE overlap
Existing-research map: nothing on *adaptive* risk levels — all read papers so far use fixed τ/α or a hand schedule. GSE's engine currently faces the same static-risk-level problem: one global confidence/stake posture across all games. But games differ enormously in novelty: new head coach, rookie QB starting, extreme weather, divisional rematch vs. well-understood matchup. This is the first paper in the lane to (a) prove static risk levels fail exactly under distribution shift, and (b) give a zero-domain-knowledge mechanism to adapt. It composes with 2142 (AC-RAC's fixed risk-aversion → make it ARA-adaptive), 2144 (ρ knob → schedule ρ by novelty), 2145 (CVaR_α in the seasonal objective → per-game α).

## 11. GSE implementation spec
- **Novelty signal:** train a lightweight RND pair on the engine's game-feature vectors (spread, total, team ratings, injuries, weather flags, rest days) over historical seasons; per-game u(game) = normalized prediction error. High u = "game unlike anything the engine was calibrated on."
- **Decision rule:** engine already produces an outcome distribution (or quantiles). Apply CVaR distortion with α = ψ(u) = e^{−u}: post/stake decisions computed on the distorted distribution. Familiar divisional game (u≈0) → α≈1, full aggression; unprecedented situation (u large) → α→0, conservative (pass or quarter-stake).
- **Where it slots in:** wraps 2142's AC-RAC action selection and 2144's risk-sensitive Kelly: both take a risk level as input — ARA supplies it per game instead of a global constant.
- **Serving:** precompute u(game) when the weekly slate is finalized; one forward pass of two small MLPs per game; log α alongside each pick as the audit trail.
- **Effort:** ~1–2 weeks (feature pipeline + RND pair + distortion wrapper on existing engine quantiles).

## 12. Reproducible test
Dataset: engine predictions DB + realized outcomes, 2022–2025. Compute u(game) from an RND pair trained only on data available before each season (walk-forward). Two policies: (A) fixed-α CVaR pick/stake rule (α=0.25, 0.5, 0.75); (B) ARA α=e^{−u}. Metrics: season profit, Sharpe, Calmar, and "failure rate" analog = fraction of weeks with loss > 3 units. Also stratify by u-decile to verify ARA is actually more conservative on high-novelty games.

## 13. Acceptance / rejection gate
**ACCEPT if walk-forward:** policy B's worst-week loss (5th percentile of weekly P&L) is ≥25% smaller (less negative) than the best fixed-α policy's, AND season profit ≥ 0.95 × best fixed-α season profit (safety may cost ≤5% of profit), AND the u-decile stratification shows monotonically decreasing stake with increasing u (the mechanism is working, not noise). **REJECT if** B's profit < 0.9 × best fixed-α or the novelty signal shows no monotonic relationship with realized upset rate (then RND novelty ≠ risk in sports, and the paper's core proxy fails here).

## 14. Improvement experiment
Beyond the paper: learn ψ instead of fixing e^{−u} — fit a monotone map from u to α by maximizing realized CVaR of weekly profit on a validation season (isotonic regression on u-deciles), testing whether the exponential is leaving money on the table. Second axis: replace raw RND on features with RND on the *engine's residual stream* (prediction errors) so novelty is measured in "ways the engine is wrong," which is the quantity that actually causes tail losses.

