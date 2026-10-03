---
description: WCAG contrast audit (critical for the dark theme)
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*)
---
Audit text/background contrast across the cockpit. For every text-on-background pair, compute the contrast ratio and flag anything below 4.5:1 (3:1 for text ≥24px or bold ≥19px).
Prioritize low-contrast gray-on-dark body text (the Recommended next actions list in `apps/web/app/cockpit/page.tsx`, stat sub-labels, decision-queue body) and colored text on dark (crimson warnings, gold/cyan labels).
For each fail, give the current ratio and a corrected color that hits AA while staying on-palette. Report only — change nothing.
