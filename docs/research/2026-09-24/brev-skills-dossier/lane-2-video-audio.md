# Brev/NVIDIA Skills Deep-Dive — Lane 2: Video/Audio

**Researcher lane:** VIDEO/AUDIO skills · **Date:** 2026-09-24 · **Mode:** read-only (public docs + GitHub), no live browser

**Standing constraints applied:** HARD VIDEO RULE — no generative/AI-slideshow video output, ever. All video skills below are analysis/search/transcription tooling over REAL footage, which is the compliant side. Free endpoints first; exact per-GPU pricing marked UNVERIFIED where not published; spend always named with a cap.

---

## Quick verdict (read this first)

| Skill | One-line verdict |
|---|---|
| vss-summarize-video | Use it, but only the "ingest own footage" half. Timestamped narrative summaries of recorded clips via VLM/LLM — GSE: summarize full game tape into timestamped event lists; Revenue: summarize client testimonial/QA footage. |
| vss-ask-video | Strongest GSE fit in the lane. Ask natural-language questions about a clip and get VLM answers off the pixels — "what coverage is the safety in?" before clip selection. |
| VSS Blueprint (launchable) | The umbrella deployer. One-click Brev launchable spins up the whole search+summarize+Q&A stack. GPU burn is the constraint — run the cheap profile, not the 8-GPU one. |
| deepstream-dev | Build custom video-analytics pipelines (detect → track → alert) on cheap GPUs. GSE: player/ball detection+tracking on game film; Revenue: automated clip-bounder pipelines. |
| deepstream-import-vision-model | Zero-touch on-ramp for any HF/NGC object-detection model into DeepStream — ONNX→TensorRT→nvinfer→benchmark→PDF report, autonomously. |
| nemotron-speech | Best free speech stack in the catalog: ASR/TTS/translation via build.nvidia.com free hosted endpoints (no credit card), self-hosted NIM containers if needed. |

**Generative-video check:** none of the six assigned skills is generative-video. No exclusion lines needed for the assigned set.

---

## Cost signals (lane-wide, applies to everything below)

- **build.nvidia.com hosted NIM inference: FREE tier.** Signup (NVIDIA Developer Program, no credit card) yields an `nvapi-` key hitting `https://integrate.api.nvidia.com/v1`. Catalog is 100+ models (as of ~Apr–Jun 2026) including speech (Nemotron-ASR, Parakeet-family ASR/TTS), VLMs, LLMs, embeddings. Community reports ~40 RPM free-tier rate limit and free credits sufficient for prototyping (amounts NOT published on the page — UNVERIFIED exact quota). When credits run out, requests fail; developer program grants more periodically or you move to paid/self-hosted.
- **Brev launchables:** one-click sandbox instances with pre-downloaded blueprint repos. The VSS launchable provisions **2× RTX PRO 6000** (AWS) or **8× L40S** (Crusoe). Third-party comparisons list Brev's base at ~$0.04/hr (that appears to be platform/CPU pricing; per-GPU-hour rates UNVERIFIED from public sources). RTX PRO 6000 is a 96GB Blackwell card retailing ~$16,000 (Aug 2026) — instance hours on that class are NOT cheap. **Cap discipline: spin up, run the batch job, tear down. Never leave a 2×RTX PRO 6000 idle.**
- **Self-hosted NIM containers:** require NVIDIA AI Enterprise entitlement + NGC API key for the registry (per skill prereqs). Self-hosted Riva/Nemotron speech NIMs specifically gate on the AI Enterprise entitlement — the free path is build.nvidia.com.
- **DeepStream itself:** free SDK (open-source monorepo since 9.1), containers free on NGC. Cost is purely GPU-hours, and it runs on cheap GPUs (T4 fine for detection+tracking pipelines — see skill #4).

---

## Skill 1: vss-summarize-video

**What it does.** An agent skill (Apache-2.0, NVIDIA VSS team) that produces a single polished narrative summary of one recorded video clip, with timestamped events. It routes to the LVS (Long Video Summarization) microservice as the primary backend whenever its `/v1/ready` probe returns 200, with a human-in-the-loop (HITL) confirmation step gating the LVS path; if LVS is unreachable it falls back to a direct VLM NIM call (no HITL on the fallback path). It explicitly does NOT do live RTSP captioning or report generation (those belong to `vss-deploy-dense-captioning` / `vss-generate-video-report`).

**Deploy on Brev.** Not a launchable itself — it's one skill inside the VSS blueprint repo's `skills/` tree. You deploy a VSS profile (`base` or `lvs`) via `vss-deploy-profile` on a Brev instance (or any GPU host), then the skill drives curl-level API calls against it. The repo ships profile references (`base`, `alerts`, `lvs`, `search`, `edge`, `brev`, `ngc`, `prerequisites`) plus a Brev setup helper.

**GPU requirements.** The `lvs` profile needs a VLM NIM + LLM + embedding/reranker. Cheapest validated path is the **"complete remote deployment"** profile from the VSS README: VLM/LLM/embedding/reranker all remote (build.nvidia.com free endpoints), requiring only a **minimum-8GB-VRAM GPU locally** — a T4/L4-class instance works. Local topologies scale up: single-GPU = 1× H100/A100-80GB/H200/B200 or 2× L40S; default local = 8× A100-80GB/H100/H200/B200 or 8× L40S. Given the budget, the remote-offload profile is the only sane default.

**Cost.** Free tier: LVS microservice container is free; VLM calls ride build.nvidia.com's free credits (UNVERIFIED quota). GPU burn = whatever Brev instance hosts the profile — keep to the remote-offload profile and tear down between runs. Nothing in the skill docs names a per-call price.

**Fit — REVENUE ENGINE.** (a) **Client QA/turnaround pipeline:** point it at recorded walkthrough/testimonial videos clients submit and get timestamped summaries + flagged change requests instead of watching raw footage. (b) **kit-dm-watcher adjunct:** summarize video DMs/prospects' site-teardown videos into text briefs the DM agent can act on. (c) **Recordly post-processing:** auto-generate timestamped chapter lists/summaries for client delivery without human review passes.

**Fit — GSE.** (a) **Game-tape summarization:** ingest full recorded broadcasts and get timestamped narrative summaries — "3rd quarter, 8:12 — 3rd & 9, Cover 2 shell, completion over middle" — feeding the content ops' clip-shortlisting before any human watches. (b) **Post-game recap feedstock:** timestamped event lists become the source material for the telestration prep and the X content-op's daily packets. This is analysis over REAL footage — fully inside the hard video rule.

**Docs links.**
- https://github.com/NVIDIA-AI-Blueprints/video-search-and-summarization (blueprint + all skills)
- https://github.com/NVIDIA-AI-Blueprints/video-search-and-summarization/tree/main/skills (skills index)
- https://github.com/nvidia/skills/blob/HEAD/./skills/vss-summarize-video/SKILL.md (official skill file in NVIDIA/skills)
- https://docs.nvidia.com/vss/latest/index.html (VSS documentation)

---

## Skill 2: vss-ask-video

**What it does.** Ask the VSS agent's `video_understanding` tool a fresh visual question about a recorded clip — "what happens in this clip," "what formation is the offense in," "what color are the receiver's gloves" — and get a natural-language answer grounded in the actual pixels via VLM inference. It is explicitly for questions that CANNOT be answered from metadata, prior tool output, or search hits (it forces a fresh look at frames). Note a real doc bug worth knowing: the skill catalog describes it as calling the agent's `/generate` endpoint, but the actual SKILL.md has a hard rule "never call /generate" and posts directly to the VLM's chat/completions endpoint — NVIDIA's docs repo was being corrected on this (Sep 2026).

**Deploy on Brev.** Same pattern as #1: needs a VSS `base` (recommended) or `lvs` profile running; skill probes the agent at `$HOST_IP:8000` and hands off to `vss-deploy-profile -p base` if nothing is up. All inside the VSS blueprint's Brev workflow.

**GPU requirements.** `base` profile is the light one: single VLM NIM + agent. Same remote-offload option applies — point the VLM at build.nvidia.com and the host GPU only needs ~8GB VRAM. Cheapest viable lane in the whole VSS stack.

**Cost.** Free build.nvidia.com VLM calls (quota UNVERIFIED) + Brev GPU-hours while the profile is up. Cheapest per-question cost of any skill here — no long-running stream infrastructure, just a profile + questions.

**Fit — REVENUE ENGINE.** (a) **Visual QA agent:** "Does this sign mockup have legible text at thumbnail size?" / "Is the phone-frame render showing the correct client site?" — ask questions about generated SignPreview/Vow & Post preview images/video instead of a human eyeballing every render. (b) **Prospect research:** ask visual questions about a prospect business's own video content ("what services are visible on their storefront sign?") to personalize Kit outreach at scale.

**Fit — GSE.** This is the **highest-leverage skill for GSE content ops.** (a) **Play-finding copilot:** after `vss-search-archive` returns candidate clips, ask "what defensive coverage is shown pre-snap?" or "does the clip show the full route or is it cut off?" — VLM answers decide what gets clipped, no human scrubbing. (b) **Telestration prep:** ask targeted questions to extract the exact visual facts (down/distance, hash, formation) the telestrator/commentary needs before editing. (c) **Verification pass:** spot-check that a clipped highlight actually contains what the summary claims — kills mislabeled clips before they reach @GalaxySportsHQ. All REAL footage, all analysis — hard-rule compliant.

**Docs links.**
- https://github.com/nvidia/skills/blob/HEAD/./skills/vss-ask-video/SKILL.md (official skill — verify against this, not forks)
- https://github.com/paritoshd-nv/skills/blob/HEAD/skills/vss-ask-video/SKILL.md (skill-card with commercial-use/readiness notes)
- https://docs.nvidia.com/vss/latest/index.html

---

## Skill 3: "Build a Video Search and Summarization (VSS) Agent" (NVIDIA launchable blueprint)

**What it does.** NVIDIA's GA AI Blueprint (part of the Metropolis platform) for building video-analytics AI agents: ingest massive volumes of live or archived video and extract insights via natural-language video search (fusion search across video embeddings + CV attribute embeddings — Cosmos Embed1 + CV attributes), video summarization (LVS/VLM, up to 100× faster than manual review per NVIDIA), interactive visual Q&A, real-time alerts with VLM verification, object tracking, event review, audio transcription (speech-to-text transcripts stored for multimodal scene understanding, added in the GA release), and multimodal model fusion. It's the parent stack that skills #1 and #2 plug into, alongside 13+ other skills.

**Deploy on Brev.** One-click **NVIDIA Launchable**: pre-configured sandbox instance (documented paths: **2× RTX PRO 6000 SE on AWS** or **8× L40S on Crusoe**) with the VSS GitHub repo pre-downloaded; the `search` profile starts automatically on launch. A Brev setup helper + deploy notebooks (`deploy/1_Deploy_VSS_docker_Crusoe.ipynb` etc.) handle prerequisites (NGC API key, build.nvidia.com key). Deployable via Docker Compose profiles (`base`, `search`, `lvs`, `alerts`, `edge`, `brev`, `ngc`, `warehouse`).

**GPU requirements.** See the validated topology table from the README (Sep 2026): default local = 8× B200/H200/H100/A100-80GB or 8× L40S; reduced = 4×; single-GPU = 1× H100/A100-80GB/H200/B200 or 2× L40S with NVILA-15b VLM + Llama-3.1-8B; **complete remote = any 8GB-VRAM GPU** with VLM/LLM/embedding/reranker all remote. The launchable's 2× RTX PRO 6000 is the trial sandbox, not a production recommendation.

**Cost.** Launchable = promotional sandbox pricing (exact Brev GPU-hour rate UNVERIFIED — treat any 2×RTX PRO 6000 run as expensive-by-default and cap it). Production design should be the **remote-offload profile on a cheap instance + free build.nvidia.com NIMs**; that combination is near-zero marginal cost until free credits exhaust. Self-hosted NIM containers need an NVIDIA AI Enterprise entitlement — that is the paid tier, no price named in docs.

**Fit — REVENUE ENGINE.** (a) **Archived-call mining:** ingest the kit-dm-watcher era's accumulated prospect/client video assets and natural-language-search them ("show me every clip where a prospect mentioned pricing") — a searchable institutional memory no human has to maintain. (b) **Alerts on client streams:** the alerts profile watches client sites' embedded video/social streams for brand-safety or mention events (narrow, real use — not surveillance theater).

**Fit — GSE.** The blueprint is the **GSE game-film brain**: (a) archive every recorded broadcast; (b) `vss-search-archive` ("find every 3rd-and-long conversion vs Cover 2") returns ranked clips with timestamps; (c) `vss-summarize-video` + `vss-ask-video` interrogate the candidates; (d) `vss-manage-video-io-storage` extracts the exact clip ranges for the telestration/edit pipeline. This is the compliant pipeline the 2026-09-10 full-operation dial needs: REAL footage in, timestamped candidates out, commentary-led editing downstream — never generative filler.

**Docs links.**
- https://build.nvidia.com/nvidia/video-search-and-summarization/blueprintcard (blueprint card + Launchable)
- https://github.com/nvidia-ai-blueprints/video-search-and-summarization
- https://docs.nvidia.com/vss/latest/index.html
- https://docs.nvidia.com/vss/latest/content/cloud_brev.html (Brev launchable docs)

---

## Skill 4: deepstream-dev

**What it does.** General DeepStream SDK development skill (DeepStream 9.x) using the Python `pyservicemaker` API — the newer, non-GStreamer-expert-friendly layer over DeepStream. It teaches a coding agent correct API usage via 13 bundled reference docs (GStreamer plugin properties, Pipeline/Flow API, pipeline patterns like playback/multi-inference/cascaded GIE, Kafka messaging, nvinfer + nvtracker configs, REST API/dynamic source management, Docker images, troubleshooting). Scope: video analytics pipelines, GStreamer-based processing, TensorRT inference integration, object detection/tracking, Kafka/message-broker output.

**Deploy on Brev.** Not a launchable — it's a coding skill installed into the agent (`~/.claude/skills/deepstream-dev/` or workspace-level). The runtime is the DeepStream 9.1 stack: NVIDIA compute stack (driver, CUDA, cuDNN, TensorRT), DeepStream containers from NGC, on any CUDA host — including a cheap Brev GPU instance or this VM. A Brev launchable workflow for a DeepStream coding agent exists in the repo (`deploy/brev/`).

**GPU requirements.** Friendly: DeepStream pipelines with YOLO-class detectors + NvDCF/NvSORT trackers run in real time on a **T4/L4/A10** class GPU; TensorRT engines build once per GPU architecture. No H100-class hardware needed for 2D detection+tracking workloads.

**Cost.** SDK and containers free; NGC pulls need only a free NGC account/API key. Cost is pure GPU-hours on whatever instance runs the pipeline — the cheapest lane in this report if kept to T4/L4 spot-class instances.

**Fit — REVENUE ENGINE.** (a) **Automated clip-bounding pipeline:** detect scene changes / on-screen text regions / talking-head segments in client video deliverables to auto-chapter and auto-trim — replaces manual Recordly review. (b) **Sign-shop lead arbitrage support:** batch-process scraped storefront/photos to detect signage presence/condition at scale (detection, not generation — compliant).

**Fit — GSE.** (a) **Player/ball detection + tracking on game film:** build a pipeline (nvinfer YOLO → nvtracker) that emits per-frame tracks with IDs — the raw material for automated stat extraction (routes, separation, yards-after-catch proxies) feeding the prediction engine's tracking-data lanes. (b) **Play-boundary detection:** scene/event detection to auto-segment full broadcasts into candidate play clips, replacing manual scrubbing before the VSS search layer. (c) **Real-time option:** the same stack could run live on Sunday streams for alert-on-big-play triggers feeding the content-op queue (alerts profile territory).

**Docs links.**
- https://github.com/NVIDIA/DeepStream (monorepo: SDK, skills, tools, Brev launchable)
- https://developer.nvidia.com/deepstream-getting-started
- https://github.com/nvidia-ai-iot/deepstream_coding_agent (deepstream-dev skill origin + references)

---

## Skill 5: deepstream-import-vision-model

**What it does.** Fully autonomous model bring-up: give it a HuggingFace or NGC URL and it (1) acquires the model (downloads ONNX or exports SafeTensors→ONNX via optimum-cli, extracts labels), (2) builds a dynamic TensorRT engine via trtexec with batch-size scaling and warm-cache reuse, (3) generates a custom nvinfer bbox parser, builds the .so, runs single-stream KITTI validation then a multi-stream sweep, and (4) emits 5 benchmark charts plus a Markdown/HTML/PDF report under `models/<model_name>/reports/`. Runs unattended. Scope: **object-detection models only** (DETR/RT-DETR, YOLO family, GroundingDINO/OWL-ViT zero-shot) — classification/segmentation/pose are rejected up front.

**Deploy on Brev.** Coding skill installed into the agent; executes on any CUDA host with DeepStream + TensorRT. The DeepStream Brev launchable (`deploy/brev/deepstream_code_agent_launchable.ipynb`) stages the skills into the agent automatically.

**GPU requirements.** Engine build needs the target GPU architecture (TensorRT engines are arch-specific) but any CUDA GPU works — T4 fine for YOLO-class; heavier transformer detectors benefit from A10/L40S. One-time build cost per model, then inference is cheap.

**Cost.** Zero software cost (Apache-2.0 + CC-BY-4.0). GPU-hours only during the automated build+benchmark sweep; engines are cached and reused.

**Fit — REVENUE ENGINE.** (a) **Zero-touch model onboarding for the clip pipelines:** when a better open-vocab detector drops on HF (e.g., a signage/text-region detector), this skill brings it into the production DeepStream pipeline with a benchmark report — no ML engineer in the loop. (b) Supports the zero-human-input mandate: model refresh becomes a scheduled job, not a Garrett task.

**Fit — GSE.** (a) **Player/jersey-number/ball detector upgrades:** pull the latest sports-tuned detection models from HF/NGC into the game-film pipeline autonomously, benchmarked, with the PDF report as the acceptance artifact. (b) **Zero-shot query detectors (GroundingDINO/OWL-ViT):** text-promptable localization ("find the quarterback") inside the clip pipeline without training anything — pairs directly with vss-ask-video's question layer.

**Docs links.**
- https://github.com/nvidia-ai-iot/deepstream_coding_agent/blob/HEAD/skills/deepstream-import-vision-model/skill-card.md
- https://github.com/NVIDIA/DeepStream

---

## Skill 6: nemotron-speech

**What it does.** Single routing surface for all NVIDIA Nemotron Speech (public name for what docs still call **Riva** / Riva NIM) workflows: ASR (speech-to-text), TTS (text-to-speech), and NMT (translation). Covers cloud-hosted inference via build.nvidia.com, self-hosted Docker deployment, ASR client protocols (gRPC/HTTP/WebSocket), custom NeMo model builds via riva-build, and pipeline tuning (Silero VAD, Sortformer diarization, chunk size, pronunciation/SSML for TTS). Companion skill `nemotron-asr-finetune` routes domain/language adaptation through the cheapest sufficient path. Note: all commands/images/doc URLs still say "Riva" — the rename is brand-only.

**Deploy on Brev.** Two paths: (1) **free:** hit the hosted endpoints on build.nvidia.com with an `nvapi-` key — no GPU, no container; (2) **self-hosted:** pull the Riva NIM containers from NGC onto a Brev GPU instance (Docker + NVIDIA Container Toolkit + NGC API key). Self-hosted Riva NIMs require an NVIDIA AI Enterprise entitlement per the skill prereqs.

**GPU requirements.** Cloud path: none. Self-hosted: ASR NIMs (Parakeet, Canary) run on modest GPUs — 8–16GB VRAM class is typical for streaming ASR; exact model-by-model VRAM numbers are in the per-model NIM cards (not enumerated here).

**Cost.** **Best free signal in the lane:** build.nvidia.com hosts Nemotron-ASR / Parakeet ASR+TTS endpoints on the free tier (no credit card; quota UNVERIFIED, community reports ~40 RPM free). Self-hosted = Brev GPU-hours + AI Enterprise entitlement (paid; price not named in docs).

**Fit — REVENUE ENGINE.** (a) **Commentary/voiceover transcription for Recordly:** transcribe client video voiceovers for caption files and edit notes — free endpoint, zero marginal cost. (b) **kit-dm-watcher voice notes:** transcribe Instagram voice-message DMs from prospects into text the draft-reply agent can act on. (c) TTS: generate scratch voiceover drafts for client video revisions — **scratch/internal only; final client deliverables keep real/human VO per the standing rule against synthetic media as output.** (d) NMT: translate Kit site copy/testimonials for bilingual local-business clients.

**Fit — GSE.** (a) **Broadcast commentary transcription:** transcribe game audio to text — commentary becomes a searchable signal aligned to the VSS timestamped summaries (play-by-play text + visual analysis = multimodal clip selection). (b) **Press-conference/coach-speak mining:** transcribe and search coach/player audio for injury/status language feeding the causal/injury research lanes. (c) **Podcast/social listening:** transcribe GSE-adjacent sports audio (podcasts, spaces) for the content-op's reply-opportunity monitor. (d) **Diarization:** Sortformer speaker labels separate play-by-play from color commentary — cleaner quote extraction for posts. ASR only; no synthetic voice anywhere near @GalaxySportsHQ.

**Docs links.**
- https://github.com/nvidia-riva/nemotron-speech-skills (official skill repo)
- https://github.com/nvidia/skills/blob/HEAD/./skills/nemotron-speech/SKILL.md
- https://docs.nvidia.com/nim/speech/latest/index.html (Nemotron Speech / Riva NIM docs)
- https://build.nvidia.com (free hosted endpoints)

---

## Missed skills worth flagging (same catalogs, video/audio adjacent)

These were NOT in the assigned six but sit in the same NVIDIA skill repos and directly serve the two operations:

1. **`vss-search-archive`** (NVIDIA-AI-Blueprints/video-search-and-summarization/skills) — natural-language search over video archives via multi-embedding fusion (Cosmos-Embed1) + CV attribute matching + VLM critique; also ingests files/RTSP. **This is the GSE play-finder**: "find every red-zone fade to the left corner" over archived broadcasts, ranked clips with timestamps. Arguably the single highest-value VSS skill for GSE.
2. **`vss-manage-video-io-storage`** — VIOS REST: recording timelines, **clip extraction**, snapshot capture, sensor/stream management. **This is the clipping pipeline's hands**: extract exact timestamp ranges as files for the telestration/edit stage.
3. **`vss-deploy-detection-tracking-2d`** — deploy/operate the RTVI-CV 2D detection+tracking microservice (warehouse 2d/3d, sparse4d, smartcity rtdetr/gdino) via REST. Prebuilt alternative to hand-rolling DeepStream pipelines — GSE could stand up tracking without writing the pipeline at all.
4. **`vss-deploy-video-embedding`** — RT-Embed video embedding microservice standalone; the search backbone if GSE wants embeddings without the full VSS stack.
5. **`vss-generate-video-report`** — formatted markdown analysis reports from the VSS agent (`/generate`), per-clip VLM (Mode A) or incident-range (Mode B). GSE: per-game analysis reports feeding the daily content packets.
6. **`vss-deploy-dense-captioning`** — RT-VLM dense captioning microservice on streams; anomaly detection via VLM. GSE live-game option.
7. **`vss-manage-alerts`** — real-time alert rules on streams with VLM verification. GSE: big-play alerts during live games → content-op queue.
8. **`nemotron-asr-finetune`** (nvidia-riva/nemotron-speech-skills) — plans ASR domain/language adaptation via the cheapest sufficient path. GSE: fine-tune on sports commentary jargon (down/distance patter, player names) if base ASR underperforms.
9. **DeepStream extras** (NVIDIA/DeepStream/skills): `deepstream-run-mv3dt` (multi-camera 3D tracking reference app — overkill for broadcast film but noted), `deepstream-profile-pipeline` (Nsight Systems profiling + config derivation — performance tuning for the clip pipelines), `amc-run-video-calibration` (camera calibration on MP4s — not needed for broadcast), `rtvi-cv-scaffold-vss-service` (scaffold a custom CV microservice publishing to VSS via Kafka — the bridge between custom DeepStream pipelines and the VSS search layer).

---

## Recommended sequencing (lane-2 take)

1. **Immediate, zero GPU:** `nemotron-speech` via build.nvidia.com free endpoints — commentary transcription and voice-DM transcription, no spend.
2. **Cheap proof-of-concept:** VSS `base` profile on the smallest Brev GPU with VLM/LLM/embedding remote (build.nvidia.com) — validate `vss-search-archive` + `vss-ask-video` on a few archived game broadcasts. Tear down between runs.
3. **Pipeline hardening:** `deepstream-dev` + `deepstream-import-vision-model` to build the always-on detection/tracking clip-bounding pipeline on T4/L4-class spot instances.
4. **Skip for now:** the 8-GPU local VSS topologies and the 2×RTX PRO 6000 launchable as anything other than a short sandbox session — the remote-offload profile does the same job at ~zero marginal cost.

**Open/capped items for the parent:** (a) exact build.nvidia.com free-credit quota and rate limits — UNVERIFIED, needs a live account check; (b) exact Brev per-GPU-hour pricing for T4/L4/A10/RTX PRO 6000 — UNVERIFIED from public sources, needs the Brev console; (c) the `vss-ask-video` doc discrepancy (catalog says `/generate`, skill says never) — resolved in favor of the SKILL.md but flag if behavior differs; (d) NVIDIA AI Enterprise entitlement cost for self-hosted speech NIMs — not published in the skill docs.
