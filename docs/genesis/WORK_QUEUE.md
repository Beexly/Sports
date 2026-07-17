# Galaxy Genesis — Dependency-Ordered Work Queue

## Status vocabulary

```text
READY
BLOCKED_BY_DEPENDENCY
RESEARCH_ONLY
OWNER_GATE
SHADOW
IMPLEMENTED
SUPERSEDED
```

## Authority and completeness

- `COMPLETE_CANON.md` preserves every accepted system.
- `CANON_MANIFEST.json` is the machine-readable lookup layer.
- This file controls implementation sequence.
- A later workstream may not bypass an earlier dependency by building a private substitute.

## Critical spine

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| **GX-000** | Codebase Twin + Metacortex Plan Compiler v0 | current repo + asset recovery | deterministic capability map; one shadow plan compiler; collision report; plan receipt | **READY** |
| **GX-001** | Semantic Provenance and Policy Fabric | GX-000 | canonical provenance, rights-purpose policy and shape-validation contracts | BLOCKED_BY_DEPENDENCY |
| **GX-002** | Incremental Reality Kernel | GX-000, SportsIR, worldlines | dependency-aware invalidation and delta recomputation | BLOCKED_BY_DEPENDENCY |
| **GX-003** | Verified Intelligence Kernel | GX-000 | formal specs for first protected algorithm and policy invariant | BLOCKED_BY_DEPENDENCY |
| **GX-004** | Robust Decision Layer | GX-000, calibration | intervals, conformal sets, ambiguity sets, stability and abstention | BLOCKED_BY_DEPENDENCY |
| **GX-005** | Active Sensing and Experiment Design | GX-004 | value-of-information planner and next-observation recommendations | BLOCKED_BY_DEPENDENCY |
| **GX-006** | Scientific Law Foundry | GX-001, GX-002, GX-004 | symbolic, dynamical, process and causal hypothesis pipeline | BLOCKED_BY_DEPENDENCY |
| **GX-007** | Science-to-Product Compiler | GX-006, Proof Fabric | promoted instrument package for API/UI/Academy/Twin | BLOCKED_BY_DEPENDENCY |

## Repository, context and agent intelligence

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-010 | Full Codebase Twin | GX-000 | precise symbol/data/policy/test/PR graph | BLOCKED_BY_DEPENDENCY |
| GX-011 | Architecture Governor | GX-010 | CI rules for duplicate canonical systems and policy bypasses | BLOCKED_BY_DEPENDENCY |
| GX-012 | Agent Genome and Self-Evolution Tree | Agent Foundry, GX-010 | branch-based agent variants, evals, lineage and promotion | BLOCKED_BY_DEPENDENCY |
| GX-013 | Agent Trace Lab | GX-012 | redacted trace datasets and token/tool efficiency benchmarks | BLOCKED_BY_DEPENDENCY |
| GX-014 | Dynamic Behavioral Eval Factory | GX-012, Failure Atlas | generated scenarios for targeted agent/model behaviors | BLOCKED_BY_DEPENDENCY |
| GX-068 | Context Compiler and Cognitive Cache | GX-010 | workstream-minimal context packages, semantic cache and invalidation | BLOCKED_BY_DEPENDENCY |
| GX-079 | Coherence and Entropy Governor | GX-010, GX-075 | architecture/documentation/policy drift and consolidation recommendations | BLOCKED_BY_DEPENDENCY |

## Neural and data intelligence

The complete accepted Hugging Face queue remains active and is nested here.

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| HF-000 | Current-state and overlap map | GX-000 | no duplicate router/foundry/registry work | BLOCKED_BY_DEPENDENCY |
| HF-001 | Hub Genome | HF-000, GX-001 | model/dataset/Space/paper lineage | BLOCKED_BY_DEPENDENCY |
| HF-002 | Capability Firewall | HF-001, GX-001 | rights/security/runtime admission | BLOCKED_BY_DEPENDENCY |
| HF-003 | Galaxy Combine | HF-002 | sports-native evaluation system | BLOCKED_BY_DEPENDENCY |
| HF-004 | Jobs/Trackio experiment receipts | HF-003 | reproducible research execution | BLOCKED_BY_DEPENDENCY |
| HF-005 | Latent Sports Atlas | HF-003 | shared semantic coordinates across Galaxy | BLOCKED_BY_DEPENDENCY |
| HF-006 | Time-Series Shadow League | HF-003, GX-004 | regime-scored foundation-model tournament | BLOCKED_BY_DEPENDENCY |
| HF-007 | Dataset Genome | HF-001, GX-001 | origin, rights, labels, leakage and use-state | BLOCKED_BY_DEPENDENCY |
| HF-008 | Space Forge and MCP Gateway | HF-002 | mirrored, typed, sandboxed tools | BLOCKED_BY_DEPENDENCY |
| HF-009 | Edge Cortex | HF-003 | approved on-device model profiles | BLOCKED_BY_DEPENDENCY |
| HF-010 | Multimodal Scene Lab | HF-003, GX-001 | media-to-SportsIR research pipeline | BLOCKED_BY_DEPENDENCY |
| HF-011 | Adapter Constellation | HF-003, training-rights approval | adapter manifests and chemistry evaluation | OWNER_GATE |
| HF-012 | Counterfactual Representation Lab | HF-010, Dynasty | paired-world model tests | BLOCKED_BY_DEPENDENCY |
| HF-013 | Model Franchise | HF-003, Model Ecology | roster, chemistry and salary-cap logic | BLOCKED_BY_DEPENDENCY |
| HF-014 | Hugging Face Reflex | HF-001–003 | revision-triggered impact and eval reports | BLOCKED_BY_DEPENDENCY |
| HF-015 | Galaxy Commons | HF-003 | public benchmark/model/dataset/Space program | OWNER_GATE |
| HF-016 | Capability-to-Product compiler | GX-007 | build-ready promotion packets | BLOCKED_BY_DEPENDENCY |

## Data-centric intelligence

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-020 | Evidence and Data Economics | GX-002, evaluation data | marginal source/example/modality contribution | BLOCKED_BY_DEPENDENCY |
| GX-021 | Weak Supervision Factory | GX-001, HF-007 | governed labeling functions and probabilistic labels | BLOCKED_BY_DEPENDENCY |
| GX-022 | Model Mechanism Lab | HF-003 | influence, internal feature and model-difference studies | RESEARCH_ONLY |
| GX-023 | Failure Atlas Expansion | GX-002, HF-003 | cross-model, data, agent and product failure clusters | BLOCKED_BY_DEPENDENCY |
| GX-024 | Negative Knowledge and Resurrection | GX-023 | failed-path memory and reopening triggers | BLOCKED_BY_DEPENDENCY |
| GX-066 | Assumption Graph | GX-001, GX-002 | versioned assumptions, shared-premise detection and blast-radius analysis | BLOCKED_BY_DEPENDENCY |
| GX-072 | Rights, Artifact and Policy Drift Reflex | GX-001, GX-075 | semantic drift detection, lineage impact, quarantine and re-evaluation | BLOCKED_BY_DEPENDENCY |

## Complex systems and scientific instruments

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-030 | Measurement Ontology | GX-001 | constructs, units, validity, uncertainty and versions | BLOCKED_BY_DEPENDENCY |
| GX-031 | Object-Centric Process Intelligence | GX-002, GX-030 | actual-vs-intended sports/user/agent workflows | BLOCKED_BY_DEPENDENCY |
| GX-032 | Complex Sports Dynamics Lab | HF-010, GX-030 | temporal hypergraph, point-process, topology and transport studies | BLOCKED_BY_DEPENDENCY |
| GX-033 | Causal Transportability | GX-004, GX-006 | explicit cross-season/league/sport transfer contracts | BLOCKED_BY_DEPENDENCY |
| GX-034 | Anytime-Valid Research Ledger | existing trials registry, GX-006 | sequential evidence and multiple-testing governance | BLOCKED_BY_DEPENDENCY |
| GX-035 | Living Evidence Synthesis | Research Cortex, GX-001 | continuously updated claim/replication graph | BLOCKED_BY_DEPENDENCY |
| GX-067 | Galaxy Metrology Institute | GX-001, GX-030 | Instrument Credibility Records, traceability, V&V and UQ | BLOCKED_BY_DEPENDENCY |
| GX-080 | Global Consistency and Contextuality Lab | GX-030, GX-066, GX-067 | evaluated local-to-global consistency and obstruction methods | RESEARCH_ONLY |

## World and human twins

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-040 | Multi-Fidelity World Foundry | Dynasty + GX-005 | escalation from analog to high-fidelity simulation | BLOCKED_BY_DEPENDENCY |
| GX-041 | Multiverse Semantics | Branching Reality, GX-004 | observed, epistemic, intervention, adversarial and synthetic worlds | BLOCKED_BY_DEPENDENCY |
| GX-042 | Sim-to-Real Calibration | GX-040, GX-033 | transfer measurements and gap tracking | BLOCKED_BY_DEPENDENCY |
| GX-043 | Athlete / Human Performance Twin | GX-067, privacy program | biomechanics, load, recovery and participatory design | OWNER_GATE |
| GX-044 | Decision Twin v2 | GX-004, local-first state | calibrated belief updating and Academy curriculum | BLOCKED_BY_DEPENDENCY |
| GX-045 | Organizational and Incentive Twin | GX-023 | agent/user/contributor incentive risk modeling | BLOCKED_BY_DEPENDENCY |
| GX-076 | Sports Economy and Institutional Twin | GX-041, GX-045 | leagues, roster markets, rules, incentives, media and regulation | RESEARCH_ONLY |

## Execution, optimization, privacy and proof

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-050 | Capability Sandbox | GX-001 | typed permission-scoped execution components | BLOCKED_BY_DEPENDENCY |
| GX-051 | Local-First Personal Intelligence | GX-044, privacy design | offline user-owned state and mergeable secure sync | OWNER_GATE |
| GX-052 | Edge Swarm | GX-050, HF-009, GX-070 | capability negotiation and inference escalation | BLOCKED_BY_DEPENDENCY |
| GX-053 | Private Intelligence Federation | GX-001, GX-050 | participant data contracts and secure computation | OWNER_GATE |
| GX-054 | Proof Fabric | GX-001–003 | artifact, computation and temporal proof contracts | BLOCKED_BY_DEPENDENCY |
| GX-055 | Media Authenticity Ledger | GX-001, HF-010 | source/edit/generation provenance for media | BLOCKED_BY_DEPENDENCY |
| GX-069 | Metacortex Plan Superoptimizer | GX-000, GX-001 | equivalent-plan rewrites, hard constraint solving and Pareto selection | BLOCKED_BY_DEPENDENCY |
| GX-070 | Hardware-Aware Execution Compiler | GX-050, GX-069 | validated placement/optimization across CPU/GPU/TPU/NPU/browser/mobile/cloud | BLOCKED_BY_DEPENDENCY |
| GX-071 | Resilience and Chaos Twin | GX-000, GX-075 | controlled failure scenarios and honest-degradation evidence | BLOCKED_BY_DEPENDENCY |
| GX-073 | Multi-Cloud Capability Mesh | GX-001, GX-069 | provider-neutral AWS/Google/Azure/HF/local execution profiles | BLOCKED_BY_DEPENDENCY |
| GX-075 | Cognitive Observability Fabric | GX-000, GX-054 | contract-to-outcome semantic traces with privacy controls | BLOCKED_BY_DEPENDENCY |
| GX-078 | Cybernetic Governor | GX-005, GX-069, GX-075 | closed-loop belief, observation, action and replanning research | RESEARCH_ONLY |

## Product and ecosystem

| ID | Workstream | Dependency | Output | Status |
|---|---|---|---|---|
| GX-060 | Interface Genome | GX-007 | approved question-native component vocabulary | BLOCKED_BY_DEPENDENCY |
| GX-061 | Comprehension Evaluation | GX-060, Product Twin | tests of uncertainty/source/causal understanding | BLOCKED_BY_DEPENDENCY |
| GX-062 | Dynamic Interface Compiler | GX-060–061 | contract-to-accessible-interface plan | BLOCKED_BY_DEPENDENCY |
| GX-063 | Epistemic Contribution Market | GX-020, GX-034 | contribution scores, bounties and negative-result credit | OWNER_GATE |
| GX-064 | Benchmark and Bounty Network | GX-023, GX-034 | rights-clean public/private challenges | OWNER_GATE |
| GX-065 | Galaxy Research Commons | GX-035, HF-015 | public research institution and contribution program | OWNER_GATE |
| GX-074 | Quality-Diversity Research Archive | GX-023, GX-006 | diverse high-performing models, hypotheses, agents, plans and worlds | BLOCKED_BY_DEPENDENCY |
| GX-077 | Capability Recombinator | GX-001, GX-020, GX-024 | constrained cross-domain capability combination and experiment proposals | BLOCKED_BY_DEPENDENCY |

# Sequencing law

No later workstream may bypass an earlier canonical dependency by creating a private substitute.

Examples:

- no new model registry before HF-001;
- no dynamic UI before Interface Genome and comprehension evals;
- no fine-tuning before Dataset Genome, training-rights clearance and Combine;
- no causal product claim before Causal Constitution and transportability;
- no external plugin execution before Capability Sandbox;
- no contributor rewards before Data Economics and anytime-valid ledger;
- no Athlete Twin production path without privacy, instrument credibility and owner approval;
- no cloud migration before GX-073 defines the provider-neutral capability contract;
- no model conversion or quantization in production before GX-070 verifies semantic equivalence;
- no chaos experiment against production without explicit owner authorization;
- no assumption-sensitive science without GX-066 lineage;
- no promoted metric without GX-067 credibility evidence.

# Current action

Execute only `GX-000`.
