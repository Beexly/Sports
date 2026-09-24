# [1754] Gambler's ruin probability — a general formula (arXiv:1209.4203)

## 1. Citation and full-text-read statement
**Citation:** Guy Katriel (ORT Braude College) (2012). *Gambler's ruin probability — a general formula*. arXiv:1209.4203. URL: https://arxiv.org/abs/1209.4203
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML; Theorem 1 and both ruin formulas read in full, proof skimmed).
**Verdict:** ADAPT — one sentence: the exact ruin formula for arbitrary integer-valued payoff distributions gives GSE a closed-form ruin gate for real asymmetric bet P&L (win +1.91u vs lose −1u at −110), strictly generalizing 1753's ±1 case, but root-finding in the unit disk must be implemented numerically and validated.

## 2. Research question
For a gambler with initial wealth M playing i.i.d. games with a general integer-valued payoff distribution (max loss ν per game, positive expectation), what is the exact probability of ruin — a formula the author notes was "surprisingly not available in the literature" except in special cases?

## 3. Method / model
Payoffs X_t i.i.d. integers with P(X_t=k)=p_k, k ≥ −ν, max loss ν with p_{−ν}≠0, E[X_t]>0; ruin when wealth < ν (gambler must stop). Generating function p(z)=Σ_{k≥−ν} p_k z^k (meromorphic in |z|<1, pole of order ν at 0). Theorem 1: p(z)=1 has exactly ν roots η_j in the unit disk; ruin probability expressed through them via complete symmetric polynomials, or a Lagrange-interpolation form when roots are distinct.

## 4. Mathematics / equations / assumptions
- Setup: M ∈ ℕ initial wealth, M ≥ ν; E[X_t] = Σ k p_k > 0 (1); else P_ruin = 1.
- Theorem 1, Eq. (2): P_ruin(M) = Σ_{n=1}^{ν} Φ_{n,M−n+1}(η_1,…,η_n) Π_{j=1}^{n−1}(1−η_j), where Φ_{n,r} is the complete symmetric polynomial of order r and η_j are the ν roots of p(z)=1 in |z|<1.
- Distinct-roots form, Eq. (3): P_ruin(M) = Σ_{j=1}^{ν} η_j^M Π_{i≠j} (1−η_i)/(η_j−η_i).
- The two forms are algebraically equivalent; (2) handles multiplicities, (3) is cheaper with distinct roots.
- Assumptions: i.i.d. integer payoffs, bounded below (−ν), unbounded above allowed, positive drift, infinitely rich adversary.

## 5. Dataset / schema
None — probability theory. No empirical data.
## 6. Features and target
Not applicable (theory). Inputs: payoff distribution {p_k}, initial wealth M. Output: exact ruin probability.

## 7. Validation design
None empirical.

## 8. Exact results and baselines with numbers
No numerical results. Exact: Theorem 1, Eqs. (2)–(3).

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Integer-valued payoffs (continuous P&L must be discretized to units); i.i.d. (no streaks — the complement of 1753, which handles correlation but only ±1); infinitely rich adversary (no profit-target absorption — pure ruin); root-finding for p(z)=1 in the unit disk is numerical work the paper doesn't provide; no estimation error.

## 11. GSE overlap
This is the variable-magnitude counterpart to 1753: 1753 handles serial correlation with ±1 stakes; this handles arbitrary payoff magnitudes with independence. Real GSE weekly P&L is asymmetric (e.g., −110 bets: win +0.91u, lose −1u; plus pushes as 0) — the classical B/(A+B) formula and 1753's formula both misprice this. Per the existing-research map, GSE has no payoff-distribution-aware ruin formula. Together, 1753 + this paper bracket the two violations of the classical assumptions. New capability: exact ruin pricing for the empirical P&L distribution.

## 12. Implementation specification
Build the "payoff-aware ruin gate": (a) discretize weekly settled P&L into units (round to 0.1u, shift to integers); estimate {p_k} empirically per market; (b) form p(z), find its ν roots in |z|<1 numerically (numpy polynomial roots on z^ν·p(z)); (c) compute P_ruin(M) via Eq. (3) (fallback to Eq. 2 on near-multiple roots); (d) choose stake size (units per week) so P_ruin(bankroll in units) ≤ 1%; (e) recompute monthly as {p_k} drifts. Effort: ~1 day (distribution estimation + root finder + gate).

## 13. Reproducible test
Dataset: 2023–2025 NFL weekly engine P&L in units. Fit {p_k} per season; compute the Katriel P_ruin for a 100-unit bankroll; verify against Monte Carlo simulation of the fitted distribution (must agree to simulation error); compare against the naive B/(A+B) and 1753's formula to quantify the asymmetry correction. Metrics: formula-vs-Monte-Carlo agreement, predicted vs realized ruin/drawdown frequencies across seasons.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the payoff-aware gate if the empirical {p_k} is materially asymmetric (skewness |γ| > 0.3) AND the Katriel P_ruin differs from the symmetric ±1 approximations by > 25% relative; REJECT if root-finding is numerically unstable on real data or the distribution is effectively symmetric. Improvement experiment: combine with 1753 — build a Markov-switching payoff model (correlated signs × empirical magnitudes) and compare its Monte Carlo ruin probability against both closed forms, quantifying which violation (correlation vs asymmetry) dominates GSE's ruin risk.

**Verdict:** ADAPT — the general ruin formula prices GSE's actual asymmetric P&L distribution in closed form, but it needs a numerical root-finder and an empirical horse race against the simpler formulas.
