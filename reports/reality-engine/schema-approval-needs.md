# Schema & Ingestion Approval Needs — ADR-005 Precursor

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Proposal only. **Nothing is built here.** No Prisma change, no migration, no code. This is an owner-approval shopping list framed as the precursor to a future ADR-005.
**Scope:** Enumerate every schema / ingestion change the reality-engine workstream would *eventually* need, as discrete owner-approval line items. For each: the proposed shape, why it's needed, the win-rate metric it unlocks, the migration risk, and — critically — whether a **file-backed / offline interim** can deliver ~80% of the value with **zero schema change** first.

---

## 0. Why this is a precursor, not the ADR

Schema changes in this repo require owner approval and an audit trail. ADRs live in `docs/adr/001–004` with the established shape (Date / Status / Context / Decision / Consequences / Alternatives). A real ADR-005 would be written *after* the owner picks which of these line items to greenlight. This document exists so that decision is informed, not so it is pre-made. **No table below exists yet. None should be created without sign-off.**

The model-freeze posture also applies: any of these that eventually feed live confidence still has to clear the `CalibrationProposal` gate (held-out `calibratedEce ≤ rawEce`, `MODEL_VERSION` bump, `FROZEN.md` / `seed.ts` audit trail). Storing data is not the same as pricing it in.

## 0.1 The leverage-preservation frame

The order below is deliberate: the highest-leverage gaps that *cannot* be solved with files come first; anything that *can* be approximated offline first is flagged so we don't pay migration risk before we've proven the value. Every "defer" names its unlock.

---

## Line item 1 — No-Bet / Considered Ledger

**Proposed shape** (illustrative, not final): a `ConsideredMarket` table — one row per market we *evaluated*, published or not.

| Field | Type | Note |
|---|---|---|
| `id` | id | |
| `gameId`, `sport`, `market` | refs | what we looked at |
| `modelP` | float | our independent probability |
| `devigMarketP` | float | from `shin-devig.ts` consensus |
| `edgeScore`, `edgeVerdict` | float / enum | from `edge-engine.ts` (SPEAK/LEAN/PASS) |
| `confidence` | float | the heuristic sum from `scoring.ts` |
| `decision` | enum | PUBLISHED / NO_BET |
| `noBetReason` | enum | e.g. below `MIN_PUBLISH_CONFIDENCE` (50), PASS verdict, thin consensus |
| `evaluatedAt`, `modelVersion` | ts / string | |

**Why it's needed.** Today the no-bet decision happens (`scoring.ts`: `if (confidence < MIN_PUBLISH_CONFIDENCE) return null;`, `MIN_PUBLISH_CONFIDENCE = 50` in `constants.ts`) but leaves **no trace**. The considered set vanishes. We can never ask "of the markets we passed, did they go on to be bad bets?" (See sibling `no-bet-quality-measurement-plan.md`, which this complements.)

**Win-rate metric it unlocks.** *No-bet quality* — the realized W/L (and CLV) of the markets we declined vs the ones we published. This is the only way to prove the no-bet gate creates alpha rather than cowardice. It is upstream of any honest publish-threshold tuning (sidecar experiment E6).

**Migration risk.** **Low–moderate.** It is a new, additive, write-only table — no existing column changes, no backfill of historical rows (history is unrecoverable since we never logged it; the ledger starts accruing from day one). Write-path cost: one extra insert per evaluated market per cycle, which can balloon row count fast — needs a retention/rollup policy decided up front.

**File-backed interim (delivers ~80%?): YES.** The sidecar (see `python-sidecar-research-plan.md`) can have the TS export step emit a per-cycle `considered.json` from the in-memory evaluation set *at generation time*, before the `return null`. That captures the considered set offline with no schema. It loses queryability and durable history, but proves the *value* of the ledger before we pay the migration. **Recommended first step.** The DB table is the durability upgrade once the file-backed version shows the no-bet segment is informative.

---

## Line item 2 — Market-Replay / Line-Movement Event table

**Proposed shape** (illustrative): a `LineMovementEvent` table — append-only, one row per observed line/price change per market.

| Field | Type | Note |
|---|---|---|
| `id` | id | |
| `gameId`, `sport`, `market`, `book` | refs | |
| `line`, `price` | float | observed values |
| `observedAt` | ts | event time |
| `source`, `rightsSnapshotId` | ref | provenance per the scraping clearance posture |

**Why it's needed.** We capture `Odds` batches and *derive* a closing snapshot (`deriveClosingSnapshotFromOdds` in `clv-capture.ts`), but we do not store movement as a queryable event series. CLV is therefore hindsight-only. To *forecast* the close (sidecar E4) and to replay "what did the market do between our lock and the close," we need the movement series as first-class events.

**Win-rate metric it unlocks.** *Predicted-close accuracy* and *CLV-as-forecast* — turning `Pick.clvValue` from a post-mortem into a pre-bet signal. Also feeds line-movement features that, if they survive calibration, could earn weight in a future `MODEL_VERSION`.

**Migration risk.** **Moderate–high.** Append-only event tables grow without bound; this is the highest-volume table proposed. Needs a retention window, partitioning/rollup strategy, and a clear write cadence tied to existing odds-refresh jobs. Ingestion volume is the real risk, not the schema shape.

**File-backed interim (delivers ~80%?): PARTIAL.** The existing `Odds` batches already contain timestamped snapshots; the sidecar can reconstruct an *approximate* movement series from them into `odds-batches.json` and backtest E4 offline. That is enough to prove whether line-movement forecasting has signal **before** committing to a high-volume event table. It is *not* enough for production real-time replay. **Recommended: prove signal offline first; only build the event table if E4 shows forecastable structure.**

---

## Line item 3 — EdgeTypeOutcome reliability table

**Proposed shape** (illustrative): an `EdgeTypeOutcome` table that accrues realized reliability per *type* of edge.

| Field | Type | Note |
|---|---|---|
| `id` | id | |
| `edgeType` | enum | the taxonomy tag (see sibling `edge-type-taxonomy-v1.md`) |
| `pickId` | ref | the pick this outcome belongs to |
| `clvVerdict`, `result` | enum | BEAT/MATCHED/LOST + W/L/P/V |
| `settledAt`, `modelVersion` | ts / string | |

**Why it's needed.** `edge-significance.ts` can prove the *aggregate* edge isn't luck, but cannot attribute skill to a *kind* of edge, because picks carry no edge-type tag. Without per-type outcomes we cannot learn which signals to trust and which to retire.

**Win-rate metric it unlocks.** *Edge-type win rate / CLV-beat rate by type*, and *edge-type survival* (sidecar E7 — which edge types decay). This is what eventually lets confidence weight *trustworthy* edge types more than fragile ones — through the calibration gate, never automatically.

**Migration risk.** **Moderate.** Additive table, but it depends on an upstream decision the workstream hasn't finalized: the edge-type taxonomy itself (owned by `edge-type-taxonomy-v1.md`). Building the outcome table before the taxonomy is frozen would force a churny re-tag. **Sequencing risk > schema risk.**

**File-backed interim (delivers ~80%?): YES, deferred on taxonomy.** Once an edge-type tag exists (even as a derived label computed offline from existing `edge-engine.ts` output), the sidecar can join it against settled `clv.json` to produce `edge-type-survival.json` with **zero schema**. That delivers the reliability *insight* without the table. The table becomes worth it only when we want the tag to persist per-pick for live use. **Recommended: derive offline first, persist after the taxonomy is frozen.**

---

## Line item 4 — News / Weather / Referee ingestion (optional, later)

**Proposed shape** (illustrative): new ingestion sources + a `ContextSignal` table (typed signal rows: injury/news, weather, referee assignment) linked to games, each carrying a `RightsSnapshot`.

**Why it's needed.** These are the inputs to the causal experiments (sidecar E1: injury→pace→prop). Without them, causal estimation has no treatment variable to estimate.

**Win-rate metric it unlocks.** *Causal-feature lift* — whether a context signal genuinely moves outcomes (estimated effect with refutation), as opposed to a spurious correlation. Only survivors reach calibration.

**Migration risk.** **High — and it's the legal/clearance risk, not the schema.** Every new source MUST pass the Scraping Clearance Engine (`apps/web/lib/scraping/clearance-engine.ts`), be classified in `source-rights-registry.ts`, and every extracted record MUST carry a `RightsSnapshot`. News/weather/referee data ranges from clean licensed APIs to rights-encumbered scraping. This line item cannot be approved on schema grounds alone — it needs the clearance posture applied source by source. **Do not start here.**

**File-backed interim (delivers ~80%?): NO — but the experiment can be primed.** The causal *method* (E1) can be validated against any cleanly-licensed context source first; the schema and ingestion only matter once a specific source clears. **Recommended: last in the queue, source-by-source, behind clearance.**

---

## Approval summary (the ADR-005 menu)

| # | Item | Metric unlocked | Migration risk | File-backed 80% first? | Recommended order |
|---|---|---|---|---|---|
| 1 | No-Bet / Considered Ledger | No-bet quality; honest threshold tuning | Low–moderate | **Yes** (`considered.json`) | **1st** — interim now, table after value shown |
| 2 | Market-Replay / Line-Movement events | Predicted-close accuracy; CLV-as-forecast | Moderate–high (volume) | Partial (reconstruct from `Odds`) | 2nd — prove E4 signal offline first |
| 3 | EdgeTypeOutcome reliability | Win rate / survival by edge type | Moderate (taxonomy-gated) | Yes, after taxonomy frozen | 3rd — derive offline, persist later |
| 4 | News / Weather / Referee ingestion | Causal-feature lift | High (clearance, not schema) | No (prime the method only) | Last — source-by-source, behind clearance |

**Nothing in this table is built or approved.** Each row is a discrete decision for the owner. The recommendation in every case is the same shape: prove the value file-backed and offline first where possible, pay migration risk only after the value is demonstrated, and let nothing reach live confidence except through the existing `CalibrationProposal` gate. No deferral above is a "no" — each carries its unlock so it can be revived the moment its prerequisite (sample size, frozen taxonomy, cleared source) is met.
