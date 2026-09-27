# [1207] An Investigation into Labouchère's Betting System… (arXiv:1707.00529v1)

**Citation:** Billings, J., & Del Barco, S. (2017). *An Investigation into Labouchère's Betting System to Improve Odds of Favorable Outcomes to Generate a Positive Externality Empirically*. arXiv:1707.00529v1. URL: https://arxiv.org/abs/1707.00529
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 30 pp incl. code listings and references).
**Verdict:** REJECT — undergraduate-level simulation confirming the textbook result that no negative-progression staking system beats fair odds; methodologically weak (Wald test applied to R² values, garbled formulas, inconsistent sample-size claims), and it contributes no method, model, or number GSE can use.

## 1. Research question
Can the Labouchère cancellation system (bet first+last of a target-sum sequence; append losses, cancel wins) generate positive expected returns at even odds, and what are its empirical risk characteristics? (Abstract, Introduction)

## 2. Dataset / schema
Simulated coin flips via Python `random.getrandbits` (Mersenne Twister); initial sequence [$1,$2,$3] (target $6); bankrolls $0–$500,000; 10,000 and 10,000,000 simulated rounds.

## 3. Method / model
- Recursive `gamble(sequence, balance)`: bet = first+last (or sole element); win → remove both ends; loss → append bet size; terminate on empty sequence (win = target sum) or insufficient capital (lose everything).
- "Bankroll strategy" (Zimmerman): extract profit above a $6,000 threshold on a $4,000 bankroll.
- Wald homogeneity test on the two R² values; exponential-decay regressions for completion-time distribution.

## 4. Equations & assumptions
- Completion model: f(x) = 10⁶·e^(−0.131x) rounds completing in x bets (R²=0.86884, 10M-round sim); g(x) = 0.1·e^(−0.131x) as "probability" (not a valid density — integrates to 0.763, noted by authors as "regression inaccuracy").
- Termination probability ρ(x) = ∫₀ˣ g + 1 (mathematically incoherent: ρ(∞)→0.763, yet claimed →1).
- Assumptions: fair 50/50 coin (even money, no vig — the one setting where no staking system can help, which the paper itself concludes).

## 5. Features / target
Inputs: bankroll size, initial sequence. Target: round completion counts, win/loss tallies per bankroll.

## 6. Validation design
Simulation only; no analytic benchmark beyond citing Downton (1980) that infinite capital always wins.

## 7. Numerical results / baselines
- 10,000 rounds: completion-time fit y=1026.3e^(−0.806x), R²=0.93172; 10M rounds: f(x)=10⁶e^(−0.131x), R²=0.86884.
- Table 3 (text): win rate rises with bankroll (371/1000 wins at $4 bankroll → 1000/1000 at ~$40k).
- Table 4: $4,000 bankroll grows near-linearly for ~6,000 bets then loses everything to one streak.
- Conclusion: only infinite capital profits; finite capital eventually ruined.

## 8. Code / data availability
Code at https://github.com/jake-billings/research-labouchere (MIT); CSV exports described but not verified.

## 9. Leakage & limitations
- Fair-coin, no-vig setting: result (staking can't create edge) is textbook and assumed, not discovered.
- Statistical machinery is invalid: Wald test for homogeneity applied to two R² point values; g(x) not a density; ρ(x) formula self-contradictory.
- Inconsistent reporting (Table 2 says 10,000,000 rounds in title, 100,000,000 in text).
- No vig, no sports data, no edge modeling — nothing about +EV selection, which is GSE's actual business.

## 10. GSE overlap
- None substantive. The "staking systems can't beat fair odds" moral is assumed knowledge; GSE's sizing lane (0171/0626/0813/1200/1203/1205/1208/1209) is about sizing +EV edges, where this paper has nothing to say.

## 11. GSE implementation spec
None — the only actionable moral ("don't sell negative-progression systems to followers") is content guidance, not research.

## 12. Reproducible test
N/A.

## 13. Acceptance / rejection gate
Reject — see verdict. Replacement required in the staking/bankroll-management lane.

## 14. Improvement experiment
None warranted from this paper; a rigorous treatment would use the gambler's-ruin / optional-stopping machinery, which the paper cites but does not extend.
