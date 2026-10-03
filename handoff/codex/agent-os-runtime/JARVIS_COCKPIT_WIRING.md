# Jarvis Cockpit Wiring

This sprint kept UI changes minimal but made Jarvis runtime-ready through library wiring.

Jarvis operating assessment can now surface:

- company health
- department health
- agent reality counts through agent health
- top risks
- owner decisions
- Claude review queue
- safe tasks
- stale-data warnings
- public gate status
- calibration status
- revenue unknown state
- memory review status

Next UI step: render `buildJarvisOperatingAssessment()` in `/cockpit` without a card wall.

## Slice update — cockpit runtime panel

Added `OperatingRuntimeZone` to `/cockpit`. The owner now sees company health, not-wired/draft/manual/operational counts, top risks, owner decisions, Claude review, public gate status, calibration status, revenue unknown state, memory status, and the next Agent OS action without opening a separate route.
