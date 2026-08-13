# Hermes handoff package

Everything needed to hand the remaining work to the Hermes "Laguna" coding agent and
have it run unattended overnight.

| File | What it is | Who reads it |
|---|---|---|
| `LAUNCH.md` | Setup, model routes, rate limits, morning review, what I could not verify | **You** |
| `AUDIT_PROMPT.md` | Job 1 — 28 read-only probes. Writes reports only, changes no source | Paste into Hermes |
| `BUILD_QUEUE.md` | Job 2 — 11 tasks: 6 zero-risk reports, 5 code tasks; one commit each, no push | Paste into Hermes |

**Run the audit first.** It cannot damage anything, and it tells you how much to trust
the setup before you let it write code.

## The design constraint behind both prompts

`.claude/settings.json` and `scripts/guardrails/agent-bash-guard.mjs` block dangerous
shell commands — but they only apply to **Claude Code**. Hermes is a different program
and never loads them. So every safety rail for Hermes is one of three things:

1. **Text in the prompt** — explicit allow-lists of files it may touch, an off-limits
   list, a hard ban on `git push`.
2. **Mechanical verification** — every task ends in commands whose exit codes decide
   whether it passed. No task is "done" because the agent believes it is.
3. **Your review of the diff** — nothing reaches GitHub without you. That is the actual
   merge gate; the first two just make your review cheap.

Both prompts are written for a model meaningfully weaker than the one that wrote them.
That is why they read the way they do: judgment is replaced with lookup tables, "audit
this" is replaced with "run this command and record what came back," and every task has
a two-strike cap so one stuck item cannot consume the night.

## Where these fit against earlier docs

- `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md` — the earlier, narrower T2–T3-only draft.
  Superseded by `BUILD_QUEUE.md`.
- `docs/ops/HERMES_AUDIT_CHARTER.md` — the audit's design rationale and domain list.
  `AUDIT_PROMPT.md` is its executable form.
- `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md` — build-spec tasks T2 and T3 are
  implemented here as **H9** and **H10**. T4–T6 remain change-proposal-gated and are
  deliberately absent from the queue.
