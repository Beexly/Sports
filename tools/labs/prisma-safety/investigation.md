# Prisma schema migration safety — investigation (W2 lab module)

Scope: document the safe pattern for evolving `packages/db/prisma/schema.prisma`
under the CONSTELLATION Wave 2 initiative, without ever touching the real
dev/prod database from a lab or agent session. This module is pure
investigation + one real, captured diagnostic run — it does not modify
`packages/db/prisma/schema.prisma` and does not run `db push` or `migrate`
against any non-disposable database.

## Rule

**Never run `prisma db push` or `prisma migrate dev/deploy` against the real
`DATABASE_URL`/`DIRECT_URL` from an agent or lab session.** Any real schema
change goes through the normal PR review + CI path (the repo's existing
`packages/db/prisma/migrations/` directory and CI job), with the owner
reviewing and applying it — never an autonomous agent action against a shared
database.

## Safe patterns for lab/formal work that needs a Postgres-shaped database

1. **Disposable local Postgres, not the shared dev DB.** Stand up a
   throwaway instance under a dedicated OS user (this container has a
   `postgresrunner` user for exactly this) on a non-default port, apply the
   real schema to *it* with `db push`, do whatever testing is needed, then
   `pg_ctl stop` and delete the data directory. Nothing ever touches the
   real `DATABASE_URL`.

   ```bash
   runuser -u postgresrunner -- /usr/lib/postgresql/16/bin/initdb -D /tmp/<disposable>-pgdata --auth=trust
   runuser -u postgresrunner -- /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/<disposable>-pgdata -o "-p <port> -k /tmp" -l /tmp/<disposable>-pg.log start
   runuser -u postgresrunner -- /usr/lib/postgresql/16/bin/psql -h /tmp -p <port> -d postgres -c "CREATE DATABASE <name>;"
   DATABASE_URL="postgresql://postgresrunner@localhost:<port>/<name>?host=/tmp" \
   DIRECT_URL="postgresql://postgresrunner@localhost:<port>/<name>?host=/tmp" \
     npx prisma db push --skip-generate   # against the schema COPY, never the real one in place
   # ... test ...
   runuser -u postgresrunner -- /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/<disposable>-pgdata stop
   rm -rf /tmp/<disposable>-pgdata
   ```

2. **`prisma db pull` (introspection) is the safe read-only direction.**
   Pointed at a real database, it reads the live schema and writes it into a
   *target* `.prisma` file — it never writes to the database. Used here
   against the disposable instance only, as a working demonstration (see
   "Diagnostic run" below), but the same command is safe to point at a real
   database too, specifically because it only reads.

3. **Expand/contract for any real future migration.** When a real schema
   change is eventually needed (e.g. new tables to support formal-methods
   receipts, if the owner decides those belong in the real DB rather than a
   lab-only JSON/file receipt — see the W2-01/W2-02 background work, which
   does *not* propose real schema changes):
   - **Expand**: add the new column/table as nullable / with a default,
     additive only, deployed and backfilled first.
   - **Migrate reads/writes** in application code to the new shape, both
     shapes supported simultaneously.
   - **Contract**: only after the old shape has zero remaining readers/
     writers (verified, not assumed), drop the old column/table in a
     separate, later migration.
   - Every step ships as its own reviewed migration file under
     `packages/db/prisma/migrations/`, applied via the existing CI-gated
     path — never `db push` against production, ever.

4. **Shadow database for `migrate dev`'s own drift detection.** Prisma's
   `migrate dev` already uses a shadow database to detect drift before
   writing a migration; this repo's CI config should be checked for its
   shadow DB settings before any real migration is authored (out of scope
   for this lab module — flagged as a follow-up, not fabricated here).

## Diagnostic run performed now (real, captured output)

Real Postgres 16, disposable, port 5557, torn down after this run.

```
$ runuser -u postgresrunner -- .../initdb -D /tmp/w2-prisma-safety-pgdata --auth=trust
Success. ...

$ runuser -u postgresrunner -- .../pg_ctl -D /tmp/w2-prisma-safety-pgdata -o "-p 5557 -k /tmp" -l /tmp/w2-pg.log start
waiting for server to start.... done
server started

$ runuser -u postgresrunner -- .../psql -h /tmp -p 5557 -d postgres -c "CREATE DATABASE w2safety;"
CREATE DATABASE

$ DATABASE_URL=... DIRECT_URL=... npx prisma db push --skip-generate
  (against the REAL packages/db/prisma/schema.prisma, applied only to the disposable DB)
🚀  Your database is now in sync with your Prisma schema. Done in 1.73s

$ DATABASE_URL=... npx prisma db pull --schema=./introspection-target.prisma
- Introspecting based on datasource defined in introspection-target.prisma
✔ Introspected 63 models and wrote them into introspection-target.prisma in 173ms
```

`introspection-target.prisma` in this directory is the real pulled output —
63 models round-tripped byte-faithfully (Prisma reports it enriched them with
`@@map` info recovered from the source schema, listed in the tool output).
This confirms the pull/push round trip works cleanly against the real schema
shape without needing any real database.

The disposable instance (`/tmp/w2-prisma-safety-pgdata`, port 5557) is
stopped and removed as the final step of this lab session.

## What this module does NOT do

- Does not modify `packages/db/prisma/schema.prisma`.
- Does not run `db push`/`migrate` against the real `DATABASE_URL`.
- Does not create any new Prisma models (no `AiCallSite`, `WaveReceipt`,
  `PaymentGuardSnapshot`, or similar) — those were proposed in chat and
  rejected: they belong to speculative future work, not this investigation,
  and adding them to the real schema needs an owner-reviewed migration, not
  an agent-run one.
