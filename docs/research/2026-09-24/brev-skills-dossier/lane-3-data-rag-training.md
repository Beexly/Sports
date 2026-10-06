# Lane 3 — DATA / RAG / TRAINING skills (Brev/NVIDIA catalog)
Researched 2026-09-24, read-only (public docs). License/cost notes marked UNVERIFIED where not published.

## Cross-cutting: how these deploy on Brev + cost posture

- Skills are plain guidance/CLI repos (Apache 2.0) — free. The burn is the GPU box you run them on. Brev is per-hour instance billing; slashdot comparisons show a "$0.04/hr" Brev line (that reads like a CPU instance) but **per-GPU-hour Brev pricing was not verifiable from public docs — UNVERIFIED**. Garrett's Brev instance is a launchable shared by NVIDIA; check actual per-hour GPU rate + any free credits inside the launchable dashboard before running jobs. Mark every job with a cap.
- Cost posture per skill below: free-hosted NVIDIA NIM endpoints (build.nvidia.com free tier; Garrett already holds an `nvapi-` NIM key) vs self-hosted NIM containers (GPU burn) vs pure-CPU paths.

---

## 1. accelerated-computing-cudf

**What it does (docs):** Official NVIDIA-authored agent guidance for cuDF GPU DataFrames — pandas-compatible GPU acceleration (`cudf.pandas` zero-code-accelerator mode), dask-cuDF for multi-GPU, ETL, joins, groupby, CSV/Parquet I/O, nullable semantics. A skill wrapper around a real library, not a service. ([NVIDIA/skills catalog](https://github.com/NVIDIA/skills), [RAPIDS docs](https://docs.rapids.ai/api/cudf/stable/))

**Deploy on Brev:** pip install on any Linux CUDA box: `pip install cudf-cu12` (CUDA 12) / `cudf-cu13`. No server needed — it's a library inside your existing Python jobs. CPU fallback is plain pandas when no GPU.

**GPU requirements:** Volta+ (compute capability ≥ 7.0), CUDA 11.2+/12+, Python 3.10+, Linux only. A single mid-range GPU is plenty; dask-cuDF can scale multi-GPU on bigger Brev boxes.

**Cost:** Library itself free (Apache 2.0). GPU-hour burn only, and only during ETL windows. CPU fallback = $0.

**Fit — Revenue Engine:** One line: not needed now; the Kit/SignPreview/Vow & Post stack has no DataFrame-heavy ETL.

**Fit — GSE (strong):** This is the backtest-data wrangler. Concrete jobs: (a) GPU-accelerate the nflverse + odds-API ETL (parquet I/O, joins of play-by-play × odds × weather, groupby aggregations) — `cudf.pandas` gives speed with zero code changes by setting an env var; (b) backtest ledger crunching (3,411+ picks growing daily, per-season CV splits) — groupbys that are slow on pandas get 10–50× on one GPU; (c) odds line-movement ETL from The Odds API snapshots (wide tick-level frames). Cheapest useful GPU in the whole lane; test on CPU-free fallback first.

**Docs:** https://github.com/NVIDIA/skills (skill dir `accelerated-computing-cudf`), https://docs.rapids.ai/install, https://docs.rapids.ai/api/cudf/stable/

---

## 2. nemo-retriever

**What it does (docs):** NeMo Retriever 26.8.1 — one `retriever` CLI that runs extract → embed → LanceDB vector index in a single command over folders of PDFs, images, Office files, HTML, text, audio, and video. Extraction stages: layout/page-elements, OCR, table/structure extraction, chart detection, VLM captioning; embedding via `nvidia/llama-nemotron-embed-1b-v2`; query with optional rerank. Long-running `retriever service` mode also exists. ([SKILL.md](https://github.com/nvidia/nemo-retriever/blob/HEAD/.claude/skills/nemo-retriever/SKILL.md))

**Deploy on Brev:** pip/apt install of the NeMo Retriever Library into a venv (skill has `references/install.md`; multimedia extras need ffmpeg + libreoffice). **CPU-host viable:** when `NVIDIA_API_KEY` is set, OCR/embed/page-elements stages route to NVIDIA's hosted endpoints instead of local GPU — no GPU needed for modest corpora. GPU speeds up local self-hosted stages.

**GPU requirements:** Optional. CPU + hosted NIM endpoints works (that is the explicit fallback in the skill). Self-hosting the NIMs wants one decent GPU; multi-stage full pipeline is the GPU consumer.

**Cost:** Library free (Apache 2.0). Hosted endpoint path = free build.nvidia.com tier (rate-limited) + Garrett's existing NIM key. GPU path = GPU-hours only during ingest bursts. **Ingest is one-shot; querying a LanceDB table is CPU-trivial — near-zero ongoing burn.**

**Fit — Revenue Engine (medium):** Local document-search over the Kit playbook corpus: proposals, pricing, FAQ docs, client intake files → `retriever ingest ./kit-docs/` + `retriever query "what is the Vow & Post refund policy"` as the knowledge base behind the Kit AI receptionist (TASK-012), cheaper and more accurate than stuffing context windows.

**Fit — GSE (strong):** Research-corpus RAG. Concrete job: ingest `docs/research/<date>/` (the 750-paper arXiv ledger notes, GSE benchmark dossiers, competitive-intel files) into a local LanceDB index on a Brev box (or CPU + hosted embeddings). Then engine/research queries like "what did the corpus conclude about CPOE vs EPA for QB totals?" become one CLI call instead of grepping hundreds of files. This replaces the ad-hoc file-scanning workflow the research coordinators do today.

**Docs:** https://github.com/nvidia/nemo-retriever/blob/HEAD/.claude/skills/nemo-retriever/SKILL.md, https://github.com/nvidia/nv-ingest, https://docs.nvidia.com/nemo/retriever/latest/extraction/overview/

---

## 3. rag-eval

**What it does (docs):** Quality benchmark for the NVIDIA RAG Blueprint's filesystem layout: feed it `corpus/` + `train.json`, it runs `scripts/eval/evaluate_rag.py`, toggles retrieval/generation flags (reranker on/off, query rewriting, temperature), and reports RAGAS metrics (faithfulness, answer relevancy, context precision/recall) as JSON with failure triage. Quality side only — latency/load is rag-perf's job. ([SKILL.md](https://github.com/nvidia/skills/blob/HEAD/./skills/rag-eval/SKILL.md))

**Deploy on Brev:** Clone `NVIDIA-AI-Blueprints/rag`, `uv sync --project scripts/eval` (Python 3.11+), point at a reachable RAG server (defaults localhost:8081) + ingestor (8082). Judge calls need `NVIDIA_API_KEY`.

**GPU requirements:** The evaluator itself is CPU-light. But it benchmarks a *deployed* RAG server — that server's GPU needs apply (see rag-blueprint: multi-GPU NIM stack in production profile; or the light `retriever service` path instead).

**Cost:** Evaluator free (Apache 2.0); NVIDIA_API_KEY for the RAGAS judge = free build.nvidia.com tier. Cost lives in whatever hosts the RAG server.

**Fit — Revenue Engine:** Weak. Only if the Kit receptionist knowledge base graduates to a full RAG Blueprint server — then rag-eval is the quality gate ("did the new FAQ ingestion break answer faithfulness?"). Parked until then.

**Fit — GSE (medium):** The quality harness for job #2's research-corpus RAG. Concrete: build a `train.json` of ~50 known-answer questions over the arXiv corpus ("which papers support state-space injury models?"), run rag-eval before/after re-indexing to prove retrieval quality doesn't regress as the corpus grows past 750. Cheap (judge calls only) and it matches Garrett's measurement-first discipline (prereg-eval.ts already exists in the engine).

**Docs:** https://github.com/nvidia/skills/blob/HEAD/./skills/rag-eval/SKILL.md, https://github.com/NVIDIA-AI-Blueprints/rag

---

## 4. rag-perf

**What it does (docs):** Config-driven performance benchmark for a deployed RAG Blueprint server: `rag-perf -c <config>` runs a server-side profiling pass (per-stage timing, bottleneck inference) plus an optional aiperf load test (TTFT, E2E latency, token/request throughput, error rate) and writes a unified report. Presets: quick/standard/comprehensive/synthetic. ([SKILL.md](https://github.com/practicalswan/agent-skills/blob/HEAD/rag-perf/SKILL.md))

**Deploy on Brev:** Same blueprint repo, `uv sync --project scripts/rag-perf`, `pip install -e ./scripts/rag-perf` for the aiperf endpoint plugin; needs the RAG server reachable and optionally a synthetic-query LLM endpoint.

**GPU requirements:** Tool itself is CPU-light; measures a GPU-hosted server. Note: rag-perf runs WITHOUT `NVIDIA_API_KEY` (unlike rag-eval).

**Cost:** Free tool (Apache 2.0). UNVERIFIED beyond that — the measured server's GPU-hours are the only cost.

**Fit — Revenue Engine:** None. One line.

**Fit — GSE:** One line: only relevant if the research RAG becomes a hosted service with latency SLAs; a local LanceDB CLI query path doesn't need load testing.

**Docs:** https://github.com/practicalswan/agent-skills/blob/HEAD/rag-perf/SKILL.md, https://github.com/NVIDIA-AI-Blueprints/rag/pull/519

---

## 5. data-designer

**What it does (docs):** NeMo Data Designer — open-source declarative synthetic-data pipeline builder. Declare columns/types/prompts/validators (YAML or Python config); the engine resolves dependencies as a DAG, batches, validates, and judges outputs, orchestrating external LLM inference servers (NIM, OpenAI, vLLM) over HTTP. Ships SFT chat, tool-calling, and DPO preference-pair templates; preview a few rows, then scale to 10k+ records. ([NeMo docs](https://nvidia-nemo.github.io/Nemotron/dev/), [DataDesigner docs](https://nvidia-nemo.github.io/DataDesigner/))

**Deploy on Brev:** `pip install data-designer`, point it at an inference endpoint (free NIM endpoints, Garrett's AI/ML API key, or a local vLLM on the box). `data-designer preview` then `data-designer run`. Cluster-scale via Lepton/Slurm env profiles.

**GPU requirements:** None required — it's an orchestrator; the LLM endpoint holds the GPU. Local vLLM = 1 GPU.

**Cost:** Framework free (Apache 2.0). Cost = whatever the inference endpoint charges per token: free tier NIM / Garrett's topped-up AI/ML API key / self-hosted vLLM (GPU-hours). UNVERIFIED per-token for any paid endpoint until quoted.

**Fit — Revenue Engine (medium):** Generate synthetic client-inquiry / objection datasets to train and regression-test the Kit AI receptionist (TASK-012) — "angry customer asks about pricing," "asks for service we don't offer" — without waiting for real DM traffic. Also wedding-signage copy variant generation for Vow & Post listings at scale.

**Fit — GSE (medium):** Synthetic training data for the sports-betting domain: (a) generate SFT pairs for a GSE-specific assistant ("explain this engine pick in @GalaxySportsHQ voice") from seeded engine outputs — pairs with nemotron-customize for a voice-locked model; (b) DPO preference pairs (good vs bad pick explanations) to align a content model to Garrett's copy rules. Caveat: synthetic data is for *content*, not for faking backtest data — never train the pick engine on synthetic game outcomes.

**Docs:** https://nvidia-nemo.github.io/DataDesigner/, https://github.com/NVIDIA-NeMo/DataDesigner

---

## 6. nemotron-customize

**What it does (docs):** Plans/chains repo-native Nemotron customization pipelines via a `nemotron step` CLI: curation (`nemo_curator` JSONL cleaning), translation, SFT/PEFT (AutoModel or Megatron-Bridge), CPT/pretraining, RL alignment (DPO/RLVR/GRPO/RLHF), BYOB/MCQ benchmarks, checkpoint conversion (Megatron→HF), ModelOpt quantization/pruning/distillation, env profiles (local/Slurm/Lepton), and evaluation of checkpoints or endpoints. "This skill is ready for commercial/non-commercial use," Apache 2.0. ([SKILL.md](https://github.com/nvidia/skills/blob/HEAD/./skills/nemotron-customize/SKILL.md))

**Deploy on Brev:** Clone `nvidia-nemo/nemotron`, `nemotron step list/show/run`; backends: local GPU, Slurm, or Lepton (NVIDIA cloud). Start with `tiny` configs for bring-up validation.

**GPU requirements:** Real training = 1+ NVIDIA GPUs; LoRA/PEFT on a 8B-class model fits a single 24GB+ card; full SFT/RLHF wants multi-GPU. CPU-only env profiles exist only for data-prep steps.

**Cost:** Skill free; Lepton cloud backend is metered — UNVERIFIED pricing, get a quote before launching. On Brev, cost = GPU-hours; a PEFT LoRA run on Nemotron 3 Nano is a single-box-hours-scale job, RLHF/GRPO is the expensive end. Always cap.

**Fit — Revenue Engine (medium):** The end state of the Kit AI receptionist: fine-tune/DPO a small Nemotron model on real + synthetic (data-designer) client conversations so the $49/mo widget answers in Garrett's voice, escalates unknowns, and never invents prices. That's a LoRA-scale job — cheap.

**Fit — GSE (medium, content side only):** Fine-tune a small model for GSE content ops: X voice for @GalaxySportsHQ replies, DFS write-up boilerplate, pick-explanation generation in the approved voice. Do NOT route pick probabilities through an LLM — the calibration lane stays in the TypeScript/Python engine.

**Docs:** https://github.com/nvidia/skills/blob/HEAD/./skills/nemotron-customize/SKILL.md, https://nvidia-nemo.github.io/Nemotron/dev/, https://github.com/nvidia-nemo/nemotron/blob/HEAD/skills/INDEX.md

---

## 7. Earth2Studio family (install / discover / data-fetch / deterministic-forecast)

**What it does (docs):** Earth2Studio is NVIDIA's open-source AI weather/climate framework. The four Brev skills are: `earth2studio-install` (env setup, model extras), `earth2studio-discover` (which models/data sources fit a use case), `earth2studio-data-fetch` (download weather/climate data for specific variables, times, lead times from sources like GFS/ERA5), `earth2studio-deterministic-forecast` (build single-member forecast scripts: model + data source + IO backend + step count). ([NVIDIA/earth2studio](https://github.com/NVIDIA/earth2studio))

**Deploy on Brev:** `npx skills add NVIDIA/skills --skill earth2studio-install` etc.; `uv run` Python; example: `FCN3` (FourCastNet3) + `GFS()` data + `ZarrBackend`, ~10 lines for a forecast.

**GPU requirements:** Inference-only models (FourCastNet3 etc.) run on a single GPU; data-fetch is CPU + network. Exact VRAM per model — UNVERIFIED from docs; FourCastNet-class models are designed to run on modest GPUs.

**Cost:** Framework + models open-source (Apache 2.0); data sources are public (GFS/ERA5). Cost = GPU-hours for forecast runs only. Free-first: data-fetch alone (CPU) is already valuable.

**Fit — Revenue Engine:** One line: no weather dependency; skip.

**Fit — GSE (STRONG — top-3 find of this lane):** Weather is already an engine input (MLB HR factors module has a weather term; NFL totals want wind/temperature). Concrete jobs: (a) `earth2studio-data-fetch` to pull historical GFS/ERA5 surface winds/temperature/pressure for every NFL/MLB game location 2015–2026 → build the historical weather-features table the engine currently lacks; (b) `earth2studio-deterministic-forecast` with FourCastNet3 for game-day wind/temp forecasts as a second opinion against API weather feeds; (c) feed these into `props/hr-factors.ts` and the NFL totals path. This is the highest-ROI Earth2Studio play: real features, not vibes.

**Docs:** https://github.com/NVIDIA/earth2studio, https://github.com/nvidia/earth2studio/blob/HEAD/AGENTS.md, https://build.nvidia.com/skills?q=earth2studio

---

## 8. nemo-automodel-* family (brief, per request)

Four public skills under `nvidia-nemo/automodel` — the PyTorch-native distributed LLM/VLM training library with HF support:
- `nemo-automodel-model-onboarding` — onboard a new LLM/VLM/MoE/diffusion model family. GSE: none (no custom architectures).
- `nemo-automodel-recipe-development` — create/modify training + eval recipes (SFT, PEFT/LoRA, DAPT, reasoning-SFT, speculative/EAGLE, DPO/RLHF). GSE: medium — the lower-level alternative to nemotron-customize for training the content-voice LoRA; pick one, not both.
- `nemo-automodel-distributed-training` — FSDP2, HSDP, pipeline/context parallelism. GSE: none (single-box LoRA at most).
- `nemo-automodel-launcher-config` — Slurm/SkyPilot job submission. GSE: none.

One-line verdict: useful only if Garrett trains a GSE content model; nemotron-customize is the friendlier entry point, AutoModel the deeper one.

Docs: https://github.com/nvidia-nemo/automodel/blob/HEAD/skills/README.md, https://github.com/NVIDIA-NeMo/Automodel

---

## 9. nemotron-parse-2.0 / nemotron-ocr-v2 (brief)

No standalone Brev skills — they are **models, not skills**: `nemotron-ocr-v2` (NIM container `nvcr.io/nim/nvidia/nemotron-ocr-v2:2.0.1`, also a hosted endpoint) and `nemotron-parse` (hosted endpoint + NIM), consumed *inside* nemo-retriever and rag-blueprint ingestion. Nemotron Parse 2.0 (HF, Aug 2026, <1B params, vision-encoder-decoder) converts scanned PDFs/slides/forms/charts into structured text — chart-to-table parsing included. ([HF model card](https://huggingface.co/nvidia/NVIDIA-Nemotron-Parse-2.0), [NeMo Retriever support matrix](https://docs.nvidia.com/nemo/retriever/extraction/prerequisites/))

**Deploy/GPU:** via the retriever skill's hosted endpoints (free tier, no GPU) or self-hosted NIMs on the GPU box.

**Fit — Revenue Engine:** One line: client PDFs/proposals could route through retriever's built-in parse; nothing standalone needed.

**Fit — GSE:** One line: the OCR/parse stage already inside nemo-retriever — that's how scanned research PDFs and chart-heavy papers get into the corpus index. No separate action.

---

## Good finds from the catalog scan (sports prediction / time-series / backtesting)

### A. tao-finetune-nv-tesseract-forecasting — TOP FIND for GSE
Transformer-based **multivariate time-series forecasting** with self-supervised pretraining (MOMENT-1-large backbone), three inference modes: standard, **DARR** (context-enhanced kNN retrieval blending: `alpha*direct + (1-alpha)*kNN` against historical windows), and interpretability (lag×horizon attribution, trajectory stability, PDF report). Fine-tunes just the forecasting head (encoder frozen by default) — 5 epochs, batch 8, lr 1e-4 defaults. **Hardware: 1× CPU minimum; 1× NVIDIA GPU ≥8GB VRAM recommended for fine-tuning. Weights public on HF, no auth needed.** License per skill card: Apache-2.0. Install: `npx skills add nvidia-tao/tao-skill-bank --skill tao-finetune-nv-tesseract-forecasting` (install command shape UNVERIFIED — skill bank repo is `nvidia-tao/tao-skill-bank`).
- **GSE fit (strong):** the TimesFM-3 lane is non-commercial-licensed and benchmark-only. NV-Tesseract is Apache-2.0 → it can live in the **production pick path**, not just the benchmark lane. Concrete jobs: (1) fine-tune on Garrett's own time series — closing-line movement, team EPA/game rolling windows, HR/game league rates — as a second forecaster alongside the engine's statistical models; (2) DARR mode retrieves *similar historical windows* (e.g. "games with this wind/temp/totals profile") and blends them into the forecast — conceptually adjacent to the CUSUM regime flags already in the engine; (3) interpretability bundle gives lag×horizon attribution Garrett can cite in research notes. Start: run `perform_forecasting` on NFL totals history on CPU, compare vs naive baseline in the prereg-eval harness.
- **Revenue Engine:** none.
- **Docs:** https://github.com/nvidia-tao/tao-skill-bank/blob/HEAD/skills/models/tao-finetune-nv-tesseract-forecasting/SKILL.md, https://github.com/NVIDIA/NV-Tesseract, https://huggingface.co/nvidia/nv-tesseract-forecasting

### B. cufolio — backtesting find
GPU-accelerated Mean-CVaR / Mean-Variance portfolio optimization via the cuOpt solver: KDE scenario generation, efficient frontier, **backtest portfolios against benchmarks**, scheduled/drift-trigger rebalancing, from price data (S&P 500/100, Dow 30, or user CSV). Apache 2.0.
- **GSE fit (medium, indirect):** it's equities, not sports — but the *machinery* ports: scenario generation + walk-forward backtest + rebalancing ≈ the pick engine's backtest harness. Concrete job: steal the pattern (KDE scenarios → CVaR downside control → backtest vs benchmark) for **bankroll/Kelly staking optimization** — treat the pick ledger as a return series, optimize stake sizing under downside-CVaR constraints, backtest the staking rule against flat-staking. Garrett's Kelly/sizing arXiv cluster maps directly onto this.
- **Revenue Engine:** none.
- **Docs:** skill `cufolio` in https://github.com/NVIDIA/skills; SKILL.md mirror: https://github.com/tomevault-io/tomes/blob/HEAD/./nvidia-ai-blueprints--cufolio/skills/cufolio/SKILL.md

### C. cupynumeric-* (bonus, not requested but relevant)
NumPy/SciPy on multi-node multi-GPU: migrate existing NumPy code with minimal changes, parallel I/O (HDF5). 
- **GSE fit (medium):** Monte-Carlo simulation scale-up — the engine's game-outcome simulators are NumPy; cupynumeric migrates them to multi-GPU with small code deltas when one box stops being enough. Parked until profiling says so.
- **Revenue Engine:** none.
- **Docs:** skill dir `cupynumeric-*` in https://github.com/NVIDIA/skills

### D. physicsnemo-discover / physicsnemo-shard-tensor
Physics-ML framework skills (SciML model discovery, multi-GPU sharding). **Verdict: no fit for either operation** — sports forecasting doesn't need PDE solvers; skip.

---

## Ranked recommendations for Garrett

1. **NV-Tesseract forecasting → GSE production pick path** (Apache-2.0, CPU-startable, GPU ≥8GB for fine-tune, public weights). Fine-tune on totals/line-movement series; benchmark against naive inside the existing prereg harness. The clean commercial alternative to the TimesFM-3 research-only lane.
2. **Earth2Studio data-fetch → GSE weather features** (free data, CPU). Build the 2015–2026 historical weather table for NFL/MLB venues; wire into `props/hr-factors.ts` + totals path. Deterministic-forecast as a game-day second opinion later.
3. **accelerated-computing-cudf → GSE ETL** (free library, one GPU, CPU fallback). GPU-accelerate nflverse/odds backtest ETL; `cudf.pandas` = zero-code-change wins.
4. **nemo-retriever → GSE research-corpus RAG** (free; CPU + hosted NIM endpoints viable). Index `docs/research/` into LanceDB; rag-eval as the quality gate as the corpus grows.
5. **data-designer → synthetic eval/training sets** (free framework; inference cost = endpoint). Synthetic client conversations for the Kit receptionist; DPO pairs for a GSE voice model.
6. **nemotron-customize → later, LoRA voice model** (single-GPU scale). Kit receptionist + @GalaxySportsHQ content voice. Only after 1–5.
7. cufolio patterns → staking/Kelly optimization research (pattern theft, not the finance tool itself).
8. rag-perf, physicsnemo, cupynumeric (until profiling demands), nemotron-parse/ocr standalone: park.

## Open cost questions (all UNVERIFIED — do not quote as fact)
- Brev per-GPU-hour pricing and any free credits on Garrett's launchable — check the launchable dashboard.
- Lepton cloud backend pricing for nemotron-customize training jobs.
- Per-token cost on any paid inference endpoint backing data-designer runs (vs free NIM tier / Garrett's AI/ML API key balance).
