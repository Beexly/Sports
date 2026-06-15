# Jarvis Operating Manager

Implemented Jarvis operating assessment helpers under `apps/web/lib/jarvis`.

Jarvis now consumes the typed agent registry, task seed queue, workflow registry, and cockpit operating map to produce:

- company health
- department health
- top risks
- owner decisions
- safe autonomous tasks
- stale-data warnings
- public gate status
- calibration status
- revenue status
- memory status
- Claude review queue
- next best action

Critical blockers dominate the assessment; unknown systems are not labeled healthy.
