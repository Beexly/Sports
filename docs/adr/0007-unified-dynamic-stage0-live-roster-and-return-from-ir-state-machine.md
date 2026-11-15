# ADR 0007 — Unified Dynamic Stage-0 Live Roster & Return-from-IR State Machine

**Date:** 2026-11-15
**Status:** Accepted

## Context

Accurate football simulation and DFS slate building depend on true active personnel inputs. Hardcoding afternoon/evening game team starters (e.g., Dallas Cowboys pre-kickoff) or failing to account for players returning from Injured Reserve leads to severe projection bias and invalid lineup distributions.

## Decision Drivers

* **Real-Time Kickoff Sealing**: ESPN status feeds (`status.type.state != "pre"`) must dynamically lock and seal starting lineups at exact game kickoff rather than blanket static assumptions.
* **Return-from-IR State Machine**: 4-source IR activation tracking with `return_from_ir_ramp_factor` ensures newly activated players (e.g., Tank Dell) are correctly integrated while true Reserve-IR / Out designations (e.g., Cooper Kupp, Deshaun Watson) remain strictly excluded.
* **Effective Role Snap Share & Single QB1 Starter**: Starter scratches (e.g., Darren Waller when Ja'Tavion Sanders is OUT) must dynamically cascade `effective_role_snap_share` adjustments across the positional tree under a single canonical `team_qb1_starter`.

## Decision

We adopt `gse-unified-stage0-truth-v2` as the canonical pipeline for weekly roster validation, live kickoff sealing, and 4-source IR state machine integration across all prediction and DFS simulation workflows.

## Rationale

1. **Eliminates Manual Stale-Roster Errors**: Automated ingestion prevents stale or unverified player statuses from entering the 10,000-world simulation engine.
2. **Corrects Volume Reallocation**: Accurate IR tracking ensures vacated targets and carries are only redistributed to active, healthy players.

## Consequences

### Positive
- Zero roster-related hallucination or projection skew on late-game inactives.
- Perfect parity between simulation inputs and live DFS slate availability.

### Negative
- Requires robust network error handling for live ESPN/Sleeper feed synchronization right up to kickoff.

## Implementation Notes

- Schema and ingestion: `packages/prediction-engine/src/nfl/unified-stage0-truth-v2.ts`
- Verification script: `scripts/ops/verify_week9_packets_stage0.py`

## Related Decisions

- [ADR-0002](0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md): Situational-First 5-Stage Engine Gate
- [ADR-0008](0008-zero-leak-sinkhorn-vacated-volume-conservation-and-qb-kneeldown-physics.md): Zero-Leak Sinkhorn Vacated Volume Conservation
