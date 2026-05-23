# Plan — Cycle 7 · chore(scripts): migrate operator scripts to @anthropic-ai/sdk

## Goal
Remove the last raw-fetch Anthropic call sites in the repo. After this cycle, every code path that talks to api.anthropic.com goes through the official SDK (uniform retries, typed errors, no manual `anthropic-version` header). The two affected scripts are operator-facing but `check-deploy-readiness.mjs` runs in CI — flaky ping responses there should retry instead of failing the deploy gate.

## Files to touch
1. `package.json` (root) — declare `@anthropic-ai/sdk` as a root dep (currently lives in `apps/web` and is hoisted; making it explicit is more robust to install reordering)
2. `scripts/check-deploy-readiness.mjs` — replace the Anthropic-ping fetch block with `client.messages.create()`
3. `scripts/rotate-anthropic-key.mjs` — replace the `verifyKey` fetch with `client.messages.create()`. The Admin API list/disable calls **stay** on fetch (the SDK does not surface `/v1/organizations/api_keys`).
4. `apps/web/__tests__/operator-scripts-sdk.test.ts` — NEW; source-level test asserting the migration
5. `_logs/CHANGELOG.md` — append entry

## Design

### Both scripts: use the SDK for verify/ping
```js
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: key });
const message = await client.messages.create({
  model: "claude-haiku-4-5",  // alias, no date suffix
  max_tokens: 4,
  messages: [{ role: "user", content: "ping" }],
});
// message.model, message.usage.input_tokens — typed access
```

### Why drop the `-20251001` date suffix on the model id
Per the `claude-api` skill: "Use only the exact model ID strings from the table above — they are complete as-is. Do not append date suffixes." The current scripts use `claude-haiku-4-5-20251001`; the canonical alias is `claude-haiku-4-5`. The trailing `-20251001` is a valid pinned snapshot but the alias is preferred for verify-pings.

### What stays on fetch
`rotate-anthropic-key.mjs` calls the Admin API (`/v1/organizations/api_keys`). The SDK does not expose admin endpoints. These calls keep their explicit `anthropic-version: 2023-06-01` header (required by the Admin API).

### Error handling
SDK throws `Anthropic.APIError` subclasses on non-2xx. Both scripts already wrap calls in try/catch — they just need to read `err.status` instead of `res.status` for non-throwing branches.

## Test plan
- New source-level test asserting:
  - Neither script contains `fetch("https://api.anthropic.com/v1/messages` (only the Admin API URL survives in rotate)
  - Both scripts import from `@anthropic-ai/sdk`
- Lint, typecheck, full suite stay green
- (Cannot run the scripts against the real API in this container — no key)

## Rollback
Single commit. Revert restores both scripts to fetch.

## Commit message
`chore(scripts): migrate operator scripts to @anthropic-ai/sdk for verify-pings`
