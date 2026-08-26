# Forecasting Platform Aggregation & Calibration — Deep Research Report

## Source Catalog (per-source URLs)

### Metaculus
- https://metaculus-metaculus.mintlify.app/features/forecasting — docs: geometric mean used instead of arithmetic mean; supports recency-weighted methods.
- https://forum.effectivealtruism.org/posts/sMjcjnnpoAQCcedL2/when-pooling-forecasts-use-the-geometric-mean-of-odds — geometric mean of odds formula, extremization parameter range (1.161 – 3.921), Brier-optimized.
- https://forum.effectivealtruism.org/posts/acREnv2Z5h4Fr5NWz/my-current-best-guess-on-how-to-aggregate-forecasts — aggregation default recommendation.
- https://metaculus.medium.com/a-primer-on-the-metaculus-scoring-rule-eb9a974cd204 — relative log score (A + R weighted by N predictions).
- https://arxiv.org/html/2601.22444v2 — automation of forecasting (not core aggregation but relevant).
- https://www.metaculus.com/notebooks/15760/wisdom-of-the-crowd-vs-the-best-of-the-best-of-the-best/ — recency-weighted median used for Community Prediction; extremization pushes predictions toward 0/1.
- Paper: Baron et al. (2014) “Two Reasons to Make Aggregated Probability Forecasts More Extreme” (referenced via ResearchGate in search results) — extremization improves calibration.

### Manifold Markets
- https://arxiv.org/html/2510.12952v1 — “Efficiency of Constant Log Utility Market Makers” — LMSR cost function C(q) = b·log(∑ exp(q_i/b)), liquidity-sensitive parameter α, worst-case loss bounded.
- https://news.manifold.markets/p/above-the-fold-market-mechanics — Hanson LMSR explanation, play-money mechanics.
- https://blog.gensyn.ai/lmsr-logarithmic-market-scoring-rule/ — LMSR fundamentals, cost function, price derivation p = exp(q/b)/∑exp(q_j/b).
- https://www.cultivatelabs.com/crowdsourced-forecasting-guide/how-does-logarithmic-market-scoring-rule-lmsr-work — practical LMSR explanation.
- Manifold uses play-money (mana) and LMSR AMM for binary markets.

### Polymarket
- https://docs.polymarket.com/concepts/prices-orderbook — prices are probabilities; midpoint = implied probability; CLOB off-chain match / on-chain settlement.
- https://changelly.com/blog/what-is-polymarket-and-how-does-it-work/ — peer-to-peer, no bookmaker, price = collective estimate.
- https://defirate.com/prediction-markets/how-order-books-work/ — bid/ask spread, depth, market liquidity.
- No published internal calibration algorithm (no docs on aggregation other than order-book price formation).

### Numerai
- https://docs.numer.ai/ — core docs: staking, meta model, feature neutralization.
- https://docs.numer.ai/numerai-tournament/staking — stake-weighted meta model; payout formula: payout = stake * clip(payout_factor * score, -0.05, 0.05).
- https://docs.numer.ai/numerai-tournament/scoring/definitions#meta-models — FNCv4, feature neutral correlation formula s' = s - N·(N_inv·s); MMC calculation via orthogonalization.
- https://docs.numer.ai/numerai-tournament/scoring/definitions — neutralization projection, factor exposure (SRCC).
- https://docs.numer.ai/numerai-signals/scoring/definitions#factors-features — feature exposure via Spearman rank correlation.
- Medium article (analytics-vidhya) — era boosting: boosting weights of lower-performing eras to reduce variance, improve Sharpe; feature neutralization lowers cross-era std dev.
- https://forum.numer.ai/t/the-un-meta-model/4412 — discussion of stake-weighted meta model limitations.

### Cultivate Labs / Hypermind / Good Judgment Open (Tetlock-style)
- https://goodjudgment.com/what-forecastbench-doesnt-measure/ — teaming, structured aggregation, red teams, Brier-based evaluation.
- https://www.gjopen.com/faq — Brier score definition (0 best, 2 worst); Good Judgment Open platform.
- https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/ — superforecaster identification (top 1-2%), teaming improves aggregation.
- https://goodjudgment.io/superforecasts/ — superforecasting product.
- https://www.cultivatelabs.com/forecasts — enterprise forecasting, leaderboards, skill tracking.
- https://www.cultivatelabs.com/posts/the-unintended-consequences-of-running-internal-forecasting-tournaments — tournament dynamics, culling top performers.
- Stanford paper (web.stanford.edu/~knutson/jdm/mellers15.pdf) — superforecasters have significantly lower Brier scores; teaming + debiasing improves accuracy; Brier-based leaderboards are standard.

---

## Per-Platform Methodology & Algorithmic Details

### 1. Metaculus — Aggregation Algorithm
- **Aggregation**: Recency-weighted median (Community Prediction) + proprietary Metaculus Prediction (performance-weighted + extremized). Geometric mean of odds used for peer score.
- **Formula (geometric mean of odds)**: For binary forecasts p_1 … p_n: compute odds o_i = p_i/(1-p_i); geometric mean O = (∏ o_i)^{1/n}; pooled probability p = O/(O+1). Extremized version: p_extreme = p^{γ} / (p^{γ} + (1-p)^{γ}) with γ ≈ 1.5 – 3.9 (optimal per dataset).
- **Recency weighting**: Recent forecasts weighted more heavily (exponential decay style, though exact decay parameter not public); recency-weighted median used for community prediction.
- **Extremization parameter**: γ (gamma) typically ~1.5; pushes forecasts away from 0.5. Documented in forum posts and Baron et al. (2014) paper.
- **Scoring**: Relative Log Score (RLS) = A (absolute log score) + R (relative component weighted by number of predictions N). Incentivizes both accuracy and contribution to community wisdom.

### 2. Manifold Markets — LMSR / Play-Money Mechanics
- **Market maker**: Logarithmic Market Scoring Rule (LMSR) by Hanson.
- **Cost function**: C(q) = b · log(∑_{i=1}^{n} exp(q_i / b)), where q = quantity vector, b = liquidity parameter (manifold uses b that adjusts with liquidity).
- **Price derivation**: p_i = exp(q_i/b) / ∑ exp(q_j/b). For binary: p = e^{q_1/b} / (e^{q_1/b} + e^{q_2/b}).
- **Liquidity-sensitive variant**: α parameter (0 < α < 1) adjusts b(q) = v / (n log n) · (something with α) so worst-case loss ≤ v. Documented in arXiv 2510.12952v1.
- **Play-money**: Users bet with mana; no real loss, but leaderboards and reputation provide incentives. No staking mechanism (everyone has equal weight).
- **No calibration layer**: Prices come purely from market equilibrium; no explicit calibration correction applied after formation.

### 3. Polymarket — Order Book / CLOB
- **Price formation**: Central Limit Order Book (CLOB) off-chain matching, on-chain settlement via smart contracts. Binary contracts trade between $0.01 and $1.00.
- **Implied probability**: Midpoint of best bid and ask: p_implied = (bid + ask) / 2. Price = % chance market assigns.
- **Aggregation**: Peer-to-peer; no central aggregator. Price emerges from supply/demand equilibrium.
- **No calibration / extremization**: Raw market price; no post-processing correction. Liquidity reflects trader capital commitment (real USDC), which acts as an implicit stake-weighted mechanism (higher capital = larger influence).
- **No feature neutralization / meta-model**: No ensemble or meta-model; market price is the single forecast.

### 4. Numerai — Staking, Feature Neutralization, Meta Model
- **Staking**: Users stake NMR tokens on predictions. Positive scores earn payout; negative scores burn stake (destroyed). Only staked predictions enter Meta Model.
- **Payout formula**: payout = stake × clip(payout_factor × score, -0.05, 0.05). Where score = corr20 × corr_mult + mmc20 × mmc_mult.
- **Feature neutralization**: Per era, fit linear regression from predictions to visible features; subtract fitted component. s' = s - (N·(N_inv·s)). Keeps signal orthogonal to common factors.
- **Meta Model**: Stake-weighted average of all staked predictions. Only predictions with positive contribution influence fund trades.
- **Meta Model Contribution (MMC)**: Measures orthogonalized correlation to meta model. Procedure: rank predictions and meta model → gaussianize → orthogonalize predictions wrt meta model → multiply by centered target → mean = MMC. This rewards unique signal, not correlation to consensus.
- **Era boosting**: Weight lower-performing eras higher (inverse weight by performance) to reduce variance across time periods, improve Sharpe (mean/std of per-era correlations).
- **Feature exposure**: Measured via Spearman rank correlation coefficient (SRCC) between predictions and each feature column. High exposure = overfit to current regime; low = weak signal.

### 5. Cultivate Labs / Hypermind / Good Judgment Open (Superforecasting)
- **Team structure**: Elite superforecasters (top 1-2% from tournaments) assigned to teams with structured collaboration, red-team review, and cognitive debiasing training.
- **Aggregation**: Structured consensus (not simple mean); team leads synthesize forecasts with reasoning. Cultivate Labs uses “structured aggregation” (not fully algorithmic) with leaderboards and performance analytics.
- **Skill tracking**: Brier-based leaderboards; personal performance analytics over time; drift monitoring (forecast accuracy trends).
- **Scoring**: Brier score primary metric (lower = better). GJP also uses log score and calibration curves.
- **Teaming effects**: Research (Mellers et al., 2015) shows teaming + debiasing improves Brier scores significantly vs individual forecasting; superforecasters attempt ~40% more questions, provide 10× more team interaction.
- **No algorithmic extremization / meta-model**: Human-led aggregation with leaderboards guiding team composition.

---

## Existing Repo Capabilities (from project context & package inspection)
Repo (`packages/prediction-engine/src`):
- `bernoulli-eprocess.ts` — sequential hypothesis testing for binary outcomes.
- `conformal/` — conformal prediction intervals (`conformal-intervals.ts`, `conformal-margin-set.ts`).
- `dixon-coles.ts` — Dixon-Coles model (Poisson-based for sports scores).
- `elo-estimator.ts`, `elo-backtest.ts`, `elo-from-results.ts` — Elo ensemble for team strength.
- `brier-ogd-ensemble.ts` — online gradient descent ensemble optimized on Brier loss.
- `devig/` — devig (expected value / margin) utilities (`shin-devig.ts`, etc.).
- `kelly.ts`, `bankroll.ts`, `robust-kelly.ts` — Kelly criterion bankroll management.
- `calibration/` — `calibration-map.ts`, `calibration-drift.ts`, `calibration-monitor.ts`, `calibration-apply.ts` — calibration mapping, drift detection, monitoring.
- `hawkes-steam.ts` — Hawkes process for steam (market movement) modeling.
- `clv-decomposition.ts`, `clv-capture.ts` — closing line value decomposition.
- `calibration-commitment.ts`, `calibration-sequence.ts` — calibration sequences and commitments.
- `temperature-scaling.ts`, `online-beta-recalibration.ts`, `online-beta-sliding-window.ts` — recalibration methods.
- `ensemble/` — ensemble logic.
- `market-anchored-reconciliation.ts` — market-anchored reconciliation (possibly some LMSR-related logic).

---

## Gaps — What Platforms Do That Repo Lacks

| Platform Technique | What Repo Has | What’s Missing / Gap |
|---|---|---|
| **Metaculus geometric mean of odds + extremization** | Elo ensemble, Brier OGD ensemble | No geometric-mean aggregation; no extremization parameter γ; no recency-weighted median aggregation; no relative log score (RLS) scoring incentive. |
| **Metaculus recency weighting** | Calibration drift/monitor | No explicit recency-weighted aggregation of forecasts; calibration uses sliding windows but not recency-weighted median. |
| **Manifold LMSR / AMM mechanics** | `market-anchored-reconciliation.ts` (partial) | No LMSR cost function implementation; no liquidity-sensitive parameter α; no play-money/staking simulation; no worst-case loss guarantee calculation. |
| **Polymarket CLOB implied probability** | CLV decomposition, Hawkes steam | No direct order-book implied probability extraction; no bid/ask midpoint as forecast input; CLV is post-hoc, not live order-book integration. |
| **Polymarket real-capital stake weighting** | Kelly bankroll | Kelly manages bankroll size but is not used as a stake-weighted ensemble mechanism; no “stake-weighted meta model” combining multiple forecasters. |
| **Numerai staking + burn mechanism** | `bankroll.ts`, `robust-kelly.ts` | No staking mechanism (users/models don’t stake on predictions); no burn mechanism; no stake-weighted meta model formation. |
| **Numerai feature neutralization** | `calibration-map.ts`, `calibration-drift.ts` | No feature-neutral projection against visible factors (e.g., venue, weather, line movement); no SRCC-based feature exposure tracking. |
| **Numerai meta-model contribution (MMC)** | `brier-ogd-ensemble.ts` | No orthogonalized contribution metric; ensemble weights are Brier-optimized, not contribution-to-consensus optimized; no “unique signal” reward. |
| **Numerai era boosting** | `calibration-monitor.ts` | No era-level performance variance reduction; no boosting of low-performing eras; no Sharpe-based cross-era consistency metric. |
| **Numerai feature exposure (SRCC)** | `calibration-drift.ts` | No Spearman rank exposure tracking per feature column; no exposure-based suppression of predictions. |
| **Good Judgment teaming / red team** | `consensus-view.ts` (partial) | No structured team aggregation protocol; no red-team challenge step; no superforecaster selection / culling mechanism; no cognitive debiasing framework. |
| **Good Judgment Brier leaderboards + skill tracking** | `performance-analytics.ts` (partial) | No Brier-based leaderboards across forecasters; no personal performance analytics; no drift tracking by forecaster skill. |

---

## Mapping: Adoptable Techniques Ranked by Cost vs Value

### Top 8 Adoptable Techniques (Ranked)

1. **Metaculus extremization parameter γ (LOW cost, HIGH value)** — Add γ-extremization to existing geometric-mean or log-odds aggregation. Only requires adding a parameter and applying p → p^γ / (p^γ + (1-p)^γ) in `ensemble/` or `brier-ogd-ensemble.ts`. Already have Brier optimization, so γ can be tuned via grid search on historical predictions.

2. **Metaculus recency-weighted median (LOW cost, HIGH value)** — Modify aggregation in `ensemble/` to apply exponential decay weights to forecasts before computing median/geometric mean. Fits existing calibration-drift framework; improves responsiveness to recent model versions.

3. **Numerai feature neutralization projection (MEDIUM cost, HIGH value)** — Add neutralization step in `calibration-apply.ts` or `calibration-map.ts`: fit linear regression from predictions to visible feature set (e.g., line movement, weather, venue), subtract fitted component. Already have feature-store (`packages/feature-store`); projection matrix easy to compute.

4. **Numerai feature exposure tracking via SRCC (LOW cost, MEDIUM-HIGH value)** — Compute Spearman rank correlation between predictions and each feature column; add to `calibration-monitor.ts` as exposure metric. Warn when exposure exceeds threshold. Directly extends calibration-monitor capabilities.

5. **Manifold LMSR cost function integration (MEDIUM cost, MEDIUM value)** — Implement LMSR C(q) = b·log(∑ exp(q_i/b)) in `market-anchored-reconciliation.ts` or new file; add liquidity-sensitive α parameter. Useful for simulating play-money market dynamics and computing worst-case loss bounds.

6. **Numerai meta-model contribution (MMC) metric (MEDIUM cost, MEDIUM-HIGH value)** — Implement orthogonalized contribution metric in `ensemble/`: rank predictions, gaussianize, orthogonalize against meta model (stake-weighted average), compute correlation to target. Adds a “unique signal” score that complements Brier-based weights.

7. **Polymarket CLOB implied-probability ingestion (MEDIUM cost, MEDIUM value)** — Extend `clv-capture.ts` or `market-read.ts` to read bid/ask midpoints from live order-books (e.g., via Polymarket API) and treat as additional forecast input. Adds real-capital-weighted forecast source.

8. **Good Judgment teaming / red-team structure (HIGH cost, MEDIUM-HIGH value)** — Design structured team aggregation protocol (not fully algorithmic) using `consensus-view.ts` as base; add red-team challenge step before final forecast publication. Highest implementation cost due to organizational/process change, but documented to improve Brier scores significantly (Mellers et al. 2015).

---

## Key Formulas Extracted (for Implementation Reference)

**Geometric mean of odds (Metaculus)**:
- o_i = p_i / (1 - p_i)
- O = (∏ o_i)^{1/n}
- p_agg = O / (O + 1)
- Extremized: p_agg_ext = p_agg^γ / (p_agg^γ + (1 - p_agg)^γ), γ ≈ 1.5 – 3.9

**LMSR cost function (Manifold)**:
- C(q) = b · log(∑ exp(q_i / b))
- p_i = exp(q_i / b) / ∑ exp(q_j / b)
- Liquidity-sensitive: b(q) adjusts with α, worst-case loss ≤ v

**Feature neutralization (Numerai)**:
- s' = s - (N · (N^{-1} · s))
- Where N is feature matrix; s' is orthogonal projection.

**Meta Model Contribution (Numerai)**:
- Rank → Gaussianize predictions p and meta model m.
- neutral_preds = orthogonalize(p, m)
- MMC = (target_centered · neutral_preds) / len(target_centered)

**Staking payout (Numerai)**:
- payout = stake × clip(payout_factor × score, -0.05, +0.05)
- score = corr20 × mult + mmc20 × mult

**Era boosting (Numerai)**:
- Weight lower-performance eras inversely by performance variance; reduce std dev of per-era correlations; improves Sharpe.

---

## References & URLs (Full List)
- Metaculus docs: https://metaculus-metaculus.mintlify.app/features/forecasting
- Metaculus geometric mean forum: https://forum.effectivealtruism.org/posts/sMjcjnnpoAQCcedL2/when-pooling-forecasts-use-the-geometric-mean-of-odds
- Metaculus aggregation best-guess: https://forum.effectivealtruism.org/posts/acREnv2Z5h4Fr5NWz/my-current-best-guess-on-how-to-aggregate-forecasts
- Metaculus scoring primer: https://metaculus.medium.com/a-primer-on-the-metaculus-scoring-rule-eb9a974cd204
- Manifold LMSR arXiv: https://arxiv.org/html/2510.12952v1
- Manifold market mechanics: https://news.manifold.markets/p/above-the-fold-market-mechanics
- Gensyn LMSR fundamentals: https://blog.gensyn.ai/lmsr-logarithmic-market-scoring-rule/
- Cultivate Labs LMSR guide: https://www.cultivatelabs.com/crowdsourced-forecasting-guide/how-does-logarithmic-market-scoring-rule-lmsr-work
- Polymarket docs (prices/orderbook): https://docs.polymarket.com/concepts/prices-orderbook
- Polymarket explanation (Changelly): https://changelly.com/blog/what-is-polymarket-and-how-does-it-work/
- Defirate order-book mechanics: https://defirate.com/prediction-markets/how-order-books-work/
- Numerai docs: https://docs.numer.ai/
- Numerai staking: https://docs.numer.ai/numerai-tournament/staking
- Numerai scoring definitions: https://docs.numer.ai/numerai-tournament/scoring/definitions
- Numerai signals scoring: https://docs.numer.ai/numerai-signals/scoring/
- Numerai meta-model contribution: https://docs.numer.ai/numerai-tournament/scoring/meta-model-contribution-mmc
- Good Judgment Project superforecaster paper: https://web.stanford.edu/~knutson/jdm/mellers15.pdf
- Good Judgment Open FAQ: https://www.gjopen.com/faq
- Good Judgment blog on forecasting measurement: https://goodjudgment.com/what-forecastbench-doesnt-measure/
- Cultivate Labs forecasts: https://www.cultivatelabs.com/forecasts
- Cultivate Labs unintended consequences post: https://www.cultivatelabs.com/posts/the-unintended-consequences-of-running-internal-forecasting-tournaments
- AI Impacts GJP evidence: https://aiimpacts.org/evidence-on-good-forecasting-practices-from-the-good-judgment-project/

---

## Conclusion
The repo already has a strong statistical forecasting backbone (e-processes, conformal intervals, Dixon-Coles, Elo ensemble, Brier OGD, calibration pipeline, Hawkes steam, CLV decomposition). The largest gaps are: (a) aggregation-level techniques (extremization, recency-weighted geometric mean, meta-model contribution), (b) feature-neutral projection against visible market/regime features, (c) staking/stake-weighted ensemble mechanisms, and (d) structured teaming / red-team aggregation protocols. The top 8 ranked techniques above provide a concrete, cost-ranked adoption roadmap that builds directly on existing modules rather than requiring green-field development.
