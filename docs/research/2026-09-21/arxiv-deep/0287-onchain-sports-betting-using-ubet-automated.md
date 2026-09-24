# [0287] Onchain Sports Betting using UBET Automated Market Maker (arXiv:2309.12333v1)

**Citation:** Im, D.J., Kondratskiy, A., Harvey, V., & Fu, H.-W. (UBET Sports) (2023). *Onchain Sports Betting using UBET Automated Market Maker*. arXiv:2309.12333v1. URL: https://arxiv.org/abs/2309.12333v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 547 lines).
**Verdict:** REJECT — a vendor whitepaper for UBET Sports' own on-chain sportsbook product, not a prediction or betting-edge method; the only GSE-relevant content is background on prediction-market AMM mechanics (conditional tokens, fair-price referencing), which the corpus already covers via prediction-market triage docs.

## 1. Research question
How can an automated market maker be designed for on-chain sports betting that prices conditional tokens at fair odds (minimizing impermanent loss for liquidity providers) rather than using mispriced constant-product curves like Uniswap?

## 2. Dataset / schema
- No real-world dataset. Experiments are pure simulations: binary and ternary outcome markets; funding $20k/$50k/$100k per market; true outcome probabilities in {20%,35%,50%,65%,80%}; bets per market in {10,50,100,500} or log-normal(2,2); 100–1000 markets; wager sizes sampled from scraped Polymarket sports-market transactions (Polygonscan); bet sides sampled from true probabilities or 50/50.
- Odd-rejection rule: bettors skip bets when slippage exceeds a sampled threshold ~ N(0.045, 0.05).

## 3. Method / model
- UBET AMM (UAMM): swap function referencing external fair prices f_τ (estimated from other sportsbooks) rather than internal pool ratios; piecewise slippage function applied only when output-pool balance < total investment balance TB, keeping pool balances matched to TB to minimize impermanent loss.
- Conditional-token framework (Gnosis): mint K outcome tokens per 1 unit collateral (USDC), bet = keep τ_i + swap other τ_j for τ_i via UAMM; oracle resolves; winners redeem 1:1.
- Collateral liquidity pool alongside conditional-token pools; LP shares s_lp = dτ_0 · TS/TV.
- Properties proved: additivity and reversibility of Add/Remove while fair prices fixed.

## 4. Equations & assumptions
Swap: swap(dτ_In;Γ) piecewise: (i) α·Δτ_Out + (ρ−α)(Rτ_Out − TB) if Rτ_Out − Δτ_Out ≤ TB ≤ Rτ_Out; (ii) Δτ_Out if TB ≤ Rτ_Out; (iii) Rτ_Out − TB²/(Xτ_Out + Δτ_Out) otherwise; with Δτ_Out = ρ·dτ_In, ρ = fτ_In/fτ_Out (fair exchange rate), α = Rτ_Out/(Xτ_Out + Δτ_Out), TB² = Xτ_Out·Rτ_Out.
LP shares: s_lp = dτ_0 · TS/TV. Pool value: TV = Σ fτ_k·Rτ_k. Metrics: EV(t), EIP(T) (probability-weighted impermanent PnL), EPP(T) (realized-outcome permanent PnL), TP = M·EPP.
Stated assumptions: (1) fair prices f_τ estimable from external sportsbooks (the "open question" of fair-price measurement is acknowledged); (2) equal pool balances ⇒ no LP loss under probability changes (relies on token-merge property); (3) simulated bettor behavior (sides, sizes, rejection) is representative.

## 5. Features / target
- No predictive features. "Fair price" inputs are taken as given (referenced from external sportsbooks).
- Target: AMM design that keeps LP PnL non-negative.

## 6. Validation design
- Controlled simulations: single-market 1000-transaction runs; 100-market × 100-transaction runs; sensitivity over true probabilities and bet-side distributions; uncontrolled full simulation (100 trials × 100 markets, log-normal bet counts).
- Comparison baseline: Uniswap constant-product AMM (UAMM shows permanent gain on average where Uniswap shows permanent loss — magnitude details in figures, not fully tabulated in text).

## 7. Numerical results / baselines
- Full-market simulation (100 trials, $10k initial funding): 1203 bets, $54,107 volume, EPP ≈ +$19.93 ± $3.13 (0.0019%), +$1,372 ± $18.8 (0.137%) including 2.5% transaction fees.
- Single-market runs: pool balances stay near $10k initial; rejection rate ~14.9% for (50%,50%), ~50% for (80%,20%) markets (high slippage on skewed odds).
- Multi-market: EIP rises linearly with bet count; EPP ≈ 50% and 100% of initial pool for the two demo probability settings (volatile — 100 coin flips with asymmetric sizes); sensitivity curves show EPP flat-positive across true probabilities 0.2–0.8.
- Claims "low vigorish" but never reports a numeric vig number.

## 8. Code / data availability
None — no repo, no contracts, no simulation code. Vendor paper (authors affiliated with UBET Sports, ubetsports.io).

## 9. Leakage & limitations
- Vendor whitepaper, not peer-reviewed: authors are the UBET Sports team promoting their own product; results are self-reported simulations with no independent verification.
- No real-data validation: all "experiments" are simulations where the AMM references true probabilities the simulator itself generated — circular by construction; the hard problem (estimating fair prices from real markets) is assumed solved.
- The fair-price input is the entire ballgame: if f_τ is wrong, UAMM misprices exactly like the oracles it depends on; the paper punts on this ("remains an open question").
- No numeric vig reported despite "low vigorish" claims; Uniswap comparison lacks tabulated magnitudes.
- Smart-contract/security, oracle-manipulation, and gas-cost realities of on-chain betting are unaddressed.
- A stray "[TODO: Check whether the update happens before or after]" in §4.1 signals the manuscript was not carefully finalized.

## 10. GSE overlap
Per existing-research-map: prediction-market mechanics (Polymarket-style conditional tokens, de-vigged consensus probabilities, CLV) are already covered in the market microstructure lane. This paper ADDS nothing predictive — it is market-infrastructure design. The conditional-token formalism (mint K tokens per unit collateral, merge back) is a clean mental model already present in corpus prediction-market docs. The fair-price-referencing AMM idea is a market-making concern for operators, not for a bettor-side engine like GSE. Not a duplicate of a method paper, but there is no GSE use case: GSE consumes market prices; it does not make markets or provide liquidity.

## 11. GSE implementation spec
None — no implementation recommended. If the prediction-market microstructure lane ever needs a refresher on conditional-token mechanics for modeling Polymarket prices, this paper's §3.1–3.4 is a readable primer, but the corpus already covers it.

## 12. Reproducible test
Not applicable — the paper's claims are about simulated LP profitability of a proprietary AMM, not about anything GSE can measure. A token-effort check: confirm Polymarket wager-size distribution claims are irrelevant to GSE's pipeline (they are).

## 13. Acceptance / rejection gate
REJECT for any GSE implementation. The paper is vendor marketing for an on-chain sportsbook; its simulations assume the fair-price estimation problem solved, which is precisely the problem GSE exists to solve. No gate needed — no action.

## 14. Improvement experiment
None proposed for GSE. If the broader research program ever evaluates decentralized betting venues as data sources (e.g., scraping Polymarket/UBET-style order books for additional consensus signals), the relevant experiment would be measuring information content of on-chain order flow vs centralized books — but that experiment belongs to the market-data lane, not to this paper's AMM design.
