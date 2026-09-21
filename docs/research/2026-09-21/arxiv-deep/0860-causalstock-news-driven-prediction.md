# [0860] CausalStock: Deep End-to-end Causal Discovery for News-driven Stock Movement Prediction (arXiv:2411.06391)

**Citation:** Li, S., Sun, Y., Lin, Y., Gao, X., Shang, S., & Yan, R. (2024). *CausalStock: Deep End-to-end Causal Discovery for News-driven Stock Movement Prediction*. arXiv:2411.06391 [cs.LG, cs.AI, cs.CE, cs.CL]. URL: https://arxiv.org/abs/2411.06391
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2411.06391.txt (72,550 bytes, complete paper incl. appendices A–F with prompts, hyperparams, metric definitions). Cross-checked against https://arxiv.org/abs/2411.06391.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — two ideas worth adapting: (1) the LLM-based Denoised News Encoder's 5-dimension scoring rubric (correlation / sentiment / importance / impact / duration) as a structured NFL-news feature extractor (gap #12); (2) lag-dependent temporal causal discovery for directed cross-book line-movement graphs (steam propagation is a causal, not correlational, phenomenon). Do not adopt the full FCM/ELBO machinery as-is — heavy for the gain.

## Citation / full-text source
Renmin University of China / Peking University / KAUST team, Nov 2024. Funded by NSFC 62122089. Implemented in PyTorch on 4× NVIDIA Tesla V100. Appendix A contains the full LLM prompt design; Appendix C the parameter setup; Appendix E limitations.

## Research question
Two unsolved issues in news-driven multi-stock movement prediction: (1) stock relations are unidirectional (supplier→consumer), so attention/graph *correlation* models are the wrong tool — *causal* relations (directional information flow) are more appropriate; (2) news data is massively noisy. Can an end-to-end framework that discovers lag-dependent temporal causal graphs while denoising news with an LLM beat strong baselines on both news-driven and price-only tasks?

## Dataset / schema
Six public benchmarks, chronological splits (train/val/test), US + China + Japan + UK:
| Dataset | Region | Stocks | News? | Train | Val | Test |
|---|---|---|---|---|---|---|
| ACL18 | US | — | Yahoo Finance + Twitter | 2015/10/01 | – | 2016/01/01 |
| CMIN-US | US | 110 | Yahoo Finance + Yahoo | 2018/01/01–2021/04/30 | 2021/05/01–2021/08/31 | 2021/09/01–2021/12/31 |
| CMIN-CN | CN | 300 | Yahoo Finance + Wind | same | same | same |
| KDD17 | US | 50 | — (11 price feats) | 2007/01/03–2015/01/01 | 2015/01/02–2016/01/03 | 2016/01/04–2017/01/01 |
| NI225 | JP | 51 | — (11 price feats) | 2016/07/01–2018/03/01 | 2018/03/02–2019/01/06 | 2019/01/07–2019/12/31 |
| FTSE100 | UK | 24 | — (11 price feats) | 2014/01/06–2017/01/03 | 2017/01/04–2017/07/03 | 2017/07/04–2018/06/30 |

Inputs per stock-day: news corpus representation C_t^i + price features P_t^i (adjusted close/high/low/open/close + volume). Target y_T^i ∈ {0,1} = fall/rise of adjusted close on day T, predicted jointly for all D stocks from the past L lags.

## Method
Three components (Fig. 2):
1. **Market Information Encoder:** price encoder (embedding → P_t^i ∈ R^{d_p}); **LLM-based Denoised News Encoder** — an LLM scores each news text on 5 dimensions: correlation (0–10), sentiment polarity (−1..1), significance/importance (0–10), potential price impact (0–10), duration of impact (0–10). Each text → 5-dim vector Ĉ_t^i ∈ R^{l×5} → embedding → C_t^i ∈ R^{l×d_m}.
2. **Lag-dependent Temporal Causal Discovery:** Bayesian treatment of the temporal causal graph posterior p(G|X_{<T}); variational approximator q_φ(G) as a product of Bernoulli distributions per lag-edge, with existence/non-existence logits coupled across lags by 3-layer MLPs h_u, h_v (trainable); Gumbel-softmax gradients; separate learnable causal *weight* graph Ĝ ∈ R^{L×D×D} for causal degree.
3. **Functional Causal Model:** additive-noise FCM y_T^i = f_i(Pa_G^i(<T)) + z_T^i, z_T^i ~ N(0,(σ^i)²); f_i aggregates causally-masked price+news features through shared nets ℓ, ψ and per-node ζ_i, output through logistic sigmoid as the movement probability.

## Equations / math / assumptions
- Temporal causal graph: **G = [G_1,…,G_L] ∈ R^{L×D×D}**, G_{l,ji} = 1 iff X_{t−l}^j → X_t^i (eq. preamble).
- FCM: X_t^i = F_i(Pa_G^i(<t), z_t^i) (eq. 1); no DAG constraint needed — "DAG naturally for the irreversibility of time."
- Likelihood factorization: p(y_T|X_{<T}) = ∫_G p(y_T|X_{<T},G) p(G|X_{<T}) dG (eq. 2).
- **Lag-dependent** graph posterior: p(G|X_{<T}) = p(G_1|X_{T−1}) ∏_{l=2}^L p(G_l|G_{l−1}, X_{T−l}) (eq. 3) — the paper's core novelty vs lag-independent DECI-style discovery.
- Graph prior: p(G) ∝ exp(−λ_s‖G_{1:L}‖_F² − λ_d‖G_{1:L}−G^p_{1:L}‖_F²) (eq. 4); G^p = optional domain-knowledge graph (e.g., a broken partnership updates the graph).
- Variational posterior: q_φ(G) = ∏ Bernoulli per edge with σ_{l,ji} = exp(u′_{l,ji})/(exp(u′)+exp(v′)) (eqs. 5–8); u′ = h_u(u_{l,ji}, u_{l−1,ji}).
- FCM aggregation: f_i(Pa) = Sigmoid(ζ_i(Σ_l Σ_j G_{l,ji} Ĝ_{l,ji} [ℓ(P_{T−l}^j), ψ(C_{T−l}^j)])) (eq. 10); strictly masked: ∂f_i/∂X_t^j = 0 if j ∉ parents.
- Gaussian noise → log p_θ(y_T|X_{<T},G) = Σ_i log p_{z_i}(z_T^i) (eqs. 11–12); ELBO + BCE: ℒ = (1/D)(−ELBO + λ·BCE), **λ = 0.01** (eq. 14).
- Assumption (from [14,9]): "if the prediction is accurate, the causal graph can be considered a reliable approximation of real causal relations" — strong; prediction accuracy ≠ causal validity.

## Features / target
- Target: binary next-day rise/fall per stock, all D stocks jointly.
- Features: 5-dim LLM news scores (embedded), price embeddings; learned causal graph + weight graph.

## Validation
- ACC + MCC (eqs. 15–16), std over **10 runs** (news task) / **5 runs** (no-news task).
- Investment simulation: top-3 predicted stocks, equal weight, daily rebalance on test set → Accumulated Portfolio Value APV^t = ∏(1+r^i) (eq. 17) and Sharpe ratio (eq. 18).
- Grid-searched hyperparams: lr **1e−5** ∈ [1e−3,1e−4,1e−5,1e−6]; lag **L=5** ∈ [3,5,7,9]; price-encoder hidden **4** ∈ [4,8,16]; batch **32**; λ=0.01; news: w=20 words, l=10 news/day, d_w=50, d_m=64; λ_s=1; h_u/h_v 1-layer MLPs; ζ/ℓ/ψ 3-layer MLPs hidden **332**; Adam, Xavier init.

## Exact results with baselines
**Table 1 — news-driven task (ACC ± std / MCC ± std):**
| Model | ACL18 (US) | CMIN-US | CMIN-CN |
|---|---|---|---|
| HAN | 57.64±0.0040 / 0.0518 | 53.72 / 0.0103 | 53.59 / 0.0159 |
| StockNet | 58.23 / 0.0808 | 52.46 / 0.0220 | 54.53 / 0.0450 |
| PEN | 59.89 / 0.1556 | 53.20 / 0.0267 | 54.83 / 0.0857 |
| CMIN (best baseline) | 62.69±0.0029 / 0.2090 | 53.43 / 0.0460 | 55.28 / 0.1110 |
| **CausalStock** | **63.42±0.0039 / 0.2172** | **54.64±0.0083 / 0.0481** | **56.19±0.0084 / 0.1417** |

**No-news task:** KDD17: 56.09±0.0069/0.1235 vs DTML 53.53/0.0733 (+2.56pp); NI225: 53.01/0.0640 vs 52.76/0.0626; FTSE100: 52.88/0.0534 vs 52.08/0.0502.
**Investment simulation (Table 4):** ACL18 SR **0.369**/APV **1.32** vs CMIN 0.357/1.24, PEN 0.293/1.12, market 0.107/1.07; KDD17 0.192/1.49; NI225 0.259/1.52.
**Ablations (Table 2, ACL18 ACC):** w/o TCD **51.08** (MCC 0.0102 — causal module carries ~12pp; removing it collapses to coin-flip); w/o news 58.10; w/o link non-existence 58.21; w/o lag-dependent (lag-independent) 59.19 (−4.23pp vs full); variable-dependent TCD 63.50 (slightly better, but O(L·D⁴) vs O(L·D²) — rejected as impractical). News encoders: GPT-3.5 denoised **63.42** > Llama denoised 62.82 > FinGPT denoised 61.92; raw embeddings worse than denoised for the same LLM (Llama embed 62.20, FinGPT embed 61.69, Roberta 61.81, FinBert 61.72, Bert 61.74, Glove+BiGRU 60.78).
**Explainability:** causal strength = G ⊙ Ĝ; Spearman corr(market value, causal strength): ACL18 **0.7939** (p=0.006), NI225 0.7212 (p=0.0185), CMIN-CN 0.6491 (p=0.0036), FTSE100 **0.8909** (p=0.0005). Denoised-news examples: AAPL 5G-delay news → sentiment **−0.7**, impact **9**; TSLA delivery milestone → sentiment **+0.7**; unrelated-to-GOOG news → negligible impact.

## Code / data availability
No code link stated in the paper. All 6 datasets are public (links in Appendix C.1 table). LLM prompts fully specified in Appendix A (reproducible scoring rubric).

## Leakage
- Chronological train/val/test splits on all 6 datasets — good hygiene, no obvious lookahead.
- LLM scoring used GPT-3.5/FinGPT/Llama with knowledge cutoffs after some test periods — possible indirect leakage (LLM "knows" 2021 outcomes when scoring 2021 news). The paper does not address this. Prefer Llama-7b-chat (2023-02 knowledge) variants and re-run scoring with a frozen open model for GSE use.

## Limitations
- Appendix E (authors' own): causal discovery is theoretical; no time-varying graph (future: meta/incremental learning); Bernoulli captures only edge existence, not multi-level causal strength (the separate Ĝ weight graph is a workaround, not a principled fix).
- LLM-as-scorer: per-article inference cost at scale; safety/values risk flagged in Appendix F; reproducibility depends on proprietary GPT-3.5 behavior.
- "Accurate prediction ⇒ reliable causal graph" is asserted, not proven — the explainability results are correlational (market-cap vs strength).
- Variable-dependent TCD rejected on complexity; lag window L=5 is small.

## GSE overlap vs existing-research-map
- **Gap #12 (text/news as features beyond the price):** the 5-dimension LLM scoring rubric is a concrete, immediately reusable feature-extraction protocol for NFL news — more structured than anything in the corpus.
- **Gap #3 (market microstructure):** cross-book line movement is a directed phenomenon (Pinnacle steams → followers copy). Lag-dependent TCD is the right formal tool for learning "which book moves first" graphs from line time series. The map lists only 1211.4000 + PLOS ONE 2023 in this gap; nothing causal.
- Distinct from covered FineCausal (2503.23911, fine-grained causal) and the 0859 MMAN attention fusion — no overlap; this is the first variational-causal-discovery read.
- CEPT lane note: Garrett's own causal theory lane — the temporal-FCM formalism here is complementary machinery, not duplication.

## Implementation spec (GSE adaptation)
1. **Denoised news encoder for NFL:** adapt the Appendix A 5-dimension rubric to sports news — correlation-to-game (0–10), sentiment toward team/player (−1..1), significance (injury to starter vs depth), expected line impact (0–10), duration (days the news matters). Score beat-writer articles + injury reports with a frozen open LLM; use the 5-dim vectors as features alongside engine probabilities. This directly attacks gap #12.
2. **Lag-dependent TCD for steam graphs:** nodes = sportsbooks (Pinnacle, Circa, BetMGM, DraftKings, FanDuel, …), edges = directed lagged causal links in spread/total time series, lag L = 5–15 min buckets. Learn G (existence) + Ĝ (strength); read off "who leads" per market. Use the prior slot G^p to inject known relationships (e.g., Pinnacle-leads priors).
3. **Ablation-first adoption:** replicate the paper's w/o-TCD test on GSE data — if removing the causal graph doesn't collapse performance, keep only the news encoder.
4. Do NOT adopt: the full ELBO+FCM training stack initially (start with the learned graph feeding a standard gradient-boosted classifier); variable-dependent TCD (O(L·D⁴)).

## Reproducible test
1. Rebuild the 5-dim news scorer from Appendix A prompts with a frozen open LLM; score 1 NFL season of injury/beat news.
2. Build book-level line-movement panel (5-min buckets, 5+ books, 1 season); implement lag-dependent TCD (Bernoulli variational posterior + Gumbel-softmax) with L=5.
3. Gates: (a) news features alone lift a baseline classifier's MCC on next-day line direction; (b) learned causal graph recovers known lead-lag structure (Pinnacle → followers); (c) w/o-TCD ablation shows a material drop — if (c) fails, the causal machinery adds nothing.

## Numeric gate
**w/o-TCD ablation: 63.42% → 51.08% ACC on ACL18 (MCC 0.2172 → 0.0102); lag-dependent vs lag-independent 63.42% vs 59.19%.** The causal module must prove a comparable ablation gap on GSE line data, or it stays out.

## Improvement experiment
Time-varying causal graphs (the authors' own future work): implement incremental/online updating of G so steam-leadership can shift within a season (e.g., a book changes its risk desk mid-season); compare static-G vs online-G on next-week steam-direction prediction. Second: replace Bernoulli edge existence with a graded (multi-level) causal distribution, testing whether strength-graded edges beat the existence+weight workaround.

## Verdict
**ADAPT.** The denoised-news 5-dimension scoring rubric is immediately portable to NFL news features, and lag-dependent temporal causal discovery is the correct formalism for directed steam-propagation graphs across books — both fill recognized gaps (#12 text-as-features, #3 market microstructure). Adopt in ablation-first order: news encoder first, causal graph second, and require the w/o-TCD collapse to reproduce before trusting the machinery.
