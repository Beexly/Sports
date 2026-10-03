# [1480] Local Temperature Scaling for Probability Calibration (arXiv:2008.05105v2)

**Citation:** Zhipeng Ding, Xu Han, Peirong Liu, Marc Niethammer (2021). *Local Temperature Scaling for Probability Calibration*. arXiv:2008.05105v2 [cs.CV]. URL: https://arxiv.org/abs/2008.05105
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf; read to EOF 2026-09-21, including Appendix E entropy-theoretical proofs and Appendices F–K).
**Verdict:** ADAPT

## 1. Research question
Can temperature scaling be extended from a single global scalar to a spatially-varying (local) calibration that (a) handles multi-label semantic segmentation, (b) preserves prediction accuracy, and (c) captures local miscalibration patterns a global temperature cannot?

## 2. Dataset / schema
- COCO (natural images; FCN + ResNet-101; 1000 test samples; mean IoU 63.7%).
- CamVid (street scenes, 11 classes; Tiramisu; 233 test samples).
- LPBA40 (3D brain MR; customized 3D U-Net; 40 test samples; and VoteNet+ multi-atlas segmentation with 640 test samples for the downstream task).
- Standard train/val/test splits; calibration model trained on the hold-out validation set only (details in Appx. C).

## 3. Method / model
- Global TS baseline: Q̂ᵢ(x,T) = max_l σ_SM(zᵢ(x)/T)(l), T fit by NLL on val (3.3).
- IBTS (image-based TS): per-image scalar Tᵢ predicted by a CNN from (logits, image), NLL objective (3.5).
- **LTS (local TS):** per-pixel/voxel temperature Tᵢ(x) ∈ R⁺ predicted by network H(α, zᵢ, Iᵢ, x) from the logit map + image: Q̂ᵢ(x, Tᵢ(x)) = max_l σ_SM(zᵢ(x)/Tᵢ(x))(l) (3.6). Because Tᵢ(x) > 0, class order is preserved → segmentation accuracy unchanged. Tᵢ(x) > 1 damps overconfidence; Tᵢ(x) < 1 boosts underconfidence; Tᵢ(x)→∞ → uniform 1/|L|.
- Calibration metrics ported to segmentation: reliability diagrams, ECE, MCE, SCE, ACE (10 bins), evaluated in All / Boundary (≤2px from boundaries) / Local (10 random 72×72 patches; Local-Avg and Local-Max) regions.
- Significance: Mann-Whitney U + Benjamini/Hochberg FDR 0.05 vs LTS.

## 4. Equations & assumptions
- Perfect calibration in region Ω: P(Ŝ(x)=S(x) | P̂(x)=p) = p, ∀p ∈ [0,1], x ∈ Ω (3.2).
- LTS definition (3.6) above; IBTS objective (3.5); global-TS objective (3.3).
- **Theorem 4 (Appx. E, 3 parts):** (1) when the network is overconfident (entropy < cross-entropy), minimizing NLL w.r.t. TS/IBTS/LTS parameters is equivalent to maximizing the entropy of the calibrated probabilities under the overconfidence constraint — i.e., TS-style calibration provably counteracts NLL's entropy-minimizing (overconfidence-inducing) pressure; (2) when underconfident (entropy > cross-entropy), NLL minimization coincides with *minimizing* entropy (sharpening); (3) in both cases NLL and entropy reach an equilibrium at the optimal temperature. Remark: constraint restrictiveness order C > B > A, i.e. model complexity LTS > IBTS > TS.

## 5. Features / target
Features: per-location logit vector zᵢ(x) + image Iᵢ. Target: temperature field Tᵢ(x) minimizing val-set NLL.

## 6. Validation design
Three datasets × four models; baselines: uncalibrated (UC), global TS [20], IBTS, isotonic regression, vector scaling, ensemble TS, Dirichlet calibration (DirODIR); joint-training baselines MMCE [36] and focal loss [52] with and without LTS post-hoc; downstream multi-atlas label fusion (JLF [64]) with calibrated VoteNet+ probabilities vs two theoretical upper bounds.

## 7. Numerical results / baselines
- COCO ECE All: UC 12.44 → TS 12.53 → IBTS 11.92 → **LTS 10.04** (mean %; std in parentheses in Tab. 1); LTS best on almost all metrics/regions, statistically significant.
- CamVid ECE All: UC 7.79 → TS 3.45 → IBTS 3.63 → **LTS 3.40**; Boundary ECE: UC 22.79 → LTS 11.80.
- LPBA40 U-Net ECE All: UC 5.58 → TS 1.43 → **LTS 0.90**; Local-Avg ECE: LTS 1.90 vs TS 2.24.
- VoteNet+ ECE All: UC 7.26 → TS 5.07 → IBTS 2.77 → **LTS 0.71**.
- LTS improves joint-training models too: MMCE 4.45 → MMCE+LTS 4.15; FL 3.47 → FL+LTS 3.13 (CamVid ECE All).
- Downstream MAS label fusion: volume Dice All 81.19 (UC) → 81.27 (LTS); LTS yields the most voxel changes with the best correct-vs-wrong change balance (Tab. 2); still far from the Best-Fusion/Best-Calibration upper bounds.
- MCE stays high everywhere (annotation noise at boundaries), as the authors predict.

## 8. Code / data availability
No code/data link stated in the main text (datasets are public: COCO, CamVid, LPBA40).

## 9. Leakage & limitations
Calibration fitted on a disjoint val set — no leakage. Limitations: per-pixel annotation noise inflates MCE; LTS needs a trained temperature network (more parameters than TS); gains over TS shrink when images are pre-registered (LPBA40 U-Net); no comparison to Bayesian/ensemble uncertainty on the same tasks.

## 10. GSE overlap
Calibration lane. Existing-research-map check: global temperature scaling, Platt scaling, isotonic regression, Venn-Abers, grouping loss, and ECE-by-sport/week are already covered (map line 43; ledger 0723 is the Guo et al. TS paper). The delta here is strictly the **local/context-dependent** extension — no corpus entry has input-dependent temperature. No duplication.

## 11. GSE implementation spec
Context-conditional temperature scaling for engine win probabilities (`gse_lts_cal.py`):
1. Inputs: engine raw logit z per pick + context features c (sport, market type, days-to-kickoff, odds bucket, model-version flag) — the analog of the paper's (logit map, image).
2. Fit a small regressor (gradient boosting or 2-layer MLP) T(c) > 0 on a hold-out val season minimizing NLL of σ(z/T(c)) against outcomes; global TS (single T) as the baseline to beat.
3. Deployed probability: p_cal = σ(z / T(c)); ranking of picks unchanged (positive scaling preserves order), so pick selection is unaffected — pure calibration gain, exactly the paper's accuracy-preservation property.
4. Evaluate ECE/SCE/ACE overall and sliced by context (the paper's All/Boundary/Local analog: slice by sport, week, odds bucket); require statistically significant ECE reduction vs global TS (paired test, FDR 0.05 as in the paper).

## 12. Reproducible test
On one hold-out NFL season: fit global TS and LTS-style T(c); report ECE (10 bins), SCE, ACE overall + per-slice; reliability diagrams per slice. Acceptance requires LTS-context ECE < global-TS ECE with significance, mirroring Tab. 1.

## 13. Acceptance / rejection gate
ADAPT bar: context-conditional T must beat global temperature scaling on ECE/SCE/ACE on a hold-out season with statistical significance; if T(c) collapses to ~constant (no context signal), fall back to global TS and record the negative result.

## 14. Improvement experiment
(a) Extend the temperature network to a bin-wise/context-mixture form (paper's suggested future work: LTS + bin-wise [30] + class-conditional [51]); (b) learn T(c) jointly with the engine's grouping-loss calibration already in the corpus and test additivity; (c) apply the same local-TS idea to GSE's market-probability features (odds-implied probs vary in miscalibration by book/line-movement bucket).
