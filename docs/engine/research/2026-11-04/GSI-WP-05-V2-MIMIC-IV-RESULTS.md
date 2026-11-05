# GSI-WP-05 v2.0 & v3.0 — Real MIMIC-IV Benchmark & Three-Pillar Falsifiable Validation

**Institution:** Galaxy Science Institute (Texas Domestic Nonprofit Corporation, SOS Tracking `#15043440630001`, IRS EIN `43-2804773`)  
**Updated:** `2026-11-04`  
**Scripts & Modules:**
- [`packages/galaxy-conformal-ot/galaxy_conformal_ot/wasserstein_mahalanobis_whitening.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/galaxy_conformal_ot/wasserstein_mahalanobis_whitening.py)
- [`packages/galaxy-conformal-ot/galaxy_conformal_ot/quantum_topology_hyper_embedding.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/galaxy_conformal_ot/quantum_topology_hyper_embedding.py)
- [`packages/galaxy-conformal-ot/galaxy_conformal_ot/quantum_braid_teb.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/galaxy_conformal_ot/quantum_braid_teb.py)
- [`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_real_benchmark.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_real_benchmark.py)
- [`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v2_benchmark.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v2_benchmark.py)
- [`packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v3_teb_benchmark.py`](file:///C:/c/wt-week8-forensic/packages/galaxy-conformal-ot/benchmarks/clinical_mimic_iv_v3_teb_benchmark.py)

---

## 1. Root-Cause Correction of Prior Naive Hourly ZOH Prototype (`0.49–0.58` AUC)

An earlier prototype (`1b1d9fd67`) discarded the v1 baseline features, collapsed each stay into a static summary vector before passing the cross-patient cohort to `MultiFrameRollingCovariance`, and applied two-sided RFF Mahalanobis distance (which penalized healthy below-average strain values identically to above-average shock excursions), yielding `0.49–0.58` AUC.

In **GSE-GSI Conformal-OT v2.0 & v3.0**:
1. **Within-Stay Multi-Frame Rolling Covariance ($\Sigma_{t,K}$):** `ProductionWhiteningEngine` and `GSEClinicalEngine` evaluate rolling covariance, localized Cholesky whitening, Split Conformal Quantile Regression (`SplitCQR`), and pocket-space eigenvalue concentration directly on actual bedside measurement sequences across windows $K \in \{4, 8, 12\}$.
2. **One-Sided Pathological Strain Cone RFF Mahalanobis:** `RFFMahalanobis(one_sided_cone=True)` projects standardized strain onto $X_+ = \max(0, (X - \mu_{\text{cal}})/\sigma_{\text{cal}})$ and anchors the Random Fourier Feature map at the healthy origin $\tilde{\Phi}(X_+) = \Phi(X_+) - \Phi(0)$, ensuring healthy low-strain stays map to zero distance while multi-system pathological excursions curve along the reference precision manifold.
3. **Thermodynamic Ergodic Braiding (TEB) & Quantum-Spectral Graph Laplacian (v3.0):** Operationalizes subsystem clock divergence ($\phi_i(t)$), Chen's 2nd-level antisymmetric iterated integral (Stochastic Lévy Area $A_{ij}$), Gauss Winding Number $W_{ij}$, Seifert Broken-Detailed-Balance Irreversible Entropy Production ($\dot{S}_{\text{irr}}$), and the De Domenico–Biamonte Quantum Density Operator ($\rho_\beta = \exp(-\beta L_{\text{norm}})/\text{Tr}(\exp(-\beta L_{\text{norm}}))$).

---

## 2. Pillar 1 — Falsifiable Hypothesis Test of Asynchronous Subsystem Time-Slippage ($\phi_i \neq \phi_j$) on Real MIMIC-IV Data

To replace metaphorical "time-slippage" with a rigorous, falsifiable physiological quantity, `AsynchronousTimeSlippageEstimator` estimates each organ subsystem's intrinsic arc-length clock velocity calibrated against survivor reference dynamics:
$$\phi_i(t) = \frac{|\Delta X_i(t)|}{\text{median}_{\text{survivors}}(|\Delta X_i|) + \varepsilon}, \quad \Delta\phi_{\text{dispersion}} = \max_{i \neq j} |\bar{\phi}_i - \bar{\phi}_j| + \text{std}_i(\bar{\phi}_i)$$
alongside exact Dynamic Time Warping (DTW) alignment path displacement $\tau_{\text{DTW}}(S_i, S_j)$, Chen's Stochastic Lévy Area $\|A\|_F$, and Seifert Irreversible Entropy Production $\dot{S}_{\text{irr}}$.

| Operational Metric (Real MIMIC-IV Cohort, $N=138$) | Positive (Sepsis/Mortality) Mean | Negative (Survivor) Mean | Cohen's $d$ | Mann-Whitney $U$ $p$-Value | Univariate ROC-AUC | $H_1$ Supported ($p < 0.01, d > 0.40$) |
|---|---:|---:|---:|---:|---:|:---:|
| **Subsystem Clock Velocity Dispersion ($\Delta\phi$)** | `5.4756` | `2.8308` | **`0.4425`** | **`1.71e-04`** | `0.6979` | **YES (`True`)** |
| **DTW Temporal Warp Slippage ($\tau_{\text{DTW}}$)** | `0.9083` | `0.2898` | **`0.5093`** | **`1.37e-07`** | `0.7839` | **YES (`True`)** |
| **Seifert Irreversible Entropy Production ($\dot{S}_{\text{irr}}$)** | `2.8933` | `1.4972` | **`1.2375`** | **`2.59e-09`** | `0.8226` | **YES (`True`)** |
| **Chen Stochastic Lévy Area Circulation ($\|A\|_F$)** | `2.2688` | `0.4042` | **`0.4368`** | **`9.39e-10`** | `0.8318` | **YES (`True`)** |

---

## 3. Pillar 2A — Stress-Testing the Invariance Claim (Time-Warping, Sparsity & Sensor Noise Boundaries)

Per the scientific review, topological invariants of continuous curves are reparameterization-invariant by Chen's Theorem, but discretized telemetry introduces filtration and sampling sensitivity that must be measured empirically rather than assumed.

1. **Monotonic Nonlinear Time-Warping ($t \mapsto t^\gamma$):**
   - $\gamma = 1.5$: Chen Lévy Braid drift = **`0.029%`** vs. Flat Windowed Euclidean Velocity drift = **`7.440%`**.
   - $\gamma = 2.0$: Chen Lévy Braid drift = **`0.076%`** vs. Flat Windowed Euclidean Velocity drift = **`17.763%`**.
   - $\gamma = 3.0$: Chen Lévy Braid drift = **`0.212%`** vs. Flat Windowed Euclidean Velocity drift = **`37.676%`**.
2. **Irregular Packet Dropout / Sparsity ($0\%$ to $60\%$ Missing Frames):**
   - `20%` frame dropout: Braid drift = **`0.11%`** vs. Flat Velocity drift = **`10.03%`**.
   - `40%` frame dropout: Braid drift = **`0.35%`** vs. Flat Velocity drift = **`16.95%`**.
   - `60%` frame dropout: Braid drift = **`1.20%`** vs. Flat Velocity drift = **`24.28%`**.
3. **Additive Gaussian Sensor Noise Degradation Boundary:**
   - $\sigma = 0.05$: ROC-AUC = **`1.0000`**
   - $\sigma = 0.15$: ROC-AUC = **`0.9992`**
   - $\sigma = 0.30$: ROC-AUC = **`0.7956`**
   - $\sigma = 0.50$ (SNR $< 1$, honest failure boundary): ROC-AUC degrades to **`0.4644`**, confirming that discretization of braids is NOT magically immune to high-amplitude white noise when noise exceeds the signal loop radius.

---

## 4. Pillar 2B — Head-to-Head Real MIMIC-IV Benchmark Across All Horizons (`results_clinical_mimic_iv_v3_teb.json`)

All models are calibrated strictly on survivor reference splits ($D_{\text{cal}} \to D_{\text{test}}$, zero label leakage):

| Horizon | Stays ($n$ / Pos) | 1. Baseline v1 Linear | 2. Persistent Homology TDA ($H_0/H_1$ Betti) | 3. Quantum TDA Spectral Laplacian ($\rho_\beta$) | 4. TEB Braid + Time-Slippage Alone | 5. Conformal-OT v2.0 (RFF Cone) | **6. GSI v3.0 Unified (Conformal-OT + Quantum + Braid)** | Lift vs. v1 Baseline |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **First 6h** | $136$ ($38$) | `0.6356` | `0.6375` | `0.6796` | `0.6834` | `0.7229` | **`0.7368`** (`[0.629, 0.830]`) | **`+10.12 pp`** |
| **First 12h** | $137$ ($38$) | `0.6746` | `0.6295` | `0.7480` | `0.7408` | `0.7940` | **`0.8118`** (`[0.729, 0.887]`) | **`+13.72 pp`** |
| **First 24h** | $138$ ($38$) | `0.7134` | `0.6545` | `0.7895` | `0.7726` | `0.8284` | **`0.8387`** (`[0.758, 0.909]`) | **`+12.53 pp`** |
| **Full Stay** | $138$ ($38$) | `0.7721` | `0.7634` | `0.8034` | `0.8392` | `0.8437` | **`0.8545`** (`[0.778, 0.922]`) | **`+8.24 pp`** |

---

## 5. Pillar 3 — Ergodicity Breaking & Bifurcation Early-Warning Lead Time

- **Coupled Cardiorespiratory Van der Pol Oscillator Approaching Hopf/Autonomic-Decoupling Bifurcation ($n=50$ Monte Carlo trajectories):**
  - Finite-Time Braiding Exponent ($\lambda_{\text{FTBE}}$) & Broken-Detailed-Balance Wedge Flux trigger an early-warning transition **`58.32` steps (median `56.5` steps)** prior to scalar threshold collapse.
- **Real MIMIC-IV Positive Shock Stays ($n=38$):**
  - `ErgodicBraidBifurcationMonitor` achieves a mean early-warning lead time of **`7.08 hours`** prior to scalar hypotensive crisis (`MAP < 65 mmHg`), with Thirumalai-Mountain Ergodicity-Breaking index $\text{EB} = 0.6890$.
