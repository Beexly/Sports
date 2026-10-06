# 1173 Infinite forecast combinations based on Dirichlet process (arXiv:2311.12379)

**Citation:** Yinuo Ren, Feng Li, Yanfei Kang, Jue Wang (2023). *Infinite forecast combinations based on Dirichlet process*. arXiv:2311.12379v2 [cs.LG], ICDM AI4TS workshop paper. URL: https://arxiv.org/abs/2311.12379
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v2, via arxiv.org/pdf; main body through the conclusion, Section V).
**Verdict:** REJECT

**Why rejected:** the paper's Dirichlet-process machinery is decorative (α=1000 degenerates the DP to its base distribution); its own tables contradict the headline "mixed strategy" claims (E′ is near-identical to the plain average of the three homogeneous ensembles); there is no comparison against any real ensemble method — only the authors' own fixed-learning-rate single LSTM; and train/test are merged before normalization (leakage). The one usable idea (checkpoint diversity from varied learning rates in one training run) is standard snapshot-ensembling practice, already better covered by 1336's RAD protocol and 1169/1170. Per the standing rule, this REJECT does not count toward the 750 and is replaced by ledger 1336 (arXiv:2208.00139, full-paper read, ADAPT).

## 1. Research question
Can a Dirichlet process be used to generate an "infinite" ensemble of LSTM forecasters by sampling learning rates and combination weights from DP(α,H), and does a mixed-base-distribution ensemble beat single-distribution ensembles and a single model on the M4 weekly dataset?

## 2. Dataset / schema
M4 weekly time series. Training and test files are merged before being normalized to [0,1] and then split into training and testing sets — a documented leakage risk across the split. LSTM base model: two LSTM modules + a dropout layer + a dense output layer; lag 7; single-model baseline S uses a fixed learning rate of 0.001. No dataset size statistics given beyond M4 weekly membership.

## 3. Method / model
G ~ DP(α,H) with α=1000; base distributions H ∈ {EXP(0.001), N(0.001,0.01), Beta(1,1000)}. Stick-breaking samples β_i and weights π_i from the DP; learning rates l are drawn from H and ensemble weights w derived (implementation under-specified — the stick-breaking-to-weight mapping is not fully written out). Ensemble E = E(m,α,H,p) combines p checkpoints from one LSTM training run; weighted averaging uses w_i/Σw; simple averaging uses 1/p. Mixed ensemble E′ averages the three base-distribution ensembles.

## 4. Equations & assumptions
G ~ DP(α,H), α=1000; base densities EXP(0.001), N(0.001,0.01), Beta(1,1000); stick-breaking β_i ~ Beta, π_i = β_i Π_{k<i}(1−β_k) (standard form implied but not explicitly derived); ensemble size p ∈ {10,…,100}. Assumption: at α=1000 the DP is close to its base H — which is precisely why the DP adds nothing (sampling from EXP/N/Beta needs no DP). No theoretical result: the paper is purely empirical.

## 5. Features / target
Point forecasts on M4 weekly series, lag-7 features; error metrics MAE and RMSE averaged over the series set.

## 6. Validation design
Equal-weight vs weighted-average combinations across p ∈ {10,…,100} for each of the three base distributions, plus the mixed ensemble E′; single LSTM (lr=0.001) as the only baseline. No cross-validation described; no comparison to snapshot ensembles, bagging, or any other ensemble method; no ablation of α.

## 7. Numerical results / baselines
- Ensemble with p≤10 is WORSE than the single model; p=20–50 gives roughly 50% error reduction vs the single model; gains flatten after p≈60.
- Tables III/IV: simple-average MAE 0.331 (p=10) → 0.217 (p=100) vs single model 0.294; weighted-average MAE 0.137 → 0.067; simple-average RMSE 0.137 → 0.067 vs single model 0.137; weighted-average RMSE 0.083 → 0.063.
- Tables I/II (mixed strategy): E′ MAE/RMSE are near-identical to the plain average of the three homogeneous ensembles (e.g. at p=50: MAE 0.2368 vs 0.2369; RMSE 0.0765 vs 0.0770) — contradicting the paper's claim that the mixed strategy delivers "substantial improvements."
- Possible table error: Table III's "weighted average" MAE row is numerically identical to Table IV's "simple average" RMSE row.

## 8. Code / data availability
No code stated. M4 data is public; no training scripts or checkpoint protocol given.

## 9. Leakage & limitations
- Train and test merged before [0,1] normalization: information leaks across the split.
- Only baseline is the authors' own single LSTM with a fixed lr=0.001 — no competitive forecasting baseline, no other ensemble method.
- "Infinite" is truncated to p=10–100; the DP with α=1000 is decorative.
- Weight derivation and stick-breaking implementation under-specified; cannot be faithfully reimplemented from the text.
- Tables are internally inconsistent (mixed-strategy claim contradicted; possible MAE/RMSE cross-labeling).

## 10. GSE overlap
The usable fragment — diverse learning rates / checkpoint harvesting from one training run — is standard snapshot-ensembling; GSE's ensemble lane (1169, 1170, 1336) already covers pool diversity, weight learning, and trimming with far stronger evidence. Nothing here transfers that isn't already owned.

## 11. GSE implementation spec
None — no implementable spec. The only salvageable practice (vary learning rates / harvest checkpoints across a single training run for ensemble diversity, ~20–60 members) is noted as known practice, not adopted from this paper.

## 12. Reproducible test
None — the paper's evaluation protocol (train/test merge normalization, single fixed-lr baseline) is not worth reproducing, and its headline claims are not supported by its own tables.

## 13. Acceptance / rejection gate
REJECT confirmed: claims contradicted by the paper's own Tables I/II; decorative DP machinery; leakage in preprocessing; no competitive baseline. The checkpoint-diversity idea remains standard practice independent of this paper.

## 14. Improvement experiment
A salvageable experiment would be: a proper snapshot-ensemble benchmark on sports data — one LSTM/GBM training run with cyclic learning rates, harvesting 20–60 checkpoints, comparing cyclic-checkpoint ensembles vs multi-seed ensembles on log loss — but that experiment belongs to the ensemble-diversity lane (1336), not to this paper's DP framing.
