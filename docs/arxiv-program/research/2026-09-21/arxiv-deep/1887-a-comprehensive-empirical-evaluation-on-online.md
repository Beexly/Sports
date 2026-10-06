# [1887] A Comprehensive Empirical Evaluation on Online Continual Learning (arXiv:2308.10328)

**Citation:** Albin Soutif–Cormerais, Antonio Carta, Andrea Cossu, Julio Hurtado, Hamed Hemati, Vincenzo Lomonaco, Joost Van de Weijer (2023). *A Comprehensive Empirical Evaluation on Online Continual Learning*. arXiv:2308.10328v3. URL: https://arxiv.org/abs/2308.10328
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the vision benchmarks don't transfer, but two things do and both are valuable: (1) a 5-metric evaluation discipline (worst-case accuracy, anytime accuracy, probed representation quality, cumulative forgetting) that fixes how GSE should score any weekly online-update policy, and (2) the "properly tuned plain experience replay beats most fancy methods" baseline rule.

## 1. Research question
Online continual learning (OCL) — learning from each arriving mini-batch of a non-stationary stream with tiny memory and anytime-inference requirements — has many proposed methods but evaluations that only report final accuracy and forgetting. Which of 9 rehearsal-based OCL methods actually works, once you also measure stability *during* training and representation quality? Answer: no method wins everywhere; properly tuned basic experience replay (ER) is competitive with or better than most; the field's methods mostly suffer from underfitting, not forgetting.

## 2. Dataset / schema
Split-CIFAR100 (20 tasks, 5 classes each) and Split-TinyImageNet (20 tasks, 10 classes each), class-incremental image classification. Protocol: batch size 10 new + 10 from replay buffer per step (SCR samples 118 from memory); 3 training passes per mini-batch (CIFAR100), 9 (TinyImageNet); memory 2000 (CIFAR100) / 4000 (TinyImageNet), plus 500/8000 ablations on CIFAR100; random crop + horizontal flip augmentation; 5 seeds; Avalanche framework. An i.i.d.-stream reference (same ER methodology on shuffled data) is included.

## 3. Method / model
Benchmark of 9 methods (Table 1): AGEM (modified update, 2018), ER (plain replay, 2019), ER+LwF (distillation loss), ER-ACE (modified cross-entropy, 2021), MIR (maximally-interfered sampling), SCR (contrastive loss + nearest-class-mean classifier), RAR (adversarial augmentations, 2022), DER++ (logits distillation), GDumb (retrain-from-buffer before each inference — no anytime inference, but a strong reference). All follow one replay pseudocode (Figure 1): sample buffer, augment, multi-pass SGD, update reservoir memory. Five metrics (§4): final average accuracy; forgetting (classical + cumulative/backward-transfer); **Worst-Case Accuracy** WC-ACC_t = (1/k)A(E_k,f_t) + (1−1/k)·min-ACC_{T_k} (Eqs. 1–2); **Average Anytime Accuracy** AAA_t = (1/t)Σ_j (1/k)Σ_i A(E_i,f_j) (Eq. 3); probed accuracy (linear probe on frozen representations = representation quality).

## 4. Equations & assumptions
- WC-ACC_t = (1/k)·A(E_k, f_t) + (1 − 1/k)·min-ACC_{T_k}; min-ACC_{T_k} = (1/(k−1))·Σ_{i=1}^{k−1} min_{|T_k|<n≤t} A(E_i, f_n). (Eqs. 1–2)
- AAA_t = (1/t)·Σ_{j=1}^{t} (1/k)·Σ_{i=1}^{k} A(E_i, f_j). (Eq. 3)
- Average accuracy AA = (1/k)·Σ_i A(E_i, f_t); average forgetting per standard CL definition.
Assumptions: class-incremental tasks with implicit boundaries; fixed small memory; anytime inference required (disqualifies GDumb as a deployment method); multiple passes per mini-batch justified by prior theory.

## 5. Features / target
Inputs: 32×32 (CIFAR100) / 64×64 (TinyImageNet) images. Target: image class labels, learned incrementally 5–10 classes at a time.

## 6. Validation design
Continual evaluation after every mini-batch (not just task boundaries), per recent OCL protocol. Baselines: each method vs the other 8, vs vanilla ER, vs the i.i.d. reference. Metrics: the 5 above, mean ± std over 5 seeds (Table 2). Memory-size ablations (500/2000/8000). Significance of method differences assessed via the reported stds; no single winner claimed.

## 7. Numerical results / baselines
- **No best method across metrics or memory sizes** (Table 2). Final accuracies cluster: most methods within ~5% of the i.i.d. reference; ER+LwF best on CIFAR100 by a tiny margin; ER-ACE best on TinyImageNet; RAR and SCR underperform on TinyImageNet; AGEM is the clear loser.
- **Stability ≠ accuracy:** MIR beats SCR by 1% final accuracy on CIFAR100 but SCR beats MIR by ~9% on WC-Acc. AAA moderately correlates with WC-Acc but they can diverge (low WC-Acc with high AAA possible).
- **Representation quality ≈ i.i.d.:** probed accuracy 45.8% (CIFAR100) / 34.3% (TinyImageNet) — essentially the i.i.d. reference level, and ER has the *best* probed accuracy despite below-average stability. Conclusion (paper): the classifier head, not the representation, is the main failure — "learning a good classifier is one of main problems."
- **Underfitting, not forgetting:** classical forgetting rises across the stream (paper: misleading in class-incremental — task difficulty grows), while cumulative forgetting shows steady *backward transfer*; the authors attribute gains to underfitted networks (few iterations per batch) and **advise against using classical forgetting in class-incremental settings**.
- Memory ablations (500/8000): same conclusions; even 5 samples/class suffices for decent representation strength (probed gap only 1%→2%).

## 8. Code / data availability
Code: https://github.com/AlbinSou/ocl_survey (modular, Avalanche-based). Datasets: standard CIFAR100/TinyImageNet splits.

## 9. Leakage & limitations
- Class-incremental *vision* with explicit task structure is far from NFL weekly tabular data: no new "classes" arrive, features are tabular, batches are 16 games not 10 images, and passes-per-batch is meaningless for GBMs.
- All methods are deep nets with SGD; nothing here validates replay/regularization for tree ensembles (GSE's actual models).
- The "tuned ER wins" result depends on the authors' tuning (batch composition, passes); a different tuning budget could reorder the ranking — the honest reading is "don't assume fancy beats simple," not "ER is optimal."
- WC-Acc's min-ACC term is expensive to track (requires evaluating on all past tasks every step) — fine for benchmarks, needs a cheap approximation for weekly NFL use.
- GDumb's strong performance is a red flag for the whole framing: if retraining from scratch on a buffer matches online methods, the "online" constraint may be buying little — directly relevant to GSE's refit-vs-update choice.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This paper is the *evaluation methodology* complement to the lane's detector papers (1882–1885): those decide *when* to update; this tells us *how to score* the update policy. The AGENTS.md benchmark inventory has no online-update evaluation protocol.

## 11. GSE implementation spec
- **Adopt the metric suite for any GSE online-update experiment** (weekly refit windows, weighted forgetting, TabPFN contexts from 1886): report (a) final-season Brier, (b) **worst-week Brier** (WC-Acc analog: min over trailing-4-week windows — cheap to track, no per-task eval needed), (c) **anytime Brier** (AAA analog: mean Brier over all weeks, so a policy can't hide a bad month behind a good finish), (d) **forgetting of early-season patterns** (Brier on weeks 1–4 evaluated with the end-of-season model — the cumulative-forgetting analog; if it collapses, the policy overfits recency).
- **Baseline rule:** any proposed online-update scheme (weighted refits, EWC-style regularization, replay buffers) must first beat *plain experience replay*: refit the GBM on trailing-N-weeks + reservoir sample of older weeks, properly tuned (N ∈ {4, 8, 17}). Per the paper, fancy methods usually lose to this — enforce it as the null hypothesis.
- **Classifier-head lesson:** if GSE ever trains a neural model online, freeze the representation and only update the head (the paper's probed-accuracy result says the head is where forgetting lives).
- **Underfitting warning:** with 16-game weekly batches, online gradient-style updates will underfit — prefer full refits on windows over incremental steps.

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target. Protocol: walk-forward 2020–2025 comparing three update policies — (P1) frozen 2019 model, (P2) plain replay (refit weekly on trailing 8 weeks + 10% reservoir of older weeks), (P3) any challenger (e.g., EWC-regularized or weighted-forgetting refit). Metrics per §11: final Brier, worst-4-week Brier, anytime (mean weekly) Brier, early-season forgetting (weeks 1–4 Brier under the final model). The challenger must beat P2 on at least 3 of 4 metrics; P2 must beat P1 on anytime Brier by ≥0.002 to justify updating at all.

## 13. Acceptance / rejection gate
ADOPT the 4-metric evaluation suite as the standard for all future GSE online-update experiments if the 2020–2025 walk-forward shows the metrics disagree with final-Brier-only ranking on at least one policy pair (i.e., the extra metrics change a decision) — otherwise the suite is decorative and rejected. ADOPT plain replay (P2) as the standing update-policy baseline if it beats the frozen model on anytime Brier by ≥0.002 with worst-week Brier no worse than +0.003; the challenger policy is adopted only if it beats P2 on ≥3 of 4 metrics. REJECT any update policy that wins final Brier but loses worst-week Brier by >0.005 (unstable champion).

## 14. Improvement experiment
GDumb's lesson applied to NFL: once a season, retrain the win-prob model *from scratch on a balanced buffer* (equal games per season, 2015–present, class-balanced by spread band) and compare against the weekly-refit champion on the 4-metric suite. Hypothesis: the from-scratch balanced retrain matches or beats incremental refits on worst-week Brier (it can't overfit recency by construction) — if true, GSE's "update policy" simplifies to "weekly lightweight refit + annual balanced retrain," and the whole online-CL machinery is unnecessary overhead.
