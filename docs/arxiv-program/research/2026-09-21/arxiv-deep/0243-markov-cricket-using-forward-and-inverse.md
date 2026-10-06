# [0243] Markov Cricket: Using Forward and Inverse Reinforcement Learning to Model, Predict And Optimize Batting Performance in ODI Cricket (arXiv:2103.04349v1)

**Citation:** Vohra, M., & Gordon, G. S. D. (2021). *Markov Cricket: Using Forward and Inverse Reinforcement Learning to Model, Predict And Optimize Batting Performance in ODI Cricket*. University of Nottingham. arXiv:2103.04349v1. URL: https://arxiv.org/abs/2103.04349
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,318 lines, through references).
**Verdict:** ADAPT — the cricket-specific DLS replacement and batting-policy simulator have no NFL transfer, but the inverse-RL method (inferring a strategy reward function from winning teams' action sequences via a guided-cost-learning variant of Ng & Russell 2000) is a genuinely new primitive vs Garrett's corpus: it directly addresses gap #4 (RL/bandits — no RL papers read) and complements Sandholtz's 4th-down MDP (2309.00756, which assumes a reward rather than inferring one). Adapt the IRL machinery to NFL situational decisions; do not adopt the cricket simulator.

## 1. Research question
Can one-day international cricket be modeled as a Markov process so that reinforcement learning yields three tools: (1) a fairer alternative to the Duckworth-Lewis-Stern (DLS) method for interrupted games (a neural value-function approximator as "scoring resources remaining"), (2) an inferred true reward function and optimal batting policy via inverse RL, and (3) a full game simulator producing posterior distributions of final scores from any state? (Authors claim first application of RL to cricket.)

## 2. Dataset / schema
- **Source:** Cricsheet (https://cricsheet.org) — freely available structured ball-by-ball data for international and T20 league matches (accessed June 2020); ODI matches.
- **Schema:** ball-by-ball: over number (0–50), wickets lost (0–10), current score (banded in 10-run intervals, index 0–49), ball within over, extra-ball indicator; second-innings adds target score band.
- **State spaces:** first innings [51, 11, 50, 6, 2]; second innings [51, 11, 50, 50, 6, 2]. Multiple extras handled by staying in the same state.
- **Access:** public (Cricsheet).

## 3. Method / model
1. **Markov Reward Process + Monte Carlo value learning:** reward = fraction of total runs scored in the state. Neural-network value-function approximator (5 input neurons first innings / 6 second innings, hidden layers, 1 output = value = % scoring resources left). Monte Carlo learning chosen for robustness to Markov-property violations. 90/10 train-test split + 10-fold cross-validation. Test: random interruption after the 20th over of test-set innings; value function → predicted final score; compared against DLS table lookup on the same state.
2. **Inverse RL (first innings only):** MDP with actions = {dot ball (0), 1, 2, 3, 4, 6 runs}. Linear reward r(s,a) with 5 state features + action features (×1000 amplification; dot balls excluded as they add no score/wicket info). Expert strategies = action sequences of WINNING teams; non-expert = losing teams'. Optimization (Ng & Russell 2000 form, framed as guided cost learning, Finn et al. 2016): maximize Σᵢ p(V^π*(s₀) − V^πᵢ(s₀)) with p = squared Euclidean distance — maximize margin between optimal and suboptimal strategies.
3. **Game simulator (complete MDP):** transition probabilities estimated from historic data: P(runs ∈ 0–6 | state, not wicket ball), P(wicket | state), P(non-optimal action | state) (first innings). Simulate from initial state: wicket check → optimal-action check → action sampled from transition probabilities → next state; 100 simulations → posterior distribution of final scores.

## 4. Equations & assumptions
- **Predicted final score (Eq. 1):** PredictedScore = ⌈CurrentScore / (1 − r)⌉, where r = resources remaining (value function or DLS table value).
- **% error (Eq. 2):** %Error = (Predicted − Actual)/Actual × 100, averaged over test games per fold.
- **Linear reward (Eq. 3):** r(s,a) = x₁s₁+…+x₅s₅ (a=0, dot ball); = x₁s₁+…+x₅s₅ + y_a·1000·a otherwise.
- **IRL objective (Eq. 4):** maximize Σᵢ₌₁ᵏ p(V^π*(s₀) − V^πᵢ(s₀)), p = squared Euclidean distance.
**Assumptions:** ball-by-ball process is approximately Markov (acknowledged deviation; MC learning chosen as robust); winning teams' action sequences approximate expert/optimal play (authors note luck: teams can win sub-optimally, but averaging over many games should approximate the true reward); data generated under an optimal policy for transition-probability inference; dot balls carry no reward information beyond state features; reward is linear in features (authors flag this as a limitation — relative action values can't vary by state).

## 5. Features / target
Targets: (1) % scoring resources remaining (value function) → final-score prediction on interruption; (2) reward-function coefficients + optimal action per state; (3) posterior final-score distribution. Features: over, wickets lost, score band, ball-in-over, extra indicator (+ target band in 2nd innings); actions {0,1,2,3,4,6}. Prediction horizon: mid-game (interruption after 20th over) → end of innings. Cricket-specific; horizon concept transfers to any in-game state.

## 6. Validation design
- **DLS comparison:** 10-fold CV, random interruption after over 20 in held-out innings, % error vs actual final score; DLS evaluated on identical states (DLS error varies slightly across folds only via test-set selection). This is a legitimate held-out comparison.
- **IRL:** no held-out validation of the reward function — qualitative check ("agrees with common intuitions about the game") + downstream simulator win-rate test.
- **Simulator:** interruption at same point on the FULL dataset (not held-out — in-sample), 100 simulations, mean simulated score vs actual; error ± SD.
- **Baselines:** DLS (the professional standard) only; no comparison to other proposed DLS alternatives (VJD, Preston-Thomas, Carter-Guthrie) discussed in related work.

## 7. Numerical results / baselines
- **First innings value model (best net, config 6):** mean % error range −2.11% to −0.11% vs DLS 2.77% to 5.41% — model underestimates slightly, DLS overestimates with larger magnitude. Conclusion's headline: "up to 10 times improved accuracy (First Innings: −1.11% vs 4.27%; Second Innings: 0.43% vs. 4.35%)" — i.e., ~3.8× first innings, ~10× second innings (matches the abstract's "3 to 10 fold").
- **Second innings value model (best, test 8):** error range −0.96% to 1.82% vs DLS 2.06% to 4.54%. Steeper resource drop late in games when wickets fall.
- **IRL coefficients (Fig. 6):** state features 1 (over), 3 (score band), 4, 5 hit the upper bound 1.0; wickets lost is the ONLY negative coefficient. Action coefficients: 2 runs = 1.0 (highest — keeps the successful batter on strike, low run-out risk); 4 runs second-highest; 6 runs just above 0.5 (high reward, high caught-risk); 1 run low; 3 runs LOWEST (run-out risk vs time taken).
- **Optimal policy:** win by losing fewer wickets and batting the full 50 overs; dot balls valuable early and after wicket clusters; singles valuable early (strongest batters face strongest bowlers); fours the highest-value action (declines as wickets fall); sixes valuable late with >half wickets in hand. Authors note linearity forces action rankings to be state-independent — a flagged limitation.
- **Simulator:** first innings with optimal actions wins 82% of 100 simulations vs 50% using transition probabilities only. Interruption posterior: first-innings optimal-action model 9.87% ± 16.09%; without optimal actions 2.83% ± 15.10%; second innings 2.09% ± 11.10%. Optimal action in most states: hit a four; ones/twos/sixes near the end.

## 8. Code / data availability
No code or repository links. Data: Cricsheet (public). Networks trained with unspecified framework; hidden-layer widths/epochs tuned but final architecture values only in figures.

## 9. Leakage & limitations
- **Simulator evaluated in-sample** (full dataset used for both transition probabilities and the interruption test) — the 2.83%/2.09% errors are optimistic.
- **Expert = winners is noisy:** a team can win with a bad strategy or lose with a good one; the "averaged over many games" argument is asserted, not tested (no sensitivity analysis on expert definition, e.g., winners vs top-quartile run-rate teams).
- **Linear reward limitation** acknowledged by authors: relative action values can't vary by state (e.g., six should dominate four on the last ball — the model can't express this).
- **Coefficient bound artifact:** four of five state coefficients sit AT the upper bound 1.0 — the optimization is constraint-bound, so the "true" weights are unidentified; the policy conclusions rest partly on an arbitrary bound.
- **Headline "10x" is a ratio of small percentages** (−1.11% vs 4.27%) — absolute improvement is ~3 percentage points; practically meaningful for fairness but the fold-multiple framing flatters.
- **No NFL transfer of the simulator/DLS work:** cricket innings structure (fixed 300 balls, wickets as hard resource) has no NFL analogue; the optimal-policy findings are cricket-tactics trivia.

## 10. GSE overlap
- **Partially novel — fills a gap:** existing-research-map gap #4 explicitly lists "RL / bandits for pick selection… no papers read." This is the first RL/IRL paper in the sweep touching sports. 2309.00756 (Sandholtz, 4th-down MDP risk preferences) is adjacent but assumes a reward function and solves forward; this paper INFERS the reward from expert demonstrations — a different primitive not in the map.
- **Duplicate territory:** value-function-as-resources-remaining is conceptually win-probability modeling (iWinRNFL 1704.00197, in-game soccer WP 1906.05029 already absorbed); Monte Carlo policy evaluation on game states is standard. The DLS-beating result is cricket-administration, not GSE-relevant.
- Adopt the IRL inference primitive, not the cricket application.

## 11. GSE implementation spec
Adapt IRL to NFL situational decision-making:
1. Define the MDP: states = (down, distance, yardline, score differential, time) from nflverse; actions = {go for it, punt, field-goal attempt} (4th downs) or {run, pass} (early downs); expert trajectories = drives of winning teams (or top-quartile EPA teams).
2. Linear reward in state features + action features; Ng & Russell margin-maximization objective (Eq. 4) — or modernize to MaxEnt IRL / guided cost learning with a small neural reward net (the paper's own suggested improvement).
3. Infer the implicit reward weights: e.g., do winning coaches' revealed preferences weight "avoid turnover" more than the nfl4th WP model implies? Compare inferred weights vs the WP-optimal policy — the GAP between revealed and optimal policy is the coaching-alpha signal.
4. Use the inferred reward to build a "coaching quality" metric per team: distance between a team's empirical policy and the inferred expert policy.
Estimated effort: medium — MDP plumbing on nflverse exists in-repo (Sandholtz lane); the new piece is the IRL objective.

## 12. Reproducible test
- **Data:** nflverse play-by-play 1999–2025.
- **Test 1 (reward recovery sanity):** simulate a known-reward MDP (e.g., 4th-down WP model as ground truth), generate expert trajectories from the optimal policy, run the paper's IRL (Eq. 4) and check it recovers the WP-implied weights — validates the machinery before trusting cricket-style conclusions.
- **Test 2 (NFL application):** run IRL on 4th-down decisions with expert = drives of playoff teams; report inferred action-feature coefficients with confidence intervals (bootstrap over games); check whether "go for it" weight > WP-optimal implies coaches are actually sharper than the nfl4th consensus or the bound-artifact problem from the paper recurs.
- **Test 3 (predictive check):** does distance-from-expert-policy predict next-season 4th-down conversion overperformance? If yes, it's a real coaching metric.

## 13. Acceptance / rejection gate
ADAPT gate: (a) Test 1 must show the IRL recovers a known reward function (the paper never validates its IRL on synthetic ground truth — do not skip this); (b) inferred NFL weights must not all sit at optimization bounds (the paper's bound artifact); (c) the expert-definition sensitivity must be checked (winners vs top-EPA teams). If (a) fails, the method is unvalidated machinery → REJECT. The cricket simulator and DLS results are not adopted under any gate.

## 14. Improvement experiment
- Replace the linear reward with a neural reward function (the authors' own future work; = modern guided cost learning) and test whether action rankings become state-dependent on NFL data (e.g., "go for it" value spiking at specific yardlines).
- Compare MaxEnt IRL vs the paper's margin-maximization on the synthetic-recovery benchmark — determines whether the 2000-era objective is worth implementing or should be skipped for modern IRL.
- Apply the simulator idea to NFL: posterior distribution of final scores from any game state via an MDP with nflverse transition probabilities — but ONLY as a WP-model cross-check, since iWinRNFL-style models already cover this.
