# QUAD-ENGINE MATHEMATICAL EDGE & FORMULA SYNTHESIS DOSSIER — 2026-10-29

- **Generated At:** `2026-10-29T09:42:21Z`
- **Quad-Engine Live Sources Queried:** `OpenAlex API` + `arXiv Atom API` + `Hugging Face Hub API` + `Kaggle API/BDB2027`
- **Empirical Validation Dataset:** `18,738` 2026 Weeks 1–7 plays (`play_by_play_2026.parquet`) joined with `18,019` FTN charting plays (`ftn_charting_2026.parquet`) and `18,738` participation rows (`pbp_participation_2026_reconstructed.parquet`)

---

## 1. The 12 Active Mathematical Equations Wired Into the 2026 Week 8 Engine

### `EQ-01-SINKHORN-OT` — Sinkhorn-Knopp Entropic Optimal Transport Target Reallocation
- **Engines:** `ARXIV, OPENALEX, HUGGINGFACE`
- **Wired In:** `scripts/ops/gse_coach_mind_simulator.py, scripts/ops/quad_engine_live_edge_researcher.py`
$$
\Pi^* = \arg\min_{\Pi \in U(r,c)} \langle C, \Pi \rangle - \varepsilon H(\Pi), \quad K_{ij} = \exp(-C_{ij}/\varepsilon)
$$

### `EQ-02-DAVIES-NEFF` — Davies Effective Competitors & Non-Linear Injury Load Multiplier
- **Engines:** `OPENALEX, DOCX_OMML`
- **Wired In:** `scripts/ops/load_scaling.py, scripts/ops/generate_slate_writeups.py`
$$
N_{\text{eff}} = \left(\sum_{i=1}^k s_i^2\right)^{-1}, \quad M_{\text{load}} = \operatorname{clip}\!\left(\sqrt{N_{\text{eff,league}} / N_{\text{eff,team}}}, 0.55, 1.60\right)
$$

### `EQ-03-EMPIRICAL-BAYES-BTL` — Empirical Bayes / James-Stein Shrinkage on Small-Sample Team EPA
- **Engines:** `ARXIV, OPENALEX`
- **Wired In:** `scripts/ops/quad_engine_live_edge_researcher.py, scripts/ops/generate_slate_writeups.py`
$$
\hat{\theta}_{\text{EB}} = w_n \bar{y}_{\text{W1..W7}} + (1 - w_n)\mu_0, \quad w_n = \frac{\tau^2}{\tau^2 + \sigma^2/n}
$$

### `EQ-04-QUANTAL-MDP` — Quantal Response Inverse-MDP Coaching Policy (tau = 0.42)
- **Engines:** `ARXIV, OPENALEX`
- **Wired In:** `scripts/ops/gse_coach_mind_simulator.py`
$$
\pi_\tau(a \mid s) = \frac{\exp(Q^*(s,a)/\tau)}{\sum_{a'} \exp(Q^*(s,a')/\tau)}, \quad \tau = 0.42
$$

### `EQ-05-CAUSAL-FTN-SCHEME` — Causal FTN Charting Scheme Treatment Effect Estimator
- **Engines:** `OPENALEX, KAGGLE`
- **Wired In:** `scripts/ops/scheme_effects.py, scripts/ops/quad_engine_live_edge_researcher.py`
$$
\hat{\Delta}_{\text{scheme}}(g) = \sum_{f \in \mathcal{F}} (p_{\text{off},f} - \bar{p}_f)\left(\mathbb{E}[\text{EPA}\mid f=1] - \mathbb{E}[\text{EPA}\mid f=0]\right)
$$

### `EQ-06-TRENCH-HAZARD-FAULT` — Trench Blitz-to-Sack Hazard & QB-Fault vs OL Sack Attribution
- **Engines:** `KAGGLE, ARXIV`
- **Wired In:** `scripts/ops/quad_engine_live_edge_researcher.py, scripts/ops/generate_slate_writeups.py`
$$
h_{\text{sack}}(t) = h_0(t)\exp(\beta_1 \text{Blitz}_{\text{def}} + \beta_2 \text{SackAllowed}_{\text{OL}} - \beta_3 \text{QuickThrow}_{\text{QB}})
$$

### `EQ-07-PINHOLE-JACOBIAN-STRAIN` — Anisotropic Pinhole-Jacobian Spatial Covariance & Cumulative Trench STRAIN
- **Engines:** `KAGGLE, ARXIV`
- **Wired In:** `intelligence/vision/pinhole_jacobian.py, intelligence/vision/skeletrack_v2.py`
$$
R_{\text{field}}(u,v) = J(u,v)\operatorname{diag}(r_u^2, r_v^2)J(u,v)^\top + 10^{-6}I_2, \quad \text{STRAIN}(t) = \sum_{j \in \text{DL}} \frac{v_{\text{close},j}(t)}{d_j(t)^2}
$$

### `EQ-08-HAWKES-TEMPO` — Hawkes Self-Exciting Tempo & No-Huddle Drive Acceleration
- **Engines:** `ARXIV, OPENALEX`
- **Wired In:** `scripts/ops/quad_engine_live_edge_researcher.py`
$$
\lambda(t) = \mu_0 + \sum_{t_i < t} \alpha \exp(-\beta(t - t_i)), \quad \eta = \alpha/\beta
$$

### `EQ-09-SHIN-DEVIG` — Shin (1993) Insider-Trading Market De-Vigging Solver
- **Engines:** `OPENALEX, ARXIV`
- **Wired In:** `scripts/ops/quad_engine_live_edge_researcher.py`
$$
p_i^{\text{Shin}} = \frac{\sqrt{z^2 + 4(1-z)\pi_i^2 / \sum_j \pi_j} - z}{2(1-z)}
$$

### `EQ-10-STUDENT-T-VINE-COPULA` — Student-t Vine Copula Correlated 3-Leg SGP Joint Pricing
- **Engines:** `ARXIV, DOCX_OMML`
- **Wired In:** `scripts/ops/generate_slate_writeups.py`
$$
C_{\Sigma,\nu}(u_1,u_2,u_3) = t_{\Sigma,\nu}\!\left(t_\nu^{-1}(u_1), t_\nu^{-1}(u_2), t_\nu^{-1}(u_3)\right)
$$

### `EQ-11-SPLIT-CONFORMAL` — Split-Conformal Calibrated Win-Probability Prediction Set
- **Engines:** `ARXIV, HUGGINGFACE`
- **Wired In:** `packages/prediction-engine/src/conformal/`
$$
\mathcal{C}_{1-\alpha}(x) = \left[\hat{p}(x) - \hat{q}_{1-\alpha}, \; \hat{p}(x) + \hat{q}_{1-\alpha}\right]
$$

### `EQ-12-DIRICHLET-GPP-PORTFOLIO` — Dirichlet-Multinomial Field Ownership & 20-Max GPP Tail-Maximization
- **Engines:** `ARXIV, KAGGLE, HUGGINGFACE`
- **Wired In:** `scripts/ops/generate_slate_writeups.py, apps/web/app/fantasy/dfs/page.tsx`
$$
\max_{|\mathcal{L}|=20} \mathbb{E}_{w \sim \text{Sim}_{10\text{k}}}\!\left[\max_{\ell \in \mathcal{L}} \sigma\!\left(\frac{\text{Score}(\ell,w) - Q_{0.99}(\text{Field},w)}{\tau_{\text{GPP}}}\right)\right]
$$

---

## 2. League-Wide Causal FTN Scheme Treatment Effects (Measured on 2026 Weeks 1–7, `N = 18,738` Plays)

| Tactical Scheme / Box / Blitz Condition | Plays (`ON`) | Plays (`OFF`) | Mean EPA (`ON`) | Mean EPA (`OFF`) | Causal Treatment Effect ($\hat{\Delta}_{\text{EPA}}$) |
|---|---:|---:|---:|---:|---:|
| **Play Action on Dropbacks** | 1,820 | 6,134 | `+0.0911` | `+0.0543` | **`+0.0368`** |
| **Pre-Snap Motion** | 7,654 | 5,397 | `-0.0010` | `+0.0180` | **`-0.0191`** |
| **Run-Pass Option (RPO)** | 624 | 12,427 | `-0.0850` | `+0.0115` | **`-0.0964`** |
| **Screen Pass** | 669 | 7,285 | `-0.0999` | `+0.0776` | **`-0.1775`** |
| **No-Huddle Tempo** | 826 | 12,225 | `+0.0795` | `+0.0020` | **`+0.0775`** |
| **QB Out of Pocket** | 1,605 | 6,349 | `+0.0417` | `+0.0680` | **`-0.0263`** |
| **Stacked Box (8+) vs Light Box (<=6) on Runs** | 471 | 2,524 | `-0.0276` | `-0.0176` | **`-0.0100`** |
| **Blitz (5+ Rushers) vs Standard 4-Man Rush** | 2,524 | 5,200 | `+0.0001` | `+0.0973` | **`-0.0972`** |

---

## 3. 32-Team Empirical Bayes Shrunk EPA, Blitz Absorption, Light-Box Rush & Sinkhorn-Knopp $N_{\text{eff}}$ Table (2026 Weeks 1–7)

| Team | EB Off EPA/p | EB Def EPA/p | PA EPA/p | Motion EPA/p | vs Blitz (5+) EPA/p | Light-Box Rush EPA/p | Int-Worthy % | QB-Fault Sack % | $N_{\text{eff}}$ | Davies Load Mult | Hawkes $\eta$ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **ARI** | `-0.0205` | `+0.0679` | `+0.085` | `-0.075` | `-0.246` | `-0.023` | 2.31% | 0.66% | **5.71** | `1.139x` | `0.279` |
| **ATL** | `-0.0247` | `-0.0088` | `+0.096` | `-0.003` | `-0.007` | `-0.023` | 3.96% | 1.76% | **6.22** | `1.091x` | `0.186` |
| **BAL** | `+0.0568` | `+0.0101` | `+0.336` | `+0.080` | `+0.340` | `-0.027` | 2.94% | 1.26% | **6.80** | `1.044x` | `0.174` |
| **BUF** | `+0.1295` | `+0.0826` | `+0.327` | `+0.190` | `+0.347` | `+0.115` | 3.45% | 1.97% | **7.48** | `0.995x` | `0.177` |
| **CAR** | `+0.0436` | `+0.0186` | `+0.126` | `+0.145` | `-0.010` | `-0.004` | 1.55% | 0.00% | **7.11** | `1.021x` | `0.212` |
| **CHI** | `+0.0355` | `+0.0013` | `+0.103` | `+0.054` | `+0.214` | `+0.100` | 2.17% | 0.36% | **6.80** | `1.044x` | `0.187` |
| **CIN** | `+0.0711` | `-0.0225` | `+0.074` | `+0.036` | `+0.040` | `+0.087` | 1.27% | 0.85% | **6.82** | `1.042x` | `0.193` |
| **CLE** | `-0.0297` | `-0.0214` | `-0.140` | `+0.042` | `-0.074` | `-0.035` | 2.31% | 2.31% | **6.50** | `1.067x` | `0.165` |
| **DAL** | `+0.0793` | `+0.0957` | `+0.093` | `+0.045` | `+0.021` | `+0.037` | 2.24% | 1.87% | **5.41** | `1.170x` | `0.273` |
| **DEN** | `-0.0234` | `-0.0290` | `-0.052` | `-0.063` | `-0.187` | `-0.147` | 3.39% | 0.85% | **7.74** | `0.978x` | `0.193` |
| **DET** | `+0.0935` | `+0.0894` | `+0.299` | `+0.086` | `+0.379` | `+0.038` | 1.25% | 1.67% | **4.95** | `1.224x` | `0.201` |
| **GB** | `+0.0008` | `-0.0346` | `+0.188` | `+0.018` | `-0.073` | `-0.342` | 3.48% | 2.09% | **6.44** | `1.073x` | `0.236` |
| **HOU** | `+0.0205` | `+0.0234` | `+0.285` | `+0.042` | `+0.291` | `+0.034` | 1.12% | 0.37% | **8.28** | `0.946x` | `0.192` |
| **IND** | `-0.0435` | `+0.0349` | `-0.130` | `-0.027` | `-0.122` | `+0.001` | 5.64% | 0.75% | **7.31** | `1.007x` | `0.165` |
| **JAX** | `+0.0996` | `-0.0191` | `+0.351` | `+0.161` | `+0.140` | `-0.044` | 2.99% | 1.49% | **6.58** | `1.061x` | `0.169` |
| **KC** | `+0.0766` | `-0.0314` | `+0.302` | `+0.021` | `+0.193` | `+0.144` | 2.37% | 0.47% | **7.63** | `0.985x` | `0.124` |
| **LA** | `+0.0431` | `-0.0361` | `+0.092` | `+0.019` | `-0.046` | `+0.126` | 4.05% | 0.68% | **7.17** | `1.016x` | `0.265` |
| **LAC** | `-0.1387` | `-0.0196` | `-0.194` | `-0.286` | `-0.281` | `-0.222` | 5.00% | 1.82% | **11.07** | `0.818x` | `0.202` |
| **LV** | `-0.0028` | `+0.0391` | `+0.254` | `-0.023` | `-0.008` | `-0.242` | 2.46% | 1.41% | **7.12** | `1.020x` | `0.241` |
| **MIA** | `-0.0222` | `+0.0843` | `+0.001` | `-0.067` | `-0.027` | `+0.165` | 2.65% | 2.12% | **7.07** | `1.024x` | `0.150` |
| **MIN** | `-0.0564` | `-0.1161` | `+0.071` | `-0.077` | `-0.170` | `-0.172` | 2.01% | 2.01% | **7.16** | `1.017x` | `0.202` |
| **NE** | `+0.0403` | `+0.0158` | `-0.090` | `+0.018` | `+0.179` | `+0.012` | 3.50% | 0.78% | **9.18** | `0.898x` | `0.127` |
| **NO** | `-0.0221` | `+0.0536` | `+0.300` | `-0.029` | `-0.071` | `-0.162` | 3.03% | 1.35% | **6.55** | `1.063x` | `0.329` |
| **NYG** | `+0.0115` | `+0.0102` | `+0.061` | `+0.070` | `-0.180` | `+0.010` | 3.73% | 3.36% | **5.10** | `1.205x` | `0.231` |
| **NYJ** | `+0.0112` | `+0.0015` | `+0.246` | `-0.086` | `+0.073` | `-0.228` | 2.08% | 0.00% | **7.92** | `0.967x` | `0.174` |
| **PHI** | `-0.0733` | `+0.0761` | `-0.333` | `-0.132` | `-0.270` | `-0.109` | 2.19% | 3.51% | **8.45** | `0.936x` | `0.341` |
| **PIT** | `-0.0293` | `-0.0267` | `+0.229` | `-0.090` | `-0.300` | `+0.026` | 1.72% | 3.10% | **7.05** | `1.025x` | `0.236` |
| **SEA** | `-0.0240` | `-0.0854` | `+0.188` | `-0.078` | `+0.132` | `+0.031` | 3.61% | 3.21% | **5.14** | `1.201x` | `0.159` |
| **SF** | `+0.1181` | `-0.0248` | `+0.106` | `+0.154` | `+0.307` | `+0.102` | 2.59% | 1.29% | **6.69** | `1.052x` | `0.149` |
| **TB** | `-0.0531` | `-0.0710` | `-0.321` | `-0.001` | `-0.177` | `+0.065` | 3.17% | 2.78% | **6.49** | `1.068x` | `0.234` |
| **TEN** | `-0.0826` | `+0.0394` | `-0.457` | `-0.275` | `-0.016` | `+0.056` | 2.15% | 1.72% | **6.37** | `1.078x` | `0.353` |
| **WAS** | `-0.0058` | `+0.0457` | `+0.174` | `+0.057` | `-0.131` | `+0.013` | 0.83% | 1.25% | **8.46** | `0.936x` | `0.232` |

---

## 4. Live Four-Engine Harvest (same run as the tables above)

A `cached_fallback` row means the engine answered with an error and returned nothing. Treat it as a defect to chase, not a result.

| Engine | Items | Fallbacks |
|---|---:|---:|
| OpenAlex | 19 | 0 |
| arXiv | 18 | 0 |
| Hugging Face | 14 | 0 |
| Kaggle | 23 | 0 |
| **Total** | **74** | **0** |

### Live titles returned this run

**arXiv**
- `ARXIV:2011.06014v1` — Football tracking networks: Beyond event-based connectivity (2020)
- `ARXIV:2202.00804v3` — Automatic event detection in football using tracking data (2022)
- `ARXIV:2511.09455v1` — Hand Held Multi-Object Tracking Dataset in American Football (2025)
- `ARXIV:2512.08467v1` — Team-Aware Football Player Tracking with SAM: An Appearance-Based Approach to Occlusion Recovery (2025)
- `ARXIV:1906.01760v3` — Going Deep: Models for Continuous-Time Within-Play Valuation of Game Outcomes in American Football with Tracking Data (2019)

**OpenAlex**
- `OPENALEX:W2926606382` — The Olympic “Revolt” of 1968 and its Lessons for Contemporary African American Athletic Activism (2019)
- `OPENALEX:W3183523428` — Simulating Defensive Trajectories in American Football for Predicting League Average Defensive Movements (2021)
- `OPENALEX:W2617621954` — The future of television : advertising, technology and the pursuit of audiences (2008)
- `OPENALEX:W2115593474` — Practicing Work, Perfecting Play: League of Legends and the Sentimental Education of E-Sports (2022)
- `OPENALEX:W133582637` — Forecasting Success in the National Hockey League Using In-Game Statistics and Textual Data (2014)

**Kaggle**
- `KAGGLE:tombliss/nfl-big-data-bowl-2021-bonus` — Nfl Big Data Bowl 2021 Bonus
- `KAGGLE:aryashah2k/beginners-sports-analytics-nfl-dataset` — Beginners Sports Analytics NFL Dataset
- `KAGGLE:mathurinache/nflbigdatabowl2021-feather-files` — nfl-big-data-bowl-2021 Feather files
- `KAGGLE:dott1718/nfl-big-data-bowl-expected-yards` — NFL Big Data Bowl + expected Yards
- `KAGGLE:jpmiller/nfl-competition-data` — 🏈 NFL Stats for BDB 2024 and Fantasy Football

**Hugging Face**
- `HF:dismalnow/nfl-stats-2021-2025` — HF:dismalnow/nfl-stats-2021-2025
- `HF:nfL6/yahoo_answers_qa` — HF:nfL6/yahoo_answers_qa
- `HF:minmaxxxer/nfl-odds-2026` — HF:minmaxxxer/nfl-odds-2026
- `HF:minmaxxxer/nfl-closing-lines-ats-2025` — HF:minmaxxxer/nfl-closing-lines-ats-2025
- `HF:nfliu/decontextualization` — HF:nfliu/decontextualization

