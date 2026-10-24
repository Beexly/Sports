# Data Quality CI / Deploy Gate Design

As of: 2026-06-09

## Blocking Errors

- production build uses mock roster data on public player surfaces
- active player has stale team assignment over threshold
- player rendered without canonical ID or fallback review status
- conflicting team assignment has no ConflictRecord
- source adapter failure hidden silently
- public player page uses old static seed when canonical source exists
- status outside taxonomy
- team abbreviation outside taxonomy
- coach/staff data displayed without public source evidence

## Warnings

- team roster under expected coverage
- stale source snapshot close to threshold
- jersey number conflict with explainable reserve/practice status
- fallback-only fact shown internally
- staff source older than threshold

## Review Conditions

Manual review required for transaction/roster mismatch, same-name ambiguity, rookie missing stable ID, media/fantasy source disagreement, and any staff role not backed by official/professional source.

## Audit Cadence

Nightly audit during season and roster-cut windows after approval. Pre-deploy audit for all releases touching player/team/staff surfaces. Post-deploy audit after any data pipeline change.

