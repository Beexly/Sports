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
