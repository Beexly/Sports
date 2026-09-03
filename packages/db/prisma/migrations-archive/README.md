# Pre-baseline migration history (archived 2026-09-02)

These 53 migrations were applied to production between 2026-05-22 and 2026-08-13 on
top of a schema that had been created with `prisma db push`, so the history was not
replayable from an empty database (no migration creates `picks` or `users`). They were
squashed into `../migrations/20260101000000_baseline/migration.sql`, which is
idempotent: it applies cleanly to an empty database and is a no-op on a database that
already carries the schema (production records these 53 names in `_prisma_migrations`;
`prisma migrate deploy` ignores applied migrations that are absent from the folder).

The files stay here, unchanged, because tests and the CI acceptance script read their
SQL (CHECK constraints, seed rows). Do not add new migrations here and never apply
these directly; new schema changes go through `npm run db:migrate:dev` against
`../migrations/`.
