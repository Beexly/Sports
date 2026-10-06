# GitHub NFL tooling sweep — 2026-09-28

Ordered by Garrett: page through GitHub's NFL repo results (sort=updated) and wiki results, code-level, and file the keepers.

**Scope covered:**
- **Wave 1:** `/search/repositories?q=NFL&sort=updated&order=desc` — 10 pages × 100 = **1,000 unique repos** scanned, filtered to 701 candidates, 29 code-grounded keepers kept (`repos-wave1-inventory.md`).
- **Wave 2:** `/search?q=NFL&type=wikis` — 5 pages; wiki surface degrades into spam past page 2; 5 documentation standouts kept (`wikis-wave2-inventory.md`).
- **Wave 3:** prior research filed without rework (`prior-work-filed.md`).
- Deep reads on 2 repos where payoff justifies it: **ryanpmcintire/nfl_py3** (experiment pipeline) and **chmoses98/nfl-edge-finder** (joint parlay engine).

## Top-10 keepers — GSE fit verdicts

1. **cbratkovics/fantasy-football-ai** (MIT, 16★) — dbt bronze/silver/gold + as-of feature engineering + per-position RF/XGBoost with decision-policy tables. *Fit: closest architecture reference to GSE's total-signal doctrine; the as-of/no-lookahead pattern is exactly what "backtest every rule" needs.*
2. **ryanpmcintire/nfl_py3** (MIT, 15★) — Bayesian team model, market-updated model, leader-median confidence, agentless experiment pipeline (declarative spec → reliability check → bootstrap → registry). *Fit: its weak-signal registry is the pattern GSE's rule store should copy, rule-for-rule.*
3. **chmoses98/nfl-edge-finder** (no license — method only) — Monte Carlo game/period/player engines with common random numbers; joint engine prices composites on the SAME draws, never multiplying marginals; market reconciliation weights. *Fit: parlay correlation pricing done right — benchmark our DFS payout sim's correlation layer against this.*
4. **mtsilverstein/Megatron** (no license — method only) — encoder-only PyTorch quantile transformer for fantasy floor/ceiling; trained per-season checkpoints 2016→2025 with calibration.json per fold. *Fit: quantile-output fantasy model — how a serious builder structures probabilistic player projections.*
5. **mattleonard16/nflalgorithm** (MIT, 9★) — 0-100 confidence engine tiered Premium/Strong/Marginal/Pass; model provenance utils; pipeline state machine. *Fit: confidence-tier presentation for posted picks.*
6. **ebhattad/nfl-mcp** (MIT, 7★) — MCP server over DuckDB nflverse data: 8 tools (schema, read-only SELECT guardrails, play search, team/player stats, compare). *Fit: the MCP wrapper pattern for agent access to engine data.*
7. **jlattanzi4/nfl-survivor-optimizer** (MIT, 2★) — survivor optimizer maximizing log p − λ·log field-survival; Hungarian assignment over weeks×teams; JS port with parity tests. *Fit: pick'em/survivor lanes — objective formulation worth porting.*
8. **sportsdataverse/nfl-ngs-raw** (no license — method only) — scrapes nextgenstats.nfl.com/api JSON into a committed raw library, seasons 2009→present; sibling nfl-ngs-data reshapes to datasets. *Fit: NGS program — a proven scrape→reshape pipeline shape to study.*
9. **sumedhk0/PanopticPigskin** (AGPL-3.0 — study only) — broadcast-camera calibration from field geometry (homography decomposition, field detection, endzone paint), player tracking, Gaussian-splat 3D replay. *Fit: movement/video pipeline CV vocabulary.*
10. **Twoos123/draftkings-live-odds** (no license — method only) — DraftKings push feed → Next.js + SSE, ~0.2s behind the book. *Fit: live-feed architecture reference for the DFS slate provider gap.*

## License posture (standing rule)

Repos marked **no license** = all rights reserved: method-level learning only, never copy code; rebuild independently. MIT = reusable with attribution. AGPL-3.0 = study only, never incorporated.

## Notes

- Wiki wave past page 2 was noise (spam DeepWiki mirrors); signal was all on pages 1–2.
- Several of these repos (tucknub/nfl-prop-war-room, bsr-0/nfl-player-projections, ryanpmcintire/nfl_py3) are visibly other-agent builds (`.claude/`, CLAUDE.md, pipeline gates) — the space is being worked by agent fleets, not just humans.
- No registry-packages surface exists for NFL via API; the web registry search is unusable (anonymous containers).
