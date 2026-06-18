# Python Research Sidecar — Owner-Gated, Offline-First Plan

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Proposal. No dependency is added. No code, schema, deps, or gate changes are made here.
**Scope:** Define an offline research sidecar that follows the existing `statking_*.py` precedent — pure batch, JSON in / JSON out, never in the request path — to let heavy causal / Bayesian / quant methods *propose* improvements without any of them ever touching production. Outputs re-enter the platform only through the existing `CalibrationProposal` gate.

---

## 0. The one sentence

The platform should be able to *test* whether a causal-effect estimate, a Bayesian hierarchical book model, or a conformal fragility interval would improve calibration — **before** anyone installs the library that computes it — by running it offline against JSON exports of data we already hold, and surfacing only a ranked, human-reviewable hypothesis list that the owner can choose to escalate to a `CalibrationProposal`.

## 1. The precedent we are copying (and must not break)

`scripts/statking_*.py` (24 scripts, invoked via `npm run statking:*`) establish a working, accepted pattern in this repo:

- **Pure standard library.** Spot-checked `statking_backtest.py` and `statking_player_comps.py` — the only imports are `pathlib` and `json`. No `requirements.txt`, no `pyproject.toml`, no `Pipfile` anywhere in the repo.
- **JSON in / JSON out.** They read `data/statking/*.json` and write back JSON/YAML reports under `data/statking/`.
- **Offline / batch.** Invoked manually or by a job, never from an HTTP handler.
- **Not in the request path.** Nothing in `apps/web` or `packages/*` imports these scripts. They are a side process.

The research sidecar inherits *all four* properties verbatim. The **only** difference is that the sidecar is explicitly allowed to grow heavier dependencies — **but only after owner approval**, and even then it stays offline.

## 2. What is NOT added (today)

**No dependency is added by this document.** No `requirements.txt`, no `pyproject.toml`, no virtualenv, no `pip install`. The heavy libraries named below are **candidates**, not installs. They are the menu, not the order. Each remains uninstalled until the owner approves a specific experiment and the specific library it needs.

The repo's standing rule holds: DoWhy, EconML, causal-learn, pgmpy, Pyro, PyMC, PGMax, darts, neuralforecast, qlib, open_spiel, PettingZoo, FinRL, nevergrad, OR-Tools, river, alibi-detect, MAPIE, kloppy are **not installed and must not be added without owner approval.**

A phase-0 sidecar can run *today* on the statking footprint (stdlib `json` + `statistics`) and produce real diagnostics. The heavy libraries only buy precision and rigor on top of that floor — they are a phase-2+ ask.

## 3. The experiments (each mapped to one candidate library)

Each experiment answers a question the live engine cannot answer today, produces a falsifiable artifact, and names the single library that would run it. None of these run in production. None of them auto-change anything.

| # | Question the live engine can't answer today | Method | Candidate library | Output it produces |
|---|---|---|---|---|
| E1 | Does an injury actually *cause* a pace shift that moves a prop, or is it correlation? | Causal-effect estimation (back-door / front-door identification, refutation tests) | **DoWhy** (identification + refutation), **EconML** (heterogeneous treatment effect) | `causal-injury-pace-prop.json` — estimated effect, CI, refutation pass/fail per market |
| E2 | Are some books systematically sharper per-sport/per-market, and how much should we shrink a thin sample toward the league mean? | Bayesian hierarchical model (team × book × market partial pooling) | **PyMC** or **Pyro** | `hierarchical-book-team.json` — posterior shrinkage factors, per-book reliability with credible intervals |
| E3 | For a given pick, how *fragile* is the edge — what's the honest prediction interval, not a point estimate? | Conformal prediction intervals | **MAPIE** | `conformal-fragility.json` — per-pick lower/upper coverage band at a stated miscoverage rate |
| E4 | Where will this line close, given its movement so far? (turns CLV from hindsight into a forecast) | Probabilistic line-movement forecasting | **darts** / **neuralforecast** (probabilistic backends) | `line-move-forecast.json` — predicted close distribution per open market, backtested vs realized close |
| E5 | If multiple sharp actors and the book interact, does our no-bet gate create alpha or just avoid noise? | Multi-agent market simulation | **PettingZoo** / **open_spiel** | `market-sim-nobet-value.json` — simulated EV of bet vs no-bet under varied actor mixes |
| E6 | What publish-confidence threshold maximizes settled ROI *out of sample* — without overfitting a hand-tuned cutoff? | Gradient-free / black-box threshold optimization | **nevergrad** (or **OR-Tools** for constrained variants) | `threshold-sweep.json` — held-out ROI surface over `MIN_PUBLISH_CONFIDENCE` candidates with overfit warnings |
| E7 | Which *types* of edge survive over time vs decay (edge-type survival)? | Survival / hazard analysis on edge-type cohorts | stdlib first (Kaplan–Meier is implementable in pure Python); **river** only if online updating is later wanted | `edge-type-survival.json` — survival curves per edge type, decay half-life estimates |
| E8 | Is our settled-result distribution drifting from the regime the model was fit on? | Drift / distribution-shift detection | **alibi-detect** | `regime-drift.json` — drift score over time windows, flag when a refit is warranted |

Phase-0 (stdlib-only, runnable today) covers a meaningful slice of E6 and E7 — a held-out threshold sweep and a Kaplan–Meier-style edge-type survival table are both expressible in `json` + `statistics`. Everything else is the heavy-library upgrade path, gated.

## 4. Exact I/O contract

### Inputs (JSON exports of data we already hold)

The sidecar **never** reads the database directly. A thin, existing-pattern export step (a `reality:export` npm script, TS, read-only Prisma select) writes point-in-time JSON snapshots, and the Python reads only those files. Proposed input files under `data/reality-engine/inputs/`:

| File | Source (existing, cited) | Contents |
|---|---|---|
| `picks-settled.json` | `Pick` rows via read-only select; settlement from `packages/prediction-engine/src/settlement.ts` | pick id, sport, market, model P, confidence, `tier`, `result`, `settledAt`, `modelVersion` |
| `clv.json` | `Pick.clvValue` / `clvVerdict` / `clvLockLine` / `clvLockPrice` / `clvCloseLine` (`clv.ts`, `clv-capture.ts`) | per-pick CLV value + BEAT/MATCHED/LOST verdict + lock/close lines |
| `edge.json` | `edge-engine.ts` (`assessEdge`) factor-trail output | per-pick SPEAK/LEAN/PASS, shrunk edge, expected CLV |
| `odds-batches.json` | `Odds` batches captured per game (the same data `deriveClosingSnapshotFromOdds` reads) | timestamped line/price snapshots per market (for E4 line-movement) |
| `calibration-state.json` | `probability-calibration.ts` / `calibration-apply.ts` | current eligible sample count (16/100), `rawEce`, current `MODEL_VERSION` (`v5.0.0`) |

These are **read-only exports**. They are point-in-time, like a `RightsSnapshot` — the sidecar does not mutate them.

### Outputs (research artifacts only)

Written under `data/reality-engine/outputs/` (machine-readable) and summarized under `reports/reality-engine/research-runs/` (human-readable), mirroring how statking splits `data/statking/*` from its report files:

| File | Contents | Who consumes it |
|---|---|---|
| `ranked-hypotheses.json` | Every experiment's finding, ranked by estimated calibration/ROI lift, each tagged `needs_more_data` or `actionable`, each with a CI | The owner, during review |
| `edge-type-survival.json` | Per-edge-type survival/decay stats (E7) | Feeds the edge-type reliability discussion (see sibling `edge-type-taxonomy-v1.md`) |
| `calibration-candidate.json` | A proposed forecast→outcome mapping with **held-out** `calibratedEce` and `rawEce` — formatted to drop straight into a `docs/calibration-proposals/` entry | The `CalibrationProposal` gate |
| `run-summary.md` | Plain-English digest of the run: what was tested, what the data said, what it could not yet say | The owner |

## 5. Proof that production stays unaffected

The sidecar satisfies every statking invariant, by construction:

1. **Zero imports into the request path.** No file in `apps/web` or `packages/*` imports anything Python. The dependency arrow points one way: TS export → JSON file → Python reads file. Python writes JSON → human reads JSON. There is no reverse edge.
2. **No runtime coupling.** The Next.js app, the workers, and `packages/prediction-engine` build and run identically whether the sidecar exists or not. Deleting `data/reality-engine/` and the scripts changes no public behavior.
3. **npm-scripted, batch-only.** Invocation mirrors statking: `reality:export` (TS, writes inputs), then `reality:research` (Python, writes outputs), then `reality:report` (digest). Never called from an HTTP handler, a webhook, or a cron-driven pick generation path.
4. **No live confidence touch.** Nothing the sidecar produces is read by `scoring.ts`. Confidence today is the weighted heuristic sum in `packages/prediction-engine/src/scoring.ts`; the sidecar cannot and does not write into it.
5. **Model-freeze guardrail untouched.** `scripts/guardrails/model-freeze.mjs` + `docs/calibration-proposals/FROZEN.md` (`frozen: v5.0.0`) keep gating `MODEL_VERSION`. The sidecar produces a *candidate*; it cannot bump the version.

## 6. The approval gate and the re-entry path

The sidecar is **one-directional and inert by default.** Its findings are advisory until a human acts. The escalation path is deliberately the *existing* one, not a new one:

```
data we already hold
   → reality:export (TS, read-only)        → data/reality-engine/inputs/*.json
   → reality:research (Python, OFFLINE)     → data/reality-engine/outputs/*.json
   → owner reviews ranked-hypotheses.json   (HUMAN GATE #1: approve an experiment + its library)
   → calibration-candidate.json             → docs/calibration-proposals/<slug>.md
   → CalibrationProposal review             (HUMAN GATE #2: held-out calibratedEce ≤ rawEce required)
   → IF accepted: MODEL_VERSION bump + FROZEN.md / seed.ts audit-trail update
```

Two hard gates, both human:

- **Gate #1 — library/experiment approval.** Installing any heavy library (section 2) requires explicit owner sign-off on the *specific experiment* that needs it. Phase 0 runs stdlib-only and needs no install.
- **Gate #2 — calibration acceptance.** A research artifact can only change live confidence by becoming a `CalibrationProposal` that clears the existing bar: held-out `calibratedEce ≤ rawEce`, `MODEL_VERSION` bump, and an audit-trail entry per `FROZEN.md`. **Never an automatic flip.** A research win is a *proposal*, not a deploy.

## 7. Leverage-preservation note

This sidecar is the *mechanism* for the owner's standing rule: a data-blocked idea is not a "no," it is a documented leverage point with an unlock path. Today calibration is data-blocked at **16/100 eligible** with `OUTCOME_LEARNING_ENABLED=false`. The sidecar does not pretend that sample is bigger than it is — experiments that cannot yet conclude are emitted as `needs_more_data` in `ranked-hypotheses.json`, **each carrying the exact unlock**: which field, from which source, at what cadence, and the metric it would move. That keeps every deferred idea alive and re-runnable the moment the sample crosses its threshold, instead of being silently dropped.
