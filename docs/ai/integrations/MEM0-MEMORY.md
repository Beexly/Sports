# Mem0: Persistent Memory Layer for AI Agents

> Source: `mem0ai/mem0` (Apache-2.0, 61k★)
> Purpose: Cross-session memory for Claude Code developer workflow AND per-user personalization in GSN

## What This Solves

Two distinct problems with the same fix:

**Problem 1 — Developer sessions lose context.** Every Claude Code session starts cold.
After a month of work, Claude still asks: "What's the Prisma schema look like?"
"Which auth pattern do you use?" "What's checkClearance()?" Mem0 stores session-learned
facts in a persistent knowledge graph and retrieves them by semantic relevance next session.

**Problem 2 — GSN has no user preference memory.** The AI picks system generates
generic recommendations. User A prefers -3.5 or better spreads on NFL home dogs.
User B only plays totals. Neither preference is captured — every user gets the same
model output. Mem0 makes personalization first-class.

## Claude Code Agent Skills (Official)

Mem0 ships three named Agent Skills for Claude Code:

```bash
# In Claude Code, install skills:
npx skills add mem0           # SDK knowledge — how to use the API
npx skills add mem0-cli       # CLI patterns
npx skills add mem0-vercel-ai-sdk  # Vercel AI SDK pipeline integration
```

The `mem0-integrate` pipeline skill auto-wires Mem0 into an existing repo:
Claude reads your codebase, identifies the right integration points, and writes
the implementation — no manual configuration.

## Installation

```bash
# TypeScript / Next.js SDK (add to sports/apps/web)
npm install mem0ai

# Python SDK (for BullMQ workers or ingestion scripts)
pip install mem0ai

# CLI for developer session memory
npm install -g @mem0/cli
mem0 login  # authenticates with app.mem0.ai or self-hosted

# Self-hosted (Docker)
cd mem0/server && make bootstrap
# Runs at localhost:8080
```

## Configuration (Next.js / TypeScript)

```typescript
// apps/web/lib/mem0.ts
import { Memory } from "mem0ai";

export const memory = new Memory({
  // Managed cloud (simplest):
  apiKey: process.env["MEM0_API_KEY"],

  // OR self-hosted:
  // apiUrl: "http://localhost:8080",

  // Use Claude for memory management (optional, defaults to gpt-5-mini):
  llmConfig: {
    provider: "anthropic",
    config: {
      model: "claude-haiku-4-5-20251001",
      apiKey: process.env["ANTHROPIC_API_KEY"],
    },
  },
});
```

## GSN Use Case 1: Per-User Betting Preferences

Store user preferences after each resolved pick:

```typescript
// apps/web/lib/picks/personalize.ts
import { memory } from "@/lib/mem0";

export async function recordBettingPreference(
  userId: string,
  resolvedPick: { pickType: string; sport: string; result: string; selection: string }
) {
  await memory.add(
    [{ role: "user", content: `User placed a ${resolvedPick.pickType} pick on ${resolvedPick.sport}: ${resolvedPick.selection}. Result: ${resolvedPick.result}.` }],
    { user_id: userId }
  );
}

// Retrieve before generating next recommendation:
export async function getUserPickContext(userId: string, query: string) {
  return memory.search(query, { user_id: userId, top_k: 5 });
}
```

In the AI pick generation route, inject retrieved memories into the Claude prompt:

```typescript
// apps/web/app/api/picks/generate/route.ts
const userMemories = await getUserPickContext(userId, `${sport} betting preferences`);
const memoryContext = userMemories.results.map(m => m.memory).join("\n");

const prompt = `
User preferences from history:
${memoryContext}

Generate a ${sport} pick recommendation for today's games.
`;
```

## GSN Use Case 2: BullMQ Worker Agent Context

Workers in `workers/data-refresh/` restart cold. Mem0 gives them continuity:

```typescript
// workers/data-refresh/src/index.ts
import { memory } from "@sports/mem0-client";

async function processGame(gameId: string, agentId: string) {
  // Recall prior analysis on this game
  const context = await memory.search(`game ${gameId} analysis`, {
    agent_id: agentId,
    top_k: 3,
  });

  // ... process ...

  // Store what was learned
  await memory.add(
    [{ role: "assistant", content: `Analyzed game ${gameId}: line moved from -3 to -4.5, sharp action detected.` }],
    { agent_id: agentId }
  );
}
```

## Developer Use Case: Cross-Session Claude Code Memory

Use the CLI to store architectural decisions between sessions:

```bash
# End of session — save what was learned:
mem0 add "GSN uses timingSafeEqual from node:crypto for API key comparison (fixed 2026-07-21)"
mem0 add "Prisma schema: GameStatus enum has SCHEDULED, LIVE, FINAL, POSTPONED, CANCELED"
mem0 add "Auth pattern: import { auth } from '@/lib/auth'; import { isAdminSession } from '@/lib/auth/require-admin'"
mem0 add "BullMQ workers live in workers/data-refresh/; ingestion in packages/ingestion-pipeline/"

# Start of next session:
mem0 search "GSN auth pattern"
mem0 search "Prisma game status"
```

Or tell Claude Code at session start:
```
"Search mem0 for 'GSN architecture decisions' and use that context for this session."
```

## MCP Config (Claude Code)

Once `mem0-cli` is installed, wire it as an MCP server:

```json
{
  "mcpServers": {
    "mem0": {
      "command": "mem0",
      "args": ["mcp", "serve"],
      "env": {
        "MEM0_API_KEY": "${MEM0_API_KEY}"
      }
    }
  }
}
```

## Env Vars to Add

```bash
# .env.local
MEM0_API_KEY=              # from app.mem0.ai (free tier: 1,000 operations/month)
# Leave blank for self-hosted Docker
```

## Status

- [ ] `npm install mem0ai` in apps/web
- [ ] Add `MEM0_API_KEY` to Vercel env vars (or deploy self-hosted)
- [ ] Instrument `recordBettingPreference()` in pick resolution flow
- [ ] Inject `getUserPickContext()` into AI pick generation prompt
- [ ] Install `mem0-cli` globally and seed developer session memories
- [ ] Wire MCP server to Claude Code config
- [ ] Install Agent Skills: `npx skills add mem0 mem0-vercel-ai-sdk`
