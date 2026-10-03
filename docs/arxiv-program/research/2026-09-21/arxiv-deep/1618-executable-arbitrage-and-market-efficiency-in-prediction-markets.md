# [1618] Executable Arbitrage and Market Efficiency in Prediction Markets (arXiv:2608.00666)

**Citation:** Jonas Gebele, Timm Mutzel, Florian Matthes (2026). *Executable Arbitrage and Market Efficiency in Prediction Markets*. arXiv:2608.00666. URL: https://arxiv.org/abs/2608.00666
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, ~14,500 words; Appendices 0.A–0.B read, 0.C–0.G scanned after reading the full body through Section 8).
**Verdict:** ADAPT — the cleanest empirical treatment in the wave of *executable* (not theoretical) prediction-market arbitrage: the payoff-identity framework (ΣY_i ≡ 1), depth-aware fee-adjusted edge measurement, and the payoff-space vs. protocol-executable distinction port directly to GSE's cross-market monitoring. The $1.086M/$32k converter-vs-settlement split and the profit-decay curve ($1.00 → $0.20 → $0.08 median per conversion) are calibration data for any GSE arb strategy.

## 1. Research question
Do deterministic payoff identities in winner-takes-all prediction markets (complete YES basket ≡ 1 unit collateral; complete NO basket ≡ (|Q|−1) units) produce *executable* arbitrage, or only theoretical bound violations? Using Polymarket's negative-risk markets — where the NegRisk Adapter operationalizes the NO→YES direction pre-settlement but the YES→NO reverse has no conversion path — the paper measures violation incidence, persistence, and actor-level exploitation across realization channels, and prototypes a bidirectional adapter.

## 2. Dataset / schema
Three non-overlapping panels: (i) FPMM regime: 51 mutually exclusive outcome sets, 235 binary markets, ~53,000 trades (reconstructed pool states via Polygon RPC); (ii) CLOB actor panel: 32,702 events, 259M trades through 2025-12-31, with Goldsky subgraph conversion traces and PolygonScan cross-checks (actor = address/proxy wallet); (iii) Level-2 CLOB order books, hour-stratified, 2026-04-14 00:00 UTC to 2026-05-19 06:00 UTC, replayed event-time with joint depth-walking across component markets. Same-condition YES/NO deviations excluded after a 308,416,666-message WebSocket validation found only 20 isolated API-sync inconsistencies.

## 3. Method / model
Event-level payoff identities: N_i ≡ 1 − Y_i; Σ_{i∈Q} Y_i ≡ 1; subset identity Σ_{k∈S} N_k ≡ (|S|−1)·1 + Σ_{j∈Q\S} Y_j (Eq. 1). Executable edges measured depth-aware and fee-adjusted (conservative taker assumption): Δ^settle_Y = 1 − Σa_t(Y_i), Δ^settle_N = (|Q|−1) − Σa_t(N_i) (Eq. 2); Δ^{N→Y}_S = (|S|−1) + Σb_t(Y_j) − Σa_t(N_k) (Eq. 3); Δ^{Y→N}_S = Σb_t(N_k) − Σa_t(Y_j) − (|S|−1) (Eq. 4). Violation episodes = maximal consecutive positive-edge state sequences; durations D_k = t_close − t_open with survival function Ŝ_D(τ). Actor-level: conversion bundles (NO inputs matched to CLOB buys/splits within 5 blocks ≈10s; YES outputs tracked 150 blocks ≈5min; Π^conv = V_out − C_in) and settlement baskets (complete within ≤10 min, FIFO, Π^Y(q) = q − C_Y(q), Π^N(q) = (n−1)q − C_N(q)).

## 4. Equations & assumptions
- Subset identity: Σ_{k∈S} N_k ≡ (|S|−1)·1 + Σ_{j∈Q\S} Y_j (Eq. 1).
- Settlement edges: Δ^settle_Y(t) = 1 − Σ_{i∈Q} a_t(Y_i); Δ^settle_N(t) = (|Q|−1) − Σ_{i∈Q} a_t(N_i) (Eq. 2).
- Converter edge: Δ^{N→Y}_S(t) = (|S|−1) + Σ_{j∈Q\S} b_t(Y_j) − Σ_{k∈S} a_t(N_k) (Eq. 3).
- Reverse edge: Δ^{Y→N}_S(t) = Σ_{k∈S} b_t(N_k) − Σ_{j∈Q\S} a_t(Y_j) − (|S|−1) (Eq. 4) — no protocol path.
- Reverse adapter: qΣ_{j∈Q\S}Y_j + (|S|−1)q·1 ≡ qΣ_{i∈S}N_i (Eq. 5); |S|=1 needs no collateral top-up; S=Q converts (|Q|−1)q collateral to a complete NO basket.
- Assumptions: taker execution everywhere (overstates costs); midpoint-to-quote inference (1¢ spread at half-cent midpoints, 2¢ at integer-cent, 0.1¢ adjustment at extremes); gas omitted (relayer); FIFO lots; 10-min basket window; three panels can't be matched at opportunity level.

## 5. Features / target
Features: executable acquisition costs a_t(·) and sale proceeds b_t(·) from joint depth-walking; subset S; direction (N→Y supported, Y→N unsupported); actor conversion traces. Target: fee-adjusted edge magnitude, episode incidence/persistence per direction, and actor-level realized profit per realization channel.

## 6. Validation design
Descriptive empirics, not causal: FPMM vs. CLOB panels cover different periods/structures (explicitly not a before–after). Predictions I1–I3 (fewer/shorter violations and concentrated exploitation on the supported side) tested via episode counts, survival curves, and profit attribution. Robustness: alternative basket windows, LIFO accounting, exclusion of an anomalous 75-conversion/$381,748 cluster (3 addresses, 12 Dec 2025, 22:07–22:14 UTC — judged non-representative/coordinated). Comparison with Saguillo et al. ($10.6M/$29M) reconciled as different estimands: on the same 2024-04-01–2025-04-01 window this paper's criteria yield $291,424.

## 7. Numerical results / baselines
- **Profit:** ~$1.118M mechanism-linked total: $1.086M converter-enabled (97%), $32,283 settlement-based. Excludes the $381,748 anomaly cluster.
- **Violation asymmetry (CLOB):** 2,098 positive YES-side episodes vs. 36 positive NO-side episodes — violations concentrate on the unsupported side (I1 confirmed).
- **Persistence:** median exact duration 16.15s (YES, n=253) vs. 7.99s (NO, n=5) — directionally faster closure on the supported side but n=5 is too small for distributional claims; 366/624 (58.7%) episodes window-spanning (≥50 min). FPMM: ~40% of episodes persist >50 min, some >1 day.
- **Settlement baskets:** FPMM: 67 baskets, 19 events, 35 actors, $3,639 FIFO profit (one actor 76%); CLOB: 5,923 baskets, $28,644 (YES $14,199/4,014 baskets; NO $14,445/1,909).
- **Converter concentration:** top-10 addresses ≈75% of profit; full-set NO→collateral conversions $205,531 (18.9%), rest from partial conversions + YES inventory recycling; median profit/conversion decayed $1.00 (through Jul 2024) → $0.20 (late 2024–2025) → $0.08 (early 2026) — intensifying competition.
- **Adapter deployment:** 2023-11-28; first converter profit Jan 2024.
- **Reverse prototype:** convertYESPositions costs +63,095 gas over convertPositions (near-constant overhead); total 0.70M → 25.32M gas across 5–196 outcomes; requires a finalized active-outcome set (placeholder NO ≈ collateral otherwise).

## 8. Code / data availability
No code released. Data: public Polymarket docs/contracts (neg-risk-ctf-adapter repo), pmxt order-book archive v2, Goldsky subgraphs, HuggingFace Polymarket_data dataset — all cited with access dates; reconstruction procedures fully specified.

## 9. Leakage & limitations
- The three panels can't be matched: violations (L2 panel) and exploitation (actor panel) are never linked at the opportunity level — episode closure doesn't prove an arb trade caused it.
- FPMM vs. CLOB comparison is descriptive; regime, volume, and period all differ.
- YES-side NO count (n=5) can't support distributional persistence claims — the authors say so.
- Profit estimates mix realized proceeds with mark-to-market imputations (merged/residual YES valued at estimated ask).
- The $381,748 exclusion is judgmental (diagnostics-based, but still a call).
- Reverse adapter is a prototype, not deployed; active-outcome-set requirement is unresolved.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE has de-vigged consensus and prediction-market tooling but sports-market microstructure is thin (line 143). This is **new** and complements 1608 (Polymarket NBA LOB arb: 7 valid single-market arbs, 290 combinatorial episodes) and 1609 (dislocation measurement): where 1608 measures *whether* violations exist, 1618 measures *whether they're executable and who extracts them*, with the crucial payoff-space vs. protocol-executable distinction. It also operationalizes 1617's "adaptivity costs almost nothing" in reverse — here, the *absence* of a protocol primitive is what leaves money on the table.

## 11. GSE implementation spec
1. **Executable-edge monitor:** implement Eqs. 2–4 on GSE's multi-outcome markets (division winners, awards, playoff brackets — anywhere outcomes are mutually exclusive): joint depth-walk across legs, fee-adjusted, both directions. Alert only on protocol-executable edges (GSE can actually trade both legs), not theoretical bound violations.
2. **Direction-aware enforcement prior:** from the 2,098-vs-36 asymmetry — when GSE detects a bound violation on a leg it *cannot* trade efficiently (thin book, no conversion path), expect slow closure (FPMM-like: 40% >50 min); when both legs are liquid, expect seconds-scale closure (16s median). Size GSE's arb attempts accordingly.
3. **Competition-decay calibration:** use the $1.00→$0.20→$0.08 median-profit decay as the prior for any GSE arb strategy's half-life — plan for per-opportunity profit to decay ~5–10× within 18 months of a strategy becoming known.
4. **Basket-completion detector:** replicate the ≤10-min complete-basket reconstruction on GSE-tracked chains to detect when *others* are arbing — a real-time signal that a bound violation exists even before GSE's own depth-walk flags it.
5. **Effort:** ~1 week for the edge monitor (Eqs. 2–4 + depth-walking); the actor-level reconstruction is a research project.

## 12. Reproducible test
Dataset: Polymarket L2 data (pmxt archive) for one NegRisk event family + GSE's own multi-outcome market data. Metrics: (a) replicate the YES/NO violation count asymmetry on a fresh event (expect YES-side dominance where the reverse path is unsupported); (b) measure episode median durations vs. the paper's 16.15s/7.99s; (c) backtest a paper-trading rule that takes only protocol-executable edges (both legs immediately tradable) vs. all theoretical violations — compare realized fill rates. Baseline: 97% converter / 3% settlement profit split. Pass if executable-only edges fill at ≥3× the rate of theoretical-only edges and the direction asymmetry replicates.

## 13. Acceptance / rejection gate
**Adapt** the executable-edge framework (Eqs. 2–4, depth-aware, fee-adjusted, direction-aware) as GSE's standard for cross-market arb monitoring — it replaces any naive mid-price-sum bound check, which this paper shows overstates opportunity. **Reject** settlement-based basket strategies as a GSE product: $32k total across the entire sample says the capital lock-up isn't worth it, and the profit-decay curve says even the converter channel is now a $0.08-median game. Use the paper as measurement infrastructure and competition intelligence, not as a strategy source.

## 14. Improvement experiment
The paper's edge measurement is backward-looking (reconstructed states). GSE's improvement: make it *predictive* — train a model on the L2 panel's violation episodes to predict episode *opening* from pre-violation order-book features (one-sided depth depletion, spread widening on one leg), then measure whether predicted episodes are exploitable before the paper's 16-second median closure. If GSE can front-run the 16s window, it captures the YES-side violations the paper shows nobody is equipped to take (only 36 NO-side episodes existed because the adapter enforces that side — the YES side's 2,098 episodes are the open field). Second experiment: extend the subset-identity framework to cross-sport correlated outcomes (e.g., division winner + win total legs), where no "adapter" exists at all — pure settlement arb with GSE's capital.
