# marcodavidd020/cerebro-code-memory — 6 stars

## 1. Vision
Persistent code-knowledge memory across AI chat sessions, as an MCP server. Every new chat re-analyzes project folders from scratch, burning tokens re-discovering what a previous chat already learned. Cerebro caches the *understanding* — not just the files — in a small SQLite "brain" outside the chat. Three layers, cheapest first: (1) free structural map via tree-sitter (symbols + imports + dependency graph, PageRank-ranked modules, per-file hashes); (2) cached 1–3 sentence summaries recorded by chats as they understand files; (3) hash-based freshness — changed files are flagged stale so only they get re-read. One `cerebro_map()` call (~2–3k tokens) replaces reading 50 files (~100k tokens).

## 2. The Ask
Needs a Python MCP server running alongside the agent (Claude Code etc.), tree-sitter grammars for the target languages (Python, JS/TS incl. JSX/TSX, Dart/Flutter — TypeScript covered), and chats disciplined enough to call `cerebro_record()` as they learn. SQLite file lives in the project.

## 3. Constraints
- License: MIT.
- Scale: 6 stars, single maintainer, pushed 2026-07-04 — essentially a personal project. Summaries are only as good as the chats that record them; a fresh brain is empty. tsconfig path-alias resolution is a nice touch but the dependency graph is static-analysis only (no runtime behavior).
- Maintenance: ALIVE but fragile — one person, no community.

## 4. GSE lens
This is the single highest-leverage internal-tooling idea in the whole category for GSE. Garrett's fleet pays the "re-discover the Sports repo every session" tax constantly, across two hosts and many agents — exactly the problem Cerebro solves, and it solves it *cheaply*: a free tree-sitter structural map (no LLM), PageRank for module importance, and hash-gated cached summaries. Sports is TypeScript, which tree-sitter covers. GSE's 47-signal registry with zero producers and the wiring backlog would both be cheaper to work if every agent session started with `cerebro_map()` instead of a cold read. The staleness model (hash → re-read only what changed) is also the right answer to the wiki-rot problem the other tools in this set ignore.

## 5. Verdict
REBUILD — do not adopt the 6-star repo as a dependency; rebuild the three-layer design (tree-sitter map + PageRank + SQLite summary cache + hash freshness) as first-class GSE fleet infrastructure, exposed as an MCP server to every agent on both hosts. This is agent-velocity work with a direct token-cost payoff.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/marcodavidd020/cerebro-code-memory
- GitDiagram: https://gitdiagram.com/marcodavidd020/cerebro-code-memory
- Star history: https://star-history.com/#marcodavidd020/cerebro-code-memory (6 stars)
- github.dev: https://github.dev/marcodavidd020/cerebro-code-memory
