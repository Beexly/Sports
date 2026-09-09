# Two paid API surfaces return invented numbers stamped as sourced — 2026-09-08

Read-only source verification. Every quotation below is copied from the file and line named.
Found by the ten-dimension audit (`docs/ops/audit-2026-09-08/pipeline-funnel.md`) and then
re-verified by hand, because the audit's own verify stage died on a usage limit and because a
finding this serious is not something to relay second-hand.

**This violates CLAUDE.md rule 1 (no fake data), rule 2 (no fabricated stats) and AGENTS.md
law 8 (never fabricate product data, anywhere).** It outranks every other finding on this
branch, including the coin-flip edge: that was a real computation with honest copy beside it.
This is a made-up number wearing a provenance badge.

---

## 1. `GET /api/gse/v1/values/:metricId` returns a hash of the question as the answer

`apps/web/lib/gse-stats/value-provider.ts:28-40`, verbatim:

```ts
const demo: ValueProvider = (metric, entityId) => {
  const loose = `${metric.id}|${entityId}`;
  if (loose in SEED) return SEED[loose]!;
  if (metric.status === "ACTIVE" && metric.publicApi && metric.family !== "calibration") {
    let h = 0;
    const s = `${metric.id}:${entityId}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    const u = (Math.abs(h) % 10000) / 10000;
    if (metric.unit === "count" || metric.unit === "yds") return Math.round(u * 100);
    if (metric.unit === "rate" || metric.unit === "prob") return Math.round(u * 1000) / 1000;
    return u;
  }
  return null;
};
```

The value returned for a metric is a `charCodeAt` hash of the string `"<metricId>:<entityId>"`,
taken modulo 10000. It is stable, so it looks like a real measurement that does not change when
you refetch. It is a function of the NAME of the thing being asked about and nothing else.

The branch fires for any metric that is `ACTIVE`, `publicApi`, and not in the `calibration`
family. There is also a hardcoded `SEED` (same file, lines 20-26) containing
`"gse.edge_index|demo_game": 0.041` and `"mkt.consensus.spread.novig|demo_game": 0.52`.

**What the response wraps it in.** `packages/stats-api/src/values.ts:106-122`, verbatim:

```ts
  return {
    ok: true,
    status: 200,
    data: {
      metricId: metric.id,
      entityId: req.entityId,
      asOf: pit.asOfIso,
      value,
      unit: metric.unit,
      provenance: {
        sourceIds: metric.sourceIds,
        rights: metric.rights.rights,
        pitCorrect: true,
        modelVersion: null,
      },
      attribution,
    },
  };
```

`sourceIds` comes from the metric definition. For the market metrics that is
`["odds.the_odds_api"]` (`packages/stats-api/src/catalog.ts:386` and `:400`). `pitCorrect` is
the literal `true`, hardcoded, with no reference to which provider produced the value.

So a caller receives a hash of a string, labelled as having come from The Odds API and as being
point-in-time correct.

**The mitigation, stated fairly.** The route adds a `_note`
(`apps/web/app/api/gse/v1/values/[metricId]/route.ts:52`):

> "Session tier authority. Demo/memory provider until full FeatureStore loaders land. Not a
> performance claim."

That is a real disclaimer and it was written in good faith. It does not resolve the problem. It
sits BESIDE a machine-readable `provenance` block that asserts the opposite, and a B2B
integrator parses the structured field, not the prose. Two statements in one payload contradict
each other and only one of them is in a field a program reads.

**The honest path already exists and is unreachable.** `packages/stats-api/src/values.ts:91-99`:

```ts
  if (!provider) {
    return {
      ok: false,
      status: 501,
      code: "provider_unwired",
      error:
        "Metric contract exists; value provider not wired for this metric yet (definition-first API).",
    };
  }
```

The route always passes `demoValueProvider`, so `provider` is never undefined and this refusal
never fires.

**Reachability.** `resolveStatsBillingTier` gates by session Stripe tier and blocks `?tier=`
spoofing (verified: the audit's api-surface dimension checked this and found no elevation path).
So this is not open to the anonymous public. It is served to **paying subscribers** at whatever
tier each metric requires.

---

## 2. `POST /api/gse/v1/own/values` serves four hardcoded model probabilities, unauthenticated

`apps/web/app/api/gse/v1/own/values/route.ts:15`:

```ts
/** Process-local demo store — durable Prisma SoR is a follow-on. */
const store = createDemoOwnStore();
```

`packages/stats-api/src/own/handlers.ts:89-95`:

```ts
export function createDemoOwnStore(now = new Date()): OwnFeedMemoryStore {
  const store = new OwnFeedMemoryStore();
  const asOf = new Date(now.getTime() - 2 * 3600_000).toISOString();
  store.seedDemo("nfl:kc", asOf);
  store.seedDemo("nfl:phi", asOf);
  return store;
}
```

`packages/stats-api/src/own/memory-sor.ts:55-75`:

```ts
  seedDemo(entityId: string, asOf: string): void {
    const base: Omit<OwnFeatureRecord, "featureId" | "value"> = {
      entityId,
      asOf,
      plane: "model",
      ownership: "first_party",
      sourceId: "gse.own",
      pitCorrect: true,
      publicApiEligible: false,
      licenseSpdx: "LicenseRef-GSE-Internal",
    };
    this.put({ ...base, featureId: "own.model.p", value: 0.58 });
    this.put({ ...base, featureId: "own.model.p_lo", value: 0.54 });
    this.put({ ...base, featureId: "own.model.width", value: 0.08 });
    this.put({ ...base, featureId: "own.quote.q", value: 0.51, plane: "archive", sourceId: "quote.independent" });
```

Four invented model probabilities for the Chiefs and the Eagles, stamped `first_party`,
`sourceId: "gse.own"`, `pitCorrect: true`, under a GSE internal licence, with `asOf` computed as
two hours ago on every process start so the data always looks fresh.

**The route has no entitlement check at all.** Reading it top to bottom: a rate limit
(`consumeRateLimit`, 8/min by IP), a JSON parse, then `handleOwnValues`. No `gateApi`, no
`requirePremiumApi`, no `resolveB2bKeyScope`, no session read. Response headers assert
`X-GSE-API: stats.v1.own` and `X-GSE-PIT: required`.

The honest refusal exists here too: with an unseeded store, `handleOwnValues` returns its
`404 not_found` for an unknown entity.

---

## What is NOT established

- **No request was issued.** Both findings are read from source. The code paths are
  unconditional, but "unconditional in source" is weaker evidence than a captured response, and
  nobody has captured one.
- **Whether any customer has called these endpoints.** No traffic data was consulted.
- **Whether `own/values` being unauthenticated is deliberate.** `publicApiEligible: false` on
  every seeded record suggests the data was never meant to leave the building, which makes the
  missing gate look like an oversight rather than a decision, but that is an inference.

## The fix, and why it is not a judgement call

The repository's own law 8 forbids this outright, and in both cases the honest refusal is
already written and merely unreachable. Removing an invented number cannot be a regression: no
caller can be relying on the hash of a metric name being correct. The change is to stop
producing the fabrication so the refusal that already exists is the thing that answers.

---

## What was changed (2026-09-08, ledger C-259)

Three edits, each of which deletes a fabricated value so a refusal that was already written
becomes the thing that answers.

1. **`packages/stats-api/src/values.ts`** — `handleGetMetricValue` now refuses
   `404 no_value` when the provider yields `null`/`undefined`, instead of returning `200` with
   `value: null` inside a `provenance` block asserting `sourceIds`, `rights` and
   `pitCorrect: true`. Stamping a lineage on an absent value asserts that the absence came from
   those sources. `false`, `0` and `""` are real values and still pass through — a test pins
   that, because "refuse on falsy" would have been a silent API regression.

2. **`apps/web/lib/gse-stats/value-provider.ts`** — the `demo` provider is **deleted**, not
   narrowed. The routing table now wires `weather` (live Open-Meteo) and `nflverse` (memory
   store) only; every other metric routes to nothing, `createCompositeProvider` returns `null`,
   and finding 1's refusal answers. The `SEED` constant went with it, including
   `gse.edge_index|demo_game` and `mkt.consensus.spread.novig|demo_game` — a self-labelled demo
   entity id is not a defence when the response's machine-readable provenance names
   `odds.the_odds_api`. The export is renamed `demoValueProvider` → `wiredValueProvider` so the
   route reads as what it is. The route's `_note` no longer describes a demo provider.

3. **`apps/web/app/api/gse/v1/own/values/route.ts`** — `createDemoOwnStore()` becomes
   `new OwnFeedMemoryStore()`. The store is empty until a real writer hydrates it, so
   `readOwnValue`'s existing `404 not_found` answers. `createDemoOwnStore` stays in the package
   as a test fixture; nothing in `apps/web` imports it.

**Deliberately NOT changed.** The missing entitlement check on `own/values` is untouched. With
an empty store the route serves no data at all, so the gap leaks nothing today, and adding
authentication to a public B2B surface is an auth change rather than a correction — it stays
open above under "What is NOT established", and it needs a decision about who that endpoint is
for before a gate can be picked. `pitCorrect: true` remains hardcoded in the provenance block:
it is now only ever stamped on a value a wired loader actually returned, but it is still the
handler asserting something the provider never told it, and making providers report their own
PIT correctness is a contract change across every loader, not a one-line fix.

**Red-checked individually**, restoring each fabrication in turn against
`apps/web/__tests__/gse-v1-values-no-fabrication.test.ts` (7 tests):
reverting the `no_value` refusal fails 3; restoring the `demo` hash provider fails 2;
restoring `createDemoOwnStore()` fails 1.
