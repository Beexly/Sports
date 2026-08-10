# Prompt caching — stretch Azure CCU / cash Anthropic

**Code:** `apps/web/lib/claude-api/messages.ts` (`buildSystemField`, `parseAnthropicUsage`),  
providers (`azure-foundry`, `bedrock`, `vertex`), `jynx-complete.ts` (default cache ON),  
`model-router.ts` (`maxTokensForSurface`, `SURFACE_MAX_TOKENS`),  
`cost-monitor.ts` (`estimateClaudeCostUsd` + cache args, `cacheHitRate`).

---

## Contract (do not break)

1. **Static system only.** Put the long, immutable GSE system prompt in a content
   block with `cache_control: { type: "ephemeral" }`. Never embed request-id,
   timestamps, or user-specific text inside the cached system string.
2. **Opt-in flag, default ON at jynxComplete.**  
   `cache: { system: true }` → cache block.  
   `cache` omitted on `jynxComplete` → defaults to `{ system: true }`.  
   Direct `callClaudeMessages` without `cache` stays byte-identical (plain string).
3. **All Claude providers honor the same flag** (Anthropic cash, Azure Foundry,
   Bedrock, Vertex). Free-lane (Cerebras / OpenAI-compat) ignores it and reports
   `cacheCreationInputTokens: 0`, `cacheReadInputTokens: 0`.
4. **Measure savings.** Every `ClaudeMessagesResult` includes:
   - `cacheCreationInputTokens` (write / first call)
   - `cacheReadInputTokens` (hit / subsequent calls)
5. **Ceil max_tokens.** `maxTokensForSurface(surface, requested)` clamps to
   `SURFACE_MAX_TOKENS`. Unbounded completions burn CCU for nothing.

---

## Pricing (Anthropic-compatible; Azure CCU wraps the same)

| Token class | Typical rate vs base input |
|-------------|----------------------------|
| Uncached input | 1.0× |
| Cache write (5m TTL) | ~1.25× |
| Cache **read** | **~0.1×** |
| Output | model output rate |

Haiku 4.5 is the cheap catalog tier (`MODEL_CHEAP` / brief + calibration-insight).  
Sonnet remains default for studio / journal / content / model-court.

---

## Call-site checklist

| Path | Caching |
|------|---------|
| `jynxComplete` | default ON + max clamp |
| studio / journal / calibration / model-court / pick-explainer / loss-autopsy | already pass `cache: { system: true }` |
| `ai-control-plane` Anthropic/Bedrock/Vertex dispatch | `cache: { system: true }` |
| Free-lane Cerebras | N/A (zero cost lane) |

System prompt **must stay byte-stable** across those calls or every request pays write price.

---

## Founder env (Azure burn path — only after PAYG / Marketplace eligibility)

```bash
CLAUDE_PROVIDER=auto
JYNX_CLOUD_FAILOVER=true
JYNX_CLOUD_ORDER=azure,bedrock,vertex   # or bedrock,azure,vertex

AZURE_FOUNDRY_RESOURCE=gsn-resource     # existing GSN project
AZURE_FOUNDRY_API_KEY=…                 # never paste in chat
AZURE_FOUNDRY_MODEL_MAP={"claude-haiku-4-5-20251001":"<foundry-haiku-id>","claude-sonnet-4-6":"<foundry-sonnet-id>"}

# Optional catalog overrides
# MODEL_CHEAP=claude-haiku-4-5-20251001
# MODEL_PRIMARY=claude-sonnet-4-6
```

**Production stays on cash Anthropic until these are set.** Free subscription
types cannot purchase Anthropic Marketplace CCU plans — convert to PAYG only
with founder card consent.

---

## How to verify savings

1. Deploy this branch.
2. Fire two identical studio/journal calls within ~5 minutes.
3. First response: `cacheCreationInputTokens > 0`, `cacheReadInputTokens ≈ 0`.
4. Second response: `cacheReadInputTokens > 0`, much lower effective $/call via
   `estimateClaudeCostUsd(input, output, pricing, { cacheCreation…, cacheRead… })`.
5. Ops: log or inspect ledger; hit rate = `cacheHitRate(usage)`.

---

## Do not

- Flip gates or invent public claims to “demo” cheaper tokens.
- Put dynamic text in the cached system prefix.
- Deploy Azure Claude Marketplace on a free subscription without founder YES.
- Remove Odds API wiring or free-spine while optimizing LLM cost.
