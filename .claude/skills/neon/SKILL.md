---
name: neon
description: Neon serverless Postgres CLI, auth, branching, and MCP workflow pointer (GSE uses Prisma 5.22 + server env only).
---

# Neon (GSE Pointer)

Canonical full Neon skill: `.agents/skills/neon/SKILL.md`.

## GSE Repo Overrides
- Database schema & migrations run exclusively via Prisma 5.22 (`packages/db/prisma/schema.prisma`) using `DIRECT_URL` / `DATABASE_URL_UNPOOLED`.
- Never write credentials to `.env*` files or use `neon env pull` to mutate tracked workspace config; production env vars live in Vercel/GitHub Actions.
- Never install external unreviewed skills into the repo from CLI snippets; inspect `.agents/skills/neon/SKILL.md` locally first.
