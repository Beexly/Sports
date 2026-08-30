# Prediction-market ecosystem triage — 2026-08-09

**Source:** [Oddpool](https://www.oddpool.com/) catalog paste + Awesome-Prediction-Market-Tools harvest.  
**GSE law:** `docs/agent-skills/polymarket-hold` — **no public Polymarket product**, no arb bots, no copy-trade, no whale-alert customer features, no “guaranteed edge” claims.  
**Purpose:** Turn a raw directory into **GSE leverage buckets** (architecture, content, free data, B2B packaging) vs **hard hold**.

---

## Executive filter (how to read this list)

| Bucket | GSE action |
| --- | --- |
| **A — Steal the pattern (code/UX)** | Port ideas into sports intel, free spine, content, B2B honesty — never PM trading product |
| **B — Internal research only** | Offline fair-value / Kalshi matching / RES studies; env-gated; no marketing |
| **C — Competitive scan** | Founder watches positioning; no build |
| **D — Hard hold** | Execution bots, arb, copy-trade, whale tips, “98% accuracy”, leveraged PM, DeFi credit on PM positions |

If a tool’s primary value is **placing bets on Polymarket/Kalshi**, it is **D** unless counsel clears a different product.

---

## A — Steal the pattern (highest GSE ROI)

### Multi-agent evidence reports (content + trust)
| Tool | Pattern to steal | GSE target |
| --- | --- | --- |
| **Polyseer** | Multi-agent research → Bayesian aggregate → cited report + confidence | Content drafts / methodology “evidence pack”; never auto-publish ROI |
| **PolyRadar** | Multi-model consensus + timeline + source transparency | Observatory / matchup brief structure |
| **PolyOracle** | Ensemble LLM consensus, not one brain | Brief / model-court ensemble UX (already partial) |
| **Octagon AI** | Deep research reports with **fully cited sources** | Content engine requiredSources discipline |
| **Alphascope** | Real-time signals + probability **shifts** framing | Signal board honesty: model-signal vs book |

### Cross-venue data infra (internal fair-value, not product PM)
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **PolyRouter** | Single key, normalized multi-venue schema | Design for Kalshi series + sportsbook fair join (internal) |
| **Dome** | Unified REST/SDK across venues | Client boundary patterns for `data-ingestion` |
| **PMXT** | Open multi-exchange API | Matching + series maps |
| **pykalshi** | WS, retries, rate limits, local book | Kalshi client resilience (already partial) |
| **Probalytics** | Tick-level books, ClickHouse, Parquet export | Offline RES / calibration research exports |
| **Marketlens** | Historical book + backtest REST | Holdout bake-off data design |
| **TREMOR** | SQL terminal + AI assistant over markets | Cockpit ops query UX research |
| **Adjacent News** | PM-driven news APIs | Free news wire pairing (RSS already) |

### Aggregator / terminal UX (sports product packaging)
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **Verso** | Bloomberg-style institutional terminal | Cockpit density without claim inflation |
| **Synthesis** | Live books + **cross-market price compare** | Independent fair vs book display (signal board labels) |
| **Metaforecast** | Cross-platform forecast aggregation UX | Observatory multi-source read |
| **Oddpool** | Directory + competitive landscape | This triage doc + bookmarks |
| **Matchr** | Best-price search across venues | **Do not** build PM routing product; note smart-routing as competitor category only |

### Alerts (ops, not tipster product)
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **Nevua / PolyAlertHub / alerts chat** | Multi-channel (Telegram/Discord/webhook) watchlists | Health-alert + settlement overdue ops — not pick tips |
| **Aeon** | Scheduled GitHub Actions monitor Kalshi/Polymarket shifts | Cron pattern for free-spine / odds SLA / RES drift alerts |
| **YN Signals** | New market + anomaly aggregator | Internal series discovery for Kalshi sports only |

### Analytics (track record honesty)
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **PredictFolio / PredScan / PolyWallet** | Wallet P&L, win rate, ROI dashboards | **Only** when GSE PROVEN gates GREEN — same metrics already gated |
| **Hashdive “Smart Scores”** | Composite skill scores | RankingP / confidence separation diagnostics (internal) |
| **alexmccullough Dune** | Accuracy, bias, price-bucket calibration | Murphy REL/RES bin studies |
| **Wethr** | Domain-specialized analytics (weather) | Sport-specific free adapters (weather already partial) |

### Educational / news framing
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **DeepNewz / Boring News** | News framed with market odds as data, not gospel | GSN / airwave honesty: odds as context |
| **PolyNoob / PolymarketGuide** | Resolution + case studies encyclopedia | Methodology + quiet-board education templates |
| **PROPHET newsletter** | Expert-backed narrative | Newsletter schema already; keep RG + no PROVEN while RED |

### Sports-adjacent AI (closest product cousins)
| Tool | Pattern | GSE target |
| --- | --- | --- |
| **Sportstensor** | Ensemble / collective intelligence sports prediction | Multi-independent fair values (already: Kalshi/FPI/DC/Elo) — **not** decentralized token product |
| **BillyBets** | 24/7 autonomous sports agent | **D for execution**; pattern = continuous free-spine + settle autonomy (safe crons only) |

---

## B — Internal research only (env-gated / offline)

| Tool | Why B not A |
| --- | --- |
| **oracle3** | Wang Transform + constraint arb + Kelly — research paper math only; **no live execution** |
| **Simmer** | Agent harness for PM paper/live — study skill-loop design; do not ship PM harness product |
| **MiroShark** | Swarm sim of PM + social — offline narrative RES experiments only (~$1/run) |
| **Polyseer open-source** | Clone for evidence-report shape; no customer PM surface |
| **Gamma / Polymarket data** | `INDEPENDENT_POLYMARKET` default OFF |
| **PolyRouter / Dome / PMXT live keys** | Research envs only until counsel |
| **TurbineFi backtest** | Strategy factory UX study — no bot product |
| **Polyseer / Predly “mispricing alerts”** | Calibration research on external markets; never “89% alert accuracy” marketing |

---

## C — Competitive scan (watch, don’t build)

AI trading agents & terminals: Polytrader, Polybro, PolyMaster, Inside Edge, Polyprophet, PolyPulse, Semantic 42, Fere AI, Astron, UnifAI, TatorTrader, Bankr, Pigeon, Elastics, Forcazt, PolyTale, Fraction AI, PolyClaw, Baozi MCP, Rainmaker, Converge, Sharpe Terminal, Based, AIXBET, etc.

Aggregators: trade.fun, TradeFox, OkayBet, Firefly, Rocket.

Portfolio/whale copy: Polymarket Bros, Polycool, PolyCopy, Stand, Polytrackerbot, PolyIntel, PolyInsider, PolyTrack, FirePolymarket, Predicting Top, EventWaves, PolyVision, MobyScreener, PolyScope, Polysights, Polymarket Analytics, Markium, future fun, Polyguana, pm.wiki.

**Positioning note for GSE:** almost all claim **edge / whale / arb / auto-trade**. GSE differentiates on **sports model signals + calibration floors + free spine + honest dark/quiet** — not PM execution.

---

## D — Hard hold (do not productize)

| Category | Examples | Why |
| --- | --- | --- |
| **Execution / autonomous bet agents** | BillyBets, PolyClaw, Semantic 42, AIXBET, Simmer live, TurbineFi bots | Places bets; counsel + product law |
| **Arbitrage scanners** | ArbBets, Eventarb, Polytrage, PolyScalping, Prediction Hunt | Customer arb = non-goal |
| **Copy-trade / whale tips** | Stand, Polycool, PolyCopy, PolyTrack ($/wk), PolyInsider | Tipster product risk |
| **Accuracy theater** | Astron “98%”, Predly “89% alert accuracy” | Integrity: floors + GREEN only |
| **DeFi leverage on PM** | HyperOdd, Gondor, Dimes, Robin yield, Clutch parlays | Out of scope |
| **Fake market generators** | PolyFakeIt, Fake-A-Polymarket | Brand risk if confused with real board |
| **Insider-trading framing** | PolyIntel, PolyTrack “insider” | Legal/brand poison |

---

## GSE already covers (don’t re-build from this list)

| Capability | GSE home |
| --- | --- |
| Kalshi fair values (soft-fail) | `packages/data-ingestion` + independent pipeline |
| Multi-independent ranking | v5.2.2 rankingP, FPI, DC, ClubElo, Elo |
| Free score path / settle | free-spine, settle-picks |
| Calibration floors / Murphy RES | proven-path, ops truth |
| Prompt cache / multi-cloud | Jynx free-lane |
| B2B signals experimental | `/api/v1/signals` |
| Edge embed | `/embed/edge-index` |
| Public tools math | `/tools` (CLV, parlay, line movement) |
| News RSS | curated opt-in |

---

## Concrete next builds (from this catalog, integrity-safe)

Priority order — **all leverage, zero PM product:**

1. **Evidence report shape (Polyseer/Octagon)** — ContentDraft template: cited sources + confidence band + “not PROVEN” footer.  
2. **Aeon-style shift alerts (ops)** — Cron/webhook when odds insert SLA breaks, free-spine SLA, or Murphy RES moves — ops only.  
3. **pykalshi-grade resilience** — Retries/backoff already partial; add miss observability counters for Kalshi series.  
4. **Metaforecast/Verso UX cues** — Observatory multi-source card (model signal vs book when present).  
5. **Probalytics export path** — `export:settled-picks` → offline parquet/JSON for RES studies (no live maps).  
6. **Sportstensor lesson only** — Keep stacking independent estimators; do not token/ensemble-market product.  
7. **Adjacent News pairing** — RSS + free score headlines → beat wire (already RSS path).  

**Explicitly skip:** everything in **D**, all whale/copy/arb Telegram bots, all “AI places your Polymarket bets” agents.

---

## Short founder talking points

- The ecosystem is **saturated with auto-trade + whale copy**. GSE’s wedge is **sports model honesty + free infrastructure + calibration floors**, not another Polymarket agent.  
- **Steal report structure and data-infra patterns**; **never** steal execution.  
- Kalshi remains the **only** exchange-shaped independent we soft-fail into ranking; Polymarket stays env-gated internal.  
- Any tool advertising fixed high accuracy without floors is a **brand anti-pattern**.

---

## Related files

- `docs/research/prediction-market-tool-bookmarks.md` — short prefer list  
- `docs/ops/INDEPENDENT_EXCHANGE_HARVEST.md` — Kalshi/ClubElo/FPI  
- `docs/agent-skills/polymarket-hold/SKILL.md` — hard law  
- `docs/ops/SESSION_LEVERAGE_ATLAS_2026-08-09.md` — full-session map  
