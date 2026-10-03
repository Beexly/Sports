# [0310] FENCE: Fairplay Ensuring Network Chain Entity for Real-Time Multiple ID Detection at Scale In Fantasy Sports (arXiv:2310.05651v1)

**Citation:** Akriti Upreti, Kartavya Kothari, Utkarsh Thukral, Vishal Verma (2023). *FENCE: Fairplay Ensuring Network Chain Entity for Real-Time Multiple ID Detection at Scale In Fantasy Sports*. arXiv:2310.05651v1. URL: https://arxiv.org/abs/2310.05651v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 440 lines).
**Verdict:** REJECT — a production fraud/anti-abuse system for fantasy-contest operators (detecting users with multiple accounts), with no transfer to GSE's prediction, calibration, or DFS-optimization lanes; the one transferable component (graph + connected-components abuse detection) has no current GSE use case.

## 1. Research question
The paper answers: how can a large fantasy-sports operator detect users who create multiple accounts (multi-IDs) to circumvent per-user contest-entry limits, in both batch (historical graph) and real-time (at registration) modes, at the scale of 190M+ users? It is an industry systems paper from Dream11 describing a deployed production pipeline, not a prediction-modeling paper.

## 2. Dataset / schema
Proprietary and unreplicable. Data source: Dream11's internal user-registration and transaction logs (device attributes, IP, payment instruments, referral links, login/session metadata). Scale: 190+ million registered users (paper's stated platform scale). Exact schema withheld — the paper describes feature families (device, network, behavioral, financial attributes) but states the complete attribute list is proprietary. No public URL, no sample, no request mechanism. Time range not stated.

## 3. Method / model
FENCE builds a user graph where nodes are user accounts and edges encode shared attributes (same device, IP, payment ID, etc.), using both heuristic edges and edges predicted by a Random Forest classifier trained on labeled multi-ID pairs. Pipeline: (a) offline batch processing on AWS (Spark) writes the graph to AWS Neptune; (b) connected components are found via an Alternating connected-components algorithm to form multi-ID clusters; each cluster is scored; clusters with score > 0.95 trigger automatic action (account restriction), lower scores go to manual review via sampled review (generally 1%–10% of clusters sampled, per the paper's sampling description); (c) real-time path: on each new registration, a 1-hop neighborhood lookup against a Redis cache of the batch graph flags linked accounts within 4 seconds. Experiment tracking via MLflow. Batch benchmark hardware: 6 × r5d.4xlarge instances.

## 4. Equations & assumptions
No equations stated (no formal equations in the paper). Stated assumptions: (a) multi-ID users reuse at least one identifiable attribute across accounts (device, IP, payment instrument); (b) connected components of the shared-attribute graph correspond to real identity clusters; (c) a Random Forest trained on historical confirmed multi-ID labels generalizes to new abuse patterns; (d) the automated-action threshold (score > 0.95) trades recall for near-certain precision. Unstated but load-bearing: attribute collection is complete and truthful (no adversarial spoofing modeled), and manual-review labels are ground truth.

## 5. Features / target
Input features (families as described, exact attributes proprietary): device identifiers, IP/network attributes, payment-instrument identifiers, referral/affiliation links, behavioral/session features. Target: binary label — account is a multi-ID (belongs to a user operating multiple accounts) vs. legitimate single account; operationalized as cluster-level score with the >0.95 automatic-action threshold. Prediction horizon: at registration (real-time, 4-second SLA) and batch (periodic full-graph recompute).

## 6. Validation design
No academic train/validation/test split with dates is stated. Validation is operational: the paper reports online precision of the automated flow and precision/recall of the manual-review flow against human reviewer labels (Table 1). Baselines: the prior rule-based/manual system (reported via the business metric — relative decrease in "system FPV," false-positive volume, of 86%). Metrics: precision and recall as judged by manual reviewers. Time-ordering of the data used to train the Random Forest edge predictor is not stated.

## 7. Numerical results / baselines
Paper's reported numbers (Table 1 and text): automated flow online precision 96.7%, training recall 55.2%; manual-review flow precision 70.2%, recall 86.4%; business result: relative 86% decrease in system FPV (false-positive volume) after FENCE deployment; real-time registration screening SLA of 4 seconds; batch benchmark on 6 × r5d.4xlarge. These are the paper's claims from a production deployment; my interpretation: the numbers are plausible for an industry system but are unverifiable (no public data, no code, no independent replication).

## 8. Code / data availability
None stated. No code repository. Data is proprietary Dream11 internal data, explicitly not shared.

## 9. Leakage & limitations
(a) No data or labels are available, so nothing is reproducible or auditable — the entire result rests on the authors' production telemetry. (b) The edge-prediction Random Forest's training labels come from the prior manual process, so label noise and reviewer bias propagate into the "automated" system. (c) Adversarial adaptation is unmodeled: sophisticated abusers rotate devices/IPs and use distinct payment instruments, which breaks the shared-attribute assumption — the paper reports no adversarial evaluation. (d) External validity to NFL: none. Multi-ID detection is an operator-integrity problem; GSE is not a contest operator, runs no entry limits, and has no multi-account abuse surface. (e) The >0.95 auto-action threshold and 1%–10% review sampling are business-policy choices, not validated statistical procedures.

## 10. GSE overlap
GSE's corpus has no anti-fraud/account-integrity lane — the existing-research map (2026-09-21) covers prediction, calibration, tracking/NGS, DFS optimization, and market microstructure, but nothing on operator abuse detection. The DFS practice corpus (`docs/research/2026-09-13-dfs/`, `docs/research/2026-09-19-dk-week2/`) covers lineup construction and ownership, not contest integrity. Classification: new capability in a domain GSE does not operate in — i.e., no current GSE use case. If GSE ever ran its own contests or an affiliate/referral program with fraud exposure, this would become an extension candidate; today it is not.

## 11. GSE implementation spec
No GSE build is warranted. The only component worth cataloging for possible future use is the graph + Alternating connected-components pattern for entity resolution: if GSE ever needed to detect duplicate/sybil entities (e.g., de-duplicating scraped analyst accounts, or fraud in a future contest product), the recipe is: build a bipartite user–attribute graph from available identifiers, score edges with a supervised classifier on confirmed duplicates, run connected components, and threshold cluster scores with human review of the margin. Estimated effort if ever needed: 2–3 weeks for a batch prototype on existing data. Not scheduled.

## 12. Reproducible test
Not runnable — no data, no code, no public labels. A conceptual analogue test (if the lane ever existed): on a labeled multi-account dataset, the connected-components + RF-edge system must beat a rule-based baseline (shared-device exact match) on cluster-level F1 with manual-review labels as ground truth, measured over a forward time window. This test cannot be executed at GSE today.

## 13. Acceptance / rejection gate
Gate: adopt graph-based entity resolution only if GSE acquires a concrete duplicate/fraud problem AND a pilot on labeled internal data beats the rule-based baseline by ≥10 points of cluster F1 on a forward window. Neither condition holds; the paper is rejected for the current program. Revisit only if GSE launches contest or referral products.

## 14. Improvement experiment
If the abuse-detection lane ever becomes relevant, the follow-up beyond the paper would be adversarial: simulate attribute-spoofing abusers (rotating devices, residential proxies, distinct payment instruments) and measure FENCE-style recall degradation, then test whether behavioral biometrics (typing cadence, session timing entropy) restore detection. Rationale: the paper's shared-attribute assumption is its single point of failure, and no production anti-abuse system should be adopted without an adversarial stress test.
