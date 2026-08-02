# Vercel AI Gateway + DeepSeek V4 Flash (coding agents only)

## Decision
**Adopt** for coding-agent inference and eval judges.  
**Ignore** full AI SDK rewrite of settlement / Stripe / outbox paths.

## Minimal adoption

```ts
// coding-agent or judge client
import { createOpenAI } from "@ai-sdk/openai";

const gateway = createOpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY, // or DEEPSEEK_API_KEY direct
  baseURL: process.env.AI_GATEWAY_URL ?? "https://ai-gateway.vercel.sh/v1",
});

const model = gateway("deepseek/deepseek-v4-flash"); // or deepseek-v4-flash direct

// Always tag for observability
const result = await generateText({
  model,
  prompt,
  providerOptions: {
    gateway: {
      tags: ["coding-agent", "skill:settlement", "env:prod"],
      user: agentRunId,
    },
  },
});
```

## Routing policy
1. Default: `deepseek-v4-flash` (non-thinking for simple, thinking for multi-step).
2. Escalate only on LLM-as-judge fail or confidence gate.
3. Prompt-cache large skill prefixes first.

## Observability win
AI Gateway dashboard → Requests by model + spend by tag.  
No separate Langfuse required for first 80% of visibility.
