---
description: Identify and safely remove dead code — atomic deletions with test verification
---

Find unused exports, dead imports, orphaned files, and duplicate logic. Remove them safely one at a time.

## Detection

Run detection tools appropriate to scope:

```bash
# Find unused exports and imports
npx knip --reporter compact

# Find dead TypeScript exports
npx ts-prune

# Find unused dependencies
npx depcheck
```

For manual investigation:
- Search for zero-import files: `grep -r "export" src/ | cut -d: -f1 | sort -u` then cross-reference imports
- Check `packages/data-ingestion/src/` and `apps/web/lib/data-sources/` for alternate pipeline code never imported

## Categorization

Before deleting anything, classify each finding:

| Risk | Examples | Action |
|---|---|---|
| SAFE | Unused utility functions, internal helpers with 0 imports | Delete directly |
| CAUTION | React components, API handlers, exported types | Verify no dynamic imports first |
| DANGER | Config files, entry points, anything in `middleware.ts` | Investigate before touching |

## Verification loop

For each deletion:
1. Run `npm run test` → record baseline pass count
2. Delete the identified dead code
3. Run `npm run typecheck && npm run test`
4. If any test fails → `git checkout <file>` immediately; mark as CAUTION
5. Move to next item

**One deletion at a time. No batch deletes.**

## GSN-specific known dead code (from audit)

- `packages/data-ingestion/src/odds-failover.ts` — built but never imported in production; evaluate for activation rather than deletion
- `apps/web/lib/data-sources/` — ~3,875 lines of alternate pipeline never imported; verify before removing
- `apps/web/lib/watchlist/alert-dispatch.ts:92-99` — `dispatchWatchlistAlert` is a permanent no-op; either implement or remove Elite tier real-time alerts claim

## Deduplication

After removal pass, identify near-duplicate functions:
- Same logic, different names → consolidate to `packages/types/` or `lib/utils/`
- Redundant type definitions → merge into `packages/types/`
- Wrapper functions wrapping a single call → inline

## Never remove

- Code with a `// TODO`, `// FIXME`, or `// HACK` comment explaining future use
- Exports that might be consumed by external scripts not in the repo
- Test fixtures or seed data
