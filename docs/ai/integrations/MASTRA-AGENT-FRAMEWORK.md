# Mastra: TypeScript AI Agent Workflows for GSN

> Source: `mastra-ai/mastra` (Apache-2.0, 15k★)
> Purpose: Typed multi-step agent workflows with memory, tool calling, and RAG — the missing orchestration layer above raw LiteLLM calls

## What This Solves

GSN currently calls Claude via LiteLLM as one-shot API calls scattered across the codebase. There is no:
- Typed workflow that models the pick generation pipeline as discrete steps
- Automatic retry with exponential back-off per step (not per call)
- Agent memory that persists across pick sessions (so Claude sees prior reasoning)
- RAG pipeline wired to pgvector without manual chunking code
- Step-level observability (which step failed? what was its input/output?)

Mastra is a TypeScript-first AI agent framework. It wraps LiteLLM (already in your stack) and adds:
- **Typed workflows** — each step is `z.input → z.output`, TypeScript enforced
- **Memory** — per-agent + shared memory backed by your existing PostgreSQL/pgvector
- **RAG** — built-in vector store integration with chunking, embedding, retrieval
- **Tool calling** — structured tools that agents can invoke (odds API, DB writes)
- **Suspend/resume** — pause a workflow step for human review, resume it later

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| LiteLLM | Model routing + cost tracking (Mastra uses LiteLLM as its LLM provider) |
| AgentOps | AI session telemetry — session/prompt/completion pairs |
| Trigger.dev | Cron scheduling — when to run the pick pipeline |
| n8n | No-code routing for emails, Slack, webhooks |
| **Mastra** | **Typed step-by-step orchestration of what happens INSIDE the pipeline** |

Trigger.dev fires the job. Mastra executes the workflow. AgentOps observes Claude calls inside it. These are three layers, not three ways of doing the same thing.

## Installation

```bash
npm install @mastra/core @mastra/memory @mastra/rag --workspace=apps/web

# Mastra uses LiteLLM as its provider — already installed
# Mastra uses pgvector for memory/RAG — already in your schema
```

## GSN Use Case 1: Typed Pick Generation Workflow

Replace the unstructured `generatePick(gameId)` call chain with a typed Mastra workflow:

**`packages/ai/src/workflows/pick-generation.ts`**:

```typescript
import { Workflow, Step } from "@mastra/core";
import { z } from "zod";
import { litellm } from "@/lib/litellm";

// Every step is: typed input → typed output. TypeScript enforces the contract.
const fetchOddsStep = new Step({
  id: "fetch-odds",
  inputSchema: z.object({ gameId: z.string() }),
  outputSchema: z.object({
    gameId: z.string(),
    homeTeam: z.string(),
    awayTeam: z.string(),
    spread: z.number(),
    total: z.number(),
    moneyline: z.object({ home: z.number(), away: z.number() }),
    publicBettingPct: z.object({ home: z.number(), away: z.number() }),
  }),
  execute: async ({ context }) => {
    const { gameId } = context.inputData;
    const odds = await fetchOddsForGame(gameId);
    return odds;
  },
});

const prescreenStep = new Step({
  id: "prescreen",
  inputSchema: fetchOddsStep.outputSchema,
  outputSchema: z.object({
    worthAnalyzing: z.boolean(),
    reason: z.string(),
    odds: fetchOddsStep.outputSchema,
  }),
  execute: async ({ context }) => {
    const odds = context.inputData;
    // Ollama local model for cheap pre-screening (already in stack)
    const result = await litellm.completion({
      model: "ollama/llama3.1:8b",
      messages: [{ role: "user", content: buildPrescreenPrompt(odds) }],
      response_format: { type: "json_object" },
    });
    const { worthAnalyzing, reason } = JSON.parse(result.choices[0].message.content ?? "{}");
    return { worthAnalyzing, reason, odds };
  },
});

const analyzeStep = new Step({
  id: "analyze",
  inputSchema: prescreenStep.outputSchema,
  outputSchema: z.object({
    selection: z.string(),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
    keyFactors: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { worthAnalyzing, odds } = context.inputData;
    if (!worthAnalyzing) {
      return { selection: "NO_PLAY", confidence: 0, reasoning: "Pre-screened out", keyFactors: [] };
    }
    // Claude Sonnet for deep analysis
    const result = await litellm.completion({
      model: "claude-sonnet-5",
      messages: [{ role: "user", content: buildPickPrompt(odds) }],
      response_format: { type: "json_object" },
    });
    return JSON.parse(result.choices[0].message.content ?? "{}");
  },
});

export const pickGenerationWorkflow = new Workflow({
  name: "pick-generation",
  triggerSchema: z.object({ gameId: z.string() }),
})
  .step(fetchOddsStep)
  .then(prescreenStep)
  .then(analyzeStep)
  .commit();
```

**Invoke from BullMQ worker**:

```typescript
import { pickGenerationWorkflow } from "@sports/ai/workflows/pick-generation";
import { mastra } from "@/lib/mastra";

const pickWorker = new Worker("pick-generation", async (job) => {
  const { results, status } = await mastra.getWorkflow("pick-generation").execute({
    triggerData: { gameId: job.data.gameId },
  });

  if (status === "SUCCESS") {
    const analysis = results.analyze.output;
    await db.pick.create({ data: { ...analysis, gameId: job.data.gameId } });
  }
});
```

Each step is logged with its input, output, duration, and any errors — no manual instrumentation needed.

## GSN Use Case 2: Agent Memory Across Pick Sessions

Mastra memory lets Claude remember its prior reasoning without you managing vector search:

```typescript
import { Agent } from "@mastra/core";
import { Memory } from "@mastra/memory";
import { PgVector } from "@mastra/pg";

// Reuse your existing pgvector connection
const memory = new Memory({
  storage: new PgVector({ connectionString: process.env.DATABASE_URL! }),
  options: {
    lastMessages: 10,           // Last 10 picks for this agent
    semanticRecall: {
      topK: 5,                  // 5 most similar prior picks
      messageRange: { before: 2, after: 2 },
    },
  },
});

export const pickAnalyst = new Agent({
  name: "pick-analyst",
  instructions: `
    You are a sports betting analyst for Galaxy Sports Edge. You track your own
    reasoning across picks. When you see a game, recall similar historical games
    from your memory and reference your prior reasoning where relevant.
  `,
  model: {
    provider: "ANTHROPIC",
    name: "claude-sonnet-5",
  },
  memory,
});

// First pick call for NFL game:
await pickAnalyst.generate("Analyze Chiefs vs Raiders spread...", {
  threadId: "nfl-week-14",
  resourceId: "pick-analyst",
});

// Second pick call SAME session — agent recalls prior NFL reasoning:
await pickAnalyst.generate("Now analyze Eagles vs Cowboys...", {
  threadId: "nfl-week-14",
  resourceId: "pick-analyst",
});
// Claude's context now includes: prior Chiefs/Raiders analysis + semantically similar past picks
```

This is more powerful than `mem0` in your stack because it's aware of the workflow step context, not just raw conversation history.

## GSN Use Case 3: RAG Over Historical Pick Data

Mastra has a built-in RAG pipeline that connects to your existing pgvector setup:

```typescript
import { MDocument } from "@mastra/rag";
import { PgVector } from "@mastra/pg";

// Chunk and embed historical picks for retrieval
const pickDocuments = historicalPicks.map((pick) =>
  MDocument.fromText(`
    Game: ${pick.awayTeam} @ ${pick.homeTeam}
    Selection: ${pick.selection}
    Confidence: ${pick.confidence}
    Outcome: ${pick.outcome}
    Reasoning: ${pick.reasoning}
  `)
);

const pgVector = new PgVector({ connectionString: process.env.DATABASE_URL! });

// Chunk → embed → store (auto-handled by Mastra)
await pgVector.upsert({
  indexName: "historical-picks",
  vectors: await embedDocuments(pickDocuments),
});

// Retrieval at analysis time:
const similarPicks = await pgVector.query({
  indexName: "historical-picks",
  queryVector: await embed(currentGameDescription),
  topK: 5,
});
// Feed similarPicks.results into the pick prompt as context
```

## Mastra Client Setup

**`packages/ai/src/mastra.ts`**:

```typescript
import { Mastra } from "@mastra/core";
import { PgVector } from "@mastra/pg";
import { pickGenerationWorkflow } from "./workflows/pick-generation";
import { pickAnalyst } from "./agents/pick-analyst";

export const mastra = new Mastra({
  workflows: { pickGenerationWorkflow },
  agents: { pickAnalyst },
  vectors: {
    default: new PgVector({ connectionString: process.env.DATABASE_URL! }),
  },
  logger: {
    type: "CONSOLE",
    level: "INFO",
  },
});
```

## Local Dev: Mastra Playground

```bash
# Mastra ships a local playground UI
npx mastra dev

# Open http://localhost:4111
# - Run workflows with live step visualization
# - Chat with agents, inspect memory
# - Test RAG retrieval
```

## What This Does NOT Cover

- Model routing (cheapest model per task) → LiteLLM (`LITELLM-GATEWAY.md`)
- Cron/scheduling (when to run the pipeline) → Trigger.dev (`TRIGGER-DEV.md`)
- AI session telemetry (token usage, costs) → AgentOps (`AGENTOPS-OBSERVABILITY.md`)
- Full distributed tracing → OpenTelemetry (`OPENTELEMETRY-TRACING.md`)
- No-code workflow routing → n8n (`N8N-WORKFLOW-AUTOMATION.md`)

## Environment Variables

```bash
# No new env vars needed — Mastra uses existing:
DATABASE_URL=...        # pgvector memory/RAG storage
ANTHROPIC_API_KEY=...   # Claude API (via existing LiteLLM setup)
```

## Status

- [ ] `npm install @mastra/core @mastra/memory @mastra/rag --workspace=apps/web`
- [ ] Create `packages/ai/src/mastra.ts` — Mastra instance with workflow + agent registry
- [ ] Port `generatePick()` to `pickGenerationWorkflow` (fetchOdds → prescreen → analyze steps)
- [ ] Wire workflow to BullMQ worker (replace direct `generatePick()` call)
- [ ] Run `npx mastra dev` and visualize pick workflow step-by-step
- [ ] Add `pickAnalyst` agent with Memory backed by existing pgvector
- [ ] Test: verify pre-screen step routes to Ollama, analysis step routes to Sonnet
- [ ] Compare workflow outputs vs. current direct-call outputs for parity
