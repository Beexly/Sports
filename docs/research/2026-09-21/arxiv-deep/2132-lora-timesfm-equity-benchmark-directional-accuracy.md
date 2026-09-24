# [2132] When Directional Accuracy Lies: A Base-Rate-Honest Benchmark for LoRA-Adapted TimesFM on Equity Forecasting (arXiv:2607.12248v2)

**Citation:** Taizhen Cheung (2026). *When Directional Accuracy Lies: A Base-Rate-Honest Benchmark for LoRA-Adapted TimesFM on Equity Forecasting*. arXiv:2607.12248v2. URL: https://arxiv.org/abs/2607.12248
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — the equity result itself is a negative result (no directional edge), but the *base-rate-honest evaluation protocol* is the most important methodology import in this lane: GSE's pick hit-rates must be scored against always-up/market base rates with paired tests, or every backtest is a lie.

## 1. Research question
Was an apparent ~80% directional accuracy from a LoRA-adapted TimesFM on equities genuine forecasting skill or a base-rate artifact — and can a frozen, walk-forward, base-rate-honest benchmark protocol distinguish the two?

## 2. Dataset / schema
- **Universes:** NASDAQ-100 (100 stocks + QQQ, 10 sectors, tech-heavy: 41 tech) and S&P 500 (501 stocks + 11 SPDR sector ETFs, 11 sectors, balanced); daily split/dividend-adjusted closes, **2005-01-01 to 2026-01-01**, frozen once into versioned checksum-verified artifacts.
- **Splits:** expanding walk-forward folds — Fold 0: train 2005–2019 / val 2019–2020 / test 2020–2022; Fold 1: 2005–2021/2021–2022/2022–2024; Fold 2: 2005–2023/2023–2024/2024–2026. Stratified held-out tickers ~80/20 per sector, fixed seed 42, fixed across folds (seen: 76/394; held-out: 24/107).
- **Normalization:** per-series log + z-score fit only on pre-target history (train for validation windows; train+val for test windows) — no target-window leakage.

## 3. Method / model
- **Base:** google/timesfm-2.5-200m-pytorch (patched decoder-only, RevIN, quantile head).
- **Adapters:** LoRA rank 32 / α 64 / dropout 0.05; context 512 / horizon 128; batch 512; AdamW (lr 1e-4, wd 0.01); cosine warm-restart schedule; best-validation checkpoint (never test) scored.
- **Variants:** zero-shot TimesFM; pooled LoRA (one adapter, all seen stocks); per-sector LoRA (one adapter per GICS sector + SPDR anchor, routed at eval).
- **Baselines:** always_up (predict up every window — the base rate), random-walk, persistence (last return sign), AR(1) direct h-period return.
- **Headline metric:** excess_acc = model accuracy − always_up accuracy, with block-bootstrap intervals; paired McNemar and Diebold–Mariano tests under Benjamini–Hochberg FDR control.
- **Reproducibility:** fully seeded (42 across Python/NumPy/torch/CUDA + DataLoader), run_meta.json manifests (seed, git commit, clean-tree flag, GPU, dependency freeze, hyperparameters, best epoch); two-run bit-identical gate; NVIDIA A100, torch 2.11.0+cu128, Python 3.12.

## 4. Equations & assumptions
- excess_acc = acc_model − acc_always_up on identical windows.
- DM test on loss differentials (squared error / directional loss) with BH correction across horizons/universes.
- Assumptions: always_up is the right null for directional skill in a drifting market; walk-forward folds approximate deployment; held-out tickers test symbol generalization; LoRA rank 32 suffices to express any real signal.

## 5. Features / target
Input: daily price history (log/z-normalized). Target: h-step directional call + point forecast; horizons include h=128 (~6 months). Point error via MASE; directional via excess accuracy; quantile coverage/pinball as secondary.

## 6. Validation design
Three-method (legacy pooled, walk-forward pooled, per-sector) × two-universe study; pre-registered confirmatory hypotheses (RQ1: base-rate artifact? RQ2: per-sector vs. pooled at h=128 held-out S&P 500, DM test); honest baselines; frozen data artifacts; paired significance with FDR control.

## 7. Numerical results / baselines
- **Base rate ~0.70** in the recreated 2014+ bull window; the fine-tuned model scored *below* it — the original ~80% was base-rate, not skill.
- **Pooled LoRA: no directional skill over the base rate at any horizon on either universe** (excess accuracy centered on zero; negative at the 6-month horizon).
- **Per-sector significantly worse than pooled** (Diebold–Mariano p<0.001 on held-out stocks at h=128) — specialization hurt.
- **Fine-tuning's only measurable benefit:** statistically significant point-error reduction vs. zero-shot TimesFM — which still didn't beat naive baselines and conferred no tradeable directional edge.

## 8. Code / data availability
Paper describes a fully reproducible setup (frozen artifacts, manifests, seeded runs); code release referenced in the paper (verify at implementation). Data: public price histories; sector catalog from the author's simofi source.

## 9. Leakage & limitations
- Single seed (42); multi-seed robustness explicitly left to future work — the negative result could be seed-fragile in either direction.
- NASDAQ-100 sector strata too thin for per-sector adapters (honestly disclosed; RQ2 S&P 500 only).
- Non-deterministic CUDA kernels (TimesFM ops raise under deterministic mode) — "bit-identical" is single-seed + same-GPU only.
- Equity directional forecasting ≠ sports outcome forecasting (market efficiency differs; sports have structural covariates); the *protocol* transfers, the negative *result* does not automatically.
- Point-error improvement without directional edge is a cautionary tale for GSE: better CRPS ≠ better pick P&L.

## 10. GSE overlap
No base-rate-honest evaluation protocol in the GSE corpus — this is the gap. GSE backtests report hit rates and yields; without always-pick-favorite / always-home / market-implied base rates and paired tests, apparent edges may be base-rate artifacts (e.g., "70% on totals" in a market where the base rate is 68%). The benchmark-audit dossier (2026-09-17) critiques data quality but not evaluation honesty. This paper's protocol should govern *every* ledger's acceptance gate in this lane.

## 11. GSE implementation spec
1. **GSE honesty harness:** for every sports-forecasting experiment, report excess accuracy vs. base-rate rules (always-favorite, always-home, always-under) + market-implied (closing line) baseline; paired McNemar/DM tests with BH-FDR across the experiment family; frozen versioned data artifacts with checksums; run_meta.json manifests.
2. **Walk-forward discipline:** expanding folds as in Table 2 (train ≤2019/val/test for the modern era); never early-stop on test; held-out *teams* (not just seasons) for generalization — the analog of held-out tickers (expansion teams, relocated franchises as natural held-outs).
3. **Pre-registration:** confirmatory vs. exploratory hypotheses declared before running (adoption gates in these ledgers become the pre-registered hypotheses).
4. **Apply to current engine:** re-score GSE v5.2.7's historical picks with excess-accuracy vs. base rates — find out which "edges" are base-rate artifacts before building on them.
Effort: 2–3 engineer-weeks for the harness; 1 week to re-score the engine.

## 12. Reproducible test
Dataset: GSE engine historical picks + NFL 2015–2024. Test: compute excess hit-rate vs. always-favorite and vs. closing-line-implied for spreads/totals/moneylines, walk-forward by season; McNemar paired test per season, BH across seasons. Metric: excess accuracy with block-bootstrap CIs. Success (for the harness, not the engine): the harness reproduces the paper's qualitative finding on a sanity dataset (e.g., always-up ≈ 0.70 base rate on 2014+ equities) — validating the implementation — then scores the engine honestly.

## 13. Acceptance / rejection gate
ADOPT the honesty harness as mandatory for all future GSE model evaluations if it successfully reproduces the paper's base-rate demonstration on the sanity dataset AND flags ≥1 currently-believed GSE edge as a base-rate artifact on re-scoring (proving it bites); keep it advisory if it reproduces but flags nothing; REJECT (redesign) if it cannot reproduce the ~0.70 base-rate sanity check — the implementation is wrong, not the idea. Any model whose only evidence is raw hit-rate without base-rate comparison is automatically REJECTED from live consideration.

## 14. Improvement experiment
Market-efficiency frontier: extend excess-accuracy to excess-CLV — score picks against closing-line value rather than win-rate, with the base rate being "bet every favorite at close" P&L. Test whether any GSE model with zero excess *accuracy* has positive excess *CLV* (the paper's point-error-without-direction analog: better prices without better picks). Hypothesis: CLV is the tradable metric and may survive where directional accuracy doesn't — this reframes the entire evaluation lane from "who wins" to "who beats the close."
