# Jynx error handling · Cerebras integration (complete)

**Code:** `jynx-errors.ts`, `free-lane.ts`, `provider-dispatch.ts`, `providers/cerebras.ts`  
**Related:** `JYNX_FAILOVER_AND_MODEL_MAPS.md`

---

## 1. Error handling model

Jynx never “retries forever.” It **hops once per lane** on a closed set of error types, then falls through:

```
Cerebras  --CerebrasMessagesError-->  secondary free  --OpenAiCompatError-->  clouds
clouds[i] --*MessagesError|*ConfigError-->  clouds[i+1]  -->  Anthropic cash
anything else --> throw (abort; no silent success)
```

### Hop vs abort

| Error class | Hop? | Next step |
|-------------|------|-----------|
| `CerebrasMessagesError` | yes (free) | secondary free → `callClaude` |
| `OpenAiCompatError` | yes (free) | `callClaude` |
| `BedrockMessagesError` / `BedrockConfigError` | yes (cloud) | next cloud → cash |
| `AzureFoundryMessagesError` / `AzureFoundryConfigError` | yes | next cloud → cash |
| `VertexMessagesError` / `VertexConfigError` | yes | next cloud → cash |
| Generic `Error`, bugs, unexpected | **no** | bubble to caller |
| Anthropic cash failure | n/a | bubble (no further hop) |

Helpers: `isFreeLaneHopError`, `isCloudHopError`, `classifyJynxError` in `jynx-errors.ts`.

### What counts as a hoppable free/cloud failure

**Free (Cerebras / secondary):**
- HTTP non-OK from host  
- Network failure (fetch throw)  
- Invalid JSON body  
- Empty text content  

**Cloud:**
- Config incomplete / bad map / unmapped model id  
- HTTP or provider invoke failure  

**Not hoppable:** programming errors, scanner failures after a successful LLM return (those run after Jynx returns text).

### Caller contract

- `jynxComplete` / `generateContentMessages` / `callClaude` either return `ClaudeMessagesResult` or throw.
- Successful free/cloud paths still run **downstream** claim/brand scanners — provider change does not skip governance.
- Empty cash Anthropic list (`cloudAttemptOrder` empty) is not an error; it goes straight to cash.

---

## 2. Cerebras integration

| Item | Detail |
|------|--------|
| **Role** | Free-lane primary for `content` + `brief` only |
| **API** | `POST https://api.cerebras.ai/v1/chat/completions` (OpenAI-compatible) |
| **Default model** | `gpt-oss-120b` (`DEFAULT_CEREBRAS_MODEL`) |
| **Auth** | `CEREBRAS_API_KEY` Bearer |
| **Enable** | `CONTENT_FREE_LANE_ENABLED=true` + key |
| **Entry** | `generateContentMessages` / `jynxComplete` → `callCerebrasMessages` |
| **Result shape** | Same as Claude: `{ text, modelName, inputTokens, outputTokens, durationMs }` |
| **Data** | Chosen for non-retain/train posture vs some free aggregators |
| **Not used for** | studio, journal, model-court, settlement, trust math |

### Free-lane chain with Cerebras

```
shouldUseFreeLane(surface) 
  → callCerebrasMessages
  → [fail hop] secondary FREE_LANE_SECONDARY_*
  → [fail hop] callClaude (multi-cloud → cash)
```

### Env

```bash
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...
# optional override model on request: cerebrasModel
# optional secondary free after Cerebras:
# FREE_LANE_SECONDARY_BASE_URL=...
# FREE_LANE_SECONDARY_MODEL=...
# FREE_LANE_SECONDARY_API_KEY=...
```

### Verify

```bash
# Policy smoke
# shouldUseFreeLane("content", { CONTENT_FREE_LANE_ENABLED: "true", CEREBRAS_API_KEY: "x" }) === true

# Unit
npx vitest run apps/web/__tests__/claude-api-free-lane.test.ts
npx vitest run apps/web/lib/claude-api/jynx-errors.test.ts
```

Live: ops `creditStack.jynx.freeLaneEnabled` after env + redeploy.

---

## 3. Operator playbook when something fails

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Always cash `modelName` Anthropic | free off or all hops failed | Check free env; cloud maps; failover logs |
| Stops after Cerebras with weird Error | fixed: empty/network now CerebrasMessagesError | Redeploy this PR |
| Unmapped model on Bedrock | missing map key | Add catalog id to `BEDROCK_MODEL_MAP` |
| Cash after all clouds | all clouds hop-failed | Check creds + maps; Anthropic key |
| Free on studio | not allow-listed | Expected; use Claude path |

---

## Do not

- Catch-all `catch (e) { return }` and hide failures  
- Route board/settlement through Cerebras or any LLM  
- Treat free-lane quality as Claude-tier without review  
- Invent model ids when Cerebras returns 404 — fix model name or hop
