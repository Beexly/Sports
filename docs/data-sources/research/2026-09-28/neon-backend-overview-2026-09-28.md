# Neon backend overview — evaluation (2026-09-28)

Source: https://neon.com/docs/get-started/backend-overview (orientation page, read 2026-09-28).

## What it is
Neon's backend-as-code: one `neon.ts` declares six capabilities, `neon deploy` provisions them and injects env vars. The six: **Postgres** (on by default), **Object Storage** (S3-compatible), **Functions** (long-running serverless compute next to the DB), **AI Gateway** (one credential → many LLM providers), **managed Auth** (Better Auth), **Data API** (PostgREST-compatible HTTPS for Postgres). Branching forks the whole backend copy-on-write; per-branch policy (e.g. auto-expire non-default branches after 7d) lives in `neon.ts`.

## What we already use
Neon Postgres — the predictions/signals DB. That's the "on by default" capability. Nothing else from this page is wired.

## Worth evaluating (none adopted — UNTESTED, queued per doctrine)
1. **Branch-per-feature DB isolation with TTL.** `neon checkout <name> --create` + `ttl: "7d"` on non-default branches gives every agent a throwaway copy-on-write database. The fleet keeps testing writers and migrations against prod-adjacent state (signal-ledger 0-row/504 incidents). This is the cheapest, most reversible item on the page — recommend adopting as convention for agent DB work.
2. **AI Gateway.** One credential for many model providers, model-swap by changing a string. Needs a real cost comparison against our current stack (OpenRouter, NVIDIA NIM) before it means anything — tie into the inference-arbitrage lane (`docs/engine/research/2026-09-28/hf-leverage-round2/laneB-cost-arbitrage.md`). Note: frontier models need access requests.
3. **Data API.** PostgREST-compatible HTTPS endpoint for Postgres. Could simplify read surfaces (the ops read surface for the signals table). Evaluate vs current API routes.
4. **Object Storage.** S3-compatible, branches together with the DB so files and rows stay in sync. Candidate home for backtest artifacts / research corpus snapshots. Evaluate vs Drive/VM disk.
5. **Functions.** Long-running compute next to the DB (Hono app, `pg` pool reused across requests). The signal-ledger writer's 504/deadline history makes this interesting — but moving compute off Vercel is a big call. Evaluate only.

Auth is not relevant (single-operator system, no multi-user app).
