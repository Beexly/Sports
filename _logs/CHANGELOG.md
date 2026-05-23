# Changelog

Append-only. One line per cycle.

2026-05-23 · #1 · feat(content): migrate Claude blog generator to official @anthropic-ai/sdk · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #2 · feat(content): add Claude semantic draft reviewer for trust-claim paraphrases · vitest `apps/web/__tests__/draft-reviewer.test.ts`
2026-05-23 · #3 · feat(cockpit): expose draft reviewer at POST /api/cockpit/review-draft · vitest `apps/web/__tests__/cockpit-review-draft-api.test.ts`
2026-05-23 · #4 · feat(content): pair generator with reviewer via generateAndReviewBlogPost wrapper · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #5 · feat(prediction-engine): add extractPickSources for top-level sources[] aggregation · vitest `packages/prediction-engine/src/__tests__/pick-sources.test.ts`
2026-05-23 · #6 · feat(content): cite pick sources in generated blog posts · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #7 · chore(scripts): migrate operator scripts to @anthropic-ai/sdk · vitest `apps/web/__tests__/operator-scripts-sdk.test.ts`
2026-05-23 · #8 · feat(content): parameterize blog generator on content kind (DAILY_PICKS / WEEKLY_RECAP) · vitest `apps/web/__tests__/content-generator.test.ts`
2026-05-23 · #9 · feat(brief): add Claude composeSlateOverview as first restored slice of the brief composer · vitest `apps/web/__tests__/slate-overview.test.ts`
