# Brev / NVIDIA Skills Deep-Dive — Lane 1: Agent Infrastructure

Researched 2026-09-24 (read-only, public docs + skill SKILL.md files). No pricing invented: anything not published is marked UNVERIFIED.

## Cost baseline that applies to almost every skill here

- **NVIDIA Build hosted endpoints** (`https://integrate.api.nvidia.com/v1`, OpenAI-compatible): free developer tier, no credit card. NVIDIA staff on the dev forums say trial usage is rate-limit-governed, community baseline **~40 RPM per key** (per-model, traffic-dependent); older docs mention 1,000–5,000 signup credits but the current scheme is rate-limit, not credit-metered. Explicitly **dev/eval only** — production user traffic needs NVIDIA AI Enterprise. Garrett already holds an `nvapi-` key (verified live 2026-09-11).
- **Brev GPU/CPU burn**: Brev is per-hour VM billing. I could NOT verify official per-GPU-hour rates from NVIDIA-published sources (third-party comparison sites claim $0.04/hr for CPU-tier instances — treat as UNVERIFIED). Garrett sees the real numbers in his Brev console. All GPU-hour costs below are therefore framed as "one GPU × hours you leave it on," with caps named, not priced.
- **Skills themselves are free**: every skill here is Apache-2.0 / CC-BY open source (github.com/NVIDIA/skills, github.com/NVIDIA-AI-Blueprints, github.com/ai-dynamo/dynamo, github.com/NVIDIA/NemoClaw).

---

## 1. nemo-rl-session-memory (Developer +4, 2K)

**What it does.** Not a server or GPU thing at all — it's an agent *workflow playbook*: keep a durable, human-readable session record in a repo-local `session/<timestamp>/` directory with four files — `session_state.md` (goal, subtask, plan, blockers, next actions), `timeline.md` (append-only action log), `files.md` (what was inspected/changed and why), `handoff.md` (resume instructions for the next agent). Checkpoint periodically; resume by reading the latest three files. Source: https://github.com/NVIDIA/skills/blob/main/skills/nemo-rl-session-memory/SKILL.md

**Deploy on Brev.** Nothing to deploy — it installs into the *agent's* skills directory (e.g. `npx -y skills add nvidia/skills --skill nemo-rl-session-memory --agent claude-code`, files land in `.claude/skills/<skill>/`). It travels wherever the coding agent runs, Brev VM included.

**GPU requirements.** None. Zero. It's markdown and shell conventions.

**Cost.** $0.

**Fit — Revenue Engine.** **Direct hit.** The kit-dm-watcher cron currently loses context between runs; adopting this exact four-file convention for the watcher (seen leads, drafted replies, follow-up queue, handoff for the next run) makes it resumable across cron restarts with zero new infrastructure. Same pattern for Hermes build sessions on the agent bus — Motif↔Hermes handoffs become `handoff.md` files instead of chat relays.

**Fit — GSE.** **Direct hit.** Long-running Brev jobs (the TimesFM-3 weight pulls, frozen benchmark runs, arXiv deep-read batches) currently die with disconnects and lose state. A `session/` checkpoint diary per job means a resumed session picks up where the last died. Also directly pairs with the `nemo-rl-brev-etiquette` sister skill (large artifacts on the intended volume, secrets handling) for disciplined Brev GPU work.

**Docs.** SKILL.md: https://github.com/NVIDIA/skills/blob/main/skills/nemo-rl-session-memory/SKILL.md · Workflow explainer: https://developer.nvidia.com/blog/how-to-run-an-autoresearch-workflow-with-rl-agent-skills-and-nvidia-nemo/

---

## 2. aiq-deploy + aiq-research (Developer +4 / +3, 2K each)

**What they do.** A matched pair from the NVIDIA AI-Q Blueprint team. `aiq-deploy` stands up the **AI-Q Blueprint** — NVIDIA's deep-research agent platform (intent classification → clarification → multi-source retrieval via MCP servers → synthesis with Nemotron reasoning models → cited report). `aiq-research` is the client-side skill that submits research jobs to a running AI-Q backend and polls/retrieves the cited reports. Sources: https://github.com/openai/plugins/blob/HEAD/plugins/nvidia/skills/aiq-deploy/SKILL.md and https://github.com/NVIDIA-AI-Blueprints/aiq (skill ships at `.agents/skills/aiq-research/`); explained at https://developer.nvidia.com/blog/add-a-specialized-deep-research-skill-to-agent-harnesses/

**Deploy on Brev.** `aiq-deploy` drives it as a coding agent would: Docker Engine + Compose v2 (default durable deployment: AI-Q backend + PostgreSQL, browser UI on :3000), or `uv`-based Python CLI mode, or Helm/K8s mode. On a Brev VM that's: clone `https://github.com/NVIDIA-AI-Blueprints/aiq`, set `deploy/.env` (git-ignored) with keys, `docker compose up`. No Brev one-click launchable found for AI-Q specifically — it's a deploy-the-repo flow, which the skill automates.

**GPU requirements.** Backend + frontend run **CPU-only** if the LLM points at hosted NVIDIA endpoints (`NVIDIA_API_KEY` → `integrate.api.nvidia.com`, free tier). Self-hosted LLM changes the math: the nim-deploy reference config uses Llama 3.3 70B Instruct at **2× H100 NVL or 4× A100** (see https://github.com/nvidia/nim-deploy/blob/HEAD/cloud-service-providers/oracle/blueprints/AIQ%20Blueprint%20on%20OKE%20Guide.md). Web research needs a search-provider key (Tavily/Serper/Exa — Tavily has a free tier; exact quota UNVERIFIED).

**Cost signals.** $0 GPU if CPU-only on a small Brev VM + free-tier NVIDIA endpoint + Tavily free tier. 2×H100-class if self-hosting the LLM — the expensive path; only justified if 40 RPM throttles research throughput (unlikely for batch research jobs).

**Fit — Revenue Engine.** **Strong.** An autonomous deep-research backend for money lanes: B2B sign-shop prospecting (SignPreview lead-arbitrage variant needs per-shop research), local business qualification for Kit outreach, wedding-signage trend research for Vow & Post. Deploy once on a cheap always-on Brev VM, point it at free endpoints, and the research jobs run with zero human input.

**Fit — GSE.** **Strong.** A cited deep-research engine is exactly what the arXiv/NGS mega-research program needs as a second lane beside manual deep reads — "deep research on X with citations" as an API call from `scripts/aiq.py`. Useful for competitor-intel dossiers and calibration literature sweeps.

**Docs.** AI-Q repo: https://github.com/NVIDIA-AI-Blueprints/aiq · aiq-deploy SKILL.md: https://github.com/openai/plugins/blob/HEAD/plugins/nvidia/skills/aiq-deploy/SKILL.md · aiq-research explained: https://developer.nvidia.com/blog/add-a-specialized-deep-research-skill-to-agent-harnesses/ · Helm reference: https://github.com/nvidia/nim-deploy/blob/HEAD/cloud-service-providers/oracle/workshops/AIQ%20Workshop%20on%20OKE.md

---

## 3. dynamo-router-starter + the Dynamo family (Developer +5, 2K)

**What they do.** Skills that operate **NVIDIA Dynamo** (github.com/ai-dynamo/dynamo, open source, launched GTC 2025) — the cluster-level LLM inference orchestrator that wraps vLLM / SGLang / TensorRT-LLM with an OpenAI-compatible Rust frontend, a router, and worker pools. `dynamo-router-starter` configures the frontend router mode — `round-robin`, `kv` (KV-cache-aware), `least-loaded`, `device-aware-weighted`, `direct`, `random` — and runs a smoke test (`scripts/check_router_health.py` hits `/v1/models` + one chat completion). The family: **`dynamo-recipe-runner`** (select/validate/patch/deploy K8s recipes + smoke test), **`dynamo-troubleshoot`** (read-only K8s debug-bundle collection + failure-decision-tree classification), **`dynamo-interconnect-check`** (validates NIXL/UCX/NCCL transport readiness for disaggregated serving). Added as the official bring-up path (ai-dynamo/dynamo PR #9782). Sources: https://github.com/pyfagorass/bookofspells/blob/HEAD/skills/nvidia/dynamo-router-starter/SKILL.md · family summary: https://github.com/NVIDIA/skills/pull/74

**Deploy on Brev.** The skills install into the agent (`.agents/skills/`); Dynamo itself runs on the GPU box: `pip install ai-dynamo[all]` then `dynamo run out=vllm <model>` for single-node, or `python3 -m dynamo.frontend --router-mode kv --http-port 8000` with registered workers, or the K8s recipes via recipe-runner. No Brev one-click launchable — but the vLLM-hackathon Brev configs show the standard pattern (paste setup.sh into a Launchable).

**GPU requirements.** Dynamo is engine-agnostic and **runs on a single GPU** — community deployments run 8B-class models on 1× L40S (48GB); Dynamo's own K8s getting-started uses Qwen3-0.6B with `gpu: "1"` per worker. KV-aware routing is pure software — no extra GPU, and it even has an approximate mode when workers don't publish KV events. Real disaggregation (prefill/decode split) needs **2+ GPUs**; NIXL's fast KV transfer wants NVLink/RDMA but degrades to cuda_ipc/shared memory intra-node. The heavy iron (B200/H200 configs in Vultr's guides) is for throughput benchmarking, not for it to function.

**Cost signals.** Software is free; cost = Brev GPU burn only. A single L40S-class instance running `dynamo run` serving an 8B model is the cheapest self-hosted inference endpoint in this whole lane — leave-it-on 24/7 would be one GPU × 720h/month (rate UNVERIFIED in his console), so the discipline is: spin up for batch jobs (TimesFM-style evals, bulk draft generation), shut down after.

**Fit — Revenue Engine.** **No current fit — say so and move on.** There is no self-hosted LLM fleet in the revenue engine today; the kit-dm-watcher drafts via API keys. Dynamo only earns its place if Garrett ever wants to self-host a small model for DM drafting to kill per-token costs — that's a future optimization, not a now job.

**Fit — GSE.** **Latent fit, one concrete near-term job.** The task's example ("KV-aware routing for his model-router fleet") presupposes a fleet that doesn't exist yet — his routing is OmniRoute/OpenRouter (external). The honest near-term job: **Dynamo as the free, open-source inference server on the Brev box for batch model work** — e.g. serving a small open model for the gse-ml-service's LLM-adjacent tasks or offline eval harnesses, replacing paid API calls in batch pipelines. KV-aware routing becomes relevant the day repeated-prefix workloads (calibration prompt packs, the HR-factors prompt pack run at scale) actually run against a local model.

**Docs.** Dynamo docs: https://docs.nvidia.com/dynamo/v-0-9-0/components/frontend · Repo: https://github.com/ai-dynamo/dynamo · Router starter SKILL.md: https://github.com/pyfagorass/bookofspells/blob/HEAD/skills/nvidia/dynamo-router-starter/SKILL.md · Bring-up skills PR: https://github.com/ai-dynamo/dynamo/pull/9782

---

## 4. NemoClaw (NVIDIA blueprint, "Launchable")

**What it does.** NVIDIA's open-source **reference stack for running always-on AI agents more safely** (github.com/NVIDIA/NemoClaw, Apache-2.0): guided onboarding, hardened blueprint, **routed inference**, **deny-by-default network policy** (policy.yaml declares every allowed host/port/verb/binary — anything else gets a proxy 403), and lifecycle management through a single CLI. Agents run inside **OpenShell sandboxes** (filesystem + network + process isolation, capability drops). Three first-class agents: **OpenClaw** (default), **Hermes**, **LangChain Deep Agents Code**. Docs: https://docs.nvidia.com/nemoclaw/latest/ · Quickstart with Hermes: https://docs.nvidia.com/nemoclaw/latest/get-started/quickstart-hermes.html

**⚠️ NAME COLLISION — flag honestly.** NVIDIA's "Hermes" is **Hermes Agent** (get-hermes.ai) — a third-party coding-agent harness that NemoClaw can run as one of its three supported agents. It is **NOT** Garrett's Hermes (the overnight builder on the Minis phone app). Same name, unrelated software. If Garrett ever runs `NEMOCLAW_AGENT=hermes`, that's NVIDIA's harness, not his builder.

**Deploy on Brev.** This is the one skill in the lane that is genuinely **one-click on Brev**: the NemoClaw docs have a dedicated "Launch NemoClaw with the Brev Web UI" guide — Brev provisions a remote VM, installs Docker + OpenShell, starts the agent sandbox, configures inference routing, and opens the dashboard in the browser. Community launchables show the sizing: **8 vCPU / 16 GB RAM / 80 GB disk, GPU: none — inference is a remote endpoint** (https://github.com/ansjindal/nemoclaw-openshift-launchable, https://github.com/mdrxy/nemoclaw/blob/HEAD/docs/deployment/brev-web-ui.mdx). The default inference provider is the NVIDIA Build endpoint — needs a build.nvidia.com API key (free tier).

**GPU requirements.** None required. The whole point is the sandbox + routed inference; the model lives at the provider. (GPU only enters if you point it at a self-hosted model.)

**Cost signals.** Cheapest always-on agent in the lane: one Brev CPU VM (third-party claim $0.04/hr → ~$29/mo at 24/7 — **UNVERIFIED**, confirm in his Brev console) + free-tier NVIDIA inference (~40 RPM, fine for a DM-watcher cadence). Cap story: pause the VM when idle; NemoClaw's lifecycle management supports stop/start.

**Fit — Revenue Engine.** **Strongest fit in the lane.** An always-on sandboxed agent on a cheap Brev CPU box is the natural permanent home for the **kit-dm-watcher**: OpenShell's deny-by-default network policy is a *structural* enforcement of "drafts replies, never sends" (no egress to Instagram's send endpoints = can't accidentally post), and NemoClaw's skills/sessions/memory/bridges/hooks map onto the watcher's lead pipeline. Zero human input after deploy.

**Fit — GSE.** **Strong.** An always-on agent for the overnight GSE ops that currently need a human relay: **signal-desk drafting** (reply-opportunity drafts for @GalaxySportsHQ — policy-gated so it can *draft* but never *post*, matching the hard "nothing posts without his approval" rule), calibration-job babysitting on the Brev box, arXiv intake triage. The self-evolving angle from the NVIDIA blog (agents that "learn from team workflows, create reusable skills") is real — the harness supports skill creation — but that's upside, not the buy reason.

**Docs.** Docs: https://docs.nvidia.com/nemoclaw/latest/ · Brev web-UI guide: https://github.com/mdrxy/nemoclaw/blob/HEAD/docs/deployment/brev-web-ui.mdx · Repo: https://github.com/NVIDIA/NemoClaw · Self-evolving agents blog: https://github.com/nvdli/nemoclawdli/blob/HEAD/web/nemoclaw/mats/developer-nvidia-com-blog-deploy-self-evolving-agents-for-fa.md

---

## 5. rag-blueprint (Developer +6, 2K)

**What it does.** Operates the **NVIDIA RAG Blueprint** (github.com/NVIDIA-AI-Blueprints/rag) — a production RAG stack: NV-Ingest document ingestion, Elasticsearch (default since 2.6.0; Milvus optional), SeaweedFS object store, NeMo Guardrails, **Agentic RAG** (plan-and-execute pipelines, 2.6.0), UI, MCP server, and an OpenAI-compatible search endpoint. The skill routes intents to playbooks: deploy (Docker Compose standard / retrieval-only / NVIDIA-hosted, Helm, MIG-slicing, library mode), configure (VLM, guardrails, query rewriting, ingestion, search, models, observability, summarization, MCP, eval), troubleshoot, shutdown. Source: https://github.com/practicalswan/agent-skills/blob/HEAD/rag-blueprint/SKILL.md

**Deploy on Brev.** Deploy-the-repo flow driven by the skill: `docker compose` on a Brev GPU VM, or Helm on K8s. Autonomy principles are explicit: auto-detect GPU/VRAM/drivers/Docker/CUDA/disk/ports/services/NGC key — "if it can be checked with a command, check it — don't ask the user."

**GPU requirements.** Two tiers. **CPU-light tier:** the NVIDIA-hosted compose variant points embedding/rerank/LLM at build.nvidia.com endpoints — runs on a modest VM. **Self-hosted tier:** needs real GPU — the stack's default LLM is now `nvidia/nemotron-3-super-120b-a12b` with reasoning on (2.6.0), and the OKE reference puts a 70B-class LLM at 2× H100 / 4× A100; NV-Ingest's OCR/page-elements/table-structure NIMs add more. 2.5.0 added RTX 6000 MIG support, so a single RTX PRO 6000 can be sliced. Embedding-only self-host (`llama-nemotron-embed-1b-v2`) fits a single L40S. Known limitation: B200 unsupported for image captioning/guardrails/VLM inference/Nemotron Parse (use H100/A100).

**Cost signals.** Software free. CPU-light tier: one small Brev VM + free-tier NVIDIA endpoints = near-zero. Self-hosted full stack: multi-GPU burn — the expensive end of this lane; batch the ingestion (index on GPU, then serve retrieval from CPU — vectors are just files) and shut the GPU down. (The mcvelasquez45 Brev strategy doc independently lands on the same pattern: "GPU off after indexing; CPU serves retrieval.")

**Fit — Revenue Engine.** **Concrete.** The Kit AI Receptionist (TASK-012) spec demands "answers only from the per-client knowledge base, never invents prices/hours/policies" — that is *literally* a RAG-with-guardrails product, and this blueprint ships NeMo Guardrails + citations + per-collection data catalogs. One RAG Blueprint instance = the shared KB backend for all Kit client sites.

**Fit — GSE.** **Concrete.** RAG over the 750-paper arXiv corpus + the Sports repo research corpus (`docs/research/`) with the 2.6.0 Agentic RAG plan-and-execute pipeline for multi-hop calibration questions ("which papers support this estimator choice?"). The blueprint's published RAGAS accuracy benchmarks and rag-eval/rag-perf skills give the measurement-first discipline his engine work demands.

**Docs.** Release notes (2.6.0): https://docs.nvidia.com/rag/latest/release-notes.html · Repo: https://github.com/NVIDIA-AI-Blueprints/rag · SKILL.md: https://github.com/practicalswan/agent-skills/blob/HEAD/rag-blueprint/SKILL.md

---

## Lane verdict (ranked by $0-first, autonomous-second)

1. **nemo-rl-session-memory** — $0, no infra, adopt today as the checkpoint convention for kit-dm-watcher, Hermes handoffs, and Brev long jobs (both operations).
2. **NemoClaw (Brev launchable)** — cheapest always-on agent (~one CPU VM + free inference, rate UNVERIFIED); the permanent, policy-gated home for kit-dm-watcher (draft-never-send enforced by network policy) and overnight GSE draft ops. Name collision with his Hermes flagged — different software.
3. **rag-blueprint** — the Kit AI Receptionist's knowledge-backend (guardrailed, cited) and GSE's corpus-QA engine; run the CPU-light/hosted-endpoint tier first, GPU only for bulk ingestion, then off.
4. **aiq-deploy / aiq-research** — autonomous deep-research backend; deploy CPU-only on Brev against free endpoints for sign-shop prospecting (revenue) and arXiv/NGS literature sweeps (GSE).
5. **Dynamo family** — no current job in either operation; the honest near-term use is a free self-hosted inference server on the Brev box for batch model work, with KV-aware routing waiting for a real repeated-prefix workload. Do not deploy "for later" — deploy when the workload exists.
