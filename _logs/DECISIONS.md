# Decisions

Append-only.

## 2026-05-23 — Adopt the official `@anthropic-ai/sdk` for Claude calls

**Context.** `content-generator.ts` was hitting `api.anthropic.com` via raw `fetch` with no retries, no timeouts, no typed errors, and a regex (`\{[\s\S]*\}`) to pull JSON out of a free-form text response. Master prompt §6 Hard Rules requires "retry logic, timeout, and structured error handling. Use the SDK's built-ins; don't roll your own."

**Decision.** Add `@anthropic-ai/sdk` to `apps/web`, replace the raw fetch with `client.messages.create({ output_config: { format: { type: "json_schema", schema: POST_SCHEMA } } })`. Singleton client with `maxRetries: 3`. Test-only escape hatch (`__setClientForTests`) for vitest mocking.

**Alternatives considered.**
1. Keep fetch, add hand-rolled retry/timeout/error mapping. Rejected — duplicates SDK; brittle; explicitly forbidden by Hard Rule §6.
2. Switch to `client.messages.parse()` with a Zod schema. Defer — adds a Zod dep for one call site and gives marginal value over the SDK-native json_schema path; can revisit if we introduce more structured-output call sites.

**Trade-off.** Adds 1 npm dep (~1MB), but reclaims ~30 lines of fragile parsing code and gains SDK-managed retries on `429` and `5xx`.

**Model untouched.** Kept `claude-sonnet-4-6`. The `claude-api` skill recommends `claude-opus-4-7` by default, but the deliberate existing model choice stands until Garrett (or a future cycle with operator nod) decides otherwise; an opus upgrade would also need a token-cost re-baseline.

## 2026-05-23 — Use Haiku for the draft reviewer (deliberate exception to opus-default)

**Context.** Cycle 2 ships `lib/content/draft-reviewer.ts` — a Claude-powered semantic compliance check on generated drafts. The reviewer task is short, structured (JSON-schema output), latency-sensitive (operator UI), and runs per draft. A flagship-tier model is the wrong tool.

**Decision.** Model = `claude-haiku-4-5`. The `claude-api` skill defaults to `claude-opus-4-7` for new code but explicitly notes Haiku 4.5 is the right pick for "fastest and most cost-effective model for simple tasks" — and semantic-paraphrase detection against a fixed list is exactly that.

**Alternatives considered.**
1. `claude-sonnet-4-6` — would work, but ~3× more expensive per call and slower for no measurable accuracy gain on this task profile.
2. `claude-opus-4-7` — flagship cost on a classification-style task; never the right answer for review-per-draft.

**Trade-off.** Lower task ceiling than Sonnet — if the reviewer ever has to handle multi-thousand-phrase banned lists or multi-page drafts, revisit. Today the bound is 100 phrases × 12k chars; Haiku 4.5 (200k context, 64k output) is far above that.

## 2026-05-23 — Ephemeral prompt caching on draft-reviewer + slate-overview; content-generator left uncached

**Context.** Master prompt Hard Rule §6 mandates prompt caching for any system prompt over ~2K tokens. The audit table in `plan-14-prompt-caching.md` shows all three current Claude call sites have system prompts well under that threshold (100–200 tokens each). This cycle adds caching where it pays despite not being mandatory.

**Decision.**
- `draft-reviewer.ts` — cache the SYSTEM_PROMPT (200 tokens) AND the BANNED_LIST user prefix (~150 tokens). Total ~350 tokens cached per call. Operator iteration loop (review → edit → re-review) is the win: the DRAFT body changes; everything else is stable within the 5-min cache window.
- `slate-overview.ts` — cache the SYSTEM_PROMPT. Small savings today; forward investment for when the brief composer's sections context lands here (queued item 3).
- `content-generator.ts` — **not cached**. System prompt is ~100 tokens; there is no stable user prefix (every blog has different picks data). Cache hit rate would be near zero. Adding caching here is structural noise.

**Alternatives considered.**
1. Cache everything for "consistency" — rejected; the content-generator cache would never hit.
2. Wait until any prompt crosses the 2K threshold — rejected; the reviewer's iteration-loop win is real today, and adding caching infrastructure now means the brief composer (queued) doesn't need a follow-up cycle.

**Trade-off.** Splitting the reviewer's user message into two blocks (`cachedPrefix` + `variableSuffix`) is slightly more code than one templated string. Worth it for the operational savings.

## 2026-05-23 — Rate-limit: ioredis sliding-window, fail-closed, 10/min on credit-burning admin routes

**Context.** No rate-limit infrastructure existed in the repo. Two cockpit routes (`/api/cockpit/review-draft`, `/api/cockpit/brief`) hit Claude per request; an admin with a loop in their iteration could exhaust credits fast. $5 in Console at start of session.

**Decision.**
- Roll our own with `ioredis` (already a root dep, `REDIS_URL` already in `.env.example`). Sliding-window via a single atomic Redis pipeline: `ZREMRANGEBYSCORE` → `ZADD` → `ZCARD` → `PEXPIRE`. MULTI atomicity on the server means no read-then-write race.
- **Fail-closed** on credit-burning routes. Cost asymmetry: a short Redis outage that fails open could exhaust the Anthropic balance. A 503 is recoverable; a $0 balance is not.
- **10/min per user** on both routes. Realistic single-operator iteration is well under 1/min; 10 is human-tier headroom. 30/min would be bot-tier and undermine the safety motive.
- Over-deny on the simultaneous-callers edge case is documented and accepted (safe direction).

**Alternatives considered.**
1. `@upstash/ratelimit` — hardcoded to `@upstash/redis` (REST client). Adopting it means a second Redis client + auth surface for ~40 lines of saved logic. Rejected.
2. In-memory rate-limit — broken on Vercel's serverless model (each cold-start function is its own process). Rejected.
3. Fail-open default — favors uptime over cost. Wrong tradeoff for admin-only credit-burning routes. Rejected.

**Trade-off.** Local dev without `REDIS_URL` set is fail-closed too — operator must set REDIS_URL to use these routes locally. Documented in `.env.example`.

## 2026-05-23 — Per-call Claude telemetry: stdout always + file when not on Vercel

**Context.** Cycle 14 added ephemeral caching; without telemetry we can't validate hit rate. Anthropic returns `usage.cache_creation_input_tokens` + `usage.cache_read_input_tokens` per response.

**Decision.**
- New `apps/web/lib/ai/telemetry.ts` with `withTelemetry({callSite, model}, fn)` higher-order helper. Captures `{ts, callSite, model, inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens, latencyMs, status, errorClass?}`. Error path records `{status:"error", errorClass}` then re-throws — never swallows.
- Always emits structured JSON to stdout (Vercel captures it, so does GitHub Actions).
- **Also** appends to `_logs/claude-usage.log` when `process.env.VERCEL !== "1"` (Vercel filesystem is ephemeral; local + GH Action paths get the queryable file). `*.log` already gitignored, so the file doesn't pollute commits.
- Applied to all four call sites: `content-generator`, `draft-reviewer`, `slate-overview`, and `scripts/draft-nightly-content.mjs` (inline minimal mirror — `.mjs` can't import the TS module).

**Alternatives considered.**
1. New Prisma `ClaudeUsageLog` model + migration — over-investment for MVP. Promote when an operator query surface is actually needed.
2. Wire OpenTelemetry (already in deps, dormant) — too much infrastructure for the first telemetry signal we need. Plain JSON-per-line is grep-friendly today.
3. Inline telemetry at each call site — guaranteed drift in field names + units across 4 sites. Helper is the right shape.

**Trade-off.** Vercel runtime gets stdout only (file-append silently no-ops). Operators querying "cache hit rate this week" must read from Vercel log drain OR the GitHub Action's `_logs/claude-usage.log` (which is the nightly workflow's source of truth).


