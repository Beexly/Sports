---
name: inference-routing
description: MODEL_PRIMARY/MODEL_CHEAP routing and free-lane cost control. Use when changing Claude surfaces or model tiers.
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---


## Use this skill when

- Working on `inference-routing` tasks: MODEL_PRIMARY/MODEL_CHEAP routing and free-lane cost control. Use when changing Claude surfaces or model tiers.

## Do not use

- Do not use when the request is unrelated to `inference-routing` or when a more specific domain skill applies.

## Instructions

Follow the workflow, rules, and verification steps detailed below for `inference-routing`.

# Inference routing (GSE)

## In-repo
- `apps/web/lib/claude-api/model-router.ts` — `resolveModelCatalog`, SURFACE_TIER
- `provider-dispatch.ts` · `free-lane.ts` · cost-monitor / usage-store

## Laws
1. Prefer Flash / haiku (`MODEL_CHEAP`) for high-volume non-critical surfaces.
2. Sonnet-tier via `MODEL_PRIMARY` for quality surfaces.
3. Prompt cache system prompts where long+static (`messages.ts` cache opt-in).
4. Do **not** self-host GPU / DeepSpeed clusters (HARD NON-GOAL).
5. Do not adopt full Vercel AI SDK stack without a written decision (see vercel-ai-sdk-decision.md).

## Env
- `MODEL_PRIMARY` / `CLAUDE_MODEL_PRIMARY`
- `MODEL_CHEAP` / `CLAUDE_MODEL_CHEAP`

Unset = default MODELS catalog in model-router.
