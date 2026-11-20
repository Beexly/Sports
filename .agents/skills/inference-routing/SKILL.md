---
name: inference-routing
description: MODEL_PRIMARY, MODEL_CHEAP, and MODEL_OPUS routing and free-lane cost controls across Claude and OpenRouter surfaces.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Inference routing (GSE)

## In-repo Modules
- `apps/web/lib/claude-api/model-router.ts` — `resolveModelCatalog`, `SURFACE_TIER`
- `apps/web/lib/claude-api/provider-dispatch.ts` — provider dispatch & OpenRouter fallback
- `apps/web/lib/claude-api/free-lane.ts` — free-lane capacity router
- `apps/web/lib/claude-api/cost-monitor.ts` & `usage-store.ts` — spend tracking
- `apps/web/lib/claude-api/messages.ts` — long/static system prompt cache opt-in

## Routing Laws
1. Route high-volume / routine extraction & formatting surfaces to **`MODEL_CHEAP`** (`claude-haiku-4-5-20251001` or free OpenRouter tiers).
2. Route synthesis & reasoning surfaces via **`MODEL_PRIMARY`** (`claude-sonnet-4-6`) and reserve **`MODEL_OPUS`** (`claude-opus-4-8`) for frontier escalation only.
3. Opt long static system prompts into prompt caching (`messages.ts`).
4. Never self-host GPU or DeepSpeed clusters (**hard non-goal**).
5. Keep direct SDK discipline unless an ADR revises `.claude/skills/inference-routing/vercel-ai-sdk-decision.md`.

## Env Overrides & Verification
- `MODEL_PRIMARY` / `CLAUDE_MODEL_PRIMARY`, `MODEL_CHEAP` / `CLAUDE_MODEL_CHEAP`, `MODEL_OPUS` / `CLAUDE_MODEL_OPUS` (unset defaults to `MODELS` catalog in `model-router.ts`).
- Done when `npm run guard:claude-api` and `npm run agent:eval` exit `0`.
