# [1868] Capturing Uncertainty in Human Motion for Representation Learning in Soccer (arXiv:2608.11203)

**Citation:** KTH Royal Institute of Technology / Electronic Arts (academic research collaboration) (2026). *Capturing Uncertainty in Human Motion for Representation Learning in Soccer*. arXiv:2608.11203. URL: https://arxiv.org/abs/2608.11203
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Discrete future-motion distribution learning (DDL) as a self-supervised conditioning module on top of frame-level motion prediction transfers directly to NFL player-movement embeddings: learn a codebook of "motion modes" (break, cut, tackle attempt) from unlabeled tracking and use the GTN representations for route/action tasks.

## 1. Research question
Can motion prediction serve as a self-supervised objective that yields reusable human-motion representations in a real sport (soccer), given two obstacles: (1) motion is stochastic/multimodal (deterministic regression learns averaged futures), (2) sequence-level prediction gives no frame-level supervision for event-spotting tasks?

## 2. Dataset / schema
- **WorldPose** (FIFA World Cup 2022 [30], repurposed from pose estimation): ~11.4 h of player tracking from 8 matches; BRA–KOR held out → 9.5 h train / 1.9 h test. Interpolated to 25 Hz; N=50 observed frames, T=10 predicted frames.
- **ProSoccer**: proprietary commercial soccer player tracking, "substantially larger" than WorldPose.
- **WorldPoseAR**: 8-class soccer action recognition (7 off-ball movements + 1 ball-kicking), 50-frame samples, class-balanced val/test, constructed from WorldPose.
- **SoccerAR**: in-house 35-class action benchmark (on-ball + off-ball), 50-frame samples.
- **Shot spotting**: in-house, 15k+ 50-frame samples, ~balanced positive/negative; positive samples label the shooting frame 1, others 0.
Schema: 3D skeleton sequences X_{1:N}, x_t ∈ R^{J×3} (J joints).

## 3. Method / model
**Graph construction:** spatio-temporal graph, joints-as-nodes; edges: (a) semantic skeletal (bones) within frame; (b) directed temporal edges (same joint across consecutive frames, past→future, no leakage); (c) an abstract player node per frame connected to all joints of that frame; player nodes temporally connected to all future player nodes. Any two nodes ≤ 3 hops apart. Node features: 3D joint coordinates + learnable joint-type embedding; edge features: connection type + geometric distance.
**Backbone:** Graph Transformer Network (GTN), causal graph → representations encode only past information.
**DDL (discrete distribution learning):** codebook = KD-tree partition of the 3D joint-motion space at fixed future offset t_f=5 into K balanced regions (recursive median splits on highest-variance dimension of the most populated region → near-uniform code usage); each code = a 3D joint displacement; a J-joint skeleton is encoded by J codes (combinatorial space K^J). Per node: p_u = softmax(proj(MLP_code(h_u^(L)))/τ), τ=1; sampled code embedding (argmax at inference) concatenated with node rep → MLP_fuse → W_p predicts T×3 joint motion. Weight tying: code embedding matrix E tied to the classification projection to prevent collapse. Ground-truth codes via KD-tree traversal supervise a cross-entropy loss.
**Training objective:** L = L_motion (MSE on predicted motion) + α·L_code (cross-entropy on code prediction).
**Downstream adaptation:** fine-tune GTN backbone only (DDL dropped) + lightweight head: mean-pooled graph rep → linear classifier (action recognition, cross-entropy); per-frame player-node rep → linear + sigmoid (shot spotting, BCE; shooting frame = temporal peak above threshold).

## 4. Equations & assumptions
- X_{1:N} = {x_t}_{t=1}^N, x_t ∈ R^{J×3}; per frame t, predict X̂_{t+1:t+T} from X_{1:t}.
- p_u = softmax(proj(MLP_code(h_u^(L)))/τ); h_u^fused = MLP_fuse([h_u^(L) ∥ e_{c_u}]); m̂_{u,1:T} = W_p h_u^fused.
- L = L_motion + α·L_code.
- Assumptions: future motion is adequate self-supervision (no manual labels needed); a fixed-offset (t_f=5) discretization at one horizon yields a representation useful at all horizons; codebook built from training-set motion samples is representative; fine-grained (joint-level, frame-level) supervision beats sequence-level for downstream transfer.

## 5. Features / target
Inputs: 3D joint coordinates + joint-type embeddings on the spatio-temporal graph. SSL targets: (a) T=10 future frames per joint at every frame (MSE), (b) discrete motion code at t_f=5 per joint (cross-entropy). Downstream: action class (sequence), shooting-frame confidence (frame).

## 6. Validation design
- **Motion prediction:** MPJPE (lower better) at 80–1000 ms, autoregressive beyond the 10-frame window; 6 prior baselines (incl. HisRep, the strongest) + Zero (repeat-last-frame) baseline; WorldPose + ProSoccer; ablations: DDL vs direct regression of the same target, frame-level vs sequence-level supervision, joint-level vs skeleton-level codebook, target step t_f 1–10, codebook size K 16–512, weight tying / nonlinear code prediction / training-time sampling.
- **Action recognition:** accuracy, mean±std over 3 seeds; baselines ST-GCN, CTR-GCN, BlockGCN, GTN-from-scratch, MAMP (self-supervised).
- **Shot spotting:** Average-AP over δ ∈ {0,…,10} frames (SoccerNet protocol); same baselines.
- Speed-robustness: test grouped by motion speed (0.5 m/s bins up to >5 m/s) vs HisRep.

## 7. Numerical results / baselines
- Motion prediction: GTN backbone alone beats all 6 baselines on both datasets; GTN+DDL improves further at short and long horizons; gains persist beyond the 10-frame window under autoregressive rollout → representation-quality effect, not horizon bias.
- Speed robustness: HisRep error grows rapidly with speed; GTN+DDL error grows "significantly slower," winning by increasing margins at high speeds.
- Action recognition: GTN+DDL pretrained → 96.21±0.29% (WorldPoseAR), 64.15±0.47% (SoccerAR) — best in both, "substantially" above baselines incl. MAMP; GTN-from-scratch substantially lower; plain-GTN pretraining below DDL.
- Shot spotting: GTN+DDL → Average-AP 0.9274±0.0030, best; large gap over random init.
- Ablations: DDL > regression on identical target; frame-level + joint-level both needed; t_f=5 balances short/long-term (t_f=2 better short, worse long); K improves 16→512, plateaus beyond; nonlinear code prediction + weight tying help; training-time sampling has limited impact.

## 8. Code / data availability
WorldPose is public (FIFA 2022); ProSoccer proprietary (EA). No code link stated in extracted text; implementation details in appendices.

## 9. Leakage & limitations
- Single-player motions only — no ball, teammates, opponents, or game context (authors flag this as future work); the "interactions" that matter in football are absent.
- BRA–KOR is the only held-out match in WorldPose (1.9 h) — thin public test data; most scale claims rest on proprietary ProSoccer.
- Appendices (A–K: node/edge features, GTN details, codebook algorithm, hyperparameters, baseline details, Average-AP computation, extra ablations) not extracted from HTML — exact K, α, learning rates not verified.
- Action-recognition gains partly reflect in-domain fine-tuning on the same sport; cross-sport transfer untested.

## 10. GSE overlap
Most direct sports analog in this lane so far: same input family (player tracking at high frequency), same downstream family (action recognition ≈ play-concept classification; shot spotting ≈ frame-level event detection like snap/throw/tackle frames). NEW capability vs 1862–1867: an uncertainty-aware SSL objective — NFL player motion is multimodal (a WR's stem admits several breaks), and deterministic predictors average them; DDL's codebook learns the modes explicitly. The per-frame player-node design maps to per-player, per-frame embeddings GSE could use for route-running style or defender-reaction features.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; derive per-player pose proxies (position, velocity, acceleration, orientation) or use raw kinematics as the "skeleton" (J pseudo-joints = body keypoints if pose estimation available, else kinematic channels).
2. Build per-player spatio-temporal graphs (kinematic temporal edges + a player node per frame); train GTN + DDL with t_f offset matched to football timing (e.g., 5 frames = 0.5 s), K ≈ 256–512 codes.
3. Downstream heads: (a) sequence-level: route-family / play-concept classification from pooled player reps; (b) frame-level: catch-point / tackle-frame / throw-frame spotting from player-node reps.
4. Effort: ~3 engineer-weeks (graph construction + DDL harness; GTN from standard graph-transformer implementations).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Test A: motion prediction MPJPE at 0.5 s and 1.0 s, GTN+DDL vs GTN-only vs repeat-last-frame, grouped by player speed. Test B: frozen GTN reps + linear head for route-family classification on charted routes (FTN charting as labels), pretrained vs from-scratch. Run target: <72h on 1–2 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) GTN+DDL motion-prediction error ≥ 10% lower than GTN-only at the 1.0 s horizon on held-out weeks, AND (b) pretrained reps beat from-scratch by ≥ 5pp accuracy on route-family classification. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) add the missing multi-agent context — edges from each player node to the ball node and nearest opponents/teammates, plus a ball-possession flag; test whether interaction edges improve tackle-frame spotting where single-player motion is insufficient. (2) Learn the codebook jointly across offensive positions (WR, RB, TE) vs position-specific codebooks, testing whether a shared "football motion vocabulary" transfers better to low-sample positions (e.g., FB). Hypothesis: shared codebook with position-conditioned prediction heads wins on few-shot positions.
