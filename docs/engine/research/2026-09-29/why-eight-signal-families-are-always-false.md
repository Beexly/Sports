# Why 8 signal families have never been present on a settled published pick (2026-09-29)

Follow-on to **SURF-10** (`642a3bb21`). That row measured it; this file states
**why**, with the exact code that produces the zero. Both causes are code, and
both are honest — nothing here is a silent failure. Read it before proposing
"wire up the missing signals", because the honest answer is that the data does
not exist, not that a writer is broken.

## The measurement

`scripts/ops/family-weight-evidence-census.ts`, read-only on Neon
`gse-postgres` branch `main`, role `hermes_ro`. Population: 3,493 settled,
non-bootstrap picks, joined `pick_signal_snapshots` → `picks`.

Eight families are `0 / 3493` — never true on a settled published pick:

```
injury  milestone  officials  pace  player  ratings  venue_env  weather
```

Their registry `trustWeight`s are therefore not "unmeasured" — there is nothing
to measure. A weight on a signal that has never been observed is a decoration.

## Cause 1 — the categories are hard-stamped BLOCKED (7 of 8)

All eight `had*Signal` booleans in
`packages/prediction-engine/src/signal-snapshot.ts` (lines ~180-189) are derived
from ONE set:

```ts
const activeShadowCategories = new Set(
  (context?.shadowEvidence ?? [])
    .filter((signal) => signal.activationStatus === "ACTIVE")
    .map((signal) => signal.sourceCategory),
);
```

`shadowEvidence` has exactly **one** producer in the whole repo:
`packages/ingestion-pipeline/src/process-sport.ts:1196`, calling
`buildMissingContextEvidence(fetchedAt)` (line 193):

```ts
function buildMissingContextEvidence(fetchedAt: Date): EvidenceRecord[] {
  return SHADOW_CONTEXT_CATEGORIES.map((category) => ({
    sourceCategory: category,
    sourceName: "not-configured",
    trustLevel: 0,
    isBootstrap: true,
    activationStatus: "BLOCKED_MISSING_SOURCE",   // <-- never "ACTIVE"
    freshnessStatus: "MISSING",
    whyUsedOrBlocked:
      `${category} is tracked in shadow mode only; ` +
      "no licensed context provider is configured, so it cannot affect confidence.",
  }));
}
```

`BLOCKED_MISSING_SOURCE` is filtered out by the `.filter(... === "ACTIVE")`
above, so `activeShadowCategories` is **structurally always empty** and every
flag derived from it is always `false`. The code says so in plain text. This is
the correct fail-closed behaviour: a signal with no licensed source must not
move a published number.

`SHADOW_CONTEXT_CATEGORIES` (line 182) covers 7 categories:

```
PLAYER_AVAILABILITY  OFFICIALS  VENUE_ENVIRONMENT  PACE
TEAM_RATES  STANDINGS  DIVISION_CONTEXT  MILESTONES
```

## Cause 2 — the categories are not even enumerated (WEATHER, INJURIES, RATINGS)

`weather`, `injury` and `ratings` are **absent from `SHADOW_CONTEXT_CATEGORIES`
entirely.** So even the `BLOCKED` audit-trail row is never emitted for them,
which is why they have no presence record at all rather than a false one.

Grepped for an ACTIVE producer of these three across `packages/` and `apps/`:
the only hits are `apps/web/lib/intelligence-core/engine.test.ts` and
`signal-adapters.test.ts` — **test fixtures**, never a production writer. There
is no code path anywhere that activates them.

## Cause 3 — the signal path sets no shadow evidence at all

`generate-signal-slate.ts` — the **signal** generation path — contains **zero**
occurrences of `shadowEvidence`. Only `process-sport.ts` (the book path) sets it.
So even if a source were configured, signal-path picks would not record the
context, and the two paths would not be comparable on this axis. This is a real
asymmetry between the paths, independent of the missing providers.

## What is NOT wrong

- The registry signals themselves are ACTIVE and do run: `kalshi`, `elo`,
  `poisson_dixon_coles`, `mlb_standings`, `nfl_epa_adj`, and the
  `CONTINUOUS_VALUE` family all carry `activationStatus: "ACTIVE"` and reach the
  slate.
- The flags are written honestly. Nothing inflates them.
- `hadOddsSignal: true` is a hard literal, correctly labelled in the writer as
  "odds are always the primary input".

## Therefore

The fix is **data licensing, not code**. Per
`docs/governance/ingest-and-learn-doctrine.md`, a restricted license means
learn-from, not discard — so each blocked category is a *provider
decision*, not a dead end. Until one is named and configured, the correct
behaviour is the current one: the flags stay `false` and the weights stay
unmeasured.

Do **not** flip the `BLOCKED_MISSING_SOURCE` stamps to ACTIVE to make the flags
move. That would make eight never-observed signals claim to have been observed
— a fabricated provenance record, and exactly what AGENTS.md law 8 forbids.

If a category's weight should be removed from the pool in the meantime, that is
a founder calibration decision, recorded as such, not a default.
