# Cursor Cloud Agents: launch works, retrieval does not (2026-09-29)

Measured against the live API with the founder's own key, on
`@cursor/sdk@1.0.32` (installed globally; Node 24.15.0).

## What works

| Operation | Result |
|---|---|
| `GET /v1/models` | **200** — 43 models |
| `GET /v1/repositories` | **200** — `Beexly/Sports` present |
| `Agent.create({...}).send(prompt)` | **201/200** — returns a real `agentId` (`bc-…`) and `runId` (`run-…`) |

Six agents were launched this way and the API accepted all six:

- `odds-blackout` · `pr-backlog-triage` · `provenance-fix-decision`
- `cursor-cloud-env` · `deploy-lag-audit` · `duplicate-logic-consolidation`

## What does not work

| Attempt | Result |
|---|---|
| `Agent.get({agentId})` | throws `t.startsWith is not a function` (SDK bug, masks the real error) |
| `agent.getStatus()` | does not exist on the handle |
| `GET /v1/agents` | **200 with an empty array** — the six agents are not listed |
| `GET /v1/agents/{id}` | **404** on every id we were handed |
| `GET /v1/agents/{id}/status` | **404** |
| `GET /v1/runs/{runId}` | **404** |
| `GET /v1/agents/{id}/runs/{runId}` | **404** |

**Conclusion: `send()` is write-only against this API surface.** An agent can be
created and started, and there is no supported read path to its transcript,
status, or output. `getStatus` is absent, so the earlier "IDLE / ACTIVE"
observations came from the object literal our own `create()` returned, not from
the server — they are not evidence of real progress.

## Two consequences that matter

1. **Output is stranded.** Cloud agents run in an ephemeral clone. Their markdown
   files do not exist on `origin`, and we cannot fetch the transcript. As of this
   writing, no `cursor-out/*` branch and no PR exists from any of the six. The
   work is presumed done and is currently **unrecoverable** through the API.
2. **Do not budget against it.** Launching six agents consumed included quota
   whose results we cannot verify we still hold. That is a poor trade against a
   $60/mo plan the founder intends to cancel.

## If this is retried

- **Do not** use the `cursor-agent` npm package. `cursor-agent@1.0.3` is a
  name-squat: it installs, reports a version, and ships `bin: null` with no
  executable. Verified and removed.
- The real integration is `@cursor/sdk`. The API host is `https://api2.cursor.sh`.
- Treat the dashboard at `https://cursor.com/agents/{agentId}` as the only
  readable surface until Cursor ships a documented read endpoint.
- Prefer having agents **open a pull request** over asking them to print output:
  a PR is visible to `gh` and therefore recoverable, which a transcript is not.

## Credential handling

The founder pasted the key in chat. It is treated as **burned**:

- never placed in `argv`, `env`, or a shell command (no process list, no history)
- stored only at `%LOCALAPPDATA%\hermes\.secrets\cursor_api_key`, outside every
  git repository
- every helper reads that file and redacts the value before printing
- all scratch scripts under `%TEMP%` are throwaway

Revoke it in Cursor regardless; a key pasted into a chat transcript should be
treated as disclosed.
