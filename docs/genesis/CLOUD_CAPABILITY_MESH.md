# Galaxy Genesis — Multi-Cloud Capability Mesh

**Status:** provider-neutral R&D contract. No provider migration or production activation is authorized by this document.

The purpose of the mesh is not to use every cloud. It is to prevent any cloud, model hub, or agent platform from becoming a second Galaxy architecture.

Galaxy semantics remain canonical:

```text
Intelligence Contract
SportsIR
Capability Genome
Policy and Rights Fabric
Assumption Graph
Instrument Credibility
Plan Receipt
Reality Receipt
Codebase Twin
```

Providers supply execution profiles.

---

# 1. Provider-neutral contract

```text
CloudExecutionProfile
  provider
  capabilityFamily
  service
  exactServiceVersionOrApi
  regions
  executionModes
  supportedArtifacts
  identityAndAuth
  networkAndSandbox
  dataResidency
  confidentialExecution
  scaling
  quotas
  latency
  coldStart
  reliability
  observability
  evaluation
  costModel
  credits
  egress
  portability
  rollback
  deprecation
  rightsAndTermsRevision
```

Every provider-specific object maps to a Galaxy Capability Genome and is selected only through a policy-valid Metacortex plan.

---

# 2. Capability matrix

| Capability family | AWS profile | Google profile | Microsoft profile | Hugging Face profile | Local/edge profile |
|---|---|---|---|---|---|
| Foundation models | Bedrock | Vertex AI / Model Garden | Azure AI / Foundry model catalog | Inference Providers / Endpoints | Ollama, llama.cpp, approved local runtimes |
| Agent runtime | AgentCore | Vertex Agent Engine / ADK | Foundry Agent Service | Spaces / custom Jobs / MCP tools | Galaxy Agent Foundry runtime |
| Agent memory | AgentCore memory or approved stores | managed/vector/database profiles | Foundry/approved Azure stores | Hub datasets/buckets where appropriate | local-first and Galaxy-managed memory |
| Tool gateway | AgentCore Gateway | ADK tools, A2A, managed tool integrations | Foundry tools, MCP, Entra-backed services | MCP-enabled Spaces after Foundry admission | Galaxy Foundry Gateway |
| Browser/code sandbox | AgentCore browser/code tools | approved sandbox profiles | Foundry/Container Apps/isolated execution | private Space or Job containers | WASI/component sandbox, container, local worktree |
| Training/tuning | SageMaker | Vertex AI Training | Azure Machine Learning | Jobs, TRL, PEFT | local GPU/CPU laboratory |
| Registry | SageMaker Model Registry / artifact stores | Vertex Model Registry | Azure ML registry | Hub model/dataset repos | Galaxy Capability Genome + artifact store |
| Evaluation | SageMaker/Bedrock evaluations plus Galaxy Combine | Vertex evaluation plus Galaxy Combine | Foundry/Azure ML evaluation plus Galaxy Combine | Evaluate plus Galaxy Combine | promptfoo, custom suites, hidden holdouts |
| Pipeline/workflow | Step Functions, SageMaker Pipelines, Batch | Vertex Pipelines, Dataflow, Workflows | Azure ML Pipelines, Durable Functions, Batch | Jobs and webhooks | Temporal or repo-native durable workflows |
| Inference serving | Bedrock, SageMaker endpoints, Lambda/ECS/EKS | Vertex endpoints, Cloud Run/GKE | managed endpoints, Container Apps/AKS | Inference Endpoints/Providers | ONNX Runtime, ExecuTorch, browser/mobile/edge |
| Relational data | RDS/Aurora | AlloyDB/Cloud SQL/Spanner | Azure SQL/PostgreSQL | not primary | Neon/Postgres/local |
| Streaming/event | Kinesis/MSK/EventBridge | Pub/Sub/Dataflow | Event Hubs/Service Bus | webhooks/Jobs | BullMQ/Redis/local event systems |
| Vector/search | OpenSearch, Aurora/pgvector, Bedrock KB profiles | Vertex Search/vector profiles, AlloyDB/pgvector | Azure AI Search, PostgreSQL/vector | Hub/TEI research profiles | pgvector, Qdrant, txtai, local indexes |
| Graph | Neptune | graph-capable database/profile candidates | Cosmos/graph profiles | dataset representations | SportsIR/graph store selected by evidence |
| Object/artifact storage | S3 | Cloud Storage | Blob Storage | Hub repositories and Storage Buckets | local/object stores |
| Confidential compute | Nitro Enclaves and confidential profiles | Confidential VMs/compute profiles | confidential VMs/containers | external profile only | on-prem/private enclave |
| Identity | IAM/workload roles | IAM/workload identity | Entra/workload identity | tokens/organizations/gated repos | Galaxy identities and local device keys |
| Observability | CloudWatch/X-Ray/OTel | Cloud Logging/Trace/Monitoring/OTel | Azure Monitor/App Insights/OTel | Trackio/endpoint metrics + OTel bridges | Galaxy Cognitive Observability |
| Fault injection | AWS FIS / Resilience Hub | provider-native chaos and controlled test profiles | Azure Chaos Studio | Job/endpoint failure simulations | Galaxy Resilience Twin |
| Infrastructure as code | CDK/CloudFormation or Terraform boundary | Terraform/provider-native boundary | Bicep/ARM or Terraform boundary | API/CLI/repository configuration | repo-native scripts/containers |

This table is a candidate map, not proof that every listed service should be used.

---

# 3. Metacortex selection order

```text
1. contract outputs and temporal cutoff
2. data purpose, rights, privacy and residency
3. authority and security
4. required model/tool/runtime capability
5. proof and observability feasibility
6. reliability and resilience
7. latency, cost, credits, egress and energy
8. portability and rollback
```

No amount of credits can make an ineligible profile valid.

---

# 4. Cloud economics and credits

The Infrastructure Twin attributes:

- cost per Intelligence Contract;
- cost per source, model, agent, simulation and interface;
- storage and egress growth;
- accelerator utilization;
- cache benefit;
- failure and retry cost;
- cost per resolved uncertainty;
- cost per user or enterprise workflow;
- credits consumed versus durable value created.

Credits are used to accelerate experiments whose results remain portable. They are not a reason to build provider-locked architecture without a measured advantage.

---

# 5. Agent platform comparison contract

Every managed agent platform is evaluated on:

```text
framework portability
model portability
tool interoperability
A2A/MCP support
identity
session isolation
memory semantics
sandbox authority
network controls
human review
trace export
cost attribution
evaluation
versioning
rollback
data residency
failure modes
```

Galaxy Agent Genomes and authority rules remain canonical even when execution occurs in AgentCore, Vertex Agent Engine, Microsoft Foundry Agent Service, a Hugging Face environment, or a local runtime.

---

# 6. Model and artifact portability

Preferred portability layers include:

- exact source model and adapter revisions;
- safe artifact formats;
- ONNX where supported;
- provider-neutral input/output contracts;
- deterministic preprocessing;
- Galaxy evaluation suites;
- reproducible containers;
- explicit numerical tolerances;
- rollback to an independently validated incumbent.

A model converted, quantized, distilled, compiled, or hosted by another provider is a new Capability Genome revision and must be evaluated as such.

---

# 7. Data placement

Data is placed according to:

- source and participant rights;
- declared purpose;
- privacy class;
- jurisdiction and residency;
- latency and locality;
- update pattern;
- retention and deletion;
- encryption and key control;
- confidential-compute need;
- cost and egress;
- federation feasibility.

The default is not “copy everything into one cloud.” The default is the smallest lawful movement of data that satisfies the contract.

---

# 8. One control plane per resource

For any infrastructure resource, exactly one system owns desired state. Examples:

- CDK/CloudFormation for a bounded AWS stack;
- Terraform for an explicitly provider-neutral estate;
- Bicep/ARM for a bounded Azure stack;
- provider CLI only for temporary experiments whose state is recorded and later codified.

Two tools do not co-own the same resource simply because both can.

---

# 9. Admission experiment

Before a cloud capability is promoted:

1. define one capability gap;
2. create a minimal isolated experiment;
3. pin service versions, region and configuration;
4. run security, rights, cost, latency and failure tests;
5. compare against current alternatives;
6. emit a Capability and Plan Receipt;
7. prove rollback;
8. record a decision in the work queue.

No broad migration precedes this experiment.
