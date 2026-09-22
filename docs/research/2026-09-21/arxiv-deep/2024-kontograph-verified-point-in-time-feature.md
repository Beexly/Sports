# [2024] KONTOGRAPH: Verified Point-in-Time Feature Consistency and Amortised Explanation for Real-Time Anti-Money Laundering under a 200 ms Decision Budget (arXiv:2608.22389v1)

**Citation:** Abolfadl, A. (German University in Cairo) (2026). *KONTOGRAPH: Verified Point-in-Time Feature Consistency and Amortised Explanation for Real-Time Anti-Money Laundering under a 200 ms Decision Budget*. arXiv:2608.22389v1. URL: https://arxiv.org/abs/2608.22389
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~5,000 words).
**Verdict:** ADAPT
**Rationale:** the point-in-time-correctness-as-tested-invariant mechanism (one DSL spec → three compiled backends, Hypothesis property tests that perturb the future) is the single most actionable anti-leakage technique in this lane for GSE; the AML domain and explanation components do not transfer.

## 1. Research question
How do you build a real-time decision pipeline where (a) point-in-time feature correctness is a machine-falsifiable invariant rather than a convention, (b) detection, explanation, and decision fit a 200 ms p99 budget, and (c) what does rigorous measurement reveal about silent failure modes (leakage bugs, serving-format conversions, vacuous explainer metrics)? Domain: anti-money-laundering on SEPA Instant payments, but the feature-platform mechanism is domain-agnostic.

## 2. Dataset / schema
Agent-based simulation of a German retail payment ecosystem: 1,562,860 payments, 6,576 accounts, 270 simulated days; 2,995 criminal payments (ground truth), 0.19% criminal rate; 3,495 confirmed labels, 14.5% criminal label coverage. Labels modeled as a separate process from crime: a transaction is "confirmed" only if a simulated rules engine flags it and an investigator concurs, with verification latency in a `decided_ts` field distinct from event timestamp (deliberate selection bias). Five injected typologies (mule networks, structuring, authorized push payment fraud, circular flows, layering chains), each in standard + evasive variants. Dataset is a deterministic function of (configuration, seed, code revision), identified by content hash, byte-identical regeneration tested. Schema: Avro with schema registry + backward-compatibility gate in CI; Kafka-compatible broker keyed by debtor account (per-account ordering preserved); Apache Iceberg bronze/silver/gold layers with blocking/quarantine/warn quality gates. Explicitly synthetic — author states no transfer claim to production banking traffic.

## 3. Method / model
- **Feature platform (the transferable core):** 29 features declared in a small DSL over (entity, aggregation, window, filter); each declaration lowered to a typed IR with window semantics stated exactly once: `t − W ≤ h.acceptance_ts < t`, left-closed/right-open on event time, strictly excluding the scored event and same-millisecond events. The IR compiles to three backends: DuckDB SQL (historical backfill), Flink SQL (streaming), incremental executor with per-entity accumulators (online serving). Anti-skew mechanism: one specification, three compilers; agreement is a tested property, not an aspiration.
- **Point-in-time invariant (§IV):** property `f(e, E) = f(e, {e′ ∈ E : e′.ts < t})` — computed value invariant to every event at/after t. Two Hypothesis test families: (1) compute each feature through batch and online backends, assert elementwise equality; (2) perturb-the-future test: replace all events at/after t with different ones, assert nothing computed before t changes (mechanism-agnostic — catches window-boundary, join, ordering, enrichment leaks identically).
- **Serving:** single async FastAPI process; scoring synchronous in the handler (CPU-bound, single-digit ms); hash-chained decision log (model version, feature-set fingerprint, code revision, per-stage latency, explanation) for auditability.
- **Models:** TGN (temporal graph network with per-node memory) vs LightGBM baseline; amortised explainer (perturbation teacher → single-forward-pass student, PGExplainer-style).

## 4. Equations & assumptions
- Invariant: `f(e, E) = f(e, {e′ ∈ E : e′.ts < t})`.
- Window semantics: `t − W ≤ h.acceptance_ts < t` (left-closed, right-open; strictly prior).
- Chronological splits with purge and embargo: purge band 1 day (a 30-day band removed 79% of usable data and was rejected by a guard on bands exceeding 25% of a fold); labels admitted to a fold only if `decided_ts` precedes the fold's availability cutoff.
- Cost model: investigation EUR 35, customer friction EUR 12, prevention fraction 0.85; operating point at 200 alerts/day analyst capacity (not fitted — thresholds selected on validation; fitting on test would be leakage).
- Assumptions: payments within a day are dependent → day-blocked bootstrap (resampling units = whole days); latency percentiles reported nearest-rank (interpolation called out as optimistic in the tail).

## 5. Features / target
29 DSL-declared features: per-account/entity aggregations over windows (velocity, fan-in/fan-out topology statistics, amount patterns). Target: criminal payment (confirmed label), at 200 alerts/day capacity; headline metric PR-AUC (Saito & Rehmsmeier 2018, under 0.19% positive rate).

## 6. Validation design
Chronological splits with 1-day purge + embargo; held-out test fold 303,129 payments, 44 confirmed positives (labelled positive rate 1.45×10⁻⁴). Ablation ladder (constant → LightGBM → +static graph → +TGN no memory → +memory), one mechanism per rung. Baselines: constant predictor, LightGBM. Metrics: PR-AUC with day-blocked bootstrap 95% CIs, recall at 200 alerts/day, expected cost per 10k payments. Evaluation protocol pre-registered in version control before any model existed (hash 2eacb6e2). Latency measured over 2,000 scored payments.

## 7. Numerical results / baselines
- Ablation PR-AUC [95% CI]: constant 0.0001 [0.0001, 0.0002]; LightGBM 0.0053 [0.0030, 0.0079]; +static graph 0.0144 [0.0064, 0.0319]; +TGN no memory 0.0734 [0.0348, 0.1353]; +memory 0.1717 [0.1011, 0.2445]. Paired day-blocked bootstrap difference (memory TGN vs LightGBM): +0.166, 95% CI [0.105, 0.241] (excludes zero). Per-node memory alone more than doubled PR-AUC (0.0734 → 0.1717). Independent re-run: 0.0955 → 0.1555 (weak stability evidence).
- Cost/10k: rung 2 EUR 53,529 vs rung 1 EUR 20,459 (2.6×) despite rung 2's 3× better PR-AUC — ranking metric vs deployed-threshold cost diverge; recall at capacity: rung 2 0.795 vs rung 1 0.909.
- Latency (p50/p99 ms): feature fetch 1.84/4.67; graph assembly 0.00/0.01; inference 0.42/1.78; explanation 0.00/1.87; counterfactual 0.00/3.59; total 2.71/7.97 — 200 ms budget met with large margin (repeated runs varied 3.6–8.0 ms p99).
- Failure modes: (1) three point-in-time defects found by the property tests that survived code review — LEFT JOIN + COUNT(*) fabricating history=1 for first events; debtor/creditor entity-key collision in the online executor; accumulator admitting same-millisecond events into strictly-prior windows. All would have inflated performance. (2) ONNX export of the GBM: mean |score| diff 7.4×10⁻⁸, max 1.7×10⁻⁴, yet 774 decisions changed (0.26%) and alert volume inflated +12.0% (6,458 → 7,232) because 32-bit accumulation moved scores across the cost-optimal threshold 3.98×10⁻⁴. (3) Explainer fidelity vacuous: top-5 Jaccard 0.904, Spearman −0.038 at median 1.0 candidate edge — the metrics measured candidate-set cardinality, reported as a null result.
- TGN training: 1,094 s for 5 epochs over 937,731 events (batch 200) with memory; 155 s without. Hardware: i7-8550U (4 cores, 16 GB) for everything except TGN training (single NVIDIA T4).

## 8. Code / data availability
Stated: implementation, evaluation protocol, decision records, and generated artifacts available so every reported figure regenerates from a command (no URL given in the extracted text). Dataset content-hashed and regenerated, not distributed.

## 9. Leakage & limitations
- The paper's central claim is about anti-leakage, and its own weak point is acknowledged: labels are admitted only if `decided_ts` precedes the cutoff, but `decided_ts` is a simulated field — the method is sound, the instantiation is synthetic.
- Only 44 confirmed positives in test → wide CIs; adjacent middle rungs do not separate.
- The graph model is NOT deployed; the latency budget was measured on the gradient-boosted path only. No latency claim for TGN.
- Explainer null result honestly reported — fidelity unmeasurable at observed neighbourhood size.
- No fairness assessment (simulator generated names reflecting immigrant communities — unanalyzed). Single-institution framing.
- External validity to NFL: the mechanism transfers cleanly (features over event streams with as-of semantics); the TGN/explainer/cost-model specifics do not. GSE's analogue of `decided_ts` vs event time: NGS re-runs retroactively change "event" values — the paper's creation/event timestamp duality (cf. 2022) is the right model, but GSE must additionally handle corrected event data, which the paper doesn't address.
- Adversarial: property tests falsify the invariant but don't prove it; the Hypothesis stream generators may not cover the joint distribution of real edge cases. The three defects found are evidence the method works, not a bound on what remains.

## 10. GSE overlap
No duplication — no existing GSE work treats point-in-time correctness as a tested invariant. This extends 2022 (storage/merge semantics) and 2023 (monitoring doctrine): 2024 provides the falsification machinery. GSE's current ingestion (nflverse pulls, odds API snapshots) almost certainly contains unmeasured point-in-time violations of exactly the three types found here (join-boundary, key-collision, same-timestamp-window bugs) — none are currently tested.

## 11. GSE implementation spec
Build the GSE point-in-time test harness:
1. **Feature DSL:** declare each NFL feature once as (entity, aggregation, window, filter) with window semantics `t − W ≤ event_ts < t` strictly prior to observation ts (kickoff); compile to two backends initially: batch SQL (DuckDB over Delta) and the live-serving path (Python incremental or Flink SQL later). Backend agreement = CI test.
2. **Perturb-the-future tests (Hypothesis):** generate synthetic event streams (plays, odds ticks, injury reports); for each feature, assert (a) batch-vs-online equality, (b) replacing all events at/after ts₀ changes nothing computed before ts₀. Port the three known defect classes as regression cases: first-event history fabrication, home/away entity-key collision, same-kickoff-timestamp window admission.
3. **Serving-format parity rule:** any model artifact conversion (pickle → ONNX, fp64 → fp32) must be compared in decisions at the deployed threshold, not mean score error; adopt the paper's stance: a conversion is a model change until measured. Concretely: require ≥99.9% decision agreement on a full-season replay before any converted artifact serves a public pick.
4. **Hash-chained decision log:** every published pick logs (model version, feature-set fingerprint, code revision, per-feature latency, scores) — extends the lineage spec in 2022/2023 toward the paper's audit log.
5. Effort: ~2 weeks for the DSL + two backends on the core feature set; property tests ~1 week.

## 12. Reproducible test
On the 2024 NFL season: (a) compute all spread-model features through both backends for every game; require 100% elementwise agreement; (b) run the perturb-the-future suite and require zero violations; (c) deliberately inject the three known defect classes into a staging branch and verify the suite catches all three (recall of the test harness itself); (d) take the current production model artifact, convert to the serving format, and measure decision agreement at the deployed threshold on the full 2024 replay.

## 13. Acceptance / rejection gate
ADOPT the invariant-testing mechanism iff: (i) the harness catches all three injected defect classes (3/3 recall), AND (ii) batch-vs-online agreement is 100% on the 2024 season replay, AND (iii) any serving-format conversion shows ≥99.9% decision agreement at the deployed threshold before promotion. REJECT the conversion (keep serving the original artifact) on any parity failure — per the paper, a 7.4×10⁻⁸ mean score diff that moves 0.26% of decisions is a failed conversion. Serving latency gate: feature-fetch p99 ≤ 50 ms during the simulated Sunday window (the paper's 4.67 ms on 1.5M events shows this is achievable).

## 14. Improvement experiment
Beyond the paper: corrected-event replay. The paper's invariant assumes events are immutable once past; GSE's NGS data gets retroactively corrected. Extend the property tests with a third family: "correction tests" — assert that when a past event is corrected, exactly the downstream features whose windows contain the corrected event change, and nothing else does (minimal blast radius). This turns the invariant into a bitemporal one (event time × correction time) and gives GSE a tested guarantee for the NGS re-run problem the paper never faced.
