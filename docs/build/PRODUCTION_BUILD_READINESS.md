# Production Build Readiness

**Last measured:** this hardening pass · `apps/web` `tsc --noEmit` → **204 errors**, split below.
**Bottom line:** the new Decision Field surfaces are **0-error**. The remaining errors are **52
environmental** (Prisma engine not generated in the sandbox; CI generates it) and **152 pre-existing
admin/lib type-debt** errors that predate this workstream. None block the decision OS.

## The honest split

| Bucket | Count | Cause | Who fixes it |
|---|---|---|---|
| **Environmental (Prisma)** | 52 | `@prisma/client` (40) + `@sports/db` (12) re-export `TS2305` — the generated client isn't present | `npm run db:generate` (CI runs it before typecheck/build; the sandbox can't — engine download `ECONNRESET`) |
| **Pre-existing code debt** | 152 | implicit-any & friends in admin routes/pages + lib data-loaders | targeted typing pass (enumerated below) |
| **From this workstream** | **0** | — | — |

### Environmental (52) — not a code problem

These are `error TS2305: Module '"@prisma/client"' has no exported member 'PrismaClient'` (and
`'Prisma'`, and the `@sports/db` re-exports of the same). They appear **only because the Prisma client
has not been generated in this sandbox** — `node_modules/.prisma/client` is missing and the engine
binary download fails with `ECONNRESET` behind the proxy. They vanish the instant `db:generate` runs.

- CI already runs `npm run db:generate` before `typecheck` and `build` in both the `test` and `build`
  jobs (`.github/workflows/ci.yml`), so **CI never sees these 52**.
- `package.json` `postinstall` also runs `db:generate`, so a normal local `npm install` resolves them too.
- This is the one thing the sandbox genuinely cannot do; it is stated here rather than hidden.

### Pre-existing code debt (152) — real, enumerated, none in decision-ui

By TS code: `TS7006` implicit-any ×135 · `TS18046` `unknown` in catch ×6 · `TS2532` possibly-undefined ×4 ·
`TS7031` implicit-any binding ×3 · `TS2322` ×2 · `TS2339` ×1 · `TS18048` ×1. Across **53 files**, all in
admin routes / cockpit pages / lib data-loaders. Highest concentrations:

| File | Errors |
|---|---|
| `app/api/admin/dashboard/route.ts` | 16 |
| `lib/board/state.ts` | 10 |
| `app/api/cockpit/agents/route.ts` | 9 |
| `app/admin/clv/page.tsx` | 9 |
| `app/cockpit/history/page.tsx` | 8 |
| `packages/data-ingestion/src/context-enrichment.ts` | 6 |
| `lib/proof/load-proof-of-record.ts` | 5 |
| `lib/jarvis/memory/actions.ts` | 5 |
| *(+45 more files, 1–4 each)* | … |

**Verified:** `grep` across the decision-UI (`apps/web/components/decision/*`), the new public pages
(`/today`, `/edge`, `/gameplan`, `/proof/*`), and all five new packages (`decision-field-runtime`,
`decision-factory`, `nfl-stat-universe`, `autonomy`, `galileo-week`) returns **zero** genuine errors.
`npm run guard:decision-surfaces` typechecks all five packages → exit 0.

## Why the 152 are documented, not blind-fixed here

Every one of the 152 lives in admin/lib code that **imports generated Prisma types**. Without a
Prisma-generated typecheck to compile against (the sandbox can't generate it), "fixing" a `TS7006` by
hand-annotating a `.map(row => …)` callback risks pinning the wrong type and trading a loud error for a
silent one. The safe sequence is: generate Prisma → re-run `tsc` → fix against real types. That is a
mechanical pass best done where `db:generate` succeeds (CI or a networked dev box), file-by-file from the
concentration table above. This is a **targeted, scoped TODO**, not an open-ended cleanup.

## Clean build sequences

**Local / CI (authoritative):**
```bash
npm install            # postinstall runs db:generate
npm run db:generate    # (explicit) regenerate the Prisma client
npm run typecheck      # all workspaces
npm run build          # apps/web production build
```
Or the bundled helper: `npm run build:verify:local` (`db:generate → typecheck → build`).

**Decision surfaces only (works in this sandbox, no Prisma needed):**
```bash
npm run guard:decision-surfaces   # tsc the 5 new packages → 0 errors
npx vitest run packages/decision-field-runtime packages/decision-factory \
  packages/nfl-stat-universe packages/autonomy packages/galileo-week
npm run guardrails                # trust-gate + model-freeze + draft-only + claude-api + secrets + evals
```

**App typecheck (surfaces both buckets):** `npm run typecheck:app`.

## Definition of done for "boring-green"

1. `db:generate` succeeds → the 52 environmental errors → 0.
2. The 152 admin/lib errors fixed file-by-file from the table → 0.
3. `npm run build:verify:local` exits 0; `npm run guardrails` green; package vitest green.

Items 1 and 3-guardrails are achieved on CI today. Item 2 is the only remaining code work, and it does
not touch the decision OS.
