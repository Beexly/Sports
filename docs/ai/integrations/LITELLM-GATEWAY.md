# LiteLLM: Production AI Gateway

> Source: `BerriAI/litellm` (Custom BSL, 54k★, YC W23)
> Purpose: Unified proxy for 100+ LLM providers with cost tracking, fallback routing, and MCP gateway

## Why LiteLLM Over OmniRoute

OmniRoute (documented in OMNI-ROUTE-GATEWAY.md) is simpler to start with. LiteLLM is
production-grade:

| Feature | OmniRoute | LiteLLM |
|---|---|---|
| Providers | 268+ | 100+ |
| Cost tracking | Basic | Full spend dashboard per key/team/project |
| Rate limit handling | Yes | Yes + queue |
| Rust core | No | Yes (8ms P95 at 1k RPS) |
| Virtual API keys | No | Yes — per-user/team spend caps |
| MCP gateway | No | Yes — Claude Desktop / Claude Code |
| Docker production | Yes | Yes + Terraform (AWS/GCP) |
| OpenAI compatibility | Yes | Yes (full) |

GSN's AI pick generation will hit real costs at scale. LiteLLM gives you the controls
to manage that before it becomes a problem.

## Architecture for GSN

```
Claude API calls (apps/web, BullMQ workers)
        │
        ▼
  LiteLLM Proxy (localhost:4000)
        │
        ├── Route to claude-sonnet-4 (primary)
        ├── Fallback to claude-haiku-4-5 (on rate limit)
        ├── A/B test 20% traffic to gpt-4o (pick quality experiment)
        ├── Log cost per userId (Prisma User.id → virtual key)
        └── MCP tools (TheOddsAPI, ESPN) exposed to all models
```

## Installation

```bash
# Local dev (Python proxy)
pip install 'litellm[proxy]'
litellm --model anthropic/claude-sonnet-4-20250514 --port 4000

# Docker (recommended — same image for dev + prod)
docker pull ghcr.io/berriai/litellm:main-latest
docker run -p 4000:4000 \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -v $(pwd)/litellm-config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

## GSN Config File (`litellm-config.yaml`)

```yaml
model_list:
  - model_name: gse-primary
    litellm_params:
      model: anthropic/claude-sonnet-4-20250514
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gse-fast
    litellm_params:
      model: anthropic/claude-haiku-4-5-20251001
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: gse-experiment
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY

router_settings:
  routing_strategy: least-busy
  fallbacks:
    - { gse-primary: [gse-fast] }
  num_retries: 3

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL  # Postgres for spend tracking

litellm_settings:
  success_callback: ["langfuse"]  # optional observability
  cache: true
  cache_params:
    type: redis
    host: os.environ/REDIS_HOST
    port: 6379
```

## Next.js Integration

Change one line in your AI client — point at LiteLLM instead of Anthropic directly:

```typescript
// apps/web/lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";

export const claude = new Anthropic({
  baseURL: process.env["LITELLM_URL"] ?? "https://api.anthropic.com",
  apiKey: process.env["LITELLM_MASTER_KEY"] ?? process.env["ANTHROPIC_API_KEY"],
});

// Usage unchanged — LiteLLM is transparent to the SDK:
const response = await claude.messages.create({
  model: "gse-primary",  // maps to claude-sonnet-4 in litellm-config.yaml
  messages: [{ role: "user", content: prompt }],
});
```

Add to `.env.local`:
```bash
LITELLM_URL=http://localhost:4000
LITELLM_MASTER_KEY=sk-litellm-local-dev  # change for prod
```

## Virtual Keys for Per-User Cost Caps

Create a key per GSN subscription tier via the LiteLLM API:

```bash
# Free tier: $0.10/day cap
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -d '{"max_budget": 0.10, "budget_duration": "1d", "metadata": {"tier": "free"}}'

# Pro tier: $2/day cap
curl -X POST http://localhost:4000/key/generate \
  -d '{"max_budget": 2.00, "budget_duration": "1d", "metadata": {"tier": "pro"}}'
```

Then store the returned key per user in `User.litellmKey` (add to Prisma schema).
When generating a pick for a user, use their key — LiteLLM enforces the cap and
returns a 429 when exceeded, so GSN never overspends on a single user's AI calls.

## MCP Gateway for Tool Aggregation

LiteLLM can expose MCP tools to any model through a unified endpoint:

```yaml
# In litellm-config.yaml:
mcp_servers:
  - name: odds-api
    url: http://localhost:3001/mcp  # your TheOddsAPI MCP server
  - name: espn
    url: http://localhost:3002/mcp
```

Claude Desktop / Claude Code config:
```json
{
  "mcpServers": {
    "litellm-gateway": {
      "url": "http://localhost:4000/mcp/",
      "headers": { "x-litellm-api-key": "Bearer sk-litellm-local-dev" }
    }
  }
}
```

Now Claude Code can call the odds API and ESPN tools through LiteLLM's MCP endpoint,
and any other model (GPT-4o, Gemini) can use the same tools without re-wiring.

## Pick Quality A/B Testing

BullMQ job that routes a fraction of predictions to an experimental model:

```typescript
// packages/ingestion-pipeline/src/predict-picks.ts
const model = Math.random() < 0.2 ? "gse-experiment" : "gse-primary";

const response = await claude.messages.create({
  model,
  messages: [{ role: "user", content: pickPrompt }],
  metadata: { userId, gameId, experiment: model === "gse-experiment" },
});

// Log to Prisma for outcome tracking
await db.pickExperiment.create({
  data: { userId, gameId, model, prompt: pickPrompt, response: response.content[0].text },
});
```

After 500 games, query which model hit more:
```sql
SELECT model, AVG(outcome = 'WIN') as win_rate, COUNT(*) as n
FROM pick_experiments
JOIN picks ON picks.game_id = pick_experiments.game_id
WHERE picks.result != 'VOID'
GROUP BY model;
```

## Status

- [ ] Deploy LiteLLM Docker container (local dev: `docker compose up litellm`)
- [ ] Add `litellm-config.yaml` to repo root (gitignore the API keys section)
- [ ] Update `ANTHROPIC_API_KEY` usage in `lib/ai/client.ts` to use `LITELLM_URL`
- [ ] Create virtual keys per GSN tier and store in `User` table
- [ ] Add `gse-experiment` model for A/B pick quality testing
- [ ] Wire MCP gateway to aggregate TheOddsAPI + ESPN tools
- [ ] Configure spend tracking dashboard (LiteLLM UI at localhost:4001)
