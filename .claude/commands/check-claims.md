---
description: Scan copy for unsupported accuracy claims
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm run guard:*)
---
!`npm run guard:performance-claims 2>&1 | tail -40`
!`npm run guard:commercial-copy 2>&1 | tail -40`

Scan all UI, marketing, and meta copy for accuracy or win-rate claims (e.g. "X% accurate", "guaranteed", "best record").
Flag any claim not directly backed by current graded-pick data. This is a hard-stop guard — list every instance with file:line.
