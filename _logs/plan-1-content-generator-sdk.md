# Plan — Cycle 1 · feat(content): migrate generator to official Anthropic SDK

## Goal
Replace raw `fetch` in `content-generator.ts` with the official `@anthropic-ai/sdk` so we get SDK-built retries, timeouts, typed errors, and schema-validated JSON output — satisfying Hard Rule §6.

## Files to touch
1. `apps/web/package.json` — add `@anthropic-ai/sdk` dep
2. `apps/web/lib/content-generator.ts` — full rewrite around `Anthropic` client
3. `apps/web/__tests__/content-generator.test.ts` — NEW; mock the SDK, verify parsing + error paths
4. `_logs/CHANGELOG.md` — append entry
5. `_logs/DECISIONS.md` — append decision (SDK migration, model unchanged)

## Schema changes
None. No DB touch.

## Specific changes
- **Client**: singleton `Anthropic` instance with `maxRetries: 3` (SDK default is 2; bumping per Hard Rule §6 "retry logic")
- **Model**: keep `claude-sonnet-4-6`. Existing deliberate choice — not downgrading or upgrading without operator say-so
- **Output**: switch from regex `\{[\s\S]*\}` JSON extraction to `output_config.format` with a `json_schema` — this guarantees parseable JSON and removes a real failure mode
- **System prompt**: kept verbatim (~700 chars, below the ~2K threshold where caching becomes required per Hard Rule §6)
- **Errors**: catch `Anthropic.APIError` subclasses; preserve the existing thrown-Error contract for callers
- **API key check**: keep the explicit "ANTHROPIC_API_KEY is not configured" message at first call (lazy init)

## Test plan
- Vitest spec mocking `@anthropic-ai/sdk` Anthropic class:
  - Happy path: SDK returns valid JSON → parsed `GeneratedContent` with correct slug, title, content, tags
  - Missing API key throws "ANTHROPIC_API_KEY is not configured"
  - SDK returns no text block → throws "No text content in Claude response"
  - SDK throws `Anthropic.APIError` → wrapped, surfaced to caller
- Re-run full suite: `npm test` (expect 1578+1 passing)
- `npm run typecheck` green
- `npm run lint` green

## Rollback plan
- Single commit; `git revert HEAD` restores prior raw-fetch implementation
- No DB writes, no env-var renames — purely an internal swap
- Callers (`workers/content-publishing` is the only consumer concept, currently idle) see same public function signature

## Cookbook reference
- Skill-loaded `claude-api` skill (TypeScript section, "Output Requirement" + "Common Pitfalls") drove this design.
- TypeScript SDK examples at `/home/user/anthropic-sdks-reference/anthropic-sdk-typescript-main/examples/structured-outputs.ts` and `examples/basic.ts` validated the call shape.

## Commit message
`feat(content): migrate Claude blog generator to official @anthropic-ai/sdk`

Body:
- Replace raw fetch with Anthropic client (SDK-managed retries, timeouts, typed errors)
- Add output_config json_schema; remove fragile regex JSON extraction
- Add vitest spec for content-generator (happy path + error paths)
- Closes Hard Rule §6 (retries/timeouts/structured error handling)
