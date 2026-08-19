# Dev-Workflow Leverage Runbook

**Purpose**: End the "I keep hitting Claude limits" problem for a solo developer
on a large repo, using tools that actually exist, at near-$0 marginal cost. This
runs on **your machine**. It changes **nothing** in this repository and adds **no
dependencies** to it. Companion to
`docs/intelligence/NEXT_LEVEL_INTELLIGENCE_MASTER_PLAN.md` (§6).

> This is dev tooling, not a product feature. Keep coding agents and local model
> routers on your machine — never as dependencies of the Next.js app.

---

## The mental model

Route work by difficulty, cheapest capable engine first:

```
mechanical edits / boilerplate / tests  ->  LOCAL model (Ollama)      $0
mid-tier reasoning / multi-file          ->  OpenRouter (pay-per-tok)  cheap
the genuinely hard 5-10%                 ->  Claude Code (cached)      controlled
```

You already own the hard-tier subscription. The win is *stopping* it from being
your default for cheap work.

---

## 1. Local tier (free, offline, no limits)

You have Ollama. Pull a real, verified coding model:

```bash
# Best practical local coder (MoE, 30B total / 3B active — fast on modest HW):
ollama pull qwen3-coder:30b            # confirm exact tag in the Ollama library

# Optional: Meta's multimodal agentic model (Apache-2.0, verified real):
#   HF: meta-models/Muse-Glimmer-30B-GGUF  (~17GB K-quant)
#   Pull the OFFICIAL tag shown at dev.meta.ai/docs/muse-glimmer.
#   NOTE: the handbook's "muse-glimmer:30b-mlx" tag is wrong — MLX is Apple's
#   format; Ollama serves GGUF. Use the tag the docs/Ollama library actually list.
```

Drive it with **Aider** (Git-native, auto-commits every change — great safety net):

```bash
pip install aider-chat                  # the REAL Aider (PyPI), not an npm package
aider --model ollama/qwen3-coder:30b
```

Prefer a bigger harness? **OpenCode** (`npm i -g opencode-ai`) or **Cline**
(VS Code extension) both drive local Ollama models too. You already have
AnythingLLM if you want a GUI chat over the same local model.

Use local for: renames, boilerplate, test scaffolds, docstrings, mechanical
refactors, "explain this file." That's ~80% of daily edits at $0.

## 2. Mid tier — one key, many models (the real "self-router")

Instead of the handbook's fabricated `A3M/ClawRouter/ParetoBandit` stack, use
**OpenRouter**: a single API key that fronts GLM-5.2, DeepSeek, Qwen, Claude,
Gemini, etc., with automatic failover, and an `auto` route that picks a model per
prompt. Point Aider/OpenCode/Cline at it:

```bash
export OPENROUTER_API_KEY=sk-or-...
aider --model openrouter/z-ai/glm-5.2          # verified real: zai-org/GLM-5.2 (MIT)
# or let it choose:
aider --model openrouter/auto
```

This is the honest version of "self-route to the best agent" — real, working, no
invented router required.

## 3. Hard tier — keep Claude Code, cut its burn

When you do reach for Claude Code / Claude API:

- **Prompt caching.** Cache the big *stable* prefix (repo map, `CLAUDE.md`, the
  files you keep re-opening). Cache reads bill at ~10% of input. Keep the cached
  prefix identical across calls or the cache misses.
- **`/compact` + fresh sessions.** Compact long threads; start a new session per
  task so you're not re-billing a bloated history every turn.
- **Subagents / Task fan-out.** Push search/research into a subagent so its tokens
  stay out of your main context window; you keep only the conclusion.
- **Batch API (−50%).** For non-interactive bulk work (content drafts, eval runs),
  use the Batch API instead of interactive calls.
- **Right-size the model.** Use Sonnet/Haiku-class for cheap surfaces, Opus/Fable
  only for the hard reasoning. (Your repo's `model-router.ts` already encodes this
  surface→tier idea — mirror it in your dev habits.)

## 4. Honest warnings

- **Do NOT run the handbook installer.** `brew install --cask cc-switch`,
  `npm install lite11m@1.84.0`, `securellm-agentguard`, `@cyberstrike/sdk`,
  `basilisk-ai`, `teia-cognitive-router` — these are 404s or typosquats. Installing
  typo'd package names is a supply-chain risk, not a convenience.
- **`npm install litellm` gets the wrong thing.** The real LiteLLM is **Python**
  (`pip install litellm`); npm's `litellm` is an unrelated stale JS port. Same for
  `crewai` (npm = unofficial), `autogen` (npm = a build tool, not the framework).
- **Don't proxy your Claude subscription into a fake API.** Tools that re-expose a
  Pro/Max subscription as an OpenAI-style endpoint risk ToS violations and
  fraud-detection charges. Want raw API access? Use a real pay-as-you-go API key.
- **Keep agent working dirs clean.** `.gitignore` stray agent config files so they
  don't leak into commits or trip anti-abuse heuristics.

## 5. What "done" looks like

- Local model is your default editor backend; Claude Code usage falls to the hard
  tasks only.
- One OpenRouter key covers the mid tier with failover.
- Monthly spend is a dial you set, not a wall you hit at hour two.
- Zero changes to the Sports repo; zero fabricated dependencies anywhere.
