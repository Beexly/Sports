# PaperBanana: Automating Academic Illustration for AI Scientists (arXiv:2601.23265)

**Dossier Date:** 2026-10-21  
**Source Repository:** [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana)  
**Authors:** Dawei Zhu et al. (Peking University & Google Cloud AI Research)  
**Corpus Classification:** Class-A Academic Research / Autonomous AI Scientist Infrastructure / Visual Knowledge Synthesis  
**Target GSE Layer:** Layer-2 Omni-Cognitive Reasoning Engine $\to$ Automated Visual Causal Verification & Publication-Grade Proof Generation  

---

## 1. Executive Summary & Problem Formulation

While autonomous AI scientists and large vision-language models (VLMs) have dramatically accelerated literature synthesis, hypothesis generation, and code authoring, the automated generation of publication-ready scientific illustrations (methodology diagrams, causal architecture graphs, and statistical plots) remains a severe manual bottleneck. Standard text-to-image models suffer from text hallucinations, topological distortion of directed graphs, cluttered layout balance, and semantic non-adherence to mathematical definitions.

PaperBanana introduces a reference-driven, multi-agent framework that orchestrates five specialized agents to translate raw scientific text and mathematical formulations into publication-grade, mathematically faithful diagrams and statistical plots with self-critique and iterative refinement.

```
       ┌────────────────────────┐
       │ Raw Scientific Context │
       │  (Method / Causal DAG) │
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │    Retriever Agent     │ <─── Academic Style & Reference Library
       └───────────┬────────────┘
                   │ Top-k Reference Topologies
                   ▼
       ┌────────────────────────┐
       │     Planner Agent      │ <─── Semantic Decomposition & Relational Graph
       └───────────┬────────────┘
                   │ Blueprint $\mathcal{B}$
                   ▼
       ┌────────────────────────┐
       │     Stylist Agent      │ <─── Aesthetic Constraints & Layout Rules
       └───────────┬────────────┘
                   │ Visual Specification $\mathcal{S}$
                   ▼
       ┌────────────────────────┐
       │    Visualizer Agent    │ <─── Rendering Engine (Code / Direct Synthesis)
       └───────────┬────────────┘
                   │ Rendered Visual $\mathcal{I}$
                   ▼
        ┌──────────────────────┐
        │     Critic Agent     │ ───[ Loop if $\mathcal{Q} < \tau$ ]───┐
        └──────────┬───────────┘                                       │
                   │ Feedback & Refinement Vector $\Delta\mathcal{B}$   │
                   │                                                   │
                   └───────────────────────────────────────────────────┘
                   │ Passed ($\mathcal{Q} \ge \tau$)
                   ▼
       ┌────────────────────────┐
       │   Publication-Ready    │
       │    Scientific Asset    │
       └────────────────────────┘
```

---

## 2. Multi-Agent Mathematical Specification

Let $\mathcal{T}$ denote the input scientific text context (e.g., causal specification, model description, or statistical proof). The goal is to generate an optimal publication-grade visual asset $\mathcal{I}^*$ satisfying a 4-dimensional objective:

$$\max_{\mathcal{I}} \mathcal{Q}(\mathcal{I}; \mathcal{T}) = w_F \mathcal{F}(\mathcal{I}, \mathcal{T}) + w_C \mathcal{C}(\mathcal{I}) + w_R \mathcal{R}(\mathcal{I}) + w_A \mathcal{A}(\mathcal{I})$$

where:
1. **$\mathcal{F}(\mathcal{I}, \mathcal{T})$ (Faithfulness):** Exact semantic preservation of variables, causal directions, mathematical operations, and component hierarchies without spurious hallucination.
2. **$\mathcal{C}(\mathcal{I})$ (Conciseness):** Information density maximization subject to clutter avoidance (minimizing non-essential decorative glyphs).
3. **$\mathcal{R}(\mathcal{I})$ (Readability):** Logical visual flow, clear node separation, legible font sizing, and path non-crossing.
4. **$\mathcal{A}(\mathcal{I})$ (Aesthetics):** Publication-grade color harmony, typography hierarchy, and conference/journal layout guidelines.

### Agent Workflow & Equations

1. **Retriever Agent:**
   Given $\mathcal{T}$, the retriever maps $\mathcal{T}$ into structural embedding space $\mathbf{e}_{\mathcal{T}}$ and retrieves the top-$k$ reference illustrations $\mathcal{R}_{\text{ref}} = \{ (\mathcal{T}_i, \mathcal{I}_i) \}_{i=1}^k$ based on graph isomorphism and structural similarity:
   $$\text{sim}_{\text{struct}}(\mathcal{T}, \mathcal{T}_i) = \cos(\mathbf{e}_{\mathcal{T}}^{\text{struct}}, \mathbf{e}_{\mathcal{T}_i}^{\text{struct}})$$

2. **Planner Agent:**
   Extracts entities $\mathcal{V}$, directed relations $\mathcal{E}$, flow hierarchy $\pi$, and communicative intent $\mu$, formulating an abstract blueprint:
   $$\mathcal{B} = \text{Planner}(\mathcal{T}, \mathcal{R}_{\text{ref}}) = \langle \mathcal{V}, \mathcal{E}, \pi, \mu \rangle$$

3. **Stylist Agent:**
   Synthesizes stylistic parameters $\boldsymbol{\theta}_{\text{style}}$ (color palette, aspect ratio, node geometry, line weights) conditioned on conference standards and top retrieved styles:
   $$\mathcal{S} = \text{Stylist}(\mathcal{B}, \mathcal{R}_{\text{ref}})$$

4. **Visualizer Agent:**
   Executes rendering (via precise vector graphics code generation or constrained diffusion synthesis):
   $$\mathcal{I}^{(0)} = \text{Visualizer}(\mathcal{B}, \mathcal{S})$$

5. **Critic Agent (Iterative Convergence Loop):**
   At step $t$, the Critic inspects $\mathcal{I}^{(t)}$ against $\mathcal{B}$ and $\mathcal{T}$, producing a structured error vector:
   $$\boldsymbol{\epsilon}^{(t)} = \text{Critic}(\mathcal{I}^{(t)}, \mathcal{B}, \mathcal{T}) = [ \epsilon_{\text{missed\_nodes}}, \epsilon_{\text{reversed\_edges}}, \epsilon_{\text{illegible\_text}}, \epsilon_{\text{clutter}} ]$$
   If $\|\boldsymbol{\epsilon}^{(t)}\| > \tau$, the blueprint is updated:
   $$\mathcal{B}^{(t+1)} = \mathcal{B}^{(t)} + \nabla_{\mathcal{B}} \mathcal{L}_{\text{critic}}(\boldsymbol{\epsilon}^{(t)})$$
   Iterating until convergence $t \le T_{\max}$.

---

## 3. Grounding into the GSE Omni-Cognitive Architecture

In the Galaxy Sports Edge platform, PaperBanana's multi-agent visual synthesis architecture is ingested to power:

1. **Automated Causal Proof Artifacts:**
   Directly transforms ADMG structures, Tian-Pearl Lemma 2 c-factor trees, and Guo et al. (2025) Doubly-Robust Napkin bounds into publication-grade vector graphics for enterprise audit and public verification ledgers.
2. **Dynamic Calibration & Decomposition Surfaces:**
   Automatically renders Murphy (1973) Brier resolution-reliability graphs, ECE error surfaces, and Venn-Abers calibration bands with publication formatting.
3. **B2B Causal SDK Visual Reports:**
   Powers automated, self-critiqued architectural diagrams for enterprise intelligence deployments across fintech, sports prediction, logistics, and epidemiological verticals.

---

## 4. Verification & Ledger Metadata

- **Branch:** `audit/reconciliation-2026-10-20`
- **Filing Rule Compliant:** `docs/arxiv-program/research/2026-10-21/paperbanana-arxiv-2601-23265-dossier.md`
- **Doctrine Adherence:**
  - `MIND-FIRST`: Full mathematical formulation and multi-agent loss decomposition ingested prior to engine wiring.
  - `INGEST-AND-LEARN`: Research evaluated, cited, and mapped to GSE core visual verification capabilities.
