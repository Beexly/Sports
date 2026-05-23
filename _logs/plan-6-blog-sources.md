# Plan — Cycle 6 · feat(content): cite pick sources in generated blog posts

## Goal
Cycle 5 added `extractPickSources(pick) → string[]`. Cycle 1 generates blog posts but never references the underlying sources. Master prompt Track 1 says "reasoning cites actual stats, not vibes." This cycle pipes the source list through the generator so each generated post ends with "Sources: …" — provenance the operator can verify.

## Files to touch
1. `packages/types/src/index.ts` — add optional `sources?: readonly string[]` to `ContentGenerationInput`
2. `apps/web/lib/content-generator.ts` — emit a SOURCES block in the user prompt when sources are provided; instruct Claude to surface them at the post's end
3. `apps/web/__tests__/content-generator.test.ts` — two new specs (with sources / without sources prompt shape)
4. `_logs/CHANGELOG.md` — append entry

## Design

### Type change (backward-compatible, additive)
```ts
export interface ContentGenerationInput {
  date: string;
  sport: string;
  picks: Array<{...}>;
  sources?: readonly string[];  // NEW — optional
}
```

### Generator behavior
- If `input.sources?.length > 0`: inject a "SOURCES BACKING THIS SLATE" block into the user prompt, instruct Claude to add a `Sources: A, B, C` line right before the disclaimer
- If empty / undefined: prompt unchanged (today's behavior). Backward compatible — existing callers pass nothing and see no change.

### Why not put it in the schema
The post JSON schema already returns `content` as a single string. Citation goes inside that content (rendered together with the analysis). Doesn't deserve a separate `sources` JSON field unless a downstream renderer wants it structured — defer until needed.

### Why this is safe
Sources passed in are real source names extracted from `factorBreakdown.factors[i].evidence.sourceName`. Claude only echoes what we provide. The system prompt rule "ONLY reference the data provided to you" already covers this.

## Test plan
- Existing 8 generator specs still pass (no sources field = same prompt)
- New spec: sources passed → mock client receives a user prompt containing each source
- New spec: empty sources → prompt does NOT contain the SOURCES block
- Full suite + typecheck + lint green

## Rollback
Single commit. Revert restores prior prompt shape; type change is additive so no caller breaks even if the rollback is partial.

## Commit message
`feat(content): cite pick sources in generated blog posts when caller provides them`
