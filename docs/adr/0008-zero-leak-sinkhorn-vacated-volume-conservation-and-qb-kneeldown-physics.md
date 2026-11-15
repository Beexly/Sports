# ADR 0008 — Zero-Leak Sinkhorn Vacated Volume Conservation & QB Kneeldown Physics

**Date:** 2026-11-15
**Status:** Accepted

## Context

Previous simulation iterations suffered from volume leakage (e.g., `OTHER_TEAM_REC` / `OTHER_TEAM_RUSH` volume dumps leaking 73–88% of unassigned stats) and unrealistic quarterback rushing projections that omitted late-game victory kneeldowns (`-1` yd Q4 plays) while applying arbitrary positive-clamp hacks (`+5.9` Gamma).

## Decision Drivers

* **Sinkhorn Vacated-Volume Conservation**: Abolish unconstrained volume dumps by enforcing strict role-capped ceilings (`WR <= 34%`, `TE <= 29%`, `RB <= 22%` targets, `RB1 <= 78%` non-QB carries), opposing front-7 disruption boosts (`opp_f7_outs`), and residual caps (`<= 4.5%` target / `<= 4.0%` rush), asserting `>= 94%` active named target/yardage and `>= 95%` non-QB rush attribution.
* **Empirical QB Mobility & Kneeldown Physics**: Condition QB scramble rates and yardage on empirical mobility profiles while explicitly incorporating `-1` yard Q4 victory kneeldowns into `qb_rush_yds` and `qb_carries`.
* **Removal of Arbitrary Hacks**: Permanently delete the unprincipled `+5.9` Gamma positive-clamp hack in favor of rigorous optimal transport reallocation.

## Decision

We adopt Sinkhorn-Knopp optimal transport volume redistribution with strict role caps and exact kneeldown physics as the universal standard for all player projection and simulation modules.

## Rationale

1. **Mass Conservation**: Ensures that team-level passing and rushing projections sum exactly to team totals without statistical leakage.
2. **Realistic Tail Distribution**: Accounting for victory kneeldowns correctly trims over-optimistic dual-threat QB rushing ceilings in winning game scripts.

## Consequences

### Positive
- Perfect conservation laws across all simulated player prop distributions.
- Elimination of inflated QB rushing medians caused by omitted kneeldown snaps.

### Negative
- Requires complex Sinkhorn-Knopp convergence iterations within the simulation loop.

## Implementation Notes

- Python engine: `intelligence/coaching/universal_nfl_metric_engine.py`
- TypeScript engine: `packages/prediction-engine/src/nfl/universal-nfl-metric-engine.ts`

## Related Decisions

- [ADR-0002](0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md): Situational-First 5-Stage Engine Gate
- [ADR-0007](0007-unified-dynamic-stage0-live-roster-and-return-from-ir-state-machine.md): Unified Dynamic Stage-0 Live Roster
