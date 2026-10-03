# GSE Finish-Line — Validation Results

**As of:** 2026-06-29 (finish-line re-execution). Branch `claude/gse-no-claim-waitlist`
@ `56a069e5`. All commands run directly this session; exit codes captured verbatim.

## Result: GREEN

| Step | Command | Exit | Notes |
|---|---|---|---|
| Prisma client | `npm run db:generate` | **0** | client regenerated |
| Next cache | wipe `apps/web/.next` | n/a | already absent |
| Typecheck | `npm run typecheck --workspace=apps/web` (`tsc --noEmit`) | **0** | strict; resolves `@/...` |
| Lint | `npm run lint --workspace=apps/web` (`eslint --max-warnings=0`) | **0** | clean |
| Tests | `vitest run __tests__/gse-waitlist.test.ts __tests__/guardrails.test.ts` **(run from `apps/web`)** | **0** | **55 passed** (49 waitlist + 6 guardrails) |

## Important invocation note (not a defect)

Running `npx vitest run apps/web/__tests__/...` **from the repo root** fails to load
`apps/web/vitest.config.ts`, so the `@ → apps/web` alias is never applied and the test
errors with `Failed to load url @/components/gsn/waitlist-form … Does the file exist?`
(the `resolved id` stays the literal alias string — proof the alias config wasn't loaded).

- The component **exists** (`apps/web/components/gsn/waitlist-form.tsx`, 10,765 bytes) and
  `tsc` resolves it (typecheck = 0), confirming this is **invocation/CWD**, not SOURCE.
- There is **no root `vitest.config`**; the only config is `apps/web/vitest.config.ts`
  (`resolve.alias { "@": resolve(__dirname, ".") }`).
- **Canonical way to run these tests:** from `apps/web` (`cd apps/web && npx vitest run …`)
  or via the workspace test script — not `npx vitest` from the repo root.

Classification of the transient root-CWD red: **TEST-INVOCATION** (config not loaded),
self-healed by running from the correct directory. A `node_modules/.vite` cache clear was
attempted first (CACHE hypothesis) and did **not** fix it — confirming the alias-config
root-cause above. No source or test file was modified.

## Gate confirmations (file-tree truth)
- `BACKTEST_TRUTH.beatsNaive === false` in `apps/web/lib/gse/waitlist-copy.ts:25`
  (samples 10,301 · modelMae 5.18 · naiveMae 4.9999).
- `schema.prisma` contains **0** `WaitlistLead` models — no migration, gate intact.
- Working tree is **docs-only** (no source/config/schema/Lumera/XXX changes).
