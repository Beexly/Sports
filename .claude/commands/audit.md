---
description: Full read-only architecture + correctness audit of GSE (Galaxy Sports Edge)
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Do a read-only audit of the GSE codebase. Do NOT edit files.
Cover: architecture boundaries, the pick lifecycle, type safety, auth, DB access, Stripe, The Odds API usage, and dead code.
Output a findings table ranked Critical/High/Medium/Low with file:line, the risk, and a proposed fix. Propose only — apply nothing.
