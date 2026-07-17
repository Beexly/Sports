# Galaxy Genesis — Extended Primary Research Ledger

This file supplements `SOURCE_LEDGER.md` with the research added during the completeness and expansion pass. It records candidate foundations, not automatic dependencies or production approval.

Every candidate requires exact-version, license, security, stack-fit, cost, rights, empirical, and rollback review.

---

# 1. Hardware-aware model and computation compilation

## MLIR

- Official project: https://mlir.llvm.org/
- Purpose: reusable and extensible compiler infrastructure with multiple intermediate representations and lowering across heterogeneous hardware.
- Genesis use: informs a typed Execution IR and staged lowering without forcing one runtime.

## Apache TVM

- Official project: https://tvm.apache.org/
- Purpose: machine-learning compilation, graph and tensor optimization, deployment across diverse hardware.
- Genesis use: candidate for hardware-aware optimization, kernel selection and edge/server portability.

## Microsoft Olive

- Official docs: https://microsoft.github.io/Olive/
- Purpose: hardware-aware model optimization and conversion, including ONNX-oriented workflows.
- Genesis use: candidate transformation profile inside the Hardware-Aware Execution Compiler.

## ONNX Runtime

- Official docs: https://onnxruntime.ai/
- Purpose: cross-platform model execution with hardware execution providers.
- Genesis use: server, browser, mobile and edge portability after semantic-equivalence evaluation.

## ExecuTorch

- Official project: https://pytorch.org/executorch/
- Purpose: PyTorch edge and mobile deployment.
- Genesis use: candidate mobile and edge execution profile.

## Admission caution

Conversion, quantization, compilation or kernel optimization creates a new capability revision. Accuracy, calibration, numerical stability, latency, memory, energy, unsupported operators, rights and rollback must be re-evaluated.

---

# 2. Plan representation and superoptimization

## Substrait

- Official specification: https://substrait.io/
- Purpose: portable, language-neutral descriptions of relational compute plans.
- Genesis use: informs stable Plan IR separation from execution engines.

## egg and egglog

- Official project family: https://egraphs-good.github.io/
- Purpose: e-graphs, equality saturation, Datalog-style analysis and program optimization.
- Genesis use: candidate future plan-equivalence and rewrite engine.

## MLIR equality-saturation research

- Candidate research lane: equality saturation over compiler IR and persistent e-graph representations.
- Genesis use: preserve many equivalent execution strategies before selecting one under policy and cost constraints.

## Boundary

No rewrite system may alter contract semantics, weaken hard policy, hide rejected alternatives, or produce an unexplained plan.

---

# 3. Policy, state-machine, and formal verification systems

## Open Policy Agent

- Official docs: https://www.openpolicyagent.org/docs
- Purpose: separate policy decision logic from enforcement using declarative policy.
- Genesis use: candidate policy engine or reference implementation for capability, rights, authority and plan admission.

## Cedar

- Official site: https://www.cedarpolicy.com/
- Official project: https://github.com/cedar-policy/cedar
- Purpose: fine-grained authorization over principal, action, resource and context, with formal-model and property-testing work.
- Genesis use: candidate typed authorization profile for agents, tools and capability execution.

## TLA+ and Apalache

- TLA+ official: https://lamport.azurewebsites.net/tla/tla.html
- Apalache official: https://apalache-mc.org/
- Purpose: specify concurrent/stateful systems and check safety or liveness properties.
- Genesis use: first targets include task state machines, branch updates, settlement finality, durable workflow transitions and plan-policy enforcement.

## Dafny

- Official site: https://dafny.org/
- Purpose: specification-driven programming with machine-checked proofs.
- Genesis use: selected protected algorithms where executable verification creates material trust value.

## Boundary

Formal proof of a weak or incorrect specification is not correctness. Mutation tests, adversarial cases and specification review remain required.

---

# 4. Metrology and digital-twin credibility

## NIST metrology

- NIST metrology portal: https://www.nist.gov/topics/metrology
- Unified core metrology model: https://doi.org/10.6028/NIST.IR.8530
- Genesis use: canonical concepts for quantities, values, units, traceability, calibration and uncertainty.

## Digital-twin credibility

- NIST digital-twin program: https://www.nist.gov/programs-projects/digital-twins-advanced-manufacturing
- Credibility considerations: https://www.nist.gov/publications/credibility-consideration-digital-twins-manufacturing
- Quality evaluation framework: https://www.nist.gov/publications/overarching-quality-evaluation-framework-additive-manufacturing-digital-twin
- Genesis use: verification, validation, uncertainty quantification, lifecycle quality and intended-purpose credibility for every Galaxy twin.

## Dynamic uncertainty

- NIST dynamic uncertainty protocol: https://www.nist.gov/publications/dynamic-uncertainty-protocol-digital-sensor-networks
- Genesis use: measurements should travel with instantaneous uncertainty and timestamp when feasible.

## Hybrid metrology

- NIST research on combining measurement tools: https://www.nist.gov/publications/combining-model-based-measurement-results-critical-dimensions-multiple-tools
- Genesis use: combine complementary sports instruments without erasing correlations or component uncertainty.

---

# 5. Resilience and controlled fault experimentation

## AWS Fault Injection Service

- Official docs: https://docs.aws.amazon.com/fis/latest/userguide/what-is.html
- Purpose: controlled fault experiments with templates, stop conditions and safety controls.
- Genesis use: AWS profile for the Resilience and Chaos Twin.

## AWS Resilience Hub

- Official docs: https://docs.aws.amazon.com/resilience-hub/latest/userguide/what-is.html
- Purpose: application resilience assessment and recommendations.
- Genesis use: candidate infrastructure resilience evidence and gap discovery.

## Azure Chaos Studio

- Official docs: https://learn.microsoft.com/azure/chaos-studio/chaos-studio-overview
- Purpose: managed chaos engineering and experiment orchestration.
- Genesis use: Azure profile for controlled resilience experiments.

## Principles of Chaos Engineering

- Official principles: https://principlesofchaos.org/
- Genesis use: hypothesis-driven, bounded experiments rather than uncontrolled disruption.

---

# 6. Managed agent and model platforms

## AWS Bedrock AgentCore

- Official docs: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- Candidate capabilities: managed runtime, memory, gateway, identity, browser and code execution, session isolation, observability.
- Genesis destination: AWS agent execution profile.

## Google Vertex AI Agent Engine and ADK

- Vertex AI Agent Builder: https://cloud.google.com/products/agent-builder
- Agent Development Kit: https://google.github.io/adk-docs/
- A2A: https://a2a-protocol.org/
- Candidate capabilities: managed agent deployment, tools, evaluation, observability and interoperability.
- Genesis destination: Google agent execution profile and Agent Civilization protocol layer.

## Microsoft Foundry Agent Service

- Official docs: https://learn.microsoft.com/azure/ai-foundry/agents/overview
- Candidate capabilities: managed runtime, identity, tools, MCP/A2A interoperability, tracing, versioning and evaluation.
- Genesis destination: Azure agent execution profile.

## Hugging Face

- Hub docs: https://huggingface.co/docs/hub/
- Jobs: https://huggingface.co/docs/hub/jobs
- Inference Endpoints: https://huggingface.co/docs/inference-endpoints/
- Spaces: https://huggingface.co/docs/hub/spaces
- Genesis destination: complete Neural Foundry program.

## Boundary

Managed platform does not equal authority. Galaxy Agent Genomes, Capability Genome, policy, proof, data-purpose and promotion decisions remain canonical.

---

# 7. Provenance and intelligence bills of materials

## OpenLineage

- Official site: https://openlineage.io/
- Purpose: dataset, job and run lineage.
- Genesis use: data/process lineage and impact analysis within Cognitive Observability.

## CycloneDX

- Official site: https://cyclonedx.org/
- Purpose: software and extended bills of materials, including machine-learning and operational representations.
- Genesis use: one input to the universal Intelligence BOM.

## SPDX

- Official site: https://spdx.dev/
- Purpose: standardized software package, license and SBOM information; ISO standard lineage.
- Genesis use: package, license and artifact inventory.

## SLSA, Sigstore and in-toto

- SLSA: https://slsa.dev/
- Sigstore: https://www.sigstore.dev/
- in-toto: https://in-toto.io/
- Purpose: build provenance, signing and supply-chain step attestations.
- Genesis use: Capability Firewall and Proof Fabric.

## C2PA

- Official site: https://c2pa.org/
- Purpose: media provenance and content credentials.
- Genesis use: Media Authenticity Ledger.

---

# 8. Context efficiency and semantic observability

## Microsoft LLMLingua

- Official repository: https://github.com/microsoft/LLMLingua
- Purpose: prompt compression research.
- Genesis use: candidate Context Compiler transformation subject to task-specific preservation tests.

## OpenTelemetry GenAI semantic conventions

- Official docs: https://opentelemetry.io/docs/specs/semconv/gen-ai/
- Purpose: standardized model/agent spans and attributes.
- Genesis use: one interoperability layer for Cognitive Observability.

## Privacy boundary

Observability standards do not authorize raw prompt, evidence, personal, licensed, or secret capture. Galaxy defines purpose, minimization, hashing, redaction, local retention and access.

---

# 9. Local-first and encrypted collaboration

## Local-first principles

- Foundational essay: https://www.inkandswitch.com/local-first/
- Genesis use: user ownership, offline operation and collaboration.

## Automerge

- Official project: https://automerge.org/
- Purpose: conflict-free replicated state and offline-first collaboration.
- Genesis use: candidate state synchronization for private journals, Decision Twin, Academy and analyst annotations.

## Keyhive

- Official project: https://www.inkandswitch.com/keyhive/
- Purpose: local-first access control and encrypted collaboration research.
- Genesis use: candidate identity and selective-sharing concepts for protected collaboration.

---

# 10. Quality diversity and open-ended search

## MAP-Elites and quality-diversity research

- Foundational family: quality-diversity algorithms preserving high-performing solutions across behavioral niches.
- Genesis use: maintain diverse models, agents, plans, hypotheses, worlds and interfaces whose value emerges under different regimes.

## POET and open-ended environment-solution coevolution

- Genesis use: Dynasty/Academy and Red Queen research into stepping stones, adversarial worlds and curriculum growth.

## Boundary

Diversity is not an excuse to retain unsafe or rights-invalid capabilities. Hard admission still applies.

---

# 11. Closed-loop planning under partial observability

## Active inference and expected information seeking

- Candidate research: planning that balances goal achievement with uncertainty reduction.
- Genesis use: Cybernetic Governor and Active Sensing research.

## POMDP and belief-state planning

- Candidate research: action selection when the world state is only partially observed.
- Genesis use: contract maintenance, source uncertainty, live game/world state and research planning.

## Model-predictive control

- Candidate research: repeated finite-horizon planning with updated observations and constraints.
- Genesis use: robust closed-loop Metacortex behavior.

## Boundary

These methods must outperform simpler deterministic and Value-of-Information planners on concrete Galaxy tasks before architectural adoption.

---

# 12. Local-to-global consistency

## Sheaf-theoretic data fusion research

- Representative sensor-integration paper: https://doi.org/10.1016/j.inffus.2016.12.002
- Heterogeneous geolocation uncertainty: https://doi.org/10.3390/s20123418
- 2026 risk-analysis application: https://doi.org/10.1111/risa.70206
- Genesis use: research whether local observations, source claims, policies or model outputs can be combined globally and identify obstructions when they cannot.

## Boundary

This is a research candidate. Adoption requires a Galaxy benchmark showing advantage over simpler graph, probabilistic and constraint methods.

---

# 13. Source-use rules

1. Prefer official documentation, primary papers and standards.
2. Record exact version, date, revision, region and license before implementation.
3. Separate author-reported results from Galaxy reproduction.
4. A cloud service, model hub, package or standard is a capability candidate—not a mandate.
5. New dependencies require measurable advantage over existing capability.
6. No source in this ledger authorizes production use, training rights, publication, migration, provider activation or external action.
