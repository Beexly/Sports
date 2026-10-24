# Invention Proposals — staged innovations

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Rule:** every proposal names the file it touches, the measured evidence that
it is needed, and the gate it must pass. Proposals that would change a
published number are marked **OWNER-DECISION** and are staged, not applied.

---

## The measured state these proposals start from

| Fact | Measurement |
|---|---|
| Real-time sources | 104 live RSS feeds (32 club + 52 beat + 20 insider), 10-min cron |
| `signals` table | 126,445 rows, 32 keys, 2026-08-06 → 2026-10-20 |
| `wire.*` rows (real-time wire) | **44** |
| Trust-signals intake | **225 rows, ONE source handle (`@mysportsupdate`), 100% `signal_type: injury`, 100% `shadow: true`, `calibration_state: UNCALIBRATED`, `extraction_confidence: 0.0`** |
| X/Twitter producer | **NONE** — `workers/twitter-bot/x-client.js:19` targets `api.x.com` and is imported by nothing |
| DARK_NO_PIT evaluators | **21** (0 with a producer; 20 whose data already exists) |
| L1–L5 engine reachability | **ZERO callers outside `intelligence/`**; no HTTP route in `apps/web` |
| Adversary output consumers | **NONE** — `killed_legs()` has no consumer |
| Causal methods implemented | do-calculus (adjustment/front-door/back-door + identification check), NOTEARS, PCMCI, Granger, TMLE, IPW, e-value — **all unwired; 8 carry `ENABLED = false`** |
| Literature premises | 5,509 indexed (audit branch), 13 structured in the repo, 5,149 mind records |
| Residuals | 72 (audit branch), from real settled outcomes |
| Causal edges promoted | 8; intervention tests 8, all INCONCLUSIVE |

---

## INV-01 — Per-signal literature re-query (the trigger)

**Problem.** The literature bridge fires on the hourly
`signal-ledger-write` cron, not per signal. A tweet at 12:04 does not
re-query the literature until 13:23.

**Design.** Move the hook inside the write loop.

- **File:** `apps/web/lib/ops/signal-ledger-writer.ts` — inside
  `writeSignalCandidates` (`apps/web/lib/ops/signal-ledger-writer.ts:375`),
  after each successful upsert.
- **Call:** `bridgeSignalsToLiterature` — already built at
  `apps/web/lib/literature/literature-event-bridge.ts`.
- **New option:** `bridge: boolean` on the writer options, so the writer
  does not import the bridge directly (keeps the writer's no-Prisma-import
  property, per `apps/web/lib/ops/signal-ledger-writer-types.ts:1-5`).
- **Idempotency:** already handled — `makeEventKey` buckets events into
  5-minute windows, so a re-run in the same window does not double-count.
- **Batch guard:** the writer handles 80,000 rows in one tick
  (`apps/web/app/api/cron/signal-ledger-write/route.ts` shard comment). A
  per-signal embed would be 80,000 API calls. **Requirement: embed once per
  DISTINCT (signalKey, value-bucket) per tick, not once per row.** The
  `signals` table has 32 keys; the distinct (key, entity) pairs that changed
  are far fewer. The bridge's `eventKey` already collapses duplicates.

**Gate:** `GSE_LITERATURE_BRIDGE=1`. Non-blocking.

**Risk:** low. No published number changes.

---

## INV-02 — The reasoning engine needs a service entry point

**Problem.** The entire L1–L5 engine — chain construction, escalation,
adversary, breaking conditions — has **zero callers outside
`intelligence/`** and **no HTTP route**. It cannot be reached by the web
app, the crons, or the publish path.

**Design.** One read-only ops route that runs the engine and returns the
trace.

- **New file:** `apps/web/app/api/ops/reasoning/route.ts` — GET, calls
  `intelligence/reasoning_engine/run_game.py:reason_game`, returns the
  `ReasoningTrace` as JSON.
- **Auth:** follow `apps/web/lib/cron/authorize.ts` (ops routes are
  auth-gated) — the reasoning trace contains internal reasoning, so this
  must NOT be a public route.
- **Consumer:** `apps/web/lib/ops/reasoning-panel.tsx` (a cockpit view) and,
  later, the trace-refresh hook in INV-03.

**Why this matters.** Until the engine is reachable, "make the loop
continuous" has no referent. The engine is a library with no service.

**Gate:** an ops-route auth check, plus an env flag.

**Risk:** low. No published number changes. **This is the prerequisite for
every other causal proposal.**

---

## INV-03 — Trace refresh: a signal re-reasons the trace (G1)

**Problem.** A new signal updates the literature (INV-01) but not the
situational trace, because `interpretSituation`
(`packages/prediction-engine/src/reasoning/situational-engine.ts:105`) is
called only from `dynamic-context-builder.ts:177`, inside a slate build.

**Design.** On a qualifying signal, re-run the situational read and persist
the refreshed trace.

- **New file:** `apps/web/lib/literature/trace-refresh.ts` —
  `refreshSituationalTrace(signal)`.
- **Trigger:** the same hook as INV-01, but only for signals whose pillar
  has ≥1 active premise activation (a signal that activates no premise has
  nothing to re-reason about).
- **What it does:** call `retrieveForEvent` (built), read the activations,
  and if the belief changed, re-emit the trace via
  `intelligence/reasoning_engine/emit_trace.py:write_trace` and persist it.
- **What it does NOT do:** it does not touch `trueProb`. The trace is
  advisory until the owner decides otherwise.

**Gate:** `GSE_LITERATURE_BRIDGE=1` + `GSE_TRACE_REFRESH=1`.

**Risk:** low. Advisory only.

**This is the answer to "the smallest missing link that would let a new
signal force a re-reason."**

---

## INV-04 — DARK adapter: `ctx.env` → database (20 evaluators)

**Problem.** 21 evaluators are `DARK_NO_PIT` because they read
`process.env` instead of the database. **20 of them declare
`dataDependencies` that name a table which exists with rows.**

**Design.** One context builder that resolves the declared dependencies
into typed values.

- **New file:** `packages/ingestion-pipeline/src/context.builders/signal-context.ts`
  — `buildSignalContext(game, providers)` returning the typed values the
  evaluators want.
- **Edits:** 20 evaluators in
  `packages/ingestion-pipeline/src/signal-registry-extensions.ts`, each
  changing `num(ctx.env, "REST_DAYS")` to `ctx.restDays`.
- **Example (measured):** `nfl_short_week_road_deficit` —
  `games.restDaysHome` is populated on 2,130 of 4,832 games. The evaluator
  becomes live with a 5-line adapter.

**The order that matters.** A newly wired evaluator starts at weight 0 and
must earn its way up through the kill line
(`signal-registry-extensions.ts:41-46`: `minSettledSample 100`,
`maxBrierScoreVsMarket 0.250`). **Wiring without the settlement loop
produces 20 more signals that never earn weight** — the same failure as the
corpus evaluator. So INV-04 must land with INV-06.

**Two deletion candidates** (honest, per the doctrine that dark sources must
receive a producer or be deleted):
- `nfl_turf_surface_fatigue` — `TURF_SOFTNESS_INDEX` is measured by
  nothing. There is no turf-physics feed.
- `nfl_age_conditioned_rest` — `ROSTER_SNAP_WEIGHTED_AGE` is a
  construction, not a measurement.

**Gate:** the existing kill line, unchanged. A wired evaluator that misses
the kill line is retired by the same mechanism.

**Risk:** MEDIUM — 20 signals start voting. Requires the settlement loop.

---

## INV-05 — An X/Twitter producer (the missing real-time family)

**Problem.** The brief names "live X/tweets" as a real-time requirement.
**There is no producer.** `workers/twitter-bot/{oauth1,sender,x-client}.js`
exist; `x-client.js:19` targets `https://api.x.com`; nothing imports them.
@GalaxySportsHQ posting is manual.

**Design.** One cron that polls tracked X accounts and writes `wire.*`
rows through the EXISTING classifier.

- **New file:** `apps/web/app/api/cron/refresh-wire-x/route.ts`.
- **Reuse:** `apps/web/lib/news/wire-store.ts:162` `toWireReport` and
  `classifySignal` — the classification, the corroboration window
  (`CORROBORATION_WINDOW_MINUTES = 6*60`, `wire-store.ts:97`), the per-signal
  cap (`MAX_REPORTS_PER_SIGNAL = 12`, `:100`), and the self-sourced rule
  (`:77`) all already exist and are already correct.
- **Transport:** `workers/twitter-bot/x-client.js` — already written, needs
  wiring and credentials.
- **Source list:** the tracked accounts, mirroring `REPORTER_ROSTER`'s beat
  and insider seats.

**The honesty requirement.** X items must be labeled with their source tier
exactly as RSS items are, and a self-sourced X account must not corroborate
itself. `wire-store.ts:77` already states *"C-415/C-417: GSN's own feed
never counts toward corroboration."* Extend the same rule to X.

**Gate:** credentials present + a new env flag.

**Risk:** medium — a new external dependency and a new terms-of-service
surface.

---

## INV-06 — The settlement→belief loop, end to end

**Problem.** Nothing on `main` updates a weight, a premise score, or an edge
strength from a settled result. `settlement.ts` contains zero `weight`
references; `post-settlement-work.ts` is a retry queue.

**Design.** Three stages, in order, each gated on the previous.

| Stage | What | Where |
|---|---|---|
| **6a** | Write residuals from settled outcomes | BUILT (audit branch): `applyResidualFeedback` (`literature-retrieval.ts:290`) + `apps/web/lib/literature/literature-residual-bridge.ts`, hooked at `apps/web/lib/settlement/free-path-snapshot.ts` |
| **6b** | Update EDGE strength from residuals | `lit.causal_edge.effect_estimate` / `support_n` — needs a recompute step beside `applyResidualFeedback` |
| **6c** | Compute a KNOWABILITY score | new field; natural construction is `1 - mse(premise_residuals)`, already computable |

**The scoring rule that matters.** Brier skill against the 0.25 uninformed
baseline, never binary correctness. Measured reason: a premise graded at
0.5 ("I do not know") is scored *incorrect every time* under a binary rule,
so no premise can ever earn weight. The first real run measured exactly
that — 48 graded, 0 correct, MAE exactly 0.50000, max score 0.

**The honest limit.** 72 residuals over 2 games is not a trend. 8 promoted
edges with 8 INCONCLUSIVE tests is not evidence. **The promotion gate
(N≥500 settled games, ΔBrier≥0.002) must run before any of these numbers
means anything.**

**Gate:** `GSE_LITERATURE_BRIDGE=1`; the corpus `corpusWeight` stays 0 until
the pre-registration passes.

---

## INV-07 — Counterfactual trace evaluation (cheapest causal win)

**Problem.** The repo has a do-calculus engine and an adversary with
breaking conditions, but no way to ask "would this thesis survive if X were
different?"

**Design.** A counterfactual is mechanically available and needs NO new
estimator.

- **New file:** `intelligence/reasoning/counterfactual.py` —
  `counterfactual_trace(trace, metric, value)`.
- **How:** clone the `ReasoningTrace`, override one entry in
  `observed_values`, re-run `adversary_review`
  (`intelligence/reasoning/adversary.py:357`), and report whether the thesis
  survives.
- **Why it works:** `BreakingCondition`
  (`intelligence/reasoning/schemas.py:47-63`) is already
  machine-checkable — it has `metric`, `op`, `threshold`, `observed`, and
  it is evaluated against the trace's `observed_values`. The adversary
  already checks them (`adversary.py:190` `_check_breaking_conditions`).
  **So "the chain's own falsifiers" ARE the intervention set.**
- **The intervention set is not chosen by us — it is chosen by the chain.**
  Each link carries its breaking conditions, so the meaningful
  counterfactuals are the ones the chain itself says would break it.

**This is the closest thing to the brief's "adversary-as-intervention" that
the repo's data structures already support.** The brief's example —
*"OL injuries → Monken quick-game compensation → pressure neutralization,
adversary marks breaking conditions"* — is
`intelligence/integration/pipeline.py:131-165`, and its breaking conditions
are already `machine-checkable` with `metric: "quickgame_rate"`,
`operator: ">="`, `threshold: QUICKGAME_NEUTRALIZE_THRESHOLD`, and
`metric: "ttt_seconds"`.

**Gate:** advisory only. No number changes.

**Risk:** low.

---

## INV-08 — Do-calculus on L3 chains (OWNER-DECISION)

**Problem.** The do-calculus engine exists
(`packages/prediction-engine/src/2602-23233v1-the-counterfactual-combine-a-causal.ts`:
`identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`,
`requireIdentified`) and is unwired. `backdoorSet`
(`2603-22620v2-chainreaction-causal-discovery-via-blocking.ts:51`) works on
a `CausalEdge[]` graph.

**The blocker is data, not algorithm.** `CausalLink`
(`intelligence/integration/types.py:52`) has `cause`, `mechanism`,
`outcome`, `verification`, `breaking_condition`, `id` — **no effect size,
no probability, no quantity.** A Pearl estimand needs
`E[Y | T=t, Z=z]` and `P(Z=z)`.

**Design, in two parts:**

1. **The numeric bridge** (new):
   `packages/prediction-engine/src/literature/literature-do.ts` —
   `estimateAdjustment(cause, outcome, adjustmentSet, settledHistory)`
   returning `condMeans` and `pZ` from the settled-picks table
   (4,340 settled picks over 2,374 games — measured). Then call the
   EXISTING `adjustmentEstimand`.
2. **The chain resolver** (new): map an L3 `CausalLink`'s
   `cause`/`mechanism`/`outcome` strings to signal keys, so `backdoorSet`
   can run on a real graph.

**The honest pre-condition.** `requireIdentified` must pass. If the
adjustment set is not identifiable, the query is REFUSED — which is the
correct behaviour and the reason this proposal is safe to stage.

**OWNER-DECISION because** it changes a published number, and `MODEL_VERSION`
is frozen at `v5.3.0` (`packages/prediction-engine/src/constants.ts:31`).

**The staged version that is NOT an owner decision:** run the intervention
and record it in the trace, without letting it move `trueProb`. That gives
the owner real numbers to decide with, which is better than deciding blind.

---

## INV-09 — Corpus expansion to the real 8,077 identifiers

**Problem.** The index holds 1,268 raw items; the corpus has 8,077 distinct
identifiers. The structured ones are the valuable ones.

**Design.** Two new extractors, no new architecture.

- **`corpus-index.jsonl`** (1,251 rows) — already structured:
  `arxiv_id`, `title`, `verdict`, `signals`, `capability`, `methods`,
  `key_equations`, `numeric_gate`. **This is the highest-value un-indexed
  source** and needs only a JSONL reader.
- **`arxiv-deep/*.md`** (1,513 ledgers, 2,121 arXiv ids) — a front-matter
  parser. Each ledger has a verdict and a numeric gate, which is exactly
  what a premise needs.

**What must NOT be indexed.** 17,763 of the 23,909 citable records are
"unlabeled" and are mostly priors, player-priors, position-priors, and
ResearchSynthesis artifacts — **not papers.** Indexing them would pad the
index with non-literature. The rule: a record is a corpus item only if it
has a resolvable paper id AND a title.

**The promotion rule is already built and measured.** A raw item becomes a
structured premise only after **≥3 distinct retrieval events** surface it
(`DEFAULT_DISCOVERY_THRESHOLD`, `literature-discovery.ts`). 75 items were
promoted from 2,003 recorded hits in the measured run.

---

## INV-10 — Temporal causal discovery over the signal sequence

**Problem.** The mandate wants "temporal causal discovery on sequential
signals (formation changes, presser language shifts, line movement, injury
reports)."

**The data substrate is excellent** (measured live):

| Store | Rows | Resolution |
|---|---|---|
| `odds_line_snapshots` | **4,948,756** | **14,033 distinct stamps over 33 days** |
| `signals` | 126,445 | 6,038 (entity, key) pairs with multiple captures |
| `game_signals` | 5,984 | 14 keys with `fetchedAt` + `expiresAt` |

**The algorithms exist**: `batesGrangerWeights`
(`2608-13886-a-forecast-combination-framework-for.ts:78`),
`laggedCorrelationSelect` (`causal/multidata-drivers.ts:34`),
`pcmciSkeletonS1` (`causal/2003-03685v2-pcmci-team-panel.ts:114`),
`cusumDetect` (`2007-00267v1-regime-dependent-causal-discovery.ts:114`).

**Design.** A read-only sweep job that:
1. reads the sequence of a signal key for one entity,
2. runs `laggedCorrelationSelect` / `pcmciSkeletonS1` to propose candidate
   lagged edges,
3. **gates every candidate through `refutationSuite`**
   (`2603-22620v2-chainreaction-causal-discovery-via-blocking.ts:73`:
   placebo ≈ 0, subset estimates agree in sign),
4. writes candidates as PREMISES, not as active edges.

**The refutation gate is not optional.** With 4.9M odds snapshots, a naive
lagged sweep will find spurious edges in market data — which is a
near-random-walk by construction. **The repo already has the right guard;
it just has to be the gate in front of every discovered edge.**

**The 8 `ENABLED = false` modules stay dark until refutation is the gate.**
Enabling discovery without refutation would manufacture edges.

---

## INV-11 — Residual mining for missing causal factors

**Problem.** The mandate wants "after settlement, residuals are searched for
missing causal factors; any discovered factor is staged as a new premise or
chain candidate."

**Design.** A read-only job over the residual store.

- **New file:** `scripts/ops/mine-residuals.mjs`.
- **Consumes:** `lit.residual` (72 rows today, audit branch) +
  `pick_signal_snapshots` (4,542, measured) for the game's full feature
  vector.
- **The computation:** `unexplained = residual − Σ(premise contributions)`.
  If `unexplained` is systematically non-zero AND correlates with an
  unmodeled signal key, that key is a **missing causal factor**.
- **Output:** a staged premise candidate with a proposed producer. **NOT an
  active signal.** The repo's rule — a source with no producer is dark — is
  the same rule that keeps the 21 DARK evaluators honest, applied to
  invention.

**This is how the engine "invents new reasoning paths automatically when
data appears"** — and it obeys the honesty rule while doing it.

---

## INV-12 — Make the wire classifier measurable

**Problem.** `classifySignal` (`apps/web/lib/news/wire-store.ts:23`)
decides whether an RSS item is an injury report, a coach report, a role
change, a suspension, a trade, or a weather note. **Its precision is
unmeasured.** With 104 feeds polling every 10 minutes, a classifier that is
70% precise injects 30% noise into the real-time spine.

**Design.**
- A labelled sample: N items per class, hand-labelled against the wire's
  own `signal_type` taxonomy.
- A measured precision/recall per class, published in a doc and asserted by
  a test.
- A `classifyConfidence` field so low-confidence classifications route to
  shadow rather than active.

**Related, and the same pattern:** the trust-signals intake is 225 rows,
**one** source handle, 100% injury, 100% `shadow: true`,
`calibration_state: UNCALIBRATED`, `extraction_confidence: 0.0`. The
pipeline is built (23 modules in `intelligence/trust-signals/`); the
*breadth* is missing, not the mechanism. **Requirement: more source handles
and more signal types, with the calibration state left honest until it is
earned.**

---

## Ranked

| # | Proposal | Changes a published number? | Cost | Confidence in the measurement |
|---|---|---|---|---|
| 1 | INV-01 per-signal re-query | no | low | high — built and measured |
| 2 | INV-02 reasoning service route | no | low | high — absence measured |
| 3 | INV-03 trace refresh (G1) | no | low | high |
| 4 | INV-07 counterfactual trace | no | low | high — data structures measured |
| 5 | INV-09 corpus expansion | no | low | high |
| 6 | INV-06 settlement→belief | **yes (weight 0 → earned)** | medium | medium — 72 residuals is not a trend |
| 7 | INV-12 classifier measurement | no | low | high |
| 8 | INV-04 DARK adapters (20) | **yes (20 signals start voting)** | medium | high — data measured |
| 9 | INV-10 temporal discovery | no (proposals only) | medium | high — data measured |
| 10 | INV-11 residual mining | no (proposals only) | medium | medium |
| 11 | INV-05 X/Twitter producer | no | medium | medium — external dependency |
| 12 | INV-08 do-calculus on L3 chains | **yes** | high | low — needs the numeric bridge |

**Sequencing rule.** INV-06 before INV-04 (a settlement loop must exist
before 20 signals start voting). INV-02 before INV-03 (the engine must be
reachable before it can be re-run). INV-07 before INV-10 (refutation
before discovery). INV-12 before INV-05 (measure the classifier before
multiplying its input).
