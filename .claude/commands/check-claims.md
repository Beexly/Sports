---
description: Scan copy for unsupported accuracy claims
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git log*), Bash(git status*), Bash(npm run guard:*)
---
!`npm run guard:performance-claims`
!`npm run guard:commercial-copy`

Scan all UI, marketing, and meta copy for accuracy or win-rate claims (e.g. "X% accurate", "guaranteed", "best record").
Flag any claim not directly backed by current graded-pick data. This is a hard-stop guard — list every instance with file:line.
