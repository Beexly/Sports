# ADR 0010 — Three-Noon Content-Ready Locks, T-90m Adjustments & Autonomy Kernel

**Date:** 2026-11-15
**Status:** Accepted

## Context

Publishing official plays and content packets requires strict temporal discipline to prevent stale-line exposure, ensure pre-kickoff adjustment integrity, and maintain absolute determinism in autonomous operations.

## Decision Drivers

* **Three-Noon Content-Ready Master Locks**: Enforce exact lock times across the weekly schedule: Wednesday `12:00 PM CT` for Thursday Night Football (TNF), Friday `12:00 PM CT` for all Sunday games, and Sunday `12:00 PM CT` for Monday Night Football (MNF).
* **Exact T-90m Pre-Kickoff Adjustments**: Execute differential-only deltas (`<3 min` diff-only delta) exactly 90 minutes prior to kickoff across `cadence.ts`, `weekly-cadence-orchestrator.ts`, and `run_permanent_sequenced_weekly_pipeline.py`.
* **Content-OS & Pure Deterministic Operating Kernel**: Generate noon-lock content packages via `build_noon_lock_content_os_packet.ts` while enforcing pure deterministic execution in `operating-kernel.ts` (`refuseDefaultHeld=true`, zero I/O, zero LLM, never flipping public gates), alongside trunk-based Git discipline and single canonical worktree hygiene.

## Decision

We adopt the Three-Noon Content-Ready Master Locks, T-90m pre-kickoff adjustment protocol, and pure deterministic operating kernel as mandatory operational standards for all GSE/GSI publishing and autonomy workflows.

## Rationale

1. **Information Asymmetry Protection**: Locking picks prior to sharp market moves prevents leakage while ensuring content teams have guaranteed lead time.
2. **Safety and Determinism**: A pure deterministic operating kernel ensures autonomous scripts never execute unapproved actions or flip public gates without explicit human oversight.

## Consequences

### Positive
- Predictable, automated publishing cadences across all media and betting channels.
- Absolute safety guarantee via deterministic kernel boundaries (`refuseDefaultHeld=true`).

### Negative
- Strict adherence required; missing a noon lock window requires manual exception logging.

## Implementation Notes

- Cadence orchestrator: `packages/prediction-engine/src/orchestration/weekly-cadence-orchestrator.ts`
- Operating kernel: `packages/prediction-engine/src/kernel/operating-kernel.ts`
- Content packet builder: `packages/prediction-engine/src/content/build_noon_lock_content_os_packet.ts`

## Related Decisions

- [ADR-0002](0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md): Situational-First 5-Stage Engine Gate
- [ADR-0005](0005-week9-plays-360-board-and-draftkings-fanduel-dfs-engine.md): Week 9 Plays & 360-Degree Full-Board Market Review
