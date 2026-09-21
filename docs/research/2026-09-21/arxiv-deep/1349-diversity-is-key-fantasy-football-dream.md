# [1349] Diversity is Key: Fantasy football dream teams under budget constraints (arXiv:2211.02417v3)

**Citation:** Josef Gullholm, Jil Klünder, Julie Rowlett, Jonathan Stålberg (2024). *Diversity is Key: Fantasy football dream teams under budget constraints*. arXiv:2211.02417v3. URL: https://arxiv.org/abs/2211.02417v3
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 752-line extraction; all sections read). **Replaces:** ledger 1188 (REJECT).
**Verdict:** ADAPT

A rigorous dominance-pruning data-reduction algorithm that makes salary-cap fantasy lineup optimization tractable (10^23 → 10^7 combinations, verified by integer programming, code on GitHub) — directly reusable as a preprocessing step for GSE's DFS optimizers — plus a diversity-of-salaries empirical regularity with plausible GPP-exposure applications.

## 1. Research question
Given a fixed salary budget, what does the highest-scoring possible fantasy football team look like — specifically, what is the distribution of salaries (and other football variables) across the optimal XI — and can the combinatorial explosion of all possible teams be tamed enough to actually compute these optima?

## 2. Dataset / schema
- Fantasy Premier League (FPL), **5 seasons 2016/17–2020/21**; 684 active players (2016/17) to 714 (2020/21).
- Sources: FPL website API (current season, with permission) + Vaastav's GitHub FPL historical repository [25] for prior seasons.
- Per player: id, end-of-season cost (£100k units), total season points, element type (1=GK, 2=DEF, 3=MID, 4=FWD). Data and Python code stated as available on GitHub.

## 3. Method / model
- **Data-reduction algorithm** (the paper's main methodological contribution): three-step dominance pruning — (1) per cost value and position, keep only the top-n_e scorers (n_e = max players of that position in any allowed formation); (2) per points value and position, keep only the cheapest n_e; (3) Algorithm 1: sweep budgets upward, discarding any player who is never in the affordable top-n_e (strictly dominated: higher cost + lower points than a same-position peer can never be in an optimal XI). Position-group combinations pruned the same way.
- **Verification**: an integer-programming formulation (PuLP; binary selection, formation constraints 1 GK / 3–5 DEF / 3–5 MID / 1–3 FWD / exactly 11 players / budget constraint, maximize total points) — a knapsack variant — reproduces the reduction algorithm's optima.
- **Diversity test**: the "bin method" (Algorithm 3): 11 equal bins spanning a team's variable range; ≤3 empty bins = diverse. Applied to salary and 12 football variables across 5 seasons × 7 formations × 11 budgets = **385 optimal teams**, plus a cross-season pool (69% diverse).

## 4. Equations & assumptions
- IP: maximize Σ points_i·x_i s.t. Σ GK = 1, 3 ≤ Σ DEF ≤ 5, 3 ≤ Σ MID ≤ 5, 1 ≤ Σ FWD ≤ 3, Σ x_i = 11, Σ cost_i·x_i ≤ budget, x_i ∈ {0,1}.
- Diversity: diverse ⟺ (# empty bins out of 11) ≤ 3.
- Assumptions: end-of-season cost and total points are the right sufficient statistics (in-season price changes ignored — justified by Figure 3.3 showing mostly small/no changes); optimal XI per budget is meaningful despite being computed with hindsight; salary ≈ competitive ability (citing Yaldo & Shamir [26]) for the theory link; the 7 listed formations exhaust realistic choices.

## 5. Features / target
No predictive features. Inputs: player cost, total points, position. Target (descriptive): the optimal XI per budget constraint and its salary/variable distributions.

## 6. Validation design
No predictive validation — this is a retrospective combinatorial analysis. Correctness validation: the IP solver agrees with the custom reduction algorithm on all optima. Robustness: results replicated across 5 seasons and with cross-season player pools. Random-team null computed analytically for the diversity claim (a random XI has ~6 players in 2 salary bins → ≥4 empty bins → not diverse).

## 7. Numerical results / baselines
- Reduction: ~**10^23** theoretical XIs (684 choose 11) → ~**7×10^7** after pruning; runtime from "a few thousand years" to "a matter of hours on a standard computer."
- Optimal-team points scale **logarithmically** with budget; 2020/21: budget 500 → **1,182 pts**; 1000 → **2,178 pts** (best actual cost 980).
- Dominant formations: **3-5-2, 4-5-1, 5-4-1**; clear gradient — lower budgets favor more defenders/fewer forwards, higher budgets the reverse (Figure 1).
- **72%** of the 385 optimal teams have diverse salary distributions; **69%** in the cross-season pool; **11 of 12** other variables (assists, goals, bonus, minutes, clean sheets, etc.) also diverse — only red cards non-diverse.
- Random-team null: a random XI is with high probability *not* diverse (33% of all players share one salary bin).

## 8. Code / data availability
Data and Python code (reduction algorithms + PuLP IP) stated as available on GitHub (repository named in text; exact URL in reference [10]/text — "our github repository").

## 9. Leakage & limitations
- **Oracle by construction**: optima use end-of-season totals — this is hindsight analysis, not prediction; the paper is explicit that it cannot predict next season's best team ("we cannot answer these questions with the present study").
- The diversity finding is correlational and retrospective; the Diversity Theorems [19] link is theoretical analogy, not causal evidence that *building* diverse teams *causes* wins prospectively.
- FPL/soccer-specific (15-man squads, 11 starters, 7 formations); end-of-season cost used instead of gameweek prices.
- Bin-method diversity threshold (≤3 empty bins) is ad hoc, though the random-team null gives it some grounding.

## 10. GSE overlap
Fills a **DFS-optimization methodology gap** in the corpus: no existing ledger provides a dominance-pruning preprocessor for salary-cap lineup MILPs. The map's DFS/props lane is thin by design (wave-3's mandate). The IP/knapsack formulation is standard, but the *three-step dominance reduction* with a correctness proof-by-IP-agreement is a concrete, implementable, code-backed contribution. The diversity result is a novel (if retrospective) empirical regularity with no corpus duplicate.

## 11. GSE implementation spec
- **Lift the dominance-pruning preprocessor into GSE's DFS optimizer**: before solving the weekly salary-cap MILP (DraftKings/FanDuel NFL), apply the paper's three-step reduction — per salary bucket and position keep only Pareto-optimal (salary, projection) players; drop any player strictly dominated by a cheaper-or-equal, higher-projected same-position peer. Expected effect: order-of-magnitude MILP speedup, enabling larger player pools and more GPP lineups per slate.
- **Diversity as a GPP construction heuristic**: test a lineup-diversity constraint (salary/projection spread across bins, à la Algorithm 3) in tournament lineups — the paper's 72% regularity suggests optimal ex-post lineups are rarely stars-and-scrubs clumps; evaluate whether diversity-constrained lineups improve realized GPP ROI vs pure expected-points maximization.
- Data: nflverse projections + DraftKings salaries. Effort: ~1 week to port the pruning + IP verification harness.

## 12. Reproducible test
- Dataset: 2022–2024 NFL seasons, DraftKings main-slate salaries + GSE/nflverse fantasy projections.
- Test 1 (correctness/speed): implement the three-step dominance reduction + PuLP MILP; verify identical optima vs unpruned MILP on 20 slates; measure speedup (target: ≥10× reduction in solver time).
- Test 2 (diversity heuristic): build GPP lineup sets with and without a bin-diversity constraint; compare realized ROI over the three seasons. Baseline: unconstrained max-projection MILP lineups.

## 13. Acceptance / rejection gate
**Adopt** the pruning preprocessor if it reproduces unpruned optima exactly on all test slates with ≥10× speedup. **Adopt** the diversity heuristic only if diversity-constrained GPP sets show positive realized ROI improvement over unconstrained sets across the three-season window; otherwise keep it as a descriptive curiosity.

## 14. Improvement experiment
Beyond the paper: make the reduction **projection-aware and dynamic** — the paper prunes on realized end-of-season points; the live version should prune on (projection, salary, ownership) triples and re-run weekly as projections update, turning a retrospective analysis into a forward DFS pipeline. Second: replace the ad-hoc bin-diversity rule with a learned diversification objective — fit, on historical slates, the salary/projection-spread characteristics of *winning* GPP lineups and constrain generation to that region, testing whether the paper's descriptive diversity becomes a predictive edge.

**Verdict:** ADAPT
