# [0454] Disentangled Interleaving Variational Encoding (arXiv:2501.08710v2)

**Citation:** Wong, N.Y.L., Cheu, E.Y., Chiam, Z., Srinivasan, D. (2025). *Disentangled Interleaving Variational Encoding*. arXiv:2501.08710v2. URL: https://arxiv.org/abs/2501.08710v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7613 lines).
**Verdict:** ADAPT — adopt the disentangled marginal/conditional latent-space design as a representation-learning template for GSE's multi-output engine (win prob + spread + total from one shared encoder), but replace the Naïve-Bayes disentanglement loss and RBF prior with standard supervised contrastive/disentanglement objectives validated on NFL data.

## 1. Research question
In interleaving multi-task learning, gradients from conflicting objectives (reconstruction, forecasting, classification) destabilize training. Can a VAE be extended so that (a) reconstruction + forecasting objectives provably form a single non-conflicting ELBO, and (b) the latent space disentangles into interpretable marginal vs. conditional factors via a Naïve-Bayes-derived loss — yielding a shared representation useful for forecasting under uncertainty (the authors' motivating use case: utility resource planning)?

## 2. Dataset / schema
Two public time-series datasets, no missing values:
- **Gait** (Zhang et al. 2023, "GaitMotion"): l=6 accelerometer/gyroscope readings for normal vs. pathological (stroke, Parkinson's) walking; input window 1000, prediction window 800, gap 0, split 8:1:1. n_2=2 marginal dims: gait type (Normal/Stroke/Parkinson's) and binned stride length (0–13).
- **Electricity** (Lai et al. 2018, from Trindade 2015 UCI ElectricityLoadDiagrams20112014): l=321 households, 1-hour windows; input window 168, prediction window 1 at horizon 24, gap 0, split 3:1:1. n_2=3 marginal dims: hour of day, month, day of week.
No sports data.

## 3. Method / model
**DeepDIVE** (Deep Disentangled Interleaving Variational Encoding):
1. **Proposition 1**: for jointly continuous (x,y) with p(x,y)=p(y|x)p(x), log p_θ(x,y) = L(θ,φ;x,y) + D_KL(q_φ(a,b|x)‖p_θ(a,b|x,y)), where the ELBO decomposes as L = E[log p_θ(y|a,b,x)] (forecast loss) + E[log p_θ(x|a,b)] (reconstruction loss) − D_KL(q_φ(a,b|x)‖p_θ(a,b)) — i.e., combining reconstruction and forecasting objectives still lower-bounds the joint log-likelihood, so the objectives are non-conflicting by construction.
2. **Disentanglement**: latent code z=[a‖b]; b = marginal dims supervised by sequence-level labels via a Naïve-Bayes-derived loss (independence among marginal dims conditional on input); a = conditional dims. Fusion via cross-attention.
3. **Propositions 4–6 + Theorem 1**: under a mixture-of-log-concave prior, the KL(q‖p) is upper-bounded by a function minimized by the minimizer of the cross-entropy loss → justifies RBF (radial basis function) components + cross-entropy with interleaving training.
4. Interleaving training alternates objectives; same encoder/decoder used for all baselines for fairness.

## 4. Equations & assumptions
- log p_θ(x) = L(θ,φ;x) + D_KL(q_φ(z|x)‖p_θ(z|x)); L(θ,φ;x) = E_{q}[log p_θ(x|z)] − D_KL(q_φ(z|x)‖p_θ(z)). (eqs. 1–2, standard VAE)
- Proposition 1: log p_θ(x,y) =: L(θ,φ;x,y) + D_KL(q_φ(a,b|x)‖p_θ(a,b|x,y)); (eq. 7)
- L(θ,φ;x,y) = E[log p_θ(y|a,b,x)] + E[log p_θ(x|a,b)] + E[log(p_θ(a,b)/q_φ(a,b|x))] =: forecast loss + reconstruction loss − D_KL(q_φ(a,b|x)‖p_θ(a,b)). (eqs. 8–10)
- Prior component approximation: p_θ(k) ≈ n_k/n (empirical mixture weights).
Assumptions: training samples representative of true distribution (Assumption 2 — holds for electricity, explicitly not for gait); mixture-of-log-concave prior; Naïve conditional independence among marginal dims given input; jointly continuous (x,y).

## 5. Features / target
Gait: 6 sensor channels (input sequence); targets = future sequence (800 steps) + gait-type/stride-length labels. Electricity: 321 household consumption series; target = consumption at horizon 24 + hour/month/weekday labels. Marginal dims are supervised categorical labels; conditional dims unsupervised.

## 6. Validation design
RRSE (root relative squared error) for reconstruction and forecasting, mean ± std over 30 runs, on both datasets. Baselines: DeepDIVE-(a) (conditional dims only ≈ VAE + forecast branch), DeepDIVE-(b) (marginal dims only), β-TCVAE (Chen et al. 2018). Disentanglement measured by Mutual Information Gap (MIG) on gait. SOTA comparison (Table 3, electricity only): TLAE, DsaNet, AutoCTS, AutoCTS-KDF/KDP, LightCTS at horizons 3/6/12/24. Same encoder/decoder across VAE-variant baselines. No time-ordered backtest beyond the fixed splits; no statistical tests reported.

## 7. Numerical results / baselines
- **Gait** (30 runs): DeepDIVE recon RRSE 11.1627 (std 4.8e-2), forecast 16.0582 (3.7e-2), MIG 0.0473 — vs. DeepDIVE-(a) 11.8835/16.4434/MIG 0.0155; DeepDIVE-(b) 28.2268/27.7309/0.0464; β-TCVAE 29.3563/33.7654/0.0081. Full DeepDIVE best on all three.
- **Electricity**: DeepDIVE recon 1.5803 (3.6e-4), forecast 0.0998 (7.1e-5) — vs. (a) 2.5562/0.1062; (b) 7.4779/0.1048; β-TCVAE 8.6409/0.1048.
- **SOTA (Table 3, electricity, horizons 3/6/12/24)**: DeepDIVE 0.0887/0.0911/0.0995/1.0000 — vs. LightCTS 0.0736/0.0831/…; AutoCTS 0.0743/0.0865/0.0932/0.0947; AutoCTS-KDF 0.0818/0.0949/0.1003/0.1018. DeepDIVE is competitive at short horizons but collapses at horizon 24 (RRSE 1.0000 — no better than the mean baseline), materially worse than AutoCTS/LightCTS there. Paper's "comparable to SOTA" claim holds only for short horizons.

## 8. Code / data availability
None stated. (Datasets are public: UCI ElectricityLoadDiagrams20112014, GaitMotion 2023. No repository link in the paper.)

## 9. Leakage & limitations
- The Naïve-Bayes disentanglement assumes marginal dims independent given input — violated in practice (paper's own Fig. 2: gait type and stride length are correlated); the assumption is doing the interpretability work, not the data.
- Assumption 2 (representative training distribution) explicitly fails on gait — yet results are still reported as validation.
- Horizon-24 collapse (RRSE 1.0000) on electricity undermines the forecasting claim precisely where it matters; SOTA comparison is electricity-only, single dataset.
- Baselines are all VAE variants (friendly); the SOTA table shows DeepDIVE losing at long horizons.
- 30-run stds are tiny (1e-4–1e-5), suggesting the optimization is stable but also that reported differences vs. (a) on electricity forecasting (0.0998 vs. 0.1062) are modest in absolute terms.
- No ablation of the cross-attention fusion vs. simple concatenation; no test of the log-concave-prior assumption.
- Domain gap: sensor/energy time series with dense supervision → NFL with sparse weekly outcomes; the marginal-label trick needs NFL analogues (e.g., weather regime, QB-tier labels).

## 10. GSE overlap
**Extension — new representation-learning mechanism.** Per the existing-research map: the 2026-09-18 ML brief commissioned "representation learning on play-by-play" and "multimodal fusion" (results pending); GSE has TabTransformer event representation (2606.09327) and diffusion trajectory modeling (2503.18589) in the dossier set, plus temporal fusion transformers as a brief topic. DeepDIVE's specific contribution — a *single ELBO unifying reconstruction + forecasting + classification with disentangled supervised/unsupervised latent factors* — is not in the corpus. It maps naturally onto GSE's multi-output engine (win probability + spread + total + props from one shared representation) and the interpretability need (disentangled factors ≈ matchup archetypes). Not a duplicate of CEPT/MOVE-37.

## 11. GSE implementation spec
1. **Encoder**: sequence model over trailing N weeks of team/game features (nflverse EPA splits, success rates, market moves) → latent z=[a‖b]; b supervised by discrete regime labels (weather bucket, QB tier, rest differential, home/away); a unsupervised.
2. **Decoders**: (a) reconstruction of input feature window; (b) forecast heads for win prob (Brier), spread (MAE), total (MAE); (c) classification head on regime labels (cross-entropy). Single ELBO-style combined loss per Proposition 1 — no gradient-surgery needed.
3. **Replace** the paper's RBF/log-concave prior machinery with a standard Gaussian prior + supervised contrastive loss on b; validate disentanglement via MIG on held-out seasons.
4. **Serving**: encoder runs once per week per team; heads are linear — cheap. Effort: ~2 weeks (data pipeline + model + backtest harness).

## 12. Reproducible test
Dataset: nflverse 2019–2025 team-week features; regime labels (weather bucket from stadium data, QB tier, rest days). Protocol: train DeepDIVE-style encoder on 2019–2023, evaluate 2024–2025 walk-forward: forecast heads predict win prob/spread/total vs. closing lines. Metrics: Brier (win prob), MAE vs. close (spread/total), MIG for disentanglement. Baselines: (a) shared encoder without disentanglement (paper's DeepDIVE-(a) analogue), (b) separate single-task models, (c) GSE v5.2.7. Expectation per paper: full model ≥ (a) on all heads and wins on MIG.

## 13. Acceptance / rejection gate
Adopt the architecture if, on 2024–2025 walk-forward, the disentangled multi-task model beats the non-disentangled shared-encoder baseline by ≥0.003 Brier (win prob) or ≥0.1 points MAE vs. close on spread/total, AND achieves MIG ≥ 2× the baseline's (interpretability must be real, not decorative). Reject if it fails to beat single-task models on any head (the paper's horizon-24 collapse warns that multi-task sharing can hurt the primary objective) — in that case keep GSE's current per-output models and document the negative.

## 14. Improvement experiment
Go beyond the paper: replace the Naïve-Bayes marginal loss with a **supervised contrastive loss on the regime labels** (which doesn't assume conditional independence — the paper's own Fig. 2 shows its assumption fails), and test whether contrastive disentanglement preserves the short-horizon gains while fixing the long-horizon collapse. If NFL regime labels are noisy, learn them jointly via a discrete latent variable (VQ-VAE codebook) instead of hand labels — making the marginal dims discovered rather than stipulated.
