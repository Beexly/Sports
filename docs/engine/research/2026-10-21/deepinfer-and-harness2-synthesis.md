# DeepSeek DeepInfer & Google Research Harness² Architectural Synthesis

**Date:** 2026-10-21  
**Author:** Galaxy Sports Edge (GSE) Engineering Fleet  
**Classification:** CITABLE_VERIFIED / CLASS-A ARCHITECTURAL SYNTHESIS  
**Governing Doctrines:** `INGEST-AND-LEARN`, `MIND-FIRST`, `DIRECT-TO-MIND/ENGINE`, `REASONING DOCTRINE`  
**Sources:**  
- `https://github.com/deepseek-ai/DeepInfer` (DeepSeek AI, Apache 2.0)  
- `https://github.com/google-research/harness2` (Google Research & Northwestern University, Apache 2.0)

---

## 1. Executive Summary & Paradigm Shift

The release of **DeepSeek DeepInfer** (`deepseek-ai/DeepInfer`) and **Google Research Harness²** (`google-research/harness2`) represents a dual inflection point for high-performance agentic systems:

1. **Inference Acceleration via DeepInfer:** Solves the mechanical bottleneck of low-latency token generation, KV-cache scaling, and speculative verification on massive Mixture-of-Experts (MoE) architectures through **FlashMLA**, **EPLB**, and **DSpark** (confidence-scheduled speculative decoding).
2. **Agent Harnessing via Harness²:** Solves the cognitive adaptation bottleneck by demonstrating that **model weights can remain completely frozen** while the entire agent harness—prompts, tools, memory, guardrails, skills, and validation rules—is recursively optimized through a **Contrastive Propose-Probe-Compose (PPC)** loop without requiring ground-truth labels.

Within the Galaxy Sports Edge (GSE) architecture, these two repositories provide the definitive blueprints for:
- Accelerating live game-day Monte Carlo and tactical play-by-play simulations (sub-10ms latency).
- Autonomously evolving agent skills and integrity guardrails across rolling NFL/sports slate lifecycles.

---

## 2. DeepSeek DeepInfer: Mathematical & Engineering Architecture

DeepInfer is DeepSeek's production-grade offline inference engine designed for large MoE models (DeepSeek-V4.1-Flash) running on advanced accelerator clusters (NVIDIA SM100 / Blackwell and Ascend 950 NPUs).

### 2.1 Multi-Head Latent Attention (FlashMLA)
Traditional Multi-Head Attention (MHA) or Grouped-Query Attention (GQA) maintains separate Key ($K$) and Value ($V$) tensors across all sequence lengths and layers, creating massive memory bandwidth bottlenecks:
$$\text{Memory}_{\text{KV}} = 2 \cdot L \cdot N \cdot H_{\text{kv}} \cdot d_k$$
FlashMLA projects Key and Value heads into a compressed low-rank latent vector $\mathbf{c}_t^{\text{KV}} \in \mathbb{R}^{d_c}$ (where $d_c \ll H \cdot d_k$):
$$\mathbf{c}_t^{\text{KV}} = \mathbf{x}_t \mathbf{W}_{\text{DKV}}$$
$$\mathbf{k}_t^C = \mathbf{c}_t^{\text{KV}} \mathbf{W}_{\text{UK}}, \quad \mathbf{v}_t^C = \mathbf{c}_t^{\text{KV}} \mathbf{W}_{\text{UV}}$$
Decoupled Rotary Position Embedding (RoPE) is applied exclusively to an auxiliary coordinate vector $\mathbf{k}_t^R$, allowing the KV cache to store only the compressed vector $\mathbf{c}_t^{\text{KV}}$ and $\mathbf{k}_t^R$, achieving a **4x to 6x reduction in KV cache footprint**.

### 2.2 Expert Parallelism Load Balancer (EPLB)
In Wide MoE architectures with dozens or hundreds of routed experts, token load imbalance causes severe straggler penalties across GPU ranks. DeepInfer introduces EPLB, which:
1. Re-allocates expert replicas dynamically across ranks based on observed routing frequencies $f_e$.
2. Decomposes high-frequency experts into multiple parallel worker ranks.
3. Quantifies load balancing through routing entropy:
   $$H(\mathbf{w}) = -\sum_{e=1}^E w_e \log w_e$$
   Maximizing entropy subject to capacity bounds ensures uniform compute utilization.

### 2.3 DSpark: Confidence-Scheduled Speculative Decoding
Speculative decoding uses a lightweight draft model $q(x)$ to propose a block of $\gamma$ draft tokens, which are verified in parallel by the target model $p(x)$. Standard speculative decoding uses a fixed draft length $\gamma$.

DeepInfer's **DSpark** introduces **confidence-scheduled dynamic horizons**:
$$\gamma_t = \text{clamp}\left( \left\lfloor \gamma_{\max} \cdot \left(1 - \frac{H(p_t)}{H_{\max}}\right) \right\rfloor, 1, \gamma_{\max} \right)$$
When target entropy $H(p_t)$ is low (high confidence / deterministic execution), DSpark speculates aggressively ($\gamma = 6\text{--}8$ tokens). When entropy is high (critical branching points), it contracts to $\gamma = 1$, preventing wasted speculative compute.

Acceptance criteria follows modified Leviathan et al. sampling:
$$\alpha_i = \min\left(1, \frac{p(x_i \mid x_{<i})}{q(x_i \mid x_{<i})}\right)$$

---

## 3. Google Research Harness²: Recursive Agent Harnessing

Harness² departs fundamentally from weight fine-tuning. It establishes that an agent's reasoning capability is largely determined by its **harness** (the structured scaffolding mediating between the frozen LLM and the real-world environment).

### 3.1 The Frozen-Model Scaffolding Hypothesis
Let $\mathcal{M}_\theta$ denote a frozen foundation model. The agent's policy $\pi$ is parameterized by its harness $\mathcal{H}$:
$$\pi(y \mid x) = \mathcal{M}_\theta\left( \text{Prompt}(\mathcal{H}), \text{Tools}(\mathcal{H}), \text{Memory}(\mathcal{H}), \text{Guardrails}(\mathcal{H}) \right)$$
Rather than computing $\nabla_\theta \mathcal{L}$, Harness² searches the combinatorial space of harnesses:
$$\mathcal{H}^* = \arg\max_{\mathcal{H} \in \boldsymbol{\mathcal{H}}} \mathbb{E}_{x \sim \mathcal{D}} \left[ \mathcal{R}(\pi_{\mathcal{H}}(x)) \right]$$

### 3.2 Contrastive Propose-Probe-Compose (PPC) Loop
The core execution engine of Harness² runs three deterministic stages:
```
           +---------------------------------------------+
           | 1. PROPOSE                                  |
           | Mutation operators: Prompt, Tools, Gates   |
           +----------------------+----------------------+
                                  |
                                  v
           +---------------------------------------------+
           | 2. PROBE                                    |
           | Contrastive behavioral probes (No Labels)   |
           +----------------------+----------------------+
                                  |
                                  v
           +---------------------------------------------+
           | 3. COMPOSE                                  |
           | Synthesize verified mutations into harness  |
           +---------------------------------------------+
```

1. **Propose:** Generates candidate harness mutations $\mathcal{H}' \in \text{Mutations}(\mathcal{H})$:
   - Tool signature refinement (adding parameter constraints, clarifying docstrings).
   - Gate threshold tightening (preventing hallucinations, enforcing sanity bounds).
   - Memory retrieval scoping (injecting contrastive counter-examples).
2. **Probe:** Subject candidate harnesses $\mathcal{H}$ and $\mathcal{H}'$ to behavioral probes across synthetic or historical test scenarios. Probe scores evaluate:
   - Tool call correctness rate $\rho_{\text{tool}}$.
   - Constraint violation rate $\rho_{\text{viol}}$.
   - Reasoning step economy $\frac{1}{\text{steps}}$.
3. **Compose:** High-performing mutations that pass all falsification probes are merged into the persistent harness via structured composition rules.

### 3.3 Dual Recursion
- **Inner Recursion (Task-Level):** Iteratively adapts the harness within an active session until the objective passes verification.
- **Outer Recursion (Cross-Session):** Consolidates successful harness adaptations into permanent meta-memory and skill trees for all future fleet runs.

---

## 4. GSE Omni-Cognitive World Model Integration

We integrate these paradigms directly into GSE:

1. **DeepInfer DSpark Speculator (`packages/prediction-engine/src/inference/deepinfer-dspark-speculator.ts`):**
   - Drives fast Monte Carlo game simulations.
   - Evaluates play-by-play decision trajectories using confidence-scheduled draft horizons.
   - Employs FlashMLA-style latent state compression for drive outcome rollouts.

2. **Harness² Propose-Probe-Compose Engine (`packages/prediction-engine/src/continual/harness2-propose-probe-compose.ts`):**
   - Systematically refines GSE agent harnesses (thresholds, gate rules, router skill trees) without model retraining.
   - Runs contrastive behavioral probes against historical betting boards to ensure zero calibration inversions.
