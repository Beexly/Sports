# 1760 The Madness of Multiple Entries in March Madness (arXiv:2407.13438v1)

**Citation:** Jeff Decary, David Bergman, Carlos Cardonha, Jason Imbrogno, Andrea Lodi (2024). *The Madness of Multiple Entries in March Madness*. arXiv:2407.13438v1. URL: https://arxiv.org/abs/2407.13438
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

For a bettor who can submit MULTIPLE entries to a top-heavy tournament pool (e.g., 100 brackets in a $1M winner-take-all-ish pool), what is the optimal portfolio? The paper maximizes the Expected Maximum Score (EMS) across the entry set, proves EMS is monotone submodular, develops exact DP evaluation plus SAA/greedy/heuristic optimizers, and validates on a real 2023 DraftKings $1M March Madness pool where their 100-entry portfolio had a simulated 2.2% win probability.

## 2. Dataset / schema

- **Training:** March Madness tournaments 2017–2023 (excluding canceled 2020); tournament structures from Kaggle; team win-probability matrices from 538 (Elo-based).
- **Evaluation:** out-of-sample on 10,000 simulated tournament brackets per solution; plus a real-world case study on the DraftKings 2023 March Madness pool (12,605 entries, 8,967 participants, $100/entry, 100-entry max, $1M first prize = 80% of pool).
- **Scoring:** standard bracket scoring (192 max points).

## 3. Method / model

Objective: max over entry-sets ℰ of E[S(ℰ)] where S(ℰ) = max_{e∈ℰ} score(e, ω), ω a random tournament outcome. Methods compared:
- **Exact DP:** dynamic program computing EMS exactly for 2 entries (2,548.42s for 64-team tournament — too slow for optimization loops).
- **SAA (Sample Average Approximation):** MILP over a sampled scenario set, optimizing all entries simultaneously.
- **SIP (Sequential IP):** myopic — optimize entries one at a time.
- **G-SAA:** greedy SAA (add entries one at a time, each maximizing marginal EMS gain — exploits submodularity).
- **PROP / PROP+:** "proportional" heuristics allocating entries proportional to team win probabilities (PROP+ adds diversification tuning).
- Key theoretical results: EMS is monotone submodular (Prop. 1) → greedy has (1−1/e) approximation in principle; the best individual entry need NOT belong to the optimal portfolio; optimal diversification increases as underlying win probabilities approach 0.5.

## 4. Equations & assumptions

- EMS: E[S(ℰ)] = Σ_ω P(ω)·max_{e∈ℰ} s(e,ω), approximated by (1/N)Σ_{n=1}^{N} max_{e∈ℰ} s(e,ω_n).
- Submodularity: E[S(ℰ∪{e})] − E[S(ℰ)] is decreasing in ℰ (diminishing returns to additional entries).
- SAA MILP: max (1/N)Σ_n z_n s.t. z_n ≤ Σ_e y_{e,n}·s(e,ω_n) (z_n = best entry's score in scenario n), entry-feasibility constraints.
- Assumptions: 538 win probabilities are correct; bracket entries score independently given outcomes; the 10,000-scenario evaluation set represents the true distribution; no ownership/field modeling (pool opponents' entries are not modeled — pure max-score objective).

## 5. Features / target

Features: 538 team win-probability matrix (pairwise), tournament bracket structure, scoring vector. Target: the SET of entry vectors (brackets) maximizing EMS. No learned model — the "learning" is the optimization over entry sets given fixed probabilities.

## 6. Validation design

In-sample: SAA optimized on sampled scenarios. Out-of-sample: every method's final entry set evaluated on 10,000 FRESH simulated tournaments (empirical EMS). Monte Carlo quality check: with 250 scenarios, worst-case 95% CI widths were 0.44 points (2 entries) and 0.39 points (100 entries) out of 192 — tight. Real-world: the PROP+ 100-entry portfolio simulated against the actual 2023 DK pool structure → 2.2% win probability for the $1M prize.

## 7. Numerical results / baselines

Empirical EMS (Table 7, out-of-sample, 192 max):
- 2 entries: SAA 105.7, SIP 103.1, G-SAA 104.7, PROP 100.1, **PROP+ 105.9**.
- 3 entries: SAA 111.5, SIP 107.9, G-SAA 110.7, PROP 103.5, **PROP+ 111.5**.
- 100 entries: **PROP+ 138.62** (dominates; also highest SD — desirable for top-heavy payouts).
- Simultaneous optimization (SAA, PROP+) beats myopic sequential (SIP) — "avoiding a myopic selection process" matters.
- Real DK 2023 pool: PROP+ 100-entry portfolio → **2.2% chance of winning $1M** ($100/entry × 100 = $10,000 staked; 2.2% × $1M = $22,000 expected gross — positive EV before considering the 80%-to-winner structure nuances).

## 8. Code / data availability

Paper states "code and instances will be made available upon acceptance" — availability unverified (not confirmed as of ledger date). Methods fully specified (SAA MILP formulation, greedy procedure, PROP+ heuristic pseudocode). Data: Kaggle brackets + 538 probabilities (public).

## 9. Leakage & limitations

- **No field modeling:** EMS maximizes your best entry's score, but winning requires beating 12,604 other entries; the 2.2% figure simulates YOUR entries against random outcomes, not against a realistic field of sharp entries. True win probability is lower if the field is correlated/sharp.
- **Bracket-specific:** the DP, scenario structure, and PROP heuristics exploit single-elimination bracket structure; porting to DFS lineups requires re-deriving the scenario generator (player score simulations instead of game outcomes).
- **538 probabilities as truth:** any miscalibration in win probabilities propagates directly into entry selection; no robustness analysis.
- **Exact DP infeasible:** 2,548s for 2 entries on 64 teams — exact methods don't scale; everything practical is SAA/heuristic with sampling error.
- **Code unreleased:** "upon acceptance" promise unverified; reimplementation needed.

## 10. GSE overlap

The corpus has multi-entry portfolio IP (1091) and single-lineup optimizers, but NO ledger covers: (a) the EMS objective with submodularity theory, (b) SAA-over-scenarios for entry-set optimization, (c) the PROP+ proportional-diversification heuristic, or (d) the "best entry ≠ best portfolio member" result. This is the n-entry generalization of 1759's 2-entry E[max]. The diversification finding (diversify more when probabilities → 0.5) is directly relevant to GSE's GPP construction.

## 11. GSE implementation spec

1. **DFS-EMS optimizer:** port the SAA MILP to DFS: scenarios = N simulated slates (player scores drawn from GSE's projection distributions with stacking correlations); entries = lineup vectors; objective = average over scenarios of max entry score. Solve with GSE's MILP stack.
2. **PROP+ for lineups:** adapt the proportional heuristic — allocate entries across player-exposure targets proportional to win-probability analogues (e.g., probability a player is in the optimal lineup), with the "+" diversification tuning toward 50/50 ownership leverage spots.
3. **Greedy SAA (G-SAA):** exploit submodularity — build the 150-entry GPP portfolio greedily, each new lineup maximizing marginal EMS gain over the existing set. This naturally produces diversified, contrarian portfolios.
4. **Diversification dial:** implement the paper's finding as a rule — when GSE's projections are confident (probabilities far from 0.5), concentrate; when uncertain, diversify exposures.
5. Cost: ~2 weeks (scenario generator exists in GSE sim; SAA MILP is the new piece).

## 12. Reproducible test

Dataset: 2024 NFL DFS season (DK main slates). Build scenario sets (10,000 simulated slates from GSE distributions). Baselines: (a) GSE's current multi-entry approach; (b) 150× independent max-EV lineups; (c) G-SAA portfolio; (d) PROP+ portfolio. Metrics: simulated EMS over fresh 10,000 scenarios; realized best-entry percentile in actual 2024 contests. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the EMS portfolio optimizer if** on 2024 backtests the G-SAA or PROP+ 150-entry portfolio beats the 150×-max-EV baseline on simulated EMS by ≥5.0 points AND on realized best-entry finish percentile by ≥5 percentile points across ≥10 slates; **reject** if the SAA MILP doesn't solve within 30 minutes per slate (then fall back to pure PROP+/greedy heuristics, which the paper shows are competitive); **reject** the full SAA if scenario-count sensitivity is high (EMS ranking flips between 5k and 20k scenarios) — in that case adopt only the greedy + PROP+ heuristics. Kill if no code can be written in 2 weeks.

## 14. Improvement experiment

**Field-aware EMS (fEMS):** the paper's EMS ignores the field. Extend the objective to P(best entry beats the field's best entry): model the field as K synthetic sharp entries (generated by running the same optimizer with perturbed projections), and maximize (1/N)Σ_n 𝟙[max_{e∈ℰ} s(e,ω_n) > max_{k} s(f_k,ω_n)]. Hypothesis: fEMS portfolios sacrifice raw EMS but gain win probability by differentiating from sharp-field lineups (contrarian leverage). Test: simulate against a synthetic sharp field on 2024 slates; success = fEMS portfolio wins ≥20% more often than plain-EMS portfolio with ≤3-point EMS loss.

**Verdict:** ADAPT — The EMS/submodularity/SAA/PROP+ framework is the n-entry generalization GSE's multi-entry GPP construction needs, with a real-money 2.2% $1M-pool validation. Port from brackets to lineup scenarios.
