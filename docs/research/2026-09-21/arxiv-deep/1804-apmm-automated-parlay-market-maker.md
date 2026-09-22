# Ledger 1804 — APMM: Automated Parlay Market Maker

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2607.18299
- **Title:** APMM: Automated Parlay Market Maker (full title as rendered on ar5iv)
- **Authors:** Niusha Moshrefi (Princeton University), Ranvir Rana (Kaleidoscope Blockchain) of the paper
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, model specification, theoretical loss bounds, Kalshi NBA same-game-parlay empirical evaluation, results tables, discussion, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2607.18299.html` with extracted text at `/tmp/wave4b-dfs2/txt/2607.18299.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

How can a market maker price multi-leg parlays (same-game parlays, SGPs) coherently — accounting for the dependence between legs — without taking on the exponential worst-case loss exposure of running independent LMSR books per parlay, and while offering traders fairer (tighter) prices on higher-order parlays than independence pricing?

## 3. Method/model

**Automated Parlay Market Maker (APMM):** a hierarchical LMSR-style automated market maker for parlays.

- The book is parameterized by a hierarchy of interaction parameters: lower-order parlay state (marginals, pairwise and low-order joint quantities) is *shared* with every higher-order parlay that contains those legs.
- Trades on any parlay are routed bottom-up across sub-books: a k-leg parlay trade updates the canonical interaction parameters at orders ≤ k, which are then consistent across all containing parlays.
- Pricing is therefore correlation-aware: the fair price of a 5-leg SGP is not the product of five marginals; it is derived from the shared low-order dependence structure.
- The design explicitly separates informed flow concentrated on low-order legs (the dangerous case) from diffuse bounded flow.

## 4. Mathematics, equations, assumptions

- The price of a parlay bundle is the LMSR-style gradient of a convex cost function whose sufficient statistics are the hierarchical interaction parameters θ_S for subsets S of legs, |S| ≤ K.
- Key structural assumption: conditional independence of high-order interactions given low-order ones beyond the modeled order (the hierarchy is truncated; residual high-order dependence is the modeled-away risk).
- **Loss bounds claimed:**
  - Under *concentrated low-order informed flow* (adversarial traders all attacking the same low-order legs): operator worst-case loss is **quadratic** in the order/flow, versus **exponential** exposure for independent per-parlay LMSRs.
  - Under *diffuse bounded flow*: operator loss is **linear**.
- Assumption: trader flow is not strategically adversarial against the hierarchy itself (strategic/adversarial traders and fee design are listed as future work).

## 5. Dataset/schema

**Kalshi NBA same-game-parlay corpus, April–June 2026:**

| Slice | Markets | Trades |
|---|---|---|
| All | 7,372 | 29,257 |
| 2-leg | 6,250 | 27,984 |
| 3+ leg | ~1,122 | ~1,273 (activity falls sharply with order) |

Schema per trade: market id, parlay legs (event/outcome identifiers), side, size, timestamp, game id; per market: settlement outcome.

## 6. Features and target

- **Features:** leg-level marginal prices from the order-1 book, pairwise (and higher) canonical interaction parameters shared across the hierarchy, trade size and direction, game context.
- **Target:** the fair price of each parlay (its true joint probability) and the operator's realized P&L; evaluation target is trader effective-price ratio vs. independent LMSR and maker loss in historical replay.

## 7. Validation design

- Historical replay: the APMM is simulated against the actual Kalshi trade tape — each historical trade is executed against the APMM book instead of the realized book, and maker P&L is accumulated.
- Comparison: trader effective prices under APMM vs. prices an independent per-parlay LMSR would have quoted for the same trades, by parlay order.
- No train/test split in the ML sense; this is a mechanism evaluation on a fixed historical tape (in-sample replay).

## 8. Exact results and baselines with numbers

Trader effective-price ratios (APMM price ÷ independent-LMSR price; <1 = cheaper for the trader):

| Parlay order | Ratio |
|---|---|
| 1 | 1.000 |
| 2 | 0.994 |
| 3 | 0.981 |
| 4 | 0.971 |
| 5 | 0.961 |
| 6 | 0.938 |
| Pooled | 0.978 |

- APMM has **lower maker loss than independent LMSRs in most games**; aggregate maker loss is near-zero to negative (i.e., the maker roughly breaks even to slightly profitable in replay).
- The pricing edge for traders grows with parlay order (up to ~6% cheaper at order 6), reflecting the correlation value independence pricing ignores.
- Baseline: independent LMSR per parlay market (the status quo design).

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: Kalshi NBA SGP markets/trades (proprietary exchange data; the paper's corpus is April–June 2026).

## 10. Leakage and limitations

- Historical replay is in-sample: the hierarchy's interaction parameters are estimated on the same tape the replay runs on; a live deployment faces regime shift.
- Strong assumptions: low-order flow is "rational"/non-adversarial; strategic traders who learn the hierarchy could attack the truncation residual.
- Fee design is explicitly future work — the near-zero/negative loss result excludes fees, which are the actual business model.
- Higher-leg data is thin (only ~1,273 trades at 3+ legs), so the order-5/6 price ratios are estimated on small samples.

## 11. GSE overlap

- Directly overlaps the GSE SGP/prop-pricing lane: GSE prices same-game parlays for content (and must take a stance against "whalelays" per Garrett's 2026-09-10 directive — "play singles like a responsible adult"). A coherent SGP fair-value layer built from marginals + low-order interactions is exactly what this paper supplies.
- Overlaps the market-microstructure/CLV wave (wave4-markets.jsonl) — read jointly with that lane's microstructure papers.
- The hub-concentration loss analysis maps to GSE's own exposure thinking: concentrated low-order informed flow is the analogue of sharp correlated action on a few props.

## 12. Implementation specification

1. **Inputs:** per-leg marginal probabilities from the existing GSE game model; pairwise (and optionally 3-way) dependence estimates from historical joint outcomes (e.g., copula or log-linear interaction fits on same-game prop pairs).
2. **Build** the hierarchical cost function: maintain θ_S for |S| ≤ 2 (extend to 3 if data supports), shared across all SGPs containing S.
3. **Price** any SGP as the model-implied joint probability under the hierarchy (closed form for order ≤ 2 interactions via the logistic/log-linear parameterization).
4. **Risk control:** monitor hub concentration — total exposure on any single low-order leg across all open SGPs; throttle or widen when concentrated informed flow is detected (the paper's quadratic-loss regime).
5. **Output:** per-SGP fair value, edge vs. posted sportsbook price, and a correlation discount metric (price ÷ independence price) to flag books mispricing correlation.

## 13. Reproducible test

- Rebuild the independence baseline: for a sample of real SGP offerings, compute the independence-implied price (product of leg marginals) and compare against the hierarchy price; confirm the ratio declines with order (target: pooled ratio ≈ 0.97–0.99 on 2-leg, lower at higher orders).
- Backtest: simulate a maker quoting hierarchy prices against a synthetic informed-flow tape; verify maker loss grows at most quadratically in concentrated-flow scenarios vs. exponentially for independent books.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** the correlation-discount mechanism is real and quantified (0.6%–6.2% trader price improvement by order, pooled 0.978; near-zero aggregate maker loss in replay). Accept as ADAPT.
- **Improvement experiment:** fit the hierarchy on NFL same-game props (where GSE has data) instead of NBA; measure (a) trader price ratios by order, (b) maker loss under replayed sharp flow. Extend the hierarchy to order-3 interactions and test whether the order-5/6 ratios move further below 0.96 without increasing maker loss. Success = maker loss stays ≤ independent-LMSR loss while trader ratios stay < 1.

**Verdict:** ADAPT — Correlation-aware SGP fair-value layer via hierarchical LMSR; adopt the shared low-order interaction parameterization and hub-concentration risk controls for GSE's parlay pricing, with fees and NFL-specific calibration as the improvement path.
