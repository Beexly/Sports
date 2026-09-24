# 1762 The Independent Chip Model and Risk Aversion (arXiv:0911.3100v1)

**Citation:** George T. Gilbert (2009). *The Independent Chip Model and Risk Aversion*. arXiv:0911.3100v1. URL: https://arxiv.org/abs/0911.3100
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

Under the Independent Chip Model (ICM) for poker tournaments, what happens to everyone's expected prize money when two players take a "fair bet" (a zero-EV gamble)? The paper proves two results: (1) participating in a fair two-player bet ALWAYS lowers your tournament EV; (2) the EV of players NOT in the bet always INCREASES. Neither result necessarily holds for bets among three or more players. This is the formal game-theoretic foundation of why variance-without-edge destroys tournament equity — the core principle behind contrarian DFS construction.

## 2. Dataset / schema

No dataset — pure theory paper. The "model" is ICM applied to freezeout poker tournaments: all players start with equal chips, elimination order determines prizes, prize pool geometrically distributed (top-heavy). The analysis is mathematical proof, not empirical.

## 3. Method / model

ICM: a player's probability of finishing 1st = chip share; 2nd/3rd/etc. via the Malmuth-Harville recursion. The paper considers a "fair bet": two players wager chips such that each player's expected chip count is unchanged (e.g., flip a coin for X chips). Proof technique: Jensen's inequality on the CONCAVE ICM equity function — because tournament equity is concave in chips (diminishing marginal value of chips due to the capped first prize), any mean-preserving spread in your chip distribution lowers your expected equity. The bystander result follows from conservation: total prize pool is fixed, so if participants lose EV, non-participants must gain it. The 3+ player caveat: with three or more bettors, the bet can correlate eliminations in ways that break the simple concavity argument.

## 4. Equations & assumptions

- ICM equity: E_i(c) = Σ_k P_i(k|c)·prize_k, where c is the chip vector, concave in c_i (diminishing returns).
- Fair bet: E[Δc_i] = 0, Var(Δc_i) > 0 for participants i,j.
- Result 1: E[E_i(c+Δc)] < E_i(c) for participants (strict Jensen on concave E_i).
- Result 2: Σ_{non-participants} E[E_k] increases (prize pool conservation).
- Assumptions: ICM correctly prices tournament equity; the bet is truly fair (zero chip EV); freezeout structure; the concavity of ICM equity in chips (holds for standard top-heavy payout structures).

## 5. Features / target

No features/target — theoretical result. The "input" is a tournament chip distribution and payout structure; the "output" is the theorem about EV changes from fair bets.

## 6. Validation design

Mathematical proof (no empirical validation). The paper cites Henke's WPT final-table test as background evidence that ICM approximately holds (modestly overestimates small stacks, underestimates large stacks — consistent with 2506.00180's later large-scale finding).

## 7. Numerical results / baselines

No numerical results — the contribution is the two theorems. The paper notes the results are sharp for two-player bets and provides counterexamples for the 3+ player case.

## 8. Code / data availability

No code or data (theory paper, 2009). The ICM formula is standard and reimplementable in ~20 lines.

## 9. Leakage & limitations

- **Poker-specific, 2009:** the formal setting is chip-based poker tournaments; the DFS transfer (below) is an analogy, not a direct application.
- **ICM is approximate:** the theorems assume ICM equity is correct; real tournament equity deviates (see 2506.00180, 2608.09586).
- **Two-player restriction:** the clean result requires exactly two bettors; DFS "bets" (lineup decisions) involve the whole field, so the direct theorem doesn't apply — only the intuition (concavity → variance penalty) transfers.
- **No empirical test:** pure theory; the DFS implication is untested in the paper.
- **Short paper:** the deep-dive is thin because the paper itself is brief; value is in the principle, not the details.

## 10. GSE overlap

The corpus has no ledger on the game theory of tournament variance — why contrarian/differentiated lineups are mathematically required (not just stylistically preferred) in top-heavy GPPs. This paper provides the formal justification: in any tournament with a concave prize-equity function, taking on variance without increasing expected score DONATES equity to the field. This is the "game-theoretic contrarian construction" principle from the lane brief, grounded in a theorem rather than folklore.

## 11. GSE implementation spec

1. **Variance-budget rule:** formalize the theorem as a GPP construction constraint — any lineup decision that increases lineup variance (e.g., a boom/bust WR3) must ALSO increase expected score by enough to overcome the concavity penalty. Implement as: require ΔEV ≥ λ·ΔVar, where λ is calibrated from the payout ladder's concavity (steeper ladder → higher λ).
2. **Bystander-equity audit:** when GSE recommends a high-variance lineup, compute how much equity the decision donates to the field (the "bystander gain") — if the donation exceeds the lineup's edge, flag it.
3. **Contrarian filter:** use the theorem to distinguish GOOD contrarian plays (positive-EV differentiation: low-owned players with genuine edge) from BAD variance (high-owned or zero-edge volatility). Only the former survives the concavity penalty.
4. Cost: ~3 days (concavity calibration from payout ladders + filter logic).

## 12. Reproducible test

Dataset: 2024 DK NFL GPPs. For a set of GSE-constructed lineups, compute each lineup's score variance and expected score; estimate the payout ladder's concavity (second derivative of prize vs percentile). Test: do lineups violating the variance-budget rule (high variance, no EV compensation) systematically underperform on realized prize? Baselines: current GSE GPP lineups. Metrics: realized prize per lineup; correlation between variance-budget violation and prize shortfall. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the variance-budget rule if** on 2024 GPP backtests, lineups violating the rule underperform compliant lineups on realized prize by ≥20% (validating the concavity penalty in DFS); **reject** if the effect is undetectable (variance doesn't predict prize shortfall after controlling for EV) — in which case the theorem's DFS transfer is too weak and the rule is dropped. Kill if calibration takes >3 days (the concavity estimate should be a simple curve fit).

## 14. Improvement experiment

**Field-aware concavity:** the paper's bystander result says your variance donates equity to the field — but the donation is LARGER when the field is sharp (they capture the donated equity efficiently). Extend the variance-budget rule with a field-sharpness multiplier: in soft fields (recreational GPPs), allow more variance (bystanders don't efficiently capture donations); in sharp fields (high-stakes), enforce strictly. Hypothesis: field-adjusted variance budgets beat uniform budgets. Test on 2024 high-stakes vs low-stakes GPPs; success = ≥10% prize improvement from field-adjustment.

**Verdict:** ADAPT — The fair-bet theorems are the formal game-theoretic foundation of contrarian GPP construction: variance without edge donates equity to the field. Thin paper, but the principle directly implements as a variance-budget rule. Weak but genuine ADAPT.
