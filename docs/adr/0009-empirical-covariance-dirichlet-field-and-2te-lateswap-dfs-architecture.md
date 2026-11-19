# ADR 0009 — Empirical Covariance, Dirichlet Field & 2-TE Late-Swap DFS Architecture

**Date:** 2026-11-15
**Status:** Accepted

## Context

DraftKings and FanDuel Daily Fantasy Sports (DFS) contests require robust GPP roster construction that accounts for player ownership, correlation, and multi-teammate stacking without violating salary caps or positional eligibility rules.

## Decision Drivers

* **Connected Stage-4 DFS Pipeline**: Connect Stage-4 `10,000 x K` simulated DK FPTS + Ledoit-Wolf shrunk covariance + 5,000-opponent Dirichlet-Multinomial field (`gpp_architecture.py`) + dynamic kickoff-aware `EQ-DFS-01..07` (`dfs_literature_optimization_engine.py`) directly to `build_weekly_dfs_packets.py`.
* **Roster Flexibility & Lineup Doctor**: Fix `pass_completions` key lookups, unlock `max_tes=2`, assign the latest-kickoff/highest-recourse skill player to `FLEX` (`_format_classic_lineup`), and emit a proven 18-player pool (`3 QB / 4 RB / 5 WR / 3 TE / 3 DST`) with combinatorial sweeps and `<1s` diagnostics via `gse_lineup_doctor.py`.
* **Contest Archetype Coverage**: Support 4 distinct contest archetypes: Cash Games, High-Ownership Chalk Benchmarks, Single-Entry / 3-Max Tournaments, and 20-Max Maximum-Contest Entry (MME) portfolios.

## Decision

We adopt the unified empirical covariance and Dirichlet-Multinomial field DFS architecture for generating all weekly DFS packets and contest portfolios.

## Rationale

1. **Realistic Correlation**: Ledoit-Wolf shrinkage combined with Dirichlet-Multinomial field simulation captures realistic game stacking dynamics and ownership leverage.
2. **Operational Speed**: Sub-second lineup diagnostics (`gse_lineup_doctor.py`) allow rapid iteration and late-swap adjustments before roster lock.

## Consequences

### Positive
- Production-grade DFS packets supporting Cash, SE, and MME contest structures.
- Robust handling of dual-tight-end builds (`max_tes=2`) and late-swap FLEX optimization.

### Negative
- Requires maintaining synchronized player salary and projection feeds across DraftKings and FanDuel APIs.

## Implementation Notes

- DFS packet builder: `scripts/ops/build_weekly_dfs_packets.py`
- GPP simulation & field model: `intelligence/coaching/gpp_architecture.py`
- Lineup doctor: `scripts/ops/gse_lineup_doctor.py`

## Related Decisions

- [ADR-0005](0005-week9-plays-360-board-and-draftkings-fanduel-dfs-engine.md): Week 9 Plays & DraftKings/FanDuel DFS Engine
- [ADR-0007](0007-unified-dynamic-stage0-live-roster-and-return-from-ir-state-machine.md): Unified Dynamic Stage-0 Live Roster
