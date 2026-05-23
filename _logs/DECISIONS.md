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

