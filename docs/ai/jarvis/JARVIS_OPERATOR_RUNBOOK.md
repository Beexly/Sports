# Jarvis OS — Operator Runbook

How the owner uses the Jarvis OS day to day. Everything below is read-safe;
every write-shaped step waits for your approval.

## Morning (5 minutes)

1. Open `/cockpit` — Owner Summary, decision queue, safety warnings.
2. Open `/cockpit/jarvis/os` — the Operating Intelligence Map: what is wired,
   partial, not wired; top blockers; safe-to-run list.
3. Ask Jarvis (OS group): "What needs my decision?", "What is blocked across
   the OS?", "Summarize the galaxy."
4. Create today's daily note in `docs/ai/jarvis/vault/01-daily/` from the template.

## Launching work

1. Ask Jarvis: "Prepare the next prompt." — returns the suggested template id.
2. Fill the `{{placeholders}}` (`buildPromptFromTemplate`) and launch the
   Claude Code / Codex session.
3. Every session ends with a scribe entry (RESULT/HANDOFF) rendered to
   `docs/ai/jarvis/scribe/` and committed.

## Approving actions

- Anything write-shaped arrives as an ActionItem in NEEDS_APPROVAL with a
  reason, expected output, risk, and rollback plan. Approve or reject — there
  is no auto-execute path, and only READ_ONLY_CHECK skips the gate.
- HIGH/CRITICAL-risk approvals also get a decision note
  (`vault/02-decisions/`) and an audit ledger line (`vault/08-audit/`).

## Overnight

Ask Jarvis: "What should run overnight?" — launch the `overnight-test-run`
template before stepping away. Morning report lands as scribe entries.
Nothing runs unattended; you start the session.

## What Jarvis will honestly tell you

- "What do you remember?" → nothing across sessions (memory not wired).
- "Can you talk?" → no (voice not wired; console shows design status).
- "Can you act?" → only read-only checks; everything else needs you.
- "How do we improve?" → proposals only; the prediction engine is never
  auto-adjusted.
