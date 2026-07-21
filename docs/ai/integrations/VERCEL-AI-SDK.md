# Vercel AI SDK: Streaming AI for Next.js App Router

> Source: `vercel/ai` (Apache-2.0, 14k★)
> Purpose: The standard SDK for AI in Next.js — streaming, tool use, React hooks, RSC support

## What This Solves

GSN currently calls `anthropic.messages.create()` directly. This means:
- No streaming — users stare at a loading spinner until the full pick is generated
- No abort — once triggered, pick generation can't be cancelled
- No tool use in Server Components — can't call getOdds() mid-generation
- No structured output with type validation from the AI response
- Manual error handling and retry logic on every call site

The Vercel AI SDK replaces all of this with a typed, streaming-native layer designed
exactly for the Next.js 14 App Router stack GSN already uses.

## How It Differs from Direct Anthropic SDK

| | Direct `@anthropic-ai/sdk` | Vercel AI SDK |
|---|---|---|
| Streaming | Manual iterator | `streamText()` / `useChat()` |
| Structured output | Manual JSON parse | `streamObject()` with Zod schema |
| Tool use | Manual loop | Declarative `tools: {}` config |
| React hooks | None | `useChat`, `useCompletion`, `useObject` |
| RSC streaming | Not built-in | First-class `createStreamableUI()` |
| Abort | Manual AbortController | Built into every call |
| Multi-model | One provider | Swap with `provider:` one-liner |

## Installation

```bash
npm install ai @ai-sdk/anthropic zod
# Already have: @anthropic-ai/sdk — keep it for low-level use
```

## GSN Use Case 1: Stream Pick Generation to the UI

Instead of blocking until a full pick is generated, stream tokens as they arrive.

**`apps/web/app/api/picks/stream/route.ts`**:
```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  const { gameId } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: "You are a professional sports analyst. Analyze the game and give a clear pick with reasoning.",
    prompt: `Analyze game ${gameId} and generate a pick with confidence rating.`,
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
```

**`apps/web/app/picks/[id]/page.tsx`**:
```typescript
"use client";
import { useCompletion } from "ai/react";

export default function PickPage({ params }: { params: { id: string } }) {
  const { completion, isLoading, complete } = useCompletion({
    api: "/api/picks/stream",
  });

  return (
    <div>
      {isLoading ? <StreamingText text={completion} /> : <PickCard pick={completion} />}
      <button onClick={() => complete(JSON.stringify({ gameId: params.id }))}>
        Generate Pick
      </button>
    </div>
  );
}
```

## GSN Use Case 2: Structured Pick Generation with Type Safety

Generate a typed pick object — no JSON parsing, no runtime errors from malformed AI output.

```typescript
import { streamObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

const PickSchema = z.object({
  recommendation: z.enum(["HOME", "AWAY", "OVER", "UNDER"]),
  pickType: z.enum(["SPREAD", "MONEYLINE", "TOTAL"]),
  line: z.number(),
  confidence: z.number().min(50).max(99),
  reasoning: z.string().max(500),
  keyFactors: z.array(z.string()).max(5),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export type AIPick = z.infer<typeof PickSchema>;

export async function generateStructuredPick(gameContext: string): Promise<AIPick> {
  const { object } = await streamObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: PickSchema,
    prompt: `Generate a structured pick for: ${gameContext}`,
  });
  return object;
}
```

## GSN Use Case 3: Picks Advisor Chat Interface

Full conversational interface with `useChat` — users ask follow-up questions about picks.

**`apps/web/app/api/chat/route.ts`**:
```typescript
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a sports betting advisor for GSN. You have access to current odds,
team stats, and injury reports. Give honest, data-backed analysis. Never guarantee outcomes.`,
    messages,
    tools: {
      getGameOdds: {
        description: "Get current odds for a specific game",
        parameters: z.object({ gameId: z.string() }),
        execute: async ({ gameId }) => fetchOddsFromDb(gameId),
      },
      getTeamStats: {
        description: "Get recent team performance stats",
        parameters: z.object({ team: z.string(), last: z.number().default(10) }),
        execute: async ({ team, last }) => fetchTeamStats(team, last),
      },
    },
  });

  return result.toDataStreamResponse();
}
```

**`apps/web/components/PicksAdvisor.tsx`**:
```typescript
"use client";
import { useChat } from "ai/react";

export function PicksAdvisor() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="picks-advisor">
      <MessageList messages={messages} />
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about tonight's picks..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Analyzing..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
```

## GSN Use Case 4: Route via LiteLLM Gateway

Combine with the LiteLLM proxy (see LITELLM-GATEWAY.md) for cost tracking:

```typescript
import { createAnthropic } from "@ai-sdk/anthropic";

// Point at LiteLLM instead of Anthropic directly
const anthropicViaGateway = createAnthropic({
  baseURL: process.env.LITELLM_URL ?? "http://localhost:4000/v1",
  apiKey: process.env.LITELLM_MASTER_KEY ?? "",
});

const result = streamText({
  model: anthropicViaGateway("gse-primary"), // virtual model alias in LiteLLM config
  prompt: "...",
});
```

## Environment Variables

```bash
# apps/web/.env.local
ANTHROPIC_API_KEY=sk-ant-...   # used by @ai-sdk/anthropic directly
# OR route through LiteLLM:
LITELLM_URL=http://localhost:4000/v1
LITELLM_MASTER_KEY=sk-litellm-...
```

## Migration Path from Direct SDK

Existing: `anthropic.messages.create({ model, messages, max_tokens })`

Week 1 — Add streaming to one endpoint (picks/stream):
```typescript
// Before:
const msg = await anthropic.messages.create({ ... });
return Response.json(msg.content[0].text);

// After:
const result = streamText({ model: anthropic("..."), ... });
return result.toDataStreamResponse();
```

Week 2 — Add `useChat` hook to the picks advisor UI.
Week 3 — Migrate pick generation to `streamObject` + Zod schema.
Week 4 — Wire tool use for real-time odds retrieval mid-generation.

## Status

- [ ] `npm install ai @ai-sdk/anthropic zod`
- [ ] Create `/api/picks/stream` endpoint with `streamText`
- [ ] Add `useCompletion` to picks detail page
- [ ] Create `/api/chat` endpoint with tool use (getGameOdds, getTeamStats)
- [ ] Add `PicksAdvisor` component with `useChat`
- [ ] Migrate `generateStructuredPick` to `streamObject` + Zod schema
- [ ] Route through LiteLLM gateway in production
