# nntrn/espn-wiki — 43 stars

## 1. Vision
One researcher's notes on ESPN's hidden API — mostly NFL: fantasy roster endpoints, scoreboard-via-jq recipes, betting endpoints, pick'em challenge notes, a gist listing ESPN endpoints, and misc snippets. Not a library; a field guide. Also links nfl-nerd, the author's prop-bet tooling.

## 2. The Ask
Needs nothing — it is documentation. A terminal, curl, and jq are enough to use it. The wiki pages are the product.

## 3. Constraints
- License: none declared — it is notes, not code, so there is nothing to license-adopt; the endpoint knowledge itself is factual.
- Scale: 43 stars, personal notes — coverage is whatever the author needed, not a complete API reference.
- Maintenance: pushed 2025-07-16 — quiet for over a year; ESPN endpoints may have drifted.

## 4. GSE lens
This is pure research gold for GSE's ESPN-adapter work and directly relevant to two known gaps: the DFS optimizer's missing live slate feed and the engine's need for schedule/scoreboard plumbing. The betting-endpoints page is especially interesting given the shadow-only props lane — it documents where ESPN exposes betting data without a key. The honest caveat is staleness (a year quiet), so every endpoint needs re-verification before GSE wires to it — which is exactly what the nfl_mcp-style watchdog pattern is for.

## 5. Verdict
REBUILD — treat the wiki as endpoint research: verify each endpoint live, then implement GSE's own thin ESPN client from the verified set. No code to copy, nothing to license.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nntrn/espn-wiki
- GitDiagram: https://gitdiagram.com/nntrn/espn-wiki
- Star history: https://star-history.com/#nntrn/espn-wiki (43 stars)
- github.dev: https://github.dev/nntrn/espn-wiki
