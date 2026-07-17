# GSE Token Protocol

- One workstream per session.
- Main Fable session decides architecture and reviews protected zones; it does not perform broad scanning or routine file-by-file coding.
- No agent teams. At most one subagent active.
- Before contract freeze: at most 12 file reads and 3 bounded search passes.
- Scout: Haiku, read-only, max 8 turns.
- Builder: Sonnet, medium effort, max 30 turns.
- Verifier: Sonnet, max 14 turns.
- Red-team: inherited Fable session, protected zones only, max 10 turns.
- Prefer `rg`, exact line ranges, `git diff --name-only`, `git diff --stat`, and concise PR metadata.
- Long logs go to temporary files. Main context receives command, exit code, counts, and relevant failure tail only.
- Targeted tests after coherent edit clusters. Full typecheck/lint/guardrails/build once at the end. Full `npm test` only when protected risk or the workstream requires it.
- No repeated recaps. Stop after the verified slice.
- Compaction must preserve branch, base SHA, workstream contract, decisions, touched files, failures, and remaining acceptance criteria; discard full logs, repeated summaries, and completed searches.
