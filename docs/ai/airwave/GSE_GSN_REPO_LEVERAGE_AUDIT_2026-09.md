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

See below for the "further exploration" round (landed 2026-09-06) — a broader, more
exploratory sweep spanning sports-analytics/forecasting OSS, serverless queue/rate-limit
infra, trending agent frameworks, non-NFL sports data, content/API-monetization tooling,
and verifiable-computation/visual-regression, six independent research passes, all with
the same verification standard (raw LICENSE fetched, real commit history checked, not
star counts trusted).

---

## Round 3 — Broader exploration (2026-09-06)

### Reassuring negative finding, stated first because it changes how to read the rest
`packages/prediction-engine` is already ahead of nearly all public prior art checked:
PAV isotonic + IVAP/CVAP conformal calibration, a purged-and-embargoed walk-forward
splitter (López de Prado-style leakage control — most public sports-betting repos don't
attempt this), and robust/fractional Kelly off a lower-confidence-bound edge (stricter
than a plain Kelly formula). Nothing found beats it; two libraries are worth using purely
as independent cross-checks before trusting a number that flips a public gate:
**EFS-OpenSource/calibration-framework** ("netcal", Apache-2.0) for ECE/ACE math, and
**frazane/scoringrules** (Apache-2.0) for Brier/CRPS math.

### Data-ingestion gaps (real, sport-specific)
| Repo | License | Fills |
|---|---|---|
| `sportsdataverse/sportsdataverse-data` | **CC-BY-4.0** (data) | The actual "nflverse of NBA/NHL" — same GitHub-Release-asset shape `nflverse-source.ts` already reads. Single most actionable data find of this round. |
| `swar/nba_api` | MIT (code; underlying stats.nba.com data is **non-commercial-only per NBA's own ToS** — needs a `permission_required` registry entry, same bucket as MoneyPuck) | Maps stats.nba.com endpoints (shot charts, tracking, hustle stats) ESPN's public API doesn't expose |
| `sportsdataverse/fastRhockey` | MIT | NHL — use this, not `hockeyR` (confirmed dead, last commit 2024-03-15) |

**Negative finding, don't re-search this**: soccer's nflverse-equivalent (`worldfootballR`) is confirmed archived (2025-09-18). No open-licensed replacement exists — GSE's existing `openfootball` (CC0, fixtures only) + `ClubElo`/`Football-Data.co.uk` (already `use-with-caution` in `source-registry.ts`) remain the only viable soccer sources. StatsBomb's free tier is non-commercial-only (matches GSE's existing `forbidden` verdict — no change needed).

**Scraping-governance architecture reference** (not importable — Python/R — but worth reading before ever building the package-level clearance gate `.claude/rules/scraping.md` itself flags as missing): Scrapy's `ROBOTSTXT_OBEY`-by-default + `AutoThrottle` middleware chain, and the R package `polite`'s `bow()`/`scrape()`/`nod()` four-verb "ask permission, cache robots.txt, never ask twice" API — the cleanest existing embodiment of the posture this repo already commits to. (`apify/crawlee` was checked and explicitly rejected — it markets itself around evading bot detection, the opposite of what the scraping rule requires.)

### Production incident fix (highest-confidence, most concrete finding of this round)
The hand-rolled circuit-breaker pattern for TheRundown 429s is the right *idea*, wrong *shape* — it's process-local, and Vercel serverless invocations don't share memory, which is structurally why the 429s recur all day. **Fix needs no new vendor**: GSE already has a Redis connection (`REDIS_URL`/`ioredis`, currently only used for the Claude cache) reachable from the same cron routes — a ~15-line `INCR`/`EXPIRE`-with-midnight-TTL daily quota counter closes the gap for free. `@upstash/ratelimit` (MIT) is a legitimate optional polish layer, not a requirement. Separately: **Vercel Queues** went to public beta Feb 27, 2026 — a native (no new vendor), real retry/backoff/idempotency-key-dedup primitive, worth adopting only if cron-to-cron coordination becomes the actual bottleneck (Inngest/Trigger.dev solve the same problem but mean a real migration off raw Cron — not justified at current scale).

### Agent-fleet / dev-tooling (genuinely new, none installed)
| Repo | License | What it offers |
|---|---|---|
| `NVIDIA/openshell` | Apache-2.0 | Declarative sandboxing (filesystem/network/process/inference layers) that could make AGENTS.md's frozen-paths/no-install/no-gate-flip laws **machine-enforced** instead of honor-system, across Claude Code/Codex/Copilot |
| `omnigent-ai/omnigent` | Apache-2.0 | Meta-harness running Claude Code/Codex/Cursor/Hermes in one session with stacked spend-cap/approval policy — a more general version of the ledger's claim-before-start convention |
| `open-multi-agent/open-multi-agent` | MIT, **TypeScript-native** | Runtime task-DAG planning + a replayable execution-trace viewer — the ledger records *that* a task was done, not *how*; checkpoint/resume maps directly onto "two attempts then BLOCKED" |
| `paperclipai/paperclip` | MIT | CEO→manager→worker agent org-chart with hard per-agent monthly budget caps that auto-pause on overspend — a real mechanism GSE's `model-economics.ts` doesn't have at the per-agent-session level. **Caution**: star growth (55k→80k in months) is unusually fast for an undisclosed team — commits are real and dated, but treat the popularity claim skeptically |

### Content-generation and eval (complements, not replacements, for existing tools)
| Repo | License | Fit |
|---|---|---|
| `Laith0003/ux-skill` | MIT | Ships its brand-linter as a live **MCP server** — the pattern worth stealing is exposing GSE's own `positioning-vocab.json` check as an MCP tool so content-generation call sites self-check while drafting, not only at CI time |
| `KRLabsOrg/LettuceDetect` | MIT | Span-level attribution classifier — catches a syntactically-valid number attributed to the *wrong* stat/team, the specific failure mode `numeric-guard.ts`'s allow-list approach structurally can't catch. Complementary offline pass, not a replacement. |

### Short-form content production (draft-only, matches `media-revenue/platform-strategy.ts`'s existing no-auto-publish rules per platform)
| Repo | License | Note |
|---|---|---|
| `Anil-matcha/AI-Youtube-Shorts-Generator` | MIT | Cleanest starting point — writes local MP4s only, no publish integration exists to accidentally wire in |
| `mutonby/openshorts` | MIT core (Commercial License scoped to `cloud/` only) | Self-hosted (needs a real container, not Vercel Cron — video processing is multi-minute). **Never wire its MCP auto-publish tool.** |
| `nmbrthirteen/podcli` | **AGPL-3.0** | DaVinci Resolve (FCPXML) handoff is the most literal "draft for a human editor" match found. AGPL is fine for internal-tool use, not for wrapping into a customer-facing GSN feature without legal sign-off. **Never invoke its YouTube-publish MCP tool.** |

### API productization for `packages/stats-api` (narrower than expected — most pieces already exist)
Grounding: GSE already has a real hashed API-key primitive (`api/v1/api-key.ts`) and a durable **Postgres-backed** cross-instance rate limiter (`community/durable-rate-limiter.ts`) — no new rate-limiting service is needed. The actual gap is narrow: a self-serve key-management UI, and a bridge from "N verified calls" to a Stripe invoice line.
- **Stripe Billing Meters** — native, zero new vendor, use for launch. (Stripe acquired Metronome Jan 2026 and now steers new integrations there; Metronome is the credible upgrade path once metering gets complex, not a day-one need.)
- **openmeterio/openmeter** (Apache-2.0) — self-hosting needs Kafka+ClickHouse+Postgres+Redis+Svix, too heavy; use **OpenMeter Cloud** only, as a pure ingest API.
- **unkeyed/unkey** (AGPL-3.0, "not accepting external PRs") — redundant with what's already built; only worth it as a **hosted** self-serve dashboard, called externally, never self-hosted/forked.

### Verifiable computation for the factor model — stays a someday-idea, not a roadmap item
Every zk/verifiable-compute option checked (circom/snarkjs — GPL-3.0; Noir — self-described "not suitable for production, expect bugs"; o1js — built for on-chain Mina use; EZKL — no clean OSS license visible) requires hand-encoding the model as finite-field arithmetic, and a confidence-score sigmoid is a materially harder circuit than the homomorphic sum `pedersen-ledger.ts` already does. Worth revisiting only as an unwired R&D spike, same posture the crypto package already documents for itself.

### Visual regression — needs nothing new at all
Playwright's built-in `toHaveScreenshot` (uses pixelmatch internally, already installed via `@playwright/test`) covers the entire ~30-route cockpit gap with zero new dependencies or licenses. `Lost Pixel` (the obvious trendy pick) was archived April 2026 when its team joined Figma — confirmed via its own archive banner, a live cautionary example. `Argos CI` (MIT, self-hostable) is the option worth naming only if a browsable cross-deploy diff dashboard is ever wanted beyond CI artifacts.

---

## Round 4 — Design reference: bitemporal memory-repair pattern (2026-09-06)

**Source**: a founder-shared, paid/authored Python build guide, "Build an Agent That
Repairs Its Own Stale Memories" (LangGraph + sqlite-vec + Groq, self-dated verified
2026-09-05). **Not a GitHub repo — no LICENSE to check, no code to import (wrong
language and runtime).** Filed exactly like `pg_bitemporal`/NanoIndex in Round 3:
design-pattern reference only. Verified against real code shown from sections 1-7
(the mental model through the complete storage layer, `config.py`/`clock.py`/
`store.py`) — sections 8-22 (`embed.py`/`recall.py`/`cache.py`/`extract.py`/
`classify.py`/`policy.py`, and critically `repair.py`/`detect.py`/`propose.py`/
`sweep.py`, the actual decision mechanism) were not shared and are **not** reflected
below; do not assume this section covers them.

**Why this matters more than any other reference found so far for this specific gap**:
its core thesis — "a memory is not a row, it is an interval with a belief attached" —
is a complete, working implementation of the exact bitemporal model GSE's own
`Entity`/`EntityEdge`/`Signal` Prisma tables were already designed around (Round 2,
via grounding `getzep/graphiti`) but have zero application-code consumers for. This
supersedes NanoIndex as the primary citation for `claim-consistency-check.ts`.

**Concrete, portable rules** (verified against real code, not the table of contents):
1. **Three time axes, not two**: valid-time (`valid_from`/`valid_to`), transaction-time
   (`recorded_at`/`expired_at`), and a third — evidence-time (`last_verified_at`,
   distinct from `recorded_at`). Rule: measure staleness age from *last verified*, not
   *first recorded*, or long-standing, repeatedly-reconfirmed facts get penalized
   backwards. **Direct open question to check before wiring up `Signal.capturedAt`**:
   is it meant to update on every re-confirmation, or does it freeze at first capture?
2. **Four-state lifecycle** (born / replaced / ages / ends) collapsed to three
   filterable integers (2=believed+fresh, 1=believed+flagged, 0=not believed), so
   "is this live" is one comparison. Deletion is deliberately never one of the four
   operations — nothing is physically removed except by a separate, clearly-labeled
   function nothing in the main path calls.
3. **Asymmetric confidence by destructiveness**: retiring/superseding a claim needs a
   high bar (0.80); adding a new candidate needs a lower one (0.60). A contradiction on
   a "stable"-category fact always parks for human review regardless of confidence,
   since it's more likely an extraction error than a real change.
4. **One staleness threshold, shared by both the read-time display and the background
   sweep** — never two independently-tuned definitions of "stale." The author's own
   documented failure: starting at 0.7 made every freshly-seeded fact render "may be
   out of date" while the sweep reported nothing wrong — two subsystems visibly
   contradicting each other in front of a user.
5. **Per-category half-life** (stable/slow/fast/scheduled) instead of one global decay
   rate.
6. **An append-only decision-audit table**: every change writes exactly one row
   (before/after state, evidence, reason, confidence, `decided_by: agent|human|oracle`,
   `routed: auto|parked|forced`, `status: parked|applied|rejected`, never rewritten
   except that one status transition). **The human-review queue is a SQL VIEW over
   this table, not a second materialized copy** — specifically so the queue can never
   drift out of sync with the log it's derived from. Worth checking whether Airwave's
   own review queue currently materializes a duplicate.
7. **A six-way taxonomy for why a repair was proposed**: `arrival | aged |
   source_changed | contradiction | scheduled | human` — richer than a binary
   stale/not-stale flag.
8. **The single sharpest principle in the whole guide**: any denormalized copy of a
   claim's status (a search/vector index, a cache, a secondary read path) must update
   atomically with the source of truth, in the same write function, never as a
   deferred second step — otherwise the system can "confidently state a stale
   memory," the exact failure class the design exists to prevent. Generalizes to
   anywhere GSE denormalizes `operator_status`.
9. **Sources store a full content snapshot + hash, not just a pointer** — detecting
   that an upstream document changed requires remembering what it used to say. Possible
   overlap with the clearance-engine's existing point-in-time `RightsSnapshot`.
10. **An injected clock**, one module owns "now," everything else takes a clock
    parameter — matches GSE's own Workflow-script convention (no `Date.now()`/
    `new Date()`) for the same determinism reason. The clock refuses to move
    backwards: superseding a fact writes "this stopped being true when that started,"
    and a backwards clock could produce an interval with negative length.

**Where this plugs into GSE, concretely**:
- `packages/db/prisma/schema.prisma` `Entity`/`EntityEdge`/`Signal` — the exact tables
  this pattern targets; resolve the `capturedAt` semantics question (rule 1) before
  wiring a producer/consumer.
- A new `apps/web/lib/airwave/claim-consistency-check.ts` (proposed in Round 2 off
  NanoIndex) — this guide is now the stronger reference: reuse rules 3, 4, and 7
  specifically.
- `apps/web/lib/jarvis/memory/write-gate.ts` — already implements rule 8's "single
  writer enforces every rule" philosophy; the append-only `repairs` table (rule 6) is
  a legitimate schema reference if its own audit trail ever needs strengthening.
- Airwave's review queue (cockpit) — check against rule 6's "view, never a second
  table" for a concrete, low-effort correctness check.
- **A silent-decay sweep** — the one piece with no existing GSE analogue at all:
  nothing today re-evaluates `Entity`/`Signal` freshness with no new claim arriving.
  Unlike almost everything else in this whole three-round audit, this is a new Vercel
  Cron route against tables that already exist — **no new dependency, no founder
  approval needed** — once Airwave has live data to sweep.
