# Machina CLI — founder runbook (GSE leverage)

**Installed in agent sandbox:** `machina-cli` **v0.8.0** + `sports-skills` **0.30.1**  
**Repo mirror:** `/workspace/research/machina-cli`  
**Platform:** [machina.gg](https://machina.gg) · CLI source [machina-sports/machina-cli](https://github.com/machina-sports/machina-cli)

Agents **cannot** complete browser SSO for you. Auth is founder-only on your machine
(or via a project API key you mint and pass to CI).

---

## Install (your machine)

### Windows (PowerShell) — what you pasted
```powershell
irm https://raw.githubusercontent.com/machina-sports/machina-cli/main/install.ps1 | iex
```

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/machina-sports/machina-cli/main/install.sh | bash
# or
pipx install machina-cli
```

### Verify
```bash
machina version   # expect ≥ 0.8.0
machina sports --help
```

---

## First session (founder)

```bash
# 1. Authenticate (opens browser — Clerk SSO / magic link)
machina login
# CI alternative:
# machina login --api-key <project-or-org-key>

# 2. Org + project context
machina org list
machina org use <org-id>
machina project list
machina project use <project-id>
machina auth whoami

# 3. Inventory (what agents can harvest once you share --json dumps)
machina workflow list --json
machina agent list --json
machina skills list --json
machina template list --json
machina connector list --json

# 4. Sportsclaw / MCP bridge (if using sportsclaw agent)
machina connect --json --probe
# durable key for agent:
machina connect --mint --reveal --json
```

Interactive REPL: run `machina` with no args.

---

## Zero-key sports data (works without login)

`machina sports` delegates to **sports-skills** — public Kalshi / ESPN-family modules need **no Machina account**.

```bash
machina sports kalshi get_exchange_status
machina sports kalshi get_sports_config      # series map GSE already harvests
machina sports kalshi get_todays_events
machina sports kalshi search_markets "MLB"
machina sports nfl --help
machina sports markets --help
```

Live snapshot (agent, 2026-08-09): Kalshi exchange **trading_active=true**, **18 sports** in
`get_sports_config` (NFL/NBA/MLB/NHL/WNBA/CFB/CBB + EPL/MLS/UCL/… + World Cup + esports).
Saved: `docs/ops/machina/kalshi-sports-config-live.json`,
`docs/ops/machina/kalshi-sports-series-map.json`.

GSE `packages/data-ingestion/src/kalshi-series.ts` `KALSHI_SERIES` already mirrors this map
for game-series primary stems.

---

## High-leverage CLI surfaces for GSE

| Command | Use for GSE |
| --- | --- |
| `machina sports kalshi *` | Independent fair values, series search, live quotes (no key) |
| `machina sports markets` | Cross-market matching research |
| `machina skills install/push` | Ship sports-skills packs into a Machina pod |
| `machina factory` | Trigger Factory coding-agent builds (org-gated) |
| `machina connect` | Wire sportsclaw / external agent MCP to a project |
| `machina context-graph` | Self-healing / monitoring across projects |
| `machina org usage` | Token cost control (billing month) |
| `machina create` | Scaffold deployable Machina apps |

---

## What to send the coding agent after you log in

Paste (or attach JSON from):

1. `machina auth whoami --json` (redact email if needed)
2. `machina org list --json` + which org is GSE
3. `machina project list --json` + selected project id
4. `machina skills list --json`
5. `machina template list --json`
6. Optional: `machina connect --json` (token masked OK)

With that, the next autonomous pass can inventory pods, install skills, and
wire only what improves ranking / content — still no free-path wipe, no floor
relax, no edge-as-p.

---

## Integrity

- Machina auth secrets stay in `~/.machina/credentials.json` (mode 600) — never commit.
- Polymarket product hold still applies inside GSE even if Machina templates expose Gamma.
- Ranking floors / AUTO_PUBLISH / maps remain as on main.
