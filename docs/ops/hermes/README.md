# Hermes handoff package

Everything needed to hand the remaining work to the Hermes "Laguna" coding agent and
have it run unattended overnight.

| File | What it is | Who reads it |
|---|---|---|
| **`CONTINUOUS.md`** | **The one to paste.** A single non-stop run: ground truth → audit → reports → build → launch prep → standing orders that never run out | **Paste into Hermes** |
| `LAUNCH.md` | Setup, model choice, morning review, what I could not verify | **You** |
| `AUDIT_PROMPT.md` | Reference — the 28 probes, severity table, evidence rule. `CONTINUOUS.md` PHASE 1 points here | Reference |
| `BUILD_QUEUE.md` | Reference — full per-task specs. `CONTINUOUS.md` PHASES 2–3 point here | Reference |

**Paste `CONTINUOUS.md` and walk away.** It is ledger-driven: every task is claimed,
executed, verified, and recorded in `handoff/LEDGER.md` before the next one starts, so
an interrupted run is still readable and a crashed run resumes from the ledger.

The other two files are no longer separate jobs — they are the detailed specs that
`CONTINUOUS.md` sends the agent to read. You do not paste them.

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
