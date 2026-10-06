# savvides / ff

- **Stars:** 2 | **License:** MIT | **Pushed:** 2026-09-30 (alive) | **Lang:** Python (CLI, CI badge)

## Vision
A fast, local, scriptable CLI for running a Sleeper dynasty league from the terminal: power rankings, trade analyzer with **multi-market arbitrage** (FantasyCalc vs KeepTradeCut values), roster valuation, lineup optimizer, waiver targets, injury tracking, live draft board. The pitch: no page loads, no ads, pipeable, cron-able, zero tracking.

## The Ask
- `make install`, `./ff setup <sleeper-username>`. All data sources free/public/read-only: Sleeper API, ESPN scoreboard (kickoff times), Sleeper/RotoWire projections, FantasyCalc API, KeepTradeCut. Optional local LLM runners (ollama/gemini/claude) for plain-English Q&A over deterministic analysis tools.

## Constraints
- MIT — adoptable.
- Dynasty/Sleeper-specific. Crowdsourced KTC values are noisy; the tool acknowledges this by cross-checking two markets rather than trusting one.

## GSE lens
Two things GSE lacks, both cheap to steal: (1) **multi-market arbitrage as a first-class feature** — comparing FantasyCalc vs KTC to find mispriced players is a genuinely novel signal type, and GSE has no market-value layer at all (same blind spot cameron-eth/sleeper-sdk flagged). (2) **The CLI-as-product philosophy**: fast, scriptable, cron-able, local-cache-first. GSE's engine is only reachable by agents reading code/DBs; a `gse` CLI with the same properties (setup once, `gse projections --week 5`, pipeable JSON) would make the engine usable by every agent in the fleet *today*, before any MCP server exists. The deterministic-tools + LLM-Q&A split is also the right pattern for GSE's reasoning lane: the LLM narrates, the Python tools compute — which is exactly what the INVALID first trace was missing (a compute substrate behind the refusal).

## Verdict
**REBUILD** — MIT allows borrowing; rebuild the CLI pattern and the multi-market arbitrage signal as GSE's own (a `gse` CLI is high-leverage for the agent fleet).

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/savvides/ff
- GitDiagram: https://gitdiagram.com/savvides/ff
- Star history: https://star-history.com/#savvides/ff (2 stars)
- github.dev: https://github.dev/savvides/ff
