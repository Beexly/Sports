---
description: Performance audit
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Audit performance. Find: slow/unindexed Prisma queries, N+1s, oversized client bundles, components that should be server components, and unmemoized expensive renders. Report each with an impact estimate + fix. Measure where possible.
