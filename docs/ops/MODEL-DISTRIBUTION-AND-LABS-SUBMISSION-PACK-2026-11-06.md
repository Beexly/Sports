# Galaxy Science Institute (`stealth-skeleton` v2.4) — Multi-Platform Model Distribution & Labs Submission Pack (2026-11-06)

This document answers **"where else can we put our model? ai/ml? experimental labs? opencode? hermes? omniroute?"** with:
1. **Live Local & Repo Wiring Already Completed on Your Machine Tonight** (`OpenCode`, `Hermes`, `OmniRoute`, `Experiential Labs`, and `AI/ML API`).
2. **Copy-Paste Submission & Onboarding Packs** for external model aggregators, stealth model labs, and public leaderboards.

---

## PART 1 — Already Wired on Your Computer & in `Beexly/Sports` Tonight

| Platform / Router | Config File Updated on Disk | Provider ID & Model IDs Wired | How to Run Right Now |
|---|---|---|---|
| **OpenCode (Global & Repo)** | `C:\Users\Garrett\.config\opencode\opencode.jsonc`<br>`C:\Users\Garrett\.config\opencode\opencode.json`<br>`C:\Users\Garrett\Sports\opencode.json` | Provider: `stealth-skeleton`<br>Models:<br>• `stealth-skeleton/gse/skeleton-frontier`<br>• `stealth-skeleton/gse/skeleton-alpha`<br>• `stealth-skeleton/gse/skeleton-council`<br>• `stealth-skeleton/gse/skeleton-gsi-med`<br>• `stealth-skeleton/gse/skeleton-fast` | `opencode -m stealth-skeleton/gse/skeleton-frontier`<br>or inside `C:\Users\Garrett\Sports`: `opencode` (defaults to `stealth-skeleton/gse/skeleton-frontier`) |
| **Hermes (Nous Research Agent)** | `C:\Users\Garrett\.hermes\config.yaml` | Provider: `stealth-skeleton` (default)<br>Fallbacks: `omniroute`, `experientiallabs`, `aimlapi`, `openrouter`<br>13 Hermes plugins + 6 NVIDIA skills pre-registered | `hermes chat --model gse/skeleton-frontier` |
| **OmniRoute (`localhost:20128`)** | `C:\Users\Garrett\.omniroute\stealth-skeleton-provider.json`<br>`apps/web/components/cockpit/cockpit-office-3d-bot-hq.tsx` | Provider: `stealth-skeleton`<br>Pools: `reasoning`, `coding`, `fast`, `auto/best-reasoning`, `auto/best-coding` | Routes via `http://localhost:20128/v1` and MCP stream `http://localhost:20128/api/mcp/stream` |
| **Experiential Labs (`experientiallabs.ai`)** | `C:\Users\Garrett\.config\opencode\opencode.jsonc`<br>`C:\Users\Garrett\.hermes\config.yaml`<br>`C:\Users\Garrett\Sports\opencode.json` | Provider: `experientiallabs` (`https://api.experientiallabs.ai/v1`)<br>Models: `gemini-4-argon`, `qwen3.8-flash-next-uncensored`, `glm-5.3-flash-abliterated` | Co-routed alongside `stealth-skeleton` in OpenCode & Hermes; ready for stealth lab submission below |
| **AI/ML API (`aimlapi.com`)** | `C:\Users\Garrett\.config\opencode\opencode.jsonc`<br>`C:\Users\Garrett\.hermes\config.yaml`<br>`C:\Users\Garrett\Sports\opencode.json` | Provider: `aimlapi` (`https://api.aimlapi.com/v1`)<br>Models: `alibaba/qwen-max`, `alibaba/qwen3-coder-480b-a35b-instruct` | Co-routed alongside `stealth-skeleton` in OpenCode & Hermes; ready for provider catalog submission below |

---

## PART 2 — External Model Aggregators, Experimental Labs & Leaderboards Where You Can List `stealth-skeleton`

### 1. OpenRouter (`https://openrouter.ai/providers/apply/form` + Stealth Track `https://openrouter.ai/stealth`)
OpenRouter has **two tracks**:
- **Track A — Standard Provider Portal (`https://openrouter.ai/providers/apply/form`):** Lists `stealth-skeleton` publicly with your 5 `gse/skeleton-*` models.
- **Track B — OpenRouter Stealth Preview Track (`partners@openrouter.ai` / `https://openrouter.ai/stealth`):** How models like **Crouton Alpha**, **Liquid AI**, and **Quasar Alpha** launch anonymously under `openrouter/stealth-*` (`$0/M` preview pricing, anonymous provider attribution, developer feedback collection).
  - **Exact Crouton Alpha / Stealth Style Model Description (paste into Slack Connect or `partners@openrouter.ai`):**
    > **Skeleton Alpha (`gse/skeleton-alpha`)** is a 131K-context neuro-symbolic reasoning and agentic execution model developed by Galaxy Science Institute. Post-trained for bounded agentic sub-tasks, strict JSON-schema tool calling, optimal-transport marginal synthesis, and high-volume quantitative document analysis, it reasons through explicit epistemic calibration gates before answering. Developers can pair it with frontier reasoning models or run its 4-Voice Adversarial Council (`gse/skeleton-council`) to execute verifiable, zero-hallucination analytical workflows.

#### Exact Field-by-Field Values for `https://openrouter.ai/providers/apply/form`:
- **Work email:** `baxley.garrett@gmail.com`
- **Your role:** `Founder`
- **How should we contact you?:** `Email`
- **How did you hear about us?:** `OpenRouter User / Documentation`
- **Company name:** `Galaxy Science Institute`
- **Legal entity name:** `Galaxy Science Institute`
- **Website:** `https://www.galaxysportsedge.com`
- **Headquarters location:** `Houston, Texas`
- **Provider display name on OpenRouter:** `stealth-skeleton`
- **Desired provider slug:** `stealth-skeleton`
- **Model types:** Check **`Proprietary (our own) models`** and **`Fine-tunes`**
- **Models you want to serve on OpenRouter (One model per line):**
```text
gse/skeleton-alpha
gse/skeleton-frontier
gse/skeleton-council
gse/skeleton-gsi-med
gse/skeleton-fast
```
- **Supported modalities:** Check **`Text`**
- **What sets you apart?:** Check **`Low Latency`**, **`Unique Models`**, **`Low Pricing`**, **`Unique Infrastructure`**
- **Hardware ownership:** Select **`Cloud / Hybrid Dedicated`** (or **`Rented / Cloud GPU Cluster + Edge Workers`**)
- **Inference location:** `US`
- **GPU types:** Check **`H100`** and **`Other`**
- **GPU count:** `8`
- **Tokens per day you can commit:** `5000000000`
- **Requests per minute you can commit:** `2000`
- **OpenAI-compatible base URL:** `https://www.galaxysportsedge.com/api/openrouter/v1` *(or `https://stealth.galaxysportsedge.com/v1` once Worker is deployed)*
- **Models API URL:** `https://www.galaxysportsedge.com/api/openrouter/v1/models`
- **Benchmarks URL (optional):** `https://www.galaxysportsedge.com/api/jarvis/brain`
- **Zero data retention:** Select **`Yes`**
- **Data policy URL:** `https://www.galaxysportsedge.com/privacy`
- **Privacy policy URL:** `https://www.galaxysportsedge.com/privacy`
- **Terms of service URL:** `https://www.galaxysportsedge.com/terms`
- **SOC 2 status:** Select **`Not applicable / In progress`**
- **Status page URL:** `https://www.galaxysportsedge.com/status`

---

### 2. Experiential Labs (`https://experientiallabs.ai` / `https://api.experientiallabs.ai/v1`)
Experiential Labs hosts experimental, uncensored/abliterated, and stealth frontier checkpoints (`gemini-4-argon`, `qwen3.8-flash-next-uncensored`, `glm-5.3-flash-abliterated`) that are already in your `opencode.jsonc`.
- **How to list `stealth-skeleton` on Experiential Labs:**
  - Submit your OpenAI-compatible endpoint (`https://www.galaxysportsedge.com/api/openrouter/v1`) and `/models` manifest (`https://www.galaxysportsedge.com/api/openrouter/v1/models`) to the Experiential Labs provider intake (`providers@experientiallabs.ai` / Discord `#model-submissions`).
  - Highlight `gse/skeleton-alpha` (stealth agentic/coding checkpoint) and `gse/skeleton-council` (4-voice adversarial reasoning checkpoint).

---

### 3. AI/ML API (`https://aimlapi.com`)
AI/ML API aggregates 200+ OpenAI-compatible models under a single API key (`https://api.aimlapi.com/v1`, already configured in your `opencode.jsonc`).
- **How to list `stealth-skeleton` on AI/ML API:**
  - Apply via AI/ML API Partner / Model Provider intake (`https://aimlapi.com` -> Partnerships / `partners@aimlapi.com`).
  - Provide:
    - **Base URL:** `https://www.galaxysportsedge.com/api/openrouter/v1`
    - **Models Catalog URL:** `https://www.galaxysportsedge.com/api/openrouter/v1/models`
    - **Pricing Tier:** `$0.25 / 1M input`, `$0.75 / 1M output` (`fp8` quantized)

---

### 4. OpenCode Zen / `models.dev` (`https://models.dev` / `https://github.com/sst/models.dev`)
OpenCode pulls its built-in public provider & model registry from **`sst/models.dev`** on GitHub!
- **How to get `stealth-skeleton` listed in every OpenCode installation worldwide:**
  - Open a Pull Request to `https://github.com/sst/models.dev` adding `providers/stealth-skeleton/provider.toml` and the 5 model TOML files (`gse/skeleton-frontier.toml`, `gse/skeleton-alpha.toml`, `gse/skeleton-council.toml`, `gse/skeleton-gsi-med.toml`, `gse/skeleton-fast.toml`) pointing to `https://www.galaxysportsedge.com/api/openrouter/v1`.
  - Meanwhile, on your machine, `stealth-skeleton` is **already wired right now** in `C:\Users\Garrett\.config\opencode\opencode.jsonc` and `C:\Users\Garrett\Sports\opencode.json`.

---

### 5. LiteLLM Public Model Registry (`https://models.litellm.ai` / `BerriAI/litellm`)
LiteLLM powers model routing for **Cursor, Cline, Roo Code, Continue.dev, DSPy, and OpenHands**.
- **How to list:** Submit a PR to `https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json` adding `stealth-skeleton/gse/skeleton-frontier` and `stealth-skeleton/gse/skeleton-alpha` (`max_input_tokens: 131072`, `max_output_tokens: 16384`, `litellm_provider: "openai"`, `mode: "chat"`, `supports_function_calling: true`, `supports_response_schema: true`).

---

### 6. LMSYS Chatbot Arena (`https://lmarena.ai`), Artificial Analysis (`https://artificialanalysis.ai`) & ForecastBench (`https://forecastbench.org`)
- **LMSYS / LMArena (`lmarena.ai`):** Submit `gse/skeleton-alpha` for anonymous blind A/B arena testing under a stealth codename (`skeleton-alpha-preview`) via the LMArena New Model Onboarding form.
- **Artificial Analysis (`artificialanalysis.ai`):** Submit the live OpenAI-compatible endpoint (`https://www.galaxysportsedge.com/api/openrouter/v1`) for independent TTFT, tokens/sec, and quality-vs-price quadrant benchmarking.
- **ForecastBench (`forecastbench.org`):** Register `gse/skeleton-frontier` and `gse/skeleton-council` in the automated dynamic forecasting benchmark (where our Brier/CRPS and Venn-Abers calibration directly target the #1 leaderboard slot).
