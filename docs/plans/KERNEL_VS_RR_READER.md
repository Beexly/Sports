# Kernel vs RR Reader Divergence — Decision Record

**Date:** 2026-07-29  
**MAIN verified:** f8a6065  
**Context:** #236 shipped RR two-statement reader inside `planSlateOpeningFromDb`.  
Elevation proposes `try_open_slate` single-function structural kernel.

## What shipped (#236)

`planSlateOpeningFromDb` runs **two Prisma statements** inside one
`RepeatableRead` `$transaction`. TOCTOU is closed by isolation (one snapshot).
Fail-first properties proven on real Postgres.

## Preferred A++ end-state

```sql
SELECT * FROM try_open_slate($1);  -- one function owns both reads
```

Client never can split pending-count + opener select. Binding + mint bound remain
in pure `planSlateOpening` (crypto out of SQL).

## Decision (locked)

| Path | Role |
|------|------|
| `planSlateOpeningFromDb` (RR two-statement) | **SHIPPED compatible** — keep |
| `planSlateOpeningFromSql` + `try_open_slate` | **PREFERRED structural** — land dark |

### Land order

1. This doc + SQL stub + TS dual-path (`open-via-sql.ts`) + tests  
2. Migration apply + GRANT fence (founder/ops)  
3. New call sites prefer SQL; RR reader remains fallback one release  
4. Adversary suite green on **both** paths  
5. Do **not** flip reveal / LIVE_BOARD flags

### Safety equivalence

Under decrement-only pending writers + RR, both satisfy no REVEAL while pending > 0.  
Structural SQL makes violation **unrepresentable at the call surface**.

## Non-goals

- No silent rewrite of #236 without dual-path tests  
- No reveal flag flip  
- No claim SQL is production until migration + grants applied  
