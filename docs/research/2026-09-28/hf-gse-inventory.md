# Hugging Face × GSE — repo audit + opportunity inventory (2026-09-28)

**Question:** Garrett has HF ZeroGPU access and believes HF was discussed for GSE but never wired up.
**Answer:** Correct. HF appears in the repo only as documentation and license-forbidden registry entries.
Zero code calls it. ZeroGPU was used once in real life (voice-clone tests, local only) and planned
once (agent-bus movement-model note). Everything below is evidence-first: repo paths, commit SHAs,
HF URLs, licenses — every HF URL cited was verified live via the HF API on 2026-09-28.

---

## 1. Repo audit: what's actually there

### Verdict summary

| Location | What it says | Verdict |
|---|---|---|
| `packages/`, `apps/`, `scripts/` (all remote branches) | Zero `transformers` / `huggingface_hub` / `from_pretrained` imports — grep returned nothing | **NOT WIRED** |
| `packages/prediction-engine/` | Pure TypeScript statistical models: Bayesian, Poisson, Dixon-Coles, Elo, conformal, isotonic, Kalman-style — no ML framework at all | **NOT WIRED** |
| `apps/web/lib/opportunity-engine/source-registry.ts:140` | `huggingface-hub-discovery` entry pointing at `https://huggingface.co/api/models?...` — metadata only, **no consumer** anywhere in repo | **PLANNED (dead entry)** |
| `packages/data-ingestion/src/source-registry.ts` | Two HF dataset entries, both `verdict: "forbidden"`: `SmartStake/mlb-player-props` (621M rows, CC-BY-4.0 "research/educational" — refused: redistributing book quotes into SaaS) and `huggingface-kalshi-api-dump` (`RooseveltHonaker/kalshi-trades-data` — refused by `predexon-client.ts`: "Refusing to ingest") | **PLANNED (license fence)** |
| `packages/stats-api/src/sources/external-registry.ts:272` | `── HuggingFace / CV ──`: `MCG-NJU/SportsMOT`, `Davidsv/CourtSide-Computer-Vision-v0.1`, `facebook/detr-resnet-50` — registry metadata under the standing "research-first, not silent commercial" doctrine | **PLANNED (metadata)** |
| `docs/ops/archive/leverage/EXTERNAL_LEVERAGE_MAP.md:21` | `## HuggingFace / CV (research-first, not silent commercial)` — SportsMOT, TeamTrack, CourtSide YOLO, detr-resnet-50, SoccerNet, Roboflow, BaseballCV; law block: "research_only ≠ commercial ingest", "CC-BY-SA = hold" | **PLANNED (doctrine)** |
| `docs/research/2026-09-24/brev-skills-dossier/lane-2-video-audio.md` | HF model bring-up skill (SafeTensors→ONNX→TensorRT for detection models); Parakeet TDT link; Nemotron Parse 2.0 HF card | **PLANNED (research)** |
| `docs/research/2026-09-24/brev-skills-dossier/lane-3-data-rag-training.md` | `nvidia/NVIDIA-Nemotron-Parse-2.0` (HF, Aug 2026); `nvidia/nv-tesseract-forecasting` HF link; cuDF ETL | **PLANNED (research)** |
| `docs/research/2026-09-24/brev-skills-dossier/lane-4-catalog-sweep.md` | NVIDIA skills catalog sweep referencing HF model cards | **PLANNED (research)** |
| `handoff/leverage/02-ai-llm-ml.md` | "HuggingFace 3D" listed among image/video-gen tools — all **SKIP** for the prediction-engine mission | **PASSING MENTION** |
| `docs/arxiv-program/.../arxiv-deep/*.md` (~40 files) | Paper extracts citing HF dataset URLs (BasketHAR, SC2EGSet, ExposureEngine, HypoData, etc.) | **PASSING MENTION** |
| Zero `zerogpu` / `zero-gpu` hits anywhere in code or docs | — | **NEVER MENTIONED** |

### The two "we talked about it" items (from memory, not the repo)
1. **ZeroGPU actually used — 2026-09-13.** Garrett suggested HF Spaces/ZeroGPU for VoiceStudio; a subagent ran
   true zero-shot voice cloning through free ZeroGPU Gradio APIs: `k2-fsa/OmniVoice` (verified live today:
   1,351 likes, gradio) and `mrfakename/E2-F5-TTS` (verified: 2,906 likes, gradio). ~7s inference.
   Outputs in `~/workspace/your_files/voicestudio-test/`. Commercial licensing unresolved (OmniVoice
   weights flagged CC-BY-NC). **This is the only real HF usage to date — and it lives outside any repo.**
2. **ZeroGPU planned — 2026-09-26 (agent-bus).** Movement-model training plan: "<2M params, mixed precision,
   per-epoch checkpoint+resume... inference as ZeroGPU Spaces endpoint." Plan only; the movement module
   (`packages/prediction-engine/src/tracking/cv-movement-primitive.ts`) still has no detector and no weights.

### Current ML stack (what HF would plug into)
`packages/prediction-engine` is 100% hand-rolled TypeScript statistics — no torch, no ONNX, no Python ML
runtime in the serving path. Anything HF provides must therefore arrive as **an API** (ZeroGPU Space,
Inference Provider, or self-hosted microservice) or as **data** (datasets), not as in-process weights.
This is a hard architectural fact for every item below.

---

## 2. ZeroGPU brief (current, per official HF docs)

**What it is:** a shared, dynamically allocated GPU pool for Hugging Face Spaces. A Space runs as a normal
Python process with no GPU attached; functions decorated with `@spaces.GPU(duration=...)` get a real GPU
attached for the declared window, then it's returned to the pool. **Gradio-only, PyTorch-first.**
Docs: https://huggingface.co/docs/hub/en/spaces-zerogpu

**Hardware (current):** NVIDIA RTX Pro 6000 Blackwell. Two sizes: `large` (half card, 48 GB VRAM, 1× quota)
and `xlarge` (full card, 96 GB, 2× quota). (Backing hardware has changed before — A100, H200 — recheck
before sizing.)

**Daily quotas (per official docs):**

| Account | GPU quota/day | Queue priority | Host cap |
|---|---|---|---|
| Unauthenticated | 2 min | Low | — |
| Free (verified email, 30+ day old) | 5 min | Medium | 2 ZeroGPU Spaces |
| PRO ($9/mo) | 40 min (extensible) | Highest | 10 Spaces |
| Team org | 40 min (extensible) | Highest | 50 Spaces |
| Enterprise org | 60 min (extensible) | Highest | 50 Spaces |

Quota resets 24h after first use. PRO/Team/Enterprise can buy prepaid credits at **$1 per 10 min** beyond quota.

**Calling from code:** `pip install gradio_client` → `Client("org/space").predict(...)`. **The caller's own
quota is consumed** — a free account gets 5 GPU-minutes/day of other people's Spaces too. This is exactly
how the 2026-09-13 voice-clone tests ran.

**Key limitations:**
- Gradio only — no Streamlit, Docker, or Static Spaces on ZeroGPU.
- Default 60s GPU runtime per call (configurable via `duration=`); cold starts and queueing — priority
  follows remaining quota, so free-tier callers wait behind PRO.
- No `torch.compile` (use PyTorch ahead-of-time compilation, torch 2.8+); don't lazy-load models inside
  the decorated function (CUDA emulation handoff is optimized for startup-placed tensors).
- No persistence beyond Space storage; not a training cluster (the 2026-09-26 movement plan's
  checkpoint-and-resume design is the honest way to train on it, if at all).
- **Production honesty:** visitor quotas make ZeroGPU wrong for public-facing high-traffic endpoints.
  It's an internal/prototype tier. Anything customer-facing needs dedicated GPU or an Inference Provider.

---

## 3. Opportunity inventory (every URL verified live 2026-09-28)

### GSE engine

| Asset | License (verified) | Consume via | Fit |
|---|---|---|---|
| `amazon/chronos-t5-large` — probabilistic time-series foundation model | **Apache-2.0** ✓ | ZeroGPU Space or self-host; API into TS engine | **LATER** — real ensemble candidate for totals/spreads, but only after the projection-source lock + backtest. Engine doctrine: no model without MAE/RMSE/Spearman proof. |
| `google/timesfm-2.0-500m` — Google's time-series FM | Apache-2.0 (known) but **GATED** — must accept terms on HF | Same as above | **LATER** — second time-series head once Chronos is evaluated. |
| `Salesforce/moirai-1.0-R-small` | **CC-BY-NC-4.0** ✗ | — | **SKIP** — non-commercial, incompatible with GSE. |
| `time-series-library/lag-llama` | **GATED**, license unverified | — | **LATER** — check card after accepting; not first pick. |
| `facebook/detr-resnet-50` — detection bootstrap for the movement module | Apache-2.0 (known) | Already in `external-registry.ts` as research-first | **LATER** — use when detector wiring starts; registry entry exists. |
| NFL datasets on HF (`tuxmx/nfl_bets_scores`, `keremberke/nfl-object-detection`, `dolly-the-sheep/NFL_game_footage`, etc.) | **None declared** on any of them | — | **SKIP** — unlicensed scraps, 0–7 likes each. No nflverse mirror exists on HF. nflverse-direct + Neon remain the source. |
| `MCG-NJU/SportsMOT` (player tracking eval) | **CC-BY-NC-4.0** ✗ | — | **SKIP for product** — eval/research only, consistent with existing doctrine. |
| Embeddings for the research corpus: `BAAI/bge-m3` (**MIT** ✓), `mixedbread-ai/mxbai-embed-large-v1` (**Apache-2.0** ✓); reranker `BAAI/bge-reranker-v2-m3` (**Apache-2.0** ✓) | Permissive ✓ | CPU, in-process or microservice | **USE NOW** — retrieval over the 585-paper arXiv corpus + X analytics sweep. Cheapest high-value ML win available; zero GPU needed. |

### GSE content

| Asset | License (verified) | Consume via | Fit |
|---|---|---|---|
| `nvidia/parakeet-tdt-1.1b` — speech recognition | **CC-BY-4.0** ✓ (attribution required) | ZeroGPU Space or NVIDIA NIM endpoint | **USE NOW** — commentary transcription lane (brev lane-4 already flagged it). Give attribution, it's clean. |
| `nvidia/NVIDIA-Nemotron-Parse-2.0` — PDF/chart→structured text | **OpenMDW-1.1** (NVIDIA Open Model License — review terms before commercial use) | ZeroGPU / NIM | **LATER** — research-intake parsing; license review first. |
| Sports predictor Spaces (`saimanideeppellimari/NFL_prediction`, `seh363/Fantasy-Football-Expected-Points`, etc.) | n/a | — | **SKIP** — all 0–1 likes, dead personal projects. GSE engine stays home-grown per the re-implementation rule. |

### Revenue engine (Garrett: "efficiency, production, overhead, customer service, retention")

| Asset | License (verified) | Consume via | Fit |
|---|---|---|---|
| `Qwen/Qwen3-8B`, `Qwen/Qwen3-4B-Instruct-2507` — small instruction models | **Apache-2.0** ✓ | Self-hosted ZeroGPU Space (counts toward the 2-space free cap) | **USE NOW** — internal fleet chat, classification, Kit client-site FAQ drafts, Vow & Post inquiry handling. Replaces paid API spend on non-user-facing work. Honest limit: 5 min/day free caller quota — fine for internal batch use, not for a public 24/7 bot (that needs PRO credits or dedicated GPU). |
| `mistralai/Mistral-7B-Instruct-v0.3` | **Apache-2.0** ✓ | Same | **LATER** — fallback option behind Qwen3. |
| `black-forest-labs/FLUX.1-schnell` — image generation | **Apache-2.0** ✓ | ZeroGPU Space (needs the VRAM — fits `large`) | **USE NOW** — POD design concepts (the 5 trademark-safe concepts), SignPreview mockups, Vow & Post graphics. Commercial-safe license is the whole point. |
| `lightx2v/Minimax-h3-Turbo` — distilled MiniMax H3 video | **Apache-2.0** ✓ | ZeroGPU `xlarge` (96 GB) or the planned GCP L4 | **LATER** — ties directly to the existing AI-video watchlist; no local GPU needed if run on ZeroGPU. GSE real-footage doctrine unaffected (revenue-engine only). |
| `OpenVDN/vdn-minimax-h3` — hybrid attention acceleration | Custom ("other") — review | — | **LATER** — review license before use; lightx2v is the cleaner pick today. |
| `k2-fsa/OmniVoice`, `mrfakename/E2-F5-TTS` — zero-shot voice cloning | OmniVoice weights flagged **CC-BY-NC** (2026-09-13 finding, unresolved) | ZeroGPU (already proven working) | **USE NOW with caution** — commentary voice lane works technically; resolve commercial licensing before any client-facing use. |

---

## 4. Prioritized top-10 action list

1. **Stand up a private ZeroGPU Space serving Qwen3-4B-Instruct-2507 (Apache-2.0) as the fleet's free
   internal LLM endpoint.** Highest leverage: kills paid-API spend on classification, tagging, draft
   copy, and Kit client-site FAQ drafts. $0 on the free tier; counts as 1 of 2 free hosted Spaces.
2. **Embed the research corpus with bge-m3 (MIT) on CPU.** 585 arXiv papers + X analytics + brev
   dossiers become retrievable. No GPU, no quota, no license risk — the cheapest real ML win.
3. **Wire Parakeet TDT-1.1B (CC-BY-4.0, attribute it) via ZeroGPU for commentary transcription.**
   Unblocks the sports-content audio lane without depending on NVIDIA NIM.
4. **FLUX.1-schnell (Apache-2.0) ZeroGPU Space for POD/signage design generation.** Commercial-safe
   license; feeds the 5 POD concepts and SignPreview mockups directly.
5. **Chronos (Apache-2.0) as a probabilistic ensemble head for totals/spreads — gated behind the
   projection-source lock and a backtested MAE/RMSE/Spearman evaluation.** No model enters the
   engine without proof; this is the procedure, not a shortcut.
6. **Accept TimesFM 2.0's gated terms; evaluate as the second time-series head** once Chronos has a number.
7. **When detector wiring starts on the movement module, bootstrap from facebook/detr-resnet-50**
   (already in the registry as research-first) rather than training from zero.
8. **Run MiniMax H3 Turbo (lightx2v, Apache-2.0) on ZeroGPU `xlarge` for the AI-video watchlist**
   — no local GPU box required; revenue-engine only.
9. **Resolve the OmniVoice CC-BY-NC flag** before any client-facing voice work; F5-TTS terms still
   unverified — check both cards before the commentary-voice lane goes near customers.
10. **Fix or remove the dead `huggingface-hub-discovery` entry** in
    `apps/web/lib/opportunity-engine/source-registry.ts:140` — it points at the HF models API with
    no consumer; either wire it into the model-intake flow or delete it so the next audit doesn't
    chase a ghost.

### Standing rules this inventory respects
- CC-BY-NC / non-commercial assets (Moirai, SportsMOT, OmniVoice weights) never touch the product —
  research/lab only, matching the existing SmartStake/Kalshi fence precedents.
- "Discovery is not approval" (already written in the source-registry notes): every model gets
  license + security (SkillSpector) + benchmark review before install.
- Gated models (TimesFM, Lag-Llama) need per-model terms acceptance — a Garrett tap, not an agent action.
- Garrett's HF account tier is the practical ceiling: free = 5 GPU-min/day caller quota + 2 hosted
  ZeroGPU Spaces. PRO ($9/mo) → 40 min/day + 10 Spaces. Worth it the week any of items 1/3/4 go
  beyond prototyping.
