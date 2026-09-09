# Audit 2026-09-08 — Pipeline funnel: do the systems actually feed each other?

Read-only. Nothing in this report was executed against a database, no gate or flag is
proposed for flipping, no guard or threshold is proposed for weakening. Every claim below
traces to a file and line I opened or a command I ran in this session. Where I could not
verify something, it says NOT VERIFIED.

Scope: trace the real path ingestion → feature-store → prediction-engine → picks in DB →
`/api/picks` → settlement → calibration → pricing phase, prove each hop with an importer,
and name every workspace package with no importer outside its own tests.

---

## What I checked (with commands run)

Workspace inventory and importer graph:

```bash
for d in packages/* workers/* apps/*; do node -e "console.log(require('./$d/package.json').name)"; done
# 23 workspaces resolved

for p in ai-council compliance crypto data-ingestion db epistemic-twin feature-store \
         genesis-kernel governed ingestion-pipeline ops partner-stack phase-c \
         prediction-engine quote-plane stats-api types util worker-*; do
  grep -rn "@sports/$p" --include=*.ts --include=*.tsx --include=*.mjs --include=*.json \
       apps packages workers scripts | grep -v node_modules | grep -v "^packages/$p/"
done
```

Pick writers and the scoring hop:

```bash
grep -rn "pick\.create\|picks\.createMany\|pick\.upsert" --include=*.ts apps packages workers scripts
grep -rn "processSport\|refreshOdds\|generateSignalSlate" --include=*.ts apps packages workers scripts
grep -rn "buildIndependentFairValues\|independentFairValues" packages/ingestion-pipeline/src/*.ts packages/prediction-engine/src/scoring.ts
```

Cron surface:

```bash
ls apps/web/app/api/cron/ | sort > /tmp/a.txt
grep -o '"/api/cron/[a-z-]*"' apps/web/vercel.json | sed 's|.*/||;s|"||' | sort > /tmp/b.txt
comm -23 /tmp/a.txt /tmp/b.txt     # routes with no schedule
diff <(grep -o '"/api/[a-z/-]*"' apps/web/vercel.json) <(grep -o '"/api/[a-z/-]*"' vercel.json)  # IDENTICAL
```

Read/write balance per Prisma model (single-line form, then re-run multiline with ripgrep
because `db.x\n  .upsert(` defeats a single-line regex — the first pass produced two false
positives that the multiline pass corrected):

```bash
for m in teamGameEfficiency playerGameStat snapCount injury depthChartEntry nextGenStat \
         pfrAdvStat teamWeekStat playerRushProfile historicalGame shadowSignal gameSignal \
         signal openingLine oddsLineSnapshot teamGameLog pickSignalSnapshot slateCommitment \
         gateDecision lossAutopsy sourceSnapshot filterStateSnapshot performanceSummary; do
  grep -rn "\.$m\.\(create\|createMany\|upsert\|update\|updateMany\|deleteMany\)" ...
  grep -rn "\.$m\.\(findMany\|findFirst\|findUnique\|count\|aggregate\|groupBy\)" ...
done
# then, multiline, via the Grep tool:
#   gateDecision\s*\n?\s*\.\s*(create|createMany|upsert|update|updateMany)   -> No matches found
#   blogPost\s*\n?\s*\.\s*(create|createMany|upsert|update|updateMany)       -> No matches found
#   (nextGenStat|pfrAdvStat|teamWeekStat)\s*\n?\s*\.\s*(findMany|...)        -> 1 match (nextGenStat only)
```

Raw-SQL escape hatch check for every model that looked dead, using its `@@map` table name:

```bash
grep -n "model X" -A 30 packages/db/prisma/schema.prisma | grep "@@map"
for t in signals revenue_event product_activation entities entity_edges gate_decisions \
         blog_posts performance_summaries pfr_adv_stats team_week_stats; do
  grep -rn "\"$t\"" --include=*.ts --include=*.mjs apps packages scripts workers
done
```

Symbol-level (not filename-level) usage of every `packages/data-ingestion` adapter, because
they are re-exported through `index.ts` and a filename grep is worthless there:

```bash
for b in <adapter>; do
  syms=$(grep -oP "^export (async function|function|const|class) \K[A-Za-z0-9_]+" packages/data-ingestion/src/$b.ts | paste -sd'|')
  grep -rlnE "\b($syms)\b" --include=*.ts apps packages workers scripts \
    | grep -v "packages/data-ingestion/" | grep -v "__tests__" | grep -v "\.test\."
done
```

Files opened in full or in part: `apps/web/vercel.json`, `vercel.json`,
`apps/web/next.config.mjs`, `packages/ingestion-pipeline/src/process-sport.ts` (imports +
independent-fair-value block), `packages/ingestion-pipeline/src/build-independent-fair-values.ts`,
`packages/prediction-engine/src/index.ts`, `.../scoring.ts` (weights + factor assembly),
`.../composite-score.ts`, `apps/web/app/api/picks/route.ts`,
`apps/web/app/api/cron/{settle-picks,calibration-metrics,hydrate-cold-plane,ingest-player-stats,refresh-player-stats,gamma,autonomy-cycle,backtest-calibration,backfill-historical-games,backfill-player-data}/route.ts`,
`apps/web/lib/pricing/{pricing-phases.ts,phase-readiness.ts}`,
`apps/web/lib/gse-stats/value-provider.ts`, `apps/web/lib/gse-stats/session-tier.ts`,
`packages/stats-api/src/{values.ts,rights.ts,catalog.ts,entitlements.ts,providers/registry.ts,own/handlers.ts,own/memory-sor.ts}`,
`packages/feature-store/src/{index.ts,store.ts,package.json}`,
`packages/ops/src/hydrate-force.ts`, `packages/partner-stack/src/index.ts`,
`workers/*/package.json`, `workers/pick-generation/src/index.ts`,
`workers/content-publishing/src/index.ts`, `workers/airwave-listener/src/dry-run.ts`,
`docker/oracle-vps/compose.yml`, `apps/web/lib/{contests/store.ts,gse/waitlist-store.ts,ops/shadow-signal-store.ts}`.

---

## Findings

### F1 — BLOCKER — `/api/gse/v1/values/:metricId` returns hash-generated numbers stamped with real source provenance

The composite value provider wired into the live route injects only three providers:

`apps/web/lib/gse-stats/value-provider.ts:49-56`

```ts
export const demoValueProvider: ValueProvider = createCompositeProvider(
  buildDefaultRouting({ weather, nflverse: nfl, demo }),
);
```

`providers.odds` and `providers.feature_store` are never passed, so
`buildDefaultRouting` never adds the `mkt.` matcher
(`packages/stats-api/src/providers/registry.ts:50-58`) and never adds the feature-store
fallback (`:68-75`). What it does add is the catch-all:

`packages/stats-api/src/providers/registry.ts:76-83`

```ts
if (providers.demo) {
  out.push({ id: "demo", match: () => true, provider: providers.demo, ... });
}
```

and the demo provider invents a value for any ACTIVE, public, non-calibration metric:

`apps/web/lib/gse-stats/value-provider.ts:32-40`

```ts
if (metric.status === "ACTIVE" && metric.publicApi && metric.family !== "calibration") {
  let h = 0; const s = `${metric.id}:${entityId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const u = (Math.abs(h) % 10000) / 10000;
  ...
  return u;
}
```

The catalog marks 56 `mkt.<book>.<market>.{price,novig}` metrics `status: "ACTIVE"`,
`family: "market"`, `sourceIds: ["odds.the_odds_api"]`, `rights: env("licensed_odds","pro_api")`
(`packages/stats-api/src/catalog.ts:376-404`), and `isPublicApiEligible`
(`packages/stats-api/src/rights.ts:27-32`) makes every one of them `publicApi: true`
(`catalog.ts:48`). `gse.edge_index` — the flagship metric, described in the catalog as
"Calibrated pLo − no-vig market q. Fire on this, never confidence." — is likewise ACTIVE,
`family: "market"`, `pro_api` (`catalog.ts:90-101`).

The response then wraps that invented number in a provenance block that names the sources
the metric *would* have come from, and asserts point-in-time correctness:

`packages/stats-api/src/values.ts:100-118`

```ts
data: {
  metricId: metric.id, entityId: req.entityId, asOf: pit.asOfIso, value,
  unit: metric.unit,
  provenance: { sourceIds: metric.sourceIds, rights: metric.rights.rights, pitCorrect: true, modelVersion: null },
  ...
}
```

So `GET /api/gse/v1/values/mkt.pinnacle.spread.novig?entityId=<real game>&asOf=<past>` as a
Pro subscriber returns a number derived from a string hash, labelled
`provenance.sourceIds: ["odds.the_odds_api"]`, `rights: "licensed_odds"`, `pitCorrect: true`.
Tier gating is real and correct (`apps/web/lib/gse-stats/session-tier.ts:22-56` plus
`packages/stats-api/src/entitlements.ts:32-35`), which means this is served to paying
subscribers, not to nobody.

What is wrong: this is fabricated product data on a paid surface. CLAUDE.md rules 1 and 2
and AGENTS.md law 8 ("no mock picks, sample odds, placeholder win rates, invented
benchmarks. Anywhere") do not have a demo exemption. The one mitigation present is a single
prose string in the route body — `_note: "Session tier authority. Demo/memory provider until
full FeatureStore loaders land. Not a performance claim."`
(`apps/web/app/api/gse/v1/values/[metricId]/route.ts:49-51`) — which sits *beside* a
`provenance` object that says the opposite about the same value. A machine consumer reading
`provenance` has no way to tell the two apart.

Proposed fix (no gate touched, no guard weakened): delete the `demo` entry from the routing
that `value-provider.ts` builds, so an unwired metric falls through to `resolveProviderId`'s
`"unwired"` and `handleGetMetricValue`'s existing, already-written refusal path
(`packages/stats-api/src/values.ts:90-97`, HTTP 501 `provider_unwired`, "Metric contract
exists; value provider not wired for this metric yet (definition-first API)"). That path is
the honest answer and it already exists; it is simply unreachable because a catch-all is
registered in front of it. Keep the demo provider behind an explicit non-production
condition if a preview seed is genuinely wanted, and add `provenance.provider` naming the
`ProviderId` that produced the value so a synthetic value can never be read as a sourced one.

Risk of fix: `/api/gse/v1/values` starts returning 501 for every `mkt.*` and `gse.*` metric
until real loaders land. That is the true state of the system; the tests that assert the
demo seed (`packages/stats-api/src/__tests__/*`) would need to assert the refusal instead,
which is a test rewrite, not a test skip.

---

### F2 — BLOCKER — `POST /api/gse/v1/own/values` serves hardcoded model probabilities as first-party, point-in-time-correct data

`apps/web/app/api/gse/v1/own/values/route.ts:14-15`

```ts
/** Process-local demo store — durable Prisma SoR is a follow-on. */
const store = createDemoOwnStore();
```

`packages/stats-api/src/own/handlers.ts:89-95` seeds that store for `nfl:kc` and `nfl:phi`,
and the seed is:

`packages/stats-api/src/own/memory-sor.ts:56-75`

```ts
const base = { entityId, asOf, plane: "model", ownership: "first_party",
               sourceId: "gse.own", pitCorrect: true, publicApiEligible: false,
               licenseSpdx: "LicenseRef-GSE-Internal" };
this.put({ ...base, featureId: "own.model.p",     value: 0.58 });
this.put({ ...base, featureId: "own.model.p_lo",  value: 0.54 });
this.put({ ...base, featureId: "own.model.width", value: 0.08 });
this.put({ ...base, featureId: "own.quote.q", value: 0.51, plane: "archive", sourceId: "quote.independent" });
```

`handleOwnValues` (`own/handlers.ts:68-84`) checks `asOf`, future-leak and not-found, and
then returns the row verbatim. There is no `publicApiEligible` check on this path and no
authentication on the route — only an 8/min rate limit
(`apps/web/app/api/gse/v1/own/values/route.ts:22-29`). So an anonymous caller posting
`{metricId:"own.model.p", entityId:"nfl:kc", asOf:"<2h ago>"}` receives `0.58` presented as
a first-party GSE model probability with `pitCorrect: true`.

What is wrong: `0.58` is a literal in source. It is a model probability for a real NFL team
identifier, served from production with a provenance stamp. Same rule as F1.

Proposed fix: make `createDemoOwnStore()` conditional on a non-production environment, and
have the production path construct an empty `OwnFeedMemoryStore` so `readOwnValue` returns
its existing `not_found` (404) until a durable store-of-record is wired. The refusal is
already implemented; only the seeding needs to stop.

Risk of fix: the route returns 404 for every request until the Prisma store-of-record lands.
`packages/stats-api/src/__tests__/own-values-refuse.test.ts` builds its own store via
`createDemoOwnStore(now)` and is unaffected as long as the export stays.

---

### F3 — MAJOR — the `hydrate-cold-plane` cron hydrates a store instance that no route can read

The cron runs daily at 09:30 UTC (`apps/web/vercel.json`, `"/api/cron/hydrate-cold-plane"`,
`"30 9 * * *"`). It creates its own store:

`apps/web/app/api/cron/hydrate-cold-plane/route.ts:32-34`

```ts
/** Module-scoped store for this serverless isolate (honest single-process). */
const memoryStore = new NflverseMemoryStore();
```

and hydrates it at `:81` with `hydratePlayerGameStatsToMemory(memoryStore, mapped)`.

The store that `/api/gse/v1/values` actually reads is a *different* instance:

`apps/web/lib/gse-stats/value-provider.ts:44-47`

```ts
export const nflverseMemory = new NflverseMemoryStore();
...
const nfl = createNflverseMemoryProvider(nflverseMemory);
```

and the only function that can fill it —

`apps/web/lib/gse-stats/value-provider.ts:58-62`

```ts
export function hydrateLocalNflverseMemory(rows: readonly PrismaPlayerGameStat[]) {
  return hydratePlayerGameStatsToMemory(nflverseMemory, rows);
}
```

— has **zero callers**. `grep -rn "hydrateLocalNflverseMemory"` across `apps packages
workers scripts` returns only its own definition.

So the funnel is broken twice over. Even in the single-instance world the route docstring
carefully carves out ("Note: process-local memory is single-instance"), the cron writes into
a `NflverseMemoryStore` that no request handler holds a reference to. The consequence is
that `nfl.*` metrics — the ones the nflverse prefix matcher claims
(`packages/stats-api/src/providers/registry.ts:42-49`) — resolve through
`createNflverseMemoryProvider` against a permanently empty store, and the composite provider
does not fall through on a null (`registry.ts:24-31` returns the first matching entry's
result, it does not try the next). `nfl.*` is therefore always `value: null` with
`pitCorrect: true`.

This is not a private inconsistency: `packages/ops/src/hydrate-force.ts:16-26` publishes the
wiring checklist that says otherwise, listing step 1 as

```
id: "pgs_write_through",
action: "PlayerGameStat → memory write_through via /api/cron/hydrate-cold-plane (feeds p cold plane)",
status: "CODE_READY",
```

`CODE_READY` is wrong for a path that cannot reach the reader.

Proposed fix: have the cron call the exported `hydrateLocalNflverseMemory` from
`@/lib/gse-stats/value-provider` instead of constructing its own store, and delete the local
`const memoryStore`. That makes the single-instance claim true rather than aspirational.
Separately, correct the `status` on `hydrate-force.ts` step 1 to reflect what the code does.

Risk of fix: importing the value-provider module into a cron route pulls the demo provider
graph into that route's bundle. If F1 is fixed first, that graph shrinks. The cross-isolate
problem is unchanged and is honestly documented already.

---

### F4 — MAJOR — `BlogPost` has zero writers; `/blog`, `/api/blog` and a dashboard nav link point at a table nothing fills

Readers, all live product surfaces:

- `apps/web/app/blog/page.tsx:34` `db.blogPost.findMany`
- `apps/web/app/blog/[slug]/page.tsx:21` and `:49` `db.blogPost.findUnique`
- `apps/web/app/api/blog/route.ts:55`, `:85`, `:106`
- `apps/web/app/admin/page.tsx:23` `db.blogPost.count({ where: { status: "PUBLISHED" } })`
- `apps/web/app/admin/posts/page.tsx:19`

Writers: none. The multiline ripgrep
`blogPost\s*\n?\s*\.\s*(create|createMany|upsert|update|updateMany)` returns **No matches
found** across the repo, `grep -rn '"blog_posts"'` (the `@@map` at
`packages/db/prisma/schema.prisma:887`) returns nothing outside migrations, and
`packages/db/prisma/seed.ts` has no `blogPost` mention.

The generator that would produce them is orphaned too:
`apps/web/lib/content-generator.ts:69 export async function generateBlogPost(...)` is
imported by exactly one file, `apps/web/__tests__/content-generator.test.ts:2`.

Meanwhile the daily `generate-drafts` cron (`0 11 * * *`) writes a *different* table,
`ContentDraft` (`apps/web/app/api/cron/generate-drafts/route.ts:84-85`), which is read only
by the operator cockpit (`apps/web/app/api/cockpit/content/route.ts:60`,
`.../content/[id]/route.ts:37`, `apps/web/app/cockpit/content/page.tsx:61`). There is no
promotion path from `ContentDraft` to `BlogPost` anywhere in
`apps/web/lib/content-engine/`.

And the product links to it: `apps/web/app/dashboard/page.tsx:570`
`{ href: "/blog", label: "Analysis Blog" }`.

What is wrong: a signed-in user clicking "Analysis Blog" reaches a page that structurally
cannot ever have content. The draft-only posture for auto-publishing is deliberate and
correct (CLAUDE.md, `workers/content-publishing`), but that posture is enforced on
`ContentDraft`; `BlogPost` is a separate table with no producer at all, gated or otherwise.

Proposed fix (pick one, both honest): either remove the `/blog` nav entry and let the routes
stand as an unused admin-fed CMS, or state the state — render the existing empty-state on
`/blog` and have the dashboard link carry the same posture the rest of the surface uses.
Do not build an auto-promotion path; that is the thing the draft-only gate exists to prevent.

Risk of fix: cosmetic only; no data path changes.

---

### F5 — MAJOR — `GateDecision` is read by five product paths and written by nothing

Readers:

- `apps/web/lib/board/passes.ts:146` `db.gateDecision.findMany` and `:237` `.groupBy`
- `apps/web/lib/board/state.ts:468` `db.gateDecision.findMany`
- `apps/web/lib/bot-outbox/load.ts:80` `db.gateDecision.findMany`
- `apps/web/lib/engine/load-engine-story.ts:103` `db.gateDecision.groupBy`

Writers: none. Multiline ripgrep
`gateDecision\s*\n?\s*\.\s*(create|createMany|upsert|update|updateMany)` → **No matches
found**; `grep -rn '"gate_decisions"'` (the `@@map` at `schema.prisma:686`) → nothing outside
migrations. The only other appearances are typed row shapes
(`apps/web/lib/board/gate-rows.ts:97,197`, `gate-consumer.ts:172-173`) and four test
fixtures under `apps/web/__fixtures__/intelligence-graph/`.

What is wrong: the "passes" list on the board — the surface that is supposed to show *why*
a game was declined — reads a table that has no producer, so it renders whatever the fallback
path produces. `apps/web/lib/board/pass-reason.ts:42` already distinguishes the two cases
("NOT for rows backed by a real `gateDecision`. Those carry `decision.reason`"), which tells
you the authors expected real rows to exist. Every pass shown today is the synthesized
branch. That is a product claim ("here is why we passed") standing on an inference, not a
recorded decision.

Proposed fix: either persist a `GateDecision` at the point the scorer declines a game
(the natural home is beside the pick write in
`packages/ingestion-pipeline/src/process-sport.ts`, in the same transaction, so a pass is as
auditable as a pick), or delete the model and the five readers and let
`pass-reason.ts`'s derived path be the single, honestly-labelled source. The second is
smaller and loses nothing that exists today.

Risk of fix: writing gate decisions adds a row per declined game per cycle; note
`apps/web/lib/board/passes.ts:267` already flags that "GateDecision has no unique constraint
and this query takes the latest 100", so a writer needs a dedupe key designed alongside it.
That is schema work and therefore founder/migration territory, not an agent edit.

---

### F6 — MAJOR — `PerformanceSummary` is read by `/performance` and written by nothing

`apps/web/app/performance/page.tsx:674-680`

```ts
async function getPerformanceSummaries(): Promise<PerformanceSummary[]> {
  return db.performanceSummary.findMany({ orderBy: [{ period: "desc" }, { totalPicks: "desc" }], take: 100 })
    as Promise<PerformanceSummary[]>;
}
```

Writers: none — no Prisma call site, and no raw SQL against `"performance_summaries"`
(`@@map` at `schema.prisma:1382`).

What is wrong: the public track-record page is gated behind `canExposePerformanceStats`
(the page's own comment at `:671-673` says the call site is guarded), which is correct and
must stay that way. But the table behind the gate has no producer, so the gate currently
guards an empty surface. That matters for a decision that is live in AGENTS.md: the
`PERFORMANCE_STATS` flip is described there as one of the two remaining public flips. If it
were flipped today, `/performance` would render a track-record page with zero rows.

To be explicit, because this is exactly the kind of thing that gets misread: **this is not a
recommendation to flip anything.** It is a statement that the flip's precondition is not
only calibration eligibility; there is also no writer for the table the page reads.

Proposed fix: before that flip is ever considered, either wire a producer (the natural
source is the settled-pick aggregate the calibration cron already computes) or repoint
`/performance` at the durable calibration surface that *is* populated
(`apps/web/lib/ops/calibration-eligibility-durable.ts`, `loadLatestCalibrationMetrics`,
already read by `apps/web/app/fable/proof-dashboard.tsx:3`). Either way this is founder-gated
work, not an agent edit.

Risk of fix: none while the gate stays closed.

---

### F7 — MAJOR — `packages/feature-store` has zero importers; CLAUDE.md lists it as a hot path

CLAUDE.md's Repository Structure section lists
`packages/feature-store/   — Derived features for the engine` among the hot paths.

Measured: `grep -rn "@sports/feature-store"` across `apps packages workers scripts`, minus
the package itself, returns exactly one line, and it is not an import:

```
packages/stats-api/package.json:13:    "@sports/feature-store": "1.0.0"
```

`grep -rn "feature-store" packages/stats-api/src` returns three prose comments
(`providers/registry.ts:3`, `pit-validate.ts:2`, `hydration/strategies.ts:131`) and no
import statement. The package is also absent from `apps/web/next.config.mjs`'s
`transpilePackages` list (`:14-23`), which is the set of workspace packages the Next build
actually compiles.

The package is 12 files / 1438 lines. Its store is explicitly in-memory and non-durable:
`packages/feature-store/src/store.ts:29` `export class InMemoryFeatureStore implements
FeatureStore` with `private readonly rows = new Map<...>()`. Its `package.json` has no
runtime dependencies at all.

Compounding it: `packages/stats-api/src/providers/registry.ts:68-75` defines a
`feature_store` routing entry, and `apps/web/lib/gse-stats/value-provider.ts:49-56` never
injects one, so that branch is dead code guarding a dead package.

What is wrong: the documentation names a package as part of the engine's feature path. No
byte of it executes in the running product. An agent reading CLAUDE.md to find where derived
features live is sent to a dead end.

Proposed fix: correct the CLAUDE.md line to say what is true (a designed, tested, not-yet-wired
feature store with no importers), and drop the unused `@sports/feature-store` dependency
declaration from `packages/stats-api/package.json` so the dependency graph stops implying a
link that does not exist. Do not delete the package on this evidence alone; it is coherent,
tested code and the decision to wire or retire it is the founder's.

Risk of fix: doc + one dependency line. None.

---

### F8 — MAJOR — six workspace packages have no importer outside their own tests

Measured by the importer grep above. For each, "importers" means a source file outside the
package that imports its `@sports/*` name or a path inside it.

| Package | LOC (src/*.ts) | Importers outside own tests | How it is reached, if at all |
|---|---|---|---|
| `@sports/feature-store` | 1438 | **0** | nothing (see F7) |
| `@sports/ai-council` | 1202 | **0** | CI only: `npm run guard:ai-council` → `npm run test --workspace=@sports/ai-council`; also `scripts/guardrails/ai-council-ci.mjs:13-21` |
| `@sports/genesis-kernel` | 1690 | **0** | CLI only: `npm run genesis:scan` / `genesis:plan` → `tsx packages/genesis-kernel/src/{scan,plan}-cli.ts` |
| `@sports/ops` | 120 | **0** | nothing |
| `@sports/partner-stack` | 488 | **0** | nothing |
| `@sports/phase-c` | 280 | **0** | nothing. Note `npm run gate:phase-c` runs `scripts/edge-lab/gate-slate-phase-c-counts.ts`, which imports `@sports/db` and `@sports/prediction-engine` (`:52-53`) and **not** `@sports/phase-c` |

Each has its own test directory (`ls packages/<p>/src/__tests__`: `council.test.ts`;
`planner/structural/twin.test.ts`; `hydrate-force.test.ts`; `entitlements/partner-stack.test.ts`;
`remeasure.test.ts`; `feast-arch/feature-store/pit-validate.test.ts`), so `npm run test
--workspaces` is green on all of them. That is the trap: the suite is green, so nothing
signals that the code is unreachable.

`@sports/ops` deserves a specific note: it is 120 lines whose entire content is the
hydrate-force checklist that F3 shows is factually wrong about step 1. A checklist that
nothing imports cannot be enforced, and it is currently also inaccurate.

What is wrong: about 5,200 lines of tested TypeScript that reads as product and is not.
This is the direct answer to the dimension's question. Nothing here is dishonest on its own;
the risk is that it inflates the apparent surface area of the system and that a future
session will "fix a bug" in code that never runs.

Proposed fix: add a one-line "Wiring" header to each package README stating the truth —
`CI-only`, `CLI-only`, or `no importers`. `.claude/rules/` and `.github/workflows/` are
frozen by AGENTS.md law 2 so a guard script is not an agent's to add; the README line is.
CLAUDE.md already hedges ("several have no importers yet") for the
`{epistemic-twin,genesis-kernel,governed,ops,partner-stack,phase-c,quote-plane}` group; the
correction needed there is that `epistemic-twin`, `governed` and `quote-plane` are NOT in
that group (they have real importers — see the CORRECT section), while `feature-store` and
`ai-council`, which are listed elsewhere, ARE.

Risk of fix: documentation only.

---

### F9 — MAJOR — three nflverse ingestion writers are called only by their own tests, and one of them feeds a premium API

| Writer | Table | Called by | Table read by |
|---|---|---|---|
| `ingestPfrAdvStats` (`apps/web/lib/ingestion/pfr-adv-stats.ts:112`) | `PfrAdvStat` | only `apps/web/__tests__/ingest-pfr-adv-stats.test.ts:22` | nobody |
| `ingestTeamWeekStats` (`apps/web/lib/ingestion/team-week-stats.ts:80`) | `TeamWeekStat` | only `apps/web/__tests__/ingest-team-week-stats.test.ts:10` | nobody |
| `ingestRushTendencies` (`apps/web/lib/ingestion/rush-tendencies.ts:44`) | `PlayerRushProfile` | only `apps/web/__tests__/ingest-rush-tendencies.test.ts:10` | `apps/web/lib/intelligence/rush-schemes.ts:43` |

`grep -rn "ingestPfrAdvStats\|ingestTeamWeekStats\|ingestRushTendencies"` outside
`__tests__` returns only the three `export async function` definitions themselves. Reads
were confirmed with the multiline ripgrep
`(nextGenStat|pfrAdvStat|teamWeekStat)\s*\n?\s*\.\s*(findMany|findFirst|findUnique|count|aggregate|groupBy)`,
which matched only `nextGenStat`, and with `grep -rn '"pfr_adv_stats"'` /
`'"team_week_stats"'` for a raw-SQL escape hatch, which matched nothing.

The third row is the one that reaches a customer. `PlayerRushProfile` is read by
`loadRushSchemes`, which is served by `apps/web/app/api/intelligence/rush-schemes/route.ts:7`
behind `requirePremiumApiRateLimited("intelligence/rush-schemes")` (`:13`). A Pro or Elite
subscriber hits a premium-gated endpoint whose backing table has no producer in production.

Note also `NextGenStat`: it *is* written, three times per run, by the every-30-minutes
`refresh-player-stats` cron (`apps/web/app/api/cron/refresh-player-stats/route.ts:127-129`),
and it is read by exactly one place, `apps/web/lib/reconstruction/separation-surface.ts:129`,
which serves `apps/web/app/intelligence/reconstruction/page.tsx`. It never reaches the
scorer. That is under-leverage rather than a break, but it is worth knowing that a
half-hourly ingest exists to feed one page.

What is wrong: two write paths that exist only to satisfy tests, and one premium endpoint
whose data source is never populated.

Proposed fix: for `rush-schemes`, either call `ingestRushTendencies` from
`refresh-player-stats` alongside the three `ingestNextGenStats` calls it already makes, or
have the route return its existing empty/refuse shape with an explicit "not yet ingested"
reason rather than a silently empty premium payload. For `PfrAdvStat` and `TeamWeekStat`,
say so in the module docstring (`not wired; no consumer`) so the next reader does not assume
a cron exists.

Risk of fix: calling `ingestRushTendencies` in the satellite block adds one more nflverse
fetch to a 300s-budget route that already performs six ingests
(`refresh-player-stats/route.ts:124-129`); it must be measured, not assumed to fit.

---

### F10 — MAJOR — the workers tree does not match how CLAUDE.md says it runs, and two of the four are stubs

CLAUDE.md: "`workers/{data-refresh,pick-generation,content-publishing,airwave-listener}/` —
Background jobs driven by Vercel Cron routes (no queue library)".

Measured:

- No `@sports/worker-*` name is imported anywhere. `grep -rn "@sports/worker-<name>"` across
  `apps packages workers scripts .github docker` returns, for each of the four, exactly one
  line: its own `package.json:2` `"name"` field. The Vercel cron routes call
  `@sports/ingestion-pipeline` directly (`apps/web/app/api/cron/refresh-odds/route.ts:47`
  `import { refreshOdds } from "@sports/ingestion-pipeline"`), not the workers.
- The workers are containers, not cron targets: `docker/oracle-vps/compose.yml:78-110`
  builds three of them from `workers/<name>/Dockerfile`.
- `workers/pick-generation` is a 19-line no-op. Its entire body
  (`workers/pick-generation/src/index.ts:16-18`) logs two lines and calls `process.exit(0)`;
  the compose entry marks it `restart: "no"` because of that (`compose.yml:88-96`).
- `workers/content-publishing` is a deliberate kill switch (`src/index.ts:1-12`,
  `runContentPublisher` refuses whenever `INTERNAL_CALIBRATION_ONLY !== "false"`), also
  `restart: "no"` (`compose.yml:100-110`). This one is correct and intentional.
- `workers/airwave-listener` has no Dockerfile (`ls workers/*/Dockerfile` finds three, not
  four), no compose entry, and its only script is `dry-run`. Its single source file imports
  across the workspace boundary by relative path —
  `workers/airwave-listener/src/dry-run.ts:23-38` imports
  `"../../../apps/web/lib/airwave/channel-87-schedule"` and two siblings — which is not a
  workspace dependency and would not resolve in a container build.
- `compose.yml:74` labels the block "── BullMQ workers ──". `grep -rn "bullmq" --include=package.json`
  across the repo returns nothing. There is no BullMQ.

What is wrong: a reader of CLAUDE.md believes there are four cron-driven background jobs.
There are zero cron-driven workers; one real container job that duplicates the cron path
(`workers/data-refresh/src/refresh-cycle.ts:19` imports the same `processSport`), two
intentional stubs, and one worker that is not deployable.

Proposed fix: correct the CLAUDE.md line to "standalone container jobs (docker/oracle-vps),
not Vercel Cron; `data-refresh` duplicates the cron path, `pick-generation` and
`content-publishing` are deliberate no-op stubs, `airwave-listener` is a dry-run script".
Fix the "BullMQ workers" comment in `compose.yml:74` — there is no queue.

Risk of fix: documentation and a comment. None.

---

### F11 — MAJOR — `packages/quote-plane` (3573 lines) has one entry point, and that entry point is not scheduled

`apps/web/app/api/cron/gamma/route.ts:9` says:

```
 * Schedule: vercel.json every 30 minutes (ADD — keep existing crons)
```

and `:34-38` configures the runner with `scheduleCron: "*/30 * * * *"`.

Measured: `/api/cron/gamma` is **not** in `apps/web/vercel.json`'s `crons` array. The set
difference of route directories against scheduled paths is exactly
`{backfill-historical-games, backfill-player-data, backtest-calibration, gamma}`. The root
`vercel.json` is byte-identical on the cron list (`diff` of the extracted paths reports no
difference).

The other three unscheduled routes are honest about it. `backtest-calibration`
(`route.ts:14-19`) says in a banner: "NOT LIVE. GATED OFF BY DEFAULT. NOT REGISTERED IN
vercel.json." `backfill-historical-games` (`:1-4`) and `backfill-player-data` (`:1-17`) both
document themselves as operator-invoked. Only `gamma` claims a schedule it does not have.

Second half of the same finding: even if it ran, its output goes nowhere.
`apps/web/app/api/cron/gamma/route.ts:31` `const archive = new ClosingArchive()` is
process-local, and `grep -rn "@sports/quote-plane"` returns only three lines repo-wide —
`next.config.mjs:23` (transpile list), `apps/web/package.json:28` (dependency), and this
route's import at `:24`. No settlement, calibration or CLV path reads a `ClosingArchive`.

The Polymarket compliance hold is a real and correct posture (`.claude/skills/polymarket-hold`),
so the package being idle is not itself the problem. The problem is a docstring asserting a
schedule that does not exist, in a repo whose entire premise is that its own statements about
itself are true.

Proposed fix: change the `gamma` docstring line from "Schedule: vercel.json every 30 minutes"
to the same banner style `backtest-calibration` uses — not registered in `vercel.json`, held
pending the Polymarket compliance decision. Do not add the schedule.

Risk of fix: comment only.

---

### F12 — MINOR — the calibration cron writes seven JSON artifacts that nothing reads, with every write silently swallowed

`apps/web/app/api/cron/calibration-metrics/route.ts:305-306` builds
`path.join(process.cwd(), ".gse-local", "calibration")` and then writes
`metrics.json` (`:382`, `:419`), `bayes-bakeoff.json` (`:433`),
`resolution-by-group.json` (`:445`), `holdout-ranking-report.json` (`:458`),
`selective-publish-sweep.json` (`:463`), `calibration-map-bakeoff.json` (`:469`) and
`proven-path-plan.json` (`:487`). Every one is `.catch(() => undefined)`.

`grep -rn "gse-local"` across `apps scripts packages` returns five files: this route, plus
`lib/gse/waitlist-store.ts:58`, `lib/contests/week.ts:31`, `lib/contests/store.ts:34` and
`scripts/gse-waitlist-list.mjs`. None of them reads the `calibration/` subdirectory. The
path is gitignored (`.gitignore:89` and `:199`).

The durable half is fine and is the one that matters — `persistCalibrationMetrics` /
`evaluateAndPersistEligibility` (`route.ts:30-34`) write to the database and are read by
`/api/ops/public-surface-truth`, `/api/ops/daily-truth`, `health-alert` and
`apps/web/app/fable/proof-dashboard.tsx:3`.

What is wrong: on Vercel, `process.cwd()` is not writable, so these seven writes fail on
every run and the `.catch` hides it. Nothing reads them anyway. It is dead weight inside the
most safety-critical cron in the system, and a future reader may reasonably believe an
artifact exists to inspect.

Proposed fix: guard the whole artifact block behind a local/dev condition, or delete it.
The durable path already carries every value.

Risk of fix: local debugging loses the JSON dumps unless the dev guard is kept. Keep it.

---

### F13 — MINOR — `packages/sql/try_open_slate.sql` is not installed by any migration, and its planner is test-only

`packages/sql/` contains one file, `try_open_slate.sql`.
`grep -rln "try_open_slate" packages/db/prisma/` returns nothing — no migration creates the
function. `packages/ingestion-pipeline/src/open-via-sql.ts:22` documents the port as
"production: `$queryRaw`, tests: memory", and its two exports,
`planSlateOpeningFromSql` (`:31`) and `createMemoryTryOpenPort` (`:82`), are consumed only by
`packages/ingestion-pipeline/src/__tests__/open-via-sql.test.ts` and re-exported at
`packages/ingestion-pipeline/src/index.ts:100-101`.

The path that *is* live is the sibling: `planSlateOpeningFromDb`
(`slate-opening-reader.ts:52`), used by `apps/web/app/api/verify/slate/opening/route.ts:44,92`.

What is wrong: a second implementation of slate opening that cannot run, because the SQL
function it calls has never been created. Harmless today; a hazard if someone switches the
verify route to the "faster" SQL port.

Proposed fix: note in `open-via-sql.ts`'s header that the SQL function is not installed by
any migration and the module is not on a live path. Installing it is a migration and
therefore outside an agent's remit (AGENTS.md law 2 and law 7).

---

### F14 — MINOR — `compositeScore`, the "weight absolutely everything" matrix, is not in the betting scorer

`packages/prediction-engine/src/composite-score.ts:2` describes itself as
"Weighted composite score — the 'weight absolutely everything' matrix."

Its consumers are `apps/web/lib/fantasy/galaxy-index.ts:56,301`,
`apps/web/lib/scoring/player-composite.ts:19,243`, and
`packages/prediction-engine/src/signal-ledger.ts:31,97`. The picks scorer
(`packages/prediction-engine/src/scoring.ts`) does not import it; it builds its factor list
from `WEIGHTS` constants and `ctx.factors` (`scoring.ts:18`, `:214-367`, `:524`, `:572`,
`:791`, `:1010`, `:1060`).

Not a defect — the two are different products (fantasy player index vs betting picks). It is
listed because the naming invites the opposite conclusion, and because the freshness
half-life and confidence weighting that `compositeScore` implements are exactly the kind of
thing an auditor would expect to find in the pick factor trail and will not.

Proposed fix: one clarifying line in the `composite-score.ts` header naming its actual
consumers (fantasy galaxy index, player composite, signal ledger) and stating that the
betting scorer uses `scoring.ts`'s own weights.

---

### F15 — MINOR — eight `packages/data-ingestion` adapters have no consumer at symbol level

Measured by extracting every top-level export from each adapter and grepping those symbols
across `apps packages workers scripts`, excluding the package itself and all tests:

Zero consumers: `dfs-odds`, `novig-client`, `openfootball-source`, `predexon-client`,
`prophetx-client`, `reddit-narrative-source`, `sharp-api-client`, `stats-provider`.

`predexon-client` being unconsumed is *consistent* with AGENTS.md, which states plainly
"Nothing on main consumes PredExon yet: that wiring plus re-landing the #680 core is the
work." I flag it only to confirm the ledger's claim is still accurate as of this tree, not
to contradict it.

The remainder are gated integrations (`isNovigRestEnabled`, `isProphetXMarketDataEnabled`,
`isSharpApiIngestEnabled`, `isDfsOddsEnabled` all exist as exported gate helpers) whose
call sites were never written. That is different from a gate being off: there is no code
path that would consult the gate.

Proposed fix: a `Wiring:` line in each adapter's header saying `no call site on main`.
Nothing should be deleted here without the founder's view on which second book is coming.

---

### F16 — MINOR — three Prisma models have no code path at all

After correcting my first pass for `$queryRaw` access (`FormalIncident`, `SrqcShadowMetric`,
`CtiCandidate` and `IndInvProposal` **are** used, through raw SQL in
`apps/web/lib/ai-control-plane/{ctiToProposals.ts:219,skillAugmentedCti.ts:178}` and the
control-plane tests; `RevenueEvent` and `ProductActivation` **are** used, via
`apps/web/lib/growth/cash-os.ts:110-184` and `scripts/growth/stripe-sync-revenue.ts:117`),
the genuinely unreferenced models are:

| Model | `@@map` | Evidence |
|---|---|---|
| `Signal` | `signals` (`schema.prisma:3181`) | no `db.signal.` call site; `grep -rn '"signals"'` matches only `apps/web/app/api/v1/signals/route.ts:47,91` where `surface: "signals"` is a string label, not the table |
| `Entity` | `entities` (`schema.prisma:3893`) | no `db.entity.` call site (the one grep hit, `apps/web/lib/watchlist/db.ts:186`, is the word "entity" in a comment); no raw SQL |
| `EntityEdge` | `entity_edges` | no call site, no raw SQL |

Note `Signal` is distinct from `GameSignal` (`schema.prisma:775`), which is live (3 writers,
3 readers).

What is wrong: three tables that migrations create and maintain and that nothing uses.
Small cost, but they widen the schema an auditor has to reason about.

Proposed fix: none an agent may take — `schema.prisma` and `migrations/**` are frozen by
AGENTS.md law 2. Recording it here is the action.

---

## What I checked and found CORRECT

The core money path funnels end to end. Each hop below was proven with an importer, not
inferred.

**Ingestion → scoring → picks.** `apps/web/app/api/cron/refresh-odds/route.ts:47` imports
`refreshOdds` from `@sports/ingestion-pipeline`; `refreshOdds` calls `processSport`
(`packages/ingestion-pipeline/src/refresh-odds.ts`, and the route's own comment at `:7-8`
says the two execution paths are shared so they "can never drift").
`process-sport.ts:25-52` imports `db` from `@sports/db`, twelve source functions from
`@sports/data-ingestion`, and `scoreGames`, `buildPickSignalSnapshot`,
`buildPickProofReceipt`, `selectionIsHomeSide` from `@sports/prediction-engine`. It writes
the pick at `process-sport.ts:1199` `db.pick.create`. The only other pick writer in the
product is `generate-signal-slate.ts:532`, driven by `/api/cron/generate-signal-slate`
(`route.ts:8,22`) and by `refresh-odds` (`route.ts:71-72`, `:122-123`). Everything else that
writes picks is a seed (`packages/db/prisma/seed.ts:1256`) or an operator backfill script
(`scripts/backfill/historical-settlement-backfill.ts:353`).

**Independent fair values are a real spine, not a stub.**
`process-sport.ts:1007-1054` calls `buildIndependentFairValues` and threads the result into
the scorer's context; `packages/prediction-engine/src/scoring.ts:539` and `:1017` read
`input.context?.independentFairValues`. `build-independent-fair-values.ts:576-660` is the
single convergence point for six adapters, and symbol-level grep confirms it is the *only*
consumer of each: `clubelo-client`, `espn-powerindex-client`, `kalshi-client`,
`mlb-statsapi-client`, `team-rates-source`, and `polymarket-independent-client` (which is
also read by `packages/quote-plane/src/providers/polymarket-gamma.ts`). ESPN PowerIndex is
correctly fail-closed behind a rights gate that reads the environment rather than a code
default (`build-independent-fair-values.ts:601-611`, `isEspnPowerIndexCleared`).

**`TeamGameEfficiency` is genuinely consumed by the engine.** Written by
`apps/web/lib/ingestion/team-efficiency.ts:157-158` (driven by the daily
`backfill-team-efficiency` cron), read by
`packages/ingestion-pipeline/src/build-independent-fair-values.ts:368` and by
`apps/web/lib/intelligence/team-ratings.ts:25`. This is the one derived-feature table that
reaches the scorer.

**`/api/picks` enforces entitlement server-side.** `apps/web/app/api/picks/route.ts:4`
imports `getUserEntitlements`; the DB query itself is narrowed by entitlement
(`:134` forces `tier: "FREE"` for viewers without `canSeePremiumPicks`, `:136` gates the
grade filter, `:167` and `:214-215` cap the row count), and confidence, factor breakdown and
line movement are each gated at serialization time (`:229`, `:249`, `:293`, `:326-329`).
No frontend-only paywall on this route.

**Settlement is wired and transactional at the outbox boundary.**
`apps/web/app/api/cron/settle-picks/route.ts:33-55` imports `@sports/db`,
`@sports/data-ingestion`'s `SUPPORTED_SPORTS`, four symbols from `@sports/ingestion-pipeline`
(including `freezeSlateCommitments`), the outbox worker, the free-path settlement runner,
score persistence, backfill, path selection, settlement health, CLV drain and the zero-sit
lane. `deliver-settlement-alerts` (`route.ts:1-10`) drains the `PickSettlementEvent` rows
that `settle-sport.ts` appends in the same transaction as the PENDING→result update. That is
a real outbox, not a fire-and-forget.

**Calibration is durable and its readers exist.** The `40 */6 * * *` cron
(`apps/web/app/api/cron/calibration-metrics/route.ts:20-59`) imports the real metric
functions from `@sports/prediction-engine` (`brierDecomposition`,
`expectedCalibrationError`, `reliabilityCurve`) rather than reimplementing them, and
persists through `persistCalibrationMetrics` / `evaluateAndPersistEligibility`. Those rows
are read by `/api/ops/public-surface-truth:44`, `/api/ops/daily-truth:25`,
`/api/cron/health-alert:28`, `apps/web/lib/ops/effective-performance-gate.ts:7` and
`apps/web/app/fable/proof-dashboard.tsx:3`. The route header's own law list is accurate
against the code I read.

**Calibration → pricing is advisory and human-gated, exactly as documented.**
`apps/web/lib/pricing/pricing-phases.ts:150` reads `PRICING_PHASE` from the environment and
defaults to the lowest phase; `evaluatePhaseAdvance`
(`apps/web/lib/pricing/phase-readiness.ts:48`) evaluates the ladder's `triggerMetrics`
against measured values and is consumed by exactly one place —
`apps/web/app/api/ops/public-surface-truth/route.ts:15`. Nothing auto-advances. That is the
correct shape for the honesty boundary and I am not proposing to change it.

**`FilterStateSnapshot` is written, contrary to my first-pass grep.** My single-line regex
missed `db.filterStateSnapshot\n  .upsert({...})`. The writer is
`apps/web/lib/ops/shadow-signal-store.ts:176-198`; readers are the same file at `:116` and
`scripts/ops/verify-shadow-pipeline.ts:35`. Recording the correction because a wrong "dead
table" claim is worse than no claim.

**Contest entries and waitlist leads are serverless-safe.** Both use a Postgres-first dual
backend with an honest refusal on Vercel-plus-stub rather than an ephemeral file:
`apps/web/lib/contests/store.ts:25-29` and `apps/web/lib/gse/waitlist-store.ts:48-52`.

**`epistemic-twin`, `governed`, `crypto`, `compliance`, `util`, `stats-api` are all really
imported.** `@sports/epistemic-twin` → `apps/web/lib/health/capability-graph.ts:35` →
`apps/web/app/api/health/route.ts:4`. `@sports/governed` → `apps/web/app/api/receipts/verify/route.ts:11`,
`apps/web/lib/governed/keyring-singleton.ts:18`, `apps/web/lib/ai-control-plane/governed-gate.ts:21`.
`@sports/crypto` → `packages/ingestion-pipeline/src/{slate-opening-reader.ts:36,freeze-slate-commitments.ts:59,open-via-sql.ts:10}`,
and `freezeSlateCommitments` is called from `apps/web/app/api/cron/settle-picks/route.ts:188`
and `packages/ingestion-pipeline/src/refresh-odds.ts:60`. `@sports/compliance` →
`apps/web/app/admin/compliance/page.tsx:3` and `scripts/compliance/*`. `@sports/util` →
`apps/web/lib/cron/authorize.ts:6` and `packages/quote-plane/src/cron/gamma-cron.ts:10`.
`@sports/stats-api` → 16 route files under `apps/web/app/api/gse/v1/` plus
`apps/web/lib/gse-stats/*` and `workers/data-refresh/src/hydrate-cold-plane.ts`.

**The root and app `vercel.json` cron lists are identical.** `diff` of the extracted path
lists reports no difference, so the mirrored file has not drifted.

**Every scheduled cron other than the ones named in the findings has a real consumer.** I
read the headers of `deliver-settlement-alerts`, `free-spine-health`,
`drain-ai-telemetry-recovery`, `prune-rate-limits`, `repair-checkout-attempts`,
`reconcile-entitlements`, `backfill-independent-trueprob`, `backfill-team-efficiency`,
`health-alert`, `autonomy-cycle` and `jarvis-snapshot`. Each names a downstream reader and
each reader exists — for example `jarvis-snapshot` → `persistJarvisHistorySnapshot` →
`loadDurableJarvisHistory` at `apps/web/app/api/cockpit/jarvis/trend/route.ts:15`.
`prune-rate-limits`' own header records that its function previously had zero production
callers and that the cron is what made the retention bound enforced, which is the pattern
this whole audit is looking for and an instance of it being handled correctly.

---

## What I could not check and why

- **Row counts, table population, and whether any of these dead tables happen to hold
  historical data.** I have no database access in this session and did not attempt any. Every
  "no writer" claim above is a claim about *code paths in this tree*, not about whether rows
  exist in production. A table with no writer today may still hold rows a previous version
  wrote.
- **Whether the four unscheduled cron routes are invoked by an external scheduler.** I can
  see they are absent from both `vercel.json` files. An outside caller (GitHub Actions, a
  cron box, a manual curl) would not be visible from the repository, and I did not read
  `.github/workflows/` in depth beyond confirming the test job runs all workspaces.
- **Whether the Oracle VPS compose stack is actually deployed.** `docker/oracle-vps/compose.yml`
  exists and is coherent; whether a box is running it is an operational fact I cannot observe.
  If it is running, `workers/data-refresh` is a second live writer of picks alongside the
  Vercel crons, which would be worth confirming — I did **not** verify it either way.
- **Runtime behaviour of `/api/gse/v1/values`.** F1 and F2 are read from source. I did not
  issue a request against production or a local server, so the specific response bodies are
  derived from code, not observed. The code path is unconditional, but "unconditional in
  source" is weaker evidence than a captured response.
- **The 89% missing-`marketFairProb` figure and the C-247 score-integrity numbers.** Both were
  established before this session and I took them as given; I did not re-derive either and my
  findings do not depend on them.
- **`packages/dev-tools/context-compiler`.** It carries its own `package.json`,
  `package-lock.json` and `vitest.config.ts` but sits two levels deep, so the `packages/*`
  workspace glob does not match it. I did not audit its contents; it is outside the funnel by
  construction.
- **Import-graph completeness for dynamic imports.** I searched static imports and
  `await import(...)` forms I happened to see (for example
  `apps/web/app/api/cron/refresh-odds/route.ts:71` and `:122`). A symbol reached only through
  a computed dynamic specifier would not appear in my counts. I saw no evidence of that
  pattern, but I did not prove its absence.
