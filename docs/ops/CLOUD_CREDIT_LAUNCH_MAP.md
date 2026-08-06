# Cloud credit launch map — AWS · Azure Foundry · Google

**2026-08-06** · One team. One stack. Cash AI → 0.

You already have (or can claim) **AWS**, **Azure/Foundry**, and **Google** capacity.  
Code is aligned to **burn credits first**. Applications and portal model maps remain **founder-only**.

---

## Truth table (code vs env)

| Cloud | What rewards you | Code path | CLAUDE_PROVIDER | Ready when |
|-------|------------------|-----------|-----------------|------------|
| **AWS** | Activate / GenAI credits | `providers/bedrock.ts` via `callClaude` | `bedrock` | IAM + region + `BEDROCK_MODEL_MAP` |
| **Google** | Cloud / Vertex partner credits | `providers/vertex.ts` via `callClaude` | `vertex` | Project + region + SA JSON + `VERTEX_MODEL_MAP` |
| **Azure** | Founders Hub / Azure credits | `providers/azure-foundry.ts` via `callClaude` | `azure` or `azure-foundry` | Resource or base URL + API key + `AZURE_FOUNDRY_MODEL_MAP` |
| **Cerebras** | Free tier | `free-lane.ts` → content generator | *(flag, not CLAUDE_PROVIDER)* | `CONTENT_FREE_LANE_ENABLED` + key |
| **Anthropic cash** | Claude for Startups (if claimed) | `messages.ts` fallback | unset / fallback | Always last resort |

**Only one** `CLAUDE_PROVIDER` at a time. Free-lane stacks **on top** for allow-listed content.

Ops visibility: `/api/ops/public-surface-truth` → `creditStack` (booleans, no secrets).

---

## Recommended launch order (maximize reward, minimize cash)

### Phase 0 — zero cash content (today)
```bash
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...
# keep ANTHROPIC_API_KEY for emergency fallback
```
Smoke: `node scripts/ops/smoke-free-lane.mjs`  
Ledger: `modelName` starts with `gpt-oss` → pool `cerebras_free`.

### Phase 1 — Jynx auto (preferred) or one forced cloud

**Preferred:** configure every cloud you own, then:
```bash
CLAUDE_PROVIDER=auto
# JYNX_CLOUD_ORDER=bedrock,azure,vertex
```
Jynx failovers across configured clouds before cash.

### Phase 1b — force **one** Claude cloud

| If strongest credit is… | Set |
|-------------------------|-----|
| **AWS Activate GenAI** | `CLAUDE_PROVIDER=bedrock` + AWS env + map |
| **Google / Vertex partner** | `CLAUDE_PROVIDER=vertex` + GCP env + map |
| **Azure / Foundry** | `CLAUDE_PROVIDER=azure` + Foundry env + map |

Redeploy → generate one studio/journal/content (non–free-lane) call → ledger `modelName` must be Bedrock id / Vertex `@` id / `azure-foundry/…` — **not** plain `claude-*`.

### Phase 2 — Google dev credits (non-Claude)
- Vertex AI non-Claude models, Cloud Run, BigQuery, etc. if product needs them  
- Do **not** double-bill Claude on Google **and** Azure at once

### Phase 3 — Azure GPU / non-Claude infra
- Founders Hub GPU, storage, queues — separate from Claude Foundry  
- Older docs said “Azure sponsorship excludes Anthropic” — **verify your SKU** before assuming $0 Claude

---

## Env cheat-sheets

### AWS Bedrock
```bash
CLAUDE_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<console-verified-id>","claude-haiku-4-5-20251001":"<id>"}
```
Eligibility: **InvokeModel** only. Not Marketplace Claude-Platform.

### Google Vertex
```bash
CLAUDE_PROVIDER=vertex
GOOGLE_VERTEX_PROJECT=...
GOOGLE_VERTEX_REGION=us-east5
GOOGLE_APPLICATION_CREDENTIALS_JSON={...single-line SA...}
VERTEX_MODEL_MAP={"claude-sonnet-4-6":"claude-…@…"}
```

### Azure AI Foundry (Claude Messages API)
```bash
CLAUDE_PROVIDER=azure
AZURE_FOUNDRY_RESOURCE=<resource-name>   # OR AZURE_FOUNDRY_BASE_URL=https://….services.ai.azure.com/anthropic
AZURE_FOUNDRY_API_KEY=...
AZURE_FOUNDRY_MODEL_MAP={"claude-sonnet-4-6":"<foundry-model-or-deployment>","claude-haiku-4-5-20251001":"<id>"}
```
Endpoint shape: `https://{resource}.services.ai.azure.com/anthropic/v1/messages`  
**Founder check:** does *your* Azure credit line item cover Claude Foundry inference? If no → use Bedrock/Vertex for Claude; burn Azure on GPU/infra.

---

## Calibration / launch readiness

| Signal | Pass |
|--------|------|
| `creditStack.anyCreditLaneReady` | true |
| Free-lane smoke | Cerebras model id |
| Claude call after provider flip | Non-cash model id in ledger |
| Fallback | Anthropic only on provider error (visible in modelName) |
| Product gates | LIVE_BOARD / PUBLIC_PICKS / STATS still dark until proof bar |

---

## Founder portal checklist (15–40 min each)

1. **AWS:** Bedrock → Model access → copy exact model IDs → IAM `bedrock:InvokeModel`  
2. **Azure:** Foundry project → deploy Claude → copy resource name + key + deployment model ids → confirm billing meter  
3. **Google:** enable Vertex + Anthropic Model Garden → SA with `aiplatform.user` → region with Claude → model ids  
4. Paste env on **Vercel Production** → redeploy → one smoke generation  
5. Paste ops `creditStack` JSON into founder notes (no secrets)

---

## Anti-patterns

- Setting all three `CLAUDE_PROVIDER` values (only one allowed)  
- Claiming “on Azure credits” while ledger shows `claude-sonnet-*`  
- Guessing model maps (code **throws**, then falls back to cash)  
- Paying Odds API while free settle is healthy  
- Flipping LIVE_BOARD to “demo” for investors  

**Index:** Action Pack v3 · FUNDING_PARTNERSHIP_ALIGNMENT_MASTER · JYNX_COST_STACK · BEDROCK_CREDIT_INTEGRATION · CREDIT_ENV_ACTIVATION_CHECKLIST
