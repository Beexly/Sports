---
description: Compress current session into a cold-start prompt for the next agent (alley-oop pattern)
argument-hint: Optional emphasis ("focus on picks engine work")
---

Write a cold-start prompt for the next session that captures only what's needed to orient and act. Emphasis (if given): $ARGUMENTS

Output to `_logs/HANDOFF-{ts}.md`:

## State at handoff
- Last cycle # + what shipped
- Open WIP (uncommitted, partially implemented)
- Known issues / red flags
- Active STOP conditions awaiting Garrett

## Pick queue + ops state
- Picks in draft / reviewed / live
- Last ingestion run (time, status)
- Calibration drift status (if known)

## Next-session priorities (top 3)
- [...]

## Don't re-ask
- [decisions already made this session — reference DECISIONS.md entries]

Pattern reference: `claude-plugins-community-main/alley-oop`.
