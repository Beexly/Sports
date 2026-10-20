# Continuous Reasoning Loop Spec

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20
**Companion:** `reconciliation/causal_inference_methods.md` (what exists),
`reconciliation/realtime_ingestion_requirements.md` (what arrives),
`reconciliation/fix_plan.md` (what is dark).

---

## 0. The one finding that reframes the mandate

The mandate says: *"wire it so that every new real-time signal can trigger
chain reconstruction and re-evaluation, not only full-slate batch runs."*

**Measured: the chain reconstruction is not on the publish path at all.**

| Fact | Evidence |
|---|---|
| The L1–L5 engine is invoked by `analyze()` | `intelligence/reasoning_engine/run_game.py:18` — `from integration.api import analyze` |
| `analyze()` reaches the L3 chain builder | `intelligence/integration/api.py:27` — `from .pipeline import TOP_PASS_RUSH_CUTOFF, build_causal_chains` |
| The chain builder is real and produces the brief's own acceptance test | `intelligence/integration/pipeline.py:85` `build_causal_chains` → `:131` `CausalLink(cause="... missing N interior OL starter(s)", mechanism="... compensates with quick game", outcome="... pressure rate projects below season avg")` |
| **But nothing outside `intelligence/` calls it** | `grep -rn 'run_game\|integration.api import analyze' --include='*.py' intelligence/ scripts/ apps/` → only `intelligence/reasoning_engine/{emit_slate_board.py:32, emit_trace.py:11}`, `intelligence/trust-signals/prove_honest_trust.py:3` (a proof script), and `intelligence/reasoning/primitives/scheme.py` (a string literal, not a call) |
| **And there is no HTTP route for it** | `grep -rn 'intelligence' apps/web/app/api/` → no reasoning/chain/trace route. The web app has no entry point to the reasoning engine at all. |
| **And the published numbers never consult it** | `packages/prediction-engine/src/scoring.ts` imports nothing from `intelligence/`. `packages/ingestion-pipeline/src/process-sport.ts` imports nothing from `intelligence/`. |

**So the situation is not "the continuous loop is wired to the batch path."
The continuous loop is wired to nothing.** The published `trueProb` comes
from `scoring.ts` + `edge-engine.ts` + `ranking-prob.ts`, and the entire
L1–L5 causal reasoning engine — including the adversary review, the
breaking conditions, the thesis bundling, the overconfidence scoring — is
**parallel to** the publish path, not upstream of it.

**This changes what "wire it" means.** The first task is not to make the
continuous loop *continuous*. It is to make the L1–L5 engine *reachable at
all*, and to decide honestly whether it should reach `trueProb` or whether
it should remain an advisory trace.

There is a live precedent for the second option: the repo already has
`publishablePick: false` written into five places
(`packages/ingestion-pipeline/src/gse-score-bridge.ts:37` — *"GSE action score
is an internal gate, not a pick. publishablePick is false for every kernel
decision, including PLAY and LEAN."`). The prior audit's GAP-13 flagged this
as a doctrine conflict. **It is also the cheapest honest answer.**

---

## 1. The chain, hop by hop, with the measured state

| # | Hop | Where | State |
|---|---|---|---|
| 1 | Signal lands | `apps/web/lib/ops/signal-ledger-writer.ts:375` `writeSignalCandidates` | **REACHED** — hourly cron + wire cron (10 min) |
| 2 | Signal is classified (social/wire) | `apps/web/lib/news/wire-store.ts:162` `toWireReport` | **REACHED** — 104 feeds, `*/10 * * * *` |
| 3 | Signal is written to `signals` | `db.signal.upsert`, `signal-ledger-writer.ts:411` | **REACHED** — 126,445 rows, 32 keys |
| 4 | Signal is alerted | `apps/web/lib/watchlist/wire-alert-hook.ts` `dispatchWireReportAlerts` | **REACHED** |
| 5 | **Literature retrieval on the signal** | `apps/web/lib/literature/literature-event-bridge.ts` → `retrieveForEvent` | **BUILT (audit branch)** — measured 200 events, 5,650 activations, p50 78 ms, HNSW confirmed |
| 6 | Signal → perception → specialist claims | `intelligence/reasoning/primitives/`, `specialists.py` | **ORPHAN** — no caller outside `intelligence/` |
| 7 | Claims → L1 → L2 → L3 chains | `intelligence/integration/pipeline.py:43` `build_l1`, `:52` `build_l2_correlations`, `:85` `build_causal_chains` | **ORPHAN** — `api.py:27` imports it; `api.py` has no external caller |
| 8 | Depth escalation L1→L5 | `intelligence/reasoning/escalation.py:50` `escalate`, `:63` `compute_depth` | **ORPHAN** (same chain) |
| 9 | **Adversary review** | `intelligence/reasoning/adversary.py:357` `adversary_review` | **ORPHAN** — `:477` `killed_legs` has no consumer |
| 10 | Breaking-condition check | `adversary.py:190` `_check_breaking_conditions` | **ORPHAN** |
| 11 | Corpus premise evaluation | `packages/prediction-engine/src/reasoning/corpus-evaluator.ts:937` `evaluateFullCorpus` | **PARTIAL** — called by `situational-engine.ts:155`, which is called by `dynamic-context-builder.ts:177`, which IS on the publish path |
| 12 | Mind corpus evaluation | `mind-reasoning.ts:1059` `evaluateMindReasoning` | **PARTIAL** — same path |
| 13 | Arxiv bridge evaluation | `arxiv-reasoning-bridge.ts` `evaluateArxivCorpus` | **ORPHAN** — 13 premises, zero importers |
| 14 | Situational trace | `packages/prediction-engine/src/reasoning/situational-engine.ts:105` `interpretSituation` | **REACHED** — `dynamic-context-builder.ts:177` |
| 15 | Trace → `factorBreakdown` | `process-sport.ts:1446-1470` | **REACHED** — but as DISPLAY metadata |
| 16 | **Corpus shift → `trueProb`** | `ranking-prob.ts:56-58` seam | **BUILT, WEIGHT 0** (audit branch) — `corpusWeight` defaults to 0 |
| 17 | `trueProb` → published pick | `scoring.ts` → `edge-engine.ts:223` → `process-sport.ts:1585` | **REACHED** |
| 18 | **Adversary → published number** | — | **MISSING** — no path |
| 19 | **Settlement → belief** | — | **MISSING on main** — `settlement.ts` has zero `weight` references |
| 20 | **Residual → edge strength** | — | **BUILT (audit branch)** — `lit.residual` (72 rows), `applyResidualFeedback` |

**The chain has 20 hops. 6 of them are ORPHAN or MISSING, and the 4 that
matter most for a live number (16, 18, 19, 20) are exactly the ones that
were built on the audit branch or do not exist.**

---

## 2. Answers to the seven questions the mandate asks

**A. What is the entry point for a brand-new signal at runtime?**
`apps/web/lib/ops/signal-ledger-writer.ts:375` `writeSignalCandidates`,
called from `apps/web/app/api/cron/signal-ledger-write/route.ts` (hourly)
and indirectly from the 10-minute wire cron via `wire-store.ts`. On the
audit branch, the literature bridge hangs off the same write.

**B. Is there any path where a mid-week signal triggers chain reconstruction
or premise re-evaluation?**
- Premise re-evaluation: **YES on the audit branch** (the literature bridge),
  at hourly cadence rather than per-signal.
- Chain reconstruction: **NO.** `build_causal_chains` is called only from
  `intelligence/integration/api.py`, which is called only from
  `intelligence/reasoning_engine/run_game.py`, which is called only from
  `emit_slate_board.py` / `emit_trace.py` — scripts, not a service, and not
  on the publish path.

**C. Where does the adversary's output land?**
**Nowhere.** `adversary_review` (`intelligence/reasoning/adversary.py:357`)
returns an `AdversaryReport`; `killed_legs` (`:477`) extracts the killed
legs. `grep -rn 'adversary_review\|killed_legs' --include='*.py'` finds no
consumer outside `intelligence/reasoning/` and its tests. **The adversary
challenges chains that then cannot affect any number, and its verdict is
discarded.**

**D. Where does the literature premise evaluation land, and does it reach
trueProb?**
It lands in `pick.factorBreakdown.situationalReading`
(`process-sport.ts:1454`) and on an internal ops route
(`apps/web/app/api/ops/ranked-picks/route.ts:179`). On `main` it does **not**
reach `trueProb` — the `corpusWeight` seam
(`packages/prediction-engine/src/ranking-prob.ts:56-58`) has no production
caller. **On the audit branch the seam is closed but the weight is 0**, and
0 is the honest value until the promotion gate runs.

**E. Does anything compute a residual after settlement and feed it back?**
**Not on `main`.** `packages/prediction-engine/src/settlement.ts` contains no
reference to `weight`. `packages/ingestion-pipeline/src/post-settlement-work.ts`
is a work-queue (enqueue / claim / retry / mark-done / cancel), not a
belief-update path. **On the audit branch**, `lit.residual` (72 rows from
real settled outcomes) and `lit.premise_score` exist, and
`apps/web/lib/literature/literature-residual-bridge.ts` writes them from
settlement — gated on `GSE_LITERATURE_BRIDGE=1` and non-blocking.

**F. Is there an L3 causal chain CONSTRUCTOR?**
**Yes — three of them, in production files (not just tests):**
- `intelligence/integration/pipeline.py:85` `build_causal_chains` — builds
  from provider data (OL state + scheme fingerprint + pass-rush rank). This
  is the brief's own acceptance test.
- `intelligence/integration/api.py:656` — builds chains from API data.
- `intelligence/engines/llm_specialists.py:96` — builds chains from LLM
  specialist output.

**G. What is the smallest missing link that would let a new signal force a
re-reason?**
Two candidates, and the answer depends on whether the L1–L5 engine is meant
to move numbers.

**G1 (if the reasoning engine stays advisory):** a **re-reason trigger** on
the signal write that re-runs the *literature* half and refreshes the
*stored* situational trace, without touching `trueProb`.
- **File:** `apps/web/lib/ops/signal-ledger-writer.ts` (after the write loop,
  ~`:455`).
- **Function:** `refreshSituationalTrace(signal)` — a new
  `apps/web/lib/literature/trace-refresh.ts`.
- **What it does:** on a qualifying signal (one whose pillar has activated
  premises), re-run `retrieveForEvent` (already built), and if the
  activations changed the belief, re-emit the trace via
  `intelligence/reasoning_engine/emit_trace.py` and persist it.
- **Cost:** one file, one call site, no number changes. **This is the
  smallest possible honest step.**

**G2 (if the reasoning engine must move `trueProb`):** a **numeric
contribution contract** — the engine must produce a number, and the number
must be bounded and gated.
- **File:** `packages/prediction-engine/src/reasoning/` — a new
  `situational-delta.ts` exporting `computeSituationalDelta(trace)`.
- **Contract:** the delta is bounded to ±X, gated on the adversary having
  survived, and — critically — **its weight is 0 until the same
  pre-registration that gates the corpus shift is run and passed.**
- **This is a founder decision, not an engineering task.** The repo's own
  law (`docs/calibration-proposals/FROZEN.md`, and the model-freeze guard)
  says so.

**Recommendation: G1 first, and make G2 a decision rather than a patch.**
G1 makes the loop real at no risk. G2 changes published numbers and needs
the owner's number, exactly as the `MODEL_VERSION` bump in
`packages/prediction-engine/src/scoring.ts` did.

---

## 3. The target architecture

```
                      ┌──────────────────────────────────────────┐
  real-time sources   │  104 RSS feeds (10 min) · odds (15 min)   │
                      │  prediction market (6 h) · NGS (weekly)  │
                      └───────────────┬──────────────────────────┘
                                      │  writes `signals`
                                      ▼
                      ┌──────────────────────────────────────────┐
  PERCEPTION          │  signal-ledger-writer.ts:375              │
                      │  wire-store.ts:162 classifySignal        │
                      └───────────────┬──────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
   ┌────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐
   │ LITERATURE (built) │  │ CAUSAL CHAIN (gap)  │  │ ADVERSARY (gap)    │
   │ retrieveForEvent   │  │ build_causal_chains │  │ adversary_review   │
   │ HNSW top-k         │  │ L1→L5 escalation    │  │ breaking conditions│
   │ 200 ev / 5,650 act │  │ ORPHAN from publish  │  │ ORPHAN from publish│
   │ p50 78ms           │  │                      │  │                    │
   └─────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘
             │                        │                       │
             └────────────────────────┼───────────────────────┘
                                      ▼
                      ┌──────────────────────────────────────────┐
  BELIEF              │  situational trace (observed_values +    │
                      │  activated premises + surviving chains)  │
                      └───────────────┬──────────────────────────┘
                                      │
                       ┌──────────────┴──────────────┐
                       ▼                             ▼
          ┌──────────────────────┐   ┌──────────────────────────┐
          │ TRUEPROB (current)    │   │ ADVERSARY VERDICT (gap)  │
          │ scoring.ts +          │   │ killed_legs() → ???      │
          │ edge-engine.ts        │   │                          │
          └──────────┬───────────┘   └──────────────────────────┘
                     ▼
          ┌──────────────────────┐        ┌────────────────────────┐
          │ published pick        │        │ SETTLEMENT → RESIDUAL  │
          │ picks table           │        │ (built: lit.residual)   │
          └──────────────────────┘        │ 72 rows, 8 edges       │
                                          └───────────┬────────────┘
                                                      ▼
                                          ┌────────────────────────┐
                                          │ premise_score / edges  │
                                          │ promotion (built)       │
                                          │ intervention (built)    │
                                          └────────────────────────┘
```

**The three gap blocks in that diagram are: CAUSAL CHAIN, ADVERSARY, and
ADVERSARY VERDICT.** The literature half, the belief store, the residual
half, and the promotion half are all built and measured.

---

## 4. The staged implementation, in order

| Stage | What | Files | Risk | Reversible? |
|---|---|---|---|---|
| **S1** | Move the literature bridge from the hourly cron to per-signal (inside `writeSignalCandidates`) | `apps/web/lib/ops/signal-ledger-writer.ts` | low | yes (env gate) |
| **S2** | **G1** — trace refresh on a qualifying signal | new `apps/web/lib/literature/trace-refresh.ts`; one call site | low | yes (env gate) |
| **S3** | Reachability: give the reasoning engine a service entry point | new `apps/web/app/api/ops/reasoning/route.ts` calling `intelligence/reasoning_engine/run_game.py` | medium — a new public-ish surface | yes (env gate) |
| **S4** | DARK adapter: `ctx.env` → DB for 20 evaluators | new `packages/ingestion-pipeline/src/context.builders/signal-context.ts`; 20 one-line evaluator edits | medium — 20 signals start voting | needs the kill-line discipline |
| **S5** | Residual mining job | new `scripts/ops/mine-residuals.mjs` over `lit.residual` + `pick_signal_snapshots` | low (read-only, proposes) | yes |
| **S6** | Counterfactual trace clone + adversary re-run | new `intelligence/reasoning/counterfactual.py` | low (advisory) | yes |
| **S7** | Do-calculus on L3 chains | new `packages/prediction-engine/src/literature/literature-do.ts` bridging `backdoorSet` + `adjustmentEstimand` | **HIGH** — changes numbers | needs an owner number |
| **S8** | Corpus expansion: index `corpus-index.jsonl` (1,251) + `arxiv-deep` ledgers (2,121 ids) | `scripts/literature/build-index.cjs` | low | yes |
| **S9** | X/Twitter producer | new cron + `workers/twitter-bot/x-client.js` wiring | medium — new external dependency | yes |

**S1–S3 and S5–S6 and S8–S9 change no published number.** They make the
loop real. S4 and S7 change numbers and need the owner.

---

## 5. The settlement loop, specified

The mandate: *"settlement residuals feed straight back into the graphs,
premise weights, and knowability scores"* and *"residuals update premise
weights, causal edge strengths, and knowability scores in the same cycle."*

**Built** (audit branch): `applyResidualFeedback` writes `lit.residual` and
recomputes `lit.premise_score.activation_score` by **Brier skill against the
0.25 uninformed baseline**, with a `MIN_SUPPORT = 5` floor so one lucky
graded premise cannot dominate.

**Not built:**
1. **Edge strength update.** `lit.causal_edge` has `effect_estimate` and
   `support_n` but nothing recomputes them from residuals. The
   `retireFailedEdges` function exists
   (`packages/prediction-engine/src/literature/literature-causal.ts`) but
   only retires edges whose test FAILED; it does not strengthen the ones
   that PASS.
2. **Knowability score.** No such field exists anywhere. It is a new
   concept: "how much of this outcome was knowable in advance?" The natural
   construction is `1 - mse_of_premise_residuals`, which is already
   computable from `lit.residual`.
3. **Chain-level residual.** Residuals are currently attached to *premises*,
   not to *causal links*. A link's residual would need the link's own
   predicted contribution — which requires the numeric bridge in §2 of
   `causal_inference_methods.md`.

**The honest ordering:** premises first (done), then edges, then chains.
Each step needs the previous one's numerics to be trustworthy. Promoting a
premise to an edge on 72 residuals over 2 games would be a fabricated
result — and the 8 promoted edges in the measured run are already at that
limit, which is why all 8 intervention tests came back INCONCLUSIVE.

---

## 6. The gate that every new mechanism must pass

The repo's existing discipline, restated as the acceptance test for
anything this mandate stages:

1. **A signal with no producer stays dark.** (`signal-registry-extensions.ts:39`)
2. **A premise with no numeric claim is not gradeable.** (audit branch)
3. **A mechanism with no measured effect is not promoted.** The kill line
   is `signal-registry-extensions.ts:41-46`: `maxBrierScoreVsMarket 0.250`,
   `minSettledSample 100`, `maxDivergenceZScore 3.0`, `maxAgeMinutes 120`.
4. **A discovered causal edge must survive refutation.** `refutationSuite`
   (`2603-22620v2-chainreaction-causal-discovery-via-blocking.ts:73`):
   placebo estimate ≈ 0, subset estimates agree in sign.
5. **A do-calculus query with no identification strategy is refused.**
   `requireIdentified` (`2602-23233v1-the-counterfactual-combine-a-causal.ts:69`).
6. **A literature premise that never fires, or fails settlement, is demoted.**
7. **A published number needs a model-version decision.** `MODEL_VERSION`
   is frozen at `v5.3.0` (`packages/prediction-engine/src/constants.ts:31`).

**The last one is the binding constraint on this entire mandate.** Any change
that moves `trueProb` is a `MODEL_VERSION` change, which is a founder
decision by the repo's own law. That is why S1–S3, S5–S6, and S8–S9 are
staged as low-risk and S4 and S7 are staged as owner-decisions.

---

## 7. What this spec does NOT do

- It does not enable any of the 8 `ENABLED = false` causal/symreg modules.
  They should stay dark until `refutationSuite` is the gate in front of them.
- It does not propose a `MODEL_VERSION` bump.
- It does not move any published number.
- It does not claim the residual numbers are evidence. 72 residuals over 2
  games, 8 promotion-eligible premises, 8 INCONCLUSIVE tests.
- It does not implement the 20 DARK adapters. It specifies them
  (`fix_plan.md` §2) with the source table for each.
