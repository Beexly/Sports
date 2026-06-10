# GSE Coach/Scheme Data Model

Generated: 2026-06-09

## Implemented Shared Contracts

Added to packages/types/src/world-model.ts:

- CoachRole
- SchemeSide
- TendencyBias
- PlayCallSituation
- CoachStaffAssignment
- PlayCallSplit
- SchemeTendencyProfile
- classifyRunPassBias()
- validatePlayCallSplit()
- validateSchemeTendencyProfile()

These are storage-agnostic contracts. They can back fixtures, docs, Prisma models, API projections, cockpit panels, and future optimizer logic.

## Proposed Storage Tables

| Table | Purpose | Minimum fields |
| --- | --- | --- |
| coaches | Canonical coach identity | coach_id, display_name, aliases, active_status |
| coach_staff_assignments | Team/season role ledger | coach_id, team, season, role, title, start/end, source_id, confidence |
| coach_playcaller_episodes | Who actually called plays | coach_id, team, side, season_start, season_end, playcaller_confidence, evidence |
| team_season_scheme | Human-readable scheme family | team, season, side, primary_family, secondary_tags, source |
| play_call_aggregates | Computed run/pass splits | team, season_range, side, situation, pass_rate, rush_rate, sample_size, confidence |
| coach_tendency_profiles | Coach-facing rollup | coach_id, team, side, role, season_range, scheme_family, strengths, weaknesses |
| scheme_matchup_matrix | What a scheme is good/bad against | scheme_family, opponent_trait, epa_delta, success_delta, sample_size |
| source_runs | Source provenance | source_id, run_id, retrieved_at, transform_version, payload_hash, legal_state |

## Recommended File/Build Layout

| Path | Purpose |
| --- | --- |
| docs/research/gse-coach-scheme-current-state.md | Human audit of what exists now. |
| docs/research/gse-coach-scheme-metrics-catalog.md | Metric dictionary and source requirements. |
| docs/research/gse-coach-scheme-claude-handoff.md | Build plan for Claude. |
| packages/types/src/world-model.ts | Shared contracts already started. |
| packages/types/src/__tests__/world-model.test.ts | Contract tests already started. |
| packages/ingestion or apps/api | Future aggregation pipeline home after repo owner decides architecture. |

## Core Transform

1. Load play-by-play seasons with nflverse.
2. Filter invalid kneels/spikes/no plays where needed.
3. Assign situation buckets.
4. Aggregate pass/rush/unknown by team, season, opponent, score state, down, distance, and field zone.
5. Join staff assignment and play-caller episodes by team/season/date.
6. Compute confidence from sample size, tenure certainty, source tier, freshness, and role certainty.
7. Emit SchemeTendencyProfile records and source provenance.

## Attribution Rule

Tendency belongs first to team-season-side. It belongs to a coach only when a coach_playcaller_episode links the coach to that side and season with enough confidence.
