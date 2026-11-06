# Multi-Cloud Compute, Partnerships & Zero-Waste Governance Playbook

**Date:** 2026-11-06  
**Scope:** NVIDIA Inception & NIM, Google Cloud & Developer Program, Alibaba Cloud & Model Studio, DeepInfra, RunPod FlashBoot GPU, Scaleway Generative APIs, PostHog `$50,000` Grant Governor, and Impact.com Partnerships.

---

## 1. Live Compute & Credit Routing Matrix (`intelligence/routing/zero_waste_model_router.py`)

| Tier | Provider / Program | Live Account / Case ID | Endpoint & Rate Limit Governance | Primary Workload |
|---|---|---|---|---|
| **Tier 0** | Local Vectorized Math (`NumPy`, `DuckDB`, `Sinkhorn-Knopp`, `FWL`) | Local Host (`AMD Ryzen 5 7535HS` + `Radeon 660M DirectML`) | `$0.00` local execution (`MKL_NUM_THREADS_CAP=8`) | `10,000 worlds x 175 snaps` PBP trajectory simulation, Barber conformal intervals, 32-seed Navier-Stokes spectral kernel |
| **Tier 1** | OpenRouter Free Routes & Local `MiMo` | OpenRouter + `localhost:8080` | `$0.00` (`omniroute/auto/coding:free`, `qwen-2.5-coder-32b:free`, `deepseek-r1:free`) | Document chunking, PBP parsing, schema verification, unit test scaffolding |
| **Tier 1B** | **NVIDIA Inception & NVIDIA NIM** | Account `#1086418431979798` (`APPROVED` Nov 5, 2026; `INCEPTION50`; 6/20 DLI codes claimed) | `https://integrate.api.nvidia.com/v1` governed by `NvidiaNimTokenBucketGovernor` (`40 RPM`, `min_interval_ms=1500`) across 45 free NIM endpoints through Nov 5, 2027 | Stage 5 Constitutional Gatekeeper pre-checks, OpenBot autonomous worker passes |
| **Tier 1C** | **Scaleway Generative APIs** | Scaleway Startup Pool (`EUR 100` active credit; `EUR 1,000-36,000` AI Startup application submitted) | `https://api.scaleway.ai/v1` (`llama-3.3-70b-instruct`, `deepseek-r1-distill-llama-70b`, `qwen-2.5-coder-32b-instruct`) | Failover lane for Tier 1B NVIDIA NIM |
| **Tier 1D** | **Alibaba Cloud & DashScope Model Studio** | Primary & Secondary Access Keys configured in `.env.local` (`ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_SECONDARY_KEY_ID`) | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (`qwen-max`, `qwen-2.5-coder-32b-instruct`, `qwq-32b`) | OpenDots (`http://127.0.0.1:5173`) coding synthesis, off-peak time-windowed inference |
| **Tier 1E** | **DeepInfra Coach-Brain LLM** | `DEEPINFRA_API_KEY` (`https://api.deepinfra.com/v1/openai`) | `deepseek-ai/DeepSeek-R1`, `deepseek-ai/DeepSeek-V3`, `meta-llama/Llama-3.3-70B-Instruct` | Multi-agent coaching tendency synthesis and deep situational reasoning |
| **Tier 1F** | **GSE `stealth-skeleton` OpenRouter Provider** | `gse/stealth-skeleton-alpha` (Free) & `gse/skeleton-v1` (`$1.50/M` in, `$6.00/M` out, `$0.30/M` cache read) | `https://www.galaxysportsedge.com/api/openrouter-provider/models` (`schema_version: "2.4"`) + `workers/stealth-skeleton-provider` | Execution-verified multi-turn equation & code traces feeding `CROWD_RLHF_QUEUE` (DPO/GRPO) |
| **Tier 2** | **JEV Validated Choice Engine** | `~typesafe/jev-latest` (`jevkit.client.ask`) | Strict snap-by-snap conditional probability distributions (`probabilities` + `noul`) | Stage 3 Full-Game Snap-by-Snap simulation (`Snap 1 Q1 15:00` through `Q4 0:00`) |
| **Tier 2B** | **RunPod Serverless FlashBoot GPU** | Account `user_3LigrJ4v7NkkBnPiyvzI3sh2ICU` (`RUNPOD_API_KEY` live in `.env.local`; `$1,000` Starter Grant submitted) | `https://api.runpod.ai/v2` (`min_workers=0`, `max_workers=4`, `idle_timeout_sec=5`) with automatic local CPU/NumPy fallback | `t85m_injury_resim` (T-85m inactive Sinkhorn burst) and `halftime_live_slate_burst` |
| **Tier 3B** | **Google Cloud Vertex AI & Gemini Enterprise** | Billing `0189D2-25EC7A-569654` (`$118.33` live) + Google for Startups Case `#00318218` + Google AI Ultra (`20x`) | `gemini-2.5-pro`, `claude-3-7-sonnet@vertex` | Frontier multi-agent arbitration and Stage 5 Conjunction Gate sign-off |

---

## 2. PostHog `$50,000` Startup Grant Zero-Waste Governance (`Project 516325`)

- **Grant Verified:** `$50,000.00` credit live on PostHog Project `516325` (`POSTHOG_PERSONAL_API_KEY` and `NEXT_PUBLIC_POSTHOG_KEY` wired).
- **Zero-Waste Rules Enforced in Code (`apps/web/lib/analytics/posthog-context-layer.ts` & `intelligence/telemetry/posthog_cloud_context_layer.py`):**
  1. **10% Trace Sampling (`tracesSampleRate: 0.1`):** Captures full statistical distribution of user funnels and model latency without burning credits on redundant telemetry spans.
  2. **Internal Health Ping Filter (`drop_static_health_pings: true`):** Drops `/api/health`, `/health`, and automated uptime bot pings before ingestion so `$0.00` of the `$50,000` grant is wasted on non-human probes.
  3. **Batch Event Flushing (`batch_flush_size: 50`):** Aggregates analytics and feature-flag evaluations into compressed batches.
  4. **Data Warehouse & Google Workspace Portal Sync:** Links conversion cohorts directly to verified subscription and pack checkout events (`CheckoutAttempt`).

---

## 3. Impact.com (`#8111208`) & Commercial Affiliate Separation

- **Account ID:** `8111208` (`IMPACT_ACCOUNT_ID` wired in `.env.local`).
- **Structural Separation Rule (`scripts/guardrails/affiliate-structural-separation.mjs`):** Partner offers (`OddsJam` 50% lifetime rev-share `oddsjam.com/?ref=zwniodg`, `Dabble`, `Betr`, `PrizePicks`) never alter or bias Stage 1-5 model probabilities or the `PASS` Conjunction Gate.
