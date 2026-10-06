# [2090] SHARP: A Self-Evolving Human-Auditable Rubric Policy for Financial Trading Agents (arXiv:2605.06822)

**Citation:** Authors (2026). *SHARP: A Self-Evolving Human-Auditable Rubric Policy for Financial Trading Agents*. arXiv:2605.06822 (version verified via export API; v1 current). URL: https://arxiv.org/abs/2605.06822
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–4, Tables 1–3, Appendix F).
**Verdict:** ADAPT — the rubric (bounded condition-action rules) + attribution-agent + walk-forward-gate triad is the single most sports-transferable governance design in this lane: it solves exactly GSE's problem (noisy P&L-like backtest feedback, credit assignment, policy drift, auditability) and its ablations quantify the cost of free-form reflection.

## 1. Research question
LLM trading agents adapt via unbounded free-form prompt optimization, which in low-SNR, non-stationary markets with delayed scalar rewards (P&L) creates an intractable search space and a severe credit-assignment problem — the optimizer cannot distinguish systematic logic flaws from stochastic variance, causing policy drift. Can a neuro-symbolic alternative — confining reasoning to a bounded, human-readable rubric of explicit condition-action rules, evolved via attribution-guided atomic edits with walk-forward validation — achieve dynamic adaptation WITHOUT sacrificing auditability?

## 2. Dataset / schema
Daily long-short equity trading over universe U = {u_1,...,u_N}; three sectors (AI Tech, Biotech, Consumer Discretionary); 2025–2026 timeline deliberately chosen so model training cutoffs (GPT-4o-mini, GPT-4.1-mini) predate the data — explicit anti-leakage design. Walk-forward protocol: three windows, each = 4-month training (rubric evolves J=5 rounds from a shared generic-heuristic rubric R^(0); attribution examines K_attr=20 worst portfolio days per round) + out-of-sample test. Baselines: (a) non-LLM (Random L/S, tuned Momentum, tuned Mean Reversion); (b) Static rubric (no evolution); (c) LLM agents (Lopez-Lira, FinCon, FinHEAR) under identical portfolio constraints.

## 3. Method / model
SHARP = rubric R (bounded set of condition-action rules, |R| ≤ M_max, e.g. "IF VIX > 25 THEN reduce bullish return estimates by 30%") + tri-agent evolution loop:
1. **Attribution agent:** backtests R^(j-1) on D_train; examines the K_attr=20 WORST portfolio days (left-tail focus = automated tail-risk truncation); performs cross-sample diagnosis — which rule adjustments would have prevented the drawdown — filtering sporadic variance so only recurring failure modes drive updates. P&L is thus mapped back to discrete rule IDs (symbolic credit assignment).
2. **Evolution agent:** proposes atomic mutations P within the bounded symbolic space: modify a rule threshold (cond_k), adjust a signal weight (act_k), add a rule for an unhandled pattern, remove a misfiring rule. Bounded edits per round.
3. **Validation agent:** walk-forward gate — candidate rubric R* must beat the best-so-far by validation excess return e(·) with tolerance ε (exploration hyperparameter); rejected candidates discarded, previous rubric carries forward. This gate is "a critical regularizer against variance-induced policy drift."
Key empirical claim: free-form reflection "gradually dissolves the structured rules into untraceable prose," while atomic edits preserve "a full audit trail from each threshold change back to the error days that motivated it" (Section 4.4, Appendix F).

## 4. Equations & assumptions
Faithful formalism: rubric R with |R| ≤ M_max; evolution round j: backtest R^(j-1) on D_train → attribution over K_attr worst days → atomic mutation set P → validation: accept R* iff e(R*) > e(R_best) + ε (my paraphrase of the stated gate "where e(·) is the validation excess return and R* is the best rubric seen so far; the tolerance ε acts as a hyperparameter for exploration"). Assumptions: worst-day attribution isolates systematic flaws; bounded symbolic edits suffice for adaptation; walk-forward validation regularizes drift; LLM role can be confined to mapping unstructured inputs into the rubric's condition space.

## 5. Features / target
Inputs: daily market data + news (LLM maps news into rubric conditions); rubric rules. Target: portfolio excess return / Sharpe ratio out-of-sample. Reported: total return %, Sharpe, max drawdown, 3-sector averages.

## 6. Validation design
- Rolling walk-forward, 3 windows × (4-month train / OOS test); J=5 evolution rounds; K_attr=20.
- Anti-leakage: 2025–2026 data vs pre-2025 model cutoffs.
- Ablations (Section 4.4): (A1) no attribution (random rule edits); (A2) free-form reflection replacing structured edits; backbone swaps (Qwen-72B, Llama-70B).
- Four LLM backbones total.

## 7. Numerical results / baselines
(Exact quotes.)
- **3-sector average:** SHARP (GPT-4o-mini) evolves from Static +0.6% / +0.09 SR to **+20.9% / +1.83 SR**; SHARP (GPT-4.1-mini) from −4.4% / −0.36 to **+13.4% / +0.87 SR**. Closest contender FinCon-4o: +15.9% (SHARP leads by ~5pp on average; FinCon wins Biotech +18.8% vs +12.7%).
- Non-LLM baselines "economically negligible": tuned Momentum −5.0% avg, Lopez-Lira −0.6% to −3.5%, FinHEAR-4.1 +1.1%.
- **Ablation A2 (the killer result):** replacing structured edits with free-form reflection drops GPT-4o-mini Sharpe from **+2.45 to −0.84** and total return from **+33.2% to −12.1%** — "notably below the Static baseline that performs no adaptation at all." Free-form self-improvement is worse than doing nothing.
- Backbone transfer: rubric evolution lifts Qwen-72B +9.8pp (SR −0.10 → +0.88), Llama-70B +12.9pp (SR −0.69 → +0.72).
- Max drawdown: GPT-4o-mini −7.3% vs GPT-4.1-mini −27.3% (later-period signal decay noted).

## 8. Code / data availability
Not stated in the extracted text (no URL found in the sections read) — "None stated" in the accessible sections; hyperparameters/data details deferred to Appendix A.

## 9. Leakage & limitations
Equity results may not transfer to sports betting (different noise structure; P&L is continuous, bets are discrete); the 2025–2026 window is short (regime coverage thin); attribution over the 20 worst days could overfit to a single regime's tail (the −27.3% drawdown on 4.1-mini hints at decay the gate didn't catch); ε tolerance is a hand-set hyperparameter; no transaction-cost sensitivity shown beyond "none meaningful after costs" for baselines. For GSE: the rubric's condition space must be built from features the engine actually computes (no invented conditions); attribution needs a leak-proof backtest or it will attribute noise to rules and "fix" things that aren't broken — the same evaluator-grounding requirement as ledgers 2082–2084.

## 10. GSE overlap
**MOVE-37 FLAG:** SHARP is the governance layer for the entire MOVE-37 discovery loop: the production betting policy becomes a versioned, human-auditable rubric of condition-action rules (e.g., "IF wind > 15mph AND total < 44 THEN shade under by 0.5pt"), evolved by attribution-guided atomic edits with a walk-forward gate — replacing today's implicit policy (hand-tuned model + analyst judgment) with something Garrett can read, audit, and approve rule-by-rule. Existing-map check: no policy-evolution or rule-attribution machinery in the corpus; the engine's decision layer is a black box relative to this. The A2 ablation (+33.2% → −12.1% under free-form reflection) is the strongest evidence in this lane for WHY the discovery loop must be structurally constrained. **New capability** (auditable policy evolution); the natural production endpoint of ledgers 2082–2089.

## 11. GSE implementation spec
Adapt SHARP as the **production policy layer** fed by the discovery loop:
1. **Rubric schema:** bounded set (|R| ≤ 40) of condition-action rules over engine features: conditions on (wind, rest differential, line movement, matchup EPA deltas, calibration flags); actions = stake/shade adjustments or abstentions ("IF cross-market disagreement > 3pts THEN abstain"). Initial rubric R^(0) = current production logic, hand-transcribed.
2. **Attribution agent (weekly):** backtests current rubric on the last 4 months; examines the K_attr=20 worst betting days; cross-sample diagnosis maps losses to rule IDs (which rule fired on the losing bets? would a threshold change have avoided them?); filters one-off variance (bad beats) from recurring flaws (rule misfires in divisional unders).
3. **Evolution agent:** proposes atomic edits — threshold changes, new rules for unhandled patterns, removal of misfiring rules; bounded to ≤3 edits/round.
4. **Validation gate:** candidate rubric must beat the incumbent by ΔBrier ≥ 0.002 + ε on a walk-forward OOS window; else incumbent carries forward. Full audit trail: every rule change links to the error days that motivated it (the paper's Appendix-F property — this is what Garrett reviews).
5. **Effort:** 4–6 days (rubric DSL + backtest harness integration + three agents + audit log UI).

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout; paper bets = historical closing lines. **Protocol:** transcribe current production logic into R^(0); run J=5 evolution rounds on 2021–2024 (train) with K_attr=20 worst days; validate walk-forward on 2025. **Baselines:** Static rubric (no evolution); free-form reflection arm (A2 replication — let an LLM freely rewrite the policy); current production model. **Metrics:** 2025 ROI, Brier, max drawdown, and auditability (can a human trace each rule change to its motivating error days?).

## 13. Acceptance / rejection gate
**ADOPT if:** evolved rubric beats Static by ≥3pp ROI (or ΔBrier ≥ 0.002) on the 2025 walk-forward, the A2 free-form arm underperforms Static (replicating the paper's +33.2%→−12.1% pathology — confirming the constraint is load-bearing), max drawdown does not worsen vs Static, and every rule edit has a complete audit trail (rule ID → error days → validation score). **REJECT if** evolution can't beat Static (the production logic is already at the rubric's ceiling — keep Static and revisit with richer conditions), or attribution repeatedly blames rules for what the log shows is variance (attribution precision < 60% on a hand-labeled sample of 40 error days), or any round's edits exceed the atomicity bound (the evolution agent is smuggling in rewrites).

## 14. Improvement experiment
Beyond the paper: add a **rule-interaction check** — before accepting an atomic edit, test the edited rule against every other rule on the training window for interaction effects (two rules that are each fine alone but jointly overbet divisional unders). Hypothesis: the paper's atomic-edit framing ignores interactions, which is where real policy blowups live; an interaction screen should cut the evolved rubric's max drawdown without hurting return. Test: evolve with and without the interaction screen over 3 walk-forward windows, comparing drawdown and return.
