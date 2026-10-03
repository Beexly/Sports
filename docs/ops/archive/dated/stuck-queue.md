# Stuck Queue

Active escalations waiting on owner action. **Newest at top.**

When an item escalates (Codex 3-retry fail, Claude 3-review-round fail, spec ambiguity, commercial decision, schema break, external blocker, plan conflict), it lands here with:

- **What's blocked** — surface + specific task
- **What's been tried** — chronological, with timestamps
- **What's needed to unblock** — owner action, decision, credential, etc.
- **Time blocked** — wall-clock
- **Dependents** — other work that's waiting on this

Items resolve when unblocked. Resolved items are removed from this file and the resolution is logged in `decision-log.md`.

Auto-flag rules:
- After 24h blocked → mark "urgent" in title.
- After 48h blocked → ping owner via separate channel.

---

## Current escalations

*None as of 2026-05-22. Phase 0 has not yet completed.*

---

*New escalations append above this line, newest at top.*
