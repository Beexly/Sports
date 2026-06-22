# GSE 2026 — Highest-Value Improvements & Biggest Blind Spots

The owner's direct question: *"What's our easiest and highest-value area for improvement? Biggest
blind spots?"* This doc answers it — and it is **computed, not vibed**, from the scored contracts
shipped this sprint:

- `prioritizeGaps()` — `apps/web/lib/gse/competitor-intelligence.ts` (ranked build opportunities)
- `adoptableNow()` / `rankAdoption()` — `apps/web/lib/gse/open-source-ledger.ts` (free leverage we can take now)
- `methodsByMaturity("gap")` — `apps/web/lib/gse/analytics-methods.ts` (modeling gaps)
- `CAPABILITY_AUTONOMY` + `maxAutonomyAllowed()` — `apps/web/lib/gse/self-learning.ts` (autonomy gaps)

Each surface is browsable in the cockpit and re-ranks itself as inputs change.

---

## 1. The biggest blind spots (honest)

1. **We have the moat but don't lead with it.** Calibration receipts / a public, auditable per-pick
   track record is the one thing the *entire* competitive field lacks (only DRatings does it, with
   weak UX). GSE builds toward it (Trust Ledger + calibration) but it is not the headline. **Blind
   spot: under-marketing the only durable differentiator.**
2. **The loop is half-closed.** We have devig + CLV + calibration as pieces, but not the single
   product loop: log a pick → grade CLV vs close AND market-best → feed calibration → show the user.
   Outlier has EV/devig but *no tracking/CLV*; Betstamp has CLV but *no outcome calibration*. Nobody
   owns the whole loop. **Blind spot: integration, not invention.**
3. **Single-feed dependency.** The Odds API + unofficial ESPN endpoints carry real continuity risk
   (FBref lost its Opta feed overnight in Jan 2026). **Blind spot: no licensed fallback odds source.**
4. **Modeling gaps that competitors quietly exploit.** No model⊕market confidence-weighted blend
   (Black-Litterman style), no conformal intervals, no isotonic calibration in the live path, no
   drift detection, no injury miss-time probability. **Blind spot: edge is a raw difference, not a
   precision-weighted posterior.**
5. **Autonomy is mostly L1–L2.** Projections, model promotion, and data refresh could safely run at
   higher autonomy with the right guardrails, freeing the owner's time. **Blind spot: the system
   isn't yet self-working where it safely could be.**
6. **Free-tier description drift** (pre-existing) between `value-architecture.ts` and CLAUDE.md —
   still unreconciled.

---

## 2. Easiest, highest-value improvements — the ranked build board

### 2a. Feature gaps vs competitors (`prioritizeGaps()`, build-opportunity score)

Scores are *relative build opportunity* (value × copyability × status-gap). Things we already have
score low here **on purpose** — the opportunity is to market them, not build them.

| Rank | Feature | Status | Why | Build sketch |
|---|---|---|---|---|
| 1 | Cross-platform league/draft sync overlay | GAP | Advice on the user's real Yahoo/ESPN/Sleeper league (FantasyPros' moat) | Sync rosters/drafts; deliver Roster Coach / Draft OS on top |
| 2 | Stathead-style query builder | GAP | The query-UX gold standard; pairs with the evidence engine | Composable filter stacks over our entity graph |
| 3 | Survivor / pool optimizer | GAP | Sticky seasonal product, low direct competition (TeamRankings) | EV-optimal path with future-week equity |
| 4 | No-code model builder + backtest | GAP | Rithmm/FantasyLabs hook; show calibration of the user's model | Reweight named factors; backtest; calibrate |
| 5 | devig → bet-log → CLV → calibration loop | PARTIAL | The integration nobody owns end-to-end | Close the loop on existing pieces |
| 6 | Legible confidence UX (one number) | PARTIAL | nERD/stars/letters are legible; ours isn't yet | Band + "what would change it", tied to the ledger |
| 7 | Injury miss-time probability (with CI) | GAP | Draft Sharks' best mechanic; feeds projection variance | P(miss) from type/history/workload → falsifiers |
| 8 | Contextual hit-rate charts + last-N | PARTIAL | Props.cash's viral UX | With small-sample confidence bands |
| 9 | Prediction-market price as a probability input | GAP | Kalshi/Polymarket trend | Blend implied prob into the market read (rights-checked) |
| 10 | Prop-level devig vs consensus | PARTIAL | Sharp/Outlier's edge | Extend Shin de-vig to props |

**The strategic #1 (not captured by build-opportunity score because we already have it):** make
**calibration receipts the headline of the product and the marketing.** It is the white space.

### 2b. Free leverage to take *now* (`adoptableNow()`, commercial-OK, not yet integrated)

| Resource | Adoption | Use |
|---|---|---|
| **nflverse** (deepen) | ~88 | Free EPA/WP-grade NFL data (attribution) — diversify off single feeds |
| **scikit-learn** | ~70 | Platt/isotonic calibration + GBMs in a training worker |
| **hoopR / sportsdataverse** | ~66 | Free NBA/CBB loaders |
| **ONNX Runtime (Node)** | ~65 | Train in Python, infer in TS — keeps the app light |
| **Lahman** (deepen) | ~64 | MLB history (share-alike caveat) |
| **XGBoost/LightGBM** | ~64 | Tabular projection learners (export to ONNX) |
| **CFBD** | ~63 | Rich free college-football API |
| **MAPIE / River** | ~60 / ~59 | Conformal intervals + online learning/drift |
| **Retrosheet** | ~59 | MLB play-by-play (verbatim attribution) |

**Landmines (hard-gated to the bottom — do NOT ship):** StatsBomb Open Data (research-only),
Understat (no commercial license), ESPN hidden endpoints (unofficial — keep a licensed fallback).

### 2c. Modeling gaps to implement (`methodsByMaturity("gap")`, near `packages/prediction-engine`)

Top leverage: **Black-Litterman-style model⊕market blend** (turns edge into a precision-weighted
posterior), **Kalman/state-space in-season form**, **conformal intervals** (honest projection ranges),
**isotonic/Platt calibration in the live path**, **log opinion pool + extremizing** for ensembling,
**Glicko-2** (uncertainty-aware ratings), **Dixon-Coles** (soccer scorelines). The four
dependency-free primitives are already shipped in `analytics-methods.ts` (`logOpinionPool`,
`extremize`, `splitConformalHalfWidth`, `fitReliabilityCalibration`).

### 2d. Autonomy upgrades (`CAPABILITY_AUTONOMY`)

| Capability | Now → Target | Unlock |
|---|---|---|
| Projection generation | L2 → L4 | Shadow eval + calibration gate before champion swap |
| Odds/data refresh | L3 → L4 | Data-quality gate + rollback to last-good snapshot |
| Model promotion | L2 → L3 | `scoreModelPromotionReadiness` gate (sample + no regression + shadow) |
| Drift monitoring | add | `scoreDriftRisk` on a schedule → alarm → ticket |

External actions (publish, price, bet) stay capped at L3/L0 — owner-gated, by policy.

---

## 3. The single highest-leverage move (next 90 days)

**Close the trust loop and make it the product's face:** log a pick → grade CLV vs close and
market-best → feed calibration → render an auditable receipt the user (and search engines) can see.
It (a) closes the loop nobody else owns, (b) makes the existing moat legible, (c) doubles as the
honest growth loop the monetization research recommends, and (d) requires integration of pieces we
already have, not new invention. Pair it with a **scheduled drift job** (`scoreDriftRisk`) — the
cheapest guard that protects every calibrated claim downstream.

## 4. Sequencing

- **Now:** deepen nflverse; add a licensed fallback odds source; ship the drift job; wire
  `scoreDataQuality` + `scoreSourceRightsRisk` into ingestion; lead with calibration receipts.
- **Next:** close the devig→CLV→calibration loop; conformal intervals + isotonic calibration in the
  live path; cross-platform sync overlay; reconcile the Free-tier drift.
- **Later:** no-code model builder + backtest; survivor/pool optimizer; Black-Litterman blend;
  prediction-market read; B2B "True Line"/calibration licensing once the proof is established.
