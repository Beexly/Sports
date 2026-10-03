# GSE Intelligence Slice 0 Surface Audit

Generated: 2026-06-23T21:46:09Z

Scope: mandatory Day-0 gate for the GSE Intelligence Core package before any feature code. This audit verifies branch reality, referenced files and flags, and read-only nflverse data access against the actual checkout at `C:\Users\Garrett\Sports-intelligence-core`.

## Precedence Applied

1. `GSE_INTEL_00_RIGOR_PASS.md` is authoritative.
2. Corrected execution briefs (`GSE_CODER_KICKOFF.md`, `GSE_CODEX_AUTONOMOUS_EXECUTION.md`) override companion design docs.
3. Companion docs (`GSE_INTEL_01-05`, advisory, atlas) supply design depth only where they do not conflict.

Most important override for future slices: market anchoring must conserve physical football units (`passYds`, `rushYds`, `teamTD`) and derive fantasy points afterward. Do not implement a fantasy-points-sum-to-scoreboard invariant.

## Branch Gate

| Check | Result | Evidence | Decision |
|---|---:|---|---|
| Authoritative app repo | exists | `git rev-parse --show-toplevel` => `C:/Users/Garrett/Sports` in the primary checkout; new isolated worktree root is `C:/Users/Garrett/Sports-intelligence-core` | Use isolated worktree to avoid the dirty rescue branch. |
| Required remote branch | exists | `git ls-remote --heads origin claude/sweet-fermi-sk9gws` => `62ffca63ca58d4540fc9e0fbdfb70a44aa17e70c` | Confirmed. |
| Work branch for Codex | exists | `codex/intelligence-core` created from `origin/claude/sweet-fermi-sk9gws` at `62ffca63` | Build here; do not touch the dirty `C:\Users\Garrett\Sports` worktree. |
| Recent branch context | exists | `62ffca63 Phase 2: weekly-projection loader - compose cleared building blocks (gated)` | Existing weekly projection work is present but remains gated. |

## Data Access Gate

All probes used byte-range reads only. No full nflverse data file was downloaded into the repo.

| Dataset | Required by package | URL | Probe result | Status |
|---|---|---|---|---|
| Regular-season play-by-play | 1999+ historical backtest substrate | `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_1999.csv` | HTTP `206`, `bytes 0-2047/65543024`, 2048 bytes read | confirmed reachable |
| ESPN QBR weekly | advanced metric family, 2006+ | `https://github.com/nflverse/nflverse-data/releases/download/espn_data/qbr_week_level.csv` | HTTP `206`, `bytes 0-2047/2443597`, 2048 bytes read | confirmed reachable |
| Weekly player stats | player-week fantasy/usage substrate | `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats.csv.gz` | HTTP `206`, `bytes 0-2047/7211865`, 2048 bytes read | confirmed reachable |

Environment caveat: plain Node `fetch` failed TLS verification locally with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; `node --use-system-ca` succeeded. Future data scripts that fetch nflverse from this host should either run with system CAs or use the app runtime path that already handles the environment.

## Package Docs

| Referenced doc | Repo status | External source status | Action |
|---|---:|---:|---|
| `GSE_CODER_KICKOFF.md` | absent in repo | exists at `C:\Users\Garrett\Documents\Claude\Projects\AI Sports` | Treat as external operating brief for this branch. |
| `GSE_CODEX_AUTONOMOUS_EXECUTION.md` | absent in repo | exists | Treat as external operating brief for this branch. |
| `GSE_INTEL_00_RIGOR_PASS.md` | absent in repo | exists | Authoritative correction layer. |
| `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md` | absent in repo | exists | Companion thesis. |
| `GSE_INTEL_01_CORE_ARCHITECTURE.md` | absent in repo | exists | Companion design. |
| `GSE_INTEL_02_FORECASTING_FRONTIER.md` | absent in repo | exists | Companion design. |
| `GSE_INTEL_03_FLYWHEEL_LADDER_COST.md` | absent in repo | exists | Companion design; A1 detail source. |
| `GSE_INTEL_04_80DAY_SEQUENCE.md` | absent in repo | exists | Companion sequencing source. |
| `GSE_INTEL_05_FRONTIER_ADDENDUM.md` | absent in repo | exists | Companion frontier source. |
| `GSE_EXECUTIVE_ADVISORY_PASS.md` | absent in repo | exists | Strategy review context. |
| `GSE_FORECASTING_METHODOLOGY_ATLAS.md` | absent in repo | exists | Method catalogue context, corrected by INTEL_00 fantasy-native additions. |
| `GSE_INTERNAL_MASTER.md` | not found under `docs`, `research`, or `specs` in this worktree | not provided locally in this package | Not a Slice-0 blocker; package says it can be supplied later. |

Repo has nearby but non-equivalent GSE docs under `docs/ai/airwave/`. Do not treat those as replacements for the new GSE Intelligence package.

## Referenced Files And Flags

| Reference | Current state | Build interpretation |
|---|---:|---|
| `docs/SURFACE_AUDIT.md` | absent before Slice 0 | created by this slice. |
| `docs/EXECUTION_LEDGER.md` | absent before Slice 0 | created by this slice for watch/handoff. |
| `docs/DECISIONS_TO_RATIFY.md` | absent before Slice 0 | created by this slice for owner/human gates. |
| `docs/CLAUDE_HANDOFF.md` | absent | generate only when backlog is exhausted, not during Slice 0. |
| `packages/prediction-engine/src` | exists | Preferred home for pure reducer/model logic unless a stronger local convention appears. |
| `packages/db/prisma/schema.prisma` | exists | Schema surface exists. New DB structures must be generated/scaffolded, not applied to shared/prod DB. |
| `LadderEvent` model/type | absent | Scaffold as new in A1. |
| `reduceLadder()` | absent | Scaffold as new in A1. |
| `RUNG_REQUIREMENTS` | absent | Scaffold as new in A1 with separate fantasy and betting tracks. |
| `GameSettledEvent` | absent | Scaffold as new in A2. |
| Replay/historical backtest harness | absent (`packages/prediction-engine/src/replay-harness.ts`, `apps/web/lib/replay/harness.ts` both absent) | Scaffold as new immediately after A, before estimator weighting/conformal/frontier slices. |
| `apps/web/lib/calibration/compute.ts` | exists | Extend later for self-publishing calibration data; Codex may create DRAFT only, never IMPLEMENTED. |
| `apps/web/lib/tracker/clv.ts` | exists | Extend/read for betting-track proof only. |
| `packages/prediction-engine/src/probability-calibration.ts` | exists | Has calibration utilities; adaptive conformal layer is still absent. |
| `apps/web/lib/metrics/coverage-map.ts` | exists | Reuse for feature/coverage-map rows. |
| `apps/web/lib/metrics/opponent-adjusted-epa.ts` | exists | Reuse for cleared EPA feature layer. |
| `apps/web/lib/metrics/regression-engine.ts` | absent | Scaffold as new for C1. |
| `apps/web/lib/projections/weekly-model.ts` | exists | Gated v1 weekly fantasy model; useful reference, but not the corrected INTEL_00 market-anchor implementation. |
| `apps/web/lib/projections/weekly-model-loader.ts` | exists | Loader for cleared weekly model inputs; remains gated. |
| `lib/projections/correlation.ts` | absent | Do not use root `lib` path; no existing convention. |
| `apps/web/lib/projections/correlation.ts` | absent | Candidate for app-facing correlation surface. |
| `packages/prediction-engine/src/projections/correlation.ts` | absent | Candidate for pure Gaussian-copula engine if a projections folder is introduced. |
| `packages/data-ingestion/src/nflverse-source.ts` | exists | Catalog confirms PBP since 1999 and ESPN QBR since 2006; use this instead of ad hoc URL construction. |
| `apps/web/lib/nflverse/pbp.ts` | exists | Read-only PBP loader with projection columns/OOM guard. |
| `apps/web/lib/trends/nflverse-readiness.ts` | exists | Existing readiness probe; keeps publication flags false. |
| `docs/calibration-proposals/FROZEN.md` | exists | Baseline model-freeze anchor. |
| `docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md` | exists | Human-audited calibration history; do not infer permission for new IMPLEMENTED proposals. |
| `scripts/guardrails/trust-gate.mjs` | exists | Per-slice gate. |
| `scripts/guardrails/model-freeze.mjs` | exists | Per-slice gate; prevents unsupported model version drift. |
| `scripts/guardrails/draft-only.mjs` | exists | Per-slice gate; keeps outbound content draft-only. |
| `PUBLIC_PICKS_ENABLED` | exists in docs/tests/config surfaces | Human/operator gate. Codex must not flip. |
| `PERFORMANCE_STATS_ENABLED` | exists in docs/tests/config surfaces | Human/operator gate. Codex must not flip. |
| `OUTCOME_LEARNING_ENABLED` | exists in docs/worker surfaces | Human/operator gate. Codex must not flip. |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | exists in readiness/config surfaces | Human/operator gate. Codex must not flip. |
| `PROJECTIONS_PROVIDER` | exists in `apps/web/instrumentation.ts` and tests | Human/data gate. Codex must not flip. |
| `canPublishProjections` | exists as hard `false` in multiple fantasy/nflverse/projection surfaces | Leave false until human-gated evidence path clears. |
| `MODEL_VERSION` | exists in `packages/prediction-engine/src/constants.ts` and guardrail docs | Do not bump autonomously. |
| `STRIPE_FANTASY_MONTHLY_PRICE_ID`, `STRIPE_FANTASY_ANNUAL_PRICE_ID` | referenced in fantasy launch docs | Owner/infra gate. Codex must not create or edit secrets. |

## Slice-0 Conclusion

GO for A1 after this Slice 0 commit.

Constraints for the next implementation slice:

- Build A1 in shadow mode only.
- Keep env/operator flags authoritative.
- If touching Prisma schema, generate/scaffold only and record ratification; do not apply migrations to shared/prod DB.
- Add a failing-first invariant test before production code.
- Encode separate fantasy and betting proof tracks.
- Do not reuse the existing weekly fantasy model as the corrected market-anchor math; it remains a gated v1 reference until B3 is rebuilt with yards/TD conservation.
