# Cursor Cloud Agents: BLOCKED BY ACCOUNT SPEND LIMIT, not an API limitation (2026-09-29)

> **CORRECTION (2026-09-29, later the same day).** This file originally concluded that
> `send()` was write-only and that the agents' output was unrecoverable. **That
> conclusion was wrong.** The real cause is simpler and was reported to us by Cursor:
> the account hit its on-demand spend limit, so runs were blocked before executing.
> Nothing was consumed from the included plan and no work was lost — there was never
> any work. The read-path 404s below are real but are a *symptom* of agents that never
> ran, not evidence of a read/write asymmetry in the API.
> The original reasoning is preserved below so the mistake is auditable.

---

## Actual cause (2026-09-29, from Cursor's own notice)

> "You hit the $200 on-demand spend limit you set last week, and your runs have been
> blocked since. Your usage resets on October 23."

- Runs blocked since the limit was reached.
- **Usage resets 2026-10-23.** No payment is required to resume.
- The founder's instruction was explicit: maximize the CURRENT subscription, spend
  nothing further. So the limit stays where it is and Cursor stays dark until the
  reset. **Do not raise the on-demand limit.**

## What the original (wrong) inference was

The six agents returned real `agentId` (`bc-…`) and `runId` (`run-…`) values from
`send()`, and every read path 404'd. That pattern is consistent with BOTH of these:

1. an API with no read surface (the original conclusion), and
2. agents that were accepted but never started (the actual cause).

I picked (1) and wrote it into a ledger row and a doctrine doc as a measured finding.
Both the ledger row and this file needed the correction, and the general lesson is
below.

## Measured API surface (still accurate as raw observation)

| Attempt | Result |
|---|---|
| `GET /v1/models` | 200 — 43 models |
| `GET /v1/repositories` | 200 — `Beexly/Sports` present |
| `Agent.create({...}).send(prompt)` | returned ids for all six agents |
| `Agent.get({agentId})` | throws `t.startsWith is not a function` (SDK 1.0.32 bug) |
| `agent.getStatus()` | does not exist on the handle |
| `GET /v1/agents` | 200, empty array |
| `GET /v1/agents/{id}`, `/status`, `/v1/runs/{runId}` | 404 |

## LESSON (this is the part worth keeping)

**Never infer a capability limitation from a 404 when a billing or quota state is
also plausible.** Check the account state first. `send()` returning an id is
consistent with "queued and never started," and I treated the id as proof of work.

The same class of error appears in this repo's own history: a research measurement
was wrong for a reason that had nothing to do with the thing being measured, and
another was wrong because a name-matching rule counted conventions as content. In
all three cases the number was published before the cause was checked.

## Name-squat warning (unchanged, independently verified)

`cursor-agent@1.0.3` on npm is a name-squat: it installs, reports a version, and
ships `bin: null` with no executable. Verified by inspection and removed. The real
integration is `@cursor/sdk`; API host is `https://api2.cursor.sh`.

## Credential handling (unchanged)

The founder pasted the key in chat; it is treated as burned. Never placed in `argv`,
`env`, or a shell command. Stored only at
`%LOCALAPPDATA%\hermes\.secrets\cursor_api_key`, outside every git repository.
All helpers read that file and redact before printing. Revoke it regardless — a key
pasted into a chat transcript should be treated as disclosed.
