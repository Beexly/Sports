# 1032 — Cross-Block Fine-Grained Semantic Cascade for Skeleton-Based Sports Action Recognition (2404.19383)

## Citation / full-text source
Zhendong Liu, Haifeng Xia, Tong Guo, Libo Sun, Ming Shao, Siyu Xia, "Cross-Block Fine-Grained Semantic Cascade for Skeleton-Based Sports Action Recognition", FG 2024 (18th Int. Conf. on Automatic Face & Gesture Recognition). arXiv:2404.19383. Full text: export.arxiv.org/pdf/2404.19383 (10 pages, PDF parsed in full).

## Research question
GCN skeleton models classify from top-layer semantics only and lose the fine-grained, short-timescale joint changes decisive in sports actions (e.g., fencing sword tip at 150 m/s; fine distinctions like step-forward vs two-step-forward vs step-forward-lunge). Can a plug-and-play module that progressively cascades shallow-block features into deeper blocks (with per-level short temporal convolutions) improve skeleton-based fine-grained sports action classification on any GCN backbone?

## Dataset / schema
- **FD-7** (new): 1,193 fencing clips, 20 professional athletes (10F/10M, Nanjing Sport Institute), 1920×1080@30fps, 1–5 s clips, 7 classes: step forward 192 (154/38 train/val), two-step forward 188 (150/38), step backward 189 (152/37), thrust in place 114 (81/33), lunge in place 179 (134/45), step forward lunge 179 (129/50), sprint 152 (111/41). OpenPose 18 keypoints (x,y,confidence), T=150 (padded by replay). Train/val split by different athletes. Authors state public release.
- **FSD-10** (public): 1,484 figure-skating videos (2017–18 championships), 10 classes (2Axel, 3Axel, 3Loop, spins, sequences), 3–50 s, OpenPose 25 keypoints, T=1,500.

## Method
Cross-block Fine-grained Semantic Cascade (CFSC), inserted into a GCN backbone (tested on 2S-AGCN, CTR-GCN, HD-GCN; main results on HD-GCN [26]):
1. Select M blocks across depths (criteria: cover ≥2 of {shallow, medium, deep}; avoid adjacent blocks; moderate M). For HD-GCN: joint stream best {1,10}, bone stream best {4,7,10}.
2. For each level v: F_v = TC_v(f_v ⊕ λ·F_{v−1}) (Eq 2), where ⊕ = element-wise addition (won over avg/max/concat/multiply), TC_v = temporal convolution kernel (K_t,1) with stride aligning temporal dims, λ = weighting of prior-level features. Shallowest level: direct temporal convolution.
3. Deepest output F_M → channel-wise normalization F'_M = (F_M − F_mean)/F_std (Eq 3) → ReLU → auxiliary feature F_dis.
4. F_dis ⊕ f_10 (final block output), global average pooling, softmax classifier. Trained jointly with backbone; single-stream (no joint+bone fusion — fusion degraded results on fast actions).

## Equations / assumptions
- ST-GCN spatial conv: f_out = Σ_k W_k (f_in A_k) ⊙ M_k (Eq 1).
- Cascade: F_v = TC_v(f_v ⊕ λ·F_{v−1}) (Eq 2).
- Normalization: F'_M = (F_M − F_mean)/F_std (Eq 3).
- Assumptions: cross-block shallow features are complementary rather than redundant (enforced by block-spacing criteria); short temporal kernels capture sport-critical motion; single-stream avoids modality-mismatch in fast actions.

## Features / target
Features: skeleton sequences C×T×N (C=(x,y,z-confidence), T frames, N joints). Target: 7-class fencing action / 10-class skating action label.

## Validation
Top-1 accuracy, joint-input and bone-input separately; CFSC inserted vs backbone alone; λ ∈ [0.1,0.9] sweep; temporal kernel K_t ∈ {3,5,7,9,11}; block-set ablation; feature visualization of critical joints (holding hand, feet). Training: SGD Nesterov 0.9, wd 0.0004, cross-entropy, 90 epochs (5 warm-up), cosine LR 0.1→0.0001, batch 16, single RTX 3090.

## Exact results / baselines
- **FD-7:** HD-GCN joint 93.6→95.7 (+2.1), bone 98.2→99.6 (+1.4). CTR-GCN joint 79.3→91.1 (+11.8), bone 52.1→57.5 (+5.4). 2S-AGCN joint 61.8→78.2 (+16.4), bone 51.1→63.6 (+12.5).
- **FSD-10:** HD-GCN joint 85.9→88.2 (+2.3), bone 88.2→90.1 (+1.9). CTR-GCN joint 85.7→88.0 (+2.3), bone 87.1→89.4 (+2.3). 2S-AGCN joint 52.9→53.2, bone 80.7→84.0.
- **λ sweep:** joint stream peaks at λ=0.3, bone stream at λ=0.5; both initially rise then decline (too-small λ underuses fine detail; too-large disrupts high-level features). Auto-learned λ failed (joint 89.3, bone 94.6) — fixed λ required.
- **K_t:** joint best K_t=7 → 98.2%; bone best K_t=3 → 99.6% (bone degrades to 96.4 at K_t=11); confirms short kernels for fast sports motion.
- **Blocks:** joint {1,10} 97.9; bone {4,7,10} 99.6; 4-block set {1,4,7,10} worse (94.3/97.5) — redundancy.
- **Feature viz:** after CFSC, holding-hand response in step-forward-lunge right hand rose 0.099→0.279; foot responses strengthened in two-step-forward.

## Code / data
FD-7 promised public; no code URL in the paper. Rebuildable from HD-GCN implementation + Eq 1–3 module recipe.

## Leakage
FD-7 train/val split by athlete (no athlete overlap) — clean. No test-set leakage beyond the bone/joint stream selection ablations performed on validation (FD-7 has no separate test set; reported on val).

## Limitations
- FD-7 is lab-recorded standardized actions (not real bouts); FSD-10 has no standardized train/test protocol applied here (validation-only).
- Fusion of joint+bone hurt performance — the module trades away complementary streams.
- Gains on the strong HD-GCN backbone are modest (+1.4–2.3pp); the big jumps (+11–16pp) are on older weak backbones.
- No latency/FLOP analysis despite "plug-and-play" claim; multi-level temporal convs add cost.
- No cross-dataset transfer test (train fencing, test skating or vice versa).

## GSE overlap
Any skeleton-based fine-grained motion classification GSE runs — throwing mechanics, route-running technique, tackling form, swing analysis — sits on GCN backbones (ST-GCN family). CFSC is a small, backbone-agnostic accuracy lever: +2pp on a strong backbone for a few extra conv layers is cheap, and the λ-weighting / short-kernel / block-spacing ablations give a concrete tuning recipe.

## Implementation (GSE adaptation)
CFSC-GSE: bolt CFSC onto GSE's skeleton GCN for fine-grained technique classification (e.g., QB release types, RB juke variants). Use block set {shallow, mid, deep} per Table IV criteria; sweep λ ∈ [0.1,0.9] and K_t ∈ {3,5,7}; keep single-stream input; normalization Eq 3 + ReLU → auxiliary feature → element-wise addition with final block output.

## Reproducible test
GSE skeleton action set (any ≥5 fine-grained classes): train HD-GCN/ST-GCN baseline vs +CFSC with identical protocol; report top-1 delta on athlete-disjoint val split.

## Numeric gate
CFSC must deliver ≥+1.5pp top-1 on the strong-backbone setting (the paper's own minimum on HD-GCN was +1.4 on FD-7 bone; GSE bar = beat that on GSE data) with ≤10% inference-cost increase, else drop — the value proposition is "cheap +2pp," and anything less is not worth the module complexity.

## Improvement experiment
Learn a per-level λ_v (attention over cascade depths) instead of scalar λ; compare against fixed-λ on GSE data. Also test CFSC on 3D skeletons (paper used 2D OpenPose) to see if depth information reduces the bone-stream advantage.

## Verdict
ADAPT
