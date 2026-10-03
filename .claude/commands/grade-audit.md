---
description: Audit pick-grading correctness
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Audit the pick-grading logic for correctness. Verify handling of: push/void, half-win/half-loss, postponed/cancelled events, settlement timing, and timezone boundaries.
Construct edge-case inputs and show expected vs actual. Report bugs with file:line + fix.
