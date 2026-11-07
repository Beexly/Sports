---
annotations_creators:
- machine-generated
language:
- en
license:
- apache-2.0
multilinguality:
- monolingual
size_categories:
- 10K<n<100K
source_datasets:
- original
tags:
- probability-calibration
- conformal-prediction
- decision-intelligence
- multi-agent
- optimal-transport
task_categories:
- tabular-classification
task_ids:
- probability-calibration
---

# CalibBench-Adversarial-10K: High-Dimensional Epistemic Calibration Benchmark

**Published by:** Galaxy Science Institute (`galaxy-research`)  
**License:** Apache 2.0  
**Homepage:** `https://research.galaxysportsedge.com`  

## Dataset Summary
`CalibBench-Adversarial-10K` contains 10,000 standardized, multi-agent adversarial decision sequences designed to evaluate:
1. **Finite-Sample Conformal Coverage:** Testing whether asymmetric $(1 - lpha)$ conformal quantile intervals maintain nominal coverage under non-stationary covariate shift.
2. **Spectral Orthogonalization:** Benchmarking multi-factor variance inflation ($VIF$) before and after Cholesky whitening across 6 correlated physical signal families.
3. **Fréchet-Hoeffding Copula Invariants:** Evaluating joint probability conjunctions without artificial boundary clamping.

## Data Structure
- `benchmark_id`: Unique sequence identifier.
- `context_mask_word_active_bits`: Number of active bitfield families in the 288-bit context mask.
- `normalized_family_deltas`: Decoupled physical displacement values ($[-0.20, +0.20]$).
- `market_anchor_prob`: Efficient market anchor probability ($[0.30, 0.70]$).
- `conformal_75_half_width`: Slow rolling 250-observation 75% conformal predictive half-width.
- `frechet_lower_bound` / `frechet_upper_bound`: Exact Fréchet-Hoeffding copula limits.
- `realized_outcome`: Observed binary empirical outcome ($0$ or $1$).

## Citation
```bibtex
@dataset{galaxy2026calibbench,
  author = {Galaxy Science Institute},
  title = {CalibBench-Adversarial-10K: High-Dimensional Epistemic Calibration Benchmark},
  year = {2026},
  publisher = {Hugging Face},
  howpublished = {\url{https://huggingface.co/datasets/galaxy-research/CalibBench-Adversarial-10K}}
}
```
