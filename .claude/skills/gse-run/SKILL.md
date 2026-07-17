---
name: gse-run
description: Executes exactly one token-efficient Galaxy Sports Edge frontier workstream. Use when asked to continue, recover stranded work, implement the next frontier slice, or run `/gse-run next`.
argument-hint: "[next|workstream-id]"
---

# Live state

- Branch: !`git branch --show-current 2>/dev/null || echo unknown`
- Status: !`git status --short 2>/dev/null | head -40`
- Recent commits: !`git log -5 --oneline --decorate 2>/dev/null`
- Open PRs: !`gh pr list --state open --limit 20 --json number,title,headRefName,baseRefName,isDraft,mergeStateStatus,updatedAt --jq '.[] | "#\(.number) [\(.mergeStateStatus)] draft=\(.isDraft) \(.title) :: \(.headRefName) -> \(.baseRefName)"' 2>/dev/null || echo "gh unavailable"`

# Mission

Argument: `$ARGUMENTS`

Read, in order:
1. `docs/frontier/CURRENT_STATE.md`
2. `docs/frontier/WORKSTREAM_QUEUE.md`
3. `docs/frontier/RECOVERY_MATRIX.md`
4. The one selected workstream file
5. Supporting references below only when the selected workstream needs them

Supporting references:
- Product kernel: [references/frontier-kernel.md](references/frontier-kernel.md)
- Token protocol: [references/token-protocol.md](references/token-protocol.md)
- Recovery priorities: [references/recovery-priorities.md](references/recovery-priorities.md)

Execute one coherent workstream and stop.

Mandatory behavior:
- Never ask the user. Record genuine founder-only needs as `OWNER_GATE` and continue non-blocked work.
- Never deploy, merge main, apply production migrations, mutate live services, change secrets, or activate gated capabilities.
- Current code, tests, current main, and live PR state outrank stale handoffs.
- Do not read the entire docs tree or duplicate an open-branch capability.
- Freeze a short contract before editing: objective, invariant, base SHA, files, forbidden files, protected zones, acceptance, tests, rollback.
- Use `gse-scout` once for bounded discovery, `gse-builder` for implementation, `gse-verifier` for independent verification, and `gse-red-team` only if protected zones changed. Never run more than one subagent at once.
- Use targeted tests during edits and final gates once.
- Update `CURRENT_STATE.md`, `DECISION_REGISTER.md`, `WORKSTREAM_QUEUE.md`, and `RECOVERY_MATRIX.md`.
- Final receipt: baseline, change, protected-zone disposition, verification, GitHub, owner gates, one next workstream, token discipline. Maximum 900 words.
