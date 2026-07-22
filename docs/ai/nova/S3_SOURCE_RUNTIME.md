# NOVA S3 — Source Registry / Runtime / Evidence

**Split unit:** S3 of the frozen `#146` reference branch (`fbc3cfe`), per the
NOVA convergence freeze (§4 S3) and the 2026-07-22 hardening directive (§12).
**Branch:** `nova/s3-source-runtime` (based on `nova/s1-domain-contracts`).
**Draft state:** `IMPLEMENTED_ON_DRAFT_BRANCH` / `NOT_MERGED` /
`NOT_PRODUCTION_ACTIVE`. Nothing here is scheduled, deployed, or activated.

## What S3 contains

| Surface | Path | Role |
| --- | --- | --- |
| Curated discovery registry (pure TS) | `apps/web/lib/opportunity-engine/source-registry.ts` | Deterministic catalog of first-party discovery sources; metadata capture contracts only |
| Change detection (pure TS) | `apps/web/lib/opportunity-engine/change-detection.ts` | Snapshot-to-snapshot NEW/UPDATED/REMOVED/UNCHANGED with graded materiality |
| Evidence assessment (pure TS) | `apps/web/lib/opportunity-engine/evidence.ts` | `assessEvidence()`; satisfies S1's injected `EvidenceAssessor` contract exactly |
| Operational polling registry | `data/nova/official-source-registry.json` | Schema v2: same-origin redirect policy, failure-alert threshold, freshness horizons; every source `enabled:false`, `validationState:candidate` |
| Runtime state machine (single executable authority) | `scripts/nova/source-runtime-core.mjs` | Outcomes, receipt schema, run records, checkpoints, salvage, leases, alerts |
| Source doctor | `scripts/nova/source-doctor.mjs` | Registry validation + bounded failed-closed polling with receipts |
| Per-source worker | `scripts/nova/source-worker.mjs` | Child-process isolation for hard timeouts/output ceilings |
| Cycle runner | `scripts/nova/run-cycle.mjs` | Lease, checkpoint-commit, salvage, FAILED_CLOSED recovery, append-only artifacts |
| Change intelligence | `scripts/nova/change-intelligence.mjs` | Deterministic event derivation, scoring, routing (verbatim from `fbc3cfe`) |

Zero Prisma anywhere in this unit — **S5 owns persistence**. Every runtime
artifact is an append-only JSON file under `reports/nova/source-runtime/`
(git-ignored; the directory is anchored by its `.gitignore`).

## Exact failed-closed outcome vocabulary

Per-source outcomes are exactly `FETCHED` / `NOT_MODIFIED` / `HELD` /
`FAILED`:

- `FETCHED` — 2xx response **with a schema-valid source receipt**.
- `NOT_MODIFIED` — 304 conditional response **with a schema-valid receipt**.
- `HELD` — policy deliberately withheld the fetch or refused the result
  (off-origin redirect, disallowed content type, size ceiling, allowlist
  refusal). Carries a `holdReason`.
- `FAILED` — network error, timeout, HTTP error, parse failure, or a claimed
  success whose receipt is missing or invalid (demoted, never trusted).

**No receipt means HELD or FAILED — never promoted.** Only `FETCHED` and
`NOT_MODIFIED` with valid receipts may update accepted snapshots or emit
change events (`classifySourceResult` / `canPromoteSourceResult`, tested
exhaustively in `scripts/nova/source-runtime.test.mjs`).

## Source receipt schema (v1)

Every promotable result carries: `sourceId`, `url` (final, https), `fetchedAt`,
`httpStatus`, `contentType`, `contentLength`, `contentHash`
(`sha256:<hex64>`; null only for 304), `parserVersion`, `redirectChain`
(ordered https hops with 3xx statuses), `effectiveTime` (source-declared
publication/effective moment, nullable) vs `recordedTime` (when this runtime
recorded it), and `freshnessHorizonMinutes`. `receiptFreshness()` grades
FRESH/STALE/INVALID; an invalid receipt is never fresh.

## Run lease, checkpoints, salvage, and model-switch recovery

- **Lease:** one cycle at a time (`run-lease.json`). Active blocks; expired is
  taken over; corrupt blocks until provably stale by mtime (fail closed).
- **Checkpoint commit:** after each source the cycle durably writes, in order,
  (1) an immutable checkpoint (result + per-source state delta + events),
  (2) the append-only event/alert logs, (3) the state snapshot.
- **Recovery:** on next start, a run record with **no terminal state** (crash,
  kill, or model switch mid-run — the same failure mode that killed the #146
  inventory subagent) is **`FAILED_CLOSED`**. It is never silently resumed as
  success. Its checkpoints are salvaged exactly once: state deltas replayed
  idempotently, missing events appended after a presence check against the
  log, and the successor run skips every salvaged source. Double-counting is
  impossible at every crash point (tested at each one).
- Terminal run receipts under `runs/` are write-once (append-only).

## Redirect / content-type / size policy

- Redirects are **same-origin only by default** (`policy.redirectPolicy:
  "same_origin"`); even the explicit `allowlisted_hosts` mode still requires
  the target host to be in the source's `allowedHosts`. HTTPS only, no
  credentials, bounded hop count, full chain recorded on the receipt.
- Content types are allowlisted per parser; anything else is a `HELD`.
- Declared or received bytes above the ceiling abort the read (`HELD`).

## Consecutive-failure alerts

After `policy.failureAlertThreshold` consecutive non-promotable outcomes for
the same source (and again at exact doublings), a structured
`SOURCE_CONSECUTIVE_FAILURE_ALERT` record is appended under `alerts/`. It is a
**record only** — `delivery: RECORD_ONLY_NO_NOTIFICATION_WIRED`; no email,
push, or webhook is wired. S4 surfaces these in the owner queue.

## Deterministic convergence-inventory capability

S3 **consumes** the deterministic convergence-inventory tooling owned by the
`nova/convergence-inventory-tooling` unit and references it **by npm script
name only**: `npm run nova:inventory` (build) and `npm run nova:inventory:verify`
(verify). The capability descriptor
(`CONVERGENCE_INVENTORY_CAPABILITY`) is recorded on every run receipt. S3 does
not rebuild, wrap, or fork that tooling. A model may interpret the inventory
receipt; it may not manufacture it.

## Historical receipts doctrine

**Historical NOVA source-validation receipts remain `FAILED_CLOSED`.** The
2026-07-21 live source validation produced no receipt
(`NOVA_LIVE_SOURCE_VALIDATION_REPORT`); under this unit's rules that outcome
is and stays `FAILED_CLOSED` and is never retroactively promoted
(`HISTORICAL_SOURCE_VALIDATION_DOCTRINE`). The same applies to the #146
inventory-subagent run that died on a model switch: `FAILED_CLOSED`, with the
deterministic tooling above as the replacement, not a retroactive pass.

## Scraping posture (unchanged)

The runtime performs read-only, conditional HTTPS GETs of registry-allowlisted
official metadata sources with one declared user agent. Any extraction beyond
registry-authorized public metadata capture MUST pass `checkClearance()`
(`apps/web/lib/scraping/clearance-engine.ts`) before running. No CAPTCHA,
login, or paywall bypass. No proxy rotation. No cookies, no credentials, no
auto-install, no execution of discovered code, zero billable model calls
(`billableModelCalls: 0` is asserted on every run receipt).

## Commands

```
npm run nova:doctor         # validate the operational registry (offline)
npm run nova:cycle:dry      # select due sources, no network, no writes
npm run nova:cycle          # one governed cycle (draft tooling; not scheduled)
npm run nova:test           # vitest: registry/change-detection/evidence
npm run nova:runtime:test   # node:test: state machine, salvage, fail-closed paths
```

## Tests

- `scripts/nova/source-runtime.test.mjs` — exhaustive outcome matrix (every
  claim × receipt-validity combination), receipt schema field-by-field,
  freshness, redirect/content-type/size policy, lease lifecycle, run-record
  terminal-state machine, checkpoint salvage, crash-point recovery (before
  event append, after event append, zero checkpoints), alert cadence,
  append-only receipts, dry-run purity.
- `scripts/nova/nova-intelligence.test.mjs` — change intelligence + source
  doctor behavior (adapted from `fbc3cfe`).
- `apps/web/__tests__/nova-source-evidence.test.ts` — curated registry,
  change detection, and `assessEvidence()` satisfying S1's `EvidenceAssessor`.
