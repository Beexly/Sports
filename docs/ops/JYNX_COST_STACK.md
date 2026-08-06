# Jynx cost stack — correct tools (save money)

**Name:** Founder shorthand **“Jynx”** = the multi-lane AI/cost routing stack  
already in Beexly/Sports. There is no separate product binary named Jynx.

## Map (what to use when)

| Lane | Module | Cost | Use for |
|------|--------|------|---------|
| **Claude Max Pro / Claude Code** | Human + agent coding | Flat Max subscription | Implementation, PRs, Neon SQL, Vercel env, long refactors |
| **Haiku (router)** | `apps/web/lib/claude-api/model-router.ts` | Low | `brief`, `calibration-insight` (already flipped) |
| **Sonnet (router)** | same | Mid | studio, journal, content, model-court |
| **Cerebras free lane** | `free-lane.ts` | ~$0 | `brief` only when env on |
| **Internal LLM (Groq etc.)** | `internal-llm.ts` | Low/free credits | Internal classify — never public claims |
| **Bedrock / Vertex credits** | `provider-dispatch` + env maps | Credit programs | Only with verified model id maps |
| **Free settlement / scores** | free-settlement-runner | $0 Odds | Production settle when Odds key **absent** |
| **Grok Build sandbox** | demo only | — | Not production |

## Activate free money (founder env — no code)

Vercel → sports-web → Production env → Redeploy:

```bash
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=<from cloud.cerebras.ai>
# optional cheap override
MODEL_CHEAP=claude-haiku-4-5-20251001
# optional internal
INTERNAL_LLM_API_KEY=<groq>
INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1
INTERNAL_LLM_MODEL=llama-3.3-70b-versatile
```

**Do not** set LIVE_BOARD / PUBLIC_PICKS / PERFORMANCE_STATS / STATS_PUBLIC  
until proof bar + settlement + rights clear.

## Coding agents (Claude Max Pro)

| Task | Tool |
|------|------|
| Sports main PRs, tests, trust-gate | **Claude Code Max** (this plan) |
| Live settle with CRON_SECRET | Claude Code with env secret OR founder shell |
| Neon row proof | Claude Code with DATABASE_URL |
| Image / design | Grok Imagine only when product needs art |
| Production deploys | Vercel dashboard / Claude with Vercel auth |

## Smoke after free-lane on

1. Call a **brief** surface path that uses `generateContentMessages`  
2. Cost ledger / logs show **Cerebras** model id — not silent Anthropic  
3. Failure falls back to Anthropic (reliability) but is **visible**

## Law

Never claim “on free credits” while billing Anthropic.  
Never route trust-affecting public copy through free-lane until quality validated.
