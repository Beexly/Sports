---
description: Prisma schema and migration discipline for the Neon-backed database package
paths:
  - "packages/db/**"
---

# Prisma Schema & Migration Discipline

## The facts

- Schema: `packages/db/prisma/schema.prisma`
- Migrations: `packages/db/prisma/migrations/` — 53 migration directories as of this writing, each timestamp-prefixed (e.g. `20260723100000_add_ind_inv_proposal`)
- `packages/db/prisma/migrations/migration_lock.toml` exists and pins the provider (`postgresql`) — never hand-edit it
- Client: `@prisma/client` + `@prisma/adapter-neon` (Neon serverless driver over `ws`), both pinned to `^5.22.0` in `packages/db/package.json`

## Rules

1. **Never edit an applied migration.** A migration directory under `packages/db/prisma/migrations/` is a historical record once it has shipped. If it's wrong, write a new forward migration — do not rewrite `migration.sql` in place.

2. **Every `schema.prisma` change ships with a migration.** Generate it with `npm run db:migrate:dev -- --name <change>` (the root passthrough to `packages/db`'s `prisma migrate dev`) run against a **disposable** database — start one with `npm run db:disposable`. Never run `migrate dev` against a shared or production `DATABASE_URL`.

3. **`db:push` (`prisma db push`) is dev-only.** It's fine against a local/disposable database for quick iteration, but it must never run against a shared or production URL — it has no migration history and can silently drop data. CI uses it only against the ephemeral test DB (see below); that's the one sanctioned exception.

4. **Production applies migrations via `prisma migrate deploy`**, run by `scripts/deploy/migrate-if-configured.mjs` during the Vercel build. That script is fail-closed: if migration application is misconfigured, the build fails rather than deploying app code against a schema it doesn't match.

5. **CI replays the migration history, non-blocking for now.** `.github/workflows/ci.yml` runs `prisma migrate deploy` against the empty test database as a visible check, then brings the test DB to `schema.prisma` with `db push`. The replay is KNOWN RED: no migration creates `picks` or `users` — the ledger starts at `20260522141600_add_loss_autopsy` on top of a `db push`-built schema — so it cannot be blocking until an owner lands a baseline migration (`docs/ops/OPERATOR_TASKS.md` → "Baseline migration"). After that, CI switches to blocking `migrate deploy` plus `prisma migrate diff --exit-code`. Do not "fix" the replay by editing or reordering existing migrations.

6. **Destructive commands are denied by the agent-bash-guard**: `prisma migrate reset` and `prisma db push --force-reset` are blocked outright. Don't attempt to route around the guard.

7. **Check status, don't guess.** Use `npm run db:migrate:status` (`prisma migrate status`) to see what's applied vs. pending before touching anything.

8. **Never touch `DATABASE_URL` / `DIRECT_URL` values.** These are environment-injected secrets (Neon connection strings); they do not belong in code, commits, or command strings.

9. **Unattended agents do not run migrations at all** — AGENTS.md law 7 forbids it outright for any non-interactive/autonomous run. An interactive session may propose running `db:migrate:dev` or `db:migrate` but must ask first; both are on the `settings.json` ask list, not the allow list.

## Quick reference

```bash
npm run db:generate        # prisma generate — safe, no DB contact
npm run db:migrate:status  # prisma migrate status — read-only
npm run db:disposable      # spin up a throwaway DB for local migration authoring
npm run db:migrate:dev -- --name <change>   # author + apply a new migration (disposable DB only)
npm run db:migrate         # prisma migrate deploy — production path, CI/build only
```
