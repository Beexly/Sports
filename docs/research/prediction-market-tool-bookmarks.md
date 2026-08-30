# Prediction-market tool bookmarks (research only)

**Compliance:** GSE product holds Polymarket as non-surface (`docs/agent-skills/polymarket-hold`).  
This list is **founder research / internal architecture reference** — not a build order for public markets or trading bots.

**Full triage (A/B/C/D buckets):**  
[`prediction-market-ecosystem-triage-2026-08-09.md`](./prediction-market-ecosystem-triage-2026-08-09.md)  
Source: [Oddpool](https://www.oddpool.com/) catalog + Awesome-Prediction-Market-Tools (2026-08-09).

---

## Prefer for GSE-shaped learning (Bucket A)

| Tool | Why useful | Use posture |
| --- | --- | --- |
| [PolyRouter](https://polyrouter.io) | Normalized multi-venue API shapes | Schema reference for internal fair-value joins |
| [Dome](https://domeapi.io) | Unified PM data SDK patterns | Client design notes only |
| [PMXT](https://github.com/qoery-com/pmxt) | Open multi-exchange API | Matching / series patterns |
| [pykalshi](https://github.com/ArshKA/kalshi-client) | WS + orderbook client ideas | Kalshi ingest resilience |
| [Probalytics](https://probalytics.io) | Tick-level research infra | Offline RES studies |
| [TREMOR](https://github.com/sculptdotfun/tremor) | Terminal + SQL analytics | Ops dashboard patterns |
| [Metaforecast](https://metaforecast.org) | Cross-platform forecast aggregation UX | Observatory UX research |
| [Oddpool](https://www.oddpool.com) | Ecosystem directory | Competitive scan SoT |
| [Polyseer](https://www.polyseer.xyz) | Multi-agent evidence reports | Content/evidence report shape |
| [Verso](https://www.oddpool.com/) | Institutional terminal density | Cockpit packaging (scan) |
| [Synthesis](https://www.oddpool.com/) | Cross-market price compare | Fair vs book label honesty |
| [Adjacent News](https://www.oddpool.com/) | PM-driven news APIs | Pair with free RSS wire |
| [Aeon](https://github.com/) | Scheduled shift monitors | Ops cron/alert pattern |
| [Sportstensor](https://www.oddpool.com/) | Ensemble sports prediction framing | Multi-independent estimators only |
| [Octagon AI](https://www.oddpool.com/) | Cited research reports | Content source discipline |
| [Alphascope](https://www.oddpool.com/) | Probability-shift framing | Signal board language |
| [oracle3](https://github.com/YichengYang-Ethan/oracle3) | Wang Transform / constraint math | **Paper math only** — no execution |
| [MiroShark](https://www.oddpool.com/) | Swarm narrative sim | Offline narrative experiments |

---

## Hard hold (Bucket D) — never productize

- Execution / autonomous betting agents (BillyBets, PolyClaw, AIXBET, Semantic 42, Simmer live, TurbineFi bots…)  
- Arbitrage scanners (ArbBets, Eventarb, Polytrage, PolyScalping, Prediction Hunt…)  
- Whale copy-trade / insider-framed alerts (Stand, Polycool, PolyTrack, PolyIntel…)  
- Accuracy theater (“98%”, “89% alert accuracy”) without GSE floors  
- DeFi leverage / credit against PM positions  
- Fake Polymarket screenshot generators as brand surfaces  

---

## Already leveraged in GSE

- Kalshi public REST → independent fair values (soft-fail)  
- ClubElo / ESPN FPI / Dixon–Coles soccer  
- sports-skills series map → `kalshi-series.ts`  
- Gamma read-only behind `INDEPENDENT_POLYMARKET` default OFF  
- Line movement + parlay tools math on `/tools`  
- B2B experimental signals with rankingP  

---

## Competitive wedge (one line)

The Oddpool list is **crowded with auto-trade + whale copy**. GSE does **sports model signals + free spine + calibration floors + honest quiet/dark** — not another Polymarket agent.
