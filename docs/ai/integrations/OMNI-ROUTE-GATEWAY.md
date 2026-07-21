# OmniRoute AI Gateway Integration

> Source: `diegosouzapw/OmniRoute` (MIT, 22k★)
> Purpose: Multi-provider AI gateway with quota-aware fallback for the GSN Claude API layer

## What This Solves

GSN's Claude API layer (`apps/web/lib/intelligence-graph/`, `apps/web/lib/content-generator.ts`) has a single-provider dependency. If the Anthropic API is rate-limited or unavailable, picks generation and content stall silently.

OmniRoute provides:
- Single endpoint (`http://localhost:20128/v1`) that proxies to 268+ providers
- Automatic fallback when quota is exhausted (Claude → DeepSeek → free tier)
- 15–95% token savings via RTK+Caveman compression
- OpenAI-compatible API format (drop-in for Anthropic SDK)

## Architecture for GSN

```
apps/web/lib/intelligence-graph/ 
  → OmniRoute gateway (localhost:20128)
    ↓ Priority chain:
    1. Claude (Anthropic subscription) — primary
    2. Claude via OmniRoute pooled — secondary
    3. DeepSeek API — tertiary  
    4. Free tier providers (Pollinations, Kiro) — emergency fallback
```

## Local Development Setup

```bash
# Install OmniRoute
npx omni-route install
# or via Docker:
docker run -p 20128:20128 diegosouzapw/omni-route:latest

# Configure fallback chain in omni-route.config.json:
{
  "combos": {
    "gsn-default": [
      { "provider": "anthropic", "model": "claude-sonnet-5", "priority": 1 },
      { "provider": "deepseek", "model": "deepseek-chat", "priority": 2 },
      { "provider": "pollinations", "model": "openai", "priority": 3 }
    ]
  }
}
```

## Code Integration

To point the GSN Claude client at OmniRoute instead of Anthropic directly:

```typescript
// apps/web/lib/claude-client.ts
import Anthropic from '@anthropic-ai/sdk'

const isLocalDev = process.env.NODE_ENV === 'development'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // In dev: route through OmniRoute for fallback + token savings
  baseURL: isLocalDev && process.env.OMNI_ROUTE_URL 
    ? process.env.OMNI_ROUTE_URL 
    : undefined,
})
```

```bash
# Add to .env.local for development:
OMNI_ROUTE_URL=http://localhost:20128/v1
```

## Production Consideration

OmniRoute is a local proxy — not suitable as-is for production Vercel deploys (no persistent server). For production:
- Use it as a dev-time token-saver only
- For production resilience, implement retry with exponential backoff in `apps/web/lib/intelligence-graph/`
- Consider Anthropic's built-in retry features in the SDK

## Claude Code Integration

OmniRoute also extends your Claude Code session's token budget:

```bash
# In Claude Code settings, point at OmniRoute for extended free quota:
# Settings → API → Base URL → http://localhost:20128/v1
# API Key → your-anthropic-key (OmniRoute passes it through)
```

This gives access to 1.6B+ free tokens/month across provider pool, useful for long autonomous loops.

## Status

- [ ] Evaluate OmniRoute for local dev token savings
- [ ] Add `OMNI_ROUTE_URL` to `.env.example`
- [ ] Implement retry wrapper in `intelligence-graph/` for production resilience
