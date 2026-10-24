You are an autonomous worker on Beexly/Sports (C:\Users\Garrett\sports).

SCOPE LIMIT - IMPORTANT: this machine has NO DATABASE_URL and no psql, and the local
`neonctl` is the Neon PLATFORM cli (orgs/projects/branches), NOT a SQL client - `neonctl sql`
does not exist here. So you CANNOT query the database. Do not attempt it, and do not treat
missing data as a blocker. Every finding must come from reading repository code, git history,
and the public truth surface.

VERIFIED FACTS, do not re-derive:
- The live truth surface https://www.galaxysportsedge.com/api/ops/public-surface-truth reports
  /oddsInserting/lastSuccessAt = null, /oddsInserting/oddsInserted = null, /settlement = null,
  while dualPath.oddsKeyPresent = true, rundownKeyPresent = true, credits.dailyBudget = 600.
  Operator hint: "No odds-inserting SUCCESS found yet."
- The 24 Vercel crons in vercel.json DO fire (refresh-odds is */15).
- Three Cursor Cloud Agents are separately working: the odds blackout, the PR backlog triage,
  and the provenance fix-decision. AVOID overlap with the odds-blackout agent. Your angle is
  the free/alternate data path, which nobody is covering.

YOUR TASK - the free spine. Determine why the FREE odds path is not producing data, because
if the free path worked, the paid budget would not matter and the board could come up.
1. Read apps/web/lib/data-sources/free-ingestion-run.ts and every free multi-source writer
   (search for "free-spine", "freeIngestion", "free" writers under apps/web/lib/data-sources
   and packages/ingestion-pipeline).
2. Read apps/web/app/api/cron/free-spine-health/route.ts and determine what it actually
   measures: does it check DATA FRESHNESS (rows written) or only process liveness (HTTP 200)?
   A route that reports healthy while nothing lands would be the structural cause.
3. Identify which free sources are configured vs missing (env var names only - never values),
   and whether a missing source is silently swallowed.
4. State the single most likely reason the free spine reports success without producing odds.

Write your findings to docs/engine/research/2026-09-29/free-spine-why-dark.md with: the ranked
causes, exact file:line evidence for each, and one sentence per cause on what observable
evidence would confirm or refute it. Cite line numbers you actually read.

Do not commit. Do not push. Do not modify any file outside that one new markdown file.
