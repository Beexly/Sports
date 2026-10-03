# Jynx × market-cap trending models (Jul 27–Aug 2 window)

Source class: public market rankers (e.g. LM Market Cap style “hot / gainers”).  
**Not** auto-routing. **Not** a reason to pay cash Anthropic.

## How GSE uses market heat

| Market signal | GSE reaction |
|---------------|--------------|
| Claude Opus 5 / 4.8 / 4.7 “hot” | Quality ceiling for **model-court** / deep work — only after `MODEL_OPUS` + Bedrock/Azure/Vertex **map** |
| Claude Fable 5 (batch) | Anthropic product name ≠ GSE `/fable` surface. Treat as **coding/batch** frontier; human Max Pro / batch jobs, not free-lane |
| GPT-5.5 / 5.4 Pro batch | OpenAI cash unless free/credit host — **not** free-lane for public claims |
| Gemini 3.1 Pro Preview | Google path — Vertex credits for Gemini if product needs; Claude still via Vertex Anthropic |
| GPT-3.5 / Nova / old Qwen “losers” | **Do not** add to free-lane for quality theater |
| 39 free models | Free-lane + open-weight map (`JYNX_OPEN_WEIGHT_FREE_MAP.md`) |

## Tier ↔ surface (stable)

| Tier | Default id (code) | Surfaces (active) | Market upgrade path |
|------|-------------------|-------------------|---------------------|
| **Haiku** | `claude-haiku-4-5-20251001` | brief, calibration-insight | Stay cheap; free hosts for content |
| **Sonnet** | `claude-sonnet-4-6` | studio, journal, content, model-court | `MODEL_PRIMARY` only if mapped on credits |
| **Opus** | `claude-opus-4-8` | recommended: model-court | `MODEL_OPUS` after console ids + cost OK |

## Env promotion (when market + console ready)

```bash
# Only after verified model access on YOUR credit cloud
MODEL_PRIMARY=claude-sonnet-4-6          # or newer sonnet id from console
MODEL_CHEAP=claude-haiku-4-5-20251001
MODEL_OPUS=claude-opus-4-8              # bump when Opus 5 id + map exist

# Cloud maps must include the same anthropic keys
BEDROCK_MODEL_MAP={...}
# or AZURE_FOUNDRY_MODEL_MAP / VERTEX_MODEL_MAP

CLAUDE_PROVIDER=auto
CONTENT_FREE_LANE_ENABLED=true
```

**Law:** unset env = current MODELS defaults (no silent flip to unmapped Opus 5).

## What not to do

- Don’t chase #2 “Claude Fable 5 batch” into production free-lane  
- Don’t swap defaults to GPT/Gemini for trust surfaces (board copy, receipts)  
- Don’t conflate **GSE FABLE evidence lab** (`/fable`) with Anthropic “Fable” model SKU  
- Don’t pay list price while Activate / Foundry / Vertex / free-lane sit idle  

## Related

- `model-router.ts` — tier assignment  
- `JYNX_COST_STACK.md` — full OS  
- `JYNX_OPEN_WEIGHT_FREE_MAP.md` — free/open hosts  
- `CLOUD_CREDIT_LAUNCH_MAP.md` — AWS/Azure/Google  
