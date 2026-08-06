# Jynx failover · cloud model maps · configuration (complete)

**Code:** `apps/web/lib/claude-api/jynx.ts`, `provider-dispatch.ts`, `free-lane.ts`, `providers/*`  
**Examples:** `apps/web/lib/claude-api/jynx-examples.ts`  
**Compare:** `docs/ops/JYNX_VS_AI_GATEWAYS.md`

---

## 1. Failover logic (end-to-end)

```
jynxComplete / content path
  │
  ├─ FREE (content|brief + env)
  │    Cerebras → secondary free OpenAI-compat
  │    hop only on CerebrasMessagesError | OpenAiCompatError
  │
  ├─ CLOUD CREDITS (callClaude)
  │    cloudAttemptOrder: e.g. bedrock → azure → vertex
  │    hop only on *MessagesError | *ConfigError
  │
  └─ CASH Anthropic (callClaudeMessages)
```

Studio / journal / model-court skip free-lane → start at clouds.

| Mode | Cloud attempts |
|------|----------------|
| unset / `anthropic` | `[]` → cash only |
| `auto` | all **fully configured** clouds in preference order |
| forced `bedrock`\|`azure`\|`vertex` | that cloud first |
| + `JYNX_CLOUD_FAILOVER=true` (default) | then other configured clouds |
| + failover `false` | forced only (or empty → cash) |

Default preference: **bedrock → azure → vertex** (`JYNX_CLOUD_ORDER` overrides).

---

## 2. Cloud model map configuration

### Two layers

| Layer | What | Env / code |
|-------|------|------------|
| **Catalog** | Anthropic-style ids the app uses | `MODELS` + `MODEL_PRIMARY` / `MODEL_CHEAP` / `MODEL_OPUS` |
| **Cloud map** | Catalog id → host id | `BEDROCK_MODEL_MAP`, `AZURE_FOUNDRY_MODEL_MAP`, `VERTEX_MODEL_MAP` |

App code never hardcodes Bedrock/Azure/Vertex SKUs. Maps are JSON objects:

```json
{
  "claude-sonnet-4-6": "<host-specific-id>",
  "claude-haiku-4-5-20251001": "<host-specific-id>",
  "claude-opus-4-8": "<host-specific-id>"
}
```

### Rules

1. **Keys** = exact catalog ids from `model-router` (or your `MODEL_*` overrides).
2. **Values** = copy-paste from the cloud console only — never invent.
3. Missing key or bad JSON → **ConfigError** → next cloud (if failover) or cash.
4. Every tier you call (at least sonnet + haiku) needs a key on every cloud you want to use.
5. Free-lane models (`gpt-oss-120b`, `FREE_LANE_SECONDARY_MODEL`) are **not** in these maps.

### Founder env block (full)

```bash
CLAUDE_PROVIDER=auto
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true

# Catalog overrides (optional)
# MODEL_PRIMARY=claude-sonnet-4-6
# MODEL_CHEAP=claude-haiku-4-5-20251001
# MODEL_OPUS=claude-opus-4-8

# AWS Bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BEDROCK_REGION=us-east-1
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"…","claude-haiku-4-5-20251001":"…","claude-opus-4-8":"…"}

# Azure Foundry
AZURE_FOUNDRY_RESOURCE=...   # or AZURE_FOUNDRY_BASE_URL
AZURE_FOUNDRY_API_KEY=...
AZURE_FOUNDRY_MODEL_MAP={"claude-sonnet-4-6":"…","claude-haiku-4-5-20251001":"…","claude-opus-4-8":"…"}

# Vertex
VERTEX_PROJECT=...
VERTEX_LOCATION=...
VERTEX_MODEL_MAP={"claude-sonnet-4-6":"…","claude-haiku-4-5-20251001":"…","claude-opus-4-8":"…"}

# Free content first
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...
```

### Verify

- Ops: `creditStack.jynx.attemptOrder` lists configured clouds after `auto` + maps.
- Ledger `modelName` after a call = **mapped host id**, not only bare Anthropic cash id.
- Unit: `jynx.test.ts`, `provider-dispatch.test.ts`, `jynx-examples.test.ts`.

---

## 3. `cloudAttemptOrder` (see code examples)

```ts
import { cloudAttemptOrder } from "@/lib/claude-api/jynx";

// Auto: all configured, preference order
cloudAttemptOrder({
  CLAUDE_PROVIDER: "auto",
  AWS_ACCESS_KEY_ID: "…", AWS_SECRET_ACCESS_KEY: "…", AWS_BEDROCK_REGION: "us-east-1",
  BEDROCK_MODEL_MAP: '{"claude-sonnet-4-6":"anthropic.…"}',
  AZURE_FOUNDRY_RESOURCE: "gse", AZURE_FOUNDRY_API_KEY: "…",
  AZURE_FOUNDRY_MODEL_MAP: '{"claude-sonnet-4-6":"claude-sonnet-4-6"}',
});
// → ["bedrock", "azure"]

// Forced Azure, failover on → azure first, then others
cloudAttemptOrder({ CLAUDE_PROVIDER: "azure", JYNX_CLOUD_FAILOVER: "true", /* both configured */ });
// → ["azure", "bedrock", …]

// Inert cash path (keys present but no auto/force)
cloudAttemptOrder({ /* bedrock env only, no CLAUDE_PROVIDER=auto */ });
// → []
```

Executable examples: `apps/web/lib/claude-api/jynx-examples.ts`.

---

## 4. Related

- `JYNX_COST_STACK.md` · `JYNX_VS_AI_GATEWAYS.md` · `BEDROCK_CREDIT_INTEGRATION.md`  
- `CLOUD_CREDIT_LAUNCH_MAP.md` · `JYNX_OPEN_WEIGHT_FREE_MAP.md` · `JYNX_MARKET_TIER_MAP.md`
