# [0286] XGBoost Learning of Dynamic Wager Placement for In-Play Betting on an Agent-Based Model of a Sports Betting Exchange (arXiv:2401.06086v1)

**Citation:** Terawong, C. & Cliff, D. (Univ. of Bristol) (2024). *XGBoost Learning of Dynamic Wager Placement for In-Play Betting on an Agent-Based Model of a Sports Betting Exchange*. arXiv:2401.06086v1. URL: https://arxiv.org/abs/2401.06086v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 358 lines).
**Verdict:** ADAPT — the headline finding (XGBoost trained on simple agents' profitable bets can outperform every agent that generated the training data) is a validated synthetic-data learning loop GSE can reuse for in-play/line-movement modeling; but the learned strategy is horse-race-specific and the test environment is a simulator, not reality.

## 1. Research question
Can XGBoost, trained as an imitation learner on the profitable in-play bets of simple bettor-agents inside the Bristol Betting Exchange (BBE) agent-based model, discover a dynamic back/lay wagering strategy that outperforms all the strategies that generated its training data?

## 2. Dataset / schema
- Synthetic data generator: BBE — open-source ABM of horse-race track simulator (1-D discrete-time stochastic process with blocking/hurrying interactions) + real matching-engine implementation of a betting-exchange order book (back/lay, odds levels, time-priority matching, commission on winnings).
- 1000 training races × 5 competitors; 110 bettors: opinionated + un-opinionated mixes of ZI (zero-intelligence/random), Leader-Wins (LW), Back-The-Favourite (BTF), Linear-Extrapolator (LinEx), Underdog (UD), and Privileged (RP(1,10,15) — runs private IID forward race simulations, i.e., has privileged information).
- Race record: every market change + rank-order positions at that time. Training data: top-20% most profitable in-play transactions per race; features = market state + race state at action time; label = bettor's action (back/lay). ~90k labeled actions.

## 3. Method / model
- XGBoost binary classifier (binary:logistic, LogLoss), sklearn API + GridSearchCV (5-fold), tuned: eta, max_depth, subsample, colsample_bytree, gamma, then n_estimators with early_stopping_rounds=10.
- Learned policy is deployed as a new BBE bettor-agent; evaluated in two scenarios (100 races each): scenario 1 mirrors training population + 5 XGBoost agents; scenario 2 uniform 5 agents per type.
- Evaluation: Wilcoxon-Mann-Whitney U-tests on per-agent profit distributions (non-normal, Shapiro-Wilk confirmed) vs each baseline agent type.

## 4. Equations & assumptions
Standard gradient boosting/XGBoost (Chen & Guestrin 2016) — no novel equations. RP agent re-simulation wait ~ U[Δt_min, Δt_max]. LogLoss for tuning; accuracy for reporting.
Assumptions: (1) BBE race dynamics are "convincing" but not calibrated to real races; (2) profitability inside the ABM transfers to nothing in reality — authors explicitly caution against real-money use; (3) imitation of the most profitable agents' actions recovers a coherent strategy; (4) the exchange matching engine is an "actual instance" of a betting exchange, so microstructure is faithful.

## 5. Features / target
- Features: race-state + market-state at decision time. Top by F-score: distance (8680), time (6642), rank (1276) — the model essentially keys on how far into the race it is and who leads.
- Target: binary back/lay decision.

## 6. Validation design
- 5-fold CV + grid search for hyperparameters; early stopping (halted at 452 of 1000 boosting rounds).
- Profit validation: two distinct population scenarios, 100 races each, non-parametric significance tests (all nulls "roundly rejected"; largest p = 0.0017 for Privileged vs XGBoost in scenario 2).
- Honest framing: explicitly a proof-of-concept; no real-money claim.

## 7. Numerical results / baselines
- Optimal hyperparameters: colsample_bytree=1.0, eta=0.3, gamma=0, max_depth=6, subsample=1.0; n_estimators up to 1000 with early stopping (halted at 452).
- Classification: accuracy 0.88 overall; lay (class 0): precision 0.88/recall 0.98/F1 0.93; back (class 1): precision 0.85/recall 0.41/F1 0.56 — poor back-class recall (confusion: 72521 TN, 1197 FP, 6730 TP, 9541 FN).
- Profit: XGBoost agent significantly more profitable than every baseline in both scenarios — including the Privileged (private-simulation) agent, p = 0.0017 — i.e., the learner beats the best teacher.
- Repos: https://github.com/ChawinT/ (XGBoost_TBBE for data gen, XGBoost_ModelTraining for training/testing).

## 8. Code / data availability
Full open-source release: two GitHub repos under github.com/ChawinT/ — XGBoost_TBBE (BBE data collection + XGBoost betting agent integration) and XGBoost_ModelTraining (training, optimization, hypothesis tests).

## 9. Leakage & limitations
- Circular-simulator risk: the learner is trained and tested inside the same ABM; beating simple scripted agents in their own simulator is a much weaker claim than beating real markets. No real-data validation whatsoever.
- The learned policy is essentially "back/lay based on distance + time + rank" — a race-shape heuristic with no transferable content to NFL (no analog of mid-race distance-to-finish dynamics in a form XGBoost can reuse directly).
- Class imbalance: back-class recall 0.41 means the strategy misses most back opportunities; profitability comes from lay selectivity.
- Profitability in a commission-taking simulated exchange with fixed strategy populations is fragile to population composition (only 2 scenarios tested).
- Authors' own caution: "a lot of further development work and much more extensive testing would be required" before real-money use.

## 10. GSE overlap
Per existing-research-map: the RL/bandits-for-pick-selection lane is a priority GAP (no corpus entry on learning wager-placement policies), and the in-play spread/total modeling lane is thin. This paper FILLS the "learned dynamic wager placement" concept slot at proof-of-concept level: it is the only corpus entry that (a) trains a model to place bets (not just predict outcomes) and (b) evaluates on profit rather than accuracy. It overlaps conceptually with the ABM-exchange idea in the triage set (prediction-market microstructure) but no in-repo entry implements an imitation-learning betting policy. Does not duplicate: there is no NFL or real-data betting-policy learner in the corpus.

## 11. GSE implementation spec
- Port the LEARNING LOOP, not the horse-race policy: build a GSE in-play simulator (or use recorded NFL live-odds + win-probability traces) as the synthetic environment; define a set of simple baseline in-play betting policies (e.g., always-back-closing-favorite, momentum-chaser, Kelly-on-live-model-edge); record their actions and profits; train XGBoost to imitate the most profitable agents' back/lay decisions from (game-state, live-market-state) features; deploy the learned policy back into the simulator and test for the "beats every teacher" effect.
- Features for NFL: score differential, time remaining, down/distance/field position, live spread/total, pre-game edge, market move since kickoff.
- Effort: 1–2 weeks for a first in-play sandbox; the paper's code is the template for the agent harness.

## 12. Reproducible test
- Dataset: historical NFL live odds (Odds API or archived) + nflverse play-by-play → reconstruct per-minute game-state and live-spread/total panels for 2023–2024 seasons.
- Baseline policies: 4–5 scripted in-play strategies with flat stakes; profit per game as metric.
- Test: train XGBoost on top-20% most profitable scripted actions; evaluate learned policy out-of-sample (2025 holdout) on profit vs every baseline. Gate on real recorded data, not a self-built simulator.

## 13. Acceptance / rejection gate
ADOPT the imitation-learning loop for GSE's in-play lane only if the learned policy beats every scripted baseline on 2025 holdout profit with p < 0.05 (Wilcoxon, as in the paper). If it merely matches the best baseline, keep the scripted policies and the recorded live-odds dataset as the asset; reject the "learner beats teachers" claim as a simulator artifact.

## 14. Improvement experiment
Online learning extension (the authors' own future-work item): replace batch retraining with an online feedback loop where the XGBoost agent updates its policy during live games from realized outcomes; compare cumulative profit of online vs batch policies across a season. A second experiment: swap the binary back/lay objective for stake sizing (reg:squarederror on Kelly fraction) so the agent learns how much to bet, not just which side — the paper's fixed-stake setup leaves the sizing question entirely open.
