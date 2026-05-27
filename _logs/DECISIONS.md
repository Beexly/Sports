# GSN — DECISIONS

Append-only, ADR-lite. Each entry: context / decision / alternatives / tradeoff.

---

## 2026-05-27 — Adopt v2 GSN CLAUDE.md + .claude/ scaffold

**Context.** Repo had a 115-line v1 CLAUDE.md ("Sports Prediction Platform") and no `.claude/` directory. Branch `claude/gsn-claude-md-setup-lsMvR` was created to install the v2 GSN operating doc and its `.claude/` structure per §16.

**Decision.** Replaced `CLAUDE.md` with the v2 GSN content from the boot prompt. Created the §16 explicit files (`settings.json`, `agents/pick-generator.md`, `agents/grader.md`, `commands/gsn-cycle.md`, `commands/gsn-handoff.md`, `hooks/pre-tool-use.json`, `mcp.json`). Added stub agents for the 8 remaining §5.2 roles (`stat-researcher`, `injury-monitor`, `line-watcher`, `settler`, `content-writer`, `social-clipper`, `email-blaster`, `operator-reviewer`), each with a cookbook reference. Scaffolded `_logs/` with `CHANGELOG.md`, `DECISIONS.md`, `SESSION-SUMMARY.md`, and a boot snapshot.

**Alternatives considered.**
- *Keep v1 CLAUDE.md.* Rejected — the branch name and prompt explicitly require the v2 replacement; v1 lacks the eight pillars, multi-model orchestration table, anti-slop mandate, and `.claude/` contract.
- *Skip the 8 stub agents until §4.2 `plugin-dev` is installed and `agent-creator` is available.* Rejected — §5.2 calls the full agent set "required structure" and §16's parenthetical says to create them on first boot. Stubs unblock parallel work without locking in implementation details.
- *Run the full §2 health pass (typecheck/lint/test/dev server) in this cycle.* Deferred — branch scope is setup, not app-code changes; the health pass is its own cycle and will run before Track 1 work begins.

**Tradeoff.** Stubs reference cookbook patterns but don't implement orchestration yet. The first feature cycle that touches any of these roles must flesh out the stub (system prompt, I/O contract, dispatch path) before invoking it. The trade is structural completeness now vs. partial guidance later — chose structure.

**Open items for Garrett.**
- Approve the §4.2 + §4.3 plugin install list (settings.json declares them as `plugins_required` but they are not installed by this commit).
- Confirm MCP server URLs in `mcp.json` (current values are the §16.7 defaults — wire creds in next session).
- §14 STOP items still outstanding: Track 2 data-source choice (ESPN-unofficial vs. TheSportsDB vs. SportsDataIO/OddsAPI); Sentry-vs-equivalent observability vendor; accent color (deep burgundy vs. electric indigo per §12).
