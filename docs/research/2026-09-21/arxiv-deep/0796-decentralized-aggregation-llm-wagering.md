# Ledger 0796 — Decentralized Aggregation of LLM Predictions via Wagering Mechanisms (WALLA)

**Paper:** `2607.04389v1` — *Decentralized Aggregation of LLM Predictions via Wagering Mechanisms*
**Full-text source:** `/tmp/ledgers-read/2607.04389.txt` (complete arXiv full text; read end to end on 2026-09-21)
**Verdict:** ADAPT
**Lane:** ensembles (sublabel: incentive-compatible advantage-aligned weighting)

---

## Research question

When multiple LLMs — each with distinct capabilities, domain expertise, or private tools/data — predict the same outcome, how should their probabilistic forecasts be weighted **without** centralized access to their private information? Existing decentralized weights (fixed weights, self-reported confidence, input perplexity) are unreliable under miscalibration and gameable by models seeking influence. The paper designs **WALLA** (advantage-aligned Wagering mechanisms for LLM Aggregation): each model reports a prediction *and* a learned wager; wagers serve as aggregation weights, and payouts are designed so that the **best-response wager is exactly the model's expected score advantage over the pool**.

## Method

### Canonical baseline: WSWM

The weighted-score wagering mechanism (Lambert et al.): payout $\pi_i = w_i (s(p_i,y) - \bar s_w)$, where $\bar s_w$ is the wager-weighted average score. Problem: the optimal wager is **binary** (0 or max) — too coarse for weighting — and incentive compatibility relies on immutable beliefs.

### WALLA net payout function

$$\pi_i(\mathbf{p},\mathbf{w},y) := w_i \bigl(s(p_i,y) - b_{-i}(\mathbf{p}_{-i},\mathbf{w}_{-i},y) - c_3 w_i\bigr)$$

where $b_{-i}$ is a **leave-one-out baseline** (depends only on others' reports) and $c_3 > 0$ is a regularization constant. Expected payout decomposes into self-score minus baseline, minus the quadratic regularization $c_3 w_i^2$.

### Three core theorems

1. **Theorem 3.2 (DSIC of prediction).** Truthful prediction is a dominant strategy under **any** belief structure (including mutable beliefs — an agent can revise beliefs after seeing others' reports and truthfulness still holds). WSWM had an $O(1/M)$ bias under mutable beliefs.
2. **Theorem 3.3 (Advantage–wager alignment).** For any fixed prediction, the best-response wager is $w_i^*(p_i) = (A_i / 2c_3)^+$, where $A_i = \mathbb{E}[s(p_i,Y) - b_{-i} \mid \mathcal{F}_i]$ is the expected score advantage. Agents with non-positive advantage wager **zero** and self-exclude from aggregation. This is a continuous, informative weight signal — not binary.
3. **Prediction-agnostic wager optimization.** The optimal wager is well-defined even for a suboptimal prediction, so wager learning can be **decoupled** from prediction quality: a small network on the model's hidden state can learn "when do I have an edge" without improving the base model's predictions.

### Two baseline variants

- **WALLA I:** $b_{-i} = \sum_{j \ne i} w_j s(p_j,y) / \sum_{j \ne i} w_j$ (average of scores). Satisfies normality; admits arbitrage.
- **WALLA II:** $b_{-i} = s(q_{-i}, y)$ with $q_{-i} = \sum_{j \ne i} w_j p_j / \sum_{j \ne i} w_j$ (score of the pooled prediction). Satisfies no-arbitrage; sacrifices normality.

Worst-case mechanism deficit is bounded by $(\bar s - \underline s)^2 / 4c_3$ — independent of participant count $M$ and wager amounts. The designer tunes $c_3$: larger $c_3$ shrinks the deficit but suppresses wagers.

### Aggregation rules

Linear pooling $\hat p_{\text{lin}} = \sum_i w_i p_i / W$ (minimizer of wager-weighted KL$(p_i \| q)$, preserves disagreement) and logarithmic pooling $\hat p_{\log}[y] \propto \prod_i p_i[y]^{w_i/W}$ (externally Bayesian, sharper, consensus-emphasizing). Experiments show the learned wagers, not the pooling choice, drive quality.

### Learning the wager network

Each agent freezes its base LLM and trains a small 2-layer MLP on its last-layer hidden state to output a non-negative wager. Training signal: the **hindsight-optimal wager** $w^* = ((s_i - b_{-i})/2c_3)^+$, recovered from the agent's **own** payout alone via $s_i - b_{-i} = \pi_i / w_i + c_3 w_i$ — fully decentralized. MSE objective to the hindsight target is equivalent to hindsight regret minimization when $w^* > 0$.

## Exact results with baselines

Four LLM participants (Gemma-2-9B, Llama3.1-8B, Llama3-Aloe-8B medical fine-tune, BioMistral-7B). Benchmarks: PubMedQA, MedMCQA, MMLU (in-distribution), ARC-Challenge (out-of-distribution), BayesX (synthetic forecasting). Baselines: UniformAvg, SelfCertainty (confidence weights), PackLLM (inverse-perplexity weights), RouterDC/NIRTRouter/RouteLLM (routers), StackedGen (centralized, sees all hidden states — strong reference). All metrics ×100; ± = 95% CI over 5 runs.

### Scenario I — homogeneous models, private contexts (one of M ∈ {4,8,12} Aloe copies receives a relevant PubMedQA abstract)

- WALLA I (M=4): AUC 81.07 ± 0.58, ACC 87.00 ± 0.47 — matches StackedGen (81.99/87.76) and RouteLLM w/ context (82.32/87.48), beats all decentralized/learning-free baselines.
- Robustness to pool size: UniformAvg AUC drops 70.29 → 63.10 as M grows 4 → 12; WALLA I holds at 81.07 → 82.10.
- On BayesX (Gemma2, informed model identifiable): WALLA I/II achieve **MRR = 100.00** at all M — the wager network always identifies the model with evidence; KLD 2.22 (M=4) vs UniformAvg 25.64. SelfCertainty collapses (KLD 61.44) because BayesX evidence makes posteriors better-informed but *closer to uniform* — an elegant counterexample to confidence-based weighting.

### Scenario II — heterogeneous models, no context (MedMCQA, MMLU in-dist; ARC-Challenge OOD, trained on MMLU)

- MedMCQA: WALLA I ACC 81.17 vs StackedGen 82.66; UniformAvg 76.45 (hurt by weak Gemma2/BioMistral).
- MMLU: WALLA I 86.78, WALLA II 86.98 vs StackedGen 87.09 (matches best individual Gemma2 87.18).
- ARC-Challenge OOD: WALLA II 90.28 vs StackedGen 90.35.
- Rank-correlation of wagers with per-question Brier scores (K-Tau): WALLA I 24.17/45.11/44.90 across datasets — learned wagers genuinely order models by quality.

### Scenario III — heterogeneous models + private contexts (PubMedQA)

- WALLA I AUC 79.76 / 77.98 vs StackedGen 81.17 / 80.30 (one relevant context / one relevant + one irrelevant context).
- RouteLLM/PackLLM are competitive with one context but degrade when an *irrelevant* context is added; WALLA's wager network jointly assesses intrinsic competence + context relevance.

### Advantage–wager alignment verification (Fig. 1)

Learned wagers positively correlate (Pearson) with realized score differentials $s(p_i,y) - b_{-i}$ across all scenarios; on PubMedQA, models wager near zero when they lack the relevant abstract.

### Calibration incentive (Sec. 4.6, Table 6)

Temperature scaling conditioned on hidden states is incentivized by the mechanism: when Gemma2 alone is calibrated, its net payouts improve on MedMCQA and MMLU (e.g., MedMCQA wager 5.87 → 5.13 with payout −0.93 → −0.45; on MMLU where it is best, wagers rise 16.30 → 16.62). Calibrated WALLA I reaches ACC 82.53 (MedMCQA), 87.68 (MMLU), 89.59 (ARC) — competitive with the centralized StackedGen while remaining fully decentralized.

## Dataset/schema

- Participants: 4 LLMs with distinct capabilities.
- Datasets: PubMedQA (biomedical QA with abstracts as private context), MedMCQA, MMLU, ARC-Challenge (reasoning QA), BayesX (synthetic Bayesian forecasting with concentrated priors and evidence-induced uniform posteriors).
- Prediction: probability distribution over outcome space from output logits; Brier scoring rule.

## Features/target

- Features: last-layer hidden state after processing question (+ optional private context) — input to the 2-layer wager MLP.
- Target: hindsight-optimal wager $w^* = ((s_i - b_{-i})/2c_3)^+$.
- Aggregated target: weighted prediction of outcome Y.

## Validation

- Three scenarios isolating information vs. belief heterogeneity; in- and out-of-distribution evaluation (ARC-Challenge).
- Metrics: AUC, ACC, ECE + advantage-alignment metrics: Kendall's Tau (wager rank vs per-question Brier rank), MRR (is the best model top-weighted), Dynamic Regret (aggregated vs oracle-per-question best model).
- 5 independent runs, 95% CIs; both mechanism variants and both pooling rules tested.

## Code/data availability

**Code published:** https://github.com/chailab-rutgers/WALLA (linked in footnote on page 1). Public benchmark datasets (MMLU, MedMCQA, ARC-Challenge, PubMedQA); BayesX construction details in Appendix C.1.

## Leakage / caveats

1. Wager networks train on **realized payouts** — in sports, outcomes arrive weekly; the wager policy adapts at season cadence, so regime changes within a season are slow to register.
2. The IC/no-arbitrage machinery defends against **strategic** reporters; GSE's ensemble has no adversaries, so the incentive layer is overkill — but the advantage-alignment weight formula and calibration incentive transfer directly.
3. BayesX is synthetic; LLM QA results may not generalize to sports-forecast signal sources with very different correlation structure.
4. Boundedness proof for WALLA I uses bounded scoring rules; GSE uses Brier/log scores — fine.
5. Mechanism deficit $(\bar s - \underline s)^2 / 4c_3$ is a real-currency concept only if GSE pays model contributors; for internal ensembling it is irrelevant.

## GSE overlap

No existing wagering-mechanism or learned-per-question weighting scheme found in the existing-research map or prior 750 ledgers. Closest relatives: FFORMA (0788, meta-learned static weights), mAFTER (0786, online expert tracking), DTVW (0795, time-varying diversity weights). WALLA is the only one with **learned per-instance comparative-advantage weights plus a calibration incentive** — complementary, not duplicative.

## GSE implementation

**Problem it solves for GSE:** GSE's ensemble (engine variants, market-implied probs, power-rating composites, LLM-scraped news signals) currently lacks per-game, learned weights that know *which source has the edge on this specific game*. WALLA's recipe: train a small "wager network" per source on realized per-game **Brier-score advantage vs the leave-one-out pool baseline**, using game features (injury flags, line movement, weather, rest differential) as the hidden-state analogue. The equilibrium formula $w_i^* = (A_i / 2c_3)^+$ then yields weights that are (a) per-game, (b) zero for sources with no edge (automatic abstention), and (c) uncertainty-aware (under Brier, higher predictive variance → lower wager).

**Implementation spec (Python):**

1. Per completed game, compute each signal source's Brier score $s_i$ and the leave-one-out weighted baseline $b_{-i} = \sum_{j \ne i} w_j s_j / \sum_{j \ne i} w_j$ (WALLA I).
2. Hindsight target $w_i^* = ((s_i - b_{-i})/2c_3)^+$ with $c_3$ tuned so mean wager ≈ 1 (deficit lever is irrelevant internally).
3. Train one small MLP per source on pre-game features → $w_i^*$ (MSE loss). Refit weekly in the expanding window.
4. Aggregate game probabilities with linear pooling $\hat p = \sum_i w_i p_i / W$; fall back to equal weights when $\sum_i w_i \approx 0$.
5. Add a temperature-scaling head conditioned on the same features for each source's predicted probabilities — the paper's Sec. 4.6 result says the mechanism's payouts will reward it.
6. Track per-game MRR and Dynamic Regret (aggregated Brier vs best-single-source) as operational metrics.

**Reproducible test:** Two full seasons of GSE game probabilities: train wager MLPs on season 1 realized payouts, evaluate aggregated Brier/CRPS and D-Regret on season 2 vs equal-weight and vs the best single source; expect D-Regret near zero and calibration (ECE) improved on games with high injury/news flags.

**Numeric gate:** Season-2 backtest: advantage-aligned aggregation must beat equal-weight aggregation by **≥ 1.5% Brier score** and achieve **D-Regret ≤ 30% of the equal-weight gap to oracle** before production. DM test at 5%.

**Improvement experiment:** Replace the scalar advantage target with a **decision-weighted advantage** $A_i^{dec} = u \cdot (s_i - b_{-i})$ where $u$ is realized CLV or Kelly fraction for the game — the paper uses statistical scores only, but ledger 0791 showed statistical-score optimization can be financially suboptimal; test whether decision-weighted wagers beat score-weighted wagers on realized profit.

## Conclusion for GSE

WALLA is the most principled per-instance weighting scheme in the 750 ensemble lane: weights with a precise equilibrium meaning (expected score advantage), automatic self-exclusion of edgeless sources (abstention analogue), and a proven calibration incentive — all learnable from realized payouts with a tiny network. It matches centralized aggregation (StackedGen) across four heterogeneous QA scenarios and always identifies the informed forecaster (MRR=100 on BayesX). The strategic-mechanism machinery is excess weight for GSE's non-adversarial ensemble, but the advantage-aligned weight *learning rule* is a direct drop-in for GSE's per-game signal weighting.

**VERDICT: ADAPT** — implement per-source advantage-aligned wager networks for GSE's ensemble layer, gated on ≥1.5% Brier improvement and D-Regret ≤ 30% of equal-weight-to-oracle gap.
