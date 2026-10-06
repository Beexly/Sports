# [1094] Driving Engagement in Daily Fantasy Sports with a Scalable and Urgency-Aware Ranking Engine (arXiv:2604.13796v1)

**Citation:** Padalkar, U. (2026). *Driving Engagement in Daily Fantasy Sports with a Scalable and Urgency-Aware Ranking Engine*. arXiv:2604.13796v1. URL: https://arxiv.org/abs/2604.13796
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the urgency-feature + target-aware attention + listwise neuralNDCG design is the right architecture for GSE's time-sensitive ranking surfaces (notifications, slate-closing pick feeds); the ablation shows urgency features carry the gains.

## 1. Research question
DFS engagement is time-sensitive: a contest/match starting in 20 minutes deserves different ranking than one starting tomorrow. How do you build a ranking engine that (a) explicitly models urgency (time-to-lock, time-since-lineups), (b) captures users' sequential behavior with target-aware attention, and (c) optimizes a listwise ranking objective — at a scale of hundreds of billions of interactions?

## 2. Dataset / schema
Production-scale DFS platform data (proprietary). Train: 200,000 users, 92.5B interactions, 12 months. Validation: 200,000 users, 10.5B interactions, 4 months. Test: 250,000 users, 11.7B interactions, 4 months. Strictly disjoint users across splits AND out-of-time (no user or time overlap) — an unusually rigorous split. Candidate window: matches starting within 24 hours. Schema: user histories (match clicks, team saves, contest joins), candidate urgency features (time-to-round-lock, time-since-lineups), temporal positions.

## 3. Method / model
Urgency-aware Deep Interest Network (DIN): (1) candidate urgency features including time-to-round-lock and time-since-lineups; (2) temporal positional encoding `Δt_j = t_c − t_j` (elapsed time between candidate time and historical action j); (3) target-aware attention over the user's history of match clicks, team saves, and contest joins, conditioned on the candidate; (4) listwise training with neuralNDCG loss (NeuralSort-based differentiable sorting). Distributed training: 80-GPU example setup, ~1 hour per epoch.

## 4. Equations & assumptions
- Temporal encoding: `Δt_j = t_c − t_j`.
- Listwise loss: neuralNDCG via NeuralSort (differentiable relaxation of the sorting operator applied to predicted scores, optimizing a smooth nDCG surrogate).
- Target-aware attention: attention weights over historical actions computed against the candidate representation (DIN-style).
- Assumptions: user interests are revealed by click/save/join sequences; urgency is adequately captured by time-to-lock and recency features; the 24-hour candidate window covers the decision-relevant set; disjoint-user + out-of-time splitting gives an unbiased generalization estimate.

## 5. Features / target
Inputs: urgency features (time-to-round-lock, time-since-lineups), user behavior sequences (match clicks, team saves, contest joins) with temporal encodings, candidate contest/match features. Target: ranked list of candidates by engagement (join/click) — listwise ranking target.

## 6. Validation design
Disjoint-user AND out-of-time splits (train 12 mo / validation 4 mo / test 4 mo, different users in each) — stronger than standard time splits. Metrics: nDCG@1/3/5. Baselines: primary user-level LightGBM, plus ablations (pointwise loss, no positional encoding, no urgency features). No online A/B yet — online/edge deployment stated as planned.

## 7. Numerical results / baselines
- Full model: nDCG@1 0.6445, nDCG@3 0.7920, nDCG@5 0.8152.
- Ablations (nDCG@1/@3/@5): pointwise loss 0.6405/0.7893/0.8129; no positional encoding 0.6288/0.7812/0.8058; no urgency features 0.3832/0.5240/0.5676.
- The urgency-feature ablation is the dramatic one: removing urgency features collapses nDCG@1 from 0.6445 to 0.3832 — urgency carries the model.
- Reported relative lift: +9% nDCG@1 over the primary user-level LightGBM.
- Training cost: ~1 hour per epoch on the 80-GPU distributed setup.

## 8. Code / data availability
None stated. Proprietary data; no public code.

## 9. Leakage & limitations
The disjoint-user + out-of-time split is exemplary anti-leakage design. Limitations: no online A/B results yet (all gains are offline); the +9% lift is reported without confidence intervals in the extracted text; training scale (80 GPUs, 92.5B interactions) is far beyond GSE's data; the paper doesn't report calibration of the underlying scores; urgency features are platform-specific (time-to-round-lock) and need re-derivation for GSE surfaces.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No existing recommender/ranking lane in the repo — same as 1093, this is new capability. Complements 1093 (WiDIR): 1093 gives the multi-tower ranking architecture, 1094 adds urgency modeling + listwise loss + target-aware sequential attention. Together they form a coherent personalization stack. No overlap with calibration/EPA/tracking lanes.

## 11. GSE implementation spec
GSE's time-sensitive surfaces: pre-lock notifications ("your lineup locks in 30 min"), slate-day pick feeds, live-betting nudges. Adapt: (1) define urgency features per surface (time-to-kickoff, time-since-lineup-posted, time-to-line-close); (2) build user behavior sequences from GSE engagement logs (article reads, pick follows, contest entries); (3) implement target-aware attention (DIN-style, single GPU feasible at GSE scale) with `Δt` temporal encodings; (4) train listwise with neuralNDCG on (user, slate) ranking tasks. Start with a PyTorch single-node implementation — GSE doesn't need 80 GPUs. Effort: 3–4 weeks for the first surface.

## 12. Reproducible test
Offline: time-ordered + user-disjoint splits of GSE engagement data (mirror the paper's split discipline); metric nDCG@5 on held-out slate-day rankings; baselines = LightGBM ranker and the 1093-style model without urgency features. Pass = urgency-aware model beats the no-urgency ablation by a statistically significant margin (the paper's gap was 0.6445 → 0.3832 on nDCG@1; expect a smaller but positive gap at GSE scale).

## 13. Acceptance / rejection gate
ADAPT if adding urgency features + listwise loss beats the pointwise/no-urgency baseline by ≥3% relative nDCG@5 on the user-disjoint out-of-time test window. REJECT if the gains vanish at GSE's data scale (the paper's scale may be doing heavy lifting).

## 14. Improvement experiment
Fuse with 1093: train the WiDIR three-tower architecture with the 1094 urgency/attention/listwise head — i.e., replace WiDIR's hinge loss with neuralNDCG and add the Δt temporal encoding to the interaction tower. Hypothesis: the combination beats either paper's model alone on time-sensitive surfaces, since 1093 lacks urgency modeling and 1094 lacks the wide+deep feature separation.
