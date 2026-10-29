# Pass 2 — reasoning, gates, and calibration comparison

## Finding

The requested direction is reversed in the scoped files: **the ZIP has no source files in these directories that are absent from `C:\Users\Garrett\Sports-wt-intel`, and it contains no unique wiring or refusal that the live worktree lacks.** The ZIP has 65 scoped source files; all are present in the worktree. Four additional files exist only in the worktree, and six shared files differ. All 40 files under `packages/prediction-engine/src/calibration` match between the two trees.

The six differing files are `intelligence/gates/claims.json`, `intelligence/reasoning_engine/emit_three.py`, `run_game.py`, and the three game traces (`ne-at-buf-w4.json`, `nyj-at-chi-w4.json`, `pit-at-cle-w4.json`). The four worktree-only files are `emit_slate.py`, `seal.py`, `test_seal.py`, and `traces/week4-2026-slate.json`.

In those deltas, the **worktree adds** rather than loses protections and wiring:

- `run_game.py` now records rest-day measurements or named gaps, loads an expected-margin card when its historical results are available, marks its weight withheld, and seals the trace. `emit_three.py` adds the same margin-only evidence and seals each trace.
- The changed traces explicitly label the paper-derived normal approximation as not a pick, withhold its weight, record absent market-strength and charting inputs as gaps, and mark calibration as unapplied. No probability from these traces is a publishable pick.
- `claims.json` adds claims for the paper-corpus load and abstention on missing market-strength/shell-mix inputs. The other worktree-only files supply trace sealing, a seal test, and a slate emitter/trace.

## What the ZIP already gets right—and a toy-module-only pass would miss

### Reasoning is a fact-and-gap trace with a refusal boundary

The snapshot’s `reasoning_engine/run_game.py` gathers EPA facets, offensive-line state, tau, and optional weather, then calls the reasoning façade. Missing sources become named gaps rather than fabricated zeros. It returns no pick, confidence, or pre/post-calibration probability, and states that measured facts are not a probability. The README likewise describes `INVALID` as a refusal. That is a useful end-to-end contract around the analytical modules, not just isolated feature functions.

### The gates distinguish “wired” from “claimed”

`intelligence/gates/claim_matrix.py` requires a `wired` claim to have its code, test, and data paths present. Other statuses—`partial`, `measured`, `gap`, and `refused`—are explicit and are not silently promoted to wired. Its tests verify that a missing path fails a wired claim while an explicitly declared gap does not need invented files.

`heldout_check.py` rejects train/evaluation year overlap and a contaminated manifest with “Discard. Do not average.” The phase-wire tests also exercise refusal before injury information is published and preserve unresolved contradictions instead of resolving them by assertion. These checks make provenance, timing, and absence part of the behavior under test.

### Calibration includes an abstention/withhold path, not just recalibration formulas

The ZIP’s calibration subtree is unchanged in the live worktree. In it, `build-calibration-history.ts` maps only settled WIN/LOSS rows, chooses the stored probability basis in a defined order, and emits an unreadable probability when no basis is available so the screen can withhold. `pathwise-defect.ts` treats malformed history or detected stratum/path/tail blind spots as a withhold; missing or empty history is explicitly no vote. The mapper and blind-spot tests cover those distinctions. In the live worktree, `scoring.ts` calls this veto in spread, total, and moneyline scoring paths.

There is also a separate calibration gate: `calibration-gates.ts` fits isotonic on training inputs, evaluates on holdout inputs, and returns original holdout probabilities when Brier does not improve; its tests cover both rejection and acceptance. The directory also contains explicitly research-only or unwired kernels (for example, `skeptic-overlay.ts` and `calibration-horserace.ts`), so their presence is not evidence that those methods are active in publishing.

## Bottom line

The ZIP does not contain a missing wiring/refusal to recover into the live branch. It already demonstrates the value the earlier toy-module pass missed: measured inputs flow into a trace that preserves gaps and refuses unsupported outputs; claim, timing, and holdout gates encode fail conditions; and calibration has a tested selective-withhold path. The live tree extends the trace boundary with sealing and additional paper-index/gap metadata. Keep paper-derived approximations and calibration outputs separate from published picks unless an independent, valid receipt and publication path exists; this comparison supplies no basis for publishing any such probability.

## Scope and method

Compared source files from `C:\Users\Garrett\Downloads\Sports-main (8).zip` only under `intelligence/reasoning_engine`, `intelligence/gates`, and `packages/prediction-engine/src/calibration` against the matching paths in `C:\Users\Garrett\Sports-wt-intel`. The ZIP paths are rooted at `Sports-main/`. The comparison found no ZIP-only scoped files; no tests were run for this read-only comparison.
