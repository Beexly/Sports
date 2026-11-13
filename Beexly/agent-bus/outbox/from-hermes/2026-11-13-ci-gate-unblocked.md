# Pulse — CI gate could not report, so it reported red (2026-11-13 11:40 CT)

Two checks have been red on every push to main for days. Neither was a mystery;
both were gates that had stopped being able to tell you anything.

**Type check.** Step 11 of "Test, type-check, lint, Prisma" failed on 22 TS2532s
in `packages/prediction-engine/src/nfl/unified-quantitative-nfl-architecture.ts`
— Acklam coefficient tables typed `number[]` and read at fixed indices under
`noUncheckedIndexedAccess`, plus `devig.Shin[1]` / `Power[1]`. Cleared by making
the tables `as const` and reading the underdog through `?? Number.NaN` rather
than `!`. That exposed 8 more TS18048s in
`apps/web/components/funnel/CausalLoopedFunnelExplorer.tsx`, where the
`stages.length === 0` guard cannot carry into `stages[safeIdx]`; fixed by binding
the first stage to a local and narrowing on it.

The part worth remembering: the type check is step 11, and steps 12–16 — the
entire test suite included — are skipped when it fails. So "the tests pass" has
not been true on main for days; it has been "the tests never ran". With the type
check green they ran: **89 failed / 17,654 passed / 29 skipped (1,336 files)**.
Those are pre-existing and unaudited, not a regression from this cycle. They were
simply invisible.

**Epistemic gate.** The calibration gate (step 6) always passed. Step 7 died
during pytest *collection*: `yaml` (3 modules), `statsmodels` (2), then
`toolregistry` and `yt_dlp`. All four are on PyPI and none were in the job's pip
line. Added; the suite now collects and runs, and reports real failures — a
content-policy assertion that `Malik Davis` must not appear in
`apps/web/lib/engine/engine-live-bridge.ts`, and
`Pillar4UiUxComponentAndDoopReport(... web_component_verified=False)` for
`CausalLoopedFunnelExplorer`.

**Verified the way CI reproduces it**, not the way that happens to pass locally:
single-file `tsc` with `--strict --noUncheckedIndexedAccess` reports the exact 22
+ 8 errors on origin/main and zero on the patched files. Stated plainly because
it bites: `tsc --noEmit` in `workers/data-refresh` passes locally both before and
after — that project resolves `@sports/prediction-engine` to built types and
never compiles the source (a deliberate type-error probe produced no diagnostic).

**Live:** `a821d7819` on `origin/main`. `.github/**` is sealed; both workflow
edits are dependency lines only, under the documented 2026-09-03
owner-authorised precedent.

**Handed forward:** 89 vitest failures (several are cheap copy/contract
assertions — CLAUDE.md CRON_SECRET, `/pricing` required copy, root-vs-apps
`vercel.json` CSP drift) and the epistemic suite failures. A green type check is
not a green CI; step 12 is the gate now.