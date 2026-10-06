# Deep-Research Ledger 1229 — arXiv:2603.13581v1 (math.OC, 13 Mar 2026)

**Title:** Single-Event Multinomial Full Kelly via Implicit State Positions
**Author:** Christopher D. Long
**Version read:** v1 (13 Mar 2026). Full read verified on 2026-09-21: complete expository derivation (problem setup, fixed-support cash formula, canonical stake formula, greedy support rule, terminal-wealth characterization). Text source: `2603.13581.pdf` → `pdftotext -layout` (2,369 words).

## 1. Question asked

For a single event with M mutually exclusive outcomes (multinomial), what is the exact full-Kelly staking rule — which outcomes get positive stake, how much cash is held back, and what is the closed-form solution?

## 2. Dataset / schema

None. Pure expository theory — no dataset, no numerical validation, no code.

## 3. Method

Complete derivation from first principles:
1. **Setup:** subjective probabilities p_i, state prices q_i = 1/O_i (O_i = decimal odds), cash reserve c, stakes x_i; budget c + Σx_i = 1.
2. **Objective:** max Σ_i p_i·log(c + x_i/q_i) — expected log terminal wealth with cash c held back.
3. **Fixed support:** for a given bet set A, optimal cash c_A = (1 − P_A)/(1 − Q_A) where P_A = Σ_{i∈A} p_i, Q_A = Σ_{i∈A} q_i.
4. **Canonical stakes:** x_i⋆ = (p_i − c·q_i)_+ — bet only where subjective probability exceeds cash-scaled state price.
5. **Greedy support rule:** sort by edge ratio r_i = p_i/q_i descending; expand the support while r_{k+1} > c_k (the cash level implied by the current support).
6. **Terminal wealth:** optimal W_i⋆ = max(c⋆, p_i/q_i).

## 4. Equations / assumptions

- max_{c,x≥0} Σ p_i log(c + x_i/q_i) s.t. c + Σx_i = 1.
- c_A = (1 − P_A)/(1 − Q_A); x_i⋆ = (p_i − c⋆q_i)_+; W_i⋆ = max(c⋆, p_i/q_i).
- Greedy: sort r_i = p_i/q_i desc, accept outcome k+1 while r_{k+1} > c_k.
- **Assumptions:** single event, mutually exclusive exhaustive outcomes; known subjective p_i; bookmaker odds fixed and simultaneously available; no stake limits; log utility; full Kelly (no fraction).

## 5. Features / target

Features = (p_i, q_i) pairs per outcome. Target = the optimal (c⋆, x⋆) — cash reserve plus stake per outcome.

## 6. Validation

None — no empirical or numerical validation of any kind. The "validation" is mathematical: the derivation is self-contained and the greedy rule is proved optimal for the stated program.

## 7. Exact results

- Closed-form full-Kelly multinomial solution: cash c_A = (1−P_A)/(1−Q_A); stakes x_i⋆ = (p_i − c⋆q_i)_+; terminal wealth W_i⋆ = max(c⋆, p_i/q_i).
- Support characterization via sorted edge ratios r_i = p_i/q_i with threshold rule r_{k+1} > c_k.
- Interpretation: optimal wealth is the cash floor c⋆, except on outcomes where the probability-to-price ratio exceeds it.

## 8. Code / data availability

None. No code, no data — a 2,369-word derivation note.

## 9. Leakage / limitations

- **No validation whatsoever** — the formulas are derived but never tested, even on synthetic odds.
- Full Kelly only; no fractional variant, no risk control (contrast with 1222/1223 in this wave).
- Assumes p_i known exactly — no estimation error, which is the entire practical problem (see 1228).
- Single event only; does not handle multiple simultaneous events / portfolio effects (see 1231/2604.24723 for the multivariate case).
- Assumes all odds available simultaneously at fixed prices; no line movement, no stake limits, no simultaneous-bet correlation.

## 10. GSE overlap

Directly applicable to single-slate multi-outcome markets (e.g., division winner, award markets, golf tournaments):

- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — Kelly log-wealth reward; this paper gives the exact multi-outcome Kelly rule the benchmark's reward approximates.
- Wave-3: 1231/2604.24723 (multivariate Kelly — the multi-event generalization), 1222/2109.10814 (fractional Kelly — the risk control this paper lacks).

## 11. Implementation spec (GSE)

**Multinomial Kelly pricer for futures/award markets.** For a market with M outcomes (model probs p_i, book odds O_i):
1. Compute q_i = 1/O_i, r_i = p_i/q_i; sort descending.
2. Greedy support: start A = {top outcome}, compute c_A; add next outcome while r_{k+1} > c_k.
3. Stakes x_i = (p_i − c⋆q_i)_+ on the support; hold c⋆ cash.
4. Apply the house fractional overlay: stake α·x_i with α from the variance-budget rule (1222/§11), since the paper's full Kelly is too aggressive standalone.
5. Recompute when odds move; never bet outcomes outside the support (x_i = 0 exactly).

## 12. Reproducible test

Construct a synthetic 8-outcome market with known p_i and random book margins; implement the greedy rule; verify (a) KKT conditions hold at the returned (c⋆, x⋆), (b) no excluded outcome has r_i > c⋆, (c) brute-force grid search over supports agrees on the optimum.

## 13. Numeric gate

On 1,000 random synthetic markets (M ∈ {4,…,20}): greedy support matches brute-force optimal support in 100% of cases, and the objective value matches to 10⁻⁹ — the derivation must hold exactly, not approximately.

## 14. Improvement experiment

Backtest §11 on a real futures market (e.g., archived division-winner odds vs GSE model probs): compare P&L of (a) greedy multinomial Kelly at α = 1 vs (b) fractional α = 0.25 vs (c) flat stakes. Expectation: (a) has the highest variance and likely a deep drawdown; (b) should dominate on risk-adjusted log-wealth — confirming that the paper's formula needs the fractional overlay to be deployable.

**Verdict:** ADAPT
