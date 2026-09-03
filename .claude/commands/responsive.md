---
description: Responsive / breakpoint audit of the cockpit
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Audit the cockpit grid and cards across breakpoints (mobile, tablet, desktop). Find: overflow, cramped multi-column lists that should stack, fixed widths, text that wraps badly, and touch targets under ~44px.
Report per breakpoint with the offending component + fix. Don't change layout yet.
