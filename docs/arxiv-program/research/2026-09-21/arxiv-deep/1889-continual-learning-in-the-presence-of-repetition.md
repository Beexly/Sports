# [1889] Continual Learning in the Presence of Repetition (arXiv:2405.04101)

**Citation:** Tyler L. Hayes et al. (2024). *Continual Learning in the Presence of Repetition*. arXiv:2405.04101v2. URL: https://arxiv.org/abs/2405.04101
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a challenge-report paper, not a method paper, but it carries the single most NFL-relevant structural insight in the lane: real streams have *repetition* (classes re-occur), and under repetition the winning architecture flips — frozen per-experience expert ensembles crush replay methods, while without repetition replay wins. NFL data is repetition-heavy (divisional rematches, recurring schemes, repeated QB-coach pairings), so GSE's update architecture should exploit repetition with frozen experts rather than fight forgetting in one monolith.

## 1. Research question
Standard CL benchmarks assume each class appears in exactly one experience; real streams re-show old classes. The CLVision CVPR-2023 challenge built class-incremental-with-repetition (CIR) streams for CIFAR-100 (repetition probability parameter interpolates from standard class-IL to cumulative re-occurrence) and asked: which strategies exploit repetition best? Three finalist solutions are reported in depth. Finding: ensemble-based solutions with multiple frozen modules trained on different-but-overlapping class subsets dominate under repetition — and the ranking *inverts* when repetition is removed.

## 2. Dataset / schema
CIFAR-100 CIR streams (pre-selection S1–S3; final S4–S6 with different repetition configs), plus Tiny-ImageNet CIR generalization streams; ablations on standard no-repetition CIFAR-100 (20 experiences × 5 classes). Constraints: 1 GPU, 500 min training cap, no pretrained models, no experience-ID at test time. Test: unseen samples of all stream classes after full stream training.

## 3. Method / model
- **HAT-CIR (team xduan7, winner):** each new experience adds a "fragment" of network replicas trained in two phases — (1) supervised contrastive loss (SupCon) on a projection head, (2) cross-entropy on a softmax head — plus Hard Attention to the Task (HAT) masking; fragments then frozen. Multiple ensemble replicas per experience (different inits/augmentations), predictions averaged. Final config: 50 fragments + 2 ensembles. HAT partitioning used only in pre-selection; final phase used replicas alone (faster, better).
- **Horde (team mmasana):** ensemble of feature extractors, each an expert trained on *one selected experience* (experiences with ≥5 classes; stop adding after 85% of classes seen; always train on experience 1), then frozen → zero-forgetting. Unified head over all classes learned via pseudo-feature projection (mean + std) aligning FEs that never saw a class, with cross-entropy + metric-learning loss balanced by adaptive alpha.
- **DWGRNet (team pddbend):** DER-style dynamic architecture — new branch per experience, trained then frozen; open-set treatment at inference: each branch first judged on whether the sample is OOD for it (mask or weight by OOD score), killing DER's overconfident-unseen-class problem. Reliability weighting: ensemble_logit_k = max_{i∈M}(logit_{i,k}/entropy_{i,k} · N_C^{(i)} · feature_norm_{i,k}) — branches that saw more classes count more.

## 4. Equations & assumptions
- DWGRNet ensemble logit: ensemble_logit_k = max_{i ∈ M} (logit_{i,k} / entropy_{i,k} · N_C^{(i)} · feature_norm_{i,k}). (Eq. in §5)
- Repetition model: after first occurrence, each class re-appears per experience with fixed per-class repetition probability (interpolates standard → cumulative class-IL).
Assumptions: no pretrained backbones; test-time experience-ID forbidden (class-IL, not task-IL); frozen = zero forgetting by construction; ensemble cost acceptable at inference.

## 5. Features / target
Inputs: 32×32 CIFAR-100 / 64×64 Tiny-ImageNet images. Target: class labels across repeated experiences.

## 6. Validation design
Pre-selection: 3 streams, mean test accuracy. Final: 5 teams' code re-run on 3 *new* streams (S4–S6); metric = average accuracy after each stream. Baselines re-run identically: Naive, EWC, LwF, ER (buffers 200/2000), Joint (upper bound). Two extra experiments: (a) no-repetition CIFAR-100 (20×5), (b) Tiny-ImageNet CIR streams (generalization).

## 7. Numerical results / baselines
- **Final phase (Table 2):** xduan7/HAT-CIR **62.75%** avg (63.64/68.04/56.57), linzz 45.02, mmasana/Horde 41.11, pddbend/DWGRNet 40.91 — vs ER-2000 **21.91%**, Naive 7.83, Joint **65.12%** (upper bound). The winner nearly reaches the joint-training ceiling.
- **No-repetition inversion (Table 3):** xduan7 drops to 24.30, mmasana 3.39, pddbend 7.59 — while **ER-2000 at 25.35 beats all finalists**. The paper's headline lesson: repetition changes which strategy wins; the finalists overfit the repetition structure.
- Tiny-ImageNet CIR: finalists generalize (results consistent; details in §6.3.2).
- Pre-selection (Table 1): pddbend 44.77, linzz 44.08, shelley 42.53, xduan7 41.37, mmasana 40.52 — final-phase tuning (xduan7 dropping HAT, adding replicas) flipped the order.

## 8. Code / data availability
xduan7: https://github.com/xduan7/clvis-chlg-2023/ ; mmasana: https://github.com/mmasana/clvision-chlg-2023/ . Challenge DevKit with stream generators public (linked in §2).

## 9. Leakage & limitations
- It's a competition report on CIFAR vision: architectures, HAT masks, SupCon heads don't port to tabular GBMs; only the *ensemble-of-frozen-experts* pattern ports.
- The finalists' dominance is repetition-specific — they collapse without it (mmasana 41.11 → 3.39). Any GSE adaptation inherits this fragility: if the NFL's repetition structure shifts (e.g., schedule realignment, rule changes), frozen experts go stale silently.
- Frozen experts grow the model count unboundedly (50 fragments); the paper's heuristics (≥5 classes, stop at 85%) are ad hoc.
- linzz (2nd place, 45.02) didn't contribute to the report — its method is unknown, so the comparison set is incomplete.
- shelley was disqualified for rule violation — a reminder that challenge numbers reflect rule-fitting, not general truth.
- No pretrained models allowed — unrealistic for GSE, which can and should use them.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This complements 1887/1888 directly: those optimize a *single* updating model; this paper says that under repetition, the better architecture is *many frozen specialists + one live head*. It also sharpens the 1887 evaluation point — any CL strategy must be tested under NFL-realistic repetition, since strategy rankings invert with repetition structure.

## 11. GSE implementation spec
- **Frozen-expert ensemble over one forgetting monolith:** NFL's stream is repetition-rich — divisional rematches (each pair meets twice), recurring coaching trees, repeated QB-vs-DC matchups. Architecture: keep the live weekly-refit model (1888's interference-scored replay) as the "current experience" expert, but also maintain a bank of *frozen* specialist models: one per division (8), each trained only on that division's games through the prior season and frozen; plus one frozen "rivalry/rematch" model trained on second-meetings. At inference, gate by OOD logic (DWGRNet's idea): each expert reports a confidence/OOD score for the matchup (distance of the game's features from the expert's training distribution); final probability = reliability-weighted average, live model weighted by recency.
- **Cheap first step:** before building 8 division experts, test the core claim — compare (a) one weekly-refit monolith vs (b) monolith + frozen prior-season model (2-model ensemble, OOD-gated) on 2020–2025 walk-forward. If (b) wins, scale to the division bank.
- **Repetition-aware evaluation:** add a "rematch split" to the 1887 metric suite — report Brier separately on second-meetings vs first-meetings; the expert ensemble should win specifically on rematches (that's where repetition lives).

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target; walk-forward 2020–2025. Arms: (A) weekly-refit monolith (1888 P3), (B) A + frozen prior-season expert with OOD gating, (C) B + 8 frozen division experts (Horde-style, trained on prior-season division games, frozen). Metrics: 1887's 4-metric suite + rematch-split Brier. Gate: (C) must beat (A) on ≥3 of 4 metrics AND on rematch Brier by ≥0.003; (B) is the fallback if (C)'s complexity doesn't pay. Also run the no-repetition sanity check: evaluate all arms on a shuffled-season control (games permuted across weeks within season) — if the ensemble's edge vanishes there, the gain is genuinely repetition-driven, not just ensembling.

## 13. Acceptance / rejection gate
ADOPT the frozen-expert ensemble if on 2020–2025 walk-forward it beats the monolith on ≥3 of the 4 metrics from 1887 with rematch-split Brier improving by ≥0.003 and no metric degrading by >0.001. ADOPT the 2-model version (B) alone if it captures ≥70% of (C)'s rematch gain at a fraction of the serving cost. REJECT the division bank if the shuffled-season control shows the same gains (then it's generic ensembling, not repetition exploitation — buy the gain cheaper with a plain model ensemble). Sunset rule: any frozen expert older than 2 seasons is retired unless it still wins its division split — repetition structures decay.

## 14. Improvement experiment
Make the experts *generative of repetition*: instead of hand-defining divisions, learn the repetition structure — cluster historical games by matchup-embedding similarity (team-pair, coaching-tree, scheme tags) and train one frozen expert per cluster, with cluster assignment refreshed each offseason. Hypothesis: learned repetition clusters (e.g., "Shanahan-tree vs Cover-3 teams") beat hand-built division experts on rematch Brier, because the true repeating unit in the NFL is the scheme matchup, not the division. Test: compare cluster-experts vs division-experts on 2023–2025 rematch games.
