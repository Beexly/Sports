# Multi-Domain Corpus & Equations Dossier (Batch 4): `OpenHuman` RLM/Jev Agent Harness, `DeepTutor` Agentic LightRAG Memory, Gutmann's Pen-and-Paper ML (Score Matching, NCE, Factor Graphs, ELBO), Petersen & Zech's Mathematical Theory of Deep Learning, `PaperBanana`, Second-Brain Knowledge Graphs, and Stanford/MIT Algorithms & Calculus

**Date:** `2026-11-02`  
**Bucket:** `docs/arxiv-program/research/2026-11-02/`  
**Doctrines Enforced:** `MIND-FIRST` · `DIRECT-TO-MIND/ENGINE` · `INGEST-AND-LEARN` · `REASONING DOCTRINE` · `THE STACK`  
**Companion Engine Mapping:** [`2026-11-02-OPENHUMAN-RLM-JEV-GUTMANN-NCE-PETERSEN-DL-ENGINE-MAPPING.md`](file:///C:/Users/Garrett/Sports/docs/engine/research/2026-11-02/2026-11-02-OPENHUMAN-RLM-JEV-GUTMANN-NCE-PETERSEN-DL-ENGINE-MAPPING.md)  
**Mind Feed Pipe:** [`nov02_multidomain_corpus_and_equations_feed.jsonl`](file:///C:/Users/Garrett/Sports/brain/feeds/2026-11-02/nov02_multidomain_corpus_and_equations_feed.jsonl)

---

## Executive Inventory of Ingested Batch 4 Corpus

| # | Source / Artifact | Title & Authors | Domain | Status |
|---|---|---|---|---|
| 1 | `https://github.com/tinyhumansai/openhuman` (`42,504` ★) | *OpenHuman: High-Efficiency Rust Agent Harness (500+ Agents on a $10 VPS)* — TinyHumans AI (`@senamakel`) | Recursive Language Model (`RLM`) Token Compression / `Jev` Tool & Memory Routing / Linux-Bus Fault Isolation | **INGESTED & MAPPED** |
| 2 | `https://github.com/HKUDS/DeepTutor` (`54,267` ★) · `arXiv:2604.26962` | *DeepTutor: Towards Agentic Personalized Tutoring* — Bingxi Zhao, Jiahao Zhang, Xubin Ren, Zirui Guo, Tianzhe Chu, **Yi Ma**, **Chao Huang** (HKU Data Intelligence Lab, 2026) | Hybrid `LightRAG` Knowledge Graph + Dynamic Learner Memory / Difficulty-Calibrated Scenario Synthesis (`+29.4%` Agentic Reasoning) | **INGESTED & MAPPED** |
| 3 | `AgriciDaniel/claude-obsidian` (`16,088` ★), `reorproject/reor` (`8,534` ★), `breferrari/obsidian-mind` (`5,481` ★), `ChristianLempa/cheat-sheets` (`4,830` ★), `henrydaum/second-brain` (`678` ★) | **Karpathy LLM-Wiki & Local Vector (`LanceDB`/`QMD`) Second-Brain Architecture** | Immutable Source Provenance / `Ingest -> Connect -> Ask -> Save -> Check` Graph Health / Dual-Generator RAG | **INGESTED & MAPPED** |
| 4 | `clcoding.com` $\to$ `arXiv:2206.13446` | *Pen and Paper Exercises in Machine Learning* — **Prof. Michael U. Gutmann** (Univ. of Edinburgh) | Factor Graph Sum-Product & Max-Sum / HMM Forward-Backward & Viterbi / Hyvärinen Score Matching / Noise-Contrastive Estimation (`NCE`) / Mean-Field `ELBO` (`CAVI`) | **INGESTED & MAPPED** |
| 5 | `clcoding.com` $\to$ `arXiv:2407.18384` | *Mathematical Theory of Deep Learning* — **Prof. Philipp Petersen & Prof. Jakob Zech** (De Gruyter Textbook, 2024/2026) | 3-Pillar Error Decomposition ($\mathcal{E}_{\text{approx}} + \mathcal{E}_{\text{gen}} + \mathcal{E}_{\text{opt}}$) / Yarotsky Compositional DAG Theorem / Neural Tangent Kernel (`NTK`) & Polyak–Łojasiewicz (`PL`) Convergence | **INGESTED & MAPPED** |
| 6 | `clcoding.com` $\to$ `arXiv:2601.23265` | *PaperBanana: Automating Academic Illustration for AI Scientists* — Dawei Zhu, Rui Meng, Yale Song, Xiyu Wei, Sujian Li, Tomas Pfister, Jinsung Yoon (Google Cloud AI / Peking Univ. / Meta, 2026) | Multi-Agent Reference Retrieval $\to$ Content/Style Planning $\to$ VLM Self-Critique Refinement (`PaperBananaBench`) | **INGESTED & MAPPED** |
| 7 | `clcoding.com` $\to$ `mitres_18_001_f17_full_book.pdf` | *Calculus* — **Prof. Gilbert Strang** (MIT OpenCourseWare `RES.18-001`) | Multivariable Chain Rule / Taylor Remainder Theorem / Lagrange Multipliers / Vector Calculus Divergence & Stokes Theorems | **INGESTED & MAPPED** |
| 8 | `clcoding.com` Algorithms, DSA & Kaggle Corpus | **Tim Roughgarden** (*Stanford Algorithms Specialization*), **Imran Ahmad** (*50 Algorithms Every Programmer Should Know*), **GoalKicker** (*Algorithms Notes for Professionals* & *Python Notes for Professionals*), **Konrad Banachewicz & Luca Massaron** (*The Kaggle Book*), `C:\Users\Garrett\Downloads\python-cheatsheet.pdf` | Master Theorem / Dijkstra & Bellman-Ford / Dynamic Programming / Out-of-Fold (`OOF`) Stacking & Leakage-Free Target Encoding | **INGESTED & MAPPED** |

---

## 1. `OpenHuman` (`tinyhumansai/openhuman`) & `DeepTutor` (`HKUDS/DeepTutor`, `arXiv:2604.26962`): Next-Generation Agentic Harness & Hybrid Memory Architecture

### 1.1 `OpenHuman`: Six Systems Equations for Ultra-Low-Overhead Multi-Agent Fleets
Traditional agent harnesses resend the growing transcript and full tool outputs on every turn, incurring $\mathcal{O}(T^2)$ token cost over $T$ turns. `OpenHuman` reduces token consumption by **`2.6x`** and CPU/RAM footprint by **`8x`** (`500+` concurrent agents on a `$10` VPS, `0.1s` cold start) via:
1. **Recursive Language Model (`RLM`) Handle Compression:**
   When a tool returns a payload $O_t$ exceeding token threshold $\tau_{\text{inline}}$, the harness stores $O_t$ in an indexed local memory buffer $\mathcal{B}$ and injects only a compact summary + pointer handle $\langle \text{handle\_id}, \operatorname{Summary}(O_t), \text{schema}\rangle$ into the prompt context $\mathcal{C}_t$:
   $$|\mathcal{C}_t| \le |\mathcal{C}_{t-1}| + \min\big(|O_t|,\, \tau_{\text{inline}}\big)$$
   preserving 100% lossless drill-down via handle queries while preventing context window bloat.
2. **`Jev` Sub-Second Tool & Memory Routing (`86.8%` Top-Pick Accuracy across `1,215` Tools vs. `70.5%` Keyword Search):**
   Instead of loading all $M = 1,215$ tool schemas into the LLM prompt, `Jev` (`~typesafe/jev-latest`) scores candidate tools/passages in `<0.4s` and injects only the top-$k$ active schemas, cutting prefill tokens by an order of magnitude.
3. **Linux System-Bus Plug-In Isolation in Compiled Rust:**
   Every capability (search, document parsing, vector memory, browser control) attaches to a single zero-copy message bus with independent timeout and circuit-breaker isolation.

### 1.2 `DeepTutor` (`HKUDS/DeepTutor`, `arXiv:2604.26962` — Zhao, Ren, Guo, Chu, Yi Ma, Chao Huang)
Couples **Static Dual-Level Graph + Vector Grounding (`LightRAG`)** with **Dynamic Episodic/Skill State Memory**:
- **Dual-Level Retrieval (`LightRAG`):** Queries extract both *low-level specific entities* $\mathcal{V}_{\text{low}}(q)$ (e.g., specific player/injury/CB matchup) and *high-level relational themes* $\mathcal{E}_{\text{high}}(q)$ (e.g., defensive coordinator blitz-vs-screen tendency regime), retrieving the induced subgraph $\mathcal{G}_q = (\mathcal{V}_q, \mathcal{E}_q)$ alongside dense vector chunks.
- **Difficulty-Calibrated Scenario Synthesis & Student/Adversary Simulator (`TutorBench`):** Dynamically calibrates test scenarios to target weakness regions in the agent's current mastery profile, boosting general agentic reasoning across 5 backbone models by **`+29.4%`**.

### 1.3 Karpathy LLM-Wiki Second-Brain Invariant (`claude-obsidian`, `obsidian-mind`, `reorproject/reor`)
Across all five ingested PKM/agent-memory repositories, persistent intelligence obeys a five-stage transactional loop:
1. **Ingest (Immutable Raw Source):** Raw data/papers are preserved untouched so every downstream claim carries an exact file/line citation.
2. **Connect (Graph Linking & MOCs):** Every new note must link to existing concept nodes and update domain Maps of Content (`docs/INDEX.md`, `brain/feeds/`).
3. **Ask (Dual-Generator RAG):** Queries retrieve top-$k$ linked nodes (`LanceDB` / `QMD`) without mutating source files.
4. **Save (Distilled Synthesis):** Verified answers and post-mortem lessons are committed back as first-class graph nodes.
5. **Check (Graph Health Audit):** Automated checks detect orphan nodes, broken links, and untested hypotheses (`UNTESTED — QUEUED FOR EVALUATION`).

---

## 2. Prof. Michael U. Gutmann: *Pen and Paper Exercises in Machine Learning* (`arXiv:2206.13446`, Univ. of Edinburgh)

### 2.1 Unnormalized Energy-Based Models: Score Matching (`Hyvärinen`) & Noise-Contrastive Estimation (`NCE`)
When modeling complex joint distributions over correlated game variables or 9-player DFS lineups, an energy-based model $p_\theta(\mathbf{x}) = \frac{1}{Z(\theta)}\tilde{p}_\theta(\mathbf{x}) = \frac{1}{Z(\theta)}\exp(-E_\theta(\mathbf{x}))$ has an intractable partition function $Z(\theta) = \int \tilde{p}_\theta(\mathbf{x})\,d\mathbf{x}$. Gutmann derives two exact methods that **completely bypass $Z(\theta)$**:
1. **Hyvärinen Score Matching (`SM`):**
   Matching the data score $\bm{\psi}_{\text{data}}(\mathbf{x}) = \nabla_{\mathbf{x}}\ln p_{\text{data}}(\mathbf{x})$ and model score $\bm{\psi}(\mathbf{x}; \theta) = \nabla_{\mathbf{x}}\ln \tilde{p}_\theta(\mathbf{x}) = -\nabla_{\mathbf{x}}E_\theta(\mathbf{x})$ (since $\nabla_{\mathbf{x}}\ln Z(\theta) = \mathbf{0}$!) via integration by parts yields the tractable objective:
   $$J_{\text{SM}}(\theta) = \frac{1}{2}\mathbb{E}_{p_{\text{data}}(\mathbf{x})}\!\left[\big\|\bm{\psi}(\mathbf{x}; \theta)\big\|_2^2 + 2\sum_{i=1}^d \frac{\partial \psi_i(\mathbf{x}; \theta)}{\partial x_i}\right]$$
2. **Noise-Contrastive Estimation (`NCE` — Gutmann & Hyvärinen):**
   Introduces a known reference/noise distribution $p_n(\mathbf{x})$ (e.g., independent de-vigged market marginals!) and treats log-partition $c \approx -\ln Z(\theta)$ as a learnable scalar parameter. Training a logistic discriminator between $T_d$ real joint outcomes and $T_n = \nu T_d$ synthetic independent-marginal draws maximizes:
   $$\mathcal{J}_{\text{NCE}}(\theta, c) = \frac{1}{T_d}\sum_{t=1}^{T_d} \ln h(\mathbf{x}_t; \theta, c) + \frac{\nu}{T_n}\sum_{t=1}^{T_n} \ln\!\big(1 - h(\mathbf{y}_t; \theta, c)\big), \qquad h(\mathbf{u}; \theta, c) = \frac{1}{1 + \nu\frac{p_n(\mathbf{u})}{\tilde{p}_\theta(\mathbf{u})\,e^c}}$$
   At the global maximum, $\tilde{p}_{\hat{\theta}}(\mathbf{x})\,e^{\hat{c}} = p_{\text{data}}(\mathbf{x})$ (self-normalizing without ever integrating over $\mathcal{X}$!).

### 2.2 Factor Graph Sum-Product & Max-Sum Message Passing + Mean-Field `ELBO` (`CAVI`)
1. **Factor Graph Sum-Product (Exact Marginalization on Trees/Polytrees):**
   For $p(\mathbf{x}) = \frac{1}{Z}\prod_{a\in F} f_a(\mathbf{x}_a)$:
   $$\mu_{x\to f_a}(x) = \prod_{b\in \operatorname{ne}(x)\setminus\{a\}} \mu_{f_b\to x}(x), \qquad \mu_{f_a\to x}(x) = \sum_{\mathbf{x}_a \setminus \{x\}} f_a(\mathbf{x}_a) \prod_{y\in \operatorname{ne}(a)\setminus\{x\}} \mu_{y\to f_a}(y)$$
2. **Max-Sum Algorithm (MAP Configuration / Optimal Joint State Sequence):**
   Replacing $(\sum, \times)$ with $(\max, +)$ in log-space:
   $$\gamma_{f_a\to x}(x) = \max_{\mathbf{x}_a \setminus \{x\}} \left[ \ln f_a(\mathbf{x}_a) + \sum_{y\in \operatorname{ne}(a)\setminus\{x\}} \gamma_{y\to f_a}(y) \right], \qquad \gamma_{x\to f_a}(x) = \sum_{b\in \operatorname{ne}(x)\setminus\{a\}} \gamma_{f_b\to x}(x)$$
3. **Coordinate Ascent Variational Inference (`CAVI`) via `ELBO`:**
   $$\ln p(\mathbf{x}) - D_{\text{KL}}\big(q(\mathbf{z}) \,\|\, p(\mathbf{z}\mid \mathbf{x})\big) = \mathbb{E}_{q(\mathbf{z})}\big[\ln p(\mathbf{x}, \mathbf{z})\big] + \mathbb{H}\big(q(\mathbf{z})\big) \implies q_j^\star(z_j) \propto \exp\!\Big(\mathbb{E}_{q_{-j}}\big[\ln p(\mathbf{x}, \mathbf{z})\big]\Big)$$

---

## 3. Prof. Philipp Petersen & Prof. Jakob Zech: *Mathematical Theory of Deep Learning* (`arXiv:2407.18384`, De Gruyter Textbook)

### 3.1 The Fundamental Three-Pillar Error Decomposition
For target Bayes-optimal predictor $f^\star$, hypothesis class $\mathcal{F}_{\text{NN}}$, empirical risk minimizer $f_S^\star \in \arg\min_{f\in\mathcal{F}_{\text{NN}}} \widehat{\mathcal{R}}_S(f)$, and optimization output $\hat{f}_S$:
$$\mathcal{R}(\hat{f}_S) - \mathcal{R}(f^\star) \le \underbrace{\inf_{f\in\mathcal{F}_{\text{NN}}}\big(\mathcal{R}(f) - \mathcal{R}(f^\star)\big)}_{\text{Pillar I: Approximation Error}} + \underbrace{2\sup_{f\in\mathcal{F}_{\text{NN}}}\big|\mathcal{R}(f) - \widehat{\mathcal{R}}_S(f)\big|}_{\text{Pillar II: Statistical Generalization Error}} + \underbrace{\Big(\widehat{\mathcal{R}}_S(\hat{f}_S) - \inf_{f\in\mathcal{F}_{\text{NN}}}\widehat{\mathcal{R}}_S(f)\Big)}_{\text{Pillar III: Optimization Error}}$$

### 3.2 Yarotsky's Theorem & Overcoming the Curse of Dimensionality via Compositional DAGs
- While approximating a general $C^s([0,1]^d)$ function to accuracy $\varepsilon$ requires $\Omega(\varepsilon^{-d/s})$ parameters, if the target function has a **hierarchical compositional DAG structure** $f(\mathbf{x}) = h_L \circ h_{L-1} \circ \cdots \circ h_1(\mathbf{x})$ where each local interaction node depends on at most $d_{\text{eff}} \ll d$ variables (e.g., football trench pressure $\to$ pocket collapse $\to$ coverage window $\to$ completion probability!), deep networks achieve error $\varepsilon$ with complexity scaling in the **local fan-in**:
  $$\text{Parameters}(\mathcal{F}_{\text{DAG-NN}}) = \mathcal{O}\!\left(\sum_{v\in V_{\text{DAG}}} \varepsilon^{-d_{\text{eff}}(v)/s_v} \ln(1/\varepsilon)\right)$$
  completely breaking the exponential curse of dimensionality $d$!

### 3.3 Polyak–Łojasiewicz (`PL`) Condition & Linear Gradient Descent Convergence
Whenever an overparameterized network's Neural Tangent Kernel $\mathbf{\Theta}(\theta)_S = \mathbf{J}_S(\theta)\mathbf{J}_S(\theta)^\top \in \mathbb{R}^{m\times m}$ satisfies $\lambda_{\min}(\mathbf{\Theta}(\theta)_S) \ge \mu_{\text{PL}} > 0$ along the optimization trajectory, the empirical risk satisfies the **Polyak–Łojasiewicz inequality**:
$$\frac{1}{2}\|\nabla_\theta \widehat{\mathcal{R}}_S(\theta)\|_2^2 \ge \mu_{\text{PL}}\big(\widehat{\mathcal{R}}_S(\theta) - \widehat{\mathcal{R}}_S^\star\big) \implies \widehat{\mathcal{R}}_S(\theta_t) - \widehat{\mathcal{R}}_S^\star \le (1 - \eta \mu_{\text{PL}})^t\big(\widehat{\mathcal{R}}_S(\theta_0) - \widehat{\mathcal{R}}_S^\star\big)$$

---

## 4. MIT Calculus (`Gilbert Strang`), Stanford Algorithms (`Tim Roughgarden`), and Kaggle Grandmaster Out-of-Fold Stacking (`The Kaggle Book` — Banachewicz & Massaron)

1. **Constrained Optimization via KKT / Lagrange Multipliers (`Gilbert Strang`, MIT `RES.18-001`):**
   $$\nabla_{\mathbf{x}} f(\mathbf{x}^\star) + \sum_{i=1}^m \lambda_i^\star \nabla_{\mathbf{x}} g_i(\mathbf{x}^\star) + \sum_{j=1}^p \mu_j^\star \nabla_{\mathbf{x}} h_j(\mathbf{x}^\star) = \mathbf{0}, \qquad \mu_j^\star \ge 0,\quad \mu_j^\star h_j(\mathbf{x}^\star) = 0$$
2. **Master Theorem for Divide-and-Conquer Recurrences (`Roughgarden`, Stanford Algorithms):**
   For $T(n) = a\,T(n/b) + \Theta(n^d)$ ($a \ge 1, b > 1, d \ge 0$):
   $$T(n) = \begin{cases} \Theta(n^d) & \text{if } a < b^d \\ \Theta(n^d \log n) & \text{if } a = b^d \\ \Theta(n^{\log_b a}) & \text{if } a > b^d \end{cases}$$
3. **Leakage-Free Out-of-Fold (`OOF`) Stacking & Hierarchical Bayesian Target Encoding (`The Kaggle Book`):**
   - **Out-of-Fold Meta-Feature Construction:** Partition chronological/grouped training folds $F_1, \dots, F_K$. Base model $m$ fits on $D \setminus F_k$ and emits out-of-fold predictions $\hat{p}_{i,m}^{\text{OOF}}$ for $i \in F_k$. The Stage-2 meta-learner fits strictly on $\widehat{\mathbf{P}}^{\text{OOF}} \in \mathbb{R}^{n\times M}$, preventing high-capacity base models (e.g., GBDT/neural nets with near-zero in-sample error) from receiving 100% meta-weight due to in-sample overfitting!
   - **Empirical-Bayes Smoothed Target Encoding for High-Cardinality Categoricals (e.g., QB/Coordinator/Referee IDs):**
     $$\hat{\theta}_c = \frac{n_c\,\bar{y}_c + m_0\,\bar{y}_{\text{global}}}{n_c + m_0}, \qquad w_c = \frac{n_c}{n_c + m_0}$$
     computed strictly out-of-fold / pre-game filtration $\mathcal{F}_{t^-}$.
