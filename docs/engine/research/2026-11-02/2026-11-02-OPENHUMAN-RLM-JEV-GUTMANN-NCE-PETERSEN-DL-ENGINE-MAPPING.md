# GSE Engine & DFS Optimizer Architectural Mapping (Batch 4): `OpenHuman` RLM/Jev Context Compression, `DeepTutor` Dual-Level LightRAG Memory, Gutmann NCE & Factor-Graph Max-Sum SGP/DFS Pricing, Petersen Compositional DAG Networks, and Out-of-Fold Stacking

**Date:** `2026-11-02`  
**Bucket:** `docs/engine/research/2026-11-02/`  
**Doctrines Enforced:** `MIND-FIRST` · `DIRECT-TO-MIND/ENGINE` · `WIRE-FIRST SEQUENCING` · `REASONING DOCTRINE` · `THE STACK`  
**Companion Corpus Dossier:** [`2026-11-02-BATCH4-OPENHUMAN-DEEPTUTOR-GUTMANN-PETERSEN-ALGORITHMS-CORPUS-DOSSIER.md`](file:///C:/Users/Garrett/Sports/docs/arxiv-program/research/2026-11-02/2026-11-02-BATCH4-OPENHUMAN-DEEPTUTOR-GUTMANN-PETERSEN-ALGORITHMS-CORPUS-DOSSIER.md)

---

## Executive Mapping: Batch 4 Equations & Systems $\to$ GSE 5-Stage Engine & DFS Optimizer

| Corpus Source | Extracted Mathematical / Systems Operator | Target GSE Module | Concrete Engine / DFS Function |
|---|---|---|---|
| **`OpenHuman` (`tinyhumansai/openhuman`)** | Recursive Language Model (`RLM`) Handle Compression $|\mathcal{C}_t| \le |\mathcal{C}_{t-1}| + \min(|O_t|, \tau_{\text{inline}})$ + `Jev` Sub-Second Tool/Memory Routing (`86.8%` Top-Pick across `1,215` tools) | `C:\Users\Garrett\hermes-jev-skills\jevkit\client.py` & `scripts/ops/gse_coach_mind_simulator.py` | Compresses 1,800-item DraftKings `propBets` feeds and 175-snap PBP logs into searchable RLM handles and routes live snap states through `~typesafe/jev-latest` at `<0.4s` latency. |
| **`DeepTutor` (`HKUDS/DeepTutor`, `arXiv:2604.26962` — Yi Ma & Chao Huang)** | Hybrid `LightRAG` Dual-Level Graph Retrieval ($\mathcal{V}_{\text{low}}(q) \cup \mathcal{E}_{\text{high}}(q)$) + Difficulty-Calibrated Adversarial Scenario Generator (`TutorBench`) | `brain/feeds/` & `packages/mcp-equations-server/src/mcp-cognitive-router.ts` | Pairs specific player/CB entity retrieval ($\mathcal{V}_{\text{low}}$) with macro coaching-scheme theme retrieval ($\mathcal{E}_{\text{high}}$), and stress-tests our pre-snap expectations against adversarial game scripts. |
| **Karpathy LLM-Wiki Second-Brain (`claude-obsidian`, `obsidian-mind`, `reorproject/reor`)** | 5-Stage Transactional Knowledge Loop (`Ingest -> Connect -> Ask -> Save -> Check`) + Local Vector (`LanceDB`/`QMD`) Dual-Generator RAG | `docs/INDEX.md`, `brain/agent-bus/`, & Post-Slate Autopsy Pipeline | Enforces immutable raw-artifact provenance, automatic back-linking into domain Maps of Content, and orphan/untested hypothesis health checks. |
| **Michael U. Gutmann (`arXiv:2206.13446`, *Pen & Paper Exercises in ML*)** | Noise-Contrastive Estimation (`NCE`) $h(\mathbf{u};\theta,c) = \frac{\tilde{p}_\theta(\mathbf{u})e^c}{\tilde{p}_\theta(\mathbf{u})e^c + \nu p_n(\mathbf{u})}$ + Factor Graph Sum-Product & Max-Sum Message Passing | `packages/prediction-engine/src/nfl/sgp-copula.ts` & `packages/dfs-optimizer` | Prices unnormalized multi-leg SGP joint densities directly against independent de-vigged market marginals $p_n(\mathbf{u})$ via NCE without intractable multi-dimensional integration! |
| **Philipp Petersen & Jakob Zech (`arXiv:2407.18384`, *Mathematical Theory of Deep Learning*)** | Yarotsky Compositional DAG Complexity $\mathcal{O}(\sum_{v\in V} \varepsilon^{-d_{\text{eff}}(v)/s_v}\ln(1/\varepsilon))$ + 3-Pillar Error Audit ($\mathcal{E}_{\text{approx}} + \mathcal{E}_{\text{gen}} + \mathcal{E}_{\text{opt}}$) | `packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts` | Structures football reasoning as a low-fan-in compositional DAG (`Trench Pressure -> Pocket Collapse -> Target Depth -> Catch/YAC`) with $d_{\text{eff}} \le 4$ per node to avoid small-sample overfitting in $d=288$ dimensions. |
| **`PaperBanana` (`arXiv:2601.23265`)** | 4-Agent Visual Verification Loop (`Retriever -> Planner -> Renderer -> VLM Self-Critique`) | Post-Slate & Game-Prep Dossier Visualization | Automates verification of statistical plots and architecture diagrams against source numeric tables so visual charts never contradict underlying ledger data. |
| **`The Kaggle Book` (`Banachewicz & Massaron`)** | Chronological Out-of-Fold (`OOF`) Meta-Stacking $\widehat{\mathbf{P}}^{\text{OOF}}$ + Empirical-Bayes Target Smoothing $\hat{\theta}_c = \frac{n_c \bar{y}_c + m_0 \bar{y}_{\text{global}}}{n_c + m_0}$ | `packages/prediction-engine/src/nfl/calibration-map.ts` & `intelligence/coaching/*` | Eliminates meta-learner overfitting when blending ensemble heads and shrinks small-sample coordinator/referee tendencies ($n_c$ games) toward the league prior $\bar{y}_{\text{global}}$. |

---

## 1. Self-Normalizing Multi-Leg SGP Copula Pricing via Noise-Contrastive Estimation (`Gutmann`, `arXiv:2206.13446`)

Pricing a 4-to-6 leg Same-Game Parlay (`SGP`) over mixed discrete/continuous outcomes $\mathbf{u} = (\text{Spread}, \text{Total}, \text{QB Pass Yds}, \text{WR1 Rec Yds}, \text{RB1 Anytime TD})$ with an energy-based interaction model $\tilde{p}_\theta(\mathbf{u}) = \exp(-E_\theta(\mathbf{u}))$ normally requires evaluating a high-dimensional partition function $Z(\theta) = \int \tilde{p}_\theta(\mathbf{u})\,d\mathbf{u}$.

Using **Gutmann & Hyvärinen's Noise-Contrastive Estimation (`NCE`)**, we set the noise distribution $p_n(\mathbf{u})$ equal to the **product of the de-vigged independent market marginals**:
$$p_n(\mathbf{u}) = \prod_{k=1}^K p_{\text{mkt}, k}^{\text{de-vig}}(u_k)$$
Wait—look at what happens to the NCE logistic classifier $h(\mathbf{u}; \theta, c)$ when $p_n(\mathbf{u})$ is the independent market product:
$$\ln \frac{p_{\text{joint}}(\mathbf{u})}{p_n(\mathbf{u})} = \ln \frac{\tilde{p}_\theta(\mathbf{u})\,e^c}{\prod_{k=1}^K p_{\text{mkt}, k}^{\text{de-vig}}(u_k)} = \operatorname{logit}\!\big(h(\mathbf{u}; \theta, c)\big) + \ln \nu$$
- **Exact SGP Correlation Multiplier:** The log-odds of the NCE discriminator trained to distinguish real/simulated joint game trajectories $\mathbf{u} \sim p_{\text{joint}}$ from shuffled independent-marginal draws $\mathbf{y} \sim \prod_k p_{\text{mkt},k}^{\text{de-vig}}$ **is the exact log-copula density (the SGP correlation pricing multiplier)**!
- This gives `sgp-copula.ts` a closed-form, self-normalizing correlation multiplier $\Lambda_{\text{SGP}}(\mathbf{u}) = \frac{p_{\text{joint}}(\mathbf{u})}{\prod_k p_{\text{mkt},k}(u_k)} = \nu \frac{h(\mathbf{u};\theta,c)}{1 - h(\mathbf{u};\theta,c)}$ without any numerical integration!

---

## 2. Factor-Graph Max-Sum Message Passing for Correlated DFS Lineup Skeleton Selection (`Gutmann`, `arXiv:2206.13446`)

A 9-player DraftKings NFL lineup has a tree-structured game-correlation skeleton:
$$\text{Game Environment } G \longrightarrow \text{QB} \longrightarrow \{\text{WR1}, \text{TE1}\} \quad \text{and} \quad G \longrightarrow \text{Bring-Back Opp WR1}$$
By representing the primary 4-man game stack as a factor graph $\mathcal{G} = (V, F)$ with unary salary-adjusted projection potentials $\psi_i(x_i)$ and pairwise JEV co-eruption potentials $\psi_{ij}(x_i, x_j)$ derived from the 10,000 simulated worlds, **Gutmann's Max-Sum Message Passing**:
$$\gamma_{f_a\to x}(x) = \max_{\mathbf{x}_a \setminus \{x\}} \left[ \ln f_a(\mathbf{x}_a) + \sum_{y\in \operatorname{ne}(a)\setminus\{x\}} \gamma_{y\to f_a}(y) \right]$$
computes the exact MAP joint stack configuration in $\mathcal{O}(|F|\,K^2)$ time before passing the locked stack skeleton to the knapsack integer solver!

---

## 3. Breaking the Curse of Dimensionality in 288-Bit Situational Routing via Petersen & Zech's Compositional DAG Theorem (`arXiv:2407.18384`)

Our Stage 3 Cognitive Router (`mcp-cognitive-router.ts`) operates on a $d = 288$-bit context mask across 6 situational families. By Petersen & Zech's **Yarotsky Compositional DAG Theorem**, a flat model over $d=288$ features suffers sample complexity $\mathcal{O}(\varepsilon^{-288/s})$, whereas factorizing the situational overlay into a **2-level Compositional DAG**:
1. **Level 1 (6 Local Family Sub-Aggregators, each of effective dimension $d_{\text{eff}}(f) \le 4$ after spectral cluster orthogonalization):**
   - $h_{\text{press}}(\text{OL-DL mismatch}, \text{Blitz\%}, \text{QuickGame\%}, \text{TimeToThrow})$
   - $h_{\text{wx}}(\text{Wind}, \text{Precip}, \text{Temp}, \text{Surface})$
   - $h_{\text{rest}}(\text{RestDiff}, \text{KarneyTravelDist}, \text{TimeZone}, \text{ShortWeek})$
   - $h_{\text{cov}}(\text{ManZone\%}, \text{Cover1Rate}, \text{YPRR-Split}, \text{CB-Shadow})$
   - $h_{\text{script}}(\text{PROE}, \text{NeutralPace}, \text{TrailPassRate}, \text{RZ-TD\%})$
   - $h_{\text{mkt}}(\text{SteamHawkesIntensity}, \text{TicketMoneySplit}, \text{CLV}, \text{KeyNumber})$
2. **Level 2 (Cholesky-Whitened James–Stein Master Combiner over the 6 orthogonalized family outputs, $d_{\text{eff}} = 6$):**
   reduces the sample-complexity exponent from $d = 288$ to $\max_v d_{\text{eff}}(v) = 6$, explaining mathematically why our hierarchical 6-family architecture generalizes on finite NFL seasons!
