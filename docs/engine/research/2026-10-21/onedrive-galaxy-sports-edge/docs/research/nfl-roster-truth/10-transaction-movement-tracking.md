# Transaction And Movement Tracking

As of: 2026-06-09

## Transaction Types

signed, released, waived, claimed, traded, placed on IR, activated from IR, designated to return, moved to practice squad, elevated from practice squad, reverted to practice squad, reserve/futures, suspended, retired, reinstated, number change, position change, coach hired, coach fired, staff role changed.

## Required Fields

person_id, team_id, old_team_id, new_team_id, old_status, new_status, transaction_type, effective_date, source_evidence, confidence, downstream surfaces impacted.

## Detectors

- current roster changed
- stale player team assignment
- player moved teams
- staff changed roles
- jersey conflict
- transaction-to-roster mismatch
- future-dated/pending transaction

## Rule

A transaction can be more current than a roster page, but it should not silently update public truth without evidence and a review/confirmation state.

