---
description: Secret / leak scan
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm run guard:*)
---
!`npm run guard:secrets 2>&1 | tail -40`

Scan for hardcoded API keys, committed .env files, and secrets exposed via NEXT_PUBLIC_ vars. Check git-tracked files and the client bundle surface. Report every hit with file:line. Read-only.
