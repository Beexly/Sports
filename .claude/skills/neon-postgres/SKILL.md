---
name: neon-postgres
description: Neon Postgres pooled vs direct connections for Prisma 5.22 migrations and serverless runtime queries.
---

# Neon Postgres (GSE Pointer)

Canonical vendor guide: `.agents/skills/neon-postgres/SKILL.md`.

## GSE Repo Overrides (Mandatory)
- **Canonical ORM:** Use Prisma 5.22 (`packages/db/prisma/schema.prisma`), **not** Drizzle or ad hoc DDL.
- **Connection Routing:** Use pooled `-pooler` `DATABASE_URL` for runtime Next.js API routes and direct/unpooled `DIRECT_URL` for `prisma migrate` and `pg_dump`.
- **Secrets Discipline:** Never read/edit `.env*` directly or commit database strings; use operator-managed Vercel/GitHub Secrets.
