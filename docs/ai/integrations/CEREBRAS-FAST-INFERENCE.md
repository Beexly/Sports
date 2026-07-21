# Cerebras: Free Fast-Lane AI Inference

> Source: `lib/claude-api/providers/cerebras.ts` (already written, zero new code)
> Purpose: Route prescreen and cheap inference tasks to Cerebras's free OpenAI-compatible endpoint — 70x faster than standard inference, no data retention, zero cost

## What This Is

Cerebras is a silicon company (custom AI wafers) that offers free inference on open-source models via an OpenAI-compatible API. Their flagship free offering: `gpt-oss-120b` (120B parameter Llama-class model) at speed that exceeds GPT-4 by 70x on first-token latency.

**Use case for GSN:** Cerebras is not a Claude replacement. It's a prescreen layer — cheap, fast token generation for tasks that don't need the full Claude reasoning stack. Examples:

- Checking if a user query is valid before routing to Claude
- Quick data normalization or formatting tasks
- First-pass filtering (is this even a sports pick? is this news relevant?)
- Summarizing raw API responses before passing to Claude for analysis
- Rate-limited fallback path when primary inference quota is busy

**No data retention.** Cerebras's free tier does not retain prompt data for training.

## What Already Exists

```
lib/claude-api/providers/
  cerebras.ts    ← OpenAI-compat chat completions, callCerebrasMessages()
```

The dispatch in `provider-dispatch.ts` exposes Cerebras via a free-lane pattern: call sites can explicitly route to Cerebras for tasks where Llama-class intelligence is sufficient, preserving Claude budget for tasks that need it.

## Usage

```typescript
import { callCerebrasMessages } from "@/lib/claude-api/providers/cerebras";

const result = await callCerebrasMessages({
  system: "You are a prescreen filter. Reply YES if the query is about NFL picks, NO otherwise.",
  user: userQuery,
  maxTokens: 10,
  surface: "prescreen",
});

if (result.content === "NO") return { filtered: true };
// Only route to Claude when Cerebras says YES
```

`callCerebrasMessages` returns the same `ClaudeMessagesResult` shape as `callClaudeMessages` — compatible drop-in for tasks where model quality is interchangeable.

## Endpoint

```
POST https://api.cerebras.ai/v1/chat/completions
Authorization: Bearer ${CEREBRAS_API_KEY}
Content-Type: application/json
```

Request body is OpenAI chat completions format. `cerebras.ts` handles the translation from GSN's internal request format.

### Environment variable

```bash
CEREBRAS_API_KEY=csk-...   # From cerebras.ai/developers — free tier available
```

Free tier gives generous limits for prescreen-level usage. Paid tiers are available for higher throughput.

## Model

Default: `gpt-oss-120b`

This is Cerebras's hosted Llama-3.1-class 120B model. At 120B parameters it's larger than Claude Haiku and comparable to Llama 3.1 70B in instruction-following quality — more than sufficient for prescreen, normalization, and routing tasks.

Cerebras may update the default model; `CEREBRAS_MODEL` env var overrides if needed.

## Speed Characteristics

Cerebras's hardware (CS-3 wafer-scale engine) runs inference at 2,000+ tokens/second vs. 25–50 tokens/second for GPU-based inference. Practical implications:

- First-token latency: ~100ms vs. 500–1500ms for Claude API
- 10-token response (YES/NO prescreen): completes in <200ms end-to-end
- 1,000-token response: completes in <1 second

For prescreen use (sub-20 token responses), Cerebras responses arrive before a Claude request would even start generating.

## Free-Lane Dispatcher Pattern

The recommended pattern: use Cerebras as a fast prescreen, then forward to Claude only when needed.

```typescript
import { callCerebrasMessages } from "@/lib/claude-api/providers/cerebras";
import { callClaude } from "@/lib/claude-api/provider-dispatch";

async function handlePickRequest(userInput: string) {
  // Fast, free prescreen
  const prescreen = await callCerebrasMessages({
    system: "Does this request ask for a sports pick or betting advice? Answer YES or NO only.",
    user: userInput,
    maxTokens: 5,
    surface: "prescreen",
  });

  if (!prescreen.content.trim().startsWith("YES")) {
    return { rejected: true, reason: "Not a pick request" };
  }

  // Full Claude reasoning only for confirmed pick requests
  return callClaude({
    system: PICK_SYSTEM_PROMPT,
    user: userInput,
    maxTokens: 2000,
    surface: "studio",
  });
}
```

## What Cerebras Is NOT For

- **Not a Claude replacement for picks.** Pick generation requires Claude's reasoning depth, calibration, and the claim scanner downstream — Cerebras outputs are not claim-scanned.
- **Not for sensitive data.** Cerebras is a third-party endpoint. Don't send PII, user account data, or proprietary signal data to Cerebras.
- **Not for structured output.** Cerebras's Llama models are less reliable at JSON schema adherence than Claude. Use Claude for any structured output that flows into business logic.

## Cost Comparison

| Task | Claude Haiku | Cerebras free tier |
|---|---|---|
| 10-token prescreen | ~$0.000025 | $0 |
| 100k prescreens/month | ~$2.50 | $0 |
| 1M prescreens/month | ~$25 | $0 |

At GSN's current scale this is not a significant saving. At 1M+ monthly interactions (Series A scale), Cerebras prescreen saves real money and reduces Claude quota pressure.

## Activation

1. Sign up at `cerebras.ai/developers` (free)
2. Generate an API key
3. Set `CEREBRAS_API_KEY` in Vercel/production
4. Import `callCerebrasMessages` and wire prescreen calls

No other changes required. `cerebras.ts` is fully implemented.

## Status

- [x] `callCerebrasMessages(request)` → `ClaudeMessagesResult`
- [x] OpenAI-compatible translation layer
- [x] `gpt-oss-120b` default model
- [x] No data retention confirmed
- [ ] Set `CEREBRAS_API_KEY` in Vercel environment
- [ ] Wire prescreen pattern into pick request handler
- [ ] Add Cerebras prescreen to content moderation path
- [ ] Track Cerebras vs. Claude cost split in usage ledger
