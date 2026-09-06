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

---

## Round 5 — Deep code dives: re-verifying Round 1-2 at the implementation level (2026-09-06)

**Why this round exists**: Rounds 1-2 evaluated these eleven repos from README/package.json/
license/commit-history level — real verification, but not implementation-level. Founder
instruction was explicit: go back through the second wave "to ensure maximum value,
maximum leverage and understanding." Each repo below was **cloned fresh and read at the
source-file level** (exact files and line numbers cited throughout) by a dedicated deep-dive
pass. Several Round 1-2 claims are corrected below, not just deepened — treat this section as
superseding the corresponding Round 1/2 row wherever the two disagree; the earlier rows are
left as-written for the historical record rather than edited in place, per this doc's own
pattern in Round 3/4.

**ast-grep** (the twelfth repo in this wave) was still running its deep-dive at the time this
round was written and will be appended as an addendum when it completes — do not treat this
round as covering all twelve yet.

### 1. `microsoft/playwright-mcp` — corrects the Round 1 entry

**Wrong repo location in Round 1**: the `playwright-mcp` repo itself is a thin publish
shim (`cli.js`/`index.js` two-liners); the real ~90 `browser_*` tool handlers, browser-context
management, and the extension all live in the `microsoft/playwright` monorepo under
`packages/playwright-core/src/tools/**` and `packages/extension/**`. Anyone auditing the
named repo alone cannot see the actual implementation.

**Corrected/deepened findings**:
- **Three attach modes, not two.** Round 1 named persistent-profile and `--extension`.
  There's also **`--cdp-endpoint`** (raw Chrome DevTools Protocol, `browserFactory.ts`) — no
  extension install needed, but CDP has **no built-in authentication**: whoever reaches that
  port gets full, ungated browser control. Keep this off anything but localhost.
- **The `--extension` token-bypass mode does not grab the founder's pre-existing tab** — it
  opens a fresh blank tab in that profile and skips the extension's own big red consent
  warning ("exposes the entire browser… signed-in sessions, cookies… other tabs"). Only the
  no-token, human-clicks-a-tab-in-the-picker mode matches the "connects to the founder's
  already-open tab" framing.
- **The one feature Round 1 missed that matters most for this exact use case**: `--secrets
  <dotenv-file>` / `lookupSecret()` (`backend/context.ts`) lets a tool call reference a
  **credential by name**, resolved to the real value server-side and masked in every
  response/codegen echo — the actual mechanism for "the agent clears a login without the
  password ever entering the model's context window."
- **Real risk to flag to the founder**: `browser_run_code_unsafe` (arbitrary JS in the
  Playwright server process, its own description says "RCE-equivalent") ships **on by
  default**, not behind any `--caps` opt-in. Fine for an interactive, human-approves-every-
  tool-call session; a hazard if this server is ever wired into a less-supervised loop.
- `@playwright/mcp`'s `playwright-core` dependency is a **rolling alpha prerelease**
  (`1.63.0-alpha-2026-08-31`, rolled every 2-4 weeks) — same family as, but not literally the
  same pin as, GSE's own stable `@playwright/test` — behavior can shift week to week.

**Founder action, unchanged from Round 1**: add to `.mcp.json` as before; no new finding
here blocks or reverses that recommendation, it only sharpens what to expect and what to
watch (`browser_run_code_unsafe`, the CDP-endpoint mode's lack of auth).

### 2a. `browserbase/stagehand` — new finding, not previously deep-dived

Not a Round 1/2 repo by name, but surfaced as an alternative for the same 2FA/console use
case; dived alongside playwright-mcp for a fair comparison.

- **"Playwright-based" is now false.** Stagehand v4 (current) has **zero Playwright
  dependency** — it drives Chromium directly over CDP through an in-house engine
  (`packages/extension/understudy/*`); the project's own migration doc says so explicitly.
- **Context persistence (cookie/session reuse across runs) is real and simple** —
  `browserSettings.context.{id, persist}`, two fields, genuinely as advertised.
- **"Solve 2FA once" is not a shipped template.** No MFA-specific code exists anywhere in
  the repo (exhaustive grep, zero hits). Getting a human through the *first* 2FA challenge
  requires Browserbase's **Live View**, a separate platform feature reached through a
  different SDK (`@browserbasehq/sdk`) with no glue code in this repo connecting it to
  Stagehand's `act()`/`observe()`. GSE would be building that handoff, not reusing it.
- **Secret-safety mechanism is real and load-bearing**: `%variableName%` placeholders in
  `act()` calls are substituted client-side after the LLM response returns — a password
  never reaches the model's prompt/completion. Worth the same recognition Round 1 gave
  playwright-mcp's `--secrets` flag.
- **Trust-boundary note for rule 4 (no secrets in code)**: in local/BYO-key mode, the LLM
  API key is shipped into a Chrome-extension JS context, not kept in GSE's own Node process
  — a different boundary than "only `process.env` on the server sees it."

**Net verdict**: keep playwright-mcp as the primary pick for the founder's console-2FA
workflow (persistent profile, well-documented consent model, no separate paid platform
needed); file Stagehand as a reference for its secret-substitution pattern only.

### 2b. `langfuse/langfuse` and `Helicone/helicone` — corrects the Round 2 entry

**`langfuse/langfuse` is the wrong repo to clone for the SDK.** It's the hosted-app
monorepo (dashboard, worker, Postgres/ClickHouse). The importable SDK is a **separate repo,
`langfuse/langfuse-js`**, and it's had a full architectural rewrite (v5): every Langfuse
concept is now an **OpenTelemetry span** with `langfuse.*` attributes, exported via
`@langfuse/otel`'s `LangfuseSpanProcessor` (a thin wrapper over stock OTel
`BatchSpanProcessor`/`SimpleSpanProcessor`) — not the older bespoke `new Langfuse()` client
most tutorials and the unscoped `langfuse` npm package still describe (that package is
explicitly legacy per the SDK's own README).

- **No Anthropic/Claude auto-instrumentation exists.** The only auto-wrapped provider is
  OpenAI (`@langfuse/openai`'s `observeOpenAI()`). Integrating Claude means hand-wrapping the
  call with `startObservation(name, attrs, {asType: "generation"})` inside
  `apps/web/lib/claude-api/provider-dispatch.ts` (the real network-call site — `model-
  router.ts` only picks a model id string, it has nothing to instrument).
- **"Fire-and-forget/non-blocking" is true but incomplete for Vercel serverless.**
  `onEnd()` never awaits the export, so a span doesn't block the calling code — but on a
  function that freezes right after responding, an in-flight export can simply never
  complete, silently dropping traces. The SDK's own recommended serverless fix
  (`exportMode: "immediate"` + `await forceFlush()` before the route returns) trades that
  data-loss risk for up to the 5s `LANGFUSE_TIMEOUT` of added tail latency — pick one, there
  is no free option on Vercel.
- **Redaction is real, MIT-licensed, and two-layered**: a global `mask` function scrubs six
  attribute keys on every span (fails closed — replaces with a placeholder rather than
  leaking on a throw), and `captureInput`/`captureOutput: false` on the `observe()` wrapper
  omits content entirely. Cleanest fit for GSE: hand-construct the span attrs with only
  `model`/`usageDetails`/`costDetails`/non-sensitive `metadata` — never attach the actual
  pick copy.
- **Hallucination-detection ("Scores") is the wrong tool for `numeric-guard.ts`'s job** —
  Langfuse's built-in evaluator is an *additional LLM call* judging plausibility 0-1; `numeric-
  guard.ts` is a deterministic, zero-I/O exact-match check against a structured ground-truth
  set. Real, non-duplicative value instead: feed `numeric-guard.ts`'s own pass/fail into a
  Langfuse `Score` so grounding-failure rate becomes a queryable time series next to cost/
  model-tier/cache-hit — Langfuse as sink-and-dashboard for a guard GSE already owns, not a
  replacement for the guard.

**`Helicone/helicone`: the "just swap the base URL" framing has a real, Helicone-documented
gap.** Streaming and tool-use pass through untouched (verified in code); the one true gap is
narrow — the Worker's own log reconstruction of *extended-thinking* streamed content drops
thinking-block text (usage/cost accounting is unaffected, this only degrades Helicone's own
dashboard replay). The bigger finding: **Helicone's own docs table Proxy mode as "not on
critical path: ❌"** — a Cloudflare/DNS/Worker outage on Helicone's side fails GSE's live
Claude calls outright, with no fallback to `api.anthropic.com`. Since content generation
already runs through GSE's own `apps/web/lib/claude-api/*` gateway, the safer integration is
Helicone's **Async** logging mode (call Anthropic directly, log after the fact) rather than
rerouting the base URL — Helicone's own stated tradeoff, not this audit's opinion.

**Revised founder action (supersedes Round 1/2 item 2)**: Langfuse integration point is
`provider-dispatch.ts`, package is `@langfuse/otel` + `@langfuse/tracing` (not `langfuse`),
and a Vercel-specific flush decision is required up front. Helicone should be adopted in
Async mode, not by rerouting the base URL.

### 3. `doobidoo/mcp-memory-service` and `mem0ai/mem0` — corrects the Round 2 entry

Round 2's CVE caveat ("only in optional multi-user server mode") holds for both **with one
correction**: mem0's pickle-deserialization CVE (`SafeUnpickler` fix in `vector_stores/
faiss.py`) is in the **core library's FAISS backend**, not server-specific — it just happens
to be irrelevant to GSE because GSE would use the pgvector adapter, not FAISS.

**`mcp-memory-service`, out of the box, is a flat vector store, not "AI agent memory" in the
rich sense.** `retrieve_memory` is pure top-k cosine ANN search with no recency boost or
decay by default. A materially richer subsystem *does* exist in the codebase — temporal
intervals, asymmetric belief-confidence, quarantine for contradicted claims — genuinely
close to the "interval with a belief attached" caliber cited in Round 4's tutorial reference.
But it sits behind **five separate env flags that all default false**, and its contradiction
classifier is, today, **regex/keyword heuristics, not a real NLI model** (the code's own
comment: "this PR delivers the heuristic-only phase"). Piping `AGENT_LEDGER.md`-style facts
into it with defaults would not solve the stale-fact problem, only relocate it — retrieval
still returns superseded rows unless an agent explicitly checks a `conflict:unresolved` tag
and calls `resolve_conflict()`, the same "did you re-read before you write" discipline
AGENTS.md's ledger rule already requires. Turning the opt-in machinery on carelessly is a
real risk in the other direction: its mutability classifier would likely flag most ledger
rows as `"volatile"` (full of dates, "currently," "active," port numbers) and could
auto-supersede real history.

**`mem0ai/mem0` is now a harder "no" than Round 2's schema caveat implied — it's a
governance disqualifier, not just a migration cost.** Every mutating call (`add()`,
`update()`, `delete()`) commits synchronously inside the call — there is no hook, dry-run,
or pending state anywhere in the write path. The "smart conflict resolution" description
that shows up in older docs/blog posts describes a prompt (`get_update_memory_messages`)
that **still exists in source but is dead code** — the current pipeline (`ADDITIVE_EXTRACTION_
PROMPT`) is purely additive: on a stated contradiction, mem0's own docs say it "does not
silently rewrite the old fact," it just adds the new one alongside it. Usable for GSE only
as a headless retrieval/pgvector-plumbing layer sitting *behind* GSE's own `write-gate.ts`,
calling `mem0.add(..., infer=False)` (or the vector store directly) to persist an
already-approved fact — never `infer=True` in any automated path. Separately, its
change-history/audit table is hard-coded to local SQLite (`~/.mem0/history.db`), which is not
Postgres-pluggable and would not durably survive Vercel's serverless cold starts even if the
memory content itself lived in Neon.

**Revised founder action**: if agent memory is pursued at all, `mcp-memory-service` (local,
per-developer, stdio, defaults left off) is the lower-risk pick of the two; `mem0` is
usable only as retrieval plumbing behind a gate GSE would have to write itself either way,
which narrows its advantage over building directly on Neon's pgvector.

### 4. `oramasearch/orama` and `Stevenic/vectra` — corrects the Round 2 entry

**Orama's "sub-2KB" tagline is false for real usage** — measured directly (esbuild bundle
of the actual cloned source): the full public API is 76.7KB minified/25.5KB gzip; even
tree-shaken to just create+insert+search+save+load it's still 63.3KB minified/22.2KB gzip,
roughly 11x the tagline. Not disqualifying, just don't repeat the "2KB" number as fact.

**"Essentially no infra downside" (Round 2's framing) holds only for small, static
corpora.** Persistence is a full graph re-serialization, not an mmap-style snapshot — every
`save()`/`load()` walks and rebuilds the entire tree structure regardless of storage format
(JSON/msgpack/binary all funnel into the same rebuild). Measured directly against the real
cloned source: at 1,000 docs, cold-restore is ~100ms total (trivial); at 25,000 docs, it's
~2.6s and a 175MB snapshot. **Vector search has no ANN index at all — it's exact brute-force
cosine with no early termination**, confirmed by grep (no HNSW/IVF/LSH anywhere in the repo).
Round 2 lumped five GSE search needs (docs/ops, docs/revenue, GSN editorial precedent, a
future Airwave claims search, partner/pricing terms) into one recommendation; they don't
have the same shape. The three small, static-corpus needs are genuinely close to "no infra
downside" — build the index once at module scope, let a warm Vercel container reuse it.
**GSN editorial-precedent search and a future Airwave claims search are semantic/vector-
shaped and will grow** — for those, Orama needs GSE to build a scheduled-rebuild +
versioned-snapshot (Blob/Neon) + warm-cache layer itself (nothing in Orama's plugin ecosystem
does this), and past low-thousands of embedded rows, Neon's own native pgvector — already in
GSE's stack, real SQL, real transactions, zero new dependency — is the more honest fit than
Orama's unbounded brute-force vector scan.

**Cut `Stevenic/vectra` — a concrete, source-confirmed concurrency hazard, not just "less
durable."** Round 2 framed it as "wins if you want Postgres-backed durability." That's a
false dichotomy: Vectra's storage interface is genuinely portable (a clean 9-method
`FileStorage` contract, a real SQLite sample adapter), but a Postgres/Neon adapter built
against it would still be a **whole-index read-modify-write on every single insert/update**
— one Postgres row holding a JSON/protobuf blob, not real per-vector rows. Worse: `LocalIndex`
has **no cross-process concurrency control at all** (grepped for mutex/lock/semaphore —
nothing); two concurrent writers (two Vercel invocations, a cron racing an admin action)
silently last-writer-wins, discarding the other's insert. The maintainer's own answer is a
new always-on gRPC server — incompatible with Vercel's serverless model. Commit history also
shows a bursty, largely-solo pattern (one contributor wrote 66% of all commits; the entire
gRPC/CLI/multi-language layer landed in a single day, 2026-04-02, alongside the repo's own
AI-agent-instruction scaffolding files) and a 14-month-unanswered "production-readiness" RFC
from an open issue. If durable, concurrent-safe vector storage is genuinely wanted, Neon's
native pgvector dominates a hand-built Vectra-Postgres adapter on every axis.

**Revised founder action (supersedes Round 2 item 4)**: approve `@orama/orama` for the three
small static-corpus needs only, as before. Drop Vectra from consideration entirely; for
GSN-precedent/Airwave-claims semantic search, plan on Neon pgvector + a scheduled
snapshot/warm-cache layer, not either JS library, once those corpora exist.

### 5. `hettie-d/pg_bitemporal` and `topoteretes/cognee` — corrects the Round 2 entry

**pg_bitemporal's mechanism was mis-described in Round 2** ("triggers maintain bitemporal
history"). The real design is a **shadow-table-per-source-table pattern**: a parallel
`<schema>_bitemporal.<table>` carries two independent `tstzrange` axes (`effective` ×
`asserted`), fenced by a GiST `EXCLUDE` constraint that makes overlapping combinations
structurally unrepresentable. Triggers exist only as thin generated dispatchers that call
one of a handful of hand-written PL/pgSQL API functions (`ll_bitemporal_insert/update/
correction/inactivate/delete`) — the temporal logic lives in those functions, not the
triggers. **Atomicity is inherited for free**: the whole close-old/insert-history/insert-new/
update-new sequence runs inside one PL/pgSQL function body with no internal commit points, so
an exception at any step rolls back everything already done. **A real gap, not visible from
commit/contributor counts**: nothing stops a caller from bypassing the API with a raw `UPDATE`
directly on the shadow table — the immutability guarantee is convention, not a technical lock
(no `REVOKE`, no protective `BEFORE` trigger).

**Portability to GSE's own `Entity`/`EntityEdge` is real but not drop-in.** GSE's schema
(`packages/db/prisma/schema.prisma`) is **single-axis** (`valid_from`/`valid_to` only, no
`asserted`/audit axis, no exclusion constraint) — materially thinner than pg_bitemporal's
two-axis model. The portable primitives (the `tstzrange`-based `timeperiod` domain, the
Allen's-interval-algebra helper functions, the GiST-exclusion technique, `btree_gist` which
Neon already supports) paste into a Prisma raw-SQL migration close to verbatim. The
generator/API-function layer does not: it's built for a single-serial-int-key,
single-string-business-key table, while `EntityEdge` has a compound key
(`from_entity_id, relation, to_entity_id, observed_at`) and a `cuid()` string PK — adopting
this pattern means writing GSE-specific versions of the API functions following pg_bitemporal's
proven statement sequence, not executing its files against GSE's tables.

**`cognee` deep dive confirms Round 2's "skip," for a sharper reason.** The "Postgres graph
store is a demo feature" warning is real but narrower than it reads: **only the Postgres
graph-query surface (Cypher-equivalent expressiveness) is gated**; PGVector, Postgres
relational metadata, and the typed-method graph adapter itself are fully open (Apache-2.0,
no license check in code) and functionally complete. The actual reason to skip is different
from licensing: cognee solves an "unstructured document corpus → LLM-extracted entity graph
→ RAG" problem GSE doesn't have (GSE's content generation is already structured, data-backed
copy from the prediction engine, not document-graph retrieval), its free components aren't
independently extractable (the chunker is wired into cognee's own relational ORM, no
pip-installable sub-package), and it's a Python package against a TypeScript app regardless
of any of the above.

**Revised founder action**: no change to the "reference only" verdict for pg_bitemporal or
the "skip" verdict for cognee — both now rest on verified mechanism-level reasoning rather
than README framing.

### 6. `typescript-language-server` — corrects the Round 2 entry

Round 2 treated the LSP↔MCP bridge as "not attempted blind" without sizing the actual gap.
Deep-dive verdict: **it's a translatable, boundable engineering task (~300-600 lines, low
multi-day), not a binary blocker** — `typescript-language-server` itself already reuses
`vscode-jsonrpc` for LSP-side `Content-Length` framing (so a bridge can reuse the same
library rather than hand-rolling it), and its own tsserver-facing code
(`tsServer/serverProcess.ts`) is a worked example of what hand-rolling that framing costs
(~100-150 lines with edge cases) if it weren't reused.

**The real, previously-unflagged risk is silent under-reporting, not a hard failure.**
`references()`/`prepareCallHierarchy()` both return `[]`/`null` with no error if a file was
never explicitly `didOpen`'d — and a live GitHub issue (#945) shows exactly a minimal
programmatic LSP client hitting this: same-file references worked, cross-file references
silently vanished. Separately, tsserver loads one `tsconfig.json`-scoped "project" at a time,
sequentially (`ServerInitializingIndicator`'s own code comment) — an early query against a
package whose project hasn't finished loading returns incomplete results, not an error.
**GSE's own shape (24 `tsconfig.json` files, one per package, no root project, no
`"references"` arrays) matches exactly the monorepo pattern in an unresolved upstream issue
(#495, "wrong tsconfig used in monorepo")** — this is a documented, repo-shape-specific risk,
not a hypothetical one. A minimally "just relay JSON-RPC" bridge would produce
confidently-wrong, silently-incomplete answers on a fair fraction of queries against this
repo specifically, unless it explicitly handles document-open-before-query and waits out
tsserver's sequential per-package project loading.

**Revised founder action (supersedes Round 2 item 6's framing)**: this is a real, scoped,
buildable backlog item (~300-600 lines, days not weeks) — the blocker was never the wire
protocol, it's building the document-open + project-load-wait logic correctly so results are
loud-failure-or-correct rather than silently incomplete on this exact 23-package repo shape.

---

**Addendum — `@ast-grep/cli` deep dive: stalled, not completed.** The background pass hung
for ~2h50m with zero progress after its first step — `npx --yes @ast-grep/cli@latest
--version`, an npm-registry install of an uncached package — never returned in this sandbox
(likely the outbound-network proxy environment, not the tool itself). Stopped rather than left
running indefinitely. Round 2's original finding stands undisturbed: `@ast-grep/cli` (MIT)
needs one `allowScripts` line (its postinstall only selects a prebuilt binary via
`optionalDependencies`, the same precedented pattern already approved for `esbuild`) then
`npm install @ast-grep/cli` — still **BLOCKED — new dependency**, still not source-verified
at the implementation level the way the other eleven repos in this round were. Re-attempting
the deep dive in an environment with reliable npm-registry access (or by cloning the source
directly instead of installing the CLI) is the honest next step, not a re-run here.
