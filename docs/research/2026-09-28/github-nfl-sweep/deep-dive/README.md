# Deep dive — NFL GitHub sweep, second pass (2026-09-28)

Ordered by Garrett: double-check the morning sweep, go deeper, find what's under-leveraged.

- **completeness-audit.md** — 6 re-cut searches (1,094 repos); 30 class-(a) misses + 34 marginals pass 1 couldn't see (recency bias; GitHub's 1,000-result cap).
- **teardown-pydfs-lineup-optimizer.md** — full method teardown of the canonical open DFS optimizer vs GSE's `apps/web/lib/fantasy/` stack, point by point.
- **teardown-dojzero.md** — agentscope-ai/DojoZero: infrastructure worth mining (DataHub/replay/gateway/scheduler), prediction layer worth ignoring (vibe bets, no model).
- **teardown-pgatour-ai.md** — verdict: REAL (unlike AIntelligent-Oddz's skeleton); no license so method-only.
- **teardown-nfl-simulator-method.md** — dgrifka/nfl_simulator deserve-to-win math pipeline + the reproducibility protocol worth adopting.
- **keeper-deep-passes.md** — one level deeper on all 10 top keepers; 4 corrections to pass 1's labels.
- **orchestration-index.md** — keeper × GSE-lane × build directive × license gate; honest gaps unanswerable from GitHub; research-side handoff for the coding agent.

Corrections log lives at the bottom of `orchestration-index.md`. Filing copies of the raw wave reports: `~/workspace/dojozero-teardown/REPORT.md`, `~/workspace/research/nfl-simulator-dtw-extraction.md`.
