# Jynx — unified intelligence + credit OS

**Jynx** is GSE’s single AI routing brain. Not a separate binary — it is the  
**coherent stack** that makes free-lane, AWS, Azure, Google, tier routing, and  
cash fallback **feed into each other** instead of competing.

Code: `apps/web/lib/claude-api/jynx.ts` · `jynx-complete.ts` · `free-lane*` · `provider-dispatch.ts` · `model-router.ts`  
**Prompt caching / CCU stretch:** [`PROMPT_CACHING.md`](./PROMPT_CACHING.md)

---

## Decision stack (every call)

```
surface (studio|content|brief|…)
    ↓
model tier (haiku / sonnet / opus)     ← model-router
    ↓
free-lane eligible?                    ← free-lane-policy (content, brief)
    ├─ yes + env on → Cerebras $0      ← free-lane.ts
    │                    ↓ on error
    └─ no ──────────────────────────────┐
                                        ↓
cloud attempt order                    ← jynx.cloudAttemptOrder
    bedrock → azure → vertex (default)
    (CLAUDE_PROVIDER forces primary; failover ON by default)
                                        ↓ on all cloud errors
Anthropic cash last                    ← messages.ts
                                        ↓
ledger modelName → credit pool         ← credit-pool.ts
```

**Nothing pulls opposite:** free-lane never blocks clouds; clouds failover before cash;  
tier routing always applies to Anthropic-model-id before maps.

---

## Lanes (max intelligence, min cash)

| Priority | Lane | When | Intelligence |
|----------|------|------|--------------|
| 1 | **Cerebras free** | content/brief + free-lane env | gpt-oss-120b primary |
| 1b | **Secondary free host** | FREE_LANE_SECONDARY_* | Gemma 4 / Nemotron free OpenAI-compat |
| 2 | **AWS Bedrock** | configured (+ auto or selected) | Full Claude via Activate credits |
| 3 | **Azure Foundry** | configured | Full Claude via Azure bill/credits (verify SKU) |
| 4 | **Google Vertex** | configured | Full Claude via partner credits |
| 5 | **Anthropic cash** | last resort / emergency | Same models, real $ |
| — | **Haiku tier** | brief, calibration-insight | Cheap Claude when on cloud/cash |
| — | **Sonnet tier** | studio, journal, content, court | Default reasoning |
| — | **Prompt cache** | static system + `cache.system` | ~0.1× input on hits |
| — | **Internal LLM** | classify only | Never public claims |
| — | **Claude Max Pro** | human coding agents | Outside runtime |

---

## Founder env (recommended production)

```bash
# Free content
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...

# Use every configured cloud cooperatively
CLAUDE_PROVIDER=auto
# or JYNX_MODE=auto

# Optional preference (default bedrock,azure,vertex)
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true

# Configure ALL clouds you have keys for — Jynx will use them
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_MAP={...}

AZURE_FOUNDRY_RESOURCE=...
AZURE_FOUNDRY_API_KEY=...
AZURE_FOUNDRY_MODEL_MAP={...}

GOOGLE_VERTEX_PROJECT=...
GOOGLE_VERTEX_REGION=...
GOOGLE_APPLICATION_CREDENTIALS_JSON=...
VERTEX_MODEL_MAP={...}

ANTHROPIC_API_KEY=...   # emergency only
```

**Force one cloud:** `CLAUDE_PROVIDER=bedrock` (failover still tries others unless `JYNX_CLOUD_FAILOVER=false`).

---

## Observability

| Surface | Field |
|---------|--------|
| Ops truth | `creditStack.jynx` — mode, configured clouds, attempt order, content plan |
| Usage ledger | `modelName` → pool (aws_activate / azure_foundry / vertex_partner / cerebras_free / anthropic_direct) |
| Planner | `planJynx({ surface: "studio" })` pure |

Pass = free-lane content shows `gpt-oss*`; studio shows cloud id not plain `claude-*` when auto+configured.

---

## Call sites

| Prefer | Avoid for new code |
|--------|---------------------|
| `jynxComplete` / `generateContentMessages` / `callClaude` | raw `callClaudeMessages` (skips credits) |
| content-generator → `jynxComplete` | hard-coded provider SDKs |

---

## Law

- Never claim free/credits while ledger shows cash Anthropic  
- Never free-lane studio/journal/model-court until quality validated  
- Never invent model map ids  
- LIVE_BOARD / public picks stay gated by product law — Jynx is cost routing only  

See also: `PROMPT_CACHING.md` · `JYNX_FAILOVER_AND_MODEL_MAPS.md` · `JYNX_VS_AI_GATEWAYS.md` · `JYNX_MARKET_TIER_MAP.md` · `JYNX_OPEN_WEIGHT_FREE_MAP.md` · `CLOUD_CREDIT_LAUNCH_MAP.md` · `CREDIT_ENV_ACTIVATION_CHECKLIST.md` · `FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md`
