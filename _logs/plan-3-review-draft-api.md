# Plan — Cycle 3 · feat(cockpit): expose draft-reviewer via admin-gated POST API

## Goal
Wire the Cycle 2 reviewer module into a real cockpit entrypoint. Without an entrypoint, the library is dead code. Adds `POST /api/cockpit/review-draft` so operators (or future cockpit UI) can submit a draft and receive findings + verdict.

## Files to touch
1. `apps/web/app/api/cockpit/review-draft/route.ts` — NEW; POST route handler
2. `apps/web/__tests__/cockpit-review-draft-api.test.ts` — NEW; source-level invariant tests (matches existing `cockpit-jarvis-api.test.ts` style)
3. `_logs/CHANGELOG.md` — append entry

## Design

### Route contract
```
POST /api/cockpit/review-draft
  body: { content: string; context?: string }
  → 403 { error } if not admin (matches cockpit-tasks/jarvis convention)
  → 400 { error } if content missing / empty / > 12000 chars
  → 200 DraftReviewReport on success
  → 500 { error } on reviewer error (no internal leak)
```

### Invariants (enforced by source-level test, matches existing `cockpit-jarvis-api.test.ts`)
- `export const dynamic = "force-dynamic"`
- Imports `auth` from `@/lib/auth`
- Rejects non-ADMIN with 403
- Calls `reviewDraft` from `@/lib/content/draft-reviewer`
- Sources banned list from `getBannedPhraseList()` in `@/lib/trust-claims` (single source of truth)
- No `db.*.create/update/delete/upsert` — read-only side effect (Claude call) only
- No GET / PUT / PATCH / DELETE exports — POST only
- No "guaranteed" / "auto-publish" / "auto-bet" hype words
- Cache-Control: `no-store` (reviews are per-draft, never cached)

## Why no functional test (yet)
The existing cockpit API tests are source-level (lint the file for required guards). A real handler test needs NextRequest mocking and the reviewer-mock plumbing — adds complexity for marginal incremental value here, since the reviewer module already has 9 tests covering its happy path + error paths. If/when a real functional integration test for the route lands, it can reuse the reviewer mock.

## Test plan
- Source-level test asserting all invariants above (~10 assertions)
- Re-run full suite: `npm test`
- `npm run typecheck` green
- `npm run lint` green

## Rollback
Single commit; `git revert HEAD` removes the route and test cleanly. No schema, env, or existing-file changes.

## Commit message
`feat(cockpit): expose semantic draft reviewer via admin-gated POST /api/cockpit/review-draft`
