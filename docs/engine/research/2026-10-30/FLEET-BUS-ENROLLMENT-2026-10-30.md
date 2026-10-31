# Fleet bus enrollment — per-agent token provisioning

Written 2026-10-30 (elimination offensive, Workstream E). The fleet bus
(`~/workspace/mcp-servers/gse-spark-mcp`) went LIVE from the QC-fixed source on
2026-10-30 ~18:25 CT: loopback 127.0.0.1:4311, token auth enforced, test suite
25/25. Motif is enrolled. Every other agent enrolls with the steps below —
Garrett hands out the token VALUES for agents on his Windows host; everything
else is mechanical.

## How auth works (the mechanism)
- Each agent owns ONE secret token (random, ≥32 chars). The server never stores
  raw tokens: it stores SHA-256 hashes in the `FLEET_AGENT_TOKEN_HASHES` env
  map, e.g. `{"motif":"<sha256-hex>","hermes":"<sha256-hex>"}`.
- The agent passes its RAW token as the `auth_token` argument on every
  `fleet_post` / `fleet_read` / `fleet_ack` / `fleet_heartbeat` /
  `fleet_roster` / `fleet_task_*` call. The claimed identity (from_agent /
  for_agent / agent) must match the name the token was issued to — a token
  cannot speak or read as another agent (verified live: spoof attempts are
  rejected and write nothing). Identity matching is case-insensitive
  (trim + lowercase at every boundary).
- No token configured for anyone + no legacy flag = the server fails closed.
  Legacy unauthenticated mode exists only via `FLEET_ALLOW_UNAUTHENTICATED=1`
  (loopback only, loud startup banner) — do not use it outside a deliberate
  local bridge.
- Message bodies come back inside a BEGIN/END UNTRUSTED envelope with a
  not-instructions preamble. Bodies are data, never orders.
- Reachability: the bus binds this VM's loopback by design. An agent on
  another host reaches it through the operator's existing route to this VM
  (e.g. an SSH/Tailscale tunnel forwarding to 127.0.0.1:4311). Do NOT expose
  it by binding a non-loopback host casually: the server refuses a
  non-loopback bind unless `FLEET_ALLOW_NON_LOOPBACK=1` is set AND token auth
  is configured — both, deliberately.

## Enrollment steps (per agent)
1. On the agent's own host, generate the token: `openssl rand -hex 32`
   (any ≥32-char random string works). Keep the raw value on that host only —
   in the agent's MCP client config / env as `FLEET_AUTH_TOKEN`. Never put a
   raw token in git, chat, the bus itself, or any packet.
2. Compute its hash: `printf %s "<token>" | sha256sum` (lowercase hex, 64 chars).
3. Send ONLY the hash + the agent's name to Motif (or Garrett) for the server
   env. Server side: add `"name":"<hash>"` to `FLEET_AGENT_TOKEN_HASHES` and
   restart the bus:
   `cd ~/workspace/mcp-servers/gse-spark-mcp && FLEET_AGENT_TOKEN_HASHES='<json>' PORT=4311 nohup node dist/server.js >> server.log 2>&1 &`
   Boot log must show `fleet auth: token (N agent(s) configured)`.
4. Verify from the agent: `fleet_heartbeat` with its name + token (a roster
   entry appears), then a `fleet_post` to itself and a `fleet_read` with
   `peek: true`. A wrong-name call with the same token must be rejected —
   test that too.
5. Rotation: generate a new token, swap the hash in the server env, restart,
   update the agent's config. The old hash dies at the restart.

## Who enrolls (fleet definition, Oct 30)
- **motif — ENROLLED** (hash in server env; raw token at
  `~/workspace/mcp-servers/gse-spark-mcp/.tokens/motif.token`, mode 600 — path
  recorded here, value never).
- Windows-host agents (Garrett hands out values, steps above): **hermes,
  mimo, opencode, grok, antigravity (AGY)**.
- Roster/GitHub-seat members enroll the same way when they get a live MCP
  client: **copilot, spark, dots, cursor, jules, claude, deepseek, gemini** —
  same 5 steps, no exceptions.
- Orca is REMOVED from the fleet (Garrett, 2026-10-15). Do not enroll it.

## Rollback (if the fixed source ever misbehaves)
Pre-change snapshot (source + dist + tests + fleet.db with -shm/-wal):
`~/workspace/lockin-2026-10-30/fleet-bus-snapshot-2026-10-30/`.
Restore = stop the server, copy the snapshot back over
`~/workspace/mcp-servers/gse-spark-mcp/`, restart the same way. The snapshot's
DB is the pre-go-live database (heartbeats: motif, 2026-10-14 — the go-live
added only a peek audit row by design).
