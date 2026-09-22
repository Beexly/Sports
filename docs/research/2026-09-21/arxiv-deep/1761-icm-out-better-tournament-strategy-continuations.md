# 1761 ICM Out! Better Tournament Strategy from Computed Continuations, vs. Solvers and LLMs (arXiv:2608.09586v1)

**Citation:** Boning Li, Longbo Huang (2026). *ICM Out! Better Tournament Strategy from Computed Continuations, vs. Solvers and LLMs*. arXiv:2608.09586v1. URL: https://arxiv.org/abs/2608.09586
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

Is the Independent Chip Model (ICM) — the standard tool that converts tournament chip stacks into prize equity — actually good enough to BUILD strategies on, or does it need to be replaced? The paper introduces Strategic-Continuation Optimization (SCO): enumerate current-decision outcomes → map to successor states → price those states with continuation values from the finite tournament model → optimize the policy. Against an identical optimizer using analytic ICM for successor pricing, SCO earns $214.33 more prize equity per hand and is favored in 2,433 of 2,838 matched decision points.

## 2. Dataset / schema

- **Setting:** three-player jam/fold poker tournament, $1,000,000 prize pool.
- **State space:** 946 distinct tournament states × 3 seats = 2,838 state–seat decision points, fully enumerated.
- **Opponents:** solver-built game-theoretic opponents; robustness checked against two LLMs and a family of non-modeling threshold players.
- **No historical dataset** — this is a computational game-theory paper; the "data" is the exhaustive state enumeration and the head-to-head policy comparison.

## 3. Method / model

SCO pipeline: (1) at a decision point, enumerate all current-hand outcomes; (2) map each outcome to its successor tournament state (updated stacks, eliminated players, new blinds/seats); (3) price each successor state with its continuation value — the expected prize equity computed by solving the finite tournament model forward (not by ICM's closed-form stack-share formula); (4) choose the action maximizing expected continuation value; (5) freeze the policy. The control (fixed-ICM) runs the SAME optimizer but prices successor states with analytic ICM, so the $214.33/hand gap isolates the value of continuation pricing vs ICM pricing. ICM's flaws diagnosed: reads only stack sizes; omits action order, blind obligations, seat rotation, and the elimination pressure a big stack exerts on short stacks it can bust.

## 4. Equations & assumptions

- ICM equity: E_i = Σ_k P_i(finish k)·prize_k, with P_i from the Malmuth-Harville stack-share recursion.
- SCO value: V(s, a) = Σ_{s'} P(s'|s,a)·C(s'), where C(s') is the continuation value — expected prize equity from state s' under optimal subsequent play, computed by backward induction on the finite tournament tree.
- Comparison metric: mean absolute value error of ICM vs SCO continuation values = **$9,036** across 2,838 state–seats (on a $1M pool).
- Policy difference: SCO shifts jam frequency by **14.08%** on average (32.42% at the button) relative to ICM-priced ranges.
- Assumptions: three-player jam/fold is representative; opponents play fixed policies during evaluation; the finite-horizon backward induction is computationally feasible (it is, for 946 states — scaling to larger tournaments is the open problem).

## 5. Features / target

Features: tournament state (stack vector, blinds, seat order, payout ladder). Target: the jam/fold policy (a mapping from state–seat to action probabilities) maximizing expected prize equity. The paper's real output is methodological: the SCO procedure itself.

## 6. Validation design

Exhaustive: all 946 states × 3 policy owners evaluated; each focal-policy change tested holding opponents AND the continuation evaluator fixed (clean causal isolation). Robustness: the SCO > ICM ordering survives swapping solver opponents for LLMs and threshold players. No sampling error — full enumeration.

## 7. Numerical results / baselines

- ICM mean absolute value error vs SCO continuation values: **$9,036** per state–seat (on $1M pool).
- SCO jam-frequency shift vs ICM: **14.08%** average, **32.42%** at the button.
- SCO prize-equity gain: **+$214.33 per hand** on average.
- SCO favored in **2,433 of 2,838** matched decision units (85.7%).
- Ordering robust to LLM and threshold-player opponents.

## 8. Code / data availability

No code repo linked in the paper. Method fully specified (backward-induction continuation computation, policy optimization loop). The 946-state tournament model is reimplementable from the paper's description.

## 9. Leakage & limitations

- **Poker-specific:** three-player jam/fold Hold'em; the state space (946 states) is tiny compared to a DFS slate. Scaling continuation-value computation to DFS (thousands of players, continuous scores) requires approximation.
- **No real-money validation:** all results are computational; no historical tournament backtest.
- **Fixed opponents:** evaluation holds opponents fixed; in reality opponents adapt (though the LLM/threshold robustness checks mitigate this).
- **ICM as strawman?** The paper compares against analytic ICM, which practitioners already know is imperfect; the contribution is quantifying the cost ($214/hand) and providing the SCO replacement, not discovering ICM's flaws.
- **2026 paper:** very recent; no independent replication yet.

## 10. GSE overlap

The corpus has payout-structure papers (1601.04203 on DFS payout design) but NO ledger covers tournament-equity computation — how to convert a lineup's score distribution into expected PRIZE given a payout ladder and field. This paper's SCO is the methodological template: enumerate lineup outcomes → map to payout-ladder positions → price with continuation values → optimize construction. The "$9,036 ICM error" result is a cautionary tale for any naive payout-equity heuristic GSE might use. Directly informs "payout-structure exploitation" in the lane brief.

## 11. GSE implementation spec

1. **DFS continuation-value pricer:** for a given lineup and payout ladder, compute expected prize = Σ_{score} P(lineup scores s)·payout(rank(s vs field distribution)). Approximate the field score distribution from historical contest data or a synthetic sharp field. This replaces any "expected score" objective with "expected prize" in GPP construction.
2. **SCO-for-lineups:** adapt the pipeline — enumerate lineup perturbations (player swaps) → map to score-distribution shifts → price via the expected-prize pricer → hill-climb. This is a payout-aware local search for GPP lineups.
3. **ICM-analogue audit:** quantify how much GSE's current "maximize expected score" heuristic costs in expected prize vs the continuation pricer, mirroring the paper's $214/hand audit. If the gap is large, switch GPP objectives to expected prize.
4. Cost: ~1 week (expected-prize pricer ~150 lines; audit is a batch job).

## 12. Reproducible test

Dataset: 2024 DK NFL GPPs with published payout ladders. Build the expected-prize pricer using GSE score distributions + historical field score distributions. Baselines: (a) max-expected-score lineup; (b) max-expected-prize lineup (SCO-adapted). Metrics: simulated expected prize over 10,000 slate simulations; realized prize on actual 2024 contests. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the expected-prize objective if** on 2024 GPP backtests the max-expected-prize lineups beat max-expected-score lineups on realized prize by ≥15% across ≥15 GPPs AND the simulation shows the gap comes from payout-ladder positioning (not just variance); **reject** if the field-distribution estimate is too noisy (expected-prize ranking flips with small field-model changes) — in which case keep expected-score but add the paper's diagnostic (report the ICM-analogue error of the score heuristic). Kill if the pricer can't be built in 1 week.

## 14. Improvement experiment

**Dynamic continuation for late swap:** extend the pricer in-game — at halftime/late-swap windows, recompute each lineup's expected prize conditional on observed scores (some players finished, some yet to play), and recommend swaps maximizing the conditional expected prize. Hypothesis: late-swap by expected prize (not expected score) captures payout-ladder convexity the score heuristic misses (e.g., swapping to a high-variance player when you need a top-0.1% finish). Test on 2024 Showdown/2-game slates with late-swap; success = ≥10% prize improvement over score-based late swap.

**Verdict:** ADAPT — SCO's enumerate→successor-state→continuation-value pipeline is the correct architecture for payout-aware DFS tournament strategy, and the $9,036 ICM error quantifies why naive equity heuristics fail. Port from poker tournaments to GPP payout ladders.
