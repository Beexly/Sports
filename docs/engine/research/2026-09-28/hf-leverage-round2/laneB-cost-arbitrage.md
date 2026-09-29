# HF Research Lane B — Inference Provider Arbitrage + Cost Stack

**Date:** 2026-09-28 · **Method:** all numbers verified live today via provider pricing pages and APIs (no training memory).
Fleet workloads: (1) small chat/instruction calls, (2) embeddings batch over research corpus, (3) speech transcription batch.
Current stack: OpenRouter pay-per-token · NVIDIA NIM free tier (flaky) · HF ZeroGPU free/PRO · $300/90-day GCP credit (FINAL phase only — not spent early).

## (a) Cost comparison table — verified 2026-09-28

HF Inference Providers charges **no markup** — you pay the provider's rate through one HF token. Routing: `model:provider` suffix, or `:cheapest` / `:fastest` / `:preferred` policies ([HF docs](https://huggingface.co/docs/inference-providers/index)).

| Provider | Workload | Price | Unit | Source |
|---|---|---|---|---|
| OpenRouter | 8B chat — `meta-llama/llama-3.1-8b-instruct` | $0.05 in / $0.08 out | per 1M tokens | live API `openrouter.ai/api/v1/models` |
| HF → Novita | 8B chat — Llama 3.1 8B Instruct (16k ctx) | **$0.02 / $0.05** | per 1M | [novita.ai/pricing](https://novita.ai/pricing) |
| HF → DeepInfra | 8B chat — Llama-3.1-8B-Instruct-Turbo (128k ctx) | **$0.02 / $0.04** | per 1M | [deepinfra.com/pricing](https://deepinfra.com/pricing) |
| HF → Together | 8B chat — Llama 3 8B Instruct Lite | $0.14 / $0.14 | per 1M | [together.ai/pricing](https://www.together.ai/pricing) |
| OpenRouter | 8B chat — `qwen/qwen3-8b` | $0.117 / $0.455 | per 1M | live API `openrouter.ai/api/v1/models` |
| HF → DeepInfra | 9B chat — Qwen3.5-9B (256k ctx) | $0.10 / $0.15 | per 1M | [deepinfra.com/pricing](https://deepinfra.com/pricing) |
| OpenRouter | Embeddings | **none** — no embedding models in catalog (460 models scanned) | — | live API, 2026-09-28 |
| HF → Novita | Embeddings — BAAI BGE-M3 | **$0.01** | per 1M tokens | [novita.ai/pricing](https://novita.ai/pricing) |
| HF → Novita | Embeddings — Qwen3-Embedding 8B | $0.07 | per 1M tokens | [novita.ai/pricing](https://novita.ai/pricing) |
| OpenRouter | Transcription | **none** — no Whisper/per-min STT (only `gpt-audio` $2.50/$10 and `gpt-audio-mini` $0.60/$2.40 per 1M audio tokens) | — | live API, 2026-09-28 |
| Groq (direct) | STT — whisper-large-v3-turbo | **$0.00067** | per audio-min ($0.04/hr) | [openpaths plan/stt-providers.md](https://github.com/lee101/openpaths/blob/HEAD/plan/stt-providers.md) (~2026-09-23) |
| HF → DeepInfra | STT — Voxtral-Mini-3B (audio-native, not Whisper) | $0.0010 | per audio-min | [deepinfra.com/pricing](https://deepinfra.com/pricing) |
| HF → Together | STT — Whisper Large v3 | $0.0015 | per audio-min | [together.ai/pricing](https://www.together.ai/pricing) |
| HF → DeepInfra | STT — Voxtral-Small-24B | $0.0030 | per audio-min | [deepinfra.com/pricing](https://deepinfra.com/pricing) |
| OpenAI (direct) | STT — gpt-4o-mini-transcribe | $0.003 | per audio-min | [openpaths plan/stt-providers.md](https://github.com/lee101/openpaths/blob/HEAD/plan/stt-providers.md) (~2026-09-23) |
| OpenAI (direct) | STT — whisper-1 | $0.006 | per audio-min | [openpaths plan/stt-providers.md](https://github.com/lee101/openpaths/blob/HEAD/plan/stt-providers.md) (~2026-09-23) |
| HF → fal | STT — fal-ai/whisper | $0.00111 | per **compute**-sec (compute-billed, NOT audio-min — effective $/audio-min depends on their realtime factor) | [fal pricing gist](https://gist.github.com/azer/6e8ffa228cb5d6f5807cd4d895b191a4) |
| NVIDIA NIM free | 8B-class chat (open-weight models) | **$0** | 40 RPM, 10k req/day, no card | NVIDIA site, last probe [2026-09-24](https://mvalentsev.github.io/awesome-free-ai-coding/); NVIDIA staff: rate-limit-governed, no credits ([forum](https://forums.developer.nvidia.com/t/clarity-on-nim-api-free-tier-rate-limit-increases/369624)) |
| HF free tier | Inference Providers | $0.10/mo included credits | then pay-as-you-go | [huggingface/mlclaw COSTS.md](https://github.com/huggingface/mlclaw/blob/HEAD/docs/COSTS.md); [oshal](https://github.com/emeraldcoastsystemsgroup/oshal/commit/f4a045bf0a6c247cc258b8a381832dcfeb039988) |
| HF PRO ($9/mo) | Inference Providers + ZeroGPU | $2.00/mo credits · 40 GPU-min/day | — | profile [asOf 2026-09-17](https://github.com/onursendere/promoclock/blob/HEAD/src/content/tool-profiles/en/hugging-face.profile.md); [HF ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) |
| HF ZeroGPU free | any ZeroGPU Space via API | $0 | 5 GPU-min/day **caller** quota | [HF ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) |
| HF ZeroGPU overflow | beyond daily quota (PRO only) | $1 per 10 min (= $6/hr) | GPU-min | [HF ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu) |
| GCP L4 spot | self-host 8B (g2-standard-4) | $0.376–0.424/hr spot (us-east4 / us-central1); on-demand ~$0.71/hr | per hr | [sparecores, observed 2026-09-28](https://sparecores.com/server/gcp/g2-standard-4) |
| HF Spaces GPU | 1×L4 Space (persistent) | $0.80/hr | per hr | [huggingface.co/pricing](https://huggingface.co/pricing) |

Notes:
- HF partner roster today (18): Baseten, Cerebras, Cohere, DeepInfra, fal, Featherless, Fireworks, Groq, HF Inference, Novita, Nscale, OVHcloud, Public AI, Replicate, Scaleway, Together, WaveSpeedAI, Z.ai. STT-capable: fal, HF Inference, Replicate, Together. Embeddings (feature extraction): HF Inference, Scaleway, Together. ([HF docs](https://huggingface.co/docs/inference-providers/index))
- OpenRouter credit top-ups carry a ~5.5% fee ($0.80 min) — small but real on the paid lane.
- Provider choice **inside** HF matters more than HF-vs-OpenRouter: Together's Llama-8B ($0.14/$0.14) is *worse* than OpenRouter ($0.05/$0.08). Always route `:cheapest` or pin Novita/DeepInfra.

## (b) Worked examples

### 1M tokens/day of 8B-class chat (assumes 50/50 in/out mix)

| Route | $/1M tokens | $/day | $/30 days |
|---|---|---|---|
| OpenRouter `llama-3.1-8b` | $0.065 | $0.065 | **$1.95** |
| HF → DeepInfra `llama-3.1-8b-turbo` | $0.030 | $0.030 | **$0.90** |
| HF → Novita `llama-3.1-8b` | $0.035 | $0.035 | **$1.05** |
| HF → Together `llama-3-8b-lite` | $0.140 | $0.140 | $4.20 (don't) |
| NVIDIA NIM free | $0 | $0 | **$0** (fits: 1M tok/day ≈ hundreds–low-thousands of req/day ≪ 10k/day cap) |
| HF free tier ($0.10/mo) via Novita | — | — | **$0** — covers ~2.9M tokens/mo |
| HF PRO ($9/mo) via Novita | — | — | **$9 flat** — the $2/mo credit alone covers ~57M tokens/mo, i.e. the full 30M/mo need |
| ZeroGPU free (5 min/day) | — | — | **not viable** — ceiling ≈ 30–45k tokens/day (300 GPU-s × ~100–150 tok/s on half RTX Pro 6000); 1M/day is ~25× over quota |
| ZeroGPU PRO (40 min/day) | — | — | **not viable** — ceiling ≈ 240–360k tokens/day, still < 1M/day |
| GCP L4 spot, self-hosted 8B 24/7 | — | $9.60 | **~$288/mo** — breakeven vs API only at **~8.2B tokens/mo**. At 30M/mo, self-hosting is ~274× more expensive. |

### 10k transcription minutes/month (batch)

| Route | $/min | $/month |
|---|---|---|
| Groq direct — whisper-large-v3-turbo | $0.00067 | **$6.70** |
| HF → DeepInfra — Voxtral-Mini-3B | $0.0010 | **$10.00** |
| HF → Together — Whisper Large v3 | $0.0015 | **$15.00** |
| OpenAI — gpt-4o-mini-transcribe | $0.003 | $30.00 |
| OpenAI — whisper-1 | $0.006 | $60.00 |
| HF → fal — whisper | compute-billed ($0.00111/compute-s) | can't rank without their realtime factor — prefer per-audio-minute pricing for budgeting |
| ZeroGPU whisper/Parakeet Space | — | not viable at 10k min/mo (5 min/day GPU ≈ tiny; PRO 40 min/day → ~1,200 min/mo max) |

Groq whisper-turbo is **~9× cheaper than OpenAI whisper-1** for the same job. (Groq is an HF chat partner but HF's STT lane is Together/fal/Replicate/HF Inference — so Groq STT is a *direct* account, not via the HF token.)

### 10M-token embeddings batch (one-shot, bge-m3 class)

| Route | $/1M | one-shot cost |
|---|---|---|
| HF → Novita — BGE-M3 | $0.01 | **$0.10** |
| Local/CPU bge-m3 (per HF inventory lane A) | $0 | **$0** |
| OpenRouter | — | no offering |

One-shot batch makes this a non-decision on cost: use Novita via HF or free CPU.

## (c) Honest verdict

**There is real arbitrage, but the absolute dollars are small — the wins are in free tiers, not per-token spreads.**

1. **Chat: move the paid fallback from OpenRouter → HF router, keep NIM as the free primary.**
   HF via Novita/DeepInfra Llama-3.1-8B is ~2× cheaper than OpenRouter's identical model ($0.90–1.05/mo vs $1.95/mo at 1M tok/day) — pennies either way, but the HF free tier ($0.10/mo ≈ 2.9M 8B tokens/mo) and PRO ($9/mo, $2 credits ≈ 57M tokens/mo) can carry the *entire* small-chat lane at zero marginal cost. NIM free (40 RPM / 10k req/day) remains the biggest free lunch — keep it first in the cascade with the retry logic already spec'd.
2. **Transcription: the biggest real arbitrage — move off OpenAI.**
   Groq whisper-large-v3-turbo direct at $0.00067/min ($6.70/mo per 10k min) vs OpenAI whisper-1 at $0.006/min ($60/mo): **~9×**. Via HF token: DeepInfra Voxtral-Mini $10/mo or Together Whisper $15/mo. Batch it; none of these are latency-sensitive.
3. **Embeddings: don't overthink.** One-shot batch = $0.10 via HF→Novita BGE-M3, or $0 on CPU. Never pay per-token embedding prices for a batch job.
4. **ZeroGPU is NOT a cost arbitrage for fleet inference.** 5 min/day ≈ dozens of calls / ~36k 8B tokens/day ceiling; PRO's 40 min/day still can't do 1M/day. Worse, quota is **reserve-then-settle on declared duration** — a Space left at the default 60s duration rejects callers once remaining quota < 60s, and queued cold-starts make it fragile for agents. Value = demos and one-off GPU experiments, not the pipeline. And the $1/10min overflow = $6/hr ≈ **~$13.90/1M tokens** at 120 tok/s — ~400× the Novita rate. Never overflow for chat.
5. **GCP $300: hold for the final phase** per Garrett's directive. Self-hosted 8B on L4 spot only beats API pricing above ~8B tokens/mo — the fleet isn't there. When the credit is spent, the documented order stands: full-scale GPU backtests on the final build first.

### The catches (read before migrating)
- **HF free tier is $0.10/mo, then pay-as-you-go through HF billing** (card on file). Fine at these volumes; just know the meter starts almost immediately for STT at scale.
- **Confirm per-model provider availability in the HF playground/router before migrating** — DeepInfra and Novita both list Llama-3.1-8B in their catalogs, so `meta-llama/Llama-3.1-8B-Instruct:novita` / `:deepinfra` is expected to route, but the mapping is per-model and changes. Use `:cheapest` with a pinned fallback, not blind faith.
- **HF router rate limits are unpublished**; the `:fastest`/`:cheapest` failover is the mitigation, not a guarantee.
- **Data control doesn't improve.** Prompts go to third parties under OpenRouter, HF providers, NIM, and Groq alike. (Side note: NVIDIA announced a $12.93B agreement to acquire HF on 2026-09-03 — the NIM and HF lanes may converge; watch terms.)
- **ZeroGPU quota is consumed by the CALLER's account** (the fleet's HF token), not the Space host's — confirmed in HF's own skill docs and two independent writeups. Unauthenticated callers share a 2-min/day bucket. Window is a fixed 24h from first use, not calendar-day.
- **NIM free tier is flaky by reputation**: threads of new keys 404ing on every chat call, silent model-ID renames, throttling under load, dev/eval terms, no SLA. That's why it's first-in-cascade with fallback, never the only lane.
- **fal whisper's compute-billing is unbudgetable** without their realtime factor — for cost planning, stick to per-audio-minute STT pricing.

### Bottom line for the fleet
| Workload | Move to | Keep as |
|---|---|---|
| Small chat/instruction (paid lane) | HF router → Novita/DeepInfra Llama-3.1-8B (~$1/mo; free tier covers ~3M tok/mo) | NIM free first (with retries); OpenRouter only for models absent from HF providers |
| Embeddings batch | HF → Novita BGE-M3 ($0.10 one-shot) or free CPU | — |
| Transcription batch | Groq whisper-large-v3-turbo direct ($6.70/10k min) or HF → Together/DeepInfra ($10–15) | — |
| ZeroGPU | demos/one-offs only | never the inference pipeline; never overflow |
| GCP $300 | final phase only | — |
