# [1732] When Do Prophets Profit in Prediction Markets? (arXiv:2607.06166)

**Citation:** Anri Gu, Nicole Kagan, Alec Sun, Jibang Wu, Haifeng Xu (2026; Kalshi Research). *When Do Prophets Profit in Prediction Markets?* arXiv:2607.06166. URL: https://arxiv.org/abs/2607.06166
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 23,502 words).
**Verdict:** ADAPT — the proper-betting theorem (s_G(p,q) = ∇G(p) − ∇G(q)) with the profit decomposition π = [S(p,p*) − S(q,p*)] + D_G(q,p) − L_ρ(s*,q) is the missing formal bridge between GSE's calibration edge and realized CLV/profit under spreads and slippage; the month-long live Kalshi deployment (+80.33% ROI, Sharpe 3.35, 236 orders/129 markets) validates it; adapt the Brier-derived sizing rule to GSE's NFL edge-vs-market workflow.

## 1. Research question
In modern central-limit-order-book (CLOB) prediction markets (Kalshi, Polymarket) — where informed forecasters routinely lose money despite being more accurate, and uninformed heuristics can profit — when does superior forecasting accuracy actually convert into trading profit? The paper establishes a formal equivalence between predictive accuracy and profitability for *any* strictly proper scoring rule: it exhibits a "proper betting" strategy depending only on the forecaster's prediction p and the market price q that earns positive expected profit whenever p beats q under the scoring rule and liquidity suffices, and proves this is essentially the *only* robustly profitable strategy class.

## 2. Dataset / schema
- **Offline benchmark:** 2,418 Kalshi markets collected via Prophet Arena, spanning sports, politics, economics, crypto; each with an AI-model forecast, contemporaneous market (bid/ask) price, and realized YES/NO outcome. Extended persona experiment: 27,516 markets across 3,511 questions (Aug 1, 2025 – Apr 15, 2026).
- **Live deployment:** Gemini 3 agent on Kalshi, 26 days (April/May 2026), $200 initial budget, fixed 2-hour cadence; 236 orders across 129 markets. Eligibility filter: close time 2–14 days out; skip if price moved <10¢ since last fill; halt 3h before resolution; excludes Mentions category and ambiguous-resolution markets.
- Access: Prophet Arena benchmark is public; Kalshi data via API; the paper notes the trading history is documented at a linked page (URL in paper's "here" hyperlink — extract from the ar5iv/HTML version).

## 3. Method / model
- For any strictly proper scoring rule S with potential G, define the **proper bet** s_G(p,q) = ∇G(p) − ∇G(q): bet size/direction is the gradient gap between own forecast and market price.
- **Profit decomposition** (Lemma 1 / Eq. 1): π = [S(p,p*) − S(q,p*)] + D_G(q,p) − L_ρ(s*,q): expected profit = score gap (accuracy edge vs market) + Bregman divergence (divergence bonus, always ≥ 0) − liquidity cost (slippage walking the book, L_ρ from the CLOB depth function ρ).
- Robust profitability: the divergence term D_G(q,p) ≥ 0 offsets liquidity cost, so profit is positive whenever the accuracy edge exceeds slippage; conversely, strategies can profit *without* an accuracy edge via the divergence term alone (explains heuristic profits).
- Uniqueness: proper betting is essentially the only strategy (up to scaling and constant shifts) that robustly converts a score edge into profit across market conditions.
- Covers bid-ask spreads, sequential empirical scoring, and long-horizon trading; instantiated for Brier (quadratic), log, and spherical rules.
- **Forecaster personas:** Conservative (small-margin, flat accuracy), Aggressive (few small-margin bets, flat accuracy), Dispersed (broad margins, gradual win-rate decay), Brittle (small-margin concentration, sharp win-rate decay) — optimal rule varies by persona.

## 4. Equations & assumptions
- Proper bet: s_G(p, q) = ∇G(p) − ∇G(q).
- Profit decomposition: π = [S(p, p*) − S(q, p*)] + D_G(q, p) − L_ρ(s*, q).
- S(p,q) = expected score; D_G = Bregman divergence of G; L_ρ = liquidity/slippage loss from the CLOB depth function ρ (piecewise-constant off the book); p* = true probability.
- Brier instantiation: ∇G(p) = 2p − 1 direction; bet ∝ (p − q) scaled.
- Assumptions: strictly proper scoring rule; market has "sufficient liquidity" (formalized via L_ρ bound); forecaster's p is fixed while betting (no price impact on own belief); CLOB mechanics with observable depth; resolution is unambiguous.

## 5. Features / target
Features: forecaster probability p, market bid/ask price q, order-book depth ρ, scoring-rule choice (Brier/log/spherical). Target: bet allocation weights {w_i} (direction + size per market) maximizing realized ROI after resolution; live target = portfolio ROI and Sharpe.

## 6. Validation design
- **Offline (zero price impact simulation):** proper (Brier/log/spherical) vs heuristic baselines (Brier-weighted allocation, Inverse-Margin, Kelly) on the 2,418-market Prophet Arena set; standardized 200-event shared subset for the head-to-head table; ROI after resolution.
- **Persona study:** synthetic personas (fixed ±0.05 relative quadratic score gap) on 27,516 markets / 3,511 questions; margin range |p−q| ∈ [0, 0.5].
- **Live:** 26-day real-capital deployment, limit orders at prevailing ask, 2h cadence, full frictions (spreads, thin-book non-fills, fees, discrete ticks).
- Baselines: heuristic allocations; Kelly criterion (noted as particularly poor — unstable under miscalibration).

## 7. Numerical results / baselines
- **Live deployment:** +80.33% ROI over 26 days (ΔS = +0.7205, D = +0.0828 — nearly all gains from accuracy, not divergence), Sharpe ratio 3.35; 236 orders across 129 markets on a $200 budget.
- Offline: proper betting is the *only* strategy reliably converting accuracy into profit across thousands of AI forecasts; for stronger models Brier-weighted allocation is the only heuristic with consistent positive ROI; Inverse-Margin limits downside for weaker models but caps upside; Kelly performs particularly poorly (sensitive to miscalibration).
- Persona example: Llama 4 Maverick — Brier gives worse score gap than Spherical (−123.7 vs −53.3) but higher ROI (−13.1 vs −14.8) via a larger divergence term; under the Log rule, GPT-5.2 (Base) beats Gemini 3 on ROI despite a worse score gap.
- Skill persistence context: none (this paper); the strategy result is the headline.

## 8. Code / data availability
No standalone code repository stated. Data: Prophet Arena benchmark (public), Kalshi API. The paper states the live trading history is documented at a linked page ("documented here" hyperlink in §4.3 — recover the URL from the HTML/ar5iv version).

## 9. Leakage & limitations
- Live deployment is short (26 days, $200 budget, 129 markets) — one regime; no stress test across volatile news cycles.
- Kalshi CLOB mechanics ≠ sportsbook mechanics: no order book at books, no resting-limit-order slippage in the same sense; the L_ρ term must be re-mapped to book limits/juice moves.
- Offline benchmark assumes zero price impact; real GSE-scale staking would move lines.
- Eligibility filters (14-day max horizon, 10¢ move gate, 3h pre-resolution halt) are tuned to LLM forecasting strengths; NFL adaptation needs its own filters.
- Persona taxonomy is synthetic (constructed to a fixed ±0.05 score gap) — descriptive of LLM forecasters, not necessarily of GSE's engine.
- "Essentially the only strategy" uniqueness holds within the paper's robustness definition; other strategies can still profit (the paper itself notes divergence-driven profits).

## 10. GSE overlap
Existing map: bet-sizing lane mentions Kelly 12× with no paper read; market microstructure lane tracks CLV/beat-the-close (existing-research-map.md). GSE currently sizes by its own heuristics; Kelly is referenced but the repo has no formal accuracy→profit bridge under frictions. This paper directly upgrades the sizing lane: it shows Kelly is fragile under miscalibration and gives a theoretically grounded replacement (proper betting) with a live-trading validation. The profit decomposition's three terms map onto GSE concepts: score gap ≈ model edge vs de-vigged consensus; divergence ≈ disagreement bonus; liquidity cost ≈ line-move slippage when GSE's own publication moves the market. Extension that subsumes the Kelly mentions.

## 11. GSE implementation spec
- Implement the Brier proper-bet sizing rule for GSE's daily NFL card: w ∝ (p_GSE − q_market) clipped by a liquidity proxy (replace L_ρ with expected line-move per dollar from The Odds API book-count/depth data), instead of flat or Kelly staking.
- Decompose every posted pick's realized CLV into the three terms: score gap (was GSE more accurate than the market?), divergence (did disagreement pay?), liquidity cost (did the line move against GSE after posting?). Log per pick; this becomes the sizing feedback loop.
- Persona-classify GSE's model by margin distribution (|p−q| ≤ 0.15 share) and win-rate-vs-margin slope; pick Brier vs log vs spherical rule per the paper's persona table.
- Effort: ~1–2 weeks (sizing rule + decomposition logging + backtest on 2024–2025 picks).

## 12. Reproducible test
Dataset: GSE's logged picks with posted probabilities and contemporaneous market prices, 2024 season (or earliest complete season in the picks DB). Metric: realized ROI and CLV of proper-Brier sizing vs GSE's current staking and vs Kelly, all simulated with a fixed bankroll. Baseline: current staking. Pass if proper-Brier improves ROI by ≥20% of the baseline's magnitude (or turns a negative baseline positive) with no increase in max drawdown.

## 13. Acceptance / rejection gate
ADAPT is confirmed if, on the 2024-season backtest, proper-Brier staking beats both flat staking and Kelly on realized ROI with statistical significance (paired bootstrap, 5%) and the three-term decomposition attributes ≥60% of the gain to the score-gap term (accuracy, not luck). REJECT as a sizing rule if Kelly or flat staking wins — then GSE's edge structure does not match the paper's CLOB assumptions and the liquidity-cost mapping needs rework before reuse.

## 14. Improvement experiment
Extend the decomposition to multi-book shopping: GSE can place the "same" bet at N books with different q_i. Derive the multi-venue proper bet (gradient gap vs the *best* available q, with per-book liquidity costs) and test whether line-shopping adds a fourth "shopping bonus" term to the decomposition. Hypothesis: for NFL spreads where books disagree by ≥1 point, the shopping term rivals the divergence term — directly testable on The Odds API snapshots.

**Verdict:** ADAPT — the proper-betting theorem and profit decomposition give GSE the formal accuracy→profit bridge its sizing lane lacks (Kelly is fragile); validate Brier proper-bet staking on GSE's logged picks before production use.
