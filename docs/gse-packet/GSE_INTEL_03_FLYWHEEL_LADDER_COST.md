> Companion deep-dive to **GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md** · Galaxy Sports Edge · 2026-06-23

# Galaxy Sports Edge — The One Ladder: Flywheel, Schema, and Cost as Intelligence Moat

> **Branch:** `claude/sweet-fermi-sk9gws` · **Kickoff:** Sept 9 2026 (~80 days) · **Founder:** solo, cash-constrained
> **Scope:** Make GSE's central thesis *mechanical*. Prove the cost architecture is an intelligence weapon, not a budget line.

---

## Thesis

Galaxy Sports Edge has exactly one engine, and it must drive two wheels at once: **revenue maturity** and **engine maturity**. Today those two wheels are coupled only in prose — the pricing ladder lives in `pricing-phases.ts` (and, on this primary clone, not even there yet), while model-activation lives in scattered boolean env flags inside `platform-config.ts`, and a human reads the calibration harness and *decides* to flip both. That human-in-the-middle is the single point of drift: a tier can advance while signals stay shadow-only, or a `priced` flag can flip without the settled sample that justifies it, and nobody can prove they came from the same evidence. **The fix is to make the proof itself the source of truth.** When a game settles, one event fires and updates four things that each make the next turn easier — the data moat deepens, the model sharpens, the public proof grows, and the next pricing rung plus the next priced signal both unlock *from the same milestone record*. The mechanism that makes this real is an append-only `LadderEvent` ledger: a reducer reads it to answer four questions — which tier is live, which estimators are priced, can we publish projections, are performance stats public — so a tier advance and a signal-flip are *provably the same decision*. And because that ledger is fed by thousands of cheap recalibrations and backtests running on free-egress R2 Parquet through in-process DuckDB — not per-query Snowflake scans — the work required to climb the ladder fast is also GSE's *cheapest* line item. The cost architecture and the intelligence flywheel are not two strategies. They are one decision, and this document specifies it.

---

## Part 1 — The Compounding Flywheel: the Settled-Outcome Heartbeat

### 1.1 The mechanism in one sentence

> When an NFL game settles, **one event** (`game.settled`) fires **four compounding updates** in a fixed order — DATA → FORECAST → PROOF → UNLOCK — and the fourth is *derived from* the third via the `LadderEvent` ledger, so revenue and engine advance in lockstep or not at all.

This is not a metaphor. It is a directed, idempotent pipeline triggered by a real database state transition (`Pick.result` moving off `PENDING`, `Pick.settledAt` set). Below is the loop, then the four stages, then why it compounds and why a competitor on stale data cannot copy it.

### 1.2 The loop (single cycle)

```
                         ┌──────────────────────────────────────────────┐
                         │            game.settled  (heartbeat)         │
                         │   Pick.result ≠ PENDING ; Pick.settledAt set  │
                         └───────────────────────┬──────────────────────┘
                                                 │  one event, ordered fan-out
         ┌───────────────────────┬───────────────┴───────────────┬───────────────────────┐
         ▼                       ▼                                ▼                       ▼
   (a) DATA                (b) FORECAST                      (c) PROOF               (d) UNLOCK
   persist outcome +       calibration harness               CLV / Brier / ECE       LadderEvent reducer
   features to R2/         rescoring → ensemble               + coverage update       reads (c); flips
   DuckDB corpus           weights + isotonic maps           public track record     pricing rung +
   (moat deepens)          (models sharpen)                  + ladder counters       priced/publish flags
         │                       │                                │                       │
         │                       │                                │                       │
         └───────────────────────┴───────────────┬───────────────┴───────────────────────┘
                                                  ▼
                              next projection is BETTER  (sharper weights)
                              next price is DEFENSIBLE    (more settled proof)
                              next signal is PRICEABLE     (milestone unlocked priced=true)
                                                  │
                                                  └──────────►  the wheel turns again, faster
```

Each turn raises the floor for the next turn. That is the definition of a flywheel: not "it repeats," but "each repetition lowers the cost and raises the payoff of the next."

### 1.3 The four stages, concretely

**(a) DATA — the moat deepens.**
On settle, the outcome and the *full feature vector that existed at prediction time* are appended to the corpus. The feature vector is already captured by shipped infra: `PickSignalSnapshot` (the GameSignal keys/values priced at pick time), `PickMemory.signalProfile` + `embeddingVector`, and the `SourceSnapshot` hash chain that proves what raw data backed it. The heartbeat's job is to write `{game_id, settled_at, result, confidence_at_pick, model_version, feature_vector, snapshot_hashes}` as one row to **R2 Parquet** (append to the current week's partition). Cost: a few KB, ~$0 storage, **zero egress**. Every settled week, the training corpus grows by one immutable, queryable slice that *no competitor has*, because it is GSE's own prediction-time state paired with truth.

**(b) FORECAST — the models sharpen.**
The same event enqueues a recalibration job (Oracle Always-Free worker, `[INFRA pending]`). DuckDB reads the Parquet corpus *in-process* (no warehouse, no per-query bill) and recomputes, via the shipped `computeCalibration` harness (`apps/web/lib/calibration/compute.ts`): per-bucket observed-vs-expected win rate, Brier score, and bucket deltas. Where the harness flags drift (`|delta| ≥ 0.12`, `sampleSize ≥ 30`), it emits a `CalibrationProposal` (it already does — `computeCalibrationProposals`). The proposal carries new **ensemble weights** and **isotonic recalibration maps** as `evidence` JSON. Crucially: **this stage proposes, it does not apply.** The model-freeze guardrail (`scripts/guardrails/model-freeze.mjs`) means weights only change with a bumped `MODEL_VERSION` *and* an `IMPLEMENTED` proposal. So "the model sharpens" = "the evidence to sharpen it accumulates, gated by Model Court."

**(c) PROOF — the public record grows.**
The settle updates the public track record: rolling CLV beat-rate (% of picks that beat the closing line — the honest skill metric), Brier, calibration ECE, and coverage. These are the *ladder counters*: settled-count, calibration-published flag, CLV-beat-rate, ECE-non-worsening. This is the visible, on-brand proof of provenance — it ties directly to the shipped Evidence Audit payload (`AuditPayloadDetailed`) and the integrity-ledger. Proof is not marketing; it is the *input to stage (d)*.

**(d) UNLOCK — revenue and engine advance together.**
The `LadderEvent` reducer (Part 2) reads the proof counters and answers four questions with one computation:
1. **Which pricing rung is live?** (`pricing-phases.ts` reads `currentRung`)
2. **Which independent estimators are priced** (`priced=false → true`)?
3. **`canPublishProjections`** — may we surface model projections publicly?
4. **`PERFORMANCE_STATS_ENABLED`** — is the public performance surface open?

The invariant: **a tier advance and a priced-flip are derived from the same milestone event.** They cannot diverge, because they are the same reducer reading the same ledger.

### 1.4 The event contract

The heartbeat is a typed, versioned, idempotent contract. It is fired by the settlement worker (extends the existing settle path that sets `Pick.result`/`settledAt`).

```ts
// packages/types/src/heartbeat.ts  (new — pure types, zero deps)

/** Fired exactly once per (pickId) when a pick transitions out of PENDING. */
export interface GameSettledEvent {
  readonly schemaVersion: 1;
  readonly eventId: string;          // uuid; dedupe key (idempotency)
  readonly pickId: string;           // Pick.id
  readonly gameId: string;
  readonly settledAt: string;        // ISO; = Pick.settledAt
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
  readonly confidenceAtPick: number; // Pick.confidence (0–100)
  readonly modelVersion: string;     // Pick.modelVersion at prediction time
  readonly isBootstrap: boolean;     // Pick.isBootstrap — excluded from canonical counters
  readonly closingLine: number | null;   // for CLV; null if no closing snapshot
  readonly lineAtPick: number | null;     // Pick.line
  readonly snapshotHashes: readonly string[]; // SourceSnapshot.payloadHash chain
  readonly featureVectorRef: string; // R2 object key OR PickSignalSnapshot.id
}

/** The ordered fan-out. Each handler is idempotent on eventId and may be retried. */
export type HeartbeatHandler =
  | { stage: "DATA";     run(e: GameSettledEvent): Promise<DataResult> }
  | { stage: "FORECAST"; run(e: GameSettledEvent): Promise<ForecastResult> }
  | { stage: "PROOF";    run(e: GameSettledEvent): Promise<ProofResult> }
  | { stage: "UNLOCK";   run(e: GameSettledEvent): Promise<LadderEvent[]> };
```

**Contract guarantees:**
- **Idempotent.** Re-firing the same `eventId` is a no-op at every stage (DATA dedupes on Parquet row key; PROOF counters recompute from the ledger, not increment-in-place; UNLOCK appends only new `LadderEvent`s whose milestone isn't already recorded).
- **Ordered.** DATA must complete before PROOF (proof reads the corpus). UNLOCK runs last and *only* reads PROOF's counters via the ledger.
- **Bootstrap-safe.** `isBootstrap=true` picks persist to DATA (for forensics) but **never** advance canonical PROOF counters or trigger UNLOCK. This reuses the shipped `isBootstrap` invariant verbatim.
- **Replayable.** Because every counter is a *reduction over the append-only ledger* (not a mutated integer), the entire proof + unlock state can be rebuilt from scratch by replaying `LadderEvent`s. This is what makes the investor claim auditable.

### 1.5 Why it compounds (the three-way ratchet)

Each turn improves three independent quantities at once, and each improvement feeds the next turn:

| Turn N produces | Which makes Turn N+1's… | Mechanism |
|---|---|---|
| One more settled feature-vector row | **projection better** | Larger corpus → tighter isotonic maps, lower-variance ensemble weights |
| One more settled outcome on the public record | **price more defensible** | Ladder counters rise → next rung's evidentiary bar is met sooner |
| One more milestone crossed | **next signal priceable** | A shadow estimator that clears its settled-sample + CLV bar flips `priced=true` |

The three are *coupled through the same event*, so they advance together. A competitor who buys a model can match your weights *today* but not your **trajectory**: they have no corpus of *their own* prediction-time state paired with truth, so their recalibration has nothing to chew on. They can match your prices but not your *proof*, because proof is settled-sample, and settled-sample only accrues in real time. **The moat is not the model. The moat is the heartbeat that has been running longer than theirs.**

### 1.6 Why stale-data competitors can't replicate it

A competitor whose data goes stale breaks the loop at stage (a): if the feature vector at prediction time isn't captured paired with truth, there is nothing to recalibrate against in (b), nothing honest to publish in (c), and the ladder in (d) has no evidence to advance. They are left with a *static* model whose calibration silently rots as the league evolves, and a pricing page whose claims they cannot back. GSE's heartbeat, by contrast, *requires* freshness as a precondition (shipped: `SourceSnapshot` freshness gating, `BLOCKED_STALE` activation status, `dataFreshnessAt`) and *rewards* freshness with compounding proof. Stale data is not a disadvantage for them; it is a **disconnection from the flywheel entirely**.

---

## Part 2 — The Ladder Made Real in Schema: the `LadderEvent` Registry

### 2.1 Design principle: event-sourced, single source of truth

Today the ladder is implicit: pricing phases in one file, gate booleans in another (`platform-config.ts`), Model Court approvals as `CalibrationProposal` rows, and a human reconciling them. We replace the *reconciliation* with a *reduction*. `LadderEvent` is an **append-only log of proof milestones**. Four consumers read the *reduced* state — they never read each other:

```
                    ┌─────────────────────────────────┐
                    │   LadderEvent  (append-only)    │   ◄── written by UNLOCK stage
                    │   the single source of truth    │       + Model Court approvals
                    └────────────────┬────────────────┘
                                     │  reduceLadder(events) → LadderState
                                     ▼
              ┌──────────────┬───────┴────────┬──────────────────┐
              ▼              ▼                 ▼                  ▼
     (i) pricing-       (ii) priced=        (iii) canPublish   (iv) PERFORMANCE_
     phases.ts          false→true on        Projections        STATS_ENABLED
     reads currentRung  independent          (gate)             (gate)
                        estimators
```

### 2.2 The event types

```ts
// packages/types/src/ladder.ts  (new — pure types)

export type LadderEventType =
  // ── Proof milestones (emitted by the heartbeat's PROOF/UNLOCK stages) ──
  | "SETTLED_SAMPLE_REACHED"     // canonical settled-pick count crossed a named threshold
  | "CALIBRATION_PUBLISHED"      // a calibration report was made public for a model version
  | "CLV_BEAT_RATE_RECORDED"     // rolling CLV beat-rate measured over a window
  | "ECE_RECORDED"               // expected calibration error measured (non-worsening check)
  // ── Governance (emitted by Model Court / model-freeze) ──
  | "MODEL_VERSION_FROZEN"       // a MODEL_VERSION was locked with an IMPLEMENTED proposal
  | "CALIBRATION_PROPOSAL_IMPLEMENTED"  // a CalibrationProposal status → IMPLEMENTED, court-approved
  // ── Derived rung/flag transitions (the ONLY writers of live state) ──
  | "PRICING_RUNG_ADVANCED"      // currentRung moved FOUNDING→PROVEN→ESTABLISHED→AUTHORITY
  | "ESTIMATOR_PRICED"           // a named shadow estimator flipped priced=false→true
  | "PROJECTIONS_PUBLISH_ENABLED"
  | "PERFORMANCE_STATS_ENABLED";

export type PricingRung = "FOUNDING" | "PROVEN" | "ESTABLISHED" | "AUTHORITY";

export interface LadderEvent {
  readonly id: string;              // cuid
  readonly type: LadderEventType;
  readonly occurredAt: string;      // ISO
  readonly modelVersion: string;    // version in force when emitted
  readonly sourceEventId: string | null; // GameSettledEvent.eventId that caused it (provenance)
  /** Typed milestone payload — discriminated by `type`. */
  readonly payload:
    | { kind: "SETTLED_SAMPLE_REACHED"; threshold: 100 | 500 | 2000; settledCount: number }
    | { kind: "CALIBRATION_PUBLISHED"; reportId: string; brier: number; ece: number }
    | { kind: "CLV_BEAT_RATE_RECORDED"; windowDays: number; sampleSize: number; beatRate: number }
    | { kind: "ECE_RECORDED"; ece: number; previousEce: number | null }
    | { kind: "MODEL_VERSION_FROZEN"; proposalId: string | null }
    | { kind: "CALIBRATION_PROPOSAL_IMPLEMENTED"; proposalId: string; approvedBy: string }
    | { kind: "PRICING_RUNG_ADVANCED"; from: PricingRung | null; to: PricingRung; derivedFrom: string[] }
    | { kind: "ESTIMATOR_PRICED"; estimatorKey: string; derivedFrom: string[] }
    | { kind: "PROJECTIONS_PUBLISH_ENABLED"; derivedFrom: string[] }
    | { kind: "PERFORMANCE_STATS_ENABLED"; derivedFrom: string[] };
}
```

`derivedFrom` is the load-bearing field: it lists the `LadderEvent.id`s of the *proof milestones* that justified this transition. **This is the auditable spine of the investor pitch** — for any rung advance or flag flip, you can name the exact settled-sample / CLV / calibration events that earned it.

### 2.3 The reducer (computes the current rung + flags)

```ts
// packages/prediction-engine/src/ladder/reduce.ts  (new — PURE function)

export interface LadderState {
  readonly currentRung: PricingRung;          // (i) read by pricing-phases.ts
  readonly pricedEstimators: ReadonlySet<string>; // (ii) priced=true estimator keys
  readonly canPublishProjections: boolean;    // (iii)
  readonly performanceStatsEnabled: boolean;  // (iv)
  readonly settledCount: number;
  readonly latestCLVBeatRate: number | null;
  readonly latestEce: number | null;
  /** Provenance: for each derived transition, the milestone events that justified it. */
  readonly derivations: ReadonlyArray<{ transition: string; from: readonly string[] }>;
}

/** Ladder thresholds — the "one ladder" doctrine, as data not prose. */
export const RUNG_REQUIREMENTS = {
  FOUNDING:    { minSettled: 0,    minCLVBeat: null,  requiresCalibrationPublished: false },
  PROVEN:      { minSettled: 100,  minCLVBeat: null,  requiresCalibrationPublished: true  },
  ESTABLISHED: { minSettled: 500,  minCLVBeat: 0.524, requiresCalibrationPublished: true  },
  AUTHORITY:   { minSettled: 2000, minCLVBeat: 0.55,  requiresCalibrationPublished: true  },
} as const;

export function reduceLadder(events: readonly LadderEvent[]): LadderState {
  // Fold the append-only log. Counters are REDUCTIONS, never mutated integers,
  // so the whole state is replayable and audit-reconstructable.
  // 1. derive settledCount from latest SETTLED_SAMPLE_REACHED
  // 2. derive latestCLVBeatRate from most-recent CLV_BEAT_RATE_RECORDED
  // 3. derive calibrationPublished set from CALIBRATION_PUBLISHED events
  // 4. currentRung = highest rung whose RUNG_REQUIREMENTS are ALL met
  // 5. pricedEstimators = estimators that have an ESTIMATOR_PRICED event
  // 6. canPublishProjections / performanceStatsEnabled = presence of their enable events
  // 7. record derivations[] from each derived event's payload.derivedFrom
  // ... (pure; deterministic; no I/O)
}
```

The reducer is pure and deterministic — same log in, same state out — which is exactly what makes it testable and replayable. Note the doctrine encoded as data: `RUNG_REQUIREMENTS` is the "one ladder" made literal. **Founding members are grandfathered for life** by a separate, simpler rule (their `Subscription.tier` and price are pinned at signup and never recomputed by the reducer — the reducer governs *new* pricing, not existing grants).

### 2.4 How the four consumers read it (and only it)

```ts
// (i) pricing-phases.ts
const { currentRung } = reduceLadder(await loadLadderEvents());
//   → selects which price card is live; founding grandfathering applied at the Subscription layer.

// (ii) independent estimators (priced=false → true)
const { pricedEstimators } = reduceLadder(events);
const isPriced = (estimatorKey: string) => pricedEstimators.has(estimatorKey);
//   → a shadow estimator (e.g. "opponent-adjusted-epa") contributes to confidence
//     ONLY when its key is in pricedEstimators. Until then it is SHADOW_ONLY
//     (reuses the shipped EvidenceActivationStatus = "SHADOW_ONLY").

// (iii) canPublishProjections
const { canPublishProjections } = reduceLadder(events);
//   → gates whether model projection numbers are surfaced publicly.

// (iv) PERFORMANCE_STATS_ENABLED
const { performanceStatsEnabled } = reduceLadder(events);
//   → REPLACES the env-flag read in platform-config.ts with a ledger-derived value.
//     (Transition path in §2.7: env flag becomes a kill-switch override, not the source.)
```

### 2.5 Recording Model Court approvals as events

Model Court / `model-freeze.mjs` already enforce that a `MODEL_VERSION` bump needs an `IMPLEMENTED` `CalibrationProposal`. We make that decision a *first-class ladder event* so the ledger is the complete history:

- When a `CalibrationProposal` transitions to `IMPLEMENTED` (court-approved), emit `CALIBRATION_PROPOSAL_IMPLEMENTED { proposalId, approvedBy }`.
- When `MODEL_VERSION` is frozen against it, emit `MODEL_VERSION_FROZEN { proposalId }`.
- A `CALIBRATION_PUBLISHED` event is only valid if a `MODEL_VERSION_FROZEN` event exists for that version — enforced as an invariant (§2.6). This means **you cannot publish a calibration claim for a version the court never approved**, and the ledger proves it.

### 2.6 The invariant tests (the spine's guarantees)

These are the tests that make the coupling *enforced*, not *hoped-for*. They live in `packages/prediction-engine/src/ladder/__tests__/`.

```ts
// INV-1 — Same-milestone derivation (the headline invariant).
//   A PRICING_RUNG_ADVANCED to PROVEN and the ESTIMATOR_PRICED / PERFORMANCE_STATS_ENABLED
//   events that accompany the 100-settled milestone MUST share at least one
//   SETTLED_SAMPLE_REACHED event id in their `derivedFrom`.
test("tier advance and priced-flip derive from the same milestone event", () => {
  const ladder = reduceLadder(eventsAt100Settled);
  const rungDeriv  = ladder.derivations.find(d => d.transition === "PRICING_RUNG_ADVANCED:PROVEN");
  const flagDeriv  = ladder.derivations.find(d => d.transition === "PERFORMANCE_STATS_ENABLED");
  expect(intersect(rungDeriv.from, flagDeriv.from)).not.toHaveLength(0); // shared milestone
});

// INV-2 — No rung without its evidence.
//   ESTABLISHED requires minSettled≥500 AND CLV beat ≥0.524 AND calibration published.
//   Removing ANY one of those milestone events must drop currentRung below ESTABLISHED.
test("rung cannot advance without every required milestone", () => {
  expect(reduceLadder(full).currentRung).toBe("ESTABLISHED");
  expect(reduceLadder(without(full, "CLV_BEAT_RATE_RECORDED")).currentRung).not.toBe("ESTABLISHED");
});

// INV-3 — Bootstrap picks never advance the ladder.
test("isBootstrap settles do not move canonical counters", () => {
  expect(reduceLadder(onlyBootstrapSettles).settledCount).toBe(0);
});

// INV-4 — Published calibration requires court-approved freeze.
test("CALIBRATION_PUBLISHED invalid without MODEL_VERSION_FROZEN for that version", () => {
  expect(() => validateLedger(publishedWithoutFreeze)).toThrow(/no MODEL_VERSION_FROZEN/);
});

// INV-5 — Replay determinism.
test("reduceLadder is a pure fold (replay yields identical state)", () => {
  expect(reduceLadder(events)).toEqual(reduceLadder([...events])); // order-stable, idempotent
});

// INV-6 — Founding grandfather is reducer-independent.
test("advancing rungs never changes an existing founding member's pinned price", () => {
  // reducer governs `currentRung` for NEW signups; existing Subscription price is immutable
});
```

INV-1 is the one you put on the investor slide: *"a tier advance and a priced-flip are, by test, the same milestone event."* Revenue maturity and engine maturity are the same ledger — and CI proves it on every commit.

### 2.7 Migration from today's scattered flags (safe, incremental)

1. **Ledger as shadow first.** Stand up `LadderEvent` + `reduceLadder` and have the heartbeat write events, but keep `platform-config.ts` env flags authoritative. Log when ledger-derived state *disagrees* with env flags. Zero behavior change.
2. **Flip reads one consumer at a time.** First `pricing-phases.ts` reads `currentRung` from the reducer (lowest blast radius — pricing is forward-only). Then `canPublishProjections`. Then `PERFORMANCE_STATS_ENABLED`. Then estimator `priced` flags.
3. **Env flags become kill-switches.** After cutover, an env flag can only *force-disable* (fail-closed override), never *enable*. The ledger is the sole *enabler*. This preserves the shipped "safest default" property of `platform-config.ts` while moving the source of truth to the proof log.

---

## Part 3 — Cost as Intelligence Moat (the Inversion)

### 3.1 The claim

> Because the corpus lives in **R2 Parquet (zero egress)** queried by **in-process DuckDB ($0 compute)**, GSE's marginal cost of running *another* backtest, recalibration, or walk-forward cross-validation is **≈ $0**. Competitors on Postgres / Snowflake / per-query warehouses pay for **every scan**. Therefore GSE can run *thousands* of recalibrations and shadow-estimator backtests cheaply — which is *exactly* the work required to climb the proof ladder fast. **The intelligence flywheel and the cost architecture are the same decision.** "King of stats" grows GSE's *cheapest* line item, not Neon or Vercel.

### 3.2 Why the marginal cost is ~$0 (and why theirs isn't)

| Operation | GSE (R2 + DuckDB) | Competitor (Postgres / Snowflake) |
|---|---|---|
| Store one settled feature-vector row | ~KB to R2 Parquet; **$0.015/GB-mo**, **$0 egress** | Row in OLTP Postgres; bloats the serving DB, raises every query's cost |
| Read full corpus for a backtest | DuckDB memory-maps Parquet **in-process**; no network, no warehouse, **$0 marginal** | Snowflake: warehouse spins up, **per-second compute billed** every run; or Postgres seq-scan contends with live serving |
| Run 1,000 walk-forward CV folds | 1,000 in-process scans of columnar Parquet; **$0 marginal**, minutes on free Oracle VPS | 1,000 warehouse queries → **1,000× per-query cost**; or saturates Postgres and degrades the app |
| Shadow-backtest a new estimator before pricing it | Read corpus, score, compare to truth — **$0** | Each candidate estimator = another expensive full scan |

The asymmetry is structural. Their architecture *taxes curiosity*: every additional experiment costs money or steals capacity from serving users. GSE's architecture makes experimentation free, because **storage is cheap, egress is zero, and compute is in-process on hardware that costs nothing** (Oracle Always-Free). The thing that climbs the ladder — relentless recalibration and shadow-backtesting — is precisely the thing GSE can do at zero marginal cost and they cannot.

### 3.3 The tie-back: this *is* the flywheel

Part 1's stage (b) FORECAST and the shadow-estimator path in Part 2's `ESTIMATOR_PRICED` both depend on **running the calibration harness and walk-forward CV over the growing corpus, repeatedly.** That workload is:
- **The ladder-climbing work** (it produces the `CalibrationProposal`s and CLV/ECE measurements that become `LadderEvent`s), and
- **GSE's cheapest line item** (it runs on R2+DuckDB+Oracle-free, the three near-zero-cost components).

So the decision "store the corpus in R2 Parquet and query it with DuckDB" is *identical* to the decision "make climbing the proof ladder fast and cheap." There is no separate "scale the data warehouse" cost curve that grows with intelligence. **Intelligence grows on the flat part of the cost curve.**

### 3.4 Tie to shipped Phase 0 + `[INFRA]` items

| Component | Status | Role in the moat |
|---|---|---|
| Deploy-gating (`scripts/vercel-skip-build.mjs` + `vercel.json` `ignoreCommand`) | **SHIPPED** | Keeps Vercel build minutes (a *metered* cost) off the critical path — only ship when code that matters changes |
| `SourceSnapshot` hash-only + `prune-usage.mjs` | **SHIPPED** | Stores **hashes not payloads** in the serving DB → Neon stays small/cheap; raw bulk goes to the lake, not Postgres |
| CDN fail-safe policy | **SHIPPED** | Caps egress on the serving path |
| R2 Parquet corpus | **`[INFRA pending]`** | The zero-egress, cheap-storage substrate that makes backtests free |
| DuckDB in-process OLAP | **`[INFRA pending]`** | The $0-compute query engine over Parquet |
| Oracle Always-Free VPS (cron/workers) | **`[INFRA pending]`** | Runs the heartbeat recalibration loop at $0 compute |
| Neon serving subsets only | **partial** | Postgres serves *current* state; the corpus and backtests never touch it |

Phase 0 already removed the metered costs from the hot path (build minutes, Postgres bloat, egress). The `[INFRA]` items add the zero-marginal-cost experimentation substrate. Together they realize §3.1.

### 3.5 Rough monthly cost envelope (solo-founder launch, NFL live)

Order-of-magnitude, conservative, ~early-launch traffic:

| Line item | Plan / basis | Est. monthly |
|---|---|---|
| **Vercel** | Pro (1 seat) — needed for crons/headroom; Hobby viable at the very start | **$0–20** |
| **Neon Postgres** | Serving subsets only (hash-only snapshots, pruned) → stays in/near free tier | **$0–19** |
| **Cloudflare R2** | Corpus storage; e.g. 20 GB Parquet @ $0.015/GB-mo, **zero egress** | **~$0–1** |
| **DuckDB** | In-process library | **$0** |
| **Oracle Cloud Always-Free VPS** | cron + recalibration workers (Ampere A1 free tier) | **$0** |
| **The Odds API** | real odds/lines (separate metered cost; plan-dependent) | *(existing data budget)* |
| **LLM (content only, internal-budgeted)** | Claude for content generation, draft-only, capped | **internal cap** |
| **Domain / email / misc** | galaxysportsedge.com etc. | **~$5–15** |
| **Core infra subtotal (excl. Odds API + LLM)** | | **≈ $5–55 / month** |

The headline: **the intelligence workload — thousands of recalibrations and backtests — sits in the $0 column** (R2 storage ~$1, DuckDB $0, Oracle $0). The metered costs (Vercel, Neon, Odds API) are bounded by *serving and ingestion*, not by *how much GSE thinks*. A competitor's bill scales with thinking; GSE's doesn't. That is the inversion, in dollars.

---

## Part 4 — The Public Learning Artifact: the Intelligence Ledger / Model Changelog

### 4.1 What it is

A public page — `/intelligence-ledger` (or `/changelog`) — where **users watch the system get smarter every settled week.** It fuses three things GSE already values: **engagement** (a reason to come back weekly), **proof** (the track record, made narrative), and the **"learning, growing" story** (the brand's honest differentiator). It is the human-readable face of the `LadderEvent` ledger.

### 4.2 What it shows (per settled week)

Each entry is generated from real `LadderEvent`s + `CalibrationProposal`s + the calibration harness output — never fabricated:

- **Version line:** "Model `v5.0.0` → `v5.1.0`" (only when an `IMPLEMENTED`, court-approved proposal landed — i.e., a `MODEL_VERSION_FROZEN` event exists).
- **Calibration delta:** "Brier 0.214 → 0.207; the 70–79 confidence bucket was over-calling outcomes by 13% on 41 settled picks — recalibrated down." Pulled straight from `computeCalibration` buckets and the proposal `rationale`.
- **What improved and why:** the proposal's `observation` + `proposedChange`, in plain English. ("We were too confident on thin totals markets. We're not anymore, and here's the settled sample that told us.")
- **Ladder progress:** "Settled canonical picks: 487 / 500 to ESTABLISHED. CLV beat-rate (30d): 53.1%." Direct from `reduceLadder` counters.
- **Estimator activations:** "`opponent-adjusted-epa` graduated from shadow to priced this week after clearing its settled-sample and CLV bar." (an `ESTIMATOR_PRICED` event).
- **Honest weeks too:** when nothing improved or calibration worsened, the page *says so* ("ECE ticked up; no version bump; here's what we're watching"). This is the brand-safety posture — the model-freeze guardrail guarantees no silent self-congratulation, and the ledger surfaces the honest non-event.

### 4.3 How it ties to existing systems

- **integrity-ledger:** the changelog is the *public projection* of the same provenance the integrity-ledger / Evidence Audit (`AuditPayloadDetailed`) tracks privately. Same source of truth, two audiences (operator forensics vs. public proof).
- **model-freeze calibration proposals:** every version-bump entry on the page is backed by an `IMPLEMENTED` `CalibrationProposal` (enforced by `model-freeze.mjs`). **You cannot publish a "we got smarter" entry without the court-approved artifact behind it.** The page literally cannot lie about a version bump, because the guardrail won't let the version bump exist without the proposal.
- **`LadderEvent` ledger:** the changelog is a *read view* over `LadderEvent` + `CalibrationProposal`. No new source of truth — it renders the ledger. That keeps it honest by construction and cheap to build.

### 4.4 Why it's strategic, not cosmetic

It turns the flywheel's stage (c) PROOF into a **product surface**. The same settled-outcome heartbeat that sharpens the model and unlocks pricing *also* produces weekly, must-read content with zero incremental fabrication risk. Engagement, proof, and the learning narrative are produced as a *byproduct of the engine doing its job* — which is the cheapest, most defensible content GSE can possibly ship.

---

## Part 5 — The First Commit: the Minimal `LadderEvent` Slice

### 5.1 Goal of the first commit

Make the ladder *real* — one append-only event, one pure reducer, the headline invariant test (INV-1), and one consumer reading it in shadow mode. **No behavior change in production** (env flags stay authoritative). This is the smallest change that turns the "one ladder" from prose into an enforced mechanism.

### 5.2 Exact files (minimal slice)

```
packages/types/src/ladder.ts                      [NEW]  LadderEvent, LadderEventType, PricingRung, payload union
packages/prediction-engine/src/ladder/reduce.ts   [NEW]  reduceLadder(events) → LadderState ; RUNG_REQUIREMENTS
packages/prediction-engine/src/ladder/__tests__/reduce.test.ts  [NEW]  INV-1, INV-2, INV-3, INV-5 (pure, no DB)
packages/db/prisma/schema.prisma                   [EDIT] add `model LadderEvent` (append-only; mirrors §2.2)
packages/types/src/heartbeat.ts                    [NEW]  GameSettledEvent contract (types only)
```

`LadderEvent` Prisma model (append-only, indexed for reduction):

```prisma
model LadderEvent {
  id            String   @id @default(cuid())
  type          String                       // LadderEventType
  occurredAt    DateTime @default(now())
  modelVersion  String
  sourceEventId String?                       // GameSettledEvent.eventId (provenance)
  payload       Json                          // typed milestone payload (discriminated by `type`)
  createdAt     DateTime @default(now())

  @@index([type])
  @@index([occurredAt])
  @@index([modelVersion])
  @@map("ladder_events")
}
```

### 5.3 How it integrates with what's already shipped

- **Reuses `Pick.result` / `Pick.settledAt` / `Pick.isBootstrap`** as the heartbeat trigger and the bootstrap-exclusion rule — no new settlement logic, just emit `SETTLED_SAMPLE_REACHED` when the canonical settled count crosses 100/500/2000.
- **Reuses `computeCalibration` (`apps/web/lib/calibration/compute.ts`)** to produce the Brier/ECE numbers carried in `CALIBRATION_PUBLISHED` payloads. No new math.
- **Reuses `CalibrationProposal` + `model-freeze.mjs`** — `CALIBRATION_PROPOSAL_IMPLEMENTED` / `MODEL_VERSION_FROZEN` events are emitted from the *existing* court-approval path; the guardrail already blocks unapproved version bumps.
- **`reduceLadder` is pure** (like the shipped `getEntitlements` and `computeCalibration`) — same testing pattern, drops into the monorepo with zero new infra and runs in CI.
- **Shadow-mode cutover** (§2.7 step 1): `pricing-phases.ts` (on the branch) gains a *log-only* `reduceLadder(...).currentRung` comparison against its current phase logic. Production behavior unchanged until the disagreement log is clean.

### 5.4 The commit message

```
feat(ladder): event-sourced LadderEvent ledger — single source of truth for
rung + priced flags (shadow mode)

Introduce the append-only LadderEvent registry and a pure reduceLadder()
that derives currentRung, pricedEstimators, canPublishProjections, and
performanceStatsEnabled from proof milestones (settled count, calibration
published, CLV beat-rate, ECE). Adds the GameSettledEvent heartbeat contract.

The headline invariant (INV-1) is enforced by test: a PRICING_RUNG_ADVANCED
and the priced-flip events that accompany the same settled-sample milestone
must share a derivation. Revenue maturity and engine maturity are now,
provably, the same ledger.

Reuses Pick.result/settledAt/isBootstrap, computeCalibration, and the
CalibrationProposal + model-freeze guardrail. No production behavior change:
env flags in platform-config.ts remain authoritative; the reducer runs in
shadow and logs any disagreement (migration §2.7 step 1).
```

### 5.5 The next three commits (so the slice lands a working spine)

1. **Heartbeat emit:** wire the settlement worker to fire `GameSettledEvent` and write `SETTLED_SAMPLE_REACHED` / `CALIBRATION_PUBLISHED` `LadderEvent`s (idempotent on `eventId`).
2. **First real cutover:** `pricing-phases.ts` reads `currentRung` from `reduceLadder` (forward-only; lowest blast radius); founding grandfather pinned at the `Subscription` layer.
3. **Public artifact v0:** `/intelligence-ledger` renders the ledger (read view over `LadderEvent` + `CalibrationProposal`) — engagement + proof + learning story, fabrication-impossible by construction.

---

### Closing

The "one ladder" stops being a doctrine you describe and becomes a mechanism CI enforces. One settled game fires one heartbeat; the heartbeat deepens the corpus, sharpens the model, grows the proof, and — through a single append-only ledger and a pure reducer — advances the price and unlocks the next signal *from the same milestone*. That ladder-climbing work runs on R2 Parquet + DuckDB + Oracle-free, so it is simultaneously the most valuable and the cheapest thing GSE does. Ship the minimal `LadderEvent` slice in shadow mode, and from that commit forward, "revenue maturity and engine maturity are the same ledger" is not a pitch line — it's a passing test.
