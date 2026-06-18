---
description: Prisma schema and query audit (read-only)
---
Audit the Prisma layer. Report: schema drift vs migrations, missing indexes on filtered/joined columns, N+1 query patterns, unsafe cascade deletes, and nullable fields that should be required.
Do NOT run destructive DB operations or migrations. Output findings + proposed migration drafts only.
