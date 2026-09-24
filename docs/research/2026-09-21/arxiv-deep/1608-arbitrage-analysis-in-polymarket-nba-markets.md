# [1608] Arbitrage Analysis in Polymarket NBA Markets (arXiv:2605.00864)

**Citation:** Guang Cheng, Jiaxin Yang, Haoxuan Zou (2026). *Arbitrage Analysis in Polymarket NBA Markets*. arXiv:2605.00864. URL: https://arxiv.org/abs/2605.00864
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a directly reusable LOB-snapshot methodology for measuring prediction-market efficiency; GSE should replicate the single-market arb scan and the ML-vs-spread combinatorial monitor as a live market-efficiency benchmark for its NFL edge.

## 1. Research question
How frequent, durable, and profitable are algorithmic arbitrage opportunities in Polymarket's NBA game markets, measured from high-frequency limit order book snapshots rather than executed trades? The paper distinguishes single-market arbitrage (complementary Yes/No shares mispriced within one market) from combinatorial arbitrage (structural dependencies between moneyline and point-spread markets that trade on isolated order books), and asks whether residual mispricings are executable at scale or confined to the retail tier by liquidity frictions.

## 2. Dataset / schema
- **Polymarket CLOB snapshots** (off-chain `GET /book` endpoint), Level 1 top-of-book only (best bid/ask): 75,088,497 snapshots across 173 NBA games, Feb 4 – Mar 4, 2026 (one month).
- **Coverage:** 3,042 markets for single-market analysis (moneyline/spread/totals/props/halves); 8.59 million combinatorial market states for moneyline–spread pairs.
- **Polling constraint:** 3.6–5.5 s per-market polling cycle (mechanical); network RTT ~171 ms; competing outcomes recorded within 2–50 ms of each other.
- **Schema per snapshot:** market slug, outcome token, best bid/ask + size, UTC timestamp (server-side).
- Access: proprietary collection via public Polymarket CLOB API; collection code and data not released (no links stated).

## 3. Method / model
Two execution paths evaluated at every timestamp:
1. **Buy path (long arbitrage):** simultaneously buy all outcomes at the ask when Ask_A + Ask_B < 1.00.
2. **Mint-and-sell path (short arbitrage):** lock $1.00 USDC to mint both outcome shares, sell into the bid when Bid_A + Bid_B > 1.00.
- **Mirrored-liquidity dedup:** Polymarket's engine reflects orders across complementary tokens (buy A @0.40 ⇒ synthetic sell B @0.60); both paths evaluated independently but only one retained per timestamp to avoid double-counting.
- **Execution filters:** top-of-book only; minimum bottleneck liquidity $10 USDC; zero-fee threshold (Profit > $0.00); strict exclusion of post-game snapshots (oracle-resolution window, median spread 7,532.65 bps).
- **Micro-desync mitigation:** updates within 500 ms clustered to a single discrete timestamp before state alignment (prevents phantom sub-second crosses from the 2–50 ms API serialization stagger).
- **Combinatorial (ML vs spread):** unified state machine T_U = T_ML ∪ T_S (full outer join of update timestamps); strict forward-fill imputation P_M(t_n) = P_M(t_i), t_i = max{t ∈ T_M : t ≤ t_n} (no look-ahead); synthetic short via complement token since Polymarket has no short selling: execute when Ask(ML_A) + Ask(Sp_B) < 1.00.
- **Duration:** forward difference Duration_n = t_{n+1} − t_n, capped by phase-dependent Trust Ceiling C_phase (1800 s pre/post-game, 300 s in-game); terminal states credited the market's median snapshot gap (~4.0 s).
- **Profit:** "one-shot" paradigm — single maximum realizable profit per episode (not summed across snapshots); evaluated at $100/episode cap and uncapped.

## 4. Equations & assumptions
- Single-market long: Ask_A + Ask_B < 1.00 (payout of one-of-each pair = $1.00 exactly).
- Single-market short: Bid_A + Bid_B > 1.00.
- Combinatorial (spread ⊂ moneyline, {Δ > h} ⊂ {Δ ≥ 1}): execute when Ask(ML_A) + Ask(Sp_B) < 1.00.
- "Middle" jackpot payoff: if final margin Δ falls in (1, h] gap, both legs pay → $2.00 payout on risk-free capital.
- State imputation: P_M(t_n) = P_M(t_i), t_i = max{t ∈ T_M | t ≤ t_n}.
- Duration: Valid_Duration_n = min(t_{n+1} − t_n, C_phase).
- Assumptions: token pair fully collateralized at $1.00 USDC; NBA games cannot tie (Δ ∈ ℤ \ {0}); top-of-book is the executable liquidity (deeper levels subject to cancellation); zero trading fees on NBA markets; post-game order book is non-executable.

## 5. Features / target
No ML model. Detection signals: top-of-book bid/ask per outcome token (features); target: binary arb-episode flag + episode profit/yield. Game-phase segmentation (pre-game / in-game / post-game) and market-type segmentation (moneyline, spread, totals, props, halves).

## 6. Validation design
Empirical measurement study, not a predictive model — no train/test split. Validation is methodological: mirrored-liquidity dedup protocol, 500 ms micro-desync clustering, post-game exclusion validated by spread explosion (Table 2), forward-fill-only imputation to prevent look-ahead. Baselines: comparison against Saguillo et al. (2025) trade-data-based Polymarket arb analysis (this paper's LOB-snapshot advance) and the Shleifer–Vishny (1997) limits-to-arbitrage framework as the theoretical lens.

## 7. Numerical results / baselines
- **Single-market:** 37 raw episodes → 30 (81.1%) post-game artifacts excluded → **7 valid in-game episodes** across 3,042 markets / 75M snapshots; 0.0001% of time in arb; median duration **3.614 s**. Capped profit ($100/episode): $210.19 aggregate (right-skewed by one blowout outlier); ex-outlier median yield **11.0%** ($11.01/episode). Uncapped theoretical: $4,418.44.
- **Liquidity by phase** (median bid-ask spread): pre-game 392.20 bps; in-game 1030.90 bps; post-game 7532.65 bps.
- **By type:** 3 moneyline episodes ($5.10 capped) vs 3 spread episodes ($194.08 capped) — spreads show deeper liquidity vacuums; 85.7% of episodes could absorb a $100 execution.
- **Combinatorial:** 8.59M states → 523 candidates → 233 post-game excluded → **290 active episodes** (279 in-game, 11 pre-game); median 2.00 episodes/game; in-game 0.1762% time in arb; median duration **16.0 s** (17.2% ≤ 4.0 s). Median yield **101.01 bps**; aggregate capped profit $559.59 vs uncapped $2,032.75. **76.9% of episodes liquidity-constrained, average executable size 14.79 shares.** Zero "middle" jackpot realizations ex-post.
- NBA Polymarket volume: $51M (2024) → $0.89B (2025), ~17.45× growth; ~30% of Polymarket sports activity.

## 8. Code / data availability
None stated. Data collected via public Polymarket CLOB API; no repository or data release link in the paper.

## 9. Leakage & limitations
- **Polling latency:** 3.6–5.5 s cadence means flash arbs inside one polling gap are missed (frequency is a lower bound) and recorded durations are upper bounds. Adversarial note: the "7 episodes / 3.6 s median" headline is partly a function of the collector's heartbeat, not the market's.
- **One-month sample, NBA only** (Feb 4 – Mar 4, 2026): no cross-sport or cross-season validation; sports contracts resolve in hours, so liquidity never deepens — results may not transfer to longer-lived markets.
- **Post-game exclusion is judgmental:** 81.1% of raw signals discarded; if some post-game liquidity were executable, in-game efficiency is overstated.
- **No fees/slippage modeling** beyond the $10 minimum and zero-fee assumption; gas costs on mint path ignored.
- External validity to NFL: NFL Polymarket markets have different liquidity profiles; NBA's 45-markets-per-game cluster structure may not map to NFL slates.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's market-microstructure coverage is explicitly thin ("only 1211.4000 + PLOS ONE 2023. Order flow, steam-move predictability, limit-order-book analogues... thin"), while the prediction-market lane has Polymarket/Kalshi tooling, oracle3 (Wang Transform + Kelly), and TurbineFi backtests — but no LOB-snapshot arb/efficiency apparatus. This is an **extension**: the first executable-efficiency benchmark method in the corpus, directly supporting the standing "CLV as training label / beat-the-close" machinery.

## 11. GSE implementation spec
1. **Data:** Poll Polymarket `GET /book` for NFL game-event markets (moneyline, spread, totals) at ~4 s cadence on game days; store top-of-book snapshots (market, outcome, bid/ask/size, ts). Same pipeline ports to Kalshi later.
2. **Single-market monitor:** flag Ask_Yes + Ask_No < 1.00 (or Bid_Yes + Bid_No > 1.00) with $10 minimum size; mirrored-liquidity dedup; 500 ms clustering; post-game exclusion.
3. **Combinatorial monitor:** ML-vs-spread synthetic-short condition Ask(ML_fav) + Ask(Spread_dog) < 1.00 with forward-fill unified timeline.
4. **Output:** nightly efficiency digest — episodes, median duration, median yield, executable-size distribution — as the "market sharpness" baseline against which GSE's CLV edge is judged. If GSE's model beats a market that shows near-zero arb persistence, the edge is structural; if arbs are frequent, the market is soft and edge claims need discounting.
5. **Effort:** ~2–3 days (collector + detection + digest); no ML training.

## 12. Reproducible test
Dataset: Polymarket NFL Week 1–4 2026 moneyline/spread/total markets, top-of-book snapshots ≥4 s cadence. Metric: single-market arb episodes per 1,000 markets and median episode duration. Baseline to beat/match: paper's NBA benchmark (7 episodes / 3,042 markets, 3.6 s median duration). Pass if the pipeline reproduces sub-10-episode-per-3000-markets efficiency on NFL data with zero post-game false positives.

## 13. Acceptance / rejection gate
**Adopt** the monitor as a standing benchmark if, on 4 weeks of 2026 NFL Polymarket data, it detects ≥1 genuine in-game dislocation with measured executable depth (proving the pipeline works on NFL structure) while keeping post-game false-positive rate at 0. **Reject** if NFL markets show no detectable structure (e.g., spread/moneyline books too thin to evaluate) or the collector cannot sustain sub-6 s cadence.

## 14. Improvement experiment
Extend the combinatorial monitor cross-venue: run the same unified-state-machine arb scan between Polymarket and Kalshi NFL contracts (where both list the game). Cross-venue dislocations should persist longer than the 16 s in-venue median because no single market maker bridges them — if confirmed, this turns the paper's retail-scale finding into a potentially scalable edge, and gives GSE a "cross-market sharpness" signal for weighting its own probabilities.
