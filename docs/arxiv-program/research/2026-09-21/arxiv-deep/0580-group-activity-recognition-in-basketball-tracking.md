# [0580] Group Activity Recognition in Basketball Tracking Data -- Neural Embeddings in Team Sports (NETS) (arXiv:2209.00451v1)

**Citation:** Hauri, S., & Vucetic, S. (2022). *Group Activity Recognition in Basketball Tracking Data -- Neural Embeddings in Team Sports (NETS)*. arXiv:2209.00451v1. URL: https://arxiv.org/abs/2209.00451v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2065 lines).
**Verdict:** ADAPT — the architecture pattern (per-object LSTM embeddings + Transformer self-attention + permutation-invariant team pooling + self-supervised trajectory-prediction pretraining + weak-label fine-tuning) is directly portable to NFL tracking data for play-concept and formation recognition; the basketball pick-and-roll/handoff label taxonomy itself does not transfer.

## 1. Research question
Can group activities in team sports (pick-and-roll and handoff in basketball) be automatically recognised from player/ball tracking data alone, despite the high cost of manual labels? The paper proposes NETS — a Transformer + LSTM architecture with team-wise pooling — and a three-stage training recipe (self-supervised trajectory-prediction pretraining → weak-label fine-tuning → manual-label fine-tuning) to overcome label scarcity.

## 2. Dataset / schema
Public NBA SportVU movement data from 632 games of the 2015–2016 season (https://github.com/sealneaward/nba-movement-data). 25 Hz tracking of 11 objects (ball + 5 attackers + 5 defenders); segmented into possessions (shot-clock resets), kept only frames with all 10 players in the offensive half; possessions <3s discarded → 113,760 possessions ≈ 1.1M seconds. Downsampled 3× to Δt=0.12s. Input windows L=10 frames (1.2s); 869,905 non-overlapping 1.2s play sequences. Weak labels via domain rules: 45,802 pick-and-rolls, 15,251 handoffs, 808,852 other. Manual labels: 1,800 sequences (600/class), 50/50 train/test. Weak-label specificity from manual checks of 200 plays each: pick-and-roll 82%, handoff 90.5%. Data access: public GitHub mirror; SportVU is commercial but this mirror is freely available.

## 3. Method / model
NETS (Neural Embeddings for Team Sports): (1) per-object LSTM embeds the L-frame trajectory time series of each of the 11 objects; (2) a 3-dim one-hot role encoding (ball/offense/defense) is concatenated; (3) a Transformer encoder (N layers, multi-head self-attention, layer norm, FFN, residual connections) produces context-aware per-object embeddings; (4) two heads: a trajectory-prediction head (role-specific feedforward networks predicting future velocity vectors over horizon H) used for self-supervised pretraining, and a classification head (team-wise sum pooling of the 5 offensive + 5 defensive embeddings, concatenated with the ball embedding, through FFN + softmax, trained with class-weighted NLL) used for group activity recognition. Team-wise pooling makes predictions permutation-invariant to player order within a team. Training recipe: pretrain on trajectory prediction → fine-tune on weak labels → fine-tune on manual labels. Hyperparameters: d_h=256, N=8 layers, h=64 heads, Adam lr 5e-5, batch 512, early stopping (50 epochs), ~400 epochs (~30h on one GPU) for pretraining.

## 4. Equations & assumptions
- Transformer layer: z_o^{l+1} = LN(FF(LN(Att(Q,K,V)))) + z_o^l; Att(Q,K,V) = Concat(head_1,…,head_h)W^O; head_i = softmax((QW_i^Q)(KW_i^K)^T/√d_k)VW_i^V, with d_g=d_v=d_k= d_h.
- Classification head: y = softmax(FF(z_B^N ⊕ Σ_{i=1}^5 z_{A_i}^N ⊕ Σ_{i=1}^5 z_{D_i}^N)), ⊕ = concatenation.
- Class-weighted NLL: L_NLL = −(1/|D|) Σ_D Σ_{k=1}^K α_k y_k ln(ŷ_k), α = (0.77, 2.34, 0.77) for (p&r, handoff, other).
- Trajectory MSE on velocities: L_MSE(ν,ν̂) = (1/2H)‖ν−ν̂‖²_2.
- Multi-class F1 from confusion matrix M: precision_i = M_ii/Σ_j M_ji; recall_i = M_ii/Σ_j M_ij; F1_i = 2·precision_i·recall_i/(precision_i+recall_i).
- Weak-label rules (Appendix A): possession if a player is closest to ball ≥5 consecutive frames, ball within 5 ft, ball height <10 ft, ball speed <25 ft/s; defensive assignment via linear-sum assignment minimizing total defender–offensive-player distance; pick-and-roll if triangle distances δ_a, δ_d1 < 6 ft and δ_d2 < 3 ft; handoff if possession changes between two offensive players within 6.5 ft.
- Assumptions stated: play sequences independent; offense always attacks along a fixed axis (preprocessed); labels of 1.2s windows independent of surrounding context.

## 5. Features / target
Input features: raw x,y trajectories of 11 objects over L=10 frames (no hand-engineered features beyond role one-hot). Targets: (a) self-supervised — future velocity vectors ν^{t+1:t+H} for horizons H=10/20/40; (b) supervised — 3-class group activity label (pick-and-roll / handoff / other) per 1.2s sequence. Prediction horizon effectively 1.2s of context.

## 6. Validation design
Time-agnostic splits, not time-ordered: 80/10/10 train/val/test split of the 869,905 sequences for weak-label evaluation; manual-label evaluation on a balanced 900-sample test set (300/class). Trajectory prediction evaluated with ADE/FDE in feet at H=10/20/40 against LSTM, SocialGAN, Macro VRNN, and a NETS-no-LSTM ablation. Ablations: LSTM embedding on/off, team pooling on/off, pretraining on/off (Table 3); hyperparameter sweep over N, d_h, h, H (Appendix B, Table 6). Weak-label quality validated against manual labels via confusion matrix (Table 4). t-SNE qualitative analysis of embeddings at each training stage. No out-of-season or forward-time validation.

## 7. Numerical results / baselines
- Trajectory prediction (Table 1, ADE/FDE in feet): at H=10, NETS 1.08/2.34 vs LSTM 1.61/2.98, M. VRNN 1.70/3.43, SocialGAN 1.25/2.75, NETS-no-LSTM 1.18/2.51. At H=20: NETS 2.78/5.87 (best). At H=40: NETS 5.70/10.88 (best).
- Weak-label 3-class F1 (Table 2; test: 4,581 p&r, 1,525 handoffs, 80,884 other): NETS (0.856, 0.768, 0.988) vs GBoost (0.398, 0.443, 0.915), RForest (0.329, 0.261, 0.810), LReg (0.188, 0.099, 0.755), LSTM (0.360, 0.490, 0.905). Note: 93.0% majority-class accuracy makes F1 the right metric — the paper's choice, not mine.
- Ablation (Table 3): full NETS (pretrain+LSTM+pooling) (0.856, 0.768, 0.988); removing pretraining drops to (0.802, 0.675, 0.982); removing LSTM embed drops to (0.803, 0.731, 0.983); removing pooling drops to (0.829, 0.718, 0.985).
- Manual-label test (Table 5, F1): rule-based weak labels alone (0.869, 0.874, 0.893); NETS trained on weak labels (0.915, 0.863, 0.908); NETS fine-tuned on 900 manual labels only (0.784, 0.813, 0.844) — worse than rules; pretrain→weak→manual sequential fine-tune (0.951, 0.938, 0.902) — best, beating the rules themselves.
- Embedding analysis: without team pooling, t-SNE clusters split into (5 choose 2)=10 sub-clusters keyed on player index pairs — evidence the pooling layer correctly removes permutation dependence.
- Hyperparameter sweep (Table 6): results insensitive to N, d_h, h; best at H=20 pretraining horizon. All numbers are the paper's claims on its own test splits.

## 8. Code / data availability
Data: public via the cited GitHub mirror of NBA movement data. Code: not stated as released in the paper (no link given) — "None stated" for code.

## 9. Leakage & limitations
- **Random 80/10/10 split over play sequences, not time-ordered**: sequences from the same possession/game appear in both train and test; trajectory-prediction pretraining almost certainly saw near-duplicate test windows. Reported F1/ADE are likely optimistic vs a forward-time deployment. The manual-label test is the most trustworthy evaluation.
- Weak labels are noisy (82%/90.5% specificity) and the sequential recipe's gain over rules is modest on "other" (0.893→0.902).
- Fine-tuning on 900 manual labels alone *underperforms* the hand-written rules — the model needs the weak-label stage; a GSE deployment needs a comparable weak-label rule engine first.
- Only 1.2s windows; longer-horizon group activities (e.g., full NFL play development over 4–6s) untested.
- No uncertainty quantification on the classifier; no calibration reported.
- NFL transfer: NFL tracking (Next Gen Stats) is 10 Hz player tracking (no ball chip in public data until recently); 22 players not 11; plays are discrete with long gaps, not continuous possessions — the segmentation logic must be rebuilt around play boundaries. Adversarial: the permutation-invariance trick matters more in NFL (11 per side).

## 10. GSE overlap
Extension, not duplicate. Existing-research-map: GSE has the 2026-09-21 NGS 27-metric-family taxonomy inventoried (route classification 2.0, run-scheme classification, coverage matchups) and the 2026-09-18 NGS replacement spec — but those are *metric* inventories and spec documents, not a trained tracking-data embedding/classification system. No Transformer/LSTM tracking-embedding pipeline exists in Garrett's corpus; no self-supervised pretraining on tracking data; no weak-label rule engine for play concepts. The ML research brief's "representation learning on play-by-play" is tabular, not tracking. This paper supplies the missing architectural recipe for turning raw NGS tracking into learned play embeddings — a genuine new capability for the tracking lane.

## 11. GSE implementation spec
1. Data: NFL Next Gen Stats tracking (10 Hz, 22 players; ball position from 2024+ chip data where available, else infer from QB/RB handoff geometry). Segment by play (snap to whistle), standardise: offense attacks +x, centre at line of scrimmage.
2. Weak-label rule engine first (the paper's key lesson): programmatic detectors for NFL group concepts — e.g., play-action (run-fake geometry + depth of QB dropback vs handoff), screen (OL release + RB lateral drift), blitz (defender crossing LOS within X frames of snap), RPO mesh, motion-at-snap (NGS already has this), coverage shell rotation. Validate each rule against a few hundred manually watched plays (target ≥80% specificity, mirroring the paper's 82%/90.5%).
3. Model: per-player LSTM (or GRU) trajectory embedder → role one-hot (QB/RB/WR/TE/OL/DL/LB/DB/ball) → Transformer encoder (d_h=256, N=6–8, h=32–64) → team-wise sum pooling per side → classification head over the weak-label concept taxonomy.
4. Training recipe exactly as the paper: self-supervised next-H-frame trajectory/velocity prediction on all plays (millions of windows) → fine-tune on weak labels → fine-tune on a small manually labelled set; early-stop on manual labels.
5. Serving: export play embeddings (the pooled vector) as features into the GSE engine — e.g., "this play's route-concept embedding" as a matchup feature; cache per play at ingest.
6. Effort: ~4–6 weeks for one ML engineer (rule engine + labelling tooling is the long pole; model training is standard PyTorch).

## 12. Reproducible test
Dataset: NGS tracking for the 2023–2024 NFL regular seasons (public Kaggle NGS releases cover 2018+; use 2023 for weak-label training, 2024 as held-out test). Build weak-label rules for 3+ concepts (play-action, screen, blitz — definitions fixed before modelling). Manually label 900 plays (300 per concept family incl. negatives), split 450/450 train/test. Metric: macro F1 on the 450-play manual test set; baseline: the weak-label rules' own F1 on that test set. Time window: train on 2023 season data, test on 2024 season data (forward-time, unlike the paper).

## 13. Acceptance / rejection gate
ADAPT/ADOPT the pipeline if, on the 2024-season manual test set: (a) the sequential recipe (pretrain→weak→manual) beats the weak-label rules' macro F1 by ≥3 points, AND (b) absolute macro F1 ≥ 0.80 on the concept set. REJECT if the recipe fails to beat the hand-written rules (the rules alone are then the cheaper solution — exactly the paper's Table 5, row 3 failure mode), or if weak-rule specificity cannot reach 80% after two rule-revision rounds.

## 14. Improvement experiment
Beyond the paper: replace the fixed 1.2s window with a **play-phase-aware hierarchical model** — a low-level encoder over 0.5s micro-windows (pre-snap, mesh point, route stem, break) whose embeddings feed a play-level Transformer with learned phase attention. Hypothesis: NFL plays have strong phase structure (the paper's basketball possessions don't), so phase-aware pooling should beat flat windowing on concept F1; test on the §12 protocol with phase labels from the weak-rule engine as auxiliary supervision.
