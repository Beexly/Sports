---
description: Resolve build, type, or lint errors one at a time — minimal diffs only
---

Fix build failures, TypeScript errors, or lint violations systematically. Fix **one error at a time**.

## Process

1. **Detect** — identify project toolchain from `package.json`, `tsconfig.json`, `vercel.json`
2. **Run** — execute the failing command:
   - TypeScript: `npm run typecheck`
   - Lint: `npm run lint`
   - Tests: `npm run test`
   - Build: `npm run build`
3. **Triage** — sort errors by dependency order (fix import/type issues before logic)
4. **Fix** — for each error:
   - Read the file at the error location + 20 lines of context
   - Determine root cause (wrong type, missing import, signature mismatch, etc.)
   - Apply **smallest viable fix** — no refactoring, no cleanup
   - Re-run the command
   - Confirm error resolved before moving to next
5. **Repeat** until zero errors

## Fix strategies by error type

| Error type | Strategy |
|---|---|
| Missing import | Check if package exists; add import or install package |
| Type mismatch | Check the actual type shape; adjust cast or interface |
| Unused variable | Prefix with `_` or remove if truly dead |
| Missing `await` | Add `await`; ensure caller is `async` |
| `Object is possibly null` | Add null check or non-null assertion with comment explaining why safe |
| Import cycle | Extract shared type to `packages/types/` |
| Missing return type | Infer from implementation; add explicit annotation |

## Stop conditions — pause and ask

- A fix causes MORE errors than it resolves
- Same error persists after 3 attempts
- Fix requires restructuring multiple files
- Error is caused by missing environment variable or external dependency

## Critical rule

**Prefer minimal diffs over refactoring.** Do not fix adjacent code that isn't broken. Do not rename unless the name is causing the error.
