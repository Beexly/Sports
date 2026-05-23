# Issue Queue

> Bug reports, voice/vocab violations spotted in production, test gaps,
> performance issues, accessibility findings. Both Claude and Codex
> read and write this. Items move to the resolved section as they
> close.
>
> Severity tags:
>
> - `[P0]` — production breakage or compliance risk. Drop everything.
> - `[P1]` — visible to users, must fix this phase.
> - `[P2]` — non-urgent, fix in slack time.
> - `[P3]` — nice-to-have, may roll into `improvement-backlog.md` if
>   it lingers.

## Format

```
### YYYY-MM-DD — [P0/1/2/3] <short title>

**Found by:** Claude / Codex / owner / synthetic monitor
**Surface:** which page, route, component, or system
**Symptom:** what's wrong
**Root cause (if known):**
**Proposed fix:**
**Status:** open / in-progress / blocked / resolved
**Owner:** Claude / Codex
```

---

## Open issues

### 2026-05-23 — [P2] TypeScript `baseUrl` deprecation in apps/web/tsconfig.json

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `apps/web/tsconfig.json` line 23
**Symptom:** `npm run typecheck` fails immediately with TS5101 —
"Option 'baseUrl' is deprecated and will stop functioning in
TypeScript 7.0."
**Root cause:** TypeScript 5.x bumped `baseUrl` to a hard error
unless `ignoreDeprecations: "6.0"` is added.
**Proposed fix:** add `"ignoreDeprecations": "6.0"` to the
`compilerOptions` block, OR migrate path mapping off `baseUrl`
entirely.
**Status:** open
**Owner:** Codex (config edit; Claude's lane doesn't permit
`tsconfig.json` edits per master plan Part 1)

### 2026-05-23 — [P2] Prisma client missing exports in apps/web tests

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `__tests__/cockpit-transitions.test.ts`,
`__tests__/promotions-guards.test.ts`,
`__tests__/promotions-public-payload.test.ts`,
`app/api/cockpit/tasks/route.ts`, others
**Symptom:** typecheck errors like
`Module '"@prisma/client"' has no exported member 'CockpitTaskStatus'`,
`'Promotion'`, `'OperatorAgent'`.
**Root cause:** `npx prisma generate` hasn't been run in this checkout
of the container; the generated client is stale relative to the schema
that introduced these types.
**Proposed fix:** Codex runs `npm run db:generate` as part of Phase 0
housekeeping; consider adding it to `postinstall` so contributor
checkouts don't hit this.
**Status:** open
**Owner:** Codex (Phase 0)

### 2026-05-23 — [P2] Implicit `any` parameters scattered across admin + cockpit + api routes

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `app/admin/picks/page.tsx`,
`app/admin/posts/page.tsx`, `app/admin/users/page.tsx`,
`app/api/admin/dashboard/route.ts`,
`app/api/cockpit/**/route.ts` (multiple), and more.
**Symptom:** ~40+ `TS7006: Parameter 'X' implicitly has an 'any' type`
errors when typecheck runs.
**Root cause:** Prisma's generated types aren't being propagated into
inline `.map` / `.filter` / `.reduce` callbacks — likely correlated
with the Prisma generate gap above. May resolve naturally once that
fix lands. Anything left after that is a strict-mode hygiene cleanup.
**Proposed fix:** Codex runs prisma generate, re-runs typecheck, then
annotates any remaining callback parameters explicitly. No `any`
escape hatches per master plan Part 4 rule #7.
**Status:** open
**Owner:** Codex (Phase 0 cleanup)

---

## Resolved (last 30 days, then prune)

*None yet.*
