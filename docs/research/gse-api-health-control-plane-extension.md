# GSE /api/health Control-Plane Extension Gate

Generated: 2026-06-09

## Current Status

Do not extend `/api/health` with autonomous control-plane state until storage and schema approval are explicit.

The cockpit now renders read-only fixture-backed control-plane views:

- Source Health
- Domain Coverage
- Fallback Chain
- Debug Trace

Those views are sourced from `apps/web/lib/cockpit/intelligence-control-plane.ts` and the shared contracts in `packages/types/src/world-model.ts`.

## Required Approval Before API Extension

1. Storage table or view for source registry entries.
2. Storage table or view for source health snapshots.
3. Storage table or view for domain coverage snapshots.
4. Storage table or view for fallback chain evaluations.
5. Storage table or view for autonomous run/debug trace records.
6. Retention policy for debug traces and stale source snapshots.
7. Health API contract decision: fail `/api/health` on P0 blind spots, or expose nested status while keeping core uptime status separate.

## Proposed API Shape After Approval

```json
{
  "ok": false,
  "status": "degraded",
  "checks": {
    "database": { "status": "ok" },
    "ingestion": { "status": "ok" },
    "controlPlane": {
      "status": "error",
      "detail": "1 blind spot and 2 manual reviews",
      "snapshotId": "control-plane-...",
      "generatedAt": "2026-06-09T22:20:00.000Z",
      "overallStatus": "FAILED",
      "healthySystems": 3,
      "degradedSystems": 1,
      "staleSystems": 1,
      "blindSpots": 1,
      "manualReviewCount": 2
    }
  }
}
```

## Implementation Notes

- Keep database/service clients lazily initialized if new storage helpers are introduced.
- Add a dedicated loader that reads approved storage and returns the same control-plane contract shape used by the cockpit.
- Keep fixture-backed cockpit loading separate from production health loading until migration is complete.
- Add tests for degraded control-plane status, blind spots, stale traces, and missing storage rows.
- Do not make `/api/health` depend on private/gated third-party source calls at request time.
