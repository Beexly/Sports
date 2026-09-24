# [2054] FactorMiner: A Self-Evolving Agent with Skills and Experience Memory for Financial Alpha Discovery (arXiv:2602.14670)

**Citation:** Yanlong Wang, Jian Xu, Hongkang Zhang et al. (2026). *FactorMiner: A Self-Evolving Agent with Skills and Experience Memory for Financial Alpha Discovery*. arXiv:2602.14670v2. URL: https://arxiv.org/abs/2602.14670
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~12,900 words).
**Verdict:** ADAPT

*Why:* the "Correlation Red Sea" framing (the zoo chokes on its own redundancy as it scales) plus the skill + experience-memory + Ralph Loop architecture is the most operationally practical self-evolving miner in this lane; it solves the exact failure mode GSE's growing signal library will hit.

## 1. Research question
Three blockers in automated factor discovery: (i) combinatorial search complexity; (ii) poor knowledge accumulation — GP/RL forget insights across sessions, repeating trials; (iii) interpretability/auditability requirements. As the factor library grows, finding novel signals gets harder ("Correlation Red Sea"). Can a lightweight self-evolving agent — modular skill architecture + structured experience memory, running a retrieve→generate→evaluate→distill "Ralph Loop" — accumulate knowledge across sessions and keep library redundancy low as it scales?

## 2. Dataset / schema
Multiple datasets across assets/markets: CSI500, CSI1000, HS300, crypto. Strict protocol: Top-40 factors selected once on CSI500 (2024), frozen, evaluated out-of-sample on 2025 across all datasets. Factor combination: frozen Top-40 with equal-weight (EW) and IC-weighted (ICW) (weights/signs from 2024). Factor selection: train 2024 / test 2025 via Lasso and XGBoost. Metrics use absolute-IC summary |E[IC_t]| and |E[IC_t]|/std(IC_t); avg |ρ| for redundancy. Each factor: explicit expression over market fields from a 60+ operator library. Baselines: random exploration (RF), Alpha101 (Classic + Adapted), GPLearn, AlphaForge, AlphaAgent.

## 3. Method / model
Two synergistic mechanisms:
1. **Modular Skill Architecture**: factor mining as a reusable, on-demand agent skill — curated 60+ financial operator library, multi-stage validation pipeline (IC screening → correlation checking → deduplication → full validation), standardized evaluation protocols. Upgradable without retraining the agent.
2. **Experience Memory**: distills historical mining trials into successful patterns (templates that consistently pass thresholds) and forbidden regions (factor families highly correlated with existing library). Maintains a *global library perspective*: mining direction chosen by how candidates complement the library, not individual quality.
**Ralph Loop**: retrieve (relevant patterns from memory) → generate (invoke skill with priors) → evaluate (parallel validation) → distill (outcomes back into memory). Positive feedback: each session improves future exploration.

## 4. Equations & assumptions
- Absolute-IC summary metrics; avg |ρ| redundancy measure.
- Assumptions: 60+ operator library is sufficiently expressive; distilled patterns transfer across sessions/markets; parallel validation is unbiased; correlation-to-library is the right novelty gate.

## 5. Features / target
Inputs: OHLCV-derived market fields. Target: forward returns (intraday prediction mentioned in keywords). Formulas must be explicit, auditable expressions.

## 6. Validation design
Table 1: strict frozen-Top-40 protocol, 2025 out-of-sample, four datasets, three evaluation modes (library quality, combination EW/ICW, selection Lasso/XGB). Baselines include the 2043-class (AlphaForge) and 2051-class (AlphaAgent) methods.

## 7. Numerical results / baselines
Table 1 (2025 out-of-sample; Factor Library Top-40, IC % / ICIR / avg |ρ|):
- **CSI500**: FactorMiner **8.25 / 0.77 / 0.31** vs. AlphaAgent 5.90/0.46/0.32, GPLearn 6.04/0.43/**0.44**, Alpha101-Adapted 5.06/0.43/0.21, AlphaForge 4.48/0.38/0.36.
- **CSI1000**: FactorMiner **7.78 / 0.76 / 0.30** (best IC/ICIR).
- **HS300**: FactorMiner **7.46 / 0.38 / 0.31** (best).
- **Crypto**: FactorMiner **3.82 / 0.28 / 0.25** (best; cross-asset generalization).
- Combination (EW IC/ICIR, CSI500): FactorMiner 14.95/1.29 vs. next Alpha101-Adapted 11.53/0.86.
- Redundancy: FactorMiner avg |ρ| ≈ 0.30–0.31 — near the low-redundancy RF floor (0.07–0.13 is random noise, not useful) while GPLearn hits 0.44–0.45 (the Red Sea).

## 8. Code / data availability
None stated (no repo URL found in text).

## 9. Leakage & limitations
- Top-40 selected on CSI500-2024 then tested on 2025 *including CSI500* — same-market selection/evaluation overlap; cross-dataset results (CSI1000/HS300/crypto) are the cleaner read.
- IC values are absolute-value summaries (|E[IC]|) — sign instability hidden; a factor flipping sign year to year still scores.
- 60+ operator library is hand-curated — the "self-evolving" claim sits atop a fixed human prior.
- No portfolio backtest with costs (library/combination metrics only).
- Crypto dataset details thin.

## 10. GSE overlap
New operational architecture; the skill/memory/Ralph-Loop framing is unique in this lane and directly implementable. Complements 2048 (MinervaScore as the skill's validation stage), 2053 (AlphaPROBE's DAG as the memory's structural index). No overlap in the research map.

## 11. GSE implementation spec
1. Package GSE's mining pipeline as an invocable **skill**: operator library (sports primitives: EPA, success rate, rest, travel, line moves, weather), multi-stage validation (RankIC screen → correlation vs. zoo → dedup → full walk-forward + MinervaScore Seal).
2. **Experience memory** (persistent, versioned): successful templates + forbidden regions (families with |ρ| > 0.7 vs. zoo). Ralph Loop per mining session: retrieve priors → generate → parallel-validate → distill.
3. Global-library perspective: the generate step receives the zoo's correlation matrix and is tasked to fill *gaps* (low-coverage regions), not just maximize individual RankIC.
4. Effort: ~2 weeks; mostly reorganization of existing code into the skill + a memory store.

## 12. Reproducible test
nflverse 2009–2025. Run Ralph-Loop mining vs. session-independent mining (same total budget) on 2009–2019; test 2020–2025. Metrics: accepted-signal count, avg |ρ| vs. zoo, test RankIC, redundancy growth curve as library scales (the Red Sea test).

## 13. Acceptance / rejection gate
ADAPT→build if Ralph-Loop mining keeps avg |ρ| ≤ 0.35 as the zoo grows past 100 signals while session-independent mining's |ρ| rises above 0.5, with test RankIC at parity or better. REJECT if the memory provides no scaling benefit — i.e., redundancy grows identically with and without it.

## 14. Improvement experiment
Beyond the paper: **signed-IC memory** — the paper's absolute-IC summary hides sign flips; store per-season signed IC trajectories in memory and forbid regions whose signs flip across regimes (a "sign-stability" constraint stricter than correlation). Second: **skill versioning with rollback** — when the operator library is upgraded (new sports primitives), re-run a regression suite of memory templates; if the upgrade degrades retrieval quality, auto-rollback. The paper treats the skill as static; a self-evolving agent needs versioned, tested skills.
