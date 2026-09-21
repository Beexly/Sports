# [0302] Play Like Champions: Counterfactual Feedback Generation in Latent Space (arXiv:2607.00190)

**Citation:** Andrzej Białecki, Adam Mastalerz, Han Zhou (2026). *Play Like Champions: Counterfactual Feedback Generation in Latent Space*. arXiv:2607.00190v1. URL: https://arxiv.org/abs/2607.00190
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 4,109 lines).
**Verdict:** REJECT — StarCraft II esports coaching paper; macro-economic replay features and pro-tournament data have no NFL transfer path into GSE's engine. The counterfactual-recourse machinery is documented in §14 as interpretability inspiration only.

## 1. Research question
In StarCraft II, can we generate actionable "play like a champion" feedback for amateur players: given an amateur replay, produce a counterfactual trajectory in a learned latent space that shows which *macro-economic* changes would raise the predicted win probability to a target level (e.g., 0.9), using a guided VAE + classifier and several latent-path traversal algorithms? (Abstract; Sec. 1)

## 2. Dataset / schema
- **SC2EGSet** [0] (public, https://huggingface.co/datasets/Kaszanas/SC2EGSet): 23,476 replay files (Jan 2021–Jul 2024), professional tournaments + showmatches, all races and matchups, parsed with SC2InfoExtractorGo. Final splits after filtering: train 18,780 / validation 2,347 / test 2,178 (random 80/10/10 — **not temporal**). Separate amateur OOD set: 2,178 replays from unreleased sc2replaystats data.
- **Features:** 196 per player, tensor 2×196: three game windows × 39 per-player/per-window attributes + 39 final-economy attributes + 39 economy-change attributes + supply-capped percentage. Game versions and races are **omitted** (explicit modeling simplification; races retained only for interpretation).
- **Access:** public code (anonymous 4open: https://anonymous.4open.science/r/SC2_LatentTrainer-1E5B/) and public dataset.

## 3. Method / model
- **Guided VAE:** encoder [32, 16], latent dim 16 with **four supervised dimensions**, decoder symmetric; λ_cls = 1.2824, lr = 1.7725e-4, weight decay 1.3597e-5; log-variance clamped to [−20, 2]. Supervised guidance: a win-probability classifier (binary cross-entropy, lr = 4.1398e-4, wd = 4.55e-6) backpropagates through the latent dimensions. Unsupervised baseline: vanilla VAE + LightGBM.
- **Latent path traversals** from amateur z_amateur to pro distribution: (1) linear centroid path (toward pro-class centroid); (2) linear kNN path; (3) iterative optimal transport (Wasserstein-2 barycentric projection); (4) KDE-regularized gradient ascent (Adam, log-likelihood penalty + L1 on non-supervised dims); (5) neural OT via flow matching (conditional FM with UNet, velocity fields, Sinkhorn transport plan, 20 discretization steps, 20 epochs training).
- **Feedback extraction:** three framings of the latent path — raw change (z_target − z_amateur decoded), minimum viable change (stop at first crossing of P(win) ≥ 0.5), and win-probability-weighted change (accumulate Δ decoded features weighted by Δ predicted win probability along the path).
- **Feature interpretation:** KDE distributions per feature (Gaussian kernel, Silverman bandwidth) for amateurs vs pros; gradient-based attribution on supervised latent dims.

## 4. Equations & assumptions
- VAE ELBO with classifier-guided latent regularization; WinP(y=1|z) = σ(w^T z + b) on supervised dims; path success = fraction of amateurs whose decoded counterfactual trajectory crosses the 0.5 win-probability threshold while staying on-manifold (KDE likelihood, max latent norm, monotonicity constraints).
- Assumptions stated: replay outcomes are valid win/loss labels; game-version/race omission is acceptable; the classifier's win probability is a valid target for recourse; decoded counterfactuals correspond to achievable play changes (the paper's own Sec. 5 flags this as unverified).

## 5. Features / target
- **Inputs:** 196-dim per-player macro-economic tensors (resources collected/spent, army value, supply, production — three windows + final + change).
- **Targets:** win/loss label; counterfactual path raising amateur win probability to target.

## 6. Validation design
- **Model quality:** normalized MSE, accuracy, ROC-AUC, F1, Brier score on SC2EG test and the amateur OOD set.
- **Path quality:** success rate (crossing 0.5), crossover α (fraction along path where crossing occurs), AUC of win-probability along path, monotonicity, path KDE (on-manifold-ness), max latent norm, nearest-pro-win distance.
- **Sanity checks:** reconstructed amateur z preserves loss rate (~80–90% losses on amateur set — the classifier is not trivially optimistic); decoded amateur counterfactuals keep plausible macro features.

## 7. Numerical results / baselines
Guided VAE (test / OOD): normalized MSE 0.5830 / 1.6619; accuracy 98.76% / 97.11%; ROC-AUC 0.9991 / 0.9926; F1 0.9881 / 0.9714; Brier 0.0090 / 0.0229. (Original MSE 430095.6 / 519342.7; KL 7.3601 / 7.6009.)
Path success (test / OOD): linear centroid 0.834 / 0.715; linear kNN 0.845 / 0.543; OT 0.837 / 0.720; neural flow 0.931 / 0.731; gradient ascent 1.000 / 0.998 — but gradient ascent is **off-manifold**: path KDE −4.63±1.40 vs OT −2.80±0.50; max ‖z‖ 3.95±1.74 vs 2.03±0.58; monotonicity 0.727±0.227 vs 0.998±0.041; nearest-pro-win 0.15±0.12 vs 0.06±0.04. OT has earliest crossover (0.120±0.065 test, 0.140±0.084 OOD) and near-perfect monotonicity — the paper's preferred method balances success with staying on the pro manifold.

## 8. Code / data availability
Code: https://anonymous.4open.science/r/SC2_LatentTrainer-1E5B/ (anonymous 4open; not verified live). Data: SC2EGSet on Hugging Face (public). Compute: single-GPU-scale (VAE + flow matching on ~19k samples); no stated cluster.

## 9. Leakage & limitations
- **My adversarial notes:** (a) The 80/10/10 split is **random, not temporal** — replays from the same tournaments/patches appear in train and test; the 0.9991 ROC-AUC smells of within-era memorization, and the OOD amateur set only partially addresses this. (b) Pro tournament selection bias: the "champion" manifold is conditioned on who gets invited to tournaments. (c) Race and game-version omission: in SC2, balance patches change the meaning of macro features — pooling four years of patches is a real confound. (d) Counterfactuals are associational, not causal: raising "resources collected" in latent space does not tell a player *how* to collect more — the actionability claim is unverified with human players (no user study). (e) Gradient ascent's perfect success rate is an artifact of leaving the manifold — the paper is honest about this, and it is the most important result for anyone porting the method. (f) 196 features are hand-built macro aggregates — the method's success rides the feature engineering, not the latent machinery.

## 10. GSE overlap
No overlap. The existing-research-map has no esports, no latent-space counterfactual, and no algorithmic-recourse lane. The optimal-transport machinery touches gap #5 (optimal transport) only in name — the map's OT gap is about distributional modeling of sports outcomes, not latent path traversal. No duplication.

## 11. GSE implementation spec
Not applicable — no implementation recommended. The only portable idea is the **counterfactual-recourse framing for model interpretability**: given a trained game-outcome model, find minimal on-manifold feature changes that flip a prediction ("what would need to change for this underdog to cover"). But GSE's features are game-level (team strength, matchup, market), not player-controllable actions, so the "feedback" framing has no consumer — it would be content copy ("the model says X needs Y"), not a product.

## 12. Reproducible test
Not run — rejected for scope. The reproduction would be: train the guided VAE per the released config, verify ROC-AUC ≥ 0.99 on the SC2EG test split and path-success ordering (gradient ascent ≥ neural flow > OT ≈ linear on raw success; OT best on on-manifold metrics). Expected to reproduce; it would not change the verdict.

## 13. Acceptance / rejection gate
**Reject** for GSE: StarCraft II macro-economics do not transfer to NFL game outcomes; no NFL feature analogue (there is no "supply-capped percentage" in football); no human-validated actionability even in its own domain. The gate that would reopen it: a demonstrated counterfactual-recourse use case inside GSE's own feature space with measured analyst or user value — not hypothesized.

## 14. Improvement experiment
For interpretability research generally (not a GSE proposal): the paper's own honest finding — gradient ascent wins on success but leaves the manifold — is the experiment to run in any port: always report on-manifold metrics (KDE likelihood, max latent norm) alongside success rate, or the "counterfactual" is fantasy. Temporal splits (by patch/era) instead of random splits would cut the 0.9991 AUC down to its honest value. For GSE specifically: no experiment proposed; if an interpretability lane ever opens, start from the OT barycentric projection (the paper's best on-manifold method), not gradient ascent.
