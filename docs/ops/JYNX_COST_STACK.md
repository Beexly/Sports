# Jynx cost stack — correct tools (save money)

**Name:** Founder shorthand **“Jynx”** = the multi-lane AI/cost routing stack  
already in Beexly/Sports. There is no separate product binary named Jynx.

## Map (what to use when)

| Lane | Module | Cost | Use for |
|------|--------|------|---------|
| **Claude Max Pro / Claude Code** | Human + agent coding | Flat Max subscription | Implementation, PRs, Neon SQL, Vercel env, long refactors |
| **Haiku (router)** | `apps/web/lib/claude-api/model-router.ts` | Low | `brief`, `calibration-insight` (already flipped) |
| **Sonnet (router)** | same | Mid | studio, journal, content, model-court |
| **Cerebras free lane** | `free-lane.ts` + **content-generator** | ~$0 | `content` (blog) + `brief` allow-list when env on |
| **Bedrock credits** | `providers/bedrock.ts` via `callClaude` | AWS credits | `CLAUDE_PROVIDER=bedrock` + model map |
| **Internal LLM (Groq etc.)** | `internal-llm.ts` | Low/free credits | Internal classify — never public claims |
| **Free settlement / scores** | free-settlement-runner | $0 Odds | Production settle when Odds key **absent** |
| **Grok Build sandbox** | demo only | — | Not production |

## Activate free-lane (content wire live on main after PR)

```bash
# Vercel Production → Redeploy
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=<from cloud.cerebras.ai>
ANTHROPIC_API_KEY=<still required for fallback>
```

Smoke (repo root):

```bash
CONTENT_FREE_LANE_ENABLED=true CEREBRAS_API_KEY=… ANTHROPIC_API_KEY=… \
  node scripts/ops/smoke-free-lane.mjs
```

App path: `generateBlogPost` → `generateContentMessages({ surface: "content" })` → Cerebras  
when env on; else Bedrock/Vertex/Anthropic via `callClaude`.

## Activate Bedrock credits

See `docs/ops/BEDROCK_CREDIT_INTEGRATION.md`.

```bash
CLAUDE_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=…
AWS_SECRET_ACCESS_KEY=…
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<verified-bedrock-id>"}
```

## Law

Never claim “on free credits” while billing Anthropic.  
Never free-lane studio / journal / model-court until quality validated.  
Numeric-guard + blog policy still apply on free-lane output.
