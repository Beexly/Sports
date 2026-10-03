# Wave 2 — NFL wiki inventory

`/search?q=NFL&type=wikis&s=updated&o=desc`, 5 pages, 2026-09-28.
The wiki search page only exposes text snippets (no repo URLs on the page), so each hit below was
identified via targeted search. Pages 3–5 degraded into noise (spam DeepWiki mirrors, TV listings);
all signal was on pages 1–2.

## Standouts

| Owner / repo | What the docs cover | Why it matters to GSE |
|---|---|---|
| **dgrifka/nfl_simulator** — `docs/research/*.md` (75 numbered docs) | Deserve-to-win metric: definitions, OLS weights on 2016–2023, 40k-draw bootstrap, degeneracy bands, sequencing-luck studies (EPA/WPA, red-zone gap measures S0–S4), FG-read-side fix, magnitude audit | The most methodologically rigorous single-build NFL model doc on GitHub; deserves a full read-through for luck-adjustment and validation rigor |
| **pseudo-r/Public-ESPN-API** | Undocumented ESPN API endpoints, URL params, JSON shapes across 20+ sports; league slugs table (NFL `nfl`, sport `football`); fantasy API (`fantasy.espn.com/apis/v3/games/ffl/...`) | Canonical reference for any ESPN intake; check against our nflverse/Sleeper adapters for coverage gaps |
| **sx-bet/sx-bet-api-docs** | SX.bet API: Get Leagues/Fixtures/Odds, league IDs, place-bet parameter mapping, period status semantics (O/I/H), live odds-change notes | On-chain sportsbook integration reference if a prediction-market lane ever opens |
| **lumifyai/lumify** — `docs/sports/nfl-api.md` | NFL API landing pattern for AI agents: events/odds/history/player-props/team-props/period-odds/splits/intelligence/EV scan/forecasts | Template for how a sports API surfaces itself to agents — useful if GSE ever exposes an API |
| **shubhsheth/sports-calendar** — `docs/ESPN_API.md` | Reverse-engineered ESPN Core API (`sports.core.api.espn.com`) vs Site API; `$ref` stub pattern; league identifiers + season-ID convention (calendar year season starts) | Complements Public-ESPN-API; the season-ID convention is a trap we should codify |

## Wiki hits deprioritized

- **MMM-NFL** (fewieden): MagicMirror score display module — consumer gadget, no method.
- **nfl-combine-for-AI** (renamed combine-for-ai): AI model quantization benchmark harness — the "NFL" is a name, not a sport; junk hit.
- **Kalshi market-discovery wikis**: scattered bot docs about seasonal market rotation; bot-specific, no reusable method.
- **Stocks Fetcher (src/fetchers/stocks.py)** referencing NFL: unrelated Korean finance repo; junk hit.
- **TV/IPTV EPG wikis** (braggkd/iptv-sports-epg): XMLTV generation for sports channels — consumer, not signal.
