# Market / CLV Foundation

Implemented market helpers under `apps/web/lib/market`.

## Behavior

- Opening line is preserved.
- Current/closing snapshots are separate concepts.
- CLV is blocked until closing line and result are present.
- Implied probability and no-vig probability helpers are available.
- Movement threshold creates DELTA-owned tasking.
- Public/sharp labels are blocked unless sourced.
