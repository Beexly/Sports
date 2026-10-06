# [1892] Fully Test-time Adaptation for Tabular Data (FtaT) (arXiv:2412.10871)

**Citation:** Authors (2024). *Fully Test-time Adaptation for Tabular Data*. arXiv:2412.10871v1. URL: https://arxiv.org/abs/2412.10871
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the most directly portable paper in the lane because GSE's data *is* tabular. Its three modules map onto a pre-game prediction layer: (1) Confident Distribution Optimizer → label-shift correction of the week's predicted outcome distribution against historical base rates; (2) Local Consistent Weighter → per-game trust weights from neighborhood prediction consistency (no augmentation needed); (3) Dynamic Model Ensembler → adaptation-strength ensemble that removes learning-rate tuning. Caution imported from the paper: naive test-time adaptation (TENT/LAME) *hurts* tabular models — only the guarded version is safe.

## 1. Research question
Fully test-time adaptation (FTTA: adapt a trained model using only unlabeled test batches D_t, θ_t → θ_{t+1}) works for images but fails on tabular data. Why? Three challenges: (a) covariate *and* label distribution shifts coexist; (b) data augmentation — the consistency engine of CoTTA/AdaContrast — is ineffective for tabular (stronger augmentation monotonically degrades CoTTA: 60.46 → 54.74 on DIABETE, Table 1); (c) adaptation is sensitive to task and backbone (optimal LR differs per dataset and per model, Figure 3). The paper's FtaT addresses all three and beats 6 SOTA FTTA methods on 6 TableShift benchmarks × 3 backbones.

## 2. Dataset / schema
Six TableShift tabular benchmarks with real distribution shifts (HELOC, ANES, Health Insurance, ASSIST, DIABETE, Hypertension; 10K–5M samples, 26–365 features). Backbones: MLP, TabTransformer, FT-Transformer. Protocol: train on source, select on validation, adapt on shifted test batches only. Metrics: accuracy, balanced accuracy, F1. Baselines: non-adaptation, TENT, EATA, LAME, CoTTA, ODS, SAR.

## 3. Method / model
- **Confident Distribution Optimizer:** correct predictions for label shift via f̂_{θ_{t+1}}(x_k) = f_{θ_{t+1}}(x_k) ∘ P̂_t / P_0 (Eq. 2). Estimate the shifted label distribution from *low-entropy (confident) predictions only*: P̃_t (Eq. 3); debias with the confusion matrix Ĉ_t (Eq. 4) → Ĉ_t^{−1}P̃_t; smooth temporally: P̂_t = Norm(P̂_{t−1} − α·Ĉ_t^{−1}P̃_t) (Eq. 5). Figure 2: low-entropy predictions recover the true label distribution; Figure 5: FtaT estimates it faster than ODS/LAME (KL divergence).
- **Local Consistent Weighter:** replace augmentation-consistency with *neighborhood* consistency: N(x_k, D_t) = {x : Dist(x,x_k) < mean pairwise Dist} (Eq. 6, L2). Consistency indicator ℐ = 1 if ‖f(x_k) − mean neighborhood prediction‖ < β (Eq. 7). Weight: 𝒲 = [max f̂(x_k) − min f̂(x_k)] · ℐ(x_k, D_t, θ_t) (Eq. 8) — prediction margin × consistency. Objective: θ_{t+1} = argmin_θ Σ 𝒲·Loss(f̂) with entropy loss (Eq. 1).
- **Dynamic Model Ensembler:** M models with different LRs {1e-3, 1e-4, 5e-4, 1e-5}; weights w_i ∝ 1 − R^i_t(D_t) (current-batch loss); final = Σ w_i·f̂^i(x). Beats plain averaging and matches the best single tuned LR without tuning (Table 6).

## 4. Equations & assumptions
- θ_{t+1} = argmin_θ Σ_i 𝒲(x_i,D_t,θ_t)·Loss(f̂_{θ_t}(x_i)). (Eq. 1)
- f̂_{θ_{t+1}}(x_k) = f_{θ_{t+1}}(x_k) ∘ P̂_t / P_0. (Eq. 2)
- P̃_t = Σ_i 𝟙[Entropy(f̂(x_i)) < ε]·f̂(x_i) / Σ_i 𝟙[·]. (Eq. 3)
- P̂_t = Norm(P̂_{t−1} − α·Ĉ_t^{−1}P̃_t). (Eq. 5)
- 𝒲 = [max f̂ − min f̂]·ℐ. (Eq. 8)
Assumptions: low-entropy predictions are approximately correct (for label-distribution estimation); neighbors in L2 feature space should get similar predictions; test batches are large enough for neighborhood statistics.

## 5. Features / target
Tabular features (26–365 dims, mixed continuous/discrete). Targets: binary/multi-class classification labels (credit, health, education domains).

## 6. Validation design
TableShift protocol (train → validate → adapt on shifted test, no source access at test). 6 datasets × 3 backbones × 3 metrics; ablations removing Cdo/Lcw (Table 5); LR-sensitivity study (Table 6); label-distribution estimation speed (Figure 5, KL divergence). Multiple seeds, mean ± std.

## 7. Numerical results / baselines
- **FtaT best on all 3 backbones** (Table 3, avg over datasets): MLP 66.77/64.96/72.00 (Acc/BalAcc/F1) vs non-adaptation 62.45/64.61/60.59; TabTransformer 66.14/64.40/69.03; FT-Transformer 64.01/62.54/69.56.
- Existing FTTA methods fail on tabular: TENT 58.43 (MLP Acc, *worse* than baseline), LAME 59.48, ODS collapses on HELOC (43.10 vs 54.37 baseline), CoTTA ≈ baseline (61.59), SAR ≈ baseline. Table 2: as shifts grow (DIABETE→HELOC→ASSIST), both parameter-optimizing and prediction-optimizing FTTA degrade below baseline.
- Per-dataset (MLP, Table 4): FtaT wins HELOC 64.09 vs 54.37, Health Insurance 72.42 vs 65.79, Hypertension 62.20 vs 58.76 (F1 73.77 vs 55.46); competitive on DIABETE 61.66 vs 60.81.
- Ablation (Table 5): removing Cdo hurts more than removing Lcw — label shift is the bigger problem; both needed for best results.

## 8. Code / data availability
TableShift benchmark public (Gardner, Popovic, and Schmidt 2023). No code link stated in extracted text.

## 9. Leakage & limitations
- FTTA adapts *without labels* via entropy minimization — the paper itself shows this is dangerous on tabular data (TENT/LAME hurt); FtaT's guards (confidence filtering, neighborhood consistency, ensembling) are what make it safe, and each adds hyperparameters (ε, β, α, M).
- Test batches must be large enough for neighborhood statistics and label-distribution estimation — a 16-game NFL slate is a *tiny* batch; the neighborhood machinery may be statistically starved (Eq. 6 needs meaningful pairwise distances).
- Results are classification accuracy/F1, not calibration — GSE cares about probabilities; entropy-minimization adaptation is known to damage calibration, unmeasured here.
- The label-shift correction (Eq. 2) assumes the shift is in P(y), not P(y|x) — if the *relationship* changed (concept shift), reweighting predictions by base rates is wrong.
- No GSE-scale sequential evaluation — single shifted test sets, not streaming weeks.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This is the lane's only *tabular-native* adaptation paper and the natural pre-game companion to the weekly-refit papers (1887–1891): those update the model *between* weeks with labels; FtaT adapts *predictions* to the current slate's distribution *without* waiting for labels.

## 11. GSE implementation spec
- **Pre-game label-shift correction (Cdo analog):** each week, compute the slate's mean predicted home-win probability P̃_t. If |P̃_t − P_0| > δ (P_0 = historical home-win base rate ≈ 0.57), apply the multiplicative correction f̂ = f ∘ P̂_t/P_0 renormalized — i.e., shrink overconfident slates toward base rates. Estimate P̂_t from the week's most confident predictions only (the paper's low-entropy trick), so a few coin-flip games don't distort the estimate. This is a pure post-processing step: zero model retraining, fully auditable.
- **Neighborhood-consistency flags (Lcw analog):** for each game, find its k nearest historical games in feature space; flag the pick for analyst review if the model's prediction deviates from the neighbors' mean predicted probability by > β (paper's Eq. 7). Not an automatic override — a triage signal, since 16-game batches are too small for the full weighting scheme.
- **Adaptation-strength ensemble (DME analog):** maintain 3–4 weekly model variants (frozen, light-touch refit, full refit, aggressive recency weighting); weight their probabilities by w_i ∝ 1 − recent-slate log-loss. Removes the "how aggressively to update" tuning decision the same way FtaT removes LR tuning.
- **What NOT to do:** no entropy-minimization on the slate (TENT's failure mode); no augmentation-based consistency (paper's Table 1).

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target; walk-forward 2020–2025, evaluated per-week as "test batches." Arms: (A) frozen model predictions, (B) A + label-shift correction (δ tuned on 2020–2021), (C) B + neighborhood flags (measured as: do flagged games have worse Brier? — a diagnostic, not a score), (D) C + adaptation-strength ensemble. Metrics: weekly Brier, ECE, and slate-level |mean predicted − base rate| calibration drift. Gate: (B) must reduce slate calibration drift by ≥30% vs (A) without worsening weekly Brier by >0.001; (D) must beat the best single variant on anytime Brier by ≥0.001.

## 13. Acceptance / rejection gate
ADOPT the label-shift correction as a standing pre-game post-processing step if on 2020–2025 walk-forward: (i) it reduces slate-level calibration drift (|mean p − base rate|) by ≥30% vs uncorrected, (ii) weekly Brier does not worsen by >0.001, (iii) ECE improves or is neutral. ADOPT the neighborhood-flag triage if flagged games show ≥0.01 worse Brier than unflagged (the flag carries signal). REJECT entropy-based test-time adaptation entirely (paper's own evidence: TENT/LAME hurt tabular models). REJECT the full 𝒲-weighted retraining objective (Eq. 1) for NFL — 16-game batches are too small for the neighborhood statistics it needs; keep only the post-processing and flagging halves.

## 14. Improvement experiment
Make the label-shift correction *conditional*: instead of one global P_0, estimate base rates per slate archetype (divisional-heavy slates, bad-weather weeks, prime-time slates) from history, and correct each week's predictions against its archetype's base rate. Hypothesis: conditional correction beats global correction on ECE because label shift in the NFL is structured (e.g., bad-weather weeks genuinely have fewer home blowouts — P(y|x) shifts, not just P(y)). Test: global vs archetype-conditional correction on 2023–2025, scored on ECE + Brier; if conditional wins, the "label shift" framing upgrades to a regime-aware calibration layer.
