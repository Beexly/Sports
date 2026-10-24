# Recon Integration — what the three agents added, and what it corrected

**Measured:** 2026-10-20 · **Audited ref:** `origin/main` @ `4fa5330f4`
**Provenance:** three read-only recon agents ran against the same worktree.
**Every claim below was re-verified in this session before being recorded** —
where an agent's claim was wrong, that is stated explicitly.

---

## 1. Corrections to my own work

### 1.1 The zero-importer sweep was wrong three times. It is now right.

The sweep went through four versions. Each bug was found by spot-checking
against hand-verified ground truth, not by inspection.

| Version | Reported | Bug | Found by |
|---|---|---|---|
| v1 | 2,697 | regex matched only relative import specs; missed every path alias | implausible count |
| v2 | 1,929 | missed Python `from . import X` (module-as-import) | **recon agent flagged `adversary.py` and `run_game.py` as zero-importer when both are imported** |
| v3 | 1,803 | `intelligence/trust/tests/test_trust.py` counted as a production consumer (test files in a `tests/` DIRECTORY, not named `*.test.*`) | my own spot check |
| **v4 (current)** | **2,174 zero / 888 package-internal / 1,187 externally consumed** | basename collision: `intelligence/trust/` vs `apps/web/lib/trust.ts` vs `trust-claims.ts` | my own spot check |

**The v4 fix added a third tier**, which is the metric that actually matters:

| Tier | Count | Meaning |
|---|---|---|
| `ZERO_IMPORTER` | 2,174 | nothing imports it at all, not even its own package's `__init__.py` |
| `PACKAGE_INTERNAL_ONLY` | 888 | imported only by a sibling in its own package; **nothing outside the package imports it** |
| `EXTERNALLY_CONSUMED` | 1,187 | imported by at least one file outside its own package |

**Why the third tier matters.** `intelligence/trust/evidence_guard.py` is
imported by `intelligence/trust/__init__.py:40` — so a naive
"has an importer" test says it is wired. It is not: `__init__.py` is itself
imported by nothing outside `intelligence/trust/`. The tiered metric says
what the audit needs to say.

**Spot checks, all hand-verified against ground truth:**

| Module | Tier | Ground truth |
|---|---|---|
| `intelligence/trust/evidence_guard.py` | PACKAGE_INTERNAL | only `intelligence/trust/tests/test_trust.py` imports it |
| `intelligence/trust/proofledger.py` | PACKAGE_INTERNAL | only its own test + `intelligence/tests/e2e/*` (tests) |
| `intelligence/reasoning/adversary.py` | PACKAGE_INTERNAL | `intelligence/reasoning/engine.py:19` and `levels.py:18` import it — both in the same package |
| `intelligence/reasoning_engine/run_game.py` | PACKAGE_INTERNAL | `emit_slate_board.py:32`, `emit_trace.py:11` — same package |
| `packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts` | ZERO | confirmed |
| `packages/prediction-engine/src/causal/dual-likelihood-ci.ts` | ZERO | confirmed |
| `packages/prediction-engine/src/2602-23233v1-...-counterfactual-combine-a-causal.ts` | ZERO | confirmed (the do-calculus engine) |

**What this changes.** The `intelligence/trust/` finding survives — those
modules are still unwired — but the correct statement is
"package-internal only", not "zero importers". And the 888-file
package-internal tier is a *new* class of finding the earlier version could
not see: a whole package that is internally coherent and externally
invisible.

### 1.2 "20 of 21 DARK evaluators need only an adapter" was wrong. It is 5.

My first census judged each evaluator by whether its declared
`dataDependencies` *named* a table that exists. But the declared names are
**source-product** names (`nfl_pbp`, `nfl_charting`), not table names — and
the play-level tables those products would populate **do not exist**:
no `model Play`, no `model Drive`, no penalty column, no `Player.birthDate`,
no venue lat/lon.

**Corrected: 5 need an adapter, 18 need a producer that does not exist.**
The corrected census is `reconciliation/dark_sources_census_corrected.json`
and the rewritten `fix_plan.md`. The full reasoning is in `fix_plan.md` §0.

### 1.3 `runInterventionTest` is not do-calculus

The recon agent was right and I named it too generously. What
`packages/prediction-engine/src/literature/literature-retrieval.ts:479-540`
implements is a **truncated mean difference on the same variable** — it
compares residuals under strong vs weak activation of the *same* premise.
It is not a Pearl estimand: there is no treatment/control variable pair, no
adjustment set, no identification strategy.

**The name should change.** `runInterventionTest` → something like
`runActivationContrastTest`. The honest description is in
`causal_inference_methods.md` §2.1, and the doc now says so explicitly.

---

## 2. New findings the agents added that I did not have

### 2.1 The Python mind CANNOT return a probability — by construction

`intelligence/reasoning_engine/run_game.py:357-361`:

```python
"pick": None,
"confidence": None,
"probability_before_calibration": None,
"probability_after_calibration": None,
```

**The L1–L5 engine's output type has no probability slot.** The chain, the
adversary verdict, the checklist, the depth — all produced, all serialized
— and the published number is hardcoded `None`.

This is a stronger statement than "the engine is unwired." It says the
engine was never designed to emit one.

### 2.2 The engine reasons about a FIXTURE, not the game being emitted

`intelligence/reasoning_engine/run_game.py:343` calls
`analyze(card_request(), reg, ...)`, and `card_request()`
(`intelligence/tests/helpers.py:24-31`) returns a **static** CLE/PIT
week-4 four-leg pressure-funnel card:

```python
def card_request() -> AnalysisRequest:
    return AnalysisRequest(
        game=fixture_game(),
        question="should we bet the pressure-funnel card?",
        exposure=Exposure.CARD,
        requested_depth=ReasoningDepth.L1,
        legs=funnel_legs(),
    )
```

`home`/`away`/`week` only steer the L1 market priors
(`run_game.py:338`). **So the causal chain the engine builds is not about
the game it emits.**

This is the deepest finding in the batch. It means "wire the reasoning
engine into the publish path" is not a wiring task — the engine has no
per-game input path yet. The `providers` registry exists
(`ProviderRegistry(qb, coaching, trust, ol)`), and the chain builder does
read provider data (`pipeline.py:85` takes `providers`), but the **request**
is the fixture.

**The correct first task is therefore: make `run_game.py` build a real
`AnalysisRequest` from a real game.** Until then, an ops route that calls it
would return the same week-4 card every time.

### 2.3 The only signal→trueProb seam is structurally inert

`packages/ingestion-pipeline/src/continuous-signal-tilt.ts:59-164` is the
**only** place a signal moves a probability. Measured:

- `ctx.env` comes from `envWithStoredSignals` (`generate-signal-slate.ts:604`),
  which bridges **exactly four** weather keys
  (`stored-signal-env-bridge.ts:24-37`).
- `grep -c homeSign signal-registry-definitions.ts` = **0** — no ACTIVE
  registry signal carries the required sign.
- Only one of the 23 extensions declares `homeSign`
  (`signal-registry-extensions.ts:210`).
- `continuous-signal-tilt.ts:100-104` refuses any CONTINUOUS_VALUE signal
  without a sign of exactly `1`/`-1`.
- Therefore `votes.length === 0` and the function returns `applied: false`
  (`:123-131`).

**So the engine's real-time signal contribution to published numbers is
exactly zero — not because there are no signals, but because the one seam
that would carry them refuses every one.**

That reframes the mandate's "everything gets ingested" law: ingestion is
the easy part. The vote path is closed.

### 2.4 `mindByGameId` is read but never written

`packages/ingestion-pipeline/src/generate-signal-slate.ts:583`:
```ts
const mindDecision = mintAfterMind(opts.mindByGameId?.get(game.id));
```
`mindByGameId` is declared at `packages/ingestion-pipeline/src/signal-slate-options.ts:30`
and **nothing populates it**. The cron passes only `{logPrefix, trace}`
(`apps/web/app/api/cron/generate-signal-slate/route.ts:22-25`).

So `mintAfterMind` always receives `undefined` and always passes
(`mint-gate.ts:30` — "absent verdict passes"). **The mind gate is a
no-op.** And the gate's own comment says it has "no probability slot"
(`mint-gate.ts:10`) — so even when wired it would only withhold, never
contribute.

### 2.5 Two signals are ACTIVE but can never fire — worse than DARK

`packages/ingestion-pipeline/src/signal-registry-definitions.ts:880-888`
(`nfl_wr1_out_redistribution`) is `activationStatus: "ACTIVE"`, weight
**0.14**, and its `evaluate` is `return null` unconditionally.
`nfl_referee_crew_tendencies` (`:815-818`) is the same shape.

Because they are ACTIVE they carry no `blockedReason`, so
`buildMissingContextEvidenceFromRegistry` (`:923-926`, filters
`!== "ACTIVE"`) **never reports them missing**.

**The officials surface the brief describes as "marked dark for honesty
failures" is not dark — it is an ACTIVE registration that cannot produce a
value.** That is a worse honesty failure than being dark, and it is
invisible to the missing-context audit.

### 2.6 The trust-signals intake is a relabelled parquet

225 rows, and every one has `signal_origin: "news_wire"`,
`source_handle: "@mysportsupdate"`, and a `source_url` pointing at
`nflverse-data/releases/download/injuries/...`. `quote_text` is null on
225/225. `extraction_confidence` is `0.0` on 225/225. `schema_version` is
`1.0.0` while `intelligence/trust-signals/extractors/pipeline.py` declares
`SCHEMA_VERSION = "1.1.0"`, and `extractor_name` is null.

**The store's contents were not written by the code in this repo.** The
producer exists (`extractors/pipeline.py:181` `IntakeStore.save_signal`) but
its only callers are tests.

### 2.7 The Kaggle claim, resolved

The brief says 429 Kaggle datasets are structured as premises. Measured:

- `429` is `len()` of a scraped metadata JSON (`ref`/`title`/`size`/
  `downloadCount`), unreferenced by any code but its own scraper.
- There is **exactly 1** Kaggle-derived code module: `MOD-KAGGLE-001`
  (`packages/prediction-engine/src/reasoning/literature-registries.ts:222`).
- Repo-wide: 451 distinct `kaggle.com/datasets/...` URLs, 429 in that one
  file, 22 strays.
- `data/gse-dataset/bridge-premises.jsonl` is misnamed — 285 model
  predictions, 0 Kaggle refs, 0 premise fields.

### 2.8 The best estimator in the repo is dead twice over

`packages/prediction-engine/src/research/dml-qb-out.ts:287` — 5-fold
double-machine-learning with a placebo test and Rosenbaum sensitivity
analysis. Its only bridge (`research-causal-bridge.ts`) has zero
importers.

**Rosenbaum sensitivity analysis is the exact tool the mandate's "adversary
challenges the chain" requirement needs**, and it exists, and it runs on
nothing.

### 2.9 The Python L3 layer is not deployed at all

No FastAPI/uvicorn, no TypeScript bridge, not in `docker/` or `vercel.json`.
58 tests, zero live path. The only TS→Python call in the repo is
`packages/data-ingestion/src/nflverse/ingest.ts:272` — spawning Python to
fetch a parquet, not the mind.

### 2.10 The mind's own primitives are orphaned

`intelligence/reasoning/primitives/` (`positions.py`, `scheme.py`,
`schemes.py`) — **0 importers.** Its own doctrine (`positions.py:8`) says
"the analyst layer SELECTS and COMPOSES entries" — and the analyst does not
import it.

### 2.11 A false absence claim contradicts a shipped cron

`packages/data-ingestion/src/db-loaders.ts:688-699` asserts something is
permanent-absent ("This 0 is permanent") while a live cron writes it.
Not a signal, but a false claim in a loader.

### 2.12 The narrative-contract family is LIVE on a 10^6 unit error

`data/reasoning/narrative-contract-week3-2026-09-27.json` emits
`home_roster_mean_apy_millions: 5.311087280701753e-06` — $5.31 mean APY per
player, with a home-minus-away gap of -$0.13. A 0.05/$M slope applied to a
1e-7 gap contributes nothing, so `signed: 0.0416` is effectively the
intercept — **the same value for every game.**
`engine-weights.ts:24` still says `role: "dark"`, which is the more honest
of the two registry rows. **HONESTY-FAILURE-STILL-PRESENT.**

---

## 3. What this changes in the deliverables

| Document | Change |
|---|---|
| `fix_plan.md` | **Rewritten.** 20→5 adapter candidates. Adds the three gates (producer / status / sign), the ACTIVE-but-null signals, the relabelled trust intake, the 4 deletion candidates, and the corrected officials/weather/narrative verdicts. |
| `dark_sources_census_corrected.json` | New. Per-evaluator verdict + what is missing, at the right granularity. |
| `zero_importer_sweep.json` | **Re-measured** with the three-tier metric and the collision guard. |
| `unwired_honesty_machinery.md` | Tier language corrected: `intelligence/trust/` is PACKAGE-INTERNAL, not zero-importer. |
| `reasoning_engine_continuous_loop_spec.md` | Adds the "no probability slot" and "reasons about a fixture" findings. |
| `causal_inference_methods.md` | Names `runInterventionTest` accurately (a truncated mean difference, not do-calculus) and adds the DML/Rosenbaum finding. |
| `final_executive_summary.md` | Coverage score revised; the top-5 actions reordered. |
| `staged_improvements/` | Stage 3 rewritten for the corrected 5; a new stage for the signal-vote path (sign + env bridge). |

---

## 4. The revised top 5

The batch changed the order. The previous #1 was "give the reasoning engine
a service entry point." **That is now wrong** — an ops route would return
the same week-4 fixture card every time.

| # | Action | Why |
|---|---|---|
| 1 | **Make `run_game.py` build a real `AnalysisRequest` from a real game** | Until the engine reasons about the game being emitted, nothing downstream of it is meaningful. Today it reasons about a fixture (`run_game.py:343`). |
| 2 | **Open the signal vote path** — `metadata.homeSign` on every CONTINUOUS_VALUE signal, plus a general env bridge | `applyContinuousSignalTilt` is the only seam where a signal moves `trueProb` and it currently votes zero times. Ingestion is the easy part; the vote path is closed. |
| 3 | **Close the settlement→belief loop** | Without residuals, a do-calculus estimand has nothing to be fit to and no premise can earn promotion. Residual store built; promotion gate unrun. |
| 4 | **Wire the 5 adapter-eligible DARK evaluators** | The only dark signals whose data already exists. Must land after #2 or they still cannot vote. |
| 5 | **Implement the counterfactual trace evaluator** | Cheapest causal win; no new estimator, because `BreakingCondition` is already machine-checkable against `observed_values`. |

**The through-line.** Every finding in this batch is the same shape: the
mechanism exists, the data or the code to drive it exists, and the last
mile — a sign, a bridge, a request builder, a loop — does not. The repo's
engineering quality is high; its connection discipline is the weak link.
That is the finding of the whole mandate.

---

## 5. Honest limits of this integration

- **The three agents' full outputs were not read end to end.** The middle
  of each summary was truncated in the delivery; I read the head and tail
  and the parts that changed a claim. The full text is at
  `C:\Users\Garrett\AppData\Local\hermes\cache\delegation\subagent-summary-*-20261020_015843_*.txt`
  and the per-agent scratch docs under
  `C:\Users\Garrett\AppData\Local\hermes\cache\scratch\`.
- **The agent's "38 causal methods catalogued" count was not independently
  re-derived.** I verified the specific claims that changed a conclusion
  (the do-calculus modules, the `ENABLED=false` set, the Kaggle count) but
  not the full inventory.
- **The agent's own sub-agent was wrong once and it said so** — it reported
  that `packages/prediction-engine/src/narrative-contract.ts` and
  `intelligence/truth/SPEC.md` do not exist, and re-derived Part D itself.
  That is the right behaviour and I have used only its verified citations.
- **My sweep has now been wrong three times.** The v4 numbers are
  spot-checked against six hand-verified modules, but a fourth bug is
  possible. **Do not use `zero_importer_sweep.json` as a reachability
  source** — use it as a triage list and verify anything load-bearing.
- **The `continuous-signal-tilt` inertness finding means the coverage
  number "how many live events now trigger literature evaluation" (200,
  measured) is about the LITERATURE path only.** The path that would let a
  signal move a published probability is closed.
