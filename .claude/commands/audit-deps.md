---
description: Dependency and vulnerability audit
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm audit), Bash(npm audit --json*), Bash(npm audit --omit=dev*), Bash(npm audit --audit-level*)
---
Run the package audit and review dependencies. Report: known CVEs, deprecated packages, and majorly outdated deps. Separate "safe to bump" from "breaking — needs review." Report only; install nothing.
