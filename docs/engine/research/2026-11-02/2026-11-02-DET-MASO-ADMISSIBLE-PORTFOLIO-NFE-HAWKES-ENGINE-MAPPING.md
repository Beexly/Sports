# GSE Engine & DFS Optimizer Architectural Mapping: `Det-MASO` Log-Det Barrier, Admissible Portfolio Covariance Completion, Neural Filter Winner's Curse Shrinkage, Mamba-3 PBP State Probing, and Hawkes Inventory Control

**Date:** `2026-11-02`  
**Bucket:** `docs/engine/research/2026-11-02/`  
**Doctrines Enforced:** `MIND-FIRST` · `DIRECT-TO-MIND/ENGINE` · `WIRE-FIRST SEQUENCING` · `REASONING DOCTRINE` · `THE STACK`  
**Companion Corpus Dossier:** [`2026-11-02-QUANT-FINANCE-YANG-MILLS-QUANTUM-COMPUTING-CORPUS-DOSSIER.md`](file:///C:/Users/Garrett/Sports/docs/arxiv-program/research/2026-11-02/2026-11-02-QUANT-FINANCE-YANG-MILLS-QUANTUM-COMPUTING-CORPUS-DOSSIER.md)

---

## Executive Summary: Why Batch 2 Directly Solves Our Week 8 Post-Slate & DFS Root Causes

Every single failure mode uncovered in our [`Week 8 Post-Slate Review & DFS Optimizer Autopsy`](file:///C:/Users/Garrett/Sports/docs/predictions/research/2026-11-01/2026-11-01-WEEK8-FULL-POST-SLATE-REVIEW-AND-DFS-OPTIMIZER-AUTOPSY.md) has a rigorous mathematical solution in this Batch 2 corpus:

| Week 8 Failure Mode (Observed Reality) | Batch 2 Mathematical Solution | Exact Equation / Operator | Target GSE Module |
|---|---|---|---|
| **MME Lineup Clone Collapse:** `max_overlap=7` and `96%` RB1 chalk lock produced near-identical lineups (`det(Σ) -> 0`) | **`Det-MASO` Log-Determinant Diversity Barrier (`arXiv:2610.34936v1`)** | $\mathcal{L}_{\text{div}}(\mathbf{X}) = -\log\det\!\big(\frac{1}{N}\tilde{\mathbf{X}}^\top \tilde{\mathbf{X}} + \delta \mathbf{I}_M\big)$ guaranteeing $\lambda_{\min}(\mathbf{\Sigma}) \ge \frac{\varepsilon}{M^{M-1}}$ in $\mathcal{O}(N M^2 + M^3)$ | `scripts/dfs/run_week9_mme_20max.py` & `packages/dfs-optimizer` |
| **Uncorrelated / Diagonal-Residual Variance Understatement:** Treating non-stacked skill players or props as conditionally independent understates portfolio variance by up to 89.7% | **Admissible Portfolio Optimization (`arXiv:2610.00147v2`, Prop. 3.12d & Minimax Equicorrelated Completion)** | $\widetilde{\mathbf{\Sigma}}_H = \mathbf{B}_H\mathbf{V}_H\mathbf{B}_H^\top + (1-\bar{\varepsilon})\operatorname{diag}(\mathbf{\Omega}_H) + \bar{\varepsilon}\, s s^\top$ | `packages/prediction-engine/src/nfl/sgp-copula.ts` & DFS Portfolio Covariance |
| **Selection by Backtest Loss Admits Look-Ahead / Spurious Features:** Picking features because they maximized historical P&L overfits sample noise | **Lexicographic Two-Stage Admissibility Order (`arXiv:2610.00147v2`, Cor. 3.11 & Thm. 3.15)** | Stage I fixes $H_t^\star \in \operatorname{Min}_{\prec_{\mathcal{A}}}(\varepsilon_t, \delta_t, \kappa_t, \iota_t)$ with **zero** return/loss input; Stage II optimizes weights inside $H_t^\star$ | `packages/mcp-equations-server/src/mcp-cognitive-router.ts` & Conjunction Gate |
| **Winner's Curse / Optimizer's Curse on Top-Ranked Props & Value Plays:** Selecting the highest point-estimate edges (`Rashee Rice O 76.5`, `Bateman $3,400`) systematically selects positive estimation errors (`1,084 bps` gap) | **Amortized Neural Filtering Total-Variance Shrinkage (`arXiv:2610.25802v2`, Eq. 7)** | $\omega_{i,t} \propto \frac{-d\,\mathbb{E}[1 - e^{-\kappa H}]}{\sigma_{\text{eq}}\big(\mathbb{E}[1 - e^{-2\kappa H}] + d^2 \operatorname{Var}(e^{-\kappa H})\big)}$ | `packages/prediction-engine/src/nfl/calibration-map.ts` & Prop/DFS Sizing |
| **Single-Snap Residual Activations Miss Cumulative Trench Fatigue & Drive Momentum:** Snap-level snapshots miss multi-drive pass-rush attrition | **Mamba-3 LOB Recurrent State Probing & Rank/Winsorized Readouts (`arXiv:2610.28753v1`)** | Probe recurrent state $\mathbf{h}_t^{(\ell)} = \alpha_t \mathbf{h}_{t-1}^{(\ell)} + \dots$ ($R^2 = 0.59$ vs. residual $0.06$) with Winsorized/Rank normalization | `scripts/ops/gse_coach_mind_simulator.py` (JEV 175-Snap Trajectory State) |
| **Runaway Exposure to Correlated Chalk / Steam Without Inventory Barrier:** Over-allocating bankroll/exposure to a single game or player (`96%` Taylor) | **State-Dependent Hawkes Prony Sizing with Hard Inventory Barrier (`arXiv:2610.31903v1`, Eq. 7–9)** | $|I_{t_k}| \le I_{\max}$ with state-dependent Hawkes intensity $\lambda_e(t,z)$ and Prony-series demand | Exposure Manager & Live CLV Steam Execution |

---

## 1. Wiring `Det-MASO` (`arXiv:2610.34936v1`) into the 20-Max / 150-Max DFS Portfolio Optimizer & Multi-Agent Signal Router

### 1.1 Replacing Pairwise Overlap Counting with the Linear-Time Log-Det Diversity Barrier
In Week 8, our 20-Max MME script enforced pairwise overlap $\mathbf{x}_m^\top \mathbf{x}_{m'} \le 7$, which still allowed `19/20` lineups (`95%`) to collapse onto the exact same chalk core (`Jonathan Taylor 96%` + `Rhamondre Stevenson 60%`).

Under **`Det-MASO`**, let $\tilde{\mathbf{X}} = [\tilde{\mathbf{x}}_1, \dots, \tilde{\mathbf{x}}_M] \in \mathbb{R}^{N\times M}$ be the standardized Soft-Rank player-allocation or lineup-score matrix across $N$ candidate players and $M=20$ lineups (or $M$ specialized lineup-generation agents: *Shootout Primary*, *Bring-Back Leverage*, *Low-Owned Ceiling Pivot*, *Game-Script Contrarian*). The $M\times M$ inter-lineup correlation matrix is:
$$\mathbf{\Sigma}_{\text{MME}} = \frac{1}{N}\tilde{\mathbf{X}}^\top \tilde{\mathbf{X}} \in \mathbb{R}^{M\times M}$$
Adding the log-determinant barrier:
$$\mathcal{R}_{\text{Det-MASO}}(\tilde{\mathbf{X}}) = -c_{\text{div}}\log\det\big(\mathbf{\Sigma}_{\text{MME}} + \delta \mathbf{I}_M\big)$$
enforces three hard mathematical guarantees:
1. **Infinite Repulsion from Clones (Proposition 1):** Any two lineups or generator agents approaching collinearity cause $\lambda_{\min}(\mathbf{\Sigma}_{\text{MME}}) \to 0$ and repulsive gradient $\Omega(1/\|\eta\|) \to \infty$.
2. **Guaranteed Full Effective Rank (Proposition 2):** Enforcing $\det(\mathbf{\Sigma}_{\text{MME}}) \ge \varepsilon$ guarantees $\lambda_{\min}(\mathbf{\Sigma}_{\text{MME}}) \ge \varepsilon / M^{M-1} > 0$.
3. **Shapley Interaction Audit of Signal Families (Eq. 22–24):** In `mcp-cognitive-router.ts`, we compute the exact Shapley Interaction Index $I(i,j)$ between situational families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, `marketMicrostructure`) to verify positive superadditivity ($I(i,j) > 0$) rather than collinear double-counting ($I(i,j) < 0$).

---

## 2. Wiring `Admissible Portfolio Optimization` (`arXiv:2610.00147v2`) into Stage 3–5 Conjunction Gate & SGP/DFS Covariance

### 2.1 Stage I Lexicographic Admissibility Gate Before Any EV/Kelly Calculation
Following Rodríguez Domínguez's two-stage architecture (`Figure 1` & `Corollary 3.11`), a feature representation or situational signal $H$ is **never** admitted because it improved historical backtest P&L. Instead, Stage I filters $H$ lexicographically on:
1. **`A1` Chronological Filtration ($\mathcal{F}_{t^-}$):** Strict pre-lock availability (no post-lock injury/inactive leakage or closing-line look-ahead).
2. **`A2` Statistical Separation Defect ($\varepsilon_t(H) \le \bar{\varepsilon}$):** Off-diagonal residual correlation ratio $\|\mathbf{\Omega}_H - \operatorname{diag}(\mathbf{\Omega}_H)\|_F / \|\mathbf{\Omega}_H\|_F$ after conditioning on $H$ (e.g., conditioning on game total + pace + trench pressure).
3. **`A3` Interventional Regime Invariance ($\delta_t(H) \le \bar{\delta}$):** Stability of conditional moments across coaching/weather/injury regimes.
4. **`A4` Parsimony ($\kappa_t(H)$):** Minimum dimension among representations tying on `(A1, A2, A3)`.

### 2.2 Minimax Equicorrelated Covariance Completion for SGP & DFS Stacks
When pricing a 3-to-5 leg SGP (`sgp-copula.ts`) or evaluating a 9-player DFS lineup's variance, assuming legs outside the primary stack have zero residual correlation ($\mathbf{\Omega}_H^{\text{off}} = \mathbf{0}$) discards:
$$\frac{w^\top \mathbf{\Omega}_H^{\text{off}} w}{w^\top \mathbf{\Sigma}_H w} = \text{residual share} \times (\text{effective breadth} - 1) \times \bar{c}_w$$
For a 9-player DFS lineup ($\text{breadth} - 1 \approx 8$), even a modest unmodeled game-environment residual correlation $\bar{c}_w = 0.08$ causes a diagonal model to understate residual risk by **~39%**. We replace diagonal residual covariance with the exact **Minimax Equicorrelated Completion**:
$$\widetilde{\mathbf{\Sigma}}_H = \mathbf{B}_H\mathbf{V}_H\mathbf{B}_H^\top + (1 - \bar{\varepsilon})\operatorname{diag}(\mathbf{\Omega}_H) + \bar{\varepsilon}\, s s^\top$$
where $s_i = \sqrt{(\mathbf{\Omega}_H)_{ii}}$ and $\bar{\varepsilon} = \varepsilon_t(H)$ is the measured screening defect of the factor model.

---

## 3. Wiring Amortized Neural Filter Winner's Curse Shrinkage (`arXiv:2610.25802v2`, Eq. 7) into Prop Selection & DFS Ceiling Valuation

### 3.1 The Total-Variance Shrinkage Denominator
When our prop engine or DFS optimizer ranks $N > 300$ player props or salary-adjusted value plays by point-estimate edge $d_i = (\hat{\mu}_i - L_i)/\sigma_i$, the top-ranked candidates suffer from the **Winner's Curse** (Chang 2026 measures a `1,084 bps` forecast-vs-realized gap under point estimates).

Let $\kappa_i$ denote the player's usage/efficiency mean-reversion or role stability rate over horizon $H$, with posterior mean $\bar{g}_i = \mathbb{E}_{q_\psi}[1 - e^{-\kappa_i H}]$ and posterior variance $V_{\kappa,i} = \operatorname{Var}_{q_\psi}(e^{-\kappa_i H})$ (which is large for players returning from injury, changing offensive roles, or facing volatile snap counts like `Rashod Bateman` or `Tetairoa McMillan`). Then the uncertainty-adjusted allocation weight is:
$$\omega_i^{\text{NFE}} = \frac{|d_i|\,\bar{g}_i}{\sigma_i\Big(\mathbb{E}_{q_\psi}[1 - e^{-2\kappa_i H}] + d_i^2\, V_{\kappa,i}\Big)}$$
- **Behavior when role is rock-solid ($V_{\kappa,i} \to 0$):** $\omega_i^{\text{NFE}}$ reduces to classical Sharpe/Kelly scaling $\propto |d_i|/\sigma_i$.
- **Behavior when role uncertainty is elevated ($V_{\kappa,i} > 0$) and apparent edge $|d_i|$ is extreme:** The $+d_i^2 V_{\kappa,i}$ denominator term dominates, automatically shrinking the bet/exposure and eliminating false-positive "screaming value" traps!

---

## 4. Wiring Mamba-3 Recurrent State Probing (`arXiv:2610.28753v1`) & State-Dependent Hawkes Inventory Control (`arXiv:2610.31903v1`)

1. **Cumulative PBP Momentum & Trench Attrition State (`gse_coach_mind_simulator.py`):**
   Following Mohl et al. (`arXiv:2610.28753v1`), single-snap residual features cannot represent cumulative pass-rush fatigue or drive momentum ($R^2 \le 0.06$). Our 175-snap sequential JEV simulator must maintain an explicit multi-timescale recurrent state vector:
   $$\mathbf{h}_t^{(\text{snap})} = \bm{\alpha}_t \odot \mathbf{h}_{t-1}^{(\text{snap})} + \bm{\beta}_t \odot \mathbf{u}_{t-1} + \bm{\gamma}_t \odot \mathbf{u}_t$$
   with fast reset channels ($\tau_{1/2} \le 3$ snaps for turnovers/explosive plays) and slow integrative channels ($\tau_{1/2} \in [28, 66]$ snaps for defensive front-seven snap fatigue and offensive line pressure accumulation), read out via **Winsorized / Rank-standardized probes** so single-play 75-yard outliers do not corrupt the linear state readout.
2. **State-Dependent Hawkes Steam & Hard Exposure Barrier (`arXiv:2610.31903v1`):**
   Line movements and injury-news steam arrive via a state-dependent marked Hawkes process $\lambda_e(t,z)$. Both our sportsbook card and our 20-Max DFS portfolio must enforce a **Hard Inventory / Exposure Barrier** $|I_{t_k}| \le I_{\max}$ (e.g., max `35%` single-player MME exposure unless a strict dominance gate passes, and max unit exposure per correlated game environment) solved via backward dynamic programming rather than myopic single-bet Kelly sizing.
3. **Reversible Knapsack Feasibility Oracle (`BoundedKnapsack` / `PsiQDK 2.0`):**
   Our DFS lineup generator mirrors the `BoundedKnapsack` `within ... apply` reversible constraint pattern: compute salary weight $\sum w_i x_i \in [49000, 50000]$, stack correlation flags, and bring-back flags in clean ancilla registers, verify the conjunction of all structural rules, and reject any candidate failing a single gate before objective scoring.
