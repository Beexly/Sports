# Reality Engine — Data Capture Gap Matrix

**Date:** 2026-06-18 · **By:** Claude (Opus 4.8)
**Status:** DOCS ONLY — no code/schema/gate changes. Companion to
`workstream-k-activation-audit.md`.

**The leverage-preservation rule (governs every MISSING/PARTIAL row):** a
data-blocked engine is a documented leverage point, never a dead "no." For every row
that is not fully HAVE, this matrix specifies the **exact fields**, the **likely
source**, the **capture cadence**, and **which win-rate metric it unlocks** —
ROI · CLV · no-bet quality · calibration · edge-type reliability. Stopping at "needs
data" forfeits the leverage; naming the capture preserves it.

All schema claims verified against `packages/db/prisma/schema.prisma` this session.

---

## The matrix

| # | Capture | Status | Where it lives today |
|---|---|---|---|
| 1 | Multi-book odds | **HAVE** | `Odds` (`bookmaker`, `fetchedAt`, prices/spread/total) |
| 2 | Opening line | **HAVE** | `OpeningLine` + `Game.openingSpread` |
| 3 | Current line | **HAVE** | `Odds` latest batch |
| 4 | Closing line | **HAVE (derived)** | `clv-capture.ts` deriveClosingSnapshotFromOdds (last batch ≤ kickoff) |
| 5 | Line-movement time-series | **PARTIAL** | `Game.lineMovementSpread/Total` (single delta); `Odds` history queryable; no `LineMovement` event model |
| 6 | Bet-time vs close CLV | **HAVE** | `Pick.clvLockLine/Price` + `clvCloseLine/Price` + `clvValue/Verdict/CapturedAt/GradedAt` |
| 7 | Player usage / tracking | **PARTIAL (in-schema, unwired)** | `PlayerGameStat`, `SnapCount`, `NextGenStat`, `PfrAdvStat`, `TeamGameEfficiency`, `DepthChartEntry` — all carry `rightsSnapshot`; none feed the scorer |
| 8 | Injury events | **PARTIAL (in-schema, unwired)** | `Injury` (report/practice status, body part) with `rightsSnapshot`; not in scoring |
| 9 | News / event timestamps | **MISSING** | No ingestion |
| 10 | Weather | **MISSING** | No ingestion |
| 11 | Referee | **MISSING** | No ingestion |
| 12 | Market-gravity snapshots | **PARTIAL (computed-live, not persisted)** | `marketGravityIndex` computed in web read helper; never written to DB |
| 13 | No-bet ledger | **MISSING** | Silent `return null` at 3 sites; no row, no reason |
| 14 | Signal-ledger events | **MISSING (doctrine-only, blocked)** | `docs/brain/signal-ledger.md`; only `PickSignalSnapshot` + `PerformanceSummary` exist |

---

## HAVE rows — confirmed sufficient for their loop

- **#1 Multi-book odds, #2 opener, #3 current, #6 CLV bet-time+close.** These four are
  the spine of the Market-Replay and Autopsy loops and are genuinely complete. No
  capture action needed; the leverage is in *consuming* them (see inert-code map),
  not in capturing more.
- **#4 Closing line — HAVE with a caveat.** The close is *reconstructed* as the last
  odds batch at/before kickoff, not a vendor closing marker. It is honest (returns
  null when no pre-kickoff odds exist) but its fidelity depends on the final refresh
  landing near kickoff. **Leverage to add (PARTIAL-grade improvement):** a
  kickoff-aligned final refresh pass → sharpens **CLV** accuracy, which is the
  leading indicator the whole Autopsy loop reports.

---

## PARTIAL / MISSING rows — exact capture spec (leverage preserved)

### #5 Line-movement time-series — **PARTIAL → event table**
- **Exact fields:** `LineMovement { gameId, market, side, fromValue, toValue,
  fromPrice, toPrice, bookmaker, observedAt, deltaPerHour }` (one row per material
  move, derived by diffing consecutive `Odds` snapshots).
- **Likely source:** none new — derive from the existing `Odds` history at ingestion
  time.
- **Cadence:** every 30-min refresh, emit a movement event when the consensus line
  moves beyond a half-point / price epsilon.
- **Unlocks:** **edge-type reliability** (does "confirming line movement" actually
  predict covers, separated from a static snapshot) and **CLV attribution** (did we
  lock *before* the move?). Today only a single open→current delta exists, so movement
  *velocity* and *timing* — the heart of any steam/gravity read — cannot be measured.

### #7 Player usage / tracking — **PARTIAL → wire into scorer (gated)**
- **Exact fields (already in schema):** `PlayerGameStat.targets/targetShare/
  receivingEpa/rushingEpa/passingEpa`, `SnapCount.offensePct`, `NextGenStat`,
  `PfrAdvStat`, `TeamGameEfficiency`, `DepthChartEntry` — each with `rightsSnapshot
  Json` and `fetchedAt`.
- **Likely source:** `sourceId` defaults to `nflverse` (open dataset). Any non-open
  source must clear the source-rights registry first.
- **Cadence:** weekly (post-game) for stats/snaps/EPA; depth charts mid-week.
- **Unlocks:** **edge-type reliability** and ultimately **ROI** — these are the
  richest dormant signal in the system. But wiring them is double-gated: (a)
  source-rights clearance per CLAUDE.md scraping posture, and (b) a MODEL_VERSION bump
  to add new scoring factors. The data is present; the activation is an owner/legal +
  audit decision, not a capture problem.

### #8 Injury events — **PARTIAL → wire + timestamp**
- **Exact fields (in schema):** `Injury.reportStatus/practiceStatus/primaryInjury`,
  plus a needed `statusChangedAt` for *event* timing (today only `fetchedAt` exists).
- **Likely source:** `nflverse` injuries (open); official injury reports.
- **Cadence:** daily during the game week; intraday near kickoff for late scratches.
- **Unlocks:** **no-bet quality** (auto-decline on a key-player downgrade after lock)
  and **edge-type reliability** (injury-correlated line moves). Requires the same
  MODEL_VERSION discipline to influence scoring.

### #9 News / event timestamps — **MISSING → new capture**
- **Exact fields:** `NewsEvent { entityId, eventType, headline, sourceUrl,
  publishedAt, rightsSnapshot }` (facts/timestamps/URLs only — never article bodies,
  per CLAUDE.md data-rules).
- **Likely source:** licensed news API or `approved_public_logged_off` feeds; must
  pass the clearance engine.
- **Cadence:** continuous polling, timestamp-accurate (the value is in *when* relative
  to line moves).
- **Unlocks:** the **temporal Market Gravity** doctrine (movement-timing /
  news-correlation) and **edge-type reliability** (was a move information-driven?).
  This is the keystone for distinguishing informed moves from noise.

### #10 Weather — **MISSING → new capture**
- **Exact fields:** `GameWeather { gameId, tempF, windMph, precipProb, conditions,
  forecastAt, rightsSnapshot }`.
- **Likely source:** a weather API (`approved_api`), keyed by venue + kickoff.
- **Cadence:** forecast at lock-time and a final reading near kickoff (both matter for
  totals).
- **Unlocks:** **edge-type reliability** on TOTALS specifically (wind/precip vs
  over/under outcomes) and incremental **ROI** on weather-sensitive markets.

### #11 Referee — **MISSING → new capture**
- **Exact fields:** `GameOfficial { gameId, refereeName, crewId, assignedAt,
  rightsSnapshot }` joined to a per-referee tendency aggregate (penalty rate,
  over/under lean).
- **Likely source:** league assignment feeds / open referee datasets; clearance
  required.
- **Cadence:** weekly on crew assignment.
- **Unlocks:** **edge-type reliability** (referee-conditioned totals/spread tendencies)
  — a thin but real, well-documented signal. Lowest priority of the MISSING rows.

### #12 Market-gravity snapshots — **PARTIAL → persist**
- **Exact fields:** `MarketGravitySnapshot { gameId, market, index, side, band,
  conviction, agreement, liquidity, bookCount, observedAt }` — exactly the
  `MarketGravity` shape `marketGravityIndex` already returns
  (`market-read.ts:131-143`).
- **Likely source:** none new — persist the value already computed each cycle in
  `game-market-read.ts`.
- **Cadence:** every 30-min refresh.
- **Unlocks:** **edge-type reliability** (gravity-vs-outcome) and the bridge to
  temporal gravity (#5/#9). This is the cheapest high-value capture: the number is
  already computed and thrown away. Additive schema, no scoring change.

### #13 No-bet ledger — **MISSING → new capture (highest measurement leverage)**
- **Exact fields:** `NoBetDecision { gameId, market, side, reasonCode
  (BELOW_MIN_CONFIDENCE | BELOW_CONSENSUS_FLOOR | BELOW_ML_THRESHOLD |
  EDGE_PASS | MARKET_INCONSISTENT | STALE_DATA), confidence, consensusPct, fairProb,
  decidedAt, modelVersion }` — one row per (game, market) the scorer considered and
  dropped (the three `return null` sites at `scoring.ts:542, 726, 898`, plus the
  consensus/ML/edge declines).
- **Likely source:** none new — emit at the existing decline points.
- **Cadence:** every scoring pass (synchronous with pick generation).
- **Unlocks:** **no-bet quality** (the only way to ever backtest "should we have
  declined?") AND it removes a silent **calibration** bias — without it, any
  calibration sample is conditioned on "confidence ≥ 50" and blind to the declined
  region. Additive write-only schema, never surfaced publicly. **Recommend first.**

### #14 Signal-ledger events — **MISSING (doctrine-only, blocked)**
- **Exact fields:** the full `LedgerEntry` event taxonomy in
  `docs/brain/signal-ledger.md` (`pick_initiated` … `calibration_updated`),
  append-only, immutable.
- **Likely source:** internal — every step of the pick lifecycle.
- **Cadence:** event-driven, per lifecycle transition.
- **Unlocks:** full auditability and the calibration feedback loop's provenance — but
  it is explicitly **BLOCKED pending schema approval** (depends on Evidence Vault +
  Entity Graph schemas first). This is `requires-schema-approval`, not a capture we
  can add autonomously. The interim substitute is the narrower No-Bet Ledger (#13)
  plus the existing `PickSignalSnapshot`.

---

## Priority order (by leverage ÷ cost, capture-only — excludes anything needing a scoring bump)

1. **No-bet ledger (#13)** — unblocks no-bet quality + de-biases calibration;
   additive, no source, no public surface. Cheapest, highest measurement leverage.
2. **Persist market-gravity snapshots (#12)** — the number is already computed and
   discarded; additive schema.
3. **Line-movement event table (#5)** — derived from existing `Odds`; unlocks
   movement velocity/timing.
4. **Kickoff-aligned final refresh (#4 sharpening)** — sharpens CLV fidelity.
5. **News timestamps (#9)** — keystone for temporal gravity; needs a cleared source.
6. **Weather (#10) / Referee (#11)** — narrow edge-type signals; need cleared sources.
7. **Wire player/injury (#7/#8) into scoring** — richest signal, but double-gated on
   source-rights + MODEL_VERSION; not a pure capture step.
8. **Signal Ledger (#14)** — blocked on schema approval + prerequisite schemas.

Every MISSING/PARTIAL row above is a named, scoped leverage point with a source, a
cadence, and a specific win-rate metric it unlocks — not a dead end.
