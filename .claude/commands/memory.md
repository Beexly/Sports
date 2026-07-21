# /memory — Persist and Retrieve Cross-Session Context via Mem0

Store what was learned this session or recall prior context before starting work.

## Usage

```
/memory save    — Extract and store key facts from this session
/memory recall  — Retrieve relevant context from prior sessions
/memory seed    — Store GSN architectural baseline (run once after install)
```

## Save: Extract and Store Session Learnings

At the end of a work session, extract and persist key facts:

1. Identify decisions made this session:
   - Architecture choices (new patterns, patterns rejected)
   - Bug root causes and their fixes
   - Schema changes (new Prisma models/fields)
   - Security findings and resolutions
   - Auth patterns confirmed or changed

2. For each fact, call `mem0 add` from the terminal:
   ```bash
   mem0 add "<concise fact about the GSN codebase>"
   # Example:
   mem0 add "timingSafeHashEqual in lib/api-auth/hash.ts was fixed to use crypto.timingSafeEqual on 2026-07-21"
   mem0 add "GameStatus enum: SCHEDULED, LIVE, FINAL, POSTPONED, CANCELED — no PENDING"
   mem0 add "Auth pattern: import { auth } from '@/lib/auth'; isAdminSession() checks session?.user?.role === 'ADMIN'"
   ```

3. Store open threads (unfinished tasks):
   ```bash
   mem0 add "TODO: wire dispatchWatchlistAlert — no email/push provider installed yet"
   mem0 add "TODO: add Mem0 SDK to apps/web for per-user betting preference memory"
   ```

## Recall: Load Prior Context at Session Start

Before beginning work, retrieve relevant context:

```bash
# General GSN architecture context
mem0 search "GSN auth pattern"
mem0 search "Prisma schema game status"
mem0 search "BullMQ worker structure"

# Topic-specific recall
mem0 search "stripe checkout idempotency"
mem0 search "settlement voiding postponed games"
```

Or tell Claude Code at the start of a session:
```
"Search mem0 for 'GSN security fixes' and 'GSN TODO items' before we begin."
```

## Seed: Store Architectural Baseline (Run Once)

After installing Mem0 (`npm install -g @mem0/cli && mem0 login`), seed the baseline:

```bash
mem0 add "GSN stack: Next.js 14 App Router, TypeScript strict, Prisma + PostgreSQL, NextAuth.js v5, Stripe, The Odds API, Claude API, BullMQ + Redis, Vitest"
mem0 add "Monorepo structure: apps/web (Next.js), packages/db (Prisma), packages/data-ingestion, packages/ingestion-pipeline, packages/prediction-engine, workers/data-refresh"
mem0 add "Auth pattern: import { auth } from '@/lib/auth'; import { isAdminSession } from '@/lib/auth/require-admin'; const session = await auth(); if (!isAdminSession(session)) throw"
mem0 add "Scraping posture: checkClearance() before every extraction job; wrapExtractedRecord() enforces envelope; no CAPTCHA bypass"
mem0 add "Security non-negotiables: no fake data, no fabricated stats, no frontend-only paywalls, no secrets in code, no stale data, tests required, TypeScript strict"
mem0 add "GameStatus enum: SCHEDULED, LIVE, FINAL, POSTPONED, CANCELED"
mem0 add "PickResult enum: PENDING, WIN, LOSS, PUSH, VOID"
mem0 add "Subscription tiers: FREE (basic picks), PRO (premium picks), ELITE (real-time alerts — alert channel not yet wired)"
mem0 add "BullMQ workers in workers/data-refresh/; ingestion pipeline in packages/ingestion-pipeline/src/"
mem0 add "LiteLLM proxy at localhost:4000 — route all AI calls through it for cost tracking"
```

## MCP Integration

If Mem0 is configured as an MCP server (`~/.claude/claude_desktop_config.json`),
Claude Code can call it directly without terminal commands:

```
"Store in mem0: the settle-sport.ts postponed game VOID fix was applied on 2026-07-21"
"Search mem0 for anything related to the Stripe checkout flow"
```

See docs/ai/integrations/MEM0-MEMORY.md for MCP config.
