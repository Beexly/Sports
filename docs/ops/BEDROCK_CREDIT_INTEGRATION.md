# AWS Bedrock credit program integration (complete)

**Status:** adapter + Jynx multi-cloud failover **implemented** · inert until env opt-in  
**Date:** 2026-08-06 (updated for Jynx `auto` + free-lane wire)

## What already exists (do not rebuild)

| Piece | Path | Notes |
|-------|------|--------|
| Bedrock adapter | `apps/web/lib/claude-api/providers/bedrock.ts` | SigV4 InvokeModel; same `ClaudeMessagesResult` shape |
| Config gate | `isBedrockConfigured(env)` | Keys + region + `BEDROCK_MODEL_MAP` |
| Model map | `BEDROCK_MODEL_MAP` JSON | Anthropic id → Bedrock id; **no guessed defaults** |
| Jynx planner | `jynx.ts` → `cloudAttemptOrder` | `auto` / forced cloud + failover |
| Dispatch | `provider-dispatch.ts` → `callClaude` | Ordered clouds → cash Anthropic last |
| Free-lane | `free-lane.ts` + `jynx-complete.ts` | Content/brief $0 first, then `callClaude` |
| Content generator | `content-generator.ts` | Uses **`jynxComplete`** (free-lane wired) |
| Azure / Vertex twins | `providers/azure-foundry.ts`, `vertex.ts` | Same result shape |
| Env template | `.env.example` | Documented empty defaults |

Live call sites that go through `callClaude` / `jynxComplete` (Bedrock-ready when env set):

- content-generator (`jynxComplete` → free-lane or multi-cloud)
- journal, studio, pick-explainer, model-court, loss-autopsy, calibration-training

## Credits economics

- Claude on Bedrock is the **same family**; list price tracks Anthropic but can be paid with **AWS Activate GenAI credits** (or other AWS credits).
- Eligibility often restricted to **InvokeModel** (not Marketplace “Claude platform” SKUs) — confirm your Activate offer letter.
- Free-lane (Cerebras / secondary free hosts) and Bedrock are **orthogonal**: free-lane first for allow-listed content; Bedrock (and Azure/Vertex) for Claude quality path when configured.

## Recommended activation (Jynx — max credit burn)

Prefer **auto** so AWS/Azure/Google cooperate:

```bash
CLAUDE_PROVIDER=auto
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true

# Bedrock (AWS Activate / credits)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<verified-bedrock-id>","claude-haiku-4-5-20251001":"<verified>","claude-opus-4-8":"<verified>"}

# Optional peers (failover / multi-credit)
# AZURE_FOUNDRY_* + AZURE_FOUNDRY_MODEL_MAP
# VERTEX_* + VERTEX_MODEL_MAP

# Free content $0 first
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...
```

### Single-cloud force (legacy)

```bash
CLAUDE_PROVIDER=bedrock
# same AWS_* + BEDROCK_MODEL_MAP
# Failover to Azure/Vertex still occurs when JYNX_CLOUD_FAILOVER=true (default)
# and those clouds are fully configured.
```

## Verification

1. Redeploy Production after env set.
2. `node scripts/ops/launch-preflight.mjs` → freeLane + jynx auto when env present.
3. Ops truth `creditStack.jynx.attemptOrder` includes `bedrock` when configured.
4. Smoke one studio/journal call; ledger `modelName` must be **Bedrock** (or azure/vertex) id, not bare Anthropic cash id.
5. Unit: `provider-dispatch` multi-cloud failover test (Bedrock 503 → Azure).
6. Free-lane smoke: `shouldUseFreeLane("content", { CONTENT_FREE_LANE_ENABLED, CEREBRAS_API_KEY }) === true`.

## Runtime order (one team)

```
content|brief + free-lane ON
  → Cerebras (then secondary free host)
  → callClaude: cloudAttemptOrder (bedrock→azure→vertex by default)
  → Anthropic cash last

studio|journal|model-court|…
  → callClaude only (no free-lane)
```

## Do not

- Guess Bedrock model IDs in code
- Set `CLAUDE_PROVIDER=bedrock` without model map
- Claim “on credits” while ledger shows direct Anthropic ids only
- Route settlement / trust math through any LLM
- Rebuild adapters — improve env + maps only

## Founder checklist (Bedrock credits)

- [ ] AWS Activate / credit offer confirmed for Bedrock InvokeModel
- [ ] Model access enabled in Bedrock console (region)
- [ ] Verified model IDs pasted into `BEDROCK_MODEL_MAP`
- [ ] `CLAUDE_PROVIDER=auto` (preferred) or `bedrock`
- [ ] Redeploy + one smoke generation
- [ ] Optional: Azure Foundry + Vertex maps for failover
