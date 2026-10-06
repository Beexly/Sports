# Brev/NVIDIA Catalog Sweep — Lane 4: What the Shortlist Missed

Date: 2026-09-24 | Worker: catalog sweep (read-only: web search + doc text fetch)
Scope: NVIDIA skills catalog / Brev Launchables; everything doc-verified below, no forced fits.

---

## The 5 Best Finds

### 1. cuOpt family — GPU optimization solvers (MILP / LP / routing)
**What it is:** cuOpt is NVIDIA's GPU-accelerated decision-optimization engine with Python, C, gRPC, and REST server APIs. It supports vehicle routing (TSP/VRP/PDP), linear/quadratic programming, and mixed-integer programming (beta). The NVIDIA skills catalog exposes it as six skills: `cuopt-install`, `cuopt-multi-objective-exploration`, `cuopt-numerical-optimization-api`, `cuopt-numerical-optimization-formulation`, `cuopt-routing-api-python`, `cuopt-server-api-python` (verified in the NVIDIA/skills README catalog table). The official user guide confirms all APIs including algebraic modeling and remote execution.
**Brev deploy path:** Brev Launchable from the cuOpt entries in the Brev skills catalog; skills also install into a coding agent via `npx skills add nvidia/skills --skill cuopt-numerical-optimization-api --yes` (documented in NVIDIA/skills README). Server API allows running cuOpt as a hosted service on the Brev box.
**GPU + cost:** Can run on modest GPUs; the Brev GPU price tier was not published — UNVERIFIED. cuOpt itself is open-source; cost is the Brev instance only.
**Fit (GSE):** DFS lineup construction is exactly a MILP (maximize projected points subject to salary cap, position slots, exposure caps, stack constraints). cuOpt MILP replaces OR-Tools CP-SAT as a GPU-backed solver for the GSE optimizer lane — deterministic, auditable lineups, and the `cuopt-multi-objective-exploration` skill fits the multi-slate tradeoff surface (ceiling vs floor vs ownership).
**Fit (Revenue Engine):** only if a routing lane ever exists (SignPreview has no delivery component today) — routing skills are parked unless a physical-delivery job appears.
**Docs:** https://docs.nvidia.com/cuopt/user-guide/latest/introduction.html · https://github.com/nvidia/cuopt/blob/HEAD/docs/cuopt/source/introduction.rst · https://github.com/NVIDIA/skills

### 2. Clinical ASR flywheel skills → Parakeet TDT v2 sports-commentary transcription pipeline
**What it is:** The `digital-health-clinical-asr-setup/build/eval/finetune` skills define a full ASR flywheel: term curation → synthetic benchmark generation → keyword-error-rate (KER) scoring → fine-tuning of NVIDIA Parakeet TDT v2 (verified recipe: NeMo SFT, `nvidia/parakeet-tdt-0.6b-v2`, bf16-mixed, lr 3e-4, fits 16 GB VRAM). The models themselves are CC-BY-4.0 (commercial-safe), and `nvidia/Nemotron-3-Diarization` pairs with a multitalker Parakeet for speaker-attributed transcripts. Although the skill ships as "clinical," the entire flywheel pattern (eval harness + fine-tune recipe) is domain-agnostic.
**Brev deploy path:** Brev Launchable for the ASR skills; fine-tuning verified on a single 16 GB GPU (batch_size 4), which maps to a mid-tier Brev GPU.
**GPU + cost:** Models are open (CC-BY-4.0); only Brev compute costs — UNVERIFIED tier pricing. Transcription of Parakeet-TDT-0.6b-v2 runs at ~3400x real-time batched, so per-hour-of-audio cost is small.
**Fit (GSE):** Real-footage content research — transcribe broadcasts/podcasts/game audio to searchable text, mine analyst quotes for X replies, and locate moments ("what did they say at 4:12?") for the clip pipeline. NOTHING about this touches video generation; it is audio→text only, fully inside the HARD VIDEO RULE.
**Fit (Revenue Engine):** transcribe client intake calls for Kit sign builds (quotes/prices captured verbatim into the per-client knowledge base for the AI receptionist).
**Docs:** https://github.com/nvidia/skills/blob/HEAD/./skills/digital-health-clinical-asr-finetune/SKILL.md · https://huggingface.co/nvidia/parakeet-tdt-1.1b · https://huggingface.co/nvidia/Nemotron-3-Diarization/blob/main/ASR_INTEGRATION_GUIDE.md

### 3. Nemotron Parse / nv-ingest — agentic document extraction feeding RAG
**What it is:** Nemotron Parse (arXiv:2511.20478) is an end-to-end vision-language model that extracts formatted text (Markdown/LaTeX), bounding boxes, and semantic block classes from PDFs with reading order preserved; a token-compressed (TC) variant keeps accuracy with much lower latency for batch/edge. It is the extraction engine behind `nv-ingest`, which is in turn the ingestion microservice consumed by the RAG Blueprint (already shortlisted) — so this is the missing document-ingestion half of the RAG stack.
**Brev deploy path:** nv-ingest deployable via the RAG Blueprint's Docker Compose on a Brev box; the parse skill (`nemotron-parse-2.0`) appears in the Brev catalog.
**GPU + cost:** Needs a GPU for the VLM; batch path can use the TC variant on a small GPU — UNVERIFIED on Brev tiers.
**Fit (GSE):** ingest the 750-paper arXiv corpus + sports stat PDFs into the research RAG without hand-writing parsers; structured tables (stat sheets) come out as Markdown tables instead of OCR soup.
**Fit (Revenue Engine):** Kit lane document intake — client menus/price lists/contracts parsed straight into the per-client knowledge base that powers TASK-012 (AI receptionist) and SignPreview briefs. Zero-human-input intake.
**Docs:** https://arxiv.org/pdf/2511.20478v1 · https://github.com/NVIDIA/skills

### 4. Cosmos Dataset Search blueprint — semantic search over video archives
**What it is:** A vector-search workflow (official NVIDIA blueprint) that ingests video collections, generates embeddings with the Cosmos-embed NIM, stores them in Milvus (cuVS-accelerated), and serves text-to-video and video-to-video search through a React UI + REST API + CLI. Built for AV scenario mining ("find highway curves in low light"), but the mechanics are pure semantic video retrieval.
**Brev deploy path:** Blueprint card exists in the Brev skills catalog; deployment references: Docker Compose for dev, Helm for production; 2 GPUs minimum on the OpenShift reference layout (cosmos-embed + Milvus indexNode) — smaller Brev instances not yet documented, so start with a single mid-tier GPU dev compose and test.
**GPU + cost:** GPU cost is the real line item — UNVERIFIED on Brev tiers; needs at least one decent GPU for the embed NIM. Storage for the footage archive is the other cost.
**Fit (GSE):** The missing retrieval layer for the real-footage content operation — index a library of game footage, query "4th-quarter pick six" in plain English, get back exact timestamps for the telestrated, seconds-long, commentary-led clips the HARD VIDEO RULE requires. Zero synthetic video involved.
**Fit (Revenue Engine):** none today (no video archive lane); note only.
**Docs:** https://build.nvidia.com/nvidia/cosmos-dataset-search/blueprintcard · https://github.com/nvidia-omniverse-blueprints/cosmos-dataset-search

### 5. DeepStream import-vision-model + RTVI CV customize — custom vision models on a GPU video pipeline
**What it is:** The DeepStream skill set (`deepstream-import-vision-model`, `deepstream-dev`, `deepstream-generate-pipeline`, `rtvi-cv-customize-model`) teaches an agent to import a custom vision model (e.g., a YOLO-style detector trained elsewhere) into DeepStream's GPU-accelerated streaming pipeline for inference at scale. Distinct from VSS (shortlisted): this is about *running your own models on video*, not summarizing.
**Brev deploy path:** DeepStream skills are Brev Launchables; development happens inside the Launchable env with the agent-guided workflow.
**GPU + cost:** Streaming inference wants an always-on GPU — the heaviest cost of the five; UNVERIFIED on Brev tiers. Batch (non-live) mode on demand would cut this.
**Fit (GSE):** the analysis engine for real game footage — run play/ball/tracking detection on real video to auto-flag highlight moments that feed the clip pipeline and tracking-research datasets. Real footage in, detections out, never synthetic.
**Fit (Revenue Engine):** none — no video lane.
**Docs:** https://github.com/NVIDIA/skills (DeepStream row in the catalog table)

---

## Targets with no clean mapping (honest verdicts)

- **(a) Lead generation / outreach / prospecting:** nothing in the NVIDIA/Brev catalog. It is an engineering catalog (physical AI, CUDA-X, inference, optimization); there is no lead-gen, CRM, or outreach skill. Adjacent-only note: the community `opencue/skills` repo (not NVIDIA) has `marketing/` (content, social, campaigns) and `medusa/` (Medusa v2 ecommerce) categories — outside our catalog, unverified, but worth a look if the mandate ever widens. Inside NVIDIA's repo, the nearest infrastructure is the RAG + AI-Q deep-research stack (shortlisted), which can *research* prospects but is not outreach.
- **(b) Social content pipelines (scheduling/drafting/analytics):** nothing. No scheduler, no X/TikTok/IG skill in the catalog. VSS + Cosmos cover *finding moments in video*; caption/drafting stays with the x-poster skill Garrett already has. Posting never happens without his approval regardless.
- **(c) Website building / landing pages:** nothing. No web-builder skill in the catalog; Kit lane stays with existing tooling.
- **(d) SEO:** nothing. No SEO/content-ranking skill in the catalog.
- **(e) Marketplace/ecommerce:** nothing in the NVIDIA catalog (see opencue note above for the community Medusa skills, out of scope).
- **(f) Sports analytics / prediction / odds:** no sports-specific skill exists in the catalog. Earth2Studio (shortlisted) is the only modeling-adjacent item (weather — game-weather inputs for props/totals). The genuinely new sports-relevant items found here are all infrastructure: cuOpt (DFS MILP), Cosmos search (footage retrieval), ASR (commentary transcription).
- **(g) Optimization & routing — cuOpt: see find #1 (real).** Honest addition: `cudaq-guide` is quantum computing (gate-model + annealer access), not a practical DFS route — QUBO/TSP encodings blow up (n² qubits for TSP), hardware access is expensive and experimental, and cuOpt's classical MILP dominates it on every practical axis today. Assessed, rejected as premature.
- **(h) ASR flywheel: see find #2 (real).** The clinical labeling transfers cleanly to sports play-by-play (custom terminology curation + KER-style eval + fine-tune). Also note the Nemotron-3-Diarization + multitalker-Parakeet path for speaker-attributed transcripts (host vs guest on sports podcasts).

## Other names checked and dismissed
- `skill-card-generator`: governance documentation for agent skills (Trustworthy AI) — zero operational fit.
- `physical-ai-video-data-augmentation` / `physical-ai-defect-image-generation`: synthetic training-data generation for CV models — the augmentation skill could only serve *model training*, never content output, and the defect one is manufacturing-only. Flagged under the HARD VIDEO RULE; not recommended as active lanes.
- `dali-dynamic-mode`: GPU data loading (DALI) — a performance utility for training pipelines, not a capability; no standalone job.
- `nemo-automodel-*` / `nemo-mbridge-*` / `mcore-linting-and-formatting`: already shortlisted or pure LLM-training plumbing; no new mapping.
- DGX Spark playbooks ("setting up NemoClaw, your secure personal AI agent"): overlaps shortlisted NemoClaw; nothing new.
- `omniverse-*` / `physicsnemo-discover`: simulation/engineering twins — no lane fit.
