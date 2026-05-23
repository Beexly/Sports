# Plan — Cycle 15 · feat(brief): async brief composer with real sections

## Goal
Item 3 of the queue, first cycle. The existing `composeBrief` returns a stub `ComposedBrief` with hardcoded "being rebuilt" strings. This cycle ships `composeBriefAsync(input)` — an async sibling that returns a real `ComposedBrief` populated via `composeSlateOverview` from Cycle 9. The sync stub stays so existing callers (vitest, public-safety scanner) keep working unchanged.

## Files to touch
1. `apps/web/lib/brief/compose.ts` — add `composeBriefAsync()` alongside the existing sync exports
2. `apps/web/__tests__/brief-compose-async.test.ts` — NEW; mock-SDK specs
3. `_logs/CHANGELOG.md` — append

## Design

### Public surface
```ts
export interface ComposeBriefAsyncInput {
  readonly date: Date | string;
  readonly picks: readonly SlatePickSnippet[];
}

export async function composeBriefAsync(
  input: ComposeBriefAsyncInput
): Promise<ComposedBrief>;
```

### Behavior
- Empty picks → returns the same shape as the sync stub (no Claude call, no spend). `summary` reverts to the stub message; `slateOverview.text` reverts to "Slate overview unavailable…".
- With picks → calls `composeSlateOverview()` once. The returned text fills both:
  - `slateOverview.text`
  - `summary` (verbatim — they're the same surface today; a future cycle can derive the summary separately if they need to diverge)
- `sections` populated with a single `SLATE_OVERVIEW` section (`title: "Tonight's slate"`, body = slate overview text). Future cycles add additional sections (WHAT_CHANGED, PROMOTIONS, MANUAL_REVIEW, CONTENT_IDEAS) when their inputs exist.
- `status` always `"DRAFT"`. `publishedAt` never set.
- `responsibleGamingText` always `BRIEF_RESPONSIBLE_GAMING_NOTE`.

### Why no sync replacement
`composeBrief` is called from server components and tests that don't await. Promoting it to async breaks the contract. The async sibling is the bridge: server actions (Cycle 16 territory) call the async path; existing surfaces stay sync until they migrate.

## Test plan
- Mock `__setClientForTests` on the slate-overview holder; assert:
  - With picks: result.summary === slateOverview text, sections[0] populated, status DRAFT
  - Empty picks: no SDK call, sections empty, fallback strings present
  - status stays DRAFT in both branches
  - responsibleGamingText present in both
- Existing `brief-compose.test.ts` (sync stub) unchanged and still green
- Full sweep + guardrails

## Rollback
Single commit. Removing the async export leaves the sync stub untouched.

## Commit message
`feat(brief): add composeBriefAsync that populates the brief via composeSlateOverview`
