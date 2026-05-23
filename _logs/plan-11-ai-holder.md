# Plan — Cycle 11 · refactor(ai): extract shared Anthropic client holder

## Goal
Three call sites duplicate the same `singleton + lazy init + maxRetries:3 + test escape` pattern verbatim. A `makeAnthropicHolder()` factory keeps each module's own isolated singleton (so vitest can swap each one independently) while collapsing the boilerplate to one import + one line per module.

## Files to touch
1. `apps/web/lib/ai/client.ts` — NEW; factory + types
2. `apps/web/lib/content-generator.ts` — replace duplicated block
3. `apps/web/lib/content/draft-reviewer.ts` — replace duplicated block
4. `apps/web/lib/brief/slate-overview.ts` — replace duplicated block
5. `apps/web/__tests__/ai-client.test.ts` — NEW; factory specs
6. `_logs/CHANGELOG.md` — append

## Design

```ts
// apps/web/lib/ai/client.ts
import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicHolder {
  /** Lazy-init the singleton; throws if ANTHROPIC_API_KEY is missing. */
  get(): Anthropic;
  /** Vitest escape hatch — swap or clear the singleton. */
  setForTests(client: Anthropic | undefined): void;
}

export function makeAnthropicHolder(): AnthropicHolder { ... }
```

Each caller becomes:
```ts
const { get: getClient, setForTests: __setClientForTests } =
  makeAnthropicHolder();
export { __setClientForTests };
```

Identical public test API (`__setClientForTests`) — zero test file changes required.

## Test plan
- 4 specs for the factory itself: lazy init, missing key throws, escape hatch swap, escape hatch clear
- Existing draft-reviewer / content-generator / slate-overview specs must still pass (they call the same `__setClientForTests` re-exported from each module)
- Full sweep + guardrails

## Rollback
Single commit. Each consumer keeps its own holder so a revert restores the duplicated pattern with no caller change.

## Commit message
`refactor(ai): extract makeAnthropicHolder() factory used by all three Claude call sites`
