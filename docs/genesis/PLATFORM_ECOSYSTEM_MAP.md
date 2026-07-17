# Galaxy Genesis — Additional Platform and Program Ecosystem Map

This map widens the execution and research net beyond GitHub, Hugging Face, AWS, Google Cloud and Microsoft Azure. It includes only ecosystems that fill a precise Genesis capability gap.

Nothing here is an adoption mandate. Each entry must pass the Capability Genome, Firewall, Combine, Metacortex, cost and rollback process.

---

# 1. NVIDIA ecosystem

| Program | Genuine Galaxy value | Destination | Admission question |
|---|---|---|---|
| Triton Inference Server | multi-framework model serving, dynamic/sequence batching, ensembles, audio/video streaming, metrics, cloud/edge deployment | Hardware-Aware Execution Compiler; Multimodal Scene Lab | Does it materially outperform a simpler endpoint for the selected workload and hardware? |
| TensorRT / TensorRT-LLM | optimized NVIDIA inference, lower precision and specialized kernels | Execution Compiler | Does the converted artifact preserve outputs, calibration and supported regimes within declared tolerances? |
| NeMo Export-Deploy | export Hugging Face/NeMo models to optimized serving paths including Triton and Ray Serve | Neural Foundry deployment profile | Does it simplify a validated model path without creating format or provider lock-in? |
| NIM | packaged GPU inference services | Multi-Cloud Capability Mesh | Are cost, license, model revision, telemetry and portability acceptable? |
| RAPIDS / cuDF / cuGraph | GPU-accelerated tabular, graph and data processing | Research Grid; Latent Sports Atlas; graph experiments | Is dataset scale sufficient to justify GPU and operational complexity? |
| Cosmos world foundation models | controllable synthetic physical-world generation and understanding | Multi-Fidelity World Foundry | Can a rights-clean sports benchmark establish useful sim-to-real transfer? |
| Omniverse / Isaac ecosystem | simulation, digital twins and synthetic data | Dynasty Studio / World Foundry | Does the required sports fidelity and licensing justify the platform? |

NVIDIA is an accelerator and simulation profile, not the owner of Galaxy’s model, world or proof semantics.

---

# 2. Cloudflare ecosystem

Galaxy already uses or investigates Cloudflare-adjacent capabilities. The platform can become a low-latency edge profile when measured value exists.

| Program | Genuine Galaxy value | Destination | Boundary |
|---|---|---|---|
| Workers | global TypeScript/WASM edge execution | Scout Nodes; public read projections; low-latency APIs | CPU, runtime and platform limits must fit the task; no protected policy bypass |
| Workers AI | serverless GPU inference and open-model catalog | edge model execution profile | model, price, region, terms and Galaxy Combine performance verified per use |
| AI Gateway | caching, rate limiting, retries, fallback and model-call observability | provider gateway candidate | existing provider dispatch remains canonical until comparative evaluation |
| Durable Objects | strongly consistent state colocated with compute; WebSocket coordination | Intelligence Contract instances, Scout sessions, collaborative/real-time Twin state candidate | state semantics, residency, cost and migration must be explicit |
| Workflows | durable multistep execution, retries, waits, human approval and observability | Evidence Mission runtime candidate | compare with Temporal/BullMQ/current workflows before adding another orchestrator |
| Vectorize | globally distributed vector search | Latent Sports Atlas edge retrieval candidate | benchmark against pgvector/local/Qdrant and data residency |
| R2 | object storage with low/zero egress characteristics | media shards, public artifacts, intermediate storage candidate | rights, retention, lifecycle and current storage economics decide |
| Browser Rendering | managed browser execution | authorized Research Lens acquisition profile | every target still passes source clearance; browser capability does not legalize access |
| Sandbox / Dynamic Workers | isolated code execution | Capability Sandbox research | still requires capability allowlist, network control, secret isolation and proof |
| Agents SDK | stateful edge agents and tool approval | Agent Civilization execution profile | Galaxy Agent Genome and authority remain canonical |

---

# 3. Open-source serving and distributed execution

| Program | Genuine Galaxy value | Destination | Boundary |
|---|---|---|---|
| Ray Serve | programmable model composition, autoscaling, multi-model and distributed LLM serving | model serving execution profile | avoid until workload requires distributed composition beyond current endpoints |
| KServe | standardized Kubernetes inference, canary rollout, inference graphs, autoscaling and multi-framework protocols | self-hosted inference profile | requires Kubernetes operational justification and security review |
| NVIDIA Triton | optimized multi-framework inference and streaming | accelerator serving profile | compare with Ray/KServe/provider endpoints; no duplicate control plane |
| vLLM / SGLang class runtimes | high-throughput open-model inference | local/cloud model profile | exact model support, quality, memory and operational evidence required |
| Temporal | durable workflows that resume after failure | Evidence Mission and long-running research execution profile | compare with current BullMQ/Redis and cloud workflow options; one owner per workflow |
| Flyte / Kubeflow / Dagster / Prefect class systems | data/ML workflow orchestration | Research Grid candidates | adopt only if experiment and data workflows outgrow simpler repo-native execution |

---

# 4. Data and ML lifecycle systems

| Program | Genuine Galaxy value | Destination | Boundary |
|---|---|---|---|
| Apache Iceberg | table snapshots, time travel, branches/tags, schema/partition evolution | bitemporal research lake and experimental data branches | current Postgres/object-store scale may not justify adoption yet |
| lakeFS | Git-like versioning and isolated data-lake branches | Dataset Genome and research experiment branching | evaluate when large object datasets need atomic data branches |
| MLflow | experiment tracking, model/agent evaluation, registry, tracing and gateway functions | Research Grid / Combine candidate | do not create a second canonical model registry or observability system |
| Feast | point-in-time-correct feature definitions, offline/online serving and feature registry | future production feature layer | existing as-of store and prediction engine are canonical until a gap is proven |
| DVC class systems | code-linked data and experiment versioning | small/medium local research workflows | rights and object-store scale determine fit |
| Delta Lake / similar table formats | transactional analytic data and time travel | research-lake candidate | compare with Iceberg and existing storage; one table standard per bounded estate |
| OpenLineage | run/job/dataset lineage | Cognitive Observability | map into Galaxy semantic IDs rather than running a separate truth graph |

---

# 5. Identity, secrets and workload trust

| Program family | Genuine Galaxy value | Destination |
|---|---|---|
| SPIFFE / SPIRE | portable workload identity across heterogeneous infrastructure | Capability Sandbox and Multi-Cloud Mesh |
| HashiCorp Vault / cloud secret managers | short-lived credentials, policy-scoped secret access | capability execution profiles |
| confidential containers and enclaves | attested execution near protected data | Private Intelligence Federation |
| Sigstore / in-toto / SLSA | signed artifact and build provenance | Proof Fabric and Capability Firewall |
| SPDX / CycloneDX | software, model, data and operational bills of materials | Intelligence BOM |

Secrets are never embedded in Capability Genomes, traces, prompts or receipts. They are referenced through identity and policy-mediated handles.

---

# 6. Scientific and knowledge platforms

| Program | Genuine Galaxy value | Destination |
|---|---|---|
| OpenAlex | broad scholarly graph of works, authors, institutions, topics and datasets | Research Cortex discovery graph |
| Semantic Scholar | citations, recommendations, paper/author metadata and embeddings | research retrieval and claim-lineage candidate |
| OpenReview | peer-review discussions, decisions and revision history | Living Evidence and critique lineage |
| OpenML | standardized tasks, datasets, runs and benchmark suites | Galaxy Combine and Benchmark Network |
| Kaggle class competitions | external challenge participation and public benchmark culture | Benchmark and Bounty Network, subject to dataset rights |
| standards organizations | semantic, security, provenance, identity and domain standards | Research Cortex and Policy Fabric |
| patent and government-data systems | prior art, public measurements, regulation and open data | Unknown-Unknown Radar and Institutional Twin |

---

# 7. Program adoption scorecard

A platform or program receives no workstream until the following are explicit:

```text
Capability gap
Existing alternative
Measurable advantage sought
Minimum experiment
Data and rights impact
Security and identity model
Semantic mapping
State ownership
Observability
Cost and credits
Operational burden
Portability
Rollback
Failure modes
Owner gates
```

A platform that offers many features but solves no current dependency-ready gap remains a research candidate.
