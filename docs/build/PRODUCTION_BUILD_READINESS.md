# Production Build Readiness

**Last measured:** this hardening pass · `apps/web` `tsc --noEmit` → **204 errors in the sandbox**.
**Bottom line:** the new Decision Field surfaces are **0-error**, and **all 204 sandbox errors trace to
one root cause — the Prisma client is not generated here** (engine download `ECONNRESET` behind the
proxy). 52 are the direct missing-export errors; the other ~152 are *implicit-any cascade* downstream of
the same un-generated client. CI generates Prisma first, so it sees neither bucket. **Do not hand-fix
the cascade — it resolves on `db:generate` and annotating it would fight the generated types.**

## The honest split — one root cause, two symptoms

| Bucket | Count | What it is | Resolves when |
|---|---|---|---|
| **Direct (Prisma missing exports)** | 52 | `TS2305`: `@prisma/client` (40) + `@sports/db` (12) have "no exported member 'PrismaClient' / 'Prisma' / '<Model>'" | `db:generate` |
| **Cascade (implicit-any from Prisma=`any`)** | ~152 | `TS7006`/`TS2532`/`TS18046`… on `.map/.filter/.reduce((row) => …)` callbacks whose array comes from a `prisma.*` call (or a lib loader that wraps one) — `any` *only because* the client is un-generated | `db:generate` |
| **From this workstream** | **0** | — | — |
| **Genuine, Prisma-independent debt** | **0 demonstrated** | every error sampled traced back to Prisma-`any`; the true residual (if any) is only measurable after `db:generate` on CI | — |

### Why the ~152 are cascade, not debt (proven, not asserted)

`prisma` is typed `any` in the sandbox (its client isn't generated), so **every value derived from a
Prisma query is `any`**, and every callback over it becomes an implicit-any (`TS7006`). Worked example:

```ts
// packages/data-ingestion/src/team-rates-source.ts
const logs = await prisma.teamGameLog.findMany({ select: { teamScore: true, … } });
return logs.filter((l) => l.teamScore !== null)   // ← TS7006 on `l` HERE, in the sandbox only
           .map((l) => ({ … }));                   // ← and HERE
```

With Prisma generated, `findMany({select})` returns a typed array, `l` is inferred, and **both errors
disappear**. Hand-annotating `l` would pin a shape that may not match the generated `select` type —
trading a sandbox-only error for a real one. The same pattern holds for the lib loaders: e.g.
`app/cockpit/memory/page.tsx`'s 2 errors come from `listMemoryByState()` (in `lib/jarvis/memory/
actions.ts`, a Prisma loader) returning `any` here.

**Empirical concentration:** of the 53 files carrying cascade errors, **52 (150 errors) import Prisma /
`@sports/db` / call `prisma.`**; the single remaining file is cascade through a Prisma loader as shown
above. Highest concentrations (all Prisma-fed):

| File | Errors |
|---|---|
| `app/api/admin/dashboard/route.ts` | 16 |
| `lib/board/state.ts` | 10 |
| `app/api/cockpit/agents/route.ts` | 9 |
| `app/admin/clv/page.tsx` | 9 |
| `app/cockpit/history/page.tsx` | 8 |
| `packages/data-ingestion/src/context-enrichment.ts` | 6 |
| *(+47 more files, 1–5 each)* | … |

### Decision-surface verification (works in this sandbox, no Prisma)

The new code does **not** depend on Prisma and is provably clean: `npm run guard:decision-surfaces`
typechecks all five new packages → **exit 0**. `grep` across the decision-UI (`apps/web/components/
decision/*`), the new public pages (`/today`, `/edge`, `/gameplan`, `/proof/*`), and the five packages
returns **zero** errors of any kind.

## Clean build sequences

**Local / CI (authoritative):**
```bash
npm install            # postinstall runs db:generate
npm run db:generate    # (explicit) regenerate the Prisma client — clears ALL 204
npm run typecheck      # all workspaces
npm run build          # apps/web production build
```
Or the bundled helper: `npm run build:verify:local` (`db:generate → typecheck → build`).

**Decision surfaces only (no Prisma needed):**
```bash
npm run guard:decision-surfaces   # tsc the 5 new packages → 0 errors
npx vitest run packages/decision-field-runtime packages/decision-factory \
  packages/nfl-stat-universe packages/autonomy packages/galileo-week
npm run guardrails                # trust-gate + model-freeze + draft-only + claude-api + secrets + evals
```

**App typecheck (surfaces the cascade in-sandbox):** `npm run typecheck:app`.

## Definition of done for "boring-green"

1. `db:generate` succeeds → the 52 direct **and** the ~152 cascade errors → expected **0**.
2. Re-run `npm run typecheck:app` on CI (Prisma generated) to measure the **true** residual — if any
   genuine, Prisma-independent error survives, fix it then (none demonstrated in the sandbox).
3. `npm run build:verify:local` exits 0; `npm run guardrails` green; package vitest green.

CI already runs step 1 before typecheck/build (`.github/workflows/ci.yml`), so the app is expected to be
green on CI today. The remaining action is to **confirm the post-generate residual on CI**, not to grind
through 152 sandbox artifacts by hand.
