# codebase-memory-mcp Integration Guide

> Source: `DeusData/codebase-memory-mcp` (C, 33k★)
> Purpose: High-performance code intelligence — indexes GSN into a persistent knowledge graph

## What This Solves

The GSN monorepo spans 6 packages + workers + 140+ API routes. When working on cross-cutting concerns (auth, subscription gates, data freshness), you currently grep manually. `codebase-memory-mcp` builds a persistent knowledge graph of the entire codebase — functions, call chains, HTTP routes, import paths — queryable in under 1ms.

Benefits:
- Find all callers of `checkClearance()` instantly
- Trace the full call path from `/api/odds` to The Odds API
- Identify all files touching `prisma.pick` without grep
- Sub-millisecond graph queries (158 languages, tree-sitter parsing)

## Local Installation (macOS/Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

The installer auto-detects Claude Code and configures it. Single static binary, zero dependencies.

## Configuration in Claude Code

After install, the MCP server auto-registers. Verify:

```bash
# In Claude Code:
/mcp list
# Should show: codebase-memory-mcp
```

To index the Sports repo:
```
Tell Claude: "Index /workspace/sports as project 'gsn'"
```

## Key Queries for GSN Development

```bash
# Find all callers of checkClearance
codebase-memory-mcp cli trace_path '{"project": "gsn", "function_name": "checkClearance", "direction": "incoming"}'

# Find all HTTP routes
codebase-memory-mcp cli search_graph '{"project": "gsn", "name_pattern": ".*Handler.*|.*Route.*"}'

# Trace the odds ingestion pipeline
codebase-memory-mcp cli trace_path '{"project": "gsn", "function_name": "fetchOdds", "direction": "both"}'

# Find all subscription gate usages
codebase-memory-mcp cli search_graph '{"project": "gsn", "name_pattern": "requireSubscription|getServerSession"}'

# Architecture overview
codebase-memory-mcp cli get_architecture '{"project": "gsn"}'
```

## Integration with Claude Code Sessions

Once indexed, Claude Code can answer architecture questions directly:
- "Which functions call `dispatchWatchlistAlert`?"
- "What imports `odds-failover.ts`?"
- "Show me all API routes that access `prisma.pick`"
- "Trace the path from webhook receipt to settlement"

## MCP Config (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "codebase-memory": {
      "command": "codebase-memory-mcp",
      "args": ["serve"],
      "env": {}
    }
  }
}
```

## Status

- [ ] Install `codebase-memory-mcp` on local dev machine
- [ ] Index `/workspace/sports` as `gsn`
- [ ] Index `beexly/gse-competitive-intel` as `gsn-intel`
- [ ] Verify 15 MCP tools available in Claude Code
