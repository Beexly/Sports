# The GSE All-Knowing Reasoning Engine (GSE-X) — Agent Brief

*Written 2026-10-02, updated with the GSE-X system directive. Hand this to any agent that needs to understand or work on the engine.*

## What it is

The Galaxy Sports Edge Universal Reasoning Engine (GSE-X) is an NFL prediction and intelligence system that reasons about games the way a sharp analyst does — quarterback play, coaching schemes and tendencies, offensive line matchups, injuries, weather, rest and age effects — but with every claim backed by measured data, calibrated uncertainty, and a refusal to invent what it cannot verify. Its ambition is to be the most accurate and best-calibrated sports prediction engine in the world. Its method is total ingestion: every signal, on-field and off-field, wired in, weighted, calibrated, and tested — with anything uncalibrated running in shadow, never published.

**GSE-X is not a simple predictive model.** It is a universal reasoning engine designed to ingest, harmonize, and reason through high-dimensional signal topologies across sports analytics, game theory, behavioral bias, network dynamics, and telemetry.

### Architectural invariants

- **Signals as fuel, metrics as diagnostics.** Calibration curves, Brier scores, ECE, and Kelly fractions are inputs the engine consumes — never optimization targets or scoreboards. The engine wins by reasoning more completely across causal factors than the market, not by curve-fitting scalar proxies.
- **Strict order of operations.** All domain signals must be fully wired end-to-end, weighted with documented mathematical rationale, and validated in reasoning traces BEFORE any historical calibration map or post-processing seam is applied. Runtime calibration fitting on active picks is strictly prohibited.
- **Honest refusal and epistemic gating.** When signals show severe missingness, uncalibrated drift, or sample depletion (e.g., n < 40 in empirical matrices), the engine fails closed into explicit `DataGapError`, `INVALID`, or abstention states. Hallucinated probabilities or default-0.5 fallbacks are catastrophic failures.

## The governing sequence

Every piece of work on the engine follows one non-negotiable order:

**research → wire → weight → calibrate → test → polish → audit → improve → retest**

You do not score calibration on old-model picks as a measure of progress — history never changes, so of course the numbers don't. Calibration judgment happens only after the engine is fully wired, weighted, and calibrated. You do not skip steps, resequence them, or declare victory early.

## Core doctrines (violate none of these)

- **Never fake it.** Never manufacture calibration, confidence, provenance, physiological percentages, or test coverage. If a number isn't measured, it doesn't exist.
- **INGEST-AND-LEARN.** Nothing is "dead" until tested, cited, and confirmed. Untested items are QUEUED FOR EVALUATION, never skipped. A restrictive license means research/learn-only — you learn the method and re-implement it as GSE's own, you don't throw it away and you don't copy it.
- **Shadow before publish.** Uncalibrated signals compute in shadow with weight zero. Nothing reaches a published pick until it is wired, weighted, and calibrated.
- **Abstain honestly.** When the evidence isn't there, the engine says DATA-GAP and returns INVALID rather than manufacturing a pick. A refused pick is a correct behavior, not a failure.
- **Two-host reality.** The builders work across two machines (a Linux VM and a Windows host) with different workspace contents. A file found on one is never assumed present on the other. The git branch is the transfer mechanism.
- **Completion language.** Never say "complete" without naming which host, which roots, which branch SHA, what was excluded, and what was tested. "Found," "read," "verified," "implemented," "invoked," and "tested" are separate states.

## Architecture

```
Data (frozen vintage) → Providers → Signals (47-registry) → Wires → Reasoning engine → Gates → Traces → (shadow | publish)
```

- **Data.** Frozen nflverse play-by-play vintages: full seasons 2022–2025 plus 2026 weeks 1–3, stored as parquet with SHA-256 manifests (`intelligence/coaching/data/`). Training is walk-forward only: train 2022–2024, validate on all of 2025, live-check on 2026 weeks 1–3, refresh weekly. Contaminated and clean fits are never blended.
- **Providers** (`intelligence/providers/`). One per data domain: offensive line, injuries (with a hard gate — no injury data before the publication deadline means a `DataGapError`, never a guess), weather priors, coaching tendencies, tau estimates.
- **Signals** (`intelligence/signals/registry.json`). 47 registered signals. Each carries a `wired_state`: `yes`, `partial`, or `no` with a blocked reason. The registry is regenerated from the current branch HEAD — it is an inventory with honest states, not a wish list.
- **Wires.** The 20-wire program connects signals to the reasoning context with calibration rows. Rule: *a wired signal without a calibration row is not wired.* 8 of 20 are done (tau→DataContext, held-out checker, manifest enforcer, paired audit, two-host ledger, injury gate, and two more pending verification).
- **Reasoning engine** (`intelligence/reasoning_engine/`). Produces game traces — structured reasoning chains over the wired signals (example: PIT@CLE week 4: 237 Cleveland plays analyzed, pass EPA +11.91, rush EPA −21.279, both offensive lines checked, both tau cells served — and `analyze()` still returned INVALID because quarterback-behavior and coaching-scheme signals were DATA-GAP. No pick was manufactured).
- **Gates** (`intelligence/gates/`). Held-out checker (train/eval overlap is blocked), manifest enforcer (every artifact declares SHA-256 hashes or it doesn't load), calibration rows (each wired signal declares its fitted state — including honest rows like "descriptive, no map fitted"), injury-publication gate.
- **Traces.** Every reasoning run emits a full trace. Chain gaps are never swallowed — a gap in the chain is an explicit node, not a silent skip.

## The honesty machinery (what makes it different)

Most prediction systems fail by inventing confidence. This engine is built to not do that:

1. **Tau is stamped.** The served coaching-tau table is labeled everywhere it appears: *point fit — not pre-kickoff*. A walk-forward replacement is being built and validated; the served table swaps only if the clean fit clears the gate.
2. **Calibration rows are honest.** A signal's calibration row may say "descriptive, no map fitted" — that is a valid, complete row. Faking a fit to turn a row green is the one unforgivable act.
3. **Refusals are calibrated too.** Abstention thresholds are tuned on historical data, not set by vibes.
4. **Temporal safety.** No leakage: as-of fencing on every data read, a held-out gate on every train/eval split, and a temporal-contamination gate that fails loudly.

## Verified state (2026-10-02)

- 8 of 20 wires landed and verified on the branch; the engine code is merged to `main` (PRs #1012, #1013).
- Three real week-4 reasoning traces exist (NE@BUF, NYJ@CHI, PIT@CLE).
- The 47-signal registry is regenerated with honest states (46 `no`, 1 `partial`).
- First calibration rows are in — including valid negative results.
- **Known gap:** a published pick still does not pass through the reasoning traces. Merging the engine did not put it on the pick path. Closing that gap is the current frontier — not more wiring for its own sake.

## Paper implementations (verified against measured data, 2026-10-02)

Three paper-derived components are implemented and their numbers verified against the committed data files. They live on the `motif/gse-intelligence-build-2026-10-02` branch (commits below) — **not yet on `main`**:

- **Repo rating engine** (commit `8afbc63a5`; data file labels it 1704.00197v3, but per the coding agent that paper is an in-game logistic — the repo implements a *different* least-squares margin model, do not conflate). Least-squares: Expected Home Margin = Home Edge + Home Rating − Away Rating, subject to ΣRating = 0. **Verified:** home edge 2.1778 (prompt says 2.178 ✓), 1,187 pre-2026-W4 games ✓. Held-out MAE 11.348 (2024–2025) is from the directive text, NOT independently verified. Probability via Φ(margin/14), 14 unfitted. Pre-season win-total blends withheld.
- **Granular 4th-down matrix** (commit `9633e4e4e`, paper 1601.04302). **Verified:** 3,464 go plays ✓, 1,866 converted (0.539 measured — explicitly NOT the paper's 0.779). Replaces flat rates with empirical yards-to-go cells; low-sample cells raise `DataGapError`, never backfilled.
- **Dynamic multi-week rating engine** (commit `1758cfa0d`). Requires explicit END GAME markers in play-by-play; generates Week 5 expected home margins (e.g., TB@DAL +4.03, PHI@JAX −2.04, DET@ARI −7.41). Table 1 coefficients and paper normal approximations withheld.

Note: the directive calls these "branches" — they are commit SHAs on the intelligence branch. The work is real and measured; only the label was loose.

## Public vs. private

The public website shows ONLY projections and rankings. All data, metrics, signals, methodology, film/CV internals, and Next Gen Stats material are internal reasoning fuel — never exposed, never discussed publicly. Props and film lanes are private, shadow-only, weight zero until validated. Pick'em is parked.

## How to work on it

1. Read the repo's `AGENTS.md` and `docs/DOCTRINES.md` first — they govern.
2. Sweep the local workspace before building — finish or push what you find, nothing forgotten.
3. Real engine data over mocks. More tests, more structure.
4. Every consequential result ships with receipts: files changed, test counts, what was exercised, log location, remote SHA.
5. Land everything on the remote. If it's not on the remote, it didn't happen.
6. When in doubt, ask: is this wired, weighted, and calibrated? If not, it's shadow work — label it so.
