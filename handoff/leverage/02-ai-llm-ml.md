# Leverage Audit — Domain 02: AI / LLM / ML

**Auditor domain:** Local/self-host LLM runners, model directories & leaderboards, prompt-eval tooling, embeddings/vector, ML libs, datasets, and prediction-engine algorithms (calibration, probability, ranking, forecasting).

**Mission frame:** Zero-budget solo founder. Claude API is the biggest variable cost and stays on the *user-facing* surface (picks, explanations, calibration insights, model court) because quality must stay high. The leverage here is **moving non-user-facing LLM work off Claude** (internal classification, normalization, dedup, draft-then-edit, eval harnesses, embeddings) and **picking the cheapest capable model per task** using live directories/benchmarks — plus **prediction-engine algorithm references** that improve the actual product, not the bill.

**Corpus scanned:** `NORMALIZED_RESOURCE_LEDGER.csv` (11,126 rows). Domain-relevant after de-noising: **~70** genuine AI/LLM/ML items (the `ai_ml_cost` category holds 374 `approved_direct` rows but ~75% is noise — SVG editors, face-swap, roleplay chatbots, forums, image gen — excluded). Sources used: `approved_direct`, `owner_review`, plus three `approved_internal_reference` runners (Ollama / llama.cpp / LocalAI) pulled as high-value references per protocol. **12 tools verified live via WebFetch**; rest assessed from description.

---

## TOP 10 SHORTLIST (highest leverage first)

1. **Ollama** *(ADOPT NOW)* — Dead-simple local LLM runner, OpenAI-compatible endpoint. Run a small open model (Llama 3.x, Qwen, Gemma) on a workstation/free VPS and route **all internal/non-user-facing LLM calls** (classification, tagging, normalization, dedup, JSON extraction, draft generation) here. Direct, structural cut to Claude spend. *Verified live.*
2. **models.dev** *(ADOPT NOW)* — Open, **machine-readable** model+pricing database with `api.json` / `models.json` / `catalog.json` endpoints. Wire into the existing `model-router` so the cheapest-capable model per task is data-driven, not hardcoded. Auto-updates as prices move. *Verified live.*
3. **promptfoo** *(ADOPT NOW)* — YAML-driven prompt eval + regression + model-comparison + red-team, runs locally/free. **The safety net for downgrading models**: prove a cheaper model matches Claude quality on your pick-explanation/classification prompts *before* you switch. Gate model changes in CI. *Verified live.*
4. **Artificial Analysis** *(ADOPT NOW — reference)* — Independent quality/price/speed leaderboard (Intelligence Index, $/1M blended tokens, tok/s). The decision tool for "which cheaper model is good enough." Pairs with promptfoo: pick candidates here, validate there. *Verified live.*
5. **Groq** *(EVALUATE)* — LPU inference, **free API tier**, OpenAI-compatible, hosts open models (Llama 3.3 70B, GPT-OSS-120B). Fast + free path for internal bulk work without local GPU. Verify free-tier rate limits fit job volume. *Verified live.*
6. **Unsloth** *(EVALUATE / FUTURE)* — Free, low-VRAM LLM finetuning + GGUF export to Ollama/llama.cpp. Once you have settled-pick history, fine-tune a tiny model on *your* house style for explanation drafts → near-zero marginal cost, exports straight into your local runner. *Verified live.*
7. **txtai** *(EVALUATE)* — Apache-2.0 all-in-one embeddings + vector search + RAG, runs fully local/embedded (no extra DB service). Cheapest way to add semantic retrieval (similar past games, calibration context) to ground picks and shrink Claude prompts. *Verified live.*
8. **llama.cpp** *(ADOPT NOW — reference)* — The inference engine under Ollama/LM Studio; bare-metal control, GGUF, OpenAI-compatible server, runs CPU-only. The zero-dependency fallback runner for a cheap VPS with no GPU. *Reference (internal_reference); engine verified via llamafile/LM Studio.*
9. **LM Studio** *(EVALUATE)* — Desktop local-LLM app with OpenAI-compatible server + Python/JS SDK + headless mode. Best **dev-loop** for testing local models before promoting to Ollama in prod. *Verified live.*
10. **LLM Pricing / PricePerToken / LLM Stats** *(ADOPT NOW — reference)* — Cross-provider $/token comparisons + leaderboards. Manual companion to models.dev for sanity-checking router economics and spotting a cheaper provider for a given quality bar. *Assessed from description (models.dev covers the automatable path).*

---

## RANKED TABLE

### Tier A — Local runners & cheap inference (cut Claude spend directly)

| Resource | What it is | Alignment | Project + future mapping | Verification |
|---|---|---|---|---|
| **Ollama** | Local LLM runner, OpenAI-compatible API | **ADOPT NOW** | Route internal classification/normalization/dedup/JSON-extraction/draft work off Claude; keep Claude for user-facing only | Verified live |
| **llama.cpp** | Core C++ inference engine (GGUF, CPU-ok, OAI server) | **ADOPT NOW (ref)** | Zero-dep runner for a free/cheap CPU VPS; backs Ollama/LM Studio | Engine verified (llamafile/LM Studio) |
| **llamafile** | LLM as a single portable executable + OAI server | **EVALUATE** | One-file deploy of a local model on a VPS with no install footprint | Verified live |
| **LM Studio** | Desktop local-LLM app, OAI server, Py/JS SDK | **EVALUATE** | Dev/test loop for local models; headless `llmster` for server use | Verified live |
| **Groq** | LPU inference API, free tier, OAI-compatible, open models | **EVALUATE** | Free fast inference for bulk internal jobs w/o local GPU; check rate limits | Verified live |
| **Together.ai** | Serverless inference for open models | **EVALUATE** | Pay-as-you-go cheap open-model API; fallback when local can't keep up | Verified live (model list/credits unconfirmed) |
| **Pollinations** | Generative API (text/image), key required | **FUTURE** | Possible cheap text gen, but needs signup + has rate limits; lower priority | Verified live |
| **GPT4All / Jan / LocalAI** | Local model frontends/servers | **EVALUATE** | Alternatives to Ollama; LocalAI is OAI-compatible self-host | LocalAI ref; others assessed |
| **KoboldCpp / oobabooga / Aphrodite Engine** | Self-host model servers (gate: license review) | **FUTURE** | Higher-throughput serving if local volume grows; vet licenses | Assessed (owner_review gate) |
| **Can I Run AI Locally / What Models? / LLM VRAM Calc** | "Which model fits my hardware" tools | **ADOPT NOW (util)** | Sizing tool before committing to a local model on limited hardware | Assessed from description |

### Tier B — Model selection: directories, leaderboards, pricing (pick cheapest-capable)

| Resource | What it is | Alignment | Project + future mapping | Verification |
|---|---|---|---|---|
| **models.dev** | Open model+pricing DB w/ JSON API | **ADOPT NOW** | Feed `model-router`/`budget policy` so cheapest-capable model is data-driven | Verified live |
| **Artificial Analysis** | Quality/price/speed leaderboard | **ADOPT NOW (ref)** | Choose downgrade candidates by Intelligence Index vs $/token | Verified live |
| **LLM Pricing / PricePerToken** | Cross-provider $/token tables | **ADOPT NOW (ref)** | Manual cross-check of router economics | Assessed from description |
| **LLM Stats / LLM Explorer / Wiki LLM List / LifeArchitect / LLM Resources Hub** | Model indexes/databases | **EVALUATE (ref)** | Discover new cheap open models as they ship | Assessed from description |
| **OpenLM Arena / SEAL / Context Arena / LM Council / Epoch AI / Kaggle Benchmarks / RankedAGI** | LLM leaderboards/benchmark aggregators | **EVALUATE (ref)** | Cross-validate that a cheaper model holds quality on relevant axes | Assessed from description |
| **Simple Bench / EQ-Bench** | Reasoning / tone benchmarks | **FUTURE (ref)** | Tone (EQ) matters for reader-facing copy quality if you swap models | Assessed from description |

### Tier C — Prompt eval, embeddings/vector, finetuning, RAG plumbing

| Resource | What it is | Alignment | Project + future mapping | Verification |
|---|---|---|---|---|
| **promptfoo** | Prompt eval / regression / model-compare / red-team (local) | **ADOPT NOW** | CI gate before any model downgrade; regression-test pick-explanation prompts | Verified live |
| **txtai** | Local embeddings + vector search + RAG (Apache-2.0) | **EVALUATE** | Semantic retrieval of similar games/calibration context; shrink Claude prompts via grounding | Verified live |
| **Qdrant** | Open-source vector DB, self-hostable | **EVALUATE** | If embeddings volume outgrows txtai/pgvector; hybrid dense+sparse search | Verified live |
| **Unsloth** | Free low-VRAM finetuning, GGUF export | **EVALUATE / FUTURE** | Fine-tune a tiny model on house style/settled-pick history → near-zero marginal drafting cost | Verified live |
| **Code2prompt / Gobble Bot** | Codebase/docs → LLM-ready text bundles | **EVALUATE (util)** | Cheaper context packing; fewer wasted tokens feeding context to models | Assessed from description |
| **LLM-API-Key-Proxy** | Self-host LLM key proxy/router | **EVALUATE** | Central proxy to swap providers + log/cap spend (complements existing cost layer) | Assessed (owner_review gate) |
| **Privatiser** | Anonymize sensitive data before LLM calls | **FUTURE** | If user data ever enters prompts; privacy-review gated | Assessed (owner_review gate) |
| **LLM (CLI) / tgpt / Open Interpreter** | CLI LLM clients / local code interpreter | **FUTURE (util)** | Scripting/ops convenience, not core cost lever | Assessed from description |
| **SillyTavern / LibreChat / Open WebUI / AnythingLLM** | Local chat frontends | **SKIP (for this mission)** | UI shells; no direct cost or prediction leverage for a headless backend | Assessed from description |

### Tier D — Learning / algorithm references for the PREDICTION ENGINE (improve the product)

| Resource | What it is | Alignment | Project + future mapping | Verification |
|---|---|---|---|---|
| **Awesome ML / Awesome LLM Resources / ML Resources / Awesome Generative AI Guide** | Curated ML/LLM resource lists | **EVALUATE (ref)** | Source for calibration/probability/ranking/forecasting algorithm references | Assessed from description |
| **aman.ai (Stanford notes) / DeepLearning.ai / LLM Course / AI-For-Beginners / Everything AI** | ML/DL learning materials | **FUTURE (ref)** | Self-teach calibration (Platt/isotonic/Brier), Elo/Glicko, Poisson goal models, ranking | Assessed from description |
| **LLM Papers** | ML datasets/papers index | **FUTURE (ref)** | Forecasting/calibration paper references for confidence-score calibration | Assessed from description |
| **Prompt Engineering Guide / LearnPrompting / Google Whitepaper / Claude Prompts** | Prompting guides | **EVALUATE (ref)** | Tighten prompts → fewer tokens, better caching, cheaper Claude calls | Assessed from description |
| **LLM Visualization** | Interactive transformer explainer | **SKIP (ref)** | Educational only | Assessed from description |

### Tier E — Out of scope / SKIP (appeared in `ai_ml_cost` but not relevant to this mission)

- Image/video gen (Flux, Wan, Veo, GeminiGen, HuggingFace 3D, Meshy, TRELLIS), face-swap (Roop/Rope/SimSwap), upscalers (OpenModelDB), SVG/vector editors (dozens), roleplay/story chatbots (AI Dungeon, 4thWall, Chub), coding-agent IDEs (Cursor, Cline, Aider, Windsurf, Continue — dev convenience, not product/cost levers), AI search engines (Perplexity, Exa, Brave), art-protection (Glaze/Nightshade), and forum/social/index sites mis-tagged into the category. **All SKIP** for the Claude-cost / prediction-engine mission.

---

## NOTES & CAVEATS

- **Quality bar protected:** Nothing here proposes moving *user-facing* content off Claude. The pattern is **Claude = final user-facing quality; local/cheap = internal grunt work + drafts Claude then polishes.** promptfoo is the guardrail that proves a downgrade is safe before it ships.
- **Existing infra fit:** models.dev → `model-router` + `budget policy`; promptfoo → CI before model changes; Ollama/Groq → new "internal-tier" route in the cost layer; txtai/Qdrant → optional grounding to shrink prompts (which *also* improves prompt caching hit rates already enabled per-pick).
- **Gated items** (`owner_review`, gate_required=true): Crawl4AI, Aphrodite Engine, KoboldCpp, LLM-API-Key-Proxy, Privatiser, Agent Reach — pass license/terms review before use. Crawl4AI also must clear the Scraping Clearance Engine.
- **Hardware reality:** Local runners assume access to a workstation or a free-tier VPS (Oracle Cloud free tier noted elsewhere in the dump). If no GPU, llama.cpp/llamafile (CPU) + Groq's free API cover the gap.
- **Verified live (12):** Ollama, promptfoo, models.dev, Artificial Analysis, Groq, LM Studio, Unsloth, txtai, Together.ai, Pollinations, Qdrant, llamafile. Others assessed from description.
