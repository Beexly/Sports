Fixes the two silent failures that made the 8-hour production outage of 2026-09-29 invisible — the two highest-value findings from that incident.

**Both are the same shape: an unmeasurable signal reported as measured-and-fine.** The repo already states the rule this breaks at `capability-state.ts:20` — *"Absence of coverage is NOT green."*

## F1 — a DB outage reported as "quota fine"

`health-alert/route.ts` did:

```ts
const credits = await loadOddsCreditTruth(db, now).catch(() => emptyOddsCreditTruth());
const oddsApiLowQuota = isLowQuota({ oddsApiRemainingRequests: credits.remaining });
```

`emptyOddsCreditTruth()` manufactures `remaining: null`, and `isLowQuota` is `x != null && x < 10` — so **null resolves to "not low."** The alert field was byte-identical for "Postgres unreachable" and "600 credits, perfectly healthy."

Worse, the `.catch()` never even fired: `loadLatestCreditObservation` swallowed the DB error two layers down and returned `null`, so the route never knew anything had failed.

The fix introduces an outcome type that can *represent* unreadable separately from empty:

```ts
export interface OddsCreditTruthOutcome {
  readonly truth: OddsCreditTruth;
  /** True when either ledger query threw. Never true for an empty-but-readable ledger. */
  readonly readFailed: boolean;
  readonly error: string | null;
}
```

`loadOddsCreditTruthOutcome` **never throws** — it reports failure through `readFailed`. The route keeps its never-throw guard and now reports red instead of fine.

## F2 — a saturated pool reported as "ok"

`neon-pool-monitor.ts` wrapped its `pg_stat_activity` sample in a bare `catch { /* leave nulls */ }`, leaving `waiting: null`. The `!= null` guard then skipped and `status` stayed `"ok"` — a pool 40 connections deep in wait reported healthy because the *measurement* of it failed.

The ping itself already failed correctly to `"down"`; it was specifically the pool-contention dimension that went dark. Now a failed sample yields an explicit unreadable state rather than a default-ok.

## Verified

| Suite | Result |
|---|---|
| `health-alert-decision.test.ts` | 12/12 |
| `odds-credit-governor.test.ts` | 61/61 |
| `neon-pool-monitor.test.ts` | 15/15 |

3 commits, 9 files, 670 insertions. Tests added at **both** layers — the decision function and the loaders beneath it — so the distinction between "unreadable" and "empty" is pinned where it is decided, not only where it is consumed.

**Not changed:** no gate, no weight, no `MODEL_VERSION`, no schema. This only changes what a monitoring surface *reports* when it cannot measure.