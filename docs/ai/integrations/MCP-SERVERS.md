# Official MCP Servers: Filesystem, Memory, Git, Fetch

> Source: `modelcontextprotocol/servers` (MIT, 88k★)
> Purpose: Native Claude Code tool protocol — the plumbing all other integrations sit on

## Why This First

Every other AI integration (mem0, LiteLLM, codebase-memory-mcp) runs as a tool or server
that Claude Code consumes via MCP. This repo is that protocol's canonical reference
implementation. Install these four servers and Claude Code gains:

- Cross-directory file read/write without shell cwd gymnastics
- Live web data fetching mid-session (odds APIs, injury feeds)
- Persistent knowledge-graph scratchpad across sessions
- Direct git introspection without shell calls

## Active Reference Servers

| Server | Package | Purpose |
|---|---|---|
| `filesystem` | `@modelcontextprotocol/server-filesystem` | File I/O with configurable ACLs |
| `memory` | `@modelcontextprotocol/server-memory` | Knowledge-graph persistence across sessions |
| `git` | `mcp-server-git` (Python) | Repo operations (log, diff, show, branch) |
| `fetch` | `@modelcontextprotocol/server-fetch` | Live URL fetching + HTML→Markdown |
| `sequential-thinking` | `@modelcontextprotocol/server-sequential-thinking` | Multi-step reasoning scaffolding |

## Installation (Zero-Install via npx/uvx)

All TypeScript servers run via npx — no global install required:

```bash
# Verify they work standalone first
npx -y @modelcontextprotocol/server-filesystem /workspace/sports
npx -y @modelcontextprotocol/server-memory
npx -y @modelcontextprotocol/server-fetch

# Python servers via uvx
uvx mcp-server-git --repository /workspace/sports
```

## Claude Code Configuration

Add to `~/.claude/claude_desktop_config.json` (Claude Desktop) or `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/workspace/sports",
        "/home/user/gse-competitive-intel"
      ]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "/workspace/sports"]
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

## GSN-Specific Use Cases

### filesystem — Cross-package refactors

Without filesystem MCP, Claude Code is limited to the shell's cwd. With it:

```
"Rename BetSlip.userId to BetSlip.ownerId across all packages — update the Prisma
schema, all API routes, all test fixtures, and the Stripe webhook handler."
```

This traverses `packages/db/prisma/`, `apps/web/app/api/`, `apps/web/lib/stripe.ts`,
and `packages/ingestion-pipeline/` in a single session atomically.

### memory — Domain knowledge graph for betting

Persist GSN domain concepts across sessions so Claude doesn't re-learn the schema:

```
"Store in memory: Sport entity {id, key, name}. League extends Sport.
Market types: H2H, SPREADS, TOTALS. OddsProvider: TheOddsAPI, ESPN.
BettingEdge definition: confidence > 65 AND model_line differs from market_line by > 0.5."
```

Next session, Claude queries the graph rather than re-reading Prisma schema.

### fetch — Live odds data during dev

```
"Use the fetch MCP tool to GET https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds
?apiKey=$ODDS_API_KEY&regions=us&markets=spreads
Then write the TypeScript types for the response and add validation to DataNormalizer."
```

Real response → correct types, no mocks needed.

### git — Audit trail queries

```
"Use git MCP to show me every commit that touched lib/api-auth/hash.ts.
Then show the diff from the commit before the timingSafeEqual fix."
```

## Archived Servers (Community Maintained)

Brave Search, Puppeteer, PostgreSQL, Redis, GitHub, Slack were archived from this repo
but actively maintained at community forks. Replacements:

```bash
# Postgres (community fork)
npx -y @modelcontextprotocol/server-postgres \
  postgresql://localhost/sports_dev

# GitHub (community)
npx -y @modelcontextprotocol/server-github
# env: GITHUB_TOKEN

# Web search — use tavily-mcp or brave-search-mcp
npx -y tavily-mcp
# env: TAVILY_API_KEY (free tier: 1,000 searches/month)
```

## Why Remote-Container Friendly

All TypeScript servers run via `npx` with zero pre-install. Python servers via `uvx`.
The `memory` server writes to a JSON file — mount `/home/user/.mcp/memory/` as a volume
to persist the knowledge graph across container restarts.

## Status

- [ ] Add filesystem, memory, git, fetch to `~/.claude/claude_desktop_config.json`
- [ ] Verify with `/mcp list` in Claude Code — should show all 4 servers
- [ ] Seed the memory server with GSN domain entities (Sport, Market, OddsProvider)
- [ ] Test `fetch` against live Odds API endpoint
- [ ] Add postgres community server pointed at local `sports_dev` database
