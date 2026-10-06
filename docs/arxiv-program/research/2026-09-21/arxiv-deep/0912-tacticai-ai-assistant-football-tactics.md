# [0912] TacticAI: an AI assistant for football tactics (arXiv:2310.10553v2)

## Citation / full-text source

- arXiv:2310.10553v2 — full text: https://arxiv.org/pdf/2310.10553
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Zhe Wang, Petar Veličković, Daniel Hennes, Nenad Tomašev, Laurel Prince, Michael Kaisers, Yoram Bachrach, Romuald Elie, Li Kevin Wenliang, Federico Piccinini, William Spearman, Ian Graham, Jerome Connor, Yi Yang, Adrià Recasens, Mina Khan, Nathalie Beauguerlange, Pablo Sprechmann, Pol Moreno, Nicolas Heess, Michael Bowling, Demis Hassabis, Karl Tuyls (Google DeepMind + Liverpool FC, 2024). *TacticAI: an AI assistant for football tactics*. arXiv:2310.10553v2 [cs.AI]. URL: https://arxiv.org/abs/2310.10553v2
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 857 wrapped lines incl. Methods + supplements).
## Verdict

**ADAPT** — not for soccer set pieces, but for two portable methods: (1) the receiver-conditional decomposition P(shot) = Σ_i P(shot|receiver=i)·P(receiver=i), which ports directly to anytime-TD / target-share prop modeling; (2) the pre-snap graph + geometric-deep-learning blueprint for NGS tracking data (GSE's stated priority lane).

## 1. Research question
Can an AI assistant predict corner-kick outcomes (receiver, shot), retrieve tactically similar corners, and generate position/velocity adjustments that domain experts judge realistic and useful?

## 2. Dataset / schema
Liverpool FC tracking + event data: **9,693 corner kicks** from the 2020–21 Premier League; 2,517 dropped (alignment failures) → **7,176 valid** (80/20 split). Tracking at 25 fps; only the kick frame used. Node features: 22 players' positions, velocities, heights, weights, ball-possession flag; edge: teammate/opponent one-hot (fully connected graph); globals: receiver ID, shot indicator. 1,736 shot / 5,440 non-shot. Not public (licensing).

## 3. Method / model
- Graph representation: 22 nodes, fully connected; GNN message passing (Eq. 2), GATv2 attention (Eq. 3–4, 8 heads).
- **Geometric deep learning:** D₂ dihedral group (id, horizontal/vertical/both reflections); frame averaging (Eq. 6) for invariance; **group convolutions** (Eq. 8) for equivariance — 4 group-conv layers, 4 latent features/player.
- **Receiver prediction:** node classification, top-3 accuracy metric.
- **Shot prediction:** direct unconditional P(shot) failed (F1 0.52); replaced by decomposition **P(shot) = Σ_i P(shot|receiver=i)·P(receiver=i)** (Eq. 1) — train conditional on ground-truth receiver, marginalize at inference.
- **Guided generation:** conditional VAE (Eq. 11, reparameterization trick); outcome-conditioned sampling of one team's positions/velocities.
- **Retrieval:** nearest neighbors in latent team-embedding space (mean of player embeddings).

## 4. Equations & assumptions
- (1) P(shot)=Σ_i P(shot|receiver=i)P(receiver=i); (2) message passing; (3–4) GATv2 attention; (5) 𝔊-invariance; (6) frame averaging; (7) equivariance condition; (8) group convolution; (9–10) invariant readouts; (11) conditional VAE loss.
- Assumptions: pitch reflections preserve tactical meaning (D₂ symmetry); receiver identity + setup suffice for shot probability; one-team-fixed adjustments are a valid simplification; expert raters are a valid utility ground truth.

## 5. Features / target
Minimal features (positions, velocities, heights, weights, possession, team relation); no ball trajectory, no explicit distances. Targets: receiver node (22-way), shot binary, position/velocity reconstruction.

## 6. Validation design
80/20 random split, consistent across tasks; ablations (CNN, Deep Sets, MPNN, GATv2, ±D₂); realism via MLP discriminator (F1≈0.5 = chance); expert case study with 5 Liverpool FC raters (4 tasks, 50 samples each, statistical tests).

## 7. Numerical results / baselines
- Receiver top-3: **0.782 ± 0.039** (GATv2+D₂ group conv); ablations: CNN 0.364, Deep Sets 0.713, MPNN 0.723, GATv2 0.748, +D₂ frame avg 0.780.
- Shot F1: unconditional 0.521 → receiver-conditional **0.677** (0.712 with D₂ in ablation).
- Generated adjustments: MLP real-vs-generated F1 **0.53 ± 0.05** (chance); defensive refinement cut predicted shot prob 0.75→0.69 (z=2.62, p<0.001); attacking refinement raised it 0.18→0.31 (z=−4.46, p<0.001).
- Experts: real-vs-generated F1 0.60 (near chance); receiver top-3 agreement 0.79; retrieval recall **0.63 vs 0.33** baseline (z=2.34, p<0.05); **90% (45/50)** of adjustments favored, mean rating 0.7±0.1 (t₄₉=9.20, p<0.001).

## 8. Code / data availability
No public code or data in the paper; data available "on reasonable request" via authors.

## 9. Leakage
Random 80/20 split over corners (not by match/season) — mild leakage risk via same-match corners in both splits; unaddressed. Receiver fed as ground truth at training for the conditional model (correct — it's conditioning, not leakage).

## Limitations
- Soccer corners only; no NFL content whatsoever — everything here is method transfer.
- Random split, not temporal; tracking data limited to top leagues (small-data regime is the *motivation* for the geometry, but absolute data scale is still large vs NGS).
- No aleatoric uncertainty modeling (authors admit).
- D₂ symmetry is exact for a pitch; football-field analogs are weaker (direction of play, hash marks, down/distance break symmetry — augmentation must be designed, not copied).
- Expert study: n=5 raters, 50 samples — suggestive, not definitive.

## 10. GSE overlap
GSE's NGS lane is the stated #1 priority ("one of the single most important things in my website") and currently has no graph-based pre-snap model; prop modeling has no receiver-conditional TD decomposition. The existing-research-map has no GNN/geometric-DL entries. **Method import, zero duplication.**

## 11. GSE implementation spec
1. **Receiver-conditional TD model (fast win):** for anytime-TD and receiving props, implement P(TD on play) = Σ_t P(TD | targeted=t)·P(targeted=t) — train a target-distribution model (who gets targeted from pre-snap/matchup features) and a conditional TD model (given the target, from coverage/separation features); marginalize. Same for first-down props.
2. **Pre-snap graph (NGS lane):** 22 nodes with NGS positions/velocities at snap, edges = offense/defense + assignment proximity; GATv2 predicting play outcome (run/pass, yards bucket, TD). Use D₂-style augmentation: mirror across field axis (with play-direction normalization), which doubles goal-line/red-zone samples — the exact small-data regime the paper's geometry addresses.
3. **Situation retrieval:** nearest-neighbor search in the graph embedding space for "find me all 3rd-and-long blitz looks vs this protection" — matchup prep for the weekly packet.

## 12. Reproducible test
Dataset: NGS tracking 2023–2025 (already in GSE's NGS lane). Protocol: (a) baseline = gradient boosting on tabular pre-snap features (box count, down/distance, personnel) predicting play TD/first-down; (b) challenger = GATv2 on the 22-node pre-snap graph + the receiver-conditional TD decomposition; compare log-loss and AUC on a 2025 holdout.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT the graph + conditional-decomposition stack iff it improves holdout log-loss by ≥ 5% over the tabular baseline on 2025 plays (paired bootstrap, p < 0.05). If only the decomposition wins (without the GNN), adopt that alone. Otherwise REJECT.

## 14. Improvement experiment
Add the missing aleatoric uncertainty the authors flag: train the conditional TD model as a calibrated probabilistic head (temperature scaling / isotonic on the 2025 holdout) and propagate receiver-distribution uncertainty through the marginalization — producing full predictive distributions for TD props rather than point estimates, which feeds GSE's calibration mandate directly.

**Verdict: ADAPT** — receiver-conditional outcome decomposition for TD props + a GNN pre-snap blueprint for the NGS lane, with a hard log-loss gate before adoption.
