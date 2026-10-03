# Ledger 0797 — Wisdom of LLM Crowds: Aggregation and Contamination in Language Model Ensembles

**Paper:** `2607.18269v1` — *Wisdom of LLM Crowds: Aggregation and Contamination in Language Model Ensembles* (Igor Douven, Sorbonne/CNRS)
**Full-text source:** `/tmp/ledgers-read/2607.18269.txt` (complete arXiv full text; read end to end on 2026-09-21)
**Verdict:** ADAPT
**Lane:** ensembles (sublabel: error-pattern-diversity weighting + contamination discipline)

---

## Research question

Does the wisdom of crowds transfer from humans to LLM ensembles? The paper elicits probability estimates from 15 LLMs on 254 binary prediction-market questions and asks: (1) can learned aggregators beat the best individual model and classical aggregation; (2) is the benefit nonlinear feature interaction, expert selection, or **error-pattern diversity exploitation**; (3) how badly does **training-cutoff contamination** distort apparent capability gaps and model rankings?

## Method

### Materials

- Binary YES/NO questions from **Manifold Markets** (play-money prediction platform), resolved **June 2024 – March 2026**, each with ≥ 75 unique traders; ambiguous/personal/insider questions excluded. Initial dataset: 208 statements (107 YES / 101 NO), mean closing community probability 0.53 ± 0.30.
- **Clean subset:** 94 items (44 YES / 50 NO) resolving **after 1 September 2025** — after every model's training cutoff (latest: August 2025). The remaining 160 items serve as the training set for learned aggregators (temporal transfer design).
- 15 LLMs: 5 local (Ollama: Mistral 7B, LLaMA 3.1 8B, Gemma 2 9B, Phi-4 14B, Qwen 2.5 7B) + 10 frontier cloud (GPT-5.2/5.4/5.4 Mini, DeepSeek-chat, Gemini Flash-Lite/Flash/Pro, Claude Haiku 4.5, Sonnet 4.6, Opus 4.6).
- Elicitation: standardized prompt, "Base your answer only on your training knowledge. Do not search the internet," temperature at provider default (1.0), parseable `PROBABILITY: [number]`; missing cells (0.4% main, 4/1410 clean) treated as missing / imputed with training-set means for learned aggregators.

### Aggregation methods

- **Classical:** arithmetic mean, harmonic mean, geometric/log-odds mean (equivalent to extremized geometric mean renormalized; the normative standard under conditionally-independent, calibrated judgments), median.
- **MLP aggregator:** 15 → 64 (ReLU, dropout 0.2) → 32 (ReLU, dropout 0.2) → sigmoid; Adam lr 5e-3, 25 epochs, BCE loss, batch 16; trained on the 160 non-clean items, evaluated on the 94 clean items.
- **Logistic regression:** L2-regularized (λ = 0.01) on the same 15-dim input — a *linear* learned aggregator. If LR ≈ MLP, the benefit is a linear combination of diverse outputs, not nonlinear interaction.
- **Symbolic regression:** SymbolicRegression.jl, 50 independent runs, distilling the MLP's learned mapping; Pareto frontier of formula accuracy vs complexity.

### Contamination analysis

- Within-cutoff vs outside-cutoff accuracy and probability extremity |p − 0.5| (Welch t-tests).
- Spearman correlation of model rankings (full 208 vs clean 94).
- Manifold comparison: final market probability (upper bound, BS) and **cutoff-matched** market probability (last price before each model's training cutoff month) as temporally fair baselines.

## Exact results with baselines

### Individual models (full 208)

Best: Claude Sonnet 4.6 BS 0.273; Claude Opus 4.6 0.284; Gemini Flash 0.286. Local models: 0.362–0.413.

### Aggregation on the clean 94 items

| Method | Brier ↓ | Accuracy | AUC |
|---|---|---|---|
| Arithmetic mean | 0.313 | 0.511 | 0.498 |
| Median | 0.343 | — | — |
| MLP | 0.264 (15.6% reduction) | 0.606 | 0.657 |
| **Logistic regression** | **0.241 (23% reduction)** | 0.574 | 0.633 |

- Both learned aggregators beat **every** individual model and all classical methods. LR achieves the lower Brier; MLP better AUC/accuracy.
- Statistical significance: MLP vs arithmetic mean — sign test 62/94, p = .002; Wilcoxon z = −2.48, p = .013; permutation p = .049. LR's larger mean reduction concentrated on fewer items (sign test p = .837, permutation p = .002).
- LR ≈ MLP ⇒ the aggregation benefit is captured by a **linear combination** of diverse outputs; nonlinearity buys discrimination at the cost of calibration.

### Mechanism: error-pattern diversity, not expert selection (symbolic regression + coefficient analysis)

- Across 50 SR runs, 11 models selected in >50% of runs; selection frequency vs individual Brier rank: $r_s = 0.295$ (weak). Models selected in **100% of runs include both the best cloud models (Sonnet, Opus, Flash, Gemini Pro, GPT-5.4 Mini) and three of the worst local models (Qwen 2.5 7B, LLaMA 3.1 8B, Phi-4 14B)** — a U-shape consistent with mining complementary error patterns, not expert selection.
- Lowest-complexity useful Pareto formula: $\sigma(p_{\text{Gemini Pro}} - p_{\text{Claude Haiku}})$ — a **pure model-disagreement signal** between two models, neither being the best individual. Evaluated against actual resolutions: BS 0.231 on 203 full items (**12.9% reduction** vs 15-model arithmetic mean 0.265); BS 0.243 on clean 94.
- LR weight analysis: absolute weight vs **error decorrelation** (negative mean pairwise Pearson correlation of squared errors): $r_s = +0.482$; vs individual Brier rank: $r_s = -0.075$. The aggregator upweights models with **independent errors**, not accurate models.
- **Nine of 15 models receive negative weights** — used contrastively: when a systematically-biased model predicts high, the aggregate is pulled down. Weak models contribute through their *biases*, provided those biases are distinct from the crowd.

### Contamination

- All models with sufficient within-cutoff items: higher accuracy inside the training window, differentials **+0.05 to +0.26** (Claude Sonnet +0.256).
- Elevated probability extremity on within-cutoff items: Gemini Flash (t = 4.25, p < .001), Gemini Pro (t = 2.68, p = .008) — overconfident retrieval of memorized outcomes. Anthropic models showed accuracy gains *without* elevated extremity (calibration training suppressed overconfidence).
- Spearman rank correlation, full vs clean rankings: **ρ = 0.532** — contamination substantially reshuffles rankings (LLaMA 3.1 8B: 14 → 6; GPT-5.4 Mini: 6 → 13; Claude Opus: 2 → 9).
- **Cloud–local arithmetic-mean gap collapsed from 35.8% to 8.9%** on clean items — much of the apparent frontier-model advantage is memorized outcomes, not better probabilistic reasoning.

### LLM crowd vs human prediction market

- Final market BS 0.098 vs LLM arithmetic mean 0.266 (**2.72×**).
- Cutoff-matched: every LLM 1.61–2.64× worse than the market at its own cutoff (mean 1.95×); LLM mean vs market at Aug-2025 cutoff **2.01×**.
- Genuine information-aggregation gap, not recency: even controlling for the market's updating advantage, the actively-traded human market outperforms every LLM crowd member.

## Dataset/schema

- 254 unique binary statements from Manifold Markets with resolutions, community closing probabilities, and per-model cutoff-matched historical market prices (Manifold API bet-history endpoint).
- 15 × 208 model–item probability estimates + 15 × 94 clean-subset estimates.

## Features/target

- Features: 15-dimensional vector of model probability estimates per question.
- Target: binary resolution.
- SR features: same; discovered target-function family: pairwise model disagreements.

## Validation

- Temporal transfer: learned aggregators trained on contaminated-era items, evaluated on clean post-cutoff items (a handicap they survive — sign test p = .002).
- Metrics: Brier score (primary), accuracy, AUC; sign/Wilcoxon/permutation tests.
- Sensitivity: cutoff dates shifted ±1 month — contamination findings stable (cloud–local gap ~36% full / ~13% nested-clean; mean Δacc ≈ 0.17).

## Code/data availability

**Supplementary materials (Julia code + data):** https://osf.io/8dng6/overview?view_only=3c535d46fe924def902e5579983313cc

## Leakage / caveats

1. Clean subset is only **94 items** — individual-model rankings and subgroup analyses are underpowered (author flags this; future work needs 200–300 clean items).
2. Learned aggregators trained on the contaminated landscape — distribution shift to clean evaluation; whether weights are stable under clean training is open.
3. Single elicitation prompt, no ≥70B open-weight models, temperature 1.0.
4. LLM–market gap is domain-specific (play-money platform, event forecasting) but the contamination discipline is general.

## GSE overlap

Distinct from all prior ensemble ledgers: 0795 (DTVW) weights by time-varying forecast *spread*; 0796 (WALLA) weights by learned *score advantage*; 0788 (FFORMA) meta-learns static weights from series features. This paper's contribution is orthogonal: weights track **error decorrelation** (not spread, not past accuracy), weak models contribute **contrastively via negative weights**, and the aggregation benefit reduces to a learnable **linear** combination. The contamination discipline complements GSE's existing practice rather than duplicating it.

## GSE implementation

**Problem it solves for GSE:** GSE's ensemble includes systematically-biased sources (e.g., market lines over-shading public teams; engine variants with correlated errors). This paper shows the right weight criterion is not individual accuracy but **error independence** — and that biased-but-distinct sources should get *negative* weights (contrastive correction) rather than zero.

**Implementation spec (Python):**

1. On completed games, compute each source's per-game squared error vs outcome; build the 15×15 (or K×K) **error-correlation matrix**.
2. Fit L2 logistic regression (λ = 0.01) on the source probability outputs → aggregate. Check: do |weights| correlate with error decorrelation (replicate the $r_s$ test)? Expect $r_s > 0.3$.
3. **Contrastive feature engineering:** add pairwise disagreement features $p_i - p_j$ (the $\sigma(p_A - p_B)$ formula family) — these are the paper's lowest-complexity useful signals. Test whether a difference between the engine probability and the market-implied probability outperforms either alone.
4. Keep sources with negative weights rather than pruning them; interpret their coefficients as bias-correction terms.
5. **Contamination discipline for LLM/news signals:** any LLM-derived game feature must be trained on data strictly before the game date; the paper's 35.8% → 8.9% collapse is the cautionary number — backtests on "known" eras (e.g., 2023 season evaluated with a model trained through 2024) inflate source gaps by an order of magnitude.

**Reproducible test:** Two-season backtest. Season 1: compute error-correlation matrix + fit LR on source probabilities. Season 2 (strictly post-cutoff for all sources): compare LR aggregate vs arithmetic mean vs best single source on Brier; decompose the gain into (a) weight-on-independent-errors and (b) contrastive negative-weight contributions.

**Numeric gate:** Learned linear aggregate must beat the arithmetic mean by **≥ 5% Brier** on the held-out season, with the error-decorrelation replication $r_s \ge 0.3$, before production. No nonlinear aggregator needed — LR sufficiency is a paper result; skip the MLP.

**Improvement experiment:** The paper's best formula is a pairwise disagreement; extend to a **triplet interaction** $(\sigma(p_A - p_B) \cdot |p_A - p_C|)$: scale the engine–market disagreement signal by how far a third source (e.g., consensus power rating) sits from them — disagreement *about the disagreement*. Test whether this captures games where the market has mispriced public sentiment (CLV test).

## Conclusion for GSE

This is the cleanest empirical statement in the 750 ensemble lane of *what to optimize when weighting*: error independence ($r_s = +0.482$), not individual accuracy ($r_s = -0.075$). Combined with 0796's advantage-alignment and 0795's diversity prior, it gives GSE a three-way weighting doctrine: weight what disagrees productively (0795), what has a realized edge (0796), and what errs independently — using biased sources contrastively (0797). The contamination quantification (35.8% → 8.9%) is a mandatory discipline for every LLM-derived signal in the pipeline.

**VERDICT: ADAPT** — fit L2 logistic aggregation on GSE's source probabilities with error-decorrelation weight diagnostics and contrastive negative weights; enforce strict training-cutoff hygiene for all LLM/news-derived features.
