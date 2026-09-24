# [0238] Towards optimized actions in critical situations of soccer games with deep reinforcement learning (arXiv:2109.06625v1)

**Citation:** Rahimian, P., Oroojlooy, A., Toka, L. *Towards optimized actions in critical situations of soccer games with deep reinforcement learning*. arXiv:2109.06625v1. URL: https://arxiv.org/abs/2109.06625
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,652 lines, complete including appendices A–I).
**Verdict:** ADAPT — port the off-policy policy-gradient + doubly-robust OPE framework to NFL critical-situation decisions (4th downs, 2-point conversions, late-game timeout/clock management) and as GSE's general tool for evaluating new betting/pick policies on historical data without deployment; the soccer state representation doesn't transfer.

## 1. Research question
Beyond valuing actions, can batch (off-policy) deep RL learn an *optimal* policy for soccer critical situations (high ball-loss or goal probability, no pass/dribble option) that maximizes expected goals, and can it be evaluated without deploying it in a real match?

## 2. Dataset / schema
- InStat event + tracking data (1 frame/sec, 22 players), 104 European soccer matches, 2017–2018 season (proprietary; reproducible on public Wyscout data per Appendix B).
- 28,054 possessions; max 10 actions per possession (truncated/padded); 15,225 shots for the xG model.
- Code: github.com/Peggy4444/soccer_RL (public).

## 3. Method / model
- Markovian possession model: finite-state automaton (Start → Keep → Loss/Shot); episode = possessions until loss or shot; critical situations = shot/out/foul/error only.
- Defensive pressure via spectral clustering: opponent (x, y, vx, vy) → kNN graph (k=5) → graph Laplacian → K-means on zero-eigenvalue connected components, ball holder as initial centroid → 3 zones (immediate/intercept/unreachable); elbow method selects 3 clusters.
- State types: (I) hand-crafted + actions [28054,10,17]; (II) + exact 44-dim locations [28054,10,17→61]; (III) + 3 pressure features [28054,10,20].
- Behavioral policy: CNN-LSTM classifier over possession ending actions (CNN spatial + 100-unit LSTM + softmax); state III wins: 81% accuracy, 0.56 loss, 56,036 params (Table 2).
- Reward (Eq. 2): PV(s) = P(shot|X)·P(goal|shot,X) (Eq. 1); r = PV(s) if shot; PV(s′)−PV(s) if possession kept; −0.1 if lost.
- xG: logistic regression, AUC 0.798, Brier 0.012 (5-fold CV; beat XGBoost/RF/SVM, Table 4).
- Off-policy policy gradient: ∇_θ E[f] = E[(p(x)/q(x))·f(x)·∇_θ log p(x)] (Eq. 4; derivation Appendix F); γ = 0.99, PG lr 1e−4, DL lr 0.01.
- Evaluation: off-policy policy evaluation (OPE) via importance sampling (Appendix G) and doubly robust (Appendix H, Jiang & Li 2016 recursion).

## 4. Equations & assumptions
- Possession value: PV(s) = P(shot|X)·P(goal|shot,X) (Eq. 1; Bayesian derivation Appendix E).
- Reward: r(s,a) = PV(s) [shot]; PV(s′)−PV(s) [kept]; −0.1 [lost] (Eq. 2).
- Return: R(τ) = Σγᵗr / Σγᵗ (Eq. 3), standardized.
- Off-policy PG: ∇_θE_x[f(x)] = E_x[(p(x)/q(x))·f(x)·∇_θ log p(x)] (Eq. 4).
- Doubly robust: V_DR^{H+1−t} = V̂(s_t) + ρ_t(r_t + γV_DR^{H−t} − Q̂(s_t,a_t)), ρ_t = π₁/π₀ (Eq. 5, App. H).
Stated assumptions: possessions are Markovian; behavior policy adequately estimated by CNN-LSTM; −0.1 loss penalty chosen for convergence (not derived); importance weights have manageable variance (no clipping mentioned); xG logistic regression well-calibrated.

## 5. Features / target
- Features: 6 hand-crafted (angle/distance to goal, time remaining, home/away, action result, body ID) + 3 pressure-zone counts (or 44-dim locations) + one-hot actions per possession step.
- Target policy: categorical distribution over {shot, out, foul, error} maximizing expected goals.
- Horizon: episode (possession sequence until loss/shot), γ = 0.99.

## 6. Validation design
- OPE on all 104 games: mean reward per episode under learned vs behavioral policy, via IS and doubly robust; KDE of episode rewards; convergence over 100 epochs (shaded ±1 SD over 104 game rollouts).
- Qualitative: 3 critical-situation scenarios with trajectory visualizations and policy probability distributions.
- No live deployment (impossible); no comparison to other RL algorithms (only to behavior policy).

## 7. Numerical results / baselines
- State III converges ~70 epochs (IS) / ~80 (DR); state I converges fast but to lower reward; state II fails to converge (high-dim).
- Trained policy mean reward ≈ +0.45 vs behavioral ≈ −0.1 (expected goals per episode), all 104 games improved (Figure 5–6); optimized-policy reward distribution shifted positive with smaller variance.
- Scenario 1: player fouled (−0.16) but policy says shoot (expected goal 0.4 — missed opportunity).
- Scenario 2: error → conceded goal; policy says foul (save possession).
- Scenario 3: bad ball control → conceded goal; policy says send ball out.
- CNN-LSTM state III: 81% accuracy / 0.56 loss vs state I CNN-LSTM 68%/0.71 and state II 75%/0.65 — pressure features beat exact locations (dimensionality win).
- xG logistic regression: AUC 0.798, Brier 0.012.

## 8. Code / data availability
Code: github.com/Peggy4444/soccer_RL. Data: InStat proprietary (not shared); authors state reproducibility via public Wyscout event data (figshare link) — but pressure features need tracking data, which Wyscout lacks.

## 9. Leakage & limitations
- OPE is the *only* evaluation — IS/DR on the same 104 games used for training; no held-out matches reported for the policy evaluation. Overfitting to these 104 games is unmeasured.
- −0.1 loss reward is hand-tuned for convergence, not calibrated — policy conclusions (e.g., "should have fouled") are sensitive to it.
- Importance-weight variance unaddressed (no clipping/weight diagnostics); DR helps but Q̂ quality unreported.
- "Optimal in all 104 games" is in-sample by construction of OPE on training data.
- Behavior policy q(x) estimated by the same CNN-LSTM used to define PV — circularity: reward model and behavior model share features and data.
- Critical situations only (no pass/dribble option) — narrow scope; authors' own stated future work.
- Soccer-specific state; 1 fps tracking is coarse.

## 10. GSE overlap
Per existing-research-map.md: GSE has 4th-down/decision-adjacent material and game-theory coverage, plus extensive in-game WP work — but a formal *off-policy RL* treatment of NFL critical decisions, and especially *doubly-robust off-policy evaluation* as a methodology for scoring new strategies on historical data, is not in the corpus. This is an **extension** with two prongs: (a) off-policy PG for NFL 4th-down / 2-point / onside / clock-management decisions using historical play-by-play as the behavior policy; (b) OPE (IS + doubly robust) as GSE's standard harness for evaluating any new pick-selection or staking policy on historical picks without live deployment — directly relevant to strategy changes the team debates but can't A/B test.

## 11. GSE implementation spec
- Prong A: define NFL critical situations (4th down: go/punt/FG; 2-pt: go/kick; late-game: timeout/onside). State = down, distance, yard line, score diff, time, timeouts, team strengths. Behavior policy = historical coach decisions (nflverse 2009–2024). Reward = Δ win probability (nflfastR WP) — the analog of PV(s′)−PV(s). Train off-policy PG with importance weights; evaluate with IS + doubly robust OPE. Compare learned policy to actual coaching (quantify "coach mistakes" like the paper's player-mistake analysis).
- Prong B: build a reusable OPE harness: given GSE's historical picks (actions), outcomes, and odds (behavior policy), evaluate any proposed pick-selection/staking policy via IS and doubly robust estimators before any live trial.
- Effort: 2 engineer-weeks per prong (nflverse data + WP model exist; RL/OPE harness is new).

## 12. Reproducible test
Dataset: nflverse 2015–2024. Prong A: train off-policy PG 4th-down policy on 2015–2022, OPE-evaluate on 2023–2024 *held-out seasons* (fixing the paper's in-sample OPE flaw); metric = OPE-estimated Δ wins/season vs behavior policy, with IS weight diagnostics (effective sample size). Prong B: take a known GSE strategy change (e.g., a staking change); OPE-estimate its historical P&L and compare to the realized P&L of the period after adoption (if any) or to a time-split backtest.

## 13. Acceptance / rejection gate
Accept Prong A if held-out OPE shows ≥0.5 wins/season gain over coaching behavior with effective sample size >50% of nominal (weights not degenerate) — and the learned policy's recommendations are interpretable (e.g., more aggressive on 4th-and-short in opponent territory, matching known analytics). Reject if IS weights collapse (the paper's unaddressed risk) or the policy just rediscovers "always go for it" without situational nuance. Accept Prong B if OPE estimates of a known historical strategy change fall within ±20% of realized outcomes on a time-split test; otherwise the OPE harness isn't trustworthy for GSE decisions.

## 14. Improvement experiment
Beyond the paper: (a) fix the paper's in-sample OPE flaw with strict temporal holdouts and report weight diagnostics (ESS, max weight) — the paper reports neither; (b) replace the hand-tuned −0.1 loss penalty with calibrated WP deltas (NFL has a ground-truth value function in win probability; soccer doesn't) — this removes the paper's most arbitrary choice; (c) extend beyond critical situations to full-drive RL (the paper's own future work: all actions including passes) — for NFL, a full drive-level MDP (play-call RL: run/pass by situation) trained off-policy on nflverse, evaluated with the same OPE harness; (d) distill the learned policy into a coach-facing decision table (cf. the paper's scenario visualizations) — GSE content angle: "what the numbers say on every 4th down."
