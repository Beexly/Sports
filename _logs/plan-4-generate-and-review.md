# Plan — Cycle 4 · feat(content): pair blog generator with semantic reviewer

## Goal
A single safe operation that generates a draft AND immediately runs the semantic reviewer against it. Operators always see the verdict and findings before deciding to publish. Existing `generateBlogPost` stays untouched for callers that intentionally want raw generation (e.g. tests, future experiments).

## Files to touch
1. `apps/web/lib/content-generator.ts` — add `generateAndReviewBlogPost` wrapper + `BlogPostWithReview` type
2. `apps/web/__tests__/content-generator.test.ts` — add 4 specs for the wrapper
3. `_logs/CHANGELOG.md` — append entry

## Design

### New public surface
```ts
export interface BlogPostWithReview {
  readonly post: GeneratedContent;
  readonly review: DraftReviewReport;
}

export async function generateAndReviewBlogPost(
  input: ContentGenerationInput
): Promise<BlogPostWithReview>;
```

### Implementation
- Call `generateBlogPost(input)` (Cycle 1 path)
- Build a single reviewable string: `${title}\n\n${excerpt}\n\n${content}\n\n${seoTitle}\n${seoDescription}`. Covers every operator-visible surface area. Tags excluded (they're short labels, not narrative).
- Call `reviewDraft({ content, banned: getBannedPhraseList(), context: "BLOG_POST" })`
- Return both, untouched. Caller decides what to do with verdict:
  - `READY` → safe to surface for operator approval
  - `REVISE` → show findings; operator can edit then re-review
  - `REJECT` → block from operator queue; surface for engineer review

### Why not throw on REJECT
Throwing would tie the wrapper to one policy. Different callers want different behavior (cockpit UI shows findings, batch worker logs and continues, test path inspects the report). Returning the report lets each caller choose.

## Test plan
- Mock both the generator's SDK client AND the reviewer's SDK client (separate fake clients)
- Specs:
  - Happy path → returns post + READY review
  - WARN findings → returns post + REVISE review
  - BLOCK findings → returns post + REJECT review
  - Generator error → propagates (reviewer not called)
- Full suite green: `npm test`
- `npm run typecheck` + `npm run lint` green

## Rollback
Single commit. Revert removes the wrapper + tests; `generateBlogPost` is untouched so no caller is affected.

## Commit message
`feat(content): add generateAndReviewBlogPost that pairs generator with semantic reviewer`
