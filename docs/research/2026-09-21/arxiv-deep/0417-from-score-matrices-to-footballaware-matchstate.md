# [0417] From Score Matrices to Football-Aware Match-State Simulation: An Auditable LLM Harness for Exact-Score Reranking (arXiv:2608.05030v1)

**Citation:** Shaopeng Liang (2026). *From Score Matrices to Football-Aware Match-State Simulation: An Auditable LLM Harness for Exact-Score Reranking*. arXiv:2608.05030v1. URL: https://arxiv.org/abs/2608.05030v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1008 lines).
**Verdict:** REJECT as a predictive model for GSE — the LLM reranking edge is not statistically significant, the dev slice informed the design, and a closed-weight LLM may have memorized outcomes (the authors' own caveat); ADOPT the paper's audit architecture (artifact freezing, input/output hashes, evidence cutoffs, schema validation) as process discipline around GSE's engine.

## 1. Research question
Can a large language model, given a frozen statistical score matrix plus a structured pre-match evidence packet, rerank exact-score candidates better than the score matrix alone — and can the whole pipeline be made auditable (frozen artifacts, hashes, evidence cutoffs, schema validation) so that LLM-assisted forecasting is reproducible and honest about its limits?

## 2. Dataset / schema
- 18,665 matches from 2015-16 through 2024-25, covering five top domestic leagues plus UEFA Champions League, Europa League, and Conference League.
- V1 parameter selection: training seasons through 2021-22; validation 2022-23 through 2024-25 — 5,330 domestic validation matches.
- LLM development: retrospective replay of the first 150 matches of the 2025-26 English Premier League (the first 100 explicitly informed V4's design).
- Schema: match results, pre-match evidence packets (team news, tactical notes — exact fields per the paper's prompt spec), score matrices, frozen Top-10 candidate lists, LLM path annotations.

## 3. Method / model
- V1 (statistical base): dynamic GAS (Generalized Autoregressive Score) model of team attack/defense strength and vulnerability, with half-life h = 1,440 days; gains g_a = 0.04 (attack), g_v = 0.02 (vulnerability); Dixon–Coles correction ρ = −0.05 on the score matrix τ_{xy}(λ_H, λ_A, ρ).
- V2: residual-sandwich correction on V1 outputs.
- V3/V4 ("mathematics + LLM"): V1's score matrix generates a frozen Top-10; the LLM must build three explicit goal-by-goal paths from 0–0 (each step: one home goal, one away goal, or a stop), reassessing after every goal the leader's risk reduction, the trailer's pressure and response capacity, newly exposed space, fatigue, substitutions, and key matchups; the three terminal scores are the returned Top-3. V4 adds a shared root verdict on whether the 0–0 equilibrium breaks and a shared cascade assessment (open / neutral / closing) after the first goal. Four clearly separated design iterations (V1–V4).
- Audit harness: frozen inputs/outputs with hashes, strict evidence cutoffs, schema validation of LLM outputs, separation of candidate coverage from reranking quality.

## 4. Equations & assumptions
- Dixon–Coles adjusted score probabilities: τ_{xy}(λ_H, λ_A, ρ) with ρ = −0.05 (paper's notation).
- Proper scoring rules referenced for V1's native 1X2 distribution: log loss, Brier score, ranked probability score (RPS). The paper states the LLM ranking versions "did not emit normalized probabilities, so proper scoring rules cannot be computed for them."
- Assumptions: (a) the score matrix is an "unconditional prior and plausibility map, not a final answer"; (b) goal-by-goal path simulation captures real tactical dynamics; (c) the closed-weight LLM has no outcome knowledge past the evidence cutoff — which the authors explicitly say "cannot [be] rule[d] out."

## 5. Features / target
- Inputs: V1 score matrix + frozen Top-10 + complete pre-match evidence packet (prompt explains matrix semantics; LLM must expose three paths from 0–0 with per-node score, time band, remaining time, stop-vs-continue evidence).
- Target: exact-score Top-1 and Top-3 accuracy.

## 6. Validation design
- V1 selected on 2015-16–2024-25 with a clean 2022-23–2024-25 validation window (5,330 matches).
- LLM iterations developed on a retrospective replay of the first 150 2025-26 EPL matches — the first 100 explicitly informed V4's design, so V4's numbers on the 150 are in-sample by construction. The paper is honest: "These results are exploratory rather than a claim of state-of-the-art performance: the slice informed model development."
- No preregistered live evaluation. The paper's own §7-equivalent proposes the correct future protocol: freeze leagues/rounds, evidence cutoff, model version, prompt/schema hashes, candidate rules, calibration procedure, primary metric (a proper score on normalized probabilities), and stopping rule — "registered before fixtures begin."

## 7. Numerical results / baselines
- V1 validation (5,330 domestic matches): 0.9855 1X2 log loss, 0.5876 Brier score, 0.2004 RPS, 52.8% accuracy.
- Development replay (first 150 2025-26 EPL), exact score: V1 Top-1 15/150 (10.0%), Top-3 40/150 (26.7%); V3 18/150 (12.0%), 45/150 (30.0%); V4 22/150 (14.7%), 46/150 (30.7%).
- V1 native 1X2 on the same 150-match slice: 80/150 (53.33%) accuracy, 0.987803 log loss, 0.586970 Brier, 0.209451 normalized RPS — the paper notes V4 "does not outperform V1's native 1X2 probability decision."
- McNemar tests (V4 vs V1): Top-1 p = 0.2295, Top-3 p = 0.3075 (not significant), score-derived 1X2 p = 0.0024.
- Candidate coverage: V1 Top-10 contained the true score in 116/150 (77.3%); V4's deterministic anchors expanded theoretical coverage to 127/150 (84.7%), +11 matches — but an added anchor entered the final Top-3 in only 3 matches and none was an exact hit.
- Failure modes: none of the eight 0–0 results appeared in Top-3 ("0–0 remained unsolved"); among 14 actual 1–1s, V4 placed 1–1 first 4 times and in Top-3 ten times; high-total matches (≥4 goals): 4/43 exact; margin ≥3: 3/24.
- LLM behavior diagnostics: all 150 root verdicts selected a first goal (never predicting 0–0); first-100 cascade labels: 72 open, 21 neutral, 7 closing — "semantically rich but poorly calibrated."

## 8. Code / data availability
No code or data links stated in the extracted text. The harness is described as a process; the LLM is closed-weight.

## 9. Leakage & limitations
- Fatal for any predictive claim: a closed-weight LLM trained on internet data up to 2025–26 may have memorized the "future" match outcomes; the authors explicitly cannot rule this out ("input isolation cannot rule out outcome knowledge in a closed-weight LLM").
- The development slice informed V4's design — V4's 14.7%/30.7% are in-sample descriptive statistics, not an evaluation.
- LLM outputs carry no normalized probabilities, so no proper scoring is possible; Top-1/Top-3 hit rates are improper and gameable.
- Top-1/Top-3 gains over V1 are not statistically significant (McNemar p = 0.2295 / 0.3075).
- Added tail coverage produced zero new exact hits — the mechanism doesn't work where it's needed.
- 0–0 is structurally unsolved: every root verdict predicts a first goal.
- External validity to NFL: the statistical base (GAS + Dixon–Coles) is soccer-specific; the transferable part is the audit architecture, not the model.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's corpus already covers Poisson/Dixon–Coles modeling, proper scoring rules, and calibration methods — so V1's statistical machinery is **duplicate**. The **new capability** worth taking is the audit architecture: artifact freezing, input/output hashes, strict evidence cutoffs, schema validation, and the discipline of separating candidate coverage from reranking quality. The map lists no equivalent reproducibility/anti-leakage harness around GSE's engine.

## 11. GSE implementation spec
- Do NOT implement LLM reranking of GSE outputs. Implement the audit harness around the existing GSE engine:
  - Freeze every backtest's inputs (nflverse snapshot hash, odds snapshot hash, feature code hash) and outputs (pick list with hashes) before evaluation.
  - Enforce evidence cutoffs: no feature may use data timestamped after the pick timestamp; add an automated cutoff checker.
  - Schema-validate all engine outputs before they reach content or the public pick record.
  - Log candidate coverage vs selection quality separately (the paper's key diagnostic discipline).
- Estimated effort: 1 week for a single engineer; no model training involved.

## 12. Reproducible test
- Dataset: GSE's 2024 season backtest (existing engine outputs).
- Procedure: rerun the full 2024 backtest twice from frozen artifacts; run the evidence-cutoff checker over all features.
- Metric: bit-identical reproduction of pick lists across reruns; count of cutoff violations detected.
- Baseline to beat: current undocumented rerun process (expected: non-reproducible without the harness).

## 13. Acceptance / rejection gate
ADOPT the audit harness permanently IF it achieves bit-identical 2024 backtest reproduction AND its cutoff checker surfaces ≥ 1 genuine lookahead violation in the existing pipeline; the LLM reranking idea stays REJECTED until a preregistered live evaluation with normalized probabilities shows a statistically significant proper-score gain (McNemar-style test, p < 0.05) on ≥200 unseen matches. Gate fixed before running.

## 14. Improvement experiment
Calibrate the LLM's path signals instead of discarding them: map root-verdict and cascade labels to empirical outcome frequencies with global shrinkage (the paper notes they are "semantically rich but poorly calibrated"), and force normalized probabilities via constrained decoding so proper scoring becomes possible. Then run the paper's own proposed preregistered protocol. This goes beyond the paper by fixing its two admitted defects — calibration and improper metrics — before any claim is made.
