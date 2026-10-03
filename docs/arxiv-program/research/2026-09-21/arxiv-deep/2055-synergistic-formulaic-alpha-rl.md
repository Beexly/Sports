# [2055] Synergistic Formulaic Alpha Generation for Quantitative Trading based on Reinforcement Learning (arXiv:2401.02710)

**Citation:** Hong-Gi Shin, Sukhyun Jeong, Eui-Yeon Kim, Sungho Hong, Young-Jin Cho, Yong-Hoon Choi (2024). *Synergistic Formulaic Alpha Generation for Quantitative Trading based on Reinforcement Learning*. arXiv:2401.02710v2. URL: https://arxiv.org/abs/2401.02710
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~4,500 words).
**Verdict:** ADAPT

*Why:* the "synergistic" objective (alphas optimized to work *in combination*, not individually) plus self-bootstrapping (seeding RL with its own generated alpha set beats seeding with Alpha101) is the portfolio-aware mining objective GSE's ensemble assembly needs.

## 1. Research question
RL is commonly used to mine formulaic alphas in a vast search space, but existing methods optimize individual alphas and start from scratch. Can (a) expanding the operator/operand search space and (b) seeding the alpha pool with a pretrained formulaic alpha set (Alpha101's top-5 by test IC, or the model's own generated set) produce *synergistic* alphas — factors that perform well in combination — with better IC/RankIC and real portfolio performance?

## 2. Dataset / schema
Chinese A-shares, six features: Open, Close, High, Low, Volume, VWAP. Target: 20-day forward price-change %. Train 2009-01–2018-12, validation 2019, test 2020-01–2021-12. Survivorship-bias control: listing date as index-inclusion date; long-only. Qlib backtest: Top-50, swap 5, min hold 20 days, enter threshold 0.0, 2020-01–2021-12. Combination pool size 20; five PPO seeds (0–4). Seed alphas: top-5 Alpha101 formulas by CSI300 test IC (Table IV: #-, 099, 061, 014, 035; ICs 0.024–0.035), excluding indneutralize/market-cap alphas; seeds may be *removed* by the combination model during training.

## 3. Method / model
PPO-based RL alpha generator (building on baseline [8]) with two enhancements:
1. **Expanded search space**: more operators and operands than baseline.
2. **Alpha-set initialization**: pool of 20 initialized either empty (Non-Init), with 5 top Alpha101 alphas, or with the model's own previously generated alpha set (self-bootstrapping). The combination model can drop seeds — initialization is a prior, not a constraint.
"Synergistic" = the reward is combination-level performance (pool of 20), so generated alphas complement rather than duplicate.

## 4. Equations & assumptions
- Metrics: Pearson IC and Spearman RankIC vs. 20-day forward returns.
- Assumptions: combination-level reward induces complementarity; expanded space's extra operators are financially meaningful; 20-day horizon suits the factors; Qlib backtest realism.

## 5. Features / target
Inputs: O/H/L/C/Volume/VWAP. Target: 20-day forward return %.

## 6. Validation design
Table III: main results vs. baseline [8] on CSI300 (5 seeds, mean ± std). Case study 1: pool sizes 1/10/20/50/100 × original vs. expanded space (Fig. 1). Case study 2: Alpha101 seeding vs. Non-Init in both spaces (Fig. 2). Case study 3 (Fig. 3): seeding with own generated set. Qlib backtest with Table V parameters.

## 7. Numerical results / baselines
- Table III (CSI300, IC / RankIC, mean over 5 seeds): baseline [8] 0.045/0.058 → expanded space **0.069/0.073** → + Alpha101 init **0.071/0.071** → + self-generated init **0.085/0.087** (std 0.003). Near-doubling of IC; IC–RankIC gap collapses to within std (baseline had a large gap).
- Seed variance minimal across all models (robust to PPO seeds).
- Pool-size study: expanded space beats original at every size; gains plateau at pool size 20 — no benefit to 50/100 (compute can stop at 20).
- Self-generated seeds beat Alpha101 seeds: the model bootstraps better priors than the human-curated set.

## 8. Code / data availability
None stated (no repo URL in text).

## 9. Leakage & limitations
- Short paper (~4,500 words); backtest P&L numbers not tabulated in the extracted text (only Table V parameters shown).
- 20-day horizon + Top-50/swap-5/20-day-hold is a slow-turnover setup; costs not stated.
- Baseline [8] is a single prior RL method — narrow comparison.
- Test window 2020–2021 only (2 years, includes COVID crash/rebound — regime-specific).
- "Synergy" is asserted via combination reward but no explicit complementarity metric (e.g., correlation) is reported.

## 10. GSE overlap
New objective framing; complements 2044 (QuantFactor REINFORCE) and 2046 (AutoAlpha hierarchical GP) — neither optimizes explicitly for combination synergy, and neither tests self-bootstrapping. No overlap in the research map.

## 11. GSE implementation spec
1. Change the mining reward from individual-signal RankIC to *marginal contribution*: candidate signal's Shapley-style value added to the current ensemble's walk-forward Brier score.
2. Self-bootstrapping: seed each mining run's pool with GSE's own previously accepted signals (not just hand-built ones); allow the combination step to drop seeds.
3. Cap the combination pool at ~20 (paper's plateau) — don't waste compute on 50+.
4. Operator expansion: add sports-native operators (rest-day differentials, line-move z-scores, weather interactions) to the primitive set and A/B test expanded vs. original space.
5. Effort: ~1–2 weeks; reward-function change + seeding protocol.

## 12. Reproducible test
nflverse 2009–2025. RL/GP mining with individual-RankIC reward vs. marginal-ensemble-contribution reward vs. self-seeded variants; validate 2020–2021; test 2022–2025. Metrics: ensemble test Brier, pool-size saturation curve, seed-retention rate.

## 13. Acceptance / rejection gate
ADAPT→build if synergy-rewarded mining beats individual-rewarded mining on test ensemble Brier by ≥ 0.002 at pool size ≤ 20 AND self-seeding matches or beats hand-seeding. REJECT if marginal-contribution rewards produce no ensemble gain over greedy individual selection — then "synergy" is just a relabeled greedy forward selection.

## 14. Improvement experiment
Beyond the paper: **explicit synergy accounting** — the paper never measures complementarity directly. Add a per-candidate "orthogonality bonus" = 1 − max |ρ| vs. pool, and decompose final ensemble gains into (individual quality) + (orthogonality) via ablation. If orthogonality explains most of the gain, replace the expensive RL combination reward with a cheap two-term fitness (quality + orthogonality) — same synergy at a fraction of the compute. Second: **cross-horizon synergy** — mine pools at multiple horizons (1-day, 20-day analogues: next-game vs. rest-of-season) and test whether cross-horizon pools diversify better than single-horizon ones.
