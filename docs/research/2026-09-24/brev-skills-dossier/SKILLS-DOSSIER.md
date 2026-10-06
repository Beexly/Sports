# Brev/NVIDIA Skills Dossier — where they fit in Garrett's two operations

**Date:** 2026-09-24 · **Source:** 4 parallel research lanes, all doc-verified (docs.nvidia.com, build.nvidia.com, GitHub). No pricing invented — UNVERIFIED where unpublished.

**The two operations:**
- **Autonomous Revenue Engine** (`Beexly/autonomous-revenue-engine`): money machine. $350 Kit sites + kit-dm-watcher (IG DM lead watcher, draft-reply mode), SignPreview B2B, Vow & Post wedding signage, Recordly video, affiliate lane. Goal: autonomous income, minimal human input.
- **GSE / Galaxy Sports Edge** (`Beexly/Sports`): prediction engine (TS) + gse-ml-service (Python) + calibration research + X/TikTok content ops. Goal: most accurate/calibrated sports prediction + viral real-footage content.

## Cost baseline (applies everywhere)

- **Skills are free** (Apache-2.0 / CC-BY, github.com/NVIDIA/skills and blueprint repos). The burn is always the Brev box.
- **build.nvidia.com hosted NIMs: FREE tier**, no credit card, `nvapi-` key → `integrate.api.nvidia.com/v1`. ~40 RPM community-reported rate limit (UNVERIFIED exact quota). Dev/eval only — production traffic needs AI Enterprise. Garrett already holds a live `nvapi-` key.
- **Brev billing is per-hour per instance.** Per-GPU-hour rates are NOT published anywhere fetchable — **check the launchable dashboard before running anything**. Third-party "$0.04/hr" claims read like CPU-tier. Treat every GPU job as capped: spin up, run the batch, tear down.
- **Cost tiers used below:** `FREE` (no GPU or free endpoints), `CHEAP GPU` (single small GPU — T4/L4/A10 class — batch jobs, torn down after), `BIG IRON` (multi-GPU / H100-class / always-on heavy — avoid without a cap).

## Open cost questions (check before spending)
1. Brev per-GPU-hour pricing + any free credits on his launchable — dashboard check.
2. build.nvidia.com free-tier quota/rate limits on his key — live account check.
3. Lepton cloud pricing (only if nemotron-customize training goes there).

## ⚠️ Name collision (do not confuse)
NVIDIA's **NemoClaw "Hermes"** is Hermes Agent (get-hermes.ai), a third-party coding harness NemoClaw can run. It is **NOT** Garrett's Hermes (overnight builder on the Minis app). Same name, unrelated software.

---

## A. Agent-infrastructure skills

### A1. nemo-rl-session-memory — cost: FREE
**What it is.** Not a server — an agent workflow playbook. Durable human-readable session record in `session/<timestamp>/`: `session_state.md` (goal/plan/blockers/next), `timeline.md` (append-only log), `files.md` (what changed and why), `handoff.md` (resume instructions). Checkpoint periodically; resume by reading the latest three files.
**Brev deploy:** nothing to deploy — installs into the agent (`npx -y skills add nvidia/skills --skill nemo-rl-session-memory --agent claude-code`). Travels wherever the agent runs.
**GPU:** none. **Cost:** $0.
**Revenue-engine fit:** the kit-dm-watcher cron loses context between runs — adopt the four-file convention (seen leads, drafted replies, follow-up queue, handoff) so every run resumes cleanly. Same for Hermes build sessions on the agent bus: Motif↔Hermes handoffs become `handoff.md` files instead of chat relays.
**GSE fit:** checkpoint diary for long Brev jobs (weight pulls, benchmark runs, arXiv batches) that die on disconnect; pairs with sister skill `nemo-rl-brev-etiquette` (artifacts on the right volume, secrets handling).
**Wildest play:** make it the *universal* handoff format across every agent and cron in both repos — one convention, zero new infra, and every future agent (including NemoClaw below) speaks it.

### A2. NemoClaw — cost: FREE→CHEAP (one CPU VM)
**What it is.** NVIDIA's open-source reference stack for running always-on AI agents more safely: guided onboarding, **deny-by-default network policy** (policy.yaml declares every allowed host/port/verb — anything else gets a proxy 403), lifecycle CLI, agents in OpenShell sandboxes (filesystem/network/process isolation). Three first-class agents: OpenClaw, Hermes (not his), LangChain Deep Agents.
**Brev deploy:** the one true one-click in the lane — "Launch NemoClaw with the Brev Web UI" provisions the VM, installs Docker + OpenShell, starts the sandbox, opens the dashboard. Reference sizing: 8 vCPU / 16 GB RAM / 80 GB disk, **no GPU** — inference is a remote endpoint (build.nvidia.com free tier).
**GPU:** none required. **Cost:** one Brev CPU VM (third-party claim ~$0.04/hr ≈ $29/mo at 24/7 — UNVERIFIED) + free-tier inference (~40 RPM, fine for watcher cadence). Pause when idle.
**Revenue-engine fit:** the permanent, policy-gated home for **kit-dm-watcher**. The network policy is *structural* enforcement of "drafts replies, never sends" — no egress to Instagram send endpoints means it physically cannot post. Zero human input after deploy.
**GSE fit:** overnight draft ops — signal-desk reply drafts for @GalaxySportsHQ (policy-gated: draft but never post, matching the hard rule), calibration-job babysitting, arXiv intake triage.
**Wildest play:** one NemoClaw box, two policy files — `revenue.yaml` (can read IG DMs, cannot send) and `gse.yaml` (can read X, cannot post) — becomes the always-on operator for both businesses with the safety rules enforced by the sandbox, not by prompt discipline.

### A3. rag-blueprint — cost: FREE (light tier) → BIG IRON (full self-host)
**What it is.** NVIDIA's production RAG stack: NV-Ingest document ingestion, Elasticsearch (Milvus optional), SeaweedFS, NeMo Guardrails, Agentic RAG (plan-and-execute), UI, MCP server, OpenAI-compatible search endpoint. The skill routes deploy/configure/troubleshoot/shutdown intents to playbooks.
**Brev deploy:** `docker compose` on a Brev VM (skill auto-detects GPU/VRAM/drivers/ports — "if it can be checked with a command, check it"). NVIDIA-hosted compose variant points embedding/rerank/LLM at build.nvidia.com — runs on a modest CPU VM.
**GPU:** CPU-light tier needs none; full self-hosted stack wants real GPU (default LLM now nemotron-3-super-120b; reference 2×H100/4×A100 for 70B-class). Batch pattern: index on GPU, serve retrieval from CPU, shut the GPU down.
**Revenue-engine fit:** the **Kit AI Receptionist (TASK-012) knowledge backend** — the spec demands "answers only from the per-client knowledge base, never invents prices/hours/policies," which is literally guardrailed RAG with citations. One instance = shared KB for all Kit client sites.
**GSE fit:** RAG over the 750-paper arXiv corpus + `docs/research/` with Agentic RAG for multi-hop calibration questions ("which papers support this estimator choice?").
**Wildest play:** one blueprint, two collections — `kit-clients` and `gse-research` — with the MCP server exposing both to every agent; the receptionist and the research copilot share one retrieval brain.

### A4. aiq-deploy + aiq-research — cost: FREE
**What they are.** Matched pair from the NVIDIA AI-Q Blueprint team. `aiq-deploy` stands up AI-Q — a deep-research agent platform (intent classification → clarification → multi-source retrieval via MCP → synthesis with Nemotron reasoning → cited report). `aiq-research` submits research jobs to a running backend and retrieves the cited reports.
**Brev deploy:** `docker compose up` on a Brev VM (AI-Q backend + PostgreSQL, UI on :3000). No one-click launchable — deploy-the-repo flow, which the skill automates.
**GPU:** CPU-only if the LLM points at hosted NVIDIA endpoints (free tier). Self-hosted LLM (Llama 3.3 70B) wants 2×H100-class — skip unless 40 RPM throttles throughput (unlikely for batch jobs). Web research needs a search key (Tavily free tier).
**Revenue-engine fit:** autonomous deep-research backend for money lanes — per-shop research for the SignPreview lead-arbitrage variant, local-business qualification for Kit outreach, wedding-signage trend research for Vow & Post.
**GSE fit:** cited deep-research as an API call for the arXiv/NGS program — a second lane beside manual deep reads; competitor-intel dossiers and calibration literature sweeps.
**Wildest play:** the "Research Machine" (see §E) — one AI-Q backend serving prospect research by day and paper sweeps by night, with nemo-retriever as its long-term memory.

### A5. Dynamo family (router-starter, recipe-runner, troubleshoot, interconnect-check) — cost: CHEAP GPU if used
**What it is.** Skills operating **NVIDIA Dynamo** — cluster-level LLM inference orchestration wrapping vLLM/SGLang/TensorRT-LLM with an OpenAI-compatible Rust frontend, router (round-robin, **KV-aware**, least-loaded, device-aware), and worker pools. Single-GPU friendly (8B-class on 1×L40S); KV-aware routing is pure software.
**Brev deploy:** `pip install ai-dynamo[all]`, `dynamo run out=vllm <model>` on the GPU box. No one-click launchable.
**Revenue-engine fit:** none today — no self-hosted LLM fleet; the watcher drafts via API keys. Only earns a place if Garrett ever self-hosts a small model to kill per-token DM-drafting costs.
**GSE fit:** latent. Honest near-term job: free self-hosted inference server on the Brev box for batch model work (offline eval harnesses, calibration prompt packs at scale), replacing paid API calls. KV-aware routing matters the day repeated-prefix workloads actually run locally.
**Wildest play:** none yet — **do not deploy "for later."** Deploy when the workload exists. Verdict: park.

---

## B. Video/audio skills (all real-footage analysis — hard-rule compliant; no generative-video in the set)

### B1. vss-ask-video — cost: FREE→CHEAP GPU
**What it is.** Ask the VSS agent's `video_understanding` tool a fresh visual question about a recorded clip ("what coverage is the safety in?", "is the route cut off?") and get a VLM answer grounded in the actual pixels. Forces a fresh look at frames — not answerable from metadata.
**Brev deploy:** needs a VSS `base` profile running; skill probes `$HOST_IP:8000`, hands off to `vss-deploy-profile -p base` if nothing is up.
**GPU:** `base` is the light profile; remote-offload option points the VLM at build.nvidia.com — host needs only ~8GB VRAM. Cheapest per-question cost in the lane.
**Revenue-engine fit:** visual QA agent — "is the sign mockup legible at thumbnail size?", "does the phone-frame render show the right client site?" — instead of a human eyeballing every render. Prospect research: ask visual questions about a prospect's own video ("what services are on their storefront sign?") to personalize Kit outreach.
**GSE fit:** the play-finding copilot — after search returns candidate clips, ask "what defensive coverage pre-snap?" or "does the clip contain the full route?" to decide what gets clipped, no human scrubbing. Telestration prep (down/distance, hash, formation facts) and a verification pass against mislabeled clips.
**Wildest play:** pair with GroundingDINO text-promptable detection ("find the quarterback") — ask in English, get boxes + answers, feed the telestrator.

### B2. vss-summarize-video — cost: FREE→CHEAP GPU
**What it is.** Timestamped narrative summary of one recorded clip via the LVS microservice (HITL-gated) with VLM-NIM fallback. Not live captioning, not report generation.
**Brev deploy:** one skill inside the VSS blueprint's `skills/` tree; deploy a `base`/`lvs` profile, skill drives API calls.
**GPU:** remote-offload profile (VLM/LLM/embedding remote) needs only an 8GB-VRAM host.
**Revenue-engine fit:** client QA pipeline — timestamped summaries + flagged change requests from testimonial/walkthrough videos; chapter lists for Recordly client delivery; summarize video DMs for the watcher.
**GSE fit:** game-tape summarization — full broadcasts → timestamped event lists ("3rd quarter, 8:12 — 3rd & 9, Cover 2 shell") feeding clip-shortlisting and the X content-op's daily packets before any human watches.
**Wildest play:** the summary becomes the *index* — every game ever watched becomes searchable text, and the footage archive turns into a database.

### B3. VSS Blueprint (launchable) — cost: CHEAP GPU (remote-offload) → BIG IRON (sandbox default)
**What it is.** NVIDIA's GA Metropolis blueprint: ingest live/archived video → natural-language video search (Cosmos-Embed1 + CV attributes), summarization, visual Q&A, real-time alerts with VLM verification, object tracking, event review, audio transcription, multimodal fusion. The parent stack for B1/B2 plus 13+ skills.
**Brev deploy:** one-click NVIDIA Launchable (2× RTX PRO 6000 or 8× L40S sandbox — expensive by default), or Docker Compose profiles on your own box.
**GPU:** the sane path is the **complete-remote profile on a cheap instance + free build.nvidia.com NIMs** — near-zero marginal cost. Never leave the 2×RTX PRO 6000 idle.
**Revenue-engine fit:** archived-call mining — natural-language search over accumulated prospect/client video ("every clip where a prospect mentioned pricing"). Narrow brand-safety alerts on client streams.
**GSE fit:** the **game-film brain** — archive broadcasts; `vss-search-archive` ("every 3rd-and-long conversion vs Cover 2") returns ranked timestamped clips; summarize + interrogate; `vss-manage-video-io-storage` extracts exact ranges for telestration. The compliant pipeline the full-operation dial needs: real footage in, candidates out, commentary-led editing downstream.
**Wildest play:** the dual-archive (see §E) — one VSS stack indexing game film *and* revenue-engine video, searched in plain English by both operations.

### B4. deepstream-dev — cost: CHEAP GPU
**What it is.** DeepStream 9.x SDK development via the Python `pyservicemaker` API: video-analytics pipelines, GStreamer processing, TensorRT inference, object detection/tracking, Kafka output. 13 bundled reference docs teach a coding agent correct usage.
**Brev deploy:** coding skill installed into the agent; runtime is DeepStream containers from NGC on any CUDA host. Brev launchable workflow exists for a DeepStream coding agent.
**GPU:** friendly — YOLO-class detectors + NvDCF/NvSORT trackers run real-time on **T4/L4/A10**. TensorRT engines build once per arch.
**Revenue-engine fit:** automated clip-bounding for client deliverables (scene/text-region detection → auto-chapter/trim); batch storefront-photo processing to detect signage presence/condition for lead arbitrage (detection, not generation).
**GSE fit:** player/ball detection + tracking on game film → per-frame tracks feeding automated stat extraction (routes, separation, YAC proxies) for the prediction engine's tracking lanes; play-boundary detection auto-segmenting broadcasts into candidate clips; live big-play alerts on Sunday streams.
**Wildest play:** the tracking pipeline emits the *dataset* the engine's been missing — real separation/route data from broadcast film, no tracking-data vendor required.

### B5. deepstream-import-vision-model — cost: FREE→CHEAP GPU
**What it is.** Fully autonomous model bring-up: HF/NGC URL in → ONNX acquisition → TensorRT engine build → custom nvinfer parser → KITTI validation → multi-stream benchmark → charts + Markdown/PDF report. Object-detection models only (YOLO, DETR/RT-DETR, GroundingDINO/OWL-ViT zero-shot).
**Brev deploy:** coding skill; executes on any CUDA host with DeepStream + TensorRT.
**GPU:** any CUDA GPU; engines cached and reused after the one-time build.
**Revenue-engine fit:** zero-touch onboarding of better detectors (e.g., signage/text-region) into production pipelines with a benchmark report — model refresh becomes a scheduled job, not a Garrett task.
**GSE fit:** player/jersey-number/ball detector upgrades pulled from HF/NGC autonomously, benchmarked, PDF report as acceptance artifact; zero-shot GroundingDINO ("find the quarterback") inside the clip pipeline with no training.
**Wildest play:** a monthly cron that checks HF for better sports detectors, benchmarks them against the current champion, and promotes the winner — self-improving vision with Garrett never involved.

### B6. nemotron-speech — cost: FREE
**What it is.** Single routing surface for NVIDIA Nemotron Speech (Riva) ASR/TTS/NMT: cloud-hosted via build.nvidia.com, self-hosted Docker, gRPC/HTTP/WebSocket ASR clients, riva-build custom models, Silero VAD + Sortformer diarization tuning. (Brand renamed; all commands still say "Riva.")
**Brev deploy:** two paths — **free:** hit hosted endpoints with the `nvapi-` key, no GPU; self-hosted: Riva NIM containers on a Brev GPU (needs AI Enterprise entitlement — the paid tier).
**GPU:** cloud path: none. Self-hosted ASR: 8–16GB VRAM class.
**Revenue-engine fit:** transcribe Recordly voiceovers (captions/edit notes, free); transcribe IG voice-message DMs for the watcher; scratch TTS drafts for internal revisions only (never synthetic client output); NMT for bilingual Kit client copy.
**GSE fit:** broadcast commentary → searchable text aligned to VSS timestamps (multimodal clip selection); coach-speak/injury-language mining from pressers; podcast/spaces transcription for the reply-opportunity monitor; diarization separating play-by-play from color for clean quote extraction. ASR only — no synthetic voice near @GalaxySportsHQ, ever.
**Wildest play:** every game becomes a *transcript* — "what did the broadcast say at 4:12?" joins "what did the pixels show?" as the two search axes of the film brain.

### B7. Missed-skill finds (same VSS/DeepStream repos — as valuable as the assigned six)
- **vss-search-archive** — natural-language search over video archives (Cosmos-Embed1 + CV attributes + VLM critique). **The GSE play-finder**: "every red-zone fade to the left corner," ranked clips with timestamps.
- **vss-manage-video-io-storage** — VIOS REST: recording timelines, **clip extraction**, snapshots. The clipping pipeline's hands — exact timestamp ranges out as files for telestration.
- **vss-deploy-detection-tracking-2d** — prebuilt 2D detection+tracking microservice via REST. Stand up tracking without hand-rolling DeepStream.
- **vss-generate-video-report** — formatted markdown analysis reports per clip/game. Per-game reports feeding the daily content packets.
- **vss-manage-alerts** — real-time alert rules with VLM verification. Big-play alerts during live games → content-op queue.
- **nemotron-asr-finetune** — cheapest-path ASR domain adaptation. Fine-tune on sports commentary jargon (down/distance patter, player names) if base ASR underperforms.

---

## C. Data/RAG/training skills

### C1. NV-Tesseract forecasting (tao-finetune-nv-tesseract-forecasting) — cost: FREE→CHEAP GPU — ⭐ TOP NEW FIND
**What it is.** Transformer-based **multivariate time-series forecasting** (MOMENT-1-large backbone, self-supervised pretraining), Apache-2.0, weights public on HF (no auth). Three inference modes: standard, **DARR** (kNN-retrieval blending: `alpha*direct + (1-alpha)*kNN` against similar historical windows), and interpretability (lag×horizon attribution, trajectory stability, PDF report). Fine-tunes only the forecasting head (5 epochs defaults). **1× CPU minimum; 1× ≥8GB GPU recommended for fine-tuning.**
**Brev deploy:** skill from `nvidia-tao/tao-skill-bank`; `perform_forecasting` entry point.
**Why it matters:** the TimesFM-3 lane is **non-commercial, benchmark-only**. NV-Tesseract is Apache-2.0 — it can live in the **production pick path**. This supersedes the "pull TimesFM weights to Brev" plan for anything beyond research.
**Revenue-engine fit:** none.
**GSE fit:** fine-tune on his own series — closing-line movement, team EPA rolling windows, league HR/game rates — as a second forecaster beside the engine's statistical models; DARR retrieves similar historical windows ("games with this wind/temp/totals profile") and blends them in — conceptually adjacent to the engine's CUSUM regime flags; attribution bundle citable in research notes. Start: run on NFL totals history on CPU, verdict via the existing prereg-eval harness.
**Wildest play:** DARR over *weather-conditioned* windows — Earth2Studio features (§C4) define the similarity space, Tesseract does the forecasting. A weather-aware time-series forecaster built from two free parts.

### C2. Earth2Studio (install/discover/data-fetch/deterministic-forecast) — cost: FREE→CHEAP GPU
**What it is.** NVIDIA's open-source AI weather/climate framework. `data-fetch` pulls GFS/ERA5 variables for specific times/places; `deterministic-forecast` builds single-member forecasts (e.g., FourCastNet3) in ~10 lines. Models + data are open (Apache-2.0, public sources).
**Brev deploy:** pip/uv Python on any box; data-fetch is CPU + network; inference models want one modest GPU.
**Revenue-engine fit:** none — no weather dependency.
**GSE fit:** weather is already an engine input (MLB HR-factors weather term; NFL totals want wind/temp). **(a)** `data-fetch` → historical GFS/ERA5 surface winds/temperature/pressure for every NFL/MLB venue 2015–2026 → the historical weather-features table the engine lacks; **(b)** FourCastNet3 game-day wind/temp as a second opinion vs API feeds; **(c)** wire into `props/hr-factors.ts` and the totals path. Highest-ROI weather play: real features, not vibes.
**Wildest play:** §C1's DARR similarity space built on Earth2Studio features — "find me every game ever played in these exact conditions" becomes a forecast input.

### C3. accelerated-computing-cudf — cost: FREE→CHEAP GPU
**What it is.** Official NVIDIA agent guidance for **cuDF GPU DataFrames** — pandas-compatible acceleration, `cudf.pandas` zero-code-change mode (set an env var), dask-cuDF multi-GPU, fast Parquet I/O, joins/groupbys.
**Brev deploy:** `pip install cudf-cu12` on any CUDA Linux box; CPU fallback is plain pandas.
**GPU:** Volta+ (≥7.0), single mid-range GPU plenty.
**Revenue-engine fit:** none — no DataFrame-heavy ETL in the stack.
**GSE fit:** the backtest-data wrangler — GPU-accelerate nflverse + odds-API ETL (play-by-play × odds × weather joins, groupby aggs), backtest ledger crunching (3,411+ picks, per-season CV splits — 10–50× on groupbys), Odds API tick-level line-movement frames. Cheapest useful GPU in the lane; CPU fallback first.
**Wildest play:** the entire backtest suite re-runs in minutes instead of hours — iteration speed becomes the edge, and every calibration experiment gets cheaper to run.

### C4. nemo-retriever — cost: FREE
**What it is.** NeMo Retriever 26.8.1 — one `retriever` CLI: extract → embed → LanceDB vector index over PDFs/images/Office/HTML/text/audio/video. Stages: layout, OCR, table/structure, chart detection, VLM captioning; embeds with `llama-nemotron-embed-1b-v2`; optional rerank. **CPU-viable:** with `NVIDIA_API_KEY`, heavy stages route to hosted endpoints — no GPU for modest corpora.
**Brev deploy:** pip/apt into a venv (ffmpeg + libreoffice for multimedia extras).
**Revenue-engine fit:** local search over the Kit playbook corpus (proposals, pricing, FAQs, intake files) → `retriever query` as the knowledge base behind the receptionist — cheaper and more accurate than stuffing context windows.
**GSE fit:** research-corpus RAG — ingest `docs/research/<date>/` (750-paper ledger notes, dossiers, intel files) into LanceDB; "what did the corpus conclude about CPOE vs EPA for QB totals?" becomes one CLI call instead of grepping hundreds of files. Replaces the coordinators' ad-hoc file scanning.
**Wildest play:** the retriever index becomes the *memory* of the AI-Q Research Machine (§A4) — deep research writes to it, every agent reads from it.

### C5. rag-eval — cost: FREE
**What it is.** Quality benchmark for the RAG Blueprint layout: `corpus/` + `train.json` → `evaluate_rag.py` → RAGAS metrics (faithfulness, answer relevancy, context precision/recall) as JSON with failure triage. Toggles reranker/query-rewriting/temperature.
**Brev deploy:** `uv sync` in the blueprint's `scripts/eval`; points at a reachable RAG server; judge calls need `NVIDIA_API_KEY` (free tier).
**Revenue-engine fit:** parked — only if the receptionist KB graduates to a full RAG server (quality gate: "did the new FAQ ingestion break faithfulness?").
**GSE fit:** the quality harness for the corpus RAG — ~50 known-answer questions ("which papers support state-space injury models?"), run before/after re-indexing to prove retrieval doesn't regress past 750 papers. Matches his measurement-first discipline (prereg-eval.ts precedent).
**Wildest play:** RAGAS verdicts committed to the repo beside pick ledgers — retrieval quality gets the same audit trail as predictions.

### C6. data-designer — cost: FREE (+ inference endpoint cost)
**What it is.** NeMo Data Designer — declarative synthetic-data pipelines (YAML/Python): columns, prompts, validators resolved as a DAG, batched, judged, orchestrated against external LLM endpoints (NIM/OpenAI/vLLM). Ships SFT chat, tool-calling, DPO preference-pair templates. Preview rows, then scale to 10k+.
**Brev deploy:** `pip install data-designer`, point at an endpoint (free NIM / his AI/ML API key / local vLLM).
**GPU:** none required — orchestrator only; the endpoint holds the GPU.
**Revenue-engine fit:** synthetic client-inquiry/objection datasets to train and regression-test the receptionist ("angry customer asks about pricing," "asks for a service we don't offer") without waiting for real DM traffic; wedding-signage copy variants for Vow & Post listings.
**GSE fit:** synthetic SFT pairs for a GSE assistant ("explain this engine pick in @GalaxySportsHQ voice") from seeded engine outputs; DPO pairs (good vs bad pick explanations) aligning a content model to his copy rules. **Never train the pick engine on synthetic game outcomes.**
**Wildest play:** the Voice Twin (§E) — synthetic pairs are the raw material for the LoRA that writes like Garrett.

### C7. nemotron-customize — cost: CHEAP GPU (LoRA) → BIG IRON (full training)
**What it is.** `nemotron step` CLI chaining repo-native customization: curation, SFT/PEFT (AutoModel or Megatron-Bridge), CPT, RL alignment (DPO/RLVR/GRPO/RLHF), benchmarks, checkpoint conversion, ModelOpt quantization. Apache-2.0, commercial-ready.
**Brev deploy:** clone `nvidia-nemo/nemotron`; backends: local GPU, Slurm, Lepton (metered — UNVERIFIED, get quote).
**GPU:** LoRA/PEFT on 8B-class fits a single 24GB+ card; full SFT/RLHF wants multi-GPU.
**Revenue-engine fit:** the end state of the Kit AI receptionist — DPO a small Nemotron on real + synthetic client conversations so the $49/mo widget answers in his voice, escalates unknowns, never invents prices. LoRA-scale = cheap.
**GSE fit:** content-side only — X voice for replies, DFS write-up boilerplate, pick-explanation generation in the approved voice. **Pick probabilities never route through an LLM** — calibration stays in the TS/Python engine.
**Wildest play:** one LoRA, two jobs — the same voice model drafts receptionist replies and GSE posts, with NemoClaw policy as the never-send/never-post guardrail.

### C8. cufolio — cost: FREE (pattern theft)
**What it is.** GPU-accelerated Mean-CVaR / Mean-Variance portfolio optimization (cuOpt solver): KDE scenario generation, efficient frontier, **walk-forward backtest vs benchmarks**, rebalancing triggers. Apache-2.0. It's equities, not sports.
**Revenue-engine fit:** none.
**GSE fit:** steal the *machinery*, not the tool — scenario generation + walk-forward backtest + rebalancing ≈ the pick engine's backtest harness. Treat the pick ledger as a return series; optimize **Kelly stake sizing under downside-CVaR constraints**; backtest the staking rule vs flat-staking. His Kelly/sizing arXiv cluster maps directly on.
**Wildest play:** the staking optimizer becomes a Wave module — `staking/cvar-kelly.ts` — with the same prereg discipline as everything else.

### C9. Also-rans (one line each)
- **rag-perf:** load-benchmarks a hosted RAG server — irrelevant until the corpus RAG has latency SLAs. Park.
- **nemo-automodel-*:** deeper training plumbing; nemotron-customize is the friendlier entry — pick one, not both. Park.
- **nemotron-parse-2.0 / nemotron-ocr-v2:** models, not skills — already the OCR/parse stage inside nemo-retriever and rag-blueprint ingestion. No separate action.
- **cupynumeric:** NumPy→multi-GPU with small deltas — park until profiling says the Monte-Carlo simulators need it.
- **physicsnemo:** PDE solvers — no fit. Skip.
- **cudaq-guide:** quantum — assessed, rejected as premature (cuOpt's classical MILP dominates every practical axis today).

---

## D. Catalog-sweep finds (what the shortlist missed)

### D1. cuOpt family — cost: FREE (open-source; Brev box only)
**What it is.** NVIDIA's GPU-accelerated decision-optimization engine: vehicle routing (TSP/VRP/PDP), LP/QP, MILP (beta), via Python/C/gRPC/REST. Six skills: install, multi-objective-exploration, numerical-optimization-api, formulation, routing-api-python, server-api-python.
**Brev deploy:** Brev Launchable, or `npx skills add nvidia/skills --skill cuopt-numerical-optimization-api --yes`; server API hosts it as a service on the box.
**GPU:** modest GPUs fine.
**Revenue-engine fit:** parked — no routing/delivery lane exists (SignPreview has no physical component).
**GSE fit:** **DFS lineup construction is exactly a MILP** — maximize projected points subject to salary cap, position slots, exposure caps, stack constraints. cuOpt replaces OR-Tools CP-SAT as the GPU-backed solver: deterministic, auditable lineups; `multi-objective-exploration` maps the ceiling-vs-floor-vs-ownership tradeoff surface.
**Wildest play:** the optimizer writes its *reasoning* into the DFS packet — "this lineup exists because the solver preferred ceiling at 2× ownership discount" — turning a solver into content.

### D2. Clinical-ASR flywheel → sports transcription — cost: FREE→CHEAP GPU
**What it is.** `digital-health-clinical-asr-{setup,build,eval,finetune}`: a complete ASR flywheel — term curation → synthetic benchmark → KER scoring → fine-tune of **Parakeet TDT v2** (NeMo SFT recipe, fits 16GB VRAM, ~3400× real-time batched). Models are **CC-BY-4.0 (commercial-safe)**; Nemotron-3-Diarization + multitalker Parakeet give speaker-attributed transcripts. The "clinical" label is just packaging — the flywheel is domain-agnostic.
**Brev deploy:** Brev Launchable; fine-tune verified on a single 16GB GPU.
**Revenue-engine fit:** transcribe client intake calls → quotes/prices captured verbatim into the per-client KB feeding the receptionist.
**GSE fit:** transcribe broadcasts/podcasts/game audio → searchable text; mine analyst quotes for X replies; "what did they say at 4:12?" for the clip pipeline. Audio→text only — fully inside the video rule.
**Wildest play:** fine-tune Parakeet on *his* vocabulary (player names, betting terms) via the flywheel's own eval harness — a GSE-dialect ASR that gets sharper every season.

### D3. Nemotron Parse / nv-ingest — cost: FREE→CHEAP GPU
**What it is.** Nemotron Parse (arXiv:2511.20478): end-to-end VLM extracting formatted text (Markdown/LaTeX), bounding boxes, and semantic block classes from PDFs with reading order; token-compressed variant for batch. The extraction engine behind **nv-ingest**, which feeds the RAG Blueprint — the missing document-ingestion half of the shortlisted RAG stack.
**Brev deploy:** via the RAG Blueprint's Docker Compose; `nemotron-parse-2.0` in the Brev catalog.
**Revenue-engine fit:** Kit intake — client menus/price lists/contracts parsed straight into the per-client KB powering the receptionist and SignPreview briefs. Zero-human-input intake.
**GSE fit:** ingest the 750-paper arXiv corpus + stat PDFs without hand-written parsers; stat-sheet tables come out as Markdown tables, not OCR soup.
**Wildest play:** every PDF Garrett has ever saved becomes queryable — the "save for later" pile (self-notes-log scale) finally gets an index.

### D4. Cosmos Dataset Search — cost: CHEAP GPU (dev compose) → BIG IRON (reference layout)
**What it is.** Vector search over video archives: Cosmos-embed NIM → Milvus (cuVS-accelerated) → text-to-video and video-to-video search via React UI + REST + CLI. Built for AV scenario mining; the mechanics are pure semantic video retrieval.
**Brev deploy:** blueprint card in the Brev catalog; Docker Compose for dev, Helm for prod. Reference layout wants 2 GPUs (embed + Milvus indexNode) — start with single mid-tier GPU dev compose and test.
**Revenue-engine fit:** none today — no video archive lane.
**GSE fit:** the retrieval layer the footage operation is missing — index the game-film library, query "4th-quarter pick six" in English, get exact timestamps for the seconds-long telestrated clips the video rule requires. Zero synthetic video.
**Wildest play:** video-to-video search — feed it one great clip, get back every visually similar play ever archived. "Find me more like this" as a content strategy.

### D5. (Honest no-fit verdicts)
**Lead generation / outreach / prospecting:** nothing in the catalog — it's an engineering catalog (physical AI, CUDA-X, inference, optimization). No lead-gen, CRM, or outreach skill. Nearest: the AI-Q deep-research stack can *research* prospects, not outreach. (Community `opencue/skills` has marketing/ecommerce categories — outside NVIDIA's catalog, unverified.)
**Social content pipelines (scheduling/drafting/analytics):** nothing. Caption/drafting stays with his existing x-poster skill; posting never happens without his approval regardless.
**Website building / landing pages:** nothing — Kit lane keeps existing tooling.
**SEO:** nothing. **Marketplace/ecommerce:** nothing in-catalog. **Sports analytics/prediction/odds:** no sports-specific skill exists — Earth2Studio (weather) is the only modeling-adjacent item; the real sports finds here are infrastructure (cuOpt, Cosmos, ASR, Tesseract).

---

## E. The rankings

### Top 5 — Autonomous Revenue Engine
| # | Skill | Cost tier | Concrete job | First setup step |
|---|-------|-----------|--------------|------------------|
| 1 | **NemoClaw** | FREE→CHEAP (1 CPU VM) | Always-on sandboxed home for kit-dm-watcher; network policy *structurally* enforces draft-never-send | Launch via Brev web-UI guide; write `policy.yaml` denying Instagram send endpoints |
| 2 | **nemo-rl-session-memory** | FREE | Checkpoint convention so the watcher + Hermes handoffs resume cleanly across restarts | `npx -y skills add nvidia/skills --skill nemo-rl-session-memory`; add `session/` convention to the watcher cron |
| 3 | **rag-blueprint** (CPU-light tier) | FREE | Guardrailed, cited knowledge backend for the Kit AI Receptionist across all client sites | Deploy retrieval-only compose on a small Brev VM pointed at build.nvidia.com endpoints |
| 4 | **nemo-retriever** | FREE | Local LanceDB index of Kit docs/playbooks as the receptionist's KB (lighter than full blueprint) | `retriever ingest ./kit-docs/` on CPU + hosted embeddings |
| 5 | **aiq-deploy + aiq-research** | FREE | Autonomous deep-research backend: sign-shop prospecting, Kit lead qualification, Vow & Post trend research | `docker compose up` AI-Q on a cheap Brev VM; first job: research 10 sign shops |

### Top 5 — GSE
| # | Skill | Cost tier | Concrete job | First setup step |
|---|-------|-----------|--------------|------------------|
| 1 | **NV-Tesseract forecasting** | FREE→CHEAP GPU | Apache-2.0 time-series forecaster for the **production pick path** (unlike TimesFM-3's research-only license); fine-tune on totals/line-movement/EPA windows; DARR blends similar historical windows | Run `perform_forecasting` on NFL totals history on CPU; verdict vs naive in the prereg-eval harness |
| 2 | **VSS stack** (search-archive + ask-video + manage-video-io-storage) | FREE→CHEAP GPU (remote-offload) | The game-film brain: natural-language play finding → VLM interrogation → exact clip extraction for telestration | Deploy VSS `base` profile (remote-offload) on smallest Brev GPU; index 3 archived broadcasts; run 10 searches |
| 3 | **Earth2Studio data-fetch** | FREE | Historical weather table (GFS/ERA5, 2015–2026) for every NFL/MLB venue → wire into `hr-factors.ts` + totals path | `earth2studio-data-fetch` surface winds/temp for the venue list; build the features table |
| 4 | **nemo-retriever + rag-eval** | FREE | Research-corpus RAG over `docs/research/` with RAGAS quality gates as the corpus grows past 750 | `retriever ingest docs/research/`; build 50-question `train.json`; run rag-eval |
| 5 | **nemotron-speech** (free ASR) | FREE | Broadcast commentary → searchable text aligned to VSS timestamps; coach-speak/injury mining; podcast transcription for reply-ops | Transcribe one full game broadcast via build.nvidia.com free endpoint; align to clip timestamps |

### The 3 wildest cross-operation plays
| # | Play | Cost tier | First setup step |
|---|------|-----------|------------------|
| 1 | **The Film-to-Fortune loop.** One VSS stack, two archives: game film for GSE *and* Recordly client video + prospect videos for the revenue engine, all searchable in plain English. The same "find me the moment" infrastructure serves telestrated sports clips and client QA. | CHEAP GPU (one box, remote-offload, torn down between batches) | Stand up one VSS `base` profile; index 3 game broadcasts + 3 client videos; run 10 natural-language searches on each side |
| 2 | **The Voice Twin.** data-designer generates synthetic client conversations + GSE content pairs → nemotron-customize LoRA fine-tune → one small model that drafts receptionist replies *and* @GalaxySportsHQ posts in his voice — with NemoClaw's deny-by-default network policy as the never-send/never-post guardrail. | CHEAP GPU (single 24GB box, LoRA-scale, batch job) | `data-designer preview` 20 synthetic Kit DM conversations as the seed set |
| 3 | **The Research Machine.** aiq-research deep-research backend + nemo-retriever as long-term memory + rag-blueprint Agentic RAG as the query layer — one research backend serving sign-shop prospecting (revenue) by day and arXiv/NGS literature sweeps (GSE) by night. | FREE (CPU-only Brev VM + free endpoints) | `aiq-deploy` on a cheap Brev VM; run one cited deep-research job per operation as the shakedown |

---

## F. Suggested box build order (opinionated)

1. **Today, $0:** adopt nemo-rl-session-memory everywhere; pull NV-Tesseract and run the CPU baseline forecast vs naive (GSE); `earth2studio-data-fetch` the venue weather table (GSE); `retriever ingest` the Kit docs + `docs/research/` (both).
2. **This week, one cheap box:** NemoClaw launchable (CPU VM) as the always-on operator for kit-dm-watcher + GSE draft ops, policy-gated. VSS `base` remote-offload for the film-brain proof of concept (tear down between runs).
3. **When the workload exists:** rag-blueprint CPU-light tier (receptionist KB), aiq-deploy (research backend), cuDF ETL acceleration, cuOpt DFS MILP, DeepStream tracking pipelines, nemotron-customize LoRA (Voice Twin).
4. **Do not build yet:** Dynamo (no fleet), full self-hosted RAG (start light), 8-GPU VSS topologies, Lepton training (get a quote first), anything quantum.
5. **Supersedes earlier advice:** the "pull TimesFM-3 weights to Brev" first-job recommendation is still valid for the *research* lane, but NV-Tesseract (Apache-2.0) is now the recommended path for anything that might touch production picks.

**Lane reports:** `lane-1-agent-infra.md` · `lane-2-video-audio.md` · `lane-3-data-rag-training.md` · `lane-4-catalog-sweep.md` (all under `~/workspace/brev-research/`)

## 2026-09-25 — TileGym/cuTile DGX Spark playbook (supplied by Garrett, parked)

- TileGym benchmarks + integrates high-performance GPU kernels written with the cuTile Python DSL; compiles to Tile IR, JIT-targets DGX Spark (sm_121) and B300 (sm_103). Workflows: standalone kernel benchmarks, LLM inference with monkey-patched cuTile kernels (Qwen2-7B, DeepSeek-V2-Lite), FMHA step-by-step optimization tutorial. Kernel coverage: FMHA, MLA/MLA-decoding, MatMul/BMM/Group GEMM, RMSNorm, RoPE, SiLU/SwiGLU, Softmax, Dropout. Revision marker: Last Updated 06/16/2026, pinned v1.3.0, CUDA 13.2.0, Nsight 2025.1.3.
- Verdict: **infrastructure optimization, not a current lane fit.** This is custom-kernel engineering for people squeezing inference perf/latency at scale — valuable only AFTER profiling proves local inference cost or latency is a measured bottleneck for either the autonomous revenue engine (NemoClaw/NIM/SGLang stack) or GSE research inference (VSS, Tesseract, nemotron-speech). Revisit sequence: first stand up SGLang or NIM on a Spark, profile real workloads, then decide if cuTile is worth the engineering time. Not rejected — parked with a clear trigger condition.
- Wider DGX Spark playbook list (scRNA, portfolio opt/cuOpt, cuDF/cuML, txt2kg knowledge graphs, Unsloth/VLM/LLaMA Factory/NeMo fine-tuning, SGLang, LM Studio, Nemotron, TensorRT-LLM, NVFP4, multimodal inference, local coding agents, FLUX/ComfyUI, NIM, multi-Spark NCCL, Isaac Sim/Lab, VS Code assistants) — queued for the broad fit/later/reject sweep; only one serving stack (SGLang vs NIM vs TRT-LLM vs LM Studio) should survive.
