# Known Failures

Repo-wide typecheck fails outside StatKing due Prisma/generated-type drift and implicit-any debt. Dev startup passes with stub Prisma when DATABASE_URL is absent.
