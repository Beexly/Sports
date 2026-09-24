# [0505] Graph Encoding and Neural Network Approaches for Volleyball Analytics: From Rally Prediction to Set and Hit Classification (arXiv:2308.11142v1)

**Citation:** Rhys Tracy, Haotian Xia, Alex Rasla, Yuan-Fang Wang, and Ambuj Singh (2023). *Graph Encoding and Neural Network Approaches for Volleyball Analytics: From Rally Prediction to Set and Hit Classification*. arXiv:2308.11142v1. URL: https://arxiv.org/abs/2308.11142v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 462 lines).
**Verdict:** ADAPT — the temporal contact-graph encoding (events as nodes, sequential edges, prior-round context nodes) is a portable template for NFL drive-outcome modeling from play sequences; adopt only with strict pre-play features and season/game holdouts, since the paper's own leakage controls are undocumented.

## 1. Research question
Can encoding a volleyball rally as a temporal graph of ball contacts — rather than as a flat feature vector — improve prediction of (a) rally winner, (b) set location, and (c) hit outcome, using GCN, graph-GRU, and graph-Transformer architectures against Transformer/CNN baselines?

## 2. Dataset / schema
- VREN NCAA/professional volleyball rally data (as stated). Exact sample sizes, date ranges, leagues/seasons, train/test splits, and hyperparameters are **not stated in paper**.
- Schema (inferred): per-contact records with contact type (pass/set/hit/block), location, and rally outcome labels.
- Access: **not stated in paper** (no URL given in the extract).

## 3. Method / model
Graph construction: each ball contact is a node; consecutive contacts (pass→set→hit→block) receive directed edges, forming the rally's temporal chain. Context augmentation: set prediction supplements the current pass/set nodes with the previous round's hit/block nodes; hit prediction adds the previous round's block node.
Architectures:
- GCN: one graph convolution layer, global pooling, three dense layers.
- Graph GRU: gated graph convolution, global pooling, two dense layers.
- Graph Transformer: custom edge self-attention convolution, global pooling, two dense layers.
Baselines: standard Transformer and CNN on flat encodings.

## 4. Equations & assumptions
No equations stated — neither the graph convolution, the gated update, nor the edge self-attention is formalized. Assumptions (inferred): (a) the contact chain with directed edges captures the rally's causal structure; (b) previous-round hit/block nodes carry useful context without leaking the current rally's outcome; (c) global pooling over the contact graph preserves outcome-relevant information.

## 5. Features / target
- Inputs: per-contact node features (type, location — exact feature list not stated) plus graph topology (directed sequential edges, previous-round context nodes).
- Targets: (a) rally winner (binary), (b) set location (categorical), (c) hit outcome (categorical, evaluated with blocked hits included and excluded). Horizon: remainder of the current rally.

## 6. Validation design
College and professional splits reported separately. Metrics: accuracy, AUC, Brier score, MAE for rally prediction; categorical accuracy for set/hit. Train/test split methodology, temporal ordering, and cross-validation are **not stated in paper** — the most serious gap.

## 7. Numerical results / baselines
Rally prediction (accuracy / AUC / Brier / MAE):
- College Transformer baseline: 74.38 / 0.82 / 0.18 / 0.34.
- College Graph Transformer: 81.15 / 0.87 / 0.15 / 0.27.
- Professional baseline: 80.00 / 0.85 / 0.16 / 0.32.
- Professional Graph Transformer: 81.15 / 0.87 / 0.16 / 0.27.

Set-location categorical accuracy:
- College: baseline Transformer 54.65, CNN 57.43, GCN 59.10, Graph Transformer 56.57.
- Professional: baseline 51.65, CNN 53.30, GCN 59.10, Graph Transformer 56.57.

Hit accuracy (college): blocked included — baseline 71.28, CNN 72.04, GCN 69.64, Graph Transformer 73.31; blocked excluded — 80.68, 80.68, 80.10, 86.41.
Hit accuracy (professional): included — 73.63, 74.73, 69.64, 73.31; excluded — 86.36, 86.36, 80.10, 86.39.

Note: several GNN scores are exactly identical across college/professional splits (e.g., GCN set accuracy 59.10 both; Graph Transformer rally 81.15 both) — suspicious and consistent with a reporting or leakage problem.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **No split documentation.** Without knowing whether rallies from the same match/game appear on both sides of the split, the 81.15% rally accuracy is uninterpretable.
- **Post-event information risk.** Previous-round hit/block context nodes are fine, but if any node feature encodes the current rally's eventual outcome (e.g., terminal contact attributes), the graph leaks the label. Cannot verify — features unstated.
- **Identical cross-split scores** (GCN 59.10 twice; Graph Transformer 81.15 twice) suggest copy-paste errors or test-set contamination.
- **No equations, no hyperparameters, no sample sizes, no code** — irreproducible as written.
- **No temporal holdout** described; volleyball seasons evolve tactically, and random rally splits would overstate deployment performance.
- External validity to NFL: volleyball rallies are short, closed sequences; NFL drives are longer with richer state (down, distance, field position). The graph-encoding *idea* transfers; none of the numbers do.

## 10. GSE overlap
Per the existing-research map (2026-09-21): generic GNN-for-sports-outcomes is **duplicate** — 2207.14124 (GNN sports outcomes) was already read in depth, and the map's ML brief commissions representation learning on play-by-play. What is new here (extension): encoding a *sequence of discrete game events as a temporal contact graph with prior-round context nodes* — a specific featurization, not just "use a GNN." GSE's drive-level work (gse-lab drive stats, 2409.04889 drive-dependence critique) currently uses flat aggregations; the event-chain graph is an untested representation there.

## 11. GSE implementation spec
Port the encoding, not the architecture: represent each NFL drive as a temporal graph — plays as nodes (down, distance, yardline, play type, EPA as node features), directed edges between consecutive plays, plus previous-drive terminal nodes (punt/TD/FG/turnover) as context, mirroring the paper's previous-round augmentation.
- Model: start with the paper's simplest recipe (1 graph-conv + pooling + dense) in PyTorch Geometric; compare against GSE's existing flat-feature drive model.
- Data: nflverse 2015–2025 play-by-play; drives segmented; strict pre-play features only (nothing measured after the snap of the predicted play).
- Splits: season holdouts (train ≤2022, validate 2023, test 2024–2025); never split drives from the same game across train/test.
- Effort: ~2 weeks (graph builder 1 week, model + eval 1 week).

## 12. Reproducible test
- Dataset: nflverse 2024–2025 regular seasons; drive-level dataset built only from pre-snap features.
- Targets: (a) drive ends in points (binary), (b) drive EPA total bucketed.
- Metric: log-loss and AUC vs GSE's flat-feature gradient-boosting drive model (the baseline to beat).
- Protocol: train on 2015–2023, test on 2024–2025; 5-fold season-blocked CV for hyperparams.

## 13. Acceptance / rejection gate
ADAPT (run the port) only under pre-registered conditions: the graph model must beat the flat-feature GBM baseline by ≥ 0.01 AUC AND ≥ 0.005 log-loss on the 2024–2025 holdout, with the gain present in both seasons separately. REJECT the representation if either condition fails — the paper's own numbers are too leakage-suspect to justify adoption on faith. Kill the lane entirely if a feature audit finds any post-snap information in the node features.

## 14. Improvement experiment
Go beyond the paper: replace the paper's hand-built context rule (previous-round nodes) with a *drive-level memory* — a GRU over the sequence of drive-graph embeddings within a game, so the model learns how much prior-drive context matters instead of hard-coding one round. Compare against the fixed-context version; if the learned memory wins, it also yields an interpretable "game script memory" artifact for content.
