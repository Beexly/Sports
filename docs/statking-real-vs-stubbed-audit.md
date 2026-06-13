# StatKing Real vs Stubbed Audit

Generated: 2026-06-13T00:00:00Z

## Summary
- Real working systems: 9
- Partially working systems: 6
- Stub-only systems: 11
- Fixture-only systems: 0
- Docs-only systems: 0

## Merge blockers before product launch
- Live authorized NFL data feeds are still required for production-grade claims.
- Vendor adapters remain gated until contracts/API keys exist.
- Backtesting proof is fixture-backed, not historical prediction proof.

## Before merge
StatKing-specific snapshot loaders, metric calculations, pages, and tests are now working; keep typecheck caveat isolated to pre-existing repo-wide drift.
