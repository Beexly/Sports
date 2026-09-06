# GSE / GSN External Repo Leverage Audit — 2026-09-06

> Status: **Researched and independently verified. Nothing installed, no schema
> changed, no account created.** Every item below needs the founder personally,
> per AGENTS.md Law 2 (frozen paths), Law 7/8 (no autonomous package installs),
> or because it requires an external account/API key an agent cannot create.
> This doc is the shovel-ready ticket list — each item states the exact command
> or diff, so approval is a single action, not a research task.

Two rounds preceded this doc:
1. An 11-repo audit of MCP browser bridges, RAG/knowledge-graph, code-graph, and
   agent-hosting repos the founder supplied, each independently fact-checked
   (license fetched raw, commit history verified directly, no star count
   trusted at face value). Full detail in chat history / on request.
2. This round: for every repo marked *avoid* or *reference-only* above,
   sourced 2-3 better-fitting alternatives in the same category, same
   verification standard.

---

## Status legend

- **BLOCKED — new dependency**: requires `npm install`, which Law 8 bars an
  autonomous session from doing on its own initiative, and would touch the
  frozen `package-lock.json` (Law 2).
- **BLOCKED — schema**: requires a `packages/db/prisma/schema.prisma` /
  `migrations/**` change (frozen, Law 2).
- **BLOCKED — account**: requires creating an external account / API key an
  agent has no ability to create.
- **BLOCKED — config permission**: requires editing `.mcp.json` or
  `.claude/**`, which this session's own tool permissions denied outright
  (confirmed by a real, failed Edit attempt on `.mcp.json` on 2026-09-06 —
  not assumed).

---

## 1. Browser automation for founder console-step 2FA/SSO (replaces `hanzili/comet-mcp`, `RapierCraft/Perplexity-Comet-MCP`)

| Repo | License (verified raw) | Replaces | Status |
|---|---|---|---|
| `microsoft/playwright-mcp` (npm `@playwright/mcp`) | Apache-2.0 | Both Comet forks | **BLOCKED — config permission**. Founder action: add to `.mcp.json` — `{"playwright": {"command": "npx", "args": ["-y", "@playwright/mcp@latest"]}}`. No new project dependency (runs via `npx` ad hoc). |
| `browserbase/stagehand` | MIT | Both Comet forks (alt.) | **BLOCKED — account**. Needs a Browserbase account for the "live view" MFA-handoff mode; free tier confirmed to exist. |

**Governance note, not just a technical one**: this is for founder-supervised, interactive use only (the AGENTS.md "browser agent" ledger role for Vercel/Neon/Stripe console steps) — never for an unattended autonomous session to browse or scrape with on its own initiative. Any content it touches that could inform picks/content still must pass `checkClearance()` like any other extraction (rule 5).

---

## 2. LLM cost/observability tracing (replaces `CopilotKit/OpenBot`, `meetopenbot/openbot`)

| Repo | License | Status |
|---|---|---|
| `langfuse/langfuse` | MIT core (enterprise code isolated in `ee/`, never touched) | **BLOCKED — account + dependency**. Founder action: sign up for Langfuse Cloud free tier, get `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`, approve `npm install langfuse` in `apps/web`. Integration point: wrap calls in `apps/web/lib/claude-api/model-router.ts` / `provider-dispatch.ts`. |
| `Helicone/helicone` | Apache-2.0 (its sibling `ai-gateway` repo is GPL-3.0 — not this one, do not confuse them) | **BLOCKED — account**. Founder action: sign up (free tier, 10k req/mo), swap the Claude API base URL for Helicone's proxy in `provider-config.ts` — no new npm dependency needed for the simplest integration (a URL + header change). |

---

## 3. Agent memory / context compression (replaces `volcengine/OpenViking`)

| Repo | License | Status |
|---|---|---|
| `doobidoo/mcp-memory-service` | Apache-2.0 | **BLOCKED — external install + config permission**. Founder action: `pip install mcp-memory-service` on the machine running Claude Code, then add to that machine's MCP config (local SQLite mode — deliberately NOT proposed for the shared repo `.mcp.json`, since a machine without the pip install would show a broken server; this is a per-developer opt-in, same posture the original audit gave comet-mcp). |
| `mem0ai/mem0` | Apache-2.0 | **BLOCKED — dependency + schema**. Needs `npm install mem0ai` (or `pip install mem0ai`) approval and a `pgvector` extension / new table on the Postgres/Neon database — a `packages/db/prisma/schema.prisma` change, frozen. |

*Caveat on both: real CVE histories exist, but only in each project's optional multi-user REST/OAuth server mode — not the embedded-library / local-stdio modes recommended here. Re-check CVE feeds before the founder approves either.*

---

## 4. Lightweight TypeScript-native RAG/search (replaces `StarTrail-org/PixelRAG`)

| Repo | License | Status |
|---|---|---|
| `oramasearch/orama` | Apache-2.0 | **BLOCKED — new dependency**. `npm install @orama/orama` in `apps/web`. Zero native deps, runs in a Vercel serverless *or Edge* function — the only item on this whole list with essentially no infra downside once approved. |
| `Stevenic/vectra` | MIT | **BLOCKED — new dependency**. Only worth it over Orama if a Postgres-backed durable index (vs. in-memory) is wanted — needs a small custom storage adapter written against Neon. |

**Honest gap, not filled by any repo**: NanoNets/nanoindex's contradiction/staleness-detection design (for Airwave claims) has no TypeScript-native library replacement anywhere — confirmed by direct search. This stays a from-scratch module (`apps/web/lib/airwave/claim-consistency-check.ts`) whenever Airwave leaves dry-run; no new dependency needed for it, not blocked, just not started.

---

## 5. Temporal/entity-relationship graph (replaces `getzep/graphiti`, `Glitch-Cat-Club/graph-memory-starter`)

| Repo | License | Status |
|---|---|---|
| `hettie-d/pg_bitemporal` | BSD-style | **Reference only — no adoption needed.** 117 commits / 8 contributors / pgTAP-tested design reference for the `valid_from`/`valid_to` pattern GSE's own dormant `Entity`/`EntityEdge` schema already uses. Nothing to install; read it when wiring `Entity`/`EntityEdge` to a real producer/consumer. |
| `topoteretes/cognee` | Apache-2.0 | **BLOCKED — new dependency**, and lower priority — more machinery (pluggable graph/RAG stack collapsible to Postgres/pgvector) than the current need justifies. |

**Confirmed dead end, do not revisit**: Apache AGE (Apache-2.0, genuinely active Postgres graph extension) would otherwise be the answer, but is independently confirmed **not supported on Neon** — reproduces graphiti's Neo4j problem one layer down. **The correct path stays what it already was**: recursive CTEs directly against the existing `Entity`/`EntityEdge`/`Signal` Prisma models. No new repo fixes this; it needs an application-code producer/consumer, not a dependency.

---

## 6. Code-graph / call-hierarchy tooling for coding agents (replaces `colbymchenry/codegraph`, `abhigyanpatwari/GitNexus`)

| Repo | License | Status |
|---|---|---|
| `typescript-language-server` (npm) | Apache-2.0 | **Not implemented — deliberately, not just blocked.** Runs via `npx typescript-language-server@latest --stdio` (no new project dependency), but it speaks raw LSP over stdio, not the MCP protocol Claude Code's MCP client expects — there is no safe existing bridge (`ts-language-mcp` was found and its LICENSE file is broken/inconsistent with its own `package.json`, so it's a "watch, don't adopt" per the same standard that flagged GitNexus's license trap). Writing a first-party MCP↔LSP adapter is real, doable work, but untestable end-to-end in this session (no live MCP client to round-trip against) — shipping it unvalidated would violate this project's own "don't merge unvalidated changes" discipline. **Scoped as a real backlog item, not attempted blind.** |
| `@ast-grep/cli` | MIT | **BLOCKED — new dependency**. Needs one `allowScripts` line in `package.json` (its one postinstall script only selects a prebuilt binary via `optionalDependencies` — the same precedented pattern already approved for `esbuild`), then `npm install @ast-grep/cli`. |

---

## Founder action summary (fastest path to value first)

1. **Add `@playwright/mcp` to `.mcp.json`** (blocked by this session's own permissions, not by AGENTS.md — a human/founder editing it directly hits no such block). Zero new dependency, zero schema change.
2. **Sign up for Helicone free tier**, swap the Claude API proxy URL. Zero new dependency for the simplest integration.
3. **Approve `npm install @orama/orama`** — single cleanest "cost savings via local search" win across five different asks from the prior audit (docs search, revenue-doc search, GSN editorial precedent, future Airwave claims, partner/pricing terms).
4. Everything else in this doc, roughly in the order it's likely to matter: Langfuse (cost tracing), mem0 or mcp-memory-service (agent memory — pick one, not both, to avoid running two competing memory stores), `@ast-grep/cli` (dev tooling).
5. The `typescript-language-server` MCP bridge and the Airwave `claim-consistency-check.ts` module are real, scoped, buildable tasks for a future coding session — not blocked on the founder at all, just not yet started.

See the "Further exploration" round (10-15 additional, more exploratory finds spanning sports-analytics/forecasting OSS, serverless queue/rate-limit infra, and other categories the first two rounds didn't cover) once it lands — this doc will get a follow-on section rather than a rewrite.
