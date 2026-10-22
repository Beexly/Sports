# Multi-Source Ingestion Architecture

As of: 2026-06-09

## Adapter Contract

```ts
type RosterSourceAdapter = {
  sourceId: string
  fetchRoster(teamId: string): Promise<RawSourceSnapshot>
  parseRoster(snapshot: RawSourceSnapshot): Promise<NormalizedRosterRecord[]>
  fetchStaff?(teamId: string): Promise<RawSourceSnapshot>
  parseStaff?(snapshot: RawSourceSnapshot): Promise<NormalizedStaffRecord[]>
  fetchTransactions?(): Promise<RawSourceSnapshot>
  parseTransactions?(snapshot: RawSourceSnapshot): Promise<NormalizedTransactionRecord[]>
}
```

## Evidence Required On Every Normalized Fact

source_id, source_name, source_url, fetched_at, source_updated_at if available, raw_value, normalized_value, confidence_hint, parser_version.

## Flow

1. Source adapters fetch low-volume, approved public data or fixtures.
2. Raw snapshots are stored with URL, fetched_at, hash, source, parser_version, and record count.
3. Parsers convert source-specific records to normalized records.
4. Reconciliation compares facts by person/team/status/number/position/staff role.
5. Confidence scoring accounts for authority, freshness, agreement, volatility, and parser confidence.
6. Conflicts become ConflictRecord items.
7. Stale data becomes ValidationError or warning depending severity.
8. Public-safe output hides internal weights and uncertain facts.
9. Founder cockpit shows evidence, conflicts, freshness, parser errors, and source failures.

## Implementation Guardrail

In this workspace, implement docs and build cards only. In the real clone, any script must be read-only and disabled from production behavior until approved.

