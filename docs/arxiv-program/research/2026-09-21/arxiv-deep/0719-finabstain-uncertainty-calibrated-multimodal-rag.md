# [0719] FinAbstain: Uncertainty-Calibrated Multimodal RAG for Selective Financial Forecasting (arXiv:2607.24875v1)

**Citation:** Dorothy Torres, Wei Cheng, Henan Huang (2026). *FinAbstain: Uncertainty-Calibrated Multimodal RAG for Selective Financial Forecasting*. arXiv:2607.24875v1. URL: https://arxiv.org/abs/2607.24875v1
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/2607.24875.txt (135 lines, full: abstract, §I–VII, equations 1–9, tables, conclusion, references).
**Verdict:** ADAPT — but flagged as *framework-only*: the paper is an explicit research proposal whose results section is labeled simulated ("explicitly labeled simulated results rather than empirical claims"). What transfers is the formal architecture and the composite hybrid uncertainty score, not any measured lift.

## 1. Research question
How do you build a selective forecasting system on top of LLM agents that knows when its evidence does not justify a directional decision — with point-in-time retrieval (no backtest leakage), multi-agent evidence, calibrated uncertainty, and an explicit abstention controller — plus a reproducible, preregistered evaluation blueprint?

## 2. Dataset / schema
Planned (not executed): S&P 100 constituents, 2015–2024, survivorship-aware; SEC EDGAR 10-K/10-Q/8-K, earnings-call transcripts, licensed news, OHLCV, MACD, RSI, moving averages, volatility. Table I counts explicitly labeled "simulated planning values, not observations." Tasks: 1-day/5-day abnormal-return direction (bullish/neutral/bearish), 20-day volatility interval. Chronological split: train 2015–2020, validation 2021–2022, test 2023–2024 (final test touched once). No sports data.

## 3. Method / model
Point-in-time multimodal retriever: evidence ℰ_{i,t} filtered by both publication timestamp τ^pub_j ≤ t and ingestion timestamp τ^ing_j ≤ t (Eq. 1) — immutable snapshots, versioned amendments, indicators recomputed only from bars ending at t. Role-separated agents (fundamental, news sentiment, technical, risk/counterargument, verifier) analyze independently (no anchoring), then a weighted aggregation pass. Calibration suite: raw max-prob, temperature scaling, isotonic regression, split conformal (nonconformity 1−p̄_y), and the hybrid uncertainty score (Eq. 4). Controller (Eq. 5): predict when U ≤ θ, else abstain / request evidence / reduce exposure by 1−U / route to human. θ selected on validation for minimum selective risk at minimum coverage c_min. High-uncertainty policies and mandatory human review when contradiction exceeds a safety threshold. Trading metrics: net return r^net = z_t r_{t+1} − κ|z_t − z_{t−1}|, Sharpe, MDD, costs at 5/10/20 bps, block-bootstrap CIs.

## 4. Equations & assumptions
- (1) Point-in-time evidence: ℰ_{i,t} = ∪_{m∈M} {e^(m)_j : τ^pub_j ≤ t, τ^ing_j ≤ t}.
- (2) Agent disagreement: D_{i,t} = (2/(A(A−1))) Σ_{a<b} JSD(p_{a,i,t} ∥ p_{b,i,t}).
- (3) Relevance-weighted contradiction: C_{i,t} = Σ_{j<k} r_j r_k q_{jk} / (Σ_{j<k} r_j r_k + ε).
- (4) Hybrid uncertainty: U_{i,t} = σ(w₀ + w_D D + w_C C + w_S S + w_R R + w_H H + w_G G), S = 1−sampling agreement, R = 1−retrieval relevance (retrieval deficiency), H = predictive entropy, G = recent calibration gap; weights validation-fitted.
- (5) Controller: ŷ = argmax_y p̄(y) if U ≤ θ else ⊥.
- (6) Coverage Cov(θ) = (1/n)Σ g_θ; selective Risk(θ) = Σ g_θ ℓ / (Σ g_θ + ε).
- (7) ECE = Σ_b (|I_b|/n)|acc(I_b) − conf(I_b)|.
- Assumptions: exchangeability for conformal coverage (weakened by market regimes — coverage reported by regime/month, not asserted unconditionally); agent independence after independent analysis; timestamp precision and licensed-news availability.

## 5. Features / target
Features: filings/calls/news/prices/volume/technical indicators via role-separated agents; aggregated class probabilities, citations. Target: directional classes + 20-day volatility interval.

## 6. Validation design
Proposed (preregistered): chronological protocol, validation-only hyperparameter/threshold selection, final test touched once, block-bootstrap CIs, paired block resampling, seeds/prompts/model versions logged. NOT executed — all reported values are simulated artifacts.

## 7. Numerical results / baselines
**All simulated.** Under the paper's own simulated scenario: FinAbstain selective accuracy 0.688 at 72% coverage vs calibrated-no-abstention 0.606 at 100%; ECE 0.026 vs raw 0.128; Sharpe 1.08 vs 0.57; MDD 0.112 vs 0.171. Ablations (simulated): removing disagreement/contradiction/calibration each degrades selective accuracy and ECE; "no temporal filter" row intentionally contaminated and excluded (demonstrates why scores alone can't certify a backtest). **These illustrate the intended hypothesis; they are not findings.**

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- Paper's own (honest and extensive): all numbers simulated; irreducible market uncertainty remains; LLM rationales are not causal; conformal validity degrades under temporal dependence; needs frozen data manifest, prompt registry, model hashes, and independent audit before any performance claim.
- Additional: single timestamp-precision assumption; no news corpus yet (licensed news pending).

## 10. GSE overlap
The composite uncertainty score (Eq. 4) is genuinely new in the corpus: agent disagreement (JSD) + evidence contradiction + sampling consistency + retrieval deficiency + entropy + calibration gap, fitted with validation weights. GSE's multi-agent evidence lanes (injury, weather, line movement) map to its agent roles; the contradiction term C is a principled way to formalize cross-source conflict GSE currently handles heuristically. The dual-timestamp point-in-time spec (Eq. 1) is a directly adoptable backtest-integrity rule for GSE (publication + ingestion timestamps on news/injury data). Overlap with 0717 (gate diagnostic) and 0714/0715/0716 (abstention signals) — complementary, not duplicate: this supplies a *composite* score and a *chronological evaluation blueprint* (abstention precision, citation correctness, block bootstrap) the other ledgers lack.

## 11. GSE implementation spec
1. Implement the hybrid uncertainty U from Eq. 4 for each candidate pick: D = mean JSD across GSE's evidence agents (injury/news/weather/line-movement); C = contradiction between top evidence sources; S = disagreement across repeated engine runs; R = data completeness penalty; H = entropy of predicted outcome distribution; G = recent calibration gap (rolling ECE). Fit weights on 2023–2024 validation picks via logistic regression on realized correctness.
2. Controller: post only when U ≤ θ (θ from validation, min coverage 0.60); high-U picks → reduce tier, request manual review (Garrett), or abstain.
3. Enforce Eq. 1 on all news/injury inputs: every evidence item needs publication timestamp ≤ game-lock and a recorded ingestion timestamp; drop any item failing either check.
Effort: 1 week engineering + agent instrumentation.

## 12. Reproducible test
Dataset: engine picks 2023–2025 with agent-level outputs (need to log per-agent probabilities first). Fit Eq. 4 weights on 2023–2024; on 2025 held-out, compare selective hit rate at 80% coverage vs the current single-signal gate and vs a temperature-scaled-only baseline. Verify the dual-timestamp filter catches at least one known backtest leak case (news published post-lock ingested pre-lock).

## 13. Acceptance / rejection gate
ADOPT if 2025 held-out shows the hybrid U beats temperature-scaling-only and MC-Dropout-only baselines on selective hit rate at 80% coverage by ≥1 pp with positive fitted weights on disagreement/contradiction terms (w_D, w_C > 0). REJECT if w_D/w_C fit at ~0 — then the paper's headline mechanism doesn't transfer to GSE's data, and §9/13 verdict stands.

## 14. Improvement experiment
Execute the preregistered chronological protocol the paper only proposes: build the frozen data manifest + prompt registry + audit trail for GSE picks, then run the full Table-II metric suite (selective accuracy, abstention precision, block-bootstrap CIs, transaction-analogue cost metrics for CLV). Publish the blueprint as GSE's own standing evaluation standard — the paper's most durable contribution may be the protocol, not the score.
