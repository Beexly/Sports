# andyhtran/deepwiki-by-cc — 9 stars

## 1. Vision
Generate comprehensive, navigable wikis for any GitHub repo or local codebase using Claude or Codex — but *agentically*: each wiki page is written by an agent running inside the repo checkout with read-only tools (read, grep, glob), starting from outline seed files, tracing behavior across the codebase, and verifying claims against code it actually read. Ships with published eval results showing agentic page-writing measurably beats one-shot context injection. TypeScript/Bun, Docker self-host, Mermaid diagrams, sidebar navigation.

## 2. The Ask
Needs Claude Code or Codex CLI with a valid model subscription/key, a repo checkout (GitHub URL or local dir), and Docker for self-hosting. Page generation is agentic, so cost scales with page count × agent steps — more expensive per page than one-shot generation, by design.

## 3. Constraints
- License: MIT.
- Scale: 9 stars, single maintainer — the smallest project in this set. Eval results are from 2026-07-01, single-run; treat as directional, not gospel.
- Maintenance: ALIVE — pushed 2026-07-13. Tiny but current, and the design is modern (Claude Code-native).

## 4. GSE lens
This is the closest stack-and-culture match in the entire category: Claude-driven, TypeScript, read-only agent tools, and — critically — a *verify claims against the code* discipline that mirrors Garrett's verify-twice rule and GSE's "never say complete without coverage" posture. GSE's Sports repo desperately needs a living wiki for the fleet, and this project's method (agentic pages with evidence) is how to build one that doesn't rot into fiction. The published agentic-vs-injected eval is also ammunition for GSE's own agent-quality arguments. Star count is irrelevant here; the method is the find.

## 5. Verdict
REBUILD — highest-priority blueprint in this category. Rebuild the agentic wiki pipeline (outline → per-page read-only agent → claim verification → Mermaid) as GSE-internal tooling over the Sports repo, and replicate the eval pattern (agentic vs injected) to prove it.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/andyhtran/deepwiki-by-cc
- GitDiagram: https://gitdiagram.com/andyhtran/deepwiki-by-cc
- Star history: https://star-history.com/#andyhtran/deepwiki-by-cc (9 stars)
- github.dev: https://github.dev/andyhtran/deepwiki-by-cc
