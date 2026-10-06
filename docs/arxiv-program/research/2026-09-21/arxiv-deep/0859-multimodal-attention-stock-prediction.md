# [0859] Multi-modal Attention Network for Stock Movements Prediction (arXiv:2112.13593)

**Citation:** He, S. & Gu, S. (2021). *Multi-modal Attention Network for Stock Movements Prediction*. arXiv:2112.13593 [cs.LG, cs.CL, q-fin.TR]. URL: https://arxiv.org/abs/2112.13593
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2112.13593.txt (44,401 bytes, complete paper incl. references). Cross-checked against https://arxiv.org/abs/2112.13593.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the credibility-weighted social-text attention fusion architecture transfers directly to GSE's market lane: fuse X-analyst sentiment with numeric line-movement data, weighting posts by poster track record (GSE already inventories 86+ analyst accounts — the "social impact features" map to verified pick histories). Do not adopt the stock-specific pipeline or the heavy inter-intra attention wholesale.

## Citation / full-text source
Shwai He, Shi Gu, Dec 2021 (v5 in assignment record; content read matches the published version). Dataset + code at https://github.com/HeathCiff/Multi-modal-Attention-Network-for-Stock-Movements-Prediction.

## Research question
Stock prices move as "piece-wise trending fluctuation"; social media contains conflicting, unreliable information that cannot replace historical records. Can a multi-modal attention network that (a) estimates post credibility from poster identity/reputation and (b) fuses semantic (text) and numeric (price-history) features via inter-intra attention beat single-modality and prior fusion methods at predicting 5-day price movements?

## Dataset / schema
- **Social corpora:** scraped from Xueqiu (xueqiu.com, Chinese financial forum); texts in window [t−l+1, t], l = 14 days; max **96 texts** per window; top **150 stocks by popularity** (high-volume stocks get discussed more).
- **Historical trending:** daily OHLCV; per-post H_t^i = price trend from t_i−63 to t_i (**64-day** window); 7 daily features (open, close, high, low, volume + dispersions high−low, open−close, after Feng et al. 2019). Embedded as H_t ∈ R^{n×64×7}.
- **Social impact features A_t:** poster's fans, followers, #posted texts, concerned-stocks vector, **poster profit per stock** (transaction performance = credibility signal), readers' likes/retweets/replies counts. Stock-name similarity S_i = Similarity(S_i, S) between discussed and concerned stocks; concatenated poster-profit vector Concat(P_1…P_n).
- **Labels:** Y_t = 1 if p_{t+Δt} ≥ p_t else 0, where p_{t+Δt} = mean adjusted close from d+1 to d+w, **w = 5 days**. Samples with |movement| < **0.75%** are dropped (upper/lower thresholds ±0.75%).

## Method
Four modules (Fig. 1):
1. **Embedding:** text C_t ∈ R^{n×s×d} → Deep Averaging Network (Iyyer et al. 2015) with flatten (not sum) → C^s ∈ R^{n×d}; social-impact → Linear → A^e ∈ R^{n×d}; price H_t → 3D-CNNpred (Hoseinzade & Haratizadeh 2019) → H ∈ R^{n×d}.
2. **Encoder:** Transformer encoder on text with **time-based positional encoding** — relative post-time dispersion replaces token position: PE(t,2i)=sin(t/c^{2i/d}), PE(t,2i+1)=cos(t/c^{2i/d}), c=10000.
3. **Fusion:** (a) credibility fusion — Transformer decoder with social-impact features as queries/keys and encoded text as values: C = TransDecoder(A^e_q, A^e_k, C^e_v); (b) **inter-intra attention** (Peng et al. 2019 DFAF-style) between text and price: bidirectional transfer values, channel-wise sigmoid gates from avg-pooled conditioning, intra-modality self-attention; FM = Avg_Pool(H^{ind} ⊙ C^{ind}).
4. **Inference:** 1D conv over FM → margin loss (Sabour capsule-style) + reconstruction regularization.
- Preprocessing novelties: entropy-based new-word extraction for Chinese tokenization (left/right entropy H^l/H^r, mutual information I(x), top-k by MI added to dictionary); BM25 key-sentence extraction to fit length limits.

## Equations / math / assumptions
- Task: Ŷ_t = F(C_t, H_t, A_t) (eq. 1); label rule eq. 2 above.
- New-word entropy: H^l_(x) = Σ_{y∈left(x)} −p(x)log p(x) (eq. 3); H^r analog (eq. 4); MI: I(x) = Σ_{a,b∈x} p(a,b) log[p(a,b)/(p(a)p(b))] (eq. 5).
- Encoder: C^e = TransEncoder(C^s_q, C^s_k, C^s_v) (eq. 10); time PE eqs. 11–12.
- Credibility fusion: C = TransDecoder(A^e_q, A^e_k, C^e_v) (eq. 13).
- Inter-attention: H^{itv} = softmax(H_q C_k^T/√d) C_v (eq. 14); C^{itv} symmetric (eq. 15); updated H^{itd} = Linear([H, H^{itv}]^T) (eq. 16).
- Channel gates: G_H = σ(Linear(Avg_Pool(C^{itd}))) (eq. 18); Ĥ^{itd}_q = (1+G_H) ⊙ H^{itd}_q (eq. 19); symmetric for text (eqs. 20–21).
- Intra-attention: H^{inu} = softmax(Ĥ_q Ĥ_k^T/√d) H^{itd}_v (eq. 22); H^{ind} = Linear(H^{itd}+H^{inu}) (eq. 23); symmetric eqs. 24–25. FM = Avg_Pool(H^{ind} ⊙ C^{ind}) (eq. 26).
- Loss: margin loss Loss_k = Y_k max(0, m^+ − ‖Ŷ_k‖)² + λ(1−Y_k) max(0, ‖Ŷ_k‖ − m^−)², **λ=0.5, m^+=0.9, m^−=0.1** (eq. 28); total Loss = ΣLoss_k + λ(FM − Re(Ŷ))², **λ=0.0005** reconstruction (eq. 29).
- Assumptions: social posts and price history are complementary modalities; poster reputation (fans/profit) proxies post reliability; Markov property in prices justifies intra-modality flow.

## Features / target
- Target: binary rise/fall over next 5 trading days (thresholded at ±0.75%).
- Features: word2vec text semantics, 64-day OHLCV-derived trend maps, poster-credibility + engagement features.

## Validation
- Classification on home-collected Xueqiu dataset; metrics: accuracy + **MCC** (eq. 30).
- **Virtual trading Jan–Mar 2021** per Lavrenko et al. (2000): predict up → invest $10,000 at open, sell at +2% profit or last-day close; predict down → short-cover if buyable 1% lower, else close at last-day close. Industry-split P&L vs CapTE and buy-and-hold "Market."
- Training: Adam, lr **0.001** linear decay, batch **64** ("shuffled samples"), latent dim **512**, max text **64 words**, max **96** texts, dropout **0.2**, weight decay **0.001**, fan-in init, zero biases.

## Exact results with baselines
**Table 2 (accuracy / MCC):**
| Model | Acc | MCC |
|---|---|---|
| RF (Pagolu) | 53.13% | 0.0129 |
| HAN | 55.96% | 0.0447 |
| StockNet | 57.35% | 0.0621 |
| Adv-LSTM | 57.93% | 0.0672 |
| MHACN | 58.84% | 0.0721 |
| CapTE (best baseline) | 59.87% | 0.0976 |
| MMAN-oH (hist only) | 56.67% | 0.0583 |
| MMAN-oC (text only) | 59.49% | 0.0737 |
| MMAN-nA (no social-impact) | 60.06% | 0.0850 |
| MMAN-nH (no history) | 60.46% | 0.0937 |
| **MMAN (full)** | **61.20%** | **0.1193** |

- Full MMAN beats best baseline CapTE by **+1.33pp** accuracy (59.87% → 61.20%) and MCC 0.0976 → 0.1193.
- Ablations: social-impact credibility features add +1.14pp (60.06% → 61.20%); history adds +0.74pp (60.46% → 61.20%); text+history fusion beats either alone.
- Virtual trading (Table 3, Jan–Mar 2021): MMAN profits exceed CapTE and market in all 6 reported industries; commerce industry max return "over 12%"; abstract claims **9.13%** trading profits (not directly derivable from Table 3's dollar figures — treat as reported, not verified).

## Code / data availability
GitHub repo linked (dataset + model). Xueqiu corpus is home-collected (Chinese); reproducibility outside China is limited.

## Leakage
- "64 shuffled samples in a batch" and no explicit chronological train/test split described — **temporal leakage risk**: if the split isn't walk-forward, future posts/prices may inform past predictions. The paper never states a time-based split. Treat the 61.20% as potentially optimistic.
- Label uses mean close of d+1..d+5 — fine if features end at d, but the missing split description is the bigger concern.

## Limitations
- Chinese-language social corpus; no evidence the fusion transfers to English sports discourse.
- No chronological split described — possible lookahead leakage.
- ±0.75% movement threshold drops the hard samples, flattering accuracy (real deployment must classify those too).
- Virtual trading window is only 3 months (Jan–Mar 2021); no transaction costs; abstract's "9.13% profits" isn't reconcilable with Table 3.
- Inter-intra attention is computationally heavy for marginal gains over simpler fusion (+0.74–1.14pp ablations).

## GSE overlap vs existing-research-map
- Adjacent to **gap #12** (text/news as features beyond the price — no papers read). The repo has X sweep posts and analyst accounts inventoried but no fusion methodology for social text + numeric market data.
- Distinct from 0858 (Beal): that paper uses journalist text as stacked meta-features; this paper contributes the **credibility-weighting** mechanism (poster reputation → attention weights) and the **bidirectional text↔price attention** — both new to the corpus.
- GSE's 86+ inventoried X accounts with verification work = a ready-made "social impact features" analog (account track record instead of fans/profit).

## Implementation spec (GSE adaptation)
1. **Credibility-weighted analyst-text fusion:** for each NFL game, collect X posts from inventoried analyst accounts in the pre-game window; encode with a sentence transformer; compute per-poster credibility features from GSE's verification data (historical pick accuracy, CLV of past calls, follower counts); fuse text embeddings with numeric line-movement features (open→current spread/total deltas, steam flags) using cross-attention where credibility features supply the queries/keys (the paper's eq. 13 pattern).
2. **Time-based positional encoding:** adapt eqs. 11–12 with post-time-to-kickoff dispersion instead of token position — posts closer to kickoff carry fresher information.
3. **Prediction head:** margin-loss classifier for direction of line movement (steam direction) or moneyline outcome; train on 3 NFL seasons with strict walk-forward splits (fixing the paper's leakage flaw).
4. **Do NOT adopt:** the ±0.75% sample-dropping (deploy on all samples), the heavy inter-intra block initially (start with the credibility decoder + simple cross-attention; add inter-intra only if the simple version underperforms), Chinese-specific preprocessing.

## Reproducible test
1. Clone the linked GitHub repo; if the Xueqiu data is unavailable, rebuild the architecture on a public stock+text dataset (e.g., StockNet's Twitter corpus).
2. Gate: reproduce the ablation ordering full > nA > nH > oC > oH on a walk-forward split. If the credibility ablation (nA → full, +1.14pp) doesn't reproduce, the core claim fails.
3. GSE pilot: 1 NFL season, X-analyst text + line-movement features → predict closing-line direction; baseline = line-movement-only model; success = statistically significant accuracy/MCC lift with the credibility fusion vs without.

## Numeric gate
**Full MMAN 61.20% accuracy / MCC 0.1193 vs CapTE 59.87% / 0.0976; credibility ablation +1.14pp (60.06% → 61.20%).** If the credibility-weighting ablation doesn't reproduce on walk-forward data, do not adopt.

## Improvement experiment
Replace the paper's DAN+word2vec with a modern pretrained encoder, and the inter-intra attention with a single cross-attention block gated by poster credibility; run on English NFL X-discourse with strict temporal splits; compare (a) no credibility, (b) paper's full inter-intra, (c) simplified credibility-gated cross-attention — measuring accuracy, MCC, and simulated CLV. Hypothesis: (c) matches (b) at a fraction of the cost.

## Verdict
**ADAPT.** The two transferable ideas are (1) poster-credibility-as-attention-queries for noisy social text, and (2) time-dispersion positional encoding for pre-event posts — both directly applicable to GSE's X-analyst-text + line-movement fusion in the market lane. Do not adopt the stock pipeline as-is: temporal-split hygiene is unproven, the corpus is Chinese, and the heaviest attention machinery buys only ~1pp.
