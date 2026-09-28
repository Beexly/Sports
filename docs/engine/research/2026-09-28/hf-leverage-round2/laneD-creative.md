# HF Research Lane D — Creative Plays: Marketing, AutoTrain, Training Reality, Competitive Signal, "Cracked Models"

All numbers verified live 2026-09-28 via HF Hub API (`huggingface.co/api`) and current web docs. No stale-memory claims.

---

## 1. Spaces as Marketing — can a public Gradio Space drive free traffic?

### What the Hub API actually says (top spaces by likes, verified 2026-09-28)

**Top-8 Spaces on the entire Hub (by likes):**

| Space | Likes | Type |
|---|---|---|
| enzostvs/deepsite | 16,610 | docker (web-app builder) |
| open-llm-leaderboard/open_llm_leaderboard | 14,122 | docker |
| jbilcke-hf/ai-comic-factory | 11,282 | docker (image gen) |
| Kwai-Kolors/Kolors-Virtual-Try-On | 10,192 | gradio (image) |
| black-forest-labs/FLUX.1-dev | 9,562 | gradio (image) |
| mteb/leaderboard | 7,698 | docker |
| dalle-mini/dalle-mini | 5,735 | static |
| AP123/IllusionDiffusion | 5,461 | gradio (image) |

**Sports / NFL / fantasy-football Spaces (by likes) — the entire category is a ghost town:**

| Space | Likes | What it is |
|---|---|---|
| DavidPagnon/sports2d | 10 | 2D sports pose estimation |
| W4njun/Team_1_Sports_selections | 3 | picks |
| YoussefAlaaa/sports-image-classifier | 3 | classifier demo |
| keremberke/nfl-object-detection | 2 | YOLO on NFL footage |
| StellarZen/proline-nfl-parlay-wizard | 2 | static parlay page |
| TrueDFS/NFL_DFS_Range_Of_Outcomes_Origin | 1 | docker, DFS sim |
| dalynbutler/NFL_Betting_Models | 1 | streamlit |
| seh363/Fantasy-Football-Expected-Points | 1 | **the only fantasy-football space with a like** |
| Kacci017/luckyoracle-betting-predictor-pro | 6 | top "betting" space |

(Note: "fantasy" as a search term is dominated by fantasy-*fiction* image gen — acvlab/FantasyTalking at 153 likes — not fantasy sports.)

**What's trending on Spaces RIGHT NOW (2026-09-28, by trendingScore):** all video/image generation. `observantdistressed/wan2-2-i2v-v3` (737 likes), `Pepe104/MiniMax-H3-Turbo-Lora-UNCENSORED` (826 likes), `Qwen/Qwen-Image-2.1` (287), `hugging-apps/qwen-image-2-1` (163), `kulkas2pintu/QWEN_EDIT_IMAGE` (583), plus `multimodalart/jev-decision-index` (305 likes, static, created 2026-09-17, updated today — a "Jev Decision Index", name coincidence with Garrett's Jev lane worth one glance).

### Verdict: organic HF discovery for a sports Space ≈ zero

The traffic numbers are unambiguous: **there is no sports audience on the Hub.** The most-liked NFL/fantasy space in existence has 1–2 likes; the most-liked sports space has 10. The discoverable, high-traffic Spaces are image/video generation toys and leaderboards. Nobody browses huggingface.co looking for NFL projections — the platform's audience is developers and model tinkerers, and the sports vertical has no community gravity whatsoever.

That kills "build a projections explorer and HF's 29M monthly visitors find it" as a thesis. HF Spaces have no usage/download counters and no algorithmic feed pushing niche content to outsiders; likes are the only public signal and the category ceiling is ~10.

**What it IS good for (sharper, honest version of the play):**
- **Free hosted interactive product, not free traffic.** A projections/rankings explorer Space (projections + rankings ONLY, per the 9/28 public doctrine — zero internals, zero NGS names) is free hosting with a public URL, Gradio in an afternoon, shareable from X. Traffic must be driven *externally* (@GalaxySportsHQ posts, bio link). Treat it as product surface, not acquisition channel.
- **SEO lottery ticket, not a plan.** huggingface.co has real domain authority (DA ~73, ~29M monthly visits). A well-titled Space *can* rank on Google for long-tail queries ("NFL week 5 projections explorer"), but that's a months-long maybe, not top-of-funnel.
- **Kit-client lead magnets: YES, with a branding caveat.** "Live interactive demo hosted free, no server bill" is a genuine Kit upsell ($350 site + a demo Space). But the URL is `huggingface.co/spaces/...` — tech-visible, HF-branded. Fine for B2B tool demos and SignPreview-style mockup tools; conflicts with the Vow & Post doctrine (tech must stay invisible) for consumer wedding branding. Use it where the buyer is the business, not the bride.

**Bottom line:** build the Space as product and demo infrastructure; budget zero organic acquisition from HF itself.

---

## 2. AutoTrain — current state (big finding: it's dead)

**Headline: AutoTrain is officially unmaintained.** The docs index (`huggingface/autotrain-advanced`, `docs/source/index.mdx`, live now) carries a warning banner:

> "This project is no longer maintained. No new features will be added and bugs will not be fixed. We recommend using Axolotl, TRL, or transformers.Trainer."

### What it was / still technically is
- No-code fine-tuning across: LLM SFT / ORPO / DPO / reward tuning, text classification/regression, token classification, seq2seq, sentence-transformer fine-tuning, VLM fine-tuning, image classification/regression, tabular classification/regression.
- Two usage paths: (a) `autotrain-advanced` pip package, run locally or on your own cloud box (you pay only your own compute); (b) the hosted no-code UI via a Docker Space from hf.co/autotrain ("Create new project"), running on paid Space GPUs — current reference pricing: small A10G at **$1.05/hour**; a recent HF blog walkthrough (Sept 2026) fine-tuned RoBERTa-base (~0.13B params) on 1,811 rows in under 15 minutes, **under $1 total**.
- Base models: "tens of thousands of models shared on the Hub and their variations" — any Hub model you have access rights to.

### Who owns the adapter + license
- The trained model is **pushed to your own HF profile** (`username/project_name`) — you own that repo and the adapter weights in it.
- **The base model's license carries.** A fine-tune is a derivative work: Llama Community License terms, Qwen license terms, etc. flow through to the adapter and anything you serve from it. Apache-2.0/MIT bases (SmolLM2, etc.) are the clean ones for commercial use; check the base card before building revenue on top.

### Fit for Garrett's three candidate uses — verdict
- **Pick-confidence classifier:** the right *shape* of problem (text/tabular classification), but AutoTrain is the wrong horse — unmaintained, and his engine is hand-rolled TS with its own calibration needs. A small sklearn/XGBoost or a TRL LoRA run he controls beats a dead no-code UI.
- **Marketplace lead scoring:** tabular classification on tiny data — AutoTrain could do it in minutes for <$1, but again, unmaintained tooling on a revenue path is a liability. Trivial to replicate in the repo.
- **Content tagging:** same — easy problem, wrong tool.

**Verdict: DO NOT adopt AutoTrain.** The no-code pitch is real but the project is abandoned by its own maintainers, who point users to Axolotl/TRL/Trainer. If no-code training is ever needed, the maintained path is a small fine-tune script on rented GPU, not AutoTrain.

---

## 3. Training Reality Check — the <2M-param movement model on ZeroGPU

The agent-bus note plans training a <2M-parameter movement model on ZeroGPU with checkpoint-and-resume. Here is the honest accounting against current docs (`huggingface.co/docs/hub/en/spaces-zerogpu`, mirror at `github.com/huggingface/hub-docs/blob/HEAD/docs/hub/spaces-zerogpu.md`, plus HF's own `huggingface/skills` ZeroGPU references — all current as of Sept 2026):

### The actual constraints
- **Quota is the *caller's*, per 24h fixed window** (resets exactly 24h after first use, not calendar-day): unauthenticated 2 min/day, **free account 5 min/day**, PRO ($9/mo) 40 min/day (extensible), Team 40, Enterprise 60. PRO/Team can overflow into credits at $1/10 min.
- **Per-call GPU window:** default 60s declared duration, declarable higher (docs show 120/300s examples); each tier has a per-call cap and the call fails admission if declared duration exceeds it. **Hard wall-clock kill at the declared duration** — overrun = process killed, `GPU task aborted`.
- **No persistence of the GPU context between calls.** GPU attaches per request, detaches on return. Checkpoints must be saved out-of-band (push to the Hub / repo storage) and reloaded next call. Container host RAM is fixed; oversized module-level loads OOM the whole Space.
- ZeroGPU hardware: NVIDIA RTX Pro 6000 Blackwell slices (`large` = half card / 48GB, `xlarge` = full card, costs 2× quota).

### What's real vs. fantasy
- **The <2M-param movement model: technically viable, operationally silly.** A 2M-param model trains at thousands of steps/second; Adam optimizer state is ~8–24MB — trivially checkpointable to the Hub between calls. With checkpoint-and-resume orchestration you could grind real training: free tier = 300 GPU-sec/day, PRO = 2,400 GPU-sec/day. It would work. But you'd be hand-rolling a distributed-training scheduler around a serverless inference product to save ~$1 of A10G time — engineering theater. **Rent one A10G at $1.05/hr (or use the GCP $300 trial earmarked for GSE) and train it in minutes like a normal person.** The ZeroGPU path is a Rube Goldberg machine that saves nothing.
- **Tiny fine-tunes / LoRA on small models: fantasy on free, marginal on PRO.** A LoRA fine-tune of even a 100M–1B model needs sustained minutes-to-hours of gradient steps; ZeroGPU gives you 5 free minutes a day in ≤300s chunks with queueing between them, and the queue prioritizes short inference jobs. You'd burn the entire daily quota for a handful of steps. PRO's 40 min/day could theoretically inch a micro-fine-tune forward across many days, but checkpoint churn + queue waits make it slower and more fragile than one $2 cloud GPU hour.
- **What ZeroGPU is actually for:** inference demos (which is why every trending Space is an image/video generator). Training on it is off-label and the docs never present it as a training product.

**Verdict: kill the ZeroGPU-training plan.** The movement model is a legitimate tiny-model training job — run it on real rented compute (A10G ~$1/hr, or GCP trial). ZeroGPU stays in its lane: free inference for Spaces demos.

---

## 4. Competitive Signal — what's trending on the Hub right now

### One sharp paragraph
The Hub is in the middle of a **distillation-and-quantization endgame for generative media**: the frontier video models (MiniMax H3, Wan, LTX-2.5) are being compressed by third parties into few-step, near-free artifacts within *weeks* of release — FastVideo's FastH3 is a 4-step DMD2 distillation of MiniMax H3 (VSA sparse attention at 0.9 sparsity), FastWan hits 3-step inference at 16 FPS on H100 with 60–90× denoising speedups, and request-switchable Turbo LoRAs let anyone serve the distilled version as a sidecar. Meanwhile the same compression wave is eating LLMs from below (ternary 2-bit Bonsai quants pulling 3.4M downloads) and the uncensored-fork scene is industrializing on top of every release. The founder read: **any moat built on "we have the faster/cheaper video model" or "we wrapped the hot open model" has a half-life measured in weeks** — the labs, FastVideo, vLLM-Omni, and the quant community commoditize it before you can price it. Build where distillation *can't* reach: proprietary data loops (his engine's calibration data), distribution (the X audience), and workflow lock-in — never the model layer.

### 5 concrete trend data points (verified 2026-09-28)
1. **Video gen owns the Hub:** MiniMax-H3 — 5,748 likes, 3.63M downloads; Lightricks LTX-2.5 — 5,408 likes, 1.60M downloads; lightx2v/Minimax-h3-Turbo — 1,010 likes, 1.54M downloads. Every trending Space is video/image generation.
2. **Distillation is the product:** FastVideo's FastH3 (4-step DMD2 student of MiniMax H3, VSA-DataFree and Dense-DataFree artifacts, published 2026-08-27) and FastWan2.1 (3-step, up to 16 FPS on H100) — few-step video is now a downloadable file, not a research result. Sources: `hao-ai-lab/fastvideo` docs, vLLM blog 2026-09-01.
3. **Extreme quantization at scale:** `prism-ml/Ternary-Bonsai-2-27B-gguf` — 2,230 likes, **3.45M downloads** for a ternary 2-bit 27B model. The "runs anywhere" wave is real.
4. **Time-series has exactly one star:** `google/timesfm-3.0-pytorch` — 902 likes, 1.29M downloads — the only time-series model trending. (Relevant watch-item for the engine's temporal modeling; nothing sports-specific exists.)
5. **Post-acquisition Nvidia footprint + new architectures:** `nvidia/Nemotron-3-Diarization` trending (26K downloads) three weeks after the **$12.93B Nvidia→HF acquisition (announced Sept 3, 2026)**; new `convaiinnovations/laya` ("system-one") and `XiaomiMiMo/MiMo-V2.6` family (Pro-RL / Distill-Qwen-9B / Flash-RL) show the distill-everything pattern spreading to LLMs.

---

## 5. "Cracked Models" — abliterated/uncensored models on HF

Yes, they exist on the Hub, openly and at scale: `huihui-ai/Huihui-Qwen3.8-27B-abliterated` (935 likes), `0bserverx/Qwen3.8-27B-Heretic-Abliterated-Uncensored-GGUF` (571 likes), the DavidAU abliterated series, uncensored DeepSeek-V4.1-Flash forks (leading fork: 2,254 downloads), `abenzerps/Qwen-Image-2.1-Uncensored-GGUF` trending right now with **1.06M downloads**, and a `MiniMax-H3-Turbo-Lora-UNCENSORED` Space trending with 826 likes. One Sept 16 audit found 49 live uncensored repos. HF has never issued a blanket ban — abliterated forks have circulated for years without takedowns, and neither HF nor DeepSeek has publicly addressed the V4.1 uncensored forks. (Pressure is building though: a July 2026 AI Forensics investigation documented NCII-abuse Spaces, and the Sept 2026 Nvidia acquisition puts a more brand-sensitive owner in charge — policy could tighten without warning.)

Founder-frame, no moralizing — **is there any legitimate use in Garrett's lanes? No:**
- **GSE predictions:** abliteration removes the refusal reflex; it adds zero predictive capability. His edge is calibration on proprietary data, not a model that "won't argue." No gain.
- **Revenue engine:** the entire doctrine is "tech stays invisible" and consumer-facing trust (wedding signage, local shops). Shipping product on uncensored forks buys brand risk for capabilities his customers never need. No gain.
- **Agent fleet:** the single semi-legit argument is over-refusal breaking agentic loops (one builder measured refusal-drops on benign prompts 5.6%→0.4% with no capability loss). But his fleet runs on API models (NVIDIA NIM, OpenRouter), not self-hosted weights — he can't abliterate someone else's API. No practical gain.

**Verdict: stay-out lane.** Nothing in GSE, the revenue engine, or the fleet gets better with abliterated models, and the downside (platform ToS shift risk under Nvidia, brand contamination, zero capability edge for his actual tasks) is all cost. If refusal behavior ever genuinely breaks an agent loop, the fix is prompt/harness engineering on the API models he already pays for — not uncensored weights.

---

## Cross-lane bottom line

| Play | Verdict |
|---|---|
| Projections/rankings explorer Space | **Build as product/demo infra, expect ~0 organic HF traffic.** Sports Spaces top out at 10 likes; drive visits from X. |
| Spaces as Kit-client demos | **Yes for B2B** (free hosted demos/lead magnets); keep off consumer brands (Vow & Post) — HF URL is tech-visible. |
| AutoTrain for classifiers/taggers | **Dead.** Officially unmaintained; maintainers point to Axolotl/TRL/Trainer. Don't build on it. |
| Training the <2M movement model on ZeroGPU | **Technically possible, practically absurd.** 5 min/day free in ≤300s chunks with no GPU persistence — rent an A10G at ~$1/hr or use the GCP trial instead. |
| Building on the video-gen/distillation wave | **Don't.** Few-step distilled video is a downloadable commodity within weeks of each release; moats there have week-scale half-lives. |
| Abliterated/uncensored models | **Stay out.** They exist at scale, HF tolerates them today, but zero of his three lanes gain anything and the brand/ToS downside is real. |

*Sources: HF Hub API (`/api/spaces`, `/api/models`, sort=likes/trendingScore, 2026-09-28); ZeroGPU docs `huggingface.co/docs/hub/en/spaces-zerogpu` + `github.com/huggingface/hub-docs/.../spaces-zerogpu.md` + `huggingface/skills` ZeroGPU references; AutoTrain docs `github.com/huggingface/autotrain-advanced` (unmaintained banner) + HF blog synthetic-data walkthrough (Sept 2026, A10G $1.05/hr); `hao-ai-lab/fastvideo` distillation docs; vLLM blog 2026-09-01 (MiniMax H3 / FastH3); shattered.io + tech-insider.org on DeepSeek-V4.1 uncensored forks; aiforensics.org July 2026 NCII investigation.*
