# [1133] Pricing Football Players with Neural Networks (FIFA 2017) (arXiv:1711.05865)

**Citation:** Dey, S., et al. (2017). *Pricing Football Players*. arXiv:1711.05865v2. URL: https://arxiv.org/abs/1711.05865
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the quantization-into-119-price-classes + top-k accuracy framing is a clean, reusable recipe for player-valuation classification (e.g., DFS salary tiers, dynasty value bands); the specific 2017 FIFA-data network is not worth copying, and FIFA's subjective prices cap what the 6.32% error means.

## 1. Research question
Can a feedforward neural network predict a footballer's market price from FIFA 2017 video-game attributes, framed as classification over quantized price bands?

## 2. Dataset / schema
- FIFA 2017 player database: 17,240 players total, 41 features (pace, shooting, passing, etc. attributes + age, position, etc.); goalkeepers excluded.
- Split: 10,914 train / 1,926 validation / 2,500 test (random split).
- Target: price quantized into 119 classes. Prices are FIFA's internal (subjective, game-design) valuations, not market transactions.
- Code/data: https://github.com/souryadey/footballerprice.git (stated).

## 3. Method / model
Feedforward network [41, 2000, 1500, 500, 119]: ReLU hidden layers, softmax output over 119 price classes. Training: learning rate 0.01, decay 0.001, momentum 0.99, L2 0.0005, batch size 20, early stopping with patience 10. No credible baseline comparisons reported (no linear model, no GBM — see §9).

## 4. Equations & assumptions
No equations stated (standard MLP/softmax cross-entropy implied, not written). Assumptions: FIFA's internal prices are a meaningful valuation signal; the 41 attributes suffice; random split is representative (no temporal structure in FIFA data, so this is defensible).

## 5. Features / target
Inputs: 41 FIFA attributes per player (exact 41 listed in the repo/paper's feature table). Target: quantized price class (1 of 119).

## 6. Validation design
Single random split (10,914/1,926/2,500). Metric: top-5 accuracy and average percentage price error. No cross-validation, no temporal split (acceptable for static game data), no baselines.

## 7. Numerical results / baselines
- Top-5 accuracy: 87.2%.
- Average percentage price error: 6.32%.
- No baseline numbers reported — the paper does not show that the 2000-1500-500 network beats anything simpler.

## 8. Code / data availability
Code: https://github.com/souryadey/footballerprice.git (stated). Data: FIFA 2017 attributes (scraped/public at the time).

## 9. Leakage & limitations
- No baselines: a 3-layer MLP with 2000+1500+500 units on 10,914 training rows is heavily overparameterized; a regularized linear model or GBM might match the 6.32% error — untested.
- FIFA prices are game-design artifacts (popularity, licensing, balance), not market values — the 6.32% error measures imitation of EA's pricing team, not valuation skill.
- Goalkeepers excluded; 119 classes are FIFA-price-specific and don't transfer.
- Random split on static data is fine, but there's no test of generalization to new seasons/games.

## 10. GSE overlap
Extension. The existing-research map's 2212.11041-family work (market-value prediction, covered in ledger 1136 of this same wave) and the DFS salary work (2026-09-19-dk-week2 optimizer pool JSON) cover valuation, but nothing covers price-band *classification* as an alternative to regression. GSE's DFS work optimizes on point projections; predicting which salary/value tier a player belongs in is a distinct, coarser, potentially more robust formulation.

## 11. GSE implementation spec
- Build a value-tier classifier for NFL DFS: quantize DraftKings salaries (or projected fantasy points) into ~20 tiers; train gradient boosting (not the paper's MLP — see §9) on nflverse + matchup features; evaluate top-3 tier accuracy and tier-error cost.
- Use case: fast slate screening (which tier does a player belong in?) as a pre-filter before the optimizer, and mispricing flags (model tier ≫ salary tier = value).
- Effort: 2–3 days reusing the Week 2 DK feature set.

## 12. Reproducible test
Dataset: 2025 DraftKings main slates (salaries + nflverse features). Metric: top-3 tier accuracy and mean absolute tier error vs a median-tier baseline and vs a regression-then-quantize baseline. Gate: the classifier must beat regression-then-quantize on tier error by ≥10% relative on a 4-week holdout; otherwise keep the regression formulation.

## 13. Acceptance / rejection gate
ADAPT the tier-classification framing if: it beats regression-then-quantize on the holdout gate above. REJECT the paper's specific architecture and its 6.32% error as a target — those are FIFA-2017 artifacts.

## 14. Improvement experiment
Ordinal tier loss: replace flat softmax cross-entropy with an ordinal (cumulative-link) loss that penalizes far-tier misses more than near-tier misses. Hypothesis: ordinal loss cuts mean absolute tier error vs the paper's flat classification, since price tiers are ordered — a near-miss should cost less than a whiff.
