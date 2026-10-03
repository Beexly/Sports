# PIT validation law

**Packages:** `@sports/feature-store` (`pit-validate.ts`) · `@sports/stats-api` (`pit-validate.ts`)

## Rules
1. `asOf` must be ISO-8601 **with time** (date-only refused — ambiguous for decisions)
2. Query `asOf` must not be beyond wall-clock + 120s skew (`asof_future` → HTTP 422)
3. Stored rows only readable when `record.asOf <= query.asOf` (equality allowed)
4. Writes require `pitCorrect: true`; `rights_hold` cannot be public
5. Normalized store writes use `toISOString()` form

## API codes
| code | meaning |
|------|---------|
| asof_missing | empty |
| asof_invalid | unparseable / date-only |
| asof_future | beyond skew |
| future_leak | record after query |
| pit_flag_false | write without pitCorrect |

## Functions
`parseAsOfMs` · `validateQueryAsOf` · `validateFeatureWrite` · `validatePitQuery` · `selectLatestAsOf` · `detectFutureLeak` · `assertNoLeak`
