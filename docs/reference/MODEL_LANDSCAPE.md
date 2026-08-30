# Model Landscape — Verified Reference (2026-08-12)

**Purpose**: the "models + pricing + rankings I can reference" you asked for —
curated honestly. Every row is tagged with a **verification status** from this
session. This is a **documentation reference**, not runtime data and not a source
of truth for pricing; always confirm live pricing at the provider.

## Verification legend

- **✅ verified** — confirmed this session on Hugging Face (`hub_repo_search`) or
  the live npm registry.
- **◐ known-real** — established pre-2026-cutoff model/tool; high confidence, not
  re-checked this session.
- **⚠️ unverified** — named in the DeepSeek thread with specific benchmark claims
  that were **not** independently confirmed. Treat benchmarks as marketing until
  you verify the HF repo. Do not quote these numbers as fact.

> Pricing below is **reported by third-party trackers** (benchlm.ai etc. via the
> DeepSeek thread), not confirmed with providers. Columns marked *rep.* = reported.

---

## A. Local-runnable open models (the ones that matter for you)

These run on your own hardware via Ollama/LM Studio — the zero-marginal-cost tier.

| Model | Status | HF repo | License | Size / active | Context | Role |
|---|---|---|---|---|---|---|
| **Muse Glimmer 30B** | ✅ | `meta-models/Muse-Glimmer-30B` (+`-GGUF`) | Apache-2.0 | ~29.6B dense + ~1.8B ViT | 128K | Agentic + coding + multimodal; **primary local** |
| **Qwen3-Coder-30B-A3B-Instruct** | ✅ | `Qwen/Qwen3-Coder-30B-A3B-Instruct` (+GGUF) | Apache-2.0 | 30B / 3B active (MoE) | large | **Best practical local coder** — fast, low VRAM |
| **NVIDIA Nemotron 3.5 Lightning** | ✅ | `nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16` (+GGUF) | ⚠️ `license:other` (NVIDIA Open Model License — **read before commercial use**) | 30B / 3B active (MoE) | — | **Local agentic executor.** Released 2026-08-11/12; GGUF from unsloth/ggml-org/bartowski. Built for high-volume *execution* steps while a bigger model plans. Also on OpenRouter + build.nvidia.com |
| **Qwen3-Coder-Next** | ✅ | `Qwen/Qwen3-Coder-Next` | Apache-2.0 | MoE | large | Newer Qwen coder line |
| **Qwen2.5-Coder-32B / 7B** | ◐ | `Qwen/Qwen2.5-Coder-32B-Instruct` | Apache-2.0 | 32B / 7B dense | 128K | Reliable daily driver; 7B for fast edits |
| **DeepSeek-Coder-V2** | ◐ | `deepseek-ai/DeepSeek-Coder-V2-*` | MIT-style | MoE | long | Strong long-context coder |
| **Codestral** | ◐ | `mistralai/Codestral-*` | Mistral (non-commercial) | 22B dense | 32K | Fast completion; check license for commercial use |
| **GLM-5.2** | ✅ | `zai-org/GLM-5.2` (+GGUF/FP8) | MIT | large MoE | large | Reasoning/coding — **big**; realistically API/OpenRouter unless you have serious VRAM |

**Note on the handbook's Ollama tag:** `muse-glimmer:30b-mlx` is wrong. MLX is
Apple's format; Ollama serves GGUF (~17GB K-quant). Pull the tag listed at
`dev.meta.ai/docs/muse-glimmer` or in the Ollama library.

## B. Frontier hosted models (the hard-tier fallback)

| Model | Status | Input *rep.* | Output *rep.* | Context | Notes |
|---|---|---|---|---|---|
| Claude Fable 5 | ◐ | $10 | $50 | 1M | Anthropic flagship (this model). Subscription via Claude Code. |
| Claude Opus 5 | ◐ | $5 | $25 | 1M | Top general/coding per trackers. |
| Claude Sonnet 5 | ◐ | $3 | $15 | 1M | Cost/quality workhorse. |
| Claude Haiku 4.5 | ◐ | $1 | $5 | — | Cheapest Claude; good for cheap surfaces. |
| GPT-5.6 (Sol/Terra) | ⚠️ | $4–5 | $9.60–30 | — | OpenAI; specific variants unconfirmed. |
| Gemini 3.x Pro | ⚠️ | $2 | $12 | 1M+ | Google; generous free tier reported. |
| Grok 4.x | ⚠️ | $1.25–2 | $2.50–6 | 0.5–2M | xAI; you have SuperGrok. |

Anthropic economics that ARE real and worth using: **cache reads ≈ 10% of input**;
**Batch API ≈ −50%**. See the dev runbook §3.

## C. ⚠️ Unverified exotic models from the thread

Named with precise benchmarks in the DeepSeek thread but **not confirmed** this
session. Some *families* are real (DeepSeek, Kimi, Qwen) and iterate fast, so a
version may well exist — but **verify the HF repo before relying on it**, and never
repeat the benchmark numbers as fact:

`Ornith-1.0-397B` (DeepReinforce), `Inkling` (Thinking Machines), `Kimi K3`
(Moonshot), `DeepSeek V4 Pro`, `Qwen3.8-Max`, `Laguna S 2.1` (Poolside),
`North Mini Code` (Cohere), `Sakana Fugu-Ultra`.

**Verify protocol (30 seconds):**
1. Search Hugging Face for the exact repo id. No repo → treat as fabricated.
2. Check license + params + whether GGUF exists (local-runnable).
3. Only then consider it; never quote its benchmarks without a primary source.

---

## D. Tooling reality (npm/pip) — what's real vs. fake

Verified against the live registries this session.

**Real & useful (dev-workflow only, not product deps):**
- `ruflo` (= ruvnet/`claude-flow`) — agent orchestration CLI.
- `claude-mem` — persistent memory for Claude Code.
- `@blockrun/clawrouter`, `adaptive-memory-multi-model-router` (A3M) — real LLM routers.
- `9router`, `portkey-ai`, `chromadb`, `worldmonitor` — real.
- **Aider** = `pip install aider-chat`; **OpenCode** = `opencode-ai` (npm);
  **LangGraph JS** = `@langchain/langgraph`; **LiteLLM** = `pip install litellm`.

**Fabricated (npm 404 — do NOT install):** `cc-switch`, `pareto-bandit`, `mtrouter`,
`securellm-agentguard`, `reroute-guard`, `lite11m` (typo trap), `teia-cognitive-router`,
`@cyberstrike/sdk`, `8gent-code`, `basilisk-ai`, `neurosploit`, `agent-swarm`,
`deepswarm`, `obsidian-skills`, `memgpt` (npm), `aider-chat` (npm), `opencode` (bare npm),
`goose-ai` (npm), `langgraph` (bare npm).

**Name-collisions (resolve to unrelated packages — do NOT install expecting AI):**
`starmap` (a data-structure lib), `gbrain` (2022 GPU-ML lib), `autogen` (a gyp
build tool — NOT Microsoft AutoGen), and `litellm`/`crewai`/`metagpt` on npm are
unofficial JS ports/stubs, not the real Python tools.

---

## E. Task → model routing (the honest "self-router")

Use this as your mental routing table (and the basis for the `model-advisor` tool
spec in `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`):

| Task shape | Route to | Why |
|---|---|---|
| Boilerplate, renames, tests, docstrings | **Local** Qwen3-Coder-30B / Muse Glimmer | Free, offline, no limits |
| Agent-loop execution steps (high volume) | **Local** Nemotron 3.5 Lightning 30B-A3B | Purpose-built for this; 3B active = cheap/fast |
| Multi-file refactor, mid reasoning | **OpenRouter** (GLM-5.2 / DeepSeek / Qwen) | Cheap, pay-per-token, failover |
| Whole-repo understanding, 1M context | Gemini free tier / big-context model | Free/cheap large context |
| Hardest logic, architecture, novel algos | **Claude Code** (cached, compacted) | Highest ceiling; reserve it |
| Bulk non-interactive (drafts, evals) | Claude **Batch API** | −50% cost |

Sources: Hugging Face (`hub_repo_search`, this session) for ✅ rows; live npm
registry for §D; DeepSeek thread / benchlm.ai (unverified) for *rep.* pricing and
⚠️ rows. Refresh this file manually with dated, sourced updates.
