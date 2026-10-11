# Progress — Milestone 1 Implementation

Last visited: 2026-10-11T21:21:00Z

## Status
- [x] 1. Add 301 redirect `/picks` -> `/board` in `apps/web/next.config.mjs`.
- [x] 2. Update `apps/web/app/board/page.tsx` with two tabs (?tab=signals "Actionable Signals", ?tab=held "Gated & Held Games").
- [x] 3. Update `apps/web/app/picks/page.tsx` with runtime redirect to `/board` while retaining helper functions/types.
- [x] 4. Update navigation menus in `nav.tsx` and `mobile-nav.tsx` (label "The Board", remove `/picks`, deduplicate `nav.tsx`).
- [x] 5. Update `apps/web/__tests__/board-picks-route-equivalence.test.ts` to 5-assertion suite.
- [x] 6. Update public links from `/picks` to `/board` across proof, sealed, verify-console, command-palette, brand.ts, sports-jsonld.ts.
- [x] 7. Verification: tests, lint:brand, guard:trust.
- [x] 8. Generate handoff.md and report to parent agent.
