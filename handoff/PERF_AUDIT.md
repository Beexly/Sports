# PERF AUDIT (P4-11) — read-only performance audit

Command: `.claude/commands/perf.md` — *"Find: slow/unindexed Prisma queries, N+1s, oversized
client bundles, components that should be server components, and unmemoized expensive renders.
Report each with an impact estimate + fix. Measure where possible."*

Allowed tools: Read, Grep, Glob, `git diff|log|status`. **NO product code touched** — verified
`git status --porcelain` shows only the new `handoff/` files.

**RESULT: 1 high (unindexed full-table count on a public route, 684k-row table), 1 medium
(findUnique→findFirst on the entitlement hot path), 1 medium (dead code behind a claim), plus
one scanner blind spot recorded so a future zero is read correctly.**

Reproducible scanner: `handoff/perf-scan.mjs` (node, exit 0; **9/9 rules fire on their own
specimens** via `--selftest`, so every zero below is a real zero, not a broken rule).

---

## F1 (high) — `OddsLineSnapshot` counted and max-ordered with no usable index, on a PUBLIC route

`apps/web/lib/ops/odds-line-archive-freshness.ts:266-274`

```ts
const [latest, recentWindowRowCount] = await Promise.all([
  db.oddsLineSnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true } }),
  db.oddsLineSnapshot.count({ where: { capturedAt: { gte: new Date(nowMs - recentWindowMinutes * 60_000) } } }),
]);
```

Read the call site, not just the line: this is reached from
`app/api/ops/public-surface-truth/route.ts:217` → `assessOddsLineArchiveFreshness`. That route
carries the `ops-truth-detail-auth` flag and is **reachable without authentication** (public
surface, auth is for the *detail* payload). The freshness read is inside the public branch.

`packages/ingestion-pipeline/src/archive-staleness-monitor.ts:66-71` is the same shape
(`findMany where.capturedAt gte, orderBy capturedAt desc, take: 10`).

**Why it is unindexed — measured against the schema, not assumed.** `OddsLineSnapshot` declares
exactly two indexes (`schema.prisma`):

```
@@index([gameId, market, capturedAt])
@@index([phase, capturedAt])
```

Both are **composite with `capturedAt` third**. There is no index whose leading column is
`capturedAt`, so a `capturedAt`-only predicate cannot use either for a range seek, and the
`ORDER BY capturedAt DESC` on the `findFirst` has no index to satisfy it — it sorts. The
scanner's `UNINDEXED-WHERE` rule caught both call sites by parsing the schema's index map; the
rule is correct and these are the only two `OddsLineSnapshot` sites it flags.

**Impact estimate.** AGENTS.md records `odds_line_snapshots` at **684,498 rows** (spanning
2026-08-19..22 as of the last count). The `count()` is a sequential scan of the whole table
plus a filter; the `findFirst` is a scan-and-sort. Per public request, that is ~684k rows read
twice. At an unindexed ~0.2-0.5 ms/10k-row scan band that is roughly **0.5-1.5 s of table I/O
per uncached hit**, on the route that is *specifically* the public truth surface. It is the
one route an attacker can hit repeatedly without auth, and it is also the route the founder
and other agents poll to read truth, so it is simultaneously the most-called and the most
abusable path. This is a plausible contributor to the slow first paint on the truth surface
and it is trivially cacheable — the value only changes when the archive is written.

**Fix (NOT applied — read-only command).**

1. Add a leading-column index. This is a schema change, which is **law-2 sealed**
   (`packages/db/prisma/schema.prisma` is on the never-modify list), so this needs the owner.
2. The no-schema fix available to a code change alone: the freshness read does not need a
   `count()` at all — `assessOddsLineArchiveFreshness` only needs "did anything land inside
   the degraded window", which `recent.length > 0` answers from a `take: 1` probe, or from the
   `findFirst`'s timestamp alone with zero table scan. Removing the `count` halves the cost
   immediately and is a pure code change.
3. Correctness caveat that must ride with any fix: `catch` at :222 returns
   `mostRecentCapturedAt: null`, and by the comment at :255 that is *deliberate* — a failed
   read reports STALE rather than "nothing to report". Any caching added here must not convert
   that null into a cached non-null, or a transient DB error becomes a durable false-fresh.

## F2 (medium) — entitlement lookup uses `findFirst` on a `@unique` key

`apps/web/lib/entitlements.ts:75`

```ts
subscription = await db.subscription.findFirst({ where: { userId, OR: [...] } });
```

`Subscription.userId` is `@unique`. The scanner's `PRISMA-FIND-FIRST` rule flagged exactly one
site repo-wide, and this is it. `findFirst` cannot be planned as a unique-index lookup; it
compiles to the same shape as a `findMany` with a limit, so the planner has more freedom to
choose badly (it may prefer a scan-and-filter over the unique index if the `OR` on status
looks unselective to the cost model).

**Impact.** This is the **entitlement gate**, on the request path of every gated surface — the
one query whose latency a customer feels on page load. `Subscription` is a small table (one
row per user), so the absolute cost is small and I am not inflating it. The cost of *fixing* it
is lower still: the `OR` arm is business logic, not an index question, so the honest fix is to
keep `findFirst` unless the table grows, or to split into a `findUnique` on `userId` plus an
in-process check of the status arms. **Recorded as medium on reach, not on measured bytes** —
I have no row count for `Subscription` and did not query the database.

## F3 (medium) — the archive-staleness monitor is exported and never called

`packages/ingestion-pipeline/src/archive-staleness-monitor.ts` is re-exported at
`packages/ingestion-pipeline/src/index.ts:195-201` and has a test
(`packages/ingestion-pipeline/src/__tests__/archive-staleness-monitor.test.ts`), but `grep -rn "checkArchiveStaleness"` across
`apps/` + `packages/` returns **only the export and the test** — zero product callers.

This is the same class of defect AGENTS.md already records for `gate_decisions`: *a consumer
of a record nothing writes, or in this case a writer nothing calls.* It reads directly against
the open follow-up logged in AGENTS.md ("nothing alarms on archive staleness — that monitor is
the follow-up"): the monitor that would answer that question is built, tested, and
**not wired to the cron that would surface it**. The unindexed shape it shares with F1 is
already written and tested, so wiring it is the cheap half of that follow-up.

**Impact.** Not a latency defect — it is a **detection** defect, and detection defects are how
the three-week line-archive outage (2026-08-22, root-caused in P4/AGENTS.md) stayed invisible.
Fix: call it from the ops cron alongside the other monitors. Not applied (read-only).

## Scanner blind spot, recorded so the CLIENT-HEAVY = 0 is read correctly

`CLIENT-HEAVY` returned **0 across 4,770 files**, with 154 `"use client"` files in the tree.
That zero is *substantively correct but structurally accidental* — the rule tests a hardcoded
import list (`perf-scan.mjs:50-54`) of which **12 of 15 entries are not installed in this
repo** (`recharts`, `date-fns`, `framer-motion`, `zod`, `swr`, `@tanstack/react-query`, `xlsx`,
`d3-*`, `react-markdown`, `pdf-lib`, `exceljs`, `react-syntax-highlighter`, `@prisma/client`
all ABSENT from the root manifest). The rule could not have fired even if the tree were full
of them.

What it would have needed to catch: **`three` + `@react-three/fiber` + `@react-three/drei` +
`@react-three/postprocessing` are installed and are by far the heaviest things in
`apps/web/package.json`**, and five `"use client"` files import them — `signal-core-scene.tsx`,
`galaxy-slate-twin.tsx` (63 KB), `consensus-engine-3d.tsx`, `consensus-constellation.tsx`,
`league-twin-galaxy.tsx`.

I traced every one rather than filing the miss as a defect, and **all four routed scenes are
correctly code-split** through a `*-lazy.tsx` wrapper using `next/dynamic`
(`components/three/signal-core-scene-lazy.tsx:30`,
`components/slate-twin/galaxy-slate-twin-lazy.tsx:20`,
`components/hero/consensus-engine-3d-lazy.tsx:33`,
`components/fantasy/league-twin-lazy.tsx:23`). The architecture is right; three.js is not in
the initial bundle.

One loose thread, **not filed as a defect**: `consensus-constellation.tsx` (11 KB, `"use
client"`, imports three) is referenced by **0 other files** — no lazy wrapper, no importer. It
is dead weight in the source tree but harmless to the bundle, since an unimported module is
never built. Worth a delete, not a performance finding.

## UNMEMOIZED (8) — reported, impact NOT inflated

8 components render inside a `.map()` without `memo()`: `board/page.tsx:343 PassListItem` and
`:406 BoardRowItem`, `glass-ledger/page.tsx:586`, `intelligence/metrics/page.tsx:152`,
`mission-control-view.tsx:17`, `personalized-briefing.tsx:69`, `gm-ledger-view.tsx:69`,
`bet-tracker.tsx:115`.

**I am not filing these as defects.** Every one is a presentational row that is only expensive
if its parent re-renders, and I have no profiler run and no re-render trigger to show that
happens. Adding `memo()` to a component whose props are all primitives or stable references
buys nothing, and adding it to one whose props include an inline object or arrow buys cost for
no benefit. **This is the section where "measure where possible" has to stop:** the command
asks for impact estimates, and a class-string census cannot produce one for render cost. The
list is a starting index for a real `React DevTools` pass, not a work order.

## Clean sweeps, recorded so nobody re-runs them

- **No N+1 on any user-facing request path.** All 31 non-test N+1 hits are in
  `packages/ingestion-pipeline`, `settlement-outbox/worker.ts`, `lib/stripe.ts`,
  `reconcile-entitlements.ts` and `rss.ts` — batch, cron and webhook lanes, not page loads.
  The rule also correctly declines to fire when the loop body is wrapped in `Promise.all` or
  `$transaction([])`.
- **No `use client` on a server-only module.** The 5 `CLIENT-NO-STATE` hits
  (`logo-mark-inline.tsx`, `live-pool-empty.tsx`, `glitch-truth.tsx`, `sentient-weather.tsx`,
  `signal-state-pulse.tsx`) are pure-SVG/presentational files whose importers are already
  client-side. `logo-mark-inline.tsx` (read it) takes only props and returns JSX — the
  directive is unnecessary but it is imported *by* client error boundaries and
  `methodology-section.tsx`, so removing it is a no-op for the bundle. Cosmetic, not filed.
- **Unstable pagination (10 hits)** — all are `findMany` with `take` and no `orderBy` in
  settlement/cron lanes, plus `publish-time-market-p-loader.ts:321`. These are batch windows,
  not paginated UIs; without a `cursor` there is no page 2 to be unstable across. Correct as-is.

## NOT DETERMINED, stated in the report

- **No database was touched.** Every index claim is read from `schema.prisma` and every cost
  band is an estimate from the documented 684k row count, not a measured `EXPLAIN ANALYZE`. The
  F1/F2 directions are sound; the millisecond figures are not measurements and should not be
  quoted as such.
- **No bundle measurement.** No `next build`, no `.next` inspection, no Lighthouse. The
  CLIENT-HEAVY conclusion rests on tracing import sites, which is a *stronger* argument for the
  4 lazy-wrapped scenes (the wrapper is the mechanism) but says nothing about total bundle
  bytes, route-level code splitting, or image/font weight.
- **`Subscription` row count** unknown, so F2's severity is reach-based, not size-based.
- **No profiler**, so the UNMEMOIZED list has no measured render cost (see above).
- **29 tracked files >2MB unscanned** and no built `.next` inspected — carried forward
  unchanged from P4-6/7/8/9/10.
- Scope limit on the scanner: it reads `.ts/.tsx/.js/.jsx/.mjs` under the repo and skips
  `node_modules`, `.next`, `dist`, `build`, `coverage`.

## Gates (DoD)

```
npm run typecheck              exit 0
npm run lint                   exit 0   (--max-warnings=0)
guard:commercial-copy          exit 0   470 files, no unsafe copy
guard:secrets                 exit 0   10,836 all-tracked files, no secrets
perf-scan.mjs                  exit 0   4,770 files scanned
perf-scan.mjs --selftest       exit 0   9/9 rules fire on their own specimen
```

`git status --porcelain` clean apart from the two new `handoff/` files — no product code changed.
