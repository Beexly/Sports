# [1150] Predict Confidently, Predict Right: Abstention in Dynamic Graph Learning (arXiv:2501.08397)

**Citation:** Jayadratha Gayen, Himanshu Pal, Naresh Manwani, Charu Sharma (2025). *Predict Confidently, Predict Right: Abstention in Dynamic Graph Learning*. arXiv:2501.08397v1 [cs.LG]. URL: https://arxiv.org/abs/2501.08397
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 16 pages, arXiv v1).
**Verdict:** ADAPT
The coverage-constrained abstention objective (select head + coverage penalty + auxiliary full-data loss) is directly portable to GSE's pick-selection/abstention lane, which the existing-research map names as an explicit gap.

## 1. Research question
Can continuous-time dynamic graphs (CTDGs) be given a principled reject option so a temporal GNN abstains on high-uncertainty predictions, trading coverage for accuracy — while also surviving extreme class imbalance (minority class < 0.2%)? The paper claims to be the first to integrate a reject-option (coverage-based) abstention strategy into CTDG learning, for both dynamic link prediction and dynamic node classification.

## 2. Dataset / schema
Four public temporal-graph datasets (Appendix A, Table 4; source: Zenodo record 7213796, DyGLib). All are interaction streams (u, v, t), not sports data:

| Dataset | #Nodes | #Links | Link feat dim | Bipartite | Time | Labels |
|---|---|---|---|---|---|---|
| Wikipedia (1 mo of edits) | 9,227 | 157,474 | 172 (LIWC) | Yes | Unix ts | 2 (217 banned = 0.14%) |
| Reddit (1 mo of posts) | 10,984 | 672,447 | 172 (LIWC) | Yes | Unix ts | 2 (366 banned = 0.05%) |
| Canadian Parliament (2006–2019, MPs' mutual "yes" votes) | 734 | 74,478 | 1 | No | Years | none |
| UN Trade (30 yrs, food/agri trade between 181 nations) | 255 | 507,497 | 1 (normalized trade value) | No | Years | none |

Only Wikipedia and Reddit carry node labels (user banned/not-banned) and are used for node classification. Datasets are public; no proprietary data.

## 3. Method / model
Coverage-based selective prediction à la SelectiveNet [Geifman & El-Yaniv 2019], grafted onto temporal GNN encoders (TGN, GraphMixer, DyGFormer via DyGLib) for binary classification:

- **Encoder:** temporal node embeddings z_u(t) from TGN (memory + GRU updater + 2 graph-attention heads), GraphMixer (MLP-Mixer link encoder with cos(ωt) time encoding + neighbor mean-pool node encoder), or DyGFormer (transformer + neighbor co-occurrence encoding).
- **Two heads:** (i) prediction head f(x) — MLP on concatenated source/destination embeddings (link pred) or node embedding (node classification); (ii) abstention head q(x) ∈ {0,1} producing a scalar score a(x) ∈ [0,1]. Sort scores on validation; threshold θ chosen to hit target coverage c; abstain iff a(x) > θ.
- **Objective (link prediction):** L^E_t(f,q) = r̂(f,q|E_t) + λΨ(c − φ̂(q|E_t)) with Ψ(b)=max(0,b)², plus an **auxiliary loss** L^E_{h,t} (plain BCE on ALL samples, no coverage gating) so the model still sees rejected samples: L^E_t = αL^E_t(f,q) + (1−α)L^E_{h,t}. Node classification has the mirror image L^V_t (eqs. 6–9).
- **Class imbalance:** auxiliary loss reweighted as L^V_{h,t} = βL^V_{h,minor,t} + L^V_{h,major,t}, β > 1 (searched β ∈ [2,100]; best β = 2 or 5, results degrade for β ≥ 10 — Table 5).
- Training: Adam (link pred; node classification on Wikipedia) / SGD (Reddit node classification), 75 epochs, early stopping patience 10, batch 200, λ=32, α=0.5, 100-dim time encoding, 172-dim output; 5 seeds (0–4), mean ± std reported.

## 4. Equations & assumptions
Objective (eq. 1): max_{f,q} P(f(x)=y | q(x)=0) = max_{f,q} P(f(x)=y | a(x) ≤ θ), θ ∈ (0,1).

Link-prediction loss (eq. 2): L^E_t(f,q) = r̂(f,q|E_t) + λΨ(c − φ̂(q|E_t)), Ψ(b) = max(0,b)².

Empirical selective risk (eq. 3): r̂(f,q|E_t) = Σ_{(u,v,t)∈E_t} ℓ(f(z_u(t),z_v(t)), y_{E_t})(1 − q(z_u(t),z_v(t))) / (|E_t| φ̂(q|E_t)).

Empirical coverage (eq. 4): φ̂(q|E_t) = (1/|E_t|) Σ_{(u,v,t)∈E_t} (1 − q(z_u(t),z_v(t))).

Combined (eq. 5): L^E_t = α L^E_t(f,q) + (1−α) L^E_{h,t}.

Node classification: same structure (eqs. 6–9); imbalance-weighted auxiliary loss (eq. 10): L^V_{h,t} = β L^V_{h,minor,t} + L^V_{h,major,t}.

**Assumptions (stated or implicit):** binary classification only; threshold θ calibrated post-hoc on validation selection scores (not learned jointly); coverage constraint enforced only via quadratic penalty with fixed λ=32; the auxiliary head's full-sample loss is what prevents collapse onto the easy subset; class-imbalance fix is a static scalar β, not adaptive; chronological 70/15/15 splits.

## 5. Features / target
- **Link prediction:** features = temporal node embeddings from interaction history (edge features: 172-dim LIWC for Wiki/Reddit, 1-dim weight for trade/parliament). Target: binary — link present/absent at time t given history to t−1. Transductive (seen nodes) and inductive (unseen nodes) settings.
- **Node classification:** features = node embedding z_u(t). Target: binary user-banned label (minority < 0.2%). Horizon: prediction at time t from interactions before t.

## 6. Validation design
Chronological 70/15/15 train/val/test split ("to simulate real-world temporal dynamics"). Coverage sweep: 100%, 90%, 80%, 70%, 60%, 50% (θ re-set per coverage on validation-sorted scores). Metrics: AP and AUC-ROC for link prediction under three negative-sampling strategies (random, historical, inductive NSS); AUC-ROC for node classification. Baselines: TGN and GraphMixer **without** reject option (= 100% coverage row), DyGFormer in appendix. Each model run 5× (seeds 0–4), best-validation model tested.

## 7. Numerical results / baselines
Key numbers quoted exactly from the tables (mean ± std over 5 seeds):

- **Transductive link-pred AP (Table 1, random NSS), TGN:** Wikipedia 98.56 ± 0.06 (100%) → 99.88 ± 0.02 (60%); Reddit 98.63 ± 0.02 → 99.86 ± 0.04; UN Trade 64.87 ± 1.93 → 81.46 ± 1.81; Can. Parl. 74.14 ± 1.51 → 90.19 ± 3.50 (paper claims ≈16.05-point AP gain on Can. Parl.).
- **Inductive link-pred AUC (Table 2, random NSS), TGN Reddit:** 97.17 ± 0.04 (100%) → 99.73 ± 0.13 (60%), claimed ≈2.56-point gain.
- **Node classification AUC (Table 3, TGN):** Wikipedia 86.23 ± 3.30 (100%) → 89.78 ± 2.76 (60%, β=1) → 89.86 ± 2.52 (β>1); Reddit 63.08 ± 1.48 (100%) → 66.03 ± 3.45 (60%, β=1) → 69.58 ± 2.96 (60%, β=5) — the β=5 minority-weighting adds ≈3.55 points on the extreme-imbalance Reddit task.
- Performance peaks then declines as coverage keeps dropping; DyGFormer on UN Trade is erratic (AP 65.37 → 61.02 → 67.45 → 77.76 → 62.40 → 60.21 with std up to ±11.67) — abstention selection unstable there.
- Compute (Table 6, Can. Parl. link pred): TGN 9 s/epoch, 668 MB GPU; DyGFormer 91 s/epoch, 18,326 MB — the abstention heads add negligible cost on top of the encoder.
- All figures above are the paper's reported values; my reading: gains are real but mechanically guaranteed by the coverage trick (metric computed only on the kept subset) — the selective-risk formulation is the contribution, not a free lunch on full coverage.

## 8. Code / data availability
None stated in paper (no repo link; DyGLib is cited as the experimental harness, datasets via Zenodo record 7213796).

## 9. Leakage & limitations
- **Metric-on-kept-subset inflation:** AP/AUC are computed only on non-abstained samples; improvement with lower coverage is tautological unless the abstention rule would generalize — the honest comparison is selective risk at equal coverage vs a confidence baseline, which the paper does not run (no comparison to plain softmax-threshold abstention or to Monte-Carlo dropout).
- **Threshold set post-hoc:** θ is chosen on validation after training; at test time the realized coverage drifts (acknowledged in Appendix B). No guarantee on test coverage.
- **No abstention calibration:** the abstention head is a learned score with no calibration or coverage guarantee (unlike conformal methods); overconfident abstention scores break the trade-off silently.
- **Fixed λ=32, α=0.5** — single setting reported for all datasets; no sensitivity analysis on the coverage-penalty strength.
- **DyGFormer instability** on UN Trade (huge std, non-monotone coverage curve) suggests the joint (f,q) training is fragile on some encoders/datasets.
- **External validity to NFL:** none of the data is sports; the graph here is user×page interactions. The portable part is the selective-loss machinery, not the temporal GNN.

## 10. GSE overlap
Existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, gap list item 4) names **"learning-to-abstain with coverage-risk curves"** as an explicit gap in the RL/bandits-for-pick-selection lane, and the calibration stack line lists CQR / grouping loss / temperature scaling / LRD / ECE-by-slice — abstention is absent from it. This paper is an **extension** (new capability): a concrete training objective for abstention rather than GSE's current post-hoc confidence gating. No duplicate of existing GSE work.

## 11. GSE implementation spec
1. **Data:** GSE engine picks table (Neon `picks`, 3,411 rows, v5.2.7) + graded outcomes; features = engine's existing feature set (not a GNN — skip the temporal encoder entirely).
2. **Model:** add a lightweight **selection head** g(x) alongside the existing pick classifier: two-logit MLP head on the same embedding. Loss = selective risk (eq. 3) + λ·max(0, c−coverage)² + (1−α)·BCE on all samples (auxiliary head, eq. 5). Start λ=32, α=0.5 from the paper; coverage targets c ∈ {0.9, 0.8, 0.7}.
3. **Class-imbalance variant:** for rare high-edge markets (e.g., upset moneylines), reweight auxiliary loss β·L_minor + L_major with β ∈ {2, 5} (paper's Table 5 optimum region).
4. **Serving:** at inference, score every slate game, sort selection scores, abstain below the validation-calibrated θ_c for the chosen coverage; publish only the kept picks ("play singles like a responsible adult" lane — abstention formalizes "no play" days).
5. **Effort:** ~2–3 days (heads are trivial; the work is the coverage-calibration harness and the selective-risk backtest).

## 12. Reproducible test
Dataset: GSE `picks` table with graded results, 2024-09 → 2026-09 (chronological 70/15/15). Train pick classifier + selection head at coverage targets 100/90/80/70%. Metric: **selective accuracy and selective ROI on the kept subset**, vs baseline = plain classifier with post-hoc softmax-threshold abstention matched to the same realized coverage. Time-ordered; no shuffle. Test window: the final 15% chronological block.

## 13. Acceptance / rejection gate
ADOPT the method iff, at matched realized coverage (±2 pts), the selection-head model's selective ROI beats the softmax-threshold baseline by ≥ 3 ROI points on the chronological test block AND realized coverage stays within ±3 pts of target across the last 4 weeks of data; REJECT otherwise (post-hoc gating is simpler and already in GSE's calibration stack).

## 14. Improvement experiment
Replace the fixed quadratic coverage penalty with a **Lagrangian dual update** (learn λ online to hit exact coverage) and compare realized-coverage drift against the paper's fixed-λ scheme — the paper's own Appendix B admits test coverage drifts because θ is set post-hoc; a dual variable should pin it. Second experiment: **per-market coverage budgets** (spread vs total vs moneyline get separate θ), since abstention value differs by market edge distribution.
