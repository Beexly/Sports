# Explore: AWS Bedrock credit program integration

**Status:** adapter **implemented and wired** via `callClaude` · **inert until env opt-in**  
**Date:** 2026-08-06

## What already exists (do not rebuild)

| Piece | Path | Notes |
|-------|------|--------|
| Bedrock adapter | `apps/web/lib/claude-api/providers/bedrock.ts` | SigV4 InvokeModel; same `ClaudeMessagesResult` shape |
| Selection | `isBedrockProviderSelected()` | `CLAUDE_PROVIDER=bedrock` **and** full AWS creds |
| Model map | `BEDROCK_MODEL_MAP` JSON | Anthropic id → Bedrock id; **no guessed defaults** |
| Dispatch | `callClaude` in `provider-dispatch.ts` | Bedrock first → on any error → Anthropic direct |
| Vertex twin | `providers/vertex.ts` | Same pattern for Google credits |
| Env template | `.env.example` ~L400 | Documented empty defaults |

Live product call sites that already go through `callClaude` (Bedrock-ready):

- content-generator (via free-lane fallback → `callClaude`)
- journal, studio, pick-explainer, model-court, loss-autopsy, calibration-training

## Credits economics

- Claude on Bedrock is **same family**; list price tracks Anthropic but can be paid with **AWS Activate GenAI credits** (or other AWS credits).
- Eligibility often restricted to **InvokeModel** (not Marketplace “Claude platform” SKUs) — confirm your Activate offer letter.
- Free-lane (Cerebras) and Bedrock are **orthogonal**: free-lane first for allow-listed content; Bedrock for everything on `callClaude` when selected.

## Activation (founder)

1. AWS account + Bedrock model access granted in console (region e.g. `us-east-1`).
2. Copy verified Bedrock model IDs for Sonnet/Haiku/Opus.
3. Vercel Production env:

```bash
CLAUDE_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1
# optional session:
# AWS_SESSION_TOKEN=...
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"anthropic.claude-sonnet-4-6-...","claude-haiku-4-5-20251001":"anthropic.claude-haiku-..."}
```

4. Redeploy. Smoke one studio/journal/content call; usage ledger `modelName` must be the **Bedrock** id, not direct Anthropic.
5. Misconfiguration or API error → automatic Anthropic fallback (must remain visible in logs / modelName).

## Gaps / next improvements (optional)

| Gap | Priority |
|-----|----------|
| No cockpit tile “spend via Bedrock this month” | Nice-to-have |
| Free-lane cost still 0; Bedrock cost still estimated with Anthropic table | Acceptable until meter exists |
| Dual-path: free-lane content + Bedrock other surfaces | **Supported** after content free-lane wire |
| Validate Activate eligibility with AWS console | Founder |

## Do not

- Guess Bedrock model IDs in code
- Set `CLAUDE_PROVIDER=bedrock` without model map (throws loud)
- Claim “on credits” while ledger shows direct Anthropic ids
- Route settlement / trust math through any LLM

## Relation to free-lane

```
content surface + free-lane ON → Cerebras
content surface + free-lane OFF + CLAUDE_PROVIDER=bedrock → Bedrock
any surface + CLAUDE_PROVIDER unset → Anthropic direct
```
