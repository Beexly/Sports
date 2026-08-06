# Wire free-path SNAPSHOT_OUTCOME into runner

`apps/web/lib/settlement/free-path-snapshot.ts` is on main after this PR.

Wire into `apps/web/lib/data-sources/free-settlement-runner.ts`:

1. Import:
```ts
import {
  recordFreePathSnapshot,
  drainPendingSnapshotOutcomes,
} from "@/lib/settlement/free-path-snapshot";
```

2. Expand pick `select` with: `isBootstrap`, `bookmakerCount`, `confidence`, `factorBreakdown`, `gameId`, and `game.dataQualityScore`.

3. After free-path CLV grade (never block settle), call `recordFreePathSnapshot(...)` with the settled pick + result.

4. After `drainPendingClvGrades`, call `drainPendingSnapshotOutcomes(db, { take: 100, now })` and return as `snapshotRepair`.

Law: snapshot failure never blocks settlement.
