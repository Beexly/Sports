# [0398] A Markov process approach to untangling intention versus execution in tennis (arXiv:2110.01527v1)

**Citation:** Timothy C.Y. Chan, Douglas S. Fearing, Craig Fernandes, Stephanie Kovalchik (University of Toronto / Zelus Analytics, 2021). *A Markov process approach to untangling intention versus execution in tennis*. arXiv:2110.01527v1. URL: https://arxiv.org/abs/2110.01527v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2437 lines, incl. appendices; tail verified).
**Verdict:** ADAPT — a general MRP/MDP framework that treats execution error as a controllable lever, separating the value of *intention* (what action/shot/play to choose) from *execution* (how precisely it is carried out). Directly transferable to GSE's core question on any failed play: was it a bad call or bad execution? Pairs naturally with 0391 (generative execution-error modeling): 0391 estimates the execution distribution, this framework plugs it into a value function. Same first author as the "points gained in football" value-function paper (Chan et al. 2021, Oper. Res.) cited herein — the NFL analogue already exists in his line of work.

## 1. Research question
Sports value functions assume athletes execute prescribed optimal actions with fixed success probability. How does *execution error* — uncertainty in carrying out an intended action — change a player's value function and optimal strategy? The authors build MRP (policy evaluation) and MDP (policy optimization) models where execution error is an explicit, tunable parameter, and apply them to tennis: intention = court region aimed at; execution = realized landing location. (§1)

## 2. Dataset / schema
Simulated tennis shots from the VON CRAMM framework (Kovalchik et al. 2020): infinite Bayesian Gaussian mixture generative model for 3D ball + 2D player trajectories, fit by variational inference on 125,000 men's + 80,000 women's shots from past Australian Opens; shot outcomes (win/error/in-play) from hierarchical GAMs. "Hundreds of millions" of simulated shots; the numerical results use N=1000 simulated shots per state × ε=1…20 → over 75 million shots. Validation reference: Jeff Sackmann's point-by-point data (2017–2019 Australian Opens). Note: VON CRAMM generates each shot independently (points "stitched" via conditioning) and does not distinguish first/second serves.

## 3. Method / model
- **State (§4.1.1):** s = (σ_A, σ_B, ω): both players' locations + shot type (serve/serve-return/rally), from Player A's perspective at ball-strike moment; absorbing states W/L (win/lose the point). Court segmented into 84 cells (~2 m², 42/side); 42×42×3 = 5,292 → 3,600 transient states after pruning impossible/unlikely ones.
- **Actions/intentions (§4.1.2):** court regions to aim at: 6 serve intentions, 39 serve-return/rally intentions (Net, Sideline/Middle Deuce/Ad, Corner, Baseline…). Deterministic policy π: S→A; randomized policy = *intention distribution* f_s(a) = P(a|s), fit from VON CRAMM shots' landing-region proportions.
- **Execution distribution (§4.1.3):** per (s,a), bivariate Gaussian N(μ_{s,a}, εΣ_{s,a}); "perfect execution" (ε=1) = covariance scaled so 90% of mass lies within the intention; larger ε = more execution error. Transition probabilities P_ε(s′|s,a) built by Algorithm 1: draw intention ~ f_s, draw landing ~ N(μ,εΣ), generate A's shot via VON CRAMM conditioned on (s, landing), generate B's return, record s′. Intention distribution held fixed across ε (relaxation discussed, rejected as too costly).
- **Calibrating "average" (§4.1.3, App. A):** ε=13 best matches empirical shot-outcome probabilities (Table 1); B's error fixed at ε=13 (symmetric players).
- **MRP (§4.2.1, Eq. 1):** policy evaluation of the empirical intention policy π̂: V^π̂_ε(s) = Σ_a f_s(a) Σ_{s′} P_ε(s′|s,a)(r + V^π̂_ε(s′)).
- **MDP (§4.2.2, Eqs. 2–3):** optimal value/policy via Bellman optimality; authors show it is overly optimistic (exploits rarely-visited states + simulation sampling error).
- **n-greedy rollout (§4.2.2, Eqs. 4–7):** π^n_ε = n one-period greedy decisions then π̂ — realistic "choose k optimal shots" measure; V^π̂ ≤ V^{π^n_ε} ≤ V* (Theorem 1: V^π_ε(s) = P(win the point | s, π, ε)).

## 4. Equations & assumptions
- MRP: V^π̂_ε(s) = Σ_{a∈A} f_s(a)(Σ_{s′∈S} P_ε(s′|s,a)(r(s,a,s′)+V^π̂_ε(s′))) (Eq. 1).
- MDP: V*_ε(s) = max_{a∈A}{Σ_{s′} P_ε(s′|s,a)(r+V*_ε(s′))} (Eq. 2); π*_ε(s) ∈ argmax_a{…} (Eq. 3).
- Rollout: V^{π^1_ε}_ε(s) = max_a{Σ_{s′} P_ε(s′|s,a)(r+V^π̂_ε(s′))} (Eq. 5); recursion Eq. 7 with π^0 := π̂.
- Rewards: r=1 on first entry to W, 0 otherwise.
- Serve-fault handling: P(first serve|fault) = 0.379·0.725/0.302 = 0.91 (Bayes, Sackmann data) → self-transition 0.91, →L 0.09; triple-serve modeling error prob 0.008, deemed negligible.
Stated assumptions: intention distribution invariant to ε; B plays the fixed empirical policy at ε=13; state omits incoming-shot difficulty and score; execution error = landing-location deviation only (not speed/spin); VON CRAMM shots are realistic.

## 5. Features / target
Features: discretized player locations (84 cells), shot type, intention region. Target: probability of winning the point from each state (value function) and the optimal intention per state, as functions of execution-error level ε.

## 6. Validation design
Validation is internal-consistency + one external check: (a) ε=13 selected by matching simulated P(win/error/in-play) to empirical VON CRAMM probabilities (Table 1); (b) model P(win point on serve) ≈ 0.652 vs empirical 0.642 (Sackmann 2017–2019 AO) — strong agreement. No train/test split (simulation-based); no competing baseline method (framework paper); non-monotonicity in some curves attributed to finite sampling. The MDP's optimism is diagnosed, not hidden: cross-court rally at ε=20 gives MRP value ~42% but MDP value ~89%.

## 7. Numerical results / baselines
- **Error calibration (App. A, Table 1):** ε=13 → P(win)=13.0, P(error)=13.0, P(in-play)=74.0 vs average-player empirical 13.0/13.4/73.6.
- **Backhand vs forehand (§5.2, Fig. 6, App. B):** ad-rally (backhand for ~90% right-handed players) error more costly than deuce-rally (forehand); out-of-bounds probability grows faster with ε for ad rallies; no such asymmetry for serves/returns. Ad rallies also reached 55% of the time (conditional on continuation).
- **Serves (§5.2):** execution error on serves barely moves value — serve value lives in speed/spin, not landing precision (authors' interpretation).
- **Aggressive vs conservative (§5.3, Fig. 7):** crossover at ε≈4; below it aggression pays, above it conservatism wins; the *average* player (ε=13) should play conservatively. Optimal intentions shift from baseline corners/drop shots at ε=1 to middle-of-court mass by ε=6 (Fig. 9).
- **One optimal shot (§5.5, Fig. 10):** optimizing only the serve return at ε=13 raises point-win probability 0.575 → 0.704 — roughly equivalent to *perfect execution everywhere* under the empirical strategy. Serve return dominates serve and rally shots as the single highest-ROI decision at every ε level. Diminishing returns beyond ~5 optimal shots; policy iteration converged in 6–8 iterations (consistent with most points lasting <8 shots).

## 8. Code / data availability
None stated. VON CRAMM (Kovalchik et al. 2020, arXiv:2005.12853) is the data engine — actively used by Tennis Australia (serve value metric, 2020 AO). Sackmann's data is public on GitHub. No code for the MRP/MDP pipeline released in the paper.

## 9. Leakage & limitations
- **Simulation-on-simulation:** transitions are built from VON CRAMM-generated shots, not measured tracking; errors in the generator propagate into "findings" (e.g., the ε=13 calibration matches the generator's own empirical distribution — circular by construction).
- MDP value functions are admitted to be unrealistic/optimistic (rare-state exploitation + sampling error); only the rollout results are decision-relevant.
- Intention distribution fixed across ε is a convenience assumption the authors flag.
- No incoming-shot difficulty or score in the state; no first/second-serve distinction; execution = landing location only.
- Tennis-specific geometry throughout; the *framework* transfers, none of the fitted numbers do.
- Adversarial note: the headline "one optimal serve return ≈ perfect execution" comparison pits a realistic decision improvement against an unattainable execution ideal — rhetorically strong but the practical takeaway is just "serve-return targeting is the highest-leverage decision."

## 10. GSE overlap
No duplication — the map has no intention-vs-execution decomposition and no execution-error-aware value functions. Strong complementarity on two axes: (a) with 0391 (shot-execution generative model): 0391 estimates an execution distribution from data, this paper shows how to inject such a distribution into an MRP/MDP value function — together they are a complete intention-vs-execution stack; (b) with the paper's own citation of Chan et al. 2021 "Points gained in football" (Oper. Res.), the same author's NFL value-function work — this paper is the execution-error extension of that line, making the NFL transfer a small step rather than a leap. Also relevant to any GSE 4th-down/2PC decision analysis: separating call quality from execution quality.

## 11. GSE implementation spec
1. **NFL analogue design:** state = (down, distance, yard line, score differential, time) × personnel/formation; intentions = play-call categories (or finer: route concepts, run gaps); execution distribution = play-level outcome noise decomposed into components (QB placement error à la 0391, drops, protection breakdowns) estimated from nflverse + charting data.
2. **Build the MRP** for the empirical play-calling policy (value = win probability / expected points from each state); **build the ε-scaled execution variants** to answer "how much of this team's red-zone underperformance is play-calling vs execution?"
3. **n-greedy rollout** for decision analysis: value of optimizing the single highest-leverage call per drive (the analogue of the serve-return result) — directly usable in 4th-down/go-for-it content and coaching-grade analysis.
4. Validate against observed win probabilities (nflverse WP) the way the paper validates against 0.642 serve hold rate.
Estimated effort: 3–4 weeks for a down/distance prototype on nflverse data; execution-component estimation is the hard part and can start from the 0391-style generative approach.

## 12. Reproducible test
No code released, so reproduction = reimplementation: rebuild the state space, intention/execution fitting, and Algorithm 1 on any racket-sport tracking or simulated data; require (a) the ε-calibration procedure to recover a stable "average" level, (b) the aggressive/conservative crossover to appear at low ε, and (c) the rollout values to satisfy V^π̂ ≤ V^{π^n} ≤ V* with diminishing returns in n. GSE acceptance test for the NFL port: the MRP-implied state values must match nflverse empirical WP within ±1.5 pp across down×distance buckets before any intention-vs-execution claim is published.

## 13. Acceptance / rejection gate
ACCEPT as ADAPT. Standing gate: never present simulation-based value decompositions as measurements of real players without the §12 WP-agreement validation; label all intention-vs-execution attributions as model-based. If the NFL port's MRP cannot reproduce empirical WP, demote to REJECT (tennis-specific curiosity).

## 14. Improvement experiment
The paper's fixed-B, fixed-intention-distribution setup is the obvious extension point: build the **two-sided** model the authors defer (both players optimize — a stochastic game rather than MDP-vs-fixed-policy). For the NFL port this is the natural form: offense chooses intentions to maximize value while the defense simultaneously chooses coverages/blitzes. Solve for equilibrium strategies as a function of offensive execution error ε — the output is a genuinely new object: an execution-error-conditioned game-theoretic play-calling chart (e.g., "at average QB placement error, the equilibrium shifts X% toward conservative calls; at elite error, toward aggression"), which neither this paper nor the football points-gained literature provides.
