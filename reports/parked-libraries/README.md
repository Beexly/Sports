# Parked Libraries

_Empty._ The three previously-parked libraries (`event-analytics`, `forecasting-analytics`,
`risk-analytics`) have been folded into the build with full test suites (664 tests total),
are tsc/lint clean, and are exported from the analytics barrel (`apps/web/lib/analytics/index.ts`).

A latent infinite-loop bug in `event-analytics.changePointDetection` (hung when
`minSegmentSize <= 0`) was found and fixed during the fold-in.

Future complete-but-untested libraries may be parked here pending test coverage before
integration into the `apps/web` build.
