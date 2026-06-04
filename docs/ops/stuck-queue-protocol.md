# Stuck Queue — Operational Protocol

**Companion to:** `docs/ops/stuck-queue.md` (the active queue of escalations).

**Source of authority:** master plan Part 1.5 — Autonomous Collaboration Loop.

---

## TL;DR

When the autonomous loop hits a STUCK condition, it files to `stuck-queue.md` with a structured entry. This doc says HOW that filing works, what severity tiers exist, when items auto-escalate, and how items get resolved.

The stuck queue is one of the loop's pressure valves. Without it, the loop silently dies when work can't proceed. With it, the loop pauses on specific items and routes around them.

---

## STUCK criteria (when to file)

Per master plan Part 1.5, ANY of these triggers a stuck-queue entry:

1. **Codex stuck:** 3 self-test retries failed on the same class of error.
2. **Claude stuck:** 3 feedback rounds, Codex still hasn't resolved the same review issue.
3. **Spec ambiguity:** master plan is silent or contradictory on the specific case.
4. **Commercial decision:** requires a pricing / legal / vendor choice beyond delegated authority.
5. **Schema break:** modifying committed schema would break existing data without a clear migration path.
6. **External blocker:** waiting on an external API, third-party approval, or missing credential the owner controls.
7. **Plan conflict:** two parts of the master plan contradict each other and resolution isn't obvious.

Codex files when Codex is stuck. Claude files when Claude is stuck during PR review. Either can file when spec ambiguity or commercial decisions appear.

---

## Entry format

Every stuck-queue entry uses this format:

```markdown
### SQ-<auto-incremented-id> — <one-line title> · <severity>
**Filed:** <ISO timestamp> · **By:** <claude|codex|owner>
**Triggered by:** <one of the 7 STUCK criteria above>
**Surface:** <route, file path, or process>

**What's blocked:**
[Concrete description. What can't proceed. Specific files, surfaces, or decisions affected.]

**What's been tried:**
- <step 1, with timestamp>
- <step 2, with timestamp>
- ...

**What's needed to unblock:**
[Owner action, decision, credential, vendor sign-off, etc. As specific as possible.]

**Time blocked:** <hours/days since filed>
**Dependents:** <other work that's waiting on this — list other SQ-N, IQ-N, or phase milestones>
```

Items live at the top of `stuck-queue.md` (newest first). Items move to the bottom of the file under a "Resolved" section once unblocked.

---

## Severity tiers

Tag every entry with one severity:

### CRITICAL
The loop can't make ANY progress on the current phase. Examples:
- Production is down.
- Trust-gate violation discovered (e.g., paid picks leaked publicly).
- Migration ran against prod and corrupted data.

**Action:** owner pinged via separate channel (Discord/SMS) within 1 hour of filing. Other work pauses.

### HIGH
The current phase can't ship the affected deliverable. Other Phase work can proceed. Examples:
- Required credential missing (e.g., Twitter API access not provisioned).
- Schema migration conflict that needs a decision.
- Vendor (Stripe, Resend, Twilio) outage blocking a specific feature.

**Action:** owner notified via cockpit + email at the end of the day. Phase verification gate cannot pass until resolved.

### MEDIUM
A specific deliverable in the current phase can't ship cleanly. Other deliverables in the same phase can ship. Examples:
- Spec ambiguity on a specific surface (e.g., "should the bot post hashtags?")
- One PR in a multi-PR phase has unresolved review feedback after 3 rounds.

**Action:** owner notified at end-of-week digest. Affected PR holds; other PRs continue.

### LOW
Future-phase work is blocked but not the current phase. Examples:
- Phase 5 DSL grammar question that can wait.
- Phase 6+ pricing structure decision.

**Action:** owner reviews at phase boundary planning. Loop continues without intervention.

---

## Auto-escalation thresholds

Time-based auto-flagging per master plan Part 1.5:

| Severity | Hours blocked → severity bumps to |
|---|---|
| LOW | 7 days → MEDIUM |
| MEDIUM | 3 days → HIGH |
| HIGH | 24 hours → marked "URGENT" in title |
| HIGH (URGENT) | 48 hours → owner pinged via separate channel |
| CRITICAL | 1 hour → already pinged on filing |

The synthetic monitoring runner (see `docs/product/synthetic-monitoring-spec.md`) updates these timestamps automatically.

---

## Who resolves which kind

| STUCK trigger | Default resolver |
|---|---|
| Codex 3-retry fail | Owner reviews diagnostic, decides path (fix locally, change approach, redesign) |
| Claude 3-round review fail | Owner reviews disagreement, decides path |
| Spec ambiguity | Claude proposes resolution, owner approves; logged in decision-log.md |
| Commercial decision | Owner only |
| Schema break | Owner reviews migration plan from Codex; signs off |
| External blocker | Owner provisions credential / vendor account / approval |
| Plan conflict | Owner adjudicates between competing master plan sections |

Default resolver is overridden only by explicit owner reassignment.

---

## Resolution flow

When unblocked:

1. Resolver appends a note to the entry: `**Resolved:** <ISO timestamp> · **By:** <name> · **Resolution:** <one-line summary>`
2. Entry moves to the "Resolved" section at the bottom of `stuck-queue.md`.
3. Decision log gets a corresponding entry if the resolution involved a new decision.
4. The autonomous loop resumes work on the unblocked item.

---

## Anti-patterns to avoid

These are not how the stuck queue works:

- **Filing an entry as a way to ask "what should I do?"** Use Claude review or owner direct, not the queue. The queue is for items genuinely blocked.
- **Filing an entry to express disagreement.** Disagreements get logged in decision-log.md.
- **Filing in lieu of trying** — the 3-retry / 3-round threshold exists so escalation comes after real effort.
- **Owner answering items inline in chat without updating the queue.** Resolutions get logged so the next session can rehydrate.

---

## Rehydration

When a new Claude session starts after a break, the first read after MEMORY.md is `stuck-queue.md`. Active escalations get acknowledged before any new work begins.

When a new Codex session starts, same protocol.

---

## Currently active (as of 2026-05-22)

**None.** `stuck-queue.md` is empty. Phase 2 closed clean, Phase 3 is firing without blockers.

---

*Protocol authored by Claude. Tweaks via decision-log entry.*
