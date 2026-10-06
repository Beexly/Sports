# [0334] Pixels or Positions? Benchmarking Modalities in Group Activity Recognition (arXiv:2511.12606v3)

**Citation:** Drishya Karki, Merey Ramazanova, Anthony Cioppa, Silvio Giancola, and Bernard Ghanem (2026). *Pixels or Positions? Benchmarking Modalities in Group Activity Recognition*. arXiv:2511.12606v3. URL: https://arxiv.org/abs/2511.12606v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 12 pages + appendix).
**Verdict:** ADAPT — the role-aware positional graph architecture and its core finding (tracking beats video by 16.9 pp with 479× fewer parameters) are directly portable to GSE's NGS-replacement lane; this is the architecture to classify NFL plays from tracking data rather than broadcast pixels.

## 1. Research question
For group activity recognition (GAR) in team sports, which modality wins: pixels (broadcast video) or positions (agent tracking trajectories)? No benchmark aligned both modalities on the same activities, so no apples-to-apples comparison existed. The paper builds SoccerNet-GAR (synchronized video + tracking for the same 87,939 football events) and benchmarks strong unimodal classifiers, introducing a novel role-aware graph network for tracking-based GAR.

## 2. Dataset / schema
**SoccerNet-GAR** (new): curated from the 64 matches of the 2022 FIFA World Cup (raw broadcast video + player tracking + event annotations from PFF FC, now Gradients Sports). Cleaning pipeline: (1) dropped events with no tracking frame within 10 ms of the event timestamp; (2) dropped events missing either modality; (3) resolved duplicate labels (e.g., a goal also labeled a shot) by priority ordering. 6,346 events (6.8%) removed → **87,939 annotated events**, 10 classes: PASS (57,521, 65.4%), TACKLE (10,943), OUT (5,873), HEADER (5,723), THROW IN (2,598), CROSS (2,175), FREE KICK (1,788), SHOT (1,041), GOAL (188, 0.2%), HIGH PASS (89, 0.1%) — a 646:1 imbalance reflecting football's natural distribution. For each event, a 4.5-second window centered on the event timestamp: T=16 samples at 30 fps with 9-frame interval (≈3.3 fps effective). Match-level splits: 45 train (62,159 events), 9 validation (12,091), 10 test (13,689). Tracking: 2D player positions + 3D ball (x ∈ [−60,60]m, y ∈ [−42,41]m, z ∈ [−8,25]m), 30 fps; players complete in 99.9% of frames, ball visible in 93.4%. Video: 720p edited broadcast. Code: https://github.com/drishyakarki/pixels vs positions.

## 3. Method / model
1. **Framework**: standard backbone-neck-head. Video backbone: pretrained vision transformers (VideoMAE-B, VideoMAEv2-B), frame embeddings zVt ∈ R^dV. Tracking backbone: novel role-aware graph network (below). Neck: temporal aggregation ftemp (pooling, TCN, attention, BiLSTM). Head: 2-layer MLP → softmax over 10 classes. Cross-entropy loss; class imbalance handled by weighted random sampling (M=4,000 samples per class per epoch).
2. **Role-aware graph construction** (the key idea): at each frame, graph Gt=(Vt, Et); nodes = N entities (players + ball), each with an 8-dim feature: pitch coordinates (x,y), velocity (Δx,Δy), ball height z (zero for players), one-hot entity type (home/away/ball). Players grouped by PFF FC positional metadata into four tactical roles: goalkeeper, defender, midfielder, forward. Within each team, edges connect adjacent tactical lines (goalkeeper↔defenders, defenders↔midfielders, midfielders↔forwards); the ball connects to all entities when present. Missing entities get sentinel coordinates (−2.0 normalized) and are excluded from message passing.
3. **Tracking backbone**: 20-layer DeepGCN using GIN layers (sum aggregation, ReLU, residual connections, layer normalization; 8-dim → 128-dim node embeddings); frame-level graph embedding via mean pooling; temporal MaxPool; 2-layer MLP classifier (hidden 256). Total **180K parameters**.
4. **Ablation sweep**: graph operators (GIN, GraphConv, EdgeConv, GATv2, GEN, GraphSAGE); connectivity (none, fully connected, distance r=15m, KNN k=8, ball-distance r=20m, ball-KNN k=8, positional); temporal aggregation (AvgPool, MaxPool, Attention, TCN, BiLSTM).

## 4. Equations & assumptions
The paper contains no numbered equations; stated formal objects (copied faithfully):
- Input: video XV = {It}^T_{t=1}; tracking XP = {St}^T_{t=1}, St = {s1t,...,sNt}; entity state sit ∈ R^D (position, identity one-hot, displacement).
- Classifier: fθ: X → Y, y ∈ Y (10 classes).
- Per-frame graph: Gt = (Vt, Et), Vt = {vt1,...,vtN}; node features 8-dim as above.
- Frame embeddings: zP_t ∈ R^{dP}; aggregated representation ẑ = ftemp(z1,...,zT); MLP(ẑ) → class logits via softmax.
Stated assumptions: (i) 4.5-second windows centered on event timestamps (non-causal — future work notes causal/past-only windows needed for online deployment); (ii) weighted sampling of 4,000/class/epoch fixes class imbalance; (iii) PFF FC role metadata treated as fixed labels (no dynamic role assignment — listed as future work); (iv) video results from single runs (compute constraints) while tracking reports mean±std over 5 seeds; (v) sentinel coordinates for missing ball/entity data.

## 5. Features / target
Inputs: synchronized broadcast video (720p frames) OR tracking states (2D positions, velocities, ball height, entity type, tactical role). Target: one of 10 football group-activity classes per 4.5-second event window. Metrics: balanced accuracy (= average per-class recall) and macro F1 (primary); 479× parameter ratio and 7× GPU-hour ratio as efficiency metrics.

## 6. Validation design
Identical training/evaluation protocols per modality: same event windows, same match-level splits, same imbalance handling (weighted sampling), same cross-entropy objective, same metrics. Video ablations: VideoMAE-B vs. VideoMAEv2-B × frozen vs. finetuned. Tracking ablations: 6 graph operators, 7 connectivity schemes, 5 temporal aggregators. Data-scaling study: 5/10/20/35/all training matches. Per-class confusion-matrix analysis on the test split (13,689 events).

## 7. Numerical results / baselines
- **Main result (Table 2)**: baseline tracking model (GIN + MaxPool + positional edges, 180K params, 4 GPU-hours on V100) achieves **77.8% balanced accuracy / 57.0% macro F1** vs. best video model (VideoMAEv2-B finetuned, 86.3M params, 28 GPU-hours) at 60.9% / 50.1%. Tracking wins by **+16.9 pp balanced accuracy, +6.9 pp macro F1, with 479× fewer parameters and 7× less training time**.
- Per-class (Figure 4): tracking better on 9/10 classes. Largest margins on spatially distinctive events: GOAL 73.3% vs 16.7% (+56.7 pp), HIGH PASS 83.3% vs 41.7% (+41.7 pp), TACKLE 54.0% vs 32.2%, OUT 94.2% vs 75.8%. Video slightly better only on HEADER (66.3% vs 65.2%). TACKLE hard for both (rapid localized two-player interaction). Both modalities confuse PASS↔FREE KICK (498 tracking / 470 video misclassifications of FREE KICK as PASS — similar spatial setup).
- Severe data-scarcity wins: on GOAL (30 test samples) and HIGH PASS (12 test samples), tracking learns discriminative features (73.3%/83.3% recall) where video collapses (16.7%/41.7%).
- Graph operators (Table 4): GIN 77.8±0.7% / 57.0±0.9% (lowest variance); GraphConv 76.3±1.1%; GraphSAGE 75.9±1.1% (2.3× params); GEN 72.8±3.0%; GATv2 61.8±5.4%; EdgeConv 55.6±12.1% — learned-adaptive edges *underperform* fixed tactical structure.
- Connectivity (Table 5): positional 77.8±0.7% / 57.0±0.9% beats fully connected 71.4±2.4%, no-edges 68.9±2.7%, ball-distance 68.6±1.0%, distance 68.0±1.1%, ball-KNN 67.0±0.9%, KNN 66.7±1.4%. No-edges ≈ geometric patterns: poorly chosen message passing adds nothing over independent node processing.
- Temporal aggregation (Table 6): MaxPool 77.8±0.7% / 57.0% best balanced accuracy; Attention 77.3/58.3% and TCN 75.5/58.4% yield slightly higher macro F1 with 2× params; BiLSTM (350K) worst at 75.3%.
- Data scaling (Figure 7): tracking reaches 67.0% with only 5 training matches; both modalities plateau around 35 matches (78.5% tracking vs 62.4% video); gap narrows from 25.4 pp (5 matches) to 16.1 pp (35 matches).
- Video ablations (Table 3): finetuning matters hugely — VideoMAE-B +20.6 pp (34.6→55.2%), VideoMAEv2-B +11.6 pp (49.3→60.9%). Parameter count alone explains nothing: frozen VideoMAE and VideoMAEv2 (both 86.3M) differ by 14.7 pp.

## 8. Code / data availability
Dataset + protocol + code: https://github.com/drishyakarki/pixels vs positions. Underlying raw data from PFF FC (now Gradients Sports) 2022 World Cup release — check licensing before commercial use.

## 9. Leakage & limitations
- **Non-causal windows**: 4.5-second windows centered on events include post-event frames — the model sees the future. Not deployable online without the causal re-framing the authors list as future work.
- **Severe imbalance**: PASS is 65.4%; balanced accuracy masks poor absolute F1 on rare classes (GOAL F1 only 47.0% tracking, 16.7% video).
- **Soccer, not football**: 11-a-side open-field sport; NFL has discrete plays, 11v11 in a compressed box, and far more contact — edge grammar needs redesign, not reuse.
- **Tracking quality**: PFF FC tracking is computer-vision extracted and manually refined — a luxury source; GSE's NGS replacement (nflverse-derived) won't have manual refinement, and the ball z-channel analog doesn't exist in 2D NGS.
- **No multimodal fusion**: only unimodal benchmarks; the complementary failure modes (e.g., HEADER) motivate fusion but none is tested.
- **Video single-run**: video results lack seed variance; tracking's win is large enough that this is unlikely to flip the headline, but ablations on video side are thin.

## 10. GSE overlap
**Direct hit on the NGS-replacement lane.** GSE's engine-benchmark lane (48-post @NextGenStats inventory, nflverse 2020–2025 corpus) is a tracking-data program, and ledger 0330 (CausalTraj) is a trajectory-forecasting model in the same lane — this paper answers the upstream question of *which modality to bet on* and gives the classification architecture: **positions beat pixels**. No GAR/play-classification model exists in the repo; this is new capability. It also reframes ledgers 0332 (FOOTPASS) and 0333 (UMEG-Net): those video pipelines are justified only where tracking doesn't exist; where positions exist (NGS), the positional graph should be the primary model and video the fallback. The tactical-role edge grammar is the portable insight — replace GK/DEF/MID/FWD with NFL position groups (OL, QB, skill, DL, LB, DB).

## 11. GSE implementation spec
1. **Data**: nflverse play-by-play 2020–2025 as labels; NGS-style 10 Hz player tracking windows (pre-snap → whistle) as the tracking modality, normalized to a canonical field frame. Play classes: run/pass/screen/play-action/RPO/penalty/sack (7–10 classes, mirrors the paper's 10).
2. **NFL role-aware graph**: nodes = 22 players + ball; node features = (x, y, vx, vy, speed, entity type one-hot offense/defense/ball, position-group one-hot). Edges: within-team edges between adjacent functional groups (OL↔QB, QB↔skill positions, DL↔LB↔DB), mirrored for defense; ball node connected to all; cross-team edges only between engaged pairs (or none — ablate per the paper's finding that no-edges ≈ bad-edges).
3. **Model**: 20-layer DeepGCN with GIN layers (residual + layer norm, per the paper), frame-level mean pooling, temporal MaxPool, 2-layer MLP head. Target: ~200K parameters, trainable on a single GPU in hours — cheap enough to re-run weekly.
4. **Causal constraint**: use past-only windows (pre-snap → event) from day one, not the paper's centered windows — online deployment requires it.
5. **Effort**: 3–4 weeks (data plumbing + graph port + ablations of edge grammar).

## 12. Reproducible test
Dataset: held-out NFL seasons (e.g., train 2020–2023, validate 2024, test 2025) with nflverse play labels and tracking windows. Metric: balanced accuracy and macro F1 over play classes, reported mean±std over 5 seeds (match the paper's protocol). Baselines: (a) no-edges GIN (independent node processing); (b) fully-connected edges; (c) a video-based classifier on broadcast clips of the same plays if available.

## 13. Acceptance / rejection gate
**Adopt** the NFL role-aware graph classifier as GSE's play-classification backbone only if it beats the no-edges baseline by ≥5 pp balanced accuracy AND the fully-connected baseline by ≥3 pp on held-out 2025 plays (reproducing the paper's positional-edge > geometric-edge finding in NFL data). **Reject** if positional edges show no advantage over fully-connected in NFL data (possible: the compressed box makes all players mutually relevant, diluting tactical-line structure) — in that case use the simpler fully-connected model and keep the parameter/efficiency win without the role grammar.

## 14. Improvement experiment
Go beyond the paper's *fixed* roles: learn dynamic role assignment jointly with GAR. Replace the paper's fixed PFF-FC role labels with a learnable assignment head that clusters players into K functional roles per frame from their motion context (QB dropback depth, receiver stem, box count), and make edge structure a function of assigned roles — then compare against the paper's static grammar. NFL motivation: pre-snap motion and formation shifts make roles fluid in ways soccer lineups don't. If dynamic roles beat static position-group edges, GSE gets a genuinely new result (the paper lists dynamic role assignment as its own future work); if not, the static grammar is validated and ships as-is.
