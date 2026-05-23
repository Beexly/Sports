# Plan — Cycle 8 · feat(content): parameterize generator on content kind

## Goal
`generateBlogPost` currently hardcodes one editorial framing — "sports analysis blog post for [sport] picks on [date]". The content-engine workflow defines 8 distinct content kinds. This cycle adds a single new kind — WEEKLY_RECAP — alongside the existing DAILY_PICKS, proving the prompt is parameterizable without taking on the full 8-kind matrix in one cycle. The other 6 kinds (METHODOLOGY_EDUCATION, MATCHUP_PREVIEW, etc.) can land in follow-on cycles using the same shape.

## Files to touch
1. `packages/types/src/index.ts` — add `kind?: BlogPostKind` to `ContentGenerationInput`, define `BlogPostKind = "DAILY_PICKS" | "WEEKLY_RECAP"`
2. `apps/web/lib/content-generator.ts` — switch on `kind` to pick the user-prompt framing; existing default is "DAILY_PICKS"
3. `apps/web/__tests__/content-generator.test.ts` — add a spec for the WEEKLY_RECAP path (asserts prompt framing)
4. `_logs/CHANGELOG.md` — append entry

## Design

### Type addition (additive, backward-compatible)
```ts
export type BlogPostKind = "DAILY_PICKS" | "WEEKLY_RECAP";

export interface ContentGenerationInput {
  date: string;
  sport: string;
  picks: Array<{...}>;
  sources?: readonly string[];
  kind?: BlogPostKind;  // NEW; defaults to "DAILY_PICKS"
}
```

### Generator behavior
A small map from `kind` to its framing string:
```ts
const KIND_FRAMING: Record<BlogPostKind, (sport, dateDisplay) => string> = {
  DAILY_PICKS: (sport, date) =>
    `Write a sports analysis blog post for ${sport} picks on ${date}.`,
  WEEKLY_RECAP: (sport, date) =>
    `Write a weekly recap of ${sport} picks covering the period ending ${date}. ` +
    `Each pick below is provided with its reasoning at prediction time. ` +
    `Frame the post as a look back at how the slate was called, not a forward-looking preview.`,
};
```

The picks block, sources block, JSON schema, and disclaimer are unchanged. Only the framing line + the "Title" hint shift.

### Why no separate `outcomes` field yet
WEEKLY_RECAP could eventually carry settled results per pick. Adding that field today couples the type to a non-existent caller. The MVP framing simply tells Claude "this is a recap" and feeds the same picks shape. When a real caller needs to attach outcomes, extending the type later is additive.

### Why no separate JSON schema per kind
Same `POST_SCHEMA` (title / excerpt / content / seoTitle / seoDescription / tags). All blog kinds share this output shape; the editorial difference is upstream in the prompt, not in the response.

## Test plan
- Existing 11 generator specs still pass (kind defaults to DAILY_PICKS, prompt unchanged)
- New spec: kind=WEEKLY_RECAP → mock client sees a user prompt with "weekly recap" framing, NOT "sports analysis blog post for ... picks on"
- Full suite + typecheck + lint green

## Rollback
Single commit. Revert removes the type field + the framing map; existing callers pass nothing, see DAILY_PICKS shape.

## Commit message
`feat(content): parameterize blog generator on content kind (DAILY_PICKS / WEEKLY_RECAP)`
