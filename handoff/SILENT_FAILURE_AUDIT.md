# SILENT FAILURE AUDIT — "a null/zero that looks like a reading"

**Date:** 2026-09-29 · **Branch:** `hermes-surf-16b` · **Mode:** read-only, no behaviour changed
**Trigger:** `docs/ops/PRODUCTION-INCIDENT-db-unreachable.md` — production Postgres
unreachable 8h+, 9+ deploys failed, and the outage was invisible rather than loud.

## RESULT

**Six instances of the incident's own defect class, outside the one already
found.** All six reproduce by executing the real repo functions — see
`handoff/silent-failure-proof.mjs` (exit 0, 0 refuted). Two are on the alerting
path itself: the thing that would have paged during this outage reported
"healthy" for the exact reason the outage went unnoticed.

The class is one sentence: **a healthy production records a value; a null,
zero, empty, or literal renders in the same shape; nothing downstream can tell
them apart.** The incident's tell was `remaining: null` where a number belongs.
That pattern recurs in five other places.

The repo already knows this class — `capability-state.ts:20` states "Absence of
coverage is NOT green" and `canonical-sample-posture.ts:74` documents an `error`
field for it. **These six are the places that rule was not applied.** The
findings are therefore consistency defects against the codebase's own stated
standard, not new opinions about how it should work.

---

## F1 — `oddsApiLowQuota` reports "quota fine" when the ledger is unreachable · HIGH

**`apps/web/app/api/cron/health-alert/route.ts:191-197`**

```ts
const credits = await loadOddsCreditTruth(db, new Date())
  .catch(() => emptyOddsCreditTruth());          // remaining: null
const oddsApiLowQuota = isLowQuota({
  oddsApiRemainingRequests: credits.remaining,   // null
});
```

`isLowQuota` (`packages/ingestion-pipeline/src/paid-run-accounting.ts:29`) is
`x != null && x < 10`. A `null` remaining short-circuits to **false — "not
low."** The `.catch()` converts a total ledger outage into exactly that null.

**Proven:** `isLowQuota(null) === false` and `isLowQuota(600) === false`. The
`oddsApiLowQuota` field in the alert payload is **byte-identical** for
"Postgres unreachable" and "600 credits, perfectly healthy."

This is the most consequential finding. It is the alerting cron — the one route
whose entire job is to notice — and the unmeasurable state resolves to the
*reassuring* branch. The neighbouring `WebhookOutcome` type in the same file
was explicitly reworked to separate `configured` from `delivered` for exactly
this reason (`route.ts:44-53`); `oddsApiLowQuota` was missed.

## F2 — Neon pool exhaustion invisible when the stats query throws · HIGH

**`packages/db/src/neon-pool-monitor.ts:154-159`**

```ts
let status: NeonPoolProbeStatus = "ok";                              // default ok
if (latencyMs != null && latencyMs > criticalMs) status = "degraded";
else if (latencyMs != null && latencyMs > degradedMs) status = "degraded";
if (activity.waiting != null && activity.waiting > 5 && status === "ok") {
  status = "degraded";
}
```

`activity` starts as all-null (`:115-120`) and the `pg_stat_activity` sample is
wrapped in a bare `catch { /* leave nulls */ }` (`:149-151`). If that query
throws, `waiting` is null, the `!= null` guard skips, and **status stays
`"ok"`** — on a connection pool this module exists to police.

**Proven:** `waiting=40` → `"degraded"`; `waiting=null` (query threw) → `"ok"`.
A pool 40 connections deep in wait reports healthy because the *measurement*
of it failed. Note the ping itself does fail correctly to `"down"` (`:99-112`)
— it is specifically the pool-contention dimension that goes dark.

## F3 — unmeasured `marketP` passes the edge publish filter · HIGH

**`apps/web/lib/calibration/selective-publish.ts:69-75`**

```ts
if (t.edge != null && t.edge > 0) {
  if (row.marketP != null && Number.isFinite(row.marketP)) {
    if (Math.abs(row.p - row.marketP) < t.edge) return false;
  }
  // no market line: allow in signal mode (edge filter N/A)
}
```

A null `marketP` — a pick with no market anchor, or a failed odds join — skips
the edge test entirely and is **allowed through**. The comment frames this as
"signal mode," which is a legitimate product choice; the defect is that the
*reason* is unobservable downstream. The published row carries no field
distinguishing "passed the edge filter" from "was never subjected to it."

**Proven:** `p=0.52, marketP=0.50, edge=0.05` → rejected; `p=0.52, marketP=null,
edge=0.05` → **allowed.** A pick 2 points from market value and a pick with no
market value at all take the same path. This one is also a *correctness*
concern, not only an observability one — it fails toward publishing.

## F4 — unmeasurable settlement never raises the P0 autonomy action · MEDIUM

**`apps/web/lib/autonomy/operating-kernel.ts:141`**

```ts
if (obs.settlementBand === "CRITICAL" || (obs.settlementOverdue ?? 0) >= 5) {
```

When the settlement query fails, `health-alert/route.ts:149-159` leaves
`settlementBand = "UNKNOWN"` and `overdue = null`. `"UNKNOWN" !== "CRITICAL"`
and `null ?? 0` is `0`, which is `< 5` — **the P0 drain action does not fire.**

**Proven:** `band="CRITICAL"` → fires; `band="UNKNOWN", overdue=null` → does
not fire. The plan reports a normal cycle while settlement is unknown, which is
the correct fail-safe for actions but means the operator's action queue looks
identical to a healthy one. `detail` on line 148 does render `"?"` for the
count, so the ambiguity is partly visible in prose and invisible in the
severity field.

## F5 — unmeasurable sample renders as a confident `0/100` blocker · MEDIUM

**`apps/web/app/api/ops/public-surface-truth/route.ts:695, 768-769`**

```ts
canonicalSettled: sample?.canonicalSettled ?? 0,   // → evaluateRevenueLadder
```

`sample` is null when the DB is unreachable (`route.ts:300-311`). The `?? 0`
turns "cannot read" into "zero settled picks."

**Proven:** `canonicalSettled=0` and `canonicalSettled=12` produce the **same**
`provenMet=false` verdict and the same blocker string `Settled sample 0/100`.
An operator reading the truth surface during an outage sees a specific,
confident, actionable-looking number that is pure fiction. This is the
incident's exact signature — a number where the truth was a null — reproduced
in the operator's remediation path.

The same `?? 0` reaches `evaluatePhaseAdvance` (`:694-699`).

## F6 — partial failure yields a self-inconsistent sample object · MEDIUM

**`apps/web/app/api/ops/public-surface-truth/route.ts:271-311`**

`settlement` (`loadSettlementHealth`) and `sample` (`loadCanonicalSamplePosture`)
are **separate queries in separate try/catch blocks**. A failure of only the
first gives `settlement = null`; the second still succeeds with real pick
counts. Line 304 then passes `commencedTotal: settlement?.commencedTotal ?? 0`.

**Proven:** the emitted object is `{commencedTotal: 0, canonicalSettled: 412}`
for both "settlement query failed" and "genuinely zero commenced." It is also
*internally* incoherent — 0 commenced but 412 settled — and nothing in the
payload says which half is real.

The repo already solved this one shape and did not apply it here:
`loadCanonicalSampleBySport` (`canonical-sample-posture.ts:73-79`) carries an
explicit `error?: string` with the comment *"a failed query must surface as a
failure, not silently coerce to an indistinguishable zero."* The aggregate
loader used by the truth surface has no equivalent.

---

## Latent trap, NOT a live bug (traced to a verdict, not filed as a defect)

`apps/web/app/api/health/route.ts:35` —
`Object.values(checks).every((c) => c.status === "ok")` is **vacuously true**
for an empty `checks`, which would mean `ok: true` + HTTP 200 with zero checks
run. Traced: **not reachable.** `computeLiveCapabilityProbes` assigns
`checks["database"]` and `checks["ingestion"]` unconditionally inside their own
try/catch (`live-capability-probes.ts:112-148`), so `checks` always has 2 keys.
Recorded so nobody re-reports it; it becomes live only if a future probe is
added *outside* those blocks.

## Clean sweeps (do not re-run)

- **`readOddsLineArchiveFreshnessSafely`** (`public-surface-truth/route.ts:210-229`)
  — fail-closed by construction: stub mode, a reader error, or a sync throw all
  route to the assessor, whose rule 3 judges absent input STALE, never healthy.
  This is the correct pattern and a model for the six above.
- **`assessSchedulerLiveness`** (`lib/ops/scheduler-liveness.ts:116-188`) —
  returns a distinct `"unknown"` status with evidence `none` on a failed query.
  Correct.
- **`computeLiveCapabilityProbes` settlement probe** (`:150-157`) — a throw sets
  `settlementBand = null`, which `capabilities` maps to `unknownCapability(...)`,
  never to healthy. Correct.
- **`process-sport.ts` `paidAccounting()`** (`:378-386`) — declared outside the
  `try` precisely so the failed envelope carries the same readings as the
  success one. This is the fix pattern the incident asks for, already applied to
  the accounting fields.

## Scanner

`handoff/silent-failure-scan.mjs` — 3361 files (node_modules/.next/build skipped).
`--selftest` proves all 4 rules can fire; **it caught two broken rules on first
run** (a backreference that could not match dotted member access, and a
constant-vs-literal confusion) which were fixed before the sweep was trusted.

| Rule | Hits | Signal |
|---|---|---|
| R1 zero-substitution into a proof evaluator | 22 | 5 real after reading |
| R2 null-as-healthy guard | 37 | 4 real after reading |
| R3 vacuous-truth aggregate | 10 | 0 live (1 latent) |
| R4 literal in measurement field | 72 | census only — not a defect list |

**R4 is a class-string census and is deliberately reported as an index, not as
72 findings.** A literal in a measurement-shaped field is normal, correct code
in almost every case. R1 and R2 are also over-inclusive by construction — a
`x != null` guard is right *unless* the null is fed onward to a monitor. Every
R1/R2 hit above was read in full before filing; the remainder are context-local
guards that do not escape their module.

## NOT DETERMINED

- Whether F1's `oddsApiLowQuota: false` was actually observed in production logs
  during the 8h window. The code path is proven; the log evidence is not in the
  repo. This needs the Vercel function logs.
- Whether F3's `marketP` nulls are common or rare in the live `Pick` rows. A
  count would settle whether this is a live publish-correctness issue or a
  theoretical one. No DB access was used.
- The other 32 R2 hits. Each is a one-line read; they were not individually
  traced because the rule over-selects by design.

## Suggested fixes (NOT applied — all are behaviour changes)

Ordered by blast radius. F1 and F2 are the two that would have changed what
happened during this outage.

1. **F1** — give `OddsCreditTruth` a tri-state for "ledger unreadable," or have
   `health-alert` report `oddsApiLowQuota: null` when `credits.remaining` is
   null, matching the `configured`/`delivered` split already in that file.
2. **F2** — on a failed `pg_stat_activity` sample, set `status = "degraded"`
   (or add a `partial: true` field) rather than leaving the `"ok"` default.
3. **F3** — carry a `marketPMeasured: boolean` on published rows so "passed the
   edge filter" and "was never filtered" are distinguishable.
4. **F4** — treat `settlementBand === "UNKNOWN"` as a P0 *investigation* action
   distinct from the P0 drain action.
5. **F5/F6** — add the `error?: string` field that
   `loadCanonicalSampleBySport` already has, and stop coercing `?? 0` before
   the proof evaluators; pass `null` and let the evaluator say "unknown."

Sealed paths (`schema.prisma`, `migrations/**`, `.github/workflows/**`,
`scripts/guardrails/**`, `.claude/**`, `.env*`) were not touched. No DB write,
no migration, no deploy, no env flip, no gate change. Branch unchanged.
