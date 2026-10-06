# derekrbreese / fantasy-football-mcp-public

- **Stars:** 88 | **License:** MIT | **Pushed:** 2026-09-06 (alive) | **Lang:** Python (FastMCP)

## Vision
A single-user MCP server that exposes a Yahoo fantasy league (rosters, matchups, waivers, draft, lineup analysis) to AI clients like Claude Desktop. Built to let an assistant reason over *your* league data conversationally: lineup optimization, draft recommendations, waiver research, team comparisons, even Reddit sentiment analysis.

## The Ask
- User supplies their own Yahoo developer credentials/OAuth tokens. Single-user by design; multi-user branch is experimental.
- **Yahoo now requires manual API approval and grants read-only access** — no write actions (adds/drops/lineup changes) possible through the API at all. The tool surface is read + recommend.

## Constraints
- MIT — adoptable.
- Platform-locked to Yahoo. Single-user architecture; not a shared service.
- Yahoo's read-only restriction caps what any agent can *do*, not just this repo.

## GSE lens
This is the architecture GSE is missing: **an MCP surface over the engine.** Garrett's mandate is that the engine is all-knowing and constantly absorbing; right now it has no programmatic way for an agent (or a user in Claude) to *ask* it questions. A GSE MCP server — projections, rankings, DFS optimizer, signal registry exposed as tools — would let Motif, Hermes, and Garrett query the engine conversationally instead of reading DBs. The Yahoo read-only lesson also matters: GSE should design its agent tooling around "recommend, don't act" where platforms restrict writes. Blunt point: a solo dev's side project has a cleaner agent-integration story than GSE's engine does today.

## Verdict
**REBUILD** — GSE should build its own MCP server over the engine (MIT allows borrowing patterns); Yahoo-specific code doesn't transfer.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/derekrbreese/fantasy-football-mcp-public
- GitDiagram: https://gitdiagram.com/derekrbreese/fantasy-football-mcp-public
- Star history: https://star-history.com/#derekrbreese/fantasy-football-mcp-public (88 stars)
- github.dev: https://github.dev/derekrbreese/fantasy-football-mcp-public
