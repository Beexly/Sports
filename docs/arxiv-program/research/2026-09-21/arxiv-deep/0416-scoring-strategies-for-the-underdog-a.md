# [0416] Scoring Strategies for the Underdog: A general, quantitative method for determining optimal sports strategies (arXiv:1111.0693v1)

**Citation:** Brian Skinner (2011). *Scoring Strategies for the Underdog: A general, quantitative method for determining optimal sports strategies*. arXiv:1111.0693v1. URL: https://arxiv.org/abs/1111.0693v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1500 lines).
**Verdict:** ADAPT — port the mean–variance "CLT Rule" (underdogs should increase variance, favorites decrease it) as a variance-tilt overlay on GSE's 4th-down/go-for-it recommendations, but replace the paper's toy Bernoulli play models with empirical state-conditioned drive distributions from nflverse.

## 1. Research question
What is the general quantitative rule for optimal strategy selection in sports — specifically, when should a team choose high-risk/high-reward plays over safe plays — and how does the answer depend on whether the team is the underdog or the favorite?

## 2. Dataset / schema
No empirical dataset. The paper is theoretical/analytical with worked toy examples: (a) basketball — choosing between 2-point (p_2=0.5) and 3-point (p_3=0.3) shots against an opponent shooting p_{opp}=0.55 on 2-pointers; (b) football — choosing among a 3-yard run (p=0.9), 10-yard pass (p=0.25), and 50-yard "Hail Mary" pass (p=0.02); (c) a "skill curve" example where success probability declines with usage rate.

## 3. Method / model
- Each play type i has point value v_i, usage count N_i, success probability p_i. Total score mean μ = Σ_i v_i N_i p_i and variance σ² = Σ_i v_i² N_i p_i(1−p_i).
- By the central limit theorem, win probability P ≃ ½[1 + erf(Z/√2)] with Z = (μ − μ_opp)/√(σ² + σ_opp²).
- The "CLT Rule": when choosing between strategies, evaluate Z — an underdog (μ < μ_opp) gains by increasing σ² (more variance), a favorite gains by decreasing it. Optimal usage solves dP/dN_i = 0.
- Exact binomial score distributions are derived in Appendix A for small N; the paper states exact optimization is feasible in real time for roughly N < 100 plays and M < 5 play types.
- Skill-curve extension: p_i(N_i) = α_i − β_i N_i/N (success rate declines as a play is overused); optimal mix then interior rather than all-or-nothing.

## 4. Equations & assumptions
- Mean: μ = Σ_i v_i N_i p_i. Variance: σ² = Σ_i v_i² N_i p_i(1−p_i).
- Win probability: P ≃ (1/2)[1 + erf(Z/√2)], Z = (μ − μ_opp)/√(σ² + σ_opp²).
- Strategy-switch boundary (basketball example): s_{2/3} = 0.39N.
- Skill curve: p_i(N_i) = α_i − β_i N_i/N; example optimum N_3/N ≈ 0.208.
- Assumptions: (a) plays are independent and identically distributed Bernoulli trials; (b) success probabilities are fixed (or follow the stipulated skill curve) and known; (c) CLT applies (large N); (d) the opponent's strategy is fixed; (e) no game-state dynamics — no downs, field position, clock, turnovers, or defensive adaptation.

## 5. Features / target
- Inputs: play menu (v_i, p_i), total plays N, opponent (μ_opp, σ²_opp).
- Target: the usage allocation {N_i} maximizing win probability P.

## 6. Validation design
- No empirical validation. Validation is analytical: the CLT approximation is checked against the exact binomial distributions of Appendix A on the toy examples.

## 7. Numerical results / baselines
- Basketball example (p_2=0.5, p_3=0.3, opponent p_2=0.55): optimal strategy switches at s_{2/3} = 0.39N (paper's boundary — the mix of 2s vs 3s depends on deficit relative to total possessions).
- Football toy (run 3 yds p=0.9; short pass 10 yds p=0.25; Hail Mary 50 yds p=0.02): optimal — run when yardage needed y < 2.8N; Hail Mary when y > 4.9N; short pass in between (2.8N < y < 4.9N). Dashed CLT-rule predictions match the exact binomial optimum in the paper's Figure 4.
- Skill-curve example: optimal three-point share N_3/N ≈ 0.208.
- Computational claim: exact binomial optimization feasible in real time for N < 100, M < 5.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- The football example is a toy that ignores downs, field position, turnovers, clock, and defensive adaptation — a 3-yard run with p=0.9 is not a real football play, and treating yardage as fixed Bernoulli rewards is not a real football model. Nothing in the paper is calibrated to real data.
- Fixed, known p_i is the load-bearing assumption; in reality success rates are uncertain, opponent-dependent, and usage-dependent (the skill-curve section admits this but the main results don't use it).
- The opponent is modeled as fixed — no game-theoretic response (if the underdog goes high-variance, the favorite adjusts).
- CLT approximation degrades exactly when it matters most: small N (end of game), where the paper falls back on exact binomials that don't scale.
- External validity to NFL: the CLT Rule itself is sound decision theory and ports well; the play models do not — they must be replaced with empirical drive/play distributions.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's corpus already includes NFL decision/4th-down work and win-probability machinery — so go-for-it analysis is **duplicate** territory. The **extension** is the paper's variance-targeting lens: existing 4th-down work maximizes expected win probability under fixed play distributions, while the CLT Rule says underdogs should *deliberately choose higher-variance play mixes* (and favorites the reverse) — a systematic overlay the map does not list.

## 11. GSE implementation spec
- Data: nflverse play-by-play 2015–2025; precompute empirical play-outcome distributions (yards, turnover, score) conditioned on (down, distance, field position, score differential, time remaining) — replacing the paper's Bernoulli toys.
- Model: for each 4th-down / late-game decision state, compute the win-probability-optimal action under the empirical distributions, then apply the CLT Rule as a variance tilt: when GSE's win probability < 35% (underdog), upweight actions with higher outcome variance among near-optimal choices; when > 65%, downweight them.
- Training: none (analytical overlay); the empirical distributions are the estimated component, fit on 2015–2023, frozen for 2024–2025 evaluation.
- Serving: integrate as a recommendation flag in GSE's game-management content ("variance-seeking spot for the underdog").
- Estimated effort: 1 week for a single engineer.

## 12. Reproducible test
- Dataset: all 4th-down decisions in 2024–2025 NFL regular seasons (nflverse), restricted to games where pre-play win probability was <35% (underdog spots, roughly spread ≥ +7 territory).
- Procedure: backtest — compare GSE's baseline go-for-it recommendation vs the CLT-tilted recommendation; score each by the actual model's win-probability-added of the recommended action.
- Metric: mean win-probability-added per underdog decision; baseline to beat: the un-tilted recommendation.

## 13. Acceptance / rejection gate
ADOPT the CLT variance tilt for underdog game-management content IF the backtest shows ≥ 0.5 percentage points of additional win probability per game attributable to tilted recommendations in underdog spots across 2024–2025, with no degradation in favorite spots; otherwise REJECT as theoretically neat but empirically empty. Gate fixed before running.

## 14. Improvement experiment
Replace the static empirical distributions with a dynamic-programming game solver where the opponent *responds* to the variance tilt (e.g., a favorite facing a variance-seeking underdog plays more conservatively) — the paper's fixed-opponent assumption is its weakest game-theoretic link. Test whether the equilibrium strategy differs materially from the one-sided CLT Rule in late-game states; if it does, GSE's overlay should use the equilibrium, not the naive rule.
