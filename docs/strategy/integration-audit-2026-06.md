# Integration Audit — Repo Leverage: Ported vs. Wired vs. Live (2026-06-18)

> **Why this doc exists.** The research ledgers (`repo-firehose-review.md`,
> `research/oss-betting-repo-scan-2026-06.md`) catalogue ~73 repos and mark many as
> "SHIPPED." That is true at the **module** level — the code exists and is unit-tested.
> It is **not** the same as "wired into the live pick path." This audit reconciles the two
> by tracing the actual production code path, so we have one honest source of truth before
> writing more code.
>
> **Method:** every status below is grounded in a real call-graph trace (file:line), not a
> doc claim. Verified 2026-06-18 against branch `claude/pensive-brown-yql6ld`.

## Status taxonomy

| Status | Meaning |
|---|---|
| **🟢 LIVE** | Actually executes on a production pick / public surface today. |
| **🟡 GATED** | Wired into the code path but deliberately inert (founder-gated `MODEL_VERSION` step, or awaits the ≥100-settled-pick activation). Turning it on is a decision, not a build. |
| **🟠 PORTED-UNWIRED** | Module exists + tested, but **nothing in the live path calls it**. Turning it on is a build (the wiring), not just a flag. |
| **🔵 UNBUILT** | Catalogued concept, no module yet. |
| **⚪ DECLINED** | Deliberately not built (casinos, fraud, bet-execution, piracy, off-domain). Correct as-is. |

---

## 1. The live value chain — what actually fires on a production pick TODAY

Traced: `workers/data-refresh` → `packages/ingestion-pipeline/src/process-sport.ts`
→ `scoreGames()` (`packages/prediction-engine/src/scoring.ts`) → `db.pick`.

**What executes 🟢:**
1. Odds ingestion (The Odds API) → averaged implied probabilities.
2. **Local proportional de-vig** — `removeVig()` defined *inside* `scoring.ts:39` (`home/(home+away)`).
3. Weighted-factor composite (consensus + depth + edge component + volatility + line-movement) → **raw 0–100 confidence**.
4. Risk level, tier gating, factor trail, signal snapshot, bootstrap flagging.
5. At settlement (cron `/api/cron/settle-picks` → `ingestion-pipeline/settle-sport.ts`):
   grading + **CLV capture** (`clv-capture.ts`) + Merkle-eligible ledger rows.

**What does NOT fire on a live pick today** (despite existing as tested modules):

| Capability | Module exists | Live status | Evidence |
|---|---|---|---|
| Shin + goto **de-vig ensemble** | `shin-devig.ts` | 🟠 **scorer uses local `removeVig` instead** | `scoring.ts` imports nothing from `shin-devig`; uses local proportional `removeVig` at lines 391/413/599/727 |
| **Calibration** applied to confidence | `calibration-apply.ts`, `probability-calibration.ts` | 🟡 **not applied in live scoring** | no `applyCalibration` call in `scoring.ts` or `process-sport.ts`; activates at ≥100 settled (founder-gated) |
| **Independent referees** (Kalshi/Elo/ML) | `edge-engine.ts`, `elo-estimator.ts`, `ml-estimator.ts` | 🟡 **socket wired, never fed, never priced** | `scoring.ts:148` `assessIndependentEdge` returns `null` when `fairValues` empty; `process-sport.ts` never populates `context.independentFairValues`; `scoring.ts:133` comment: *"SURFACED, NOT YET PRICED … priced:false"* |

**Bottom line for §1:** today's confidence number is **raw, proportionally-de-vigged, weighted-factor** —
honest and conservative, but **not yet** the calibrated, ensemble-refereed number the docs describe. That
gap is *by design* (model freeze), but "ported" ≠ "live," and prior status notes blurred this. The headline
"calibrated 0–100 confidence" and "independent-referee cross-check" are **gated, not running.**

---

## 2. Build queue (`repo-firehose-review.md` §"Build queue", 6 items)

| # | Item | Module status | Live status | Notes |
|---|---|---|---|---|
| 1 | Shin + goto de-vig ensemble · Merkle proof-of-record | ✅ ported | 🟠 ensemble / 🟢 Merkle | Merkle is **live** (`/proof` + CSV export). De-vig ensemble is **ported-unwired** (scorer uses local proportional). |
| 2 | ELO + Poisson-soccer independent estimators | ✅ ported | 🟠 ELO / 🟡 Poisson | `poisson.ts` has 7 live importers; `elo-estimator.ts` imported only by `elo-backtest.ts` (not the live scorer). Neither feeds `independentFairValues`. |
| 3 | Monte-Carlo "is the edge real?" significance test | ✅ ported | 🟢 **live** | `edge-significance.ts` → surfaced on `/performance` via `SignificancePanel` (this sprint). |
| 4 | ML estimator scaffold → `independentFairValues` | ✅ ported | 🟠 **imported by zero live files** | `ml-estimator.ts` is a pure scaffold; never called. |
| 5 | More read-only odds referees + open-data backfill | ◑ partial | 🟡 partial | `openfootball-source.ts`, `kalshi-client.ts` exist; **Polymarket referee, ncaa-api adapter: unbuilt**. Kalshi fair values not threaded into scoring. |
| 6 | Public consensus/divergence + proof SURFACE (+ design craft) | ◑ partial | 🟢 proof / 🔵 design | Proof + reliability diagram + significance + ladder are **live** (this sprint). Slotjs/cherry-charm reveal-motion + live consensus heat-map: **unbuilt**. |

**Queue verdict:** #1 (Merkle), #3, #6 (proof half) are **live**. #1 (de-vig), #2, #4 are **ported-dormant**.
#5 and #6 (design half) are **partial/unbuilt**.

---

## 3. Path-to-70 accelerant builds (`oss-scan` Part 3 §18, 10 ranked items)

| Rank | Build | Status | Evidence / gap |
|---|---|---|---|
| 1 | ★ Multi-market true-prob ensemble + cross-market divergence | 🟡 **socket only** | `edge-engine.assessEdge` exists & is called; `independentFairValues` never populated in live path → fires on zero picks. The flagship lever is **not actually finding picks yet.** |
| 2 | Honest calibration ladder (Platt/Wilson/shrink/market-gap) | 🟡 GATED | `calibration-ladder.ts` + `buildCalibrationLadder` exist & surfaced (`LadderPanel`); Wilson bounds added to `compute.ts` this sprint. **Not applied to live confidence** (activates ≥100 settled). |
| 3 | Offline backtest + calibrator-export notebook lane | 🔵 **UNBUILT** | No `scripts/analytics/` Python lane. `elo-backtest.ts` is the only backtest artifact. |
| 4 | Public calibration/proof surface | 🟢 **LIVE** (mostly) | Reliability diagram + Wilson per-bucket + CLV + significance + Merkle + CSV export shipped. **Missing:** `exceljs` export, Umami conversion analytics, `react-vega` (we hand-rolled SVG instead — acceptable). |
| 5 | Line-movement forecasting + steam/anomaly engine | 🔵 UNBUILT | No statsforecast worker; `market-gravity` is doctrine-only. |
| 6 | Canonical UOF-shaped odds schema + normalizer | 🔵 UNBUILT | `packages/types` has no UOF `Event→Market→Outcome` graph; `normalizer.ts` is Odds-API-shaped only. |
| 7 | Dixon-Coles τ for soccer | 🟡 GATED | Doc claims `dixonColesTau` etc. shipped in `poisson.ts`. **Remaining:** fit ρ per-league + λ ingestion adapter (unbuilt) → so DC is not active on live soccer picks. |
| 8 | Contextual-bandit surfacing (CLV reward) | 🔵 UNBUILT | No `bandit` allocation layer. |
| 9 | War-room multi-agent content (Bull/Bear/Sharp/Skeptic) | 🔵 UNBUILT | `synthetic-fade.ts` exists (labeled); the debate council does not. |
| 10 | Threshold tuner (Optuna) + CLIP brand-safety + news-velocity | 🔵 UNBUILT | none present. |

**Plus the named doctrine gap (§19):** **CI leakage-prevention test** — a test that fails any calibrator
validated in-sample. 🔵 **UNBUILT** and high-trust-value (cheap).

---

## 4. The 73-repo ledger, re-bucketed by *live* status

The Part-4 extraction (`oss-scan` §20, sets A–F) is accurate as a **module/concept** map. Re-bucketed by
what's actually **running**:

- **🟢 LIVE (genuinely running):** Merkle proof-of-record (#15/olalonde) · local de-vig + EV/Kelly math
  (WagerBrain-derived, `kelly.ts`/`bankroll.ts`) · CLV capture at settlement (EDGE_BOT/mlb-slate) ·
  closed-loop grading (`settlement.ts`, cron) · Poisson `poisson.ts` (7 importers) · MC significance
  (paper-betting-tracker → `edge-significance.ts`) · RG gate (`responsible-gaming.ts`) · Reddit narrative
  signal · calibration **measurement** (`probability-calibration.ts`, Brier/ECE/reliability) · public proof
  surface (this sprint).
- **🟡 GATED (wired, intentionally inert):** calibration **application** + ladder (Alex-2911/nadzhh/sklearn) ·
  independent-edge engine + Kalshi referee (`edge-engine.ts` + `kalshi-client.ts`) · Dixon-Coles τ.
- **🟠 PORTED-UNWIRED (module exists, no caller):** Shin/goto **ensemble** (`shin-devig.ts`) · ELO estimator
  (backtest-only) · ML estimator (zero callers).
- **🔵 UNBUILT (catalogued, no module):** offline backtest/notebook lane · UOF odds schema · Polymarket
  referee · line-movement/steam engine (statsforecast) · contextual bandits · war-room council · threshold
  tuner · CI leakage test · ncaa-api adapter · `exceljs` exports · Umami · `react-vega` · `DESIGN.md` ·
  Superset · headless higgsfield-js worker · programmatic-SEO templates · anti-fraud/promo-abuse layer.
- **⚪ DECLINED (correct):** all real-money/crypto casinos, "gambling predictor" scams, bet-execution apps,
  affiliate-spam, IPTV piracy, the unlicensed ESPN-scraping competitor, off-domain (sports medicine/
  collectibles). ~half the scanned set. **No action — and none should be taken.**

---

## 5. Honest bottom line

1. **What's genuinely done & live:** the **proof/accountability surface** (Merkle ledger, CSV export,
   reliability diagram, CLV report, edge-significance, calibration measurement) and the **grading/CLV loop**.
   These are real and first-of-kind. This is the moat's *foundation*.
2. **The biggest real gap is not "porting more" — it's WIRING what's already ported.** The four highest-
   leverage levers (Shin ensemble de-vig → calibration application → independent-referee ensemble → priced
   edge) are **built but not on the live pick.** They are gated by design and by the ≥100-settled-pick clock.
3. **Genuinely unbuilt, high-leverage, no blocker:** the **CI leakage-prevention test** (cheap, high-trust),
   the **offline backtest/calibrator-export lane** (unblocks pre-proving calibration before the live sample
   matures), and the **UOF odds schema** (unblocks line-movement + freshness).
4. **Correctly declined:** roughly half the catalogue. That restraint is a feature, not a miss.

**One-line truth:** *We have ported most of the discipline and shipped the proof surface; we have not yet
wired the calibration + ensemble value-chain into the live confidence number — that wiring (plus the offline
proof lane and a leakage guard) is the real remaining work, and most of it is founder-gated by the settled-
data clock, not by missing code.*

---

## 6. Recommended next actions (leverage order, all founder-gated to ACTIVATE)

1. **CI leakage-prevention test** — fail any calibrator validated in-sample/random-split. Cheap, high-trust,
   no model change. (`oss-scan` §19.)
2. **Wire `independentFairValues` in `process-sport.ts`** from the existing Kalshi client → the referee
   engine finally fires (still `priced:false` until founder flips it). Turns build-queue #1–#4 from dormant
   to *surfaced-and-grading*.
3. **Offline backtest + calibrator-export lane** (`scripts/analytics/`) — pre-prove calibration on historical
   settled data; exports the versioned map the ladder consumes.
4. **Close the proof-surface test gap** (this sprint's CSV export + panels have no web-layer tests — Rule 6).
5. **Canonical UOF odds schema** in `packages/types` + normalizer — unblocks line-movement & freshness.

> Nothing here flips a `MODEL_VERSION` gate or changes a live confidence score without an explicit, audited
> founder decision. This doc is the map; activation stays a deliberate call.
