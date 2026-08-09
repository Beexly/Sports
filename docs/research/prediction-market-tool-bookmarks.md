# Prediction-market tool bookmarks (research only)

**Compliance:** GSE product holds Polymarket as non-surface (`docs/agent-skills/polymarket-hold`).
This list is **founder research / internal architecture reference** — not a build order for public markets or trading bots.

Harvested from Awesome-Prediction-Market-Tools + Machina session clones (2026-08-09).

## Prefer for GSE-shaped learning

| Tool | Why useful | Use posture |
| --- | --- | --- |
| [PolyRouter](https://polyrouter.io) | Normalized multi-venue API shapes | Schema reference for internal fair-value joins |
| [Dome](https://domeapi.io) | Unified PM data SDK patterns | Client design notes only |
| [PMXT](https://github.com/qoery-com/pmxt) | Open multi-exchange API | Matching / series patterns |
| [pykalshi](https://github.com/ArshKA/kalshi-client) | WS + orderbook ideas | Kalshi ingest resilience |
| [Probalytics](https://probalytics.io) | Tick research infra | Offline RES studies |
| [TREMOR](https://github.com/sculptdotfun/tremor) | Terminal + SQL analytics | Ops dashboard patterns |
| [Metaforecast](https://metaforecast.org) | Cross-platform aggregation UX | Observatory UX research |
| [Oddpool](https://www.oddpool.com) | Cross-venue dashboard | Competitive scan |
| [Polyseer](https://www.polyseer.xyz) | Multi-agent evidence reports | Content/evidence report shape |

## Avoid for product (unless counsel clears)

- Execution / copy-trading bots  
- Whale-alert product features  
- Arb scanners as customer features  
- Any “guaranteed edge” marketing from PM tools  

## Already leveraged in GSE

- Kalshi public REST → independent fair values (soft-fail)  
- ClubElo / ESPN FPI / Dixon–Coles soccer  
- sports-skills series map → `kalshi-series.ts`  
- Gamma read-only behind `INDEPENDENT_POLYMARKET` default OFF  
