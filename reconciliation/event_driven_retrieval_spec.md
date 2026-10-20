# Event-Driven Retrieval Spec

**Status:** the mechanism below is **built and measured** on `audit/reconciliation-2026-10-20`
(commit `2575402f6`, Neon branch `dev-lit-vectors-2026-10`). This document is
the spec for the parts that are not yet built (corpus expansion to the full
8,077 identifiers, and the real-time trigger path).

---

## 1. The law

> "Every new signal must be able to re-query relevant premises and update the
> situational trace."

Implemented as four rules, each enforced in code and measured:

1. **Retrieval is top-k over an HNSW index.** No full-corpus scan, ever.
   Enforced by `lit.retrieve_premises` (`reconciliation/schema_literature.sql`)
   and verified by `EXPLAIN`:
   `Index Scan using premise_vector_hnsw_idx on premise_vector v / Order By: (embedding <=> (InitPlan 1).col1)`.
2. **A premise influences a decision only through an activation record.**
   `lit.activation` is the only route; there is no other write path.
3. **Residual feedback is written by settlement, never by the scorer.**
   `lit.residual` is written by `applyResidualFeedback`
   (`packages/prediction-engine/src/literature/literature-retrieval.ts`),
   called from the settlement path.
4. **Do-calculus runs on promoted edges only.**
   `runInterventionTest` refuses any edge whose `status <> 'promoted'`.

---

## 2. What was measured

```
$ node scripts/literature/run-loop.cjs          # 200 real signals -> full loop
RETRIEVAL: events=192 activations=2510 avg_latency=78.0ms
DISCOVERY: corpus hits=1920
real settled outcomes: 1401 games (3762 settled pick rows)
RESIDUALS: graded=72 skipped_no_settled_outcome=1547 skipped_no_probability_claim=338
CAUSAL EDGES: promoted=8
INTERVENTION TESTS: pass=0 fail=0 inconclusive=8
LAW CHECK (tests on non-promoted edges): 0 (must be 0)
```

Full readout: `reconciliation/literature-coverage.json`.

| | |
|---|---|
| Premises indexed + vectorized | 5,509 |
| Raw corpus items vectorized | 1,268 |
| Events → literature evaluation | 200 (7 signal keys, 15 games) |
| Activations | 5,650 across 257 distinct premises |
| Latency | p50 78 ms / p95 79 ms / p99 84 ms |
| HNSW used | 200/200 events |
| Residuals from **real** settled outcomes | 72 (43 correct) |
| Premises promoted to edges | 8 |
| Intervention tests | 8 (all INCONCLUSIVE) |
| Raw items structured after repeat retrieval | 75 |

---

## 3. The event path, hop by hop

```
  signal lands
      │
      ├─ (a) cron producer writes the `signals` row
      │      apps/web/app/api/cron/signal-ledger-write/route.ts
      │      → apps/web/lib/ops/signal-ledger-writer.ts:375 writeSignalCandidates
      │
      ├─ (b) LITERATURE BRIDGE fires on the same write      [BUILT]
      │      apps/web/lib/literature/literature-event-bridge.ts
      │        → retrieveForEvent(db, embedder, event, opts)
      │          packages/prediction-engine/src/literature/literature-retrieval.ts
      │            1. embed the event text
      │            2. INSERT lit.retrieval_event   (idempotent on event_key)
      │            3. SELECT lit.retrieve_premises(vector, k, pillars, min_sim)
      │            4. INSERT lit.activation  (one per premise that clears the floor)
      │            5. UPDATE lit.retrieval_event (hit_count, latency_ms, used_hnsw)
      │
      └─ (c) slate rebuild (existing path, unchanged)
             packages/ingestion-pipeline/src/generate-signal-slate.ts
             → process-sport.ts → scoring.ts → picks
```

**Hook point (b) is the new thing.** It sits immediately after the signal
write, inside the same cron tick, and is gated on `GSE_LITERATURE_BRIDGE=1`
so it cannot change production behaviour until the owner turns it on.

**Failure contract.** The bridge is strictly non-blocking: a literature
failure must never fail a signal write. `bridgeSignalsToLiterature` catches
per-event, counts refusals, and returns a report. It never throws.

**Event key and idempotency.** `makeEventKey(signalKey, entityId, at, 5min)`
buckets events into 5-minute windows, so a cron that runs twice in the same
window does not double-count a premise activation. Verified by unit test
(`packages/prediction-engine/src/literature/__tests__/literature.test.ts`).

---

## 4. Pillar scoping — the "relevant premises" half of the law

A signal should not surface premises that reason about a different axis.
`pillarsForSignal(signalKey)` (`literature-pillars.ts`) maps a signal key to
the pillars it bears on:

| Signal prefix | Pillars |
|---|---|
| `vision.` `ngs.` `tracking.` | physical_environment, efficiency_usage, tactical_schematic |
| `ftn.` | tactical_schematic, efficiency_usage |
| `qbr.` | efficiency_usage, tactical_schematic |
| `snaps.` | personnel_availability, efficiency_usage |
| `cognitive.` | cognition_decision, narrative_context |
| `weather.` `env.` | physical_environment |
| `injury` `injuries.` `depth_chart` | injury_availability, personnel_availability |
| `market.` `odds.` `line_` | market_microstructure, cognition_decision |
| `coach` `press` `news.` | narrative_context, cognition_decision |
| anything else | `null` → **unscoped** retrieval (search everything) |

Measured distribution of the 200 real events: `cognitive` 128 events
(avg 12.95 hits), `ftn` 72 events (avg 12.94 hits). Every event returned
hits; 198/200 had `hit_count > 0`.

---

## 5. The corpus expansion gap — 1,268 of 8,077

The index holds 1,268 raw corpus items. The corpus has 8,077 distinct
identifiers. The missing ones are in two places, and each needs a different
extractor:

| Source | Records | Extractor needed | Notes |
|---|---|---|---|
| `docs/arxiv-program/research/2026-10-17/*.json` | 1,268 (**indexed**) | — | Already vectorized. These are the arXiv/OpenAlex/master dumps. |
| `docs/arxiv-program/research/2026-09-21/arxiv-program/index/corpus-index.jsonl` | 1,251 | JSONL reader | **Already structured** — has `arxiv_id`, `title`, `verdict`, `signals`, `capability`, `methods`, `key_equations`, `numeric_gate`. This is the highest-value un-indexed source because it is already structured. |
| `docs/arxiv-program/research/2026-09-21/arxiv-deep/*.md` | 1,513 ledgers (2,121 arXiv ids) | Markdown front-matter parser | Each ledger has a verdict + a numeric gate. Structured in prose, not JSON. |
| The rest of the 47 JSON files under `docs/arxiv-program/research` | contributes to the 23,909 record count | — | Many are derived/summary artifacts (ResearchSynthesis 2,314, player-prior 440, position-prior 202) and are **not papers**. They should be excluded from the paper index. |

**Recommendation:** index `corpus-index.jsonl` (1,251 structured records with
`key_equations` and `numeric_gate`) and the `arxiv-deep` ledgers' front
matter. That takes the index from 1,268 to ~2,500 *distinct papers* without
touching the 17,763 "unlabeled" records, which are mostly priors and
synthesized artifacts, not literature.

**The rule that keeps it honest:** a corpus item is only *structured* into an
evaluable premise after retrieval surfaces it by **≥3 distinct retrieval
events** (`DEFAULT_DISCOVERY_THRESHOLD` in `literature-discovery.ts`).
`lit.discovery_hit` counts DISTINCT events, so one event returning the same
item 20 times is one confirmation, not twenty. Measured: 75 raw items were
promoted after 2,003 recorded hits.

---

## 6. The real-time trigger path — what is missing

The bridge fires on the **signal-ledger cron** (`23 * * * *` — hourly).
That is near-real-time for hourly signal families, but it is NOT a trigger.

**What a true trigger needs** (not built; staged in
`reconciliation/invention_proposals.md` as INV-01):

| Requirement | Current | Needed |
|---|---|---|
| Latency for a tweet/presser/formation signal | up to 60 min (hourly cron) | < 5 min |
| Event source | polling a cron | a write-path hook on the producer itself |
| Re-reason scope | literature retrieval only (bridge) | literature retrieval **+ chain reconstruction + adversary re-run + situational trace update** |
| Idempotency | 5-min event bucket | producer-supplied event id |

**The honest statement:** the literature half of the continuous loop is built
and measured. The **causal-chain half is not.** When a new signal arrives
today, the literature is re-queried (if the bridge is on) but the L1–L5
chain, the adversary review, and the situational trace are **not**
reconstructed. The smallest missing link is documented in
`reconciliation/reasoning_engine_continuous_loop_spec.md` §4.

---

## 7. Files

| File | Role |
|---|---|
| `packages/prediction-engine/src/literature/literature-embeddings.ts` | embedder (bge-m3), text builders, vector normalization |
| `packages/prediction-engine/src/literature/literature-pillars.ts` | 9-pillar taxonomy + signal→pillar scoping |
| `packages/prediction-engine/src/literature/literature-index-builder.ts` | premise/corpus mapping + upsert |
| `packages/prediction-engine/src/literature/literature-retrieval.ts` | `retrieveForEvent`, `applyResidualFeedback`, `promotePremisesToCausalEdges`, `runInterventionTest` |
| `packages/prediction-engine/src/literature/literature-discovery.ts` | repeat-retrieval discovery + promotion |
| `packages/prediction-engine/src/literature/literature-causal.ts` | promotion sweep, edge listing, edge retirement |
| `apps/web/lib/literature/literature-event-bridge.ts` | signal-write → retrieval (gated, non-blocking) |
| `apps/web/lib/literature/literature-residual-bridge.ts` | settlement → residual (gated, non-blocking) |
| `scripts/literature/build-index.cjs` | index builder (`--only-missing`, `--dry-run`, `--corpus-limit`) |
| `scripts/literature/run-loop.cjs` | end-to-end loop over real signals |
| `scripts/literature/run-discovery.cjs` | discovery sweep |
| `scripts/literature/measure-coverage.cjs` | coverage readout |
| `reconciliation/schema_literature.sql` | the `lit` schema |
