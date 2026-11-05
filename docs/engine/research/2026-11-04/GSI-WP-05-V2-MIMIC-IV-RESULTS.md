# GSI-WP-05 v2.0 — Real MIMIC-IV v2.2 Benchmark Results (`D_cal -> D_test` & `10x5-Fold OOF CV`)

**Updated:** `2026-11-04`  
**Scripts:**
- [`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_real_benchmark.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_real_benchmark.py)
- [`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v2_benchmark.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v2_benchmark.py)
- [`packages/galaxy-conformal-ot/galaxy_conformal_ot/wasserstein_mahalanobis_whitening.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/galaxy_conformal_ot/wasserstein_mahalanobis_whitening.py)

---

## Root-Cause Correction of Prior Naive Hourly ZOH Prototype
An earlier prototype (`1b1d9fd67`) discarded the v1 baseline features, resampled irregular ICU vitals onto a coarse 1-hour zero-order-hold (ZOH) step grid imputed with static constants, and applied two-sided RFF Mahalanobis distance (which penalized healthy below-average strain values identically to above-average shock excursions), yielding `0.49–0.58` AUC.

In **GSE-GSI Conformal-OT v2.0**:
1. **Event-Level Multi-Frame Rolling Covariance ($\Sigma_{t,K}$):** `ProductionWhiteningEngine` and `GSEClinicalEngine` evaluate rolling covariance, localized Cholesky whitening, Split Conformal Quantile Regression (`SplitCQR`), and pocket-space eigenvalue concentration directly on actual bedside measurement sequences across windows $K \in \{4, 8, 12\}$.
2. **One-Sided Pathological Strain Cone RFF Mahalanobis:** `RFFMahalanobis(one_sided_cone=True)` projects standardized strain onto $X_+ = \max(0, (X - \mu_{\text{cal}})/\sigma_{\text{cal}})$ and anchors the Random Fourier Feature map at the healthy origin $\tilde{\Phi}(X_+) = \Phi(X_+) - \Phi(0)$, ensuring healthy low-strain stays map to zero distance while multi-system pathological excursions curve along the reference precision manifold.
3. **Multi-System ICU Physiological & Organ-Failure Representation:** Augments the baseline hemodynamic/CSD/Schrödinger-Bridge features with timestamp-aligned multi-organ ICU chart channels (`hemo_pocket_strain`, `resp_vent_strain`, `renal_metabolic_strain`, `neuro_tissue_strain`, `thermo_inflam_strain`).

---

## Verified Out-of-Sample Results (`results_clinical_mimic_iv_v2.json` & `results_clinical_mimic_iv_real.json`)

| Horizon | Stays ($n$ / Pos) | Shock Index Only | v1 Baseline Linear ($D_{\text{cal}}$) | **v2.0 Multi-Frame Conformal-OT ($D_{\text{cal}}$)** | **v2.0 Multi-Frame ($10\times 5$ OOF CV)** | **v2.0 Pathological-Cone RFF ($10\times 5$ OOF CV, Neg-Only Fit)** | Held-Out Neg Coverage ($\alpha=0.10$) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **First 6h** | $133$ ($37$) | `0.5612` | `0.6257` | **`0.6898`** (`+6.41 pp`) | **`0.6826`** | **`0.6591`** | **89.6%–92.0%** |
| **First 12h** | $134$ ($38$) | `0.5780` | `0.6531` | **`0.7400`** (`+8.69 pp`) | **`0.7336`** | **`0.7376`** | **89.3%–90.0%** |
| **First 24h** | $136$ ($38$) | `0.5830` | `0.6249` | **`0.7863`** (`+16.14 pp`) | **`0.7819`** | **`0.7798`** | **90.0%–90.2%** |
| **Full Stay** | $138$ ($38$) | `0.6350` | `0.7721` | **`0.8171`** (`+4.50 pp`) | **`0.8089`** | **`0.7889`** | **90.0%–92.0%** |
