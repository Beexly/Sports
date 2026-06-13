# Agent Notes — Department Reports

Last updated: 2026-06-13

These notes document how department health is derived in `apps/web/lib/jarvis/department-reports.ts`. Each department maps to an agent council seat and derives its health level exclusively from `OwnerSummary` fields — never from invented signals.

## Department → Agent → Health Source

### PICKS_DESK (Scout)
- **HEALTHY**: gate open AND picks.today > 0
- **DEGRADED**: gate open BUT picks.today === 0 (gate expected to deliver but didn't)
- **ATTENTION**: gate closed for known reason (blockedReason set)
- **CRITICAL**: gate closed with no explanation
- **oneLiner source**: `picks.today`, `picks.isPublicGateOpen`

### DATA_PIPELINE (Tal)
- **HEALTHY**: no critical warnings mentioning "ingestion" or "pipeline"
- **ATTENTION**: critical warnings reference pipeline/ingestion
- **oneLiner source**: `criticalWarnings`

### CUSTOMER_SURFACE (Sarah)
- **HEALTHY**: no critical or advisory warnings mentioning "subscription" or "customer"
- **ATTENTION**: subscription-related warnings present
- **oneLiner source**: `advisoryWarnings`, `criticalWarnings`

### CONTENT (Ava)
- **HEALTHY**: picks.today > 0 (content pipeline has material to work with)
- **DEGRADED**: picks.today === 0 (no source material for content)
- **oneLiner source**: `picks.today`

### REVENUE (Bobby)
- **ATTENTION** (always): Performance display gate is closed — revenue conversion cannot be proven until display gate opens
- **HEALTHY** only if: `performance.displaySafe === true`
- **oneLiner source**: `performance.displaySafe`, `performance.gateBlockers`

### SETTLEMENT (Settlement Officer)
- **ATTENTION**: canonicalPending >= 10 (backlog forming)
- **HEALTHY**: canonicalPending < 10
- **topRisk**: always cites the pending count
- **oneLiner source**: `picks.canonicalPending`

### PERFORMANCE (Performance Auditor)
- **ATTENTION**: sample size below minimum threshold
- **HEALTHY**: `performance.displaySafe === true`
- **oneLiner source**: `performance.canonicalSampleSize`, `performance.minimumRequired`

### AI_OPS (AI Ops Officer)
- **ATTENTION**: `aiOps.available === false` (telemetry not wired)
- **HEALTHY**: `aiOps.available === true`
- **oneLiner source**: `aiOps.available`, `aiOps.reason`

## Invariants

1. **No HEALTHY without evidence.** A department is never HEALTHY unless there is positive OwnerSummary evidence. Absence of negative signals does not equal HEALTHY.
2. **OneLiners always cite source.** Every `oneLiner` string ends with a `(source: field.path)` citation.
3. **8 departments always returned.** `buildAllDepartmentReports()` always returns exactly 8 reports, one per department.
4. **UNKNOWN for unrecognized agentIds.** `buildDepartmentReport()` returns `healthLevel: "UNKNOWN"` for any agentId not in `DEPT_CONFIGS`.
