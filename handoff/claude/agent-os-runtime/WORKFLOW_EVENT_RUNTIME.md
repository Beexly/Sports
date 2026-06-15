# Workflow Event Runtime

Implemented workflow event store, task bridge, and safe workflow runtime.

## Safe workflows covered

- Daily Intelligence Brief
- Source Intelligence Workflow
- Historical Intelligence Workflow
- Calibration Workflow
- Claude Handoff Workflow

## Behavior

- Workflows create events.
- Events create routed tasks where safe.
- Protected-source and unsettled-season events block completion.
- Forbidden actions remain blocked without owner approval.
- No external calls, publishing, paid APIs, or scoring-weight changes are performed.
