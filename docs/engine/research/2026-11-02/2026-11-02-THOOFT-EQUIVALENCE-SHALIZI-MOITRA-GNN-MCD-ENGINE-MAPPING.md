# GSE Engine & DFS Optimizer Architectural Mapping (Batch 3): 't Hooft Info-Equivalence Classes, Shalizi Do-Calculus & LOOCV, Moitra Tensor Decomposition, Spectral GNN Matchup Graphs, Multimodal PID, and `MinCovDet` Outlier Gating

**Date:** `2026-11-02`  
**Bucket:** `docs/engine/research/2026-11-02/`  
**Doctrines Enforced:** `MIND-FIRST` · `DIRECT-TO-MIND/ENGINE` · `WIRE-FIRST SEQUENCING` · `REASONING DOCTRINE` · `THE STACK`  
**Companion Corpus Dossier:** [`2026-11-02-BATCH3-THOOFT-CA-QM-STATISTICAL-LEARNING-GNN-PHYSICS-DL-CORPUS-DOSSIER.md`](file:///C:/Users/Garrett/Sports/docs/arxiv-program/research/2026-11-02/2026-11-02-BATCH3-THOOFT-CA-QM-STATISTICAL-LEARNING-GNN-PHYSICS-DL-CORPUS-DOSSIER.md)

---

## Executive Mapping: Batch 3 Equations $\to$ GSE 5-Stage Engine & DFS Optimizer

| Corpus Source | Extracted Mathematical Operator | Target GSE Module | Concrete Engine / DFS Function |
|---|---|---|---|
| **Gerard 't Hooft (`978-3-319-41285-6.pdf`, Ch. 2 & 7)** | Info-Equivalence Quotient $\mathcal{S}/\!\sim_{\text{info}}$ (`a ~ b iff U(t1,t0)(a) = U(t1,t0)(b)`) & Unitary Permutation Embedding $U_{\text{op}}(\delta t) = e^{-i H_{\text{op}}\delta t}$ | `scripts/ops/gse_coach_mind_simulator.py` (Stage 2 JEV 175-Snap Engine) | Collapses transient "Garden of Eden" play states into canonical game-state equivalence classes so the 10,000-world transition operator preserves exact probability mass (discrete Liouville invariance). |
| **Cosma Shalizi (`ADAfaEPoV.pdf`, CMU)** | Pearl's Back-Door & Front-Door Adjustment $\mathbb{P}(Y \mid \operatorname{do}(X=x))$ + One-Pass Hat-Matrix $\operatorname{LOOCV}(h) = \frac{1}{n}\sum_i \left(\frac{y_i - \hat{\mu}_h(x_i)}{1 - S_{ii}(h)}\right)^2$ | `packages/prediction-engine/src/nfl/x-situational-80-rules.ts` & `master-situational-reasoning-aggregator.ts` | Separates confounded team stats (e.g., pass attempts inflated by trailing script $U$) from causal coaching intent $\operatorname{do}(\text{PassRate})$ via back-door/front-door conditioning on neutral script $Z$. |
| **Ankur Moitra (`Algorithmic Aspects of ML`, MIT)** | Jennrich's 3rd-Order Tensor Decomposition $\mathcal{T}_3 = \sum_{k=1}^K \lambda_k \mathbf{u}_k^{\otimes 3}$ via $\mathbf{T}(\mathbf{a})\mathbf{T}(\mathbf{b})^\dagger$ & Separable NMF Anchor Recovery | `packages/mcp-equations-server/src/mcp-cognitive-router.ts` (Stage 3 Spectral Cluster Orthogonalization) | Uniquely identifies non-orthogonal latent game-script factors from 3rd-order co-skewness tensors of player fantasy scores without rotational ambiguity. |
| **Yao Ma & Jiliang Tang (`Deep Learning on Graphs`) + Rogel-Salazar (`NetworkX`)** | Normalized Graph Laplacian $\tilde{\mathbf{L}} = \mathbf{I} - \mathbf{D}^{-1/2}\mathbf{A}\mathbf{D}^{-1/2}$, Chebyshev Filter $\sum_k \theta_k T_k(\hat{\mathbf{L}})\mathbf{x}$, & Dirichlet Energy $E_{\text{Dir}}(\mathbf{X}) = \frac{1}{2}\operatorname{tr}(\mathbf{X}^\top \tilde{\mathbf{L}}\mathbf{X})$ | Matchup Interaction Graph & `packages/dfs-optimizer` | Models the 22-player on-field interaction graph (WR-CB coverage edges, OL-DL trench edges, QB-pass-catcher target edges) and prevents GNN/projection over-smoothing by lower-bounding Dirichlet energy $E_{\text{Dir}}(\mathbf{X})$. |
| **Liang, Zadeh, Morency (`Multimodal PID`, CMU `arXiv:2301.04856`)** | Partial Information Decomposition $I(X_1, X_2; Y) = R + U_1 + U_2 + S$ & Co-Information $S - R$ | `packages/prediction-engine/src/nfl/calibration-map.ts` (THE STACK Layer 1 + Layer 2 Fusion) | Decomposes Market Line ($X_1$) and Situational Overlay ($X_2$) into Redundancy $R$ (already priced in!) vs. Unique $U_2$ + Synergy $S$ (unpriced edge), ensuring we only add $U_2 + S$ on top of Layer 1. |
| **Thuerey et al. (`Differentiable Physics`, TUM `arXiv:2109.05237`) & Brandimarte (`Monte Carlo Finance`)** | Unrolled Simulator Trajectory Loss $\sum_{k=1}^K \|\mathbf{u}_{t+k} - (\mathcal{P}\circ\mathcal{C}_\theta)^{(k)}(\mathbf{u}_t)\|_2^2$ + Control Variates $\hat{\mu}_{\text{CV}} = \bar{Y} - \beta^\star(\bar{Z} - \mathbb{E}[Z])$ | `scripts/ops/gse_coach_mind_simulator.py` | Calibrates multi-drive simulator parameters over unrolled drive trajectories and slashes 10,000-sim Monte Carlo variance by $(1 - \rho_{YZ}^2)$ using analytical market-total control variates. |
| **Luca Zavarella (`Extending Power BI with Python and R`)** | Theil's Asymmetric Uncertainty $U(X\mid Y) = \frac{I(X;Y)}{H(X)}$, Yeo–Johnson + `MinCovDet` Robust Mahalanobis $D_{\text{MCD}}^2 > \chi^2_{p,1-\alpha}$, & Karney Ellipsoidal Geodesics | `intelligence/coaching/*` & Situational Travel/Outlier Filters | Ranks directional coaching tendency predictability via $U(\text{PlayCall}\mid \text{Personnel, DownDistance})$ and flags single-game box-score flukes via `MinCovDet` before projection ingestion. |

---

## 1. Decomposing Layer 1 (Market) vs. Layer 2 (Situational Reasoning) via Multimodal PID (`arXiv:2301.04856`)

Under **THE STACK** doctrine (`AGENTS.md`), Layer 1 is the market line ($X_1$) and Layer 2 is our situational/coaching/injury reasoning overlay ($X_2$). A foundational danger in sports modeling is **double-counting information already priced into the market line** (Redundancy $R(X_1, X_2; Y)$).

Using Liang, Zadeh, and Morency's **Partial Information Decomposition (`PID`)**:
$$I(X_1, X_2; Y) = R(X_1, X_2; Y) + U(X_1; Y \setminus X_2) + U(X_2; Y \setminus X_1) + S(X_1, X_2; Y)$$
Since the market already encodes $I(X_1; Y) = R(X_1, X_2; Y) + U(X_1; Y \setminus X_2)$, the incremental information contributed by Layer 2 conditioned on Layer 1 is strictly the **Conditional Mutual Information**:
$$I(X_2; Y \mid X_1) = I(X_1, X_2; Y) - I(X_1; Y) = \underbrace{U(X_2; Y \setminus X_1)}_{\text{Unique unpriced signal}} + \underbrace{S(X_1, X_2; Y)}_{\text{Market-Context Synergy}}$$
- **Rule for Stage 4 Overlay (`master-situational-reasoning-aggregator.ts`):** Every situational feature $X_2$ is orthogonalized against the de-vigged market prior $X_1$ via $L^2$ projection (Unpingco / FWL theorem from Batch 1) so that $R(X_1, X_2; Y)$ is stripped out completely and only $U(X_2; Y \setminus X_1) + S(X_1, X_2; Y)$ shifts the log-odds!

---

## 2. Removing Rotational Ambiguity in Asymmetric DFS Upside via Jennrich's 3rd-Order Tensor Decomposition (`Moitra`)

Standard PCA or Cholesky covariance decomposition ($\mathbf{M}_2 = \mathbb{E}[(\mathbf{r}-\bm{\mu})(\mathbf{r}-\bm{\mu})^\top]$) only captures symmetric 2nd-order variance and is invariant under orthogonal rotations $\mathbf{U} \mapsto \mathbf{U}\mathbf{Q}$, mixing distinct shootout scripts together.

In GPP DFS tournaments, player fantasy points exhibit strong **positive co-skewness** (e.g., QB + WR1 + Bring-Back WR erupting together in a 35–31 overtime game environment). Forming the **3rd-Order Co-Skewness Tensor** across the 10,000 simulated worlds:
$$\mathcal{T}_3 = \frac{1}{N_{\text{sims}}}\sum_{s=1}^{N_{\text{sims}}} (\mathbf{r}^{(s)} - \bm{\mu}) \otimes (\mathbf{r}^{(s)} - \bm{\mu}) \otimes (\mathbf{r}^{(s)} - \bm{\mu}) \approx \sum_{k=1}^K \lambda_k\, \mathbf{u}_k \otimes \mathbf{u}_k \otimes \mathbf{u}_k$$
and running **Jennrich's Algorithm** ($\mathbf{T}(\mathbf{a})\mathbf{T}(\mathbf{b})^\dagger$) uniquely recovers the true non-orthogonal game-eruption factors $\mathbf{u}_1, \dots, \mathbf{u}_K$ without rotational mixing!

---

## 3. Filtering Box-Score Flukes with Yeo–Johnson + `MinCovDet` Robust Mahalanobis Distance (`Zavarella`)

In Week 8, our naive `.rolling(5)` fantasy average was distorted by single-game long-TD outliers. By applying Zavarella's two-step robust outlier filter (`Chapter12/Python/01-detect-outliers-in-python.py`) to each player's multi-dimensional weekly usage & efficiency vector $\mathbf{x}_{i,t} = (\text{Snap\%}, \text{TargetShare}, \text{AirYardsShare}, \text{WOPR}, \text{FP/Route})^\top$:
1. Transform skewed marginals via **Yeo–Johnson** $\tilde{\mathbf{x}}_{i,t} = \psi_\lambda(\mathbf{x}_{i,t})$.
2. Fit the **Minimum Covariance Determinant (`MinCovDet`)** estimator $(\hat{\bm{\mu}}_{\text{MCD}}, \hat{\mathbf{\Sigma}}_{\text{MCD}})$ and compute:
   $$D_{\text{MCD}}^2(\tilde{\mathbf{x}}_{i,t}) = (\tilde{\mathbf{x}}_{i,t} - \hat{\bm{\mu}}_{\text{MCD}})^\top \hat{\mathbf{\Sigma}}_{\text{MCD}}^{-1}(\tilde{\mathbf{x}}_{i,t} - \hat{\bm{\mu}}_{\text{MCD}})$$
3. Any game where fantasy production spiked while underlying usage (`Snap%`, `TargetShare`, `WOPR`) remained low triggers $D_{\text{MCD}}^2 > \chi^2_{p, 0.975}$ and is automatically Winsorized before computing Week $t+1$ baseline projections!
