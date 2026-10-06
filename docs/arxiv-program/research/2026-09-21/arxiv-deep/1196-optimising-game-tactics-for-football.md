# [1196] Optimising Game Tactics for Football (arXiv:2003.10294v1)

**Citation:** Ryan Beal, Georgios Chalkiadakis, Timothy J. Norman, Sarvapali D. Ramchurn (2020). *Optimising Game Tactics for Football*. arXiv:2003.10294v1 (AAMAS 2020). URL: https://arxiv.org/abs/2003.10294v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 638-line extraction; all sections read).
**Verdict:** REJECT

A soccer coaching decision-support paper (pre-match Bayesian game + in-match stochastic game for formation/substitution optimization) built on proprietary StatsBomb EPL event data, with no market test, no calibration, and no transfer to GSE's prediction/calibration/fantasy lanes. Replacement ledger number beyond the 1348–1353 allocation had not been assigned at the time of this ledger — flagged in the reader report.

## 1. Research question
Can football (soccer) tactics be formally optimized by modeling the game as a two-stage game — a pre-match Bayesian game (incomplete information about the opponent's formation/style) feeding into an in-match stochastic game (scoreline states with substitution decisions) — and do the optimized tactics beat what real managers chose, evaluated on 760 EPL matches?

## 2. Dataset / schema
- **760 matches**, English Premier League 2017/18 + 2018/19, event-by-event data (event type, pitch coordinates, outcome) **provided by StatsBomb** — industry data, not the public StatsBomb open-data release (which does not cover EPL); **proprietary for practical purposes**.
- Schema: per-match events with coordinates; team formations (30 distinct; 4-2-3-1 most common at 21%); style clusters from k-means on passes/shots/goals/tackles (4 clusters via elbow; Man City its own cluster in 2017/18).
- No odds, no market data. Substitutes' identities unavailable — the authors substitute "all squad players" instead of the actual 7-man bench, which they note degrades the in-match analysis.

## 3. Method / model
- **Pre-match Bayesian game** G_B = (T, A, Θ, p, u): teams T_α (ours) / T_β (opponent); actions = formation + style + selected players; types = opponent style; beliefs p(A_β|Θ_β) from k-means style clusters; payoff u = weighted result probability (win 2, draw 1, loss 0). Opposition formation predicted by RBF-kernel SVM on prior-5-games-vs-same-style-cluster features; payoff model = 3-layer fully-connected ReLU DNN with categorical cross-entropy predicting home/draw/away probabilities from styles, formations, and Dixon-Coles-derived team strengths.
- **Optimization rules**: best response (max own payoff), spiteful (min opponent payoff), minmax (max own − opponent payoff).
- **In-match stochastic game** G_S = (X, T, S(x), π, u): states X = scorelines from 0–0; transitions π(x′|x, s1, s2) learned per-state via RBF-SVM (features: team strength, formations, styles; Dixon–Robinson-inspired time/score dependence); substitution payoffs add bench-player centrality (from Beal et al. [3]) and remaining time; 64 substitution combinations evaluated per state; aggressive (max P(move to better state)) vs reserved (max P(stay)) policies.

## 4. Equations & assumptions
- Bayesian game: G_B = (T, A, Θ, p, u); best response max_{a1∈Aα} Σ_{a2} u(a1,θα|a2,θβ)·p(a2|θβ); spiteful min over own actions of opponent's expected payoff; minmax max of the difference.
- k-means objective: min over centroids of Σ_i ||x_i − μ_j||² (within-cluster sum of squares).
- SVM (RBF): f(x) = Σ_{i=1}^{C} λ_i φ(|x − m_i|).
- DNN loss: −(1/N) Σ_i log p_model[y_i ∈ O_{y_i}] (categorical cross-entropy, softmax, SGD).
- Stochastic game: G_S = (X, T, S(x), π, u); π_{x,y} = p(S_x → S_y) = φ_x(F).
- Assumptions: both teams share the same prior beliefs from historical data; equilibria not solved (authors explicitly use the games as learning frameworks, not solved games); pre-match decisions fully determine starting in-match strategies; substitute pool approximated by all squad players.

## 5. Features / target
- Formation-prediction SVM: tactical setups from prior 5 games vs same style cluster → predicted formation (30 classes).
- Payoff DNN: home/away style, home/away formation, Dixon-Coles-implied team strengths → P(home/draw/away).
- Transition SVMs (one per scoreline state): team strength, formations, styles (+ substitution centrality, remaining time for payoff version) → P(home goal / away goal / no goal) from that state.
- Targets are tactical recommendations, not market prices.

## 6. Validation design
70/30 train-test splits with k-fold CV (10-fold for formation prediction and state transitions; 5-fold for payoff model) on the 760 EPL matches — **not time-ordered** (random splits within two pooled seasons). Baselines: Dixon & Coles [9] for the payoff model; real managers' choices for the optimization ("closeness" = recommended formation equal or one change away, e.g. 4-4-2 ≈ 4-5-1). No market-odds baseline, no CLV, no proper-scoring evaluation of the DNN probabilities.

## 7. Numerical results / baselines
- Formation prediction: **96.21% accuracy**, precision **0.9867**, recall **0.9135**, F1 **0.9441** (10-fold CV).
- Payoff DNN beats Dixon & Coles on accuracy/precision/recall/F1 (Figure 4; exact numbers as plotted, not tabulated in extracted text).
- Optimization "closeness" to real choices: best response **35.3%**, spiteful **59.7%**, minmax **44.6%** (away teams: spiteful **69%**; home: best response 38%, spiteful 50%, minmax 53%).
- Win-probability boost vs actual tactics: best response **+16.1%** (p = 0.0001), minmax **+12.7%**; spiteful reduces loss probability by **1.4%**. Teams "close" to minmax recommendations win marginally more (+0.2% vs best response), draw +1.1% more, lose 1.2% less.
- State-transition models: mean accuracy **87.5%** (std **4.8%**) per state; with substitution/time features **95.5%** (std **4.5%**).
- In-match optimization: aggressive policy **+2.0%** win payoff; reserved **−3.4%** opponent payoff; managers matched the recommended sub **14.75%** (aggressive) / **14.11%** (reserved) of the time, **~40%** same-position.

## 8. Code / data availability
Experiments run in scikit-learn and TensorFlow (footnote); no code link stated. Data: StatsBomb-provided EPL event data — not publicly available for EPL.

## 9. Leakage & limitations
- **Random (non-time-ordered) CV splits** within two pooled seasons: the formation/style/payoff models see future matches during training — standard leakage for a deployed pre-match system.
- **No market interface**: the DNN outputs probabilities but they are never calibrated, never scored with proper rules, never tested against odds or CLV; the "+16.1% win probability" is a model-vs-model counterfactual, not a betting edge.
- **Coaching, not prediction**: the product is tactical advice for managers (which formation, which substitute), a lane GSE does not operate in.
- Substitute-pool approximation (all squad players vs actual 7-man bench) admitted to degrade in-match results; only 3 substitutions allowed in the modeled era.
- Soccer/EPL-only; style clusters (tika-taka, route one, high press, park the bus) have no NFL analog in GSE's pipeline.

## 10. GSE overlap
GSE builds calibrated forecasts for NFL markets; it does not do coaching decision-support. The map's adjacent items (in-game soccer win probability 1906.05029, Fischer/Heuer soccer Poisson-vs-ML 2408.08331) are prediction papers — this one is not. The game-theoretic framing (Bayesian opponent modeling, stochastic scoreline games) is a genuinely different formalism from anything in the map, but it optimizes *team actions*, not *forecasts*, so there is no GSE lane to receive it.

## 11. GSE implementation spec
Not applicable — rejection is at the problem level (coaching tactics for soccer). The nearest GSE-relevant fragment, opponent-formation prediction from recent tactical history, has no NFL analog in GSE's spread/total/prop/fantasy stack.

## 12. Reproducible test
Not applicable — proprietary EPL event data, no code, and the claims to reproduce (tactical "closeness," counterfactual win-probability boosts) are not market-testable forecasts.

## 13. Acceptance / rejection gate
Reject: coaching decision-support for soccer on proprietary data; no calibrated forecast, no market test, no transferable prediction methodology for GSE's lanes. No numeric gate satisfiable.

## 14. Improvement experiment
None proposed — the gap is the problem framing (tactics optimization), not the methods. A prediction-oriented version would calibrate the DNN probabilities, score them with proper rules against market odds, and test for CLV; the authors do not attempt this.

**Verdict:** REJECT
