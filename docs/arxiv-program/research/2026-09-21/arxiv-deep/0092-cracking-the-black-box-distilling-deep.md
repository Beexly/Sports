# [0092] Cracking the Black Box: Distilling Deep Sports Analytics (arXiv:2006.04551)

**Citation:** Xiangyu Sun, Jack Davis, Oliver Schulte, and Guiliang Liu (2020). *Cracking the Black Box: Distilling Deep Sports Analytics*. arXiv:2006.04551v4. Accepted by the 26th ACM SIGKDD Conference on Knowledge Discovery and Data Mining (KDD 2020). URL: https://arxiv.org/abs/2006.04551
**Ledger completed:** 2026-09-21. **Read:** full text (PDF extract, 571 lines; ar5iv HTML did not render). Some math glyphs garbled in PDF extraction — affected equations flagged as uncertain reconstructions.
**Verdict:** ADAPT — linear-model-tree mimic distillation is a directly portable interpretability/debugging technique for GSE's engine models, but the hockey/soccer DRL domain needs full NFL reimplementation.

## 1. Research question
How to resolve the accuracy–transparency tradeoff in deep sports analytics: can a transparent **linear model tree** be trained (mimic learning) to reproduce the outputs of a black-box deep reinforcement learning model that estimates action values Q(S,A) in team sports — with high fidelity, scalable to millions of data points, and yielding interpretable, actionable rules for experts? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Source:** Sportlogiq event data (proprietary — no public download).
- **Ice hockey:** 2018–2019 NHL season; shots = 150K events, passes = 1M events (Fig. 5).
- **Soccer:** 2017–2018 season, 10 leagues; "more than seven million data points" combined across sports (Sec. 1).
- **Schema (Table 2):** Hockey — time remaining (s) [0,3600], puck x [−100,100] ft from center ice, puck y [−42.5,42.5], score differential, manpower {even strength, short handed, power play}, action blocked {true,false,undetermined}, puck x-velocity, puck y-velocity, event duration [0,∞), angle puck–goal [−π,+π], home-team possession {true,false}, away-team possession {true,false}, action one-hot over 43 actions. Soccer — time remaining (min) [0,100], ball x [0,100], ball y [0,100], distance to goal (m) [0,110], score differential, manpower [−5,5], action blocked {true,false}, ball x/y-velocity, event duration, angle ball–goal [−π,+π], home/away possession, action one-hot over 27 actions.
- **Episode structure:** each match divided into episodes starting at period start or right after a goal, ending at period end or goal. Hockey: regulation time only (overtime excluded).
- **DRL inputs:** a 10-event window preceding the current action; tree shows features with timestamps t0 (current) down to t−9.

## 3. Method / model
- **Black box (Sec. 3.3):** deep RL action-value model: input layer → LSTM hidden layer → two fully-connected hidden layers → output layer; each hidden layer 1000 ReLU neurons; trained with SARSA (λ = 1), minibatch gradient descent via BPTT with fixed window size 10. Q̂ outputs **three action values per (S,A)**: P(home team scores next goal), P(away team scores next goal), P(game ends before another goal).
- **Mimic learning (Sec. 4):** learn a **linear model tree** to match the neural net's outputs ("soft labels"). Leaf nodes carry linear models `ŷ = Σ_i (w_i · x_i) + b`. Splits: minimize weighted child y-variance; minimum 100 records per child node (m = 100).
- **Data augmentation — "action replacement" (Sec. 4.1, novel):** given target action A′ ≠ A, randomly select an observed (S,A) and query the neural net for the soft label Q(S,A′) — e.g., replace a pass-ending event sequence with a shot to learn when shooting is valuable. Exposes the tree to counterfactual settings absent from professional play.
- **Fast split-point heuristics (Sec. 4.3, novel):** sort data by x_i, then in one pass pick breakpoint c_i maximizing difference in y-distributions: (a) **Sorting + Variance Reduction** (incremental variance reduction), (b) **Sorting + T-test** (Welch two-sample t-test statistic, incremental), (c) **Iterative Segmented Regression** (piecewise-linear y-on-x_i fit with iterative breakpoint update, [20]), baseline (d) **Gaussian Mixture** (EM 2-component bivariate on (x_i,y), QDA closed-form split).
- **Pruning (App. A.4–A.5):** regularized regression objective at node v: `E_v = argmin_w Σ_j (y_j − (w·x_j)) + λ·R(w)` with R = L0 (number of params; smaller tree) or L1 (better fidelity); prune children v1,v2 if E_v < E_v1 + E_v2.

## 4. Equations & assumptions
- SARSA loss and update (Sec. 3.3): `L_t(θ_t) = E[(R_t + Q̂(S_{t+1},A_{t+1}; θ_t) − Q̂(S_t,A_t; θ_t))²]`; `θ_{t+1} = θ_t − α·∇_θ L_t(θ_t)`; R_t reward, α learning rate.
- Action impact (Sec. 3.2): `Impact(S_t, A_t) = Q(S_t, A_t) − Q(S_{t−1}, A_{t−1})`.
- Leaf model: `ŷ = Σ_i (w_i · x_i) + b`.
- Splitting criterion (App. A.3): `Variance(s) − [(N_{st}/N_s)·Variance(s_t) + (N_{sf}/N_s)·Variance(s_f)]`, st = {x_i ≤ c_i}, sf = {x_i > c_i}.
- T-test heuristic (Sec. 4.3.2): `t-score = (μ_1 − μ_2) / sqrt(σ_1²/N_1 + σ_2²/N_2)` (Welch's t).
- Segmented regression (Sec. 4.3.3, ⚠️ uncertain — PDF glyphs garbled; reconstructed): `ŷ = α·x_i` for `x_i ≤ c_i`; `ŷ = (α+β)·x_i − β·c_i` for `x_i > c_i`; iterative update `c_i^{s+1} = c_i^s + β/γ` from `ŷ = α·x_i + β·U^s + γ·V^s` with `U^s = (x_i − c_i^s)` if `x_i > c_i^s` else 0, `V^s = −1` if `x_i > c_i^s` else 0. (Do not quote as exact.)
- Pruning loss: `E_v = argmin_w Σ_j [y_j − (w·x_j)] + λ·R(w)`.
- Assumptions stated: tree leaf linear model is adequate locally; minimum child size 100 balances fidelity vs tree size; standard CART schema [5]; soft labels from the net are "weighted averages of nearby data points" (net as interpolating kernel predictor [19]).

## 5. Features / target
- **Inputs:** Table 2 variables above, ×10-event time window.
- **Targets:** (a) action values Q(S,A) — three softmax outputs per state–action pair (home-next-goal, away-next-goal, no-more-goals); (b) action impact = ΔQ vs previous state–action pair.

## 6. Validation design
- **Fidelity evaluation** (Sec. 5): RMSE between tree and DRL predictions on a **held-out test set** (mimic learning = regression on soft labels; they report correlation in addition to RMSE). No time-ordered splits mentioned — episodes split across train/test; potential episode-leakage not discussed.
- **Baselines:** Gaussian Mixture heuristic and a "Null Model" (predicts response mean).
- **Feature importance:** sum of variance reductions over all splits using the feature [17]; plus split frequency.
- **Rule extraction:** reading conjunctions of split conditions along tree branches (Figs. 6–10).

## 7. Numerical results / baselines
Fidelity RMSE, tree vs DRL, test set (**Table 1**, methods: Gaussian Mixture / Iterative Segmented Regression / Sorting+Variance Reduction / Sorting+T-test / Null):
- Hockey shots, action-values: 0.05483 / **0.01441** / 0.01219 / 0.05709 / 0.13924.
- Hockey shots, impacts: 0.01990 / 0.01999 / **0.01627** / 0.02487 / 0.05688.
- Hockey passes, action-values: 0.04276 / **0.00964** / 0.01012 / 0.06695 / 0.10808.
- Hockey passes, impacts: 0.00687 / 0.00691 / **0.00686** / 0.00935 / 0.01756.
- Soccer shots, action-values: 0.00698 / **0.00508** / 0.00646 / 0.01223 / 0.13648.
- Soccer shots, impacts: 0.01312 / 0.01275 / **0.01235** / 0.01377 / 0.11890.
- Soccer passes, action-values: 0.01000 / 0.00997 / **0.01092** / 0.01796 / 0.06151.
- Soccer passes, impacts: 0.00577 / 0.00575 / **0.00603** / 0.00597 / 0.00961.
- Correlation(tree, DRL) (**Table 4**): ISR — 0.99436/0.93620/0.99601/0.92018/0.99650/0.99422/0.98695/0.81966; SVR — 0.99593/0.95834/0.99561/0.92137/0.99480/0.99459/0.98438/0.80024 (same 8 cells). Paper text: ISR correlations "almost always above 0.9 and in many cases above 0.99" (Sec. 5.1). Note soccer *pass impacts* are the weak cell (~0.80–0.82 across all methods — mimic struggles there).
- Top-10 feature importances for shots (**Table 3**): hockey — time remaining (t0) 0.0594 (freq 248), puck y 0.03418 (228), puck x 0.02646 (153), action blocked 0.02016 (12), manpower 0.01203 (14), home 0.00629 (1), puck–goal angle 0.00164 (32), time remaining (t−1) 0.00072 (9), reception (t−1) 0.00061 (5), score diff (t−1) 0.00026 (23); soccer — action blocked 0.01524 (1), time remaining 0.00711 (36), distance to goal 0.00144 (31), through ball (t−1) 0.00079 (1), event duration 0.00068 (8), time remaining (t−1) 0.00059 (12), ball y-velocity 0.00036 (5), ball x 0.00015 (28), manpower 0.00011 (1), cross (t−1) 0.00011 (2).
- **Scalability (Fig. 5; Sec. 6):** all experiments ran on a 4-core CPU, 64 GB RAM node (Compute Canada); ISR fastest, all methods < 1 day on 1M+ record datasets. Standard packages (pyFIMTDD, Weka, GUIDE) "failed to build on our large dataset due to their memory limitations."
- **Debugging win (Sec. 5.4, paper's claim):** the tree learned from an early DRL version split frequently on *event duration*, which conflicted with hockey experts' knowledge — this exposed an **information leakage in the data processing that extracted the duration feature** (it highly correlated with Q-values). "Without an interpretable model such as the tree, it is almost impossible to spot the spurious behaviour from the black box."

## 8. Code / data availability
Code: https://github.com/xiangyu-sun-789/Cracking-the-Black-Box-Distilling-Deep-Sports-Analytics (footnote 1, Sec. 4). Data: Sportlogiq — proprietary, not available.

## 9. Leakage & limitations
- **The paper's own headline anecdote is a leakage cautionary tale**: their DRL model had target leakage via the *event duration* feature, caught only because the mimic tree exposed it. As an evaluation protocol, fidelity RMSE is measured against the DRL's *own* outputs — a mimic can faithfully reproduce a biased black box (Fig. 4 tree trained on the biased DRL model). Fidelity ≠ correctness.
- Episodes/games are split into train/test without a stated time-ordering — near-duplicate game-state sequences may appear on both sides (not addressed).
- Soccer pass *impact* correlations top out at ~0.82 — mimic fidelity is not uniform; some targets resist distillation.
- Minimum 100 records/child is a heuristic; no sensitivity analysis reported.
- External validity to NFL: the method is sport-agnostic, but all evidence is NHL/soccer event data; NFL play-by-play is discrete, lower-frequency, and has no analogous Sportlogiq feed.
- The T-test heuristic performs worst of the three fast heuristics on action-values (Table 1) — authors recommend ISR default, SVR close second.

## 10. GSE overlap
Partial. The existing-research-map (15-area ML research brief) lists **interpretable models** as area 10 and the XGBoost EP foundation — but no mimic-learning/distillation work exists in the repo. This paper's technique (distilling a black-box model into a transparent tree) is a **new capability**: GSE has no documented method for extracting human-readable rules or feature importances from its engine models. It extends, rather than duplicates, the interpretable-models lane. (Note: repo convention — tabular learners are already core to GSE; the mimic layer sits *on top* of them, so no conflict with the existing ML stack.)

## 11. GSE implementation spec
1. **Target for distillation:** GSE's production probability model (XGBoost/GBM or any neural model) on nflverse play-by-play → win probability / spread-cover probability.
2. **Soft labels:** generate model predictions on the full training corpus plus **counterfactual augmentation** in the paper's "action replacement" spirit — e.g., perturb game-state features (score diff ±7, down/distance swaps, timeout changes) and record engine probabilities as soft labels. This is the NFL analogue of replacing pass sequences with shots.
3. **Mimic learner:** linear model tree with iterative segmented regression split-point heuristic (fastest per Fig. 5), min 100 records/child, L1/L0 pruning. Reuse the paper's open code as the starting point.
4. **Outputs:** (a) feature-importance ranking by summed variance reduction (sanity-check vs GSE's known drivers: EPA, success rate, down/distance, score diff); (b) human-readable rule paths for analyst content ("what actually moves the number"); (c) a **leakage audit**: if the tree splits heavily on a feature experts find implausible, investigate that feature's pipeline (their duration-leakage anecdote is the template).
5. **Serving:** tree serves as an explainability sidecar, not the production predictor; expose rule paths in the analyst dashboard.
6. **Effort:** ~2–4 weeks — adapt their GitHub code, build NFL soft-label corpus from nflverse, fidelity benchmark vs engine.

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2025 (regular + postseason). Target: engine win-probability output on every 4th-down decision play (a decision-heavy, high-leverage subset; ~10K–15K plays). Baseline to beat: correlation(tree, engine) ≥ 0.95 and fidelity RMSE ≤ 0.03 on held-out 2025 games — the paper's own ISR bar on hockey shots (corr 0.99436, RMSE 0.01441) and soccer shots (0.99650, 0.00508). Success = both metrics met on a fully time-ordered 2025 holdout.

## 13. Acceptance / rejection gate
**Adopt** the mimic-tree sidecar if: (i) fidelity correlation ≥ 0.95 and RMSE ≤ 0.03 on the time-ordered 2025 holdout; (ii) the top-10 importance ranking agrees with GSE's known drivers (no implausible top-3 feature — i.e., no repeat of their duration-leakage failure); (iii) at least one extracted rule is content-usable by analysts. **Reject** (park the technique) if correlation < 0.90 or the tree's top features expose engine leakage requiring a model rebuild — in that case the leakage finding itself becomes the deliverable.

## 14. Improvement experiment
Go beyond soft-label mimicry: train the model tree **jointly on engine soft labels AND market-implied probabilities** (de-vigged consensus from the odds APIs in the repo), with a fidelity term plus a calibration term (e.g., pinball/EC E on market labels at leaves). This tests whether distillation can produce a tree that is both faithful to the engine and better calibrated to the market — i.e., an interpretable *disagreement* map showing exactly where, in feature space, the engine beats or trails the close.
