# GSE DeepSeek Overnight Handoff v3 (Superpowers-compatible) — 2026-10-25

## Mission
Execute the plan at `C:/Users/Garrett/.hermes/plans/2026-10-25_181330-gse-unified-coach-brain-and-tuesday-lock-pipeline.md` and the defect specification at `C:/Users/Garrett/AppData/Local/hermes/cache/scratch/spec_756455.txt`.

Work only inside `C:/Users/Garrett/Sports` on branch `engine/public-baseline-2026-10-24`. Do not invent file contents or paper implementations. If a required file, function, or data source is missing, log the exact path and continue. Prefer quiet tool output (<500 chars per call). If the input ceiling is approached, run `/compact` and resume with the same short instruction.

## Superpowers bootstrap (if installed)
If the `obra/superpowers` plugin is available (`hermes plugins install obra/superpowers --enable`), begin by invoking the bootstrap:
```
skill_view("using-superpowers")
```
Then follow its workflow: brainstorming → writing-plans → test-driven-development → verification-before-completion. Use `delegate_task` for independent module implementations. If the plugin is not installed, ignore this section and proceed with the priority order below.

## Non-negotiable invariants
1. Coach mindset (`tau`, scheme priors, `coachMindsetHash`) is sealed at Tuesday 04:00 CT. Mid-week injury updates may change only execution weights via Sinkhorn target reallocation and EPA dropoff. They must never re-estimate or mutate `tau`.
2. `assertTauSealed(before, after)` must return true after every injury path.
3. No Sunday-morning hardcoded game lists or 2024 matchups. All slate data must come from Neon `gse-postgres` or the live schedule source.
4. `applyInjuryOverlay` must not be a no-op. It must apply the Sinkhorn + EPA delta while leaving the sealed hash and `tau` unchanged.

## Root causes already identified (do not re-discover)
- `locked-projection.ts`: `applyInjuryOverlay` currently returns the baseline spread/total/win-prob untouched (no-op stub).
- `call-sheet.ts`: forces `ticket = null` and has no isotonic calibration (+5.2 pt overconfidence).
- Sunday slate scripts hardcoded 2024 Week 7 matchups instead of reading the live 2026 schedule.
- Fragmented worktrees and silent multi-agent drift; keep all changes on the single target branch.

## Priority order

### 1. Core defect fixes (TDD required)
For each fix: write or update a failing test first, then implement, then verify.
- `packages/prediction-engine/src/reasoning/mind-reasoning.ts` lines 1146–1147: remove the hallucinated Navier-Stokes citation of arXiv:2401.16392. Wire the real modern HFA prior (~1.5–1.8 pts) and the post-2011 rest-differential decay (arXiv:2408.10867v1).
- `packages/prediction-engine/src/coach-sim/locked-projection.ts`: seal `coachMindsetHash` and `tau` to the Tuesday 04:00 CT baseline. Remove mutable fields (`injuryDropOff`, `new Date()`) from the hash. Implement a real `applyInjuryOverlay` that uses Sinkhorn reallocation + EPA dropoff and calls `assertTauSealed`.
- `packages/prediction-engine/src/public-baseline/call-sheet.ts`: add piecewise isotonic calibration and a contradiction gate. Stop forcing `ticket = null`. Emit priced tickets only when the gate passes.
- `scripts/generate-week7-master-slate-2026-10-25.ts`: resolve the Brandin Cooks OVER/UNDER contradiction. Replace any hardcoded 2024 matchups with a Neon query for the live 2026 schedule.

### 2. Create the P0 modules (TDD or clear stubs)
Create under `packages/prediction-engine/src/` (use any existing skeletons from prior sessions; otherwise implement only what the paper abstract and ledger support):
- `2609-33664-hmm-pass-blocking.ts` — frame-level blocker-rusher posteriors, adjusted plus-minus, pocket survival.
- `1807-09236-empirical-bayes-btl.ts` — Empirical Bayes shrinkage of BTL MLEs.
- `2309-00756-inverse-mdp-fourth-down.ts` — inverse-optimization MDP for coach `tau`. Must export `quantileValue`, `decisionResidual`, `recoverTau`, `assertTauSealed`. Wire so injury deltas cannot change the recovered `tau`.
- `2502-16313-snap-timing-multilevel.ts` — Bayesian multilevel location-scale model for pre-snap motion variance under named schemes.
- `2606-18512-causal-panel-forecasting.ts` — synthetic-control counterfactual for starter exit; layer on Sinkhorn reallocation.

Also create if listed in the spec and the math is available:
- `w7213966824-yac-momentum.ts`
- `w7128077825-motion-pressure.ts`
- W7204843381 injury prior table

Set `ENABLED = false` on every new module until the Tuesday seal and data pipelines are confirmed.

### 3. Replace or quarantine mislabeled stubs
For each file below, either implement the paper’s actual method or re-header it as a generic baseline so no caller can mistake it for the paper:
- `packages/data-ingestion/src/2601-14727v3-experiment-stats.ts`
- `packages/data-ingestion/src/2510-14723v1-team-rating.ts`
- `packages/data-ingestion/src/2507-06122-bayesian-update.ts` (Beta-Binomial → von Mises circular concentration)
- `packages/data-ingestion/src/2202-00583v1-team-ratings.ts`
- `packages/data-ingestion/src/2406-12084-nlp.ts`
- `packages/data-ingestion/src/2503-19355v2-tracklet-association.ts`
- `packages/data-ingestion/src/2506-02351v1-score-model.ts`
- `packages/prediction-engine/src/2511-07250v2-team-rating.ts` (Dynamic Bradley-Terry)
- and any remaining stubs listed in `spec_756455.txt`.

### 4. Wire disabled modules and ops cleanup
- Enable or correctly wire `2506-03057v1` and `2604-13861v2` only if they match their papers.
- Remove retired entries (z-ai/glm-5.3-flash) from `C:/Users/Garrett/AppData/Local/hermes/cron/jobs.json`.
- List the 19 stale git worktrees; do not delete them.

### 5. Verification and completion log
- Run existing tests for `call-sheet`, `locked-projection`, and the inverse-MDP module.
- Confirm `assertTauSealed` passes on a synthetic injury delta.
- Confirm the week-7 slate generator reads from Neon and contains no hardcoded 2024 matchups.
- Write a completion log to `C:/Users/Garrett/.hermes/plans/2026-10-25-overnight-completion.md` with three sections: Fixed, Still blocked (with exact path and reason), Not attempted.

## What you must not do
- Do not re-estimate or overwrite a sealed `tau`.
- Do not invent implementations for papers whose code is not sketched or whose math is not in the ledger.
- Do not push or open PRs.
- Do not delete worktrees or cron entries beyond the explicit retired model.
- If Neon is unavailable, skip slate generation and log the blocker.

## Starting command for Hermes
```
/new
Read C:/Users/Garrett/AppData/Local/hermes/cache/scratch/spec_756455.txt and C:/Users/Garrett/.hermes/plans/2026-10-25_181330-gse-unified-coach-brain-and-tuesday-lock-pipeline.md. Execute the defect fixes and module implementations in C:/Users/Garrett/Sports with quiet tool output. Follow the priority order, invariants, and Superpowers bootstrap (if available) in the handoff. Write a completion log when finished.
```
