# [2051] AlphaAgent: LLM-Driven Alpha Mining with Regularized Exploration to Counteract Alpha Decay (arXiv:2502.16789)

**Citation:** Ziyi Tang, Zechuan Chen, Jiarui Yang, Jiayao Mai et al. (2025). *AlphaAgent: LLM-Driven Alpha Mining with Regularized Exploration to Counteract Alpha Decay*. arXiv:2502.16789v2. URL: https://arxiv.org/abs/2502.16789
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~8,800 words).
**Verdict:** ADAPT

*Why:* the three decay countermeasures (AST originality enforcement, hypothesis–factor alignment, complexity control) are exactly the guards GSE's sports signal mining needs so its formula zoo doesn't collapse into the same crowded momentum clichés every other model uses.

## 1. Research question
Alpha decay (factors lose predictive power over time) comes from two sources: (1) overfitting/p-hacking producing spurious factors; (2) crowding — LLMs recycle well-documented factors (RSI etc.), accelerating decay. Can an LLM-agent framework with ad hoc regularizations — originality enforcement, hypothesis–factor alignment, complexity control — mine decay-resistant alphas that hold up across bull and bear markets?

## 2. Dataset / schema
Qlib framework. CSI 500 (Baostock) + S&P 500 (Yahoo Finance), 2015-01–2024-12. Splits: train 2015–2019 (~1,258/1,219 trading days), validation 2020 (253/243), test 2021-01–2024-12 (1,004/968 days). Features: only OHLCV ($open/$high/$low/$close/$volume). Four base alphas (intraday return, daily return, 20-day relative volume, normalized daily range) concatenated with mined alphas into LightGBM (max depth 4) forecasting next-day returns. Cross-sectional Z-score normalization. Backtest: top-50 by predicted return, drop lowest 5 (top-k dropout). Costs: CSI500 0.0005 buy / 0.0015 sell; S&P500 0.0005 sell only.

## 3. Method / model
AlphaAgent = GPT-3.5-turbo agents (weaker LLM than the GPT-4 baselines — notable) running 5 evolutionary rounds × 20 trials, with three mechanisms:
1. **Originality enforcement**: parse factor fᵢ into AST T(fᵢ); similarity s(fᵢ,fⱼ) = size of the largest common subtree under structural isomorphism (eq. 5). Penalize similarity to the existing alpha zoo → forces novelty, fights crowding.
2. **Hypothesis–factor alignment**: each factor must be semantically consistent with an explicit market hypothesis h, scored by the LLM (domain alignment objective, eq. 1).
3. **Complexity control**: ℛg(f,h) = α₁·SL(f) + α₂·PC(f) + α₃·ER(f,h) (eq. 4): symbolic length, free-parameter count (window lengths), and novelty/alignment term. Prevents over-engineered, overfit constructions.
Symbolic assembly layer: factors assembled from primitives → dev success rate 0.83 vs 0.75 without, token efficiency 1.00 vs 0.81.

## 4. Equations & assumptions
- s(fᵢ,fⱼ) = max_{tᵢ⊆T(fᵢ), tⱼ⊆T(fⱼ)} {|tᵢ| : tᵢ ≅ tⱼ} (largest common isomorphic subtree).
- ℛg(f,h) = α₁·SL(f) + α₂·PC(f) + α₃·ER(f,h).
- Metrics: IC/RankIC, ICIR, IR (excess over benchmark), AR, MDD.
- Assumptions: AST structural similarity proxies economic similarity; LLM can judge hypothesis–factor alignment; OHLCV-only sufficiency; GPT-3.5-turbo adequacy.

## 5. Features / target
Inputs: OHLCV only. Target: next-day return. Base alphas: intraday return, daily return, 20-day relative volume, normalized daily range.

## 6. Validation design
Test window 2021–2024 (covers bull and bear regimes). Baselines: LSTM, Transformer, LightGBM, TRA, Stock-Mixer, AlphaForge, RD-Agent (GPT-4), DeepSeek-R1 (best-of-10), OpenAI-o1 (best-of-10). Metrics IC/ICIR/AR/IR/MDD on both markets. Ablation: factor-modeling constraints (hit ratio 0.29 vs 0.16, +81%), symbolic assembly (dev success, token efficiency).

## 7. Numerical results / baselines
Table 2 (best in ALL 10 columns):
- **CSI 500**: AlphaAgent IC 0.0212 (next best TRA 0.0198), ICIR 0.1938, **AR 11.00%** (next best LSTM 4.96%), **IR 1.488** (next 0.6225), MDD −9.36% (best; LSTM −9.68%).
- **S&P 500**: AlphaAgent IC 0.0056 (next DeepSeek-R1 0.0048), ICIR 0.0552, **AR 8.74%** (next 2.75%), **IR 1.0545** (next 0.2604), MDD −9.10% (best; DeepSeek-R1 −15.34%).
- Achieved with GPT-3.5-turbo while RD-Agent used GPT-4 — the regularization, not the LLM, drives the edge.
- Ablation: constraints raise hit ratio 0.29 vs 0.16 (+81%); symbolic assembly token efficiency 1.00 vs 0.81.

## 8. Code / data availability
None stated (no repo URL in text). Qlib is public; Baostock/Yahoo Finance data sources named.

## 9. Leakage & limitations
- Only 5 evolutionary rounds per trial — small search budget; results may be lucky-seed sensitive (20 trials help).
- OHLCV-only inputs cap the ceiling; no alternative data.
- Transaction costs stated but slippage/market impact absent; top-50 daily rotation on S&P 500 at 8.74% AR needs turnover disclosure (missing).
- Hypothesis–alignment scoring by LLM is uncalibrated — no human audit of whether "aligned" factors are economically sensible.
- The paper's framing overlaps 2043 (AlphaForge, an explicit baseline) and 2047 (AlphaEvolve AST pruning); the decay/crowding framing and the AST-similarity regularizer are the new content.

## 10. GSE overlap
New capability with partial overlap (2043, 2047): the anti-crowding angle is new — sports modeling's equivalent of alpha decay is the public-signal problem (every model bets the same steam). GSE needs an originality guard so its mined signals aren't the same EPA/rest clichés. No overlap in the research map.

## 11. GSE implementation spec
1. Add to GSE's signal-mining loop (2045/2046): AST parse every candidate formula; compute largest-common-subtree similarity vs. the live signal zoo; reject/penalize s above threshold τ.
2. Hypothesis–factor alignment: every mined signal must carry a one-line sports hypothesis ("defensive-line rotation depth predicts 4th-quarter cover rate vs. tired OLs") scored by an LLM judge; misaligned → rejected regardless of backtest.
3. Complexity cap ℛg: symbolic length + parameter count penalties in the fitness function (ties to 2047's pruning).
4. Decay monitoring: track each live signal's trailing-4-season slope; auto-retire on MinervaScore Seal failure (2048) — the sports analogue of the bull/bear decay test.
5. Effort: ~1 week on top of existing mining infra.

## 12. Reproducible test
nflverse 2009–2025. Mine with/without the three regularizers (same budget), test 2021–2025 (regime shifts: rule changes, schedule expansion). Metrics: test RankIC slope per season (decay rate), zoo pairwise AST similarity, Brier lift.

## 13. Acceptance / rejection gate
ADAPT→build if regularized mining shows (a) slower per-season RankIC decay (decay slope ≥ 30% flatter) AND (b) mean pairwise AST similarity ≤ 0.5 vs. ≥ 0.7 unregularized, with test Brier no worse than unregularized. REJECT if regularizers only reduce similarity cosmetically while decay rates match — i.e., novelty theater.

## 14. Improvement experiment
Beyond the paper: **crowding-aware fitness** — instead of similarity vs. GSE's own zoo only, compute similarity vs. a *public-signal proxy zoo* (formulas reconstructed from public analytics discourse, e.g., common EPA/rest/market-move constructions). Penalize resemblance to what the market already knows. The paper fights self-crowding; the sports edge is fighting *consensus*-crowding — a signal identical to PFF's public grades is worthless no matter how novel it is inside your own zoo. Second: make the alignment judge adversarial — a second LLM argues *against* the hypothesis, and only signals surviving both sides are kept.
