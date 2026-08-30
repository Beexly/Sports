# Next-Level Intelligence — Master Plan

**Status**: Planning & control artifact (non-implementing). Companion to
`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`.
**Author**: Fable 5 (ultracode session), 2026-08-12
**Trigger**: Owner asked to review a DeepSeek research thread + an AI-generated
"Sports Intelligence OS — Ultimate Handbook" and turn it into a real, buildable
master plan that pushes the platform to "the next level of intelligence."

> **Implementation note (doctrine).** Like every file under `docs/intelligence/`,
> this document does not implement code, change routes, change schema, add
> dependencies, weaken gates, or expose internal systems. Each build step below
> that touches product surfaces routes through a pre-implementation change
> proposal (`docs/adr/`) and owner approval, per the Baseline Lock in the
> canonical master plan. Nothing here is authorization to `npm install`,
> activate the dormant provider registry, or mutate the sealed control plane.

---

## 0. TL;DR — the one decision that matters

The handbook you were handed is a **real-models / fake-plumbing** document. Its
model list is substantially real (Muse Glimmer, GLM-5.2, Qwen3-Coder all verified
live on Hugging Face). Its **install script, package list, and orchestrator code
are largely fabricated or name-collisions** — running it would fail on the first
lines and, worse, `npm install` a set of unvetted/typosquat packages into a
governed production repo that explicitly forbids unapproved dependencies.

**Do not run the handbook's installer. Do not add its packages to this repo.**

You do not need most of it, because **you already built the governed version of
what it describes**: a multi-lane model router (Jynx), a provider registry, an AI
Control Plane with budget + audit + claim governance, a free-first data layer, and
an autonomy kernel — all typed, tested, and guard-sealed. The next level of
intelligence is **extending those real systems**, plus fixing the thing that
actually hurts you day-to-day: **your own coding-agent token burn**, which is a
*dev-workflow* problem living **outside** this repo, not a product feature.

This plan separates those two concerns and gives each a grounded, buildable path.

---

## 1. What you were actually shooting for (from the DeepSeek thread)

Read back, the thread's real intent was four things:

1. **Stop hitting Claude limits while coding** on a large, complex repo — you're
   cost-sensitive and doing heavy work.
2. **Max intelligence for near-$0** — use the best models available, routing cheap/
   local work away from expensive frontier calls.
3. **A model/agent that self-routes** — picks the right engine per task based on
   scope, reasoning load, and whether it's coding vs. reasoning vs. tools.
4. **A single reference** of models + pricing + rankings you can consult.

Item 1–3 are a **developer-workflow** ask (how *you* code). The handbook wrongly
fused it with your **product's** intelligence layer (how the *app* reasons about
picks). Keeping them fused is the core mistake — untangling them is the plan.

---

## 2. Reality check — what in the handbook is real vs. fabricated

Verified this session against the live npm registry and Hugging Face.

### 2a. Models — mostly REAL (verified on Hugging Face)

| Model | Verdict | Notes |
|---|---|---|
| **Muse Glimmer 30B** (`meta-models/Muse-Glimmer-30B`) | ✅ real | Meta, Apache-2.0, ~29.6B dense + ~1.8B ViT vision encoder, 128K ctx, multimodal, agentic/coding. Official **GGUF** exists (`meta-models/Muse-Glimmer-30B-GGUF`, `unsloth/…-GGUF`) → runs on Ollama/LM Studio. Released **2026-08-10** (after most models' training cutoffs — that's why it "looked fake"). |
| **GLM-5.2** (`zai-org/GLM-5.2`) | ✅ real | Z.ai/Zhipu, **MIT**, MoE, 2.5M downloads, GGUF + FP8 published. Large — realistically an **API/OpenRouter** model unless you have serious VRAM. |
| **Qwen3-Coder-30B-A3B-Instruct** (`Qwen/…`) | ✅ real | Alibaba, Apache-2.0, 30B/3B-active MoE, GGUF published. **Best practical local coding model** for a single machine. |
| Qwen2.5-Coder-32B / 7B, DeepSeek-Coder-V2, Codestral | ✅ real | Known-good local staples; safe defaults. |
| Ornith-1.0-397B, Inkling, Kimi K3, DeepSeek V4 Pro, Qwen3.8-Max, GPT-5.6 Sol/Terra, Laguna, North Mini Code, Sakana Fugu-Ultra | ⚠️ **unverified** | Some families are real (DeepSeek, Kimi, Qwen) but these **exact versions were not confirmed** this session. **Verify on Hugging Face before relying on any of them.** Do not quote their benchmark numbers as fact. |

The handbook's exact **Ollama tag `muse-glimmer:30b-mlx` is wrong** — MLX is Apple's
format; Ollama serves the GGUF K-quant (~17GB). Pull the tag shown on
`dev.meta.ai/docs/muse-glimmer` / the Ollama library, not the handbook's string.

### 2b. npm packages — mostly FABRICATED or name-collisions

Queried all 33 names in the installer against the live registry:

- **Fabricated (hard 404 — do not exist):** `cc-switch`, `langgraph` (bare),
  `agent-swarm`, `deepswarm`, `pareto-bandit`, `mtrouter`, `securellm-agentguard`,
  `reroute-guard`, **`lite11m`** (typo of litellm — a supply-chain trap),
  `teia-cognitive-router`, `@cyberstrike/sdk`, `8gent-code`, `basilisk-ai`,
  `neurosploit`, `obsidian-skills`, `memgpt`, `aider-chat`, `opencode`, `goose-ai`.
- **Name-collisions (resolve to unrelated packages):** `starmap` (a StrongMap data
  structure), `gbrain` (a 2022 GPU-ML lib), `autogen` (a *gyp generator* — **not**
  Microsoft AutoGen).
- **Real but UNOFFICIAL ports (install-confusion risk):** `litellm` on npm =
  `litellmjs` (a stale hobby JS port, **not** the real Python LiteLLM); `crewai` =
  an unofficial JS reimplementation; `metagpt` = a placeholder stub.
- **Real and on-point:** `ruflo` (= ruvnet/`claude-flow`), `claude-mem`,
  `adaptive-memory-multi-model-router` (A3M), `@blockrun/clawrouter`, `portkey-ai`,
  `9router`, `chromadb`, `worldmonitor`.

Right names for the real tools the fakes were pointing at: LangGraph JS =
`@langchain/langgraph`; LiteLLM = **pip** `litellm`; Aider = **pip** `aider-chat`;
opencode = `opencode-ai`; AutoGen = **pip** `autogen-agentchat`; MemGPT = **Letta**.

### 2c. Orchestrators & red-team — real ideas, mostly fabricated instances

`CyberStrike (13 agents, 7,600 skills)`, `AHA`, `Basilisk`, `T3MP3ST`,
`RerouteGuard`, `CARE`, `AgentGuard`, `TEIA`, `A3M's` exact benchmark claims,
`cc-switch`, `AionUi` — treat as **unverified marketing or fabrication**. The
*capabilities* they name are real and worth having (semantic caching, policy
guardrails, adversarial self-test, audit sealing) — but you get them from **real
tools you already run or that genuinely exist**, listed in §5.

### 2d. The handbook's verification checklist assumes scripts you don't have

It expects `npm run benchmark | rsi-validate | distill | redteam | audit-verify`.
**None exist.** What you actually have (and should use): `eval:prompts`,
`agent:eval`, `free:doctor`, and ~40 `guard:*` scripts. Build the missing loops as
**real** scripts (§7), don't pretend the fictional ones exist.

---

## 3. The category split (the most important architectural decision)

| | **Dev-Workflow Intelligence** | **Product Intelligence** |
|---|---|---|
| Question it answers | "How do *I* code faster/cheaper?" | "How does the *app* reason about picks?" |
| Where it lives | Your machine + dev tooling (**outside** this repo) | Inside `apps/web/lib/**`, `packages/**` (**this repo**) |
| Real components | Ollama, Muse Glimmer / Qwen3-Coder, Aider/OpenCode/Cline, OpenRouter, Claude Code prompt caching + subagents | Jynx router, AI Control Plane, provider registry, prediction/shadow engine, calibration, free-first data |
| Governance | Your call; no repo impact | Sealed, owner-gated, tested, guard-enforced |
| What breaks it | Nothing — it's your toolbox | `npm install`-ing fabricated packages, activating dormant registries, fabricating data |

**The handbook fused these and told you to `npm install` dev-tools into your
product.** Keep them apart: §6 solves the dev-workflow pain; §7 extends the
product intelligence. Never let a coding-agent router become a production
dependency of the Next.js app.

---

## 4. What your repo ALREADY has (map to the handbook's "layers")

You are much further along than the handbook assumes. Real, in-repo, tested:

| Handbook "layer" | You already have | Where | Maturity |
|---|---|---|---|
| Router layer (multi-model) | **Jynx** — governed multi-lane Claude planner (free Cerebras → Bedrock → Anthropic, "drafts only, never auto-publishes"), with error-class hops | `apps/web/lib/claude-api/jynx.ts`, `jynx-complete.ts`, `model-router.ts` (surface→tier: cheap/sonnet/opus) | production |
| Provider registry | Canonical route/economic-class registry with a reserved **`local`** class + **`local-none`** route | `apps/web/lib/ai-control-plane/provider-registry.data.ts` | dormant, owner-gated |
| Budget pacer / cost tracker | AI Control Plane budget + reservations + api-costs cockpit + override | `ai-control-plane/budget.ts`, `claude-api/budget-store.ts`, `app/cockpit/api-costs/**` | production |
| Guardrails / policy | ~40 `guard:*` scripts incl. `ai-control-plane-sealing`, `claude-api`, `ai-council`, transport import-boundary | `scripts/guardrails/**`, `package.json` | production |
| Audit / "self-attack" | Control-plane authority + event-ledger + claim governance, Postgres-backed tests | `apps/web/__tests__/ai-control-plane-*.test.ts` | production |
| Free-first / $0 default | Free-first data architecture; `paidCallJustified()` spend guard; source-router | `apps/web/lib/data-sources/**`, `docs/FREE_FIRST_DATA.md` | production |
| Intelligence engine | Shadow prediction engine, **BAEE** Bayesian ensemble, calibration/forecast-skill fold | `packages/prediction-engine/**`, recent git history | shadow/experimental |
| Self-evolution contracts | Model-promotion-gate, operational-epistemic-twin, event-sourcing, bitemporal | `docs/frontier/**` | documented |
| Autonomy kernel | Operating kernel for autonomous cycles | `apps/web/lib/autonomy/operating-kernel.ts`, `npm run nova:cycle` | production |
| Memory / knowledge | Evidence vault, entity graph, weak-signal engine, research-lab (designed) | `docs/brain/**` | documented |

**Translation:** the handbook told you to buy a house you already live in. The
work is *finishing rooms*, not pouring a new foundation.

---

## 5. The corrected, real stack

Only tools that exist and earn their place. Split by concern.

**Dev-workflow (your machine — not repo deps):**
- **Ollama** (you have it) + **Muse Glimmer 30B GGUF** and/or **Qwen3-Coder-30B-A3B** as the local workhorse.
- **Aider** (`pip install aider-chat`) — Git-native, auto-commits, cheap-token loop — for mechanical edits/refactors.
- **OpenCode** (`opencode-ai`) or **Cline** (VS Code) — multi-provider agent when you want a bigger harness.
- **OpenRouter** — one key, many providers (GLM-5.2, DeepSeek, Qwen, Claude, Gemini) with automatic failover; good for the "self-route" idea without inventing a router.
- **Claude Code itself** — keep for the hardest work; cut its burn with the techniques in §6.

**Product intelligence (in-repo, governed):**
- Your **Jynx** router + **provider registry** — extend, don't replace.
- **OPA/Rego** (real; already conceptually present in doctrine) for policy — if/when a guard needs it, via change proposal.
- **Real eval**: `eval:prompts`, `agent:eval`, plus new harnesses in §7.
- Optional, only if a concrete need appears and passes a change proposal:
  `@langchain/langgraph` (stateful graphs), `chromadb` (vectors) — both real.

**Explicitly rejected:** the handbook's `lite11m`, `pareto-bandit`,
`securellm-agentguard`, `@cyberstrike/sdk`, `basilisk-ai`, `cc-switch`, `ruflo`
*as a product dependency*, `gbrain`, `starmap`, npm `litellm`/`crewai`/`autogen`.

---

## 6. Dev-workflow leverage runbook (fixes "I keep hitting limits")

This is the direct answer to your original problem. It runs on **your machine**;
it changes **nothing** in this repo. A standalone copy lives at
`docs/ops/DEV_LEVERAGE_RUNBOOK.md`.

1. **Local first.** Pull a local coder and make it your default for boilerplate,
   renames, test scaffolds, and mechanical refactors:
   ```bash
   ollama pull qwen3-coder:30b            # verify exact tag in the Ollama library
   # optional multimodal/agentic local model:
   ollama pull <official muse-glimmer gguf tag from dev.meta.ai/docs/muse-glimmer>
   ```
   Point **Aider** at it: `aider --model ollama/qwen3-coder:30b`. Free, offline,
   no rate limits, ~80% of daily edits.
2. **One cloud key, many models.** Use **OpenRouter** as a single endpoint for
   GLM-5.2 / DeepSeek / Qwen / Claude / Gemini with pay-as-you-go + failover. This
   is the honest, working version of the handbook's "self-routing brain" — no
   fabricated router required.
3. **Reserve Claude for the hard 5–10%.** When you do use Claude Code:
   - **Prompt caching** — cache the big stable context (repo map, CLAUDE.md);
     cache hits bill ~10% of input. Keep the cached prefix stable.
   - **`/compact`** aggressively; start fresh sessions for new tasks so you're not
     re-sending a bloated history.
   - **Subagents / Task fan-out** — isolate research/search in a subagent so its
     tokens don't pollute your main context window.
   - **Batch API (−50%)** for non-interactive bulk jobs (content drafts, evals).
   - **Cheaper tier for cheap surfaces** — your own `model-router.ts` already maps
     surfaces to `cheap`/`sonnet`/`opus`; keep low-stakes surfaces on the cheap tier.
4. **Honest warning on "turn your subscription into an API proxy."** Tools that
   re-expose a Claude **Pro/Max subscription** as an OpenAI-style endpoint (the
   "hermes proxy" trick) risk violating Anthropic's ToS and have triggered
   fraud-detection charges. If you want raw API access, use a **real API key**
   (pay-as-you-go) — don't proxy the subscription. Keep agent working dirs clean
   (`.gitignore` stray `*.md` agent configs) regardless.

**Definition of done:** local model handles daily edits; OpenRouter covers
mid-tier; Claude Code usage drops to the genuinely hard tasks; your monthly spend
is a knob you control, not a wall you hit.

---

## 7. Phased build plan (product intelligence, grounded in the repo)

Every phase honors the CLAUDE.md non-negotiables (no fake data, tests required,
types required, server-side paywalls, no unapproved deps/schema) and routes
product changes through a change proposal.

### Phase 0 — This week (zero product risk)
- **Adopt the dev runbook (§6).** Immediate relief on the real pain; no repo change.
- **Model reference cockpit card (read-only).** Add a small, static
  `docs/reference/MODEL_LANDSCAPE.md` (this file's §2 table, dated, sourced) so you
  have the "models + pricing + rankings" reference you asked for — as *documentation*,
  not fabricated runtime data. Refresh it manually with sourced links.
- **DoD:** you're coding cheaper today; a dated, sourced model reference exists.

### Phase 1 — Make the existing router legible and provable (2–3 weeks)
- **Surface Jynx's routing decisions** in the api-costs cockpit: which lane/tier
  each surface used, cache-hit rate, $ per surface. Read from existing budget/event
  ledger — no new infra.
- **Extend `eval:prompts` into a router-quality harness**: a fixed set of Sports OS
  prompts per surface, scored for cost + quality, run on demand. This is the *real*
  version of the handbook's fictional `benchmark`/`rsi-validate`.
- **DoD:** `npm run eval:prompts` reports per-surface cost/quality; cockpit shows
  live routing; tests + typecheck + lint green.

### Phase 2 — Add a governed LOCAL lane to the provider registry (change proposal)
- Write a **pre-implementation change proposal** (`docs/adr/NNN-local-inference-lane.md`)
  to activate the reserved `local` economic class / `local-none` route for a
  **shadow-only** Ollama lane (Muse Glimmer / Qwen3-Coder) behind a flag.
- Use it **only** for internal, non-published surfaces (drafts, evals, dev tooling)
  — never public picks/claims (Jynx's "drafts only" rule holds).
- Keep the transport-boundary guard intact: the local adapter goes in the
  guard-allowlisted adapter set, registry stores identifiers only.
- **DoD:** proposal approved; shadow local lane runs behind a flag; sealing +
  transport guards still pass; $0 marginal cost on routed internal work.

### Phase 3 — Close the calibration/regression loop (the real "self-improvement")
- Turn the shadow prediction engine + BAEE + calibration into a **weekly
  regression** that compares shadow vs. live on *settled* outcomes and auto-writes
  a report (extends the existing weekly shadow-vs-live workflow in git history).
- Gate any model/threshold promotion through the existing
  `docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md` — no silent promotions.
- **DoD:** a scheduled, tested job produces a calibration/regression report;
  promotions require the gate; accuracy/CLV claims stay `check-claims`-clean.

### Phase 4 — The "ambition / evolution" layer, done for real (quarter+)
- Build the handbook's genuinely good idea — an engine that scans, hypothesizes,
  and proposes improvements — **as governed modules on the autonomy kernel**
  (`apps/web/lib/autonomy/operating-kernel.ts`), writing proposals into `docs/adr/`
  and the change-feed, **never** self-mutating product code.
- Sources are cleared, facts-only, attributed (respect the Legal Scraping Posture
  and clearance engine). No arXiv/Reddit auto-ingest without the source-hierarchy
  and evidence-vault gates.
- **DoD:** the engine emits *proposals a human ratifies* (not autonomous merges);
  every proposal is auditable in the event ledger; zero fabricated data enters the
  system.

---

## 8. Guardrails — what this plan will not do

- **No fabricated dependencies.** Nothing from §2b enters `package.json`.
- **No chasing unverified models** as if their benchmarks were fact.
- **No fusing dev-tools into the product.** Coding agents stay on your machine.
- **No unilateral mutation** of the sealed control plane, dormant registry, or
  schema — everything product-side goes through a change proposal + owner approval.
- **No public exposure** of internal Brain/intelligence tools.
- **No weakening** of the free-first spend guard, feature flags, or trust gates.
- **No certainty/tout language** and **no fabricated picks/odds/injuries** — the
  Non-Negotiable Rules in CLAUDE.md and the canonical master plan hold verbatim.

---

## 9. Immediate next actions

1. **You (today):** adopt §6 — local model + Aider + OpenRouter; cut Claude Code to
   the hard tasks. This ends the rate-limit pain immediately.
2. **Repo (this PR):** these two planning docs land for review; no code/deps change.
3. **Next PR (Phase 1):** router legibility in the cockpit + `eval:prompts`
   quality harness — the first real, tested increment.
4. **Then Phase 2** via a change proposal for the governed local lane.

The next level of intelligence isn't a new stack — it's finishing and proving the
governed one you already built, and freeing your own hours by fixing the workflow
the handbook never actually addressed.
