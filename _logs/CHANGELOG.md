# GSN — CHANGELOG

Append-only, one line per shipped cycle. Newest at top.

- 2026-05-27 chore(health): Cycle 3 health pass — npm install OK; lint OK; 1578 tests pass; typecheck FAIL on stale Prisma client (TS2305 missing exports + ~80 downstream TS7006 implicit-any). Results captured to boot-2026-05-27.md per §2.4.
- 2026-05-27 chore(setup): complete .claude/ scaffold — 4 remaining commands (gsn-ship, gsn-pick, gsn-settle, gsn-calibration) + 4 remaining hooks (post-tool-use, session-start, session-end, user-prompt-submit) per §5.3/§5.5
- 2026-05-27 chore(setup): replace CLAUDE.md with v2 GSN; scaffold .claude/ (settings, 10 agents, 2 commands, pre-tool-use hook, mcp.json) and _logs/ (SESSION-SUMMARY, DECISIONS, CHANGELOG, boot)
