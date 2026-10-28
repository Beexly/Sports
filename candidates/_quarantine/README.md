# QUARANTINE — Placeholder Candidate Artifacts (moved 2026-10-27 19:25 CT)

**These files are NOT a valid seal chain. Do not cite them as sealed. Do not commit them as sealed.**

Moved here from `candidates/` on 2026-10-27 during the approved resolution order. The live seal
record (`candidates/sealed-center.json`) deliberately stayed in `candidates/` because
`scripts/feeds/delta_telemetry.py` resolves the active seal from that exact path at runtime.

---

## What is in this directory

| File | sha256 | What it is |
|---|---|---|
| `2026-10-25-week7-candidate.json` | `76e0c93a5adb292d7e37f6932bac1f1bddd40d151d68e7496e6a004d3c45907b` | Pre-seal candidate baseline. `parent_seal_hash` is sequential hex. |
| `2026-10-27-week8-candidate.json` | `79c58dd81f85e08a1641c2a68e84dff9c1ebcbb79b62f3aa5546902e8f78733b` | Later candidate. Differs from week 7 by **one added key** (`injury_pass_2026-10-26`). |

## Why they are not a valid seal chain — verified, not assumed

1. **`parent_seal_hash` is fabricated.** Both files carry
   `faab2827c4e9b8a1d2f3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5` — 64 characters of
   *sequential hex*, not a SHA-256 digest over any payload. A real parent link would not read
   `c4e9 b8a1 d2f3 e4f5 …`.
2. **The week-8 file is not a byte copy of week 7.** An earlier claim called it a byte copy; the
   diff shows week 8 adds one key (`injury_pass_2026-10-26`). The files have different digests
   (see table). The "byte copy" description is corrected here.
3. **Tau contradicts the seal center.** Both candidates carry `params.tau = 0.001`. The live seal
   center carries `tau = 0.42`. Two tau values coexist on this tree; neither is mutated here.
   (An earlier summary said the candidates carry `tau: null` — that is also wrong; they carry
   `0.001` inside `params`.)
4. **Neither file was ever tracked by git.** `git status` reports `?? candidates/`; the artifacts
   were never committed and therefore never established as a seal lineage in the repository.

## Operational consequence (documented, not hidden)

`packages/prediction-engine/src/gse-pre-seal/candidate-baseline.ts` resolves
`CANDIDATE_PATH = candidates/2026-10-25-week7-candidate.json`. With the file moved,
`loadCandidate()` now returns `null` and the next operator write recreates a candidate at the
original path. That is the intended "an absent file fails loudly" behaviour — a placeholder that
silently passes for a seal is worse than no file at all.

`packages/prediction-engine/src/gse-pre-seal/run_week7_injury_operator.py:140` emits a report
string pointing at the old path. That string is now stale. It is a display string only; no read
occurs on that line.

## Superseded duplicate set

`candidates/_QUARANTINE_PLACEHOLDER_20261027_185538/` holds byte-identical copies of these two
files (sha256 confirmed equal) from an earlier 18:55 pass. Its README has been marked SUPERSEDED.
It is retained rather than deleted so the earlier pass's audit trail survives.

## Provenance

- Moved: 2026-10-27 19:25 CT
- Pre-move location: `candidates/`
- Post-move location: `candidates/_quarantine/`
- Live seal file left in place: `candidates/sealed-center.json` (sha256 `249698c1d7948b977ac2de5778dc78c9d6654faa67e113bdea171268ffd154ae`, merkle `23245bcb…`, tau `0.42`)

---

## REGENERATION — real ratings, real parent link (2026-10-27, after quarantine)

The quarantined files above are untouched. A **fresh candidate** was regenerated at the live path
`candidates/2026-10-25-week7-candidate.json` by fixing three defects in
`packages/prediction-engine/src/gse-pre-seal/verify_engine.py`.

### Defects fixed

1. **Fabricated parent link.** `run_all_tests()` defaulted `parent_hash` to the 64-character
   sequential hex `faab2827c4e9…` whenever no prior candidate existed — which is exactly the state
   after quarantine. It now reads the merkle from `candidates/sealed-center.json` and refuses to
   write if that merkle is missing or not 64 hex. A prior candidate whose `parent_seal_hash` does
   not match the active seal now raises `SealBrokenError` instead of being silently re-stamped.

2. **Divergent lambda iteration (the source of `tau = 0.001`).** The estimator iterated
   `lambda = sigma^2/tau^2` to a fixed point. That iteration diverges for this model: as lambda
   grows the penalised ratings shrink, which shrinks `var(raw)`, which floors `tau^2` at `1e-6`,
   which grows lambda further. It reported "converged" while every rating was exactly `0.0`.
   Replaced with a single lightly-penalised fit (`lam=2`) followed by one method-of-moments pass.

3. **Sampling-variance correction divided by `n` instead of `n^2`.** `rss` is a sum over `n` games,
   so the variance of a team's estimated mean is `rss/n^2`, not `rss/n`. The old divisor subtracted
   the full game-level variance (~137.8) from the between-team variance (~28.7), driving `tau^2`
   negative and collapsing every shrinkage weight to zero.

### Verified result

| Field | Quarantined placeholder | Regenerated |
|---|---|---|
| `parent_seal_hash` | `faab2827c4e9…` (sequential hex) | `23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b` |
| `params.tau` | `0.001` (1e-6 floor) | `4.6607` (estimated) |
| `params.sigma` | `4.7737` | `11.7394` |
| `ratings` | 26 teams at `-0.0`, `n = 1` | 32 teams, `-7.2723 … +10.0961`, `n = 19–23` |
| `weights` | all `0.0` | `0.7497 … 0.7838` |

Fit window: 318 settled games — the 2025 season (285 games) plus 2026 weeks 1–3 (33 games), read
from `data/gse-dataset/games.jsonl`. This is a documented carryover prior, not a cross-season state
model. All eight verification gates in `verify_engine.py` report PASS, and two consecutive runs
produce the identical final candidate hash `f7f05ccc…` (deterministic).

### The tau "contradiction" is a name collision, not a defect

`params.tau` in a candidate is the **partial-pooling dispersion** of team ratings — estimated by
method of moments from the ratings fit. The seal center's `tau = 0.42` is the **coach risk
parameter** recovered from fourth-down decisions in `coach-sim/locked-projection.ts` and sealed at
Tuesday 04:00 CT. Two different quantities share the name. They are not required to be equal, and
neither may be mutated to match the other:

- The coach tau is protected by `assertTauSealed()` and re-derived from the mindset hash.
- The pooling tau is an estimate that changes when the ratings fit changes.

Anyone comparing the two numbers should read this paragraph first.

### Still open

- **Week 8 candidate cannot be built yet.** Injuries and snap counts top out at week 7 in this
  checkout, and there is no week-8 slate in `artifacts/slate/`. Advancing the seal week is a
  governance action (it changes what the active seal means), not a code change — a human call.
- **`candidate_id` / `week` remain `2026-10-25-week7` / `2026-W44`.** The engine hardcodes them to
  the active seal week. Relabelling to week 8 without advancing the seal would misstate lineage.

