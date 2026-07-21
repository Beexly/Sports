# pgvector: Semantic Search in Existing PostgreSQL

> Source: `pgvector/pgvector` (MIT, 16k★)
> Purpose: Add vector similarity search to the existing PostgreSQL database — zero new infrastructure

## What This Solves

GSN's database stores 10k+ picks, games, and user interactions. Queries are all exact-match:
`WHERE gameId = ? AND status = 'FINAL'`. The database cannot answer:

- "Find picks similar to last week's Chiefs moneyline win" (semantic similarity)
- "Which games have conditions similar to tonight's game?" (feature-based matching)
- "Cluster users by betting style for personalized picks" (preference similarity)
- "Find all picks where we had strong edge but lost" (pattern discovery in outcomes)
- "Which historical picks most resemble this current pick?" (RAG for pick reasoning)

pgvector adds a `vector` column type to PostgreSQL. Since GSN already uses PostgreSQL + Prisma,
this costs zero new infrastructure — just a Prisma migration and a new column type.

**The fundamental upgrade**: from a database that can only find exact matches to one that can
find *semantically similar* records. This is the difference between a file system and a search engine.

## How It Differs from Other Vector DBs

| | pgvector | Pinecone | Weaviate | Qdrant |
|---|---|---|---|---|
| Infrastructure | Uses existing PostgreSQL | New service | New service | New service |
| Prisma integration | Native (via extension) | Manual HTTP | Manual HTTP | Manual HTTP |
| SQL joins | Yes — join vectors with game/pick tables | No | No | No |
| Setup cost | Migration + npm package | New managed service | Docker + config | Docker + config |
| Consistency | Transactional with your data | Eventually consistent | Eventually consistent | Eventually consistent |
| GSN adoption cost | **< 1 day** | 3–5 days | 3–5 days | 3–5 days |

The killer advantage for GSN: you can JOIN vector similarity search results with your Prisma
relations in a single query. `SELECT picks.* FROM picks WHERE embedding <-> $1 < 0.3 AND picks.result = 'WIN'`

## Installation

```bash
# Enable pgvector in your PostgreSQL database (one-time, run against prod + test DB)
# For Neon, Supabase, or RDS — it's available as an extension:
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Prisma client extension for pgvector
npm install @prisma/extension-pgvector pgvector

# Anthropic for generating embeddings (already installed)
# @anthropic-ai/sdk — use voyage-3 model for code/text embeddings
```

## Schema Migration

Add to `packages/db/prisma/schema.prisma`:

```prisma
// Enable the pgvector extension
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

// Add embedding column to Pick
model Pick {
  id              String   @id @default(cuid())
  // ... existing fields ...

  // Semantic embedding of the pick context at generation time
  // Dimension 1024 = voyage-3 output size
  embedding       Unsupported("vector(1024)")?

  @@index([embedding], type: Hnsw(m: 16, efConstruction: 64, distfn: Cosine))
}

// Standalone game embeddings for similarity search
model GameEmbedding {
  id          String   @id @default(cuid())
  gameId      String   @unique
  game        Game     @relation(fields: [gameId], references: [id])
  embedding   Unsupported("vector(1024)")
  context     String   // What was embedded (for debugging)
  createdAt   DateTime @default(now())

  @@index([embedding], type: Hnsw(m: 16, efConstruction: 64, distfn: Cosine))
}
```

```bash
# Generate and apply migration
npx prisma migrate dev --name add-pgvector-embeddings
```

## Embedding Generation

**`apps/web/lib/embeddings.ts`**:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@sports/db";

const anthropic = new Anthropic();

export async function generatePickEmbedding(pick: {
  pickType: string;
  selection: string;
  confidence: number;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  spread: number | null;
}): Promise<number[]> {
  // Build a rich text representation of the pick context
  const text = [
    `Sport: ${pick.sport}`,
    `Game: ${pick.homeTeam} vs ${pick.awayTeam}`,
    `Pick: ${pick.pickType} — ${pick.selection}`,
    pick.spread ? `Spread: ${pick.spread}` : "",
    `Confidence: ${pick.confidence}%`,
  ].filter(Boolean).join(". ");

  const response = await anthropic.embeddings.create({
    model: "voyage-3",
    input: text,
  });

  return response.data[0].embedding;
}

export async function generateGameEmbedding(game: {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  commenceTime: Date;
  spread: number | null;
  total: number | null;
  weather?: string;
}): Promise<number[]> {
  const text = [
    `Sport: ${game.sport}`,
    `${game.homeTeam} (home) vs ${game.awayTeam} (away)`,
    `Date: ${game.commenceTime.toISOString().split("T")[0]}`,
    game.spread ? `Spread: ${game.spread}` : "",
    game.total ? `Total: ${game.total}` : "",
    game.weather ?? "",
  ].filter(Boolean).join(". ");

  const response = await anthropic.embeddings.create({
    model: "voyage-3",
    input: text,
  });

  return response.data[0].embedding;
}
```

## GSN Use Case 1: Similar Picks Retrieval ("Picks Like This")

```typescript
import { db } from "@sports/db";
import { toSql } from "pgvector/prisma";

// Find the 10 most similar historical picks to a given pick
export async function findSimilarPicks(
  pickId: string,
  limit: number = 10,
): Promise<Array<{ id: string; result: string; confidence: number; similarity: number }>> {
  // Get the embedding of the source pick
  const sourcePick = await db.$queryRaw<Array<{ embedding: string }>>`
    SELECT embedding::text FROM "Pick" WHERE id = ${pickId}
  `;

  if (!sourcePick[0]?.embedding) return [];

  // Vector similarity search — cosine distance <-> operator
  const similar = await db.$queryRaw<Array<{
    id: string;
    result: string;
    confidence: number;
    similarity: number;
  }>>`
    SELECT
      id,
      result,
      confidence,
      1 - (embedding <-> ${sourcePick[0].embedding}::vector) AS similarity
    FROM "Pick"
    WHERE id != ${pickId}
      AND embedding IS NOT NULL
      AND result != 'PENDING'
    ORDER BY embedding <-> ${sourcePick[0].embedding}::vector
    LIMIT ${limit}
  `;

  return similar;
}
```

## GSN Use Case 2: "How Did Similar Picks Perform?" (Pre-Generation Context)

Before generating a new pick, retrieve historical performance on similar games:

```typescript
export async function getSimilarPickPerformance(
  gameContext: string,
  limit: number = 20,
): Promise<{ winRate: number; avgConfidence: number; sampleSize: number }> {
  const contextEmbedding = await generateGameEmbedding(parseGameContext(gameContext));

  const results = await db.$queryRaw<Array<{ result: string; confidence: number }>>`
    SELECT p.result, p.confidence
    FROM "Pick" p
    JOIN "GameEmbedding" ge ON ge."gameId" = p."gameId"
    WHERE ge.embedding <-> ${toSql(contextEmbedding)}::vector < 0.25
      AND p.result IN ('WIN', 'LOSS', 'PUSH')
    ORDER BY ge.embedding <-> ${toSql(contextEmbedding)}::vector
    LIMIT ${limit}
  `;

  const wins = results.filter(r => r.result === "WIN").length;
  return {
    winRate: results.length > 0 ? wins / results.length : 0,
    avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1),
    sampleSize: results.length,
  };
}
```

## GSN Use Case 3: User Preference Clustering (Personalized Picks)

```typescript
// Build a "user taste" embedding from their settled picks
export async function buildUserPreferenceEmbedding(userId: string): Promise<number[]> {
  const settledPicks = await db.pick.findMany({
    where: { userId, result: { in: ["WIN", "LOSS", "PUSH"] } },
    take: 50,
    orderBy: { settledAt: "desc" },
    select: { embedding: true, result: true },
  });

  // Average the embeddings of WIN picks (user's "good bet" fingerprint)
  const winEmbeddings = settledPicks
    .filter(p => p.result === "WIN" && p.embedding)
    .map(p => JSON.parse(p.embedding as string) as number[]);

  if (winEmbeddings.length === 0) return [];

  // Element-wise average
  return winEmbeddings[0].map((_, i) =>
    winEmbeddings.reduce((sum, emb) => sum + emb[i], 0) / winEmbeddings.length
  );
}

// Find picks that match a user's preference profile
export async function getPersonalizedPicks(userId: string, limit = 5) {
  const userEmbedding = await buildUserPreferenceEmbedding(userId);
  if (!userEmbedding.length) return getDefaultPicks(limit); // cold start

  return db.$queryRaw`
    SELECT id, "pickType", selection, confidence
    FROM "Pick"
    WHERE result = 'PENDING'
      AND embedding IS NOT NULL
    ORDER BY embedding <-> ${toSql(userEmbedding)}::vector
    LIMIT ${limit}
  `;
}
```

## GSN Use Case 4: RAG for Pick Reasoning

Feed Claude historical similar picks as context before generating a new one:

```typescript
export async function generatePickWithRAGContext(gameContext: string): Promise<string> {
  // 1. Find similar historical picks
  const gameEmbedding = await generateGameEmbedding(parseGameContext(gameContext));
  const historicalPicks = await db.$queryRaw<Array<{
    selection: string; result: string; confidence: number; reasoning: string;
  }>>`
    SELECT p.selection, p.result, p.confidence, p.reasoning
    FROM "Pick" p
    JOIN "GameEmbedding" ge ON ge."gameId" = p."gameId"
    WHERE ge.embedding <-> ${toSql(gameEmbedding)}::vector < 0.3
      AND p.result IN ('WIN', 'LOSS')
    ORDER BY ge.embedding <-> ${toSql(gameEmbedding)}::vector
    LIMIT 5
  `;

  // 2. Build RAG context
  const historicalContext = historicalPicks
    .map(p => `- ${p.selection} (${p.result}, ${p.confidence}% confidence): ${p.reasoning}`)
    .join("\n");

  // 3. Generate pick with historical context in the prompt
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Historical picks on similar games:\n${historicalContext}\n\nNow analyze: ${gameContext}`,
    }],
  });

  return response.content[0].text;
}
```

## Backfill Existing Picks

Run once to embed all historical picks:

```typescript
// scripts/backfill-embeddings.ts
import { db } from "@sports/db";
import { generatePickEmbedding } from "../apps/web/lib/embeddings.js";

async function backfill() {
  const picks = await db.pick.findMany({
    where: { embedding: null, result: { not: "PENDING" } },
    include: { game: true },
    take: 1000,
  });

  for (const pick of picks) {
    const embedding = await generatePickEmbedding({ ...pick, ...pick.game });
    await db.$executeRaw`
      UPDATE "Pick" SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${pick.id}
    `;
    // Rate limit: voyage-3 is fast but still has limits
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(`Backfilled ${picks.length} picks`);
}

backfill();
```

```bash
# Run backfill:
npx ts-node scripts/backfill-embeddings.ts
```

## Status

- [ ] `psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"` (run on prod DB)
- [ ] `npm install @prisma/extension-pgvector pgvector`
- [ ] Add `extensions = [vector]` to `schema.prisma` + `embedding` columns + HNSW indexes
- [ ] `npx prisma migrate dev --name add-pgvector-embeddings`
- [ ] Create `apps/web/lib/embeddings.ts` with voyage-3 embedding generation
- [ ] Run backfill script on existing picks
- [ ] Wire `getSimilarPickPerformance()` into pick generation as RAG context
- [ ] Add `getPersonalizedPicks()` to the picks API for logged-in users
- [ ] Add `findSimilarPicks()` to the pick detail page ("Similar Historical Picks" section)
